/* NyX Code live activity: no simulated steps, only emitted backend events. */
(function(){
"use strict";
if(window.nxCodeLiveActivityV4)return;
const messages=document.getElementById("messages");
if(!messages)return;
const active=new WeakMap();
const el=(tag,klass,text)=>{
 const item=document.createElement(tag);
 if(klass)item.className=klass;
 if(text!==undefined)item.textContent=String(text);
 return item;
};
function draw(pending){
 if(!pending||active.has(pending))return;
 const host=el("section","nx-realtime-activity");
 host.setAttribute("role","status");
 host.setAttribute("aria-label","NyX Code activity");
 const heading=el("div","nx-realtime-heading");
 const spinner=el("span","nx-realtime-spinner");
 spinner.setAttribute("aria-hidden","true");
 heading.append(spinner,el("strong","nx-realtime-brand","NyX Code"),el("span","nx-realtime-label","Connecting"));
 const list=el("div","nx-realtime-lines");
 host.append(heading,list);
 pending.replaceChildren(host);
 pending.classList.add("nx-realtime-bubble");
 pending.dataset.nxCodeActivity="4";
 active.set(pending,{host,heading,list,seen:new Set()});
}
function receive(event){
 const data=event?.detail||{},p=data.bubble;
 if(!p||!p.isConnected)return;
 if(!active.has(p))draw(p);
 const state=active.get(p);
 if(!state)return;
 const append=(label,kind)=>{
  const text=String(label||"").trim().slice(0,195);
  if(!text||state.seen.has(text))return;
  state.seen.add(text);
  state.list.append(el("div","nx-realtime-line"+(kind?" nx-realtime-detail":""),text));
 };
 if(data.event==="stage"){
  append(data.label,false);
  state.heading.querySelector(".nx-realtime-label").textContent="In progress";
 }else if(data.event==="review"){
  append(data.summary,true);
  append(data.next,true);
 }
}
document.addEventListener("nx-code-live-event",receive);
const observer=new MutationObserver(()=>{
 if(document.body.dataset.nxProduct!=="code")return;
 for(const p of messages.querySelectorAll('.bubble.assistant[role="status"]')){
  if(!active.has(p))draw(p);
 }
});
observer.observe(messages,{childList:true,subtree:true,attributes:true,attributeFilter:["role"]});
window.nxCodeLiveActivityV4={draw,receive};
})();
