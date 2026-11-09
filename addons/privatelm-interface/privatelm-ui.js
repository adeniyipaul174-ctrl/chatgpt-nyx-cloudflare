(function(){
"use strict";
const app=document.querySelector(".app"),top=app?.querySelector(".top"),main=app?.querySelector(".main"),home=document.getElementById("home");
if(!app||!top||!main||!home||document.getElementById("plNativeNav"))return;
const svg=(d)=>'<svg viewBox="0 0 24 24" width="23" height="23" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+d+'</svg>';
const shapes={
 menu:svg('<path d="M3 8h18M3 15h12"/>'),
 edit:svg('<path d="M12 20H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9"/><path d="M16 4l4 4-9 9-4 1 1-4 8-10Z"/>'),
 chat:svg('<path d="M20.5 11.5c0 5-4.2 9-9.4 9a10 10 0 0 1-4-.8L2.5 21l1.1-4a8.6 8.6 0 0 1-1.4-4.6c0-5 4.2-9 9.3-9s9 3.4 9 8.1Z"/>'),
 work:svg('<rect x="3" y="3.5" width="7" height="7" rx="1.8"/><rect x="14" y="3.5" width="7" height="7" rx="1.8"/><rect x="3" y="14" width="7" height="7" rx="1.8"/><rect x="14" y="14" width="7" height="7" rx="1.8"/>'),
 browser:svg('<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c4.2 4.2 4.2 13.8 0 18M12 3c-4.2 4.2-4.2 13.8 0 18"/>'),
 settings:svg('<path d="M12 3l2.1 1.4 2.3-.5 1.1 2.2 2.2 1.1-.5 2.3L20.6 12l-1.4 2.1.5 2.3-2.2 1.1-1.1 2.2-2.3-.5L12 20.6l-2.1-1.4-2.3.5-1.1-2.2-2.2-1.1.5-2.3L3.4 12l1.4-2.1-.5-2.3 2.2-1.1 1.1-2.2 2.3.5L12 3Z"/><circle cx="12" cy="12" r="3"/>'),
 brand:svg('<path d="m12 2 1.9 7.1L21 11l-7.1 1.9L12 20l-1.9-7.1L3 11l7.1-1.9L12 2Z"/><path d="m19 17 .6 2.4L22 20l-2.4.6L19 23l-.6-2.4L16 20l2.4-.6L19 17Z"/>')
};
app.classList.add("pl-ui");
/* The earlier NyX PrivateLM-style shell also creates a second tab bar and
   model card. Remove those display-only duplicates, keep actual app controls. */
for(const selector of ["#nxpl-bottomnav",".nxpl-model-card",".nx-home-note"]){
  for(const element of app.querySelectorAll(selector))element.remove();
}
const oldGreetingMark=home.querySelector(".nxpl-greeting-mark");
if(oldGreetingMark){
  oldGreetingMark.innerHTML=svg('<path d="m12 2 1.9 7.1L21 11l-7.1 1.9L12 20l-1.9-7.1L3 11l7.1-1.9L12 2Z"/><path d="m19 17 .6 2.4L22 20l-2.4.6L19 23l-.6-2.4L16 20l2.4-.6L19 17Z"/>');
}

const menu=document.getElementById("menu"),newTop=document.getElementById("newTop"),newSide=document.getElementById("newSide"),sidebar=document.getElementById("sidebar");
if(menu){menu.innerHTML=shapes.menu;menu.setAttribute("aria-label","Chats");}
if(newTop){newTop.innerHTML=shapes.edit;newTop.setAttribute("aria-label","New chat");}
if(newSide){newSide.innerHTML=shapes.edit;newSide.setAttribute("aria-label","New chat");}
const headTitle=document.createElement("div");headTitle.className="pl-title";headTitle.innerHTML='<span class="pl-title-brand"><span class="pl-title-logo" aria-hidden="true">'+shapes.brand+'</span><span class="pl-title-main" id="plTitleMain">NyX</span></span>';
top.querySelector("div")?.appendChild(headTitle);
const nav=document.createElement("nav");nav.id="plNativeNav";nav.className="pl-bottom-nav";nav.setAttribute("aria-label","Main navigation");
nav.innerHTML=[["chat","Chat",shapes.chat],["work","Work",shapes.work],["browser","Browser",shapes.browser],["settings","Settings",shapes.settings]].map(([key,label,icon])=>'<button class="pl-nav-item" type="button" data-pl-page="'+key+'" aria-label="'+label+'" aria-current="'+(key==="chat"?"page":"false")+'">'+icon+'<span>'+label+'</span></button>').join("");
main.appendChild(nav);
const largeLogo=home.querySelector(".logo");if(largeLogo)largeLogo.setAttribute("aria-hidden","true");
const heading=home.querySelector("h1");
if(heading&&!home.querySelector(".pl-welcome")){
 const welcome=document.createElement("div");welcome.className="pl-welcome";
 const symbol=document.createElement("span");symbol.className="pl-welcome-symbol";symbol.setAttribute("aria-hidden","true");
 symbol.innerHTML=svg('<path d="m12 2 1.9 7.1L21 11l-7.1 1.9L12 20l-1.9-7.1L3 11l7.1-1.9L12 2Z"/><path d="m19 17 .6 2.4L22 20l-2.4.6L19 23l-.6-2.4L16 20l2.4-.6L19 17Z"/>');
 heading.parentElement?.insertBefore(welcome,heading);welcome.append(symbol,heading);
 const h=new Date().getHours();heading.textContent=(h<5?"Up late?":h<12?"Good morning,":h<17?"Good afternoon,":"Good evening,")+"\nwhat's on your mind?";
}
const sidehead=sidebar?.querySelector(".sidehead strong");if(sidehead)sidehead.textContent="Chats";
const scrim=document.createElement("div");scrim.className="pl-scrim";scrim.setAttribute("aria-hidden","true");main.appendChild(scrim);
function closeSidebar(){sidebar?.classList.remove("open");scrim.classList.remove("active")}
scrim.addEventListener("click",closeSidebar);
menu?.addEventListener("click",()=>requestAnimationFrame(()=>scrim.classList.toggle("active",!!sidebar?.classList.contains("open"))));
sidebar?.addEventListener("click",event=>{if(event.target?.closest?.("#newSide,.chatrow button:first-child"))requestAnimationFrame(closeSidebar)});
document.addEventListener("keydown",event=>{if(event.key==="Escape")closeSidebar()});
function stage(){return document.body.dataset.nxStage==="work"?"work":"chat"}
function active(key){for(const btn of nav.querySelectorAll("button")){const sel=btn.dataset.plPage===key;btn.classList.toggle("active",sel);btn.setAttribute("aria-current",sel?"page":"false")}const title=document.getElementById("plTitleMain");if(title)title.textContent=key==="work"||key==="browser"?"NyX Work":"NyX";}
nav.addEventListener("click",event=>{const b=event.target?.closest?.("[data-pl-page]");if(!b)return;const k=b.dataset.plPage;closeSidebar();if(k==="chat"){document.getElementById("nxTabChat")?.click();active("chat");}else if(k==="work"){document.getElementById("nxTabWork")?.click();active("work");}else if(k==="browser"){document.getElementById("nxTabWork")?.click();if(typeof window.nxEnterWork==="function")window.nxEnterWork("Open your browser for me to control",true);else{const field=document.getElementById("nxWorkPrompt");if(field){field.value="Open your browser for me to control";field.dispatchEvent(new Event("input",{bubbles:true}));}}active("browser");}else if(k==="settings"){document.getElementById("settingsTop")?.click();active("settings");}});
new MutationObserver(()=>{if(document.getElementById("nxSettings")?.open){active("settings");return;}const current=stage();const selected=nav.querySelector(".pl-nav-item.active")?.dataset.plPage;if(selected!==current&&selected!=="browser")active(current);if(selected==="browser"&&current!=="work")active(current)}).observe(document.body,{attributes:true,attributeFilter:["data-nx-stage"]});
active(stage());
const settingsModal=document.getElementById("nxSettings");settingsModal?.addEventListener("close",()=>active(stage()));
const aboutPane=document.querySelector('#nxSettings [data-nx-pane="about"]')||document.getElementById("about");
if(aboutPane&&!aboutPane.querySelector("#plAttribution")){
 const note=document.createElement("p");note.id="plAttribution";
 note.style.cssText="font-size:12px;color:#8e8e93;line-height:1.6;padding:6px 0";
 const link=document.createElement("a");link.href="https://github.com/orailnoor/cross-platform-llm-client";
 link.target="_blank";link.rel="noopener noreferrer";link.textContent="PrivateLM (MIT)";
 note.append("Interface adaptation based on ",link,". © Original contributors.");
 aboutPane.appendChild(note);
}
})();