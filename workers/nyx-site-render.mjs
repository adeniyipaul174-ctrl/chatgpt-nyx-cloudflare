import {normalizeSite,SITE_PALETTES,siteEscape} from "./nyx-site-spec.mjs";
import {siteCSS} from "./nyx-site-css.mjs";
const esc=(v,n=170)=>siteEscape(typeof v==="string"?v.slice(0,n):"");
export function renderWebsite(spec){
 const s=normalizeSite(spec),pal=SITE_PALETTES[s.theme],brand=esc(s.brand,55);
 const features=s.features.map((x,i)=>'<article class="feature"><div class="feature-icon">✳</div><small>0'+(i+1)+'</small><h3>'+esc(x.title,85)+'</h3><p>'+esc(x.text,185)+'</p></article>').join("");
 const steps=s.steps.map((x,i)=>'<div class="step"><b>0'+(i+1)+'</b><div><h3>'+esc(x.title,85)+'</h3><p>'+esc(x.text,185)+'</p></div></div>').join("");
 const faqs=s.faq.map(x=>'<details><summary>'+esc(x.title,85)+'<span aria-hidden="true">+</span></summary><p>'+esc(x.text,185)+'</p></details>').join("");
 const terms=esc(s.hero.title,110).split(/\s+/),breakAt=Math.ceil(terms.length/2);
 const headline=terms.slice(0,breakAt).join(" ")+'<em>'+terms.slice(breakAt).join(" ")+'</em>';
 const art='<svg viewBox="0 0 500 470" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><circle cx="250" cy="235" r="154" fill="var(--accent)" opacity=".16"/><circle cx="250" cy="235" r="115" fill="none" stroke="var(--accent)" stroke-width="1.5" opacity=".6"/><path d="M40 359C145 44 338 160 460 71" fill="none" stroke="var(--accent)" stroke-width="2"/><path d="m116 100 40-40 40 40-40 40Z" fill="var(--accent2)"/><circle cx="405" cy="332" r="58" fill="var(--accent2)" opacity=".8"/><path d="M188 173h119v119H188z" transform="rotate(22 248 233)" fill="none" stroke="var(--accent)" stroke-width="2"/></svg>';
 const mail=s.contact.email?'<a class="email" href="mailto:'+esc(s.contact.email,100)+'">'+esc(s.contact.email,100)+' ↗</a>':'<a class="email" href="#top">Back to the beginning ↗</a>';
 const script='(function(){var b=document.querySelector(".mobile-menu"),n=document.querySelector(".nav-links");if(!b||!n)return;b.addEventListener("click",function(){var open=n.classList.toggle("open");b.setAttribute("aria-expanded",String(open))});n.querySelectorAll("a").forEach(function(a){a.addEventListener("click",function(){n.classList.remove("open");b.setAttribute("aria-expanded","false")})})})();';
 const html=[
 '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">',
 '<meta name="description" content="',esc(s.hero.text,185),'"><meta name="theme-color" content="',pal[0],'"><title>',brand,' — ',esc(s.hero.title,110),'</title><style>',siteCSS(pal),'</style></head><body id="top">',
 '<header><nav class="shell nav" aria-label="Main navigation"><a class="brand" href="#top">',brand,'<i aria-hidden="true"></i></a><button class="mobile-menu" type="button" aria-label="Toggle navigation" aria-controls="navigation" aria-expanded="false">☰</button><div id="navigation" class="nav-links"><a href="#services">Services</a><a href="#process">Process</a><a href="#questions">FAQs</a><a class="nav-cta" href="#contact">Get in touch ↗</a></div></nav></header>',
 '<main><section class="shell hero"><div class="hero-copy"><span class="eyebrow">',esc(s.eyebrow,48),'</span><h1>',headline,'</h1><p class="lede">',esc(s.hero.text,260),'</p><div class="buttons"><a class="btn primary" href="#services">',esc(s.hero.primary,36),' ↗</a><a class="btn outline" href="#process">',esc(s.hero.secondary,36),' →</a></div><div class="hero-note"><b>✳</b><span>Purposeful. Original. Human.</span></div></div>',
 '<div class="hero-visual" aria-label="Abstract illustrated layout" role="img"><div class="orb"></div><div class="browser"><div class="browser-bar"><i></i><i></i><i></i><small>DESIGN / 01</small></div><div class="browser-brand">',brand,'</div><div class="visual-art">',art,'</div><div class="visual-caption">Make it meaningful.</div></div><div class="float-card"><span>CONSIDERED DESIGN</span><strong>Every detail counts.</strong></div></div></section>',
 '<section id="services" class="section alt"><div class="shell"><div class="section-top"><div><span class="eyebrow">THE DIFFERENCE</span><h2>Not just beautiful.<br><i>Beautifully considered.</i></h2></div><p>An experience that feels as good as it looks.</p></div><div class="features">',features,'</div></div></section>',
 '<section id="process" class="section"><div class="shell split"><div><span class="eyebrow">OUR APPROACH</span><h2>Big-picture thinking.<br>Small-detail care.</h2><p class="intro">The right way forward starts with understanding what really matters.</p><div class="steps">',steps,'</div></div><div class="large-art"><div class="art-rings"></div><span>&amp;</span><small>CRAFTED WITH INTENTION</small></div></div></section>',
 '<section class="statement"><div class="shell"><span class="eyebrow">OUR POINT OF VIEW</span><h2>',esc(s.story.title,100),'</h2><p>',esc(s.story.text,230),'</p></div></section>',
 '<section id="questions" class="section"><div class="shell faq-layout"><div><span class="eyebrow">GOOD TO KNOW</span><h2>Curious?<br>We get it.</h2></div><div class="faq">',faqs,'</div></div></section></main>',
 '<footer id="contact"><div class="shell foot"><div><span class="eyebrow">LET’S TALK</span><h2>',esc(s.contact.title,92),'</h2><p>',esc(s.contact.text,180),'</p></div><div>',mail,'</div></div><div class="shell bottom"><b>',brand,'</b><small>© ',String(new Date().getFullYear()),' · Crafted with intention.</small><a href="#top">Back to top ↑</a></div></footer>',
 '<script>',script,'<\/script></body></html>'
 ].join("");
 if(html.length>100000)throw Error("Website export is too large.");
 return html;
}
