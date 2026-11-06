/* NyX Website Studio card and sandboxed preview; loaded after existing chat scripts. */
(function(){
 "use strict";
 if(window.__nyxSiteStudioUI)return;
 window.__nyxSiteStudioUI=true;
 var modal=null,frame=null,wrap=null,view="desktop";
 var themes={atelier:["#f8f5ee","#bb6951"],midnight:["#10131b","#e9a0c4"],botanical:["#f3f5ed","#bc7540"],digital:["#0c1430","#83d5ff"]};
 var escapeName=s=>String(s||"website").replace(/[^\w.-]+/g,"-").replace(/^-+|-+$/g,"").slice(0,55)||"website";
 function node(tag,klass,text){var x=document.createElement(tag);if(klass)x.className=klass;if(text!==undefined)x.textContent=String(text);return x;}
 function createModal(){
  if(modal)return;
  modal=node("dialog","nxsite-dialog");modal.id="nxSitePreviewDialog";modal.setAttribute("aria-label","Website preview");
  var bar=node("div","nxsite-dialog-top");
  var name=node("div","nxsite-dialog-name","Website preview");name.id="nxSitePreviewName";
  var controls=node("div","nxsite-dialog-controls");
  var desktop=node("button","","Desktop");desktop.type="button";desktop.setAttribute("aria-label","Show desktop layout");
  var mobile=node("button","","Mobile");mobile.type="button";mobile.setAttribute("aria-label","Show mobile layout");
  var close=node("button","nxsite-dialog-close","×");close.type="button";close.setAttribute("aria-label","Close website preview");
  desktop.onclick=function(){resize("desktop")};mobile.onclick=function(){resize("mobile")};close.onclick=function(){modal.close()};
  controls.append(desktop,mobile,close);bar.append(name,controls);
  wrap=node("div","nxsite-preview-shell");frame=document.createElement("iframe");
  frame.title="Generated website in a sandboxed preview";
  frame.setAttribute("sandbox","allow-scripts");frame.referrerPolicy="no-referrer";frame.loading="lazy";
  wrap.append(frame);modal.append(bar,wrap);document.body.append(modal);
  modal.addEventListener("close",function(){frame.removeAttribute("srcdoc");view="desktop"});
  modal.addEventListener("click",function(ev){if(ev.target===modal)modal.close()});
  modal._desktop=desktop;modal._mobile=mobile;
 }
 function resize(next){
  if(!modal)return;view=next;wrap.classList.toggle("mobile",next==="mobile");
  modal._desktop.setAttribute("aria-pressed",String(next==="desktop"));
  modal._mobile.setAttribute("aria-pressed",String(next==="mobile"));
 }
 async function getHtml(message){
  if(!message||!message.websiteSpec)return null;
  var content=null;
  if(message.websiteId&&typeof window.nyxWebsiteFindBlob==="function"){
   try{var blob=await window.nyxWebsiteFindBlob(message.websiteId);if(blob)content=await blob.text()}catch(e){}
  }
  if(content)return content;
  // On a second device, regenerate the static HTML from its saved spec without a model call.
  try{
   var response=await fetch("/api/nyx/site/render",{method:"POST",headers:{"Content-Type":"application/json"},credentials:"same-origin",body:JSON.stringify({spec:message.websiteSpec})});
   if(!response.ok)throw Error("Website file could not be restored.");
   var data=await response.json();content=data.html;
   if(typeof content!=="string"||content.length>110000)throw Error("Website file was invalid.");
   if(message.websiteId&&typeof window.nyxWebsitePutBlob==="function")await window.nyxWebsitePutBlob(message.websiteId,new Blob([content],{type:"text/html"}));
   return content;
  }catch(e){if(typeof notify==="function")notify("Could not restore this website. Try regenerating it.");return null}
 }
 async function preview(message){
  createModal();
  document.getElementById("nxSitePreviewName").textContent=(message.websiteTitle||"Your website")+" · Live preview";
  resize("desktop");frame.srcdoc="<html><body style='background:#111;color:white;font:16px system-ui;padding:30px'>Loading preview…</body></html>";
  modal.showModal();
  var markup=await getHtml(message);
  if(!modal.open)return;
  if(markup)frame.srcdoc=markup;
  else frame.srcdoc="<html><body style='background:#111;color:white;font:16px system-ui;padding:30px'>Preview unavailable on this device.</body></html>";
 }
 async function save(message){
  var html=await getHtml(message);if(!html)return;
  var blob=new Blob([html],{type:"text/html;charset=utf-8"}),url=URL.createObjectURL(blob),a=document.createElement("a");
  a.href=url;a.download=escapeName(message.websiteTitle)+".html";document.body.append(a);a.click();a.remove();
  setTimeout(function(){URL.revokeObjectURL(url)},5000);
 }
 function card(message){
  var root=node("div","nxsite-result"),scheme=themes[message.websiteSpec?.theme]||themes.atelier;
  root.style.setProperty("--site-bg",scheme[0]);root.style.setProperty("--site-accent",scheme[1]);
  var top=node("div","nxsite-result-top"),eyebrow=node("span","","NYX WEBSITE STUDIO"),tag=node("span","nxsite-tag","READY TO PREVIEW");
  top.append(eyebrow,tag);
  var art=node("div","nxsite-art");
  var mock=node("div","nxsite-mock");
  var nav=node("div","nxsite-mock-nav");
  nav.append(node("strong","",(message.websiteTitle||"New website").slice(0,28)),node("span","","☰"));
  var head=node("div","nxsite-mock-head",(message.websiteSpec?.hero?.title||"A beautiful new experience").slice(0,95));
  var sub=node("div","nxsite-mock-sub",(message.websiteSpec?.hero?.text||"A beautifully made website.").slice(0,115));
  var pill=node("div","nxsite-mock-pill","Explore ↗");
  mock.append(nav,head,sub,pill);art.append(mock);
  var footer=node("div","nxsite-result-bottom");
  var title=node("div","nxsite-result-title");
  title.append(node("strong","",message.websiteTitle||"New website"),node("small","","Responsive page · HTML export · Editable in chat"));
  var buttons=node("div","nxsite-actions");
  var previewButton=node("button","nxsite-main-action","↗ Preview");
  var download=node("button","","↓ Download");
  var refine=node("button","","✎ Refine");
  for(var b of [previewButton,download,refine])b.type="button";
  previewButton.onclick=function(){void preview(message)};
  download.onclick=function(){void save(message)};
  refine.onclick=function(){
   var input=document.getElementById("prompt");if(!input)return;
   input.value="Change this website: ";input.dispatchEvent(new Event("input",{bubbles:true}));input.focus();
   if(typeof notify==="function")notify("Describe the change you want. NyX will update your website.");
  };
  buttons.append(previewButton,download,refine);footer.append(title,buttons);
  root.append(top,art,footer);return root;
 }
 function decorate(){
  try{
   var active=chats.find(x=>x.id===current);if(!active)return;
   var responses=active.messages.filter(x=>x.role==="assistant"),bubbles=document.querySelectorAll("#messages .bubble.assistant");
   bubbles.forEach(function(b,i){
    var m=responses[i];if(!m||m.kind!=="website"||!m.websiteSpec||b.querySelector(".nxsite-result"))return;
    b.append(card(m));
   });
  }catch(e){/* website decoration never blocks chat */}
 }
 if(typeof render==="function"){
  var previousRender=render;
  render=function(){previousRender();decorate()};
  decorate();
 }
})();
