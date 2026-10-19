# NyX Durable Background Replies — Cloudflare Worker v172

**Live Worker:** chatgpt-nyx-v3-test

**Deployed Worker version:** 172 (`fe3818d2-92ab-4f0f-be6d-1cd0a31408c6`)

**Rollback Worker version:** 171 (`12c3cfab-88a6-4390-b643-c35c8805dc47`)

**Queue:** `nyx-background-jobs` with Worker push consumer on `chatgpt-nyx-v3-test`.

**Database:** new independent `nyx_background_jobs` table and account/date index in existing D1 binding `NYX_DB`.

## Architecture

1. For ordinary text, conversational and web-research questions, the NyX frontend enqueues an authenticated job with a conversation ID. It stores no session cookie in Queue or D1.
2. The Worker returns a job ID immediately. The browser polls that job while open.
3. The Queue consumer runs independently of the browser and uses existing NyX routing, chat, search and browser-reading functions.
4. The consumer stores the answer and sources in a per-account D1 row and clears the original job payload on completion.
5. When the user returns, the frontend retrieves completed jobs only for the currently signed-in account, merges each result into the correct local/cloud-synced conversation, and deduplicates using `backgroundJobId`.
6. Existing image creation, uploaded file/image editing and document processing keep the original foreground endpoint. Frontend routes detected creation/attachment requests there; server returns a 409 fallback for image intent.

## Security and resource controls

- All job GET/POST requests require an authenticated NyX session; POST also enforces existing origin checks.
- Per-account job limit of 3 concurrent queued/running jobs within an hour.
- Existing daily chat and search beta allowances continue to apply.
- The original 13 Cloudflare bindings were preserved, and a single new Queue producer binding was added.
- The job list is scoped by account ID. No tokens, passwords or session cookies are included in job payloads.
- Background job retrieval is marked private and no-store.
- Requests longer than 65 KB or with attachments are rejected by the background endpoint.

## Tests performed

- Cloudflare version 172 uploaded and deployed successfully.
- 13/13 existing binding configuration matches checked before rollout; new Queue binding present.
- Mobile browser smoke: 390px viewport, no horizontal overflow; login and health routes available.
- Signed-out `GET /api/nyx/background`: HTTP 401 (expected).
- Isolated Queue consumer mock: claimed, wrote a result and acknowledged a message successfully.
- Browser recovery mock: restored a job into the correct chat exactly once; no duplicate after a second poll.
- **Real Queue/D1/AI test:** seeded a synthetic job, submitted it directly to Cloudflare Queues, and confirmed `queued -> running -> done` with a saved correct AI response in **14 seconds**. The synthetic test job was deleted afterward.

## Unverified

- Full authenticated close/lock/reopen test on the user's Android device.
- Every possible web provider/network outage combination.
- Background image generation, photo editing, PDF processing and other uploaded files; those are intentionally still foreground-only.
- Push notifications outside NyX; finished replies appear when the user returns, without a native notification.
- Arbitrary long-running autonomous projects: Queue consumers have platform execution limits and this release processes a single conversation prompt rather than an unbounded multi-step agent.

## Manual checks

1. Sign in on Android; ask “Explain how neural networks work” and immediately switch to another app.
2. Reopen NyX after 20–45 seconds. The result should appear once in the same chat, with no duplicated assistant messages.
3. Repeat with a web-research prompt asking for the current price of a product.
4. Verify that closing and reopening NyX during response generation does not lose the reply.
5. Make an image request and attach a PDF; those paths should still use the normal foreground flow.
6. Sign out and sign into a different account; ensure it cannot retrieve the earlier account's background jobs.
7. Test daily quota and too-many-jobs responses, plus interrupted connectivity.

**Do not deploy the stale GitHub root Worker.** This branch records the changes staged against the authoritative Cloudflare v171 source. It is not a full synchronized replacement of the deployed Worker.
