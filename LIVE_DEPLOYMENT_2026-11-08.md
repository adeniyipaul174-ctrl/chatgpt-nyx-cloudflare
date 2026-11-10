# NyX live Cloudflare deployment — verified update, 2026-11-08

## 10 November 2026 — NyX Code replaces Work in primary navigation

- **Live version:** `34df5010-9719-441a-81fa-c11ad02d7546`, deployment `cf0300ce-b9db-43d6-b058-fc811b492f86` (100%). **Rollback:** `d1962a2a-60be-4ce4-9a6d-826141096ddd`. All 13 original Cloudflare bindings inherited. No existing D1 chat or account data was mutated.
- **User intent:** Remove the visible Work mode and make a second normal Chat interface named **NyX Code** with coding-oriented free-model routing. Primary PrivateLM-style bottom navigation now reads **Chat / Code / Browser / Settings**, and the Code header reads **NyX Code**. The previous Work task pane is hidden from Code and Chat; only the separate Browser tab keeps its internal browser-control functionality. The original private Work conversation records are preserved and can be opened from history in Code.
- **Two separate conversation contexts:** Reuses the exact Normal Chat composer, attachments, message bubbles, send/stop control, and shared account-history infrastructure. Code threads get IDs prefixed `code-`. Switching Chat↔Code preserves their separate current conversations and titles; old `work-` records are treated as historic Code-readable threads. New Code messages are not inserted into the active Normal Chat thread.
- **Backend free-first coding engine:** A new validated `nxCodeGenerate` function in the same Worker tries an *optional* separately hosted Free Claude Code-compatible OpenAI API endpoint (only if secure `NYX_CODE_FCC_URL` and `NYX_CODE_FCC_TOKEN` secrets are configured), then the account's existing `OPENROUTER_API_KEY` with provider `openrouter/free`, then Cloudflare Workers AI code-capable models: Qwen 2.5 Coder 32B, Llama 4 Scout, and Llama 3.1 8B. Coding requests use the existing authenticated `/api/nyx` path with `nyxCode:true`; the original image, search, and website-reading paths remain. The code-only route handles document attachments and skips the ordinary website-builder interception.
- **Free provider limitations:** Neither the Free Claude Code Python project nor its full 61-provider catalog is hosted on this Worker. The optional FCC endpoint is **NOT configured**; only the existing OpenRouter/Cloudflare routes are available. Tokens, model choices, quotas, capacity and uptime depend on providers; do **not** claim unlimited or perpetual free access. No AGPL source from `Alishahryar1/free-claude-code` was copied or bundled.
- **Code sources:** `addons/nyx-code/chat-mode.js`, `addons/nyx-code/free-code-router.js`, and `addons/nyx-code/code-theme.css`. The GitHub root still contains an outdated prototype and must not be deployed over the production Worker.
- **Verification:** Cloudflare compiled the staged production Worker, 100% deployment succeeded with 13 inherited bindings. Live mobile Browser Rendering at **390px** showed navigation Chat / Code / Browser / Settings, Code header **NyX Code**, old Work pane hidden in Code, Code history saving and reopening, normal Chat not sharing the Code thread, Browser tab still active, and no horizontal overflow. Browser tests used mocked AI replies. An additional unauthenticated live `/api/nyx` Code request returned **401**. Isolated backend tests demonstrated the free provider succeeds as first choice, free failure invokes Cloudflare coding fallback, and missing free credentials route directly to Cloudflare. **Signed-in end-to-end model inference and a live FCC proxy have not been tested.**

## 10 November 2026 — Chat + Code only, verified free-code rotation, stronger public search

