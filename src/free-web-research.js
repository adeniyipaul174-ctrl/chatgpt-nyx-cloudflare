// NyX free-first live research. No paid search API, tokens or arbitrary proxy.
const CACHE = new Map();
const SEARCH_TTL_MS = 180_000;
const BLOCKED_HOST = /(?:^|\.)(?:localhost|local|internal|test|invalid|example|onion)$/i;
const BLOCKED_IPV4 = /^(?:\d{1,3}\.){3}\d{1,3}$/;
const SEARCH_HEADERS = {Accept:"text/html,application/xhtml+xml,application/xml;q=0.8,text/plain;q=0.7,*/*;q=0.3"};

export function safePublicUrl(input) {
  try {
    const u = new URL(String(input || ""));
    const host = u.hostname.toLowerCase().replace(/\.$/, "");
    if (u.protocol !== "https:" || u.username || u.password || u.port || !host.includes(".") || host.length > 253) return null;
    if (BLOCKED_HOST.test(host) || BLOCKED_IPV4.test(host) || host.includes(":") || host === "metadata.google.internal") return null;
    if (!/^[a-z0-9.-]+$/.test(host) || host.split(".").some(part => !part || part.startsWith("-") || part.endsWith("-"))) return null;
    u.hash = "";
    return u.toString();
  } catch { return null; }
}

