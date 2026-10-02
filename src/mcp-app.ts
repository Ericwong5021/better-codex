import { createInterface } from "node:readline";
import { coreVersion } from "./version.js";
import { betterCodexMcpIcons } from "./mcp-icons.js";
import { betterCodexMcpHostHtml } from "./mcp-host.js";
import { McpRuntimeBridgeError, pollMcpRuntimeEvents, requestMcpRuntime, type McpRuntimeEventsRequest, type McpRuntimeRequest } from "./mcp-runtime.js";
import { betterCodexMcpMimeType as mimeType, betterCodexMcpResourceUri as resourceUri, betterCodexMcpTool } from "./mcp-contract.js";
export { betterCodexMcpName, betterCodexMcpTool, betterCodexMcpRoute, betterCodexMcpPageRoute } from "./mcp-contract.js";

type JsonRpcId = string | number | null;
export type McpAppRequest = { jsonrpc?: string; id?: JsonRpcId; method?: string; params?: Record<string, unknown> };
export type McpAppServices = {
  ensureRuntime: () => Promise<unknown>;
  launchSidebar: () => Promise<unknown>;
  requestRuntime?: typeof requestMcpRuntime;
  pollEvents?: typeof pollMcpRuntimeEvents;
};
const appOnly = { ui: { visibility: ["app"] } };
const appIcons = betterCodexMcpIcons();
const requestProperties = {
  path: { type: "string" },
  method: { type: "string" },
  body: { type: "string" },
  commandId: { type: "string" },
  traceId: { type: "string" },
  timeoutMs: { type: "number" },
};
const tools = [
  {
    name: betterCodexMcpTool, title: "Better Codex", description: "Open the Better Codex task board, agents, projects and settings.",
    icons: appIcons,
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    annotations: { title: "Better Codex", readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    _meta: { ui: { resourceUri, visibility: ["app"] }, "openai/ui": { entrypoints: [{ type: "global" }] }, "openai/outputTemplate": resourceUri },
  },
  {
    name: "runtime_read", title: "Read Better Codex", description: "Read the local Better Codex service for the app.",
    inputSchema: { type: "object", properties: { path: requestProperties.path, method: { type: "string", enum: ["GET"] }, traceId: requestProperties.traceId, timeoutMs: requestProperties.timeoutMs }, required: ["path"], additionalProperties: false },
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false }, _meta: appOnly,
  },
  {
    name: "runtime_command", title: "Manage Better Codex", description: "Submit a user action to the local Better Codex service.",
    inputSchema: { type: "object", properties: { ...requestProperties, method: { type: "string", enum: ["POST", "PATCH", "DELETE"] } }, required: ["path", "method", "commandId"], additionalProperties: false },
    annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: false }, _meta: appOnly,
  },
  {
    name: "runtime_events", title: "Better Codex updates", description: "Read a bounded batch from the existing Runtime event stream.",
    inputSchema: { type: "object", properties: { cursor: { type: "string" }, runtimeInstanceId: { type: "string" }, timeoutMs: { type: "number" } }, additionalProperties: false },
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false }, _meta: appOnly,
  },
  {
    name: "sidebar", title: "Better Codex Sidebar", description: "Restore the optional desktop sidebar integration on explicit user action.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    _meta: { ui: { resourceUri, visibility: ["app"] }, "openai/outputTemplate": resourceUri },
  },
];

const toolResult = (structuredContent: unknown, text = "Better Codex service response.") => ({ content: [{ type: "text", text }], structuredContent });

