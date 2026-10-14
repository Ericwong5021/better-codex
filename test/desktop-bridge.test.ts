import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { runInNewContext } from "node:vm";
import test from "node:test";
import { desktopBridgeBundle } from "../src/generated/desktop-bridge.js";

type Value = Record<string, any>;
const threadId = "10000000-0000-4000-8000-000000000001";

function fixture(poll: Value = {}, issues: Value[] = [], catalog: Value = {}) {
  const listeners = new Map<string, Function>();
  const documentListeners = new Map<string, Function>();
  const requests: Value[] = [];
  const appRequests: Value[] = [];
  const navigations: Value[] = [];
  const clock = { now: Date.now() };
  class FixtureDate extends Date { static now() { return clock.now; } }
  let domQueries = 0;
  const catalogNotifications: Value[] = [];
  const rendererNotifications: Value[] = [];
  const catalogOrder: string[] = [];
  const importedModules: string[] = [];
  let catalogImports = 0;
  const modules = catalog.modules || [{ name: "app-initial", services: true }];
  const document = {
    get readyState() { return catalog.loading ? "loading" : "complete"; },
    addEventListener(name: string, listener: Function) { documentListeners.set(name, listener); },
    removeEventListener(name: string) { documentListeners.delete(name); },
    querySelectorAll(selector: string) {
      domQueries++;
      return selector.startsWith("link") && !catalog.missing ? modules.map((module: Value) => ({ href: `https://codex.test/assets/${module.name}-test.js` })) : [];
    },
  };
  const window: Value = {
    addEventListener(name: string, listener: Function) { listeners.set(name, listener); },
    removeEventListener(name: string) { listeners.delete(name); },
    postMessage(value: Value) { navigations.push(value); context.location.pathname = value.path; },
    dispatchEvent(event: Value) { rendererNotifications.push(event.data); catalogOrder.push("renderer"); return true; },
    betterCodexRequest(encoded: string) {
      const request = JSON.parse(encoded);
      requests.push(request);
      if (request.path === "/api/session-relay/catalog-ack") catalogOrder.push("ack");
      const value = request.path.startsWith("/api/issues/from-thread?") ? issues[0] || null : request.path === "/api/session-relay/poll" ? { leader: true, thread_ids: [threadId], ...poll } : {};
      queueMicrotask(() => window.__betterCodexBridgeResolve(request.id, catalog.runtimeError ? { ok: false, value: { error: catalog.runtimeError } } : { ok: true, value }));
    },
    electronBridge: {
      getAppSessionId: async () => "native-session-test",
      sendMessageFromView(message: Value) {
        appRequests.push(message.request);
        const result = ["thread/resume", "thread/start"].includes(message.request.method) ? { thread: { id: message.request.params.threadId || threadId } } : message.request.method === "turn/start" ? { turn: { id: "20000000-0000-4000-8000-000000000002" } } : { data: [] };
        queueMicrotask(() => listeners.get("message")?.({ data: { type: "mcp-response", message: { id: message.request.id, result } } }));
        return Promise.resolve();
      },
    },
  };
  const context: Value = {
    window, document, crypto: { randomUUID }, location: { origin: "codex://desktop", pathname: "/" }, console: { info() {} }, URL, Date: FixtureDate,
    catalogModule: async (href: string) => {
      catalogImports++;
      const module = modules.find((value: Value) => href.endsWith(`/${value.name}-test.js`));
      importedModules.push(module.name);
      if (module.error) throw new Error(module.error);
      if (!module.services) return { unrelated: {}, minifiedFunction() {} };
      return { services: { localThreadCatalog: { async notifyThread(value: Value, action: string) {
        if (catalog.failure) throw new Error(catalog.failure);
        catalogNotifications.push({ ...value, action });
        catalogOrder.push("notify");
      } } } };
    },
    setTimeout, clearTimeout, setInterval: () => 1, clearInterval() {}, Promise,
    MessageEvent: class { constructor(public type: string, public options: Value) {} get data() { return this.options.data; } },
  };
  runInNewContext(desktopBridgeBundle.replace("await import(entry.href)", "await catalogModule(entry.href)"), context);
  const config = { version: "test-version", bundleChecksum: "test-checksum", profile: "test-profile", bridgeToken: "test-token", baseUrl: "http://127.0.0.1:1234", selectors: { threadRow: "[data-thread]" }, attributes: { threadId: "data-thread" }, navigation: { messageType: "navigate-to-route", threadRoutePrefix: "/local/" } };
  const result = context.BetterCodexDesktopBridge.install(config);
  return { window, config, context, result, requests, appRequests, navigations, documentListeners, clock, catalog, catalogNotifications, rendererNotifications, catalogOrder, importedModules, catalogImports: () => catalogImports, domQueries: () => domQueries };
}
const flush = () => new Promise(resolve => setImmediate(resolve));

