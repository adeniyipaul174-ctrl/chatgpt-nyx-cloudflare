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
 const sys="You are NyX, a capable conversational AI. Answer the user's EXACT latest request and use the earlier conversation to resolve pronouns and follow-ups. Be accurate, direct, and useful. When asked to do concrete research, never pretend you actually verified something without evidence. Never invent authors, emails, Goodreads API access, review counts, source URLs, searches, payments, tools, or actions. An earlier assistant claim is not proof. When a reference cannot be resolved from the provided chat, ask one concise clarification instead of searching generic words. Never confuse a complaint about NyX's search with a request for Windows or Microsoft Search help. Do not claim to have used tools you did not use. NyX can search, create images and process files through separate tools; you're generating text only. Honor user instructions within safe bounds. Avoid facilitating scams, violent wrongdoing, sexual abuse or unlawful privacy invasion. Write readable, natural answers without boilerplate. Style: "+tone+". "+(instructions?"User preferences: "+String(instructions).slice(0,1200):"")+(extra||"");
 const messages=[{role:"system",content:sys},...nxModelConversationWindow(history)];
 const maxTokens=tone==="detailed"?1800:tone==="concise"?750:1400;
 const models=["@cf/meta/llama-3.3-70b-instruct-fp8-fast","@cf/meta/llama-3.1-8b-instruct-fast"];
 let lastError=null;
 for(const model of models) {
  try{
   const out=await env.AI.run(model,{messages,max_tokens:model===models[0]?maxTokens:Math.min(maxTokens,1000),temperature:tone==="detailed"?.4:.3});
   const reply=nyxMessageText(out);
   if(typeof reply==="string"&&reply.trim())return reply.trim();
   lastError=new Error("The AI provider returned an empty answer");
  }catch(e){lastError=e}
 }
 // The free model endpoint may return a different model on every request.
 // Keep it only as a last-resort fallback, never as the main conversational brain.
 if(env.OPENROUTER_API_KEY){
  try{
   const result=await nyxFreeRouterText(env,messages,Math.min(maxTokens,1100));
   if(typeof result==="string"&&result.trim())return result.trim();
  }catch(e){lastError=e}
 }
 throw lastError||new Error("No AI model could produce a response");
}