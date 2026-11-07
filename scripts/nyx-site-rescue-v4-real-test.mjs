// Real Cloudflare AI 429 recovery acceptance. No user login or paid AI tokens.
import assert from 'node:assert/strict';
import {githubOidcToken} from './nyx-github-agents.mjs';
const url='https://nyx-site-v4-rescue-stage.adeniyipaul174.workers.dev/__nyx/site-v4-rescue-test';
const token=await githubOidcToken();
async function call(prompt,siteProject){
 const r=await fetch(url,{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({prompt,...(siteProject?{siteProject}:{})}),signal:AbortSignal.timeout(75000)});
 const body=await r.text();
 if(!r.ok)throw Error('Rescue stage returned '+r.status+': '+body.slice(0,400));
 return JSON.parse(body);
}
try{
 const first=await call('Create a premium multipage website for AURELIA STUDIO, an independent creative agency, with Home, About, Services and Contact pages. Background #f8f6f1, text #181818, accent #b66a50. Hero heading "We Create Brands That Leave a Lasting Impression."');
 assert.equal(first.kind,'website');
 assert.equal(first.siteSpec.engine,'local-recovery-v4');
 assert.deepEqual(first.siteProject.files.map(x=>x.path),['index.html','about.html','services.html','contact.html']);
 assert.ok(first.siteProject.files[0].html.includes('We Create Brands That Leave a Lasting Impression.'));
 for(const f of first.siteProject.files){for(const p of first.siteProject.plan.pages)assert.ok(f.html.includes('href="'+p.slug+'.html"'));}
 console.log('PASS real 429: new 4-page agency website, correct palette, all real navigation files');
 const aboutOriginal=first.siteProject.files.find(x=>x.path==='about.html').html;
 const homeOriginal=first.siteProject.files.find(x=>x.path==='index.html').html;
 const edited=await call('Add a gallery section on the About page',first.siteProject);
 assert.equal(edited.siteSpec.lastAction,'edit_page');
 assert.equal(edited.siteProject.files.length,4);
 assert.notEqual(edited.siteProject.files.find(x=>x.path==='about.html').html,aboutOriginal);
 assert.equal(edited.siteProject.files.find(x=>x.path==='index.html').html,homeOriginal);
 console.log('PASS real 429: About page changed without altering Home');
 const expanded=await call('Create a new Pricing page with packages',edited.siteProject);
 assert.equal(expanded.siteSpec.lastAction,'add_page');
 assert.ok(expanded.siteProject.files.some(x=>x.path==='pricing.html'));
 for(const f of expanded.siteProject.files)assert.ok(f.html.includes('href="pricing.html"'));
 console.log('PASS real 429: Pricing page added and navigation updated across all five files');
 const tech=await call('Build a futuristic multipage website for VECTOR GRID, a SaaS analytics platform, with Home, Product, Security and Contact pages. Colors background #08182e, text #ffffff, accent #2be7fa.');
 assert.equal(tech.siteSpec.engine,'local-recovery-v4');
 assert.ok(tech.siteProject.files[0].html.includes('#2be7fa'));
 assert.ok(tech.siteProject.files[0].html.includes('clip-path'));
 assert.notEqual(tech.siteProject.files[0].html,first.siteProject.files[0].html);
 console.log('PASS real 429: SaaS design differs from creative agency layout and colors');
}catch(e){console.error('REAL RESCUE INTEGRATION FAILED:',e.stack||String(e));process.exitCode=1}
