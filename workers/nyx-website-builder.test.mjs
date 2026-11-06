import test from 'node:test';
import assert from 'node:assert/strict';
import {nxSiteIntent,nxSiteSpec,nxSiteHTML,nxSiteBuild} from './nyx-website-builder.mjs';

test('only creation requests trigger the website builder',()=>{
 for(const p of ['Build a beautiful website for Vermont Book Club','Create an elegant landing page for a yoga studio','Design my online store','Make a portfolio site for a photographer'])
  assert.equal(nxSiteIntent(p),true,p);
 for(const p of ['How do I create a website?','Explain what a landing page is','Find websites for authors','Review my website','Hello','Create an image of a website','Create a logo'])
  assert.equal(nxSiteIntent(p),false,p);
});
test('site normalizes model copy and cannot inject HTML or script',()=>{
 const spec=nxSiteSpec({brand:'<img src=x onerror=alert(1)>',heroTitle:'Exquisite <script>alert(1)</script> design',features:[{title:'<b>First</b>',description:'Safe'}]},'Create a website for Vermont Book Club','editorial');
 const html=nxSiteHTML(spec);
 assert.ok(html.startsWith('<!DOCTYPE html>'));
 assert.match(html,/<meta name="viewport"/);
 assert.match(html,/@media\(max-width:700px\)/);
 assert.match(html,/id="navlinks"/);
 assert.ok(!html.includes('onerror='));
 assert.ok(!html.includes('<img src=x'));
 assert.ok(!html.includes('<script>alert(1)</script>'));
 assert.ok(!html.includes('https://cdn.jsdelivr.net'));
 assert.match(html,/placeholder/ig);
});
test('AI instructions and generated copy are part of an actual responsive HTML document',async()=>{
 let calls=0;
 const ai={run:async(model,payload)=>{
  calls++;
  assert.equal(model,'@cf/qwen/qwen2.5-coder-32b-instruct');
  assert.match(JSON.stringify(payload),/Vermont Book Club/);
  return {response:JSON.stringify({
   brand:'Vermont Book Club',eyebrow:'WHERE STORIES CONNECT',
   heroTitle:'Better books. More meaningful conversations.',
   heroDescription:'Discover stories worth sharing at Vermont Book Club.',
   servicesTitle:'Make room for a new chapter.',features:[
    {title:'Monthly reads',description:'Explore thoughtfully selected books.'},
    {title:'Author events',description:'Discover the creative process behind the page.'},
    {title:'Reader community',description:'Share interpretations and ideas together.'}
   ],aboutTitle:'A community built around books.',aboutText:'We bring stories and readers together.',
   ctaTitle:'Join the next chapter.'
  })}
 }};
 const r=await nxSiteBuild({AI:ai},{prompt:'Create an editorial website for Vermont Book Club',theme:'editorial'});
 assert.equal(calls,1);
 assert.equal(r.generated,true);
 assert.equal(r.kind,'website');
 assert.equal(r.title,'Vermont Book Club');
 assert.match(r.html,/Better books. More meaningful conversations./);
 assert.match(r.html,/Monthly reads/);
 assert.match(r.html,/footer/);
 assert.match(r.html,/mailto:hello@example.com/);
 assert.ok(r.html.length>9000&&r.html.length<150000);
});
test('bad model output produces complete fallback, without claiming AI-generated',async()=>{
 let calls=0;
 const r=await nxSiteBuild({AI:{run:async()=>{calls++;return {response:'broken model response'}}}},{prompt:'Build a portfolio website for a photographer'});
 assert.equal(calls,2);
 assert.equal(r.generated,false);
 assert.ok(r.html.includes('class="features"'));
 assert.ok(r.html.includes('class="cta"'));
 assert.ok(r.html.includes('class="mobile-nav"'));
});
test('handles all themes and preserves brand without fictional testimonials',()=>{
 for(const theme of ['graphite','editorial','ocean','nature','blush']){
  const spec=nxSiteSpec({brand:'Studio Meridian'},'Create a website for Studio Meridian',theme);
  const html=nxSiteHTML(spec);
  assert.equal(spec.theme,theme);
  assert.ok(html.includes('Studio Meridian'));
  assert.ok(!html.includes('5-star')&&!html.includes('Trusted by 10,000'));
 }
});
