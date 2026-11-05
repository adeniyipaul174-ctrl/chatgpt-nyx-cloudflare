# NyX — IDA/Hex-Rays reverse-engineering bridge (staged integration)

**Status: code only. NOT deployed, NOT connected to the live NyX AI.**

This addition lets NyX *read and reason over* IDA disassembly and Hex-Rays
pseudocode exports. It does not make Cloudflare Workers capable of running IDA,
execute binaries, or provide a remote Windows desktop. The existing live NyX
Worker is newer than this GitHub repository: **do not deploy the repository
root to production**. Reconcile a verified live-source snapshot before wiring
`bridge/nyx-client.mjs` into the actual AI agent's authenticated tool dispatch.

## Architecture

1. On an isolated, authorized Windows workstation, run your legally licensed
   IDA installation on a binary you are permitted to examine. Never execute
   the binary; IDA's parser itself can still be targeted by malicious files,
   so use a disposable VM and disable network access during analysis.
2. `ida68/ida68_export.py` outputs a local JSON report of at most 300 functions
   with assembly and optional pseudocode. Python 2.7 / IDA 6.8 compatibility
   is **best effort and untested** here; old IDA versions may differ.
3. `ida68/upload_report.py` (Python 3) posts ONLY the JSON report (not IDA,
   the license, or the input executable) to a protected Cloudflare Worker.
4. The separate `bridge/worker.mjs` Worker validates an upload token,
   validates JSON and size, and saves the report in a **separate private R2 bucket**.
   A distinct read token grants a server-side NyX connector access to reports.
5. On live-source reconciliation, NyX can use `bridge/nyx-client.mjs`
   server-side to retrieve a report by ID, mark it as untrusted data, and include
   it in the model's analysis context. The model can explain control flow,
   pseudocode, strings present in the exported functions, and other behaviors;
   it cannot inspect data the exporter did not send.

## Cloudflare staging setup (DO NOT target a live NyX Worker/DB)

* Provision a *new private* R2 bucket named `nyx-ida-reports-stage` in your
  Cloudflare account. Keep public access disabled and configure a retention
  lifecycle policy appropriate for confidential reports.
* Deploy `bridge/worker.mjs` as a separate Worker named
  `nyx-ida-bridge-stage` using `bridge/wrangler.jsonc`. It must have a binding
  named `REPORTS` to the new R2 bucket. This is not part of production NyX.
* Set two separate high-entropy secrets: `IDA_UPLOAD_TOKEN` and
  `IDA_READ_TOKEN`. **Never check secrets into GitHub, reveal them in logs, or
  place them in browser code.** Missing secrets cause all private endpoints to
  reject requests (fail closed). Restrict the Worker using Cloudflare Access
  and rate limits before using it with real data.
* Optional `/health` is the only public endpoint; reports require bearer auth.
  No CORS permissions are returned, and the endpoints do not execute uploads.
* Only after an isolated integration test and review of the up-to-date live
  Worker source, add these server-side variables to NyX as **secrets**:
  `NYX_IDA_BRIDGE_URL` and `NYX_IDA_BRIDGE_READ_TOKEN`. Add a tool route that
  invokes `getReverseReport(env, reportId)` with an authenticated user request
  and passes `renderReverseReportForModel(report)` into the model input.

## On a Windows analysis VM (IDA 6.8)

This ZIP includes `idaq.exe`, `idaq64.exe`, `idaw.exe` and `idaw64.exe` and a
license file. It does **not** belong in GitHub, R2, or any shared deployment.
Verify your license before use. Set the export path, then use IDA's `-A` and
`-S` batch-script options (adjust quoting to your Windows installation):

```powershell
$env:NYX_IDA_REPORT_PATH = 'C:\analysis\nyx_ida_report.json'
& 'C:\IDA68\idaw.exe' -A '-SC:\analysis\ida68_export.py' 'C:\analysis\sample.exe'
```

If the version's `idaw.exe` does not support this invocation, use the locally
installed IDA batch executable and consult its help. Run the exporter in an
isolated test first; this legacy IDAPython API has not been verified here.
Once you have inspected the local JSON file, and configured the bridge:

```powershell
$env:NYX_IDA_BRIDGE_URL = 'https://YOUR-ISOLATED-BRIDGE.workers.dev'
$env:NYX_IDA_UPLOAD_TOKEN = '<configure-locally; do-not-commit>'
python .\ida68\upload_report.py 'C:\analysis\nyx_ida_report.json'
```

The upload returns a report ID. NyX's *future* read tool uses that ID to fetch
and analyze the report. Do not send credentials in chat or client-side JS.

## Local verification

Run `node bridge/test.mjs` from this directory. Tests include upload-token
rejection, read-token isolation, invalid report rejection, persistence roundtrip,
path validation, missing secret rejection, and model-context fencing. These
are mock tests: no live Cloudflare deployment, IDA invocation, or Gemini model
call was made.

## Limitations / security

* Hex-Rays pseudocode is optional. Without a valid decompiler for the selected
  architecture, only IDA's disassembly is exported.
* The Worker does not execute user-supplied binaries, shell commands, or scripts.
* No original executable, IDA license key, or proprietary installer is uploaded.
* Reports may contain secrets or personal data extracted from binaries: only
  upload approved data, review before upload, retain minimally, and restrict
  model-provider access to sensitive content.
* Do not merge this into the live Worker blindly. The repository README warns
  that its older source is not equivalent to the current production Worker.