- **Current live Worker:** `165e3e52-eece-466b-a651-4106171a9fc3`, 100% deployment `401f2ee7-436d-4569-aa2e-005db9dfd6ec`; **rollback:** `90dde602-9906-4607-bc65-7b5a8208ff60`. **13 existing Cloudflare bindings preserved.**
- **Navigation:** Only **Chat** and **Code** are visible in the bottom navigation; Browser and Settings tabs are hidden there. Settings is still accessible via hamburger → Settings, verified live. The old Work pane, browser-control endpoints, saved Work records and browser search fallback remain in the source for compatibility, not presented as separate main modes.
- **Coding:** NyX Code keeps the existing chat composer and its separate `code-` conversations. The coding engine now reads OpenRouter's live model catalog, selects only text-generating models whose IDs end in `:free` and whose model prompt and completion prices both equal $0, ranks coding-suitable models, and tries a bounded set (one explicit model then `openrouter/free`). Free availability is cached and request failures are backed off; no paid model is intentionally routed. It falls back to Cloudflare Qwen 2.5 Coder 32B, Llama 4 Scout and Llama 3.1 8B using existing Workers AI allowance. The optional separately hosted FCC-compatible server remains unconfigured; no AGPL Free Claude Code server or its broad provider catalog has been deployed, and no new provider API keys were created.
- **Search:** Improved the **active** search engine (not the embedded legacy backup). Existing Promise.any live-source routing, GitHub technical search, Wikipedia background search, RSS, fallback browser and SearXNG/Tavily/Serper support retained. DuckDuckGo's independent HTML endpoint and any configured search provider now participate in the initial concurrent search. Two/three-keyword searches accept one on-topic keyword hit; longer searches still need two. Free-price queries reject excerpts with no indication of a free tier. Search remains best effort because external providers can block or rate-limit automatic requests. No claims of guaranteed results.
- **Origin reliability:** Normal Chat POSTs to `/api/nyx` now add `X-NyX-Client: web`, matching the server's existing origin requirement where it applies.
- **Code formatting:** NyX's built-in Markdown renderer is the sole parser. A later tested correction enhances the existing `.nx-ui4-md pre` blocks with a Copy control and mobile-safe styling instead of attempting to render code a second time. No untrusted code is executed by the UI.
- **Production checks:** Staged Worker compiled successfully. Final live browser test at 390px showed exactly Chat and Code visible, sidebar Settings opening, NyX Code header and composer correct, code block Copy button present, returning to Chat successful, and no horizontal overflow. Automated search ranking/free-model filtering scenarios passed using simulated providers. Additional 320px live rendering was blocked by Cloudflare HTTP 429 and therefore **not** freshly verified. No real signed-in model inference, search success for every query, or external FCC server deployment was established.
- **Files:** `addons/nyx-code/two-tabs-ui.css`, `addons/nyx-code/code-blocks.js`, `addons/nyx-code/dynamic-free-models.js`. `addons/search/search-v5-parallel.js` is an **unused prototype** because NyX's production search engine already had a richer Promise.any V4 implementation; only the targeted production refinements were deployed. **Do not deploy the stale GitHub root Worker over the live Worker.**

## 10 November 2026 — Rich message formatting (email drafts, messages, social posts, code, tables)

- **Live deployment:** `79e7738b-c07d-4450-9be1-8516790ef16c`, Worker version `57c51124-8c21-4f25-b255-f00cabf71ad1` (100%). **Rollback:** `5baf07ca-6ba9-4e82-8c84-b4ff5c1649d6`. All **13 Cloudflare bindings** inherited; no database mutations.
- **User request:** Make AI response format more useful and visually structured, similar to modern AI writing/code experiences, without copying another product's proprietary UI.
- **Implementation:** A safe, progressive browser-side enhancer attaches to NyX's existing text-node Markdown renderer (does not execute model HTML or change saved conversation content). Recognizes clearly drafted **emails**, **WhatsApp/SMS/DM messages**, and **social posts**. Shows editable draft cards with Copy/Edit and, when present, email To and Subject metadata. Edits are client-side for the current rendered card; use Copy to retain revised text.
- **Code blocks:** Both Chat and Code modes receive language labels when recognized, Copy and Save (.py/.js/.ts/.json/.sql/etc.) buttons, syntax-safe text rendering, and horizontally scrollable code blocks. The older NyX Code formatter is left in place; enhancers check existing wrappers and only add missing actions.
- **Markdown tables:** Scrollable styled table sections with Copy table (tab-separated text, guard against spreadsheet formula prefixes). Regular Markdown prose, lists, headings, and quotes remain readable rather than being put in unnecessary cards.
- **Source:** `addons/rich-messages/rich-messages.js` and `addons/rich-messages/rich-messages.css`. Assets embedded directly in active Worker HTML template; no external JS/CDN required for these features.
- **QA:** Static JS syntax and HTML-template escape roundtrip validated. Cloudflare compiled staged Worker. Live mobile browser test at 390px confirmed an **email card** with Copy/Edit and correct metadata, the separate Chat/Code modes, preserved normal Chat. A later live 390px sequential-message test confirmed formatted Python code with language, Copy/Save, a table with Copy table, and no horizontal overflow. Simulated replies were used; no signed-in AI inference performed for these UI tests. An extra 320px test was rate-limited by Cloudflare.
- **Preserved:** Metallic NyX branding, two visible tabs (Chat and Code), Settings in sidebar, chat/history, normal AI and coding routes, search, image generation, 13 bindings, and saved conversations. Do not deploy the stale GitHub root Worker over production.

> **Source-of-truth warning:** The GitHub root code is a previous prototype, **not** the complete current NyX Worker. Never run the existing Wrangler project against the live Worker until a complete source reconciliation, isolated staging rollout, and authenticated regression test are done. Do not overwrite the live database.

## 9 November 2026 — NyX header branding; remove model card

