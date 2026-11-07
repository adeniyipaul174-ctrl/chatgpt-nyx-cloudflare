// Verify existing no-cost OpenRouter provider without exposing credentials.
import {githubOidcToken} from './nyx-github-agents.mjs';
const token=await githubOidcToken();
const response=await fetch('https://chatgpt-nyx-v3-test.adeniyipaul174.workers.dev/__nyx/free-provider-probe',{method:'POST',headers:{Authorization:'Bearer '+token},signal:AbortSignal.timeout(45000)});
const body=await response.text();
if(!response.ok){console.error('Provider probe failed HTTP '+response.status+': '+body.slice(0,300));process.exitCode=1}
else{
 const result=JSON.parse(body);
 console.log('Existing free provider status: '+JSON.stringify(result));
 if(!result.available)console.log('Model is currently unavailable. Do not claim website generation will succeed.');
}
