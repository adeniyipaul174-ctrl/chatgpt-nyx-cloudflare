/* NyX Code: second chat experience, reusing the original Chat composer and
 * history store. No Python Free Claude Code server is included in this browser
 * code; the backend uses configured free coding routes with automatic fallback. */
(function(){
"use strict";
if(window.nxCodeUI)return;
const app=document.querySelector(".app"),nav=document.getElementById("plNativeNav");
const form=document.getElementById("form"),input=document.getElementById("prompt");
const title=document.getElementById("plTitleMain"),home=document.getElementById("home");
const messages=document.getElementById("messages");
const oldWork=document.getElementById("nxWorkPane");
if(!app||!nav||!form||!home||!messages||!input)return;
const $=id=>document.getElementById(id);
const isCode=id=>typeof id==="string"&&/^(?:code-|work-)/.test(id);
let normalId=null,codeId=null;
let mode="chat";
const codeNav=nav.querySelector('[data-pl-page="work"]');
if(!codeNav)return;
codeNav.dataset.plPage="code";
codeNav.setAttribute("aria-label","NyX Code");
codeNav.innerHTML='<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m8 7-5 5 5 5m8-10 5 5-5 5M14 4l-4 16"/></svg><span>Code</span>';
const chatNav=nav.querySelector('[data-pl-page="chat"]');
const browserNav=nav.querySelector('[data-pl-page="browser"]');
const icon=home.querySelector(".pl-welcome-symbol");
const heading=home.querySelector("h1");
const suggestions=home.querySelector(".suggest");
const originalGreeting=heading?.textContent||"What’s on your mind?";
const originalSuggestions=Array.from(suggestions?.querySelectorAll("button")||[]).map(x=>x.textContent);
function currentChat(){return chats.find(c=>c?.id===current)}
function remember(){
 const id=currentChat()?.id||null;
 if(mode==="code"){if(id&&isCode(id))codeId=id;}
 else if(mode==="chat"){if(id&&!isCode(id))normalId=id;}
}
function mark(modeName){
 for(const el of nav.querySelectorAll(".pl-nav-item")){
  const selected=el.dataset.plPage===modeName;
  el.classList.toggle("active",selected);
  el.setAttribute("aria-current",selected?"page":"false");
 }
}
function configure(){
 const code=mode==="code";
 document.body.dataset.nxProduct=mode;
 if(title)title.textContent=code?"NyX Code":mode==="browser"?"NyX Browser":"NyX";
 input.placeholder=code?"Message NyX Code":"Message NyX";
 input.setAttribute("aria-label",code?"Ask NyX Code":"Message NyX");
 if(heading)heading.textContent=code?"What will we build?\nAsk NyX Code anything.":originalGreeting;
 if(icon)icon.style.color=code?"#0a84ff":"";
 if(suggestions){
  const texts=code?["Build a website","Fix my code","Explain a bug","Write a Python script"]:originalSuggestions;
  const btns=suggestions.querySelectorAll("button");
  btns.forEach((btn,i)=>{if(texts[i])btn.textContent=texts[i];btn.hidden=!texts[i]});
 }
 if(oldWork && mode!=="browser")oldWork.hidden=true;
 mark(mode);
}
function enter(name,selectedId){
 if(name!=="chat"&&name!=="code")return;
 remember();
 mode=name;
 // The existing internal Chat tab keeps the original composer visible.
 $("nxTabChat")?.click();
 const desired=selectedId||((name==="code")?codeId:normalId);
 const exists=desired&&chats.some(c=>c?.id===desired);
 current=exists?desired:null;
 if(name==="code")codeId=current;else normalId=current;
 render();
 configure();
 $("sidebar")?.classList.remove("open");
 document.querySelector(".pl-scrim")?.classList.remove("active");
}
const priorOpen=openChat;
openChat=function(id){
 if(isCode(id)){enter("code",id)}
 else{
  // The original openChat still handles normal history / side effects.
  if(mode==="code")remember();
  priorOpen(id);
  mode="chat";normalId=id;configure();
 }
};
const oldSubmit=form.onsubmit;
form.onsubmit=async function(event){
 if(mode!=="code")return oldSubmit.call(this,event);
 if(!input.value.trim()&&!document.querySelector(".nx-attach-preview,.nx-attachment-preview"))return oldSubmit.call(this,event);
 if(!current||!isCode(current)||!currentChat()){
  const id="code-"+uid();
  chats.unshift({id,title:"New conversation",messages:[],nxAutoTitle:true});
  current=id;codeId=id;
  persist();
 }
 return oldSubmit.call(this,event);
};
/* Add a narrowly scoped flag; everything else, including attachments and
 * search/image routing, still goes through NyX's original /api/nyx endpoint. */
const originalFetch=window.fetch.bind(window);
window.fetch=function(resource,options){
 const path=typeof resource==="string"?resource:resource?.url;
 if(mode==="code"&&path==="/api/nyx"&&options?.method==="POST"&&typeof options.body==="string"){
  try{
   const body=JSON.parse(options.body);
   if(Array.isArray(body.messages)){
    body.nyxCode=true;
    body.agentMode="off";
    const headers=new Headers(options.headers||{});
    headers.set("X-NyX-Client","web");
    return originalFetch(resource,{...options,headers,body:JSON.stringify(body)});
   }
  }catch{}
 }
 return originalFetch(resource,options);
};
nav.addEventListener("click",event=>{
 const item=event.target?.closest?.("[data-pl-page]");if(!item)return;
 const page=item.dataset.plPage;
 if(page==="code"||page==="chat"){
  event.preventDefault();event.stopImmediatePropagation();
  enter(page);
 }else if(page==="browser"){
  remember();mode="browser";document.body.dataset.nxProduct="browser";
  if(title)title.textContent="NyX Browser";
  mark("browser");
 }else if(page==="settings"){
  remember();
 }
},true);
document.addEventListener("click",event=>{
 if(!event.target?.closest?.("#newTop,#newSide"))return;
 if(mode==="code")codeId=null;
 if(mode==="chat")normalId=null;
},true);
// Preserve historic Work chat records as readable Code conversations.
window.nxCodeUI={enter,remember,getMode:()=>mode,isCodeId:isCode};
if(current&&isCode(current))enter("code",current);
else{document.body.dataset.nxProduct="chat";configure();}
})();