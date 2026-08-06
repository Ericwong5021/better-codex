import assert from "node:assert/strict";
import test from "node:test";
import type { ClaimedIssue } from "../src/db.js";
import { issuePrompt } from "../src/worker.js";

test("worker injects Better Codex issue management instructions", () => {
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
  assert.match(prompt, /^\/better-codex/m);
  assert.match(prompt, /处理 Better Codex 任务 BCX-12：Ship the feature/);
  assert.match(prompt, /Implement and verify it\./);
  assert.doesNotMatch(prompt, /不要提交或推送代码/);
  assert.doesNotMatch(prompt, /此 Session 已由 Better Codex Issue 接管/);
  assert.doesNotMatch(prompt, /使用 \$better-codex/);
});
