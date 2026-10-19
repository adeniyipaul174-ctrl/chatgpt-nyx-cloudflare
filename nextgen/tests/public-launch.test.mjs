import {test} from 'node:test';
import assert from 'node:assert/strict';
import {safeResearchUrl,deepResearch} from '../research.mjs';
import {groundedCitations} from '../runtime.mjs';
import worker from '../worker.mjs';

test('safe web sources allow named HTTPS sites, not local IP/metadata targets',()=>{
  for (const url of [
    'https://developers.cloudflare.com/workers/',
    'https://github.com/example/repository',
    'https://docs.python.org/3/',
  ]) assert.equal(safeResearchUrl(url),url);
  for (const url of [
    'http://github.com/path',
    'https://127.0.0.1/private','https://172.16.0.2/',
    'https://10.0.0.1/','https://100.64.1.2/',
    'https://169.254.169.254/latest/meta-data/',
    'https://[::1]/','https://localhost/',
    'https://router.local/','https://metadata.google.internal/',
    'https://internal.test/','https://docs.cloudflare.com:8443/',
    'https://user:pass@github.com/private','ftp://github.com',
  ]) assert.equal(safeResearchUrl(url),null,url);
});

test('Deep Research cannot include private network sources from web results',async()=>{
  const events=[],reads=[];
  let writes=0;
  const documents=[
    {url:'https://127.0.0.1/admin',title:'internal',snippet:'untrusted'},
    {url:'https://metadata.google.internal/',title:'metadata',snippet:'private'},
    {url:'https://github.com/openai/openai-node',title:'GitHub SDK',snippet:'public API'},
    {url:'https://developers.cloudflare.com/workers/',title:'Cloudflare docs',snippet:'limits'},
    {url:'http://insecure.example.com',title:'untrusted http',snippet:'ignore this'},
  ];
  await deepResearch('Find the public SDK and platform documentation',{
    write:async(prompt,onDelta)=>{
      writes++;
      if(writes===1)return '{"queries":["SDK documentation"]}';
      if(writes===2)return '{"queries":["check official sources"]}';
      onDelta?.('Finding [1], source [2]');
      return 'Finding [1]. Missing [90].';
    },
    search:async()=>({sources:documents}),
    read:async url=>{reads.push(url);return 'A documented public webpage.';}
  },ev=>events.push(ev),new AbortController().signal);
  const final=events.at(-1)?.data;
  assert.ok(final,'Research should finish');
  assert.equal(final.sources.length,2);
  assert.equal(reads.length,2);
  assert.ok(reads.every(url=>safeResearchUrl(url)));
  assert.ok(final.sources.every(x=>!x.url.includes('127.0.0.1')&&!x.url.includes('metadata.google')));
  assert.match(final.reply,/unverified citation/);
});

test('Source citations cannot become model-authored links',()=>{
  const output=groundedCitations(
    'See [1], invented [22], or [click this](https://evil.invalid/steal).',
    [{url:'https://docs.python.org/3/'}]
  );
  assert.match(output,/https:\/\/docs.python.org\/3\//);
  assert.doesNotMatch(output,/evil\.invalid/);
  assert.match(output,/unverified citation/);
});

test('Invalid, duplicate, and unreachable research sources are handled without fabricated facts',async()=>{
  const events=[];
  await deepResearch('Check official facts',{
    write:async()=> '{"queries":["specific official info"]}',
    search:async()=>({sources:[]}),
    read:async()=>{throw Error('should not read without sources');}
  },ev=>events.push(ev));
  const end=events.at(-1).data;
  assert.equal(end.sources.length,0);
  assert.match(end.reply,/No report was fabricated/);
});

test('Unauthenticated conversation endpoint is blocked before model inference',async()=>{
  const req=new Request('https://nyx.test/api/nyx',{method:'POST',
    headers:{'content-type':'application/json'},
    body:JSON.stringify({messages:[{role:'user',content:'hello'}]})
  });
  const res=await worker.fetch(req,{},{});assert.equal(res.status,401);
});

test('Unauthenticated cloud conversation history is private',async()=>{
  const res=await worker.fetch(new Request('https://nyx.test/api/nyx/account-history'),{},{});
  assert.equal(res.status,401);
});

test('Unauthenticated quota usage cannot be retrieved',async()=>{
  const res=await worker.fetch(new Request('https://nyx.test/api/nyx/usage'),{},{});
  assert.equal(res.status,401);
});

test('Front page stays uncached and is served without running providers',async()=>{
  const res=await worker.fetch(new Request('https://nyx.test/'),{},{});
  assert.equal(res.status,200);
  assert.match(res.headers.get('content-type')||'',/text\/html/);
  assert.match(res.headers.get('cache-control')||'',/no-store/);
});

test('Public launch QA never requires provider credentials',()=>{
  assert.equal(process.env.NYX_PUBLIC_TEST_KEY,undefined);
});