- **Live Cloudflare Worker version:** `70796173-746a-4aa2-8932-d3b8a92a1caf`; deployment `925b58db-e6d2-49a8-8475-2b94928074f5`, 100% traffic. **Rollback:** `b842f7d9-1410-4723-8f8d-5b31ef7df619`.
- Changed the **actual** live NyX frontend, not a screenshot. Removed the default-home model card and visible `Llama 4 Scout` title/subtitle. Replaced the header with a 27px blue NyX sparkle logo immediately to the left of the NyX wordmark. Preserved the center welcome sparkle and bottom navigation.
- Source files: `addons/privatelm-interface/privatelm-ui.js` and `addons/privatelm-interface/privatelm-ui.css`. Updated embedded equivalents in production Worker; did **not** change model routing, usage accounting, or external API attribution requirements.
- The responsive header and home were verified in Cloudflare Browser Rendering at 390 × 844px: logo renders blue, header displays NyX without a subtitle, model-card count 0, no horizontal overflow, Chat switches to Work and back, and Settings opens. All 13 Cloudflare bindings inherited. The browser test bypassed the unauthenticated gate for visual inspection only; signed-in inference was not retested.
- The GitHub root Worker source remains outdated. Do not deploy it over the current live Worker.

## 9 November 2026 — Remove duplicate PrivateLM interface; one clean mobile UI

- **Current live version:** `b842f7d9-1410-4723-8f8d-5b31ef7df619`; **deployment:** `a4ec90be-ab3b-4210-b814-fe2d313e53d9` (100% traffic). **Rollback version:** `5d255184-49ab-444a-822c-ba0606ee72f9`.
- **Cause:** Two independent frontend ports had been stacked together: `nxpl-private-port-20261109` / `nxpl-private-shell-20261109` and `plNativePortCss20261109` / `plNativePortJs20261109`. Their CSS and duplicate greeting/navigation/model elements conflicted. One greeting container expanded across most of the empty conversation area.
- **Fix:** Removed the older `nxpl-` style and script completely, preserving the newer attributed PrivateLM shell. Replaced the welcome with a single compact star mark, correctly sized title, and model card; normalized spacing around Chat's existing composer and the single bottom bar. Added independent PrivateLM MIT attribution into NyX's existing About panel.
- **Size:** Net Worker source dropped from **1,144,004** to **1,112,836** characters/bytes as measured in the connector's ASCII-oriented count (approximately **31 KB less**). The removed duplicate components accounted for 35,527 source characters before replacement polish.
- **Live 390px mobile tests:** Exactly one bottom navigation, one model card, one welcome section; no duplicate old stylesheet/script; no horizontal overflow. Chat, Work, Normal Chat default, Settings modal, sidebar open and outside-tap dismissal all worked in the test browser; Work's composer and Agent button remained accessible.
- **Preserved:** All **13 Cloudflare bindings**, existing chat history, search, image creation, agent teams, Work, AI browser and account backend code. No database content was altered.
- **Limitations:** Tests were performed on the live page with the unauthenticated gate suppressed inside the test browser; full authenticated AI and browser actions were not re-tested. The upstream project is MIT-licensed; adaptation retains its citation and source link.
- **Source for subsequent UI changes:** `addons/privatelm-interface/privatelm-ui.css`, `addons/privatelm-interface/privatelm-ui.js`, `addons/privatelm-interface/ATTRIBUTION.md`. GitHub root Worker source remains out of sync and should not be deployed over production.

## 9 November 2026 — Public search speed and unresolved external limits

- **Production deployed version:** `dd7da766-fa88-4660-b2d3-2eb5392fa329`, deployment `fc48b21d-5651-431d-9279-d175360f1e8e` (100%). **Rollback:** `ddf5d90b-2666-4be1-a089-f90b3c4beeb6`.
- **Fixed:** The final round of cheap public search fallbacks now runs concurrently with `Promise.any` instead of checking them one after another. Existing early provider selection, Bing/RSS rescue, relevance validation, source metadata, and public cache were retained.
- **Free-tier safety:** Cloudflare Browser Run remains a separately guarded last-resort search provider and is skipped after the configured shared daily-browser-time guard. This change does not claim unlimited or guaranteed browsing.
- **Preservation:** Worker staging/compilation succeeded and all 13 existing Cloudflare bindings were inherited. The active rendered Work controller passed a JavaScript compilation test after the deployment. Chat, image generation, account history, Work, Agent Team, and browser backend code remain present.
- **Provider check:** Cloudflare Browser Rendering returned a Google unusual-traffic/automated-request challenge; a Bing browser test hit the provider's HTTP 429 limit. The Tavily, Serper, and SearXNG settings are not configured. Therefore no-key generalized web search remains unreliable for difficult queries, particularly Goodreads authors and zero-review filters.
- **Incomplete fixes:** Work image persistence, cross-device binary media sync, authenticated end-to-end browser control, account-verified cross-device chat sync, and password recovery were **not** fully repaired or verified. Several candidate changes to Work media handling failed browser JavaScript syntax checks and were intentionally **not deployed**.
- **Do not deploy the stale GitHub root:** It remains different from Cloudflare production. A private, reconciled production source repository and authenticated smoke tests should precede any broad refactor or new dependencies. No existing user chats or Cloudflare database records were altered.

