import {readFile,writeFile,mkdir} from 'node:fs/promises';
const modules=['runtime.mjs','research.mjs','client.mjs','pwa.mjs','data.mjs','worker.mjs'];
const chunks=[];
for(const file of modules){
 const text=await readFile(new URL(file,import.meta.url),'utf8');
 chunks.push('// Module: '+file+'\n'+text.replace(/^import .*?;\n/gm,'').replace(/^export (?=(?:async )?function|const )/gm,''));
}
await mkdir(new URL('dist/',import.meta.url),{recursive:true});
await writeFile(new URL('dist/worker.mjs',import.meta.url),chunks.join('\n'));
