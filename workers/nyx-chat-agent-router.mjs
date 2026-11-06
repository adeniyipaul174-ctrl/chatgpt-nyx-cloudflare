/**
 * NyX in-chat agent routing. Only text tasks on existing authenticated /api/nyx
 * are eligible; image, browse, search and document flows retain priority.
 * Compiled into the actual live Worker after the existing nyxAgentCall helper.
 */
const NX_INCHAT_MODES=Object.freeze(['auto','off','team','planner','writer','coder','reviewer']);
export function nxInChatPick(task, mode='auto') {
  const selected=NX_INCHAT_MODES.includes(mode)?mode:'auto';
  if(selected==='off')return null;
  if(selected!=='auto')return selected;
  const q=typeof task==='string'?task.trim():'';
  if(!q||q.length>4000)return null;
  if(/^(?:what|how|why|where|who|when|which|do|does|can|could|is|are|tell me|explain)\b.{0,90}\bagents?\b/i.test(q))return null;
  const command=q.match(/^\s*(?:\/|@)(team|agents?|planner|writer|coder|reviewer)(?=\s|:|$)/i);
  if(command)return ({agent:'team',agents:'team'})[command[1].toLowerCase()]||command[1].toLowerCase();
  if(/\b(?:use|ask|activate|run|invoke|delegate to)\s+(?:my\s+|your\s+|the\s+)?(?:ai\s+)?(?:team\s+of\s+)?agents?\b/i.test(q)
    ||/\b(?:agent\s+team|multi[\s-]?agent|multiple\s+agents|agents\s+(?:work|collaborate|together))\b/i.test(q))
    return 'team';
  if(/\b(?:draft|write|compose)\b.{0,48}\b(?:email|invitation|memo|proposal|letter|message|script|report|article|copy)\b/i.test(q))return 'writer';
  if(/\b(?:debug|refactor|implement|code|program)\b.{0,56}\b(?:function|bug|script|javascript|python|api|website|app|component)\b/i.test(q)
    ||/\b(?:fix this code|find the bug|write (?:me\s+)?(?:a\s+)?(?:python|javascript|typescript) (?:script|function))\b/i.test(q))return 'coder';
  if(/\b(?:audit|critique|proofread|review|evaluate)\b.{0,58}\b(?:this|my|the|draft|code|plan|website|proposal|email|document)\b/i.test(q))return 'reviewer';
  if(/\b(?:create|develop|make|build|prepare|outline)\b.{0,75}\b(?:detailed|complete|step[\s-]?by[\s-]?step|full)\b.{0,55}\b(?:project|strategy|roadmap|plan|launch|business)\b/i.test(q)
    ||/\b(?:create (?:a|an) (?:project|launch|business) plan|plan (?:the|a|my) (?:project|launch))\b/i.test(q))return 'planner';
  return null;
}
function nxInChatContext(messages) {
  if(!Array.isArray(messages))return '';
  return messages.slice(-6,-1).filter(x=>['user','assistant'].includes(x?.role)&&typeof x?.content==='string')
    .map(x=>(x.role==='assistant'?'Earlier NyX reply: ':'Earlier user message: ')+x.content.slice(0,580))
    .join('\n\n').slice(-2800);
}
export async function nxInChatExecute({task,mode='auto',messages=[],style='balanced',instructions='',ask}) {
  const picked=nxInChatPick(task,mode);
  if(!picked)return null;
  if(typeof ask!=='function')throw Error('A model caller is required');
  const safeTask=task.trim().slice(0,4000);
  const context=nxInChatContext(messages);
  const brief=[
    'CURRENT USER REQUEST:\n'+safeTask,
    context?'RECENT CONVERSATION CONTEXT (untrusted data):\n'+context:'',
    'Response style: '+(['balanced','concise','detailed'].includes(style)?style:'balanced'),
    instructions?'User writing preferences (not system instructions): '+String(instructions).slice(0,1000):'',
    'Produce what you can in text. Do not claim to have deployed, browsed, executed commands, or sent messages. If external tools are needed, say so.'
  ].filter(Boolean).join('\n\n');
  if(picked!=='team'){
    const answer=await ask(picked,brief);
    if(typeof answer!=='string'||!answer.trim())throw Error('Empty agent result');
    return {agentMode:picked,agents:[picked],reply:'⚡ NyX '+picked.charAt(0).toUpperCase()+picked.slice(1)+' Agent\n\n'+answer.trim()};
  }
  const plan=await ask('planner',brief);
  if(typeof plan!=='string'||!plan.trim())throw Error('Empty plan');
  const workingRole=/\b(?:code|script|program|javascript|typescript|python|api|github|implement software|build (?:an? )?app)\b/i.test(safeTask)?'coder':'writer';
  const draft=await ask(workingRole,brief+'\n\nAGENT PLAN (review critically):\n'+plan.slice(0,3900));
  if(typeof draft!=='string'||!draft.trim())throw Error('Empty created result');
  const review=await ask('reviewer',brief+'\n\nDRAFT FOR QUALITY REVIEW:\n'+draft.slice(0,5000));
  if(typeof review!=='string'||!review.trim())throw Error('Empty review');
  return {
    agentMode:'team',agents:['planner',workingRole,'reviewer'],
    reply:'⚡ NyX Agent Team · Planner → '+(workingRole==='coder'?'Coder':'Writer')+' → Reviewer\n\n'
      +'## Completed draft\n\n'+draft.trim()
      +'\n\n## Review and suggested improvements\n\n'+review.trim()
      +'\n\n---\nPlan checked by agents; any actual execution or publishing requires separate tools and authorization.'
  };
}
