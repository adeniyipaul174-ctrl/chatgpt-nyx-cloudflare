// Inspect the actual AI-generated HTML from the signed staging run at real widths.
// This test never logs in to a user's account and never changes production.
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {readFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {chromium} from 'playwright-core';
const path=resolve('nyx-agent-results/aurelia-bespoke-site.html');
assert.ok(existsSync(path),'Real generated website HTML artifact missing');
const source=await readFile(path,'utf8');
assert.ok(source.length>4800);
const executablePath=['/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/usr/bin/chromium'].find(existsSync);
assert.ok(executablePath,'Chrome required for the audit');
const browser=await chromium.launch({executablePath,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
await mkdir('nyx-agent-results',{recursive:true});
try{
 for(const width of [320,393,768,1440]){
  const context=await browser.newContext({viewport:{width,height:900},deviceScaleFactor:1});
  const page=await context.newPage();
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(pathToFileURL(path).href,{waitUntil:'domcontentloaded',timeout:30000});
  const status=await page.evaluate(()=>{
   const css=getComputedStyle(document.body);
   const bounds=document.querySelector('h1')?.getBoundingClientRect();
   return {viewport:innerWidth,scroll:document.documentElement.scrollWidth,background:css.backgroundColor,
    hero:{top:bounds?.top,right:bounds?.right,width:bounds?.width},
    sections:document.querySelectorAll('main section').length,navs:[...document.querySelectorAll('nav a[href^="#"]')].map(x=>({href:x.getAttribute('href'),exists:x.getAttribute('href')==='#'||!!document.querySelector(x.getAttribute('href'))}))};
  });
  assert.equal(errors.length,0,'page JS error');
  assert.ok(status.scroll<=width+3,'horizontal overflow at '+width+': '+JSON.stringify(status));
  assert.ok(status.hero.width>60&&status.hero.right<=width+3,'hero clipped at '+width);
  assert.ok(status.sections>=3,'not enough page sections');
  assert.ok(status.navs.every(x=>x.exists),'broken section links: '+JSON.stringify(status.navs));
  await page.screenshot({path:'nyx-agent-results/aurelia-'+width+'.png',fullPage:true});
  console.log('PASS custom website viewport '+width+'px, sections '+status.sections+', background '+status.background);
  await context.close();
 }
}finally{await browser.close()}
