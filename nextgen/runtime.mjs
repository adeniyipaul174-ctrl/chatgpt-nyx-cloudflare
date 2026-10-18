// Dependency-free primitives. No secrets, storage, or network access by default.
export async function consumeSSE(body, onDelta, signal) {
  if (!body?.getReader) throw Error('Provider did not return a stream');
  const reader = body.getReader(), decoder = new TextDecoder();
  let buffer = '', output = '', complete = false;
  const abort = () => { void reader.cancel().catch(() => {}); };
  signal?.addEventListener('abort', abort, {once:true});
  function line(raw) {
    if (!raw.startsWith('data:')) return;
    const data = raw.slice(5).trim();
    if (data === '[DONE]') { complete = true; return; }
    if (!data) return;
    const event = JSON.parse(data);
    if (event.error) throw Error('Provider stream failed');
    const delta = event.response ?? event.choices?.[0]?.delta?.content ?? '';
    if (typeof delta === 'string' && delta) {
      output += delta;
      if (output.length > 50000) throw Error('Answer limit reached');
      onDelta(delta);
    }
    if (event.choices?.[0]?.finish_reason) complete = true;
  }
  try {
    signal?.throwIfAborted();
    while (true) {
      const {done, value} = await reader.read();
      signal?.throwIfAborted();
      if (done) break;
      buffer += decoder.decode(value, {stream:true});
      if (buffer.length > 100000) throw Error('Provider frame too large');
      let index;
      while ((index = buffer.indexOf('\n')) >= 0) {
        line(buffer.slice(0,index).replace(/\r$/, ''));
        buffer = buffer.slice(index+1);
      }
      if (complete) break;
    }
    buffer += decoder.decode();
    if (buffer.trim()) line(buffer);
    if (!complete || !output.trim()) throw Error('Provider connection ended before completion');
    return output;
  } finally {
    signal?.removeEventListener('abort', abort);
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}

export async function streamText(env, messages, onDelta, signal, fetcher=fetch) {
  let emitted = false;
  const emit = text => { signal?.throwIfAborted(); emitted = true; onDelta(text); };
  if (env.OPENROUTER_API_KEY) {
    try {
      const response = await fetcher('https://openrouter.ai/api/v1/chat/completions', {
        method:'POST', headers:{Authorization:'Bearer '+env.OPENROUTER_API_KEY,'Content-Type':'application/json'},
        body:JSON.stringify({model:'openrouter/free',stream:true,messages,max_tokens:2200,provider:{data_collection:'deny'}}),
        signal: signal ? AbortSignal.any([signal,AbortSignal.timeout(45000)]) : AbortSignal.timeout(45000)
      });
      if (!response.ok) { await response.body?.cancel(); throw Error('Free provider unavailable'); }
      return await consumeSSE(response.body,emit,signal);
    } catch (error) { if (emitted || signal?.aborted) throw error; }
  }
  // Existing Workers AI allocation only. No new billable provider or model is enabled.
  signal?.throwIfAborted();
  const body = await env.AI.run('@cf/meta/llama-3.1-8b-instruct-fast', {messages,stream:true,max_tokens:1800,temperature:0.55});
  return consumeSSE(body,emit,signal);
}

export function ndjsonResponse(work, requestSignal) {
  const abort = new AbortController(), encoder = new TextEncoder();
  const stop = () => abort.abort();
  requestSignal?.addEventListener('abort',stop,{once:true});
  if (requestSignal?.aborted) abort.abort();
  const timer = setTimeout(stop,120000);
  let closed = false;
  const stream = new ReadableStream({
    async start(controller) {
      const emit = event => { if (!closed) controller.enqueue(encoder.encode(JSON.stringify(event)+'\n')); };
      try { await work(emit,abort.signal); }
      catch (error) { if (!closed) emit({event:'error',message:abort.signal.aborted?'Generation interrupted.':'Generation interrupted by a provider or connection failure.'}); }
      finally { clearTimeout(timer); requestSignal?.removeEventListener('abort',stop); if (!closed) {closed=true;controller.close();} }
    },
    cancel() { closed=true;clearTimeout(timer);stop();requestSignal?.removeEventListener('abort',stop); }
  });
  return new Response(stream,{headers:{'Content-Type':'application/x-ndjson; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
}

export function isDeepResearch(text) {
  return /\bdeep\s+research\b|\binvestigate\b|\bcompare\b[\s\S]*\bofficial\s+documentation\b/i.test(text);
}
export function parsePlan(text, fallback) {
  try {
    const value=JSON.parse(text.replace(/^```(?:json)?\s*|\s*```$/g,''));
    const rows=Array.isArray(value)?value:value.queries;
    const result=[...new Set(rows.filter(x=>typeof x==='string').map(x=>x.trim().slice(0,180)).filter(Boolean))].slice(0,3);
    if(result.length)return result;
  } catch {}
  return [fallback.slice(0,180), (fallback+' official documentation limitations').slice(0,180)];
}
export function groundedCitations(text,sources) {
  // Remove all model-authored destinations; only retrieved destinations are linked.
  const plain=text.replace(/\[([^\]]+)\]\([^)]*\)/g,'$1').replace(/https?:\/\/[^\s<>]+/g,'[unverified URL omitted]');
  return plain.replace(/\[(\d+)\]/g,(_,n)=>sources[Number(n)-1]?'['+n+']('+sources[Number(n)-1].url+')':'[unverified citation]');
}
export function selectDocument(text,question,budget=16000) {
  const input=String(text).slice(0,180000), terms=[...new Set(question.toLowerCase().match(/[a-z0-9]{3,}/g)||[])];
  const chunks=[]; let page='',document='Document';
  for(const section of input.split(/(?=\[Page \d+\]|\[Document:)/)) {
    const name=section.match(/^\[Document:[^\]\n]+\]/)?.[0];
    if(name){document=name;page='';}
    page=section.match(/^\[Page \d+\]/)?.[0]||page;
    for(let n=0;n<section.length;n+=1500) {
      const body=section.slice(n,n+1800),lower=body.toLowerCase();
      chunks.push({text:document+' '+page+'\n'+body,index:chunks.length,score:terms.reduce((sum,t)=>sum+(lower.includes(t)?1:0),0)});
    }
  }
  const picked=[];let used=0;
  for(const chunk of [...chunks].sort((a,b)=>b.score-a.score||a.index-b.index)) {
    if(used+chunk.text.length>budget)continue;
    used+=chunk.text.length;picked.push(chunk);
  }
  return {text:picked.sort((a,b)=>a.index-b.index).map(x=>x.text).join('\n\n'),partial:input.length>budget||String(text).length>180000};
}

export function packHistory(history, budget=30000) {
  const kept=[];let used=0;
  for(const message of history.slice(-25).reverse()){
    const content=String(message.content||'').slice(0,18000);
    if(used+content.length>budget)break;
    kept.unshift({role:message.role,content});used+=content.length;
  }
  return kept;
}
