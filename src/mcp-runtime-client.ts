import { readFileSync } from "node:fs";
import { tokenPath } from "./config.js";
import { readRuntimeState } from "./runtime-state.js";
import { z } from "zod";
import { boardApiInput, boardApiOutput, boardSnapshotSchema, createTaskInput, externalCollectionSchema, externalDetailSchema, externalReportResultSchema,
  getTaskInput, listTasksInput, projectsSchema, reportExternalInput, reportExternalTaskInput, externalEventsInput, externalEventsSchema, taskHistoryInput, taskHistorySchema, taskSchema, updateTaskInput } from "./mcp-schemas.js";

export type McpRuntimeConnection = { baseUrl: string; token: string };
const sensitiveFields = /secret|password|credential|authorization|(?:^|_)(?:token|api_key|private_key|access_key|cookie|path|paths|locator|locators|instructions|system_prompt|transcript|transcripts)$|(?:Path|Paths|Token)$|^systemPrompt$|^planning$|^semantic_references$|^input_document$/i;
/** MCP App receives display data only; it never acquires local credentials or filesystem locators. */
export function sanitizeMcpAppData(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sanitizeMcpAppData);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).filter(([key]) => !sensitiveFields.test(key)).map(([key, item]) => [key, sanitizeMcpAppData(item)]));
  return value;
}
function existingConnection(): McpRuntimeConnection {
  const state = readRuntimeState();
  if (!state) throw new Error("mcp_runtime_unavailable");
  let token = process.env.BETTER_CODEX_TOKEN || "";
  if (!token) { try { token = readFileSync(tokenPath, "utf8").trim(); } catch { throw new Error("mcp_runtime_auth_unavailable"); } }
  if (!token) throw new Error("mcp_runtime_auth_unavailable");
  return { baseUrl: `http://127.0.0.1:${state.port}`, token };
}

