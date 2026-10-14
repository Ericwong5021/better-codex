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
  const timers = new Map<ReturnType<typeof setTimeout>, { callback: () => void; delay: number }>();
  let catalogImports = 0;
  let rendererPresent = poll.catalog_actions?.[0]?.action !== "unarchive";
  let rendererSuppressed = !rendererPresent;
  catalog.hostPresent ??= rendererPresent;
  const renderer = {
    getHostId: () => "local",
    getThreadSummary: () => rendererPresent ? { id: threadId } : null,
    getConversation: () => rendererPresent ? { id: threadId } : null,
    isConversationSuppressedAfterArchive: () => rendererSuppressed,
    async handleThreadUnarchived(id: string) { await updateRenderer(id, "unarchived", true); },
    async handleThreadArchived(id: string) { await updateRenderer(id, "archived", false); },
    async handleThreadDeletion(ids: string[]) { await updateRenderer(ids[0], "deleted", false); },
  };
  async function updateRenderer(id: string, method: string, present: boolean) {
    await catalog.rendererWait;
    if (catalog.rendererFailure) throw new Error(catalog.rendererFailure);
    if (!catalog.rendererNoop) { rendererPresent = present; rendererSuppressed = !present; }
    rendererNotifications.push({ method: `thread/${method}`, params: { threadId: id } });
    catalogOrder.push("renderer");
  }
  class Registry {
    constructor(public scope: Value) {}
    getImplForHostId(hostId: string) { return hostId === "local" ? catalog.replacementRenderer || renderer : null; }
    getForHostId(hostId: string) { return this.getImplForHostId(hostId); }
    getAll() { return [renderer]; }
    addRegistryCallback() {}
  }
  const actions = { get scope() { return catalog.rendererLoading ? null : {}; }, bindScope() {}, bindThreadActionEnqueuer() {}, enqueueForThread() {}, run() {} };
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
      return {
        ...(module.renderer === false ? {} : { actions, Registry }),
        services: { localThreadCatalog: {
          async notifyThread(value: Value, action: string) {
            if (catalog.failure) throw new Error(catalog.failure);
            catalogNotifications.push({ ...value, action });
            catalogOrder.push("notify");
            await catalog.notificationWait;
            if (!catalog.holdHostUpdate) catalog.hostPresent = action === "upsert";
          },
          async readEntries() {
            catalogOrder.push("readback");
            await catalog.readbackWait;
            if (catalog.readbackFailure) throw new Error(catalog.readbackFailure);
            return catalog.readbackResult ?? (catalog.hostPresent ? [{ hostId: "local", threadId }] : []);
          },
        } },
      };
    },
    setTimeout(callback: () => void, delay: number) {
      const timer = setTimeout(() => { timers.delete(timer); callback(); }, delay);
      timers.set(timer, { callback, delay });
      return timer;
    },
    clearTimeout(timer: ReturnType<typeof setTimeout>) { timers.delete(timer); clearTimeout(timer); },
    setInterval: () => 1, clearInterval() {}, Promise,
    MessageEvent: class { constructor(public type: string, public options: Value) {} get data() { return this.options.data; } },
  };
  runInNewContext(desktopBridgeBundle.replace("await import(entry.href)", "await catalogModule(entry.href)"), context);
  const config = { version: "test-version", bundleChecksum: "test-checksum", profile: "test-profile", bridgeToken: "test-token", baseUrl: "http://127.0.0.1:1234", selectors: { threadRow: "[data-thread]" }, attributes: { threadId: "data-thread" }, navigation: { messageType: "navigate-to-route", threadRoutePrefix: "/local/" } };
  const result = context.BetterCodexDesktopBridge.install(config);
  function fireTimers(delay: number) {
    for (const [timer, pending] of [...timers]) if (pending.delay === delay) {
      timers.delete(timer);
      clearTimeout(timer);
      pending.callback();
    }
  }
  return { window, config, context, result, requests, appRequests, navigations, documentListeners, clock, catalog, catalogNotifications, rendererNotifications, renderer, catalogOrder, importedModules, fireTimers, catalogImports: () => catalogImports, domQueries: () => domQueries };
}
const flush = () => new Promise(resolve => setImmediate(resolve));
function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>(done => { resolve = done; });
  return { promise, resolve };
}
const catalogAction = (action = "unarchive") => ({ thread_id: threadId, event_id: "event-readback", action });
const catalogAcks = (value: ReturnType<typeof fixture>) => value.requests.filter(request => request.path === "/api/session-relay/catalog-ack").map(request => JSON.parse(request.body));

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
    assert.deepEqual(fixtureValue.catalogOrder, ["notify", "renderer", "readback", "ack"]);
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

