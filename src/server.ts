import { spawn } from "node:child_process";
import { createHash, randomUUID, timingSafeEqual } from "node:crypto";
import { closeSync, existsSync, openSync, readFileSync, renameSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { homedir } from "node:os";
import { isSea } from "node:sea";
import { compareVersions, coreVersion, readCompatibilityStatus } from "./compatibility.js";
import { agentSandboxModes, cleanMaxConcurrency, issuePriorities, issueStatuses, scheduledTaskIntervalUnits, Store, type AgentModel, type AgentReasoningEffort, type AgentSandboxMode, type AgentServiceTier, type Issue, type IssuePriority, type IssueStatus, type ScheduledTask, type ScheduledTaskInput, type ScheduledTaskIntervalUnit } from "./db.js";
import { defaultAgentProfile, syncAgentProfiles, updateDefaultAgentProfile } from "./agent-profiles.js";
import { readCodexAppearance } from "./appearance.js";
import { normalizeCodexLocale, readCodexLocale } from "./locale.js";
import { readCodexUserProfile } from "./user-profile.js";
import { readCodexUsage } from "./codex-usage.js";
import { readModelCatalog } from "./model-catalog.js";
import { attachmentPath, databasePath, runPath, runtimePort, token, updateLogPath } from "./config.js";
import { acquireRuntimeLock, clearRuntimeState, createRuntimeIdentity, publishRuntimeState } from "./runtime-state.js";
import { activeCoreCommand, checkGatewayUpdate, getGatewayUpdateState, installGatewayUpdate, recordGatewayUpdateActivation, startGatewayUpdateChecks } from "./updater.js";
import { packagedBuild } from "./build.js";
import { basename, dirname, extname, join, resolve } from "node:path";
import { normalizeSessionId, readConversationActivity, readConversationAttachment, readConversationResult, sessionWorkspace } from "./session-transcript.js";
import { IssueWorker } from "./worker.js";
import { maxMockupBytes, normalizeMockupLocale, readMockupState, replaceMockupState, resetMockupState, updateMockupState } from "./mockup.js";
import { injectionScript } from "./dom.js";
import { betterCodexWebHostCss, betterCodexWebHostHtml, betterCodexWebHostJavaScript } from "./web-host.js";
import { betterCodexWebIconPng } from "./brand-assets.js";
import { betterCodexWebManifest, betterCodexWebServiceWorker } from "./web-app.js";
import { SyncClient } from "./sync-client.js";
import { readSyncConfiguration, removeSyncConfiguration } from "./sync-config.js";
import { chooseNativeDirectory } from "./native-dialog.js";
import { RuntimeRelayClient } from "./runtime-relay-client.js";
import { readRelayConfiguration, removeRelayConfiguration, type RelayConfiguration } from "./relay-config.js";
import { requestFingerprint, RequestReceiptStore, type RequestReceiptResponse } from "./request-receipts.js";
import { disableProjectionSync, readRemoteMode } from "./remote-mode.js";
import { browseDirectory } from "./directory-browser.js";
import { featureManifest } from "./features.js";
import { webCommandTarget } from "./command-contract.js";

const accessToken = token();
const mockupEnabled = !isSea() && !packagedBuild && process.argv.includes("--mockup");
const webSessionTtlMs = 12 * 60 * 60 * 1000;
const maxWebSessions = 32;
const maxPastedImageBytes = 10 * 1024 * 1024;
const maxPastedImageBodyBytes = Math.ceil(maxPastedImageBytes * 4 / 3) + 1024;
const maxRemoteFileBodyBytes = Math.ceil(20 * 1024 * 1024 * 4 / 3) + 64 * 1024;
const maxIssueDescriptionLength = 100000;
const codexStatePath = join(process.env.CODEX_HOME || join(homedir(), ".codex"), ".codex-global-state.json");
const preloadedRequestBodies = new WeakMap<IncomingMessage, Buffer>();

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

function saveRemoteFile(value: { name: string; type: string; data: string }, requestId: string, index: number) {
  const match = value.data.match(/^data:([a-z0-9][a-z0-9.+-]*\/[a-z0-9][a-z0-9.+-]*);base64,([A-Za-z0-9+/]+={0,2})$/i);
  if (!match || match[1].toLowerCase() !== value.type.toLowerCase()) throw new Error("invalid_file_attachment");
  const bytes = Buffer.from(match[2], "base64");
  if (!bytes.length || bytes.length > maxPastedImageBytes) throw new Error("invalid_file_attachment");
  const inputName = basename(value.name).replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^[-.]+/, "").slice(0, 120) || "file";
  const extension = extname(inputName).slice(0, 16);
  const stem = basename(inputName, extension).slice(0, Math.max(1, 100 - extension.length));
  const digest = createHash("sha256").update(requestId).update("\0").update(String(index)).update("\0").update(inputName).update("\0").update(value.type).update("\0").update(bytes).digest("hex").slice(0, 24);
  const name = `web-${digest}-${stem}${extension}`;
  const path = join(attachmentPath, name);
  if (existsSync(path)) {
    if (!readFileSync(path).equals(bytes)) throw new Error("invalid_file_attachment");
    return { path, created: false };
  }
  writeFileSync(path, bytes, { flag: "wx", mode: 0o600 });
  return { path, created: true };
}

function saveRemoteFiles(value: unknown, requestId: string) {
  if (value === undefined) return { paths: [] as string[], cleanup: () => {} };
  if (!Array.isArray(value) || value.length > 4) throw new Error("invalid_file_attachment");
  const paths: string[] = [];
  const createdPaths: string[] = [];
  const cleanup = () => {
    for (const path of createdPaths) {
      try { unlinkSync(path); } catch {}
    }
  };
  try {
    for (const [index, item] of value.entries()) {
      if (!item || typeof item !== "object" || Array.isArray(item)) throw new Error("invalid_file_attachment");
      const file = item as Record<string, unknown>;
      if (typeof file.name !== "string" || typeof file.type !== "string" || typeof file.data !== "string") throw new Error("invalid_file_attachment");
      const saved = saveRemoteFile({ name: file.name, type: file.type, data: file.data }, requestId, index);
      paths.push(saved.path);
      if (saved.created) createdPaths.push(saved.path);
    }
    return { paths, cleanup };
  } catch (error) {
    cleanup();
    throw error;
  }
}

function withRemoteFilePaths(value: unknown, paths: string[], lengthError = "invalid_string") {
  if (typeof value === "string" && value.length > maxIssueDescriptionLength) throw new Error(lengthError);
  const text = cleanString(value, maxIssueDescriptionLength);
  if (!paths.length) return text;
  const block = `附带文件：\n${paths.map(path => `- ${path}`).join("\n")}`;
  return text ? `${text}\n\n${block}` : block;
}

