/* NyX unified Work/Chat history and subject-aware titles.
   The existing chats array, persist() wrapper, history sidebar, D1 account-sync,
   local privacy setting and chat deletion behavior remain the single source of truth. */
(function(){
"use strict";
if(window.nxUnifiedHistoryBridge)return;
if(typeof chats==="undefined"||typeof persist!=="function"||typeof render!=="function"||typeof openChat!=="function")return;
const isWorkId=id=>typeof id==="string"&&/^work-[a-z0-9._:-]+$/i.test(id);
const byId=id=>chats.find(c=>c&&c.id===id);
let chatCurrent=current&&!isWorkId(current)?current:null;
let workCurrent=current&&isWorkId(current)?current:null;
let syncing=false,renaming=false;
const pendingTitles=new Set(),finishedTitles=new Set(),titleTimers=new Map();
function isGreeting(text){
 const s=String(text||"").toLowerCase().replace(/[^\p{L}\p{N}\s]/gu," ").replace(/\s+/g," ").trim();
 return !s||/^(?:hi|hello|hey|yo|sup|hey there|hello there|hi there|good morning|good evening|good afternoon|howdy|hiya|thanks|thank you|ok|okay|yes|no|cool|great|alright|are you there|what's up|whats up)(?: nyx)?$/.test(s);
}
function meaningfulTopic(chat){
 if(!Array.isArray(chat?.messages))return "";
 const users=chat.messages.filter(m=>m?.role==="user"&&typeof m.content==="string");
 return users.map(m=>m.content.trim()).find(s=>s.length>=4&&!isGreeting(s)&&/[a-z]{3}/i.test(s))||"";
}
function baseTitle(id){return isWorkId(id)?"New Work conversation":"New conversation"}
function capitalize(s){return s.replace(/\b[a-z]/g,m=>m.toUpperCase())}
function draftTitle(text,isWork){
 let s=String(text||"").replace(/\[[^\]]{1,55}\]/g," ").replace(/https?:\/\/\S+/gi," ").replace(/\s+/g," ").trim();
 s=s.replace(/^(?:(?:hey|hello|hi)\s+(?:nyx|there)?[,!. ]*)+/i,"");
 s=s.replace(/^(?:can|could|would|will)\s+you\s+(?:please\s+)?/i,"");
 s=s.replace(/^(?:please\s+|i(?:'d| would)?\s+(?:like|want|need)\s+(?:you\s+)?to\s+|help\s+me\s+(?:to\s+)?)/i,"");
 const what=s.match(/^(?:what(?:'s| is| are| was)|who(?:'s| is| are)|explain|tell me about)\s+(?:a|an|the)?\s*(.{3,100})/i);
 const how=s.match(/^how\s+(?:can|do|would|should)\s+(?:i|we|you)\s+(.{4,100})/i);
 let result=what?"Understanding "+what[1]:how?"How to "+how[1]:s;
 result=result.replace(/^(?:make|create|build|design|write|generate|draft|search|find|research|compare|plan|prepare|fix|review|list|open)\s+(?:me\s+)?(?:a\s+|an\s+|the\s+)?/i,(m)=>m.trim().split(/\s+/)[0]+" ");
 result=result.replace(/\s+(?:for me|please|right now|here|with nyx|with your agents)\s*$/i,"").replace(/[?!,.:\s]+$/,"").trim();
 const words=result.split(/\s+/).filter(Boolean).slice(0,7);
 result=capitalize(words.join(" "));
 if(!result||result.toLowerCase()===String(text).trim().toLowerCase())result="About "+capitalize(words.join(" "));
 if(result.length>64)result=result.slice(0,62).replace(/\s+\S*$/,"").trim();
 return (isWork?"Work · ":"")+result;
}
function titleEligible(chat){
 const first=chat?.messages?.find(m=>m?.role==="user")?.content||"";
 const title=String(chat?.title||"").trim();
 return !title||title===first.slice(0,45)||title===first.slice(0,55)||title===first.slice(0,60)
  ||/^(?:New conversation|New Work conversation|Untitled chat)$/i.test(title)
  ||(chat.nxAutoTitle===true&&chat.nxTitleFinal!==true&&chat.title===chat.nxLastAutoTitle);
}
function updateTitles(){
 for(const c of chats){
  if(!c||typeof c.id!=="string"||!Array.isArray(c.messages)||!titleEligible(c))continue;
  const subject=meaningfulTopic(c);
  const preferred=subject?draftTitle(subject,isWorkId(c.id)):baseTitle(c.id);
  if(c.title!==preferred){c.title=preferred;c.nxAutoTitle=true;c.nxLastAutoTitle=preferred;}
  if(subject&&!finishedTitles.has(c.id)&&!pendingTitles.has(c.id)&&!titleTimers.has(c.id))scheduleTitle(c.id);
 }
}
const oldPersist=persist;
persist=function(){if(!renaming)updateTitles();return oldPersist()};
function scheduleTitle(id){
 const timeout=setTimeout(async()=>{
  titleTimers.delete(id);
  const chat=byId(id),subject=meaningfulTopic(chat);
  if(!chat||!subject||!titleEligible(chat)||pendingTitles.has(id)||finishedTitles.has(id))return;
  pendingTitles.add(id);
  const expectedTitle=chat.title,assistant=chat.messages.find(m=>m.role==="assistant")?.content||"";
  try{
   const result=await fetch("/api/nyx/chat-title",{
    method:"POST",credentials:"same-origin",cache:"no-store",
    headers:{"Content-Type":"application/json","X-NyX-Client":"web"},
    body:JSON.stringify({subject:subject.slice(0,750),assistant:String(assistant).slice(0,350),work:isWorkId(id)})
   });
   if(!result.ok)throw Error("Title generation unavailable");
   const data=await result.json();const currentChat=byId(id);
   if(!currentChat||currentChat.title!==expectedTitle||!titleEligible(currentChat))return;
   const final=String(data.title||"").replace(/[\r\n]/g," ").trim();
   if(!final||final.length>85)return;
   currentChat.title=final;currentChat.nxLastAutoTitle=final;
   currentChat.nxTitleFinal=true;currentChat.nxAutoTitle=true;finishedTitles.add(id);
   renaming=true;try{persist()}finally{renaming=false}render();
  }catch{}finally{pendingTitles.delete(id)}
 },650);
 titleTimers.set(id,timeout);
}
function loadWork(id){
 const messages=id&&byId(id)?.messages||[];
 window.nxWorkHistoryAPI?.load(messages);
}
function activate(mode){
 if(syncing)return;
 syncing=true;
 try{
  if(mode==="work"){
   if(current&&!isWorkId(current))chatCurrent=current;
   if(current&&isWorkId(current))workCurrent=current;
   const work=workCurrent&&byId(workCurrent);
   current=work?.id||null;loadWork(current);
  }else{
   if(current&&isWorkId(current))workCurrent=current;
   else if(current)chatCurrent=current;
   current=chatCurrent&&byId(chatCurrent)?chatCurrent:null;
  }
  render();
 }finally{syncing=false}
}
function saveWork(messages){
 if(!Array.isArray(messages)||!messages.length)return;
 let chat=workCurrent?byId(workCurrent):null;
 if(!chat){
  const id="work-"+uid();
  chat={id,title:"New Work conversation",messages:[],nxAutoTitle:true};
  chats.unshift(chat);workCurrent=id;
 }
 const clean=messages.slice(-150).filter(m=>["user","assistant"].includes(m?.role)&&typeof m?.content==="string").map(m=>({role:m.role,content:m.content.slice(0,12500)}));
 if(!clean.length)return;
 chat.messages=clean;
 if(document.body.dataset.nxStage==="work")current=chat.id;
 persist();render();
}
const oldOpenChat=openChat;
openChat=function(id){
 const chat=byId(id);
 if(!chat)return oldOpenChat(id);
 if(isWorkId(id)){
  workCurrent=id;oldOpenChat(id);
  window.nxEnterWork?.();
  loadWork(id);
 }else{
  chatCurrent=id;oldOpenChat(id);
  document.getElementById("nxTabChat")?.click();
 }
};
document.addEventListener("click",event=>{
 if(!event.target?.closest?.("#newSide,#newTop"))return;
 workCurrent=null;chatCurrent=null;
 window.nxWorkHistoryAPI?.load([]);
},true);
/* Work messages from the old session-only store are migrated on upgrade,
   when the same signed-in account is present. They are not discarded. */
function migrateLegacy(){
 try{
  const user=window.nyxAccount?.id;
  if(!user||chats.some(c=>isWorkId(c.id)))return;
  const key="nyx_work_chat_v1_"+String(user);
  const saved=JSON.parse(sessionStorage.getItem(key)||"[]");
  if(!Array.isArray(saved)||!saved.some(m=>m?.role==="user"))return;
  saveWork(saved);
 }catch{}
}
window.nxUnifiedHistoryBridge={activate,saveWork,loadWork,titleEligible,isGreeting};
migrateLegacy();
/* For preexisting literal greeting titles, replace only when a user saves a
   conversation again. Never overwrite a manually renamed history item. */
})();