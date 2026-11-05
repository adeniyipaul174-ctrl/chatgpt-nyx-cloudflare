/** Isolated, fail-closed IDA report relay. NO binary or executable is run here. */
const encoder = new TextEncoder();
const MAX_REPORT_BYTES = 2 * 1024 * 1024;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer'
};
function json(data, status = 200) { return new Response(JSON.stringify(data), { status, headers: HEADERS }); }
function error(status, code) { return json({ error: code }, status); }

async function equalSecret(a, b) {
  if (!a || !b || typeof a !== 'string' || typeof b !== 'string') return false;
  // Hash both to a fixed length before a constant-time comparison.
  const [ah, bh] = await Promise.all([crypto.subtle.digest('SHA-256', encoder.encode(a)), crypto.subtle.digest('SHA-256', encoder.encode(b))]);
  const x = new Uint8Array(ah), y = new Uint8Array(bh);
  let mismatch = 0;
  for (let i = 0; i < x.length; i++) mismatch |= x[i] ^ y[i];
  return mismatch === 0;
}
async function authorized(request, token) {
  const header = request.headers.get('Authorization') || '';
  if (!header.startsWith('Bearer ') || header.length > 1024) return false;
  return equalSecret(header.slice(7), token);
}
async function boundedBody(request) {
  const n = Number(request.headers.get('content-length') || 0);
  if (n > MAX_REPORT_BYTES) return null;
  if (!request.body) return new Uint8Array(0);
  const reader = request.body.getReader();
  const chunks = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_REPORT_BYTES) { await reader.cancel(); return null; }
    chunks.push(value);
  }
  const output = new Uint8Array(size); let offset = 0;
  for (const part of chunks) { output.set(part, offset); offset += part.byteLength; }
  return output;
}
function reportIsValid(x) {
  return x && typeof x === 'object' && !Array.isArray(x)
    && x.format === 'nyx-ida-report-v1'
    && typeof x.source_sha256 === 'string' && /^[a-f0-9]{64}$/i.test(x.source_sha256)
    && Array.isArray(x.functions) && x.functions.length <= 600
    && x.functions.every(f => f && typeof f.name === 'string' && f.name.length <= 256
      && typeof f.address === 'string' && f.address.length <= 32
      && typeof f.disassembly === 'string' && f.disassembly.length <= 10000
      && (f.pseudocode == null || (typeof f.pseudocode === 'string' && f.pseudocode.length <= 16000)));
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/health' && request.method === 'GET') return json({ status: 'ok', mode: 'reports-only' });
    if (!env || !env.REPORTS) return error(503, 'STORAGE_NOT_CONFIGURED');
    // Never send access-control-allow-origin: the API is server-to-server only.
    if (url.pathname === '/v1/reports' && request.method === 'POST') {
      if (!(await authorized(request, env.IDA_UPLOAD_TOKEN))) return error(401, 'UNAUTHORIZED');
      if (!(request.headers.get('content-type') || '').toLowerCase().startsWith('application/json')) return error(415, 'JSON_REQUIRED');
      let bytes;
      try { bytes = await boundedBody(request); } catch { return error(400, 'BAD_BODY'); }
      if (!bytes) return error(413, 'REPORT_TOO_LARGE');
      let data;
      try { data = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)); }
      catch { return error(400, 'INVALID_JSON'); }
      if (!reportIsValid(data)) return error(422, 'INVALID_REPORT');
      const id = crypto.randomUUID();
      await env.REPORTS.put('reports/' + id + '.json', bytes, { httpMetadata: { contentType: 'application/json' } });
      return json({ id, source_sha256: data.source_sha256 }, 201);
    }
    if (url.pathname === '/v1/reports' && request.method === 'GET') {
      if (!(await authorized(request, env.IDA_READ_TOKEN))) return error(401, 'UNAUTHORIZED');
      const list = await env.REPORTS.list({ prefix: 'reports/', limit: 30 });
      return json({ reports: list.objects.map(x => ({ id: x.key.slice(8, -5), uploaded: x.uploaded, size: x.size })) });
    }
    const match = /^\/v1\/reports\/([^/]+)$/.exec(url.pathname);
    if (match && request.method === 'GET') {
      if (!(await authorized(request, env.IDA_READ_TOKEN))) return error(401, 'UNAUTHORIZED');
      if (!UUID.test(match[1])) return error(400, 'INVALID_ID');
      const object = await env.REPORTS.get('reports/' + match[1] + '.json');
      if (!object) return error(404, 'NOT_FOUND');
      return new Response(object.body, { headers: HEADERS });
    }
    return error(404, 'NOT_FOUND');
  }
};
