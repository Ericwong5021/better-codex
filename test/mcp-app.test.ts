import assert from "node:assert/strict";
import test from "node:test";
import { Script } from "node:vm";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createBetterCodexMcpServer, boardResourceUri } from "../src/mcp-protocol.js";
import { betterCodexMcpHostHtml } from "../src/mcp-host.js";

async function connected(requestRuntime: Parameters<typeof createBetterCodexMcpServer>[0]["requestRuntime"], startRuntime?: () => Promise<{ ready: true }>) {
  let starts = 0;
  const server = createBetterCodexMcpServer({ boardHtml: betterCodexMcpHostHtml(), requestRuntime, startRuntime, ensureRuntime: async () => { starts++; } });
  const client = new Client({ name: "mcp-app-test", version: "1" });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await server.connect(serverTransport); await client.connect(clientTransport);
  return { client, starts: () => starts, close: async () => { await client.close(); await server.close(); } };
}

test("MCP resource contains the complete shared app without injection or local credentials", async () => {
  const fixture = await connected(async () => ({ status: 404, statusText: "Not Found", headers: {}, body: "{}" }));
  try {
    const resource = (await fixture.client.readResource({ uri: boardResourceUri })).contents[0] as any;
    assert.match(resource.text, /data-better-codex-web-surface/);
    assert.match(resource.text, /BetterCodexUI\.install/);
    assert.match(resource.text, /runtime_command/); assert.match(resource.text, /runtime_events/);
    assert.doesNotMatch(resource.text, /ui\/message|sendConversationMessage|data-dots-setup-send/);
    assert.doesNotMatch(resource.text, /BetterCodexInjected|board_launch|\/sidebar/);
    assert.doesNotMatch(resource.text, /<script[^>]+src=|<link[^>]+(?:stylesheet|manifest)/);
    for (const script of resource.text.matchAll(/<script>([\s\S]*?)<\/script>/g)) new Script(script[1]);
    assert.deepEqual(resource._meta.ui.csp.connectDomains, []);
    assert.equal(resource._meta.ui.prefersBorder, false);
    assert.equal(fixture.starts(), 1);
    const tools = (await fixture.client.listTools()).tools;
    assert.equal(tools.some(tool => tool.name === "board_launch" || tool.name === "sidebar"), false);
    assert.equal((await fixture.client.listResources()).resources.some(resource => resource.uri.includes("launcher")), false);
  } finally { await fixture.close(); }
});

test("resource reads use the active Runtime renderer and expose dependency failures", async () => {
  const html = "<!doctype html><html>Current Runtime renderer</html>";
  let failing = false;
  const fixture = await connected(async args => {
    assert.equal(args.path, "/api/ui/mcp");
    return failing ? { status: 503, statusText: "Unavailable", headers: {}, body: JSON.stringify({ error: "runtime_unavailable", diagnostics: { runtime_instance_id: "failed" } }) }
      : { status: 200, statusText: "OK", headers: {}, body: JSON.stringify({ html }) };
  });
  try {
    assert.equal((await fixture.client.readResource({ uri: boardResourceUri })).contents[0].text, html);
    failing = true;
    await assert.rejects(fixture.client.readResource({ uri: boardResourceUri }), /runtime_unavailable/);
  } finally { await fixture.close(); }
});

test("app-only transport rejects a write disguised as a read", async () => {
  let forwarded = false;
  const fixture = await connected(async () => { forwarded = true; throw new Error("unexpected"); });
  try {
    const reply = await fixture.client.callTool({ name: "runtime_read", arguments: { path: "/api/issues", method: "POST" } });
    assert.equal(reply.isError, true); assert.equal(forwarded, false);
    const tools = (await fixture.client.listTools()).tools;
    for (const name of ["runtime_read", "runtime_command", "runtime_events", "runtime_start"]) assert.deepEqual((tools.find(tool => tool.name === name)?._meta?.ui as any).visibility, ["app"]);
  } finally { await fixture.close(); }
});

test("App startup is an explicit bounded action and surfaces failures before readiness", async () => {
  let starts = 0;
  const fixture = await connected(async () => { throw new Error("runtime_unavailable"); }, async () => {
    if (++starts === 1) throw new Error("database_not_ready");
    return { ready: true };
  });
  try {
    await fixture.client.callTool({ name: "runtime_read", arguments: { path: "/api/bootstrap" } });
    assert.equal(starts, 0, "failed reads must not undo an intentional service exit");
    const injected = await fixture.client.callTool({ name: "runtime_start", arguments: { command: "service restart" } });
    assert.equal(injected.isError, true);
    assert.equal(starts, 0, "startup cannot accept executable parameters");
    const failed = await fixture.client.callTool({ name: "runtime_start", arguments: {} });
    assert.equal(failed.isError, true);
    assert.match(JSON.stringify(failed.content), /database_not_ready/);
    assert.equal(failed.structuredContent?.ready, undefined);
    const ready = await fixture.client.callTool({ name: "runtime_start", arguments: {} });
    assert.notEqual(ready.isError, true);
    assert.deepEqual(ready.structuredContent, { ready: true });
    assert.equal(starts, 2);
    const tool = (await fixture.client.listTools()).tools.find(tool => tool.name === "runtime_start");
    assert.equal(tool?.annotations?.readOnlyHint, false);
    assert.equal(tool?.annotations?.destructiveHint, false);
  } finally { await fixture.close(); }
});

test("an App without local startup capability reports it as unavailable", async () => {
  const fixture = await connected(async () => { throw new Error("must_not_forward"); });
  try {
    const result = await fixture.client.callTool({ name: "runtime_start", arguments: {} });
    assert.equal(result.isError, true);
    assert.match(JSON.stringify(result.content), /runtime_start_unavailable/);
  } finally { await fixture.close(); }
});
