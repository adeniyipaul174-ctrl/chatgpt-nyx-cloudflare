CHATGPT NYX — V3 SECURITY / CLOUD-STATE CANDIDATE
=================================================

Status
------
This is an UNDEPLOYED test candidate with the original text-PDF export capability restored. It does not change the existing production Worker or AppDeploy app. The Wrangler name is chatgpt-nyx-test, intentionally different from production.

Implemented in this candidate
-----------------------------
- Cloudflare Access JWT verification in the Worker (RS256 signature checked against Cloudflare Access JWKS, issuer, audience, expiration, not-before, and optional email allowlist).
- Authentication before origin validation, body parsing, database access, and quotas for API requests. /health is intentionally public; OPTIONS is preflight-only.
- Exact allowed-origin checks, same-origin support, restrictive security headers, bounded streaming request body (12 MiB), sanitized provider errors, 45-second Gemini timeout.
- Provider failure classification, model finish/safety/truncation handling, no provider error details or credentials in logs.
- D1 schema for user-scoped chats, memories, tasks, settings, and daily usage quotas. Query patterns include user_id in reads, updates, and deletes.
- Server-backed history, memories, tasks, settings, export; memories/tasks import (chat import deliberately omitted until validation is implemented).
- Basic task route classification, relevance-ranked memory selection, untrusted-data fencing, and an actual three-call plan → answer → verify workflow in deep mode.
- Separate static frontend JS, DOM-node rendering for dynamic content, retry-on-failure, status UI, server-backed state.
- Text chat, image attachment analysis through chat, Image Studio generation, image analysis, PDF text extraction and analysis, native PDF creation/download, JSON export.

Tests run locally
-----------------
Run:
  npm test
  npm run check

The test suite generates local RSA-signed JWTs, checks issuer/audience/expiry/signature/algorithm/email allowlist, tests origin/body/error/routing/retrieval helpers, and uses Python's built-in SQLite engine to execute the actual migration and exercise tenant-scoped SQL isolation and constraints.

IMPORTANT LIMITATIONS / SETUP REQUIRED
--------------------------------------
1. No deployment has been done and no live Gemini API request has been verified.
2. Create a NEW D1 database for the test Worker. Replace REPLACE_WITH_TEST_DATABASE_ID in wrangler.jsonc with that test database's ID, then apply migrations to the test DB only.
3. Set Worker secrets:
     npx wrangler secret put GEMINI_API_KEY
     npx wrangler secret put CF_ACCESS_TEAM_DOMAIN
     npx wrangler secret put CF_ACCESS_AUD
   CF_ACCESS_TEAM_DOMAIN should be the full issuer base such as https://your-team.cloudflareaccess.com. CF_ACCESS_AUD is the Access application's exact AUD tag.
4. Configure a Cloudflare Access application and policy for the entire test hostname. Keep it private. Optionally set NYX_ALLOWED_EMAILS to comma-separated permitted email addresses. The Worker also verifies the JWT, so Access is not the only validation layer.
5. Set NYX_ALLOWED_ORIGINS only if the frontend is hosted on a different origin. Keep it empty for same-origin frontend hosting.
6. Per-minute and daily request quotas are scoped to each authenticated user and enforced atomically in D1. Provider costs are per Gemini call; deep mode uses three calls per user request. Set NYX_DAILY_REQUEST_LIMIT and NYX_PER_MINUTE_REQUEST_LIMIT conservatively during tests.
7. No Cloudflare rate-limiting rules have been provisioned by this source package. Add Cloudflare rate limiting for /api/* before any broader release. D1 daily quotas are not a substitute for edge rate limiting against bursts.
8. Live web search is not implemented. Do not describe it as available.
9. PDF.js is loaded from a CDN without a pinned SRI hash in this candidate; review/self-host before production. Scanned PDFs need OCR, not included. PDF creation is restored using a dependency-free PDF writer and supports basic Helvetica text layout; unsupported Unicode characters are simplified.
10. Import supports chats, memories, and tasks with validation and new server-generated IDs; settings from exports are not automatically imported. Export contains chats, memories, tasks, and settings.
11. This is a single-user-first Access-gated app but the database schema is multi-tenant. Verify the Access application policy and allowed email list before using personal data.
12. The Worker cannot prove actual Gemini model access from the status endpoint. It only reports configuration.

Deployment safety
-----------------
Do not deploy to the production Worker. First run local tests, create an isolated test D1 database, configure Access on a separate test hostname, deploy only under the chatgpt-nyx-test Worker name, and run manual browser smoke tests. Do not reuse the production Worker name, D1 database, or secrets until the test candidate passes review.
