/* NyX Code: secure and copyable fenced code, without HTML injection. */
(function(){
"use strict";
const container=document.getElementById("messages");
if(!container||window.nxCodeFormatter)return;
let queued=false;
const ticks=String.fromCharCode(96,96,96);
function renderCode(bubble){
 if(!bubble||bubble.dataset.nxCodeFormatted==="yes")return;
 if(document.body.dataset.nxProduct!=="code")return;
 if(bubble.querySelector("img,.nx-search-results,.nx-site-card"))return;
 const raw=bubble.textContent||"";
 if(!raw.includes(ticks))return;
 const fence=new RegExp(ticks+"([a-zA-Z0-9_.+#-]{0,35})[ \\t]*\\r?\\n([\\s\\S]*?)"+ticks,"g");
 let match,at=0,count=0,parts=[];
 while((match=fence.exec(raw))&&count<24){
  if(match.index>at)parts.push({kind:"text",value:raw.slice(at,match.index)});
  parts.push({kind:"code",language:match[1]||"Code",value:match[2]});
  at=fence.lastIndex;count++;
 }
 if(!count)return;
 if(at<raw.length)parts.push({kind:"text",value:raw.slice(at)});
 const frag=document.createDocumentFragment();
 for(const part of parts){
  if(part.kind==="text"){const div=document.createElement("div");div.className="nx-code-text";div.textContent=part.value;frag.append(div);continue}
  const section=document.createElement("section");section.className="nx-code-section";
  const bar=document.createElement("div");bar.className="nx-code-bar";
  const lang=document.createElement("span");lang.textContent=part.language.slice(0,32);
  const button=document.createElement("button");button.type="button";button.className="nx-code-copy";button.textContent="Copy";
  button.setAttribute("aria-label","Copy code");
  const pre=document.createElement("pre"),code=document.createElement("code");code.textContent=part.value.trimEnd();pre.append(code);
  button.addEventListener("click",async()=>{try{await navigator.clipboard.writeText(code.textContent);button.textContent="Copied";setTimeout(()=>button.textContent="Copy",1300)}catch{button.textContent="Select code"}});
  bar.append(lang,button);section.append(bar,pre);frag.append(section);
 }
 bubble.dataset.nxCodeFormatted="yes";bubble.replaceChildren(frag);
}
function update(){
 queued=false;
 if(document.body.dataset.nxProduct!=="code")return;
 for(const bubble of container.querySelectorAll(".bubble.assistant"))renderCode(bubble);
}
function schedule(){if(!queued){queued=true;queueMicrotask(update)}}
new MutationObserver(schedule).observe(container,{childList:true,subtree:true,characterData:true});
new MutationObserver(schedule).observe(document.body,{attributes:true,attributeFilter:["data-nx-product"]});
window.nxCodeFormatter={render:renderCode};schedule();
})();