import assert from "node:assert/strict";
import test from "node:test";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { ResourceUpdatedNotificationSchema } from "@modelcontextprotocol/sdk/types.js";
import { createBetterCodexMcpServer, boardSnapshotResourceUri, boardResourceUri } from "../src/mcp-protocol.js";
import { McpRuntimeClient, sanitizeMcpAppData } from "../src/mcp-runtime-client.js";
import { startRuntimeFixture } from "./e2e/fixtures/runtime.js";

async function connected(baseUrl: string, token: string, reportingOnly = false) {
  const server = createBetterCodexMcpServer({ runtimeClient: new McpRuntimeClient(() => ({ baseUrl, token })),
    boardHtml: "<!doctype html><title>Isolated MCP board</title>", reportingOnly });
  const client = new Client({ name: "isolated-sdk-test", version: "1.0.0" }, { capabilities: {} });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await server.connect(serverTransport); await client.connect(clientTransport);
  return { server, client, close: async () => { await client.close(); await server.close(); } };
}
const structured = (result: Awaited<ReturnType<Client["callTool"]>>) => {
  assert.ok(!result.isError, JSON.stringify(result)); return result.structuredContent as Record<string, any>;
};

test("official SDK negotiates tools, strict safe writes, replay, versions and read-only MCP App", { timeout: 45_000 }, async () => {
  const runtime = await startRuntimeFixture();
  const mcp = await connected(runtime.baseUrl, runtime.token);
  const headers = { authorization: `Bearer ${runtime.token}`, "content-type": "application/json" };
  try {
    assert.equal(mcp.client.getServerVersion()?.name, "better-codex");
    assert.equal(mcp.client.getServerCapabilities()?.resources?.subscribe, true);
    const tools = (await mcp.client.listTools()).tools;
    for (const name of ["board", "board_snapshot", "tasks_list", "tasks_get", "tasks_create", "tasks_update", "tasks_history", "external_observations_list", "external_observations_get", "external_observations_report", "external_tasks_report", "external_observations_events", "board_api_request"]) assert.ok(tools.some(tool => tool.name === name), name);
    assert.equal(tools.find(tool => tool.name === "tasks_create")?.inputSchema.additionalProperties, false);
    assert.equal(tools.find(tool => tool.name === "board")?.annotations?.readOnlyHint, true);
    assert.equal(tools.find(tool => tool.name === "tasks_update")?.annotations?.idempotentHint, false);
    const projectResponse = await fetch(`${runtime.baseUrl}/api/projects/ensure`, { method: "POST", headers, body: JSON.stringify({ external_id: "mcp-fixture", name: "MCP fixture", workspace_path: runtime.workspacePath }) });
    assert.equal(projectResponse.status, 200); const project = await projectResponse.json() as { id: string };
    const input = { request_id: "mcp-test-create-001", project_id: project.id, title: "Persist without execution", description: "MCP fixture", labels: ["fixture"] };
    const first = structured(await mcp.client.callTool({ name: "tasks_create", arguments: input })).task;
    assert.equal(first.agent_enabled, false); assert.equal(first.thread_id, null); assert.equal(first.status, "todo");
    assert.ok(!("workspace_path" in first)); assert.ok(!("creator_user_id" in first));
    const replay = structured(await mcp.client.callTool({ name: "tasks_create", arguments: input })).task;
    assert.equal(replay.id, first.id);
    assert.equal((await mcp.client.callTool({ name: "tasks_create", arguments: { ...input, title: "Different immutable request" } })).isError, true);
    for (const forbidden of [{ agent_enabled: true }, { ai_enrich: true }, { thread_id: "external-thread" }, { status: "done" }, { creator_user_id: "pretend-owner" }]) {
      assert.equal((await mcp.client.callTool({ name: "tasks_create", arguments: { ...input, request_id: "mcp-rejected-create", ...forbidden } })).isError, true);
    }
    const updated = structured(await mcp.client.callTool({ name: "tasks_update", arguments: { id: first.id, version: first.version, title: "Updated safely", pinned: true } })).task;
    assert.equal(updated.version, first.version + 1); assert.equal(updated.title, "Updated safely");
    const stale = await mcp.client.callTool({ name: "tasks_update", arguments: { id: first.id, version: first.version, title: "Stale change" } });
    assert.equal(stale.isError, true); assert.match(JSON.stringify(stale.content), /version_conflict/);
    for (const forbidden of [{ status: "done" }, { agent_id: "agent" }, { pending_actor: "agent" }, { acceptance_state: "accepted" }, { session_owned: true }]) {
      assert.equal((await mcp.client.callTool({ name: "tasks_update", arguments: { id: first.id, version: updated.version, ...forbidden } })).isError, true);
    }
    assert.equal(structured(await mcp.client.callTool({ name: "tasks_get", arguments: { id: first.id } })).task.title, "Updated safely");
    assert.equal(structured(await mcp.client.callTool({ name: "tasks_list", arguments: { project_id: project.id } })).tasks.length, 1);
    const board = structured(await mcp.client.callTool({ name: "board", arguments: {} }));
    assert.equal(board.tasks.length, 1); assert.deepEqual(board.external_observations, []); assert.equal(tools.some(tool => tool.name === "board_launch"), false);
    const appRead = structured(await mcp.client.callTool({ name: "board_api_request", arguments: { path: "/api/issues" } }));
    assert.equal(appRead.data.length, 1); assert.ok(!("workspace_path" in appRead.data[0]));
    assert.equal((await mcp.client.callTool({ name: "board_api_request", arguments: { path: "/api/issues", method: "POST" } })).isError, true);
    assert.equal((await mcp.client.callTool({ name: "board_api_request", arguments: { path: "/api/shutdown" } })).isError, true);
    assert.equal((await mcp.client.callTool({ name: "board_api_request", arguments: { path: "/api/issues?token=forbidden" } })).isError, true);
    const unauthorized = await connected(runtime.baseUrl, `${runtime.token}-wrong`);
    try { assert.equal((await unauthorized.client.callTool({ name: "tasks_list", arguments: {} })).isError, true); }
    finally { await unauthorized.close(); }
    const resources = (await mcp.client.listResources()).resources;
    assert.ok(resources.some(resource => resource.uri === boardResourceUri));
    const snapshot = await mcp.client.readResource({ uri: boardSnapshotResourceUri });
    assert.equal(JSON.parse(String(snapshot.contents[0].text)).tasks[0].id, first.id);
    assert.equal(resources.some(resource => resource.uri.includes("launcher")), false);
  } finally { await mcp.close(); await runtime.stop(); }
});

