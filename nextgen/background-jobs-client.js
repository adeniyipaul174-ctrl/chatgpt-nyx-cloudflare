/* NyX background responses client: start durable work and restore after reopening. */
(function(){
 "use strict";
 if(window.nyxBackgroundTasks)return;
 const active=new Set();
 let syncing=false,lastCheck=0;
 function sleep(ms){return new Promise(resolve=>setTimeout(resolve,ms))}
 function visible(){return document.visibilityState==="visible"}
 function ready(){return !!window.nyxAccount?.id&&typeof chats!=="undefined"&&Array.isArray(chats)}
 function mark(message){
  let node=document.getElementById("nxBgNote");
  if(!node){
   node=document.createElement("div");node.id="nxBgNote";
   node.style.cssText="display:none;color:#b8bdc7;font-size:12px;text-align:center;padding:4px 10px";
   const composer=document.querySelector(".composer");
   if(!composer)return;
   composer.insertAdjacentElement("afterend",node);
  }
  node.textContent=message||"";node.style.display=message?"block":"none";
 }
 function resultMessage(job){
  const d=job.result||{};
  return {role:"assistant",kind:job.status==="done"?(d.kind||"text"):"text",
    content:job.status==="done"?(d.reply||"NyX completed the background reply."):(job.error||"NyX could not complete this background reply."),
    sources:Array.isArray(d.sources)?d.sources.slice(0,6):[],
    backgroundJobId:job.id};
 }
 function apply(job){
  if(!ready()||!job||active.has(job.id))return false;
  if(job.status!=="done"&&job.status!=="failed")return false;
  const chat=chats.find(x=>x.id===job.chatId);
  if(!chat||!Array.isArray(chat.messages)||chat.messages.some(x=>x.backgroundJobId===job.id))return false;
  chat.messages.push(resultMessage(job));
  return true;
 }
 async function restore(){
  if(!ready()||!visible()||syncing)return;
  syncing=true;
  try{
   const response=await fetch("/api/nyx/background",{cache:"no-store",credentials:"same-origin"});
   if(!response.ok)return;
   const data=await response.json(),jobs=Array.isArray(data.jobs)?data.jobs:[];
   let changed=false;
   for(const job of jobs)if(apply(job))changed=true;
   if(changed){persist();render()}
   const activeCount=jobs.filter(j=>j.status==="queued"||j.status==="running").length;
   if(activeCount)mark(activeCount+" background "+(activeCount===1?"reply is":"replies are")+" still working. You can leave NyX.");
   else if(!active.size)mark("");
  }catch{}finally{syncing=false;lastCheck=Date.now()}
 }
 async function submit(payload,chatId,signal){
  if(!ready()||!window.nyxAccount?.id)throw Error("Sign in to run background replies.");
  let response;
  try{
   response=await fetch("/api/nyx/background",{method:"POST",credentials:"same-origin",
      headers:{"Content-Type":"application/json","X-NyX-Client":"web"},
      body:JSON.stringify({chatId,payload}),signal});
  }catch(e){throw Error("Could not confirm that the background job started. Check your connection, then reopen this chat to check for a reply.")}
  if(response.status===409){
    const d=await response.json().catch(()=>({}));
    if(d.fallback)return fetch("/api/nyx",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload),signal});
  }
  if(!response.ok){
   const e=await response.json().catch(()=>({}));
   throw Error(e.error||"Could not start background work.");
  }
  const data=await response.json(),id=data.id;
  if(!id)throw Error("NyX did not return a background job ID.");
  active.add(id);
  mark("NyX is working in the background. You can switch apps or close this page.");
  let consecutiveErrors=0;
  try{
   while(true){
    if(signal?.aborted)throw new DOMException("Stopped waiting; NyX continues in the background.","AbortError");
    await sleep(1800);
    if(signal?.aborted)throw new DOMException("Stopped waiting; NyX continues in the background.","AbortError");
    try{
     const r=await fetch("/api/nyx/background/"+encodeURIComponent(id),{credentials:"same-origin",cache:"no-store",signal});
     if(r.status===401)throw Error("Session expired. Sign in again to see the saved reply.");
     if(!r.ok)throw Error("Background status temporarily unavailable.");
     const job=await r.json();
     consecutiveErrors=0;
     if(job.status==="done"){
      mark("");
      return new Response(JSON.stringify({...job.result,backgroundJobId:id}),{headers:{"Content-Type":"application/json"}});
     }
     if(job.status==="failed")throw Error(job.error||"Background response failed.");
    }catch(e){
     if(signal?.aborted)throw e;
     if(/Session expired|Background response failed|could not complete/i.test(e.message))throw e;
     consecutiveErrors++;
     if(consecutiveErrors>8)throw Error("The connection was interrupted. NyX is still processing this reply. Reopen the app to collect it.");
     await sleep(Math.min(6000,1000*consecutiveErrors));
    }
   }
  }finally{
   active.delete(id);
   if(!active.size)mark("");
  }
 }
 window.nyxBackgroundTasks={submit,restore};
 document.addEventListener("visibilitychange",()=>{if(visible())restore()});
 window.addEventListener("focus",restore);
 setInterval(()=>{if(visible()&&Date.now()-lastCheck>11000)restore()},12000);
 setTimeout(restore,6500);
})();
