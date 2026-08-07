import { spawn } from "node:child_process";
import { closeSync, openSync } from "node:fs";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { isSea } from "node:sea";
import { coreVersion, readCompatibilityStatus } from "./compatibility.js";
import { cleanMaxConcurrency, issuePriorities, issueStatuses, Store, type AgentModel, type AgentReasoningEffort, type IssuePriority, type IssueStatus } from "./db.js";
import { defaultAgentProfile, syncAgentProfiles, updateDefaultAgentProfile } from "./agent-profiles.js";
import { readCodexAppearance } from "./appearance.js";
import { readCodexLocale } from "./locale.js";
import { readCodexUserProfile } from "./user-profile.js";
import { readModelCatalog } from "./model-catalog.js";
import { runtimePort, token, updateLogPath } from "./config.js";
import { acquireRuntimeLock, clearRuntimeState, createRuntimeIdentity, publishRuntimeState } from "./runtime-state.js";
import { activeCoreExecutable, getGatewayUpdateState, installGatewayUpdate, startGatewayUpdateChecks } from "./updater.js";
import { getIssueReplyState, startIssueReply, stopIssueReplies } from "./session-reply.js";
import { normalizeSessionId, readConversationResult, sessionWorkspace } from "./session-transcript.js";
import { IssueWorker } from "./worker.js";

const accessToken = token();

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

