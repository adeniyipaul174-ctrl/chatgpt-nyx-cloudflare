/* NyX Code activity card: honest, task-aware response status.
 * Shows no fabricated progress percentages, tool invocations, or testing claims.
 * The request lifecycle is owned by the original chat submit/cancel handler.
 */
(function(){
"use strict";
if(window.nxCodeActivityV1)return;
const feed=document.getElementById("messages");
if(!feed)return;
const active=new Map();
const node=(type,className,text)=>{
 const el=document.createElement(type);
 if(className)el.className=className;
 if(text!==undefined)el.textContent=text;
 return el;
};
function taskType(prompt){
 const s=String(prompt||"").toLowerCase();
 if(/\b(?:debug|error|exception|crash|bug|broken|fails?|fix|not working|doesn't work|won't run)\b/.test(s))
  return {title:"Finding a way to fix it",note:"Preparing a debugging response"};
 if(/\b(?:review|audit|check|improve|optimi[sz]e|refactor|security|performance)\b/.test(s))
  return {title:"Reviewing the approach",note:"Preparing suggestions and changes"};
 if(/\b(?:build|create|make|implement|write|generate|develop|code|script|function|app|website|html|css|javascript|typescript|python|react|node\.js)\b/.test(s))
  return {title:"Putting the solution together",note:"Preparing code and an explanation"};
 if(/\b(?:explain|what is|how does|why|difference|compare|teach|meaning|understand)\b/.test(s))
  return {title:"Forming a clear explanation",note:"Preparing a response to your question"};
 return {title:"Preparing your answer",note:"Generating a response"};
}
function latestUser(bubble){
 let cursor=bubble.previousElementSibling;
 for(let n=0;cursor&&n<10;n++,cursor=cursor.previousElementSibling)
  if(cursor.classList.contains("bubble")&&cursor.classList.contains("user"))
   return cursor.textContent||"";
 return "";
}
function clearOne(bubble){
 const value=active.get(bubble);
 if(!value)return;
 clearInterval(value.interval);
 active.delete(bubble);
}
function mount(bubble){
 if(active.has(bubble)||bubble.dataset.nxCodeActivity)return;
 if(document.body.dataset.nxProduct!=="code")return;
 bubble.dataset.nxCodeActivity="1";
 bubble.classList.add("nx-ui4-searching","nx-code-activity-bubble");
 bubble.setAttribute("aria-live","polite");
 bubble.setAttribute("aria-atomic","true");
 const topic=taskType(latestUser(bubble));
 const panel=node("div","nx-code-activity");
 panel.setAttribute("aria-label","NyX Code is generating a response");
 const signal=node("span","nx-code-activity-signal");
 signal.setAttribute("aria-hidden","true");
 for(let i=0;i<3;i++)signal.append(node("i"));
 const body=node("div","nx-code-activity-content");
 const heading=node("strong","nx-code-activity-heading",topic.title);
 const sub=node("span","nx-code-activity-sub",topic.note);
 body.append(heading,sub);
 const elapsed=node("span","nx-code-activity-time","0s");
 elapsed.setAttribute("aria-label","Elapsed time");
 panel.append(signal,body,elapsed);
 bubble.replaceChildren(panel);
 const started=Date.now();
 const tick=()=>{
  if(!bubble.isConnected||!panel.isConnected){clearOne(bubble);return}
  const seconds=Math.max(0,Math.floor((Date.now()-started)/1000));
  if(seconds>=25)sub.textContent="Taking longer than usual — you can stop anytime";
  else if(seconds>=8)sub.textContent="Still generating your response";
  else sub.textContent=topic.note;
  elapsed.textContent=seconds+"s";
 };
 const interval=setInterval(tick,1000);
 active.set(bubble,{interval});
 tick();
}
function scan(){
 for(const bubble of feed.querySelectorAll('.bubble.assistant[role="status"]'))mount(bubble);
 for(const bubble of active.keys())if(!bubble.isConnected)clearOne(bubble);
}
let queued=false;
function schedule(){if(queued)return;queued=true;queueMicrotask(()=>{queued=false;scan()})}
const observer=new MutationObserver(schedule);
observer.observe(feed,{childList:true,subtree:true,attributes:true,attributeFilter:["role"]});
new MutationObserver(schedule).observe(document.body,{attributes:true,attributeFilter:["data-nx-product"]});
window.nxCodeActivityV1={taskType,scan};
schedule();
})();