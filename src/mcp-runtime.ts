import { randomUUID } from "node:crypto";
import { token } from "./config.js";
import { readRuntimeState, type RuntimeState } from "./runtime-state.js";
import { webCommandBodyLimit, webCommandTarget } from "./web-command-policy.js";

export interface McpRuntimeRequest {
  path: string;
  method?: string;
  body?: unknown;
  commandId?: string;
  traceId?: string;
  timeoutMs?: number;
}

export interface McpRuntimeResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
}

export interface McpRuntimeEvent {
  event: string;
  id: string;
  data: unknown;
}

export interface McpRuntimeEventsRequest {
  cursor?: string | number | null;
  runtimeInstanceId?: string | null;
  timeoutMs?: number;
}

export interface McpRuntimeEventsResponse {
  runtimeInstanceId: string;
  cursor: string | null;
  events: McpRuntimeEvent[];
}

/** These dependencies are server-side. Credentials never belong to an MCP tool argument. */
export interface McpRuntimeDependencies {
  readRuntimeState?: () => RuntimeState | null;
  token?: () => string;
  fetch?: typeof fetch;
  diagnostic?: (fields: Record<string, unknown>) => void;
}

export class McpRuntimeBridgeError extends Error {
  constructor(public readonly code: string, public readonly status: number, public readonly diagnostics: Record<string, unknown>) {
    super(code);
    this.name = "McpRuntimeBridgeError";
  }
}

const identifier = /^[A-Za-z0-9_-]{8,200}$/;
const readRoutes = [
  /^\/(?:health|livez|readyz)$/,
  /^\/api\/(?:bootstrap|issues|agents|projects|scheduled-tasks)$/,
  /^\/api\/ui\/mcp$/,
  /^\/api\/account\/usage(?:\/activity)?$/,
  /^\/api\/settings\/(?:auto-dispatch|scheduler-model|scheduler-reasoning-effort)$/,
  /^\/api\/(?:sync|relay)\/status$/,
  /^\/api\/remote-access\/(?:status|sessions)$/,
  /^\/api\/(?:update|runtime-update)$/,
  /^\/api\/commands\/[A-Za-z0-9_-]{8,200}$/,
  /^\/api\/issues\/from-thread$/,
  /^\/api\/issues\/attachments\/preview$/,
  /^\/api\/issues\/[^/]+$/,
  /^\/api\/issues\/[^/]+\/(?:conversation|semantics|mentions)$/,
  /^\/api\/issues\/[^/]+\/native-command\/[^/]+$/,
  /^\/api\/issues\/[^/]+\/attachments\/[^/]+\/\d+$/,
  /^\/api\/projects\/[^/]+(?:\/(?:semantics|mentions))?$/,
  /^\/api\/agents\/[^/]+$/,
  /^\/api\/sessions\/[^/]+\/workspace$/,
];

const writeRoutes: Record<string, RegExp[]> = {
  POST: [
    /^\/api\/(?:issues|agents|projects|scheduled-tasks)$/,
    /^\/api\/issues\/(?:from-thread|attachments)$/,
    /^\/api\/issues\/[^/]+\/(?:start|stop|move|archive|unarchive|reply|session-handoff|regenerate-title|native-command)$/,
    /^\/api\/issues\/[^/]+\/queue\/[^/]+\/send$/,
    /^\/api\/projects\/ensure$/,
    /^\/api\/projects\/[^/]+\/overview$/,
    /^\/api\/projects\/[^/]+\/planning\/(?:messages|reset)$/,
    /^\/api\/scheduled-tasks\/agent-create$/,
    /^\/api\/scheduled-tasks\/[^/]+\/run$/,
    /^\/api\/system\/(?:directory|directories|directories\/create)$/,
    /^\/api\/(?:sync\/(?:now|connect|disconnect)|relay\/(?:connect|disconnect))$/,
    /^\/api\/(?:update|runtime-update)\/(?:check|install)$/,
  ],
  PATCH: [
    /^\/api\/issues\/[^/]+$/,
    /^\/api\/issues\/[^/]+\/queue\/[^/]+$/,
    /^\/api\/agents\/[^/]+(?:\/avatar)?$/,
    /^\/api\/scheduled-tasks\/[^/]+$/,
    /^\/api\/settings\/(?:auto-dispatch|scheduler-model|scheduler-reasoning-effort)$/,
  ],
  DELETE: [
    /^\/api\/(?:issues|agents|projects|scheduled-tasks)\/[^/]+$/,
    /^\/api\/issues\/[^/]+\/queue\/[^/]+$/,
    /^\/api\/remote-access\/sessions\/[^/]+$/,
  ],
};

