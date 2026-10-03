import { spawn, type ChildProcess } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { isSea } from "node:sea";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";
import { registerAppResource, registerAppTool, RESOURCE_MIME_TYPE } from "@modelcontextprotocol/ext-apps/server";
import { OpenAIExtensions } from "@openai/mcp-extensions/server";
import { z } from "zod";
import { packagedBuild } from "./build.js";
import { coreVersion } from "./version.js";
import { betterCodexMcpIcons } from "./mcp-icons.js";
import { betterCodexMcpHostHtml } from "./mcp-host.js";
import { connectMcpStdio } from "./mcp-app.js";
import { pollMcpRuntimeEvents, type McpRuntimeRequest, type McpRuntimeResponse, type McpRuntimeEventsRequest, type McpRuntimeEventsResponse } from "./mcp-runtime.js";
import type { RuntimeState } from "./runtime-state.js";

export const mockupMcpName = "better-codex-mockup";
export const mockupResourceUri = "ui://better-codex-mockup/board.html";
const idSchema = z.string().regex(/^[A-Za-z0-9_-]{8,200}$/);
const readSchema = z.object({ path: z.string(), method: z.literal("GET").optional(), traceId: idSchema.optional(), timeoutMs: z.number().finite().optional() }).strict();
const commandSchema = z.object({ path: z.string(), method: z.enum(["POST", "PUT", "PATCH", "DELETE"]), body: z.string().optional(), commandId: idSchema, traceId: idSchema.optional(), timeoutMs: z.number().finite().optional() }).strict();
const eventsSchema = z.object({ cursor: z.string().regex(/^\d{1,16}$/).optional(), runtimeInstanceId: z.string().optional(), timeoutMs: z.number().finite().optional() }).strict();
const responseSchema = z.object({ status: z.number(), statusText: z.string(), headers: z.record(z.string(), z.string()), body: z.string() });
const eventsOutput = z.object({ runtimeInstanceId: z.string(), cursor: z.string().nullable(), events: z.array(z.object({ event: z.string(), id: z.string(), data: z.unknown() })) });
const readRoutes = [/^\/api\/(bootstrap|issues|agents|projects|scheduled-tasks)$/, /^\/api\/mockup\/state$/, /^\/api\/agents\/[^/]+$/, /^\/api\/issues\/[^/]+(?:\/conversation)?$/, /^\/api\/settings\/(auto-dispatch|scheduler-model|scheduler-reasoning-effort)$/];
const writeRoutes: Record<string, RegExp[]> = {
  POST: [/^\/api\/(issues|agents|projects)$/, /^\/api\/mockup\/reset$/, /^\/api\/issues\/[^/]+\/(start|stop|move|archive|unarchive)$/],
  PUT: [/^\/api\/mockup\/state$/],
  PATCH: [/^\/api\/(issues|agents)\/[^/]+$/, /^\/api\/settings\/(auto-dispatch|scheduler-model|scheduler-reasoning-effort)$/],
  DELETE: [/^\/api\/(issues|agents|projects)\/[^/]+$/],
};
export function mockupRequestPath(path: string, method: string) {
  if (!path.startsWith("/") || path.startsWith("//") || /[\\#\u0000-\u0020\u007f]/.test(path)) throw new Error("mockup_path_invalid");
  const parsed = new URL(path, "http://127.0.0.1");
  const pathname = path.split("?", 1)[0];
  if (parsed.pathname !== pathname || pathname.includes("//") || /%(?:25|2f|5c|2e)/i.test(pathname)) throw new Error("mockup_path_invalid");
  if ([...parsed.searchParams.keys()].some(key => !["locale", "archived", "project_id", "q", "search"].includes(key))) throw new Error("mockup_query_forbidden");
  if (!(method === "GET" ? readRoutes : writeRoutes[method] || []).some(route => route.test(pathname))) throw new Error("mockup_action_not_supported");
  return path;
}
function failure(error: string, status = 400): McpRuntimeResponse { return { status, statusText: error, headers: { "content-type": "application/json" }, body: JSON.stringify({ error }) }; }
export interface MockupMcpTransport {
  request(args: McpRuntimeRequest): Promise<McpRuntimeResponse>;
  events(args: McpRuntimeEventsRequest): Promise<McpRuntimeEventsResponse>;
  close(): Promise<void>;
}

/** A private child and private home; never consults or starts an installed Runtime. */
export async function startMockupTransport(signal?: AbortSignal): Promise<MockupMcpTransport> {
  if (isSea() || packagedBuild) throw new Error("mockup_source_only");
  const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const home = mkdtempSync(join(tmpdir(), "better-codex-mockup-mcp-"));
  const secret = randomUUID();
  mkdirSync(join(home, "run"), { recursive: true });
  writeFileSync(join(home, "run/token"), secret, { mode: 0o600 });
  const environment = Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith("BETTER_CODEX_") && key !== "CODEX_HOME"));
  Object.assign(environment, { BETTER_CODEX_HOME: home, BETTER_CODEX_PEER_HOME: join(home, "peer"), BETTER_CODEX_DB: join(home, "mockup.db"), BETTER_CODEX_RUNTIME_PORT: "0", BETTER_CODEX_PROFILE: "development", BETTER_CODEX_TOKEN: secret, BETTER_CODEX_DISABLE_DELEGATION: "1", BETTER_CODEX_DISABLE_RUNTIME_SESSION_RELAY: "1", CODEX_HOME: join(home, "codex") });
  const child = spawn(process.execPath, ["--import", "tsx", join(root, "src/cli.ts"), "serve", "--mockup"], { cwd: root, env: environment, stdio: ["ignore", "ignore", "pipe"] });
  let startupError = "";
  child.stderr?.on("data", chunk => { startupError = (startupError + String(chunk)).slice(-8192); });
  child.on("error", error => { startupError = error.message; });
  let closed = false;
  const abortHandler = () => { void close(); };
  const close = async () => {
    if (closed) return;
    closed = true;
    signal?.removeEventListener("abort", abortHandler);
    await stopOwnedChild(child);
    rmSync(home, { recursive: true, force: true });
  };
  signal?.addEventListener("abort", abortHandler, { once: true });
  if (signal?.aborted) abortHandler();
  let state: RuntimeState | null = null;
  try {
    const deadline = Date.now() + 20_000;
    while (Date.now() < deadline) {
      if (closed || child.exitCode !== null || child.signalCode !== null || !child.pid) throw new Error("mockup_service_failed: " + startupError);
      try { state = JSON.parse(readFileSync(join(home, "run/runtime.json"), "utf8")) as RuntimeState; } catch {}
      if (state && state.pid === child.pid && state.port > 0) {
        const response = await fetch(`http://127.0.0.1:${state.port}/api/bootstrap`, { headers: { authorization: `Bearer ${secret}` }, signal: AbortSignal.timeout(2000) });
        if (response.ok && (await response.json()).mockup === true) break;
        state = null;
      }
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    if (!state) throw new Error("mockup_service_start_timeout: " + startupError);
  } catch (error) { await close(); throw error; }
  const runtime = state;
  const receipts = new Map<string, { fingerprint: string; result: Promise<McpRuntimeResponse> }>();
  const request = async (args: McpRuntimeRequest): Promise<McpRuntimeResponse> => {
    try {
      if (closed || child.exitCode !== null || child.signalCode !== null) return failure("mockup_service_closed", 503);
      const method = (args.method || "GET").toUpperCase();
      const path = mockupRequestPath(args.path, method);
      if (method !== "GET" && !idSchema.safeParse(args.commandId).success) return failure("mockup_command_id_required");
      const body = args.body === undefined ? undefined : typeof args.body === "string" ? args.body : JSON.stringify(args.body);
      if (method === "GET" && body !== undefined) return failure("mockup_read_body_forbidden");
      if (body !== undefined && Buffer.byteLength(body) > (path.startsWith("/api/mockup/state") ? 16 * 1024 * 1024 : 2 * 1024 * 1024)) return failure("mockup_body_too_large", 413);
      const fingerprint = JSON.stringify([method, path, body]);
      const existing = args.commandId ? receipts.get(args.commandId) : undefined;
      if (existing) return existing.fingerprint === fingerprint ? existing.result : failure("mockup_command_id_conflict", 409);
      if (method !== "GET" && receipts.size >= 1024) return failure("mockup_command_limit", 429);
      const result = (async () => {
        const response = await fetch(`http://127.0.0.1:${runtime.port}${path}`, { method, body, redirect: "error", headers: { authorization: `Bearer ${secret}`, "content-type": "application/json", ...(args.commandId ? { "x-better-codex-command-id": args.commandId } : {}) }, signal: AbortSignal.timeout(Math.max(1, Math.min(args.timeoutMs || 30_000, 30_000))) });
        return { status: response.status, statusText: response.statusText, headers: { "content-type": response.headers.get("content-type") || "application/json" }, body: await response.text() };
      })().catch(() => failure("mockup_transport_failed", 503));
      if (args.commandId && method !== "GET") receipts.set(args.commandId, { fingerprint, result });
      return result;
    } catch (error) { return failure(error instanceof Error ? error.message : "mockup_request_failed"); }
  };
  return { request, close, events: args => {
    if (closed || child.exitCode !== null || child.signalCode !== null) return Promise.reject(new Error("mockup_service_closed"));
    return pollMcpRuntimeEvents(args, { readRuntimeState: () => runtime, token: () => secret });
  } };
}
async function stopOwnedChild(child: ChildProcess) {
  if (child.exitCode !== null || child.signalCode !== null || !child.pid) return;
  await new Promise<void>(resolve => {
    const timer = setTimeout(() => { child.kill("SIGKILL"); }, 3000);
    child.once("close", () => { clearTimeout(timer); resolve(); });
    child.kill("SIGTERM");
  });
}

/** Development simulation intentionally exposes no production business/model tools. */
export function createMockupMcpServer(transport: MockupMcpTransport) {
  const server = new McpServer({ name: mockupMcpName, version: coreVersion, icons: betterCodexMcpIcons() });
  new OpenAIExtensions(server);
  let initialized = false;
  server.server.oninitialized = () => { initialized = true; };
  const assertInitialized = () => { if (!initialized) throw new McpError(ErrorCode.InvalidRequest, "mcp_not_initialized"); };
  const appOnly = { ui: { resourceUri: mockupResourceUri, visibility: ["app"] as ("app" | "model")[] } };
  const result = (value: object) => ({ content: [{ type: "text" as const, text: JSON.stringify(value) }], structuredContent: { ...value } });
  const register = (name: string, inputSchema: z.ZodObject, outputSchema: z.ZodObject, readOnlyHint: boolean, action: (value: any) => Promise<object>) => registerAppTool(server, name, { description: "Bounded isolated development Mockup transport.", inputSchema, outputSchema, annotations: { readOnlyHint, destructiveHint: !readOnlyHint, openWorldHint: false }, _meta: appOnly }, async value => { assertInitialized(); return result(await action(value)); });
  registerAppTool(server, "board", { title: "Better Codex Mockup", description: "Open isolated development Mockup.", inputSchema: z.object({}).strict(), annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false }, _meta: { ui: { resourceUri: mockupResourceUri }, "openai/ui": { entrypoints: [{ type: "global" }] } } }, async () => { assertInitialized(); return result({ mockup: true }); });
  register("mockup_read", readSchema, responseSchema, true, value => transport.request(readSchema.parse(value)));
  register("mockup_command", commandSchema, responseSchema, false, value => transport.request(commandSchema.parse(value)));
  register("mockup_events", eventsSchema, eventsOutput, true, value => transport.events(eventsSchema.parse(value)));
  registerAppResource(server, "Better Codex Mockup", mockupResourceUri, { title: "Better Codex Mockup", _meta: { ui: { csp: { connectDomains: [], resourceDomains: [] } } } }, async uri => { assertInitialized(); return { contents: [{ uri: uri.href, mimeType: RESOURCE_MIME_TYPE, text: betterCodexMcpHostHtml({ mockup: true }), _meta: { ui: { csp: { connectDomains: [], resourceDomains: [] }, permissions: { clipboardWrite: {} } } } }] }; });
  return server;
}
export async function startMockupMcpAppServer() {
  const controller = new AbortController();
  const abort = () => controller.abort();
  process.once("SIGTERM", abort); process.once("SIGINT", abort);
  let transport: MockupMcpTransport | undefined;
  try {
    transport = await startMockupTransport(controller.signal);
    await connectMcpStdio(createMockupMcpServer(transport));
  } finally {
    process.off("SIGTERM", abort); process.off("SIGINT", abort);
    await transport?.close();
  }
}
