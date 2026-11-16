# NyX Site Studio v3 — verified multipage release
Published 2026-11-07, production Worker `chatgpt-nyx-v3-test`.

## Release verification
- Cloudflare deployment: `a4c97fb9-34d7-4283-98ce-8e6a14e1a644` serving **100%** of traffic.
- Production source SHA-256: `868cbc3ce8da72ee7fefeaa5b37a0cefa88f6b2e544b968f1399cc41a90e7b6b`.
- All **13** existing Worker bindings were preserved.
- Test-only OIDC routes were removed from production; staging subdomain disabled.
- [Real AI integration run 42353006092](https://github.com/adeniyipaul174-ctrl/chatgpt-nyx-cloudflare/actions/runs/42353006092): generated FOUR actual standalone HTML pages for VECTOR GRID in a dark navy/cyan design; requested a Pricing page and confirmed a fifth HTML file while preserving the other four; checked the actual site at 320, 393, 768, 1440px including navigation and no horizontal overflow. Model requests used the account's existing **no-cost** OpenRouter connection, with an explicit free coding model and disabled hidden reasoning.
- [Production browser acceptance 42353264231](https://github.com/adeniyipaul174-ctrl/chatgpt-nyx-cloudflare/actions/runs/42353264231): parsed actual served JavaScript, created simulated site response, visited Home → About, selected pages, switched to phone, exported a valid ZIP of individual HTML files, added Pricing in follow-up. Passed 320, 393, 768 and 1280px. Browser acceptance mocks sign-in and model replies; the separate real-model run above verifies generation and editing.

## What changed and why
The previous NyX builder produced one static HTML page from a preset layout. A subsequent bespoke page builder could not add real files or preserve edits, and a generic catch reported `NyX couldn't complete that request. Please retry.` for AI failures.

The live v3 builder:
1. Plans **real separate page files** `index.html`, `about.html`, `services.html`, `contact.html`, etc. Each page has its own HTML/CSS and content.
2. Replaces model-generated fake navigation with real relative links to included page files.
3. Stores each project in browser-local IndexedDB (existing NyX storage). The chat saves a project reference and summary, not a huge HTML transcript.
4. Routes follow-up requests to operations: edit a named page, add/remove/rename page, or redesign the project. Single-page edits preserve other page HTML where no navigation update is needed.
5. Uses a full-page preview with page selector and mobile/desktop switching, including sandboxed navigation bridging; exports complete multi-file ZIP.
6. Uses exact HEX colors when supplied and different palettes/layout requirements by brief. If a free planning model returns malformed JSON, the fallback planner derives the project from named pages, industry, brand, script and colors; it does **not** substitute the old one-page HTML preset.
7. Tries available Cloudflare Workers AI; when the free allocation is exhausted, uses the existing OpenRouter key with **free-only** `cohere/north-mini-code:free` first and `openrouter/free` second. Hidden model reasoning disabled for Cohere so output tokens are available for HTML. Uses `provider.data_collection: deny`. No paid model was enabled.
8. Catches website errors at the website route with explanatory quota, timeout or invalid-page messages rather than hiding every error behind a generic 502. Retains prior project on failed edit.

## Usage
Open https://chatgpt-nyx-v3-test.adeniyipaul174.workers.dev, sign in, refresh the web application, and start a new chat:
- "Create a professional 4-page website for VECTOR GRID. Home, Product, Security and Contact. Use dark navy #08182e, white #ffffff and cyan #2be7fa. Make each page visually different with real navigation."
- After creation: "Add a Pricing page to this same website with detailed package cards."
- Or: "Edit only the About page: add a photo gallery and change the headings without altering the Home or Services pages."
Open the resulting website card, use the page menu and phone preview, and download ZIP.

## Known limitations
- **Static multipage websites**, currently up to seven pages, not a hosted full-stack CMS or functional e-commerce system.
- Real payment processing, stored form submissions, databases, accounts, hosted domains and backend APIs are not automatically provisioned.
- A website must be built while free AI model capacity is available; no-cost quotas can still be exhausted.
- Project HTML is stored locally by device. Export ZIP for preservation and hosting; some external fonts/Unsplash photographs need internet.
- Live GPT/AI production behavior still varies by prompt; do not claim flawless design for arbitrary briefs. Verify generated content and page functionality.

**Deployment warning:** The GitHub feature branch contains the modular source files `workers/nyx-site-project-v3.mjs`, `ui/nyx-site-project-v3.js` and `ui/nyx-site-project-v3.css`. The giant live Worker is not equivalent to the older repository root; do not redeploy an outdated root Worker over production without reconciling code and preserving all bindings.
