/* NyX Code activity V2 — robust browser-runtime syntax, legacy pending recovery.
 * Presentation-only: request creation, cancellation, models and storage remain
 * owned by NyX's existing Chat/Code controller. */
(function(){
"use strict";
if(window.nxCodeActivityV3)return;
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
 const urlOrSite=/https?:[/][/]|www[.][^ ]+|(?:^|[^a-z])(?:open|read|visit|browse|check|inspect).{0,90}(?:website|webpage|site|page)/i.test(s);
 const codeTutorial=/^(?:write|create|build|generate).{0,80}(?:code|script|function|program)/i.test(s);
 if(urlOrSite&&!codeTutorial)return {title:"Reading the website",note:"Retrieving public page content"};
 if(/(?:^|[^a-z])(?:debug|error|exception|crash|bug|broken|fails?|fix|not working|doesn't work|won't run)(?:$|[^a-z])/i.test(s))return {title:"Finding a way to fix it",note:"Preparing debugging guidance"};
 if(/(?:^|[^a-z])(?:review|audit|check|improve|optimize|optimise|refactor|security|performance)(?:$|[^a-z])/i.test(s))return {title:"Reviewing the approach",note:"Preparing suggestions and changes"};
 if(/(?:^|[^a-z])(?:explain|what is|how does|why|difference|compare|teach|meaning|understand)(?:$|[^a-z])/i.test(s))return {title:"Forming a clear explanation",note:"Preparing an explanation"};
 if(/(?:^|[^a-z])(?:build|create|make|implement|write|generate|develop|code|script|function|app|website|html|css|javascript|typescript|python|react|node[.]js)(?:$|[^a-z])/i.test(s))return {title:"Putting the solution together",note:"Preparing code and an explanation"};
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
 return /^(?:NyX is thinking|Thinking|Preparing your response)(?:[.]{3}|…)?$/i.test(raw);
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
  const content=el("div","nx-code-activity-content");
 const title=el("strong","nx-code-activity-heading","NyX Code");
 const subtitle=el("span","nx-code-activity-sub","Reviewing your request");
 const timeline=el("div","nx-code-timeline");
 const prompt=latestUser(bubble);
 const task=topic.title;
 const codeSupplied=/(?:[{][^}]{4,}[}]|<html|<!doctype|<manifest|(?:^|[^a-z0-9])(?:const|let|var|function|def|class|import)[ ]+[a-z]|[{};])/i.test(prompt);
 const firstText=/fix|debug/i.test(task)?(codeSupplied?"Identified the code you shared":"Identified the problem you described"):
  /explan/i.test(task)?"Identified your programming question":
  /website/i.test(task)?"Identified the website to read":
  /review/i.test(task)?"Identified what needs reviewing":
  "Identified the task and requested features";
 const step=(message,kind)=>{
  const row=el("div","nx-code-step nx-code-step-"+kind);
  const dot=el("span","nx-code-step-dot",kind==="done"?"✓":"");
  dot.setAttribute("aria-hidden","true");
  row.append(dot,el("span","nx-code-step-text",message));
  timeline.append(row);
  return row;
 };
 let current=step(firstText,"done");
 current=step("Preparing the coding request","active");
 const finish=()=>{
  if(!current)return;
  current.classList.remove("nx-code-step-active");
  current.classList.add("nx-code-step-done");
  current.querySelector(".nx-code-step-dot").textContent="✓";
  current=null;
 };
 const elapsed=el("span","nx-code-activity-time","0s");
 elapsed.setAttribute("aria-label","Elapsed time");
 elapsed.setAttribute("aria-live","off");
 const header=el("div","nx-code-progress-header");
 header.append(title,subtitle,elapsed);
 const note=el("div","nx-code-progress-note","These updates show request progress, not completed code tests.");
 content.append(header,timeline,note);
 card.classList.add("nx-code-activity-timeline");
 card.replaceChildren(content);
 bubble.replaceChildren(card);
 const record={interval:0,step,finish,subtitle,note,getCurrent:()=>current,
  setCurrent:row=>{current=row},sent:false,received:false,slow:false,verySlow:false};
 const start=Date.now();
 const tick=()=>{
  if(!bubble.isConnected||!card.isConnected){cleanup(bubble);return}
  const seconds=Math.floor((Date.now()-start)/1000);
  elapsed.textContent=seconds+"s";
  if(record.received)return;
  if(record.sent&&seconds>=8&&!record.slow){
   record.slow=true;
   subtitle.textContent="Still waiting for the coding model";
   step("The model response is still pending","info");
  }
  if(record.sent&&seconds>=25&&!record.verySlow){
   record.verySlow=true;
   note.textContent="Taking longer than usual. You can stop the request anytime.";
   step("Waiting for the provider or its fallback","info");
  }
 };
 const interval=setInterval(tick,1000);
 record.interval=interval;
 active.set(bubble,record);
 tick();
}
document.addEventListener("nx-code-progress",event=>{
 const detail=event?.detail||{},bubble=detail.bubble;
 if(!bubble||!isCode())return;
 if(!active.has(bubble))mount(bubble);
 const record=active.get(bubble);
 if(!record)return;
 if(detail.phase==="sent"&&!record.sent){
  record.sent=true;
  record.finish();
  record.step("Coding request sent","done");
  const kind=taskType(latestUser(bubble)).title;
  const waiting=/fix|debug/i.test(kind)?"Waiting for suggested code changes":
   /explan/i.test(kind)?"Waiting for an explanation":
   /website/i.test(kind)?"Waiting for public page content":
   /review/i.test(kind)?"Waiting for code review suggestions":
   "Waiting for the generated code";
  record.setCurrent(record.step(waiting,"active"));
  record.subtitle.textContent="Awaiting a response";
  record.note.textContent="Your response will replace this progress panel when ready.";
 }else if(detail.phase==="received"&&!record.received){
  record.received=true;
  record.finish();
  record.step("Response received","done");
  record.setCurrent(record.step("Preparing the reply for display","active"));
  record.subtitle.textContent="Displaying the result";
 }
});

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
window.nxCodeActivityV3={taskType,scan};
window.nxCodeActivityV2=window.nxCodeActivityV3;
window.nxCodeActivityV1=window.nxCodeActivityV3;
schedule();
})();