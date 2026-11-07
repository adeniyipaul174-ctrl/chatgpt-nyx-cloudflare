# NyX Website Studio — production implementation

Published November 6, 2026 on the **actual Cloudflare production Worker** `chatgpt-nyx-v3-test`.

## Live release
- Production version: `4ee67f0d-fd7a-4d7d-8fdd-985238e4a9a9`
- Previous version retained for rollback: `9f92788c-dba7-4e7e-8a6e-3d8488de6bd2`
- Published Worker SHA-256: `21b4f16ca1f8d852b452ed78497afc6d56b6090332b27ddde0d9d35d02aa252a`
- All 13 original Cloudflare bindings preserved (including AI, D1, browser and secret binding identities). No test user data was written to production D1.
- Live URL: https://chatgpt-nyx-v3-test.adeniyipaul174.workers.dev/

## Normal chat behavior

Ask NyX something like **"Create a professional and beautiful landing-page website for Vermont Book Club with premium editorial styling"**.

The integrated `nxWebsiteIntent` classifier routes clear creation requests to the existing `nxWebsiteBuild` on Workers AI, then `nxSiteNormalize` and `nxSiteRenderHtml` construct a complete responsive single-page HTML document. The result is saved in existing browser-side media storage and displayed as a Website Studio chat card.

Available controls:
- **Preview** opens an isolated iframe, with separate Desktop and Phone sizing. The iframe has `sandbox=""` and does not execute scripts or grant same-origin storage access.
- **HTML** downloads the complete static site markup, including CSS; the website uses Unsplash images and Google Fonts where an internet connection is available.
- **Revise** lets the user request design changes in the existing conversation and passes the previous structured specification.
- Existing chat, images, research and other tools remain intact.

Five design palettes: editorial, midnight, ocean, blush, citrus. Content categories include studio, food, travel, wellness, fashion, tech, education, and business. Pages include hero/navigation, services, about, process, contact CTA and footer. The design renderer safely escapes user/model copy and restricts external CTAs to HTTPS or mailto.

## Live reliability improvements

Added in production without replacing the current Website Studio:
- A robust model response extractor: accept the Workers AI return value only when it is a string, otherwise check the structured chat response.
- A signed-in, same-origin, bounded `POST /api/nyx/site/render` endpoint to reconstitute exported HTML from the safely normalized saved design, for users opening a conversation on another device.
- Preview fallback to that endpoint when the local HTML blob isn't stored on the current device; recovered file is cached.
- Strict root CSP exceptions for the actual preview's Unsplash images and Google Fonts, and a self/blob iframe frame source. Other CSP restrictions preserved.

## Verification

- **PASS** real headless Chrome [existing production Website Studio acceptance](https://github.com/adeniyipaul174-ctrl/chatgpt-nyx-cloudflare/actions/runs/42290111249): create, preview, phone, HTML export and revision at 360, 393, 768 and 1280px. Normal chat responses are mocked in the browser test; no account credentials used.
- **PASS** separate [enhancement staging acceptance](https://github.com/adeniyipaul174-ctrl/chatgpt-nyx-cloudflare/actions/runs/42291242996): root CSP checks, no-auth cross-device restoration returns HTTP 401, Unsplash image successfully loaded and no blocked font/image/iframe resource; create/preview/download/revise at all four widths.
- Cloudflare REST Workers AI model `@cf/meta/llama-3.3-70b-instruct-fp8-fast` returned a valid structured site response for a skincare example, confirming current model capability.
- The new production acceptance workflow `.github/workflows/nyx-live-site-polish-checks.yml` repeats staged checks against the live Worker.

## Known limits

This is a **static front-end website builder**, not a complete full-stack website deployment platform. Generated HTML can be downloaded and hosted elsewhere. Forms, purchases, subscriptions, logins, databases, bookings, inventory and custom domain publishing require integrations or a hosting workflow and must not be claimed as functional. Sites using external photographs or fonts need internet access; stock images should be reviewed for suitability and licensing.

Browser acceptance tests simulate login only in their browser environment and fake AI replies to test rendering; they **do not** prove a full authenticated chat conversation with actual user credentials or every business requirement. Separate live Cloudflare AI model invocation was tested.

## Repository safety

**Do not merge draft PR #16 into main or deploy the GitHub repository root** without reconciling it against the current live Worker source. The root repo lags the deployed source, and copying it may overwrite features. The production release above was a code-only Cloudflare Worker update with unchanged bindings and a preserved rollback version.

The feature branch also contains experimental alternate generator modules `workers/nyx-site-spec.mjs`, `workers/nyx-site-css.mjs` and `workers/nyx-site-render.mjs`, but those were *not* deployed to production: the live implementation described above is the authoritative one.
