import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const controller=readFileSync(new URL("../work-mode/work-controller.js", import.meta.url), "utf8");
const pane=readFileSync(new URL("../work-mode/work-pane.html", import.meta.url), "utf8");

test("Work-mode controller uses direct REA endpoints only", () => {
  assert.match(controller, /\/api\/work\/rea-upload/);
  assert.match(controller, /\/api\/work\/rea-analyze/);
  for(const forbidden of [
    "/api/nyx", "runAgentTask", "nxCodeGenerate", "nyxWrite",
    "agentMode", "autoTools", "nxChatAgentMode", "ai-browser",
    "OPENROUTER", "GOOGLE_CLIENT", "ANTHROPIC"
  ]) assert.equal(controller.includes(forbidden), false, "Work must not use " + forbidden);
});

test("Work displays only REA tools and keeps the mode switch", () => {
  assert.match(pane, /id="nxReaTool"/);
  assert.match(pane, /id="nxReaRun"/);
  assert.match(pane, /id="nxReaFile"/);
  assert.match(pane, /id="nxReaResult"/);
  for(const forbidden of [
    "nxWorkPrompt", "nxWorkAgentSlot", "nxWorkBrowser",
    "nxWorkForm", "nxWorkSend", "Use agent team",
    "data-nx-work", "nxWorkKeyboard", "nxModePicker"
  ]) assert.equal(pane.includes(forbidden), false, "Work must not display " + forbidden);
  assert.match(controller, /nxTabChat/);
  assert.match(controller, /nxTabWork/);
  assert.match(controller, /nxWorkHistoryAPI/);
});

test("REA does not require chat model inference and accepts only supported artifacts", () => {
  assert.match(pane, /type="file" accept="\.apk,\.asar"/);
  assert.match(pane, /value="apk"/);
  assert.match(pane, /value="apk_signature"/);
  assert.match(pane, /value="javascript"/);
  assert.match(controller, /24 \* 1024 \* 1024/);
});
