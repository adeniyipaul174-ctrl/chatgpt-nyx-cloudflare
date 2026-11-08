# NyX live Cloudflare deployment — 2026-11-08

> **Safety notice:** The source files in this repository are an old candidate. They are **not** a complete snapshot of the live Worker. **Never deploy this repository root over production** without first reconciling the full live source and safely testing an isolated staging version. Existing account, browser, image, and site features must be preserved.

## Production

- Live Worker: `chatgpt-nyx-v3-test`
- Live application: https://chatgpt-nyx-v3-test.adeniyipaul174.workers.dev/
- Active Cloudflare Worker version (2026-11-08): `90b5188f-19ad-4ca4-957c-1e529f465f8e`
- Prior version for emergency rollback: `686530f3-a15c-49fc-88a2-599869197fc2`
- Deployment: `5be26e7d-888c-4b75-9503-4e159d0f324a`

## Model changes deployed

- Primary model for **normal and detailed text chat**: `@cf/meta/llama-4-scout-17b-16e-instruct` on Cloudflare Workers AI.
- Main `/api/chat` also uses Llama 4 Scout first.
- Legacy Llama 3.3 70B references in the live Worker were updated to Llama 4 Scout across applicable agent and builder paths.
- Llama 3.1 8B remains for certain inexpensive routing tasks and contingency fallback. When Llama 4 Scout is unavailable, the main writer can try the configured external free provider before the 8B fallback.
- Vision functionality already used Scout and remains available.

## Low-data mobile and desktop interface

- Lightweight text-chat page: https://chatgpt-nyx-v3-test.adeniyipaul174.workers.dev/lite
- Uses the same authenticated `/api/chat` endpoint; it does **not** download or execute Llama model weights on phones, tablets, or PCs.
- Simple HTML/CSS/JavaScript; no large client-side ML runtime. Chat history in the Lite tab is temporary and the full app remains unchanged for full functionality.
- Cloudflare delivers compressible text content with negotiated compression when applicable. Device RAM and network use still depend on the browser and other app features.

## What was verified

1. Cloudflare Workers AI REST inference completed successfully using the Scout model.
2. The new Worker version passed Cloudflare compile validation.
3. All 13 existing Worker bindings were preserved through strict binding inheritance, including the D1 database, OAuth secrets, AI, browser tools, and rate limits.
4. The deployment was confirmed as active through the Cloudflare API.
5. Cloudflare Browser Rendering successfully opened the live `/lite` page and found the expected Scout UI and chat form.

End-to-end authenticated chat, account history, and all builder functionality were not exhaustively regression-tested in this change.

## Free-tier expectations

Cloudflare Workers AI grants a shared free daily Neuron allocation, not unlimited free inference. Higher usage may require a paid plan. Smaller devices benefit because model inference remains remote; local model compression is unnecessary.

## Future source-of-truth maintenance

Before the next functional deployment, export and review the **full current live Worker** into a private/staged source workflow, reconcile that snapshot with GitHub, run the test suite and authenticated smoke checks, and preserve all platform bindings. The older Gemini candidate in `src/index.js` must not be deployed over this live version.
