# Code execution: staged, disabled

The production Worker must never run `eval`, `new Function`, shell commands or arbitrary Python. The candidate provides only fixed CSV parsing/statistics and explicitly says arbitrary execution is unavailable.

Before implementing an executor:

1. Provision a separate execution service with no production secrets, session cookies, Cloudflare credentials, D1 bindings or account network access. Confirm hosting cost and obtain approval before any paid service is enabled.
2. Use a fresh disposable container/microVM per job. Disable outbound networking at the infrastructure layer, including DNS, metadata endpoints and private address ranges. Language-level monkey-patching alone is not isolation.
3. Run as an unprivileged UID with a read-only base image, bounded temporary filesystem, dropped capabilities, process-count limit, memory cap and externally enforced wall-clock/CPU deadline. Disallow package installation and arbitrary privileged commands.
4. Use a one-use job authorization scoped to one user and upload set. Mount only that job's uploaded files; never other conversations. Validate archive extraction against path traversal and decompression bombs.
5. The main Worker submits a bounded typed job, receives status/stdout/stderr and artifact descriptors, and authorizes downloads per user. Never serve generated HTML as trusted app content. Limit stdout and artifacts; delete temporary data at completion or deadline.
6. Ship adversarial tests for infinite loops, memory exhaustion, process spawning, network/metadata probing, filesystem escapes and cross-user access before enabling execution. Confirm external termination works when the guest ignores signals.

The implementation choice (paid Cloudflare Sandbox/container service or another isolated host) remains unresolved. A browser Web Worker alone does not satisfy these requirements for arbitrary code because it can inherit origin/network capabilities.
