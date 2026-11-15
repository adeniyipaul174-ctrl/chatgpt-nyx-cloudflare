# NYX REA-only Code — live deployment

## Live state (2026-11-15)

- Production Cloudflare Worker `chatgpt-nyx-v3-test` is serving version `60177e6d-e87e-4682-a050-d51057bd8ceb` at 100%. This version contains `nxReaCodeOnlyScript`, `nxReaOnlyRoute`, and a guard that blocks `nyxCode:true` calls to the prior coding model.
- The existing Cloudflare bindings were preserved. There are now 14 bindings, including the new secret `REA_GATEWAY_TOKEN`. The live UI uses REA only in Code, while normal Chat retains its existing AI models.
- The Vercel `nyx-rea-runner` production wake endpoint is deployed and authenticated. The persistent `nyx-rea` Sandbox runs REA 6.9.0 and an authenticated gateway.
- End-to-end analysis test against the isolated backend passed: a 624-byte valid Electron `.asar` upload returned HTTP 200, and `analyze-javascript-application` returned HTTP 200 with structured REA evidence.
- The signed-in end-user Code UI was not independently tested from a browser session. Verify with a signed-in owner account.

## Roles of files

- `live-code-ui.html`: code injected into a fresh snapshot of the *already deployed* production Worker to replace its Code chatbot with a direct APK/ASAR analysis interface.
- `live-code-route.js`: protected Worker upload/analysis endpoints. Requires authenticated, verified NYX owner and server-only shared bearer token. No language-model calls.
- `gateway.mjs`: isolated Linux gateway with allowlisted REA commands, file size limits, bounded results, and workspace confinement.
- `vercel/`: authenticated Vercel Sandbox resume service and runtime source.
- `../work-mode/`: modular older-layout REA-only Work implementation retained on this branch; it does not represent the exact currently deployed UI.

## Important operational notes

- **Do not deploy the older repository-root `src/index.js` over the live Worker**; it lacks newer production features. The actual live deployment was patched directly from its then-active production source, preserving existing bindings.
- The Vercel Sandbox is a metered resource with a finite session timeout. The resume endpoint uses the Vercel SDK to restart the gateway when the Sandbox is stopped. A cold start after a later automatic stop was not yet independently tested.
- The live Code panel supports `.apk` and `.asar` files up to 24 MiB. The raw REA response limit is 2 MiB. Some Android analysis functions may require additional tools such as JADX and JDK; the successful end-to-end test was for Electron ASAR.
- REA is **not** a conversational AI model; it does not respond to general chat messages. Its raw evidence is not sent to any Chat or Code language model.

See Vercel project `nyx-rea-runner` and Cloudflare Worker `chatgpt-nyx-v3-test` for production state. Never expose or commit the shared gateway token.