test("native proxy establishes authenticated readiness without rendering or scanning product UI", async () => {
  const fixtureValue = fixture();
  await flush();
  assert.equal(fixtureValue.window.__betterCodexDesktopBridge__.ready(), true);
  assert.equal(fixtureValue.domQueries(), 1);
  assert.equal(fixtureValue.catalogImports(), 1);
  assert.equal(fixtureValue.requests[0].token, "test-token");
  assert.equal(JSON.parse(fixtureValue.requests[0].body).owner, "native");
  assert.equal(fixtureValue.appRequests[0].method, "thread/list");
  const existing = fixtureValue.window.__betterCodexDesktopBridge__;
  assert.equal(fixtureValue.context.BetterCodexDesktopBridge.install(fixtureValue.config).reused, true);
  assert.equal(fixtureValue.window.__betterCodexDesktopBridge__, existing);
  existing.destroy();
  assert.equal(fixtureValue.window.__betterCodexDesktopBridge__, undefined);
});

test("native navigation waits for durable handoff before resuming the canonical thread", async () => {
  const fixtureValue = fixture({}, [{ id: "issue-test", run_thread_id: threadId, session_owned: true }]);
  await flush();
  await fixtureValue.window.__betterCodexDesktopBridge__.openThread(threadId);
  const handoff = fixtureValue.requests.find(value => value.path === "/api/issues/issue-test/session-handoff");
  assert.ok(handoff);
  assert.equal(JSON.parse(handoff.body).thread_id, threadId);
  assert.equal(fixtureValue.appRequests.at(-1)?.method, "thread/resume");
  assert.equal(fixtureValue.navigations[0].path, `/local/${threadId}`);
  fixtureValue.window.__betterCodexDesktopBridge__.destroy();
});

test("unavailable desktop catalog acknowledges a visible retryable failure", async () => {
  const fixtureValue = fixture({ catalog_actions: [{ thread_id: threadId, event_id: "event-test", action: "archive" }] }, [], { failure: "desktop_catalog_temporarily_unavailable" });
  await flush();
  const ack = fixtureValue.requests.find(value => value.path === "/api/session-relay/catalog-ack");
  assert.ok(ack);
  assert.equal(JSON.parse(ack.body).event_id, "event-test");
  assert.equal(JSON.parse(ack.body).error, "desktop_catalog_temporarily_unavailable");
  assert.equal(fixtureValue.window.__betterCodexDesktopBridge__.ready(), false);
  fixtureValue.catalog.failure = "";
  fixtureValue.window.__betterCodexDesktopBridge__.pulse();
  await flush();
  const successfulAck = fixtureValue.requests.filter(value => value.path === "/api/session-relay/catalog-ack").at(-1);
  assert.equal(JSON.parse(successfulAck?.body).error, "");
  assert.equal(fixtureValue.catalogImports(), 1);
  assert.equal(fixtureValue.catalogNotifications[0].action, "remove");
  assert.equal(fixtureValue.window.__betterCodexDesktopBridge__.ready(), true);
  fixtureValue.window.__betterCodexDesktopBridge__.destroy();
});


