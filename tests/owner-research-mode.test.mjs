import test from "node:test";
import assert from "node:assert/strict";
import { isOwnerAccount, OWNER_RESEARCH_INSTRUCTIONS } from "../src/owner-research-mode.mjs";

test("verified owner email matches configured case-insensitively", () => {
  assert.equal(isOwnerAccount({userId:"u1",email:"  OWNER@Example.com "},{NYX_OWNER_EMAILS:"other@example.com, owner@example.com"}),true);
});

test("unconfigured or absent verified email never grants owner mode", () => {
  assert.equal(isOwnerAccount({email:"owner@example.com"},{}),false);
  assert.equal(isOwnerAccount({userId:"owner@example.com",email:null},{NYX_OWNER_EMAILS:"owner@example.com"}),false);
  assert.equal(isOwnerAccount({}, {NYX_OWNER_EMAILS:"owner@example.com"}),false);
});

test("other accounts and partial matches do not qualify", () => {
  const env={NYX_OWNER_EMAILS:"owner@example.com"};
  assert.equal(isOwnerAccount({email:"notowner@example.com"},env),false);
  assert.equal(isOwnerAccount({email:"owner@example.com.evil.test"},env),false);
});

test("owner mode encourages legitimate reverse engineering but preserves honest limitations", () => {
  assert.match(OWNER_RESEARCH_INSTRUCTIONS,/reverse engineering/i);
  assert.match(OWNER_RESEARCH_INSTRUCTIONS,/do not refuse merely/i);
  assert.match(OWNER_RESEARCH_INSTRUCTIONS,/provider-level safety constraints/i);
  assert.match(OWNER_RESEARCH_INSTRUCTIONS,/tools were actually run/i);
});
