# NYX Work: REA integration (staged, not deployed)

This add-on exposes **authorized** reverse-engineering tasks to NYX Work without replacing any existing chat/coding functionality. It is not yet installed in the live NYX Worker. The repository-root Worker is older than the production Worker, so do **not** deploy the repository root over production.

## Files

- \`gateway.mjs\`: authenticated Node.js gateway, to be hosted separately on your Linux server. It invokes the official REA CLI with fixed, allowlisted commands and no shell.
- \`worker-adapter.js\`: optional API route adapter for the existing authenticated NYX Worker: \`/api/work/rea-upload\` and \`/api/work/rea-analyze\`.
- \`work-panel.js\`: opt-in UI to mount inside the Work panel, without changing current Chat/Code navigation.

## REA requirements

Use the official [morluto/rea](https://github.com/morluto/rea). The checked 6.9.0 package requires Node.js ^22.23.4, ^24.22.1 or >=26.12.1. For example, install Node.js 24.22.1 or newer in the 24.x series, plus \`procps\` on Linux. Then install the verified \`rea-agents@6.9.0\` package and run \`rea --help\` to verify. APK analysis also requires full JDK and headless JADX per the upstream REA Android documentation; APK signature inspection does not require JADX. This repository does not redistribute REA or download third-party binaries for you.

## Run the separate gateway

Choose your own Linux VPS, isolated machine, or another supported container provider. **Do not** point NYX at an arbitrary public REA server.

1. Install and verify REA, Node.js, and any optional analysis providers.
2. Copy only \`addons/rea-work/gateway.mjs\` to the private host.
3. Create an isolated non-root Unix user and a private workspace for analysis. Do not grant it access to NYX secrets, home directories or production assets.
4. Configure the environment **in a secret manager or protected service configuration** (not in GitHub):

   - \`REA_WORKSPACE=/srv/nyx-rea/workspace\`
   - \`REA_GATEWAY_TOKEN=\` a newly generated random secret of at least 24 characters
   - \`REA_BINARY=rea\`
   - \`HOST=127.0.0.1\`
   - \`PORT=8789\`

5. Run \`node gateway.mjs\` under a supervisor with process and memory limits.
6. Serve the local port behind a secure, HTTPS-only reverse proxy that requires authentication and controls egress. Never expose port 8789 to the Internet.
7. Verify \`GET /health\` through that authenticated proxy.

## Wire into *live-source snapshot* of NYX

1. Retrieve and back up the **deployed** Worker script and all current bindings first.
2. In the deployed source's authenticated Work route, import \`handleReaWorkRoute\` from \`worker-adapter.js\`. Call it only after validating the existing signed-in NYX user. Pass \`{userId, isOwner}\` with \`isOwner\` from trusted server-side account settings, **never** from the request body. Return the response when non-null.
3. Add **secret** values \`REA_GATEWAY_URL\` (the private HTTPS gateway origin) and \`REA_GATEWAY_TOKEN\`; do not include them in frontend assets or commit them. Ensure any previews get **separate** secrets and separate analysis workspaces.
4. Mount \`mountReaWorkPanel(root)\` from \`work-panel.js\` only inside your chosen Work tool area, not within normal Chat.
5. Test a small benign test APK / ASAR in an isolated preview. Ensure authentication, ownership, missing-runner failures, file upload, actual REA analysis, cancellation, preserving Chat/Code functions and 13 existing bindings. Keep a rollback of live Worker version and D1 data backup. Do not deploy until these pass.

The current live NYX UI has Chat and Code bottom tabs; this PR does **not** silently reintroduce a third Work tab. To make Work a separate top-level mode, the live UI/controller must be deliberately updated while preserving existing features.

## Your own instructions vs. model-provider restrictions

REA is a tool, **not** an AI model and has no chatbot content policy of its own. The standalone REA CLI executes these analysis operations without sending a prompt to a model. NYX Work can pass the resulting structured evidence to any model selected by your project.

You can change NYX's own prompts and model routing. Removing a restriction enforced by an upstream hosted model is not something this integration can guarantee. For independently configured model behavior, connect an authorized self-hosted open-weight model through NYX's model router. That is separate from this REA gateway.

## Boundaries & limitations

- \`/v1/upload\` accepts only \`.apk\` and \`.asar\` up to 24 MiB. Analysis endpoint accepts only the three fixed actions \`apk\`, \`apk_signature\`, \`javascript\`; no arbitrary commands or arbitrary host paths.
- Maximum JSON Evidence returned is 2 MiB; complex REA output needs separate persisted Evidence and paging in a future version.
- HTTPS authentication, app authentication, owner gating, upload size, filesystem confinement and timeouts are defense-in-depth; full hostile-artifact isolation still depends on your OS/container sandbox and least-privilege configuration.
- Work panel currently displays raw structured results. Natural-language summaries and AI model selection require wiring into the live model router.
- Cloudflare account Containers access was denied by API, which reported that Workers Paid is required. Therefore this add-on uses an external Linux REA gateway and does not claim Cloudflare Containers are running.

This is a staged integration skeleton intended for review and testing, **not** a working live deployment.