function readBody(request: IncomingMessage) {
  return new Promise<Record<string, unknown>>((resolve, reject) => {
    let source = "";
    request.on("data", (chunk) => {
      source += chunk;
      if (source.length > 1024 * 1024) reject(new Error("body_too_large"));
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

function agentProfileInput(body: Record<string, unknown>) {
  return {
    name: cleanString(body.name, 80),
    description: cleanString(body.description, 500),
    instructions: cleanString(body.instructions, 100000),
    model: cleanString(body.model, 80) as AgentModel,
    reasoning_effort: cleanString(body.reasoning_effort, 20) as AgentReasoningEffort,
    max_concurrency: asMaxConcurrency(body.max_concurrency),
  };
}

function defaultAgentInput(body: Record<string, unknown>) {
  const model = cleanString(body.model, 80) as AgentModel;
  const reasoning_effort = cleanString(body.reasoning_effort, 20) as AgentReasoningEffort;
  if (!model) throw new Error("invalid_agent_model");
  if (!reasoning_effort) throw new Error("invalid_agent_reasoning_effort");
  return { model, reasoning_effort, max_concurrency: asMaxConcurrency(body.max_concurrency) };
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
  if (code === "version_conflict" || code === "reply_busy" || code === "issue_execution_locked") return 409;
  if (code.endsWith("_not_found")) return 404;
  if (code === "database_unavailable" || code === "database_integrity_check_failed") return 503;
  return 400;
}

function spawnUpdateRelaunch(runtimePid: number) {
  const descriptor = openSync(updateLogPath, "a");
  const executable = isSea() ? activeCoreExecutable() : process.execPath;
  const args = isSea() ? ["apply-update", String(runtimePid)] : [...process.execArgv, process.argv[1], "apply-update", String(runtimePid)];
  const child = spawn(executable, args, { cwd: process.cwd(), detached: true, env: process.env, stdio: ["ignore", descriptor, descriptor], windowsHide: true });
  child.unref();
  closeSync(descriptor);
}

export function startServer() {
  if (!Number.isInteger(runtimePort) || runtimePort < 0 || runtimePort > 65535) throw new Error("invalid_runtime_port");
  const identity = createRuntimeIdentity();
  acquireRuntimeLock(identity.instanceId);
  let store: Store;
  try {
    store = new Store();
    syncAgentProfiles(store.listAgentProfiles());
  } catch (error) {
    clearRuntimeState(identity.instanceId);
    throw error;
  }
  let cleaned = false;
  const worker = new IssueWorker(store);
  const withAvatar = <T extends { id: string; is_default?: boolean }>(profile: T) => ({
    ...profile,
    avatar: store.getAgentAvatar(profile.is_default ? "default" : profile.id),
  });
  const withDefaultConcurrency = <T,>(profile: T) => ({ ...profile, max_concurrency: store.getDefaultAgentMaxConcurrency() });
  const visibleAgentProfiles = () => [withAvatar(withDefaultConcurrency(defaultAgentProfile())), ...store.listAgentProfiles().map(withAvatar)];
  const stopUpdateChecks = startGatewayUpdateChecks();
  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    stopIssueReplies();
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
      if (url.pathname === "/api/bootstrap" && method === "GET") {
        const agentModelCatalog = await readModelCatalog();
        const agentModels = agentModelCatalog.map(model => model.id);
        const agentReasoningEfforts = [...new Set(agentModelCatalog.flatMap(model => model.supportedReasoningEfforts.map(effort => effort.value)))];
        return sendJson(response, 200, { projects: store.listProjects(), agents: visibleAgentProfiles(), statuses: issueStatuses, priorities: issuePriorities, appearance: readCodexAppearance(), locale: readCodexLocale(), user: readCodexUserProfile(), agentModelCatalog, agentModels, agentReasoningEfforts, autoDispatch: store.getAutoDispatch() });
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
      if (url.pathname === "/api/update" && method === "GET") return sendJson(response, 200, getGatewayUpdateState());
      if (url.pathname === "/api/update/install" && method === "POST") {
        const result = await installGatewayUpdate();
        const updated = result.core.updated || result.compatibility.updated;
        sendJson(response, 200, { ok: true, updated, state: getGatewayUpdateState(), result });
        if (!updated) return;
        setTimeout(() => {
          spawnUpdateRelaunch(process.pid);
          server.close(() => {
            cleanup();
            process.exit(0);
          });
        }, 250);
        return;
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
        const issues = store.listIssues({
          projectId: url.searchParams.get("project_id") || undefined,
          search: url.searchParams.get("search") || undefined,
          archived: url.searchParams.get("archived") === "1",
        });
        return sendJson(response, 200, issues.map(issue => ({
          ...issue,
          reply_status: getIssueReplyState(issue.id).status,
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
        if (method === "GET" && path.length === 3) return sendJson(response, 200, { ...issue, reply_status: getIssueReplyState(issue.id).status });
        if (method === "PATCH" && path.length === 3) {
          const body = await readBody(request);
          const version = Number(body.version);
          if (!Number.isInteger(version) || version < 1) throw new Error("invalid_version");
          const updated = store.updateIssue(issue.id, version, parseIssuePatch(body));
          if (store.isDispatchable(updated)) worker.wake();
          return sendJson(response, 200, updated);
        }
        if (method === "POST" && path[3] === "start" && path.length === 4) {
          const body = await readBody(request);
          const version = Number(body.version);
          if (!Number.isInteger(version) || version < 1) throw new Error("invalid_version");
          const updated = store.updateIssue(issue.id, version, {
            ...parseIssuePatch(body),
            agent_enabled: true,
            user_assigned: false,
            agent_id: cleanString(body.agent_id, 200) || null,
            pending_actor: "agent",
            needs_attention: true,
          });
          if (!worker.startIssue(updated.id)) throw new Error("issue_not_started");
          return sendJson(response, 202, store.getIssue(updated.id));
        }
        if (method === "POST" && path[3] === "archive") {
          const body = await readBody(request);
          const updated = store.archiveIssue(issue.id, Number(body.version));
          return sendJson(response, 200, updated);
        }
        if (method === "GET" && path[3] === "conversation" && path.length === 4) {
          if (store.isEnrichmentPending(issue)) throw new Error("issue_enrichment_pending");
          const threadId = issue.run_thread_id || "";
          const conversation = await readConversationResult(threadId);
          return sendJson(response, 200, {
            ...conversation,
            issue_id: issue.id,
            reply: getIssueReplyState(issue.id),
            user: readCodexUserProfile(),
          });
        }
        if (method === "POST" && path[3] === "reply" && path.length === 4) {
          if (!store.canAutoStartFromUserMessage(issue)) {
            throw new Error(store.getAutoDispatch() ? "backlog_reply_blocked" : "manual_start_required");
          }
          const body = await readBody(request);
          const threadId = issue.run_thread_id || "";
          const reply = startIssueReply({
            issueId: issue.id,
            threadId,
            workspacePath: issue.workspace_path,
            message: cleanString(body.message, 100000),
            agentId: issue.agent_id,
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
    worker.start();
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
