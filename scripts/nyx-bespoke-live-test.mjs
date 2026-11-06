// One-shot end-to-end test of NyX bespoke website generation on staging.
// Signed GitHub Actions OIDC is accepted only by the designated staging route.
// The sample brief is public; never use real customer details in CI logs.
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {githubOidcToken} from './nyx-github-agents.mjs';
const url='https://nyx-bespoke-site-v2-stage.adeniyipaul174.workers.dev/__nyx/website-test';
const brief='Create a professional luxury website for AURELIA STUDIO, a creative branding and web design agency. Use background #f8f6f1, text #181818 and accent #b66a50 exactly. Use elegant editorial serif headings and a dramatic asymmetrical split hero with a large architectural photo. Include services for brand strategy, web design, creative direction, an About/Philosophy section, a three-step Discover-Design-Deliver process, and a final contact CTA. Hero heading exactly: "We Create Brands That Leave a Lasting Impression." Use tasteful spacing, refined photography, excellent mobile responsiveness, and functional section navigation. No fake testimonials, awards or numbers.';
const token=await githubOidcToken();
const abort=new AbortController();
const timer=setTimeout(()=>abort.abort(),420000);
try{
 const r=await fetch(url,{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({prompt:brief}),signal:abort.signal,redirect:'error'});
 const responseText=await r.text();
 if(!r.ok)throw Error('NyX bespoke generation returned HTTP '+r.status+': '+responseText.slice(0,350));
 const d=JSON.parse(responseText),html=d.siteHtml||'',spec=d.siteSpec;
 assert.equal(d.kind,'website');
 assert.equal(spec?.engine,'bespoke-code-v2');
 assert.ok(html.length>4800,'site is incomplete');
 assert.ok(html.toLowerCase().includes('aurelia studio'),'missing brand');
 assert.ok(html.includes('#f8f6f1')&&html.includes('#b66a50')&&html.includes('#181818'),'requested colors missing');
 assert.ok(html.toLowerCase().includes('we create brands that leave a lasting impression.'),'exact requested heading missing');
 assert.ok(html.toLowerCase().includes('</html>'),'site not complete');
 assert.ok((html.match(/<section\b/gi)||[]).length>=3,'not enough sections');
 assert.ok(!/<script\b/i.test(html),'unexpected script');
 assert.ok(/@media\s*(?:screen\s+and\s*)?\(/i.test(html),'no mobile styles');
 await mkdir('nyx-agent-results',{recursive:true});
 await writeFile('nyx-agent-results/aurelia-bespoke-site.html',html);
 await writeFile('nyx-agent-results/aurelia-bespoke-report.json',JSON.stringify({
  brand:spec.brand,sections:spec.sections,colors:spec.designPlan?.palette,
  composition:spec.designPlan?.composition,reviewScore:spec.reviewScore??null,htmlBytes:html.length
 },null,2));
 console.log('PASS real AI-designed site: brand '+spec.brand+', sections '+spec.sections+', HTML bytes '+html.length+', review '+spec.reviewScore);
}catch(err){console.error('BESPOKE LIVE MODEL TEST FAILED: '+(err?.message||String(err)));process.exitCode=1}
finally{clearTimeout(timer)}