## Current production

- Worker: `chatgpt-nyx-v3-test`
- Live site: https://chatgpt-nyx-v3-test.adeniyipaul174.workers.dev/
- Active Worker version: `dd7da766-fa88-4660-b2d3-2eb5392fa329`
- Current deployment: `fc48b21d-5651-431d-9279-d175360f1e8e`
- Previous tested version (rollback target): `ddf5d90b-2666-4be1-a089-f90b3c4beeb6` (previous stable Work/search implementation).
- Earlier verified version: `f213d3bd-0215-454a-8044-17f8831bd42e` (Work origin, faster startup and account reset).
- Earlier version before the 9 November repairs: `d9c66347-e46d-4134-af59-db65983c772c`.
- Older premium Work composer version: `a8756b15-ad7b-4bcf-a970-88f9987a4f85`.
- Earlier Work composer version: `0874dff6-c3a8-4a45-8e98-e8f9dc66a7aa`.
- Earlier stable version: `ebffa61f-9bf3-4623-a0be-dfbe07329a60`.
- First working Chat/Work version: `1b9bbf58-f3bc-444b-a3e9-5f93a4845129`.
- Earlier full NyX version before Chat/Work: `23ba4d44-34e9-490f-a8c3-1ff0db741132`.
- Intermediate compiled version: `a7e127fd-dc3f-470a-950c-adac111d669e` (Chat/Work UI was present but Work controller failed at runtime due HTML-template escaping; DO NOT use as rollback).
- Original Free Browser release: `642eb284-10c5-48c1-8293-8f3206878257`.
- Intermediate version: `d7904ff0-56ab-4dc8-a7ce-8a44df8efd35` (free browser feature before strict JSON action-prompt adjustment).
- Earlier stable version: `fdaf81da-1396-4dc5-b17a-3ca130f6ade1`.
- Earlier stable version: `e7da914e-6a9f-4a78-895a-10fe34b38c85`.
- Earlier version: `bfa443aa-21e9-4a1d-b021-fad2e8ed9571` (retained before removing the unwanted sidebar close button).
- Earlier stable version: `5cf7f592-b861-4989-828e-3fbdf85b6c69`.
- Older stable version: `eaf319f9-4427-4805-824f-faa0ef2480f7`.
- Earlier version: `90b5188f-19ad-4ca4-957c-1e529f465f8e` (included an **unrequested** Lite page; **do not redeploy as the normal rollback**).
- Earlier original version: `686530f3-a15c-49fc-88a2-599869197fc2` (older model selection, no Scout-as-default).
- The Lite route and its HTML were fully **removed**. `/lite` returns **404**. The existing full NyX interface remains the only homepage.

## Critical regression repairs — 9 November 2026

- **Production version:** `ddf5d90b-2666-4be1-a089-f90b3c4beeb6`, deployment `9421efbb-c660-4854-8213-df3393fd9ff7`; **immediate rollback** `f213d3bd-0215-454a-8044-17f8831bd42e`. Two intermediate uploaded versions (`3da6f9d0-9e62-453b-8767-e8d8668b97e1`, `36c0a5f7-4b04-4b82-96ce-3e58f12e3b34`) have a **client script parsing regression** and MUST NOT be deployed or used as rollback targets.
- **Critical Work browser error:** Work POSTs to the authenticated AI browser now supply `X-NyX-Client: web`, matching server-side `nyxCheckOrigin`. This fixes the previously reliable `Untrusted request origin` rejection for same-origin browser commands; successful signed-in navigation still needs an authenticated user test.
- **Webpage inspection:** Chat requests containing a direct HTTPS URL and `review`, `inspect`, `audit`, `analyze` or `feedback` route to the existing safe webpage reader. Explicit search and browse tools take priority over the text-only agent path, including when Agent Team is selected.
- **Intent routing in Work:** An explicit instruction to open/control Chrome or visit a website triggers the interactive free browser; a text-only review with a URL is routed through `/api/nyx` instead. Browser intent logic was checked against five known cases and the *rendered Work JavaScript* passed JavaScript syntax validation.
- **Privacy:** Work and shared-history in-memory state are reset when an account signs in or out; the visible draft, transcript, previous browser preview and active Work session reference are cleared. Legacy Work history migration occurs *after* the account ID is available. Anonymous Work session storage no longer automatically populates an authenticated user's Work transcript.
- **Speed:** Removed the artificial 3-second/5-second pre-authentication splash delay. Network, server quota and multi-agent processing can still take longer.
- **Search fallback:** When basic public search providers fail, the Cloudflare Browser reader can be tried if account/browser bindings are available and the shared free Browser Rendering consumption is below a conservative threshold. This may help some searches but is **not** a guaranteed replacement for missing Tavily/Serper keys or unlimited browsing.
- **Repeated Work messages:** Identical failed Work tasks are no longer continually added as duplicate user bubbles when retried before an assistant reply. Verified source URLs are saved in Work's transcript for later viewing.
- **Preservation:** All 13 production bindings retained. Normal Chat, Work, web search, images, memory, source history, agents and browser handlers remained present. The latest validated browser controller is saved at `addons/work-mode/work-controller.js`. **Never deploy the stale GitHub root Wrangler project directly over production.**
- **Testing:** Cloudflare Worker compilation succeeded; the Work script was independently rendered from the deployed HTML template and passed JavaScript syntax validation; runtime browser intent unit cases confirmed `Open your browser` → Work browser and `Review this website` → normal site-reader path. A previous live 360px mobile test on version `f213...` confirmed browser request headers, manual handoff, account UI reset, and no overflow, using simulated server responses. The newest deployment's signed-in end-to-end tests and external browsing were **not** completed: Cloudflare Browser Rendering tests intermittently failed with HTTP 422 / connection closed and HTTP 429 service limits. A separate Browser Rendering markdown test successfully retrieved the user's public Lovable website but the Goodreads test was rate-limited.
- **Unresolved:** No Tavily/Serper/SearXNG credentials; Cloudflare's free browser allocation and per-session time/step limits; Work image binaries are not fully preserved across devices; no implemented password recovery/email verification; GitHub root still differs from live Worker; Cloudflare observability not configured. These require further integrations and/or account configuration; do not claim complete parity with ChatGPT Work.

