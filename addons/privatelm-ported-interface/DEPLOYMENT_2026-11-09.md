# NyX AI — PrivateLM UI port (9 November 2026)

## Current production
- Worker: `chatgpt-nyx-v3-test` (this is live production despite the suffix)
- URL: https://chatgpt-nyx-v3-test.adeniyipaul174.workers.dev/
- Active version: `dc267e14-8a7a-4a91-a196-3d74682c129a`
- Active deployment: `2fdb7633-acf8-4719-86eb-274064b0962e`
- Previous stable UI version / rollback: `940772c2-3f12-4aec-a26e-efaa165e640f`
- Base before UI port / alternate rollback: `dd7da766-fa88-4660-b2d3-2eb5392fa329`

## Reference and license
Visual specification: [PrivateLM / cross-platform-llm-client](https://github.com/orailnoor/cross-platform-llm-client), specifically Flutter's `lib/views/chat_view.dart`, `lib/views/home_view.dart`, `lib/widgets/chat_drawer.dart`, `lib/widgets/chat_bubble.dart`, `lib/widgets/home_empty_state.dart` and `lib/core/theme.dart`.

The code is under the MIT License. Copyright (c) 2026 cross-platform-llm-client contributors. A copy is retained at `addons/privatelm-ported-interface/LICENSE` and attribution is available in NyX About/Settings.

This is a web/CSS/JavaScript recreation of the Flutter **interface**, not a copy of Flutter runtime components, and does not change NyX's cloud-hosted AI model, provider routing, or feature backends.

## Changes
- Matched PrivateLM's black / white theme with `#000000` canvas, dark surface `#1c1c1e`, muted `#8e8e93`, blue `#0a84ff`, neutral user bubbles, and unboxed assistant answers.
- Recreated original Flutter mobile Chat app bar (55px, left dual-bar drawer icon and right new-chat pencil), `Chats` drawer (84% viewport width up to 340px), status card, time-aware greeting, and original-style composer. Existing attachment, microphone, and send controls are preserved.
- Matched HomeView's four-icon **bottom navigation**, using the existing functional NyX categories **Chat / Work / Browser / Settings** instead of PrivateLM's offline-specific **Chat / Models / Server / Settings**. They are intentionally not mislabeled as local model features.
- Styled Work and its agent selector to match the same design while retaining all NyX agent and browser actions, including manual approval.
- Matched mobile Settings as a full-height native-like destination and retained all existing settings/account controls and upstream attribution.
- Dark and light modes both styled. The existing login UI was not changed.
- No database migrations, account data edits, model changes, image pipeline changes, API credentials, browser time quotas, or backend routing changes.

## Source files
- `addons/privatelm-ported-interface/privatelm-visual.css`
- `addons/privatelm-ported-interface/privatelm-shell.js`
- `addons/privatelm-ported-interface/LICENSE`

**Important:** The GitHub repository root still contains an old NyX Worker prototype. Never use it to overwrite the live production Worker. Future deployments must start from the active Cloudflare Worker version and retain all existing bindings.

## Checks performed
- Static JS syntax verification before staging and valid round-trip escaping through the existing inline Worker HTML template.
- Cloudflare Worker version upload and deployment accepted; all **13 existing bindings inherited**.
- 390px and 320px viewport live/preview checks: 55px header, 54px bottom tabs, 84% drawer, dark blue send button, black background, functional Chat/Work switching, Work agent selector retained, working sidebar controls, no horizontal overflow.
- Dark-to-light appearance test: white canvas and `#f2f2f7` composer.
- Production mobile Settings tab opens the actual `#nxSettings` dialog, its full-height mobile layout is applied, and closing resets the bottom selected tab to Chat.
- The simulated browser/UI checks do **not** certify signed-in AI inference, live Goodreads browsing, file upload, or cross-device history syncing. Those backend workflows were not altered by this UI-only port.

## Reverting
Deploy `940772c2-3f12-4aec-a26e-efaa165e640f` at 100% through Cloudflare Worker version deployments with all 13 bindings inherited. Do not use the stale GitHub root as a rollback.
