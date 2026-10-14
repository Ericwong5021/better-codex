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

async function withRollout(lines: string[], run: (path: string, recordErrors: readonly string[]) => Promise<void> | void, options: { filename?: string; additional?: Array<{ filename: string; lines: string[] }> } = {}) {
  const directory = mkdtempSync(join(tmpdir(), "better-codex-activity-"));
  const previousCodexHome = process.env.CODEX_HOME;
  const path = join(directory, "sessions", options.filename || "rollout-test.jsonl");
  const recordErrors: string[] = [];
  const originalConsoleError = console.error;
  console.error = (...args: unknown[]) => {
    const message = args[0];
    if (typeof message === "string" && message.startsWith("BETTER_CODEX_DIAGNOSTIC ")) {
      const diagnostic = JSON.parse(message.slice("BETTER_CODEX_DIAGNOSTIC ".length));
      if (diagnostic.scope === "codex_activity" && diagnostic.event === "record_parse_failed" && diagnostic.file === path) recordErrors.push(diagnostic.error);
    }
    originalConsoleError(...args);
  };
  try {
    process.env.CODEX_HOME = directory;
    mkdirSync(join(directory, "sessions"));
    writeFileSync(path, `${lines.join("\n")}\n`);
    for (const file of options.additional || []) writeFileSync(join(directory, "sessions", file.filename), `${file.lines.join("\n")}\n`);
    startCodexActivityCollection();
    await waitFor(() => readCodexActivity().collectionCycles > 0);
    await run(path, recordErrors);
  } finally {
    stopCodexActivityCollection();
    console.error = originalConsoleError;
    if (previousCodexHome === undefined) delete process.env.CODEX_HOME;
    else process.env.CODEX_HOME = previousCodexHome;
    rmSync(directory, { recursive: true, force: true });
  }
}

function assertRecordErrors(recordErrors: readonly string[], expected: string[]) {
  // Current status/errors describe only the latest collection cycle. A clean
  // watcher cycle can recover before the test observes an earlier bad record.
  assert.deepEqual([...new Set(recordErrors)].sort(), [...expected].sort());
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
      ], (_path, recordErrors) => {
        const activity = readCodexActivity();
        assertRecordErrors(recordErrors, ["codex_activity_generation_timing_invalid"]);
        assert.equal(activity.readErrors, 1);
        assert.equal(activity.requestCount, 3);
        assert.equal(activity.outputTokens, 1000);
        assert.equal(activity.speedSampleCount, 1);
        assert.equal(activity.tokensPerSecond, 100);
      });
    });
  }
});

function envelopeItem(timestamp: number, timing: Record<string, unknown>, legacyTiming: Record<string, unknown> = {}) {
  return record(timestamp, "event_msg", {
    type: "item_completed", thread_id: "10000000-0000-4000-8000-000000000001", turn_id: "test-turn",
    ...timing, item: { type: "AgentMessage", id: "test-item", content: [{ type: "Text", text: "Output" }], ...legacyTiming },
  });
}

test("current desktop envelope timings establish streaming duration and take precedence over legacy fields", async () => {
  const now = Date.now();
  await withRollout([
    envelopeItem(now - 10_000, { started_at_ms: now - 12_000, completed_at_ms: now - 10_000 }, { started_at_ms: now - 20_000, completed_at_ms: now - 10_000 }),
    tokens(now - 9000, 200, 1000),
    envelopeItem(now - 5000, { started_at_ms: now - 6000, completed_at_ms: now - 5000 }),
    tokens(now - 4000, 100, 1500),
  ], () => {
    const activity = readCodexActivity();
    assert.equal(activity.status, "ready");
    assert.equal(activity.requestCount, 2);
    assert.equal(activity.speedSampleCount, 2);
    assert.equal(activity.generationSeconds, 3);
    assert.equal(activity.tokensPerSecond, 100);
  });
});

test("malformed envelope pairs never mix with or fall back to legacy timing", async t => {
  const now = Date.now();
  for (const timing of [
    { started_at_ms: now - 12_000 },
    { completed_at_ms: now - 10_000 },
    { started_at_ms: null, completed_at_ms: null },
    { started_at_ms: now - 9000, completed_at_ms: now - 10_000 },
  ]) {
    await t.test(JSON.stringify(Object.keys(timing)), async () => {
      await withRollout([
        envelopeItem(now - 10_000, timing, { started_at_ms: now - 12_000, completed_at_ms: now - 10_000 }),
        tokens(now - 9000, 200, 1000),
      ], (_path, recordErrors) => {
        const activity = readCodexActivity();
        assertRecordErrors(recordErrors, ["codex_activity_generation_timing_invalid"]);
        assert.equal(activity.readErrors, 1);
        assert.equal(activity.requestCount, 1);
        assert.equal(activity.tokensPerSecond, null);
      });
    });
  }
});

