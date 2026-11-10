/* NyX Code: streamed progress -> normal JSON Response for the existing form. */
async function nxCodeFetchWithRealProgress(originalFetch,resource,options){
 const response=await originalFetch(resource,options);
 if(!response.ok||!response.headers.get("Content-Type")?.includes("application/x-ndjson"))return response;
 const reader=response.body?.getReader();if(!reader)return response;
 let buffer="",final=null,error=null;
 const decoder=new TextDecoder();
 const active=[...document.querySelectorAll('#messages .bubble.assistant[role="status"]')].at(-1);
 const deliver=event=>{
  if(event?.event==="done"){final=event.data;return}
  if(event?.event==="error"){error=event.message||"NyX Code failed";return}
  if(active?.isConnected)document.dispatchEvent(new CustomEvent("nx-code-live-event",{detail:{bubble:active,...event}}));
 };
 try{
  while(true){
   const chunk=await reader.read();if(chunk.done)break;
   buffer+=decoder.decode(chunk.value,{stream:true});
   if(buffer.length>200000)throw Error("Coding progress stream exceeded its limit");
   let at;
   while((at=buffer.indexOf("\n"))>=0){
    const line=buffer.slice(0,at).trim();buffer=buffer.slice(at+1);
    if(line)try{deliver(JSON.parse(line))}catch{}
   }
  }
  if(buffer.trim())try{deliver(JSON.parse(buffer))}catch{}
 }catch(e){
  if(options.signal?.aborted)throw new DOMException("Cancelled","AbortError");
  error="The connection to NyX Code was interrupted.";
 }finally{try{reader.releaseLock()}catch{}}
 if(error||!final)return new Response(JSON.stringify({error:error||"Coding response ended unexpectedly"}),{status:502,headers:{"Content-Type":"application/json"}});
 return new Response(JSON.stringify(final),{status:200,headers:{"Content-Type":"application/json"}});
}
