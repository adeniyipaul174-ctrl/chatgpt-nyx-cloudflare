# NyX public-launch audit — isolated QA branch

**Status: NOT READY FOR UNRESTRICTED PUBLIC LAUNCH. This branch must not be deployed as production.**

This is a safety and capacity audit of the newer NyX candidate, created on 2026-10-19. It is not a production upgrade or a free quota increase. Existing Cloudflare production code, secrets, authentication data, and D1 contents were not changed.

## Important version mismatch — launch blocker

At inspection time, the active Cloudflare Worker `chatgpt-nyx-v3-test` was version `be5f503d-86eb-4951-a74a-501cd4db66db`, serving 100% of production traffic.

The `nextgen/worker.mjs` candidate has **no `/api/nyx/account-history` handler**, while the later live Worker has this handler. The CI test deliberately fails with HTTP 404 in this candidate rather than 401. Do not silence that test by accepting 404. Restore the endpoint by reconciling the newer production code into the candidate, then rerun all tests with an isolated D1 resource. Protect private histories across users.

GitHub is a **public** repository. Do not commit API keys, plaintext secrets, session cookies, private chat history, database backups, or private source materials there. The QA suite has no provider credentials.

## Existing operational quotas — do NOT conflate them

Documented Cloudflare Workers Free limits as of October 2026:

- Workers: **100,000 invocations/day** (account-wide).
- Workers AI: **10,000 neurons/day** shared by users, chat, image generation, and any Cloudflare AI calls.
- D1: **5,000,000 rows read/day**, **100,000 rows written/day**.
- Free Workers CPU budget: **10 ms CPU time per invocation**.

App-level beta limits observed in the live Worker at inspection time: **45 chat, 30 search, 2 image, 8 browser actions per user per day**. These restrictions do not raise the underlying Cloudflare limits.

**Neither the current account plan nor the actual AI/Workers billing metrics could be verified** because the connected Cloudflare billing and subscriptions read requests returned authentication errors. Do not claim a tested user-capacity number without real neuron telemetry.

Official sources:
- https://developers.cloudflare.com/workers/platform/limits/
- https://developers.cloudflare.com/workers-ai/platform/pricing/
- https://developers.cloudflare.com/d1/platform/pricing/
- https://openrouter.ai/pricing
- https://developers.cloudflare.com/workers/previews/

## Legitimate scaling options (not quota bypasses)

1. Track actual daily Neurons, Worker requests, D1 row operations, model error rates and account-specific quota exhaustion, then size an invite-only pilot using measured per-request costs. Include headroom, not just the theoretical upper bound.
2. Keep the existing `openrouter/free` fallback. Free OpenRouter accounts currently allow only 50 free-model requests/day and 20 per minute, so this is not unlimited capacity.
3. Use lower-cost Workers AI models appropriately (correctness before token savings), shorter context and output budgets, fixed system-prompt prefixes, and built-in model prefix caching where available. Avoid unnecessary AI intent-classifier calls for deterministic routes.
4. Cache only genuinely public, repeatable documentation/search metadata with short expiration; NEVER use shared caches for private prompts, chats, authentication, or account data.
5. Serve HTML, CSS, fonts and app graphics with Cloudflare Static Assets when safely separated from dynamic authenticated routes. Static asset requests are free/unlimited under the documented Static Assets feature; do not accidentally route them through the Worker.
6. Index D1 tables and avoid full scans. Profile row counts and query execution, but never rewrite or reset the live database to perform a benchmark.
7. Add per-user and global daily budget guards, admission controls, abuse protection, concurrency limits, and clear "free allocation exhausted" messages that reset at the provider's legitimate reset time.
8. Other independent free-tier APIs (e.g. Groq, Gemini, Cerebras) require their own authorized accounts and keys, have their own terms, quotas and privacy policies, and must not be silently enabled, misrepresented as unlimited, or used to circumvent provider policies.
9. Cloudflare has a limit-increase request route for some limits but does not guarantee raising fixed Workers Free/AI allocations. A paid plan can expand service but may incur variable charges; obtain explicit spending approval before changing plans.

The `qa/launch-capacity.mjs` estimator runs **hypothetical** load scenarios. It is not proof of production capacity, neuron consumption, reliability, or cost.

## Isolation requirements

For real release acceptance use **Cloudflare Worker Previews with Wrangler 4.135.0+ and a different D1 database**, separate test secrets and test users. Version URLs alone are **not fully isolated**: they reuse production bindings and resources. Never test data-writing workflows against a production-linked preview.

At minimum:
- New D1 preview database, not a clone containing personal information.
- Synthetic user accounts; mock AI/search providers for negative/error tests.
- Production secrets not mounted in test.
- Browser authentication in the preview should be configured independently.
- Confirm production Worker version and database are untouched after tests.
- Rollback and backups tested without changing live user data.

## Test suite

- `npm run check --prefix nextgen`: syntax for actual next-generation candidate.
- `npm test --prefix nextgen`: existing candidate unit/integration tests plus new public-launch security tests.
- `node --test qa/*.test.mjs`: budget simulations with no API calls, secrets or database changes.
- CI workflow: `.github/workflows/public-launch-gate.yml` on this branch.

Tests cover missing-source honesty, citation safety, bad research URLs, unauthenticated routes, mobile/client streaming, cancellation, failure fallbacks, document processing, and resource-budget calculations.

**Expected current CI blocker:** missing cloud history API, so unrestricted launch is not approved.

## Required go/no-go process

Do not announce "ready for public launch" until all conditions are met:

- [ ] Latest live code fully reconciled with candidate (preserving cloud history and OAuth).
- [ ] All deterministic and regression tests green; no skipped critical tests.
- [ ] Isolated preview with distinct database and no production secrets.
- [ ] Actual signed-in Android/browser end-to-end tests for chat, search, citations, image creation/editing, auth, account isolation, history, accessibility, and low-connectivity cases.
- [ ] Rate-limit and malicious-prompt tests have bounded errors; no leaked data or executed malicious instructions.
- [ ] Zero critical errors; documented noncritical defects with owners.
- [ ] At least several days of invite-only beta telemetry including Neurons/request, 429 rates, p50/p95 latency, cost, and D1 usage.
- [ ] Admission cap sized against measured quotas with safety headroom and a clear exhaustion notice.
- [ ] Billing/plan read access reviewed by the account owner; no chargeable services enabled without approval.
- [ ] Rollback version confirmed, and rollback process rehearsed in an isolated environment.
- [ ] Final launch approved by the project owner.

### Notes about training

Behavior tests and prompt adjustments are **evaluation and application tuning**, not fine-tuning or retraining a foundation model. Actual model training would require datasets, validated consent, compute capacity, privacy controls, and a distinct project.
