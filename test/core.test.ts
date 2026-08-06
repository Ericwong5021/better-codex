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
      description: "默认智能体，直接读取 config.toml",
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
