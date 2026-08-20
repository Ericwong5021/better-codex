import { betterCodexLogoPng } from "./brand-assets.js";
import { betterCodexWebAppRegistrationJavaScript } from "./web-app.js";

const betterCodexLogoUrl = `data:image/png;base64,${betterCodexLogoPng().toString("base64")}`;

export type BetterCodexWebHostKind = "local" | "remote-projection" | "relay";

function webHostKind(value: boolean | BetterCodexWebHostKind) {
  if (value === true) return "remote-projection";
  if (value === false) return "local";
  return value;
}

const webHostHtml = String.raw`<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <meta name="color-scheme" content="light dark">
  <meta name="theme-color" content="#f7f7f6" media="(prefers-color-scheme: light)">
  <meta name="theme-color" content="#191918" media="(prefers-color-scheme: dark)">
  <meta name="referrer" content="no-referrer">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-title" content="Better Codex">
  <title>Better Codex</title>
  <link rel="icon" type="image/png" href="${betterCodexLogoUrl}">
  <link rel="apple-touch-icon" href="/better-codex-icon-192.png">
  <link rel="manifest" href="/web/manifest.webmanifest">
  <link rel="stylesheet" href="/web/host.css">
</head>
<body>
  <a class="web-skip-link" href="#web-main">跳到主要内容</a>
  <div class="web-shell">
    <aside id="web-sidebar" class="web-sidebar" aria-label="Better Codex 导航">
      <header class="web-brand">
        <img class="web-brand-logo" src="${betterCodexLogoUrl}" alt="">
        <strong>Better Codex</strong>
        <button id="web-install" class="web-icon-button" type="button" aria-label="安装 Better Codex" hidden>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12"></path><path d="m7 10 5 5 5-5"></path><path d="M5 21h14"></path></svg>
        </button>
        <button id="web-sidebar-collapse" class="web-icon-button web-sidebar-collapse" type="button" aria-label="收起侧边栏" aria-controls="web-sidebar">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2"></rect><path d="M9 3v18"></path><path d="m16 9-3 3 3 3"></path></svg>
        </button>
      </header>
      <nav role="navigation" aria-label="主导航">
        <div class="web-sidebar-scroll" data-app-action-sidebar-scroll>
          <div class="web-sidebar-section" data-app-action-sidebar-section></div>
        </div>
      </nav>
      <footer class="web-account">
        <button id="web-profile" class="web-profile" type="button" aria-expanded="false" aria-controls="web-usage">
          <span id="web-avatar" class="web-avatar"><span id="web-avatar-initials">你</span><i class="web-online" aria-hidden="true"></i></span>
          <span><strong id="web-profile-name">你</strong><small id="web-profile-kind">Codex 账户</small></span>
          <svg class="web-profile-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"></path></svg>
        </button>
        <button id="web-theme" class="web-icon-button web-account-theme" type="button" aria-label="切换深色模式">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4"></circle><path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.66 6.34l1.41-1.41"></path></svg>
        </button>
        <section id="web-usage" class="web-usage" aria-live="polite" hidden>
          <div class="web-usage-heading">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><path d="M3 3v5h5"></path></svg>
            <strong id="web-usage-title">剩余用量</strong>
          </div>
          <div id="web-usage-body" class="web-usage-body"><span class="web-usage-status">点击查看 Codex 额度</span></div>
        </section>
      </footer>
    </aside>
    <main id="web-main" class="web-main">
      <button id="web-sidebar-expand" class="web-icon-button web-sidebar-expand" type="button" aria-label="展开侧边栏" aria-controls="web-sidebar">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2"></rect><path d="M9 3v18"></path><path d="m14 9 3 3-3 3"></path></svg>
      </button>
      <div class="web-surface" data-better-codex-web-surface>
        <div class="web-native-layout" data-app-shell-main-content-layout>
          <div class="app-shell-main-content-frame">
            <section class="web-board-loading" role="status" aria-live="polite">
              <span aria-hidden="true"></span>
              <strong>正在加载任务看板</strong>
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
  <dialog id="web-error-report" class="web-error-report" aria-labelledby="web-error-report-title" aria-describedby="web-error-report-description">
    <div class="web-error-report-shell">
      <header><span class="web-error-report-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 9v4"></path><path d="M12 17h.01"></path><path d="M10.3 3.6 2.4 17.2A2 2 0 0 0 4.1 20h15.8a2 2 0 0 0 1.7-2.8L13.7 3.6a2 2 0 0 0-3.4 0Z"></path></svg></span><div><h2 id="web-error-report-title">错误报告</h2><p id="web-error-report-description">完整错误、请求信息和相关日志已保留，可直接复制给开发者。</p></div><button type="button" data-web-error-close aria-label="关闭"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="m6 6 12 12M18 6 6 18"></path></svg></button></header>
      <section class="web-error-report-summary"><strong data-web-error-message>发生了一个错误</strong><span data-web-error-time></span></section>
      <pre data-web-error-detail tabindex="0"></pre>
      <footer><div class="web-error-report-navigation"><button type="button" data-web-error-previous>上一条</button><output data-web-error-counter>1 / 1</output><button type="button" data-web-error-next>下一条</button></div><div class="web-error-report-actions"><button type="button" data-web-error-dismiss>移除当前错误</button><button type="button" data-web-error-copy-all>复制全部错误</button><button class="is-primary" type="button" data-web-error-copy>复制当前错误</button></div></footer>
    </div>
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
.web-skip-link, .web-sidebar, .web-sidebar *, .web-board-loading, .web-board-loading *, .web-connect, .web-connect *, .web-error-report, .web-error-report * { box-sizing: border-box; }
.web-sidebar button, .web-connect button, .web-connect input, .web-error-report button { font: inherit; }
.web-sidebar button, .web-connect button, .web-error-report button { color: inherit; touch-action: manipulation; }
.web-sidebar button:active, .web-connect button:active, .web-error-report button:active:not(:disabled) { transform: scale(.96); }
.web-sidebar button:focus-visible, .web-connect button:focus-visible, .web-connect input:focus-visible, .web-error-report button:focus-visible, .web-error-report pre:focus-visible { outline: 2px solid var(--web-focus); outline-offset: 2px; }
.web-skip-link { position: fixed; z-index: 100; top: 8px; left: 8px; transform: translateY(-150%); border-radius: 8px; padding: 8px 12px; color: var(--web-canvas); background: var(--web-ink); }
.web-skip-link:focus { transform: translateY(0); }
.web-shell { display: grid; grid-template-columns: 244px minmax(0, 1fr); width: 100%; height: 100%; }
.web-sidebar { display: flex; min-width: 0; flex-direction: column; padding: 10px; background: var(--web-sidebar); box-shadow: inset -1px 0 var(--web-line); }
.web-brand { display: flex; min-height: 48px; align-items: center; gap: 10px; padding: 4px 6px 8px; }
.web-brand strong { margin-right: auto; font-size: 15px; font-weight: 650; }
.web-brand-logo { display: block; width: 30px; height: 30px; flex: 0 0 auto; border-radius: 9px; object-fit: contain; }
.web-brand-logo.is-large { width: 46px; height: 46px; margin-bottom: 24px; border-radius: 14px; }
.web-icon-button { display: grid; width: 34px; height: 34px; border: 0; border-radius: 9px; padding: 8px; place-items: center; background: transparent; cursor: pointer; }
.web-icon-button[hidden] { display: none; }
.web-icon-button svg { width: 17px; height: 17px; }
.web-sidebar-expand { position: absolute; z-index: 40; top: 11px; left: 14px; display: none; box-sizing: border-box; width: 30px; height: 30px; border-radius: 8px; padding: 6px; background: var(--web-sidebar); box-shadow: 0 1px 3px rgb(0 0 0 / .1); }
.web-sidebar nav { min-height: 0; flex: 1; }
.web-sidebar-scroll { height: 100%; overflow: auto; }
.web-sidebar-section { display: grid; gap: 3px; margin-top: 10px; }
.web-nav-button { display: grid; grid-template-columns: 20px minmax(0, 1fr); width: 100%; min-height: 38px; align-items: center; gap: 8px; border: 0; border-radius: 10px; padding: 0 10px; background: transparent; text-align: left; cursor: pointer; transition: background-color 120ms cubic-bezier(.16,1,.3,1), transform 120ms cubic-bezier(.16,1,.3,1); }
.web-nav-button svg { width: 16px; height: 16px; }
.text-fade-truncate { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.web-account { position: relative; border-radius: 12px; background: transparent; }
.web-account:has(.web-profile[aria-expanded="true"]) { background: var(--web-hover); }
.web-profile { position: relative; z-index: 1; display: grid; grid-template-columns: 30px minmax(0, 1fr); width: 100%; min-height: 48px; align-items: center; gap: 9px; border: 0; border-radius: 10px; padding: 6px 70px 6px 6px; background: transparent; text-align: left; cursor: pointer; }
.web-account-theme { position: absolute; z-index: 2; top: 7px; right: 27px; }
.web-avatar { position: relative; display: grid; width: 28px; height: 28px; place-items: center; border-radius: 50%; color: #fff; background: #2fa15f; font-size: 9px; font-weight: 700; }
.web-profile > span:nth-child(2) { display: flex; min-width: 0; flex-direction: column; gap: 2px; }
.web-profile strong, .web-profile small { overflow: hidden; white-space: nowrap; }
.web-profile strong { font-size: 11px; font-weight: 620; }
.web-profile small { color: var(--web-muted); font-size: 9px; }
.web-online { position: absolute; right: -1px; bottom: -1px; width: 7px; height: 7px; border: 2px solid var(--web-sidebar); border-radius: 50%; background: #2fa15f; }
.web-profile-chevron { position: absolute; top: 17px; right: 6px; width: 14px; height: 14px; color: var(--web-muted); }
.web-profile[aria-expanded="true"] .web-profile-chevron { transform: rotate(90deg); }
.web-usage { margin: 0 6px; border-top: 1px solid var(--web-line); padding: 9px 4px 10px; }
.web-usage[hidden] { display: none; }
.web-usage-heading { display: flex; align-items: center; gap: 6px; color: var(--web-muted); font-size: 10px; }
.web-usage-heading svg { width: 13px; height: 13px; }
.web-usage-heading strong { font-weight: 590; }
.web-usage-body { display: grid; gap: 10px; margin-top: 9px; }
.web-usage-status { color: var(--web-muted); font-size: 10px; line-height: 1.5; }
.web-usage-window { display: grid; gap: 6px; }
.web-usage-row { display: flex; min-width: 0; align-items: baseline; justify-content: space-between; gap: 8px; font-size: 10px; }
.web-usage-row > span:first-child { font-weight: 620; }
.web-usage-value { display: flex; min-width: 0; align-items: baseline; gap: 6px; color: var(--web-muted); }
.web-usage-value strong { color: var(--web-ink); font-size: 11px; font-weight: 650; font-variant-numeric: tabular-nums; }
.web-usage-value small { overflow: hidden; white-space: nowrap; font-size: 9px; }
.web-usage-progress { width: 100%; height: 3px; border: 0; border-radius: 999px; overflow: hidden; background: var(--web-line); appearance: none; }
.web-usage-progress::-webkit-progress-bar { border-radius: 999px; background: var(--web-line); }
.web-usage-progress::-webkit-progress-value { border-radius: 999px; background: #2fa15f; }
.web-usage-progress::-moz-progress-bar { border-radius: 999px; background: #2fa15f; }
.web-main, .web-surface { min-width: 0; min-height: 0; height: 100%; }
.web-main { position: relative; }
.web-surface { position: relative; }
.web-native-layout, .app-shell-main-content-frame { width: 100%; height: 100%; }
.web-board-loading { display: flex; height: 100%; align-items: center; justify-content: center; flex-direction: column; gap: 12px; color: var(--web-muted); font-size: 12px; }
.web-board-loading > span { width: 24px; height: 24px; border: 2px solid var(--web-line); border-top-color: var(--web-ink); border-radius: 50%; animation: web-board-loading-spin .8s linear infinite; }
.web-board-loading strong { font-weight: 560; }
@keyframes web-board-loading-spin { to { transform: rotate(360deg); } }
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
.web-error-report { width: min(820px, calc(100vw - 48px)); height: min(82dvh, 760px); max-height: calc(100dvh - 48px); overflow: hidden; border: 0; border-radius: 20px; padding: 0; color: var(--web-ink); background: var(--web-raised); box-shadow: 0 20px 60px rgb(0 0 0 / .2), 0 3px 12px rgb(0 0 0 / .08); overscroll-behavior: contain; }
.web-error-report::backdrop { background: rgb(24 24 22 / .32); }
.web-error-report-shell { display: flex; height: 100%; min-height: 0; flex-direction: column; }
.web-error-report header { display: grid; grid-template-columns: 40px minmax(0, 1fr) 40px; gap: 12px; align-items: start; padding: 20px 20px 16px; }
.web-error-report-icon, .web-error-report header > button { display: grid; width: 40px; height: 40px; border: 0; border-radius: 12px; padding: 0; place-items: center; }
.web-error-report-icon { color: #d34e4e; background: color-mix(in srgb, #d34e4e 12%, transparent); }
.web-error-report header > button { color: var(--web-muted); background: transparent; cursor: pointer; }
.web-error-report svg { width: 18px; height: 18px; }
.web-error-report h2 { margin: 1px 0 0; font-size: 18px; font-weight: 650; line-height: 1.35; }
.web-error-report header p { max-width: 62ch; margin: 4px 0 0; color: var(--web-muted); font-size: 11px; line-height: 1.65; }
.web-error-report-summary { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; padding: 0 20px 12px; }
.web-error-report-summary strong { min-width: 0; overflow-wrap: anywhere; color: #d34e4e; font-size: 12px; font-weight: 600; }
.web-error-report-summary span { flex: 0 0 auto; color: var(--web-muted); font-size: 10px; font-variant-numeric: tabular-nums; }
.web-error-report pre { min-height: 0; flex: 1; margin: 0 20px; overflow: auto; border: 0; border-radius: 12px; padding: 14px; color: var(--web-ink); background: var(--web-hover); box-shadow: inset 0 0 0 1px var(--web-line); font: 12px/1.6 ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace; overflow-wrap: anywhere; tab-size: 2; white-space: pre-wrap; }
.web-error-report footer { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 16px 20px 20px; }
.web-error-report-navigation, .web-error-report-actions { display: flex; align-items: center; gap: 8px; }
.web-error-report-navigation output { min-width: 52px; color: var(--web-muted); font-size: 11px; font-variant-numeric: tabular-nums; text-align: center; }
.web-error-report footer button { min-height: 40px; border: 0; border-radius: 10px; padding: 0 12px; background: var(--web-hover); font-size: 11px; font-weight: 550; cursor: pointer; transition: transform 120ms cubic-bezier(.16,1,.3,1), background-color 120ms cubic-bezier(.16,1,.3,1); }
.web-error-report footer button.is-primary { color: var(--web-canvas); background: var(--web-ink); }
.web-error-report footer button:disabled { cursor: default; opacity: .42; }
@media (hover:hover) { .web-nav-button:hover, .web-icon-button:hover, .web-profile:hover, .web-error-report button:hover:not(:disabled) { background: var(--web-hover); } .web-error-report footer button.is-primary:hover:not(:disabled) { color: var(--web-canvas); background: color-mix(in srgb, var(--web-ink) 86%, #000); } }
@media (min-width: 721px) {
  html[data-web-sidebar-collapsed="true"] .web-shell { grid-template-columns: minmax(0, 1fr); }
  html[data-web-sidebar-collapsed="true"] .web-sidebar { display: none; }
  html[data-web-sidebar-collapsed="true"] .web-sidebar-expand { display: grid; }
  html[data-web-sidebar-collapsed="true"] #better-codex-panel .better-codex-toolbar { padding-left: 58px; }
}
@media (max-width: 720px) {
  .web-shell { display: block; }
  .web-main { width: 100%; height: calc(100% - 58px); }
  .web-sidebar { position: fixed; z-index: 50; right: 0; bottom: 0; left: 0; width: 100%; height: 58px; flex-direction: row; align-items: center; justify-content: center; padding: 6px max(10px, env(safe-area-inset-right)) max(6px, env(safe-area-inset-bottom)) max(10px, env(safe-area-inset-left)); box-shadow: inset 0 1px var(--web-line); }
  .web-brand, .web-account, .web-sidebar-expand { display: none; }
  .web-sidebar nav, .web-sidebar-scroll { width: 100%; height: auto; }
  .web-sidebar-section { display: flex; justify-content: center; gap: 8px; margin: 0; }
  .web-nav-button:not(#better-codex-entry):not(#better-codex-agents-entry):not(#better-codex-projects-entry) { display: none; }
  .web-nav-button { display: grid; grid-template-columns: 20px auto; width: min(150px, calc(50vw - 18px)); min-height: 42px; justify-content: center; gap: 7px; padding: 0 12px; }
  .web-sidebar-section:has(#better-codex-projects-entry) .web-nav-button { width: min(132px, calc(33.333vw - 12px)); }
  .web-nav-button .text-fade-truncate { display: block; }
  .web-error-report { width: calc(100vw - 20px); height: min(90dvh, 760px); max-height: calc(100dvh - 20px); }
  .web-error-report header { grid-template-columns: 36px minmax(0, 1fr) 36px; gap: 8px; padding: 16px; }
  .web-error-report-icon, .web-error-report header > button { width: 36px; height: 36px; }
  .web-error-report-summary { align-items: flex-start; flex-direction: column; gap: 4px; padding: 0 16px 12px; }
  .web-error-report pre { margin-inline: 16px; padding: 12px; font-size: 11px; }
  .web-error-report footer { align-items: stretch; flex-direction: column; padding: 12px 16px max(16px, env(safe-area-inset-bottom)); }
  .web-error-report-navigation, .web-error-report-actions { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .web-error-report footer button { min-width: 0; padding-inline: 8px; }
}
@media (prefers-reduced-motion: reduce) { .web-sidebar *, .web-board-loading *, .web-connect *, .web-error-report * { transition-duration: .01ms !important; animation-duration: 1.6s !important; } }
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
const webErrorDialog = document.getElementById("web-error-report");
const installButton = document.getElementById("web-install");
const sidebarCollapseButton = document.getElementById("web-sidebar-collapse");
const sidebarExpandButton = document.getElementById("web-sidebar-expand");
const profileButton = document.getElementById("web-profile");
const profileName = document.getElementById("web-profile-name");
const profileKind = document.getElementById("web-profile-kind");
const profileAvatar = document.getElementById("web-avatar");
const profileAvatarInitials = document.getElementById("web-avatar-initials");
const usagePanel = document.getElementById("web-usage");
const usageTitle = document.getElementById("web-usage-title");
const usageBody = document.getElementById("web-usage-body");
let installing = false;
const HOST_KIND = document.documentElement.dataset.betterCodexHost || (document.documentElement.dataset.betterCodexRemote === "true" ? "remote-projection" : "local");
const REMOTE = HOST_KIND !== "local";
const RELAY = HOST_KIND === "relay";
const SESSION_PATH = RELAY ? "/relay/session" : "/web/session";
let sessionToken = REMOTE ? "" : sessionStorage.getItem("better-codex-web-session") || "";
let csrfToken = REMOTE ? sessionStorage.getItem("better-codex-web-csrf") || "" : "";
const eventCursorKey = "better-codex-web-event-cursor";
let profileLocale = "zh-CN";
let usageLoadedAt = 0;
let usageLoading = false;
let cachedUsage;
let installPrompt;
let relayRetryTimer;
let relayOfflineReported = false;
const hostDiagnosticLog = [];
const hostErrorQueue = [];
let hostErrorIndex = 0;

function profileText(zh, en) {
  return profileLocale === "zh-CN" ? zh : en;
}

function hostDiagnostic(event, fields = {}) {
  hostDiagnosticLog.push({ time: new Date().toISOString(), event, ...fields });
  if (hostDiagnosticLog.length > 80) hostDiagnosticLog.splice(0, hostDiagnosticLog.length - 80);
}

function hostErrorReport(records) {
  return JSON.stringify({ report: "Better Codex error report", exported_at: new Date().toISOString(), errors: records }, null, 2);
}

async function copyHostError(value) {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(value);
  const input = document.createElement("textarea");
  input.value = value;
  input.style.position = "fixed";
  input.style.opacity = "0";
  document.body.appendChild(input);
  input.select();
  document.execCommand("copy");
  input.remove();
}

function renderHostError() {
  if (!hostErrorQueue.length) return;
  hostErrorIndex = Math.max(0, Math.min(hostErrorIndex, hostErrorQueue.length - 1));
  const record = hostErrorQueue[hostErrorIndex];
  webErrorDialog.querySelector("[data-web-error-message]").textContent = record.message;
  webErrorDialog.querySelector("[data-web-error-time]").textContent = new Date(record.time).toLocaleString(profileLocale === "zh-CN" ? "zh-CN" : "en-US");
  webErrorDialog.querySelector("[data-web-error-counter]").textContent = String(hostErrorIndex + 1) + " / " + String(hostErrorQueue.length);
  webErrorDialog.querySelector("[data-web-error-detail]").textContent = hostErrorReport([record]);
  webErrorDialog.querySelector("[data-web-error-previous]").disabled = hostErrorIndex === 0;
  webErrorDialog.querySelector("[data-web-error-next]").disabled = hostErrorIndex >= hostErrorQueue.length - 1;
}

function reportHostError(error, context = {}, present = true) {
  const value = error instanceof Error ? error : new Error(String(error || "request_failed"));
  if (value.betterCodexReported) return;
  if (window.__betterCodexInjection__?.reportError) {
    window.dispatchEvent(new CustomEvent("better-codex:error", { detail: { error: value, diagnostics: value.betterCodexDiagnostics || {}, source: context.source || "web_host", context } }));
    return;
  }
  try { Object.defineProperty(value, "betterCodexReported", { value: true, configurable: true }); } catch {}
  hostDiagnostic("error_reported", { message: value.message, source: context.source || "web_host" });
  const fingerprint = [value.message || "request_failed", context.source || "web_host", context.path || ""].join("|");
  const repeatedIndex = hostErrorQueue.findIndex(item => item.fingerprint === fingerprint);
  if (repeatedIndex >= 0) {
    const repeated = hostErrorQueue[repeatedIndex];
    repeated.occurrences += 1;
    repeated.occurrence_times.push(new Date().toISOString());
    if (repeated.occurrence_times.length > 20) repeated.occurrence_times.shift();
    repeated.related_logs = hostDiagnosticLog.slice(-30);
    hostErrorIndex = repeatedIndex;
    renderHostError();
    if (present && !webErrorDialog.open) webErrorDialog.showModal();
    return;
  }
  hostErrorQueue.push({
    id: crypto.randomUUID(),
    fingerprint,
    time: new Date().toISOString(),
    name: value.name || "Error",
    message: value.message || "request_failed",
    stack: String(value.stack || "").slice(0, 12000),
    context,
    diagnostics: value.betterCodexDiagnostics || {},
    environment: { host_kind: HOST_KIND, path: location.pathname, online: navigator.onLine, user_agent: navigator.userAgent, viewport: String(innerWidth) + "x" + String(innerHeight) },
    related_logs: hostDiagnosticLog.slice(-30),
    occurrences: 1,
    occurrence_times: [new Date().toISOString()],
  });
  if (hostErrorQueue.length > 50) hostErrorQueue.shift();
  hostErrorIndex = hostErrorQueue.length - 1;
  renderHostError();
  if (present && !webErrorDialog.open) webErrorDialog.showModal();
  if (present) webErrorDialog.querySelector("[data-web-error-copy]").focus();
}

const copyHostRecords = async (button, records) => {
  const label = button.textContent;
  try {
    await copyHostError(hostErrorReport(records));
    button.textContent = profileText("已复制", "Copied");
  } catch {
    button.textContent = profileText("复制失败", "Copy failed");
  }
  setTimeout(() => { if (button.isConnected) button.textContent = label; }, 1600);
};

webErrorDialog.querySelector("[data-web-error-close]").addEventListener("click", () => webErrorDialog.close());
webErrorDialog.querySelector("[data-web-error-previous]").addEventListener("click", () => { hostErrorIndex -= 1; renderHostError(); });
webErrorDialog.querySelector("[data-web-error-next]").addEventListener("click", () => { hostErrorIndex += 1; renderHostError(); });
webErrorDialog.querySelector("[data-web-error-copy]").addEventListener("click", event => void copyHostRecords(event.currentTarget, [hostErrorQueue[hostErrorIndex]]));
webErrorDialog.querySelector("[data-web-error-copy-all]").addEventListener("click", event => void copyHostRecords(event.currentTarget, hostErrorQueue));
webErrorDialog.querySelector("[data-web-error-dismiss]").addEventListener("click", () => {
  hostErrorQueue.splice(hostErrorIndex, 1);
  if (!hostErrorQueue.length) return webErrorDialog.close();
  hostErrorIndex = Math.min(hostErrorIndex, hostErrorQueue.length - 1);
  renderHostError();
});
webErrorDialog.addEventListener("cancel", event => { event.preventDefault(); webErrorDialog.close(); });
webErrorDialog.addEventListener("click", event => {
  if (event.target !== webErrorDialog) return;
  const bounds = webErrorDialog.getBoundingClientRect();
  if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) webErrorDialog.close();
});
window.addEventListener("error", event => reportHostError(event.error || event.message, { source: "window_error", filename: event.filename || "", line: event.lineno || 0, column: event.colno || 0 }));
window.addEventListener("unhandledrejection", event => reportHostError(event.reason, { source: "unhandled_rejection" }));

function updateWebProfile(detail) {
  const user = detail?.user && typeof detail.user === "object" ? detail.user : {};
  profileLocale = detail?.locale === "en" ? "en" : "zh-CN";
  const name = typeof user.name === "string" && user.name.trim() ? user.name.trim() : profileText("你", "You");
  const initials = typeof user.initials === "string" && user.initials.trim() ? user.initials.trim().slice(0, 2) : name.slice(0, 2);
  profileName.textContent = name;
  profileName.title = name;
  profileAvatarInitials.textContent = initials;
  if (typeof user.color === "string" && /^#[0-9a-f]{6}$/i.test(user.color)) profileAvatar.style.backgroundColor = user.color;
  profileKind.textContent = profileText("Codex 账户", "Codex account");
  installButton.setAttribute("aria-label", profileText("安装 Better Codex", "Install Better Codex"));
  usageTitle.textContent = profileText("剩余用量", "Usage remaining");
  profileButton.setAttribute("aria-label", profileText("查看 Codex 额度", "View Codex usage"));
  if (usageLoadedAt) renderUsage(cachedUsage);
}

function usageWindowLabel(minutes) {
  if (minutes % 10080 === 0) {
    const weeks = Math.round(minutes / 10080);
    return profileLocale === "zh-CN" ? weeks + "周" : weeks + (weeks === 1 ? " week" : " weeks");
  }
  if (minutes % 1440 === 0) {
    const days = Math.round(minutes / 1440);
    return profileLocale === "zh-CN" ? days + "天" : days + (days === 1 ? " day" : " days");
  }
  const hours = Math.max(1, Math.round(minutes / 60));
  return profileLocale === "zh-CN" ? hours + "小时" : hours + (hours === 1 ? " hour" : " hours");
}

function usageResetLabel(timestamp) {
  const date = new Date(Number(timestamp) * 1000);
  if (!Number.isFinite(date.getTime())) return "";
  const value = date.toLocaleDateString(profileLocale === "zh-CN" ? "zh-CN" : "en-US", { month: "short", day: "numeric" });
  return profileLocale === "zh-CN" ? value + "重置" : "Resets " + value;
}

function renderUsageWindow(value) {
  const item = document.createElement("div");
  item.className = "web-usage-window";
  const row = document.createElement("div");
  row.className = "web-usage-row";
  const duration = document.createElement("span");
  duration.textContent = usageWindowLabel(Number(value.windowDurationMins));
  const summary = document.createElement("span");
  summary.className = "web-usage-value";
  const remaining = document.createElement("strong");
  remaining.textContent = String(Number(value.remainingPercent)) + "%";
  const reset = document.createElement("small");
  reset.textContent = usageResetLabel(value.resetsAt);
  summary.append(remaining, reset);
  row.append(duration, summary);
  const progress = document.createElement("progress");
  progress.className = "web-usage-progress";
  progress.max = 100;
  progress.value = Number(value.remainingPercent);
  progress.setAttribute("aria-label", duration.textContent + " " + profileText("剩余额度", "usage remaining"));
  item.append(row, progress);
  return item;
}

function renderUsage(usage) {
  usageBody.replaceChildren();
  const windows = [usage?.primary, usage?.secondary].filter(Boolean);
  if (!windows.length) {
    const status = document.createElement("span");
    status.className = "web-usage-status";
    status.textContent = profileText("暂时无法读取 Codex 额度", "Codex usage is temporarily unavailable");
    usageBody.append(status);
    return;
  }
  windows.forEach(value => usageBody.append(renderUsageWindow(value)));
  if (typeof usage.planType === "string" && usage.planType) {
    const plan = usage.planType.charAt(0).toUpperCase() + usage.planType.slice(1);
    profileKind.textContent = "Codex " + plan;
  }
}

async function loadUsage() {
  if (usageLoading || (usageLoadedAt && Date.now() - usageLoadedAt < 60_000)) return;
  usageLoading = true;
  usageBody.replaceChildren();
  const status = document.createElement("span");
  status.className = "web-usage-status";
  status.textContent = profileText("正在读取…", "Loading…");
  usageBody.append(status);
  try {
    const result = await requestRuntime({ path: "/api/account/usage", method: "GET" });
    usageLoadedAt = Date.now();
    cachedUsage = result?.usage ?? null;
    renderUsage(cachedUsage);
  } catch (error) {
    cachedUsage = null;
    renderUsage(null);
    reportHostError(error, { source: "usage_request" });
  } finally {
    usageLoading = false;
  }
}

window.addEventListener("better-codex:bootstrap", event => updateWebProfile(event.detail));
profileButton.addEventListener("click", () => {
  const expanded = profileButton.getAttribute("aria-expanded") !== "true";
  profileButton.setAttribute("aria-expanded", String(expanded));
  usagePanel.hidden = !expanded;
  if (expanded) void loadUsage();
});

function consumeFragmentToken() {
  const params = new URLSearchParams(location.hash.replace(/^#/, ""));
  const token = params.get("token") || "";
  if (token) history.replaceState(history.state, "", location.pathname + location.search);
  return REMOTE ? "" : token;
}

async function establishSession(token) {
  const response = await fetch(SESSION_PATH, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(REMOTE ? { username: usernameInput?.value.trim() || "", password: token } : { token }),
  });
  if (!response.ok) throw new Error(REMOTE ? "密码无效或登录请求过于频繁" : "令牌无效，请重新运行 better-codex web");
  const session = await response.json();
  if (REMOTE) {
    if (typeof session.csrf_token !== "string" || !session.csrf_token) throw new Error((RELAY ? "Relay" : "Hub") + " 未返回有效的 Web 会话");
    csrfToken = session.csrf_token;
    sessionStorage.setItem("better-codex-web-csrf", csrfToken);
  } else {
    if (typeof session.token !== "string" || !session.token) throw new Error("Runtime 未返回有效的 Web 会话");
    sessionToken = session.token;
    sessionStorage.setItem("better-codex-web-session", sessionToken);
  }
}

async function restoreRemoteSession() {
  const response = await fetch(SESSION_PATH);
  if (!response.ok) throw new Error("Web 会话已失效，请重新登录");
  const session = await response.json();
  if (typeof session.csrf_token !== "string" || !session.csrf_token) throw new Error((RELAY ? "Relay" : "Hub") + " 未返回有效的 Web 会话");
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
  reportHostError(new Error(connectError.textContent), { source: "session_expired" }, false);
}

function scheduleRelayRecovery() {
  if (!RELAY || relayRetryTimer) return;
  relayRetryTimer = setTimeout(async () => {
    relayRetryTimer = undefined;
    try {
      const response = await fetch("/relay/status");
      if (response.status === 401) return expireSession();
      const status = await response.json();
      if (response.ok && status?.runtime?.online) {
        relayOfflineReported = false;
        connectError.hidden = true;
        if (window.__betterCodexInjection__) {
          if (connectDialog.open) connectDialog.close();
          openCurrentRoute();
        } else loadInjection();
        return;
      }
    } catch {}
    scheduleRelayRecovery();
  }, 2000);
}

function showRelayOffline() {
  if (!RELAY) return;
  connectError.textContent = "远程连接暂时中断，连接恢复后将自动重试";
  connectError.hidden = false;
  if (!connectDialog.open) connectDialog.showModal();
  if (!window.__betterCodexInjection__ && !relayOfflineReported) {
    relayOfflineReported = true;
    reportHostError(new Error("runtime_offline"), { source: "relay_status" }, false);
  }
  scheduleRelayRecovery();
}

async function relayRuntimeOnline() {
  if (!RELAY) return true;
  const response = await fetch("/relay/status");
  if (response.status === 401) throw new Error("Web 会话已失效，请重新登录");
  if (!response.ok) throw new Error("Relay 状态暂时不可用");
  const status = await response.json();
  return status?.runtime?.online === true;
}

async function requestRuntime(request) {
  if (typeof request.path !== "string" || !request.path.startsWith("/api/")) {
    throw new Error("invalid_bridge_request");
  }
  const method = String(request.method || "GET").toUpperCase();
  if (method !== "GET" && !request.commandId) request.commandId = crypto.randomUUID();
  const startedAt = Date.now();
  const timeoutMs = Math.min(Math.max(Number(request.timeoutMs) || 10_000, 1_000), 300_000);
  const requestBodyBytes = typeof request.body === "string" ? new TextEncoder().encode(request.body).byteLength : 0;
  const diagnostics = extra => ({
    source: "web_host_request",
    host_kind: HOST_KIND,
    method,
    path: request.path,
    command_id: request.commandId || "",
    request_body_bytes: requestBodyBytes,
    timeout_ms: timeoutMs,
    elapsed_ms: Date.now() - startedAt,
    online: navigator.onLine,
    host_logs: hostDiagnosticLog.slice(-20),
    ...extra,
  });
  const requestError = (message, extra = {}, cause) => {
    const error = new Error(message || "request_failed", cause ? { cause } : undefined);
    error.betterCodexDiagnostics = diagnostics(extra);
    return error;
  };
  hostDiagnostic("request_start", { method, path: request.path, command_id: request.commandId || "", request_body_bytes: requestBodyBytes, timeout_ms: timeoutMs });
  const headers = REMOTE ? {} : { authorization: "Bearer " + sessionToken };
  if (REMOTE && method !== "GET") headers["x-csrf-token"] = csrfToken;
  if (request.commandId) headers["x-better-codex-command-id"] = request.commandId;
  if (RELAY && request.commandId) headers["x-better-codex-request-id"] = request.commandId;
  if (request.body !== undefined) headers["content-type"] = "application/json";
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(request.path, { method, headers, body: request.body, signal: controller.signal });
    let value;
    try { value = await response.json(); }
    catch { value = { error: response.statusText || "request_failed" }; }
    hostDiagnostic("request_response", { method, path: request.path, command_id: request.commandId || "", http_status: response.status, elapsed_ms: Date.now() - startedAt });
    if (response.status === 401) setTimeout(expireSession, 0);
    if (RELAY && response.status === 503 && value.error === "runtime_offline") setTimeout(showRelayOffline, 0);
    if (!response.ok) throw requestError(value.error || response.statusText || "request_failed", {
      http_status: response.status,
      http_status_text: response.statusText,
      response_request_id: response.headers.get("x-better-codex-request-id") || value.request_id || "",
      response_detail: value.detail || "",
      relay_channel_id: value.channel_id || "",
      relay_request_bytes: Number(value.request_bytes) || 0,
      relay_request_ended: typeof value.request_ended === "boolean" ? value.request_ended : null,
      relay_response_started: typeof value.response_started === "boolean" ? value.response_started : null,
      relay_connection_epoch: Number(value.connection_epoch) || 0,
      relay_runtime_instance_id: value.runtime_instance_id || "",
    });
    return value;
  } catch (error) {
    hostDiagnostic("request_failure", { method, path: request.path, command_id: request.commandId || "", elapsed_ms: Date.now() - startedAt, error: error?.message || "runtime_unavailable" });
    if (error?.name === "AbortError") throw requestError("runtime_bridge_timeout", { failure_type: "timeout", host_logs: hostDiagnosticLog.slice(-20) }, error);
    if (!error?.betterCodexDiagnostics) throw requestError(error?.message || "runtime_unavailable", { failure_type: error?.name || "network_error", host_logs: hostDiagnosticLog.slice(-20) }, error);
    error.betterCodexDiagnostics.host_logs = hostDiagnosticLog.slice(-20);
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
  kind: RELAY ? "web" : REMOTE ? "remote" : "web",
  capabilities: Object.freeze({ issues: "read-write", agents: REMOTE && !RELAY ? "read-only" : "read-write", liveUpdates: true, nativeThreads: false }),
  request: requestRuntime,
  subscribe: subscribeRuntime,
});

window.betterCodexRequest = payload => {
  let request;
  try { request = JSON.parse(payload); }
  catch { return; }
requestRuntime(request)
    .then(value => window.__betterCodexBridgeResolve?.(request.id, { ok: true, value }))
    .catch(error => window.__betterCodexBridgeResolve?.(request.id, { ok: false, value: { error: error.message || "runtime_unavailable", diagnostics: error.betterCodexDiagnostics || null } }));
};

function loadInjection() {
  if (installing || window.__betterCodexInjection__) return;
  installing = true;
  const script = document.createElement("script");
  script.src = "/web/injection.js?locale=" + encodeURIComponent(navigator.language || document.documentElement.lang || "en") + (REMOTE ? "" : "&session=" + encodeURIComponent(sessionToken));
  script.onload = () => {
    installing = false;
    script.dataset.betterCodexLoaded = "true";
    connectDialog.close();
    openCurrentRoute();
  };
  script.onerror = () => {
    installing = false;
    script.remove();
    reportHostError(new Error("injection_load_failed"), { source: "injection_loader", script: script.src.replace(/([?&]session=)[^&]+/, "$1[redacted]") });
    if (RELAY) showRelayOffline();
    else if (!connectDialog.open) connectDialog.showModal();
  };
  document.head.appendChild(script);
}

async function boot(token = "") {
  try {
    if (token) await establishSession(token);
    if (REMOTE && !csrfToken) await restoreRemoteSession();
    if (!REMOTE && !sessionToken) throw new Error("请运行 better-codex web 获取本地访问令牌");
    if (RELAY && !await relayRuntimeOnline()) {
      showRelayOffline();
      return;
    }
    loadInjection();
  } catch (error) {
    connectError.textContent = error instanceof Error ? error.message : "连接失败";
    connectError.hidden = false;
    if (!connectDialog.open) connectDialog.showModal();
    reportHostError(error, { source: "boot" }, false);
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

function openCurrentRoute() {
  const match = location.pathname.match(/^\/web\/projects(?:\/([^/?#]+))?\/?$/);
  if (match) {
    let projectId = "";
    try { projectId = match[1] ? decodeURIComponent(match[1]) : ""; }
    catch {}
    window.__betterCodexInjection__?.open?.("projects", { projectId, history: "none" });
    return;
  }
  if (location.pathname === "/web" || location.pathname === "/") window.__betterCodexInjection__?.open?.("issues", { history: "none" });
  else window.__betterCodexInjection__?.refresh?.();
}

window.addEventListener("popstate", () => {
  openCurrentRoute();
});

const theme = localStorage.getItem("better-codex-web-theme");
if (theme === "dark" || (!theme && matchMedia("(prefers-color-scheme: dark)").matches)) document.documentElement.dataset.theme = "dark";
const sidebarCollapsed = localStorage.getItem("better-codex-web-sidebar-collapsed") === "true";
if (sidebarCollapsed) document.documentElement.dataset.webSidebarCollapsed = "true";
sidebarCollapseButton.addEventListener("click", () => {
  document.documentElement.dataset.webSidebarCollapsed = "true";
  localStorage.setItem("better-codex-web-sidebar-collapsed", "true");
  sidebarExpandButton.focus();
});
sidebarExpandButton.addEventListener("click", () => {
  delete document.documentElement.dataset.webSidebarCollapsed;
  localStorage.setItem("better-codex-web-sidebar-collapsed", "false");
  sidebarCollapseButton.focus();
});
document.getElementById("web-theme").addEventListener("click", () => {
  const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  document.documentElement.dataset.theme = next;
  localStorage.setItem("better-codex-web-theme", next);
});

window.addEventListener("beforeinstallprompt", event => {
  event.preventDefault();
  installPrompt = event;
  installButton.hidden = false;
});

installButton.addEventListener("click", async () => {
  if (!installPrompt) return;
  installButton.hidden = true;
  await installPrompt.prompt();
  await installPrompt.userChoice;
  installPrompt = undefined;
});

window.addEventListener("appinstalled", () => {
  installPrompt = undefined;
  installButton.hidden = true;
});

${betterCodexWebAppRegistrationJavaScript()}

void boot(consumeFragmentToken());
`;

