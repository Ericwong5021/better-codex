import { betterCodexLogoPng } from "./brand-assets.js";

const betterCodexLogoUrl = `data:image/png;base64,${betterCodexLogoPng().toString("base64")}`;

const webHostHtml = String.raw`<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <meta name="color-scheme" content="light dark">
  <meta name="referrer" content="no-referrer">
  <title>Better Codex</title>
  <link rel="stylesheet" href="/web/host.css">
</head>
<body>
  <a class="web-skip-link" href="#web-main">跳到主要内容</a>
  <div class="web-shell">
    <aside class="web-sidebar" aria-label="Better Codex 导航">
      <header class="web-brand">
        <img class="web-brand-logo" src="${betterCodexLogoUrl}" alt="">
        <strong>Better Codex</strong>
        <button id="web-theme" class="web-icon-button" type="button" aria-label="切换深色模式">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="4"></circle><path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.66 6.34l1.41-1.41"></path></svg>
        </button>
      </header>
      <nav role="navigation" aria-label="主导航">
        <div class="web-sidebar-scroll" data-app-action-sidebar-scroll>
          <div class="web-sidebar-section" data-app-action-sidebar-section></div>
        </div>
      </nav>
      <footer class="web-profile">
        <span class="web-avatar">BC</span>
        <span><strong>Better Codex</strong><small>本地工作台</small></span>
        <i class="web-online" aria-label="Runtime 已连接"></i>
      </footer>
    </aside>
    <main id="web-main" class="web-main">
      <div class="web-surface" data-better-codex-web-surface>
        <div class="web-native-layout" data-app-shell-main-content-layout>
          <div class="app-shell-main-content-frame">
            <section id="web-native-view" class="web-native-view">
              <span class="web-native-icon" aria-hidden="true">↗</span>
              <h1>会话已在 Codex 中打开</h1>
              <p>Web 壳目前复用 Better Codex 的任务与智能体界面。完整会话仍由 Codex Desktop 承载。</p>
              <button id="web-back-to-board" type="button">返回任务看板</button>
            </section>
          </div>
        </div>
      </div>
    </main>
  </div>
  <dialog id="web-connect" class="web-connect">
    <form id="web-connect-form" method="dialog">
      <img class="web-brand-logo is-large" src="${betterCodexLogoUrl}" alt="">
      <span class="web-eyebrow">Local connection</span>
      <h1>连接 Better Codex</h1>
      <p>请运行 <code>better-codex web</code> 自动打开，或粘贴本地访问令牌。令牌只用于连接本机 Runtime。</p>
      <label><span>访问令牌</span><input id="web-token" type="password" autocomplete="off" spellcheck="false" required></label>
      <output id="web-connect-error" hidden></output>
      <button type="submit">连接工作台</button>
    </form>
  </dialog>
  <script type="module" src="/web/host.js"></script>
</body>
</html>`;