async function reconcileInterruptedIssues(store: Store, issues: Issue[]) {
  await Promise.all(issues.map(async issue => {
    if (!issue.run_thread_id || issue.archived_at || issue.session_owned || issue.status === "done" || issue.active_run_status || store.getIssueReplyState(issue.id).status === "running") return;
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
      const reply = store.getIssueReplyState(issue.id);
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
    "access-control-allow-headers": "authorization, content-type, x-better-codex-trace-id",
    "access-control-expose-headers": "x-better-codex-trace-id, x-better-codex-request-id",
    "access-control-allow-private-network": "true",
    "cross-origin-resource-policy": "cross-origin",
    "vary": "Origin",
  });
  response.end(body);
}

async function relayWebSessionRequest(configuration: RelayConfiguration, pathname: string, method: "GET" | "DELETE") {
  const remoteResponse = await fetch(`${configuration.relay_url}${pathname}`, {
    method,
    headers: { accept: "application/json", authorization: `Bearer ${configuration.device_token}` },
    redirect: "error",
    signal: AbortSignal.timeout(8_000),
  });
  const text = await remoteResponse.text();
  if (Buffer.byteLength(text) > 65_536) throw new Error("relay_response_too_large");
  const value = (() => { try { return JSON.parse(text) as Record<string, unknown>; } catch { throw new Error("invalid_relay_response"); } })();
  return { status: remoteResponse.status, value };
}

function projectSummaries<T extends { document_views?: unknown; overview_html?: unknown; planning?: unknown }>(projects: T[]) {
  return projects.map(({ document_views: _documentViews, overview_html: _overviewHtml, planning: _planning, ...project }) => project);
}

function sendWeb(response: ServerResponse, status: number, body: string | Buffer, contentType: string, headers: Record<string, string> = {}) {
  response.writeHead(status, {
    "cache-control": "no-store",
    "content-length": Buffer.byteLength(body),
    "content-type": contentType,
    "cross-origin-opener-policy": "same-origin",
    "cross-origin-resource-policy": "same-origin",
    "referrer-policy": "no-referrer",
    "x-content-type-options": "nosniff",
    ...headers,
  });
  response.end(body);
}

function sendPreflight(response: ServerResponse) {
  response.writeHead(204, {
    "access-control-allow-origin": "app://-",
    "access-control-allow-methods": "GET, POST, PATCH, DELETE, OPTIONS",
    "access-control-allow-headers": "authorization, content-type, x-better-codex-trace-id",
    "access-control-allow-private-network": "true",
    "access-control-max-age": "600",
    "vary": "Origin",
  });
  response.end();
}

function readBody(request: IncomingMessage, limit = 1024 * 1024) {
  const preloaded = preloadedRequestBodies.get(request);
  if (preloaded) {
    if (preloaded.length > limit) return Promise.reject(new Error("body_too_large"));
    try {
      const value = preloaded.length ? JSON.parse(preloaded.toString("utf8")) : {};
      if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("invalid_json");
      return Promise.resolve(value as Record<string, unknown>);
    } catch {
      return Promise.reject(new Error("invalid_json"));
    }
  }
  return new Promise<Record<string, unknown>>((resolve, reject) => {
    const declaredLength = Number(request.headers["content-length"]);
    if (Number.isFinite(declaredLength) && declaredLength > limit) {
      request.resume();
      reject(new Error("body_too_large"));
      return;
    }
    const chunks: Buffer[] = [];
    let size = 0;
    let settled = false;
    const fail = (error: Error) => {
      if (settled) return;
      settled = true;
      chunks.length = 0;
      reject(error);
    };
    const onData = (chunk: Buffer | string) => {
      if (settled) return;
      const value = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      size += value.length;
      if (size > limit) {
        request.off("data", onData);
        request.resume();
        fail(new Error("body_too_large"));
        return;
      }
      chunks.push(value);
    };
    request.on("data", onData);
    request.on("error", error => fail(error instanceof Error ? error : new Error("request_error")));
    request.on("end", () => {
      if (settled) return;
      settled = true;
      try {
        const source = Buffer.concat(chunks, size).toString("utf8");
        const value = source ? JSON.parse(source) : {};
        if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("invalid_json");
        resolve(value);
      } catch {
        reject(new Error("invalid_json"));
      }
    });
  });
}

function readRawBody(request: IncomingMessage, limit: number) {
  return new Promise<Buffer>((resolveBody, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    let settled = false;
    const onData = (chunk: Buffer | string) => {
      if (settled) return;
      const value = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      size += value.length;
      if (size > limit) {
        settled = true;
        chunks.length = 0;
        request.off("data", onData);
        request.resume();
        reject(new Error("body_too_large"));
        return;
      }
      chunks.push(value);
    };
    request.on("data", onData);
    request.once("error", error => {
      if (settled) return;
      settled = true;
      reject(error);
    });
    request.once("end", () => {
      if (settled) return;
      settled = true;
      resolveBody(Buffer.concat(chunks, size));
    });
  });
}

function receiptHeaders(response: ServerResponse) {
  const allowed = new Set(["cache-control", "content-language", "content-type", "etag", "location", "x-accel-buffering"]);
  const headers: Record<string, string> = {};
  for (const [name, value] of Object.entries(response.getHeaders())) {
    if (!allowed.has(name.toLowerCase()) || value === undefined) continue;
    headers[name.toLowerCase()] = Array.isArray(value) ? value.join(", ") : String(value);
  }
  return headers;
}

function captureReceiptResponse(response: ServerResponse, finish: (receipt: RequestReceiptResponse) => void) {
  const chunks: Buffer[] = [];
  let finished = false;
  const originalWrite = response.write.bind(response);
  const originalEnd = response.end.bind(response);
  const capture = (chunk: unknown) => {
    if (typeof chunk === "string" || Buffer.isBuffer(chunk) || chunk instanceof Uint8Array) chunks.push(Buffer.from(chunk));
  };
  response.write = ((chunk: unknown, ...args: unknown[]) => {
    capture(chunk);
    return originalWrite(chunk as never, ...args as never[]);
  }) as typeof response.write;
  response.end = ((chunk?: unknown, ...args: unknown[]) => {
    capture(chunk);
    if (!finished) {
      finished = true;
      finish({ status: response.statusCode, headers: receiptHeaders(response), body: Buffer.concat(chunks) });
    }
    return originalEnd(chunk as never, ...args as never[]);
  }) as typeof response.end;
}

function sendReceipt(response: ServerResponse, receipt: RequestReceiptResponse) {
  response.writeHead(receipt.status, { ...receipt.headers, "content-length": receipt.body.length });
  response.end(receipt.body);
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
  if (origin === "app://-") return true;
  const port = request.socket.localPort;
  return Number.isInteger(port) && origin === `http://127.0.0.1:${port}`;
}

function validAccessToken(value: unknown) {
  if (typeof value !== "string") return false;
  const received = Buffer.from(value);
  const expected = Buffer.from(accessToken);
  return received.length === expected.length && timingSafeEqual(received, expected);
}

function bearerToken(request: IncomingMessage) {
  const authorization = String(request.headers.authorization || "");
  return authorization.startsWith("Bearer ") ? authorization.slice("Bearer ".length) : "";
}

function validWebSession(webSessions: Map<string, number>, value: unknown) {
  if (typeof value !== "string" || !value) return false;
  const expiresAt = webSessions.get(value);
  if (!expiresAt) return false;
  if (expiresAt <= Date.now()) {
    webSessions.delete(value);
    return false;
  }
  webSessions.delete(value);
  webSessions.set(value, Date.now() + webSessionTtlMs);
  return true;
}

function createWebSession(webSessions: Map<string, number>) {
  const now = Date.now();
  for (const [sessionToken, expiresAt] of webSessions) {
    if (expiresAt <= now) webSessions.delete(sessionToken);
  }
  while (webSessions.size >= maxWebSessions) {
    const oldest = webSessions.keys().next().value;
    if (typeof oldest !== "string") break;
    webSessions.delete(oldest);
  }
  const sessionToken = randomUUID();
  webSessions.set(sessionToken, now + webSessionTtlMs);
  return sessionToken;
}

function authorized(request: IncomingMessage, url: URL, webSessions: Map<string, number>) {
  const bearer = bearerToken(request);
  return validAccessToken(bearer)
    || validWebSession(webSessions, bearer)
    || validAccessToken(url.searchParams.get("token"));
}

function sameOriginBrowserRequest(request: IncomingMessage) {
  const site = request.headers["sec-fetch-site"];
  return !site || site === "same-origin" || site === "none";
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

function issueDescription(value: unknown) {
  if (typeof value === "string" && value.length > maxIssueDescriptionLength) throw new Error("issue_description_too_long");
  return cleanString(value, maxIssueDescriptionLength);
}

function scheduledTaskInput(store: Store, body: Record<string, unknown>, current?: ScheduledTask): ScheduledTaskInput {
  const projectId = cleanString(body.project_id ?? current?.project_id, 200);
  const project = store.getProject(projectId);
  if (!project) throw new Error("project_not_found");
  const workspacePath = cleanString(project.workspace_path, 4096);
  if (!workspacePath) throw new Error("workspace_required");
  try {
    if (!statSync(workspacePath).isDirectory()) throw new Error("workspace_invalid");
  } catch {
    throw new Error("workspace_invalid");
  }
  const agentId = cleanString(body.agent_id ?? current?.agent_id, 200);
  if (agentId && !store.getAgentProfile(agentId)) throw new Error("agent_not_found");
  if (body.repeat !== undefined && typeof body.repeat !== "boolean") throw new Error("invalid_scheduled_task_repeat");
  const repeat = body.repeat === undefined ? Boolean(current?.repeat) : body.repeat === true;
  const intervalValue = repeat ? Number(body.interval_value ?? current?.interval_value) : undefined;
  const intervalUnit = repeat ? cleanString(body.interval_unit ?? current?.interval_unit, 20) as ScheduledTaskIntervalUnit : undefined;
  if (repeat && (!Number.isInteger(intervalValue) || intervalValue! < 1 || intervalValue! > 999 || !scheduledTaskIntervalUnits.includes(intervalUnit!))) throw new Error("invalid_scheduled_task_interval");
  const enabled = body.enabled === undefined ? current?.enabled !== false : body.enabled === true;
  if (body.enabled !== undefined && typeof body.enabled !== "boolean") throw new Error("invalid_scheduled_task_enabled");
  return {
    name: cleanString(body.name ?? current?.name, 120),
    prompt: cleanString(body.prompt ?? current?.prompt, 100000),
    projectId,
    workspacePath,
    agentId,
    startsAt: cleanString(body.starts_at ?? current?.starts_at, 64),
    repeat,
    intervalValue,
    intervalUnit,
    enabled,
  };
}

function codexProjectTimestamp(value: unknown) {
  const timestamp = typeof value === "number" ? value : Number.NaN;
  if (!Number.isFinite(timestamp) || timestamp <= 0) return undefined;
  const date = new Date(timestamp);
  return Number.isFinite(date.getTime()) ? date.toISOString() : undefined;
}

function syncCodexProjects(store: Store) {
  try {
    const state = JSON.parse(readFileSync(codexStatePath, "utf8")) as Record<string, unknown>;
    const projects = state["local-projects"];
    if (!projects || typeof projects !== "object" || Array.isArray(projects)) return;
    const existing = new Map(store.listProjects().filter(project => project.external_id).map(project => [project.external_id!, project] as const));
    for (const [externalId, value] of Object.entries(projects)) {
      try {
        if (!value || typeof value !== "object" || Array.isArray(value)) continue;
        const project = value as Record<string, unknown>;
        const name = cleanString(project.name, 120);
        const rootPaths = Array.isArray(project.rootPaths) ? project.rootPaths : [];
        const cleanedRootPaths = rootPaths.map(value => cleanString(value, 4096)).filter(Boolean);
        const workspacePath = cleanedRootPaths[0] || "";
        const createdAt = codexProjectTimestamp(project.createdAt);
        const updatedAt = codexProjectTimestamp(project.updatedAt);
        if (!externalId || !name) continue;
        const id = cleanString(externalId, 200);
        const current = existing.get(id);
        if (current?.name === name && current.workspace_path === workspacePath && JSON.stringify(current.root_paths) === JSON.stringify(cleanedRootPaths) && (!createdAt || current.created_at === createdAt) && (!updatedAt || current.updated_at >= updatedAt)) continue;
        existing.set(id, store.ensureProject({ externalId: id, name, workspacePath, rootPaths: cleanedRootPaths, createdAt, updatedAt }));
      } catch {}
    }
  } catch {}
}

function createCodexProject(store: Store, nameValue: unknown, workspaceValue: unknown, projectId?: string) {
  const name = cleanString(nameValue, 120);
  const workspaceInput = cleanString(workspaceValue, 4096);
  if (!name) throw new Error("name_required");
  if (!workspaceInput) throw new Error("workspace_required");
  const workspacePath = resolve(workspaceInput);
  try {
    if (!statSync(workspacePath).isDirectory()) throw new Error("workspace_invalid");
  } catch {
    throw new Error("workspace_invalid");
  }
  let state: Record<string, unknown> = {};
  try {
    state = JSON.parse(readFileSync(codexStatePath, "utf8")) as Record<string, unknown>;
  } catch {
    if (existsSync(codexStatePath)) throw new Error("codex_state_invalid");
  }
  const localProjects = state["local-projects"] && typeof state["local-projects"] === "object" && !Array.isArray(state["local-projects"])
    ? { ...(state["local-projects"] as Record<string, unknown>) }
    : {};
  const existing = Object.entries(localProjects).find(([, value]) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return false;
    return Array.isArray((value as Record<string, unknown>).rootPaths) && ((value as Record<string, unknown>).rootPaths as unknown[]).some(item => typeof item === "string" && resolve(item) === workspacePath);
  }) as [string, Record<string, unknown>] | undefined;
  if (existing) {
    if (projectId) throw new Error("project_exists");
    const [externalId, project] = existing;
    const rootPaths = Array.isArray(project.rootPaths) ? project.rootPaths.filter(value => typeof value === "string").map(value => cleanString(value, 4096)).filter(Boolean) : [workspacePath];
    return store.ensureProject({ externalId: cleanString(project.id, 200) || externalId, name: cleanString(project.name, 120) || name, workspacePath: rootPaths[0] || workspacePath, rootPaths });
  }
  const id = `local-${randomUUID().replaceAll("-", "")}`;
  const timestamp = Date.now();
  localProjects[id] = { id, name, rootPaths: [workspacePath], createdAt: timestamp, updatedAt: timestamp };
  state["local-projects"] = localProjects;
  const temporary = join(dirname(codexStatePath), `.codex-global-state-${randomUUID()}.tmp`);
  writeFileSync(temporary, JSON.stringify(state), { mode: 0o600 });
  renameSync(temporary, codexStatePath);
  const input = { externalId: id, name, workspacePath, rootPaths: [workspacePath], createdAt: new Date(timestamp).toISOString(), updatedAt: new Date(timestamp).toISOString() };
  return projectId ? store.createProject({ ...input, id: projectId }) : store.ensureProject(input);
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

function asServiceTier(value: unknown): AgentServiceTier {
  if (value === undefined || value === null || value === "") return "default";
  if (value !== "default" && value !== "fast") throw new Error("invalid_agent_service_tier");
  return value;
}

function agentProfileInput(body: Record<string, unknown>) {
  return {
    name: cleanString(body.name, 80),
    name_en: cleanString(body.name_en, 80),
    description: cleanString(body.description, 500),
    instructions: cleanString(body.instructions, 100000),
    model: cleanString(body.model, 80) as AgentModel,
    reasoning_effort: cleanString(body.reasoning_effort, 20) as AgentReasoningEffort,
    service_tier: asServiceTier(body.service_tier),
    sandbox_mode: asSandboxMode(body.sandbox_mode),
    max_concurrency: asMaxConcurrency(body.max_concurrency),
  };
}

function defaultAgentInput(body: Record<string, unknown>) {
  const model = cleanString(body.model, 80) as AgentModel;
  const reasoning_effort = cleanString(body.reasoning_effort, 20) as AgentReasoningEffort;
  if (!model) throw new Error("invalid_agent_model");
  if (!reasoning_effort) throw new Error("invalid_agent_reasoning_effort");
  return { model, reasoning_effort, service_tier: asServiceTier(body.service_tier), sandbox_mode: asSandboxMode(body.sandbox_mode), max_concurrency: asMaxConcurrency(body.max_concurrency) };
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
  if ("description" in body) patch.description = issueDescription(body.description);
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
  if (code === "body_too_large") return 413;
  if (code === "version_conflict" || code === "request_id_conflict" || code === "request_outcome_unknown" || code === "remote_mode_disabled" || code === "reply_busy" || code === "update_in_progress" || code === "issue_execution_locked" || code === "issue_execution_running" || code === "issue_session_handed_off" || code === "issue_session_starting" || code === "issue_session_already_bound" || code === "session_relay_not_leader" || code === "session_command_not_claimed" || code === "session_command_outcome_unknown" || code === "project_planning_busy" || code === "project_planning_agent_locked") return 409;
  if (code.endsWith("_not_found")) return 404;
  if (code === "database_unavailable" || code === "database_integrity_check_failed") return 503;
  return 400;
}

function spawnUpdateRelaunch(runtimePid: number, updates: { core: string | null; compatibility: string | null }, drainPath: string) {
  const descriptor = openSync(updateLogPath, "a");
  const updateArgs = ["apply-update", String(runtimePid), "--drain-path", drainPath, ...(updates.core ? ["--expected-core", updates.core] : []), ...(updates.compatibility ? ["--expected-compatibility", updates.compatibility] : [])];
  const invocation = activeCoreCommand(updateArgs);
  const environment = { ...process.env };
  if (isSea()) environment.BETTER_CODEX_LAUNCHER_PATH = process.env.BETTER_CODEX_LAUNCHER_PATH ?? process.execPath;
  const child = spawn(invocation.command, invocation.args, { cwd: process.cwd(), detached: true, env: environment, stdio: ["ignore", descriptor, descriptor], windowsHide: true });
  child.unref();
  closeSync(descriptor);
  return child.pid ?? null;
}

export function startServer() {
  if (!Number.isInteger(runtimePort) || runtimePort < 0 || runtimePort > 65535) throw new Error("invalid_runtime_port");
  const remoteMode = readRemoteMode();
  const identity = createRuntimeIdentity();
  acquireRuntimeLock(identity);
  let store: Store;
  try {
    store = new Store();
    if (remoteMode === "relay") disableProjectionSync(databasePath);
    if (!mockupEnabled) syncAgentProfiles(store.listAgentProfiles());
  } catch (error) {
    clearRuntimeState(identity.instanceId);
    throw error;
  }
  let cleaned = false;
  let requestReceipts: RequestReceiptStore;
  try {
    requestReceipts = new RequestReceiptStore(databasePath);
  } catch (error) {
    store.close();
    clearRuntimeState(identity.instanceId);
    throw error;
  }
  let updateRelaunchScheduled = false;
  let updateInstallInProgress = false;
  const webSessions = new Map<string, number>();
  const eventClients = new Map<ServerResponse, ReturnType<typeof setInterval>>();
  const eventHistory: number[] = [];
  let eventRevision = 0;
  let publishChange = () => {};
  const worker = new IssueWorker(store, () => publishChange());
  const syncClient = new SyncClient(
    store,
    5_000,
    undefined,
    command => {
      if (command.operation === "issue.start") worker.startIssue(command.entity_id);
      if (["issue.archive", "issue.restore", "issue.delete"].includes(command.operation)) worker.wake();
      if (command.operation === "settings.auto-dispatch" && command.payload.enabled === true) worker.wake();
      if (command.operation === "issue.create" && command.payload.agent_enabled === true && command.payload.user_assigned !== true) {
        const issue = store.getIssue(command.entity_id);
        const description = issue?.description.trim() || "";
        const generatedPlaceholder = description.split(/\n/).find(line => line.trim())?.replace(/^[#*\s-]+/, "").trim().slice(0, 120) || "";
        if (issue && description && issue.title === generatedPlaceholder) {
          const pending = store.updateIssue(issue.id, issue.version, { status: "backlog", enrichment_status: "pending" });
          worker.enrichIssue(pending, pending.description, pending.agent_id || "");
        }
      }
    },
    async issueId => {
      const issue = store.getIssue(issueId);
      if (!issue?.run_thread_id) return null;
      const conversation = await readConversationResult(issue.run_thread_id);
      return store.conversationProjection(issueId, conversation.messages);
    },
    (issueId, requestId, message, files) => {
      const saved = saveRemoteFiles(files, requestId);
      try {
        const fileBlock = saved.paths.length ? `附带文件：\n${saved.paths.map(path => `- ${path}`).join("\n")}` : "";
        worker.sendIssueMessage(issueId, requestId, [message, fileBlock].filter(Boolean).join("\n\n"));
      } catch (error) {
        saved.cleanup();
        throw error;
      }
    },
    async issueId => {
      const accepted = await worker.stopIssue(issueId);
      const current = store.getIssue(issueId);
      if (!accepted && (current?.active_run_status || current?.session_active_turn_id || store.getIssueReplyState(issueId).status === "running")) throw new Error("issue_stop_timeout");
    },
    readCodexUsage,
    (projectId, name, workspacePath) => {
      createCodexProject(store, name, workspacePath, projectId);
    },
    (projectId, agentId, feedback) => {
      if (!worker.generateProjectOverview(projectId, agentId, feedback)) throw new Error("project_overview_unavailable");
    },
    files => {
      return saveRemoteFiles(files, randomUUID());
    },
    chooseNativeDirectory,
    browseDirectory,
    (issueId, action) => worker.applyThreadAction(issueId, action),
    (projectId, agentId, message) => {
      if (!worker.sendProjectPlanningMessage(projectId, agentId, message)) throw new Error("project_planning_unavailable");
    },
    projectId => {
      worker.resetProjectPlanning(projectId);
    },
  );
  let activeRuntimePort = 0;
  const relayClient = new RuntimeRelayClient({ runtimePort: () => activeRuntimePort, localToken: accessToken, runtimeInstanceId: identity.instanceId, coreVersion: identity.version });
  const sendEvent = (response: ServerResponse, event: string, revision: number) => {
    response.write(`id: ${revision}\nevent: ${event}\ndata: ${JSON.stringify({ revision })}\n\n`);
  };
  publishChange = () => {
    eventRevision += 1;
    eventHistory.push(eventRevision);
    if (eventHistory.length > 64) eventHistory.shift();
    for (const response of eventClients.keys()) sendEvent(response, "change", eventRevision);
  };
  const importedSessionState = async (threadId: string) => {
    const { activity } = await readConversationActivity(threadId);
    return {
      active: activity.status === "running",
      turnId: activity.turn_id,
      startedAt: activity.started_at,
      completedAt: activity.completed_at,
    };
  };
  const withReplyStatus = (issue: Issue) => ({ ...issue, reply_status: store.getIssueReplyState(issue.id).status });
  const restoreImportedSession = async (issue: Issue, threadId: string) => {
    if (issue.session_handoff_at || normalizeSessionId(issue.thread_id) !== threadId) return issue;
    return store.attachImportedSession(issue.id, {
      threadId,
      configFingerprint: worker.sessionConfigFingerprint(null),
      ...await importedSessionState(threadId),
    });
  };
  const withAvatar = <T extends { id: string; is_default?: boolean }>(profile: T) => ({
    ...profile,
    avatar: store.getAgentAvatar(profile.is_default ? "default" : profile.id),
  });
  const withDefaultConcurrency = <T,>(profile: T) => ({ ...profile, max_concurrency: store.getDefaultAgentMaxConcurrency() });
  const visibleAgentProfiles = () => [withAvatar(withDefaultConcurrency(defaultAgentProfile())), ...store.listAgentProfiles().map(withAvatar)];
  const stopUpdateChecks = mockupEnabled ? () => {} : startGatewayUpdateChecks();
  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    worker.stop();
    syncClient.stop();
    relayClient.stop();
    stopUpdateChecks();
    for (const [response, heartbeat] of eventClients) {
      clearInterval(heartbeat);
      response.end();
    }
    eventClients.clear();
    clearRuntimeState(identity.instanceId);
    requestReceipts.close();
    store.close();
  };
  const server = createServer((request, response) => {
    const suppliedTraceId = String(request.headers["x-better-codex-trace-id"] || "");
    const requestTraceId = /^[A-Za-z0-9_-]{8,200}$/.test(suppliedTraceId) ? suppliedTraceId : "";
    if (requestTraceId) response.setHeader("x-better-codex-trace-id", requestTraceId);
    void (async () => {
      if (!request.url || !loopback(request) || !trustedOrigin(request)) return sendJson(response, 403, { error: "forbidden" });
      const url = new URL(request.url, "http://127.0.0.1");
      const path = url.pathname.split("/").filter(Boolean);
      const method = request.method ?? "GET";
      const mockupLocale = normalizeMockupLocale(url.searchParams.get("locale"));
      const relayRequest = validAccessToken(bearerToken(request)) && request.headers["x-better-codex-relay"] === "1";
      const browserCommandId = String(request.headers["x-better-codex-command-id"] || "");
      const localCommandRequest = !relayRequest && authorized(request, url, webSessions) && /^[A-Za-z0-9_-]{8,200}$/.test(browserCommandId) && Boolean(webCommandTarget(method, `${url.pathname}${url.search}`));

      if ((relayRequest || localCommandRequest) && url.pathname.startsWith("/api/") && !["GET", "HEAD", "OPTIONS"].includes(method)) {
        const requestId = relayRequest ? String(request.headers["x-better-codex-request-id"] || "") : browserCommandId;
        if (!/^[A-Za-z0-9_-]{8,200}$/.test(requestId)) throw new Error("invalid_request_id");
        const rawBody = await readRawBody(request, 50 * 1024 * 1024);
        preloadedRequestBodies.set(request, rawBody);
        const receipt = requestReceipts.begin(requestId, method, `${url.pathname}${url.search}`, requestFingerprint(method, `${url.pathname}${url.search}`, rawBody));
        if (receipt.kind === "conflict") throw new Error("request_id_conflict");
        if (receipt.kind === "unknown") throw new Error("request_outcome_unknown");
        if (receipt.kind === "replay") return sendReceipt(response, receipt.response);
        captureReceiptResponse(response, result => requestReceipts.finish(requestId, result));
      }

      if (url.pathname.startsWith("/api/") && !["GET", "OPTIONS"].includes(method)) {
        response.once("finish", () => {
          if (response.statusCode >= 200 && response.statusCode < 400) publishChange();
        });
      }

      if (method === "OPTIONS") return sendPreflight(response);
      if (url.pathname === "/health") {
        const database = store.health();
        const address = server.address();
        const activePort = typeof address === "object" && address ? address.port : 0;
        return sendJson(response, database.ok ? 200 : 503, { ok: database.ok, name: "Better Codex Runtime", version: identity.version, pid: process.pid, port: activePort, instanceId: identity.instanceId, database, compatibility: readCompatibilityStatus() });
      }
      if ((url.pathname === "/web" || url.pathname === "/web/projects" || url.pathname.startsWith("/web/projects/") || url.pathname.startsWith("/local/")) && method === "GET") {
        return sendWeb(response, 200, betterCodexWebHostHtml(), "text/html; charset=utf-8", {
          "content-security-policy": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; font-src 'self'; frame-src 'self' blob:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'",
        });
      }
      if (url.pathname === "/web/host.css" && method === "GET") return sendWeb(response, 200, betterCodexWebHostCss(), "text/css; charset=utf-8");
      if (url.pathname === "/web/host.js" && method === "GET") return sendWeb(response, 200, betterCodexWebHostJavaScript(), "text/javascript; charset=utf-8");
      if (url.pathname === "/web/manifest.webmanifest" && method === "GET") return sendWeb(response, 200, betterCodexWebManifest(), "application/manifest+json; charset=utf-8");
      if (url.pathname === "/web/service-worker.js" && method === "GET") return sendWeb(response, 200, betterCodexWebServiceWorker(), "text/javascript; charset=utf-8", { "service-worker-allowed": "/" });
      if (url.pathname === "/better-codex-icon-192.png" && method === "GET") return sendWeb(response, 200, betterCodexWebIconPng(192), "image/png", { "cache-control": "public, max-age=86400" });
      if (url.pathname === "/better-codex-icon-512.png" && method === "GET") return sendWeb(response, 200, betterCodexWebIconPng(512), "image/png", { "cache-control": "public, max-age=86400" });
      if (url.pathname === "/web/session" && method === "POST") {
        const body = await readBody(request, 4096);
        if (!validAccessToken(body.token)) return sendJson(response, 401, { error: "unauthorized" });
        const sessionToken = createWebSession(webSessions);
        return sendWeb(response, 200, JSON.stringify({ token: sessionToken }), "application/json; charset=utf-8");
      }
      if (url.pathname === "/web/injection.js" && method === "GET") {
        const relayRequest = validAccessToken(bearerToken(request)) && request.headers["x-better-codex-relay"] === "1";
        const locale = normalizeCodexLocale(url.searchParams.get("locale"));
        if (relayRequest) return sendWeb(response, 200, injectionScript(0, "", "install", locale, "web"), "text/javascript; charset=utf-8");
        const sessionToken = url.searchParams.get("session") || "";
        if (!sameOriginBrowserRequest(request)) return sendJson(response, 403, { error: "forbidden" });
        if (!validWebSession(webSessions, sessionToken)) return sendJson(response, 401, { error: "unauthorized" });
        const address = server.address();
        const activePort = typeof address === "object" && address ? address.port : 0;
        return sendWeb(response, 200, injectionScript(activePort, sessionToken, "install", locale, "web"), "text/javascript; charset=utf-8");
      }
      if (!authorized(request, url, webSessions)) return sendJson(response, 401, { error: "unauthorized" });
      const commandStatusMatch = url.pathname.match(/^\/api\/commands\/([A-Za-z0-9_-]{8,200})$/);
      if (commandStatusMatch && method === "GET") {
        const receipt = requestReceipts.status(commandStatusMatch[1]);
        if (receipt.kind === "missing") return sendJson(response, 404, { error: "command_not_found" });
        if (receipt.kind === "pending") return sendJson(response, 202, { command_id: commandStatusMatch[1], status: "processing", queued: true });
        let payload: unknown = null;
        try { payload = JSON.parse(receipt.response.body.toString("utf8")); } catch {}
        const status = receipt.response.status === 409 ? "conflict" : receipt.response.status >= 200 && receipt.response.status < 400 ? "applied" : "rejected";
        const error = payload && typeof payload === "object" && "error" in payload ? String((payload as { error: unknown }).error) : null;
        return sendJson(response, 200, { command_id: commandStatusMatch[1], status, response_status: receipt.response.status, error, payload });
      }
      if (url.pathname === "/api/sync/status" && method === "GET") return sendJson(response, 200, { ...syncClient.status(), remote_mode: remoteMode, enabled: remoteMode === "projection" });
      if (url.pathname === "/api/relay/status" && method === "GET") return sendJson(response, 200, { ...relayClient.status(), remote_mode: remoteMode, enabled: remoteMode === "relay" && relayClient.status().enabled });
      if (url.pathname === "/api/relay/connect" && method === "POST") {
        if (remoteMode !== "relay") throw new Error("remote_mode_disabled");
        relayClient.start();
        relayClient.reconnect();
        return sendJson(response, 200, relayClient.status());
      }
      if (url.pathname === "/api/relay/disconnect" && method === "POST") {
        if (remoteMode !== "relay") throw new Error("remote_mode_disabled");
        relayClient.stop();
        removeRelayConfiguration();
        return sendJson(response, 200, relayClient.status());
      }
      if (url.pathname === "/api/remote-access/sessions" && method === "GET") {
        if (relayRequest) return sendJson(response, 403, { error: "local_access_required" });
        const configuration = readRelayConfiguration();
        if (remoteMode !== "relay" || !configuration) return sendJson(response, 409, { error: "remote_mode_disabled" });
        const result = await relayWebSessionRequest(configuration, "/api/v1/runtime/web-sessions", "GET");
        if (result.status >= 200 && result.status < 300 && !Array.isArray(result.value.sessions)) return sendJson(response, 502, { error: "invalid_relay_response" });
        return sendJson(response, result.status, result.value);
      }
      const remoteAccessSessionMatch = url.pathname.match(/^\/api\/remote-access\/sessions\/([^/]+)$/);
      if (remoteAccessSessionMatch && method === "DELETE") {
        if (relayRequest) return sendJson(response, 403, { error: "local_access_required" });
        const configuration = readRelayConfiguration();
        if (remoteMode !== "relay" || !configuration) return sendJson(response, 409, { error: "remote_mode_disabled" });
        const sessionId = decodeURIComponent(remoteAccessSessionMatch[1]);
        if (!/^[0-9a-f-]{36}$/i.test(sessionId)) return sendJson(response, 400, { error: "invalid_web_session" });
        const result = await relayWebSessionRequest(configuration, `/api/v1/runtime/web-sessions/${encodeURIComponent(sessionId)}`, "DELETE");
        if (result.status >= 200 && result.status < 300 && result.value.ok !== true) return sendJson(response, 502, { error: "invalid_relay_response" });
        return sendJson(response, result.status, result.value);
      }
      if (url.pathname === "/api/remote-access/status" && method === "GET") {
        if (remoteMode === "relay") {
          const configuration = readRelayConfiguration();
          const status = relayClient.status();
          if (!configuration) return sendJson(response, 200, { ...status, remote_mode: remoteMode, last_sync_at: status.last_heartbeat_at, remote: null });
          try {
            const remote = await fetch(`${configuration.relay_url}/healthz`, { headers: { accept: "application/json" }, redirect: "error", signal: AbortSignal.timeout(8_000) }).then(async remoteResponse => {
              const text = await remoteResponse.text();
              if (Buffer.byteLength(text) > 16_384) throw new Error("relay_response_too_large");
              const value = (() => { try { return JSON.parse(text) as Record<string, unknown>; } catch { return {}; } })();
              if (!remoteResponse.ok) throw new Error(typeof value.error === "string" ? value.error : `relay_http_${remoteResponse.status}`);
              if (value.ok !== true || value.name !== "Better Codex Relay" || value.protocol_version !== "relay/v1" || typeof value.version !== "string") throw new Error("invalid_relay_health");
              return value;
            });
            return sendJson(response, 200, { ...status, remote_mode: remoteMode, last_sync_at: status.last_heartbeat_at, remote: { ...remote, url: configuration.relay_url, reachable: true, update_available: false, upgrade_supported: false } });
          } catch (error) {
            return sendJson(response, 200, { ...status, remote_mode: remoteMode, last_sync_at: status.last_heartbeat_at, remote: { name: "Better Codex Relay", url: configuration.relay_url, reachable: false, error: error instanceof Error ? error.message : "remote_unavailable" } });
          }
        }
        const configuration = readSyncConfiguration();
        const status = syncClient.status();
        if (!configuration) return sendJson(response, 200, { ...status, remote_mode: remoteMode, remote: null });
        try {
          const remote = await fetch(`${configuration.hub_url}/healthz`, { headers: { accept: "application/json" }, redirect: "error", signal: AbortSignal.timeout(8_000) }).then(async remoteResponse => {
            const contentLength = Number(remoteResponse.headers.get("content-length") || 0);
            if (contentLength > 16_384) throw new Error("hub_response_too_large");
            const text = await remoteResponse.text();
            if (Buffer.byteLength(text) > 16_384) throw new Error("hub_response_too_large");
            const value = (() => { try { return JSON.parse(text) as Record<string, unknown>; } catch { return {}; } })();
            if (!remoteResponse.ok) throw new Error(typeof value.error === "string" ? value.error : `hub_http_${remoteResponse.status}`);
            if (value.ok !== true || value.name !== "Better Codex Hub" || value.deployment !== "vps" || typeof value.version !== "string" || typeof value.protocol_version !== "string") throw new Error("invalid_hub_health");
            return value;
          });
          const remoteVersion = typeof remote.version === "string" ? remote.version.replace(/^v/, "") : null;
          const updateAvailable = Boolean(remoteVersion && compareVersions(remoteVersion, coreVersion) < 0);
          return sendJson(response, 200, { ...status, remote_mode: remoteMode, remote: { ...remote, url: configuration.hub_url, reachable: remote.ok === true, update_available: updateAvailable, upgrade_supported: Boolean(remoteVersion) } });
        } catch (error) {
          return sendJson(response, 200, { ...status, remote_mode: remoteMode, remote: { url: configuration.hub_url, reachable: false, error: error instanceof Error ? error.message : "remote_unavailable" } });
        }
      }
      if (url.pathname === "/api/sync/now" && method === "POST") {
        if (remoteMode !== "projection") throw new Error("remote_mode_disabled");
        return sendJson(response, 200, await syncClient.syncNow());
      }
      if (url.pathname === "/api/sync/connect" && method === "POST") {
        if (remoteMode !== "projection") throw new Error("remote_mode_disabled");
        store.rebuildSyncQueue();
        syncClient.start();
        return sendJson(response, 200, await syncClient.syncNow());
      }
      if (url.pathname === "/api/sync/disconnect" && method === "POST") {
        if (remoteMode !== "projection") throw new Error("remote_mode_disabled");
        syncClient.stop();
        removeSyncConfiguration();
        return sendJson(response, 200, syncClient.status());
      }
      if (url.pathname === "/api/events" && method === "GET") {
        response.writeHead(200, {
          "cache-control": "no-cache, no-store",
          "connection": "keep-alive",
          "content-type": "text/event-stream; charset=utf-8",
          "x-accel-buffering": "no",
        });
        response.flushHeaders();
        const cursor = Number(request.headers["last-event-id"]);
        const oldestRevision = eventHistory[0] ?? eventRevision;
        if (Number.isInteger(cursor) && (cursor > eventRevision || cursor < oldestRevision - 1)) {
          sendEvent(response, "reset", eventRevision);
        } else if (Number.isInteger(cursor)) {
          const missed = eventHistory.filter(revision => revision > cursor);
          if (missed.length) missed.forEach(revision => sendEvent(response, "change", revision));
          else sendEvent(response, "ready", eventRevision);
        } else {
          sendEvent(response, "ready", eventRevision);
        }
        const heartbeat = setInterval(() => response.write(": heartbeat\n\n"), 15_000);
        eventClients.set(response, heartbeat);
        request.once("close", () => {
          clearInterval(heartbeat);
          eventClients.delete(response);
        });
        return;
      }
      if (url.pathname === "/api/issues/attachments" && method === "POST") {
        const body = await readBody(request, maxPastedImageBodyBytes);
        return sendJson(response, 201, savePastedImage(body.data));
      }
      if (url.pathname === "/api/bootstrap" && method === "GET") {
        const agentModelCatalog = await readModelCatalog();
        const agentModels = agentModelCatalog.map(model => model.id);
        const agentReasoningEfforts = [...new Set(agentModelCatalog.flatMap(model => model.supportedReasoningEfforts.map(effort => effort.value)))];
        const mockup = mockupEnabled ? readMockupState(mockupLocale) : null;
        if (!mockup) syncCodexProjects(store);
        return sendJson(response, 200, { projects: projectSummaries(mockup ? mockup.projects : store.listProjects()), agents: mockup ? mockup.agents : visibleAgentProfiles(), statuses: issueStatuses, priorities: issuePriorities, appearance: readCodexAppearance(), locale: readCodexLocale(), user: readCodexUserProfile(), agentModelCatalog, agentModels, agentReasoningEfforts, autoDispatch: mockup ? mockup.auto_dispatch : store.getAutoDispatch(), schedulerModel: mockup ? mockup.scheduler_model : store.getSchedulerModel(defaultAgentProfile().model), schedulerReasoningEffort: mockup ? mockup.scheduler_reasoning_effort : store.getSchedulerReasoningEffort(), limits: { issue_description: maxIssueDescriptionLength }, mockup: mockupEnabled, featureManifest: featureManifest() });
      }
      if (mockupEnabled && path[0] === "api" && path[1] === "scheduled-tasks") {
        if (method === "GET" && path.length === 2) return sendJson(response, 200, []);
        return sendJson(response, 400, { error: "mockup_action_not_supported" });
      }
      if (url.pathname === "/api/account/usage" && method === "GET") {
        return sendJson(response, 200, { usage: await readCodexUsage() });
      }
      if (mockupEnabled && url.pathname === "/api/mockup/state" && method === "GET") {
        return sendJson(response, 200, readMockupState(mockupLocale));
      }
      if (mockupEnabled && url.pathname === "/api/mockup/state" && method === "PUT") {
        return sendJson(response, 200, replaceMockupState(mockupLocale, await readBody(request, maxMockupBytes)));
      }
      if (mockupEnabled && url.pathname === "/api/mockup/reset" && method === "POST") {
        return sendJson(response, 200, resetMockupState(mockupLocale));
      }
      if (mockupEnabled && url.pathname === "/api/settings/auto-dispatch" && ["GET", "PATCH"].includes(method)) {
        if (method === "GET") return sendJson(response, 200, { enabled: readMockupState(mockupLocale).auto_dispatch });
        const body = await readBody(request);
        if (typeof body.enabled !== "boolean") throw new Error("invalid_auto_dispatch");
        const updated = updateMockupState(mockupLocale, state => { state.auto_dispatch = body.enabled === true; }).state;
        return sendJson(response, 200, { enabled: updated.auto_dispatch });
      }
      if (mockupEnabled && url.pathname === "/api/settings/scheduler-model" && ["GET", "PATCH"].includes(method)) {
        if (method === "GET") {
          const state = readMockupState(mockupLocale);
          return sendJson(response, 200, { model: state.scheduler_model, reasoning_effort: state.scheduler_reasoning_effort });
        }
        const body = await readBody(request);
        const model = cleanString(body.model, 200);
        const catalog = await readModelCatalog();
        const selected = catalog.find(item => item.id === model);
        if (!selected) throw new Error("invalid_model");
        const updated = updateMockupState(mockupLocale, state => {
          state.scheduler_model = model;
          if (!selected.supportedReasoningEfforts.some(item => item.value === state.scheduler_reasoning_effort)) state.scheduler_reasoning_effort = selected.defaultReasoningEffort;
        }).state;
        return sendJson(response, 200, { model: updated.scheduler_model, reasoning_effort: updated.scheduler_reasoning_effort });
      }
      if (mockupEnabled && url.pathname === "/api/settings/scheduler-reasoning-effort" && ["GET", "PATCH"].includes(method)) {
        const state = readMockupState(mockupLocale);
        if (method === "GET") return sendJson(response, 200, { reasoning_effort: state.scheduler_reasoning_effort });
        const body = await readBody(request);
        const effort = cleanString(body.reasoning_effort, 20);
        const catalog = await readModelCatalog();
        const model = catalog.find(item => item.id === state.scheduler_model);
        if (!model?.supportedReasoningEfforts.some(item => item.value === effort)) throw new Error("invalid_scheduler_reasoning_effort");
        const updated = updateMockupState(mockupLocale, next => { next.scheduler_reasoning_effort = effort; }).state;
        return sendJson(response, 200, { reasoning_effort: updated.scheduler_reasoning_effort });
      }
      if (mockupEnabled && url.pathname === "/api/agents" && method === "GET") {
        return sendJson(response, 200, readMockupState(mockupLocale).agents);
      }
      if (mockupEnabled && url.pathname === "/api/projects" && method === "GET") {
        return sendJson(response, 200, readMockupState(mockupLocale).projects);
      }
      if (mockupEnabled && url.pathname === "/api/projects" && method === "POST") {
        const body = await readBody(request);
        const projectId = `mockup-project-${randomUUID()}`;
        const updated = updateMockupState(mockupLocale, state => {
          const workspacePath = cleanString(body.workspace_path, 4096);
          state.projects.push({ id: projectId, external_id: projectId, name: cleanString(body.name, 120), workspace_path: workspacePath, root_paths: workspacePath ? [workspacePath] : [], description: "", overview_html: "", overview_status: "idle", overview_error: null, overview_updated_at: null, planning: { status: "idle", error: null, agent_id: null, revision: 0, updated_at: null, messages: [], plan: null } });
        }).state;
        return sendJson(response, 201, updated.projects.find(project => project.id === projectId));
      }
      if (mockupEnabled && url.pathname === "/api/agents" && method === "POST") {
        const body = await readBody(request);
        const agentId = `mockup-agent-${randomUUID()}`;
        const updated = updateMockupState(mockupLocale, state => {
          state.agents.push({ ...body, id: agentId, role: "custom", is_default: false, version: 1 });
        }).state;
        return sendJson(response, 201, updated.agents.find(agent => agent.id === agentId));
      }
      if (mockupEnabled && url.pathname === "/api/agents/default" && method === "PATCH") {
        const body = await readBody(request);
        const updated = updateMockupState(mockupLocale, state => {
          requireVersion(body, state.agents[0]);
          state.agents[0] = { ...state.agents[0], ...body, id: "", role: "codex", is_default: true, version: Number(state.agents[0].version) + 1 };
        }).state;
        return sendJson(response, 200, updated.agents[0]);
      }
      if (mockupEnabled && path[0] === "api" && path[1] === "agents" && path[2] && path.length === 3) {
        const agentId = decodeURIComponent(path[2]);
        if (method === "GET") {
          const agent = readMockupState(mockupLocale).agents.find(item => item.id === agentId && item.is_default !== true);
          return agent ? sendJson(response, 200, agent) : sendJson(response, 404, { error: "agent_not_found" });
        }
        if (method === "DELETE") {
          const body = await readBody(request);
          updateMockupState(mockupLocale, state => {
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
          const updated = updateMockupState(mockupLocale, state => {
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
        const projectId = url.searchParams.get("project_id") || "";
        const issues = readMockupState(mockupLocale).issues.filter(issue => Boolean(issue.archived_at) === archived && (!projectId || issue.project_id === projectId) && (!query || [issue.identifier, issue.title, issue.description, ...(Array.isArray(issue.labels) ? issue.labels : [])].join(" ").toLowerCase().includes(query)));
        return sendJson(response, 200, issues);
      }
      if (mockupEnabled && url.pathname === "/api/issues" && method === "POST") {
        const body = await readBody(request);
        let issueId = "";
        const updated = updateMockupState(mockupLocale, state => {
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
      if (mockupEnabled && url.pathname === "/api/issues/from-thread" && method === "GET") {
        const threadId = normalizeSessionId(cleanString(url.searchParams.get("thread_id"), 200));
        if (!threadId) throw new Error("session_required");
        const issue = readMockupState(mockupLocale).issues.find(item => normalizeSessionId(String(item.session_thread_id || item.thread_id || "")) === threadId);
        return issue ? sendJson(response, 200, issue) : sendJson(response, 404, { error: "issue_not_found" });
      }
      if (mockupEnabled && url.pathname === "/api/issues/from-thread" && method === "POST") {
        const body = await readBody(request);
        const threadId = normalizeSessionId(cleanString(body.thread_id, 200));
        if (!threadId) throw new Error("session_required");
        const current = readMockupState(mockupLocale);
        const existing = current.issues.find(item => normalizeSessionId(String(item.session_thread_id || item.thread_id || "")) === threadId);
        if (existing) return sendJson(response, 200, existing);
        let issueId = "";
        const updated = updateMockupState(mockupLocale, state => {
          const projectId = cleanString(body.project_id, 200);
          const project = state.projects.find(item => item.id === projectId);
          if (!project) throw new Error("project_not_found");
          const nextNumber = state.issues.reduce((max, issue) => Math.max(max, Number(String(issue.identifier).replace(/\D/g, "")) || 0), 19) + 1;
          const now = new Date().toISOString();
          issueId = `mockup-${nextNumber}`;
          state.issues.push({
            id: issueId,
            identifier: `BET-${nextNumber}`,
            project_id: projectId,
            title: cleanString(body.title, 500) || (mockupLocale === "en" ? "Untitled issue" : "未命名任务"),
            description: "",
            status: "in_review",
            priority: "none",
            sort_order: (state.issues.length + 1) * 1000,
            pinned: false,
            archived_at: null,
            thread_id: threadId,
            run_thread_id: threadId,
            session_thread_id: threadId,
            session_owned: true,
            session_status: "idle",
            workspace_path: cleanString(body.workspace_path, 4096) || String(project.workspace_path || ""),
            version: 1,
            created_at: now,
            updated_at: now,
            agent_enabled: true,
            agent_id: null,
            mockup_agent_name: "Codex",
            user_assigned: false,
            needs_attention: true,
            pending_actor: "user",
            enrichment_status: null,
            reply_draft: "",
            session_handoff_at: null,
            labels: [],
            reply_status: "succeeded",
            mockup_run_status: "completed",
          });
        }).state;
        return sendJson(response, 201, updated.issues.find(issue => issue.id === issueId));
      }
      if (mockupEnabled && path[0] === "api" && path[1] === "issues" && path[2]) {
        const issueId = decodeURIComponent(path[2]);
        if (method === "GET" && path.length === 3) {
          const issue = readMockupState(mockupLocale).issues.find(item => item.id === issueId || item.identifier === issueId);
          return issue ? sendJson(response, 200, issue) : sendJson(response, 404, { error: "issue_not_found" });
        }
        if (method === "GET" && path[3] === "conversation") {
          const issue = readMockupState(mockupLocale).issues.find(item => item.id === issueId || item.identifier === issueId);
          return issue ? sendJson(response, 200, { messages: [] }) : sendJson(response, 404, { error: "issue_not_found" });
        }
        if (method === "POST" && path[3] === "start") {
          const body = await readBody(request);
          const updated = updateMockupState(mockupLocale, state => {
            const index = state.issues.findIndex(issue => issue.id === issueId || issue.identifier === issueId);
            if (index < 0) throw new Error("issue_not_found");
            const current = state.issues[index];
            requireVersion(body, current);
            const status = String(body.status || current.status);
            if (current.archived_at || ["backlog", "done"].includes(status)) throw new Error("issue_not_startable");
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
          const updated = updateMockupState(mockupLocale, state => {
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
          const updated = updateMockupState(mockupLocale, state => {
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
          const archived = updateMockupState(mockupLocale, state => {
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
          const restored = updateMockupState(mockupLocale, state => {
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
          updateMockupState(mockupLocale, state => {
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
          const updated = updateMockupState(mockupLocale, state => {
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
          const updated = updateMockupState(mockupLocale, state => {
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
      if (url.pathname === "/api/scheduled-tasks" && method === "GET") {
        return sendJson(response, 200, store.listScheduledTasks());
      }
      if (url.pathname === "/api/scheduled-tasks" && method === "POST") {
        const body = await readBody(request);
        const task = store.createScheduledTask(scheduledTaskInput(store, body));
        worker.wake();
        return sendJson(response, 201, task);
      }
      if (path[0] === "api" && path[1] === "scheduled-tasks" && path[2]) {
        const taskId = decodeURIComponent(path[2]);
        const task = store.getScheduledTask(taskId);
        if (!task) return sendJson(response, 404, { error: "scheduled_task_not_found" });
        if (method === "PATCH" && path.length === 3) {
          const body = await readBody(request);
          const version = Number(body.version);
          if (!Number.isInteger(version) || version < 1) throw new Error("invalid_version");
          const updated = store.updateScheduledTask(task.id, version, scheduledTaskInput(store, body, task));
          worker.wake();
          return sendJson(response, 200, updated);
        }
        if (method === "DELETE" && path.length === 3) {
          const body = await readBody(request);
          const version = Number(body.version);
          if (!Number.isInteger(version) || version < 1) throw new Error("invalid_version");
          store.deleteScheduledTask(task.id, version);
          return sendJson(response, 200, { deleted: true });
        }
        if (method === "POST" && path[3] === "run" && path.length === 4) {
          if (updateInstallInProgress) throw new Error("update_in_progress");
          store.runScheduledTaskNow(task.id);
          worker.wake();
          return sendJson(response, 202, store.getScheduledTask(task.id));
        }
      }
      if (url.pathname === "/api/update" && method === "GET") return sendJson(response, 200, getGatewayUpdateState());
      if (url.pathname === "/api/update/check" && method === "POST") return sendJson(response, 200, await checkGatewayUpdate());
      if (url.pathname === "/api/update/install" && method === "POST") {
        if (updateInstallInProgress) throw new Error("update_in_progress");
        if (!worker.pauseForUpdate()) throw new Error("issue_execution_running");
        updateInstallInProgress = true;
        const installation = installGatewayUpdate();
        sendJson(response, 202, { accepted: true, state: getGatewayUpdateState() });
        void installation.then(result => {
          const updated = result.core.updated || result.compatibility.updated;
          const updates = { core: result.core.updated ? result.core.version : null, compatibility: result.compatibility.updated ? result.compatibility.version : null };
          const shouldRelaunch = updated && !updateRelaunchScheduled;
          if (shouldRelaunch) {
            updateRelaunchScheduled = true;
            recordGatewayUpdateActivation("activating", null, updates);
          }
          if (!shouldRelaunch) {
            updateInstallInProgress = false;
            worker.resumeAfterUpdate();
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
              setTimeout(() => server.closeAllConnections(), 5000).unref();
            } catch (error) {
              updateInstallInProgress = false;
              updateRelaunchScheduled = false;
              worker.resumeAfterUpdate();
              recordGatewayUpdateActivation("error", error instanceof Error ? error.message : "update_activation_failed");
            }
          }, 250);
        }).catch(error => {
          updateInstallInProgress = false;
          updateRelaunchScheduled = false;
          worker.resumeAfterUpdate();
          if (getGatewayUpdateState().status !== "error") recordGatewayUpdateActivation("error", error instanceof Error ? error.message : "update_activation_failed");
        });
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
        if (input.sandbox_mode !== defaultAgentProfile().sandbox_mode && store.hasActiveAgentSessionWork(null)) throw new Error("agent_security_config_in_use");
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
          const input = agentProfileInput(body);
          if ((input.sandbox_mode !== profile.sandbox_mode || input.instructions !== profile.instructions) && store.hasActiveAgentSessionWork(profile.id)) throw new Error("agent_security_config_in_use");
          const updated = store.updateAgentProfile(profile.id, version, input);
          const avatar = asAgentAvatar(body.avatar);
          if (avatar !== undefined) store.setAgentAvatar(profile.id, avatar);
          syncAgentProfiles(store.listAgentProfiles());
          if (updated.max_concurrency > profile.max_concurrency) worker.wake();
          return sendJson(response, 200, withAvatar(updated));
        }
        if (method === "DELETE" && path.length === 3) {
          const body = await readBody(request);
          if (store.hasActiveAgentSessionWork(profile.id)) throw new Error("agent_security_config_in_use");
          store.deleteAgentProfile(profile.id, Number(body.version));
          syncAgentProfiles(store.listAgentProfiles());
          return sendJson(response, 200, { ok: true });
        }
      }
      if (url.pathname === "/api/projects" && method === "GET") {
        if (!mockupEnabled) syncCodexProjects(store);
        return sendJson(response, 200, store.listProjects());
      }
      if (url.pathname === "/api/projects" && method === "POST") {
        const body = await readBody(request);
        const project = createCodexProject(store, body.name, body.workspace_path);
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
      if (url.pathname === "/api/system/directory" && method === "POST") {
        return sendJson(response, 200, { workspace_path: await chooseNativeDirectory() });
      }
      if (url.pathname === "/api/system/directories" && method === "POST") {
        const body = await readBody(request, 8192);
        return sendJson(response, 200, await browseDirectory(body.path));
      }
      if (path[0] === "api" && path[1] === "projects" && path[2] && path.length === 3 && method === "GET") {
        const project = store.getProject(decodeURIComponent(path[2]));
        return project ? sendJson(response, 200, project) : sendJson(response, 404, { error: "project_not_found" });
      }
      if (path[0] === "api" && path[1] === "projects" && path[2] && path[3] === "overview" && path.length === 4 && method === "POST") {
        const projectId = decodeURIComponent(path[2]);
        const project = store.getProject(projectId);
        if (!project) return sendJson(response, 404, { error: "project_not_found" });
        const body = await readBody(request);
        const agentId = cleanString(body.agent_id, 200);
        const feedback = cleanString(body.feedback, 4000);
        if (project.overview_status !== "generating" && !worker.generateProjectOverview(project.id, agentId, feedback)) throw new Error("project_overview_unavailable");
        return sendJson(response, 202, store.getProject(project.id));
      }
      if (path[0] === "api" && path[1] === "projects" && path[2] && path[3] === "planning" && path[4] === "messages" && path.length === 5 && method === "POST") {
        const projectId = decodeURIComponent(path[2]);
        if (!store.getProject(projectId)) return sendJson(response, 404, { error: "project_not_found" });
        const body = await readBody(request);
        const agentId = cleanString(body.agent_id, 200);
        const message = cleanString(body.message, 12000);
        if (!worker.sendProjectPlanningMessage(projectId, agentId, message)) throw new Error("project_planning_unavailable");
        return sendJson(response, 202, store.getProject(projectId));
      }
      if (path[0] === "api" && path[1] === "projects" && path[2] && path[3] === "planning" && path[4] === "reset" && path.length === 5 && method === "POST") {
        return sendJson(response, 200, worker.resetProjectPlanning(decodeURIComponent(path[2])));
      }
      if (path[0] === "api" && path[1] === "sessions" && path[2] && path[3] === "workspace" && path.length === 4 && method === "GET") {
        const threadId = normalizeSessionId(decodeURIComponent(path[2]));
        if (!threadId) throw new Error("session_required");
        return sendJson(response, 200, { workspace_path: sessionWorkspace(threadId) || "" });
      }
      if (url.pathname === "/api/session-relay/poll" && method === "POST") {
        const body = await readBody(request);
        const relayId = cleanString(body.relay_id, 200);
        const appSessionId = cleanString(body.app_session_id, 200);
        const capability = body.capability === "ready" || body.capability === "failed" ? body.capability : "unknown";
        if (!relayId || !appSessionId) throw new Error("session_relay_identity_required");
        const result = worker.pollSessionRelay(relayId, appSessionId, capability, cleanString(body.capability_error, 2000), body.busy === true);
        return sendJson(response, 200, result);
      }
      if (path[0] === "api" && path[1] === "session-relay" && path[2] === "commands" && path[3] && path[4] === "complete" && path.length === 5 && method === "POST") {
        const body = await readBody(request);
        const relayId = cleanString(body.relay_id, 200);
        const result = body.result && typeof body.result === "object" && !Array.isArray(body.result) ? body.result as Record<string, unknown> : {};
        if (!relayId) throw new Error("session_relay_identity_required");
        const command = worker.completeSessionCommand(decodeURIComponent(path[3]), relayId, result);
        return sendJson(response, 200, { ok: true, command });
      }
      if (path[0] === "api" && path[1] === "session-relay" && path[2] === "commands" && path[3] && path[4] === "fail" && path.length === 5 && method === "POST") {
        const body = await readBody(request);
        const relayId = cleanString(body.relay_id, 200);
        const commandError = cleanString(body.error, 2000) || "desktop_bridge_request_failed";
        const partialThreadId = normalizeSessionId(cleanString(body.thread_id, 200));
        const partialTurnId = normalizeSessionId(cleanString(body.turn_id, 200));
        if (!relayId) throw new Error("session_relay_identity_required");
        const command = worker.failSessionCommand(decodeURIComponent(path[3]), relayId, commandError, partialThreadId || undefined, partialTurnId || undefined);
        return sendJson(response, 200, { ok: true, command });
      }
      if (url.pathname === "/api/session-relay/events" && method === "POST") {
        const body = await readBody(request);
        const relayId = cleanString(body.relay_id, 200);
        const eventMethod = cleanString(body.method, 100);
        const params = body.params && typeof body.params === "object" && !Array.isArray(body.params) ? body.params as Record<string, unknown> : {};
        if (!relayId || !store.sessionRelayIsLeader(relayId)) throw new Error("session_relay_not_leader");
        if (!["thread/status/changed", "turn/started", "turn/completed", "item/completed"].includes(eventMethod)) throw new Error("session_event_invalid");
        return sendJson(response, 200, { accepted: worker.handleSessionEvent(eventMethod, params) });
      }
      if (url.pathname === "/api/issues" && method === "GET") {
        const issues = await reconcileInterruptedIssues(store, store.listIssues({
          projectId: url.searchParams.get("project_id") || undefined,
          search: url.searchParams.get("search") || undefined,
          archived: url.searchParams.get("archived") === "1",
        }));
        return sendJson(response, 200, issues.map(issue => ({
          ...issue,
          reply_status: store.getIssueReplyState(issue.id).status,
        })));
      }
      if (path[0] === "api" && path[1] === "session-relay" && path[2] === "commands" && path[3] && path[4] === "checkpoint" && path.length === 5 && method === "POST") {
        const body = await readBody(request);
        const relayId = cleanString(body.relay_id, 200);
        const result = body.result && typeof body.result === "object" && !Array.isArray(body.result) ? body.result as Record<string, unknown> : {};
        if (!relayId) throw new Error("session_relay_identity_required");
        const command = worker.checkpointSessionCommand(decodeURIComponent(path[3]), relayId, result);
        return sendJson(response, 200, { ok: true, command });
      }
      if (url.pathname === "/api/issues/from-thread" && method === "GET") {
        const threadId = normalizeSessionId(cleanString(url.searchParams.get("thread_id"), 200));
        if (!threadId) throw new Error("session_required");
        const issue = store.getIssueByThreadId(threadId);
        return issue ? sendJson(response, 200, issue) : sendJson(response, 404, { error: "issue_not_found" });
      }
      if (url.pathname === "/api/issues/from-thread" && method === "POST") {
        const body = await readBody(request);
        const threadId = normalizeSessionId(cleanString(body.thread_id, 200));
        if (!threadId) throw new Error("session_required");
        const existing = store.getIssueByThreadId(threadId);
        if (existing) return sendJson(response, 200, withReplyStatus(await restoreImportedSession(existing, threadId)));
        const projectId = cleanString(body.project_id, 200);
        const project = store.getProject(projectId);
        if (!project) throw new Error("project_not_found");
        const sessionState = await importedSessionState(threadId);
        const issue = store.createIssue({
          projectId,
          title: cleanString(body.title, 500),
          description: "",
          priority: "none",
          threadId,
          workspacePath: cleanString(body.workspace_path, 4096) || project.workspace_path,
          agentEnabled: true,
          userAssigned: false,
          session: {
            threadId,
            configFingerprint: worker.sessionConfigFingerprint(null),
            ...sessionState,
          },
        });
        return sendJson(response, 201, withReplyStatus(issue));
      }
      if (url.pathname === "/api/issues" && method === "POST") {
        const body = await readBody(request, maxRemoteFileBodyBytes);
        const projectId = cleanString(body.project_id, 200);
        const requestId = cleanString(body.request_id, 200);
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
        const files = saveRemoteFiles(body.files, requestId || String(request.headers["x-better-codex-request-id"] || randomUUID()));
        let created;
        try {
          created = store.createIssueRequest({
            projectId,
            title: cleanString(body.title, 500),
            description: withRemoteFilePaths(body.description, files.paths, "issue_description_too_long"),
            status: aiEnrich ? "backlog" : "status" in body ? asStatus(body.status) : undefined,
            priority: "priority" in body ? asPriority(body.priority) : undefined,
            labels: asLabels(body.labels),
            threadId: "",
            workspacePath,
            agentEnabled,
            agentId,
            userAssigned: body.user_assigned === true,
            enrichmentStatus: aiEnrich ? "pending" : null,
          }, requestId);
        } catch (error) {
          files.cleanup();
          throw error;
        }
        const { issue } = created;
        if (created.replayed) return sendJson(response, 200, issue);
        if (aiEnrich) worker.enrichIssue(issue, issue.description, agentId);
        else if (issue.agent_enabled && store.isDispatchable(issue)) worker.wake();
        return sendJson(response, 201, issue);
      }
      if (path[0] === "api" && path[1] === "issues" && path[2]) {
        const issue = store.getIssue(decodeURIComponent(path[2]));
        if (!issue) return sendJson(response, 404, { error: "issue_not_found" });
        if (method === "GET" && path.length === 3) {
          const [current] = await reconcileInterruptedIssues(store, [issue]);
          return sendJson(response, 200, { ...current, reply_status: store.getIssueReplyState(current.id).status });
        }
        if (method === "PATCH" && path.length === 3) {
          const body = await readBody(request, maxRemoteFileBodyBytes);
          const version = Number(body.version);
          if (!Number.isInteger(version) || version < 1) throw new Error("invalid_version");
          const patch = parseIssuePatch(body);
          const files = saveRemoteFiles(body.files, String(request.headers["x-better-codex-request-id"] || randomUUID()));
          if (files.paths.length) patch.description = withRemoteFilePaths(patch.description ?? issue.description, files.paths);
          let updated;
          try {
            if ((issue.active_run_status || issue.session_active_turn_id || store.getIssueReplyState(issue.id).status === "running") && Object.keys(patch).some(key => key !== "reply_draft")) throw new Error("issue_execution_running");
            updated = store.updateIssue(issue.id, version, patch);
          } catch (error) {
            files.cleanup();
            throw error;
          }
          if (store.isDispatchable(updated)) worker.wake();
          return sendJson(response, 200, updated);
        }
        if (method === "POST" && path[3] === "start" && path.length === 4) {
          if (updateInstallInProgress) throw new Error("update_in_progress");
          const body = await readBody(request);
          const version = Number(body.version);
          if (!Number.isInteger(version) || version < 1) throw new Error("invalid_version");
          const patch = parseIssuePatch(body);
          if (issue.archived_at) throw new Error("issue_not_startable");
          if (!issue.agent_enabled) throw new Error("issue_agent_required");
          if (issue.status === "done") throw new Error("issue_not_startable");
          const nextStatus = patch.status || issue.status;
          if (["backlog", "done"].includes(String(nextStatus))) throw new Error("issue_not_startable");
          if (issue.active_run_status || issue.session_active_turn_id || store.getIssueReplyState(issue.id).status === "running") throw new Error("issue_execution_running");
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
          const accepted = await worker.stopIssue(issue.id);
          const current = store.getIssue(issue.id);
          if (!accepted && (current?.active_run_status || current?.session_active_turn_id || store.getIssueReplyState(issue.id).status === "running")) throw new Error("issue_stop_timeout");
          return sendJson(response, current?.session_status === "stopping" ? 202 : 200, store.getIssue(issue.id));
        }
        if (method === "POST" && path[3] === "session-handoff" && path.length === 4) {
          const body = await readBody(request);
          const threadId = normalizeSessionId(cleanString(body.thread_id, 200));
          if (!threadId) throw new Error("session_required");
          if (issue.session_owned) {
            if (issue.session_thread_id !== threadId) throw new Error("issue_session_mismatch");
            return sendJson(response, 200, issue);
          }
          return sendJson(response, 200, store.handoffIssueSession(issue.id, threadId));
        }
        if (method === "POST" && path[3] === "archive") {
          const body = await readBody(request);
          const version = Number(body.version);
          if (!Number.isInteger(version) || version < 1) throw new Error("invalid_version");
          if (issue.version !== version) throw new Error("version_conflict");
          if (issue.enrichment_status === "pending") throw new Error("issue_enrichment_pending");
          if (issue.session_active_turn_id || store.getIssueReplyState(issue.id).status === "running") throw new Error("issue_execution_running");
          if (issue.active_run_status) {
            await worker.stopIssue(issue.id);
            const current = store.getIssue(issue.id);
            if (!current) throw new Error("issue_not_found");
            if (current.active_run_status) throw new Error("issue_execution_running");
            const updated = store.archiveIssue(issue.id, current.version);
            worker.wake();
            return sendJson(response, 200, updated);
          }
          const updated = store.archiveIssue(issue.id, version);
          worker.wake();
          return sendJson(response, 200, updated);
        }
        if (method === "POST" && path[3] === "unarchive") {
          const body = await readBody(request);
          if (issue.version !== Number(body.version)) throw new Error("version_conflict");
          const updated = store.unarchiveIssue(issue.id, Number(body.version));
          worker.wake();
          return sendJson(response, 200, updated);
        }
        if (method === "DELETE" && path.length === 3) {
          const body = await readBody(request);
          const version = Number(body.version);
          if (!Number.isInteger(version) || version < 1) throw new Error("invalid_version");
          if (issue.version !== version) throw new Error("version_conflict");
          if (issue.enrichment_status === "pending") throw new Error("issue_enrichment_pending");
          if (issue.active_run_status || issue.session_active_turn_id || store.getIssueReplyState(issue.id).status === "running") throw new Error("issue_execution_running");
          store.deleteArchivedIssue(issue.id, version);
          worker.wake();
          return sendJson(response, 200, { ok: true });
        }
        if (method === "GET" && path[3] === "attachments" && path.length === 6) {
          const threadId = issue.run_thread_id || issue.session_thread_id || issue.thread_id || "";
          const attachment = await readConversationAttachment(threadId, decodeURIComponent(path[4]), Number(path[5]));
          return sendJson(response, 200, attachment);
        }
        if (method === "GET" && path[3] === "conversation" && path.length === 4) {
          if (store.isEnrichmentPending(issue)) throw new Error("issue_enrichment_pending");
          const [current] = await reconcileInterruptedIssues(store, [issue]);
          const threadId = current.run_thread_id || current.session_thread_id || current.thread_id || "";
          const conversation = await readConversationResult(threadId);
          return sendJson(response, 200, {
            ...conversation,
            issue_id: current.id,
            reply: store.getIssueReplyState(current.id),
            user: readCodexUserProfile(),
            issue: store.getIssue(current.id),
          });
        }
        if (method === "POST" && path[3] === "reply" && path.length === 4) {
          if (updateInstallInProgress) throw new Error("update_in_progress");
          if (issue.archived_at) throw new Error("issue_archived");
          if (issue.session_handoff_at && !issue.session_owned) throw new Error("issue_session_handed_off");
          const body = await readBody(request, maxRemoteFileBodyBytes);
          const requestId = cleanString(body.request_id, 200) || randomUUID();
          const files = saveRemoteFiles(body.files, requestId);
          let filesCommitted = false;
          try {
            const message = withRemoteFilePaths(body.message, files.paths).trim();
            if (!message) throw new Error("message_required");
            const existingCommand = store.getSessionCommandByRequest(issue.id, requestId);
            if (existingCommand && existingCommand.status !== "failed" && existingCommand.status !== "cancelled") {
              if (String(existingCommand.payload.request_message || "") !== message) throw new Error("request_id_conflict");
              filesCommitted = true;
              const reply = store.getIssueReplyState(issue.id);
              return sendJson(response, 202, existingCommand.kind === "steer"
                ? { issue_id: issue.id, request_id: requestId, status: "running", message, steered: true }
                : reply);
            }
            if (!issue.session_thread_id && issue.active_run_status) throw new Error("issue_session_starting");
            if (!issue.session_thread_id && !store.canAutoStartFromUserMessage(issue)) {
              throw new Error(store.getAutoDispatch() ? "backlog_reply_blocked" : "manual_start_required");
            }
            if (!issue.session_thread_id) {
              const description = issue.description.trim();
              const updated = store.updateIssue(issue.id, issue.version, {
                description: description.endsWith(message) ? description : [description, message].filter(Boolean).join("\n\n"),
                agent_enabled: true,
                pending_actor: "agent",
                needs_attention: true,
              });
              filesCommitted = true;
              if (!worker.startIssue(updated.id)) throw new Error("issue_not_started");
              return sendJson(response, 202, { issue_id: issue.id, request_id: requestId, status: "running", message, initial_run: true });
            }
            const queued = worker.sendIssueMessage(issue.id, requestId, message);
            filesCommitted = true;
            const reply = store.getIssueReplyState(issue.id);
            return sendJson(response, 202, queued.steered
              ? { issue_id: issue.id, request_id: requestId, status: "running", message, steered: true }
              : reply);
          } catch (error) {
            if (!filesCommitted) files.cleanup();
            throw error;
          }
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
      if (requestTraceId) console.error(`BETTER_CODEX_DIAGNOSTIC ${JSON.stringify({ timestamp: new Date().toISOString(), scope: "request", event: "request_failed", trace_id: requestTraceId, method: request.method || "GET", path: request.url || "", error: code })}`);
      if (!response.headersSent) sendJson(response, errorStatus(code), { error: code, ...(requestTraceId ? { trace_id: requestTraceId } : {}) });
      else response.end();
    });
  });

  server.listen(runtimePort, "127.0.0.1", () => {
    const address = server.address();
    if (typeof address !== "object" || !address) throw new Error("runtime_address_unavailable");
    activeRuntimePort = address.port;
    publishRuntimeState({ ...identity, port: address.port });
    if (!mockupEnabled) worker.start();
    if (!mockupEnabled && remoteMode === "projection") syncClient.start();
    if (!mockupEnabled && remoteMode === "relay") relayClient.start();
    console.log(`Better Codex Runtime ${coreVersion} listening on http://127.0.0.1:${address.port}`);
  });
  const stop = () => {
    server.close(() => {
      cleanup();
      process.exit(0);
    });
    server.closeAllConnections();
  };
  server.once("error", error => {
    cleanup();
    console.error(error.message);
    process.exit(1);
  });
  process.once("SIGINT", stop);
  process.once("SIGTERM", stop);
  return server;
}
