import test from 'node:test';
import assert from 'node:assert/strict';
import {nxInChatPick,nxInChatExecute,nxInChatEarly} from './nyx-chat-agent-router.mjs';

test('normal conversation stays normal by default',()=>{
 for(const q of ['Hello','What is the weather?','Who made the first computer?','What are AI agents?','Explain how agents work','Make an image of a fox'])
  assert.equal(nxInChatPick(q,'auto'),null,q);
 assert.equal(nxInChatPick('Use your agents to plan a product launch','off'),null);
});
test('explicit modes and natural language selection',()=>{
 const cases=[
  ['Use your agents to make a professional website','team'],
  ['/team create a brand strategy','team'],
  ['@coder implement an API','coder'],
  ['Write an email inviting an author to a book club','writer'],
  ['Debug this Python script','coder'],
  ['Review this proposal for mistakes','reviewer'],
  ['Create a detailed project roadmap for a product launch','planner']
 ];
 for(const [text,selected] of cases)assert.equal(nxInChatPick(text,'auto'),selected,text);
 assert.equal(nxInChatPick('Hello','team'),'team');
});
test('single specialist returns a normal reply shape',async()=>{
 const calls=[];
 const result=await nxInChatExecute({task:'Please draft an email for an author',mode:'writer',messages:[],ask:async(a,t)=>{calls.push(a);return 'Hello, welcome!'}});
 assert.deepEqual(calls,['writer']);assert.match(result.reply,/Hello, welcome/);
 assert.deepEqual(result.agents,['writer']);
});
test('multi agent jobs pass context and review the draft',async()=>{
 const calls=[];
 const result=await nxInChatExecute({task:'Use your agents to make a professional website',messages:[{role:'user',content:'It is for a bookstore'},{role:'assistant',content:'Understood'},{role:'user',content:'Use your agents to make a professional website'}],ask:async(a,t)=>{
  calls.push({a,t});return {planner:'Site plan',coder:'HTML prototype',reviewer:'Check accessibility'}[a]||'Fallback'
 }});
 assert.deepEqual(result.agents,['planner','coder','reviewer']);
 assert.match(calls[0].t,/bookstore/);
 assert.match(calls[1].t,/Site plan/);
 assert.match(calls[2].t,/HTML prototype/);
 assert.match(result.reply,/Check accessibility/);
});
test('agent routing ignores malformed or oversize requests',async()=>{
 assert.equal(nxInChatPick('x'.repeat(4001)),null);
 assert.equal(await nxInChatExecute({task:'Hello',mode:'auto',ask:()=>{throw Error('Should not call')}}),null);
});

test('selected specialist receives text requests before automatic search and browse',()=>{
 for(const mode of ['team','planner','writer','coder','reviewer'])assert.equal(nxInChatEarly(mode),true);
 for(const mode of ['auto','off','unknown',''])assert.equal(nxInChatEarly(mode),false);
});
