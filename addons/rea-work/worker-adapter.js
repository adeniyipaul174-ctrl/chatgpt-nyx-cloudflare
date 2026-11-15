// OPTIONAL NYX Work-mode route adapter.
// Merge into the CURRENT LIVE Worker source only after verifying its auth flow.
// Call handleReaWorkRoute() after Cloudflare Access / NYX account authentication.
// Never call this from an unauthenticated route.
const WORK_REA_ACTIONS = new Set(["javascript", "apk", "apk_signature"]);
function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff"
    }
  });
}
function validGateway(url) {
  try {
    const u = new URL(url);
    // HTTPS origin only, no embedded credentials, path, query or fragment.
    if (u.protocol !== "https:" || u.username || u.password || u.search || u.hash || (u.pathname !== "/" && u.pathname !== "")) return null;
    return u.origin;
  } catch { return null; }
}
function safeTarget(v) {
  return typeof v === "string" && v.length >= 1 && v.length <= 250 &&
    !v.includes("\0") && !v.includes("\\") && !v.startsWith("/") &&
    !/^[a-z]:/i.test(v) && v.split("/").every(part => part && part !== "." && part !== "..");
}
/**
 * @param {Request} request authenticated original request
 * @param {object} env NYX Worker bindings; secrets REA_GATEWAY_URL and REA_GATEWAY_TOKEN
 * @param {object} options {userId: validated authenticated NYX user id; isOwner: bool}
 * @returns {Promise<Response|null>} null means unmatched route
 */
export async function handleReaWorkRoute(request, env, { userId, isOwner } = {}) {
  const path = new URL(request.url).pathname;
  if (path !== "/api/work/rea-upload" && path !== "/api/work/rea-analyze") return null;
  if (request.method !== "POST") return json(405, {error:"Method not allowed"});
  // Authentication must be done by the host NYX app BEFORE calling this function.
  if (!userId || !isOwner) return json(403, {error:"REA Work tools require an authenticated owner account"});
  const origin = request.headers.get("Origin");
  if (origin && origin !== new URL(request.url).origin) return json(403, {error:"Cross-origin REA requests are not permitted"});
  const upstream = validGateway(env.REA_GATEWAY_URL);
  const token = env.REA_GATEWAY_TOKEN;
  if (!upstream || typeof token !== "string" || token.length < 24) {
    return json(503, {error:"REA analysis runner is not configured"});
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 125000);
  try {
    let response;
    if (path.endsWith("rea-upload")) {
      const type = request.headers.get("content-type") || "";
      if (type !== "application/octet-stream") return json(415, {error:"Upload must be application/octet-stream"});
      const ext = String(request.headers.get("x-rea-extension") || "").toLowerCase();
      if (![".apk", ".asar"].includes(ext)) return json(400, {error:"Supported uploads: .apk, .asar"});
      const length = Number(request.headers.get("content-length"));
      if (Number.isFinite(length) && length > 24 * 1024 * 1024) return json(413, {error:"Artifact is too large"});
      response = await fetch(upstream + "/v1/upload", {
        method:"POST", headers:{
          Authorization: "Bearer " + token,
          "Content-Type":"application/octet-stream",
          "X-REA-Extension":ext
        },
        body: request.body,
        signal:controller.signal
      });
    } else {
      const text = await request.text();
      if (text.length > 8192) return json(413, {error:"Analysis request is too large"});
      let body;
      try { body = JSON.parse(text); } catch { return json(400, {error:"Expected JSON"}); }
      if (!WORK_REA_ACTIONS.has(body.action) || !safeTarget(body.target)) {
        return json(400, {error:"Unsupported action or artifact path"});
      }
      response = await fetch(upstream + "/v1/analyze", {
        method:"POST",headers:{
          Authorization:"Bearer "+token,
          "Content-Type":"application/json"
        },
        body:JSON.stringify({ action:body.action, target:body.target }),
        signal:controller.signal
      });
    }
    if (response.status >= 500) return json(502, {error:"REA runner is unavailable"});
    const data = await response.text();
    if (data.length > 2 * 1024 * 1024) return json(502, {error:"REA runner response exceeded limit"});
    // Upstream payload is JSON only. No HTML or content-type reflection.
    let parsed;
    try { parsed = JSON.parse(data); }
    catch { return json(502, {error:"REA runner returned an invalid response"}); }
    return json(response.status, parsed);
  } catch (err) {
    return json(err?.name === "AbortError" ? 504 : 502, {error:"Unable to contact REA runner"});
  } finally {
    clearTimeout(timer);
  }
}
