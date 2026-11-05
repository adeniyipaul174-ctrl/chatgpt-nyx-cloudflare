/** Optional server-side connection to an isolated Ghidra headless analyzer. */
export async function tryGhidraReport(env, binary, fetcher = fetch) {
  const endpoint = String(env.NYX_REVERSE_RUNNER_URL || '').replace(/\/+$/, '');
  const token = String(env.NYX_REVERSE_RUNNER_TOKEN || '');
  if (!endpoint || !token) return {status:'not_configured',report:null};
  let uri;
  try {
    uri = new URL(endpoint + '/analyze');
    if (uri.protocol !== 'https:') return {status:'configuration_error',report:null};
  } catch { return {status:'configuration_error',report:null}; }
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(), 65000);
  try {
    const response=await fetcher(uri.href,{
      method:'POST',headers:{'Authorization':'Bearer '+token,'Content-Type':'application/json'},
      body:JSON.stringify({filename:binary.filename||binary.name||'binary.bin',data:binary.data}),
      signal:controller.signal
    });
    if (!response.ok) return {status:'unavailable',report:null};
    const data=await response.json();
    if (data.engine!=='ghidra-headless'||!data.report||!Array.isArray(data.report.functions)) return {status:'invalid_report',report:null};
    return {status:'ok',report:data.report};
  } catch {return {status:'unavailable',report:null};}
  finally {clearTimeout(timer);}
}
function scoreFunction(fn) {
  const n=String(fn.name||'');
  const code=String(fn.pseudocode||'');
  return (/main|entry|DllMain|WinMain|JNI|export/i.test(n)?20:0)+
         (/VirtualAlloc|CreateProcess|execve|connect\(|socket\(|RegOpenKey|LoadLibrary|GetProcAddress|WriteProcessMemory/i.test(code)?10:0)+
         (code?2:0);
}
export function formatGhidraReport(report) {
  const functions=(Array.isArray(report?.functions)?report.functions:[])
    .slice(0,90)
    .sort((a,b)=>scoreFunction(b)-scoreFunction(a))
    .slice(0,12)
    .map(fn=>({name:String(fn.name||'').slice(0,120),address:String(fn.address||'').slice(0,40),
      signature:String(fn.signature||'').slice(0,320),pseudocode:String(fn.pseudocode||'').slice(0,1600)}));
  return JSON.stringify({engine:'ghidra-headless',analysisLevel:'approximate-decompiled-functions',
    language:String(report?.language||'').slice(0,90),
    totalFunctionsInRunnerReport:Array.isArray(report?.functions)?report.functions.length:0,
    selectedFunctions: functions,
    limitation:'Partial, approximate decompiler output. Never treat recovered pseudocode as original source.'}).slice(0,26000);
}
