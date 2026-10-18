import {test} from 'node:test';
import assert from 'node:assert/strict';
import {consumeSSE,streamText,ndjsonResponse,isDeepResearch,parsePlan,groundedCitations,selectDocument,packHistory} from '../runtime.mjs';
import {deepResearch} from '../research.mjs';
const encode=new TextEncoder();
function body(parts){return new ReadableStream({start(c){for(const p of parts)c.enqueue(encode.encode(p));c.close();}});}
test('SSE split frames and OpenRouter/Workers formats preserve exact text',async()=>{
 const chunks=[];
 assert.equal(await consumeSSE(body(['data: {"resp','onse":"Hi "}\r\n\r\ndata: {"choices":[{"delta":{"content":"world"}}]}\n','data: [DONE]\n']),x=>chunks.push(x)),'Hi world');
 assert.deepEqual(chunks,['Hi ','world']);
});
test('Incomplete connection is an error, not false completion',async()=>{
 let partial='';await assert.rejects(consumeSSE(body(['data: {"response":"saved"}\n']),x=>partial+=x),/before completion/);assert.equal(partial,'saved');
});
test('No provider fallback after first emitted token',async()=>{
 let called=false;const env={OPENROUTER_API_KEY:'test-only',AI:{run(){called=true;}}};
 await assert.rejects(streamText(env,[],()=>{},undefined,async()=>new Response(body(['data: {"response":"partial"}\n']))));assert.equal(called,false);
});
test('Provider failure before tokens uses existing Workers AI stream',async()=>{
 let called=false;
 const result=await streamText({OPENROUTER_API_KEY:'test-only',AI:{run:async(model,input)=>{called=true;assert.equal(input.stream,true);return body(['data: {"response":"fallback"}\ndata: [DONE]\n']);}}},[],()=>{},undefined,async()=>new Response('',{status:429}));
 assert.equal(result,'fallback');assert.ok(called);
});
test('Abort cancels reader and prevents continuation',async()=>{
 const stop=new AbortController();let cancelled=false;
 const stream=new ReadableStream({start(c){c.enqueue(encode.encode('data: {"response":"one"}\n'));},cancel(){cancelled=true;}});
 await assert.rejects(consumeSSE(stream,()=>stop.abort(),stop.signal));assert.ok(cancelled);
});
test('NDJSON emits delta before completion and is private',async()=>{
 let finish;const response=ndjsonResponse(async emit=>{emit({event:'delta',text:'first'});await new Promise(r=>finish=r);emit({event:'done',data:{reply:'first'}});});
 assert.equal(response.headers.get('cache-control'),'no-store');const reader=response.body.getReader();const first=await reader.read();assert.match(new TextDecoder().decode(first.value),/delta/);finish();assert.match(new TextDecoder().decode((await reader.read()).value),/done/);
});
test('Deep research is additive; ordinary chat does not route into it',()=>{
 assert.ok(isDeepResearch('Deep research free APIs'));assert.ok(isDeepResearch('Investigate newest repositories'));assert.equal(isDeepResearch('Hello, explain gravity'),false);
 assert.deepEqual(parsePlan('{"queries":["a","a","b","c","d"]}','fallback'),['a','b','c']);
});
test('Only actual retrieved citations receive links',()=>{
 const value=groundedCitations('Claim [1], lie [99] and [fake](https://evil.example) https://fake.example',[{url:'https://docs.example/a'}]);
 assert.match(value,/\[1\]\(https:\/\/docs.example\/a\)/);assert.doesNotMatch(value,/https:\/\/(?:fake|evil)/);assert.match(value,/unverified citation/);
});
test('Document retrieval finds relevant pages beyond initial prefix',()=>{
 const doc='[Page 1]\n'+'irrelevant '.repeat(3000)+'\n[Page 42]\nOperating profit was 900.';
 const result=selectDocument(doc,'What was operating profit?',4000);assert.match(result.text,/Page 42/);assert.match(result.text,/900/);assert.equal(result.partial,true);
});
test('Conversation context is bounded and keeps latest corrections',()=>{
 const messages=Array.from({length:25},(_,i)=>({role:i%2?'assistant':'user',content:'x'.repeat(2000)+i}));messages.push({role:'user',content:'No, use the second option'});
 const packed=packHistory(messages);assert.ok(packed.reduce((n,m)=>n+m.content.length,0)<=30000);assert.equal(packed.at(-1).content,'No, use the second option');
});
test('Research follows discoveries, bounds calls and marks inaccessible pages',async()=>{
 let calls=0,writes=0;const events=[];
 await deepResearch('Deep research APIs',{
  write:async(p,onDelta)=>{writes++;if(writes===1)return '{"queries":["A","B","C"]}';if(writes===2)return '{"queries":["verify discovered API"]}';onDelta?.('Report [1]');return 'Report [1] invalid [22]';},
  search:async q=>{calls++;return {sources:[{url:'https://docs.example/'+q.replaceAll(' ','-'),title:q,snippet:'An excerpt'}]};},
  read:async()=>''
 },e=>events.push(e),new AbortController().signal);
 assert.equal(calls,4);assert.equal(writes,3);const final=events.at(-1).data;assert.equal(final.sources.length,4);assert.match(final.reply,/inaccessible/);assert.match(final.reply,/unverified citation/);
});
test('Failed searches produce honest report without synthesis',async()=>{
 const events=[];await deepResearch('q',{write:async()=>'{"queries":["q"]}',search:async()=>({sources:[]}),read:async()=>''},e=>events.push(e));assert.match(events.at(-1).data.reply,/No report was fabricated/);
});
