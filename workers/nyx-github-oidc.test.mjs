import assert from 'node:assert/strict';
import {test} from 'node:test';
import {generateKeyPairSync,sign} from 'node:crypto';
import {nxGhVerifyToken,nxGhHandleInference} from './nyx-github-oidc.mjs';
const {privateKey,publicKey}=generateKeyPairSync('rsa',{modulusLength:2048});
const jwk=publicKey.export({format:'jwk'});
const fake=async()=>new Response(JSON.stringify({keys:[{...jwk,use:'sig',kid:'demo'}]}),{status:200});
const b=v=>Buffer.from(JSON.stringify(v)).toString('base64url');
function token(overrides={}){
 const now=Math.floor(Date.now()/1000);
 const body={
  iss:'https://token.actions.githubusercontent.com',aud:'nyx-github-agents',
  sub:'repo:adeniyipaul174-ctrl/chatgpt-nyx-cloudflare:ref:refs/heads/feature/openmausbot-integration',
  repository:'adeniyipaul174-ctrl/chatgpt-nyx-cloudflare',repository_id:'1416429008',repository_owner_id:'290501831',
  ref:'refs/heads/feature/openmausbot-integration',
  workflow_ref:'adeniyipaul174-ctrl/chatgpt-nyx-cloudflare/.github/workflows/github-agents-on-demand.yml@refs/heads/feature/openmausbot-integration',
  event_name:'push',run_id:'123',iat:now,exp:now+250,...overrides
 };
 const p=b({alg:'RS256',kid:'demo'})+'.'+b(body);
 return p+'.'+sign('RSA-SHA256',Buffer.from(p),privateKey).toString('base64url');
}
test('accepts valid GitHub signed OIDC and pinned workflow',async()=>{
 assert.equal((await nxGhVerifyToken(token(),fake))?.run_id,'123');
});
test('rejects forged or out-of-scope identities',async()=>{
 for(const overrides of [{repository_id:'99'},{aud:'incorrect'},{workflow_ref:'bad'},{exp:0},{ref:'refs/heads/main'}])
  assert.equal(await nxGhVerifyToken(token(overrides),fake),null);
 const t=token();assert.equal(await nxGhVerifyToken(t.slice(0,-3)+'AAA',fake),null);
});
test('unauthenticated requests cannot use NyX AI',async()=>{
 const req=new Request('https://nyx.test/api/nyx/github-agents/infer',{method:'POST',body:'{}'});
 assert.equal((await nxGhHandleInference(req,{AI:{}},fake)).status,401);
});
test('signed task invokes the model and returns only a response',async()=>{
 const req=new Request('https://nyx.test/api/nyx/github-agents/infer',{method:'POST',headers:{Authorization:'Bearer '+token(),'Content-Type':'application/json'},body:JSON.stringify({agent:'planner',content:'Plan test steps'})});
 const res=await nxGhHandleInference(req,{AI:{run:async()=>({response:'Plan complete'})}},fake);
 assert.equal(res.status,200);
 assert.equal((await res.json()).choices[0].message.content,'Plan complete');
});
