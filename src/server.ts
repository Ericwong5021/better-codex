import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { closeSync, openSync, writeFileSync } from "node:fs";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { isSea } from "node:sea";
import { coreVersion, readCompatibilityStatus } from "./compatibility.js";
import { agentSandboxModes, cleanMaxConcurrency, issuePriorities, issueStatuses, Store, type AgentModel, type AgentReasoningEffort, type AgentSandboxMode, type Issue, type IssuePriority, type IssueStatus } from "./db.js";
import { defaultAgentProfile, syncAgentProfiles, updateDefaultAgentProfile } from "./agent-profiles.js";
import { readCodexAppearance } from "./appearance.js";
import { readCodexLocale } from "./locale.js";
import { readCodexUserProfile } from "./user-profile.js";
import { readModelCatalog } from "./model-catalog.js";
import { attachmentPath, runPath, runtimePort, token, updateLogPath } from "./config.js";
import { acquireRuntimeLock, clearRuntimeState, createRuntimeIdentity, publishRuntimeState } from "./runtime-state.js";
import { activeCoreExecutable, checkGatewayUpdate, getGatewayUpdateState, installGatewayUpdate, recordGatewayUpdateActivation, startGatewayUpdateChecks } from "./updater.js";
import { getIssueReplyState, hasActiveIssueReplies, startIssueReply, stopIssueReply, stopIssueReplies } from "./session-reply.js";
import { join } from "node:path";
import { normalizeSessionId, readConversationActivity, readConversationResult, sessionWorkspace } from "./session-transcript.js";
import { IssueWorker } from "./worker.js";
import { maxMockupBytes, readMockupState, replaceMockupState, resetMockupState, updateMockupState } from "./mockup.js";

const accessToken = token();
const mockupEnabled = !isSea() && process.argv.includes("--mockup");
const maxPastedImageBytes = 10 * 1024 * 1024;
const maxPastedImageBodyBytes = Math.ceil(maxPastedImageBytes * 4 / 3) + 1024;

function savePastedImage(value: unknown) {
  const data = cleanString(value, maxPastedImageBodyBytes);
  const match = data.match(/^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/);
  if (!match) throw new Error("invalid_image_attachment");
  const bytes = Buffer.from(match[2], "base64");
  if (!bytes.length || bytes.length > maxPastedImageBytes) throw new Error("invalid_image_attachment");
  const format = match[1];
  const valid = format === "png"
    ? bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
    : format === "jpeg"
      ? bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
      : bytes.subarray(0, 4).toString("ascii") === "RIFF" && bytes.subarray(8, 12).toString("ascii") === "WEBP";
  if (!valid) throw new Error("invalid_image_attachment");
  const extension = format === "jpeg" ? "jpg" : format;
  const name = `pasted-${Date.now()}-${randomUUID().slice(0, 8)}.${extension}`;
  const path = join(attachmentPath, name);
  writeFileSync(path, bytes, { flag: "wx", mode: 0o600 });
  return { name, path };
}

async function reconcileInterruptedIssues(store: Store, issues: Issue[]) {
  await Promise.all(issues.map(async issue => {
    if (!issue.run_thread_id || ["done", "cancelled"].includes(issue.status) || issue.active_run_status || hasActiveIssueReplies(issue.id)) return;
    const conversation = await readConversationActivity(issue.run_thread_id);
    const completedAt = conversation.activity.status === "completed"
      ? conversation.activity.completed_at
      : conversation.activity.status === "idle"
        ? conversation.last_final_at
        : null;
    if (issue.status === "blocked" && issue.latest_run_status === "interrupted" && completedAt) {
      store.reconcileInterruptedRun(issue.id, issue.run_thread_id, completedAt, conversation.activity.started_at);
    }
    if (conversation.activity.status !== "idle") {
      const reply = getIssueReplyState(store, issue.id);
      if (conversation.activity.status === "interrupted" && reply.status !== "interrupted") {
        console.log(`BETTER_CODEX_DIAGNOSTIC ${JSON.stringify({
          timestamp: new Date().toISOString(),
          scope: "session",
          event: "session_interrupted_observed",
          issue_id: issue.id,
          issue_identifier: issue.identifier,
          thread_id: issue.run_thread_id,
          turn_id: conversation.activity.turn_id,
          turn_started_at: conversation.activity.started_at,
          turn_interrupted_at: conversation.activity.completed_at,
          previous_reply_status: reply.status,
          previous_reply_error: reply.error,
        })}`);
      }
      store.syncSessionReply(issue.id, issue.run_thread_id, conversation.activity);
    }
  }));
  return issues.map(issue => store.getIssue(issue.id) || issue);
}

function sendJson(response: ServerResponse, status: number, value: unknown) {
  const body = JSON.stringify(value);
  response.writeHead(status, {
    "cache-control": "no-store",
    "content-length": Buffer.byteLength(body),
    "content-type": "application/json; charset=utf-8",
    "access-control-allow-origin": "app://-",
    "access-control-allow-methods": "GET, POST, PATCH, DELETE, OPTIONS",
    "access-control-allow-headers": "authorization, content-type",
    "access-control-allow-private-network": "true",
    "cross-origin-resource-policy": "cross-origin",
    "vary": "Origin",
  });
  response.end(body);
}

function sendPreflight(response: ServerResponse) {
  response.writeHead(204, {
    "access-control-allow-origin": "app://-",
    "access-control-allow-methods": "GET, POST, PATCH, DELETE, OPTIONS",
    "access-control-allow-headers": "authorization, content-type",
    "access-control-allow-private-network": "true",
    "access-control-max-age": "600",
    "vary": "Origin",
  });
  response.end();
}

function readBody(request: IncomingMessage, limit = 1024 * 1024) {
  return new Promise<Record<string, unknown>>((resolve, reject) => {
    let source = "";
    request.on("data", (chunk) => {
      source += chunk;
      if (source.length > limit) reject(new Error("body_too_large"));
    });
    request.on("end", () => {
      try {
        const value = source ? JSON.parse(source) : {};
        if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("invalid_json");
        resolve(value);
      } catch {
        reject(new Error("invalid_json"));
      }
    });
  });
}

