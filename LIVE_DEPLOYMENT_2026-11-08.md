# NyX live Cloudflare deployment — verified update, 2026-11-08

> **Source-of-truth warning:** The GitHub root code is a previous prototype, **not** the complete current NyX Worker. Never run the existing Wrangler project against the live Worker until a complete source reconciliation, isolated staging rollout, and authenticated regression test are done. Do not overwrite the live database.

## Current production

- Worker: `chatgpt-nyx-v3-test`
- Live site: https://chatgpt-nyx-v3-test.adeniyipaul174.workers.dev/
- Active Worker version: `fdaf81da-1396-4dc5-b17a-3ca130f6ade1`
- Current deployment: `d912e6bd-d078-4f26-b928-e97bd0a0fad0`
- Previous stable version (rollback target): `e7da914e-6a9f-4a78-895a-10fe34b38c85`.
- Earlier version: `bfa443aa-21e9-4a1d-b021-fad2e8ed9571` (retained before removing the unwanted sidebar close button).
- Earlier stable version: `5cf7f592-b861-4989-828e-3fbdf85b6c69`.
- Older stable version: `eaf319f9-4427-4805-824f-faa0ef2480f7`.
- Earlier version: `90b5188f-19ad-4ca4-957c-1e529f465f8e` (included an **unrequested** Lite page; **do not redeploy as the normal rollback**).
- Earlier original version: `686530f3-a15c-49fc-88a2-599869197fc2` (older model selection, no Scout-as-default).
- The Lite route and its HTML were fully **removed**. `/lite` returns **404**. The existing full NyX interface remains the only homepage.

## Image-generation integrity and broad quality audit (2026-11-08)

### Root cause and production corrections

- The ambiguous follow-up **'Generate it for me here'**, after a logo-design discussion, could be scored as ordinary chat by NyX's tool router. The language model could then claim a logo image had been created and sent without returning image bytes. This is a confirmed route-design problem, not evidence of a real image attachment.
- Added a bounded conversation-aware image-follow-up test before normal chat routing. It requires recent visual-design context and distinguishes images/logos/banners/photos from reports, emails, software, websites and other text work. The user's original conversation and last intent are preserved.
- For text-only responses, added a safeguard that replaces specific unverified **'I generated and sent/attached your image/logo'** claims with truthful wording. Applied to normal chat, the legacy chat endpoint and agent text replies. It does **not** pretend to create a file or alter genuine image responses.
- The existing mobile activity bubble now recognizes visual follow-ups and displays **Generating image…** while the request runs.
- The existing image-generation models remain active. If a selected Cloudflare image model fails with a transient capacity/service error, the existing Cloudflare `@cf/black-forest-labs/flux-1-schnell` model can provide a smaller, clearly labeled **NyX Fast Backup** image. Quota exhaustion, safety restrictions and policy failures are **not** bypassed.
- Existing UI, authentication, D1 database, web search, browser, vision, image editing, website building, memory, agent modes, Normal default and mobile sidebar behavior were preserved. Strict inherited bindings: **13 of 13**.

### Tests performed

- 10 standalone contextual routing scenarios passed, including a Paulorichie logo follow-up, an Atlas Books logo, an author banner, a photographic request, and exclusions for website, email, coding and text-writing tasks.
- 6 text-integrity cases passed; the exact problematic image-claim wording was blocked while legitimate statements about image-generation capability were not.
- Cloudflare accepted the deployed Worker module with no reported compilation error.
- Direct, REAL Cloudflare inference returned image bytes from both `@cf/leonardo/lucid-origin` and `@cf/black-forest-labs/flux-1-schnell`. These are model tests, **not** signed-in requests to the live image route.
- A live mobile-browser simulated two-message conversation about a Paulorichie logo: the follow-up displayed **Generating image…**, submitted prior history with Normal mode and auto-tools on, received a simulated image binary, stored an image record including the resolved prompt, and rendered an image figure.
- Live homepage at 390px had no horizontal overflow and reached DOM-ready at about 163ms in Cloudflare's test browser; this is not device-level AI response latency.
- Public health, capabilities and authentication routes returned HTTP 200. Protected chat, image, vision, search, browser, usage, account-history, team, agent-reach and research status routes returned HTTP 401 when unauthenticated. POST-only endpoints returned HTTP 405 for GET. Public agent and Reach pages returned HTTP 200; `/lite` remained HTTP 404. A total of 21 URL checks were made.
- The original Normal Chat default and click-outside mobile drawer behavior still passed live UI checks. Cloudflare confirmed the current deployed version and inherited 13 bindings.

### Important limits

- Full **authenticated end-to-end** generation/editing, website project creation, agent execution, user sync and browser automation have not been comprehensively verified. The mobile image conversation used a mocked server response; direct Cloudflare model generation was tested separately.
- Image blob storage uses the browser, while account-history synchronization stores message metadata; older images may not automatically transfer between devices. Resolving this requires intentional media storage architecture, not just a prompt change.
- The runtime contains hundreds of helper functions. Structural/source checks and public routes were inspected, but this is **not** an exhaustive proof that every function behaves perfectly.
- No new paid APIs were connected and no extra paid-plan commitment was made. Free-tier usage, inference quotas and service/model availability still limit performance.
- This GitHub root is an older undeployed candidate; never overwrite the production Worker with it. Version URLs for staging have returned 404, so staged-browser smoke checking was unavailable; production was browser-tested after deployment. Rollback to `e7da914e-6a9f-4a78-895a-10fe34b38c85` if a new regression emerges.

