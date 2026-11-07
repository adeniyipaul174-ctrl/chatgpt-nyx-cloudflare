// NyX Site Recovery v4: genuine files/navigation/editing when AI quota is exhausted.
// Uses distinct code layouts per industry; never claims AI produced a fallback page.
const NR_PHOTOS={creative:'photo-1600607687920-4e2a09cf159d',tech:'photo-1498050108023-c5249f4df085',food:'photo-1517248135467-4c7edcad34c4',fashion:'photo-1483985988355-763728e1935b',wellness:'photo-1544367567-0f2fcb009e0b',travel:'photo-1476514525535-07fb3b4ae5f1',education:'photo-1497633762265-9d179a990aa',finance:'photo-1497366754035-f200968a6e72'};
const nrText=(x,n=300)=>String(x??'').replace(/[\u0000-\u001f\u007f]/g,' ').replace(/<[^>]*>/g,'').trim().slice(0,n);
const nrEsc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const nrSlug=x=>String(x||'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,32)||'page';
const nrColor=(v,d)=>/^#[a-f0-9]{6}$/i.test(v||'')?v.toLowerCase():d;
export function nrCategory(plan){
 const s=String([plan.industry,plan.artDirection,plan.brief].join(' ')).toLowerCase();
 if(/saas|software|technology|developer|cyber|data platform|ai app|dashboard/.test(s))return 'tech';
 if(/restaurant|cafe|coffee|bakery|dining|catering|chef|food/.test(s))return 'food';
 if(/fashion|clothing|jewelry|jewellery|lookbook|boutique|beauty/.test(s))return 'fashion';
 if(/wellness|retreat|therapy|spa|yoga|skincare|pilates/.test(s))return 'wellness';
 if(/travel|hotel|resort|tourism|holiday|destination/.test(s))return 'travel';
 if(/education|academy|school|tutor|learning|course/.test(s))return 'education';
 if(/finance|accounting|legal|insurance|fintech|investment/.test(s))return 'finance';
 return 'creative';
}
function nrCss(plan,category){
 const p=plan.palette||{},bg=nrColor(p.background,'#f7f4ef'),ink=nrColor(p.text,'#25282a'),accent=nrColor(p.accent,'#aa624b'),surface=nrColor(p.surface,'#eee9e3'),muted=nrColor(p.muted,'#70787b');
 const photo='https://images.unsplash.com/'+NR_PHOTOS[category]+'?auto=format&fit=crop&w=1500&q=82';
 const base=':root{--bg:'+bg+';--ink:'+ink+';--accent:'+accent+';--surface:'+surface+';--muted:'+muted+';--photo:url('+photo+')}'+
 '*,:before,:after{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.75 Arial,system-ui,sans-serif;max-width:100%;overflow-x:clip}main{overflow:clip}a{color:inherit}a:focus-visible{outline:3px solid var(--accent);outline-offset:3px}h1,h2,h3{letter-spacing:-.055em;line-height:1.12}'+
 '.hero{position:relative;display:grid;grid-template-columns:1.1fr .9fr;align-items:center;gap:5vw;padding:clamp(60px,7vw,110px) clamp(20px,5vw,80px)}.copy{max-width:850px}.eyebrow{font:800 11px/1.4 Arial;letter-spacing:.17em;text-transform:uppercase;color:var(--accent)}h1{font-size:clamp(45px,6.5vw,100px);margin:23px 0 25px;overflow-wrap:anywhere}'+
 '.copy p{font-size:clamp(15px,1.5vw,18px);max-width:600px;color:var(--muted);line-height:1.9}.photo{min-height:450px;background:var(--photo) center/cover,var(--surface);border-radius:22px;box-shadow:0 25px 65px #0002}.button{display:inline-block;margin-top:20px;padding:15px 24px;background:var(--accent);color:var(--bg);text-decoration:none;border-radius:90px;font-size:13px;font-weight:800}'+
 '.block{padding:clamp(65px,8vw,115px) clamp(20px,5vw,80px)}.block:nth-of-type(odd){background:var(--surface)}.block>div{max-width:1250px;margin:auto}.block h2{font-size:clamp(34px,4.5vw,64px);margin:15px 0}.intro{max-width:750px;color:var(--muted);margin-bottom:32px}.grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:17px}.tile{padding:clamp(23px,3vw,40px);border-radius:17px;background:var(--bg);border:1px solid color-mix(in srgb,var(--ink) 13%,transparent);min-width:0}.tile small{font-weight:800;color:var(--accent)}.tile h3{font-size:clamp(22px,2.3vw,30px);margin:22px 0 12px}.tile p{color:var(--muted);font-size:14px;line-height:1.8}'+
 '.end{padding:clamp(80px,8vw,120px) clamp(20px,5vw,80px);background:var(--ink);color:var(--bg)}.end h2{font-size:clamp(40px,5vw,72px);max-width:840px}.end p{max-width:680px}.end .button{background:var(--bg);color:var(--ink)}footer{padding:30px 5vw;font-size:12px;color:var(--muted)}'+
 '@media(max-width:720px){.hero{grid-template-columns:1fr!important;gap:26px;padding:65px 20px}.photo{min-height:320px}.grid{grid-template-columns:1fr!important}.block{padding:65px 20px}h1{font-size:clamp(41px,10vw,66px)}.end{padding:75px 20px}}@media(max-width:390px){h1{font-size:41px}.photo{min-height:280px}}@media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}*,*:before,*:after{animation:none!important;transition:none!important}}';
 const variants={
 creative:'.hero h1,.block h2{font-family:Georgia,serif;font-weight:500}.photo{min-height:560px;border-radius:210px 210px 15px 15px}.tile{border-radius:3px;border-left:4px solid var(--accent)}.block:nth-of-type(even){background:var(--ink);color:var(--bg)}.block:nth-of-type(even) .tile{background:var(--surface);color:var(--ink)}@media(max-width:720px){.photo{min-height:380px}}',
 tech:'.hero{background:radial-gradient(circle at 75% 35%,color-mix(in srgb,var(--accent) 28%,transparent),transparent 45%)}.hero h1{font:850 clamp(51px,6.5vw,95px)/1.04 Arial,sans-serif}.photo{min-height:390px;clip-path:polygon(0 0,100% 10%,93% 100%,7% 92%);border-radius:0}.grid{grid-template-columns:repeat(2,minmax(0,1fr))}.tile{background:color-mix(in srgb,var(--bg) 87%,var(--accent));border:1px solid var(--accent);border-radius:11px}.eyebrow{font-family:monospace}@media(max-width:720px){.grid{grid-template-columns:1fr}}',
 food:'.hero{min-height:620px;display:flex;align-items:end;background:linear-gradient(to top,#13150eec,transparent),var(--photo) center/cover;color:#fff;border-radius:0 0 45px 45px}.hero .copy{max-width:850px}.hero h1{font-family:Georgia,serif;font-weight:400}.hero p,.hero .eyebrow{color:#fff}.hero .photo{display:none}.hero .button{background:#fff;color:#222}.grid{grid-template-columns:repeat(2,minmax(0,1fr))}.tile{border-radius:3px}.block h2{font-family:Georgia,serif}@media(max-width:720px){.grid{grid-template-columns:1fr}}',
 fashion:'body{font-family:Arial,sans-serif}.hero{grid-template-columns:.82fr 1.18fr}.hero h1{text-transform:uppercase;font-size:clamp(56px,8vw,125px);line-height:.92;font-weight:900;letter-spacing:-.09em}.photo{min-height:640px;border-radius:0}.tile{border:0;border-top:3px solid var(--accent);border-radius:0;box-shadow:none}.block h2{text-transform:uppercase;font-weight:900}@media(max-width:720px){.photo{min-height:420px}}',
 wellness:'.hero{gap:7vw}.hero h1,.block h2{font-family:Georgia,serif;font-weight:400}.photo{border-radius:48% 48% 18px 18px;min-height:560px}.tile{background:var(--surface);border:0;border-radius:30px}.grid{gap:23px}@media(max-width:720px){.photo{min-height:350px}}',
 travel:'.hero{min-height:690px;display:flex;align-items:center;background:linear-gradient(90deg,#071d30d8,transparent 95%),var(--photo) center/cover;color:#fff}.hero h1{font-family:Georgia,serif;font-weight:500}.hero .copy{max-width:940px}.hero p,.hero .eyebrow{color:#fff}.hero .photo{display:none}.hero .button{background:#fff;color:#0c2533}.tile{border-radius:25px}',
 education:'.hero h1{font-weight:900}.photo{border-radius:35px 160px 35px 35px}.tile{border-radius:19px;border:2px solid var(--surface)}.tile:nth-child(even){background:var(--surface)}',
 finance:'.hero h1{font-family:Arial,sans-serif;font-weight:800}.photo{min-height:485px;border-radius:13px}.tile{border-radius:9px;border:1px solid color-mix(in srgb,var(--ink) 20%,transparent)}.block:nth-of-type(odd){background:var(--surface)}'
 };
 return base+variants[category];
}
function nrHead(plan,page){
 const quoted=[...String(plan.brief||'').matchAll(/["“]([^"”]{12,110})["”]/g)].map(m=>m[1]);
 return page.slug==='index'&&quoted.length?quoted[0]:page.title;
}
export function nxRescuePageRaw(plan,page){
 const category=nrCategory(plan),name=nrEsc(plan.brand),title=nrEsc(nrHead(plan,page));
 const pageName=nrEsc(page.title),industry=nrEsc(plan.industry||'independent studio');
 const summary=nrEsc(page.purpose||'Explore this page and learn more about the work.');
 const goto=plan.pages.some(p=>p.slug==='contact')?'contact.html':'#connect';
 const heads=page.sections?.length?page.sections.slice(0,6).map(x=>nrText(x,90)).filter(Boolean):['Explore','Our approach','Get in touch'];
 while(heads.length<3)heads.push(['Explore more','Thoughtful details','Next steps'][heads.length]||'Learn more');
 const blocks=heads.map((h,i)=>{
  const label=nrEsc(h),id=nrSlug(h);
  const cards=[label,'What matters','Next steps'].map((item,j)=>{
   const p=j===0?'Explore '+h.toLowerCase()+' through a practical, thoughtful experience.':j===1?'See how '+plan.brand+' approaches this work with attention to the details.':'Connect to discuss the next step for your specific project.';
   return '<article class="tile"><small>0'+(j+1)+'</small><h3>'+nrEsc(item)+'</h3><p>'+nrEsc(p)+'</p></article>';
  }).join('');
  return '<section class="block" id="'+id+'"><div><span class="eyebrow">'+pageName+' / 0'+(i+1)+'</span><h2>'+label+'</h2><p class="intro">'+summary+'</p><div class="grid">'+cards+'</div></div></section>';
 }).join('');
 const css=nrCss(plan,category);
 return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="description" content="'+nrEsc(nrText(page.purpose||'',150))+'"><title>'+pageName+' | '+name+'</title><style>'+css+'</style></head><body>'+
 '<main><section class="hero" id="home"><div class="copy"><span class="eyebrow">'+pageName+' / '+industry+'</span><h1>'+title+'</h1><p>'+summary+'</p><a class="button" href="'+goto+'">Explore more ↗</a></div><div class="photo" role="img" aria-label="Photography representing '+industry+'"></div></section>'+blocks+
 '<section class="end" id="connect"><div><span class="eyebrow">NEXT STEPS</span><h2>Continue with '+name+'.</h2><p>Explore the other pages and connect when you are ready to share your ideas.</p><a class="button" href="'+goto+'">Get in touch ↗</a></div></section></main>'+
 '<footer>© '+new Date().getUTCFullYear()+' '+name+'. Presentation-only site; configure real services before publishing.</footer></body></html>';
}
function nrEdit(html,prompt,plan,page){
 const p=String(prompt||''),lower=p.toLowerCase();let next=html;
 const roles={background:/(?:background|bg|base)\s*(?:color|colour)?\s*(?:to|as|is|:)?\s*(#[a-f0-9]{6})/i,
 text:/(?:text|font)\s*(?:color|colour)?\s*(?:to|as|is|:)?\s*(#[a-f0-9]{6})/i,
 accent:/(?:accent|primary)\s*(?:color|colour)?\s*(?:to|as|is|:)?\s*(#[a-f0-9]{6})/i};
 let revised=false;
 for(const [key,rx] of Object.entries(roles)){const m=p.match(rx);if(m){const name={background:'--bg',text:'--ink',accent:'--accent'}[key];next=next.replace(new RegExp('('+name+':)#[a-f0-9]{6}','i'),'$1'+m[1].toLowerCase());revised=true;}}
 if(/dark|midnight|night mode/.test(lower)&&!revised){next=next.replace(/--bg:#[a-f0-9]{6}/i,'--bg:#101725').replace(/--ink:#[a-f0-9]{6}/i,'--ink:#f6f7fb').replace(/--surface:#[a-f0-9]{6}/i,'--surface:#263248');revised=true;}
 const match=p.match(/(?:add|insert|create|design|put|include)\s+(?:a|an|the|some|new)?\s*([a-z0-9 &-]{2,60}?)\s+(?:section|gallery|banner|cards|images|design)\b/i);
 if(match||/add.{0,40}(?:section|gallery|cards|design)/i.test(p)){
  const label=nrText(match?.[1]||'New design section',60),slug=nrSlug(label);
  const cards=['Discover','Explore','Contact'].map((t,i)=>'<article class="tile"><small>0'+(i+1)+'</small><h3>'+nrEsc(t+' '+label)+'</h3><p>'+nrEsc('Develop this '+label.toLowerCase()+' for '+plan.brand+' to support your project goals.')+'</p></article>').join('');
  const section='<section class="block" id="'+slug+'"><div><span class="eyebrow">NEW SECTION</span><h2>'+nrEsc(label)+'</h2><p class="intro">'+nrEsc(nrText(p,260))+'</p><div class="grid">'+cards+'</div></div></section>';
  next=next.replace(/<section class="end"/i,section+'<section class="end"');revised=true;
 }
 const remove=p.match(/(?:remove|delete)\s+(?:the\s+)?([a-z0-9 &-]{2,60}?)\s+section/i);
 if(remove){const slug=nrSlug(remove[1]);next=next.replace(new RegExp('<section class="block" id="'+slug+'"[\\s\\S]*?<\\/section>','i'),'');revised=true;}
 if(!revised){const section='<section class="block" id="custom-changes"><div><span class="eyebrow">DESIGN UPDATE</span><h2>'+nrEsc(page.title)+' — revised</h2><p class="intro">'+nrEsc(nrText(p,290))+'</p></div></section>';next=next.replace(/<section class="end"/i,section+'<section class="end"');}
 return next;
}
export function nxRescueBuild(prompt,previous,api){
 const safe=api.safeInput(previous);
 if(!safe){
  const plan=api.fallbackPlan(prompt,null),files=plan.pages.map(page=>({path:page.slug+'.html',html:api.finish(nxRescuePageRaw(plan,page),plan,page.slug)}));
  return nrResult(api.result({version:3,plan,files,revision:1},'create_project'),'created',files.length);
 }
 const project={version:3,plan:structuredClone(safe.plan),files:safe.files.map(f=>({...f})),revision:Math.max(safe.revision||1,1)+1};
 const op=api.operation(prompt,project);
 if(op.action==='add_page'){
  if(project.plan.pages.length>=7)throw Error('Maximum seven pages per project.');
  const slug=nrSlug(op.target||op.title);if(project.plan.pages.some(p=>p.slug===slug))throw Error('That page already exists.');
  const page={slug,title:nrText(op.title||'New Page',55),purpose:nrText(prompt,260),design:'Individual page layout',sections:['Introduction','Explore '+(op.title||'Page'),'More information']};
  project.plan.pages.push(page);project.files.push({path:slug+'.html',html:api.finish(nxRescuePageRaw(project.plan,page),project.plan,slug)});
  return nrResult(api.result(api.relink(project),'add_page'),'added',project.files.length);
 }
 if(op.action==='remove_page'||op.action==='rename_page'){
  const target=api.pageFor(project.plan,op.target);
  if(!target||target.slug==='index')throw Error('Select a valid page other than Home.');
  const file=project.files.find(f=>f.path===target.slug+'.html');if(!file)throw Error('The page is missing.');
  if(op.action==='remove_page'){project.plan.pages=project.plan.pages.filter(x=>x!==target);project.files=project.files.filter(x=>x!==file);}
  else{const slug=nrSlug(op.title);if(project.plan.pages.some(x=>x.slug===slug))throw Error('Page name already exists.');target.slug=slug;target.title=nrText(op.title,50);file.path=slug+'.html';}
  return nrResult(api.result(api.relink(project),op.action),op.action==='remove_page'?'removed':'renamed',project.files.length);
 }
 if(op.action==='global_redesign'){
  const hex=[...String(prompt).matchAll(/#[a-f0-9]{6}\b/gi)].map(x=>x[0].toLowerCase());
  if(hex.length>=3){project.plan.palette.background=hex[0];project.plan.palette.text=hex[1];project.plan.palette.accent=hex[2];}
  else if(/dark|midnight|black/i.test(prompt))Object.assign(project.plan.palette,{background:'#101725',text:'#f4f6fa',accent:'#bda9ff',surface:'#243047',muted:'#a8b6c8'});
  else if(/light|bright/i.test(prompt))Object.assign(project.plan.palette,{background:'#f8f7f3',text:'#202729',accent:'#337c85',surface:'#e8edec',muted:'#687d81'});
  project.files=project.plan.pages.map(page=>({path:page.slug+'.html',html:api.finish(nxRescuePageRaw(project.plan,page),project.plan,page.slug)}));
  return nrResult(api.result(api.relink(project),'global_redesign'),'redesigned',project.files.length);
 }
 const target=api.pageFor(project.plan,op.target)||project.plan.pages[0];
 const index=project.files.findIndex(f=>f.path===target.slug+'.html');if(index<0)throw Error('The selected page file is missing.');
 const html=nrEdit(project.files[index].html,prompt,project.plan,target);
 project.files[index]={path:target.slug+'.html',html:api.finish(html,project.plan,target.slug)};
 return nrResult(api.result(api.relink(project),'edit_page'),'edited',project.files.length);
}
function nrResult(result,action,count){
 result.siteSpec={...result.siteSpec,engine:'local-recovery-v4'};
 result.reply='Website AI providers are temporarily out of free capacity. NyX '+action+' a '+count+'-page editable website project with locally generated designs, real navigation and a ZIP export. This recovery mode does not provide full AI-level customization. Real checkout, forms and databases require separate integrations.';
 return result;
}