export function requiresLiveSearch(message) {
  const s = String(message || "").trim();
  if (!s) return false;
  if (/\b(?:read|open|visit|check|summari[sz]e|analy[sz]e|review|extract)\b[\s\S]{0,140}https:\/\//i.test(s)) return true;
  if (/\b(?:search(?:\s+the)?\s+(?:web|internet|online)|look\s+up|google|browse\s+the\s+web|research\s+(?:online|the\s+web)|find\s+(?:online|on\s+the\s+web)|check\s+(?:online|the\s+web)|find\s+(?:the\s+)?(?:latest|current)|verify\s+(?:online|with\s+sources))\b/i.test(s)) return true;
  if (/\b(?:today|tonight|this\s+(?:week|month|year)|right\s+now|latest|breaking|current(?:ly)?|recent(?:ly)?|upcoming|newest|as\s+of\s+2026|live)\b/i.test(s) &&
      /\b(?:news|weather|price|cost|rate|stock|crypto|release|version|update|schedule|event|election|sports?|score|research|company|technology|model|API|law|policy|president|leader|availability|find|what|who|when|how|which)\b/i.test(s)) return true;
  if (/\b(?:github|repositories|open-source\s+repos?)\b/i.test(s) && /\b(?:find|search|latest|best|compare|recommend|trending|research|list)\b/i.test(s)) return true;
  return false;
}

function decodeEntities(value) {
  return String(value||"").replace(/&(?:amp|lt|gt|quot|apos|nbsp|#(\d+)|#x([0-9a-f]+));/gi, (m,d,h) => {
    if (d || h) { const n = d ? Number(d) : parseInt(h,16); return n >= 32 && n <= 0x10ffff ? String.fromCodePoint(n) : " "; }
    return ({ "&amp;":"&", "&lt;":"<", "&gt;":">", "&quot;":'"', "&apos;":"'", "&nbsp;":" " })[m.toLowerCase()] || " ";
  });
}
export function plainText(html, max=4500) {
  return decodeEntities(String(html||"")
    .replace(/<!--[\s\S]*?-->/g," ")
    .replace(/<(?:script|style|noscript|svg|iframe|form|nav|footer|header)\b[^>]*>[\s\S]*?<\/(?:script|style|noscript|svg|iframe|form|nav|footer|header)\s*>/gi," ")
    .replace(/<[^>]+>/g," ")
    .replace(/\s+/g," ").trim()).slice(0,max);
}
async function fetchBounded(url, {timeout=7500,maxBytes=180_000,accept=SEARCH_HEADERS.Accept}={}) {
  const target = safePublicUrl(url);
  if (!target) throw Error("Unsafe or unsupported URL");
  const response = await fetch(target, {headers:{Accept:accept},redirect:"manual",signal:AbortSignal.timeout(timeout)});
  if (!response.ok) throw Error("Remote site unavailable");
  const type = (response.headers.get("content-type")||"").toLowerCase();
  if (!(type.includes("text/html") || type.includes("text/plain") || type.includes("application/xml") || type.includes("text/xml") || type.includes("application/rss+xml") || type.includes("application/json"))) throw Error("Unsupported response type");
  const advertised = Number(response.headers.get("content-length")||0);
  if (advertised > maxBytes) throw Error("Response exceeds size budget");
  const reader = response.body?.getReader();
  if (!reader) return "";
  const chunks=[]; let total=0;
  try {
    while (true) {
      const next=await reader.read();
      if (next.done) break;
      total+=next.value.byteLength;
      if (total > maxBytes) { await reader.cancel(); throw Error("Response exceeds size budget"); }
      chunks.push(next.value);
    }
  } finally { try { reader.releaseLock(); } catch {} }
  const result = new Uint8Array(total); let index=0;
  for (const part of chunks) { result.set(part,index); index+=part.length; }
  return new TextDecoder().decode(result);
}
function cleanResult(item) {
  const url=safePublicUrl(item.url); if (!url) return null;
  const title=plainText(item.title||url,150);
  const snippet=plainText(item.snippet||"",440);
  return {title:title||new URL(url).hostname,url,snippet,provider:item.provider||"Web"};
}
function uniqueResults(items, max=6) {
  const seen=new Set(); const output=[];
  for (const item of items) {
    const row=cleanResult(item); if(!row || seen.has(row.url)) continue;
    seen.add(row.url);output.push(row);
    if(output.length>=max) break;
  }
  return output;
}
function unwrapDuck(href) {
  const raw=decodeEntities(href||"");
  try {
    const u=new URL(raw,"https://lite.duckduckgo.com");
    if (u.hostname.endsWith(".duckduckgo.com") || u.hostname==="duckduckgo.com") {
      const encoded=u.searchParams.get("uddg");
      return encoded ? safePublicUrl(encoded) : null;
    }
    return safePublicUrl(u.toString());
  } catch { return null; }
}
export function parseDuckResults(html) {
  const output=[];
  // DuckDuckGo Lite HTML uses result-link anchors; HTML or order may change.
  const anchor=/<a\b([^>]*?)>([\s\S]*?)<\/a>/gi; let match;
  while ((match=anchor.exec(html)) && output.length<10) {
    const attrs=match[1], klass=/\bclass\s*=\s*["']([^"']+)["']/i.exec(attrs)?.[1]||"";
    if (!/\bresult(?:-link|__a)\b/i.test(klass)) continue;
    const href=/\bhref\s*=\s*["']([^"']+)["']/i.exec(attrs)?.[1]||"";
    const url=unwrapDuck(href); if(!url) continue;
    const after=html.slice(anchor.lastIndex,anchor.lastIndex+1500);
    const snippet=/<(?:td|div)\b[^>]*class\s*=\s*["'][^"']*(?:result-snippet|result__snippet)[^"']*["'][^>]*>([\s\S]*?)<\/(?:td|div)>/i.exec(after)?.[1]||"";
    output.push({title:match[2],url,snippet,provider:"DuckDuckGo"});
  }
  return uniqueResults(output);
}
async function duckSearch(query) {
  const url="https://lite.duckduckgo.com/lite/?q="+encodeURIComponent(query.slice(0,180));
  return parseDuckResults(await fetchBounded(url,{timeout:7000,maxBytes:240000}));
}
async function githubSearch(query) {
  const q=query.replace(/\b(?:github|repositories|repos?|find|search|best|trending|please)\b/gi," ").trim().slice(0,100)||query.slice(0,100);
  const url="https://api.github.com/search/repositories?q="+encodeURIComponent(q)+"&per_page=6";
  const json=JSON.parse(await fetchBounded(url,{timeout:6000,maxBytes:160000,accept:"application/json"}));
  return uniqueResults((json.items||[]).map(it=>({title:it.full_name,url:it.html_url,snippet:it.description||"",provider:"GitHub"})));
}
async function searxSearch(query,baseUrl) {
  const root=safePublicUrl(baseUrl); if(!root) return [];
  const url=new URL("/search",root);
  url.searchParams.set("q",query.slice(0,180));
  url.searchParams.set("format","json");
  const json=JSON.parse(await fetchBounded(url.toString(),{timeout:6500,maxBytes:170000,accept:"application/json"}));
  return uniqueResults((json.results||[]).map(row=>({title:row.title,url:row.url,snippet:row.content||"",provider:"SearXNG"})));
}
async function wikipediaSearch(query) {
  const url="https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch="+encodeURIComponent(query.slice(0,150))+"&gsrlimit=5&prop=extracts&exintro=1&explaintext=1&exsentences=2&format=json&origin=*";
  const json=JSON.parse(await fetchBounded(url,{timeout:6000,maxBytes:160000,accept:"application/json"}));
  return uniqueResults(Object.values(json.query?.pages||{}).map(p=>({title:p.title,url:"https://en.wikipedia.org/?curid="+Number(p.pageid),snippet:p.extract||"",provider:"Wikipedia"})));
}
async function bingNewsSearch(query) {
  const xml=await fetchBounded("https://www.bing.com/news/search?q="+encodeURIComponent(query.slice(0,140))+"&format=rss",{timeout:6500,maxBytes:140000});
  const items=xml.match(/<item\b[^>]*>[\s\S]*?<\/item>/gi)||[];
  return uniqueResults(items.slice(0,8).map(item=>{
    const content=tag=>(new RegExp("<"+tag+"(?:\\s[^>]*)?>([\\s\\S]*?)<\\/"+tag+">","i").exec(item)?.[1]||"").replace(/^<!\[CDATA\[|\]\]>$/g,"");
    return {title:content("title"),url:content("link"),snippet:content("description"),provider:"Bing News"};
  }));
}
export async function searchLiveWeb(query,options={}) {
  const q=String(query||"").replace(/\s+/g," ").trim().slice(0,180);
  if(q.length<3) return {results:[],provider:"None",notice:"Please enter a more specific search."};
  const urlCandidate=/https:\/\/[^\s<>"\x27]+/i.exec(q)?.[0]?.replace(/[),.;]+$/,"");
  if(urlCandidate && /\b(?:read|open|visit|check|summari[sz]e|analy[sz]e|review|extract)\b/i.test(q)) {
    const safe=safePublicUrl(urlCandidate);
    if(safe)return {results:[{title:new URL(safe).hostname,url:safe,snippet:"User-requested public webpage",provider:"Direct URL"}],provider:"Direct URL",notice:""};
  }
  const git=/\b(?:github|repositories|open.source\s+repos?)\b/i.test(q);
  const news=/\b(?:news|headlines|breaking)\b/i.test(q);
  const cacheKey=(options.searxngBaseUrl?"sx:":"")+(git?"g:":news?"n:":"w:")+q.toLowerCase();
  const cached=CACHE.get(cacheKey);
  if(cached && Date.now()-cached.at<SEARCH_TTL_MS) return {...cached.data,cached:true};
  const tasks=[];
  if(options.searxngBaseUrl)tasks.push(searxSearch(q,options.searxngBaseUrl));
  if(git)tasks.push(githubSearch(q),duckSearch(q));
  else if(news)tasks.push(bingNewsSearch(q),duckSearch(q));
  else tasks.push(duckSearch(q),wikipediaSearch(q));
  const settled=await Promise.allSettled(tasks);
  const preferred=settled.flatMap(item=>item.status==="fulfilled"?item.value:[]);
  const results=uniqueResults(preferred,6);
  const data={results,provider:results[0]?.provider||"None",notice:results.length?"":"Live search providers returned no accessible sources. Do not invent web findings."};
  if(CACHE.size>100) CACHE.clear();
  CACHE.set(cacheKey,{at:Date.now(),data});
  return data;
}
export async function readSearchPages(results) {
  const selected=uniqueResults(results,3).slice(0,2);
  const pages=await Promise.all(selected.map(async item=>{
    try {
      const html=await fetchBounded(item.url,{timeout:6000,maxBytes:140000});
      const text=plainText(html,3600);
      return {title:item.title,url:item.url,text:text.length>120?text:""};
    } catch { return {title:item.title,url:item.url,text:""}; }
  }));
  return pages;
}
