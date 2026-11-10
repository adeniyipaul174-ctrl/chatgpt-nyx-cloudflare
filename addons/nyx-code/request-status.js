/* NyX Code request status — a single truthful, task-aware request indicator.
 * Actual network wait/elapsed time only; never invent tool activity or steps.
 * The normal Chat mode and stored messages are unchanged.
 */
(function(){
"use strict";
if(window.nxCodeRequestStatusV1)return;
function actionFor(prompt){
 const p=String(prompt||"").trim().slice(0,800);
 if(/\b(?:debug|fix|bug|error|exception|stack\s*trace|not\s+working|fails?|broken|troubleshoot)\b/i.test(p))return "Preparing debugging guidance";
 if(/\b(?:review|audit|security|vulnerabilit|refactor|optimi[sz]e)\b/i.test(p))return "Preparing a code review";
 if(/\b(?:explain|what\s+is|why\s+does|how\s+does|teach|understand|walk\s+me\s+through)\b/i.test(p))return "Preparing an explanation";
 if(/\b(?:test|unit\s+tests?|integration\s+tests?|playwright|jest|pytest)\b/i.test(p))return "Preparing test code";
 if(/\b(?:website|web\s+app|interface|dashboard|landing\s+page|frontend|html|css|responsive)\b/i.test(p))return "Generating your interface";
 if(/\b(?:script|python|javascript|typescript|function|program|api|code|implement|build|create|write|generate)\b/i.test(p))return "Generating a code response";
 return "Preparing your answer";
}
function build(tag,className,text){
 const el=document.createElement(tag);
 if(className)el.className=className;
 if(text!==undefined)el.textContent=String(text);
 return el;
}
function attach(pending,prompt){
 if(!pending||pending.dataset.nxCodeRequestStatus==="1")return;
 if(document.body.dataset.nxProduct!=="code")return;
 pending.dataset.nxCodeRequestStatus="1";
 pending.classList.add("nx-code-awaiting");
 pending.setAttribute("role","status");
 pending.setAttribute("aria-live","polite");
 pending.setAttribute("aria-atomic","true");
 const card=build("div","nx-code-request-status");
 const icon=build("div","nx-code-request-icon");
 icon.setAttribute("aria-hidden","true");
 icon.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="m8 7-5 5 5 5m8-10 5 5-5 5M14 4l-4 16"/></svg>';
 const content=build("div","nx-code-request-details");
 const heading=build("div","nx-code-request-heading");
 heading.append(build("span","nx-code-request-brand","NyX Code"),build("span","nx-code-request-pulse"));
 const action=build("div","nx-code-request-action",actionFor(prompt));
 const note=build("div","nx-code-request-note","Waiting for the model’s response");
 const track=build("div","nx-code-request-track");
 track.append(build("div","nx-code-request-track-fill"));
 content.append(heading,action,note,track);
 card.append(icon,content);
 pending.replaceChildren(card);
 const started=Date.now();
 const interval=setInterval(()=>{
  if(!pending.isConnected||pending.dataset.nxCodeRequestStatus!=="1"){
   clearInterval(interval);return;
  }
  const elapsed=Math.floor((Date.now()-started)/1000);
  if(elapsed<8)return;
  if(elapsed<28)note.textContent="Waiting for the model · "+elapsed+"s elapsed";
  else note.textContent="Taking longer than usual · "+elapsed+"s elapsed";
 },1000);
 // The normal request handler re-renders the message list on success, failure,
 // cancellation, mode changes or thread switches. Its normal lifecycle remains
 // responsible for ending this indicator.
}
function promptFromCurrentConversation(){
 try{
  const item=chats.find(c=>c.id===current);
  const m=item?.messages?.filter(x=>x?.role==="user").at(-1);
  return String(m?.content||"");
 }catch{return ""}
}
function enhancePending(){
 if(document.body.dataset.nxProduct!=="code")return;
 const messages=document.getElementById("messages");
 if(!messages)return;
 for(const item of messages.querySelectorAll('.bubble.assistant[role="status"]:not([data-nx-code-request-status])')){
  attach(item,promptFromCurrentConversation());
 }
}
const messages=document.getElementById("messages");
if(messages)new MutationObserver(enhancePending).observe(messages,{
 childList:true,subtree:true,attributes:true,attributeFilter:["role"]
});
new MutationObserver(enhancePending).observe(document.body,{attributes:true,attributeFilter:["data-nx-product"]});
window.nxCodeRequestStatusV1={attach,actionFor,enhancePending};
enhancePending();
})();