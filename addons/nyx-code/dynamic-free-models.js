/* NyX Code V2: use verified, dynamically-discovered free chat-completion models.
 * The OpenRouter free model catalog changes continuously. This adapter reads
 * their public model listing, selects text-generating :free models with $0/$0
 * token prices, ranks for software engineering, and tries a bounded subset.
 *
 * No paid model IDs are sent by this adapter. Failed requests can still count
 * against OpenRouter's free allowance. All quotas belong to the provider.
 * This is independent source code, not a copy of AGPL Free Claude Code.
 */
const NX_CODE_FREE_MODELS={until:0,ids:[],busy:null,pausedUntil:0};
function nxCodeFreeScore(model){
 const id=String(model?.id||"").toLowerCase();
 const detail=(String(model?.name||"")+" "+String(model?.description||"")).toLowerCase();
 const content=id+" "+detail.slice(0,650);
 if(/rerank|embed|transcrib|speech|audio.only|image.only|moderation|decisions|classif|vl.rerank/i.test(content))return -1000;
 let score=0;
 if(/\b(?:code|coder|coding|software.engineer|programming|swe.agent|agentic.code)\b/i.test(content))score+=20;
 if(/north.mini.code|flint|laguna|dots3|codestral/i.test(content))score+=12;
 if(/nemotron.3.ultra|nemotron.3.5|deepseek|qwen|glm|gpt.oss|mistral/i.test(content))score+=9;
 if(/tool.use|function.call|reasoning|bug.fix|repository|development/i.test(content))score+=3;
 const ctx=Number(model?.context_length)||0;
 if(ctx>=65536)score+=3;
 if(ctx>=131072)score+=2;
 if(ctx<16384)score-=7;
 return score;
}
function nxCodeTrulyFree(model){
 if(!model||typeof model.id!=="string"||!model.id.endsWith(":free"))return false;
 const p=model.pricing||{};
 if(p.prompt===undefined||p.completion===undefined)return false;
 if(Number(p.prompt)!==0||Number(p.completion)!==0)return false;
 const id=model.id.toLowerCase();
 if(/rerank|embedding|decisions|speech|image-generation|moderation/i.test(id))return false;
 const modality=String(model.architecture?.modality||"");
 if(modality&&(!/text/i.test(modality)||/image->image|audio->audio/i.test(modality)))return false;
 return true;
}
async function nxCodeFreeCandidates(env){
 const cache=NX_CODE_FREE_MODELS;
 if(cache.until>Date.now()&&cache.ids.length)return cache.ids.slice();
 if(cache.busy)return await cache.busy;
 cache.busy=(async()=>{
  try{
   const response=await fetch("https://openrouter.ai/api/v1/models",{
    method:"GET",headers:{"Accept":"application/json"},
    signal:AbortSignal.timeout(6500)
   });
   if(!response.ok)throw Error("Model catalog service returned "+response.status);
   const data=await response.json(),rows=Array.isArray(data?.data)?data.data:[];
   const ranked=rows.filter(nxCodeTrulyFree)
    .map(model=>({id:model.id,score:nxCodeFreeScore(model)}))
    .filter(x=>x.score>=4)
    .sort((a,b)=>b.score-a.score||a.id.localeCompare(b.id))
    .map(x=>x.id);
   const unique=[...new Set(ranked)].slice(0,18);
   cache.ids=unique.length?unique:["openrouter/free"];
   cache.until=Date.now()+12*60*1000;
  }catch{
   cache.ids=["openrouter/free"];
   cache.until=Date.now()+2*60*1000;
  }finally{cache.busy=null}
  return cache.ids.slice();
 })();
 return await cache.busy;
}
async function nxCodeFreeInference(env,messages){
 if(!env?.OPENROUTER_API_KEY||Date.now()<NX_CODE_FREE_MODELS.pausedUntil)return null;
 const catalog=await nxCodeFreeCandidates(env);
 // Up to 2 explicit attempts plus the free auto-router, but cap attempts
 // to 2 in total to avoid consuming an entire per-key daily free quota.
 const options=[...catalog.filter(x=>x!=="openrouter/free").slice(0,1),"openrouter/free"].slice(0,2);
 const accepted=messages.filter(m=>["system","user","assistant"].includes(m?.role))
  .slice(-15).map(m=>({role:m.role,content:String(m.content||"").slice(0,11500)}));
 let last="";
 for(const model of options){
  try{
   const response=await fetch("https://openrouter.ai/api/v1/chat/completions",{
    method:"POST",
    headers:{"Authorization":"Bearer "+env.OPENROUTER_API_KEY,"Content-Type":"application/json",
     "HTTP-Referer":"https://chatgpt-nyx-v3-test.adeniyipaul174.workers.dev",
     "X-Title":"NyX Code"},
    body:JSON.stringify({model,messages:accepted,max_tokens:1900,temperature:0.24,stream:false,
     provider:{data_collection:"deny"}}),
    signal:AbortSignal.timeout(13500)
   });
   if(!response.ok){
    last="Free provider "+response.status;
    if([401,402,403,429].includes(response.status)){
     NX_CODE_FREE_MODELS.pausedUntil=Date.now()+(response.status===429?3*60*1000:30*60*1000);
     break;
    }
    continue;
   }
   const data=await response.json();
   const choice=data?.choices?.[0]?.message?.content;
   const reply=typeof choice==="string"?choice:Array.isArray(choice)?choice.filter(x=>x?.type==="text").map(x=>x.text).join("\n"):"";
   if(reply.trim())return reply.slice(0,14500);
   last="Empty free model response";
  }catch(e){last=String(e?.message||e).slice(0,90)}
 }
 if(last)throw Error(last);
 return null;
}