const report = () => ({ schema_version: 1, provider: "dot", account_id: "declared-account", host_id: "declared-host", thread_id: "external-mcp-thread", sequence: 1,
  item_id: "external-start-item", reported_at: new Date().toISOString(), state: "running", title: "External MCP fixture", description: "Declared report", project_id: null,
  parent_thread_id: null, creator_name: "dot", message: "Started" });

test("Dot reporting connection exposes only reporting and verifies replay without granting owned execution", { timeout: 45_000 }, async () => {
  const runtime = await startRuntimeFixture({ mcpAllowReports: true });
  let mcp = await connected(runtime.baseUrl, runtime.token, true);
  try {
    assert.equal(mcp.client.getServerCapabilities()?.resources, undefined);
    assert.ok(mcp.client.getInstructions()?.includes("external_tasks_report"));
    const tools = (await mcp.client.listTools()).tools;
    assert.deepEqual(tools.map(tool => tool.name).sort(), ["external_observations_events", "external_observations_get", "external_observations_list", "external_tasks_report"]);
    assert.equal(tools.find(tool => tool.name === "external_tasks_report")?.annotations?.idempotentHint, true);
    for (const name of ["runtime_command", "runtime_read", "runtime_events", "tasks_create", "tasks_update", "board", "board_api_request", "external_observations_report"]) {
      const result = await mcp.client.callTool({ name, arguments: {} });
      assert.equal(result.isError, true, name);
      assert.match(JSON.stringify(result.content), /not found/i);
    }
    await assert.rejects(mcp.client.listResources());
    await assert.rejects(mcp.client.readResource({ uri: boardSnapshotResourceUri }));
    const input = { schema_version: 2, provider: "dot", account_id: "declared-account", host_id: "stable-producer",
      source_task_id: "dot-reporting-fixture", source_run_id: "attempt-1", run_number: 1,
      sequence: 1, event_id: "dot-start", version: 1, reported_at: new Date().toISOString(), state: "running",
      title: "Dot fixture", description: "", project_id: null };
    const started = structured(await mcp.client.callTool({ name: "external_tasks_report", arguments: input }));
    assert.equal(started.status, "applied");
    await mcp.close();
    mcp = await connected(runtime.baseUrl, runtime.token, true);
    const replay = structured(await mcp.client.callTool({ name: "external_tasks_report", arguments: input }));
    assert.equal(replay.status, "duplicate"); assert.equal(replay.id, started.id);
    const conflict = await mcp.client.callTool({ name: "external_tasks_report", arguments: { ...input, title: "Changed immutable payload" } });
    assert.equal(conflict.isError, true); assert.match(JSON.stringify(conflict.content), /external_event_conflict/);
    const paused = { ...input, sequence: 2, version: 2, event_id: "dot-paused", state: "idle", message: "Paused by user; do not resume" };
    assert.equal(structured(await mcp.client.callTool({ name: "external_tasks_report", arguments: paused })).status, "applied");
    const detail = structured(await mcp.client.callTool({ name: "external_observations_get", arguments: { id: started.id } }));
    assert.equal(detail.observation.source_run_id, input.source_run_id);
    assert.equal(detail.observation.reported_execution_state, "idle");
    assert.equal(detail.observation.acceptance_state, "unknown");
    assert.equal(detail.runs.length, 1);
    const stale = { ...input, event_id: "dot-out-of-order" };
    assert.equal(structured(await mcp.client.callTool({ name: "external_tasks_report", arguments: stale })).status, "out_of_order");
    assert.equal(structured(await mcp.client.callTool({ name: "external_tasks_report", arguments: stale })).status, "duplicate");
    const events = structured(await mcp.client.callTool({ name: "external_observations_events", arguments: { task_id: started.id, after: 0 } })).events;
    assert.deepEqual(events.map((event: any) => [event.event_id, event.outcome]), [["dot-start", "applied"], ["dot-paused", "applied"], ["dot-out-of-order", "out_of_order"]]);
    const owned = await fetch(`${runtime.baseUrl}/api/issues`, { headers: { authorization: `Bearer ${runtime.token}` } });
    assert.equal(owned.status, 200); assert.deepEqual(await owned.json(), []);
  } finally { await mcp.close(); await runtime.stop(); }
});

