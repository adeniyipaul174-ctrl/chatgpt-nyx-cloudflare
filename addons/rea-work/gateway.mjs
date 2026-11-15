// Isolated REA CLI gateway for NYX Work tools.
// Runs on a user-controlled Linux host behind an authenticated HTTPS reverse proxy.
// It is deliberately not embedded in the Cloudflare Workers runtime.
import { createServer } from "node:http";
import { randomUUID, createHash, timingSafeEqual } from "node:crypto";
import { realpathSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve, relative, extname, join, sep } from "node:path";
import { spawn } from "node:child_process";
import { pathToFileURL } from "node:url";

const INPUT_LIMIT = 8 * 1024;
const UPLOAD_LIMIT = 24 * 1024 * 1024;
const OUTPUT_LIMIT = 2 * 1024 * 1024;
const OPERATIONS = Object.freeze({
  javascript: { command: "analyze-javascript-application", extensions: [".asar"], directory: true },
  apk: { command: "inspect-android-package", extensions: [".apk"], directory: false },
  apk_signature: { command: "inspect-apk-signature", extensions: [".apk"], directory: false }
});

function fail(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}
function send(res, status, data) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" });
  res.end(JSON.stringify(data));
}
function authenticated(req, token) {
  const supplied = String(req.headers.authorization || "").replace(/^Bearer /, "");
  const a = createHash("sha256").update(supplied).digest();
  const b = createHash("sha256").update(token).digest();
  return supplied.length > 0 && timingSafeEqual(a, b);
}
async function readLimited(req, limit) {
  let bytes = 0; const chunks = [];
  for await (const chunk of req) {
    bytes += chunk.length;
    if (bytes > limit) throw fail(413, "Request body exceeds limit");
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}
function validateTarget(workspace, name, action) {
  if (typeof name !== "string" || !name || name.includes("\0") || name.startsWith("/") || /^[A-Za-z]:/.test(name)) throw fail(400, "Invalid relative artifact path");
  const root = realpathSync(workspace);
  let actual;
  try { actual = realpathSync(resolve(root, name)); }
  catch { throw fail(404, "Artifact not found in workspace"); }
  const diff = relative(root, actual);
  if (diff.startsWith(".." + sep) || diff === ".." || diff.startsWith(sep)) throw fail(403, "Artifact is outside workspace");
  const op = OPERATIONS[action];
  if (!op) throw fail(400, "Unsupported REA action");
  const ext = extname(actual).toLowerCase();
  const isDirectory = ext === "" && op.directory;
  if (!isDirectory && !op.extensions.includes(ext)) throw fail(400, "Unsupported artifact type for action");
  return actual;
}
function executeRea(binary, command, artifact) {
  return new Promise((resolveResult) => {
    const proc = spawn(binary, [command, artifact, "--json"], { shell: false, stdio: ["ignore", "pipe", "pipe"], env: { ...process.env, NODE_ENV: "production" } });
    const stdout = [], stderr = []; let outBytes = 0, errBytes = 0, failure = null;
    const timer = setTimeout(() => { failure = "REA command timed out"; proc.kill("SIGKILL"); }, 120_000);
    proc.on("error", (err) => { failure = "Unable to launch REA: " + err.message; });
    proc.stdout.on("data", chunk => {
      outBytes += chunk.length;
      if (outBytes > OUTPUT_LIMIT) { failure = "REA Evidence exceeded 2 MiB gateway limit; use a smaller artifact or a retained Evidence view"; proc.kill("SIGKILL"); return; }
      stdout.push(chunk);
    });
    proc.stderr.on("data", chunk => {
      errBytes += chunk.length;
      if (errBytes <= 32 * 1024) stderr.push(chunk);
    });
    proc.on("close", (code) => {
      clearTimeout(timer);
      const diagnostic = Buffer.concat(stderr).toString("utf8").slice(-2000);
      if (failure || code !== 0) return resolveResult({ ok: false, error: failure || "REA returned a nonzero exit status", exitCode: code, diagnostic });
      try { resolveResult({ ok: true, action: command, evidence: JSON.parse(Buffer.concat(stdout).toString("utf8")) }); }
      catch { resolveResult({ ok: false, error: "REA did not return JSON", diagnostic }); }
    });
  });
}
export function createReaGateway({ workspace, token, binary = "rea" }) {
  if (!token || token.length < 24) throw Error("REA_GATEWAY_TOKEN must be at least 24 characters");
  if (!workspace) throw Error("REA_WORKSPACE must be configured");
  mkdirSync(workspace, { recursive: true });
  const root = realpathSync(workspace);
  mkdirSync(join(root, "uploaded"), { recursive: true });
  let running = false;
  return createServer(async (req, res) => {
    if (!authenticated(req, token)) return send(res, 401, { error: "Unauthorized" });
    if (req.method === "GET" && req.url === "/health") return send(res, 200, { ok: true, service: "nyx-rea-gateway" });
    if (req.method === "POST" && req.url === "/v1/upload") {
      try {
        const ext = String(req.headers["x-rea-extension"] || "").toLowerCase();
        if (![".apk", ".asar"].includes(ext)) throw fail(400, "Upload an APK or ASAR");
        const data = await readLimited(req, UPLOAD_LIMIT);
        if (!data.length) throw fail(400, "Empty artifact");
        const target = "uploaded/" + randomUUID() + ext;
        writeFileSync(resolve(root, target), data, { flag: "wx", mode: 0o600 });
        return send(res, 200, { ok: true, target, bytes: data.length });
      } catch (err) { return send(res, err.status || 500, { error: err.message || "Upload failed" }); }
    }
    if (req.method === "POST" && req.url === "/v1/analyze") {
      if (running) return send(res, 429, { error: "REA is busy; retry later" });
      running = true;
      try {
        const raw = await readLimited(req, INPUT_LIMIT);
        const body = JSON.parse(raw.toString("utf8"));
        const actual = validateTarget(root, body.target, body.action);
        const result = await executeRea(binary, OPERATIONS[body.action].command, actual);
        return send(res, result.ok ? 200 : 422, result);
      } catch (err) { return send(res, err.status || (err instanceof SyntaxError ? 400 : 500), { error: err.message || "Analysis failed" }); }
      finally { running = false; }
    }
    return send(res, 404, { error: "Not found" });
  });
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const gateway = createReaGateway({
    workspace: process.env.REA_WORKSPACE,
    token: process.env.REA_GATEWAY_TOKEN,
    binary: process.env.REA_BINARY || "rea"
  });
  gateway.listen(Number(process.env.PORT || 8789), process.env.HOST || "127.0.0.1", () => {
    process.stdout.write("NYX REA gateway listening locally\n");
  });
}
