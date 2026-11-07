// Visual QA of the ACTUAL AI-produced website files, not mocked UI.
import {chromium} from 'playwright-core';
import {existsSync} from 'node:fs';
import {readFile,readdir} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
const executablePath=[process.env.CHROME_PATH,'/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/usr/bin/chromium'].find(x=>x&&existsSync(x));
assert.ok(executablePath,'Real Chrome is required for visual quality assurance');
const folder=resolve('nyx-agent-results/vector-v3');
const plan=JSON.parse(await readFile(join(folder,'plan.json'),'utf8'));
const files=(await readdir(folder)).filter(x=>/^[a-z0-9-]+\.html$/.test(x));
assert.ok(files.length>=3);
assert.ok(files.includes('index.html'));
const browser=await chromium.launch({executablePath,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
try{
 for(const width of [320,393,768,1440]){
  const context=await browser.newContext({viewport:{width,height:900},deviceScaleFactor:1});
  const page=await context.newPage();
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const file=join(folder,'index.html');
  await page.goto(pathToFileURL(file).href,{waitUntil:'domcontentloaded',timeout:30000});
  await page.waitForSelector('h1');
  const info=await page.evaluate(()=>{
   const h=document.querySelector('h1').getBoundingClientRect();
   const body=getComputedStyle(document.body),html=getComputedStyle(document.documentElement);
   return {width:innerWidth,scroll:document.documentElement.scrollWidth,h1:{left:h.left,right:h.right,width:h.width},
    bg:body.backgroundColor,rootBg:html.backgroundColor,nav:[...document.querySelectorAll('.nx-project-header a[href]')].map(x=>x.getAttribute('href'))};
  });
  assert.equal(errors.length,0,'unexpected page script error');
  assert.ok(info.scroll<=width+3,'horizontal overflow at '+width+': '+JSON.stringify(info));
  assert.ok(info.h1.width>80&&info.h1.left>=-4&&info.h1.right<=width+4,'main heading clipped at '+width+': '+JSON.stringify(info));
  for(const p of plan.pages)assert.ok(info.nav.includes(p.slug+'.html'),'missing real page navigation to '+p.slug);
  await page.screenshot({path:join(folder,'screenshot-'+width+'.png'),fullPage:false});
  if(files.length>1){
   const next=files.find(x=>x!=='index.html'),desktop=page.locator('.nx-project-desktop a[href="'+next+'"]');
   if(await desktop.isVisible())await desktop.click();
   else{await page.locator('.nx-project-mobile summary').click();await page.locator('.nx-project-mobile a[href="'+next+'"]').click()}
   await page.waitForURL(url=>url.pathname.endsWith('/'+next),{timeout:15000});
  }
  console.log('PASS actual AI website at '+width+'px: no horizontal overflow, visible heading, real multi-page links');
  await context.close();
 }
}finally{await browser.close()}
