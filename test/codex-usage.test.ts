import assert from "node:assert/strict";
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
