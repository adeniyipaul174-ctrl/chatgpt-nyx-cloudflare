# NyX public launch capacity and QA gate (2026-10-19)

**Status: NOT READY FOR AN UNRESTRICTED PUBLIC LAUNCH.** This isolated audit branch makes no production deployment, D1 migration, billing change, account-limit change or model-training run.

## Cloudflare free quotas are hard service limits
- Workers AI: **10,000 neurons per account per day**; all limits reset 00:00 UTC. More inference requires an approved account-plan change.
- Workers Free: **100,000 Worker invocations per account per day**. These are not 100,000 AI chat responses.
- D1 Free: **5 million rows read and 100,000 rows written per day**.
- Provider rate limits, model choice, tool overhead and image generation can exhaust AI capacity much earlier.
- Primary Cloudflare documentation:
  https://developers.cloudflare.com/workers-ai/platform/pricing/
  https://developers.cloudflare.com/workers/platform/limits/
  https://developers.cloudflare.com/workers/platform/pricing/
  https://developers.cloudflare.com/workers-ai/platform/limits/

An official Cloudflare limit adjustment request is possible but not guaranteed. Do not shard fake accounts, bypass rate limits, enable billable add-ons or automatically upgrade billing.

## Verified configuration and activity (read-only)
- Live production version on inspection: be5f503d-86eb-4951-a74a-501cd4db66db. Recheck before any subsequent action.
- **The GitHub candidate and live version are NOT verified as identical.** Never deploy GitHub main or this audit branch blindly over live.
- Live Worker uses OpenRouter openrouter/free when available and Workers AI as fallback. Routine text uses Cloudflare 8B; more detailed answers may use a considerably costlier 70B model.
- Application-configured *per-user* daily beta caps: 45 chats, 30 searches, 2 image requests, 8 browser actions. Raising these numbers does NOT increase Cloudflare neurons.
- Production D1 aggregate for 2026-10-18: 37 chat actions, 15 search actions, 1 image action, and 5 browser actions, associated with one account. D1 action totals do NOT measure neurons, response accuracy, concurrent load or latency.
- True current Workers AI neuron consumption could not be retrieved through the connected endpoint. Check the actual usage graph in the Workers AI dashboard and account billing status before admitting testers.

## Illustrative response budget, NOT real capacity
At the currently published text-model rates for @cf/meta/llama-3.1-8b-instruct-fp8-fast, 1,500 input tokens plus 500 output tokens cost about 23.61 neurons **before** any search synthesis, additional model calls, image generation, retries or upstream provider usage. With 25% of the daily budget reserved, that yields approximately 317 such model responses per day—not 317 users, and not a service guarantee. The detailed-mode 70B model can consume several times more. Real model costs and traffic must be measured.

Offline, no-network utilities: nextgen/launch/capacity.mjs and nextgen/launch/qa.mjs.

## Every legitimate free-first optimization to consider
1. Measure daily neurons **per request type**, in aggregate without storing private prompts.
2. Keep the existing no-cost OpenRouter fallback only within its published quotas and privacy terms; don't rely on indefinite availability.
3. Route ordinary answers to resource-efficient models; reserve 70B for demanding tasks and only when a measured shared budget permits.
4. Remove unnecessary extra model calls for simple routing, summaries and deterministic formatting; cap output tokens without truncating essential results.
5. Keep current-conversation context relevant and bounded, preserving useful follow-up context without sending entire transcripts to providers.
6. Cache ONLY safe, stable, genuinely public search/page data with a grounded TTL. NEVER cross-cache private chats, uploaded documents, authentication results, secret-bearing material or personalized responses.
7. Reject irrelevant provider results and do bounded retries instead of wasting model calls synthesizing bad search content.
8. Rate-limit per account and IP, maintain safe signup abuse defenses and a total-account pause based on measured Workers AI quota. Do not remove existing fair-use caps to simulate a quota increase.
9. Pilot image generation, complex Deep Research and long-answer requests under modest separate budgets until their cost is known.
10. Use legit independently offered free model providers only within their own quotas and terms; evaluate reliability, privacy and data retention first.
11. Ask Cloudflare officially for limits adjustment when justified by demonstrated usage, recognizing increases are discretionary.
12. If capacity remains inadequate, only owner-approved paid Workers AI or paid inference plans can predictably buy a higher shared compute budget.

## Isolation, evaluation and honest limits
- Branch: audit/public-launch-capacity-2026-10-19, based on nyx/next-generation-2026-10-18.
- This branch does not modify the active deployment, authentication, API keys, database records, quotas or production code.
- Deterministic tests: npm run check --prefix nextgen and npm test --prefix nextgen with Node 22.
- Quality checks reject fake retrieved citations, unsupported "searched the web" claims, invented source URLs and texts pretending to be successfully generated images.
- These offline fixture tests are **not** live-model truthfulness tests or model fine-tuning. Proper weight training requires a vetted dataset, privacy protections, explicit cost/compute approval and the right provider. This audit does not train model weights.
- The next-generation candidate has features not currently verified against the latest live Worker. Source/version reconciliation is mandatory before a preview or public rollout.

## Strict stop-ship rules
- Production source or rollback version not reproducibly recoverable.
- Worker billing status and actual neuron headroom unverified.
- Any verified cross-user data leak, privilege bypass, exposed secrets, SSRF or XSS.
- Broken OAuth/auth sessions, image creation, file uploads, source citations, chat saves or search cancellation.
- No real browser/mobile testing or insufficient signed-in user/role tests.
- Only synthetic provider tests without an owner-approved supervised model sample.
- Unknown public load, excessive 429/5xx errors or inability to recover from free-tier exhaustion.

## Proposed graduated launch acceptance
1. Reconcile live source with candidate, back up all configuration and D1, reserve previous deployment for rollback.
2. Run the offline CI suite on every change; never auto-deploy this audit branch.
3. Test a sample of at least 100 independently graded prompts using real providers only with owner-approved free-budget allowances, including verifiable fresh facts, private vs public routing, refusals, citation accuracy and follow-ups.
4. Perform load simulations only in isolated staging **with mocked AI providers** to avoid exhausting the actual 10k-neuron production allowance. Include concurrent traffic, aborts, timeouts, retries, 429s, D1 failures and source outages.
5. Start with 10–20 trusted testers under low per-account allowance. Observe real neuron usage, error rates, prompt-classification quality, latency and privacy issues for at least a week.
6. Require no critical regressions or privacy/security failures. Define acceptable latency and error targets based on pilot measurements, not guesses.
7. Increase admissions only with measured capacity headroom. Continue invite-only, seek official limit adjustment, or ask owner for paid plan approval if limits are too low.
8. Approve any production promotion only after an explicit go/no-go and working rollback demonstration.

**No release is promised to be problem-free.** This staged process reduces risk and makes remaining issues measurable.
