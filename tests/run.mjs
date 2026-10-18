import assert from "node:assert/strict";
import {safePublicUrl,requiresLiveSearch,plainText,parseDuckResults,searchLiveWeb,readSearchPages} from "../src/free-web-research.js";
import {__test} from "../src/index.js";

let count=0;
function check(label,fn) {fn();count++;console.log("ok "+count+" - "+label);}
check("blocks internal IPs and non-HTTPS addresses",()=>{
  for(const url of ["http://example.com","https://127.0.0.1/","https://192.168.1.2/","https://[::1]/","https://localhost/","https://router.local/","https://user:pass@example.com/","https://example.com:8443/","https://169.254.169.254/latest/meta-data/"])
    assert.equal(safePublicUrl(url),null,url);
  assert.equal(safePublicUrl("https://example.org/path#part"),"https://example.org/path");
});
check("detects live research without triggering on greetings",()=>{
  for(const text of ["Search the web for affordable hosting","latest AI news today","find trending GitHub repositories","look up free hosting","what is the current price of fuel?"])
    assert.equal(requiresLiveSearch(text),true,text);
  for(const text of ["Hello there","Write a story about space","Calculate 3 + 4","Summarize this PDF"])
    assert.equal(requiresLiveSearch(text),false,text);
  assert.equal(__test.routeTask("latest AI news today"),"live_research");
});
check("strips HTML scripts instead of treating them as evidence",()=>{
  assert.equal(plainText("<main>Hello <b>world</b></main><script>evil()</script>").includes("evil"),false);
  assert.ok(plainText("<div>A &amp; B</div>").includes("A & B"));
});
const fixture='<a rel="nofollow" class="result-link" href="//duckduckgo.com/l/?uddg=https%3A%2F%2Fexample.org%2Fnews">Example &amp; News</a><td class="result-snippet">A new development</td>';
check("extracts real links from Lite result markup",()=>{
  const parsed=parseDuckResults(fixture);
  assert.equal(parsed.length,1);
  assert.equal(parsed[0].url,"https://example.org/news");
  assert.equal(parsed[0].title,"Example & News");
  assert.equal(parsed[0].provider,"DuckDuckGo");
});
const original=globalThis.fetch;
try {
  globalThis.fetch=async(url)=>{
    const u=String(url);
    if(u.includes("lite.duckduckgo.com"))return new Response(fixture,{headers:{"content-type":"text/html"}});
    if(u.includes("en.wikipedia.org"))return new Response(JSON.stringify({query:{pages:{42:{pageid:42,title:"Overview",extract:"Background."}}}}),{headers:{"content-type":"application/json"}});
    if(u==="https://example.org/news")return new Response("<html><body><h1>News</h1><p>"+"Verified content. ".repeat(20)+"</p></body></html>",{headers:{"content-type":"text/html"}});
    if(u.includes("wikipedia.org/?curid="))return new Response("<html><body><main>Wikipedia contents verified.</main></body></html>",{headers:{"content-type":"text/html"}});
    throw Error("Unexpected fetch "+u);
  };
  const results=await searchLiveWeb("mock live research test 8");
  assert.ok(results.results.length>=1);
  assert.equal(results.results[0].url,"https://example.org/news");
  const pages=await readSearchPages(results.results);
  assert.ok(pages[0].text.includes("Verified content"));
  count++;console.log("ok "+count+" - browser fetching and grounded result synthesis");
} finally {globalThis.fetch=original;}
console.log("Passed "+count+" NyX research checks.");