test("missing desktop catalog cannot establish readiness", async () => {
  const fixtureValue = fixture({}, [], { missing: true });
  await flush();
  assert.equal(fixtureValue.window.__betterCodexDesktopBridge__.ready(), false);
  assert.equal(fixtureValue.window.__betterCodexDesktopBridge__.bootstrapError(), "desktop_catalog_module_unavailable");
  fixtureValue.window.__betterCodexDesktopBridge__.destroy();
});

for (const action of ["archive", "unarchive", "delete"]) {
  test(`shared-module catalog ${action} updates host and renderer before durable acknowledgement`, async () => {
    const fixtureValue = fixture({ catalog_actions: [{ thread_id: threadId, event_id: "event-shared", action }] }, [], {
      modules: [{ name: "app-initial", services: false }, { name: "app-shared", services: true }],
    });
    await flush();
    assert.equal(fixtureValue.window.__betterCodexDesktopBridge__.ready(), true);
    assert.deepEqual(fixtureValue.importedModules, ["app-initial", "app-shared"]);
    assert.deepEqual(fixtureValue.catalogNotifications, [{ hostId: "local", threadId, action: action === "unarchive" ? "upsert" : "remove" }]);
    assert.equal(fixtureValue.rendererNotifications[0].method, `thread/${action === "delete" ? "deleted" : action === "archive" ? "archived" : "unarchived"}`);
    assert.deepEqual(fixtureValue.catalogOrder, ["notify", "renderer", "ack"]);
    const ack = fixtureValue.requests.find(value => value.path === "/api/session-relay/catalog-ack");
    assert.equal(JSON.parse(ack?.body).error, "");
    fixtureValue.window.__betterCodexDesktopBridge__.pulse();
    await flush();
    assert.equal(fixtureValue.catalogImports(), 2);
    fixtureValue.window.__betterCodexDesktopBridge__.destroy();
  });
}

test("shared-only preload establishes readiness without importing unrelated modules", async () => {
  const fixtureValue = fixture({}, [], { modules: [{ name: "unrelated", services: true }, { name: "app-shared", services: true }] });
  await flush();
  assert.equal(fixtureValue.window.__betterCodexDesktopBridge__.ready(), true);
  assert.deepEqual(fixtureValue.importedModules, ["app-shared"]);
  fixtureValue.window.__betterCodexDesktopBridge__.destroy();
});

test("a failed candidate import does not hide a working catalog module", async () => {
  const fixtureValue = fixture({}, [], { modules: [{ name: "app-initial", error: "module_load_failed" }, { name: "app-shared", services: true }] });
  await flush();
  assert.equal(fixtureValue.window.__betterCodexDesktopBridge__.ready(), true);
  assert.deepEqual(fixtureValue.importedModules, ["app-initial", "app-shared"]);
  fixtureValue.window.__betterCodexDesktopBridge__.destroy();
});

test("missing service exports remain unavailable and recover after the retry interval", async () => {
  const shared = { name: "app-shared", services: false };
  const fixtureValue = fixture({}, [], { modules: [{ name: "app-initial", services: false }, shared, shared] });
  await flush();
  assert.equal(fixtureValue.window.__betterCodexDesktopBridge__.ready(), false);
  assert.equal(fixtureValue.window.__betterCodexDesktopBridge__.bootstrapError(), "desktop_catalog_service_unavailable");
  assert.deepEqual(fixtureValue.importedModules, ["app-initial", "app-shared"]);
  shared.services = true;
  fixtureValue.clock.now += 10001;
  fixtureValue.window.__betterCodexDesktopBridge__.pulse();
  await flush();
  assert.equal(fixtureValue.window.__betterCodexDesktopBridge__.ready(), true);
  fixtureValue.window.__betterCodexDesktopBridge__.destroy();
});

test("all catalog imports failing remains a visible bootstrap failure", async () => {
  const fixtureValue = fixture({}, [], { modules: [{ name: "app-shared", error: "module_load_failed" }] });
  await flush();
  assert.equal(fixtureValue.window.__betterCodexDesktopBridge__.ready(), false);
  assert.equal(fixtureValue.window.__betterCodexDesktopBridge__.bootstrapError(), "desktop_catalog_module_import_failed");
  fixtureValue.window.__betterCodexDesktopBridge__.destroy();
});