## Unified Work history and semantic chat titles (2026-11-08)

- **Issue:** NyX Work kept separate messages only in `sessionStorage` under `nyx_work_chat_v1_...`; its conversations never joined the normal sidebar/history array or existing account sync. Normal Chat named a conversation by simply copying its first message (e.g., `Hi`).
- **Live fix:** Work now saves user and assistant messages into the **same existing `chats[]` data model**, calls the original `persist()` account-sync wrapper, and creates `work-...` chat IDs. Work chats appear alongside Chat in Recent/Archived/Search. Selecting a Work item automatically switches to Work and restores messages. Switching between Work and Chat keeps their separate current conversations. New chat does not delete prior Work history. Existing D1 history API stays unchanged.
- **Smart names:** An initial greeting is titled **New conversation** (or **New Work conversation**) instead of `Hi`. A later substantive prompt generates an immediate human-readable fallback title and may be refined asynchronously through authenticated `/api/nyx/chat-title`, using the existing low-cost Cloudflare Llama 3.1 8B model. The title endpoint limits requests to 20 per account/day via a small D1 usage counter. Manual renames are preserved and no unrelated chats are merged.
- **Legacy Work migration:** A previous session-only Work transcript is imported into the shared history when still present in the same signed-in browser session and no prior synced Work chat exists. Work transcripts that have already been erased from expired sessions cannot be recovered by this patch.
- **Files:** `addons/work-mode/unified-history-title.js` and `addons/work-mode/semantic-title-api.js` document this update. The GitHub root is still a stale prototype, **not** the production Worker.
- **Tested:** Four direct real Workers AI title-inference samples returned topic summaries. Unit tests confirmed greeting naming, renaming when a substantive topic arrives, Work transcript persistence, Work restoration and manual-rename protection. Cloudflare accepted the live Worker with all **13 bindings**. A live **390px mobile browser simulation** demonstrated: greeting `Hi` → `New conversation`; subsequent website request → semantic title; Work team research task → sidebar item and localStorage persistence; Work selection restores the proper Work tab and messages; Normal Chat selection restores the original Chat conversation; New Chat preserves the older Work transcript; no horizontal overflow. The test mocked AI reply/title network responses.
- **Limits:** Cross-device account synchronization and the live title route were not end-to-end tested using a signed-in user's session. The backend is connected to the existing authenticated D1 sync service, but that does not by itself prove successful sync across devices. The new title feature is best-effort and reverts to a local descriptive fallback if the model or quota is unavailable.
- **Active version:** `d9c66347-e46d-4134-af59-db65983c772c`, deployment `c431be3b-3ed2-407e-b8da-51c1465b76be`. **Rollback:** `a8756b15-ad7b-4bcf-a970-88f9987a4f85`.

## Premium Work composer redesign (2026-11-08)

