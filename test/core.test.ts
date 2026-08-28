import assert from "node:assert/strict";
import { appendFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";
import { issueStatuses, Store } from "../src/db.js";
import { IssueWorker } from "../src/worker.js";
import { defaultAgentProfile, updateDefaultAgentProfile } from "../src/agent-profiles.js";
import { readCodexAppearance } from "../src/appearance.js";
import { readCodexActivity, startCodexActivityCollection, stopCodexActivityCollection } from "../src/codex-activity.js";
import { SessionHostTransport, sessionHostDeliveryHash } from "../src/session-host-transport.js";
import { SessionHostLineDecoder } from "../src/session-host-stream.js";

function temporaryDatabase() {
  const directory = mkdtempSync(join(tmpdir(), "better-codex-test-"));
  return { directory, file: join(directory, "better-codex.db") };
}

test("syncing an existing Codex project backfills its source creation time", () => {
  const target = temporaryDatabase();
  let store: Store | undefined;
  try {
    store = new Store(target.file);
    const project = store.ensureProject({
      externalId: "codex-project",
      name: "Codex project",
      workspacePath: target.directory,
    });
    const sourceCreatedAt = "2026-07-15T08:30:00.000Z";

    const synced = store.ensureProject({
      externalId: project.external_id!,
      name: project.name,
      workspacePath: project.workspace_path,
      createdAt: sourceCreatedAt,
    } as Parameters<Store["ensureProject"]>[0]);

    assert.equal(synced.id, project.id);
    assert.equal(synced.created_at, sourceCreatedAt);
  } finally {
    store?.close();
    rmSync(target.directory, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 });
  }
});

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
      "[desktop.appearanceLightChromeTheme.fonts]",
      'ui = "Inter, sans-serif"',
      "",
      "[desktop.appearanceDarkChromeTheme]",
      'accent = "#007acc"',
      "contrast = 50",
      'ink = "#d4d4d4"',
      'surface = "#1e1e1e"',
      "",
      "[desktop.appearanceDarkChromeTheme.fonts]",
      'ui = "Geist, Inter"',
      "",
    ].join("\n"));
    assert.deepEqual(readCodexAppearance(config), {
      theme: "dark",
      light: { accent: "#339cff", contrast: 45, ink: "#1a1c1f", surface: "#ffffff", uiFont: "Inter, sans-serif" },
      dark: { accent: "#007acc", contrast: 50, ink: "#d4d4d4", surface: "#1e1e1e", uiFont: "Geist, Inter" },
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
      service_tier: "default",
      sandbox_mode: "workspace-write",
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

    const enriching = store.createIssue({
      projectId: project.id,
      title: "原始需求",
      description: "原始需求",
      agentEnabled: true,
      workspacePath: target.directory,
      status: "backlog",
      enrichmentStatus: "pending",
    });
    assert.equal(enriching.title, "原始需求");
    assert.equal(enriching.status, "todo");
    assert.equal(enriching.enrichment_status, "pending");
    assert.equal(store.isDispatchable(enriching), true);
    const enrichmentClaim = store.claimNextIssue(enriching.id);
    assert.equal(enrichmentClaim?.issue.status, "todo");
    assert.equal(enrichmentClaim?.issue.enrichment_status, "pending");
    const enriched = store.updateIssue(enriching.id, enrichmentClaim!.issue.version, {
      title: "整理后的标题",
      enrichment_status: null,
    });
    assert.equal(enriched.title, "整理后的标题");
    assert.equal(enriched.enrichment_status, null);
    store.finishRun(enrichmentClaim!.runId, enriching.id, true);

    const reassigned = store.updateIssue(second.id, second.version, { project_id: samePrefixProject.id });
    assert.equal(reassigned.project_id, samePrefixProject.id);
    assert.ok(reassigned.sort_order > globallyUnique.sort_order);

    const moved = store.updateIssue(first.id, first.version, { status: "in_progress", description: "" });
    assert.equal(moved.status, "in_progress");
    assert.equal(moved.description, "");
    assert.ok(moved.sort_order > active.sort_order);
    assert.throws(() => store.updateIssue(first.id, first.version, { title: "Stale" }), /version_conflict/);
    assert.throws(() => store.updateIssue(second.id, second.version, { title: " " }), /title_required/);
    assert.equal(store.listIssues({ projectId: project.id, search: "thread-1" }).length, 1);
    const archived = store.archiveIssue(reassigned.id, reassigned.version);
    assert.ok(archived.archived_at);
    assert.equal(store.listIssues({ projectId: project.id }).some(issue => issue.id === second.id), false);

    store.close();
    store = new Store(target.file);
    const restored = store.getIssue(first.id);
    assert.equal(restored?.status, "in_progress");
    assert.equal(restored?.thread_id, "local:thread-1");
    assert.equal(store.health().schemaVersion, 25);
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
    assert.equal(agentOwned.pending_actor, "user");
    assert.equal(agentOwned.needs_attention, true);
    assert.equal(store.isDispatchable(agentOwned), false);

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

test("manual mode requires an explicit issue start", () => {
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
    const initialClaim = store.claimNextIssue(quiet.id);
    assert.equal(initialClaim?.issue.id, quiet.id);
    store.finishRun(initialClaim!.runId, quiet.id, true);

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

    const reopened = store.updateIssue(backlog.id, backlog.version, { status: "todo" });
    assert.equal(reopened.needs_attention, true);
    const backlogClaim = store.claimNextIssue();
    assert.equal(backlogClaim?.issue.id, backlog.id);
    store.finishRun(backlogClaim!.runId, backlog.id, true);

    const userOwned = store.updateIssue(quiet.id, store.getIssue(quiet.id)!.version, { pending_actor: "user", needs_attention: true });
    assert.equal(store.claimNextIssue(), null);

    const ready = store.updateIssue(userOwned.id, userOwned.version, { pending_actor: "agent", needs_attention: true });
    const claimed = store.claimNextIssue();
    assert.equal(claimed?.issue.id, ready.id);
    assert.equal(claimed?.issue.status, "in_review");
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

test("user messages only auto-start non-backlog issues in automatic mode", () => {
  const target = temporaryDatabase();
  try {
    const store = new Store(target.file);
    const project = store.createProject({ name: "Reply dispatch", workspacePath: target.directory });
    const todo = store.createIssue({ projectId: project.id, title: "Todo", status: "todo" });
    const backlog = store.createIssue({ projectId: project.id, title: "Backlog", status: "backlog" });

    assert.equal(store.canAutoStartFromUserMessage(todo), false);
    store.setAutoDispatch(true);
    assert.equal(store.canAutoStartFromUserMessage(todo), true);
    assert.equal(store.canAutoStartFromUserMessage(backlog), false);

    store.close();
  } finally {
    rmSync(target.directory, { recursive: true, force: true });
  }
});

test("deleting an agent unassigns its issues", () => {
  const target = temporaryDatabase();
  try {
    const store = new Store(target.file);
    const project = store.createProject({ name: "Delete assignment", workspacePath: target.directory });
    const profile = store.createAgentProfile({ name: "Temporary", description: "", instructions: "", model: "gpt-test", reasoning_effort: "medium" });
    const issue = store.createIssue({
      projectId: project.id,
      title: "Assigned issue",
      status: "todo",
      agentEnabled: true,
      agentId: profile.id,
      workspacePath: target.directory,
    });

    store.deleteAgentProfile(profile.id, profile.version);

    const unassigned = store.getIssue(issue.id)!;
    assert.equal(unassigned.agent_enabled, false);
    assert.equal(unassigned.agent_id, null);
    assert.equal(unassigned.user_assigned, false);
    assert.equal(unassigned.needs_attention, false);
    assert.equal(unassigned.pending_actor, "user");
    assert.equal(store.claimNextIssue(), null);
    store.close();
  } finally {
    rmSync(target.directory, { recursive: true, force: true });
  }
});

test("auto-dispatch queues per-agent by max_concurrency", () => {
  const target = temporaryDatabase();
  try {
    const store = new Store(target.file);
    const project = store.createProject({ name: "Concurrency", workspacePath: target.directory });
    const limited = store.createAgentProfile({ name: "Limited", description: "", instructions: "", model: "gpt-test", reasoning_effort: "medium", max_concurrency: 2 });
    const unset = store.createAgentProfile({ name: "Unset", description: "", instructions: "", model: "gpt-test", reasoning_effort: "medium" });
    assert.equal(unset.max_concurrency, 5);
    store.setAutoDispatch(true);

    const createFor = (title: string, agentId?: string) => store.createIssue({
      projectId: project.id,
      title,
      status: "todo",
      agentEnabled: true,
      agentId,
      workspacePath: target.directory,
    });
    createFor("Limited 1", limited.id);
    createFor("Limited 2", limited.id);
    createFor("Limited 3", limited.id);

    const first = store.claimNextIssue();
    const second = store.claimNextIssue();
    assert.ok(first && second);
    assert.equal(first.issue.agent_id, limited.id);
    assert.equal(second.issue.agent_id, limited.id);
    // Limited agent is at capacity: its third issue must wait.
    assert.equal(store.claimNextIssue(), null);

    // Other agents keep their own budget while Limited is saturated.
    createFor("Unset 1", unset.id);
    const other = store.claimNextIssue();
    assert.equal(other?.issue.agent_id, unset.id);

    // Default Codex profile (no agent_id) is its own bucket too.
    store.setDefaultAgentMaxConcurrency(1);
    createFor("Default 1");
    createFor("Default 2");
    const defaultClaim = store.claimNextIssue();
    assert.equal(defaultClaim?.issue.agent_id, null);
    assert.equal(store.claimNextIssue(), null);

    // Finishing a run frees one slot for the queued issue.
    store.finishRun(first.runId, first.issue.id, true);
    const third = store.claimNextIssue();
    assert.equal(third?.issue.agent_id, limited.id);
    assert.equal(third?.issue.title, "Limited 3");
    store.close();
  } finally {
    rmSync(target.directory, { recursive: true, force: true });
  }
});

test("an issue re-armed mid-run is not claimed twice concurrently", () => {
  const target = temporaryDatabase();
  try {
    const store = new Store(target.file);
    const project = store.createProject({ name: "Rearm", workspacePath: target.directory });
    const profile = store.createAgentProfile({ name: "Runner", description: "", instructions: "", model: "gpt-test", reasoning_effort: "medium" });
    store.setAutoDispatch(true);
    const issue = store.createIssue({
      projectId: project.id,
      title: "Rearmed",
      status: "todo",
      agentEnabled: true,
      agentId: profile.id,
      workspacePath: target.directory,
    });
    const claimed = store.claimNextIssue();
    assert.equal(claimed?.issue.id, issue.id);
    // Simulate the agent skill re-queueing the issue while its run is active.
    store.updateIssue(claimed!.issue.id, claimed!.issue.version, { status: "todo", needs_attention: true, pending_actor: "agent" });
    assert.equal(store.claimNextIssue(), null);
    store.finishRun(claimed!.runId, claimed!.issue.id, true);
    const reclaimed = store.claimNextIssue();
    assert.equal(reclaimed?.issue.id, issue.id);
    store.close();
  } finally {
    rmSync(target.directory, { recursive: true, force: true });
  }
});

test("opening the store does not re-arm resting user-owned agent issues", () => {
  const target = temporaryDatabase();
  try {
    let store = new Store(target.file);
    const project = store.createProject({ name: "Resting", workspacePath: target.directory });
    const profile = store.createAgentProfile({ name: "Runner", description: "", instructions: "", model: "gpt-test", reasoning_effort: "medium" });
    store.setAutoDispatch(true);
    const issue = store.createIssue({
      projectId: project.id,
      title: "Reviewed",
      status: "in_review",
      agentEnabled: true,
      agentId: profile.id,
      workspacePath: target.directory,
    });
    const resting = store.updateIssue(issue.id, issue.version, { pending_actor: "user", needs_attention: false });
    assert.equal(resting.needs_attention, false);
    assert.equal(resting.pending_actor, "user");
    assert.equal(store.claimNextIssue(), null);
    store.close();

    store = new Store(target.file);
    store.setAutoDispatch(true);
    const reopened = store.getIssue(resting.id)!;
    assert.equal(reopened.needs_attention, false);
    assert.equal(reopened.pending_actor, "user");
    assert.equal(store.claimNextIssue(), null);
    store.close();
  } finally {
    rmSync(target.directory, { recursive: true, force: true });
  }
});

test("execution failures hand back for review and do not become task blockers", () => {
  const target = temporaryDatabase();
  try {
    const store = new Store(target.file);
    const project = store.createProject({ name: "Fail", workspacePath: target.directory });
    const profile = store.createAgentProfile({ name: "Runner", description: "", instructions: "", model: "gpt-test", reasoning_effort: "medium" });
    store.setAutoDispatch(true);
    const issue = store.createIssue({
      projectId: project.id,
      title: "Boom",
      status: "todo",
      agentEnabled: true,
      agentId: profile.id,
      workspacePath: target.directory,
    });
    const claimed = store.claimNextIssue();
    assert.equal(claimed?.issue.id, issue.id);
    store.finishRun(claimed!.runId, claimed!.issue.id, false, "codex_exit_1");
    const failed = store.getIssue(issue.id)!;
    assert.equal(failed.status, "in_review");
    assert.equal(failed.needs_attention, true);
    assert.equal(failed.pending_actor, "user");
    assert.equal(store.claimNextIssue(), null);

    const scheduledIssue = store.createIssue({
      projectId: project.id,
      title: "Capacity failure",
      status: "todo",
      agentEnabled: true,
      agentId: profile.id,
      workspacePath: target.directory,
    });
    const scheduledClaim = store.claimNextIssue(scheduledIssue.id)!;
    store.beginScheduling(scheduledClaim.runId, scheduledIssue.id, false, "Selected model is at capacity. Please try a different model.");
    assert.equal(store.finalizeScheduler(scheduledClaim.runId, scheduledIssue.id, false, {
      status: "in_review",
      reason: "Agent did not report a task blocker",
      evidence: ["Work remains incomplete"],
    }), "in_review");
    const reviewed = store.getIssue(scheduledIssue.id)!;
    assert.equal(reviewed.status, "in_review");
    assert.equal(reviewed.latest_run_status, "failed");
    assert.equal(reviewed.latest_scheduler_status, "completed");
    assert.equal(reviewed.latest_scheduler_error, null);
    assert.equal(store.claimNextIssue(), null);
    store.close();
  } finally {
    rmSync(target.directory, { recursive: true, force: true });
  }
});

test("finishRun keeps board updates already made by the agent skill", () => {
  const target = temporaryDatabase();
  try {
    const store = new Store(target.file);
    const project = store.createProject({ name: "Skill", workspacePath: target.directory });
    const profile = store.createAgentProfile({ name: "Runner", description: "", instructions: "", model: "gpt-test", reasoning_effort: "medium" });
    store.setAutoDispatch(true);

    const doneIssue = store.createIssue({
      projectId: project.id,
      title: "Done by skill",
      status: "todo",
      agentEnabled: true,
      agentId: profile.id,
      workspacePath: target.directory,
    });
    const doneClaim = store.claimNextIssue();
    assert.equal(doneClaim?.issue.id, doneIssue.id);
    store.updateIssue(doneClaim!.issue.id, doneClaim!.issue.version, { status: "done", needs_attention: false, pending_actor: "user" });
    store.finishRun(doneClaim!.runId, doneClaim!.issue.id, true);
    const done = store.getIssue(doneIssue.id)!;
    assert.equal(done.status, "done");
    assert.equal(done.needs_attention, false);
    assert.equal(done.pending_actor, "user");
    assert.equal(store.claimNextIssue(), null);

    const retryIssue = store.createIssue({
      projectId: project.id,
      title: "Retry by skill",
      status: "todo",
      agentEnabled: true,
      agentId: profile.id,
      workspacePath: target.directory,
    });
    const retryClaim = store.claimNextIssue();
    assert.equal(retryClaim?.issue.id, retryIssue.id);
    store.updateIssue(retryClaim!.issue.id, retryClaim!.issue.version, { status: "todo", needs_attention: true, pending_actor: "agent" });
    store.finishRun(retryClaim!.runId, retryClaim!.issue.id, true);
    const retry = store.getIssue(retryIssue.id)!;
    assert.equal(retry.status, "todo");
    assert.equal(retry.needs_attention, true);
    assert.equal(retry.pending_actor, "agent");
    const reclaimed = store.claimNextIssue();
    assert.equal(reclaimed?.issue.id, retryIssue.id);
    store.finishRun(reclaimed!.runId, reclaimed!.issue.id, true);
    store.close();
  } finally {
    rmSync(target.directory, { recursive: true, force: true });
  }
});

test("user-stopped runs move to blocked and hand control back to the user", () => {
  const target = temporaryDatabase();
  try {
    const store = new Store(target.file);
    const project = store.createProject({ name: "Interrupt", workspacePath: target.directory });
    const profile = store.createAgentProfile({ name: "Runner", description: "", instructions: "", model: "gpt-test", reasoning_effort: "medium" });
    store.setAutoDispatch(true);
    const issue = store.createIssue({
      projectId: project.id,
      title: "Stopped",
      status: "todo",
      agentEnabled: true,
      agentId: profile.id,
      workspacePath: target.directory,
    });
    const claimed = store.claimNextIssue();
    assert.equal(claimed?.issue.id, issue.id);
    store.interruptRun(claimed!.runId, claimed!.issue.id);
    const stopped = store.getIssue(issue.id)!;
    assert.equal(stopped.status, "blocked");
    assert.equal(stopped.latest_run_status, "interrupted");
    assert.equal(stopped.needs_attention, true);
    assert.equal(stopped.pending_actor, "user");
    assert.equal(store.claimNextIssue(), null);
    store.close();
  } finally {
    rmSync(target.directory, { recursive: true, force: true });
  }
});

test("an interrupted native session observed by polling moves to blocked", () => {
  const target = temporaryDatabase();
  try {
    const store = new Store(target.file);
    const project = store.createProject({ name: "Observed stop", workspacePath: target.directory });
    const issue = store.createIssue({ projectId: project.id, title: "Stopped in Codex", status: "in_progress", agentEnabled: true, workspacePath: target.directory });
    const threadId = "019fec06-788f-7af3-a031-76b546904ef0";
    const startedAt = new Date(Date.now() + 1000).toISOString();
    const completedAt = new Date(Date.now() + 2000).toISOString();
    store.db.prepare(`
      INSERT INTO issue_runs (id, issue_id, status, thread_id, started_at, finished_at, execution_mode)
      VALUES (?, ?, 'completed', ?, ?, ?, 'desktop')
    `).run("019fec06-788f-7af3-a031-76b546904ef1", issue.id, threadId, startedAt, completedAt);

    assert.equal(store.syncSessionReply(issue.id, threadId, {
      status: "interrupted",
      turn_id: "019fec06-788f-7af3-a031-76b546904ef2",
      started_at: startedAt,
      completed_at: completedAt,
      updated_at: completedAt,
    }), true);
    const stopped = store.getIssue(issue.id)!;
    assert.equal(stopped.status, "blocked");
    assert.equal(store.getIssueReplyState(issue.id).status, "interrupted");
    assert.equal(stopped.needs_attention, true);
    assert.equal(stopped.pending_actor, "user");
    store.close();
  } finally {
    rmSync(target.directory, { recursive: true, force: true });
  }
});

test("auto-dispatch skips agent issues until a project workspace is bound", () => {
  const target = temporaryDatabase();
  try {
    const store = new Store(target.file);
    const project = store.createProject({
      name: "Empty Workspace",
      externalId: "external-empty",
      workspacePath: "",
    });
    const profile = store.createAgentProfile({ name: "Runner", description: "", instructions: "", model: "gpt-test", reasoning_effort: "medium" });
    store.setAutoDispatch(true);
    const issue = store.createIssue({
      projectId: project.id,
      title: "Needs cwd",
      status: "todo",
      agentEnabled: true,
      agentId: profile.id,
    });
    assert.equal(issue.needs_attention, true);
    assert.equal(issue.pending_actor, "agent");
    assert.equal(store.claimNextIssue(), null);

    const bound = store.ensureProject({
      externalId: "external-empty",
      name: "Empty Workspace",
      workspacePath: target.directory,
    });
    assert.equal(bound.workspace_path, target.directory);
    const claimed = store.claimNextIssue();
    assert.equal(claimed?.issue.id, issue.id);
    assert.equal(claimed?.workspacePath, target.directory);
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

test("desktop session relay binds one native thread and tracks its turn", async () => {
  const target = temporaryDatabase();
  const previousCodexHome = process.env.CODEX_HOME;
  const previousDisableSessionRelay = process.env.BETTER_CODEX_DISABLE_RUNTIME_SESSION_RELAY;
  let worker: IssueWorker | undefined;
  try {
    process.env.CODEX_HOME = join(target.directory, "codex");
    process.env.BETTER_CODEX_DISABLE_RUNTIME_SESSION_RELAY = "1";
    let store = new Store(target.file);
    worker = new IssueWorker(store);
    const project = store.createProject({ name: "Native session", workspacePath: target.directory });
    const issue = store.createIssue({
      projectId: project.id,
      title: "Use the desktop thread",
      description: "Implement it",
      status: "todo",
      agentEnabled: true,
      workspacePath: target.directory,
    });
    const claim = store.claimNextIssue(issue.id)!;
    assert.equal(claim.issue.status, "todo");
    const command = store.enqueueSessionCommand({
      issueId: issue.id,
      runId: claim.runId,
      requestId: `run:${claim.runId}`,
      kind: "start",
      payload: { message: issue.description, workspace_path: target.directory },
    });
    assert.equal(store.getIssue(issue.id)?.session_thread_id, null);
    assert.equal(store.heartbeatSessionRelay("relay-a", "app-a", null).leader, true);
    assert.equal(store.heartbeatSessionRelay("relay-b", "app-b", null).leader, false);
    assert.equal(store.claimSessionCommand("relay-a")?.id, command.id);
    const threadId = "019fec06-788f-7af3-a031-76b546904fe6";
    const turnId = "019fec06-788f-7af3-a031-76b546904fe7";
    assert.equal(store.sessionTurnStarted(threadId, turnId), undefined);
    assert.equal(store.getSessionCommand(command.id)?.turn_id, null);
    worker.checkpointSessionCommand(command.id, "relay-a", { thread_id: threadId });
    assert.equal(store.getIssue(issue.id)?.session_thread_id, threadId);
    assert.equal(store.getIssue(issue.id)?.status, "todo");
    worker.checkpointSessionCommand(command.id, "relay-a", { thread_id: threadId, turn_id: turnId });
    assert.equal(store.getIssue(issue.id)?.status, "in_progress");
    worker.completeSessionCommand(command.id, "relay-a", { thread_id: threadId, turn_id: turnId });
    const rename = store.claimSessionCommand("relay-a")!;
    assert.equal(rename.kind, "rename");
    assert.equal(rename.thread_id, threadId);
    assert.equal(rename.payload.title, `${issue.identifier} ${issue.title}`);
    worker.completeSessionCommand(rename.id, "relay-a", { thread_id: threadId });
    assert.equal(store.sessionTurnStarted(threadId, turnId)?.issue_id, issue.id);
    const linked = store.getIssue(issue.id)!;
    assert.equal(linked.session_owned, true);
    assert.equal(linked.session_thread_id, threadId);
    assert.equal(linked.run_thread_id, threadId);
    assert.equal(linked.session_active_turn_id, turnId);
    assert.equal(linked.active_run_status, "running");
    assert.throws(() => store.assertIssueSessionHandoffReady(issue.id, threadId), /thread_handoff_busy/);
    assert.throws(() => store.handoffIssueSession(issue.id, threadId), /thread_handoff_busy/);
    assert.deepEqual(worker.pollSessionRelay("relay-a", "app-a", "ready").active_turns, [{ thread_id: threadId, turn_id: turnId }]);
    assert.equal(store.syncSessionThreadStatus(threadId, "active", ["waitingOnApproval"]), true);
    assert.equal(store.getIssue(issue.id)?.pending_actor, "user");
    assert.equal(store.syncSessionThreadStatus(threadId, "active"), true);
    assert.equal(store.getIssue(issue.id)?.pending_actor, "agent");
    assert.equal(worker.handleSessionEvent("error", { threadId, turnId, willRetry: true, error: { kind: "network", code: "httpConnectionFailed", httpStatusCode: null, message: "connection lost" } }), true);
    assert.equal(worker.handleSessionEvent("error", { threadId, turnId, willRetry: true, error: { kind: "network", code: "httpConnectionFailed", httpStatusCode: null, message: "connection lost" } }), true);
    assert.equal(store.getIssue(issue.id)?.status, "in_progress");
    assert.deepEqual(store.getIssue(issue.id)?.session_retry, {
      kind: "network",
      count: 2,
      started_at: store.getIssue(issue.id)?.session_retry?.started_at,
      updated_at: store.getIssue(issue.id)?.session_retry?.updated_at,
      http_status: null,
    });
    assert.equal((store.syncProjection("issue", issue.id) as { session_retry?: { count: number } }).session_retry?.count, 2);
    assert.equal(worker.handleSessionEvent("item/started", { threadId, turnId, item: { type: "commandExecution" } }), true);
    assert.equal(store.getIssue(issue.id)?.session_retry, null);
    assert.equal(store.recordSessionAgentMessage(threadId, turnId, "Finished"), true);
    const completion = store.completeSessionTurn(threadId, turnId, "completed")!;
    assert.equal(completion.run_id, claim.runId);
    assert.equal(completion.message, "Finished");
    assert.equal(completion.should_schedule, true);
    assert.equal(store.getIssue(issue.id)?.session_status, "idle");
    assert.equal(store.getIssue(issue.id)?.active_run_status, "scheduling");
    assert.equal(store.listPendingSchedulerRuns()[0]?.executionResult, "Finished");
    store.close();
    store = new Store(target.file);
    assert.equal(store.getIssueSession(issue.id)?.active_turn_id, null);
    assert.equal(store.getIssue(issue.id)?.active_run_status, "scheduling");
    assert.equal(store.listPendingSchedulerRuns()[0]?.executionResult, "Finished");
    assert.equal(store.assertIssueSessionHandoffReady(issue.id, threadId).run_thread_id, threadId);
    store.finalizeScheduler(claim.runId, issue.id, true, { status: "done", reason: "Finished", evidence: ["Finished"] });
    const handedOff = store.handoffIssueSession(issue.id, threadId);
    assert.equal(handedOff.run_thread_id, threadId);
    assert.equal(handedOff.session_owned, false);
    assert.ok(handedOff.session_handoff_at);
    assert.equal(store.getIssueSession(issue.id)?.thread_id, threadId);
    assert.deepEqual(store.listSessionThreadIds(), []);
    store.db.prepare("DELETE FROM issue_sessions WHERE issue_id = ?").run(issue.id);
    store.close();
    store = new Store(target.file);
    assert.equal(store.getIssueSession(issue.id)?.thread_id, threadId);
    assert.equal(store.getIssueSession(issue.id)?.last_turn_id, turnId);
    assert.equal(store.getIssue(issue.id)?.session_owned, false);

    const sessionDirectory = join(process.env.CODEX_HOME, "sessions", "2026", "08", "27");
    mkdirSync(sessionDirectory, { recursive: true });
    const rolloutPath = join(sessionDirectory, `rollout-2026-08-27T00-00-00-${threadId}.jsonl`);
    const nativeTurnId = "019fec06-788f-7af3-a031-76b546904ff8";
    const handoffAt = Date.parse(store.getIssue(issue.id)?.session_handoff_at || "");
    const nativeStartedAt = new Date(handoffAt + 1000).toISOString();
    const nativeCompletedAt = new Date(handoffAt + 2000).toISOString();
    startCodexActivityCollection();
    worker = new IssueWorker(store);
    worker.start();
    const oversizedRecord = JSON.stringify({ type: "response_item", timestamp: nativeStartedAt, payload: { type: "custom_tool_call", input: "x".repeat(1024 * 1024) } });
    writeFileSync(rolloutPath, `${oversizedRecord}\n${JSON.stringify({ type: "event_msg", timestamp: nativeStartedAt, payload: { type: "task_started", turn_id: nativeTurnId } })}\n`);
    const waitFor = async (predicate: () => boolean) => {
      const deadline = Date.now() + 5000;
      while (Date.now() < deadline) {
        if (predicate()) return;
        await new Promise(resolve => setTimeout(resolve, 25));
      }
      assert.fail("session_sync_timeout");
    };
    await waitFor(() => readCodexActivity().errors.includes("codex_activity_line_too_large"));
    await waitFor(() => store.getIssue(issue.id)?.status === "in_progress" && store.getIssueReplyState(issue.id).status === "running");
    assert.equal(store.getIssue(issue.id)?.session_owned, false);
    assert.equal(store.getIssueSession(issue.id)?.active_turn_id, nativeTurnId);
    appendFileSync(rolloutPath, `${JSON.stringify({ type: "event_msg", timestamp: nativeCompletedAt, payload: { type: "task_complete", turn_id: nativeTurnId, last_agent_message: "Native reply" } })}\n`);
    await waitFor(() => store.getIssueReplyState(issue.id).status === "succeeded");
    assert.equal(store.getIssue(issue.id)?.status, "in_review");
    assert.equal(store.getIssueSession(issue.id)?.active_turn_id, null);
    assert.equal(store.getIssueSession(issue.id)?.last_turn_id, nativeTurnId);
    assert.equal(store.getIssueSession(issue.id)?.last_agent_message, "Native reply");
    assert.equal(store.sessionTurnStarted(threadId, nativeTurnId), undefined);
    worker.stop();
    worker = undefined;
    stopCodexActivityCollection();
    store.close();
  } finally {
    worker?.stop();
    stopCodexActivityCollection();
    if (previousCodexHome === undefined) delete process.env.CODEX_HOME;
    else process.env.CODEX_HOME = previousCodexHome;
    if (previousDisableSessionRelay === undefined) delete process.env.BETTER_CODEX_DISABLE_RUNTIME_SESSION_RELAY;
    else process.env.BETTER_CODEX_DISABLE_RUNTIME_SESSION_RELAY = previousDisableSessionRelay;
    rmSync(target.directory, { recursive: true, force: true });
  }
});

test("stopping a claimed desktop start before turn binding releases the run", async () => {
  const target = temporaryDatabase();
  try {
    const store = new Store(target.file);
    const worker = new IssueWorker(store);
    const project = store.createProject({ name: "Claimed stop", workspacePath: target.directory });
    const issue = store.createIssue({ projectId: project.id, title: "Stop before thread", status: "todo", agentEnabled: true, workspacePath: target.directory });
    const claim = store.claimNextIssue(issue.id)!;
    const command = store.enqueueSessionCommand({
      issueId: issue.id,
      runId: claim.runId,
      requestId: `run:${claim.runId}`,
      kind: "start",
      payload: { message: issue.title, workspace_path: target.directory },
    });
    store.heartbeatSessionRelay("relay-stop-before-thread", "app-stop-before-thread", null);
    assert.equal(store.claimSessionCommand("relay-stop-before-thread")?.id, command.id);
    const threadId = "019fec06-788f-7af3-a031-76b546904fa1";
    store.checkpointSessionCommand(command.id, "relay-stop-before-thread", { thread_id: threadId });
    assert.equal(store.getIssueSession(issue.id)?.status, "starting");
    assert.equal(await worker.stopIssue(issue.id), true);
    assert.equal(store.getSessionCommand(command.id)?.status, "cancelled");
    assert.equal(store.getIssueSession(issue.id)?.status, "interrupted");
    assert.equal(store.sessionTurnStarted(threadId, "019fec06-788f-7af3-a031-76b546904fa2"), undefined);
    assert.equal(store.getIssueSession(issue.id)?.active_command_id, null);
    assert.equal(store.getIssueSession(issue.id)?.active_turn_id, null);
    const stopped = store.getIssue(issue.id)!;
    assert.equal(stopped.active_run_status, null);
    assert.equal(stopped.status, "blocked");
    const archived = store.archiveIssue(stopped.id, stopped.version);
    assert.ok(archived.archived_at);
    assert.deepEqual(store.listPendingThreadActions().map(entry => ({ thread_id: entry.thread_id, action: entry.action })), [{ thread_id: threadId, action: "archive" }]);
    const restored = store.unarchiveIssue(archived.id, archived.version);
    assert.deepEqual(store.listPendingThreadActions().map(entry => ({ thread_id: entry.thread_id, action: entry.action })), [{ thread_id: threadId, action: "unarchive" }]);
    const archivedAgain = store.archiveIssue(restored.id, restored.version);
    store.deleteArchivedIssue(archivedAgain.id, archivedAgain.version);
    assert.ok(store.getIssue(stopped.id)?.deleting_at);
    const [deletion] = store.listPendingThreadActions();
    assert.deepEqual({ thread_id: deletion.thread_id, action: deletion.action }, { thread_id: threadId, action: "delete" });
    store.completeThreadAction(deletion);
    assert.equal(store.getIssue(stopped.id), undefined);
    store.close();
  } finally {
    rmSync(target.directory, { recursive: true, force: true });
  }
});

test("session reply idempotency is issue-scoped, fingerprinted, and atomic", () => {
  const target = temporaryDatabase();
  try {
    const store = new Store(target.file);
    const project = store.createProject({ name: "Reply idempotency", workspacePath: target.directory });
    const firstIssue = store.createIssue({ projectId: project.id, title: "First", status: "todo", agentEnabled: true, workspacePath: target.directory });
    const secondIssue = store.createIssue({ projectId: project.id, title: "Second", status: "todo", agentEnabled: true, workspacePath: target.directory });
    const timestamp = new Date().toISOString();
    const firstThread = "019fec06-788f-7af3-a031-76b546904f10";
    const secondThread = "019fec06-788f-7af3-a031-76b546904f11";
    for (const [issueId, threadId] of [[firstIssue.id, firstThread], [secondIssue.id, secondThread]]) {
      store.db.prepare(`
        INSERT INTO issue_sessions (issue_id, host_id, thread_id, status, config_fingerprint, last_agent_message, created_at, updated_at)
        VALUES (?, 'local', ?, 'idle', 'config', '', ?, ?)
      `).run(issueId, threadId, timestamp, timestamp);
    }
    const requestId = "same-client-request";
    const firstInput = { issueId: firstIssue.id, requestId, kind: "turn" as const, threadId: firstThread, payload: { message: "hello" }, message: "hello" };
    const first = store.enqueueSessionReply(firstInput);
    assert.equal(first.replayed, false);
    assert.equal(store.getIssueReplyState(firstIssue.id).status, "running");
    store.db.prepare("UPDATE session_commands SET status = 'completed', finished_at = ? WHERE id = ?").run(timestamp, first.command.id);
    store.db.prepare("UPDATE issue_replies SET status = 'succeeded', finished_at = ? WHERE issue_id = ?").run(timestamp, firstIssue.id);

    const replay = store.enqueueSessionReply(firstInput);
    assert.equal(replay.replayed, true);
    assert.equal(store.getIssueReplyState(firstIssue.id).status, "succeeded");
    assert.throws(() => store.enqueueSessionReply({ ...firstInput, payload: { message: "different" }, message: "different" }), /request_id_conflict/);
    assert.equal(store.getIssueReplyState(firstIssue.id).message, "hello");

    const second = store.enqueueSessionReply({ issueId: secondIssue.id, requestId, kind: "turn", threadId: secondThread, payload: { message: "second" }, message: "second" });
    assert.notEqual(second.command.id, first.command.id);
    assert.equal(second.command.issue_id, secondIssue.id);
    const activeTurnId = "019fec06-788f-7af3-a031-76b546904f12";
    store.db.prepare("UPDATE issue_sessions SET status = 'active', active_turn_id = ? WHERE issue_id = ?").run(activeTurnId, firstIssue.id);
    const queued = store.enqueueSessionReply({
      issueId: firstIssue.id,
      requestId: "queued-client-request",
      kind: "turn",
      threadId: firstThread,
      payload: { message: "queued", input: [{ type: "text", text: "queued" }], request_message: "queued", request_input: JSON.stringify({ message: "queued", references: [], command: "" }), queued_reply: true },
      message: "queued",
      deferred: true,
    });
    assert.deepEqual(store.listQueuedIssueReplies(firstIssue.id).map(item => item.message), ["queued"]);
    assert.deepEqual(store.updateQueuedIssueReply(firstIssue.id, queued.command.request_id, "edited queue").map(item => item.message), ["edited queue"]);
    assert.equal((store.getSessionCommand(queued.command.id)?.payload.input as Array<{ text: string }>)[0].text, "edited queue");
    assert.deepEqual(store.deleteQueuedIssueReply(firstIssue.id, queued.command.request_id), []);
    assert.throws(() => store.deleteQueuedIssueReply(firstIssue.id, queued.command.request_id), /queued_reply_not_found/);
    const queuedForSend = store.enqueueSessionReply({
      issueId: firstIssue.id,
      requestId: "queued-send-request",
      kind: "turn",
      threadId: firstThread,
      payload: { message: "send queued", input: [{ type: "text", text: "send queued" }], request_message: "send queued", request_input: JSON.stringify({ message: "send queued", references: [], command: "" }), queued_reply: true },
      message: "send queued",
      deferred: true,
    });
    const promoted = store.promoteQueuedIssueReply(firstIssue.id, queuedForSend.command.request_id);
    assert.equal(promoted.command.kind, "steer");
    assert.equal(promoted.command.turn_id, activeTurnId);
    assert.equal(promoted.command.payload.queued_reply, undefined);
    assert.deepEqual(promoted.queued_replies, []);
    store.close();
  } finally {
    rmSync(target.directory, { recursive: true, force: true });
  }
});

test("manual native turns never bind a claimed Better Codex command", () => {
  const target = temporaryDatabase();
  try {
    const store = new Store(target.file);
    const worker = new IssueWorker(store);
    const project = store.createProject({ name: "Manual collision", workspacePath: target.directory });
    const issue = store.createIssue({ projectId: project.id, title: "Claimed work", status: "todo", agentEnabled: true, workspacePath: target.directory });
    const timestamp = new Date().toISOString();
    const threadId = "019fec06-788f-7af3-a031-76b546904f20";
    store.db.prepare(`
      INSERT INTO issue_sessions (issue_id, host_id, thread_id, status, config_fingerprint, last_agent_message, created_at, updated_at)
      VALUES (?, 'local', ?, 'idle', 'config', '', ?, ?)
    `).run(issue.id, threadId, timestamp, timestamp);
    const claim = store.claimNextIssue(issue.id)!;
    const command = store.enqueueSessionCommand({ issueId: issue.id, runId: claim.runId, requestId: `run:${claim.runId}`, kind: "turn", threadId, payload: { message: "Better Codex work" } });
    store.heartbeatSessionRelay("relay-manual", "app-manual", null);
    store.claimSessionCommand("relay-manual");
    const manualTurnId = "019fec06-788f-7af3-a031-76b546904f21";
    assert.equal(store.sessionTurnStarted(threadId, manualTurnId)?.turn_id, manualTurnId);
    assert.equal(store.getSessionCommand(command.id)?.turn_id, null);
    worker.failSessionCommand(command.id, "relay-manual", "turn_already_active");
    store.recordSessionAgentMessage(threadId, manualTurnId, "Manual response");
    const completion = store.completeSessionTurn(threadId, manualTurnId, "completed")!;
    assert.equal(completion.run_id, null);
    assert.equal(completion.should_schedule, false);
    assert.equal(store.getIssue(issue.id)?.latest_run_status, "failed");
    assert.equal(store.listPendingSchedulerRuns().length, 0);
    store.close();
  } finally {
    rmSync(target.directory, { recursive: true, force: true });
  }
});

test("manual native turns reopen completed issues and return them for review", () => {
  const target = temporaryDatabase();
  let store: Store | undefined;
  try {
    store = new Store(target.file);
    const project = store.createProject({ name: "Manual continuation", workspacePath: target.directory });
    const issue = store.createIssue({ projectId: project.id, title: "Continue completed work", status: "done", agentEnabled: true, workspacePath: target.directory });
    const timestamp = new Date().toISOString();
    const threadId = "019fec06-788f-7af3-a031-76b546904f22";
    const turnId = "019fec06-788f-7af3-a031-76b546904f23";
    store.db.prepare(`
      INSERT INTO issue_sessions (issue_id, host_id, thread_id, status, config_fingerprint, last_agent_message, created_at, updated_at)
      VALUES (?, 'local', ?, 'idle', 'config', '', ?, ?)
    `).run(issue.id, threadId, timestamp, timestamp);

    assert.equal(store.sessionTurnStarted(threadId, turnId)?.turn_id, turnId);
    const active = store.getIssue(issue.id)!;
    assert.equal(active.status, "in_progress");
    assert.equal(active.needs_attention, false);
    assert.equal(active.pending_actor, "agent");
    assert.equal(active.session_active_turn_id, turnId);
    assert.equal(store.getIssueReplyState(issue.id).status, "running");

    store.recordSessionAgentMessage(threadId, turnId, "Follow-up complete");
    const completion = store.completeSessionTurn(threadId, turnId, "completed")!;
    assert.equal(completion.run_id, null);
    const reviewed = store.getIssue(issue.id)!;
    assert.equal(reviewed.status, "in_review");
    assert.equal(reviewed.needs_attention, true);
    assert.equal(reviewed.pending_actor, "user");
    assert.equal(reviewed.session_active_turn_id, null);
    assert.equal(store.getIssueReplyState(issue.id).status, "succeeded");

    assert.equal(store.syncSessionThreadStatus(threadId, "active"), false);
    const afterStaleActive = store.getIssue(issue.id)!;
    assert.equal(afterStaleActive.status, "in_review");
    assert.equal(afterStaleActive.session_status, "idle");
    assert.equal(afterStaleActive.session_active_turn_id, null);

    store.db.prepare("UPDATE issue_sessions SET status = 'active' WHERE issue_id = ?").run(issue.id);
    store.db.prepare("UPDATE issues SET status = 'in_progress', needs_attention = 0, pending_actor = 'agent' WHERE id = ?").run(issue.id);
    assert.equal(store.recoverStaleSessionStatuses(), 1);
    const recovered = store.getIssue(issue.id)!;
    assert.equal(recovered.status, "in_review");
    assert.equal(recovered.needs_attention, true);
    assert.equal(recovered.pending_actor, "user");
    assert.equal(recovered.session_status, "idle");

    const interruptedTurnId = "019fec06-788f-7af3-a031-76b546904f2b";
    assert.equal(store.sessionTurnStarted(threadId, interruptedTurnId)?.turn_id, interruptedTurnId);
    assert.equal(store.completeSessionTurn(threadId, interruptedTurnId, "interrupted", "user_stopped")?.turn_id, interruptedTurnId);
    assert.equal(store.getIssue(issue.id)?.status, "blocked");
    assert.equal(store.syncSessionThreadStatus(threadId, "systemError"), false);
    const interruptedReply = store.getIssue(issue.id)!;
    assert.equal(interruptedReply.status, "blocked");
    assert.equal(interruptedReply.session_status, "interrupted");
    assert.equal(interruptedReply.session_active_turn_id, null);

    const failedTurnId = "019fec06-788f-7af3-a031-76b546904f2a";
    assert.equal(store.sessionTurnStarted(threadId, failedTurnId)?.turn_id, failedTurnId);
    assert.equal(store.completeSessionTurn(threadId, failedTurnId, "failed", "Selected model is at capacity. Please try a different model.")?.turn_id, failedTurnId);
    const failedReply = store.getIssue(issue.id)!;
    assert.equal(failedReply.status, "in_review");
    assert.equal(failedReply.session_status, "failed");
    assert.equal(store.getIssueReplyState(issue.id).status, "failed");
    assert.equal(store.getIssueReplyState(issue.id).error, "Selected model is at capacity. Please try a different model.");

    const staleTurnId = "019fec06-788f-7af3-a031-76b546904f26";
    const replacementTurnId = "019fec06-788f-7af3-a031-76b546904f27";
    assert.equal(store.sessionTurnStarted(threadId, staleTurnId)?.turn_id, staleTurnId);
    store.db.prepare(`
      INSERT INTO issue_runs (id, issue_id, status, thread_id, turn_id, started_at, execution_mode)
      VALUES (?, ?, 'running', ?, ?, ?, 'desktop')
    `).run("019fec06-788f-7af3-a031-76b546904f28", issue.id, threadId, staleTurnId, timestamp);
    assert.equal(store.sessionTurnStarted(threadId, replacementTurnId)?.turn_id, replacementTurnId);
    assert.equal(store.getIssue(issue.id)?.session_active_turn_id, replacementTurnId);
    assert.equal(store.getIssue(issue.id)?.latest_run_status, "interrupted");
    assert.equal(store.getIssueReplyState(issue.id).status, "running");
    assert.equal(store.completeSessionTurn(threadId, replacementTurnId, "completed")?.turn_id, replacementTurnId);
    assert.equal(store.getIssue(issue.id)?.session_active_turn_id, null);
    assert.equal(store.getIssueReplyState(issue.id).status, "succeeded");

    const statusIssue = store.createIssue({ projectId: project.id, title: "Continue from thread status", status: "done", agentEnabled: true, workspacePath: target.directory });
    const statusThreadId = "019fec06-788f-7af3-a031-76b546904f24";
    store.db.prepare(`
      INSERT INTO issue_sessions (issue_id, host_id, thread_id, status, config_fingerprint, last_agent_message, created_at, updated_at)
      VALUES (?, 'local', ?, 'idle', 'config', '', ?, ?)
    `).run(statusIssue.id, statusThreadId, timestamp, timestamp);
    assert.equal(store.syncSessionThreadStatus(statusThreadId, "active"), false);
    assert.equal(store.getIssue(statusIssue.id)?.status, "done");
    const statusTurnId = "019fec06-788f-7af3-a031-76b546904f29";
    assert.equal(store.sessionTurnStarted(statusThreadId, statusTurnId)?.turn_id, statusTurnId);
    assert.equal(store.getIssue(statusIssue.id)?.status, "in_progress");

    const disconnectedIssue = store.createIssue({ projectId: project.id, title: "Ignore idle thread failure", status: "done", agentEnabled: true, workspacePath: target.directory });
    const disconnectedThreadId = "019fec06-788f-7af3-a031-76b546904f25";
    store.db.prepare(`
      INSERT INTO issue_sessions (issue_id, host_id, thread_id, status, config_fingerprint, last_agent_message, created_at, updated_at)
      VALUES (?, 'local', ?, 'idle', 'config', '', ?, ?)
    `).run(disconnectedIssue.id, disconnectedThreadId, timestamp, timestamp);
    assert.equal(store.syncSessionThreadStatus(disconnectedThreadId, "systemError"), false);
    assert.equal(store.getIssue(disconnectedIssue.id)?.status, "done");
    assert.equal(store.getIssue(disconnectedIssue.id)?.session_status, "idle");
  } finally {
    store?.close();
    rmSync(target.directory, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 });
  }
});

test("session relay checkpoints recover a turn whose final command acknowledgement is lost", () => {
  const target = temporaryDatabase();
  try {
    const store = new Store(target.file);
    const project = store.createProject({ name: "Checkpoint recovery", workspacePath: target.directory });
    const issue = store.createIssue({ projectId: project.id, title: "Recover native work", status: "todo", agentEnabled: true, workspacePath: target.directory });
    const claim = store.claimNextIssue(issue.id)!;
    const command = store.enqueueSessionCommand({
      issueId: issue.id,
      runId: claim.runId,
      requestId: `run:${claim.runId}`,
      kind: "start",
      payload: { message: "Implement it", config_fingerprint: "config" },
    });
    store.heartbeatSessionRelay("relay-checkpoint", "app-checkpoint", null);
    store.claimSessionCommand("relay-checkpoint");
    const threadId = "019fec06-788f-7af3-a031-76b546904fa0";
    const turnId = "019fec06-788f-7af3-a031-76b546904fa1";
    assert.equal(store.checkpointSessionCommand(command.id, "relay-checkpoint", { thread_id: threadId }).thread_id, threadId);
    assert.equal(store.getIssueSession(issue.id)?.status, "starting");
    assert.equal(store.sessionTurnStarted(threadId, turnId)?.turn_id, turnId);
    assert.equal(store.getIssue(issue.id)?.active_run_status, "running");
    assert.equal(store.getIssueSession(issue.id)?.active_command_id, command.id);

    const [unknown] = store.failClaimedSessionCommands("replacement-relay");
    assert.equal(unknown.error, "session_outcome_unknown");
    assert.equal(store.getIssue(issue.id)?.active_run_status, "running");
    assert.equal(store.completeSessionTurn(threadId, turnId, "completed")?.run_id, claim.runId);
    assert.equal(store.getIssue(issue.id)?.active_run_status, "scheduling");
    store.close();
  } finally {
    rmSync(target.directory, { recursive: true, force: true });
  }
});

test("session host deliveries persist until identity-matched acknowledgement", () => {
  const directory = mkdtempSync(join(tmpdir(), "better-codex-session-host-transport-"));
  const file = join(directory, "transport.db");
  try {
    const first = new SessionHostTransport(file, "host-a");
    const queued = first.enqueue("event", { method: "turn/completed", params: { threadId: "thread-a", message: "项目管理页面恢复稳定" } });
    assert.equal(queued.sequence, 1);
    assert.equal(queued.payload_hash, sessionHostDeliveryHash(queued.kind, queued.payload));
    const wire = Buffer.from(`${JSON.stringify(queued)}\n`);
    const marker = Buffer.from("项");
    const boundary = wire.indexOf(marker) + 1;
    const decoder = new SessionHostLineDecoder();
    assert.deepEqual(decoder.push(wire.subarray(0, boundary)).lines, []);
    const [line] = decoder.push(wire.subarray(boundary)).lines;
    const decoded = JSON.parse(line);
    assert.equal(decoded.payload.params.message, "项目管理页面恢复稳定");
    assert.equal(decoded.payload_hash, sessionHostDeliveryHash(decoded.kind, decoded.payload));
    first.close();

    const reopened = new SessionHostTransport(file, "host-b");
    assert.deepEqual(reopened.pending(), [queued]);
    assert.throws(() => reopened.acknowledge({ ...queued, payload_hash: "0".repeat(64) }), /session_host_delivery_ack_mismatch/);
    reopened.acknowledge({ ...queued, outcome: "rejected_terminal", error_code: "session_command_not_claimed" });
    assert.equal(reopened.stats().queued_deliveries, 0);
    assert.equal(reopened.stats().terminal_rejected_deliveries, 1);
    assert.equal(reopened.stats().last_delivery_error, "session_command_not_claimed");
    reopened.close();
  } finally {
    rmSync(directory, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 });
  }
});

test("session delivery receipt commits atomically with its business mutation", () => {
  const target = temporaryDatabase();
  try {
    const store = new Store(target.file);
    store.db.exec("CREATE TABLE delivery_application_test (value TEXT NOT NULL)");
    const receipt = { delivery_id: "delivery-1", host_instance_id: "host-1", sequence: 1, payload_hash: "a".repeat(64) };
    const applied = store.applySessionHostDelivery(receipt, () => {
      store.db.prepare("INSERT INTO delivery_application_test (value) VALUES ('applied')").run();
      return "applied";
    });
    assert.deepEqual(applied, { duplicate: false, outcome: "applied", error_code: null, value: "applied" });
    const replay = store.applySessionHostDelivery(receipt, () => {
      throw new Error("duplicate_callback_executed");
    });
    assert.deepEqual(replay, { duplicate: true, outcome: "applied", error_code: null, value: undefined });
    assert.equal((store.db.prepare("SELECT COUNT(*) AS count FROM delivery_application_test").get() as { count: number }).count, 1);
    assert.throws(() => store.applySessionHostDelivery({ ...receipt, payload_hash: "b".repeat(64) }, () => undefined), /delivery_id_conflict/);

    const failedReceipt = { delivery_id: "delivery-2", host_instance_id: "host-1", sequence: 2, payload_hash: "c".repeat(64) };
    assert.throws(() => store.applySessionHostDelivery(failedReceipt, () => {
      store.db.prepare("INSERT INTO delivery_application_test (value) VALUES ('rolled-back')").run();
      throw new Error("business_write_failed");
    }), /business_write_failed/);
    assert.equal((store.db.prepare("SELECT COUNT(*) AS count FROM delivery_application_test").get() as { count: number }).count, 1);
    assert.equal((store.db.prepare("SELECT COUNT(*) AS count FROM session_delivery_receipts WHERE delivery_id = ?").get(failedReceipt.delivery_id) as { count: number }).count, 0);
    const rejectedReceipt = { delivery_id: "delivery-3", host_instance_id: "host-1", sequence: 3, payload_hash: "d".repeat(64) };
    const rejected = store.applySessionHostDelivery(rejectedReceipt, () => {
      throw new Error("session_command_not_claimed");
    }, error => error instanceof Error && error.message === "session_command_not_claimed" ? error.message : null);
    assert.deepEqual(rejected, { duplicate: false, outcome: "rejected_terminal", error_code: "session_command_not_claimed", value: undefined });
    const rejectedReplay = store.applySessionHostDelivery(rejectedReceipt, () => {
      throw new Error("duplicate_callback_executed");
    });
    assert.deepEqual(rejectedReplay, { duplicate: true, outcome: "rejected_terminal", error_code: "session_command_not_claimed", value: undefined });
    store.close();
  } finally {
    rmSync(target.directory, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 });
  }
});

test("legacy imported issues attach resumable completed sessions without changing assignment", () => {
  const target = temporaryDatabase();
  try {
    const store = new Store(target.file);
    const worker = new IssueWorker(store);
    const project = store.createProject({ name: "Imported session", workspacePath: target.directory });
    const threadId = "019fec06-788f-7af3-a031-76b546904f29";
    const legacy = store.createIssue({ projectId: project.id, title: "Legacy import", status: "blocked", threadId, workspacePath: target.directory, userAssigned: true });

    const upgraded = store.attachImportedSession(legacy.id, {
      threadId,
      configFingerprint: worker.sessionConfigFingerprint(null),
      active: false,
    });
    assert.equal(upgraded.agent_enabled, legacy.agent_enabled);
    assert.equal(upgraded.agent_id, null);
    assert.equal(upgraded.user_assigned, true);
    assert.equal(upgraded.status, "in_review");
    assert.equal(upgraded.needs_attention, true);
    assert.equal(upgraded.pending_actor, "user");
    assert.equal(upgraded.session_owned, true);
    assert.equal(upgraded.session_thread_id, threadId);
    assert.equal(store.getIssueReplyState(upgraded.id).status, "succeeded");
    assert.equal((store.syncProjection("issue", upgraded.id) as { active_run_status: string | null }).active_run_status, null);

    const activeTurnId = "019fec06-788f-7af3-a031-76b546904f30";
    const refreshed = store.attachImportedSession(legacy.id, {
      threadId,
      configFingerprint: worker.sessionConfigFingerprint(null),
      active: true,
      turnId: activeTurnId,
    });
    assert.equal(refreshed.status, "in_progress");
    assert.equal((store.syncProjection("issue", refreshed.id) as { session_status: string | null }).session_status, "active");
    assert.equal(refreshed.session_active_turn_id, activeTurnId);
    assert.equal(store.getIssueReplyState(refreshed.id).status, "running");
    assert.equal(store.completeSessionTurn(threadId, activeTurnId, "completed")?.turn_id, activeTurnId);

    const sent = worker.sendIssueMessage(upgraded.id, "continue-import", "Continue here");
    assert.equal(sent.command.kind, "turn");
    assert.equal(sent.command.thread_id, threadId);
    store.close();
  } finally {
    rmSync(target.directory, { recursive: true, force: true });
  }
});

test("ambiguous legacy thread associations are rejected", () => {
  const target = temporaryDatabase();
  try {
    const store = new Store(target.file);
    const project = store.createProject({ name: "Ambiguous imports", workspacePath: target.directory });
    const threadId = "019fec06-788f-7af3-a031-76b546904f55";
    store.createIssue({ projectId: project.id, title: "First owner", threadId, workspacePath: target.directory });
    store.createIssue({ projectId: project.id, title: "Second owner", threadId, workspacePath: target.directory });
    assert.throws(() => store.getIssueByThreadId(threadId), /thread_association_conflict/);
    store.close();
  } finally {
    rmSync(target.directory, { recursive: true, force: true });
  }
});

test("reassigned issue waits for a user reply before continuing the native session as the new agent", () => {
  const target = temporaryDatabase();
  try {
    const store = new Store(target.file);
    const worker = new IssueWorker(store);
    const project = store.createProject({ name: "Config continuation", workspacePath: target.directory });
    const previousProfile = store.createAgentProfile({ name: "Previous", description: "", instructions: "previous instructions", model: "gpt-test", reasoning_effort: "medium" });
    const profile = store.createAgentProfile({ name: "Restricted", description: "", instructions: "new instructions", model: "gpt-test", reasoning_effort: "medium", sandbox_mode: "read-only" });
    const issue = store.createIssue({ projectId: project.id, title: "Continue thread", status: "in_review", agentEnabled: true, agentId: previousProfile.id, workspacePath: target.directory });
    const timestamp = new Date().toISOString();
    const oldThreadId = "019fec06-788f-7af3-a031-76b546904f30";
    store.db.prepare(`
      INSERT INTO issue_sessions (issue_id, host_id, thread_id, status, config_fingerprint, last_agent_message, created_at, updated_at)
      VALUES (?, 'local', ?, 'idle', 'old-config', '', ?, ?)
    `).run(issue.id, oldThreadId, timestamp, timestamp);
    const settled = store.updateIssue(issue.id, issue.version, { pending_actor: "user", needs_attention: true });
    const reassigned = store.updateIssue(settled.id, settled.version, { agent_enabled: true, agent_id: profile.id });
    assert.equal(reassigned.pending_actor, "user");
    assert.equal(reassigned.needs_attention, true);
    assert.equal(store.isDispatchable(reassigned), false);
    assert.equal(store.claimNextIssue(reassigned.id), null);

    const handoff = worker.sendIssueMessage(reassigned.id, "continue-after-reassign", "Continue here");
    const command = handoff.command;
    assert.equal(command.kind, "turn");
    assert.equal(command.thread_id, oldThreadId);
    assert.equal(command.payload.sandbox_mode, "read-only");
    assert.equal(command.payload.developer_instructions, "new instructions");
    assert.equal(command.payload.message, "Continue here");
    assert.notEqual(command.payload.config_fingerprint, "old-config");
    assert.equal(store.getIssueSession(issue.id)?.thread_id, oldThreadId);
    assert.equal(store.hasActiveAgentSessionWork(profile.id), true);
    store.db.prepare("DELETE FROM session_commands WHERE issue_id = ?").run(issue.id);
    store.db.prepare("DELETE FROM issue_replies WHERE issue_id = ?").run(issue.id);
    assert.equal(store.hasActiveAgentSessionWork(profile.id), false);

    const replyIssue = store.createIssue({ projectId: project.id, title: "Continue reply thread", status: "in_review", agentEnabled: true, agentId: profile.id, workspacePath: target.directory });
    const replyThreadId = "019fec06-788f-7af3-a031-76b546904f31";
    store.db.prepare(`
      INSERT INTO issue_sessions (issue_id, host_id, thread_id, status, config_fingerprint, last_agent_message, created_at, updated_at)
      VALUES (?, 'local', ?, 'idle', 'old-config', '', ?, ?)
    `).run(replyIssue.id, replyThreadId, timestamp, timestamp);
    const sent = worker.sendIssueMessage(replyIssue.id, "config-retry", "continue");
    assert.equal(sent.command.kind, "turn");
    assert.equal(sent.command.thread_id, replyThreadId);
    assert.equal(sent.command.payload.message, "continue");
    assert.equal(store.getIssueSession(replyIssue.id)?.thread_id, replyThreadId);
    const replay = worker.sendIssueMessage(replyIssue.id, "config-retry", "continue");
    assert.equal(replay.replayed, true);
    assert.equal(replay.command.id, sent.command.id);
    assert.throws(() => worker.sendIssueMessage(replyIssue.id, "config-retry", "different"), /request_id_conflict/);
    store.heartbeatSessionRelay("relay-config", "app-config", null);
    store.claimSessionCommand("relay-config");
    worker.failSessionCommand(sent.command.id, "relay-config", "turn_start_failed", replyThreadId);
    assert.equal(store.getIssueReplyState(replyIssue.id).status, "failed");
    assert.equal(store.getIssue(replyIssue.id)?.status, "in_review");
    assert.equal(store.getIssueSession(replyIssue.id)?.status, "idle");
    assert.equal(store.getIssueSession(replyIssue.id)?.last_error, "turn_start_failed");
    const retried = worker.sendIssueMessage(replyIssue.id, "config-retry", "continue");
    assert.equal(retried.command.status, "pending");
    assert.equal(store.getIssueReplyState(replyIssue.id).status, "running");
    assert.equal(store.getIssueSession(replyIssue.id)?.thread_id, replyThreadId);
    store.close();
  } finally {
    rmSync(target.directory, { recursive: true, force: true });
  }
});

test("only a ready renderer can lead the native session relay", () => {
  const target = temporaryDatabase();
  try {
    const store = new Store(target.file);
    const worker = new IssueWorker(store);
    assert.equal(worker.pollSessionRelay("bad-relay", "bad-app", "failed", "desktop_bridge_unavailable").leader, false);
    assert.equal(worker.pollSessionRelay("good-relay", "good-app", "ready").leader, true);
    assert.equal(worker.pollSessionRelay("bad-relay", "bad-app", "failed", "desktop_bridge_unavailable").leader, false);
    assert.equal(worker.pollSessionRelay("other-good", "other-app", "ready").leader, false);
    store.close();
  } finally {
    rmSync(target.directory, { recursive: true, force: true });
  }
});

test("interrupt commands are retried and never report a failed stop as success", () => {
  const target = temporaryDatabase();
  try {
    const store = new Store(target.file);
    const worker = new IssueWorker(store);
    const project = store.createProject({ name: "Interrupt recovery", workspacePath: target.directory });
    const issue = store.createIssue({ projectId: project.id, title: "Stop me", status: "in_progress", agentEnabled: true, workspacePath: target.directory });
    const timestamp = new Date().toISOString();
    const threadId = "019fec06-788f-7af3-a031-76b546904f40";
    const turnId = "019fec06-788f-7af3-a031-76b546904f41";
    store.db.prepare(`
      INSERT INTO issue_sessions (issue_id, host_id, thread_id, status, active_turn_id, config_fingerprint, last_agent_message, created_at, updated_at)
      VALUES (?, 'local', ?, 'active', ?, 'config', '', ?, ?)
    `).run(issue.id, threadId, turnId, timestamp, timestamp);
    const interrupt = store.enqueueSessionInterrupt(issue.id)!;
    assert.equal(store.getIssueSession(issue.id)?.status, "stopping");
    store.heartbeatSessionRelay("relay-stop", "app-stop", null);
    assert.equal(store.claimSessionCommand("relay-stop")?.id, interrupt.id);
    assert.equal(store.failClaimedSessionCommands("replacement-relay").length, 0);
    assert.equal(store.getSessionCommand(interrupt.id)?.status, "pending");
    for (let attempt = 2; attempt <= 3; attempt += 1) {
      assert.equal(store.claimSessionCommand("relay-stop")?.id, interrupt.id);
      const failed = worker.failSessionCommand(interrupt.id, "relay-stop", "desktop_bridge_timeout");
      assert.equal(failed.status, attempt < 3 ? "pending" : "failed");
    }
    assert.equal(store.getIssueSession(issue.id)?.status, "failed");
    assert.equal(store.getIssue(issue.id)?.status, "blocked");
    assert.equal(store.getIssue(issue.id)?.needs_attention, true);
    store.close();
  } finally {
    rmSync(target.directory, { recursive: true, force: true });
  }
});

test("legacy cancelled issues migrate to archived backlog issues", () => {
  const target = temporaryDatabase();
  let store: Store | undefined;
  try {
    store = new Store(target.file);
    assert.deepEqual(issueStatuses, ["backlog", "todo", "in_progress", "in_review", "done", "blocked"]);
    const project = store.createProject({ name: "Legacy cancellation", workspacePath: target.directory });
    const issue = store.createIssue({ projectId: project.id, title: "Cancelled before archive existed", status: "todo", agentEnabled: true });
    const archivedAt = "2026-08-01T10:00:00.000Z";
    store.close();
    store = undefined;

    const legacy = new DatabaseSync(target.file);
    legacy.prepare("UPDATE issues SET status = 'cancelled', updated_at = ?, needs_attention = 1, pending_actor = 'agent' WHERE id = ?").run(archivedAt, issue.id);
    legacy.prepare("DELETE FROM schema_migrations WHERE version >= 9").run();
    legacy.close();

    store = new Store(target.file);
    const migrated = store.getIssue(issue.id)!;
    assert.equal(migrated.status, "backlog");
    assert.equal(migrated.archived_at, archivedAt);
    assert.equal(migrated.needs_attention, false);
    assert.equal(migrated.pending_actor, "user");
    assert.equal(store.listIssues().some(item => item.id === issue.id), false);
    assert.equal(store.listIssues({ archived: true }).some(item => item.id === issue.id), true);
    assert.equal(store.isDispatchable(migrated), false);
    assert.throws(() => store.beginReplyRun(issue.id), /issue_archived/);
    const restored = store.unarchiveIssue(issue.id, migrated.version);
    const moved = store.updateIssue(issue.id, restored.version, { status: "todo" });
    assert.equal(store.isDispatchable(moved), false);
    assert.equal(store.health().schemaVersion, 25);
  } finally {
    store?.close();
    rmSync(target.directory, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 });
  }
});

test("remote replies reject archived issues before invoking attachment handlers", async () => {
  const store = new Store(":memory:");
  try {
    const project = store.createProject({ name: "Archived reply", workspacePath: process.cwd() });
    const issue = store.createIssue({ projectId: project.id, title: "Do not reply" });
    const archived = store.archiveIssue(issue.id, issue.version);
    let replied = false;
    const reply = await store.applyRemoteCommand({
      command_id: "archived-reply",
      device_id: "test-device",
      operation: "issue.reply",
      entity_id: issue.id,
      base_revision: archived.version,
      payload: { message: "Do not send" },
      status: "pending",
      requested_at: archived.updated_at,
      expires_at: "2026-08-13T10:00:00.000Z",
      finished_at: null,
      error: null,
    }, { reply: () => { replied = true; } });
    assert.equal(reply.status, "rejected");
    assert.equal(reply.error, "issue_archived");
    assert.equal(replied, false);
  } finally {
    store.close();
  }
});

test("update operations are idempotent and enforce lifecycle transitions", () => {
  const store = new Store(":memory:");
  try {
    const source = { idempotencyKey: "update-request-0001", sourceCoreVersion: "1.4.0", sourceRuntimeInstanceId: "runtime-source", sourceRuntimeGeneration: 7, hostInstanceId: "host-source" };
    const operation = store.createUpdateOperation(source);
    assert.equal(store.createUpdateOperation(source).id, operation.id);
    assert.equal(store.createUpdateOperation({ ...source, idempotencyKey: "update-request-0002" }).id, operation.id);
    store.transitionUpdateOperation(operation.id, "STAGING");
    store.transitionUpdateOperation(operation.id, "DRAINING_DISPATCH", { targetCoreVersion: "1.5.0" });
    store.transitionUpdateOperation(operation.id, "WAITING_FOR_HOST_DRAIN", { targetRuntimeGeneration: 8 });
    store.transitionUpdateOperation(operation.id, "HANDOFF_READY");
    store.transitionUpdateOperation(operation.id, "RESTARTING_RUNTIME");
    store.transitionUpdateOperation(operation.id, "REPLAYING");
    store.transitionUpdateOperation(operation.id, "RECONCILING");
    store.transitionUpdateOperation(operation.id, "SERVING_READY");
    const completed = store.transitionUpdateOperation(operation.id, "COMPLETED");
    assert.equal(completed.target_core_version, "1.5.0");
    assert.equal(completed.target_runtime_generation, 8);
    assert.equal(store.getActiveUpdateOperation(), undefined);
    assert.throws(() => store.transitionUpdateOperation(operation.id, "ROLLING_BACK"), /update_operation_transition_invalid/);
  } finally {
    store.close();
  }
});

test("newer database schema is rejected without migration", () => {
  const target = temporaryDatabase();
  try {
    const future = new DatabaseSync(target.file);
    future.exec("CREATE TABLE schema_migrations (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL); INSERT INTO schema_migrations VALUES (26, '2026-01-01T00:00:00.000Z')");
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
    assert.equal(store.health().schemaVersion, 25);
    assert.ok(store.lastBackupPath);
    assert.ok(existsSync(store.lastBackupPath!));
    assert.equal(store.getProject("legacy")?.name, "Legacy");
    store.close();
  } finally {
    rmSync(target.directory, { recursive: true, force: true });
  }
});
