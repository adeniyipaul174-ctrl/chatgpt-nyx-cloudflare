# Running OpenMausBot and NyX agents on GitHub (no VPS)

Updated November 6, 2026. **This is a tested, on-demand GitHub Actions architecture—not an always-on replacement for OpenMausBot's desktop/server process.**

## What passed in live GitHub Actions

- **Original OpenMausBot CLI**: GitHub Actions successfully installed published version `0.1.138`, executed its headless CLI, and launched an isolated loopback-only OpenMausBot server that responded at `127.0.0.1:8799/api/health`. Proof: https://github.com/adeniyipaul174-ctrl/chatgpt-nyx-cloudflare/actions/runs/42271766120
- **NyX portable agent orchestration**: The separate GitHub Actions workflow runs Planner → Writer → Reviewer and emits `result.md` and `result.json` in an Actions artifact. It uses **the actual NyX Cloudflare Workers AI model**, not a paid third-party provider or a permanently running VM.
- **Signed authentication**: The GitHub job requests a short-lived OIDC JWT with audience `nyx-github-agents`; the live NyX Worker verifies its **RS256 signature** against GitHub's public JWKS, issuer, audience, expiration, exact repository ID, exact owner ID, exact branch, and exact workflow path. The endpoint does not accept an arbitrary GitHub token or a browser session.
- The bridge is available on the live NyX Worker at `POST /api/nyx/github-agents/infer`, returning only a model response. A separate `/agents` page remains available for signed-in NyX users to run native agents directly.

## What to run from GitHub

The working feature branch is `feature/openmausbot-integration`. The repository's old default-branch application source is **not** a verified copy of the latest live NyX Worker; do not merge or deploy it as a replacement.

**Submit an on-demand NyX task:** on that feature branch, edit `tasks/nyx-task.md` with a **nonconfidential** request, then commit to the same branch. That push triggers `.github/workflows/github-agents-on-demand.yml`. Open its latest workflow run and download `nyx-github-agents-results` from **Artifacts**. The artifact expires after seven days. The file lives in a **public repository**, so do not commit private data or user credentials.

- `scripts/nyx-github-agents.mjs` — portable Planner/Writer/Coder/Reviewer implementation.
- `scripts/nyx-github-agents.test.mjs` — unit tests for orchestration, request limits, endpoint allowlisting, and redaction.
- `workers/nyx-github-oidc.mjs` — source of the authenticated Cloudflare integration.
- `workers/nyx-github-oidc.test.mjs` — cryptographic and authorization tests.
- `.github/workflows/openmausbot-github-probe.yml` — independently proven CLI/server smoke test.
- `.github/workflows/github-agents-on-demand.yml` — actual GitHub-to-NyX AI task run.

`workflow_dispatch` is also described in the workflow, but GitHub requires the workflow definition to exist on the repository's **default branch** for normal manual dispatch. Here it remains on a feature branch to avoid an unsafe default-branch production build. The **edit-and-push** trigger is the tested one.

## Why the AI calls NyX rather than GitHub Models

**GitHub Models was retired July 30, 2026.** Its old inference endpoint now responds with text `OK` instead of an AI JSON response. See https://docs.github.com/en/github-models. The first GitHub Action implementation using GitHub Models failed and was replaced with the OIDC-to-NyX workflow. No legacy GitHub Models API is needed or used.

## Runtime, persistence, and constraints

GitHub Pages serves **static files only**; it cannot execute the OpenMausBot Node.js server. GitHub Actions does run Linux/Node.js, but GitHub-hosted jobs are ephemeral and limited to six hours per job. This solution is not 24/7 hosting. See https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site and https://docs.github.com/en/actions/reference/limits.

Original OpenMausBot features such as persistent teams, desktop computer control, long-running browser sessions, sign-in credentials, phone pairing, and ongoing routines still require a durable server and engine setup. **Only an isolated CLI/server startup was proven on GitHub**; the original OpenMausBot was not operated as a permanently reachable public app, nor tested with an AI-powered full OpenMausBot conversation. Its source is included separately as a pinned Git submodule in `vendor/OpenMausBot`; the source tree version `0.1.144` was not yet published to npm at the time of this test, so the CLI probe uses the confirmed `0.1.138` release.

The converted NyX agents **do** execute real text tasks through Workers AI. They don't receive a shell, GitHub API write access, a browser or persistent filesystem. The production NyX Worker retains all 13 original bindings and D1 data, and no external paid service was purchased. Both GitHub Actions and Workers AI have usage limits and may not be always available.

## Production deployment and rollback

- Live Worker: `chatgpt-nyx-v3-test`
- Verified active version: `76e2fb6e-8b99-4abb-a13b-419d970f09ce`
- Prior rollback version: `01761bf9-84de-4b93-a2d2-4dbf8b7188fd`
- SHA-256 of deployed JavaScript: `7fdc11bbe9e5d0c185d117680dfbf8cb2dafe2550e2d28a9a1e3ea5e4074900f`
- Public NyX native agent UI: https://chatgpt-nyx-v3-test.adeniyipaul174.workers.dev/agents
- The GitHub OIDC route is not a publicly usable open AI endpoint: it requires a signed token from the exact authorized workflow.

**Do not run `wrangler deploy` from the older root GitHub project or merge draft PR #16 without reconciling it with the current live Worker.** This branch documents the current live integration but does not replace the full production script snapshot.
