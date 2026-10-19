# NyX Self-Inquiry Routing Hotfix — deployed 2026-10-19

Cloudflare Worker `chatgpt-nyx-v3-test` now serves version **171**
(`12c3cfab-88a6-4390-b643-c35c8805dc47`).

Rollback point: version **170** (`ff243fcf-7e4a-4df2-8732-bab72c431c28`).
This GitHub branch is an auditable patch record **not** a deployable complete Worker.
Do **not** merge the stale GitHub root Worker directly into live Cloudflare.

## Bug and root cause

Self-referential questions such as "Who are you?" and
"What issues did you have right now?" were being interpreted as public-fact
questions by generic `who`, `what`, and `right now` signals.
The old complaint guard only recognized narrower terms like "search" and "answer."
That mistakenly launched search providers and sometimes ended in a generic
"network error". The network error's underlying provider/transport cause has
not been independently established.

## Narrow fix

- Add `nxIntentIsSelfInquiry()` before automatic research voting.
- Force NyX's own identity, limitations, misbehavior and status inquiries to chat.
- Add `nxIntentExternalServiceStatus()` to ensure public website outages still search.
- Adjust the text AI system instruction to avoid inventing internal diagnostics.
- Preserve all 13 existing bindings, D1, OAuth, MFA, images, search, browsing and quotas.

## Verified

- 38/38 isolated guard tests passed.
- 40/40 browser-run integrated routing tests passed with the current live helper
  functions under deliberately conflicting mocked CHAT/SEARCH model votes.
- Version uploaded and Cloudflare accepted the Worker script.
- 13/13 binding configurations compared and preserved before deployment.
- Version 171 confirmed live.
- Signed-out mobile browser 390px viewport: no horizontal overflow.
- Public health and capability endpoints: HTTP 200.
- Unauthenticated session check: HTTP 200, authenticated:false.
- Unauthenticated account history: HTTP 401 (expected).

## Unverified — launch blockers

- Live signed-in end-to-end AI completion and network resilience.
- Authentication, OAuth/MFA and real user data isolation.
- Live web provider speed/availability, provider billing/quotas, and citation relevance.
- Mobile keyboard/composer behavior while signed in.
- PDF, image generation/editing, exports and all existing features after rollout.

Manual signed-in test:
1. New chat: `Who are you?` — should answer directly, no website status cards.
2. New chat: `What issues did you have right now?` — should discuss known NyX issues,
   without claiming access to private logs or searching unrelated sites.
3. New chat: `What is the current price of a Tecno phone?` — should research.
4. New chat: `Is the NyX AI website down for everyone?` — should research.
5. If a generic `network error` occurs, capture the time, browser network error,
   provider status and Cloudflare request ID; diagnose before launch.
