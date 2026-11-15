import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, chmodSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createReaGateway } from "./gateway.mjs";

test("REA gateway requires owner token, confines artifacts and runs allowlisted operations", async () => {
  const dir = mkdtempSync(join(tmpdir(), "nyx-rea-gateway-test-"));
  const token = "example-test-token-not-for-production-123456";
  const mock = join(dir, "mock-rea");
  writeFileSync(mock, '#!/bin/sh\nprintf \'{"ok":true,"analysis":"test"}\\n\'\n', { mode: 0o700 });
  chmodSync(mock, 0o700);
  const server = createReaGateway({ workspace: dir, token, binary: mock });
  await new Promise(ok => server.listen(0, "127.0.0.1", ok));
  const base = "http://127.0.0.1:" + server.address().port;
  const auth = { Authorization: "Bearer " + token };
  try {
    const denied = await fetch(base + "/health");
    assert.equal(denied.status, 401);
    const health = await fetch(base + "/health", { headers: auth });
    assert.equal(health.status, 200);
    const upload = await fetch(base + "/v1/upload", {
      method: "POST",
      headers: { ...auth, "x-rea-extension": ".apk", "content-type": "application/octet-stream" },
      body: new Uint8Array([0x50, 0x4b, 0x03, 0x04])
    });
    assert.equal(upload.status, 200);
    const uploaded = await upload.json();
    assert.match(uploaded.target, /^uploaded\/[a-z0-9-]+\.apk$/i);
    const analyze = (body) => fetch(base + "/v1/analyze", {
      method: "POST",
      headers: { ...auth, "content-type": "application/json" },
      body: JSON.stringify(body)
    });
    const good = await analyze({ action: "apk_signature", target: uploaded.target });
    assert.equal(good.status, 200);
    const output = await good.json();
    assert.equal(output.ok, true);
    assert.equal(output.evidence.analysis, "test");
    const traversed = await analyze({ action: "apk_signature", target: "../etc/passwd" });
    assert.ok(traversed.status >= 400);
    const unknown = await analyze({ action: "arbitrary_command", target: uploaded.target });
    assert.equal(unknown.status, 400);
    const mismatch = await analyze({ action: "javascript", target: uploaded.target });
    assert.equal(mismatch.status, 400);
    const badExtension = await fetch(base + "/v1/upload", {
      method: "POST", headers: { ...auth, "x-rea-extension": ".exe" },
      body: "dummy"
    });
    assert.equal(badExtension.status, 400);
  } finally {
    await new Promise(ok => server.close(ok));
    rmSync(dir, { recursive: true, force: true });
  }
});
