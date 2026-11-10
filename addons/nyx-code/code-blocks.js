/* NyX Code v2: enhance the existing safe Markdown renderer's code blocks.
 * Do not replace the global Markdown parser, trusted UI, or assistant text.
 */
(function(){
"use strict";
const container=document.getElementById("messages");
if(!container||window.nxCodeFormatterV2)return;
let pending=false;
function makeBar(code){
 const bar=document.createElement("div");bar.className="nx-code-bar";
 const language=document.createElement("span");
 const klass=String(code?.className||"");
 const match=klass.match(/(?:language|lang)-([A-Za-z0-9_+#.-]{1,28})/);
 language.textContent=match?match[1]:"Code";
 const button=document.createElement("button");button.type="button";button.className="nx-code-copy";
 button.textContent="Copy";button.setAttribute("aria-label","Copy code block");
 button.addEventListener("click",async ()=>{
  try{
   await navigator.clipboard.writeText(code?.textContent||"");
   button.textContent="Copied";
  }catch{button.textContent="Select code"}
  setTimeout(()=>{if(button.isConnected)button.textContent="Copy"},1300);
 });
 bar.append(language,button);return bar;
}
function enhance(){
 pending=false;
 if(document.body.dataset.nxProduct!=="code")return;
 for(const bubble of container.querySelectorAll(".bubble.assistant")){
  for(const pre of bubble.querySelectorAll(".nx-ui4-md pre")){
   if(pre.dataset.nxCodeEnhanced==="1")continue;
   const code=pre.querySelector("code");if(!code)continue;
   pre.dataset.nxCodeEnhanced="1";
   const wrap=document.createElement("section");wrap.className="nx-code-section";
   pre.parentNode.insertBefore(wrap,pre);
   wrap.append(makeBar(code),pre);
  }
 }
}
function schedule(){if(!pending){pending=true;queueMicrotask(enhance)}}
new MutationObserver(schedule).observe(container,{subtree:true,childList:true,characterData:true});
new MutationObserver(schedule).observe(document.body,{attributes:true,attributeFilter:["data-nx-product"]});
window.nxCodeFormatterV2={enhance};schedule();
})();