import test from "node:test";
import assert from "node:assert/strict";
import {siteIntent,normalizeSite,generateSiteSpec,siteEscape,SITE_PALETTES} from "./nyx-site-spec.mjs";
import {renderWebsite} from "./nyx-site-render.mjs";
test("site intent does not steal explanations or unrelated image requests",()=>{
 for(const x of ["How do I make a website?","Explain website hosting","Draw me a logo","Review my existing website","What is HTML?"])
  assert.equal(siteIntent(x),false,x);
 for(const x of ["Create a beautiful website for my bakery","Build a professional landing page","Make an online store for Luna","/website for my consultancy"])
  assert.equal(siteIntent(x),true,x);
 assert.equal(siteIntent("Make it green",true),true);
 assert.equal(siteIntent("Make it green",false),false);
});
test("spec is bounded and prevents arbitrary email links, URLs and unsafe colors",()=>{
 const s=normalizeSite({brand:"<img onerror=alert(1)>",theme:"url(javascript:alert(1))",contact:{email:"x@evil.com?subject=<script>"},hero:{title:"<script>alert(1)</script>"},features:[{title:"<svg onload=alert(1)>",text:"hello"},{title:"Good feature",text:"Clear message"}]});
 assert.equal(s.theme,"atelier");
 assert.equal(s.contact.email,"");
 const page=renderWebsite(s);
 assert.ok(page.includes("&lt;img"));
 assert.ok(page.includes("&lt;script&gt;"));
 assert.ok(!page.includes("<script>alert(1)</script>"));
 assert.ok(!page.includes("onerror=alert(1)>"));
 assert.ok(page.includes("<!doctype html>"));
});
test("all palettes generate standalone accessible responsive HTML",()=>{
 for(const theme of Object.keys(SITE_PALETTES)){
  const page=renderWebsite(normalizeSite({theme,brand:"Morrow Studio"}));
  assert.ok(page.includes("Morrow Studio"),theme);
  assert.ok(page.includes('name="viewport"'),theme);
  assert.ok(page.includes('aria-label="Main navigation"'),theme);
  assert.ok(page.includes('id="navigation"'),theme);
  assert.ok(page.includes("@media(max-width:640px)"),theme);
  assert.ok(page.includes("prefers-reduced-motion"),theme);
  assert.ok(page.includes("class=\"mobile-menu\""),theme);
  assert.ok(page.includes("id=\"questions\""),theme);
  assert.ok(page.includes("id=\"contact\""),theme);
  assert.ok(page.length>12000&&page.length<100000,theme+" size");
  assert.ok(!page.includes("<script src="),theme);
  assert.ok(!page.includes("https://"),theme);
 }
});
test("AI generation keeps user supplied brand and supports editing existing design",async()=>{
 const first=await generateSiteSpec(null,"Create a website for Cedar Café",null,async()=>JSON.stringify({
  brand:"Cedar Café",category:"restaurant",theme:"botanical",hero:{title:"A little pause, perfectly brewed",text:"Coffee and community, every day.",primary:"Explore menu",secondary:"Our story"},
  features:[{title:"Fresh coffee",text:"Prepared with care."},{title:"Warm welcome",text:"Find your favorite corner."},{title:"Seasonal menu",text:"Made with good ingredients."}],
  steps:[{title:"Choose",text:"Find your favorite."},{title:"Order",text:"Let us prepare it."},{title:"Enjoy",text:"Take a quiet moment."}],
  faq:[{title:"Where are you located?",text:"Contact us to confirm the location."},{title:"What hours are you open?",text:"Please contact us for today's hours."}]
 }));
 assert.equal(first.brand,"Cedar Café");
 const second=await generateSiteSpec(null,"Change it to a dark premium style",first,async messages=>{
  assert.match(messages[1].content,/Cedar Café/);
  return JSON.stringify({theme:"midnight",brand:"Cedar Café",hero:{title:"An evening of exceptional coffee"}});
 });
 assert.equal(second.theme,"midnight");
 assert.equal(second.brand,"Cedar Café");
 assert.equal(second.features.length,3);
 assert.match(renderWebsite(second),/An evening of exceptional coffee/);
});
test("model failures are explicit rather than silently claiming a finished site",async()=>{
 await assert.rejects(()=>generateSiteSpec(null,"Create a professional website",null,async()=>"{not-json"),/incomplete design/);
});
test("escape helper cannot produce HTML",()=>{
 assert.equal(siteEscape("<script>&"),"&lt;script&gt;&amp;");
});
