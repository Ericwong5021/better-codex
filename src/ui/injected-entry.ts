import { createHostAdapter } from "./hosts/index.js";
import { applyHostTheme } from "./theme/apply.js";
import { themeIsDegraded } from "./theme/diagnostics.js";
import { createEmptyState } from "./components/empty-state.js";
import { adoptInlineFeedback } from "./components/inline-feedback.js";
import { createDialog } from "./components/dialog.js";
import { adoptFieldShell } from "./components/field-shell.js";
import { adoptMenu } from "./components/menu.js";
import { adoptNotice } from "./components/notice.js";
import { observeComponentSize } from "./core/lifecycle.js";
import { destroyRemovedComponents, registerOwnedComponent } from "./core/ownership.js";
import { adoptButton, adoptIconButton, createButton, createIconButton } from "./primitives/button.js";
import { adoptBadge, adoptStatusBadge, createStatusBadge } from "./primitives/badge.js";
import { adoptFormRow } from "./patterns/form-row.js";
import { adoptListRow } from "./patterns/list-row.js";
import { adoptToolbar } from "./patterns/toolbar.js";
import { createAgentsController } from "./features/agents/controller.js";
import { createBoardController } from "./features/board/controller.js";
import { createSemanticController } from "./features/board/semantic-controller.js";
import { createSemanticDraft, insertSemanticReference, reconcileSemanticText, serializeSemanticDraft } from "./features/board/semantic-model.js";
import { semanticCandidateGroup, semanticCandidateIcon } from "./features/board/semantic-view.js";
import { createProjectsController } from "./features/projects/controller.js";
import { createScheduledController } from "./features/scheduled/controller.js";
import { createSettingsController } from "./features/settings/controller.js";

export function install(config: Record<string, any>) {
  if (!config || config.schemaVersion !== 1) throw new Error("injected_ui_schema_mismatch");
    "use strict";
    const VERSION = config.version;
    const CORE_VERSION = config.coreVersion;
    const PROFILE = config.profile;
    const HOST_KIND = config.host;
    const SESSION_NATIVE_COMMANDS = config.sessionNativeCommands;
    const DESKTOP_NATIVE_COMMANDS = config.desktopNativeCommands;
    const RELAY = document.documentElement.dataset.betterCodexHost === "relay";
    const HOST_ADAPTER = createHostAdapter(HOST_KIND, window.betterCodexHost, RELAY);
    const HOST_CAPABILITIES = HOST_ADAPTER.capabilities;
    const READ_ONLY = HOST_CAPABILITIES.issues === "read-only";
    const AGENTS_READ_ONLY = HOST_CAPABILITIES.agents === "read-only";
    const CODEX_SEMANTICS_AVAILABLE = HOST_CAPABILITIES.codexSemantics !== false;
    const REMOTE = HOST_ADAPTER.remote;
    const SCHEDULED_AVAILABLE = !REMOTE || RELAY;
    if (READ_ONLY) document.documentElement.setAttribute("data-better-codex-read-only", "true");
    const HELP_MODE_MARKDOWN = config.helpModeMarkdown;
    const previous = window.__betterCodexInjection__;
    if (previous?.version === VERSION && previous?.endpoint === config.baseUrl && previous?.profile === PROFILE && previous?.host === HOST_KIND && previous?.bundleChecksum === config.bundleChecksum && typeof previous?.pulse === "function") {
      previous.refresh();
      return { installed: true, reused: true };
    }
    previous?.destroy?.();

    const ENTRY_ID = "better-codex-entry";
    const SCHEDULED_ENTRY_ID = "better-codex-scheduled-entry";
    const SCHEDULED_MOBILE_ENTRY_ID = "better-codex-scheduled-mobile-entry";
    const AGENTS_ENTRY_ID = "better-codex-agents-entry";
    const PROJECTS_ENTRY_ID = "better-codex-projects-entry";
    const MORE_ENTRY_ID = "better-codex-more-entry";
    const PANEL_ID = "better-codex-panel";
    const STYLE_ID = "better-codex-style";
    const OWNED = "data-better-codex-owned";
    const HIDDEN = "data-better-codex-native-hidden";
    const HOST = "data-better-codex-page-host";
    const BASE_URL = config.baseUrl;
    const BRIDGE_TOKEN = config.bridgeToken;
    const BETTER_CODEX_LOGO_URL = config.logoUrl;
    const INITIAL_LOCALE = config.initialLocale;
    const SELECTORS = HOST_KIND === "web" ? {
      sidebarScroll: "[data-app-action-sidebar-scroll]",
      sidebarSection: "[data-app-action-sidebar-section]",
      truncatedText: ".text-fade-truncate",
      contentFrame: ".app-shell-main-content-frame",
      contentLayout: "[data-app-shell-main-content-layout]",
      threadRow: "[data-app-action-sidebar-thread-id]",
      projectList: "[data-app-action-sidebar-project-list-id]",
      projectId: "[data-app-action-sidebar-project-id]",
      currentProjectRow: "[data-app-action-sidebar-project-row][aria-current=\"page\"]",
      projectRow: "[data-app-action-sidebar-project-row]",
      searchInput: "input[type=\"search\"]",
      sidebarNavigation: "aside nav[role=\"navigation\"]",
    } : config.selectors;
    const ATTRIBUTES = HOST_KIND === "web" ? {
      threadId: "data-app-action-sidebar-thread-id",
      threadActive: "data-app-action-sidebar-thread-active",
      projectListId: "data-app-action-sidebar-project-list-id",
      projectId: "data-app-action-sidebar-project-id",
      projectLabel: "data-app-action-sidebar-project-label",
    } : config.attributes;
    const NAVIGATION = HOST_KIND === "web" ? {
      messageType: "navigate-to-route",
      threadRoutePrefix: "/local/",
    } : config.navigation;
    const BETTER_CODEX_ROUTE = config.betterCodexRoute;
    const FEATURE_MANIFEST = config.featureManifest;
    const ENABLED_FEATURES = new Set(FEATURE_MANIFEST.features.filter(feature => feature.enabled).map(feature => feature.id));
    const SIDEBAR_NAVIGATION_ITEM = SELECTORS.sidebarNavigationItem || ".sidebar-item";
    const LUCIDE_ICONS = config.lucideIcons;
    const AGENT_AVATAR_PRESETS = config.agentAvatarPresets;
    const USER_AVATAR_COLORS = config.userAvatarColors;
    const RESUME_SURFACE_KEY = "better-codex-resume-surface";
    const PROJECT_KEY = "better-codex-project-id";
    const LANGUAGE_KEY = "better-codex-language";
    const COMPLETION_DURATION_KEY = "better-codex-completion-notice-duration";
    const COMPLETION_NOTICE_CACHE_KEY = "better-codex-completion-notices:" + PROFILE;
    const COMPLETION_NOTICE_CACHE_LIMIT = 50;
    const CREATE_DRAFT_KEY = "better-codex-create-draft";
    const KEEP_CREATE_KEY = "better-codex-keep-create";
    const CREATE_ISSUE_SHORTCUT_KEY = "better-codex-create-issue-shortcut";
    const SEND_MODE_KEY = "better-codex-send-mode";
    const AGENT_INSPECTOR_WIDTH_KEY = "better-codex-agent-inspector-width";
    const CREATE_DIALOG_EXPANDED_KEY = "better-codex-create-dialog-expanded";
    const ISSUE_DIALOG_EXPANDED_KEY = "better-codex-issue-dialog-expanded";
    const AGENT_INSPECTOR_MIN_WIDTH = 320;
    const AGENT_DIRECTORY_MIN_WIDTH = 320;
    const THREAD_OPEN_TIMEOUT_MS = 10000;
    const THREAD_OPEN_POLL_MS = 100;
    const statusLabels = { backlog: "待规划", todo: "待办", in_progress: "进行中", in_review: "待审核", done: "已完成", blocked: "已阻塞" };
    const priorityLabels = { none: "无", low: "低", medium: "中", high: "高", urgent: "紧急" };
    const mockupRunStatusLabels = { "not-started": "未开始", claimed: "排队中", running: "工作中", completed: "已完成", failed: "执行失败", interrupted: "已停止" };
    const projectDocumentViews = [
      { key: "charter", label: "项目章程", icon: "docs" },
      { key: "product", label: "产品地图", icon: "layout" },
      { key: "architecture", label: "架构地图", icon: "server" },
      { key: "roadmap", label: "路线图", icon: "calendar" },
      { key: "work", label: "工作图", icon: "issues" },
      { key: "delivery", label: "交付图", icon: "code" },
      { key: "evidence", label: "证据与学习", icon: "shield" },
    ];
    const rememberedSurface = sessionStorage.getItem(RESUME_SURFACE_KEY);
    const rememberedProjectId = localStorage.getItem(PROJECT_KEY) || "";
    const rememberedLanguage = localStorage.getItem(LANGUAGE_KEY);
    const rememberedKeepCreate = localStorage.getItem(KEEP_CREATE_KEY) === "true";
    const rememberedAgentInspectorWidth = Number(localStorage.getItem(AGENT_INSPECTOR_WIDTH_KEY));
    const languageSetting = ["system", "zh-CN", "en"].includes(rememberedLanguage) ? rememberedLanguage : "system";
    function resolveSystemLocale(fallback) {
      const locale = String(fallback || document.documentElement.lang || navigator.language || "").trim().toLowerCase().replace(/_/g, "-");
      return ["zh-cn", "zh-hans", "zh-hans-cn"].includes(locale) ? "zh-CN" : "en";
    }
    const systemLocale = resolveSystemLocale(INITIAL_LOCALE);
    const MOCKUP_PROJECT_ID = "mockup-better-codex";
    const hasFeature = feature => ENABLED_FEATURES.has(feature);
    const availableSurfaces = ["issues", ...(SCHEDULED_AVAILABLE ? ["scheduled"] : []), "agents", ...(hasFeature("project-management") ? ["projects"] : [])];
    const initialProjectRoute = hasFeature("project-management") ? webProjectRoute() : null;
    const initialAgentRoute = webAgentRoute();
    if (HOST_KIND === "web" && !hasFeature("project-management") && /^\/web\/projects(?:\/|$)/.test(location.pathname)) history.replaceState({ betterCodex: true, betterCodexSurface: "issues" }, "", "/web");
    const initialAgentKey = initialAgentRoute?.agentKey || "";
    const state = { projects: [], projectsLoaded: false, issues: [], issuesLoaded: false, scheduledTasks: [], scheduledTasksLoaded: false, projectIssues: [], projectIssuesProjectId: "", projectDetailId: initialProjectRoute?.projectId || "", projectPage: "overview", projectDocumentView: "charter", projectDocumentPending: null, projectDocumentError: null, projectPlanningPending: null, projectPlanningError: null, agents: [], agentModelCatalog: [], agentModels: [], agentReasoningEfforts: [], user: { id: "", name: "你", email: "", handle: "", initials: "你", color: USER_AVATAR_COLORS[0], avatar: "", avatar_generated: true }, users: [], projectId: "", search: "", agentSearch: "", agentView: "all", agentPane: initialAgentKey === "new" ? "create" : initialAgentKey ? "detail" : "preview", selectedAgentId: initialAgentKey && initialAgentKey !== "new" ? initialAgentKey : "", agentDraft: initialAgentKey === "new" ? { avatar: "icon:bot" } : null, agentInspectorWidth: Number.isFinite(rememberedAgentInspectorWidth) && rememberedAgentInspectorWidth > 0 ? rememberedAgentInspectorWidth : 0, surface: initialProjectRoute ? "projects" : initialAgentRoute ? "agents" : availableSurfaces.includes(rememberedSurface) ? rememberedSurface : "issues", view: "all", autoDispatch: false, autoDispatchPending: false, schedulerModel: "gpt-5.6-sol", schedulerReasoningEffort: "high", issueDescriptionLimit: 100000, mockup: false, keepCreate: rememberedKeepCreate, selected: null, error: "", systemLocale, languageSetting, locale: languageSetting === "system" ? systemLocale : languageSetting, filters: { status: [], priority: [], date: [], assignee: [], project: [], label: [] } };
    const pendingIssueRemovals = new Map();
    const projectPlanningDrafts = new Map();
    let projectPlanningComposition = "";
    let projectRenderDeferred = null;
    let projectRenderedMarkup = "";
    function webProjectRoute() {
      if (HOST_KIND !== "web") return null;
      const match = location.pathname.match(/^\/web\/projects(?:\/([^/?#]+))?\/?$/);
      if (!match) return null;
      try {
        return { projectId: match[1] ? decodeURIComponent(match[1]) : "" };
      } catch {
        return { projectId: "" };
      }
    }

    function projectRoutePath(projectId = "") {
      return "/web/projects" + (projectId ? "/" + encodeURIComponent(projectId) : "");
    }

    function syncWebProjectRoute(projectId = "", mode = "push") {
      if (HOST_KIND !== "web" || mode === "none") return;
      const path = projectRoutePath(projectId);
      if (location.pathname === path) return;
      const routeState = { betterCodex: true, betterCodexSurface: "projects", betterCodexProjectId: projectId || "" };
      if (projectId && location.pathname === projectRoutePath()) routeState.betterCodexProjectFromHome = true;
      history[mode === "replace" ? "replaceState" : "pushState"](routeState, "", path);
    }

    function webAgentRoute() {
      if (HOST_KIND !== "web") return null;
      const match = location.pathname.match(/^\/web\/agents(?:\/([^/?#]+))?\/?$/);
      if (!match) return null;
      try {
        return { agentKey: match[1] ? decodeURIComponent(match[1]) : "" };
      } catch {
        return { agentKey: "" };
      }
    }

    function agentRoutePath(agentKey = "") {
      return "/web/agents" + (agentKey ? "/" + encodeURIComponent(agentKey) : "");
    }

    function syncWebAgentRoute(agentKey = "", mode = "push") {
      if (HOST_KIND !== "web" || mode === "none") return;
      const path = agentRoutePath(agentKey);
      if (location.pathname === path) return;
      const routeState = { betterCodex: true, betterCodexSurface: "agents", betterCodexAgentKey: agentKey || "" };
      if (agentKey && (location.pathname === agentRoutePath() || history.state?.betterCodexAgentFromList)) routeState.betterCodexAgentFromList = true;
      history[mode === "replace" ? "replaceState" : "pushState"](routeState, "", path);
    }
    function shortcutKeyFromCode(code, key) {
      const source = String(code || "");
      if (/^Key[A-Z]$/.test(source)) return source.slice(3);
      if (/^Digit[0-9]$/.test(source)) return source.slice(5);
      const names = { Space: "Space", Enter: "Enter", Tab: "Tab", Escape: "Escape", Backspace: "Backspace", Delete: "Delete", ArrowUp: "Up", ArrowDown: "Down", ArrowLeft: "Left", ArrowRight: "Right", Comma: "Comma", Period: "Period", Slash: "Slash", Backslash: "Backslash", Semicolon: "Semicolon", Quote: "Quote", BracketLeft: "BracketLeft", BracketRight: "BracketRight", Minus: "Minus", Equal: "Equal", Backquote: "Backquote", NumpadAdd: "NumpadAdd", NumpadSubtract: "NumpadSubtract", NumpadMultiply: "NumpadMultiply", NumpadDivide: "NumpadDivide", NumpadDecimal: "NumpadDecimal" };
      if (names[source]) return names[source];
      const value = String(key || "").trim();
      return value.length === 1 ? value.toUpperCase() : value.replace(/\s+/g, "");
    }
    function shortcutFromKeyboardEvent(event) {
      const key = shortcutKeyFromCode(event.code, event.key);
      if (!key || ["Meta", "Control", "Alt", "Shift"].includes(key)) return "";
      const modifiers = [];
      if (event.metaKey || event.ctrlKey) modifiers.push("Mod");
      if (event.altKey) modifiers.push("Alt");
      if (event.shiftKey) modifiers.push("Shift");
      return [...modifiers, key].join("+");
    }
    function normalizeShortcut(value) {
      const parts = String(value || "").split("+").map(part => part.trim()).filter(Boolean);
      if (!parts.length) return "";
      const key = parts.at(-1);
      if (["Meta", "Control", "Ctrl", "Command", "Cmd", "Alt", "Option", "Shift"].includes(key)) return "";
      const modifiers = [];
      if (parts.slice(0, -1).some(part => ["Mod", "Ctrl", "Control", "Command", "Cmd"].includes(part))) modifiers.push("Mod");
      if (parts.slice(0, -1).some(part => ["Alt", "Option"].includes(part))) modifiers.push("Alt");
      if (parts.slice(0, -1).includes("Shift")) modifiers.push("Shift");
      return [...modifiers, key].join("+");
    }
    function readCreateIssueShortcut() {
      return normalizeShortcut(localStorage.getItem(CREATE_ISSUE_SHORTCUT_KEY));
    }
    function readSendMode() {
      return localStorage.getItem(SEND_MODE_KEY) === "enter" ? "enter" : "mod-enter";
    }
    function isSendKeyboardEvent(event) {
      if (event.key !== "Enter" || event.isComposing || event.repeat) return false;
      if (readSendMode() === "enter") return !event.metaKey && !event.ctrlKey && !event.altKey && !event.shiftKey;
      return (event.metaKey || event.ctrlKey) && !event.altKey && !event.shiftKey;
    }
    function shortcutLabel(value) {
      const mac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent || "");
      const labels = { Mod: mac ? "⌘" : "Ctrl", Alt: mac ? "⌥" : "Alt", Shift: mac ? "⇧" : "Shift", Space: "Space", Up: "↑", Down: "↓", Left: "←", Right: "→" };
      return normalizeShortcut(value).split("+").filter(Boolean).map(part => labels[part] || part).join(mac ? " " : " + ");
    }
    function readCreateDraft() {
      try {
        const draft = JSON.parse(sessionStorage.getItem(CREATE_DRAFT_KEY) || "null");
        if (!draft || typeof draft !== "object") return null;
        return {
          mode: draft.mode === "agent" ? "agent" : "manual",
          title: String(draft.title || ""),
          description: String(draft.description || ""),
          prompt: String(draft.prompt || ""),
          promptSemanticReferences: Array.isArray(draft.promptSemanticReferences) ? draft.promptSemanticReferences.filter(reference => reference && ["skill", "app", "mention"].includes(reference.type) && typeof reference.name === "string" && typeof reference.ref === "string").slice(0, 32) : [],
          promptSemanticDocument: draft.promptSemanticDocument && typeof draft.promptSemanticDocument === "object" ? draft.promptSemanticDocument : undefined,
          attachments: Array.isArray(draft.attachments) ? draft.attachments.filter(item => item && typeof item.name === "string" && typeof item.path === "string" && item.path).slice(0, 4).map(item => ({ name: item.name, path: item.path, type: typeof item.type === "string" ? item.type : "" })) : [],
          requestId: typeof draft.requestId === "string" && draft.requestId.length <= 200 ? draft.requestId : ""
        };
      } catch {
        sessionStorage.removeItem(CREATE_DRAFT_KEY);
        return null;
      }
    }
    function writeCreateDraft(draft, requestId) {
      const cached = { mode: draft.mode, title: draft.title, description: draft.description, prompt: draft.prompt, promptSemanticReferences: draft.promptSemanticReferences, promptSemanticDocument: serializeSemanticDraft(draft.promptSemanticDocument), attachments: draft.attachments.filter(item => item.path).map(item => ({ name: item.name, path: item.path, type: item.type || "" })), requestId };
      if (![cached.title, cached.description, cached.prompt].some(value => value.trim()) && !cached.attachments.length) {
        sessionStorage.removeItem(CREATE_DRAFT_KEY);
        return;
      }
      sessionStorage.setItem(CREATE_DRAFT_KEY, JSON.stringify(cached));
    }
    function normalizeMockupIssues(value) {
      const source = Array.isArray(value) ? value : value?.issues;
      if (!Array.isArray(source)) throw new Error("展示数据格式无效");
      if (source.length > 500) throw new Error("展示卡片不能超过 500 条");
      const now = new Date().toISOString();
      return source.map((issue, index) => {
        const title = String(issue?.title || "").trim();
        if (!title) throw new Error("展示卡片缺少标题");
        if (title.length > 500 || String(issue.description || "").length > 20000) throw new Error("展示卡片内容过长");
        if (Array.isArray(issue.labels) && (issue.labels.length > 50 || issue.labels.some(label => String(label).length > 100))) throw new Error("展示卡片标签过多或过长");
        const status = Object.hasOwn(statusLabels, issue.status) ? issue.status : "backlog";
        const priority = Object.hasOwn(priorityLabels, issue.priority) ? issue.priority : "none";
        return {
          id: String(issue.id || "mockup-import-" + (index + 1)),
          identifier: String(issue.identifier || "BET-" + (index + 20)),
          project_id: MOCKUP_PROJECT_ID,
          title,
          description: String(issue.description || ""),
          status,
          priority,
          sort_order: Number.isFinite(Number(issue.sort_order)) ? Number(issue.sort_order) : (index + 1) * 1000,
          pinned: Boolean(issue.pinned),
          archived_at: null,
          thread_id: null,
          workspace_path: "",
          version: Number.isInteger(issue.version) ? issue.version : 1,
          created_at: issue.created_at || now,
          updated_at: issue.updated_at || now,
          agent_enabled: Boolean(issue.agent_enabled),
          agent_id: issue.agent_id || null,
          mockup_agent_name: String(issue.mockup_agent_name || ""),
          user_assigned: Boolean(issue.user_assigned),
          needs_attention: false,
          pending_actor: "user",
          enrichment_status: null,
          reply_draft: "",
          reply_draft_attachments: [],
          labels: Array.isArray(issue.labels) ? issue.labels.map(label => String(label)).filter(Boolean) : [],
          mockup_run_status: Object.hasOwn(mockupRunStatusLabels, issue.mockup_run_status) ? issue.mockup_run_status : "not-started",
        };
      });
    }
    async function exportMockupIssues() {
      const data = await api("/api/mockup/state");
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "better-codex-mockup.json";
      link.click();
      URL.revokeObjectURL(url);
    }
    async function importMockupIssues(file) {
      if (file.size > 16 * 1024 * 1024) throw new Error("展示数据不能超过 16 MB");
      let imported;
      try {
        imported = JSON.parse(await file.text());
      } catch {
        throw new Error("展示数据格式无效");
      }
      const data = Array.isArray(imported) || !Array.isArray(imported?.agents)
        ? { ...await api("/api/mockup/state"), version: 1, issues: normalizeMockupIssues(imported) }
        : imported;
      await api("/api/mockup/state", { method: "PUT", body: JSON.stringify(data) });
      await load();
    }
    function confirmMockupReset() {
      return confirmAction("重置展示数据", "恢复默认展示卡片和布局吗？", "重置").then(confirmed => {
        if (!confirmed) return;
        return api("/api/mockup/reset", { method: "POST" });
      }).then(result => result ? load() : undefined);
    }
    function moveMockupIssue(id, version, status, beforeId = "") {
      return api("/api/issues/" + encodeURIComponent(id) + "/move", { method: "POST", body: JSON.stringify({ version, status, before_id: beforeId }) });
    }
    const localeResources = { "zh-CN": {}, en: {
      "调度失败": "Scheduling failed",
      "重试回复": "Retry reply", "重新加载": "Reload", "回复等待超时。请检查模型服务连接后重试。": "The reply timed out. Check the model service connection and retry.", "网络连接异常，回复未完成。请检查网络和 Better Codex Runtime 后重试。": "The reply did not finish because of a network problem. Check your network and Better Codex Runtime, then retry.", "当前权限不足，无法完成回复。请调整智能体权限或允许所需操作后重试。": "The reply needs additional permission. Adjust the agent permission or allow the required action, then retry.", "Better Codex Runtime 已停止。请重新启动后重试。": "Better Codex Runtime stopped. Restart it and retry.", "上一条回复仍在进行中。请稍后重新加载。": "The previous reply is still running. Reload shortly.", "回复未完成。请打开完整会话查看详情，然后重试。": "The reply did not finish. Open the full conversation for details, then retry.", "会话加载超时。请确认 Better Codex Runtime 正在运行，然后重新加载。": "The conversation timed out while loading. Make sure Better Codex Runtime is running, then reload.", "无法加载会话。请检查网络和 Better Codex Runtime，然后重新加载。": "Unable to load the conversation. Check your network and Better Codex Runtime, then reload.", "没有权限加载会话。请调整权限后重新加载。": "You do not have permission to load the conversation. Adjust the permission, then reload.", "VPS 入口返回了 404；这表示路径或资源不存在，不能据此判断本机 Runtime 已停止。": "The VPS endpoint returned 404. The path or resource does not exist; this does not show that the local Runtime stopped.", "浏览器无法连接 VPS Relay 入口。请检查域名、网络、反向代理和 Relay 服务；本机 Runtime 状态未知。": "The browser cannot reach the VPS Relay endpoint. Check DNS, network, reverse proxy, and the Relay service. The local Runtime state is unknown.", "VPS 入口无法连接 Relay 服务。本机 Runtime 状态未知。": "The VPS endpoint cannot reach the Relay service. The local Runtime state is unknown.", "VPS Relay 当前没有连接到本机 Runtime。可能是 Runtime 停止、正在重启或网络中断。": "The VPS Relay is not connected to the local Runtime. The Runtime may be stopped or restarting, or the network may be interrupted.", "本机 Runtime 已主动断开与 VPS Relay 的连接，可能正在重启或已停止。": "The local Runtime actively disconnected from the VPS Relay. It may be restarting or stopped.", "VPS Relay 与本机 Runtime 的请求通道已中断，请等待重连后重试。": "The request channel between the VPS Relay and local Runtime was interrupted. Wait for reconnection, then retry.",
      "内容已在其他窗口更新，请重新加载后再试。": "This content changed in another window. Reload and try again.", "相关内容不存在或已被移除。": "The requested content does not exist or was removed.", "当前账号没有执行此操作的权限。": "Your account does not have permission to perform this action.", "输入内容不符合要求，请检查后重试。": "Check the entered values and try again.", "当前状态无法完成此操作，请刷新后重试。": "This action is not available in the current state. Refresh and try again.", "服务暂时不可用，请稍后重试。": "The service is temporarily unavailable. Try again shortly.", "服务返回的数据格式异常，请稍后重试。": "The service returned an invalid response. Try again shortly.", "数据完整性检查失败，操作已停止。": "The integrity check failed, so the operation was stopped.", "安全校验失败，操作已停止。": "The security check failed, so the operation was stopped.", "服务发生异常，请稍后重试。": "The service encountered an error. Try again shortly.",
      "任务看板": "Task board", "打开任务看板": "Open task board", "智能体": "Agents", "管理智能体": "Manage agents", "创建和管理你的智能体": "Create and manage your agents",
      "Better Codex 服务需要重启": "Better Codex needs to restart", "当前页面与后台服务的连接已失效。请在终端运行下面的命令，完成后重新连接。": "The connection between this page and the background service has expired. Run the command below in your terminal, then reconnect.", "复制重启命令": "Copy restart command", "复制消息": "Copy message", "已复制": "Copied", "重新连接": "Reconnect", "正在连接…": "Connecting…", "错误详情": "Error details",
      "全部": "All", "已分配": "Assigned", "未分配": "Unassigned", "待规划": "Backlog", "待办": "Todo", "进行中": "In progress", "待审核": "In review", "调度中": "Scheduling", "已完成": "Done", "已阻塞": "Blocked", "归档": "Archive", "拖到这里即可归档": "Drop here to archive", "查看已归档卡片": "View archived cards", "已归档任务": "Archived tasks", "搜索已归档任务": "Search archived tasks", "所有项目": "All projects", "全部删除": "Delete all", "删除已归档聊天": "Delete archived chat", "删除项目中的全部内容": "Delete all project content", "确定删除项目中的全部已归档任务吗？": "Delete all archived tasks in this project?", "取消归档": "Unarchive", "已归档卡片": "Archived cards", "暂无已归档卡片": "No archived cards", "归档列表加载失败": "Unable to load archived cards",
      "无": "None", "低": "Low", "中": "Medium", "高": "High", "紧急": "Urgent", "超高": "Extra high", "无优先级": "No priority", "优先级": "Priority", "状态": "Status", "日期": "Date", "筛选": "Filter", "标签": "Labels",
      "新建": "New", "新建 issue": "New issue", "新建任务": "New task", "新建智能体": "New agent", "创建": "Create", "创建任务": "Create task", "删除": "Delete", "删除任务": "Delete task", "删除智能体": "Delete agent", "保存": "Save", "确认": "Confirm", "取消": "Cancel", "关闭": "Close", "返回": "Back", "重试": "Retry", "稍后": "Later", "展开": "Expand", "全屏": "Full screen", "缩小": "Minimize", "退出全屏": "Exit full screen", "缩放头像": "Zoom avatar",
      "项目": "Project", "无项目": "No project", "选择项目": "Select project", "选择责任人": "Select owner", "选择执行智能体": "Select agent", "更多创建选项": "More creation options", "任务标题": "Task title", "添加描述...": "Add description...", "添加标签": "Add label", "添加附件": "Add attachment", "移除附件": "Remove attachment", "搜索任务": "Search tasks", "搜索项目": "Search projects", "搜索项目...": "Search projects...", "搜索智能体": "Search agents",
      "负责人": "Owner", "创建者": "Creator", "指定负责人": "Assign owner", "由我创建": "Created by me", "由我": "By me", "我": "Me", "你": "You", "未指派": "Not assigned", "未提供": "Not provided", "已同步": "Synced",
      "自动运行": "Auto-run", "手动运行": "Manual run", "切换为自动运行": "Switch to auto-run", "切换为手动运行": "Switch to manual run", "切换到智能体": "Switch to agents", "手动创建": "Manual creation", "通过智能体创建": "Create with agent", "运行模式说明": "Run mode", "帮助与设置": "Help and settings", "设置": "Settings", "快捷键": "Shortcuts", "快捷键设置": "Keyboard shortcuts", "为常用操作设置键盘快捷键。": "Set keyboard shortcuts for common actions.", "创建 Issue": "Create Issue", "打开创建 Issue 窗口": "Open the Create Issue window", "设置快捷键": "Set shortcut", "点击录入": "Click to record", "按下新的快捷键": "Press a new shortcut", "未设置": "Not set", "清除快捷键": "Clear shortcut", "关于": "About", "会话结束提醒": "Session completion alerts", "Issue 会话结束后在当前窗口显示提醒": "Show an alert in the current window when an issue session ends", "弹窗持续时间": "Popup duration", "1 秒": "1 second", "5 秒": "5 seconds", "10 秒": "10 seconds", "永久": "Permanent", "会话已结束": "Session ended", "通知": "Notifications", "个人资料": "Profile", "编辑个人资料": "Edit profile", "昵称和头像只用于 WebUI 协作": "Your name and avatar are used for WebUI collaboration", "昵称": "Display name", "更换头像": "Change avatar", "选择颜色": "Choose color", "蓝色": "Blue", "紫色": "Purple", "青色": "Teal", "绿色": "Green", "青柠色": "Lime", "琥珀色": "Amber", "橙色": "Orange", "粉色": "Pink", "资料已保存": "Profile saved", "语言": "Language", "界面语言": "Interface language", "选择 Better Codex 的界面语言": "Choose the language used by Better Codex", "调度": "Scheduling", "调度器模型": "Scheduler model", "这个模型用于 Issue 状态调度": "This model is used for Issue status routing", "调度器思考强度": "Scheduler reasoning effort", "这个强度用于 Issue 状态调度": "This level is used for Issue status routing", "跟随系统": "System", "中文": "Chinese", "软件更新": "Software updates", "更新状态": "Update status", "检查新版本": "Check for updates", "检查中…": "Checking…", "发现新版本": "Update available", "无法检查更新": "Unable to check", "版本信息": "Version info", "兼容版本": "Compatibility version", "运行状态": "Runtime status", "运行正常": "Running", "正在检查": "Checking", "已是最新版本": "Up to date", "从开始到完成，让 Codex 里的工作清晰可见。": "From start to finish, keep your work in Codex clear and visible.", "如果你喜欢 Better Codex，欢迎给我们一个 Star。": "If you like Better Codex, please give us a Star.", "最大并发": "Max concurrency", "模型": "Model", "推理": "Reasoning", "Fast": "Fast", "更快响应，增加用量": "Faster responses with increased usage", "指令": "Instructions", "默认": "Default", "自定义": "Custom",
      "点击": "Click", "，或者在已完成的会话卡片中": ", or use", "新消息，智能体才会执行任务。": "to post a new message in a completed conversation card. Only then will the agent run the task.", "会主动执行分配给自己的任务，但是不会执行": "automatically runs tasks assigned to it, but does not run", "区域的任务。": "tasks.",
      "代码审查": "Code review", "问题排查": "Troubleshooting", "前端实现": "Frontend implementation", "文档写作": "Documentation", "创意探索": "Creative exploration", "终端工程": "Terminal engineering", "通用助手": "General assistant", "修复工具": "Fixer", "安全审查": "Security review", "测试验证": "Test verification", "插件": "Plugins", "数据与存储": "Data and storage", "检查改动的正确性、回归风险和可维护性": "Review changes for correctness, regression risk, and maintainability", "负责 Codex 原生风格的界面实现与视觉验证": "Build and visually verify interfaces in the native Codex style", "定位崩溃、回归和异常行为的根因": "Find the root cause of crashes, regressions, and unexpected behavior",
      "通用任务处理": "General task handling", "代码实现": "Code implementation", "最大": "Maximum", "极致": "Ultra", "发送": "Send", "副本": "Copy", "复制卡片": "Copy card", "更多操作": "More actions", "本次启动关闭": "Disable for this launch", "正在重启 Better Codex": "Restarting Better Codex", "正在下载并校验新版本，请保持 Codex 打开。": "Downloading and verifying the update. Keep Codex open.", "正在重启 Better Codex Runtime，稍后会自动恢复。": "Restarting Better Codex Runtime. It will recover shortly.", "Better Codex 已恢复到上一版本。": "Better Codex has been restored to the previous version.",
      "展示模式": "Mockup mode", "导出展示数据": "Export mockup data", "导入展示数据": "Import mockup data", "重置展示数据": "Reset mockup data", "重置布局": "Reset layout", "重置": "Reset", "恢复默认展示卡片和布局吗？": "Restore the default mockup cards and layout?", "展示数据不能超过 16 MB": "Mockup data cannot exceed 16 MB", "展示数据格式无效": "The mockup data format is invalid", "展示卡片缺少标题": "A mockup card is missing a title", "展示模式不支持此操作": "This action is not supported in mockup mode", "展示模式不会运行真实任务": "Mockup mode does not run real tasks", "任务不存在": "Task not found",
      "修复任务卡片拖拽错位": "Fix task card drag misalignment", "复现缩放状态下的卡片拖拽偏移，并修正坐标计算与落点反馈。": "Reproduce card drag offset while zoomed, then correct the coordinate calculation and drop feedback.", "重写首页首屏价值主张": "Rewrite the homepage value proposition", "提炼 Better Codex 的核心价值，让新访客快速理解产品用途。": "Clarify Better Codex's core value so new visitors quickly understand what it does.", "调研独立开发者工作流": "Research indie developer workflows", "整理从想法到交付的常见流程、主要痛点和决策节点。": "Document common flows, key pain points, and decision points from idea to delivery.", "整理本地安装步骤": "Organize local installation steps", "核对安装、启动与常见异常处理步骤，统一文档表达。": "Verify installation, startup, and common troubleshooting steps, then unify the documentation.", "优化首次启动加载速度": "Improve first-launch loading speed", "定位启动阶段主要耗时，缩短进入任务看板前的等待时间。": "Identify the main startup costs and shorten the wait before the task board opens.", "整理功能亮点短文案": "Write concise feature highlights", "为任务分派、会话协作和代码审核分别撰写简洁说明。": "Write concise descriptions for task assignment, conversation collaboration, and code review.", "对比三款任务看板体验": "Compare three task board experiences", "对比 Linear、Notion 和 Trello 的卡片密度、拖拽与筛选体验。": "Compare card density, drag and drop, and filtering in Linear, Notion, and Trello.", "撰写产品发布介绍": "Write a product launch introduction", "围绕目标用户、核心问题和使用方式准备公开发布稿。": "Prepare launch copy around target users, the core problem, and how the product is used.", "完善会话回复失败提示": "Improve failed reply messages", "梳理超时、网络异常和权限问题的提示文案与重试入口。": "Refine messages and retry paths for timeouts, network failures, and permission issues.", "优化空状态引导语": "Improve empty-state guidance", "重写空看板与空会话的标题、说明和首个行动提示。": "Rewrite the title, explanation, and first action prompt for empty boards and conversations.", "收集首批用户常见问题": "Collect early user FAQs", "汇总安装、任务分派、运行状态和数据存储相关问题。": "Compile questions about installation, task assignment, runtime status, and data storage.", "准备更新日志发布稿": "Prepare release notes", "整理本次新增、修复和已知限制，形成可直接发布的更新日志。": "Organize this release's additions, fixes, and known limitations into publish-ready notes.", "统一看板筛选状态": "Unify task board filter state", "检查筛选逻辑与顶部计数，确保切换后卡片结果同步更新。": "Check filter logic and the top count so card results update together after a change.", "检查 Windows 安装流程": "Check the Windows installation flow", "核对安装、启动、权限与卸载流程，记录关键异常。": "Verify installation, startup, permissions, and uninstall flows, and record key issues.", "起草用户访谈邀请信": "Draft a user interview invitation", "说明访谈目的、所需时间和隐私边界，给出清晰回复方式。": "Explain the interview purpose, time needed, and privacy boundaries, with a clear way to reply.", "归档版本发布资料": "Archive release materials", "整理版本说明、截图、校验结果和发布链接，方便后续复盘。": "Organize release notes, screenshots, verification results, and launch links for later review.", "性能": "Performance", "文案": "Copywriting", "调研": "Research", "文档": "Documentation", "写作": "Writing",
      "选择头像": "Choose avatar", "预设头像": "Preset avatars",  "更换": "Change", "保存失败": "Save failed", "正在自动保存…": "Saving…", "已自动保存": "Saved automatically", "创建失败": "Creation failed", "加载失败": "Loading failed", "启动失败": "Start failed", "发送失败": "Send failed", "回复失败": "Reply failed", "回复": "Reply", "回复中": "Replying", "回复完成": "Reply completed", "回复进行中…": "Replying…", "回复已完成": "Reply completed", "等待对话": "Waiting for conversation", "加载中…": "Loading…", "正在加载任务看板": "Loading task board", "加载对话…": "Loading conversation…", "正在打开…": "Opening…", "在此回复智能体…": "Reply to the agent here…", "对话": "Conversation", "详情": "Details", "关闭详情": "Close details", "Issue 详情": "Issue details", "名称": "Name", "介绍": "Description", "智能体名称": "Agent name", "尚未添加介绍": "No description yet", "没有匹配的智能体": "No matching agents", "此分类暂无智能体": "No agents in this category",
      "裁剪头像": "Crop avatar", "拖动图片调整位置": "Drag the image to adjust its position", "正在更新": "Updating", "正在更新 Better Codex": "Updating Better Codex", "更新完成": "Update complete", "更新未完成": "Update incomplete", "稍后提醒": "Remind me later", "Better Codex 有新版本": "A new Better Codex version is available", "Better Codex 已是最新版本": "Better Codex is up to date", "Better Codex 保持当前版本运行。": "Better Codex will continue running on the current version.", "正在下载并校验新版本，请不要关闭 Codex。": "Downloading and verifying the update. Please do not close Codex.", "正在重启 Codex，稍后会自动恢复。": "Restarting Codex. It will resume shortly.", "刚刚完成检查，无需更新。": "Just checked. No update is needed.", "任务已完成": "Task completed", "知道了": "Got it",  "附带文件：": "Attached files:", "部分文件无法读取本地路径，已跳过": "Some files could not be read locally and were skipped", "当前环境无法读取本地文件路径": "The current environment cannot read local file paths", "无关联对话。": "No linked conversation.", "暂无对话，可在下方回复或打开完整对话。": "No conversation yet. Reply below or open the full conversation.", "图片不能超过 10 MB": "Images must be 10 MB or smaller", "请选择 PNG、JPEG 或 WebP 图片": "Choose a PNG, JPEG or WebP image", "无法读取这张图片": "Unable to read this image", "创建智能体 Issue 需要本地工作区：请先打开该项目下的一个 Codex 会话": "Creating an agent issue requires a local workspace. Open a Codex conversation in this project first.",
      "粘贴的图片": "Pasted image", "图片保存失败": "Unable to save the image",
       "添加描述": "Add description", "展开描述": "Show more", "收起描述": "Show less",
      "对话链接无效。": "The conversation link is invalid.", "对话仍在加载，请稍后重试。": "The conversation is still loading. Try again shortly.", "任务正在执行，请先等待完成。": "The task is still running. Wait for it to finish first.", "任务仍在整理中，请稍后再编辑。": "The task is still being organized. Try editing it again shortly.", "当前为手动运行，请先点击“立即开始任务”。": "Manual run is enabled. Click “Start task now” first.", "待规划中的 Issue 不会自动触发任务，请先移出待规划区。": "Issues in Backlog do not trigger tasks automatically. Move it out of Backlog first.", "当前没有运行中的任务": "No agents are currently working", "查看运行中的任务": "View running tasks", "暂无任务": "No tasks",      "手动运行时，只有点击“立即开始任务”才会触发智能体任务。": "In manual mode, agent tasks start only after you click “Start task now”.", "自动运行时，只要 Issue 不在「待规划」区，你发送的新消息都会触发任务；「待规划」里的 Issue 不会自动触发。": "In auto-run mode, new messages trigger tasks unless the Issue is in Backlog; Issues in Backlog do not trigger tasks automatically.", "未关联对话。": "No linked conversation.",
      "确定删除任务 “": "Delete task “", "确定删除所有已归档任务吗？": "Delete all archived tasks?", "吗？": "”?", "创建后先由 ": "After creation, ", " 整理卡片，再自动开始工作。": " will organize the card and start working automatically.", "刚刚": "Just now", "分钟": "minutes", "小时": "hours", "天": "days", "更新于": "Updated", "个筛选": "filters", "个智能体工作中": "agents working", "条": "items",
       "最近 24 小时": "Last 24 hours", "最近 7 天": "Last 7 days", "最近 30 天": "Last 30 days", "暂无可选项": "No options available", "清除筛选": "Clear filters", "复制本地 workdir 路径": "Copy local workdir path",
      "工作中": "Working", "排队中": "Queued", "理解中": "Thinking", "执行失败": "Execution failed", "已停止": "Stopped", "未开始": "Not started", "无法连接 Better Codex Runtime": "Unable to connect to Better Codex Runtime",
      "在会话中打开": "Open in conversation", "前往会话": "Open conversation", "请前往会话继续对话": "Continue in the conversation", "任务正在进行中": "Task is running", "立即开始任务": "Start task now", "切换到手动": "Switch to manual", "继续创建": "Keep creating", "指派给": "Assign to", "可选": "Optional", "建议": "Suggestions", "开始对话": "Start the conversation", "补充下一步要求，智能体会继续处理。": "Add your next request and the agent will continue.", "在下方输入消息并发送": "Type a message below and send it", "正在处理任务": "Working on the task", "智能体回复产生后会显示在这里。": "The agent's response will appear here when available.", "请稍候": "Please wait", "输入下一步要求…": "Enter your next request…", "调整侧边栏宽度": "Resize sidebar",
      "头像": "Avatar", "上传图片": "Upload image", "使用此头像": "Use this avatar", "点击选择预设图标，或上传图片": "Choose a preset icon or upload an image", "从预设图标中选择，也可以上传图片": "Choose a preset icon or upload an image", "创建智能体": "Create agent", "Codex 默认智能体": "Default Codex agent", "说明这个智能体适合承担什么工作": "Describe what this agent is good at", "定义职责、工作方式和输出要求": "Define responsibilities, workflow, and output requirements", "权限": "Permissions", "只读": "Read-only", "工作区可写": "Workspace write access", "完全访问": "Full access", "仅可读取工作区文件，不能修改": "Can read workspace files but cannot modify them", "可修改当前工作区内的文件": "Can modify files in the current workspace", "可不受限制地访问互联网和电脑上的任何文件": "Unrestricted access to the internet and files on this computer",
      "已经执行过对话的 Issue 只能修改状态、优先级和指派人。": "Issues with an executed conversation can only change status, priority, and assignee.", "终止任务后才能打开对话，是否终止任务？": "The task must be stopped before opening the conversation. Stop it now?", "终止并打开": "Stop and open", "正在终止…": "Stopping…", "升级会中断正在执行的任务": "Updating will interrupt running tasks", "仍要升级吗？正在执行的任务会被立即中断，未完成的工作可能丢失。": "Update anyway? Running tasks will be interrupted immediately, and unfinished work may be lost.", "仍要升级": "Update anyway", "忽略当前版本": "Ignore this version", "立即更新": "Update now", "暂无项目": "No projects", "告诉智能体要做什么，例如：“修复项目里任务运行状态不可见的问题”": "Tell the agent what to do, for example: “Fix the invisible task run status in the project”"
    } };
    localeResources.en["创建新项目"] = "Create new project";
    localeResources.en["浏览本机文件夹"] = "Browse folders on this device";
    localeResources.en["更改文件夹"] = "Change folder";
    localeResources.en["目录路径"] = "Folder path";
    localeResources.en["上一级"] = "Up one level";
    localeResources.en["主目录"] = "Home";
    localeResources.en["文件系统"] = "File system";
    localeResources.en["打开文件夹"] = "Open folder";
    localeResources.en["显示隐藏目录"] = "Show hidden folders";
    localeResources.en["不显示隐藏目录"] = "Hide hidden folders";
    localeResources.en["新建文件夹"] = "New folder";
    localeResources.en["文件夹名称"] = "Folder name";
    localeResources.en["请输入文件夹名称"] = "Enter a folder name";
    localeResources.en["正在创建…"] = "Creating…";
    localeResources.en["文件夹已存在"] = "A folder with this name already exists";
    localeResources.en["文件夹名称无效"] = "The folder name is invalid";
    localeResources.en["无法创建文件夹"] = "Unable to create the folder";
    localeResources.en["正在读取文件夹…"] = "Loading folders…";
    localeResources.en["这个文件夹中没有子文件夹"] = "This folder has no subfolders";
    localeResources.en["隐藏目录已屏蔽"] = "Hidden folders are hidden";
    localeResources.en["仅显示前 500 个文件夹"] = "Showing the first 500 folders";
    localeResources.en["无法读取文件夹"] = "Unable to read this folder";
    localeResources.en["本机 Runtime 版本不支持远程文件夹浏览"] = "The local Runtime does not support remote folder browsing";
    localeResources.en["文件不能超过 10 MB"] = "Files must be 10 MB or smaller";
    localeResources.en["部分文件超过 10 MB，已跳过"] = "Some files larger than 10 MB were skipped";
    localeResources.en["最多传输 4 个文件且总大小不能超过 20 MB"] = "Transfer up to 4 files with a total size of 20 MB or less";
    localeResources.en["部分文件超出传输限制，已跳过"] = "Some files exceeded the transfer limits and were skipped";
    localeResources.en["无法读取文件"] = "Unable to read the file";
    Object.assign(localeResources.en, {
      "附件预览": "Attachment preview",
      "附件": "Attachment",
      "打开附件": "Open attachment",
      "下载附件": "Download attachment",
      "正在加载附件…": "Loading attachment…",
      "无法打开附件": "Unable to open attachment",
      "不支持预览此文件，可下载后查看。": "Preview is unavailable for this file. Download it to view the contents.",
      "图片": "Image",
      "PDF 文档": "PDF document",
      "文本文档": "Text document",
      "文件": "File",
      "原始链接": "Original link",
    });
    localeResources.en["源码开发版"] = "Source development build";
    localeResources.en["发现兼容更新"] = "Compatibility update available";
    localeResources.en["源码开发版仅检查兼容层更新，核心版本请更新源码并重新构建。"] = "Source builds only check for compatibility updates. Update the source and rebuild to change the core version.";
    Object.assign(localeResources.en, {
      "远程访问": "Remote access",
      "从浏览器安全访问你的任务看板": "Access your task board securely from a browser",
      "部署 Hub": "Deploy Hub",
      "复制提示词，交给能访问 VPS 的 Codex": "Copy the prompt for Codex with VPS access",
      "复制安装提示词": "Copy install prompt",
      "提示词已复制": "Prompt copied",
      "连接 Hub": "Connect Hub",
      "输入 VPS 部署后的 HTTPS 地址": "Enter the HTTPS URL of the VPS deployment",
      "访问地址": "Access URL",
      "复制连接指令": "Copy connect command",
      "服务在线": "Online",
      "无法访问": "Unavailable",
      "服务版本": "Service version",
      "检查升级": "Check for update",
      "升级": "Upgrade",
      "最新": "Current",
      "同步协议": "Sync protocol",
      "最后同步": "Last sync",
      "尚未同步": "Not synced yet",
      "刷新状态": "Refresh status",
      "指令已复制": "Command copied",
      "状态检查失败": "Status check failed",
      "部署在 VPS": "Deployed on VPS",
      "检测中": "Checking",
      "登录设备": "Signed-in devices",
      "管理已登录 Better Codex Relay 的浏览器": "Manage browsers signed in to Better Codex Relay",
      "正在读取登录设备…": "Loading signed-in devices…",
      "暂无登录设备": "No signed-in devices",
      "最近活动": "Last active",
      "已记住": "Remembered",
      "临时会话": "Temporary session",
      "退出登录": "Sign out",
      "此设备需要重新输入账户密码才能访问。": "This device will need the account password to sign in again.",
      "设备读取失败": "Unable to load devices",
      "台设备": " devices",
      "升级状态": "Update status",
      "正在检查更新": "Checking for updates",
      "升级请求已提交": "Update request submitted",
      "正在准备升级": "Preparing update",
      "正在验证发布版本": "Verifying release",
      "正在备份服务数据": "Backing up service data",
      "正在下载升级版本": "Downloading update",
      "正在重新构建服务": "Rebuilding service",
      "正在重启远程服务": "Restarting remote service",
      "正在验证服务状态": "Verifying service health",
      "远程服务升级完成": "Remote service updated",
      "发现可用升级": "Update available",
      "正在升级": "Updating",
    });
    localeResources.en["有任务正在运行，请等待任务结束后再更新。"] = "A task is running. Wait for it to finish before updating.";
    localeResources.en["更新正在进行中，请稍候。"] = "An update is already in progress. Please wait.";
    localeResources.en["当前部署尚未启用在线升级。"] = "Online updates are not enabled for this deployment.";
    localeResources.en["远程服务升级完成。"] = "The remote service update is complete.";
    localeResources.en["远程服务正在重启，页面稍后会自动恢复。"] = "The remote service is restarting. This page will reconnect automatically.";
    localeResources.en["正在备份并升级远程服务，请不要关闭页面。"] = "Backing up and updating the remote service. Keep this page open.";
    localeResources.en["下载的更新版本与发布版本不一致，请稍后重试。"] = "The downloaded version does not match the release. Try again later.";
    localeResources.en["更新包验证失败，已保留当前版本。"] = "The update package could not be verified. The current version was kept.";
    localeResources.en["同步中"] = "Syncing";
    localeResources.en["同步冲突"] = "Sync conflict";
    localeResources.en["更新后的版本验证失败，已恢复到上一版本。"] = "The updated version could not be verified. The previous version was restored.";
    localeResources.en["Better Codex 重启超时，已恢复到上一版本。"] = "Better Codex took too long to restart. The previous version was restored.";
    localeResources.en["无法下载更新，请检查网络后重试。"] = "The update could not be downloaded. Check your network and try again.";
    localeResources.en["更新包安全校验失败，已保留当前版本。"] = "The update failed its security check. The current version was kept.";
    localeResources.en["更新进程意外中断，已恢复到上一版本。"] = "The update was interrupted. The previous version was restored.";
    localeResources.en["更新失败，请稍后重试。"] = "The update failed. Try again later.";
    localeResources.en["Codex 会话连接失败"] = "Codex connection failed";
    localeResources.en["原生会话正在创建，请稍后重试。"] = "The native conversation is being created. Try again shortly.";
    localeResources.en["停止任务"] = "Stop task";
    localeResources.en["重新生成标题"] = "Regenerate title";
    localeResources.en["标题生成中"] = "Regenerating title";
    localeResources.en["标题生成失败"] = "Title generation failed";
    localeResources.en["加入队列"] = "Queue message";
    localeResources.en["队列中 {{count}} 条消息"] = "{{count}} queued messages";
    localeResources.en["立即发送"] = "Send now";
    localeResources.en["编辑队列消息"] = "Edit queued message";
    localeResources.en["删除队列消息"] = "Delete queued message";
    localeResources.en["保存修改"] = "Save changes";
    localeResources.en["取消编辑"] = "Cancel editing";
    localeResources.en["当前任务已结束，消息会按队列顺序发送。"] = "The current task has finished. This message will be sent in queue order.";
    localeResources.en["该队列消息已发生变化，请重新加载。"] = "This queued message has changed. Reload the conversation.";
    localeResources.en["队列操作失败，请重试。"] = "The queue action failed. Try again.";
    localeResources.en["正在停止…"] = "Stopping…";
    localeResources.en["未命名任务"] = "Untitled issue";
    localeResources.en["无法确定会话所属项目。请先把会话放入一个项目。"] = "We couldn't determine this conversation's project. Move it into a project first.";
    localeResources.en["该会话对应的 Issue 已归档，请先取消归档。"] = "The issue linked to this conversation is archived. Restore it first.";
    localeResources.en["发送方式"] = "Send with";
    localeResources.en["发送消息"] = "Send messages";
    localeResources.en["选择消息输入框的发送按键"] = "Choose the key used to send from message fields";
    localeResources.en["横向滚动任务看板"] = "Scroll the task board horizontally";
    Object.assign(localeResources.en, {
      "项目文档": "Project documentation",
      "项目章程": "Charter",
      "产品地图": "Product map",
      "架构地图": "Architecture map",
      "路线图": "Roadmap",
      "工作图": "Work graph",
      "交付图": "Delivery graph",
      "证据与学习": "Evidence and learning",
      "生成完整文档": "Generate documentation",
      "重新生成全部": "Regenerate all",
      "生成智能体": "Generation agent",
      "使用默认智能体": "Use default agent",
      "修改意见": "Revision feedback",
      "告诉智能体哪些内容需要修正、补充或重新组织": "Tell the agent what to correct, add, or reorganize",
      "已完成 {done}/7 个视图": "{done} of 7 views complete",
      "正在生成 {view}": "Generating {view}",
      "等待生成": "Waiting to generate",
      "已生成": "Generated",
      "生成失败": "Generation failed",
      "生成任务已提交，等待运行端接收。": "The generation task was submitted and is waiting for the runtime.",
      "生成中…": "Generating…",
      "项目文档生成超时，请重试。": "Project documentation generation timed out. Try again.",
      "运行端未及时响应，请确认 Better Codex 在线后重试。": "The runtime did not respond in time. Confirm Better Codex is online and try again.",
      "项目文件夹不可用，无法生成文档。": "The project folder is unavailable, so documentation cannot be generated.",
      "项目文档生成未能完成，请重试。": "Project documentation could not be completed. Try again.",
      "当前显示上一版本，新的内容正在生成。": "Showing the previous version while new content is generated.",
      "这个视图正在形成": "This view is taking shape",
      "代码、Issue 与会话证据正在被整理为结构化文档。": "Code, issue, and conversation evidence is being organized into structured documentation.",
      "尚未生成这个视图": "This view has not been generated yet",
      "选择智能体后生成七个相互关联的项目视图。": "Choose an agent to generate seven connected project views.",
      "该视图生成失败，重新生成时可附上修改意见。": "This view failed to generate. Add feedback when regenerating.",
      "视图关系": "View relationships",
    });
    Object.assign(localeResources.en, {
      "项目管理": "Projects",
      "管理项目": "Manage projects",
      "更多": "More",
      "更多功能": "More features",
      "Codex 额度": "Codex usage",
      "查看 Codex 额度": "View Codex usage",
      "切换为深色主题": "Switch to dark theme",
      "切换为浅色主题": "Switch to light theme",
      "创建项目": "Create project",
      "删除项目": "Delete project",
      "项目、任务与规划会从 Better Codex 和 Codex 清单移除，磁盘文件夹和文件会保留。": "The project, tasks, and planning will be removed from Better Codex and the Codex list. The folder and files on disk will remain.",
      "项目正在运行或生成内容，请等待完成后再删除。": "The project has running work or generated content in progress. Wait for it to finish before deleting the project.",
      "Codex 项目清单无法读取，未删除任何内容。": "The Codex project list could not be read. Nothing was deleted.",
      "Codex 项目清单中找不到这个项目，未删除任何内容。": "This project was not found in the Codex project list. Nothing was deleted.",
      "项目删除失败，Codex 项目清单也未能自动恢复，请立即检查 Codex 项目列表。": "Project deletion failed, and the Codex project list could not be restored automatically. Check the Codex project list now.",
      "项目名称": "Project name",
      "项目文件夹": "Project folder",
      "选择文件夹": "Choose folder",
      "选择本地项目文件夹": "Choose a local project folder",
      "正在选择…": "Choosing…",
      "返回项目列表": "Back to projects",
      "最近 Issue 与对话": "Recent issues and conversations",
      "正在加载最近 Issue": "Loading recent issues",
      "项目介绍": "Project overview",
      "重新生成": "Regenerate",
      "生成项目介绍": "Generate overview",
      "正在读取项目代码和会话…": "Reading project code and conversations…",
      "尚未生成项目介绍": "No project overview yet",
      "项目介绍生成失败，可重新生成。": "The overview could not be generated. Try again.",
      "创建后会加入 Codex 的项目列表。": "The project will be added to Codex.",
      "创建项目后，它会出现在 Codex 的项目列表中。": "Create a project to add it to Codex.",
      "暂无关联 Issue": "No linked issues",
      "已归档": "Archived",
      "打开 Issue 详情": "Open issue details",
      "取消归档后继续对话": "Unarchive to continue the conversation",
      "项目概况": "Project summary",
      "个项目": "projects",
      "个文件夹": "folders",
      "创建 Codex 项目": "Create Codex project",
      "无法选择文件夹": "Unable to choose a folder",
      "新建工作项": "New work item",
      "有风险": "At risk",
      "需关注": "Needs attention",
      "进展正常": "On track",
      "探索": "Explore",
      "计划": "Plan",
      "开发": "Build",
      "验证": "Validate",
      "交付": "Deliver",
      "下一版本": "Next version",
      "稳定版本": "Stable release",
      "今天": "Today",
      "你": "You",
      "未指派": "Unassigned",
      "正在加载当前工作": "Loading current work",
      "当前没有进行中的工作": "No work is currently in progress",
      "正在加载待处理事项": "Loading attention items",
      "需解阻": "Unblock",
      "需复核": "Review",
      "需处理": "Action needed",
      "没有需要你处理的事项": "Nothing needs your attention",
      "项目负责人": "Project owner",
      "待命": "Standing by",
      "未提供项目文件夹": "No project folder",
      "项目协作者": "Project collaborators",
      "项目页面": "Project pages",
      "概览": "Overview",
      "工作": "Work",
      "项目说明": "Project brief",
      "当前状态": "Current status",
      "进行中": "In progress",
      "待复核": "Awaiting review",
      "阻塞": "Blocked",
      "当前版本": "Current version",
      "下一里程碑": "Next milestone",
      "当前阶段": "Current phase",
      "版本计划与里程碑": "Release plan and milestones",
      "已发布": "Released",
      "当前安装": "Installed",
      "版本收口": "Release hardening",
      "稳定交付": "Stable delivery",
      "当前安装版本": "Currently installed",
      "预计": "Estimated",
      "当前工作": "Current work",
      "等你处理": "Needs your attention",
      "活跃协作者": "Active collaborators",

      "规划": "Planning",

      "项目规划": "Project plan",
      "规划对话": "Planning conversation",
      "与智能体对话，把目标、里程碑、风险和交付证据整理成可执行计划。": "Talk with an agent to turn goals, milestones, risks, and delivery evidence into an actionable plan.",
      "规划摘要": "Plan summary",
      "里程碑时间线": "Milestone timeline",
      "按目标日期排序": "Ordered by target date",
      "日期待定": "Date pending",
      "已排期": "scheduled",
      "预期成果": "Outcomes",
      "里程碑": "Milestones",
      "工作流": "Workstreams",
      "风险": "Risks",
      "决策": "Decisions",
      "待确认": "Open questions",
      "交付路径": "Delivery",
      "证据": "Evidence",
      "尚未生成项目计划": "No project plan yet",
      "从一个问题开始，智能体会读取代码、Issue 和关联会话。": "Start with a question. The agent will read the code, issues, and linked conversations.",
      "梳理这个项目的目标、范围和非目标": "Clarify this project's goals, scope, and non-goals",
      "根据当前代码和 Issue 生成下一阶段计划": "Create the next-stage plan from the current code and issues",
      "找出当前最大的风险、依赖和待确认问题": "Find the biggest risks, dependencies, and open questions",
      "询问项目规划…": "Ask about the project plan…",
      "新对话": "New conversation",
      "开始新规划对话": "Start a new planning conversation",
      "这会清除当前规划对话和计划版本。": "This clears the current planning conversation and plan revisions.",
      "规划中…": "Planning…",
      "计划版本": "Plan revision",
      "暂无明确日期": "No target date",
      "依赖": "Dependencies",
      "用户确认": "User confirmed",
      "智能体推断": "Agent inference",
      "代码事实": "Code fact",
      "Issue 事实": "Issue fact",
      "会话事实": "Conversation fact",
      "用户输入": "User input",
      "建议": "Proposed",
      "已确认": "Confirmed",

      "计划生成失败，当前仍显示上一版本。": "Plan generation failed. The previous revision is still shown.",
      "规划会话正在运行，请等待完成。": "The planning conversation is running. Wait for it to finish.",
      "规划会话未能完成，请重试。": "The planning conversation could not be completed. Try again.",
      "项目事实": "Project facts",
      "计划内容来自规划对话，不会自动修改 Issue。": "Plan content comes from the planning conversation and does not automatically change issues.",
    });
    Object.assign(localeResources.en, {
      "错误报告": "Error report",
      "发生了一个错误": "An error occurred",
      "错误信息、请求信息和直接相关日志已保留，可直接复制给开发者。": "The error, request details, and directly related logs are ready to copy.",
      "上一条": "Previous",
      "下一条": "Next",
      "复制当前错误": "Copy current error",
      "复制全部错误": "Copy all errors",
      "移除当前错误": "Remove current error",
      "复制失败": "Copy failed",
      "列表数据暂时无法读取，请稍后重试。": "List data is temporarily unavailable. Try again shortly.",
      "任务内容超过长度限制，请缩短内容或作为附件上传。": "The task content is too long. Shorten it or upload it as an attachment.",
      "网络连接不稳定，正在等待恢复。": "The network connection is unstable. Waiting to reconnect.",
    });
    Object.assign(localeResources["zh-CN"], {
      invalid_scheduled_task_name: "请输入定时任务名称",
      invalid_scheduled_task_prompt: "请输入任务内容",
      invalid_scheduled_task_time: "请选择有效的执行时间",
      invalid_scheduled_task_interval: "请输入有效的循环间隔",
      invalid_scheduled_task_repeat: "循环状态无效",
      invalid_scheduled_task_enabled: "启用状态无效",
      scheduled_task_not_found: "定时任务不存在",
      scheduled_task_running: "这个任务已有一次执行正在进行",
      scheduled_task_creation_failed: "智能体未能创建定时任务，请重试",
      scheduled_task_creation_timeout: "智能体创建超时，请重试",
      scheduled_task_creation_invalid_output: "智能体返回的定时任务格式无效，请重试",
      workspace_invalid: "项目文件夹不可用",
    });
    Object.assign(localeResources.en, {
      "定时任务": "Scheduled",
      "管理定时任务": "Manage scheduled tasks",
      "新建定时任务": "New scheduled task",
      "编辑定时任务": "Edit scheduled task",
      "告诉智能体你想如何安排任务": "Tell the agent what to do and when",
      "例如：每天上午 9 点整理这个项目昨天的进展和今天的待办": "For example: Every day at 9 AM, summarize yesterday's progress and today's tasks",
      "智能体创建中…": "Agent is creating…",
      "保存中…": "Saving…",
      "创建中…": "Creating…",
      "正在加载定时任务": "Loading scheduled tasks",
      "还没有定时任务": "No scheduled tasks yet",
      "设置执行时间和循环间隔，Better Codex 会按计划创建任务并交给智能体执行。": "Choose a start time and recurrence. Better Codex will create a task and hand it to an agent on schedule.",
      "按计划创建独立任务并交给智能体执行": "Create an independent task on schedule and hand it to an agent",
      "例如：每天整理项目进展": "For example: Summarize project progress every day",
      "任务内容": "Task instructions",
      "说明每次需要完成的具体任务": "Describe exactly what each run should complete",
      "执行智能体": "Agent",
      "默认智能体": "Default agent",
      "使用智能体当前的模型、推理和权限设置": "Uses the agent's current model, reasoning, and permission settings",
      "首次执行": "First run",
      "循环执行": "Repeat",
      "按固定间隔持续执行这个任务": "Continue running this task at a fixed interval",
      "每隔": "Every",
      "单位": "Unit",
      "分钟": "Minutes",
      "小时": "Hours",
      "天": "Days",
      "周": "Weeks",
      "立即启用": "Enable now",
      "关闭后会保存为已暂停状态": "Turn this off to save the task as paused",
      "执行一次": "Run once",
      "个任务": "tasks",
      "已启用": "Active",
      "已暂停": "Paused",
      "执行中": "Running",
      "等待执行": "Waiting",
      "暂停": "Pause",
      "启用": "Enable",
      "立即运行": "Run now",
      "最近运行": "Recent runs",
      "尚未运行": "No runs yet",
      "尚未创建任务": "Task not created yet",
      "查看任务": "View task",
      "下次执行": "Next run",
      "当前计划": "Schedule",
      "暂无下次执行": "No next run",
      "暂无已启用的计划": "No active schedules",
      "创建或启用一个定时任务": "Create or enable a scheduled task",
      "删除定时任务": "Delete scheduled task",
      "删除后不会影响已经创建或正在执行的任务。": "Deleting this schedule will not affect tasks that were already created or are running.",
      "未知项目": "Unknown project",
      invalid_scheduled_task_name: "Enter a scheduled task name",
      invalid_scheduled_task_prompt: "Enter task instructions",
      invalid_scheduled_task_time: "Choose a valid start time",
      invalid_scheduled_task_interval: "Enter a valid recurrence interval",
      invalid_scheduled_task_repeat: "The recurrence state is invalid",
      invalid_scheduled_task_enabled: "The enabled state is invalid",
      scheduled_task_not_found: "Scheduled task not found",
      scheduled_task_running: "A run for this task is already in progress",
      scheduled_task_creation_failed: "The agent could not create the scheduled task. Try again.",
      scheduled_task_creation_timeout: "The agent timed out while creating the scheduled task. Try again.",
      scheduled_task_creation_invalid_output: "The agent returned an invalid scheduled task. Try again.",
      workspace_invalid: "The project folder is unavailable",
    });
    const bridgeRequests = new Map();
    const appServerRequests = new Map();
    const sessionHandoffPending = new Set();
    const relayId = "better-codex:" + (globalThis.crypto?.randomUUID?.() || Date.now() + ":" + Math.random().toString(36).slice(2));
    const relayThreads = new Set();
    let bridgeSequence = 0;
    let appServerSequence = 0;
    let diagnosticSequence = 0;
    const diagnosticLog = [];
    const errorQueue = [];
    let errorQueueIndex = 0;
    let errorDialog = null;
    let entry = null;
    let scheduledEntry = null;
    let scheduledMobileEntry = null;
    let agentsEntry = null;
    let projectsEntry = null;
    let auxiliaryNavigation = null;
    let moreEntry = null;
    let auxiliaryMenu = null;
    let profileEntry = null;
    let usageEntry = null;
    let themeEntry = null;
    let auxiliaryMenuDismiss = null;
    let panel = null;
    let panelSizeCleanup = null;
    let projectRefreshButton = null;
    let projectEmptyState = null;
    let projectHealthBadge = null;
    let projectRefreshLoading = false;
    let managedButtonSequence = 0;
    const managedButtons = new Set();
    let adoptedIconButtonSequence = 0;
    let adoptedButtonSequence = 0;
    let adoptedBadgeSequence = 0;
    let adoptedFeedbackSequence = 0;
    let adoptedPatternSequence = 0;
    let featureControllers = null;
    let observer = null;
    let refreshPending = false;
    let refreshTimer = null;
    let pollTimer = null;
    let liveUnsubscribe = null;
    let liveDirty = false;
    let passiveNetworkErrorVisible = false;
    let updateTimer = null;
    let relayTimer = null;
    let relayBusy = false;
    let relayHeartbeatBusy = false;
    let relayTurnProbeAt = 0;
    let relayCapability = "unknown";
    let relayCapabilityError = "";
    let relayCapabilityCheckedAt = 0;
    let relayAppSessionId = "";
    let relayCurrentThreadId = "";
    let relayEventQueue = Promise.resolve();
    let relayCommandInFlight = false;
    let relayBufferedEvents = [];
    const relayGuardianDenials = new Map();
    let updateNotice = null;
    let updateNoticeResizeObserver = null;
    let boardScrollResizeObserver = null;
    let issueSessionSnapshot = new Map();
    let completionNoticesRestored = false;
    let completionNoticeStack = null;
    const completionNoticeDismissals = new Map();
    const completionNoticeTimers = new Map();
    let dismissedUpdateVersion = sessionStorage.getItem("better-codex-dismissed-update") || "";
    let ignoredUpdateVersion = localStorage.getItem("better-codex-ignored-update") || "";
    let filterDismiss = null;
    let createMenuDismiss = null;
    let issueMenu = null;
    let issueMenuDismiss = null;
    let issueLongPress = null;
    let suppressIssueClickUntil = 0;
    let avatarPickerClose = null;
    let suppressAgentOutside = false;
    let agentInspectorResize = null;
    let draggingIssueId = "";
    let sessionDragPointer = null;
    let sessionDropInFlight = false;
    const listRequests = new Map();
    let suppressSessionClickUntil = 0;
    let codexLogoSequence = 0;
    let active = false;
    let bootstrapReady = false;

    function componentContext(feature, mountId) {
      return {
        feature,
        host: HOST_ADAPTER.kind + (HOST_ADAPTER.remote ? ":remote" : ""),
        mountId,
        themeSource: window.__betterCodexThemeDiagnostics__?.themeSource || "fallback",
      };
    }

    function controllers() {
      if (featureControllers) return featureControllers;
      featureControllers = {
        agents: createAgentsController({ render: () => renderAgents() }),
        board: createBoardController({ render: () => renderBoard() }),
        projects: createProjectsController({ render: () => renderProjects() }),
        scheduled: createScheduledController({ render: () => renderScheduledTasks() }),
        settings: createSettingsController({ open: initialView => renderSettingsOverlay(initialView) }),
      };
      return featureControllers;
    }

    function activateFeature(name) {
      const activeControllers = controllers();
      ["agents", "board", "projects", "scheduled"].forEach(feature => {
        if (feature !== name) activeControllers[feature].deactivate();
      });
      activeControllers[name].render();
    }

    function projectRefreshProps() {
      return {
        accessibleName: t(projectRefreshLoading ? "正在刷新项目" : "刷新项目"),
        disabled: state.mockup,
        icon: LUCIDE_ICONS.refresh,
        label: t(projectRefreshLoading ? "正在刷新项目" : "刷新项目"),
        loading: projectRefreshLoading,
        onPress: async () => {
          projectRefreshLoading = true;
          syncProjectRefreshButton();
          try {
            await perform(() => loadProjects());
          } finally {
            projectRefreshLoading = false;
            syncProjectRefreshButton();
          }
        },
        variant: "ghost",
      };
    }

    function syncProjectRefreshButton() {
      projectRefreshButton?.update(projectRefreshProps());
    }
    let routeSeen = false;
    let routeSuppressed = false;
    let destroyed = false;

    function label(value) {
      return String(value || "").replace(/\s+/g, " ").trim().toLowerCase();
    }

    function escapeHtml(value) {
      return String(value ?? "").replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" })[character]);
    }

    function t(value) {
      const source = String(value ?? "");
      if (localeResources[state.locale]?.[source]) return localeResources[state.locale][source];
      if (state.locale === "zh-CN" || !/[\p{Script=Han}]/u.test(source)) return source;
      const leading = source.match(/^\s*/)?.[0] || "";
      const trailing = source.match(/\s*$/)?.[0] || "";
      const core = source.slice(leading.length, source.length - trailing.length || undefined);
      if (localeResources.en[core]) return leading + localeResources.en[core] + trailing;
      if (core === "更多操作") return leading + "More actions" + trailing;
      if (core === "本次启动关闭") return leading + "Disable for this launch" + trailing;
      let match = core.match(/^(\d+) 个智能体工作中$/);
      if (match) return leading + match[1] + (match[1] === "1" ? " agent working" : " agents working") + trailing;
      match = core.match(/^(\d+) 个筛选$/);
      if (match) return leading + match[1] + (match[1] === "1" ? " filter" : " filters") + trailing;
      match = core.match(/^(\d+) 个任务$/);
      if (match) return leading + match[1] + (match[1] === "1" ? " task" : " tasks") + trailing;
      match = core.match(/^(\d+) 条$/);
      if (match) return leading + match[1] + (match[1] === "1" ? " message" : " messages") + trailing;
      match = core.match(/^更新于 (.+)$/);
      if (match) return leading + "Updated " + t(match[1]) + trailing;
      match = core.match(/^归档于 (.+)$/);
      if (match) return leading + "Archived " + t(match[1]) + trailing;
      match = core.match(/^(\d+) 分钟前$/);
      if (match) return leading + match[1] + (match[1] === "1" ? " minute ago" : " minutes ago") + trailing;
      match = core.match(/^(\d+) 小时前$/);
      if (match) return leading + match[1] + (match[1] === "1" ? " hour ago" : " hours ago") + trailing;
      match = core.match(/^(\d+) 天前$/);
      if (match) return leading + match[1] + (match[1] === "1" ? " day ago" : " days ago") + trailing;
      match = core.match(/^(无|低|中|高|紧急|超高)优先级$/);
      if (match) return leading + localeResources.en[match[1]] + " priority" + trailing;
      match = core.match(/^(.+) · (低|中|高|超高|最大|极致)推理$/);
      if (match) return leading + match[1] + " · " + localeResources.en[match[2]] + " reasoning" + trailing;
      match = core.match(/^确定删除任务 “(.+)” 吗？$/);
      if (match) return leading + "Delete task “" + match[1] + "”?" + trailing;
      match = core.match(/^确定删除智能体 “(.+)” 吗？$/);
      if (match) return leading + "Delete agent “" + match[1] + "”?" + trailing;
      match = core.match(/^创建后先由 (.+) 整理卡片，再自动开始工作。$/);
      if (match) return leading + "After creation, " + match[1] + " will organize the card and start working automatically." + trailing;
      match = core.match(/^(.+) · 点击刷新重试$/);
      if (match) return leading + t(match[1]) + " · Click to retry" + trailing;
      match = core.match(/^v(.+) 已可用，升级时 Better Codex Runtime 会暂时重启，Codex 无需重启。$/);
      if (match) return leading + "v" + match[1] + " is available. Better Codex Runtime will restart briefly during the update; Codex will stay open." + trailing;
      match = core.match(/^v(.+) 已可用，升级时远程服务会暂时重启。$/);
      if (match) return leading + "v" + match[1] + " is available. The remote service will restart briefly during the update." + trailing;
      match = core.match(/^更换 (.+) 的头像$/);
      if (match) return leading + "Change " + match[1] + "'s avatar" + trailing;
      return source;
    }

    function te(value) {
      return escapeHtml(t(value));
    }

    function mockupText(value) {
      const source = String(value ?? "");
      return source;
    }

    function projectLabel(project) {
      return project?.external_id === "inbox" ? t("未分配") : project?.name || "";
    }

    function projectsByRecentActivity(projects, issues = state.issues) {
      const issueActivity = new Map();
      issues.forEach(issue => {
        const timestamp = Date.parse(issue?.updated_at || "");
        if (!Number.isFinite(timestamp)) return;
        issueActivity.set(issue.project_id, Math.max(issueActivity.get(issue.project_id) || 0, timestamp));
      });
      const activityAt = project => {
        const timestamp = Date.parse(project?.updated_at || project?.created_at || "");
        const projectActivity = Number.isFinite(timestamp) ? timestamp : 0;
        return Math.max(projectActivity, issueActivity.get(project?.id) || 0);
      };
      return [...projects].sort((left, right) => {
        const difference = activityAt(right) - activityAt(left);
        if (difference) return difference;
        return projectLabel(left).localeCompare(projectLabel(right), state.locale || undefined);
      });
    }

    function normalizeSessionId(value) {
      const id = String(value || "").replace(/^(local|cloud):/i, "");
      return /^[a-f0-9-]{36}$/i.test(id) ? id : "";
    }

    function issueSessionId(issue) {
      if (REMOTE && issue?.has_conversation) return String(issue.id || "");
      return normalizeSessionId(issue?.run_thread_id) || "";
    }

    function linkedIssueThreadId(issue) {
      return issueSessionId(issue) || normalizeSessionId(issue?.thread_id) || "";
    }

    function issueExecutionRunning(issue) {
      return ["claimed", "running", "scheduling"].includes(issue?.active_run_status)
        || issue?.reply_status === "running"
        || ["starting", "active", "stopping", "waiting_on_approval", "waiting_on_user"].includes(issue?.session_status)
        || Boolean(issue?.session_active_turn_id);
    }

    function issuePermissions(issue) {
      const enrichmentPending = issue?.enrichment_status === "pending" || issue?.enrichment_status === "regenerating";
      const executionRunning = issueExecutionRunning(issue);
      const remotePending = issue?.remote_pending === true || issue?.remote_state?.status === "pending";
      const remoteConflict = issue?.remote_conflict === true || issue?.remote_state?.status === "conflict";
      const executed = Boolean(issue?.run_thread_id);
      const sessionHandoff = Boolean(issue?.session_handoff_at && !issue?.session_owned);
      const executionLocked = executionRunning || executed;
      return {
        enrichmentPending,
        executionRunning,
        remotePending,
        remoteConflict,
        executed,
        sessionHandoff,
        executionLocked,
        editingLocked: enrichmentPending || executionLocked || remotePending,
        boardLocked: enrichmentPending || executionRunning || remotePending,
        contextLocked: enrichmentPending || executionRunning || remotePending,
        archiveLocked: enrichmentPending || remotePending,
      };
    }

    async function resolveWorkspacePath(context) {
      const fromUrl = String(context?.workspacePath || "").trim();
      const threadId = normalizeSessionId(context?.threadId);
      if (fromUrl && (!threadId || currentRouteThreadId() === threadId)) return fromUrl;
      if (!threadId) return "";
      try {
        const result = await api("/api/sessions/" + encodeURIComponent(threadId) + "/workspace");
        return String(result?.workspace_path || "").trim();
      } catch {
        return "";
      }
    }

    async function ensureContextProject(context) {
      if (!context.projectId) return null;
      const source = context.projects.find(item => item.id === context.projectId);
      const existing = state.projects.find(item => item.external_id === context.projectId);
      const workspacePath = await resolveWorkspacePath(context);
      const project = await api("/api/projects/ensure", {
        method: "POST",
        body: JSON.stringify({
          external_id: context.projectId,
          name: source?.name || existing?.name || "Codex",
          workspace_path: workspacePath,
        }),
      });
      const index = state.projects.findIndex(item => item.id === project.id || item.external_id === project.external_id);
      if (index >= 0) state.projects[index] = project;
      else state.projects.push(project);
      state.projectId = project.id;
      localStorage.setItem(PROJECT_KEY, state.projectId);
      return project;
    }

    function installStyle() {
      if (document.getElementById(STYLE_ID)) return;
      const style = document.createElement("style");
      style.id = STYLE_ID;
      style.setAttribute(OWNED, "true");
      style.textContent = `
        #${ENTRY_ID}[aria-current="page"], #${SCHEDULED_ENTRY_ID}[aria-current="page"], #${AGENTS_ENTRY_ID}[aria-current="page"], #${PROJECTS_ENTRY_ID}[aria-current="page"], #${MORE_ENTRY_ID}[aria-current="page"] { background: var(--color-background-primary-soft-active, var(--color-token-list-hover-background, color-mix(in srgb, currentColor 8%, transparent))); }
        html[data-better-codex-open="true"] ${SELECTORS.sidebarNavigation} [aria-current="page"]:not(#${ENTRY_ID}):not(#${SCHEDULED_ENTRY_ID}):not(#${AGENTS_ENTRY_ID}):not(#${PROJECTS_ENTRY_ID}):not(#${MORE_ENTRY_ID}) { background: transparent !important; }
        html[data-better-codex-open="true"] ${SELECTORS.sidebarNavigation} [aria-current="page"]:not(#${ENTRY_ID}):not(#${SCHEDULED_ENTRY_ID}):not(#${AGENTS_ENTRY_ID}):not(#${PROJECTS_ENTRY_ID}):not(#${MORE_ENTRY_ID}) .text-token-list-active-selection-foreground { color: var(--color-token-foreground) !important; }
        [${HOST}="true"] { position: relative !important; z-index: 31 !important; pointer-events: none !important; }
        [${HIDDEN}="true"] { visibility: hidden !important; pointer-events: none !important; }
        ${config.designSystemCss}
      `;
      (document.head || document.documentElement).appendChild(style);
    }

    function findReferenceButton() {
      const scroll = document.querySelector(SELECTORS.sidebarScroll);
      if (!scroll) return null;
      const buttons = Array.from(scroll.querySelectorAll("button")).filter(button => !button.hasAttribute(OWNED));
      const plugin = buttons.find(button => ["插件", "plugins"].includes(label(button.textContent || button.getAttribute("aria-label"))));
      if (plugin) return plugin;
      return buttons.find(button => button.closest(SELECTORS.sidebarSection)) || buttons[0] || null;
    }

    function nativeButton(text) {
      const reference = findReferenceButton();
      const button = reference ? reference.cloneNode(true) : document.createElement("button");
      button.type = "button";
      if (!reference && HOST_KIND === "web") {
        button.className = "web-nav-button";
        button.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"></svg><span class="text-fade-truncate"></span>';
      }
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
      const handle = createButton({ label: t(text), variant: "ghost" }, componentContext("global-toolbar", "action-button:" + (++managedButtonSequence)));
      handle.element.classList.add("better-codex-button");
      managedButtons.add(handle);
      return handle.element;
    }

    function hydrateIconButtons(root, feature) {
      if (!root) return;
      const candidates = root instanceof HTMLButtonElement && root.matches("button[aria-label]")
        ? [root, ...root.querySelectorAll("button[aria-label]")]
        : [...root.querySelectorAll("button[aria-label]")];
      candidates.forEach(button => {
        if (!(button instanceof HTMLButtonElement) || button.dataset.bcComponent) return;
        if (button.children.length !== 1 || button.firstElementChild?.tagName.toLowerCase() !== "svg") return;
        const accessibleName = button.getAttribute("aria-label")?.trim();
        if (!accessibleName) return;
        const handle = adoptIconButton(button, {
          accessibleName,
          disabled: button.disabled,
          label: accessibleName,
          variant: button.classList.contains("is-danger") ? "danger" : "ghost",
        }, componentContext(feature, "adopted-icon-button:" + (++adoptedIconButtonSequence)));
        registerOwnedComponent(button, handle);
      });
    }

    function hydrateActionButtons(root, feature) {
      if (!root) return;
      const selector = [
        ".better-codex-submit",
        ".better-codex-update-button",
        ".better-codex-confirm-actions > button",
        ".better-codex-error-report-actions > button",
        ".better-codex-error-report-navigation > button",
        ".better-codex-scheduled-empty > button",
        ".better-codex-recovery-command > button",
        ".better-codex-recovery-retry",
        "dialog footer > button:not([aria-label])",
      ].join(",");
      root.querySelectorAll(selector).forEach(button => {
        if (!(button instanceof HTMLButtonElement) || button.dataset.bcComponent) return;
        const label = button.textContent?.trim() || button.getAttribute("aria-label")?.trim();
        if (!label) return;
        const primary = button.classList.contains("is-primary") || button.classList.contains("better-codex-submit") || button.classList.contains("better-codex-confirm-primary");
        const danger = button.classList.contains("is-danger") || button.matches("[data-agent-delete], [data-scheduled-delete], [data-confirm-danger]");
        const handle = adoptButton(button, {
          disabled: button.disabled,
          label,
          variant: danger ? "danger" : primary ? "primary" : "secondary",
        }, componentContext(feature, "adopted-button:" + (++adoptedButtonSequence)));
        registerOwnedComponent(button, handle);
      });
    }

    function hydrateSharedControls(root, feature) {
      hydrateIconButtons(root, feature);
      hydrateActionButtons(root, feature);
      root.querySelectorAll(".better-codex-scheduled-status, .better-codex-remote-status-badge, .better-codex-completion-status").forEach(element => {
        if (!(element instanceof HTMLElement) || element.dataset.bcComponent) return;
        const stateValue = element.dataset.state || element.closest("[data-remote-status]")?.getAttribute("data-remote-status") || "";
        const variant = ["running", "enabled", "online", "completed"].includes(stateValue) ? "success" : ["offline", "failed", "blocked"].includes(stateValue) ? "danger" : "neutral";
        const handle = adoptStatusBadge(element, { label: element.textContent?.trim() || "", variant }, componentContext(feature, "adopted-status-badge:" + (++adoptedBadgeSequence)));
        registerOwnedComponent(element, handle);
      });
      root.querySelectorAll(".better-codex-column-title > span:last-child, .better-codex-archive-project-count").forEach(element => {
        if (!(element instanceof HTMLElement) || element.dataset.bcComponent) return;
        const handle = adoptBadge(element, { label: element.textContent?.trim() || "" }, componentContext(feature, "adopted-count-badge:" + (++adoptedBadgeSequence)));
        registerOwnedComponent(element, handle);
      });
      root.querySelectorAll(".better-codex-dialog-error, .better-codex-agent-inspector-error, .better-codex-update-error, .better-codex-help-error, .better-codex-composer-queue-error, .better-codex-project-document-notice.is-error").forEach(element => {
        if (!(element instanceof HTMLElement) || element.dataset.bcComponent) return;
        const handle = adoptInlineFeedback(element, { message: element.textContent?.trim() || "", tone: "error" }, componentContext(feature, "adopted-inline-feedback:" + (++adoptedFeedbackSequence)));
        registerOwnedComponent(element, handle);
      });
      root.querySelectorAll(".better-codex-help-setting-row").forEach(element => {
        if (!(element instanceof HTMLElement) || element.dataset.bcComponent) return;
        const handle = adoptFieldShell(element, componentContext(feature, "adopted-field-shell:" + (++adoptedPatternSequence)));
        registerOwnedComponent(element, handle);
      });
      root.querySelectorAll(".better-codex-toolbar").forEach(element => {
        if (!(element instanceof HTMLElement) || element.dataset.bcComponent) return;
        const handle = adoptToolbar(element, componentContext(feature, "adopted-toolbar:" + (++adoptedPatternSequence)));
        registerOwnedComponent(element, handle);
      });
      root.querySelectorAll(".better-codex-project-document-form > label").forEach(element => {
        if (!(element instanceof HTMLElement) || element.dataset.bcComponent) return;
        const handle = adoptFormRow(element, componentContext(feature, "adopted-form-row:" + (++adoptedPatternSequence)));
        registerOwnedComponent(element, handle);
      });
      root.querySelectorAll(".better-codex-scheduled-row").forEach(element => {
        if (!(element instanceof HTMLElement) || element.dataset.bcComponent) return;
        const handle = adoptListRow(element, componentContext(feature, "adopted-list-row:" + (++adoptedPatternSequence)));
        registerOwnedComponent(element, handle);
      });
    }

    function hydrateAddedIconButtons(records) {
      records.forEach(record => record.addedNodes.forEach(node => {
        if (!(node instanceof HTMLElement)) return;
        const scope = node.matches('#better-codex-panel, [id^="better-codex"], [class*="better-codex"]')
          ? node
          : node.querySelector('#better-codex-panel, [id^="better-codex"], [class*="better-codex"]');
        if (!scope) return;
        hydrateSharedControls(scope, scope.closest("#better-codex-panel")?.dataset.surface || "global-overlay");
      }));
    }

    function createEntry(text, id, title, surface) {
      const button = nativeButton(t(text));
      button.id = id;
      button.setAttribute(OWNED, "true");
      button.setAttribute("aria-label", t(title));
      button.setAttribute("title", t(title));
      syncEntryIcon(button, surface);
      button.addEventListener("click", event => {
        event.preventDefault();
        event.stopPropagation();
        closeAuxiliaryMenu();
        openRoute(surface);
      });
      return button;
    }

    function closeAuxiliaryMenu() {
      if (moreEntry) moreEntry.setAttribute("aria-expanded", "false");
      if (auxiliaryMenu) auxiliaryMenu.removeAttribute("data-open");
      if (auxiliaryMenuDismiss) document.removeEventListener("pointerdown", auxiliaryMenuDismiss, true);
      auxiliaryMenuDismiss = null;
    }

    function createAuxiliaryNavigation() {
      const navigation = document.createElement("div");
      navigation.className = "web-nav-auxiliary";
      navigation.setAttribute(OWNED, "true");
      moreEntry = nativeButton(t("更多"));
      moreEntry.id = MORE_ENTRY_ID;
      moreEntry.classList.add("web-nav-more-entry");
      moreEntry.setAttribute(OWNED, "true");
      moreEntry.setAttribute("aria-label", t("更多功能"));
      moreEntry.setAttribute("title", t("更多功能"));
      moreEntry.setAttribute("aria-haspopup", "menu");
      moreEntry.setAttribute("aria-expanded", "false");
      moreEntry.setAttribute("aria-controls", "better-codex-more-menu");
      syncEntryIcon(moreEntry, "more");
      auxiliaryMenu = document.createElement("div");
      auxiliaryMenu.id = "better-codex-more-menu";
      auxiliaryMenu.className = "web-nav-more-menu";
      auxiliaryMenu.setAttribute(OWNED, "true");
      auxiliaryMenu.setAttribute("aria-label", t("更多功能"));
      if (SCHEDULED_AVAILABLE) {
        scheduledMobileEntry = createEntry("定时任务", SCHEDULED_MOBILE_ENTRY_ID, "管理定时任务", "scheduled");
        scheduledMobileEntry.classList.add("web-nav-mobile-action");
      }
      if (REMOTE) {
        profileEntry = nativeButton("");
        profileEntry.id = "better-codex-profile-entry";
        profileEntry.classList.add("web-nav-mobile-action", "web-nav-profile-entry");
        profileEntry.setAttribute(OWNED, "true");
        profileEntry.addEventListener("click", event => {
          event.preventDefault();
          event.stopPropagation();
          closeAuxiliaryMenu();
          showUserProfileDialog();
        });
      }
      usageEntry = nativeButton(t("Codex 额度"));
      usageEntry.id = "better-codex-usage-entry";
      usageEntry.classList.add("web-nav-mobile-action");
      usageEntry.setAttribute(OWNED, "true");
      usageEntry.addEventListener("click", event => {
        event.preventDefault();
        event.stopPropagation();
        closeAuxiliaryMenu();
        document.getElementById("web-usage-toggle")?.click();
      });
      themeEntry = nativeButton("");
      themeEntry.id = "better-codex-theme-entry";
      themeEntry.classList.add("web-nav-mobile-action");
      themeEntry.setAttribute(OWNED, "true");
      themeEntry.addEventListener("click", event => {
        event.preventDefault();
        event.stopPropagation();
        closeAuxiliaryMenu();
        document.getElementById("web-theme")?.click();
      });
      moreEntry.addEventListener("click", event => {
        event.preventDefault();
        event.stopPropagation();
        const opening = moreEntry.getAttribute("aria-expanded") !== "true";
        closeAuxiliaryMenu();
        if (!opening) return;
        moreEntry.setAttribute("aria-expanded", "true");
        auxiliaryMenu.setAttribute("data-open", "true");
        auxiliaryMenuDismiss = pointerEvent => {
          if (!navigation.contains(pointerEvent.target)) closeAuxiliaryMenu();
        };
        setTimeout(() => document.addEventListener("pointerdown", auxiliaryMenuDismiss, true), 0);
      });
      auxiliaryMenu.append(...(profileEntry ? [profileEntry] : []), ...(scheduledMobileEntry ? [scheduledMobileEntry] : []), usageEntry, themeEntry);
      navigation.append(moreEntry, auxiliaryMenu);
      return navigation;
    }

    function syncEntryIcon(button, surface) {
      const svg = button.querySelector("svg");
      if (svg) {
        const iconKey = { scheduled: "calendar", agents: "bot", projects: "folder", more: "more", usage: "usage", moon: "moon", sun: "sun" }[surface] || "issues";
        const definition = LUCIDE_ICONS[iconKey];
        if (svg.getAttribute("viewBox") !== "0 0 24 24") svg.setAttribute("viewBox", "0 0 24 24");
        if (svg.getAttribute("fill") !== "none") svg.setAttribute("fill", "none");
        if (svg.getAttribute("stroke") !== "currentColor") svg.setAttribute("stroke", "currentColor");
        if (svg.getAttribute("stroke-width") !== "1.8") svg.setAttribute("stroke-width", "1.8");
        if (svg.getAttribute("stroke-linecap") !== "round") svg.setAttribute("stroke-linecap", "round");
        if (svg.getAttribute("stroke-linejoin") !== "round") svg.setAttribute("stroke-linejoin", "round");
        if (svg.getAttribute("class") !== "lucide lucide-" + definition.name) svg.setAttribute("class", "lucide lucide-" + definition.name);
        if (svg.innerHTML !== definition.nodes) svg.innerHTML = definition.nodes;
      }
    }

    function syncEntryLabel(button, text, title) {
      text = t(text);
      title = t(title);
      const content = button.querySelector(SELECTORS.truncatedText) || Array.from(button.querySelectorAll("span")).at(-1);
      if (content && content.textContent !== text) content.textContent = text;
      else if (!content && button.textContent !== text) button.textContent = text;
      if (button.getAttribute("aria-label") !== title) button.setAttribute("aria-label", title);
      if (button.getAttribute("title") !== title) button.setAttribute("title", title);
    }

    function syncMobileActions() {
      if (!usageEntry || !themeEntry) return;
      if (profileEntry) {
        const user = state.user || {};
        profileEntry.innerHTML = userAvatarMarkup(user, "web-nav-profile-avatar") + '<span class="web-nav-profile-meta"><strong>' + escapeHtml(user.name || t("你")) + '</strong><small>' + te("编辑个人资料") + '</small></span>' + icon("chevron");
        profileEntry.setAttribute("aria-label", t("编辑个人资料"));
        profileEntry.setAttribute("title", t("编辑个人资料"));
      }
      if (scheduledMobileEntry) {
        syncEntryLabel(scheduledMobileEntry, "定时任务", "管理定时任务");
        syncEntryIcon(scheduledMobileEntry, "scheduled");
      }
      syncEntryLabel(usageEntry, "Codex 额度", "查看 Codex 额度");
      syncEntryIcon(usageEntry, "usage");
      const light = document.documentElement.dataset.theme === "dark";
      const label = light ? "切换为浅色主题" : "切换为深色主题";
      syncEntryLabel(themeEntry, label, label);
      syncEntryIcon(themeEntry, light ? "sun" : "moon");
    }

    function ensureEntry() {
      if (destroyed) return false;
      installStyle();
      const reference = findReferenceButton();
      const parent = reference?.parentElement || (HOST_KIND === "web" ? document.querySelector(SELECTORS.sidebarSection) : null);
      if (!parent) return false;
      if (!entry) entry = createEntry("任务看板", ENTRY_ID, "打开任务看板", "issues");
      syncEntryLabel(entry, "任务看板", "打开任务看板");
      syncEntryIcon(entry, "issues");
      if (reference) {
        if (entry.parentElement !== parent || entry.previousElementSibling !== reference) reference.after(entry);
      } else if (entry.parentElement !== parent || entry !== parent.firstElementChild) {
        parent.prepend(entry);
      }
      if (!scheduledEntry && SCHEDULED_AVAILABLE) scheduledEntry = createEntry("定时任务", SCHEDULED_ENTRY_ID, "管理定时任务", "scheduled");
      if (scheduledEntry) {
        syncEntryLabel(scheduledEntry, "定时任务", "管理定时任务");
        syncEntryIcon(scheduledEntry, "scheduled");
        if (scheduledEntry.parentElement !== parent || scheduledEntry.previousElementSibling !== entry) entry.after(scheduledEntry);
      }
      if (!agentsEntry) agentsEntry = createEntry("智能体", AGENTS_ENTRY_ID, "管理智能体", "agents");
      syncEntryLabel(agentsEntry, "智能体", "管理智能体");
      syncEntryIcon(agentsEntry, "agents");
      const agentReference = scheduledEntry || entry;
      if (agentsEntry.parentElement !== parent || agentsEntry.previousElementSibling !== agentReference) agentReference.after(agentsEntry);
      if (!projectsEntry) projectsEntry = createEntry("项目管理", PROJECTS_ENTRY_ID, "管理项目", "projects");
      syncEntryLabel(projectsEntry, "项目管理", "管理项目");
      syncEntryIcon(projectsEntry, "projects");
      projectsEntry.hidden = !hasFeature("project-management");
      if (HOST_KIND === "web") {
        if (!auxiliaryNavigation) auxiliaryNavigation = createAuxiliaryNavigation();
        syncEntryLabel(moreEntry, "更多", "更多功能");
        syncEntryIcon(moreEntry, "more");
        syncMobileActions();
        auxiliaryNavigation.hidden = false;
        if (auxiliaryNavigation.parentElement !== parent || auxiliaryNavigation.previousElementSibling !== agentsEntry) agentsEntry.after(auxiliaryNavigation);
        if (scheduledMobileEntry && (scheduledMobileEntry.parentElement !== auxiliaryMenu || scheduledMobileEntry !== auxiliaryMenu.firstElementChild)) auxiliaryMenu.prepend(scheduledMobileEntry);
        const projectReference = scheduledMobileEntry || null;
        if (projectsEntry.parentElement !== auxiliaryMenu || projectsEntry.previousElementSibling !== projectReference) {
          if (projectReference) projectReference.after(projectsEntry);
          else auxiliaryMenu.prepend(projectsEntry);
        }
      } else if (projectsEntry.parentElement !== parent || projectsEntry.previousElementSibling !== agentsEntry) agentsEntry.after(projectsEntry);
      const currentEntry = active && state.surface === "issues" ? entry : active && state.surface === "scheduled" ? scheduledEntry : active && state.surface === "agents" ? agentsEntry : active && state.surface === "projects" ? projectsEntry : null;
      for (const item of [entry, scheduledEntry, agentsEntry, projectsEntry].filter(Boolean)) {
        if (item === currentEntry && item.getAttribute("aria-current") !== "page") item.setAttribute("aria-current", "page");
        if (item !== currentEntry && item.hasAttribute("aria-current")) item.removeAttribute("aria-current");
      }
      if (scheduledMobileEntry) {
        if (active && state.surface === "scheduled" && scheduledMobileEntry.getAttribute("aria-current") !== "page") scheduledMobileEntry.setAttribute("aria-current", "page");
        if ((!active || state.surface !== "scheduled") && scheduledMobileEntry.hasAttribute("aria-current")) scheduledMobileEntry.removeAttribute("aria-current");
      }
      if (moreEntry) {
        if (active && ["scheduled", "projects"].includes(state.surface) && moreEntry.getAttribute("aria-current") !== "page") moreEntry.setAttribute("aria-current", "page");
        if ((!active || !["scheduled", "projects"].includes(state.surface)) && moreEntry.hasAttribute("aria-current")) moreEntry.removeAttribute("aria-current");
      }
      return entry.isConnected && (!scheduledEntry || scheduledEntry.isConnected) && (!scheduledMobileEntry || scheduledMobileEntry.isConnected) && agentsEntry.isConnected && projectsEntry.isConnected && (HOST_KIND !== "web" || auxiliaryNavigation?.isConnected);
    }

    function findMount() {
      if (HOST_KIND === "web") return document.querySelector("[data-better-codex-web-surface]");
      const frame = document.querySelector(SELECTORS.contentFrame);
      const layout = frame?.closest(SELECTORS.contentLayout) || document.querySelector(SELECTORS.contentLayout);
      const surface = layout?.parentElement;
      return surface?.closest("main") ? surface : null;
    }

    function activeThreadRow() {
      const rows = Array.from(document.querySelectorAll(SELECTORS.threadRow));
      return rows.find(row => row.getAttribute(ATTRIBUTES.threadActive) === "true") || rows.find(row => ["page", "true"].includes(row.getAttribute("aria-current"))) || null;
    }

    function readContext(row = activeThreadRow()) {
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
        threadId: row ? nativeThreadId(row) : location.pathname.match(/\/local\/([^/?#]+)/)?.[1] || "",
        workspacePath: url.searchParams.get("workspace") || url.searchParams.get("cwd") || "",
        projects
      };
    }

    function transientRuntimeTransportError(error) {
      const message = error instanceof Error ? error.message : String(error || "");
      return ["runtime_offline", "runtime_unavailable", "runtime_bridge_timeout", "runtime_bridge_unavailable", "injection_destroyed"].includes(message) || message === "runtime_fetch_failed" || message.startsWith("runtime_fetch_failed:");
    }

    function transientNetworkError(error) {
      const message = error instanceof Error ? error.message : String(error || "");
      const failureType = String(error?.betterCodexDiagnostics?.failure_type || "");
      return transientRuntimeTransportError(error) || failureType === "network_transport" || ["browser_transport_failed", "Failed to fetch", "NetworkError when attempting to fetch resource."].includes(message);
    }

    function api(path, options = {}) {
      const method = String(options.method || "GET").toUpperCase();
      const requestPath = path + (path.includes("?") ? "&" : "?") + "locale=" + encodeURIComponent(state.locale);
      const commandId = method === "GET" ? "" : globalThis.crypto?.randomUUID?.() || VERSION + "-command-" + Date.now() + "-" + Math.random().toString(36).slice(2);
      const traceId = globalThis.crypto?.randomUUID?.() || VERSION + "-trace-" + Date.now() + "-" + Math.random().toString(36).slice(2);
      const removalMatch = path.match(/^\/api\/issues\/([^\/?]+)(?:\/(archive))?(?:\?.*)?$/);
      const removalId = removalMatch && (method === "DELETE" || method === "POST" && removalMatch[2] === "archive") ? decodeURIComponent(removalMatch[1]) : "";
      const removalIssue = removalId ? state.issues.find(issue => issue.id === removalId) : null;
      if (removalIssue && !READ_ONLY) {
        pendingIssueRemovals.set(removalId, { commandId, issue: removalIssue });
        state.issues = state.issues.filter(issue => issue.id !== removalId);
        render();
      }
      const startedAt = Date.now();
      const bodyBytes = typeof options.body === "string" ? new TextEncoder().encode(options.body).byteLength : 0;
      appendDiagnostic("api_request", { trace_id: traceId, method, path: requestPath, command_id: commandId, request_body_bytes: bodyBytes });
      if (READ_ONLY && method !== "GET") {
        const error = new Error("remote_read_only");
        appendDiagnostic("api_failure", { trace_id: traceId, method, path: requestPath, command_id: commandId, request_body_bytes: bodyBytes, elapsed_ms: Date.now() - startedAt, error: error.message });
        return Promise.reject(error);
      }
      const attempt = (retriesLeft) => {
        if (typeof window.betterCodexHost?.request === "function") {
          return Promise.resolve(window.betterCodexHost.request({ path: requestPath, method: options.method || "GET", body: options.body, timeoutMs: options.timeoutMs, commandId, traceId })).catch(error => {
            if (retriesLeft > 0 && error instanceof Error && ["runtime_bridge_timeout", "runtime_response_invalid"].includes(error.message)) return attempt(retriesLeft - 1);
            throw error;
          });
        }
        if (typeof window.betterCodexRequest !== "function") return Promise.reject(new Error("runtime_bridge_unavailable"));
        const id = VERSION + ":" + (++bridgeSequence);
        return new Promise((resolve, reject) => {
          const timer = setTimeout(() => {
            bridgeRequests.delete(id);
            reject(new Error("runtime_bridge_timeout"));
          }, Number(options.timeoutMs) || 10000);
          bridgeRequests.set(id, { resolve, reject, timer });
          try {
            window.betterCodexRequest(JSON.stringify({ id, token: BRIDGE_TOKEN, path: requestPath, method: options.method || "GET", body: options.body, timeoutMs: options.timeoutMs, commandId, traceId }));
          } catch (error) {
            bridgeRequests.delete(id);
            clearTimeout(timer);
            reject(error instanceof Error ? error : new Error("runtime_bridge_unavailable"));
          }
        }).catch(error => {
          if (retriesLeft > 0 && error instanceof Error && ["runtime_bridge_timeout", "runtime_response_invalid"].includes(error.message)) {
            return attempt(retriesLeft - 1);
          }
          throw error;
        });
      };
      return attempt(method === "GET" ? 1 : 0).then(value => {
        appendDiagnostic("api_response", { trace_id: traceId, method, path: requestPath, command_id: commandId, elapsed_ms: Date.now() - startedAt });
        if (removalId && value?.queued === true) settleIssueRemoval(removalId, commandId);
        else if (removalId) pendingIssueRemovals.delete(removalId);
        return value;
      }).catch(error => {
        if (removalId) {
          const pending = pendingIssueRemovals.get(removalId);
          if (pending?.commandId === commandId) {
            pendingIssueRemovals.delete(removalId);
            if (!state.issues.some(issue => issue.id === removalId)) state.issues.push(pending.issue);
            render();
          }
        }
        appendDiagnostic("api_failure", { trace_id: traceId, method, path: requestPath, command_id: commandId, request_body_bytes: bodyBytes, elapsed_ms: Date.now() - startedAt, error: error instanceof Error ? error.message : String(error || "request_failed") });
        throw error;
      });
    }

    function settleIssueRemoval(issueId, commandId, attempt = 0) {
      const pending = pendingIssueRemovals.get(issueId);
      if (!pending || pending.commandId !== commandId) return;
      const delays = [1000, 2000, 5000, 10000, 30000, 120000, 600000];
      setTimeout(async () => {
        const current = pendingIssueRemovals.get(issueId);
        if (!current || current.commandId !== commandId) return;
        try {
          const result = await api("/api/commands/" + encodeURIComponent(commandId));
          if (result?.queued === true || ["pending", "dispatched", "processing"].includes(result?.status)) return settleIssueRemoval(issueId, commandId, attempt + 1);
          if (["rejected", "conflict", "expired"].includes(result?.status)) throw new Error(result.error || "command_rejected");
          pendingIssueRemovals.delete(issueId);
          void loadIssues({ background: true }).catch(() => {});
        } catch (error) {
          if (error instanceof Error && ["command_not_found", "runtime_offline", "runtime_unavailable", "runtime_bridge_timeout", "relay_stream_interrupted", "request_outcome_unknown"].includes(error.message)) return settleIssueRemoval(issueId, commandId, attempt + 1);
          pendingIssueRemovals.delete(issueId);
          if (!state.issues.some(issue => issue.id === issueId)) state.issues.push(current.issue);
          render();
          void loadIssues({ background: true }).catch(() => {});
        }
      }, delays[Math.min(attempt, delays.length - 1)]);
    }

    function listResponse(value, path, kind) {
      if (Array.isArray(value)) return value;
      const diagnostics = {
        response_path: path,
        response_kind: kind,
        response_type: value === null ? "null" : typeof value,
        response_keys: value && typeof value === "object" ? Object.keys(value).slice(0, 20) : [],
      };
      appendDiagnostic("api_invalid_response", diagnostics);
      const error = new Error("invalid_" + kind + "_response");
      error.betterCodexDiagnostics = diagnostics;
      throw error;
    }

    async function requestList(path, kind, options = {}) {
      const key = kind + ":" + path + ":" + String(Boolean(options.passive));
      if (listRequests.has(key)) return listRequests.get(key);
      const request = (async () => {
        try {
          return listResponse(await api(path, options), path, kind);
        } catch (error) {
          if (!(error instanceof Error) || error.message !== "invalid_" + kind + "_response") throw error;
          return listResponse(await api(path, options), path, kind);
        }
      })();
      listRequests.set(key, request);
      try {
        return await request;
      } finally {
        if (listRequests.get(key) === request) listRequests.delete(key);
      }
    }

    function requestProjects(options = {}) {
      return requestList("/api/projects", "projects", options);
    }

    function startLiveUpdates() {
      if (liveUnsubscribe || typeof window.betterCodexHost?.subscribe !== "function") return false;
      liveUnsubscribe = window.betterCodexHost.subscribe(event => {
        if (event?.event === "ready" && !bootstrapReady) return;
        if (document.hidden) {
          liveDirty = true;
          return;
        }
        if (active && !panel?.dataset.recovery) void perform(() => REMOTE ? Promise.all([loadSurface({ background: true }), loadAutoDispatch({ background: true })]) : loadSurface({ background: true }), { background: true });
      });
      return typeof liveUnsubscribe === "function";
    }

    function onVisibilityChange() {
      if (document.hidden || (!liveDirty && !passiveNetworkErrorVisible) || !active || panel?.dataset.recovery) return;
      liveDirty = false;
      void perform(() => REMOTE ? Promise.all([loadSurface({ background: true }), loadAutoDispatch({ background: true })]) : loadSurface({ background: true }), { background: true });
    }

    function onNetworkOnline() {
      if (!active || panel?.dataset.recovery) return;
      void perform(() => REMOTE ? Promise.all([loadSurface({ background: true }), loadAutoDispatch({ background: true })]) : loadSurface({ background: true }), { background: true });
    }

    function appServerError(value) {
      if (!value) return "desktop_bridge_request_failed";
      if (typeof value === "string") return value;
      if (typeof value.message === "string") return value.message;
      if (typeof value.code === "string") return value.code;
      return "desktop_bridge_request_failed";
    }

    function relayEventTurnId(method, params) {
      if (method === "item/completed") return normalizeSessionId(params?.turnId);
      if (method === "turn/started" || method === "turn/completed") return normalizeSessionId(params?.turn?.id);
      return "";
    }

    function queueRelayEvent(method, params) {
      relayEventQueue = relayEventQueue.catch(() => {}).then(async () => {
        for (let attempt = 0; attempt < 3; attempt += 1) {
          try {
            return await api("/api/session-relay/events", {
              method: "POST",
              body: JSON.stringify({ relay_id: relayId, method, params })
            });
          } catch {
            if (attempt === 2) return;
            await new Promise(resolve => setTimeout(resolve, 250 * (attempt + 1)));
          }
        }
      }).catch(() => {});
    }

    function flushRelayEvents(turnId = "", includeUnmatched = false) {
      const buffered = relayBufferedEvents;
      relayBufferedEvents = [];
      buffered.forEach(event => {
        const eventTurnId = relayEventTurnId(event.method, event.params);
        if (includeUnmatched || !eventTurnId || eventTurnId === turnId) queueRelayEvent(event.method, event.params);
      });
    }

    function appServerEnvelope(value, event = null) {
      let message = value;
      if (typeof message === "string") {
        try { message = JSON.parse(message); } catch { return false; }
      }
      if (!message || typeof message !== "object") return false;
      if (message.type === "mcp-response") {
        const response = message.message && typeof message.message === "object" ? message.message : {};
        const id = String(response.id || "");
        const pending = appServerRequests.get(id);
        if (!pending) return false;
        event?.stopImmediatePropagation?.();
        appServerRequests.delete(id);
        clearTimeout(pending.timer);
        if (response.error) pending.reject(new Error(appServerError(response.error)));
        else pending.resolve(response.result);
        return true;
      }
      if (message.type !== "mcp-notification") return false;
      const method = String(message.method || "");
      const params = message.params && typeof message.params === "object" ? message.params : {};
      if (method === "thread/started") return false;
      const threadId = normalizeSessionId(params.threadId);
      if (!threadId || (!relayThreads.has(threadId) && threadId !== relayCurrentThreadId)) return false;
      if (method === "item/autoApprovalReview/completed") {
        if (params.review?.status === "denied") {
          const denials = relayGuardianDenials.get(threadId) || [];
          const source = params.action || {};
          const commandSource = source.source === "unifiedExec" ? "unified_exec" : source.source;
          const protocol = source.protocol === "socks5Tcp" ? "socks5_tcp" : source.protocol === "socks5Udp" ? "socks5_udp" : source.protocol;
          const permissions = source.permissions || {};
          const action = source.type === "command" ? { type: "command", source: commandSource, command: source.command, cwd: source.cwd }
            : source.type === "execve" ? { type: "execve", source: commandSource, program: source.program, argv: source.argv, cwd: source.cwd }
            : source.type === "applyPatch" ? { type: "apply_patch", cwd: source.cwd, files: source.files }
            : source.type === "networkAccess" ? { type: "network_access", target: source.target, host: source.host, protocol, port: source.port }
            : source.type === "mcpToolCall" ? { type: "mcp_tool_call", server: source.server, tool_name: source.toolName, connector_id: source.connectorId ?? null, connector_name: source.connectorName ?? null, tool_title: source.toolTitle ?? null }
            : source.type === "requestPermissions" ? { type: "request_permissions", reason: source.reason ?? null, permissions: { network: permissions.network ?? null, file_system: permissions.fileSystem ?? null } }
            : { type: source.type };
          denials.push({ id: String(params.reviewId || ""), target_item_id: params.targetItemId ?? null, turn_id: String(params.turnId || ""), status: String(params.review.status || ""), risk_level: params.review.riskLevel ?? null, user_authorization: params.review.userAuthorization ?? null, rationale: params.review.rationale ?? null, decision_source: params.decisionSource ?? null, action });
          relayGuardianDenials.set(threadId, denials.slice(-20));
        }
        return true;
      }
      if (!["thread/status/changed", "turn/started", "turn/completed", "item/completed"].includes(method)) return false;
      let relayParams = params;
      if (method === "thread/status/changed") {
        const status = params.status && typeof params.status === "object" ? params.status : {};
        relayParams = { threadId, status: { type: String(status.type || ""), activeFlags: Array.isArray(status.activeFlags) ? status.activeFlags.filter(value => typeof value === "string") : [] } };
      }
      if (method === "turn/started") {
        const turn = params.turn && typeof params.turn === "object" ? params.turn : {};
        relayParams = { threadId, turn: { id: String(turn.id || ""), status: String(turn.status || "") } };
      }
      if (method === "item/completed") {
        const item = params.item && typeof params.item === "object" ? params.item : {};
        if (item.type !== "agentMessage" || typeof item.text !== "string") return false;
        relayParams = { threadId, turnId: String(params.turnId || ""), item: { type: "agentMessage", text: item.text } };
      }
      if (method === "turn/completed") {
        const turn = params.turn && typeof params.turn === "object" ? params.turn : {};
        const error = turn.error && typeof turn.error === "object" ? turn.error : null;
        const items = Array.isArray(turn.items) ? turn.items.flatMap(item => item && typeof item === "object" && item.type === "agentMessage" && typeof item.text === "string" ? [{ type: "agentMessage", text: item.text }] : []) : [];
        relayParams = { threadId, turn: { id: String(turn.id || ""), status: String(turn.status || ""), items, error: error ? { message: String(error.message || "") } : null } };
      }
      if (relayCommandInFlight && method !== "thread/status/changed" && method !== "turn/started") relayBufferedEvents.push({ method, params: relayParams });
      else queueRelayEvent(method, relayParams);
      return true;
    }

    function onAppServerMessage(event) {
      appServerEnvelope(event.data, event);
    }

    function sendAppServerRequest(method, params) {
      if (typeof window.electronBridge?.sendMessageFromView !== "function") return Promise.reject(new Error("desktop_bridge_unavailable"));
      const id = relayId + ":" + (++appServerSequence);
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          appServerRequests.delete(id);
          reject(new Error("desktop_bridge_timeout"));
        }, 30000);
        appServerRequests.set(id, { resolve, reject, timer });
        Promise.resolve(window.electronBridge.sendMessageFromView({
          type: "mcp-request",
          hostId: "local",
          request: { id, method, params },
          source: "better-codex",
          timeoutMs: 30000
        })).catch(error => {
          const pending = appServerRequests.get(id);
          if (!pending) return;
          appServerRequests.delete(id);
          clearTimeout(timer);
          reject(error instanceof Error ? error : new Error("desktop_bridge_unavailable"));
        });
      });
    }

    async function resumePersistedThread(threadId, payload = null) {
      const expected = normalizeSessionId(threadId);
      if (!expected) throw new Error("thread_id_invalid");
      const params = { threadId: expected, excludeTurns: true };
      if (payload) {
        if (payload.workspace_path) params.cwd = String(payload.workspace_path);
        if (payload.model) params.model = String(payload.model);
        if (payload.service_tier) params.serviceTier = String(payload.service_tier);
        params.approvalPolicy = String(payload.approval_policy || "on-request");
        params.approvalsReviewer = String(payload.approvals_reviewer || "auto_review");
        params.sandbox = String(payload.sandbox_mode || "workspace-write");
        params.developerInstructions = String(payload.developer_instructions || "");
      }
      const resumed = await sendAppServerRequest("thread/resume", params);
      const resumedId = normalizeSessionId(resumed?.thread?.id);
      if (resumedId !== expected) throw new Error("desktop_thread_resume_invalid");
      relayThreads.add(expected);
      return resumed;
    }

    function isThreadNotFoundError(error) {
      const value = String(error instanceof Error ? error.message : error || "").toLowerCase();
      return value.includes("thread not found") || value.includes("thread_not_found");
    }

    function semanticInput(payload) {
      if (!Array.isArray(payload.input)) return [{ type: "text", text: String(payload.message || "") }];
      const input = payload.input.slice(0, 33).flatMap(item => {
        if (!item || typeof item !== "object") return [];
        if (item.type === "text") return [{ type: "text", text: String(item.text || "").slice(0, 100000) }];
        if (!["skill", "mention"].includes(item.type)) return [];
        const name = String(item.name || "").trim().slice(0, 500);
        const path = String(item.path || "").trim().slice(0, 4096);
        return name && path ? [{ type: item.type, name, path }] : [];
      });
      return input.some(item => item.type === "text") ? input : [{ type: "text", text: String(payload.message || "") }, ...input];
    }

    function turnStartParams(threadId, payload) {
      const params = {
        threadId,
        input: semanticInput(payload),
        approvalPolicy: String(payload.approval_policy || "on-request"),
        approvalsReviewer: String(payload.approvals_reviewer || "auto_review")
      };
      if (payload.workspace_path) params.cwd = String(payload.workspace_path);
      if (payload.model) params.model = String(payload.model);
      if (payload.effort) params.effort = String(payload.effort);
      if (payload.service_tier) params.serviceTier = String(payload.service_tier);
      return params;
    }

    function heartbeatSessionRelay() {
      if (relayHeartbeatBusy || destroyed) return Promise.resolve();
      relayHeartbeatBusy = true;
      return api("/api/session-relay/poll", {
        method: "POST",
        body: JSON.stringify({
          relay_id: relayId,
          app_session_id: relayAppSessionId || relayId,
          capability: relayCapability,
          capability_error: relayCapabilityError,
          busy: true
        })
      }).catch(() => {}).finally(() => {
        relayHeartbeatBusy = false;
      });
    }

    function nativeArgument(command, argument) {
      if (!argument) throw new Error("native_command_argument_required:" + command);
      return argument;
    }

    async function executeInjectedNativeCommand(threadId, payload) {
      const command = String(payload.native_command || "");
      const argument = String(payload.argument || "").trim();
      const resumed = await resumePersistedThread(threadId, payload);
      if (command === "approve") {
        const denials = relayGuardianDenials.get(threadId) || [];
        const event = denials.at(-1);
        if (!event) throw new Error("native_approval_not_found");
        const response = await sendAppServerRequest("thread/approveGuardianDeniedAction", { threadId, event });
        denials.pop();
        return { thread_id: threadId, command, approved: true, response };
      }
      if (command === "fast") {
        const value = argument.toLowerCase();
        if (value && !["on", "off", "fast", "default", "true", "false", "1", "0"].includes(value)) throw new Error("native_fast_value_invalid");
        const enabled = value ? ["on", "fast", "true", "1"].includes(value) : String(resumed?.serviceTier || "default") !== "fast";
        await sendAppServerRequest("thread/settings/update", { threadId, serviceTier: enabled ? "fast" : null });
        return { thread_id: threadId, command, service_tier: enabled ? "fast" : "default" };
      }
      if (command === "feedback") {
        const reason = nativeArgument(command, argument);
        const response = await sendAppServerRequest("feedback/upload", { classification: "bug", reason, threadId, includeLogs: false });
        return { thread_id: threadId, command, uploaded: true, response };
      }
      if (command === "fork") {
        const response = await sendAppServerRequest("thread/fork", { threadId, cwd: String(payload.workspace_path || "") || null, excludeTurns: true });
        const forkedThreadId = normalizeSessionId(response?.thread?.id);
        if (!forkedThreadId) throw new Error("native_fork_invalid");
        if (argument) await sendAppServerRequest("thread/name/set", { threadId: forkedThreadId, name: argument.slice(0, 200) });
        relayThreads.add(forkedThreadId);
        return { thread_id: forkedThreadId, source_thread_id: threadId, command, rebind_thread: true };
      }
      if (command === "goal") {
        const value = argument.toLowerCase();
        if (!argument) return { thread_id: threadId, command, ...(await sendAppServerRequest("thread/goal/get", { threadId })) };
        if (["clear", "off", "none"].includes(value)) {
          await sendAppServerRequest("thread/goal/clear", { threadId });
          return { thread_id: threadId, command, goal: null };
        }
        return { thread_id: threadId, command, ...(await sendAppServerRequest("thread/goal/set", { threadId, objective: argument, status: "active" })) };
      }
      if (command === "init") {
        const input = [{ type: "text", text: "Create an AGENTS.md file that serves as a concise contributor guide for this repository. Inspect the repository first. Include project structure, build and validation commands, coding conventions, and commit guidance that are actually supported by the repository. Do not overwrite an existing AGENTS.md; if one exists, report that clearly instead." }];
        const turn = await sendAppServerRequest("turn/start", turnStartParams(threadId, { ...payload, input }));
        const turnId = normalizeSessionId(turn?.turn?.id);
        if (!turnId) throw new Error("desktop_turn_start_invalid");
        return { thread_id: threadId, turn_id: turnId, command };
      }
      if (command === "mcp") {
        const response = await sendAppServerRequest("mcpServerStatus/list", { threadId, cursor: null, limit: 100, detail: "toolsAndAuthOnly" });
        const servers = (Array.isArray(response?.data) ? response.data : []).map(server => ({ name: String(server?.name || ""), auth_status: String(server?.authStatus || ""), tool_count: server?.tools && typeof server.tools === "object" ? Object.keys(server.tools).length : 0, resource_count: Array.isArray(server?.resources) ? server.resources.length : 0 }));
        return { thread_id: threadId, command, servers, next_cursor: response?.nextCursor ?? null };
      }
      if (command === "memories") {
        const value = nativeArgument(command, argument).toLowerCase();
        if (!["on", "off", "enabled", "disabled"].includes(value)) throw new Error("native_memories_value_invalid");
        const mode = ["on", "enabled"].includes(value) ? "enabled" : "disabled";
        await sendAppServerRequest("thread/memoryMode/set", { threadId, mode });
        return { thread_id: threadId, command, memory_mode: mode };
      }
      if (command === "model") {
        const model = nativeArgument(command, argument);
        await sendAppServerRequest("thread/settings/update", { threadId, model });
        return { thread_id: threadId, command, model };
      }
      if (command === "personality") {
        const personality = nativeArgument(command, argument).toLowerCase();
        if (!["none", "friendly", "pragmatic"].includes(personality)) throw new Error("native_personality_value_invalid");
        await sendAppServerRequest("thread/settings/update", { threadId, personality });
        return { thread_id: threadId, command, personality };
      }
      if (command === "plan") {
        const value = argument.toLowerCase();
        if (value && !["on", "off", "plan", "default"].includes(value)) throw new Error("native_plan_value_invalid");
        const mode = ["off", "default"].includes(value) ? "default" : "plan";
        const presets = await sendAppServerRequest("collaborationMode/list", {});
        const preset = (Array.isArray(presets?.data) ? presets.data : []).find(item => item?.mode === mode);
        if (!preset) throw new Error("native_plan_preset_unavailable");
        await sendAppServerRequest("thread/settings/update", { threadId, collaborationMode: { mode, settings: { model: preset.model || resumed?.model, reasoning_effort: preset.reasoning_effort ?? resumed?.reasoningEffort, developer_instructions: null } } });
        return { thread_id: threadId, command, collaboration_mode: mode };
      }
      if (command === "project") {
        const projectId = nativeArgument(command, argument);
        await sendAppServerRequest("thread/metadata/update", { threadId, projectId: ["none", "clear"].includes(projectId) ? "" : projectId });
        return { thread_id: threadId, command, project_id: ["none", "clear"].includes(projectId) ? null : projectId };
      }
      if (command === "reasoning") {
        const effort = nativeArgument(command, argument);
        await sendAppServerRequest("thread/settings/update", { threadId, effort });
        return { thread_id: threadId, command, reasoning_effort: effort };
      }
      throw new Error("native_command_invalid");
    }

    async function executeSessionCommand(command) {
      const payload = command?.payload && typeof command.payload === "object" ? command.payload : {};
      let threadId = normalizeSessionId(command?.thread_id);
      let turnId = normalizeSessionId(command?.turn_id);
      const heartbeat = setInterval(() => void heartbeatSessionRelay(), 2000);
      relayCommandInFlight = true;
      relayBufferedEvents = [];
      try {
        let completion = {};
        if (command.kind === "start") {
          const params = {
            cwd: String(payload.workspace_path || ""),
            approvalPolicy: String(payload.approval_policy || "on-request"),
            approvalsReviewer: String(payload.approvals_reviewer || "auto_review"),
            sandbox: String(payload.sandbox_mode || "workspace-write")
          };
          if (payload.model) params.model = String(payload.model);
          if (payload.service_tier) params.serviceTier = String(payload.service_tier);
          if (payload.developer_instructions) params.developerInstructions = String(payload.developer_instructions);
          const started = await sendAppServerRequest("thread/start", params);
          threadId = normalizeSessionId(started?.thread?.id);
          if (!threadId) throw new Error("desktop_thread_start_invalid");
          relayCurrentThreadId = threadId;
          await api("/api/session-relay/commands/" + encodeURIComponent(command.id) + "/checkpoint", {
            method: "POST",
            body: JSON.stringify({ relay_id: relayId, result: { thread_id: threadId } })
          });
          try {
            await sendAppServerRequest("thread/name/set", { threadId, name: String(payload.title || "Better Codex") });
          } catch {}
          const turn = payload.semantic_command === "review"
            ? await sendAppServerRequest("review/start", { threadId, target: { type: "uncommittedChanges" }, delivery: "inline" })
            : await sendAppServerRequest("turn/start", turnStartParams(threadId, payload));
          turnId = normalizeSessionId(turn?.turn?.id);
          if (!turnId) throw new Error("desktop_turn_start_invalid");
          await api("/api/session-relay/commands/" + encodeURIComponent(command.id) + "/checkpoint", {
            method: "POST",
            body: JSON.stringify({ relay_id: relayId, result: { thread_id: threadId, turn_id: turnId } })
          });
        } else if (command.kind === "turn") {
          if (!threadId) throw new Error("session_thread_invalid");
          relayCurrentThreadId = threadId;
          await resumePersistedThread(threadId, payload);
          let turn;
          try {
            turn = await sendAppServerRequest("turn/start", turnStartParams(threadId, payload));
          } catch (error) {
            if (!isThreadNotFoundError(error)) throw error;
            await resumePersistedThread(threadId, payload);
            turn = await sendAppServerRequest("turn/start", turnStartParams(threadId, payload));
          }
          turnId = normalizeSessionId(turn?.turn?.id);
          if (!turnId) throw new Error("desktop_turn_start_invalid");
          await api("/api/session-relay/commands/" + encodeURIComponent(command.id) + "/checkpoint", {
            method: "POST",
            body: JSON.stringify({ relay_id: relayId, result: { thread_id: threadId, turn_id: turnId } })
          });
        } else if (command.kind === "review") {
          if (!threadId) throw new Error("session_thread_invalid");
          relayCurrentThreadId = threadId;
          await resumePersistedThread(threadId, payload);
          const review = await sendAppServerRequest("review/start", { threadId, target: { type: "uncommittedChanges" }, delivery: "inline" });
          turnId = normalizeSessionId(review?.turn?.id);
          if (!turnId) throw new Error("desktop_turn_start_invalid");
          await api("/api/session-relay/commands/" + encodeURIComponent(command.id) + "/checkpoint", {
            method: "POST",
            body: JSON.stringify({ relay_id: relayId, result: { thread_id: threadId, turn_id: turnId } })
          });
        } else if (command.kind === "compact") {
          if (!threadId) throw new Error("session_thread_invalid");
          relayCurrentThreadId = threadId;
          await resumePersistedThread(threadId, payload);
          await sendAppServerRequest("thread/compact/start", { threadId });
        } else if (command.kind === "native") {
          if (!threadId) throw new Error("session_thread_invalid");
          relayCurrentThreadId = threadId;
          completion = await executeInjectedNativeCommand(threadId, payload);
          threadId = normalizeSessionId(completion.thread_id) || threadId;
          turnId = normalizeSessionId(completion.turn_id) || turnId;
        } else if (command.kind === "steer") {
          if (!threadId || !turnId) throw new Error("session_turn_invalid");
          relayCurrentThreadId = threadId;
          const steered = await sendAppServerRequest("turn/steer", {
            threadId,
            expectedTurnId: turnId,
            input: semanticInput(payload)
          });
          turnId = normalizeSessionId(steered?.turnId) || turnId;
        } else if (command.kind === "interrupt") {
          if (!threadId || !turnId) throw new Error("session_turn_invalid");
          relayCurrentThreadId = threadId;
          await sendAppServerRequest("turn/interrupt", { threadId, turnId });
        } else {
          throw new Error("session_command_invalid");
        }
        await api("/api/session-relay/commands/" + encodeURIComponent(command.id) + "/complete", {
          method: "POST",
          body: JSON.stringify({ relay_id: relayId, result: { thread_id: threadId, turn_id: turnId, ...completion } })
        });
        relayCommandInFlight = false;
        flushRelayEvents(turnId, command.kind === "steer" || command.kind === "interrupt" || command.kind === "compact");
        if (threadId) relayThreads.add(threadId);
      } catch (error) {
        const commandError = error instanceof Error ? error.message : "desktop_bridge_request_failed";
        if (threadId && turnId && commandError === "session_command_not_claimed") {
          await sendAppServerRequest("turn/interrupt", { threadId, turnId }).catch(() => {});
        }
        const failed = await api("/api/session-relay/commands/" + encodeURIComponent(command.id) + "/fail", {
          method: "POST",
          body: JSON.stringify({ relay_id: relayId, error: commandError, thread_id: threadId, turn_id: turnId })
        }).catch(() => {});
        relayCommandInFlight = false;
        flushRelayEvents("", true);
        if (commandError === "desktop_bridge_unavailable" || commandError === "desktop_bridge_timeout") {
          relayCapability = "failed";
          relayCapabilityError = commandError;
          relayCapabilityCheckedAt = Date.now();
        }
        if (failed && threadId) relayThreads.add(threadId);
      } finally {
        clearInterval(heartbeat);
        if (relayCommandInFlight) {
          relayCommandInFlight = false;
          flushRelayEvents("", true);
        }
        relayCurrentThreadId = "";
      }
    }

    async function resolveRelayAppSessionId() {
      if (relayAppSessionId) return relayAppSessionId;
      try {
        const value = await window.electronBridge?.getAppSessionId?.();
        relayAppSessionId = typeof value === "string" ? value : typeof value?.appSessionId === "string" ? value.appSessionId : relayId;
      } catch {
        relayAppSessionId = relayId;
      }
      return relayAppSessionId;
    }

    async function reconcileRelayTurns(values) {
      await Promise.all(values.map(async value => {
        const threadId = normalizeSessionId(value?.thread_id);
        const turnId = normalizeSessionId(value?.turn_id);
        if (!threadId || !turnId) return;
        try {
          let summary = await sendAppServerRequest("thread/read", { threadId, includeTurns: false });
          let status = summary?.thread?.status && typeof summary.thread.status === "object" ? summary.thread.status : {};
          let statusType = String(status.type || "");
          if (statusType === "notLoaded") {
            await resumePersistedThread(threadId);
            summary = await sendAppServerRequest("thread/read", { threadId, includeTurns: false });
            status = summary?.thread?.status && typeof summary.thread.status === "object" ? summary.thread.status : {};
            statusType = String(status.type || "");
          }
          if (statusType === "active") {
            queueRelayEvent("thread/status/changed", {
              threadId,
              status: {
                type: statusType,
                activeFlags: Array.isArray(status.activeFlags) ? status.activeFlags.filter(item => typeof item === "string") : []
              }
            });
            return;
          }
          if (statusType !== "idle") return;
          const detail = await sendAppServerRequest("thread/read", { threadId, includeTurns: true });
          const turns = Array.isArray(detail?.thread?.turns) ? detail.thread.turns : [];
          const turn = turns.find(item => normalizeSessionId(item?.id) === turnId);
          if (!turn || !["completed", "interrupted", "failed"].includes(String(turn.status || ""))) return;
          const items = Array.isArray(turn.items) ? turn.items.flatMap(item => item && typeof item === "object" && item.type === "agentMessage" && typeof item.text === "string" ? [{ type: "agentMessage", text: item.text }] : []) : [];
          const error = turn.error && typeof turn.error === "object" ? { message: String(turn.error.message || "") } : null;
          queueRelayEvent("turn/completed", { threadId, turn: { id: turnId, status: String(turn.status), items, error } });
        } catch {}
      }));
    }

    async function pollSessionRelay() {
      if (relayBusy || destroyed) return;
      relayBusy = true;
      try {
        if (relayCapability === "failed" && Date.now() - relayCapabilityCheckedAt > 10000) relayCapability = "unknown";
        if (relayCapability === "unknown") {
          relayCapabilityCheckedAt = Date.now();
          try {
            await sendAppServerRequest("thread/list", { limit: 1 });
            relayCapability = "ready";
            relayCapabilityError = "";
          } catch (error) {
            relayCapability = "failed";
            relayCapabilityError = error instanceof Error ? error.message : "desktop_bridge_unavailable";
          }
        }
        const result = await api("/api/session-relay/poll", {
          method: "POST",
          body: JSON.stringify({
            relay_id: relayId,
            app_session_id: await resolveRelayAppSessionId(),
            capability: relayCapability,
            capability_error: relayCapabilityError
          })
        });
        relayThreads.clear();
        (Array.isArray(result?.thread_ids) ? result.thread_ids : []).forEach(value => {
          const threadId = normalizeSessionId(value);
          if (threadId) relayThreads.add(threadId);
        });
        if (!result?.leader) return;
        if (relayCapability !== "ready") return;
        if (result.command) {
          await executeSessionCommand(result.command);
          return;
        }
        const activeTurns = Array.isArray(result?.active_turns) ? result.active_turns : [];
        if (activeTurns.length && Date.now() - relayTurnProbeAt >= 5000) {
          relayTurnProbeAt = Date.now();
          await reconcileRelayTurns(activeTurns);
        }
      } catch {} finally {
        relayBusy = false;
      }
    }

    function pulseSessionRelay() {
      if (destroyed) return false;
      if (relayBusy) {
        if (relayCapability === "ready") void heartbeatSessionRelay();
        return true;
      }
      void pollSessionRelay();
      return true;
    }

    function startSessionRelay() {
      if (relayTimer !== null) return;
      pulseSessionRelay();
      relayTimer = setInterval(pulseSessionRelay, 1000);
    }

    function diagnosticTarget(target) {
      if (!(target instanceof Element)) return "";
      const name = target.getAttribute("name");
      const type = target.getAttribute("type");
      return [target.tagName.toLowerCase(), name ? "name=" + name : "", type ? "type=" + type : ""].filter(Boolean).join(" ");
    }

    function traceRendererDiagnostic(event, fields = {}) {
      const context = readContext();
      const selected = state.selected;
      const body = {
        event,
        sequence: ++diagnosticSequence,
        client_time: new Date().toISOString(),
        performance_ms: Math.round(performance.now() * 1000) / 1000,
        issue_id: selected?.id || "",
        issue_identifier: selected?.identifier || "",
        active_thread_id: context.threadId || "",
        document_focused: document.hasFocus(),
        ...fields,
      };
      appendDiagnostic(event, body);
      try {
        void window.electronBridge?.sendMessageFromView?.({
          type: "log-message",
          level: "info",
          message: "BETTER_CODEX_DIAGNOSTIC",
          tags: { safe: body, sensitive: {} },
        })?.catch?.(() => {});
      } catch {}
    }

    function interruptMessage(detail) {
      if (!detail || typeof detail !== "object") return null;
      const candidates = [detail, detail.message, detail.request, detail.params, detail.message?.request, detail.message?.params];
      for (const candidate of candidates) {
        if (!candidate || typeof candidate !== "object") continue;
        const method = String(candidate.method || candidate.requestMethod || "");
        const type = String(candidate.type || "");
        if (method !== "turn/interrupt" && type !== "interrupt-conversation") continue;
        const params = candidate.params && typeof candidate.params === "object" ? candidate.params : candidate;
        return {
          message_type: String(detail.type || type || ""),
          method: method || type,
          thread_id: String(params.threadId || params.conversationId || ""),
          turn_id: String(params.turnId || ""),
        };
      }
      return null;
    }

    function onHostMessageFromView(event) {
      appServerEnvelope(event.detail);
      const message = interruptMessage(event.detail);
      if (message) traceRendererDiagnostic("host_interrupt_message", message);
    }

    window.__betterCodexBridgeResolve = (id, result) => {
      const pending = bridgeRequests.get(id);
      if (!pending) return;
      bridgeRequests.delete(id);
      clearTimeout(pending.timer);
      if (result?.ok) pending.resolve(result.value);
      else {
        const error = new Error(result?.value?.error || "request_failed");
        if (result?.value?.diagnostics) error.betterCodexDiagnostics = result.value.diagnostics;
        pending.reject(error);
      }
    };

    function diagnosticValue(value, depth = 0) {
      if (value === null || value === undefined || typeof value === "boolean" || typeof value === "number") return value;
      if (typeof value === "string") return value.length > 4000 ? value.slice(0, 4000) + "…" : value;
      if (value instanceof Error) return { name: value.name, message: value.message, stack: String(value.stack || "").slice(0, 12000) };
      if (depth >= 4) return "[depth limited]";
      if (Array.isArray(value)) return value.slice(0, 50).map(item => diagnosticValue(item, depth + 1));
      if (typeof value !== "object") return String(value);
      const result = {};
      for (const [key, item] of Object.entries(value).slice(0, 80)) {
        if (/authorization|cookie|token|password|secret|request_body|response_body|content|prompt/i.test(key) && !/bytes|length|size/i.test(key)) result[key] = "[redacted]";
        else result[key] = diagnosticValue(item, depth + 1);
      }
      return result;
    }

    function appendDiagnostic(event, fields = {}) {
      diagnosticLog.push({ time: new Date().toISOString(), event, ...diagnosticValue(fields) });
      if (diagnosticLog.length > 80) diagnosticLog.splice(0, diagnosticLog.length - 80);
    }

    function relatedDiagnosticLogs(record) {
      const keys = ["trace_id", "command_id", "request_id", "issue_id", "issue_identifier", "thread_id", "turn_id"];
      const sources = [record.context || {}, record.diagnostics || {}];
      const traceId = sources.map(source => String(source.trace_id || "")).find(Boolean);
      const hostTimeline = Array.isArray(record.diagnostics?.trace_timeline) ? record.diagnostics.trace_timeline : [];
      if (traceId) return [...hostTimeline, ...diagnosticLog.filter(log => String(log.trace_id || "") === traceId)].sort((left, right) => String(left.time || "").localeCompare(String(right.time || ""))).slice(-8);
      const correlations = new Map(keys.map(key => [key, sources.map(source => String(source[key] || "")).filter(Boolean)]));
      const paths = sources.flatMap(source => [source.path, source.response_path]).map(value => String(value || "")).filter(Boolean);
      const message = String(record.message || "");
      const matchesCorrelation = log => keys.some(key => correlations.get(key).includes(String(log[key] || ""))) || paths.includes(String(log.path || log.response_path || ""));
      const matchesFailure = log => /error|fail|invalid|reject|timeout/i.test(String(log.event || "")) || String(log.error || log.message || "") === message;
      const failures = diagnosticLog.filter(log => log.id === record.id || matchesFailure(log) && (matchesCorrelation(log) || String(log.error || log.message || "") === message)).slice(-4);
      const firstFailure = failures[0];
      if (!firstFailure) return [];
      const firstFailureIndex = diagnosticLog.indexOf(firstFailure);
      const request = diagnosticLog.slice(0, firstFailureIndex).reverse().find(log => log.event === "api_request" && matchesCorrelation(log));
      return request ? [request, ...failures].slice(-5) : failures;
    }

    function errorCause(error) {
      const causes = [];
      let current = error?.cause;
      for (let depth = 0; current && depth < 4; depth += 1) {
        causes.push(current instanceof Error ? { name: current.name, message: current.message, stack: String(current.stack || "").slice(0, 6000) } : diagnosticValue(current));
        current = current?.cause;
      }
      return causes;
    }

    function compactFields(fields) {
      return Object.fromEntries(Object.entries(fields).filter(([, value]) => value !== "" && value !== null && value !== undefined));
    }

    function serviceFailureKind(message, diagnostics = {}) {
      const value = String(message || "request_failed").toLowerCase();
      const detail = String(diagnostics.response_detail || "").toLowerCase();
      const status = Number(diagnostics.http_status) || 0;
      if (HOST_KIND === "web" && status === 404) return "vps_http_not_found";
      if (HOST_KIND === "web" && value === "browser_transport_failed") return "vps_relay_unreachable";
      if (HOST_KIND === "web" && [502, 503, 504].includes(status) && !diagnostics.relay_channel_id && !["runtime_offline", "runtime_unavailable"].includes(value)) return "vps_relay_unreachable";
      if (HOST_KIND === "web" && ["runtime_stopped", "runtime_unavailable"].includes(value) && (value === "runtime_stopped" || detail.includes("runtime_stopped"))) return "local_runtime_stopped";
      if (HOST_KIND === "web" && ["runtime_offline", "runtime_unavailable"].includes(value)) return "local_runtime_disconnected";
      if (HOST_KIND === "web" && value === "relay_stream_interrupted") return "relay_runtime_interrupted";
      if (value.includes("runtime_stopped")) return "local_runtime_stopped";
      return "";
    }

    function serviceFailureLabel(error) {
      const value = error instanceof Error ? error.message : String(error || "request_failed");
      const diagnostics = error?.betterCodexDiagnostics || {};
      const kind = serviceFailureKind(value, diagnostics);
      if (kind === "vps_http_not_found") return t("VPS 入口返回了 404；这表示路径或资源不存在，不能据此判断本机 Runtime 已停止。");
      if (kind === "vps_relay_unreachable" && Number(diagnostics.http_status)) return t("VPS 入口无法连接 Relay 服务。本机 Runtime 状态未知。");
      if (kind === "vps_relay_unreachable") return t("浏览器无法连接 VPS Relay 入口。请检查域名、网络、反向代理和 Relay 服务；本机 Runtime 状态未知。");
      if (kind === "local_runtime_disconnected") return t("VPS Relay 当前没有连接到本机 Runtime。可能是 Runtime 停止、正在重启或网络中断。");
      if (kind === "local_runtime_stopped" && HOST_KIND === "web") return t("本机 Runtime 已主动断开与 VPS Relay 的连接，可能正在重启或已停止。");
      if (kind === "local_runtime_stopped") return t("Better Codex Runtime 已停止。请重新启动后重试。");
      if (kind === "relay_runtime_interrupted") return t("VPS Relay 与本机 Runtime 的请求通道已中断，请等待重连后重试。");
      return "";
    }

    function compactErrorRecord(record) {
      const context = record.context || {};
      const diagnostics = record.diagnostics || {};
      const traceId = String(context.trace_id || diagnostics.trace_id || "");
      const source = String(context.source || diagnostics.source || "application");
      const boundary = serviceFailureKind(record.message, diagnostics);
      const stage = record.message === "browser_transport_failed" ? "browser_transport" : diagnostics.relay_channel_id ? "relay_runtime_transport" : source === "api" || diagnostics.source === "web_host_request" ? "runtime_request" : source;
      const outcome = boundary === "vps_http_not_found" ? "resource_not_found" : boundary === "vps_relay_unreachable" ? "relay_unreachable" : boundary === "local_runtime_disconnected" ? "runtime_not_connected" : boundary === "local_runtime_stopped" ? "runtime_disconnected_intentionally" : diagnostics.relay_request_ended === true && diagnostics.relay_response_started !== true ? "request_sent_result_unknown" : diagnostics.relay_response_started === true ? "response_started" : record.message === "runtime_offline" ? "request_not_forwarded" : "request_failed";
      const checks = {
        browser_transport_failed: "browser_network_and_relay_health",
        relay_stream_interrupted: "request_receipt_and_relay_connection",
        runtime_socket_closed: "request_receipt_and_relay_connection",
        runtime_offline: "runtime_process_and_relay_connection",
        runtime_bridge_timeout: "runtime_health_and_request_receipt",
      };
      const timeline = Array.isArray(record.related_logs) ? record.related_logs : [];
      const lastCheckpoint = timeline.filter(entry => entry.event !== "error_reported").at(-1)?.event || "";
      const report = {
        time: record.time,
        error: compactFields({ code: record.message, message: record.display_message, type: record.name, category: record.category }),
        diagnosis: compactFields({ category: record.category, boundary, stage, outcome, last_checkpoint: lastCheckpoint, next_check: checks[record.message] || "matching_trace_timeline" }),
        trace: compactFields({ trace_id: traceId, command_id: context.command_id || diagnostics.command_id, request_id: diagnostics.response_request_id || context.request_id, channel_id: diagnostics.relay_channel_id, connection_epoch: diagnostics.relay_connection_epoch, runtime_instance_id: diagnostics.relay_runtime_instance_id }),
        request: compactFields({ method: context.method || diagnostics.method, path: context.path || diagnostics.path, http_status: diagnostics.http_status, elapsed_ms: context.elapsed_ms || diagnostics.elapsed_ms, attempt_count: diagnostics.attempt_count, request_ended: diagnostics.relay_request_ended, response_started: diagnostics.relay_response_started, replay_attempts: diagnostics.relay_replay_attempts }),
        timeline,
        occurrences: record.occurrences,
      };
      if (["window_error", "unhandled_rejection"].includes(source) && record.stack) report.stack = String(record.stack).split("\n").slice(0, 8).join("\n");
      return report;
    }

    function formatErrorReport(records) {
      return JSON.stringify({
        report: "Better Codex error report",
        exported_at: new Date().toISOString(),
        errors: records.map(compactErrorRecord),
      }, null, 2);
    }

    function renderErrorDialog() {
      if (!errorDialog?.isConnected || !errorQueue.length) return;
      errorQueueIndex = Math.max(0, Math.min(errorQueueIndex, errorQueue.length - 1));
      const record = errorQueue[errorQueueIndex];
      errorDialog.querySelector("[data-error-report-message]").textContent = record.display_message;
      errorDialog.querySelector("[data-error-report-time]").textContent = new Date(record.time).toLocaleString(state.locale === "zh-CN" ? "zh-CN" : "en-US");
      errorDialog.querySelector("[data-error-report-counter]").textContent = String(errorQueueIndex + 1) + " / " + String(errorQueue.length);
      errorDialog.querySelector("[data-error-report-detail]").textContent = formatErrorReport([record]);
      errorDialog.querySelector("[data-error-report-previous]").disabled = errorQueueIndex === 0;
      errorDialog.querySelector("[data-error-report-next]").disabled = errorQueueIndex >= errorQueue.length - 1;
    }

    function ensureErrorDialog() {
      if (errorDialog?.isConnected) return errorDialog;
      const dialog = document.createElement("dialog");
      dialog.id = "better-codex-error-dialog";
      dialog.setAttribute(OWNED, "true");
      dialog.setAttribute("aria-labelledby", "better-codex-error-report-title");
      dialog.setAttribute("aria-describedby", "better-codex-error-report-description");
      dialog.innerHTML = '<div class="better-codex-error-report-shell"><header class="better-codex-error-report-head"><span class="better-codex-error-report-icon" aria-hidden="true">' + icon("permissionDanger") + '</span><div><h2 id="better-codex-error-report-title">' + te("错误报告") + '</h2><p id="better-codex-error-report-description">' + te("错误信息、请求信息和直接相关日志已保留，可直接复制给开发者。") + '</p></div><button class="better-codex-error-report-close" type="button" data-error-report-close aria-label="' + te("关闭") + '">' + icon("close") + '</button></header><section class="better-codex-error-report-summary"><strong data-error-report-message>' + te("发生了一个错误") + '</strong><span data-error-report-time></span></section><pre class="better-codex-error-report-detail" data-error-report-detail tabindex="0"></pre><footer class="better-codex-error-report-footer"><div class="better-codex-error-report-navigation"><button type="button" data-error-report-previous>' + te("上一条") + '</button><output data-error-report-counter>1 / 1</output><button type="button" data-error-report-next>' + te("下一条") + '</button></div><div class="better-codex-error-report-actions"><button type="button" data-error-report-dismiss>' + te("移除当前错误") + '</button><button type="button" data-error-report-copy-all>' + te("复制全部错误") + '</button><button class="is-primary" type="button" data-error-report-copy>' + te("复制当前错误") + '</button></div></footer></div>';
      const copyRecords = async (button, records) => {
        const label = button.textContent;
        try {
          await copyText(formatErrorReport(records));
          button.textContent = t("已复制");
        } catch {
          button.textContent = t("复制失败");
        }
        setTimeout(() => { if (button.isConnected) button.textContent = label; }, 1600);
      };
      dialog.querySelector("[data-error-report-close]").addEventListener("click", () => dialog.close());
      dialog.querySelector("[data-error-report-previous]").addEventListener("click", () => { errorQueueIndex -= 1; renderErrorDialog(); });
      dialog.querySelector("[data-error-report-next]").addEventListener("click", () => { errorQueueIndex += 1; renderErrorDialog(); });
      dialog.querySelector("[data-error-report-copy]").addEventListener("click", event => void copyRecords(event.currentTarget, [errorQueue[errorQueueIndex]]));
      dialog.querySelector("[data-error-report-copy-all]").addEventListener("click", event => void copyRecords(event.currentTarget, errorQueue));
      dialog.querySelector("[data-error-report-dismiss]").addEventListener("click", () => {
        errorQueue.splice(errorQueueIndex, 1);
        if (!errorQueue.length) return dialog.close();
        errorQueueIndex = Math.min(errorQueueIndex, errorQueue.length - 1);
        renderErrorDialog();
      });
      dialog.addEventListener("cancel", event => { event.preventDefault(); dialog.close(); });
      bindModalDismiss(dialog, () => dialog.close());
      document.body.appendChild(dialog);
      errorDialog = dialog;
      return dialog;
    }

    function reportGlobalError(error, context = {}) {
      if (destroyed) return null;
      const value = error instanceof Error ? error : new Error(typeof error === "string" ? error : String(error?.message || error || "request_failed"));
      if (value.betterCodexReported) return null;
      installStyle();
      try { Object.defineProperty(value, "betterCodexReported", { value: true, configurable: true }); } catch {}
      const selected = state.selected;
      const record = {
        id: globalThis.crypto?.randomUUID?.() || "error-" + Date.now() + "-" + Math.random().toString(36).slice(2),
        time: new Date().toISOString(),
        display_message: errorLabel(value),
        name: value.name || "Error",
        message: value.message || "request_failed",
        category: errorPresentation(value).category,
        stack: String(value.stack || "").slice(0, 12000),
        causes: errorCause(value),
        context: diagnosticValue({
          source: context.source || "application",
          issue_id: selected?.id || "",
          issue_identifier: selected?.identifier || "",
          ...context,
        }),
        diagnostics: diagnosticValue(value.betterCodexDiagnostics || {}),
        environment: {
          core_version: CORE_VERSION,
          compatibility_version: VERSION,
          host: HOST_KIND,
          locale: state.locale,
          path: location.pathname,
          online: navigator.onLine,
          user_agent: navigator.userAgent,
          viewport: String(window.innerWidth) + "x" + String(window.innerHeight),
        },
        related_logs: [],
        occurrences: 1,
        occurrence_times: [new Date().toISOString()],
      };
      const fingerprint = [record.message, record.context.source || "", record.context.path || "", record.diagnostics.response_detail || ""].join("|");
      const repeatedIndex = errorQueue.findIndex(item => item.fingerprint === fingerprint);
      if (repeatedIndex >= 0) {
        const repeated = errorQueue[repeatedIndex];
        repeated.time = record.time;
        repeated.context = record.context;
        repeated.diagnostics = record.diagnostics;
        repeated.category = record.category;
        repeated.occurrences += 1;
        repeated.occurrence_times.push(record.time);
        if (repeated.occurrence_times.length > 20) repeated.occurrence_times.shift();
        repeated.related_logs = relatedDiagnosticLogs(repeated);
        errorQueueIndex = repeatedIndex;
        const dialog = ensureErrorDialog();
        renderErrorDialog();
        if (!dialog.open) dialog.showModal();
        return repeated.id;
      }
      record.fingerprint = fingerprint;
      appendDiagnostic("error_reported", { id: record.id, trace_id: record.context.trace_id || record.diagnostics.trace_id || "", message: record.message, category: record.category, source: record.context.source });
      record.related_logs = relatedDiagnosticLogs(record);
      errorQueue.push(record);
      if (errorQueue.length > 50) errorQueue.shift();
      errorQueueIndex = errorQueue.length - 1;
      const dialog = ensureErrorDialog();
      renderErrorDialog();
      if (!dialog.open) dialog.showModal();
      dialog.querySelector("[data-error-report-copy]")?.focus();
      return record.id;
    }

    function onWindowError(event) {
      reportGlobalError(event.error || event.message, { source: "window_error", filename: event.filename || "", line: event.lineno || 0, column: event.colno || 0 });
    }

    function onUnhandledRejection(event) {
      reportGlobalError(event.reason, { source: "unhandled_rejection" });
    }

    function onExternalError(event) {
      const detail = event.detail && typeof event.detail === "object" ? event.detail : {};
      const error = detail.error instanceof Error ? detail.error : new Error(String(detail.message || detail.error || "request_failed"));
      if (detail.diagnostics) error.betterCodexDiagnostics = detail.diagnostics;
      reportGlobalError(error, { source: detail.source || "host", ...diagnosticValue(detail.context || {}) });
    }

    function errorLabel(error) {
      const value = error instanceof Error ? error.message : String(error || "request_failed");
      const serviceLabel = serviceFailureLabel(error);
      if (serviceLabel) return serviceLabel;
      if (value === "thread_open_timeout" || value === "thread_open_unconfirmed") return t("对话仍在加载，请稍后重试。");
      if (value === "thread_id_invalid") return t("对话链接无效。");
      if (value === "issue_execution_running") return t("任务正在执行，请先等待完成。");
      if (value === "issue_enrichment_pending") return t("任务仍在整理中，请稍后再编辑。");
      if (value === "issue_execution_locked") return t("已经执行过对话的 Issue 只能修改状态、优先级和指派人。");
      if (value === "issue_session_handed_off") return t("请前往会话继续对话");
      if (value === "issue_session_starting") return t("原生会话正在创建，请稍后重试。");
      if (value === "manual_start_required") return t("当前为手动运行，请先点击“立即开始任务”。");
      if (value === "backlog_reply_blocked") return t("待规划中的 Issue 不会自动触发任务，请先移出待规划区。");
      if (value === "project_required") return t("无法确定会话所属项目。请先把会话放入一个项目。");
      if (value === "project_operation_running") return t("项目正在运行或生成内容，请等待完成后再删除。");
      if (["codex_state_invalid", "codex_projects_invalid"].includes(value)) return t("Codex 项目清单无法读取，未删除任何内容。");
      if (["codex_project_not_found", "codex_project_ambiguous"].includes(value)) return t("Codex 项目清单中找不到这个项目，未删除任何内容。");
      if (value === "project_delete_rollback_failed") return t("项目删除失败，Codex 项目清单也未能自动恢复，请立即检查 Codex 项目列表。");
      if (value === "issue_description_too_long") return t("任务内容超过长度限制，请缩短内容或作为附件上传。");
      if (value === "browser_transport_failed") return t("网络连接不稳定，正在等待恢复。");
      if (["runtime_response_invalid", "invalid_projects_response", "invalid_issues_response", "invalid_agents_response"].includes(value)) return t("列表数据暂时无法读取，请稍后重试。");
      if (value === "issue_archived") return t("该会话对应的 Issue 已归档，请先取消归档。");
      if (["project_planning_busy", "project_planning_agent_locked", "project_planning_unavailable", "project_planning_invalid_output", "project_planning_session_missing"].includes(value)) return projectPlanningErrorLabel(value);
      if (["project_overview_timeout", "project_overview_unavailable", "project_document_invalid_output", "remote_command_timeout", "workspace_missing"].includes(value)) return projectDocumentErrorLabel(value);
      if (value === "version_conflict" || value === "queued_reply_update_conflict") return t("内容已在其他窗口更新，请重新加载后再试。");
      const presentation = errorPresentation(error);
      if (presentation.category === "not_found") return t("相关内容不存在或已被移除。");
      if (presentation.category === "authorization") return t("当前账号没有执行此操作的权限。");
      if (presentation.category === "validation") return t("输入内容不符合要求，请检查后重试。");
      if (presentation.category === "conflict" || presentation.category === "state") return t("当前状态无法完成此操作，请刷新后重试。");
      if (presentation.category === "availability") return t("服务暂时不可用，请稍后重试。");
      if (presentation.category === "protocol") return t("服务返回的数据格式异常，请稍后重试。");
      if (presentation.category === "integrity") return t("数据完整性检查失败，操作已停止。");
      if (presentation.category === "security") return t("安全校验失败，操作已停止。");
      if (presentation.category === "service") return t("服务发生异常，请稍后重试。");
      return t(value);
    }

    const availabilityErrorCodes = new Set([
      "browser_transport_failed", "project_overview_timeout", "project_overview_unavailable", "project_planning_unavailable", "remote_command_timeout", "reply_network_error", "runtime_bridge_timeout", "runtime_bridge_unavailable", "runtime_offline", "runtime_stopped", "runtime_unavailable", "thread_open_timeout", "thread_open_unconfirmed", "update_check_failed"
    ]);
    const stateErrorCodes = new Set([
      "backlog_reply_blocked", "command_rejected", "issue_archived", "issue_enrichment_pending", "issue_not_startable", "issue_session_handed_off", "issue_session_starting", "manual_start_required", "project_document_invalid_output", "project_operation_running", "project_planning_invalid_output", "project_planning_session_missing", "project_required", "remote_mode_disabled", "session_relay_not_leader", "thread_id_invalid", "workspace_missing"
    ]);
    const validationErrorCodes = new Set([
      "body_too_large"
    ]);
    const informationalErrorCodes = new Set([
      "hub_update_not_configured", "issue_not_running", "remote_read_only", "update_not_available"
    ]);
    const protocolErrorCodes = new Set([
      "invalid_agents_response", "invalid_directory_response", "invalid_issues_response", "invalid_profile_response", "invalid_projects_response", "runtime_response_invalid", "update_not_accepted"
    ]);
    const integrityErrorCodes = new Set([
      "compatibility_activation_version_mismatch", "compatibility_manifest_mismatch", "core_activation_version_mismatch", "core_health_validation_failed", "core_validation_failed", "core_version_mismatch", "database_integrity_check_failed", "project_delete_rollback_failed", "runtime_restart_timeout", "update_activation_interrupted", "update_asset_invalid", "update_compatibility_invalid", "update_core_invalid", "update_manifest_invalid", "update_runtime_stop_timeout"
    ]);
    const securityErrorCodes = new Set([
      "update_hash_invalid", "update_hash_mismatch", "update_https_required", "update_public_key_unavailable", "update_signature_invalid"
    ]);

    function errorPresentation(error, context = {}) {
      const code = String(error instanceof Error ? error.message : error || "request_failed");
      const lowered = code.toLowerCase();
      const status = Number(error?.betterCodexDiagnostics?.http_status || 0);
      if (context.source === "conversation" && context.origin === "turn") return { category: "conversation", tone: "warning", report: false };
      if (availabilityErrorCodes.has(code) || transientNetworkError(error) || ["runtime_fetch_failed", "relay_stream_interrupted"].includes(code) || code.startsWith("runtime_fetch_failed:") || code.startsWith("update_http_") || ["network", "econn", "enotfound", "dns", "socket"].some(marker => lowered.includes(marker))) return { category: "availability", tone: "warning", report: false };
      if (securityErrorCodes.has(code)) return { category: "security", tone: "danger", report: true };
      if (integrityErrorCodes.has(code) || code.startsWith("update_activation_failed:")) return { category: "integrity", tone: "danger", report: true };
      if (protocolErrorCodes.has(code)) return { category: "protocol", tone: "danger", report: true };
      if (code === "database_unavailable") return { category: "service", tone: "danger", report: true };
      if (validationErrorCodes.has(code) || code.startsWith("native_command_argument_required:") || code.endsWith("_value_invalid") || code === "native_command_invalid" || code.startsWith("请选择") || code.startsWith("图片") || code.startsWith("最多传输") || code.startsWith("当前环境无法") || code.startsWith("创建智能体 Issue 需要本地工作区") || code.startsWith("展示")) return { category: "validation", tone: "danger", report: false };
      if (informationalErrorCodes.has(code)) return { category: "state", tone: "info", report: false };
      if (code.endsWith("_not_found") || status === 404) return { category: "not_found", tone: "info", report: false };
      if (code === "unauthorized" || code === "forbidden" || status === 401 || status === 403) return { category: "authorization", tone: "warning", report: false };
      if (code.endsWith("_conflict") || code.endsWith("_busy") || code.endsWith("_locked") || code.endsWith("_running") || code.endsWith("_in_progress") || status === 409) return { category: "conflict", tone: "warning", report: false };
      if (stateErrorCodes.has(code) || code.endsWith("_pending") || code.endsWith("_starting") || code.endsWith("_handed_off")) return { category: "state", tone: "warning", report: false };
      if (status === 400 || status === 413 || status === 422) return { category: "validation", tone: "danger", report: false };
      if (status >= 400 && status < 500) return { category: "state", tone: "warning", report: false };
      if (status >= 500) return { category: "service", tone: "danger", report: true };
      return { category: "unexpected", tone: "danger", report: true };
    }

    function reportUnexpectedError(error, context = {}) {
      const presentation = errorPresentation(error, context);
      const allowReport = context.report !== false;
      const reportContext = { ...context };
      delete reportContext.report;
      if (allowReport && presentation.report) reportGlobalError(error, reportContext);
      else appendDiagnostic("user_feedback", { category: presentation.category, tone: presentation.tone, message: error instanceof Error ? error.message : String(error || "request_failed"), source: reportContext.source || "ui_action", action: reportContext.action || "", origin: reportContext.origin || "" });
      return { ...presentation, report: allowReport && presentation.report };
    }

    function presentInlineError(output, error, message, context = {}) {
      const presentation = reportUnexpectedError(error, context);
      if (!output) return presentation;
      output.dataset.tone = presentation.tone;
      output.textContent = message || errorLabel(error);
      output.hidden = false;
      return presentation;
    }

    function updateErrorLabel(error) {
      let value = error instanceof Error ? error.message : String(error || "update_install_failed");
      if (value.startsWith("update_activation_failed:")) value = value.slice("update_activation_failed:".length);
      if (value === "reply_busy" || value === "issue_execution_running") return t("有任务正在运行，请等待任务结束后再更新。");
      if (value === "update_in_progress") return t("更新正在进行中，请稍候。");
      if (value === "hub_update_not_configured") return t("当前部署尚未启用在线升级。");
      if (value === "core_version_mismatch" || value === "compatibility_manifest_mismatch") return t("下载的更新版本与发布版本不一致，请稍后重试。");
      if (value === "core_validation_failed" || value === "core_health_validation_failed" || value === "update_asset_invalid" || value === "update_manifest_invalid" || value === "update_compatibility_invalid" || value === "update_core_invalid") return t("更新包验证失败，已保留当前版本。");
      if (value === "core_activation_version_mismatch" || value === "compatibility_activation_version_mismatch") return t("更新后的版本验证失败，已恢复到上一版本。");
      if (value === "update_runtime_stop_timeout" || value === "runtime_restart_timeout") return t("Better Codex 重启超时，已恢复到上一版本。");
      if (value.startsWith("update_http_") || value === "update_check_failed") return t("无法下载更新，请检查网络后重试。");
      if (value === "update_public_key_unavailable" || value === "update_https_required" || value === "update_hash_invalid" || value === "update_hash_mismatch" || value === "update_signature_invalid") return t("更新包安全校验失败，已保留当前版本。");
      if (value === "update_activation_interrupted") return t("更新进程意外中断，已恢复到上一版本。");
      return t("更新失败，请稍后重试。");
    }

    function showError(error) {
      if (destroyed) return;
      passiveNetworkErrorVisible = false;
      const presentation = reportUnexpectedError(error, { source: "ui_action" });
      state.error = errorLabel(error);
      const output = panel?.querySelector("#better-codex-error");
      if (output) {
        output.dataset.tone = presentation.tone;
        output.textContent = state.error;
        output.hidden = false;
      }
    }

    function showPassiveNetworkError() {
      if (state.error && !passiveNetworkErrorVisible) return;
      passiveNetworkErrorVisible = true;
      state.error = t("网络连接不稳定，正在等待恢复。");
      const output = panel?.querySelector("#better-codex-error");
      if (output) {
        output.dataset.tone = "warning";
        output.textContent = state.error;
        output.hidden = false;
      }
    }

    function clearPassiveNetworkError() {
      if (!passiveNetworkErrorVisible) return;
      clearError();
    }

    function clearError() {
      passiveNetworkErrorVisible = false;
      state.error = "";
      const output = panel?.querySelector("#better-codex-error");
      if (output) {
        delete output.dataset.tone;
        output.textContent = "";
        output.hidden = true;
      }
    }

    function needsServiceRecovery(error) {
      const value = error instanceof Error ? error.message : String(error || "");
      return ["invalid_bridge_request", "runtime_bridge_unavailable", "runtime_bridge_timeout", "runtime_unavailable"].includes(value);
    }

    function showServiceRecovery(error) {
      if (!panel) return;
      clearError();
      panel.dataset.recovery = "true";
      const recovery = panel.querySelector("#better-codex-recovery");
      const detail = recovery?.querySelector("[data-recovery-error]");
      const retry = recovery?.querySelector("[data-recovery-retry]");
      if (detail) detail.textContent = error instanceof Error ? error.message : String(error || "runtime_unavailable");
      if (retry) {
        retry.disabled = false;
        retry.innerHTML = icon("refresh") + "<span>" + te("重新连接") + "</span>";
      }
      if (recovery) recovery.hidden = false;
    }

    function hideServiceRecovery() {
      if (!panel) return;
      delete panel.dataset.recovery;
      const recovery = panel.querySelector("#better-codex-recovery");
      if (recovery) recovery.hidden = true;
    }

    function syncCompletionNoticePosition() {
      if (!completionNoticeStack?.isConnected) return;
      const updateOffset = updateNotice?.isConnected ? updateNotice.getBoundingClientRect().height + 24 : 16;
      completionNoticeStack.style.bottom = updateOffset + "px";
    }

    function dismissUpdate(version) {
      dismissedUpdateVersion = version;
      sessionStorage.setItem("better-codex-dismissed-update", version);
      updateNoticeResizeObserver?.disconnect();
      updateNoticeResizeObserver = null;
      updateNotice?.remove();
      updateNotice = null;
      syncCompletionNoticePosition();
    }

    function ignoreUpdate(version) {
      ignoredUpdateVersion = version;
      localStorage.setItem("better-codex-ignored-update", version);
      updateNoticeResizeObserver?.disconnect();
      updateNoticeResizeObserver = null;
      updateNotice?.remove();
      updateNotice = null;
      syncCompletionNoticePosition();
    }

    async function waitForUpdateCompletion(notice, updateId) {
      const deadline = Date.now() + 30 * 60 * 1000;
      const title = notice.querySelector(".better-codex-update-title");
      const description = notice.querySelector(".better-codex-update-description");
      while (!destroyed && updateNotice === notice && Date.now() < deadline) {
        await new Promise(resolve => setTimeout(resolve, 500));
        let update;
        try {
          update = await api("/api/update?update_id=" + encodeURIComponent(updateId), { passive: true });
        } catch (reason) {
          if (destroyed || updateNotice !== notice) return;
          if (transientNetworkError(reason)) continue;
          throw reason;
        }
        if (updateNotice !== notice) return;
        const operationStatus = String(update?.operation?.status || "");
        if (operationStatus === "FAILED") throw new Error(String(update?.operation?.error_code || update.error || "update_failed"));
        if (operationStatus === "ROLLED_BACK") throw new Error(String(update?.operation?.error_code || update.error || "update_rolled_back"));
        if (operationStatus === "COMPLETED") {
          localStorage.removeItem("better-codex-active-update-id");
          localStorage.removeItem("better-codex-update-request-key");
          notice.dataset.status = "current";
          title.textContent = t("Better Codex 已是最新版本");
          description.textContent = REMOTE ? t("远程服务升级完成。") : t("更新已完成。");
          notice.querySelector(".better-codex-update-actions").remove();
          if (REMOTE && typeof window.betterCodexHost?.reloadAfterUpdate === "function") {
            window.betterCodexHost.reloadAfterUpdate();
            return;
          }
          setTimeout(() => {
            if (updateNotice !== notice) return;
            notice.remove();
            updateNotice = null;
            updateNoticeResizeObserver?.disconnect();
            updateNoticeResizeObserver = null;
            syncCompletionNoticePosition();
          }, 1800);
          return;
        }
        if (["RESTARTING_RUNTIME", "REPLAYING", "RECONCILING", "SERVING_READY", "ROLLING_BACK"].includes(operationStatus)) {
          notice.dataset.status = "restarting";
          title.textContent = t(operationStatus === "ROLLING_BACK" ? "正在恢复 Better Codex" : "正在切换 Better Codex Runtime");
          description.textContent = t(operationStatus === "ROLLING_BACK" ? "新版本未能接管，正在恢复上一版本；运行中的会话不会被中断。" : "Runtime 正在接管，运行中的会话会继续执行。");
        } else if (operationStatus === "WAITING_FOR_HOST_DRAIN" || operationStatus === "HANDOFF_READY") {
          notice.dataset.status = "installing";
          title.textContent = t("正在安全交接会话");
          description.textContent = t("正在等待命令落盘并准备 Runtime 接管，运行中的会话会继续执行。");
        } else {
          notice.dataset.status = "installing";
          title.textContent = t("正在更新 Better Codex");
          description.textContent = REMOTE ? t("正在备份并升级远程服务，请不要关闭页面。") : t("正在下载并校验新版本，请保持 Codex 打开。");
        }
      }
      if (!destroyed && updateNotice === notice) throw new Error("runtime_bridge_timeout");
    }

    function renderUpdateNotice(update, force = false) {
      const version = String(update?.latestVersion || "");
      const activationError = update?.status === "error" && String(update?.error || "").startsWith("update_activation_failed:");
      const installError = update?.status === "error" && updateNotice?.dataset.status === "install-error";
      const activeInstall = ["installing", "restarting", "current"].includes(updateNotice?.dataset.status || "");
      const noticeVersion = activationError ? String(update?.currentVersion || "activation-error") + ":" + String(update?.checkedAt || Date.now()) : version;
      if (!activationError && (update?.status !== "available" || !version)) {
        if (installError || activeInstall) return;
        if (!["checking", "installing", "restarting"].includes(update?.status)) {
          updateNoticeResizeObserver?.disconnect();
          updateNoticeResizeObserver = null;
          updateNotice?.remove();
          updateNotice = null;
          syncCompletionNoticePosition();
        }
        return;
      }
      if (!force && (dismissedUpdateVersion === noticeVersion || ignoredUpdateVersion === noticeVersion)) return;
      if (updateNotice?.dataset.version === noticeVersion && updateNotice.dataset.status === (activationError ? "error" : "available")) return;
      if (activationError) reportGlobalError(new Error(String(update.error || "update_activation_failed")), { source: "update_activation" });
      updateNoticeResizeObserver?.disconnect();
      updateNoticeResizeObserver = null;
      updateNotice?.remove();
      updateNotice = document.createElement("section");
      updateNotice.id = "better-codex-update-notice";
      updateNotice.dataset.version = noticeVersion;
      updateNotice.dataset.status = activationError ? "error" : "available";
      updateNotice.setAttribute(OWNED, "true");
      updateNotice.setAttribute("role", "status");
      updateNotice.setAttribute("aria-live", "polite");
      const updateDescription = REMOTE
        ? "v" + version + " 已可用。升级期间正在运行的会话会继续执行。"
        : "v" + version + " 已可用。Runtime 会安全切换，正在运行的会话会继续执行。";
      updateNotice.innerHTML = '<button class="better-codex-update-menu-toggle" type="button" aria-label="' + escapeHtml(t("更多操作")) + '" aria-expanded="false" aria-haspopup="menu" data-update-menu-toggle>' + icon("more") + '</button><div class="better-codex-update-menu" data-update-menu hidden><button type="button" role="menuitem" data-update-ignore>' + escapeHtml(t("忽略当前版本")) + '</button></div><button class="better-codex-update-close" type="button" aria-label="' + escapeHtml(t("稍后提醒")) + '">' + icon("close") + '</button><div class="better-codex-update-layout"><span class="better-codex-update-icon">' + icon("refresh") + '</span><div class="better-codex-update-copy"><p class="better-codex-update-title">' + escapeHtml(t("Better Codex 有新版本")) + '</p><p class="better-codex-update-description">' + escapeHtml(t(updateDescription)) + '</p><p class="better-codex-update-error" hidden></p></div><div class="better-codex-update-actions"><button class="better-codex-update-button" type="button" data-update-later>' + escapeHtml(t("稍后")) + '</button><button class="better-codex-update-button is-primary" type="button" data-update-install>' + escapeHtml(t("立即更新")) + '</button></div></div>';
      document.body.appendChild(updateNotice);
      updateNoticeResizeObserver = new ResizeObserver(syncCompletionNoticePosition);
      updateNoticeResizeObserver.observe(updateNotice);
      syncCompletionNoticePosition();
      const notice = updateNotice;
      const menuToggle = notice.querySelector("[data-update-menu-toggle]");
      const menu = notice.querySelector("[data-update-menu]");
      let menuHandle;
      const closeMenu = () => {
        menuHandle.update({ onClose: closeMenu, open: false, trigger: menuToggle });
      };
      menuHandle = adoptMenu(menu, { onClose: closeMenu, open: false, trigger: menuToggle }, componentContext("update-notice", "update-menu:" + noticeVersion));
      registerOwnedComponent(menu, menuHandle);
      const noticeHandle = adoptNotice(notice, { dismissible: true, message: updateDescription, onDismiss: () => dismissUpdate(noticeVersion), tone: activationError ? "error" : "info" }, componentContext("update-notice", "update-notice:" + noticeVersion));
      registerOwnedComponent(notice, noticeHandle);
      menuToggle.addEventListener("click", event => {
        event.stopPropagation();
        menuHandle.update({ onClose: closeMenu, open: menu.hidden, trigger: menuToggle });
      });
      menu.querySelector("[data-update-ignore]").addEventListener("click", () => {
        closeMenu();
        ignoreUpdate(noticeVersion);
      });
      updateNotice.querySelector(".better-codex-update-close").addEventListener("click", () => dismissUpdate(noticeVersion));
      updateNotice.querySelector("[data-update-later]").addEventListener("click", () => dismissUpdate(noticeVersion));
      if (activationError) {
        updateNotice.querySelector(".better-codex-update-title").textContent = t("更新未完成");
        updateNotice.querySelector(".better-codex-update-description").textContent = t("Better Codex 已恢复到上一版本。");
        updateNotice.querySelector(".better-codex-update-error").textContent = updateErrorLabel(update.error);
        updateNotice.querySelector(".better-codex-update-error").hidden = false;
        updateNotice.querySelector("[data-update-install]").textContent = t("重试");
      }
      updateNotice.querySelector("[data-update-install]").addEventListener("click", async event => {
        const install = event.currentTarget;
        const close = notice.querySelector(".better-codex-update-close");
        const ignore = notice.querySelector("[data-update-ignore]");
        const later = notice.querySelector("[data-update-later]");
        const title = notice.querySelector(".better-codex-update-title");
        const description = notice.querySelector(".better-codex-update-description");
        const error = notice.querySelector(".better-codex-update-error");
        notice.dataset.status = "installing";
        install.disabled = true;
        menuToggle.disabled = true;
        close.disabled = true;
        ignore.disabled = true;
        later.disabled = true;
        install.textContent = t("正在更新");
        title.textContent = t("正在更新 Better Codex");
        description.textContent = t("正在升级 Better Codex。正在运行的会话会继续执行，新任务会在升级完成后开始。");
        error.hidden = true;
        try {
          const requestKey = localStorage.getItem("better-codex-update-request-key") || crypto.randomUUID();
          localStorage.setItem("better-codex-update-request-key", requestKey);
          const result = await api("/api/update/install", { method: "POST", body: JSON.stringify({ idempotency_key: requestKey }), timeoutMs: 45000 });
          if (updateNotice !== notice) return;
          if (result?.accepted !== true || typeof result?.update_id !== "string") throw new Error("update_not_accepted");
          localStorage.setItem("better-codex-active-update-id", result.update_id);
          await waitForUpdateCompletion(notice, result.update_id);
        } catch (reason) {
          if (updateNotice !== notice) return;
          window.betterCodexHost?.cancelUpdateRecovery?.("update_install_failed");
          reportUnexpectedError(reason, { source: "update_install" });
          notice.dataset.status = "install-error";
          install.disabled = false;
          menuToggle.disabled = false;
          close.disabled = false;
          ignore.disabled = false;
          later.disabled = false;
          install.textContent = t("重试");
          title.textContent = t("更新未完成");
          description.textContent = t("Better Codex 保持当前版本运行。");
          error.textContent = updateErrorLabel(reason);
          error.hidden = false;
          localStorage.removeItem("better-codex-active-update-id");
          localStorage.removeItem("better-codex-update-request-key");
        }
      });
    }

    async function checkUpdateNotice() {
      try {
        renderUpdateNotice(await api("/api/update", { passive: true }));
        clearPassiveNetworkError();
      } catch (error) {
        if (transientNetworkError(error)) showPassiveNetworkError();
      }
    }

    function completionNoticeSuppressed() {
      return sessionStorage.getItem("better-codex-completion-notice-disabled") === "true";
    }

    function completionNoticeDuration() {
      const duration = Number(localStorage.getItem(COMPLETION_DURATION_KEY) || 5000);
      return [0, 1000, 5000, 10000].includes(duration) ? duration : 5000;
    }

    function readCompletionNoticeCache() {
      try {
        const records = JSON.parse(localStorage.getItem(COMPLETION_NOTICE_CACHE_KEY) || "[]");
        if (!Array.isArray(records)) return [];
        return records.filter(record => record
          && typeof record.key === "string"
          && record.issue
          && typeof record.issue.id === "string"
          && Number.isFinite(record.createdAt)
          && [0, 1000, 5000, 10000].includes(record.duration))
          .map(record => ({ ...record, issue: completionNoticeSnapshot(record.issue) }));
      } catch {
        return [];
      }
    }

    function writeCompletionNoticeCache(records) {
      try {
        localStorage.setItem(COMPLETION_NOTICE_CACHE_KEY, JSON.stringify(records.slice(-COMPLETION_NOTICE_CACHE_LIMIT)));
      } catch {
      }
    }

    function forgetCompletionNotice(key) {
      writeCompletionNoticeCache(readCompletionNoticeCache().filter(record => record.key !== key));
    }

    function completionNoticeSnapshot(issue) {
      return {
        id: String(issue?.id || ""),
        identifier: String(issue?.identifier || ""),
        title: String(issue?.title || ""),
        status: String(issue?.status || ""),
        agent_id: typeof issue?.agent_id === "string" ? issue.agent_id : null,
        updated_at: String(issue?.updated_at || ""),
      };
    }

    function cacheCompletionNotice(issue, duration) {
      const snapshot = completionNoticeSnapshot(issue);
      const key = snapshot.id + ":" + (snapshot.updated_at || Date.now()) + ":" + snapshot.status;
      const record = { key, issue: snapshot, createdAt: Date.now(), duration };
      const records = readCompletionNoticeCache().filter(item => item.key !== key);
      records.push(record);
      writeCompletionNoticeCache(records);
      return record;
    }

    function restoreCompletionNotices() {
      const now = Date.now();
      const records = readCompletionNoticeCache().filter(record => (record.duration === 0 || now - record.createdAt < record.duration)
        && state.issues.some(issue => issue.id === record.issue.id));
      writeCompletionNoticeCache(records);
      records.forEach(record => {
        if (completionNoticeSuppressed() && record.duration !== 0) return;
        const issue = state.issues.find(item => item.id === record.issue.id);
        if (!issue) return;
        renderSessionEndNotice(issue, record);
      });
    }

    function renderSessionEndNotice(issue, cachedNotice = null) {
      if (!cachedNotice && completionNoticeSuppressed()) return;
      const duration = cachedNotice?.duration ?? completionNoticeDuration();
      const permanent = duration === 0;
      if (cachedNotice && completionNoticeSuppressed() && !permanent) return;
      const cached = cachedNotice || cacheCompletionNotice(issue, duration);
      const remaining = permanent ? 0 : duration - (Date.now() - cached.createdAt);
      if (!permanent && remaining <= 0) {
        forgetCompletionNotice(cached.key);
        return;
      }
      if (completionNoticeStack?.querySelector('[data-notice-key="' + CSS.escape(cached.key) + '"]')) return;
      if (!completionNoticeStack?.isConnected) {
        completionNoticeStack = document.createElement("div");
        completionNoticeStack.id = "better-codex-completion-notices";
        completionNoticeStack.setAttribute(OWNED, "true");
        document.body.appendChild(completionNoticeStack);
      }
      if (completionNoticeStack.children.length >= COMPLETION_NOTICE_CACHE_LIMIT) {
        const oldest = completionNoticeStack.firstElementChild;
        completionNoticeDismissals.get(oldest)?.(false);
      }
      syncCompletionNoticePosition();
      const previousPositions = new Map(Array.from(completionNoticeStack.children, item => [item, item.getBoundingClientRect().top]));
      const notice = document.createElement("section");
      notice.className = "better-codex-completion-notice";
      notice.dataset.status = String(issue?.status || "");
      notice.dataset.noticeKey = cached.key;
      notice.dataset.permanent = String(permanent);
      notice.setAttribute(OWNED, "true");
      notice.setAttribute("role", "status");
      notice.setAttribute("aria-live", "polite");
      const identifier = String(issue?.identifier || "").trim();
      const title = String(issue?.title || "").trim();
      const subject = [identifier, title].filter(Boolean).join(" ");
      const status = t(statusLabels[issue?.status] || String(issue?.status || ""));
      const completionAgent = state.agents.find(agent => agent.id === issue?.agent_id) || state.agents.find(agent => agent.is_default) || { name: "Codex", is_default: true };
      notice.innerHTML = '<div class="better-codex-completion-layout">' + agentAvatarMarkup(completionAgent, "better-codex-completion-avatar") + '<p class="better-codex-completion-message">' + escapeHtml(subject || t("会话已结束")) + '</p><span class="better-codex-completion-status">' + escapeHtml(status) + '</span></div><button class="better-codex-completion-menu-toggle" type="button" aria-label="' + escapeHtml(t("更多操作")) + '" aria-expanded="false" aria-haspopup="menu" data-completion-menu-toggle>' + icon("more") + '</button><div class="better-codex-completion-menu" data-completion-menu hidden><button type="button" role="menuitem" data-completion-suppress>' + escapeHtml(t("本次启动关闭")) + '</button></div><button class="better-codex-completion-close" type="button" aria-label="' + escapeHtml(t("关闭")) + '">' + icon("close") + '</button>';
      completionNoticeStack.appendChild(notice);
      requestAnimationFrame(() => previousPositions.forEach((top, item) => {
        if (!item.isConnected) return;
        const offset = top - item.getBoundingClientRect().top;
        if (offset) item.animate([{ transform: "translateY(" + offset + "px)" }, { transform: "translateY(0)" }], { duration: 280, easing: "cubic-bezier(.16,1,.3,1)" });
      }));
      const menuToggle = notice.querySelector("[data-completion-menu-toggle]");
      const menu = notice.querySelector("[data-completion-menu]");
      let menuDismiss = null;
      const closeMenu = () => {
        menu.hidden = true;
        menuToggle.setAttribute("aria-expanded", "false");
        if (menuDismiss) document.removeEventListener("pointerdown", menuDismiss, true);
        menuDismiss = null;
      };
      const closeMenuOutside = event => {
        if (!menu.contains(event.target) && event.target !== menuToggle) closeMenu();
      };
      menuToggle.addEventListener("click", event => {
        event.stopPropagation();
        if (!menu.hidden) return closeMenu();
        menu.hidden = false;
        menuToggle.setAttribute("aria-expanded", "true");
        menuDismiss = closeMenuOutside;
        setTimeout(() => document.addEventListener("pointerdown", closeMenuOutside, true), 0);
      });
      menu.querySelectorAll("[data-completion-suppress]").forEach(button => button.addEventListener("click", () => {
        sessionStorage.setItem("better-codex-completion-notice-disabled", "true");
        closeMenu();
        completionNoticeDismissals.forEach((dismissNotice, currentNotice) => {
          if (currentNotice.dataset.permanent !== "true") dismissNotice(true);
        });
      }));
      const dismiss = (forget = true) => {
        if (!notice.isConnected) return;
        closeMenu();
        const timer = completionNoticeTimers.get(notice);
        if (timer !== undefined) clearTimeout(timer);
        completionNoticeTimers.delete(notice);
        completionNoticeDismissals.delete(notice);
        if (forget) forgetCompletionNotice(cached.key);
        notice.remove();
        if (!completionNoticeDismissals.size) {
          completionNoticeStack?.remove();
          completionNoticeStack = null;
        }
      };
      completionNoticeDismissals.set(notice, dismiss);
      notice.addEventListener("click", event => {
        if (event.target.closest("button")) return;
        dismiss(true);
        void perform(() => openEditor(issue));
      });
      notice.querySelector(".better-codex-completion-close").addEventListener("click", () => dismiss(true));
      if (!permanent) completionNoticeTimers.set(notice, setTimeout(() => dismiss(true), remaining));
    }

    async function perform(action, options = {}) {
      if (!options.background) clearError();
      try {
        const result = await action();
        if (options.background) clearPassiveNetworkError();
        return result;
      } catch (error) {
        if (options.background && transientNetworkError(error)) {
          showPassiveNetworkError();
          return null;
        }
        showError(error);
        return null;
      }
    }

    function onGlobalShortcut(event) {
      if (!active || !panel || panel.hidden || event.isComposing) return;
      const target = event.target;
      if (target?.closest?.("dialog") || target?.closest?.("input,textarea,select,[contenteditable='true']")) return;
      const shortcut = readCreateIssueShortcut();
      if (!shortcut || shortcutFromKeyboardEvent(event) !== shortcut) return;
      event.preventDefault();
      event.stopPropagation();
      closeCreateMenu();
      void perform(() => openEditor());
    }

    function bindModalDismiss(dialog, dismiss) {
      dialog.addEventListener("click", event => {
        if (event.target !== dialog) return;
        const bounds = dialog.getBoundingClientRect();
        const outside = event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom;
        if (outside) dismiss();
      });
    }

    function confirmAction(title, message, confirmLabel = "确认") {
      document.getElementById("better-codex-confirm")?.remove();
      return new Promise(resolve => {
        const content = document.createElement("div");
        const body = document.createElement("div");
        body.className = "better-codex-confirm-body";
        const heading = document.createElement("h2");
        heading.className = "better-codex-confirm-title";
        heading.textContent = t(title);
        const copy = document.createElement("p");
        copy.className = "better-codex-confirm-message";
        copy.textContent = t(message);
        body.append(heading, copy);
        const actions = document.createElement("div");
        actions.className = "better-codex-confirm-actions";
        let settled = false;
        let dialogHandle;
        const finish = value => {
          if (settled) return;
          settled = true;
          dialogHandle.destroy();
          resolve(value);
        };
        const cancel = createButton({ label: t("取消"), onPress: () => finish(false), variant: "secondary" }, componentContext("confirmation", "confirm-cancel:" + (++managedButtonSequence)));
        cancel.element.dataset.confirmCancel = "true";
        const accept = createButton({ label: t(confirmLabel), onPress: () => finish(true), variant: "danger" }, componentContext("confirmation", "confirm-accept:" + (++managedButtonSequence)));
        accept.element.classList.add("better-codex-confirm-primary");
        accept.element.dataset.confirmAccept = "true";
        actions.append(cancel.element, accept.element);
        content.append(body, actions);
        dialogHandle = createDialog({ accessibleName: t(title), content, initialFocus: cancel.element, onRequestClose: () => finish(false) }, componentContext("confirmation", "confirm-dialog:" + (++managedButtonSequence)));
        dialogHandle.element.id = "better-codex-confirm";
        dialogHandle.element.setAttribute(OWNED, "true");
        registerOwnedComponent(cancel.element, cancel);
        registerOwnedComponent(accept.element, accept);
        registerOwnedComponent(dialogHandle.element, dialogHandle);
      });
    }

    function openArchiveDialog(scopeProjectId = "") {
      document.getElementById("better-codex-archive-dialog")?.remove();
      const dialog = document.createElement("dialog");
      dialog.id = "better-codex-archive-dialog";
      dialog.setAttribute(OWNED, "true");
      dialog.innerHTML = '<div class="better-codex-archive-shell"><header><h1>' + te("已归档任务") + '</h1><button class="better-codex-archive-delete-all" type="button" data-archive-delete-all>' + icon("trash") + '<span>' + te("全部删除") + '</span></button></header><div class="better-codex-archive-toolbar"><label class="better-codex-archive-search">' + icon("search") + '<input type="search" data-archive-search placeholder="' + te("搜索已归档任务") + '"></label><button class="better-codex-archive-filter better-codex-archive-project-filter" type="button" data-archive-project aria-haspopup="menu" aria-expanded="false">' + icon("folder") + '<span data-archive-project-label>' + te("所有项目") + '</span>' + icon("chevronDown") + '</button></div><div class="better-codex-archive-list" data-archive-list><div class="better-codex-archive-empty">' + te("加载中…") + '</div></div></div>';
      const finish = () => {
        dialog.close();
        dialog.remove();
      };
      dialog.addEventListener("cancel", event => { event.preventDefault(); finish(); });
      bindModalDismiss(dialog, finish);
      document.body.appendChild(dialog);
      dialog.showModal();
      const search = dialog.querySelector("[data-archive-search]");
      const projectSelect = dialog.querySelector("[data-archive-project]");
      const projectLabelOutput = dialog.querySelector("[data-archive-project-label]");
      let projectId = scopeProjectId;
      let projectOptions = [];
      let archivedIssues = [];
      const collapsedProjects = new Set();
      const formatDate = value => {
        const date = new Date(value);
        if (!Number.isFinite(date.getTime())) return "";
        if (state.locale !== "zh-CN") return date.toLocaleString();
        return date.getFullYear() + "年" + (date.getMonth() + 1) + "月" + date.getDate() + "日，" + date.getHours() + ":" + String(date.getMinutes()).padStart(2, "0");
      };
      const archiveTime = issue => {
        const value = Date.parse(issue.archived_at || issue.updated_at || issue.created_at || "");
        return Number.isFinite(value) ? value : 0;
      };
      const render = () => {
        const query = String(search.value || "").trim().toLowerCase();
        const visible = archivedIssues.filter(issue => {
          const text = [issue.identifier, issue.title, issue.description, ...(Array.isArray(issue.labels) ? issue.labels : [])].join(" ").toLowerCase();
          return (!query || text.includes(query)) && (!projectId || issue.project_id === projectId);
        }).sort((left, right) => archiveTime(right) - archiveTime(left) || String(right.id).localeCompare(String(left.id)));
        const groups = new Map();
        visible.forEach(issue => {
          const key = issue.project_id || "";
          if (!groups.has(key)) groups.set(key, []);
          groups.get(key).push(issue);
        });
        const list = dialog.querySelector("[data-archive-list]");
        if (!list) return;
        const content = [...groups.entries()].map(([key, issues]) => {
          const project = state.projects.find(item => item.id === key);
          const name = projectLabel(project) || t("无项目");
          const collapsed = collapsedProjects.has(key);
          const rows = issues.map(issue => '<article class="better-codex-archive-row"><div class="better-codex-archive-row-copy"><strong>' + escapeHtml(issue.title || issue.identifier) + '</strong><span>' + escapeHtml(formatDate(issue.archived_at || issue.updated_at)) + '</span></div><div class="better-codex-archive-row-actions"><button class="better-codex-archive-trash" type="button" data-archive-delete="' + escapeHtml(issue.id) + '" data-archive-version="' + escapeHtml(issue.version) + '" aria-label="' + te("删除已归档聊天") + '" title="' + te("删除已归档聊天") + '">' + icon("trash") + '</button><button class="better-codex-archive-restore" type="button" data-archive-restore="' + escapeHtml(issue.id) + '" data-archive-version="' + escapeHtml(issue.version) + '"><span>' + te("取消归档") + '</span></button></div></article>').join("");
          return '<section class="better-codex-archive-group"><div class="better-codex-archive-group-head"><button class="better-codex-archive-project-name" type="button" data-archive-group-toggle="' + escapeHtml(key) + '" aria-expanded="' + String(!collapsed) + '">' + icon(collapsed ? "folder" : "permissionWorkspace") + '<strong>' + escapeHtml(name) + '</strong></button><span class="better-codex-archive-project-count">' + te(issues.length + " 个任务") + '</span><button class="better-codex-archive-more" type="button" data-archive-project-more="' + escapeHtml(key) + '" aria-label="' + te("更多操作") + '" title="' + te("更多操作") + '">' + icon("more") + '</button></div><div class="better-codex-archive-card"' + (collapsed ? " hidden" : "") + '>' + rows + '</div></section>';
        }).join("");
        list.innerHTML = content ? content + '<div class="better-codex-archive-end-spacer" aria-hidden="true"></div>' : '<div class="better-codex-archive-empty">' + te("暂无已归档卡片") + '</div>';
      };
      const load = async () => {
        try {
          archivedIssues = await requestList("/api/issues?archived=1" + (scopeProjectId ? "&project_id=" + encodeURIComponent(scopeProjectId) : ""), "issues");
          const projects = projectsByRecentActivity(state.projects.filter(project => archivedIssues.some(issue => issue.project_id === project.id)), archivedIssues);
          projectOptions = projects;
          if (scopeProjectId) {
            projectSelect.hidden = true;
            projectLabelOutput.textContent = projectLabel(state.projects.find(project => project.id === scopeProjectId)) || t("当前项目");
          }
          render();
        } catch {
          const list = dialog.querySelector("[data-archive-list]");
          if (list) list.innerHTML = '<div class="better-codex-archive-empty">' + te("归档列表加载失败") + '</div>';
        }
      };
      const restoreArchivedIssue = issue => {
        if (!archivedIssues.some(item => item.id === issue.id)) archivedIssues.push(issue);
        if (dialog.isConnected) render();
      };
      const settleArchivedRemoval = (issue, commandId, attempt = 0) => {
        const delays = [1000, 2000, 5000, 10000, 30000, 120000, 600000];
        setTimeout(async () => {
          try {
            const result = await api("/api/commands/" + encodeURIComponent(commandId));
            if (result?.queued === true || ["pending", "dispatched", "processing"].includes(result?.status)) return settleArchivedRemoval(issue, commandId, attempt + 1);
            if (["rejected", "conflict", "expired"].includes(result?.status)) restoreArchivedIssue(issue);
          } catch (error) {
            if (error instanceof Error && ["command_not_found", "runtime_offline", "runtime_unavailable", "runtime_bridge_timeout", "relay_stream_interrupted", "request_outcome_unknown"].includes(error.message)) return settleArchivedRemoval(issue, commandId, attempt + 1);
            restoreArchivedIssue(issue);
          }
        }, delays[Math.min(attempt, delays.length - 1)]);
      };
      const deleteArchivedIssue = async issue => {
        archivedIssues = archivedIssues.filter(item => item.id !== issue.id);
        render();
        try {
          const result = await api("/api/issues/" + encodeURIComponent(issue.id), { method: "DELETE", body: JSON.stringify({ version: Number(issue.version) }) });
          if (result?.queued === true && result.command_id) settleArchivedRemoval(issue, result.command_id);
        } catch (error) {
          restoreArchivedIssue(issue);
          throw error;
        }
      };
      search.addEventListener("input", render);
      dialog.addEventListener("click", event => {
        const projectToggle = event.target.closest("[data-archive-group-toggle]");
        const projectOption = event.target.closest("[data-archive-project-option]");
        const projectMore = event.target.closest("[data-archive-project-more]");
        const projectDeleteAll = event.target.closest("[data-archive-project-delete]");
        const restore = event.target.closest("[data-archive-restore]");
        const remove = event.target.closest("[data-archive-delete]");
        const deleteAll = event.target.closest("[data-archive-delete-all]");
        if (projectToggle) {
          const key = projectToggle.dataset.archiveGroupToggle || "";
          if (collapsedProjects.has(key)) collapsedProjects.delete(key);
          else collapsedProjects.add(key);
          return render();
        }
        if (projectOption) {
          projectId = projectOption.dataset.archiveProjectOption || "";
          projectLabelOutput.textContent = projectId ? projectOptions.find(project => project.id === projectId)?.name || t("所有项目") : t("所有项目");
          dialog.querySelector("[data-archive-project-menu]")?.remove();
          projectSelect.setAttribute("aria-expanded", "false");
          return render();
        }
        if (projectMore) {
          const openMenu = projectMore.nextElementSibling;
          if (openMenu?.matches("[data-archive-project-menu]")) {
            openMenu.remove();
            return;
          }
          dialog.querySelectorAll("[data-archive-project-menu]").forEach(menu => menu.remove());
          search.blur();
          projectMore.focus({ preventScroll: true });
          const menu = document.createElement("div");
          menu.className = "better-codex-archive-project-menu better-codex-archive-group-menu";
          menu.setAttribute("data-archive-project-menu", "true");
          menu.innerHTML = '<button class="is-danger" type="button" data-archive-project-delete="' + escapeHtml(projectMore.dataset.archiveProjectMore || "") + '">' + icon("trash") + '<span>' + te("删除项目中的全部内容") + '</span></button>';
          projectMore.after(menu);
          return;
        }
        if (event.target.closest("[data-archive-project]")) {
          const openMenu = dialog.querySelector(".better-codex-archive-project-menu:not(.better-codex-archive-group-menu)");
          if (openMenu) {
            openMenu.remove();
            projectSelect.setAttribute("aria-expanded", "false");
            return;
          }
          dialog.querySelectorAll("[data-archive-project-menu]").forEach(menu => menu.remove());
          search.blur();
          projectSelect.focus({ preventScroll: true });
          projectSelect.setAttribute("aria-expanded", "true");
          const menu = document.createElement("div");
          menu.className = "better-codex-archive-project-menu";
          menu.setAttribute("data-archive-project-menu", "true");
          menu.setAttribute("role", "menu");
          menu.innerHTML = '<button type="button" data-archive-project-option="">' + te("所有项目") + '</button>' + projectOptions.map(project => '<button type="button" data-archive-project-option="' + escapeHtml(project.id) + '">' + escapeHtml(projectLabel(project)) + '</button>').join("");
          projectSelect.after(menu);
          return;
        }
        if (projectDeleteAll) {
          const targetProjectId = projectDeleteAll.dataset.archiveProjectDelete || "";
          const targetIssues = archivedIssues.filter(issue => (issue.project_id || "") === targetProjectId);
          return void confirmAction("删除任务", "确定删除项目中的全部已归档任务吗？", "删除").then(confirmed => confirmed && perform(async () => {
            for (const issue of targetIssues) await deleteArchivedIssue(issue);
          }));
        }
        if (restore) return void perform(async () => {
          await api("/api/issues/" + encodeURIComponent(restore.dataset.archiveRestore) + "/unarchive", { method: "POST", body: JSON.stringify({ version: Number(restore.dataset.archiveVersion) }) });
          await loadIssues();
          await load();
        });
        if (remove) return void confirmAction("删除任务", "确定删除任务 “" + remove.dataset.archiveDelete + "” 吗？", "删除").then(confirmed => confirmed && perform(async () => {
          const issue = archivedIssues.find(item => item.id === remove.dataset.archiveDelete);
          if (issue) await deleteArchivedIssue(issue);
        }));
        if (deleteAll) return void confirmAction("删除任务", "确定删除所有已归档任务吗？", "删除").then(confirmed => confirmed && perform(async () => {
          for (const issue of [...archivedIssues]) await deleteArchivedIssue(issue);
        }));
        if (!event.target.closest("[data-archive-project-menu]")) {
          dialog.querySelectorAll("[data-archive-project-menu]").forEach(menu => menu.remove());
          projectSelect.setAttribute("aria-expanded", "false");
        }
      });
      void load();
    }

    function codexLogo() {
      const gradientId = "better-codex-logo-gradient-" + (++codexLogoSequence);
      return '<svg viewBox="0 0 24 24" width="36" height="36" role="img" aria-label="Codex"><path d="M19.503 0H4.496A4.496 4.496 0 000 4.496v15.007A4.496 4.496 0 004.496 24h15.007A4.496 4.496 0 0024 19.503V4.496A4.496 4.496 0 0019.503 0z" fill="var(--bc-color-on-avatar)"></path><path d="M9.064 3.344a4.578 4.578 0 012.285-.312c1 .115 1.891.54 2.673 1.275.01.01.024.017.037.021a.09.09 0 00.043 0 4.55 4.55 0 013.046.275l.047.022.116.057a4.581 4.581 0 012.188 2.399c.209.51.313 1.041.315 1.595a4.24 4.24 0 01-.134 1.223.123.123 0 00.03.115c.594.607.988 1.33 1.183 2.17.289 1.425-.007 2.71-.887 3.854l-.136.166a4.548 4.548 0 01-2.201 1.388.123.123 0 00-.081.076c-.191.551-.383 1.023-.74 1.494-.9 1.187-2.222 1.846-3.711 1.838-1.187-.006-2.239-.44-3.157-1.302a.107.107 0 00-.105-.024c-.388.125-.78.143-1.204.138a4.441 4.441 0 01-1.945-.466 4.544 4.544 0 01-1.61-1.335c-.152-.202-.303-.392-.414-.617a5.81 5.81 0 01-.37-.961 4.582 4.582 0 01-.014-2.298.124.124 0 00.006-.056.085.085 0 00-.027-.048 4.467 4.467 0 01-1.034-1.651 3.896 3.896 0 01-.251-1.192 5.189 5.189 0 01.141-1.6c.337-1.112.982-1.985 1.933-2.618.212-.141.413-.251.601-.33.215-.089.43-.164.646-.227a.098.098 0 00.065-.066 4.51 4.51 0 01.829-1.615 4.535 4.535 0 011.837-1.388zm3.482 10.565a.637.637 0 000 1.272h3.636a.637.637 0 100-1.272h-3.636zM8.462 9.23a.637.637 0 00-1.106.631l1.272 2.224-1.266 2.136a.636.636 0 101.095.649l1.454-2.455a.636.636 0 00.005-.64L8.462 9.23z" fill="url(#' + gradientId + ')"></path><defs><linearGradient gradientUnits="userSpaceOnUse" id="' + gradientId + '" x1="12" x2="12" y1="3" y2="21"><stop stop-color="var(--bc-logo-gradient-start)"></stop><stop offset=".5" stop-color="var(--bc-logo-gradient-middle)"></stop><stop offset="1" stop-color="var(--bc-logo-gradient-end)"></stop></linearGradient></defs></svg>';
    }

    function betterCodexLogo() {
      return '<img src="' + BETTER_CODEX_LOGO_URL + '" alt="Better Codex">';
    }

    function githubLogo() {
      return '<svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true"><path fill="currentColor" d="M12 .7a11.5 11.5 0 00-3.64 22.4c.58.1.79-.25.79-.56v-2.23c-3.22.7-3.9-1.37-3.9-1.37-.52-1.34-1.28-1.7-1.28-1.7-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.57-.29-5.27-1.28-5.27-5.68 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.16 1.18A10.96 10.96 0 0112 6.11c.98 0 1.96.13 2.88.39 2.2-1.49 3.16-1.18 3.16-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.83 1.19 3.09 0 4.41-2.71 5.38-5.29 5.67.42.36.79 1.07.79 2.16v3.25c0 .31.21.67.8.56A11.5 11.5 0 0012 .7z"></path></svg>';
    }

    function icon(name, className = "", strokeWidth = "1.7") {
      const definition = LUCIDE_ICONS[name];
      if (!definition) return "";
      const classes = "lucide lucide-" + definition.name + (className ? " " + escapeHtml(className) : "");
      return '<svg class="' + classes + '" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="' + escapeHtml(strokeWidth) + '" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + definition.nodes + '</svg>';
    }

    function statusIcon(status) {
      const names = { backlog: "statusBacklog", todo: "statusTodo", in_progress: "statusInProgress", in_review: "statusInReview", done: "statusDone", blocked: "statusBlocked", archive: "archive" };
      const markup = icon(names[status] || "statusTodo", "better-codex-status-icon", "2.35");
      return markup.replace("<svg ", '<svg data-status="' + escapeHtml(status) + '" ');
    }

    function mockupRunStatusIcon(status) {
      return icon(status === "completed" ? "check" : status === "failed" || status === "interrupted" ? "close" : status === "running" ? "statusInProgress" : "circle", "better-codex-status-icon");
    }

    function priorityIcon(priority) {
      const names = { none: "priorityNone", low: "priorityLow", medium: "priorityMedium", high: "priorityHigh", urgent: "priorityUrgent" };
      const markup = icon(names[priority] || "priorityNone", "better-codex-priority", "2.35");
      return markup.replace("<svg ", '<svg data-priority="' + escapeHtml(priority) + '" ');
    }

    function timeAgo(value) {
      const seconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
      if (seconds < 60) return state.locale === "zh-CN" ? "刚刚" : "Just now";
      const unit = seconds < 3600 ? "minute" : seconds < 86400 ? "hour" : "day";
      const amount = Math.floor(seconds / (unit === "minute" ? 60 : unit === "hour" ? 3600 : 86400));
      if (state.locale !== "zh-CN") return amount + " " + unit + (amount === 1 ? "" : "s") + " ago";
      return amount + (unit === "minute" ? " 分钟前" : unit === "hour" ? " 小时前" : " 天前");
    }

    function issueMatchesFilters(issue) {
      const filters = state.filters;
      if (filters.status.length && !filters.status.includes(issue.status)) return false;
      if (filters.priority.length && !filters.priority.includes(issue.priority)) return false;
      if (filters.project.length && !filters.project.includes(issue.project_id)) return false;
      if (filters.label.length && !filters.label.some(value => (issue.labels || []).includes(value))) return false;
      if (filters.assignee.length) {
        const assignee = issue.agent_enabled
          ? issue.agent_id || "codex"
          : issue.user_assigned ? "user:" + String(issue.assignee_user_id || state.user.id || "default") : "none";
        if (!filters.assignee.includes(assignee)) return false;
      }
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

    function closeCreateMenu(restoreFocus = false) {
      const menu = panel?.querySelector(".better-codex-create-menu");
      const toggle = panel?.querySelector("[data-create-menu-toggle]");
      menu?.remove();
      toggle?.setAttribute("aria-expanded", "false");
      if (createMenuDismiss) {
        document.removeEventListener("pointerdown", createMenuDismiss, true);
        document.removeEventListener("keydown", createMenuDismiss, true);
      }
      createMenuDismiss = null;
      if (restoreFocus) toggle?.focus();
    }

    function openCreateMenu(trigger) {
      if (panel?.querySelector(".better-codex-create-menu")) return closeCreateMenu(true);
      closeFilterMenu();
      const menu = document.createElement("div");
      menu.className = "better-codex-create-menu";
      menu.setAttribute("role", "menu");
      menu.setAttribute(OWNED, "true");
      const project = document.createElement("button");
      project.type = "button";
      project.className = "better-codex-create-menu-item";
      project.setAttribute("role", "menuitem");
      project.innerHTML = icon("folder") + "<span>" + escapeHtml(t("创建新项目")) + "</span>";
      project.addEventListener("click", event => {
        event.stopPropagation();
        closeCreateMenu();
        openCreateProjectDialog();
      });
      menu.append(project);
      trigger.closest(".better-codex-create-split")?.append(menu);
      trigger.setAttribute("aria-expanded", "true");
      createMenuDismiss = event => {
        if (event.type === "keydown") {
          if (event.key === "Escape") closeCreateMenu(true);
          return;
        }
        if (!menu.contains(event.target) && !trigger.contains(event.target)) closeCreateMenu();
      };
      setTimeout(() => {
        document.addEventListener("pointerdown", createMenuDismiss, true);
        document.addEventListener("keydown", createMenuDismiss, true);
      }, 0);
    }

    function filterOptions(key) {
      if (key === "status") return Object.entries(statusLabels).map(([value, text]) => ({ value, text: t(text) }));
      if (key === "priority") return Object.entries(priorityLabels).map(([value, text]) => ({ value, text: t(value === "none" ? "无优先级" : text + "优先级") }));
      if (key === "date") return [{ value: "1", text: t("最近 24 小时") }, { value: "7", text: t("最近 7 天") }, { value: "30", text: t("最近 30 天") }];
      if (key === "assignee") return [...state.users.filter(user => !user.disabled).map(user => ({ value: "user:" + user.id, text: user.name || user.handle })), { value: "codex", text: "Codex" }, ...state.agents.filter(agent => !agent.is_default).map(agent => ({ value: agent.id, text: agentDisplayName(agent) })), { value: "none", text: t("未分配") }];
      if (key === "project") return projectsByRecentActivity(state.projects).map(project => ({ value: project.id, text: projectLabel(project) }));
      if (key === "label") return [...new Set(state.issues.flatMap(issue => issue.labels || []))].map(value => ({ value, text: value }));
      return [];
    }

    function filterOptionIcon(key, value) {
      if (key === "status") return statusIcon(value);
      if (key === "priority") return priorityIcon(value);
      if (key === "assignee") {
        if (value.startsWith("user:")) {
          const user = state.users.find(item => item.id === value.slice(5)) || state.user;
          return userAvatarMarkup(user, "better-codex-filter-avatar");
        }
        if (value === "none") return '<span class="better-codex-filter-avatar is-fallback">' + icon("user") + '</span>';
        const agent = value === "codex"
          ? state.agents.find(item => item.is_default) || { name: "Codex", is_default: true }
          : state.agents.find(item => item.id === value);
        return agentAvatarMarkup(agent, "better-codex-filter-avatar");
      }
      const names = { date: "calendar", assignee: "user", project: "folder", label: "tag" };
      return icon(names[key] || "circle");
    }

    function openFilterMenu(trigger) {
      if (panel?.querySelector(".better-codex-filter-menu")) return closeFilterMenu();
      closeFilterMenu();
      const categories = [
        { key: "status", text: "状态", icon: "circle" },
        { key: "priority", text: "优先级", icon: "display" },
        { key: "date", text: "日期", icon: "calendar" },
        { key: "assignee", text: "负责人", icon: "user" },
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
        const openLeft = menu.getBoundingClientRect().left >= 194;
        submenu.style.right = openLeft ? "calc(100% + 4px)" : "auto";
        submenu.style.left = openLeft ? "auto" : "calc(100% + 4px)";
        if (!options.length) {
          submenu.innerHTML = '<div class="better-codex-filter-row"><span class="better-codex-filter-label">' + escapeHtml(t("暂无可选项")) + '</span></div>';
        } else {
          for (const option of options) {
            const selected = state.filters[key].includes(option.value);
            const item = document.createElement("button");
            item.type = "button";
            item.className = "better-codex-filter-row";
            item.innerHTML = '<span class="better-codex-filter-visual">' + filterOptionIcon(key, option.value) + '</span><span class="better-codex-filter-label">' + escapeHtml(option.text) + '</span><span class="better-codex-filter-check">' + (selected ? icon("check") : "") + "</span>";
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
        row.innerHTML = icon(category.icon) + '<span class="better-codex-filter-label">' + escapeHtml(t(category.text)) + '</span>' + (count ? '<span class="better-codex-filter-count">' + count + "</span>" : "") + '<span class="better-codex-filter-chevron">' + icon("chevron") + "</span>";
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
        reset.innerHTML = '<span class="better-codex-filter-label">' + escapeHtml(t("清除筛选")) + '</span>';
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
      try {
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(value);
          return;
        }
      } catch {}
      const input = document.createElement("textarea");
      input.value = value;
      input.style.position = "fixed";
      input.style.opacity = "0";
      document.body.appendChild(input);
      input.select();
      const copied = document.execCommand("copy");
      input.remove();
      if (!copied) throw new Error("clipboard_write_failed");
    }

    async function stopIssueSession(issueId) {
      const issue = state.issues.find(item => item.id === issueId);
      const updated = await api("/api/issues/" + encodeURIComponent(issueId) + "/stop", { method: "POST", body: JSON.stringify({ version: issue?.version }) });
      await loadIssues();
      return state.issues.find(issue => issue.id === issueId) || updated;
    }

    function openIssueMenuAt(card, clientX, clientY) {
      const issue = state.issues.find(item => item.id === card?.dataset.issueId);
      if (!issue) return;
      closeFilterMenu();
      closeIssueMenu();
      const project = state.projects.find(item => item.id === issue.project_id);
      const workspacePath = issue.workspace_path || project?.workspace_path || readContext().workspacePath;
      const permissions = issuePermissions(issue);
      const contextLockAttrs = permissions.contextLocked ? ' disabled aria-disabled="true"' : "";
      const contextLockClass = permissions.contextLocked ? " is-disabled" : "";
      const archiveLockAttrs = permissions.archiveLocked ? ' disabled aria-disabled="true"' : "";
      const deleteLockAttrs = permissions.archiveLocked || permissions.executionRunning ? ' disabled aria-disabled="true"' : "";
      const stopItem = permissions.executionRunning ? '<div class="better-codex-context-divider"></div><button class="better-codex-context-item is-danger" type="button" data-context-action="stop">' + icon("stop") + '<span>' + escapeHtml(t("停止任务")) + '</span></button>' : "";
      const regenerateTitleItem = state.mockup ? "" : '<div class="better-codex-context-divider"></div><button class="better-codex-context-item" type="button"' + contextLockAttrs + ' data-context-action="regenerate-title">' + icon("sparkles") + '<span>' + escapeHtml(t("重新生成标题")) + '</span></button>';
      const statusItems = Object.entries(statusLabels).map(([value, text]) => '<button class="better-codex-context-item" type="button"' + contextLockAttrs + ' data-context-action="update" data-context-field="status" data-context-value="' + value + '"><span class="better-codex-context-check">' + (issue.status === value ? icon("check") : "") + '</span>' + statusIcon(value) + '<span>' + escapeHtml(t(text)) + "</span></button>").join("");
      const priorityItems = Object.entries(priorityLabels).map(([value, text]) => '<button class="better-codex-context-item" type="button"' + contextLockAttrs + ' data-context-action="update" data-context-field="priority" data-context-value="' + value + '"><span class="better-codex-context-check">' + (issue.priority === value ? icon("check") : "") + '</span>' + priorityIcon(value) + '<span>' + escapeHtml(t(value === "none" ? "无优先级" : text + "优先级")) + "</span></button>").join("");
      const assignedUser = issueUserProfile(issue);
      const noneSelected = !issue.user_assigned && !issue.agent_enabled;
      const contextAssigneeTags = agent => agentConfigTags(agent).map(tag => '<span class="better-codex-context-tag" data-tone="' + escapeHtml(tag.tone) + '">' + escapeHtml(tag.value) + (tag.fast ? fastMark() : "") + '</span>').join("");
      const contextAssigneeLabel = (name, tags = "") => '<span class="better-codex-context-assignee-label"><span class="better-codex-context-assignee-name">' + escapeHtml(name) + '</span>' + tags + '</span>';
      const unassignedAvatar = '<span class="better-codex-context-avatar is-fallback">' + icon("user") + '</span>';
      const assigneeItems = [
        '<button class="better-codex-context-item" type="button"' + contextLockAttrs + ' data-context-action="assign" data-assignee-kind="none"><span class="better-codex-context-check">' + (noneSelected ? icon("check") : "") + '</span>' + unassignedAvatar + contextAssigneeLabel(t("未指派")) + '</button>',
        ...state.users.filter(user => !user.disabled).map(user => {
          const selected = Boolean(issue.user_assigned) && !issue.agent_enabled && String(assignedUser?.id || "") === String(user.id || "");
          return '<button class="better-codex-context-item" type="button"' + contextLockAttrs + ' data-context-action="assign" data-assignee-kind="user" data-context-user-id="' + escapeHtml(user.id || "") + '"><span class="better-codex-context-check">' + (selected ? icon("check") : "") + '</span>' + userAvatarMarkup(user, "better-codex-context-avatar") + contextAssigneeLabel(user.name || user.handle || t("协作者")) + '</button>';
        }),
        ...state.agents.map(agent => {
          const selected = Boolean(issue.agent_enabled) && (agent.is_default ? !issue.agent_id : issue.agent_id === agent.id);
          return '<button class="better-codex-context-item" type="button"' + contextLockAttrs + ' data-context-action="assign" data-assignee-kind="agent" data-context-agent-id="' + escapeHtml(agent.id || "") + '"><span class="better-codex-context-check">' + (selected ? icon("check") : "") + '</span>' + agentAvatarMarkup(agent, "better-codex-context-avatar") + contextAssigneeLabel(agentDisplayName(agent), contextAssigneeTags(agent)) + '</button>';
        }),
      ].join("");
      const menu = document.createElement("div");
      menu.id = "better-codex-context-menu";
      menu.setAttribute(OWNED, "true");
      menu.dataset.issueId = issue.id;
      menu.dataset.align = clientX + 430 > window.innerWidth ? "left" : "right";
      menu.innerHTML = '<div class="better-codex-context-item-wrap' + contextLockClass + '"><button class="better-codex-context-item" type="button"' + contextLockAttrs + '>' + statusIcon(issue.status) + '<span>' + escapeHtml(t("状态")) + '</span>' + icon("chevron") + '</button><div class="better-codex-context-submenu">' + statusItems + '</div></div><div class="better-codex-context-item-wrap' + contextLockClass + '"><button class="better-codex-context-item" type="button"' + contextLockAttrs + '>' + priorityIcon(issue.priority) + '<span>' + escapeHtml(t("优先级")) + '</span>' + icon("chevron") + '</button><div class="better-codex-context-submenu">' + priorityItems + '</div></div><div class="better-codex-context-item-wrap' + contextLockClass + '"><button class="better-codex-context-item" type="button"' + contextLockAttrs + '>' + icon("user") + '<span>' + escapeHtml(t("指定负责人")) + '</span>' + icon("chevron") + '</button><div class="better-codex-context-submenu is-assignee">' + assigneeItems + '</div></div>' + stopItem + (workspacePath ? '<div class="better-codex-context-divider"></div><button class="better-codex-context-item" type="button" data-context-action="copy-workspace">' + icon("folder") + '<span>' + escapeHtml(t("复制本地 workdir 路径")) + '</span></button>' : "") + regenerateTitleItem + '<div class="better-codex-context-divider"></div><button class="better-codex-context-item" type="button"' + archiveLockAttrs + ' data-context-action="archive">' + icon("archive") + '<span>' + escapeHtml(t("归档")) + '</span></button>' + (state.mockup ? "" : '<button class="better-codex-context-item is-danger" type="button"' + deleteLockAttrs + ' data-context-action="delete">' + icon("trash") + '<span>' + escapeHtml(t("删除任务")) + '</span></button>');
      document.body.appendChild(menu);
      const rect = menu.getBoundingClientRect();
      menu.style.left = Math.max(8, Math.min(clientX, window.innerWidth - rect.width - 8)) + "px";
      menu.style.top = Math.max(8, Math.min(clientY, window.innerHeight - rect.height - 8)) + "px";

      async function assignIssue(kind, agentId = "", userId = "") {
        const current = state.issues.find(candidate => candidate.id === menu.dataset.issueId);
        if (!current) return closeIssueMenu();
        const alreadyUser = kind === "user" && current.user_assigned && !current.agent_enabled && String(issueUserProfile(current)?.id || "") === userId;
        const alreadyNone = kind === "none" && !current.user_assigned && !current.agent_enabled;
        const alreadyAgent = kind === "agent" && current.agent_enabled && (agentId ? current.agent_id === agentId : !current.agent_id);
        if (alreadyUser || alreadyNone || alreadyAgent) return closeIssueMenu();
        closeIssueMenu();
        const body = kind === "user"
          ? { version: current.version, user_assigned: true, assignee_user_id: REMOTE ? userId || null : null, agent_enabled: false, agent_id: "" }
          : kind === "agent"
            ? { version: current.version, user_assigned: false, assignee_user_id: null, agent_enabled: true, agent_id: agentId }
            : { version: current.version, user_assigned: false, assignee_user_id: null, agent_enabled: false, agent_id: "" };
        await perform(async () => {
          await api("/api/issues/" + encodeURIComponent(current.id), { method: "PATCH", body: JSON.stringify(body) });
          await loadIssues();
        });
      }

      menu.addEventListener("click", clickEvent => {
        const item = clickEvent.target.closest("[data-context-action]");
        if (!item || !menu.contains(item)) return;
        clickEvent.preventDefault();
        clickEvent.stopPropagation();
        const current = state.issues.find(candidate => candidate.id === menu.dataset.issueId);
        if (!current) return closeIssueMenu();
        const currentPermissions = issuePermissions(current);
        if (currentPermissions.contextLocked && (item.dataset.contextAction === "update" || item.dataset.contextAction === "assign" || item.dataset.contextAction === "regenerate-title")) return closeIssueMenu();
        if (currentPermissions.archiveLocked && item.dataset.contextAction === "archive") return closeIssueMenu();
        if ((currentPermissions.archiveLocked || currentPermissions.executionRunning) && item.dataset.contextAction === "delete") return closeIssueMenu();
        if (item.dataset.contextAction === "copy-workspace") {
          closeIssueMenu();
          return void perform(() => copyText(workspacePath));
        }
        if (item.dataset.contextAction === "stop") {
          closeIssueMenu();
          return void perform(() => stopIssueSession(current.id));
        }
        if (item.dataset.contextAction === "regenerate-title") {
          closeIssueMenu();
          return void perform(async () => {
            await api("/api/issues/" + encodeURIComponent(current.id) + "/regenerate-title", { method: "POST", body: JSON.stringify({ version: current.version }) });
            await loadIssues();
          });
        }
        if (item.dataset.contextAction === "duplicate") {
          closeIssueMenu();
          return void perform(async () => {
            await api("/api/issues", { method: "POST", body: JSON.stringify({ ...current, title: current.title + " " + t("副本") }) });
            await loadIssues();
          });
        }
        if (item.dataset.contextAction === "archive") {
          closeIssueMenu();
          return void perform(async () => {
            await api("/api/issues/" + encodeURIComponent(current.id) + "/archive", { method: "POST", body: JSON.stringify({ version: current.version }) });
            await loadIssues();
          });
        }
        if (item.dataset.contextAction === "delete") {
          closeIssueMenu();
          return void confirmAction("删除任务", "确定删除任务 “" + current.title + "” 吗？", "删除").then(confirmed => confirmed && perform(async () => {
            await api("/api/issues/" + encodeURIComponent(current.id), { method: "DELETE", body: JSON.stringify({ version: current.version }) });
            await loadIssues();
          }));
        }
        if (item.dataset.contextAction === "assign") {
          const kind = item.getAttribute("data-assignee-kind") || "";
          const agentId = item.getAttribute("data-context-agent-id") || "";
          const userId = item.getAttribute("data-context-user-id") || "";
          return void assignIssue(kind, agentId, userId);
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

    function openIssueMenu(event) {
      const card = event.target.closest("[data-issue-id]");
      if (!card) return;
      event.preventDefault();
      event.stopPropagation();
      openIssueMenuAt(card, event.clientX, event.clientY);
    }

    function resetIssueLongPress() {
      if (issueLongPress?.timer) clearTimeout(issueLongPress.timer);
      issueLongPress = null;
    }

    function onIssueLongPressStart(event) {
      if (event.pointerType !== "touch" || event.isPrimary === false || event.button !== 0) return;
      const card = event.target.closest("[data-issue-id]");
      if (!card) return;
      resetIssueLongPress();
      const press = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, timer: null };
      press.timer = setTimeout(() => {
        if (issueLongPress !== press) return;
        suppressIssueClickUntil = Date.now() + 700;
        openIssueMenuAt(card, press.startX, press.startY);
        resetIssueLongPress();
      }, 500);
      issueLongPress = press;
    }

    function onIssueLongPressMove(event) {
      if (!issueLongPress || event.pointerId !== issueLongPress.pointerId) return;
      const deltaX = event.clientX - issueLongPress.startX;
      const deltaY = event.clientY - issueLongPress.startY;
      if (deltaX * deltaX + deltaY * deltaY > 64) resetIssueLongPress();
    }

    function onIssueLongPressEnd(event) {
      if (!issueLongPress || event.pointerId !== issueLongPress.pointerId) return;
      resetIssueLongPress();
    }

    function createPanel() {
      const nativeFrame = document.querySelector(SELECTORS.contentFrame);
      const section = document.createElement("section");
      section.id = PANEL_ID;
      section.className = nativeFrame?.className || "";
      section.dataset.host = HOST_KIND;
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
      for (const [view, text] of [["all", "全部"], ["assigned", "已分配"], ["unassigned", "未分配"]]) {
        const button = actionButton(text);
        button.dataset.view = view;
        button.setAttribute("aria-label", t(text));
        button.innerHTML = icon(view === "all" ? "board" : view === "assigned" ? "userCheck" : "userX", "better-codex-tab-icon") + "<span>" + te(text) + "</span>";
        button.addEventListener("click", () => { state.view = view; render(); });
        tabs.append(button);
      }
      const agentHeading = document.createElement("div");
      agentHeading.className = "better-codex-agent-heading";
      for (const [view, text] of [["all", "全部"], ["default", "默认"], ["custom", "自定义"]]) {
        const button = actionButton(text);
        button.dataset.agentView = view;
        button.addEventListener("click", () => { state.agentView = view; renderAgents(); });
        agentHeading.append(button);
      }
      const actions = document.createElement("div");
      actions.className = "better-codex-actions better-codex-issue-only";
      const working = actionButton("0 个智能体工作中");
      working.id = "better-codex-working";
      working.dataset.runningCount = "0";
      working.classList.add("better-codex-working-chip", "is-bordered");
      working.setAttribute("aria-label", t("0 个智能体工作中"));
      working.addEventListener("click", () => { state.view = state.view === "working" ? "all" : "working"; render(); });
      const searchWrap = document.createElement("div");
      searchWrap.className = "better-codex-search-wrap";
      searchWrap.innerHTML = icon("search");
      const search = document.createElement("input");
      search.id = "better-codex-search";
      search.className = "better-codex-search";
      search.placeholder = t("搜索任务");
      search.setAttribute("aria-label", t("搜索任务"));
      search.value = "";
      search.addEventListener("input", () => { state.search = search.value; void perform(loadIssues); });
      searchWrap.appendChild(search);
      const filter = actionButton("筛选");
      filter.id = "better-codex-filter";
      filter.classList.add("is-bordered");
      filter.setAttribute("aria-label", t("筛选"));
      filter.innerHTML = icon("filter") + "<span>" + te("筛选") + "</span>";
      filter.addEventListener("click", event => { event.stopPropagation(); openFilterMenu(filter); });
      const filterWrap = document.createElement("div");
      filterWrap.className = "better-codex-filter-wrap";
      filterWrap.appendChild(filter);
      const autoDispatchWrap = document.createElement("div");
      autoDispatchWrap.className = "better-codex-auto-dispatch-wrap";
      const autoDispatch = actionButton("");
      autoDispatch.id = "better-codex-auto-dispatch";
      autoDispatch.classList.add("better-codex-auto-dispatch", "is-bordered");
      autoDispatch.setAttribute("aria-pressed", "false");
      autoDispatch.setAttribute("aria-label", t("切换为自动运行"));
      autoDispatch.innerHTML = icon("user") + "<span>" + escapeHtml(t("手动运行")) + "</span>";
      autoDispatch.addEventListener("click", () => {
        if (state.autoDispatchPending) return;
        const next = !state.autoDispatch;
        state.autoDispatchPending = true;
        syncAutoDispatch();
        void perform(async () => {
          try {
            const result = await api("/api/settings/auto-dispatch", { method: "PATCH", body: JSON.stringify({ enabled: next }) });
            if (result.command_id) {
              const command = await waitForRemoteCommand(result.command_id);
              if (command.status !== "applied") throw new Error(command.error || "command_rejected");
              await loadAutoDispatch();
            } else state.autoDispatch = Boolean(result.enabled);
          } finally {
            state.autoDispatchPending = false;
            if (REMOTE) await loadAutoDispatch().catch(() => {});
            syncAutoDispatch();
          }
        });
      });
      const autoDispatchHelp = actionButton("");
      autoDispatchHelp.className = "better-codex-auto-dispatch-help";
      autoDispatchHelp.setAttribute("aria-label", t("帮助与设置"));
      autoDispatchHelp.innerHTML = icon("help");
      autoDispatchHelp.addEventListener("click", event => {
        event.stopPropagation();
        showAutoDispatchHelp();
      });
      autoDispatchWrap.append(autoDispatch, autoDispatchHelp);
      const addIssue = actionButton("新建 issue");
      addIssue.className = "better-codex-create-primary";
      addIssue.setAttribute("aria-label", t("新建 issue"));
      addIssue.innerHTML = icon("plus") + "<span>" + te("新建 issue") + "</span>";
      let addIssueLongPress = null;
      let suppressAddIssueClickUntil = 0;
      const resetAddIssueLongPress = () => {
        if (addIssueLongPress?.timer) clearTimeout(addIssueLongPress.timer);
        addIssueLongPress = null;
      };
      addIssue.addEventListener("click", event => {
        if (Date.now() < suppressAddIssueClickUntil) {
          suppressAddIssueClickUntil = 0;
          event.preventDefault();
          event.stopPropagation();
          return;
        }
        closeCreateMenu();
        void perform(() => openEditor());
      });
      if (HOST_KIND === "web") {
        addIssue.addEventListener("pointerdown", event => {
          if (event.pointerType !== "touch" || event.isPrimary === false || event.button !== 0) return;
          resetAddIssueLongPress();
          const press = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, timer: null };
          press.timer = setTimeout(() => {
            if (addIssueLongPress !== press) return;
            suppressAddIssueClickUntil = Date.now() + 700;
            openCreateMenu(createToggle);
            resetAddIssueLongPress();
          }, 500);
          addIssueLongPress = press;
        });
        addIssue.addEventListener("pointermove", event => {
          if (!addIssueLongPress || event.pointerId !== addIssueLongPress.pointerId) return;
          const deltaX = event.clientX - addIssueLongPress.startX;
          const deltaY = event.clientY - addIssueLongPress.startY;
          if (deltaX * deltaX + deltaY * deltaY > 64) resetAddIssueLongPress();
        });
        addIssue.addEventListener("pointerup", resetAddIssueLongPress);
        addIssue.addEventListener("pointercancel", resetAddIssueLongPress);
      }
      const createToggle = actionButton("");
      createToggle.id = "better-codex-create-toggle";
      createToggle.className = "better-codex-create-toggle";
      createToggle.dataset.createMenuToggle = "true";
      createToggle.setAttribute("aria-label", t("更多创建选项"));
      createToggle.setAttribute("aria-haspopup", "menu");
      createToggle.setAttribute("aria-expanded", "false");
      createToggle.innerHTML = icon("chevronDown");
      createToggle.addEventListener("click", event => {
        event.stopPropagation();
        openCreateMenu(createToggle);
      });
      const createSplit = document.createElement("div");
      createSplit.className = "better-codex-create-split";
      createSplit.append(addIssue, createToggle);
      actions.append(working, searchWrap, filterWrap, autoDispatchWrap, createSplit);
      const agentActions = document.createElement("div");
      agentActions.className = "better-codex-agent-actions";
      const addAgent = actionButton("新建智能体");
      addAgent.classList.add("is-bordered");
      addAgent.insertAdjacentHTML("afterbegin", icon("plus"));
      addAgent.addEventListener("click", () => startAgentCreate());
      agentActions.append(addAgent);
      const scheduledHeading = document.createElement("div");
      scheduledHeading.className = "better-codex-scheduled-heading";
      scheduledHeading.innerHTML = '<strong>' + te("定时任务") + '</strong><span data-scheduled-heading-meta></span>';
      const scheduledActions = document.createElement("div");
      scheduledActions.className = "better-codex-scheduled-actions";
      const addScheduledTask = actionButton("新建定时任务");
      addScheduledTask.classList.add("is-bordered");
      addScheduledTask.innerHTML = icon("plus") + '<span>' + te("新建定时任务") + '</span>';
      addScheduledTask.addEventListener("click", () => openScheduledTaskDialog());
      scheduledActions.append(addScheduledTask);
      const projectHeading = document.createElement("div");
      projectHeading.className = "better-codex-project-heading";
      projectHeading.innerHTML = '<strong>' + te("项目管理") + '</strong><span data-project-heading-meta></span>';
      projectHeading.addEventListener("click", onProjectsClick);
      const projectActions = document.createElement("div");
      projectActions.className = "better-codex-project-actions";
      projectRefreshButton = createIconButton(projectRefreshProps(), componentContext("projects", "projects-toolbar-refresh"));
      projectRefreshButton.element.classList.add("better-codex-project-refresh");
      const addProject = actionButton("创建项目");
      addProject.classList.add("is-bordered");
      addProject.insertAdjacentHTML("afterbegin", icon("plus"));
      addProject.addEventListener("click", () => state.projectDetailId ? openEditor() : openCreateProjectDialog());
      projectActions.append(projectRefreshButton.element, addProject);
      toolbar.append(tabs, scheduledHeading, agentHeading, projectHeading, error, actions, scheduledActions, agentActions, projectActions);
      const board = document.createElement("main");
      board.id = "better-codex-board";
      board.className = "better-codex-board better-codex-issue-only";
      board.addEventListener("click", onBoardClick);
      board.addEventListener("contextmenu", openIssueMenu);
      board.addEventListener("pointerdown", onIssueLongPressStart);
      board.addEventListener("pointermove", onIssueLongPressMove);
      board.addEventListener("pointerup", onIssueLongPressEnd);
      board.addEventListener("pointercancel", onIssueLongPressEnd);
      board.addEventListener("dragstart", onCardDragStart);
      board.addEventListener("dragend", onCardDragEnd);
      board.addEventListener("dragover", event => event.preventDefault());
      board.addEventListener("drop", onDrop);
      let boardScrollControl = null;
      if (HOST_KIND === "web") {
        boardScrollControl = document.createElement("div");
        boardScrollControl.className = "better-codex-board-scroll better-codex-issue-only";
        boardScrollControl.hidden = true;
        boardScrollControl.innerHTML = '<span class="is-start" aria-hidden="true">' + icon("chevron") + '</span><input type="range" min="0" max="0" value="0" step="1" aria-label="' + te("横向滚动任务看板") + '"><span aria-hidden="true">' + icon("chevron") + '</span>';
        const range = boardScrollControl.querySelector("input");
        range.addEventListener("input", () => {
          board.scrollLeft = Number(range.value);
        });
        board.addEventListener("scroll", syncBoardScrollControl, { passive: true });
        boardScrollResizeObserver?.disconnect();
        boardScrollResizeObserver = new ResizeObserver(syncBoardScrollControl);
        boardScrollResizeObserver.observe(board);
      }
      const recovery = document.createElement("main");
      recovery.id = "better-codex-recovery";
      recovery.className = "better-codex-recovery";
      recovery.hidden = true;
      recovery.innerHTML = '<section class="better-codex-recovery-card"><span class="better-codex-recovery-icon">' + icon("terminal") + '</span><h2>' + te("Better Codex 服务需要重启") + '</h2><p>' + te("当前页面与后台服务的连接已失效。请在终端运行下面的命令，完成后重新连接。") + '</p><div class="better-codex-recovery-command"><code>better-codex service restart</code><button type="button" data-recovery-copy>' + te("复制重启命令") + '</button></div><button class="better-codex-recovery-retry" type="button" data-recovery-retry>' + icon("refresh") + '<span>' + te("重新连接") + '</span></button><details><summary>' + te("错误详情") + '</summary><code data-recovery-error></code></details></section>';
      recovery.querySelector("[data-recovery-copy]").addEventListener("click", async event => {
        await copyText("better-codex service restart");
        const button = event.currentTarget;
        button.textContent = t("已复制");
        setTimeout(() => { if (button.isConnected) button.textContent = t("复制重启命令"); }, 1600);
      });
      recovery.querySelector("[data-recovery-retry]").addEventListener("click", event => {
        const button = event.currentTarget;
        button.disabled = true;
        button.innerHTML = icon("refresh") + "<span>" + te("正在连接…") + "</span>";
        void load();
      });
      const agents = document.createElement("main");
      agents.id = "better-codex-agents";
      agents.className = "better-codex-agents";
      agents.addEventListener("click", onAgentsClick);
      agents.addEventListener("pointerdown", onAgentInspectorResizeStart);
      agents.addEventListener("pointermove", onAgentInspectorResizeMove);
      agents.addEventListener("pointerup", finishAgentInspectorResize);
      agents.addEventListener("pointercancel", finishAgentInspectorResize);
      agents.addEventListener("keydown", event => {
        if (onAgentInspectorResizeKeydown(event)) return;
        if (event.key !== "Escape") return;
        const openPicker = agents.querySelector(".better-codex-agent-setting.is-open");
        if (!openPicker) return;
        openPicker.classList.remove("is-open");
        const trigger = openPicker.querySelector("[data-agent-picker-toggle]");
        trigger?.setAttribute("aria-expanded", "false");
        trigger?.focus();
      });
      agents.addEventListener("input", event => {
        if (event.target.matches("[data-agent-search]")) {
          state.agentSearch = event.target.value;
          renderAgents();
          const search = agents.querySelector("[data-agent-search]");
          if (search) { search.focus(); search.setSelectionRange(search.value.length, search.value.length); }
          return;
        }
        const form = event.target.closest('[data-agent-form]:not([data-agent-form="create"])');
        if (form && !event.isComposing) scheduleAgentAutosave(form, event.target.matches('input[type="checkbox"], input[type="number"]'));
      });
      agents.addEventListener("compositionend", event => {
        const form = event.target.closest('[data-agent-form]:not([data-agent-form="create"])');
        if (form) scheduleAgentAutosave(form);
      });
      agents.addEventListener("submit", onAgentSubmit);
      const scheduledTasks = document.createElement("main");
      scheduledTasks.id = "better-codex-scheduled";
      scheduledTasks.className = "better-codex-scheduled";
      scheduledTasks.addEventListener("click", onScheduledTasksClick);
      const projects = document.createElement("main");
      projects.id = "better-codex-projects";
      projects.className = "better-codex-projects";
      projects.addEventListener("click", onProjectsClick);
      projects.addEventListener("click", onBoardClick);
      projects.addEventListener("contextmenu", openIssueMenu);
      projects.addEventListener("pointerdown", onIssueLongPressStart);
      projects.addEventListener("pointermove", onIssueLongPressMove);
      projects.addEventListener("pointerup", onIssueLongPressEnd);
      projects.addEventListener("pointercancel", onIssueLongPressEnd);
      projects.addEventListener("dragstart", onCardDragStart);
      projects.addEventListener("dragend", onCardDragEnd);
      projects.addEventListener("dragover", event => {
        if (event.target.closest("[data-project-board]")) event.preventDefault();
      });
      projects.addEventListener("drop", event => {
        if (event.target.closest("[data-project-board]")) onDrop(event);
      });
      projects.addEventListener("input", event => {
        if (!event.target.matches("[data-project-planning-form] textarea[name=message]")) return;
        const projectId = event.target.closest("[data-project-planning-form]")?.dataset.projectPlanningForm;
        if (projectId) projectPlanningDrafts.set(projectId, event.target.value);
      });
      projects.addEventListener("compositionstart", event => {
        if (!event.target.matches("[data-project-planning-form] textarea[name=message]")) return;
        projectPlanningComposition = event.target.closest("[data-project-planning-form]")?.dataset.projectPlanningForm || "";
      });
      projects.addEventListener("compositionend", event => {
        if (!event.target.matches("[data-project-planning-form] textarea[name=message]")) return;
        projectPlanningComposition = "";
        const projectId = event.target.closest("[data-project-planning-form]")?.dataset.projectPlanningForm;
        if (projectId) projectPlanningDrafts.set(projectId, event.target.value);
      });
      projects.addEventListener("keydown", event => {
        if (event.key !== "Escape") return;
        const picker = projects.querySelector("[data-project-document-agent-picker].is-open");
        if (!picker) return;
        picker.classList.remove("is-open");
        const trigger = picker.querySelector("[data-project-document-agent-toggle]");
        trigger?.setAttribute("aria-expanded", "false");
        trigger?.focus();
      });
      projects.addEventListener("submit", onProjectDocumentSubmit);
      projects.addEventListener("submit", onProjectPlanningSubmit);
      section.append(toolbar, board, ...(boardScrollControl ? [boardScrollControl] : []), scheduledTasks, agents, projects, recovery);
      return section;
    }

    function syncBoardScrollControl() {
      if (HOST_KIND !== "web" || !panel) return;
      const board = panel.querySelector("#better-codex-board");
      const control = panel.querySelector(".better-codex-board-scroll");
      const range = control?.querySelector("input");
      if (!board || !control || !range) return;
      const max = Math.max(0, Math.ceil(board.scrollWidth - board.clientWidth));
      control.hidden = state.surface !== "issues" || max < 2;
      range.max = String(max);
      range.value = String(Math.min(max, Math.max(0, Math.round(board.scrollLeft))));
      if (control.hidden) return;
      const trackWidth = range.clientWidth;
      const minimumThumbWidth = Math.min(48, trackWidth);
      const proportionalThumbWidth = trackWidth * Math.min(1, board.clientWidth / board.scrollWidth);
      const thumbWidth = max <= trackWidth - minimumThumbWidth ? trackWidth - max : proportionalThumbWidth;
      range.style.setProperty("--bc-board-scroll-thumb-width", Math.max(minimumThumbWidth, Math.min(trackWidth, thumbWidth)) + "px");
    }

    function agentKey(agent) {
      return agent.is_default ? "default" : agent.id;
    }

    function parseIconAvatar(avatar) {
      const match = String(avatar || "").match(/^icon:([a-z0-9_-]+)$/i);
      if (!match) return null;
      return AGENT_AVATAR_PRESETS.find(item => item.id === match[1]) || null;
    }

    function agentAvatarMarkup(agent, className) {
      const branded = Boolean(agent?.is_default);
      const preset = parseIconAvatar(agent?.avatar);
      const customized = Boolean(agent?.avatar) && !preset;
      const content = customized
        ? '<img src="' + escapeHtml(agent.avatar) + '" alt="">'
        : preset ? icon(preset.icon, "", "2.2")
        : branded ? codexLogo() : icon("bot");
      const tone = preset ? ' data-tone="' + escapeHtml(preset.tone) + '"' : "";
      return '<span class="' + className + (customized ? " has-image" : preset ? " is-icon" : branded ? " is-codex" : " is-fallback") + '"' + tone + '>' + content + '</span>';
    }

    function issueUserProfile(issue) {
      if (issue?.assignee_user?.name) return issue.assignee_user;
      if (issue?.assignee_user_id) return state.users.find(user => user.id === issue.assignee_user_id) || { id: issue.assignee_user_id, name: t("已停用用户"), initials: "?", color: "var(--bc-color-text-faint)", disabled: true };
      return state.user;
    }

    function issueAssigneeValue(issue) {
      if (issue?.agent_enabled) return issue.agent_id || "codex";
      if (issue?.user_assigned) return "user:" + String(issueUserProfile(issue)?.id || "default");
      return "none";
    }

    function userAvatarInitials(name) {
      const source = String(name || "").trim();
      if (!source) return "?";
      const latin = source.match(/[A-Za-z]+/g);
      if (latin && latin.length >= 2) return (latin[0][0] + latin[1][0]).toUpperCase();
      if (latin && latin[0].length >= 2) return latin[0].slice(0, 2).toUpperCase();
      if (latin) return latin[0][0].toUpperCase();
      return Array.from(source.replace(/\s+/g, "")).slice(0, 2).join("") || "?";
    }

    const generatedUserAvatarCache = new Map();

    function designToken(name) {
      const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
      if (!value) throw new Error("design_token_missing:" + name);
      return value;
    }

    function generatedUserAvatar(name, color) {
      const initials = userAvatarInitials(name);
      const background = USER_AVATAR_COLORS.includes(color) ? color : USER_AVATAR_COLORS[0];
      const key = initials + ":" + background;
      const cached = generatedUserAvatarCache.get(key);
      if (cached) return cached;
      const canvas = document.createElement("canvas");
      canvas.width = 256;
      canvas.height = 256;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("avatar_canvas_unavailable");
      context.fillStyle = background;
      context.fillRect(0, 0, 256, 256);
      context.fillStyle = designToken("--bc-color-on-avatar");
      context.textAlign = "center";
      context.textBaseline = "middle";
      const family = designToken("--bc-font-ui");
      let fontSize = initials.length > 1 ? 92 : 116;
      context.font = "700 " + fontSize + "px " + family;
      while (context.measureText(initials).width > 176 && fontSize > 54) {
        fontSize -= 2;
        context.font = "700 " + fontSize + "px " + family;
      }
      context.fillText(initials, 128, 132);
      const result = canvas.toDataURL("image/png");
      if (generatedUserAvatarCache.size >= 128) generatedUserAvatarCache.clear();
      generatedUserAvatarCache.set(key, result);
      return result;
    }

    function userAvatarMarkup(user, className) {
      const profile = user || state.user;
      const color = USER_AVATAR_COLORS.includes(profile?.color) ? profile.color : USER_AVATAR_COLORS[0];
      const image = String(profile?.avatar || generatedUserAvatar(profile?.name || profile?.initials || t("你"), color));
      const title = profile?.handle ? "@" + profile.handle : profile?.name || "";
      return '<span class="' + className + ' is-user has-image" style="background:' + escapeHtml(color) + '" title="' + escapeHtml(title) + '" aria-hidden="true"><img src="' + escapeHtml(image) + '" alt=""></span>';
    }

    function syncAgentAvatar(node, agent) {
      if (!node) return;
      const branded = Boolean(agent?.is_default);
      const preset = parseIconAvatar(agent?.avatar);
      const customized = Boolean(agent?.avatar) && !preset;
      node.classList.toggle("has-image", customized);
      node.classList.toggle("is-icon", Boolean(preset));
      node.classList.toggle("is-codex", !customized && !preset && branded);
      node.classList.toggle("is-fallback", !customized && !preset && !branded);
      if (preset) node.setAttribute("data-tone", preset.tone);
      else node.removeAttribute("data-tone");
      node.innerHTML = customized ? '<img src="' + escapeHtml(agent.avatar) + '" alt="">' : preset ? icon(preset.icon, "", "2.2") : branded ? codexLogo() : icon("bot");
    }

    function agentAvatarEditorMarkup(agent, key) {
      return '<button class="better-codex-agent-avatar-editor" type="button" data-agent-avatar-form="' + escapeHtml(key) + '" aria-label="' + te("更换 " + (agent?.name || t("智能体")) + " 的头像") + '">' + agentAvatarMarkup(agent, "better-codex-agent-list-avatar") + '<span class="better-codex-agent-avatar-overlay" aria-hidden="true">' + icon("plus") + '</span></button>';
    }

    function chooseAgentAvatar(current = "", anchor = null) {
      avatarPickerClose?.();
      document.getElementById("better-codex-avatar-picker")?.remove();
      return new Promise(resolve => {
        const picker = document.createElement("div");
        picker.id = "better-codex-avatar-picker";
        picker.setAttribute(OWNED, "true");
        picker.setAttribute("role", "dialog");
        picker.setAttribute("aria-label", t("选择头像"));
        const currentPreset = parseIconAvatar(current)?.id || "";
        const presets = AGENT_AVATAR_PRESETS.map(item => '<button class="better-codex-avatar-preset' + (item.id === currentPreset ? " is-selected" : "") + '" type="button" data-avatar-preset="' + escapeHtml(item.id) + '" title="' + te(item.label) + '" aria-label="' + te(item.label) + '" aria-pressed="' + (item.id === currentPreset) + '"><span class="better-codex-avatar-preset-visual is-icon" data-tone="' + escapeHtml(item.tone) + '">' + icon(item.icon, "", "2.25") + '</span><span class="better-codex-avatar-preset-label">' + te(item.label) + "</span></button>").join("");
        picker.innerHTML = '<div class="better-codex-avatar-picker-shell"><header><div><strong>' + te("选择头像") + '</strong><span>' + te("从预设图标中选择，也可以上传图片") + '</span></div><button type="button" data-avatar-picker-cancel aria-label="' + te("关闭") + '">' + icon("close") + '</button></header><div class="better-codex-avatar-preset-grid" role="listbox" aria-label="' + te("预设头像") + '">' + presets + '</div><footer><button type="button" data-avatar-picker-cancel>' + te("取消") + '</button><button class="is-primary" type="button" data-avatar-picker-upload>' + icon("image") + '<span>' + te("上传图片") + '</span></button></footer></div>';
        let settled = false;
        const finish = value => {
          if (settled) return;
          settled = true;
          avatarPickerClose = null;
          document.removeEventListener("mousedown", onDismiss, true);
          document.removeEventListener("keydown", onKeydown, true);
          window.removeEventListener("resize", position);
          picker.remove();
          resolve(value);
        };
        avatarPickerClose = () => finish(null);
        const onDismiss = event => {

          if (picker.contains(event.target)) return;

          suppressAgentOutside = true;
          finish(null);
          setTimeout(() => { suppressAgentOutside = false; }, 0);
        };
        const onKeydown = event => {
          if (event.key === "Escape") {
            event.preventDefault();
            finish(null);
          }
        };
        const position = () => {
          const width = Math.min(360, window.innerWidth - 16);
          const anchorRect = (anchor || document.body).getBoundingClientRect();
          picker.style.width = width + "px";
          picker.style.left = Math.max(8, Math.min(anchorRect.left, window.innerWidth - width - 8)) + "px";
          picker.style.visibility = "hidden";
          picker.style.top = "0px";
          const height = picker.offsetHeight || 280;
          const below = anchorRect.bottom + 8;
          const top = below + height <= window.innerHeight - 8
            ? below
            : Math.max(8, anchorRect.top - height - 8);
          picker.style.top = top + "px";
          picker.style.visibility = "";
        };
        document.body.appendChild(picker);
        position();
        picker.querySelectorAll("[data-avatar-preset]").forEach(button => button.addEventListener("click", () => finish("icon:" + button.dataset.avatarPreset)));
        picker.querySelectorAll("[data-avatar-picker-cancel]").forEach(button => button.addEventListener("click", () => finish(null)));
        picker.querySelector("[data-avatar-picker-upload]").addEventListener("click", () => finish("__upload__"));
        window.addEventListener("resize", position);
        setTimeout(() => {
          document.addEventListener("mousedown", onDismiss, true);
          document.addEventListener("keydown", onKeydown, true);
        }, 0);
      }).then(async value => {
        if (value !== "__upload__") return value;
        return pickAgentAvatar();
      });
    }

    function cropAgentAvatar(file) {
      return new Promise((resolve, reject) => {
        if (!file || !["image/png", "image/jpeg", "image/webp"].includes(file.type)) return reject(new Error("请选择 PNG、JPEG 或 WebP 图片"));
        if (file.size > 10 * 1024 * 1024) return reject(new Error("图片不能超过 10 MB"));
        const source = URL.createObjectURL(file);
        const image = new Image();
        image.onload = () => {
          const size = 512;
          let zoom = 1;
          let offsetX = 0;
          let offsetY = 0;
          let dragging = false;
          let pointerX = 0;
          let pointerY = 0;
          let settled = false;
          const dialog = document.createElement("dialog");
          dialog.id = "better-codex-avatar-cropper";
          dialog.setAttribute(OWNED, "true");
          dialog.innerHTML = '<div class="better-codex-avatar-cropper-shell"><header><div><strong>' + te("裁剪头像") + '</strong><span>' + te("拖动图片调整位置") + '</span></div><button type="button" data-avatar-crop-cancel aria-label="' + te("关闭") + '">' + icon("close") + '</button></header><div class="better-codex-avatar-canvas-wrap"><canvas width="' + size + '" height="' + size + '"></canvas><span class="better-codex-avatar-crop-guide" aria-hidden="true"></span></div><label class="better-codex-avatar-zoom"><span>' + icon("image") + '</span><input type="range" min="1" max="3" value="1" step="0.01" aria-label="' + te("缩放头像") + '"><span>' + icon("image") + '</span></label><footer><button type="button" data-avatar-crop-cancel>' + te("取消") + '</button><button class="is-primary" type="button" data-avatar-crop-save>' + te("使用此头像") + '</button></footer></div>';
          const canvas = dialog.querySelector("canvas");
          const context = canvas.getContext("2d");
          const range = dialog.querySelector('input[type="range"]');
          const baseScale = Math.max(size / image.naturalWidth, size / image.naturalHeight);
          const finish = value => {
            if (settled) return;
            settled = true;
            URL.revokeObjectURL(source);
            dialog.close();
            dialog.remove();
            resolve(value);
          };
          const clamp = () => {
            const width = image.naturalWidth * baseScale * zoom;
            const height = image.naturalHeight * baseScale * zoom;
            offsetX = Math.max((size - width) / 2, Math.min((width - size) / 2, offsetX));
            offsetY = Math.max((size - height) / 2, Math.min((height - size) / 2, offsetY));
          };
          const draw = () => {
            clamp();
            const width = image.naturalWidth * baseScale * zoom;
            const height = image.naturalHeight * baseScale * zoom;
            context.clearRect(0, 0, size, size);
            context.drawImage(image, (size - width) / 2 + offsetX, (size - height) / 2 + offsetY, width, height);
          };
          range.addEventListener("input", () => { zoom = Number(range.value); draw(); });
          canvas.addEventListener("pointerdown", event => {
            dragging = true;
            pointerX = event.clientX;
            pointerY = event.clientY;
            canvas.setPointerCapture(event.pointerId);
          });
          canvas.addEventListener("pointermove", event => {
            if (!dragging) return;
            const ratio = size / canvas.getBoundingClientRect().width;
            offsetX += (event.clientX - pointerX) * ratio;
            offsetY += (event.clientY - pointerY) * ratio;
            pointerX = event.clientX;
            pointerY = event.clientY;
            draw();
          });
          canvas.addEventListener("pointerup", () => { dragging = false; });
          canvas.addEventListener("pointercancel", () => { dragging = false; });
          dialog.querySelectorAll("[data-avatar-crop-cancel]").forEach(button => button.addEventListener("click", () => finish(null)));
          dialog.querySelector("[data-avatar-crop-save]").addEventListener("click", () => {
            const output = document.createElement("canvas");
            output.width = 256;
            output.height = 256;
            output.getContext("2d").drawImage(canvas, 0, 0, 256, 256);
            finish(output.toDataURL("image/webp", .86));
          });
          dialog.addEventListener("cancel", event => { event.preventDefault(); finish(null); });
          bindModalDismiss(dialog, () => finish(null));
          document.body.appendChild(dialog);
          draw();
          dialog.showModal();
        };
        image.onerror = () => { URL.revokeObjectURL(source); reject(new Error("无法读取这张图片")); };
        image.src = source;
      });
    }

    function pickAgentAvatar() {
      return new Promise((resolve, reject) => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = "image/png,image/jpeg,image/webp";
        input.addEventListener("change", () => {
          if (!input.files?.[0]) return resolve(null);
          cropAgentAvatar(input.files[0]).then(resolve, reject);
        }, { once: true });
        input.addEventListener("cancel", () => resolve(null), { once: true });
        input.click();
      });
    }

    function applyUserProfile(user) {
      state.user = user;
      state.users = state.users.map(item => item.id === user.id ? user : item);
      for (const issue of [...state.issues, ...state.projectIssues]) {
        if (issue.assignee_user_id === user.id) issue.assignee_user = user;
      }
      window.dispatchEvent(new CustomEvent("better-codex:bootstrap", { detail: { user, locale: state.locale } }));
      syncMobileActions();
      render();
    }

    function showUserProfileDialog() {
      if (!REMOTE) return;
      const existing = document.getElementById("better-codex-profile-dialog");
      if (existing) {
        existing.querySelector("input")?.focus();
        return;
      }
      const colorLabels = ["蓝色", "紫色", "青色", "绿色", "青柠色", "琥珀色", "橙色", "粉色"];
      let color = USER_AVATAR_COLORS.includes(state.user?.color) ? state.user.color : USER_AVATAR_COLORS[0];
      let avatarGenerated = state.user?.avatar_generated !== false || !state.user?.avatar;
      let avatar = avatarGenerated ? generatedUserAvatar(state.user?.name || t("你"), color) : String(state.user?.avatar || "");
      const colors = USER_AVATAR_COLORS.map((value, index) => '<button class="better-codex-profile-avatar-color' + (value === color ? " is-selected" : "") + '" type="button" data-profile-avatar-color="' + escapeHtml(value) + '" style="--profile-avatar-color:' + escapeHtml(value) + '" aria-label="' + te(colorLabels[index]) + '" title="' + te(colorLabels[index]) + '" aria-pressed="' + (value === color) + '">' + icon("check") + '</button>').join("");
      const dialog = document.createElement("dialog");
      dialog.id = "better-codex-profile-dialog";
      dialog.setAttribute(OWNED, "true");
      dialog.setAttribute("aria-labelledby", "better-codex-profile-dialog-title");
      dialog.innerHTML = '<form><header><div><h2 id="better-codex-profile-dialog-title">' + te("个人资料") + '</h2><p>' + te("昵称和头像只用于 WebUI 协作") + '</p></div><button type="button" data-profile-dialog-close aria-label="' + te("关闭") + '">' + icon("close") + '</button></header><div class="better-codex-profile-dialog-body"><button class="better-codex-profile-dialog-avatar-button" type="button" data-profile-dialog-avatar aria-label="' + te("更换头像") + '">' + userAvatarMarkup({ ...state.user, avatar, color }, "better-codex-profile-dialog-avatar") + '<span aria-hidden="true">' + icon("image") + '</span></button><label><span>' + te("昵称") + '</span><input name="nickname" maxlength="80" autocomplete="name" value="' + escapeHtml(state.user?.name || "") + '" required></label><fieldset><legend>' + te("选择颜色") + '</legend><div class="better-codex-profile-avatar-colors">' + colors + '</div></fieldset><output hidden></output></div><footer><button type="button" data-profile-dialog-cancel>' + te("取消") + '</button><button class="is-primary" type="submit">' + te("保存") + '</button></footer></form>';
      const form = dialog.querySelector("form");
      const avatarButton = dialog.querySelector("[data-profile-dialog-avatar]");
      const input = dialog.querySelector('input[name="nickname"]');
      const output = dialog.querySelector("output");
      const submit = dialog.querySelector('button[type="submit"]');
      const colorButtons = [...dialog.querySelectorAll("[data-profile-avatar-color]")];
      const finish = () => {
        dialog.close();
        dialog.remove();
      };
      const syncPreview = () => {
        avatarButton.querySelector(".better-codex-profile-dialog-avatar")?.remove();
        avatarButton.insertAdjacentHTML("afterbegin", userAvatarMarkup({ ...state.user, name: input.value, avatar, color }, "better-codex-profile-dialog-avatar"));
        for (const button of colorButtons) {
          const selected = button.dataset.profileAvatarColor === color;
          button.classList.toggle("is-selected", selected);
          button.setAttribute("aria-pressed", String(selected));
        }
      };
      avatarButton.addEventListener("click", () => {
        void pickAgentAvatar().then(value => {
          if (!value) return;
          avatar = value;
          avatarGenerated = false;
          syncPreview();
        }).catch(error => {
          presentInlineError(output, error, error instanceof Error ? t(error.message) : String(error), { source: "profile_avatar", report: false });
        });
      });
      input.addEventListener("input", () => {
        if (!avatarGenerated) return;
        avatar = generatedUserAvatar(input.value || t("你"), color);
        syncPreview();
      });
      for (const button of colorButtons) button.addEventListener("click", () => {
        color = button.dataset.profileAvatarColor;
        avatarGenerated = true;
        avatar = generatedUserAvatar(input.value || t("你"), color);
        syncPreview();
      });
      form.addEventListener("submit", event => {
        event.preventDefault();
        const nickname = String(input.value || "").trim();
        if (!nickname) {
          input.focus();
          return;
        }
        if (avatarGenerated) avatar = generatedUserAvatar(nickname, color);
        submit.disabled = true;
        output.hidden = true;
        appendDiagnostic("profile_update_requested", { avatar_changed: avatar !== String(state.user?.avatar || ""), avatar_generated: avatarGenerated, color_changed: color !== String(state.user?.color || ""), nickname_changed: nickname !== String(state.user?.name || "") });
        void api("/api/profile", { method: "PATCH", body: JSON.stringify({ nickname, avatar, avatar_color: color, avatar_generated: avatarGenerated }) }).then(result => {
          if (!result?.user?.id) throw new Error("invalid_profile_response");
          appendDiagnostic("profile_update_completed", { user_id: result.user.id });
          applyUserProfile(result.user);
          finish();
        }).catch(error => {
          appendDiagnostic("profile_update_failed", { error: error instanceof Error ? error.message : String(error) });
          presentInlineError(output, error, errorLabel(error), { source: "profile_save" });
        }).finally(() => { submit.disabled = false; });
      });
      dialog.querySelectorAll("[data-profile-dialog-close], [data-profile-dialog-cancel]").forEach(button => button.addEventListener("click", finish));
      dialog.addEventListener("cancel", event => { event.preventDefault(); finish(); });
      bindModalDismiss(dialog, finish);
      document.body.appendChild(dialog);
      dialog.showModal();
      input.focus();
      input.select();
    }

    function onUserProfileOpen() {
      showUserProfileDialog();
    }

    function modelLabel(value) {
      return state.agentModelCatalog.find(model => model.id === value)?.displayName || value;
    }

    function effortLabel(value) {
      return t(({ low: "低", medium: "中", high: "高", xhigh: "超高", max: "最大", ultra: "极致" })[value] || value);
    }

    function sandboxModeLabel(value) {
      return t(({ "read-only": "只读", "workspace-write": "工作区可写", "danger-full-access": "完全访问" })[value] || value);
    }

    function modelTag(value) {
      const raw = String(value || "").trim();
      if (!raw || /^默认/.test(raw)) return "";
      return raw.replace(/^gpt[-_]?/i, "").replace(/(^|[-_])([a-z])/g, (_, separator, character) => separator + character.toUpperCase());
    }

    function reasoningTag(value) {
      const raw = String(value || "").trim().toLowerCase();
      if (!raw || /^默认/.test(raw)) return "";
      return ({ medium: "mid" })[raw] || raw;
    }

    function modelSupportsFast(model) {
      const entry = state.agentModelCatalog.find(item => item.id === model);
      return entry?.serviceTiers?.some(tier => ["fast", "priority"].includes(String(tier.id || "").toLowerCase()) || String(tier.name || "").toLowerCase() === "fast") === true;
    }

    function fastMark() {
      return '<span class="better-codex-fast-mark" title="Fast" aria-label="Fast">' + icon("fast", "", "2") + '</span>';
    }

    function agentConfigTags(agent) {
      const model = modelTag(agent?.model);
      const reasoning = reasoningTag(agent?.reasoning_effort);
      return [model ? { value: model, tone: "model", fast: agent?.service_tier === "fast" } : null, reasoning ? { value: reasoning, tone: "reasoning" } : null].filter(Boolean);
    }

    function agentOptionLabel(agent, name) {
      return state.locale === "en" ? String(agent?.name_en || name || "") : name;
    }

    function agentDisplayName(agent) {
      return agentOptionLabel(agent, agent?.name || "");
    }

    function applyAppearance(appearance) {
      let applied;
      try {
        applied = applyHostTheme(appearance, {
          host: HOST_ADAPTER.kind + (HOST_ADAPTER.remote ? ":remote" : ""),
          style: document.documentElement.style,
          colorMixSupported: CSS.supports("color", "color-mix(in srgb, currentColor 50%, transparent)"),
          fontFamilySupported: value => CSS.supports("font-family", value),
        });
      } catch (error) {
        throw new Error(JSON.stringify({ code: "theme_apply_failed", host: HOST_ADAPTER.kind, phase: "apply", component: "theme-adapter" }), { cause: error });
      }
      window.__betterCodexThemeDiagnostics__ = applied.diagnostics;
      window.dispatchEvent(new CustomEvent("better-codex:theme-diagnostics", { detail: applied.diagnostics }));
      if (themeIsDegraded(applied.diagnostics)) console.warn("better_codex_theme_degraded", applied.diagnostics);
      if (HOST_KIND === "web") {
        const storedTheme = localStorage.getItem("better-codex-web-theme");
        const configuredTheme = applied.theme.theme;
        const resolvedTheme = storedTheme === "light" || storedTheme === "dark"
          ? storedTheme
          : configuredTheme === "light" || configuredTheme === "dark"
            ? configuredTheme
            : matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
        document.documentElement.dataset.theme = resolvedTheme;
      }
    }
    function effortsForModel(model) {
      const entry = state.agentModelCatalog.find(item => item.id === model);
      return entry?.supportedReasoningEfforts?.length
        ? entry.supportedReasoningEfforts.map(item => ({ value: item.value, label: effortLabel(item.value), description: item.description || "" }))
        : state.agentReasoningEfforts.map(value => ({ value, label: effortLabel(value), description: "" }));
    }

    function agentPicker(name, label, selected, options) {
      const current = options.find(option => option.value === selected) || options[0] || { value: "", label: "未提供" };
      const fastSuffix = name === "model" ? fastMark() : "";
      const rows = options.map(option => {
        const hasDescription = Boolean(option.description);
        const copy = hasDescription
          ? '<span class="better-codex-agent-menu-item-copy">' + (option.icon ? '<span class="better-codex-agent-menu-item-icon">' + icon(option.icon) + '</span>' : "") + '<span><strong>' + escapeHtml(option.label) + '</strong><small>' + escapeHtml(option.description) + '</small></span></span>'
          : '<span class="better-codex-agent-menu-item-copy">' + (option.icon ? '<span class="better-codex-agent-menu-item-icon">' + icon(option.icon) + '</span>' : "") + '<span>' + escapeHtml(option.label) + '</span></span>';
        return '<button class="better-codex-agent-menu-item' + (option.value === current.value ? " is-selected" : "") + (option.tone === "warning" ? " is-warning" : "") + '" type="button" role="option" aria-selected="' + (option.value === current.value) + '" data-agent-option="' + escapeHtml(name) + '" data-agent-option-value="' + escapeHtml(option.value) + '">' + copy + '<span class="better-codex-agent-menu-item-check">' + (option.value === current.value ? icon("check") : "") + '</span></button>';
      }).join("");
      return '<div class="better-codex-agent-setting" data-agent-picker="' + escapeHtml(name) + '"><span>' + escapeHtml(label) + '</span><input type="hidden" name="' + escapeHtml(name) + '" value="' + escapeHtml(current.value) + '"><button class="better-codex-agent-picker-trigger" type="button" role="combobox" aria-haspopup="listbox" aria-expanded="false" data-agent-picker-toggle="' + escapeHtml(name) + '"><span data-agent-picker-label>' + escapeHtml(current.label) + '</span>' + fastSuffix + icon("chevron") + '</button><div class="better-codex-agent-menu" role="listbox"><div class="better-codex-agent-menu-title">' + escapeHtml(label) + '</div>' + rows + '</div></div>';
    }

    function agentNumberInput(name, label, value, min, max) {
      const numericValue = Number(value);
      const current = Number.isInteger(numericValue) ? Math.min(max, Math.max(min, numericValue)) : 5;
      return '<label class="better-codex-agent-setting"><span>' + escapeHtml(label) + '</span><input class="better-codex-agent-number-input" type="number" name="' + escapeHtml(name) + '" min="' + min + '" max="' + max + '" step="1" value="' + current + '" aria-label="' + escapeHtml(label) + '"></label>';
    }

    function agentFastToggle(checked, enabled) {
      return '<label class="better-codex-agent-setting better-codex-agent-fast-setting' + (enabled ? "" : " is-disabled") + '"><span><strong>' + te("Fast") + '</strong><small>' + te("更快响应，增加用量") + '</small></span><span class="better-codex-agent-switch"><input type="checkbox" name="fast" aria-label="Fast"' + (checked ? " checked" : "") + (enabled ? "" : " disabled") + '><i></i></span></label>';
    }

    const suggestedAgents = config.suggestedAgents;

    let agentCreateFullscreen = false;
    let agentWindowBoundsObserver = null;
    let agentAutosaveTimer = null;
    let agentAutosavePending = null;
    let agentAutosaveRunning = null;

    function clearAgentCreateFullscreenBounds(inspector) {
      inspector?.style.removeProperty("--bc-agent-fullscreen-top");
      inspector?.style.removeProperty("--bc-agent-fullscreen-left");
      inspector?.style.removeProperty("--bc-agent-fullscreen-width");
      inspector?.style.removeProperty("--bc-agent-fullscreen-height");
    }

    function syncAgentCreateFullscreenBounds(inspector) {
      const compact = HOST_KIND === "web" && window.matchMedia("(max-width: 720px)").matches;
      if (!agentCreateFullscreen || compact || !panel?.isConnected) return clearAgentCreateFullscreenBounds(inspector);
      const bounds = panel.getBoundingClientRect();
      inspector.style.setProperty("--bc-agent-fullscreen-top", bounds.top + "px");
      inspector.style.setProperty("--bc-agent-fullscreen-left", bounds.left + "px");
      inspector.style.setProperty("--bc-agent-fullscreen-width", bounds.width + "px");
      inspector.style.setProperty("--bc-agent-fullscreen-height", bounds.height + "px");
    }

    function setAgentCreateFullscreen(fullscreen) {
      const inspector = panel?.querySelector('.better-codex-agent-inspector[data-agent-window="create"]');
      if (!inspector) return;
      agentCreateFullscreen = Boolean(fullscreen);
      inspector.dataset.fullscreen = String(agentCreateFullscreen);
      syncAgentCreateFullscreenBounds(inspector);
      const button = inspector.querySelector("[data-agent-window-expand]");
      button?.setAttribute("aria-label", t(agentCreateFullscreen ? "退出全屏" : "全屏"));
      if (button) button.innerHTML = icon(agentCreateFullscreen ? "shrink" : "expand");
    }

    function agentInspectorWidthLimit() {
      const available = panel?.getBoundingClientRect().width || window.innerWidth;
      return Math.max(AGENT_INSPECTOR_MIN_WIDTH, Math.floor(available - AGENT_DIRECTORY_MIN_WIDTH));
    }

    function clampAgentInspectorWidth(width) {
      return Math.round(Math.min(agentInspectorWidthLimit(), Math.max(AGENT_INSPECTOR_MIN_WIDTH, Number(width) || AGENT_INSPECTOR_MIN_WIDTH)));
    }

    function applyAgentInspectorWidth(inspector, width = state.agentInspectorWidth) {
      if (!inspector || window.matchMedia?.("(max-width: 720px)")?.matches) return;
      if (!width) {
        inspector.style.removeProperty("--bc-agent-inspector-width");
        delete inspector.dataset.resized;
        const defaultHandle = inspector.querySelector("[data-agent-inspector-resize]");
        defaultHandle?.setAttribute("aria-valuemin", String(AGENT_INSPECTOR_MIN_WIDTH));
        defaultHandle?.setAttribute("aria-valuemax", String(agentInspectorWidthLimit()));
        defaultHandle?.setAttribute("aria-valuenow", String(Math.round(inspector.getBoundingClientRect().width)));
        return;
      }
      const nextWidth = clampAgentInspectorWidth(width);
      state.agentInspectorWidth = nextWidth;
      inspector.dataset.resized = "true";
      inspector.style.setProperty("--bc-agent-inspector-width", nextWidth + "px");
      const handle = inspector.querySelector("[data-agent-inspector-resize]");
      handle?.setAttribute("aria-valuemin", String(AGENT_INSPECTOR_MIN_WIDTH));
      handle?.setAttribute("aria-valuemax", String(agentInspectorWidthLimit()));
      handle?.setAttribute("aria-valuenow", String(nextWidth));
    }

    function persistAgentInspectorWidth() {
      if (!state.agentInspectorWidth) return;
      localStorage.setItem(AGENT_INSPECTOR_WIDTH_KEY, String(state.agentInspectorWidth));
    }

    function onAgentInspectorResizeStart(event) {
      const handle = event.target.closest("[data-agent-inspector-resize]");
      if (!handle || event.button !== 0 || window.matchMedia?.("(max-width: 720px)")?.matches) return;
      const inspector = handle.closest(".better-codex-agent-inspector");
      if (!inspector) return;
      agentInspectorResize = { pointerId: event.pointerId, startX: event.clientX, startWidth: inspector.getBoundingClientRect().width, handle, inspector };
      inspector.classList.add("is-resizing");
      panel.dataset.agentResizing = "true";
      handle.setPointerCapture(event.pointerId);
      event.preventDefault();
    }

    function onAgentInspectorResizeMove(event) {
      if (!agentInspectorResize || event.pointerId !== agentInspectorResize.pointerId) return;
      applyAgentInspectorWidth(agentInspectorResize.inspector, agentInspectorResize.startWidth + agentInspectorResize.startX - event.clientX);
      event.preventDefault();
    }

    function finishAgentInspectorResize(event) {
      if (!agentInspectorResize || event.pointerId !== agentInspectorResize.pointerId) return;
      const { handle, inspector, pointerId } = agentInspectorResize;
      agentInspectorResize = null;
      inspector.classList.remove("is-resizing");
      delete panel.dataset.agentResizing;
      if (handle.hasPointerCapture(pointerId)) handle.releasePointerCapture(pointerId);
      persistAgentInspectorWidth();
    }

    function onAgentInspectorResizeKeydown(event) {
      const handle = event.target.closest("[data-agent-inspector-resize]");
      if (!handle || !["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return false;
      const inspector = handle.closest(".better-codex-agent-inspector");
      if (!inspector) return false;
      const currentWidth = inspector.getBoundingClientRect().width;
      const step = event.shiftKey ? 48 : 16;
      const nextWidth = event.key === "Home" ? AGENT_INSPECTOR_MIN_WIDTH : event.key === "End" ? agentInspectorWidthLimit() : currentWidth + (event.key === "ArrowLeft" ? step : -step);
      applyAgentInspectorWidth(inspector, nextWidth);
      persistAgentInspectorWidth();
      event.preventDefault();
      return true;
    }

    function closeAgentInspector() {
      if (state.agentPane === "preview") return;
      agentWindowBoundsObserver?.disconnect();
      agentWindowBoundsObserver = null;
      agentCreateFullscreen = false;
      state.agentPane = "preview";
      state.selectedAgentId = "";
      state.agentDraft = null;
      renderAgents();
      if (HOST_KIND !== "web" || !webAgentRoute()?.agentKey) return;
      if (history.state?.betterCodexAgentFromList) history.back();
      else syncWebAgentRoute("", "replace");
    }

    function agentInspector(agent, options = {}) {
      if (state.agentPane === "preview") return "";
      const creating = state.agentPane === "create";
      const draft = creating ? (state.agentDraft || {}) : agent;
      if (!draft) return "";
      const readOnly = AGENTS_READ_ONLY || draft.remote_read_only === true;
      const isDefault = Boolean(draft.is_default);
      const nameField = state.locale === "en" ? "name_en" : "name";
      const name = draft[nameField] || "";
      const description = creating ? draft.description || "" : draft.description || "";
      const instructions = creating ? draft.instructions || "" : draft.instructions || "";
      const defaultModel = state.agentModelCatalog.find(item => item.isDefault) || state.agentModelCatalog[0];
      const model = draft.model || defaultModel?.id || "";
      const fast = draft.service_tier === "fast";
      const fastEnabled = !readOnly && (modelSupportsFast(model) || fast);
      let effortOptions = effortsForModel(model);
      const preferredEffort = draft.reasoning_effort || state.agentModelCatalog.find(item => item.id === model)?.defaultReasoningEffort;
      if (preferredEffort && !effortOptions.some(item => item.value === preferredEffort)) effortOptions = [{ value: preferredEffort, label: effortLabel(preferredEffort), description: t("当前模型目录未提供此配置"), tone: "warning" }, ...effortOptions];
      const effort = preferredEffort || effortOptions[0]?.value || "medium";
      const sandboxMode = ["read-only", "workspace-write", "danger-full-access"].includes(draft.sandbox_mode) ? draft.sandbox_mode : "workspace-write";
      const heading = t(creating ? "新建" : "智能体");
      const avatarInput = '<input type="hidden" name="avatar" value="' + escapeHtml(draft.avatar || "") + '">';
      const profileHead = creating
        ? '<h2>' + te("创建智能体") + '</h2><div class="better-codex-agent-avatar-field">' + agentAvatarEditorMarkup(draft, "") + '<div><strong>' + te("头像") + '</strong><span>' + te("点击选择预设图标，或上传图片") + '</span></div>' + avatarInput + '</div>'
        : '<div class="better-codex-agent-profile-head">' + agentAvatarEditorMarkup(draft, agentKey(draft)) + '<h2>' + escapeHtml(agentDisplayName(draft)) + '</h2>' + avatarInput + '</div>';
      const identity = isDefault
        ? '<div class="better-codex-agent-summary"><div><strong>' + te("Codex 默认智能体") + '</strong></div></div>'
        : '<label class="better-codex-agent-inspector-field"><span>' + te("名称") + '</span><input data-agent-name name="' + nameField + '" maxlength="80" value="' + escapeHtml(name) + '" placeholder="' + te("智能体名称") + '" required></label><label class="better-codex-agent-inspector-field"><span>' + te("介绍") + ' <small>' + te("可选") + '</small></span><textarea name="description" maxlength="500" rows="3" placeholder="' + te("说明这个智能体适合承担什么工作") + '">' + escapeHtml(description) + '</textarea></label>';
      const instructionField = isDefault || readOnly ? "" : '<label class="better-codex-agent-inspector-field"><span>' + te("指令") + ' <small>' + te("可选") + '</small></span><textarea name="instructions" rows="7" placeholder="' + te("定义职责、工作方式和输出要求") + '">' + escapeHtml(instructions) + '</textarea></label>';
      const deleteButton = !creating && !isDefault ? '<button class="better-codex-agent-danger" type="button" data-agent-delete data-agent-key="' + escapeHtml(agentKey(draft)) + '">' + te("删除智能体") + '</button>' : "";
      const modelOptions = [
        ...(model && !state.agentModels.includes(model) ? [{ value: model, label: model, description: t("当前模型目录未提供此配置"), tone: "warning" }] : []),
        ...state.agentModelCatalog.map(item => ({ value: item.id, label: item.displayName, description: item.description || "" })),
      ];
      const sandboxOptions = [
        { value: "read-only", label: t("只读"), description: t("仅可读取工作区文件，不能修改"), icon: "permissionReadOnly" },
        { value: "workspace-write", label: t("工作区可写"), description: t("可修改当前工作区内的文件"), icon: "permissionWorkspace" },
        { value: "danger-full-access", label: t("完全访问"), description: t("可不受限制地访问互联网和电脑上的任何文件"), icon: "permissionDanger", tone: "warning" },
      ];
      const animateAttr = options.animateEnter ? ' data-animate="enter"' : "";
      const mobilePage = HOST_KIND === "web" && window.matchMedia("(max-width: 720px)").matches;
      const tag = creating && !mobilePage ? "dialog" : "aside";
      const windowAttr = creating ? ' data-agent-window="create" data-fullscreen="' + agentCreateFullscreen + '"' : "";
      const resizeHandle = creating ? "" : '<div class="better-codex-agent-inspector-resize" data-agent-inspector-resize role="separator" aria-orientation="vertical" aria-label="' + te("调整侧边栏宽度") + '" tabindex="0"></div>';
      const leading = creating ? '<div class="better-codex-agent-inspector-head-leading"><button class="better-codex-agent-window-back" type="button" data-agent-window-back aria-label="' + te("返回") + '">' + icon("back") + '</button><nav class="better-codex-agent-window-title" aria-label="' + te("智能体") + '"><span>' + te("智能体") + '</span><span aria-hidden="true">&gt;</span><strong>' + te("创建智能体") + '</strong></nav></div>' : '<span>' + heading + '</span>';
      const windowAction = creating ? '<button class="better-codex-agent-card-action" type="button" data-agent-window-expand aria-label="' + te(agentCreateFullscreen ? "退出全屏" : "全屏") + '">' + icon(agentCreateFullscreen ? "shrink" : "expand") + '</button>' : "";
      const footer = readOnly ? "" : creating ? '<footer class="better-codex-agent-inspector-footer"><button class="better-codex-submit" type="submit">' + te("创建") + '</button></footer>' : deleteButton ? '<footer class="better-codex-agent-inspector-footer">' + deleteButton + '</footer>' : "";
      return '<' + tag + ' class="better-codex-agent-inspector"' + animateAttr + windowAttr + '>' + resizeHandle + '<form data-agent-form="' + (creating ? "create" : isDefault ? "default" : "update") + '" data-agent-key="' + escapeHtml(creating ? "" : agentKey(draft)) + '"><header class="better-codex-agent-inspector-head">' + leading + '<div class="better-codex-agent-inspector-head-actions">' + windowAction + '<button class="better-codex-agent-card-action" type="button" data-agent-close-pane aria-label="' + te(creating ? "关闭" : "关闭详情") + '">' + icon("close") + '</button></div></header><div class="better-codex-agent-inspector-scroll">' + profileHead + identity + '<h3>' + te("详情") + '</h3><div class="better-codex-agent-inspector-group">' + agentPicker("model", t("模型"), model, modelOptions) + agentFastToggle(fast, fastEnabled) + agentPicker("reasoning_effort", t("推理"), effort, effortOptions) + agentPicker("sandbox_mode", t("权限"), sandboxMode, sandboxOptions) + agentNumberInput("max_concurrency", t("最大并发"), draft.max_concurrency, 1, 20) + '</div>' + instructionField + '<output class="better-codex-agent-inspector-status" hidden></output><div class="better-codex-agent-inspector-error" role="alert" hidden></div></div>' + footer + '</form></' + tag + '>';
    }

    function renderAgents() {
      const container = panel?.querySelector("#better-codex-agents");
      if (!container) return;
      const previousPane = panel.dataset.agentPane || "preview";
      panel.dataset.agentPane = state.agentPane;
      const addAgent = panel.querySelector(".better-codex-agent-actions");
      if (addAgent) addAgent.hidden = AGENTS_READ_ONLY || state.agentPane !== "preview";
      panel.querySelectorAll("[data-agent-view]").forEach(button => button.classList.toggle("is-active", button.dataset.agentView === state.agentView));
      const query = state.agentSearch.trim().toLowerCase();
      const agents = state.agents.filter(agent => {
        const matchesView = state.agentView === "all" || (state.agentView === "default" ? agent.is_default : !agent.is_default);
        return matchesView && (!query || [agent.name, agent.name_en, agent.description, agent.instructions, agent.model].some(value => String(value || "").toLowerCase().includes(query)));
      });
      const selected = state.agents.find(agent => agentKey(agent) === state.selectedAgentId);
      const rows = agents.map(agent => {
        const key = agentKey(agent);
        const avatar = agentAvatarMarkup(agent, "better-codex-agent-list-avatar");
        const meta = '<span>' + escapeHtml(modelLabel(agent.model)) + (agent.service_tier === "fast" ? fastMark() : "") + '</span><span aria-hidden="true"> · </span><span>' + escapeHtml(effortLabel(agent.reasoning_effort) + (state.locale === "zh-CN" ? "推理" : " reasoning")) + '</span>';
        const description = state.mockup && agent.is_default ? "" : agent.description || (agent.is_default ? "" : t("尚未添加介绍"));
        return '<button class="better-codex-agent-row' + (key === state.selectedAgentId ? " is-selected" : "") + '" type="button" data-agent-key="' + escapeHtml(key) + '">' + avatar + '<span class="better-codex-agent-row-copy"><strong>' + escapeHtml(agentDisplayName(agent)) + (agent.is_default ? '<small>' + te("默认") + '</small>' : "") + '</strong>' + (description ? '<span>' + escapeHtml(description) + '</span>' : '') + '<em>' + meta + '</em></span><span class="better-codex-agent-row-chevron">' + icon("chevron") + '</span></button>';
      }).join("");
      const empty = '<div class="better-codex-agent-list-empty">' + te(query ? "没有匹配的智能体" : "此分类暂无智能体") + '</div>';
      const suggestions = suggestedAgents.map(item => {
        const selected = state.agentPane === "create" && state.agentDraft?.key === item.key;
        return '<button class="better-codex-agent-suggestion' + (selected ? " is-selected" : "") + '" type="button" data-agent-template="' + item.key + '" aria-pressed="' + selected + '"><span class="better-codex-agent-suggestion-icon" data-tone="' + escapeHtml(item.tone) + '">' + icon(item.icon, "", "2.4") + '</span><span><strong>' + te(item.name) + '</strong><small>' + te(item.description) + '</small></span></button>';
      }).join("");
      const animateEnter = previousPane === "preview" && state.agentPane !== "preview";
      agentWindowBoundsObserver?.disconnect();
      agentWindowBoundsObserver = null;
      container.innerHTML = '<div class="better-codex-agent-shell" data-pane="' + state.agentPane + '"><section class="better-codex-agent-directory"><header class="better-codex-agent-page-heading"><h1>' + te("智能体") + '</h1><p>' + te("创建和管理你的智能体") + '</p></header><div class="better-codex-agent-search-wrap">' + icon("search") + '<input class="better-codex-search" data-agent-search type="search" value="' + escapeHtml(state.agentSearch) + '" placeholder="' + te("搜索智能体") + '" aria-label="' + te("搜索智能体") + '"></div><div class="better-codex-agent-list">' + (rows || empty) + '</div>' + (state.agentView === "all" && !query ? '<div class="better-codex-agent-suggestions"><h3>' + te("建议") + '</h3>' + suggestions + '</div>' : "") + '</section>' + agentInspector(selected, { animateEnter }) + '</div>';
      const inspector = container.querySelector(".better-codex-agent-inspector");
      if (state.agentPane !== "create") return applyAgentInspectorWidth(inspector);
      if (!inspector.matches("dialog")) {
        agentCreateFullscreen = false;
        return;
      }
      inspector.addEventListener("cancel", event => {
        event.preventDefault();
        closeAgentInspector();
      });
      inspector.addEventListener("close", () => {
        agentWindowBoundsObserver?.disconnect();
        agentWindowBoundsObserver = null;
        agentCreateFullscreen = false;
        if (state.agentPane !== "create") return;
        closeAgentInspector();
      }, { once: true });
      bindModalDismiss(inspector, closeAgentInspector);
      inspector.showModal();
      setAgentCreateFullscreen(agentCreateFullscreen);
      if (panel && typeof ResizeObserver === "function") {
        agentWindowBoundsObserver = new ResizeObserver(() => syncAgentCreateFullscreenBounds(inspector));
        agentWindowBoundsObserver.observe(panel);
      }
    }

    function projectRootPaths(project) {
      const paths = Array.isArray(project?.root_paths) ? project.root_paths.map(String).filter(Boolean) : [];
      if (!paths.length && project?.workspace_path) paths.push(String(project.workspace_path));
      return paths;
    }

    function normalizedProjectDocumentViews(project) {
      const source = Array.isArray(project?.document_views) ? project.document_views : [];
      return projectDocumentViews.map(definition => {
        const view = source.find(item => item?.key === definition.key);
        if (view) return { ...definition, ...view };
        if (definition.key === "charter" && project?.overview_html) return { ...definition, status: "ready", markdown: "", html: project.overview_html, diagram: null, error: null, updated_at: project.overview_updated_at || null };
        return { ...definition, status: "idle", markdown: "", html: "", diagram: null, error: null, updated_at: null };
      });
    }

    function projectDocumentAgentPicker(selectedId) {
      const defaultAgent = state.agents.find(agent => agent.is_default);
      const options = [{ value: "", label: t("使用默认智能体"), agent: defaultAgent }, ...state.agents.filter(agent => !agent.is_default && agent.id).map(agent => ({ value: agent.id, label: agentDisplayName(agent), agent }))];
      const current = options.find(option => option.value === selectedId) || options[0];
      const avatar = option => option.agent ? agentAvatarMarkup(option.agent, "better-codex-project-document-agent-avatar") : '<span class="better-codex-project-document-agent-avatar">' + icon("bot") + '</span>';
      const rows = options.map(option => '<button class="better-codex-agent-menu-item' + (option.value === current.value ? " is-selected" : "") + '" type="button" role="option" aria-selected="' + String(option.value === current.value) + '" data-project-document-agent-option="' + escapeHtml(option.value) + '"><span class="better-codex-agent-menu-item-copy">' + avatar(option) + '<span>' + escapeHtml(option.label) + '</span></span><span class="better-codex-agent-menu-item-check">' + (option.value === current.value ? icon("check") : "") + '</span></button>').join("");
      return '<div class="better-codex-project-document-agent-picker better-codex-agent-setting" data-project-document-agent-picker><span>' + te("生成智能体") + '</span><input type="hidden" name="agent_id" value="' + escapeHtml(current.value) + '"><button class="better-codex-agent-picker-trigger" type="button" role="combobox" aria-haspopup="listbox" aria-expanded="false" data-project-document-agent-toggle><span>' + avatar(current) + '<span data-project-document-agent-label>' + escapeHtml(current.label) + '</span></span>' + icon("chevron") + '</button><div class="better-codex-agent-menu" role="listbox"><div class="better-codex-agent-menu-title">' + te("生成智能体") + '</div>' + rows + '</div></div>';
    }

    function projectDocumentErrorLabel(error) {
      const value = String(error || "");
      if (value === "project_overview_timeout") return t("项目文档生成超时，请重试。");
      if (value === "remote_command_timeout") return t("运行端未及时响应，请确认 Better Codex 在线后重试。");
      if (value === "workspace_missing") return t("项目文件夹不可用，无法生成文档。");
      return t("项目文档生成未能完成，请重试。");
    }

    function projectDocumentDiagramMarkup(diagram) {
      if (!diagram || !Array.isArray(diagram.nodes) || !diagram.nodes.length) return "";
      const groups = [];
      for (const node of diagram.nodes) {
        const label = String(node.group || t("视图关系"));
        let group = groups.find(item => item.label === label);
        if (!group) { group = { label, nodes: [] }; groups.push(group); }
        group.nodes.push(node);
      }
      const columns = groups.map(group => '<section class="better-codex-project-document-group"><strong>' + escapeHtml(group.label) + '</strong><div>' + group.nodes.map(node => '<article class="better-codex-project-document-node" data-project-document-node="' + escapeHtml(node.id) + '"><b>' + escapeHtml(node.label) + '</b>' + (node.detail ? '<span>' + escapeHtml(node.detail) + '</span>' : "") + '</article>').join("") + '</div></section>').join("");
      const relations = Array.isArray(diagram.edges) && diagram.edges.length ? '<div class="better-codex-project-document-relations">' + diagram.edges.map(edge => '<span><b>' + escapeHtml(edge.from) + '</b>' + icon("chevron") + '<b>' + escapeHtml(edge.to) + '</b>' + (edge.label ? '<em>' + escapeHtml(edge.label) + '</em>' : "") + '</span>').join("") + '</div>' : "";
      return '<section class="better-codex-project-document-diagram" data-project-document-diagram><div class="better-codex-project-document-diagram-head"><strong>' + te("视图关系") + '</strong><span>' + escapeHtml(diagram.nodes.length + " / " + (diagram.edges?.length || 0)) + '</span></div><div class="better-codex-project-document-graph"><svg aria-hidden="true"></svg><div class="better-codex-project-document-groups">' + columns + '</div></div>' + relations + '</section>';
    }

    function layoutProjectDocumentDiagrams(container) {
      container.querySelectorAll("[data-project-document-diagram]").forEach(diagram => {
        const svg = diagram.querySelector("svg");
        const graph = diagram.querySelector(".better-codex-project-document-graph");
        const project = state.projects.find(item => item.id === state.projectDetailId);
        const view = normalizedProjectDocumentViews(project).find(item => item.key === state.projectDocumentView);
        if (!svg || !graph || !view?.diagram?.edges) return;
        const bounds = graph.getBoundingClientRect();
        svg.setAttribute("viewBox", "0 0 " + Math.max(1, bounds.width) + " " + Math.max(1, bounds.height));
        svg.innerHTML = '<defs><marker id="better-codex-project-document-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z"></path></marker></defs>';
        const nodes = Array.from(diagram.querySelectorAll("[data-project-document-node]"));
        for (const edge of view.diagram.edges) {
          const from = nodes.find(node => node.dataset.projectDocumentNode === edge.from);
          const to = nodes.find(node => node.dataset.projectDocumentNode === edge.to);
          if (!from || !to) continue;
          const a = from.getBoundingClientRect();
          const b = to.getBoundingClientRect();
          const leftToRight = b.left >= a.right;
          const x1 = (leftToRight ? a.right : a.left + a.width / 2) - bounds.left;
          const y1 = a.top + a.height / 2 - bounds.top;
          const x2 = (leftToRight ? b.left : b.left + b.width / 2) - bounds.left;
          const y2 = b.top + b.height / 2 - bounds.top;
          const distance = Math.max(28, Math.abs(x2 - x1) * .42);
          const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
          path.setAttribute("d", "M " + x1 + " " + y1 + " C " + (x1 + distance) + " " + y1 + ", " + (x2 - distance) + " " + y2 + ", " + x2 + " " + y2);
          path.setAttribute("marker-end", "url(#better-codex-project-document-arrow)");
          svg.append(path);
        }
      });
    }

    function projectDocumentLoading(view, overallError = "") {
      const failed = view.status === "failed" || Boolean(overallError);
      const idle = view.status === "idle" && !failed;
      const title = failed ? "生成失败" : view.status === "queued" ? "等待生成" : idle ? "尚未生成这个视图" : "这个视图正在形成";
      const copy = failed ? projectDocumentErrorLabel(view.error || overallError) : idle ? t("选择智能体后生成七个相互关联的项目视图。") : t("代码、Issue 与会话证据正在被整理为结构化文档。");
      const active = ["queued", "generating"].includes(view.status);
      return '<div class="better-codex-project-document-loading' + (failed ? " is-error" : "") + '"><span class="better-codex-project-document-orbit' + (active ? " is-active" : "") + '">' + icon(failed ? "shield" : "sparkles") + '</span><strong>' + te(title) + '</strong><p>' + escapeHtml(copy) + '</p>' + (active ? '<div class="better-codex-project-document-skeleton"><i></i><i></i><i></i><i></i></div>' : "") + '</div>';
    }

    function projectDocumentWorkspace(project) {
      const pending = state.projectDocumentPending?.projectId === project.id ? state.projectDocumentPending : null;
      const sourceViews = normalizedProjectDocumentViews(project);
      const views = pending && project.overview_status !== "generating" ? sourceViews.map(view => ({ ...view, status: "queued", error: null })) : sourceViews;
      const active = views.find(view => view.key === state.projectDocumentView) || views[0];
      const generating = Boolean(pending) || project.overview_status === "generating";
      const done = sourceViews.filter(view => view.status === "ready").length;
      const current = views.find(view => view.status === "generating");
      const tabs = views.map(view => '<button type="button" role="tab" aria-selected="' + String(view.key === active.key) + '" class="better-codex-project-document-tab' + (view.key === active.key ? " is-active" : "") + '" data-project-document-view="' + view.key + '">' + icon(view.icon) + '<span>' + te(view.label) + '</span><i data-status="' + escapeHtml(view.status) + '"></i></button>').join("");
      const segments = views.map(view => '<i data-status="' + escapeHtml(view.status) + '"></i>').join("");
      const progressText = pending ? t("生成任务已提交，等待运行端接收。") : current ? t("正在生成 {view}").replace("{view}", t(current.label)) : t("已完成 {done}/7 个视图").replace("{done}", String(done));
      const progress = generating ? '<section class="better-codex-project-document-progress"><div><span>' + icon("sparkles") + '<strong>' + escapeHtml(progressText) + '</strong></span><b>' + escapeHtml(Math.round(done / 7 * 100) + "%") + '</b></div><div class="better-codex-project-document-segments">' + segments + '</div></section>' : "";
      const stale = active.html && ["queued", "generating"].includes(active.status) ? '<div class="better-codex-project-document-notice">' + icon("refresh") + '<span>' + te("当前显示上一版本，新的内容正在生成。") + '</span></div>' : "";
      const overallError = !pending && project.overview_status === "failed" && !views.some(view => view.status === "failed") ? project.overview_error : "";
      const failed = active.html && (active.status === "failed" || overallError) ? '<div class="better-codex-project-document-notice is-error">' + icon("shield") + '<span>' + escapeHtml(projectDocumentErrorLabel(active.error || overallError)) + '</span></div>' : "";
      const content = active.html ? stale + failed + projectDocumentDiagramMarkup(active.diagram) + '<article class="better-codex-project-document-content">' + active.html + '</article>' : projectDocumentLoading(active, overallError);
      const agentId = pending?.agentId ?? project.document_agent_id ?? "";
      const feedback = pending?.feedback ?? project.document_feedback ?? "";
      const inlineError = state.projectDocumentError?.projectId === project.id ? '<output data-tone="' + escapeHtml(state.projectDocumentError.tone || "danger") + '">' + escapeHtml(state.projectDocumentError.message) + '</output>' : "";
      const form = state.mockup ? "" : '<form class="better-codex-project-document-form" data-project-document-form="' + escapeHtml(project.id) + '"><label><span>' + te("修改意见") + '</span><textarea name="feedback" maxlength="4000" placeholder="' + te("告诉智能体哪些内容需要修正、补充或重新组织") + '">' + escapeHtml(feedback) + '</textarea></label><div>' + projectDocumentAgentPicker(agentId) + '<button class="better-codex-submit" type="submit"' + (generating ? " disabled" : "") + '>' + icon(generating ? "refresh" : "sparkles") + '<span>' + te(pending ? "生成中…" : views.some(view => view.html) ? "重新生成全部" : "生成完整文档") + '</span></button></div>' + inlineError + '</form>';
      return '<section class="better-codex-project-panel better-codex-project-document-panel"><header class="better-codex-project-panel-head"><strong>' + te("项目文档") + '</strong><span>' + escapeHtml(done + "/7") + '</span></header>' + progress + '<nav class="better-codex-project-document-tabs" role="tablist" aria-label="' + te("项目文档") + '">' + tabs + '</nav><div class="better-codex-project-document-scroll">' + content + '</div>' + form + '</section>';
    }

    function projectPlanningState(project) {
      const planning = project.planning || {};
      return {
        status: ["idle", "running", "ready", "failed"].includes(planning.status) ? planning.status : "idle",
        error: planning.error || null,
        agent_id: planning.agent_id || null,
        revision: Number(planning.revision) || 0,
        updated_at: planning.updated_at || null,
        messages: Array.isArray(planning.messages) ? planning.messages : [],
        plan: planning.plan || null,
      };
    }

    function projectPlanningSourceLabel(source) {
      return t({ code: "代码事实", issue: "Issue 事实", conversation: "会话事实", user: "用户输入", inference: "智能体推断" }[source] || "智能体推断");
    }

    function projectPlanningStatusLabel(status) {
      return t({ proposed: "建议", confirmed: "已确认", in_progress: "进行中", blocked: "阻塞", done: "已完成" }[status] || "建议");
    }

    function projectPlanningItemMarkup(item, index) {
      const dependencies = Array.isArray(item.dependencies) && item.dependencies.length ? '<span>' + te("依赖") + ' ' + escapeHtml(item.dependencies.join("、")) + '</span>' : "";
      const evidence = Array.isArray(item.evidence) && item.evidence.length ? '<details><summary>' + te("证据") + ' ' + escapeHtml(String(item.evidence.length)) + '</summary><ul>' + item.evidence.map(value => '<li>' + escapeHtml(value) + '</li>').join("") + '</ul></details>' : "";
      const date = item.target_date ? '<time datetime="' + escapeHtml(item.target_date) + '">' + escapeHtml(item.target_date) + '</time>' : "";
      return '<article class="better-codex-project-plan-item" data-plan-status="' + escapeHtml(item.status || "proposed") + '"><span class="better-codex-project-plan-index">' + escapeHtml(String(index + 1).padStart(2, "0")) + '</span><div><header><strong>' + escapeHtml(item.title || t("待确认")) + '</strong><span class="better-codex-project-plan-status">' + escapeHtml(projectPlanningStatusLabel(item.status)) + '</span></header>' + (item.detail ? '<p>' + escapeHtml(item.detail) + '</p>' : "") + '<footer><span data-plan-source="' + escapeHtml(item.source || "inference") + '">' + escapeHtml(projectPlanningSourceLabel(item.source)) + '</span>' + date + dependencies + '</footer>' + evidence + '</div></article>';
    }

    function projectPlanningTimelineMarkup(plan) {
      const milestones = Array.isArray(plan?.milestones) ? plan.milestones.map((item, index) => ({ item, index })) : [];
      if (!milestones.length) return "";
      milestones.sort((left, right) => {
        if (left.item.target_date && right.item.target_date) return left.item.target_date.localeCompare(right.item.target_date) || left.index - right.index;
        if (left.item.target_date) return -1;
        if (right.item.target_date) return 1;
        return left.index - right.index;
      });
      const dated = milestones.filter(entry => entry.item.target_date).length;
      const rows = milestones.map(({ item }) => {
        const date = item.target_date
          ? '<time class="better-codex-project-plan-timeline-date" datetime="' + escapeHtml(item.target_date) + '">' + escapeHtml(item.target_date) + '</time>'
          : '<span class="better-codex-project-plan-timeline-date" data-pending="true">' + te("日期待定") + '</span>';
        const dependencies = Array.isArray(item.dependencies) && item.dependencies.length ? '<span>' + te("依赖") + ' ' + escapeHtml(item.dependencies.join("、")) + '</span>' : "";
        return '<li data-plan-status="' + escapeHtml(item.status || "proposed") + '">' + date + '<span class="better-codex-project-plan-timeline-rail" aria-hidden="true"></span><div class="better-codex-project-plan-timeline-copy"><header><strong>' + escapeHtml(item.title || t("待确认")) + '</strong><span class="better-codex-project-plan-status">' + escapeHtml(projectPlanningStatusLabel(item.status)) + '</span></header>' + (item.detail ? '<p>' + escapeHtml(item.detail) + '</p>' : "") + '<footer><span>' + escapeHtml(projectPlanningSourceLabel(item.source)) + '</span>' + dependencies + '</footer></div></li>';
      }).join("");
      return '<section class="better-codex-project-plan-timeline" aria-label="' + te("里程碑时间线") + '"><header><div><strong>' + te("里程碑时间线") + '</strong><span>' + te("按目标日期排序") + '</span></div><span>' + escapeHtml(dated + "/" + milestones.length + " " + t("已排期")) + '</span></header><ol>' + rows + '</ol></section>';
    }

    function projectPlanningSection(plan, key, label) {
      const items = Array.isArray(plan?.[key]) ? plan[key] : [];
      if (!items.length) return "";
      return '<section class="better-codex-project-plan-section" data-plan-section="' + escapeHtml(key) + '"><header><strong>' + te(label) + '</strong><span>' + escapeHtml(String(items.length)) + '</span></header><div>' + items.map((item, index) => projectPlanningItemMarkup(item, index)).join("") + '</div></section>';
    }

    function projectPlanningErrorLabel(error) {
      const value = String(error || "");
      if (value === "project_planning_busy") return t("规划会话正在运行，请等待完成。");
      if (value === "workspace_missing") return t("项目文件夹不可用，无法生成文档。");
      if (value === "remote_command_timeout") return t("运行端未及时响应，请确认 Better Codex 在线后重试。");
      return t("规划会话未能完成，请重试。");
    }

    function projectPlanningMarkup(project) {
      const planning = projectPlanningState(project);
      const pending = state.projectPlanningPending?.projectId === project.id ? state.projectPlanningPending : null;
      const running = planning.status === "running" || Boolean(pending);
      const plan = planning.plan;
      const sections = plan ? [
        ["outcomes", "预期成果"],
        ["milestones", "里程碑"],
        ["workstreams", "工作流"],
        ["risks", "风险"],
        ["decisions", "决策"],
        ["open_questions", "待确认"],
        ["delivery", "交付路径"],
        ["evidence", "证据"],
      ].map(([key, label]) => projectPlanningSection(plan, key, label)).join("") : "";
      const timeline = projectPlanningTimelineMarkup(plan);
      const planBody = plan
        ? '<div class="better-codex-project-plan-scroll"><section class="better-codex-project-plan-summary"><span>' + te("规划摘要") + '</span><p>' + escapeHtml(plan.summary || t("尚未生成项目计划")) + '</p></section>' + timeline + sections + '</div>'
        : '<div class="better-codex-project-plan-empty">' + icon("layout") + '<strong>' + te("尚未生成项目计划") + '</strong><p>' + te("从一个问题开始，智能体会读取代码、Issue 和关联会话。") + '</p></div>';
      const failure = planning.status === "failed" ? '<div class="better-codex-project-planning-alert">' + icon("shield") + '<span>' + te("计划生成失败，当前仍显示上一版本。") + '</span></div>' : "";
      const messages = [...planning.messages];
      if (pending && !messages.some(message => message.role === "user" && message.markdown === pending.message)) messages.push({ id: "pending", role: "user", markdown: pending.message, html: "", created_at: new Date().toISOString() });
      const conversation = messages.length
        ? messages.map(message => '<article class="better-codex-project-planning-message" data-role="' + escapeHtml(message.role) + '"><header><strong>' + escapeHtml(message.role === "user" ? state.user.name || t("你") : "Codex") + '</strong><time>' + escapeHtml(timeAgo(message.created_at)) + '</time></header><div>' + (message.role === "agent" && message.html ? message.html : '<p>' + escapeHtml(message.markdown) + '</p>') + '</div></article>').join("")
        : '<div class="better-codex-project-planning-starters"><span>' + te("从一个问题开始，智能体会读取代码、Issue 和关联会话。") + '</span>' + ["梳理这个项目的目标、范围和非目标", "根据当前代码和 Issue 生成下一阶段计划", "找出当前最大的风险、依赖和待确认问题"].map(prompt => '<button type="button" data-project-planning-prompt="' + escapeHtml(prompt) + '">' + escapeHtml(t(prompt)) + icon("chevron") + '</button>').join("") + '</div>';
      const selectedAgent = state.agents.find(agent => agentKey(agent) === String(planning.agent_id || "default"));
      const agentControl = planning.messages.length || planning.agent_id
        ? '<input type="hidden" name="agent_id" value="' + escapeHtml(planning.agent_id || "") + '"><span class="better-codex-project-planning-agent">' + (selectedAgent ? agentAvatarMarkup(selectedAgent, "better-codex-project-document-agent-avatar") + '<span>' + escapeHtml(agentDisplayName(selectedAgent)) + '</span>' : icon("bot") + '<span>' + te("使用默认智能体") + '</span>') + '</span>'
        : projectDocumentAgentPicker("");
      const inlineError = state.projectPlanningError?.projectId === project.id ? '<output data-tone="' + escapeHtml(state.projectPlanningError.tone || "danger") + '">' + escapeHtml(state.projectPlanningError.message) + '</output>' : "";
      const draft = projectPlanningDrafts.get(project.id) || "";
      const form = state.mockup ? "" : '<form class="better-codex-project-planning-form" data-project-planning-form="' + escapeHtml(project.id) + '"><textarea name="message" maxlength="12000" rows="3" placeholder="' + te("询问项目规划…") + '"' + (running ? " disabled" : "") + '>' + escapeHtml(draft) + '</textarea><div>' + agentControl + '<button class="better-codex-submit" type="submit"' + (running ? " disabled" : "") + '>' + icon(running ? "refresh" : "send") + '<span>' + te(running ? "规划中…" : "发送") + '</span></button></div>' + inlineError + '</form>';
      const reset = planning.messages.length && !state.mockup ? '<button type="button" data-project-planning-reset="' + escapeHtml(project.id) + '"' + (running ? " disabled" : "") + '>' + icon("refresh") + '<span>' + te("新对话") + '</span></button>' : "";
      return '<section class="better-codex-project-planning-layout"><article class="better-codex-project-plan"><header class="better-codex-project-planning-panel-head"><div><span>' + te("项目规划") + '</span><strong>' + escapeHtml(planning.revision ? t("计划版本") + " " + planning.revision : t("项目事实")) + '</strong></div><span>' + (planning.updated_at ? escapeHtml(timeAgo(planning.updated_at)) : te("暂无明确日期")) + '</span></header>' + failure + planBody + '<footer class="better-codex-project-plan-foot">' + te("计划内容来自规划对话，不会自动修改 Issue。") + '</footer></article><aside class="better-codex-project-planning-chat"><header class="better-codex-project-planning-panel-head"><div><span>' + te("规划对话") + '</span><strong>' + te("与智能体对话，把目标、里程碑、风险和交付证据整理成可执行计划。") + '</strong></div>' + reset + '</header><div class="better-codex-project-planning-messages" aria-live="polite">' + conversation + (running ? '<div class="better-codex-project-planning-running">' + icon("refresh") + '<span>' + te("规划中…") + '</span></div>' : "") + '</div>' + form + '</aside></section>';
    }

    function projectDashboardMarkup(project, issues, issuesLoading, paths) {
      const activeIssues = issues.filter(issue => !issue.archived_at);
      const counts = activeIssues.reduce((result, issue) => { result[issue.status] = (result[issue.status] || 0) + 1; return result; }, {});
      const running = activeIssues.filter(issue => issue.status === "in_progress" || ["claimed", "running", "scheduling"].includes(issue.active_run_status)).length;
      const review = counts.in_review || 0;
      const blocked = counts.blocked || 0;
      const attention = activeIssues.filter(issue => issue.needs_attention || issue.status === "blocked" || issue.pending_actor === "user" && issue.status === "in_review");
      const healthTone = blocked ? "danger" : attention.length ? "warning" : "success";
      const healthLabel = blocked ? t("有风险") : attention.length ? t("需关注") : t("进展正常");
      const activeAgentIds = new Set(activeIssues.filter(issue => issue.agent_enabled && ["in_progress", "in_review", "blocked"].includes(issue.status)).map(issue => String(issue.agent_id || "default")));
      const projectAgentIds = new Set(activeIssues.filter(issue => issue.agent_enabled).map(issue => String(issue.agent_id || "default")));
      const agents = state.agents.filter(agent => projectAgentIds.has(agentKey(agent))).sort((left, right) => Number(activeAgentIds.has(agentKey(right))) - Number(activeAgentIds.has(agentKey(left)))).slice(0, 3);
      const agentAvatars = agents.map(agent => agentAvatarMarkup(agent, "better-codex-project-dashboard-avatar")).join("");
      const page = ["overview", "planning", "work"].includes(state.projectPage) ? state.projectPage : "overview";
      const headerActions = '<div class="better-codex-project-dashboard-actions">' + (agentAvatars ? '<div class="better-codex-project-dashboard-people" aria-label="' + te("项目智能体") + '">' + agentAvatars + '</div>' : "") + '<button class="better-codex-project-dashboard-delete" type="button" data-project-delete="' + escapeHtml(project.id) + '" aria-label="' + te("删除项目") + '" title="' + te("删除项目") + '">' + icon("trash") + '<span>' + te("删除项目") + '</span></button></div>';
      const header = '<header class="better-codex-project-dashboard-head"><div class="better-codex-project-dashboard-title"><div><h1>' + escapeHtml(projectLabel(project)) + '</h1><span data-project-health-badge data-tone="' + healthTone + '">' + escapeHtml(healthLabel) + '</span></div><p>' + escapeHtml(project.description || t("尚未生成项目介绍")) + '</p></div>' + headerActions + '</header><nav class="better-codex-project-dashboard-tabs" aria-label="' + te("项目页面") + '"><button type="button" data-project-dashboard-view="overview"' + (page === "overview" ? ' aria-current="page"' : "") + '>' + te("概览") + '</button><button type="button" data-project-dashboard-view="planning"' + (page === "planning" ? ' aria-current="page"' : "") + '>' + te("规划") + '</button><button type="button" data-project-dashboard-view="work"' + (page === "work" ? ' aria-current="page"' : "") + '>' + te("工作") + '</button></nav>';
      if (page === "planning") return '<section class="better-codex-project-dashboard">' + header + projectPlanningMarkup(project) + '</section>';
      if (page === "work") return '<section class="better-codex-project-dashboard">' + header + '<main class="better-codex-board better-codex-project-work-board" data-project-board></main></section>';
      const priority = { blocked: 0, in_review: 1, in_progress: 2, todo: 3, backlog: 4, done: 5 };
      const work = [...activeIssues].filter(issue => ["blocked", "in_review", "in_progress", "todo"].includes(issue.status)).sort((left, right) => (priority[left.status] ?? 9) - (priority[right.status] ?? 9) || String(right.updated_at).localeCompare(String(left.updated_at))).slice(0, 5);
      const issueAssignee = issue => {
        if (issue.user_assigned) return issueUserProfile(issue)?.name || t("你");
        if (!issue.agent_enabled) return t("未指派");
        const agent = state.agents.find(item => agentKey(item) === String(issue.agent_id || "default"));
        return agent ? agentDisplayName(agent) : "Codex";
      };
      const workRows = issuesLoading ? '<div class="better-codex-project-dashboard-empty">' + te("正在加载当前工作") + '</div>' : work.length ? work.map(issue => '<button class="better-codex-project-work-row" type="button" data-project-issue="' + escapeHtml(issue.id) + '">' + statusIcon(issue.status) + '<b>' + escapeHtml(issue.identifier) + '</b><span class="better-codex-project-work-title"><strong>' + escapeHtml(issue.title) + '</strong><span>' + escapeHtml(issueAssignee(issue)) + ' · ' + te("更新于 " + timeAgo(issue.updated_at)) + '</span></span><span class="better-codex-project-work-state">' + te(statusLabels[issue.status] || issue.status) + '</span></button>').join("") : '<div class="better-codex-project-dashboard-empty">' + te("当前没有进行中的工作") + '</div>';
      const attentionRows = issuesLoading ? '<div class="better-codex-project-dashboard-empty">' + te("正在加载待处理事项") + '</div>' : attention.length ? attention.slice(0, 4).map(issue => '<button class="better-codex-project-attention-row" type="button" data-project-issue="' + escapeHtml(issue.id) + '"><span class="better-codex-project-attention-icon">' + icon(issue.status === "blocked" ? "shield" : "review") + '</span><span class="better-codex-project-attention-copy"><strong>' + escapeHtml(issue.title) + '</strong><span>' + escapeHtml(issue.identifier) + ' · ' + escapeHtml(issueAssignee(issue)) + '</span></span><span class="better-codex-project-attention-state">' + escapeHtml(issue.status === "blocked" ? t("需解阻") : issue.status === "in_review" ? t("需复核") : t("需处理")) + '</span></button>').join("") : '<div class="better-codex-project-dashboard-empty">' + te("没有需要你处理的事项") + '</div>';
      const planning = projectPlanningState(project);
      const milestoneItems = Array.isArray(planning.plan?.milestones) ? planning.plan.milestones.slice(0, 3) : [];
      const milestones = milestoneItems.length ? milestoneItems.map((item, index) => projectPlanningItemMarkup(item, index)).join("") : '<div class="better-codex-project-dashboard-empty">' + te("尚未生成项目计划") + '</div>';
      const path = paths[0] || t("未提供项目文件夹");
      return '<section class="better-codex-project-dashboard">' + header + '<section class="better-codex-project-dashboard-summary"><article class="better-codex-project-dashboard-card better-codex-project-dashboard-description"><strong>' + te("项目事实") + '</strong><p>' + escapeHtml(project.description || t("尚未生成项目介绍")) + '</p><div class="better-codex-project-dashboard-path" title="' + escapeHtml(path) + '">' + icon("folder") + '<span>' + escapeHtml(path) + '</span></div></article><article class="better-codex-project-dashboard-card"><strong>' + te("当前状态") + '</strong><div class="better-codex-project-metrics"><span class="better-codex-project-metric"><b>' + escapeHtml(String(running)) + '</b><span>' + te("进行中") + '</span></span><span class="better-codex-project-metric" data-tone="warning"><b>' + escapeHtml(String(review)) + '</b><span>' + te("待复核") + '</span></span><span class="better-codex-project-metric" data-tone="danger"><b>' + escapeHtml(String(blocked)) + '</b><span>' + te("阻塞") + '</span></span></div></article><article class="better-codex-project-dashboard-card better-codex-project-planning-overview"><header class="better-codex-project-section-head"><strong>' + te("项目规划") + '</strong><button type="button" data-project-dashboard-view="planning">' + te(planning.revision ? "计划版本" : "规划") + (planning.revision ? " " + escapeHtml(String(planning.revision)) : "") + icon("chevron") + '</button></header><p>' + escapeHtml(planning.plan?.summary || t("从一个问题开始，智能体会读取代码、Issue 和关联会话。")) + '</p></article></section><section class="better-codex-project-dashboard-card better-codex-project-overview-milestones"><header class="better-codex-project-section-head"><strong>' + te("里程碑") + '</strong><span>' + escapeHtml(String(milestoneItems.length)) + '</span></header><div>' + milestones + '</div></section><section class="better-codex-project-dashboard-lists"><article class="better-codex-project-dashboard-card"><header class="better-codex-project-section-head"><strong>' + te("当前工作") + '</strong><span>' + escapeHtml(String(work.length)) + '</span></header><div class="better-codex-project-work-list">' + workRows + '</div></article><article class="better-codex-project-dashboard-card"><header class="better-codex-project-section-head"><strong>' + te("等你处理") + '</strong><span>' + escapeHtml(String(attention.length)) + '</span></header><div class="better-codex-project-attention-list">' + attentionRows + '</div></article></section></section>';
    }

    function projectRenderKey() {
      return state.projectDetailId ? [state.projectDetailId, state.projectPage, state.projectDocumentView].join(":") : "projects";
    }

    function projectScrollState(container) {
      const surfaces = [
        ["page", ""],
        ["issues", ".better-codex-project-issues"],
        ["timeline", ".better-codex-project-timeline-scroll"],
        ["document-tabs", ".better-codex-project-document-tabs"],
        ["document", ".better-codex-project-document-scroll"],
        ["plan", ".better-codex-project-plan-scroll"],
        ["planning-messages", ".better-codex-project-planning-messages"],
        ["board", "[data-project-board]"],
      ];
      return surfaces.flatMap(([name, selector]) => {
        const surface = selector ? container.querySelector(selector) : container;
        if (!surface) return [];
        return [{ name, selector, top: surface.scrollTop, left: surface.scrollLeft, stickToEnd: name === "planning-messages" && surface.scrollHeight - surface.scrollTop - surface.clientHeight < 48 }];
      });
    }

    function restoreProjectScrollState(container, viewKey, positions) {
      if (container.dataset.projectRenderKey !== viewKey) return;
      for (const position of positions) {
        const surface = position.selector ? container.querySelector(position.selector) : container;
        if (!surface) continue;
        surface.scrollLeft = position.left;
        surface.scrollTop = position.stickToEnd ? surface.scrollHeight : position.top;
      }
    }

    function destroyProjectRenderComponents() {
      projectEmptyState?.destroy();
      projectEmptyState = null;
      projectHealthBadge?.destroy();
      projectHealthBadge = null;
    }

    function renderProjectContent(container, markup) {
      const viewKey = projectRenderKey();
      const sameView = container.dataset.projectRenderKey === viewKey;
      if (sameView && projectRenderedMarkup === markup) return;
      const positions = sameView ? projectScrollState(container) : [];
      destroyProjectRenderComponents();
      container.innerHTML = markup;
      container.dataset.projectRenderKey = viewKey;
      projectRenderedMarkup = markup;
      restoreProjectScrollState(container, viewKey, positions);
      requestAnimationFrame(() => {
        restoreProjectScrollState(container, viewKey, positions);
        if (!positions.length) return;
        appendDiagnostic("project_scroll_restored", {
          project_id: state.projectDetailId,
          page: state.projectPage,
          surfaces: positions.filter(position => position.top || position.left || position.stickToEnd).map(position => position.name).join(",") || "zero",
        });
      });
    }

    function renderProjectEmptyState(container) {
      const markup = '<span data-project-empty-state></span>';
      renderProjectContent(container, markup);
      const props = {
        action: state.mockup ? undefined : {
          icon: LUCIDE_ICONS.plus,
          label: t("创建项目"),
          onPress: () => openCreateProjectDialog(),
          variant: "primary",
        },
        description: t("创建项目后，它会出现在 Codex 的项目列表中。"),
        icon: LUCIDE_ICONS.folder,
        title: t("暂无项目"),
      };
      if (projectEmptyState) {
        projectEmptyState.update(props);
        return;
      }
      const placeholder = container.querySelector("[data-project-empty-state]");
      if (!placeholder) throw new Error("project_empty_state_mount_missing");
      projectEmptyState = createEmptyState(props, componentContext("projects", "projects-empty-state"));
      placeholder.replaceWith(projectEmptyState.element);
    }

    function mountProjectHealthBadge(container, projectId) {
      const placeholder = container.querySelector("[data-project-health-badge]");
      if (!placeholder) throw new Error("project_health_badge_mount_missing");
      projectHealthBadge = createStatusBadge({
        label: placeholder.textContent || "",
        variant: placeholder.dataset.tone || "success",
      }, componentContext("projects", "project-health:" + projectId));
      projectHealthBadge.element.classList.add("better-codex-project-health");
      placeholder.replaceWith(projectHealthBadge.element);
    }

    function renderProjects() {
      const container = panel?.querySelector("#better-codex-projects");
      if (!container) return;
      const focusedEditor = container.querySelector("textarea:focus");
      const planningEditor = container.querySelector("[data-project-planning-form] textarea[name=message]");
      const planningProjectId = planningEditor?.closest("[data-project-planning-form]")?.dataset.projectPlanningForm || "";
      const focusedProjectId = focusedEditor?.closest("[data-project-planning-form]")?.dataset.projectPlanningForm || focusedEditor?.closest("[data-project-document-form]")?.dataset.projectDocumentForm || state.projectDetailId;
      if (projectPlanningComposition && projectPlanningComposition !== state.projectDetailId) projectPlanningComposition = "";
      const activePlanningEditor = planningEditor && planningProjectId === state.projectDetailId && (planningEditor === focusedEditor || projectPlanningComposition === planningProjectId) ? planningEditor : null;
      const activeEditor = activePlanningEditor || (focusedEditor && focusedProjectId === state.projectDetailId ? focusedEditor : null);
      if (activeEditor) {
        const projectId = activePlanningEditor ? planningProjectId : focusedProjectId;
        if (activePlanningEditor && projectId) projectPlanningDrafts.set(projectId, activePlanningEditor.value);
        if (!projectRenderDeferred) appendDiagnostic("project_render_deferred", { project_id: projectId, editor: activePlanningEditor ? "planning" : "project", reason: projectPlanningComposition === projectId ? "composition" : "focus" });
        projectRenderDeferred = { projectId, editor: activePlanningEditor ? "planning" : "project" };
        return;
      }
      if (projectRenderDeferred) {
        appendDiagnostic("project_render_resumed", { project_id: projectRenderDeferred.projectId, editor: projectRenderDeferred.editor });
        projectRenderDeferred = null;
      }
      const heading = panel.querySelector(".better-codex-project-heading");
      syncProjectRefreshButton();
      const createButton = panel.querySelector(".better-codex-project-actions .better-codex-button");
      if (createButton) {
        createButton.hidden = false;
        createButton.innerHTML = icon("plus") + '<span>' + te(state.projectDetailId ? "新建工作项" : "创建项目") + '</span>';
      }
      if (!state.projectDetailId) {
        if (heading) heading.innerHTML = '<strong>' + te("项目管理") + '</strong><span>' + escapeHtml(state.projects.length + " " + t("个项目")) + '</span>';
        if (HOST_KIND === "web" && state.surface === "projects") document.title = t("项目管理") + " · Better Codex";
        if (!state.projects.length) {
          renderProjectEmptyState(container);
          return;
        }
        renderProjectContent(container, '<section class="better-codex-project-list">' + projectsByRecentActivity(state.projects).map(project => {
          const paths = projectRootPaths(project);
          const description = project.description || t("尚未生成项目介绍");
          return '<button class="better-codex-project-card" type="button" data-project-id="' + escapeHtml(project.id) + '"><span class="better-codex-project-card-head"><span class="better-codex-project-card-icon">' + icon("folder") + '</span><span class="better-codex-project-card-title"><strong>' + escapeHtml(projectLabel(project)) + '</strong><span>' + escapeHtml(paths.length + " " + t("个文件夹")) + '</span></span>' + icon("chevron") + '</span><span class="better-codex-project-card-description">' + escapeHtml(description) + '</span><span class="better-codex-project-card-path">' + icon("folder") + '<span>' + escapeHtml(paths[0] || t("未提供")) + '</span></span></button>';
        }).join("") + '</section>');
        return;
      }
      const project = state.projects.find(item => item.id === state.projectDetailId);
      if (!project) {
        if (!state.projectsLoaded) {
          if (heading) heading.innerHTML = '<strong>' + te("项目管理") + '</strong>';
          renderProjectContent(container, "");
          return;
        }
        state.projectDetailId = "";
        syncWebProjectRoute("", "replace");
        return renderProjects();
      }
      const paths = projectRootPaths(project);
      state.projectId = project.id;
      localStorage.setItem(PROJECT_KEY, state.projectId);
      const issuesLoading = state.projectIssuesProjectId !== project.id;
      const issues = issuesLoading ? [] : [...state.projectIssues].sort((left, right) => String(right.updated_at).localeCompare(String(left.updated_at)));
      const projectName = projectLabel(project);
      if (heading) heading.innerHTML = '<button class="better-codex-project-back" type="button" data-project-back aria-label="' + te("返回项目列表") + '">' + icon("chevron") + '</button><nav class="better-codex-project-breadcrumb" aria-label="' + te("项目管理") + '"><button type="button" data-project-home>' + te("项目管理") + '</button><span aria-hidden="true">&gt;</span><strong title="' + escapeHtml(projectName) + '">' + escapeHtml(projectName) + '</strong></nav>';
      if (HOST_KIND === "web" && state.surface === "projects") document.title = t("项目管理") + " > " + projectName + " · Better Codex";
      renderProjectContent(container, '<section class="better-codex-project-detail">' + projectDashboardMarkup(project, issues, issuesLoading, paths) + '</section>');
      if (!projectHealthBadge) mountProjectHealthBadge(container, project.id);
      if (state.projectPage === "work") {
        const board = container.querySelector("[data-project-board]");
        if (!board) throw new Error("project_board_mount_missing");
        renderBoard({ board, issues: state.issues.filter(issue => issue.project_id === project.id), loaded: state.issuesLoaded, projectId: project.id });
      }
    }

    async function loadProjects(options = {}) {
      const requestOptions = { passive: Boolean(options.background) };
      const projects = await requestProjects(requestOptions);
      const projectsChanged = JSON.stringify(projects) !== JSON.stringify(state.projects);
      let projectIssuesChanged = false;
      const pending = state.projectDocumentPending;
      if (pending) {
        const project = projects.find(item => item.id === pending.projectId);
        if (project && (project.overview_status === "generating" || String(project.updated_at || "") !== pending.updatedAt)) state.projectDocumentPending = null;
      }
      const planningPending = state.projectPlanningPending;
      if (planningPending) {
        const project = projects.find(item => item.id === planningPending.projectId);
        if (project && (project.planning?.status === "running" || String(project.updated_at || "") !== planningPending.updatedAt)) state.projectPlanningPending = null;
      }
      state.projects = projects;
      state.projectsLoaded = true;
      if (state.projectDetailId) {
        if (!state.projects.some(project => project.id === state.projectDetailId)) {
          state.projectDetailId = "";
          state.projectIssues = [];
          state.projectIssuesProjectId = "";
          syncWebProjectRoute("", "replace");
        }
        else {
          const projectId = state.projectDetailId;
          if (state.projectIssuesProjectId !== projectId) {
            state.projectIssues = [];
            renderProjects();
          }
          const [activeIssues, archivedIssues] = await Promise.all([
            requestList("/api/issues?project_id=" + encodeURIComponent(projectId), "issues", requestOptions),
            requestList("/api/issues?archived=1&project_id=" + encodeURIComponent(projectId), "issues", requestOptions),
          ]);
          if (state.projectDetailId === projectId) {
            const projectIssues = [...activeIssues, ...archivedIssues];
            projectIssuesChanged = JSON.stringify(projectIssues) !== JSON.stringify(state.projectIssues);
            state.projectIssues = projectIssues;
            state.projectIssuesProjectId = projectId;
          }
        }
      }
      if (options.background && !projectsChanged && !projectIssuesChanged) return;
      if (options.background) appendDiagnostic("project_background_update", { project_id: state.projectDetailId, projects_changed: projectsChanged, issues_changed: projectIssuesChanged });
      render();
    }

    async function openProjectDetail(projectId) {
      state.projectDetailId = projectId;
      state.projectPage = "overview";
      state.projectId = projectId;
      localStorage.setItem(PROJECT_KEY, state.projectId);
      state.projectIssues = [];
      state.projectIssuesProjectId = "";
      syncWebProjectRoute(projectId);
      renderProjects();
      await loadProjects();
    }

    function onProjectsClick(event) {
      const agentOption = event.target.closest("[data-project-document-agent-option]");
      if (agentOption) {
        const picker = agentOption.closest("[data-project-document-agent-picker]");
        const input = picker?.querySelector('[name="agent_id"]');
        if (!picker || !input) return;
        input.value = agentOption.dataset.projectDocumentAgentOption || "";
        picker.outerHTML = projectDocumentAgentPicker(input.value);
        return;
      }
      const agentToggle = event.target.closest("[data-project-document-agent-toggle]");
      if (agentToggle) {
        const picker = agentToggle.closest("[data-project-document-agent-picker]");
        const opening = !picker.classList.contains("is-open");
        panel.querySelectorAll("[data-project-document-agent-picker].is-open").forEach(item => {
          item.classList.remove("is-open");
          item.querySelector("[data-project-document-agent-toggle]")?.setAttribute("aria-expanded", "false");
        });
        picker.classList.toggle("is-open", opening);
        agentToggle.setAttribute("aria-expanded", String(opening));
        return;
      }
      panel.querySelectorAll("[data-project-document-agent-picker].is-open").forEach(item => {
        item.classList.remove("is-open");
        item.querySelector("[data-project-document-agent-toggle]")?.setAttribute("aria-expanded", "false");
      });
      const back = event.target.closest("[data-project-back],[data-project-home]");
      if (back) {
        if (HOST_KIND === "web" && history.state?.betterCodexProjectFromHome) return history.back();
        state.projectDetailId = "";
        syncWebProjectRoute("", "replace");
        renderProjects();
        return;
      }
      const projectDelete = event.target.closest("[data-project-delete]");
      if (projectDelete) {
        const projectId = projectDelete.dataset.projectDelete || "";
        const project = state.projects.find(item => item.id === projectId);
        if (!project) return;
        appendDiagnostic("project_delete_requested", { project_id: projectId, workspace_path_present: Boolean(project.workspace_path) });
        return void confirmAction("删除项目", "项目、任务与规划会从 Better Codex 和 Codex 清单移除，磁盘文件夹和文件会保留。", "删除项目").then(confirmed => confirmed && perform(async () => {
          const result = await api("/api/projects/" + encodeURIComponent(projectId), { method: "DELETE", body: "{}" });
          if (result.command_id) {
            const command = await waitForRemoteCommand(result.command_id);
            if (command.status !== "applied") throw new Error(command.error || "command_rejected");
          }
          projectPlanningDrafts.delete(projectId);
          state.projects = state.projects.filter(item => item.id !== projectId);
          state.issues = state.issues.filter(item => item.project_id !== projectId);
          state.projectIssues = [];
          state.projectIssuesProjectId = "";
          state.projectDetailId = "";
          state.projectId = "";
          localStorage.removeItem(PROJECT_KEY);
          syncWebProjectRoute("", "replace");
          appendDiagnostic("project_delete_completed", { project_id: projectId, workspace_deleted: false });
          await loadProjects();
        }));
      }
      const dashboardView = event.target.closest("[data-project-dashboard-view]");
      if (dashboardView) {
        const page = dashboardView.dataset.projectDashboardView;
        state.projectPage = ["overview", "planning", "work"].includes(page) ? page : "overview";
        renderProjects();
        if (state.projectPage === "planning") requestAnimationFrame(() => {
          const messages = panel.querySelector(".better-codex-project-planning-messages");
          if (messages) messages.scrollTop = messages.scrollHeight;
        });
        if (state.projectPage === "work" && !state.issuesLoaded) void perform(() => loadIssues());
        return;
      }
      const planningPrompt = event.target.closest("[data-project-planning-prompt]");
      if (planningPrompt) {
        const textarea = panel.querySelector("[data-project-planning-form] textarea[name=message]");
        if (!textarea) return;
        textarea.value = planningPrompt.dataset.projectPlanningPrompt || "";
        const projectId = textarea.closest("[data-project-planning-form]")?.dataset.projectPlanningForm;
        if (projectId) projectPlanningDrafts.set(projectId, textarea.value);
        textarea.focus();
        textarea.setSelectionRange(textarea.value.length, textarea.value.length);
        return;
      }
      const planningReset = event.target.closest("[data-project-planning-reset]");
      if (planningReset && !planningReset.disabled) {
        const projectId = planningReset.dataset.projectPlanningReset;
        return void confirmAction("开始新规划对话", "这会清除当前规划对话和计划版本。", "新对话").then(confirmed => confirmed && perform(async () => {
          const result = await api("/api/projects/" + encodeURIComponent(projectId) + "/planning/reset", { method: "POST", body: "{}" });
          if (result.command_id) {
            const command = await waitForRemoteCommand(result.command_id);
            if (command.status !== "applied") throw new Error(command.error || "command_rejected");
          }
          projectPlanningDrafts.delete(projectId);
          state.projectPlanningError = null;
          await loadProjects();
        }));
      }
      const documentView = event.target.closest("[data-project-document-view]");
      if (documentView) {
        state.projectDocumentView = documentView.dataset.projectDocumentView;
        renderProjects();
        return;
      }
      const issue = event.target.closest("[data-project-issue]");
      if (issue) {
        const selected = state.projectIssues.find(item => item.id === issue.dataset.projectIssue);
        if (selected && !issuePermissions(selected).enrichmentPending) return void perform(() => openEditor(selected));
        return;
      }
      const project = event.target.closest("[data-project-id]");
      if (project) {
        state.projectPage = "overview";
        state.projectDocumentView = "charter";
        void perform(() => openProjectDetail(project.dataset.projectId));
      }
    }

    function onProjectDocumentSubmit(event) {
      const form = event.target.closest("[data-project-document-form]");
      if (!form) return;
      event.preventDefault();
      if (state.projectDocumentPending?.projectId === form.dataset.projectDocumentForm) return;
      const data = new FormData(form);
      const projectId = form.dataset.projectDocumentForm;
      const project = state.projects.find(item => item.id === projectId);
      const agentId = String(data.get("agent_id") || "");
      const feedback = String(data.get("feedback") || "");
      state.projectDocumentError = null;
      state.projectDocumentPending = { projectId, agentId, feedback, updatedAt: String(project?.updated_at || "") };
      renderProjects();
      void (async () => {
        try {
          const result = await api("/api/projects/" + encodeURIComponent(projectId) + "/overview", { method: "POST", body: JSON.stringify({ agent_id: agentId, feedback }) });
          if (result.command_id) {
            const command = await waitForRemoteCommand(result.command_id);
            if (command.status !== "applied") throw new Error(command.error || "command_rejected");
          }
          await loadProjects();
        } catch (error) {
          state.projectDocumentPending = null;
          const presentation = reportUnexpectedError(error, { source: "project_document" });
          state.projectDocumentError = { projectId, message: projectDocumentErrorLabel(error instanceof Error ? error.message : error), tone: presentation.tone };
          renderProjects();
        }
      })();
    }

    function onProjectPlanningSubmit(event) {
      const form = event.target.closest("[data-project-planning-form]");
      if (!form) return;
      event.preventDefault();
      const projectId = form.dataset.projectPlanningForm;
      if (state.projectPlanningPending?.projectId === projectId) return;
      const project = state.projects.find(item => item.id === projectId);
      if (projectPlanningState(project || {}).status === "running") return;
      const data = new FormData(form);
      const message = String(data.get("message") || "").trim();
      const agentId = String(data.get("agent_id") || "");
      if (!message) return void form.querySelector("textarea")?.focus();
      state.projectPlanningError = null;
      state.projectPlanningPending = { projectId, message, updatedAt: String(project?.updated_at || "") };
      projectPlanningDrafts.delete(projectId);
      renderProjects();
      void (async () => {
        try {
          const result = await api("/api/projects/" + encodeURIComponent(projectId) + "/planning/messages", { method: "POST", body: JSON.stringify({ agent_id: agentId, message }) });
          if (result.command_id) {
            const command = await waitForRemoteCommand(result.command_id);
            if (command.status !== "applied") throw new Error(command.error || "command_rejected");
          }
          await loadProjects();
        } catch (error) {
          state.projectPlanningPending = null;
          projectPlanningDrafts.set(projectId, message);
          const presentation = reportUnexpectedError(error, { source: "project_planning" });
          state.projectPlanningError = { projectId, message: projectPlanningErrorLabel(error instanceof Error ? error.message : error), tone: presentation.tone };
          renderProjects();
        }
      })();
    }

    function openCreateProjectDialog() {
      document.getElementById("better-codex-project-dialog")?.remove();
      const dialog = document.createElement("dialog");
      dialog.id = "better-codex-project-dialog";
      dialog.setAttribute(OWNED, "true");
      dialog.dataset.directoryBrowser = REMOTE ? "true" : "false";
      const directoryBrowser = REMOTE ? '<section class="better-codex-directory-browser" aria-label="' + te("浏览本机文件夹") + '"><div class="better-codex-directory-toolbar"><button type="button" data-directory-up aria-label="' + te("上一级") + '" disabled>' + icon("send") + '</button><input data-directory-path maxlength="4096" aria-label="' + te("目录路径") + '" autocomplete="off" spellcheck="false"></div><div class="better-codex-directory-shortcuts"><button type="button" data-directory-home>' + icon("folder") + '<span>' + te("主目录") + '</span></button><button type="button" data-directory-root>' + icon("folder") + '<span>' + te("文件系统") + '</span></button><button type="button" data-directory-hidden aria-pressed="false" aria-label="' + te("显示隐藏目录") + '" title="' + te("显示隐藏目录") + '" disabled>' + icon("eyeOff") + '<span>' + te("显示隐藏目录") + '</span></button><button type="button" data-directory-create disabled>' + icon("plus") + '<span>' + te("新建文件夹") + '</span></button></div><div class="better-codex-directory-create" hidden><input data-directory-create-name maxlength="120" aria-label="' + te("文件夹名称") + '" placeholder="' + te("文件夹名称") + '" autocomplete="off" spellcheck="false"><button type="button" data-directory-create-cancel>' + te("取消") + '</button><button type="button" data-directory-create-confirm>' + te("创建") + '</button></div><div class="better-codex-directory-list" aria-label="' + te("浏览本机文件夹") + '"></div><span data-directory-status aria-live="polite"></span></section>' : "";
      dialog.innerHTML = '<form><h2>' + te("创建 Codex 项目") + '</h2><p>' + te("创建后会加入 Codex 的项目列表。") + '</p><label><span>' + te("项目名称") + '</span><input name="name" maxlength="120" autocomplete="off" required></label><label><span>' + te("项目文件夹") + '</span><span class="better-codex-project-folder-field"><input name="workspace_path" maxlength="4096" placeholder="' + te("选择本地项目文件夹") + '" autocomplete="off" spellcheck="false" readonly required><button type="button" data-project-choose-folder>' + te("选择文件夹") + '</button></span></label>' + directoryBrowser + '<output hidden></output><div class="better-codex-project-dialog-actions"><button type="button" data-project-create-cancel>' + te("取消") + '</button><button type="submit" disabled>' + te("创建项目") + '</button></div></form>';
      let directoryRequest = 0;
      let currentDirectory = null;
      let showHiddenDirectories = false;
      const workspaceInput = dialog.querySelector('[name="workspace_path"]');
      const nameInput = dialog.querySelector('[name="name"]');
      const submit = dialog.querySelector('button[type="submit"]');
      const output = dialog.querySelector("output");
      const chooseButton = dialog.querySelector("[data-project-choose-folder]");
      const directoryPanel = dialog.querySelector(".better-codex-directory-browser");
      const directoryPath = dialog.querySelector("[data-directory-path]");
      const directoryList = dialog.querySelector(".better-codex-directory-list");
      const directoryStatus = dialog.querySelector("[data-directory-status]");
      const directoryUp = dialog.querySelector("[data-directory-up]");
      const directoryHome = dialog.querySelector("[data-directory-home]");
      const directoryRoot = dialog.querySelector("[data-directory-root]");
      const directoryHidden = dialog.querySelector("[data-directory-hidden]");
      const directoryCreate = dialog.querySelector("[data-directory-create]");
      const directoryCreateForm = dialog.querySelector(".better-codex-directory-create");
      const directoryCreateName = dialog.querySelector("[data-directory-create-name]");
      const directoryCreateCancel = dialog.querySelector("[data-directory-create-cancel]");
      const directoryCreateConfirm = dialog.querySelector("[data-directory-create-confirm]");
      const finish = () => { directoryRequest += 1; dialog.close(); dialog.remove(); };
      dialog.querySelector("[data-project-create-cancel]").addEventListener("click", finish);
      const applyWorkspacePath = workspacePath => {
        workspaceInput.value = workspacePath;
        workspaceInput.title = workspacePath;
        submit.disabled = false;
        chooseButton.textContent = t("更改文件夹");
        if (!nameInput.value.trim()) nameInput.value = workspacePath.replace(/[\\/]+$/, "").split(/[\\/]/).pop() || "";
        if (directoryPanel) directoryPanel.hidden = true;
        nameInput.focus();
        nameInput.select();
      };
      const directoryErrorLabel = error => {
        const value = error instanceof Error ? error.message : "";
        return value === "incompatible_protocol" ? t("本机 Runtime 版本不支持远程文件夹浏览") : t("无法读取文件夹");
      };
      const renderDirectoryEntries = () => {
        if (!currentDirectory) return;
        const visibleDirectories = showHiddenDirectories ? currentDirectory.directories : currentDirectory.directories.filter(entry => !entry.name.startsWith("."));
        directoryList.innerHTML = visibleDirectories.length
          ? visibleDirectories.map(entry => '<button class="better-codex-directory-row" type="button" data-directory-entry="' + escapeHtml(entry.path) + '" title="' + escapeHtml(entry.path) + '" aria-label="' + te("打开文件夹") + ': ' + escapeHtml(entry.name) + '">' + icon("folder") + '<span>' + escapeHtml(entry.name) + '</span>' + icon("chevron") + '</button>').join("")
          : '<span class="better-codex-directory-state">' + (currentDirectory.directories.length ? te("隐藏目录已屏蔽") : te("这个文件夹中没有子文件夹")) + '</span>';
      };
      const renderDirectory = directory => {
        currentDirectory = directory;
        directoryPath.value = directory.path;
        directoryUp.disabled = !directory.parent_path;
        directoryUp.dataset.path = directory.parent_path || "";
        directoryHome.disabled = directory.home_path === directory.path;
        directoryHome.dataset.path = directory.home_path;
        directoryRoot.disabled = directory.root_path === directory.path;
        directoryRoot.dataset.path = directory.root_path;
        directoryHidden.disabled = false;
        directoryCreate.disabled = false;
        directoryStatus.textContent = directory.truncated ? t("仅显示前 500 个文件夹") : "";
        renderDirectoryEntries();
      };
      const loadRemoteDirectory = async path => {
        const request = ++directoryRequest;
        directoryPanel.hidden = false;
        directoryPanel.setAttribute("aria-busy", "true");
        directoryHidden.disabled = true;
        directoryCreate.disabled = true;
        directoryCreateForm.hidden = true;
        directoryCreateName.value = "";
        directoryStatus.textContent = "";
        directoryList.innerHTML = '<span class="better-codex-directory-state">' + te("正在读取文件夹…") + '</span>';
        try {
          const result = await api("/api/system/directories", { method: "POST", body: JSON.stringify({ path: String(path || "") }), timeoutMs: 30000 });
          const command = result.command_id ? await waitForRemoteCommand(result.command_id, 30000) : null;
          if (command && command.status !== "applied") throw new Error(command.error || "command_rejected");
          const directory = command?.payload || result;
          if (!directory || typeof directory.path !== "string" || typeof directory.home_path !== "string" || typeof directory.root_path !== "string" || !Array.isArray(directory.directories) || directory.directories.some(entry => !entry || typeof entry.name !== "string" || typeof entry.path !== "string")) throw new Error("invalid_directory_response");
          if (request !== directoryRequest || !dialog.isConnected) return;
          renderDirectory(directory);
        } catch (error) {
          if (request !== directoryRequest || !dialog.isConnected) return;
          reportUnexpectedError(error, { source: "directory_browser" });
          currentDirectory = null;
          directoryHidden.disabled = true;
          directoryList.innerHTML = '<span class="better-codex-directory-state">' + escapeHtml(directoryErrorLabel(error)) + '</span>';
          directoryStatus.textContent = directoryErrorLabel(error);
        } finally {
          if (request === directoryRequest && dialog.isConnected) directoryPanel.removeAttribute("aria-busy");
        }
      };
      const chooseFolder = async () => {
        if (REMOTE) return void loadRemoteDirectory(workspaceInput.value || currentDirectory?.path || "");
        chooseButton.disabled = true;
        chooseButton.textContent = t("正在选择…");
        output.hidden = true;
        try {
          const result = await api("/api/system/directory", { method: "POST", timeoutMs: 300000 });
          const command = result.command_id ? await waitForRemoteCommand(result.command_id, 300000) : null;
          if (command && command.status !== "applied") throw new Error(command.error || "command_rejected");
          const workspacePath = String(command?.payload?.workspace_path || result.workspace_path || "");
          if (!workspacePath) return;
          applyWorkspacePath(workspacePath);
        } catch (error) {
          presentInlineError(output, error, directoryErrorLabel(error), { source: "directory_picker" });
        } finally {
          chooseButton.disabled = false;
          chooseButton.textContent = workspaceInput.value ? t("更改文件夹") : t("选择文件夹");
        }
      };
      dialog.querySelector("[data-project-choose-folder]").addEventListener("click", () => { void chooseFolder(); });
      if (REMOTE) {
        const directoryCreationErrorLabel = error => {
          const value = error instanceof Error ? error.message : "";
          if (value === "directory_already_exists") return t("文件夹已存在");
          if (value === "invalid_directory_name") return t("文件夹名称无效");
          if (value === "incompatible_protocol") return t("本机 Runtime 版本不支持远程文件夹浏览");
          return t("无法创建文件夹");
        };
        const createNewDirectory = async () => {
          const parentPath = currentDirectory?.path || "";
          const name = directoryCreateName.value.trim();
          if (!name) {
            directoryStatus.textContent = t("请输入文件夹名称");
            directoryCreateName.focus();
            return;
          }
          directoryCreateName.disabled = true;
          directoryCreateCancel.disabled = true;
          directoryCreateConfirm.disabled = true;
          directoryCreateConfirm.textContent = t("正在创建…");
          directoryStatus.textContent = "";
          try {
            const result = await api("/api/system/directories/create", { method: "POST", body: JSON.stringify({ parent_path: parentPath, name }), timeoutMs: 30000 });
            const command = result.command_id ? await waitForRemoteCommand(result.command_id, 30000) : null;
            if (command && command.status !== "applied") throw new Error(command.error || "command_rejected");
            const workspacePath = String(command?.payload?.workspace_path || result.workspace_path || "");
            if (!workspacePath) throw new Error("invalid_directory_response");
            applyWorkspacePath(workspacePath);
          } catch (error) {
            reportUnexpectedError(error, { source: "directory_create", parent_path: parentPath, directory_name: name });
            directoryStatus.textContent = directoryCreationErrorLabel(error);
          } finally {
            directoryCreateName.disabled = false;
            directoryCreateCancel.disabled = false;
            directoryCreateConfirm.disabled = false;
            directoryCreateConfirm.textContent = t("创建");
          }
        };
        directoryList.addEventListener("click", event => {
          const row = event.target.closest("[data-directory-entry]");
          if (row) void loadRemoteDirectory(row.dataset.directoryEntry);
        });
        directoryUp.addEventListener("click", () => { if (directoryUp.dataset.path) void loadRemoteDirectory(directoryUp.dataset.path); });
        directoryHome.addEventListener("click", () => { if (directoryHome.dataset.path) void loadRemoteDirectory(directoryHome.dataset.path); });
        directoryRoot.addEventListener("click", () => { if (directoryRoot.dataset.path) void loadRemoteDirectory(directoryRoot.dataset.path); });
        directoryHidden.addEventListener("click", () => {
          showHiddenDirectories = !showHiddenDirectories;
          const label = showHiddenDirectories ? t("不显示隐藏目录") : t("显示隐藏目录");
          directoryHidden.setAttribute("aria-pressed", String(showHiddenDirectories));
          directoryHidden.setAttribute("aria-label", label);
          directoryHidden.title = label;
          directoryHidden.innerHTML = icon(showHiddenDirectories ? "eye" : "eyeOff") + '<span>' + escapeHtml(label) + '</span>';
          renderDirectoryEntries();
        });
        directoryPath.addEventListener("keydown", event => {
          if (event.key !== "Enter") return;
          event.preventDefault();
          void loadRemoteDirectory(directoryPath.value);
        });
        directoryCreate.addEventListener("click", () => {
          directoryCreateForm.hidden = false;
          directoryStatus.textContent = "";
          directoryCreateName.focus();
        });
        directoryCreateCancel.addEventListener("click", () => {
          directoryCreateForm.hidden = true;
          directoryCreateName.value = "";
          directoryStatus.textContent = "";
          directoryCreate.focus();
        });
        directoryCreateConfirm.addEventListener("click", () => { void createNewDirectory(); });
        directoryCreateName.addEventListener("keydown", event => {
          if (event.key === "Escape") return void directoryCreateCancel.click();
          if (event.key !== "Enter") return;
          event.preventDefault();
          void createNewDirectory();
        });
      }
      dialog.querySelector("form").addEventListener("submit", event => {
        event.preventDefault();
        const submit = dialog.querySelector('button[type="submit"]');
        const output = dialog.querySelector("output");
        const data = new FormData(event.currentTarget);
        submit.disabled = true;
        output.hidden = true;
        const name = String(data.get("name") || "");
        const workspacePath = String(data.get("workspace_path") || "");
        void api("/api/projects", { method: "POST", body: JSON.stringify({ name, workspace_path: workspacePath }) }).then(async project => {
          if (project.command_id) {
            const command = await waitForRemoteCommand(project.command_id);
            if (command.status !== "applied") throw new Error(command.error || "command_rejected");
            await loadProjects();
            project = state.projects.find(item => projectRootPaths(item).includes(workspacePath) && projectLabel(item) === name);
            if (!project) throw new Error("project_not_found");
          }
          finish();
          await loadProjects();
          await openProjectDetail(project.id);
        }).catch(error => {
          presentInlineError(output, error, errorLabel(error), { source: "project_create" });
          submit.disabled = false;
        });
      });
      dialog.addEventListener("cancel", event => { event.preventDefault(); finish(); });
      bindModalDismiss(dialog, finish);
      document.body.appendChild(dialog);
      dialog.showModal();
      if (REMOTE) {
        void loadRemoteDirectory("");
        directoryPath.focus();
      } else {
        void chooseFolder();
      }
    }

    function showAutoDispatchHelp(initialView = "mode") {
      controllers().settings.open(initialView);
    }

    function renderSettingsOverlay(initialView = "mode") {
      document.getElementById("better-codex-auto-dispatch-help-dialog")?.remove();
      const dialog = document.createElement("dialog");
      dialog.id = "better-codex-auto-dispatch-help-dialog";
      dialog.setAttribute(OWNED, "true");
      const completionEnabled = !completionNoticeSuppressed();
      const completionDuration = completionNoticeDuration();
      const mockupTools = "";
      const modeDescription = markdown => '<div class="better-codex-help-mode-markdown">' + markdown
        .replace("{{start}}", '<span class="better-codex-help-inline-control is-start">' + te("立即开始任务") + '</span>')
        .replace("{{send}}", '<span class="better-codex-help-inline-control is-send">' + te("发送") + '</span>')
        .replace("{{agent}}", '<span class="better-codex-help-inline-state is-agent">' + icon("bot") + '<span>' + te("智能体") + '</span></span>')
        .replace("{{backlog}}", '<span class="better-codex-help-inline-state is-backlog">' + icon("statusBacklog") + '<span>' + te("待规划") + '</span></span>') + '</div>';
      const helpMode = HELP_MODE_MARKDOWN[state.locale] || HELP_MODE_MARKDOWN.en;
      const defaultSchedulerModel = state.agentModelCatalog.find(model => model.isDefault)?.id || state.agentModelCatalog[0]?.id || "gpt-5.6-sol";
      const schedulerModel = state.agentModelCatalog.some(model => model.id === state.schedulerModel) ? state.schedulerModel : defaultSchedulerModel;
      const schedulerModelLabel = modelLabel(schedulerModel);
      const schedulerModelOptions = state.agentModelCatalog.map(model => '<button type="button" role="option" data-setting-scheduler-model-option="' + escapeHtml(model.id) + '" aria-selected="' + String(model.id === schedulerModel) + '" class="' + (model.id === schedulerModel ? "is-selected" : "") + '"><span>' + escapeHtml(model.displayName) + '</span><span class="better-codex-help-model-check">' + (model.id === schedulerModel ? icon("check") : "") + '</span></button>').join("");
      const schedulerReasoningOptions = effortsForModel(schedulerModel);
      const schedulerReasoningEffort = schedulerReasoningOptions.some(item => item.value === state.schedulerReasoningEffort) ? state.schedulerReasoningEffort : state.agentModelCatalog.find(model => model.id === schedulerModel)?.defaultReasoningEffort || schedulerReasoningOptions[0]?.value || "high";
      const schedulerReasoningEffortLabel = effortLabel(schedulerReasoningEffort);
      const schedulerReasoningEffortOptions = schedulerReasoningOptions.map(option => '<button type="button" role="option" data-setting-scheduler-reasoning-option="' + escapeHtml(option.value) + '" aria-selected="' + String(option.value === schedulerReasoningEffort) + '" class="' + (option.value === schedulerReasoningEffort ? "is-selected" : "") + '"><span>' + escapeHtml(option.label) + '</span><span class="better-codex-help-model-check">' + (option.value === schedulerReasoningEffort ? icon("check") : "") + '</span></button>').join("");
      const createIssueShortcut = readCreateIssueShortcut();
      const sendMode = readSendMode();
      const modifiedEnterLabel = shortcutLabel("Mod+Enter");
      const settingsPage = [
        '<section class="better-codex-help-page" data-help-page="settings" hidden>',
        '<div class="better-codex-help-setting-group"><h3>' + te("语言") + '</h3><div class="better-codex-help-setting-row is-language"><span><strong>' + te("界面语言") + '</strong><small>' + te("选择 Better Codex 的界面语言") + '</small></span><div class="better-codex-language-switch" role="radiogroup" aria-label="' + te("界面语言") + '" data-language-value="' + state.languageSetting + '"><button type="button" role="radio" data-language="system" aria-checked="' + String(state.languageSetting === "system") + '">' + te("跟随系统") + '</button><button type="button" role="radio" data-language="zh-CN" aria-checked="' + String(state.languageSetting === "zh-CN") + '">' + te("中文") + '</button><button type="button" role="radio" data-language="en" aria-checked="' + String(state.languageSetting === "en") + '">English</button></div></div></div>',
        '<div class="better-codex-help-setting-group"><h3>' + te("通知") + '</h3><div class="better-codex-help-setting-row is-notification"><span><strong>' + te("会话结束提醒") + '</strong><small>' + te("Issue 会话结束后在当前窗口显示提醒") + '</small></span><span class="better-codex-help-setting-controls"><span class="better-codex-help-duration' + (completionEnabled ? "" : " is-disabled") + '" data-setting-completion-picker><button type="button" class="better-codex-help-duration-toggle" data-setting-completion-duration aria-haspopup="listbox" aria-expanded="false" aria-label="' + te("弹窗持续时间") + '"' + (completionEnabled ? "" : " disabled") + '>' + te(completionDuration === 1000 ? "1 秒" : completionDuration === 10000 ? "10 秒" : completionDuration === 0 ? "永久" : "5 秒") + icon("chevronDown") + '</button><span class="better-codex-help-duration-menu" role="listbox" hidden>' + [[1000, "1 秒"], [5000, "5 秒"], [10000, "10 秒"], [0, "永久"]].map(([value, label]) => '<button type="button" role="option" data-setting-completion-option="' + value + '" aria-selected="' + String(completionDuration === value) + '" class="' + (completionDuration === value ? "is-selected" : "") + '">' + te(label) + (completionDuration === value ? icon("check") : "") + '</button>').join("") + '</span></span><input type="checkbox" data-setting-completion aria-label="' + te("会话结束提醒") + '"' + (completionEnabled ? " checked" : "") + '></span></div></div>',
        '<div class="better-codex-help-setting-group"><h3>' + te("调度") + '</h3><div class="better-codex-help-setting-row is-model"><span><strong>' + te("调度器模型") + '</strong><small>' + te("这个模型用于 Issue 状态调度") + '</small></span><span class="better-codex-help-setting-controls better-codex-help-scheduler-controls"><span class="better-codex-help-model" data-setting-scheduler-model-picker><button type="button" class="better-codex-help-model-toggle" data-setting-scheduler-model aria-haspopup="listbox" aria-expanded="false" aria-label="' + te("调度器模型") + '"><span data-setting-scheduler-model-label>' + escapeHtml(schedulerModelLabel) + '</span>' + icon("chevronDown") + '</button><span class="better-codex-help-model-menu" role="listbox" hidden><span class="better-codex-help-model-title">' + te("模型") + '</span>' + schedulerModelOptions + '</span></span><span class="better-codex-help-model" data-setting-scheduler-reasoning-picker><button type="button" class="better-codex-help-model-toggle" data-setting-scheduler-reasoning aria-haspopup="listbox" aria-expanded="false" aria-label="' + te("调度器思考强度") + '"><span data-setting-scheduler-reasoning-label>' + escapeHtml(schedulerReasoningEffortLabel) + '</span>' + icon("chevronDown") + '</button><span class="better-codex-help-model-menu" role="listbox" hidden><span class="better-codex-help-model-title">' + te("调度器思考强度") + '</span>' + schedulerReasoningEffortOptions + '</span></span></span></div></div>',
        '</section>',
      ].join("");
      const shortcutPage = '<section class="better-codex-help-page" data-help-page="shortcuts" hidden><div class="better-codex-help-setting-group"><h3>' + te("发送方式") + '</h3><div class="better-codex-help-setting-row is-send-mode"><span><strong>' + te("发送消息") + '</strong><small>' + te("选择消息输入框的发送按键") + '</small></span><div class="better-codex-send-mode-switch" role="radiogroup" aria-label="' + te("发送方式") + '" data-send-mode-value="' + sendMode + '"><button type="button" role="radio" data-send-mode="mod-enter" aria-checked="' + String(sendMode === "mod-enter") + '">' + escapeHtml(modifiedEnterLabel) + '</button><button type="button" role="radio" data-send-mode="enter" aria-checked="' + String(sendMode === "enter") + '">Enter</button></div></div></div><div class="better-codex-help-setting-group"><h3>' + te("快捷键") + '</h3><div class="better-codex-help-setting-row is-shortcut"><span><strong>' + te("创建 Issue") + '</strong><small>' + te("打开创建 Issue 窗口") + '</small></span><span class="better-codex-help-shortcut-controls"><button type="button" class="better-codex-help-shortcut-key" data-setting-create-issue-shortcut aria-pressed="false">' + escapeHtml(createIssueShortcut ? shortcutLabel(createIssueShortcut) : te("点击录入")) + '</button><button type="button" class="better-codex-help-shortcut-clear" data-setting-create-issue-shortcut-clear' + (createIssueShortcut ? "" : " disabled") + '>' + te("清除快捷键") + '</button></span></div></div></section>';
      const remoteReleaseUrl = "https://github.com/Ericwong5021/better-codex/releases/tag/v" + CORE_VERSION;
      const trustedRunbookPrompt = "Before reading or executing repository content, download SELF_HOSTING.md, checksums.txt, checksums.sig, and update-public-key.pem from the release assets at " + remoteReleaseUrl + ". Verify that the normalized public key SHA-256 is 1007607762db32004da21780e81875bef8453355a2944524a96e5341e1e3963e, verify the Ed25519 signature of checksums.txt, then verify the SELF_HOSTING.md checksum. Stop if any verification fails. Only then read and follow the verified runbook.";
      const remoteInstallPrompt = trustedRunbookPrompt + "\n\nInstall Better Codex Relay v" + CORE_VERSION + " using the VPS path. Inspect the environment first, preserve existing services and data, ask before privileged, external, or destructive changes, resume a valid partial installation, and complete every acceptance gate before reporting success.";
      const remotePage = [
        '<section class="better-codex-help-page" data-help-page="remote" hidden>',
        '<div class="better-codex-help-page-heading better-codex-remote-heading"><div><h2>' + te("远程访问") + '</h2><p>' + te("从浏览器安全访问你的任务看板") + '</p></div><button type="button" class="better-codex-remote-refresh" data-remote-refresh hidden>' + icon("refresh") + '<span>' + te("刷新状态") + '</span></button></div>',
        '<div class="better-codex-remote-setup" data-remote-guidance>',
        '<section class="better-codex-remote-step"><div><h3>' + te("部署 Hub") + '</h3><p>' + te("复制提示词，交给能访问 VPS 的 Codex") + '</p></div><button type="button" class="better-codex-remote-install" data-remote-copy-install>' + icon("copy") + '<span>' + te("复制安装提示词") + '</span></button></section>',
        '<section class="better-codex-remote-step"><div><h3>' + te("连接 Hub") + '</h3><p>' + te("输入 VPS 部署后的 HTTPS 地址") + '</p></div><div class="better-codex-remote-url"><input type="url" data-remote-url inputmode="url" autocomplete="url" placeholder="https://codex.example.com" aria-label="' + te("访问地址") + '"><button type="button" data-remote-copy-connect disabled>' + icon("copy") + '<span>' + te("复制连接指令") + '</span></button></div></section>',
        '</div>',
        '<section class="better-codex-remote-status" data-remote-status="loading" hidden><div class="better-codex-remote-status-head"><span class="better-codex-remote-status-icon">' + icon("server") + '</span><div><strong data-remote-status-title>' + te("检测中") + '</strong><small data-remote-status-subtitle>' + te("正在检查") + '</small></div><span class="better-codex-remote-status-badge" data-remote-status-badge>' + te("检测中") + '</span></div><dl data-remote-status-details hidden><div><dt class="better-codex-remote-version-label"><span>' + te("服务版本") + '</span><button type="button" class="better-codex-remote-upgrade" data-remote-upgrade aria-label="' + te("检查升级") + '" hidden>' + icon("refresh") + '<span data-remote-upgrade-label>' + te("升级") + '</span></button></dt><dd data-remote-version>--</dd></div><div><dt>' + te("同步协议") + '</dt><dd data-remote-protocol>--</dd></div><div><dt>' + te("最后同步") + '</dt><dd data-remote-sync>--</dd></div><div class="better-codex-remote-update" data-remote-update hidden><dt>' + te("升级状态") + '</dt><dd><span data-remote-update-state>--</span><span data-remote-update-progress>0%</span></dd><div class="better-codex-remote-update-track"><i data-remote-update-bar></i></div></div></dl><div class="better-codex-remote-actions" data-remote-actions hidden><a data-remote-open target="_blank" rel="noreferrer">' + icon("external") + '<span>' + te("访问网站") + '</span></a></div></section>',
        '<section class="better-codex-remote-sessions" data-remote-sessions hidden><button type="button" class="better-codex-remote-sessions-toggle" data-remote-sessions-toggle aria-expanded="false"><span class="better-codex-remote-sessions-icon">' + icon("userCheck") + '</span><span class="better-codex-remote-sessions-heading"><strong>' + te("登录设备") + '</strong><small>' + te("管理已登录 Better Codex Relay 的浏览器") + '</small></span><span class="better-codex-remote-sessions-count" data-remote-sessions-count hidden></span><span class="better-codex-remote-sessions-chevron">' + icon("chevronDown") + '</span></button><div class="better-codex-remote-sessions-panel" data-remote-sessions-panel hidden><div class="better-codex-remote-sessions-list" data-remote-sessions-list><p>' + te("正在读取登录设备…") + '</p></div></div></section>',
        '<p class="better-codex-help-error" data-remote-error hidden></p>',
        '</section>',
      ].join("");
      dialog.innerHTML = [
        '<div class="better-codex-auto-dispatch-help-shell" data-help-view="mode">',
        '<header><div class="better-codex-help-tabs" role="tablist" aria-label="' + te("帮助与设置") + '"><button type="button" class="is-active" data-help-view="mode" aria-selected="true">' + te("运行模式说明") + '</button><button type="button" data-help-view="settings" aria-selected="false">' + te("设置") + '</button><button type="button" data-help-view="shortcuts" aria-selected="false">' + te("快捷键") + '</button><button type="button" data-help-view="remote" aria-selected="false">' + te("远程访问") + '</button><button type="button" data-help-view="about" aria-selected="false">' + te("关于") + '</button></div>' + mockupTools + '<button type="button" data-help-close aria-label="' + te("关闭") + '">' + icon("close") + "</button></header>",
        '<main class="better-codex-help-content">',
        '<section class="better-codex-help-page is-active" data-help-page="mode"><div class="better-codex-auto-dispatch-help-panels"><article class="better-codex-auto-dispatch-help-panel is-manual"><div class="better-codex-auto-dispatch-help-heading">' + icon("user") + "<h3>" + te("手动运行") + "</h3></div>" + modeDescription(helpMode.manual) + "</article>",
        '<div class="better-codex-auto-dispatch-help-divider" aria-hidden="true"></div>',
        '<article class="better-codex-auto-dispatch-help-panel is-auto"><div class="better-codex-auto-dispatch-help-heading">' + icon("refresh") + "<h3>" + te("自动运行") + "</h3></div>" + modeDescription(helpMode.auto) + "</article></div></section>",
        settingsPage,
        shortcutPage,
        remotePage,
        '<section class="better-codex-help-page" data-help-page="about" hidden><div class="better-codex-help-about"><span class="better-codex-help-about-logo">' + betterCodexLogo() + '</span><div><h2>Better Codex</h2><p class="better-codex-help-about-slogan">' + te("从开始到完成，让 Codex 里的工作清晰可见。") + '</p></div><span class="better-codex-help-runtime-status"><span class="better-codex-help-status-dot"></span>' + te("运行正常") + '</span></div><dl class="better-codex-help-about-details"><div><dt>' + te("版本信息") + '</dt><dd><button class="better-codex-help-check-update" type="button" data-check-update>' + te("检查新版本") + '</button><span data-product-core></span></dd></div></dl><div class="better-codex-help-github-row"><a class="better-codex-help-github" href="https://github.com/Ericwong5021/better-codex" target="_blank" rel="noreferrer">' + githubLogo() + '<span class="better-codex-help-github-name">Better Codex</span><span class="better-codex-help-github-stars">' + icon("star", "better-codex-help-star") + '</span></a><p>' + te("如果你喜欢 Better Codex，欢迎给我们一个 Star。") + '</p></div></section>',
        "</main>",
        "</div>",
      ].join("");
      let remoteStatusTimer = null;
      const finish = () => {
        if (remoteStatusTimer !== null) clearInterval(remoteStatusTimer);
        document.removeEventListener("pointerdown", closeMockupOutside, true);
        dialog.close();
        dialog.remove();
      };
      const mockupMenu = dialog.querySelector(".better-codex-help-mockup-menu");
      const mockupToggle = dialog.querySelector("[data-mockup-menu-toggle]");
      const closeMockupMenu = () => {
        if (!mockupMenu || !mockupToggle) return;
        mockupMenu.hidden = true;
        mockupToggle.setAttribute("aria-expanded", "false");
      };
      const closeMockupOutside = event => {
        if (dialog.querySelector(".better-codex-help-mockup")?.contains(event.target)) return;
        closeMockupMenu();
      };
      mockupToggle?.addEventListener("click", event => {
        event.stopPropagation();
        const opening = mockupMenu.hidden;
        closeMockupMenu();
        if (opening) {
          mockupMenu.hidden = false;
          mockupToggle.setAttribute("aria-expanded", "true");
        }
      });
      document.addEventListener("pointerdown", closeMockupOutside, true);
      dialog.querySelector("[data-mockup-export]")?.addEventListener("click", () => {
        closeMockupMenu();
        void perform(exportMockupIssues);
      });
      const mockupImportInput = dialog.querySelector("[data-mockup-import-input]");
      dialog.querySelector("[data-mockup-import]")?.addEventListener("click", () => mockupImportInput.click());
      mockupImportInput?.addEventListener("change", () => {
        const file = mockupImportInput.files?.[0];
        mockupImportInput.value = "";
        closeMockupMenu();
        if (file) void perform(() => importMockupIssues(file));
      });
      dialog.querySelector("[data-mockup-reset]")?.addEventListener("click", () => {
        closeMockupMenu();
        void perform(confirmMockupReset);
      });
      dialog.querySelectorAll("[data-help-close]").forEach(button => button.addEventListener("click", finish));
      let loadRemoteStatus = () => Promise.resolve();
      const setHelpView = view => {
        dialog.querySelector(".better-codex-auto-dispatch-help-shell").dataset.helpView = view;
        dialog.querySelectorAll("[data-help-view]").forEach(item => {
          const selected = item.dataset.helpView === view;
          item.classList.toggle("is-active", selected);
          item.setAttribute("aria-selected", String(selected));
        });
        dialog.querySelectorAll("[data-help-page]").forEach(page => {
          const selected = page.dataset.helpPage === view;
          page.hidden = !selected;
          page.classList.toggle("is-active", selected);
        });
        if (view === "remote") void loadRemoteStatus();
      };
      dialog.querySelectorAll("[data-help-view]").forEach(button => button.addEventListener("click", () => setHelpView(button.dataset.helpView)));
      const remotePageNode = dialog.querySelector('[data-help-page="remote"]');
      const remoteGuidance = dialog.querySelector("[data-remote-guidance]");
      const remoteUrlInput = dialog.querySelector("[data-remote-url]");
      const remoteConnectButton = dialog.querySelector("[data-remote-copy-connect]");
      const remoteStatus = dialog.querySelector("[data-remote-status]");
      const remoteStatusTitle = dialog.querySelector("[data-remote-status-title]");
      const remoteStatusSubtitle = dialog.querySelector("[data-remote-status-subtitle]");
      const remoteStatusBadge = dialog.querySelector("[data-remote-status-badge]");
      const remoteStatusDetails = dialog.querySelector("[data-remote-status-details]");
      const remoteUpgrade = dialog.querySelector("[data-remote-upgrade]");
      const remoteUpgradeLabel = dialog.querySelector("[data-remote-upgrade-label]");
      const remoteUpdate = dialog.querySelector("[data-remote-update]");
      const remoteUpdateState = dialog.querySelector("[data-remote-update-state]");
      const remoteUpdateProgress = dialog.querySelector("[data-remote-update-progress]");
      const remoteUpdateBar = dialog.querySelector("[data-remote-update-bar]");
      const remoteActions = dialog.querySelector("[data-remote-actions]");
      const remoteOpen = dialog.querySelector("[data-remote-open]");
      const remoteError = dialog.querySelector("[data-remote-error]");
      const remoteRefresh = dialog.querySelector("[data-remote-refresh]");
      const remoteSessions = dialog.querySelector("[data-remote-sessions]");
      const remoteSessionsToggle = dialog.querySelector("[data-remote-sessions-toggle]");
      const remoteSessionsPanel = dialog.querySelector("[data-remote-sessions-panel]");
      const remoteSessionsList = dialog.querySelector("[data-remote-sessions-list]");
      const remoteSessionsCount = dialog.querySelector("[data-remote-sessions-count]");
      let remoteStatusLoaded = false;
      let remoteSessionsLoaded = false;
      let remoteUpdateActive = false;
      let remoteUpdateSignature = "";
      const normalizedRemoteUrl = () => {
        try {
          const url = new URL(remoteUrlInput.value.trim());
          if (url.protocol !== "https:" && !(url.protocol === "http:" && ["127.0.0.1", "localhost", "::1"].includes(url.hostname))) return "";
          if (url.username || url.password) return "";
          if (url.pathname !== "/") return "";
          url.pathname = "";
          url.search = "";
          url.hash = "";
          return url.origin;
        } catch {
          return "";
        }
      };
      const copiedFeedback = async (button, message = "指令已复制") => {
        const label = button.querySelector("span");
        const previous = label?.textContent || "";
        if (label) label.textContent = te(message);
        button.dataset.copied = "true";
        window.setTimeout(() => {
          if (!button.isConnected) return;
          if (label) label.textContent = previous;
          delete button.dataset.copied;
        }, 1600);
      };
      const renderRemoteUpgrade = (update, visible) => {
        if (!remoteUpgrade || !remoteUpgradeLabel) return;
        remoteUpgrade.hidden = !REMOTE || !visible;
        if (remoteUpgrade.hidden) return;
        const installing = update?.status === "installing" || update?.status === "restarting";
        const progress = Number.isFinite(Number(update?.progress)) ? Math.max(0, Math.min(100, Number(update.progress))) : installing ? 10 : update?.status === "current" && update?.stage ? 100 : 0;
        const stageLabels = {
          checking: "正在检查更新",
          queued: "升级请求已提交",
          preparing: "正在准备升级",
          verifying: "正在验证发布版本",
          backing_up: "正在备份服务数据",
          downloading: "正在下载升级版本",
          rebuilding: "正在重新构建服务",
          restarting: "正在重启远程服务",
          health_check: "正在验证服务状态",
          complete: "远程服务升级完成",
          current: "已是最新版本",
          error: "更新未完成",
        };
        const stage = String(update?.stage || (installing ? "preparing" : remoteUpdateActive ? "checking" : update?.status === "available" ? "available" : update?.status === "error" ? "error" : ""));
        const label = stage === "available" ? t("发现可用升级") + (update?.latestVersion ? " v" + String(update.latestVersion).replace(/^v/, "") : "") : t(stageLabels[stage] || "正在准备升级");
        const showProgress = remoteUpdateActive || installing || update?.status === "available" || update?.status === "error" || Boolean(update?.stage);
        remoteUpgrade.disabled = installing || remoteUpdateActive;
        remoteUpgrade.dataset.loading = String(installing || remoteUpdateActive);
        remoteUpgradeLabel.textContent = t(stage === "checking" ? "检查中…" : installing || remoteUpdateActive ? "正在更新" : update?.status === "available" ? "升级" : update?.status === "error" ? "重试" : "检查升级");
        remoteUpgrade.title = update?.status === "available" && update.latestVersion ? t("升级") + " v" + String(update.latestVersion).replace(/^v/, "") : t("检查升级");
        remoteUpdate.hidden = !showProgress;
        if (showProgress) {
          remoteUpdate.dataset.status = String(update?.status || "");
          remoteUpdateState.textContent = label;
          remoteUpdateProgress.textContent = Math.round(progress) + "%";
          remoteUpdateBar.style.width = progress + "%";
        }
        const signature = [update?.status || "", stage, Math.round(progress), update?.currentVersion || "", update?.latestVersion || "", update?.error || ""].join(":");
        if (signature !== remoteUpdateSignature) {
          remoteUpdateSignature = signature;
          appendDiagnostic("remote_update_state", { status: update?.status || "", stage, progress: Math.round(progress), current_version: update?.currentVersion || "", target_version: update?.latestVersion || "", error: update?.error || "" });
        }
      };
      const setRemoteText = (node, value) => {
        if (node.textContent !== value) node.textContent = value;
      };
      const renderRemoteStatus = (value, update = null) => {
        if (!remoteStatus) return;
        const remote = value?.remote;
        const reachable = remote?.reachable === true;
        remoteRefresh.disabled = remoteUpdateActive;
        remoteRefresh.dataset.loading = "false";
        remoteError.hidden = true;
        if (!remote) {
          remotePageNode.dataset.remoteConnected = "false";
          remoteGuidance.hidden = false;
          remoteRefresh.hidden = true;
          remoteStatus.hidden = true;
          remoteStatusDetails.hidden = true;
          remoteUpgrade.hidden = true;
          remoteActions.hidden = true;
          remoteSessions.hidden = true;
          return;
        }
        remotePageNode.dataset.remoteConnected = "true";
        remoteGuidance.hidden = true;
        remoteRefresh.hidden = false;
        remoteStatus.hidden = false;
        remoteUrlInput.value = String(remote.url || "");
        remoteConnectButton.disabled = !normalizedRemoteUrl();
        remoteStatus.dataset.remoteStatus = reachable ? "online" : "offline";
        setRemoteText(remoteStatusTitle, String(remote.name || "Better Codex Relay"));
        setRemoteText(remoteStatusSubtitle, te("部署在 VPS") + " · " + String(remote.url || ""));
        setRemoteText(remoteStatusBadge, te(reachable ? "服务在线" : "无法访问"));
        remoteStatusDetails.hidden = false;
        renderRemoteUpgrade(update, true);
        remoteActions.hidden = false;
        remoteSessions.hidden = REMOTE || value.remote_mode !== "relay";
        setRemoteText(dialog.querySelector("[data-remote-version]"), remote.version ? "v" + String(remote.version).replace(/^v/, "") : "--");
        setRemoteText(dialog.querySelector("[data-remote-protocol]"), String(remote.protocol_version || "--"));
        setRemoteText(dialog.querySelector("[data-remote-sync]"), value.last_sync_at ? new Date(value.last_sync_at).toLocaleString(state.locale === "zh-CN" ? "zh-CN" : "en") : te("尚未同步"));
        remoteOpen.href = String(remote.url || "");
        if (!reachable && remote.error) {
          appendDiagnostic("remote_status_unreachable", { error: String(remote.error), url: String(remote.url || "") });
          remoteError.dataset.tone = "warning";
          remoteError.textContent = te("状态检查失败") + ": " + String(remote.error);
          remoteError.hidden = false;
        }
      };
      const renderRemoteSessions = value => {
        const sessions = Array.isArray(value?.sessions) ? value.sessions : [];
        remoteSessionsList.replaceChildren();
        remoteSessionsCount.textContent = String(sessions.length) + te("台设备");
        remoteSessionsCount.hidden = false;
        if (!sessions.length) {
          const empty = document.createElement("p");
          empty.textContent = t("暂无登录设备");
          remoteSessionsList.append(empty);
          return;
        }
        for (const session of sessions) {
          const item = document.createElement("article");
          const identity = document.createElement("span");
          identity.className = "better-codex-remote-session-icon";
          identity.innerHTML = icon("userCheck");
          const detail = document.createElement("div");
          const name = document.createElement("strong");
          name.textContent = String(session.device_name || t("登录设备"));
          const metadata = document.createElement("small");
          const lastSeen = session.last_seen_at ? new Date(session.last_seen_at).toLocaleString(state.locale === "zh-CN" ? "zh-CN" : "en") : "--";
          metadata.textContent = t("最近活动") + " " + lastSeen + " · " + t(session.remembered ? "已记住" : "临时会话") + (session.client_ip ? " · " + String(session.client_ip) : "");
          detail.append(name, metadata);
          const revoke = document.createElement("button");
          revoke.type = "button";
          revoke.dataset.remoteSessionRevoke = String(session.id || "");
          revoke.innerHTML = icon("userX") + "<span>" + te("退出登录") + "</span>";
          item.append(identity, detail, revoke);
          remoteSessionsList.append(item);
        }
      };
      const loadRemoteSessions = async (force = false) => {
        if (!remoteSessionsList || (remoteSessionsLoaded && !force)) return;
        remoteSessionsLoaded = true;
        remoteSessionsList.innerHTML = "<p>" + te("正在读取登录设备…") + "</p>";
        try {
          renderRemoteSessions(await api("/api/remote-access/sessions"));
        } catch (error) {
          remoteSessionsLoaded = false;
          remoteSessionsList.innerHTML = "<p>" + te("设备读取失败") + ": " + escapeHtml(error instanceof Error ? error.message : String(error)) + "</p>";
        }
      };
      loadRemoteStatus = async (force = false, foreground = false) => {
        if (!remoteStatus || (remoteStatusLoaded && !force)) return;
        const showLoading = foreground || !remoteStatusLoaded;
        remoteStatusLoaded = true;
        if (showLoading) {
          remoteRefresh.disabled = true;
          remoteRefresh.dataset.loading = "true";
          remoteStatus.dataset.remoteStatus = "loading";
          remoteStatusBadge.textContent = te("检测中");
        }
        try {
          const [status, update] = await Promise.all([
            api("/api/remote-access/status"),
            REMOTE ? api("/api/update", { passive: true }).catch(() => null) : Promise.resolve(null),
          ]);
          renderRemoteStatus(status, update);
          if (remoteSessionsToggle?.getAttribute("aria-expanded") === "true") await loadRemoteSessions(force);
        } catch (error) {
          remoteRefresh.hidden = false;
          remoteStatus.hidden = false;
          remoteRefresh.disabled = false;
          remoteRefresh.dataset.loading = "false";
          remoteStatus.dataset.remoteStatus = "offline";
          remoteStatusTitle.textContent = te("状态检查失败");
          remoteStatusSubtitle.textContent = error instanceof Error ? error.message : String(error);
          remoteStatusBadge.textContent = te("无法访问");
          remoteError.dataset.tone = "warning";
          remoteError.textContent = te("状态检查失败");
          remoteError.hidden = false;
        }
      };
      remoteStatusTimer = setInterval(() => {
        if (!remoteUpdateActive && !document.hidden && dialog.open && dialog.querySelector(".better-codex-auto-dispatch-help-shell")?.dataset.helpView === "remote") void loadRemoteStatus(true);
      }, 5000);
      dialog.querySelector("[data-remote-copy-install]")?.addEventListener("click", async event => {
        const button = event.currentTarget;
        await copyText(remoteInstallPrompt);
        await copiedFeedback(button, "提示词已复制");
      });
      remoteUrlInput?.addEventListener("input", () => { remoteConnectButton.disabled = !normalizedRemoteUrl(); });
      remoteConnectButton?.addEventListener("click", async event => {
        const button = event.currentTarget;
        const url = normalizedRemoteUrl();
        if (!url) return;
        await copyText('better-codex relay connect --url "' + url + '"');
        await copiedFeedback(button);
      });
      const waitForRemoteUpdateCompletion = async (targetVersion, updateId = "") => {
        const deadline = Date.now() + 30 * 60 * 1000;
        while (!destroyed && dialog.isConnected && Date.now() < deadline) {
          await new Promise(resolve => setTimeout(resolve, 700));
          let update;
          try {
            update = await api("/api/update" + (updateId ? "?update_id=" + encodeURIComponent(updateId) : ""), { passive: true });
          } catch (error) {
            if (transientNetworkError(error)) {
              renderRemoteUpgrade({ status: "installing", stage: "restarting", progress: 82, latestVersion: targetVersion }, true);
              continue;
            }
            throw error;
          }
          renderRemoteUpgrade(update, true);
          if (update?.operation?.status === "FAILED" || update?.operation?.status === "ROLLED_BACK" || update?.status === "error") throw new Error(String(update?.operation?.error_code || update.error || "update_install_failed"));
          if (update?.operation?.status === "COMPLETED" || update?.status === "current" && String(update.currentVersion || "").replace(/^v/, "") === targetVersion) {
            renderRemoteUpgrade({ ...update, stage: "complete", progress: 100 }, true);
            dialog.querySelector("[data-remote-version]").textContent = "v" + targetVersion;
            remoteStatusBadge.textContent = t("服务在线");
            window.setTimeout(() => {
              if (typeof window.betterCodexHost?.reloadAfterUpdate === "function") window.betterCodexHost.reloadAfterUpdate();
              else location.reload();
            }, 1200);
            return;
          }
        }
        throw new Error("runtime_bridge_timeout");
      };
      remoteUpgrade?.addEventListener("click", async () => {
        remoteUpdateActive = true;
        remoteRefresh.disabled = true;
        remoteError.hidden = true;
        renderRemoteUpgrade({ status: "current", stage: "checking", progress: 2 }, true);
        try {
          const update = await api("/api/update/check", { method: "POST" });
          if (update?.status === "error") throw new Error(String(update.error || "update_check_failed"));
          if (update?.status === "current") {
            remoteUpdateActive = false;
            remoteRefresh.disabled = false;
            renderRemoteUpgrade({ ...update, stage: "current", progress: 100 }, true);
            remoteUpgradeLabel.textContent = t("最新");
            return;
          }
          if (update?.status === "installing" && update.latestVersion) {
            const targetVersion = String(update.latestVersion).replace(/^v/, "");
            renderRemoteUpgrade(update, true);
            await waitForRemoteUpdateCompletion(targetVersion);
            return;
          }
          if (update?.status !== "available" || !update.latestVersion) throw new Error("update_not_available");
          if (update.installSupported === false) throw new Error("hub_update_not_configured");
          const targetVersion = String(update.latestVersion).replace(/^v/, "");
          renderRemoteUpgrade({ ...update, stage: "queued", progress: 5 }, true);
          const requestKey = localStorage.getItem("better-codex-update-request-key") || crypto.randomUUID();
          localStorage.setItem("better-codex-update-request-key", requestKey);
          const result = await api("/api/update/install", { method: "POST", body: JSON.stringify({ idempotency_key: requestKey }) });
          if (result?.accepted !== true || typeof result?.update_id !== "string") throw new Error("update_not_accepted");
          renderRemoteUpgrade({ status: "installing", stage: String(result.state || "STAGING").toLowerCase(), progress: 5, latestVersion: targetVersion }, true);
          await waitForRemoteUpdateCompletion(targetVersion, result.update_id);
        } catch (error) {
          remoteUpdateActive = false;
          remoteRefresh.disabled = false;
          const presentation = reportUnexpectedError(error, { source: "remote_update_install" });
          renderRemoteUpgrade({ status: "error", stage: "error", error: error instanceof Error ? error.message : String(error) }, true);
          remoteError.dataset.tone = presentation.tone;
          remoteError.textContent = updateErrorLabel(error);
          remoteError.hidden = false;
        }
      });
      remoteRefresh?.addEventListener("click", () => void loadRemoteStatus(true, true));
      remoteSessionsToggle?.addEventListener("click", () => {
        const expanded = remoteSessionsToggle.getAttribute("aria-expanded") !== "true";
        remoteSessionsToggle.setAttribute("aria-expanded", String(expanded));
        remoteSessionsPanel.hidden = !expanded;
        if (expanded) void loadRemoteSessions();
      });
      remoteSessionsList?.addEventListener("click", event => {
        const button = event.target.closest("[data-remote-session-revoke]");
        if (!button) return;
        void confirmAction("退出登录", "此设备需要重新输入账户密码才能访问。", "退出登录").then(confirmed => confirmed && perform(async () => {
          button.disabled = true;
          await api("/api/remote-access/sessions/" + encodeURIComponent(button.dataset.remoteSessionRevoke), { method: "DELETE" });
          remoteSessionsLoaded = false;
          await loadRemoteSessions(true);
        }));
      });
      const languageSwitch = dialog.querySelector("[data-language-value]");
      languageSwitch.querySelectorAll("[data-language]").forEach(button => button.addEventListener("click", () => {
        const setting = button.dataset.language;
        if (!["system", "zh-CN", "en"].includes(setting) || setting === state.languageSetting) return;
        localStorage.setItem(LANGUAGE_KEY, setting);
        state.languageSetting = setting;
        state.systemLocale = resolveSystemLocale(state.systemLocale);
        state.locale = setting === "system" ? state.systemLocale : setting;
        if (HOST_KIND === "web") window.dispatchEvent(new CustomEvent("better-codex:bootstrap", { detail: { user: state.user, locale: state.locale } }));
        finish();
        panelSizeCleanup?.();
        panelSizeCleanup = null;
        panel?.remove();
        panel = null;
        ensureEntry();
        mountPanel();
        if (!state.mockup) {
          render();
          showAutoDispatchHelp("settings");
          return;
        }
        state.issues = [];
        state.agents = [];
        void load().then(() => showAutoDispatchHelp("settings")).catch(() => render());
      }));
      const sendModeSwitch = dialog.querySelector("[data-send-mode-value]");
      sendModeSwitch.querySelectorAll("[data-send-mode]").forEach(button => button.addEventListener("click", () => {
        const value = button.dataset.sendMode;
        if (!["mod-enter", "enter"].includes(value)) return;
        localStorage.setItem(SEND_MODE_KEY, value);
        sendModeSwitch.dataset.sendModeValue = value;
        sendModeSwitch.querySelectorAll("[data-send-mode]").forEach(option => option.setAttribute("aria-checked", String(option.dataset.sendMode === value)));
      }));
      const shortcutButton = dialog.querySelector("[data-setting-create-issue-shortcut]");
      const shortcutClear = dialog.querySelector("[data-setting-create-issue-shortcut-clear]");
      let recordingShortcut = false;
      const syncShortcutControls = shortcut => {
        const value = normalizeShortcut(shortcut);
        shortcutButton.textContent = recordingShortcut ? te("按下新的快捷键") : value ? shortcutLabel(value) : te("点击录入");
        shortcutButton.dataset.settingShortcutRecording = String(recordingShortcut);
        shortcutButton.setAttribute("aria-pressed", String(recordingShortcut));
        shortcutClear.disabled = recordingShortcut || !value;
      };
      const setShortcutRecording = recording => {
        recordingShortcut = recording;
        syncShortcutControls(readCreateIssueShortcut());
      };
      shortcutButton.addEventListener("click", () => setShortcutRecording(!recordingShortcut));
      shortcutClear.addEventListener("click", () => {
        localStorage.removeItem(CREATE_ISSUE_SHORTCUT_KEY);
        setShortcutRecording(false);
      });
      dialog.addEventListener("keydown", event => {
        if (!recordingShortcut) return;
        event.preventDefault();
        event.stopPropagation();
        if (event.key === "Escape") return setShortcutRecording(false);
        const shortcut = shortcutFromKeyboardEvent(event);
        if (!shortcut) return;
        localStorage.setItem(CREATE_ISSUE_SHORTCUT_KEY, shortcut);
        setShortcutRecording(false);
        syncShortcutControls(shortcut);
      });
      const completionToggle = dialog.querySelector("[data-setting-completion]");
      const completionDurationSelect = dialog.querySelector("[data-setting-completion-duration]");
      const completionDurationPicker = dialog.querySelector("[data-setting-completion-picker]");
      const completionDurationMenu = dialog.querySelector(".better-codex-help-duration-menu");
      const closeCompletionDurationMenu = () => {
        completionDurationPicker.classList.remove("is-open");
        completionDurationMenu.hidden = true;
        completionDurationSelect.setAttribute("aria-expanded", "false");
      };
      const schedulerModelPicker = dialog.querySelector("[data-setting-scheduler-model-picker]");
      const schedulerModelSelect = dialog.querySelector("[data-setting-scheduler-model]");
      const schedulerModelMenu = schedulerModelPicker.querySelector(".better-codex-help-model-menu");
      const schedulerModelLabelNode = dialog.querySelector("[data-setting-scheduler-model-label]");
      const schedulerReasoningPicker = dialog.querySelector("[data-setting-scheduler-reasoning-picker]");
      const schedulerReasoningSelect = dialog.querySelector("[data-setting-scheduler-reasoning]");
      const schedulerReasoningMenu = schedulerReasoningPicker.querySelector(".better-codex-help-model-menu");
      const schedulerReasoningLabelNode = dialog.querySelector("[data-setting-scheduler-reasoning-label]");
      const closeSchedulerModelMenu = () => {
        schedulerModelPicker.classList.remove("is-open");
        schedulerModelMenu.hidden = true;
        schedulerModelSelect.setAttribute("aria-expanded", "false");
      };
      const closeSchedulerReasoningMenu = () => {
        schedulerReasoningPicker.classList.remove("is-open");
        schedulerReasoningMenu.hidden = true;
        schedulerReasoningSelect.setAttribute("aria-expanded", "false");
      };
      const syncSchedulerModel = model => {
        state.schedulerModel = model;
        schedulerModelLabelNode.textContent = modelLabel(model);
        schedulerModelMenu.querySelectorAll("[data-setting-scheduler-model-option]").forEach(item => {
          const selected = item.dataset.settingSchedulerModelOption === model;
          item.classList.toggle("is-selected", selected);
          item.setAttribute("aria-selected", String(selected));
          item.querySelector(".better-codex-help-model-check").innerHTML = selected ? icon("check") : "";
        });
      };
      const syncSchedulerReasoning = effort => {
        state.schedulerReasoningEffort = effort;
        schedulerReasoningLabelNode.textContent = effortLabel(effort);
        schedulerReasoningMenu.querySelectorAll("[data-setting-scheduler-reasoning-option]").forEach(item => {
          const selected = item.dataset.settingSchedulerReasoningOption === effort;
          item.classList.toggle("is-selected", selected);
          item.setAttribute("aria-selected", String(selected));
          item.querySelector(".better-codex-help-model-check").innerHTML = selected ? icon("check") : "";
        });
      };
      const renderSchedulerReasoningOptions = (model, preferred) => {
        const options = effortsForModel(model);
        const entry = state.agentModelCatalog.find(item => item.id === model);
        const effort = options.some(item => item.value === preferred) ? preferred : entry?.defaultReasoningEffort || options[0]?.value || "high";
        schedulerReasoningMenu.innerHTML = '<span class="better-codex-help-model-title">' + te("调度器思考强度") + '</span>' + options.map(option => '<button type="button" role="option" data-setting-scheduler-reasoning-option="' + escapeHtml(option.value) + '" aria-selected="' + String(option.value === effort) + '" class="' + (option.value === effort ? "is-selected" : "") + '"><span>' + escapeHtml(option.label) + '</span><span class="better-codex-help-model-check">' + (option.value === effort ? icon("check") : "") + '</span></button>').join("");
        syncSchedulerReasoning(effort);
        return effort;
      };
      completionToggle.addEventListener("change", event => {
        sessionStorage.setItem("better-codex-completion-notice-disabled", String(!event.currentTarget.checked));
        completionDurationSelect.disabled = !event.currentTarget.checked;
        completionDurationPicker.classList.toggle("is-disabled", !event.currentTarget.checked);
        if (!event.currentTarget.checked) closeCompletionDurationMenu();
      });
      completionDurationSelect.addEventListener("click", event => {
        event.stopPropagation();
        if (completionDurationSelect.disabled) return;
        const opening = completionDurationMenu.hidden;
        closeCompletionDurationMenu();
        closeSchedulerModelMenu();
        closeSchedulerReasoningMenu();
        if (opening) {
          completionDurationPicker.classList.add("is-open");
          completionDurationMenu.hidden = false;
          completionDurationSelect.setAttribute("aria-expanded", "true");
        }
      });
      completionDurationMenu.querySelectorAll("[data-setting-completion-option]").forEach(option => option.addEventListener("click", () => {
        const duration = Number(option.dataset.settingCompletionOption);
        if (![0, 1000, 5000, 10000].includes(duration)) return;
        localStorage.setItem(COMPLETION_DURATION_KEY, String(duration));
        completionDurationSelect.firstChild.textContent = te(duration === 1000 ? "1 秒" : duration === 10000 ? "10 秒" : duration === 0 ? "永久" : "5 秒");
        completionDurationMenu.querySelectorAll("[data-setting-completion-option]").forEach(item => {
          const selected = Number(item.dataset.settingCompletionOption) === duration;
          item.classList.toggle("is-selected", selected);
          item.setAttribute("aria-selected", String(selected));
          const check = item.querySelector("svg");
          if (selected && !check) item.insertAdjacentHTML("beforeend", icon("check"));
          if (!selected && check) check.remove();
        });
        closeCompletionDurationMenu();
      }));
      schedulerModelSelect.addEventListener("click", event => {
        event.stopPropagation();
        const opening = schedulerModelMenu.hidden;
        closeSchedulerModelMenu();
        closeCompletionDurationMenu();
        closeSchedulerReasoningMenu();
        if (opening) {
          schedulerModelPicker.classList.add("is-open");
          schedulerModelMenu.hidden = false;
          schedulerModelSelect.setAttribute("aria-expanded", "true");
        }
      });
      schedulerModelMenu.querySelectorAll("[data-setting-scheduler-model-option]").forEach(option => option.addEventListener("click", async () => {
        const model = option.dataset.settingSchedulerModelOption;
        if (!state.agentModelCatalog.some(item => item.id === model)) return;
        const previous = state.schedulerModel;
        const previousEffort = state.schedulerReasoningEffort;
        syncSchedulerModel(model);
        const nextEffort = renderSchedulerReasoningOptions(model, previousEffort);
        closeSchedulerModelMenu();
        try {
          const result = await api("/api/settings/scheduler-model", { method: "PATCH", body: JSON.stringify({ model }) });
          syncSchedulerModel(result.model || model);
          renderSchedulerReasoningOptions(result.model || model, result.reasoning_effort || nextEffort);
        } catch {
          syncSchedulerModel(previous);
          renderSchedulerReasoningOptions(previous, previousEffort);
        }
      }));
      schedulerReasoningSelect.addEventListener("click", event => {
        event.stopPropagation();
        const opening = schedulerReasoningMenu.hidden;
        closeSchedulerReasoningMenu();
        closeSchedulerModelMenu();
        closeCompletionDurationMenu();
        if (opening) {
          schedulerReasoningPicker.classList.add("is-open");
          schedulerReasoningMenu.hidden = false;
          schedulerReasoningSelect.setAttribute("aria-expanded", "true");
        }
      });
      schedulerReasoningMenu.addEventListener("click", async event => {
        const option = event.target.closest("[data-setting-scheduler-reasoning-option]");
        if (!option) return;
        const effort = option.dataset.settingSchedulerReasoningOption;
        if (!effort || !effortsForModel(state.schedulerModel).some(item => item.value === effort)) return;
        const previous = state.schedulerReasoningEffort;
        syncSchedulerReasoning(effort);
        closeSchedulerReasoningMenu();
        try {
          const result = await api("/api/settings/scheduler-reasoning-effort", { method: "PATCH", body: JSON.stringify({ reasoning_effort: effort }) });
          syncSchedulerReasoning(result.reasoning_effort || effort);
        } catch {
          syncSchedulerReasoning(previous);
        }
      });
      document.addEventListener("pointerdown", event => {
        if (!completionDurationPicker.contains(event.target)) closeCompletionDurationMenu();
        if (!schedulerModelPicker.contains(event.target)) closeSchedulerModelMenu();
        if (!schedulerReasoningPicker.contains(event.target)) closeSchedulerReasoningMenu();
      });
      const checkUpdate = dialog.querySelector("[data-check-update]");
      const renderUpdateState = (update, checked = false) => {
        const sourceBuild = update?.coreUpdateSupported === false;
        checkUpdate.textContent = t(update?.status === "available" ? (sourceBuild ? "发现兼容更新" : "发现新版本") : update?.status === "error" ? "无法检查更新" : sourceBuild ? "源码开发版" : checked ? "已是最新版本" : "检查新版本");
        checkUpdate.title = sourceBuild ? t("源码开发版仅检查兼容层更新，核心版本请更新源码并重新构建。") : "";
      };
      checkUpdate.addEventListener("click", async () => {
        checkUpdate.disabled = true;
        checkUpdate.textContent = t("检查中…");
        try {
          const update = await api("/api/update/check", { method: "POST" });
          renderUpdateState(update, true);
          if (update?.status === "available") {
            finish();
            renderUpdateNotice(update, true);
          }
        } catch {
          checkUpdate.textContent = t("无法检查更新");
        } finally {
          checkUpdate.disabled = false;
        }
      });
      dialog.addEventListener("cancel", event => { event.preventDefault(); finish(); });
      bindModalDismiss(dialog, finish);
      document.body.appendChild(dialog);
      dialog.showModal();
      setHelpView(initialView);
      dialog.querySelector("[data-product-core]").textContent = "v" + CORE_VERSION;
      void api("/api/update").then(update => {
        if (!dialog.isConnected) return;
        renderUpdateState(update);
      }).catch(() => {});
    }

    function scheduledTaskDateTime(value) {
      const date = new Date(value);
      if (!Number.isFinite(date.getTime())) return t("未设置");
      return new Intl.DateTimeFormat(state.locale === "zh-CN" ? "zh-CN" : "en", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(date);
    }

    function scheduledTaskLocalValue(value) {
      const date = new Date(value);
      if (!Number.isFinite(date.getTime())) return "";
      return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
    }

    function scheduledTaskIntervalLabel(task) {
      if (!task.repeat) return t("执行一次");
      const unit = state.locale === "zh-CN"
        ? { minute: "分钟", hour: "小时", day: "天", week: "周" }[task.interval_unit]
        : { minute: "minute", hour: "hour", day: "day", week: "week" }[task.interval_unit];
      if (state.locale === "zh-CN") return "每 " + task.interval_value + " " + unit;
      return "Every " + task.interval_value + " " + unit + (Number(task.interval_value) === 1 ? "" : "s");
    }

    function scheduledTaskRunState(run) {
      if (run.status === "failed") return { key: "failed", label: t("执行失败") };
      if (run.status === "pending") return { key: "pending", label: t("等待执行") };
      if (run.active_run_status) return { key: "running", label: t("执行中") };
      if (run.issue_status === "done") return { key: "completed", label: t("已完成") };
      if (run.issue_status === "in_review") return { key: "review", label: t("待审核") };
      if (run.issue_status === "blocked") return { key: "failed", label: t("已阻塞") };
      return { key: "pending", label: t("排队中") };
    }

    function scheduledTaskAgentName(task) {
      const agent = state.agents.find(item => item.id === task.agent_id);
      return agent ? agentDisplayName(agent) : t("默认智能体");
    }

    function scheduledTaskProjectName(task) {
      return projectLabel(state.projects.find(project => project.id === task.project_id)) || t("未知项目");
    }

    function renderScheduledTasks() {
      const container = panel?.querySelector("#better-codex-scheduled");
      if (!container) return;
      const enabled = state.scheduledTasks.filter(task => task.enabled);
      const running = state.scheduledTasks.filter(task => task.recent_runs?.some(run => run.status === "pending" || run.active_run_status)).length;
      const next = enabled.filter(task => task.next_run_at).sort((left, right) => String(left.next_run_at).localeCompare(String(right.next_run_at)))[0];
      const headingMeta = panel.querySelector("[data-scheduled-heading-meta]");
      if (headingMeta) headingMeta.textContent = state.scheduledTasks.length + " " + t("个任务");
      const actions = panel.querySelector(".better-codex-scheduled-actions");
      if (actions) actions.hidden = state.mockup;
      if (!state.scheduledTasksLoaded) {
        container.innerHTML = '<section class="better-codex-scheduled-loading" role="status"><span></span><strong>' + te("正在加载定时任务") + '</strong></section>';
        return;
      }
      if (!state.scheduledTasks.length) {
        container.innerHTML = '<section class="better-codex-scheduled-empty">' + icon("calendar") + '<h1>' + te("还没有定时任务") + '</h1><p>' + te("设置执行时间和循环间隔，Better Codex 会按计划创建任务并交给智能体执行。") + '</p>' + (state.mockup ? "" : '<button class="better-codex-submit" type="button" data-scheduled-create>' + icon("plus") + '<span>' + te("新建定时任务") + '</span></button>') + '</section>';
        return;
      }
      const rows = state.scheduledTasks.map(task => {
        const latest = task.recent_runs?.[0];
        const active = Boolean(latest && (latest.status === "pending" || latest.active_run_status));
        const runRows = (task.recent_runs || []).map(run => {
          const runState = scheduledTaskRunState(run);
          const issue = run.issue_id ? '<button type="button" data-scheduled-issue="' + escapeHtml(run.issue_id) + '">' + escapeHtml(run.issue_identifier || t("查看任务")) + icon("chevron") + '</button>' : '<span>' + escapeHtml(run.error || t("尚未创建任务")) + '</span>';
          return '<li><span class="better-codex-scheduled-run-state" data-state="' + runState.key + '"><i></i>' + escapeHtml(runState.label) + '</span><time datetime="' + escapeHtml(run.scheduled_for) + '">' + escapeHtml(scheduledTaskDateTime(run.scheduled_for)) + '</time>' + issue + '</li>';
        }).join("");
        const recent = runRows ? '<details class="better-codex-scheduled-runs"><summary>' + te("最近运行") + '<span>' + escapeHtml(String(task.recent_runs.length)) + '</span>' + icon("chevron") + '</summary><ul>' + runRows + '</ul></details>' : '<div class="better-codex-scheduled-never">' + te("尚未运行") + '</div>';
        return '<article class="better-codex-scheduled-row" data-enabled="' + task.enabled + '"><div class="better-codex-scheduled-row-main"><span class="better-codex-scheduled-status" data-state="' + (task.enabled ? active ? "running" : "enabled" : "paused") + '"><i></i>' + escapeHtml(task.enabled ? active ? t("执行中") : t("已启用") : t("已暂停")) + '</span><div class="better-codex-scheduled-copy"><h2>' + escapeHtml(task.name) + '</h2><p>' + escapeHtml(task.prompt.replace(/\s+/g, " ")) + '</p><div><span>' + icon("folder") + escapeHtml(scheduledTaskProjectName(task)) + '</span><span>' + icon("bot") + escapeHtml(scheduledTaskAgentName(task)) + '</span></div></div><div class="better-codex-scheduled-timing"><span>' + escapeHtml(scheduledTaskIntervalLabel(task)) + '</span><strong>' + escapeHtml(task.enabled && task.next_run_at ? scheduledTaskDateTime(task.next_run_at) : t("暂无下次执行")) + '</strong><small>' + te(task.enabled && task.next_run_at ? "下次执行" : "当前计划") + '</small></div><div class="better-codex-scheduled-row-actions"><button type="button" data-scheduled-run="' + escapeHtml(task.id) + '" aria-label="' + te("立即运行") + '" title="' + te("立即运行") + '"' + (active || state.mockup ? " disabled" : "") + '>' + icon("refresh") + '</button><button type="button" data-scheduled-toggle="' + escapeHtml(task.id) + '" aria-label="' + te(task.enabled ? "暂停" : "启用") + '" title="' + te(task.enabled ? "暂停" : "启用") + '"' + (state.mockup ? " disabled" : "") + '>' + icon(task.enabled ? "stop" : "check") + '</button><button type="button" data-scheduled-edit="' + escapeHtml(task.id) + '" aria-label="' + te("编辑") + '" title="' + te("编辑") + '"' + (state.mockup ? " disabled" : "") + '>' + icon("edit") + '</button><button class="is-danger" type="button" data-scheduled-delete="' + escapeHtml(task.id) + '" aria-label="' + te("删除") + '" title="' + te("删除") + '"' + (state.mockup ? " disabled" : "") + '>' + icon("trash") + '</button></div></div>' + recent + '</article>';
      }).join("");
      container.innerHTML = '<section class="better-codex-scheduled-shell"><header class="better-codex-scheduled-overview"><div><span>' + te("下次执行") + '</span><strong>' + escapeHtml(next?.next_run_at ? scheduledTaskDateTime(next.next_run_at) : t("暂无已启用的计划")) + '</strong><small>' + escapeHtml(next?.name || t("创建或启用一个定时任务")) + '</small></div><dl><div><dt>' + te("已启用") + '</dt><dd>' + enabled.length + '</dd></div><div><dt>' + te("执行中") + '</dt><dd>' + running + '</dd></div><div><dt>' + te("已暂停") + '</dt><dd>' + (state.scheduledTasks.length - enabled.length) + '</dd></div></dl></header><div class="better-codex-scheduled-list">' + rows + '</div></section>';
    }

    async function loadScheduledTasks(options = {}) {
      const tasks = await requestList("/api/scheduled-tasks", "scheduledTasks", { passive: Boolean(options.background) });
      const changed = JSON.stringify(tasks) !== JSON.stringify(state.scheduledTasks);
      state.scheduledTasks = tasks;
      state.scheduledTasksLoaded = true;
      if (options.background && !changed) return;
      render();
    }

    function openScheduledTaskDialog(task = null) {
      if (state.mockup || !SCHEDULED_AVAILABLE) return;
      const existingDialog = document.getElementById("better-codex-scheduled-dialog");
      if (existingDialog?.open) existingDialog.close();
      else existingDialog?.remove();
      const firstProject = state.projects.find(project => project.id === (task?.project_id || state.projectId) && project.workspace_path) || state.projects.find(project => project.workspace_path) || state.projects[0];
      const start = task?.starts_at || new Date(Math.ceil((Date.now() + 300_000) / 300_000) * 300_000).toISOString();
      const projectOptions = state.projects.map(project => ({ value: project.id, label: projectLabel(project), icon: "folder" }));
      const agentOptions = [{ value: "", label: t("默认智能体"), icon: "bot" }, ...state.agents.filter(agent => !agent.is_default && agent.id).map(agent => ({ value: agent.id, label: agentDisplayName(agent), icon: "bot" }))];
      const intervalUnits = [["minute", "分钟"], ["hour", "小时"], ["day", "天"], ["week", "周"]];
      const draft = {
        mode: task ? "manual" : "agent",
        conversationPrompt: "",
        name: task?.name || "",
        prompt: task?.prompt || "",
        projectId: firstProject?.id || "",
        agentId: task?.agent_id || "",
        startsAt: scheduledTaskLocalValue(start),
        repeat: Boolean(task?.repeat),
        intervalValue: String(task?.interval_value || 1),
        intervalUnit: task?.interval_unit || "hour",
        enabled: task?.enabled !== false,
      };
      const dialog = document.createElement("dialog");
      dialog.id = "better-codex-scheduled-dialog";
      dialog.dataset.host = HOST_KIND;
      dialog.setAttribute(OWNED, "true");
      let scheduledInputFrame = null;
      let form = null;
      const scheduledTaskPicker = (name, label, selected, options, meta = "") => {
        const current = options.find(option => option.value === selected) || options[0] || { value: "", label: t("未提供"), icon: "" };
        const optionCopy = option => '<span class="better-codex-scheduled-picker-option-copy">' + (option.icon ? icon(option.icon) : "") + '<span>' + escapeHtml(option.label) + '</span></span>';
        const rows = options.map(option => '<button class="better-codex-scheduled-picker-option' + (option.value === current.value ? " is-selected" : "") + '" type="button" role="option" aria-selected="' + String(option.value === current.value) + '" data-scheduled-picker-option="' + escapeHtml(name) + '" data-scheduled-picker-value="' + escapeHtml(option.value) + '">' + optionCopy(option) + '<span class="better-codex-scheduled-picker-check">' + (option.value === current.value ? icon("check") : "") + '</span></button>').join("");
        return '<div class="better-codex-scheduled-field better-codex-scheduled-picker" data-scheduled-picker="' + escapeHtml(name) + '"><span class="better-codex-scheduled-field-label">' + escapeHtml(label) + '</span><input type="hidden" name="' + escapeHtml(name) + '" value="' + escapeHtml(current.value) + '"><button class="better-codex-scheduled-picker-trigger" type="button" role="combobox" aria-label="' + escapeHtml(label) + '" aria-haspopup="listbox" aria-expanded="false" data-scheduled-picker-toggle="' + escapeHtml(name) + '"' + (options.length ? "" : " disabled") + '><span data-scheduled-picker-label>' + optionCopy(current) + '</span>' + icon("chevronDown") + '</button><span class="better-codex-scheduled-picker-menu" role="listbox" hidden>' + rows + '</span>' + (meta ? '<small class="better-codex-scheduled-project-path" data-scheduled-project-path>' + escapeHtml(meta) + '</small>' : "") + '</div>';
      };
      const syncDraft = () => {
        if (!form) return;
        draft.projectId = String(form.elements.project_id?.value || draft.projectId);
        draft.agentId = String(form.elements.agent_id?.value || "");
        if (draft.mode === "agent") draft.conversationPrompt = String(form.elements.conversation_prompt?.value || "");
        else {
          draft.name = String(form.elements.name?.value || "");
          draft.prompt = String(form.elements.prompt?.value || "");
          draft.startsAt = String(form.elements.starts_at?.value || "");
          draft.repeat = Boolean(form.elements.repeat?.checked);
          draft.intervalValue = String(form.elements.interval_value?.value || "1");
          draft.intervalUnit = String(form.elements.interval_unit?.value || "hour");
          draft.enabled = Boolean(form.elements.enabled?.checked);
        }
      };
      const closeScheduledPickers = except => {
        dialog.querySelectorAll("[data-scheduled-picker]").forEach(picker => {
          if (picker === except) return;
          picker.classList.remove("is-open");
          picker.querySelector("[data-scheduled-picker-toggle]").setAttribute("aria-expanded", "false");
          picker.querySelector(".better-codex-scheduled-picker-menu").hidden = true;
        });
      };
      const scheduledDialogViewport = () => {
        if (scheduledInputFrame !== null) cancelAnimationFrame(scheduledInputFrame);
        const compact = HOST_KIND === "web" && window.matchMedia("(max-width: 720px)").matches;
        if (!compact) {
          dialog.style.removeProperty("--bc-mobile-viewport-top");
          dialog.style.removeProperty("--bc-mobile-viewport-height");
          return;
        }
        const viewport = window.visualViewport;
        dialog.style.setProperty("--bc-mobile-viewport-top", (viewport?.offsetTop || 0) + "px");
        dialog.style.setProperty("--bc-mobile-viewport-height", (viewport?.height || window.innerHeight) + "px");
        const active = document.activeElement;
        scheduledInputFrame = requestAnimationFrame(() => {
          scheduledInputFrame = null;
          if (active instanceof HTMLElement && dialog.contains(active) && active.matches("input, textarea, select")) active.scrollIntoView({ block: "nearest", inline: "nearest" });
        });
      };
      const renderDialog = () => {
        closeScheduledPickers();
        dialog.dataset.mode = draft.mode;
        const project = state.projects.find(item => item.id === draft.projectId);
        const projectPicker = scheduledTaskPicker("project_id", t("项目"), draft.projectId, projectOptions, project?.workspace_path || t("未提供项目文件夹"));
        const agentPicker = scheduledTaskPicker("agent_id", t("执行智能体"), draft.agentId, agentOptions);
        const header = '<header><div><span class="better-codex-scheduled-dialog-icon">' + icon(draft.mode === "agent" ? "bot" : "calendar") + '</span><h2>' + te(task ? "编辑定时任务" : draft.mode === "agent" ? "通过智能体创建" : "手动创建") + '</h2></div><button type="button" data-scheduled-dialog-close aria-label="' + te("关闭") + '">' + icon("close") + '</button></header>';
        const switchButton = task ? "" : '<button class="better-codex-scheduled-mode-switch" type="button" data-scheduled-dialog-switch>' + icon("switch") + te(draft.mode === "agent" ? "切换到手动" : "切换到智能体") + '</button>';
        let body = "";
        let leading = "";
        if (draft.mode === "agent") {
          const selectedAgent = state.agents.find(agent => agent.is_default ? !draft.agentId : agent.id === draft.agentId);
          const agentName = selectedAgent?.name || t("默认智能体");
          const hint = state.locale === "zh-CN" ? agentName + " 会理解任务内容和执行时间，并直接创建定时任务。" : agentName + " will interpret the task and timing, then create the schedule.";
          body = '<div class="better-codex-scheduled-agent-create"><label class="is-wide"><span>' + te("告诉智能体你想如何安排任务") + '</span><textarea name="conversation_prompt" maxlength="100000" rows="7" placeholder="' + te("例如：每天上午 9 点整理这个项目昨天的进展和今天的待办") + '" required>' + escapeHtml(draft.conversationPrompt) + '</textarea></label><div class="better-codex-scheduled-agent-hint">' + agentAvatarMarkup(selectedAgent, "better-codex-agent-avatar") + '<span>' + escapeHtml(hint) + '</span></div>' + projectPicker + agentPicker + '<output hidden></output></div>';
        } else {
          const intervalUnitOptions = intervalUnits.map(([value, label]) => '<button type="button" role="radio" aria-checked="' + String(value === draft.intervalUnit) + '" data-scheduled-interval-unit="' + value + '">' + te(label) + '</button>').join("");
          body = '<label class="is-wide"><span>' + te("名称") + '</span><input name="name" maxlength="120" value="' + escapeHtml(draft.name) + '" placeholder="' + te("例如：每天整理项目进展") + '" required></label><label class="is-wide"><span>' + te("任务内容") + '</span><textarea name="prompt" maxlength="100000" rows="6" placeholder="' + te("说明每次需要完成的具体任务") + '" required>' + escapeHtml(draft.prompt) + '</textarea></label>' + projectPicker + agentPicker + '<label><span>' + te("首次执行") + '</span><input name="starts_at" type="datetime-local" value="' + escapeHtml(draft.startsAt) + '" required></label><label class="better-codex-scheduled-switch"><strong>' + te("循环执行") + '</strong><input name="repeat" type="checkbox"' + (draft.repeat ? " checked" : "") + '></label><div class="better-codex-scheduled-interval is-wide"><label><span>' + te("每隔") + '</span><input name="interval_value" type="number" min="1" max="999" value="' + escapeHtml(draft.intervalValue) + '"></label><div class="better-codex-scheduled-field"><span class="better-codex-scheduled-field-label">' + te("单位") + '</span><input type="hidden" name="interval_unit" value="' + escapeHtml(draft.intervalUnit) + '"><div class="better-codex-scheduled-unit-switch" role="radiogroup" aria-label="' + te("单位") + '">' + intervalUnitOptions + '</div></div></div><output hidden></output>';
          leading = '<label class="better-codex-scheduled-enable"><input name="enabled" type="checkbox"' + (draft.enabled ? " checked" : "") + '><strong>' + te("立即启用") + '</strong></label>';
        }
        dialog.innerHTML = '<form method="dialog">' + header + '<div class="better-codex-scheduled-dialog-body">' + body + '</div><footer>' + leading + '<div>' + switchButton + '<button type="button" data-scheduled-dialog-cancel>' + te("取消") + '</button><button class="better-codex-submit" type="submit">' + te(task ? "保存" : "创建") + '</button></div></footer></form>';
        form = dialog.querySelector("form");
        const repeat = form.elements.repeat;
        const syncRepeat = () => {
          const interval = dialog.querySelector(".better-codex-scheduled-interval");
          if (!interval || !repeat) return;
          interval.hidden = !repeat.checked;
          form.elements.interval_value.required = repeat.checked;
          form.elements.interval_unit.required = repeat.checked;
        };
        repeat?.addEventListener("change", syncRepeat);
        syncRepeat();
        form.elements.project_id?.addEventListener("change", () => {
          draft.projectId = form.elements.project_id.value;
          const selectedProject = state.projects.find(item => item.id === draft.projectId);
          const path = dialog.querySelector("[data-scheduled-project-path]");
          if (path) path.textContent = selectedProject?.workspace_path || t("未提供项目文件夹");
        });
        form.elements.agent_id?.addEventListener("change", () => {
          draft.agentId = form.elements.agent_id.value;
          const selectedAgent = state.agents.find(agent => agent.is_default ? !draft.agentId : agent.id === draft.agentId);
          const name = selectedAgent?.name || t("默认智能体");
          const hint = dialog.querySelector(".better-codex-scheduled-agent-hint span:last-child");
          if (hint) hint.textContent = state.locale === "zh-CN" ? name + " 会理解任务内容和执行时间，并直接创建定时任务。" : name + " will interpret the task and timing, then create the schedule.";
        });
        dialog.querySelector("[data-scheduled-dialog-close]").addEventListener("click", () => dialog.close());
        dialog.querySelector("[data-scheduled-dialog-cancel]").addEventListener("click", () => dialog.close());
        dialog.querySelector("[data-scheduled-dialog-switch]")?.addEventListener("click", () => {
          syncDraft();
          if (draft.mode === "agent") {
            draft.name ||= draft.conversationPrompt.split(/\n/).find(line => line.trim())?.trim().slice(0, 120) || "";
            draft.prompt ||= draft.conversationPrompt;
            draft.mode = "manual";
          } else {
            const unit = state.locale === "zh-CN" ? { minute: "分钟", hour: "小时", day: "天", week: "周" }[draft.intervalUnit] : draft.intervalUnit;
            const timing = state.locale === "zh-CN"
              ? "首次执行：" + draft.startsAt + (draft.repeat ? "，每 " + draft.intervalValue + " " + unit + "执行一次" : "，仅执行一次")
              : "First run: " + draft.startsAt + (draft.repeat ? ", repeat every " + draft.intervalValue + " " + unit : ", run once");
            draft.conversationPrompt ||= [draft.name, draft.prompt, timing].filter(Boolean).join("\n\n");
            draft.mode = "agent";
          }
          renderDialog();
          form.elements[draft.mode === "agent" ? "conversation_prompt" : "name"]?.focus();
        });
        form.addEventListener("input", () => {
          const output = form.querySelector("output");
          if (output?.dataset.tone === "info") output.hidden = true;
        });
        form.addEventListener("submit", event => {
          event.preventDefault();
          if (!form.reportValidity()) return;
          syncDraft();
          const submit = form.querySelector('[type="submit"]');
          const output = form.querySelector("output");
          submit.disabled = true;
          submit.textContent = t(draft.mode === "agent" ? "智能体创建中…" : task ? "保存中…" : "创建中…");
          output.hidden = true;
          void perform(async () => {
            try {
              if (draft.mode === "agent") {
                const result = await api("/api/scheduled-tasks/agent-create", { method: "POST", body: JSON.stringify({ prompt: draft.conversationPrompt, project_id: draft.projectId, agent_id: draft.agentId }), timeoutMs: 110000 });
                if (!result.created) {
                  output.textContent = result.question;
                  output.dataset.tone = "info";
                  output.hidden = false;
                  submit.disabled = false;
                  submit.textContent = t("创建");
                  return;
                }
              } else {
                const body = {
                  name: draft.name,
                  prompt: draft.prompt,
                  project_id: draft.projectId,
                  agent_id: draft.agentId,
                  starts_at: new Date(draft.startsAt).toISOString(),
                  repeat: draft.repeat,
                  interval_value: Number(draft.intervalValue),
                  interval_unit: draft.intervalUnit,
                  enabled: draft.enabled,
                  ...(task ? { version: task.version } : {})
                };
                await api(task ? "/api/scheduled-tasks/" + encodeURIComponent(task.id) : "/api/scheduled-tasks", { method: task ? "PATCH" : "POST", body: JSON.stringify(body) });
              }
              await loadScheduledTasks();
              dialog.close();
            } catch (caught) {
              presentInlineError(output, caught, errorLabel(caught), { source: draft.mode === "agent" ? "scheduled_task_agent_create" : "scheduled_task_save" });
              submit.disabled = false;
              submit.textContent = t(task ? "保存" : "创建");
            }
          });
        });
      };
      dialog.addEventListener("click", event => {
        const toggle = event.target.closest("[data-scheduled-picker-toggle]");
        if (toggle) {
          const picker = toggle.closest("[data-scheduled-picker]");
          const menu = picker.querySelector(".better-codex-scheduled-picker-menu");
          const opening = menu.hidden;
          closeScheduledPickers(picker);
          picker.classList.toggle("is-open", opening);
          menu.hidden = !opening;
          toggle.setAttribute("aria-expanded", String(opening));
          return;
        }
        const option = event.target.closest("[data-scheduled-picker-option]");
        if (option) {
          const name = option.dataset.scheduledPickerOption;
          const picker = option.closest("[data-scheduled-picker]");
          const trigger = picker.querySelector("[data-scheduled-picker-toggle]");
          const input = form.elements[name];
          input.value = option.dataset.scheduledPickerValue;
          trigger.querySelector("[data-scheduled-picker-label]").innerHTML = option.querySelector(".better-codex-scheduled-picker-option-copy").outerHTML;
          picker.querySelectorAll("[data-scheduled-picker-option]").forEach(item => {
            const selected = item === option;
            item.classList.toggle("is-selected", selected);
            item.setAttribute("aria-selected", String(selected));
            item.querySelector(".better-codex-scheduled-picker-check").innerHTML = selected ? icon("check") : "";
          });
          input.dispatchEvent(new Event("change", { bubbles: true }));
          closeScheduledPickers();
          trigger.focus();
          return;
        }
        const unit = event.target.closest("[data-scheduled-interval-unit]");
        if (unit) {
          form.elements.interval_unit.value = unit.dataset.scheduledIntervalUnit;
          dialog.querySelectorAll("[data-scheduled-interval-unit]").forEach(button => button.setAttribute("aria-checked", String(button === unit)));
          return;
        }
        closeScheduledPickers();
      });
      dialog.addEventListener("cancel", event => {
        event.preventDefault();
        if (dialog.querySelector("[data-scheduled-picker].is-open")) closeScheduledPickers();
        else dialog.close();
      });
      dialog.addEventListener("close", () => {
        window.visualViewport?.removeEventListener("resize", scheduledDialogViewport);
        window.visualViewport?.removeEventListener("scroll", scheduledDialogViewport);
        window.removeEventListener("resize", scheduledDialogViewport);
        if (scheduledInputFrame !== null) cancelAnimationFrame(scheduledInputFrame);
        dialog.remove();
      }, { once: true });
      bindModalDismiss(dialog, () => dialog.close());
      document.body.append(dialog);
      renderDialog();
      dialog.showModal();
      scheduledDialogViewport();
      window.visualViewport?.addEventListener("resize", scheduledDialogViewport, { passive: true });
      window.visualViewport?.addEventListener("scroll", scheduledDialogViewport, { passive: true });
      window.addEventListener("resize", scheduledDialogViewport, { passive: true });
      form.elements[draft.mode === "agent" ? "conversation_prompt" : "name"]?.focus();
    }

    function onScheduledTasksClick(event) {
      if (event.target.closest("[data-scheduled-create]")) return openScheduledTaskDialog();
      const edit = event.target.closest("[data-scheduled-edit]");
      if (edit) return openScheduledTaskDialog(state.scheduledTasks.find(task => task.id === edit.dataset.scheduledEdit));
      const toggle = event.target.closest("[data-scheduled-toggle]");
      if (toggle) {
        const task = state.scheduledTasks.find(item => item.id === toggle.dataset.scheduledToggle);
        if (!task) return;
        return void perform(async () => {
          toggle.disabled = true;
          await api("/api/scheduled-tasks/" + encodeURIComponent(task.id), { method: "PATCH", body: JSON.stringify({ version: task.version, enabled: !task.enabled }) });
          await loadScheduledTasks();
        });
      }
      const run = event.target.closest("[data-scheduled-run]");
      if (run) {
        const task = state.scheduledTasks.find(item => item.id === run.dataset.scheduledRun);
        if (!task) return;
        return void perform(async () => {
          run.disabled = true;
          await api("/api/scheduled-tasks/" + encodeURIComponent(task.id) + "/run", { method: "POST" });
          await loadScheduledTasks();
        });
      }
      const remove = event.target.closest("[data-scheduled-delete]");
      if (remove) {
        const task = state.scheduledTasks.find(item => item.id === remove.dataset.scheduledDelete);
        if (!task) return;
        return void confirmAction("删除定时任务", "删除后不会影响已经创建或正在执行的任务。", "删除").then(confirmed => confirmed && perform(async () => {
          await api("/api/scheduled-tasks/" + encodeURIComponent(task.id), { method: "DELETE", body: JSON.stringify({ version: task.version }) });
          await loadScheduledTasks();
        }));
      }
      const issueButton = event.target.closest("[data-scheduled-issue]");
      if (issueButton) return void perform(async () => {
        const issue = await api("/api/issues/" + encodeURIComponent(issueButton.dataset.scheduledIssue));
        openRoute("issues");
        await loadIssues();
        await openEditor(issue);
      });
    }

    function syncAutoDispatch() {
      const button = panel?.querySelector("#better-codex-auto-dispatch");
      if (!button) return;
      const label = state.autoDispatchPending ? "切换中…" : state.autoDispatch ? "自动运行" : "手动运行";
      const markup = icon(state.autoDispatch || state.autoDispatchPending ? "refresh" : "user") + "<span>" + te(label) + "</span>";
      button.classList.toggle("is-on", state.autoDispatch);
      button.setAttribute("aria-pressed", String(state.autoDispatch));
      button.disabled = state.autoDispatchPending;
      button.setAttribute("aria-busy", String(state.autoDispatchPending));
      button.removeAttribute("title");
      button.setAttribute("aria-label", t(state.autoDispatch ? "切换为手动运行" : "切换为自动运行"));
      if (button.__betterCodexMarkup !== markup) {
        button.innerHTML = markup;
        button.__betterCodexMarkup = markup;
      }
    }

    function syncMockupUi() {
      if (!panel) return;
      panel.dataset.mockup = String(state.mockup);
      const autoDispatch = panel.querySelector("#better-codex-auto-dispatch");
      if (autoDispatch) autoDispatch.hidden = false;
      const createToggle = panel.querySelector("#better-codex-create-toggle");
      if (createToggle) createToggle.hidden = false;
    }

    function syncBoardAttributes(current, next) {
      Array.from(current.attributes).forEach(attribute => {
        if (!next.hasAttribute(attribute.name)) current.removeAttribute(attribute.name);
      });
      Array.from(next.attributes).forEach(attribute => {
        if (current.getAttribute(attribute.name) !== attribute.value) current.setAttribute(attribute.name, attribute.value);
      });
    }

    function boardMarkupSignature(markup) {
      return markup.replace(/better-codex-logo-gradient-\d+/g, "better-codex-logo-gradient");
    }

    function syncBoardElement(current, next) {
      const markup = next.innerHTML;
      const signature = boardMarkupSignature(markup);
      syncBoardAttributes(current, next);
      if (current.__betterCodexMarkup === signature) return;
      if (current.innerHTML !== markup) current.innerHTML = markup;
      current.__betterCodexMarkup = signature;
    }

    function reconcileBoard(board, markup) {
      const template = document.createElement("template");
      template.innerHTML = markup;
      const nextColumns = Array.from(template.content.children);
      const currentColumns = new Map(Array.from(board.querySelectorAll(":scope > .better-codex-column")).map(column => [column.dataset.status, column]));
      const currentCards = new Map(Array.from(board.querySelectorAll("[data-issue-id]")).map(card => [card.dataset.issueId, card]));
      const retainedColumns = new Set();
      nextColumns.forEach((nextColumn, columnIndex) => {
        const status = nextColumn.dataset.status;
        let currentColumn = currentColumns.get(status);
        const nextHead = nextColumn.querySelector(":scope > .better-codex-column-head");
        const nextCards = nextColumn.querySelector(":scope > .better-codex-cards");
        const currentHead = currentColumn?.querySelector(":scope > .better-codex-column-head");
        const currentCardsContainer = currentColumn?.querySelector(":scope > .better-codex-cards");
        if (!currentColumn || !nextHead || !nextCards || !currentHead || !currentCardsContainer) {
          currentColumn = nextColumn;
          if (nextHead) nextHead.__betterCodexMarkup = boardMarkupSignature(nextHead.innerHTML);
          Array.from(nextCards?.children || []).forEach(card => { card.__betterCodexMarkup = boardMarkupSignature(card.innerHTML); });
        } else {
          syncBoardAttributes(currentColumn, nextColumn);
          syncBoardElement(currentHead, nextHead);
          const retainedCards = new Set();
          Array.from(nextCards.children).forEach((nextCard, cardIndex) => {
            const issueId = nextCard.dataset.issueId;
            let currentCard = issueId ? currentCards.get(issueId) : Array.from(currentCardsContainer.children).find(card => !card.dataset.issueId);
            if (!currentCard || currentCard.tagName !== nextCard.tagName) {
              currentCard = nextCard;
              currentCard.__betterCodexMarkup = boardMarkupSignature(currentCard.innerHTML);
            }
            else syncBoardElement(currentCard, nextCard);
            retainedCards.add(currentCard);
            if (currentCardsContainer.children[cardIndex] !== currentCard) currentCardsContainer.insertBefore(currentCard, currentCardsContainer.children[cardIndex] || null);
          });
          Array.from(currentCardsContainer.children).forEach(card => {
            if (!retainedCards.has(card)) card.remove();
          });
        }
        retainedColumns.add(currentColumn);
        if (board.children[columnIndex] !== currentColumn) board.insertBefore(currentColumn, board.children[columnIndex] || null);
      });
      Array.from(board.children).forEach(column => {
        if (!retainedColumns.has(column)) column.remove();
      });
    }

    function render() {
      if (!panel) return;
      panel.dataset.surface = state.surface;
      if (HOST_KIND === "web" && state.surface !== "projects") document.title = t(state.surface === "agents" ? "智能体" : state.surface === "scheduled" ? "定时任务" : "任务看板") + " · Better Codex";
      syncAutoDispatch();
      syncMockupUi();
      if (state.surface === "scheduled") {
        activateFeature("scheduled");
        hydrateSharedControls(panel, "scheduled");
        return;
      }
      if (state.surface === "agents") {
        activateFeature("agents");
        hydrateSharedControls(panel, "agents");
        return;
      }
      if (state.surface === "projects") {
        activateFeature("projects");
        hydrateSharedControls(panel, "projects");
        return;
      }
      activateFeature("board");
    }

    function renderBoard(options = {}) {
      const projectBoard = Boolean(options.projectId);
      const sourceIssues = options.issues || state.issues;
      if (!projectBoard) {
        const runningCount = state.issues.filter(issue => issueExecutionRunning(issue)).length;
        panel.querySelectorAll("[data-view]").forEach(button => button.classList.toggle("is-active", button.dataset.view === state.view));
        const working = panel.querySelector("#better-codex-working");
        const workingMarkup = icon("bot") + '<span>' + te(runningCount + " 个智能体工作中") + "</span>";
        if (working.innerHTML !== workingMarkup) working.innerHTML = workingMarkup;
        working.dataset.runningCount = String(runningCount);
        working.setAttribute("aria-label", t(runningCount + " 个智能体工作中"));
        working.title = t(runningCount ? "查看运行中的任务" : "当前没有运行中的任务");
        working.classList.toggle("has-work", runningCount > 0);
        working.classList.toggle("is-active", state.view === "working");
        working.hidden = false;
        const filterButton = panel.querySelector("#better-codex-filter");
        const filterCount = Object.values(state.filters).reduce((total, values) => total + values.length, 0);
        const filterMarkup = icon("filter") + "<span>" + te(filterCount ? filterCount + " 个筛选" : "筛选") + "</span>";
        if (filterButton.innerHTML !== filterMarkup) filterButton.innerHTML = filterMarkup;
        filterButton.setAttribute("aria-label", t(filterCount ? filterCount + " 个筛选" : "筛选"));
        filterButton.classList.toggle("is-active", filterCount > 0);
      }
      const visible = sourceIssues.filter(issue => {
        const assigned = Boolean(issue.agent_enabled || issue.user_assigned);
        const matchesView = projectBoard || state.view === "all"
          || (state.view === "assigned" && assigned)
          || (state.view === "unassigned" && !assigned)
          || (state.view === "working" && issueExecutionRunning(issue));
        return matchesView && (projectBoard || issueMatchesFilters(issue));
      });
      const board = options.board || panel.querySelector("#better-codex-board");
      if (!board) throw new Error(projectBoard ? "project_board_mount_missing" : "board_mount_missing");
      if (!(options.loaded ?? state.issuesLoaded)) {
        board.innerHTML = '<section class="better-codex-board-loading" role="status" aria-live="polite"><span aria-hidden="true"></span><strong>' + te("正在加载任务看板") + '</strong></section>';
        if (!projectBoard) requestAnimationFrame(syncBoardScrollControl);
        return;
      }
      const visibleStatuses = [...Object.entries(statusLabels), ["archive", "归档"]];
      const boardMarkup = visibleStatuses.map(([status, statusLabel]) => {
        const archiveColumn = status === "archive";
        const issues = archiveColumn ? [] : visible.filter(issue => issue.status === status);
        const cards = issues.map(issue => {
          const permissions = issuePermissions(issue);
          const enrichmentLocked = permissions.enrichmentPending;
          const executionRunning = permissions.executionRunning;
          const issueLocked = permissions.boardLocked;
          const assignedAgent = state.agents.find(agent => agent.id === issue.agent_id);
          const defaultAgent = state.agents.find(agent => agent.is_default);
          const assignee = issue.agent_enabled
            ? (assignedAgent || defaultAgent || { name: "Codex", is_default: true })
            : null;
          const agentName = mockupText(agentDisplayName(assignee));
          const activityAgent = assignee || defaultAgent || { name: "Codex", is_default: true };
          const latestRunStatus = issue.latest_run_status || "";
          const replyResultState = issue.reply_status === "succeeded" ? "completed" : ["failed", "interrupted"].includes(issue.reply_status) ? issue.reply_status : "";
          const executionState = issue.status === "done" ? "completed" : issue.status === "cancelled" ? "interrupted" : issue.status === "blocked" ? "blocked" : issue.status === "in_review" ? ((issue.latest_scheduler_error || issue.latest_scheduler_status === "failed") ? "scheduler-failed" : "in_review") : replyResultState || (latestRunStatus === "failed" ? "failed" : latestRunStatus === "interrupted" ? "interrupted" : latestRunStatus === "scheduling" ? "scheduling" : latestRunStatus === "running" ? "running" : latestRunStatus === "claimed" ? "claimed" : issue.agent_enabled ? "not-started" : "");
          const sessionExecutionState = issue.session_status === "stopping" ? "stopping" : issue.session_status === "starting" ? "claimed" : ["active", "waiting_on_approval", "waiting_on_user"].includes(issue.session_status) ? "running" : "";
          const activeExecutionState = issue.active_run_status || (issue.reply_status === "running" ? "running" : sessionExecutionState);
          const activityState = permissions.remotePending ? "remote-pending" : permissions.remoteConflict ? "remote-conflict" : enrichmentLocked ? "thinking" : issue.enrichment_status === "failed" ? "title-regeneration-failed" : issue.session_status === "stopping" ? "stopping" : activeExecutionState || executionState;
          const activityLabel = t(activityState === "remote-pending" ? "同步中" : activityState === "remote-conflict" ? "同步冲突" : issue.enrichment_status === "regenerating" ? "标题生成中" : enrichmentLocked ? "理解中" : activityState === "title-regeneration-failed" ? "标题生成失败" : activityState === "stopping" ? "正在停止…" : activityState === "running" ? "工作中" : activityState === "scheduling" ? "调度中" : activityState === "scheduler-failed" ? "调度失败" : activityState === "claimed" ? "排队中" : activityState === "in_review" ? "待审核" : activityState === "completed" ? "已完成" : activityState === "blocked" ? "已阻塞" : activityState === "failed" ? "执行失败" : activityState === "interrupted" ? "已停止" : activityState === "not-started" ? "未开始" : "");
          const activityIcon = activityState === "scheduling" ? '<span class="better-codex-activity-dot better-codex-scheduler-dot" aria-hidden="true"></span>' : activityState === "scheduler-failed" ? '<span class="better-codex-activity-dot better-codex-scheduler-failed-dot" aria-hidden="true"></span>' : ["completed", "interrupted", "not-started"].includes(activityState) ? '<span class="better-codex-activity-dot" aria-hidden="true"></span>' : ["failed", "blocked", "remote-conflict", "title-regeneration-failed"].includes(activityState) ? icon("close") : agentAvatarMarkup(activityAgent, "better-codex-card-avatar");
          const activity = activityState
            ? '<span class="better-codex-activity" data-run="' + escapeHtml(activityState) + '">' + activityIcon + '<span class="' + (enrichmentLocked || executionRunning || permissions.remotePending ? "better-codex-shimmer" : "") + '">' + activityLabel + '</span></span>'
            : "";
          const description = mockupText(issue.description).replace(/[#*_`~>[]()]/g, "").replace(/\s+/g, " ").trim();
          const issueProject = state.projects.find(item => item.id === issue.project_id);
          const projectChip = projectLabel(issueProject)
            ? '<span class="better-codex-chip">' + icon("folder") + '<span>' + escapeHtml(projectLabel(issueProject)) + '</span></span>'
            : "";
          const labelChips = (issue.labels || []).map(value => '<span class="better-codex-chip">' + escapeHtml(mockupText(value)) + '</span>').join("");
          const chips = projectChip + labelChips;
          const assignedUser = issueUserProfile(issue);
          const meta = assignee
            ? '<span class="better-codex-card-assignee">' + agentAvatarMarkup(assignee, "better-codex-card-avatar") + '<span>' + escapeHtml(agentName || "Codex") + '</span></span>'
            : issue.user_assigned
              ? '<span class="better-codex-card-assignee">' + userAvatarMarkup(assignedUser, "better-codex-card-avatar") + '<span>' + escapeHtml(assignedUser?.name || t("我")) + '</span></span>'
              : '<span class="better-codex-card-assignee is-empty">' + icon("user") + '<span>' + te("未分配") + '</span></span>';
          return '<article class="better-codex-card' + (issue.id === draggingIssueId ? " is-dragging" : "") + (enrichmentLocked ? " is-enrichment-pending" : "") + (executionRunning ? " is-execution-running" : "") + (permissions.remotePending ? " is-remote-pending" : "") + (permissions.remoteConflict ? " is-remote-conflict" : "") + '" draggable="' + String(!issueLocked && supportsIssueDrag()) + '" aria-disabled="' + String(issueLocked) + '"' + (issueLocked ? ' aria-busy="' + String(enrichmentLocked || executionRunning || permissions.remotePending) + '"' : "") + ' data-issue-id="' + escapeHtml(issue.id) + '"><div class="better-codex-card-row"><div class="better-codex-card-id">' + priorityIcon(issue.priority) + '<span>' + escapeHtml(issue.identifier) + '</span></div>' + activity + '</div><div class="better-codex-card-title">' + escapeHtml(mockupText(issue.title)) + '</div>' + (description ? '<div class="better-codex-card-description">' + escapeHtml(description) + '</div>' : "") + (chips ? '<div class="better-codex-chip-row">' + chips + '</div>' : "") + '<div class="better-codex-card-meta">' + meta + '<span>' + te("更新于 " + timeAgo(issue.updated_at)) + '</span></div></article>';
        }).join("");
        const columnButton = archiveColumn
          ? '<button class="better-codex-column-icon" type="button" data-archive-open aria-label="' + te("查看已归档卡片") + '" title="' + te("查看已归档卡片") + '">' + icon("archive") + '</button>'
          : '<button class="better-codex-column-icon" type="button" data-add-status="' + status + '" aria-label="' + te("新建任务") + '">' + icon("plus") + '</button>';
        return '<section class="better-codex-column" data-status="' + status + '"><div class="better-codex-column-head"><span class="better-codex-column-title">' + statusIcon(status) + '<span>' + te(statusLabel) + '</span>' + (archiveColumn ? "" : '<span>' + issues.length + '</span>') + '</span><span class="better-codex-column-actions">' + columnButton + '</span></div><div class="better-codex-cards">' + (cards || (archiveColumn ? '<div class="better-codex-empty">' + te("拖到这里即可归档") + '</div>' : "")) + '</div></section>';
      }).join("");
      reconcileBoard(board, boardMarkup);
      hydrateSharedControls(board, projectBoard ? "projects" : "board");
      if (!projectBoard) requestAnimationFrame(syncBoardScrollControl);
    }

    async function loadIssues(options = {}) {
      if (options.background && (draggingIssueId || sessionDragPointer?.dragging)) return;
      const query = new URLSearchParams();
      if (state.search) query.set("search", state.search);
      const issuePath = "/api/issues" + (query.toString() ? "?" + query : "");
      let issues;
      try {
        issues = await requestList(issuePath, "issues", { passive: Boolean(options.background) });
      } catch (error) {
        if (pendingIssueRemovals.size) return state.issues;
        throw error;
      }
      issues = issues.filter(issue => !pendingIssueRemovals.has(issue.id));
      const changed = JSON.stringify(issues) !== JSON.stringify(state.issues);
      if (issueSessionSnapshot.size) {
        const ended = issues.filter(issue => {
          const previous = issueSessionSnapshot.get(issue.id);
          return previous && ((["claimed", "running", "scheduling"].includes(previous.activeRunStatus) && !issue.active_run_status) || (previous.replyStatus === "running" && issue.reply_status !== "running") || (issue.last_activity_finished_at && issue.last_activity_finished_at !== previous.lastActivityFinishedAt));
        });
        ended.sort((left, right) => new Date(left.updated_at).getTime() - new Date(right.updated_at).getTime()).forEach(renderSessionEndNotice);
      }
      issueSessionSnapshot = new Map(issues.map(issue => [issue.id, { activeRunStatus: issue.active_run_status || "", replyStatus: issue.reply_status || "idle", lastActivityFinishedAt: issue.last_activity_finished_at || "" }]));
      state.issues = issues;
      state.issuesLoaded = true;
      syncSessionHandoffFromHost();
      const dialog = document.getElementById("better-codex-dialog");
      const dialogIssue = dialog?.dataset.issueId ? issues.find(issue => issue.id === dialog.dataset.issueId) : null;
      if (dialog && dialogIssue && typeof dialog.__betterCodexSyncIssue === "function") dialog.__betterCodexSyncIssue(dialogIssue);
      if (options.background && !changed) return;
      if (options.background && state.surface === "agents" && state.agentPane !== "preview") return;
      render();
    }

    async function loadAgents(options = {}) {
      const agents = await requestList("/api/agents", "agents", { passive: Boolean(options.background) });
      const changed = JSON.stringify(agents) !== JSON.stringify(state.agents);
      state.agents = agents;
      if (state.surface === "agents" && state.agentPane === "detail" && !agents.some(agent => agentKey(agent) === state.selectedAgentId)) {
        state.agentPane = "preview";
        state.selectedAgentId = "";
        state.agentDraft = null;
        syncWebAgentRoute("", "replace");
      }
      if (options.preserveInspector && panel?.dataset.surface === "agents" && state.agentPane !== "preview") return;
      if (options.background && (state.agentPane !== "preview" || !changed)) return;
      render();
    }

    async function loadAutoDispatch(options = {}) {
      const result = await api("/api/settings/auto-dispatch", { passive: Boolean(options.background) });
      state.autoDispatch = result.enabled === true;
      syncAutoDispatch();
      return state.autoDispatch;
    }

    async function waitForRemoteCommand(commandId, timeoutMs = 30_000) {
      const deadline = Date.now() + timeoutMs;
      while (Date.now() < deadline) {
        const command = await api((HOST_KIND === "remote-projection" ? "/api/v1/commands/" : "/api/commands/") + encodeURIComponent(commandId));
        if (["applied", "rejected", "conflict", "expired"].includes(command.status)) return command;
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      throw new Error("remote_command_timeout");
    }

    async function loadSurface(options = {}) {
      if (state.surface === "scheduled") await loadScheduledTasks(options);
      else if (state.surface === "agents") await loadAgents(options);
      else if (state.surface === "projects") {
        if (state.projectDetailId && state.projectPage === "work") await Promise.all([loadProjects(options), loadIssues(options)]);
        else await loadProjects(options);
      }
      else await loadIssues(options);
    }

    async function load() {
      clearError();
      try {
        const bootstrap = await api("/api/bootstrap");
        applyAppearance(bootstrap.hostTheme || bootstrap.appearance);
        state.systemLocale = resolveSystemLocale(HOST_KIND === "web" ? INITIAL_LOCALE : bootstrap.locale);
        state.locale = state.languageSetting === "system" ? state.systemLocale : state.languageSetting;
        if (bootstrap.user && typeof bootstrap.user === "object") state.user = bootstrap.user;
        if (RELAY) {
          const relayUser = window.betterCodexHost?.user?.();
          const relayUsers = window.betterCodexHost?.users?.();
          if (relayUser?.id) state.user = relayUser;
          if (Array.isArray(relayUsers)) state.users = relayUsers;
        } else state.users = [state.user];
        if (HOST_KIND === "web") window.dispatchEvent(new CustomEvent("better-codex:bootstrap", { detail: { user: state.user, locale: state.locale } }));
        state.mockup = Boolean(bootstrap.mockup);
        try {
          state.agents = listResponse(bootstrap.agents, "/api/bootstrap", "agents");
        } catch (error) {
          if (!(error instanceof Error) || error.message !== "invalid_agents_response") throw error;
          state.agents = await requestList("/api/agents", "agents");
        }
        try {
          state.projects = listResponse(bootstrap.projects, "/api/bootstrap", "projects");
        } catch (error) {
          if (!(error instanceof Error) || error.message !== "invalid_projects_response") throw error;
          state.projects = await requestProjects();
        }
        state.agentModelCatalog = bootstrap.agentModelCatalog || (bootstrap.agentModels || []).map(id => ({ id, displayName: id, description: "", isDefault: false, defaultReasoningEffort: "medium", supportedReasoningEfforts: (bootstrap.agentReasoningEfforts || []).map(value => ({ value, description: "" })) }));
        state.agentModels = state.agentModelCatalog.map(model => model.id);
        state.agentReasoningEfforts = bootstrap.agentReasoningEfforts || [];
        state.autoDispatch = Boolean(bootstrap.autoDispatch);
        state.schedulerModel = bootstrap.schedulerModel || state.agentModelCatalog.find(model => model.isDefault)?.id || state.agentModels[0] || "gpt-5.6-sol";
        state.schedulerReasoningEffort = bootstrap.schedulerReasoningEffort || "high";
        const issueDescriptionLimit = Number(bootstrap.limits?.issue_description);
        if (Number.isInteger(issueDescriptionLimit) && issueDescriptionLimit > 0) state.issueDescriptionLimit = issueDescriptionLimit;
        bootstrapReady = true;
        syncAutoDispatch();
        if (state.mockup) {
          state.projectId = MOCKUP_PROJECT_ID;
        } else {
          const context = readContext();
          if (context.projectId) {
            await ensureContextProject(context);
          } else if (!state.projects.some(item => item.id === state.projectId)) {
            state.projectId = HOST_KIND === "web" ? "" : state.projects.find(item => item.id === rememberedProjectId)?.id || state.projects[0]?.id || "";
          }
        }
        await loadSurface({ preserveInspector: true });
        if (state.surface === "agents" && state.agentPane !== "preview") render();
        if (!state.mockup && HOST_KIND === "web") state.projectId = projectsByRecentActivity(state.projects)[0]?.id || "";
        if (state.projectId) localStorage.setItem(PROJECT_KEY, state.projectId);
        if (!completionNoticesRestored) {
          completionNoticesRestored = true;
          restoreCompletionNotices();
        }
        hideServiceRecovery();
      } catch (error) {
        if (needsServiceRecovery(error)) return showServiceRecovery(error);
        const board = panel?.querySelector("#better-codex-board");
        const message = error instanceof Error ? error.message : "无法连接 Better Codex Runtime";
        showError(message);
        if (board) board.innerHTML = '<div class="better-codex-empty">' + te(message + " · 点击刷新重试") + "</div>";
      }
    }

    function startAgentCreate(draft = null) {
      if (AGENTS_READ_ONLY) return;
      agentCreateFullscreen = false;
      state.agentPane = "create";
      state.selectedAgentId = "";
      state.agentDraft = draft
        ? { ...draft, avatar: draft.avatar || ("icon:" + draft.key) }
        : { avatar: "icon:bot" };
      syncWebAgentRoute("new");
      renderAgents();
      setTimeout(() => panel?.querySelector('[data-agent-form="create"] [data-agent-name]')?.focus(), 0);
    }

    function agentFormBody(form, selected) {
      return {
        name: form.elements.name?.value || selected?.name || state.agentDraft?.name || form.elements.name_en?.value || "Codex",
        name_en: form.elements.name_en?.value || selected?.name_en || state.agentDraft?.name_en || "",
        description: form.elements.description?.value || "",
        instructions: form.elements.instructions?.value || "",
        model: form.elements.model.value,
        reasoning_effort: form.elements.reasoning_effort.value,
        service_tier: form.elements.fast?.checked ? "fast" : "default",
        sandbox_mode: form.elements.sandbox_mode.value,
        max_concurrency: Number(form.elements.max_concurrency?.value || 5),
        avatar: form.elements.avatar?.value || ""
      };
    }

    function setAgentAutosaveStatus(key, stateName, message) {
      const form = panel?.querySelector('[data-agent-form][data-agent-key="' + CSS.escape(key) + '"]');
      if (!form) return;
      const status = form.querySelector(".better-codex-agent-inspector-status");
      const error = form.querySelector(".better-codex-agent-inspector-error");
      status.hidden = stateName === "error";
      status.dataset.state = stateName;
      status.textContent = stateName === "error" ? "" : t(message);
      error.hidden = stateName !== "error";
      error.textContent = stateName === "error" ? t(message) : "";
    }

    function scheduleAgentAutosave(form, immediate = false) {
      const mode = form?.dataset.agentForm;
      if (!form || mode === "create" || AGENTS_READ_ONLY) return;
      if (!form.checkValidity()) {
        agentAutosavePending = null;
        clearTimeout(agentAutosaveTimer);
        agentAutosaveTimer = null;
        return;
      }
      const key = form.dataset.agentKey;
      const selected = state.agents.find(agent => agentKey(agent) === key);
      if (!selected) return;
      agentAutosavePending = { key, mode, body: agentFormBody(form, selected) };
      setAgentAutosaveStatus(key, "saving", "正在自动保存…");
      clearTimeout(agentAutosaveTimer);
      agentAutosaveTimer = null;
      if (immediate) void flushAgentAutosave();
      else agentAutosaveTimer = setTimeout(() => { agentAutosaveTimer = null; void flushAgentAutosave(); }, 250);
    }

    async function flushAgentAutosave() {
      clearTimeout(agentAutosaveTimer);
      agentAutosaveTimer = null;
      if (agentAutosaveRunning) return agentAutosaveRunning;
      if (!agentAutosavePending) return true;
      agentAutosaveRunning = (async () => {
        let latestSaved = true;
        while (agentAutosavePending) {
          const pending = agentAutosavePending;
          agentAutosavePending = null;
          const selected = state.agents.find(agent => agentKey(agent) === pending.key);
          if (!selected) {
            latestSaved = false;
            setAgentAutosaveStatus(pending.key, "error", "保存失败");
            appendDiagnostic("agent_autosave_failed", { agent_key: pending.key, mode: pending.mode, error: "agent_not_found" });
            continue;
          }
          try {
            appendDiagnostic("agent_autosave_started", { agent_key: pending.key, mode: pending.mode, version: selected.version });
            const path = pending.mode === "default" ? "/api/agents/default" : "/api/agents/" + encodeURIComponent(selected.id);
            const saved = await api(path, { method: "PATCH", body: JSON.stringify({ ...pending.body, version: selected.version }) });
            state.agents = state.agents.map(agent => agentKey(agent) === pending.key ? saved : agent);
            latestSaved = true;
            setAgentAutosaveStatus(pending.key, "saved", "已自动保存");
            appendDiagnostic("agent_autosave_completed", { agent_key: pending.key, mode: pending.mode, version: saved.version });
          } catch (caught) {
            latestSaved = false;
            setAgentAutosaveStatus(pending.key, "error", caught instanceof Error ? caught.message : "保存失败");
            appendDiagnostic("agent_autosave_failed", { agent_key: pending.key, mode: pending.mode, error: caught instanceof Error ? caught.message : "保存失败" });
          }
        }
        return latestSaved;
      })();
      try {
        return await agentAutosaveRunning;
      } finally {
        agentAutosaveRunning = null;
      }
    }

    async function finishAgentAutosave() {
      const form = panel?.querySelector('[data-agent-form]:not([data-agent-form="create"])');
      if (form && !form.reportValidity()) return false;
      if (form && !await flushAgentAutosave()) return false;
      return true;
    }

    async function closeAgentInspectorAfterSave() {
      if (!await finishAgentAutosave()) return;
      closeAgentInspector();
    }

    function onAgentSubmit(event) {
      const form = event.target.closest("[data-agent-form]");
      if (!form) return;
      event.preventDefault();
      if (AGENTS_READ_ONLY) return;
      const mode = form.dataset.agentForm;
      if (mode !== "create") {
        scheduleAgentAutosave(form, true);
        return;
      }
      const selected = state.agents.find(agent => agentKey(agent) === form.dataset.agentKey);
      const submit = form.querySelector('[type="submit"]');
      const error = form.querySelector(".better-codex-agent-inspector-error");
      const body = { ...agentFormBody(form, selected), ...(selected ? { version: selected.version } : {}) };
      void perform(async () => {
        submit.disabled = true;
        error.hidden = true;
        try {
          const path = mode === "default" ? "/api/agents/default" : mode === "create" ? "/api/agents" : "/api/agents/" + encodeURIComponent(selected.id);
          const saved = await api(path, { method: mode === "create" ? "POST" : "PATCH", body: JSON.stringify(body) });
          state.agentPane = "detail";
          state.selectedAgentId = agentKey(saved);
          state.agentDraft = null;
          syncWebAgentRoute(state.selectedAgentId, "replace");
          await loadAgents();
        } catch (caught) {
          presentInlineError(error, caught, errorLabel(caught), { source: "agent_save", mode });
          submit.disabled = false;
        }
      });
    }

    function onAgentsClick(event) {
      if (suppressAgentOutside) return;
      if (event.target.closest("[data-agent-window-back]")) return void closeAgentInspectorAfterSave();
      if (event.target.closest("[data-agent-window-expand]")) return setAgentCreateFullscreen(!agentCreateFullscreen);
      if (event.target.closest("[data-agent-close-pane]")) return void closeAgentInspectorAfterSave();
      const row = event.target.closest(".better-codex-agent-directory [data-agent-key]");
      if (row) {
        const agent = state.agents.find(item => agentKey(item) === row.dataset.agentKey);
        if (!agent) return;
        void (async () => {
          if (!await finishAgentAutosave()) return;
          state.selectedAgentId = agentKey(agent);
          state.agentPane = "detail";
          state.agentDraft = null;
          syncWebAgentRoute(state.selectedAgentId, webAgentRoute()?.agentKey ? "replace" : "push");
          renderAgents();
        })();
        return;
      }
      if (state.agentPane !== "preview" && event.target.closest(".better-codex-agent-directory")) return void closeAgentInspectorAfterSave();
      if (AGENTS_READ_ONLY) return;
      const formAvatarButton = event.target.closest("[data-agent-avatar-form]");
      if (formAvatarButton) {
        const form = formAvatarButton.closest("form");
        if (!form) return;
        if (document.getElementById("better-codex-avatar-picker")) {
          avatarPickerClose?.();
          return;
        }
        void perform(async () => {
          const anchor = formAvatarButton.closest(".better-codex-agent-avatar-field, .better-codex-agent-profile-head") || formAvatarButton;
          const avatar = await chooseAgentAvatar(form.elements.avatar?.value || "", anchor);
          if (!avatar) return;
          form.elements.avatar.value = avatar;
          const selected = state.agents.find(agent => agentKey(agent) === form.dataset.agentKey);
          const draft = { ...(selected || state.agentDraft || {}), avatar };
          if (form.dataset.agentForm === "create") state.agentDraft = draft;
          syncAgentAvatar(formAvatarButton.querySelector(".better-codex-agent-list-avatar"), draft);
          if (form.dataset.agentForm !== "create") scheduleAgentAutosave(form, true);
        });
        return;
      }
      const option = event.target.closest("[data-agent-option]");
      if (option) {
        const picker = option.closest("[data-agent-picker]");
        const form = option.closest("form");
        const name = option.dataset.agentOption;
        const value = option.dataset.agentOptionValue;
        if (!picker || !form || !name) return;
        picker.querySelector('[name="' + name + '"]').value = value;
        picker.querySelector("[data-agent-picker-label]").textContent = name === "model" ? modelLabel(value) : name === "reasoning_effort" ? effortLabel(value) : sandboxModeLabel(value);
        picker.querySelectorAll("[data-agent-option]").forEach(row => {
          const selected = row.dataset.agentOptionValue === value;
          row.classList.toggle("is-selected", selected);
          row.setAttribute("aria-selected", String(selected));
          const check = row.querySelector(".better-codex-agent-menu-item-check");
          if (check) check.innerHTML = selected ? icon("check") : "";
        });
        picker.classList.remove("is-open");
        picker.querySelector("[data-agent-picker-toggle]").setAttribute("aria-expanded", "false");
        if (name === "model") {
          const efforts = effortsForModel(value);
          const effortPicker = form.querySelector('[data-agent-picker="reasoning_effort"]');
          const oldEffort = form.elements.reasoning_effort.value;
          const modelDefault = state.agentModelCatalog.find(item => item.id === value)?.defaultReasoningEffort;
          const nextEffort = efforts.some(item => item.value === oldEffort) ? oldEffort : modelDefault || efforts[0]?.value || "medium";
          effortPicker.outerHTML = agentPicker("reasoning_effort", t("推理"), nextEffort, efforts);
          const fastInput = form.elements.fast;
          if (fastInput) {
            const enabled = modelSupportsFast(value);
            fastInput.disabled = !enabled;
            if (!enabled) fastInput.checked = false;
            fastInput.closest(".better-codex-agent-fast-setting")?.classList.toggle("is-disabled", !enabled);
          }
        }
        scheduleAgentAutosave(form, true);
        return;
      }
      const pickerToggle = event.target.closest("[data-agent-picker-toggle]");
      if (pickerToggle) {
        const picker = pickerToggle.closest("[data-agent-picker]");
        const opening = !picker.classList.contains("is-open");
        panel.querySelectorAll(".better-codex-agent-setting.is-open").forEach(item => item.classList.remove("is-open"));
        picker.classList.toggle("is-open", opening);
        pickerToggle.setAttribute("aria-expanded", String(opening));
        return;
      }
      panel.querySelectorAll(".better-codex-agent-setting.is-open").forEach(item => {
        item.classList.remove("is-open");
        item.querySelector("[data-agent-picker-toggle]")?.setAttribute("aria-expanded", "false");
      });
      if (event.target.closest("[data-agent-create]")) return startAgentCreate();
      const templateButton = event.target.closest("[data-agent-template]");
      if (templateButton) return startAgentCreate(suggestedAgents.find(item => item.key === templateButton.dataset.agentTemplate) || null);
      const deleteButton = event.target.closest("[data-agent-delete]");
      if (deleteButton) {
        const agent = state.agents.find(item => agentKey(item) === deleteButton.dataset.agentKey);
        if (!agent || agent.is_default) return;
        void (async () => {
          if (!await finishAgentAutosave()) return;
          const current = state.agents.find(item => agentKey(item) === deleteButton.dataset.agentKey);
          if (!current) return;
          const confirmed = await confirmAction("删除智能体", '确定删除智能体 “' + agentDisplayName(current) + '” 吗？', "删除");
          if (!confirmed) return;
          await perform(async () => {
            await api("/api/agents/" + encodeURIComponent(current.id), { method: "DELETE", body: JSON.stringify({ version: current.version }) });
            state.selectedAgentId = "";
            state.agentDraft = null;
            await loadAgents({ preserveInspector: true });
            closeAgentInspector();
          });
        })();
        return;
      }
    }

    function openEditor(issue = null, initialStatus = "todo", createMode = "agent") {
      state.selected = issue;
      document.getElementById("better-codex-dialog")?.remove();
      const cachedCreateDraft = issue ? null : readCreateDraft();
      const draftMode = issue ? "manual" : createMode === "manual" ? "manual" : "agent";
      let cachedTitle = cachedCreateDraft?.title || "";
      let cachedDescription = cachedCreateDraft?.description || "";
      let cachedPrompt = cachedCreateDraft?.prompt || "";
      if (cachedCreateDraft && cachedCreateDraft.mode !== draftMode) {
        if (draftMode === "agent") {
          cachedPrompt ||= [cachedTitle, cachedDescription].filter(Boolean).join("\n\n");
        } else {
          cachedTitle ||= cachedPrompt.split(/\n/).find(line => line.trim())?.trim().slice(0, 120) || "";
          cachedDescription ||= cachedPrompt;
        }
      }
      const draft = {
        mode: draftMode,
        title: issue?.title || cachedTitle,
        description: issue?.description || cachedDescription,
        prompt: issue?.description || cachedPrompt,
        agentId: issue?.agent_id || "",
        assignee: issue ? issueAssigneeValue(issue) : draftMode === "agent" ? "codex" : "none",
        status: issue?.status || initialStatus,
        priority: issue?.priority || "none",
        runStatus: issue?.mockup_run_status || "not-started",
        labels: (issue?.labels || []).join(", "),
        projectId: issue?.project_id || state.projectId,
        expanded: localStorage.getItem(issue ? ISSUE_DIALOG_EXPANDED_KEY : CREATE_DIALOG_EXPANDED_KEY) === "true",
        descriptionExpanded: false,
        reply: issue?.reply_draft || "",
        promptSemanticReferences: cachedCreateDraft?.promptSemanticReferences || [],
        replySemanticReferences: [],
        promptSemanticDocument: createSemanticDraft(issue?.description || cachedPrompt, cachedCreateDraft?.promptSemanticDocument),
        replySemanticDocument: createSemanticDraft(issue?.reply_draft || ""),
        attachments: cachedCreateDraft?.attachments?.map(item => ({ ...item, file: null, previewUrl: "" })) || [],
        replyAttachments: Array.isArray(issue?.reply_draft_attachments) ? issue.reply_draft_attachments.map(item => ({ name: item.name, path: item.path, type: item.type || "", file: null, previewUrl: "" })) : []
      };
      const dialog = document.createElement("dialog");
      dialog.id = "better-codex-dialog";
      dialog.dataset.host = HOST_KIND;
      dialog.setAttribute(OWNED, "true");
      let projectDismiss = null;
      let selectDismiss = null;
      let conversationTimer = null;
      let conversationLoadFailures = 0;
      let conversationFailureState = "";
      let conversationFailureKey = "";
      let conversationMessages = [];
      let lastReplyMessage = "";
      let lastReplySemanticReferences = [];
      let lastReplySemanticDocument = null;
      let lastReplyCommand = "";
      let lastReplyRequestId = "";
      let lastReplyStatus = issue?.reply_status || "idle";
      let queuedReplies = [];
      let queueEditingRequestId = "";
      let queueEditDraft = "";
      let queueEditSemanticDocument = null;
      let queueActionRequestId = "";
      let queueActionError = "";
      let queueEditFocusPreserved = false;
      let replyRecoveryRequestId = "";
      let replyRecoveryTimer = null;
      let replyDraftTimer = null;
      let latestReplyDraft = draft.reply;
      let sessionId = issueSessionId(issue);
      let enrichmentLocked = issuePermissions(issue).enrichmentPending;
      let executionRunning = issuePermissions(issue).executionRunning;
      let executionLocked = issuePermissions(issue).executionLocked;
      let sessionHandoff = issuePermissions(issue).sessionHandoff;
      let completedIssue = issuePermissions(issue).executed && !executionRunning;
      let editingLocked = issuePermissions(issue).editingLocked;
      let completedIssueUpdate = Promise.resolve();
      let replyDraftUpdate = Promise.resolve();
      let retainCreateDraft = !issue;
      let createRequestId = issue ? "" : cachedCreateDraft?.requestId || globalThis.crypto?.randomUUID?.() || VERSION + "-create-" + Date.now() + "-" + Math.random().toString(36).slice(2);
      let submitInFlight = false;
      let mobileInputFrame = null;
      let dialogBoundsObserver = null;
      let semanticCatalog = null;
      let semanticMenuState = null;
      const semanticController = createSemanticController({
        request: path => api(path),
        endpoint: () => issue ? "/api/issues/" + encodeURIComponent(issue.id) + "/semantics" : "/api/projects/" + encodeURIComponent(draft.projectId) + "/semantics",
      });
      const clearIssueFullscreenBounds = () => {
        dialog.style.removeProperty("--bc-dialog-fullscreen-top");
        dialog.style.removeProperty("--bc-dialog-fullscreen-left");
        dialog.style.removeProperty("--bc-dialog-fullscreen-width");
        dialog.style.removeProperty("--bc-dialog-fullscreen-height");
      };
      const syncIssueFullscreenBounds = () => {
        const compact = HOST_KIND === "web" && window.matchMedia("(max-width: 720px)").matches;
        if (!issue || !draft.expanded || compact || !panel?.isConnected) {
          clearIssueFullscreenBounds();
          return;
        }
        const bounds = panel.getBoundingClientRect();
        dialog.style.setProperty("--bc-dialog-fullscreen-top", bounds.top + "px");
        dialog.style.setProperty("--bc-dialog-fullscreen-left", bounds.left + "px");
        dialog.style.setProperty("--bc-dialog-fullscreen-width", bounds.width + "px");
        dialog.style.setProperty("--bc-dialog-fullscreen-height", bounds.height + "px");
      };
      const mobileDialogViewport = () => {
        if (mobileInputFrame !== null) {
          cancelAnimationFrame(mobileInputFrame);
          mobileInputFrame = null;
        }
        const compact = HOST_KIND === "web" && window.matchMedia("(max-width: 720px)").matches;
        if (!compact) {
          dialog.style.removeProperty("--bc-mobile-viewport-top");
          dialog.style.removeProperty("--bc-mobile-viewport-height");
          dialog.style.removeProperty("--bc-mobile-viewport-bottom");
          dialog.style.removeProperty("--bc-mobile-layout-height");
          dialog.style.removeProperty("--bc-mobile-keyboard-translation");
          syncIssueFullscreenBounds();
          return;
        }
        const viewport = window.visualViewport;
        const viewportHeight = viewport?.height || window.innerHeight;
        const active = document.activeElement;
        const viewportTop = viewport?.offsetTop || 0;
        dialog.style.setProperty("--bc-mobile-viewport-top", viewportTop + "px");
        dialog.style.setProperty("--bc-mobile-viewport-height", viewportHeight + "px");
        dialog.style.setProperty("--bc-mobile-viewport-bottom", Math.max(0, window.innerHeight - viewportTop - viewportHeight) + "px");
        dialog.style.removeProperty("--bc-mobile-layout-height");
        dialog.style.removeProperty("--bc-mobile-keyboard-translation");
        mobileInputFrame = requestAnimationFrame(() => {
          mobileInputFrame = null;
          if (!(active instanceof HTMLElement) || !dialog.contains(active) || !active.matches("input, textarea, [contenteditable='true']")) return;
          if (issue) return;
          (active.closest(".better-codex-composer") || active).scrollIntoView({ block: "nearest", inline: "nearest" });
        });
      };
      const dirtyDraftFields = new Set();
      const dialogKind = () => issue ? "issue" : draft.mode === "agent" ? "create_agent" : "create_manual";
      const traceDialog = (event, fields = {}) => traceRendererDiagnostic(event, {
        dialog_kind: dialogKind(),
        issue_id: issue?.id || "",
        issue_identifier: issue?.identifier || "",
        ...fields,
      });

      function stopConversationPoll() {
        if (conversationTimer !== null) {
          clearTimeout(conversationTimer);
          conversationTimer = null;
        }
      }

      function stopReplyRecovery() {
        if (replyRecoveryTimer !== null) {
          clearTimeout(replyRecoveryTimer);
          replyRecoveryTimer = null;
        }
        replyRecoveryRequestId = "";
      }

      function completeReplySubmission(submittedText, submittedAttachments = []) {
        const textarea = dialog.querySelector('[name="reply"]');
        const currentText = String(textarea?.value || "").trim();
        const composerUnchanged = !textarea || currentText === submittedText;
        const composerAlreadyCleared = currentText === "" && draft.reply === "";
        if (composerUnchanged) {
          if (textarea) textarea.value = "";
          draft.reply = "";
          latestReplyDraft = "";
          draft.replySemanticReferences = [];
          draft.replySemanticDocument = createSemanticDraft("");
          closeSemanticMenu();
        }
        const submittedAttachmentSet = new Set(submittedAttachments);
        draft.replyAttachments = draft.replyAttachments.filter(item => {
          if (!submittedAttachmentSet.has(item)) return true;
          releaseAttachment(item);
          return false;
        });
        if (replyDraftTimer !== null) {
          clearTimeout(replyDraftTimer);
          replyDraftTimer = null;
        }
        persistReplyDraft(draft.reply, draft.replyAttachments);
        const attachments = dialog.querySelector("[data-reply-attachments]");
        if (attachments) attachments.outerHTML = attachmentList(draft.replyAttachments, "reply");
        updateReplySendState();
        return composerUnchanged || composerAlreadyCleared;
      }

      function recoverReply(requestId, message, submittedText, submittedAttachments, attempts = 0) {
        if (!issue || !sessionId || !dialog.isConnected || requestId !== replyRecoveryRequestId) return;
        if (attempts >= 5) {
          traceDialog("reply_recovery_unconfirmed", { request_id: requestId, attempts });
          stopReplyRecovery();
          showConversationFailure("reply_request_unconfirmed", "reply", message);
          return;
        }
        replyRecoveryTimer = setTimeout(async () => {
          replyRecoveryTimer = null;
          if (requestId !== replyRecoveryRequestId) return;
          try {
            const data = await api("/api/issues/" + encodeURIComponent(issue.id) + "/conversation");
            const reply = data?.reply || {};
            if (reply.request_id === requestId) {
              stopReplyRecovery();
              const composerCleared = completeReplySubmission(submittedText, submittedAttachments);
              traceDialog("reply_recovery_confirmed", { request_id: requestId, reply_status: reply.status || "idle", composer_cleared: composerCleared });
              applyConversation(data, { preserveBody: true });
              return;
            }
          } catch (error) {
            traceDialog("reply_recovery_probe_failed", { request_id: requestId, attempt: attempts + 1, error: String(error instanceof Error ? error.message : "request_failed").slice(0, 200) });
          }
          recoverReply(requestId, message, submittedText, submittedAttachments, attempts + 1);
        }, attempts === 0 ? 1500 : 2000);
      }

      function scheduleReplyRecovery(requestId, message, submittedText, submittedAttachments) {
        stopReplyRecovery();
        replyRecoveryRequestId = requestId;
        recoverReply(requestId, message, submittedText, submittedAttachments);
      }

      function syncDraft() {
        const form = dialog.querySelector("form");
        if (!form) return;
        const value = name => form.querySelector('[name="' + name + '"]')?.value;
        if (value("assignee") !== undefined) draft.assignee = String(value("assignee"));
        if (draft.mode === "manual") {
          if (value("title") !== undefined) draft.title = String(value("title"));
          if (value("description") !== undefined) draft.description = String(value("description"));
          if (value("status") !== undefined) draft.status = String(value("status"));
          if (value("priority") !== undefined) draft.priority = String(value("priority"));
          if (value("mockup_run_status") !== undefined) draft.runStatus = String(value("mockup_run_status"));
          if (value("labels") !== undefined) draft.labels = String(value("labels"));
          if (value("reply") !== undefined) draft.reply = String(value("reply"));
        } else {
          if (value("prompt") !== undefined) draft.prompt = String(value("prompt"));
        }
      }

      function syncDraftFromIssue() {
        if (!issue) return;
        if (!dirtyDraftFields.has("title")) draft.title = issue.title || "";
        if (!dirtyDraftFields.has("description")) draft.description = issue.description || "";
        if (!dirtyDraftFields.has("status")) draft.status = issue.status || "todo";
        if (!dirtyDraftFields.has("priority")) draft.priority = issue.priority || "none";
        if (!dirtyDraftFields.has("labels")) draft.labels = (issue.labels || []).join(", ");
        if (!dirtyDraftFields.has("assignee")) draft.assignee = issueAssigneeValue(issue);
        if (!dirtyDraftFields.has("project_id")) draft.projectId = issue.project_id || draft.projectId;
        if (!dirtyDraftFields.has("agent_id")) draft.agentId = issue.agent_id || "";
      }

      function persistCompletedIssuePatch(patch) {
        if (!issue) return;
        completedIssueUpdate = completedIssueUpdate.catch(() => {}).then(async () => {
          if (!completedIssue || executionRunning) return;
          let current = issue;
          for (let attempt = 0; attempt < 2; attempt += 1) {
            try {
              const updated = await api("/api/issues/" + encodeURIComponent(issue.id), { method: "PATCH", body: JSON.stringify({ version: current.version, ...patch }) });
              refreshIssueState(updated);
              await loadIssues();
              return;
            } catch (error) {
              if (attempt === 1 || !(error instanceof Error) || error.message !== "version_conflict") {
                showError(error);
                return;
              }
              current = await api("/api/issues/" + encodeURIComponent(issue.id));
              refreshIssueState(current);
            }
          }
        });
      }

      function replyDraftAttachmentPayload(items = draft.replyAttachments) {
        return items.filter(item => item.path).map(item => ({ name: item.name, path: item.path, type: item.type || item.file?.type || "" }));
      }

      function persistReplyDraft(value, items = draft.replyAttachments) {
        if (!issue || REMOTE && !RELAY) return;
        replyDraftUpdate = replyDraftUpdate.catch(() => {}).then(async () => {
          try {
            if (RELAY) await cacheRemoteAttachments(items);
            else await uploadPastedImages(items);
          } catch (error) {
            showError(error);
            throw error;
          }
          const attachments = replyDraftAttachmentPayload(items);
          let current = issue;
          for (let attempt = 0; attempt < 2; attempt += 1) {
            try {
              const body = { version: current.version, reply_draft: value, reply_draft_attachments: attachments };
              const updated = await api("/api/issues/" + encodeURIComponent(issue.id), { method: "PATCH", body: JSON.stringify(body) });
              refreshIssueState(updated);
              return;
            } catch (error) {
              if (attempt === 1 || !(error instanceof Error) || error.message !== "version_conflict") {
                showError(error);
                return;
              }
              current = await api("/api/issues/" + encodeURIComponent(issue.id));
              refreshIssueState(current);
            }
          }
        });
      }

      function scheduleReplyDraft(value) {
        latestReplyDraft = value;
        if (replyDraftTimer !== null) clearTimeout(replyDraftTimer);
        replyDraftTimer = setTimeout(() => {
          replyDraftTimer = null;
          persistReplyDraft(value);
        }, 300);
      }

      function flushReplyDraft() {
        if (replyDraftTimer === null) return;
        clearTimeout(replyDraftTimer);
        replyDraftTimer = null;
        persistReplyDraft(latestReplyDraft);
      }

      function updateSubmitState() {
        const submit = dialog.querySelector(".better-codex-submit");
        const startNow = dialog.querySelector("[data-dialog-start-now]");
        const content = dialog.querySelector(draft.mode === "agent" ? '[name="prompt"]' : '[name="title"]');
        const disabled = !String(content?.value || "").trim();
        const draftAgentDisabled = dirtyDraftFields.has("assignee") && (draft.assignee === "none" || draft.assignee.startsWith("user:"));
        const startBlocked = !issue || Boolean(issue.archived_at) || !issue.agent_enabled || draftAgentDisabled || Boolean(issue.active_run_status) || Boolean(sessionId) || issuePermissions(issue).enrichmentPending || issue.status === "done";
        if (submit) submit.disabled = editingLocked || disabled;
        if (startNow) startNow.disabled = editingLocked || disabled || startBlocked;
      }

      function updateReplySendState(replyStatus = issue?.reply_status || "idle") {
        const send = dialog.querySelector("[data-conversation-send]");
        const reply = dialog.querySelector('[name="reply"]');
        if (!send) return;
        const stopping = issue?.session_status === "stopping";
        const archived = Boolean(issue?.archived_at);
        const working = stopping || executionRunning || replyStatus === "running";
        const hasContent = Boolean(String(reply?.value || "").trim() || draft.replyAttachments.length);
        const mode = stopping ? "stopping" : working && !hasContent ? "stop" : working ? "queue" : "send";
        const composer = send.closest(".better-codex-composer");
        if (reply) reply.disabled = sessionHandoff || archived;
        if (composer) composer.dataset.state = mode;
        send.dataset.composerMode = mode;
        const actionLabel = t(stopping ? "正在停止…" : mode === "stop" ? "停止任务" : mode === "queue" ? "加入队列" : "发送");
        send.setAttribute("aria-label", actionLabel);
        send.title = actionLabel;
        send.innerHTML = icon(mode === "stop" || mode === "stopping" ? "stop" : "send", "", mode === "stop" || mode === "stopping" ? "2.5" : "2");
        send.disabled = stopping || sessionHandoff || archived || (mode !== "stop" && !hasContent);
        const attach = dialog.querySelector("[data-conversation-attach]");
        if (attach) attach.disabled = sessionHandoff || archived;
      }

      function applyDialogPermissions() {
        if (!dialog.isConnected) return;
        dialog.dataset.executionRunning = String(executionRunning);
        dialog.dataset.executionLocked = String(executionLocked);
        dialog.dataset.locked = String(editingLocked);
        dialog.querySelectorAll("input, textarea, select, button").forEach(control => {
          if (control.matches('[data-semantic-option][aria-disabled="true"]')) {
            control.disabled = true;
            return;
          }
          if (control.matches("[data-dialog-close], [data-dialog-expand], [data-dialog-open-thread], [data-dialog-stop], [data-dialog-restore], [data-description-toggle], [data-conversation-copy], [data-conversation-attachment]")) {
            control.disabled = false;
            return;
          }
          if (issue?.archived_at) {
            control.disabled = true;
            return;
          }
          if (enrichmentLocked) {
            control.disabled = true;
            return;
          }
          if (sessionHandoff && control.matches('[name="reply"], [data-conversation-send], [data-conversation-attach], [data-dialog-attachment-scope="reply"]')) {
            control.disabled = true;
            return;
          }
          if (executionRunning) {
            control.disabled = !control.matches('[name="reply"], [data-conversation-send], [data-conversation-attach], [data-conversation-retry], [data-dialog-attachment-scope="reply"], [data-queue-edit-input], [data-queue-send-now], [data-queue-edit], [data-queue-delete], [data-queue-edit-save], [data-queue-edit-cancel], [data-semantic-option]');
            return;
          }
          if (executionLocked) {
            control.disabled = !(control.matches('[name="reply"], [data-conversation-send], [data-conversation-attach], [data-conversation-retry], [data-dialog-attachment-scope="reply"], [data-semantic-option]') || control.closest('[data-dialog-select="status"], [data-dialog-select="priority"], [data-dialog-select="assignee"]'));
            return;
          }
          control.disabled = false;
        });
        updateSubmitState();
        updateReplySendState();
      }

      function refreshIssueState(next) {
        if (!issue || !next) return;
        const previousSessionId = sessionId;
        const previousEnrichmentLocked = enrichmentLocked;
        const previousExecutionRunning = executionRunning;
        const previousSessionHandoff = sessionHandoff;
        const previousArchivedAt = issue.archived_at;
        const previousTitle = issue.title;
        const previousDescription = issue.description;
        const previousStatus = issue.status;
        const previousPriority = issue.priority;
        const previousLabels = JSON.stringify(issue.labels || []);
        const previousAssignee = [issue.agent_enabled, issue.agent_id || "", issue.user_assigned, issue.assignee_user_id || ""].join(":");
        const previousProjectId = issue.project_id;
        Object.assign(issue, next);
        const permissions = issuePermissions(issue);
        sessionId = issueSessionId(issue);
        enrichmentLocked = permissions.enrichmentPending;
        executionRunning = permissions.executionRunning;
        executionLocked = permissions.executionLocked;
        sessionHandoff = permissions.sessionHandoff;
        completedIssue = permissions.executed && !executionRunning;
        editingLocked = permissions.editingLocked;
        state.selected = issue;
        const issueIndex = state.issues.findIndex(candidate => candidate.id === issue.id);
        if (issueIndex >= 0) state.issues[issueIndex] = issue;
        if (!dialog.isConnected) return;
        const footerPresent = Boolean(dialog.querySelector(".better-codex-dialog-footer"));
        const draftSourceChanged = previousTitle !== issue.title
          || previousDescription !== issue.description
          || previousStatus !== issue.status
          || previousPriority !== issue.priority
          || previousLabels !== JSON.stringify(issue.labels || [])
          || previousAssignee !== [issue.agent_enabled, issue.agent_id || "", issue.user_assigned, issue.assignee_user_id || ""].join(":")
          || previousProjectId !== issue.project_id;
        if (previousSessionId !== sessionId || previousEnrichmentLocked !== enrichmentLocked || previousExecutionRunning !== executionRunning || previousSessionHandoff !== sessionHandoff || previousArchivedAt !== issue.archived_at || footerPresent !== !executionLocked || draftSourceChanged) {
          syncDraft();
          syncDraftFromIssue();
          renderDialog();
          return;
        }
        syncDraftFromIssue();
        applyDialogPermissions();
        syncQueuedReplyState();
        syncConversationStatus(issue.reply_status || "idle");
      }

      function header() {
        const breadcrumbProject = state.projects.find(item => item.id === draft.projectId);
        const openThreadButton = issue && sessionId && !enrichmentLocked && HOST_CAPABILITIES.nativeThreads !== false
          ? '<button class="better-codex-dialog-open-thread" type="button" data-dialog-open-thread="' + escapeHtml(sessionId) + '" aria-label="' + te(sessionHandoff ? "前往会话" : "在会话中打开") + '">' + icon("external") + '<span>' + te(sessionHandoff ? "前往会话" : "在会话中打开") + '</span></button>'
          : "";
        const startNowButton = issue && !issue.archived_at && !sessionId && !issue.active_run_status && issue.status !== "done"
          ? '<button class="better-codex-dialog-start-now" type="button"' + (!issue.agent_enabled ? " disabled" : "") + ' data-dialog-start-now aria-label="' + te("立即开始任务") + '">' + icon("send") + '<span>' + te("立即开始任务") + '</span></button>'
          : "";
        const restoreButton = issue?.archived_at
          ? '<button class="better-codex-dialog-start-now better-codex-dialog-restore" type="button" data-dialog-restore aria-label="' + te("取消归档") + '">' + icon("archive") + '<span>' + te("取消归档") + '</span></button>'
          : "";
        const title = draft.mode === "agent" ? t("通过智能体创建") : issue ? escapeHtml(issue.identifier) : t("手动创建");
        const crumb = issue
          ? '<span class="better-codex-dialog-route-root">' + te("任务看板") + '</span><span class="better-codex-dialog-route-root-separator" aria-hidden="true">' + icon("chevron") + '</span><span data-dialog-breadcrumb-project>' + escapeHtml(projectLabel(breadcrumbProject) || t("未提供")) + '</span><span aria-hidden="true">' + icon("chevron") + '</span><strong>' + title + '</strong>'
          : '<strong>' + title + '</strong>';
        return '<div class="better-codex-dialog-head"><div class="better-codex-dialog-head-leading"><nav class="better-codex-dialog-breadcrumb" aria-label="' + te("任务看板") + '">' + crumb + '</nav></div><div class="better-codex-dialog-head-actions">' + restoreButton + openThreadButton + startNowButton + '<button class="better-codex-icon-button" type="button" data-dialog-expand aria-label="' + te(draft.expanded ? (issue ? "退出全屏" : "缩小") : "展开") + '">' + icon(draft.expanded ? "shrink" : "expand") + '</button><button class="better-codex-icon-button" type="button" data-dialog-close aria-label="' + te("关闭") + '">' + icon("close") + '</button></div></div>';
      }

      function conversationPanel() {
        if (!issue || (!sessionId && !executionRunning)) return "";
        const conversationState = issue.reply_status || "idle";
        const conversationStatus = conversationStatusMarkup(conversationState);
        const conversationBody = sessionId ? '<p class="better-codex-markdown-empty">' + te("加载对话…") + '</p>' : "";
        return '<div class="better-codex-conversation-shell"><section class="better-codex-conversation"><div class="better-codex-conversation-head"><span>' + te("对话") + '</span><span class="better-codex-conversation-status" data-conversation-status data-state="' + escapeHtml(conversationState) + '"' + (conversationStatus ? "" : " hidden") + '>' + conversationStatus + '</span></div><div class="better-codex-timeline" data-conversation-body>' + conversationBody + '</div></section><div class="better-codex-conversation-feedback" data-conversation-feedback hidden></div><div class="better-codex-composer-queue" data-conversation-queue role="list" hidden></div>' + conversationComposer() + '</div>';
      }

      function conversationStatusMarkup(replyStatus) {
        const enrichmentLocked = issuePermissions(issue).enrichmentPending;
        const latestRunStatus = issue?.latest_run_status || "";
        const executionState = issue?.status === "done" ? "completed" : issue?.status === "cancelled" ? "interrupted" : issue?.status === "blocked" ? "blocked" : (issue?.latest_scheduler_error || issue?.latest_scheduler_status === "failed") && issue?.status === "in_review" ? "scheduler-failed" : latestRunStatus === "completed" ? "completed" : latestRunStatus === "failed" ? "failed" : latestRunStatus === "interrupted" ? "interrupted" : latestRunStatus === "scheduling" ? "scheduling" : latestRunStatus === "running" ? "running" : latestRunStatus === "claimed" ? "claimed" : issue?.agent_enabled ? "not-started" : "";
        const sessionExecutionState = issue?.session_status === "stopping" ? "stopping" : issue?.session_status === "starting" ? "claimed" : ["active", "waiting_on_approval", "waiting_on_user"].includes(issue?.session_status) ? "running" : "";
        const activeExecutionState = issue?.active_run_status || (replyStatus === "running" ? "running" : sessionExecutionState);
        const replyResultState = replyStatus === "succeeded" ? "completed" : ["failed", "interrupted"].includes(replyStatus) ? replyStatus : conversationFailureState;
        const relayFailure = issue?.session_relay_error && !issue?.session_relay_connected && issue?.active_run_status === "claimed";
        const activityState = enrichmentLocked ? "thinking" : issue?.enrichment_status === "failed" ? "title-regeneration-failed" : issue?.session_status === "stopping" ? "stopping" : relayFailure ? "relay-failed" : activeExecutionState || replyResultState || executionState;
        if (!activityState) return "";
        const activityLabel = t(issue?.enrichment_status === "regenerating" ? "标题生成中" : enrichmentLocked ? "理解中" : activityState === "title-regeneration-failed" ? "标题生成失败" : activityState === "stopping" ? "正在停止…" : activityState === "relay-failed" ? "Codex 会话连接失败" : activityState === "running" ? "工作中" : activityState === "scheduling" ? "调度中" : activityState === "scheduler-failed" ? "调度失败" : activityState === "claimed" ? "排队中" : activityState === "in_review" ? "待审核" : activityState === "completed" ? "已完成" : activityState === "blocked" ? "已阻塞" : activityState === "failed" ? "执行失败" : activityState === "interrupted" ? "已停止" : activityState === "not-started" ? "未开始" : "");
        const agent = state.agents.find(item => item.id === issue?.agent_id) || state.agents.find(item => item.is_default) || { name: "Codex", is_default: true };
        const activityIcon = activityState === "scheduling"
          ? '<span class="better-codex-activity-dot better-codex-scheduler-dot" aria-hidden="true"></span>'
          : activityState === "scheduler-failed"
            ? '<span class="better-codex-activity-dot better-codex-scheduler-failed-dot" aria-hidden="true"></span>'
          : ["completed", "interrupted", "not-started"].includes(activityState)
          ? '<span class="better-codex-activity-dot" aria-hidden="true"></span>'
          : ["failed", "blocked", "relay-failed"].includes(activityState) ? icon("close") : agentAvatarMarkup(agent, "better-codex-bubble-avatar better-codex-conversation-status-avatar");
        return '<span class="better-codex-activity" data-run="' + activityState + '">' + activityIcon + '<span class="' + (enrichmentLocked || issueExecutionRunning(issue) ? "better-codex-shimmer" : "") + '">' + activityLabel + '</span></span>';
      }

      function syncConversationStatus(replyStatus) {
        const status = dialog.querySelector("[data-conversation-status]");
        if (!status) return;
        status.dataset.state = replyStatus;
        status.innerHTML = conversationStatusMarkup(replyStatus);
        status.hidden = !status.innerHTML;
      }

      function semanticToken(input) {
        const cursor = Number(input?.selectionStart);
        if (!input || !Number.isInteger(cursor)) return null;
        const before = input.value.slice(0, cursor);
        const match = before.match(/(^|\s)([/@$])([^\s]*)$/);
        if (!match) return null;
        return { trigger: match[2], query: match[3], start: cursor - match[2].length - match[3].length, end: cursor };
      }

      function semanticCommands() {
        const zh = state.locale === "zh-CN";
        const sessionCommandAvailable = Boolean(issue && sessionId && !executionRunning);
        const initialReviewAvailable = Boolean(!issue && draft.mode === "agent");
        const desktopCommandAvailable = sessionCommandAvailable && HOST_KIND !== "web";
        const sessionRequired = zh ? "需已有会话" : "Existing chat required";
        const desktopSessionRequired = zh ? "需桌面已有会话" : "Existing desktop chat required";
        return [
          { kind: "command", name: "status", label: "/status", description: zh ? "查看当前会话与智能体状态" : "Show the current session and agent status", icon: "usage", available: true, scope: zh ? "可用" : "Available" },
          { kind: "command", name: "skills", label: "/skills", description: zh ? "浏览并调用已启用的 Codex Skills" : "Browse and invoke enabled Codex Skills", icon: "wrench", available: true, scope: "$" },
          { kind: "command", name: "apps", label: "/apps", description: zh ? "浏览并调用已安装的插件与连接器" : "Browse and invoke installed plugins and connectors", icon: "server", available: true, scope: "@" },
          { kind: "command", name: "review", label: "/review", description: zh ? "审查工作区中的未提交改动" : "Review uncommitted workspace changes", icon: "review", available: initialReviewAvailable || sessionCommandAvailable, scope: initialReviewAvailable || sessionCommandAvailable ? (zh ? "可用" : "Available") : sessionRequired },
          { kind: "command", name: "compact", label: "/compact", description: zh ? "压缩当前会话上下文" : "Compact the current conversation context", icon: "sparkles", available: sessionCommandAvailable, scope: sessionCommandAvailable ? (zh ? "可用" : "Available") : sessionRequired },
          ...[
            ["approve", zh ? "批准最近一次自动审查拒绝的重试" : "Approve one retry after an automatic-review denial"],
            ["cloud", zh ? "在云端运行当前会话" : "Run the current chat in the cloud"],
            ["cloud-environment", zh ? "选择云端环境" : "Choose the cloud environment"],
            ["fast", zh ? "切换 Fast 服务层级" : "Toggle the Fast service tier"],
            ["feedback", zh ? "提交反馈：/feedback 反馈内容" : "Submit feedback: /feedback message"],
            ["fork", zh ? "复制为新的本地会话或工作树" : "Copy into a new local chat or worktree"],
            ["goal", zh ? "查看或设置持久目标：/goal [目标|clear]" : "Get or set a goal: /goal [objective|clear]"],
            ["ide-context", zh ? "切换 IDE 上下文共享" : "Toggle shared IDE context"],
            ["init", zh ? "生成 AGENTS.md 初始文件" : "Generate an AGENTS.md scaffold"],
            ["local", zh ? "在本地项目中运行会话" : "Run the chat in a local project"],
            ["mcp", zh ? "查看 MCP 服务器状态" : "View MCP server status"],
            ["memories", zh ? "配置会话记忆：/memories on|off" : "Configure memories: /memories on|off"],
            ["model", zh ? "选择当前会话模型：/model 模型名" : "Choose model: /model model-name"],
            ["pet", zh ? "唤醒或收起桌面宠物" : "Wake or tuck away the desktop pet"],
            ["personality", zh ? "响应风格：/personality friendly|pragmatic|none" : "Personality: friendly|pragmatic|none"],
            ["plan", zh ? "切换规划模式" : "Toggle plan mode"],
            ["project", zh ? "设置原生项目：/project 项目ID" : "Set native project: /project project-id"],
            ["reasoning", zh ? "推理强度：/reasoning high" : "Reasoning effort: /reasoning high"],
            ["side", zh ? "开始临时侧边会话" : "Start a temporary side chat"],
            ["task", zh ? "开始不关联项目的会话" : "Start a chat without a project"],
            ["worktree", zh ? "在新 Git 工作树中运行" : "Run in a new Git worktree"],
          ].map(([name, description]) => {
            const desktop = DESKTOP_NATIVE_COMMANDS.includes(name);
            const available = desktop ? desktopCommandAvailable : sessionCommandAvailable;
            return { kind: "command", name, label: "/" + name, description, icon: "terminal", available, scope: available ? desktop ? (zh ? "桌面" : "Desktop") : (zh ? "可用" : "Available") : desktop ? desktopSessionRequired : sessionRequired };
          }),
        ];
      }

      function semanticStatusMarkup() {
        const agent = issue
          ? state.agents.find(item => item.id === issue.agent_id)
          : state.agents.find(item => item.is_default ? draft.assignee === "codex" : item.id === draft.assignee);
        const zh = state.locale === "zh-CN";
        const rows = [
          [zh ? "会话" : "Session", issue?.session_status || (zh ? "待创建" : "New")],
          [zh ? "智能体" : "Agent", agent?.name || "Codex"],
          [zh ? "模型" : "Model", agent?.model || (zh ? "默认模型" : "Default model")],
          [zh ? "推理" : "Reasoning", agent?.reasoning_effort || (zh ? "默认" : "Default")],
        ];
        return '<div class="better-codex-semantic-status"><div class="better-codex-semantic-status-title">' + icon("usage") + '<span>' + te(zh ? "当前会话" : "Current session") + '</span></div>' + rows.map(row => '<div><span>' + escapeHtml(row[0]) + '</span><strong>' + escapeHtml(row[1]) + '</strong></div>').join("") + '</div>';
      }

      function semanticNativeResultMarkup(command, result) {
        const zh = state.locale === "zh-CN";
        const servers = command === "mcp" && Array.isArray(result?.servers) ? result.servers.slice(0, 30) : [];
        const values = Object.entries(result || {}).filter(([key, value]) => !["thread_id", "source_thread_id", "command", "response", "servers"].includes(key) && value !== undefined).slice(0, 12);
        const rows = servers.length
          ? servers.map(server => [String(server.name || "MCP"), [server.auth_status, String(server.tool_count || 0) + (zh ? " 个工具" : " tools")].filter(Boolean).join(" · ")])
          : values.length ? values.map(([key, value]) => [key.replaceAll("_", " "), typeof value === "object" ? JSON.stringify(value) : String(value)]) : [[zh ? "状态" : "Status", zh ? "已完成" : "Completed"]];
        return '<div class="better-codex-semantic-status"><div class="better-codex-semantic-status-title">' + icon("check") + '<span>' + escapeHtml("/" + command) + '</span></div>' + rows.map(row => '<div><span>' + escapeHtml(row[0]) + '</span><strong>' + escapeHtml(row[1]) + '</strong></div>').join("") + '</div>';
      }

      function semanticEditor() {
        return dialog.querySelector(!issue && draft.mode === "agent" ? '[name="prompt"]' : '[name="reply"]');
      }

      function semanticDraftReferences() {
        return !issue && draft.mode === "agent" ? draft.promptSemanticReferences : draft.replySemanticReferences;
      }

      function setSemanticDraftReferences(references) {
        if (!issue && draft.mode === "agent") draft.promptSemanticReferences = references;
        else draft.replySemanticReferences = references;
      }

      function semanticDraftDocument() {
        return !issue && draft.mode === "agent" ? draft.promptSemanticDocument : draft.replySemanticDocument;
      }

      function setSemanticDraftDocument(document) {
        if (!issue && draft.mode === "agent") draft.promptSemanticDocument = document;
        else draft.replySemanticDocument = document;
      }

      function semanticWarningText() {
        return state.locale === "zh-CN" ? "引用已变成普通文本，请重新选择" : "The reference became plain text. Select it again.";
      }

      function semanticWarningMarkup(document) {
        return '<div class="better-codex-semantic-warning" data-semantic-warning role="status"' + (document?.degraded ? "" : " hidden") + '>' + icon("permissionDanger") + '<span>' + escapeHtml(semanticWarningText()) + '</span></div>';
      }

      function syncSemanticWarning() {
        const warning = dialog.querySelector("[data-semantic-warning]");
        if (warning) warning.hidden = !semanticDraftDocument()?.degraded;
      }

      function renderSemanticMenu() {
        const menu = dialog.querySelector("[data-semantic-menu]");
        const input = semanticEditor();
        if (!menu || !input) return;
        if (!semanticMenuState) {
          menu.hidden = true;
          menu.innerHTML = "";
          input.setAttribute("aria-expanded", "false");
          return;
        }
        if (semanticMenuState.status) {
          menu.innerHTML = semanticStatusMarkup();
          menu.hidden = false;
          input.setAttribute("aria-expanded", "true");
          return;
        }
        if (semanticMenuState.nativeResult) {
          menu.innerHTML = semanticNativeResultMarkup(semanticMenuState.nativeResult.command, semanticMenuState.nativeResult.result);
          menu.hidden = false;
          input.setAttribute("aria-expanded", "true");
          return;
        }
        const items = semanticMenuState.items || [];
        if (semanticMenuState.loading && !items.length) {
          menu.innerHTML = '<div class="better-codex-semantic-empty">' + icon("refresh", "better-codex-spin") + '<span>' + te(state.locale === "zh-CN" ? "正在读取 Codex 语义…" : "Loading Codex semantics…") + '</span></div>';
        } else if (semanticMenuState.error && !items.length) {
          menu.innerHTML = '<div class="better-codex-semantic-empty is-error">' + icon("permissionDanger") + '<span>' + escapeHtml(semanticMenuState.error) + '</span></div>';
        } else if (!items.length) {
          menu.innerHTML = '<div class="better-codex-semantic-empty">' + te(state.locale === "zh-CN" ? "没有匹配项" : "No matches") + '</div>';
        } else {
          let currentGroup = "";
          menu.innerHTML = items.map((item, index) => {
            const group = item.group || "";
            const heading = group && group !== currentGroup ? '<div class="better-codex-semantic-group" role="presentation">' + escapeHtml(group) + '</div>' : "";
            currentGroup = group;
            return heading + '<button type="button" role="option" aria-selected="' + (index === semanticMenuState.index) + '" data-semantic-option="' + index + '"' + (item.available === false ? ' disabled aria-disabled="true"' : "") + '><span class="better-codex-semantic-icon">' + icon(item.icon || semanticCandidateIcon(item.kind)) + '</span><span class="better-codex-semantic-copy"><strong>' + escapeHtml(item.label) + '</strong><small>' + escapeHtml(item.description || "") + '</small></span><kbd>' + escapeHtml(item.scope || "") + '</kbd></button>';
          }).join("");
        }
        menu.hidden = false;
        input.setAttribute("aria-expanded", "true");
        menu.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: "nearest" });
      }

      function closeSemanticMenu() {
        semanticMenuState = null;
        renderSemanticMenu();
      }

      async function loadSemanticCatalog(query = "", kinds = []) {
        if (!CODEX_SEMANTICS_AVAILABLE) return semanticCatalog = { schema_version: 2, results: [], provider_errors: [{ source: "catalog", message: state.locale === "zh-CN" ? "当前 Web 视图无法读取本机 Codex 功能" : "This web view cannot read local Codex capabilities" }] };
        try {
          const data = await semanticController.search(query, kinds);
          semanticCatalog = { schema_version: 2, results: Array.isArray(data?.results) ? data.results : [], provider_errors: Array.isArray(data?.provider_errors) ? data.provider_errors : [] };
        } catch (error) {
          if (error instanceof Error && error.message === "semantic_search_cancelled") throw error;
          appendDiagnostic("semantic_catalog_unavailable", { issue_id: issue?.id || "", project_id: draft.projectId || "", error: error instanceof Error ? error.message : String(error) });
          semanticCatalog = { schema_version: 2, results: [], provider_errors: [{ source: "catalog", message: error instanceof Error ? error.message : "codex_semantics_unavailable" }] };
        }
        return semanticCatalog;
      }

      function semanticCandidateItems(trigger) {
        return (semanticCatalog?.results || []).map(candidate => ({ kind: candidate.kind, name: candidate.label, handle: candidate.handle, display: (trigger === "$" && candidate.kind === "skill" ? "$" : "@") + (candidate.display_path || candidate.label), label: candidate.label, description: candidate.detail, scope: candidate.source + (candidate.availability === "available" ? "" : " · " + candidate.availability), group: semanticCandidateGroup(candidate.kind), icon: semanticCandidateIcon(candidate.kind), available: candidate.availability === "available" && candidate.addressability === "direct" }));
      }

      function semanticCatalogError(source) {
        const error = (semanticCatalog?.provider_errors || []).find(item => item?.source === source || item?.source === "catalog");
        return error ? String(error.message || "codex_semantics_unavailable") : "";
      }

      function syncSemanticMenu() {
        const input = semanticEditor();
        const token = semanticToken(input);
        if (!token) return closeSemanticMenu();
        if (token.trigger === "/") {
          const query = token.query.toLowerCase();
          const items = semanticCommands().filter(item => !query || item.name.includes(query));
          semanticMenuState = { token, items, index: Math.min(semanticMenuState?.index || 0, Math.max(0, items.length - 1)) };
          return renderSemanticMenu();
        }
        if (token.trigger === "$") {
          semanticMenuState = { token, items: [], index: 0, loading: true, error: "" };
          renderSemanticMenu();
          void loadSemanticCatalog(token.query, ["skill"]).then(() => {
            const current = semanticToken(semanticEditor());
            if (!current || current.trigger !== "$" || current.query !== token.query) return;
            semanticMenuState = { token: current, items: semanticCandidateItems("$"), index: 0, error: semanticCatalogError("skills") };
            renderSemanticMenu();
          }).catch(() => {});
          return;
        }
        semanticMenuState = { token, items: [], index: 0, loading: true, error: "" };
        renderSemanticMenu();
        void loadSemanticCatalog(token.query).then(() => {
          const current = semanticToken(semanticEditor());
          if (!current || current.trigger !== "@" || current.query !== token.query) return;
          semanticMenuState = { token: current, items: semanticCandidateItems("@"), index: 0, error: semanticCatalogError("catalog") };
          renderSemanticMenu();
        }).catch(() => {});
      }

      function replaceSemanticToken(value) {
        const input = semanticEditor();
        const token = semanticMenuState?.token || semanticToken(input);
        if (!input || !token) return;
        input.value = input.value.slice(0, token.start) + value + input.value.slice(token.end);
        const cursor = token.start + value.length;
        input.setSelectionRange(cursor, cursor);
        if (!issue && draft.mode === "agent") {
          draft.prompt = input.value;
          updateSubmitState();
        } else {
          draft.reply = input.value;
          latestReplyDraft = input.value;
          scheduleReplyDraft(input.value);
          updateReplySendState();
        }
      }

      function selectSemanticOption(index = semanticMenuState?.index || 0) {
        const item = semanticMenuState?.items?.[index];
        if (!item || item.available === false) return;
        if (item.kind === "command") {
          if (item.name === "status") {
            replaceSemanticToken("");
            semanticMenuState = { status: true };
            renderSemanticMenu();
            return;
          }
          if (item.name === "skills") {
            replaceSemanticToken("$");
            semanticMenuState = null;
            return syncSemanticMenu();
          }
          if (item.name === "apps") {
            replaceSemanticToken("@");
            semanticMenuState = null;
            return syncSemanticMenu();
          }
          const argumentCommand = ["feedback", "memories", "model", "personality", "project", "reasoning"].includes(item.name);
          replaceSemanticToken(item.label + (argumentCommand ? " " : ""));
          closeSemanticMenu();
          return;
        }
        const input = semanticEditor();
        const activeToken = semanticMenuState?.token || semanticToken(input);
        if (!input || !activeToken || !item.handle) return;
        const document = insertSemanticReference(semanticDraftDocument(), activeToken.start, activeToken.end, item.handle, item.display);
        setSemanticDraftDocument(document);
        input.value = document.text;
        const cursor = activeToken.start + item.display.length + 1;
        input.setSelectionRange(cursor, cursor);
        if (!issue && draft.mode === "agent") draft.prompt = input.value;
        else {
          draft.reply = input.value;
          latestReplyDraft = input.value;
          scheduleReplyDraft(input.value);
        }
        closeSemanticMenu();
      }

      function handleSemanticMenuKeydown(event) {
        if (!semanticMenuState) return false;
        const items = semanticMenuState.items || [];
        if (event.key === "Escape") {
          event.preventDefault();
          closeSemanticMenu();
          return true;
        }
        if (items.length && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
          event.preventDefault();
          const offset = event.key === "ArrowDown" ? 1 : -1;
          semanticMenuState.index = (semanticMenuState.index + offset + items.length) % items.length;
          renderSemanticMenu();
          return true;
        }
        if (items.length && (event.key === "Enter" || event.key === "Tab")) {
          event.preventDefault();
          selectSemanticOption();
          return true;
        }
        return false;
      }

      function conversationComposer() {
        if (!issue || !sessionId) return "";
        const stopping = issue.session_status === "stopping";
        const archived = Boolean(issue.archived_at);
        const working = stopping || executionRunning || issue.reply_status === "running";
        const hasContent = Boolean(draft.reply.trim() || draft.replyAttachments.length);
        const mode = stopping ? "stopping" : working && !hasContent ? "stop" : working ? "queue" : "send";
        const inputDisabled = sessionHandoff || archived ? " disabled" : "";
        const actionDisabled = stopping || sessionHandoff || archived || (mode !== "stop" && !hasContent) ? " disabled" : "";
        const actionLabel = t(stopping ? "正在停止…" : mode === "stop" ? "停止任务" : mode === "queue" ? "加入队列" : "发送");
        const attachments = attachmentList(draft.replyAttachments, "reply");
        const attachButton = '<button class="better-codex-composer-attach" type="button" data-conversation-attach aria-label="' + te("添加附件") + '" title="' + te("添加附件") + '"' + inputDisabled + '>' + icon("plus", "", "1.9") + '</button>';
        return '<div class="better-codex-composer" data-state="' + mode + '">' + attachments + '<div class="better-codex-semantic-menu" id="better-codex-semantic-menu" data-semantic-menu role="listbox" hidden></div><textarea name="reply" rows="2" placeholder="' + te(archived ? "取消归档后继续对话" : sessionHandoff ? "请前往会话继续对话" : "输入下一步要求…") + '" aria-label="' + te("回复") + '" aria-autocomplete="list" aria-controls="better-codex-semantic-menu" aria-expanded="false"' + inputDisabled + '>' + escapeHtml(draft.reply) + '</textarea>' + semanticWarningMarkup(draft.replySemanticDocument) + '<div class="better-codex-composer-toolbar">' + attachButton + '<button class="better-codex-composer-send" type="button" data-conversation-send data-composer-mode="' + mode + '" aria-label="' + escapeHtml(actionLabel) + '" title="' + escapeHtml(actionLabel) + '"' + actionDisabled + '>' + icon(mode === "stop" || mode === "stopping" ? "stop" : "send", "", mode === "stop" || mode === "stopping" ? "2.5" : "2") + '</button></div></div>';
      }

      function syncQueuedReplyState() {
        const queue = dialog.querySelector("[data-conversation-queue]");
        if (!queue) return;
        const activeEditInput = queue.querySelector("[data-queue-edit-input]");
        if (queueEditingRequestId && activeEditInput === document.activeElement && !queueActionRequestId) {
          if (!queueEditFocusPreserved) {
            queueEditFocusPreserved = true;
            traceDialog("conversation_queue_edit_preserved", { request_id: queueEditingRequestId });
          }
          return;
        }
        queueEditFocusPreserved = false;
        queue.hidden = queuedReplies.length === 0;
        queue.setAttribute("aria-label", t("队列中 {{count}} 条消息").replace("{{count}}", String(queuedReplies.length)));
        queue.innerHTML = queuedReplies.length
          ? queuedReplies.map(item => {
            const requestId = String(item.request_id || "");
            const message = item.message || t("附件");
            const busy = queueActionRequestId === requestId;
            if (queueEditingRequestId === requestId) {
              return '<div class="better-codex-composer-queue-row is-editing" role="listitem" data-queue-request="' + escapeHtml(requestId) + '"><span class="better-codex-composer-queue-icon" aria-hidden="true">' + icon("queue") + '</span><span class="better-codex-composer-queue-edit-field"><textarea class="better-codex-composer-queue-edit" data-queue-edit-input rows="2" aria-label="' + te("编辑队列消息") + '">' + escapeHtml(queueEditDraft) + '</textarea><span class="better-codex-semantic-warning" data-queue-edit-warning role="status"' + (queueEditSemanticDocument?.degraded ? "" : " hidden") + '>' + icon("permissionDanger") + '<span>' + escapeHtml(semanticWarningText()) + '</span></span></span><span class="better-codex-composer-queue-actions"><button type="button" data-queue-edit-save="' + escapeHtml(requestId) + '" aria-label="' + te("保存修改") + '" title="' + te("保存修改") + '"' + (busy || !queueEditDraft.trim() ? " disabled" : "") + '>' + icon(busy ? "refresh" : "check", busy ? "better-codex-spin" : "") + '</button><button type="button" data-queue-edit-cancel aria-label="' + te("取消编辑") + '" title="' + te("取消编辑") + '"' + (busy ? " disabled" : "") + '>' + icon("close") + '</button></span></div>';
            }
            const disabled = busy || sessionHandoff || Boolean(issue?.archived_at);
            return '<div class="better-codex-composer-queue-row" role="listitem" data-queue-request="' + escapeHtml(requestId) + '" title="' + escapeHtml(message) + '"><span class="better-codex-composer-queue-icon" aria-hidden="true">' + icon("queue") + '</span><span class="better-codex-composer-queue-message">' + escapeHtml(message) + '</span><span class="better-codex-composer-queue-actions"><button type="button" data-queue-send-now="' + escapeHtml(requestId) + '" aria-label="' + te("立即发送") + '" title="' + te("立即发送") + '"' + (disabled ? " disabled" : "") + '>' + icon(busy ? "refresh" : "send", busy ? "better-codex-spin" : "") + '</button><button type="button" data-queue-edit="' + escapeHtml(requestId) + '" aria-label="' + te("编辑队列消息") + '" title="' + te("编辑队列消息") + '"' + (disabled ? " disabled" : "") + '>' + icon("edit") + '</button><button type="button" data-queue-delete="' + escapeHtml(requestId) + '" aria-label="' + te("删除队列消息") + '" title="' + te("删除队列消息") + '"' + (disabled ? " disabled" : "") + '>' + icon("trash") + '</button></span></div>';
          }).join("") + (queueActionError ? '<div class="better-codex-composer-queue-error" role="listitem">' + escapeHtml(queueActionError) + '</div>' : "")
          : "";
      }

      function queuedReplyError(error) {
        const value = String(error instanceof Error ? error.message : error || "");
        if (value === "issue_not_running") return t("当前任务已结束，消息会按队列顺序发送。");
        if (["queued_reply_not_found", "queued_reply_not_pending", "queued_reply_update_conflict"].includes(value)) return t("该队列消息已发生变化，请重新加载。");
        return t("队列操作失败，请重试。");
      }

      async function updateQueuedReply(action, requestId) {
        if (!issue || !requestId || queueActionRequestId) return;
        const message = queueEditDraft.trim();
        if (action === "update" && !message) return;
        queueActionRequestId = requestId;
        queueActionError = "";
        syncQueuedReplyState();
        try {
          const commandId = globalThis.crypto?.randomUUID?.() || VERSION + "-queue-" + Date.now() + "-" + Math.random().toString(36).slice(2);
          const path = "/api/issues/" + encodeURIComponent(issue.id) + "/queue/" + encodeURIComponent(requestId) + (action === "send" ? "/send" : "");
          const result = await api(path, { method: action === "send" ? "POST" : action === "delete" ? "DELETE" : "PATCH", body: JSON.stringify(action === "update" ? { command_id: commandId, message, input_document: serializeSemanticDraft(reconcileSemanticText(queueEditSemanticDocument || createSemanticDraft(message), message)) } : { command_id: commandId }) });
          if (result.command_id) {
            const command = await waitForRemoteCommand(result.command_id);
            if (command.status !== "applied") throw new Error(command.error || "command_rejected");
          }
          if (Array.isArray(result.queued_replies)) queuedReplies = result.queued_replies;
          else if (action === "send" || action === "delete") queuedReplies = queuedReplies.filter(item => item.request_id !== requestId);
          else queuedReplies = queuedReplies.map(item => item.request_id === requestId ? { ...item, message } : item);
          queueEditingRequestId = "";
          queueEditDraft = "";
          queueEditSemanticDocument = null;
          conversationTimer = setTimeout(() => void loadConversation({ quiet: true }), 1500);
        } catch (error) {
          reportUnexpectedError(error, { source: "conversation_queue", action, issue_id: issue.id, request_id: requestId });
          queueActionError = queuedReplyError(error);
        } finally {
          queueActionRequestId = "";
          syncQueuedReplyState();
        }
      }

      function replyFailureMessage(error, action) {
        const value = String(error instanceof Error ? error.message : error || "request_failed").toLowerCase();
        const serviceLabel = serviceFailureLabel(error);
        if (serviceLabel) return serviceLabel;
        if (action === "load") {
          if (value.includes("timeout") || value.includes("timed out") || value.includes("deadline")) return "会话加载超时。请确认 Better Codex Runtime 正在运行，然后重新加载。";
          if (["permission", "eacces", "eperm", "forbidden", "unauthorized", "401", "403", "approval"].some(marker => value.includes(marker))) return "没有权限加载会话。请调整权限后重新加载。";
          return "无法加载会话。请检查网络和 Better Codex Runtime，然后重新加载。";
        }
        if (value.includes("timeout") || value.includes("timed out") || value.includes("deadline")) return "回复等待超时。请检查模型服务连接后重试。";
        if (["reply_network_error", "apiconnectionerror", "network", "fetch", "econn", "enotfound", "dns", "socket", "relay_stream", "runtime_bridge_unavailable"].some(marker => value.includes(marker))) return "网络连接异常，回复未完成。请检查网络和 Better Codex Runtime 后重试。";
        if (["reply_permission_denied", "permission", "eacces", "eperm", "forbidden", "unauthorized", "401", "403", "approval"].some(marker => value.includes(marker))) return "当前权限不足，无法完成回复。请调整智能体权限或允许所需操作后重试。";
        if (value.includes("reply_busy")) return "上一条回复仍在进行中。请稍后重新加载。";
        return "回复未完成。请打开完整会话查看详情，然后重试。";
      }

      function showConversationFailure(error, action = "reply", message = "", context = {}) {
        const feedback = dialog.querySelector("[data-conversation-feedback]");
        if (!feedback) return;
        const failure = error instanceof Error ? error : new Error(String(error || "request_failed"));
        const reportContext = { source: "conversation", action, ...context };
        const failureKey = action + ":" + String(reportContext.origin || "") + ":" + failure.message;
        const presentation = errorPresentation(failure, reportContext);
        if (failureKey !== conversationFailureKey) reportUnexpectedError(failure, reportContext);
        conversationFailureKey = failureKey;
        conversationFailureState = "failed";
        if (message) lastReplyMessage = message;
        feedback.dataset.tone = presentation.tone;
        feedback.innerHTML = '<span>' + te(replyFailureMessage(failure, action)) + '</span><button type="button" data-conversation-retry="' + action + '">' + te(action === "load" ? "重新加载" : "重试回复") + '</button>';
        feedback.hidden = false;
        syncConversationStatus("failed");
        feedback.querySelector("[data-conversation-retry]")?.addEventListener("click", event => {
          if (event.currentTarget.dataset.conversationRetry === "load") void loadConversation();
          else {
            const retryRequestId = lastReplyStatus === "interrupted" ? "" : lastReplyRequestId;
            void sendReply(lastReplyMessage, retryRequestId, lastReplySemanticReferences, lastReplyCommand);
          }
        });
      }

      function clearConversationFailure() {
        const feedback = dialog.querySelector("[data-conversation-feedback]");
        if (!feedback) return;
        conversationFailureState = "";
        conversationFailureKey = "";
        feedback.hidden = true;
        feedback.innerHTML = "";
      }

      function relativeTime(value) {
        if (!value) return "";
        const time = Date.parse(value);
        if (!Number.isFinite(time)) return "";
        const delta = Math.max(0, Date.now() - time);
        const minute = 60 * 1000;
        const hour = 60 * minute;
        const day = 24 * hour;
        if (delta < minute) return state.locale === "zh-CN" ? "刚刚" : "Just now";
        if (delta < day * 30) {
          const unit = delta < hour ? "minute" : delta < day ? "hour" : "day";
          const amount = Math.floor(delta / (unit === "minute" ? minute : unit === "hour" ? hour : day));
          if (state.locale !== "zh-CN") return amount + " " + unit + (amount === 1 ? "" : "s") + " ago";
          return amount + (unit === "minute" ? " 分钟前" : unit === "hour" ? " 小时前" : " 天前");
        }
        return new Date(time).toLocaleDateString(state.locale);
      }

      function attachmentTypeLabel(attachment) {
        if (attachment.kind === "image") return t("图片");
        if (attachment.kind === "pdf") return t("PDF 文档");
        if (attachment.kind === "text") return t("文本文档");
        return t("文件");
      }

      function conversationAttachments(message, messageIndex) {
        if (!Array.isArray(message.attachments) || !message.attachments.length) return "";
        const items = message.attachments.map((attachment, attachmentIndex) => '<button class="better-codex-message-attachment" type="button" data-conversation-attachment="' + attachmentIndex + '" data-conversation-attachment-message="' + messageIndex + '" aria-label="' + te("打开附件") + ' ' + escapeHtml(attachment.name || t("附件")) + '"><span class="better-codex-message-attachment-icon" data-kind="' + escapeHtml(attachment.kind || "file") + '">' + icon(attachment.kind === "image" ? "image" : attachment.kind === "text" || attachment.kind === "pdf" ? "docs" : "paperclip") + '</span><span class="better-codex-message-attachment-copy"><strong>' + escapeHtml(attachment.name || t("附件")) + '</strong><small>' + escapeHtml(attachmentTypeLabel(attachment)) + '</small></span><span class="better-codex-message-attachment-open">' + icon("external") + '</span></button>').join("");
        return '<div class="better-codex-message-attachments">' + items + '</div>';
      }

      function attachmentSize(value) {
        const size = Number(value) || 0;
        if (size < 1024) return size + " B";
        if (size < 1024 * 1024) return (size / 1024).toFixed(size < 10240 ? 1 : 0) + " KB";
        return (size / 1024 / 1024).toFixed(1) + " MB";
      }

      function attachmentBlob(data, type) {
        const encoded = String(data || "").split(",", 2)[1] || "";
        const binary = atob(encoded);
        const bytes = new Uint8Array(binary.length);
        for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
        return new Blob([bytes], { type: type || "application/octet-stream" });
      }

      async function openConversationAttachment(messageIndex, attachmentIndex) {
        const message = conversationMessages[messageIndex];
        const attachment = message?.attachments?.[attachmentIndex];
        if (!attachment) return;
        document.getElementById("better-codex-attachment-dialog")?.remove();
        const preview = document.createElement("dialog");
        preview.id = "better-codex-attachment-dialog";
        preview.setAttribute(OWNED, "true");
        preview.setAttribute("aria-labelledby", "better-codex-attachment-title");
        preview.innerHTML = '<div class="better-codex-attachment-shell"><header><div><span>' + te("附件预览") + '</span><strong id="better-codex-attachment-title">' + escapeHtml(attachment.name || t("附件")) + '</strong></div><button type="button" data-attachment-close aria-label="' + te("关闭") + '">' + icon("close") + '</button></header><div class="better-codex-attachment-body" data-attachment-body><div class="better-codex-attachment-loading">' + icon("refresh") + '<span>' + te("正在加载附件…") + '</span></div></div><footer><span data-attachment-meta>' + escapeHtml(attachmentTypeLabel(attachment)) + '</span><div><a data-attachment-original hidden target="_blank" rel="noreferrer noopener">' + icon("external") + '<span>' + te("原始链接") + '</span></a><a class="is-primary" data-attachment-download download="' + escapeHtml(attachment.name || t("附件")) + '">' + icon("download") + '<span>' + te("下载附件") + '</span></a></div></footer></div>';
        document.body.appendChild(preview);
        let objectUrl = "";
        const finish = () => {
          preview.close();
          if (objectUrl) URL.revokeObjectURL(objectUrl);
          preview.remove();
        };
        preview.querySelector("[data-attachment-close]").addEventListener("click", finish);
        preview.addEventListener("cancel", event => { event.preventDefault(); finish(); });
        preview.addEventListener("click", event => event.stopPropagation());
        bindModalDismiss(preview, finish);
        preview.showModal();
        preview.querySelector("[data-attachment-close]").focus();
        const body = preview.querySelector("[data-attachment-body]");
        const download = preview.querySelector("[data-attachment-download]");
        const original = preview.querySelector("[data-attachment-original]");
        const meta = preview.querySelector("[data-attachment-meta]");
        const render = async (source, data = attachment) => {
          if (data.kind === "image") body.innerHTML = '<img src="' + escapeHtml(source) + '" alt="' + escapeHtml(data.name || t("附件")) + '">';
          else if (data.kind === "pdf") body.innerHTML = '<iframe src="' + escapeHtml(source) + '" title="' + escapeHtml(data.name || t("附件")) + '"></iframe>';
          else if (data.kind === "text") {
            const text = data.data ? await attachmentBlob(data.data, data.type).text() : "";
            body.innerHTML = text ? '<pre>' + escapeHtml(text.slice(0, 500000)) + '</pre>' : '<iframe src="' + escapeHtml(source) + '" title="' + escapeHtml(data.name || t("附件")) + '"></iframe>';
          } else body.innerHTML = '<div class="better-codex-attachment-file">' + icon("paperclip") + '<strong>' + escapeHtml(data.name || t("附件")) + '</strong><span>' + te("不支持预览此文件，可下载后查看。") + '</span></div>';
        };
        try {
          if (attachment.source === "url" && attachment.url) {
            download.href = attachment.url;
            download.target = "_blank";
            download.rel = "noreferrer noopener";
            original.href = attachment.url;
            original.hidden = false;
            await render(attachment.url);
            return;
          }
          const result = await api("/api/issues/" + encodeURIComponent(issue.id) + "/attachments/" + encodeURIComponent(message.id) + "/" + attachmentIndex, { timeoutMs: 120_000 });
          const blob = attachmentBlob(result.data, result.type);
          objectUrl = URL.createObjectURL(blob);
          download.href = objectUrl;
          download.download = result.name || attachment.name || t("附件");
          meta.textContent = attachmentTypeLabel(result) + " · " + attachmentSize(result.size);
          await render(objectUrl, result);
        } catch (error) {
          appendDiagnostic("attachment_preview_failed", { issue_id: issue.id, message_id: message.id, attachment_index: attachmentIndex, error: error instanceof Error ? error.message : String(error) });
          body.innerHTML = '<div class="better-codex-attachment-file is-error">' + icon("paperclip") + '<strong>' + te("无法打开附件") + '</strong><span>' + escapeHtml(error instanceof Error ? t(error.message) : t("无法读取文件")) + '</span></div>';
          download.hidden = true;
        }
      }

      function conversationBubbles(messages, profile = null) {
        const agent = state.agents.find(item => item.id === issue?.agent_id) || state.agents.find(item => item.is_default) || null;
        const agentName = agent ? agentDisplayName(agent) : (issue?.agent_enabled ? "Codex" : t("智能体"));
        const user = profile && profile.name ? profile : state.user || { name: t("你"), initials: t("你"), color: USER_AVATAR_COLORS[0] };
        if (profile && profile.name) state.user = { ...state.user, ...profile };
        return (messages || []).map((message, index) => {
          const isUser = message.role === "user";
          const avatar = isUser ? userAvatarMarkup(user, "better-codex-bubble-avatar") : agentAvatarMarkup(agent, "better-codex-bubble-avatar");
          const name = isUser ? (user.name || t("你")) : agentName;
          const time = relativeTime(message.timestamp);
          const content = message.html || (message.attachments?.length ? "" : renderPlainBubble(message.markdown || ""));
          return '<article class="better-codex-bubble ' + (isUser ? "is-user" : "is-agent") + '">' + avatar + '<div class="better-codex-bubble-main"><button class="better-codex-bubble-copy" type="button" data-conversation-copy="' + index + '" aria-label="' + te("复制消息") + '" title="' + te("复制消息") + '">' + icon("copy") + '</button><div class="better-codex-bubble-meta"><strong>' + escapeHtml(name) + '</strong>' + (time ? '<time datetime="' + escapeHtml(message.timestamp || "") + '">' + escapeHtml(time) + '</time>' : "") + '</div>' + (content ? '<div class="better-codex-bubble-content">' + content + '</div>' : "") + conversationAttachments(message, index) + '</div></article>';
        }).join("");
      }

      function renderPlainBubble(value) {
        return '<p>' + escapeHtml(value).replace(/\n/g, "<br>") + '</p>';
      }

      function applyConversation(data, options = {}) {
        const body = dialog.querySelector("[data-conversation-body]");
        const status = dialog.querySelector("[data-conversation-status]");
        const send = dialog.querySelector("[data-conversation-send]");
        if (!body || !status) return;
        if (!RELAY && data?.user && typeof data.user === "object") state.user = { ...state.user, ...data.user };
        const nextQueuedReplies = Array.isArray(data?.queued_replies) ? data.queued_replies : Array.isArray(data?.reply?.queued_replies) ? data.reply.queued_replies : null;
        if (nextQueuedReplies && !queueActionRequestId) queuedReplies = nextQueuedReplies;
        syncQueuedReplyState();
        const messages = Array.isArray(data?.messages) ? data.messages : [];
        const previousScrollTop = body.scrollTop;
        const stickToBottom = body.scrollHeight - body.scrollTop - body.clientHeight < 48;
        if (messages.length) {
          conversationMessages = messages;
          body.innerHTML = conversationBubbles(messages, RELAY ? state.user : data.user);
          body.scrollTop = stickToBottom ? body.scrollHeight : previousScrollTop;
        } else if (data?.html) {
          conversationMessages = [{ role: "agent", html: data.html, markdown: data.markdown || "", timestamp: null }];
          body.innerHTML = conversationBubbles(conversationMessages, RELAY ? state.user : data.user);
          body.scrollTop = stickToBottom ? body.scrollHeight : previousScrollTop;
        } else if (!options.preserveBody) {
          conversationMessages = [];
          body.innerHTML = sessionId
            ? sessionHandoff
              ? '<div class="better-codex-conversation-empty"><h3>' + te("开始对话") + '</h3><p>' + te("请前往会话继续对话") + '</p></div>'
              : executionRunning
              ? '<div class="better-codex-conversation-empty"><h3>' + te("正在处理任务") + '</h3><p>' + te("智能体回复产生后会显示在这里。") + '</p><span>' + te("请稍候") + '</span></div>'
              : '<div class="better-codex-conversation-empty"><h3>' + te("开始对话") + '</h3><p>' + te("补充下一步要求，智能体会继续处理。") + '</p><span>' + te("在下方输入消息并发送") + '</span></div>'
            : '<p class="better-codex-markdown-empty">' + te("未关联对话。") + '</p>';
        }
        const reply = data?.reply || { status: "idle" };
        if (reply.message) lastReplyMessage = reply.message;
        if (reply.request_id) lastReplyRequestId = reply.request_id;
        const stateName = reply.status || "idle";
        lastReplyStatus = stateName;
        const expectedInterruption = stateName === "interrupted" && ["user_stopped", "session_interrupted"].includes(String(reply.error || ""));
        if (!sessionHandoff && (stateName === "failed" || (stateName === "interrupted" && !expectedInterruption))) showConversationFailure(reply.error, "reply", reply.message, { origin: "turn" });
        else {
          clearConversationFailure();
          syncConversationStatus(stateName);
        }
        if (send) updateReplySendState(stateName);
        stopConversationPoll();
        if (stateName === "running" || executionRunning) conversationTimer = setTimeout(() => void loadConversation({ quiet: true }), 2000);
        else if (stateName === "succeeded" && !options.afterSuccess) conversationTimer = setTimeout(() => void loadConversation({ quiet: true, afterSuccess: true }), 1200);
      }

      async function loadConversation(options = {}) {
        if (!issue || !sessionId || !dialog.isConnected) return;
        try {
          const data = await api("/api/issues/" + encodeURIComponent(issue.id) + "/conversation");
          conversationLoadFailures = 0;
          if (data?.issue && Number(data.issue.version) !== Number(issue.version)) await loadIssues({ background: true }).catch(() => {});
          applyConversation(data, options);
        } catch (error) {
          conversationLoadFailures += 1;
          if (options.quiet && conversationLoadFailures < 2) {
            conversationTimer = setTimeout(() => void loadConversation({ quiet: true }), 2500);
            return;
          }
          showConversationFailure(error, "load");
        }
      }

      async function waitForNativeCommand(requestId) {
        const deadline = Date.now() + 30000;
        while (Date.now() < deadline) {
          const command = await api("/api/issues/" + encodeURIComponent(issue.id) + "/native-command/" + encodeURIComponent(requestId));
          if (command.status === "completed") return command.result || {};
          if (command.status === "failed" || command.status === "cancelled") throw new Error(command.error || "native_command_failed");
          await new Promise(resolve => setTimeout(resolve, 300));
        }
        throw new Error("native_command_timeout");
      }

      async function executeSessionNativeCommand(command, argument, requestId) {
        traceDialog("native_command_requested", { request_id: requestId, command, argument_length: argument.length });
        const queued = await api("/api/issues/" + encodeURIComponent(issue.id) + "/native-command", { method: "POST", body: JSON.stringify({ request_id: requestId, command, argument }) });
        const result = queued.status === "completed" ? queued.result || {} : await waitForNativeCommand(requestId);
        traceDialog("native_command_completed", { request_id: requestId, command });
        return result;
      }

      function visibleNativeComposer() {
        const candidates = Array.from(document.querySelectorAll('textarea,[contenteditable="true"]'));
        return candidates.find(element => {
          if (element.closest("[" + OWNED + "]")) return false;
          const rect = element.getBoundingClientRect();
          return rect.width > 40 && rect.height > 20 && getComputedStyle(element).visibility !== "hidden";
        }) || null;
      }

      async function executeDesktopNativeCommand(command) {
        if (HOST_KIND === "web") throw new Error("native_desktop_command_unavailable");
        const original = command;
        const nativeCommand = command === "task" ? "chat" : command;
        traceDialog("native_desktop_command_requested", { command: original, native_command: nativeCommand, thread_id: sessionId });
        dialog.close();
        await openThread(sessionId);
        const deadline = Date.now() + 5000;
        let composer = visibleNativeComposer();
        while (!composer && Date.now() < deadline) {
          await new Promise(resolve => setTimeout(resolve, 100));
          composer = visibleNativeComposer();
        }
        if (!composer) throw new Error("native_desktop_composer_not_found");
        const value = "/" + nativeCommand;
        composer.focus();
        if (composer instanceof HTMLTextAreaElement) {
          const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set;
          if (!setter) throw new Error("native_desktop_composer_invalid");
          setter.call(composer, value);
        } else {
          composer.textContent = value;
        }
        composer.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: value }));
        composer.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", code: "Enter", bubbles: true, cancelable: true }));
        composer.dispatchEvent(new KeyboardEvent("keyup", { key: "Enter", code: "Enter", bubbles: true, cancelable: true }));
        await new Promise(resolve => setTimeout(resolve, 400));
        const remaining = composer instanceof HTMLTextAreaElement ? composer.value : composer.textContent;
        if (remaining === value) throw new Error("native_desktop_command_not_accepted");
      }

      async function sendReply(retryMessage = "", retryRequestId = "", retrySemanticReferences = null, retryCommand = "", retrySemanticDocument = lastReplySemanticDocument) {
        const textarea = dialog.querySelector('[name="reply"]');
        const send = dialog.querySelector("[data-conversation-send]");
        const errorOutput = dialog.querySelector(".better-codex-dialog-error");
        const retrying = Boolean(retryMessage);
        const text = String(retryMessage || textarea?.value || "").trim();
        const slashMatch = /^\/([a-z][a-z-]*)(?:\s+([\s\S]*))?$/.exec(text);
        const slashCommand = slashMatch?.[1] || "";
        const slashArgument = String(slashMatch?.[2] || "").trim();
        const semanticCommand = retryCommand || (["review", "compact"].includes(slashCommand) ? slashCommand : "");
        const semanticReferences = retrying ? (retrySemanticReferences || []) : draft.replySemanticReferences.filter(reference => text.includes((reference.type === "skill" ? "$" : "@") + reference.name));
        const semanticDocument = retrySemanticDocument || reconcileSemanticText(draft.replySemanticDocument, text);
        const requestId = retryRequestId || (globalThis.crypto?.randomUUID?.() || VERSION + "-reply-" + Date.now() + "-" + Math.random().toString(36).slice(2));
        if (sessionHandoff || !issue || !sessionId || (!text && !draft.replyAttachments.length) || !send || !errorOutput) return;
        if (!retrying && slashCommand === "status") {
          if (textarea) textarea.value = "";
          draft.reply = "";
          latestReplyDraft = "";
          draft.replySemanticReferences = [];
          semanticMenuState = { status: true };
          renderSemanticMenu();
          persistReplyDraft("");
          updateReplySendState();
          return;
        }
        if (!retrying && (slashCommand === "skills" || slashCommand === "apps")) {
          if (textarea) {
            textarea.value = slashCommand === "skills" ? "$" : "@";
            textarea.setSelectionRange(1, 1);
          }
          draft.reply = textarea?.value || "";
          latestReplyDraft = draft.reply;
          scheduleReplyDraft(draft.reply);
          syncSemanticMenu();
          updateReplySendState();
          return;
        }
        if (!retrying && DESKTOP_NATIVE_COMMANDS.includes(slashCommand)) {
          send.disabled = true;
          errorOutput.hidden = true;
          try {
            await executeDesktopNativeCommand(slashCommand);
          } catch (error) {
            if (dialog.isConnected) {
              presentInlineError(errorOutput, error, errorLabel(error), { source: "native_desktop_command", command: slashCommand });
              send.disabled = false;
            }
          }
          return;
        }
        if (!retrying && SESSION_NATIVE_COMMANDS.includes(slashCommand)) {
          send.disabled = true;
          errorOutput.hidden = true;
          clearConversationFailure();
          try {
            const result = await executeSessionNativeCommand(slashCommand, slashArgument, requestId);
            completeReplySubmission(text, []);
            semanticMenuState = { nativeResult: { command: slashCommand, result } };
            renderSemanticMenu();
            await loadIssues({ background: true });
            if (result.rebind_thread) await loadConversation({ quiet: true });
          } catch (error) {
            traceDialog("native_command_failed", { request_id: requestId, command: slashCommand, error: String(error instanceof Error ? error.message : "native_command_failed").slice(0, 200) });
            presentInlineError(errorOutput, error, errorLabel(error), { source: "native_command", command: slashCommand, request_id: requestId });
            send.disabled = false;
          }
          return;
        }
        stopReplyRecovery();
        send.disabled = true;
        errorOutput.hidden = true;
        clearConversationFailure();
        let message = text;
        let files = [];
        if (REMOTE || !retrying) {
          try {
            if (REMOTE) {
              files = await remoteFiles(draft.replyAttachments.filter(item => item.file));
              message = withAttachments(text, draft.replyAttachments.filter(item => item.path));
            }
            else {
              await uploadPastedImages(draft.replyAttachments);
              message = withAttachments(text, draft.replyAttachments);
            }
          } catch (error) {
            presentInlineError(errorOutput, error, t(error instanceof Error ? error.message : "图片保存失败"), { source: "attachment_prepare", action: "reply", report: false });
            send.disabled = false;
            return;
          }
        }
        const submittedAttachments = draft.replyAttachments.slice();
        const submittedSemanticDocument = reconcileSemanticText(semanticDocument, message);
        let reply;
        try {
          lastReplyStatus = "running";
          lastReplySemanticReferences = semanticReferences.map(reference => ({ ...reference }));
          lastReplySemanticDocument = submittedSemanticDocument;
          lastReplyCommand = semanticCommand;
          reply = await api("/api/issues/" + encodeURIComponent(issue.id) + "/reply", { method: "POST", body: JSON.stringify({ message, input_document: serializeSemanticDraft(submittedSemanticDocument), request_id: requestId, files, command: semanticCommand }), timeoutMs: files.length ? 120_000 : undefined });
        } catch (error) {
          lastReplyRequestId = requestId;
          const outcomeUncertain = !Number(error?.betterCodexDiagnostics?.http_status);
          const composerCleared = outcomeUncertain ? completeReplySubmission(text, submittedAttachments) : false;
          traceDialog("reply_submit_unconfirmed", { request_id: requestId, outcome_uncertain: outcomeUncertain, composer_cleared: composerCleared, error: String(error instanceof Error ? error.message : "request_failed").slice(0, 200) });
          showConversationFailure(error, "reply", message);
          scheduleReplyRecovery(requestId, message, text, submittedAttachments);
          send.disabled = false;
          return;
        }
        lastReplyRequestId = reply.request_id || requestId;
        stopReplyRecovery();
        const composerCleared = completeReplySubmission(text, submittedAttachments);
        traceDialog("reply_submit_confirmed", { request_id: lastReplyRequestId, initial_run: Boolean(reply.initial_run), composer_cleared: composerCleared });
        if (reply.initial_run) {
          try {
            await loadIssues();
            dialog.close();
          } catch (error) {
            reportGlobalError(error, { source: "reply_refresh", action: "initial_run", request_id: lastReplyRequestId });
            showError(error);
          }
          return;
        }
        await loadIssues().catch(error => reportGlobalError(error, { source: "reply_refresh", action: "conversation", request_id: lastReplyRequestId }));
        applyConversation({ found: true, reply }, { preserveBody: true });
        conversationTimer = setTimeout(() => void loadConversation({ quiet: true }), 1500);
      }

      async function stopIssueFromDialog(button) {
        if (!issue || !button || button.disabled) return;
        const errorOutput = dialog.querySelector(".better-codex-dialog-error");
        button.disabled = true;
        button.dataset.composerMode = "stopping";
        button.setAttribute("aria-busy", "true");
        button.setAttribute("aria-label", t("正在停止…"));
        button.title = t("正在停止…");
        button.closest(".better-codex-composer")?.setAttribute("data-state", "stopping");
        try {
          const updated = await stopIssueSession(issue.id);
          refreshIssueState(updated);
        } catch (error) {
          if (errorOutput) {
            presentInlineError(errorOutput, error, errorLabel(error), { source: "issue_stop" });
          } else {
            reportUnexpectedError(error, { source: "issue_stop" });
          }
          if (button.isConnected) {
            button.disabled = false;
            button.dataset.composerMode = "stop";
            button.removeAttribute("aria-busy");
            button.setAttribute("aria-label", t("停止任务"));
            button.title = t("停止任务");
            button.closest(".better-codex-composer")?.setAttribute("data-state", "stop");
          }
        }
      }

      async function restoreIssueFromDialog(button) {
        if (!issue?.archived_at || !button || button.disabled) return;
        const errorOutput = dialog.querySelector(".better-codex-dialog-error");
        button.disabled = true;
        button.setAttribute("aria-busy", "true");
        try {
          let current = issue;
          for (let attempt = 0; attempt < 2; attempt += 1) {
            try {
              let updated = await api("/api/issues/" + encodeURIComponent(issue.id) + "/unarchive", { method: "POST", body: JSON.stringify({ version: Number(current.version) }) });
              const commandId = updated?.remote_state?.command_id;
              if (commandId) {
                const command = await waitForRemoteCommand(commandId);
                if (command.status !== "applied") throw new Error(command.error || "command_rejected");
                updated = await api("/api/issues/" + encodeURIComponent(issue.id));
              }
              refreshIssueState(updated);
              await Promise.all([loadIssues({ background: true }), loadProjects({ background: true })]);
              dialog.querySelector('[name="reply"]')?.focus();
              return;
            } catch (error) {
              if (attempt === 1 || !(error instanceof Error) || error.message !== "version_conflict") throw error;
              current = await api("/api/issues/" + encodeURIComponent(issue.id));
              refreshIssueState(current);
            }
          }
        } catch (error) {
          if (errorOutput) {
            presentInlineError(errorOutput, error, errorLabel(error), { source: "issue_restore" });
          } else {
            reportUnexpectedError(error, { source: "issue_restore" });
          }
          if (button.isConnected) {
            button.disabled = false;
            button.removeAttribute("aria-busy");
          }
        }
      }

      function projectPicker() {
        const selectedProject = state.projects.find(item => item.id === draft.projectId);
        const options = projectsByRecentActivity(state.projects).map(item => '<button class="better-codex-project-option" type="button" data-dialog-project-option="' + escapeHtml(item.id) + '">' + icon("folder") + '<span>' + escapeHtml(projectLabel(item)) + '</span><span class="better-codex-project-check">' + (item.id === draft.projectId ? icon("check") : "") + '</span></button>').join("");
        return '<span class="better-codex-project-picker"><button class="better-codex-property" type="button" data-dialog-project>' + icon("folder") + '<span data-project-label>' + escapeHtml(projectLabel(selectedProject) || t("选择项目")) + '</span>' + icon("chevron") + '</button><span class="better-codex-project-menu" hidden><input class="better-codex-project-search" type="search" placeholder="' + te("搜索项目...") + '" aria-label="' + te("搜索项目") + '"><span data-project-options>' + (options || '<span class="better-codex-project-empty">' + te("暂无项目") + '</span>') + '</span></span></span>';
      }

      function labelPicker() {
        const selected = draft.labels.split(/[,，]/).map(value => value.trim()).filter(Boolean);
        const options = [...new Set([...state.issues.flatMap(item => Array.isArray(item.labels) ? item.labels : []), ...selected])].sort((left, right) => String(left).localeCompare(String(right), state.locale));
        const rows = options.map(value => '<button class="better-codex-dialog-select-option' + (selected.includes(value) ? " is-selected" : "") + '" type="button" role="option" aria-selected="' + selected.includes(value) + '" data-dialog-label-option="' + escapeHtml(value) + '"><span class="better-codex-dialog-select-option-visual">' + icon("tag") + '</span><span>' + escapeHtml(value) + '</span><span class="better-codex-dialog-select-check">' + (selected.includes(value) ? icon("check") : "") + '</span></button>').join("");
        return '<span class="better-codex-label-picker" data-dialog-label-picker><button class="better-codex-property better-codex-label-trigger" type="button" aria-label="' + te("标签") + '" aria-haspopup="listbox" aria-expanded="false" data-dialog-label-toggle>' + icon("tag") + '</button><span class="better-codex-label-menu"><label class="better-codex-property better-codex-label-property">' + icon("tag") + '<input name="labels" value="' + escapeHtml(draft.labels) + '" placeholder="' + te("添加标签") + '" aria-label="' + te("标签") + '"></label><span class="better-codex-label-options" role="listbox" aria-multiselectable="true">' + (rows || '<span class="better-codex-project-empty">' + te("暂无可选项") + '</span>') + '</span></span></span>';
      }

      function dialogSelect(name, ariaLabel, selected, options, modifier = "") {
        const current = options.find(option => option.value === selected) || options[0] || { value: "", label: t("未提供"), visual: "" };
        const visual = option => typeof option.visual === "function" ? option.visual() : option.visual || "";
        const tagMarkup = option => (option.tags || []).map(tag => '<span class="better-codex-dialog-select-tag" data-tone="' + escapeHtml(tag.tone || "model") + '">' + escapeHtml(tag.value) + (tag.fast ? fastMark() : "") + '</span>').join("");
        const labelMarkup = option => escapeHtml(option.label) + tagMarkup(option);
        const rows = options.map(option => '<button class="better-codex-dialog-select-option' + (option.value === current.value ? " is-selected" : "") + '" type="button" role="option" aria-selected="' + (option.value === current.value) + '" data-dialog-select-option="' + escapeHtml(name) + '" data-dialog-select-value="' + escapeHtml(option.value) + '"><span class="better-codex-dialog-select-option-visual">' + visual(option) + '</span><span>' + labelMarkup(option) + '</span><span class="better-codex-dialog-select-check">' + (option.value === current.value ? icon("check") : "") + '</span></button>').join("");
        return '<span class="better-codex-dialog-select ' + escapeHtml(modifier) + '" data-dialog-select="' + escapeHtml(name) + '"><input type="hidden" name="' + escapeHtml(name) + '" value="' + escapeHtml(current.value) + '"><button class="better-codex-property better-codex-dialog-select-trigger" type="button" role="combobox" aria-label="' + escapeHtml(ariaLabel) + '" aria-haspopup="listbox" aria-expanded="false" data-dialog-select-toggle="' + escapeHtml(name) + '"><span class="better-codex-dialog-select-trigger-visual">' + visual(current) + '</span><span class="better-codex-dialog-select-label" data-dialog-select-label>' + labelMarkup(current) + '</span>' + icon("chevron") + '</button><span class="better-codex-dialog-select-menu" role="listbox" hidden>' + rows + '</span></span>';
      }

      function assigneePicker() {
        const defaultAgent = state.agents.find(agent => agent.is_default) || { name: "Codex", is_default: true, id: "" };
        const assignedUser = issue?.user_assigned ? issueUserProfile(issue) : null;
        const assignedUserValue = assignedUser ? "user:" + String(assignedUser.id || "default") : "";
        const userOptions = [
          ...state.users.filter(user => !user.disabled).map(user => ({ value: "user:" + String(user.id), label: user.name || user.handle || t("协作者"), visual: () => userAvatarMarkup(user, "better-codex-agent-avatar") })),
          ...(assignedUserValue && !state.users.some(user => "user:" + String(user.id) === assignedUserValue && !user.disabled) ? [{ value: assignedUserValue, label: assignedUser.name || t("已停用用户"), visual: () => userAvatarMarkup(assignedUser, "better-codex-agent-avatar") }] : [])
        ];
        const options = [
          { value: "none", label: t("未指派"), visual: () => icon("user") },
          ...userOptions,
          { value: "codex", label: agentOptionLabel(defaultAgent, defaultAgent.name || "Codex"), tags: agentConfigTags(defaultAgent), visual: () => agentAvatarMarkup(defaultAgent, "better-codex-agent-avatar") },
          ...state.agents.filter(agent => !agent.is_default).map(agent => ({
            value: agent.id,
            label: agentOptionLabel(agent, agent.name),
            tags: agentConfigTags(agent),
            visual: () => agentAvatarMarkup(agent, "better-codex-agent-avatar")
          }))
        ];
        return '<div class="better-codex-agent-picker"><span>' + te("指派给") + '</span>' + dialogSelect("assignee", t("选择责任人"), draft.assignee || "none", options, "is-assignee") + '</div>';
      }

      function propertyRows() {
        const projectChip = projectPicker();
        if (draft.mode === "agent") return '<div class="better-codex-dialog-properties">' + projectChip + '</div>';
        const statuses = Object.entries(statusLabels).map(([value, text]) => ({ value, label: t(text), visual: statusIcon(value) }));
        const priorities = Object.entries(priorityLabels).map(([value, text]) => ({ value, label: t(value === "none" ? "无优先级" : text + "优先级"), visual: priorityIcon(value) }));
        return '<div class="better-codex-dialog-properties">' + dialogSelect("status", t("状态"), draft.status, statuses) + dialogSelect("priority", t("优先级"), draft.priority, priorities) + labelPicker() + projectChip + '</div>';
      }

      function attachmentPaths(items = draft.attachments) {
        return items.map(item => item.path).filter(Boolean);
      }

      function releaseAttachment(item) {
        if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
      }

      function fileDataUrl(file) {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("无法读取文件"));
          reader.onerror = () => reject(new Error("无法读取文件"));
          reader.readAsDataURL(file);
        });
      }

      async function remoteFiles(items) {
        return Promise.all(items.map(async item => ({ name: item.name, type: item.file.type || "application/octet-stream", data: await fileDataUrl(item.file) })));
      }

      async function cacheRemoteAttachments(items) {
        const pending = items.filter(item => item.file && !item.path);
        if (!pending.length) return;
        const files = await remoteFiles(pending);
        const result = await api("/api/issues/attachments", { method: "POST", body: JSON.stringify({ files }), timeoutMs: 120_000 });
        if (!Array.isArray(result.attachments) || result.attachments.length !== pending.length) throw new Error("attachment_cache_invalid");
        pending.forEach((item, index) => {
          const saved = result.attachments[index];
          if (!saved || typeof saved.path !== "string" || !saved.path) throw new Error("attachment_cache_invalid");
          item.name = saved.name || item.name;
          item.path = saved.path;
          item.type = saved.type || item.type || item.file?.type || "";
          item.file = null;
        });
      }

      async function uploadPastedImages(items = draft.attachments) {
        for (const item of items) {
          if (!item.file || item.path) continue;
          const data = await fileDataUrl(item.file);
          let saved;
          try {
            saved = await api("/api/issues/attachments", { method: "POST", body: JSON.stringify({ data }) });
          } catch (error) {
            if (error instanceof Error && ["invalid_image_attachment", "body_too_large"].includes(error.message)) throw new Error("图片保存失败");
            throw error;
          }
          item.path = saved.path;
          item.file = null;
        }
      }

      function withAttachments(text, items = draft.attachments) {
        const paths = attachmentPaths(items);
        if (!paths.length) return text;
        const block = t("附带文件：") + "\n" + paths.map(path => "- " + path).join("\n");
        return text ? text + "\n\n" + block : block;
      }

      function attachmentList(items = draft.attachments, scope = "issue") {
        const marker = scope === "reply" ? " data-reply-attachments" : " data-dialog-attachments";
        if (!items.length) return '<div class="better-codex-dialog-attachments"' + marker + ' hidden></div>';
        const chips = items.map((item, index) => {
          const image = Boolean(item.previewUrl || String(item.type || item.file?.type || "").startsWith("image/"));
          return '<span class="better-codex-attachment-chip' + (image ? ' is-image' : '') + '" title="' + escapeHtml(item.path || item.name) + '">' + (item.previewUrl ? '<img class="better-codex-attachment-preview" src="' + escapeHtml(item.previewUrl) + '" alt="" width="30" height="30">' : icon(image ? "image" : "paperclip")) + '<span>' + escapeHtml(item.name) + '</span><button type="button" data-dialog-detach="' + index + '" data-dialog-attachment-scope="' + scope + '" aria-label="' + te("移除附件") + '">' + icon("close") + '</button></span>';
        }).join("");
        return '<div class="better-codex-dialog-attachments"' + marker + '>' + chips + '</div>';
      }

      async function pasteImages(event) {
        const replyPaste = event.target?.matches?.('[name="reply"]');
        if (editingLocked && !replyPaste) return;
        const files = Array.from(event.clipboardData?.items || []).flatMap(item => item.kind === "file" && item.type.startsWith("image/") ? [item.getAsFile()].filter(Boolean) : []);
        if (!files.length) return;
        const activeName = event.target?.getAttribute("name") || "";
        const selectionStart = event.target?.selectionStart;
        const selectionEnd = event.target?.selectionEnd;
        event.preventDefault();
        const attachments = replyPaste ? draft.replyAttachments : draft.attachments;
        let totalSize = attachments.reduce((size, item) => size + (item.file?.size || 0), 0);
        let acceptedCount = 0;
        const accepted = files.filter(file => {
          if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) return false;
          if (file.size > 10 * 1024 * 1024) return false;
          if (REMOTE && (attachments.length + acceptedCount >= 4 || totalSize + file.size > 20 * 1024 * 1024)) return false;
          totalSize += file.size;
          acceptedCount += 1;
          return true;
        });
        if (!accepted.length) {
          const errorOutput = dialog.querySelector(".better-codex-dialog-error");
          if (errorOutput) {
            const message = REMOTE && attachments.length >= 4 ? "最多传输 4 个文件且总大小不能超过 20 MB" : files.some(file => file.size > 10 * 1024 * 1024) ? "图片不能超过 10 MB" : "请选择 PNG、JPEG 或 WebP 图片";
            presentInlineError(errorOutput, new Error(message), t(message), { source: "attachment_paste", action: replyPaste ? "reply" : issue ? "edit" : "create", report: false });
          }
          return;
        }
        syncDraft();
        const next = accepted.map((file, index) => ({
          name: file.name || t("粘贴的图片") + (accepted.length > 1 ? " " + (index + 1) : ""),
          path: "",
          file,
          type: file.type,
          previewUrl: URL.createObjectURL(file)
        }));
        try {
          if (RELAY) await cacheRemoteAttachments(next);
          else if (!REMOTE) await uploadPastedImages(next);
        } catch (error) {
          next.forEach(releaseAttachment);
          const errorOutput = dialog.querySelector(".better-codex-dialog-error");
          if (errorOutput) presentInlineError(errorOutput, error, t(error instanceof Error ? error.message : "图片保存失败"), { source: "attachment_cache", action: replyPaste ? "reply" : issue ? "edit" : "create", report: false });
          return;
        }
        attachments.push(...next);
        if (replyPaste) scheduleReplyDraft(draft.reply);
        else if (!issue) writeCreateDraft(draft, createRequestId);
        renderDialog();
        const active = activeName ? dialog.querySelector('[name="' + activeName + '"]') : null;
        active?.focus();
        if (active?.setSelectionRange && Number.isInteger(selectionStart) && Number.isInteger(selectionEnd)) active.setSelectionRange(selectionStart, selectionEnd);
      }

      function pickAttachments(existing = []) {
        return new Promise(resolve => {
          const input = document.createElement("input");
          input.type = "file";
          input.accept = "*/*";
          input.multiple = true;
          input.addEventListener("change", () => {
            const files = Array.from(input.files || []);
            const selected = [];
            let skipped = 0;
            let totalSize = existing.reduce((size, item) => size + (item.file?.size || 0), 0);
            for (const file of files) {
              const path = String(file.path || "").trim();
              if (!path && !REMOTE) {
                skipped += 1;
                continue;
              }
              if (file.size > 10 * 1024 * 1024) {
                skipped += 1;
                continue;
              }
              if (REMOTE && (existing.length + selected.length >= 4 || totalSize + file.size > 20 * 1024 * 1024)) {
                skipped += 1;
                continue;
              }
              selected.push({ name: file.name || path.split(/[\\/]/).pop() || path || t("附件"), path, type: file.type || "", file: REMOTE ? file : null, previewUrl: REMOTE && file.type.startsWith("image/") ? URL.createObjectURL(file) : "" });
              totalSize += file.size;
            }
            resolve({ files: selected, skipped, picked: files.length });
          }, { once: true });
          input.addEventListener("cancel", () => resolve({ files: [], skipped: 0, picked: 0 }), { once: true });
          input.click();
        });
      }

      function footer() {
        if (issue?.archived_at || executionLocked) return "";
        const switchButton = issue ? "" : '<button class="better-codex-switch-mode" type="button" data-dialog-switch>' + icon("switch") + te(draft.mode === "agent" ? "切换到手动" : "切换到智能体") + '</button>';
        const submitText = issue ? "保存" : draft.mode === "agent" ? "创建" : "创建任务";
        const keepOpen = issue ? "" : '<label class="better-codex-keep-open"><input class="better-codex-toggle" name="keep" type="checkbox"' + (state.keepCreate ? " checked" : "") + '>' + te("继续创建") + '</label>';
        return '<div class="better-codex-dialog-footer"><button class="better-codex-icon-button" type="button" data-dialog-attach aria-label="' + te("添加附件") + '">' + icon("paperclip") + '</button><div class="better-codex-dialog-footer-right">' + switchButton + keepOpen + '<button class="better-codex-submit" type="submit">' + te(submitText) + '</button></div></div>';
      }

      function updateDescriptionDisclosure() {
        const editor = dialog.querySelector('[name="description"]');
        const toggle = dialog.querySelector("[data-description-toggle]");
        if (!editor || !toggle) return;
        const hasOverflow = editor.scrollHeight > editor.clientHeight;
        toggle.hidden = !hasOverflow && !draft.descriptionExpanded;
        toggle.setAttribute("aria-expanded", String(draft.descriptionExpanded));
        toggle.textContent = te(draft.descriptionExpanded ? "收起描述" : "展开描述");
      }

      function renderDialog() {
        if (projectDismiss) document.removeEventListener("pointerdown", projectDismiss, true);
        if (selectDismiss) document.removeEventListener("pointerdown", selectDismiss, true);
        projectDismiss = null;
        selectDismiss = null;
        stopConversationPoll();
        dialog.dataset.mode = draft.mode;
        dialog.dataset.detail = issue ? "true" : "false";
        dialog.dataset.issueId = issue?.id || "";
        dialog.dataset.executionRunning = String(executionRunning);
        dialog.dataset.executionLocked = String(executionLocked);
        dialog.dataset.expanded = String(draft.expanded);
        dialog.dataset.descriptionExpanded = String(draft.descriptionExpanded);
        dialog.dataset.locked = String(editingLocked);
        if (draft.mode === "agent") {
          const humanAssigned = draft.assignee.startsWith("user:");
          const selectedAgent = humanAssigned
            ? state.agents.find(agent => agent.is_default)
            : state.agents.find(agent => agent.is_default ? draft.assignee === "codex" : agent.id === draft.assignee);
          const selectedName = selectedAgent?.name || "Codex";
          const assignedUser = draft.assignee === issueAssigneeValue(issue) ? issueUserProfile(issue) : state.users.find(user => "user:" + user.id === draft.assignee) || state.user;
          const hint = humanAssigned
            ? state.locale === "zh-CN" ? "创建后由默认智能体生成标题，等待 " + (assignedUser?.name || t("你")) + " 处理。" : "The default agent will generate the title, then wait for " + (assignedUser?.name || t("你")) + "."
            : t("创建后先由 " + selectedName + " 整理卡片，再自动开始工作。");
          dialog.innerHTML = '<form>' + header() + assigneePicker() + '<div class="better-codex-create-semantic"><div class="better-codex-semantic-menu" id="better-codex-semantic-menu" data-semantic-menu role="listbox" hidden></div><textarea class="better-codex-dialog-editor" name="prompt" placeholder="' + te("告诉智能体要做什么，例如：“修复项目里任务运行状态不可见的问题”") + '" aria-label="' + te("任务要求") + '" aria-autocomplete="list" aria-controls="better-codex-semantic-menu" aria-expanded="false">' + escapeHtml(draft.prompt) + '</textarea>' + semanticWarningMarkup(draft.promptSemanticDocument) + '</div>' + propertyRows() + attachmentList() + '<div class="better-codex-dialog-error" hidden></div>' + footer() + '</form>';
          dialog.querySelector(".better-codex-dialog-properties")?.insertAdjacentHTML("beforebegin", '<div class="better-codex-run-hint">' + agentAvatarMarkup(selectedAgent, "better-codex-agent-avatar") + '<span>' + escapeHtml(hint) + '</span></div>');
        } else if (issue) {
          const descriptionEditor = '<div class="better-codex-description-field"><textarea class="better-codex-dialog-editor" name="description" placeholder="' + te("添加描述...") + '" rows="3">' + escapeHtml(draft.description) + '</textarea><button class="better-codex-description-toggle" type="button" data-description-toggle hidden></button></div>';
          dialog.innerHTML = '<form>' + header() + assigneePicker() + '<input class="better-codex-manual-title" name="title" maxlength="500" placeholder="' + te("任务标题") + '" value="' + escapeHtml(draft.title) + '">' + descriptionEditor + conversationPanel() + propertyRows() + attachmentList() + '<div class="better-codex-dialog-error" hidden></div>' + footer() + '</form>';
        } else {
          dialog.innerHTML = '<form>' + header() + assigneePicker() + '<input class="better-codex-manual-title" name="title" maxlength="500" placeholder="' + te("任务标题") + '" value="' + escapeHtml(draft.title) + '"><textarea class="better-codex-dialog-editor" name="description" placeholder="' + te("添加描述...") + '">' + escapeHtml(draft.description) + '</textarea>' + propertyRows() + attachmentList() + '<div class="better-codex-dialog-error" hidden></div>' + footer() + '</form>';
        }
        const content = dialog.querySelector(draft.mode === "agent" ? '[name="prompt"]' : '[name="title"]');
        dialog.querySelector("form")?.addEventListener("pointerdown", event => {
          const compactAgentCreate = HOST_KIND === "web" && window.matchMedia("(max-width: 720px)").matches && !issue && draft.mode === "agent";
          if (!compactAgentCreate || document.activeElement !== content) return;
          const target = event.target;
          if (target.closest("[data-dialog-close], textarea, [contenteditable='true'], input:not([type]), input[type='text'], input[type='search'], input[type='email'], input[type='url'], input[type='tel'], input[type='number'], input[type='password']")) return;
          event.preventDefault();
        }, true);
        applyDialogPermissions();
        syncQueuedReplyState();
        const syncLabelOptions = () => {
          const selected = new Set(String(dialog.querySelector('[name="labels"]')?.value || "").split(/[,，]/).map(value => value.trim()).filter(Boolean));
          dialog.querySelectorAll("[data-dialog-label-option]").forEach(option => {
            const active = selected.has(option.dataset.dialogLabelOption);
            option.classList.toggle("is-selected", active);
            option.setAttribute("aria-selected", String(active));
            option.querySelector(".better-codex-dialog-select-check").innerHTML = active ? icon("check") : "";
          });
        };
        content?.addEventListener("input", () => {
          content.removeAttribute("aria-invalid");
          dirtyDraftFields.add(draft.mode === "agent" ? "prompt" : "title");
          if (!issue && draft.mode === "agent") {
            draft.prompt = content.value;
            const previous = draft.promptSemanticDocument;
            draft.promptSemanticDocument = reconcileSemanticText(previous, content.value);
            if (!previous.degraded && draft.promptSemanticDocument.degraded) appendDiagnostic("semantic_reference_degraded", { editor: "prompt", project_id: draft.projectId || "" });
            syncSemanticWarning();
            syncSemanticMenu();
          }
          updateSubmitState();
        });
        if (!issue && draft.mode === "agent") {
          content?.addEventListener("focus", () => {
            syncSemanticMenu();
          });
          content?.addEventListener("blur", () => {
            setTimeout(() => {
              if (!dialog.querySelector("[data-semantic-menu]:hover")) closeSemanticMenu();
            }, 120);
          });
          content?.addEventListener("keydown", event => {
            if (handleSemanticMenuKeydown(event)) event.stopPropagation();
          });
        }
        dialog.querySelectorAll('[name="description"], [name="labels"]').forEach(control => control.addEventListener("input", () => {
          dirtyDraftFields.add(control.getAttribute("name"));
          if (control.matches('[name="labels"]')) {
            draft.labels = control.value;
            syncLabelOptions();
          }
          requestAnimationFrame(updateDescriptionDisclosure);
        }));
        requestAnimationFrame(updateDescriptionDisclosure);
        dialog.querySelector("[data-description-toggle]")?.addEventListener("click", () => {
          draft.descriptionExpanded = !draft.descriptionExpanded;
          dialog.dataset.descriptionExpanded = String(draft.descriptionExpanded);
          updateDescriptionDisclosure();
        });
        dialog.querySelector('[name="keep"]')?.addEventListener("change", event => {
          state.keepCreate = event.currentTarget.checked;
          localStorage.setItem(KEEP_CREATE_KEY, String(state.keepCreate));
        });
        const replyInput = dialog.querySelector('[name="reply"]');
        const sendButton = dialog.querySelector("[data-conversation-send]");
        const queue = dialog.querySelector("[data-conversation-queue]");
        queue?.addEventListener("input", event => {
          if (!event.target.matches("[data-queue-edit-input]")) return;
          queueEditDraft = event.target.value;
          queueEditSemanticDocument = reconcileSemanticText(queueEditSemanticDocument || createSemanticDraft(queueEditDraft), queueEditDraft);
          const warning = queue.querySelector("[data-queue-edit-warning]");
          if (warning) warning.hidden = !queueEditSemanticDocument.degraded;
          const save = queue.querySelector("[data-queue-edit-save]");
          if (save) save.disabled = !queueEditDraft.trim() || Boolean(queueActionRequestId);
        });
        queue?.addEventListener("keydown", event => {
          if (!event.target.matches("[data-queue-edit-input]")) return;
          if (event.key === "Escape") {
            event.preventDefault();
            queueEditingRequestId = "";
            queueEditDraft = "";
            queueEditSemanticDocument = null;
            queueActionError = "";
            syncQueuedReplyState();
            return;
          }
          if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
            event.preventDefault();
            void updateQueuedReply("update", queueEditingRequestId);
          }
        });
        queue?.addEventListener("click", event => {
          const sendNow = event.target.closest("[data-queue-send-now]");
          if (sendNow) {
            void updateQueuedReply("send", sendNow.dataset.queueSendNow);
            return;
          }
          const edit = event.target.closest("[data-queue-edit]");
          if (edit) {
            const item = queuedReplies.find(entry => entry.request_id === edit.dataset.queueEdit);
            if (!item) return;
            queueEditingRequestId = item.request_id;
            queueEditDraft = item.message || "";
            queueEditSemanticDocument = createSemanticDraft(queueEditDraft, item.input_document);
            queueActionError = "";
            syncQueuedReplyState();
            requestAnimationFrame(() => {
              const input = queue.querySelector("[data-queue-edit-input]");
              input?.focus();
              input?.setSelectionRange?.(input.value.length, input.value.length);
            });
            return;
          }
          const remove = event.target.closest("[data-queue-delete]");
          if (remove) {
            void updateQueuedReply("delete", remove.dataset.queueDelete);
            return;
          }
          if (event.target.closest("[data-queue-edit-cancel]")) {
            queueEditingRequestId = "";
            queueEditDraft = "";
            queueEditSemanticDocument = null;
            queueActionError = "";
            syncQueuedReplyState();
            return;
          }
          const save = event.target.closest("[data-queue-edit-save]");
          if (save) void updateQueuedReply("update", save.dataset.queueEditSave);
        });
        replyInput?.addEventListener("input", () => {
          draft.reply = replyInput.value;
          const previous = draft.replySemanticDocument;
          draft.replySemanticDocument = reconcileSemanticText(previous, replyInput.value);
          if (!previous.degraded && draft.replySemanticDocument.degraded) appendDiagnostic("semantic_reference_degraded", { editor: "reply", issue_id: issue?.id || "" });
          syncSemanticWarning();
          scheduleReplyDraft(replyInput.value);
          updateReplySendState();
          syncSemanticMenu();
        });
        replyInput?.addEventListener("focus", () => {
          syncSemanticMenu();
        });
        replyInput?.addEventListener("blur", () => {
          flushReplyDraft();
          setTimeout(() => {
            if (!dialog.querySelector("[data-semantic-menu]:hover")) closeSemanticMenu();
          }, 120);
        });
        dialog.querySelector("[data-semantic-menu]")?.addEventListener("pointerdown", event => event.preventDefault());
        dialog.querySelector("[data-semantic-menu]")?.addEventListener("click", event => {
          const option = event.target.closest("[data-semantic-option]");
          if (!option) return;
          selectSemanticOption(Number(option.dataset.semanticOption));
          semanticEditor()?.focus();
        });
        sendButton?.addEventListener("click", event => {
          const button = event.currentTarget;
          if (button.dataset.composerMode === "stop") void stopIssueFromDialog(button);
          else if (["send", "queue"].includes(button.dataset.composerMode)) void sendReply();
        });
        dialog.querySelector("[data-conversation-body]")?.addEventListener("click", async event => {
          const attachmentButton = event.target.closest("[data-conversation-attachment]");
          if (attachmentButton) {
            await openConversationAttachment(Number(attachmentButton.dataset.conversationAttachmentMessage), Number(attachmentButton.dataset.conversationAttachment));
            return;
          }
          const button = event.target.closest("[data-conversation-copy]");
          if (!button) return;
          const message = conversationMessages[Number(button.dataset.conversationCopy)];
          const visibleContent = button.closest(".better-codex-bubble")?.querySelector(".better-codex-bubble-content")?.innerText || "";
          const content = typeof message?.markdown === "string" && message.markdown ? message.markdown : visibleContent;
          if (!content) return;
          await copyText(content);
          button.classList.add("is-copied");
          button.innerHTML = icon("check");
          button.setAttribute("aria-label", t("已复制"));
          button.setAttribute("title", t("已复制"));
          setTimeout(() => {
            if (!button.isConnected) return;
            button.classList.remove("is-copied");
            button.innerHTML = icon("copy");
            button.setAttribute("aria-label", t("复制消息"));
            button.setAttribute("title", t("复制消息"));
          }, 1600);
        });
        dialog.querySelector("[data-conversation-attach]")?.addEventListener("click", () => {
          void pickAttachments(draft.replyAttachments).then(async result => {
            const errorOutput = dialog.querySelector(".better-codex-dialog-error");
            const showAttachError = message => {
              if (!errorOutput) return;
              presentInlineError(errorOutput, new Error(message), t(message), { source: "attachment_picker", action: "reply", report: false });
            };
            if (!result.picked) return;
            if (!result.files.length) return showAttachError(REMOTE ? "最多传输 4 个文件且总大小不能超过 20 MB" : "当前环境无法读取本地文件路径");
            const known = new Set(draft.replyAttachments.map(file => file.path || file.name + ":" + (file.file?.size || 0)));
            const next = result.files.filter(file => !known.has(file.path || file.name + ":" + (file.file?.size || 0)));
            if (next.length) {
              try {
                if (RELAY) await cacheRemoteAttachments(next);
                else if (!REMOTE) await uploadPastedImages(next);
                syncDraft();
                draft.replyAttachments.push(...next);
                scheduleReplyDraft(draft.reply);
                renderDialog();
              } catch (error) {
                next.forEach(releaseAttachment);
                return showAttachError(error instanceof Error ? error.message : "附件缓存失败");
              }
            }
            if (result.skipped) showAttachError(REMOTE ? "部分文件超出传输限制，已跳过" : "部分文件无法读取本地路径，已跳过");
            dialog.querySelector('[name="reply"]')?.focus();
          });
        });
        replyInput?.addEventListener("keydown", event => {
          if (handleSemanticMenuKeydown(event)) return;
          if (isSendKeyboardEvent(event)) {
            event.preventDefault();
            if (["send", "queue"].includes(sendButton?.dataset.composerMode || "")) void sendReply();
          }
        });
        if (issue && sessionId && dialog.open) void loadConversation();
        const closeDialogSelects = () => {
          dialog.querySelectorAll("[data-dialog-select]").forEach(picker => {
            picker.classList.remove("is-open");
            picker.querySelector("[data-dialog-select-toggle]")?.setAttribute("aria-expanded", "false");
            const menu = picker.querySelector(".better-codex-dialog-select-menu");
            if (menu) menu.hidden = true;
          });
          dialog.querySelectorAll("[data-dialog-label-picker]").forEach(picker => {
            picker.classList.remove("is-open");
            picker.querySelector("[data-dialog-label-toggle]")?.setAttribute("aria-expanded", "false");
          });
          if (selectDismiss) document.removeEventListener("pointerdown", selectDismiss, true);
          selectDismiss = null;
        };
        dialog.querySelectorAll("[data-dialog-select-toggle]").forEach(toggle => toggle.addEventListener("click", event => {
          event.stopPropagation();
          const picker = toggle.closest("[data-dialog-select]");
          const opening = !picker.classList.contains("is-open");
          closeDialogSelects();
          if (!opening) return;
          picker.classList.add("is-open");
          toggle.setAttribute("aria-expanded", "true");
          picker.querySelector(".better-codex-dialog-select-menu").hidden = false;
          selectDismiss = dismissEvent => {
            if (picker.contains(dismissEvent.target)) return;
            closeDialogSelects();
          };
          setTimeout(() => document.addEventListener("pointerdown", selectDismiss, true), 0);
        }));
        dialog.querySelectorAll("[data-dialog-label-toggle]").forEach(toggle => toggle.addEventListener("click", event => {
          event.stopPropagation();
          const picker = toggle.closest("[data-dialog-label-picker]");
          const opening = !picker.classList.contains("is-open");
          closeDialogSelects();
          if (!opening) return;
          picker.classList.add("is-open");
          toggle.setAttribute("aria-expanded", "true");
          selectDismiss = dismissEvent => {
            if (picker.contains(dismissEvent.target)) return;
            closeDialogSelects();
          };
          setTimeout(() => document.addEventListener("pointerdown", selectDismiss, true), 0);
        }));
        dialog.querySelectorAll("[data-dialog-label-option]").forEach(option => option.addEventListener("click", event => {
          event.stopPropagation();
          const picker = option.closest("[data-dialog-label-picker]");
          const input = picker.querySelector('[name="labels"]');
          const labels = new Set(String(input.value || "").split(/[,，]/).map(value => value.trim()).filter(Boolean));
          const value = option.dataset.dialogLabelOption;
          if (labels.has(value)) labels.delete(value);
          else labels.add(value);
          input.value = [...labels].join(", ");
          draft.labels = input.value;
          dirtyDraftFields.add("labels");
          syncLabelOptions();
          updateSubmitState();
        }));
        dialog.querySelectorAll("[data-dialog-select-option]").forEach(option => option.addEventListener("click", event => {
          event.stopPropagation();
          const picker = option.closest("[data-dialog-select]");
          const name = option.dataset.dialogSelectOption;
          const value = option.dataset.dialogSelectValue;
          picker.querySelector('input[type="hidden"]').value = value;
          picker.querySelector("[data-dialog-select-label]").innerHTML = option.querySelector(":scope > span:nth-child(2)").innerHTML;
          picker.querySelector(".better-codex-dialog-select-trigger-visual").innerHTML = option.querySelector(".better-codex-dialog-select-option-visual").innerHTML;
          picker.querySelectorAll("[data-dialog-select-option]").forEach(item => {
            const selected = item === option;
            item.classList.toggle("is-selected", selected);
            item.setAttribute("aria-selected", String(selected));
            item.querySelector(".better-codex-dialog-select-check").innerHTML = selected ? icon("check") : "";
          });
          if (name === "status") {
            draft.status = value;
            dirtyDraftFields.add(name);
          }
          if (name === "mockup_run_status") {
            draft.runStatus = value;
            dirtyDraftFields.add(name);
          }
          if (name === "priority") {
            draft.priority = value;
            dirtyDraftFields.add(name);
          }
          if (name === "assignee") {
            draft.assignee = value;
            dirtyDraftFields.add(name);
          }
          if (completedIssue) {
            if (name === "status") persistCompletedIssuePatch({ status: value });
            if (name === "priority") persistCompletedIssuePatch({ priority: value });
            if (name === "assignee") persistCompletedIssuePatch(value.startsWith("user:")
              ? { user_assigned: true, assignee_user_id: REMOTE && value.slice(5) !== "default" ? value.slice(5) : null, agent_enabled: false, agent_id: "" }
              : value === "none"
                ? { user_assigned: false, assignee_user_id: null, agent_enabled: false, agent_id: "" }
                : { user_assigned: false, assignee_user_id: null, agent_enabled: true, agent_id: value === "codex" ? "" : value });
          }
          if (name === "agent_id") {
            draft.agentId = value;
            dirtyDraftFields.add(name);
            const selectedAgent = state.agents.find(agent => agent.id === draft.agentId);
            const selectedName = selectedAgent?.name || "Codex";
            const runAvatar = dialog.querySelector(".better-codex-run-hint .better-codex-agent-avatar");
            syncAgentAvatar(runAvatar, selectedAgent);
            const hint = dialog.querySelector(".better-codex-run-hint span:last-child");
            if (hint) hint.textContent = t("创建后先由 " + selectedName + " 整理卡片，再自动开始工作。");
          }
          closeDialogSelects();
          if (name === "assignee" && draft.mode === "agent") {
            syncDraft();
            renderDialog();
            return;
          }
          updateSubmitState();
          picker.querySelector("[data-dialog-select-toggle]")?.focus();
        }));
        const projectButton = dialog.querySelector("[data-dialog-project]");
        const projectMenu = dialog.querySelector(".better-codex-project-menu");
        const projectSearch = dialog.querySelector(".better-codex-project-search");
        const positionProjectMenu = () => {
          if (HOST_KIND === "web" && window.matchMedia("(max-width: 720px)").matches) {
            projectMenu.classList.remove("is-above");
            projectMenu.style.removeProperty("max-height");
            projectMenu.querySelector("[data-project-options]").style.removeProperty("max-height");
            return;
          }
          const viewportTop = window.visualViewport?.offsetTop || 0;
          const viewportBottom = viewportTop + (window.visualViewport?.height || window.innerHeight);
          const buttonRect = projectButton.getBoundingClientRect();
          const spaceAbove = Math.max(0, buttonRect.top - viewportTop - 12);
          const spaceBelow = Math.max(0, viewportBottom - buttonRect.bottom - 12);
          const openAbove = spaceAbove > spaceBelow;
          const availableHeight = Math.min(320, openAbove ? spaceAbove : spaceBelow);
          projectMenu.classList.toggle("is-above", openAbove);
          projectMenu.style.maxHeight = Math.floor(availableHeight) + "px";
          projectMenu.querySelector("[data-project-options]").style.maxHeight = Math.max(0, Math.floor(availableHeight) - 44) + "px";
        };
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
          positionProjectMenu();
          if (!(HOST_KIND === "web" && window.matchMedia("(max-width: 720px)").matches)) projectSearch.focus();
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
          dirtyDraftFields.add("project_id");
          semanticCatalog = null;
          closeSemanticMenu();
          const selectedProject = state.projects.find(item => item.id === draft.projectId);
          dialog.querySelector("[data-project-label]").textContent = projectLabel(selectedProject) || t("选择项目");
          const breadcrumbProject = dialog.querySelector("[data-dialog-breadcrumb-project]");
          if (breadcrumbProject) breadcrumbProject.textContent = projectLabel(selectedProject) || t("未提供");
          dialog.querySelectorAll("[data-dialog-project-option]").forEach(item => { item.querySelector(".better-codex-project-check").innerHTML = item.dataset.dialogProjectOption === draft.projectId ? icon("check") : ""; });
          projectMenu.hidden = true;
          if (projectDismiss) document.removeEventListener("pointerdown", projectDismiss, true);
          projectDismiss = null;
        }));
        dialog.querySelector("[data-dialog-close]")?.addEventListener("click", () => dialog.close());
        dialog.querySelector("[data-dialog-open-thread]")?.addEventListener("click", event => {
          const button = event.currentTarget;
          const threadId = normalizeSessionId(event.currentTarget.dataset.dialogOpenThread);
          if (!threadId || button.disabled) return;
          const errorOutput = dialog.querySelector(".better-codex-dialog-error");
          const idleLabel = button.textContent || t("在会话中打开");
          button.disabled = true;
          button.classList.add("is-loading");
          button.setAttribute("aria-busy", "true");
          button.innerHTML = icon("refresh") + "<span>" + te("正在打开…") + "</span>";
          clearError();
          void (async () => {
            try {
              await openThread(threadId);
              dialog.close();
            } catch (error) {
              showError(error);
              if (errorOutput) {
                errorOutput.textContent = errorLabel(error);
                errorOutput.hidden = false;
              }
              if (button.isConnected) {
                button.disabled = false;
                button.classList.remove("is-loading");
                button.removeAttribute("aria-busy");
                button.textContent = idleLabel;
              }
            }
          })();
        });
        dialog.querySelector("[data-dialog-stop]")?.addEventListener("click", event => void stopIssueFromDialog(event.currentTarget));
        dialog.querySelector("[data-dialog-restore]")?.addEventListener("click", event => void restoreIssueFromDialog(event.currentTarget));
        const startNow = dialog.querySelector("[data-dialog-start-now]");
        startNow?.addEventListener("click", () => {
          syncDraft();
          void startIssueNow();
        });
        const setDialogExpanded = expanded => {
          draft.expanded = expanded;
          localStorage.setItem(issue ? ISSUE_DIALOG_EXPANDED_KEY : CREATE_DIALOG_EXPANDED_KEY, String(draft.expanded));
          if (issue && draft.expanded) syncIssueFullscreenBounds();
          dialog.dataset.expanded = String(draft.expanded);
          if (issue && !draft.expanded) clearIssueFullscreenBounds();
          const button = dialog.querySelector("[data-dialog-expand]");
          button?.setAttribute("aria-label", t(draft.expanded ? (issue ? "退出全屏" : "缩小") : "展开"));
          if (button) button.innerHTML = icon(draft.expanded ? "shrink" : "expand");
        };
        dialog.querySelector("[data-dialog-expand]")?.addEventListener("click", () => {
          setDialogExpanded(!draft.expanded);
        });
        dialog.querySelector("[data-dialog-switch]")?.addEventListener("click", () => {
          syncDraft();
          if (draft.mode === "manual") {
            draft.prompt = draft.prompt || [draft.title, draft.description].filter(Boolean).join("\n\n");
            draft.mode = "agent";
          } else {
            if (!draft.title) draft.title = draft.prompt.split(/\n/).find(line => line.trim())?.trim().slice(0, 120) || "";
            if (!draft.description) draft.description = draft.prompt;
            draft.mode = "manual";
          }
          renderDialog();
          dialog.querySelector(draft.mode === "agent" ? '[name="prompt"]' : '[name="title"]')?.focus();
        });
        dialog.querySelector("[data-dialog-attach]")?.addEventListener("click", () => {
          void pickAttachments(draft.attachments).then(async result => {
            const showAttachError = message => {
              const errorOutput = dialog.querySelector(".better-codex-dialog-error");
              if (!errorOutput) return;
              presentInlineError(errorOutput, new Error(message), t(message), { source: "attachment_picker", action: issue ? "edit" : "create", report: false });
            };
            if (!result.picked) return;
            if (!result.files.length) return showAttachError(REMOTE ? "最多传输 4 个文件且总大小不能超过 20 MB" : "当前环境无法读取本地文件路径");
            const known = new Set(draft.attachments.map(file => file.path || file.name + ":" + (file.file?.size || 0)));
            const next = result.files.filter(file => !known.has(file.path || file.name + ":" + (file.file?.size || 0)));
            if (next.length) {
              try {
                if (RELAY) await cacheRemoteAttachments(next);
                else if (!REMOTE) await uploadPastedImages(next);
                syncDraft();
                draft.attachments.push(...next);
                if (!issue) writeCreateDraft(draft, createRequestId);
                renderDialog();
              } catch (error) {
                next.forEach(releaseAttachment);
                return showAttachError(error instanceof Error ? error.message : "附件缓存失败");
              }
            }
            if (result.skipped) showAttachError(REMOTE ? "部分文件超出传输限制，已跳过" : "部分文件无法读取本地路径，已跳过");
            dialog.querySelector(draft.mode === "agent" ? '[name="prompt"]' : '[name="title"]')?.focus();
          });
        });
        dialog.querySelectorAll("[data-dialog-detach]").forEach(button => button.addEventListener("click", event => {
          event.preventDefault();
          const index = Number(button.dataset.dialogDetach);
          if (!Number.isInteger(index) || index < 0) return;
          syncDraft();
          const scope = button.dataset.dialogAttachmentScope;
          const attachments = scope === "reply" ? draft.replyAttachments : draft.attachments;
          const [removed] = attachments.splice(index, 1);
          if (removed) releaseAttachment(removed);
          if (scope === "reply") scheduleReplyDraft(draft.reply);
          else if (!issue) writeCreateDraft(draft, createRequestId);
          renderDialog();
          dialog.querySelector(scope === "reply" ? '[name="reply"]' : draft.mode === "agent" ? '[name="prompt"]' : '[name="title"]')?.focus();
        }));
        dialog.querySelector("form")?.addEventListener("paste", pasteImages);
        dialog.querySelector("form")?.addEventListener("keydown", event => {
          if (event.target?.matches?.('[name="reply"]')) return;
          if (isSendKeyboardEvent(event)) {
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
        if (editingLocked || submitInFlight) return;
        const submit = dialog.querySelector(".better-codex-submit");
        const errorOutput = dialog.querySelector(".better-codex-dialog-error");
        if (!submit || !errorOutput) return;
        const prompt = draft.prompt.trim();
        const title = draft.mode === "agent" ? prompt.split(/\n/).find(line => line.trim())?.replace(/^[#*\s-]+/, "").trim().slice(0, 120) || "" : draft.title.trim();
        if (!title) return;
        const description = draft.mode === "agent" ? prompt : draft.description;
        if (description.length > state.issueDescriptionLimit) {
          const editor = dialog.querySelector(draft.mode === "agent" ? '[name="prompt"]' : '[name="description"]');
          errorOutput.textContent = state.locale === "zh-CN"
            ? "内容长度 " + description.length + "，超过 " + state.issueDescriptionLimit + " 的限制。请缩短内容或作为附件上传。"
            : "Content length is " + description.length + ", above the " + state.issueDescriptionLimit + " limit. Shorten it or upload it as an attachment.";
          errorOutput.hidden = false;
          editor?.setAttribute("aria-invalid", "true");
          editor?.focus();
          return;
        }
        submitInFlight = true;
        submit.disabled = true;
        errorOutput.hidden = true;
        traceDialog("dialog_submit_start", { action: issue ? "update_issue" : "create_issue" });
        try {
          const humanAssignee = draft.assignee.startsWith("user:");
          const assignee = humanAssignee
            ? { user_assigned: true, assignee_user_id: REMOTE && draft.assignee.slice(5) !== "default" ? draft.assignee.slice(5) : null, agent_enabled: false, agent_id: "" }
            : draft.assignee === "none"
              ? { user_assigned: false, assignee_user_id: null, agent_enabled: false, agent_id: "" }
              : { user_assigned: false, assignee_user_id: null, agent_enabled: true, agent_id: draft.assignee === "codex" ? "" : draft.assignee };
          const latestContext = readContext();
          const selectedProject = state.projects.find(item => item.id === draft.projectId);
          let workspacePath = selectedProject?.workspace_path || await resolveWorkspacePath(latestContext);
          if (!workspacePath && selectedProject?.external_id && latestContext.projectId === selectedProject.external_id) {
            const ensured = await ensureContextProject(latestContext);
            workspacePath = ensured?.workspace_path || "";
          }
          if (draft.mode === "agent" && !issue && !workspacePath && !state.mockup && !REMOTE) {
            throw new Error("创建智能体 Issue 需要本地工作区：请先打开该项目下的一个 Codex 会话");
          }
          let files = [];
          if (RELAY) await cacheRemoteAttachments(draft.attachments);
          else if (REMOTE) files = await remoteFiles(draft.attachments);
          else await uploadPastedImages();
          const semanticCommand = !issue && draft.mode === "agent" && /^\/review$/.test(prompt) ? "review" : "";
          const submittedDescription = withAttachments(draft.mode === "agent" ? prompt : draft.description);
          const body = {
            project_id: draft.projectId,
            title,
            description: submittedDescription,
            status: draft.mode === "agent" && !issue ? "todo" : draft.status,
            priority: draft.priority,
            labels: draft.labels.split(/[,，]/).map(value => value.trim()).filter(Boolean),
            workspace_path: workspacePath,
            ai_enrich: draft.mode === "agent" && !issue,
            ...(!issue && draft.mode === "agent" ? { input_document: serializeSemanticDraft(reconcileSemanticText(draft.promptSemanticDocument, submittedDescription)) } : {}),
            ...(!issue && draft.mode === "agent" ? { semantic_command: semanticCommand } : {}),
            files,
            ...(state.mockup ? { mockup_run_status: draft.runStatus } : {}),
            ...assignee,
            ...(!issue ? { request_id: createRequestId } : {})
          };
          const transferTimeoutMs = files.length ? 120_000 : undefined;
          if (issue) await api("/api/issues/" + encodeURIComponent(issue.id), { method: "PATCH", body: JSON.stringify({ ...body, version: issue.version }), timeoutMs: transferTimeoutMs });
          else {
            writeCreateDraft(draft, createRequestId);
            await api("/api/issues", { method: "POST", body: JSON.stringify({ ...body, project_id: draft.projectId }), timeoutMs: transferTimeoutMs });
            state.projectId = draft.projectId;
          }
          traceDialog("dialog_submit_success", { action: issue ? "update_issue" : "create_issue" });
          if (!issue) sessionStorage.removeItem(CREATE_DRAFT_KEY);
          await loadIssues();
          if (!issue && state.keepCreate) {
            createRequestId = globalThis.crypto?.randomUUID?.() || VERSION + "-create-" + Date.now() + "-" + Math.random().toString(36).slice(2);
            submitInFlight = false;
            draft.title = "";
            draft.description = "";
            draft.prompt = "";
            draft.promptSemanticReferences = [];
            draft.promptSemanticDocument = createSemanticDraft("");
            draft.attachments.forEach(releaseAttachment);
            draft.attachments = [];
            renderDialog();
            dialog.querySelector(draft.mode === "agent" ? '[name="prompt"]' : '[name="title"]')?.focus();
          } else {
            retainCreateDraft = false;
            dialog.close();
          }
        } catch (error) {
          traceDialog("dialog_submit_error", { action: issue ? "update_issue" : "create_issue", error: String(error instanceof Error ? error.message : "create_failed").slice(0, 200) });
          presentInlineError(errorOutput, error, errorLabel(error), { source: "issue_dialog_submit", action: issue ? "update" : "create" });
          submitInFlight = false;
          submit.disabled = false;
        }
      }

      async function startIssueNow() {
        if (!issue || editingLocked || !issue.agent_enabled || (dirtyDraftFields.has("assignee") && (draft.assignee === "none" || draft.assignee.startsWith("user:")))) return;
        const button = dialog.querySelector("[data-dialog-start-now]");
        const errorOutput = dialog.querySelector(".better-codex-dialog-error");
        if (!button || !errorOutput) return;
        button.disabled = true;
        errorOutput.hidden = true;
        try {
          const current = await api("/api/issues/" + encodeURIComponent(issue.id));
          if (current.archived_at || !current.agent_enabled || (dirtyDraftFields.has("assignee") && (draft.assignee === "none" || draft.assignee.startsWith("user:"))) || current.active_run_status || issueSessionId(current) || issuePermissions(current).enrichmentPending || current.status === "done") {
            refreshIssueState(current);
            throw new Error("issue_not_startable");
          }
          const agentId = dirtyDraftFields.has("assignee")
            ? draft.assignee && draft.assignee !== "none" && draft.assignee !== "codex" && !draft.assignee.startsWith("user:") ? draft.assignee : ""
            : current.agent_id || "";
          const status = current.status === "backlog" ? "todo" : dirtyDraftFields.has("status") ? draft.status : current.status;
          await uploadPastedImages();
          await api("/api/issues/" + encodeURIComponent(issue.id) + "/start", {
            method: "POST",
            body: JSON.stringify({
              version: current.version,
              project_id: dirtyDraftFields.has("project_id") ? draft.projectId : current.project_id,
              title: dirtyDraftFields.has("title") ? draft.title : current.title,
              description: withAttachments(dirtyDraftFields.has("description") ? draft.description : current.description),
              status,
              priority: dirtyDraftFields.has("priority") ? draft.priority : current.priority,
              labels: (dirtyDraftFields.has("labels") ? draft.labels : (current.labels || []).join(", ")).split(/[,，]/).map(value => value.trim()).filter(Boolean),
              agent_id: agentId,
            })
          });
          await loadIssues();
          dialog.close();
        } catch (error) {
          presentInlineError(errorOutput, error, errorLabel(error), { source: "issue_start" });
          button.disabled = false;
        }
      }

      dialog.__betterCodexSyncIssue = refreshIssueState;
      document.body.append(dialog);
      const dialogAction = target => {
        const control = target?.closest?.("button");
        if (!control || !dialog.contains(control)) return "";
        if (control.matches("[data-dialog-close]")) return "close";
        if (control.matches(".better-codex-submit")) return "submit";
        if (control.matches("[data-dialog-open-thread]")) return "open_thread";
        if (control.matches("[data-dialog-start-now]")) return "start_now";
        if (control.matches("[data-dialog-stop]")) return "stop";
        if (control.matches("[data-dialog-restore]")) return "restore";
        if (control.matches("[data-dialog-switch]")) return "switch_mode";
        if (control.matches("[data-dialog-expand]")) return "expand";
        if (control.matches("[data-dialog-attach]")) return "attach";
        if (control.matches("[data-dialog-detach]")) return "detach";
        if (control.matches("[data-dialog-project]")) return "project";
        if (control.matches("[data-dialog-project-option]")) return "project_option";
        if (control.matches("[data-dialog-select-toggle]")) return "select";
        if (control.matches("[data-dialog-select-option]")) return "select_option";
        if (control.matches("[data-dialog-label-toggle]")) return "labels";
        if (control.matches("[data-dialog-label-option]")) return "label_option";
        if (control.matches("[data-reply-send]")) return "reply_send";
        return "";
      };
      const traceDialogAction = event => {
        const action = dialogAction(event.target);
        if (!action) return;
        traceDialog("dialog_action", { input_event: event.type, action, target: diagnosticTarget(event.target) });
      };
      dialog.addEventListener("pointerdown", traceDialogAction, true);
      dialog.addEventListener("click", traceDialogAction, true);
      dialog.addEventListener("keydown", event => {
        if (!["Escape", "Enter"].includes(event.key)) return;
        const fields = {
          key: event.key,
          code: event.code,
          target: diagnosticTarget(event.target),
          meta_key: event.metaKey,
          ctrl_key: event.ctrlKey,
          alt_key: event.altKey,
          shift_key: event.shiftKey,
          repeat: event.repeat,
          default_prevented: event.defaultPrevented,
          dialog_open: dialog.open,
        };
        traceDialog("dialog_keydown_capture", fields);
        setTimeout(() => traceDialog("dialog_keydown_settled", { ...fields, default_prevented: event.defaultPrevented, dialog_open: dialog.open }), 0);
      }, true);
      dialog.addEventListener("cancel", event => {
        traceDialog("dialog_cancel", { default_prevented: event.defaultPrevented, dialog_open: dialog.open });
      }, true);
      dialog.addEventListener("keydown", event => {
        if (issue || event.key !== "Escape") return;
        event.preventDefault();
        traceDialog("dialog_escape_close", { default_prevented: event.defaultPrevented, dialog_open: dialog.open });
        dialog.close();
      });
      dialog.addEventListener("close", () => {
        traceDialog("dialog_close", { dialog_open: dialog.open });
        if (retainCreateDraft) {
          syncDraft();
          writeCreateDraft(draft, createRequestId);
        }
        draft.attachments.forEach(releaseAttachment);
        draft.replyAttachments.forEach(releaseAttachment);
        stopConversationPoll();
        stopReplyRecovery();
        flushReplyDraft();
        if (projectDismiss) document.removeEventListener("pointerdown", projectDismiss, true);
        if (selectDismiss) document.removeEventListener("pointerdown", selectDismiss, true);
        window.visualViewport?.removeEventListener("resize", mobileDialogViewport);
        window.visualViewport?.removeEventListener("scroll", mobileDialogViewport);
        window.removeEventListener("resize", mobileDialogViewport);
        dialogBoundsObserver?.disconnect();
        if (mobileInputFrame !== null) cancelAnimationFrame(mobileInputFrame);
        dialog.remove();
      }, { once: true });
      bindModalDismiss(dialog, () => dialog.close());
      renderDialog();
      mobileDialogViewport();
      dialog.showModal();
      if (issue && panel && typeof ResizeObserver === "function") {
        dialogBoundsObserver = new ResizeObserver(syncIssueFullscreenBounds);
        dialogBoundsObserver.observe(panel);
      }
      window.visualViewport?.addEventListener("resize", mobileDialogViewport, { passive: true });
      window.visualViewport?.addEventListener("scroll", mobileDialogViewport, { passive: true });
      window.addEventListener("resize", mobileDialogViewport, { passive: true });
      traceDialog("dialog_open", { dialog_open: dialog.open });
      dialog.querySelector(draft.mode === "agent" ? '[name="prompt"]' : HOST_KIND === "web" && window.matchMedia("(max-width: 720px)").matches ? "[data-dialog-close]" : '[name="title"]')?.focus();
      if (issue && sessionId) requestAnimationFrame(() => void loadConversation());
    }

    function onBoardClick(event) {
      if (Date.now() < suppressIssueClickUntil) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      const archiveOpen = event.target.closest("[data-archive-open]");
      if (archiveOpen) return void openArchiveDialog(event.target.closest("[data-project-board]") ? state.projectDetailId : "");
      const add = event.target.closest("[data-add-status]");
      if (add) return void perform(() => openEditor(null, add.dataset.addStatus));
      const thread = event.target.closest("[data-thread]");
      if (thread) {
        event.stopPropagation();
        return void perform(() => openThread(thread.dataset.thread));
      }
      const pin = event.target.closest("[data-pin]");
      if (pin) {
        const issue = state.issues.find(item => item.id === pin.dataset.pin);
        if (!issue || issuePermissions(issue).enrichmentPending) return;
        return void perform(async () => {
          await api("/api/issues/" + encodeURIComponent(issue.id), { method: "PATCH", body: JSON.stringify({ version: issue.version, pinned: !issue.pinned }) });
          await loadIssues();
        });
      }
      const card = event.target.closest("[data-issue-id]");
      const issue = state.issues.find(item => item.id === card?.dataset.issueId);
      if (issue && !issuePermissions(issue).enrichmentPending) return void perform(() => openEditor(issue));
    }

    function sessionThreadTitle(row) {
      const attribute = ATTRIBUTES.threadTitle ? row.getAttribute(ATTRIBUTES.threadTitle) : "";
      return String(attribute || row.getAttribute("aria-label") || row.querySelector(SELECTORS.truncatedText)?.textContent || row.textContent || "").replace(/\s+/g, " ").trim();
    }

    function sessionDropTarget(clientX, clientY) {
      const board = panel?.querySelector("#better-codex-board");
      if (!board || panel?.hidden) return null;
      const bounds = board.getBoundingClientRect();
      if (clientX < bounds.left || clientX > bounds.right || clientY < bounds.top || clientY > bounds.bottom) return null;
      const column = Array.from(board.querySelectorAll(".better-codex-column")).find(node => {
        const rect = node.getBoundingClientRect();
        return clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom;
      }) || null;
      if (column?.dataset.status === "archive") return null;
      return { board, column };
    }

    function setSessionDropTarget(target) {
      panel?.querySelectorAll(".is-session-drop-target").forEach(node => node.classList.remove("is-session-drop-target"));
      if (!target) return;
      target.board.classList.add("is-session-drop-target");
    }

    function resetSessionDrag() {
      sessionDragPointer = null;
      setSessionDropTarget(null);
    }

    function revealImportedIssue(issueId) {
      requestAnimationFrame(() => {
        const card = Array.from(panel?.querySelectorAll("[data-issue-id]") || []).find(node => node.dataset.issueId === issueId);
        if (!card) return;
        const reducedMotion = globalThis.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
        card.scrollIntoView({ block: "nearest", inline: "nearest", behavior: reducedMotion ? "auto" : "smooth" });
        card.classList.add("is-session-imported");
        setTimeout(() => card.classList.remove("is-session-imported"), 1400);
      });
    }

    async function importSessionIssue(context) {
      if (sessionDropInFlight) return null;
      sessionDropInFlight = true;
      try {
        let issue = null;
        try {
          const existing = await api("/api/issues/from-thread?thread_id=" + encodeURIComponent(context.threadId));
          if (existing && linkedIssueThreadId(existing) === context.threadId) {
            issue = await api("/api/issues/from-thread", {
              method: "POST",
              body: JSON.stringify({ thread_id: context.threadId })
            });
          }
        } catch (error) {
          if (String(error instanceof Error ? error.message : error) !== "issue_not_found") throw error;
        }
        if (!issue) {
          state.projects = await requestProjects();
          let project = context.projectId ? await ensureContextProject(context) : null;
          let workspacePath = String(project?.workspace_path || "").trim();
          if (!workspacePath) workspacePath = await resolveWorkspacePath(context);
          if (!project && workspacePath) project = state.projects.find(item => item.workspace_path === workspacePath) || null;
          if (!project) throw new Error("project_required");
          issue = await api("/api/issues/from-thread", {
            method: "POST",
            body: JSON.stringify({
              project_id: project.id,
              title: context.threadTitle || t("未命名任务"),
              thread_id: context.threadId,
              workspace_path: workspacePath || project.workspace_path || ""
            })
          });
        }
        if (issue.archived_at) throw new Error("issue_archived");
        await loadIssues();
        revealImportedIssue(issue.id);
        return issue;
      } finally {
        sessionDropInFlight = false;
      }
    }

    function onSessionPointerDown(event) {
      if (!active || state.surface !== "issues" || state.mockup || READ_ONLY || REMOTE || HOST_CAPABILITIES.nativeThreads === false || event.button !== 0 || event.isPrimary === false) return;
      const row = event.target?.closest?.(SELECTORS.threadRow);
      if (!row || row.closest("#" + PANEL_ID)) return;
      const nestedControl = event.target?.closest?.("button,a,input,textarea,select,[contenteditable='true']");
      if (nestedControl && nestedControl !== row) return;
      const threadId = nativeThreadId(row);
      if (!threadId) return;
      const context = readContext(row);
      context.threadId = threadId;
      context.threadTitle = sessionThreadTitle(row);
      sessionDragPointer = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, dragging: false, context };
    }

    function onSessionPointerMove(event) {
      const drag = sessionDragPointer;
      if (!drag || event.pointerId !== drag.pointerId) return;
      if (!drag.dragging) {
        const deltaX = event.clientX - drag.startX;
        const deltaY = event.clientY - drag.startY;
        if (deltaX * deltaX + deltaY * deltaY < 36) return;
        drag.dragging = true;
      }
      setSessionDropTarget(sessionDropTarget(event.clientX, event.clientY));
    }

    function onSessionPointerUp(event) {
      const drag = sessionDragPointer;
      if (!drag || event.pointerId !== drag.pointerId) return;
      const target = drag.dragging ? sessionDropTarget(event.clientX, event.clientY) : null;
      resetSessionDrag();
      if (!target) return;
      suppressSessionClickUntil = Date.now() + 500;
      void perform(() => importSessionIssue(drag.context));
    }

    function onSessionPointerCancel(event) {
      if (!sessionDragPointer || event.pointerId !== sessionDragPointer.pointerId) return;
      resetSessionDrag();
    }

    function supportsIssueDrag() {
      return !window.matchMedia?.("(hover: none), (pointer: coarse)")?.matches;
    }

    function onCardDragStart(event) {
      const card = event.target.closest("[data-issue-id]");
      if (!card || !event.dataTransfer) return;
      if (!supportsIssueDrag()) {
        event.preventDefault();
        return;
      }
      const issueId = card.dataset.issueId || "";
      const issue = state.issues.find(item => item.id === issueId);
      if (!issue || issuePermissions(issue).boardLocked) return;
      draggingIssueId = issueId;
      event.dataTransfer.setData("text/plain", issueId);
      event.dataTransfer.effectAllowed = "move";
      card.classList.add("is-dragging");
    }

    function onCardDragEnd(event) {
      draggingIssueId = "";
      event.target.closest("[data-issue-id]")?.classList.remove("is-dragging");
      document.querySelectorAll(".better-codex-card.is-dragging").forEach(node => node.classList.remove("is-dragging"));
    }

    function onDrop(event) {
      event.preventDefault();
      const id = event.dataTransfer?.getData("text/plain");
      const status = event.target.closest("[data-status]")?.dataset.status;
      const beforeId = event.target.closest("[data-issue-id]")?.dataset.issueId || "";
      const issue = state.issues.find(item => item.id === id);
      if (!issue || issuePermissions(issue).boardLocked || !status) return;
      if (status === "archive") {
        return void perform(async () => {
          await api("/api/issues/" + encodeURIComponent(issue.id) + "/archive", { method: "POST", body: JSON.stringify({ version: issue.version }) });
          await loadIssues();
        });
      }
      if (state.mockup) {
        if (issue.status === status && beforeId === issue.id) return;
        return void perform(async () => {
          await moveMockupIssue(issue.id, issue.version, status, beforeId);
          await loadIssues();
        });
      }
      if (issue.status === status) return;
      void perform(async () => {
        await api("/api/issues/" + encodeURIComponent(issue.id), { method: "PATCH", body: JSON.stringify({ version: issue.version, status }) });
        await loadIssues();
      });
    }

    function mountPanel() {
      if (!active) return;
      const surface = findMount();
      if (!surface) return;
      if (!panel) {
        panel = createPanel();
        panelSizeCleanup = observeComponentSize(panel, componentContext("host", "panel-layout"));
      }
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

    function isBetterCodexRoute() {
      if (HOST_KIND === "web") return location.pathname === "/web" || location.pathname === "/" || Boolean(webProjectRoute()) || Boolean(webAgentRoute());
      if (Array.from(document.querySelectorAll("webview")).some(view => view.title === "Better Codex")) return true;
      return Array.from(document.querySelectorAll("main *")).some(node => ["找不到 MCP 应用视图", "MCP app view not found"].includes(node.textContent?.trim()));
    }

    function openRoute(surface = state.surface, options = {}) {
      if (!availableSurfaces.includes(surface)) surface = "issues";
      routeSuppressed = false;
      routeSeen = false;
      if (surface === "projects") {
        const projectId = typeof options.projectId === "string" ? options.projectId : "";
        if (projectId !== state.projectDetailId) {
          state.projectIssues = [];
          state.projectIssuesProjectId = "";
        }
        state.projectDetailId = projectId;
        if (HOST_KIND === "web") {
          const mode = options.history || (webProjectRoute() ? "replace" : "push");
          syncWebProjectRoute(state.projectDetailId, mode);
        } else {
          window.postMessage({ type: NAVIGATION.messageType, path: BETTER_CODEX_ROUTE }, window.location.origin);
        }
      } else if (surface === "agents") {
        state.projectDetailId = "";
        const agentKey = typeof options.agentKey === "string" ? options.agentKey : "";
        agentCreateFullscreen = false;
        state.agentPane = agentKey === "new" ? "create" : agentKey ? "detail" : "preview";
        state.selectedAgentId = agentKey && agentKey !== "new" ? agentKey : "";
        state.agentDraft = agentKey === "new" ? { avatar: "icon:bot" } : null;
        if (HOST_KIND === "web") {
          if (options.history === "none" && agentKey && !history.state?.betterCodexAgentFromList) {
            syncWebAgentRoute("", "replace");
            syncWebAgentRoute(agentKey);
          } else {
            const mode = options.history || (webAgentRoute() ? "replace" : "push");
            syncWebAgentRoute(agentKey, mode);
          }
        } else {
          window.postMessage({ type: NAVIGATION.messageType, path: BETTER_CODEX_ROUTE }, window.location.origin);
        }
      } else {
        state.projectDetailId = "";
        if (HOST_KIND !== "web" || options.history !== "none") window.postMessage({ type: NAVIGATION.messageType, path: BETTER_CODEX_ROUTE }, window.location.origin);
      }
      open(surface);
    }

    function open(surface = state.surface) {
      if (destroyed) return;
      if (!availableSurfaces.includes(surface)) surface = "issues";
      const ready = bootstrapReady;
      routeSuppressed = false;
      state.surface = surface;
      sessionStorage.setItem(RESUME_SURFACE_KEY, surface);
      active = true;
      ensureEntry();
      mountPanel();
      render();
      void (ready ? loadSurface({ preserveInspector: true }) : load());
      if (!startLiveUpdates() && pollTimer === null) pollTimer = setInterval(() => { if (!document.hidden && active && !panel?.dataset.recovery) void perform(() => loadSurface({ background: true }), { background: true }); }, 3000);
    }

    function close(options = {}) {
      const resume = Boolean(options.resume);
      if (resume) sessionStorage.setItem(RESUME_SURFACE_KEY, state.surface);
      else sessionStorage.removeItem(RESUME_SURFACE_KEY);
      routeSuppressed = options.suppressRoute !== false;
      active = false;
      resetSessionDrag();
      closeFilterMenu();
      closeCreateMenu();
      closeIssueMenu();
      closeAuxiliaryMenu();
      if (pollTimer !== null) {
        clearInterval(pollTimer);
        pollTimer = null;
      }
      if (panel) panel.hidden = true;
      restoreNative();
      ensureEntry();
    }

    function findThreadRow(expected) {
      return Array.from(document.querySelectorAll(SELECTORS.threadRow)).find(item => nativeThreadId(item) === expected);
    }

    function currentRouteThreadId() {
      const match = location.pathname.match(/\/local\/([^/?#]+)/);
      if (!match) return "";
      try {
        return normalizeSessionId(decodeURIComponent(match[1]));
      } catch {
        return "";
      }
    }

    function activeThreadId() {
      const activeRow = Array.from(document.querySelectorAll(SELECTORS.threadRow)).find(item => item.getAttribute(ATTRIBUTES.threadActive) === "true");
      return activeRow ? nativeThreadId(activeRow) : "";
    }

    function syncSessionHandoffFromHost() {
      const threadId = currentRouteThreadId() || activeThreadId();
      if (!threadId) return;
      const issue = state.issues.find(candidate => issueSessionId(candidate) === threadId && !candidate.session_owned && !candidate.session_handoff_at);
      if (!issue || sessionHandoffPending.has(issue.id)) return;
      sessionHandoffPending.add(issue.id);
      void api("/api/issues/" + encodeURIComponent(issue.id) + "/session-handoff", { method: "POST", body: JSON.stringify({ thread_id: threadId }) })
        .then(updated => {
          const index = state.issues.findIndex(candidate => candidate.id === issue.id);
          if (index >= 0) state.issues[index] = { ...state.issues[index], ...updated };
          const dialog = document.getElementById("better-codex-dialog");
          if (dialog?.dataset.issueId === issue.id && typeof dialog.__betterCodexSyncIssue === "function") dialog.__betterCodexSyncIssue(updated);
          if (active) render();
        })
        .catch(() => {})
        .finally(() => sessionHandoffPending.delete(issue.id));
    }

    async function waitForThreadOpen(expected) {
      const deadline = Date.now() + THREAD_OPEN_TIMEOUT_MS;
      let clickedRow = false;
      while (Date.now() < deadline) {
        const active = activeThreadId();
        if (active === expected) return { opened: true, via: "sidebar" };
        if (currentRouteThreadId() === expected) return { opened: true, via: "route" };
        const row = findThreadRow(expected);
        if (row && !clickedRow) {
          clickedRow = true;
          row.click();
        }
        await new Promise(resolve => setTimeout(resolve, THREAD_OPEN_POLL_MS));
      }
      throw new Error("thread_open_timeout");
    }

    async function openThread(threadId) {
      const expected = normalizeSessionId(threadId);
      if (!expected) throw new Error("thread_id_invalid");
      await resumePersistedThread(expected);
      const row = findThreadRow(expected);
      close();
      if (!row) window.postMessage({ type: NAVIGATION.messageType, path: NAVIGATION.threadRoutePrefix + encodeURIComponent(expected) }, window.location.origin);
      const result = await waitForThreadOpen(expected);
      close();
      return result;
    }

    function nativeThreadId(row) {
      const annotated = normalizeSessionId(row.getAttribute(ATTRIBUTES.threadId));
      if (annotated) return annotated;
      const fiberKey = Object.keys(row).find(key => key.startsWith("__reactFiber$"));
      let fiber = fiberKey ? row[fiberKey] : null;
      for (let depth = 0; fiber && depth < 40; depth += 1, fiber = fiber.return) {
        const conversationId = normalizeSessionId(fiber.memoizedProps?.conversationId);
        if (conversationId) return conversationId;
      }
      return "";
    }

    function isSidebarNavigationTarget(target) {
      if (!target.closest(SELECTORS.sidebarNavigation) || target.closest(SELECTORS.projectRow)) return false;
      const navigationItem = target.closest(SIDEBAR_NAVIGATION_ITEM) || target.closest(SELECTORS.threadRow);
      if (!navigationItem) return false;
      const nestedUtility = target !== navigationItem && target.matches("button,a,[role='button']") && target.getAttribute("aria-label");
      return !nestedUtility;
    }

    function onClick(event) {
      if (!active || suppressAgentOutside) return;
      const target = event.target?.closest?.("button,a,[role='button']," + SELECTORS.threadRow);
      if (!target || target === entry || target === scheduledEntry || target === scheduledMobileEntry || target === agentsEntry || target === projectsEntry || target === moreEntry || target === profileEntry || target === usageEntry || target === themeEntry || target.closest("#" + PANEL_ID) || target.closest("#better-codex-dialog") || target.closest("#better-codex-agent-dialog") || target.closest("#better-codex-scheduled-dialog") || target.closest("#better-codex-project-dialog") || target.closest("#better-codex-profile-dialog") || target.closest("#better-codex-avatar-picker")) return;
      if (Date.now() < suppressSessionClickUntil && target.closest(SELECTORS.threadRow)) {
        suppressSessionClickUntil = 0;
        event.preventDefault();
        event.stopImmediatePropagation();
        return;
      }
      if (isSidebarNavigationTarget(target)) close({ resume: true });
      else if (target.closest(SELECTORS.sidebarNavigation)) scheduleRefresh();
    }

    function refresh() {
      if (HOST_KIND === "web" && !hasFeature("project-management") && /^\/web\/projects(?:\/|$)/.test(location.pathname)) history.replaceState({ betterCodex: true, betterCodexSurface: "issues" }, "", "/web");
      const betterCodexRoute = isBetterCodexRoute();
      const entriesAvailable = ensureEntry();
      if (!entriesAvailable) {
        if (active && !betterCodexRoute) close({ resume: true, suppressRoute: false });
        if (!betterCodexRoute) routeSuppressed = false;
        return;
      }
      const resumeSurface = sessionStorage.getItem(RESUME_SURFACE_KEY);
      if (betterCodexRoute) routeSeen = true;
      if (!betterCodexRoute) routeSuppressed = false;
      syncSessionHandoffFromHost();
      if (active && routeSeen && !betterCodexRoute) return close({ resume: true, suppressRoute: false });
      if (!active && betterCodexRoute && !routeSuppressed && availableSurfaces.includes(resumeSurface)) return open(resumeSurface);
      if (active) mountPanel();
    }

    function scheduleRefresh() {
      if (refreshPending || destroyed) return;
      refreshPending = true;
      refreshTimer = setTimeout(() => {
        refreshTimer = null;
        refreshPending = false;
        if (destroyed) return;
        refresh();
      }, 50);
    }

    function destroy() {
      if (destroyed) return;
      destroyed = true;
      refreshPending = false;
      if (refreshTimer !== null) clearTimeout(refreshTimer);
      refreshTimer = null;
      if (pollTimer !== null) clearInterval(pollTimer);
      if (updateTimer !== null) clearInterval(updateTimer);
      if (relayTimer !== null) clearInterval(relayTimer);
      relayTimer = null;
      updateNoticeResizeObserver?.disconnect();
      updateNoticeResizeObserver = null;
      boardScrollResizeObserver?.disconnect();
      boardScrollResizeObserver = null;
      panelSizeCleanup?.();
      panelSizeCleanup = null;
      agentWindowBoundsObserver?.disconnect();
      agentWindowBoundsObserver = null;
      Array.from(completionNoticeDismissals.values()).forEach(dismissNotice => dismissNotice(false));
      completionNoticeTimers.forEach(timer => clearTimeout(timer));
      completionNoticeTimers.clear();
      completionNoticeDismissals.clear();
      completionNoticeStack?.remove();
      completionNoticeStack = null;
      issueSessionSnapshot.clear();
      sessionHandoffPending.clear();
      closeFilterMenu();
      closeIssueMenu();
      closeAuxiliaryMenu();
      const scheduledDialog = document.getElementById("better-codex-scheduled-dialog");
      if (scheduledDialog?.open) scheduledDialog.close();
      else scheduledDialog?.remove();
      observer?.disconnect();
      for (const pending of bridgeRequests.values()) {
        clearTimeout(pending.timer);
        pending.reject(new Error("injection_destroyed"));
      }
      bridgeRequests.clear();
      for (const pending of appServerRequests.values()) {
        clearTimeout(pending.timer);
        pending.reject(new Error("injection_destroyed"));
      }
      appServerRequests.clear();
      liveUnsubscribe?.();
      liveUnsubscribe = null;
      projectRefreshButton?.destroy();
      projectRefreshButton = null;
      destroyProjectRenderComponents();
      if (featureControllers) {
        featureControllers.agents.destroy();
        featureControllers.board.destroy();
        featureControllers.projects.destroy();
        featureControllers.scheduled.destroy();
        featureControllers.settings.destroy();
        featureControllers = null;
      }
      managedButtons.forEach(handle => handle.destroy());
      managedButtons.clear();
      document.removeEventListener("DOMContentLoaded", mount);
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("pointerdown", onSessionPointerDown, true);
      document.removeEventListener("pointermove", onSessionPointerMove, true);
      document.removeEventListener("pointerup", onSessionPointerUp, true);
      document.removeEventListener("pointercancel", onSessionPointerCancel, true);
      document.removeEventListener("keydown", onGlobalShortcut, true);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("online", onNetworkOnline);
      window.removeEventListener("codex-message-from-view", onHostMessageFromView, true);
      window.removeEventListener("message", onAppServerMessage, true);
      window.removeEventListener("error", onWindowError);
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
      window.removeEventListener("better-codex:error", onExternalError);
      window.removeEventListener("better-codex:profile-open", onUserProfileOpen);
      close();
      document.querySelectorAll('[' + OWNED + '="true"]').forEach(node => node.remove());
      ["light", "dark"].forEach(mode => ["canvas", "ink", "accent", "surface", "control", "raised", "hover", "pressed", "hairline", "font-ui"].forEach(token => document.documentElement.style.removeProperty("--bc-host-" + mode + "-" + token)));
      delete window.__betterCodexBridgeResolve;
      delete window.__betterCodexInjection__;
      errorDialog = null;
    }

    function mount() {
      document.removeEventListener("DOMContentLoaded", mount);
      if (destroyed || observer || !document.documentElement) return;
      observer = new MutationObserver(records => {
        destroyRemovedComponents(records);
        hydrateAddedIconButtons(records);
        scheduleRefresh();
      });
      observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ["data-theme", "aria-current", ATTRIBUTES.threadActive] });
      startLiveUpdates();
      refresh();
      void checkUpdateNotice();
      updateTimer = setInterval(() => { if (!document.hidden) void checkUpdateNotice(); }, 15000);
    }

    window.__betterCodexInjection__ = { version: VERSION, bundleChecksum: config.bundleChecksum, profile: PROFILE, host: HOST_KIND, endpoint: BASE_URL, refresh, pulse: () => true, open: openRoute, openThread, close, destroy, reportError: reportGlobalError };
    document.addEventListener("click", onClick, true);
    document.addEventListener("pointerdown", onSessionPointerDown, true);
    document.addEventListener("pointermove", onSessionPointerMove, true);
    document.addEventListener("pointerup", onSessionPointerUp, true);
    document.addEventListener("pointercancel", onSessionPointerCancel, true);
    document.addEventListener("keydown", onGlobalShortcut, true);
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("online", onNetworkOnline);
    window.addEventListener("codex-message-from-view", onHostMessageFromView, true);
    window.addEventListener("message", onAppServerMessage, true);
    window.addEventListener("error", onWindowError);
    window.addEventListener("unhandledrejection", onUnhandledRejection);
    window.addEventListener("better-codex:error", onExternalError);
    window.addEventListener("better-codex:profile-open", onUserProfileOpen);
    if (document.documentElement) mount();
    else document.addEventListener("DOMContentLoaded", mount, { once: true });
    return { installed: true, reused: false };
}
