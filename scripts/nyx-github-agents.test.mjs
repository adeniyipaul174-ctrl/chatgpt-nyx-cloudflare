import assert from 'node:assert/strict';
import {test} from 'node:test';
import {runAgents,formatMarkdown,githubModel,validateTask,validateMode,MODEL_ENDPOINT} from './nyx-github-agents.mjs';
test('rejects invalid task and invalid mode',()=>{
 assert.throws(()=>validateTask('a'));assert.throws(()=>validateTask('x'.repeat(4001)));
 assert.equal(validateMode('Team'),'team');assert.throws(()=>validateMode('shell'));
});
test('three-step team invokes planner, writer, and reviewer',async()=>{
 const calls=[];
 const fake=async(url,options)=>{
  assert.equal(url,MODEL_ENDPOINT);assert.equal(options.headers.Authorization,'Bearer secret-example');
  const b=JSON.parse(options.body);calls.push(b);
  return new Response(JSON.stringify({choices:[{message:{content:'Answer '+calls.length}}]}),{status:200});
 };
 const r=await runAgents({task:'Make a plan for a book launch',token:'secret-example',fetchImpl:fake});
 assert.deepEqual(r.agents,['planner','writer','reviewer']);
 assert.deepEqual(r.results,{plan:'Answer 1',draft:'Answer 2',review:'Answer 3'});
 assert.equal(calls.length,3);assert.match(calls[1].messages[1].content,/Answer 1/);
 assert.match(calls[2].messages[1].content,/Answer 2/);
 assert.equal(formatMarkdown(r).includes('secret-example'),false);
});
test('coder mode is one request only',async()=>{
 let n=0;
 const r=await runAgents({task:'Write a JavaScript test function',mode:'coder',token:'token',fetchImpl:async()=>{n++;return new Response(JSON.stringify({choices:[{message:{content:'code'}}]}),{status:200})}});
 assert.equal(n,1);assert.deepEqual(r.results,{coder:'code'});
});
test('provider errors never echo response details or keys',async()=>{
 await assert.rejects(()=>githubModel({token:'secret-example',agent:'writer',content:'Hi',fetchImpl:async()=>new Response('secret-example',{status:403})}),e=>e.message.includes('HTTP 403')&&!e.message.includes('secret-example'));
});