test("unarchive waits for the native renderer read before acknowledging catalog completion", async t => {
  const pending = deferred();
  const value = fixture({ catalog_actions: [catalogAction()] }, [], { rendererWait: pending.promise });
  t.after(() => value.window.__betterCodexDesktopBridge__?.destroy());
  await flush();
  assert.equal(value.catalogNotifications.length, 1);
  assert.equal(catalogAcks(value).length, 0);
  assert.equal(value.window.__betterCodexDesktopBridge__.ready(), false);
  assert.equal(value.window.__betterCodexDesktopBridge__.bootstrapError(), "desktop_catalog_sync_pending");
  pending.resolve();
  await flush();
  assert.equal(catalogAcks(value)[0].error, "");
  assert.equal(value.window.__betterCodexDesktopBridge__.ready(), true);
});

test("host notification acceptance is insufficient until its catalog readback matches", async t => {
  const value = fixture({ catalog_actions: [catalogAction()] }, [], { holdHostUpdate: true });
  t.after(() => value.window.__betterCodexDesktopBridge__?.destroy());
  await flush();
  assert.equal(value.rendererNotifications.length, 1);
  assert.equal(catalogAcks(value).length, 0);
  value.catalog.hostPresent = true;
  value.fireTimers(100);
  await flush();
  assert.equal(catalogAcks(value)[0].error, "");
});

test("a failed renderer read or malformed host readback retains a retryable catalog error", async t => {
  for (const catalog of [{ rendererFailure: "native_thread_read_failed" }, { readbackResult: [{ id: threadId }] }]) {
    await t.test(Object.keys(catalog)[0], async t => {
      const value = fixture({ catalog_actions: [catalogAction()] }, [], catalog);
      t.after(() => value.window.__betterCodexDesktopBridge__?.destroy());
      await flush();
      assert.equal(catalogAcks(value)[0].error, "rendererFailure" in catalog ? "native_thread_read_failed" : "desktop_catalog_readback_invalid");
      assert.equal(value.window.__betterCodexDesktopBridge__.ready(), false);
    });
  }
});

test("renderer cache mismatch times out without acknowledging a successful restore", async t => {
  const value = fixture({ catalog_actions: [catalogAction()] }, [], { rendererNoop: true });
  t.after(() => value.window.__betterCodexDesktopBridge__?.destroy());
  await flush();
  assert.equal(catalogAcks(value).length, 0);
  value.fireTimers(10000);
  await flush();
  assert.equal(catalogAcks(value)[0].error, "desktop_catalog_sync_timeout");
});

test("a stalled catalog RPC is bounded and does not delay an admitted native command", async t => {
  const pending = deferred();
  const value = fixture({
    catalog_actions: [catalogAction()],
    command: { id: "catalog-independent-start", issue_id: "issue-test", kind: "start", payload: { message: "original input" } },
  }, [], { notificationWait: pending.promise });
  t.after(() => value.window.__betterCodexDesktopBridge__?.destroy());
  await flush();
  assert.ok(value.requests.some(request => request.path === "/api/session-relay/commands/catalog-independent-start/complete"));
  assert.equal(catalogAcks(value).length, 0);
  value.fireTimers(10000);
  await flush();
  assert.equal(catalogAcks(value)[0].error, "desktop_catalog_sync_timeout");
  pending.resolve();
  await flush();
  assert.equal(value.rendererNotifications.length, 0);
  assert.equal(catalogAcks(value).length, 1);
  value.window.__betterCodexDesktopBridge__.pulse();
  await flush();
  assert.equal(catalogAcks(value).at(-1).error, "");
});

test("catalog updates and commands for the same thread stay serialized", async t => {
  const pending = deferred();
  const value = fixture({
    catalog_actions: [catalogAction()],
    command: { id: "same-thread-start", thread_id: threadId, issue_id: "issue-test", kind: "start", payload: { message: "Input" } },
  }, [], { rendererWait: pending.promise });
  t.after(() => value.window.__betterCodexDesktopBridge__?.destroy());
  await flush();
  assert.equal(value.appRequests.some(request => request.method === "turn/start"), false);
  pending.resolve();
  await flush();
  assert.equal(catalogAcks(value)[0].error, "");
  assert.equal(value.appRequests.some(request => request.method === "turn/start"), true);
});

test("replacing the renderer during a catalog operation cannot acknowledge stale cache evidence", async t => {
  const pending = deferred();
  const value = fixture({ catalog_actions: [catalogAction()] }, [], { rendererWait: pending.promise });
  t.after(() => value.window.__betterCodexDesktopBridge__?.destroy());
  await flush();
  value.catalog.replacementRenderer = { ...value.renderer };
  pending.resolve();
  await flush();
  assert.equal(catalogAcks(value)[0].error, "desktop_catalog_renderer_changed");
});

