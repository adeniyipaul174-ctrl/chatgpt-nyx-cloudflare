import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import worker from '../worker.mjs';
const html=await (await worker.fetch(new Request('https://nyx.test/'),{},{})).text();
const start=html.indexOf('  window.fetch=async function(resource,options){',html.indexOf('function nyxCompactSearchAndMarkdown'));
const wrapper=html.slice(start,html.indexOf('  // Safe Markdown rendering',start));
function fixture(fetcher){
 const chat={id:'chat',messages:[{role:'user',content:'Explain'}]},children=[];
 const target={isConnected:true,classList:{remove(){}},querySelector(){return this.content;},replaceChildren(){this.content=null;},append(node){this.content=node;}};
 const context={window:{addEventListener(){},removeEventListener(){}},chats:[chat],current:'chat',uid:()=> 'answer-1',fetchOriginal:fetcher,progress:{},
 document:{querySelector:()=>target,getElementById:id=>id==='form'?{append:b=>children.push(b)}:{checked:false}},
 el:(tag,klass,label)=>({textContent:label,className:klass,replaceChildren(){this.textContent='';},remove(){}}),
 persist(){context.saved=JSON.stringify(chat);},formatMarkdown:(node,text)=>{node.textContent=text;},release(){},stage(){},sites(){},
 AbortController,TextDecoder,Response,Date,JSON,Array,String,Error};
 vm.runInNewContext(wrapper,context);return {context,chat,target,children};
}
function request(f){return f.context.window.fetch('/api/nyx',{method:'POST',body:JSON.stringify({messages:f.chat.messages})});}
const encoder=new TextEncoder();
test('UI renders chunks before completion and checkpoints a single assistant',async()=>{
 let finish;const f=fixture(async()=>new Response(new ReadableStream({start(c){c.enqueue(encoder.encode('{"event":"delta","text":"First chunk"}\n'));finish=()=>{c.enqueue(encoder.encode('{"event":"done","data":{"reply":"First chunk complete"}}\n'));c.close();};}}),{headers:{'Content-Type':'application/x-ndjson'}}));
 const pending=request(f);await new Promise(setImmediate);
 assert.equal(f.target.content.textContent,'First chunk');assert.equal(f.chat.messages.length,2);assert.equal(f.chat.messages[1].status,'partial');
 finish();const result=await (await pending).json();
 const index=f.chat.messages.findIndex(m=>m.id===result.id);assert.equal(index,1);
 f.chat.messages[index]={id:result.id,role:'assistant',content:result.reply,status:result.status};
 assert.equal(f.chat.messages.length,2);assert.equal(result.status,'complete');assert.equal(f.context.window.nyxIsGenerating,false);
});
test('Stop preserves received text with partial status',async()=>{
 const f=fixture(async(resource,options)=>new Response(new ReadableStream({start(c){c.enqueue(encoder.encode('{"event":"delta","text":"Keep this"}\n'));options.signal.addEventListener('abort',()=>c.error(Error('Abort')));}}),{headers:{'Content-Type':'application/x-ndjson'}}));
 const pending=request(f);await new Promise(setImmediate);f.children[0].onclick();const result=await (await pending).json();
 assert.equal(result.reply,'Keep this');assert.equal(result.status,'partial');assert.equal(f.chat.messages.length,2);assert.match(f.context.saved,/Keep this/);
});
test('Connection failure preserves partial text rather than replacing it with an error',async()=>{
 const f=fixture(async()=>new Response(new ReadableStream({start(c){c.enqueue(encoder.encode('{"event":"delta","text":"Retained"}\n'));c.close();}}),{headers:{'Content-Type':'application/x-ndjson'}}));
 const result=await (await request(f)).json();assert.equal(result.status,'partial');assert.equal(result.reply,'Retained');
});
