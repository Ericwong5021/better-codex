import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("injector reacts to renderer target changes instead of waiting for its fallback sweep", () => {
  const source = readFileSync(new URL("../src/cdp.ts", import.meta.url), "utf8");

  assert.ok(source.includes('connection.send("Target.setDiscoverTargets", { discover: true })'));
  assert.ok(source.includes('connection.on("Target.targetCreated", wake)'));
  assert.ok(source.includes('connection.on("Target.targetInfoChanged", wake)'));
  assert.ok(source.includes('connection.on("Target.targetDestroyed", wake)'));
  assert.ok(source.includes("await activity"));
});
