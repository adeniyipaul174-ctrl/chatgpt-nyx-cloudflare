"""Private, single-job Ghidra headless API. Deploy only behind a private tunnel/VPC.

This is a static analysis service; it never executes uploaded programs. Run the
service and Ghidra in an isolated, low-privilege VM/container with no egress.
"""
import base64
import hmac
import json
import os
import re
import subprocess
import tempfile
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

MAX_BLOB_BYTES = 6 * 1024 * 1024
MAX_REQUEST_BYTES = 9 * 1024 * 1024
MAX_REPORT_BYTES = 384 * 1024
SLOTS = threading.BoundedSemaphore(1)
RUNNER_TOKEN = os.environ.get("NYX_REVERSE_RUNNER_TOKEN", "")
HEADLESS = os.environ.get("GHIDRA_HEADLESS", "/opt/ghidra/support/analyzeHeadless")
SCRIPTS = str(Path(__file__).with_name("scripts"))
TIMEOUT_SECONDS = int(os.environ.get("GHIDRA_ANALYSIS_TIMEOUT_SECONDS", "180"))


class Handler(BaseHTTPRequestHandler):
    server_version = "NyxGhidra/1"

    def log_message(self, fmt, *args):
        # Avoid logging Authorization headers, filenames and binary contents.
        return

    def reply(self, status, data):
        encoded = json.dumps(data).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Content-Length", str(len(encoded)))
        self.end_headers()
        self.wfile.write(encoded)

    def do_POST(self):
        if self.path != "/analyze":
            return self.reply(404, {"error": "Not found"})
        auth = self.headers.get("Authorization", "")
        if not RUNNER_TOKEN or not hmac.compare_digest(auth, "Bearer " + RUNNER_TOKEN):
            return self.reply(401, {"error": "Unauthorized"})
        try:
            size = int(self.headers.get("Content-Length", "-1"))
        except ValueError:
            return self.reply(400, {"error": "Invalid content length"})
        if size <= 0 or size > MAX_REQUEST_BYTES:
            return self.reply(413, {"error": "Request too large"})
        if not SLOTS.acquire(blocking=False):
            return self.reply(503, {"error": "Analysis runner is busy"})
        try:
            payload = json.loads(self.rfile.read(size))
            if not isinstance(payload, dict):
                return self.reply(400, {"error": "Invalid JSON"})
            name = str(payload.get("filename", "binary"))
            name = os.path.basename(name.replace("\\", "/"))[:120]
            if not name or not re.fullmatch(r"[A-Za-z0-9._ -]+", name):
                name = "binary.bin"
            encoded = payload.get("data", "")
            if not isinstance(encoded, str) or len(encoded) > MAX_REQUEST_BYTES:
                return self.reply(400, {"error": "Malformed binary"})
            try:
                specimen = base64.b64decode(encoded, validate=True)
            except (ValueError, base64.binascii.Error):
                return self.reply(400, {"error": "Malformed binary"})
            if not 0 < len(specimen) <= MAX_BLOB_BYTES:
                return self.reply(413, {"error": "Binary size exceeds 6 MiB"})
            if not Path(HEADLESS).is_file():
                return self.reply(503, {"error": "Ghidra is not installed"})
            with tempfile.TemporaryDirectory(prefix="nyx-rev-") as tmp:
                work = Path(tmp)
                target = work / name
                target.write_bytes(specimen)
                report = work / "report.json"
                command = [HEADLESS, str(work / "project"), "nyx_analysis",
                           "-import", str(target), "-scriptPath", SCRIPTS,
                           "-postScript", "nyx_export.py", str(report), "-deleteProject"]
                try:
                    proc = subprocess.run(command, cwd=str(work), stdin=subprocess.DEVNULL,
                                          stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
                                          timeout=TIMEOUT_SECONDS, check=False)
                except subprocess.TimeoutExpired:
                    return self.reply(504, {"error": "Ghidra analysis timed out"})
                if proc.returncode != 0 or not report.is_file() or report.stat().st_size > MAX_REPORT_BYTES:
                    return self.reply(422, {"error": "Ghidra could not produce a bounded analysis report"})
                return self.reply(200, {"engine": "ghidra-headless", "report": json.loads(report.read_text("utf-8"))})
        except (OSError, ValueError, TypeError, json.JSONDecodeError):
            return self.reply(400, {"error": "Invalid analysis request"})
        finally:
            SLOTS.release()


if __name__ == "__main__":
    if not RUNNER_TOKEN or len(RUNNER_TOKEN) < 32:
        raise SystemExit("Set a high-entropy NYX_REVERSE_RUNNER_TOKEN (>=32 chars).")
    host = os.environ.get("NYX_RUNNER_LISTEN", "127.0.0.1")
    port = int(os.environ.get("NYX_RUNNER_PORT", "8788"))
    ThreadingHTTPServer((host, port), Handler).serve_forever()
