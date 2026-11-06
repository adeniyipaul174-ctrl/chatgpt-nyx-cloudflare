/**
 * NyX GitHub Agent Runner: on-demand, stateless port of NyX agent-team workflow.
 * GitHub Actions + GitHub Models. No permanent server, shell, or desktop control.
 * No third-party dependencies and no token logging.
 */
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';

export const MODEL_ENDPOINT='https://nyx-agent-team-stage.adeniyipaul174.workers.dev/api/nyx/github-agents/infer';
export const DEFAULT_MODEL='nyx-workers-ai';
const PROMPTS=Object.freeze({
 planner:'You are NyX Planner. Produce a specific, practical plan. State assumptions, ordered actions, and success checks. Never claim an action was performed.',
 writer:'You are NyX Writer. Create the requested output using the plan and original user request. Write with specificity, not boilerplate. Do not invent facts, credentials or completed actions.',
 coder:'You are NyX Coder. Design robust testable code and identify limits. Provide verification steps. Do not pretend to have executed code.',
 reviewer:'You are NyX Reviewer. Evaluate the draft critically for factuality, security, completeness and usability. Identify concrete corrections.'
});
export function validateTask(input) {
 if(typeof input!=='string')throw Error('Task must be text.');
 const task=input.trim();if(task.length<2||task.length>4000)throw Error('Task must contain 2–4000 characters.');return task;
}
export function validateMode(input) {
 const mode=String(input||'team').trim().toLowerCase();
 if(!['team','planner','writer','coder','reviewer'].includes(mode))throw Error('Invalid mode.');
 return mode;
}
const ACCEPTED_ENDPOINTS=new Set([
 'https://nyx-agent-team-stage.adeniyipaul174.workers.dev/api/nyx/github-agents/infer',
 'https://chatgpt-nyx-v3-test.adeniyipaul174.workers.dev/api/nyx/github-agents/infer'
]);
export async function githubOidcToken(fetchImpl=fetch,env=process.env) {
 const rawUrl=env.ACTIONS_ID_TOKEN_REQUEST_URL,requestToken=env.ACTIONS_ID_TOKEN_REQUEST_TOKEN;
 if(!rawUrl||!requestToken)throw Error('This action requires GitHub Actions OIDC (id-token: write).');
 const url=new URL(rawUrl);url.searchParams.set('audience','nyx-github-agents');
 const response=await fetchImpl(url.toString(),{headers:{Authorization:'bearer '+requestToken},redirect:'error'});
 if(!response.ok)throw Error('GitHub Actions could not mint the requested OIDC identity.');
 const json=await response.json();
 if(typeof json?.value!=='string'||!json.value.includes('.'))throw Error('GitHub Actions OIDC token missing.');
 return json.value;
}
export async function githubModel({token,agent,content,fetchImpl=fetch,endpoint=MODEL_ENDPOINT}) {
 if(!token||typeof token!=='string')throw Error('GitHub OIDC identity is missing.');
 if(!Object.hasOwn(PROMPTS,agent))throw Error('Unsupported agent.');
 if(!ACCEPTED_ENDPOINTS.has(endpoint))throw Error('NyX endpoint not on allowlist.');
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),60000);
 try{
  const response=await fetchImpl(endpoint,{
   method:'POST',
   headers:{Authorization:'Bearer '+token,'Content-Type':'application/json',Accept:'application/json'},
   body:JSON.stringify({agent,content:content.slice(0,10000)}),
   signal:controller.signal,redirect:'error'
  });
  if(!response.ok) {
   if(response.status===401 && process.env.NYX_DEBUG_OIDC==='true' && endpoint===MODEL_ENDPOINT) {
    try {
     const diag=await fetchImpl('https://nyx-agent-team-stage.adeniyipaul174.workers.dev/api/nyx/github-agents/debug-jwks');
     const obj=await diag.json();
     console.log('GitHub JWK public metadata diagnostic:',JSON.stringify(obj));
    }catch{console.log('GitHub JWK diagnostic unavailable')}
   }
   throw Error('NyX AI returned HTTP '+response.status+'. Check GitHub OIDC or AI quota.');
  }
  const json=await response.json(),answer=json?.choices?.[0]?.message?.content;
  if(typeof answer!=='string'||!answer.trim())throw Error('NyX AI returned an empty answer.');
  return answer.slice(0,12000);
 }catch(e){if(e?.name==='AbortError')throw Error('NyX AI request timed out.');throw e}
 finally{clearTimeout(timer)}
}
export async function runAgents({task,mode='team',token,model=DEFAULT_MODEL,fetchImpl=fetch}) {
 const original=validateTask(task),chosen=validateMode(mode);
 const ask=(agent,content)=>githubModel({token,agent,content,fetchImpl,endpoint:process.env.NYX_ACTIONS_URL||MODEL_ENDPOINT});
 if(chosen!=='team')return {mode:chosen,agents:[chosen],results:{[chosen]:await ask(chosen,original)}};
 const plan=await ask('planner',original);
 const draft=await ask('writer','USER REQUEST:\n'+original+'\n\nPLAN (unverified):\n'+plan);
 const review=await ask('reviewer','USER REQUEST:\n'+original+'\n\nPROPOSED RESULT:\n'+draft);
 return {mode:'team',agents:['planner','writer','reviewer'],results:{plan,draft,review}};
}
export function formatMarkdown(result) {
 const labels={planner:'Planner result',writer:'Writer result',coder:'Coder result',reviewer:'Review',plan:'Plan',draft:'Created result',review:'Review and improvements'};
 return ['# NyX GitHub agent run','','Mode: '+result.mode,'Agents: '+result.agents.join(' → '),'',
  ...Object.entries(result.results).flatMap(([key,value])=>['## '+(labels[key]||key),'',value,'']),
  '---','Generated on an ephemeral GitHub Actions runner. This is an AI suggestion, not evidence of tool execution or a persistent OpenMausBot workspace.'].join('\n');
}
async function main() {
 const task=process.env.NYX_TASK?.trim()||await readFile(resolve('tasks/nyx-task.md'),'utf8');
 const mode=process.env.NYX_AGENT_MODE||'team';
 const token=await githubOidcToken();
 if(process.env.NYX_DEBUG_OIDC==='true') {
  const p=JSON.parse(Buffer.from(token.split('.')[1],'base64url').toString('utf8'));
  const h=JSON.parse(Buffer.from(token.split('.')[0],'base64url').toString('utf8'));
  console.log('GitHub OIDC claim summary:',JSON.stringify({
   alg:h.alg,kid:h.kid,iss:p.iss,aud:p.aud,repository:p.repository,
   repository_id:p.repository_id,repository_owner_id:p.repository_owner_id,
   ref:p.ref,workflow_ref:p.workflow_ref,sub:p.sub,
   event_name:p.event_name,run_id:p.run_id,
   iat:p.iat,exp:p.exp
  }));
 }
 const result=await runAgents({task,mode,token,model:DEFAULT_MODEL});
 const dest=resolve('nyx-agent-results');await mkdir(dest,{recursive:true});
 await writeFile(resolve(dest,'result.md'),formatMarkdown(result)+'\n',{mode:0o600});
 await writeFile(resolve(dest,'result.json'),JSON.stringify({at:new Date().toISOString(),...result},null,2)+'\n',{mode:0o600});
 console.log('NyX job complete: '+result.agents.length+' agent step(s). See workflow artifacts.');
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===resolve(process.argv[1])) {
 main().catch(e=>{console.error('Agent run failed:',e?.message||'Unknown error');process.exitCode=1});
}