/** Authenticated HTTP only. Never opens the business database, starts Runtime, or creates credentials. */
export class McpRuntimeClient {
  private closed = false;
  private controllers = new Set<AbortController>();
  private subscriptions = new Set<() => void>();
  constructor(private readonly connection: () => McpRuntimeConnection = existingConnection) {
    this.assertAllowed();
  }
  private assertAllowed() {
    if (process.env.BETTER_CODEX_SCHEDULER === "1") throw new Error("mcp_scheduler_access_denied");
    if (this.closed) throw new Error("mcp_runtime_client_closed");
  }
  private connectionDetails() {
    this.assertAllowed();
    const connection = this.connection();
    const url = new URL(connection.baseUrl);
    if (url.protocol !== "http:" || !["127.0.0.1", "[::1]"].includes(url.hostname) || url.username || url.password || url.pathname !== "/" || url.search || url.hash || !connection.token.trim()) {
      throw new Error("mcp_runtime_connection_invalid");
    }
    return connection;
  }
  private async request(path: string, method = "GET", body?: unknown) {
    const { baseUrl, token } = this.connectionDetails();
    const controller = new AbortController(); this.controllers.add(controller);
    try {
      const response = await fetch(`${baseUrl}${path}`, { method, redirect: "error", signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15_000)]),
        headers: { authorization: `Bearer ${token}`, accept: "application/json", ...(body ? { "content-type": "application/json" } : {}) },
        ...(body ? { body: JSON.stringify(body) } : {}) });
      const value: unknown = await response.json();
      if (!response.ok) {
        const error = value && typeof value === "object" && "error" in value ? String(value.error) : `mcp_runtime_http_${response.status}`;
        throw new Error(error);
      }
      return value;
    } finally { this.controllers.delete(controller); }
  }
  async listTasks(input: unknown = {}) {
    const parsed = listTasksInput.parse(input); const query = new URLSearchParams();
    if (parsed.project_id) query.set("project_id", parsed.project_id);
    if (parsed.search) query.set("search", parsed.search);
    if (parsed.archived) query.set("archived", "1");
    return z.array(taskSchema).parse(await this.request(`/api/issues?${query}`));
  }
  async getTask(input: unknown) { const { id } = getTaskInput.parse(input); return taskSchema.parse(await this.request(`/api/issues/${encodeURIComponent(id)}`)); }
  async createTask(input: unknown) {
    const parsed = createTaskInput.parse(input);
    return taskSchema.parse(await this.request("/api/issues", "POST", { ...parsed, agent_enabled: false, ai_enrich: false }));
  }
  async updateTask(input: unknown) {
    const { id, ...patch } = updateTaskInput.parse(input);
    return taskSchema.parse(await this.request(`/api/issues/${encodeURIComponent(id)}`, "PATCH", patch));
  }
  async taskHistory(input: unknown) {
    const {id,...query}=taskHistoryInput.parse(input);const search=new URLSearchParams();
    for(const [key,value] of Object.entries(query))if(value!==undefined)search.set(key,String(value));
    return taskHistorySchema.parse(await this.request(`/api/issues/${encodeURIComponent(id)}/history?${search}`));
  }
  async listExternalObservations() { return externalCollectionSchema.parse(await this.request("/api/external-observations")); }
  async getExternalObservation(input: unknown) {
    const { id } = getTaskInput.parse(input); return externalDetailSchema.parse(await this.request(`/api/external-observations/${encodeURIComponent(id)}`));
  }
  async reportExternalObservation(input: unknown) {
    const parsed = reportExternalInput.parse(input);
    // Runtime enforces its own opt-in. A client flag must never confer authorization.
    return externalReportResultSchema.parse(await this.request("/api/external-observations/report", "POST", parsed));
  }
  async reportExternalTask(input: unknown) {
    return externalReportResultSchema.parse(await this.request("/api/external-observations/report", "POST", reportExternalTaskInput.parse(input)));
  }
  async externalEvents(input: unknown = {}) {
    const parsed=externalEventsInput.parse(input),query=new URLSearchParams();
    for (const [key,value] of Object.entries(parsed)) if(value!==undefined) query.set(key,String(value));
    return externalEventsSchema.parse(await this.request(`/api/external-observations/events?${query}`));
  }
  async boardApiRequest(input: unknown) {
    const { path } = boardApiInput.parse(input);
    if (!path.startsWith("/api/") || path.includes("\\") || path.includes("#")) throw new Error("mcp_board_route_denied");
    const url = new URL(path, "http://runtime.local");
    const routes = /^\/api\/(?:bootstrap|issues(?:\/[^/]+(?:\/history)?)?|external-observations(?:\/[^/]+)?|projects(?:\/[^/]+)?|agents(?:\/[^/]+)?|account\/usage(?:\/activity)?|update)$/;
    if (!routes.test(url.pathname) || /%2f|%5c|%2e/i.test(url.pathname) || url.pathname.endsWith("/report")) throw new Error("mcp_board_route_denied");
    if ([...url.searchParams.keys()].some(key => !["project_id", "search", "archived","after","limit","task_id"].includes(key))) throw new Error("mcp_board_query_denied");
    return boardApiOutput.parse({ data: sanitizeMcpAppData(await this.request(`${url.pathname}${url.search}`)) });
  }
  async boardAppInitialData() {
    const [bootstrap, issues] = await Promise.all([this.boardApiRequest({ path: "/api/bootstrap" }), this.boardApiRequest({ path: "/api/issues" })]);
    return { bootstrap: bootstrap.data, issues: issues.data };
  }
  async boardSnapshot(input: unknown = {}) {
    const [tasks, external, projects] = await Promise.all([this.listTasks(input), this.listExternalObservations(), this.request("/api/projects").then(value => projectsSchema.parse(value))]);
    return boardSnapshotSchema.parse({ tasks, external_observations: external.observations, external_observation_capability: external.capability, projects });
  }
  /** One Runtime-owned cached event stream per MCP subscription set; no filesystem watcher. */
  subscribe(onChange: () => void, onError: (error: Error) => void = () => {}): () => void {
    this.assertAllowed();
    const controller = new AbortController(); this.controllers.add(controller);
    let stopped = false; let retry: ReturnType<typeof setTimeout> | undefined;
    const consume = async () => {
      try {
        const { baseUrl, token } = this.connectionDetails();
        const response = await fetch(`${baseUrl}/api/events`, { headers: { authorization: `Bearer ${token}`, accept: "text/event-stream" }, redirect: "error", signal: controller.signal });
        if (!response.ok || !response.body) throw new Error(`mcp_runtime_events_${response.status}`);
        const reader = response.body.getReader(); const decoder = new TextDecoder(); let buffer = "";
        try {
          while (!stopped) {
            const next = await reader.read(); if (next.done) break;
            buffer = (buffer + decoder.decode(next.value, { stream: true })).replace(/\r\n/g, "\n");
            let boundary;
            while ((boundary = buffer.indexOf("\n\n")) >= 0) {
              const event = buffer.slice(0, boundary); buffer = buffer.slice(boundary + 2);
              // A new stream or revision reset requires a snapshot refresh after reconnect.
              if (/^event:\s*(?:change|ready|reset)\s*$/m.test(event)) onChange();
            }
            if (buffer.length > 64 * 1024) throw new Error("mcp_runtime_event_too_large");
          }
        } finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
      } catch (error) { if (!stopped) onError(error instanceof Error ? error : new Error("mcp_runtime_events_failed")); }
      if (!stopped && !this.closed) retry = setTimeout(() => void consume(), 1000);
    };
    void consume();
    const stop = () => { stopped = true; clearTimeout(retry); controller.abort(); this.controllers.delete(controller); this.subscriptions.delete(stop); };
    this.subscriptions.add(stop);
    return stop;
  }
  close() { this.closed = true; for (const stop of this.subscriptions) stop(); for (const controller of this.controllers) controller.abort(); this.controllers.clear(); }
}
