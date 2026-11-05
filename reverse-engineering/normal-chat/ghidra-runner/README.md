# Optional private Ghidra headless runner

For full pseudocode extraction (rather than fast PE/ELF/Mach-O/WASM triage),
NyX can call this service automatically while responding in **normal chat**.
The runner is **not deployed**; no server or valid Ghidra installation was
provided. It does not use the uploaded IDA Pro or Hex-Rays installation.

1. Install an official, legitimate Ghidra release on a low-privilege disposable
   Linux VM or container; verify the version's Java requirement and the
   `analyzeHeadless` path. Ghidra is available from https://ghidra-sre.org/ .
2. Isolate the VM: no privileged mounts, no sensitive host files, limited CPU,
   memory, disk and time, and no outbound networking for the Ghidra process.
3. Set `NYX_REVERSE_RUNNER_TOKEN` to a random 32+ character secret. Set
   `GHIDRA_HEADLESS` to your installation's `support/analyzeHeadless` path.
4. Run `python3 server.py` on the analysis VM. The default bind is localhost.
   Connect the VM to a **private** Cloudflare Tunnel + Workers VPC Service (or
   another private, authenticated link), not a publicly accessible URL.
5. Configure isolated NyX Worker secrets `NYX_REVERSE_RUNNER_URL` and
   `NYX_REVERSE_RUNNER_TOKEN`. The URL must be an HTTPS private gateway ending
   before `/analyze`; do not put either secret into the browser or GitHub.
6. Test a tiny, owned executable in a staging environment. Do not alter the
   live NyX Worker until the live-source synchronization and user-facing tests
   are complete.

The server accepts only POST `/analyze` with a bearer token and JSON
`{filename,data:<base64>}`. It processes at most one job concurrently and
returns a JSON Ghidra report. If the runner is absent, slow or unavailable,
NyX should fall back to fast static triage and say that decompilation wasn't run.

Security note: Ghidra parses untrusted data, which can exploit bugs in the
parser itself. Never run it as root, never execute the uploaded binary, and
never make the analysis service public without additional access controls.