function requestPath(value: unknown) {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//") || /[\\#\u0000-\u0020\u007f]/.test(value)) throw new Error("mcp_runtime_path_invalid");
  const pathname = value.split("?", 1)[0];
  if (pathname.includes("//") || pathname.endsWith("/")) throw new Error("mcp_runtime_path_invalid");
  for (const segment of pathname.split("/").slice(1)) {
    let decoded = segment;
    // Reject encoded separators and recursively encoded traversal before URL normalization.
    for (let index = 0; index < 4; index += 1) {
      const next = decodeURIComponent(decoded);
      if (/[/\\#?\u0000-\u0020\u007f]/.test(next) || next === "." || next === "..") throw new Error("mcp_runtime_path_invalid");
      if (next === decoded) break;
      decoded = next;
    }
    if (/%[a-f\d]{2}/i.test(decoded)) throw new Error("mcp_runtime_path_invalid");
  }
  const url = new URL(value, "http://127.0.0.1");
  if (url.origin !== "http://127.0.0.1" || url.pathname !== pathname) throw new Error("mcp_runtime_path_invalid");
  return { path: value, pathname };
}

function identity(state: RuntimeState | null) {
  return {
    runtime_instance_id: state?.instanceId ?? null,
    runtime_pid: state?.pid ?? null,
    runtime_process_started_at: state?.processStartedAt ?? null,
    runtime_generation: state?.generation ?? null,
    runtime_port: state?.port ?? null,
    runtime_version: state?.version ?? null,
  };
}

function failure(deps: McpRuntimeDependencies, state: RuntimeState | null, code: string, status: number, fields: Record<string, unknown> = {}) {
  const diagnostics = { scope: "mcp_runtime", event: "bridge_request_failed", ...identity(state), ...fields, error: code, http_status: status };
  if (deps.diagnostic) deps.diagnostic(diagnostics);
  else console.error(`BETTER_CODEX_DIAGNOSTIC ${JSON.stringify(diagnostics)}`);
  return new McpRuntimeBridgeError(code, status, diagnostics);
}

function timeout(value: number | undefined, fallback: number, maximum: number) {
  return Number.isFinite(value) ? Math.max(1, Math.min(maximum, Math.trunc(value!))) : fallback;
}

function resolveRuntime(deps: McpRuntimeDependencies) {
  const state = (deps.readRuntimeState ?? readRuntimeState)();
  if (!state || !Number.isInteger(state.port) || state.port < 1 || state.port > 65535 || !state.instanceId) return null;
  return state;
}

function responseHeaders(headers: Headers) {
  const result: Record<string, string> = {};
  for (const name of ["content-type", "cache-control", "retry-after", "x-better-codex-command-id", "x-better-codex-request-id", "x-better-codex-trace-id"]) {
    const value = headers.get(name);
    if (value !== null) result[name] = value;
  }
  return result;
}

/** Resolve the active Runtime for every call; never cache ports, credentials, or business data. */
export async function requestMcpRuntime(args: McpRuntimeRequest, deps: McpRuntimeDependencies = {}): Promise<McpRuntimeResponse> {
  let state: RuntimeState | null = null;
  let controller: AbortController | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const fields: Record<string, unknown> = {};
  try {
    const { path, pathname } = requestPath(args.path);
    const method = (args.method ?? "GET").toUpperCase();
    fields.method = method;
    fields.path = pathname;
    const allowed = method === "GET" ? readRoutes.some(route => route.test(pathname)) : writeRoutes[method]?.some(route => route.test(pathname));
    if (!allowed) throw failure(deps, state, "mcp_runtime_route_forbidden", 403, fields);
    if (args.commandId !== undefined && !identifier.test(args.commandId)) throw failure(deps, state, "mcp_runtime_command_id_invalid", 400, fields);
    if (method !== "GET" && !args.commandId) throw failure(deps, state, "mcp_runtime_command_id_required", 400, fields);
    if (args.traceId !== undefined && !identifier.test(args.traceId)) throw failure(deps, state, "mcp_runtime_trace_id_invalid", 400, fields);
    fields.command_id = args.commandId ?? null;
    fields.trace_id = args.traceId ?? randomUUID();
    const body = args.body === undefined ? undefined : typeof args.body === "string" ? args.body : JSON.stringify(args.body);
    if (method === "GET" && body !== undefined) throw failure(deps, state, "mcp_runtime_read_body_forbidden", 400, fields);
    const limit = method === "POST" && pathname === "/api/issues/attachments" ? 30 * 1024 * 1024 : webCommandBodyLimit(method, path);
    if (body !== undefined && Buffer.byteLength(body) > limit) throw failure(deps, state, "mcp_runtime_body_too_large", 413, { ...fields, body_limit: limit });
    // The shared policy determines whether Runtime will persist and replay this command.
    fields.durable_command = Boolean(webCommandTarget(method, path));
    state = resolveRuntime(deps);
    if (!state) throw failure(deps, state, "mcp_runtime_unavailable", 503, fields);
    const headers: Record<string, string> = { authorization: `Bearer ${(deps.token ?? token)()}`, "x-better-codex-trace-id": String(fields.trace_id) };
    if (body !== undefined) headers["content-type"] = "application/json";
    if (args.commandId) {
      headers["x-better-codex-command-id"] = args.commandId;
      headers["x-better-codex-request-id"] = args.commandId;
    }
    controller = new AbortController();
    timer = setTimeout(() => controller!.abort(), timeout(args.timeoutMs, 30_000, 300_000));
    const response = await (deps.fetch ?? fetch)(`http://127.0.0.1:${state.port}${path}`, { method, body, headers, redirect: "error", signal: controller.signal });
    if (response.status >= 300 && response.status < 400) throw failure(deps, state, "mcp_runtime_redirect_forbidden", 502, fields);
    return { status: response.status, statusText: response.statusText, headers: responseHeaders(response.headers), body: await response.text() };
  } catch (error) {
    const result = error instanceof McpRuntimeBridgeError ? error : failure(deps, state, controller?.signal.aborted ? "mcp_runtime_timeout" : Object.keys(fields).length ? "mcp_runtime_transport_failed" : "mcp_runtime_path_invalid", controller?.signal.aborted ? 504 : Object.keys(fields).length ? 503 : 400, fields);
    return { status: result.status, statusText: result.code, headers: { "content-type": "application/json" }, body: JSON.stringify({ error: result.code, diagnostics: result.diagnostics }) };
  } finally {
    if (timer) clearTimeout(timer);
    controller?.abort();
  }
}

/** A bounded SSE read from Runtime's resident watcher, with cursors scoped to one instance. */
export async function pollMcpRuntimeEvents(args: McpRuntimeEventsRequest = {}, deps: McpRuntimeDependencies = {}): Promise<McpRuntimeEventsResponse> {
  let state: RuntimeState | null = null;
  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const controller = new AbortController();
  const fields = { method: "GET", path: "/api/events" };
  let connected = false;
  let result: McpRuntimeEventsResponse | undefined;
  try {
    state = resolveRuntime(deps);
    if (!state) throw failure(deps, state, "mcp_runtime_unavailable", 503, fields);
    const suppliedCursor = args.cursor === undefined || args.cursor === null ? null : String(args.cursor);
    if (suppliedCursor !== null && !/^\d{1,16}$/.test(suppliedCursor)) throw failure(deps, state, "mcp_runtime_cursor_invalid", 400, fields);
    const changed = Boolean(args.runtimeInstanceId && args.runtimeInstanceId !== state.instanceId);
    result = { runtimeInstanceId: state.instanceId, cursor: changed || args.runtimeInstanceId !== state.instanceId ? null : suppliedCursor, events: [] };
    if (changed) result.events.push({ event: "reset", id: "", data: { runtimeInstanceId: state.instanceId, reason: "runtime_instance_changed" } });
    const headers: Record<string, string> = { authorization: `Bearer ${(deps.token ?? token)()}`, accept: "text/event-stream" };
    if (result.cursor !== null) headers["last-event-id"] = result.cursor;
    const deadline = new Promise<null>(resolve => { timer = setTimeout(() => { controller.abort(); resolve(null); }, timeout(args.timeoutMs, 1000, 5000)); });
    const response = await Promise.race([(deps.fetch ?? fetch)(`http://127.0.0.1:${state.port}/api/events`, { headers, redirect: "error", signal: controller.signal }), deadline]);
    if (!response) throw failure(deps, state, "mcp_runtime_events_timeout", 504, fields);
    if (!response.ok || !response.body || !response.headers.get("content-type")?.startsWith("text/event-stream")) throw failure(deps, state, "mcp_runtime_events_unavailable", response.ok ? 502 : response.status, fields);
    connected = true;
    reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let bytes = 0;
    while (result.events.length < 256) {
      const chunk = await Promise.race([reader.read(), deadline]);
      if (!chunk) break;
      bytes += chunk.value?.byteLength ?? 0;
      if (bytes > 1024 * 1024) throw failure(deps, state, "mcp_runtime_events_too_large", 502, fields);
      buffer += decoder.decode(chunk.value ?? new Uint8Array(), { stream: !chunk.done });
      let boundary: RegExpExecArray | null;
      while ((boundary = /\r?\n\r?\n/.exec(buffer)) && result.events.length < 256) {
        const block = buffer.slice(0, boundary.index);
        buffer = buffer.slice(boundary.index + boundary[0].length);
        let event = "message";
        let id = "";
        const data: string[] = [];
        for (const line of block.split(/\r?\n/)) {
          if (line.startsWith("event:")) event = line.slice(6).trim();
          if (line.startsWith("id:")) id = line.slice(3).trim();
          if (line.startsWith("data:")) data.push(line.slice(5).replace(/^ /, ""));
        }
        if (!["ready", "change", "reset"].includes(event) || !data.length) continue;
        if (!/^\d{1,16}$/.test(id)) throw failure(deps, state, "mcp_runtime_event_cursor_invalid", 502, fields);
        let value: unknown;
        try { value = JSON.parse(data.join("\n")); }
        catch { throw failure(deps, state, "mcp_runtime_event_data_invalid", 502, fields); }
        result.events.push({ event, id, data: value });
        result.cursor = id;
      }
      if (chunk.done) break;
    }
    return result;
  } catch (error) {
    if (controller.signal.aborted && connected && result) return result;
    throw error instanceof McpRuntimeBridgeError ? error : failure(deps, state, controller.signal.aborted ? "mcp_runtime_events_timeout" : "mcp_runtime_events_transport_failed", controller.signal.aborted ? 504 : 503, fields);
  } finally {
    if (timer) clearTimeout(timer);
    controller.abort();
    if (reader) void reader.cancel().catch(() => {});
  }
}
