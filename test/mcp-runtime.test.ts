import assert from "node:assert/strict";
import { createServer } from "node:http";
import test from "node:test";
import { McpRuntimeBridgeError, pollMcpRuntimeEvents, requestMcpRuntime, type McpRuntimeDependencies } from "../src/mcp-runtime.js";
import type { RuntimeState } from "../src/runtime-state.js";

function runtime(overrides: Partial<RuntimeState> = {}): RuntimeState {
  return { pid: 123, port: 43210, instanceId: "runtime-a", version: "0.4.19", startedAt: "2026-10-02", processStartedAt: "2026-10-02", generation: 2, handoffUpdateId: null, handoffRecovery: false, handoffHostReplacement: false, ...overrides };
}

function dependencies(fetcher: typeof fetch, overrides: McpRuntimeDependencies = {}): McpRuntimeDependencies {
  return { readRuntimeState: () => runtime(), token: () => "server-only-secret", fetch: fetcher, diagnostic: () => {}, ...overrides };
}

test("MCP bridge resolves the current Runtime and keeps credentials server-side", async () => {
  let reads = 0;
  const calls: Array<{ url: string; init: RequestInit }> = [];
  const deps = dependencies(async (url, init) => {
    calls.push({ url: String(url), init: init! });
    return new Response('{"issues":[]}', { headers: { "content-type": "application/json", "set-cookie": "secret-session", authorization: "never-forward", "x-better-codex-trace-id": "trace-1234" } });
  }, { readRuntimeState: () => runtime({ port: 43210 + reads++, instanceId: `runtime-${reads}` }) });
  const first = await requestMcpRuntime({ path: "/api/issues?archived=1", traceId: "trace-1234" }, deps);
  await requestMcpRuntime({ path: "/api/bootstrap" }, deps);
  assert.equal(reads, 2);
  assert.deepEqual(calls.map(call => call.url), ["http://127.0.0.1:43210/api/issues?archived=1", "http://127.0.0.1:43211/api/bootstrap"]);
  assert.equal(new Headers(calls[0].init.headers).get("authorization"), "Bearer server-only-secret");
  assert.equal(calls[0].init.redirect, "error");
  assert.deepEqual(first.headers, { "content-type": "application/json", "x-better-codex-trace-id": "trace-1234" });
  assert.equal(JSON.stringify(first).includes("secret"), false);
});

test("MCP bridge exact route admission rejects controls and URL normalization escapes", async () => {
  let requests = 0;
  const deps = dependencies(async () => { requests++; return new Response("{}"); });
  for (const path of ["https://example.com/api/issues", "//example.com/api/issues", "/api/projects/../issues", "/api/projects/%2e%2e/issues", "/api/projects/%252e%252e/issues", "/api/issues/a%2fb", "/api/issues/a%5cb", "/api/issues\\a", "/api/issues#fragment", "/api/issues//a", "/api/issues/%", "/api/issues/"]) {
    const response = await requestMcpRuntime({ path }, deps);
    assert.equal(response.status, 400, path);
  }
  for (const [method, path] of [["POST", "/api/shutdown"], ["POST", "/api/update/commit"], ["POST", "/api/update/rollback"], ["POST", "/api/session-relay/poll"], ["POST", "/api/session-relay/commands/abc/complete"], ["GET", "/api/mockup/state"], ["GET", "/api/events"], ["POST", "/api/bootstrap"], ["PUT", "/api/issues/abc"], ["POST", "/api/issues/abc/start/extra"], ["GET", "/api/projects/abc/overview"]]) {
    assert.equal((await requestMcpRuntime({ path, method, commandId: "command-123" }, deps)).status, 403, path);
  }
  assert.equal(requests, 0);
});

test("MCP bridge preserves original idempotency IDs and bytes across repeated writes", async () => {
  const calls: RequestInit[] = [];
  const deps = dependencies(async (_url, init) => { calls.push(init!); return new Response('{"id":"issue-1"}', { status: 201 }); });
  const args = { path: "/api/issues", method: "post", body: '{"title":"  Exact bytes  "}', commandId: "command-123", traceId: "trace-1234" };
  await requestMcpRuntime(args, deps);
  await requestMcpRuntime(args, deps);
  for (const call of calls) {
    assert.equal(call.method, "POST");
    assert.equal(call.body, args.body);
    assert.equal(new Headers(call.headers).get("x-better-codex-command-id"), args.commandId);
    assert.equal(new Headers(call.headers).get("x-better-codex-request-id"), args.commandId);
    assert.equal(new Headers(call.headers).get("x-better-codex-trace-id"), args.traceId);
  }
  assert.equal((await requestMcpRuntime({ path: "/api/issues", method: "POST" }, deps)).status, 400);
  assert.equal((await requestMcpRuntime({ ...args, commandId: "unsafe\nvalue" }, deps)).status, 400);
  assert.equal((await requestMcpRuntime({ ...args, traceId: "unsafe\nvalue" }, deps)).status, 400);
  assert.equal((await requestMcpRuntime({ path: "/api/issues", body: "{}" }, deps)).status, 400);
  assert.equal(calls.length, 2);
});

