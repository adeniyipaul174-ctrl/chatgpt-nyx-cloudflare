# NyX v176 — Quality-First Model and Cross-Turn Context

## Production
- Worker: `chatgpt-nyx-v3-test`
- Current deployed Worker version: **176** (`724dc8db-efc8-4d51-9ac2-bcf63f1ce1a5`)
- Immediate rollback version: **174** (`43a20895-ee52-4c11-bf84-152846fcccc1`)

**WARNING:** The GitHub root Worker is stale and NOT equivalent to the deployed Cloudflare source. Do not merge/deploy GitHub root into production. This branch is a surgical source patch record, not a full deployable replacement.

## Root causes audited
1. NyX routed ordinary messages to OpenRouter's `openrouter/free` selector first, which can choose different underlying free models and give inconsistent answers.
2. Ordinary fallback was primarily an 8B model; stronger 70B was only used for detailed mode.
3. Only the latest 16 messages were sent from the active frontend, and `nyxWrite` used the last 14 of those. General topical information older than that was frequently forgotten.
4. Existing author-name reference recall helped explicit author lists but did not help general references to older topics.

## Shipped
- Use `@cf/meta/llama-3.3-70b-instruct-fp8-fast` first for all text styles; 8B remains fallback. OpenRouter's variable free route is only a final fallback if both fail.
- Short, explicit grounding rules: answer the actual user request, use earlier context as context not independent proof, never invent Goodreads API access, contact emails, searches, author facts or source links.
- Increase active request's recent turns to 22 and bound per-turn characters before AI inference to control context/token usage.
- Local earlier-topic retrieval scans older messages **only within the currently open conversation** when the user references earlier topics, providing a bounded excerpt to the request. No cross-user or cross-chat data is accessed.
- Preserve the legacy source-icon search-progress renderer, cancellation path, current authentication, image tools, PDF paths and all 14 bound Cloudflare resources.
- Keep browser background queue override disabled to prevent prior search UI regression. Queue infrastructure remains but is not wired to default chat.

## Tests passed
- Real Cloudflare Workers AI 70B inference call: recognized two earlier author names from a short dialog.
- Isolated model mock: selected 70B first, retained 22 turns; forced 70B failure and confirmed fallback to 8B.
- Browser test: successfully retrieved a relevant old topic beyond the current recent chat window.
- Staged v175 and v176 source compiled by Cloudflare.
- Before v176 deployment: compared all 14 bindings and compatibility configuration to v174; unchanged.
- Post-deployment: version 176 confirmed live, narrow 390px mobile UI no horizontal scrolling, source-progress UI present, topic memory and author recall modules loaded, background override absent.
- Public health, capabilities and signed-out session endpoints HTTP 200; protected account history returned 401 when signed out (expected).

## Known limits and remaining launch tests
- **Full signed-in model, real live web providers, citation relevance and long-chat behavior have not yet been tested end to end.** Signed-out requests to `/api/nyx` correctly receive HTTP 401.
- Larger model can consume more Cloudflare Workers AI allowance; quotas/costs should be monitored before public traffic.
- Topic retrieval is a bounded heuristic, not perfect semantic memory or long-term indexing.
- PDF extraction, image generation/editing, Google OAuth/MFA, and cloud history restoration need their own comprehensive release tests.
- Close-app background replies are still disabled from the regular client to protect source-icon streaming progress.

## Signed-in manual regression
1. "Who are you?" → direct intro; no web cards.
2. "Why can't you search correctly?" → discusses NyX search, not Windows Search.
3. "Search for the authors you listed earlier and find their public contact emails" → names from same chat; no dictionary entries, no fabricated email.
4. In a conversation over 25 turns, refer to a named subject from the first messages → should recover relevant context.
5. Request a current price without saying "search" → web research and relevant verified sources.
6. Force failed providers to test fallback and rate-limit messages.
7. Cancel live search and verify source-icons/typing controls remain usable.
8. Recheck PDF extraction, images, OAuth/MFA and history under real authenticated accounts.

Do not claim that zero defects remain based on synthetic tests or a signed-out smoke test.
