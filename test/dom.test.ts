import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { betterCodexDesignSystemCss } from "../src/design-system.js";
import { injectionScript } from "../src/dom.js";

const injectedEntrySource = readFileSync(new URL("../src/ui/injected-entry.ts", import.meta.url), "utf8");
const sharedDialogSource = readFileSync(new URL("../src/ui/components/dialog.ts", import.meta.url), "utf8");

function injectionSource(...parameters: Parameters<typeof injectionScript>) {
  return `${injectionScript(...parameters)}\n${injectedEntrySource}`;
}

test("generated injection script is valid JavaScript", () => {
  const executable = injectionScript(4317, "test-token", "install");
  const source = `${executable}\n${injectedEntrySource}`;

  assert.doesNotThrow(() => new Function(executable));
  assert.ok(source.includes("location.pathname.match(/\\/local\\/([^/?#]+)/)"));
  assert.ok(source.includes("if (options.background && !changed) return"));
  assert.ok(source.includes("state.languageSetting = setting"));
  assert.ok(source.includes('state.locale = setting === "system" ? state.systemLocale : setting'));
  assert.ok(source.includes("panel?.remove()"));
  assert.ok(source.includes("showAutoDispatchHelp(\"settings\")"));
  assert.ok(source.includes('HOST_KIND === "web" ? INITIAL_LOCALE : bootstrap.locale'));
  assert.ok(source.includes('const REMOTE = HOST_ADAPTER.remote'));
  assert.ok(source.includes('return (RELAY ? "/api/runtime-update" : "/api/update") + suffix'));
  const remoteUpdateStart = injectedEntrySource.indexOf('remoteUpgrade?.addEventListener("click"');
  const runtimeUpdateStart = injectedEntrySource.indexOf('checkUpdate.addEventListener("click"');
  const remoteUpdateHandler = injectedEntrySource.slice(remoteUpdateStart, injectedEntrySource.indexOf('remoteRefresh?.addEventListener("click"', remoteUpdateStart));
  const runtimeUpdateHandler = injectedEntrySource.slice(runtimeUpdateStart, injectedEntrySource.indexOf('dialog.addEventListener("cancel"', runtimeUpdateStart));
  assert.ok(remoteUpdateHandler.includes('api("/api/update/check", { method: "POST" })'));
  assert.ok(remoteUpdateHandler.includes('api("/api/update/install", { method: "POST"'));
  assert.doesNotMatch(remoteUpdateHandler, /runtimeUpdatePath/);
  assert.ok(runtimeUpdateHandler.includes('api(runtimeUpdatePath("/check"), { method: "POST" })'));
  assert.ok(source.includes('const CODEX_SEMANTICS_AVAILABLE = HOST_CAPABILITIES.codexSemantics !== false'));
  assert.ok(source.includes('if (!CODEX_SEMANTICS_AVAILABLE) return semanticCatalog'));
  assert.doesNotMatch(source, /if \(REMOTE\) return semanticCatalog/);
  assert.ok(source.includes('value.replace(/\\s+/g, "")'));
  assert.ok(source.includes('mockupText(issue.description).replace(/[#*_\`~>\[\]()]/g, "").replace(/\\s+/g, " ").trim()'));
  assert.doesNotMatch(source, /\.replace\(\/s\+\/g,/);
  assert.ok(source.includes("window.betterCodexHost?.reloadAfterUpdate"));
  assert.doesNotMatch(source, /localizeOwnedTree|localizedText|translateText/);
});

test("web sidebar entries never become their own native clone reference", () => {
  const source = injectionSource(4317, "test-token", "install", "zh-CN", "web");

  assert.ok(source.includes("filter(button => !button.hasAttribute(OWNED))"));
  assert.ok(source.includes('const NAVIGATION = HOST_KIND === "web"'));
  assert.ok(source.includes('threadRoutePrefix: "/local/"'));
  assert.ok(source.includes("!document.hidden && active"));
  assert.ok(source.includes("window.betterCodexHost?.request"));
  assert.ok(source.includes("startLiveUpdates()"));
});

test("in-review status uses the waiting-for-review label", () => {
  const source = injectionSource(4317, "test-token", "install");

  assert.ok(source.includes('in_review: "待审核"'));
  assert.ok(source.includes('activityState === "in_review" ? "待审核"'));
  assert.doesNotMatch(source, /审核中/);
});

test("board bridge retries timed out GET requests without repeating writes", () => {
  const source = injectionSource(4317, "test-token", "install");
  assert.match(source, /runtime_bridge_timeout/);
  assert.match(source, /const method = String\(options\.method \|\| "GET"\)\.toUpperCase\(\)/);
  assert.match(source, /return attempt\(method === "GET" \? 1 : 0\)/);
  assert.match(source, /\["runtime_bridge_timeout", "runtime_response_invalid"\]\.includes\(error\.message\)/);
  assert.ok(source.includes('requestList(issuePath, "issues", { passive: Boolean(options.background) })'));
  assert.ok(source.includes('requestList("/api/agents", "agents")'));
  assert.match(source, /timeoutMs: files\.length \? 120_000 : undefined/);
  assert.match(source, /const transferTimeoutMs = files\.length \? 120_000 : undefined/);
  assert.match(source, /"relay_stream"/);
  assert.match(source, /result\?\.accepted !== true/);
  assert.match(source, /await waitForUpdateCompletion\(notice, result\.update_id\)/);
  assert.ok(source.includes('message.startsWith("runtime_fetch_failed:")'));
  assert.ok(source.includes("if (transientNetworkError(reason)) continue"));
  assert.ok(source.includes("function reportGlobalError(error, context = {}) {\n      if (destroyed) return null;"));
  assert.ok(source.includes("function showError(error) {\n      if (destroyed) return;"));
});

test("injected panel opts out of the native Electron drag region", () => {
  const source = injectionSource(4317, "test-token", "install");
  const css = betterCodexDesignSystemCss();

  assert.match(css, /#better-codex-panel\s*\{[^}]*-webkit-app-region:\s*no-drag\s*!important/s);
  assert.match(css, /\.better-codex-toolbar\s*\{[^}]*-webkit-app-region:\s*drag;/s);
  assert.match(css, /\.better-codex-agent-inspector-head\s*\{[^}]*-webkit-app-region:\s*drag;/s);
  assert.match(css, /\.better-codex-toolbar :is\(button, input, a, select, textarea, label\)[^}]*-webkit-app-region:\s*no-drag;/s);
});

test("leaving the app surface suspends the panel and restores its previous surface", () => {
  const source = injectionSource(4317, "test-token", "install");

  assert.ok(source.includes('createEntry("任务看板", ENTRY_ID, "打开任务看板", "issues")'));
  assert.ok(source.includes('syncEntryLabel(entry, "任务看板", "打开任务看板")'));
  assert.ok(source.includes('syncEntryIcon(entry, "issues")'));
  assert.ok(source.includes('"issues":{"name":"square-kanban"'));
  assert.ok(source.includes('"bot":{"name":"bot"'));
  assert.ok(source.includes("return entry.isConnected && (!scheduledEntry || scheduledEntry.isConnected) && (!scheduledMobileEntry || scheduledMobileEntry.isConnected) && agentsEntry.isConnected && projectsEntry.isConnected"));
  assert.ok(source.includes("const entriesAvailable = ensureEntry()"));
  assert.ok(source.includes("if (active && !betterCodexRoute) close({ resume: true, suppressRoute: false })"));
  assert.ok(source.includes("routeSeen = false"));
  assert.ok(source.includes("window.postMessage({ type: NAVIGATION.messageType, path: BETTER_CODEX_ROUTE }, window.location.origin)"));
  assert.ok(source.includes("function scheduleRefresh()"));
  assert.ok(source.includes("refreshTimer = setTimeout(() =>"));
  assert.ok(source.includes("}, 50);"));
  assert.ok(source.includes("if (content && content.textContent !== text) content.textContent = text"));
  assert.ok(source.includes("if (svg.innerHTML !== definition.nodes) svg.innerHTML = definition.nodes"));
  const scheduledRefresh = injectedEntrySource.slice(injectedEntrySource.indexOf("function scheduleRefresh()"), injectedEntrySource.indexOf("window.__betterCodexInjection__"));
  assert.doesNotMatch(scheduledRefresh, /setTimeout\([\s\S]*?160/);
});

test("returning from a native settings route resumes the remembered Better Codex surface", () => {
  const source = injectionSource(4317, "test-token", "install");
  const refresh = source.slice(source.indexOf("function refresh()"), source.indexOf("function scheduleRefresh()"));

  assert.ok(refresh.includes("const resumeSurface = sessionStorage.getItem(RESUME_SURFACE_KEY)"));
  assert.ok(refresh.includes("if (!active && betterCodexRoute && !routeSuppressed && availableSurfaces.includes(resumeSurface)) return open(resumeSurface)"));
});

test("collapsing the native sidebar keeps Better Codex mounted on its MCP route", () => {
  const source = injectionSource(4317, "test-token", "install");
  const refresh = source.slice(source.indexOf("function refresh()"), source.indexOf("function scheduleRefresh()"));

  assert.ok(refresh.includes("if (active && !betterCodexRoute) close({ resume: true, suppressRoute: false })"));
  assert.doesNotMatch(refresh, /if \(active\) close\(\{ resume: true, suppressRoute: betterCodexRoute \}\)/);
});

test("sidebar utility controls keep the Better Codex surface mounted", () => {
  const source = injectionSource(4317, "test-token", "install");
  const onClick = source.slice(source.indexOf("function isSidebarNavigationTarget(target)"), source.indexOf("function refresh()"));

  assert.ok(source.includes('const SIDEBAR_NAVIGATION_ITEM = SELECTORS.sidebarNavigationItem || ".sidebar-item"'));
  assert.ok(onClick.includes("target.closest(SELECTORS.projectRow)"));
  assert.ok(onClick.includes("target !== navigationItem"));
  assert.ok(onClick.includes('target.getAttribute("aria-label")'));
  assert.ok(onClick.includes("if (isSidebarNavigationTarget(target)) close({ resume: true })"));
  assert.ok(onClick.includes("else if (target.closest(SELECTORS.sidebarNavigation)) scheduleRefresh()"));
});

test("all interface icons use Lucide definitions", () => {
  const source = injectionSource(4317, "test-token", "install");

  for (const name of [
    "plus", "ellipsis", "list-filter", "sliders-horizontal", "columns-3", "arrow-left-right",
    "maximize-2", "minimize-2", "x", "paperclip", "folder", "tag", "calendar", "user", "user-round-pen",
    "bot", "image", "search", "search-code", "layout-template", "bug", "terminal", "wrench",
    "file-code-corner", "flask-conical", "book-open", "shield-check", "database", "sparkles", "pencil", "chevron-right",
    "chevron-down", "check", "circle", "minus", "trash-2", "refresh-cw", "square-kanban",
    "circle-dashed", "loader-circle", "circle-dot", "circle-check-big", "circle-slash-2",
    "signal-low", "signal-medium", "signal-high", "priority-urgent",
  ]) assert.ok(source.includes('"name":"' + name + '"'), `missing Lucide icon: ${name}`);

  assert.ok(source.includes('const classes = "lucide lucide-" + definition.name'));
  assert.ok(source.includes('icon(names[status] || "statusTodo", "better-codex-status-icon", "2.35")'));
  assert.ok(source.includes('const markup = icon(names[priority] || "priorityNone", "better-codex-priority", "2.35")'));
  assert.doesNotMatch(source, /Array\.from\(\{ length: 16 \}/);
});

test("status and priority menus keep their Lucide icons visible", () => {
  const source = injectionSource(4317, "test-token", "install");
  const css = betterCodexDesignSystemCss();

  assert.ok(source.includes('function filterOptionIcon(key, value)'));
  assert.ok(source.includes('filterOptionIcon(key, option.value)'));
  assert.ok(source.includes('if (key === "status") return statusIcon(value)'));
  assert.ok(source.includes('if (key === "priority") return priorityIcon(value)'));
  assert.ok(source.includes('icon(names[status] || "statusTodo", "better-codex-status-icon", "2.35")'));
  assert.ok(source.includes('icon(names[priority] || "priorityNone", "better-codex-priority", "2.35")'));
  assert.ok(source.includes("escapeHtml(status)") && source.includes("data-status="));
  assert.match(css, /#better-codex-panel #better-codex-filter > svg\s*\{[^}]*color:\s*var\(--bc-color-info\);/s);
  assert.match(css, /\.better-codex-status-icon\[data-status="in_progress"\]/);
  assert.match(css, /\.better-codex-priority\[data-priority="urgent"\]/);
  assert.match(css, /\.better-codex-priority\[data-priority="high"\][^{]*\{[^}]*--bc-priority-high/);
  assert.match(css, /\.better-codex-priority\[data-priority="medium"\][^{]*\{[^}]*--bc-priority-medium/);
  assert.match(css, /\.better-codex-priority\[data-priority="low"\][^{]*\{[^}]*--bc-priority-low/);
  assert.match(css, /\.better-codex-dialog-select-trigger-visual,[\s\S]*?\.better-codex-dialog-select-option-visual\s*\{[^}]*width:\s*var\(--bc-icon-sm\);[^}]*height:\s*var\(--bc-icon-sm\);/s);
  assert.match(css, /\.better-codex-dialog-select-trigger-visual > svg,[\s\S]*?\.better-codex-dialog-select-option-visual > svg\s*\{[^}]*width:\s*var\(--bc-icon-sm\);[^}]*height:\s*var\(--bc-icon-sm\);/s);
  assert.match(css, /\.better-codex-dialog-select-trigger-visual > \.better-codex-agent-avatar,[\s\S]*?\.better-codex-dialog-select-option-visual > \.better-codex-agent-avatar\s*\{[^}]*width:\s*var\(--bc-icon-sm\);[^}]*height:\s*var\(--bc-icon-sm\);[^}]*flex:\s*0 0 var\(--bc-icon-sm\);/s);
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

test("task columns render working actions and the project creation shortcut", () => {
  const source = injectionSource(4317, "test-token", "install");

  assert.doesNotMatch(source, /aria-label="更多"/);
  assert.doesNotMatch(source, /openNativeProjectEditor|data-app-action-sidebar-project-create/);
  assert.ok(source.includes('t("创建新项目")'));
  assert.match(source, /data-add-status=/);
  assert.ok(source.includes('te("新建任务")'));
});

test("issue assignment tabs separate assigned and unassigned work", () => {
  const source = injectionSource(4317, "test-token", "install");

  assert.ok(source.includes('[["all", "全部"], ["assigned", "已分配"], ["unassigned", "未分配"]]'));
  assert.ok(source.includes("const assigned = Boolean(issue.agent_enabled || issue.user_assigned)"));
  assert.ok(source.includes('state.view === "unassigned" && !assigned'));
  assert.ok(!source.includes('[["all", "全部"], ["member", "成员"], ["agent", "智能体"]]'));
});

test("issues toolbar has a toggleable auto-dispatch icon between filter and create", () => {
  const source = injectionSource(4317, "test-token", "install");
  const css = betterCodexDesignSystemCss();

  assert.ok(source.includes('id = "better-codex-auto-dispatch"'));
  assert.ok(source.includes("actions.append(working, searchWrap, filterWrap, autoDispatchWrap, createSplit)"));
  assert.ok(source.includes('api("/api/settings/auto-dispatch"'));
  assert.ok(source.includes("state.autoDispatch = Boolean(bootstrap.autoDispatch)"));
  assert.ok(source.includes("syncAutoDispatch()"));
  assert.ok(source.includes('showAutoDispatchHelp()'));
  assert.ok(source.includes('"手动运行"'));
  assert.ok(source.includes('"自动运行"'));
  assert.ok(source.includes('id = "better-codex-auto-dispatch-help-dialog"'));
  assert.ok(source.includes("better-codex-auto-dispatch-help-divider"));
  assert.ok(source.includes("只有点击“立即开始任务”才会触发智能体任务"));
  assert.ok(source.includes("只要 Issue 不在「待规划」区，你发送的新消息都会触发任务"));
  assert.ok(source.includes("manual_start_required"));
  assert.ok(source.includes("backlog_reply_blocked"));
  assert.ok(!source.includes("「待处理」标志"));
  assert.ok(!source.includes('better-codex-attention'));
  assert.ok(source.includes('icon(state.autoDispatch || state.autoDispatchPending ? "refresh" : "user")'));
  assert.ok(source.includes('button.disabled = state.autoDispatchPending'));
  assert.ok(source.includes('icon("user") + "<span>" + escapeHtml(t("手动运行")) + "</span>"'));
  assert.ok(source.includes('icon("user") + "<h3>" + te("手动运行") + "</h3></div>"'));
  assert.ok(source.includes('icon("refresh") + "<h3>" + te("自动运行") + "</h3></div>"'));
  assert.ok(!source.includes('button.title = state.autoDispatch'));
  assert.match(css, /\.better-codex-auto-dispatch\.is-on\s*\{[^}]*color:\s*var\(--bc-color-success\)/s);
  assert.doesNotMatch(css, /better-codex-auto-dispatch-spin/);
  assert.match(css, /\.better-codex-auto-dispatch-help\s*\{/s);
  assert.match(css, /#better-codex-auto-dispatch-help-dialog \.better-codex-auto-dispatch-help-heading\s*\{[^}]*align-items:\s*center/s);
  assert.match(css, /#better-codex-auto-dispatch-help-dialog \.better-codex-auto-dispatch-help-heading h3\s*\{[^}]*font-size:\s*calc\(var\(--bc-text-xl\) \+ 2px\)/s);
  assert.match(css, /#better-codex-auto-dispatch-help-dialog \.better-codex-auto-dispatch-help-panel\s*\{[^}]*text-align:\s*left/s);
  assert.match(css, /#better-codex-auto-dispatch-help-dialog \.better-codex-auto-dispatch-help-panel p\s*\{[^}]*text-align:\s*left/s);
  assert.match(css, /\.better-codex-auto-dispatch-help-divider\s*\{/s);
});

test("issue creation uses a primary split button with a project creation menu", () => {
  const source = injectionSource(4317, "test-token", "install");
  const css = betterCodexDesignSystemCss();

  assert.ok(source.includes('className = "better-codex-create-split"'));
  assert.ok(source.includes('setAttribute("aria-label", t("更多创建选项"))'));
  assert.ok(source.includes('project.innerHTML = icon("folder") + "<span>" + escapeHtml(t("创建新项目"))'));
  assert.ok(source.includes('openCreateProjectDialog()'));
  assert.ok(source.includes("通过智能体创建"));
  assert.ok(source.includes('function openEditor(issue = null, initialStatus = "todo", createMode = "agent") {\n      state.selected = issue;'));
  assert.ok(source.includes('const draftMode = issue ? "manual" : createMode === "manual" ? "manual" : "agent"'));
  assert.ok(source.includes('expanded: draftMode === "agent" ? false : localStorage.getItem(issue ? ISSUE_DIALOG_EXPANDED_KEY : CREATE_DIALOG_EXPANDED_KEY) === "true"'));
  assert.doesNotMatch(source, /state\.createMode/);
  assert.ok(source.includes('te(draft.mode === "agent" ? "切换到手动" : "切换到智能体")'));
  assert.ok(source.includes('const expandButton = draft.mode === "agent" ? ""'));
  assert.ok(source.includes('startNowButton + expandButton + \'<button class="better-codex-icon-button" type="button" data-dialog-close'));
  assert.ok(source.includes('setDialogExpanded(false);\n            draft.mode = "agent"'));
  assert.ok(source.includes('const crumb = issue'));
  assert.ok(source.includes(': \'<strong>\' + title + \'</strong>\''));
  assert.match(css, /#better-codex-panel \.better-codex-create-split\s*\{[^}]*background:\s*var\(--bc-color-primary\);/s);
  assert.match(css, /#better-codex-panel \.better-codex-create-primary,[\s\S]*?#better-codex-panel \.better-codex-create-toggle\s*\{[^}]*background:\s*transparent;/s);
  assert.match(css, /\.better-codex-create-menu\s*\{[^}]*box-shadow:\s*var\(--bc-elevation-menu\);/s);
});

test("continue creating preference persists across page reloads", () => {
  const source = injectionSource(4317, "test-token", "install");

  assert.ok(source.includes('const KEEP_CREATE_KEY = "better-codex-keep-create"'));
  assert.ok(source.includes('const rememberedKeepCreate = localStorage.getItem(KEEP_CREATE_KEY) === "true"'));
  assert.ok(source.includes("keepCreate: rememberedKeepCreate"));
  assert.ok(source.includes("localStorage.setItem(KEEP_CREATE_KEY, String(state.keepCreate))"));
});

test("unread completion notifications survive Runtime reinjection", () => {
  const source = injectionSource(4317, "test-token", "install");
  const cacheSource = source.slice(source.indexOf("function readCompletionNoticeCache"), source.indexOf("function restoreCompletionNotices"));

  assert.ok(source.includes('const COMPLETION_NOTICE_CACHE_KEY = "better-codex-completion-notices:" + PROFILE'));
  assert.ok(source.includes("function readCompletionNoticeCache()"));
  assert.ok(source.includes("localStorage.setItem(COMPLETION_NOTICE_CACHE_KEY"));
  assert.ok(cacheSource.includes("issue: completionNoticeSnapshot(record.issue)"), "legacy cache records must be reduced to the safe snapshot");
  assert.ok(cacheSource.includes("const record = { key, issue: snapshot, createdAt: Date.now(), duration }"));
  assert.doesNotMatch(cacheSource, /const record = \{ key, issue,/, "the persistent cache must not store the complete Issue object");
  assert.ok(source.includes("completionNoticeStack.children.length >= COMPLETION_NOTICE_CACHE_LIMIT"), "the live notification stack must share the persistent cache bound");
  assert.ok(source.includes("completionNoticeDismissals.get(oldest)?.(false)"));
  assert.ok(source.includes("function restoreCompletionNotices()"));
  assert.ok(source.includes("state.issues.some(issue => issue.id === record.issue.id)"), "cached notices from another account or database must be dropped");
  assert.doesNotMatch(source, /state\.issues\.find\(item => item\.id === record\.issue\.id\) \|\| record\.issue/);
  assert.ok(source.includes("restoreCompletionNotices();"));
  assert.ok(source.includes("dismissNotice(false)"), "reinjection should detach notices without marking them read");
});

test("permanent completion notifications remain manually dismissible", () => {
  const source = injectionSource(4317, "test-token", "install");
  const notificationSource = source.slice(source.indexOf("function renderSessionEndNotice"), source.indexOf("async function perform"));

  assert.ok(notificationSource.includes("const permanent = duration === 0"));
  assert.ok(notificationSource.includes('<button class="better-codex-completion-close"'));
  assert.ok(notificationSource.includes('if (currentNotice.dataset.permanent !== "true") dismissNotice(true)'));
  assert.ok(notificationSource.includes("dismiss(true);\n        void perform(() => openEditor(issue))"));
  assert.ok(notificationSource.includes('querySelector(".better-codex-completion-close").addEventListener("click", () => dismiss(true))'));
  assert.ok(notificationSource.includes("if (!permanent) completionNoticeTimers.set"));
});

test("project lists order recent activity first", () => {
  const source = injectedEntrySource;

  assert.ok(source.includes("function projectsByRecentActivity(projects, issues = state.issues)"));
  assert.ok(source.includes('const timestamp = Date.parse(project?.updated_at || project?.created_at || "")'));
  assert.ok(source.includes("Math.max(projectActivity, issueActivity.get(project?.id) || 0)"));
  assert.ok(source.includes('if (key === "project") return projectsByRecentActivity(state.projects).map'));
  assert.ok(source.includes("const options = projectsByRecentActivity(state.projects).map"));
  assert.ok(source.includes('if (!state.mockup && HOST_KIND === "web") state.projectId = projectsByRecentActivity(state.projects)[0]?.id || ""'));
  assert.equal(source.match(/projectsByRecentActivity\(state\.projects\)/g)?.length, 4);
});

test("column cards fill the padded column evenly", () => {
  const css = betterCodexDesignSystemCss();

  assert.match(css, /\.better-codex-column\s*\{[^}]*padding:\s*var\(--bc-space-2\);/s);
  assert.match(css, /\.better-codex-column-head\s*\{[^}]*padding:\s*0 0 var\(--bc-space-2\);/s);
  assert.match(css, /\.better-codex-cards\s*\{[^}]*padding:\s*0;/s);
  assert.match(css, /\.better-codex-card\s*\{[^}]*width:\s*100%;/s);
});

test("default Codex agent opens a branded config editor", () => {
  const source = injectionSource(4317, "test-token", "install");

  assert.ok(source.includes('return \'<img src="\' + escapeHtml(DEFAULT_AGENT_AVATAR_URL) + \'" alt="Codex">\''));
  assert.ok(source.includes("const isDefault = Boolean(draft.is_default);"));
  assert.ok(source.includes('"/api/agents/default"'));
  assert.ok(source.includes('te("Codex 默认智能体")'));
  assert.ok(!source.includes("影响之后新建的 Codex 窗口"));
  assert.ok(source.includes("if (!agent || agent.is_default) return;"));
});

test("agent model picker uses the runtime catalog and a Codex-style popover", () => {
  const source = injectionSource(4317, "test-token", "install");

  assert.ok(source.includes("bootstrap.agentModelCatalog"));
  assert.ok(source.includes('data-agent-picker="'));
  assert.ok(source.includes('role="listbox"'));
  assert.ok(source.includes('role="option"'));
  assert.doesNotMatch(source, /<select name="model"/);
  assert.doesNotMatch(source, /<select name="reasoning_effort"/);
});

test("opening an agent inspector hides the toolbar create action", () => {
  const source = injectionSource(4317, "test-token", "install");

  assert.ok(source.includes('addAgent.hidden = AGENTS_READ_ONLY || state.agentPane !== "preview"'));
  assert.match(betterCodexDesignSystemCss(), /\.better-codex-agent-actions\[hidden\]\s*\{[^}]*display:\s*none\s*!important/s);
});

test("agent creation reuses the inspector side pane and opens mobile pages fullscreen without motion", () => {
  const source = injectionSource(4317, "test-token", "install");
  const css = betterCodexDesignSystemCss();
  const closeInspector = source.slice(source.indexOf("function closeAgentInspector()"), source.indexOf("function agentInspector("));
  const mobileStart = css.indexOf("@media (max-width: 720px)", css.indexOf("@keyframes better-codex-inspector-enter"));
  const mobileCss = css.slice(mobileStart, css.indexOf("@media (hover: hover)", mobileStart));
  assert.ok(source.includes("function closeAgentInspector()"));
  assert.ok(closeInspector.includes('state.agentPane = "preview"'));
  assert.ok(closeInspector.includes("renderAgents()"));
  assert.ok(closeInspector.includes("history.back()"));
  assert.ok(closeInspector.includes('syncWebAgentRoute("", "replace")'));
  assert.ok(!closeInspector.includes("transitionend"));
  assert.ok(source.includes('data-animate="enter"'));
  assert.ok(source.includes('const animateEnter = previousPane === "preview" && state.agentPane !== "preview"'));
  assert.ok(source.includes('const tag = "aside"'));
  assert.doesNotMatch(source, /inspector\.showModal\(\)/);
  assert.doesNotMatch(css, /\.better-codex-agent-inspector\[data-agent-window="create"\]\s*\{[^}]*position:\s*fixed/s);
  assert.ok(source.includes("return void closeAgentInspectorAfterSave()"));
  assert.ok(source.includes('return "/web/agents"'));
  assert.match(css, /\.better-codex-agent-inspector\[data-animate="enter"\]\s*\{[^}]*animation:\s*better-codex-inspector-enter/s);
  assert.match(mobileCss, /\.better-codex-agent-inspector\[data-agent-window="create"\]\s*\{[^}]*position:\s*relative;[^}]*width:\s*100%;[^}]*height:\s*100%;[^}]*border-radius:\s*0;/s);
  assert.match(mobileCss, /\.better-codex-agent-inspector\[data-animate="enter"\],\s*#better-codex-panel \.better-codex-agent-inspector\[data-agent-window="create"\]\[data-animate="enter"\]\s*\{[^}]*animation:\s*none;[^}]*transition:\s*none;/s);
  assert.doesNotMatch(mobileCss, /animation-name:/);
  assert.doesNotMatch(css, /\.better-codex-agent-inspector\.is-closing/);
  assert.match(css, /@keyframes better-codex-inspector-enter/);
});

test("clicking the agent directory outside the inspector closes the side pane", () => {
  const source = injectionSource(4317, "test-token", "install");

  assert.ok(source.includes('event.target.closest(".better-codex-agent-directory [data-agent-key]")'));
  assert.ok(source.includes('state.agentPane !== "preview" && event.target.closest(".better-codex-agent-directory")'));
  assert.ok(source.includes('if (event.target.closest("[data-agent-close-pane]")'));
  assert.ok(source.includes("closeAgentInspector()"));
});

test("outside click dismisses the avatar picker without closing the agent inspector", () => {
  const source = injectionSource(4317, "test-token", "install");

  assert.ok(source.includes("let suppressAgentOutside = false"));
  assert.ok(source.includes("suppressAgentOutside = true"));
  assert.ok(source.includes("setTimeout(() => { suppressAgentOutside = false; }, 0)"));
  assert.ok(source.includes("if (suppressAgentOutside) return"));
  assert.ok(source.includes("if (!active || suppressAgentOutside) return"));
  assert.ok(source.includes('target.closest("#better-codex-avatar-picker")'));
  assert.ok(source.includes("if (picker.contains(event.target)) return"));
  assert.ok(!source.includes("anchor?.contains?.(event.target)"));
});

test("agent suggestions use bundled PNG avatars", () => {
  const source = injectionSource(4317, "test-token", "install");
  const css = betterCodexDesignSystemCss();
  const start = source.indexOf("const suggestions = suggestedAgents.map");
  const suggestions = source.slice(start, source.indexOf("const animateEnter", start));

  assert.ok(source.includes('"key":"debugger"'));
  assert.ok(source.includes('"name":"问题排查"'));
  assert.ok(suggestions.includes('class="better-codex-agent-suggestion-icon"><img src="'));
  assert.ok(source.includes('"image":"data:image/png;base64,'));
  assert.doesNotMatch(suggestions, /icon\(item\.icon/);
  assert.match(css, /\.better-codex-agent-suggestion-icon > img\s*\{[^}]*width:\s*100%;[^}]*height:\s*100%;[^}]*object-fit:\s*cover/s);
});

test("agent toolbar and inspector occupy separate Codex-style grid regions", () => {
  const css = betterCodexDesignSystemCss();
  const source = injectionSource(4317, "test-token", "install");

  assert.ok(source.includes("panel.dataset.agentPane = state.agentPane"));
  assert.match(css, /\[data-surface="agents"\]\s*\{[^}]*display:\s*grid;[^}]*grid-template-columns:\s*minmax\(0, 1fr\) auto;/s);
  assert.match(css, /\[data-surface="agents"\] \.better-codex-toolbar\s*\{[^}]*grid-column:\s*1;[^}]*grid-row:\s*1;/s);
  assert.match(css, /\[data-surface="agents"\] \.better-codex-agent-inspector\s*\{[^}]*grid-column:\s*2;[^}]*grid-row:\s*1 \/ 3;/s);
});

test("background agent polling preserves active inspector forms", () => {
  const source = injectionSource(4317, "test-token", "install");

  assert.ok(source.includes('loadSurface({ background: true })'));
  assert.ok(source.includes('options.background && (state.agentPane !== "preview" || !changed)'));
});

test("initial agent loading preserves an inspector opened while the request is pending", () => {
  const source = injectionSource(4317, "test-token", "install");

  assert.ok(source.includes('loadSurface({ preserveInspector: true })'));
  assert.ok(source.includes('options.preserveInspector && panel?.dataset.surface === "agents" && state.agentPane !== "preview"'));
});

test("issue editor uses branded listboxes instead of native selects", () => {
  const source = injectionSource(4317, "test-token", "install");
  const css = betterCodexDesignSystemCss();
  const editor = source.slice(source.indexOf("function openEditor("), source.indexOf("async function submitIssue()"));

  assert.doesNotMatch(editor, /<select[^>]+name="(?:status|priority|assignee|project_id)"/);
  assert.ok(source.includes('data-dialog-select-toggle="'));
  assert.ok(source.includes('data-dialog-select-option="'));
  assert.ok(source.includes('data-dialog-select-toggle="assignee"') || source.includes('dialogSelect("assignee"'));
  assert.ok(source.includes("assigneePicker"));
  assert.ok(source.includes('header() + assigneePicker()'));
  assert.ok(source.includes('te("指派给")') && source.includes('dialogSelect("assignee"'));
  assert.ok(!source.includes("assigneePicker() + '<label class=\"better-codex-property\">'"));
  assert.ok(source.includes('aria-label="选择责任人"') || source.includes('"选择责任人"'));
  assert.ok(source.includes('assignee: issue'));
  assert.ok(source.includes(': "none"'));
  assert.ok(source.includes('user_assigned: true'));
  assert.ok(source.includes('data-dialog-project'));
  assert.ok(source.includes('project_id: draft.projectId'));
  assert.ok(source.includes('data-project-label'));
  assert.ok(source.includes('icon("chevron")'));
  assert.match(css, /\.better-codex-dialog-select-menu\s*\{[^}]*position:\s*absolute;/s);
  assert.match(css, /\.better-codex-dialog-select-option\s*\{[^}]*border:\s*0;/s);
});

test("issue board loads every project by default and filters projects explicitly", () => {
  const source = injectionSource(4317, "test-token", "install");

  assert.ok(source.includes("const query = new URLSearchParams();"));
  assert.ok(source.includes('"/api/issues" + (query.toString() ? "?" + query : "")'));
  assert.ok(source.includes("if (filters.project.length && !filters.project.includes(issue.project_id)) return false"));
  assert.doesNotMatch(source, /new URLSearchParams\(\{ project_id: state\.projectId \}\)/);
});

test("agent assignment options expose compact model and reasoning tags", () => {
  const source = injectionSource(4317, "test-token", "install");

  assert.ok(source.includes("function modelTag(value)"));
  assert.ok(source.includes("function reasoningTag(value)"));
  assert.ok(source.includes("function agentConfigTags(agent)"));
  assert.ok(source.includes('medium: "mid"'));
  assert.ok(source.includes('agentOptionLabel(agent, agent.name)'));
  assert.ok(source.includes('agentOptionLabel(defaultAgent, defaultAgent.name || "Codex")'));
  assert.doesNotMatch(source, /Codex（默认配置）/);
  assert.match(source, /better-codex-dialog-select-tag/);
  assert.match(source, /better-codex-context-tag/);
  assert.match(source, /contextAssigneeLabel\(t\("未指派"\)\)/);
  assert.match(betterCodexDesignSystemCss(), /better-codex-dialog-select-tag\[data-tone="model"\]/);
  assert.match(betterCodexDesignSystemCss(), /better-codex-context-submenu\.is-assignee\s*\{[^}]*min-width:\s*214px;/s);
  assert.match(betterCodexDesignSystemCss(), /better-codex-dialog-select\.is-assignee \.better-codex-dialog-select-menu\s*\{[^}]*top:\s*calc\(100% \+ var\(--bc-space-2\)\);[^}]*bottom:\s*auto;/s);
});

test("agent issue creation reuses loaded profile names and avatars", () => {
  const source = injectionSource(4317, "test-token", "install");

  assert.ok(source.includes('state.agents = listResponse(bootstrap.agents, "/api/bootstrap", "agents")'));
  assert.ok(source.includes('function openEditor(issue = null, initialStatus = "todo", createMode = "agent")'));
  assert.ok(source.includes('agentAvatarMarkup(agent, "better-codex-agent-avatar")'));
  assert.ok(source.includes('agentAvatarMarkup(selectedAgent, "better-codex-agent-avatar")'));
  assert.ok(source.includes("syncAgentAvatar(runAvatar, selectedAgent)"));
});

test("panel binds project workspace from the active session cwd", () => {
  const source = injectionSource(4317, "test-token", "install");

  assert.ok(source.includes("async function resolveWorkspacePath(context)"));
  assert.ok(source.includes("async function ensureContextProject(context)"));
  assert.ok(source.includes('"/api/sessions/" + encodeURIComponent(threadId) + "/workspace"'));
  assert.ok(source.includes("await ensureContextProject(context)"));
  assert.ok(source.includes("创建智能体 Issue 需要本地工作区：请先打开该项目下的一个 Codex 会话"));
  assert.ok(source.includes("const latestContext = readContext()"));
  assert.ok(source.includes("let workspacePath = selectedProject?.workspace_path || await resolveWorkspacePath(latestContext)"));
});

test("agent issue creation does not require or bind the current session", () => {
  const source = injectionSource(4317, "test-token", "install");

  assert.ok(source.includes('if (draft.mode === "agent" && !issue && !workspacePath && !state.mockup && !REMOTE)'));
  assert.doesNotMatch(source, /draft\.mode === "agent" && !issue && !threadId/);
  assert.ok(source.includes('ai_enrich: draft.mode === "agent" && !issue'));
  const submitIssue = source.slice(source.indexOf("async function submitIssue()"), source.indexOf("async function startIssueNow()"));
  assert.doesNotMatch(submitIssue, /thread_id:\s*threadId/);
  assert.match(submitIssue, /if \(editingLocked \|\| submitInFlight\) return/);
  assert.match(submitIssue, /id: createRequestId, request_id: createRequestId/);
  assert.match(submitIssue, /request_id: createRequestId/);
  assert.ok(source.includes('id: body.id || "queued:" + commandId'));
  assert.ok(source.includes("cachedCreateDraft?.requestId"));
  assert.ok(source.includes("writeCreateDraft(draft, createRequestId)"));
  assert.ok(submitIssue.indexOf("writeCreateDraft(draft, createRequestId)") < submitIssue.indexOf('await api("/api/issues"'));
  assert.ok(source.includes('commandError === "session_command_not_claimed"'));
  assert.ok(source.includes('sendAppServerRequest("turn/interrupt", { threadId, turnId })'));
});

test("agent detail avatars use PNG presets and open an avatar picker", () => {
  const source = injectionSource(4317, "test-token", "install");

  assert.ok(source.includes('branded ? codexLogo() : \'<img src="\' + escapeHtml(fallback.image)'));
  assert.ok(source.includes('data-agent-avatar-form'));
  assert.ok(source.includes("chooseAgentAvatar("));
  assert.ok(source.includes('id = "better-codex-avatar-picker"'));
  assert.ok(source.includes("position: fixed") || source.includes('style.top = top + "px"'));
  assert.ok(source.includes(".better-codex-agent-avatar-field, .better-codex-agent-profile-head"));
  assert.ok(source.includes("AGENT_AVATAR_PRESETS"));
  assert.ok(source.includes('"id":"reviewer"'));
  assert.ok(source.includes('better-codex-agent-profile-head'));
  assert.ok(source.includes('const heading = t(creating ? "新建" : "智能体")'));
  assert.ok(source.includes('<h2>\' + te("创建智能体") + \'</h2><div class="better-codex-agent-avatar-field">'));
  assert.ok(source.includes("点击选择预设图标，或上传图片"));
  assert.ok(source.includes('AGENT_AVATAR_PRESETS.find(item => item.id === draft.key)?.image'));
  assert.ok(source.includes("state.agentDraft?.key === item.key"));
  assert.ok(!source.includes('class="better-codex-agent-profile-name" name="name"'));
  assert.ok(!source.includes('data-agent-avatar-edit'));
  assert.ok(source.includes('id = "better-codex-avatar-cropper"'));
  assert.ok(source.includes('canvas.addEventListener("pointermove"'));
  assert.ok(source.includes('output.width = 256'));
  assert.ok(source.includes('output.toDataURL("image/png")'));
  assert.ok(source.includes('better-codex-avatar-preset-visual"><img src="'));
});

test("every rendered Codex avatar uses the bundled PNG", () => {
  const source = injectionSource(4317, "test-token", "install");

  assert.ok(source.includes('return \'<img src="\' + escapeHtml(DEFAULT_AGENT_AVATAR_URL) + \'" alt="Codex">\''));
  assert.ok(source.includes('visual: () => agentAvatarMarkup(agent, "better-codex-agent-avatar")'));
  assert.ok(source.includes('typeof option.visual === "function" ? option.visual()'));
  assert.doesNotMatch(source, /better-codex-logo-gradient|codexLogoSequence/);
});

test("issue agent avatars use the same PNG fallback as the agent directory", () => {
  const css = betterCodexDesignSystemCss();
  const source = injectionSource(4317, "test-token", "install");

  assert.ok(source.includes('const fallback = AGENT_AVATAR_PRESETS.find(item => item.id === "bot")'));
  assert.ok(source.includes('className + " has-image"'));
  assert.match(css, /\.better-codex-completion-avatar img[^}]*width:\s*100%;[^}]*height:\s*100%;[^}]*object-fit:\s*cover/s);
});

test("agent issue creation reserves enough height for its scaled footer", () => {
  const css = betterCodexDesignSystemCss();

  assert.ok(css.includes("--bc-dialog-agent-height: 400px"));
  assert.ok(css.includes("height: min(var(--bc-dialog-agent-height), calc(100vh - 48px))"));
  assert.doesNotMatch(css, /#better-codex-dialog\[data-mode="agent"\]\s*\{[^}]*height:\s*min\(368px/s);
});

test("issue detail dialog separates compact and expanded sizes", () => {
  const css = betterCodexDesignSystemCss();

  assert.match(css, /#better-codex-dialog\[data-detail="true"\]\[data-expanded="false"\]\s*\{[^}]*width:\s*min\(1200px,[^}]*height:\s*fit-content;/s);
  assert.match(css, /#better-codex-dialog\[data-detail="true"\]\[data-expanded="false"\]:has\(\.better-codex-conversation\)\s*\{[^}]*height:\s*min\(76vh,\s*780px\)/s);
  assert.match(css, /#better-codex-dialog\[data-detail="true"\]\[data-expanded="true"\]\s*\{[^}]*inset:\s*var\(--bc-dialog-fullscreen-top\)[^}]*width:\s*var\(--bc-dialog-fullscreen-width\)[^}]*height:\s*var\(--bc-dialog-fullscreen-height\)/s);
  assert.match(css, /#better-codex-dialog\[data-detail="true"\]\[data-expanded="true"\]:has\(\.better-codex-conversation\)\s*\{[^}]*height:\s*var\(--bc-dialog-fullscreen-height\)/s);
  assert.match(css, /#better-codex-dialog\[data-detail="true"\]\[data-expanded="false"\],[\s\S]*?#better-codex-dialog\[data-detail="true"\]\[data-expanded="true"\]\s*\{\s*width:\s*calc\(100vw - 24px\);/s);
});

test("issue detail editors reveal their affordance on hover and focus", () => {
  const css = betterCodexDesignSystemCss();

  assert.match(css, /#better-codex-dialog\[data-detail="true"\] \.better-codex-manual-title:focus,[\s\S]*?\.better-codex-description-field:focus-within\s*\{[^}]*background:\s*var\(--bc-color-input\);[^}]*box-shadow:\s*var\(--bc-inset-hairline\),\s*var\(--bc-focus-ring\);/s);
});

test("issue submit buttons omit visual keyboard shortcut badges", () => {
  const source = injectionSource(4317, "test-token", "install");

  assert.doesNotMatch(source, /better-codex-keycap/);
  assert.doesNotMatch(source, />⌘<|>↵</);
  assert.ok(source.includes("isSendKeyboardEvent(event)"));
});

test("issue context menu can assign a Web user or an agent", () => {
  const source = injectionSource(4317, "test-token", "install");

  assert.ok(source.includes("指定负责人"));
  assert.ok(source.includes('data-context-action="assign"'));
  assert.ok(source.includes('data-assignee-kind="user"'));
  assert.ok(source.includes('data-context-user-id="'));
  assert.ok(source.includes('data-assignee-kind="agent"'));
  assert.ok(source.includes('data-assignee-kind="none"'));
  assert.ok(source.includes('contextAssigneeLabel(t("未指派"))'));
  assert.doesNotMatch(source, /取消分配/);
  assert.ok(source.includes('userAvatarMarkup(user, "better-codex-context-avatar")'));
  assert.ok(source.includes("better-codex-context-tag"));
  assert.ok(source.includes("user_assigned: true"));
  assert.ok(source.includes("const assigned = Boolean(issue.agent_enabled || issue.user_assigned)"));
});

test("issue working activity uses the agent avatar instead of initials", () => {
  const source = injectionSource(4317, "test-token", "install");

  assert.ok(source.includes("issue.active_run_status"));
  assert.ok(source.includes('issue.reply_status === "running"'));
  assert.ok(source.includes('sendAppServerRequest("thread/read", { threadId, includeTurns: false })'));
  assert.ok(source.includes('sendAppServerRequest("thread/read", { threadId, includeTurns: true })'));
  assert.ok(source.includes('queueRelayEvent("turn/completed"'));
  assert.ok(source.includes('["thread/status/changed", "turn/started", "turn/completed", "error", "item/started", "item/completed"]'));
  assert.ok(source.includes("sessionRetryDetail(issue.session_retry)"));
  assert.ok(source.includes('data-session-retry role="status"'));
  assert.ok(source.includes('data-dialog-stop'));
  assert.ok(source.includes("10 * 60 * 1000"));
  assert.ok(source.includes("result?.active_turns"));
  assert.ok(source.includes('agentAvatarMarkup(activityAgent, "better-codex-card-avatar")'));
  assert.ok(source.includes('"工作中"'));
  assert.ok(source.includes('"排队中"'));
  assert.ok(betterCodexDesignSystemCss().includes('.better-codex-activity[data-run="retrying"]'));
  assert.ok(!source.includes('class="better-codex-avatar">\' + escapeHtml(agentInitial)'));
});

test("issue cards show project icon and assignee instead of session entry", () => {
  const source = injectionSource(4317, "test-token", "install");
  const css = betterCodexDesignSystemCss();

  assert.ok(source.includes('icon("folder")'));
  assert.ok(source.includes("better-codex-card-assignee"));
  assert.ok(source.includes("better-codex-card-avatar"));
  assert.ok(source.includes("未分配"));
  assert.ok(!source.includes('class="better-codex-link" type="button" data-thread="'));
  assert.ok(!source.includes(">打开 Session</button>"));
  assert.ok(source.includes("在会话中打开"));
  assert.ok(source.includes("data-dialog-open-thread"));
  assert.ok(source.includes("function normalizeSessionId(value)"));
  assert.ok(source.includes("function issueSessionId(issue)"));
  assert.ok(source.includes("sessionId = issueSessionId(issue)"));
  assert.ok(source.includes("const expected = normalizeSessionId(threadId)"));
  assert.ok(source.includes('if (!expected) throw new Error("thread_id_invalid")'));
  assert.ok(source.includes("THREAD_OPEN_TIMEOUT_MS = 10000"));
  assert.ok(source.includes('const PROJECT_KEY = "better-codex-project-id"'));
  assert.ok(source.includes("localStorage.getItem(PROJECT_KEY)"));
  assert.ok(source.includes("state.projects.find(item => item.id === rememberedProjectId)"));
  assert.ok(source.includes("function activeThreadId()"));
  assert.doesNotMatch(source, /\/api\/issues\/.*\/app|message: "\/app"/);
  assert.ok(source.includes("const NAVIGATION ="));
  assert.ok(source.includes("window.postMessage({ type: NAVIGATION.messageType"));
  assert.ok(source.includes("function currentRouteThreadId()"));
  assert.doesNotMatch(source, /THREAD_ROUTE_RETRY_MS|THREAD_ROUTE_CONFIRM_DELAY_MS/);
  assert.ok(source.includes('button.classList.add("is-loading")'));
  assert.ok(source.includes('button.innerHTML = icon("refresh") + "<span>" + te("正在打开…") + "</span>"'));
  assert.ok(source.includes('button.removeAttribute("aria-busy")'));
  assert.ok(source.includes('throw new Error("thread_open_timeout")'));
  assert.ok(source.includes("Issue 详情"));
  assert.ok(source.includes('data-dialog-start-now'));
  assert.ok(source.includes('/start'));
  assert.ok(source.includes('立即开始任务'));
  assert.ok(source.includes('!issue.archived_at && !sessionId && !issue.active_run_status && issue.status !== "done"'));
  const headerStart = source.indexOf("function header()");
  const footerStart = source.indexOf("function footer()");
  const headerSource = source.slice(headerStart, footerStart);
  assert.ok(headerSource.includes('data-dialog-start-now aria-label="\' + te("立即开始任务")'));
  assert.equal(source.slice(footerStart, source.indexOf("function renderDialog()", footerStart)).includes("data-dialog-start-now"), false);
  assert.ok(source.includes('if (issue && !permissions.enrichmentPending && !permissions.remotePending) return void perform(() => openEditor(issue))'));
  assert.ok(source.includes('draggable="\' + String(!issueLocked && supportsIssueDrag()) + \'"'));
  assert.ok(source.includes('board.addEventListener("pointerdown", onIssueLongPressStart)'));
  assert.ok(source.includes("openIssueMenuAt(card, press.startX, press.startY)"));
  assert.ok(source.includes('if (!issue || editingLocked || !issue.agent_enabled ||'));
  assert.ok(source.includes('if (editingLocked || submitInFlight) return;'));
  assert.ok(!source.includes("issue?.run_thread_id || issue?.thread_id || \"\""));
  assert.ok(!source.includes("(sessionId ? ' data-thread=\""));
  assert.doesNotMatch(source, /任务尚未关联 Session/);
  assert.match(css, /\.better-codex-dialog-open-thread\s*\{[^}]*background:\s*var\(--bc-color-primary\)/s);
  assert.match(css, /\.better-codex-dialog-open-thread\.is-loading svg\s*\{[^}]*animation:/s);
  assert.match(css, /\.better-codex-dialog-start-now\s*\{/s);
  assert.match(css, /\.better-codex-card-assignee\s*\{/s);
  assert.match(css, /\.better-codex-chip\s*>\s*svg\s*\{/s);
});

test("native thread context menus remain owned by Codex", () => {
  const source = injectionSource(3210, "token", "install");
  assert.doesNotMatch(source, /onNativeThreadContextMenu/);
  assert.doesNotMatch(source, /electronBridge\?\.showContextMenu/);
  assert.doesNotMatch(source, /better-codex-thread-action/);
});

test("open-in-conversation requires a valid session uuid", () => {
  const source = injectionSource(4317, "test-token", "install");
  const openHandler = source.slice(source.indexOf('dialog.querySelector("[data-dialog-open-thread]")'), source.indexOf('const startNow = dialog.querySelector("[data-dialog-start-now]")'));
  const turnCommand = source.slice(source.indexOf('} else if (command.kind === "turn")'), source.indexOf('} else if (command.kind === "steer")'));
  const openThread = source.slice(source.indexOf("async function openThread(threadId)"), source.indexOf("function isSidebarNavigationTarget"));

  assert.ok(source.includes("function normalizeSessionId(value)"));
  assert.ok(source.includes("/^[a-f0-9-]{36}$/i.test(id)"));
  assert.ok(source.includes("return normalizeSessionId(issue?.run_thread_id) || \"\""));
  assert.ok(source.includes("const openThreadButton = issue && sessionId"));
  assert.ok(source.includes("if (!issue || !sessionId) return \"\""));
  assert.ok(source.includes('if (!expected) throw new Error("thread_id_invalid")'));
  assert.doesNotMatch(openHandler, /\/stop|session-handoff|终止并打开/);
  assert.ok(openThread.indexOf("requestSessionHandoff(issue, expected)") < openThread.indexOf("resumePersistedThread(expected)"));
  assert.ok(source.includes("nativeThreadOpenBypass === threadId"));
  assert.ok(source.includes("void perform(() => openThread(threadId))"));
  assert.ok(source.includes('type: "mcp-request"'));
  assert.ok(source.includes('sendAppServerRequest("thread/start"'));
  assert.ok(source.includes('sendAppServerRequest("thread/resume", params)'));
  assert.ok(source.includes('params.sandbox = String(payload.sandbox_mode || "workspace-write")'));
  assert.ok(source.includes('params.developerInstructions = String(payload.developer_instructions || "")'));
  assert.ok(source.includes('if (method === "thread/started") return false'));
  assert.ok(source.includes('sendAppServerRequest("turn/start"'));
  assert.ok(source.includes('sendAppServerRequest("turn/steer"'));
  assert.ok(source.includes('sendAppServerRequest("turn/interrupt"'));
  assert.ok(source.includes('data-context-action="stop"'));
  assert.ok(source.includes('data-dialog-stop'));
  assert.ok(source.includes('encodeURIComponent(issueId) + "/stop"'));
  assert.ok(turnCommand.indexOf("resumePersistedThread(threadId, payload)") < turnCommand.indexOf('sendAppServerRequest("turn/start"'));
  assert.ok(openThread.indexOf("resumePersistedThread(expected)") < openThread.indexOf("close()"));
  assert.ok(source.includes("openThread, close, destroy"));
});

test("issue details render the latest conversation result and reply composer", () => {
  const source = injectionSource(4317, "test-token", "install");
  const css = betterCodexDesignSystemCss();
  const permissions = source.slice(source.indexOf("function applyDialogPermissions()"), source.indexOf("function refreshIssueState"));

  assert.ok(source.includes('mode: draftMode'));
  assert.ok(source.includes('te("对话")'));
  assert.ok(source.includes("data-conversation-body"));
  assert.ok(source.includes("better-codex-bubble"));
  assert.ok(source.includes("conversationBubbles"));
  assert.ok(source.includes("is-initials"));
  assert.ok(source.includes("bootstrap.user"));
  assert.ok(source.includes("/conversation"));
  assert.ok(source.includes("/reply"));
  assert.ok(source.includes("在此回复智能体"));
  assert.ok(source.includes("data-conversation-send"));
  assert.ok(!source.includes("data-conversation-stop"));
  assert.ok(source.includes("data-conversation-queue"));
  assert.ok(source.includes("better-codex-composer-queue-row"));
  assert.ok(source.includes('icon("queue")'));
  assert.ok(!source.includes("将在当前任务完成后依次发送"));
  assert.ok(source.includes("data-queue-send-now"));
  assert.ok(source.includes("data-queue-edit-save"));
  assert.ok(source.includes('updateQueuedReply("send"'));
  assert.ok(source.includes("data-conversation-attach"));
  assert.ok(permissions.includes("[data-conversation-copy]"));
  assert.match(permissions, /if \(executionRunning\) \{[\s\S]*?control\.disabled = !control\.matches\('[^']*\[data-queue-edit-input\][^']*\[data-queue-delete\][^']*'\)/);
  assert.ok(source.includes('data-composer-mode="\' + mode + \'"'));
  assert.ok(source.includes('button.dataset.composerMode === "stop"'));
  assert.ok(source.includes('["send", "queue"].includes(button.dataset.composerMode)'));
  assert.ok(source.includes("stopIssueFromDialog(button)"));
  assert.equal(permissions.match(/\[data-conversation-retry\]/g)?.length, 2);
  assert.ok(source.includes('const retryRequestId = ["failed", "interrupted"].includes(lastReplyStatus) ? "" : lastReplyRequestId'));
  assert.ok(source.includes("sendReply(lastReplyMessage, retryRequestId, lastReplySemanticReferences, lastReplyCommand)"));
  assert.match(css, /\.better-codex-timeline\s*\{/s);
  assert.match(css, /\.better-codex-bubble\s*\{/s);
  assert.match(css, /\.better-codex-composer\s*\{[^}]*border-radius:\s*23px;[^}]*padding:\s*8px;/s);
  assert.match(css, /\.better-codex-composer textarea\s*\{[^}]*height:\s*calc\(2\.9em\s*\+\s*8px\);/s);
  assert.match(css, /#better-codex-dialog\[data-detail="true"\] \.better-codex-composer textarea\s*\{[^}]*height:\s*calc\(5\.8em\s*\+\s*8px\);/s);
  assert.match(css, /\.better-codex-composer textarea\s*\{[^}]*resize:\s*none;/s);
  assert.match(css, /\.better-codex-composer-toolbar\s*\{[^}]*height:\s*30px;/s);
  assert.match(css, /\.better-codex-composer-attach,[\s\S]*?\.better-codex-composer-send\s*\{[^}]*width:\s*30px;[^}]*height:\s*30px;/s);
  assert.match(css, /\.better-codex-composer-send\[data-composer-mode="stop"\] svg/s);
  assert.match(css, /\.better-codex-composer-queue\s*\{[^}]*max-height:\s*min\(177px, 30dvh\);[^}]*border:\s*1px solid var\(--bc-color-hairline\);[^}]*border-bottom:\s*0;[^}]*border-radius:\s*23px 23px 0 0;/s);
  assert.match(css, /\.better-codex-composer-queue-row\s*\{[^}]*min-height:\s*24px;[^}]*gap:\s*6px;/s);
  assert.match(css, /\.better-codex-composer-queue-actions\s*\{[^}]*opacity:\s*0;/s);
  assert.match(css, /\.better-codex-composer-queue-edit\s*\{[^}]*min-height:\s*44px;/s);
});

test("user-stopped sessions render a red-dot stopped state", () => {
  const source = injectionSource(4317, "test-token", "install");
  const css = betterCodexDesignSystemCss();

  assert.ok(source.includes('interrupted: "已停止"'));
  assert.ok(source.includes('activityState === "interrupted" ? "已停止"'));
  assert.ok(source.includes('issue.reply_status === "succeeded" ? "completed"'));
  assert.ok(source.includes('replyStatus === "succeeded" ? "completed"'));
  assert.ok(source.includes('activeExecutionState || (issue?.enrichment_status === "failed" ? "title-regeneration-failed" : replyResultState || executionState)'));
  assert.ok(source.includes('["completed", "interrupted", "not-started"].includes(activityState)'));
  assert.match(css, /\.better-codex-conversation-status \.better-codex-activity\[data-run="interrupted"\]\s*\{[^}]*color:\s*var\(--bc-color-danger\);/s);
});

test("issue keep-open toggle keeps a visible track in light mode", () => {
  const css = betterCodexDesignSystemCss();
  const toggleRule = css.match(/#better-codex-dialog \.better-codex-toggle\s*\{([^}]*)\}/)?.[1] || "";

  assert.match(toggleRule, /background:\s*var\(--bc-color-control\)/);
  assert.match(toggleRule, /box-shadow:\s*var\(--bc-inset-hairline\)/);
});

test("create and reply dialogs persist cached attachment references", () => {
  const source = injectionSource(4317, "test-token", "install");

  assert.ok(source.includes('data-dialog-attach aria-label="\' + te("添加附件")'));
  assert.ok(source.includes("attachments: cachedCreateDraft?.attachments?.map"));
  assert.ok(source.includes("attachments: Array.isArray(draft.attachments)"));
  assert.ok(source.includes("attachments: draft.attachments.filter(item => item.path)"));
  assert.ok(source.includes("function pickAttachments(existing = [])"));
  assert.ok(source.includes("async function remoteFiles(items)"));
  assert.ok(source.includes("async function cacheRemoteAttachments(items)"));
  assert.ok(source.includes('api("/api/issues/attachments", { method: "POST", body: JSON.stringify({ files })'));
  assert.ok(source.includes("if (!issue || REMOTE && !RELAY) return;"));
  assert.ok(source.includes("if (RELAY) await cacheRemoteAttachments(items);"));
  assert.ok(source.includes("if (RELAY) await cacheRemoteAttachments(next);"));
  assert.ok(source.includes("files = await remoteFiles(draft.replyAttachments.filter(item => item.file));"));
  assert.ok(source.includes("message = withAttachments(text, draft.replyAttachments.filter(item => item.path));"));
  assert.ok(source.includes("function withAttachments(text, items = draft.attachments)"));
  assert.ok(source.includes('const path = String(file.path || "").trim()'));
  assert.ok(source.includes('const block = t("附带文件：") + "\\n"'));
  assert.ok(source.includes("const submittedDescription = withAttachments(draft.mode === \"agent\" ? prompt : draft.description)"));
  assert.ok(source.includes("description: submittedDescription"));
  assert.ok(source.includes("reconcileSemanticText(draft.promptSemanticDocument, submittedDescription)"));
  assert.ok(source.includes("data-dialog-detach"));
  assert.ok(source.includes("当前环境无法读取本地文件路径"));
});

test("destructive actions use the branded confirmation dialog", () => {
  const source = injectionSource(4317, "test-token", "install");

  assert.ok(source.includes('dialogHandle.element.id = "better-codex-confirm"'));
  assert.ok(source.includes("createDialog({ accessibleName: t(title)"));
  assert.ok(source.includes('confirmAction("删除任务"'));
  assert.ok(source.includes('confirmAction("删除智能体"'));
  assert.doesNotMatch(source, /\b(?:window\.)?confirm\s*\(/);
});

test("archive is an action and cancelled is not an issue status", () => {
  const source = injectionSource(4317, "test-token", "install");

  assert.doesNotMatch(source, /statusCancelled|cancelled:\s*"已取消"|data-context-value="cancelled"/);
  assert.ok(source.includes('data-context-action="archive">\' + icon("archive") + \'<span>\' + escapeHtml(t("归档"))'));
  const archiveAction = source.match(/if \(item\.dataset\.contextAction === "archive"\) \{[\s\S]*?await loadIssues\(\);\n\s*\}/)?.[0] || "";
  assert.ok(archiveAction.includes('/archive'));
  assert.doesNotMatch(archiveAction, /confirmAction|删除任务/);
});

test("every modal dialog closes only when its backdrop is clicked", () => {
  const source = injectedEntrySource;
  const bindings = source.match(/bindModalDismiss\(dialog, \(\) =>/g) || [];

  assert.ok(source.includes("function bindModalDismiss(dialog, dismiss)"));
  assert.ok(sharedDialogSource.includes("pointer.clientX < bounds.left || pointer.clientX > bounds.right || pointer.clientY < bounds.top || pointer.clientY > bounds.bottom"));
  assert.equal(bindings.length, 4);
});

test("Codex-native visual values live behind semantic design tokens", () => {
  const css = betterCodexDesignSystemCss();
  const source = injectionSource(4317, "test-token", "install");

  assert.ok(css.includes("--bc-color-canvas:"));
  assert.ok(css.includes("--bc-radius-xl:"));
  assert.ok(css.includes("--bc-motion-fast:"));
  assert.match(css, /\.better-codex-card\s*\{[^}]*border:\s*1px solid var\(--bc-color-hairline\);[^}]*background:\s*var\(--bc-color-canvas\);[^}]*box-shadow:\s*var\(--bc-elevation-card\);/s);
  assert.match(css, /\.better-codex-card\.is-dragging\s*\{[^}]*opacity:\s*\.42;/s);
  assert.match(css, /\.better-codex-card\.is-dragging:active\s*\{[^}]*transform:\s*none;/s);
  assert.ok(source.includes("function onCardDragStart(event)"));
  assert.ok(source.includes("function onCardDragEnd(event)"));
  assert.ok(source.includes("function onDrop(event)"));
  assert.ok(source.includes('board.addEventListener("dragstart", onCardDragStart)'));
  assert.ok(source.includes('board.addEventListener("dragend", onCardDragEnd)'));
  assert.ok(source.includes('board.addEventListener("dragover", event => event.preventDefault())'));
  assert.ok(source.includes('board.addEventListener("drop", onDrop)'));
  assert.ok(source.includes("draggingIssueId"));
  assert.ok(source.includes('card.classList.add("is-dragging")'));
  assert.ok(source.includes('event.dataTransfer.setData("text/plain", issueId)'));
  assert.ok(source.includes("issuePermissions(issue).boardLocked"));
  assert.ok(source.includes("--bc-color-surface-raised:"));
});

test("semantic surface hierarchy is derived from the Codex appearance configuration", () => {
  const css = betterCodexDesignSystemCss();
  const source = injectionSource(4317, "test-token", "install");

  assert.ok(css.includes("--bc-color-canvas: var(--bc-host-light-canvas"));
  assert.ok(css.includes("--bc-color-canvas: var(--bc-host-dark-canvas"));
  assert.ok(css.includes("--bc-color-input: var(--bc-color-canvas)"));
  assert.match(css, /html\.electron-dark[\s\S]*?--bc-color-input:\s*var\(--bc-color-control\)/);
  assert.ok(css.includes("--bc-color-hairline: var(--bc-host-light-hairline"));
  assert.ok(source.includes("applyAppearance(bootstrap.hostTheme || bootstrap.appearance)"));
  assert.ok(source.includes("applyHostTheme(appearance"));
  assert.ok(source.includes("environment.style.setProperty(name, tokenValue)"));
  assert.match(css, /\.better-codex-agent-inspector-field textarea\s*\{[^}]*box-shadow:\s*var\(--bc-inset-hairline\);/s);
  assert.match(css, /\.better-codex-agent-inspector-field textarea\s*\{[^}]*resize:\s*none;/s);
  assert.match(css, /textarea\[name="description"\]\s*\{[^}]*height:\s*calc\(\(var\(--bc-text-md\) \* 1\.55 \* 4\) \+ 26px\);/s);
  assert.match(css, /textarea\[name="instructions"\]\s*\{[^}]*height:\s*calc\(\(var\(--bc-text-md\) \* 1\.55 \* 12\) \+ 26px\);/s);
  assert.match(css, /\.better-codex-agent-number-input\s*\{[^}]*width:\s*76px;/s);
  assert.ok(source.includes('agentNumberInput("max_concurrency", t("最大并发"), draft.max_concurrency, 1, 20)'));
  assert.ok(source.includes('function agentNumberInput(name, label, value, min, max)'));
  assert.ok(source.includes('type="number"'));
  assert.doesNotMatch(source, /agentPicker\("max_concurrency"/);
  assert.match(css, /\.better-codex-agent-inspector-group\s*\{[^}]*box-shadow:\s*var\(--bc-inset-hairline\);/s);
  assert.match(css, /\.better-codex-agent-profile-name\s*\{[^}]*box-shadow:\s*var\(--bc-inset-hairline\);/s);
  assert.match(css, /\.better-codex-search-wrap\s*\{[^}]*background:\s*var\(--bc-color-control\);/s);
  assert.match(css, /\.better-codex-agent-profile-name\s*\{[^}]*background:\s*var\(--bc-color-control\);/s);
  assert.match(css, /\.better-codex-agent-inspector-group\s*\{[^}]*background:\s*var\(--bc-color-input\);/s);
  assert.match(css, /\.better-codex-agent-inspector-field textarea\s*\{[^}]*background:\s*var\(--bc-color-input\);/s);
});

test("web injection shares the Codex user profile with the host shell", () => {
  const source = injectionSource(4317, "test-token", "install", "zh-CN", "web");

  assert.match(source, /new CustomEvent\("better-codex:bootstrap"/);
  assert.equal(injectedEntrySource.match(/new CustomEvent\("better-codex:bootstrap"/g)?.length, 3, "bootstrap, profile, and language changes should refresh the Web host profile");
  assert.match(source, /detail: \{ user: state\.user, locale: state\.locale \}/);
});
