// Real deployed NyX HTML and UI test. Browser session is synthetic; no actual account cookies or credentials.
import {chromium} from 'playwright-core';
import {existsSync} from 'node:fs';
import assert from 'node:assert/strict';

const BASE='https://chatgpt-nyx-v3-test.adeniyipaul174.workers.dev';
const candidates=[process.env.CHROME_PATH,'/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/usr/bin/chromium','/opt/google/chrome/chrome'].filter(Boolean);
const executablePath=candidates.find(x=>existsSync(x));
if(!executablePath)throw Error('Headless Chrome not installed; UI not verified.');
const browser=await chromium.launch({executablePath,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const widths=[320,360,393,412,700,768,1024];
let count=0;
async function start(width){
 const context=await browser.newContext({viewport:{width,height:830},deviceScaleFactor:1});
 const page=await context.newPage();
 // Only intercept login status for visual/composer tests. Real session validation stays server-side.
 await page.route('**/api/auth/me',route=>route.fulfill({
   status:200,contentType:'application/json',
   body:JSON.stringify({authenticated:true,user:{id:'nyx_synthetic_test_only',name:'Visual Test',email:'test@example.invalid',provider:'password'}})
 }));
 // We never submit model requests to production on a fake session.
 await page.route('**/api/nyx',route=>route.fulfill({
   status:200,contentType:'application/json',body:JSON.stringify({kind:'text',reply:'Synthetic UI test response.'})
 }));
 const response=await page.goto(BASE+'/',{waitUntil:'domcontentloaded',timeout:30000});
 assert.equal(response.status(),200,'live NyX HTML status');
 await page.waitForSelector('#nxModePicker.nx-enhanced',{timeout:15000});
 await page.waitForFunction(()=>!document.body.classList.contains('nx-auth-checking'),{timeout:15000});
 return {context,page};
}
try{
 const status=await fetch(BASE+'/api/health');
 assert.equal(status.status,200,'live health endpoint');
 const health=await status.json();
 assert.equal(health.ok,true,'live health payload');
 console.log('Live public health endpoint OK (real HTTP)');
 const unauthorized=await fetch(BASE+'/api/nyx',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages:[{role:'user',content:'test'}]})});
 assert.equal(unauthorized.status,401,'normal chat must reject requests without a real login');
 console.log('Live chat authentication rejects unauthenticated posts (real HTTP)');

 for(const width of widths){
   const {page,context}=await start(width);
   const initial=await page.evaluate(()=>{
     const rect=sel=>{const e=document.querySelector(sel);if(!e)throw Error('Missing '+sel);const r=e.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,centerY:(r.top+r.bottom)/2,width:r.width,height:r.height}};
     return {viewport:window.innerWidth,scrollWidth:document.documentElement.scrollWidth,header:rect('.top'),brand:rect('.top>div:first-child'),actions:rect('.top>div:last-child'),picker:rect('#nxModeTrigger'),settings:rect('#settingsTop'),newChat:rect('#newTop'),menuIcon:rect('#menu')};
   });
   assert.equal(initial.viewport,width,'accurate viewport size');
   assert.ok(initial.scrollWidth<=width+1,'horizontal overflow at '+width+': '+JSON.stringify(initial));
   for(const key of ['picker','settings','newChat']){
     const v=initial[key];
     assert.ok(v.left>=-1&&v.right<=width+1,key+' clipped at '+width+': '+JSON.stringify(v));
     assert.ok(v.top>=initial.header.top-1&&v.bottom<=initial.header.bottom+1,key+' off header row at '+width+': '+JSON.stringify(initial));
     assert.ok(Math.abs(v.centerY-initial.picker.centerY)<8,key+' not aligned at '+width);
   }
   assert.ok(initial.actions.left>initial.brand.right-2,'brand overlaps controls at '+width);
   await page.locator('#nxModeTrigger').click();
   await page.waitForSelector('#nxModeMenu:not([hidden])');
   const menu=await page.evaluate(()=>{
     const e=document.getElementById('nxModeMenu');const r=e.getBoundingClientRect();
     const items=[...e.querySelectorAll('[data-nx-mode]')].map(item=>{let z=item.getBoundingClientRect();return {value:item.dataset.nxMode,left:z.left,right:z.right,top:z.top,bottom:z.bottom,display:getComputedStyle(item).display}});
     return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,items,innerWidth};
   });
   assert.ok(menu.left>=-1&&menu.right<=width+1,'menu clipped at '+width+': '+JSON.stringify(menu));
   assert.deepEqual(menu.items.map(x=>x.value),['auto','off','team','planner','writer','coder','reviewer']);
   for(let i=1;i<menu.items.length;i++)assert.ok(menu.items[i].top>=menu.items[i-1].bottom-1,'menu items overlap at '+width);
   assert.ok(menu.items.every(x=>x.display==='flex'),'menu items use flex rows');
   if(width===393||width===320||width===768){
     await page.locator('[data-nx-mode="reviewer"]').click();
     assert.equal(await page.locator('#nxChatAgentMode').inputValue(),'reviewer','native select synchronized');
     assert.equal(await page.locator('#nxModeLabel').innerText(),'Reviewer','custom trigger synchronized');
     assert.equal(await page.locator('#nxModeTrigger').getAttribute('aria-expanded'),'false','menu closes after click');
     assert.equal(await page.evaluate(()=>localStorage.getItem('nyx_chat_agent_mode_v1')),'reviewer','saved selection');
     await page.reload({waitUntil:'domcontentloaded'});
     await page.waitForSelector('#nxModePicker.nx-enhanced');
     assert.equal(await page.locator('#nxChatAgentMode').inputValue(),'reviewer','saved selection survives reload');
     await page.locator('#nxModeTrigger').click();
     await page.keyboard.press('Escape');
     assert.equal(await page.locator('#nxModeTrigger').getAttribute('aria-expanded'),'false','Escape closes menu');
   }
   console.log('PASS viewport='+width+' scroll='+initial.scrollWidth+' aligned=YES menu=YES selection=YES');
   count++;
   await context.close();
 }

 // Synthetic signed-in UI only. Capture body; production never receives a fake-auth AI request.
 const {page,context}=await start(393);
 const payloads=[];
 await page.unroute('**/api/nyx');
 await page.route('**/api/nyx',route=>{
   if(route.request().method()==='POST'){
     const data=route.request().postDataJSON();
     payloads.push({agentMode:data.agentMode,latest:data.messages?.at(-1)?.content});
   }
   return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({kind:'text',reply:'Synthetic UI test response.'})});
 });
 for(const mode of ['off','team','planner','writer','coder','reviewer','auto']){
   await page.locator('#nxModeTrigger').click();
   await page.locator('[data-nx-mode="'+mode+'"]').click();
   await page.locator('#prompt').fill('Please make a simple task list for this test');
   await page.locator('#send').click({timeout:5000});
   await page.waitForFunction(()=>document.querySelector('#send')&&!document.querySelector('#send').disabled,{timeout:12000});
 }
 const observed=payloads.map(p=>p.agentMode);
 assert.deepEqual(observed,['off','team','planner','writer','coder','reviewer','auto'],'normal chat sends every selected mode');
 console.log('PASS all seven agent choices reach existing normal-chat request JSON (mocked response)');
 await context.close();
 console.log('PASS TOTAL: '+(count+3));
}catch(err){console.error('NYX LIVE UI VERIFICATION FAILED:',err.stack||String(err));process.exitCode=1}
finally{await browser.close()}
