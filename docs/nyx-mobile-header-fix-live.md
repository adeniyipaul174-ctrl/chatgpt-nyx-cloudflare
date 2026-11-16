# NyX mobile header repair — November 6, 2026

This release corrects the agent selector header overflow reported with a real Android screenshot. The earlier design allowed the agent button and header actions to wrap vertically and collide with the top edge of the app.

**Cloudflare production Worker:** `chatgpt-nyx-v3-test`
**Active version:** `b1da5788-acec-40bb-9497-310548ed699b`
**Previous version for rollback:** `2b340240-2da5-4eac-8d31-607415c55d03`
**Full script SHA-256:** `0666780f73a558a20bd5ceac5e8ca61bb965a1c36304d86710554a1da3b0edb5`

## Changes
- Fixed the header's two direct children to use flex with no wrapping; prevents the action group from splitting into multiple rows.
- Compacted the hamburger, logo, agent selector, Settings and New Chat controls at mobile widths 700px and below, with an additional narrow-screen rule at 350px.
- Positioned the dropdown below the header, inset from both screen edges, with a capped height and internal scroll.
- Overrode an inherited `.top button {display:inline-flex}` rule that previously caused seven menu choices to overflow horizontally. The menu choices now stack vertically.
- Removed the inappropriate purple styling from the selector in favor of NyX's existing charcoal/silver and limited pink accents.
- Preserved the original `#nxChatAgentMode` select, agent-routing request field, and all existing normal-chat behavior. **Only one additional CSS block was inserted into the current live Worker.**

## Verification
- Created a representative mobile header fixture and rendered it with headless Chromium at widths 320, 360, 393, 412, 700, and 768px.
- Header controls fit inside all tested mobile widths and remain vertically aligned. With the menu open, the horizontal document scroll width equals viewport width in these fixtures.
- Compiled the exact change against an isolated Cloudflare Worker before updating production.
- Verified byte-for-byte reconstruction of the prior production source by removing only the added `<style>` block.
- GitHub Actions `OpenMausBot bridge checks (no deploy)` passed after adding CSS regression checks.
- Production Worker deployment confirmed at 100% traffic with all 13 bindings preserved.

Source of truth for the fix: `ui/nyx-mobile-header-fix.css`. UI snippet includes earlier visual styling: `ui/nyx-agent-picker-snippet.html`. CSS regression test: `ui/nyx-mobile-header-fix.test.mjs`.

**Not verified:** A browser session authenticated as the user on their particular Android device. If the new styles do not display after a refresh, verify a fresh page load and device-specific browser behavior.

**Release safety:** GitHub `main` contains an older root Worker source. Do not merge PR #16 or redeploy its root Worker; this CSS change was safely applied directly to the live Cloudflare source, not by copying the outdated root over production.