const webHostCss = String.raw`
:root {
  color-scheme: light;
  --web-canvas: #fff;
  --web-sidebar: #f7f7f6;
  --web-hover: #eaeae9;
  --web-pressed: #e4e4e3;
  --web-ink: #20201e;
  --web-muted: #777773;
  --web-line: #e7e7e5;
  --web-raised: #fff;
  --web-focus: #4192d9;
  --font-sans: ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  --font-size-base: 14px;
  --color-background-surface: var(--web-canvas);
  --color-text-foreground: var(--web-ink);
  --color-token-foreground: var(--web-ink);
  --color-token-bg-primary: var(--web-canvas);
  --color-token-list-hover-background: var(--web-hover);
  font-family: var(--bc-font-ui, var(--font-sans));
}
:root[data-theme="dark"] {
  color-scheme: dark;
  --web-canvas: #1e1e1d;
  --web-sidebar: #191918;
  --web-hover: #2b2b29;
  --web-pressed: #31312f;
  --web-ink: #deded9;
  --web-muted: #969691;
  --web-line: #30302e;
  --web-raised: #262624;
}
html, body { width: 100%; min-width: 320px; height: 100%; margin: 0; overflow: hidden; color: var(--web-ink); background: var(--web-canvas); }
body { -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }
.web-skip-link, .web-sidebar, .web-sidebar *, .web-native-view, .web-native-view *, .web-connect, .web-connect * { box-sizing: border-box; }
.web-sidebar button, .web-native-view button, .web-connect button, .web-connect input { font: inherit; }
.web-sidebar button, .web-native-view button, .web-connect button { color: inherit; touch-action: manipulation; }
.web-sidebar button:active, .web-native-view button:active, .web-connect button:active { transform: scale(.96); }
.web-sidebar button:focus-visible, .web-native-view button:focus-visible, .web-connect button:focus-visible, .web-connect input:focus-visible { outline: 2px solid var(--web-focus); outline-offset: 2px; }
.web-skip-link { position: fixed; z-index: 100; top: 8px; left: 8px; transform: translateY(-150%); border-radius: 8px; padding: 8px 12px; color: var(--web-canvas); background: var(--web-ink); }
.web-skip-link:focus { transform: translateY(0); }
.web-shell { display: grid; grid-template-columns: 244px minmax(0, 1fr); width: 100%; height: 100%; }
.web-sidebar { display: flex; min-width: 0; flex-direction: column; padding: 10px; background: var(--web-sidebar); box-shadow: inset -1px 0 var(--web-line); }
.web-brand { display: flex; min-height: 48px; align-items: center; gap: 10px; padding: 4px 6px 8px; }
.web-brand strong { font-size: 15px; font-weight: 650; }
.web-brand-logo { display: block; width: 30px; height: 30px; flex: 0 0 auto; border-radius: 9px; object-fit: contain; }
.web-brand-logo.is-large { width: 46px; height: 46px; margin-bottom: 24px; border-radius: 14px; }
.web-icon-button { display: grid; width: 34px; height: 34px; margin-left: auto; border: 0; border-radius: 9px; padding: 8px; place-items: center; background: transparent; cursor: pointer; }
.web-icon-button svg { width: 17px; height: 17px; }
.web-sidebar nav { min-height: 0; flex: 1; }
.web-sidebar-scroll { height: 100%; overflow: auto; }
.web-sidebar-section { display: grid; gap: 3px; margin-top: 10px; }
.web-nav-button { display: grid; grid-template-columns: 20px minmax(0, 1fr); width: 100%; min-height: 38px; align-items: center; gap: 8px; border: 0; border-radius: 10px; padding: 0 10px; background: transparent; text-align: left; cursor: pointer; transition: background-color 120ms cubic-bezier(.16,1,.3,1), transform 120ms cubic-bezier(.16,1,.3,1); }
.web-nav-button svg { width: 16px; height: 16px; }
.text-fade-truncate { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.web-profile { display: grid; grid-template-columns: 30px minmax(0, 1fr) 8px; min-height: 48px; align-items: center; gap: 9px; padding: 6px; }
.web-avatar { display: grid; width: 28px; height: 28px; place-items: center; border-radius: 50%; color: #fff; background: #2fa15f; font-size: 9px; font-weight: 700; }
.web-profile > span:nth-child(2) { display: flex; min-width: 0; flex-direction: column; gap: 2px; }
.web-profile strong, .web-profile small { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.web-profile strong { font-size: 11px; font-weight: 620; }
.web-profile small { color: var(--web-muted); font-size: 9px; }
.web-online { width: 7px; height: 7px; border-radius: 50%; background: #2fa15f; box-shadow: 0 0 0 3px color-mix(in srgb, #2fa15f 15%, transparent); }
.web-main, .web-surface { min-width: 0; min-height: 0; height: 100%; }
.web-surface { position: relative; }
.web-native-layout, .app-shell-main-content-frame { width: 100%; height: 100%; }
.web-native-view { display: grid; height: 100%; place-content: center; padding: 30px; text-align: center; }
.web-native-view > * { justify-self: center; }
.web-native-icon { display: grid; width: 40px; height: 40px; place-items: center; border-radius: 13px; color: var(--web-muted); background: var(--web-hover); font-size: 18px; }
.web-native-view h1 { margin: 14px 0 7px; font-size: 18px; font-weight: 620; }
.web-native-view p { max-width: 52ch; margin: 0; color: var(--web-muted); font-size: 12px; line-height: 1.7; }
.web-native-view button { min-height: 36px; margin-top: 18px; border: 0; border-radius: 10px; padding: 0 13px; color: var(--web-canvas); background: var(--web-ink); cursor: pointer; }
.web-connect { width: min(410px, calc(100vw - 24px)); border: 0; border-radius: 22px; padding: 0; color: var(--web-ink); background: var(--web-raised); box-shadow: 0 20px 60px rgb(0 0 0 / .2), 0 3px 12px rgb(0 0 0 / .08); }
.web-connect::backdrop { background: rgb(24 24 22 / .32); }
.web-connect form { padding: 30px; }
.web-eyebrow { color: var(--web-muted); font-size: 10px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; }
.web-connect h1 { margin: 7px 0 8px; font-size: 24px; font-weight: 620; letter-spacing: -.018em; }
.web-connect p { margin: 0 0 20px; color: var(--web-muted); font-size: 12px; line-height: 1.7; }
.web-connect code { border-radius: 5px; padding: 2px 5px; color: var(--web-ink); background: var(--web-hover); }
.web-connect label { display: grid; gap: 7px; color: var(--web-muted); font-size: 10px; font-weight: 600; }
.web-connect input { width: 100%; height: 39px; border: 0; border-radius: 10px; padding: 0 11px; color: var(--web-ink); background: var(--web-hover); }
.web-connect output { display: block; margin-top: 9px; color: #d34e4e; font-size: 11px; }
.web-connect button { width: 100%; min-height: 38px; margin-top: 16px; border: 0; border-radius: 10px; color: var(--web-canvas); background: var(--web-ink); cursor: pointer; }
@media (hover:hover) { .web-nav-button:hover, .web-icon-button:hover { background: var(--web-hover); } }
@media (max-width: 720px) {
  .web-shell { display: block; }
  .web-main { width: 100%; height: calc(100% - 58px); }
  .web-sidebar { position: fixed; z-index: 50; right: 0; bottom: 0; left: 0; width: 100%; height: 58px; flex-direction: row; align-items: center; justify-content: center; padding: 6px max(10px, env(safe-area-inset-right)) max(6px, env(safe-area-inset-bottom)) max(10px, env(safe-area-inset-left)); box-shadow: inset 0 1px var(--web-line); }
  .web-brand, .web-profile { display: none; }
  .web-sidebar nav, .web-sidebar-scroll { width: 100%; height: auto; }
  .web-sidebar-section { display: flex; justify-content: center; gap: 8px; margin: 0; }
  .web-nav-button:not(#better-codex-entry):not(#better-codex-agents-entry) { display: none; }
  .web-nav-button { display: grid; grid-template-columns: 20px auto; width: min(150px, calc(50vw - 18px)); min-height: 42px; justify-content: center; gap: 7px; padding: 0 12px; }
  .web-nav-button .text-fade-truncate { display: block; }
}
@media (prefers-reduced-motion: reduce) { .web-sidebar *, .web-native-view *, .web-connect * { transition-duration: .01ms !important; } }
html[data-better-codex-read-only] .better-codex-create-split,
html[data-better-codex-read-only] .better-codex-column-icon,
html[data-better-codex-read-only] [data-add-status],
html[data-better-codex-read-only] #better-codex-agents-entry,
html[data-better-codex-read-only] [data-pin],
html[data-better-codex-read-only] [data-card-more] { display: none !important; }
`;

