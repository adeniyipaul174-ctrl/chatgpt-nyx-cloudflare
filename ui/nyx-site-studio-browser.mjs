import {chromium} from 'playwright-core';
import {existsSync} from 'node:fs';
import {nxSiteRenderHtml,nxSiteNormalize} from '../workers/nyx-site-studio.mjs';
import assert from 'node:assert/strict';
const BASE='https://nyx-site-studio-stage.adeniyipaul174.workers.dev';
const executablePath=[process.env.CHROME_PATH,'/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/usr/bin/chromium'].find(p=>p&&existsSync(p));
if(!executablePath)throw Error('Chrome unavailable; site studio browser test cannot pass');
const browser=await chromium.launch({headless:true,executablePath,args:['--no-sandbox','--disable-dev-shm-usage']});
const spec=nxSiteNormalize({
 brand:'Lumière Design Studio',theme:'blush',category:'studio',eyebrow:'CONSIDERED BY DESIGN',
 headline:'Remarkable spaces.',highlight:'Made around you.',
 description:'Thoughtful interiors and creative direction, tailored to the way you live and work.',
 cta:'Start your project',features:[{title:'Interior styling',description:'Spaces you love.'},{title:'Design direction',description:'A bold visual vision.'},{title:'Personal consultation',description:'A tailored experience.'}]
});
const generated=nxSiteRenderHtml(spec);
async function run(width){
 const context=await browser.newContext({viewport:{width,height:850},acceptDownloads:true});
 const page=await context.newPage();
 let calls=0,revisionSeen=false;
 await page.route('**/api/auth/me',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({authenticated:true,user:{id:'mock-site-builder',name:'Test',email:'test@example.invalid',provider:'password'}})}));
 await page.route('**/api/nyx',route=>{
  const q=route.request().postDataJSON();calls++;
  if(calls>1){assert.equal(q.siteRevision.brand,'Lumière Design Studio');revisionSeen=true;}
  return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({kind:'website',reply:'Website ready for preview',siteSpec:spec,siteHtml:generated})});
 });
 const response=await page.goto(BASE+'/',{waitUntil:'domcontentloaded',timeout:25000});
 assert.equal(response.status(),200,'staged Worker should serve NyX');
 await page.waitForSelector('#nxModePicker.nx-enhanced',{timeout:20000});
 await page.waitForFunction(()=>!document.body.classList.contains('nx-auth-checking'),{timeout:15000});
 await page.locator('#prompt').fill('Create a beautiful website for an interior design studio');
 await page.locator('#send').click();
 await page.waitForSelector('.nx-site-card',{timeout:14000});
 assert.equal(calls,1);
 assert.match(await page.locator('.nx-site-card').innerText(),/Lumière Design Studio/);
 await page.locator('.nx-site-card button').first().click();
 await page.waitForSelector('.nx-site-overlay');
 const frame=page.locator('.nx-site-frame');
 assert.equal(await frame.getAttribute('sandbox'),'','preview must block script and forms');
 const desktop=await frame.boundingBox();
 assert.ok(desktop.width<=Math.max(1300,width));
 assert.match(await page.frameLocator('.nx-site-frame').locator('h1').innerText(),/Remarkable spaces/);
 await page.locator('.nx-site-toolbar-right button').filter({hasText:'Phone'}).click();
 const phone=await frame.boundingBox();
 assert.ok(phone.width<=391,'phone preview constrained');
 const download=page.waitForEvent('download');
 await page.locator('.nx-site-toolbar-right button').filter({hasText:'HTML'}).click();
 const file=await download;
 assert.match(file.suggestedFilename(),/lumi-re-design-studio|lumi-re|design-studio|html/i);
 assert.match(file.suggestedFilename(),/\.html$/);
 await page.locator('.nx-site-close').click();
 assert.equal(await page.locator('.nx-site-overlay').count(),0);
 await page.locator('.nx-site-card .nx-site-action.secondary').first().click();
 assert.match(await page.locator('#prompt').inputValue(),/Improve this website:/);
 await page.locator('#prompt').fill('Improve this website: use a darker theme');
 await page.locator('#send').click();
 await page.waitForFunction(()=>document.querySelectorAll('.nx-site-card').length>=2,{timeout:15000});
 assert.ok(revisionSeen,'follow-up should carry structured previous design');
 const overflow=await page.evaluate(()=>({full:document.documentElement.scrollWidth,viewport:innerWidth}));
 assert.ok(overflow.full<=overflow.viewport+1,'NyX must not overflow on mobile');
 console.log('PASS website create/preview/phone/download/revise at '+width+'px');
 await context.close();
}
try{for(const width of [360,393,768,1280])await run(width)}
catch(e){console.error('STUDIO BROWSER TEST FAILED: '+(e?.stack||e));process.exitCode=1}
finally{await browser.close()}
