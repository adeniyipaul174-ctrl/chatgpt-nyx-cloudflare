// GitHub Actions OIDC verifier and NyX Workers AI inference bridge.
// This source is also inserted (without export keywords) into the live NyX Worker.
const NX_GH_ISSUER='https://token.actions.githubusercontent.com';
const NX_GH_AUD='nyx-github-agents';
const NX_GH_REPO='adeniyipaul174-ctrl/chatgpt-nyx-cloudflare';
const NX_GH_REPO_ID='1416429008';
const NX_GH_OWNER_ID='290501831';
const NX_GH_REF='refs/heads/feature/openmausbot-integration';
const NX_GH_WORKFLOW=NX_GH_REPO+'/.github/workflows/github-agents-on-demand.yml@'+NX_GH_REF;
const NX_GH_JWKS_URL='https://token.actions.githubusercontent.com/.well-known/jwks';
const NX_GH_ROLES=Object.freeze({
 planner:'You are NyX Planner. Make practical ordered plans with checks. Do not pretend to have taken any action.',
 writer:'You are NyX Writer. Produce polished specific text. Never invent successful actions.',
 coder:'You are NyX Coder. Provide robust code, meaningful tests, limitations, and next steps. Never claim code was run.',
 reviewer:'You are NyX Reviewer. Evaluate drafts for factuality, security and clarity. State concrete corrections.'
});
let nxGhJwksCache=null,nxGhJwksAt=0;
function nxGhFrom64(part){
 if(typeof part!=='string'||!/^[A-Za-z0-9_-]+$/.test(part)||part.length>12000)throw Error('Bad JWT encoding');
 const bin=atob(part.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-part.length%4)%4));
 return Uint8Array.from(bin,c=>c.charCodeAt(0));
}
function nxGhDecodeJson(part){return JSON.parse(new TextDecoder().decode(nxGhFrom64(part)))}
async function nxGhGetKeys(fetchImpl,refresh){
 if(!refresh&&nxGhJwksCache&&Date.now()-nxGhJwksAt<600000)return nxGhJwksCache;
 const r=await fetchImpl(NX_GH_JWKS_URL,{redirect:'error',signal:AbortSignal.timeout(7000)});
 if(!r.ok)throw Error('No GitHub OIDC keys');
 const json=await r.json();
 if(!Array.isArray(json?.keys)||json.keys.length<1||json.keys.length>30)throw Error('Invalid OIDC keyset');
 nxGhJwksCache=json.keys;nxGhJwksAt=Date.now();return nxGhJwksCache;
}
export async function nxGhVerifyToken(value,fetchImpl=fetch){
 if(typeof value!=='string'||value.length>12000||value.length<80)return null;
 const parts=value.split('.');if(parts.length!==3)return null;
 try{
  const header=nxGhDecodeJson(parts[0]),body=nxGhDecodeJson(parts[1]);
  if(header?.alg!=='RS256'||typeof header.kid!=='string'||header.kid.length>200)return null;
  const keys=await nxGhGetKeys(fetchImpl,false);
  let key=keys.find(x=>x.kid===header.kid&&x.kty==='RSA'&&x.use!=='enc');
  if(!key){const fresh=await nxGhGetKeys(fetchImpl,true);key=fresh.find(x=>x.kid===header.kid&&x.kty==='RSA'&&x.use!=='enc')}
  if(!key)return null;
  const imported=await crypto.subtle.importKey('jwk',{kty:'RSA',n:key.n,e:key.e,ext:true},{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['verify']);
  const verified=await crypto.subtle.verify('RSASSA-PKCS1-v1_5',imported,nxGhFrom64(parts[2]),new TextEncoder().encode(parts[0]+'.'+parts[1]));
  if(!verified)return null;
  const now=Math.floor(Date.now()/1000),aud=Array.isArray(body.aud)?body.aud:[body.aud];
  if(body.iss!==NX_GH_ISSUER||!aud.includes(NX_GH_AUD)||
    !Number.isSafeInteger(body.iat)||!Number.isSafeInteger(body.exp)||
    body.exp<=now||body.exp-body.iat>600||body.iat>now+30||body.iat<now-600||
    (body.nbf!==undefined&&(!Number.isSafeInteger(body.nbf)||body.nbf>now+30))||
    body.repository!==NX_GH_REPO||String(body.repository_id)!==NX_GH_REPO_ID||
    String(body.repository_owner_id)!==NX_GH_OWNER_ID||body.ref!==NX_GH_REF||
    body.workflow_ref!==NX_GH_WORKFLOW||!['push','workflow_dispatch'].includes(body.event_name)||
    !['string','number'].includes(typeof body.run_id)||
    !String(body.sub||'').endsWith(':ref:'+NX_GH_REF))return null;
  return {repository:body.repository,run_id:String(body.run_id),event_name:body.event_name};
 }catch{return null}
}
function nxGhResponse(data,status=200){
 return Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
}
export async function nxGhHandleInference(request,env,fetchImpl=fetch){
 if(request.method!=='POST')return nxGhResponse({error:'Method not allowed'},405);
 const auth=request.headers.get('Authorization')||'';
 if(!auth.startsWith('Bearer '))return nxGhResponse({error:'GitHub Actions identity required'},401);
 const verified=await nxGhVerifyToken(auth.slice(7),fetchImpl);
 if(!verified)return nxGhResponse({error:'GitHub Actions identity rejected'},401);
 const length=request.headers.get('Content-Length');
 if(length&&(!/^\d+$/.test(length)||Number(length)>16000))return nxGhResponse({error:'Task too large'},413);
 const reader=request.body?.getReader();if(!reader)return nxGhResponse({error:'Missing body'},400);
 let total=0;const parts=[];
 while(true){const {done,value}=await reader.read();if(done)break;total+=value.byteLength;
  if(total>16000){await reader.cancel();return nxGhResponse({error:'Task too large'},413)}parts.push(value)}
 const combined=new Uint8Array(total);let pos=0;for(const p of parts){combined.set(p,pos);pos+=p.byteLength}
 let body;try{body=JSON.parse(new TextDecoder().decode(combined))}catch{return nxGhResponse({error:'Invalid JSON'},400)}
 const agent=typeof body?.agent==='string'?body.agent:'',content=typeof body?.content==='string'?body.content.trim():'';
 if(!Object.hasOwn(NX_GH_ROLES,agent)||!content||content.length>10000)return nxGhResponse({error:'Unsupported agent or invalid content'},400);
 if(!env.AI)return nxGhResponse({error:'NyX AI unavailable'},503);
 if(env.NYX_RATE){const gate=await env.NYX_RATE.limit({key:'gh-agent:'+verified.run_id});if(!gate.success)return nxGhResponse({error:'Rate limit reached'},429)}
 const payload={messages:[
  {role:'system',content:NX_GH_ROLES[agent]+' No shell tools are available. Avoid inventing actions.'},
  {role:'user',content}
 ],max_tokens:1100,temperature:agent==='reviewer'?0.2:0.45};
 try{
  let output;
  try{output=await env.AI.run('@cf/meta/llama-3.3-70b-instruct-fp8-fast',payload)}
  catch(e){if(!/capacity|unavailable|overloaded|3040|timeout|model|503/i.test(String(e?.message||'')))throw e;
    output=await env.AI.run('@cf/meta/llama-3.1-8b-instruct-fast',{...payload,max_tokens:800})}
  const reply=output?.response||output?.choices?.[0]?.message?.content;
  if(typeof reply!=='string'||!reply.trim())return nxGhResponse({error:'Empty AI result'},502);
  return nxGhResponse({choices:[{message:{content:reply.slice(0,12000)}}],provider:'NyX Cloudflare Workers AI'});
 }catch{return nxGhResponse({error:'NyX AI model unavailable or over quota'},503)}
}