test("SDK exposes v2 run fencing and persistent replay, owned dependencies and Runtime creator provenance",{timeout:45_000},async()=>{
  const runtime=await startRuntimeFixture({mcpAllowReports:true}),mcp=await connected(runtime.baseUrl,runtime.token);
  const headers={authorization:`Bearer ${runtime.token}`,"content-type":"application/json"};
  try{
    const input={schema_version:2,provider:"codex",account_id:"declared",host_id:"isolated-sdk",source_task_id:"stable-fixture-task",source_run_id:"run-1",run_number:1,
      sequence:1,event_id:"v2-start",version:1,reported_at:new Date().toISOString(),state:"running",title:"V2 fixture",description:"",project_id:null,thread_id:null};
    const started=structured(await mcp.client.callTool({name:"external_tasks_report",arguments:input}));assert.equal(started.observation.thread_id,null);
    const completed=structured(await mcp.client.callTool({name:"external_tasks_report",arguments:{...input,sequence:2,version:2,event_id:"v2-complete",state:"completed",summary:{text:"Awaiting acceptance",evidence:["fixture log"]}}}));
    assert.equal(completed.observation.acceptance_state,"unknown");
    const retry={...input,source_run_id:"run-2",run_number:2,sequence:3,version:3,event_id:"v2-retry"};
    structured(await mcp.client.callTool({name:"external_tasks_report",arguments:retry}));
    const late=structured(await mcp.client.callTool({name:"external_tasks_report",arguments:{...input,sequence:4,version:4,event_id:"v2-late",state:"failed"}}));assert.equal(late.status,"stale_run");assert.equal(late.observation.source_run_id,"run-2");
    const first=structured(await mcp.client.callTool({name:"external_observations_events",arguments:{after:0,limit:2}}));assert.equal(first.has_more,true);
    const next=structured(await mcp.client.callTool({name:"external_observations_events",arguments:{after:first.next_cursor,limit:2}}));assert.equal(next.events.at(-1).outcome,"stale_run");
    assert.equal(structured(await mcp.client.callTool({name:"external_observations_get",arguments:{id:started.id}})).runs.length,2);
    assert.equal((await mcp.client.callTool({name:"external_tasks_report",arguments:{...retry,creator:{verification:"verified"}}})).isError,true);
    assert.equal(structured(await mcp.client.callTool({name:"tasks_list",arguments:{}})).tasks.length,0);
    const projects=await (await fetch(`${runtime.baseUrl}/api/projects`,{headers})).json() as Array<{id:string}>;
    const parent=structured(await mcp.client.callTool({name:"tasks_create",arguments:{request_id:"parent-fixture-id",project_id:projects[0].id,title:"Prerequisite"}})).task;
    const child=structured(await mcp.client.callTool({name:"tasks_create",arguments:{request_id:"child-fixture-id",project_id:projects[0].id,title:"Dependent",parent_issue_id:parent.id,depends_on_issue_ids:[parent.id]}})).task;
    const history=structured(await mcp.client.callTool({name:"tasks_history",arguments:{id:child.id}}));assert.equal(history.blocker.kind,"dependency");assert.equal(history.runs.length,0);
    assert.equal(history.creator.source=== "runtime_user_context"||history.creator.source==="unknown",true);
    assert.equal((await mcp.client.callTool({name:"tasks_update",arguments:{id:parent.id,version:parent.version,depends_on_issue_ids:[child.id]}})).isError,true);
    assert.equal((await mcp.client.callTool({name:"tasks_update",arguments:{id:parent.id,version:parent.version,status:"done"}})).isError,true);
    const accepted=await fetch(`${runtime.baseUrl}/api/issues/${parent.id}`,{method:"PATCH",headers,body:JSON.stringify({version:parent.version,status:"done"})});assert.equal(accepted.status,200);
    const ready=structured(await mcp.client.callTool({name:"tasks_history",arguments:{id:child.id}}));assert.equal(ready.blocker,null);assert.equal(ready.dependencies[0].accepted,true);
    const app=structured(await mcp.client.callTool({name:"board_api_request",arguments:{path:`/api/issues/${child.id}/history`}}));assert.equal(app.data.relationships.parent_issue_id,parent.id);
  }finally{await mcp.close();await runtime.stop();}
});

