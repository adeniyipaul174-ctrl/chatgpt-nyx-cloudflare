/* NyX file-type expansion: browser-side, read-only static inspection.
   This DOES NOT run uploaded code or claim full decompilation. */
const NYX_BINARY_EXTENSIONS=new Set(['so','elf','o','a','exe','dll','bin','dat','wasm','dex','class','ko','dylib','apk','zip','jar','aar']);
const NYX_ARCHIVE_EXTENSIONS=new Set(['zip','apk','jar','aar']);
function nyxReadString(a,start,max){
 if(!Number.isSafeInteger(start)||start<0||start>=a.length)return '';
 let s='';for(let i=start;i<a.length&&i<start+(max||160);i++){
  const b=a[i];if(!b)break;if(b<32||b>126)break;s+=String.fromCharCode(b);
 }return s;
}
function nyxLittle64(d,offset,little){
 if(offset<0||offset+8>d.byteLength)return 0;
 return little?d.getUint32(offset,true)+d.getUint32(offset+4,true)*4294967296:d.getUint32(offset+4,false)+d.getUint32(offset,false)*4294967296;
}
function nyxImportantStrings(bytes){
 const selected=[],seen=new Set();let current='';
 function consider(str){
  if(str.length<6||str.length>220||seen.has(str))return;
  seen.add(str);
  const isInteresting=/Java_|JNI_|\.so\b|\.dll\b|\b(libc|liblog|libm|pthread|dlopen|dlsym|mprotect|openat|execve|AES|SHA|SSL|http|socket|crypt|token|signature|verify|android|debug|root)\b|https?:\/\//i.test(str);
  if(isInteresting&&selected.length<48)selected.push(str);
 }
 for(let i=0;i<bytes.length;i++){
  const ch=bytes[i];if(ch>=32&&ch<=126){if(current.length<=220)current+=String.fromCharCode(ch)}
  else{if(current)consider(current);current='';}
 }
 if(current)consider(current);
 return selected;
}
function nyxBinaryReport(bytes,filename){
 if(!(bytes instanceof Uint8Array))bytes=new Uint8Array(bytes);
 if(bytes.length<4)throw Error('The binary is too small to inspect');
 const d=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
 const text=['Static file inspection: '+String(filename||'binary').slice(0,160),'Size: '+bytes.length+' bytes'];
 const readable=(off,n)=>off>=0&&n>=0&&off+n<=bytes.length;
 const getU16=(off,le)=>readable(off,2)?d.getUint16(off,le):0;
 const getU32=(off,le)=>readable(off,4)?d.getUint32(off,le):0;
 let kind='Unknown binary';
 if(bytes[0]===0x7f&&bytes[1]===69&&bytes[2]===76&&bytes[3]===70){
  kind='ELF';const is64=bytes[4]===2,little=bytes[5]!==2;
  const machine=getU16(18,little),eType=getU16(16,little);
  const names={3:'x86',40:'ARM 32-bit',62:'x86-64',183:'ARM64 / AArch64',8:'MIPS',20:'PowerPC',243:'RISC-V'};
  const types={1:'relocatable object',2:'executable',3:'shared object (ET_DYN)',4:'core dump'};
  text.push('Format: ELF '+(is64?'64-bit':'32-bit')+', '+(little?'little':'big')+' endian');
  text.push('Architecture: '+(names[machine]||'machine '+machine));text.push('ELF type: '+(types[eType]||eType));
  const shoff=is64?nyxLittle64(d,40,little):getU32(32,little),size=getU16(is64?58:46,little),count=getU16(is64?60:48,little),stringsIndex=getU16(is64?62:50,little);
  const sections=[];
  if(size>0&&size<256&&count<2048&&readable(shoff,size*count)){
   for(let i=0;i<Math.min(count,500);i++){
    const p=shoff+i*size,off=is64?nyxLittle64(d,p+24,little):getU32(p+16,little),len=is64?nyxLittle64(d,p+32,little):getU32(p+20,little);
    sections.push({nameOffset:getU32(p,little),type:getU32(p+4,little),offset:off,size:len,entrySize:is64?nyxLittle64(d,p+56,little):getU32(p+36,little)});
   }
   const stringSection=sections[stringsIndex];
   if(stringSection&&readable(stringSection.offset,stringSection.size)){
    for(const sec of sections)sec.name=nyxReadString(bytes,stringSection.offset+sec.nameOffset,72);
   }
   text.push('Sections: '+sections.filter(x=>x.name).slice(0,35).map(x=>x.name+' ('+x.size+' bytes)').join(', '));
   const dynstr=sections.find(x=>x.name==='.dynstr');
   const dynamic=sections.find(x=>x.name==='.dynamic');
   if(dynstr&&dynamic&&readable(dynstr.offset,dynstr.size)&&readable(dynamic.offset,dynamic.size)){
    const dep=[];const stride=is64?16:8;
    for(let p=dynamic.offset;p+stride<=dynamic.offset+dynamic.size&&dep.length<40;p+=stride){
     const tag=is64?nyxLittle64(d,p,little):getU32(p,little);
     const value=is64?nyxLittle64(d,p+8,little):getU32(p+4,little);
     if(tag===0)break;
     if(tag===1&&value<dynstr.size){const name=nyxReadString(bytes,dynstr.offset+value,160);if(name)dep.push(name);}
    }
    if(dep.length)text.push('Declared dependencies (DT_NEEDED): '+dep.join(', '));
    const dynsym=sections.find(x=>x.name==='.dynsym');
    if(dynsym&&readable(dynsym.offset,dynsym.size)){
     const imports=[],exports=[];const stride=is64?24:16;
     for(let p=dynsym.offset;p+stride<=dynsym.offset+dynsym.size&&p<dynsym.offset+2000*stride;p+=stride){
      const nameIndex=getU32(p,little),name=nameIndex<dynstr.size?nyxReadString(bytes,dynstr.offset+nameIndex,90):'';
      const sectionIndex=getU16(p+(is64?6:14),little);
      if(!name)continue;
      if(sectionIndex===0&&imports.length<45)imports.push(name);
      else if(sectionIndex!==0&&exports.length<45)exports.push(name);
     }
     if(imports.length)text.push('Dynamic undefined symbols / likely imports: '+imports.join(', '));
     if(exports.length)text.push('Defined dynamic symbols / possible exports: '+exports.join(', '));
    }
   }
  }else{text.push('Section table missing, truncated, or unsupported; metadata may be incomplete.');}
 }else if(bytes[0]===77&&bytes[1]===90){
  kind='PE';const pe=getU32(60,true);
  if(readable(pe,24)&&getU32(pe,true)===0x4550){
   const machine=getU16(pe+4,true),architecture={0x14c:'x86',0x8664:'x86-64',0x1c0:'ARM',0xaa64:'ARM64'}[machine]||'machine '+machine;
   text.push('Format: Windows PE, architecture: '+architecture);
   const sections=[],n=Math.min(getU16(pe+6,true),96),p=pe+24+getU16(pe+20,true);
   for(let i=0;i<n&&readable(p+i*40,40);i++){sections.push(nyxReadString(bytes,p+i*40,8));}
   if(sections.length)text.push('Sections: '+sections.join(', '));
  }else text.push('MZ header found, PE header unavailable.');
 }else if(bytes[0]===0&&bytes[1]===97&&bytes[2]===115&&bytes[3]===109){kind='WebAssembly';text.push('Format: WebAssembly module');}
 else if(bytes[0]===100&&bytes[1]===101&&bytes[2]===120&&bytes[3]===10){kind='DEX';text.push('Format: Android Dalvik bytecode (DEX)');}
 else if(bytes[0]===33&&bytes[1]===60&&bytes[2]===97&&bytes[3]===114){kind='Unix ar archive';text.push('Format: Unix static-library/archive');}
 else if(bytes[0]===0xca&&bytes[1]===0xfe&&bytes[2]===0xba&&bytes[3]===0xbe){kind='Java class / Mach-O fat';text.push('Format: Java class or Mach-O universal binary; further inspection needed');}
 else{text.push('Format: unrecognized binary. Magic bytes: '+Array.from(bytes.slice(0,16),x=>x.toString(16).padStart(2,'0')).join(' '));}
 const strings=nyxImportantStrings(bytes);if(strings.length)text.push('Interesting embedded strings (evidence, not proof of execution): '+strings.join(' | '));
 text.push('Analysis level: read-only static inspection; no code execution or full decompilation.');
 return {kind,report:text.join('\n').slice(0,7600)};
}
async function nyxBinaryDocument(file){
 const bytes=new Uint8Array(await file.arrayBuffer());
 const hash=await crypto.subtle.digest('SHA-256',bytes);
 const sha=Array.from(new Uint8Array(hash),x=>x.toString(16).padStart(2,'0')).join('');
 const ext=file.name.split('.').pop().toLowerCase();
 if(NYX_ARCHIVE_EXTENSIONS.has(ext)||bytes[0]===80&&bytes[1]===75&&bytes[2]===3&&bytes[3]===4){
  if(!window.JSZip)await useScript('https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js');
  const archive=await window.JSZip.loadAsync(bytes,{checkCRC32:false,createFolders:false});
  const entries=Object.values(archive.files).filter(x=>!x.dir);
  if(entries.length>20000)throw Error('Archive contains too many entries for browser analysis');
  let report=['ZIP archive: '+file.name,'SHA-256: '+sha,'Compressed bytes: '+bytes.length,'Entries: '+entries.length];
  report.push('Archive contents (sample): '+entries.slice(0,85).map(x=>x.name.slice(0,180)).join(' | '));
  const candidates=entries.filter(x=>/\.(so|elf|exe|dll|wasm|dex)$/i.test(x.name)).slice(0,3);
  for(const item of candidates){
   const expected=Number(item._data&&item._data.uncompressedSize);
   if(!Number.isFinite(expected)||expected>6000000||expected<4){report.push('Skipped oversized or unknown-size binary: '+item.name);continue;}
   try{const raw=await item.async('uint8array');if(raw.length>6000000)throw Error('unpacked file too large');
    report.push('Embedded file '+item.name+':\n'+nyxBinaryReport(raw,item.name).report.slice(0,2400));}
   catch(e){report.push('Could not inspect '+item.name+': '+String(e.message||e).slice(0,120));}
  }
  report.push('ZIP files are not executed; encrypted items and large embedded binaries cannot be decompiled in browser.');
  return report.join('\n').slice(0,7800);
 }
 const out=nyxBinaryReport(bytes,file.name).report;
 return ('SHA-256: '+sha+'\n'+out).slice(0,7800);
}