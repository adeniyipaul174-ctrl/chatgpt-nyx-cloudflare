function nxReplyQualityGate(history,rawReply){
 const rows=Array.isArray(history)?history:[];
 const q=String(rows.at(-1)?.content||"").trim();
 const reply=String(rawReply||"").trim();
 // The model cannot infer live system health from an absence of logs.
 const statusQuestion=/\b(?:issues?|problems?|bugs?|errors?|failures?|wrong|working properly|status)\b/i.test(q)
 && /\b(?:you|your|nyx|the app|this ai)\b/i.test(q);
 if(statusQuestion&&/\b(?:no (?:prior )?(?:issues?|problems?|errors?)|everything (?:is|looks) fine|functioning properly|working perfectly|no (?:problems?|issues?) to report|conversation just started)\b/i.test(reply)){
  const earlier=rows.slice(0,-1).map(m=>String(m.content||"")).join("\n").slice(-15000);
  const findings=[];
  if(/\b(?:irrelevant|wrong|unrelated|misunderstood|microsoft|windows).{0,80}\b(?:search|results?|answer)|\bsearch.{0,80}\b(?:wrong|irrelevant|microsoft|windows)\b/i.test(earlier))findings.push("irrelevant search results");
  if(/\b(?:network error|connection error|timeout|request failed)\b/i.test(earlier))findings.push("failed or interrupted requests");
  if(/\b(?:forgot|forget|didn'?t remember|lost.{0,30}context)\b/i.test(earlier))findings.push("lost conversation context");
  if(findings.length)return "From this conversation, NyX has had problems with "+findings.join(", ")+". I cannot verify which issues are still occurring without live diagnostics, but those are real reported failures that need testing.";
  return "I can't inspect NyX's live diagnostics from this chat, so I can't reliably say which issues are happening right now. I can investigate specific behavior you show me, but I shouldn't claim everything is working when I haven't checked.";
 }
 if(/\b(?:search|look up|browse|research)\b/i.test(q)
 &&/\b(?:i (?:can'?t|cannot|am unable to) (?:search|browse|look up|research)|nyx (?:can'?t|cannot) (?:search|browse))\b/i.test(reply)){
  return "NyX supports web research, but this particular text reply has not performed a live search. I can help research the request using its web-search feature; any factual findings still need relevant source evidence.";
 }
 return reply;
}

/* NyX quality-first text routing. Prefer stable, capable model over
   random free-model routing; bound context by turns and characters. */
function nxModelConversationWindow(history) {
 const rows=(Array.isArray(history)?history:[]).filter(m=>["user","assistant"].includes(m?.role)).slice(-22);
 return rows.map((m,i)=>({
  role:m.role,
  content:String(m.content||"").slice(0,i<rows.length-12?1800:5200)
 }));
}
async function nyxWrite(env,history,style,instructions,extra){
 const tone=["balanced","concise","detailed"].includes(style)?style:"balanced";
 const sys="You are NyX, a web-enabled conversational AI assistant. Answer the user's EXACT most recent request and use earlier messages in this same conversation to resolve follow-ups. Reply directly and specifically, without unnecessary boilerplate. Do not substitute a superficially related question. "+
"NyX has separately implemented web search, image generation, editing and document tools. You are preparing a text reply here, so do not claim to have used those tools unless their actual results are supplied. Do not falsely claim that NyX categorically cannot search the internet or research publicly advertised professional contact information. "+
"If asked about NyX's errors or issues, acknowledge failures documented in the supplied conversation, such as irrelevant searches, forgotten context, or request/network errors. Never deny a documented failure or claim everything is working perfectly. You cannot see current private system diagnostics from this text reply, so do not invent live system status. "+
"When the user refers to earlier people, books, search results, or lists, use the particular names and topics already supplied; do not reinterpret 'all those' as everyone in the world. If the reference truly cannot be resolved, ask one concrete question. "+
"Never invent public data, source links, names, dates, review counts, verified websites, API access, contact details, model prices or completed actions. Previous assistant-generated claims are conversational context, NOT independent verification. A public lookup with no evidence is still unverified; describe the next verifiable step instead of making up facts or flatly refusing a legitimate research task. "+
"Explain uncertainty only when meaningful. Do not invent citations. Honor user requests within safe bounds and never assist harmful or unlawful abuse. Keep response formatting readable, natural, and clean. Style: "+tone+". "+(instructions?"User preferences: "+String(instructions).slice(0,1200):"")+(extra||"");
 const messages=[{role:"system",content:sys},...nxModelConversationWindow(history)];
 const maxTokens=tone==="detailed"?1800:tone==="concise"?750:1400;
 const models=["@cf/meta/llama-3.3-70b-instruct-fp8-fast","@cf/meta/llama-3.1-8b-instruct-fast"];
 let lastError=null;
 for(const model of models) {
  try{
   const out=await env.AI.run(model,{messages,max_tokens:model===models[0]?maxTokens:Math.min(maxTokens,1000),temperature:tone==="detailed"?.4:.3});
   const reply=nyxMessageText(out);
   if(typeof reply==="string"&&reply.trim())return nxReplyQualityGate(history,reply);
   lastError=new Error("The AI provider returned an empty answer");
  }catch(e){lastError=e}
 }
 // The free model endpoint may return a different model on every request.
 // Keep it only as a last-resort fallback, never as the main conversational brain.
 if(env.OPENROUTER_API_KEY){
  try{
   const result=await nyxFreeRouterText(env,messages,Math.min(maxTokens,1100));
   if(typeof result==="string"&&result.trim())return nxReplyQualityGate(history,result);
  }catch(e){lastError=e}
 }
 throw lastError||new Error("No AI model could produce a response");
}