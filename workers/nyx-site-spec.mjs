/* NyX Website Builder — AI generates copy and selects a curated design. */
export const SITE_PALETTES={
 atelier:["#f8f5ee","#ffffff","#232825","#6a706c","#bb6951","#e8cbb7","#e1dbd1"],
 midnight:["#10131b","#1a1e29","#faf7fa","#a8acbc","#e9a0c4","#86659b","#353a47"],
 botanical:["#f3f5ed","#ffffff","#1c392e","#5b7368","#bc7540","#cdd9b4","#d6ded3"],
 digital:["#0c1430","#18213e","#f3f6ff","#b3c3e0","#83d5ff","#9a8cff","#364366"]
};
const clean=(v,n=150)=>typeof v==="string"?v.replace(/[\u0000-\u001f]/g," ").trim().slice(0,n):"";
export const siteEscape=v=>String(v==null?"":v).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");
const text=(a,b,n,fallback)=>clean(a||b,n)||fallback;
export function siteIntent(message,hasPrior=false){
 if(typeof message!=="string"||message.length>5000)return false;
 const q=message.trim();
 if(/^(?:what|why|how|where|explain|tell me|should|can i)\b/i.test(q)&&!/\b(?:create|build|design|make|generate)\b/i.test(q))return false;
 if(/^(?:\/website|@website|\/site)\b/i.test(q))return true;
 if(/\b(?:create|build|design|make|generate|develop|craft)\b[\s\S]{0,110}\b(?:website|web\s?site|web\s?page|landing\s?page|home\s?page|portfolio\s?site|online\s?store|business\s?site|shopfront)\b/i.test(q))return true;
 return hasPrior&&/^(?:make|change|edit|revise|update|redo|improve|add|remove|switch)\b/i.test(q)&&/\b(?:it|this|the|website|site|page|theme|color|colour|design|hero|font|background|section|layout)\b/i.test(q);
}
const fallback={
 features:[{title:"Made with intention",text:"A thoughtful approach to every experience."},{title:"Designed for people",text:"Clear, intuitive and built around what matters."},{title:"Distinct by design",text:"Memorable details with a considered point of view."}],
 steps:[{title:"Discover",text:"Understand your needs, audience and direction."},{title:"Create",text:"Shape the idea into something meaningful."},{title:"Refine",text:"Bring all the details together thoughtfully."}],
 faq:[{title:"How do we get started?",text:"Reach out using the details below and tell us what you need."},{title:"Can this be customized?",text:"Yes. The final approach depends on your goals and preferences."}]
};
export function normalizeSite(raw={},previous={}){
 const d=raw&&typeof raw==="object"&&!Array.isArray(raw)?raw:{},p=previous&&typeof previous==="object"?previous:{};
 const pair=(a,b,key,max)=>{
  const v=Array.isArray(a)&&a.length?a:Array.isArray(b)?b:[];
  const x=v.slice(0,max).filter(o=>o&&typeof o==="object").map(o=>({title:clean(o.title||o.q,85),text:clean(o.text||o.body||o.a,185)})).filter(o=>o.title&&o.text);
  return x.length>=2?x:fallback[key];
 };
 const h=d.hero||{},oldh=p.hero||{},c=d.contact||{},oldc=p.contact||{},st=d.story||{},oldst=p.story||{},email=clean(c.email||oldc.email,100);
 return {brand:text(d.brand,p.brand,55,"The Studio"),category:text(d.category,p.category,35,"creative"),
  theme:SITE_PALETTES[d.theme]?d.theme:SITE_PALETTES[p.theme]?p.theme:"atelier",
  eyebrow:text(d.eyebrow,p.eyebrow,48,"THOUGHTFULLY DESIGNED"),
  hero:{title:text(h.title,oldh.title,110,"Every great idea deserves to shine."),text:text(h.text,oldh.text,260,"Considered experiences, designed to make an impression."),primary:text(h.primary,oldh.primary,36,"Explore our work"),secondary:text(h.secondary,oldh.secondary,36,"Our approach")},
  features:pair(d.features,p.features,"features",4),steps:pair(d.steps,p.steps,"steps",3),faq:pair(d.faq,p.faq,"faq",3),
  story:{title:text(st.title,oldst.title,100,"Good ideas deserve beautiful design."),text:text(st.text,oldst.text,230,"More than aesthetics, we believe in creating something that feels right.")},
  contact:{title:text(c.title,oldc.title,92,"Let's create something remarkable."),text:text(c.text,oldc.text,180,"Tell us a little about what you have in mind."),
   email:/^[^\s@<>]+@[^\s@<>]+\.[a-z]{2,}$/i.test(email)?email:""}};
}
const system="You are a premium website art director. Respond ONLY with valid JSON object with keys: brand, category, theme (atelier|midnight|botanical|digital), eyebrow, hero {title,text,primary,secondary}, features [{title,text}], steps [{title,text}], story {title,text}, faq [{title,text}], contact {title,text,email}. Choose theme: atelier light editorial terracotta, midnight luxury charcoal pink, botanical organic sage, digital tech navy electric blue. Generate specific persuasive copy based on actual business, audience and requests. Use 3 features, 3 steps, 2 FAQs. Do not invent customer names, awards, reviews, statistics, addresses, working payments, bookings, websites or email addresses. Only use contact email explicitly given. No markup, no code fences, JSON only.";
export async function generateSiteSpec(env,prompt,previous=null,caller=null){
 if(typeof prompt!=="string"||prompt.trim().length<5||prompt.length>4000)throw Error("Describe the website in 5–4,000 characters.");
 const old=previous?normalizeSite(previous):null;
 const context=old?"Revise this website while preserving its brand unless changed. Existing spec: "+JSON.stringify(old).slice(0,5500)+"; change requested: "+prompt:"Create a premium, distinctive website for: "+prompt;
 const messages=[{role:"system",content:system},{role:"user",content:context}];
 let output;
 if(caller)output=await caller(messages);
 else{
  if(!env||!env.AI)throw Error("AI is not configured");
  try{output=await env.AI.run("@cf/meta/llama-3.3-70b-instruct-fp8-fast",{messages,max_tokens:1950,temperature:.45});}
  catch(err){
   if(!/capacity|unavailable|timeout|model|503|overloaded|3040/i.test(String(err&&err.message||"")))throw err;
   output=await env.AI.run("@cf/meta/llama-3.1-8b-instruct-fast",{messages,max_tokens:1600,temperature:.35});
  }
 }
 let s=typeof output==="string"?output:output&&output.response||output&&output.choices&&output.choices[0]&&output.choices[0].message&&output.choices[0].message.content||"";
 const start=s.indexOf("{"),end=s.lastIndexOf("}");
 let result;
 try{result=JSON.parse(s.slice(start,end+1))}catch{throw Error("Website generation returned an incomplete design. Retry with a shorter request.");}
 return normalizeSite(result,old);
}
