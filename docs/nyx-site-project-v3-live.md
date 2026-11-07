# NyX Site Studio v3 — true multi-page website projects

Published: November 7, 2026.

**Production Cloudflare Worker:** `chatgpt-nyx-v3-test` at https://chatgpt-nyx-v3-test.adeniyipaul174.workers.dev/

- Published version: `f00908d7-dbdc-4003-b76a-f7e02ab3bc69`, 100% traffic
- Published SHA-256: `1914cde0efa0a64a994a6917e62702140323287dfebe0ab4778a1993cc4e1673`
- Immediate rollback: `debd14e7-8ca8-47e6-99d8-134890167c7e`
- Existing 13 Worker bindings and D1 unchanged, including existing free OpenRouter secret (not disclosed)
- Staging-only OIDC testing endpoint removed from production

## What actually changed

The old website feature produced a **single, theme-based HTML document**. It was not a genuine multipage project and lost important context on revisions. Site Studio v3 replaces this with a structured site project (version 3) holding an independent `.html` file for each page. A full project normally includes Home, About, Services or Products, and Contact; the page architecture is chosen from the user's exact prompt instead of forced.

Every generated page uses its own model-directed HTML/CSS and the chosen palette; a shared responsive navigation layer connects files with real relative links such as `about.html` and `pricing.html`. Exact named HEX colors and the specified company name take precedence over generic model copy. If the design model fails to provide a usable palette, generation errors out instead of silently substituting the old repeated ivory/terracotta theme.

Within the **same NyX normal chat**, users may say:
- “Create a 5-page dark blue and electric cyan website for my data business, including Home, Product, Pricing, Security and Contact.”
- “Can you add a Pricing page?” — creates `pricing.html` and updates navigation on all existing pages.
- “Edit the About page: add a gallery and use a two-column layout.” — rewrites only `about.html`, preserves other page files.
- “Remove the FAQ page”, “Rename the Services page”, or “Change the colors on every page.” — separate targeted project operations.

Site preview has a **page dropdown**, real clickable cross-page navigation inside an isolated iframe, Desktop and Phone device options, edit and add-page buttons, and **ZIP export**. The ZIP contains every real linked HTML file plus README.

The developer's programmatic operations also include removing/renaming pages and a global design refresh while preserving page identity. Navigation changes are reconciled throughout the project.

## Safety and limitations

- Model output cannot add arbitrary scripts, iframes, external iframe embeds, live forms or unapproved image hosts. A fake unconnected contact form is converted to an honest contact section; a legitimate supplied public email can yield a `mailto:` CTA.
- Preview is sandboxed and uses a tightly scoped navigation bridge. Site scripts themselves are not executed.
- **Payments, user authentication, real shopping carts, databases, CMS, contact delivery, custom domains, and automatic live deployment are not included**. These need real backend integrations. V3 currently supports **up to seven static HTML pages** per generated project.
- Files are saved in local browser IndexedDB, not guaranteed to sync to a different device. Export the ZIP to retain the work.
- Images and external fonts may require internet and licensing checks before publication.
- The project uses Workers AI first; when the Cloudflare daily free AI allocation is exhausted, it attempts the **existing** OpenRouter connection with `openrouter/free`, provider `data_collection:deny`. No paid inference service or plan was enabled. If no free model is available, show a clear failure instead of substituting template HTML.
- The real multi-page AI generation test encountered Cloudflare's free daily allocation limit; a no-cost model fallback is unit-tested but its real availability is **not yet independently verified**. Do not represent this as a fully verified authenticated model build.

## Verification

- [Passing multipage project/unit tests](https://github.com/adeniyipaul174-ctrl/chatgpt-nyx-cloudflare/actions/runs/42339601263): distinct color handling, targeted edits preserving unrelated pages, new page/updated nav, remove page, HTML fixes, security, brand preservation.
- Additional [passing 12-test free-only fallback suite](https://github.com/adeniyipaul174-ctrl/chatgpt-nyx-cloudflare/actions/runs/42339531880).
- [Passing full staged browser test](https://github.com/adeniyipaul174-ctrl/chatgpt-nyx-cloudflare/actions/runs/42339646967) on real Cloudflare-served NyX HTML at **320, 393, 768, 1280 pixels**. Tests actual page clicks, iframe page selector, ZIP file names and content using unzip, add-page edit in normal chat and stored revision handoff. The signed-in session and model reply were simulated locally **only in the browser acceptance test**.
- Published production source is byte-for-byte identical to the passing staging source **after removal of the staging-only protected test route**. Its 13 original bindings are preserved.
- [Production browser check workflow](https://github.com/adeniyipaul174-ctrl/chatgpt-nyx-cloudflare/actions/workflows/nyx-site-project-v3-production.yml) runs against the public live app with synthetic login/AI responses.

## Source paths

- `workers/nyx-site-project-v3.mjs` — planning, multi-page builds, strict HTML/nav, targeted edits and free model backup.
- `ui/nyx-site-project-v3.js` — preview, local navigation bridge, IndexedDB storage, page editing and ZIP exporter.
- `ui/nyx-site-project-v3.css` — responsive NyX Studio controls.
- `workers/nyx-site-project-v3.test.mjs` — project and security regression tests.
- `ui/nyx-site-project-v3-browser.mjs` and `ui/nyx-site-project-v3-served-script.mjs` — browser acceptance, delivered script parser test.

**Deployments:** Production was patched by copying tested live-Worker code, not by deploying the older GitHub root Worker. Do **not** merge unfinished PR #16 or deploy its outdated root Worker over production until reconciled. Keep the version ID listed above for rollback.
