/* NyX rich messages v1 — safe, accessible presentation of assistant outputs.
 * Enhances NyX's existing text-node Markdown renderer. It never trusts model
 * output as HTML and never changes the saved conversation or AI request.
 */
(function(){
"use strict";
if(window.nxRichMessagesV1)return;
const stream=document.getElementById("messages");
if(!stream)return;
let pending=false;
const C=(tag,klass,label)=>{
 const e=document.createElement(tag);
 if(klass)e.className=klass;
 if(label!==undefined)e.textContent=String(label);
 return e;
};
function status(button,label){
 const original=button.dataset.nxLabel||button.textContent;
 button.dataset.nxLabel=original;
 button.textContent=label;
 setTimeout(()=>{if(button.isConnected)button.textContent=original},1300);
}
async function copyText(value,button){
 const text=String(value||"");
 try{
  if(navigator.clipboard&&window.isSecureContext)await navigator.clipboard.writeText(text);
  else{
   const temp=C("textarea");temp.value=text;temp.style.cssText="position:fixed;left:-9999px;top:0";
   document.body.append(temp);temp.focus();temp.select();
   if(!document.execCommand("copy"))throw Error("Clipboard unavailable");
   temp.remove();
  }
  status(button,"Copied");
 }catch{status(button,"Select to copy")}
}
function button(text,label,action,klass){
 const b=C("button",klass||"nx-artifact-action",text);
 b.type="button";b.setAttribute("aria-label",label||text);
 b.addEventListener("click",action);
 return b;
}
function previousUser(bubble){
 let element=bubble.previousElementSibling;
 for(let i=0;element&&i<8;i++,element=element.previousElementSibling){
  if(element.classList.contains("bubble")&&element.classList.contains("user"))return element.textContent||"";
 }
 return "";
}
function draftKind(text,prompt){
 const raw=String(text||"").trim(),question=String(prompt||"").trim();
 if(raw.length<25||raw.length>11000)return null;
 const emailHeader=/(?:^|\n)\s*(?:\*\*)?(?:subject|to|cc|bcc):(?:\*\*)?\s*\S/im.test(raw);
 const emailRequest=/\b(?:draft|write|compose|rewrite|reply|polish|prepare|send)\b[\s\S]{0,90}\b(?:e-?mail|email reply)\b/i.test(question);
 const greeting=/^(?:dear\s+[^\n,]{2,70}[,:]|hi\s+[^\n,]{2,60}[,:]|hello\s+[^\n,]{2,60}[,:])/im.test(raw);
 const closing=/\b(?:best regards|kind regards|warm regards|sincerely|thank you|many thanks|yours truly)\b/i.test(raw);
 if(emailHeader&&(greeting||emailRequest||closing))return "email";
 if(emailRequest&&greeting&&closing)return "email";
 const explicitMessage=/^(?:\s*(?:\*\*)?)?(?:whats?app|sms|text message|direct message|dm|message to send|reply to send)(?:\s+message)?(?:\*\*)?\s*[:—-]/i.test(raw);
 const wantedMessage=/\b(?:draft|write|compose|rewrite|reply|polish|prepare)\b[\s\S]{0,95}\b(?:whats?app|text message|dm|direct message|short message|reply)\b/i.test(question);
 const socialLabel=/^(?:\s*(?:\*\*)?)?(?:linkedin post|instagram caption|social media post|facebook post|tweet|post caption|caption)(?:\*\*)?\s*[:—-]/i.test(raw);
 const socialRequest=/\b(?:draft|write|compose|rewrite|create|polish)\b[\s\S]{0,100}\b(?:linkedin post|instagram caption|social media post|facebook post|tweet|social caption)\b/i.test(question);
 if(socialLabel||socialRequest)return "social";
 if(explicitMessage||(wantedMessage&&raw.length<4000))return "message";
 return null;
}
function plaintext(md){
 return String(md.innerText||md.textContent||"").replace(/\u00a0/g," ").replace(/\n{4,}/g,"\n\n").trim();
}
function extraction(raw,label){
 const match=String(raw||"").match(new RegExp("(?:^|\\n)\\s*"+label+"\\s*:\\s*([^\\n]{1,180})","i"));
 return match?match[1].trim():"";
}
function makeDraft(bubble,md,kind){
 const original=plaintext(md);
 const labels={email:"Email draft",message:"Message draft",social:"Social post"};
 const card=C("section","nx-artifact-draft nx-artifact-"+kind);
 card.dataset.nxKind=kind;
 card.setAttribute("aria-label",labels[kind]);
 const head=C("div","nx-artifact-head");
 const title=C("div","nx-artifact-title");
 const glyph=C("span","nx-artifact-glyph",kind==="email"?"✉":kind==="message"?"◉":"✦");
 glyph.setAttribute("aria-hidden","true");
 const meta=C("span","nx-artifact-name",labels[kind]);
 title.append(glyph,meta);
 const actions=C("div","nx-artifact-actions");
 const body=C("div","nx-artifact-body");
 const edit=C("textarea","nx-artifact-editor");
 edit.value=original;edit.hidden=true;
 edit.setAttribute("aria-label","Edit "+labels[kind].toLowerCase());
 edit.spellcheck=true;edit.rows=7;
 let isEditing=false;
 const copy=button("Copy","Copy entire "+labels[kind].toLowerCase(),()=>copyText(edit.value,copy));
 const change=button("Edit","Edit "+labels[kind].toLowerCase(),()=>{
  isEditing=!isEditing;
  edit.hidden=!isEditing;body.hidden=isEditing;
  change.textContent=isEditing?"Preview":"Edit";
  if(isEditing)edit.focus();
  else if(edit.value!==original){
   const preview=C("div","nx-artifact-edited",edit.value);
   body.replaceChildren(preview);
  }
 });
 actions.append(change,copy);head.append(title,actions);
 const details=C("div","nx-artifact-details");
 if(kind==="email"){
  const subject=extraction(original,"Subject"),to=extraction(original,"To");
  if(to){const row=C("div","nx-artifact-detail");row.append(C("span",null,"To"),C("span",null,to));details.append(row)}
  if(subject){const row=C("div","nx-artifact-detail");row.append(C("span",null,"Subject"),C("strong",null,subject));details.append(row)}
  // If Subject/To were standalone Markdown paragraphs, don't repeat them in the body.
  for(const p of [...md.querySelectorAll(":scope > p")].slice(0,3)){
   if(/^(?:To|Subject|Cc|Bcc)\s*:/i.test(p.textContent.trim())&&p.textContent.trim().length<210)p.remove();
  }
 }
 body.append(md);
 card.append(head);
 if(details.childElementCount)card.append(details);
 card.append(body,edit);
 bubble.dataset.nxDraftFormatted="1";
 bubble.replaceChild(card,md);
}
function languageOf(code){
 const klass=String(code.className||"");
 const m=klass.match(/(?:lang|language)-([a-zA-Z0-9+_.#-]+)/i);
 if(m)return m[1].slice(0,26);
 const t=(code.textContent||"").trim();
 if(/^(\{[\s\S]*"[^"]+"\s*:|\[[\s\S]*\{[\s\S]*"[^"]+"\s*:)/.test(t))return "JSON";
 if(/^(?:from\s+[\w.]+\s+import|import\s+\w+|def\s+\w+\(|class\s+\w+.*:|print\(|#\s*!.*python)/m.test(t))return "Python";
 if(/^(?:import\s+.*from\s+['"]|export\s+(?:default|const|function)|(?:const|let|var)\s+|function\s+\w+\()/m.test(t))return "JavaScript";
 if(/^\s*(?:SELECT|INSERT|UPDATE|CREATE TABLE|WITH)\b/i.test(t))return "SQL";
 if(/^\s*(?:<!doctype|<html|<div|<section|<main)\b/i.test(t))return "HTML";
 if(/^\s*(?:#include\s*[<"]|int main\()/m.test(t))return "C++";
 if(/^\s*(?:body\s*\{|@media\b|\.[\w-]+\s*\{)/m.test(t))return "CSS";
 return "Code";
}
function downloadCode(code,label){
 const name=String(label).toLowerCase();
 const ext=({"python":"py","javascript":"js","typescript":"ts","json":"json","sql":"sql","html":"html","css":"css","c++":"cpp","shell":"sh","bash":"sh","go":"go","rust":"rs"})[name]||"txt";
 const blob=new Blob([String(code.textContent||"")],{type:"text/plain;charset=utf-8"});
 const url=URL.createObjectURL(blob);
 const link=C("a");link.href=url;link.download="nyx-code."+ext;
 document.body.append(link);link.click();link.remove();
 setTimeout(()=>URL.revokeObjectURL(url),1200);
}
function enhanceCode(bubble){
 for(const pre of bubble.querySelectorAll(".nx-ui4-md pre")){
  const code=pre.querySelector("code");if(!code)continue;
  if(!pre.closest(".nx-code-section")){
   const section=C("section","nx-code-section");
   const head=C("div","nx-code-bar");
   const name=languageOf(code);
   head.append(C("span","nx-code-language",name));
   const actions=C("div","nx-artifact-code-actions");
   const copy=button("Copy","Copy code",()=>copyText(code.textContent,copy),"nx-code-copy");
   const save=button("Save","Download code as a text file",()=>downloadCode(code,name),"nx-code-save");
   actions.append(copy,save);head.append(actions);
   pre.parentNode.insertBefore(section,pre);
   section.append(head,pre);
  }else{
   const section=pre.closest(".nx-code-section"),bar=section.querySelector(".nx-code-bar");
   if(bar&&!bar.querySelector(".nx-code-save")){
    const name=languageOf(code);
    const existing=bar.querySelector("span");if(existing&&existing.textContent==="Code"&&name!=="Code")existing.textContent=name;
    const save=button("Save","Download code as a text file",()=>downloadCode(code,name),"nx-code-save");
    bar.append(save);
   }
  }
  pre.dataset.nxRichCode="1";
 }
}
function enhanceTable(bubble){
 for(const wrap of bubble.querySelectorAll(".nx-ui4-table-wrap")){
  if(wrap.dataset.nxTableEnhanced)return;
  const table=wrap.querySelector("table");if(!table)continue;
  wrap.dataset.nxTableEnhanced="1";
  const shell=C("div","nx-artifact-table");
  const head=C("div","nx-artifact-table-head");
  head.append(C("span",null,"Table"));
  const copy=button("Copy table","Copy table as tab-separated values",()=>{
   const rows=[...table.querySelectorAll("tr")].map(row=>[...row.querySelectorAll("th,td")]
    .map(cell=>String(cell.textContent||"").replace(/\s+/g," ").trim().replace(/\t/g," ")));
   const safe=rows.map(row=>row.map(v=>/^[=+@-]/.test(v)?"'"+v:v).join("\t")).join("\n");
   copyText(safe,copy);
  });
  head.append(copy);
  wrap.parentNode.insertBefore(shell,wrap);
  shell.append(head,wrap);
 }
}
function enhance(){
 pending=false;
 for(const bubble of stream.querySelectorAll(".bubble.assistant")){
  if(bubble.classList.contains("nx-ui4-searching")||bubble.querySelector(".nx-ui4-bar"))continue;
  enhanceCode(bubble);
  enhanceTable(bubble);
  const md=bubble.querySelector(":scope > .nx-ui4-md");
  if(!md||bubble.dataset.nxDraftFormatted)return;
  if(md.querySelector("pre,table,.nx-ui4-table-wrap,.nx-code-section"))continue;
  const text=plaintext(md),kind=draftKind(text,previousUser(bubble));
  if(kind)makeDraft(bubble,md,kind);
 }
}
function schedule(){if(!pending){pending=true;queueMicrotask(enhance)}}
new MutationObserver(schedule).observe(stream,{childList:true,subtree:true,characterData:true});
new MutationObserver(schedule).observe(document.body,{attributes:true,attributeFilter:["data-nx-product"]});
window.nxRichMessagesV1={enhance,detect:draftKind};
schedule();
})();