test("durable start command checkpoints thread and turn before acknowledging completion", async () => {
  const fixtureValue = fixture({ command: { id: "start-test", issue_id: "issue-test", kind: "start", payload: { message: "original input" } } });
  await flush();
  const checkpoints = fixtureValue.requests.filter(value => value.path === "/api/session-relay/commands/start-test/checkpoint");
  assert.equal(checkpoints.length, 2);
  assert.equal(JSON.parse(checkpoints[0].body).result.thread_id, threadId);
  assert.equal(JSON.parse(checkpoints[1].body).result.turn_id, "20000000-0000-4000-8000-000000000002");
  assert.equal(fixtureValue.requests.at(-1)?.path, "/api/session-relay/commands/start-test/complete");
  assert.equal(fixtureValue.appRequests.at(-1)?.params.input[0].text, "original input");
  fixtureValue.window.__betterCodexDesktopBridge__.destroy();
});

test("profile replacement destroys the old proxy and fences its pulse", async () => {
  const fixtureValue = fixture();
  await flush();
  const original = fixtureValue.window.__betterCodexDesktopBridge__;
  fixtureValue.context.BetterCodexDesktopBridge.install({ ...fixtureValue.config, profile: "another-profile" });
  assert.equal(original.pulse(), false);
  assert.equal(fixtureValue.window.__betterCodexDesktopBridge__.profile, "another-profile");
  await flush();
  fixtureValue.window.__betterCodexDesktopBridge__.destroy();
});


test("native sidebar click fences an owned Issue even before it has been handed off", async () => {
  const fixtureValue = fixture({ thread_ids: [] }, [{ id: "issue-test", run_thread_id: threadId, session_owned: true }]);
  await flush();
  let prevented = false;
  const row = { getAttribute: () => threadId, click() {} };
  fixtureValue.documentListeners.get("click")?.({ target: { closest: () => row }, preventDefault() { prevented = true; }, stopImmediatePropagation() {} });
  await flush();
  assert.equal(prevented, true);
  assert.ok(fixtureValue.requests.some(value => value.path === "/api/issues/issue-test/session-handoff"));
  assert.equal(fixtureValue.appRequests.at(-1)?.method, "thread/resume");
  await new Promise(resolve => setTimeout(resolve, 120));
  fixtureValue.window.__betterCodexDesktopBridge__.destroy();
});


test("loading catalog stays unready and recovers after bounded discovery retry", async () => {
  const fixtureValue = fixture({}, [], { missing: true, loading: true });
  await flush();
  assert.equal(fixtureValue.window.__betterCodexDesktopBridge__.ready(), false);
  assert.equal(JSON.parse(fixtureValue.requests[0].body).capability, "unknown");
  assert.equal(fixtureValue.window.__betterCodexDesktopBridge__.bootstrapError(), "desktop_catalog_loading");
  fixtureValue.catalog.missing = false;
  fixtureValue.catalog.loading = false;
  fixtureValue.clock.now += 1000;
  fixtureValue.window.__betterCodexDesktopBridge__.pulse();
  await flush();
  assert.equal(fixtureValue.window.__betterCodexDesktopBridge__.ready(), true);
  fixtureValue.window.__betterCodexDesktopBridge__.destroy();
});

test("native capability cannot mask Runtime authentication failure", async () => {
  const fixtureValue = fixture({}, [], { runtimeError: "unauthorized" });
  await flush();
  assert.equal(fixtureValue.window.__betterCodexDesktopBridge__.ready(), false);
  assert.equal(fixtureValue.window.__betterCodexDesktopBridge__.bootstrapError(), "unauthorized");
  fixtureValue.catalog.runtimeError = "";
  fixtureValue.window.__betterCodexDesktopBridge__.pulse();
  await flush();
  assert.equal(fixtureValue.window.__betterCodexDesktopBridge__.ready(), true);
  fixtureValue.window.__betterCodexDesktopBridge__.destroy();
});
