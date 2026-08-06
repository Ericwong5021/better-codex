import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("../src/cdp.ts", import.meta.url), "utf8");

test("injector reacts to renderer target changes instead of waiting for its fallback sweep", () => {
  assert.ok(source.includes('connection.send("Target.setDiscoverTargets", { discover: true })'));
  assert.ok(source.includes('connection.on("Target.targetCreated", wake)'));
  assert.ok(source.includes('connection.on("Target.targetInfoChanged", wake)'));
  assert.ok(source.includes('connection.on("Target.targetDestroyed", wake)'));
  assert.ok(source.includes("await Promise.race([activity, new Promise<void>(resolve => setTimeout(resolve, settleMs))]"));
});

test("injection waits for the first capable renderer without a multi-second stability hold", () => {
  assert.match(source, /async function waitForTargets\(port: number\)/);
  assert.match(source, /if \(values\.length > 0\) return values;/);
  assert.doesNotMatch(source, /stableCount\s*>=\s*4/);
  assert.doesNotMatch(source, /stableCount/);
  assert.match(source, /setTimeout\(resolve, 150\)/);
  assert.match(source, /settleMs = message\.startsWith\("codex_incompatible_"\) \|\| message\.startsWith\("cdp_unavailable_"\) \? 200 : 500/);
});

test("injector does not open a second debugger against already attached targets", () => {
  assert.match(source, /trustIds\?: Set<string>/);
  assert.match(source, /mainTargets\(port, \{ trustIds: new Set\(attached\.keys\(\)\) \}\)/);
  assert.match(source, /if \(options\.trustIds\?\.has\(target\.id\)\)/);
});

test("bridge allows auto-dispatch settings updates", () => {
  assert.match(source, /settings\\\/auto-dispatch/);
  assert.match(source, /\["GET", "POST", "PATCH", "DELETE"\]/);
});