test("MCP report authorization is Runtime opt-in; replay remains separate from owned Issues and acceptance", { timeout: 45_000 }, async () => {
  const disabledRuntime = await startRuntimeFixture(); const disabled = await connected(disabledRuntime.baseUrl, disabledRuntime.token);
  try {
    const result = await disabled.client.callTool({ name: "external_observations_report", arguments: report() });
    assert.equal(result.isError, true); assert.match(JSON.stringify(result.content), /external_reporting_not_enabled/);
  } finally { await disabled.close(); await disabledRuntime.stop(); }
  const runtime = await startRuntimeFixture({ mcpAllowReports: true }); const mcp = await connected(runtime.baseUrl, runtime.token);
  try {
    const input = { ...report(), creator_name: null };
    const first = structured(await mcp.client.callTool({ name: "external_observations_report", arguments: input }));
    assert.equal(first.status, "applied"); assert.equal(first.observation.creator.verification, "unknown"); assert.equal(first.observation.creator.avatar, null);
    assert.equal(first.observation.creator.name, null); assert.equal(first.observation.source.channel, "mcp");
    assert.equal(structured(await mcp.client.callTool({ name: "external_observations_report", arguments: input })).status, "duplicate");
    const completed = structured(await mcp.client.callTool({ name: "external_observations_report", arguments: { ...input, sequence: 2, item_id: "external-complete-item", state: "completed", message: "Reported result" } }));
    assert.equal(completed.observation.task_result, "reported_complete"); assert.equal(completed.observation.acceptance_state, "unknown");
    for (const forged of [{ verification: "verified" }, { creator: { avatar: "https://invalid.example/avatar.png" } }, { acceptance_state: "accepted" }, { agent_enabled: true }]) {
      assert.equal((await mcp.client.callTool({ name: "external_observations_report", arguments: { ...input, ...forged } })).isError, true);
    }
    assert.equal(structured(await mcp.client.callTool({ name: "external_observations_get", arguments: { id: first.id } })).messages.length, 2);
    const collection = structured(await mcp.client.callTool({ name: "external_observations_list", arguments: {} }));
    assert.equal(collection.observations.length, 1); assert.equal(collection.capability.mode, "mcp_reporting"); assert.equal(collection.capability.enabled, true);
    assert.deepEqual(structured(await mcp.client.callTool({ name: "tasks_list", arguments: {} })).tasks, []);
    const board = structured(await mcp.client.callTool({ name: "board_snapshot", arguments: {} }));
    assert.deepEqual(board.tasks, []); assert.equal(board.external_observations[0].id, first.id);
  } finally { await mcp.close(); await runtime.stop(); }
});

