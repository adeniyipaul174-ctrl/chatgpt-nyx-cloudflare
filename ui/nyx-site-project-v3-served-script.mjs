// Guard against accidentally closing the host <script> from inside JS strings.
import {Script} from 'node:vm';
import assert from 'node:assert/strict';
const base='https://nyx-site-project-v3-stage.adeniyipaul174.workers.dev';
const r=await fetch(base+'/');
assert.equal(r.status,200);
const html=await r.text();
const marker='function nxProjectZip(';
const anchor=html.indexOf(marker);
assert.ok(anchor>0,'multipage client script missing from served website');
const open=html.lastIndexOf('<script',anchor),start=html.indexOf('>',open)+1,end=html.indexOf('</script>',start);
assert.ok(open>=0&&end>anchor,'browser HTML parser would prematurely close site editor script');
const body=html.slice(start,end);
assert.ok(body.includes('nxProjectPreviewHtml'));
assert.ok(body.includes('nxSiteRevisionPayload=nxProjectPrevious;'),'project editor must be in the same intact host script');
assert.doesNotThrow(()=>new Script(body,{filename:'nyx-served-browser-script.js'}),'actual served JavaScript must parse');
console.log('PASS actual Cloudflare HTML preserves and compiles multipage browser editor ('+body.length+' chars)');
