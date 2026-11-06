# NyX custom in-chat agent picker — production UI release

Published November 6, 2026 to Cloudflare Worker `chatgpt-nyx-v3-test`, serving 100% of traffic.

- **New live Worker version:** `2b340240-2da5-4eac-8d31-607415c55d03`
- **Previous version for rollback:** `e463106f-f313-4706-b1b4-00486cb4032d`
- **Source SHA-256:** `aa41359fbfc9ea48f3be1856c31b78df7d151fb629c75a7bad20629d876e4106`
- **Updated source bytes:** 845012
- **Preserved 13 original Worker bindings**, including Workers AI and D1.
- **Location:** https://chatgpt-nyx-v3-test.adeniyipaul174.workers.dev/

## Design

Replaced the ordinary `<select id="nxChatAgentMode">` in the **normal chat header** with a custom dark-glass mode switcher. The bespoke pill trigger includes a gradient icon, current agent, compact secondary label and animated chevron. An anchored list shows seven agent modes and descriptions, with a selected-state gradient and check icon.

Modes remain `auto`, `off`, `team`, `planner`, `writer`, `coder`, and `reviewer`. The **original native select is retained** as the value consumed by the existing `/api/nyx` chat request. JavaScript keeps the new UI and native select synchronized; without enhancement, the native select remains available as a fallback. The UI stores only the selected mode in local storage. The picker supports pointer selection, arrow keys, Home/End, Escape, focus management, semantic radio menu items, reduced motion and narrow mobile screens.

The UI assets and interaction script are at `ui/nyx-agent-picker-snippet.html`. Automated checks are at `ui/nyx-agent-picker.test.mjs`.

## Safety and release validation

- Updated the **actual live Worker source**, not the outdated root GitHub source.
- Compiled the enhanced UI in an isolated Worker `nyx-agent-picker-design-stage` before deploying.
- Reconstructed the exact original live source from staged code by removing only the UI CSS, client script and header control: byte-for-byte identical to production before this release.
- GitHub Actions `OpenMausBot bridge checks (no deploy)` completed successfully after the UI test and JS parser tests were added.
- Cloudflare accepted the production code-only release; all 13 bindings remained unchanged.
- No chat inference routes, model selection logic, tool permissions, D1 data, or external agent server settings were modified.

This verifies a successful build/deploy and static integration checks. A fully authenticated visual browser test was not available from these tools; users should refresh NyX and inspect the header on their own devices. Prior Cloudflare version is available for rollback if a browser-specific problem is found.

**Do not merge draft PR #16 into the older `main` source or deploy the GitHub root:** that repository checkout does not contain a verified full copy of the current live NyX Worker.
