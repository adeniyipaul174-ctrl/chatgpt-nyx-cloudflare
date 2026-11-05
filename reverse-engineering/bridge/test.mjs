import assert from 'node:assert/strict';
import worker from './worker.mjs';
import { renderReverseReportForModel } from './nyx-client.mjs';
const store = new Map();
const bucket = {
  async put(k,v) { store.set(k, v); },
  async get(k) { const v=store.get(k); return v ? {body:new Blob([v]).stream()} : null; },
  async list() { return {objects:[...store.keys()].map(key=>({key,size:store.get(key).length,uploaded:new Date()}))}; }
};
const env = {REPORTS:bucket,IDA_UPLOAD_TOKEN:'u-test',IDA_READ_TOKEN:'r-test'};
function req(path,method='GET',token='',data=null){return new Request('https://bridge.example'+path,{method,headers:{...(token?{Authorization:'Bearer '+token}:{}),...(data?{'Content-Type':'application/json'}:{})},body:data?JSON.stringify(data):null});}
const report = {format:'nyx-ida-report-v1',source_sha256:'a'.repeat(64),functions:[{name:'start',address:'0x1000',disassembly:'MOV EAX, 1',pseudocode:'return 1;'}]};
let r=await worker.fetch(req('/v1/reports','POST','',report),env); assert.equal(r.status,401);
r=await worker.fetch(req('/v1/reports','POST','r-test',report),env); assert.equal(r.status,401);
r=await worker.fetch(req('/v1/reports','POST','u-test',{...report,source_sha256:'bad'}),env); assert.equal(r.status,422);
r=await worker.fetch(req('/v1/reports','POST','u-test',report),env); assert.equal(r.status,201); const {id}=await r.json(); assert.match(id,/^[0-9a-f-]{36}$/);
r=await worker.fetch(req('/v1/reports/'+id,'GET','u-test'),env); assert.equal(r.status,401);
r=await worker.fetch(req('/v1/reports/'+id,'GET','r-test'),env); assert.equal(r.status,200); assert.deepEqual(await r.json(),report);
r=await worker.fetch(req('/v1/reports','GET','r-test'),env); assert.equal((await r.json()).reports.length,1);
r=await worker.fetch(req('/v1/reports/../../abc','GET','r-test'),env); assert.equal(r.status,404);
r=await worker.fetch(req('/v1/reports','POST','u-test',report),{...env,IDA_UPLOAD_TOKEN:''}); assert.equal(r.status,401);
assert.match(renderReverseReportForModel(report),/BEGIN UNTRUSTED IDA DATA/);
console.log('Reverse bridge: 10 checks passed');
