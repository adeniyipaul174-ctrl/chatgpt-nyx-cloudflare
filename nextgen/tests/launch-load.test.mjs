import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import worker from '../worker.mjs';

// Deterministic MOCK traffic only. No real accounts, prompts, providers or paid requests.
function syntheticEnv(){
 const users=new Map(), quotas=new Map(),inferences={count:0},log=[];
 const hash=token=>createHash('sha256').update(token).digest('hex');
 users.set(hash('a'.repeat(40)),{id:'synthetic-alpha',email:'alpha@test.invalid',is_disabled:0});
 users.set(hash('b'.repeat(40)),{id:'synthetic-beta',email:'beta@test.invalid',is_disabled:0});
 const db={
   prepare(sql){
     const statement={params:[],
       bind(...args){this.params=args;return this;},
       async first(){
         if(sql.includes('FROM nyx_sessions'))return users.get(this.params[0])||null;
         return null;
       },
       async all(){return {results:[]};},
       async run(){
         if(sql.includes('INSERT INTO nyx_daily_quota')){
           const [uid,day,kind,maximum]=this.params;
           const key=uid+'|'+day+'|'+kind;
           const value=quotas.get(key)||0;
           // Atomic in this mocked single-threaded event-loop: no await before increment.
           if(value>=maximum)return {meta:{changes:0}};
           quotas.set(key,value+1);
           log.push({user:uid,kind});
           return {meta:{changes:1}};
         }
         return {meta:{changes:1}};
       }
     };
     return statement;
   }
 };
 const ai={async run(){
   inferences.count++;
   return new ReadableStream({start(c){
     c.enqueue(new TextEncoder().encode('data: {"response":"Synthetic reply; no live provider used."}\ndata: [DONE]\n'));
     c.close();
   }});
 }};
 return {env:{NYX_DB:db,AI:ai},users,quotas,inferences,log};
}
function request(token,message='Hello there'){
 return new Request('https://nyx.test/api/nyx',{
   method:'POST',headers:{'Content-Type':'application/json','Cookie':'__Host-nyx_session='+token},
   body:JSON.stringify({messages:[{role:'user',content:message}],streamAnswer:true,autoTools:false})
 });
}
test('70 mocked concurrent chats honor per-account quotas without overcharging another account',async()=>{
 const f=syntheticEnv();
 const jobs=[...Array(60)].map(()=>worker.fetch(request('a'.repeat(40)),f.env,{}))
   .concat([...Array(10)].map(()=>worker.fetch(request('b'.repeat(40)),f.env,{})));
 const results=await Promise.all(jobs);
 const one=results.slice(0,60),other=results.slice(60);
 assert.equal(one.filter(x=>x.status===200).length,45);
 assert.equal(one.filter(x=>x.status===429).length,15);
 assert.equal(other.filter(x=>x.status===200).length,10);
 for(const res of results.filter(r=>r.status===200)){
   const text=await res.text();
   assert.match(text,/Synthetic reply/);
   assert.match(res.headers.get('Content-Type'),/application\/x-ndjson/);
 }
 for(const res of results.filter(r=>r.status===429)){
   const body=await res.json();
   assert.equal(body.code,'NYX_BETA_DAILY_LIMIT');
   assert.doesNotMatch(JSON.stringify(body),/alpha@test|beta@test|test.invalid/);
 }
 assert.equal(f.inferences.count,55,'Blocked requests must not invoke AI');
 assert.equal(f.log.filter(x=>x.user==='synthetic-alpha').length,45);
 assert.equal(f.log.filter(x=>x.user==='synthetic-beta').length,10);
});
test('A forged/unrecognized session cannot consume an AI request',async()=>{
 const f=syntheticEnv();
 const r=await worker.fetch(request('z'.repeat(40)),f.env,{});
 assert.equal(r.status,401);
 assert.equal(f.inferences.count,0);
 assert.equal(f.log.length,0);
});
