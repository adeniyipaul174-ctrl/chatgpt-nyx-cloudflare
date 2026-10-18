// Fixed algorithms only. This module never evaluates user code or performs I/O.
export function parseCSV(text) {
 if(typeof text!=='string'||text.length>180000)throw Error('CSV exceeds 180,000 characters');
 const rows=[];let row=[],field='',quoted=false;
 const endField=()=>{row.push(field);field='';if(row.length>128)throw Error('CSV exceeds 128 columns');};
 const endRow=()=>{endField();if(row.some(x=>x!==''))rows.push(row);row=[];if(rows.length>10001)throw Error('CSV exceeds 10,000 data rows');};
 for(let i=0;i<text.length;i++){
  const c=text[i];
  if(c==='"'){if(quoted&&text[i+1]==='"'){field+='"';i++;}else if(quoted)quoted=false;else if(field==='')quoted=true;else throw Error('Invalid CSV quoting');}
  else if(c===','&&!quoted)endField();
  else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&text[i+1]==='\n')i++;endRow();}
  else field+=c;
 }
 if(quoted)throw Error('Unclosed quoted CSV field');
 if(field||row.length)endRow();
 if(rows.length<2)throw Error('CSV requires a header and at least one data row');
 if(rows.some(r=>r.length!==rows[0].length))throw Error('CSV rows have inconsistent column counts');
 return rows;
}
export function analyzeCSV(text) {
 const [headers,...rows]=parseCSV(text),results=[];
 for(let c=0;c<headers.length;c++){
  const values=[];let missing=0,invalid=0;
  for(const row of rows){const raw=row[c].trim();if(!raw){missing++;continue;}if(!/^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(raw)){invalid++;continue;}const n=Number(raw);if(Number.isFinite(n))values.push(n);else invalid++;}
  if(!values.length)continue;
  let mean=0,m2=0;values.forEach((x,i)=>{const d=x-mean;mean+=d/(i+1);m2+=d*(x-mean);});
  values.sort((a,b)=>a-b);const n=values.length,mid=Math.floor(n/2);
  results.push({column:headers[c]||'Column '+(c+1),count:n,missing,nonNumeric:invalid,min:values[0],max:values.at(-1),mean,median:n%2?values[mid]:(values[mid-1]+values[mid])/2,sampleStdDev:n>1?Math.sqrt(m2/(n-1)):null});
 }
 const safe=x=>String(x).replace(/[|\r\n]/g,' '),number=x=>x===null?'n/a':Number.isFinite(x)?Number(x.toPrecision(8)).toString():'overflow';
 const reply='Calculated CSV statistics (fixed algorithms; no AI-generated code was executed).\n\nRows: '+rows.length+'. Empty fields and non-numeric values are excluded from numeric statistics.\n\n| Column | Count | Missing | Non-numeric | Min | Max | Mean | Median | Sample SD |\n|---|---:|---:|---:|---:|---:|---:|---:|---:|\n'+results.map(r=>'| '+[safe(r.column),r.count,r.missing,r.nonNumeric,number(r.min),number(r.max),number(r.mean),number(r.median),number(r.sampleStdDev)].join(' | ')+' |').join('\n')+(results.length?'':'No numeric columns were found.');
 return {kind:'analysis',reply,generatedFiles:[{name:'nyx-statistics.json',type:'application/json',content:JSON.stringify({rows:rows.length,columns:results},null,2)}]};
}
