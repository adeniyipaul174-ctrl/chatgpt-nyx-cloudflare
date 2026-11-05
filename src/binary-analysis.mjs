/**
 * NyX binary attachment triage: strictly static, never executes the specimen.
 * Bounded to 3 MiB to fit the existing JSON request limit and Worker memory.
 * This is NOT a decompiler; it provides facts for the AI to reason over.
 */
export const MAX_BINARY_BYTES = 3 * 1024 * 1024;
const MAX_SECTIONS = 64;
const MAX_STRINGS = 120;
const MAX_IMPORTS = 100;

function inputError(message) {
  const error = new Error(message);
  error.code = "INVALID_BINARY";
  return error;
}
function viewOf(bytes) { return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength); }
function within(bytes, offset, size = 1) {
  return Number.isSafeInteger(offset) && Number.isSafeInteger(size) && offset >= 0 && size >= 0 && offset + size <= bytes.length;
}
function integer(view, bytes, offset, length, little = true) {
  if (!within(bytes, offset, length)) return null;
  switch (length) {
    case 1: return view.getUint8(offset);
    case 2: return view.getUint16(offset, little);
    case 4: return view.getUint32(offset, little);
    case 8: {
      const n = view.getBigUint64(offset, little);
      return n <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(n) : null;
    }
    default: return null;
  }
}
function ascii(bytes, offset, max = 180) {
  if (!within(bytes, offset)) return "";
  let s = "";
  for (let i = offset; i < bytes.length && s.length < max; i++) {
    const c = bytes[i];
    if (c === 0) break;
    if (c < 32 || c > 126) break;
    s += String.fromCharCode(c);
  }
  return s;
}
function hex(n) { return Number.isSafeInteger(n) ? "0x" + n.toString(16) : null; }
function cpuName(machine, format) {
  if (format === "PE") return ({0x14c:"x86",0x8664:"x86-64",0x1c0:"ARM",0xaa64:"ARM64",0x1c4:"ARMv7"})[machine] || hex(machine);
  if (format === "ELF") return ({3:"x86",62:"x86-64",40:"ARM",183:"ARM64",8:"MIPS",243:"RISC-V",20:"PowerPC"})[machine] || hex(machine);
  return hex(machine);
}
function decodeAttachment(attachment) {
  if (!attachment || typeof attachment !== "object") throw inputError("Attach an executable or library file.");
  const name = String(attachment.filename || attachment.name || "binary").split(/[\\/]/).pop().slice(0, 160);
  if (!/^[\x20-\x7e]+$/.test(name) || /[\x00-\x1f]/.test(name)) throw inputError("Invalid file name.");
  const base64 = attachment.data;
  if (typeof base64 !== "string" || base64.length === 0 || base64.length > Math.ceil(MAX_BINARY_BYTES / 3) * 4) throw inputError("File must be no larger than 3 MiB.");
  if (base64.length % 4 || !/^[A-Za-z0-9+/]*={0,2}$/.test(base64)) throw inputError("Invalid file encoding.");
  let binary;
  try { binary = atob(base64); } catch { throw inputError("Invalid base64 binary upload."); }
  if (!binary.length || binary.length > MAX_BINARY_BYTES) throw inputError("File must be between 1 byte and 3 MiB.");
  const bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
  return {bytes, filename:name};
}
function parsePE(bytes, v) {
  if (bytes.length < 64 || bytes[0] !== 77 || bytes[1] !== 90) return null;
  const pe = integer(v, bytes, 0x3c, 4);
  if (pe === null || !within(bytes,pe,24) || ascii(bytes, pe, 2) !== "PE" || bytes[pe+2] !== 0 || bytes[pe+3] !== 0) {
    return {format:"PE (invalid/truncated headers)", warning:"DOS header found but full PE headers are missing."};
  }
  const machine = integer(v,bytes,pe+4,2), count = integer(v,bytes,pe+6,2);
  const optionalSize = integer(v,bytes,pe+20,2);
  const opt = pe + 24, magic = integer(v,bytes,opt,2), size = Math.max(0, Math.min(count ?? 0,MAX_SECTIONS));
  const is64 = magic === 0x20b;
  const result = {format:"PE",architecture:cpuName(machine,"PE"),kind:is64?"PE32+":magic===0x10b?"PE32":"unknown",entrypoint:null,sections:[],imports:[],warnings:[]};
  if (!within(bytes,opt,optionalSize) || ![0x10b,0x20b].includes(magic)) {
    result.warnings.push("Optional PE header is incomplete or not recognized.");
    return result;
  }
  result.entrypoint = hex(integer(v,bytes,opt+16,4));
  const sec = opt + optionalSize;
  for (let i = 0; i < size; i++) {
    const o = sec + i*40;
    if (!within(bytes,o,40)) {result.warnings.push("Section table is truncated.");break;}
    let name=""; for(let j=0;j<8 && bytes[o+j];j++) name+=String.fromCharCode(bytes[o+j]);
    result.sections.push({name,virtualAddress:hex(integer(v,bytes,o+12,4)),rawSize:integer(v,bytes,o+16,4),rawOffset:integer(v,bytes,o+20,4)});
  }
  const rvaOffset = opt + (is64?112:96);
  const importRva = integer(v,bytes,rvaOffset+8,4);
  function rvaToOffset(rva) {
    if (!Number.isSafeInteger(rva)) return null;
    for(const s of result.sections){
      const base = parseInt(s.virtualAddress||"",16), raw=s.rawSize, off=s.rawOffset;
      if(Number.isSafeInteger(base)&&Number.isSafeInteger(raw)&&Number.isSafeInteger(off)&&rva>=base&&rva-base<raw&&within(bytes,off+rva-base)) return off+rva-base;
    }
    return null;
  }
  const descStart = rvaToOffset(importRva);
  if (descStart !== null) {
    for(let i=0;i<48;i++) {
      const d=descStart+i*20;
      if(!within(bytes,d,20)) break;
      const ilt=integer(v,bytes,d,4), nameRva=integer(v,bytes,d+12,4), iat=integer(v,bytes,d+16,4);
      if(!ilt && !nameRva && !iat) break;
      const nameOff=rvaToOffset(nameRva), module=nameOff!==null?ascii(bytes,nameOff,128):"";
      if(!module) continue;
      const symbols=[];
      const thunk=rvaToOffset(ilt || iat);
      const w=is64?8:4;
      if(thunk!==null) for(let j=0;j<128 && result.imports.length<MAX_IMPORTS;j++) {
        const o=thunk+j*w;
        if(!within(bytes,o,w)) break;
        const value=is64?v.getBigUint64(o,true):BigInt(v.getUint32(o,true));
        if(value===0n) break;
        if((value & (is64?1n<<63n:1n<<31n))!==0n) {symbols.push("ordinal:"+(value&0xffffn).toString());continue;}
        const nameRvaNumber=Number(value);
        const symbolOff=rvaToOffset(nameRvaNumber);
        if(symbolOff===null || !within(bytes,symbolOff,3)) continue;
        const symbol=ascii(bytes,symbolOff+2,120);
        if(symbol) symbols.push(symbol);
        if(symbols.length>=50)break;
      }
      result.imports.push({module,functions:symbols});
      if(result.imports.length>=MAX_IMPORTS) break;
    }
  }
  return result;
}
function parseELF(bytes,v) {
  if (bytes.length < 20 || bytes[0]!==127 || bytes[1]!==69 || bytes[2]!==76 || bytes[3]!==70) return null;
  const cls=bytes[4], endian=bytes[5], little=endian===1;
  const result={format:"ELF",kind:cls===2?"64-bit":cls===1?"32-bit":"unknown",endian:little?"little":endian===2?"big":"unknown",sections:[],warnings:[]};
  if(![1,2].includes(cls)||![1,2].includes(endian)) {result.warnings.push("Unsupported ELF class or byte order.");return result;}
  const arch=integer(v,bytes,18,2,little);
  result.architecture=cpuName(arch,"ELF");
  const is64=cls===2;
  const entry=integer(v,bytes,is64?24:24,is64?8:4,little);
  result.entrypoint=hex(entry);
  const shoff=integer(v,bytes,is64?40:32,is64?8:4,little);
  const shentsize=integer(v,bytes,is64?58:46,2,little);
  const shnum=integer(v,bytes,is64?60:48,2,little);
  const shidx=integer(v,bytes,is64?62:50,2,little);
  if(!shoff||!shentsize||!shnum || shentsize<(is64?64:40)) return result;
  function section(i){const o=shoff+i*shentsize;if(!within(bytes,o,is64?64:40))return null;return {nameIndex:integer(v,bytes,o,4,little),type:integer(v,bytes,o+4,4,little),offset:integer(v,bytes,o+(is64?24:16),is64?8:4,little),size:integer(v,bytes,o+(is64?32:20),is64?8:4,little)};}
  const names=shidx<shnum?section(shidx):null;
  for(let i=0;i<Math.min(shnum,MAX_SECTIONS);i++) {
    const s=section(i);if(!s) {result.warnings.push("Section table is truncated.");break;}
    const canName=names && within(bytes,names.offset,names.size) && s.nameIndex<names.size;
    const name=canName?ascii(bytes,names.offset+s.nameIndex,90):"";
    result.sections.push({name,type:s.type,rawOffset:s.offset,rawSize:s.size});
  }
  return result;
}
function parseOther(bytes,v) {
  const magic=integer(v,bytes,0,4,false);
  if(bytes.length>=8 && bytes[0]===0 && bytes[1]===97 && bytes[2]===115 && bytes[3]===109) return {format:"WebAssembly",kind:"WASM",architecture:"WASM bytecode",sections:[],warnings:[]};
  if([0xfeedface,0xfeedfacf,0xcefaedfe,0xcffaedfe,0xcafebabe,0xbebafeca].includes(magic)) return {format:"Mach-O",kind:[0xcafebabe,0xbebafeca].includes(magic)?"fat/universal":"single architecture",sections:[],warnings:["Mach-O load commands are not yet decoded by this lightweight scanner."]};
  return {format:"Unknown/raw",sections:[],warnings:["No supported executable container header recognized. Strings may still be useful."]};
}
function stringScore(s) {
  const score=(/https?:\/\/|wss?:\/\//i.test(s)?12:0)+(/\.dll\b|\.so\b|kernel32|libc\b|advapi32|ntdll/i.test(s)?8:0)+(/CreateProcess|VirtualAlloc|LoadLibrary|GetProcAddress|WriteProcessMemory|RegOpenKey|socket|connect\b|execve|fork\b|OpenProcess/i.test(s)?10:0)+(/\/etc\/|C:\\|HKEY_|\\\\|\.exe\b/i.test(s)?5:0)+(/aes|rsa|sha256|decrypt|encrypt|password|token|key\b/i.test(s)?3:0);
  return score + Math.min(s.length,100)/100;
}
function collectStrings(bytes) {
  const found = new Map();
  function add(s){if(s.length<5||s.length>180||found.has(s)||found.size>=12000)return;found.set(s,stringScore(s));}
  let s="";
  for(let i=0;i<bytes.length;i++){
    const n=bytes[i];
    if(n>=32 && n<=126) {s+=String.fromCharCode(n); if(s.length>180) {add(s.slice(0,180));s="";}}
    else {add(s);s="";}
  }
  add(s);
  // UTF-16LE string extraction (separate scan, capped at 180 chars each).
  for(let parity=0;parity<2;parity++){
    let t="";
    for(let i=parity;i+1<bytes.length;i+=2){
      const x=bytes[i], y=bytes[i+1];
      if(x>=32&&x<=126&&y===0){t+=String.fromCharCode(x);if(t.length>180){add(t.slice(0,180));t="";}}
      else {add(t);t="";}
    }
    add(t);
  }
  return [...found].sort((a,b)=>b[1]-a[1]).slice(0,MAX_STRINGS).map(([s])=>s);
}
export async function inspectBinary(attachment) {
  const {bytes,filename}=decodeAttachment(attachment), v=viewOf(bytes);
  const digest=await crypto.subtle.digest("SHA-256",bytes);
  const sha256=[...new Uint8Array(digest)].map(x=>x.toString(16).padStart(2,"0")).join("");
  const analysis=parsePE(bytes,v)||parseELF(bytes,v)||parseOther(bytes,v);
  return {filename,bytes:bytes.length,sha256,analysisLevel:"lightweight-static-triage",...analysis,strings:collectStrings(bytes)};
}
export function formatBinaryReportForModel(report) {
  return JSON.stringify(report).slice(0,22000);
}
