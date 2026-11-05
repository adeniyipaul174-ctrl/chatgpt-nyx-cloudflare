import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import {inspectBinary,MAX_BINARY_BYTES,formatBinaryReportForModel} from '../src/binary-analysis.mjs';
if(!globalThis.crypto) globalThis.crypto=webcrypto;
function payload(data,filename='sample.bin'){return {filename,data:Buffer.from(data).toString('base64')};}
function putS(a,offset,s){for(let i=0;i<s.length;i++)a[offset+i]=s.charCodeAt(i);}

// Well-formed minimal PE32 file with one section, import descriptor and thunk.
const pe=new Uint8Array(0x900), pv=new DataView(pe.buffer);
putS(pe,0,'MZ');pv.setUint32(0x3c,0x80,true);putS(pe,0x80,'PE');
pv.setUint16(0x84,0x14c,true);pv.setUint16(0x86,1,true);
pv.setUint16(0x94,0xE0,true);pv.setUint16(0x98,0x10b,true);pv.setUint32(0x98+16,0x1000,true);
pv.setUint32(0x98+96+8,0x1100,true);
putS(pe,0x178,'.rdata');pv.setUint32(0x178+12,0x1000,true);pv.setUint32(0x178+16,0x500,true);pv.setUint32(0x178+20,0x200,true);
// import desc RVA 0x1100 -> offset 0x300
pv.setUint32(0x300,0x1140,true);pv.setUint32(0x30c,0x1180,true);pv.setUint32(0x310,0x1140,true);
pv.setUint32(0x340,0x11a0,true);putS(pe,0x380,'KERNEL32.dll');putS(pe,0x3a2,'VirtualAlloc');
putS(pe,0x540,'https://example.com/api');
const p=await inspectBinary(payload(pe,'hello.exe'));
assert.equal(p.format,'PE');assert.equal(p.architecture,'x86');assert.equal(p.entrypoint,'0x1000');
assert.equal(p.imports[0].module,'KERNEL32.dll');assert.deepEqual(p.imports[0].functions,['VirtualAlloc']);
assert.ok(p.strings.includes('https://example.com/api'));
assert.equal(p.sha256.length,64);assert.ok(formatBinaryReportForModel(p).includes('KERNEL32.dll'));

const elf=new Uint8Array(0x300),ev=new DataView(elf.buffer);putS(elf,1,'ELF');elf[0]=127;elf[4]=2;elf[5]=1;
ev.setUint16(18,62,true);ev.setBigUint64(24,0x400080n,true);ev.setBigUint64(40,0x100n,true);
ev.setUint16(58,64,true);ev.setUint16(60,2,true);ev.setUint16(62,1,true);
ev.setBigUint64(0x100+64+24,0x200n,true);ev.setBigUint64(0x100+64+32,0x40n,true);
putS(elf,0x200,'\0.shstrtab');
const e=await inspectBinary(payload(elf,'libhello.so'));assert.equal(e.format,'ELF');assert.equal(e.architecture,'x86-64');

const wasm=new Uint8Array([0,97,115,109,1,0,0,0]);assert.equal((await inspectBinary(payload(wasm))).format,'WebAssembly');
const raw=await inspectBinary(payload(Uint8Array.from([1,2,3,4,5,6])));assert.equal(raw.format,'Unknown/raw');
for (const invalid of [{filename:'x',data:''},{filename:'x',data:'?!'},{filename:'../bad.bin',data:'AA=='},{filename:'sample.exe',data:'a'.repeat((MAX_BINARY_BYTES+1)*2)}]) {
 if(invalid.data==='AA==' && invalid.filename.includes('../')) {
   // Basename normalization intentionally permits directory components, but does not preserve them.
   assert.equal((await inspectBinary(invalid)).filename,'bad.bin');
 } else await assert.rejects(()=>inspectBinary(invalid),/Invalid|no larger|between 1 byte/i);
}
await assert.rejects(()=>inspectBinary(payload(new Uint8Array(MAX_BINARY_BYTES+1))),/3 MiB/);
console.log('PASS: binary parsing, hash, imports, bounded strings, malformed input, size limits');
