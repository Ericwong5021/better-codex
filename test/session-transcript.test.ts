import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { normalizeSessionId, readConversationResult } from "../src/session-transcript.js";

test("readConversationResult builds a user/commentary/final_answer bubble timeline", async () => {
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
      JSON.stringify({ type: "response_item", timestamp: "2026-08-06T12:00:03.000Z", payload: { type: "message", role: "assistant", phase: "commentary", content: [{ type: "output_text", text: "working" }], internal_chat_message_metadata_passthrough: { turn_id: "turn-1" } } }),
      JSON.stringify({ type: "event_msg", timestamp: "2026-08-06T12:00:04.000Z", payload: { type: "agent_message", phase: "final_answer", message: "First **done**" } }),
      JSON.stringify({ type: "response_item", timestamp: "2026-08-06T12:00:04.000Z", payload: { type: "message", role: "assistant", phase: "final_answer", content: [{ type: "output_text", text: "First **done**" }], internal_chat_message_metadata_passthrough: { turn_id: "turn-1" } } }),
      JSON.stringify({ type: "event_msg", timestamp: "2026-08-06T12:00:05.000Z", payload: { type: "user_message", message: "再确认一次" } }),
      JSON.stringify({ type: "event_msg", timestamp: "2026-08-06T12:00:06.000Z", payload: { type: "agent_message", phase: "final_answer", message: "Latest result with `code`" } }),
      JSON.stringify({ type: "response_item", timestamp: "2026-08-06T12:00:06.000Z", payload: { type: "message", role: "assistant", phase: "final_answer", content: [{ type: "output_text", text: "Latest result with `code`" }], internal_chat_message_metadata_passthrough: { turn_id: "turn-2" } } }),
      "",
    ].join("\n"), "utf8");

    assert.equal(normalizeSessionId(`local:${id}`), id);
    const result = await readConversationResult(id);
    assert.equal(result.found, true);
    assert.equal(result.messages.length, 5);
    assert.deepEqual(result.messages.map(item => item.role), ["user", "agent", "agent", "user", "agent"]);
    assert.equal(result.messages[0].markdown, "请检查发布状态");
    assert.equal(result.messages[1].phase, "commentary");
    assert.equal(result.messages[2].phase, "final_answer");
    assert.equal(result.markdown, "Latest result with `code`");
    assert.match(result.html, /<code>code<\/code>/);
    assert.match(result.messages[4].html, /<code>code<\/code>/);
  } finally {
    if (previous === undefined) delete process.env.CODEX_HOME;
    else process.env.CODEX_HOME = previous;
    rmSync(codexHome, { recursive: true, force: true });
  }
});

test("readConversationResult drops stale finals from older turns after a newer user message", async () => {
  const codexHome = mkdtempSync(join(tmpdir(), "better-codex-session-stale-"));
  const previous = process.env.CODEX_HOME;
  process.env.CODEX_HOME = codexHome;
  try {
    const id = "019fd856-39e0-7070-a392-6824c6d63cd9";
    const directory = join(codexHome, "sessions", "2026", "08", "07");
    mkdirSync(directory, { recursive: true });
    writeFileSync(join(directory, `rollout-2026-08-07T02-29-17-${id}.jsonl`), [
      JSON.stringify({ type: "event_msg", timestamp: "2026-08-06T18:29:21.000Z", payload: { type: "user_message", message: "开始做角标" } }),
      JSON.stringify({ type: "event_msg", timestamp: "2026-08-06T18:30:00.000Z", payload: { type: "agent_message", phase: "commentary", message: "先做右下角胶囊" } }),
      JSON.stringify({ type: "response_item", timestamp: "2026-08-06T18:30:00.000Z", payload: { type: "message", role: "assistant", phase: "commentary", content: [{ type: "output_text", text: "先做右下角胶囊" }], internal_chat_message_metadata_passthrough: { turn_id: "turn-old" } } }),
      JSON.stringify({ type: "event_msg", timestamp: "2026-08-06T18:35:00.000Z", payload: { type: "agent_message", phase: "final_answer", message: "已完成：右下角角标" } }),
      JSON.stringify({ type: "response_item", timestamp: "2026-08-06T18:35:00.000Z", payload: { type: "message", role: "assistant", phase: "final_answer", content: [{ type: "output_text", text: "已完成：右下角角标" }], internal_chat_message_metadata_passthrough: { turn_id: "turn-old" } } }),
      JSON.stringify({ type: "event_msg", timestamp: "2026-08-06T18:36:00.000Z", payload: { type: "user_message", message: "我要这种效果" } }),
      JSON.stringify({ type: "event_msg", timestamp: "2026-08-06T18:37:00.000Z", payload: { type: "agent_message", phase: "commentary", message: "改成右上角斜切丝带" } }),
      JSON.stringify({ type: "response_item", timestamp: "2026-08-06T18:37:00.000Z", payload: { type: "message", role: "assistant", phase: "commentary", content: [{ type: "output_text", text: "改成右上角斜切丝带" }], internal_chat_message_metadata_passthrough: { turn_id: "turn-new" } } }),
      JSON.stringify({ type: "event_msg", timestamp: "2026-08-06T18:37:19.000Z", payload: { type: "agent_message", phase: "final_answer", message: "已完成：Codex Logo 右下角已增加 better 角标" } }),
      JSON.stringify({ type: "response_item", timestamp: "2026-08-06T18:37:19.000Z", payload: { type: "message", role: "assistant", phase: "final_answer", content: [{ type: "output_text", text: "已完成：Codex Logo 右下角已增加 better 角标" }], internal_chat_message_metadata_passthrough: { turn_id: "turn-old" } } }),
      JSON.stringify({ type: "event_msg", timestamp: "2026-08-06T18:39:00.000Z", payload: { type: "agent_message", phase: "commentary", message: "斜切角标已经替换完成" } }),
      JSON.stringify({ type: "response_item", timestamp: "2026-08-06T18:39:00.000Z", payload: { type: "message", role: "assistant", phase: "commentary", content: [{ type: "output_text", text: "斜切角标已经替换完成" }], internal_chat_message_metadata_passthrough: { turn_id: "turn-new" } } }),
      JSON.stringify({ type: "event_msg", timestamp: "2026-08-06T18:42:00.000Z", payload: { type: "agent_message", phase: "final_answer", message: "已按参考图改成右上角紫色斜切角标" } }),
      JSON.stringify({ type: "response_item", timestamp: "2026-08-06T18:42:00.000Z", payload: { type: "message", role: "assistant", phase: "final_answer", content: [{ type: "output_text", text: "已按参考图改成右上角紫色斜切角标" }], internal_chat_message_metadata_passthrough: { turn_id: "turn-new" } } }),
      "",
    ].join("\n"), "utf8");

    const result = await readConversationResult(id);
    assert.deepEqual(result.messages.map(item => item.markdown), [
      "开始做角标",
      "先做右下角胶囊",
      "已完成：右下角角标",
      "我要这种效果",
      "改成右上角斜切丝带",
      "斜切角标已经替换完成",
      "已按参考图改成右上角紫色斜切角标",
    ]);
    assert.ok(!result.messages.some(item => item.markdown.includes("右下角已增加 better")));
    assert.equal(result.markdown, "已按参考图改成右上角紫色斜切角标");
  } finally {
    if (previous === undefined) delete process.env.CODEX_HOME;
    else process.env.CODEX_HOME = previous;
    rmSync(codexHome, { recursive: true, force: true });
  }
});
