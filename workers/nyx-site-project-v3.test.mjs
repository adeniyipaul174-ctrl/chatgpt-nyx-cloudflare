import test from 'node:test';
import assert from 'node:assert/strict';
import {nxProjectNormalizePlan,nxProjectIntent,nxProjectFinishPage,nxProjectValidateHtml,nxProjectRelink,nxWebsiteBuildProjectV3} from './nyx-site-project-v3.mjs';
const base={
 brand:'AURELIA STUDIO',industry:'creative agency',artDirection:'Warm editorial architecture with split imagery',
 designSystem:'Soft asymmetric serif and expressive layers',displayFont:'Cormorant Garamond',bodyFont:'Manrope',
 palette:{background:'#f8f6f1',text:'#181818',accent:'#b66a50',surface:'#eee8de',muted:'#747474'},
 pages:[
  {slug:'index',title:'Home',purpose:'Architectural hero',design:'Asymmetric split',sections:['Hero','Services','CTA']},
  {slug:'about',title:'About',purpose:'Studio story',design:'Editorial timeline',sections:['Origin','Philosophy','People']},
  {slug:'services',title:'Services',purpose:'Capabilities',design:'Bento services',sections:['Brand','Digital','Creative']},
  {slug:'contact',title:'Contact',purpose:'Contact details',design:'Minimal contact options',sections:['Connect','Details','Next steps']}
 ]
};
function pageHtml(page,plan,marker='initial'){
 const body='<section id="intro"><h1>'+plan.brand+' — '+page.title+'</h1><p>'+('Purpose-built design for this '+page.title+' page. ').repeat(25)+'</p></section>'+
 '<section id="story"><h2>'+page.sections[0]+'</h2><p>'+('Different section styles for every business. ').repeat(28)+'</p></section>'+
 '<section id="details"><h2>'+page.sections[1]+'</h2><p>'+('A practical website, not a one-page mockup. ').repeat(29)+'</p></section>'+
 '<section id="contact"><h2>Let us collaborate</h2><p>'+('Get in touch to learn more about our approach. ').repeat(25)+'</p><a href="contact.html">Contact</a></section>';
 const css=':root{--bg:'+plan.palette.background+';--text:'+plan.palette.text+';--accent:'+plan.palette.accent+'}body{margin:0;background:var(--bg);color:var(--text)}main>section{padding:60px 5%}h1{font-size:70px}a{color:var(--accent)}'+
 '@media(max-width:720px){main>section{padding:35px 20px}h1{font-size:41px}}@media(max-width:400px){h1{font-size:36px}}';
 return '<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+page.title+' | '+plan.brand+'</title><style>'+css+'</style></head><body><main data-generation="'+marker+'">'+body+'</main><footer>© '+plan.brand+'</footer></body></html>';
}
function fakeAi(plan=base){
 const calls=[];
 const AI={run:async(model,input)=>{
  const system=input.messages[0]?.content||'',user=input.messages[1]?.content||'';
  calls.push({model,system,user});
  if(system.includes('website project change router')){
   if(/new pricing page|pricing page/i.test(user))return {response:JSON.stringify({action:'add_page',target:'pricing',title:'Pricing'})};
   if(/remove about page/i.test(user))return {response:JSON.stringify({action:'remove_page',target:'about'})};
   if(/entire website/i.test(user))return {response:JSON.stringify({action:'global_redesign',target:'all'})};
   return {response:JSON.stringify({action:'edit_page',target:'about'})};
  }
  if(model.includes('llama'))return {response:JSON.stringify({...plan,pages:plan.pages})};
  const match=user.match(/PAGE TO CREATE OR EDIT:\n(\{[^\n]+\})/);
  assert.ok(match,'missing target page in code model request');
  const page=JSON.parse(match[1]),isEdit=user.includes('LATEST CHANGE REQUEST:')&&user.includes('PREVIOUS VERSION OF THIS PAGE (edit precisely; retain unaffected content):\n<!doctype');
  return {response:pageHtml(page,plan,isEdit?'edited':'generated')};
 }};
 return {AI,calls};
}
test('distinct client palettes are kept rather than forced to a shared theme',()=>{
 const source={...base,palette:{background:'#010203',text:'#fefdfc',accent:'#ab23cd',surface:'#151515',muted:'#999999'}};
 const p=nxProjectNormalizePlan(source,'Create a website background #f8f6f1 text #181818 accent #b66a50');
 assert.deepEqual([p.palette.background,p.palette.text,p.palette.accent],['#f8f6f1','#181818','#b66a50']);
 const tech=nxProjectNormalizePlan({...source,brand:'NEON DATA',palette:{background:'#08182e',text:'#ffffff',accent:'#2be7fa',surface:'#131c35',muted:'#90a1b8'}},'Create a website for NEON DATA');
 assert.equal(tech.palette.accent,'#2be7fa');
 assert.notDeepEqual(p.palette,tech.palette);
});
test('new project contains separate real pages with complete relative navigation',async()=>{
 const env=fakeAi();
 const built=await nxWebsiteBuildProjectV3(env,'Create a sophisticated multi page website for AURELIA STUDIO. Include Home, About, Services, Contact. Use exact background #f8f6f1 text #181818 accent #b66a50.');
 assert.equal(built.kind,'website');
 assert.equal(built.siteProject.version,3);
 assert.equal(built.siteProject.files.length,4);
 assert.deepEqual(built.siteProject.files.map(f=>f.path),['index.html','about.html','services.html','contact.html']);
 for(const f of built.siteProject.files){
  assert.ok(nxProjectValidateHtml(f.html,built.siteProject.plan).ok,f.path+' invalid');
  for(const page of built.siteProject.plan.pages)assert.ok(f.html.includes('href="'+page.slug+'.html"'),f.path+' missing '+page.slug+' link');
  assert.ok(f.html.includes('class="nx-project-mobile"'),'mobile navigation absent');
 }
 assert.equal(env.calls.filter(c=>c.model.includes('coder')).length,4);
});
test('edit target preserves unrelated pages and updates only requested page source',async()=>{
 const env=fakeAi();const project=(await nxWebsiteBuildProjectV3(env,'Create a four page studio website')).siteProject;
 const before=new Map(project.files.map(f=>[f.path,f.html]));
 const edited=(await nxWebsiteBuildProjectV3(env,'Edit the About page: add a different gallery design to the story section',project)).siteProject;
 assert.equal(edited.files.length,4);
 assert.notEqual(edited.files.find(f=>f.path==='about.html').html,before.get('about.html'));
 for(const name of ['index.html','services.html','contact.html'])assert.equal(edited.files.find(f=>f.path===name).html,before.get(name),name+' should remain byte-for-byte unchanged');
 assert.equal(edited.revision,2);
});
test('add a page produces a file and revises navigation on every existing page',async()=>{
 const env=fakeAi();const project=(await nxWebsiteBuildProjectV3(env,'Create a four page studio website')).siteProject;
 const changed=(await nxWebsiteBuildProjectV3(env,'Create a new Pricing page with cards for website packages',project)).siteProject;
 assert.deepEqual(changed.files.map(f=>f.path),['index.html','about.html','services.html','contact.html','pricing.html']);
 for(const f of changed.files)assert.ok(f.html.includes('href="pricing.html"'),f.path+' navigation not updated');
 assert.ok(changed.files.find(f=>f.path==='pricing.html').html.includes('Pricing'));
});
test('remove page removes navigation links and keeps other pages',async()=>{
 const env=fakeAi();const project=(await nxWebsiteBuildProjectV3(env,'Create a four page studio website')).siteProject;
 const removed=(await nxWebsiteBuildProjectV3(env,'Remove About page from this project',project)).siteProject;
 assert.equal(removed.files.length,3);
 assert.ok(removed.files.every(f=>!f.html.includes('href="about.html"')));
});
test('new website intents and editing intents are distinguished',()=>{
 assert.equal(nxProjectIntent('Create a completely new website for my coffee business',true),false);
 assert.equal(nxProjectIntent('Create a Pricing page',true),true);
 assert.equal(nxProjectIntent('Add a gallery section on the About page',true),true);
 assert.equal(nxProjectIntent('Change the sitewide background to midnight blue',true),true);
 assert.equal(nxProjectIntent('What do you think of my website?',true),false);
 assert.equal(nxProjectIntent('Create a website for my agency',false),true);
});
test('unsafe markup cannot enter site preview or exported pages',()=>{
 const plan=nxProjectNormalizePlan(base,'Create studio website');
 const good=nxProjectFinishPage(pageHtml(plan.pages[0],plan),plan,'index');
 const x=nxProjectValidateHtml(good,plan);assert.equal(x.ok,true,x.errors.join('; '));
 const injection=good.replace('</main>','<script>alert(1)</script></main>');
 assert.equal(nxProjectValidateHtml(injection,plan).ok,false);
 const badUrl=good.replace('</main>','<img src="https://attacker.example/exfil"></main>');
 assert.equal(nxProjectValidateHtml(badUrl,plan).ok,false);
});

test('repair missing body/main/header heading/footer while keeping page navigation functional',()=>{
 const plan=nxProjectNormalizePlan(base,'Create a multi page website for studio');
 const page=plan.pages[0];
 let broken=pageHtml(page,plan);
 broken=broken.replace('<main data-generation="initial">','').replace('</main>','').replace(/<h1\b[^>]*>[\s\S]*?<\/h1>/i,'').replace(/<footer>[\s\S]*?<\/footer>/i,'');
 const repaired=nxProjectFinishPage(broken,plan,'index');
 assert.match(repaired,/<main\b/);
 assert.match(repaired,/<\/main>/);
 assert.match(repaired,/<h1\b/);
 assert.match(repaired,/<footer\b/);
 assert.match(repaired,/href="about.html"/);
 assert.equal(nxProjectValidateHtml(repaired,plan).ok,true);
});
test('an image request about a website is not mistaken for source-code generation',()=>{
 assert.equal(nxProjectIntent('Generate an image of a website homepage',false),false);
 assert.equal(nxProjectIntent('Create a beautiful website with five working pages',false),true);
});
