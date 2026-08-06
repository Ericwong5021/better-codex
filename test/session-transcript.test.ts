import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { normalizeSessionId, readConversationResult } from "../src/session-transcript.js";

test("readConversationResult builds a user and final_answer bubble timeline", async () => {
  const codexHome = mkdtempSync(join(tmpdir(), "better-codex-session-"));
  const previous = process.env.CODEX_HOME;
  process.env.CODEX_HOME = codexHome;
  try {
    const id = "019fd63c-15b5-7bc1-8110-22dbe0117e75";
    const directory = join(codexHome, "sessions", "2026", "08", "06");
    mkdirSync(directory, { recursive: true });
    writeFileSync(join(directory, `rollout-2026-08-06T12-00-00-${id}.jsonl`), [
      JSON.stringify({ type: "session_meta", payload: { cwd: codexHome } }),
      JSON.stringify({ type: "event_msg", timestamp: "2026-08-06T12:00:01.000Z", payload: { type: "user_message", message: "/better-codex\n内部任务提示" } }),
      JSON.stringify({ type: "event_msg", timestamp: "2026-08-06T12:00:02.000Z", payload: { type: "user_message", message: "请检查发布状态" } }),
      JSON.stringify({ type: "event_msg", timestamp: "2026-08-06T12:00:03.000Z", payload: { type: "agent_message", phase: "commentary", message: "working" } }),
      JSON.stringify({ type: "event_msg", timestamp: "2026-08-06T12:00:04.000Z", payload: { type: "agent_message", phase: "final_answer", message: "First **done**" } }),
      JSON.stringify({ type: "event_msg", timestamp: "2026-08-06T12:00:05.000Z", payload: { type: "user_message", message: "再确认一次" } }),
      JSON.stringify({ type: "event_msg", timestamp: "2026-08-06T12:00:06.000Z", payload: { type: "agent_message", phase: "final_answer", message: "Latest result with `code`" } }),
      "",
    ].join("\n"), "utf8");

    assert.equal(normalizeSessionId(`local:${id}`), id);
    const result = await readConversationResult(id);
    assert.equal(result.found, true);
    assert.equal(result.messages.length, 4);
    assert.deepEqual(result.messages.map(item => item.role), ["user", "agent", "user", "agent"]);
    assert.equal(result.messages[0].markdown, "请检查发布状态");
    assert.equal(result.messages[1].phase, "final_answer");
    assert.equal(result.markdown, "Latest result with `code`");
    assert.match(result.html, /<code>code<\/code>/);
    assert.match(result.messages[3].html, /<code>code<\/code>/);
  } finally {
    if (previous === undefined) delete process.env.CODEX_HOME;
    else process.env.CODEX_HOME = previous;
    rmSync(codexHome, { recursive: true, force: true });
  }
});
