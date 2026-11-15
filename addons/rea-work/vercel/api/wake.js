import { Sandbox } from "@vercel/sandbox";
function allow(req) {
  const value = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  const expected = process.env.REA_GATEWAY_TOKEN;
  return Boolean(expected && value.length >= 24 && value === expected);
}
async function startGateway(sandbox) {
  const env = {
    REA_WORKSPACE: "/vercel/rea-workspace",
    REA_GATEWAY_TOKEN: process.env.REA_GATEWAY_TOKEN,
    REA_BINARY: "rea",
    HOST: "0.0.0.0",
    PORT: "8789"
  };
  const result = await sandbox.runCommand({
    cmd: "node",
    args: ["/vercel/gateway.mjs"],
    env,
    detached: true
  });
  if (result.exitCode && result.exitCode !== 0) throw Error("REA gateway failed to start");
}
async function prepare(sandbox) {
  const cmd = await sandbox.runCommand("bash", ["-lc",
    "curl -fsSL https://raw.githubusercontent.com/adeniyipaul174-ctrl/chatgpt-nyx-cloudflare/feature/rea-work-gateway/addons/rea-work/gateway.mjs -o /vercel/gateway.mjs && npm install -g rea-agents@6.9.0 && node --check /vercel/gateway.mjs"
  ]);
  if (cmd.exitCode !== 0) throw Error("Could not prepare REA runtime");
  await startGateway(sandbox);
}
export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (!allow(req)) return res.status(401).json({ error: "Unauthorized" });
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  try {
    const sandbox = await Sandbox.getOrCreate({
      name: "nyx-rea",
      resume: true,
      timeout: 30 * 60 * 1000,
      ports: [8789],
      onCreate: prepare,
      onResume: startGateway
    });
    const url = sandbox.domain(8789);
    if (typeof url !== "string" || !url.startsWith("https://")) throw Error("REA gateway URL unavailable");
    return res.status(200).json({ ok: true, url });
  } catch {
    return res.status(503).json({ error: "REA runner could not be resumed" });
  }
}
