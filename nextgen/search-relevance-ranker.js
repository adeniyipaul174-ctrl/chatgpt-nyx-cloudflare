function nxResearchRank(q,rows){
 const terms=nxResearchTokens(q);
 if(!terms.length)return [];
 const minimum=terms.length===1?1:Math.max(2,Math.min(4,Math.ceil(terms.length*0.6)));
 const named=String(q).match(/^([A-Z][A-Za-z.'’-]+(?:\s+[A-Z]\.)?(?:\s+[A-Z][A-Za-z.'’-]+){1,3})\s+(?:author|writer|books?)\b/i);
 const person=named?named[1].split(/\s+/).filter(x=>!/^[A-Z]\.$/.test(x)):[];
 const first=person[0]?.toLowerCase()||"",last=person.at(-1)?.toLowerCase()||"";
 const freeRequired=/\bfree\b/i.test(q);
 const checked=(rows||[]).map(row=>({row,rank:nxResearchMatch(q,row)})).filter(({row,rank})=>{
  if(rank<minimum)return false;
  const hay=(String(row?.title||"")+" "+String(row?.snippet||"")).toLowerCase();
  if(first&&last&&first!==last&&(!hay.includes(first)||!hay.includes(last)))return false;
  if(freeRequired&&!/\b(?:free|no.cost|free.tier|free.to.use|without.payment|0\.00)\b/i.test(hay))return false;
  return true;
 }).sort((a,b)=>b.rank-a.rank).map(x=>x.row);
 return nyxSearchNormalizeResults(checked).slice(0,7);
}