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
  assert.match(prompt, /\$better-codex/);
  assert.match(prompt, /BCX-12：Ship the feature/);
  assert.match(prompt, /blocked/);
  assert.match(prompt, /in_review/);
  assert.match(prompt, /done/);
  assert.match(prompt, /backlog/);
});
