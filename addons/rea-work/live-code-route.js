/* NYX Code REA-only API. Raw CLI evidence only, no inference service. */
async function nxReaOnlyRoute(request,env){
 const path=new URL(request.url).pathname;
 const json=(data,status=200)=>Response.json(data,{status,headers:{"Cache-Control":"no-store","X-Content-Type-Options":"nosniff"}});
 if(path!=="/api/work/rea-upload"&&path!=="/api/work/rea-analyze")return null;
 if(request.method!=="POST")return json({error:"Method not allowed"},405);
 if(!nyxCheckOrigin(request)||request.headers.get("X-NyX-Client")!=="web")return json({error:"Request origin is not authorized"},403);
 const actor=await nyxCurrentSession(env,request);
 if(!actor)return json({error:"Sign in to use REA"},401);
 if(!nyxCBOwner(env,actor))return json({error:"REA is available only to the verified NYX owner"},403);
 const token=env.REA_GATEWAY_TOKEN;
 if(typeof token!=="string"||token.length<24)return json({error:"REA runner authentication is not configured"},503);
 const wake="https://nyx-rea-runner-australian-literary-network.vercel.app/api/wake";
 const controller=new AbortController();
 const timer=setTimeout(()=>controller.abort(),125000);
 try{
   const woke=await fetch(wake,{method:"GET",headers:{Authorization:"Bearer "+token},signal:controller.signal});
   if(!woke.ok)return json({error:"REA Linux runner cannot be started"},503);
   const ready=await woke.json();
   const endpoint=new URL(ready.url||"");
   if(endpoint.protocol!=="https:"||!endpoint.hostname.endsWith(".vercel.run")||endpoint.port||endpoint.username||endpoint.password||endpoint.search||endpoint.hash||endpoint.pathname!=="/")return json({error:"REA returned an invalid runner URL"},502);
   let outbound;
   if(path==="/api/work/rea-upload"){
     if(request.headers.get("Content-Type")!=="application/octet-stream")return json({error:"APK or ASAR upload required"},415);
     const ext=String(request.headers.get("X-REA-Extension")||"").toLowerCase();
     if(ext!==".apk"&&ext!==".asar")return json({error:"Only APK or ASAR supported"},400);
     const size=Number(request.headers.get("Content-Length")||0);
     if(size>24*1024*1024)return json({error:"File too large"},413);
     outbound=await fetch(endpoint.origin+"/v1/upload",{method:"POST",headers:{Authorization:"Bearer "+token,"Content-Type":"application/octet-stream","X-REA-Extension":ext},body:request.body,signal:controller.signal});
   }else{
     const bodytext=await request.text();
     if(bodytext.length>8192)return json({error:"Analysis request too large"},413);
     let body;try{body=JSON.parse(bodytext)}catch{return json({error:"Malformed request"},400)}
     if(!["apk","apk_signature","javascript"].includes(body.action)||typeof body.target!=="string"||!/^[a-zA-Z0-9_/-]+\.(apk|asar)$/.test(body.target)||body.target.includes("..")||body.target.length>250)return json({error:"Invalid analysis target"},400);
     outbound=await fetch(endpoint.origin+"/v1/analyze",{method:"POST",headers:{Authorization:"Bearer "+token,"Content-Type":"application/json"},body:JSON.stringify({action:body.action,target:body.target}),signal:controller.signal});
   }
   if(outbound.status>=500)return json({error:"REA analysis runner failed"},502);
   const content=await outbound.text();
   if(content.length>2*1024*1024)return json({error:"REA result exceeded limit"},502);
   let data;try{data=JSON.parse(content)}catch{return json({error:"REA returned invalid JSON"},502)}
   return json(data,outbound.status);
 }catch(e){return json({error:"Unable to reach REA analysis runner"},e?.name==="AbortError"?504:502)}
 finally{clearTimeout(timer)}
}
