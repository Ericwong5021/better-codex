import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { javascriptStringLiteral } from "../scripts/javascript-literal.mjs";

const packageSource = readFileSync(new URL("../scripts/package.mjs", import.meta.url), "utf8");

test("bundle packaging uses an explicitly safe JavaScript string serializer", () => {
  assert.match(packageSource, /javascriptStringLiteral\(icns\)/);
  assert.match(packageSource, /javascriptStringLiteral\(ico\)/);
  assert.match(packageSource, /javascriptStringLiteral\(logo\)/);
  assert.doesNotMatch(packageSource, /JSON\.stringify\((?:icns|ico|logo)\)/);
});

test("release packaging ships a Node bundle without copying or injecting the Node executable", () => {
  assert.match(packageSource, /define: \{ __BETTER_CODEX_PACKAGED__: "true" \}/);
  assert.match(packageSource, /better-codex\.cjs/);
  assert.doesNotMatch(packageSource, /copyFile\(process\.execPath/);
  assert.doesNotMatch(packageSource, /experimental-sea-config|NODE_SEA_BLOB|postject/);
});

test("JavaScript string serialization preserves content without raw code-breaking characters", () => {
  const value = '</script> "quoted" \\ path\u2028next\u2029last';
  const literal = javascriptStringLiteral(value);
  assert.equal(JSON.parse(literal), value);
  assert.doesNotMatch(literal, /<|>|(?<!\\)\/(?:script)|\u2028|\u2029/u);
});
