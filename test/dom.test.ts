import assert from "node:assert/strict";
import test from "node:test";
import { injectionScript } from "../src/dom.js";

test("generated injection script is valid JavaScript", () => {
  const source = injectionScript(4317, "test-token", "install");

  assert.doesNotThrow(() => new Function(source));
  assert.ok(source.includes("location.pathname.match(/\\/local\\/([^/?#]+)/)"));
});
