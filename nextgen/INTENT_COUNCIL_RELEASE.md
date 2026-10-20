# NyX Intent Council v1 — live hotfix record

Deployed to Cloudflare `chatgpt-nyx-v3-test` as **Worker version 170**
(`ff243fcf-7e4a-4df2-8732-bab72c431c28`) on 2026-10-19.

**Rollback:** Cloudflare Worker version 169
(`9b24145f-bde0-4646-aa3b-42250a376120`).

## Scope
- Prevent NyX search-system complaints from routing to external search results.
- Recognize user-requested external research even without the word "search".
- Keep genuine image generation, image correction, website browsing and normal chat working.
- Use deterministic scoring plus at most one AI model vote for ambiguous requests.
- Directly acknowledge NyX search failures instead of treating "why can't you search" as Windows Search troubleshooting.
- Preserve all existing Cloudflare bindings, database and auth configuration.

The source in `intent-council.js` is the exact routing patch used for the live hotfix. It replaced the original `async function nyxDecide(...)` in the **actual current live Worker**, not the outdated GitHub root candidate. The old Worker source contains an escaped historical source copy that was intentionally left untouched.

## Validation

- Synthetic routing checks: **68/68 passed** against the then-current live helper functions (34 prompts × conflicting CHAT and SEARCH model mock votes).
- Cloudflare version 170 accepted the Worker source for compilation.
- All 13 critical bindings were preserved: AI, Browser, D1, Google/OAuth secrets, rate-limit bindings, TOTP encryption key, OpenRouter key and browser key.
- Mobile-width signed-out browser smoke: width 390 px, no horizontal overflow.
- `/api/health`: HTTP 200, configured.
- `/api/auth/me`: HTTP 200 with unauthenticated visitor state.
- `/api/nyx/capabilities`: HTTP 200 with search enabled.
- `/api/nyx/account-history`: HTTP 401 signed out (expected).
- Latest live deployment verified as version 170.

These are **not** real signed-in model + search-provider accuracy tests.
Do not claim public-launch readiness from these results.

## Manual release gate still required

1. Signed-in Android browser: "What's the issue, why can't you search?" must discuss NyX behavior, not Microsoft Search.
2. "What's the current price of Tecno Camon Slim in Nigeria?" must search automatically with relevant sources.
3. "Search online for OpenRouter free models" must search.
4. "What are the risks of trusting AI search?" must answer conversationally without irrelevant search.
5. "No, search for the latest Llama free models" after an earlier research answer must revise the topic.
6. Follow-up after generated image must preserve the previous image intention.
7. Verify source links actually support claims, and handle no-results without fabricating citations.
8. Verify session, OAuth, MFA, account history and cross-account isolation.
9. Verify PDF text extraction, DOCX, image generation/editing, cancellation and stream behavior.
10. Test keyboard, voice controls, loading states and narrow Android viewport.

## Deployment safety

Do not deploy the GitHub root Worker: its source is a stale candidate.
Do not merge this patch without reconciling the full current live Worker.
This branch is a surgical patch record, not a replacement app.
