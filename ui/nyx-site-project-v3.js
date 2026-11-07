/* NyX Site Projects v3: real linked pages, page editor and full ZIP export.
   All projects are stored in existing NyX IndexedDB blobs, not a fake backend. */
const nxLegacySiteOpen=nxSiteOpen, nxLegacySiteCard=nxSiteAddCard;
function nxProjectIsEdit(prompt){
 const raw=String(prompt||'').trim().toLowerCase();
 const p=raw.replace(/^(?:(?:hey\s+nyx[,! ]*|please\s+|can\s+you\s+|could\s+you\s+|would\s+you\s+|i\s+want\s+(?:you\s+)?to\s+|i\s+need\s+(?:you\s+)?to\s+|now\s+|also\s+)+)/,'');
 if(!p||raw.length>4000)return false;
 if(/^(?:create|build|design|generate|make)\s+(?:a|an|another|new)\s+(?:(?:completely\s+)?new\s+|completely\s+)?(?:website|web\s*site|landing\s*page)\s+(?:for|about|called)/.test(p))return false;
 return /^(?:please\s+)?(?:add|create|build|design|generate|change|edit|update|replace|remove|delete|rename|redo|revise|rework|improve|fix|make|switch|put|insert|include|move|rearrange|modify|redesign|give|use|turn)\s+/.test(p)||
 /(?:on|in|to)\s+(?:the\s+)?(?:home|about|services|pricing|contact|portfolio|shop|gallery|products|faq)\s+page/.test(p);
}
async function nxProjectPrevious(chat,prompt){
 if(!nxProjectIsEdit(prompt))return null;
 const recent=chat?.messages?.slice(0,-1).reverse().find(m=>m.kind==='website'&&m.siteId&&m.siteSpec);
 if(!recent)return null;
 const blob=await findBlob(recent.siteId);
 if(!blob)return null;
 try{
  const data=await blob.text();
  if(recent.siteSpec.version===3){
   const project=JSON.parse(data);
   if(project.version===3&&Array.isArray(project.files)&&project.files.length&&project.files.length<=7)return project;
   return null;
  }
  // Upgrade an older one-file website when the user asks to edit or add a page.
  if(data.length<250000&&/<!doctype html/i.test(data)){
   const brand=String(recent.siteSpec.brand||'My Website').slice(0,60);
   const dp=recent.siteSpec.designPlan||{};
   const palette=dp.palette||{background:'#ffffff',text:'#222222',accent:'#666666',surface:'#eeeeee',muted:'#777777'};
   return {version:3,revision:1,plan:{version:3,brand,industry:dp.industry||'business',artDirection:dp.concept||dp.visualConcept||'Existing design',
    designSystem:'Preserve the existing design unless explicitly asked to change it',palette,
    displayFont:dp.headingFont||'Georgia',bodyFont:dp.bodyFont||'Arial',
    pages:[{slug:'index',title:'Home',purpose:'Original homepage',design:'Preserve existing page layout',sections:[]}],
    brief:'Continue this website without replacing its existing pages.'},files:[{path:'index.html',html:data}]};
  }
 }catch(e){console.warn('NyX could not restore prior website project',e)}
 return null;
}
function nxProjectCRC(bytes){
 let crc=-1;
 for(const byte of bytes){crc^=byte;for(let i=0;i<8;i++)crc=(crc>>>1)^((crc&1)?0xedb88320:0)}
 return (crc^(-1))>>>0;
}
function nxProjectZip(project){
 const encoder=new TextEncoder();
 const all=[...project.files.map(f=>({path:f.path,content:f.html})),{path:'README.txt',content:'NyX Site Studio project\n\nOpen index.html in a browser or upload all .html files together to a static web host.\n\nEach page uses relative navigation links. Fonts and Unsplash images may require internet access.\nReal payments, bookings, databases and form delivery need separate integrations.\n'}];
 const chunks=[],central=[];let offset=0;
 const u16=(view,p,n)=>view.setUint16(p,n,true),u32=(view,p,n)=>view.setUint32(p,n>>>0,true);
 for(const file of all){
  if(!/^[a-z0-9-]{1,32}\.html$|^README\.txt$/.test(file.path))throw Error('Invalid website filename');
  const filename=encoder.encode(file.path),content=encoder.encode(file.content),crc=nxProjectCRC(content);
  const h=new Uint8Array(30+filename.length),v=new DataView(h.buffer);
  u32(v,0,0x04034b50);u16(v,4,20);u16(v,6,0x800);u16(v,8,0);u16(v,10,0);u16(v,12,0);
  u32(v,14,crc);u32(v,18,content.length);u32(v,22,content.length);u16(v,26,filename.length);u16(v,28,0);
  h.set(filename,30);chunks.push(h,content);
  const c=new Uint8Array(46+filename.length),w=new DataView(c.buffer);
  u32(w,0,0x02014b50);u16(w,4,20);u16(w,6,20);u16(w,8,0x800);u16(w,10,0);
  u16(w,12,0);u16(w,14,0);u32(w,16,crc);u32(w,20,content.length);u32(w,24,content.length);
  u16(w,28,filename.length);u16(w,30,0);u16(w,32,0);u16(w,34,0);u16(w,36,0);u32(w,38,0);u32(w,42,offset);
  c.set(filename,46);central.push(c);offset+=h.length+content.length;
 }
 const centralSize=central.reduce((n,b)=>n+b.length,0);
 const tail=new Uint8Array(22),view=new DataView(tail.buffer);
 u32(view,0,0x06054b50);u16(view,4,0);u16(view,6,0);u16(view,8,all.length);u16(view,10,all.length);
 u32(view,12,centralSize);u32(view,16,offset);u16(view,20,0);
 return new Blob([...chunks,...central,tail],{type:'application/zip'});
}
function nxProjectPreviewHtml(html,session,hash){
 if(/<\s*(?:script|iframe|object|embed|form|svg)\b|\son[a-z]{3,24}\s*=|javascript\s*:/i.test(html))throw Error('Unsafe HTML cannot be previewed.');
 const code="document.addEventListener('click',function(e){var a=e.target.closest('a[href]');if(!a)return;var h=a.getAttribute('href');if(/^[a-z0-9-]+[.]html(?:#[a-z0-9_-]+)?$/i.test(h)){e.preventDefault();parent.postMessage({type:'nyx-project-go',nonce:'"+session+"',path:h},'*')}});";
 const csp="default-src 'none'; img-src https://images.unsplash.com data:; font-src https://fonts.gstatic.com; style-src 'unsafe-inline' https://fonts.googleapis.com; script-src 'nonce-"+session+"'; connect-src 'none'; form-action 'none'; base-uri 'none'";
 const meta='<meta http-equiv="Content-Security-Policy" content="'+csp+'"><script nonce="'+session+'">'+code+'<\/script>';
 return html.replace(/<\/head>/i,meta+'</head>');
}
async function nxProjectOpen(message){
 if(message.siteSpec?.version!==3)return nxLegacySiteOpen(message);
 const data=message.siteId?await findBlob(message.siteId):null;
 if(!data){notify('Website files are unavailable on this device. Open the original chat on the device where you created them or regenerate.');return}
 let project;try{project=JSON.parse(await data.text())}catch{}
 if(!project||project.version!==3||!Array.isArray(project.files)||!project.files.length){notify('The saved website project is incomplete.');return}
 const pages=project.plan.pages,files=new Map(project.files.map(f=>[f.path,f.html]));
 if(!files.has('index.html')){notify('Homepage not found in website project.');return}
 const overlay=document.createElement('section');overlay.className='nx-site-overlay nx-project-overlay';overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-label','Website project preview');
 const toolbar=document.createElement('div');toolbar.className='nx-site-toolbar nx-project-toolbar';
 const left=document.createElement('div');left.className='nx-site-toolbar-left';
 const emblem=document.createElement('span');emblem.className='nx-site-card-icon';emblem.textContent='▣';
 const names=document.createElement('div'),title=document.createElement('strong'),caption=document.createElement('small');
 title.textContent=project.plan.brand;caption.textContent=pages.length+' working pages · NyX Site Studio';names.append(title,caption);left.append(emblem,names);
 const controls=document.createElement('div');controls.className='nx-site-toolbar-right';
 const pageSelector=document.createElement('select');pageSelector.className='nx-project-pages';pageSelector.setAttribute('aria-label','Choose website page');
 for(const p of pages){const option=document.createElement('option');option.value=p.slug+'.html';option.textContent=p.title;pageSelector.append(option)}
 const desktop=document.createElement('button'),phone=document.createElement('button'),download=document.createElement('button'),edit=document.createElement('button'),add=document.createElement('button'),close=document.createElement('button');
 desktop.textContent='Desktop';phone.textContent='Phone';download.textContent='↓ ZIP';edit.textContent='✎ Edit page';add.textContent='+ Page';close.textContent='×';close.className='nx-site-close';close.setAttribute('aria-label','Close website preview');
 controls.append(pageSelector,desktop,phone,download,edit,add,close);toolbar.append(left,controls);
 const canvas=document.createElement('div');canvas.className='nx-site-canvas';canvas.dataset.device='desktop';
 const frame=document.createElement('iframe');frame.className='nx-site-frame';frame.title='Isolated website page preview';
 frame.setAttribute('sandbox','allow-scripts');frame.setAttribute('referrerpolicy','no-referrer');
 canvas.append(frame);
 const note=document.createElement('div');note.className='nx-site-note';note.textContent='All pages are real separate HTML files. Export ZIP to publish them together. Forms and payments need a configured backend.';
 overlay.append(toolbar,canvas,note);document.body.append(overlay);
 const session=Math.random().toString(36).slice(2)+Date.now().toString(36);
 let current='index.html';
 const show=(path)=>{
  const [file,hash='']=path.split('#');
  if(!files.has(file))return;
  current=file;pageSelector.value=file;
  frame.srcdoc=nxProjectPreviewHtml(files.get(file),session,hash);
 };
 const messageHandler=e=>{
  if(e.source!==frame.contentWindow||e.data?.type!=='nyx-project-go'||e.data?.nonce!==session||typeof e.data?.path!=='string')return;
  show(e.data.path);
 };
 window.addEventListener('message',messageHandler);
 pageSelector.onchange=()=>show(pageSelector.value);
 const mode=(which)=>{
  canvas.dataset.device=which;
  desktop.setAttribute('aria-pressed',String(which==='desktop'));
  phone.setAttribute('aria-pressed',String(which==='phone'));
 };
 desktop.onclick=()=>mode('desktop');phone.onclick=()=>mode('phone');mode('desktop');
 download.onclick=()=>{
  const blob=nxProjectZip(project),url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download=(project.plan.brand||'nyx-site').toLowerCase().replace(/[^a-z0-9]+/g,'-').slice(0,48)+'.zip';
  document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);
 };
 const previousFocus=document.activeElement;
 const dismiss=()=>{overlay.remove();window.removeEventListener('message',messageHandler);document.removeEventListener('keydown',key);previousFocus?.focus?.()};
 const key=e=>{if(e.key==='Escape')dismiss()};
 close.onclick=dismiss;
 edit.onclick=()=>{const p=pages.find(p=>p.slug+'.html'===current);dismiss();input.value='Edit the '+(p?.title||'Home')+' page: ';input.focus();input.setSelectionRange(input.value.length,input.value.length)};
 add.onclick=()=>{dismiss();input.value='Create a new page called ';input.focus();input.setSelectionRange(input.value.length,input.value.length)};
 document.addEventListener('keydown',key);
 show('index.html');close.focus();
}
nxSiteOpen=nxProjectOpen;
nxSiteAddCard=function(message,bubble){
 if(message.siteSpec?.version!==3)return nxLegacySiteCard(message,bubble);
 if(message.kind!=='website'||!message.siteId||bubble.querySelector('.nx-site-card'))return;
 const box=document.createElement('section');box.className='nx-site-card nx-project-card';
 const head=document.createElement('div');head.className='nx-site-card-head';
 const icon=document.createElement('span');icon.className='nx-site-card-icon';icon.textContent='▣';
 const details=document.createElement('div');details.className='nx-site-card-text';
 const title=document.createElement('strong');title.textContent=message.siteSpec.brand||'Your website project';
 const subtitle=document.createElement('small');subtitle.textContent=(message.siteSpec.pages?.length||1)+' linked pages · Editable design · ZIP export';
 details.append(title,subtitle);head.append(icon,details);
 const actions=document.createElement('div');actions.className='nx-site-actions';
 const preview=document.createElement('button');preview.className='nx-site-action';preview.textContent='↗ Open website';preview.onclick=()=>nxSiteOpen(message);
 const edit=document.createElement('button');edit.className='nx-site-action secondary';edit.textContent='✎ Edit';
 edit.onclick=()=>{input.value='Edit the Home page: ';input.focus()};
 const add=document.createElement('button');add.className='nx-site-action secondary';add.textContent='+ Add page';
 add.onclick=()=>{input.value='Create a new page called ';input.focus()};
 actions.append(preview,edit,add);box.append(head,actions);bubble.append(box);
};
nxSiteRevisionPayload=nxProjectPrevious;
