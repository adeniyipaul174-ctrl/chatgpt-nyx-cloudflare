import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

const css=await readFile(new URL("./nyx-mobile-header-fix.css",import.meta.url),"utf8");
test("mobile header remains flex, nowrap, and sized for smaller phones",()=>{
 assert.match(css,/\.top>div:last-child\{display:flex;[^}]*flex-wrap:nowrap/);
 assert.match(css,/@media\(max-width:700px\)/);
 assert.match(css,/@media\(max-width:350px\)/);
 assert.match(css,/\.top #settingsTop,\.top #newTop\{/);
 assert.match(css,/\.top #menu\{/);
});
test("agent menu is a vertical, viewport-contained list rather than inline button overflow",()=>{
 assert.match(css,/\.top \.nx-mode-option\{display:flex!important/);
 assert.match(css,/\.nx-mode-menu\{position:fixed!important/);
 assert.match(css,/left:12px!important;right:12px!important/);
 assert.match(css,/overflow-x:hidden!important/);
});
test("NyX color palette and existing agent mode contract are preserved",()=>{
 assert.match(css,/#f35f9f/i);
 assert.match(css,/#27282d/i);
 assert.equal(css.includes("display:none!important}.nx-mode-picker"),false);
 assert.equal(css.includes("fetch("),false);
});