/** Pure protocol dispatch also lets tests exercise the same path as stdio. */
export async function handleMcpAppRequest(request: McpAppRequest, services: McpAppServices) {
  const id = request.id ?? null;
  const result = (value: unknown) => ({ jsonrpc: "2.0", id, result: value });
  const error = (code: number, message: string, data?: unknown) => ({ jsonrpc: "2.0", id, error: { code, message, ...(data === undefined ? {} : { data }) } });
  if (request.method === "initialize") return result({
    protocolVersion: typeof request.params?.protocolVersion === "string" ? request.params.protocolVersion : "2025-06-18",
    capabilities: { resources: {}, tools: {} }, serverInfo: { name: "Better Codex", version: coreVersion, icons: appIcons },
  });
  if (request.method === "ping") return result({});
  if (request.method === "tools/list") return result({ tools });
  if (request.method === "resources/list") return result({ resources: [{ uri: resourceUri, name: "Better Codex", title: "Better Codex", mimeType }] });
  if (request.method === "resources/templates/list") return result({ resourceTemplates: [] });
  if (request.method === "resources/read") {
    if (request.params?.uri !== resourceUri) return error(-32602, "resource_not_found");
    try {
      await services.ensureRuntime();
      const response = await (services.requestRuntime || requestMcpRuntime)({ path: "/api/ui/mcp", timeoutMs: 10000 });
      // An older Runtime may not yet expose the renderer. Other failures stay visible.
      let html: string;
      if (response.status === 404) html = betterCodexMcpHostHtml();
      else {
        const rendered = JSON.parse(response.body);
        if (response.status >= 400) return error(-32603, rendered.error || "runtime_unavailable", { http_status: response.status, diagnostics: rendered.diagnostics || null });
        if (typeof rendered.html !== "string" || !rendered.html.startsWith("<!doctype html>") || Buffer.byteLength(rendered.html) > 16 * 1024 * 1024) return error(-32603, "mcp_resource_invalid");
        html = rendered.html;
      }
      return result({ contents: [{ uri: resourceUri, name: "Better Codex", title: "Better Codex", mimeType, text: html, _meta: { ui: { csp: { connectDomains: [], resourceDomains: [] }, permissions: { microphone: {}, clipboardWrite: {} } } } }] });
    } catch (failure) {
      return error(-32603, "mcp_resource_unavailable", { pid: process.pid, version: coreVersion, error: failure instanceof Error ? failure.message : String(failure) });
    }
  }
  if (request.method !== "tools/call") return error(-32601, "method_not_found");
  const name = request.params?.name;
  const args = (request.params?.arguments || {}) as Record<string, unknown>;
  try {
    if (name === betterCodexMcpTool) {
      await services.ensureRuntime();
      const response = await (services.requestRuntime || requestMcpRuntime)({ path: "/api/bootstrap" });
      const bootstrap = JSON.parse(response.body);
      if (response.status >= 400) throw new McpRuntimeBridgeError(bootstrap.error || "runtime_unavailable", response.status, bootstrap.diagnostics || {});
      return result({ ...toolResult({ ready: true, bootstrap }, "Better Codex is connected to the local Runtime."), _meta: { ui: { resourceUri }, "openai/outputTemplate": resourceUri } });
    }
    if (name === "runtime_read" || name === "runtime_command") {
      const method = String(args.method || "GET").toUpperCase();
      if (name === "runtime_read" ? method !== "GET" : !["POST", "PATCH", "DELETE"].includes(method)) return error(-32602, "invalid_runtime_method");
      return result(toolResult(await (services.requestRuntime || requestMcpRuntime)({ ...args, method } as unknown as McpRuntimeRequest)));
    }
    if (name === "runtime_events") return result(toolResult(await (services.pollEvents || pollMcpRuntimeEvents)(args as McpRuntimeEventsRequest)));
    if (name === "sidebar") {
      const injection = await services.launchSidebar();
      return result({ ...toolResult({ ready: true, injection }, "Better Codex sidebar integration started."), _meta: { ui: { resourceUri }, "openai/outputTemplate": resourceUri } });
    }
    return error(-32602, "tool_not_found");
  } catch (failure) {
    const message = failure instanceof Error ? failure.message : String(failure);
    const diagnostics = failure instanceof McpRuntimeBridgeError ? failure.diagnostics : { event: "mcp_app_request_failed", pid: process.pid, version: coreVersion, tool: name, error: message };
    process.stderr.write(`${JSON.stringify(diagnostics)}\n`);
    return result({ isError: true, content: [{ type: "text", text: message }], structuredContent: { diagnostics } });
  }
}

export function startMcpAppServer(services: McpAppServices) {
  let pendingLaunch: Promise<unknown> | null = null;
  const launchSidebar = () => {
    if (!pendingLaunch) pendingLaunch = Promise.resolve().then(services.launchSidebar).finally(() => { pendingLaunch = null; });
    return pendingLaunch;
  };
  const input = createInterface({ input: process.stdin, crlfDelay: Infinity });
  input.on("line", line => {
    if (!line.trim()) return;
    try {
      const request = JSON.parse(line) as McpAppRequest;
      if (request.id === undefined) return;
      void handleMcpAppRequest(request, { ...services, launchSidebar }).then(response => {
        process.stdout.write(`${JSON.stringify(response)}\n`);
      }).catch(() => process.stdout.write(`${JSON.stringify({ jsonrpc: "2.0", id: request.id, error: { code: -32603, message: "mcp_request_failed" } })}\n`));
    } catch {
      process.stdout.write(`${JSON.stringify({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "parse_error" } })}\n`);
    }
  });
  return new Promise<void>(resolve => input.once("close", resolve));
}
