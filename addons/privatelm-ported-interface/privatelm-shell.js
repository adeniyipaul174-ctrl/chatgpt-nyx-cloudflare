/* NyX PrivateLM interface shell. Reparents existing bound elements only.
   No API calls, model changes, storage changes or synthetic chat messages. */
(function(){
 "use strict";
 if(document.getElementById("nxpl-bottomnav"))return;
 const byId=id=>document.getElementById(id);
 const main=document.querySelector(".app .main");
 const top=document.querySelector(".app .top");
 const sidebar=byId("sidebar");
 const sidehead=sidebar?.querySelector(".sidehead");
 const menu=byId("menu");
 const newTop=byId("newTop");
 const newSide=byId("newSide");
 const home=byId("home");
 if(!main||!top||!sidebar||!menu||!newTop||!newSide||!home)return;
 menu.innerHTML='<span class="nxpl-sidebar-glyph" aria-hidden="true"><span></span><span></span></span>';
 menu.setAttribute("aria-label","Chats");
 const pencil='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 5H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-6"/><path d="m15.5 5.5 3-3a2.12 2.12 0 0 1 3 3l-10 10-4 1 1-4 10-10"/></svg>';
 newTop.innerHTML=pencil;newTop.setAttribute("aria-label","New chat");
 sidehead.querySelector("strong").textContent="Chats";
 sidehead.appendChild(newSide);
 newSide.innerHTML=pencil;newSide.setAttribute("aria-label","New chat");
 const about=byId("about");
 if(about&&!about.querySelector("#nxpl-source-credit")){
  const credit=document.createElement("p");credit.id="nxpl-source-credit";
  credit.appendChild(document.createTextNode("Interface adapted from PrivateLM (MIT) · "));
  const a=document.createElement("a");a.href="https://github.com/orailnoor/cross-platform-llm-client";
  a.textContent="Source and license";a.target="_blank";a.rel="noopener noreferrer";
  credit.appendChild(a);about.appendChild(credit);
 }
 const icon={
   chat:'<path d="M21 11.4a8.8 8.8 0 0 1-9.3 8.5 9.8 9.8 0 0 1-3.5-.8L3 21l1.9-5a8.5 8.5 0 1 1 16.1-4.6Z"/>',
   work:'<rect x="3" y="6" width="18" height="15" rx="2"/><path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M3 11h18M10 11v2h4v-2"/>',
   browser:'<circle cx="12" cy="12" r="9"/><path d="M3.5 12h17M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18"/>',
   settings:'<path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z"/><path d="m19.3 12 .8-1.7-2-2.9-1.9.1-.9-1.6-3.3-.4-.9 1.6-1.8-.2-2.4 2.4.1 2-1.5.9v3.3l1.6.8-.1 1.9 2.4 2.4 1.9-.2.9 1.6h3.2l.9-1.6 1.9.2 2.4-2.4-.2-1.9 1.6-.9v-3.2Z" transform="translate(0 -1) scale(.97)"/>'
 };
 const items=[["chat","Chat"],["work","Work"],["browser","Browser"],["settings","Settings"]];
 const nav=document.createElement("nav");nav.className="nxpl-bottomnav";nav.id="nxpl-bottomnav";
 nav.setAttribute("aria-label","Main navigation");
 const svg=body=>'<svg viewBox="0 0 24 24" aria-hidden="true">'+body+'</svg>';
 for(const [key,label] of items){
   const button=document.createElement("button");button.type="button";button.dataset.section=key;
   button.innerHTML=svg(icon[key])+"<span>"+label+"</span>";
   button.setAttribute("aria-label",label);
   button.setAttribute("aria-selected",key==="chat"?"true":"false");
   button.addEventListener("click",()=>{
     if(key==="chat"){activeWorkSection="work";byId("nxTabChat")?.click();}
     if(key==="work"){activeWorkSection="work";byId("nxTabWork")?.click();}
     if(key==="browser"){
       byId("nxTabWork")?.click();activeWorkSection="browser";
       if(typeof window.nxEnterWork==="function")window.nxEnterWork("Open your browser for me to control",true);
     }
     if(key==="settings"){settingsOpen=true;byId("settingsTop")?.click();}
     refresh();
   });
   nav.appendChild(button);
 }
 main.appendChild(nav);
 const model=document.createElement("div");model.className="nxpl-model-card";
 model.innerHTML='<span class="nxpl-model-symbol" aria-hidden="true">'+svg(icon.browser)+'</span><span class="nxpl-model-meta"><strong>NyX Cloud AI</strong><span>Llama 4 Scout · Cloud model</span></span><span class="nxpl-model-status">Cloud</span>';
 model.setAttribute("aria-label","NyX cloud language model");
 home.prepend(model);
 const greeting=document.createElement("div");greeting.className="nxpl-greeting";
 const mark=document.createElement("div");mark.className="nxpl-greeting-mark";mark.textContent="N";mark.setAttribute("aria-hidden","true");
 const h=document.createElement("h1");h.className="nxpl-greeting-title";h.textContent="What's on your mind?";
 greeting.append(mark,h);
 const suggest=home.querySelector(".suggest");
 if(suggest)home.insertBefore(greeting,suggest);else home.appendChild(greeting);
 const hour=new Date().getHours();const time=hour<5?"Up late?":hour<12?"Good morning,":hour<17?"Good afternoon,":"Good evening,";
 h.textContent=time+"\nwhat's on your mind?";
 const prompt=byId("prompt");if(prompt)prompt.placeholder="Ask anything";
 const workPrompt=byId("nxWorkPrompt");if(workPrompt)workPrompt.placeholder="Ask anything";
 let activeWorkSection="work";let settingsOpen=false;
 const refresh=()=>{
   const stage=settingsOpen?"settings":document.body.dataset.nxStage==="work"?activeWorkSection:"chat";
   for(const button of nav.querySelectorAll("button")){
     const selected=button.dataset.section===stage;
     button.setAttribute("aria-selected",selected?"true":"false");
   }
 };
 const observer=new MutationObserver(refresh);observer.observe(document.body,{attributes:true,attributeFilter:["data-nx-stage"]});
 byId("nxTabChat")?.addEventListener("click",refresh);
 byId("settings")?.addEventListener("close",()=>{settingsOpen=false;refresh()});
 byId("nxTabWork")?.addEventListener("click",refresh);
 refresh();
})();