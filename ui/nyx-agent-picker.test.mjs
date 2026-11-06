import test from 'node:test';
import {Script} from 'node:vm';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const source=await readFile(new URL('./nyx-agent-picker-snippet.html',import.meta.url),'utf8');
const modes=['auto','off','team','planner','writer','coder','reviewer'];

test('all seven modes are exposed exactly once and have radio semantics',()=>{
 const found=[...source.matchAll(/<button\b[^>]*data-nx-mode="([^"]+)"[^>]*>/g)].map(x=>x[1]);
 assert.deepEqual(found,modes);
 assert.equal((source.match(/role="menuitemradio"/g)||[]).length,7);
 assert.equal((source.match(/class="nx-mode-check"/g)||[]).length,7);
 assert.match(source,/aria-haspopup="menu"/);
 assert.match(source,/aria-expanded="false"/);
});
test('supports accessible keyboard and outside-close behavior',()=>{
 for(const term of ['ArrowDown','ArrowUp','Home','End','Escape','Tab','pointerdown','focus()','aria-checked','aria-label'])
   assert.ok(source.includes(term),'Missing '+term);
 assert.match(source,/nativeSelect\.value=mode/);
 assert.match(source,/nativeSelect\.addEventListener\("change"/);
});
test('design matches NyX header without native select default look',()=>{
 assert.match(source,/\.top \.nx-mode-trigger\{/);
 assert.match(source,/\.top \.nx-mode-option\{/);
 assert.match(source,/\.nx-mode-menu\[hidden\]\{display:none!important\}/);
 assert.match(source,/@media\(max-width:650px\)/);
 assert.match(source,/@media\(prefers-reduced-motion:reduce\)/);
 assert.match(source,/nx-mode-picker\.nx-enhanced/);
 assert.match(source,/nyx_chat_agent_mode_v1/);
});
test('no network, code execution, untrusted HTML, or secrets in the picker',()=>{
 assert.equal(source.includes('innerHTML='),false);
 assert.equal(source.includes('fetch('),false);
 assert.equal(source.includes('eval('),false);
 assert.equal(source.includes('OPENROUTER_API_KEY'),false);
});

test('client-side selector JavaScript parses without dependencies',()=>{
 const match=source.match(/<script>([\s\S]*?)<\/script>/);
 assert.ok(match);
 assert.doesNotThrow(()=>new Script(match[1]));
});