test("malformed JSON and timestamps do not block later records or incremental appends", async () => {
  const now = Date.now();
  await withRollout([
    '{"type":"event_msg","payload":{"type":"token_count",}',
    JSON.stringify({ timestamp: "invalid", type: "event_msg", payload: { type: "token_count", info: { last_token_usage: { output_tokens: 50 }, total_token_usage: { total_tokens: 100 } } } }),
    tokens(now - 5000, 100, 200),
  ], async (path, recordErrors) => {
    const initial = readCodexActivity();
    assert.equal(initial.requestCount, 1);
    assert.equal(initial.outputTokens, 100);
    assert.equal(initial.readErrors, 2);
    assertRecordErrors(recordErrors, ["codex_activity_record_json_invalid", "codex_activity_timestamp_invalid"]);
    appendFileSync(path, `${tokens(now - 1000, 150, 400)}\n`);
    await waitFor(() => readCodexActivity().requestCount === 2);
    assert.equal(readCodexActivity().status, "ready");
    assert.equal(readCodexActivity().outputTokens, 250);
    assert.equal(readCodexActivity().readErrors, 2);
    assertRecordErrors(recordErrors, ["codex_activity_record_json_invalid", "codex_activity_timestamp_invalid"]);
  });
});

test("oversized records are discarded through their newline with bounded incremental recovery", async () => {
  const now = Date.now();
  await withRollout([], async (path, recordErrors) => {
    const initialBytes = readCodexActivity().bytesRead;
    appendFileSync(path, 'x'.repeat(1024 * 1024 + 1));
    await waitFor(() => readCodexActivity().readErrors === 1 && readCodexActivity().bytesRead > initialBytes);
    assert.equal(readCodexActivity().requestCount, 0);
    assertRecordErrors(recordErrors, ["codex_activity_line_too_large"]);
    assert.equal(readCodexActivity().readErrors, 1);
    appendFileSync(path, 'x'.repeat(300_000));
    await waitFor(() => readCodexActivity().bytesRead >= initialBytes + 1024 * 1024 + 1 + 300_000);
    stopCodexActivityCollection();
    startCodexActivityCollection();
    await waitFor(() => readCodexActivity().collectionCycles > 0);
    assert.equal(readCodexActivity().readErrors, 1);
    assert.equal(readCodexActivity().requestCount, 0);
    appendFileSync(path, `\n${tokens(now - 1000, 100, 200)}\n`);
    await waitFor(() => readCodexActivity().requestCount === 1);
    assert.equal(readCodexActivity().status, "ready");
    assert.equal(readCodexActivity().outputTokens, 100);
    assert.equal(readCodexActivity().readErrors, 1);
  });
});

test("different rollout identities retain identical requests while duplicate thread files deduplicate", async t => {
  const now = Date.now();
  const lines = [tokens(now - 1000, 50, 100)];
  const threadA = "10000000-0000-4000-8000-000000000001";
  const threadB = "10000000-0000-4000-8000-000000000002";
  for (const scenario of [
    { first: `rollout-first-${threadA}.jsonl`, second: `rollout-second-${threadB}.jsonl`, count: 2 },
    { first: `rollout-first-${threadA}.jsonl`, second: `rollout-second-${threadA}.jsonl`, count: 1 },
    { first: "first.jsonl", second: "second.jsonl", count: 2 },
  ]) {
    await t.test(scenario.second, async () => {
      await withRollout(lines, () => {
        assert.equal(readCodexActivity().requestCount, scenario.count);
        assert.equal(readCodexActivity().outputTokens, scenario.count * 50);
      }, { filename: scenario.first, additional: [{ filename: scenario.second, lines }] });
    });
  }
});

test("non-output metadata preserves timing and does not consume the counted cumulative watermark", async t => {
  const now = Date.now();
  for (const lastUsage of [null, {}, { output_tokens: null }, { output_tokens: "100" }, { output_tokens: 0 }]) {
    await t.test(JSON.stringify(lastUsage), async () => {
      await withRollout([
        tokens(now - 10_000, 50, 100),
        envelopeItem(now - 5000, { started_at_ms: now - 7000, completed_at_ms: now - 5000 }),
        record(now - 4000, "event_msg", { type: "token_count", info: { last_token_usage: lastUsage, total_token_usage: { total_tokens: 200 } } }),
        tokens(now - 3000, 100, 200),
      ], () => {
        const activity = readCodexActivity();
        assert.equal(activity.status, "ready");
        assert.equal(activity.requestCount, 2);
        assert.equal(activity.outputTokens, 150);
        assert.equal(activity.speedSampleCount, 1);
        assert.equal(activity.tokensPerSecond, 50);
      });
    });
  }
});

