# NyX Free-First Live Web Research V2

## Status and safety gate

This change is **only in the development branch** `feature/free-web-research-v2`. The production Cloudflare Worker `chatgpt-nyx-v3-test` currently contains a substantially newer and larger codebase than this GitHub candidate. **Do not deploy or overwrite the production Worker with the GitHub candidate.** First reconcile the live source and bindings with a separate, private staging branch/Worker and run authenticated end-to-end smoke tests.

No paid search API, billing integration, or remote browser purchase is enabled by this feature.

## What's implemented in this branch

- Automatically detects current, time-sensitive and explicit web-search requests; ordinary chat remains on the normal model path.
- Manual `Web search: Auto/On` switch in the composer. Auto decides from the prompt; On forces searching.
- Uses no-key sources: DuckDuckGo Lite (public HTML, subject to blocking), GitHub public API for repository queries, Bing News RSS for news, Wikipedia as supplementary background.
- Optionally supports **self-hosted SearXNG** in JSON mode at `NYX_SEARXNG_BASE_URL` (example: `https://search.yourdomain.example`). The instance must enable JSON responses. Do not use random public instances without authorization or rely on unlimited public access.
- User-requested public HTTPS pages can be fetched when asked to read, check, open or summarize a URL.
- Fetches at most two readable pages per response with bounded byte budgets and timeouts. Redirects, non-HTTPS URLs, local/private host patterns, IP literals, userinfo and nonstandard ports are blocked. External page text is treated as untrusted data.
- Cites retrieved sources in answers and renders the verified source links as safe external anchors, including after reopening saved chats.
- Provides explicit failure notice when no usable source is returned. A provider failure must never become a fabricated citation.
- Caches recent queries within the Worker isolate for three minutes; this is not a persistent or cross-region cache.

## Usage

Normal prompt examples: `What's the latest browser engine release?`, `Find trending GitHub open-source chat UI repositories`, `Search the web for free hosting alternatives`, `Read https://example.org/article`.

Use `Web search: On` for questions where NyX's automatic detection may miss the need to search. In `Auto` mode, NyX selects search for explicit and time-sensitive requests.

To test the **branch candidate only**:

```sh
npm test
npm run check
```

The branch's GitHub Actions workflow also runs these checks automatically. No secrets are needed for offline tests. Actual outbound providers and authenticated Gemini responses still require staging integration tests; success in CI does **not** prove production browsing.

## Production rollout prerequisite

1. Securely retrieve and inventory the currently deployed Cloudflare Worker, its route behavior and *binding names only*. Never copy API secret values into GitHub or logs.
2. Compare the much larger deployed Worker against GitHub and reconcile all existing authentication, AI, storage, UI, browser and quota features first.
3. Port this new search module into the **live code architecture**, which already includes a different search system. Do not deploy this old candidate wholesale.
4. Test live provider availability from the target hosting region, source links, search auto-routing, authorized sessions, origin checks, daily/per-minute quotas, and no-charge safeguards in a separate staging Worker.
5. Back up the live deployment and perform a reviewed, reversible release only after smoke tests pass.

## Operational limits

No service genuinely offers unlimited internet crawling, free unrestricted search, or unlimited hosting. DuckDuckGo/Bing public HTML/RSS layouts can change or block automation; public GitHub endpoints have request limits; SearXNG requires a legitimate instance and hosting capacity. Respect publisher access restrictions, terms and robots directives. No attempt is made to bypass anti-bot controls, paid access, or provider usage caps.
