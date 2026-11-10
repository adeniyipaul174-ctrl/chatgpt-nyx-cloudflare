/* NyX Search V5: independent live providers concurrently, grounded matching,
 * bounded browser fallback and honest empty responses. No fabricated sources.
 * Replaces the active Worker function nyxSearch(env,query,allowSources).
 */
function nxSearchV5Score(query,row){
 const q=String(query||"").toLowerCase();
 const ignored=new Set(["and","or","with","the","for","from","about","into","what","who","why","how","when","where","please","search","find","google","online","internet","web","latest","today","current","information","details","official","free","best","top","now","give","show","list","me","of","in","on","to","a","an"]);
 const parts=[...new Set(q.split(/[^a-z0-9]+/g).filter(t=>t.length>1&&!ignored.has(t)))].slice(0,15);
 const title=String(row?.title||"").toLowerCase();
 const url=String(row?.url||"").toLowerCase();
 const snippet=String(row?.snippet||"").toLowerCase();
 if(!parts.length)return {ok:false,score:0};
 let hits=0,score=0;
 for(const term of parts){
  if(title.includes(term)){score+=4;hits++}
  else if(url.includes(term)){score+=2;hits++}
  else if(snippet.includes(term)){score+=1;hits++}
 }
 const min=parts.length>=4?2:parts.length>=2?1:1;
 // For named topics, prefer an exact token match before generic snippets.
 return {ok:hits>=min&&score>=1,score:score+(url.includes("github.com")&&/github|repository|repo\b/i.test(q)?2:0),hits};
}
function nxSearchV5Rank(query,result){
 if(!result||!Array.isArray(result.results))return [];
 const normal=nyxSearchNormalizeResults(result.results);
 return normal.map(row=>({...row,_searchScore:nxSearchV5Score(query,row).score,_searchMatch:nxSearchV5Score(query,row).ok,_source:result.provider||"Public search"}))
  .filter(row=>row._searchMatch&&nyxSearchValidLink(row.url))
  .sort((a,b)=>b._searchScore-a._searchScore)
  .slice(0,7);
}
async function nyxSearch(env,query,allowSources=true){
 const q=nyxNormalizeSearch(query).slice(0,180);
 if(q.length<2)return {kind:"search",reply:"Please enter a more specific topic to search.",sources:[],provider:"None"};
 const cached=nyxSearchPublicCacheGet(q);
 if(cached)return {...cached,sources:allowSources?cached.sources:[],cached:true};
 const news=/\b(?:news|breaking|headlines|latest|today|this week)\b/i.test(q);
 const github=/\b(?:github|repositories|repos|repository)\b/i.test(q)||/^[\w-]{3,40}\/[\w.-]{2,80}$/.test(q)||/^[a-z0-9_-]{5,22}$/i.test(q);
 const direct=[
  ...(github?[()=>nxPublicGithubSearch(q)]:[]),
  ...(env.TAVILY_API_KEY?[()=>nyxProviderTavily(env,q)]:[]),
  ...(env.SERPER_API_KEY?[()=>nyxProviderSerper(env,q)]:[]),
  ...(news?[()=>nyxBingNewsFeed(q)]:[]),
  ()=>nyxBingWebDirect(q),
  async()=>({provider:"DuckDuckGo direct",results:await nyxSearchDuckDirect(q)})
 ];
 const settled=await Promise.allSettled(direct.map(async fn=>{
  try{return await fn()}catch{return null}
 }));
 const candidates=[];
 for(const item of settled){
  if(item.status!=="fulfilled"||!item.value)continue;
  for(const row of nxSearchV5Rank(q,item.value))candidates.push(row);
 }
 const unique=new Map();
 const append=rows=>{
  for(const row of rows){
   const safe=nyxSearchValidLink(row.url);
   if(!safe)continue;
   let key=safe;try{const u=new URL(safe);u.hash="";for(const name of [...u.searchParams.keys()])if(/^utm_|^ref$|^fbclid$|^gclid$/i.test(name))u.searchParams.delete(name);key=u.href.replace(/\/$/,"")}catch{}
   const old=unique.get(key);
   if(!old||Number(row._searchScore)>Number(old._searchScore))unique.set(key,row);
  }
 };
 append(candidates);
 // Use free Cloudflare Browser Rendering only if direct results were insufficient.
 // It is not an unlimited general-purpose search subscription.
 if(!unique.size&&env.BROWSER){
  let remaining=true;
  try{
   if(typeof env.BROWSER.limits==="function"){
    const limits=await env.BROWSER.limits();
    if(Number(limits?.usedBrowserTimeSeconds||0)>=540)remaining=false;
   }
  }catch{remaining=false}
  if(remaining){
   for(const target of [
    ["DuckDuckGo browser","https://lite.duckduckgo.com/lite/?q="+encodeURIComponent(q),nyxExtractDuckResults],
    ["Bing browser","https://www.bing.com/search?q="+encodeURIComponent(q),nyxExtractBingResults]
   ]){
    try{
     const page=await nyxBrowserMarkdown(env,target[1]);
     append(nxSearchV5Rank(q,{provider:target[0],results:target[2](page.markdown)}));
     if(unique.size)break;
    }catch{/* An unavailable provider is not proof that the query has no answer. */}
   }
  }
 }
 const searchedAt=new Date().toISOString();
 if(!unique.size){
  return {kind:"search",
   reply:"I couldn't verify a relevant public result for this exact search right now. Some search providers may be blocking automated requests or have no matches. Try the full name, official website, or a narrower search term; I won't invent sources.",
   sources:[],provider:"No matching live source",searchedAt};
 }
 const ordered=[...unique.values()].sort((a,b)=>b._searchScore-a._searchScore).slice(0,7);
 const provider=[...new Set(ordered.map(x=>x._source))].slice(0,3).join(" + ");
 const cleaned=ordered.map(({_searchScore,_searchMatch,_source,...r})=>r);
 const value={kind:"search",reply:nyxSearchSummary(q,cleaned),sources:cleaned,provider,searchedAt};
 nyxSearchPublicCacheSet(q,value);
 return {...value,sources:allowSources?cleaned:[]};
}
