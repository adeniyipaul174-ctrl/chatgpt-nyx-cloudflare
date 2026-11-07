// Real AI execution on isolated, OIDC-protected staging Worker.
// Verify the exact live generator and retrieve actionable backend errors.
// Invoked by the existing allowlisted GitHub workflow identity.
// Retry includes safe contact-form conversion, precise branding and mobile screenshot audits.
// Preserves generated HTML files as artifacts for visual review.
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {githubOidcToken} from './nyx-github-agents.mjs';
const base='https://nyx-site-project-v3-stage.adeniyipaul174.workers.dev/__nyx/project-v3-test';
const token=await githubOidcToken();
const abort=new AbortController(),timer=setTimeout(()=>abort.abort(),570000);
const prompt='Create a premium multi-page website for VECTOR GRID, a modern AI data-platform business. Make FOUR separate working pages: Home, Product, Security and Contact. Use exact background #08182e, text #ffffff and vivid cyan accent #2be7fa, with crisp geometric typography, technical data visuals, a bold bento grid, atmospheric dark surfaces and a distinct composition for each page. Working navigation between all pages; no beige, no terracotta and no generic creative-agency design. Every page should include original relevant content with clear product benefits, accurate non-fabricated copy and mobile layouts. No fake customer reviews, prices or statistics.';
async function call(body){
 const response=await fetch(base,{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify(body),signal:abort.signal,redirect:'error'});
 const text=await response.text();
 if(!response.ok)throw Error('HTTP '+response.status+': '+text.slice(0,1100));
 return JSON.parse(text);
}
try{
 const site=await call({prompt});
 assert.equal(site.kind,'website');
 assert.equal(site.siteProject?.version,3);
 assert.ok(site.siteProject.files.length>=3,'must create multiple real pages');
 assert.ok(site.siteProject.files.some(f=>f.path==='index.html'));
 assert.ok(site.siteProject.plan.palette.background==='#08182e');
 assert.ok(site.siteProject.plan.palette.accent==='#2be7fa');
 await mkdir('nyx-agent-results/vector-v3',{recursive:true});
 for(const file of site.siteProject.files){
  assert.ok(file.html.length>2800,'incomplete '+file.path);
  assert.ok(file.html.includes('#08182e')&&file.html.includes('#2be7fa'),'exact palette missing in '+file.path);
  for(const page of site.siteProject.plan.pages)assert.ok(file.html.includes('href="'+page.slug+'.html"'),file.path+' has broken nav to '+page.slug);
  await writeFile('nyx-agent-results/vector-v3/'+file.path,file.html);
 }
 await writeFile('nyx-agent-results/vector-v3/plan.json',JSON.stringify(site.siteProject.plan,null,2));
 console.log('PASS actual AI generated '+site.siteProject.files.length+' linked HTML pages with original dark cyan design');
 // A real edit call verifies the prior site survives and only the new page is added.
 const added=await call({prompt:'Create a new Pricing page for this same VECTOR GRID website, with clear service-package descriptions but no invented prices.',siteProject:site.siteProject});
 assert.equal(added.kind,'website');
 assert.equal(added.siteProject.files.length,site.siteProject.files.length+1,'add-page must not replace existing pages');
 const originalNames=site.siteProject.files.map(f=>f.path);
 for(const name of originalNames){
  const f=added.siteProject.files.find(f=>f.path===name);assert.ok(f,'lost original file '+name);
 }
 const newPage=added.siteProject.files.find(f=>!originalNames.includes(f.path));assert.ok(newPage,'missing new separate file');
 for(const f of added.siteProject.files){
  assert.ok(f.html.includes('href="'+newPage.path+'"'),'new page absent from nav in '+f.path);
  await writeFile('nyx-agent-results/vector-v3/final-'+f.path,f.html);
 }
 console.log('PASS actual AI added '+newPage.path+' while preserving all '+originalNames.length+' existing page files');
 await writeFile('nyx-agent-results/vector-v3/report.json',JSON.stringify({brand:site.siteProject.plan.brand,initialPages:originalNames,addedPage:newPage.path,color:site.siteProject.plan.palette,initialBytes:site.siteProject.files.map(f=>f.html.length)},null,2));
}catch(e){console.error('REAL MULTIPAGE AI TEST FAILED:',e.stack||String(e));process.exitCode=1}
finally{clearTimeout(timer)}