export function betterCodexWebHostHtml(host: boolean | BetterCodexWebHostKind = false) {
  const kind = webHostKind(host);
  if (kind === "relay") {
    return webHostHtml
      .replace('<html lang="zh-CN">', '<html lang="zh-CN" data-better-codex-remote="true" data-better-codex-host="relay">')
      .replace("Local connection", "Better Codex Relay")
      .replace("请运行 <code>better-codex web</code> 自动打开，或粘贴本地访问令牌。令牌只用于连接本机 Runtime。", "登录后将通过加密隧道直接连接你的本机 Runtime。Relay 不保存任务、智能体或会话数据。")
      .replace('<label><span>访问令牌</span>', '<label><span>账户</span><input id="web-username" type="text" autocomplete="username" spellcheck="false" required></label><label><span>访问令牌</span>')
      .replace("访问令牌", "访问密码")
      .replace('autocomplete="off"', 'autocomplete="current-password"');
  }
  return kind === "remote-projection"
    ? webHostHtml
      .replace('<html lang="zh-CN">', '<html lang="zh-CN" data-better-codex-remote="true" data-better-codex-host="remote-projection">')
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

export function betterCodexWebHostJavaScript(host: boolean | BetterCodexWebHostKind = false) {
  const kind = webHostKind(host);
  if (kind === "local" || kind === "relay") return webHostJavaScript;
  return webHostJavaScript
    .replace('kind: "web",', 'kind: "remote",')
    .replace('issues: "read-write", agents: "read-write", liveUpdates: true, nativeThreads: false', 'issues: "read-write", agents: "read-only", liveUpdates: true, nativeThreads: false')
    .replaceAll("Runtime", "Hub")
    .replaceAll("better-codex web", "Hub 管理命令");
}