test("SDK subscriptions notify Runtime changes, unsubscribe and close cleanly", { timeout: 30_000 }, async () => {
  const runtime = await startRuntimeFixture({ mcpAllowReports: true }); const mcp = await connected(runtime.baseUrl, runtime.token);
  const notifications: string[] = [];
  mcp.client.setNotificationHandler(ResourceUpdatedNotificationSchema, notification => { notifications.push(notification.params.uri); });
  try {
    await mcp.client.subscribeResource({ uri: boardSnapshotResourceUri });
    await new Promise(resolve => setTimeout(resolve, 120));
    structured(await mcp.client.callTool({ name: "external_observations_report", arguments: report() }));
    const deadline = Date.now() + 3000;
    while (!notifications.length && Date.now() < deadline) await new Promise(resolve => setTimeout(resolve, 20));
    assert.ok(notifications.includes(boardSnapshotResourceUri));
    await mcp.client.unsubscribeResource({ uri: boardSnapshotResourceUri });
    await new Promise(resolve => setTimeout(resolve, 80)); const count = notifications.length;
    structured(await mcp.client.callTool({ name: "external_observations_report", arguments: { ...report(), sequence: 2, item_id: "second-item" } }));
    await new Promise(resolve => setTimeout(resolve, 120)); assert.equal(notifications.length, count);
    await assert.rejects(mcp.client.subscribeResource({ uri: boardResourceUri }), /not_subscribable/);
  } finally { await mcp.close(); await runtime.stop(); }
});

test("MCP rejects unavailable auth and evaluator access without creating credentials", async () => {
  const previous = process.env.BETTER_CODEX_SCHEDULER;
  process.env.BETTER_CODEX_SCHEDULER = "1";
  try { assert.throws(() => new McpRuntimeClient(), /mcp_scheduler_access_denied/); }
  finally { if (previous === undefined) delete process.env.BETTER_CODEX_SCHEDULER; else process.env.BETTER_CODEX_SCHEDULER = previous; }
  const remote = new McpRuntimeClient(() => ({ baseUrl: "https://remote.invalid", token: "fixture" }));
  await assert.rejects(remote.listTasks(), /connection_invalid/); remote.close();
  assert.deepEqual(sanitizeMcpAppData({ token: "secret", workspace_path: "/private", root_paths: ["/private"], instructions: "system instructions", transcript: [{ text: "private" }], total_tokens: 100,
    nested: { authorization: "Bearer secret", title: "Visible", path: "/private" } }), { total_tokens: 100, nested: { title: "Visible" } });
});