test("MCP attachment uploads and issue replies use 30 MiB while ordinary writes use shared 2 MiB", async () => {
  let calls = 0;
  const deps = dependencies(async () => { calls++; return new Response("{}"); });
  const commandId = "command-123";
  const upload = "x".repeat(30 * 1024 * 1024);
  assert.equal((await requestMcpRuntime({ path: "/api/issues/attachments", method: "POST", body: upload, commandId }, deps)).status, 200);
  assert.equal((await requestMcpRuntime({ path: "/api/issues/attachments", method: "POST", body: `${upload}x`, commandId }, deps)).status, 413);
  assert.equal((await requestMcpRuntime({ path: "/api/issues/one/reply", method: "POST", body: "x".repeat(3 * 1024 * 1024), commandId }, deps)).status, 200);
  assert.equal((await requestMcpRuntime({ path: "/api/agents", method: "POST", body: "x".repeat(2 * 1024 * 1024 + 1), commandId }, deps)).status, 413);
  // Enforce bytes, including multi-byte text, rather than JavaScript string length.
  assert.equal((await requestMcpRuntime({ path: "/api/agents", method: "POST", body: "熊".repeat(1024 * 1024), commandId }, deps)).status, 413);
  assert.equal(calls, 2);
});

test("MCP UI service routes retain exact read and write methods", async () => {
  const deps = dependencies(async () => new Response("{}"));
  for (const path of ["/api/issues/one/conversation", "/api/issues/one/attachments/message/0", "/api/projects/one/semantics?schema_version=2", "/api/sessions/thread/workspace", "/api/account/usage/activity", "/api/runtime-update", "/readyz"]) {
    assert.equal((await requestMcpRuntime({ path }, deps)).status, 200, path);
  }
  for (const [method, path] of [["POST", "/api/issues/one/native-command"], ["POST", "/api/issues/one/regenerate-title"], ["PATCH", "/api/agents/default/avatar"], ["POST", "/api/system/directories/create"], ["DELETE", "/api/remote-access/sessions/one"], ["POST", "/api/runtime-update/install"], ["PATCH", "/api/scheduled-tasks/one"]]) {
    assert.equal((await requestMcpRuntime({ method, path, commandId: "command-123", body: {} }, deps)).status, 200, path);
  }
});

test("MCP transport errors carry Runtime identity without leaking underlying errors or credentials", async () => {
  const diagnostics: Record<string, unknown>[] = [];
  const deps = dependencies(async () => { throw new Error("server-only-secret private details"); }, { diagnostic: value => diagnostics.push(value) });
  const response = await requestMcpRuntime({ path: "/api/bootstrap" }, deps);
  assert.equal(response.status, 503);
  const body = JSON.parse(response.body);
  assert.equal(body.error, "mcp_runtime_transport_failed");
  assert.equal(body.diagnostics.runtime_instance_id, "runtime-a");
  assert.equal(body.diagnostics.runtime_port, 43210);
  assert.equal(JSON.stringify(diagnostics).includes("secret"), false);
  assert.equal((await requestMcpRuntime({ path: "/api/bootstrap" }, { ...deps, readRuntimeState: () => null })).status, 503);
  assert.equal((await requestMcpRuntime({ path: "/api/bootstrap" }, dependencies(async () => new Response("", { status: 302, headers: { location: "https://example.com" } })))).status, 502);
  const timed = await requestMcpRuntime({ path: "/api/bootstrap", timeoutMs: 5 }, dependencies(async (_url, init) => new Promise((_resolve, reject) => init!.signal!.addEventListener("abort", () => reject(new Error("abort")), { once: true }))));
  assert.equal(timed.status, 504);
});