- **Live UI correction:** Replaced the Work composer’s basic standalone pink arrow circle with a functional, wider **Run task** gradient button containing a custom inline SVG arrow icon. The button changes its label to **Working…** while disabled during an AI request and restores **Run task** after completion.
- Added a small NYX WORKSPACE heading, lighter task prompt, compact, non-resizable autogrowing textarea, refined Agent dropdown trigger, footer divider, and more intentional proportions and pink accents. Normal Chat and its existing attachment, microphone and send controls were not replaced or redesigned during this patch.
- Preserved original **functional DOM IDs**, Work submit event handler, Agent mode selection, previously repaired dropdown portal, browser, image, memory, model routing, web search, and all 13 Cloudflare bindings. No account data or model settings were changed.
- Source files retained for future work: `addons/work-mode/premium-work-composer.html`, `addons/work-mode/premium-work-composer.css`, and `addons/work-mode/premium-work-composer.js`. GitHub root source is not the deployed production source; DO NOT deploy it over NyX.
- **Predeployment mobile browser check (390px):** Button was rendered as a 121×46px rounded rectangle with an SVG icon, no horizontal overflow, Agent menu opened above its trigger, switching Agent to Coder worked, and a mocked Work API task returned and reset the button.
- **Postdeployment mobile browser check (390px):** Verified live version rendered the new button and SVG, Agent selector remained aligned, full dropdown opened above the button, Coder task reached the existing `/api/nyx` Work route, the button displayed **Working…** and then returned to **Run task**, the simulated agent reply displayed, and switching back to Chat restored Normal mode. The authenticated account backend was **mocked for this UI test**, not end-to-end verified.
- Rollback target: `0874dff6-c3a8-4a45-8e98-e8f9dc66a7aa` (prior live version). Production Worker version `a8756b15-ad7b-4bcf-a970-88f9987a4f85`, deployment `08dc3d65-7db7-40e3-97d3-588d1a0dc2ab`.

## Chat composer and Work agent dropdown repair (2026-11-08)

- **Fixed on production:** An older mobile `.nx-mode-menu` rule forced the agent list to the top of the viewport, while the Work panel's overflow clipped the remainder into a thin strip. The agent menu is now attached to `document.body` and positioned dynamically **above the Work agent selector**. Existing select/keyboard handlers and close-on-outside-tap behavior are preserved. The menu is hidden again when returning to Chat.
- Refreshed the **existing Chat composer**, preserving dynamic photo/document attachment, microphone, text area, and send button events. Updated compact widths, borders, pink send control, spacing, focus states and narrow-screen styling. No new attachment or voice backends were created.
- Refined the **Work composer**: Agent button stays on the lower-left of the prompt; Send remains on the right. The top Chat/Work switch, Normal Chat default, search, image generation, memory, agent tools, and free browser remain intact.
- **Source files for this patch:** `addons/work-mode/composer-polish.css` and `addons/work-mode/agent-dropdown-anchor.js`. The GitHub root code is still stale and must not be directly deployed over production.
- **Tests:** Cloudflare accepted the Worker with all **13 existing bindings**. Live browser simulation at **320px** showed attachment/mic/send aligned and inside the viewport, a 415px-high unclipped dropdown above the trigger, Coder selection, Chat restoration to Normal, and no horizontal scrolling. A previous injected CSS/JS test passed at 390px before deployment. Cloudflare's Browser Rendering test service returned HTTP 429 on additional 390px and 768px post-deployment checks; those were not completed.
- **Limitations:** The DOM layout tests bypassed the unauthenticated screen locally in the test browser, not real account authentication. This change has not been end-to-end regression tested with authenticated image, search, browser or audio tasks. No app data or account bindings were changed. Rollback to `ebffa61f-9bf3-4623-a0be-dfbe07329a60` if a regression appears.

## Chat / Work app mode & browser-action repair (2026-11-08)

- **Chat is the default after opening NyX**. The top of the EXISTING chat page now has a Chat | Work segmented switch. Chat retains normal messages, automatic web searching and image generation, saved chat history, memory, Settings and all existing tools.
- **Work is a separate pane in the same NyX page**, not a Settings option. It has a task composer, the existing Agent selector (Team, Auto, Planner, Writer, Coder, Reviewer), Work task results, and a browser task screen. Selecting Work defaults the agent to Team; going back to Chat restores Normal (`agentMode=off`). Other old agent backends remain in place.
- **Natural-language entry** from Chat: an explicit request such as 'hello, open your browser for me to control here' switches into Work and runs the browser initiation flow after the user explicitly confirms the free daily/session limits. It does not start a paid Browser Use session.
- The prior **AI Browser · Free** sidebar link is removed to avoid hiding this feature in another menu. The existing `/ai-browser` URL continues to work as a legacy direct link.
- **Fixed a real browser action parser bug**: Llama 4 Scout responded via Workers AI with a structured object like `{response:{action:'navigate',url:'https://www.goodreads.com'}}`. The old code stringified that as `[object Object]` and repeatedly showed 'AI couldn't choose a safe next step.' The new code accepts native objects, strict JSON strings and fenced JSON.
- Added a signed-in, no-store browser JPEG screenshot endpoint and manual navigation, tap, typing and scroll controls using the same Browser Run/CDP browser session. Work can show a screenshot directly, pause the agent for manual control, resume or stop it. The external Live View link remains for the complete interactive Chrome view; embedded third-party Live View had shown a loading spinner on Android.
- Browser commands are origin-checked, require a signed-in NyX user and a preexisting free-browser session. Manual page controls require agent pause. The existing server-side 120-second session limit, 12-step cap, one start per UTC day and the shared free Cloudflare allowance remain. No extra paid provider is invoked.
- The existing Agent Team, web/search, image creation and editing, projects, memory, signed-in account, settings, site builder, and other endpoints remain present; **13 original Cloudflare bindings** inherited. IDA Pro is a third-party desktop reverse-engineering application and was NOT installed or falsely advertised by this update.

