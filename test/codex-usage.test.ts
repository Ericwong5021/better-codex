import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { normalizeCodexUsage } from "../src/codex-usage.js";

test("normalizeCodexUsage exposes remaining quota without leaking the raw response", () => {
  assert.deepEqual(normalizeCodexUsage({
    rateLimits: {
      planType: "pro",
      primary: { usedPercent: 34.2, windowDurationMins: 10080, resetsAt: 1787012762 },
      secondary: null,
      credits: { balance: "private" },
    },
  }), {
    planType: "pro",
    primary: { usedPercent: 34, remainingPercent: 66, windowDurationMins: 10080, resetsAt: 1787012762 },
    secondary: null,
  });
});

test("normalizeCodexUsage rejects missing windows and clamps percentages", () => {
  assert.equal(normalizeCodexUsage({ rateLimits: { primary: null, secondary: null } }), null);
  assert.deepEqual(normalizeCodexUsage({
    rateLimits: {
      primary: { usedPercent: 120, windowDurationMins: 300, resetsAt: 1 },
    },
  })?.primary, {
    usedPercent: 100,
    remainingPercent: 0,
    windowDurationMins: 300,
    resetsAt: 1,
  });
});

test("Codex usage transport bounds untrusted app-server output", () => {
  const source = readFileSync(new URL("../src/codex-usage.ts", import.meta.url), "utf8");
  assert.match(source, /const maxOutputBytes = 1_048_576/);
  assert.match(source, /const maxLineBytes = 262_144/);
  assert.match(source, /outputBytes > maxOutputBytes/);
  assert.match(source, /Buffer\.byteLength\(output\) > maxLineBytes/);
  assert.match(source, /child\.stdout\.removeAllListeners\("data"\)/);
});