test("destroy cancels catalog waiting and prevents a late renderer mutation or acknowledgement", async () => {
  const pending = deferred();
  const value = fixture({ catalog_actions: [catalogAction()] }, [], { notificationWait: pending.promise });
  await flush();
  value.window.__betterCodexDesktopBridge__.destroy();
  pending.resolve();
  await flush();
  assert.equal(value.rendererNotifications.length, 0);
  assert.equal(catalogAcks(value).length, 0);
});

for (const replacement of ["timeout", "replacement", "destroy-install"]) {
  test(`an uncancellable renderer update fences later thread actions after ${replacement}`, async t => {
    const pending = deferred();
    const poll = { catalog_actions: [catalogAction()] };
    const value = fixture(poll, [], { rendererWait: pending.promise });
    t.after(() => value.window.__betterCodexDesktopBridge__?.destroy());
    await flush();
    assert.equal(value.window.__betterCodexDesktopBridge__.catalogMutations.size, 1);
    poll.catalog_actions = [{ ...catalogAction("archive"), event_id: "newer-archive" }];
    value.catalog.rendererWait = undefined;
    if (replacement === "destroy-install") {
      value.window.__betterCodexDesktopBridge__.destroy();
      value.context.BetterCodexDesktopBridge.install({ ...value.config, baseUrl: "http://127.0.0.1:2345" });
    } else if (replacement === "replacement") value.context.BetterCodexDesktopBridge.install({ ...value.config, bundleChecksum: "replacement-checksum" });
    else { value.fireTimers(10000); await flush(); value.window.__betterCodexDesktopBridge__.pulse(); }
    await flush();
    assert.equal(catalogAcks(value).at(-1).error, "desktop_catalog_mutation_pending");
    assert.equal(value.catalogNotifications.length, 1);
    assert.equal(value.rendererNotifications.length, 0);
    pending.resolve();
    await flush();
    assert.equal(value.rendererNotifications[0].method, "thread/unarchived");
    assert.equal(catalogAcks(value).some(ack => ack.event_id === "event-readback" && !ack.error), false);
    value.window.__betterCodexDesktopBridge__.pulse();
    await flush();
    assert.equal(value.rendererNotifications.at(-1).method, "thread/archived");
    assert.equal(catalogAcks(value).at(-1).event_id, "newer-archive");
    assert.equal(catalogAcks(value).at(-1).error, "");
    assert.equal(value.renderer.isConversationSuppressedAfterArchive(), true);
  });
}

test("an unresolved native catalog mutation fails a later same-thread command visibly", async t => {
  const pending = deferred();
  const poll: Value = { catalog_actions: [catalogAction()] };
  const value = fixture(poll, [], { rendererWait: pending.promise });
  t.after(() => value.window.__betterCodexDesktopBridge__?.destroy());
  await flush();
  value.fireTimers(10000);
  await flush();
  poll.catalog_actions = [];
  poll.command = { id: "fenced-start", thread_id: threadId, issue_id: "issue-test", kind: "start", payload: { message: "Input" } };
  value.window.__betterCodexDesktopBridge__.pulse();
  await flush();
  const failure = value.requests.find(request => request.path === "/api/session-relay/commands/fenced-start/fail");
  assert.equal(JSON.parse(failure?.body).error, "desktop_catalog_mutation_pending");
  assert.equal(value.appRequests.some(request => ["thread/start", "thread/resume", "turn/start"].includes(request.method)), false);
  pending.resolve();
  await flush();
});

test("catalog discovery requires an existing renderer manager and retries a loading scope", async t => {
  const missing = fixture({}, [], { modules: [{ name: "app-shared", services: true, renderer: false }] });
  const loading = fixture({}, [], { rendererLoading: true });
  t.after(() => { missing.window.__betterCodexDesktopBridge__?.destroy(); loading.window.__betterCodexDesktopBridge__?.destroy(); });
  await flush();
  assert.equal(missing.window.__betterCodexDesktopBridge__.bootstrapError(), "desktop_catalog_renderer_unavailable");
  assert.equal(loading.window.__betterCodexDesktopBridge__.bootstrapError(), "desktop_catalog_loading");
  loading.catalog.rendererLoading = false;
  loading.clock.now += 1000;
  loading.window.__betterCodexDesktopBridge__.pulse();
  await flush();
  assert.equal(loading.window.__betterCodexDesktopBridge__.ready(), true);
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
