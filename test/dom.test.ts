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
  assert.ok(source.includes('<rect x="3" y="4" width="6" height="16" rx="1.5"></rect><rect x="11" y="4" width="6" height="11" rx="1.5"></rect><circle cx="17.5" cy="17.5" r="3.5"></circle><path d="m15.8 17.5 1.1 1.1 2.2-2.3"></path>'));
  assert.ok(source.includes("return entry.isConnected && agentsEntry.isConnected"));
  assert.ok(source.includes("const entriesAvailable = ensureEntry()"));
  assert.ok(source.includes("if (active) close({ resume: true })"));
  assert.ok(source.includes('if (!active && ["issues", "agents"].includes(resumeSurface)) return open(resumeSurface)'));
  assert.ok(source.includes("queueMicrotask(() =>"));
  assert.ok(source.includes("if (content && content.textContent !== text) content.textContent = text"));
  assert.ok(source.includes("if (icon.innerHTML !== markup) icon.innerHTML = markup"));
  assert.doesNotMatch(source, /function scheduleRefresh\(\)[\s\S]*?setTimeout\([\s\S]*?160/);
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

test("agent detail avatars use a robot fallback and open a drag-to-crop editor", () => {
  const source = injectionScript(4317, "test-token", "install");

  assert.ok(source.includes('branded ? codexLogo() : icon("bot")'));
  assert.ok(source.includes('data-agent-avatar-form'));
  assert.ok(source.includes('better-codex-agent-profile-head'));
  assert.ok(source.includes('const heading = creating ? "创建智能体" : "智能体"'));
  assert.ok(source.includes('class="better-codex-agent-profile-name" name="name"'));
  assert.match(source, /\.better-codex-agent-profile-head\s*\{[^}]*grid-template-columns:\s*54px minmax\(0, 1fr\)/s);
  assert.match(source, /\.better-codex-agent-profile-head \.better-codex-agent-avatar-editor\s*\{[^}]*z-index:\s*1/s);
  assert.ok(!source.includes('data-agent-avatar-edit'));
  assert.ok(!source.includes("悬停头像即可选择并裁剪图片"));
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
  assert.match(css, /\.better-codex-card\s*\{[^}]*border:\s*0;/s);
  assert.match(css, /\.better-codex-search\s*\{[^}]*border:\s*0;/s);
  assert.ok(source.includes("--bc-color-surface-raised:"));
});

test("semantic surface hierarchy is derived from the Codex appearance configuration", () => {
  const css = betterCodexDesignSystemCss();
  const source = injectionScript(4317, "test-token", "install");

  assert.ok(css.includes("--bc-color-canvas: var(--bc-host-light-canvas"));
  assert.ok(css.includes("--bc-color-canvas: var(--bc-host-dark-canvas"));
  assert.ok(css.includes("--bc-color-hairline: var(--bc-host-light-hairline"));
  assert.ok(source.includes("applyAppearance(bootstrap.appearance)"));
  assert.ok(source.includes('setProperty("--bc-host-" + mode + "-canvas"'));
  assert.ok(source.includes('setProperty("--bc-host-" + mode + "-control"'));
  assert.ok(source.includes('setProperty("--bc-host-" + mode + "-hairline"'));
  assert.match(css, /\.better-codex-agent-inspector-field textarea\s*\{[^}]*box-shadow:\s*var\(--bc-inset-hairline\);/s);
  assert.match(css, /\.better-codex-agent-inspector-group\s*\{[^}]*box-shadow:\s*var\(--bc-inset-hairline\);/s);
  assert.match(css, /\.better-codex-agent-profile-name\s*\{[^}]*box-shadow:\s*var\(--bc-inset-hairline\);/s);
});
