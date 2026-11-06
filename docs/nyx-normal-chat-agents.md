# NyX Agent Team inside normal chat — production release

Published: **2026-11-06**. Actual live Worker: `chatgpt-nyx-v3-test`.

- Current deployed version: `e463106f-f313-4706-b1b4-00486cb4032d` (Cloudflare confirms 100% traffic)
- Previous rollback version: `76e2fb6e-8b99-4abb-a13b-419d970f09ce`
- SHA-256 of published Worker JavaScript: `9fc467704526a8e13960e944d4ec77b1b86a49bbdcf45e4f7b4e0b8b8150352d`
- Deployed JavaScript size: `831784` bytes
- The previous live Worker source was `826090` bytes with SHA-256 `7fdc11bbe9e5d0c185d117680dfbf8cb2dafe2550e2d28a9a1e3ea5e4074900f`.
- All **13 existing bindings**, including the original D1 database, Browser, Workers AI and secrets **retained**.
- Isolated staging Worker `nyx-normal-chat-agent-stage` compiled successfully; its workers.dev URL was not enabled. The patch was reversed from the staging script to **exactly** match the previous live JavaScript before production upload.

## Usage

Visit [normal NyX chat](https://chatgpt-nyx-v3-test.adeniyipaul174.workers.dev/) and sign in. The existing header has a new mode selector:

- **⚡ Auto** (default): Natural-language tasks like writing an invitation, reviewing a draft, debugging code, and planning projects can invoke a specialist agent automatically; everyday questions stay in ordinary NyX chat. The phrase **"Use your agents to..."** routes a request to the multi-agent workflow.
- **Normal**: Keep ordinary NyX chat, without agent routing.
- **Agent Team**: Explicitly apply Planner → Writer or Coder → Reviewer to the current text task, with the result returned in one normal chat response.
- **Planner**, **Writer**, **Coder**, **Reviewer**: Choose a single specialist for the current chat request.

The selected mode is sent to the existing authenticated `POST /api/nyx` endpoint as `agentMode`. The server runs the existing `nxAgentCall` Workers AI helper only on text tasks once image, web research, browser and attachment flows have had their normal priority. Replies are standard text messages, visibly labeled **⚡ NyX**, stored in the normal conversation using its existing history logic. No extra authentication cookie or additional account is required.

**Try:** `Use your agents to draft and review a professional invitation for an author spotlight.`

## What's included vs. missing

Works: selecting the agent mode from normal chat, automatic text task selection, in-chat single specialists, in-chat multi-agent planning/drafting/reviewing, displaying the combined reply in the same conversation. Server returns `agents` metadata, though the existing UI uses the reply text itself for the badge.

Not included: autonomous shell/desktop control, publishing to GitHub from text alone, automatically accessing outside accounts, 24/7 original OpenMausBot desktop runtime. Original OpenMausBot can run on **ephemeral GitHub Actions** as separately demonstrated, but that is a different system. This release does **not** silently invoke that runtime or claim any computer actions.

The multi-agent option may use 3 Workers AI calls per request plus NyX's existing tool-decision logic, so it is subject to free usage quotas. The reply is a generated draft with critique, not proof that external deployment or actions took place.

## Validation and protection

- Agent selection, ordinary-chat exclusions, project routing, conversation context, and response formatting were validated by GitHub CI `node --test workers/nyx-chat-agent-router.test.mjs`.
- Cloudflare accepted the full live Worker code as an ES module after isolated staging compilation.
- API request authorization, the existing `nyxDecide` tool router, image editing/generation, browser, search, upload handling, and D1 bindings were not replaced.
- No production D1 data was deleted or migrated.
- No manual signed-in browser/inference test was available to the connector; actual feature behavior in a real user session should be smoke-tested.

**Do not merge draft PR #16 or deploy the older root checkout** until the live production source has been reconciled with GitHub. The added, independently authored router code is `workers/nyx-chat-agent-router.mjs`, not a full replacement Worker.
