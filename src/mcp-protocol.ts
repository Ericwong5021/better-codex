import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { McpError, ErrorCode, SubscribeRequestSchema, UnsubscribeRequestSchema, type CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { registerAppResource, registerAppTool, RESOURCE_MIME_TYPE } from "@modelcontextprotocol/ext-apps/server";
import { OpenAIExtensions } from "@openai/mcp-extensions/server";
import { z } from "zod";
import { coreVersion } from "./compatibility.js";
import { McpRuntimeClient } from "./mcp-runtime-client.js";
import { betterCodexMcpIcons } from "./mcp-icons.js";
import { McpRuntimeBridgeError, pollMcpRuntimeEvents, requestMcpRuntime } from "./mcp-runtime.js";
import { betterCodexMcpName, betterCodexMcpTool, betterCodexMcpResourceUri } from "./mcp-contract.js";
export { betterCodexMcpName, betterCodexMcpTool, betterCodexMcpPageRoute } from "./mcp-contract.js";
import { boardApiInput, boardApiOutput, boardSnapshotSchema, createTaskInput, emptyInput, externalCollectionSchema, externalDetailSchema,
  externalReportResultSchema, getTaskInput, listTasksInput, reportExternalInput, reportExternalTaskInput, externalEventsInput, externalEventsSchema, taskHistoryInput, taskHistorySchema, taskSchema, updateTaskInput } from "./mcp-schemas.js";

export const boardResourceUri = betterCodexMcpResourceUri;
export const boardSnapshotResourceUri = "better-codex://board/snapshot";

const reportingInstructions = `Better Codex separates Runtime-owned tasks from declared external observations.
For user-authorized tracking of Dot or other external work, use external_tasks_report (schema_version 2), not tasks_create or tasks_update to mirror execution. External reporting never starts local work, verifies the caller's identity, or grants human acceptance. Keep paused work paused; synchronization is not permission to resume it.
Keep provider, account_id, host_id and source_task_id stable for the source task. Keep source_run_id and run_number stable within an execution attempt; allocate a new run only for a real new attempt. sequence increases across the task, including new runs; version is the source version. Persist each immutable event payload, including event_id and reported_at, in the producer's durable outbox before sending. Retry the exact same payload after transport failure or receipt loss, without new IDs, timestamps or sequence numbers.
Use external_observations_list to discover existing observations and reporting capability. Missing tools, disabled capability or authorization failures are visible blockers, not permission to bypass the MCP connection. A disconnected local Runtime cannot persist new events that remain only in the cloud producer; if the producer has no durable storage, disclose that limitation instead of claiming an offline queue or automatic retries exist.
Distinguish prepared, pending sync, saved receipt and readback-confirmed sync. Only an actual external_tasks_report applied or duplicate receipt permits proceeding to confirmation. Read external_observations_get with the returned id and use external_observations_events (task_id, after, limit) to verify the event_id and original outcome=applied; paginate when needed. A duplicate receipt can refer to a previously rejected event and does not by itself prove application. out_of_order, stale_run and terminal_run mean the report did not update current state. A newer snapshot may supersede an applied event; describe the current state accurately rather than claiming the old state is current. Preserve unresolved events for reconciliation without renumbering them to defeat run fencing.
Send state=completed only for completed execution; the returned task_result=reported_complete still has acceptance_state=unknown. Attach available evidence and leave human acceptance to the user. Never claim the board was updated from a saved note, generated checklist or transport timeout alone.`;

export type BetterCodexMcpOptions = {
  reportingOnly?: boolean;
  runtimeClient?: McpRuntimeClient;
  boardHtml: string;
  requestRuntime?: typeof requestMcpRuntime;
  pollEvents?: typeof pollMcpRuntimeEvents;
  ensureRuntime?: () => Promise<unknown>;
};

const runtimeId = z.string().regex(/^[A-Za-z0-9_-]{8,200}$/);
const readInput = z.object({ path: z.string(), method: z.literal("GET").optional(), traceId: runtimeId.optional(), timeoutMs: z.number().finite().optional() }).strict();
const commandInput = z.object({ path: z.string(), method: z.enum(["POST", "PATCH", "DELETE"]), body: z.string().optional(), commandId: runtimeId, traceId: runtimeId.optional(), timeoutMs: z.number().finite().optional() }).strict();
const eventsInput = z.object({ cursor: z.string().regex(/^\d{1,16}$/).optional(), runtimeInstanceId: z.string().optional(), timeoutMs: z.number().finite().optional() }).strict();
const responseSchema = z.object({ status: z.number(), statusText: z.string(), headers: z.record(z.string(), z.string()), body: z.string() });
const eventsOutput = z.object({ runtimeInstanceId: z.string(), cursor: z.string().nullable(), events: z.array(z.object({ event: z.string(), id: z.string(), data: z.unknown() })) });
function toolFailure(error: unknown): CallToolResult {
  const message = error instanceof z.ZodError ? "mcp_schema_validation_failed" : error instanceof Error ? error.message : "mcp_tool_failed";
  return { isError: true, content: [{ type: "text", text: message }], ...(error instanceof McpRuntimeBridgeError ? { structuredContent: { diagnostics: error.diagnostics } } : {}) };
}
function toolResult(value: Record<string, unknown>): CallToolResult {
  return { content: [{ type: "text", text: JSON.stringify(value) }], structuredContent: value };
}

/** The protocol owns only MCP lifecycle. All business operations belong to the authenticated Runtime. */
export function createBetterCodexMcpServer(options: BetterCodexMcpOptions): McpServer {
  const client = options.runtimeClient ?? new McpRuntimeClient();
  const icons = betterCodexMcpIcons();
  const requestRuntime = options.requestRuntime ?? requestMcpRuntime;
  const pollEvents = options.pollEvents ?? pollMcpRuntimeEvents;
  const server = new McpServer({ name: betterCodexMcpName, version: coreVersion, icons }, { instructions: reportingInstructions,
    capabilities: options.reportingOnly ? { tools: {} } : { resources: { subscribe: true }, tools: {} } });
  // SDK 1.29 preserves serverInfo icons but omits tool icons from its list projection.
  // Decorate that public handler while retaining SDK schema generation and dispatch.
  const setRequestHandler = server.server.setRequestHandler.bind(server.server);
  server.server.setRequestHandler = (schema, handler) => setRequestHandler(schema, async (request, extra) => {
    const result = await handler(request, extra);
    if (request.method === "tools/list") {
      const listed = result as { tools?: Array<{ name: string }> };
      if (listed.tools) return { ...result, tools: listed.tools.map(tool => tool.name === betterCodexMcpTool ? { ...tool, icons } : tool) };
    }
    return result;
  });
  if (!options.reportingOnly) new OpenAIExtensions(server);
  let initialized = false; let closed = false;
  const subscriptions = new Set<string>(); let stopSubscription: (() => void) | undefined;
  const assertInitialized = () => {
    if (!initialized || closed) throw new McpError(ErrorCode.InvalidRequest, "mcp_not_initialized");
    if (process.env.BETTER_CODEX_SCHEDULER === "1") throw new Error("mcp_scheduler_access_denied");
  };
  const previousInitialized = server.server.oninitialized;
  server.server.oninitialized = () => { initialized = true; previousInitialized?.(); };
  const cleanup = () => { closed = true; subscriptions.clear(); stopSubscription?.(); stopSubscription = undefined; client.close(); };
  server.server.onclose = cleanup;
  const originalClose = server.close.bind(server);
  server.close = async () => { cleanup(); await originalClose(); };

  const register = (name: string, description: string, inputSchema: z.ZodObject, outputSchema: z.ZodObject,
    readOnlyHint: boolean, handler: (input: unknown) => Promise<Record<string, unknown>>, idempotentHint = true) => {
    server.registerTool(name, { description, inputSchema, outputSchema,
      annotations: { readOnlyHint, destructiveHint: false, idempotentHint, openWorldHint: false } }, async input => {
      try { assertInitialized(); return toolResult(await handler(input)); } catch (error) { return toolFailure(error); }
    });
  };
  register("external_observations_list", "List declared external task reports with freshness and reporting capability. These are not owned Issues.", emptyInput,
    externalCollectionSchema, true, async () => client.listExternalObservations());
  register("external_observations_get", "Read a declared external observation and its messages. Reported completion does not imply acceptance.", getTaskInput,
    externalDetailSchema, true, async input => client.getExternalObservation(input));
  register("external_tasks_report", "Report externally executed work using stable source_task_id, source_run_id/run_number and task-wide sequence. Persist the payload before sending; retry unchanged event_id, timestamp and source version. Confirm applied/duplicate receipts through external_observations_get and external_observations_events: duplicate may replay an ignored event. Caller cannot verify a creator, execute locally or accept completion. Opt-in local authorization is required.", reportExternalTaskInput,
    externalReportResultSchema, false, async input => client.reportExternalTask(input));
  register("external_observations_events", "Replay the persisted external task event journal after a receiver cursor. Includes ignored old-run reports; cursor survives Runtime restarts. No source task discovery or execution.", externalEventsInput,
    externalEventsSchema, true, async input => client.externalEvents(input));
  // A cloud reporting connection has no owned-task, App transport, or resource surface.
  if (options.reportingOnly) return server;

  register("tasks_list", "List Better Codex tasks. External observations are a separate collection.", listTasksInput,
    z.object({ tasks: z.array(taskSchema) }), true, async input => ({ tasks: await client.listTasks(input) }));
  register("tasks_get", "Read a Better Codex task by ID.", getTaskInput, z.object({ task: taskSchema }), true,
    async input => ({ task: await client.getTask(input) }));
  register("tasks_history", "Read Runtime-owned task runs, typed blockers, dependency acceptance and persisted events after a cursor. Historical unknown identities remain unknown.",taskHistoryInput,taskHistorySchema,true,async input=>client.taskHistory(input));
  register("tasks_create", "Create a persisted non-executing task. Reuse request_id for retries; does not assign an agent or enrich input.", createTaskInput,
    z.object({ task: taskSchema }), false, async input => ({ task: await client.createTask(input) }));
  register("tasks_update", "Update task content or same-project parent/dependencies using the current version. Dependencies require human acceptance before automatic dispatch. Cannot change execution, creator, status or acceptance. A bound task title may queue its existing title-sync command.", updateTaskInput,
    z.object({ task: taskSchema }), false, async input => ({ task: await client.updateTask(input) }), false);
  register("external_observations_report", "Submit a declared external report. Requires Runtime opt-in BETTER_CODEX_MCP_ALLOW_REPORTS=1 and existing loopback Bearer authorization; caller identity is unverified. Sequence/item_id fence replay.", reportExternalInput,
    externalReportResultSchema, false, async input => client.reportExternalObservation(input));
  register("board_snapshot", "Read a board snapshot of owned tasks and separate external observations.", listTasksInput,
    boardSnapshotSchema, true, async input => client.boardSnapshot(input));

  const appMetadata = { ui: { resourceUri: boardResourceUri }, "openai/ui": { entrypoints: [{ type: "global" }] }, "openai/outputTemplate": boardResourceUri };
  registerAppTool(server, betterCodexMcpTool, { title: "Better Codex", description: "Open Better Codex tasks, agents, projects and settings without starting injection or task execution.",
    inputSchema: emptyInput, outputSchema: boardSnapshotSchema, annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false }, _meta: appMetadata }, async () => {
    try {
      assertInitialized();
      await options.ensureRuntime?.();
      const [snapshot, appData] = await Promise.all([client.boardSnapshot(), client.boardAppInitialData()]);
      return { ...toolResult(snapshot), _meta: { ...appMetadata, ...appData } };
    } catch (error) { return toolFailure(error); }
  });
  registerAppTool(server, "board_api_request", { description: "Read display data for the board App. Only bounded GET routes; no execution or mutation forwarding.",
    inputSchema: boardApiInput, outputSchema: boardApiOutput, annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    _meta: { ui: { resourceUri: boardResourceUri, visibility: ["app"] } } }, async input => {
    try { assertInitialized(); return toolResult(await client.boardApiRequest(input)); } catch (error) { return toolFailure(error); }
  });
  const appOnly = { ui: { resourceUri: boardResourceUri, visibility: ["app"] as ("app" | "model")[] } };
  registerAppTool(server, "runtime_read", { description: "Read the local Better Codex Runtime for this App.", inputSchema: readInput, outputSchema: responseSchema,
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false }, _meta: appOnly }, async input => {
    try { assertInitialized(); return toolResult({ ...await requestRuntime({ ...readInput.parse(input), method: "GET" }) }); } catch (error) { return toolFailure(error); }
  });
  registerAppTool(server, "runtime_command", { description: "Submit an explicit user action from the Better Codex App with its durable command ID.", inputSchema: commandInput, outputSchema: responseSchema,
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false }, _meta: appOnly }, async input => {
    try { assertInitialized(); return toolResult({ ...await requestRuntime(commandInput.parse(input)) }); } catch (error) { return toolFailure(error); }
  });
  registerAppTool(server, "runtime_events", { description: "Read a bounded batch from the Runtime's existing event stream.", inputSchema: eventsInput, outputSchema: eventsOutput,
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false }, _meta: appOnly }, async input => {
    try { assertInitialized(); return toolResult({ ...await pollEvents(eventsInput.parse(input)) }); } catch (error) { return toolFailure(error); }
  });
  registerAppResource(server, "Better Codex Board", boardResourceUri, { title: "Better Codex", _meta: { ui: { prefersBorder: false, csp: { connectDomains: [], resourceDomains: [] } } } }, async uri => {
    assertInitialized();
    await options.ensureRuntime?.();
    const response = await requestRuntime({ path: "/api/ui/mcp", timeoutMs: 10000 });
    let html = options.boardHtml;
    if (response.status !== 404) {
      let rendered: Record<string, unknown>;
      try { rendered = JSON.parse(response.body); } catch { throw new McpError(ErrorCode.InternalError, "mcp_resource_invalid"); }
      if (response.status >= 400) throw new McpError(ErrorCode.InternalError, typeof rendered.error === "string" ? rendered.error : "mcp_resource_unavailable", rendered.diagnostics);
      if (typeof rendered.html !== "string" || !rendered.html.startsWith("<!doctype html>") || Buffer.byteLength(rendered.html) > 16 * 1024 * 1024) throw new McpError(ErrorCode.InternalError, "mcp_resource_invalid");
      html = rendered.html;
    }
    return { contents: [{ uri: uri.href, mimeType: RESOURCE_MIME_TYPE, text: html, _meta: { ui: { prefersBorder: false, csp: { connectDomains: [], resourceDomains: [] }, permissions: { microphone: {}, clipboardWrite: {} } } } }] };
  });
  server.registerResource("board_snapshot", boardSnapshotResourceUri, { description: "Read-only board JSON; resource subscriptions follow Runtime change events.", mimeType: "application/json" }, async uri => {
    assertInitialized(); return { contents: [{ uri: uri.href, mimeType: "application/json", text: JSON.stringify(await client.boardSnapshot()) }] };
  });
  server.server.setRequestHandler(SubscribeRequestSchema, async ({ params }) => {
    assertInitialized();
    if (params.uri !== boardSnapshotResourceUri) throw new McpError(ErrorCode.InvalidParams, "mcp_resource_not_subscribable");
    subscriptions.add(params.uri);
    stopSubscription ??= client.subscribe(() => {
      if (!closed && subscriptions.has(boardSnapshotResourceUri)) void server.server.sendResourceUpdated({ uri: boardSnapshotResourceUri }).catch(() => {});
    }, error => { process.stderr.write(`${JSON.stringify({ event: "mcp_subscription_failed", error: error.message })}\n`); });
    return {};
  });
  server.server.setRequestHandler(UnsubscribeRequestSchema, async ({ params }) => {
    assertInitialized(); subscriptions.delete(params.uri);
    if (!subscriptions.size) { stopSubscription?.(); stopSubscription = undefined; }
    return {};
  });
  return server;
}
