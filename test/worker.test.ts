import assert from "node:assert/strict";
import test from "node:test";
import type { ClaimedIssue } from "../src/db.js";
import { enrichmentMessage, fallbackEnrichment, issuePrompt, parseEnrichment } from "../src/worker.js";

test("enrichment parses current Codex event messages", () => {
  const message = JSON.stringify({
    type: "event_msg",
    payload: {
      type: "agent_message",
      message: '{"title":"编写 Better Codex 微信群冷启动文案","description":"撰写一份简短、礼貌、友好的微信群冷启动文案。"}'
    }
  });
  const parsed = parseEnrichment(enrichmentMessage(message));
  assert.deepEqual(parsed, {
    title: "编写 Better Codex 微信群冷启动文案",
    description: "撰写一份简短、礼貌、友好的微信群冷启动文案。"
  });
});

test("enrichment fallback keeps a concise title separate from the original description", () => {
  assert.deepEqual(fallbackEnrichment(
    "BET-3",
    "帮我写一份简短的微信群冷启动文案,发给AI交流群的群友,要求礼貌,友好"
  ), {
    title: "BET-3",
    description: "帮我写一份简短的微信群冷启动文案,发给AI交流群的群友,要求礼貌,友好"
  });
});

test("worker sends a plain Codex task prompt", () => {
  const claim = {
    runId: "run-1",
    workspacePath: "C:\\workspace",
    issue: {
      identifier: "BCX-12",
      title: "Ship the feature",
      description: "Implement and verify it.",
    },
  } as ClaimedIssue;

  const prompt = issuePrompt(claim);
  assert.equal(prompt, "Implement and verify it.");
  assert.doesNotMatch(prompt, /title: Ship the feature/);
  assert.doesNotMatch(prompt, /<<<BETTER_CODEX_ISSUE_DETAILS>>>/);
  assert.doesNotMatch(prompt, /<<<END_BETTER_CODEX_ISSUE_DETAILS>>>/);
  assert.doesNotMatch(prompt, /不要提交或推送代码/);
  assert.doesNotMatch(prompt, /此 Session 已由 Better Codex Issue 接管/);
  assert.doesNotMatch(prompt, /使用 \$better-codex/);
});