### Verification

- Cloudflare compiled the deployed Worker successfully, with deployment `9e3ae8a8-b6c0-4c05-aec6-3bde448f9e1f` and active version `1b9bbf58-f3bc-444b-a3e9-5f93a4845129` at 100%. All 13 original bindings preserved.
- Direct real Workers AI test: the actual Llama 4 Scout model produced a **structured** `navigate` action for the Goodreads user task. Unit parser tests passed native action objects, plain JSON, fenced JSON, finish and handoff.
- Live 360px Cloudflare browser-rendering test: no horizontal overflow, Chat selected by default, Work tab switches correctly, old agent selector moves into Work, Team is selected there, switching back restores Normal Chat, and an agent Work task reaches the existing `/api/nyx` backend and displays its simulated response.
- Final polish in `ebffa61f-9bf3-4623-a0be-dfbe07329a60`: selecting Work no longer opens the phone's keyboard automatically. Completed Work image/source tasks clear the pending activity bubble. A second 360px mobile smoke test passed Chat default, Work switching, Team agent placement, Chat restoration, simulated agent responses and removal of stale progress text; no horizontal overflow.
- Simulated browser-session test: 'open your browser for me to control here' submitted in Chat switched into Work, initiated browser status/start, paused for manual control and rendered a screenshot and full Live View link. No real paid browser was started in these tests.
- Protected endpoints still require authentication (HTTP 401 for screenshot and protected image/search when anonymous); health/capabilities returned HTTP 200. Full real signed-in browsing, screenshot clicking, agentic Goodreads research and file/email integrations **have not been tested end-to-end** and must not be claimed completed.
- The first new Chat/Work version had malformed embedded script escaping, detected by the immediate live mobile test. It was superseded by a properly escaped controller. Avoid rolling back to the broken intermediate version.

## Free AI Browser agent — opt-in Cloudflare Browser Run (2026-11-08)

**New live entry point:** https://chatgpt-nyx-v3-test.adeniyipaul174.workers.dev/ai-browser . The active NyX sidebar includes **AI Browser · Free**. Explicit Normal Chat phrases such as 'use AI browser to ...' prompt before opening this page. The existing Normal Chat mode, search, images and other tools are unchanged.

**What it does:** From a user-confirmed task, a Cloudflare Browser Run session connects to a real browser tab using the session-pinned CDP WebSocket. Llama 4 Scout chooses one bounded action at a time from a visible-page snapshot: navigate to a public HTTPS address, click a visible element, type, scroll, finish or request handoff. The original same-origin NyX authentication gates apply. The page offers Cloudflare Live View, Pause, Resume, Stop, and a link to open Live View in a separate tab. Password, payment, purchase, destructive and send-related actions trigger manual handoff instead of automated clicks. Page content is marked untrusted. This is experimental, not a guarantee of perfect autonomous website workflows.

**Free-tier reality:** Cloudflare Workers Free includes 10 browser-minutes per day shared by the account. NyX uses its already-installed `BROWSER` and `AI` bindings; it does **not** launch the paid Browser Use Cloud service. Its own guard limits launches to one session per user per UTC day, a 120-second application session, 12 model-selected steps, and requires sufficient remaining free browser usage. No provider offers an unlimited permanently free hosted session. A separate self-hosted `browser-use`+Ollama example is provided under `addons/free-browser-agent/local_browser.py` for users with their own sufficiently capable PC; it has no hosted browser-minute cap but **is not automatically connected** to hosted NyX.

**Database change:** Added the new isolated D1 table `nyx_free_browser_agent` with session ID, user ID, start/expiry times, paused state, task, bounded action log, and short lock. No existing user/chat tables were modified. SQL creation and all nine column definitions were verified successfully.

**Production changes:** A self-contained browser-agent helper module was added directly before the active Cloudflare Worker export. A responsive browser page is served only to authenticated NyX sessions. An actual (not archived) sidebar item and a narrow chat redirect were added to the active HTML. Cloudflare compiled and deployed the source, inheriting all **13 bindings**. No existing model, search, image, browser reader, original Browser Use integration, or database connection was removed.