## Contextual conversation memory and mobile UX (2026-11-08)

- In-chat follow-up references are resolved before invoking the **existing** image generator or web-search tool. A follow-up such as 'make a picture of it' uses earlier user and assistant turns to establish the intended subject, instead of giving the image generator an unexplained pronoun. The current image's resolved prompt is saved in existing chat image metadata for further edits.
- Llama 4 Scout performs reference resolution when needed and Llama 3.1 8B is the fallback if Scout fails. Ordinary messages without such references do **not** invoke this extra model call. Resolution keeps exact object nouns and character names instead of replacing them with generic categories.
- In longer conversations, the client selects up to five relevant earlier same-chat user turns from its **existing saved history** and sends a bounded optional context excerpt. No cross-chat personal profile, new settings, database table or new Memory menu is created. This is bounded contextual recall, not unlimited permanent memory; original chat history remains intact.
- The existing activity bubble now shows contextual progress labels including Generating image, Searching the web, Writing code, Solving math, Analyzing, Reading document and Thinking. Existing streamed search stages are preserved. Labels are not proof of external tool completion.
- The existing agent picker opens as **Normal**, never automatically Team/Auto. A user's manual mode selection remains active until they start a new chat. New chat resets to Normal. This does **not** disable automatic web search or image creation from the normal conversation.
- On mobile, tapping the page beside the open chat-history sidebar closes it; tapping inside keeps it open. Escape also closes the sidebar. No new close button or menu is introduced.
- All **13** Cloudflare bindings were inherited. The existing source for image creation/editing, web search, browser, website builder, agent workflows, authentication and account-history remained present. The original HTML interface and `/lite` removal are unchanged.

**Direct model tests:** Cloudflare Scout expanded ambiguous follow-ups referring to a cat, a pangolin, a yellow robot named Milo and the northern lights into tool-ready requests that preserved the subject.

**Live mobile browser tests:** At 360px width, no horizontal overflow. Normal is selected on initial load; manually selecting Team works; a new chat reverts to Normal. Outside mobile-sidebar pointer taps close it; inside taps do not. Simulated pending-chat UI tests showed the expected labels for image, search, code, math, analysis and normal chat. `/api/health` and capabilities returned 200; unauthenticated chat/search/vision/image/browser/history returned 401; `/lite` returned 404.

**Limits of verification:** These were live UI, route, source-preservation and direct-model checks; UI activity tests used mocked chat responses, not a signed-in user's actual generation. Full signed-in multi-turn chat, real image generation/editing, search results, website building, persistent account-history sync and agent execution were **not** regression-tested end-to-end. This change does not add unlimited long-term cross-chat memory. Keep rollback version `5cf7f592-b861-4989-828e-3fbdf85b6c69` available.

## Follow-up: capacity and quota repair (2026-11-08)

- Normal text chat now attempts Cloudflare Llama 4 Scout first and never waits for an external provider if Scout succeeds.
- Cloudflare Llama 3.3 70B remains the transient-capacity backup. When Cloudflare's free neuron allocation is exhausted, NyX skips a redundant Cloudflare 70B attempt and tries the already-configured OpenRouter `openrouter/free` text provider, if available, with a 5.5-second timeout. This does not guarantee extra capacity or equivalent quality. External fallback sends the user's text prompt and relevant recent history to that provider, subject to its privacy practices; the request specifies `data_collection: deny`.
- Repeated OpenRouter timeouts/unavailability temporarily pause its use for 60 seconds within the Worker isolate.
- Removed duplicate website-builder debit: the central authenticated `/api/nyx` POST gate already charges one daily chat request. D1 data and prior usage totals were not changed.
- Existing search already races Bing and DuckDuckGo with multiple other fallback sources. Existing D1 quotas are atomic; additional KV counters or paid search/queue products were unnecessary.
- UI, authentication, AI image and editing, search, browser, agents and account history code remained in place. All 13 Cloudflare bindings were inherited unchanged.

**Validated:** Six simulated routing cases passed: Scout success, 70B rescue, exhausted-allowance external rescue, missing external key, nonretryable input error, and total provider failure. Cloudflare compiled the new version successfully. Live homepage rendered at mobile width without horizontal overflow; health and capabilities returned HTTP 200; protected chat, image, vision, search, browser, account history and usage endpoints returned HTTP 401 without authentication. Lite stays HTTP 404. Live Cloudflare source confirmed.

**Not yet verified:** A staged version-specific URL returned HTTP 404, so preview-browser testing was unavailable. Authenticated chat, the actual saved OpenRouter key, website builder output, real image editing, search-answer quality, agents and account persistence require authenticated regression testing. These changes are not a promise of unlimited free usage or universally faster replies.

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