function requireVersion(body: Record<string, unknown>, current: Record<string, unknown>) {
  const version = Number(body.version);
  if (!Number.isInteger(version) || version < 1) throw new Error("invalid_version");
  if (version !== Number(current.version)) throw new Error("version_conflict");
}

function loopback(request: IncomingMessage) {
  return ["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(request.socket.remoteAddress ?? "");
}

function trustedOrigin(request: IncomingMessage) {
  const origin = request.headers.origin;
  if (!origin) return true;
  return origin === "app://-";
}

function authorized(request: IncomingMessage, url: URL) {
  return request.headers.authorization === `Bearer ${accessToken}` || url.searchParams.get("token") === accessToken;
}

function asStatus(value: unknown) {
  if (!issueStatuses.includes(value as IssueStatus)) throw new Error("invalid_status");
  return value as IssueStatus;
}

function asPriority(value: unknown) {
  if (!issuePriorities.includes(value as IssuePriority)) throw new Error("invalid_priority");
  return value as IssuePriority;
}

function cleanString(value: unknown, limit = 10000) {
  if (value === undefined || value === null) return "";
  if (typeof value !== "string" || value.length > limit || value.includes("\0")) throw new Error("invalid_string");
  return value.trim();
}

function asLabels(value: unknown) {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.some(item => typeof item !== "string")) throw new Error("invalid_labels");
  return value.map(item => item.trim()).filter(Boolean).slice(0, 20);
}

function asMaxConcurrency(value: unknown) {
  if (value === undefined || value === null) return undefined;
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) throw new Error("invalid_agent_max_concurrency");
  return cleanMaxConcurrency(parsed);
}

function asSandboxMode(value: unknown): AgentSandboxMode {
  if (value === undefined || value === null || value === "") return "workspace-write";
  if (!agentSandboxModes.includes(value as AgentSandboxMode)) throw new Error("invalid_agent_sandbox_mode");
  return value as AgentSandboxMode;
}

function agentProfileInput(body: Record<string, unknown>) {
  return {
    name: cleanString(body.name, 80),
    description: cleanString(body.description, 500),
    instructions: cleanString(body.instructions, 100000),
    model: cleanString(body.model, 80) as AgentModel,
    reasoning_effort: cleanString(body.reasoning_effort, 20) as AgentReasoningEffort,
    sandbox_mode: asSandboxMode(body.sandbox_mode),
    max_concurrency: asMaxConcurrency(body.max_concurrency),
  };
}

function defaultAgentInput(body: Record<string, unknown>) {
  const model = cleanString(body.model, 80) as AgentModel;
  const reasoning_effort = cleanString(body.reasoning_effort, 20) as AgentReasoningEffort;
  if (!model) throw new Error("invalid_agent_model");
  if (!reasoning_effort) throw new Error("invalid_agent_reasoning_effort");
  return { model, reasoning_effort, sandbox_mode: asSandboxMode(body.sandbox_mode), max_concurrency: asMaxConcurrency(body.max_concurrency) };
}

function asAgentAvatar(value: unknown) {
  if (value === undefined) return undefined;
  if (typeof value !== "string" || value.length > 400000) throw new Error("invalid_agent_avatar");
  if (!value) return "";
  if (/^icon:[a-z0-9_-]{1,32}$/i.test(value)) return value.toLowerCase();
  if (!/^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(value)) throw new Error("invalid_agent_avatar");
  return value;
}

function parseIssuePatch(body: Record<string, unknown>) {
  const patch: Record<string, unknown> = {};
  if ("thread_id" in body) throw new Error("issue_session_binding_disabled");
  if ("project_id" in body) patch.project_id = cleanString(body.project_id, 200);
  if ("title" in body) patch.title = cleanString(body.title, 500);
  if ("description" in body) patch.description = cleanString(body.description, 100000);
  if ("reply_draft" in body) patch.reply_draft = cleanString(body.reply_draft, 100000);
  if ("status" in body) patch.status = asStatus(body.status);
  if ("priority" in body) patch.priority = asPriority(body.priority);
  if ("pinned" in body) {
    if (typeof body.pinned !== "boolean") throw new Error("invalid_pinned");
    patch.pinned = body.pinned;
  }
  if ("sort_order" in body) {
    if (typeof body.sort_order !== "number" || !Number.isFinite(body.sort_order)) throw new Error("invalid_sort_order");
    patch.sort_order = body.sort_order;
  }
  if ("workspace_path" in body) patch.workspace_path = cleanString(body.workspace_path, 4096) || null;
  if ("agent_enabled" in body) {
    if (typeof body.agent_enabled !== "boolean") throw new Error("invalid_agent_enabled");
    patch.agent_enabled = body.agent_enabled;
  }
  if ("agent_id" in body) patch.agent_id = cleanString(body.agent_id, 200) || null;
  if ("user_assigned" in body) {
    if (typeof body.user_assigned !== "boolean") throw new Error("invalid_user_assigned");
    patch.user_assigned = body.user_assigned;
  }
  if ("needs_attention" in body) {
    if (typeof body.needs_attention !== "boolean") throw new Error("invalid_needs_attention");
    patch.needs_attention = body.needs_attention;
  }
  if ("pending_actor" in body) {
    if (body.pending_actor !== "user" && body.pending_actor !== "agent") throw new Error("invalid_pending_actor");
    patch.pending_actor = body.pending_actor;
  }
  if ("labels" in body) {
    patch.labels = asLabels(body.labels);
  }
  return patch;
}

function errorCode(error: unknown) {
  const message = error instanceof Error ? error.message : "request_failed";
  if (message.startsWith("SQLITE_") || message.includes("database is")) return "database_unavailable";
  return message;
}

function errorStatus(code: string) {
  if (code === "version_conflict" || code === "reply_busy" || code === "update_in_progress" || code === "issue_execution_locked" || code === "issue_execution_running" || code === "issue_session_handed_off") return 409;
  if (code.endsWith("_not_found")) return 404;
  if (code === "database_unavailable" || code === "database_integrity_check_failed") return 503;
  return 400;
}

