(function(){
"use strict";
const menu=document.getElementById("nxModeMenu");
const trigger=document.getElementById("nxModeTrigger");
const picker=document.getElementById("nxModePicker");
if(!menu||!trigger||!picker)return;
/* Keep the original picker and option handlers. Only the menu is portaled. */
if(menu.parentElement!==document.body)document.body.appendChild(menu);
/* The existing global outside-click listener must not close the portaled menu
   when a user touches an option within it. */
menu.addEventListener("pointerdown",function(e){e.stopPropagation()});
function place(){
 if(menu.hidden||document.body.dataset.nxStage!=="work")return;
 const r=trigger.getBoundingClientRect();if(r.width<10||r.height<10)return;
 const vw=window.visualViewport?.width||window.innerWidth;
 const vh=window.visualViewport?.height||window.innerHeight;
 const width=Math.min(326,Math.max(220,vw-24));
 const left=Math.max(12,Math.min(r.left,vw-width-12));
 const topSafe=Math.max(70,Math.min(90,vh*.12));
 const height=Math.max(110,Math.min(420,r.top-topSafe-12));
 const top=Math.max(topSafe,r.top-height-11);
 menu.style.setProperty("--nx-menu-left",Math.round(left)+"px");
 menu.style.setProperty("--nx-menu-top",Math.round(top)+"px");
 menu.style.setProperty("--nx-menu-width",Math.round(width)+"px");
 menu.style.setProperty("--nx-menu-height",Math.round(height)+"px");
}
trigger.addEventListener("click",function(){requestAnimationFrame(place)});
document.getElementById("nxTabChat")?.addEventListener("click",function(){menu.hidden=true;trigger.setAttribute("aria-expanded","false")});
document.getElementById("nxTabWork")?.addEventListener("click",function(){requestAnimationFrame(place)});
window.addEventListener("resize",place,{passive:true});
window.visualViewport?.addEventListener("resize",place,{passive:true});
document.getElementById("nxWorkScroll")?.addEventListener("scroll",place,{passive:true});
})();