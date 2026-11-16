# NyX + OpenMausBot integration (isolated feature branch)

This integration imports the **full pinned OpenMausBot Git repository as a submodule** and exposes a deliberately restricted **remote-agent bridge** in the NyX Cloudflare Worker. It does **not** convert OpenMausBot's Node/desktop runtime into a Cloudflare Worker and does **not** automatically start or deploy an agent server.

## Source and license

- Upstream: https://github.com/milind-soni/OpenMausBot
- Pinned upstream commit: `e8dc6cfccabbb499e4ded16c07b462a466460ecc`
- Checkout (including all source files): `git submodule update --init --recursive`
- Upstream `LICENSING.md`: most code is Apache-2.0, but **`enterprise/` has a separate license requiring a production license for those features**. Upstream names/mascot are protected trademarks. Read the upstream `LICENSE`, `LICENSING.md` and `NOTICE` before redistributing or hosting. This integration **does not grant a license** or enable licensed enterprise functionality.

## What is actually implemented

NyX **Agent Team** now has three explicit, authorized operations against your own separately hosted workspace:

1. View agent names via `GET /api/bots?messages=0`.
2. Send a task to a chosen agent via `POST /api/bots/:id/messages`. This requires a visible confirmation in the browser.
3. View recent plain-text messages via `GET /api/threads/:id/messages?limit=30`.

The bridge sends no approvals, engine settings, bot creation, shell commands, arbitrary HTTP paths, or secrets to the browser. OpenMausBot owns approvals and computer access. These endpoints rely on upstream's published HTTP API and should be smoke-tested against the pinned build.

The existing NyX Gemini chats, D1 history, memories, image generation, document features, and Cloudflare Access authentication are unchanged. NyX does **not** route ordinary AI chat messages to OpenMausBot automatically.

## Set up the external OpenMausBot runtime first

OpenMausBot requires a Node/Linux/desktop environment outside Cloudflare Workers, for example an appropriately secured VPS or private machine:

1. Use the upstream's supported [self-hosting instructions](https://github.com/milind-soni/OpenMausBot/blob/main/docs/self-hosting.md), e.g. `npx openmausbot start` on a server with Node 24+ and configured agent engines.
2. Protect the server behind HTTPS and its built-in pairing/session authentication, using the upstream's managed tunnel, your own reverse proxy, or private network as appropriate. **Never expose an unprotected loopback-trust port**.
3. Pair a dedicated client session using the upstream's documented `openmausbot connect https://your-agents.example --code YOUR_CODE --out ~/.openmausbot-nyx-token` flow. A client-scoped, revocable session is preferred. Keep the token private.
4. Configure the following **secrets** only in a separately staged NyX Worker. Do not commit values or put them in `wrangler.jsonc`:

   - `OPENMAUSBOT_URL` = the public HTTPS origin of the secured workspace (no path, query, embedded user/password, custom port or IP literal).
   - `OPENMAUSBOT_TOKEN` = the paired session's token. Never send a workspace-owner token to the browser.
   - `OPENMAUSBOT_ALLOWED_EMAILS` = a comma-separated explicit allowlist of Cloudflare Access verified email identities permitted to operate this connected workspace. There is **no implicit open access** if the list is missing.

5. Check that your Cloudflare Access policy also allows only trusted users. A login to NyX is not a separate OpenMausBot account; every listed email operates the *same* configured agent workspace. If that is unsuitable for multiple users, provision a user-scoped design instead.

## Safety properties

- The Worker requires a verified Cloudflare Access JWT and allowed origin before any bridge operation.
- A separate email allowlist gates the privileged shared OpenMausBot session.
- HTTPS is mandatory. Redirects are rejected (so the bearer token is not sent on a redirect); outbound paths are fixed, IDs are validated, responses are size-limited, and browser-visible records are reduced to text and safe IDs.
- No browser API can configure the upstream URL or token.
- Secrets and upstream provider errors are not returned to the browser.
- Sending a task still carries real agent-execution risk and may incur provider/computer costs; keep OpenMausBot approvals enabled and limit what its engine can access.
- The bridge uses short request timeouts; queued, slow or long-running agent work should be followed through OpenMausBot itself. The message viewer is a lightweight text-only snapshot, not a replacement for approval cards or full transcripts.

## Verification before production

From the NyX repository, check that the pinned submodule is available, then run:

```sh
git submodule update --init --recursive
npm test
npm run check
```

Test in an **isolated preview or test Worker** with a separate D1 binding and a dedicated Access application. Confirm the authorized-email boundary, API responses from an actually running OpenMausBot workspace, task sending/approvals, and no credential leaks. A configured URL alone is not proof that the bridge works.

**Production deployment is intentionally out of scope.** The repository's `README.txt` warns that the source on `main` is not a verified snapshot of the newest live NyX and that a root-level `wrangler deploy` may overwrite live functionality. Do not merge this branch or change the production Worker until the live code and deployment target have been reconciled and tested.
