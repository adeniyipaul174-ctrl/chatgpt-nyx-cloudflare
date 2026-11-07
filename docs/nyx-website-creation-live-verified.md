# NyX Website Creation — live deployment verification

**Verified:** November 6, 2026.

## Current deployed version

- Worker: `chatgpt-nyx-v3-test`
- Production version: `9f92788c-dba7-4e7e-8a6e-3d8488de6bd2`
- Production SHA-256: `89a3d66209d961309cae63d6dae342de1e2d10187e3f8709dab93da50892c959`
- Deployment traffic: **100%**
- All **13 existing bindings** remain (D1, Workers AI, browser and secrets)
- Public chat URL: https://chatgpt-nyx-v3-test.adeniyipaul174.workers.dev/

## What actually works

When a signed-in user asks **“Create a professional website for ...”** in normal chat, NyX routes the request into its website-building pipeline rather than just writing a plan. The Worker uses its existing Workers AI binding to generate structured business-specific copy and selects from curated palettes. It assembles a **complete self-contained single-page responsive HTML file**, including hero, navigation, images, service cards, about, process, conversion CTA and footer. It does not fabricate paid ecommerce or a hosted backend.

The chat receives `{kind:"website",siteSpec,siteHtml,reply}`, saves HTML as a Blob in existing **browser-local IndexedDB**, creates a result card, and offers:
- A restricted/sandboxed **desktop and phone preview**.
- A complete **downloadable HTML file**.
- Follow-up **design changes in normal chat** using the previous `siteSpec`, generating a revised site.

The implementation was independently confirmed to exist in the current live Worker:
- Backend `nxWebsiteIntent`, `nxWebsiteBuild`, `nxSiteNormalize`, `nxSiteRenderHtml`.
- Active client `nxSiteOpen`, `nxSiteAddCard`, `nxSiteRevisionPayload`, `putBlob` integration.

## Verification

- **PASS — live production Playwright tests:** https://github.com/adeniyipaul174-ctrl/chatgpt-nyx-cloudflare/actions/runs/42290111249
  - Headless Chrome at **360, 393, 768 and 1280px**.
  - Create website, result card, preview, phone switch, HTML download, revise behavior.
  - **Important:** the browser session/auth and AI response were simulated for this UI test. They do not prove a real signed-in user's AI request end-to-end.
- **PASS — staging Playwright tests:** https://github.com/adeniyipaul174-ctrl/chatgpt-nyx-cloudflare/actions/runs/42290087293
- A direct **real Workers AI model invocation** was separately successful for Qwen (structured JSON) and Llama 3.3 (JSON text) in the connected Cloudflare account. That confirms model availability, not a live signed-in website generation request.

### Limitations and cautions

This is a **static one-page site**, not a full-stack development platform. Real checkout, email/contact-form delivery, authentication, membership databases and custom-domain publishing require separate deployment/integrations. Generated images are third-party stock-photo URLs and should be reviewed for fit and licensing. HTML files and drafts are stored in the browser and need downloading for durable copies; sites are **not auto-published**. All text, contact details, CTAs and mobile appearance should be reviewed before publishing.

A separate experimental expanded editor was also implemented during this effort in `workers/nyx-website-builder.mjs`, `ui/nyx-website-studio.js`, and `ui/nyx-website-studio.css`, but it was staged on the **older initial Worker source**. **Do not overwrite production with that staging build or assume the experimental editor is already live.** The public staging subdomain was disabled after testing.

**Release safety:** GitHub `main` remains older than the live Worker. Do not merge draft PR #16 or use its root Wrangler deployment to replace this Worker without reconciling production source. Existing production release is retained by Cloudflare for rollback.
