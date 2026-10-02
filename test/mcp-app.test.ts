import assert from "node:assert/strict";
import test from "node:test";
import { Script } from "node:vm";
import { handleMcpAppRequest, type McpAppServices } from "../src/mcp-app.js";
import { betterCodexMcpPageRoute, betterCodexMcpRoute, betterCodexMcpResourceUri } from "../src/mcp-contract.js";

const services: McpAppServices = { ensureRuntime: async () => {}, launchSidebar: async () => {}, requestRuntime: async () => ({ status: 404, statusText: "Not Found", headers: {}, body: "{}" }) };
const request = (method: string, params = {}) => ({ jsonrpc: "2.0", id: 1, method, params });

test("the native board opens shared UI without activating desktop injection", async () => {
  let launches = 0;
  let starts = 0;
  const bootstrap = { issues: [], projects: [], agents: [] };
  const reply = await handleMcpAppRequest(request("tools/call", { name: "board", arguments: {} }), {
    ensureRuntime: async () => { starts++; }, launchSidebar: async () => { launches++; },
    requestRuntime: async args => {
      assert.equal(args.path, "/api/bootstrap");
      return { status: 200, statusText: "OK", headers: {}, body: JSON.stringify(bootstrap) };
    },
  }) as any;
  assert.equal(starts, 1);
  assert.equal(launches, 0);
  assert.deepEqual(reply.result.structuredContent.bootstrap, bootstrap);
  assert.notEqual(betterCodexMcpPageRoute, betterCodexMcpRoute);
});

test("MCP resources contain the complete shared app without local credentials or external scripts", async () => {
  const reply = await handleMcpAppRequest(request("resources/read", { uri: betterCodexMcpResourceUri }), services) as any;
  const resource = reply.result.contents[0];
  assert.match(resource.text, /data-better-codex-web-surface/);
  assert.match(resource.text, /BetterCodexInjected\.install/);
  assert.match(resource.text, /runtime_command/);
  assert.match(resource.text, /runtime_events/);
  assert.doesNotMatch(resource.text, /<script[^>]+src=|<link[^>]+(?:stylesheet|manifest)/);
  for (const script of resource.text.matchAll(/<script>([\s\S]*?)<\/script>/g)) new Script(script[1]);
  assert.match(resource.text, /bridgeToken[^\n]*""/);
  assert.deepEqual(resource._meta.ui.csp.connectDomains, []);
});

test("app-only transport tools prevent read requests from submitting commands", async () => {
  let forwarded = false;
  const reply = await handleMcpAppRequest(request("tools/call", { name: "runtime_read", arguments: { path: "/api/issues", method: "POST" } }), {
    ...services, requestRuntime: async () => { forwarded = true; throw new Error("unexpected"); },
  }) as any;
  assert.equal(reply.error.message, "invalid_runtime_method");
  assert.equal(forwarded, false);
  const listing = await handleMcpAppRequest(request("tools/list"), services) as any;
  assert.match(listing.result.tools.find((tool: any) => tool.name === "board").icons[0].src, /^data:image\/svg\+xml;base64,/);
  assert.equal(listing.result.tools.filter((tool: any) => tool._meta["openai/ui"]?.entrypoints).length, 1);
  for (const tool of listing.result.tools) assert.deepEqual(tool._meta.ui.visibility, ["app"]);
});

test("resource reads use the active Runtime renderer and expose dependency failures", async () => {
  const html = "<!doctype html><html>Current Runtime renderer</html>";
  let starts = 0;
  const reply = await handleMcpAppRequest(request("resources/read", { uri: betterCodexMcpResourceUri }), {
    ...services, ensureRuntime: async () => { starts++; }, requestRuntime: async args => {
      assert.equal(args.path, "/api/ui/mcp");
      return { status: 200, statusText: "OK", headers: {}, body: JSON.stringify({ html }) };
    },
  }) as any;
  assert.equal(starts, 1);
  assert.equal(reply.result.contents[0].text, html);
  const failure = await handleMcpAppRequest(request("resources/read", { uri: betterCodexMcpResourceUri }), {
    ...services, requestRuntime: async () => ({ status: 503, statusText: "Unavailable", headers: {}, body: JSON.stringify({ error: "runtime_unavailable", diagnostics: { runtime_instance_id: "failed" } }) }),
  }) as any;
  assert.equal(failure.error.message, "runtime_unavailable");
  assert.equal(failure.error.data.diagnostics.runtime_instance_id, "failed");
  assert.equal(failure.result, undefined);
});

test("HTTP failures remain failures and sidebar recovery requires its separate action", async () => {
  let launches = 0;
  const localServices = { ...services, launchSidebar: async () => { launches++; }, requestRuntime: async () => ({ status: 503, statusText: "Unavailable", headers: {}, body: JSON.stringify({ error: "runtime_unavailable", diagnostics: { runtime_instance_id: "test" } }) }) };
  const failed = await handleMcpAppRequest(request("tools/call", { name: "board" }), localServices) as any;
  assert.equal(failed.result.isError, true);
  assert.equal(failed.result.content[0].text, "runtime_unavailable");
  assert.equal(launches, 0);
  const recovery = await handleMcpAppRequest(request("tools/call", { name: "sidebar" }), localServices) as any;
  assert.equal(recovery.result.structuredContent.ready, true);
  assert.equal(launches, 1);
});
