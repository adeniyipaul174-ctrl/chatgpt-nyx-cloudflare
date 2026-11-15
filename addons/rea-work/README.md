# NYX Work: REA-only (not live yet)

The branch changes the NYX Work-mode source to show only REA and no AI model, model picker, agent picker, free browser or chat-task composer. Chat and Code remain unchanged.

REA is a reverse-engineering toolkit and CLI, not an AI language model. It returns raw data without a chatbot prompt or model call.

## Work tool

- APK package inspection
- APK signature inspection
- JavaScript/Electron ASAR static analysis
- Upload limit 24 MiB; raw REA responses are limited to 2 MiB by the gateway.

Previous Work chat history is retained for compatibility, but is not rendered in the REA-only Work UI.

## Files

- addons/work-mode/work-pane.html: REA-only Work layout.
- addons/work-mode/work-controller.js: REA-only Work controller with direct authenticated REA calls.
- addons/rea-work/worker-adapter.js: authenticated and owner-gated Cloudflare Worker endpoints.
- addons/rea-work/gateway.mjs: remote Linux REA command runner with restricted actions.
- addons/rea-work/vercel/: separate Vercel Sandbox wake-up service.
- addons/rea-work/work-only.test.mjs: checks Work contains no AI model calls or AI agent controls.

## Current status

Standalone REA 6.9.0 was installed on a Vercel Sandbox named nyx-rea, and the authenticated gateway health check passed locally. The Sandbox was stopped and snapshotted to conserve usage. The Vercel wake service was deployed, but end-to-end authenticated wake and REA analysis have not been verified.

The Cloudflare production Worker still uses its prior source and does not have the matching REA gateway secret. An automated credential update was blocked. This branch is therefore NOT live and Work cannot yet execute REA.

Do not deploy the GitHub repository root over the newer production Worker. Obtain a fresh production source snapshot; merge the Work-only UI and gated routes while preserving the original bindings, Chat, Code, history, and account authentication. Configure matching protected gateway credentials on Cloudflare and Vercel; verify the Sandbox resumes; test uploads and analysis in a preview before deploying.

Chat and Code continue using their configured models. Work itself invokes only REA.
