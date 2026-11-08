# NyX AI Browser — what is actually free

This directory contains two distinct browser approaches. **Neither creates an unlimited free cloud-hosted browser.** Do not describe them as interchangeable.

## 1. Deployed NyX Free AI Browser (phone and PC)

Live page: https://chatgpt-nyx-v3-test.adeniyipaul174.workers.dev/ai-browser

The live NyX Cloudflare Worker imports the code from `server-addon.js` and serves `page.html` to authenticated users. It uses the existing `BROWSER`, `AI` and `NYX_DB` bindings without new paid browser credentials.

Features: AI-directed navigation, click, type, scroll, page reading, visible task history; Cloudflare Live View; Pause, Resume, Stop and manual control.

Safety and cost controls:
- Explicit consent before launching.
- Uses **Cloudflare Browser Run**, not the paid Browser Use API.
- Cloudflare Workers Free includes **10 browser-minutes/day across the account** (other NyX browser requests share that allowance).
- NyX permits one new session per user per UTC day with a 120-second application timeout and 12 AI steps; additional account-level checks reserve free time.
- Browser sessions and Workers AI requests are still subject to Cloudflare account limits, model capacity and availability.
- Public HTTPS navigation only; private addresses and sensitive-looking form actions are blocked or require manual takeover.
- The Live View URL grants browser control; it must be kept private.
- The runtime checks are best-effort; browser sessions also have provider inactivity timeouts. Users should explicitly press **Stop browser** when finished.
- The interface and protected APIs were publicly smoke-tested. **Authenticated live browsing and real multi-step AI tasks have not been end-to-end tested**, so treat this as beta and report errors.

## 2. Unmetered browser on your **own computer** (optional)

Use `local_browser.py` for a local, open-source browser agent using **browser-use + Ollama**. This has **no hosted-browser minute cap and no paid model API requirement**. It does not mean infinite compute, perfect browser performance or unlimited network access: your PC, electricity, RAM and the websites themselves are the limits.

Requirements: Windows, macOS or Linux PC; Python 3.12; Chrome/Chromium; Ollama running; preferably at least 8 GB RAM (16 GB or more strongly recommended for an 8B model).

1. Install [Ollama](https://ollama.com/download) and ensure the service is running.
2. Install the local model: `ollama pull llama3.1:8b` (approximately 5 GB download).
3. Install [Python 3.12](https://www.python.org/downloads/).
4. Install browser-use following its [open-source instructions](https://github.com/browser-use/browser-use): `python -m pip install browser-use`. If Chromium is missing, use the browser-use install instructions for your platform.
5. Download this directory. From it, run:

```bash
python local_browser.py "Open Wikipedia, find information about pangolins and summarize the sources"
```

A desktop Chrome window opens. The local agent automates it. In the console, **p** pauses the agent for manual control, **r** resumes, and **s** requests stop. These controls depend on browser-use's installed version; confirm they function before using accounts or sensitive pages.

**Important:** This local companion is not connected automatically to your hosted NyX chat. Running it requires a computer you control; simply visiting the NyX website on an Android phone cannot launch a browser on your absent/offline PC. To watch or operate the desktop from Android, use a remote desktop app you trust.

The open-source browser-use library supports local Ollama models: https://github.com/browser-use/browser-use/blob/main/examples/models/ollama.py

## Development and deployment warnings

**Do not deploy the GitHub repository root over the live NyX Worker.** The root project is an older prototype, whereas the complete production Worker was taken from the current Cloudflare Worker source, patched minimally, compiled and deployed through versioned Cloudflare API calls with all existing bindings inherited.

The Free Browser Agent uses only existing authentication and requires same-origin checks for POST actions. For stronger production guarantees, add authenticated browser-session regression tests, robust provider error handling, cleanup scheduling, consent audits, anti-prompt-injection testing, and per-account quota telemetry.

Rollback reference for this release: Cloudflare Worker version `642eb284-10c5-48c1-8293-8f3206878257`. Active version at time of final release: `23ba4d44-34e9-490f-a8c3-1ff0db741132`.
