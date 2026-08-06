import { activeCompatibility } from "./compatibility.js";

export function injectionVersion() {
  return activeCompatibility().version;
}

export function injectionScript(port: number, accessToken: string, action: "install" | "uninstall") {
  if (action === "uninstall") {
    return `(() => {
      window.__betterCodexInjection__?.destroy?.();
      document.querySelectorAll('[data-better-codex-owned="true"]').forEach(node => node.remove());
      document.querySelectorAll('[data-better-codex-native-hidden="true"]').forEach(node => node.removeAttribute('data-better-codex-native-hidden'));
      document.querySelectorAll('[data-better-codex-page-host="true"]').forEach(node => node.removeAttribute('data-better-codex-page-host'));
      document.documentElement.removeAttribute('data-better-codex-open');
      delete window.__betterCodexInjection__;
      return { uninstalled: true };
    })()`;
  }
  const compatibility = activeCompatibility();
  const baseUrl = JSON.stringify(`http://127.0.0.1:${port}`);
  const bridgeToken = JSON.stringify(accessToken);
  return `(() => {
    "use strict";
    const VERSION = ${JSON.stringify(compatibility.version)};
    const previous = window.__betterCodexInjection__;
    if (previous?.version === VERSION && previous?.endpoint === ${baseUrl}) {
      previous.refresh();
      return { installed: true, reused: true };
    }
    previous?.destroy?.();

    const ENTRY_ID = "better-codex-entry";
    const AGENTS_ENTRY_ID = "better-codex-agents-entry";
    const PANEL_ID = "better-codex-panel";
    const STYLE_ID = "better-codex-style";
    const OWNED = "data-better-codex-owned";
    const HIDDEN = "data-better-codex-native-hidden";
    const HOST = "data-better-codex-page-host";
    const BASE_URL = ${baseUrl};
    const BRIDGE_TOKEN = ${bridgeToken};
    const SELECTORS = ${JSON.stringify(compatibility.selectors)};
    const ATTRIBUTES = ${JSON.stringify(compatibility.attributes)};
    const NAVIGATION = ${JSON.stringify(compatibility.navigation)};
    const statusLabels = { backlog: "待规划", todo: "待办", in_progress: "进行中", in_review: "审核中", done: "已完成", blocked: "已阻塞", cancelled: "已取消" };
    const priorityLabels = { none: "无", low: "低", medium: "中", high: "高", urgent: "紧急" };
    const state = { projects: [], issues: [], agents: [], agentModels: [], agentReasoningEfforts: [], projectId: "", search: "", agentSearch: "", surface: "issues", view: "all", createMode: "manual", keepCreate: false, selected: null, error: "", filters: { status: [], priority: [], date: [], assignee: [], creator: [], project: [], label: [] } };
    const bridgeRequests = new Map();
    let bridgeSequence = 0;
    let entry = null;
    let agentsEntry = null;
    let panel = null;
    let observer = null;
    let timer = null;
    let pollTimer = null;
    let filterDismiss = null;
    let issueMenu = null;
    let issueMenuDismiss = null;
    let active = false;
    let destroyed = false;

    function label(value) {
      return String(value || "").replace(/\\s+/g, " ").trim().toLowerCase();
    }

    function escapeHtml(value) {
      return String(value ?? "").replace(/[&<>\"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\\\"": "&quot;", "'": "&#39;" })[character]);
    }

    function installStyle() {
      if (document.getElementById(STYLE_ID)) return;
      const style = document.createElement("style");
      style.id = STYLE_ID;
      style.setAttribute(OWNED, "true");
      style.textContent = \`
        #\${ENTRY_ID}[aria-current="page"], #\${AGENTS_ENTRY_ID}[aria-current="page"] { background: var(--color-background-primary-soft-active, var(--color-token-list-hover-background, color-mix(in srgb, currentColor 8%, transparent))); }
        html[data-better-codex-open="true"] \${SELECTORS.sidebarNavigation} [aria-current="page"]:not(#\${ENTRY_ID}):not(#\${AGENTS_ENTRY_ID}) { background: transparent !important; }
        html[data-better-codex-open="true"] \${SELECTORS.sidebarNavigation} [aria-current="page"]:not(#\${ENTRY_ID}):not(#\${AGENTS_ENTRY_ID}) .text-token-list-active-selection-foreground { color: var(--color-token-foreground) !important; }
        [\${HOST}="true"] { position: relative !important; z-index: 31 !important; pointer-events: none !important; }
        [\${HIDDEN}="true"] { visibility: hidden !important; pointer-events: none !important; }
        #\${PANEL_ID} { position: absolute; inset: 0; z-index: 2; display: flex; min-width: 0; min-height: 0; flex-direction: column; overflow: hidden; color: var(--color-text-foreground, inherit); background: var(--color-background-surface, var(--wb-surface-primary, var(--color-token-bg-primary, Canvas))); pointer-events: auto; }
        #\${PANEL_ID}[hidden] { display: none !important; }
        #\${PANEL_ID} { --bc-muted: #71717a; --bc-border: #e5e5e7; --bc-surface: #fff; --bc-hover: #f7f7f8; --bc-warning: #d89b16; --bc-success: #2e9c5a; --bc-info: #2583d8; --bc-danger: #e5484d; font-family: Inter, ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #fcfcfc; }
        #\${PANEL_ID} .better-codex-error { margin-left: auto; color: var(--bc-danger); font-size: 11px; }
        #\${PANEL_ID} .better-codex-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 10px; min-height: 50px; padding: 0 18px; background: #fcfcfc; }
        #\${PANEL_ID} .better-codex-tabs, #\${PANEL_ID} .better-codex-actions { display: flex; align-items: center; gap: 4px; }
        #\${PANEL_ID} .better-codex-button, #better-codex-dialog .better-codex-button { display: inline-flex; flex: 0 0 auto; width: auto; min-height: 28px; align-items: center; justify-content: center; gap: 6px; border: 1px solid transparent; border-radius: 7px; color: #52525b; background: transparent; padding: 0 9px; font: inherit; font-size: 12px; cursor: pointer; }
        #\${PANEL_ID} .better-codex-button:hover, #better-codex-dialog .better-codex-button:hover { background: #f0f0f1; }
        #\${PANEL_ID} .better-codex-button.is-active { color: #18181b; background: #f0f0f1; font-weight: 550; }
        #\${PANEL_ID} .better-codex-button.is-bordered { border-color: var(--bc-border); background: var(--bc-surface); box-shadow: 0 1px 2px rgba(15,23,42,.03); }
        #\${PANEL_ID} .better-codex-working-chip.has-work { border-color: #f1d59c; color: #936512; background: #fffaf0; }
        #\${PANEL_ID} .better-codex-working-dot { width: 6px; height: 6px; margin-right: 6px; border-radius: 999px; background: currentColor; box-shadow: 0 0 0 3px rgba(216,155,22,.12); }
        #\${PANEL_ID} .better-codex-search { box-sizing: border-box; width: 142px; height: 28px; border: 1px solid var(--bc-border); border-radius: 7px; color: inherit; background: var(--bc-surface); padding: 0 9px; font: inherit; font-size: 12px; outline: none; }
        #\${PANEL_ID} .better-codex-search:focus { border-color: #b9b9bd; box-shadow: 0 0 0 2px rgba(24,24,27,.06); }
        #\${PANEL_ID} .better-codex-filter-wrap { position: relative; display: flex; }
        #\${PANEL_ID} .better-codex-filter-menu, #\${PANEL_ID} .better-codex-filter-submenu { position: absolute; z-index: 80; box-sizing: border-box; min-width: 164px; border: 1px solid #e4e4e7; border-radius: 9px; color: #27272a; background: #fff; padding: 5px; box-shadow: 0 10px 28px rgba(15,23,42,.14),0 2px 7px rgba(15,23,42,.08); }
        #\${PANEL_ID} .better-codex-filter-menu { top: calc(100% + 5px); right: 0; }
        #\${PANEL_ID} .better-codex-filter-submenu { min-width: 190px; }
        #\${PANEL_ID} .better-codex-filter-row { display: flex; width: 100%; min-height: 32px; align-items: center; gap: 9px; border: 0; border-radius: 6px; color: inherit; background: transparent; padding: 0 8px; font: inherit; font-size: 12px; text-align: left; cursor: pointer; }
        #\${PANEL_ID} .better-codex-filter-row:hover, #\${PANEL_ID} .better-codex-filter-row.is-active { background: #f1f1f2; }
        #\${PANEL_ID} .better-codex-filter-row svg { flex: 0 0 auto; }
        #\${PANEL_ID} .better-codex-filter-label { min-width: 0; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        #\${PANEL_ID} .better-codex-filter-count { color: #71717a; font-size: 10px; }
        #\${PANEL_ID} .better-codex-filter-chevron { color: #71717a; font-size: 16px; }
        #\${PANEL_ID} .better-codex-filter-check { width: 14px; color: #18181b; font-size: 12px; }
        #\${PANEL_ID} .better-codex-filter-separator { height: 1px; margin: 4px 2px; background: #ededee; }
        #better-codex-context-menu, #better-codex-context-menu .better-codex-context-submenu { box-sizing: border-box; width: 210px; border: 1px solid #e4e4e7; border-radius: 10px; color: #27272a; background: #fff; padding: 5px; box-shadow: 0 12px 32px rgba(15,23,42,.16),0 2px 8px rgba(15,23,42,.08); font-family: Inter, ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
        #better-codex-context-menu { position: fixed; z-index: 110; }
        #better-codex-context-menu .better-codex-context-item-wrap { position: relative; }
        #better-codex-context-menu .better-codex-context-item { display: flex; width: 100%; min-height: 34px; align-items: center; gap: 9px; border: 0; border-radius: 6px; color: inherit; background: transparent; padding: 0 8px; font: inherit; font-size: 13px; text-align: left; cursor: pointer; }
        #better-codex-context-menu .better-codex-context-item:hover, #better-codex-context-menu .better-codex-context-item:focus-visible, #better-codex-context-menu .better-codex-context-item-wrap:hover > .better-codex-context-item { background: #f1f1f2; outline: none; }
        #better-codex-context-menu .better-codex-context-item > span { min-width: 0; flex: 1; }
        #better-codex-context-menu .better-codex-status-icon, #better-codex-context-menu .better-codex-priority { width: 16px; height: 16px; flex: 0 0 auto; }
        #better-codex-context-menu .better-codex-status-icon { color: var(--bc-muted, #71717a); }
        #better-codex-context-menu .better-codex-context-item.is-danger { color: #ef4444; }
        #better-codex-context-menu .better-codex-context-divider { height: 1px; margin: 5px 3px; background: #ededee; }
        #better-codex-context-menu .better-codex-context-submenu { position: absolute; top: -5px; left: calc(100% + 5px); display: none; }
        #better-codex-context-menu[data-align="left"] .better-codex-context-submenu { right: calc(100% + 5px); left: auto; }
        #better-codex-context-menu .better-codex-context-item-wrap:hover > .better-codex-context-submenu, #better-codex-context-menu .better-codex-context-item-wrap:focus-within > .better-codex-context-submenu { display: block; }
        #better-codex-context-menu .better-codex-context-check { width: 14px; flex: 0 0 auto; color: #18181b; }
        #\${PANEL_ID} .better-codex-board { display: flex; gap: 12px; min-height: 0; flex: 1; overflow-x: auto; overflow-y: hidden; padding: 0 16px 10px; }
        #\${PANEL_ID} .better-codex-column { box-sizing: border-box; display: flex; width: 280px; min-width: 280px; min-height: 200px; flex-direction: column; border-radius: 12px; padding: 8px; }
        #\${PANEL_ID} .better-codex-column[data-status="backlog"], #\${PANEL_ID} .better-codex-column[data-status="todo"], #\${PANEL_ID} .better-codex-column[data-status="cancelled"] { background: rgba(228,228,231,.42); }
        #\${PANEL_ID} .better-codex-column[data-status="in_progress"] { background: rgba(245,181,45,.07); }
        #\${PANEL_ID} .better-codex-column[data-status="in_review"] { background: rgba(46,156,90,.07); }
        #\${PANEL_ID} .better-codex-column[data-status="done"] { background: rgba(37,131,216,.07); }
        #\${PANEL_ID} .better-codex-column[data-status="blocked"] { background: rgba(229,72,77,.07); }
        #\${PANEL_ID} .better-codex-column-head { display: flex; min-height: 30px; align-items: center; justify-content: space-between; padding: 0 6px 6px; font-size: 12px; font-weight: 600; }
        #\${PANEL_ID} .better-codex-column-title, #\${PANEL_ID} .better-codex-column-actions { display: flex; align-items: center; gap: 6px; }
        #\${PANEL_ID} .better-codex-status-icon { width: 14px; height: 14px; color: var(--bc-muted); }
        #\${PANEL_ID} [data-status="in_progress"] .better-codex-status-icon { color: var(--bc-warning); }
        #\${PANEL_ID} [data-status="in_review"] .better-codex-status-icon { color: var(--bc-success); }
        #\${PANEL_ID} [data-status="done"] .better-codex-status-icon { color: var(--bc-info); }
        #\${PANEL_ID} [data-status="blocked"] .better-codex-status-icon { color: var(--bc-danger); }
        #\${PANEL_ID} .better-codex-column-icon { width: 24px; height: 24px; border: 0; border-radius: 999px; color: var(--bc-muted); background: transparent; padding: 0; font-size: 17px; line-height: 20px; cursor: pointer; }
        #\${PANEL_ID} .better-codex-column-icon:hover { background: rgba(113,113,122,.1); }
        #\${PANEL_ID} .better-codex-cards { min-height: 0; flex: 1; overflow-y: auto; padding: 4px; border-radius: 8px; }
        #\${PANEL_ID} .better-codex-card { box-sizing: border-box; width: 256px; margin-bottom: 8px; border: .5px solid var(--bc-border); border-radius: 8px; background: var(--bc-surface); padding: 12px 10px; box-shadow: 0 1px 2px rgba(15,23,42,.04),0 1px 1px rgba(15,23,42,.03); cursor: pointer; transition: border-color .15s, background .15s, transform .15s; }
        #\${PANEL_ID} .better-codex-card:hover { border-color: #d0d0d4; background: var(--bc-hover); }
        #\${PANEL_ID} .better-codex-card:active { transform: scale(.995); }
        #\${PANEL_ID} .better-codex-card-row, #\${PANEL_ID} .better-codex-card-id, #\${PANEL_ID} .better-codex-card-meta { display: flex; align-items: center; }
        #\${PANEL_ID} .better-codex-card-row { justify-content: space-between; gap: 8px; }
        #\${PANEL_ID} .better-codex-card-id { min-width: 0; gap: 6px; color: var(--bc-muted); font-size: 11px; }
        #\${PANEL_ID} .better-codex-priority { width: 14px; height: 14px; flex: 0 0 auto; }
        #\${PANEL_ID} .better-codex-priority[data-priority="urgent"] { color: var(--bc-danger); }
        #\${PANEL_ID} .better-codex-priority[data-priority="high"], #\${PANEL_ID} .better-codex-priority[data-priority="medium"] { color: var(--bc-warning); }
        #\${PANEL_ID} .better-codex-priority[data-priority="low"] { color: var(--bc-info); }
        #\${PANEL_ID} .better-codex-card-title { display: -webkit-box; margin: 5px 0 0; overflow: hidden; color: #202024; font-size: 13px; font-weight: 550; line-height: 1.38; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }
        #\${PANEL_ID} .better-codex-card-description { margin-top: 4px; overflow: hidden; color: var(--bc-muted); font-size: 11px; line-height: 1.35; text-overflow: ellipsis; white-space: nowrap; }
        #\${PANEL_ID} .better-codex-chip-row { display: flex; align-items: center; flex-wrap: wrap; gap: 6px; margin-top: 7px; }
        #\${PANEL_ID} .better-codex-chip { display: inline-flex; max-width: 155px; align-items: center; gap: 4px; overflow: hidden; border-radius: 999px; background: #f2f2f3; padding: 2px 6px; color: var(--bc-muted); font-size: 10px; text-overflow: ellipsis; white-space: nowrap; }
        #\${PANEL_ID} .better-codex-card-meta { justify-content: space-between; gap: 8px; margin-top: 8px; color: var(--bc-muted); font-size: 11px; }
        #\${PANEL_ID} .better-codex-link { overflow: hidden; border: 0; color: inherit; background: transparent; padding: 0; font: inherit; text-overflow: ellipsis; white-space: nowrap; cursor: pointer; }
        #\${PANEL_ID} .better-codex-activity { display: inline-flex; align-items: center; gap: 5px; flex: 0 0 auto; font-size: 10px; font-weight: 600; }
        #\${PANEL_ID} .better-codex-avatar { display: inline-flex; width: 16px; height: 16px; align-items: center; justify-content: center; border: 1.5px solid #fff; border-radius: 999px; color: #fff; background: #27272a; font-size: 8px; }
        #\${PANEL_ID} .better-codex-activity[data-run="running"] { color: #52525b; }
        #\${PANEL_ID} .better-codex-activity[data-run="claimed"] { color: var(--bc-muted); opacity: .62; }
        @keyframes better-codex-shimmer { 0% { background-position: 200% 0 } 100% { background-position: -200% 0 } }
        #\${PANEL_ID} .better-codex-shimmer { background-image: linear-gradient(90deg,#71717a 0%,#71717a 35%,#18181b 50%,#71717a 65%,#71717a 100%); background-size: 200% 100%; background-clip: text; -webkit-background-clip: text; color: transparent; -webkit-text-fill-color: transparent; animation: better-codex-shimmer 2.5s linear infinite; }
        #\${PANEL_ID} .better-codex-empty { padding: 18px 4px; text-align: center; color: #a1a1aa; font-size: 11px; }
        #\${PANEL_ID} .better-codex-agent-heading { display: none; min-width: 0; align-items: baseline; gap: 10px; }
        #\${PANEL_ID} .better-codex-agent-heading strong { color: #18181b; font-size: 14px; font-weight: 650; }
        #\${PANEL_ID} .better-codex-agent-heading span { color: var(--bc-muted); font-size: 11px; }
        #\${PANEL_ID} .better-codex-agent-actions { display: none; align-items: center; gap: 8px; }
        #\${PANEL_ID}[data-surface="agents"] .better-codex-issue-only { display: none; }
        #\${PANEL_ID}[data-surface="agents"] .better-codex-agent-heading, #\${PANEL_ID}[data-surface="agents"] .better-codex-agent-actions { display: flex; }
        #\${PANEL_ID} .better-codex-agents { display: none; min-height: 0; flex: 1; overflow-y: auto; padding: 12px 22px 28px; }
        #\${PANEL_ID}[data-surface="agents"] .better-codex-agents { display: block; }
        #\${PANEL_ID} .better-codex-agent-grid { display: grid; max-width: 1080px; margin: 0 auto; grid-template-columns: repeat(auto-fill,minmax(280px,1fr)); gap: 12px; }
        #\${PANEL_ID} .better-codex-agent-card { display: flex; min-height: 214px; flex-direction: column; border: 1px solid var(--bc-border); border-radius: 12px; color: #27272a; background: #fff; padding: 16px; box-shadow: 0 1px 3px rgba(15,23,42,.08); transition: border-color .15s,transform .15s; }
        #\${PANEL_ID} .better-codex-agent-card:hover { border-color: #cfcfd4; }
        #\${PANEL_ID} .better-codex-agent-card:active { transform: scale(.99); }
        #\${PANEL_ID} .better-codex-agent-card-head { display: flex; align-items: flex-start; gap: 11px; }
        #\${PANEL_ID} .better-codex-agent-card-avatar { display: inline-flex; width: 36px; height: 36px; flex: 0 0 auto; align-items: center; justify-content: center; border-radius: 10px; color: #fff; background: #27272a; font-size: 12px; font-weight: 700; letter-spacing: -.02em; }
        #\${PANEL_ID} .better-codex-agent-card-title { min-width: 0; flex: 1; }
        #\${PANEL_ID} .better-codex-agent-card-title strong { display: block; overflow: hidden; font-size: 13px; font-weight: 650; text-overflow: ellipsis; white-space: nowrap; }
        #\${PANEL_ID} .better-codex-agent-card-title span { display: -webkit-box; margin-top: 3px; overflow: hidden; color: var(--bc-muted); font-size: 11px; line-height: 1.45; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }
        #\${PANEL_ID} .better-codex-agent-card-instructions { display: -webkit-box; min-height: 54px; margin-top: 14px; overflow: hidden; color: #52525b; font-family: ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace; font-size: 10.5px; line-height: 1.55; -webkit-box-orient: vertical; -webkit-line-clamp: 3; }
        #\${PANEL_ID} .better-codex-agent-card-meta { display: flex; align-items: center; flex-wrap: wrap; gap: 6px; margin-top: auto; padding-top: 14px; }
        #\${PANEL_ID} .better-codex-agent-card-actions { display: flex; align-items: center; gap: 4px; margin-left: auto; }
        #\${PANEL_ID} .better-codex-agent-card-action { display: inline-flex; width: 26px; height: 26px; align-items: center; justify-content: center; border: 0; border-radius: 6px; color: #71717a; background: transparent; padding: 0; cursor: pointer; }
        #\${PANEL_ID} .better-codex-agent-card-action:hover { color: #27272a; background: #f1f1f2; }
        #\${PANEL_ID} .better-codex-agent-card-action.is-danger:hover { color: var(--bc-danger); background: #fff1f1; }
        #\${PANEL_ID} .better-codex-agent-card-action:active, #\${PANEL_ID} .better-codex-button:active { transform: scale(.96); }
        #\${PANEL_ID} .better-codex-agents-empty { max-width: 460px; margin: 12vh auto 0; text-align: center; }
        #\${PANEL_ID} .better-codex-agents-empty-icon { display: inline-flex; width: 48px; height: 48px; align-items: center; justify-content: center; border: 1px solid var(--bc-border); border-radius: 14px; color: #52525b; background: #fff; box-shadow: 0 1px 3px rgba(15,23,42,.08); }
        #\${PANEL_ID} .better-codex-agents-empty strong { display: block; margin-top: 14px; color: #27272a; font-size: 14px; }
        #\${PANEL_ID} .better-codex-agents-empty p { margin: 6px 0 14px; color: var(--bc-muted); font-size: 12px; line-height: 1.6; }
        #better-codex-agent-dialog { position: fixed; inset: 0; box-sizing: border-box; width: min(720px,calc(100vw - 40px)); height: min(86vh,760px); margin: auto; overflow: hidden; border: 1px solid #dedee2; border-radius: 14px; color: #27272a; background: #f8f8f9; padding: 0; box-shadow: 0 24px 64px rgba(15,23,42,.18),0 4px 14px rgba(15,23,42,.08); font-family: Inter,ui-sans-serif,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; }
        #better-codex-agent-dialog::backdrop { background: rgba(24,24,27,.22); backdrop-filter: blur(4px); }
        #better-codex-agent-dialog form { display: flex; height: 100%; min-height: 0; flex-direction: column; }
        #better-codex-agent-dialog .better-codex-agent-dialog-head { display: flex; flex: 0 0 auto; align-items: center; justify-content: space-between; border-bottom: 1px solid #e4e4e7; background: #fff; padding: 15px 18px; }
        #better-codex-agent-dialog .better-codex-agent-dialog-head strong { display: block; font-size: 14px; font-weight: 650; }
        #better-codex-agent-dialog .better-codex-agent-dialog-head span { display: block; margin-top: 3px; color: #71717a; font-size: 11px; }
        #better-codex-agent-dialog .better-codex-agent-dialog-body { min-height: 0; flex: 1; overflow-y: auto; padding: 20px; }
        #better-codex-agent-dialog .better-codex-agent-section { max-width: 620px; margin: 0 auto 22px; }
        #better-codex-agent-dialog .better-codex-agent-section-title { margin: 0 0 9px 2px; }
        #better-codex-agent-dialog .better-codex-agent-section-title strong { display: block; font-size: 12px; font-weight: 650; }
        #better-codex-agent-dialog .better-codex-agent-section-title span { display: block; margin-top: 2px; color: #71717a; font-size: 10.5px; }
        #better-codex-agent-dialog .better-codex-agent-settings { overflow: hidden; border: 1px solid #e2e2e5; border-radius: 11px; background: #fff; box-shadow: 0 1px 3px rgba(15,23,42,.06); }
        #better-codex-agent-dialog .better-codex-agent-field { display: grid; grid-template-columns: 132px minmax(0,1fr); gap: 16px; align-items: center; padding: 13px 15px; }
        #better-codex-agent-dialog .better-codex-agent-field + .better-codex-agent-field { border-top: 1px solid #ededee; }
        #better-codex-agent-dialog .better-codex-agent-field.is-top { align-items: start; }
        #better-codex-agent-dialog .better-codex-agent-field > label { padding-top: 7px; color: #52525b; font-size: 11px; font-weight: 550; }
        #better-codex-agent-dialog input, #better-codex-agent-dialog textarea, #better-codex-agent-dialog select { box-sizing: border-box; width: 100%; border: 1px solid #dedee2; border-radius: 7px; color: #27272a; background: #fff; padding: 8px 10px; font: inherit; font-size: 12px; outline: none; }
        #better-codex-agent-dialog input:focus, #better-codex-agent-dialog textarea:focus, #better-codex-agent-dialog select:focus { border-color: #a1a1aa; box-shadow: 0 0 0 2px rgba(24,24,27,.06); }
        #better-codex-agent-dialog textarea { min-height: 74px; line-height: 1.55; resize: vertical; }
        #better-codex-agent-dialog textarea[name="instructions"] { min-height: 190px; font-family: ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace; font-size: 11px; }
        #better-codex-agent-dialog .better-codex-agent-execution { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; padding: 15px; }
        #better-codex-agent-dialog .better-codex-agent-execution label { display: block; margin-bottom: 6px; color: #52525b; font-size: 11px; font-weight: 550; }
        #better-codex-agent-dialog .better-codex-agent-dialog-error { max-width: 620px; margin: 0 auto 8px; color: var(--bc-danger,#e5484d); font-size: 11px; }
        #better-codex-agent-dialog .better-codex-agent-dialog-footer { display: flex; min-height: 58px; flex: 0 0 auto; align-items: center; justify-content: flex-end; gap: 8px; border-top: 1px solid #e4e4e7; background: #fff; padding: 0 18px; }
        #better-codex-agent-dialog .better-codex-button, #better-codex-agent-dialog .better-codex-submit { display: inline-flex; min-height: 30px; align-items: center; justify-content: center; border-radius: 7px; padding: 0 12px; font: inherit; font-size: 11px; cursor: pointer; }
        #better-codex-agent-dialog .better-codex-button { border: 1px solid #dedee2; color: #52525b; background: #fff; }
        #better-codex-agent-dialog .better-codex-submit { min-width: 92px; border: 1px solid #27272a; color: #fff; background: #27272a; font-weight: 600; }
        #better-codex-agent-dialog .better-codex-button:active, #better-codex-agent-dialog .better-codex-submit:active { transform: scale(.96); }
        #better-codex-agent-dialog .better-codex-submit:disabled { opacity: .55; cursor: not-allowed; }
        @media (max-width: 640px) { #better-codex-agent-dialog .better-codex-agent-field { grid-template-columns: 1fr; gap: 5px; } #better-codex-agent-dialog .better-codex-agent-field > label { padding-top: 0; } #better-codex-agent-dialog .better-codex-agent-execution { grid-template-columns: 1fr; } }
        #better-codex-dialog { position: fixed; inset: 0; box-sizing: border-box; width: min(806px, calc(100vw - 48px)); height: 461px; max-height: calc(100vh - 48px); margin: auto; overflow: visible; border: 1px solid #e4e4e7; border-radius: 14px; color: #27272a; background: #fff; padding: 0; box-shadow: 0 24px 64px rgba(15,23,42,.18),0 4px 14px rgba(15,23,42,.08); font-family: Inter,ui-sans-serif,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; transition: width .3s ease,height .3s ease; }
        #better-codex-dialog[data-mode="agent"] { width: min(691px, calc(100vw - 48px)); height: min(368px, calc(100vh - 48px)); }
        #better-codex-dialog[data-expanded="true"] { width: min(1075px, calc(100vw - 48px)); height: min(84vh, 912px); }
        #better-codex-dialog::backdrop { background: rgba(24,24,27,.19); backdrop-filter: blur(4px); }
        #better-codex-dialog form { display: flex; width: 100%; height: 100%; min-height: 0; flex-direction: column; zoom: 1.2; }
        #better-codex-dialog .better-codex-dialog-head { display: flex; flex: 0 0 auto; align-items: center; justify-content: space-between; padding: 12px 18px 8px 20px; }
        #better-codex-dialog .better-codex-dialog-breadcrumb { display: flex; min-width: 0; align-items: center; gap: 6px; color: #71717a; font-size: 12px; }
        #better-codex-dialog .better-codex-dialog-breadcrumb strong { overflow: hidden; color: #27272a; font-weight: 550; text-overflow: ellipsis; white-space: nowrap; }
        #better-codex-dialog .better-codex-dialog-head-actions { display: flex; align-items: center; gap: 2px; }
        #better-codex-dialog .better-codex-icon-button { display: inline-flex; width: 28px; height: 28px; align-items: center; justify-content: center; border: 0; border-radius: 5px; color: #52525b; background: transparent; padding: 0; cursor: pointer; opacity: .72; }
        #better-codex-dialog .better-codex-icon-button:hover { background: #f4f4f5; opacity: 1; }
        #better-codex-dialog .better-codex-manual-title { width: auto; margin: 0 20px 4px; border: 0; color: #27272a; background: transparent; padding: 0; font: inherit; font-size: 19px; font-weight: 600; line-height: 28px; outline: none; }
        #better-codex-dialog .better-codex-manual-title::placeholder { color: #71717a; opacity: 1; }
        #better-codex-dialog .better-codex-dialog-editor { box-sizing: border-box; width: auto; min-height: 0; flex: 1; margin: 0 20px; overflow-y: auto; border: 0; color: #3f3f46; background: transparent; padding: 2px 0; font: inherit; font-size: 13px; line-height: 1.55; outline: none; resize: none; }
        #better-codex-dialog .better-codex-dialog-editor::placeholder { color: #8b8b94; opacity: 1; }
        #better-codex-dialog[data-mode="agent"] .better-codex-dialog-editor { margin-top: 2px; min-height: 120px; }
        #better-codex-dialog .better-codex-agent-picker { display: flex; flex: 0 0 auto; align-items: center; gap: 8px; padding: 5px 20px 8px; color: #71717a; font-size: 12px; }
        #better-codex-dialog .better-codex-agent-picker strong { display: flex; align-items: center; gap: 6px; color: #3f3f46; font-weight: 550; }
        #better-codex-dialog .better-codex-agent-avatar { display: inline-flex; width: 18px; height: 18px; align-items: center; justify-content: center; border-radius: 999px; color: #fff; background: #3f3f46; font-size: 8px; }
        #better-codex-dialog .better-codex-run-hint { display: flex; flex: 0 0 auto; align-items: center; gap: 7px; padding: 1px 20px 4px; color: #8b8b94; font-size: 11px; }
        #better-codex-dialog .better-codex-dialog-properties { display: flex; flex: 0 0 auto; align-items: center; flex-wrap: wrap; gap: 6px; padding: 6px 16px 9px; }
        #better-codex-dialog .better-codex-property { display: inline-flex; height: 26px; max-width: 190px; align-items: center; gap: 6px; overflow: hidden; border: 1px solid #e5e5e7; border-radius: 999px; color: #52525b; background: #fff; padding: 0 9px; font: inherit; font-size: 11px; text-overflow: ellipsis; white-space: nowrap; }
        #better-codex-dialog button.better-codex-property { cursor: pointer; }
        #better-codex-dialog .better-codex-property select, #better-codex-dialog .better-codex-property input { width: auto; max-width: 128px; border: 0; color: inherit; background: transparent; padding: 0; font: inherit; font-size: inherit; outline: none; }
        #better-codex-dialog .better-codex-property input { width: 72px; }
        #better-codex-dialog .better-codex-project-picker { position: relative; display: inline-flex; }
        #better-codex-dialog .better-codex-project-menu { position: absolute; top: calc(100% + 6px); right: 0; z-index: 30; box-sizing: border-box; width: 220px; border: 1px solid #e4e4e7; border-radius: 9px; color: #3f3f46; background: #fff; padding: 5px; box-shadow: 0 12px 30px rgba(15,23,42,.14),0 2px 7px rgba(15,23,42,.08); }
        #better-codex-dialog .better-codex-project-menu[hidden] { display: none; }
        #better-codex-dialog .better-codex-project-search { box-sizing: border-box; width: 100%; height: 30px; border: 0; border-bottom: 1px solid #ededee; color: inherit; background: transparent; padding: 0 7px 4px; font: inherit; font-size: 11px; outline: none; }
        #better-codex-dialog .better-codex-project-option { display: flex; width: 100%; min-height: 31px; align-items: center; gap: 7px; border: 0; border-radius: 6px; color: inherit; background: transparent; padding: 0 7px; font: inherit; font-size: 11px; text-align: left; cursor: pointer; }
        #better-codex-dialog .better-codex-project-option:hover, #better-codex-dialog .better-codex-project-option:focus-visible { background: #f4f4f5; outline: none; }
        #better-codex-dialog .better-codex-project-option > span:first-of-type { min-width: 0; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        #better-codex-dialog .better-codex-project-check { width: 14px; flex: 0 0 auto; }
        #better-codex-dialog .better-codex-project-empty { padding: 8px 7px; color: #a1a1aa; font-size: 11px; }
        #better-codex-dialog .better-codex-dialog-footer { display: flex; min-height: 48px; flex: 0 0 auto; align-items: center; justify-content: space-between; gap: 10px; border-top: 1px solid #ededee; padding: 0 14px 0 18px; }
        #better-codex-dialog .better-codex-dialog-footer-right { display: flex; align-items: center; justify-content: flex-end; gap: 8px; }
        #better-codex-dialog .better-codex-switch-mode { display: inline-flex; height: 28px; align-items: center; gap: 6px; border: 0; border-radius: 5px; color: #71717a; background: transparent; padding: 0 8px; font: inherit; font-size: 11px; cursor: pointer; }
        #better-codex-dialog[data-mode="manual"] .better-codex-switch-mode { color: #5b6472; background: #f7f9ff; box-shadow: inset 0 0 0 1px rgba(75,107,251,.08); }
        #better-codex-dialog .better-codex-switch-mode:hover { color: #27272a; background: #f4f4f5; }
        #better-codex-dialog .better-codex-keep-open { display: flex; align-items: center; gap: 6px; color: #71717a; font-size: 11px; cursor: pointer; user-select: none; }
        #better-codex-dialog .better-codex-toggle { position: relative; width: 23px; height: 13px; appearance: none; border: 0; border-radius: 999px; background: #d4d4d8; padding: 0; cursor: pointer; transition: background .15s; }
        #better-codex-dialog .better-codex-toggle::after { position: absolute; top: 2px; left: 2px; width: 9px; height: 9px; border-radius: 999px; background: #fff; box-shadow: 0 1px 2px rgba(0,0,0,.2); content: ""; transition: transform .15s; }
        #better-codex-dialog .better-codex-toggle:checked { background: #27272a; }
        #better-codex-dialog .better-codex-toggle:checked::after { transform: translateX(10px); }
        #better-codex-dialog .better-codex-submit { display: inline-flex; min-width: 112px; height: 30px; align-items: center; justify-content: center; gap: 6px; border: 0; border-radius: 7px; color: #fff; background: #27272a; padding: 0 11px; font: inherit; font-size: 11px; font-weight: 550; cursor: pointer; }
        #better-codex-dialog .better-codex-submit:disabled { color: #fff; background: #a1a1aa; cursor: not-allowed; opacity: .72; }
        #better-codex-dialog .better-codex-keycap { display: inline-flex; min-width: 17px; height: 17px; align-items: center; justify-content: center; border-radius: 4px; background: rgba(255,255,255,.14); font-size: 10px; }
        #better-codex-dialog .better-codex-dialog-error { padding: 0 20px 6px; color: #e5484d; font-size: 11px; }
      \`;
      (document.head || document.documentElement).appendChild(style);
    }

    function findReferenceButton() {
      const scroll = document.querySelector(SELECTORS.sidebarScroll);
      if (!scroll) return null;
      const buttons = Array.from(scroll.querySelectorAll("button"));
      const plugin = buttons.find(button => ["插件", "plugins"].includes(label(button.textContent || button.getAttribute("aria-label"))));
      if (plugin) return plugin;
      return buttons.find(button => button.closest(SELECTORS.sidebarSection)) || buttons[0] || null;
    }

    function nativeButton(text) {
      const reference = findReferenceButton();
      const button = reference ? reference.cloneNode(true) : document.createElement("button");
      button.type = "button";
      ["id", "disabled", "aria-current", "aria-expanded", "aria-controls", "aria-describedby", "data-state"].forEach(name => button.removeAttribute(name));
      button.classList.remove("bg-token-list-hover-background");
      button.querySelectorAll(".text-token-list-active-selection-foreground").forEach(node => {
        node.classList.remove("text-token-list-active-selection-foreground");
        node.classList.add("text-token-foreground");
      });
      button.querySelectorAll("[id]").forEach(node => node.removeAttribute("id"));
      const content = button.querySelector(SELECTORS.truncatedText) || Array.from(button.querySelectorAll("span")).at(-1);
      if (content) content.textContent = text;
      else button.textContent = text;
      return button;
    }

    function actionButton(text) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "better-codex-button";
      button.textContent = text;
      return button;
    }

    function createEntry(text, id, title, surface) {
      const button = nativeButton(text);
      button.id = id;
      button.setAttribute(OWNED, "true");
      button.setAttribute("aria-label", title);
      button.setAttribute("title", title);
      const icon = button.querySelector("svg");
      if (icon) {
        icon.setAttribute("viewBox", "0 0 24 24");
        icon.setAttribute("fill", "none");
        icon.setAttribute("stroke", "currentColor");
        icon.setAttribute("stroke-width", "1.8");
        icon.innerHTML = surface === "agents" ? '<rect x="4" y="7" width="16" height="12" rx="4"></rect><path d="M12 3v4M8 12h.01M16 12h.01M8 16h8"></path>' : '<rect x="3.5" y="4" width="17" height="16" rx="2.5"></rect><path d="M9 4v16M14.5 8h2.5M14.5 12h2.5M14.5 16h2.5"></path>';
      }
      button.addEventListener("click", event => {
        event.preventDefault();
        event.stopPropagation();
        state.surface = surface;
        open(surface);
      });
      return button;
    }

    function ensureEntry() {
      if (destroyed) return;
      installStyle();
      const reference = findReferenceButton();
      if (!reference?.parentElement) return;
      if (!entry) entry = createEntry("Better Codex", ENTRY_ID, "打开 Better Codex", "issues");
      if (entry.parentElement !== reference.parentElement || entry.previousElementSibling !== reference) reference.after(entry);
      if (!agentsEntry) agentsEntry = createEntry("智能体", AGENTS_ENTRY_ID, "管理智能体", "agents");
      if (agentsEntry.parentElement !== reference.parentElement || agentsEntry.previousElementSibling !== entry) entry.after(agentsEntry);
      entry.removeAttribute("aria-current");
      agentsEntry.removeAttribute("aria-current");
      if (active && state.surface === "issues") entry.setAttribute("aria-current", "page");
      if (active && state.surface === "agents") agentsEntry.setAttribute("aria-current", "page");
    }

    function findMount() {
      const frame = document.querySelector(SELECTORS.contentFrame);
      const layout = frame?.closest(SELECTORS.contentLayout) || document.querySelector(SELECTORS.contentLayout);
      const surface = layout?.parentElement;
      return surface?.closest("main") ? surface : null;
    }

    function activeThreadRow() {
      const rows = Array.from(document.querySelectorAll(SELECTORS.threadRow));
      return rows.find(row => row.getAttribute(ATTRIBUTES.threadActive) === "true") || rows.find(row => ["page", "true"].includes(row.getAttribute("aria-current"))) || null;
    }

    function readContext() {
      const row = activeThreadRow();
      const projectList = row?.closest(SELECTORS.projectList);
      const projectRow = row?.closest(SELECTORS.projectId) || document.querySelector(SELECTORS.currentProjectRow);
      const projects = Array.from(document.querySelectorAll(SELECTORS.projectRow)).flatMap(item => {
        const id = item.getAttribute(ATTRIBUTES.projectId)?.trim();
        const name = (item.getAttribute(ATTRIBUTES.projectLabel) || item.getAttribute("aria-label") || "").trim();
        return id && name ? [{ id, name }] : [];
      });
      const url = new URL(location.href);
      return {
        projectId: projectList?.getAttribute(ATTRIBUTES.projectListId) || projectRow?.getAttribute(ATTRIBUTES.projectId) || "",
        threadId: row?.getAttribute(ATTRIBUTES.threadId) || location.pathname.match(/\\/local\\/([^/?#]+)/)?.[1] || "",
        workspacePath: url.searchParams.get("workspace") || url.searchParams.get("cwd") || "",
        projects
      };
    }

    function api(path, options = {}) {
      if (typeof window.betterCodexRequest !== "function") return Promise.reject(new Error("runtime_bridge_unavailable"));
      const id = VERSION + ":" + (++bridgeSequence);
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          bridgeRequests.delete(id);
          reject(new Error("runtime_bridge_timeout"));
        }, 10000);
        bridgeRequests.set(id, { resolve, reject, timer });
        window.betterCodexRequest(JSON.stringify({ id, token: BRIDGE_TOKEN, path, method: options.method || "GET", body: options.body }));
      });
    }

    window.__betterCodexBridgeResolve = (id, result) => {
      const pending = bridgeRequests.get(id);
      if (!pending) return;
      bridgeRequests.delete(id);
      clearTimeout(pending.timer);
      if (result?.ok) pending.resolve(result.value);
      else pending.reject(new Error(result?.value?.error || "request_failed"));
    };

    function showError(error) {
      state.error = error instanceof Error ? error.message : String(error || "request_failed");
      const output = panel?.querySelector("#better-codex-error");
      if (output) {
        output.textContent = state.error;
        output.hidden = false;
      }
    }

    function clearError() {
      state.error = "";
      const output = panel?.querySelector("#better-codex-error");
      if (output) {
        output.textContent = "";
        output.hidden = true;
      }
    }

    async function perform(action) {
      clearError();
      try {
        return await action();
      } catch (error) {
        showError(error);
        return null;
      }
    }

    function icon(name, className = "") {
      const paths = {
        plus: '<path d="M12 5v14M5 12h14"/>',
        more: '<circle cx="5" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1" fill="currentColor" stroke="none"/>',
        filter: '<path d="M4 5h16l-6 7v5l-4 2v-7z"/>',
        display: '<path d="M4 6h16M4 12h16M4 18h16"/><circle cx="8" cy="6" r="2" fill="currentColor"/><circle cx="15" cy="12" r="2" fill="currentColor"/><circle cx="10" cy="18" r="2" fill="currentColor"/>',
        board: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16M15 4v16"/>',
        switch: '<path d="M8 3L4 7l4 4M4 7h16M16 21l4-4-4-4M20 17H4"/>',
        expand: '<path d="M8 3H3v5M16 3h5v5M8 21H3v-5M16 21h5v-5"/>',
        close: '<path d="M6 6l12 12M18 6L6 18"/>',
        paperclip: '<path d="M21.4 11.6l-8.9 8.9a6 6 0 01-8.5-8.5l9.6-9.6a4 4 0 015.7 5.7l-9.6 9.6a2 2 0 01-2.8-2.8l8.9-8.9"/>',
        folder: '<path d="M3 6.5h6l2 2h10v9.5a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><path d="M3 10h18"/>',
        tag: '<path d="M20 13l-7 7-10-10V3h7z"/><circle cx="7.5" cy="7.5" r="1" fill="currentColor" stroke="none"/>',
        calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18"/>',
        user: '<circle cx="12" cy="8" r="4"/><path d="M4.5 21a7.5 7.5 0 0115 0"/>',
        userEdit: '<circle cx="10" cy="8" r="4"/><path d="M3 21a7 7 0 0111-5.7M16 18l4-4 2 2-4 4-3 1z"/>',
        bot: '<rect x="4" y="7" width="16" height="12" rx="4"/><path d="M12 3v4M8 12h.01M16 12h.01M8 16h8"/>',
        edit: '<path d="M4 20h4l11-11-4-4L4 16zM13.5 6.5l4 4"/>',
        chevron: '<path d="M9 5l7 7-7 7"/>',
        check: '<path d="M5 12l4 4L19 6"/>',
        circle: '<circle cx="12" cy="12" r="7"/>',
        dash: '<path d="M5 12h14"/>',
        trash: '<path d="M4 7h16M9 3h6l1 4H8zM7 7l1 14h8l1-14M10 11v6M14 11v6"/>'
      };
      return '<svg class="' + className + '" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + paths[name] + '</svg>';
    }

    function statusIcon(status) {
      const outer = '<circle cx="7" cy="7" r="6" fill="none" stroke="currentColor" stroke-width="1.5"/>';
      let content = outer;
      if (status === "backlog") content = Array.from({ length: 16 }, (_, index) => {
        const angle = index / 16 * Math.PI * 2 - Math.PI / 2;
        return '<circle cx="' + (7 + 6 * Math.cos(angle)) + '" cy="' + (7 + 6 * Math.sin(angle)) + '" r=".55" fill="currentColor"/>';
      }).join("");
      if (status === "in_progress") content = outer + '<path d="M7 7L7 3.5A3.5 3.5 0 0 1 7 10.5Z" fill="currentColor"/>';
      if (status === "in_review") content = outer + '<path d="M7 7L7 3.5A3.5 3.5 0 1 1 3.5 7Z" fill="currentColor"/>';
      if (status === "done") content = '<circle cx="7" cy="7" r="6" fill="currentColor"/><path d="M3.7 7.3L5.8 9.4 10.4 4.8" fill="none" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>';
      if (status === "blocked") content = outer + '<path d="M4.5 4.5L9.5 9.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>';
      if (status === "cancelled") content = outer + '<path d="M5 5L9 9M9 5L5 9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>';
      return '<svg class="better-codex-status-icon" viewBox="0 0 14 14" fill="none" aria-hidden="true">' + content + '</svg>';
    }

    function priorityIcon(priority) {
      const bars = { none: 0, low: 1, medium: 2, high: 3, urgent: 4 }[priority] || 0;
      if (!bars) return '<svg class="better-codex-priority" data-priority="none" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M3 8h10"/></svg>';
      return '<svg class="better-codex-priority" data-priority="' + escapeHtml(priority) + '" viewBox="0 0 16 16" fill="currentColor">' + [0,1,2,3].map(index => '<rect x="' + (1 + index * 4) + '" y="' + (9 - index * 3) + '" width="3" height="' + ((index + 1) * 3) + '" rx=".5" opacity="' + (index < bars ? 1 : .2) + '"/>').join("") + '</svg>';
    }

    function timeAgo(value) {
      const seconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
      if (seconds < 60) return "刚刚";
      if (seconds < 3600) return Math.floor(seconds / 60) + " 分钟前";
      if (seconds < 86400) return Math.floor(seconds / 3600) + " 小时前";
      return Math.floor(seconds / 86400) + " 天前";
    }

    function issueMatchesFilters(issue) {
      const filters = state.filters;
      if (filters.status.length && !filters.status.includes(issue.status)) return false;
      if (filters.priority.length && !filters.priority.includes(issue.priority)) return false;
      if (filters.project.length && !filters.project.includes(issue.project_id)) return false;
      if (filters.label.length && !filters.label.some(value => (issue.labels || []).includes(value))) return false;
      if (filters.assignee.length) {
        const assignee = issue.agent_enabled ? "codex" : "none";
        if (!filters.assignee.includes(assignee)) return false;
      }
      if (filters.creator.length && !filters.creator.includes("me")) return false;
      if (filters.date.length) {
        const age = Date.now() - new Date(issue.updated_at).getTime();
        if (!filters.date.some(days => age <= Number(days) * 86400000)) return false;
      }
      return true;
    }

    function closeFilterMenu() {
      panel?.querySelectorAll(".better-codex-filter-menu,.better-codex-filter-submenu").forEach(node => node.remove());
      if (filterDismiss) document.removeEventListener("click", filterDismiss, true);
      filterDismiss = null;
    }

    function filterOptions(key) {
      if (key === "status") return Object.entries(statusLabels).map(([value, text]) => ({ value, text }));
      if (key === "priority") return Object.entries(priorityLabels).map(([value, text]) => ({ value, text: value === "none" ? "无优先级" : text + "优先级" }));
      if (key === "date") return [{ value: "1", text: "最近 24 小时" }, { value: "7", text: "最近 7 天" }, { value: "30", text: "最近 30 天" }];
      if (key === "assignee") return [{ value: "codex", text: "Codex" }, { value: "none", text: "未分配" }];
      if (key === "creator") return [{ value: "me", text: "由我创建" }];
      if (key === "project") return state.projects.map(project => ({ value: project.id, text: project.name }));
      if (key === "label") return [...new Set(state.issues.flatMap(issue => issue.labels || []))].map(value => ({ value, text: value }));
      return [];
    }

    function openFilterMenu(trigger) {
      if (panel?.querySelector(".better-codex-filter-menu")) return closeFilterMenu();
      closeFilterMenu();
      const categories = [
        { key: "status", text: "状态", icon: "circle" },
        { key: "priority", text: "优先级", icon: "display" },
        { key: "date", text: "日期", icon: "calendar" },
        { key: "assignee", text: "负责人", icon: "user" },
        { key: "creator", text: "创建者", icon: "userEdit" },
        { key: "project", text: "项目", icon: "folder" },
        { key: "label", text: "标签", icon: "tag" }
      ];
      const menu = document.createElement("div");
      menu.className = "better-codex-filter-menu";
      menu.setAttribute(OWNED, "true");
      const submenu = document.createElement("div");
      submenu.className = "better-codex-filter-submenu";
      submenu.setAttribute(OWNED, "true");
      submenu.hidden = true;

      function renderSubmenu(key, row) {
        menu.querySelectorAll(".better-codex-filter-row").forEach(item => item.classList.toggle("is-active", item.dataset.filterCategory === key));
        const options = filterOptions(key);
        submenu.innerHTML = "";
        submenu.style.top = row.offsetTop + "px";
        submenu.style.right = "calc(100% + 4px)";
        if (!options.length) {
          submenu.innerHTML = '<div class="better-codex-filter-row"><span class="better-codex-filter-label">暂无可选项</span></div>';
        } else {
          for (const option of options) {
            const selected = state.filters[key].includes(option.value);
            const item = document.createElement("button");
            item.type = "button";
            item.className = "better-codex-filter-row";
            item.innerHTML = '<span class="better-codex-filter-check">' + (selected ? icon("check") : "") + '</span><span class="better-codex-filter-label">' + escapeHtml(option.text) + "</span>";
            item.addEventListener("click", event => {
              event.stopPropagation();
              const values = state.filters[key];
              state.filters[key] = values.includes(option.value) ? values.filter(value => value !== option.value) : [...values, option.value];
              render();
              renderSubmenu(key, row);
            });
            submenu.appendChild(item);
          }
        }
        submenu.hidden = false;
      }

      for (const category of categories) {
        const row = document.createElement("button");
        row.type = "button";
        row.className = "better-codex-filter-row";
        row.dataset.filterCategory = category.key;
        const count = state.filters[category.key].length;
        row.innerHTML = icon(category.icon) + '<span class="better-codex-filter-label">' + category.text + '</span>' + (count ? '<span class="better-codex-filter-count">' + count + "</span>" : "") + '<span class="better-codex-filter-chevron">' + icon("chevron") + "</span>";
        row.addEventListener("mouseenter", () => renderSubmenu(category.key, row));
        row.addEventListener("click", event => { event.stopPropagation(); renderSubmenu(category.key, row); });
        menu.appendChild(row);
      }
      if (Object.values(state.filters).some(values => values.length)) {
        const separator = document.createElement("div");
        separator.className = "better-codex-filter-separator";
        const reset = document.createElement("button");
        reset.type = "button";
        reset.className = "better-codex-filter-row";
        reset.innerHTML = '<span class="better-codex-filter-label">清除筛选</span>';
        reset.addEventListener("click", event => {
          event.stopPropagation();
          for (const key of Object.keys(state.filters)) state.filters[key] = [];
          render();
          closeFilterMenu();
        });
        menu.append(separator, reset);
      }
      menu.appendChild(submenu);
      trigger.parentElement.appendChild(menu);
      filterDismiss = event => {
        if (!menu.contains(event.target) && !submenu.contains(event.target) && !trigger.contains(event.target)) closeFilterMenu();
      };
      setTimeout(() => document.addEventListener("click", filterDismiss, true), 0);
    }

    function closeIssueMenu() {
      issueMenu?.remove();
      issueMenu = null;
      if (issueMenuDismiss) {
        document.removeEventListener("pointerdown", issueMenuDismiss, true);
        document.removeEventListener("keydown", issueMenuDismiss, true);
      }
      issueMenuDismiss = null;
    }

    async function copyText(value) {
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

    function openIssueMenu(event) {
      const card = event.target.closest("[data-issue-id]");
      const issue = state.issues.find(item => item.id === card?.dataset.issueId);
      if (!issue) return;
      event.preventDefault();
      event.stopPropagation();
      closeFilterMenu();
      closeIssueMenu();
      const project = state.projects.find(item => item.id === issue.project_id);
      const workspacePath = issue.workspace_path || project?.workspace_path || readContext().workspacePath;
      const statusItems = Object.entries(statusLabels).map(([value, text]) => '<button class="better-codex-context-item" type="button" data-context-action="update" data-context-field="status" data-context-value="' + value + '"><span class="better-codex-context-check">' + (issue.status === value ? icon("check") : "") + '</span>' + statusIcon(value) + '<span>' + escapeHtml(text) + "</span></button>").join("");
      const priorityItems = Object.entries(priorityLabels).map(([value, text]) => '<button class="better-codex-context-item" type="button" data-context-action="update" data-context-field="priority" data-context-value="' + value + '"><span class="better-codex-context-check">' + (issue.priority === value ? icon("check") : "") + '</span>' + priorityIcon(value) + '<span>' + escapeHtml(value === "none" ? "无优先级" : text + "优先级") + "</span></button>").join("");
      const menu = document.createElement("div");
      menu.id = "better-codex-context-menu";
      menu.setAttribute(OWNED, "true");
      menu.dataset.issueId = issue.id;
      menu.dataset.align = event.clientX + 430 > window.innerWidth ? "left" : "right";
      menu.innerHTML = '<div class="better-codex-context-item-wrap"><button class="better-codex-context-item" type="button">' + statusIcon(issue.status) + '<span>状态</span>' + icon("chevron") + '</button><div class="better-codex-context-submenu">' + statusItems + '</div></div><div class="better-codex-context-item-wrap"><button class="better-codex-context-item" type="button">' + priorityIcon(issue.priority) + '<span>优先级</span>' + icon("chevron") + '</button><div class="better-codex-context-submenu">' + priorityItems + '</div></div>' + (workspacePath ? '<div class="better-codex-context-divider"></div><button class="better-codex-context-item" type="button" data-context-action="copy-workspace">' + icon("folder") + '<span>复制本地 workdir 路径</span></button>' : "") + '<div class="better-codex-context-divider"></div><button class="better-codex-context-item is-danger" type="button" data-context-action="archive">' + icon("trash") + '<span>删除任务</span></button>';
      document.body.appendChild(menu);
      const rect = menu.getBoundingClientRect();
      menu.style.left = Math.max(8, Math.min(event.clientX, window.innerWidth - rect.width - 8)) + "px";
      menu.style.top = Math.max(8, Math.min(event.clientY, window.innerHeight - rect.height - 8)) + "px";
      menu.addEventListener("click", clickEvent => {
        const item = clickEvent.target.closest("[data-context-action]");
        if (!item) return;
        clickEvent.preventDefault();
        clickEvent.stopPropagation();
        const current = state.issues.find(candidate => candidate.id === menu.dataset.issueId);
        if (!current) return closeIssueMenu();
        if (item.dataset.contextAction === "copy-workspace") {
          closeIssueMenu();
          return void perform(() => copyText(workspacePath));
        }
        if (item.dataset.contextAction === "archive") {
          closeIssueMenu();
          if (!window.confirm("删除任务 " + current.identifier + "？")) return;
          return void perform(async () => {
            await api("/api/issues/" + encodeURIComponent(current.id) + "/archive", { method: "POST", body: JSON.stringify({ version: current.version }) });
            await loadIssues();
          });
        }
        const field = item.dataset.contextField;
        const value = item.dataset.contextValue;
        if (!field || !value || current[field] === value) return closeIssueMenu();
        closeIssueMenu();
        void perform(async () => {
          await api("/api/issues/" + encodeURIComponent(current.id), { method: "PATCH", body: JSON.stringify({ version: current.version, [field]: value }) });
          await loadIssues();
        });
      });
      issueMenu = menu;
      issueMenuDismiss = dismissEvent => {
        if (dismissEvent.type === "keydown" && dismissEvent.key !== "Escape") return;
        if (dismissEvent.type === "pointerdown" && menu.contains(dismissEvent.target)) return;
        closeIssueMenu();
      };
      setTimeout(() => {
        document.addEventListener("pointerdown", issueMenuDismiss, true);
        document.addEventListener("keydown", issueMenuDismiss, true);
      }, 0);
    }

    function createPanel() {
      const nativeFrame = document.querySelector(SELECTORS.contentFrame);
      const section = document.createElement("section");
      section.id = PANEL_ID;
      section.className = nativeFrame?.className || "";
      section.hidden = true;
      section.setAttribute(OWNED, "true");
      const error = document.createElement("div");
      error.id = "better-codex-error";
      error.className = "better-codex-error";
      error.hidden = true;
      const toolbar = document.createElement("div");
      toolbar.className = "better-codex-toolbar";
      const tabs = document.createElement("div");
      tabs.className = "better-codex-tabs better-codex-issue-only";
      for (const [view, text] of [["all", "全部"], ["member", "成员"], ["agent", "智能体"]]) {
        const button = actionButton(text);
        button.dataset.view = view;
        button.addEventListener("click", () => { state.view = view; render(); });
        tabs.append(button);
      }
      const agentHeading = document.createElement("div");
      agentHeading.className = "better-codex-agent-heading";
      agentHeading.innerHTML = "<strong>智能体</strong><span>管理 Codex Profile Agent</span>";
      const actions = document.createElement("div");
      actions.className = "better-codex-actions better-codex-issue-only";
      const working = actionButton("0 个智能体工作中");
      working.id = "better-codex-working";
      working.classList.add("better-codex-working-chip", "is-bordered");
      working.addEventListener("click", () => { state.view = state.view === "agent" ? "all" : "agent"; render(); });
      const search = document.createElement("input");
      search.id = "better-codex-search";
      search.className = "better-codex-search";
      search.placeholder = "搜索任务";
      search.value = "";
      search.addEventListener("input", () => { state.search = search.value; void perform(loadIssues); });
      const addProject = actionButton("新建项目");
      addProject.classList.add("is-bordered");
      addProject.addEventListener("click", () => void perform(async () => openNativeProjectEditor()));
      const filter = actionButton("筛选");
      filter.id = "better-codex-filter";
      filter.classList.add("is-bordered");
      filter.insertAdjacentHTML("afterbegin", icon("filter"));
      filter.addEventListener("click", event => { event.stopPropagation(); openFilterMenu(filter); });
      const filterWrap = document.createElement("div");
      filterWrap.className = "better-codex-filter-wrap";
      filterWrap.appendChild(filter);
      const addIssue = actionButton("新建 issue");
      addIssue.classList.add("is-bordered");
      addIssue.insertAdjacentHTML("afterbegin", icon("plus"));
      addIssue.addEventListener("click", () => openEditor());
      actions.append(error, working, search, filterWrap, addProject, addIssue);
      const agentActions = document.createElement("div");
      agentActions.className = "better-codex-agent-actions";
      const agentSearch = document.createElement("input");
      agentSearch.className = "better-codex-search";
      agentSearch.placeholder = "搜索智能体";
      agentSearch.addEventListener("input", () => { state.agentSearch = agentSearch.value; renderAgents(); });
      const addAgent = actionButton("新建智能体");
      addAgent.classList.add("is-bordered");
      addAgent.insertAdjacentHTML("afterbegin", icon("plus"));
      addAgent.addEventListener("click", () => openAgentEditor());
      agentActions.append(agentSearch, addAgent);
      toolbar.append(tabs, agentHeading, actions, agentActions);
      const board = document.createElement("main");
      board.id = "better-codex-board";
      board.className = "better-codex-board better-codex-issue-only";
      board.addEventListener("click", onBoardClick);
      board.addEventListener("contextmenu", openIssueMenu);
      board.addEventListener("dragstart", event => event.dataTransfer?.setData("text/plain", event.target.closest("[data-issue-id]")?.dataset.issueId || ""));
      board.addEventListener("dragover", event => event.preventDefault());
      board.addEventListener("drop", onDrop);
      const agents = document.createElement("main");
      agents.id = "better-codex-agents";
      agents.className = "better-codex-agents";
      agents.addEventListener("click", onAgentsClick);
      section.append(toolbar, board, agents);
      return section;
    }

    function renderAgents() {
      const container = panel?.querySelector("#better-codex-agents");
      if (!container) return;
      const query = state.agentSearch.trim().toLowerCase();
      const agents = state.agents.filter(agent => !query || [agent.name, agent.description, agent.instructions, agent.model].some(value => String(value || "").toLowerCase().includes(query)));
      if (!agents.length) {
        container.innerHTML = '<div class="better-codex-agents-empty"><span class="better-codex-agents-empty-icon">' + icon("bot", "") + '</span><strong>' + (query ? "没有匹配的智能体" : "创建第一个智能体") + '</strong><p>' + (query ? "换一个关键词试试。" : "配置名称、职责指令和模型等级，Codex 会将它注册为可协作的 Profile Agent。") + '</p>' + (query ? "" : '<button class="better-codex-button is-bordered" type="button" data-agent-create>' + icon("plus") + '新建智能体</button>') + '</div>';
        return;
      }
      container.innerHTML = '<div class="better-codex-agent-grid">' + agents.map(agent => {
        const initial = Array.from(agent.name.trim())[0] || "AI";
        return '<article class="better-codex-agent-card" data-agent-id="' + escapeHtml(agent.id) + '"><div class="better-codex-agent-card-head"><span class="better-codex-agent-card-avatar">' + escapeHtml(initial) + '</span><div class="better-codex-agent-card-title"><strong>' + escapeHtml(agent.name) + '</strong><span>' + escapeHtml(agent.description) + '</span></div></div><div class="better-codex-agent-card-instructions">' + escapeHtml(agent.instructions) + '</div><div class="better-codex-agent-card-meta"><span class="better-codex-chip">' + escapeHtml(agent.model) + '</span><span class="better-codex-chip">' + escapeHtml(agent.reasoning_effort) + '</span><span class="better-codex-agent-card-actions"><button class="better-codex-agent-card-action" type="button" data-agent-edit aria-label="编辑">' + icon("edit") + '</button><button class="better-codex-agent-card-action is-danger" type="button" data-agent-delete aria-label="删除">' + icon("trash") + '</button></span></div></article>';
      }).join("") + "</div>";
    }

    function render() {
      if (!panel) return;
      panel.dataset.surface = state.surface;
      renderAgents();
      const runningCount = state.issues.filter(issue => issue.active_run_status === "running" || issue.active_run_status === "claimed").length;
      panel.querySelectorAll("[data-view]").forEach(button => button.classList.toggle("is-active", button.dataset.view === state.view));
      const working = panel.querySelector("#better-codex-working");
      working.innerHTML = (runningCount ? '<span class="better-codex-working-dot"></span>' : "") + runningCount + " 个智能体工作中";
      working.title = runningCount ? "查看运行中的任务" : "当前没有运行中的任务";
      working.classList.toggle("has-work", runningCount > 0);
      working.classList.toggle("is-active", state.view === "agent");
      const filterButton = panel.querySelector("#better-codex-filter");
      const filterCount = Object.values(state.filters).reduce((total, values) => total + values.length, 0);
      filterButton.innerHTML = icon("filter") + (filterCount ? filterCount + " 个筛选" : "筛选");
      filterButton.classList.toggle("is-active", filterCount > 0);
      const visible = state.issues.filter(issue => (state.view === "all" || (state.view === "member" ? Boolean(issue.thread_id) : Boolean(issue.agent_enabled))) && issueMatchesFilters(issue));
      const project = state.projects.find(item => item.id === state.projectId);
      panel.querySelector("#better-codex-board").innerHTML = Object.entries(statusLabels).map(([status, statusLabel]) => {
        const issues = visible.filter(issue => issue.status === status);
        const cards = issues.map(issue => {
          const sessionId = issue.run_thread_id || "";
          const activity = issue.active_run_status ? '<span class="better-codex-activity" data-run="' + escapeHtml(issue.active_run_status) + '"><span class="better-codex-avatar">AI</span><span class="' + (issue.active_run_status === "running" ? "better-codex-shimmer" : "") + '">' + (issue.active_run_status === "running" ? "Working" : "Queued") + '</span></span>' : "";
          const description = String(issue.description || "").replace(/[#*_\`~>\[\]()]/g, "").replace(/\s+/g, " ").trim();
          const chips = [project?.name, ...(issue.labels || [])].filter(Boolean).map(value => '<span class="better-codex-chip">' + escapeHtml(value) + '</span>').join("");
          const meta = sessionId ? '<span>打开 Session</span>' : '<span>等待 Session</span>';
          return '<article class="better-codex-card" draggable="true" data-issue-id="' + escapeHtml(issue.id) + '"' + (sessionId ? ' data-thread="' + escapeHtml(sessionId) + '"' : "") + '><div class="better-codex-card-row"><div class="better-codex-card-id">' + priorityIcon(issue.priority) + '<span>' + escapeHtml(issue.identifier) + '</span></div>' + activity + '</div><div class="better-codex-card-title">' + escapeHtml(issue.title) + '</div>' + (description ? '<div class="better-codex-card-description">' + escapeHtml(description) + '</div>' : "") + (chips ? '<div class="better-codex-chip-row">' + chips + '</div>' : "") + '<div class="better-codex-card-meta">' + meta + '<span>更新于 ' + timeAgo(issue.updated_at) + '</span></div></article>';
        }).join("");
        return '<section class="better-codex-column" data-status="' + status + '"><div class="better-codex-column-head"><span class="better-codex-column-title">' + statusIcon(status) + '<span>' + statusLabel + '</span><span>' + issues.length + '</span></span><span class="better-codex-column-actions"><button class="better-codex-column-icon" type="button" aria-label="更多">' + icon("more") + '</button><button class="better-codex-column-icon" type="button" data-add-status="' + status + '" aria-label="新建任务">' + icon("plus") + '</button></span></div><div class="better-codex-cards">' + (cards || '<div class="better-codex-empty">暂无任务</div>') + '</div></section>';
      }).join("");
    }

    async function loadIssues() {
      if (!state.projectId) return render();
      const query = new URLSearchParams({ project_id: state.projectId });
      if (state.search) query.set("search", state.search);
      state.issues = await api("/api/issues?" + query);
      render();
    }

    async function loadAgents() {
      state.agents = await api("/api/agents");
      render();
    }

    async function loadSurface() {
      if (state.surface === "agents") await loadAgents();
      else await loadIssues();
    }

    async function load() {
      clearError();
      try {
        const bootstrap = await api("/api/bootstrap");
        state.projects = bootstrap.projects;
        state.agentModels = bootstrap.agentModels || [];
        state.agentReasoningEfforts = bootstrap.agentReasoningEfforts || [];
        const context = readContext();
        if (context.projectId) {
          let project = state.projects.find(item => item.external_id === context.projectId);
          if (!project) {
            const source = context.projects.find(item => item.id === context.projectId);
            project = await api("/api/projects/ensure", { method: "POST", body: JSON.stringify({ external_id: context.projectId, name: source?.name || "Codex", workspace_path: context.workspacePath }) });
            state.projects.push(project);
          }
          state.projectId = project.id;
        } else if (!state.projects.some(item => item.id === state.projectId)) {
          state.projectId = state.projects[0]?.id || "";
        }
        await loadSurface();
      } catch (error) {
        const board = panel?.querySelector("#better-codex-board");
        const message = error instanceof Error ? error.message : "无法连接 Better Codex Runtime";
        showError(message);
        if (board) board.innerHTML = '<div class="better-codex-empty">' + escapeHtml(message) + " · 点击刷新重试</div>";
      }
    }

    function openAgentEditor(agent = null) {
      const dialog = document.createElement("dialog");
      dialog.id = "better-codex-agent-dialog";
      dialog.setAttribute(OWNED, "true");
      const modelOptions = state.agentModels.map(value => '<option value="' + escapeHtml(value) + '">' + escapeHtml(value) + "</option>").join("");
      const effortOptions = state.agentReasoningEfforts.map(value => '<option value="' + escapeHtml(value) + '">' + escapeHtml(value) + "</option>").join("");
      dialog.innerHTML = '<form><div class="better-codex-agent-dialog-head"><div><strong>' + (agent ? "编辑智能体" : "创建智能体") + '</strong><span>配置一个可供 Codex 调度的 Profile Agent</span></div><button class="better-codex-agent-card-action" type="button" data-agent-close aria-label="关闭">' + icon("close") + '</button></div><div class="better-codex-agent-dialog-body"><section class="better-codex-agent-section"><div class="better-codex-agent-section-title"><strong>身份</strong><span>帮助主智能体理解它是谁，以及适合承担什么工作。</span></div><div class="better-codex-agent-settings"><div class="better-codex-agent-field"><label for="better-codex-agent-name">名称</label><input id="better-codex-agent-name" name="name" maxlength="80" autocomplete="off" placeholder="例如：前端工程师" required></div><div class="better-codex-agent-field is-top"><label for="better-codex-agent-description">描述</label><textarea id="better-codex-agent-description" name="description" maxlength="500" rows="3" placeholder="简要说明这个智能体擅长什么，以及何时应调用它" required></textarea></div></div></section><section class="better-codex-agent-section"><div class="better-codex-agent-section-title"><strong>行为</strong><span>这些指令会作为 developer instructions 注入智能体上下文。</span></div><div class="better-codex-agent-settings"><div class="better-codex-agent-field is-top"><label for="better-codex-agent-instructions">指令</label><textarea id="better-codex-agent-instructions" name="instructions" placeholder="定义职责、工作方式、输出要求和边界" required></textarea></div></div></section><section class="better-codex-agent-section"><div class="better-codex-agent-section-title"><strong>执行</strong><span>选择该智能体使用的模型和推理等级。</span></div><div class="better-codex-agent-settings"><div class="better-codex-agent-execution"><div><label for="better-codex-agent-model">模型</label><select id="better-codex-agent-model" name="model">' + modelOptions + '</select></div><div><label for="better-codex-agent-effort">推理等级</label><select id="better-codex-agent-effort" name="reasoning_effort">' + effortOptions + '</select></div></div></div></section><div class="better-codex-agent-dialog-error" hidden></div></div><div class="better-codex-agent-dialog-footer"><button class="better-codex-button" type="button" data-agent-close>取消</button><button class="better-codex-submit" type="submit">' + (agent ? "保存修改" : "创建智能体") + "</button></div></form>";
      document.body.appendChild(dialog);
      const form = dialog.querySelector("form");
      form.elements.name.value = agent?.name || "";
      form.elements.description.value = agent?.description || "";
      form.elements.instructions.value = agent?.instructions || "";
      form.elements.model.value = agent?.model || (state.agentModels.includes("gpt-5.3-codex-spark") ? "gpt-5.3-codex-spark" : state.agentModels[0] || "");
      form.elements.reasoning_effort.value = agent?.reasoning_effort || (state.agentReasoningEfforts.includes("medium") ? "medium" : state.agentReasoningEfforts[0] || "");
      dialog.querySelectorAll("[data-agent-close]").forEach(button => button.addEventListener("click", () => dialog.close()));
      form.addEventListener("submit", event => {
        event.preventDefault();
        void perform(async () => {
          const submit = form.querySelector('[type="submit"]');
          const error = form.querySelector(".better-codex-agent-dialog-error");
          submit.disabled = true;
          error.hidden = true;
          try {
            const body = {
              name: form.elements.name.value,
              description: form.elements.description.value,
              instructions: form.elements.instructions.value,
              model: form.elements.model.value,
              reasoning_effort: form.elements.reasoning_effort.value,
              ...(agent ? { version: agent.version } : {})
            };
            await api(agent ? "/api/agents/" + encodeURIComponent(agent.id) : "/api/agents", { method: agent ? "PATCH" : "POST", body: JSON.stringify(body) });
            await loadAgents();
            dialog.close();
          } catch (caught) {
            error.textContent = caught instanceof Error ? caught.message : "保存失败";
            error.hidden = false;
            submit.disabled = false;
          }
        });
      });
      dialog.addEventListener("close", () => dialog.remove(), { once: true });
      dialog.showModal();
      form.elements.name.focus();
    }

    function onAgentsClick(event) {
      if (event.target.closest("[data-agent-create]")) return openAgentEditor();
      const card = event.target.closest("[data-agent-id]");
      if (!card) return;
      const agent = state.agents.find(item => item.id === card.dataset.agentId);
      if (!agent) return;
      if (event.target.closest("[data-agent-delete]")) {
        if (!confirm('确定删除智能体“' + agent.name + '”吗？')) return;
        void perform(async () => {
          await api("/api/agents/" + encodeURIComponent(agent.id), { method: "DELETE", body: JSON.stringify({ version: agent.version }) });
          await loadAgents();
        });
        return;
      }
      if (event.target.closest("[data-agent-edit]") || event.target === card) openAgentEditor(agent);
    }

    function openNativeProjectEditor() {
      const button = document.querySelector("[data-app-action-sidebar-project-create]");
      if (!button) throw new Error("native_project_create_unavailable");
      close();
      button.click();
    }

    function openEditor(issue = null, initialStatus = "todo") {
      state.selected = issue;
      document.getElementById("better-codex-dialog")?.remove();
      const context = readContext();
      const project = state.projects.find(item => item.id === state.projectId);
      const draft = {
        mode: issue ? "manual" : state.createMode,
        title: issue?.title || "",
        description: issue?.description || "",
        prompt: issue?.description || "",
        status: issue?.status || initialStatus,
        priority: issue?.priority || "none",
        labels: (issue?.labels || []).join(", "),
        projectId: issue?.project_id || state.projectId,
        expanded: false
      };
      const dialog = document.createElement("dialog");
      dialog.id = "better-codex-dialog";
      dialog.setAttribute(OWNED, "true");
      let projectDismiss = null;

      function syncDraft() {
        const form = dialog.querySelector("form");
        if (!form) return;
        const values = new FormData(form);
        if (draft.mode === "manual") {
          draft.title = String(values.get("title") || "");
          draft.description = String(values.get("description") || "");
          draft.status = String(values.get("status") || draft.status);
          draft.priority = String(values.get("priority") || draft.priority);
          draft.labels = String(values.get("labels") || "");
        } else {
          draft.prompt = String(values.get("prompt") || "");
        }
      }

      function header() {
        return '<div class="better-codex-dialog-head"><div class="better-codex-dialog-breadcrumb"><span>' + escapeHtml(project?.name || "Better Codex") + '</span><span>›</span><strong>' + (draft.mode === "agent" ? "通过智能体创建" : issue ? "编辑 issue" : "手动创建") + '</strong></div><div class="better-codex-dialog-head-actions"><button class="better-codex-icon-button" type="button" data-dialog-expand aria-label="展开">' + icon("expand") + '</button><button class="better-codex-icon-button" type="button" data-dialog-close aria-label="关闭">' + icon("close") + '</button></div></div>';
      }

      function projectPicker() {
        const selectedProject = state.projects.find(item => item.id === draft.projectId);
        if (issue) return '<span class="better-codex-property">' + icon("folder") + '<span>' + escapeHtml(selectedProject?.name || "无项目") + '</span></span>';
        const options = state.projects.map(item => '<button class="better-codex-project-option" type="button" data-dialog-project-option="' + escapeHtml(item.id) + '">' + icon("folder") + '<span>' + escapeHtml(item.name) + '</span><span class="better-codex-project-check">' + (item.id === draft.projectId ? icon("check") : "") + '</span></button>').join("");
        return '<span class="better-codex-project-picker"><button class="better-codex-property" type="button" data-dialog-project>' + icon("folder") + '<span data-project-label>' + escapeHtml(selectedProject?.name || "选择项目") + '</span></button><span class="better-codex-project-menu" hidden><input class="better-codex-project-search" type="search" placeholder="搜索项目..." aria-label="搜索项目"><span data-project-options>' + (options || '<span class="better-codex-project-empty">暂无项目</span>') + '</span></span></span>';
      }

      function propertyRows() {
        const projectChip = projectPicker();
        if (draft.mode === "agent") return '<div class="better-codex-dialog-properties">' + projectChip + '</div>';
        const statuses = Object.entries(statusLabels).map(([value, text]) => '<option value="' + value + '"' + (draft.status === value ? " selected" : "") + '>' + text + '</option>').join("");
        const priorities = Object.entries(priorityLabels).map(([value, text]) => '<option value="' + value + '"' + (draft.priority === value ? " selected" : "") + '>' + (value === "none" ? "无优先级" : text + "优先级") + '</option>').join("");
        const agentChip = issue?.agent_enabled ? '<span class="better-codex-property"><span class="better-codex-agent-avatar">AI</span><span>Codex</span></span>' : "";
        return '<div class="better-codex-dialog-properties"><label class="better-codex-property">' + statusIcon(draft.status) + '<select name="status" aria-label="状态">' + statuses + '</select></label><label class="better-codex-property">' + priorityIcon(draft.priority) + '<select name="priority" aria-label="优先级">' + priorities + '</select></label>' + agentChip + '<label class="better-codex-property">' + icon("tag") + '<input name="labels" value="' + escapeHtml(draft.labels) + '" placeholder="添加标签" aria-label="标签"></label>' + projectChip + '</div>';
      }

      function footer() {
        const switchButton = issue ? "" : '<button class="better-codex-switch-mode" type="button" data-dialog-switch>' + icon("switch") + (draft.mode === "agent" ? "切换到手动" : "切换到智能体") + '</button>';
        const submitText = issue ? "保存" : draft.mode === "agent" ? "创建" : "创建任务";
        return '<div class="better-codex-dialog-footer"><button class="better-codex-icon-button" type="button" aria-label="添加附件">' + icon("paperclip") + '</button><div class="better-codex-dialog-footer-right">' + switchButton + '<label class="better-codex-keep-open"><input class="better-codex-toggle" name="keep" type="checkbox"' + (state.keepCreate ? " checked" : "") + '>继续创建</label><button class="better-codex-submit" type="submit">' + submitText + '<span class="better-codex-keycap">⌘</span><span class="better-codex-keycap">↵</span></button></div></div>';
      }

      function renderDialog() {
        if (projectDismiss) document.removeEventListener("pointerdown", projectDismiss, true);
        projectDismiss = null;
        dialog.dataset.mode = draft.mode;
        dialog.dataset.expanded = String(draft.expanded);
        if (draft.mode === "agent") {
          dialog.innerHTML = '<form>' + header() + '<div class="better-codex-agent-picker"><span>创建者</span><strong><span class="better-codex-agent-avatar">AI</span>Codex</strong></div><textarea class="better-codex-dialog-editor" name="prompt" placeholder="告诉智能体要做什么，例如：&quot;修复项目里任务运行状态不可见的问题&quot;">' + escapeHtml(draft.prompt) + '</textarea>' + propertyRows() + '<div class="better-codex-dialog-error" hidden></div>' + footer() + '</form>';
          dialog.querySelector(".better-codex-dialog-properties")?.insertAdjacentHTML("beforebegin", '<div class="better-codex-run-hint"><span class="better-codex-agent-avatar">AI</span><span>创建后 Codex 将自动开始工作。</span></div>');
        } else {
          dialog.innerHTML = '<form>' + header() + '<input class="better-codex-manual-title" name="title" maxlength="500" placeholder="任务标题" value="' + escapeHtml(draft.title) + '"><textarea class="better-codex-dialog-editor" name="description" placeholder="添加描述...">' + escapeHtml(draft.description) + '</textarea>' + propertyRows() + '<div class="better-codex-dialog-error" hidden></div>' + footer() + '</form>';
        }
        const submit = dialog.querySelector(".better-codex-submit");
        const content = dialog.querySelector(draft.mode === "agent" ? '[name="prompt"]' : '[name="title"]');
        const updateSubmit = () => { submit.disabled = !String(content?.value || "").trim(); };
        updateSubmit();
        content?.addEventListener("input", updateSubmit);
        dialog.querySelector('[name="keep"]')?.addEventListener("change", event => { state.keepCreate = event.currentTarget.checked; });
        dialog.querySelector('[name="status"]')?.addEventListener("change", event => {
          draft.status = event.currentTarget.value;
          const hint = dialog.querySelector(".better-codex-run-hint");
          if (hint) hint.hidden = draft.status !== "todo";
        });
        const projectButton = dialog.querySelector("[data-dialog-project]");
        const projectMenu = dialog.querySelector(".better-codex-project-menu");
        const projectSearch = dialog.querySelector(".better-codex-project-search");
        projectButton?.addEventListener("click", event => {
          event.stopPropagation();
          projectMenu.hidden = !projectMenu.hidden;
          if (projectMenu.hidden) {
            if (projectDismiss) document.removeEventListener("pointerdown", projectDismiss, true);
            projectDismiss = null;
            return;
          }
          projectSearch.value = "";
          projectMenu.querySelectorAll("[data-dialog-project-option]").forEach(option => { option.hidden = false; });
          projectSearch.focus();
          projectDismiss = dismissEvent => {
            if (projectMenu.contains(dismissEvent.target) || projectButton.contains(dismissEvent.target)) return;
            projectMenu.hidden = true;
            document.removeEventListener("pointerdown", projectDismiss, true);
            projectDismiss = null;
          };
          setTimeout(() => document.addEventListener("pointerdown", projectDismiss, true), 0);
        });
        projectSearch?.addEventListener("input", () => {
          const query = label(projectSearch.value);
          projectMenu.querySelectorAll("[data-dialog-project-option]").forEach(option => { option.hidden = Boolean(query) && !label(option.textContent).includes(query); });
        });
        dialog.querySelectorAll("[data-dialog-project-option]").forEach(option => option.addEventListener("click", event => {
          event.stopPropagation();
          draft.projectId = option.dataset.dialogProjectOption;
          const selectedProject = state.projects.find(item => item.id === draft.projectId);
          dialog.querySelector("[data-project-label]").textContent = selectedProject?.name || "选择项目";
          dialog.querySelectorAll("[data-dialog-project-option]").forEach(item => { item.querySelector(".better-codex-project-check").innerHTML = item.dataset.dialogProjectOption === draft.projectId ? icon("check") : ""; });
          projectMenu.hidden = true;
          if (projectDismiss) document.removeEventListener("pointerdown", projectDismiss, true);
          projectDismiss = null;
        }));
        dialog.querySelector("[data-dialog-close]")?.addEventListener("click", () => dialog.close());
        dialog.querySelector("[data-dialog-expand]")?.addEventListener("click", () => { draft.expanded = !draft.expanded; dialog.dataset.expanded = String(draft.expanded); });
        dialog.querySelector("[data-dialog-switch]")?.addEventListener("click", () => {
          syncDraft();
          if (draft.mode === "manual") {
            draft.prompt = draft.prompt || [draft.title, draft.description].filter(Boolean).join("\\n\\n");
            draft.mode = "agent";
          } else {
            if (!draft.title) draft.title = draft.prompt.split(/\\n/).find(line => line.trim())?.trim().slice(0, 120) || "";
            if (!draft.description) draft.description = draft.prompt;
            draft.mode = "manual";
          }
          state.createMode = draft.mode;
          renderDialog();
          dialog.querySelector(draft.mode === "agent" ? '[name="prompt"]' : '[name="title"]')?.focus();
        });
        dialog.querySelector("form")?.addEventListener("keydown", event => {
          if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
            event.preventDefault();
            dialog.querySelector("form")?.requestSubmit();
          }
        });
        dialog.querySelector("form")?.addEventListener("submit", event => {
          event.preventDefault();
          syncDraft();
          void submitIssue();
        });
      }

      async function submitIssue() {
        const submit = dialog.querySelector(".better-codex-submit");
        const errorOutput = dialog.querySelector(".better-codex-dialog-error");
        const prompt = draft.prompt.trim();
        const title = draft.mode === "agent" ? prompt.split(/\\n/).find(line => line.trim())?.replace(/^[#*\\s-]+/, "").trim().slice(0, 120) || "" : draft.title.trim();
        if (!title) return;
        submit.disabled = true;
        errorOutput.hidden = true;
        try {
          const body = {
            title,
            description: draft.mode === "agent" ? prompt : draft.description,
            status: draft.mode === "agent" ? "todo" : draft.status,
            priority: draft.priority,
            labels: draft.labels.split(/[,，]/).map(value => value.trim()).filter(Boolean),
            thread_id: context.threadId || issue?.thread_id || "",
            workspace_path: state.projects.find(item => item.id === draft.projectId)?.workspace_path || context.workspacePath,
            agent_enabled: issue ? issue.agent_enabled : draft.mode === "agent"
          };
          if (issue) await api("/api/issues/" + encodeURIComponent(issue.id), { method: "PATCH", body: JSON.stringify({ ...body, version: issue.version }) });
          else {
            await api("/api/issues", { method: "POST", body: JSON.stringify({ ...body, project_id: draft.projectId }) });
            state.projectId = draft.projectId;
          }
          state.createMode = draft.mode;
          await loadIssues();
          if (!issue && state.keepCreate) {
            draft.title = "";
            draft.description = "";
            draft.prompt = "";
            renderDialog();
            dialog.querySelector(draft.mode === "agent" ? '[name="prompt"]' : '[name="title"]')?.focus();
          } else {
            dialog.close();
          }
        } catch (error) {
          errorOutput.textContent = error instanceof Error ? error.message : "创建失败";
          errorOutput.hidden = false;
          submit.disabled = false;
        }
      }

      document.body.append(dialog);
      dialog.addEventListener("close", () => {
        if (projectDismiss) document.removeEventListener("pointerdown", projectDismiss, true);
        dialog.remove();
      }, { once: true });
      renderDialog();
      dialog.showModal();
      dialog.querySelector(draft.mode === "agent" ? '[name="prompt"]' : '[name="title"]')?.focus();
    }

    function onBoardClick(event) {
      const add = event.target.closest("[data-add-status]");
      if (add) return openEditor(null, add.dataset.addStatus);
      const thread = event.target.closest("[data-thread]");
      if (thread) return void perform(() => openThread(thread.dataset.thread));
      const pin = event.target.closest("[data-pin]");
      if (pin) {
        const issue = state.issues.find(item => item.id === pin.dataset.pin);
        if (!issue) return;
        return void perform(async () => {
          await api("/api/issues/" + encodeURIComponent(issue.id), { method: "PATCH", body: JSON.stringify({ version: issue.version, pinned: !issue.pinned }) });
          await loadIssues();
        });
      }
      const card = event.target.closest("[data-issue-id]");
      const issue = state.issues.find(item => item.id === card?.dataset.issueId);
      if (issue) showError(new Error("任务尚未关联 Session"));
    }

    function onDrop(event) {
      event.preventDefault();
      const id = event.dataTransfer?.getData("text/plain");
      const status = event.target.closest("[data-status]")?.dataset.status;
      const issue = state.issues.find(item => item.id === id);
      if (!issue || !status || issue.status === status) return;
      void perform(async () => {
        await api("/api/issues/" + encodeURIComponent(issue.id), { method: "PATCH", body: JSON.stringify({ version: issue.version, status }) });
        await loadIssues();
      });
    }

    function mountPanel() {
      if (!active) return;
      const surface = findMount();
      if (!surface) return;
      if (!panel) panel = createPanel();
      if (panel.parentElement !== surface) surface.appendChild(panel);
      surface.setAttribute(HOST, "true");
      Array.from(surface.children).forEach(child => {
        if (child !== panel && child.getAttribute(OWNED) !== "true") child.setAttribute(HIDDEN, "true");
      });
      panel.hidden = false;
      document.documentElement.setAttribute("data-better-codex-open", "true");
    }

    function restoreNative() {
      document.querySelectorAll('[' + HIDDEN + '="true"]').forEach(node => node.removeAttribute(HIDDEN));
      document.querySelectorAll('[' + HOST + '="true"]').forEach(node => node.removeAttribute(HOST));
      document.documentElement.removeAttribute("data-better-codex-open");
    }

    function open(surface = state.surface) {
      if (destroyed) return;
      state.surface = surface;
      active = true;
      ensureEntry();
      mountPanel();
      void load();
      if (pollTimer === null) pollTimer = setInterval(() => { if (active) void perform(loadSurface); }, 3000);
    }

    function close() {
      active = false;
      closeFilterMenu();
      closeIssueMenu();
      if (pollTimer !== null) {
        clearInterval(pollTimer);
        pollTimer = null;
      }
      if (panel) panel.hidden = true;
      restoreNative();
      ensureEntry();
    }

    async function openThread(threadId) {
      const expected = String(threadId || "").replace(/^(local|cloud):/i, "");
      const row = Array.from(document.querySelectorAll(SELECTORS.threadRow)).find(item => String(item.getAttribute(ATTRIBUTES.threadId) || "").replace(/^(local|cloud):/i, "") === expected);
      if (row) {
        close();
        row.click();
        return { opened: true, via: "sidebar" };
      }
      window.postMessage({ type: NAVIGATION.messageType, path: NAVIGATION.threadRoutePrefix + encodeURIComponent(expected) }, window.location.origin);
      await new Promise(resolve => setTimeout(resolve, 400));
      const current = location.pathname.match(/\\/local\\/([^/?#]+)/)?.[1] || "";
      const activeRow = Array.from(document.querySelectorAll(SELECTORS.threadRow)).find(item => item.getAttribute(ATTRIBUTES.threadActive) === "true");
      const activeThread = String(activeRow?.getAttribute(ATTRIBUTES.threadId) || "").replace(/^(local|cloud):/i, "");
      if (decodeURIComponent(current) === expected || activeThread === expected) {
        close();
        return { opened: true, via: "route" };
      }
      throw new Error("thread_open_unconfirmed");
    }

    function onClick(event) {
      if (!active) return;
      const target = event.target?.closest?.("button,a,[role='button']," + SELECTORS.threadRow);
      if (!target || target === entry || target === agentsEntry || target.closest("#" + PANEL_ID) || target.closest("#better-codex-dialog") || target.closest("#better-codex-agent-dialog")) return;
      if (target.closest(SELECTORS.sidebarNavigation)) close();
    }

    function refresh() {
      ensureEntry();
      if (active) mountPanel();
    }

    function scheduleRefresh() {
      if (timer !== null || destroyed) return;
      timer = setTimeout(() => {
        timer = null;
        refresh();
      }, 160);
    }

    function destroy() {
      if (destroyed) return;
      destroyed = true;
      if (timer !== null) clearTimeout(timer);
      if (pollTimer !== null) clearInterval(pollTimer);
      closeFilterMenu();
      closeIssueMenu();
      observer?.disconnect();
      for (const pending of bridgeRequests.values()) {
        clearTimeout(pending.timer);
        pending.reject(new Error("injection_destroyed"));
      }
      bridgeRequests.clear();
      document.removeEventListener("DOMContentLoaded", mount);
      document.removeEventListener("click", onClick, true);
      close();
      document.querySelectorAll('[' + OWNED + '="true"]').forEach(node => node.remove());
      delete window.__betterCodexBridgeResolve;
      delete window.__betterCodexInjection__;
    }

    function mount() {
      document.removeEventListener("DOMContentLoaded", mount);
      if (destroyed || observer || !document.documentElement) return;
      observer = new MutationObserver(scheduleRefresh);
      observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ["class", "data-theme", "aria-current", ATTRIBUTES.threadActive] });
      ensureEntry();
    }

    window.__betterCodexInjection__ = { version: VERSION, endpoint: BASE_URL, refresh, open, close, destroy };
    document.addEventListener("click", onClick, true);
    if (document.documentElement) mount();
    else document.addEventListener("DOMContentLoaded", mount, { once: true });
    return { installed: true, reused: false };
  })()`;
}
