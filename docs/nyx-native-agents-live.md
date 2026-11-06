# NyX Agent Team — Cloudflare production deployment

**Published on 2026-11-06.** This change was applied directly to the current live Cloudflare Worker **`chatgpt-nyx-v3-test`**, rather than deploying the outdated GitHub root checkout.

- Live entry: https://chatgpt-nyx-v3-test.adeniyipaul174.workers.dev/agents
- Active Worker version after upload: `01761bf9-84de-4b93-a2d2-4dbf8b7188fd`
- Previous known good version for rollback: `358a0e94-31c8-4991-815a-7f400a0a782d`
- Original live JavaScript SHA-256: `17b56a337ece8fff4ab09c4ecfabef88cd330328ab6c00275115c066925d0cd9`
- Published live JavaScript SHA-256: `3c63fa85f9a98a1f855363c46559af949a4673c4a69e18671125a967d52ce65e`
- Compatibility date was left as `2026-10-13`.

## Working Cloudflare-native integration

A new **⚡ Agent Team** entry links to `/agents`. The separate page includes Planner, Writer, Coder, Reviewer, and a coordinated Plan → Create → Review mode. Authenticated requests to `/api/nyx/agent-team/run` use NyX's existing Workers AI binding with the same primary model and fast fallback as the main chat. Responses stay in the browser; results are not silently saved. An authenticated `/api/nyx/agent-team/status` endpoint reports capabilities.

The new endpoints reuse the existing `nyxCurrentSession` D1-backed cookie verification, browser request headers, same-origin checks and the existing rate-limit binding. The live Worker's existing database and all **13 bindings were preserved** after the code-only deployment.

Cloudflare accepted and compiled the edited Worker in an isolated staging script before production, then confirmed the code-only production upload and a 100% active deployment. **Authenticated end-to-end browser/inference smoke testing could not be completed from the available tools** and should be done by signing into NyX and running a short task.

The exact independently authored portion extracted from the published code lives at `src/nyx-native-agents-reference.js`. It is a **reference snippet**, not a replacement for the live Worker or a deployable entrypoint.

## Full OpenMausBot remains a separate dependency

The other files on `feature/openmausbot-integration` prepare a full pinned OpenMausBot source submodule, a browser Agent Team control page for an **external hosted OpenMausBot runtime**, and a restricted bridge. That branch's NyX root source is older than the live Worker, so **do not merge it into main or run its Wrangler deploy**. Doing so could erase the current application features.

OpenMausBot's real computer-control, local CLIs, persistent multi-agent runtime, voice, scheduled execution and most app connectors need an independent Node/Linux or desktop server and paired session. It cannot be emulated completely by a standard Cloudflare Worker. The Cloudflare account currently rejects Containers API access because the account needs a **Workers Paid subscription**. No plan upgrade, external server, subscription, or credentials were purchased/configured.

After obtaining a compatible runtime, follow `docs/openmausbot-integration.md` to securely enable the full OpenMausBot bridge. Never expose the upstream loopback-trust port or store session tokens in the GitHub repository.

## Recovery and follow-up

Cloudflare still retains the prior version `358a0e94-31c8-4991-815a-7f400a0a782d` for rollback. If the updated UI fails, restore that deployed version without touching any D1 content. For a future code release, first reconcile the **current live Worker source** with GitHub in a private, tested environment; do not assume the public root is production-current.

### Manual signed-in smoke test

1. Open NyX and sign in.
2. Open **⚡ Agent Team** from the sidebar (or visit `/agents` directly).
3. Select Planner and ask: "Create a three-step outline for a weekly project review." Confirm a response appears.
4. Select Full team and run a small writing task; confirm all three agent sections appear.
5. Return to NyX and verify previous chats, image studio, browsing and account settings still work.

This documents the deployment, not a promise that every possible request or OpenMausBot capability is functioning.
