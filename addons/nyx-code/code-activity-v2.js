/* NyX Code activity V2 — robust browser-runtime syntax, legacy pending recovery.
 * Presentation-only: request creation, cancellation, models and storage remain
 * owned by NyX's existing Chat/Code controller. */
(function(){
"use strict";
if(window.nxCodeActivityV2)return;
const feed=document.getElementById("messages");
if(!feed)return;
const active=new Map();
const el=(tag,name,text)=>{
 const result=document.createElement(tag);
 if(name)result.className=name;
 if(text!==undefined)result.textContent=String(text);
 return result;
};
function isCode(){
 const button=document.querySelector('#plNativeNav [data-pl-page="code"]');
 return window.nxCodeUI?.getMode()==="code"||
  document.body.dataset.nxProduct==="code"||
  !!button?.classList.contains("active");
}
function taskType(prompt){
 const s=String(prompt||"").toLowerCase();
 if(!/^(?:write|create|build|generate)\b.{0,80}\b(?:code|script|function|program)\b/.test(s)&&
  (/https?:\/\/|\bwww\.\S+|\b(?:open|read|visit|browse|check|inspect)\b.{0,90}\b(?:website|webpage|site|page)\b/.test(s)))
  return {title:"Reading the website",note:"Retrieving public page content"};
 if(/\b(?:debug|error|exception|crash|bug|broken|fails?|fix|not working|doesn't work|won't run)\b/.test(s))
  return {title:"Finding a way to fix it",note:"Preparing debugging guidance"};
 if(/\b(?:review|audit|check|improve|optimi[sz]e|refactor|security|performance)\b/.test(s))
  return {title:"Reviewing the approach",note:"Preparing suggestions and changes"};
 if(/\b(?:explain|what is|how does|why|difference|compare|teach|meaning|understand)\b/.test(s))
  return {title:"Forming a clear explanation",note:"Preparing an explanation"};
 if(/\b(?:build|create|make|implement|write|generate|develop|code|script|function|app|website|html|css|javascript|typescript|python|react|node\.js)\b/.test(s))
  return {title:"Putting the solution together",note:"Preparing code and an explanation"};
 return {title:"Preparing your answer",note:"Waiting for the coding model"};
}
function latestUser(bubble){
 let cursor=bubble.previousElementSibling;
 for(let n=0;cursor&&n<15;n++,cursor=cursor.previousElementSibling){
  if(cursor.classList.contains("bubble")&&cursor.classList.contains("user"))
   return cursor.textContent||"";
 }
 return "";
}
function pendingText(bubble){
 if(bubble.dataset.nxCodeActivity||bubble.querySelector(".nx-code-activity"))return false;
 const raw=[...bubble.childNodes].filter(n=>n.nodeType===Node.TEXT_NODE)
  .map(n=>n.textContent).join(" ").trim();
 return /^(?:NyX is thinking|Thinking|Preparing your response)(?:\.{3}|…)?$/i.test(raw);
}
function cleanup(bubble){
 const value=active.get(bubble);
 if(!value)return;
 clearInterval(value.interval);
 active.delete(bubble);
}
function mount(bubble){
 if(active.has(bubble)||bubble.dataset.nxCodeActivity==="1"||!isCode())return;
 if(bubble.getAttribute("role")!=="status"){
  if(!pendingText(bubble))return;
  const send=document.getElementById("send");
  const busy=!!send&&(send.disabled||send.classList.contains("nx-compose-stop")||
   send.getAttribute("aria-busy")==="true");
  if(!busy){
   bubble.dataset.nxRecovered="1";
   bubble.textContent="The previous response did not finish. Please resend your question.";
   return;
  }
  bubble.setAttribute("role","status");
 }
 bubble.dataset.nxCodeActivity="1";
 bubble.classList.add("nx-ui4-searching","nx-code-activity-bubble");
 bubble.setAttribute("aria-live","polite");
 bubble.setAttribute("aria-atomic","false");
 const topic=taskType(latestUser(bubble));
 const card=el("div","nx-code-activity");
 card.setAttribute("aria-label","NyX Code is responding");
 const signal=el("span","nx-code-activity-signal");
 signal.setAttribute("aria-hidden","true");
 for(let n=0;n<3;n++)signal.append(el("i"));
 const content=el("div","nx-code-activity-content");
 const title=el("strong","nx-code-activity-heading",topic.title);
 const subtitle=el("span","nx-code-activity-sub",topic.note);
 content.append(title,subtitle);
 const elapsed=el("span","nx-code-activity-time","0s");
 elapsed.setAttribute("aria-label","Elapsed time");
 elapsed.setAttribute("aria-live","off");
 card.append(signal,content,elapsed);
 bubble.replaceChildren(card);
 const start=Date.now();
 const tick=()=>{
  if(!bubble.isConnected||!card.isConnected){cleanup(bubble);return}
  const seconds=Math.floor((Date.now()-start)/1000);
  if(seconds>=25)subtitle.textContent="Taking longer than usual — you can stop anytime";
  else if(seconds>=8)subtitle.textContent="Still waiting for the model";
  elapsed.textContent=seconds+"s";
 };
 const interval=setInterval(tick,1000);
 active.set(bubble,{interval});
 tick();
}
function scan(){
 if(isCode()){
  for(const bubble of feed.querySelectorAll(".bubble.assistant")){
   if(bubble.getAttribute("role")==="status"||pendingText(bubble))mount(bubble);
  }
 }
 for(const bubble of active.keys())if(!bubble.isConnected)cleanup(bubble);
}
let queued=false;
function schedule(){
 if(queued)return;
 queued=true;
 queueMicrotask(()=>{queued=false;scan()});
}
new MutationObserver(schedule).observe(feed,{childList:true,subtree:true,attributes:true,attributeFilter:["role"]});
new MutationObserver(schedule).observe(document.body,{attributes:true,attributeFilter:["data-nx-product"]});
window.nxCodeActivityV2={taskType,scan};
window.nxCodeActivityV1=window.nxCodeActivityV2;
schedule();
})();