const webHostJavaScript = String.raw`
const connectDialog = document.getElementById("web-connect");
const connectForm = document.getElementById("web-connect-form");
const tokenInput = document.getElementById("web-token");
const usernameInput = document.getElementById("web-username");
const connectError = document.getElementById("web-connect-error");
let installing = false;
const REMOTE = document.documentElement.dataset.betterCodexRemote === "true";
let sessionToken = REMOTE ? "" : sessionStorage.getItem("better-codex-web-session") || "";
let csrfToken = REMOTE ? sessionStorage.getItem("better-codex-web-csrf") || "" : "";
const eventCursorKey = "better-codex-web-event-cursor";

function consumeFragmentToken() {
  const params = new URLSearchParams(location.hash.replace(/^#/, ""));
  const token = params.get("token") || "";
  if (token) history.replaceState(history.state, "", location.pathname + location.search);
  return REMOTE ? "" : token;
}

async function establishSession(token) {
  const response = await fetch("/web/session", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(REMOTE ? { username: usernameInput?.value.trim() || "", password: token } : { token }),
  });
  if (!response.ok) throw new Error(REMOTE ? "密码无效或登录请求过于频繁" : "令牌无效，请重新运行 better-codex web");
  const session = await response.json();
  if (REMOTE) {
    if (typeof session.csrf_token !== "string" || !session.csrf_token) throw new Error("Hub 未返回有效的 Web 会话");
    csrfToken = session.csrf_token;
    sessionStorage.setItem("better-codex-web-csrf", csrfToken);
  } else {
    if (typeof session.token !== "string" || !session.token) throw new Error("Runtime 未返回有效的 Web 会话");
    sessionToken = session.token;
    sessionStorage.setItem("better-codex-web-session", sessionToken);
  }
}

async function restoreRemoteSession() {
  const response = await fetch("/web/session");
  if (!response.ok) throw new Error("Web 会话已失效，请重新登录");
  const session = await response.json();
  if (typeof session.csrf_token !== "string" || !session.csrf_token) throw new Error("Hub 未返回有效的 Web 会话");
  csrfToken = session.csrf_token;
  sessionStorage.setItem("better-codex-web-csrf", csrfToken);
}

function expireSession() {
  sessionToken = "";
  csrfToken = "";
  sessionStorage.removeItem("better-codex-web-session");
  sessionStorage.removeItem("better-codex-web-csrf");
  window.__betterCodexInjection__?.destroy?.();
  connectError.textContent = REMOTE ? "Web 会话已失效，请重新登录" : "Web 会话已失效，请重新运行 better-codex web";
  connectError.hidden = false;
  if (!connectDialog.open) connectDialog.showModal();
}

async function requestRuntime(request) {
  if (typeof request.path !== "string" || !request.path.startsWith("/api/")) {
    throw new Error("invalid_bridge_request");
  }
  const method = String(request.method || "GET").toUpperCase();
  if (method !== "GET" && !request.commandId) request.commandId = crypto.randomUUID();
  const headers = REMOTE ? {} : { authorization: "Bearer " + sessionToken };
  if (REMOTE && method !== "GET") headers["x-csrf-token"] = csrfToken;
  if (request.commandId) headers["x-better-codex-command-id"] = request.commandId;
  if (request.body !== undefined) headers["content-type"] = "application/json";
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const response = await fetch(request.path, { method, headers, body: request.body, signal: controller.signal });
    let value;
    try { value = await response.json(); }
    catch { value = { error: response.statusText || "request_failed" }; }
    if (response.status === 401) setTimeout(expireSession, 0);
    if (!response.ok) throw new Error(value.error || response.statusText || "request_failed");
    return value;
  } catch (error) {
    if (error?.name === "AbortError") throw new Error("runtime_bridge_timeout");
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function eventBlock(block, listener) {
  let event = "message";
  let id = "";
  const data = [];
  for (const line of block.split("\n")) {
    if (line.startsWith("event:")) event = line.slice(6).trim();
    else if (line.startsWith("id:")) id = line.slice(3).trim();
    else if (line.startsWith("data:")) data.push(line.slice(5).trimStart());
  }
  if (id) sessionStorage.setItem(eventCursorKey, id);
  if (!data.length) return;
  let value = {};
  try { value = JSON.parse(data.join("\n")); } catch {}
  listener({ event, id, data: value });
}

function subscribeRuntime(listener) {
  let stopped = false;
  let controller = null;
  const connect = async () => {
    let delay = 250;
    while (!stopped) {
      controller = new AbortController();
      try {
        const headers = REMOTE ? {} : { authorization: "Bearer " + sessionToken };
        const cursor = sessionStorage.getItem(eventCursorKey);
        if (cursor) headers["last-event-id"] = cursor;
        const response = await fetch("/api/events", { headers, signal: controller.signal });
        if (response.status === 401) {
          expireSession();
          return;
        }
        if (!response.ok || !response.body) throw new Error("runtime_events_unavailable");
        delay = 250;
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        while (!stopped) {
          const result = await reader.read();
          buffer += decoder.decode(result.value || new Uint8Array(), { stream: !result.done }).replace(/\r\n/g, "\n");
          let boundary = buffer.indexOf("\n\n");
          while (boundary >= 0) {
            eventBlock(buffer.slice(0, boundary), listener);
            buffer = buffer.slice(boundary + 2);
            boundary = buffer.indexOf("\n\n");
          }
          if (result.done) break;
        }
      } catch (error) {
        if (stopped || error?.name === "AbortError") return;
      }
      if (!stopped) {
        await new Promise(resolve => setTimeout(resolve, delay));
        delay = Math.min(delay * 2, 3000);
      }
    }
  };
  void connect();
  return () => {
    stopped = true;
    controller?.abort();
  };
}

window.betterCodexHost = Object.freeze({
  version: 1,
  kind: "web",
  capabilities: Object.freeze({ issues: "read-write", agents: "read-write", liveUpdates: true, nativeThreads: false }),
  request: requestRuntime,
  subscribe: subscribeRuntime,
});

window.betterCodexRequest = payload => {
  let request;
  try { request = JSON.parse(payload); }
  catch { return; }
  requestRuntime(request)
    .then(value => window.__betterCodexBridgeResolve?.(request.id, { ok: true, value }))
    .catch(error => window.__betterCodexBridgeResolve?.(request.id, { ok: false, value: { error: error.message || "runtime_unavailable" } }));
};

function loadInjection() {
  if (installing || window.__betterCodexInjection__) return;
  installing = true;
  const script = document.createElement("script");
  script.src = "/web/injection.js?locale=" + encodeURIComponent(navigator.language || document.documentElement.lang || "en") + (REMOTE ? "" : "&session=" + encodeURIComponent(sessionToken));
  script.onload = () => {
    installing = false;
    connectDialog.close();
    if (!location.pathname.startsWith("/local/")) window.__betterCodexInjection__?.open?.("issues");
  };
  script.onerror = () => {
    installing = false;
    if (!connectDialog.open) connectDialog.showModal();
  };
  document.head.appendChild(script);
}

async function boot(token = "") {
  try {
    if (token) await establishSession(token);
    if (REMOTE && !csrfToken) await restoreRemoteSession();
    if (!REMOTE && !sessionToken) throw new Error("请运行 better-codex web 获取本地访问令牌");
    loadInjection();
  } catch (error) {
    connectError.textContent = error instanceof Error ? error.message : "连接失败";
    connectError.hidden = false;
    if (!connectDialog.open) connectDialog.showModal();
  }
}

connectForm.addEventListener("submit", event => {
  event.preventDefault();
  connectError.hidden = true;
  void boot(tokenInput.value.trim());
});

window.addEventListener("message", event => {
  if (event.origin !== location.origin || event.data?.type !== "navigate-to-route") return;
  const path = String(event.data.path || "");
  if (path.startsWith("/local/")) history.pushState({ betterCodexThread: true }, "", path);
  else if (path) history.pushState({ betterCodex: true }, "", "/web");
});

window.addEventListener("popstate", () => {
  if (location.pathname === "/web" || location.pathname === "/") window.__betterCodexInjection__?.open?.("issues");
  else window.__betterCodexInjection__?.refresh?.();
});

document.getElementById("web-back-to-board").addEventListener("click", () => {
  history.pushState({ betterCodex: true }, "", "/web");
  window.__betterCodexInjection__?.open?.("issues");
});

const theme = localStorage.getItem("better-codex-web-theme");
if (theme === "dark" || (!theme && matchMedia("(prefers-color-scheme: dark)").matches)) document.documentElement.dataset.theme = "dark";
document.getElementById("web-theme").addEventListener("click", () => {
  const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  document.documentElement.dataset.theme = next;
  localStorage.setItem("better-codex-web-theme", next);
});

void boot(consumeFragmentToken());
`;

