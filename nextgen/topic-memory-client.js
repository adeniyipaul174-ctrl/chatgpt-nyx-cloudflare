/* NyX session-local topic recall: uses only the current conversation. */
(function(){
 "use strict";
 window.nyxTopicMemoryV2=function(messages,newText){
   const q=String(newText||"");
   const rows=Array.isArray(messages)?messages:[];
   if(rows.length<=17)return null;
   const tokens=(v)=>new Set((String(v||"").toLowerCase().match(/[a-z]{3,}/g)||[])
     .filter(w=>!["that","this","them","their","those","there","here","all","and","the","what","which","when","where","who","you","your","was","were","are","did","can","will","with","from","for","does","have","has","earlier","before","previous","about","please","could","would","should","search","find","contact","email"].includes(w)));
   const qt=tokens(q),ref=/\b(?:earlier|before|previous|mentioned|said|listed|found|those|these|them|their|remember|recall|we discussed|we talked|last time|above|the list|the third|the first|the second)\b/i.test(q);
   if(!ref&&qt.size<2)return null;
   const options=[];
   for(let i=0;i<rows.length-16;i++){
     const m=rows[i];if(!["user","assistant"].includes(m?.role))continue;
     const content=String(m.content||"").slice(0,13000);
     const mt=tokens(content);let shared=0;for(const k of qt)if(mt.has(k))shared++;
     const named=/\b(?:author|book|Goodreads|chapter|price|model|NyX)\b/i.test(content);
     const score=shared*4+(ref&&named?2:0)+(m.role==="user"?1:0);
     if(score>=4||(ref&&named&&score>=2))options.push({index:i,score,role:m.role,content:content.slice(0,1500)});
   }
   options.sort((a,b)=>b.score-a.score||b.index-a.index);
   const selected=options.slice(0,4).sort((a,b)=>a.index-b.index);
   if(!selected.length)return null;
   return selected.map(x=>x.role+": "+x.content).join("\n\n").slice(0,4500);
 };
})();