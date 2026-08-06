import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";
import { Store } from "../src/db.js";
import { defaultAgentProfile, updateDefaultAgentProfile } from "../src/agent-profiles.js";
import { readCodexAppearance } from "../src/appearance.js";

function temporaryDatabase() {
  const directory = mkdtempSync(join(tmpdir(), "better-codex-test-"));
  return { directory, file: join(directory, "better-codex.db") };
}

test("Codex appearance reads the active theme surfaces from config.toml", () => {
  const directory = mkdtempSync(join(tmpdir(), "better-codex-appearance-test-"));
  const config = join(directory, "config.toml");
  try {
    writeFileSync(config, [
      "[desktop]",
      'appearanceTheme = "dark"',
      "",
      "[desktop.appearanceLightChromeTheme]",
      'accent = "#339cff"',
      "contrast = 45",
      'ink = "#1a1c1f"',
      'surface = "#ffffff"',
      "",
      "[desktop.appearanceDarkChromeTheme]",
      'accent = "#007acc"',
      "contrast = 50",
      'ink = "#d4d4d4"',
      'surface = "#1e1e1e"',
      "",
    ].join("\n"));
    assert.deepEqual(readCodexAppearance(config), {
      theme: "dark",
      light: { accent: "#339cff", contrast: 45, ink: "#1a1c1f", surface: "#ffffff" },
      dark: { accent: "#007acc", contrast: 50, ink: "#d4d4d4", surface: "#1e1e1e" },
    });
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("default Codex agent reflects the root config.toml model settings", () => {
  const directory = mkdtempSync(join(tmpdir(), "better-codex-agent-test-"));
  const config = join(directory, "config.toml");
  try {
    writeFileSync(config, 'model_provider = "custom"\nmodel = "gpt-5.6-sol"\nmodel_reasoning_effort = "high"\n\n[agents.reviewer]\ndescription = "ignored"\n');
    assert.deepEqual(defaultAgentProfile(config), {
      id: "",
      role: "codex",
      name: "Codex",
      description: "",
      instructions: "使用 Codex 默认配置承接并执行 Better Codex Issue。",
      model: "gpt-5.6-sol",
      reasoning_effort: "high",
      version: 1,
      created_at: "",
      updated_at: "",
      is_default: true,
    });
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("default Codex agent model updates preserve the rest of config.toml", () => {
  const directory = mkdtempSync(join(tmpdir(), "better-codex-default-agent-update-"));
  const config = join(directory, "config.toml");
  try {
    writeFileSync(config, 'model_provider = "custom"\nmodel = "gpt-5.4"\n\n[projects."demo"]\ntrust_level = "trusted"\n');
    const profile = updateDefaultAgentProfile({ model: "gpt-5.6-luna", reasoning_effort: "high" }, config);
    const source = readFileSync(config, "utf8");
    assert.equal(profile.model, "gpt-5.6-luna");
    assert.equal(profile.reasoning_effort, "high");
    assert.match(source, /model_provider = "custom"/);
    assert.match(source, /model = "gpt-5\.6-luna"/);
    assert.match(source, /model_reasoning_effort = "high"/);
    assert.match(source, /\[projects\."demo"\]/);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("core workflow persists, orders status moves, and rejects stale writes", () => {
  const target = temporaryDatabase();
  try {
    let store = new Store(target.file);
    const project = store.createProject({ name: "Core" });
    const active = store.createIssue({ projectId: project.id, title: "Active", status: "in_progress" });
    const first = store.createIssue({ projectId: project.id, title: "First", threadId: "local:thread-1", labels: ["core", "core", " "] });
    const second = store.createIssue({ projectId: project.id, title: "Second" });
    const samePrefixProject = store.createProject({ name: "Core Two" });
    const globallyUnique = store.createIssue({ projectId: samePrefixProject.id, title: "Unique" });

    assert.equal(first.identifier, "COR-2");
    assert.deepEqual(first.labels, ["core"]);
    assert.notEqual(globallyUnique.identifier, active.identifier);
    assert.ok(second.sort_order > first.sort_order);

    const moved = store.updateIssue(first.id, first.version, { status: "in_progress", description: "" });
    assert.equal(moved.status, "in_progress");
    assert.equal(moved.description, "");
    assert.ok(moved.sort_order > active.sort_order);
    assert.throws(() => store.updateIssue(first.id, first.version, { title: "Stale" }), /version_conflict/);
    assert.throws(() => store.updateIssue(second.id, second.version, { title: " " }), /title_required/);
    assert.equal(store.listIssues({ projectId: project.id, search: "thread-1" }).length, 1);
    const archived = store.archiveIssue(second.id, second.version);
    assert.ok(archived.archived_at);
    assert.equal(store.listIssues({ projectId: project.id }).some(issue => issue.id === second.id), false);

    store.close();
    store = new Store(target.file);
    const restored = store.getIssue(first.id);
    assert.equal(restored?.status, "in_progress");
    assert.equal(restored?.thread_id, "local:thread-1");
    assert.equal(store.health().schemaVersion, 2);
    store.close();
  } finally {
    rmSync(target.directory, { recursive: true, force: true });
  }
});

test("issue assignee can be the current user or an agent", () => {
  const target = temporaryDatabase();
  try {
    const store = new Store(target.file);
    const project = store.createProject({ name: "Owners", workspacePath: target.directory });
    const profile = store.createAgentProfile({ name: "Helper", description: "", instructions: "", model: "gpt-test", reasoning_effort: "medium" });
    const issue = store.createIssue({ projectId: project.id, title: "Owned" });
    assert.equal(issue.user_assigned, false);
    assert.equal(issue.agent_enabled, false);

    const mine = store.updateIssue(issue.id, issue.version, { user_assigned: true });
    assert.equal(mine.user_assigned, true);
    assert.equal(mine.agent_enabled, false);
    assert.equal(mine.agent_id, null);
    assert.equal(mine.pending_actor, "user");

    const agentOwned = store.updateIssue(mine.id, mine.version, { agent_enabled: true, agent_id: profile.id });
    assert.equal(agentOwned.user_assigned, false);
    assert.equal(agentOwned.agent_enabled, true);
    assert.equal(agentOwned.agent_id, profile.id);

    const cleared = store.updateIssue(agentOwned.id, agentOwned.version, { user_assigned: false, agent_enabled: false });
    assert.equal(cleared.user_assigned, false);
    assert.equal(cleared.agent_enabled, false);
    assert.equal(cleared.agent_id, null);

    const createdMine = store.createIssue({ projectId: project.id, title: "Mine", userAssigned: true });
    assert.equal(createdMine.user_assigned, true);
    assert.equal(createdMine.agent_enabled, false);

    const createdAgent = store.createIssue({ projectId: project.id, title: "Agent", agentEnabled: true, agentId: profile.id });
    assert.equal(createdAgent.user_assigned, false);
    assert.equal(createdAgent.agent_enabled, true);
    assert.equal(createdAgent.agent_id, profile.id);
    store.close();
  } finally {
    rmSync(target.directory, { recursive: true, force: true });
  }
});

test("auto-dispatch claims only attentive agent-owned issues outside backlog", () => {
  const target = temporaryDatabase();
  try {
    const store = new Store(target.file);
    const project = store.createProject({ name: "Dispatch", workspacePath: target.directory });
    const profile = store.createAgentProfile({ name: "Runner", description: "", instructions: "", model: "gpt-test", reasoning_effort: "medium" });

    assert.equal(store.getAutoDispatch(), false);
    const quiet = store.createIssue({
      projectId: project.id,
      title: "Quiet",
      description: "ready",
      status: "todo",
      agentEnabled: true,
      agentId: profile.id,
      workspacePath: target.directory,
    });
    assert.equal(quiet.needs_attention, true);
    assert.equal(quiet.pending_actor, "agent");
    assert.equal(store.claimNextIssue(), null);

    store.setAutoDispatch(true);
    const backlog = store.createIssue({
      projectId: project.id,
      title: "Backlog",
      description: "plan later",
      status: "backlog",
      agentEnabled: true,
      agentId: profile.id,
      workspacePath: target.directory,
    });
    assert.equal(backlog.needs_attention, false);
    assert.equal(backlog.pending_actor, "agent");

    const userOwned = store.updateIssue(quiet.id, quiet.version, { pending_actor: "user", needs_attention: true });
    assert.equal(store.claimNextIssue(), null);

    const ready = store.updateIssue(userOwned.id, userOwned.version, { pending_actor: "agent", needs_attention: true });
    const claimed = store.claimNextIssue();
    assert.equal(claimed?.issue.id, ready.id);
    assert.equal(claimed?.issue.status, "in_progress");
    assert.equal(claimed?.issue.needs_attention, false);
    assert.equal(store.claimNextIssue(), null);

    store.finishRun(claimed!.runId, claimed!.issue.id, true);
    const finished = store.getIssue(ready.id)!;
    assert.equal(finished.status, "in_review");
    assert.equal(finished.needs_attention, true);
    assert.equal(finished.pending_actor, "user");
    assert.equal(store.claimNextIssue(), null);

    store.close();
  } finally {
    rmSync(target.directory, { recursive: true, force: true });
  }
});

test("agent avatars persist independently and are removed with their profile", () => {
  const target = temporaryDatabase();
  try {
    let store = new Store(target.file);
    const profile = store.createAgentProfile({ name: "Avatar", description: "", instructions: "", model: "gpt-test", reasoning_effort: "medium" });
    const avatar = "data:image/webp;base64,UklGRg==";
    store.setAgentAvatar("default", avatar);
    store.setAgentAvatar(profile.id, avatar);
    store.close();

    store = new Store(target.file);
    assert.equal(store.getAgentAvatar("default"), avatar);
    assert.equal(store.getAgentAvatar(profile.id), avatar);
    store.deleteAgentProfile(profile.id, profile.version);
    assert.equal(store.getAgentAvatar(profile.id), "");
    store.close();
  } finally {
    rmSync(target.directory, { recursive: true, force: true });
  }
});

test("newer database schema is rejected without migration", () => {
  const target = temporaryDatabase();
  try {
    const future = new DatabaseSync(target.file);
    future.exec("CREATE TABLE schema_migrations (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL); INSERT INTO schema_migrations VALUES (3, '2026-01-01T00:00:00.000Z')");
    future.close();
    assert.throws(() => new Store(target.file), /database_schema_too_new/);
  } finally {
    rmSync(target.directory, { recursive: true, force: true });
  }
});

test("legacy database is backed up before migration", () => {
  const target = temporaryDatabase();
  try {
    const legacy = new DatabaseSync(target.file);
    legacy.exec(`
      CREATE TABLE projects (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        workspace_path TEXT NOT NULL DEFAULT '',
        default_branch TEXT NOT NULL DEFAULT 'main',
        created_at TEXT NOT NULL
      );
      CREATE TABLE issues (
        id TEXT PRIMARY KEY,
        identifier TEXT NOT NULL UNIQUE,
        project_id TEXT NOT NULL REFERENCES projects(id),
        title TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL DEFAULT 'todo',
        priority TEXT NOT NULL DEFAULT 'medium',
        labels_json TEXT NOT NULL DEFAULT '[]',
        sort_order REAL NOT NULL,
        pinned INTEGER NOT NULL DEFAULT 0,
        archived_at TEXT,
        thread_id TEXT,
        workspace_path TEXT,
        version INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      INSERT INTO projects (id, name, workspace_path, default_branch, created_at)
      VALUES ('legacy', 'Legacy', '', 'main', '2026-01-01T00:00:00.000Z');
    `);
    legacy.close();

    const store = new Store(target.file);
    assert.equal(store.health().schemaVersion, 2);
    assert.ok(store.lastBackupPath);
    assert.ok(existsSync(store.lastBackupPath!));
    assert.equal(store.getProject("legacy")?.name, "Legacy");
    store.close();
  } finally {
    rmSync(target.directory, { recursive: true, force: true });
  }
});
