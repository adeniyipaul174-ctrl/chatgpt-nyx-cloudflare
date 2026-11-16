# NyX in-chat Agent Team — live acceptance and final fixes

Date: 2026-11-06. Current Cloudflare production Worker: `chatgpt-nyx-v3-test`.

## Verified live deployment
- Active Worker version: `3835573f-61c0-4596-be5d-8b92300850f8` at **100%** traffic.
- Prior rollback version: `63dabfaa-2e1a-43a3-9349-84d5d87132ed`.
- Live Worker JS SHA-256: `2cb200d195ee3a5be15086c8c7b5420eeaa03e81b8faffd7f044a41e52832e43`.
- All **13 original bindings** preserved, including Workers AI, D1, browser and existing secrets. No production database mutation for testing.

## Real browser acceptance

**PASS** [GitHub Actions acceptance run 42284292054](https://github.com/adeniyipaul174-ctrl/chatgpt-nyx-cloudflare/actions/runs/42284292054). The test connects to the **live public NyX HTML**, creates a *synthetic login response only inside its browser*, and stubs model replies. It does **not** bypass server-side session checks or use an actual user's credentials.

Checks:
1. Live `GET /api/health` responds successfully.
2. Unauthenticated real `POST /api/nyx` returns HTTP 401.
3. Actual deployed UI is rendered in headless Chrome at widths **320, 360, 393, 412, 700, 768, 1024px**.
4. Navigation, logo, agent trigger, Settings and New Chat stay on one row, without page horizontal scroll or clipped controls.
5. The custom mode menu stays within the viewport, displays all **seven** choices as separate vertical rows.
6. Each choice synchronizes the original native mode `<select>`, the visible control and `localStorage`.
7. Extra-long selected names never overlap the chevron or Settings button, including at 320px and 393px.
8. Selected mode survives a page reload; Escape closes the menu.
9. All seven modes are carried in the normal chat's `/api/nyx` request JSON.

Source: `ui/nyx-live-acceptance.mjs`; read-only GitHub Action `.github/workflows/nyx-live-acceptance.yml`.

## Backend verification

- In addition to normal chat UI tests, a live **3-step Planner → Writer → Reviewer** inference [completed](https://github.com/adeniyipaul174-ctrl/chatgpt-nyx-cloudflare/actions/runs/42283432593) through GitHub OIDC and the existing NyX Workers AI.
- A separate, actual **Coder** inference [completed](https://github.com/adeniyipaul174-ctrl/chatgpt-nyx-cloudflare/actions/runs/42283442316), with saved result artifact.
- Normal chat routing helper tests passed, including specialized agent selection and multi-agent orchestration.
- Specific selected agents now take precedence over automatic **search/browse** for text tasks, but existing image flow remains ahead of agents, preserving media creation.
- Automatic mode still uses its conservative task classifier, leaving ordinary conversation as NyX.

## Fixes made during acceptance

The first redesign had a two-row header and a horizontal menu bug on mobile. Both were fixed. The stricter subsequent test caught a label collision for “Agent Team” at 393px. The visible trigger now shows **Team** or **Review** on compact displays, while the menu and accessible labels retain **Agent Team** and **Reviewer**. Long labels have overflow/ellipsis protection. The updated live Chrome acceptance passed all checks.

## Limitations

The browser test uses a synthetic local sign-in response, not a real signed-in account. It cannot prove every production user's D1 session, personal chat history or paid external connectors work. The **model's live inference** is separately verified via GitHub's signed OIDC channel, not by sending a real `/api/nyx` request with an actual account. OpenMausBot's full desktop/computer-control runtime is not part of these Cloudflare-native chat agents and is not hosted persistently on GitHub Actions.

Never merge the older GitHub root Worker onto production without reconciling it with the live Cloudflare source. The deployed Worker itself has a retained rollback version.
