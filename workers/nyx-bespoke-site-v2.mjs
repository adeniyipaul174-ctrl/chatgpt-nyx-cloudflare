// NyX bespoke website builder: architect first, write bespoke HTML/CSS second.
// Deliberately no fallback to the old fixed-site template.
const NX_BESPOKE_IMAGES=[
 'photo-1497366754035-f200968a6e72','photo-1524758631624-e2822e304c36',
 'photo-1600607687920-4e2a09cf159d','photo-1517248135467-4c7edcad34c4',
 'photo-1552566626-52f8b828add9','photo-1483985988355-763728e1935b',
 'photo-1490481651871-ab68de25d43d','photo-1476514525535-07fb3b4ae5f1',
 'photo-1500534623283-312aade485b7','photo-1544367567-0f2fcb009e0b',
 'photo-1518611012118-696072aa579a','photo-1498050108023-c5249f4df085',
 'photo-1556761175-b413da4baf72','photo-1497633762265-9d179a990aa',
 'photo-1495446815901-a7297e633e8d','photo-1558655146-9f40138edfeb',
 'photo-1600566753190-17f0baa2a6c3','photo-1497366811353-6870744d04b2'
];
const NX_BESPOKE_FONTS=['Manrope','DM Sans','Outfit','Playfair Display','Cormorant Garamond','DM Serif Display','Space Grotesk','Fraunces','Inter','Bodoni Moda','Sora','Libre Baskerville'];
function nxBespokeReply(r){return r?.response||r?.choices?.[0]?.message?.content||''}
function nxBespokeJson(s){
 if(typeof s!=='string')throw Error('Design planning failed.');
 const a=s.indexOf('{'),b=s.lastIndexOf('}');
 if(a<0||b<=a||b-a>18000)throw Error('Design plan was not completed.');
 try{const v=JSON.parse(s.slice(a,b+1));if(v&&typeof v==='object'&&!Array.isArray(v))return v}catch{}
 throw Error('Design plan is invalid JSON.');
}
export function nxBespokePlan(raw,brief,previous){
 if(!raw||typeof raw!=='object')throw Error('Invalid art direction.');
 const trim=(v,n)=>typeof v==='string'?v.trim().slice(0,n):'';
 const colors=raw.palette||{};
 const pick=(v,f)=>/^#[0-9a-f]{6}$/i.test(v||'')?v.toLowerCase():f;
 const sections=Array.isArray(raw.sections)?raw.sections.slice(0,12):[];
 if(sections.length<3)throw Error('The plan does not cover the requested page sections.');
 const previousPlan=previous?.designPlan||previous||{};
 const p={
  version:2,brand:trim(raw.brand||previousPlan.brand||'New Project',70),
  industry:trim(raw.industry,70),concept:trim(raw.concept||raw.visualConcept,700),
  composition:trim(raw.composition||raw.layoutSignature,350),
  palette:{background:pick(colors.background,'#f7f5ef'),text:pick(colors.text,'#171f23'),
   accent:pick(colors.accent,'#a55840'),surface:pick(colors.surface,'#e9e4da'),muted:pick(colors.muted,'#65696d')},
  headingFont:NX_BESPOKE_FONTS.includes(raw.headingFont)?raw.headingFont:'Playfair Display',
  bodyFont:NX_BESPOKE_FONTS.includes(raw.bodyFont)?raw.bodyFont:'DM Sans',
  sections:sections.map((x,i)=>({type:trim(x?.type,40)||'content',title:trim(x?.title,110)||'Section '+(i+1),
   purpose:trim(x?.purpose,300),composition:trim(x?.composition||x?.layout,100)})),
  imageArt:trim(raw.imageArt,280),interactionNotes:trim(raw.interactionNotes,250),
  brief:String(brief).slice(0,4000)
 };
 p.requestedColors=[...new Set((brief.match(/#[a-f0-9]{6}\b/gi)||[]).map(x=>x.toLowerCase()))].slice(0,10);
 p.exactPhrases=[...new Set([...String(brief).matchAll(/[\"“]([^\"”]{8,125})[\"”]/g)].map(x=>x[1].trim()))].slice(0,12);
 if(!p.concept)throw Error('The art director did not specify a distinctive visual concept.');
 return p;
}
export function nxBespokeClean(source){
 if(typeof source!=='string')throw Error('The code generator returned no website.');
 let html=source.trim();
 html=html.replace(/^\x60{3}(?:html)?\s*/i,'').replace(/\s*\x60{3}\s*$/,'');
 const start=html.search(/<!doctype\s+html|<html\b/i),end=html.toLowerCase().lastIndexOf('</html>');
 if(start<0||end<=start)throw Error('Generated website HTML was unfinished.');
 html=html.slice(start,end+7);
 if(!/^<!doctype html>/i.test(html))html='<!doctype html>\n'+html;
 return html;
}
export function nxBespokeRepairHtml(source,plan){
 let html=nxBespokeClean(source);
 if(!/<html\b[^>]*lang=/i.test(html))html=html.replace(/<html\b/i,'<html lang="en"');
 if(!/<meta\b[^>]*name=["']viewport["']/i.test(html))
   html=html.replace(/<\/head>/i,'<meta name="viewport" content="width=device-width,initial-scale=1"></head>');
 if(!/<main\b/i.test(html)){
  if(/<\/header>/i.test(html))html=html.replace(/<\/header>/i,'</header><main>');
  else if(/<body\b[^>]*>/i.test(html))html=html.replace(/<body\b[^>]*>/i,x=>x+'<main>');
  if(/<main\b/i.test(html)){
   if(/<footer\b/i.test(html))html=html.replace(/<footer\b/i,'</main><footer>');
   else html=html.replace(/<\/body>/i,'</main></body>');
  }
 }
 if(!/<footer\b/i.test(html)){
  const title=String(plan.brand||'Your Brand').replace(/&/g,'&amp;').replace(/</g,'&lt;');
  html=html.replace(/<\/body>/i,'<footer><p>© '+new Date().getUTCFullYear()+' '+title+'. All rights reserved.</p></footer></body>');
 }
 return html;
}
export function nxBespokeCheck(html,plan){
 const errors=[];
 if(typeof html!=='string'||html.length<4800||html.length>135000)errors.push('incomplete or oversized HTML');
 for(const [rule,label] of [
  [/<html\b[^>]*lang=/i,'document language'],[/<meta[^>]+name=["']viewport["']/i,'mobile viewport'],
  [/<style\b[\s\S]*?<\/style>/i,'bespoke CSS'],[/@media\s*(?:screen\s+and\s*)?\(/i,'mobile styling'],
  [/<nav\b/i,'navigation'],[/<h1\b/i,'main heading'],[/<main\b/i,'main content'],[/<footer\b/i,'footer']
 ])if(!rule.test(html))errors.push('missing '+label);
 const count=(html.match(/<section\b/gi)||[]).length;
 if(count<3)errors.push('too few sections');
 if(plan.sections?.length>=3&&count>plan.sections.length+2)errors.push('unrequested duplicate sections ('+count+' versus '+plan.sections.length+' planned)');
 if(/<\s*(?:script|iframe|object|embed|applet|form|base|svg|math)\b|<meta\s+http-equiv|\son[a-z]{3,24}\s*=|javascript\s*:|@import\b|\bsrcset\s*=|\bsrcdoc\s*=|\bformaction\s*=/i.test(html))errors.push('unsafe or unsupported executable markup');
 const imageLinks=[...html.matchAll(/\bsrc\s*=\s*["']([^"']+)["']/gi)].map(x=>x[1].replace(/&amp;/gi,'&'));
 if(imageLinks.some(x=>!/^https:\/\/images\.unsplash\.com\/photo-[\w-]+(?:\?[\w=&.%+-]+)?$/i.test(x)))errors.push('unapproved image host');
 const hrefs=[...html.matchAll(/\bhref\s*=\s*["']([^"']+)["']/gi)].map(x=>x[1].replace(/&amp;/gi,'&'));
 if(hrefs.some(x=>!/^#[\w-]*$/i.test(x)&&!/^mailto:[\w.%+-]+@[\w.-]+\.[a-z]{2,}$/i.test(x)
   &&!/^https:\/\/(?:fonts\.googleapis\.com|fonts\.gstatic\.com)\/[^\s"'<>]+$/i.test(x)
   &&!String(plan.brief).includes(x)))errors.push('unapproved external link');
 if(/\b(?:src|href)\s*=\s*(?!["'])[^\s>]+/i.test(html))errors.push('unsafe unquoted resource URL');
 const cssLinks=[...html.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/gi)].map(x=>x[1]);
 if(cssLinks.some(x=>!/^https:\/\/(?:images\.unsplash\.com|fonts\.gstatic\.com)\//i.test(x)))errors.push('unapproved CSS resource');
 if(plan.brand&&!html.toLowerCase().includes(plan.brand.toLowerCase().slice(0,Math.min(9,plan.brand.length))))errors.push('brand missing');
 const colors=Object.values(plan.palette||{});
 if(colors.filter(x=>html.toLowerCase().includes(x.toLowerCase())).length<2)errors.push('planned palette ignored');
 for(const x of plan.requestedColors||[])if(!html.toLowerCase().includes(x))errors.push('requested '+x+' omitted');
 const visible=html.replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').toLowerCase();
 for(const quote of plan.exactPhrases||[])if(!visible.includes(quote.toLowerCase()))errors.push('exact client copy omitted: '+quote.slice(0,45));
 return {valid:errors.length===0,errors,sections:count,bytes:html.length};
}
const NX_BESPOKE_DIRECTOR='Act as an elite website creative director. Create ORIGINAL art direction for the SPECIFIC supplied brief, never a fixed website template. Preserve exact requested colors, brand, sections, content, and layout. Select colors per brief (not default colors), visual motifs, typography, and distinctive composition. Output STRICT JSON, nothing else. Schema: {brand,industry,concept,composition,palette:{background,text,accent,surface,muted},headingFont,bodyFont,imageArt,interactionNotes,sections:[{type,title,purpose,composition}]}. Include all requested sections, 3 to 12; order and geometry should differ with industry. All colors 6-digit #HEX. headingFont/bodyFont from Manrope, DM Sans, Outfit, Playfair Display, Cormorant Garamond, DM Serif Display, Space Grotesk, Fraunces, Inter, Bodoni Moda, Sora, Libre Baskerville. No fabricated reviews, results, credentials, or people.';
const NX_BESPOKE_CODER='You are a world-class creative web designer AND senior HTML/CSS engineer. Generate a complete ORIGINAL editorial-quality single-page website. YOU design the layout and CSS from the supplied client brief plus art direction, NOT a repeated Services/About/Process template. Use sophisticated typography, negative space, interesting grid composition, custom sections, varied radii, deliberate image cropping, polished CTAs, strong contrast, subtle CSS interactions, and mobile responsive layouts. Respect user brand and ALL exact requested #HEX colors, typography, copy and sections. Produce entirely bespoke HTML/CSS including complete <html lang="en">, viewport meta, <header>, working <nav> anchors, <main>, at least three <section> blocks, <footer>, and at least one <style> with @media(max-width:720px). Include <details> for accordion if needed. All CSS inline in <style>. Use only the APPROVED image URLs supplied; other image URLs are forbidden. Do not invent reviews, credentials, stats or contact details. No scripts, no forms, no inline events, no iframes, no embeds, no CSS imports, no SVG. A Google Fonts stylesheet from fonts.googleapis.com is permitted, but no other external stylesheets. Links within the page should use real anchor IDs. Any contact, checkout or backend actions not supplied by user are presentation only; do not fake connected systems. Return ONLY THE ENTIRE HTML DOCUMENT, starting <!doctype html> and finishing </html>, no code fences or explanations. It must be >= 4,800 characters and polished enough for a paying client.';
async function nxBespokeCritique(env,brief,plan,html){
 try{
  const instruction='Act as a critical senior web design reviewer. Assess whether the GENERATED HTML/CSS genuinely follows the exact user brief and unique art direction. Check requested composition, colors, exact copy, section types and order, responsive grids, use of imagery, and whether it looks distinctive rather than a generic landing-page template. Be strict. Return ONLY JSON with score (integer 0-10) and missing (array of at most 7 short actionable defects). A normal page with generic vertical sections ignoring bento, diagonal, editorial, etc should score below 7. No markdown.';
  const r=await env.AI.run('@cf/meta/llama-3.3-70b-instruct-fp8-fast',{
   messages:[{role:'system',content:instruction},{role:'user',content:'CLIENT BRIEF:\n'+brief+'\nART DIRECTION:\n'+JSON.stringify(plan).slice(0,5000)+'\nGENERATED HTML/CSS:\n'+html.slice(0,14500)}],
   max_tokens:470,temperature:.15
  });
  const v=nxBespokeJson(nxBespokeReply(r));
  return {score:Number.isFinite(v.score)?Math.max(0,Math.min(10,v.score)):null,
   missing:Array.isArray(v.missing)?v.missing.slice(0,7).map(x=>String(x).slice(0,160)):[]};
 }catch{return null}
}
export async function nxWebsiteBuildBespoke(env,brief,previous=null){
 if(!env?.AI)throw Error('NyX website AI is unavailable.');
 if(typeof brief!=='string'||brief.trim().length<12||brief.length>4000)throw Error('Please describe the website in 12 to 4,000 characters.');
 const prior=previous?.designPlan||previous||null;
 const planning=await env.AI.run('@cf/meta/llama-3.3-70b-instruct-fp8-fast',{
  messages:[{role:'system',content:NX_BESPOKE_DIRECTOR},{role:'user',content:'FULL USER BRIEF:\n'+brief+'\n\nPREVIOUS DESIGN FOR REVISION:\n'+JSON.stringify(prior).slice(0,4200)}],
  max_tokens:1700,temperature:.44
 });
 const plan=nxBespokePlan(nxBespokeJson(nxBespokeReply(planning)),brief,previous);
 const assets=NX_BESPOKE_IMAGES.map(x=>'https://images.unsplash.com/'+x+'?auto=format&fit=crop&w=1400&q=82').join('\n');
 const task='FULL ORIGINAL USER SCRIPT:\n'+brief+'\n\nCUSTOM SITE PLAN:\n'+JSON.stringify(plan)+
  '\n\nONLY ALLOWED PHOTOGRAPHY URLS:\n'+assets+
  '\n\nCreate custom HTML+CSS for this unique brief. Include all client sections and palette colors. No generic reused layout.';
 const code=async prompt=>{
  const r=await env.AI.run('@cf/qwen/qwen2.5-coder-32b-instruct',{
   messages:[{role:'system',content:NX_BESPOKE_CODER},{role:'user',content:prompt}],
   max_tokens:6900,temperature:.35
  });
  return nxBespokeReply(r);
 };
 let draft=await code(task),html,quality,review=null;
 try{html=nxBespokePolish(nxBespokeRepairHtml(draft,plan),plan);quality=nxBespokeCheck(html,plan)}
 catch(err){quality={valid:false,errors:[String(err?.message||'Incomplete website')]}};
 if(quality.valid)review=await nxBespokeCritique(env,brief,plan,html);
 if(!quality.valid||(review?.score!==null&&review?.score<8)){
  const failures=[
   ...(quality?.errors||[]),
   ...(review?.missing||[]),
   ...(review?.score!==null&&review?.score<8?['Visual design score '+review.score+'/10; redesign required']:[])
  ];
  const repair='The first website is not good enough. Specific problems: '+failures.join('; ')+
    '. REBUILD THE ENTIRE HTML DOCUMENT, not just a CSS patch. Strictly follow every layout composition, exact headline, brand, section and color in the full brief. Produce more distinctive visual composition and complete responsive CSS. Start <!doctype html> and end </html>.\n'+task+
    '\nPrevious draft (for improvement):\n'+String(draft).slice(0,9500);
  draft=await code(repair);html=nxBespokePolish(nxBespokeRepairHtml(draft,plan),plan);quality=nxBespokeCheck(html,plan);
  if(quality.valid)review=await nxBespokeCritique(env,brief,plan,html);
 }
 if(!quality.valid)throw Error('Website generation did not meet your brief: '+quality.errors.slice(0,2).join('; ')+'. Please retry.');
 if(review?.score!==null&&review?.score<6)throw Error('The generated website did not meet the design-quality review. Please refine or shorten the brief and retry.');
 return {kind:'website',reply:'Built a custom '+quality.sections+'-section responsive website from your exact brief. Preview, export HTML or request specific changes. Real payment processing, working forms and database features need separate integrations.',siteHtml:html,siteSpec:{version:2,brand:plan.brand,designPlan:plan,sections:quality.sections,engine:'bespoke-code-v2',reviewScore:review?.score??null}};
}
