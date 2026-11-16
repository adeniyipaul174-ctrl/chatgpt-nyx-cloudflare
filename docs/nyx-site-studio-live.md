# NyX Site Studio — production website creation

Published: **2026-11-06**. NyX Site Studio builds real, beautiful **static responsive websites** from a prompt typed directly into ordinary NyX chat. The user can preview the design at desktop/phone sizes, download an HTML file, then ask for revisions without leaving the chat.

**Production Worker:** `chatgpt-nyx-v3-test`
**Active version:** `9f92788c-dba7-4e7e-8a6e-3d8488de6bd2` (100% traffic)
**Previous version for rollback:** `1557c782-83fe-494d-9877-67bb35fb3532`
**Published source SHA-256:** `89a3d66209d961309cae63d6dae342de1e2d10187e3f8709dab93da50892c959`
**Bindings:** all 13 original Cloudflare Worker bindings preserved.

## Using Site Studio in normal chat

1. Sign into https://chatgpt-nyx-v3-test.adeniyipaul174.workers.dev/.
2. Ask: **"Create a premium website for a modern interior design studio called Lumière. Use a soft editorial style."**
3. NyX returns a **website card** directly in the conversation. Open **Preview website** for the responsive page.
4. Switch between **Desktop** and **Phone**, then use **↓ HTML** to download the source file.
5. Click **Edit design**, then type a revision such as **"Improve this website: switch to a darker color palette and rewrite the opening message."** The next request includes the previous structured site design.

The user does **not** need to choose a separate agent mode or open a separate sidebar page. Website requests are detected before normal search/browse/agent routing. "Generate an image of a website" stays an image request.

## Technical architecture

- `workers/nyx-site-studio.mjs` contains a bounded structured-output AI prompt, intent classification, normalization, HTML escaping, HTTPS/mailto URL allowlisting and a deterministic responsive HTML renderer.
- Model: existing NyX Workers AI (primary `@cf/meta/llama-3.3-70b-instruct-fp8-fast`, fallback `@cf/meta/llama-3.1-8b-instruct-fast` for model availability errors).
- Curated styling: five themes (editorial, midnight, ocean, blush, citrus), eight industry-specific photographic categories, strong typography, polished hero, service cards, philosophy, process and CTA sections.
- Generated content is **not inserted as arbitrary model-written HTML**. The model produces limited copy as JSON; only the audited renderer emits HTML and CSS. User/model text is HTML-escaped and links permit HTTPS/mailto or a safe in-page anchor.
- Normal chat endpoint `POST /api/nyx`: authenticates the user, checks request Origin when present, charges the existing chat allowance, invokes the website builder, and returns `{kind:"website",reply,siteSpec,siteHtml}`.
- `ui/nyx-site-studio-client.js` hooks into the current normal-chat composer and message rendering, storing the generated HTML as a browser-local IndexedDB Blob (through the existing NyX local media store). The saved chat message contains only the site ID and structured spec, not a huge HTML data string. Revisions reuse the previous spec.
- `ui/nyx-site-studio.css` styles the site result card and a responsive dark **full-screen preview** with device toggles.
- The preview uses `iframe sandbox=""` and `referrerpolicy="no-referrer"`, so generated content cannot run scripts, access NyX session data or submit forms from the preview. The browser export is ordinary, editable HTML.

## Tests and validation

- `workers/nyx-site-studio.test.mjs`: intent checks, protection against accidental image-tool hijacking, HTML/script escaping, URL sanitization, all five themes and eight content categories, AI mocked output.
- [Passing security and generator tests](https://github.com/adeniyipaul174-ctrl/chatgpt-nyx-cloudflare/actions/runs/42289257860).
- [Passing isolated staging browser test](https://github.com/adeniyipaul174-ctrl/chatgpt-nyx-cloudflare/actions/runs/42289800600).
- [Passing **live production** browser test](https://github.com/adeniyipaul174-ctrl/chatgpt-nyx-cloudflare/actions/runs/42290111249) on the real NyX web page at 360, 393, 768 and 1280px. It verifies create → preview → phone view → HTML download → revise and that the previous design is carried in the next chat request.
- Production and staging builds were compiled by Cloudflare; production deploy confirms all **13 bindings preserved**.

**Test boundary:** Browser acceptance simulates only the signed-in UI response and model reply. It does not use the owner's credentials, consume live site-generation tokens, or prove that every production AI request will succeed. Separate prior GitHub OIDC tests verified actual NyX Workers AI inference.

## Real capabilities and current limitations

Site Studio currently builds elegant **single-page, static, responsive HTML websites** (business marketing websites, portfolio pages, creative studios, launch/landing pages). Exports can be edited or hosted on any ordinary static host.

This is **not** a complete authenticated e-commerce application, CMS, database-backed website or a production payment gateway. A live booking system, functional contact-form delivery, checkout, custom domain, hosting or server-side features require separate configuration; Site Studio does not secretly publish or connect those services. CTAs without a genuine user-supplied destination fall back to `#contact`. Model-generated content should be fact-checked before publication.

Exported HTML includes CSS inline, but uses online Google Fonts and curated Unsplash image URLs; those visual assets need internet connectivity and should be replaced/licensed as appropriate before production use. Generated files and previews are stored **locally in the browser's IndexedDB**, not distributed through the user's cloud history; users should download their work to preserve it, especially when switching devices or clearing storage.

## Deployment safety

The feature was compiled in isolated Worker `nyx-site-studio-stage` and published by a code-only update to **the actual current live Worker**, not by deploying the older GitHub repository root. All 13 binding names/types were preserved. The previous live deployment is retained for rollback.

Keep existing draft PR #16 unmerged until the root GitHub source is reconciled with production. Merging the outdated root could overwrite the newest live NyX features.