**Tests completed:**
- An isolated, temporary Cloudflare Browser Run Worker launched a session, connected to the **page target**, navigated to https://example.com, read `Example Domain` from the DOM, and successfully obtained a Live View URL. Browser session was closed afterward; probe Worker disabled and deleted.
- `env.BROWSER.limits()` was verified. The account exposed a working native browser binding. No paid Browser Use session was created.
- The live NyX home page rendered at 360px width without overflow; the **AI Browser · Free** sidebar link was visible; Normal Chat remained the default; the sidebar still closed when tapping outside.
- Protected AI Browser status/start endpoints returned HTTP 401 when unauthenticated. Existing health and capabilities returned HTTP 200; search, chat, image, browser and other protected endpoints remained protected.
- The separate responsive page rendered in an isolated static test at 360px: all Start/Pause/Resume/Stop buttons, live browser frame, task field and consent were present with no horizontal overflow. A 1280px follow-up screenshot was unavailable because the Cloudflare Browser Rendering API returned HTTP 429. The static probe Worker was disabled and deleted.
- The browser-agent code and page script passed JavaScript syntax checks. Stronger strict-JSON instructions were deployed in the final version for robust action parsing.

**NOT verified:** a real authenticated multi-step NyX browser task in the user's account, cross-origin iframe permissions on the Live View provider, actions on complex forms, and every website's anti-bot challenges. An isolated CDP test and unauthenticated route checks do not prove these workflows. Users should try a public, non-sensitive site first. Never send payment details or passwords to the agent. The two-minute session limit is an app guard, and backend browser inactivity behavior is provider-controlled; use the Stop action explicitly.

**Rollback target:** `642eb284-10c5-48c1-8293-8f3206878257`. The stale GitHub root source MUST NOT replace this live Worker. The addon and companion local script are source files in `addons/free-browser-agent/`, not a complete copy of production.

## Public web-search resilience (2026-11-08)

### Trigger

- Screenshot showed NyX replying twice with **'could not retrieve matching public web evidence'**, including after **'Search for libanogs'**. Public web and GitHub results exist for `libanogs` / `libanogs.so`, a game security library; the failure should not be treated as proof the subject does not exist.
- NyX has real search providers but used anonymous Bing HTML/DuckDuckGo pages first. Search-provider anti-bot challenges, changed HTML and irrelevant RSS results can cause zero usable results.

### Confirmed provider diagnosis from an isolated temporary Cloudflare Worker

- The **same live GitHub search implementation** fetched six relevant repository results for `libanogs`, including `Lixense/ff-ace-anticheat-analysis`; the six results all passed NyX's own relevance ranker.
- The **same live DuckDuckGo Lite parser** failed to find extractable results when DuckDuckGo returned an HTTP **202 challenge** (no result-link markup). A separate diagnostic retrieval had earlier returned live DuckDuckGo HTML with relevant links, showing that anonymous page availability changes.
- Bing web RSS could return HTTP 200 with an unrelated set of Microsoft results; NyX's relevance ranker correctly rejected those, even though the transport succeeded.
- The isolated diagnostic Worker used **zero credentials and no production bindings**, and was disabled and **deleted** after testing.

### Production changes

- Added `nxSearchTechnicalTopic`: searches for libraries, SDKs, source-code repositories, language tooling, Android/kernel/security/firmware terminology, and `lib...` software-library names now check the **already existing** GitHub public API *in parallel with* Bing and DuckDuckGo. A relevant GitHub result no longer waits for anonymous web pages to fail. No GitHub OAuth key or new paid service was added.
- Added `nxSearchBackgroundQuery`: suitably evergreen general-knowledge queries can consult the **already existing** Wikipedia search API in the initial parallel search wave. Fresh news, shopping, local, weather and comparison queries remain excluded from this background shortcut.
- Added `nxSearchFollowupQuery`: if a phrase such as **'Search it then'** remains unresolved after AI reference handling, NyX can reuse the latest concrete subject from the **same chat** instead of sending 'it then' as a search term. No cross-conversation memory mixing.
- Original source-validation, ranking, link allow-checks, Bing, DuckDuckGo, research streaming, content citations, images, agents, Normal default, mobile sidebar, account history and authentication are preserved.
- Failure wording now distinguishes providers unable to verify a match from a definitive claim that a subject doesn't exist.

### Tests and limitations

- Fifteen standalone search-classification, background-eligibility and follow-up-memory test scenarios passed before deploy.
- Cloudflare accepted the new Worker version with **all 13 original bindings inherited** and deployed it to 100% traffic. Verified current source contains the new technical, encyclopedia and follow-up search paths.
- Live **360px mobile browser**: no horizontal overflow; Normal still selected by default; the hamburger opens the sidebar and tapping outside closes it; the removed close button remains absent.
- Live endpoint smoke checks: health, capabilities and auth capabilities returned HTTP 200; protected chat, image, search, vision, browser, account history and usage endpoints returned HTTP 401 unauthenticated; `/lite` remains HTTP 404.
- **Not yet verified:** signed-in end-to-end web searches from the user's session, all search categories and service responses under every regional network condition. A successful isolated provider test plus public route checks are **not** a guarantee that authenticated chat will always find sources or never time out.
- No database schema or user data was changed. If a new regression appears, rollback to the prior live Worker version `fdaf81da-1396-4dc5-b17a-3ca130f6ade1`. The repository root remains stale and must never be deployed directly over this live app.

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
