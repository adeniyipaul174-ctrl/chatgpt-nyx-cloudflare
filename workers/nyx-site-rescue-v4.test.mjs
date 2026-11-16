import test from 'node:test';
import assert from 'node:assert/strict';
import {nxWebsiteBuildProjectV3Resilient,nxProjectValidateHtml} from './nyx-site-project-v3.mjs';
const depleted={AI:{run:async()=>{throw new Error('AiError: you have used up your daily free allocation of 10,000 neurons (429)')}}};
test('AI quota exhaustion generates a complete, linked, differentiated website rather than an error',async()=>{
 const brief='Create a premium 4-page website for AURELIA STUDIO, a luxury creative agency, with Home, About, Services, Contact pages. Background #f8f6f1 text #181818 accent #b66a50. Hero heading "We Create Brands That Leave a Lasting Impression."';
 const r=await nxWebsiteBuildProjectV3Resilient(depleted,brief);
 assert.equal(r.kind,'website');
 assert.equal(r.siteSpec.engine,'local-recovery-v4');
 assert.ok(r.reply.includes('out of free capacity'));
 assert.equal(r.siteProject.files.length,4);
 assert.deepEqual(r.siteProject.files.map(f=>f.path),['index.html','about.html','services.html','contact.html']);
 assert.ok(r.siteProject.files[0].html.includes('We Create Brands That Leave a Lasting Impression.'));
 for(const f of r.siteProject.files){
  assert.equal(nxProjectValidateHtml(f.html,r.siteProject.plan).ok,true,f.path);
  for(const p of r.siteProject.plan.pages)assert.ok(f.html.includes('href="'+p.slug+'.html"'),f.path+' navigation missing '+p.slug);
 }
 assert.ok(r.siteProject.files[0].html.includes('#b66a50'));
 const other=await nxWebsiteBuildProjectV3Resilient(depleted,'Create an original website for VECTOR GRID, a futuristic SaaS analytics platform with Home, Product, Security and Contact pages and background #08182e, text #ffffff and accent #2be7fa.');
 assert.equal(other.siteSpec.engine,'local-recovery-v4');
 assert.ok(other.siteProject.files[0].html.includes('#2be7fa'));
 assert.ok(other.siteProject.files[0].html.includes('clip-path'),'technical site should use a different layout composition');
 assert.notEqual(r.siteProject.files[0].html,other.siteProject.files[0].html);
});
test('offline recovery adds real pages without losing old pages',async()=>{
 const original=(await nxWebsiteBuildProjectV3Resilient(depleted,'Create a website for BRIAR STUDIO with Home About Services Contact pages')).siteProject;
 const result=await nxWebsiteBuildProjectV3Resilient(depleted,'Create a new Pricing page with packages',original);
 assert.equal(result.siteProject.files.length,5);
 assert.equal(result.siteSpec.lastAction,'add_page');
 assert.ok(result.siteProject.files.some(f=>f.path==='pricing.html'));
 for(const f of original.files)assert.equal(result.siteProject.files.find(x=>x.path===f.path)?.html.includes('href="pricing.html"'),true);
});
test('offline edit changes one existing page and keeps all other pages intact',async()=>{
 const original=(await nxWebsiteBuildProjectV3Resilient(depleted,'Create a website for HELIO STUDIO with Home About Services Contact pages')).siteProject;
 const before=new Map(original.files.map(f=>[f.path,f.html]));
 const result=await nxWebsiteBuildProjectV3Resilient(depleted,'Add a gallery section on the About page',original);
 assert.equal(result.siteSpec.lastAction,'edit_page');
 assert.notEqual(result.siteProject.files.find(x=>x.path==='about.html')?.html,before.get('about.html'));
 for(const name of ['index.html','services.html','contact.html'])
   assert.equal(result.siteProject.files.find(x=>x.path===name)?.html,before.get(name),name+' must be preserved');
 assert.ok(result.siteProject.files.find(x=>x.path==='about.html')?.html.includes('NEW SECTION'));
});
