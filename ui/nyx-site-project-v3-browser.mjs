// NyX staged multipage product acceptance: actual UI, fake account/model responses.
import {chromium} from 'playwright-core';
import {existsSync,readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import assert from 'node:assert/strict';
import {nxProjectFinishPage,nxProjectNormalizePlan} from '../workers/nyx-site-project-v3.mjs';

const base='https://nyx-site-project-v3-stage.adeniyipaul174.workers.dev';
const chrome=[process.env.CHROME_PATH,'/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/usr/bin/chromium'].find(x=>x&&existsSync(x));
if(!chrome)throw Error('A real Chromium browser is required');
const browser=await chromium.launch({executablePath:chrome,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const plan=nxProjectNormalizePlan({
 brand:'Studio Helio',industry:'architecture studio',artDirection:'Gallery-led architectural photography and refined editorial typography',
 palette:{background:'#f4efe8',text:'#192c29',accent:'#b25436',surface:'#eee6da',muted:'#6c7774'},
 pages:[
 {slug:'index',title:'Home',purpose:'Hero and work',design:'Split editorial',sections:['Hero','Selected Work','CTA']},
 {slug:'about',title:'About',purpose:'About the studio',design:'Timeline',sections:['Story','Process','People']},
 {slug:'services',title:'Services',purpose:'How we help',design:'Studio grid',sections:['Capabilities','Projects','Consult']},
 {slug:'contact',title:'Contact',purpose:'Connect with us',design:'Clean editorial',sections:['Contact','Questions','Next steps']}
 ]},'Create a studio website with Home About Services Contact');
function html(page,tag='original'){
 const css='body{background:'+plan.palette.background+';color:'+plan.palette.text+';margin:0;font:16px sans-serif}main>section{padding:60px 5%}a{color:'+plan.palette.accent+'}h1{font-size:55px}@media(max-width:720px){main>section{padding:40px 20px}h1{font-size:38px}}';
 const text=('Distinctive architecture and thoughtful work on the '+page.title+' page. ').repeat(25);
 const source='<!doctype html><html lang="en"><head><title>'+page.title+' | Studio Helio</title><meta name="viewport" content="width=device-width,initial-scale=1"><style>'+css+'</style></head><body><main data-version="'+tag+'"><section id="hero"><h1>Studio Helio — '+page.title+'</h1><p>'+text+'</p></section><section id="work"><h2>Selected projects</h2><p>'+text+'</p></section><section id="contact"><h2>Get in touch</h2><p>'+text+'</p></section></main><footer>Studio Helio</footer></body></html>';
 return nxProjectFinishPage(source,plan,page.slug);
}
function createProject(extra=false,tag='original'){
 const newPlan=structuredClone(plan);
 if(extra)newPlan.pages.push({slug:'pricing',title:'Pricing',purpose:'Packages',design:'Comparison table',sections:['Plans','FAQs','Connect']});
 const files=newPlan.pages.map(p=>({path:p.slug+'.html',html:nxProjectFinishPage(html(p,tag),newPlan,p.slug)}));
 return {version:3,plan:newPlan,files,revision:extra?2:1};
}
function response(project,action='create_project'){
 return {kind:'website',reply:'Your real website project is ready.',siteSpec:{version:3,brand:project.plan.brand,pages:project.plan.pages.map(p=>({slug:p.slug,title:p.title})),palette:project.plan.palette,revision:project.revision,lastAction:action},siteProject:project};
}
const dir=await mkdtemp(join(tmpdir(),'nyx-project-'));
async function run(width){
 const context=await browser.newContext({viewport:{width,height:850},acceptDownloads:true});
 const page=await context.newPage();
 page.on('pageerror',e=>console.log('BROWSER JS ERROR',e.stack||e.message));
 page.on('console',m=>{if(m.type()==='error')console.log('BROWSER CONSOLE',m.text().slice(0,500))});
 page.on('response',r=>{if(r.url().includes('/api/nyx'))console.log('NYX CHAT RESPONSE',r.status(),r.url())});
 await page.route('**/api/auth/me',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({authenticated:true,user:{id:'mock-site-project',name:'Preview Test',email:'test@example.invalid',provider:'password'}})}));
 let revisions=0;
 await page.route('**/api/nyx',route=>{
  const body=route.request().postDataJSON();
  if(body.siteProject){
   revisions++;assert.equal(body.siteProject.version,3,'editing must include previous project');
   assert.ok(body.siteProject.files.some(f=>f.path==='about.html'));
   return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(response(createProject(true),'add_page'))});
  }
  return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(response(createProject()))});
 });
 const r=await page.goto(base+'/',{waitUntil:'domcontentloaded',timeout:30000});
 assert.equal(r.status(),200);
 await page.waitForSelector('#nxModePicker.nx-enhanced',{timeout:20000});
 await page.waitForFunction(()=>!document.body.classList.contains('nx-auth-checking'),{timeout:20000});
 await page.locator('#prompt').fill('Create a modern multi-page website for Studio Helio with Home, About, Services and Contact');
 await page.locator('#send').click();
 try{await page.waitForSelector('.nx-project-card',{timeout:9000})}catch(e){const state=await page.evaluate(()=>({messages:document.querySelector('#messages')?.innerText?.slice(-1500),projectCard:document.querySelectorAll('.nx-project-card').length,oldCard:document.querySelectorAll('.nx-site-card').length,errors:document.body.innerText.slice(-500)}));console.log('PROJECT STUDIO UI STATE',JSON.stringify(state));throw e}
 assert.match(await page.locator('.nx-project-card').innerText(),/4 linked pages/);
 await page.locator('.nx-project-card button').first().click();
 await page.waitForSelector('.nx-project-overlay');
 assert.deepEqual(await page.locator('.nx-project-pages option').allTextContents(),['Home','About','Services','Contact']);
 const frame=page.locator('.nx-site-frame');
 assert.equal(await frame.getAttribute('sandbox'),'allow-scripts');
 assert.match(await page.frameLocator('.nx-site-frame').locator('h1').innerText(),/Studio Helio — Home/);
 if(width<=750){await page.frameLocator('.nx-site-frame').locator('.nx-project-mobile summary').click();await page.frameLocator('.nx-site-frame').locator('.nx-project-mobile a[href="about.html"]').click();}
 else await page.frameLocator('.nx-site-frame').locator('.nx-project-desktop a[href="about.html"]').click();
 await page.waitForFunction(()=>document.querySelector('.nx-project-pages')?.value==='about.html',{timeout:10000});
 assert.match(await page.frameLocator('.nx-site-frame').locator('h1').innerText(),/Studio Helio — About/);
 await page.locator('.nx-project-pages').selectOption('services.html');
 assert.match(await page.frameLocator('.nx-site-frame').locator('h1').innerText(),/Studio Helio — Services/);
 await page.getByRole('button',{name:'Phone'}).click();
 const dims=await frame.boundingBox();assert.ok(dims.width<=390,'phone preview must be <=390px');
 const downloadPromise=page.waitForEvent('download');
 await page.locator('.nx-project-toolbar button').filter({hasText:'ZIP'}).click();
 const download=await downloadPromise;
 assert.match(download.suggestedFilename(),/\.zip$/);
 const file=join(dir,'website-'+width+'.zip');await download.saveAs(file);
 const entries=execFileSync('unzip',['-Z1',file],{encoding:'utf8'}).trim().split('\n');
 assert.deepEqual(entries,['index.html','about.html','services.html','contact.html','README.txt']);
 const about=execFileSync('unzip',['-p',file,'about.html'],{encoding:'utf8'});
 assert.ok(about.includes('href="contact.html"'));
 assert.ok(about.includes('Studio Helio — About'));
 await page.locator('.nx-site-close').click();
 await page.locator('.nx-project-card button').filter({hasText:'Add page'}).click();
 await page.locator('#prompt').fill('Create a new Pricing page with clear packages');
 await page.locator('#send').click();
 await page.waitForFunction(()=>[...document.querySelectorAll('.nx-project-card')].some(x=>x.textContent?.includes('5 linked pages')),{timeout:20000});
 assert.equal(revisions,1,'follow-up must preserve project state');
 await page.locator('.nx-project-card').last().getByRole('button',{name:'Open website'}).click();
 await page.locator('.nx-project-pages').selectOption('pricing.html');
 assert.match(await page.frameLocator('.nx-site-frame').locator('h1').innerText(),/Studio Helio — Pricing/);
 const overflow=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,viewport:innerWidth}));
 assert.ok(overflow.scroll<=overflow.viewport+2,'NyX UI horizontal overflow at '+width);
 console.log('PASS '+width+'px: Home→About, Services, phone, 4-file ZIP, add Pricing, 5-page project');
 await context.close();
}
try{for(const width of [320,393,768,1280])await run(width)}
catch(e){console.error('V3 BROWSER ACCEPTANCE FAILED:',e.stack||String(e));process.exitCode=1}
finally{await browser.close();await rm(dir,{recursive:true,force:true})}
