import { injectionScript } from "./dom.js";
import { betterCodexWebHostCss, betterCodexWebHostHtml, betterCodexWebHostJavaScript } from "./web-host.js";
import { coreVersion } from "./version.js";

function inlineScript(source: string) {
  return source.replace(/<\/script/gi, "<\\/script");
}

/** The MCP host changes transport and routing, while the product UI stays shared. */
export function betterCodexMcpHostHtml() {
  const transport = String.raw`
(() => {
  const pending = new Map();
  const subscriptions = new Set();
  let sequence = 0;
  let destroyed = false;
  let initialBootstrap = null;
  let currentRoute = { path: "/web", state: {} };
  const routes = [currentRoute];
  let routeIndex = 0;
  let ready = null;
  const send = message => window.parent.postMessage({ jsonrpc: "2.0", ...message }, "*");
  function rpc(method, params, timeoutMs = 15000, signal) {
    if (destroyed) return Promise.reject(new Error("mcp_app_disposed"));
    if (signal?.aborted) return Promise.reject(new DOMException("Aborted", "AbortError"));
    const id = "better-codex:" + (++sequence);
    return new Promise((resolve, reject) => {
      const finish = (error, value) => {
        if (!pending.has(id)) return;
        clearTimeout(timer);
        signal?.removeEventListener("abort", abort);
        pending.delete(id);
        if (error) reject(error); else resolve(value);
      };
      const abort = () => finish(new DOMException("Aborted", "AbortError"));
      const timer = setTimeout(() => finish(new Error("runtime_bridge_timeout")), timeoutMs);
      pending.set(id, { finish });
      signal?.addEventListener("abort", abort, { once: true });
      send({ id, method, params });
    });
  }
  function applyHostContext(context) {
    if (context?.theme && !localStorage.getItem("better-codex-web-theme")) {
      document.documentElement.dataset.theme = context.theme === "dark" ? "dark" : "light";
    }
    const link = context?.["openai/deepLink"]?.url;
    if (typeof link === "string" && link.startsWith("/")) {
      const path = link === "/" ? "/web" : link.startsWith("/web") ? link : "/web" + link;
      routing.replaceState({}, path);
      window.dispatchEvent(new PopStateEvent("popstate"));
    }
  }
  function validRoute(path) {
    return typeof path === "string" && /^\/web(?:\/(?:projects|agents)(?:\/[^/?#]+)?)?\/?$/.test(path);
  }
  const routing = Object.freeze({
    pathname: () => currentRoute.path,
    state: () => currentRoute.state,
    pushState: (state, path) => {
      if (!validRoute(path)) throw new Error("invalid_mcp_app_route");
      currentRoute = { path, state };
      routes.splice(++routeIndex, routes.length, currentRoute);
    },
    replaceState: (state, path) => {
      if (!validRoute(path)) return;
      currentRoute = { path, state };
      routes[routeIndex] = currentRoute;
    },
    back: () => {
      if (routeIndex > 0) currentRoute = routes[--routeIndex];
      window.dispatchEvent(new PopStateEvent("popstate", { state: currentRoute.state }));
    },
  });
  const onMessage = event => {
    if (event.source !== window.parent || event.data?.jsonrpc !== "2.0") return;
    const message = event.data;
    if (message.method === "ui/notifications/tool-result") {
      const bootstrap = message.params?.structuredContent?.bootstrap;
      if (bootstrap) initialBootstrap = bootstrap;
    } else if (message.method === "ui/notifications/host-context-changed") {
      applyHostContext(message.params);
    } else if (message.method === "ui/resource-teardown") {
      dispose();
      if (message.id !== undefined) send({ id: message.id, result: {} });
    } else if (pending.has(message.id)) {
      pending.get(message.id).finish(message.error ? new Error(message.error.message || "mcp_request_failed") : null, message.result);
    }
  };
  window.addEventListener("message", onMessage);
  async function callTool(name, args, timeoutMs, signal) {
    await connect();
    const result = await rpc("tools/call", { name, arguments: args }, timeoutMs, signal);
    if (result?.isError) {
      const error = new Error(result.content?.map(item => item.text || "").join("; ") || "runtime_unavailable");
      error.betterCodexDiagnostics = result.structuredContent?.diagnostics || null;
      throw error;
    }
    if (!result?.structuredContent) throw new Error("runtime_response_invalid");
    return result.structuredContent;
  }
  async function fetchRuntime(path, options = {}) {
    const method = String(options.method || "GET").toUpperCase();
    const headers = new Headers(options.headers);
    const timeoutMs = Number(options.timeoutMs) || 120000;
    await connect();
    if (method === "GET" && path.split("?")[0] === "/api/bootstrap" && initialBootstrap) {
      const bootstrap = initialBootstrap;
      initialBootstrap = null;
      return new Response(JSON.stringify(bootstrap), { status: 200, headers: { "content-type": "application/json" } });
    }
    const response = await callTool(method === "GET" ? "runtime_read" : "runtime_command", {
      path, method, body: options.body,
      commandId: headers.get("x-better-codex-command-id") || undefined,
      traceId: headers.get("x-better-codex-trace-id") || undefined,
      timeoutMs,
    }, timeoutMs + 5000, options.signal);
    let body = response.body;
    if (response.status >= 500) {
      try {
        const value = JSON.parse(body);
        if (["mcp_runtime_unavailable", "mcp_runtime_transport_failed"].includes(value.error)) value.error = "runtime_unavailable";
        if (value.error === "mcp_runtime_timeout") value.error = "runtime_bridge_timeout";
        body = JSON.stringify(value);
      } catch {}
    }
    return new Response(body || null, { status: response.status, statusText: response.statusText || "", headers: response.headers });
  }
  function subscribe(listener) {
    let stopped = false;
    let timer;
    let controller;
    let cursor = "";
    let runtimeInstanceId = "";
    const stop = () => { stopped = true; clearTimeout(timer); controller?.abort(); subscriptions.delete(stop); };
    subscriptions.add(stop);
    const poll = async () => {
      if (stopped || destroyed) return;
      if (document.hidden) { timer = setTimeout(poll, 1000); return; }
      controller = new AbortController();
      let delay = 250;
      try {
        const result = await callTool("runtime_events", { cursor: cursor || undefined, runtimeInstanceId: runtimeInstanceId || undefined, timeoutMs: 1000 }, 15000, controller.signal);
        if (stopped) return;
        const firstConnection = !runtimeInstanceId;
        runtimeInstanceId = result.runtimeInstanceId;
        cursor = result.cursor || "";
        for (const event of result.events || []) {
          if (event.event !== "ready" || firstConnection) listener(event);
        }
      } catch (error) {
        if (stopped) return;
        // Reconciliation after a reconnect uses the Runtime's own event stream.
        listener({ event: "reset", id: cursor, data: { error: error.message || "runtime_unavailable" } });
        delay = 3000;
      }
      if (!stopped) timer = setTimeout(poll, delay);
    };
    void poll();
    return stop;
  }
  function dispose() {
    if (destroyed) return;
    destroyed = true;
    for (const stop of Array.from(subscriptions)) stop();
    window.__betterCodexInjection__?.destroy?.();
    for (const item of Array.from(pending.values())) item.finish(new Error("mcp_app_disposed"));
    window.removeEventListener("message", onMessage);
  }
  window.addEventListener("pagehide", dispose, { once: true });
  function connect() {
    if (ready) return ready;
    ready = rpc("ui/initialize", { protocolVersion: "2026-01-26", appInfo: { name: "Better Codex", version: ${JSON.stringify(coreVersion)} }, appCapabilities: {} })
      .then(result => {
        if (!result?.hostCapabilities?.serverTools) throw new Error("mcp_host_tools_unavailable");
        applyHostContext(result.hostContext);
        send({ method: "ui/notifications/initialized", params: {} });
        return result;
      }).catch(error => { ready = null; throw error; });
    ready.catch(() => {});
    return ready;
  }
  window.betterCodexMcpTransport = Object.freeze({ get ready() { return connect(); }, fetch: fetchRuntime, subscribe, routing,
    install: () => { ${injectionScript(0, "", "install", "zh-CN", "web", "mcp://better-codex/runtime")}; },
  });
  void connect();
})();`;
  return betterCodexWebHostHtml()
    .replace('<html lang="zh-CN">', '<html lang="zh-CN" data-better-codex-mcp="true">')
    .replace('  <link rel="apple-touch-icon" href="/better-codex-icon-192.png">\n', "")
    .replace('  <link rel="manifest" href="/web/manifest.webmanifest">\n', "")
    .replace('<link rel="stylesheet" href="/web/host.css">', () => `<style>${betterCodexWebHostCss()}</style>`)
    .replace("Local connection", "Better Codex")
    .replace("请运行 <code>better-codex web</code> 自动打开，或粘贴本地访问令牌。令牌只用于连接本机 Runtime。", "插件与本机服务的连接暂时不可用，请重试。")
    .replace('<label><span>访问令牌</span><input id="web-token" type="password" autocomplete="off" spellcheck="false" required></label>', '<input id="web-token" type="hidden">')
    .replace("连接工作台", "重新连接")
    .replace('<script type="module" src="/web/host.js"></script>', () => `<script>${inlineScript(transport)}</script><script>${inlineScript(betterCodexWebHostJavaScript())}</script>`);
}
