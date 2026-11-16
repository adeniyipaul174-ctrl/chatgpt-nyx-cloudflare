/* NyX Website Studio. Stores complete sites in browser IndexedDB, not cloud chat. */
(function(){
 "use strict";
 if(window.nyxSiteStudio)return;
 const memory=new Map(),DB="nyx_websites_v1",STORE="sites";
 let dbPromise,current=null,editing=false;
 const byId=id=>document.getElementById(id);
 function openDB(){
  if(!("indexedDB" in window))return Promise.reject(Error("Local file storage unavailable"));
  if(!dbPromise)dbPromise=new Promise((resolve,reject)=>{
   const r=indexedDB.open(DB,1);
   r.onupgradeneeded=function(){if(!r.result.objectStoreNames.contains(STORE))r.result.createObjectStore(STORE,{keyPath:"id"})};
   r.onsuccess=function(){resolve(r.result)};r.onerror=function(){reject(r.error)}
  });
  return dbPromise;
 }
 async function put(record){
  memory.set(record.id,record);
  try{
   const db=await openDB();
   await new Promise((resolve,reject)=>{
    const tx=db.transaction(STORE,"readwrite");
    tx.objectStore(STORE).put(record);tx.oncomplete=resolve;tx.onerror=function(){reject(tx.error)};
   });
   return true;
  }catch{return false}
 }
 async function get(id){
  if(memory.has(id))return memory.get(id);
  try{
   const db=await openDB(),result=await new Promise((resolve,reject)=>{
    const r=db.transaction(STORE,"readonly").objectStore(STORE).get(id);
    r.onsuccess=function(){resolve(r.result)};r.onerror=function(){reject(r.error)};
   });
   if(result)memory.set(id,result);
   return result||null;
  }catch{return null}
 }
 async function clear(){
  memory.clear();
  try{
   const db=await openDB();
   await new Promise((resolve,reject)=>{const tx=db.transaction(STORE,"readwrite");tx.objectStore(STORE).clear();tx.oncomplete=resolve;tx.onerror=function(){reject(tx.error)}});
  }catch{}
 }
 const ui=document.createElement("section");
 ui.id="nxWebsiteStudio";
 ui.className="nx-studio-backdrop";
 ui.setAttribute("role","dialog");ui.setAttribute("aria-modal","true");ui.setAttribute("aria-label","NyX Website Studio");
 ui.setAttribute("aria-hidden","true");
 ui.innerHTML=
 '<div class="nx-studio-top"><div class="nx-studio-brand"><div class="nx-studio-logo" aria-hidden="true">✳</div><div class="nx-studio-brand-text"><strong>NyX Website Studio</strong><small>Design · Preview · Refine · Export</small></div></div>'+
 '<div class="nx-studio-toolbar"><button type="button" class="nx-studio-button active" data-nx-site-action="desktop" aria-pressed="true">Desktop</button><button type="button" class="nx-studio-button" data-nx-site-action="mobile" aria-pressed="false">Mobile</button><button type="button" class="nx-studio-button" data-nx-site-action="code" aria-pressed="false">Code</button><button type="button" class="nx-studio-button primary" data-nx-site-action="download">↓ Export</button><button type="button" class="nx-studio-button" data-nx-site-action="close" aria-label="Close website studio">✕</button></div></div>'+
 '<div class="nx-studio-main"><aside class="nx-studio-panel"><p class="nx-studio-tag">YOUR CREATIVE WORKSPACE</p><h2 id="nxStudioTitle">Your new website</h2><p class="nx-desc">Responsive, editable HTML designed around your brief. Preview it, refine the details or export the entire page.</p>'+
 '<label for="nxStudioBrief">Original website brief</label><textarea id="nxStudioBrief" maxlength="4000" readonly></textarea>'+
 '<label for="nxStudioTheme">Design direction</label><select id="nxStudioTheme"><option value="graphite">Graphite · modern & cinematic</option><option value="editorial">Editorial · warm & premium</option><option value="ocean">Ocean · futuristic & bold</option><option value="nature">Nature · calm & organic</option><option value="blush">Blush · modern & creative</option></select>'+
 '<label for="nxStudioChange">What would you like to change?</label><textarea id="nxStudioChange" maxlength="1200" placeholder="Make the headings bolder, change the copy, use a more sophisticated tone…"></textarea>'+
 '<button type="button" class="nx-studio-button primary" id="nxStudioRefine">✳ Refine website with NyX</button>'+
 '<p id="nxStudioStatus" class="nx-studio-status" role="status" aria-live="polite"></p>'+
 '<div class="nx-studio-tip"><strong>Ready-to-edit, not automatically published</strong>This is a static website draft. Real payments, databases, login and form delivery need separate setup. Replace sample contact details and licensed images before publishing.</div></aside>'+
 '<div class="nx-studio-preview-shell"><div class="nx-studio-preview-top"><div class="nx-studio-dots" aria-hidden="true"><span></span><span></span><span></span></div><span id="nxStudioViewportLabel">Live desktop preview · Sandboxed</span><span>NyX / index.html</span></div>'+
 '<div id="nxStudioViewport" class="nx-studio-viewport"><iframe id="nxStudioFrame" title="Generated website preview" sandbox="allow-scripts" referrerpolicy="no-referrer"></iframe></div>'+
 '<div id="nxStudioCode" class="nx-studio-code"><small>Editable website source. Edits are previewed in a restricted sandbox. Apply changes before exporting.</small><textarea id="nxStudioSource" spellcheck="false" aria-label="Website HTML source"></textarea><button type="button" class="nx-studio-button primary" id="nxStudioApply">Apply code to preview</button></div></div></div>'+
 '<div class="nx-studio-foot"><span>Site files are saved in this browser, not automatically hosted.</span><span>Export index.html to publish elsewhere.</span></div>';
 document.body.append(ui);
 const frame=byId("nxStudioFrame"),vp=byId("nxStudioViewport"),code=byId("nxStudioCode"),source=byId("nxStudioSource");
 const status=byId("nxStudioStatus"),refineBtn=byId("nxStudioRefine"),theme=byId("nxStudioTheme");
 const allActions=()=>Array.from(ui.querySelectorAll("[data-nx-site-action]"));
 function setStatus(text,kind){
  status.textContent=text||"";
  status.className="nx-studio-status"+(kind?" "+kind:"");
 }
 function metaPolicy(html){
  const csp='default-src \'none\'; img-src https://images.unsplash.com data:; style-src \'unsafe-inline\' https://fonts.googleapis.com; font-src https://fonts.gstatic.com data:; script-src \'unsafe-inline\'; connect-src \'none\'; form-action \'none\'; base-uri \'none\'; object-src \'none\'; frame-src \'none\'';
  const tag='<meta http-equiv="Content-Security-Policy" content="'+csp.replace(/"/g,'&quot;')+'">';
  const idx=html.toLowerCase().indexOf("<head>");
  return idx>=0?html.slice(0,idx+6)+tag+html.slice(idx+6):tag+html;
 }
 function preview(html){
  frame.srcdoc=metaPolicy(html);
  byId("nxStudioViewportLabel").textContent=vp.classList.contains("mobile")?"Live mobile preview · Sandboxed":"Live desktop preview · Sandboxed";
 }
 function slug(value){
  return String(value||"website").toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,50)||"website";
 }
 function download(record){
  const blob=new Blob([record.html],{type:"text/html;charset=utf-8"});
  const url=URL.createObjectURL(blob),a=document.createElement("a");
  a.href=url;a.download=slug(record.title)+"-website.html";
  document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),4000);
 }
 function view(mode){
  editing=mode==="code";
  code.classList.toggle("visible",editing);
  vp.style.display=editing?"none":"";
  if(editing&&current)source.value=current.html;
  for(const btn of allActions()){
   const action=btn.dataset.nxSiteAction;
   if(["desktop","mobile","code"].includes(action)){
    const active=action===mode;btn.classList.toggle("active",active);btn.setAttribute("aria-pressed",String(active));
   }
  }
  vp.classList.toggle("mobile",mode==="mobile");
  if(!editing&&current)preview(current.html);
 }
 function show(){
  ui.classList.add("open");ui.removeAttribute("aria-hidden");
  document.body.dataset.nxWebsiteStudioOpen="true";
  document.body.style.overflow="hidden";
  ui.querySelector('[data-nx-site-action="close"]').focus();
 }
 function close(){
  ui.classList.remove("open");ui.setAttribute("aria-hidden","true");
  document.body.style.overflow="";
  delete document.body.dataset.nxWebsiteStudioOpen;
  frame.srcdoc="";current=null;editing=false;
 }
 async function save(record){
  if(!record||typeof record.html!=="string"||record.html.length<500||record.html.length>150000)throw Error("Invalid website source");
  const id="nxsite_"+(crypto.randomUUID?crypto.randomUUID():Date.now()+"_"+Math.random().toString(36).slice(2));
  const entry={
   id,owner:String(window.nyxAccount?.id||"").slice(0,128),
   title:String(record.title||"Website").slice(0,90),brief:String(record.brief||"").slice(0,4000),
   html:record.html,spec:record.spec&&typeof record.spec==="object"?record.spec:null,
   theme:String(record.theme||record.spec?.theme||"graphite"),generated:record.generated===true,
   created:Date.now(),history:[]
  };
  const persistent=await put(entry);
  return {id,persistent};
 }
 async function open(id){
  const record=await get(id);
  if(!record){window.alert("This website file is unavailable on this device. Generated sites are stored in your browser. Download them for backup.");return}
  if(record.owner&&record.owner!==String(window.nyxAccount?.id||"")){window.alert("Sign in to the NyX account that created this website.");return}
  current=record;
  byId("nxStudioTitle").textContent=record.title;
  byId("nxStudioBrief").value=record.brief;
  theme.value=record.theme||"graphite";
  byId("nxStudioChange").value="";
  setStatus(record.generated?"AI-written website draft ready to customize.":"Starter website ready. AI copywriting was unavailable when this was created.","ok");
  show();view(window.innerWidth<650?"mobile":"desktop");
 }
 async function refine(){
  if(!current||refineBtn.disabled)return;
  const change=byId("nxStudioChange").value.trim();
  if(change.length<6||change.length>1200){setStatus("Describe what to change in 6–1,200 characters.","error");return}
  if(source.value!==current.html&&editing){setStatus("Apply or discard code edits before using AI refinement.","error");return}
  refineBtn.disabled=true;setStatus("NyX is refining the design and website copy…");
  try{
   const res=await fetch("/api/nyx/site/refine",{
    method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json","X-NyX-Site-Studio":"1"},
    body:JSON.stringify({prompt:current.brief,revision:change,theme:theme.value,previous:current.spec})
   });
   const result=await res.json().catch(()=>({}));
   if(!res.ok)throw Error(result.error||"Refinement failed.");
   if(typeof result.html!=="string"||result.html.length<500||result.html.length>150000)throw Error("The updated site was invalid.");
   current.history=Array.isArray(current.history)?current.history.slice(-2):[];
   current.history.push(current.html);
   current.html=result.html;current.spec=result.spec;current.theme=result.theme;
   current.generated=result.generated===true;current.title=result.title||current.title;
   const persistent=await put(current);
   byId("nxStudioTitle").textContent=current.title;
   byId("nxStudioChange").value="";
   view("desktop");
   setStatus(persistent?"Website updated and saved on this device.":"Updated for this session. Export now to keep your changes.","ok");
  }catch(e){setStatus("NyX could not refine this website: "+String(e.message||"Unknown error"),"error")}
  finally{refineBtn.disabled=false}
 }
 function renderCard(bubble,message){
  if(bubble.querySelector(".nx-site-card"))return;
  const section=document.createElement("div");
  section.className="nx-site-card";
  const art=document.createElement("div");art.className="nx-site-card-art";
  const logo=document.createElement("span");logo.textContent="✳";
  const tag=document.createElement("strong");tag.textContent="WEBSITE CREATED";
  art.append(logo,tag);
  const body=document.createElement("div");body.className="nx-site-card-body";
  const h=document.createElement("h3");h.textContent=message.websiteTitle||"Your website";
  const p=document.createElement("p");p.textContent="Responsive preview · Custom design · Editable HTML · Export-ready";
  const actions=document.createElement("div");actions.className="nx-site-card-actions";
  const previewBtn=document.createElement("button");previewBtn.type="button";previewBtn.textContent="✳ Preview & edit";
  previewBtn.addEventListener("click",()=>open(message.websiteId));
  const exportBtn=document.createElement("button");exportBtn.type="button";exportBtn.className="secondary";exportBtn.textContent="↓ Download HTML";
  exportBtn.addEventListener("click",async()=>{
   const record=await get(message.websiteId);
   if(!record){window.alert("Site file unavailable on this browser. Generate a new website to download it.");return}
   download(record);
  });
  actions.append(previewBtn,exportBtn);body.append(h,p,actions);section.append(art,body);bubble.append(section);
 }
 ui.addEventListener("click",e=>{
  if(e.target===ui){close();return}
  const button=e.target.closest("[data-nx-site-action]");
  if(!button||!ui.contains(button))return;
  const action=button.dataset.nxSiteAction;
  if(action==="close")close();
  else if(action==="download"&&current)download(current);
  else if(["desktop","mobile","code"].includes(action))view(action);
 });
 document.addEventListener("keydown",e=>{if(e.key==="Escape"&&ui.classList.contains("open")){e.stopPropagation();close()}});
 byId("nxStudioApply").addEventListener("click",async()=>{
  if(!current)return;
  const html=source.value;
  if(html.length<500||html.length>150000||!/<html[\s>]/i.test(html)||!/<body[\s>]/i.test(html)){
   setStatus("Enter a complete HTML document under 150 KB.","error");return
  }
  current.history=Array.isArray(current.history)?current.history.slice(-2):[];
  current.history.push(current.html);
  current.html=html;
  const persistent=await put(current);
  view(window.innerWidth<650?"mobile":"desktop");
  setStatus(persistent?"Code applied and saved on this device.":"Code applied for this session. Export it now.","ok");
 });
 refineBtn.addEventListener("click",refine);
 for(const id of ["nxDeleteAll","nxEraseLocal","clearAll"]){
  const el=byId(id);if(el)el.addEventListener("click",()=>{void clear()});
 }
 window.nyxSiteStudio={save,get,open,renderCard,downloadById:async id=>{const r=await get(id);if(r)download(r)},clear};
})();
