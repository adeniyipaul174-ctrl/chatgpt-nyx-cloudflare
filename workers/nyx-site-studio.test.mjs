import test from 'node:test';
import assert from 'node:assert/strict';
import {nxWebsiteIntent,nxSiteNormalize,nxSiteEscape,nxSiteRenderHtml,nxWebsiteBuild} from './nyx-site-studio.mjs';
test('website requests are identified without hijacking ordinary questions',()=>{
 for(const x of ['Build a beautiful website for my store','Create a professional landing page for a designer','Design a portfolio website for my brand'])assert.equal(nxWebsiteIntent(x,null),true,x);
 for(const x of ['Hello NyX','How do websites work?','Explain how to create a website','Generate an image of a website','What is an online store?'])assert.equal(nxWebsiteIntent(x,null),false,x);
 assert.equal(nxWebsiteIntent('Change the design to midnight',null),false);
 assert.equal(nxWebsiteIntent('Change the design to midnight',{brand:'Demo'}),true);
});
test('untrusted model fields are escaped; links cannot execute code',()=>{
 const spec=nxSiteNormalize({brand:'<img src=x onerror=alert(1)>',headline:'<script>alert(7)</script>',ctaUrl:'javascript:alert(1)',theme:'<style>bad</style>',features:[{title:'<svg onload=1>',description:'okay'}]});
 const html=nxSiteRenderHtml(spec);
 assert.equal(spec.ctaUrl,'#contact');
 assert.equal(spec.theme,'editorial');
 assert.ok(!html.includes('<script>'));
 assert.ok(!html.includes('<img src=x onerror=alert(1)>'));
 assert.ok(!html.includes('<svg onload=1>'));
 assert.ok(html.includes('&lt;img'));
 assert.ok(!html.includes('javascript:'));
 assert.match(html,/name="viewport"/);
 assert.match(html,/@media\(max-width:700px\)/);
 assert.match(html,/<section id="contact"/);
 assert.match(html,/<nav class="nav"/);
});
test('every theme and category returns an exportable responsive document',()=>{
 for(const theme of ['editorial','midnight','ocean','blush','citrus'])for(const category of ['studio','food','travel','wellness','fashion','tech','education','business']){
  const s=nxSiteNormalize({brand:'Alpine Studio',theme,category});
  const html=nxSiteRenderHtml(s);
  assert.ok(html.startsWith('<!doctype html>'));
  assert.ok(html.length>5500);
  assert.ok(html.includes('Alpine Studio'));
  assert.ok(html.includes('https://images.unsplash.com/'));
  assert.equal((html.match(/<article class="card">/g)||[]).length,3);
 }
});
test('AI structured output becomes HTML with no arbitrary executable model markup',async()=>{
 const result=await nxWebsiteBuild({AI:{run:async()=>({response:JSON.stringify({
   brand:'Briar Atelier',theme:'blush',category:'studio',headline:'Remarkable design.',
   highlight:'Made for modern living.',cta:'Explore collections',ctaUrl:'https://example.org',
   features:[{title:'Art direction',description:'A visual identity with purpose'},{title:'Creative spaces',description:'Spaces that feel personal'},{title:'Partnerships',description:'Made together'}]
 })})}},'Create a website for Briar Atelier');
 assert.equal(result.kind,'website');
 assert.equal(result.siteSpec.brand,'Briar Atelier');
 assert.equal(result.siteSpec.theme,'blush');
 assert.match(result.siteHtml,/Remarkable design/);
 assert.match(result.siteHtml,/https:\/\/example\.org/);
 assert.ok(!result.siteHtml.includes('script src'));
});
test('client preview never grants scripts to an AI generated website',async()=>{
 const {readFile}=await import('node:fs/promises');
 const code=await readFile(new URL('../ui/nyx-site-studio-client.js',import.meta.url),'utf8');
 assert.match(code,/setAttribute\('sandbox',''\)/);
 assert.match(code,/setAttribute\('referrerpolicy','no-referrer'\)/);
 assert.match(code,/frame\.srcdoc=html/);
 assert.match(code,/new Blob/); // preview uses blob saved from generated site via NyX chat
});
