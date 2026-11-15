# External REA runtime — Vercel Sandbox

Current deployment: Vercel project \`nyx-rea-runner\` in the connected team. The Worker must call the authenticated wake endpoint before reaching the Sandbox port.

The code in \`api/wake.js\` is the intended wake endpoint. The project uses \`@vercel/sandbox@4.0.0\`. It was deployed and the API returned 401 without a bearer token as expected; an authorized end-to-end wake request has NOT been verified.

The named Sandbox \`nyx-rea\` was created and REA CLI v6.9.0 was installed and verified. An authenticated local gateway health check succeeded. The Sandbox was stopped and snapshotted to conserve the free-tier allowance; it can resume on a future request. Snapshot retention is limited.

Vercel Project ID: \`prj_YRfe2wjkamE447ow7NWHOqY4GoZr\`
Vercel production function: \`https://nyx-rea-runner-australian-literary-network.vercel.app/api/wake\`

**Do not publish or commit the gateway token.** To finish a secure production connection, generate a new shared random secret using an approved secrets flow, then set it in both the Vercel runner environment and Cloudflare Worker secret bindings. Also update the Vercel Sandbox gateway environment to the matching secret. The shared secret is not hardcoded in this repository.

Cloudflare Worker configuration required:
- \`REA_GATEWAY_WAKE_URL=https://nyx-rea-runner-australian-literary-network.vercel.app\`
- \`REA_GATEWAY_TOKEN\` (secret, identical to the Vercel token)
- \`REA_OWNER_EMAIL\` (trusted verified NYX owner email in the staging Worker adapter)

Reconcile this add-on with a **fresh live production source snapshot** instead of deploying the older GitHub root. Preserve original bindings, Chat/Code tabs, user data, and authentication. Test signed-in upload, safe artifact types, Vercel wake, analysis, and expiration/resumption in a protected preview before production deployment.

This gateway does not invoke an AI model, but provider restrictions still apply to NYX chat/model responses.
