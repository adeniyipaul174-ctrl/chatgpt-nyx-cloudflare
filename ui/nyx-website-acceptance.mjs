// Acceptance for the staged NyX Website Builder. No real sign-in or API secrets used.
import {chromium} from "playwright-core";
import {existsSync} from "node:fs";
import assert from "node:assert/strict";
import {normalizeSite} from "../workers/nyx-site-spec.mjs";
import {renderWebsite} from "../workers/nyx-site-render.mjs";
const BASE="https://nyx-website-builder-stage.adeniyipaul174.workers.dev";
const executable=["/usr/bin/google-chrome","/usr/bin/chromium","/usr/bin/google-chrome-stable"].find(x=>existsSync(x));
if(!executable)throw Error("Browser unavailable; cannot verify website.");
const browser=await chromium.launch({executablePath:executable,headless:true,args:["--no-sandbox","--disable-dev-shm-usage"]});
const spec=normalizeSite({brand:"Morrow Creative",category:"studio",theme:"atelier",eyebrow:"THINK. DESIGN. INSPIRE.",
 hero:{title:"Better ideas, beautifully made.",text:"A boutique creative studio shaping brands that stand apart.",primary:"See our work",secondary:"Meet the studio"},
 features:[{title:"Art direction",text:"Visual storytelling that creates a lasting impression."},{title:"Digital design",text:"Responsive and meaningful experiences."},{title:"Brand identity",text:"A visual language that feels unmistakably yours."}],
 steps:[{title:"Explore",text:"We listen to your ambition."},{title:"Create",text:"We design with clear intent."},{title:"Elevate",text:"We polish every detail."}],
 faq:[{title:"What do you create?",text:"Beautiful visual identities and digital experiences."},{title:"How do we begin?",text:"Contact us with a brief description of your project."}]});
const html=renderWebsite(spec),errors=[];
function check(n,v){assert.ok(v,n);console.log("PASS",n)}
try{
  for(const width of [360,393,768,1280]){
   const context=await browser.newContext({viewport:{width,height:880},acceptDownloads:true});
   const p=await context.newPage();
   await p.setContent(html,{waitUntil:"domcontentloaded"});
   const x=await p.evaluate(()=>({
    scrollWidth:document.documentElement.scrollWidth,viewport:innerWidth,brand:document.title,
    hero:document.querySelector("h1")?.textContent,features:document.querySelectorAll(".feature").length,
    menuDisplay:getComputedStyle(document.querySelector(".mobile-menu")).display
   }));
   check("generated site fits "+width,x.scrollWidth<=width+1);
   check("generated sections "+width,x.features===3&&x.hero.includes("Better ideas"));
   if(width<640){
    await p.locator(".mobile-menu").click();
    check("mobile navigation toggles",await p.locator(".nav-links").evaluate(x=>x.classList.contains("open")));
   }
   await context.close();
  }
  const context=await browser.newContext({viewport:{width:393,height:850},acceptDownloads:true});
  const page=await context.newPage();
  await page.route("**/api/auth/me",r=>r.fulfill({status:200,contentType:"application/json",body:JSON.stringify({authenticated:true,user:{id:"website_ui_test",name:"Studio Test",email:"test@example.invalid",provider:"password"}})}));
  let calls=0;
  await page.route("**/api/nyx",async route=>{
   if(route.request().method()!=="POST")return route.fallback();
   const body=route.request().postDataJSON();calls++;
   if(calls===1){check("new website prompt reaches chat",body.messages.at(-1).content.includes("Create a beautiful website"));}
   if(calls===2){check("revision includes previous design",body.siteSpec?.brand==="Morrow Creative");}
   const edited=calls>=2?normalizeSite({...spec,hero:{...spec.hero,title:"The next chapter looks even better."}}):spec;
   await route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({kind:"website",reply:"Your website is ready.",title:edited.brand,spec:edited,html:renderWebsite(edited)})});
  });
  const response=await page.goto(BASE+"/",{waitUntil:"domcontentloaded",timeout:30000});
  assert.equal(response.status(),200);
  await page.waitForSelector("#nxModePicker.nx-enhanced",{timeout:15000});
  await page.waitForFunction(()=>!document.body.classList.contains("nx-auth-checking"),{timeout:15000});
  check("staging chat loads",await page.locator("#prompt").count()===1);
  await page.locator("#prompt").fill("Create a beautiful website for Morrow Creative");
  await page.locator("#send").click();
  await page.locator("#messages .nxsite-result").waitFor({timeout:20000});
  check("site design result card visible",await page.locator("#messages .nxsite-result").isVisible());
  await page.locator(".nxsite-main-action").click();
  await page.locator("#nxSitePreviewDialog[open]").waitFor({timeout:10000});
  const frame=page.frameLocator("#nxSitePreviewDialog iframe");
  await frame.locator("h1").waitFor({timeout:12000});
  check("sandbox preview shows real website", (await frame.locator("h1").innerText()).includes("Better ideas"));
  await page.locator("#nxSitePreviewDialog button:has-text('Mobile')").click();
  check("preview switches to phone width",await page.locator(".nxsite-preview-shell.mobile").count()===1);
  await page.locator(".nxsite-dialog-close").click();
  const downloadPromise=page.waitForEvent("download",{timeout:15000});
  await page.locator(".nxsite-actions button:has-text('Download')").first().click();
  const download=await downloadPromise;
  check("HTML download provided",download.suggestedFilename().endsWith(".html"));
  await page.locator(".nxsite-actions button:has-text('Refine')").first().click();
  check("Refine fills composer", (await page.locator("#prompt").inputValue()).startsWith("Change this website:"));
  await page.locator("#prompt").fill("Change this website: make the headline more inspiring");
  await page.locator("#send").click();
  await page.waitForFunction(()=>document.querySelectorAll(".nxsite-result").length>=2,{timeout:20000});
  check("revision returned a second website",await page.locator(".nxsite-result").count()===2);
  check("two site-generation requests",calls===2);
  await context.close();
  console.log("PASS ALL NyX website studio browser tests");
}catch(err){console.error("WEBSITE STUDIO ACCEPTANCE FAILURE",err.stack||String(err));process.exitCode=1}
finally{await browser.close()}
