# NyX v177 — Real-model answer-behavior repair

**Live Cloudflare Worker:** `chatgpt-nyx-v3-test`  
**Deployed:** 177 (`b39e723a-c37a-4f8c-b54d-3bebb03b4937`)  
**Rollback:** 176 (`724dc8db-efc8-4d51-9ac2-bcf63f1ce1a5`).

## Why this work was necessary

Prior patches concentrated on intent classification and search UI simulation, yet the underlying model still made incorrect assertions. Real Cloudflare Workers AI calls with the previous prompt exposed examples:
- "What issues did you have right now?" → "I don't have any issues to report. I'm functioning properly..." (unsupported live-status claim).
- With previously named authors, a public research request triggered "I don't have the ability to search..." (false description of the NyX product's capabilities).
- Generic requests were answered, but were sometimes verbose or boilerplate.

## Deployed changes

1. Rewrote the text generator's system guidance to prioritize the exact latest question and visible conversation context.
2. Clarified that NyX has separate search/image/file tools, but text responses cannot pretend those tools were run.
3. Required the text generator to acknowledge prior errors documented in conversation and not invent a live diagnosis.
4. Added a small post-generation quality gate correcting responses that wrongly claim NyX has zero problems, or categorically denies supported web-research capability.
5. Kept the existing 70B preferred model, fallback behavior, older-topic recall and 22-message recent window unchanged.
6. Made no changes to the existing streamed search UI, authentication routes, D1, image generation, document processing, or chat storage.

## Real AI test outcomes

On `@cf/meta/llama-3.3-70b-instruct-fp8-fast` with an exact extracted candidate system prompt:
- "Who are you?" → concise NyX introduction.
- Prior chat documents a wrong Microsoft search and network error; "What issues did you have right now?" → accurately reported both issues without guessing live diagnostics.
- Without prior context, "What issues did you have right now?" → model still said "no prior issues"; quality gate correctly converts this to a transparent note that live system status is unverified.
- "Explain why the sky looks blue" → accurate Rayleigh scattering explanation.
- Quality gate synthetic controls also verified that valid everyday answers pass through unchanged and categorical false web-capability denials are corrected.

## Deployment & regression checks

- Worker v177 accepted by Cloudflare syntax/compilation validation.
- Binding/runtime comparison between v176 and v177: all 14 bindings unchanged.
- Deployed v177 and confirmed active deployment ID.
- Signed-out Android-sized 390px browser: no horizontal overflow; source-icon progress module, author reference recall, and older-topic recall still load.
- `/api/health`, `/api/auth/me`, and `/api/nyx/capabilities`: HTTP 200.
- Signed-out `/api/nyx/account-history`: HTTP 401, as intended.
- Cloudflare Observability Issues: 0 currently recorded; this **does not** establish error-free runtime.

## Remaining launch blockers

- No authenticated end-to-end NyX conversational test with user's active login.
- No authenticated, end-to-end real search including source progress, citation checking, cancellation or provider outages.
- Real image generation/editing and PDF attachment validation outstanding.
- OAuth/MFA, cross-account data isolation, and cross-device history validation outstanding.
- Background queue client remains deliberately disabled after it interfered with live search progress; work to merge the two UX modes is unfinished.
- Real-model quality can still vary. Prompt/gate improvements do not guarantee accuracy or eliminate hallucinations.
- Monitor 70B Cloudflare usage and financial limits before public release.

**DO NOT deploy the stale GitHub root Worker.** This patch was surgically staged against authoritative deployed Cloudflare source. The branch is a change/test record, not a full synchronized deployable replacement.
