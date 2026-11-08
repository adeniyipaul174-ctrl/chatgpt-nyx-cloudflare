/* NyX Chat + Work controller. Ordinary Chat remains default with its original tools untouched. */
(function(){
"use strict";
const $=id=>document.getElementById(id);
const chatTab=$("nxTabChat"),workTab=$("nxTabWork"),pane=$("nxWorkPane"),workForm=$("nxWorkForm"),input=$("nxWorkPrompt"),feed=$("nxWorkFeed"),welcome=$("nxWorkWelcome"),scroll=$("nxWorkScroll");
if(!chatTab||!workTab||!pane||!workForm||!input||!feed)return;
const native=$("nxChatAgentMode"),picker=$("nxModePicker"),slot=$("nxWorkAgentSlot");
if(picker&&slot)slot.appendChild(picker);
const browser=$("nxWorkBrowser"),screenshot=$("nxWorkScreenshot"),shotNote=$("nxWorkPreviewNote"),browserStatus=$("nxWorkBrowserStatus"),take=$("nxWorkTakeover"),resume=$("nxWorkResume"),stop=$("nxWorkStop"),refresh=$("nxWorkRefresh"),liveLink=$("nxWorkLiveLink"),address=$("nxWorkAddress"),browserGo=$("nxWorkGo"),keyboard=$("nxWorkKeyboard"),keyboardForm=$("nxWorkType");
let stage="chat",busy=false,stopping=false,session=null,workAgent="team",workHistory=[],imageUrl=null,screenshotBusy=false;
const storage="nyx_work_chat_v1_"+String(window.nyxAccount?.id||"device");
try{const data=JSON.parse(sessionStorage.getItem(storage)||"[]");if(Array.isArray(data))workHistory=data.filter(x=>["user","assistant"].includes(x.role)&&typeof x.content==="string").slice(-20)}catch{}
function save(){try{sessionStorage.setItem(storage,JSON.stringify(workHistory.slice(-20)))}catch{}}
function chatAgent(mode){if(!native)return;native.value=mode;native.dispatchEvent(new Event("change",{bubbles:true}))}
function setStage(next){
 stage=next==="work"?"work":"chat";document.body.dataset.nxStage=stage;
 const on=stage==="work";
 chatTab.classList.toggle("active",!on);workTab.classList.toggle("active",on);chatTab.setAttribute("aria-selected",String(!on));workTab.setAttribute("aria-selected",String(on));
 pane.hidden=!on;
 if(on){chatAgent(workAgent);try{document.getElementById("sidebar")?.classList.remove("open")}catch{};if(!session)refreshBrowser(false);input.focus({preventScroll:true});}
 else{if(native&&native.value!=="off")workAgent=native.value;chatAgent("off");}
}
window.nxEnterWork=function(task,submit=false){setStage("work");if(typeof task==="string"&&task.trim())input.value=task.trim().slice(0,4000);if(submit&&input.value.trim())workForm.requestSubmit();};
chatTab.addEventListener("click",()=>setStage("chat"));workTab.addEventListener("click",()=>setStage("work"));
if(native)native.addEventListener("change",()=>{if(stage==="work")workAgent=native.value});
document.addEventListener("click",event=>{if(event.target.closest("#newSide,#newTop")&&stage==="work")setStage("chat")},true);
const escapeURL=value=>{try{const u=new URL(value);return u.protocol==="https:"?u.href:null}catch{return null}};
function bubble(role,value,record=true){
 const div=document.createElement("div");div.className="nx-wmessage "+(role==="user"?"user":role==="error"?"error":role==="status"?"status":"assistant");div.textContent=String(value||"");
 feed.appendChild(div);welcome.hidden=true;scroll.scrollTop=scroll.scrollHeight;
 if(record&&(role==="user"||role==="assistant")){workHistory.push({role,content:String(value||"")});workHistory=workHistory.slice(-20);save()}
 return div;
}
function note(text){const element=bubble("status",text,false);return {element,finish(message,role="assistant"){element.className="nx-wmessage "+role;element.textContent=message;if(role==="assistant"){workHistory.push({role:"assistant",content:message});workHistory=workHistory.slice(-20);save()}scroll.scrollTop=scroll.scrollHeight}}}
workHistory.forEach(msg=>{const div=document.createElement("div");div.className="nx-wmessage "+msg.role;div.textContent=msg.content;feed.appendChild(div)});
if(workHistory.length)welcome.hidden=true;
function browserIntent(q){
 const value=String(q||"").toLowerCase();
 return /\b(?:browser|chrome|visit|navigate|click|browse|webpage|web page|website|web site|open (?:a |the |your )?(?:tab|site|page|url))\b/.test(value)
 || /^\s*(?:open|go to)\s+(?!a file|my file|my notes|the settings)\S+/i.test(value)
 || /\b(?:find|search|look up|research)\b.{0,80}\b(?:online|on the web|on a website|in browser|on a site)\b/.test(value)
 || /\b(?:https:\/\/|www\.)\S+/.test(value);
}
function wantsManual(q){return /\b(?:for me to control|take over|manual(?:ly)?|i will control|let me control|let me browse|just open (?:a|the|your) browser|open your browser for me)\b/i.test(q)}
async function call(path,payload,method="POST"){
 const opts={method,credentials:"same-origin",cache:"no-store",headers:method==="GET"?{}:{"Content-Type":"application/json"},body:method==="GET"?undefined:JSON.stringify(payload||{})};
 const response=await fetch("/api/nyx/ai-browser/"+path,opts);
 let body;try{body=await response.json()}catch{throw Error("NyX could not read the browser service response.")}
 if(!response.ok)throw Error(body.error||("Browser request failed: "+response.status));
 return body;
}
function updateBrowserState(state){
 const s=state?.session||null;session=s;
 if(!s){browser.hidden=true;liveLink.hidden=true;if(imageUrl){URL.revokeObjectURL(imageUrl);imageUrl=null}screenshot.hidden=true;return}
 browser.hidden=false;const url=s.viewUrl;
 if(typeof url==="string"&&url.startsWith("https://live.browser.run/")){liveLink.href=url;liveLink.hidden=false}else{liveLink.hidden=true}
 browserStatus.textContent=s.paused?"Paused — manual control":s.pageUrl||"NyX is browsing…";
 take.disabled=!!s.paused;resume.disabled=!s.paused;stop.disabled=false;
 if(s.task)address.placeholder="https://example.com";
 scroll.scrollTop=scroll.scrollHeight;
}
async function refreshBrowser(shouldPreview=true){
 try{const s=await call("status",null,"GET");updateBrowserState(s);if(s.session&&shouldPreview)await loadPreview();}
 catch(e){if(stage==="work")bubble("error",e.message,false)}
}
async function loadPreview(){
 if(screenshotBusy||!session?.active)return;screenshotBusy=true;
 try{
  const response=await fetch("/api/nyx/ai-browser/preview",{cache:"no-store",credentials:"same-origin"});
  if(!response.ok)throw Error("Screenshot not ready");
  const blob=await response.blob();if(blob.size<40)throw Error("Empty browser image");
  const url=URL.createObjectURL(blob);const prior=imageUrl;imageUrl=url;
  screenshot.src=url;screenshot.hidden=false;shotNote.hidden=true;
  if(prior)URL.revokeObjectURL(prior)
 }catch(e){if(screenshot.hidden){shotNote.hidden=false;shotNote.textContent="Browser preview is unavailable. Select Open live browser above to control Chrome."}}
 finally{screenshotBusy=false}
}
let running=false;
async function runBrowser(){
 if(running)return;running=true;stopping=false;
 const progress=note("NyX is navigating the browser…");
 for(let i=0;i<12&&running&&session?.active&&!session?.paused&&!stopping;i++){
  try{
   const step=await call("step");
   const msg=String(step.action?.note||step.action?.description||step.action?.action||"Browser step finished");
   progress.element.textContent="NyX Work · "+msg;
   if(step.pageUrl)browserStatus.textContent=step.pageUrl;
   await loadPreview();
   if(step.done){progress.finish("NyX browser: "+msg);await refreshBrowser(false);break}
   if(i===11){progress.finish("NyX reached the 12-step browser limit. Take over to continue.");await refreshBrowser(false);break}
   await new Promise(resolve=>setTimeout(resolve,220));
  }catch(error){progress.finish("Browser task interrupted: "+error.message,"error");await refreshBrowser(false);break}
 }
 running=false;
}
async function openBrowserTask(text){
 const s=await call("status",null,"GET");updateBrowserState(s);
 const manual=wantsManual(text);
 if(!s.session){
  if(!s.canStart)throw Error("The free browser cannot start another session now. Cloudflare's time allowance or NyX's daily launch limit may have been reached.");
  if(!window.confirm("Open a free cloud browser? Cloudflare allows 10 shared browser-minutes per day. NyX limits this run to 2 minutes, with one launch per UTC day. Continue?"))return;
  const started=await call("start",{task:text,confirmFreeLimit:true});session=started.session;updateBrowserState({session});
 }else if(!manual){
  await call("task",{task:text});
  await call("resume");session.paused=false;updateBrowserState({session})
 }
 await loadPreview();
 if(manual){await call("pause");session.paused=true;updateBrowserState({session});bubble("assistant","The browser is open for your control. Tap the preview to interact, use the address bar, or select Open live browser.",true)}
 else{bubble("assistant","Browser task started. NyX will show each action and pause for approval when needed.",true);runBrowser()}
}
async function runAgentTask(task){
 const mode=native?.value&&native.value!=="off"?native.value:"team";
 const history=workHistory.filter(x=>["user","assistant"].includes(x.role)).slice(-15).map(m=>({role:m.role,content:m.content}));
 if(history.length===0||history.at(-1).role!=="user")history.push({role:"user",content:task});
 const response=await fetch("/api/nyx",{method:"POST",credentials:"same-origin",cache:"no-store",headers:{"Content-Type":"application/json"},body:JSON.stringify({messages:history,agentMode:mode,autoTools:true,style:"detailed",showSources:true,quality:"realistic"})});
 if(!response.ok){let body={};try{body=await response.json()}catch{}throw Error(body.error||"Work AI request failed")}
 const type=response.headers.get("content-type")||"";
 if(type.startsWith("image/")){const blob=await response.blob(),url=URL.createObjectURL(blob),div=bubble("assistant","NyX generated an image. Tap to view.",true),img=document.createElement("img");img.src=url;img.alt="Work-generated image";div.appendChild(img);return null}
 const result=await response.json();
 const reply=typeof result.reply==="string"?result.reply:typeof result.error==="string"?result.error:result.kind==="website"?"NyX created website project data. Open the original Chat workspace to view or edit the full website project.":JSON.stringify(result).slice(0,3000);
 if(Array.isArray(result.sources)&&result.sources.length){const box=bubble("assistant",reply,true);for(const src of result.sources.slice(0,6)){const target=escapeURL(src.url);if(!target)continue;const a=document.createElement("a");a.href=target;a.target="_blank";a.rel="noopener noreferrer";a.textContent=src.title||target;box.appendChild(a)}return null}
 return reply;
}
workForm.addEventListener("submit",async event=>{
 event.preventDefault();const text=input.value.trim();if(!text||busy)return;busy=true;$("nxWorkSend").disabled=true;
 bubble("user",text,true);input.value="";
 const browserTask=browserIntent(text);
 try{
  if(browserTask)await openBrowserTask(text);
  else{const pending=note("NyX Agents are working…");try{const answer=await runAgentTask(text);if(answer!==null)pending.finish(answer)}catch(e){pending.finish(e.message,"error")}}
 }catch(e){bubble("error",e.message,false)}
 finally{busy=false;$("nxWorkSend").disabled=false}
});
async function takeControl(){if(!session)return;stopping=true;running=false;try{await call("pause");await refreshBrowser();bubble("assistant","NyX is paused. You can tap the preview or use Open live browser.",false)}catch(e){bubble("error",e.message,false)}}
take.addEventListener("click",takeControl);
resume.addEventListener("click",async()=>{if(!session)return;try{await call("resume");await refreshBrowser();runBrowser()}catch(e){bubble("error",e.message,false)}});
stop.addEventListener("click",async()=>{if(!session)return;stopping=true;running=false;try{await call("stop");await refreshBrowser(false);bubble("assistant","Browser session stopped.",false)}catch(e){bubble("error",e.message,false)}});
refresh.addEventListener("click",()=>{refreshBrowser()});
browserGo.addEventListener("submit",async e=>{e.preventDefault();if(!session)return;try{if(!session.paused)await takeControl();const url=address.value.trim();const result=await call("navigate",{url});browserStatus.textContent=result.note||"Opened website";await loadPreview()}catch(e){bubble("error",e.message,false)}});
keyboardForm.addEventListener("submit",async e=>{e.preventDefault();if(!session)return;try{if(!session.paused)await takeControl();await call("type",{text:keyboard.value.slice(0,350)});keyboard.value="";await loadPreview()}catch(e){bubble("error",e.message,false)}});
screenshot.addEventListener("click",async e=>{if(!session?.paused){bubble("status","Select Take control before clicking the browser.",false);return}const r=screenshot.getBoundingClientRect();if(!r.width||!r.height)return;try{await call("tap",{x:Math.min(1,Math.max(0,(e.clientX-r.left)/r.width)),y:Math.min(1,Math.max(0,(e.clientY-r.top)/r.height))});await new Promise(resolve=>setTimeout(resolve,260));await loadPreview()}catch(error){bubble("error",error.message,false)}});
document.querySelectorAll("[data-nx-work]").forEach(button=>button.addEventListener("click",()=>{
 const role=button.dataset.nxWork;
 if(role==="browser"){input.value="Open your browser for me to control";input.focus()}
 else if(role==="agents"){chatAgent("team");input.value="Use your agent team to plan and complete this task: ";input.focus()}
 else{chatAgent("coder");input.value="Use the coding agent to ";input.focus()}
}));
const params=new URLSearchParams(location.search);if(params.get("work")==="1")setStage("work");
})();