test("SDK negotiates supported protocol versions and denies operations before initialized", async () => {
  const server = createBetterCodexMcpServer({ runtimeClient: new McpRuntimeClient(() => { throw new Error("must_not_contact_runtime"); }), boardHtml: "fixture" });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const messages: any[] = []; clientTransport.onmessage = message => { messages.push(message); };
  await server.connect(serverTransport); await clientTransport.start();
  const request = async (message: any) => {
    await clientTransport.send(message);
    const deadline = Date.now() + 1000;
    while (!messages.length && Date.now() < deadline) await new Promise(resolve => setTimeout(resolve, 1));
    assert.ok(messages.length); return messages.shift();
  };
  try {
    const before = await request({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "tasks_list", arguments: {} } });
    assert.equal(before.result.isError, true); assert.match(JSON.stringify(before.result), /mcp_not_initialized/);
    const initialized = await request({ jsonrpc: "2.0", id: 2, method: "initialize", params: { protocolVersion: "1999-01-01", capabilities: {}, clientInfo: { name: "raw-sdk-fixture", version: "1.0.0" } } });
    assert.notEqual(initialized.result.protocolVersion, "1999-01-01");
    assert.equal(typeof initialized.result.instructions, "string");
    assert.ok(initialized.result.instructions.includes("external_tasks_report"));
    const pending = await request({ jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "tasks_list", arguments: {} } });
    assert.match(JSON.stringify(pending.result), /mcp_not_initialized/);
    await clientTransport.send({ jsonrpc: "2.0", method: "notifications/initialized", params: {} });
    const ready = await request({ jsonrpc: "2.0", id: 4, method: "tools/call", params: { name: "tasks_list", arguments: {} } });
    assert.match(JSON.stringify(ready.result), /must_not_contact_runtime/);
  } finally { await server.close(); await clientTransport.close(); }
});

test("real stdio CLI uses the official SDK without starting Runtime or creating auth", { timeout: 20_000 }, async () => {
  const home = mkdtempSync(join(tmpdir(), "better-codex-mcp-stdio-"));
  const transport = new StdioClientTransport({ command: process.execPath, args: ["--import", "tsx", "src/cli.ts", "mcp"], cwd: process.cwd(),
    env: { ...Object.fromEntries(Object.entries(process.env).filter((entry): entry is [string, string] => entry[1] !== undefined)),
      BETTER_CODEX_HOME: home, BETTER_CODEX_PEER_HOME: home, BETTER_CODEX_PROFILE: "development", CODEX_HOME: join(home, "codex"), BETTER_CODEX_TOKEN: "", BETTER_CODEX_SCHEDULER: "" }, stderr: "pipe" });
  const client = new Client({ name: "real-stdio-sdk-test", version: "1.0.0" });
  try {
    await client.connect(transport);
    assert.equal(client.getServerVersion()?.name, "better-codex");
    assert.ok((await client.listTools()).tools.some(tool => tool.name === "tasks_create"));
    assert.ok((await client.listResources()).resources.some(resource => resource.uri === boardResourceUri));
    const unavailable = await client.callTool({ name: "tasks_list", arguments: {} });
    assert.equal(unavailable.isError, true); assert.match(JSON.stringify(unavailable.content), /mcp_runtime_unavailable/);
    assert.equal(existsSync(join(home, "run", "token")), false);
    assert.equal(existsSync(join(home, "run", "runtime.json")), false);
  } finally { await client.close(); await transport.close(); rmSync(home, { recursive: true, force: true }); }
});
