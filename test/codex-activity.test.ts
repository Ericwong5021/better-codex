import assert from "node:assert/strict";
import { appendFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { readCodexActivity, startCodexActivityCollection, stopCodexActivityCollection } from "../src/codex-activity.js";

function record(timestamp: number, type: string, payload: Record<string, unknown>) {
  return JSON.stringify({ timestamp: new Date(timestamp).toISOString(), type, payload });
}

function item(timestamp: number, type: "Reasoning" | "AgentMessage", timing: Record<string, unknown> = {}) {
  return record(timestamp, "event_msg", { type: "item_completed", item: { type, ...timing } });
}

function tokens(timestamp: number, outputTokens: number, totalTokens: number) {
  return record(timestamp, "event_msg", {
    type: "token_count",
    info: { last_token_usage: { output_tokens: outputTokens }, total_token_usage: { total_tokens: totalTokens } },
  });
}

async function waitFor(predicate: () => boolean) {
  const deadline = Date.now() + 5000;
  while (Date.now() < deadline) {
    if (predicate()) return;
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  assert.fail(`activity_collection_timeout: ${JSON.stringify(readCodexActivity())}`);
}

async function withRollout(lines: string[], run: (path: string) => Promise<void> | void) {
  const directory = mkdtempSync(join(tmpdir(), "better-codex-activity-"));
  const previousCodexHome = process.env.CODEX_HOME;
  const path = join(directory, "sessions", "rollout-test.jsonl");
  try {
    process.env.CODEX_HOME = directory;
    mkdirSync(join(directory, "sessions"));
    writeFileSync(path, `${lines.join("\n")}\n`);
    startCodexActivityCollection();
    await waitFor(() => readCodexActivity().collectionCycles > 0);
    await run(path);
  } finally {
    stopCodexActivityCollection();
    if (previousCodexHome === undefined) delete process.env.CODEX_HOME;
    else process.env.CODEX_HOME = previousCodexHome;
    rmSync(directory, { recursive: true, force: true });
  }
}

test("untimed Codex item completions retain requests and tokens without inventing output speed", async () => {
  const now = Date.now();
  await withRollout([
    record(now - 30_000, "event_msg", { type: "task_started" }),
    item(now - 20_000, "Reasoning"),
    record(now - 19_000, "response_item", { type: "message", role: "assistant" }),
    item(now - 18_000, "AgentMessage"),
    tokens(now - 17_000, 300, 1000),
    item(now - 10_000, "AgentMessage"),
    tokens(now - 9000, 200, 1500),
    // A repeated usage update must not become another request.
    tokens(now - 8000, 200, 1500),
  ], () => {
    const activity = readCodexActivity();
    assert.equal(activity.status, "ready");
    assert.deepEqual(activity.errors, []);
    assert.equal(activity.readErrors, 0);
    assert.equal(activity.requestCount, 2);
    assert.equal(activity.outputTokens, 500);
    assert.equal(activity.tokensPerSecond, null);
    assert.equal(activity.speedSampleCount, 0);
    assert.equal(activity.generationSeconds, 0);
  });
});

test("legacy wall-clock request and response records cannot establish streaming duration", async () => {
  const now = Date.now();
  await withRollout([
    record(now - 50_000, "event_msg", { type: "user_message", message: "Input" }),
    record(now - 30_000, "response_item", { type: "reasoning" }),
    record(now - 25_000, "response_item", { type: "custom_tool_call" }),
    record(now - 20_000, "event_msg", { type: "agent_message", message: "Output" }),
    tokens(now - 19_000, 400, 1000),
    record(now - 10_000, "response_item", { type: "function_call" }),
    record(now - 8000, "response_item", { type: "message", role: "assistant" }),
    tokens(now - 7000, 100, 1500),
  ], () => {
    const activity = readCodexActivity();
    assert.equal(activity.status, "ready");
    assert.equal(activity.requestCount, 2);
    assert.equal(activity.outputTokens, 500);
    assert.equal(activity.tokensPerSecond, null);
    assert.equal(activity.speedSampleCount, 0);
  });
});

test("explicit legacy item timings retain weighted last-token output speed without wall-clock extensions", async () => {
  const now = Date.now();
  await withRollout([
    record(now - 50_000, "event_msg", { type: "task_started" }),
    item(now - 31_000, "Reasoning", { started_at_ms: now - 32_000, completed_at_ms: now - 31_000 }),
    item(now - 30_000, "AgentMessage", { started_at_ms: now - 31_000, completed_at_ms: now - 30_000 }),
    record(now - 26_000, "response_item", { type: "message", role: "assistant" }),
    tokens(now - 25_000, 1000, 2000),
    item(now - 22_000, "AgentMessage", { started_at_ms: now - 23_000, completed_at_ms: now - 22_000 }),
    tokens(now - 21_000, 100, 2500),
  ], () => {
    const activity = readCodexActivity();
    assert.equal(activity.status, "ready");
    assert.equal(activity.requestCount, 2);
    assert.equal(activity.outputTokens, 1100);
    assert.equal(activity.speedSampleCount, 2);
    assert.equal(activity.generationSeconds, 3);
    assert.equal(activity.tokensPerSecond, 366.7);
  });
});

test("mixed timed and untimed output excludes partial requests and resets at token boundaries", async () => {
  const now = Date.now();
  await withRollout([
    item(now - 30_000, "Reasoning", { started_at_ms: now - 32_000, completed_at_ms: now - 30_000 }),
    item(now - 29_000, "AgentMessage"),
    tokens(now - 28_000, 500, 1000),
    item(now - 20_000, "Reasoning"),
    item(now - 18_000, "AgentMessage", { started_at_ms: now - 20_000, completed_at_ms: now - 18_000 }),
    tokens(now - 17_000, 300, 1500),
    item(now - 10_000, "AgentMessage", { started_at_ms: now - 12_000, completed_at_ms: now - 10_000 }),
    tokens(now - 9000, 200, 2000),
  ], () => {
    const activity = readCodexActivity();
    assert.equal(activity.status, "ready");
    assert.equal(activity.requestCount, 3);
    assert.equal(activity.outputTokens, 1000);
    assert.equal(activity.speedSampleCount, 1);
    assert.equal(activity.generationSeconds, 2);
    assert.equal(activity.tokensPerSecond, 100);
  });
});

test("explicit streaming durations exclude gaps, overlapping duplicates, and zero-length intervals", async () => {
  const now = Date.now();
  await withRollout([
    item(now - 30_000, "Reasoning", { started_at_ms: now - 32_000, completed_at_ms: now - 30_000 }),
    item(now - 30_000, "Reasoning", { started_at_ms: now - 32_000, completed_at_ms: now - 30_000 }),
    item(now - 29_000, "Reasoning", { started_at_ms: now - 31_000, completed_at_ms: now - 29_000 }),
    item(now - 20_000, "AgentMessage", { started_at_ms: now - 21_000, completed_at_ms: now - 20_000 }),
    tokens(now - 19_000, 400, 1000),
    item(now - 10_000, "Reasoning", { started_at_ms: now - 10_000, completed_at_ms: now - 10_000 }),
    item(now - 8000, "AgentMessage", { started_at_ms: now - 8000, completed_at_ms: now - 8000 }),
    tokens(now - 7000, 300, 1500),
  ], () => {
    const activity = readCodexActivity();
    assert.equal(activity.status, "ready");
    assert.equal(activity.requestCount, 2);
    assert.equal(activity.outputTokens, 700);
    assert.equal(activity.speedSampleCount, 1);
    assert.equal(activity.generationSeconds, 4);
    assert.equal(activity.tokensPerSecond, 100);
  });
});

test("incremental untimed records survive partial lines and preserve previous measured requests", async () => {
  const now = Date.now();
  await withRollout([
    item(now - 20_000, "AgentMessage", { started_at_ms: now - 22_000, completed_at_ms: now - 20_000 }),
    tokens(now - 19_000, 200, 1000),
  ], async path => {
    const initialBytes = readCodexActivity().bytesRead;
    const completion = item(now - 10_000, "AgentMessage");
    const split = Math.floor(completion.length / 2);
    appendFileSync(path, completion.slice(0, split));
    await waitFor(() => readCodexActivity().bytesRead > initialBytes);
    assert.equal(readCodexActivity().requestCount, 1);
    appendFileSync(path, `${completion.slice(split)}\n${tokens(now - 9000, 300, 1500)}\n`);
    await waitFor(() => readCodexActivity().requestCount === 2);
    const activity = readCodexActivity();
    assert.equal(activity.status, "ready");
    assert.equal(activity.outputTokens, 500);
    assert.equal(activity.speedSampleCount, 1);
    assert.equal(activity.tokensPerSecond, 100);
  });
});

test("malformed explicit timing remains visible without blocking subsequent valid requests", async t => {
  const now = Date.now();
  const invalidTimings = [
    { started_at_ms: now - 30_000 },
    { completed_at_ms: now - 30_000 },
    { started_at_ms: null, completed_at_ms: null },
    { started_at_ms: String(now - 32_000), completed_at_ms: now - 30_000 },
    { started_at_ms: -1, completed_at_ms: now - 30_000 },
    { started_at_ms: now - 29_000, completed_at_ms: now - 30_000 },
    { started_at_ms: now - 32_000 + 0.5, completed_at_ms: now - 30_000 },
    { started_at_ms: Number.MAX_SAFE_INTEGER + 1, completed_at_ms: Number.MAX_SAFE_INTEGER + 2 },
  ];
  for (const [index, timing] of invalidTimings.entries()) {
    await t.test(`invalid timing ${index + 1}`, async () => {
      await withRollout([
        item(now - 33_000, "Reasoning", { started_at_ms: now - 35_000, completed_at_ms: now - 33_000 }),
        // Timing validation also applies to ordinary JSON whitespace.
        item(now - 30_000, "AgentMessage", timing).replaceAll('\":', '\": '),
        tokens(now - 29_000, 500, 1000),
        item(now - 20_000, "AgentMessage"),
        tokens(now - 19_000, 300, 1500),
        item(now - 10_000, "AgentMessage", { started_at_ms: now - 12_000, completed_at_ms: now - 10_000 }),
        tokens(now - 9000, 200, 2000),
      ], () => {
        const activity = readCodexActivity();
        assert.equal(activity.status, "degraded");
        assert.deepEqual(activity.errors, ["codex_activity_generation_timing_invalid"]);
        assert.equal(activity.readErrors, 1);
        assert.equal(activity.requestCount, 3);
        assert.equal(activity.outputTokens, 1000);
        assert.equal(activity.speedSampleCount, 1);
        assert.equal(activity.tokensPerSecond, 100);
      });
    });
  }
});
