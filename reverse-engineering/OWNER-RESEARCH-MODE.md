# NyX: owner-only research mode (staged, not live)

## What was implemented

A mode in NyX Settings for the **authenticated account owner**, designed for direct technical testing, file reverse engineering, programming, debugging, and permitted security research. Owner mode asks the model to avoid unnecessary blanket refusals and stock lectures. It does **not** override Google Gemini provider restrictions or bypass authentication, quotas, or file sandboxing.

This work is staged on `feature/nyx-ida-reverse-bridge`, NOT deployed to a live Worker. The repository's root Worker is an old snapshot; see `README.txt`. Do not deploy it over `chatgpt-nyx-v3-test` or reuse the live D1 database.

## Identity and authorization

- Cloudflare Access provides an RS256-signed JWT, validated before any application logic.
- Server code uses the **verified** JWT email (not an editable client value) and compares it exactly, case-insensitively, against the privately configured `NYX_OWNER_EMAILS` secret.
- If no `NYX_OWNER_EMAILS` is configured, owner mode is disabled for everyone.
- Only an owner sees the Settings checkbox. The API rejects non-owner attempts to enable it, and chat re-checks ownership against persisted settings on every request.
- The switch is off by default and stored in the existing user-scoped D1 settings row. No database migration is required.

## After a separate preview Worker has been created

1. Retrieve and reconcile the actual live NyX source into an **isolated** preview environment, preserving all the latest live features. Use a separate test D1 database.
2. Apply these changes to that reconciled source, not by deploying the outdated repo root.
3. Add the owner email using the isolated Worker's **secret management**, for example:
   ```bash
   npx wrangler secret put NYX_OWNER_EMAILS --name YOUR_ISOLATED_WORKER_NAME
   ```
   Enter the owner's exact verified Cloudflare Access email at the interactive prompt. Do not commit the email, token, or secret to a public repository.
4. Keep a Cloudflare Access policy that restricts login to the intended account and check the JWT audience and issuer. Test that the verified owner alone sees the checkbox in Settings.
5. In Settings, enable **Owner research mode**, save, and test chat using normal reverse-engineering prompts (including uploaded `.so` files).
6. Verify the mode is absent for a different logged-in account. Check API calls attempting `ownerResearchMode:true` from a non-owner receive HTTP 403. Verify chat cannot activate owner mode from a request-body flag or fabricated email.
7. Verify normal mode remains unchanged when the owner switch is off. Confirm the model still reports actual execution/tool limitations.

## Testing

```bash
npm test
```

Includes `node --test tests/owner-research-mode.test.mjs`.

## Limitations

The current static ELF/PE inspector reads format metadata, imports and strings, not full machine-code semantics. Full decompilation requires a configured Ghidra or licensed IDA runner; the existing bridge and development code are separate from the live app. No model provider can be guaranteed to honor a no-refusal instruction for every imaginable request.
