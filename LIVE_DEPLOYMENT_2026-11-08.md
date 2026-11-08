# NyX live Cloudflare deployment — verified update, 2026-11-08

> **Source-of-truth warning:** The GitHub root code is a previous prototype, **not** the complete current NyX Worker. Never run the existing Wrangler project against the live Worker until a complete source reconciliation, isolated staging rollout, and authenticated regression test are done. Do not overwrite the live database.

## Current production

- Worker: `chatgpt-nyx-v3-test`
- Live site: https://chatgpt-nyx-v3-test.adeniyipaul174.workers.dev/
- Active Worker version: `eaf319f9-4427-4805-824f-faa0ef2480f7`
- Current deployment: `a6781812-0d8f-42ea-b975-ab251116c558`
- Previous version: `90b5188f-19ad-4ca4-957c-1e529f465f8e` (included an **unrequested** Lite page; **do not redeploy as the normal rollback**).
- Earlier original version: `686530f3-a15c-49fc-88a2-599869197fc2` (older model selection, no Scout-as-default).
- The Lite route and its HTML were fully **removed**. `/lite` returns **404**. The existing full NyX interface remains the only homepage.

## Primary model and speed changes

- Llama 4 Scout (`@cf/meta/llama-4-scout-17b-16e-instruct`) is the primary text-chat model for `/api/nyx` and `/api/chat`, plus image understanding. Existing builder and other agent model calls were also switched to Scout in the earlier rollout.
- Normal text-chat fallback is Cloudflare-hosted Llama 3.3 70B FP8 Fast (`@cf/meta/llama-3.3-70b-instruct-fp8-fast`), rather than a potentially **25-second** OpenRouter free-provider wait and an 8B answer fallback.
- Expensive general-answer prompt history is bounded to the 10 most recent messages, up to 6,500 characters each, to lower latency and inference cost on long chats. This is server-side context trimming, **not** chat history deletion.
- Small 8B Llama still supports certain inexpensive routing/classification steps; it is **not** the primary user-answer model.
- Inference happens on Cloudflare; phones and PCs do not download model weights. Free inference is rate-limited across users.

## Smoke tests successfully completed

1. Cloudflare accepted the staged Worker version with no compile errors, preserving all 13 existing bindings through strict inheritance (AI, browser, D1, secrets and rate limits).
2. Cloudflare reported the correct active deployed Worker version after activation.
3. Live homepage rendered with NyX title, settings, chat interface, mobile-responsive style rules, and sign-in elements.
4. Live `/api/health` returned HTTP 200 and reported the configured Llama 4 Scout ID.
5. Live `/api/nyx/capabilities` returned HTTP 200.
6. Without a signed-in account, `/api/chat`, `/api/nyx`, `/api/vision`, `/api/image`, `/api/search`, `/api/browser`, `/api/nyx/account-history`, and `/api/nyx/agent-team/status` returned HTTP 401 as expected.
7. Live `/lite` correctly returned HTTP 404.
8. Cloudflare Workers AI directly returned successful Scout text responses for arithmetic, multi-turn context, and code; Scout vision described a tiny white PNG correctly.
9. The existing Cloudflare FLUX image-generation model returned image bytes.
10. In isolated direct-inference tests, Scout responses completed in approximately 0.36–2.54 seconds, dependent on tokens and prompt. This is **not** a measurement of full authenticated app latency.

## Not yet verified

**Full authenticated workflows are not proven:** authenticated user chat, user account save/load, multi-step website builder, connected browsing, image editing, all agent modes, and browser automations. These require an authenticated test session and dedicated regression tests. A successful static route check or direct model call is not sufficient to claim full app functionality.

The previous GitHub candidate tests also do not validate the current live Worker source. This documented limitation must be resolved before claiming all features work.

## Safety for future deploys

Preserve the live source and existing secrets, database and authentication logic. Export a full live-source snapshot to an isolated private branch or staging Worker, use an isolated D1 database for destructive tests, run a complete test suite including signed-in browser tests, and only then consider further changes to the production UI/agent runtime. Never deploy the stale root project over production.
