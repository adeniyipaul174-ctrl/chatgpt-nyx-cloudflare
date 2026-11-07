import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
import {existsSync} from 'node:fs';
import {nxSiteSpec,nxSiteHTML} from '../workers/nyx-website-builder.mjs';

const BASE='https://nyx-website-studio-integration-stage.adeniyipaul174.workers.dev';
const candidates=['/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/usr/bin/chromium','/opt/google/chrome/chrome'];
const executablePath=candidates.find(existsSync);
if(!executablePath)throw Error('Chrome executable unavailable; website UI not tested');
const browser=await chromium.launch({headless:true,executablePath,args:['--no-sandbox','--disable-dev-shm-usage']});
const spec=nxSiteSpec({
 brand:'Vermont Book Club',
 heroTitle:'A new chapter begins together.',
 heroDescription:'A welcoming community for readers who believe books are better when shared.',
 servicesTitle:'A place for every reader.',
 features:[
  {title:'Author spotlights',description:'Meet the creative voices behind memorable stories.'},
  {title:'Reading together',description:'Explore books and perspectives with fellow readers.'},
  {title:'Thoughtful events',description:'Make space for conversations worth having.'}
 ]
},'Build a professional website for Vermont Book Club','editorial');
const mockResult={kind:'website',title:'Vermont Book Club',html:nxSiteHTML(spec),spec,generated:true,reply:'Created.'};
try{
 const health=await fetch(BASE+'/api/health');
 assert.equal(health.status,200,'stage Worker health endpoint');
 const blocked=await fetch(BASE+'/api/nyx/site/refine',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});
 assert.equal(blocked.status,403,'refine rejects missing CSRF header before auth');
 console.log('PASS public stage HTTP and refine CSRF rejection');
 for(const width of [320,393,768,1280]){
  const context=await browser.newContext({viewport:{width,height:835},acceptDownloads:true});
  const page=await context.newPage();
  await page.route('**/api/auth/me',route=>route.fulfill({
   status:200,contentType:'application/json',
   body:JSON.stringify({authenticated:true,user:{id:'nyx-site-browser-test',name:'Website Test',email:'test@example.invalid',provider:'password'}})
  }));
  let modePosted=null;
  await page.route('**/api/nyx',route=>{
   const payload=route.request().postDataJSON();
   modePosted=payload.agentMode;
   return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(mockResult)});
  });
  await page.route('**/api/nyx/site/refine',route=>{
   const req=route.request().postDataJSON();
   assert.ok(req.revision.includes('editorial'));
   assert.ok(req.previous?.brand);
   const change=nxSiteSpec({...spec,heroTitle:'A more beautiful literary world.'},spec.brief,'editorial');
   return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({kind:'website',html:nxSiteHTML(change),spec:change,title:change.brand,generated:true,theme:'editorial'})});
  });
  const resp=await page.goto(BASE+'/',{waitUntil:'domcontentloaded',timeout:30000});
  assert.equal(resp.status(),200);
  await page.waitForSelector('#nxModePicker.nx-enhanced');
  await page.waitForFunction(()=>!document.body.classList.contains('nx-auth-checking'),{timeout:12000});
  assert.ok(await page.locator('#nxWebsiteStudio').count(),'Website Studio UI bootstrapped');
  await page.locator('#prompt').fill('Build a professional website for Vermont Book Club');
  await page.locator('#send').click();
  await page.locator('.nx-site-card').waitFor({timeout:12000});
  assert.equal(modePosted,'auto');
  assert.match(await page.locator('.nx-site-card').innerText(),/Vermont Book Club/);
  await page.locator('.nx-site-card-actions button').first().click();
  await page.locator('#nxWebsiteStudio.open').waitFor();
  const geometry=await page.evaluate(()=>{
    const modal=document.getElementById('nxWebsiteStudio'),r=modal.getBoundingClientRect();
    return {width:window.innerWidth,docWidth:document.documentElement.scrollWidth,modalWidth:r.width,right:r.right,
     frameSandbox:document.getElementById('nxStudioFrame').getAttribute('sandbox')};
  });
  assert.equal(geometry.frameSandbox,'allow-scripts');
  assert.ok(geometry.docWidth<=width+2,'site studio caused horizontal page overflow at '+width);
  assert.ok(geometry.right<=width+1,'modal exceeds viewport at '+width);
  const iframe=page.frameLocator('#nxStudioFrame');
  await iframe.locator('h1').waitFor({timeout:12000});
  assert.match(await iframe.locator('h1').innerText(),/A new chapter/);
  assert.ok(await iframe.locator('#services').count());
  assert.ok(await iframe.locator('#contact').count());
  if(width>=650){
   await page.locator('[data-nx-site-action="mobile"]').click();
   assert.ok(await page.locator('#nxStudioViewport').evaluate(el=>el.classList.contains('mobile')));
  }
  await page.locator('[data-nx-site-action="code"]').click();
  const textarea=page.locator('#nxStudioSource');
  const html=await textarea.inputValue();
  assert.ok(html.includes('<!DOCTYPE html>'));
  await textarea.fill(html.replace('A new chapter begins together.','A fresh chapter begins together.'));
  await page.locator('#nxStudioApply').click();
  await iframe.locator('h1').filter({hasText:'A fresh chapter'}).waitFor({timeout:12000});
  assert.match(await iframe.locator('h1').innerText(),/A fresh chapter/);
  const downloadPromise=page.waitForEvent('download');
  await page.locator('[data-nx-site-action="download"]').click();
  const download=await downloadPromise;
  assert.match(download.suggestedFilename(),/vermont-book-club-website\.html/);
  if(width===393){
    await page.locator('#nxStudioChange').fill('Make the headline more editorial and expressive');
    await page.locator('#nxStudioRefine').click();
    await page.waitForFunction(()=>document.querySelector('#nxStudioStatus')?.textContent?.includes('updated'),{timeout:12000});
    assert.match(await iframe.locator('h1').innerText(),/literary world/);
    await page.locator('[data-nx-site-action="close"]').click();
    await page.reload({waitUntil:'domcontentloaded'});
    await page.waitForSelector('#nxModePicker.nx-enhanced');
    await page.locator('.nx-site-card-actions button').first().click();
    await page.locator('#nxWebsiteStudio.open').waitFor();
    assert.match(await iframe.locator('h1').innerText(),/literary world/);
  }
  console.log('PASS Website Studio create/preview/code/export at '+width+'px');
  await context.close();
 }
 console.log('PASS Website Studio browser acceptance across all viewports');
}catch(err){console.error('WEBSITE STUDIO BROWSER ACCEPTANCE FAILED',err.stack||err);process.exitCode=1}
finally{await browser.close()}
