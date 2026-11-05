import assert from 'node:assert/strict';
import {tryGhidraReport,formatGhidraReport} from '../src/ghidra-client.mjs';
const attachment={filename:'hello.exe',data:'TVqQ'};
const missing=await tryGhidraReport({},attachment);assert.equal(missing.status,'not_configured');
const bad=await tryGhidraReport({NYX_REVERSE_RUNNER_URL:'http://test.local',NYX_REVERSE_RUNNER_TOKEN:'secret'},attachment);assert.equal(bad.status,'configuration_error');
let requests=0;
const ok=await tryGhidraReport({NYX_REVERSE_RUNNER_URL:'https://private.test',NYX_REVERSE_RUNNER_TOKEN:'secret'},attachment,
 async (url,init)=>{requests++;assert.equal(url,'https://private.test/analyze');assert.equal(init.headers.Authorization,'Bearer secret');
  assert.equal(JSON.parse(init.body).data,'TVqQ');return new Response(JSON.stringify({engine:'ghidra-headless',report:{functions:[{name:'main',pseudocode:'return 42;'}]}}),{status:200});});
assert.equal(ok.status,'ok');assert.equal(requests,1);assert.match(formatGhidraReport(ok.report),/return 42/);
const fail=await tryGhidraReport({NYX_REVERSE_RUNNER_URL:'https://private.test',NYX_REVERSE_RUNNER_TOKEN:'secret'},attachment,
 async()=>new Response('nope',{status:502}));assert.equal(fail.status,'unavailable');
console.log('PASS: optional Ghidra private runner client and fallback behavior');
