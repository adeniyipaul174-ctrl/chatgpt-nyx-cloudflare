
function nxRecallAuthorNames(messages,provided){
 const names=[],seen=new Set();
 const add=v=>{
  const n=String(v||"").replace(/_/g," ").replace(/\s+/g," ").trim();
  if(!/^[A-Z][A-Za-z.'’-]{1,36}(?:\s+[A-Z][A-Za-z.'’-]{1,36}){1,4}$/.test(n)||n.length>100)return;
  if(/^(?:Author Name|The Author|All Authors|Public Contact|Books By|Warm Regards|Australian Literary Network)$/i.test(n))return;
  const key=n.toLowerCase();if(!seen.has(key)&&names.length<60){seen.add(key);names.push(n)}
 };
 for(const message of Array.isArray(messages)?messages:[]){
  if(!["user","assistant"].includes(message?.role))continue;
  const body=String(message.content||"").slice(0,45000).replace(/\*\*/g,"");
  for(const m of body.matchAll(/(?:^|\n)\s*(?:[-*]\s*)?(?:\d{1,3}[.)]\s*)?(?:\*{1,2})?\s*Author\s*:\s*(?:\*{1,2})?\s*([A-Z][A-Za-z.'’-]+(?:\s+[A-Z][A-Za-z.'’-]+){1,4})(?=\s*(?:\n|$|\*|[|]|Reviews?\s*:|Profile\s*:))/gmi))add(m[1]);
  for(const m of body.matchAll(/goodreads\.com\/author\/show\/\d+\.([A-Za-z][A-Za-z0-9_]{3,110})/gi))add(m[1]);
 }
 if(Array.isArray(provided))for(const v of provided.slice(0,60))add(v);
 return names;
}
function nxHasPriorReference(text){
 return /\b(?:those|these|them|their|the ones|earlier|previously|above|last time|the list|those authors|authors? (?:you|we) (?:found|listed|scouted|searched)|the (?:results|people|books) (?:you|we))\b/i.test(String(text||""));
}
function nxIsAuthorContactRequest(text){
 const q=String(text||"");
 return /\b(?:authors?|writers?|books?|people|names|them|those|these)\b/i.test(q)
   &&/\b(?:contact|email|e-mail|address|reach|website|websites)\b/i.test(q)
   &&/\b(?:search|find|look|research|lookup|get|give|provide|check|contact)\b/i.test(q);
}
function nxMissingContextReply(){
 return "I understand you mean the specific authors mentioned earlier, not every author in the world. I cannot identify their names from the available chat context. Please paste the earlier list or open the chat containing it. I will not search for the word 'all' or invent contact information.";
}
function nxPriorContactProgress(messages){
 for(let i=(messages?.length||0)-2;i>=0&&i>=messages.length-8;i--){
  if(messages[i]?.role!=="assistant")continue;
  const m=String(messages[i].content||"").match(/Checked\s+(\d+)\s+of\s+(\d+)\s+authors\b/i);
  if(m)return {checked:Number(m[1]),total:Number(m[2])};
 }
 return {checked:0,total:0};
}
function nxBuildMemoryNotes(text,history,recall){
 if(!nxHasPriorReference(text))return "";
 const names=nxRecallAuthorNames(history,recall?.authors);
 if(names.length)return "CONVERSATION CONTEXT, NOT VERIFIED: Earlier messages in this chat listed these authors: "+names.slice(0,40).join("; ")+". References such as 'those authors' mean this list, not all authors everywhere. Previous names, books and review counts might be wrong; verify before asserting anything. Do not invent contact details.";
 const excerpt=String(recall?.relevantExcerpt||"").slice(0,2400);
 return excerpt?"Earlier conversation excerpt (UNVERIFIED): "+excerpt+". Use only as context, never as independent evidence.":"";
}
async function nxResolveContextSearch(env,text,history,context){
 const q=String(text||"").trim();
 if(!nxHasPriorReference(q))return {query:q};
 const names=nxRecallAuthorNames(history,context?.authors);
 if(nxIsAuthorContactRequest(q))return names.length?{kind:"author_contacts",names}:{kind:"missing",reply:nxMissingContextReply()};
 const excerpt=String(context?.relevantExcerpt||"").slice(0,1400)||
  (Array.isArray(history)?String(history.slice(0,-1).reverse().find(m=>m?.role==="assistant"&&m.content)?.content||"").slice(0,1400):"");
 if(!excerpt)return {kind:"missing",reply:"I understand you're referring to an earlier message, but those details aren't available. Please paste the original message so I can answer accurately."};
 try{
  const output=await env.AI.run("@cf/meta/llama-3.1-8b-instruct-fast",{
   messages:[{role:"system",content:"Resolve references in the latest public web research request using ONLY the earlier conversation. Return one specific 5-18 word SEARCH QUERY including an actual named subject. Never invent names, books or websites. If the subject is unclear, output exactly NEED_CONTEXT."},
   {role:"user",content:"Earlier conversation:\n"+excerpt+"\nLatest request:\n"+q.slice(0,500)}],
   temperature:0,max_tokens:75
  });
  const candidate=nyxMessageText(output).trim().replace(/[\r\n]+/g," ").slice(0,170);
  if(candidate!=="NEED_CONTEXT"&&candidate.length>=9&&candidate.split(/\s+/).length>=2
   &&!/^(all|those|them|these|contact|email|authors?)$/i.test(candidate))return {query:candidate};
 }catch{}
 return {kind:"missing",reply:"I can't identify the earlier subject reliably. Please quote the name or list so I don't search irrelevant terms."};
}
function nxPublicEmailMatches(text){
 return [...new Set([...String(text||"").slice(0,17000).matchAll(/\b[A-Z0-9._%+-]{1,64}@[A-Z0-9.-]+\.[A-Z]{2,20}\b/gi)].map(m=>m[0]))]
 .filter(x=>!/^(?:example@|test@|noreply@|no-reply@|support@example|admin@example)/i.test(x)).slice(0,3);
}
function nxContactSearchStream(env,names,offset){
 const selected=names.slice(offset,offset+6),end=offset+selected.length,total=names.length;
 const encoder=new TextEncoder();
 const body=new ReadableStream({start(controller){
  const emit=obj=>{try{controller.enqueue(encoder.encode(JSON.stringify(obj)+"\n"))}catch{}};
  (async()=>{
   const records=[],sources=[];
   try{
    emit({event:"stage",stage:"starting"});
    for(const name of selected){
     emit({event:"stage",stage:"searching",provider:"Author website research"});
     let found;
     try{found=await nyxSearch(env,name+" author official website contact email",true,step=>emit({event:"stage",...step}))}catch{}
     const first=name.split(" ")[0].toLowerCase(),last=name.split(" ").at(-1).toLowerCase();
     const candidates=(found?.sources||[]).filter(x=>{
       const title=String(x.title||"").toLowerCase(),snippet=String(x.snippet||"").toLowerCase();
       return title.includes(last)&&(title.includes(first)||snippet.includes(first))&&/^https:\/\//.test(String(x.url||""));
     }).slice(0,3);
     emit({event:"stage",stage:"reading",provider:found?.provider||"Public author sites"});
     let match=null;
     for(const item of candidates){
      try{
       const page=String(await nxResearchPublicPage(item.url)||"");
       if(!page.toLowerCase().includes(last))continue;
       const emails=nxPublicEmailMatches(page);
       if(emails.length){match={name,email:emails[0],url:item.url};break}
      }catch{}
     }
     records.push(match||{name,email:null,url:null});
     if(match)sources.push({title:name+" public contact",url:match.url,snippet:"Public email found on the fetched webpage"});
    }
    emit({event:"sources",results:sources,provider:"Public author websites"});
    const lines=records.map((item,i)=>{
      const info=item.email?item.email+" — "+item.url:"No verified public email found in the checked sources.";
      return String(offset+i+1)+". "+item.name+": "+info;
    });
    const ending="Checked "+end+" of "+total+" authors."+(end<total?" "+(total-end)+" remain. Ask to continue checking those authors' public emails to search the next batch.":"");
    const reply="I used the author names from this chat, not a dictionary definition of 'all'. The earlier author names and review counts were not independently verified.\n\n"+lines.join("\n\n")+"\n\n"+ending;
    emit({event:"done",data:{kind:"search",reply,sources,webSearchUsed:true,provider:"Public author websites"}});
   }catch{emit({event:"error",message:"Author contact research failed. I will not invent email addresses."})}
   finally{try{controller.close()}catch{}}
  })();
 }});
 return new Response(body,{headers:{"Content-Type":"application/x-ndjson; charset=utf-8","Cache-Control":"no-store"}});
}
