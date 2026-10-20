/* NyX durable background responses — queue-backed text and web jobs.
   Requires D1 nyx_background_jobs table and NYX_BG_QUEUE Queue binding.
   No session cookies or tokens are stored in the job database or queue. */
function nxBgJSON(data,status=200) {
 return Response.json(data,{status,headers:{"Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff"}});
}
async function nxBgQuotaForUser(env,userId,kind){
 const limit=NYX_BETA_LIMITS[kind];
 if(!limit)return true;
 const day=new Date().toISOString().slice(0,10);
 const sql="INSERT INTO nyx_daily_quota (user_id,day,kind,used) VALUES (?,?,?,1) ON CONFLICT(user_id,day,kind) DO UPDATE SET used=used+1 WHERE used<?";
 const out=await env.NYX_DB.prepare(sql).bind(userId,day,kind,limit).run();
 return Number(out.meta?.changes||0)>0;
}
function nxBgPublic(row){
 const out={id:row.id,chatId:row.chat_id,status:row.status,createdAt:row.created_at,completedAt:row.completed_at||null};
 if(row.status==="done"){try{out.result=JSON.parse(row.result_json)}catch{out.status="failed";out.error="The saved response was damaged."}}
 if(row.status==="failed")out.error=row.error||"This background response did not complete.";
 if(row.progress_json&&["queued","running"].includes(row.status)){try{const p=JSON.parse(row.progress_json);out.progress={stage:String(p.stage||"").slice(0,25),provider:String(p.provider||"").slice(0,70),sources:Array.isArray(p.sources)?p.sources.slice(0,3).map(x=>({title:String(x.title||"").slice(0,120),url:String(x.url||"").slice(0,500)})):[]}}catch{}}

 return out;
}
async function nxBackgroundRoute(request,env,url){
 if(!env.NYX_DB||!env.NYX_BG_QUEUE)return nxBgJSON({error:"Background replies are not configured."},503);
 const user=await nyxCurrentSession(env,request);
 if(!user)return nxBgJSON({error:"Please sign in to use background replies."},401);
 if(request.method==="GET"){
   if(url.pathname==="/api/nyx/background"){
     const rows=await env.NYX_DB.prepare("SELECT id,chat_id,status,result_json,error,progress_json,created_at,completed_at FROM nyx_background_jobs WHERE account_id=? AND created_at>? ORDER BY created_at DESC LIMIT 60").bind(user.id,Date.now()-30*86400000).all();
     return nxBgJSON({jobs:(rows.results||[]).map(nxBgPublic)});
   }
   const id=url.pathname.slice("/api/nyx/background/".length);
   if(!/^[0-9a-f-]{36}$/i.test(id))return nxBgJSON({error:"Invalid background job."},400);
   const row=await env.NYX_DB.prepare("SELECT id,chat_id,status,result_json,error,created_at,completed_at FROM nyx_background_jobs WHERE id=? AND account_id=?").bind(id,user.id).first();
   return row?nxBgJSON(nxBgPublic(row)):nxBgJSON({error:"Background job not found."},404);
 }
 if(request.method!=="POST"||url.pathname!=="/api/nyx/background")return nxBgJSON({error:"Method not allowed."},405);
 if(!nyxCheckOrigin(request))return nxBgJSON({error:"Request origin could not be verified."},403);
 const length=Number(request.headers.get("content-length")||0);
 if(length>65000)return nxBgJSON({error:"Background request too large."},413);
 const incoming=await request.text();
 if(incoming.length>65000)return nxBgJSON({error:"Background request too large."},413);
 let requestData;
 try{requestData=JSON.parse(incoming)}catch{return nxBgJSON({error:"Invalid background request."},400)}
 const chatId=String(requestData.chatId||"").slice(0,120);
 const input=requestData.payload;
 const messages=input?.messages;
 if(!chatId||!Array.isArray(messages)||!messages.length||messages.length>16
 ||messages.some(m=>!["user","assistant"].includes(m?.role)||typeof m?.content!=="string"||m.content.length>10000)
 ||messages.at(-1)?.role!=="user"||!messages.at(-1)?.content?.trim()||input?.attachment)
 return nxBgJSON({error:"Invalid message or attachment."},400);
 // Image binary output still uses the existing foreground path.
 const action=nyxFallbackIntent(messages.at(-1).content);
 if(action.action==="image")return nxBgJSON({error:"IMAGE_FOREGROUND",fallback:true},409);
 const active=await env.NYX_DB.prepare("SELECT count(*) AS total FROM nyx_background_jobs WHERE account_id=? AND status IN ('queued','running') AND created_at>?").bind(user.id,Date.now()-3600000).first();
 if(Number(active?.total||0)>=3)return nxBgJSON({error:"Wait for your current background replies before starting more."},429);
 const ip=request.headers.get("CF-Connecting-IP")||"anonymous";
 if(env.NYX_RATE){const gate=await env.NYX_RATE.limit({key:ip+":conversation"});if(!gate.success)return nxBgJSON({error:"Too many requests. Try again shortly."},429)}
 const allowed=await nxBgQuotaForUser(env,user.id,"chat");
 if(!allowed)return nxBgJSON({error:"Your NyX chat allowance for today has been reached."},429);
 const safe={messages:messages.map(m=>({role:m.role,content:m.content,kind:m.kind||"text",...(m.imagePrompt?{imagePrompt:String(m.imagePrompt).slice(0,700)}:{})})),
 style:["balanced","concise","detailed"].includes(input.style)?input.style:"balanced",
 instructions:String(input.instructions||"").slice(0,1200),
 autoTools:input.autoTools!==false,showSources:input.showSources!==false};
 const id=crypto.randomUUID(),now=Date.now();
 await env.NYX_DB.prepare("INSERT INTO nyx_background_jobs (id,account_id,chat_id,payload_json,status,created_at) VALUES (?,?,?,?,'queued',?)").bind(id,user.id,chatId,JSON.stringify(safe),now).run();
 try{await env.NYX_BG_QUEUE.send({jobId:id})}
 catch{
   await env.NYX_DB.prepare("UPDATE nyx_background_jobs SET status='failed',error=?,completed_at=? WHERE id=?").bind("Background queue was temporarily unavailable.",Date.now(),id).run();
   return nxBgJSON({error:"Could not queue this response. Try again."},503);
 }
 return nxBgJSON({id,chatId,status:"queued",createdAt:now},202);
}
async function nxBackgroundConsume(batch,env){
 if(!env.NYX_DB)return;
 for(const message of batch.messages){
  const id=String(message.body?.jobId||"");
  if(!/^[0-9a-f-]{36}$/i.test(id)){message.ack();continue}
  const row=await env.NYX_DB.prepare("SELECT id,account_id,payload_json,status,attempts,started_at FROM nyx_background_jobs WHERE id=?").bind(id).first();
  if(!row||row.status==="done"||row.status==="failed"){message.ack();continue}
  if(row.status==="running"&&Number(row.started_at||0)>Date.now()-600000){message.retry({delaySeconds:45});continue}
  const claim=await env.NYX_DB.prepare("UPDATE nyx_background_jobs SET status='running',started_at=?,attempts=attempts+1 WHERE id=? AND status IN ('queued','running')").bind(Date.now(),id).run();
  if(!Number(claim.meta?.changes||0)){message.retry({delaySeconds:30});continue}
  try{
   const input=JSON.parse(row.payload_json),last=input.messages.at(-1)?.content||"";
   let progressWrites=Promise.resolve();
   const announce=(stage,provider="",sources=[])=>{
     const details={stage,provider,sources:Array.isArray(sources)?sources.slice(0,3).map(item=>({title:String(item.title||"").slice(0,120),url:String(item.url||"").slice(0,500)})):[]};
     progressWrites=progressWrites.then(()=>env.NYX_DB.prepare("UPDATE nyx_background_jobs SET progress_json=? WHERE id=?").bind(JSON.stringify(details),id).run()).catch(()=>{});
   };
   const choice=await nyxDecide(env,last,input.autoTools!==false,input.messages);
   let answer;
   if(choice.action==="search"){
    const available=await nxBgQuotaForUser(env,row.account_id,"search");
    if(!available){answer={kind:"text",reply:"Your NyX search allowance has been reached today. Try again after the daily reset.",sources:[]}}
    else{
     const query=choice.revision?await nyxReviseSearchQuery(env,input.messages,last):last;
     announce("starting");
     const research=await nyxSearch(env,query,true,ev=>announce(ev.stage||"searching",ev.provider||""));
     announce("reading",research.provider,research.sources||[]);
     const reply=await nxChatSearchAnswer(env,query,research,input.style,input.instructions,ev=>announce(ev.stage||"answering",ev.provider||research.provider,research.sources||[]));
     answer={kind:"search",reply,sources:input.showSources===false?[]:research.sources||[],provider:research.provider,webSearchUsed:true};
    }
   }else if(choice.action==="browse"){answer=await nyxBrowse(env,choice.url,last)}
   else if(choice.action==="image"){answer={kind:"text",reply:"Image generation needs an open NyX tab for now. Return to your chat and request the image again.",sources:[]}}
   else answer={kind:"text",reply:await nyxWrite(env,input.messages,input.style,input.instructions),sources:[]};
   await progressWrites;
   await env.NYX_DB.prepare("UPDATE nyx_background_jobs SET status='done',result_json=?,error=NULL,completed_at=?,payload_json='{}',progress_json=NULL WHERE id=?").bind(JSON.stringify(answer),Date.now(),id).run();
   message.ack();
  }catch(e){
   const attempts=Number(row.attempts||0)+1;
   if(attempts>=3){
    await env.NYX_DB.prepare("UPDATE nyx_background_jobs SET status='failed',error=?,completed_at=?,payload_json='{}' WHERE id=?").bind("NyX could not complete this background response. Please retry.",Date.now(),id).run();
    message.ack();
   }else{
    await env.NYX_DB.prepare("UPDATE nyx_background_jobs SET status='queued',started_at=NULL WHERE id=?").bind(id).run();
    message.retry({delaySeconds:20});
   }
  }
 }
}