function spawnUpdateRelaunch(runtimePid: number, updates: { core: string | null; compatibility: string | null }, drainPath: string) {
  const descriptor = openSync(updateLogPath, "a");
  const executable = isSea() ? activeCoreExecutable() : process.execPath;
  const updateArgs = ["apply-update", String(runtimePid), "--drain-path", drainPath, ...(updates.core ? ["--expected-core", updates.core] : []), ...(updates.compatibility ? ["--expected-compatibility", updates.compatibility] : [])];
  const args = isSea() ? updateArgs : [...process.execArgv, process.argv[1], ...updateArgs];
  const child = spawn(executable, args, { cwd: process.cwd(), detached: true, env: { ...process.env, BETTER_CODEX_LAUNCHER_PATH: process.env.BETTER_CODEX_LAUNCHER_PATH ?? process.execPath }, stdio: ["ignore", descriptor, descriptor], windowsHide: true });
  child.unref();
  closeSync(descriptor);
  return child.pid ?? null;
}

export function startServer() {
  if (!Number.isInteger(runtimePort) || runtimePort < 0 || runtimePort > 65535) throw new Error("invalid_runtime_port");
  const identity = createRuntimeIdentity();
  acquireRuntimeLock(identity.instanceId);
  let store: Store;
  try {
    store = new Store();
    if (!mockupEnabled) syncAgentProfiles(store.listAgentProfiles());
  } catch (error) {
    clearRuntimeState(identity.instanceId);
    throw error;
  }
  let cleaned = false;
  let updateRelaunchScheduled = false;
  let updateInstallInProgress = false;
  const worker = new IssueWorker(store);
  const withAvatar = <T extends { id: string; is_default?: boolean }>(profile: T) => ({
    ...profile,
    avatar: store.getAgentAvatar(profile.is_default ? "default" : profile.id),
  });
  const withDefaultConcurrency = <T,>(profile: T) => ({ ...profile, max_concurrency: store.getDefaultAgentMaxConcurrency() });
  const sandboxModeForAgent = (agentId: string | null | undefined) => agentId ? store.getAgentProfile(agentId)?.sandbox_mode || defaultAgentProfile().sandbox_mode : defaultAgentProfile().sandbox_mode;
  const visibleAgentProfiles = () => [withAvatar(withDefaultConcurrency(defaultAgentProfile())), ...store.listAgentProfiles().map(withAvatar)];
  const stopUpdateChecks = mockupEnabled ? () => {} : startGatewayUpdateChecks();
  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    stopIssueReplies(store);
    worker.stop();
    stopUpdateChecks();
    clearRuntimeState(identity.instanceId);
    store.close();
  };
  const server = createServer((request, response) => {
    void (async () => {
      if (!request.url || !loopback(request) || !trustedOrigin(request)) return sendJson(response, 403, { error: "forbidden" });
      const url = new URL(request.url, "http://127.0.0.1");
      const path = url.pathname.split("/").filter(Boolean);
      const method = request.method ?? "GET";

      if (method === "OPTIONS") return sendPreflight(response);
      if (url.pathname === "/health") {
        const database = store.health();
        const address = server.address();
        const activePort = typeof address === "object" && address ? address.port : 0;
        return sendJson(response, database.ok ? 200 : 503, { ok: database.ok, name: "Better Codex Runtime", version: identity.version, pid: process.pid, port: activePort, instanceId: identity.instanceId, database, compatibility: readCompatibilityStatus() });
      }
      if (!authorized(request, url)) return sendJson(response, 401, { error: "unauthorized" });
      if (url.pathname === "/api/issues/attachments" && method === "POST") {
        const body = await readBody(request, maxPastedImageBodyBytes);
        return sendJson(response, 201, savePastedImage(body.data));
      }
      if (url.pathname === "/api/bootstrap" && method === "GET") {
        const agentModelCatalog = await readModelCatalog();
        const agentModels = agentModelCatalog.map(model => model.id);
        const agentReasoningEfforts = [...new Set(agentModelCatalog.flatMap(model => model.supportedReasoningEfforts.map(effort => effort.value)))];
        const mockup = mockupEnabled ? readMockupState() : null;
        return sendJson(response, 200, { projects: mockup ? mockup.projects : store.listProjects(), agents: mockup ? mockup.agents : visibleAgentProfiles(), statuses: issueStatuses, priorities: issuePriorities, appearance: readCodexAppearance(), locale: readCodexLocale(), user: readCodexUserProfile(), agentModelCatalog, agentModels, agentReasoningEfforts, autoDispatch: mockup ? mockup.auto_dispatch : store.getAutoDispatch(), schedulerModel: mockup ? mockup.scheduler_model : store.getSchedulerModel(defaultAgentProfile().model), schedulerReasoningEffort: mockup ? mockup.scheduler_reasoning_effort : store.getSchedulerReasoningEffort(), mockup: mockupEnabled });
      }
      if (mockupEnabled && url.pathname === "/api/mockup/state" && method === "GET") {
        return sendJson(response, 200, readMockupState());
      }
      if (mockupEnabled && url.pathname === "/api/mockup/state" && method === "PUT") {
        return sendJson(response, 200, replaceMockupState(await readBody(request, maxMockupBytes)));
      }
      if (mockupEnabled && url.pathname === "/api/mockup/reset" && method === "POST") {
        return sendJson(response, 200, resetMockupState());
      }
      if (mockupEnabled && url.pathname === "/api/settings/auto-dispatch" && ["GET", "PATCH"].includes(method)) {
        if (method === "GET") return sendJson(response, 200, { enabled: readMockupState().auto_dispatch });
        const body = await readBody(request);
        if (typeof body.enabled !== "boolean") throw new Error("invalid_auto_dispatch");
        const updated = updateMockupState(state => { state.auto_dispatch = body.enabled === true; }).state;
        return sendJson(response, 200, { enabled: updated.auto_dispatch });
      }
      if (mockupEnabled && url.pathname === "/api/settings/scheduler-model" && ["GET", "PATCH"].includes(method)) {
        if (method === "GET") {
          const state = readMockupState();
          return sendJson(response, 200, { model: state.scheduler_model, reasoning_effort: state.scheduler_reasoning_effort });
        }
        const body = await readBody(request);
        const model = cleanString(body.model, 200);
        const catalog = await readModelCatalog();
        const selected = catalog.find(item => item.id === model);
        if (!selected) throw new Error("invalid_model");
        const updated = updateMockupState(state => {
          state.scheduler_model = model;
          if (!selected.supportedReasoningEfforts.some(item => item.value === state.scheduler_reasoning_effort)) state.scheduler_reasoning_effort = selected.defaultReasoningEffort;
        }).state;
        return sendJson(response, 200, { model: updated.scheduler_model, reasoning_effort: updated.scheduler_reasoning_effort });
      }
      if (mockupEnabled && url.pathname === "/api/settings/scheduler-reasoning-effort" && ["GET", "PATCH"].includes(method)) {
        const state = readMockupState();
        if (method === "GET") return sendJson(response, 200, { reasoning_effort: state.scheduler_reasoning_effort });
        const body = await readBody(request);
        const effort = cleanString(body.reasoning_effort, 20);
        const catalog = await readModelCatalog();
        const model = catalog.find(item => item.id === state.scheduler_model);
        if (!model?.supportedReasoningEfforts.some(item => item.value === effort)) throw new Error("invalid_scheduler_reasoning_effort");
        const updated = updateMockupState(next => { next.scheduler_reasoning_effort = effort; }).state;
        return sendJson(response, 200, { reasoning_effort: updated.scheduler_reasoning_effort });
      }
      if (mockupEnabled && url.pathname === "/api/agents" && method === "GET") {
        return sendJson(response, 200, readMockupState().agents);
      }
      if (mockupEnabled && url.pathname === "/api/agents" && method === "POST") {
        const body = await readBody(request);
        const agentId = `mockup-agent-${randomUUID()}`;
        const updated = updateMockupState(state => {
          state.agents.push({ ...body, id: agentId, role: "custom", is_default: false, version: 1 });
        }).state;
        return sendJson(response, 201, updated.agents.find(agent => agent.id === agentId));
      }
      if (mockupEnabled && url.pathname === "/api/agents/default" && method === "PATCH") {
        const body = await readBody(request);
        const updated = updateMockupState(state => {
          requireVersion(body, state.agents[0]);
          state.agents[0] = { ...state.agents[0], ...body, id: "", role: "codex", is_default: true, version: Number(state.agents[0].version) + 1 };
        }).state;
        return sendJson(response, 200, updated.agents[0]);
      }
      if (mockupEnabled && path[0] === "api" && path[1] === "agents" && path[2] && path.length === 3) {
        const agentId = decodeURIComponent(path[2]);
        if (method === "GET") {
          const agent = readMockupState().agents.find(item => item.id === agentId && item.is_default !== true);
          return agent ? sendJson(response, 200, agent) : sendJson(response, 404, { error: "agent_not_found" });
        }
        if (method === "DELETE") {
          const body = await readBody(request);
          updateMockupState(state => {
            const index = state.agents.findIndex(agent => agent.id === agentId && agent.is_default !== true);
            if (index < 0) throw new Error("agent_not_found");
            requireVersion(body, state.agents[index]);
            state.agents.splice(index, 1);
            state.issues = state.issues.map(issue => issue.agent_id === agentId ? { ...issue, agent_enabled: false, agent_id: null, mockup_agent_name: "", user_assigned: false, needs_attention: false, pending_actor: "user", version: Number(issue.version) + 1, updated_at: new Date().toISOString() } : issue);
          });
          return sendJson(response, 200, { ok: true });
        }
        if (method === "PATCH") {
          const body = await readBody(request);
          const updated = updateMockupState(state => {
            const index = state.agents.findIndex(agent => agent.id === agentId && agent.is_default !== true);
            if (index < 0) throw new Error("agent_not_found");
            requireVersion(body, state.agents[index]);
            state.agents[index] = { ...state.agents[index], ...body, id: agentId, is_default: false, version: Number(state.agents[index].version) + 1 };
          }).state;
          return sendJson(response, 200, updated.agents.find(agent => agent.id === agentId));
        }
      }
      if (mockupEnabled && url.pathname === "/api/issues" && method === "GET") {
        const query = String(url.searchParams.get("search") || "").trim().toLowerCase();
        const archived = url.searchParams.get("archived") === "1";
        const issues = readMockupState().issues.filter(issue => Boolean(issue.archived_at) === archived && (!query || [issue.identifier, issue.title, issue.description, ...(Array.isArray(issue.labels) ? issue.labels : [])].join(" ").toLowerCase().includes(query)));
        return sendJson(response, 200, issues);
      }
      if (mockupEnabled && url.pathname === "/api/issues" && method === "POST") {
        const body = await readBody(request);
        let issueId = "";
        const updated = updateMockupState(state => {
          const nextNumber = state.issues.reduce((max, issue) => Math.max(max, Number(String(issue.identifier).replace(/\D/g, "")) || 0), 19) + 1;
          const now = new Date().toISOString();
          issueId = `mockup-${nextNumber}`;
          state.issues.push({
            ...body,
            id: issueId,
            identifier: `BET-${nextNumber}`,
            project_id: String(body.project_id || state.project.id),
            sort_order: Number.isFinite(Number(body.sort_order)) ? Number(body.sort_order) : (state.issues.length + 1) * 1000,
            created_at: now,
            updated_at: now,
            version: 1,
          });
        }).state;
        return sendJson(response, 201, updated.issues.find(issue => issue.id === issueId));
      }
      if (mockupEnabled && path[0] === "api" && path[1] === "issues" && path[2]) {
        const issueId = decodeURIComponent(path[2]);
        if (method === "GET" && path.length === 3) {
          const issue = readMockupState().issues.find(item => item.id === issueId || item.identifier === issueId);
          return issue ? sendJson(response, 200, issue) : sendJson(response, 404, { error: "issue_not_found" });
        }
        if (method === "GET" && path[3] === "conversation") {
          const issue = readMockupState().issues.find(item => item.id === issueId || item.identifier === issueId);
          return issue ? sendJson(response, 200, { messages: [] }) : sendJson(response, 404, { error: "issue_not_found" });
        }
        if (method === "POST" && path[3] === "start") {
          const body = await readBody(request);
          const updated = updateMockupState(state => {
            const index = state.issues.findIndex(issue => issue.id === issueId || issue.identifier === issueId);
            if (index < 0) throw new Error("issue_not_found");
            const current = state.issues[index];
            requireVersion(body, current);
            const status = String(body.status || current.status);
            if (["backlog", "done", "cancelled"].includes(status)) throw new Error("issue_not_startable");
            state.issues[index] = {
              ...current,
              ...body,
              id: current.id,
              identifier: current.identifier,
              project_id: current.project_id,
              status: "in_progress",
              agent_enabled: true,
              user_assigned: false,
              agent_id: body.agent_id || null,
              needs_attention: false,
              pending_actor: "agent",
              mockup_run_status: "claimed",
              version: Number(current.version) + 1,
              updated_at: new Date().toISOString(),
            };
          }).state;
          return sendJson(response, 202, updated.issues.find(issue => issue.id === issueId || issue.identifier === issueId));
        }
        if (method === "POST" && path[3] === "stop") {
          const updated = updateMockupState(state => {
            const index = state.issues.findIndex(issue => issue.id === issueId || issue.identifier === issueId);
            if (index < 0) throw new Error("issue_not_found");
            const current = state.issues[index];
            state.issues[index] = {
              ...current,
              status: current.status === "in_progress" ? "blocked" : current.status,
              mockup_run_status: "interrupted",
              needs_attention: true,
              pending_actor: "user",
              version: Number(current.version) + 1,
              updated_at: new Date().toISOString(),
            };
          }).state;
          return sendJson(response, 200, updated.issues.find(issue => issue.id === issueId || issue.identifier === issueId));
        }
        if (method === "POST" && path[3] === "session-handoff") {
          const body = await readBody(request);
          const threadId = normalizeSessionId(cleanString(body.thread_id, 200));
          if (!threadId) throw new Error("session_required");
          const updated = updateMockupState(state => {
            const index = state.issues.findIndex(issue => issue.id === issueId || issue.identifier === issueId);
            if (index < 0) throw new Error("issue_not_found");
            const current = state.issues[index];
            if (normalizeSessionId(String(current.run_thread_id || "")) !== threadId) throw new Error("issue_session_mismatch");
            if (current.session_handoff_at) return;
            const timestamp = new Date().toISOString();
            state.issues[index] = { ...current, session_handoff_at: timestamp, version: Number(current.version) + 1, updated_at: timestamp };
          }).state;
          return sendJson(response, 200, updated.issues.find(issue => issue.id === issueId || issue.identifier === issueId));
        }
        if (method === "POST" && path[3] === "archive") {
          const body = await readBody(request);
          const archived = updateMockupState(state => {
            const index = state.issues.findIndex(issue => issue.id === issueId || issue.identifier === issueId);
            if (index < 0) throw new Error("issue_not_found");
            requireVersion(body, state.issues[index]);
            const timestamp = new Date().toISOString();
            state.issues[index] = { ...state.issues[index], archived_at: timestamp, version: Number(state.issues[index].version) + 1, updated_at: timestamp };
          }).state;
          return sendJson(response, 200, archived.issues.find(issue => issue.id === issueId || issue.identifier === issueId));
        }
        if (method === "POST" && path[3] === "unarchive") {
          const body = await readBody(request);
          const restored = updateMockupState(state => {
            const index = state.issues.findIndex(issue => issue.id === issueId || issue.identifier === issueId);
            if (index < 0) throw new Error("issue_not_found");
            requireVersion(body, state.issues[index]);
            const timestamp = new Date().toISOString();
            state.issues[index] = { ...state.issues[index], archived_at: null, version: Number(state.issues[index].version) + 1, updated_at: timestamp };
          }).state;
          return sendJson(response, 200, restored.issues.find(issue => issue.id === issueId || issue.identifier === issueId));
        }
        if (method === "DELETE" && path.length === 3) {
          const body = await readBody(request);
          updateMockupState(state => {
            const index = state.issues.findIndex(issue => issue.id === issueId || issue.identifier === issueId);
            if (index < 0) throw new Error("issue_not_found");
            requireVersion(body, state.issues[index]);
            if (!state.issues[index].archived_at) throw new Error("issue_not_archived");
            state.issues.splice(index, 1);
          });
          return sendJson(response, 200, { ok: true });
        }
        if (method === "PATCH" && path.length === 3) {
          const body = await readBody(request);
          const updated = updateMockupState(state => {
            const index = state.issues.findIndex(issue => issue.id === issueId || issue.identifier === issueId);
            if (index < 0) throw new Error("issue_not_found");
            const current = state.issues[index];
            requireVersion(body, current);
            const statusChanged = body.status !== undefined && body.status !== current.status;
            const sortOrder = statusChanged && body.sort_order === undefined
              ? state.issues.reduce((max, issue) => issue.status === body.status ? Math.max(max, Number(issue.sort_order)) : max, 0) + 1000
              : body.sort_order === undefined ? current.sort_order : body.sort_order;
            let agentEnabled = body.agent_enabled === undefined ? Boolean(current.agent_enabled) : body.agent_enabled === true;
            let userAssigned = body.user_assigned === undefined ? Boolean(current.user_assigned) : body.user_assigned === true;
            let agentId = body.agent_id === undefined ? current.agent_id : body.agent_id || null;
            if (userAssigned) {
              agentEnabled = false;
              agentId = null;
            } else if (agentEnabled) {
              userAssigned = false;
            } else {
              agentId = null;
            }
            state.issues[index] = {
              ...current,
              ...body,
              id: current.id,
              identifier: current.identifier,
              project_id: body.project_id === undefined ? current.project_id : body.project_id,
              sort_order: sortOrder,
              agent_enabled: agentEnabled,
              agent_id: agentId,
              user_assigned: userAssigned,
              version: Number(current.version) + 1,
              updated_at: new Date().toISOString(),
            };
          }).state;
          return sendJson(response, 200, updated.issues.find(issue => issue.id === issueId || issue.identifier === issueId));
        }
        if (method === "POST" && path[3] === "move") {
          const body = await readBody(request);
          const status = asStatus(body.status);
          const beforeId = cleanString(body.before_id, 200);
          const updated = updateMockupState(state => {
            const index = state.issues.findIndex(issue => issue.id === issueId || issue.identifier === issueId);
            if (index < 0) throw new Error("issue_not_found");
            requireVersion(body, state.issues[index]);
            const [moving] = state.issues.splice(index, 1);
            moving.status = status;
            moving.version = Number(moving.version) + 1;
            moving.updated_at = new Date().toISOString();
            const targetIndex = beforeId ? state.issues.findIndex(issue => issue.id === beforeId && issue.status === status) : -1;
            if (targetIndex >= 0) state.issues.splice(targetIndex, 0, moving);
            else {
              const lastStatusIndex = state.issues.reduce((last, issue, issueIndex) => issue.status === status ? issueIndex : last, -1);
              state.issues.splice(lastStatusIndex + 1, 0, moving);
            }
            state.issues.forEach((issue, issueIndex) => { issue.sort_order = (issueIndex + 1) * 1000; });
          }).state;
          return sendJson(response, 200, updated.issues.find(issue => issue.id === issueId || issue.identifier === issueId));
        }
        return sendJson(response, 400, { error: "mockup_action_not_supported" });
      }
      if (url.pathname === "/api/settings/auto-dispatch" && method === "GET") {
        return sendJson(response, 200, { enabled: store.getAutoDispatch() });
      }
      if (url.pathname === "/api/settings/auto-dispatch" && method === "PATCH") {
        const body = await readBody(request);
        if (typeof body.enabled !== "boolean") throw new Error("invalid_auto_dispatch");
        const enabled = store.setAutoDispatch(body.enabled);
        if (enabled) worker.wake();
        return sendJson(response, 200, { enabled });
      }
      if (url.pathname === "/api/settings/scheduler-model" && method === "GET") {
        return sendJson(response, 200, { model: store.getSchedulerModel(defaultAgentProfile().model), reasoning_effort: store.getSchedulerReasoningEffort() });
      }
      if (url.pathname === "/api/settings/scheduler-model" && method === "PATCH") {
        const body = await readBody(request);
        const model = cleanString(body.model, 200);
        const catalog = await readModelCatalog();
        const selected = catalog.find(item => item.id === model);
        if (!selected) throw new Error("invalid_model");
        store.setSchedulerModel(model);
        const currentEffort = store.getSchedulerReasoningEffort();
        const reasoningEffort = selected.supportedReasoningEfforts.some(item => item.value === currentEffort) ? currentEffort : store.setSchedulerReasoningEffort(selected.defaultReasoningEffort);
        return sendJson(response, 200, { model: store.getSchedulerModel(defaultAgentProfile().model), reasoning_effort: reasoningEffort });
      }
      if (url.pathname === "/api/settings/scheduler-reasoning-effort" && method === "GET") {
        return sendJson(response, 200, { reasoning_effort: store.getSchedulerReasoningEffort() });
      }
      if (url.pathname === "/api/settings/scheduler-reasoning-effort" && method === "PATCH") {
        const body = await readBody(request);
        const effort = cleanString(body.reasoning_effort, 20);
        const catalog = await readModelCatalog();
        const model = catalog.find(item => item.id === store.getSchedulerModel(defaultAgentProfile().model));
        if (!model?.supportedReasoningEfforts.some(item => item.value === effort)) throw new Error("invalid_scheduler_reasoning_effort");
        return sendJson(response, 200, { reasoning_effort: store.setSchedulerReasoningEffort(effort) });
      }
      if (url.pathname === "/api/update" && method === "GET") return sendJson(response, 200, getGatewayUpdateState());
      if (url.pathname === "/api/update/check" && method === "POST") return sendJson(response, 200, await checkGatewayUpdate());
      if (url.pathname === "/api/update/install" && method === "POST") {
        if (updateInstallInProgress) throw new Error("update_in_progress");
        if (hasActiveIssueReplies()) throw new Error("reply_busy");
        updateInstallInProgress = true;
        try {
          const result = await installGatewayUpdate();
          const updated = result.core.updated || result.compatibility.updated;
          const updates = { core: result.core.updated ? result.core.version : null, compatibility: result.compatibility.updated ? result.compatibility.version : null };
          const shouldRelaunch = updated && !updateRelaunchScheduled;
          if (shouldRelaunch) {
            updateRelaunchScheduled = true;
            recordGatewayUpdateActivation("activating", null, updates);
          }
          sendJson(response, updated ? 202 : 200, { accepted: updated, updated, state: getGatewayUpdateState(), result });
          if (!shouldRelaunch) {
            updateInstallInProgress = false;
            return;
          }
          const drainPath = join(runPath, `update-drain-${randomUUID()}`);
          setTimeout(() => {
            try {
              const ownerPid = spawnUpdateRelaunch(process.pid, updates, drainPath);
              recordGatewayUpdateActivation("activating", null, updates, ownerPid);
              server.close(() => {
                cleanup();
                writeFileSync(drainPath, String(process.pid), { mode: 0o600 });
                process.exit(0);
              });
            } catch (error) {
              updateInstallInProgress = false;
              updateRelaunchScheduled = false;
              recordGatewayUpdateActivation("error", error instanceof Error ? error.message : "update_activation_failed");
            }
          }, 250);
          return;
        } catch (error) {
          updateInstallInProgress = false;
          throw error;
        }
      }
      if (url.pathname === "/api/agents" && method === "GET") return sendJson(response, 200, visibleAgentProfiles());
      if (url.pathname === "/api/agents" && method === "POST") {
        const body = await readBody(request);
        const profile = store.createAgentProfile(agentProfileInput(body));
        const avatar = asAgentAvatar(body.avatar);
        if (avatar !== undefined) store.setAgentAvatar(profile.id, avatar);
        syncAgentProfiles(store.listAgentProfiles());
        return sendJson(response, 201, withAvatar(profile));
      }
      if (url.pathname === "/api/agents/default" && method === "PATCH") {
        const body = await readBody(request);
        const input = defaultAgentInput(body);
        const profile = updateDefaultAgentProfile(input);
        if (input.max_concurrency !== undefined) {
          store.setDefaultAgentMaxConcurrency(input.max_concurrency);
          worker.wake();
        }
        const avatar = asAgentAvatar(body.avatar);
        if (avatar !== undefined) store.setAgentAvatar("default", avatar);
        return sendJson(response, 200, withAvatar(withDefaultConcurrency(profile)));
      }
      if (url.pathname === "/api/agents/default/avatar" && method === "PATCH") {
        const avatar = asAgentAvatar((await readBody(request)).avatar);
        if (avatar === undefined) throw new Error("invalid_agent_avatar");
        store.setAgentAvatar("default", avatar);
        return sendJson(response, 200, withAvatar(withDefaultConcurrency(defaultAgentProfile())));
      }
      if (path[0] === "api" && path[1] === "agents" && path[2]) {
        const profile = store.getAgentProfile(decodeURIComponent(path[2]));
        if (!profile) return sendJson(response, 404, { error: "agent_not_found" });
        if (method === "GET" && path.length === 3) return sendJson(response, 200, withAvatar(profile));
        if (method === "PATCH" && path.length === 4 && path[3] === "avatar") {
          const avatar = asAgentAvatar((await readBody(request)).avatar);
          if (avatar === undefined) throw new Error("invalid_agent_avatar");
          store.setAgentAvatar(profile.id, avatar);
          return sendJson(response, 200, withAvatar(profile));
        }
        if (method === "PATCH" && path.length === 3) {
          const body = await readBody(request);
          const version = Number(body.version);
          if (!Number.isInteger(version) || version < 1) throw new Error("invalid_version");
          const updated = store.updateAgentProfile(profile.id, version, agentProfileInput(body));
          const avatar = asAgentAvatar(body.avatar);
          if (avatar !== undefined) store.setAgentAvatar(profile.id, avatar);
          syncAgentProfiles(store.listAgentProfiles());
          if (updated.max_concurrency > profile.max_concurrency) worker.wake();
          return sendJson(response, 200, withAvatar(updated));
        }
        if (method === "DELETE" && path.length === 3) {
          const body = await readBody(request);
          store.deleteAgentProfile(profile.id, Number(body.version));
          syncAgentProfiles(store.listAgentProfiles());
          return sendJson(response, 200, { ok: true });
        }
      }
      if (url.pathname === "/api/projects" && method === "GET") return sendJson(response, 200, store.listProjects());
      if (url.pathname === "/api/projects" && method === "POST") {
        const body = await readBody(request);
        const project = store.createProject({
          name: cleanString(body.name, 120),
          workspacePath: cleanString(body.workspace_path, 4096),
        });
        return sendJson(response, 201, project);
      }
      if (url.pathname === "/api/projects/ensure" && method === "POST") {
        const body = await readBody(request);
        const project = store.ensureProject({
          externalId: cleanString(body.external_id, 200),
          name: cleanString(body.name, 120) || "Codex",
          workspacePath: cleanString(body.workspace_path, 4096),
        });
        if (project.workspace_path) worker.wake();
        return sendJson(response, 200, project);
      }
      if (path[0] === "api" && path[1] === "sessions" && path[2] && path[3] === "workspace" && path.length === 4 && method === "GET") {
        const threadId = normalizeSessionId(decodeURIComponent(path[2]));
        if (!threadId) throw new Error("session_required");
        return sendJson(response, 200, { workspace_path: sessionWorkspace(threadId) || "" });
      }
      if (url.pathname === "/api/issues" && method === "GET") {
        const issues = await reconcileInterruptedIssues(store, store.listIssues({
          projectId: url.searchParams.get("project_id") || undefined,
          search: url.searchParams.get("search") || undefined,
          archived: url.searchParams.get("archived") === "1",
        }));
        return sendJson(response, 200, issues.map(issue => ({
          ...issue,
          reply_status: getIssueReplyState(store, issue.id).status,
        })));
      }
      if (url.pathname === "/api/issues" && method === "POST") {
        const body = await readBody(request);
        const projectId = cleanString(body.project_id, 200);
        if ("ai_enrich" in body && typeof body.ai_enrich !== "boolean") throw new Error("invalid_ai_enrich");
        const aiEnrich = body.ai_enrich === true;
        const agentEnabled = body.agent_enabled === true || aiEnrich;
        if ("thread_id" in body) throw new Error("issue_session_binding_disabled");
        let workspacePath = cleanString(body.workspace_path, 4096);
        const project = store.getProject(projectId);
        if (!project) throw new Error("project_not_found");
        if (!workspacePath) workspacePath = project.workspace_path;
        if (agentEnabled && !workspacePath) {
          throw new Error("workspace_required");
        }
        const agentId = cleanString(body.agent_id, 200);
        if (aiEnrich && agentId && !store.getAgentProfile(agentId)) throw new Error("agent_not_found");
        const issue = store.createIssue({
          projectId,
          title: cleanString(body.title, 500),
          description: cleanString(body.description, 100000),
          status: aiEnrich ? "backlog" : "status" in body ? asStatus(body.status) : undefined,
          priority: "priority" in body ? asPriority(body.priority) : undefined,
          labels: asLabels(body.labels),
          threadId: "",
          workspacePath,
          agentEnabled,
          agentId,
          userAssigned: body.user_assigned === true,
          enrichmentStatus: aiEnrich ? "pending" : null,
        });
        if (aiEnrich) worker.enrichIssue(issue, issue.description, agentId);
        else if (issue.agent_enabled && store.isDispatchable(issue)) worker.wake();
        return sendJson(response, 201, issue);
      }
      if (path[0] === "api" && path[1] === "issues" && path[2]) {
        const issue = store.getIssue(decodeURIComponent(path[2]));
        if (!issue) return sendJson(response, 404, { error: "issue_not_found" });
        if (method === "GET" && path.length === 3) {
          const [current] = await reconcileInterruptedIssues(store, [issue]);
          return sendJson(response, 200, { ...current, reply_status: getIssueReplyState(store, current.id).status });
        }
        if (method === "PATCH" && path.length === 3) {
          const body = await readBody(request);
          const version = Number(body.version);
          if (!Number.isInteger(version) || version < 1) throw new Error("invalid_version");
          const patch = parseIssuePatch(body);
          if ((issue.active_run_status || hasActiveIssueReplies(issue.id) || getIssueReplyState(store, issue.id).status === "running") && Object.keys(patch).some(key => key !== "reply_draft")) throw new Error("issue_execution_running");
          const updated = store.updateIssue(issue.id, version, patch);
          if (store.isDispatchable(updated)) worker.wake();
          return sendJson(response, 200, updated);
        }
        if (method === "POST" && path[3] === "start" && path.length === 4) {
          const body = await readBody(request);
          const version = Number(body.version);
          if (!Number.isInteger(version) || version < 1) throw new Error("invalid_version");
          const patch = parseIssuePatch(body);
          if (issue.archived_at) throw new Error("issue_not_startable");
          if (!issue.agent_enabled) throw new Error("issue_agent_required");
          if (["done", "cancelled"].includes(issue.status)) throw new Error("issue_not_startable");
          const nextStatus = patch.status || issue.status;
          if (["backlog", "done", "cancelled"].includes(String(nextStatus))) throw new Error("issue_not_startable");
          if (issue.active_run_status || hasActiveIssueReplies(issue.id) || getIssueReplyState(store, issue.id).status === "running") throw new Error("issue_execution_running");
          const nextProject = store.getProject(String(patch.project_id || issue.project_id));
          const nextWorkspace = String(patch.workspace_path || issue.workspace_path || nextProject?.workspace_path || "");
          if (!nextWorkspace) throw new Error("workspace_required");
          const updated = store.updateIssue(issue.id, version, {
            ...patch,
            agent_enabled: true,
            user_assigned: false,
            agent_id: cleanString(body.agent_id, 200) || null,
            pending_actor: "agent",
            needs_attention: true,
          });
          if (!worker.startIssue(updated.id)) throw new Error("issue_not_started");
          return sendJson(response, 202, store.getIssue(updated.id));
        }
        if (method === "POST" && path[3] === "stop" && path.length === 4) {
          const stopped = await worker.stopIssue(issue.id);
          const replyStopped = await stopIssueReply(store, issue.id);
          if (!stopped && !replyStopped && (store.getIssue(issue.id)?.active_run_status || hasActiveIssueReplies(issue.id) || getIssueReplyState(store, issue.id).status === "running")) throw new Error("issue_stop_timeout");
          return sendJson(response, 200, store.getIssue(issue.id));
        }
        if (method === "POST" && path[3] === "session-handoff" && path.length === 4) {
          const body = await readBody(request);
          const threadId = normalizeSessionId(cleanString(body.thread_id, 200));
          if (!threadId) throw new Error("session_required");
          return sendJson(response, 200, store.handoffIssueSession(issue.id, threadId));
        }
        if (method === "POST" && path[3] === "archive") {
          const body = await readBody(request);
          const version = Number(body.version);
          if (!Number.isInteger(version) || version < 1) throw new Error("invalid_version");
          if (hasActiveIssueReplies(issue.id) || getIssueReplyState(store, issue.id).status === "running") throw new Error("issue_execution_running");
          if (issue.active_run_status) {
            await worker.stopIssue(issue.id);
            const current = store.getIssue(issue.id);
            if (!current) throw new Error("issue_not_found");
            if (current.active_run_status) throw new Error("issue_execution_running");
            const updated = store.archiveIssue(issue.id, current.version);
            return sendJson(response, 200, updated);
          }
          const updated = store.archiveIssue(issue.id, version);
          return sendJson(response, 200, updated);
        }
        if (method === "POST" && path[3] === "unarchive") {
          const body = await readBody(request);
          const updated = store.unarchiveIssue(issue.id, Number(body.version));
          return sendJson(response, 200, updated);
        }
        if (method === "DELETE" && path.length === 3) {
          const body = await readBody(request);
          store.deleteArchivedIssue(issue.id, Number(body.version));
          return sendJson(response, 200, { ok: true });
        }
        if (method === "GET" && path[3] === "conversation" && path.length === 4) {
          if (store.isEnrichmentPending(issue)) throw new Error("issue_enrichment_pending");
          const [current] = await reconcileInterruptedIssues(store, [issue]);
          const threadId = current.run_thread_id || "";
          const conversation = await readConversationResult(threadId);
          return sendJson(response, 200, {
            ...conversation,
            issue_id: current.id,
            reply: getIssueReplyState(store, current.id),
            user: readCodexUserProfile(),
            issue: store.getIssue(current.id),
          });
        }
        if (method === "POST" && path[3] === "reply" && path.length === 4) {
          if (updateInstallInProgress) throw new Error("update_in_progress");
          if (issue.session_handoff_at) throw new Error("issue_session_handed_off");
          if (issue.active_run_status) throw new Error("issue_execution_running");
          const body = await readBody(request);
          const requestId = cleanString(body.request_id, 200) || randomUUID();
          const message = cleanString(body.message, 100000).trim();
          if (!message) throw new Error("message_required");
          if (!issue.run_thread_id && !store.canAutoStartFromUserMessage(issue)) {
            throw new Error(store.getAutoDispatch() ? "backlog_reply_blocked" : "manual_start_required");
          }
          if (!issue.run_thread_id) {
            const description = issue.description.trim();
            const updated = store.updateIssue(issue.id, issue.version, {
              description: description.endsWith(message) ? description : [description, message].filter(Boolean).join("\n\n"),
              agent_enabled: true,
              pending_actor: "agent",
              needs_attention: true,
            });
            if (!worker.startIssue(updated.id)) throw new Error("issue_not_started");
            return sendJson(response, 202, { issue_id: issue.id, request_id: requestId, status: "running", message, initial_run: true });
          }
          const threadId = issue.run_thread_id || "";
          const reply = startIssueReply(store, {
            issueId: issue.id,
            requestId,
            threadId,
            workspacePath: issue.workspace_path,
            message,
            agentId: issue.agent_id,
            sandboxMode: sandboxModeForAgent(issue.agent_id),
          });
          return sendJson(response, 202, reply);
        }
      }
      if (url.pathname === "/api/shutdown" && method === "POST") {
        sendJson(response, 200, { ok: true });
        setImmediate(() => server.close(() => {
          cleanup();
          process.exit(0);
        }));
        return;
      }
      return sendJson(response, 404, { error: "not_found" });
    })().catch((error) => {
      const code = errorCode(error);
      if (!response.headersSent) sendJson(response, errorStatus(code), { error: code });
      else response.end();
    });
  });

  server.listen(runtimePort, "127.0.0.1", () => {
    const address = server.address();
    if (typeof address !== "object" || !address) throw new Error("runtime_address_unavailable");
    publishRuntimeState({ ...identity, port: address.port });
    if (!mockupEnabled) worker.start();
    console.log(`Better Codex Runtime ${coreVersion} listening on http://127.0.0.1:${address.port}`);
  });
  const stop = () => server.close(() => {
    cleanup();
    process.exit(0);
  });
  server.once("error", error => {
    cleanup();
    console.error(error.message);
    process.exit(1);
  });
  process.once("SIGINT", stop);
  process.once("SIGTERM", stop);
  return server;
}