test("duplicate usage metadata between model items retains both streaming intervals", async () => {
  const now = Date.now();
  await withRollout([
    tokens(now - 20_000, 50, 100),
    envelopeItem(now - 10_000, { started_at_ms: now - 11_000, completed_at_ms: now - 10_000 }),
    tokens(now - 9000, 50, 100),
    envelopeItem(now - 5000, { started_at_ms: now - 6000, completed_at_ms: now - 5000 }),
    tokens(now - 4000, 200, 400),
  ], () => {
    assert.equal(readCodexActivity().requestCount, 2);
    assert.equal(readCodexActivity().outputTokens, 250);
    assert.equal(readCodexActivity().generationSeconds, 2);
    assert.equal(readCodexActivity().tokensPerSecond, 100);
  });
});

test("valid output requests continue after a cumulative counter reset", async () => {
  const now = Date.now();
  await withRollout([
    tokens(now - 10_000, 100, 1000),
    tokens(now - 9000, 50, 100),
    tokens(now - 8000, 75, 200),
    tokens(now - 7000, 75, 200),
  ], () => {
    assert.equal(readCodexActivity().requestCount, 3);
    assert.equal(readCodexActivity().outputTokens, 225);
  });
});

test("future timestamps and timing do not poison later valid usage at the same cumulative total", async () => {
  const now = Date.now();
  await withRollout([
    tokens(now + 60_000, 100, 1000),
    tokens(now - 10_000, 100, 1000),
    envelopeItem(now - 9000, { started_at_ms: now - 1000, completed_at_ms: now + 60_000 }),
    tokens(now - 8000, 50, 1100),
  ], (_path, recordErrors) => {
    const activity = readCodexActivity();
    assertRecordErrors(recordErrors, ["codex_activity_timestamp_in_future"]);
    assert.equal(activity.readErrors, 2);
    assert.equal(activity.requestCount, 2);
    assert.equal(activity.outputTokens, 150);
    assert.equal(activity.speedSampleCount, 0);
  });
});

test("same-thread copies deduplicate usage independently of retained timing", async () => {
  const now = Date.now();
  const thread = "10000000-0000-4000-8000-000000000001";
  const usage = tokens(now - 9000, 100, 200);
  await withRollout([
    envelopeItem(now - 10_000, { started_at_ms: now - 11_000, completed_at_ms: now - 10_000 }), usage,
  ], () => {
    assert.equal(readCodexActivity().requestCount, 1);
    assert.equal(readCodexActivity().outputTokens, 100);
  }, { filename: `rollout-a-${thread}.jsonl`, additional: [{ filename: `rollout-b-${thread.toUpperCase()}.jsonl`, lines: [usage] }] });
});

test("split malformed lines recover on append and restart without replaying poison records", async () => {
  const now = Date.now();
  await withRollout([], async path => {
    const partial = '{"type":"event_msg","payload":{"type":"token_count",';
    const initialBytes = readCodexActivity().bytesRead;
    appendFileSync(path, partial);
    await waitFor(() => readCodexActivity().bytesRead > initialBytes);
    assert.equal(readCodexActivity().readErrors, 0);
    appendFileSync(path, `}\n${tokens(now - 5000, 100, 200)}\n`);
    await waitFor(() => readCodexActivity().requestCount === 1);
    assert.equal(readCodexActivity().readErrors, 1);
    stopCodexActivityCollection();
    startCodexActivityCollection();
    await waitFor(() => readCodexActivity().collectionCycles > 0);
    assert.equal(readCodexActivity().requestCount, 1);
    assert.equal(readCodexActivity().readErrors, 1);
    appendFileSync(path, `${tokens(now - 1000, 50, 300)}\n`);
    await waitFor(() => readCodexActivity().requestCount === 2);
    assert.equal(readCodexActivity().status, "ready");
  });
});

test("complete oversized records recover after restart and preserve following requests", async () => {
  const now = Date.now();
  await withRollout(['x'.repeat(1024 * 1024 + 1), tokens(now - 5000, 100, 200)], async path => {
    assert.equal(readCodexActivity().requestCount, 1);
    assert.equal(readCodexActivity().readErrors, 1);
    stopCodexActivityCollection();
    startCodexActivityCollection();
    await waitFor(() => readCodexActivity().collectionCycles > 0);
    assert.equal(readCodexActivity().requestCount, 1);
    assert.equal(readCodexActivity().readErrors, 1);
    appendFileSync(path, `${tokens(now - 1000, 50, 300)}\n`);
    await waitFor(() => readCodexActivity().requestCount === 2);
    assert.equal(readCodexActivity().outputTokens, 150);
  });
});
