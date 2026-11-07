// NyX Site Projects v3. Projects contain real standalone linked HTML pages.
// There is no shared fixed page template, no forced palette, no fake backend.
const NX_PROJECT_ASSETS=[
'photo-1600607687920-4e2a09cf159d','photo-1497366754035-f200968a6e72','photo-1524758631624-e2822e304c36',
'photo-1517248135467-4c7edcad34c4','photo-1552566626-52f8b828add9','photo-1483985988355-763728e1935b',
'photo-1490481651871-ab68de25d43d','photo-1476514525535-07fb3b4ae5f1','photo-1500534623283-312aade485b7',
'photo-1544367567-0f2fcb009e0b','photo-1518611012118-696072aa579a','photo-1498050108023-c5249f4df085',
'photo-1556761175-b413da4baf72','photo-1497633762265-9d179a990aa','photo-1495446815901-a7297e633e8d',
'photo-1558655146-9f40138edfeb','photo-1600566753190-17f0baa2a6c3'
];
const NX_PROJECT_COLORS=['background','text','accent','surface','muted'];
const nxProjText=(x,n=200)=>typeof x==='string'?x.replace(/[\u0000-\u001f\u007f]/g,' ').trim().slice(0,n):'';
const nxProjEsc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const nxProjHex=(x,def)=>/^#[0-9a-f]{6}$/i.test(x||'')?x.toLowerCase():def;
const nxProjSlug=s=>String(s||'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,32)||'page';
function nxProjParse(str){
 const s=typeof str==='string'?str:'';
 const a=s.indexOf('{'),b=s.lastIndexOf('}');
 if(a<0||b<=a||b-a>16000)throw Error('NyX could not complete its website plan.');
 try{const obj=JSON.parse(s.slice(a,b+1));if(!obj||Array.isArray(obj)||typeof obj!=='object')throw 0;return obj}
 catch{throw Error('The website plan was invalid. Please retry.')}
}
const nxProjReply=r=>r?.response||r?.choices?.[0]?.message?.content||'';
function nxProjUserColors(brief){
 const values=[...new Set((brief.match(/#[0-9a-f]{6}\b/gi)||[]).map(x=>x.toLowerCase()))].slice(0,8);
 const roles={};
 for(const [role,rx] of Object.entries({
  background:/(?:background|base|canvas)\s*(?:color|colour)?\s*(?::|is|of|in)?\s*(#[0-9a-f]{6})/i,
  text:/(?:text|typography|foreground)\s*(?:color|colour)?\s*(?::|is|of|in)?\s*(#[0-9a-f]{6})/i,
  accent:/(?:accent|highlight|primary)\s*(?:color|colour)?\s*(?::|is|of|in)?\s*(#[0-9a-f]{6})/i,
  surface:/(?:secondary|surface)\s*(?:background|color|colour)?\s*(?::|is|of|in)?\s*(#[0-9a-f]{6})/i
 })){const m=brief.match(rx);if(m)roles[role]=m[1].toLowerCase()}
 return {values,roles};
}
function nxProjectExplicitBrand(brief){
 const str=String(brief||'');
 const name='([A-Z][A-Za-z0-9&.\u2019\\x27-]{1,24}(?:\\s+[A-Z][A-Za-z0-9&.\u2019\\x27-]{1,24}){0,5})';
 for(const prefix of ['(?:called|named|brand name)\\s*[:=]?\\s*','for\\s+']){
  const rx=new RegExp('\\b'+prefix+'[\"“]?'+name+'[\"”]?(?=\\s*[,.;:]|\\s*$)');
  const match=rx.exec(str);if(match&&match[1]&&match[1].length<=64)return match[1].trim();
 }
 return '';
}
export function nxProjectNormalizePlan(raw,brief='',previous=null){
 const o=raw&&typeof raw==='object'&&!Array.isArray(raw)?raw:{};
 const prev=previous?.plan||{};
 const rawPages=Array.isArray(o.pages)?o.pages:[];
 const pages=rawPages.slice(0,7).map((x,i)=>({
  slug:nxProjSlug(x?.slug||x?.title||('page-'+i)),
  title:nxProjText(x?.title,65)||'Page '+(i+1),
  purpose:nxProjText(x?.purpose,340)||'A distinctive, informative page aligned with the business.',
  design:nxProjText(x?.design||x?.composition,380)||'Purposeful bespoke layout',
  sections:(Array.isArray(x?.sections)?x.sections:[]).slice(0,9).map(v=>nxProjText(v?.title||v,85)).filter(Boolean)
 }));
 if(pages.length<1)throw Error('NyX did not plan any website pages.');
 const seen=new Set();
 for(const p of pages){if(seen.has(p.slug))p.slug=nxProjSlug(p.slug+'-'+(seen.size+1));seen.add(p.slug)}
 const home=pages.find(p=>p.slug==='index'||p.slug==='home')||pages[0];
 home.slug='index';
 const rest=pages.filter(p=>p!==home);
 const ordered=[home,...rest];
 if(new Set(ordered.map(x=>x.slug)).size!==ordered.length)throw Error('Website page names are duplicated.');
 const palette={};
 const provided=nxProjUserColors(brief),rawPalette=o.palette||{};
 const defaults={background:'#f8f6f0',text:'#202329',accent:'#ae6c4f',surface:'#ede7df',muted:'#69717b'};
 for(const key of NX_PROJECT_COLORS)palette[key]=nxProjHex(rawPalette[key],nxProjHex(prev.palette?.[key],defaults[key]));
 for(const [key,value] of Object.entries(provided.roles))palette[key]=value;
 // Only when roles aren't named do we interpret an ordered three-color brief.
 if(!Object.keys(provided.roles).length&&provided.values.length>=3){
  palette.background=provided.values[0];palette.text=provided.values[1];palette.accent=provided.values[2];
 }
 return {
  version:3,brand:nxProjectExplicitBrand(brief)||nxProjText(prev.brand,64)||nxProjText(o.brand,64)||'Untitled Studio',
  industry:nxProjText(o.industry,120)||nxProjText(prev.industry,120),
  artDirection:nxProjText(o.artDirection||o.visualConcept,1100)||nxProjText(prev.artDirection,1100),
  designSystem:nxProjText(o.designSystem,900)||nxProjText(prev.designSystem,900),
  displayFont:nxProjText(o.displayFont,80)||nxProjText(prev.displayFont,80)||'Georgia',
  bodyFont:nxProjText(o.bodyFont,80)||nxProjText(prev.bodyFont,80)||'Arial',
  palette,requestedColors:provided.values,
  pages:ordered,brief:nxProjText(brief,4000)
 };
}
export function nxProjectIntent(prompt,hasProject=false){
 const p=String(prompt||'').trim().toLowerCase();
 if(!p||p.length>4000)return false;
 if(/^(?:generate|create|draw|render|design|make)\s+(?:an?\s+)?(?:image|picture|photo|screenshot|mockup)\s+(?:of|showing)\s+/.test(p))return false;
 if(hasProject){
  if(/^(?:build|create|design|make|generate)\s+(?:a|an|another|new)\s+(?:(?:completely\s+)?new\s+|completely\s+)?(?:website|web\s*site|landing\s*page)\s+(?:for|about|called)\s+/.test(p))return false;
  return /^(?:please\s+)?(?:add|create|build|design|generate|change|edit|update|replace|remove|delete|rename|redo|revise|rework|improve|fix|make|switch|put|insert|include|move|rearrange|modify|redesign|give|use|turn)\s+/.test(p)||/(?:on|in|to)\s+(?:the\s+)?(?:home|about|services|pricing|contact|portfolio|shop|gallery|products|faq)\s+page/.test(p);
 }
 return /\b(?:create|build|develop|design|generate|make|launch)\b[\s\S]{0,110}\b(?:website|web\s*site|webpage|landing\s*page|online\s*store)\b/i.test(p);
}
function nxProjectSafeInput(obj){
 if(!obj||typeof obj!=='object'||obj.version!==3||!Array.isArray(obj.files)||!Array.isArray(obj.plan?.pages))return null;
 if(obj.files.length<1||obj.files.length>7)return null;
 const files=obj.files.map(f=>({path:nxProjText(f?.path,48),html:typeof f?.html==='string'?f.html:''}));
 if(files.some(f=>!/^([a-z0-9-]{1,32}\.html)$/.test(f.path)||f.html.length<500||f.html.length>130000))return null;
 if(files.reduce((s,f)=>s+f.html.length,0)>620000)return null;
 if(new Set(files.map(f=>f.path)).size!==files.length)return null;
 return {version:3,plan:obj.plan,files,revision:Number(obj.revision)||0};
}
function nxProjectAllowedLink(href,plan){
 if(/^#[a-z0-9_-]*$/i.test(href))return true;
 if(/^[a-z0-9-]{1,32}\.html(?:#[a-z0-9_-]+)?$/i.test(href))return plan.pages.some(p=>p.slug+'.html'===href.split('#')[0]);
 if(/^mailto:[\w.%+-]+@[\w.-]+\.[a-z]{2,}$/i.test(href))return plan.brief.includes(href.slice(7));
 if(/^https:\/\/[^\s"'<>]+$/i.test(href))return plan.brief.includes(href);
 return false;
}
export function nxProjectValidateHtml(html,plan){
 const errors=[];
 if(typeof html!=='string'||html.length<2800||html.length>135000)errors.push('website HTML is incomplete or oversized');
 if(!/<html\b[^>]*lang=/i.test(html))errors.push('document language missing');
 if(!/<head\b/i.test(html)||!/<body\b/i.test(html)||!/<\/html>/i.test(html))errors.push('incomplete HTML document');
 if(!/<meta[^>]+name=["']viewport["']/i.test(html))errors.push('mobile viewport missing');
 if(!/<style\b/i.test(html)||!/@media\s*(?:screen\s+and\s*)?\(/i.test(html))errors.push('responsive stylesheet missing');
 if(!/<main\b/i.test(html)||!/<h1\b/i.test(html))errors.push('main content missing');
 if(!/<footer\b/i.test(html))errors.push('footer missing');
 if(/<\s*(?:script|iframe|object|embed|applet|form|base|svg|math)\b|<meta\s+http-equiv|<link\b[^>]*rel\s*=\s*["']?(?!preconnect|stylesheet)|\son[a-z]{3,24}\s*=|javascript\s*:|@import\b|\bsrcset\s*=|\bsrcdoc\s*=/i.test(html))errors.push('unsafe scripts, embeds or forms');
 const src=[...html.matchAll(/\bsrc\s*=\s*["']([^"']+)["']/gi)].map(m=>m[1].replace(/&amp;/gi,'&'));
 if(src.some(u=>!/^https:\/\/images\.unsplash\.com\/photo-[\w-]+(?:\?[\w=&.%+-]+)?$/i.test(u)))errors.push('image is from an unapproved host');
 const hrefs=[...html.matchAll(/\bhref\s*=\s*["']([^"']+)["']/gi)].map(m=>m[1].replace(/&amp;/gi,'&'));
 if(hrefs.some(u=>!nxProjectAllowedLink(u,plan)&&!/^https:\/\/fonts\.googleapis\.com\/[^\s"'<>]+$/i.test(u)))errors.push('unapproved or broken external URL');
 if(/\b(?:href|src)\s*=\s*(?!["'])\S/i.test(html))errors.push('unquoted navigation or resource URL');
 const cssUrls=[...html.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/gi)].map(x=>x[1]);
 if(cssUrls.some(u=>!/^https:\/\/(?:images\.unsplash\.com|fonts\.gstatic\.com)\//i.test(u)&&!/^data:image\/(?:jpeg|png|webp);base64,/i.test(u)))errors.push('unapproved CSS URL');
 if(!html.toLowerCase().includes(plan.brand.toLowerCase().slice(0,Math.min(plan.brand.length,8))))errors.push('brand absent');
 return {ok:errors.length===0,errors,length:html?.length||0};
}
function nxProjectNav(plan,active){
 const links=plan.pages.map(p=>'<a '+(p.slug===active?'aria-current="page" ':'')+'href="'+nxProjEsc(p.slug)+'.html">'+nxProjEsc(p.title)+'</a>').join('');
 const name=nxProjEsc(plan.brand);
 return '<header class="nx-project-header"><div class="nx-project-nav"><a class="nx-project-brand" href="index.html">'+name+'</a><nav class="nx-project-desktop" aria-label="Main navigation">'+links+'</nav><details class="nx-project-mobile"><summary>Menu ☰</summary><nav aria-label="Mobile navigation">'+links+'</nav></details></div></header>';
}
function nxProjectSharedStyle(plan){
 const p=plan.palette;
 return '<style data-nx-project-system>:root{--nx-brand-background:'+p.background+';--nx-brand-text:'+p.text+';--nx-brand-accent:'+p.accent+';--nx-brand-surface:'+p.surface+';--nx-brand-muted:'+p.muted+'}'+
 '*,:before,:after{box-sizing:border-box}html,body{max-width:100%;overflow-x:clip}img,video{max-width:100%;height:auto}'+
 '.nx-project-header{position:relative;z-index:50;background:var(--nx-brand-background);color:var(--nx-brand-text);border-bottom:1px solid color-mix(in srgb,var(--nx-brand-text) 13%,transparent)}'+
 '.nx-project-nav{max-width:1400px;margin:auto;min-height:75px;padding:14px clamp(18px,4vw,65px);display:flex;justify-content:space-between;align-items:center;gap:20px}'+
 '.nx-project-brand{font:800 clamp(18px,2vw,25px)/1.1 system-ui,sans-serif;letter-spacing:-.05em;color:var(--nx-brand-text);text-decoration:none;flex-shrink:0}'+
 '.nx-project-desktop{display:flex;gap:clamp(11px,2vw,29px);align-items:center;justify-content:flex-end;flex-wrap:wrap}'+
 '.nx-project-header a{color:var(--nx-brand-text);text-decoration:none;font:700 13px/1.5 system-ui,sans-serif}'+
 '.nx-project-desktop a[aria-current=page],.nx-project-header a:hover{color:var(--nx-brand-accent)}'+
 '.nx-project-contact-cta{padding:clamp(22px,4vw,46px);border:1px solid var(--nx-brand-muted);background:var(--nx-brand-surface);border-radius:18px;color:var(--nx-brand-text);max-width:680px}.nx-project-contact-cta strong{font-size:clamp(22px,3vw,38px)}.nx-project-contact-cta a{display:inline-flex;margin-top:14px;padding:13px 20px;background:var(--nx-brand-accent);color:var(--nx-brand-background);border-radius:99px;text-decoration:none;font-weight:700}.nx-project-contact-cta small{display:block;margin-top:15px;opacity:.75}'+
 '.nx-project-mobile{display:none}.nx-project-mobile summary{cursor:pointer;list-style:none;padding:10px 14px;border:1px solid currentColor;border-radius:12px;font:700 12px system-ui}'+
 '@media(max-width:750px){.nx-project-nav{padding:12px 17px;min-height:64px}.nx-project-desktop{display:none}.nx-project-mobile{display:block;position:relative}'+
 '.nx-project-mobile nav{position:absolute;top:46px;right:0;z-index:99;min-width:min(260px,85vw);display:grid;gap:12px;padding:17px 20px;background:var(--nx-brand-background);border:1px solid var(--nx-brand-muted);border-radius:12px;box-shadow:0 20px 48px #0004}}'+
 '@media(prefers-reduced-motion:reduce){*,*:before,*:after{scroll-behavior:auto!important;animation:none!important;transition:none!important}}</style>';
}
function nxProjectReplaceLinks(html,plan,current){
 return html.replace(/(\bhref\s*=\s*["'])([^"']+)(["'])/gi,(all,a,value,z)=>{
  let href=value.replace(/&amp;/gi,'&');
  if(/^\/$/.test(href))href='index.html';
  else if(/^\/([a-z0-9-]+)\/?$/i.test(href))href=href.slice(1).replace(/\/$/,'')+'.html';
  else if(/^#/.test(href)&&href!=='#'){
   const id=href.slice(1);
   const safeId=id.replace(/[^\w-]/g,'');
   if(!new RegExp('id=["\\x27]'+safeId+'["\\x27]','i').test(html)){
    const target=plan.pages.find(x=>x.slug===id||x.title.toLowerCase()===id.toLowerCase());
    href=target?target.slug+'.html':(id==='contact'&&plan.pages.some(x=>x.slug==='contact')?'contact.html':'index.html');
   }
  }
  if(!nxProjectAllowedLink(href,plan))return a+'index.html'+z;
  return a+nxProjEsc(href)+z;
 });
}
export function nxProjectFinishPage(raw,plan,slug){
 if(typeof raw!=='string')throw Error('The page did not contain any HTML.');
 let html=raw.trim().replace(/^\x60{3}(?:html)?\s*/i,'').replace(/\s*\x60{3}\s*$/,'');
 const a=html.search(/<!doctype\s+html|<html\b/i),b=html.toLowerCase().lastIndexOf('</html>');
 if(a<0||b<=a)throw Error('The page HTML was cut off.');
 html=html.slice(a,b+7);
 if(!/^<!doctype/i.test(html))html='<!doctype html>\n'+html;
 // Generated navigation is replaced with links to the actual project files.
 html=html.replace(/<header\b[^>]*>[\s\S]*?<\/header>/i,'');
 html=html.replace(/<nav\b[^>]*>[\s\S]*?<\/nav>/gi,'');
 // Model-authored demo forms are never treated as working email delivery.
 // Preserve a usable contact area without enabling arbitrary form actions.
 const suppliedEmail=String(plan.brief||'').match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i)?.[0]||'';
 html=html.replace(/<form\b[^>]*>[\s\S]*?<\/form>/gi,()=>{
  const copy='<strong>Let’s start a conversation.</strong><p>Share your idea and connect with our team.</p>';
  return '<div class="nx-project-contact-cta">'+copy+(suppliedEmail?'<a href="mailto:'+nxProjEsc(suppliedEmail)+'">Email us ↗</a>':'<small>Contact details can be connected when this site is published.</small>')+'</div>';
 });
 // Strip non-functional AI-generated scripts and SVG icons. The exported
 // website uses CSS and native links instead of unreviewed executable code.
 html=html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'');
 html=html.replace(/<svg\b[^>]*>[\s\S]*?<\/svg>/gi,'<span aria-hidden="true">✦</span>');

 if(!/<html\b[^>]*lang=/i.test(html))html=html.replace(/<html\b/i,'<html lang="en"');
 if(!/<meta\b[^>]*name=["']viewport["']/i.test(html))html=html.replace(/<\/head>/i,'<meta name="viewport" content="width=device-width,initial-scale=1"></head>');
 if(!/<body\b[^>]*>/i.test(html))html=html.replace(/<\/head>/i,'</head><body>');
 if(!/<main\b/i.test(html)){
  html=html.replace(/<body\b[^>]*>/i,x=>x+'<main>');
  if(/<footer\b/i.test(html))html=html.replace(/<footer\b/i,'</main><footer>');
  else html=html.replace(/<\/body>/i,'</main></body>');
 }
 if(!/<h1\b/i.test(html)){
  const heading=html.match(/<h2\b([^>]*)>([\s\S]*?)<\/h2>/i)||html.match(/<h3\b([^>]*)>([\s\S]*?)<\/h3>/i);
  if(heading)html=html.replace(heading[0],'<h1'+heading[1]+'>'+heading[2]+'</h1>');
 }
 if(!/<footer\b/i.test(html))html=html.replace(/<\/body>/i,'<footer><p>© '+new Date().getUTCFullYear()+' '+nxProjEsc(plan.brand)+'</p></footer></body>');
 if(!/<\/body>/i.test(html))html=html.replace(/<\/html>/i,'</body></html>');
 html=html.replace(/<\/head>/i,nxProjectSharedStyle(plan)+'</head>');
 html=html.replace(/<body\b[^>]*>/i,x=>x+nxProjectNav(plan,slug));
 html=nxProjectReplaceLinks(html,plan,slug);
 const quality=nxProjectValidateHtml(html,plan);
 if(!quality.ok)throw Error('Page '+slug+' failed validation: '+quality.errors.slice(0,3).join(', '));
 return html;
}
export function nxProjectRelink(project){
 const out={...project,files:project.files.map(f=>({...f,html:f.html}))};
 for(const f of out.files){
  const current=f.path.replace(/\.html$/,'');
  const h=f.html.replace(/<header class="nx-project-header">[\s\S]*?<\/header>/i,'');
  const a=h.replace(/<body\b[^>]*>/i,x=>x+nxProjectNav(out.plan,current));
  f.html=nxProjectReplaceLinks(a,out.plan,current);
 }
 return out;
}

const NX_PROJECT_DIRECTOR='You are a senior agency art director creating a REAL MULTI-PAGE website project, not a one-page mockup. Return only strict JSON {brand,industry,artDirection,designSystem,displayFont,bodyFont,palette:{background,text,accent,surface,muted},pages:[{slug,title,purpose,design,sections:[string]}]}. Create 3-6 DISTINCT pages by default, unless specifically asked for one page. Include separate index/home, about, services/products/work and contact pages when relevant; obey any specifically named pages like pricing, gallery, products, FAQ, portfolio, blog. Each page must have a different purpose, layout and section composition. Every page is a separate .html file, with real navigation. Choose CUSTOM palette and type based on CLIENT BRIEF; DO NOT default to ivory/terracotta or any repeated agency theme. If user provides exact #HEX colors, follow them exactly. The output is a design plan, not website code. No fake awards, reviews, revenue, metrics, contact info, or checkout.';
const NX_PROJECT_CODER='You are a senior front-end designer writing ONE COMPLETE page of a REAL MULTI-PAGE website. Return just <!doctype html>... </html> with fully original semantic HTML and inline bespoke <style> CSS. Never reuse a preset layout. Honor brand, exact HEX colors, typography, industry and THIS PAGE\'S required content from the plan. OTHER pages exist as separate files, with navigation inserted by the server. Do not put a menu in the returned code. Make an unusual but usable composition for this page; visually different from the other pages, with strong typography, thoughtful spacing, responsive grids, imagery appropriate to the industry, real headings and copy (not lorem ipsum or generic filler). Use at least 3 named <section> blocks within <main>, with working local #anchors where suitable. Full <head>, <html lang="en">, viewport meta, body, footer, and CSS responsive @media(max-width:720px), @media(max-width:400px). Do not write <script>, forms, iframe, svg, style imports, or external JS. The only allowed images are exact Unsplash URLs in the supplied list; no other image hosts. Include no fictional business details, client testimonials or unverified promises. Do not simulate payments or contact delivery. ALL PAGE LINKS are to local .html pages, not /routes. Output 3000-18000 characters of complete, valid, accessible HTML. No markdown fences.';
const NX_PROJECT_EDIT='You are a careful senior front-end designer editing an EXISTING website page. Return the WHOLE updated HTML document, not advice or a fragment. Keep the exact existing brand, page identity, existing sections, working content, core visual direction and CSS unless the user expressly requests changes. Implement the specific request substantially: new sections must actually exist in the DOM, replaced colors must change CSS, layout changes must affect the correct section. Preserve responsive behavior. No script, forms, external code, fictitious content or broken links. Keep a complete <!doctype html>... </html>. Other pages in this site must NOT be rewritten. Use only approved image URLs supplied.';
function nxProjectPlanPrompt(brief,previous){
 const old=previous?.plan?JSON.stringify(previous.plan).slice(0,8000):'None';
 return 'COMPLETE CLIENT REQUEST:\n'+brief+'\n\nEXISTING PROJECT (if redesigning):\n'+old+
  '\n\nPlan all requested pages, with distinctive layout notes for EACH page. Required output is strict JSON only. Pay particular attention to exact user colors, page names and navigation. Do not reuse a fixed palette.';
}
async function nxProjectDirector(env,brief,previous){
 const res=await env.AI.run('@cf/meta/llama-3.3-70b-instruct-fp8-fast',{
  messages:[{role:'system',content:NX_PROJECT_DIRECTOR},{role:'user',content:nxProjectPlanPrompt(brief,previous)}],
  max_tokens:1900,temperature:.55
 });
 return nxProjectNormalizePlan(nxProjParse(nxProjReply(res)),brief,previous);
}
function nxProjectAssetList(){
 return NX_PROJECT_ASSETS.map(p=>'https://images.unsplash.com/'+p+'?auto=format&fit=crop&w=1400&q=82').join('\n');
}
async function nxProjectMakePage(env,plan,page,request,oldHtml=null){
 const serverNav=plan.pages.map(x=>({slug:x.slug,title:x.title}));
 const task='FULL USER BRIEF:\n'+(plan.brief||request)+
  '\n\nPAGE TO CREATE OR EDIT:\n'+JSON.stringify(page)+
  '\n\nCOMPLETE SITE ART DIRECTION:\n'+JSON.stringify({brand:plan.brand,industry:plan.industry,artDirection:plan.artDirection,designSystem:plan.designSystem,displayFont:plan.displayFont,bodyFont:plan.bodyFont,palette:plan.palette})+
  '\n\nALL EXISTING PAGE FILES (navigation must work):\n'+JSON.stringify(serverNav)+
  '\n\nLATEST CHANGE REQUEST:\n'+request+
  '\n\nPREVIOUS VERSION OF THIS PAGE (edit precisely; retain unaffected content):\n'+(oldHtml?oldHtml.slice(0,24000):'This is a new page.')+
  '\n\nONLY APPROVED IMAGE URLS:\n'+nxProjectAssetList()+
  '\n\nDo not reuse another page layout. Ensure page-specific sections and exact requested design. Full styled HTML only.';
 const generate=async(detail='')=>{
  const result=await env.AI.run('@cf/qwen/qwen2.5-coder-32b-instruct',{
   messages:[{role:'system',content:oldHtml?NX_PROJECT_EDIT:NX_PROJECT_CODER},{role:'user',content:task+(detail?'\n\nCORRECTIONS REQUIRED:\n'+detail:'')}],
   max_tokens:5200,temperature:oldHtml?.28:.5
  });
  return nxProjReply(result);
 };
 let first=await generate(),err='';
 for(let attempt=0;attempt<2;attempt++){
  try{
   const html=nxProjectFinishPage(first,plan,page.slug);
   if(oldHtml&&html.length<Math.min(3000,oldHtml.length*.48))throw Error('Revision dropped much of the existing page.');
   return {path:page.slug+'.html',html};
  }catch(e){err=String(e?.message||e).slice(0,500)}
  if(attempt===0)first=await generate('The previous attempt FAILED: '+err+'. Rebuild the complete page, preserving the requested design and all necessary sections. Finish the HTML document. Previous output (for error diagnosis):\n'+first.slice(0,9000));
 }
 throw Error('Could not complete '+page.title+' page: '+err);
}
function nxProjectPageFor(plan,value){
 const key=nxProjSlug(value||'');
 return plan.pages.find(p=>p.slug===key||p.title.toLowerCase()===String(value||'').trim().toLowerCase())||
 plan.pages.find(p=>p.slug.includes(key)&&key.length>2)||null;
}
function nxProjectOperationFallback(prompt,project){
 const p=prompt.toLowerCase();
 const findTarget=()=>project.plan.pages.find(x=>p.includes(x.slug.replace(/-/g,' '))||p.includes(x.title.toLowerCase()))?.slug||'index';
 const matched=p.match(/(?:add|create|build|make|design)\s+(?:a\s+|an\s+|the\s+|new\s+|another\s+)*(?:page\s+(?:for|called|named)\s+)?([a-z][\w -]{2,35}?)\s+page/);
 if(/^(add|create|build|make|design)\s+/.test(p)&&(p.includes(' page')||p.includes('new page'))){
  const title=matched?.[1]||p.match(/(?:new|another)\s+([a-z][\w-]+)\s+page/)?.[1]||'New Page';
  return {action:'add_page',target:nxProjSlug(title),title:title.replace(/\b\w/g,c=>c.toUpperCase())};
 }
 if(/^(remove|delete)\s+/.test(p)&&/page/.test(p))return {action:'remove_page',target:findTarget()};
 if(/^(rename)\s+/.test(p)&&/page/.test(p))return {action:'rename_page',target:findTarget(),title:nxProjText(prompt.split(' to ').pop(),50)};
 if(/^(change|redesign|rebrand|switch|update|make|use)\s+/.test(p)&&/(?:all|whole|entire|every|global|sitewide|whole website|all pages|navigation|navbar|theme|palette)/.test(p))
  return {action:'global_redesign',target:'all'};
 return {action:'edit_page',target:findTarget()};
}
async function nxProjectOperation(env,prompt,project){
 const fallback=nxProjectOperationFallback(prompt,project);
 try{
  const r=await env.AI.run('@cf/meta/llama-3.3-70b-instruct-fp8-fast',{
   messages:[{role:'system',content:'You are an exact website project change router. Return ONLY JSON {action,target,title,description}. actions: add_page (only create a NEW standalone linked page), edit_page (change existing page, add section, change layout, insert designs), remove_page, rename_page, global_redesign (sitewide palette, brand, typography, navigation or entire visual redesign). target is existing page slug or new page slug; title is human-readable name for additions/renames. Do not choose add_page when the user wants a new section on an existing page. Do not choose global_redesign for a request targeting one named page. Never rebuild all pages for a small change.'},
    {role:'user',content:'PROJECT PAGES: '+JSON.stringify(project.plan.pages.map(x=>({slug:x.slug,title:x.title})))+'\nREQUEST: '+prompt}],
   max_tokens:260,temperature:.1
  });
  const o=nxProjParse(nxProjReply(r)),actions=['add_page','edit_page','remove_page','rename_page','global_redesign'];
  if(!actions.includes(o.action))return fallback;
  return {action:o.action,target:nxProjSlug(o.target||fallback.target),title:nxProjText(o.title,60)||fallback.title||'New Page',description:nxProjText(o.description,160)};
 }catch{return fallback}
}
async function nxProjectGenerateAll(env,plan,request){
 const files=new Array(plan.pages.length);
 for(let i=0;i<plan.pages.length;i+=2){
  const pages=plan.pages.slice(i,i+2);
  const pair=await Promise.all(pages.map(p=>nxProjectMakePage(env,plan,p,request)));
  pair.forEach((f,j)=>{files[i+j]=f});
 }
 return files;
}
function nxProjectResult(project,action){
 const paths=project.files.map(x=>x.path);
 if(paths.length!==project.plan.pages.length||!paths.includes('index.html'))throw Error('The project does not contain all planned website pages.');
 if(project.files.some(f=>!nxProjectValidateHtml(f.html,project.plan).ok))throw Error('A project page did not pass validation.');
 const siteSpec={version:3,brand:project.plan.brand,pages:project.plan.pages.map(p=>({slug:p.slug,title:p.title,purpose:p.purpose})),palette:project.plan.palette,lastAction:action,revision:project.revision};
 return {kind:'website',reply:'Updated your '+project.files.length+'-page website project. The pages link to each other, and your previous pages are preserved when editing one page. Preview, navigate between pages and export the full site as a ZIP. Forms, checkout, databases and domains need real integrations.',siteSpec,siteProject:project};
}
export async function nxWebsiteBuildProjectV3(env,prompt,previous=null){
 if(!env?.AI)throw Error('NyX website AI is unavailable.');
 if(typeof prompt!=='string'||prompt.trim().length<9||prompt.length>4000)throw Error('Describe the website or edit request in 9–4,000 characters.');
 const old=nxProjectSafeInput(previous);
 if(!old){
  const plan=await nxProjectDirector(env,prompt,null);
  if(plan.pages.length>7)throw Error('Maximum seven pages per project.');
  const files=await nxProjectGenerateAll(env,plan,prompt);
  return nxProjectResult({version:3,plan,files,revision:1},'create_project');
 }
 const op=await nxProjectOperation(env,prompt,old);
 const project={version:3,plan:structuredClone(old.plan),files:old.files.map(x=>({...x})),revision:Math.max(1,old.revision)+1};
 if(op.action==='add_page'){
  if(project.plan.pages.length>=7)throw Error('This website already has seven pages. Remove one to add another.');
  const slug=nxProjSlug(op.target||op.title);
  if(project.plan.pages.some(p=>p.slug===slug))throw Error('A page with that name already exists. Ask NyX to edit it.');
  const page={slug,title:nxProjText(op.title,55)||'New Page',purpose:op.description||prompt.slice(0,220),design:'Follow the site design system but use page-specific original composition',sections:['Hero','Main content','Call to action']};
  project.plan.pages.push(page);
  project.files.push(await nxProjectMakePage(env,project.plan,page,prompt));
  return nxProjectResult(nxProjectRelink(project),'add_page');
 }
 if(op.action==='remove_page'){
  const target=nxProjectPageFor(project.plan,op.target);
  if(!target||target.slug==='index')throw Error('Choose an existing non-home page to remove.');
  project.plan.pages=project.plan.pages.filter(p=>p.slug!==target.slug);
  project.files=project.files.filter(f=>f.path!==target.slug+'.html');
  return nxProjectResult(nxProjectRelink(project),'remove_page');
 }
 if(op.action==='rename_page'){
  const target=nxProjectPageFor(project.plan,op.target),slug=nxProjSlug(op.title);
  if(!target||target.slug==='index'||project.plan.pages.some(p=>p.slug===slug&&p!==target))throw Error('That page cannot be renamed; choose an existing non-home page and a unique name.');
  const oldPath=target.slug+'.html';target.slug=slug;target.title=op.title;
  const entry=project.files.find(f=>f.path===oldPath);if(!entry)throw Error('Could not locate page file.');
  entry.path=slug+'.html';
  return nxProjectResult(nxProjectRelink(project),'rename_page');
 }
 if(op.action==='global_redesign'){
  const redesignBrief=project.plan.brief+'\nLATEST SITEWIDE REDESIGN REQUEST: '+prompt;
  const newPlan=await nxProjectDirector(env,redesignBrief,project);
  // Keep project page identity and contents, change visual direction across pages.
  newPlan.pages=project.plan.pages.map(p=>({...p}));
  newPlan.brand=project.plan.brand;
  const files=new Array(newPlan.pages.length);
  for(let i=0;i<newPlan.pages.length;i+=2){
   const pair=await Promise.all(newPlan.pages.slice(i,i+2).map(p=>nxProjectMakePage(env,newPlan,p,prompt,project.files.find(f=>f.path===p.slug+'.html')?.html)));
   pair.forEach((f,j)=>{files[i+j]=f});
  }
  project.plan=newPlan;project.files=files;
  return nxProjectResult(nxProjectRelink(project),'global_redesign');
 }
 const target=nxProjectPageFor(project.plan,op.target)||project.plan.pages[0];
 const i=project.files.findIndex(f=>f.path===target.slug+'.html');
 if(i<0)throw Error('Cannot find '+target.title+' in the website project.');
 project.files[i]=await nxProjectMakePage(env,project.plan,target,prompt,project.files[i].html);
 return nxProjectResult(nxProjectRelink(project),'edit_page');
}