function sse(chunks: string[], cancel?: () => void) {
  return new Response(new ReadableStream<Uint8Array>({
    start(controller) { for (const chunk of chunks) controller.enqueue(new TextEncoder().encode(chunk)); },
    cancel() { cancel?.(); },
  }), { headers: { "content-type": "text/event-stream; charset=utf-8" } });
}

test("MCP event polling reads fragmented SSE and closes its bounded stream", async () => {
  let cancelled = false;
  let request: RequestInit | undefined;
  const deps = dependencies(async (_url, init) => {
    request = init;
    return sse(["id: 8\r\nevent: ready\r\ndata: {\"revision\":8}\r", "\n\r\nid: 9\nevent: change\ndata: {\"revision\":9}\n\n: heartbeat\n\n"], () => { cancelled = true; });
  });
  const result = await pollMcpRuntimeEvents({ cursor: "7", runtimeInstanceId: "runtime-a", timeoutMs: 15 }, deps);
  assert.equal(new Headers(request!.headers).get("last-event-id"), "7");
  assert.equal(new Headers(request!.headers).get("authorization"), "Bearer server-only-secret");
  assert.equal(result.cursor, "9");
  assert.deepEqual(result.events, [{ event: "ready", id: "8", data: { revision: 8 } }, { event: "change", id: "9", data: { revision: 9 } }]);
  assert.equal(cancelled, true);
  assert.equal(request!.signal!.aborted, true);
});

test("MCP event cursors reset across Runtime instances and replay server reset events", async () => {
  let lastEventId: string | null = "unset";
  const deps = dependencies(async (_url, init) => {
    lastEventId = new Headers(init!.headers).get("last-event-id");
    return sse(["id: 0\nevent: ready\ndata: {\"revision\":0}\n\n"]);
  });
  const result = await pollMcpRuntimeEvents({ cursor: "99", runtimeInstanceId: "runtime-before", timeoutMs: 5 }, deps);
  assert.equal(lastEventId, null);
  assert.equal(result.runtimeInstanceId, "runtime-a");
  assert.equal(result.cursor, "0");
  assert.equal(result.events[0].event, "reset");
  await pollMcpRuntimeEvents({ cursor: "99", timeoutMs: 5 }, deps);
  assert.equal(lastEventId, null, "an unscoped cursor cannot be forwarded to a different Runtime");
  const reset = await pollMcpRuntimeEvents({ runtimeInstanceId: "runtime-a", cursor: "99", timeoutMs: 5 }, dependencies(async () => sse(["id: 3\nevent: reset\ndata: {\"revision\":3}\n\n"])));
  assert.equal(reset.cursor, "3");
  assert.deepEqual(reset.events, [{ event: "reset", id: "3", data: { revision: 3 } }]);
});

test("MCP event failures remain structured and close malformed streams", async () => {
  await assert.rejects(pollMcpRuntimeEvents({}, dependencies(async () => new Response("unauthorized", { status: 401 }))), error => error instanceof McpRuntimeBridgeError && error.status === 401 && error.diagnostics.runtime_instance_id === "runtime-a");
  await assert.rejects(pollMcpRuntimeEvents({ cursor: "invalid" }, dependencies(async () => sse([]))), error => error instanceof McpRuntimeBridgeError && error.status === 400);
  let cancelled = false;
  await assert.rejects(pollMcpRuntimeEvents({}, dependencies(async () => sse(["id: invalid\nevent: change\ndata: {}\n\n"], () => { cancelled = true; }))), error => error instanceof McpRuntimeBridgeError && error.code === "mcp_runtime_event_cursor_invalid");
  assert.equal(cancelled, true);
});

test("MCP polling releases a real Runtime SSE connection on deadline", async () => {
  let closed = false;
  const server = createServer((request, response) => {
    assert.equal(request.headers.authorization, "Bearer server-only-secret");
    response.writeHead(200, { "content-type": "text/event-stream" });
    response.write("id: 1\nevent: ready\ndata: {\"revision\":1}\n\n");
    request.once("close", () => { closed = true; });
  });
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  try {
    const address = server.address();
    assert(address && typeof address === "object");
    const result = await pollMcpRuntimeEvents({ timeoutMs: 80 }, dependencies(fetch, { readRuntimeState: () => runtime({ port: address.port }) }));
    assert.equal(result.cursor, "1");
    for (let attempt = 0; attempt < 20 && !closed; attempt++) await new Promise(resolve => setTimeout(resolve, 5));
    assert.equal(closed, true);
  } finally {
    server.closeAllConnections();
    await new Promise<void>(resolve => server.close(() => resolve()));
  }
});