export function betterCodexWebHostHtml(remote = false) {
  return remote
    ? webHostHtml
      .replace('<html lang="zh-CN">', '<html lang="zh-CN" data-better-codex-remote="true">')
      .replace("本地工作台", "远端工作台")
      .replace("Local connection", "Self-hosted Hub")
      .replace("请运行 <code>better-codex web</code> 自动打开，或粘贴本地访问令牌。令牌只用于连接本机 Runtime。", "输入 Web 访问密码以管理经过隐私裁剪的远端看板投影。")
      .replace('<label><span>访问令牌</span>', '<label><span>账户</span><input id="web-username" type="text" autocomplete="username" spellcheck="false" required></label><label><span>访问令牌</span>')
      .replace("访问令牌", "访问密码")
      .replace('autocomplete="off"', 'autocomplete="current-password"')
    : webHostHtml;
}

export function betterCodexWebHostCss() {
  return webHostCss;
}

export function betterCodexWebHostJavaScript(remote = false) {
  if (!remote) return webHostJavaScript;
  return webHostJavaScript
    .replace('kind: "web",', 'kind: "remote",')
    .replace('issues: "read-write", agents: "read-write", liveUpdates: true, nativeThreads: false', 'issues: "read-write", agents: "read-only", liveUpdates: true, nativeThreads: false')
    .replaceAll("Runtime", "Hub")
    .replaceAll("better-codex web", "Hub 管理命令");
}
