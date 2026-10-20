# NyX v174: Search relevance and source-icon UI regression repair

**Production Worker:** `chatgpt-nyx-v3-test`

**Deployed version:** 174 (`43a20895-ee52-4c11-bf84-152846fcccc1`)

**Rollback:** 173 (`905b3775-0f4a-4bdd-8b12-fa7652356be4`)

The GitHub repository root is an older candidate and must **not** be deployed to the live Worker. This branch is a surgical patch record.

## What changed
- Stronger search-result relevance thresholds, with named-author first/last-name matching.
- Search results for requests explicitly requiring free access must actually mention free/no-cost access before being presented as relevant.
- Cached search results are re-filtered; stale or loosely related cached links cannot bypass the new relevance threshold.
- When NyX resolves a reference (e.g., "those authors") into a specific search query, the answer generator receives **both** the original user request and the resolved query. It must answer the original request rather than merely summarize its search phrase.
- The existing source-icon progress UI, cancellation flow, mobile interface, authentication, author-reference recall and history have been retained.
- Normal chat no longer routes through the temporary background-reply shortcut. Background queue infrastructure is retained but the foreground client is deliberately not redirected.

## Validation performed
- Cloudflare compiled version 174 successfully.
- Compared all 14 existing bindings and runtime compatibility configuration with deployed v173 before rollout: no differences.
- Staged relevance regression: 3/3 synthetic scenarios correctly rejected unrelated dictionary pages, paid-only AI-model pages, and unrelated troubleshooting pages.
- Cloudflare Browser Rendering at 390px width: no horizontal overflow; the existing search progress renderer initializes.
- Browser-side mocked NDJSON stream visibly displayed "Searching the web", "Searching 1 website", "Reading 1 website", "Reading relevant websites" and "Preparing answer"; source-icon tile containers were present and the completed answer returned correctly.
- Server-side mocked stream preserved original user question and context-resolved query, emitted stage/source/done events.
- Deployed v174 and independently verified live Worker version, loading of search UI, recall function, protected history, and health/capability endpoints.
- Signed-out live conversation endpoint returned **401 Please sign in to use NyX**. That is expected, but **real signed-in AI answers and live web provider quality remain untested** in this session.

## Release blockers still to test with a signed-in user
1. Ordinary chat including "Who are you?" and troubleshooting questions must not trigger unrelated sources.
2. Fresh public fact request must automatically search without the words "search the web".
3. Named-author contact search must use names in current chat, not dictionary search for "all".
4. Search citations must correspond to relevant verified website content; mark incomplete author-contact searches as incomplete rather than inventing addresses.
5. Source icons/status must appear for real streamed web research, not just mocked streams.
6. Search cancellation must leave conversation usable and not duplicate assistant messages.
7. Long chats and cross-device history must preserve context; test references older than 16 turns.
8. OAuth, MFA, account isolation and D1 migrations.
9. Image generation/editing, PDF extraction, uploads and narrow-screen composer behavior.
10. Provider outages, quotas, timeouts and retry messages.

## Don't overclaim
This is a **targeted reliability fix**, not evidence that every NyX feature is launch-ready. Full signed-in end-to-end tests have not yet run. Avoid claiming zero bugs or all features fixed.
