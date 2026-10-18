import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import worker from '../worker.mjs';
import {parseCSV,analyzeCSV} from '../data.mjs';
import {pwaResponse,manifest,serviceWorker} from '../pwa.mjs';
test('All generated inline browser scripts parse',async()=>{
 const response=await worker.fetch(new Request('https://nyx.test/'),{},{});
 const html=await response.text();assert.equal(response.status,200);
 let count=0;for(const match of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)){new vm.Script(match[1],{filename:'inline-'+(++count)+'.js'});}
 assert.ok(count>10);assert.match(html,/streamAnswer=true/);assert.match(html,/Stop generating/);assert.match(html,/Edit and resubmit/);
});
test('Unauthenticated API requests remain blocked',async()=>{
 const response=await worker.fetch(new Request('https://nyx.test/api/nyx',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages:[{role:'user',content:'hi'}]})}),{},{});
 assert.equal(response.status,401);
});
test('Actual authenticated chat route streams and keeps corrections in provider context',async()=>{
 let captured;
 const env={NYX_DB:{prepare(){return {bind(){return this;},first:async()=>({id:'synthetic-user',is_disabled:0}),run:async()=>({meta:{changes:1}})}}},AI:{run:async(model,input)=>{captured=input;return new ReadableStream({start(c){c.enqueue(new TextEncoder().encode('data: {"response":"Second option selected."}\ndata: [DONE]\n'));c.close();}});}}};
 const response=await worker.fetch(new Request('https://nyx.test/api/nyx',{method:'POST',headers:{'Content-Type':'application/json','Cookie':'__Host-nyx_session='+'x'.repeat(40)},body:JSON.stringify({messages:[{role:'user',content:'Choose between apples and pears'},{role:'assistant',content:'1. Apples\n2. Pears'},{role:'user',content:'No, use the second option'}],streamAnswer:true,autoTools:false})}),env,{});
 assert.equal(response.status,200);assert.match(response.headers.get('content-type'),/ndjson/);
 const events=(await response.text()).trim().split('\n').map(JSON.parse);assert.equal(events[0].event,'delta');assert.equal(events.at(-1).data.reply,'Second option selected.');
 assert.match(captured.messages.map(m=>m.content).join('\n'),/Pears/);assert.equal(captured.messages.at(-1).content,'No, use the second option');
});
test('PWA only intercepts public static paths and navigation fallback',()=>{
 assert.equal(manifest.display,'standalone');assert.equal(manifest.scope,'/');
 assert.equal(pwaResponse(new Request('https://nyx.test/api/nyx'),'brand'),null);
 assert.match(serviceWorker,/PUBLIC.includes\(url.pathname\)/);assert.doesNotMatch(serviceWorker,/cache\.put/);
 new vm.Script(serviceWorker);
});
test('CSV quoted fields, CRLF, missing values and known statistics',()=>{
 assert.deepEqual(parseCSV('name,value\r\n"A, B",2\r\nC,4'),[['name','value'],['A, B','2'],['C','4']]);
 const result=analyzeCSV('x,y\n2,1\n4,\n6,no');const output=JSON.parse(result.generatedFiles[0].content);
 assert.equal(output.columns[0].mean,4);assert.equal(output.columns[0].sampleStdDev,2);assert.equal(output.columns[1].missing,1);assert.equal(output.columns[1].nonNumeric,1);
});
test('Malformed and oversized CSV fail with clear errors',()=>{
 assert.throws(()=>parseCSV('x,y\n"open,2'),/Unclosed/);assert.throws(()=>parseCSV('a,b\n1'),/inconsistent/);assert.throws(()=>parseCSV('x'.repeat(180001)),/exceeds/);
});
