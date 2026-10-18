# NyX next-generation candidate

This is an extension of the Cloudflare Worker, not a replacement for the older GitHub app. The root `src/`, `public/`, authentication, database schema, deployment configuration and existing history have not been replaced.

## Baseline and recovery

- GitHub base: `41bb818c0b0b9f7100291b5f351695ed460a9bd5`.
- Initial production version: `09d33c00-0102-4291-87e5-ce963c56f254` (143).
- Cloudflare source snapshot: version `d1afd793-9cd4-436b-8838-1b78cadad5c9` (144), uploaded during initial inspection. It subsequently became production through another deployment; that deployment was not performed by this development task.
- Snapshot commit on this branch: `4508124f289c96640c464e326fcef54801a28dfb`.
- Source SHA-256 including final newline: `a81039e773b740a407c88ec8d12bf0ab8a5a40639db38a6c82906d4b08f1b2e1`.
- Rebased onto subsequently deployed version 145 (`a04c973b-ab3e-4071-92e0-18c32cdd05b0`), preserving its generalized public-fact routing and uncertainty fallback. The concurrent production deployments were not performed by this task.
- Version 145 recovery commit: `011934ec4872a504898d729c1625946716062ae2`.
- Candidate uploaded as Cloudflare version 146: `20d105e7-2c02-42f8-9e9c-47a613369740`. This version has not been deployed to production.
- No schema migrations or user-data changes are needed.
- Production rollback after a future release: deploy version 145 (`a04c973b-ab3e-4071-92e0-18c32cdd05b0`) at 100% using Cloudflare Deployments, after checking that it is still the appropriate previous version. Do not deploy the repository root configuration over this Worker.

## Implemented in this candidate

- Actual OpenRouter free / existing Workers AI response streaming, NDJSON transport, bounded parsing, cancellation, progressive safe Markdown, partial browser-history checkpoints, one-message completion reconciliation. No provider fallback after partial text has appeared.
- Deep Research: up to three planned searches plus one discovery-driven verification query, eight deduplicated sources, bounded original-page reading, structured synthesis, retrieved-source citation destinations and inaccessible-source notes. Paid search bindings and Browser Rendering are disabled for this workflow. Quick search remains separate.
- More conversation context: 24 recent turns sent, bounded older excerpts, 30,000-character model history budget; latest corrections retained. This is an extractive context digest, **not** a model-generated long-term memory system. Existing explicit user preferences remain unchanged.
- Edit/resubmit and regenerate into a new branch, preserving the original conversation; branch from a message; formatted copy.
- Browser read-aloud, pause/resume and stop. Existing dictation retained with a processing notice. This is not real-time two-way voice.
- PDF extraction up to 100 pages / 170,000 characters, page labels, DOCX/text limits, relevance-ranked passages, up to four documents per upload. Scanned PDFs without text are rejected; no OCR claim. File extraction takes place in the browser.
- Deterministic CSV descriptive statistics and downloadable JSON. No arbitrary code execution.
- PWA manifest, existing NyX brand icon, installation affordance, update action and narrowly scoped public static caching. Authenticated pages/API responses are never added to the service-worker cache.

## Validation

Run `node --test nextgen/tests/*.test.mjs` with Node 22 or later. No API keys, private chats or live model calls are required. Tests use synthetic accounts, mock database operations and mock providers.

Tests cover transport chunk boundaries, partial connections, cancellation, provider fallback boundaries, UI checkpoint reconciliation, actual request routing with a mock authenticated session, context retention, document passage retrieval, citations, bounded research, CSV correctness, PWA cache scope and syntax of every generated browser script.

Model-based relevance, factual entailment, benchmark quality, live free-provider availability and Android/browser visual behavior remain **unverified**. Chromium installation failed in the development environment; browser-layout and microphone/device checks must be completed before production release. Do not report synthetic tests as live-model quality scores.

## Release constraints / unfinished work

- No production release until real browser testing covers existing auth, Google OAuth, image generation/editing, file uploads, search cancellation, streaming, local-history persistence, mobile layout and install/update behavior.
- The source export embedded in the old Worker is a historical snapshot; it is deliberately preserved unchanged. Use this branch for candidate source.
- Workers AI startup cannot forcibly cancel inference already accepted by the provider. Cancelling the response reader stops delivery and further workflow stages; do not promise cancellation refunds or zero usage.
- Research cancellation is checked between bounded searches/pages. In-flight legacy search-provider requests may finish before stopping.
- Automatic factual verification can replace an uncertain draft with a sourced final answer. It does not append a duplicate message.
- Deep Research verifies retrieval and citation destinations, not the factual entailment of every model claim. Models can still misinterpret evidence.
- Older context is compacted by excerpts; full semantic summarization and explicit editable memory are future work.
- Multiple documents can be compared within one upload. Persistent document libraries, XLSX parsing and cross-session retrieval are not implemented.
- CSV has strict size/shape limits. Arbitrary Python, downloadable charts and sandbox execution are not enabled.
- PWA installability and speech behavior require real Android testing. SVG icon acceptance can differ between launchers; supply tested PNG variants if required.

## Next release priority

Validate this candidate in a real mobile browser with isolated test data, repair observed regressions, then promote a small streaming-first release. Next add semantic context summaries and a separately provisioned sandbox according to `SANDBOX.md`.
