import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { syncAgentProfiles } from "../src/agent-profiles.js";
import type { AgentProfile } from "../src/db.js";

function profile(instructions: string): AgentProfile {
  return {
    id: "b75c3689-dccf-49c9-9581-d7f5dfdaf60d",
    role: "better_codex_b75c3689dccf49c99581d7f5dfdaf60d",
    name: "Test agent",
    description: "",
    instructions,
    model: "gpt-5.6-sol",
    reasoning_effort: "low",
    version: 1,
    created_at: "",
    updated_at: "",
  };
}

test("agent role config omits blank developer instructions", () => {
  const home = mkdtempSync(join(tmpdir(), "better-codex-agent-profile-"));
  try {
    syncAgentProfiles([profile("")], home);

    const role = readFileSync(join(home, "agents", "better-codex", `${profile("").id}.toml`), "utf8");
    const configProfile = readFileSync(join(home, `better-codex-${profile("").id}.config.toml`), "utf8");
    assert.doesNotMatch(role, /developer_instructions/);
    assert.doesNotMatch(configProfile, /developer_instructions/);
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});

test("agent role config preserves non-blank developer instructions", () => {
  const home = mkdtempSync(join(tmpdir(), "better-codex-agent-profile-"));
  try {
    syncAgentProfiles([profile("Review every change.")], home);

    const role = readFileSync(join(home, "agents", "better-codex", `${profile("").id}.toml`), "utf8");
    assert.match(role, /developer_instructions = "Review every change\."/);
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});
