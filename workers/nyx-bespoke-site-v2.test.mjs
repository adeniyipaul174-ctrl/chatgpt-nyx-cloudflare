import test from 'node:test';
import assert from 'node:assert/strict';
import {nxBespokePlan,nxBespokeClean,nxBespokeCheck,nxWebsiteBuildBespoke} from './nyx-bespoke-site-v2.mjs';
const palette=(background='#111827',accent='#f43f5e')=>({background,text:'#f7f6f2',accent,surface:'#273345',muted:'#d0d0d0'});
function planFor(brief,brand='Atelier',colors=palette(),types=['hero','gallery','editorial','contact']){
 return {brand,industry:'creative',concept:'Asymmetric architectural grid and immersive editorial type',composition:'Large offset art, tall split hero',palette:colors,headingFont:'Playfair Display',bodyFont:'Manrope',sections:types.map((type,i)=>({type,title:'Section '+i,purpose:type,composition:'bespoke '+type})),imageArt:'Editorial'};
}
function htmlFor(plan,distinct='split'){
 const c=plan.palette;
 const customCss=':root{--bg:'+c.background+';--ink:'+c.text+';--accent:'+c.accent+';--surface:'+c.surface+';--muted:'+c.muted+'}.page{max-width:1200px;margin:auto}.hero{display:grid;grid-template-columns:1fr 1.1fr}.image{border-radius:20px}body{background:var(--bg);color:var(--ink)}@media(max-width:720px){.hero{grid-template-columns:1fr}}';
 return '<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+plan.brand+'</title><style>'+customCss+'</style></head><body><header><nav><a href="#home">Home</a><a href="#work">Work</a><a href="#contact">Contact</a></nav></header><main id="home">'+
 '<section class="'+distinct+'"><h1>'+plan.brand+' — architecture meets imagination</h1><p>'+('Beautiful and specific work. ').repeat(35)+'</p></section>'+
 '<section id="work"><h2>Selected work</h2><p>'+('Thoughtful design for real people. ').repeat(50)+'</p></section>'+
 '<section id="contact"><h2>Begin a conversation</h2><p>'+('Speak about the project and its requirements. ').repeat(50)+'</p></section>'+
 '<section><h2>Our approach</h2><p>'+('Every brief deserves considered details. ').repeat(48)+'</p></section></main><footer>© '+plan.brand+'</footer></body></html>';
}
test('user colors and business-specific architectures differ',()=>{
 const a=nxBespokePlan(planFor('Aurelia Studio','Aurelia Studio',palette('#fff8f2','#b66a50'),['editorial','projects','story','contact']), 'Build a website for Aurelia Studio with #fff8f2 and #b66a50');
 const b=nxBespokePlan(planFor('Flux AI','Flux AI',palette('#071b3a','#39c7ee'),['product','features','integrations','pricing']), 'Build a SaaS website for Flux AI with #071b3a and #39c7ee');
 assert.notDeepEqual(a.palette,b.palette);assert.notDeepEqual(a.sections,b.sections);
 const one=htmlFor(a),two=htmlFor(b,'centered');
 assert.equal(nxBespokeCheck(one,a).valid,true);
 assert.equal(nxBespokeCheck(two,b).valid,true);
 assert.notEqual(one,two);
 assert.equal(nxBespokeCheck(one,b).valid,false);
});
test('reject missing requirements instead of substituting old default theme',()=>{
 const a=nxBespokePlan(planFor('Custom brief'), 'Create a website for Custom brief');
 for(const bad of ['hello','<html></html>','<!doctype html><html lang="en"><body><script>alert(1)</script></body></html>']){
  const q=nxBespokeCheck(bad,a);assert.equal(q.valid,false);
 }
 assert.throws(()=>nxBespokeClean('Unfinished output without closing HTML'),/unfinished/);
});
test('reject scripts, external images, remote links and unsafe CSS',()=>{
 const p=nxBespokePlan(planFor('Test'), 'Create a website for Test');
 const h=htmlFor(p);
 assert.ok(nxBespokeCheck(h,p).valid);
 assert.equal(nxBespokeCheck(h.replace('</body>','<script>alert(1)</script></body>'),p).valid,false);
 assert.equal(nxBespokeCheck(h.replace('</body>','<img src="https://evil.example/exfil"></body>'),p).valid,false);
 assert.equal(nxBespokeCheck(h.replace('href="#contact"','href="javascript:alert(1)"'),p).valid,false);
 assert.equal(nxBespokeCheck(h.replace('</style>','@import "https://evil.example/a.css";</style>'),p).valid,false);
});
test('two-model design-then-code execution preserves detailed prompt',async()=>{
 const plan=planFor('Test','Aurelia Studio',palette('#fff8f2','#b66a50'));
 const seen=[];
 const fake={AI:{run:async(name,input)=>{
  seen.push({name,input});
  return {response:seen.length===1?JSON.stringify(plan):htmlFor({...plan,brand:'Aurelia Studio'})};
 }}};
 const result=await nxWebsiteBuildBespoke(fake,'Create a website for Aurelia Studio with #fff8f2 and #b66a50');
 assert.equal(result.siteSpec.brand,'Aurelia Studio');assert.match(result.siteHtml,/Aurelia Studio/);
 assert.equal(result.siteSpec.engine,'bespoke-code-v2');
 assert.equal(seen.length,3); // director, coder, independent design reviewer
 assert.match(seen[1].input.messages[1].content,/#fff8f2/);
});
test('invalid code retries exactly once then fails visibly',async()=>{
 let i=0;const fake={AI:{run:async()=>{i++;return {response:i===1?JSON.stringify(planFor('X')):'<html>bad page</html>'}}}};
 await assert.rejects(()=>nxWebsiteBuildBespoke(fake,'Build a beautiful website for a studio'),/unfinished|did not meet/);
 assert.equal(i,3);
});

test('exact quoted client headings cannot be silently paraphrased',()=>{
 const brief='Build a website for a creative agency. Heading must say "We Create Brands That Leave a Lasting Impression."';
 const p=nxBespokePlan(planFor(brief,'Creative Agency'),brief);
 assert.deepEqual(p.exactPhrases,['We Create Brands That Leave a Lasting Impression.']);
 assert.equal(nxBespokeCheck(htmlFor({...p,brand:'Creative Agency'}),p).valid,false);
});

test('safe Google Fonts and HTML-escaped Unsplash URLs pass; unquoted URLs fail',()=>{
 const p=nxBespokePlan(planFor('Test'),'Build a new professional website for Test');
 const plain=htmlFor(p);
 const safe=plain.replace('</head>','<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;700&amp;display=swap"></head>')
   .replace('</body>','<img src="https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&amp;fit=crop&amp;w=1400&amp;q=82" alt="studio"></body>');
 assert.equal(nxBespokeCheck(safe,p).valid,true);
 assert.equal(nxBespokeCheck(plain.replace('</body>','<img src=javascript:alert(1)></body>'),p).valid,false);
});
