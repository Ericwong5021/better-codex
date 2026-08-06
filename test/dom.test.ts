import assert from "node:assert/strict";
import test from "node:test";
import { betterCodexDesignSystemCss } from "../src/design-system.js";
import { injectionScript } from "../src/dom.js";

test("generated injection script is valid JavaScript", () => {
  const source = injectionScript(4317, "test-token", "install");

  assert.doesNotThrow(() => new Function(source));
  assert.ok(source.includes("location.pathname.match(/\\/local\\/([^/?#]+)/)"));
});

test("injected panel opts out of the native Electron drag region", () => {
  const source = injectionScript(4317, "test-token", "install");

  assert.match(source, /#\$\{PANEL_ID\}[^}]*-webkit-app-region:\s*no-drag\s*!important/);
});

test("leaving the app surface suspends the panel and immediately restores its previous surface", () => {
  const source = injectionScript(4317, "test-token", "install");

  assert.ok(source.includes('createEntry("任务看板", ENTRY_ID, "打开任务看板", "issues")'));
  assert.ok(source.includes('syncEntryLabel(entry, "任务看板", "打开任务看板")'));
  assert.ok(source.includes('syncEntryIcon(entry, "issues")'));
  assert.ok(source.includes('"issues":{"name":"square-kanban"'));
  assert.ok(source.includes('"bot":{"name":"bot"'));
  assert.ok(source.includes("return entry.isConnected && agentsEntry.isConnected"));
  assert.ok(source.includes("const entriesAvailable = ensureEntry()"));
  assert.ok(source.includes("if (active) close({ resume: true })"));
  assert.ok(source.includes('if (!active && ["issues", "agents"].includes(resumeSurface)) return open(resumeSurface)'));
  assert.ok(source.includes("queueMicrotask(() =>"));
  assert.ok(source.includes("if (content && content.textContent !== text) content.textContent = text"));
  assert.ok(source.includes("if (svg.innerHTML !== definition.nodes) svg.innerHTML = definition.nodes"));
  assert.doesNotMatch(source, /function scheduleRefresh\(\)[\s\S]*?setTimeout\([\s\S]*?160/);
});

test("all interface icons use Lucide definitions", () => {
  const source = injectionScript(4317, "test-token", "install");

  for (const name of [
    "plus", "ellipsis", "list-filter", "sliders-horizontal", "columns-3", "arrow-left-right",
    "maximize-2", "minimize-2", "x", "paperclip", "folder", "tag", "calendar", "user", "user-round-pen",
    "bot", "image", "search", "search-code", "layout-template", "bug", "terminal", "wrench",
    "file-code-corner", "flask-conical", "book-open", "shield-check", "database", "sparkles", "pencil", "chevron-right",
    "chevron-down", "check", "circle", "minus", "trash-2", "refresh-cw", "square-kanban",
    "circle-dashed", "loader-circle", "circle-dot", "circle-check-big", "circle-slash-2",
    "circle-x", "signal-low", "signal-medium", "signal-high", "circle-alert",
  ]) assert.ok(source.includes('"name":"' + name + '"'), `missing Lucide icon: ${name}`);

  assert.ok(source.includes('const classes = "lucide lucide-" + definition.name'));
  assert.ok(source.includes('icon(names[status] || "statusTodo", "better-codex-status-icon", "2.35")'));
  assert.ok(source.includes('const markup = icon(names[priority] || "priorityNone", "better-codex-priority")'));
  assert.doesNotMatch(source, /Array\.from\(\{ length: 16 \}/);
});

test("status and priority menus keep their Lucide icons visible", () => {
  const source = injectionScript(4317, "test-token", "install");
  const css = betterCodexDesignSystemCss();

  assert.ok(source.includes('function filterOptionIcon(key, value)'));
  assert.ok(source.includes('filterOptionIcon(key, option.value)'));
  assert.ok(source.includes('if (key === "status") return statusIcon(value)'));
  assert.ok(source.includes('if (key === "priority") return priorityIcon(value)'));
  assert.ok(source.includes('icon(names[status] || "statusTodo", "better-codex-status-icon", "2.35")'));
  assert.ok(source.includes("escapeHtml(status)") && source.includes("data-status="));
  assert.match(source, /#better-codex-filter > svg \{ color: var\(--bc-info\); \}/);
  assert.match(css, /#better-codex-panel #better-codex-filter > svg\s*\{[^}]*color:\s*var\(--bc-info\);/s);
  assert.match(css, /\.better-codex-status-icon\[data-status="in_progress"\]/);
  assert.match(css, /\.better-codex-dialog-select-trigger-visual,[\s\S]*?\.better-codex-dialog-select-option-visual\s*\{[^}]*width:\s*var\(--bc-icon-sm\);[^}]*height:\s*var\(--bc-icon-sm\);/s);
  assert.match(css, /\.better-codex-dialog-select-trigger-visual > svg,[\s\S]*?\.better-codex-dialog-select-option-visual > svg\s*\{[^}]*width:\s*var\(--bc-icon-sm\);[^}]*height:\s*var\(--bc-icon-sm\);/s);
});

test("square icon controls center their SVG geometry instead of using the text baseline", () => {
  const css = betterCodexDesignSystemCss();
  const iconControlRule = css.match(/#better-codex-panel \.better-codex-column-icon,\s*#better-codex-panel \.better-codex-agent-card-action,\s*#better-codex-dialog \.better-codex-icon-button,\s*#better-codex-update-notice \.better-codex-update-close \{([^}]*)\}/)?.[1] || "";

  assert.match(iconControlRule, /display:\s*inline-flex/);
  assert.match(iconControlRule, /align-items:\s*center/);
  assert.match(iconControlRule, /justify-content:\s*center/);
  assert.match(iconControlRule, /padding:\s*0/);
  assert.match(iconControlRule, /line-height:\s*0/);
  assert.match(css, /\.better-codex-column-icon > svg,[\s\S]*?\.better-codex-status-icon \{[^}]*display:\s*block;/);
});

test("task columns only render controls backed by working actions", () => {
  const source = injectionScript(4317, "test-token", "install");

  assert.doesNotMatch(source, /aria-label="更多"/);
  assert.doesNotMatch(source, /新建项目|openNativeProjectEditor|data-app-action-sidebar-project-create/);
  assert.match(source, /data-add-status=/);
  assert.match(source, /aria-label="新建任务"/);
});

test("issue assignment tabs separate assigned and unassigned work", () => {
  const source = injectionScript(4317, "test-token", "install");

  assert.ok(source.includes('[["all", "全部"], ["assigned", "已分配"], ["unassigned", "未分配"]]'));
  assert.ok(source.includes("const assigned = Boolean(issue.agent_enabled || issue.thread_id)"));
  assert.ok(source.includes('state.view === "unassigned" && !assigned'));
  assert.ok(!source.includes('[["all", "全部"], ["member", "成员"], ["agent", "智能体"]]'));
});

test("issue creation uses a primary split button with an agent creation menu", () => {
  const source = injectionScript(4317, "test-token", "install");
  const css = betterCodexDesignSystemCss();

  assert.ok(source.includes('className = "better-codex-create-split"'));
  assert.ok(source.includes('setAttribute("aria-label", "选择 issue 创建方式")'));
  assert.ok(source.includes("通过智能体创建"));
  assert.ok(source.includes('state.createMode = "agent"'));
  assert.match(css, /\.better-codex-create-split\s*\{[^}]*background:\s*var\(--bc-color-primary\);/s);
  assert.match(css, /\.better-codex-create-menu\s*\{[^}]*box-shadow:\s*var\(--bc-elevation-menu\);/s);
});

test("column action controls share the column corner inset", () => {
  const css = betterCodexDesignSystemCss();

  assert.match(css, /\.better-codex-column-head\s*\{[^}]*padding:\s*0 0 var\(--bc-space-2\) var\(--bc-space-2\);/s);
});

test("default Codex agent opens a branded config editor", () => {
  const source = injectionScript(4317, "test-token", "install");

  assert.ok(source.includes('aria-label="Codex"'));
  assert.ok(source.includes("const isDefault = Boolean(draft.is_default);"));
  assert.ok(source.includes('"/api/agents/default"'));
  assert.ok(source.includes("影响之后新建的 Codex 窗口"));
  assert.ok(source.includes("if (!agent || agent.is_default) return;"));
});

test("agent model picker uses the runtime catalog and a Codex-style popover", () => {
  const source = injectionScript(4317, "test-token", "install");

  assert.ok(source.includes("bootstrap.agentModelCatalog"));
  assert.ok(source.includes('data-agent-picker="'));
  assert.ok(source.includes('role="listbox"'));
  assert.ok(source.includes('role="option"'));
  assert.doesNotMatch(source, /<select name="model"/);
  assert.doesNotMatch(source, /<select name="reasoning_effort"/);
});

test("opening an agent inspector hides the toolbar create action", () => {
  const source = injectionScript(4317, "test-token", "install");

  assert.ok(source.includes('addAgent.hidden = state.agentPane !== "preview"'));
  assert.match(betterCodexDesignSystemCss(), /\.better-codex-agent-actions\[hidden\]\s*\{[^}]*display:\s*none\s*!important/s);
});

test("clicking the agent directory outside the inspector closes the side pane", () => {
  const source = injectionScript(4317, "test-token", "install");

  assert.ok(source.includes('event.target.closest(".better-codex-agent-directory [data-agent-key]")'));
  assert.ok(source.includes('state.agentPane !== "preview" && event.target.closest(".better-codex-agent-directory")'));
  assert.ok(source.includes('if (event.target.closest("[data-agent-close-pane]")'));
});

test("agent suggestion icons use thicker strokes and semantic tones", () => {
  const source = injectionScript(4317, "test-token", "install");
  const css = betterCodexDesignSystemCss();

  assert.ok(source.includes('"tone":"info"'));
  assert.ok(source.includes('"tone":"success"'));
  assert.ok(source.includes('"tone":"warning"'));
  assert.ok(source.includes('"key":"debugger"'));
  assert.ok(source.includes('"name":"问题排查"'));
  assert.ok(source.includes('icon(item.icon, "", "2.4")'));
  assert.ok(source.includes("data-tone=") && source.includes("escapeHtml(item.tone)"));
  assert.match(css, /\.better-codex-agent-suggestion-icon\[data-tone="info"\]\s*\{[^}]*color:\s*var\(--bc-info\)/s);
  assert.match(css, /\.better-codex-agent-suggestion-icon\[data-tone="success"\]\s*\{[^}]*color:\s*var\(--bc-success\)/s);
  assert.match(css, /\.better-codex-agent-suggestion-icon\[data-tone="warning"\]\s*\{[^}]*color:\s*var\(--bc-warning\)/s);
});

test("agent toolbar and inspector occupy separate Codex-style grid regions", () => {
  const css = betterCodexDesignSystemCss();
  const source = injectionScript(4317, "test-token", "install");

  assert.ok(source.includes("panel.dataset.agentPane = state.agentPane"));
  assert.match(css, /\[data-surface="agents"\]\s*\{[^}]*display:\s*grid;[^}]*grid-template-columns:\s*minmax\(0, 1fr\) auto;/s);
  assert.match(css, /\[data-surface="agents"\] \.better-codex-toolbar\s*\{[^}]*grid-column:\s*1;[^}]*grid-row:\s*1;/s);
  assert.match(css, /\[data-surface="agents"\] \.better-codex-agent-inspector\s*\{[^}]*grid-column:\s*2;[^}]*grid-row:\s*1 \/ 3;/s);
});

test("background agent polling preserves active inspector forms", () => {
  const source = injectionScript(4317, "test-token", "install");

  assert.ok(source.includes('loadSurface({ background: true })'));
  assert.ok(source.includes('options.background && (state.agentPane !== "preview" || !changed)'));
});

test("initial agent loading preserves an inspector opened while the request is pending", () => {
  const source = injectionScript(4317, "test-token", "install");

  assert.ok(source.includes('loadSurface({ preserveInspector: true })'));
  assert.ok(source.includes('options.preserveInspector && panel?.dataset.surface === "agents" && state.agentPane !== "preview"'));
});

test("issue editor uses branded listboxes instead of native selects", () => {
  const source = injectionScript(4317, "test-token", "install");
  const css = betterCodexDesignSystemCss();

  assert.doesNotMatch(source, /<select\b/);
  assert.ok(source.includes('data-dialog-select-toggle="'));
  assert.ok(source.includes('data-dialog-select-option="'));
  assert.match(css, /\.better-codex-dialog-select-menu\s*\{[^}]*position:\s*absolute;/s);
  assert.match(css, /\.better-codex-dialog-select-option\s*\{[^}]*border:\s*0;/s);
});

test("agent issue creation refreshes profiles and reuses their names and avatars", () => {
  const source = injectionScript(4317, "test-token", "install");

  assert.ok(source.includes('state.agents = await api("/api/agents")'));
  assert.ok(source.includes('agentAvatarMarkup(agent, "better-codex-agent-avatar")'));
  assert.ok(source.includes('agentAvatarMarkup(selectedAgent, "better-codex-agent-avatar")'));
  assert.ok(source.includes("syncAgentAvatar(runAvatar, selectedAgent)"));
});

test("agent detail avatars use preset icons and open an avatar picker", () => {
  const source = injectionScript(4317, "test-token", "install");

  assert.ok(source.includes('branded ? codexLogo() : icon("bot")'));
  assert.ok(source.includes('data-agent-avatar-form'));
  assert.ok(source.includes("chooseAgentAvatar("));
  assert.ok(source.includes('id = "better-codex-avatar-picker"'));
  assert.ok(source.includes("position: fixed") || source.includes('style.top = top + "px"'));
  assert.ok(source.includes(".better-codex-agent-avatar-field, .better-codex-agent-profile-head"));
  assert.ok(source.includes("AGENT_AVATAR_PRESETS"));
  assert.ok(source.includes('"id":"reviewer"'));
  assert.ok(source.includes('better-codex-agent-profile-head'));
  assert.ok(source.includes('const heading = creating ? "新建" : "智能体"'));
  assert.ok(source.includes('<h2>创建智能体</h2><div class="better-codex-agent-avatar-field">'));
  assert.ok(source.includes("点击选择预设图标，或上传图片"));
  assert.ok(source.includes('avatar: draft.avatar || ("icon:" + draft.key)'));
  assert.ok(source.includes("state.agentDraft?.key === item.key"));
  assert.ok(!source.includes('class="better-codex-agent-profile-name" name="name"'));
  assert.ok(!source.includes('data-agent-avatar-edit'));
  assert.ok(source.includes('id = "better-codex-avatar-cropper"'));
  assert.ok(source.includes('canvas.addEventListener("pointermove"'));
  assert.ok(source.includes('output.width = 256'));
  assert.ok(source.includes('output.toDataURL("image/webp", .86)'));
});

test("every rendered Codex logo receives an independent SVG gradient id", () => {
  const source = injectionScript(4317, "test-token", "install");

  assert.ok(source.includes('const gradientId = "better-codex-logo-gradient-" + (++codexLogoSequence)'));
  assert.ok(source.includes("fill=\"url(#' + gradientId + ')\""));
  assert.ok(source.includes('visual: () => agentAvatarMarkup(agent, "better-codex-agent-avatar")'));
  assert.ok(source.includes('typeof option.visual === "function" ? option.visual()'));
  assert.doesNotMatch(source, /id="better-codex-logo-gradient"/);
});

test("issue agent avatars use the same fallback material as the agent directory", () => {
  const source = injectionScript(4317, "test-token", "install");
  const fallbackRule = source.match(/#better-codex-dialog \.better-codex-agent-avatar\.is-fallback\s*\{([^}]*)\}/)?.[1] || "";

  assert.match(fallbackRule, /color:\s*var\(--bc-color-text-muted\)/);
  assert.match(fallbackRule, /background:\s*var\(--bc-color-control\)/);
  assert.match(fallbackRule, /border-radius:\s*var\(--bc-radius-xs\)/);
  assert.match(source, /#better-codex-dialog \.better-codex-agent-avatar\.is-fallback svg\s*\{[^}]*width:\s*12px;[^}]*height:\s*12px;/s);
});

test("agent issue creation reserves enough height for its scaled footer", () => {
  const source = injectionScript(4317, "test-token", "install");
  const css = betterCodexDesignSystemCss();

  assert.ok(css.includes("--bc-dialog-agent-height: 400px"));
  assert.ok(source.includes("height: min(var(--bc-dialog-agent-height, 400px), calc(100vh - 48px))"));
  assert.doesNotMatch(source, /#better-codex-dialog\[data-mode="agent"\]\s*\{[^}]*height:\s*min\(368px/s);
});

test("issue submit buttons omit visual keyboard shortcut badges", () => {
  const source = injectionScript(4317, "test-token", "install");

  assert.doesNotMatch(source, /better-codex-keycap/);
  assert.doesNotMatch(source, />⌘<|>↵</);
  assert.ok(source.includes('event.key === "Enter"'));
});

test("issue cards open details first and keep session entry points explicit", () => {
  const source = injectionScript(4317, "test-token", "install");
  const css = betterCodexDesignSystemCss();

  assert.ok(source.includes('class="better-codex-link" type="button" data-thread="'));
  assert.ok(source.includes("打开 Session"));
  assert.ok(source.includes("在对话中打开"));
  assert.ok(source.includes("data-dialog-open-thread"));
  assert.ok(source.includes("Issue 详情"));
  assert.ok(source.includes("if (issue) return void perform(() => openEditor(issue))"));
  assert.ok(!source.includes("(sessionId ? ' data-thread=\""));
  assert.doesNotMatch(source, /任务尚未关联 Session/);
  assert.match(css, /\.better-codex-dialog-open-thread\s*\{[^}]*background:\s*var\(--bc-color-primary\)/s);
});

test("issue keep-open toggle keeps a visible track in light mode", () => {
  const css = betterCodexDesignSystemCss();
  const toggleRule = css.match(/#better-codex-dialog \.better-codex-toggle\s*\{([^}]*)\}/)?.[1] || "";

  assert.match(toggleRule, /background:\s*var\(--bc-color-control\)/);
  assert.match(toggleRule, /box-shadow:\s*var\(--bc-inset-hairline\)/);
});

test("destructive actions use the branded confirmation dialog", () => {
  const source = injectionScript(4317, "test-token", "install");

  assert.ok(source.includes('dialog.id = "better-codex-confirm"'));
  assert.ok(source.includes('confirmAction("删除任务"'));
  assert.ok(source.includes('confirmAction("删除智能体"'));
  assert.doesNotMatch(source, /\b(?:window\.)?confirm\s*\(/);
});

test("every modal dialog closes only when its backdrop is clicked", () => {
  const source = injectionScript(4317, "test-token", "install");
  const bindings = source.match(/bindModalDismiss\(dialog, \(\) =>/g) || [];

  assert.ok(source.includes("function bindModalDismiss(dialog, dismiss)"));
  assert.ok(source.includes("event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom"));
  assert.equal(bindings.length, 3);
});

test("Codex-native visual values live behind semantic design tokens", () => {
  const css = betterCodexDesignSystemCss();
  const source = injectionScript(4317, "test-token", "install");

  assert.ok(css.includes("--bc-color-canvas:"));
  assert.ok(css.includes("--bc-radius-xl:"));
  assert.ok(css.includes("--bc-motion-fast:"));
  assert.match(css, /\.better-codex-card\s*\{[^}]*border:\s*1px solid var\(--bc-color-hairline\);[^}]*background:\s*transparent;[^}]*box-shadow:\s*var\(--bc-card-shadow\);/s);
  assert.match(css, /\.better-codex-search\s*\{[^}]*border:\s*0;/s);
  assert.ok(source.includes("--bc-color-surface-raised:"));
});

test("semantic surface hierarchy is derived from the Codex appearance configuration", () => {
  const css = betterCodexDesignSystemCss();
  const source = injectionScript(4317, "test-token", "install");

  assert.ok(css.includes("--bc-color-canvas: var(--bc-host-light-canvas"));
  assert.ok(css.includes("--bc-color-canvas: var(--bc-host-dark-canvas"));
  assert.ok(css.includes("--bc-color-input: var(--bc-color-canvas)"));
  assert.match(css, /html\.electron-dark[\s\S]*?--bc-color-input:\s*var\(--bc-color-control\)/);
  assert.ok(css.includes("--bc-color-hairline: var(--bc-host-light-hairline"));
  assert.ok(source.includes("applyAppearance(bootstrap.appearance)"));
  assert.ok(source.includes('setProperty("--bc-host-" + mode + "-canvas"'));
  assert.ok(source.includes('setProperty("--bc-host-" + mode + "-control"'));
  assert.ok(source.includes('setProperty("--bc-host-" + mode + "-hairline"'));
  assert.match(css, /\.better-codex-agent-inspector-field textarea\s*\{[^}]*box-shadow:\s*var\(--bc-inset-hairline\);/s);
  assert.match(css, /\.better-codex-agent-inspector-group\s*\{[^}]*box-shadow:\s*var\(--bc-inset-hairline\);/s);
  assert.match(css, /\.better-codex-agent-profile-name\s*\{[^}]*box-shadow:\s*var\(--bc-inset-hairline\);/s);
  assert.match(css, /\.better-codex-search\s*\{[^}]*background:\s*var\(--bc-color-input\);/s);
  assert.match(css, /\.better-codex-agent-profile-name\s*\{[^}]*background:\s*var\(--bc-color-control\);/s);
  assert.match(css, /\.better-codex-agent-inspector-group\s*\{[^}]*background:\s*var\(--bc-color-input\);/s);
  assert.match(css, /\.better-codex-agent-inspector-field textarea\s*\{[^}]*background:\s*var\(--bc-color-input\);/s);
});
