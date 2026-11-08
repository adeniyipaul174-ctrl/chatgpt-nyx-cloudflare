(function(){
"use strict";
const form=document.getElementById("nxWorkForm"),input=document.getElementById("nxWorkPrompt"),send=document.getElementById("nxWorkSend");
if(!form||!input||!send)return;
/* Keep the original submit handler and id. Only improve presentation. */
const label=send.querySelector(".nx-wk-run-label");
function grow(){
 input.style.height="auto";
 input.style.height=Math.min(160,Math.max(54,input.scrollHeight))+"px";
}
function update(){
 if(label)label.textContent=send.disabled?"Working…":"Run task";
 send.setAttribute("aria-busy",send.disabled?"true":"false");
}
input.addEventListener("input",grow,{passive:true});
form.addEventListener("submit",()=>requestAnimationFrame(grow));
new MutationObserver(update).observe(send,{attributes:true,attributeFilter:["disabled"]});
update();grow();
})();