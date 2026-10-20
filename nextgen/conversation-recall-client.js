/* Recall local conversation references without mixing separate chats. */
(function(){
"use strict";
window.nyxRecallContextPayload=function(messages,newText){
 const text=String(newText||"");
 const hasRef=/\b(?:those|these|them|their|earlier|previously|above|before|the list|the authors|authors you|authors we|ones you|ones we)\b/i.test(text);
 if(!hasRef)return null;
 const rows=Array.isArray(messages)?messages:[];
 const names=[],seen=new Set();
 const add=n=>{
  const v=String(n||"").replace(/_/g," ").replace(/\s+/g," ").trim();
  if(!/^[A-Z][A-Za-z.'’-]{1,36}(?:\s+[A-Z][A-Za-z.'’-]{1,36}){1,4}$/.test(v)||v.length>100)return;
  if(seen.has(v.toLowerCase()))return;
  seen.add(v.toLowerCase());if(names.length<60)names.push(v);
 };
 let relevantExcerpt="";
 for(let i=0;i<rows.length-1;i++){
   const m=rows[i];if(!m||!["assistant","user"].includes(m.role))continue;
   const body=String(m.content||"").slice(0,45000).replace(/\*\*/g,"");
   for(const hit of body.matchAll(/(?:^|\n)\s*(?:[-*]\s*)?(?:\d{1,3}[.)]\s*)?Author\s*:\s*([A-Z][A-Za-z.'’-]+(?:\s+[A-Z][A-Za-z.'’-]+){1,4})(?=\s*(?:\n|$|\*|[|]|Reviews?\s*:|Profile\s*:))/gmi))add(hit[1]);
   for(const hit of body.matchAll(/goodreads\.com\/author\/show\/\d+\.([A-Za-z][A-Za-z0-9_]{3,110})/gi))add(hit[1]);
   if(m.role==="assistant"&&(names.length>0||/\b(?:author|book|website|company|contact|address|results|list)\b/i.test(body))){
     relevantExcerpt=body.slice(0,2300);
   }
 }
 if(!names.length&&!relevantExcerpt)return null;
 return {authors:names.slice(0,60),relevantExcerpt:relevantExcerpt.slice(0,2300)};
};
})();