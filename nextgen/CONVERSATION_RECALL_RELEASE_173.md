# NyX v173 — Conversation Recall and Grounded Search

Live Cloudflare Worker: `chatgpt-nyx-v3-test`
Deployed version: **173** (`905b3775-0f4a-4bdd-8b12-fa7652356be4`).
Rollback version: **171** (`12c3cfab-88a6-4390-b643-c35c8805dc47`).

## Problems addressed
1. Earlier author list ignored, so pronouns ("those authors", "all") were searched literally.
2. Search query normalization removed "contact email" from named-author queries.
3. Browser-level background queue shortcut bypassed NyX's existing streamed search indicators and favicon/source tiles.
4. Previous AI-generated author lists were treated as facts without public verification.

## New request flow
- On a follow-up, the frontend extracts named authors from the **entire currently open chat**, including old assistant messages outside the last 16 sent to the model.
- The extracted context is passed as `conversationContext`. It is not treated as verified information.
- The backend recognizes author-contact requests referring to a prior list. With missing names it asks for the list, rather than searching the word "all".
- With names, the backend searches one author at a time using public author-site queries. It reports only email strings actually read from relevant retrieved pages, with source URLs; otherwise it marks emails unverified. The initial batch is capped at six and the answer explicitly states the partial progress.
- General conversational references also use a short relevant earlier excerpt; public web queries are rewritten using that context when resolvable.
- Direct /api/nyx foreground requests have been restored. The original streaming website icons/progress UI remains installed.

## Tested
- Staged Worker compiled at Cloudflare before deployment.
- Existing 13 Cloudflare Worker bindings preserved; one pre-existing Queue binding also remains, without redirecting ordinary chat to background.
- Extracted names from both plain and bold author lists and Goodreads-profile URLs.
- Browser-run mock: contextual question resolves to separate named-author queries; missing context returns a request for the list; synthetic public email is accepted only when read from a matching public webpage; email not found is never invented.
- Rendered candidate's real HTML via Cloudflare Browser Rendering: author recall function runs, search UI initializes, generic background client is absent, no horizontal overflow at 390 px.
- Deployed version 173 confirmed live.
- Post-deployment mobile render: same checks pass with two named-author examples.
- Signed-out health, session and capability routes return HTTP 200. Account history/background endpoints return HTTP 401 signed out.

## Still requires manual verification
- Signed-in real research with the actual authors previously listed in an actual NyX conversation.
- Website provider quality, response times, and email verification for varied real authors and contact formats.
- Reference resolution when multiple unrelated author batches appear in one long conversation.
- Broad multi-turn coreference beyond names, including companies, books and pronouns.
- Full authenticated data-isolation, MFA, account history and cross-device resume tests.

## Important boundaries
- The full background-processing client is deliberately disabled from normal chat until the original streaming search UI can coexist with durable queue progress. Background jobs/Queue/D1 infrastructure remain deployed but the chat composer uses the original foreground search workflow.
- This branch documents surgical updates to the authoritative Cloudflare Worker. The GitHub root source is stale; **do not merge and deploy this branch directly without reconciling the full Worker code**.
