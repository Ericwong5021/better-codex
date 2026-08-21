import { activeCompatibility, coreVersion } from "./compatibility.js";
import { betterCodexLogoPng } from "./brand-assets.js";
import { betterCodexProfile } from "./config.js";
import { betterCodexDesignSystemCss } from "./design-system.js";
import { renderMarkdown } from "./markdown.js";
import { betterCodexMcpRoute } from "./mcp-app.js";
import { featureManifest } from "./features.js";
import {
  ArrowLeft,
  ArrowLeftRight,
  ArrowUp,
  Archive,
  BookOpen,
  Bot,
  Bug,
  Calendar,
  Check,
  ChevronDown,
  ChevronRight,
  Circle,
  CircleCheckBig,
  CircleDashed,
  CircleDot,
  CircleHelp,
  CircleSlash2,
  Cloud,
  Columns3,
  Copy,
  Database,
  Ellipsis,
  ExternalLink,
  FileCode2,
  FlaskConical,
  FolderOpen,
  Folder,
  Hand,
  Image,
  LayoutTemplate,
  ListFilter,
  LoaderCircle,
  Maximize2,
  Minimize2,
  Minus,
  Paperclip,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  SearchCode,
  Server,
  ShieldCheck,
  SignalHigh,
  SignalLow,
  SignalMedium,
  SlidersHorizontal,
  Sparkles,
  Square,
  SquareKanban,
  Star,
  Tag,
  Terminal,
  TriangleAlert,
  Trash2,
  User,
  UserRoundCheck,
  UserRoundPen,
  UserRoundX,
  Wrench,
  X,
} from "lucide-static";

function lucideDefinition(svg: string) {
  const name = svg.match(/\blucide-([a-z0-9-]+)"/)?.[1];
  const nodes = svg.match(/<svg[^>]*>([\s\S]*?)<\/svg>/)?.[1].trim().replace(/<([a-z][\w:-]*)([^>]*?)\s*\/>/g, "<$1$2></$1>");
  if (!name || !nodes) throw new Error("invalid_lucide_icon");
  return { name, nodes };
}

const lucideIcons = Object.fromEntries(Object.entries({
  plus: Plus,
  send: ArrowUp,
  more: Ellipsis,
  filter: ListFilter,
  display: SlidersHorizontal,
  board: Columns3,
  back: ArrowLeft,
  switch: ArrowLeftRight,
  expand: Maximize2,
  shrink: Minimize2,
  close: X,
  paperclip: Paperclip,
  folder: Folder,
  tag: Tag,
  calendar: Calendar,
  user: User,
  userCheck: UserRoundCheck,
  userX: UserRoundX,
  userEdit: UserRoundPen,
  bot: Bot,
  image: Image,
  search: Search,
  review: SearchCode,
  layout: LayoutTemplate,
  bug: Bug,
  terminal: Terminal,
  wrench: Wrench,
  code: FileCode2,
  test: FlaskConical,
  docs: BookOpen,
  shield: ShieldCheck,
  permissionReadOnly: Hand,
  permissionWorkspace: FolderOpen,
  permissionDanger: TriangleAlert,
  database: Database,
  server: Server,
  cloud: Cloud,
  copy: Copy,
  external: ExternalLink,
  sparkles: Sparkles,
  star: Star,
  edit: Pencil,
  chevron: ChevronRight,
  chevronDown: ChevronDown,
  check: Check,
  circle: Circle,
  help: CircleHelp,
  dash: Minus,
  trash: Trash2,
  refresh: RefreshCw,
  stop: Square,
  archive: Archive,
  issues: SquareKanban,
  statusBacklog: CircleDashed,
  statusTodo: Circle,
  statusInProgress: LoaderCircle,
  statusInReview: CircleDot,
  statusDone: CircleCheckBig,
  statusBlocked: CircleSlash2,
  priorityNone: Minus,
  priorityLow: SignalLow,
  priorityMedium: SignalMedium,
  priorityHigh: SignalHigh,
}).map(([key, svg]) => [key, lucideDefinition(svg)]));

Object.assign(lucideIcons, {
  // Linear-style urgent mark (rounded square alert).
  priorityUrgent: {
    name: "priority-urgent",
    nodes: '<rect width="16" height="16" x="4" y="4" rx="2.5"></rect><path d="M12 8v4"></path><path d="M12 16h.01"></path>',
  },
});

const agentAvatarPresets = [
  { id: "reviewer", icon: "review", tone: "info", label: "代码审查" },
  { id: "frontend", icon: "layout", tone: "success", label: "前端实现" },
  { id: "debugger", icon: "bug", tone: "warning", label: "问题排查" },
  { id: "bot", icon: "bot", tone: "muted", label: "通用助手" },
  { id: "terminal", icon: "terminal", tone: "info", label: "终端工程" },
  { id: "wrench", icon: "wrench", tone: "warning", label: "修复工具" },
  { id: "code", icon: "code", tone: "success", label: "代码实现" },
  { id: "test", icon: "test", tone: "warning", label: "测试验证" },
  { id: "docs", icon: "docs", tone: "info", label: "文档写作" },
  { id: "shield", icon: "shield", tone: "success", label: "安全审查" },
  { id: "database", icon: "database", tone: "info", label: "数据与存储" },
  { id: "sparkles", icon: "sparkles", tone: "warning", label: "创意探索" },
] as const;

const suggestedAgents = [
  {
    key: "reviewer",
    name: "代码审查",
    name_en: "Code Review",
    description: "检查改动的正确性、回归风险和可维护性",
    instructions: [
      "你是代码审查智能体。目标不是重写实现，而是拦住会伤到正确性、回归、安全与可维护性的问题。",
      "",
      "审查时优先看：",
      "1. 行为是否与需求一致，边界条件和失败路径是否漏掉",
      "2. 是否引入回归、竞态、错误处理吞掉、状态不一致",
      "3. 安全与数据风险：注入、权限、密钥、路径穿越、不可信输入",
      "4. 可维护性：不必要抽象、重复逻辑、命名误导、隐式约定",
      "5. 测试缺口：关键路径是否缺少可复现的覆盖",
      "",
      "输出要求：",
      "- 先给结论：通过 / 需修改后再合",
      "- 按严重度列出问题：阻断、重要、建议",
      "- 每条问题写清：位置、原因、复现或触发条件、建议改法",
      "- 没有把握时明确标注假设，不要臆造未读到的代码行为",
      "- 不要大段复述代码；只引用必要片段",
    ].join("\n"),
    model: "gpt-5.6-sol",
    reasoning_effort: "high",
    icon: "review",
    tone: "info",
  },
  {
    key: "frontend",
    name: "前端实现",
    name_en: "Frontend Implementation",
    description: "负责 Codex 原生风格的界面实现与视觉验证",
    instructions: [
      "你是前端实现智能体。负责把需求做成符合现有产品气质的可上线界面，而不是另起一套视觉系统。",
      "",
      "实现原则：",
      "1. 先复用现有组件、token、布局和交互模式，再考虑新增样式",
      "2. 颜色、圆角、间距、阴影、字体都走设计 token；禁止散落魔法数",
      "3. 一个区块只做一件事；避免卡片堆叠、装饰性渐变、过度阴影",
      "4. 交互要完整：hover、focus-visible、disabled、空态、加载态、错误态",
      "5. 同时兼顾桌面和窄屏，不破坏现有信息层级",
      "",
      "完成标准：",
      "- 改动范围克制，只动完成任务所需的文件",
      "- 在真实渲染页面做视觉核对，不只看静态代码",
      "- 交付时说明改了哪些界面状态，以及如何本地验证",
      "- 若设计与现有系统冲突，优先对齐现有系统并指出取舍",
    ].join("\n"),
    model: "gpt-5.6-terra",
    reasoning_effort: "medium",
    icon: "layout",
    tone: "success",
  },
  {
    key: "debugger",
    name: "问题排查",
    name_en: "Troubleshooting",
    description: "定位崩溃、回归和异常行为的根因",
    instructions: [
      "你是问题排查智能体。先取证、再定根因，最后给最小修复；不要一上来大面积改代码。",
      "",
      "排查顺序：",
      "1. 明确期望行为、实际行为、首次出现版本/提交、复现步骤",
      "2. 收集证据：报错栈、日志、测试失败、相关 diff、配置和环境差异",
      "3. 形成 1-3 个可证伪假设，用最小实验逐个验证",
      "4. 锁定根因后，给影响面评估和最小修复方案",
      "5. 补上能防止复发的回归验证（测试或手工检查清单）",
      "",
      "输出要求：",
      "- 用「现象 / 根因 / 证据 / 修复 / 验证」结构回答",
      "- 区分已证实事实和推断",
      "- 如果暂时无法复现，说明缺口证据和下一步取证动作",
      "- 避免顺便重构；修复以外的清理单独列出，不默认执行",
    ].join("\n"),
    model: "gpt-5.6-sol",
    reasoning_effort: "high",
    icon: "bug",
    tone: "warning",
  },
];

export function injectionVersion() {
  return activeCompatibility().version;
}

export function injectionScript(port: number, accessToken: string, action: "install" | "uninstall", locale: "zh-CN" | "en" = "zh-CN", host: "codex" | "web" = "codex") {
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
  const betterCodexLogoUrl = `data:image/png;base64,${betterCodexLogoPng().toString("base64")}`;
  const helpModeMarkdown = JSON.stringify({
    "zh-CN": {
      manual: renderMarkdown("点击 {{start}}，或者在已完成的会话卡片中 {{send}} 新消息，智能体才会执行任务。"),
      auto: renderMarkdown("{{agent}} 会主动执行分配给自己的任务，但是不会执行 {{backlog}} 区域的任务。"),
    },
    en: {
      manual: renderMarkdown("Click {{start}}, or use {{send}} to post a new message in a completed conversation card. Only then will the agent run the task."),
      auto: renderMarkdown("{{agent}} automatically runs tasks assigned to it, but does not run {{backlog}} tasks."),
    },
  });
  return `(() => {
    "use strict";
    const VERSION = ${JSON.stringify(compatibility.version)};
    const CORE_VERSION = ${JSON.stringify(coreVersion)};
    const PROFILE = ${JSON.stringify(betterCodexProfile)};
    const HOST_KIND = ${JSON.stringify(host)};
    const HOST_CAPABILITIES = window.betterCodexHost?.capabilities || {};
    const READ_ONLY = HOST_CAPABILITIES.issues === "read-only";
    const AGENTS_READ_ONLY = HOST_CAPABILITIES.agents === "read-only";
    const REMOTE = window.betterCodexHost?.kind === "remote" || document.documentElement.dataset.betterCodexHost === "relay";
    if (READ_ONLY) document.documentElement.setAttribute("data-better-codex-read-only", "true");
    const HELP_MODE_MARKDOWN = ${helpModeMarkdown};
    const previous = window.__betterCodexInjection__;
    if (previous?.version === VERSION && previous?.endpoint === ${baseUrl} && previous?.profile === PROFILE && previous?.host === HOST_KIND && typeof previous?.pulse === "function") {
      previous.refresh();
      return { installed: true, reused: true };
    }
    previous?.destroy?.();

    const ENTRY_ID = "better-codex-entry";
    const AGENTS_ENTRY_ID = "better-codex-agents-entry";
    const PROJECTS_ENTRY_ID = "better-codex-projects-entry";
    const MORE_ENTRY_ID = "better-codex-more-entry";
    const PANEL_ID = "better-codex-panel";
    const STYLE_ID = "better-codex-style";
    const OWNED = "data-better-codex-owned";
    const HIDDEN = "data-better-codex-native-hidden";
    const HOST = "data-better-codex-page-host";
    const BASE_URL = ${baseUrl};
    const BRIDGE_TOKEN = ${bridgeToken};
    const BETTER_CODEX_LOGO_URL = ${JSON.stringify(betterCodexLogoUrl)};
    const INITIAL_LOCALE = ${JSON.stringify(locale)};
    const SELECTORS = HOST_KIND === "web" ? {
      sidebarScroll: "[data-app-action-sidebar-scroll]",
      sidebarSection: "[data-app-action-sidebar-section]",
      truncatedText: ".text-fade-truncate",
      contentFrame: ".app-shell-main-content-frame",
      contentLayout: "[data-app-shell-main-content-layout]",
      threadRow: "[data-app-action-sidebar-thread-id]",
      projectList: "[data-app-action-sidebar-project-list-id]",
      projectId: "[data-app-action-sidebar-project-id]",
      currentProjectRow: "[data-app-action-sidebar-project-row][aria-current=\\\"page\\\"]",
      projectRow: "[data-app-action-sidebar-project-row]",
      searchInput: "input[type=\\\"search\\\"]",
      sidebarNavigation: "aside nav[role=\\\"navigation\\\"]",
    } : ${JSON.stringify(compatibility.selectors)};
    const ATTRIBUTES = HOST_KIND === "web" ? {
      threadId: "data-app-action-sidebar-thread-id",
      threadActive: "data-app-action-sidebar-thread-active",
      projectListId: "data-app-action-sidebar-project-list-id",
      projectId: "data-app-action-sidebar-project-id",
      projectLabel: "data-app-action-sidebar-project-label",
    } : ${JSON.stringify(compatibility.attributes)};
    const NAVIGATION = HOST_KIND === "web" ? {
      messageType: "navigate-to-route",
      threadRoutePrefix: "/local/",
    } : ${JSON.stringify(compatibility.navigation)};
    const BETTER_CODEX_ROUTE = ${JSON.stringify(betterCodexMcpRoute)};
    const FEATURE_MANIFEST = ${JSON.stringify(featureManifest())};
    const ENABLED_FEATURES = new Set(FEATURE_MANIFEST.features.filter(feature => feature.enabled).map(feature => feature.id));
    const SIDEBAR_NAVIGATION_ITEM = SELECTORS.sidebarNavigationItem || ".sidebar-item";
    const LUCIDE_ICONS = ${JSON.stringify(lucideIcons)};
    const AGENT_AVATAR_PRESETS = ${JSON.stringify(agentAvatarPresets)};
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
    const availableSurfaces = ["issues", "agents", ...(hasFeature("project-management") ? ["projects"] : [])];
    const initialProjectRoute = hasFeature("project-management") ? webProjectRoute() : null;
    if (HOST_KIND === "web" && !hasFeature("project-management") && /^\\/web\\/projects(?:\\/|$)/.test(location.pathname)) history.replaceState({ betterCodex: true, betterCodexSurface: "issues" }, "", "/web");
    const state = { projects: [], projectsLoaded: false, issues: [], issuesLoaded: false, projectIssues: [], projectIssuesProjectId: "", projectDetailId: initialProjectRoute?.projectId || "", projectDocumentView: "charter", projectDocumentPending: null, projectDocumentError: null, agents: [], agentModelCatalog: [], agentModels: [], agentReasoningEfforts: [], user: { id: "", name: "你", email: "", handle: "", initials: "你", color: "#16a34a" }, projectId: "", search: "", agentSearch: "", agentView: "all", agentPane: "preview", selectedAgentId: "", agentDraft: null, agentInspectorWidth: Number.isFinite(rememberedAgentInspectorWidth) && rememberedAgentInspectorWidth > 0 ? rememberedAgentInspectorWidth : 0, surface: initialProjectRoute ? "projects" : availableSurfaces.includes(rememberedSurface) ? rememberedSurface : "issues", view: "all", autoDispatch: false, autoDispatchPending: false, schedulerModel: "gpt-5.6-sol", schedulerReasoningEffort: "high", mockup: false, keepCreate: rememberedKeepCreate, selected: null, error: "", systemLocale, languageSetting, locale: languageSetting === "system" ? systemLocale : languageSetting, filters: { status: [], priority: [], date: [], assignee: [], project: [], label: [] } };
    const pendingIssueRemovals = new Map();
    function webProjectRoute() {
      if (HOST_KIND !== "web") return null;
      const match = location.pathname.match(/^\\/web\\/projects(?:\\/([^/?#]+))?\\/?$/);
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
    function shortcutKeyFromCode(code, key) {
      const source = String(code || "");
      if (/^Key[A-Z]$/.test(source)) return source.slice(3);
      if (/^Digit[0-9]$/.test(source)) return source.slice(5);
      const names = { Space: "Space", Enter: "Enter", Tab: "Tab", Escape: "Escape", Backspace: "Backspace", Delete: "Delete", ArrowUp: "Up", ArrowDown: "Down", ArrowLeft: "Left", ArrowRight: "Right", Comma: "Comma", Period: "Period", Slash: "Slash", Backslash: "Backslash", Semicolon: "Semicolon", Quote: "Quote", BracketLeft: "BracketLeft", BracketRight: "BracketRight", Minus: "Minus", Equal: "Equal", Backquote: "Backquote", NumpadAdd: "NumpadAdd", NumpadSubtract: "NumpadSubtract", NumpadMultiply: "NumpadMultiply", NumpadDivide: "NumpadDivide", NumpadDecimal: "NumpadDecimal" };
      if (names[source]) return names[source];
      const value = String(key || "").trim();
      return value.length === 1 ? value.toUpperCase() : value.replace(/\\s+/g, "");
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
          requestId: typeof draft.requestId === "string" && draft.requestId.length <= 200 ? draft.requestId : ""
        };
      } catch {
        sessionStorage.removeItem(CREATE_DRAFT_KEY);
        return null;
      }
    }
    function writeCreateDraft(draft, requestId) {
      const cached = { mode: draft.mode, title: draft.title, description: draft.description, prompt: draft.prompt, requestId };
      if (![cached.title, cached.description, cached.prompt].some(value => value.trim())) {
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
      const imported = JSON.parse(await file.text());
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
    const localeResources = { en: {
      "调度失败": "Scheduling failed",
      "重试回复": "Retry reply", "重新加载": "Reload", "回复等待超时。请检查模型服务连接后重试。": "The reply timed out. Check the model service connection and retry.", "网络连接异常，回复未完成。请检查网络和 Better Codex Runtime 后重试。": "The reply did not finish because of a network problem. Check your network and Better Codex Runtime, then retry.", "当前权限不足，无法完成回复。请调整智能体权限或允许所需操作后重试。": "The reply needs additional permission. Adjust the agent permission or allow the required action, then retry.", "Better Codex Runtime 已停止。请重新启动后重试。": "Better Codex Runtime stopped. Restart it and retry.", "上一条回复仍在进行中。请稍后重新加载。": "The previous reply is still running. Reload shortly.", "回复未完成。请打开完整会话查看详情，然后重试。": "The reply did not finish. Open the full conversation for details, then retry.", "会话加载超时。请确认 Better Codex Runtime 正在运行，然后重新加载。": "The conversation timed out while loading. Make sure Better Codex Runtime is running, then reload.", "无法加载会话。请检查网络和 Better Codex Runtime，然后重新加载。": "Unable to load the conversation. Check your network and Better Codex Runtime, then reload.", "没有权限加载会话。请调整权限后重新加载。": "You do not have permission to load the conversation. Adjust the permission, then reload.",
      "任务看板": "Task board", "打开任务看板": "Open task board", "智能体": "Agents", "管理智能体": "Manage agents", "创建和管理你的智能体": "Create and manage your agents",
      "Better Codex 服务需要重启": "Better Codex needs to restart", "当前页面与后台服务的连接已失效。请在终端运行下面的命令，完成后重新连接。": "The connection between this page and the background service has expired. Run the command below in your terminal, then reconnect.", "复制重启命令": "Copy restart command", "复制消息": "Copy message", "已复制": "Copied", "重新连接": "Reconnect", "正在连接…": "Connecting…", "错误详情": "Error details",
      "全部": "All", "已分配": "Assigned", "未分配": "Unassigned", "待规划": "Backlog", "待办": "Todo", "进行中": "In progress", "待审核": "In review", "调度中": "Scheduling", "已完成": "Done", "已阻塞": "Blocked", "归档": "Archive", "拖到这里即可归档": "Drop here to archive", "查看已归档卡片": "View archived cards", "已归档任务": "Archived tasks", "搜索已归档任务": "Search archived tasks", "所有项目": "All projects", "全部删除": "Delete all", "删除已归档聊天": "Delete archived chat", "删除项目中的全部内容": "Delete all project content", "确定删除项目中的全部已归档任务吗？": "Delete all archived tasks in this project?", "取消归档": "Unarchive", "已归档卡片": "Archived cards", "暂无已归档卡片": "No archived cards", "归档列表加载失败": "Unable to load archived cards",
      "无": "None", "低": "Low", "中": "Medium", "高": "High", "紧急": "Urgent", "超高": "Extra high", "无优先级": "No priority", "优先级": "Priority", "状态": "Status", "日期": "Date", "筛选": "Filter", "标签": "Labels",
      "新建": "New", "新建 issue": "New issue", "新建任务": "New task", "新建智能体": "New agent", "创建": "Create", "创建任务": "Create task", "删除": "Delete", "删除任务": "Delete task", "删除智能体": "Delete agent", "保存": "Save", "确认": "Confirm", "取消": "Cancel", "关闭": "Close", "返回": "Back", "重试": "Retry", "稍后": "Later", "展开": "Expand", "全屏": "Full screen", "缩小": "Minimize", "退出全屏": "Exit full screen", "缩放头像": "Zoom avatar",
      "项目": "Project", "无项目": "No project", "选择项目": "Select project", "选择责任人": "Select owner", "选择执行智能体": "Select agent", "更多创建选项": "More creation options", "任务标题": "Task title", "添加描述...": "Add description...", "添加标签": "Add label", "添加附件": "Add attachment", "移除附件": "Remove attachment", "搜索任务": "Search tasks", "搜索项目": "Search projects", "搜索项目...": "Search projects...", "搜索智能体": "Search agents",
      "负责人": "Owner", "创建者": "Creator", "指定负责人": "Assign owner", "由我创建": "Created by me", "由我": "By me", "我": "Me", "你": "You", "未指派": "Not assigned", "未提供": "Not provided", "已同步": "Synced",
      "自动运行": "Auto-run", "手动运行": "Manual run", "切换为自动运行": "Switch to auto-run", "切换为手动运行": "Switch to manual run", "切换到智能体": "Switch to agents", "手动创建": "Manual creation", "通过智能体创建": "Create with agent", "运行模式说明": "Run mode", "帮助与设置": "Help and settings", "设置": "Settings", "快捷键": "Shortcuts", "快捷键设置": "Keyboard shortcuts", "为常用操作设置键盘快捷键。": "Set keyboard shortcuts for common actions.", "创建 Issue": "Create Issue", "打开创建 Issue 窗口": "Open the Create Issue window", "设置快捷键": "Set shortcut", "点击录入": "Click to record", "按下新的快捷键": "Press a new shortcut", "未设置": "Not set", "清除快捷键": "Clear shortcut", "关于": "About", "会话结束提醒": "Session completion alerts", "Issue 会话结束后在当前窗口显示提醒": "Show an alert in the current window when an issue session ends", "弹窗持续时间": "Popup duration", "1 秒": "1 second", "5 秒": "5 seconds", "10 秒": "10 seconds", "永久": "Permanent", "会话已结束": "Session ended", "通知": "Notifications", "语言": "Language", "界面语言": "Interface language", "选择 Better Codex 的界面语言": "Choose the language used by Better Codex", "调度": "Scheduling", "调度器模型": "Scheduler model", "这个模型用于 Issue 状态调度": "This model is used for Issue status routing", "调度器思考强度": "Scheduler reasoning effort", "这个强度用于 Issue 状态调度": "This level is used for Issue status routing", "跟随系统": "System", "中文": "Chinese", "软件更新": "Software updates", "更新状态": "Update status", "检查新版本": "Check for updates", "检查中…": "Checking…", "发现新版本": "Update available", "无法检查更新": "Unable to check", "版本信息": "Version info", "兼容版本": "Compatibility version", "运行状态": "Runtime status", "运行正常": "Running", "正在检查": "Checking", "已是最新版本": "Up to date", "从开始到完成，让 Codex 里的工作清晰可见。": "From start to finish, keep your work in Codex clear and visible.", "如果你喜欢 Better Codex，欢迎给我们一个 Star。": "If you like Better Codex, please give us a Star.", "最大并发": "Max concurrency", "模型": "Model", "推理": "Reasoning", "指令": "Instructions", "默认": "Default", "自定义": "Custom",
      "点击": "Click", "，或者在已完成的会话卡片中": ", or use", "新消息，智能体才会执行任务。": "to post a new message in a completed conversation card. Only then will the agent run the task.", "会主动执行分配给自己的任务，但是不会执行": "automatically runs tasks assigned to it, but does not run", "区域的任务。": "tasks.",
      "代码审查": "Code review", "问题排查": "Troubleshooting", "前端实现": "Frontend implementation", "文档写作": "Documentation", "创意探索": "Creative exploration", "终端工程": "Terminal engineering", "通用助手": "General assistant", "修复工具": "Fixer", "安全审查": "Security review", "测试验证": "Test verification", "插件": "Plugins", "数据与存储": "Data and storage", "检查改动的正确性、回归风险和可维护性": "Review changes for correctness, regression risk, and maintainability", "负责 Codex 原生风格的界面实现与视觉验证": "Build and visually verify interfaces in the native Codex style", "定位崩溃、回归和异常行为的根因": "Find the root cause of crashes, regressions, and unexpected behavior",
      "通用任务处理": "General task handling", "代码实现": "Code implementation", "最大": "Maximum", "极致": "Ultra", "发送": "Send", "副本": "Copy", "复制卡片": "Copy card", "更多操作": "More actions", "本次启动关闭": "Disable for this launch", "正在重启 Better Codex": "Restarting Better Codex", "正在下载并校验新版本，请保持 Codex 打开。": "Downloading and verifying the update. Keep Codex open.", "正在重启 Better Codex Runtime，稍后会自动恢复。": "Restarting Better Codex Runtime. It will recover shortly.", "Better Codex 已恢复到上一版本。": "Better Codex has been restored to the previous version.",
      "展示模式": "Mockup mode", "导出展示数据": "Export mockup data", "导入展示数据": "Import mockup data", "重置展示数据": "Reset mockup data", "重置布局": "Reset layout", "重置": "Reset", "恢复默认展示卡片和布局吗？": "Restore the default mockup cards and layout?", "展示数据不能超过 16 MB": "Mockup data cannot exceed 16 MB", "展示数据格式无效": "The mockup data format is invalid", "展示卡片缺少标题": "A mockup card is missing a title", "展示模式不支持此操作": "This action is not supported in mockup mode", "展示模式不会运行真实任务": "Mockup mode does not run real tasks", "任务不存在": "Task not found",
      "修复任务卡片拖拽错位": "Fix task card drag misalignment", "复现缩放状态下的卡片拖拽偏移，并修正坐标计算与落点反馈。": "Reproduce card drag offset while zoomed, then correct the coordinate calculation and drop feedback.", "重写首页首屏价值主张": "Rewrite the homepage value proposition", "提炼 Better Codex 的核心价值，让新访客快速理解产品用途。": "Clarify Better Codex's core value so new visitors quickly understand what it does.", "调研独立开发者工作流": "Research indie developer workflows", "整理从想法到交付的常见流程、主要痛点和决策节点。": "Document common flows, key pain points, and decision points from idea to delivery.", "整理本地安装步骤": "Organize local installation steps", "核对安装、启动与常见异常处理步骤，统一文档表达。": "Verify installation, startup, and common troubleshooting steps, then unify the documentation.", "优化首次启动加载速度": "Improve first-launch loading speed", "定位启动阶段主要耗时，缩短进入任务看板前的等待时间。": "Identify the main startup costs and shorten the wait before the task board opens.", "整理功能亮点短文案": "Write concise feature highlights", "为任务分派、会话协作和代码审核分别撰写简洁说明。": "Write concise descriptions for task assignment, conversation collaboration, and code review.", "对比三款任务看板体验": "Compare three task board experiences", "对比 Linear、Notion 和 Trello 的卡片密度、拖拽与筛选体验。": "Compare card density, drag and drop, and filtering in Linear, Notion, and Trello.", "撰写产品发布介绍": "Write a product launch introduction", "围绕目标用户、核心问题和使用方式准备公开发布稿。": "Prepare launch copy around target users, the core problem, and how the product is used.", "完善会话回复失败提示": "Improve failed reply messages", "梳理超时、网络异常和权限问题的提示文案与重试入口。": "Refine messages and retry paths for timeouts, network failures, and permission issues.", "优化空状态引导语": "Improve empty-state guidance", "重写空看板与空会话的标题、说明和首个行动提示。": "Rewrite the title, explanation, and first action prompt for empty boards and conversations.", "收集首批用户常见问题": "Collect early user FAQs", "汇总安装、任务分派、运行状态和数据存储相关问题。": "Compile questions about installation, task assignment, runtime status, and data storage.", "准备更新日志发布稿": "Prepare release notes", "整理本次新增、修复和已知限制，形成可直接发布的更新日志。": "Organize this release's additions, fixes, and known limitations into publish-ready notes.", "统一看板筛选状态": "Unify task board filter state", "检查筛选逻辑与顶部计数，确保切换后卡片结果同步更新。": "Check filter logic and the top count so card results update together after a change.", "检查 Windows 安装流程": "Check the Windows installation flow", "核对安装、启动、权限与卸载流程，记录关键异常。": "Verify installation, startup, permissions, and uninstall flows, and record key issues.", "起草用户访谈邀请信": "Draft a user interview invitation", "说明访谈目的、所需时间和隐私边界，给出清晰回复方式。": "Explain the interview purpose, time needed, and privacy boundaries, with a clear way to reply.", "归档版本发布资料": "Archive release materials", "整理版本说明、截图、校验结果和发布链接，方便后续复盘。": "Organize release notes, screenshots, verification results, and launch links for later review.", "性能": "Performance", "文案": "Copywriting", "调研": "Research", "文档": "Documentation", "写作": "Writing",
      "选择头像": "Choose avatar", "预设头像": "Preset avatars", "自定义": "Custom", "更换": "Change", "保存失败": "Save failed", "创建失败": "Creation failed", "加载失败": "Loading failed", "启动失败": "Start failed", "发送失败": "Send failed", "回复失败": "Reply failed", "回复": "Reply", "回复中": "Replying", "回复完成": "Reply completed", "回复进行中…": "Replying…", "回复已完成": "Reply completed", "等待对话": "Waiting for conversation", "加载中…": "Loading…", "正在加载任务看板": "Loading task board", "加载对话…": "Loading conversation…", "正在打开…": "Opening…", "在此回复智能体…": "Reply to the agent here…", "对话": "Conversation", "详情": "Details", "关闭详情": "Close details", "Issue 详情": "Issue details", "名称": "Name", "介绍": "Description", "智能体名称": "Agent name", "尚未添加介绍": "No description yet", "没有匹配的智能体": "No matching agents", "此分类暂无智能体": "No agents in this category",
      "裁剪头像": "Crop avatar", "拖动图片调整位置": "Drag the image to adjust its position", "正在更新": "Updating", "正在更新 Better Codex": "Updating Better Codex", "更新完成": "Update complete", "更新未完成": "Update incomplete", "稍后提醒": "Remind me later", "Better Codex 有新版本": "A new Better Codex version is available", "Better Codex 已是最新版本": "Better Codex is up to date", "Better Codex 保持当前版本运行。": "Better Codex will continue running on the current version.", "正在下载并校验新版本，请不要关闭 Codex。": "Downloading and verifying the update. Please do not close Codex.", "正在重启 Codex，稍后会自动恢复。": "Restarting Codex. It will resume shortly.", "刚刚完成检查，无需更新。": "Just checked. No update is needed.", "任务已完成": "Task completed", "知道了": "Got it", "关闭": "Close", "附带文件：": "Attached files:", "部分文件无法读取本地路径，已跳过": "Some files could not be read locally and were skipped", "当前环境无法读取本地文件路径": "The current environment cannot read local file paths", "无关联对话。": "No linked conversation.", "暂无对话，可在下方回复或打开完整对话。": "No conversation yet. Reply below or open the full conversation.", "图片不能超过 10 MB": "Images must be 10 MB or smaller", "请选择 PNG、JPEG 或 WebP 图片": "Choose a PNG, JPEG or WebP image", "无法读取这张图片": "Unable to read this image", "创建智能体 Issue 需要本地工作区：请先打开该项目下的一个 Codex 会话": "Creating an agent issue requires a local workspace. Open a Codex conversation in this project first.",
      "粘贴的图片": "Pasted image", "图片保存失败": "Unable to save the image",
      "创建任务": "Create task", "添加描述": "Add description", "展开描述": "Show more", "收起描述": "Show less", "新建 issue": "New issue", "项目": "Project", "状态": "Status", "优先级": "Priority", "选择项目": "Select project", "保存": "Save", "删除": "Delete",
      "对话链接无效。": "The conversation link is invalid.", "对话仍在加载，请稍后重试。": "The conversation is still loading. Try again shortly.", "任务正在执行，请先等待完成。": "The task is still running. Wait for it to finish first.", "任务仍在整理中，请稍后再编辑。": "The task is still being organized. Try editing it again shortly.", "当前为手动运行，请先点击“立即开始任务”。": "Manual run is enabled. Click “Start task now” first.", "待规划中的 Issue 不会自动触发任务，请先移出待规划区。": "Issues in Backlog do not trigger tasks automatically. Move it out of Backlog first.", "当前没有运行中的任务": "No agents are currently working", "查看运行中的任务": "View running tasks", "暂无任务": "No tasks", "未分配": "Unassigned", "已分配": "Assigned", "新建任务": "New task", "新建智能体": "New agent", "运行模式说明": "Run mode", "手动运行时，只有点击“立即开始任务”才会触发智能体任务。": "In manual mode, agent tasks start only after you click “Start task now”.", "自动运行时，只要 Issue 不在「待规划」区，你发送的新消息都会触发任务；「待规划」里的 Issue 不会自动触发。": "In auto-run mode, new messages trigger tasks unless the Issue is in Backlog; Issues in Backlog do not trigger tasks automatically.", "未关联对话。": "No linked conversation.",
      "确定删除任务 “": "Delete task “", "确定删除所有已归档任务吗？": "Delete all archived tasks?", "吗？": "”?", "创建后先由 ": "After creation, ", " 整理卡片，再自动开始工作。": " will organize the card and start working automatically.", "刚刚": "Just now", "分钟": "minutes", "小时": "hours", "天": "days", "更新于": "Updated", "个筛选": "filters", "个智能体工作中": "agents working", "条": "items",
      "代码实现": "Code implementation", "最近 24 小时": "Last 24 hours", "最近 7 天": "Last 7 days", "最近 30 天": "Last 30 days", "暂无可选项": "No options available", "清除筛选": "Clear filters", "复制本地 workdir 路径": "Copy local workdir path",
      "工作中": "Working", "排队中": "Queued", "理解中": "Thinking", "执行失败": "Execution failed", "已停止": "Stopped", "未开始": "Not started", "无法连接 Better Codex Runtime": "Unable to connect to Better Codex Runtime",
      "在会话中打开": "Open in conversation", "前往会话": "Open conversation", "请前往会话继续对话": "Continue in the conversation", "任务正在进行中": "Task is running", "立即开始任务": "Start task now", "切换到手动": "Switch to manual", "继续创建": "Keep creating", "指派给": "Assign to", "可选": "Optional", "建议": "Suggestions", "开始对话": "Start the conversation", "补充下一步要求，智能体会继续处理。": "Add your next request and the agent will continue.", "在下方输入消息并发送": "Type a message below and send it", "正在处理任务": "Working on the task", "智能体回复产生后会显示在这里。": "The agent's response will appear here when available.", "请稍候": "Please wait", "输入下一步要求…": "Enter your next request…", "调整侧边栏宽度": "Resize sidebar",
      "头像": "Avatar", "上传图片": "Upload image", "使用此头像": "Use this avatar", "点击选择预设图标，或上传图片": "Choose a preset icon or upload an image", "从预设图标中选择，也可以上传图片": "Choose a preset icon or upload an image", "创建智能体": "Create agent", "Codex 默认智能体": "Default Codex agent", "说明这个智能体适合承担什么工作": "Describe what this agent is good at", "定义职责、工作方式和输出要求": "Define responsibilities, workflow, and output requirements", "权限": "Permissions", "只读": "Read-only", "工作区可写": "Workspace write access", "完全访问": "Full access", "仅可读取工作区文件，不能修改": "Can read workspace files but cannot modify them", "可修改当前工作区内的文件": "Can modify files in the current workspace", "可不受限制地访问互联网和电脑上的任何文件": "Unrestricted access to the internet and files on this computer",
      "已经执行过对话的 Issue 只能修改状态、优先级和指派人。": "Issues with an executed conversation can only change status, priority, and assignee.", "终止任务后才能打开对话，是否终止任务？": "The task must be stopped before opening the conversation. Stop it now?", "终止并打开": "Stop and open", "正在终止…": "Stopping…", "忽略当前版本": "Ignore this version", "立即更新": "Update now", "暂无项目": "No projects", "告诉智能体要做什么，例如：“修复项目里任务运行状态不可见的问题”": "Tell the agent what to do, for example: “Fix the invisible task run status in the project”"
    } };
    localeResources.en["创建新项目"] = "Create new project";
    localeResources.en["浏览本机文件夹"] = "Browse folders on this device";
    localeResources.en["更改文件夹"] = "Change folder";
    localeResources.en["目录路径"] = "Folder path";
    localeResources.en["上一级"] = "Up one level";
    localeResources.en["主目录"] = "Home";
    localeResources.en["文件系统"] = "File system";
    localeResources.en["前往"] = "Go";
    localeResources.en["打开文件夹"] = "Open folder";
    localeResources.en["选择当前文件夹"] = "Choose this folder";
    localeResources.en["正在读取文件夹…"] = "Loading folders…";
    localeResources.en["这个文件夹中没有子文件夹"] = "This folder has no subfolders";
    localeResources.en["仅显示前 500 个文件夹"] = "Showing the first 500 folders";
    localeResources.en["无法读取文件夹"] = "Unable to read this folder";
    localeResources.en["本机 Runtime 版本不支持远程文件夹浏览"] = "The local Runtime does not support remote folder browsing";
    localeResources.en["文件不能超过 10 MB"] = "Files must be 10 MB or smaller";
    localeResources.en["部分文件超过 10 MB，已跳过"] = "Some files larger than 10 MB were skipped";
    localeResources.en["最多传输 4 个文件且总大小不能超过 20 MB"] = "Transfer up to 4 files with a total size of 20 MB or less";
    localeResources.en["部分文件超出传输限制，已跳过"] = "Some files exceeded the transfer limits and were skipped";
    localeResources.en["无法读取文件"] = "Unable to read the file";
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
      "创建项目": "Create project",
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
    });
    Object.assign(localeResources.en, {
      "错误报告": "Error report",
      "发生了一个错误": "An error occurred",
      "完整错误、请求信息和相关日志已保留，可直接复制给开发者。": "The full error, request details, and related logs are ready to copy.",
      "上一条": "Previous",
      "下一条": "Next",
      "复制当前错误": "Copy current error",
      "复制全部错误": "Copy all errors",
      "移除当前错误": "Remove current error",
      "复制失败": "Copy failed",
      "列表数据暂时无法读取，请稍后重试。": "List data is temporarily unavailable. Try again shortly.",
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
    let agentsEntry = null;
    let projectsEntry = null;
    let auxiliaryNavigation = null;
    let moreEntry = null;
    let auxiliaryMenu = null;
    let auxiliaryMenuDismiss = null;
    let panel = null;
    let observer = null;
    let refreshPending = false;
    let refreshTimer = null;
    let pollTimer = null;
    let liveUnsubscribe = null;
    let liveDirty = false;
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
    let routeSeen = false;
    let routeSuppressed = false;
    let destroyed = false;

    function label(value) {
      return String(value || "").replace(/\\s+/g, " ").trim().toLowerCase();
    }

    function escapeHtml(value) {
      return String(value ?? "").replace(/[&<>\"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\\\"": "&quot;", "'": "&#39;" })[character]);
    }

    function t(value) {
      const source = String(value ?? "");
      if (state.locale === "zh-CN" || !/[\\p{Script=Han}]/u.test(source)) return source;
      const leading = source.match(/^\\s*/)?.[0] || "";
      const trailing = source.match(/\\s*$/)?.[0] || "";
      const core = source.slice(leading.length, source.length - trailing.length || undefined);
      if (localeResources.en[core]) return leading + localeResources.en[core] + trailing;
      if (core === "更多操作") return leading + "More actions" + trailing;
      if (core === "本次启动关闭") return leading + "Disable for this launch" + trailing;
      let match = core.match(/^(\\d+) 个智能体工作中$/);
      if (match) return leading + match[1] + (match[1] === "1" ? " agent working" : " agents working") + trailing;
      match = core.match(/^(\\d+) 个筛选$/);
      if (match) return leading + match[1] + (match[1] === "1" ? " filter" : " filters") + trailing;
      match = core.match(/^(\\d+) 个任务$/);
      if (match) return leading + match[1] + (match[1] === "1" ? " task" : " tasks") + trailing;
      match = core.match(/^(\\d+) 条$/);
      if (match) return leading + match[1] + (match[1] === "1" ? " message" : " messages") + trailing;
      match = core.match(/^更新于 (.+)$/);
      if (match) return leading + "Updated " + t(match[1]) + trailing;
      match = core.match(/^归档于 (.+)$/);
      if (match) return leading + "Archived " + t(match[1]) + trailing;
      match = core.match(/^(\\d+) 分钟前$/);
      if (match) return leading + match[1] + (match[1] === "1" ? " minute ago" : " minutes ago") + trailing;
      match = core.match(/^(\\d+) 小时前$/);
      if (match) return leading + match[1] + (match[1] === "1" ? " hour ago" : " hours ago") + trailing;
      match = core.match(/^(\\d+) 天前$/);
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
      const enrichmentPending = issue?.enrichment_status === "pending";
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
      style.textContent = \`
        #\${ENTRY_ID}[aria-current="page"], #\${AGENTS_ENTRY_ID}[aria-current="page"], #\${PROJECTS_ENTRY_ID}[aria-current="page"], #\${MORE_ENTRY_ID}[aria-current="page"] { background: var(--color-background-primary-soft-active, var(--color-token-list-hover-background, color-mix(in srgb, currentColor 8%, transparent))); }
        html[data-better-codex-open="true"] \${SELECTORS.sidebarNavigation} [aria-current="page"]:not(#\${ENTRY_ID}):not(#\${AGENTS_ENTRY_ID}):not(#\${PROJECTS_ENTRY_ID}):not(#\${MORE_ENTRY_ID}) { background: transparent !important; }
        html[data-better-codex-open="true"] \${SELECTORS.sidebarNavigation} [aria-current="page"]:not(#\${ENTRY_ID}):not(#\${AGENTS_ENTRY_ID}):not(#\${PROJECTS_ENTRY_ID}):not(#\${MORE_ENTRY_ID}) .text-token-list-active-selection-foreground { color: var(--color-token-foreground) !important; }
        [\${HOST}="true"] { position: relative !important; z-index: 31 !important; pointer-events: none !important; }
        [\${HIDDEN}="true"] { visibility: hidden !important; pointer-events: none !important; }
        html { --bc-page: oklch(.988087 0 0); --bc-surface: oklch(1 0 0); --bc-raised: oklch(1 0 0); --bc-hover: oklch(.967 .001 286.375); --bc-selected: oklch(.95 .002 286.375); --bc-foreground: oklch(.141 .005 285.823); --bc-muted: oklch(.505 .016 285.938); --bc-faint: oklch(.606 .016 285.938); --bc-border: oklch(.92 .004 286.32); --bc-divider: oklch(.945 .003 286.32); --bc-input: oklch(.92 .004 286.32); --bc-ring: oklch(.705 .015 286.067); --bc-primary: oklch(.21 .006 285.885); --bc-primary-foreground: oklch(.985 0 0); --bc-warning: oklch(.75 .16 85); --bc-success: oklch(.55 .16 145); --bc-info: oklch(.55 .18 250); --bc-danger: oklch(.577 .245 27.325); --bc-priority-none: oklch(.62 .01 286); --bc-priority-low: oklch(.55 .1 250); --bc-priority-medium: oklch(.76 .15 95); --bc-priority-high: oklch(.68 .18 52); --bc-priority-urgent: var(--bc-danger); --bc-surface-shadow: 0 1px 2px rgb(15 23 42 / .04),0 1px 1px rgb(15 23 42 / .03); --bc-card-shadow: 0 1px 3px rgb(15 23 42 / .10); --bc-floating-shadow: 0 16px 40px rgb(15 23 42 / .14),0 3px 10px rgb(15 23 42 / .08); --bc-menu-shadow: 0 8px 24px rgb(15 23 42 / .08),0 2px 6px rgb(15 23 42 / .05); --bc-scrim: rgb(24 24 27 / .22); color-scheme: light; }
        html.electron-dark, html.dark, html[data-theme="dark"] { --bc-page: oklch(.18 .005 285.823); --bc-surface: oklch(.21 .006 285.885); --bc-raised: oklch(.235 .007 285.885); --bc-hover: oklch(.274 .006 286.033); --bc-selected: oklch(.3 .006 286.033); --bc-foreground: oklch(.985 0 0); --bc-muted: oklch(.705 .015 286.067); --bc-faint: oklch(.60 .015 286.067); --bc-border: oklch(1 0 0 / 10%); --bc-divider: oklch(1 0 0 / 6%); --bc-input: oklch(1 0 0 / 15%); --bc-ring: oklch(.552 .016 285.938); --bc-primary: oklch(.92 .004 286.32); --bc-primary-foreground: oklch(.21 .006 285.885); --bc-warning: oklch(.70 .16 85); --bc-success: oklch(.65 .15 145); --bc-info: oklch(.65 .18 250); --bc-danger: oklch(.704 .191 22.216); --bc-priority-none: oklch(.68 .01 286); --bc-priority-low: oklch(.68 .1 250); --bc-priority-medium: oklch(.78 .14 95); --bc-priority-high: oklch(.74 .16 52); --bc-priority-urgent: var(--bc-danger); --bc-surface-shadow: 0 1px 2px rgb(0 0 0 / .2),0 1px 1px rgb(0 0 0 / .16); --bc-card-shadow: 0 0 0 1px rgb(255 255 255 / .03); --bc-floating-shadow: 0 20px 48px rgb(0 0 0 / .46),0 4px 12px rgb(0 0 0 / .28); --bc-menu-shadow: 0 10px 28px rgb(0 0 0 / .3),0 2px 8px rgb(0 0 0 / .18); --bc-scrim: rgb(0 0 0 / .5); color-scheme: dark; }
        #\${PANEL_ID} { position: absolute; inset: 0; z-index: 2; display: flex; min-width: 0; min-height: 0; flex-direction: column; overflow: hidden; color: var(--color-text-foreground, inherit); background: var(--color-background-surface, var(--wb-surface-primary, var(--color-token-bg-primary, Canvas))); pointer-events: auto; -webkit-app-region: no-drag !important; }
        #\${PANEL_ID}[hidden] { display: none !important; }
        #better-codex-update-notice { position: fixed; right: 16px; bottom: 16px; z-index: 2147483000; display: flex; width: min(420px,calc(100vw - 32px)); max-width: 100%; min-width: 0; box-sizing: border-box; align-items: flex-start; gap: 6px; padding: 8px; color: var(--color-token-foreground, var(--bc-foreground)); background: var(--color-token-dropdown-background, var(--bc-raised)); border: 1px solid var(--color-token-border, var(--bc-border)); border-radius: 16px; box-shadow: var(--shadow-lg, 0 4px 12px rgb(0 0 0 / .1)); font-family: var(--font-sans, var(--bc-font-ui)); font-size: var(--font-size-base, var(--bc-text-base)); line-height: 1.4; animation: better-codex-update-enter .25s cubic-bezier(.175,.885,.32,1); }
        #better-codex-update-notice .better-codex-update-close, #better-codex-update-notice .better-codex-update-menu-toggle { position: static; display: inline-flex; width: 16px; height: 16px; flex: 0 0 16px; align-items: center; justify-content: center; margin-top: 2px; border: 0; border-radius: 999px; color: var(--color-token-foreground, var(--bc-foreground)); background: transparent; padding: 0; opacity: .5; cursor: pointer; }
        #better-codex-update-notice .better-codex-update-menu-toggle { order: 3; }
        #better-codex-update-notice .better-codex-update-close { order: 4; }
        #better-codex-update-notice .better-codex-update-menu { position: absolute; top: 34px; right: 8px; z-index: 2; min-width: 148px; box-sizing: border-box; padding: 4px; border: 1px solid var(--color-token-border, var(--bc-border)); border-radius: 10px; color: var(--color-token-foreground, var(--bc-foreground)); background: var(--color-token-dropdown-background, var(--bc-raised)); box-shadow: var(--shadow-lg, var(--bc-menu-shadow)); }
        #better-codex-update-notice .better-codex-update-menu[hidden] { display: none; }
        #better-codex-update-notice .better-codex-update-menu button { display: flex; width: 100%; min-height: 34px; align-items: center; border: 0; border-radius: 7px; padding: 0 10px; color: inherit; background: transparent; font: inherit; font-size: var(--bc-text-sm); text-align: left; cursor: pointer; }
        #better-codex-update-notice .better-codex-update-layout { display: flex; min-width: 0; flex: 1; align-items: flex-start; gap: 6px; }
        #better-codex-update-notice .better-codex-update-icon { display: inline-flex; width: 16px; height: 16px; flex: 0 0 16px; align-items: center; justify-content: center; margin-top: 2px; color: var(--color-token-foreground, var(--bc-foreground)); }
        #better-codex-update-notice .better-codex-update-icon svg { width: 16px; height: 16px; }
        #better-codex-update-notice[data-status="installing"] .better-codex-update-icon svg { animation: better-codex-update-spin 1s linear infinite; }
        #better-codex-update-notice .better-codex-update-copy { display: flex; min-width: 0; flex: 1; flex-direction: column; justify-content: center; gap: 2px; }
        #better-codex-update-notice .better-codex-update-title { margin: 0; color: var(--color-token-foreground, var(--bc-foreground)); font-size: inherit; font-weight: 500; line-height: 1.4; }
        #better-codex-update-notice .better-codex-update-description { margin: 0; color: var(--color-token-text-secondary, var(--bc-muted)); font-size: var(--font-size-small, var(--bc-text-sm)); line-height: 1.4; text-wrap: pretty; }
        #better-codex-update-notice .better-codex-update-error { margin: 4px 0 0; color: var(--bc-danger); font-size: var(--font-size-small, var(--bc-text-sm)); line-height: 1.4; }
        #better-codex-update-notice .better-codex-update-actions { display: flex; flex: 0 0 auto; align-items: center; gap: 6px; margin: 0 2px 0 6px; }
        #better-codex-update-notice .better-codex-update-button { display: inline-flex; min-height: 32px; align-items: center; justify-content: center; border: 0; border-radius: 999px; padding: 0 10px; color: var(--color-token-foreground, var(--bc-foreground)); background: var(--color-token-button-secondary-background, var(--bc-hover)); font: inherit; font-size: var(--font-size-small, var(--bc-text-sm)); font-weight: 600; cursor: pointer; transition: transform .15s,color .15s,background-color .15s; }
        #better-codex-update-notice .better-codex-update-button.is-primary { color: var(--color-token-background-primary, var(--bc-primary-foreground)); background: var(--color-token-foreground, var(--bc-primary)); }
        #better-codex-update-notice .better-codex-update-button:active { transform: scale(.96); }
        #better-codex-update-notice .better-codex-update-button:focus-visible, #better-codex-update-notice .better-codex-update-close:focus-visible, #better-codex-update-notice .better-codex-update-menu-toggle:focus-visible { outline: 2px solid var(--color-token-focus-border, var(--bc-ring)); outline-offset: 2px; }
        #better-codex-update-notice .better-codex-update-button:disabled, #better-codex-update-notice .better-codex-update-close:disabled { cursor: default; opacity: .48; }
        @keyframes better-codex-update-enter { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes better-codex-update-spin { to { transform: rotate(360deg); } }
        @media (hover: hover) { #better-codex-update-notice .better-codex-update-close:hover, #better-codex-update-notice .better-codex-update-menu-toggle:hover { color: var(--color-token-foreground, var(--bc-foreground)); background: color-mix(in srgb,var(--color-token-button-secondary-hover-background, var(--bc-hover)) 5%,transparent); opacity: .8; } #better-codex-update-notice .better-codex-update-menu button:hover { background: var(--color-token-button-secondary-hover-background, var(--bc-hover)); } #better-codex-update-notice .better-codex-update-button:hover { background: var(--color-token-button-secondary-hover-background, var(--bc-selected)); } #better-codex-update-notice .better-codex-update-button.is-primary:hover { background: color-mix(in srgb,var(--color-token-foreground, var(--bc-primary)) 90%,var(--bc-surface)); } }
        @media (prefers-reduced-motion: reduce) { #better-codex-update-notice, #better-codex-update-notice[data-status="installing"] .better-codex-update-icon svg { animation: none; } }
        #better-codex-completion-notices { position: fixed; right: 16px; bottom: var(--bc-completion-notice-bottom, 16px); z-index: 2147483000; display: flex; max-width: calc(100vw - 32px); flex-direction: column; align-items: flex-end; gap: 8px; pointer-events: none; transition: bottom .2s cubic-bezier(.16,1,.3,1); }
        .better-codex-completion-notice { position: relative; display: flex; width: max-content; max-width: min(420px,calc(100vw - 32px)); min-height: 40px; box-sizing: border-box; align-items: center; gap: 8px; padding: 6px 6px 6px 12px; color: var(--color-token-foreground, var(--bc-foreground)); background: var(--color-token-bg-primary, var(--color-background-surface, var(--bc-raised))); border: 1px solid var(--color-token-border, color-mix(in srgb,var(--color-token-foreground, var(--bc-foreground)) 12%,transparent)); border-radius: 10px; box-shadow: var(--shadow-md, 0 8px 24px rgb(0 0 0 / .12)); font-family: var(--font-sans, var(--bc-font-ui)); font-size: var(--font-size-small, var(--bc-text-sm)); cursor: pointer; pointer-events: auto; animation: better-codex-completion-enter .28s cubic-bezier(.16,1,.3,1); }
        .better-codex-completion-notice .better-codex-completion-layout { display: flex; min-width: 0; align-items: center; gap: 8px; }
        .better-codex-completion-notice .better-codex-completion-avatar { width: 24px; height: 24px; flex: 0 0 auto; border-radius: 6px; overflow: hidden; }
        .better-codex-completion-notice .better-codex-completion-avatar img, .better-codex-completion-notice .better-codex-completion-avatar svg { width: 100%; height: 100%; display: block; object-fit: cover; }
        .better-codex-completion-notice .better-codex-completion-avatar.is-fallback { display: inline-flex; align-items: center; justify-content: center; color: var(--color-token-text-secondary, var(--bc-muted)); background: var(--color-token-bg-secondary, var(--bc-hover)); }
        .better-codex-completion-notice .better-codex-completion-avatar.is-fallback svg { width: 14px; height: 14px; }
        .better-codex-completion-notice .better-codex-completion-message { min-width: 0; margin: 0; overflow: hidden; line-height: 1.4; text-overflow: ellipsis; white-space: nowrap; }
        .better-codex-completion-notice .better-codex-completion-status { flex: 0 0 auto; border-radius: 999px; padding: 2px 7px; color: var(--color-token-text-secondary, var(--bc-muted)); background: var(--color-token-bg-secondary, var(--bc-hover)); font-size: 11px; font-weight: 500; line-height: 1.4; }
        .better-codex-completion-notice .better-codex-completion-menu-toggle, .better-codex-completion-notice .better-codex-completion-close { display: inline-flex; width: 28px; height: 28px; flex: 0 0 auto; align-items: center; justify-content: center; border: 0; border-radius: 7px; color: var(--color-token-text-secondary, var(--bc-muted)); background: transparent; cursor: pointer; }
        .better-codex-completion-notice .better-codex-completion-menu { position: absolute; right: 38px; bottom: 38px; z-index: 2; min-width: 148px; box-sizing: border-box; padding: 4px; border: 1px solid var(--color-token-border, var(--bc-border)); border-radius: 8px; color: var(--color-token-foreground, var(--bc-foreground)); background: var(--color-token-bg-primary, var(--bc-raised)); box-shadow: var(--shadow-md, var(--bc-menu-shadow)); }
        .better-codex-completion-notice .better-codex-completion-menu[hidden] { display: none; }
        .better-codex-completion-notice .better-codex-completion-menu button { display: flex; width: 100%; min-height: 32px; align-items: center; border: 0; border-radius: 6px; padding: 0 9px; color: inherit; background: transparent; font: inherit; font-size: inherit; text-align: left; cursor: pointer; }
        .better-codex-completion-notice button:focus-visible { outline: 2px solid var(--color-token-focus-ring, var(--bc-ring)); outline-offset: 1px; }
        @keyframes better-codex-completion-enter { from { opacity: 0; translate: 0 18px; } to { opacity: 1; translate: 0 0; } }
        @media (hover: hover) { .better-codex-completion-notice :is(.better-codex-completion-menu-toggle, .better-codex-completion-close):hover, .better-codex-completion-notice .better-codex-completion-menu button:hover { color: var(--color-token-foreground, var(--bc-foreground)); background: var(--color-token-bg-secondary, var(--bc-hover)); } }
        @media (prefers-reduced-motion: reduce) { .better-codex-completion-notice { animation: none; } }
        #\${PANEL_ID} { font-family: var(--bc-font-ui); background: var(--bc-page); }
        #\${PANEL_ID} .better-codex-error { margin-left: auto; color: var(--bc-danger); font-size: var(--bc-text-sm); }
        #\${PANEL_ID} .better-codex-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 10px; min-height: 50px; padding: 0 18px; background: #fcfcfc; }
        #\${PANEL_ID} .better-codex-tabs, #\${PANEL_ID} .better-codex-actions { display: flex; align-items: center; gap: 4px; }
        #\${PANEL_ID} .better-codex-button, #better-codex-dialog .better-codex-button { display: inline-flex; flex: 0 0 auto; width: auto; min-height: var(--bc-control-height, 32px); align-items: center; justify-content: center; gap: 6px; border: 1px solid transparent; border-radius: 7px; color: #52525b; background: transparent; padding: 0 9px; font: inherit; font-size: var(--bc-text-md); cursor: pointer; }
        #\${PANEL_ID} .better-codex-button:hover, #better-codex-dialog .better-codex-button:hover { background: #f0f0f1; }
        #\${PANEL_ID} .better-codex-button.is-active { color: #18181b; background: #f0f0f1; font-weight: 550; }
        #\${PANEL_ID} .better-codex-button.is-bordered { border-color: var(--bc-border); background: var(--bc-surface); box-shadow: 0 1px 2px rgba(15,23,42,.03); }
        #\${PANEL_ID} .better-codex-working-chip.has-work { border-color: #f1d59c; color: #936512; background: #fffaf0; }
        #\${PANEL_ID} .better-codex-working-dot { width: 6px; height: 6px; margin-right: 6px; border-radius: 999px; background: currentColor; box-shadow: 0 0 0 3px rgba(216,155,22,.12); }
        #\${PANEL_ID} .better-codex-search { box-sizing: border-box; width: 142px; height: var(--bc-control-height, 32px); border: 1px solid var(--bc-border); border-radius: 7px; color: inherit; background: var(--bc-surface); padding: 0 9px; font: inherit; font-size: var(--bc-text-md); outline: none; }
        #\${PANEL_ID} .better-codex-search:focus { border-color: #b9b9bd; box-shadow: 0 0 0 2px rgba(24,24,27,.06); }
        #\${PANEL_ID} .better-codex-filter-wrap { position: relative; display: flex; }
        #\${PANEL_ID} .better-codex-filter-menu, #\${PANEL_ID} .better-codex-filter-submenu { position: absolute; z-index: 80; box-sizing: border-box; min-width: 164px; border: 1px solid #e4e4e7; border-radius: 9px; color: #27272a; background: #fff; padding: 5px; box-shadow: 0 10px 28px rgba(15,23,42,.14),0 2px 7px rgba(15,23,42,.08); }
        #\${PANEL_ID} .better-codex-filter-menu { top: calc(100% + 5px); right: 0; }
        #\${PANEL_ID} .better-codex-filter-submenu { min-width: 190px; }
        #\${PANEL_ID} .better-codex-filter-row { display: flex; width: 100%; min-height: 32px; align-items: center; gap: 9px; border: 0; border-radius: 6px; color: inherit; background: transparent; padding: 0 8px; font: inherit; font-size: var(--bc-text-md); text-align: left; cursor: pointer; }
        #\${PANEL_ID} .better-codex-filter-row:hover, #\${PANEL_ID} .better-codex-filter-row.is-active { background: #f1f1f2; }
        #\${PANEL_ID} .better-codex-filter-row svg { flex: 0 0 auto; }
        #\${PANEL_ID} .better-codex-filter-label { min-width: 0; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        #\${PANEL_ID} .better-codex-filter-count { color: #71717a; font-size: var(--bc-text-caption); }
        #\${PANEL_ID} .better-codex-filter-chevron { color: #71717a; font-size: var(--bc-text-icon); }
        #\${PANEL_ID} .better-codex-filter-check { width: 14px; color: #18181b; font-size: var(--bc-text-md); }
        #\${PANEL_ID} .better-codex-filter-separator { height: 1px; margin: 4px 2px; background: #ededee; }
        #better-codex-context-menu, #better-codex-context-menu .better-codex-context-submenu { box-sizing: border-box; width: max-content; border: 1px solid #e4e4e7; border-radius: 10px; color: #27272a; background: #fff; padding: 5px; box-shadow: 0 12px 32px rgba(15,23,42,.16),0 2px 8px rgba(15,23,42,.08); font-family: var(--bc-font-ui); }
        #better-codex-context-menu { position: fixed; z-index: 110; min-width: 188px; max-width: min(280px, calc(100vw - 24px)); }
        #better-codex-context-menu .better-codex-context-item-wrap { position: relative; }
        #better-codex-context-menu .better-codex-context-item { display: flex; width: 100%; min-height: 34px; align-items: center; gap: 9px; border: 0; border-radius: 6px; color: inherit; background: transparent; padding: 0 10px; font: inherit; font-size: var(--bc-text-md); text-align: left; cursor: pointer; white-space: nowrap; }
        #better-codex-context-menu .better-codex-context-item:hover, #better-codex-context-menu .better-codex-context-item:focus-visible, #better-codex-context-menu .better-codex-context-item-wrap:hover > .better-codex-context-item { background: #f1f1f2; outline: none; }
        #better-codex-context-menu .better-codex-context-item > span:last-of-type { min-width: 0; flex: 1; }
        #better-codex-context-menu .better-codex-status-icon, #better-codex-context-menu .better-codex-priority { width: 16px; height: 16px; flex: 0 0 auto; }
        #better-codex-context-menu .better-codex-context-item.is-danger { color: #ef4444; }
        #better-codex-context-menu .better-codex-context-divider { height: 1px; margin: 5px 3px; background: #ededee; }
        #better-codex-context-menu .better-codex-context-submenu { position: absolute; top: -5px; left: 100%; display: none; min-width: 148px; max-width: min(240px, calc(100vw - 24px)); max-height: min(320px, calc(100vh - 24px)); overflow-y: auto; }
        #better-codex-context-menu .better-codex-context-submenu.is-assignee { min-width: 214px; }
        #better-codex-context-menu[data-align="left"] .better-codex-context-submenu { right: 100%; left: auto; }
        #better-codex-context-menu .better-codex-context-item-wrap:hover > .better-codex-context-submenu, #better-codex-context-menu .better-codex-context-item-wrap:focus-within > .better-codex-context-submenu { display: block; }
        #better-codex-context-menu .better-codex-context-check { display: inline-flex; width: 14px; flex: 0 0 14px; align-items: center; justify-content: center; color: #18181b; }
        #better-codex-context-menu .better-codex-context-avatar { display: inline-flex; width: 16px; height: 16px; flex: 0 0 16px; align-items: center; justify-content: center; overflow: hidden; border-radius: 999px; color: #fff; background: #27272a; }
        #better-codex-context-menu .better-codex-context-avatar.is-codex { color: inherit; background: transparent; border-radius: 4px; }
        #better-codex-context-menu .better-codex-context-avatar.is-fallback, #better-codex-context-menu .better-codex-context-avatar.is-icon { color: var(--bc-muted, #71717a); background: #f2f2f3; }
        #better-codex-context-menu .better-codex-context-avatar img, #better-codex-context-menu .better-codex-context-avatar svg { display: block; width: 100%; height: 100%; object-fit: cover; }
        #better-codex-context-menu .better-codex-context-avatar.is-fallback svg, #better-codex-context-menu .better-codex-context-avatar.is-icon svg { width: 10px; height: 10px; margin: auto; }
        #better-codex-context-menu .better-codex-context-avatar.is-user.is-initials { color: #fff; font-size: 9px; font-weight: 700; line-height: 1; }
        #better-codex-context-menu .better-codex-context-assignee-label { display: inline-flex; min-width: 0; flex: 1; align-items: center; gap: 5px; overflow: hidden; }
        #better-codex-context-menu .better-codex-context-assignee-name { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        #better-codex-context-menu .better-codex-context-tag { flex: 0 0 auto; border-radius: 999px; padding: 1px 5px; font-size: 10px; font-weight: 650; line-height: 1.25; }
        #better-codex-context-menu .better-codex-context-tag[data-tone="model"] { color: #1684c4; background: #e8f5fc; }
        #better-codex-context-menu .better-codex-context-tag[data-tone="reasoning"] { color: #198754; background: #eaf7ef; }
        #\${PANEL_ID} .better-codex-board { display: flex; gap: 12px; min-height: 0; flex: 1; overflow-x: auto; overflow-y: hidden; padding: 0 16px 10px; }
        #\${PANEL_ID} .better-codex-board-loading { display: flex; min-width: 100%; min-height: 100%; align-items: center; justify-content: center; flex-direction: column; gap: 12px; color: var(--bc-muted); font-size: var(--bc-text-sm); }
        #\${PANEL_ID} .better-codex-board-loading > span { width: 24px; height: 24px; box-sizing: border-box; border: 2px solid var(--bc-border); border-top-color: var(--bc-foreground); border-radius: 50%; animation: better-codex-board-loading-spin .8s linear infinite; }
        #\${PANEL_ID} .better-codex-board-loading strong { font-weight: 560; }
        @keyframes better-codex-board-loading-spin { to { transform: rotate(360deg); } }
        #\${PANEL_ID} .better-codex-column { box-sizing: border-box; display: flex; width: 280px; min-width: 280px; min-height: 200px; flex-direction: column; border-radius: 12px; padding: 8px; }
        #\${PANEL_ID} .better-codex-column[data-status="backlog"], #\${PANEL_ID} .better-codex-column[data-status="todo"], #\${PANEL_ID} .better-codex-column[data-status="archive"] { background: rgba(228,228,231,.42); }
        #\${PANEL_ID} .better-codex-column[data-status="in_progress"] { background: rgba(245,181,45,.07); }
        #\${PANEL_ID} .better-codex-column[data-status="in_review"] { background: rgba(46,156,90,.07); }
        #\${PANEL_ID} .better-codex-column[data-status="done"] { background: rgba(37,131,216,.07); }
        #\${PANEL_ID} .better-codex-column[data-status="blocked"] { background: rgba(229,72,77,.07); }
        #\${PANEL_ID} .better-codex-column-head { display: flex; min-height: 30px; align-items: center; justify-content: space-between; padding: 0 0 6px; font-size: var(--bc-text-md); font-weight: 600; }
        #\${PANEL_ID} .better-codex-column-title, #\${PANEL_ID} .better-codex-column-actions { display: flex; align-items: center; gap: 6px; }
        #\${PANEL_ID} #better-codex-filter > svg { color: var(--bc-info); }
        #\${PANEL_ID} .better-codex-status-icon, #better-codex-context-menu .better-codex-status-icon, #better-codex-dialog .better-codex-status-icon { width: 14px; height: 14px; color: var(--bc-muted); }
        #\${PANEL_ID} .better-codex-status-icon[data-status="in_progress"], #\${PANEL_ID} [data-status="in_progress"] .better-codex-status-icon, #better-codex-context-menu .better-codex-status-icon[data-status="in_progress"], #better-codex-dialog .better-codex-status-icon[data-status="in_progress"] { color: var(--bc-warning); }
        #\${PANEL_ID} .better-codex-status-icon[data-status="in_review"], #\${PANEL_ID} [data-status="in_review"] .better-codex-status-icon, #better-codex-context-menu .better-codex-status-icon[data-status="in_review"], #better-codex-dialog .better-codex-status-icon[data-status="in_review"] { color: var(--bc-success); }
        #\${PANEL_ID} .better-codex-status-icon[data-status="done"], #\${PANEL_ID} [data-status="done"] .better-codex-status-icon, #better-codex-context-menu .better-codex-status-icon[data-status="done"], #better-codex-dialog .better-codex-status-icon[data-status="done"] { color: var(--bc-info); }
        #\${PANEL_ID} .better-codex-status-icon[data-status="blocked"], #\${PANEL_ID} [data-status="blocked"] .better-codex-status-icon, #better-codex-context-menu .better-codex-status-icon[data-status="blocked"], #better-codex-dialog .better-codex-status-icon[data-status="blocked"] { color: var(--bc-danger); }
        #\${PANEL_ID} .better-codex-column-icon { width: 24px; height: 24px; border: 0; border-radius: 999px; color: var(--bc-muted); background: transparent; padding: 0; font-size: var(--bc-text-icon-lg); line-height: 20px; cursor: pointer; }
        #\${PANEL_ID} .better-codex-column-icon:hover { background: rgba(113,113,122,.1); }
        #\${PANEL_ID} .better-codex-cards { min-height: 0; flex: 1; overflow-y: auto; padding: 0; border-radius: 8px; }
        #\${PANEL_ID} .better-codex-card { box-sizing: border-box; width: 100%; margin-bottom: 8px; border: 1px solid var(--bc-color-hairline, #e5e5e6); border-radius: 8px; background: var(--bc-color-canvas, var(--bc-page, #fff)); padding: 12px 10px; box-shadow: var(--bc-card-shadow, 0 1px 2px rgba(15,23,42,.04),0 2px 6px rgba(15,23,42,.05)); cursor: pointer; transition: border-color .15s, box-shadow .15s, transform .15s; }
        @media (hover: none), (pointer: coarse) { #\${PANEL_ID} .better-codex-card { -webkit-touch-callout: none; user-select: none; } }
        #\${PANEL_ID} .better-codex-card:hover { border-color: color-mix(in srgb, var(--bc-color-text, #1a1c1f) 16%, var(--bc-color-hairline, #e5e5e6)); background: var(--bc-color-canvas, var(--bc-page, #fff)); box-shadow: var(--bc-card-shadow, 0 1px 2px rgba(15,23,42,.04),0 2px 6px rgba(15,23,42,.05)), 0 4px 12px rgba(15,23,42,.06); }
        #\${PANEL_ID} .better-codex-card.is-enrichment-pending { cursor: wait; opacity: .76; }
        #\${PANEL_ID} .better-codex-card.is-enrichment-pending:hover { border-color: var(--bc-color-hairline, #e5e5e6); box-shadow: var(--bc-card-shadow, 0 1px 2px rgba(15,23,42,.04),0 2px 6px rgba(15,23,42,.05)); }
        #\${PANEL_ID} .better-codex-card:active { transform: scale(.995); }
        #\${PANEL_ID} .better-codex-card-row, #\${PANEL_ID} .better-codex-card-id, #\${PANEL_ID} .better-codex-card-meta { display: flex; align-items: center; }
        #\${PANEL_ID} .better-codex-card-row { justify-content: space-between; gap: 8px; }
        #\${PANEL_ID} .better-codex-card-id { min-width: 0; gap: 6px; color: var(--bc-muted); font-size: var(--bc-text-sm); }
        #\${PANEL_ID} .better-codex-priority { width: 14px; height: 14px; flex: 0 0 auto; }
        #\${PANEL_ID} .better-codex-priority, #better-codex-context-menu .better-codex-priority, #better-codex-dialog .better-codex-priority { color: var(--bc-priority-none, var(--bc-muted)); }
        #\${PANEL_ID} .better-codex-priority[data-priority="none"], #better-codex-context-menu .better-codex-priority[data-priority="none"], #better-codex-dialog .better-codex-priority[data-priority="none"] { color: var(--bc-priority-none, var(--bc-muted)); }
        #\${PANEL_ID} .better-codex-priority[data-priority="low"], #better-codex-context-menu .better-codex-priority[data-priority="low"], #better-codex-dialog .better-codex-priority[data-priority="low"] { color: var(--bc-priority-low, var(--bc-info)); }
        #\${PANEL_ID} .better-codex-priority[data-priority="medium"], #better-codex-context-menu .better-codex-priority[data-priority="medium"], #better-codex-dialog .better-codex-priority[data-priority="medium"] { color: var(--bc-priority-medium, var(--bc-warning)); }
        #\${PANEL_ID} .better-codex-priority[data-priority="high"], #better-codex-context-menu .better-codex-priority[data-priority="high"], #better-codex-dialog .better-codex-priority[data-priority="high"] { color: var(--bc-priority-high, oklch(.68 .18 52)); }
        #\${PANEL_ID} .better-codex-priority[data-priority="urgent"], #better-codex-context-menu .better-codex-priority[data-priority="urgent"], #better-codex-dialog .better-codex-priority[data-priority="urgent"] { color: var(--bc-priority-urgent, var(--bc-danger)); }
        #\${PANEL_ID} .better-codex-card-title { display: -webkit-box; margin: 5px 0 0; overflow: hidden; color: #202024; font-size: var(--bc-text-md); font-weight: 550; line-height: 1.38; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }
        #\${PANEL_ID} .better-codex-card-description { margin-top: 4px; overflow: hidden; color: var(--bc-muted); font-size: var(--bc-text-sm); line-height: 1.35; text-overflow: ellipsis; white-space: nowrap; }
        #\${PANEL_ID} .better-codex-chip-row { display: flex; align-items: center; flex-wrap: wrap; gap: 6px; margin-top: 7px; }
        #\${PANEL_ID} .better-codex-chip { display: inline-flex; max-width: 155px; align-items: center; gap: 4px; overflow: hidden; border-radius: 999px; background: #f2f2f3; padding: 2px 6px; color: var(--bc-muted); font-size: var(--bc-text-caption); text-overflow: ellipsis; white-space: nowrap; }
        #\${PANEL_ID} .better-codex-chip > svg { width: 11px; height: 11px; flex: 0 0 auto; }
        #\${PANEL_ID} .better-codex-chip > span { min-width: 0; overflow: hidden; text-overflow: ellipsis; }
        #\${PANEL_ID} .better-codex-card-meta { justify-content: space-between; gap: 8px; margin-top: 8px; color: var(--bc-muted); font-size: var(--bc-text-sm); }
        #\${PANEL_ID} .better-codex-card-assignee { display: inline-flex; min-width: 0; align-items: center; gap: 5px; overflow: hidden; color: var(--bc-muted); }
        #\${PANEL_ID} .better-codex-card-assignee > span:last-child { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        #\${PANEL_ID} .better-codex-card-assignee > svg { width: 12px; height: 12px; flex: 0 0 auto; }
        #\${PANEL_ID} .better-codex-card-avatar { display: inline-flex; width: 16px; height: 16px; flex: 0 0 auto; align-items: center; justify-content: center; overflow: hidden; border-radius: 999px; color: #fff; background: #27272a; }
        #\${PANEL_ID} .better-codex-card-avatar.is-codex { color: inherit; background: transparent; border-radius: 4px; }
        #\${PANEL_ID} .better-codex-card-avatar.is-fallback, #\${PANEL_ID} .better-codex-card-avatar.is-icon { color: var(--bc-muted); background: #f2f2f3; }
        #\${PANEL_ID} .better-codex-card-avatar img, #\${PANEL_ID} .better-codex-card-avatar svg { width: 100%; height: 100%; display: block; object-fit: cover; }
        #\${PANEL_ID} .better-codex-card-avatar.is-fallback svg, #\${PANEL_ID} .better-codex-card-avatar.is-icon svg { width: 10px; height: 10px; margin: auto; }
        #\${PANEL_ID} .better-codex-card-avatar.is-user.is-initials { color: #fff; font-size: 9px; font-weight: 700; line-height: 1; }
        #\${PANEL_ID} .better-codex-link { overflow: hidden; border: 0; color: var(--bc-info, #2563eb); background: transparent; padding: 0; font: inherit; text-overflow: ellipsis; white-space: nowrap; cursor: pointer; }
        #\${PANEL_ID} .better-codex-link:hover { text-decoration: underline; }
        #\${PANEL_ID} .better-codex-activity { display: inline-flex; align-items: center; gap: 5px; flex: 0 0 auto; font-size: var(--bc-text-caption); font-weight: 600; }
        #\${PANEL_ID} .better-codex-activity-dot { width: 6px; height: 6px; flex: 0 0 auto; border-radius: 999px; background: currentColor; }
        #\${PANEL_ID} .better-codex-avatar { display: inline-flex; width: 16px; height: 16px; align-items: center; justify-content: center; border: 1.5px solid #fff; border-radius: 999px; color: #fff; background: #27272a; font-size: var(--bc-text-avatar); }
        #\${PANEL_ID} .better-codex-activity[data-run="running"], #\${PANEL_ID} .better-codex-activity[data-run="scheduling"], #\${PANEL_ID} .better-codex-activity[data-run="thinking"] { color: #52525b; }
        #\${PANEL_ID} .better-codex-activity[data-run="scheduler-failed"] { color: #dc2626; }
        #\${PANEL_ID} .better-codex-activity[data-run="completed"] { color: var(--bc-success); }
        #\${PANEL_ID} .better-codex-activity[data-run="failed"] { color: #dc2626; }
        #\${PANEL_ID} .better-codex-activity[data-run="interrupted"] { color: var(--bc-danger); }
        #\${PANEL_ID} .better-codex-activity[data-run="not-started"] { color: var(--bc-muted); font-weight: 500; }
        #\${PANEL_ID} .better-codex-activity[data-run="completed"], #\${PANEL_ID} .better-codex-activity[data-run="interrupted"] { font-weight: 500; }
        #\${PANEL_ID} .better-codex-activity[data-run="claimed"] { color: var(--bc-muted); opacity: .62; }
        @keyframes better-codex-shimmer { 0% { background-position: 200% 0 } 100% { background-position: -200% 0 } }
        #\${PANEL_ID} .better-codex-shimmer { background-image: linear-gradient(90deg,#71717a 0%,#71717a 35%,#18181b 50%,#71717a 65%,#71717a 100%); background-size: 200% 100%; background-clip: text; -webkit-background-clip: text; color: transparent; -webkit-text-fill-color: transparent; animation: better-codex-shimmer 2.5s linear infinite; }
        #\${PANEL_ID} .better-codex-empty { padding: 18px 4px; text-align: center; color: #a1a1aa; font-size: var(--bc-text-sm); }
        #\${PANEL_ID} .better-codex-project-heading, #\${PANEL_ID} .better-codex-project-actions { display: none; align-items: center; gap: 8px; }
        #\${PANEL_ID} .better-codex-project-heading { min-width: 0; }
        #\${PANEL_ID} .better-codex-project-heading strong { overflow: hidden; font-size: var(--bc-text-md); font-weight: 650; text-overflow: ellipsis; white-space: nowrap; }
        #\${PANEL_ID} .better-codex-project-heading span { flex: 0 0 auto; color: var(--bc-muted); font-size: var(--bc-text-sm); }
        #\${PANEL_ID} .better-codex-project-heading .better-codex-project-back { min-height: 32px; margin-left: -8px; padding: 0 8px; }
        #\${PANEL_ID} .better-codex-project-breadcrumb { display: flex; min-width: 0; align-items: center; gap: 7px; }
        #\${PANEL_ID} .better-codex-project-breadcrumb button { flex: 0 0 auto; border: 0; color: var(--bc-muted); background: transparent; padding: 3px 0; font: inherit; font-size: var(--bc-text-md); cursor: pointer; }
        #\${PANEL_ID} .better-codex-project-breadcrumb button:hover { color: var(--bc-foreground); }
        #\${PANEL_ID}[data-surface="projects"] .better-codex-issue-only, #\${PANEL_ID}[data-surface="projects"] .better-codex-agent-heading, #\${PANEL_ID}[data-surface="projects"] .better-codex-agent-actions { display: none; }
        #\${PANEL_ID}[data-surface="projects"] .better-codex-project-heading, #\${PANEL_ID}[data-surface="projects"] .better-codex-project-actions { display: flex; }
        #\${PANEL_ID} .better-codex-projects { display: none; min-height: 0; flex: 1; overflow-y: auto; padding: 18px 22px 32px; }
        #\${PANEL_ID}[data-surface="projects"] .better-codex-projects { display: block; }
        #\${PANEL_ID} .better-codex-project-list { display: grid; width: min(1120px,100%); margin: 0 auto; grid-template-columns: repeat(auto-fill,minmax(300px,1fr)); gap: 12px; }
        #\${PANEL_ID} .better-codex-project-card { display: flex; min-height: 152px; box-sizing: border-box; flex-direction: column; border: 0; border-radius: var(--bc-radius-lg, 16px); color: var(--bc-foreground); background: var(--bc-surface); padding: 16px; text-align: left; cursor: pointer; transition: transform .15s cubic-bezier(.16,1,.3,1), background-color .15s cubic-bezier(.16,1,.3,1); }
        #\${PANEL_ID} .better-codex-project-card:active { transform: scale(.98); }
        #\${PANEL_ID} .better-codex-project-card:focus-visible { outline: 2px solid var(--bc-ring); outline-offset: 2px; }
        #\${PANEL_ID} .better-codex-project-card-head { display: flex; align-items: flex-start; gap: 11px; }
        #\${PANEL_ID} .better-codex-project-card-icon { display: inline-flex; width: 36px; height: 36px; flex: 0 0 auto; align-items: center; justify-content: center; border-radius: var(--bc-radius-sm, 10px); color: var(--bc-muted); background: var(--bc-control); }
        #\${PANEL_ID} .better-codex-project-card-icon svg { width: 18px; height: 18px; }
        #\${PANEL_ID} .better-codex-project-card-title { min-width: 0; flex: 1; }
        #\${PANEL_ID} .better-codex-project-card-title strong { display: block; overflow: hidden; font-size: var(--bc-text-md); font-weight: 650; text-overflow: ellipsis; white-space: nowrap; }
        #\${PANEL_ID} .better-codex-project-card-title span { display: block; margin-top: 4px; color: var(--bc-muted); font-size: var(--bc-text-caption); }
        #\${PANEL_ID} .better-codex-project-card-description { display: -webkit-box; margin: 13px 0 0; overflow: hidden; color: var(--bc-muted); font-size: var(--bc-text-sm); line-height: 1.65; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }
        #\${PANEL_ID} .better-codex-project-card-path { display: flex; min-width: 0; align-items: center; gap: 6px; margin-top: auto; padding-top: 16px; color: var(--bc-faint); font-size: var(--bc-text-caption); }
        #\${PANEL_ID} .better-codex-project-card-path svg { width: 13px; height: 13px; flex: 0 0 auto; }
        #\${PANEL_ID} .better-codex-project-card-path span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        #\${PANEL_ID} .better-codex-project-empty { width: min(520px,100%); margin: 16vh auto 0; text-align: center; }
        #\${PANEL_ID} .better-codex-project-empty strong { display: block; font-size: var(--bc-text-md); }
        #\${PANEL_ID} .better-codex-project-empty p { margin: 7px 0 0; color: var(--bc-muted); font-size: var(--bc-text-sm); line-height: 1.7; }
        #\${PANEL_ID} .better-codex-project-detail { width: min(1440px,100%); margin: 0 auto; }
        #\${PANEL_ID} .better-codex-project-back { display: inline-flex; min-height: 36px; align-items: center; gap: 7px; border: 0; border-radius: var(--bc-radius-sm, 10px); color: var(--bc-muted); background: transparent; padding: 0 9px; font: inherit; font-size: var(--bc-text-sm); cursor: pointer; }
        #\${PANEL_ID} .better-codex-project-back svg { width: 15px; height: 15px; transform: rotate(180deg); }
        #\${PANEL_ID} .better-codex-project-summary { display: grid; grid-template-columns: minmax(0,1fr) minmax(260px,.7fr); gap: 24px; margin-top: 14px; border-radius: var(--bc-radius-xl, 20px); background: var(--bc-surface); padding: 24px; }
        #\${PANEL_ID} .better-codex-project-summary h1 { margin: 0; font-size: var(--bc-text-xl); font-weight: 680; line-height: 1.3; text-wrap: balance; }
        #\${PANEL_ID} .better-codex-project-eyebrow { display: block; margin-bottom: 7px; color: var(--bc-faint); font-size: var(--bc-text-caption); font-weight: 650; }
        #\${PANEL_ID} .better-codex-project-summary p { max-width: 68ch; margin: 9px 0 0; color: var(--bc-muted); font-size: var(--bc-text-md); line-height: 1.75; text-wrap: pretty; }
        #\${PANEL_ID} .better-codex-project-paths { display: grid; align-content: start; gap: 7px; }
        #\${PANEL_ID} .better-codex-project-paths > strong { color: var(--bc-muted); font-size: var(--bc-text-caption); font-weight: 600; }
        #\${PANEL_ID} .better-codex-project-path { display: flex; min-width: 0; align-items: center; gap: 7px; border-radius: var(--bc-radius-sm, 10px); color: var(--bc-muted); background: var(--bc-control); padding: 9px 10px; font-family: var(--bc-font-mono, ui-monospace, monospace); font-size: var(--bc-text-caption); }
        #\${PANEL_ID} .better-codex-project-path svg { width: 14px; height: 14px; flex: 0 0 auto; }
        #\${PANEL_ID} .better-codex-project-path span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        #\${PANEL_ID} .better-codex-project-columns { display: grid; height: clamp(560px,calc(100dvh - 310px),820px); grid-template-columns: minmax(280px,.62fr) minmax(560px,1.38fr); gap: 14px; margin-top: 14px; align-items: stretch; }
        #\${PANEL_ID} .better-codex-project-panel { display: flex; min-width: 0; min-height: 0; overflow: hidden; flex-direction: column; border-radius: var(--bc-radius-lg, 16px); background: var(--bc-surface); }
        #\${PANEL_ID} .better-codex-project-panel-head { display: flex; min-height: 52px; align-items: center; justify-content: space-between; gap: 12px; padding: 0 16px; }
        #\${PANEL_ID} .better-codex-project-panel-head strong { font-size: var(--bc-text-md); font-weight: 650; }
        #\${PANEL_ID} .better-codex-project-panel-head span { color: var(--bc-muted); font-size: var(--bc-text-caption); }
        #\${PANEL_ID} .better-codex-project-issues { min-height: 0; flex: 1; overflow-y: auto; overscroll-behavior: contain; scrollbar-gutter: stable; padding: 0 7px 8px; }
        #\${PANEL_ID} .better-codex-project-issues-loading { display: grid; min-height: 100%; place-content: center; justify-items: center; gap: 10px; color: var(--bc-muted); font-size: var(--bc-text-caption); }
        #\${PANEL_ID} .better-codex-project-issues-loading > span { width: 24px; height: 24px; box-sizing: border-box; border: 2px solid var(--bc-divider); border-top-color: var(--bc-foreground); border-radius: 50%; animation: better-codex-board-loading-spin .8s linear infinite; }
        #\${PANEL_ID} .better-codex-project-issue { overflow: hidden; border-radius: var(--bc-radius-sm, 10px); }
        #\${PANEL_ID} .better-codex-project-issue-toggle { display: grid; width: 100%; min-height: 56px; grid-template-columns: 18px minmax(0,1fr) auto; align-items: center; gap: 9px; border: 0; border-radius: inherit; color: inherit; background: transparent; padding: 8px 9px; font: inherit; text-align: left; cursor: pointer; }
        #\${PANEL_ID} .better-codex-project-issue-toggle:focus-visible { outline: 2px solid var(--bc-ring); outline-offset: -2px; }
        #\${PANEL_ID} .better-codex-project-issue-title { min-width: 0; }
        #\${PANEL_ID} .better-codex-project-issue-title strong { display: block; overflow: hidden; font-size: var(--bc-text-sm); font-weight: 600; text-overflow: ellipsis; white-space: nowrap; }
        #\${PANEL_ID} .better-codex-project-issue-title > span { display: flex; align-items: center; gap: 6px; margin-top: 4px; color: var(--bc-faint); font-size: var(--bc-text-caption); }
        #\${PANEL_ID} .better-codex-project-issue-toggle > svg { width: 14px; height: 14px; color: var(--bc-faint); transition: transform .15s cubic-bezier(.16,1,.3,1); }
        #\${PANEL_ID} .better-codex-project-issue-toggle:hover > svg { transform: translateX(2px); }
        #\${PANEL_ID} .better-codex-project-dashboard { display: grid; gap: 14px; }
        #\${PANEL_ID} .better-codex-project-dashboard-head { display: flex; min-width: 0; align-items: flex-start; justify-content: space-between; gap: 24px; padding: 4px 2px 0; }
        #\${PANEL_ID} .better-codex-project-dashboard-title { min-width: 0; }
        #\${PANEL_ID} .better-codex-project-dashboard-title > div { display: flex; align-items: center; flex-wrap: wrap; gap: 9px; }
        #\${PANEL_ID} .better-codex-project-dashboard-title h1 { margin: 0; font-size: clamp(24px,2.2vw,34px); font-weight: 680; line-height: 1.2; letter-spacing: -.025em; }
        #\${PANEL_ID} .better-codex-project-dashboard-title p { max-width: 74ch; margin: 8px 0 0; color: var(--bc-muted); font-size: var(--bc-text-sm); line-height: 1.65; }
        #\${PANEL_ID} .better-codex-project-health { display: inline-flex; min-height: 26px; align-items: center; gap: 6px; border-radius: 999px; padding: 0 10px; color: var(--bc-success); background: color-mix(in oklch,var(--bc-success) 11%,transparent); font-size: var(--bc-text-caption); font-weight: 650; }
        #\${PANEL_ID} .better-codex-project-health::before { width: 6px; height: 6px; border-radius: 50%; background: currentColor; content: ""; }
        #\${PANEL_ID} .better-codex-project-health[data-tone="warning"] { color: var(--bc-warning); background: color-mix(in oklch,var(--bc-warning) 12%,transparent); }
        #\${PANEL_ID} .better-codex-project-health[data-tone="danger"] { color: var(--bc-danger); background: color-mix(in oklch,var(--bc-danger) 11%,transparent); }
        #\${PANEL_ID} .better-codex-project-dashboard-people { display: flex; flex: 0 0 auto; align-items: center; }
        #\${PANEL_ID} .better-codex-project-dashboard-avatar { display: inline-flex; width: 32px; height: 32px; box-sizing: border-box; align-items: center; justify-content: center; overflow: hidden; margin-left: -7px; border: 2px solid var(--bc-page); border-radius: 999px; color: var(--bc-muted); background: var(--bc-control); font-size: 11px; font-weight: 700; }
        #\${PANEL_ID} .better-codex-project-dashboard-avatar:first-child { margin-left: 0; }
        #\${PANEL_ID} .better-codex-project-dashboard-avatar img, #\${PANEL_ID} .better-codex-project-dashboard-avatar svg { display: block; width: 100%; height: 100%; object-fit: cover; }
        #\${PANEL_ID} .better-codex-project-dashboard-avatar.is-icon svg, #\${PANEL_ID} .better-codex-project-dashboard-avatar.is-fallback svg { width: 16px; height: 16px; }
        #\${PANEL_ID} .better-codex-project-dashboard-tabs { display: flex; width: fit-content; align-items: center; gap: 3px; border-radius: 13px; background: var(--bc-control); padding: 3px; }
        #\${PANEL_ID} .better-codex-project-dashboard-tabs button { min-height: 34px; border: 0; border-radius: 10px; color: var(--bc-muted); background: transparent; padding: 0 16px; font: inherit; font-size: var(--bc-text-sm); font-weight: 600; cursor: pointer; }
        #\${PANEL_ID} .better-codex-project-dashboard-tabs button[aria-current="page"] { color: var(--bc-foreground); background: var(--bc-surface); box-shadow: var(--bc-surface-shadow); }
        #\${PANEL_ID} .better-codex-project-dashboard-tabs button:focus-visible { outline: 2px solid var(--bc-ring); outline-offset: 1px; }
        #\${PANEL_ID} .better-codex-project-dashboard-summary { display: grid; grid-template-columns: minmax(0,1.1fr) minmax(260px,.9fr) minmax(280px,.92fr); gap: 14px; }
        #\${PANEL_ID} .better-codex-project-dashboard-card { min-width: 0; border-radius: var(--bc-radius-lg,16px); background: var(--bc-surface); padding: 18px 20px; }
        #\${PANEL_ID} .better-codex-project-dashboard-card > strong, #\${PANEL_ID} .better-codex-project-section-head strong { font-size: var(--bc-text-md); font-weight: 650; }
        #\${PANEL_ID} .better-codex-project-dashboard-description p { display: -webkit-box; max-width: 62ch; margin: 12px 0 0; overflow: hidden; color: var(--bc-muted); font-size: var(--bc-text-sm); line-height: 1.7; -webkit-box-orient: vertical; -webkit-line-clamp: 3; }
        #\${PANEL_ID} .better-codex-project-dashboard-path { display: flex; min-width: 0; align-items: center; gap: 6px; margin-top: 14px; color: var(--bc-faint); font-size: var(--bc-text-caption); }
        #\${PANEL_ID} .better-codex-project-dashboard-path svg { width: 13px; height: 13px; flex: 0 0 auto; }
        #\${PANEL_ID} .better-codex-project-dashboard-path span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        #\${PANEL_ID} .better-codex-project-metrics { display: grid; grid-template-columns: repeat(3,1fr); margin-top: 17px; }
        #\${PANEL_ID} .better-codex-project-metric { display: grid; justify-items: center; gap: 4px; border-left: 1px solid var(--bc-divider); }
        #\${PANEL_ID} .better-codex-project-metric:first-child { border-left: 0; }
        #\${PANEL_ID} .better-codex-project-metric b { color: var(--bc-info); font-size: 24px; font-weight: 650; }
        #\${PANEL_ID} .better-codex-project-metric[data-tone="warning"] b { color: var(--bc-warning); }
        #\${PANEL_ID} .better-codex-project-metric[data-tone="danger"] b { color: var(--bc-danger); }
        #\${PANEL_ID} .better-codex-project-metric span { color: var(--bc-muted); font-size: var(--bc-text-caption); }
        #\${PANEL_ID} .better-codex-project-cycle { display: grid; grid-template-columns: 118px minmax(0,1fr); gap: 18px; }
        #\${PANEL_ID} .better-codex-project-cycle-steps { display: grid; align-content: start; }
        #\${PANEL_ID} .better-codex-project-cycle-step { position: relative; display: flex; min-height: 29px; align-items: center; gap: 8px; color: var(--bc-faint); font-size: var(--bc-text-caption); }
        #\${PANEL_ID} .better-codex-project-cycle-step::before { z-index: 1; width: 9px; height: 9px; box-sizing: border-box; border: 1.5px solid currentColor; border-radius: 50%; background: var(--bc-surface); content: ""; }
        #\${PANEL_ID} .better-codex-project-cycle-step:not(:last-child)::after { position: absolute; top: 19px; bottom: -10px; left: 4px; width: 1px; background: var(--bc-divider); content: ""; }
        #\${PANEL_ID} .better-codex-project-cycle-step.is-complete { color: var(--bc-muted); }
        #\${PANEL_ID} .better-codex-project-cycle-step.is-complete::before { border-color: var(--bc-muted); background: var(--bc-muted); box-shadow: inset 0 0 0 2px var(--bc-surface); }
        #\${PANEL_ID} .better-codex-project-cycle-step.is-current { color: var(--bc-info); font-weight: 650; }
        #\${PANEL_ID} .better-codex-project-cycle-step.is-current::before { border: 3px solid var(--bc-info); background: var(--bc-surface); }
        #\${PANEL_ID} .better-codex-project-cycle-facts { display: grid; align-content: center; gap: 10px; }
        #\${PANEL_ID} .better-codex-project-cycle-facts div { display: grid; grid-template-columns: auto minmax(0,1fr); gap: 10px; color: var(--bc-muted); font-size: var(--bc-text-caption); }
        #\${PANEL_ID} .better-codex-project-cycle-facts b { overflow: hidden; color: var(--bc-foreground); font-weight: 650; text-overflow: ellipsis; white-space: nowrap; }
        #\${PANEL_ID} .better-codex-project-timeline { min-width: 0; border-radius: var(--bc-radius-lg,16px); background: var(--bc-surface); padding: 18px 20px 20px; }
        #\${PANEL_ID} .better-codex-project-section-head { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
        #\${PANEL_ID} .better-codex-project-section-head > span:not(.better-codex-project-timeline-legend) { color: var(--bc-faint); font-size: var(--bc-text-caption); }
        #\${PANEL_ID} .better-codex-project-timeline-legend { display: flex; align-items: center; gap: 14px; color: var(--bc-muted); font-size: var(--bc-text-caption); }
        #\${PANEL_ID} .better-codex-project-timeline-legend span { display: inline-flex; align-items: center; gap: 5px; }
        #\${PANEL_ID} .better-codex-project-timeline-legend i { width: 7px; height: 7px; border-radius: 50%; background: var(--bc-success); }
        #\${PANEL_ID} .better-codex-project-timeline-legend span:nth-child(2) i { background: var(--bc-warning); }
        #\${PANEL_ID} .better-codex-project-timeline-legend span:nth-child(3) i { border: 1px dashed var(--bc-info); background: transparent; }
        #\${PANEL_ID} .better-codex-project-timeline-scroll { overflow-x: auto; margin-top: 16px; padding-bottom: 3px; }
        #\${PANEL_ID} .better-codex-project-timeline-canvas { position: relative; min-width: 920px; }
        #\${PANEL_ID} .better-codex-project-timeline-dates { display: grid; grid-template-columns: repeat(13,1fr); color: var(--bc-faint); font-size: var(--bc-text-xs); }
        #\${PANEL_ID} .better-codex-project-timeline-dates span { padding-bottom: 8px; text-align: left; }
        #\${PANEL_ID} .better-codex-project-timeline-track { position: relative; display: grid; min-height: 116px; grid-template-columns: repeat(12,1fr); grid-template-rows: repeat(3,31px); gap: 7px 0; border-top: 1px solid var(--bc-divider); padding: 12px 0 0; background-image: linear-gradient(to right,var(--bc-divider) 1px,transparent 1px); background-size: calc(100% / 12) 100%; }
        #\${PANEL_ID} .better-codex-project-version-band { z-index: 1; display: flex; min-width: 0; grid-column: var(--start) / span var(--span); grid-row: var(--row); align-items: center; gap: 8px; align-self: center; height: 28px; box-sizing: border-box; overflow: hidden; border-radius: 999px; color: color-mix(in oklch,var(--bc-success) 88%,var(--bc-foreground)); background: color-mix(in oklch,var(--bc-success) 12%,var(--bc-surface)); padding: 0 12px; font-size: var(--bc-text-caption); white-space: nowrap; }
        #\${PANEL_ID} .better-codex-project-version-band b { overflow: hidden; font-weight: 650; text-overflow: ellipsis; }
        #\${PANEL_ID} .better-codex-project-version-band span { color: var(--bc-muted); }
        #\${PANEL_ID} .better-codex-project-version-band[data-tone="current"] { color: color-mix(in oklch,var(--bc-warning) 84%,var(--bc-foreground)); background: color-mix(in oklch,var(--bc-warning) 13%,var(--bc-surface)); }
        #\${PANEL_ID} .better-codex-project-version-band[data-tone="planned"] { border: 1px dashed color-mix(in oklch,var(--bc-info) 68%,var(--bc-divider)); color: var(--bc-info); background: color-mix(in oklch,var(--bc-info) 6%,var(--bc-surface)); }
        #\${PANEL_ID} .better-codex-project-version-progress { margin-left: auto; border-radius: 999px; background: color-mix(in oklch,var(--bc-warning) 16%,var(--bc-surface)); padding: 2px 7px; color: inherit !important; font-weight: 650; }
        #\${PANEL_ID} .better-codex-project-today { position: absolute; z-index: 2; top: -29px; bottom: 0; left: 33.333%; width: 1px; background: color-mix(in oklch,var(--bc-info) 74%,transparent); pointer-events: none; }
        #\${PANEL_ID} .better-codex-project-today span { position: absolute; top: -1px; left: 0; border-radius: 999px; color: var(--bc-info); background: color-mix(in oklch,var(--bc-info) 9%,var(--bc-surface)); padding: 3px 7px; font-size: var(--bc-text-xs); font-weight: 650; transform: translate(-50%,-100%); white-space: nowrap; }
        #\${PANEL_ID} .better-codex-project-milestones { display: grid; grid-template-columns: repeat(3,1fr); gap: 10px; margin-top: 12px; }
        #\${PANEL_ID} .better-codex-project-milestone { display: flex; min-width: 0; align-items: flex-start; gap: 8px; color: var(--bc-muted); font-size: var(--bc-text-caption); }
        #\${PANEL_ID} .better-codex-project-milestone svg { width: 14px; height: 14px; flex: 0 0 auto; margin-top: 1px; color: var(--bc-success); }
        #\${PANEL_ID} .better-codex-project-milestone[data-tone="current"] svg { color: var(--bc-warning); }
        #\${PANEL_ID} .better-codex-project-milestone[data-tone="planned"] svg { color: var(--bc-info); }
        #\${PANEL_ID} .better-codex-project-milestone b, #\${PANEL_ID} .better-codex-project-milestone span { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        #\${PANEL_ID} .better-codex-project-milestone b { color: var(--bc-foreground); font-weight: 600; }
        #\${PANEL_ID} .better-codex-project-dashboard-lists { display: grid; grid-template-columns: minmax(0,1.05fr) minmax(320px,.95fr); gap: 14px; }
        #\${PANEL_ID} .better-codex-project-work-list, #\${PANEL_ID} .better-codex-project-attention-list { display: grid; margin-top: 10px; }
        #\${PANEL_ID} .better-codex-project-work-row, #\${PANEL_ID} .better-codex-project-attention-row { display: grid; width: 100%; min-height: 43px; box-sizing: border-box; align-items: center; gap: 10px; border: 0; border-top: 1px solid var(--bc-divider); color: inherit; background: transparent; padding: 7px 2px; font: inherit; text-align: left; cursor: pointer; }
        #\${PANEL_ID} .better-codex-project-work-row { grid-template-columns: 18px 74px minmax(0,1fr) auto; }
        #\${PANEL_ID} .better-codex-project-attention-row { grid-template-columns: 30px minmax(0,1fr) auto; }
        #\${PANEL_ID} .better-codex-project-work-row:first-child, #\${PANEL_ID} .better-codex-project-attention-row:first-child { border-top: 0; }
        #\${PANEL_ID} .better-codex-project-work-row:hover, #\${PANEL_ID} .better-codex-project-attention-row:hover { background: var(--bc-hover); }
        #\${PANEL_ID} .better-codex-project-work-row:focus-visible, #\${PANEL_ID} .better-codex-project-attention-row:focus-visible { outline: 2px solid var(--bc-ring); outline-offset: -2px; }
        #\${PANEL_ID} .better-codex-project-work-row > svg { width: 15px; height: 15px; }
        #\${PANEL_ID} .better-codex-project-work-row > b { color: var(--bc-faint); font-size: var(--bc-text-caption); font-weight: 550; }
        #\${PANEL_ID} .better-codex-project-work-title, #\${PANEL_ID} .better-codex-project-attention-copy { min-width: 0; }
        #\${PANEL_ID} .better-codex-project-work-title strong, #\${PANEL_ID} .better-codex-project-attention-copy strong { display: block; overflow: hidden; font-size: var(--bc-text-sm); font-weight: 600; text-overflow: ellipsis; white-space: nowrap; }
        #\${PANEL_ID} .better-codex-project-work-title span, #\${PANEL_ID} .better-codex-project-attention-copy span { display: block; margin-top: 3px; overflow: hidden; color: var(--bc-faint); font-size: var(--bc-text-caption); text-overflow: ellipsis; white-space: nowrap; }
        #\${PANEL_ID} .better-codex-project-work-state, #\${PANEL_ID} .better-codex-project-attention-state { border-radius: 999px; background: var(--bc-control); padding: 3px 8px; color: var(--bc-muted); font-size: var(--bc-text-xs); white-space: nowrap; }
        #\${PANEL_ID} .better-codex-project-attention-icon { display: inline-flex; width: 28px; height: 28px; align-items: center; justify-content: center; border-radius: 9px; color: var(--bc-warning); background: color-mix(in oklch,var(--bc-warning) 10%,transparent); }
        #\${PANEL_ID} .better-codex-project-attention-icon svg { width: 14px; height: 14px; }
        #\${PANEL_ID} .better-codex-project-collaborators { padding-block: 15px; }
        #\${PANEL_ID} .better-codex-project-collaborator-list { display: grid; grid-template-columns: repeat(auto-fit,minmax(210px,1fr)); margin-top: 10px; }
        #\${PANEL_ID} .better-codex-project-collaborator { display: flex; min-width: 0; align-items: center; gap: 10px; border-left: 1px solid var(--bc-divider); padding: 4px 16px; }
        #\${PANEL_ID} .better-codex-project-collaborator:first-child { border-left: 0; padding-left: 0; }
        #\${PANEL_ID} .better-codex-project-collaborator > div { min-width: 0; }
        #\${PANEL_ID} .better-codex-project-collaborator strong, #\${PANEL_ID} .better-codex-project-collaborator span { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        #\${PANEL_ID} .better-codex-project-collaborator strong { font-size: var(--bc-text-sm); font-weight: 600; }
        #\${PANEL_ID} .better-codex-project-collaborator span { margin-top: 3px; color: var(--bc-faint); font-size: var(--bc-text-caption); }
        #\${PANEL_ID} .better-codex-project-dashboard-empty { padding: 20px 0; color: var(--bc-faint); font-size: var(--bc-text-sm); text-align: center; }
        #\${PANEL_ID} .better-codex-project-document-panel { background: color-mix(in oklch,var(--bc-surface) 96%,var(--bc-control)); }
        #\${PANEL_ID} .better-codex-project-document-panel > .better-codex-project-panel-head { border-bottom: 1px solid var(--bc-divider); }
        #\${PANEL_ID} .better-codex-project-document-progress { margin: 10px 14px 0; border-radius: var(--bc-radius-sm,10px); background: var(--bc-control); padding: 10px 12px; }
        #\${PANEL_ID} .better-codex-project-document-progress > div:first-child, #\${PANEL_ID} .better-codex-project-document-progress > div:first-child span { display: flex; align-items: center; justify-content: space-between; gap: 7px; }
        #\${PANEL_ID} .better-codex-project-document-progress > div:first-child span { justify-content: flex-start; min-width: 0; }
        #\${PANEL_ID} .better-codex-project-document-progress svg { width: 14px; height: 14px; color: var(--bc-info); animation: better-codex-project-document-pulse 1.6s ease-in-out infinite; }
        #\${PANEL_ID} .better-codex-project-document-progress strong, #\${PANEL_ID} .better-codex-project-document-progress b { font-size: var(--bc-text-caption); font-weight: 650; }
        #\${PANEL_ID} .better-codex-project-document-progress b { color: var(--bc-muted); }
        #\${PANEL_ID} .better-codex-project-document-segments { display: grid; grid-template-columns: repeat(7,1fr); gap: 4px; margin-top: 8px; }
        #\${PANEL_ID} .better-codex-project-document-segments i { height: 3px; overflow: hidden; border-radius: 2px; background: var(--bc-divider); }
        #\${PANEL_ID} .better-codex-project-document-segments i[data-status="ready"] { background: var(--bc-info); }
        #\${PANEL_ID} .better-codex-project-document-segments i[data-status="generating"] { background: color-mix(in oklch,var(--bc-info) 48%,var(--bc-divider)); animation: better-codex-project-document-segment 1.2s ease-in-out infinite; }
        #\${PANEL_ID} .better-codex-project-document-segments i[data-status="failed"] { background: var(--bc-danger); }
        #\${PANEL_ID} .better-codex-project-document-tabs { display: flex; flex: 0 0 auto; overflow-x: auto; padding: 10px 12px 0; scrollbar-width: none; }
        #\${PANEL_ID} .better-codex-project-document-tabs::-webkit-scrollbar { display: none; }
        #\${PANEL_ID} .better-codex-project-document-tab { position: relative; display: inline-flex; min-height: 38px; flex: 0 0 auto; align-items: center; gap: 6px; border: 0; border-bottom: 2px solid transparent; color: var(--bc-muted); background: transparent; padding: 0 10px 7px; font: inherit; font-size: var(--bc-text-caption); cursor: pointer; transition: color .15s,background .15s,transform .15s; }
        #\${PANEL_ID} .better-codex-project-document-tab svg { width: 14px; height: 14px; }
        #\${PANEL_ID} .better-codex-project-document-tab > i { width: 6px; height: 6px; border-radius: 50%; background: var(--bc-divider); }
        #\${PANEL_ID} .better-codex-project-document-tab > i[data-status="ready"] { background: var(--bc-success); }
        #\${PANEL_ID} .better-codex-project-document-tab > i[data-status="generating"] { background: var(--bc-info); animation: better-codex-project-document-pulse 1.2s ease-in-out infinite; }
        #\${PANEL_ID} .better-codex-project-document-tab > i[data-status="failed"] { background: var(--bc-danger); }
        #\${PANEL_ID} .better-codex-project-document-tab.is-active { border-bottom-color: var(--bc-foreground); color: var(--bc-foreground); }
        #\${PANEL_ID} .better-codex-project-document-tab:active { transform: scale(.98); }
        #\${PANEL_ID} .better-codex-project-document-tab:focus-visible { outline: 2px solid var(--bc-ring); outline-offset: -3px; }
        #\${PANEL_ID} .better-codex-project-document-scroll { min-height: 0; flex: 1; overflow-y: auto; overscroll-behavior: contain; scrollbar-gutter: stable; padding: 14px 18px 24px; }
        #\${PANEL_ID} .better-codex-project-document-notice { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; border-radius: var(--bc-radius-sm,10px); color: var(--bc-muted); background: var(--bc-control); padding: 9px 11px; font-size: var(--bc-text-caption); }
        #\${PANEL_ID} .better-codex-project-document-notice svg { width: 14px; height: 14px; flex: 0 0 auto; animation: better-codex-project-document-spin 2.4s linear infinite; }
        #\${PANEL_ID} .better-codex-project-document-notice.is-error { color: var(--bc-danger); }
        #\${PANEL_ID} .better-codex-project-document-notice.is-error svg { animation: none; }
        #\${PANEL_ID} .better-codex-project-document-diagram { overflow-x: auto; margin-bottom: 18px; border-radius: var(--bc-radius-md,12px); background: var(--bc-control); padding: 12px; }
        #\${PANEL_ID} .better-codex-project-document-diagram-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
        #\${PANEL_ID} .better-codex-project-document-diagram-head strong { font-size: var(--bc-text-sm); }
        #\${PANEL_ID} .better-codex-project-document-diagram-head span { color: var(--bc-faint); font-family: var(--bc-font-mono,ui-monospace,monospace); font-size: var(--bc-text-xs); }
        #\${PANEL_ID} .better-codex-project-document-graph { position: relative; min-width: max-content; }
        #\${PANEL_ID} .better-codex-project-document-graph > svg { position: absolute; z-index: 0; inset: 0; width: 100%; height: 100%; overflow: visible; pointer-events: none; }
        #\${PANEL_ID} .better-codex-project-document-graph > svg path:not([d^="M 0"]) { fill: none; stroke: color-mix(in oklch,var(--bc-muted) 55%,transparent); stroke-width: 1.25; }
        #\${PANEL_ID} .better-codex-project-document-graph > svg marker path { fill: var(--bc-muted); stroke: none; }
        #\${PANEL_ID} .better-codex-project-document-groups { position: relative; z-index: 1; display: flex; align-items: stretch; gap: 34px; }
        #\${PANEL_ID} .better-codex-project-document-group { width: 180px; flex: 0 0 180px; }
        #\${PANEL_ID} .better-codex-project-document-group > strong { display: block; margin-bottom: 7px; color: var(--bc-faint); font-size: var(--bc-text-xs); font-weight: 650; text-transform: uppercase; }
        #\${PANEL_ID} .better-codex-project-document-group > div { display: grid; align-content: start; gap: 7px; }
        #\${PANEL_ID} .better-codex-project-document-node { min-height: 54px; border: 1px solid var(--bc-divider); border-radius: var(--bc-radius-sm,10px); background: var(--bc-surface); padding: 9px 10px; }
        #\${PANEL_ID} .better-codex-project-document-node b, #\${PANEL_ID} .better-codex-project-document-node span { display: block; }
        #\${PANEL_ID} .better-codex-project-document-node b { font-size: var(--bc-text-caption); font-weight: 650; }
        #\${PANEL_ID} .better-codex-project-document-node span { margin-top: 3px; color: var(--bc-muted); font-size: var(--bc-text-xs); line-height: 1.45; }
        #\${PANEL_ID} .better-codex-project-document-relations { display: flex; overflow-x: auto; gap: 6px; margin-top: 10px; padding-top: 2px; }
        #\${PANEL_ID} .better-codex-project-document-relations span { display: inline-flex; flex: 0 0 auto; align-items: center; gap: 4px; color: var(--bc-muted); font-size: var(--bc-text-xs); }
        #\${PANEL_ID} .better-codex-project-document-relations svg { width: 11px; height: 11px; }
        #\${PANEL_ID} .better-codex-project-document-relations b { color: var(--bc-foreground); font-weight: 600; }
        #\${PANEL_ID} .better-codex-project-document-relations em { font-style: normal; }
        #\${PANEL_ID} .better-codex-project-document-content { color: color-mix(in oklch,var(--bc-foreground) 82%,var(--bc-muted)); font-size: var(--bc-text-sm); line-height: 1.75; }
        #\${PANEL_ID} .better-codex-project-document-content h1, #\${PANEL_ID} .better-codex-project-document-content h2, #\${PANEL_ID} .better-codex-project-document-content h3 { color: var(--bc-foreground); line-height: 1.35; text-wrap: balance; }
        #\${PANEL_ID} .better-codex-project-document-content h1 { margin-top: 0; font-size: var(--bc-text-xl); }
        #\${PANEL_ID} .better-codex-project-document-content h2 { margin-top: 24px; font-size: var(--bc-text-lg); }
        #\${PANEL_ID} .better-codex-project-document-content code { border-radius: var(--bc-radius-xs,6px); background: var(--bc-control); padding: 2px 5px; }
        #\${PANEL_ID} .better-codex-project-document-loading { display: grid; min-height: 340px; place-content: center; justify-items: center; color: var(--bc-muted); text-align: center; }
        #\${PANEL_ID} .better-codex-project-document-orbit { display: grid; width: 46px; height: 46px; place-items: center; margin-bottom: 14px; border: 1px solid var(--bc-divider); border-radius: 50%; color: var(--bc-info); }
        #\${PANEL_ID} .better-codex-project-document-orbit.is-active { animation: better-codex-project-document-float 2.4s ease-in-out infinite; }
        #\${PANEL_ID} .better-codex-project-document-orbit svg { width: 19px; height: 19px; }
        #\${PANEL_ID} .better-codex-project-document-loading.is-error .better-codex-project-document-orbit { color: var(--bc-danger); }
        #\${PANEL_ID} .better-codex-project-document-loading > strong { color: var(--bc-foreground); font-size: var(--bc-text-md); }
        #\${PANEL_ID} .better-codex-project-document-loading > p { max-width: 44ch; margin: 7px 0 18px; font-size: var(--bc-text-caption); line-height: 1.65; }
        #\${PANEL_ID} .better-codex-project-document-skeleton { display: grid; width: min(340px,70vw); gap: 7px; }
        #\${PANEL_ID} .better-codex-project-document-skeleton i { height: 7px; border-radius: 4px; background: var(--bc-divider); animation: better-codex-project-document-skeleton 1.5s ease-in-out infinite; }
        #\${PANEL_ID} .better-codex-project-document-skeleton i:nth-child(2) { width: 82%; animation-delay: .12s; }
        #\${PANEL_ID} .better-codex-project-document-skeleton i:nth-child(3) { width: 93%; animation-delay: .24s; }
        #\${PANEL_ID} .better-codex-project-document-skeleton i:nth-child(4) { width: 64%; animation-delay: .36s; }
        #\${PANEL_ID} .better-codex-project-document-form { display: grid; flex: 0 0 auto; gap: 10px; border-top: 1px solid var(--bc-divider); background: var(--bc-surface); padding: 12px 14px 14px; }
        #\${PANEL_ID} .better-codex-project-document-form label { display: grid; gap: 5px; color: var(--bc-muted); font-size: var(--bc-text-xs); }
        #\${PANEL_ID} .better-codex-project-document-form textarea { width: 100%; box-sizing: border-box; border: 1px solid var(--bc-divider); border-radius: var(--bc-radius-sm,10px); outline: 0; color: var(--bc-foreground); background: var(--bc-control); font: inherit; font-size: var(--bc-text-caption); }
        #\${PANEL_ID} .better-codex-project-document-form textarea { min-height: 52px; max-height: 120px; resize: vertical; padding: 9px 10px; line-height: 1.5; }
        #\${PANEL_ID} .better-codex-project-document-form textarea:focus { border-color: var(--bc-ring); }
        #\${PANEL_ID} .better-codex-project-document-form > div { display: grid; grid-template-columns: minmax(180px,1fr) auto; align-items: end; gap: 10px; }
        #\${PANEL_ID} .better-codex-project-document-agent-picker { position: relative; display: grid; min-width: 0; gap: 5px; }
        #\${PANEL_ID} .better-codex-project-document-agent-picker > span:first-child { color: var(--bc-muted); font-size: var(--bc-text-xs); }
        #\${PANEL_ID} .better-codex-project-document-agent-picker .better-codex-agent-picker-trigger { display: flex; width: 100%; min-height: 36px; box-sizing: border-box; align-items: center; justify-content: space-between; gap: 8px; border: 1px solid var(--bc-divider); border-radius: var(--bc-radius-sm,10px); color: var(--bc-foreground); background: var(--bc-control); padding: 0 10px; font: inherit; font-size: var(--bc-text-caption); text-align: left; cursor: pointer; }
        #\${PANEL_ID} .better-codex-project-document-agent-picker .better-codex-agent-picker-trigger:focus-visible { outline: 2px solid var(--bc-ring); outline-offset: 1px; }
        #\${PANEL_ID} .better-codex-project-document-agent-picker .better-codex-agent-picker-trigger > span { display: flex; min-width: 0; align-items: center; gap: 8px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        #\${PANEL_ID} .better-codex-project-document-agent-picker .better-codex-agent-picker-trigger > svg { width: 13px; height: 13px; flex: 0 0 auto; color: var(--bc-faint); transform: rotate(-90deg); transition: transform .15s cubic-bezier(.16,1,.3,1); }
        #\${PANEL_ID} .better-codex-project-document-agent-picker.is-open .better-codex-agent-picker-trigger > svg { transform: rotate(90deg); }
        #\${PANEL_ID} .better-codex-project-document-agent-picker .better-codex-agent-menu { top: auto; right: 0; bottom: calc(100% + 6px); display: none; width: 100%; min-width: 220px; transform-origin: bottom right; }
        #\${PANEL_ID} .better-codex-project-document-agent-picker.is-open .better-codex-agent-menu { display: block; animation: better-codex-menu-enter var(--bc-motion-fast) var(--bc-ease-out); }
        #\${PANEL_ID} .better-codex-project-document-agent-avatar { display: inline-flex; width: 18px; height: 18px; flex: 0 0 18px; align-items: center; justify-content: center; overflow: hidden; border-radius: 999px; }
        #\${PANEL_ID} .better-codex-project-document-agent-avatar img, #\${PANEL_ID} .better-codex-project-document-agent-avatar svg { display: block; width: 100%; height: 100%; object-fit: cover; }
        #\${PANEL_ID} .better-codex-project-document-form output { color: var(--bc-danger); font-size: var(--bc-text-caption); line-height: 1.45; }
        #\${PANEL_ID} .better-codex-project-document-form .better-codex-submit { display: inline-flex; min-height: 36px; align-items: center; justify-content: center; gap: 7px; padding-inline: 13px; }
        #\${PANEL_ID} .better-codex-project-document-form .better-codex-submit svg { width: 14px; height: 14px; }
        @keyframes better-codex-project-document-pulse { 0%,100% { opacity: .45; transform: scale(.94); } 50% { opacity: 1; transform: scale(1); } }
        @keyframes better-codex-project-document-segment { 0%,100% { opacity: .4; } 50% { opacity: 1; } }
        @keyframes better-codex-project-document-spin { to { transform: rotate(360deg); } }
        @keyframes better-codex-project-document-float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }
        @keyframes better-codex-project-document-skeleton { 0%,100% { opacity: .32; } 50% { opacity: .85; } }
        @media (hover:hover) { #\${PANEL_ID} .better-codex-project-card:hover, #\${PANEL_ID} .better-codex-project-issue-toggle:hover, #\${PANEL_ID} .better-codex-project-back:hover { background: var(--bc-hover); } }
        @media (hover:hover) { #\${PANEL_ID} .better-codex-project-document-tab:hover { color: var(--bc-foreground); background: var(--bc-hover); } }
        @media (max-width: 1120px) { #\${PANEL_ID} .better-codex-project-dashboard-summary { grid-template-columns: repeat(2,minmax(0,1fr)); } #\${PANEL_ID} .better-codex-project-cycle { grid-column: 1 / -1; } }
        @media (max-width: 980px) { #\${PANEL_ID} .better-codex-project-summary, #\${PANEL_ID} .better-codex-project-columns, #\${PANEL_ID} .better-codex-project-dashboard-lists { grid-template-columns: 1fr; } #\${PANEL_ID} .better-codex-project-columns { height: auto; } #\${PANEL_ID} .better-codex-project-panel:first-child { height: min(50dvh,480px); min-height: 320px; } #\${PANEL_ID} .better-codex-project-document-panel { height: min(86dvh,820px); min-height: 620px; } }
        @media (max-width: 640px) { #\${PANEL_ID} .better-codex-projects { padding: 12px 12px 24px; } #\${PANEL_ID} .better-codex-project-list, #\${PANEL_ID} .better-codex-project-dashboard-summary { grid-template-columns: 1fr; } #\${PANEL_ID} .better-codex-project-summary { padding: 18px; } #\${PANEL_ID} .better-codex-project-columns { grid-template-columns: minmax(0,1fr); } #\${PANEL_ID} .better-codex-project-document-tab { padding-inline: 8px; } #\${PANEL_ID} .better-codex-project-document-tab svg { display: none; } #\${PANEL_ID} .better-codex-project-document-form > div { grid-template-columns: 1fr; } #\${PANEL_ID} .better-codex-project-dashboard-head { gap: 12px; } #\${PANEL_ID} .better-codex-project-dashboard-people { display: none; } #\${PANEL_ID} .better-codex-project-cycle { grid-column: auto; grid-template-columns: 100px minmax(0,1fr); } #\${PANEL_ID} .better-codex-project-timeline { padding-inline: 14px; } #\${PANEL_ID} .better-codex-project-timeline-legend { display: none; } #\${PANEL_ID} .better-codex-project-milestones { grid-template-columns: 1fr; } #\${PANEL_ID} .better-codex-project-work-row { grid-template-columns: 18px 62px minmax(0,1fr); } #\${PANEL_ID} .better-codex-project-work-state { display: none; } #\${PANEL_ID} .better-codex-project-collaborator-list { grid-template-columns: 1fr; } #\${PANEL_ID} .better-codex-project-collaborator { border-top: 1px solid var(--bc-divider); border-left: 0; padding: 10px 0; } #\${PANEL_ID} .better-codex-project-collaborator:first-child { border-top: 0; } }
        @media (prefers-reduced-motion:reduce) { #\${PANEL_ID} .better-codex-project-issues-loading > span, #\${PANEL_ID} .better-codex-project-document-progress svg, #\${PANEL_ID} .better-codex-project-document-segments i, #\${PANEL_ID} .better-codex-project-document-tab > i, #\${PANEL_ID} .better-codex-project-document-notice svg, #\${PANEL_ID} .better-codex-project-document-orbit, #\${PANEL_ID} .better-codex-project-document-skeleton i { animation: none; } }
        #\${PANEL_ID} .better-codex-agent-heading { display: none; min-width: 0; align-items: baseline; gap: 4px; }
        #\${PANEL_ID} .better-codex-agent-heading strong { color: #18181b; font-size: var(--bc-text-md); font-weight: 650; }
        #\${PANEL_ID} .better-codex-agent-heading span { color: var(--bc-muted); font-size: var(--bc-text-sm); }
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
        #\${PANEL_ID} .better-codex-agent-card-avatar { display: inline-flex; width: 36px; height: 36px; flex: 0 0 auto; align-items: center; justify-content: center; border-radius: 10px; color: #fff; background: #27272a; font-size: var(--bc-text-md); font-weight: 700; letter-spacing: -.02em; }
        #\${PANEL_ID} .better-codex-agent-card-avatar.is-codex { overflow: hidden; color: inherit; background: transparent; }
        #\${PANEL_ID} .better-codex-agent-card-avatar.is-codex svg { width: 36px; height: 36px; }
        #\${PANEL_ID} .better-codex-agent-card-title { min-width: 0; flex: 1; }
        #\${PANEL_ID} .better-codex-agent-card-title-line { display: flex; min-width: 0; align-items: center; gap: 7px; }
        #\${PANEL_ID} .better-codex-agent-card-title strong { display: block; overflow: hidden; font-size: var(--bc-text-md); font-weight: 650; text-overflow: ellipsis; white-space: nowrap; }
        #\${PANEL_ID} .better-codex-agent-default-badge { flex: 0 0 auto; border: 1px solid var(--bc-divider); border-radius: 999px; color: var(--bc-muted); background: var(--bc-hover); padding: 1px 6px; font-size: var(--bc-text-xs); font-weight: 600; line-height: 1.4; }
        #\${PANEL_ID} .better-codex-agent-card-description { display: -webkit-box; margin-top: 3px; overflow: hidden; color: var(--bc-muted); font-size: var(--bc-text-sm); line-height: 1.45; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }
        #\${PANEL_ID} .better-codex-agent-card-instructions { display: -webkit-box; min-height: 54px; margin-top: 14px; overflow: hidden; color: #52525b; font-size: var(--bc-text-caption); line-height: 1.55; -webkit-box-orient: vertical; -webkit-line-clamp: 3; }
        #\${PANEL_ID} .better-codex-agent-card-meta { display: flex; align-items: center; flex-wrap: wrap; gap: 6px; margin-top: auto; padding-top: 14px; }
        #\${PANEL_ID} .better-codex-agent-card-actions { display: flex; align-items: center; gap: 4px; margin-left: auto; }
        #\${PANEL_ID} .better-codex-agent-card-action { display: inline-flex; width: 26px; height: 26px; align-items: center; justify-content: center; border: 0; border-radius: 6px; color: #71717a; background: transparent; padding: 0; cursor: pointer; }
        #\${PANEL_ID} .better-codex-agent-card-action:hover { color: #27272a; background: #f1f1f2; }
        #\${PANEL_ID} .better-codex-agent-card-action.is-danger:hover { color: var(--bc-danger); background: #fff1f1; }
        #\${PANEL_ID} .better-codex-agent-card-action:active, #\${PANEL_ID} .better-codex-button:active { transform: scale(.96); }
        #\${PANEL_ID} .better-codex-agents-empty { max-width: 460px; margin: 12vh auto 0; text-align: center; }
        #\${PANEL_ID} .better-codex-agents-empty-icon { display: inline-flex; width: 48px; height: 48px; align-items: center; justify-content: center; border: 1px solid var(--bc-border); border-radius: 14px; color: #52525b; background: #fff; box-shadow: 0 1px 3px rgba(15,23,42,.08); }
        #\${PANEL_ID} .better-codex-agents-empty strong { display: block; margin-top: 14px; color: #27272a; font-size: var(--bc-text-md); }
        #\${PANEL_ID} .better-codex-agents-empty p { margin: 6px 0 14px; color: var(--bc-muted); font-size: var(--bc-text-md); line-height: 1.6; }
        #better-codex-agent-dialog { position: fixed; inset: 0; box-sizing: border-box; width: min(720px,calc(100vw - 40px)); height: min(86vh,760px); margin: auto; overflow: hidden; border: 1px solid #dedee2; border-radius: 14px; color: #27272a; background: #f8f8f9; padding: 0; box-shadow: 0 24px 64px rgba(15,23,42,.18),0 4px 14px rgba(15,23,42,.08); font-family: var(--bc-font-ui); }
        #better-codex-agent-dialog::backdrop { background: rgba(24,24,27,.22); backdrop-filter: blur(4px); }
        #better-codex-agent-dialog form { display: flex; height: 100%; min-height: 0; flex-direction: column; }
        #better-codex-agent-dialog .better-codex-agent-dialog-head { display: flex; flex: 0 0 auto; align-items: center; justify-content: space-between; border-bottom: 1px solid #e4e4e7; background: #fff; padding: 15px 18px; }
        #better-codex-agent-dialog .better-codex-agent-dialog-head strong { display: block; font-size: var(--bc-text-md); font-weight: 650; }
        #better-codex-agent-dialog .better-codex-agent-dialog-head span { display: block; margin-top: 3px; color: #71717a; font-size: var(--bc-text-sm); }
        #better-codex-agent-dialog .better-codex-agent-dialog-body { min-height: 0; flex: 1; overflow-y: auto; padding: 20px; }
        #better-codex-agent-dialog .better-codex-agent-section { max-width: 620px; margin: 0 auto 22px; }
        #better-codex-agent-dialog .better-codex-agent-section-title { margin: 0 0 9px 2px; }
        #better-codex-agent-dialog .better-codex-agent-section-title strong { display: block; font-size: var(--bc-text-md); font-weight: 650; }
        #better-codex-agent-dialog .better-codex-agent-section-title span { display: block; margin-top: 2px; color: #71717a; font-size: var(--bc-text-caption); }
        #better-codex-agent-dialog .better-codex-agent-settings { overflow: hidden; border: 1px solid #e2e2e5; border-radius: 11px; background: #fff; box-shadow: 0 1px 3px rgba(15,23,42,.06); }
        #better-codex-agent-dialog .better-codex-agent-field { display: grid; grid-template-columns: 132px minmax(0,1fr); gap: 16px; align-items: center; padding: 13px 15px; }
        #better-codex-agent-dialog .better-codex-agent-field + .better-codex-agent-field { border-top: 1px solid #ededee; }
        #better-codex-agent-dialog .better-codex-agent-field.is-top { align-items: start; }
        #better-codex-agent-dialog .better-codex-agent-field > label { padding-top: 7px; color: #52525b; font-size: var(--bc-text-sm); font-weight: 550; }
        #better-codex-agent-dialog input, #better-codex-agent-dialog textarea, #better-codex-agent-dialog select { box-sizing: border-box; width: 100%; border: 1px solid #dedee2; border-radius: 7px; color: #27272a; background: #fff; padding: 8px 10px; font: inherit; font-size: var(--bc-text-md); outline: none; }
        #better-codex-agent-dialog input:focus, #better-codex-agent-dialog textarea:focus, #better-codex-agent-dialog select:focus { border-color: #a1a1aa; box-shadow: 0 0 0 2px rgba(24,24,27,.06); }
        #better-codex-agent-dialog textarea { min-height: 74px; line-height: 1.55; resize: vertical; }
        #better-codex-agent-dialog textarea[name="instructions"] { min-height: 190px; font-size: var(--bc-text-sm); }
        #better-codex-agent-dialog .better-codex-agent-execution { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; padding: 15px; }
        #better-codex-agent-dialog .better-codex-agent-execution label { display: block; margin-bottom: 6px; color: #52525b; font-size: var(--bc-text-sm); font-weight: 550; }
        #better-codex-agent-dialog .better-codex-agent-dialog-error { max-width: 620px; margin: 0 auto 8px; color: var(--bc-danger,#e5484d); font-size: var(--bc-text-sm); }
        #better-codex-agent-dialog .better-codex-agent-dialog-footer { display: flex; min-height: 58px; flex: 0 0 auto; align-items: center; justify-content: flex-end; gap: 8px; border-top: 1px solid #e4e4e7; background: #fff; padding: 0 18px; }
        #better-codex-agent-dialog .better-codex-button, #better-codex-agent-dialog .better-codex-submit { display: inline-flex; min-height: 30px; align-items: center; justify-content: center; border-radius: 7px; padding: 0 12px; font: inherit; font-size: var(--bc-text-sm); cursor: pointer; }
        #better-codex-agent-dialog .better-codex-button { border: 1px solid #dedee2; color: #52525b; background: #fff; }
        #better-codex-agent-dialog .better-codex-submit { min-width: 92px; border: 1px solid #27272a; color: #fff; background: #27272a; font-weight: 600; }
        #better-codex-agent-dialog .better-codex-button:active, #better-codex-agent-dialog .better-codex-submit:active { transform: scale(.96); }
        #better-codex-agent-dialog .better-codex-submit:disabled { opacity: .55; cursor: not-allowed; }
        @media (max-width: 640px) { #better-codex-agent-dialog .better-codex-agent-field { grid-template-columns: 1fr; gap: 5px; } #better-codex-agent-dialog .better-codex-agent-field > label { padding-top: 0; } #better-codex-agent-dialog .better-codex-agent-execution { grid-template-columns: 1fr; } }
        #better-codex-project-dialog { position: fixed; inset: 0; box-sizing: border-box; width: min(500px,calc(100vw - 32px)); margin: auto; border: 0; border-radius: var(--bc-radius-xl, 20px); color: var(--bc-foreground); background: var(--bc-raised); padding: 0; box-shadow: var(--bc-floating-shadow); font-family: var(--bc-font-ui); }
        #better-codex-project-dialog::backdrop { background: var(--bc-scrim); }
        #better-codex-project-dialog form { padding: 24px; }
        #better-codex-project-dialog h2 { margin: 0; font-size: var(--bc-text-xl); font-weight: 650; }
        #better-codex-project-dialog > form > p { margin: 7px 0 20px; color: var(--bc-muted); font-size: var(--bc-text-sm); line-height: 1.65; }
        #better-codex-project-dialog label { display: grid; gap: 7px; margin-top: 14px; color: var(--bc-muted); font-size: var(--bc-text-sm); font-weight: 600; }
        #better-codex-project-dialog input { box-sizing: border-box; width: 100%; min-height: 40px; border: 0; border-radius: var(--bc-radius-sm, 10px); color: var(--bc-foreground); background: var(--bc-control); padding: 0 11px; font: inherit; font-weight: 400; }
        #better-codex-project-dialog input:focus-visible, #better-codex-project-dialog button:focus-visible { outline: 2px solid var(--bc-ring); outline-offset: 2px; }
        #better-codex-project-dialog .better-codex-project-folder-field { display: grid; grid-template-columns: minmax(0,1fr) auto; gap: 8px; }
        #better-codex-project-dialog .better-codex-project-folder-field button, #better-codex-project-dialog .better-codex-project-dialog-actions button { min-height: 40px; border: 0; border-radius: var(--bc-radius-sm, 10px); color: var(--bc-foreground); background: var(--bc-control); padding: 0 12px; font: inherit; cursor: pointer; }
        #better-codex-project-dialog .better-codex-project-dialog-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 22px; }
        #better-codex-project-dialog .better-codex-project-dialog-actions button[type="submit"] { color: var(--bc-primary-foreground); background: var(--bc-primary); }
        #better-codex-project-dialog output { display: block; margin-top: 10px; color: var(--bc-danger); font-size: var(--bc-text-sm); }
        #better-codex-project-dialog output[hidden] { display: none; }
        #better-codex-project-dialog button:active { transform: scale(.96); }
        #better-codex-project-dialog[data-directory-browser="true"] { width: min(640px,calc(100vw - 32px)); max-height: calc(100dvh - 32px); overflow-y: auto; overscroll-behavior: contain; }
        #better-codex-project-dialog .better-codex-directory-browser { display: flex; min-height: 0; flex-direction: column; margin-top: 14px; overflow: hidden; border: 1px solid var(--bc-border); border-radius: var(--bc-radius-md, 12px); background: var(--bc-surface); }
        #better-codex-project-dialog .better-codex-directory-browser[hidden] { display: none; }
        #better-codex-project-dialog .better-codex-directory-toolbar { display: grid; grid-template-columns: 40px minmax(0,1fr) auto; gap: 6px; align-items: center; padding: 8px; border-bottom: 1px solid var(--bc-divider); background: var(--bc-raised); }
        #better-codex-project-dialog .better-codex-directory-toolbar input { min-width: 0; min-height: 40px; background: var(--bc-control); }
        #better-codex-project-dialog .better-codex-directory-toolbar button, #better-codex-project-dialog .better-codex-directory-shortcuts button, #better-codex-project-dialog .better-codex-directory-select { display: inline-flex; min-width: 40px; min-height: 40px; align-items: center; justify-content: center; gap: 6px; border: 0; border-radius: var(--bc-radius-sm, 10px); color: var(--bc-foreground); background: var(--bc-control); padding: 0 11px; font: inherit; cursor: pointer; }
        #better-codex-project-dialog .better-codex-directory-toolbar button:disabled, #better-codex-project-dialog .better-codex-directory-shortcuts button:disabled, #better-codex-project-dialog .better-codex-directory-select:disabled { opacity: .45; cursor: not-allowed; }
        #better-codex-project-dialog .better-codex-directory-shortcuts { display: flex; gap: 6px; padding: 7px 8px; border-bottom: 1px solid var(--bc-divider); }
        #better-codex-project-dialog .better-codex-directory-shortcuts button { min-height: 32px; padding: 0 10px; color: var(--bc-muted); background: transparent; font-size: var(--bc-text-sm); }
        #better-codex-project-dialog .better-codex-directory-list { height: min(300px,34dvh); min-height: 160px; overflow-y: auto; overscroll-behavior: contain; padding: 6px; }
        #better-codex-project-dialog .better-codex-directory-row { display: grid; grid-template-columns: 20px minmax(0,1fr) 16px; width: 100%; min-height: 40px; align-items: center; gap: 8px; border: 0; border-radius: var(--bc-radius-sm, 10px); color: var(--bc-foreground); background: transparent; padding: 0 10px; font: inherit; text-align: left; cursor: pointer; }
        #better-codex-project-dialog .better-codex-directory-row span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        #better-codex-project-dialog .better-codex-directory-row > svg:last-child { color: var(--bc-muted); }
        #better-codex-project-dialog .better-codex-directory-state { display: flex; height: 100%; min-height: 148px; align-items: center; justify-content: center; color: var(--bc-muted); padding: 0 18px; font-size: var(--bc-text-sm); text-align: center; }
        #better-codex-project-dialog .better-codex-directory-footer { display: flex; min-height: 56px; align-items: center; justify-content: space-between; gap: 12px; border-top: 1px solid var(--bc-divider); padding: 8px; }
        #better-codex-project-dialog .better-codex-directory-footer [data-directory-status] { min-width: 0; overflow-wrap: anywhere; color: var(--bc-muted); font-size: var(--bc-text-sm); font-weight: 400; }
        #better-codex-project-dialog .better-codex-directory-select { flex: 0 0 auto; color: var(--bc-primary-foreground); background: var(--bc-primary); }
        @media (hover:hover) { #better-codex-project-dialog .better-codex-directory-row:hover, #better-codex-project-dialog .better-codex-directory-toolbar button:hover, #better-codex-project-dialog .better-codex-directory-shortcuts button:hover { background: var(--bc-hover); } }
        @media (max-width: 480px) { #better-codex-project-dialog[data-directory-browser="true"] { width: calc(100vw - 20px); max-height: calc(100dvh - 20px); } #better-codex-project-dialog[data-directory-browser="true"] form { padding: 18px; } #better-codex-project-dialog .better-codex-directory-toolbar { grid-template-columns: 40px minmax(0,1fr); } #better-codex-project-dialog .better-codex-directory-toolbar [data-directory-go] { grid-column: 1 / -1; } #better-codex-project-dialog .better-codex-directory-footer { align-items: stretch; flex-direction: column; } #better-codex-project-dialog .better-codex-directory-select { width: 100%; } }
        #better-codex-confirm { position: fixed; inset: 0; box-sizing: border-box; width: min(420px,calc(100vw - 40px)); margin: auto; overflow: hidden; border: 1px solid var(--bc-border); border-radius: 13px; color: var(--bc-foreground); background: var(--bc-raised); padding: 0; box-shadow: var(--bc-floating-shadow); font-family: var(--bc-font-ui); }
        #better-codex-confirm::backdrop { background: var(--bc-scrim); backdrop-filter: blur(4px); }
        #better-codex-confirm .better-codex-confirm-body { padding: 20px 20px 17px; }
        #better-codex-confirm .better-codex-confirm-title { margin: 0; font-size: var(--bc-text-md); font-weight: 650; line-height: 1.45; }
        #better-codex-confirm .better-codex-confirm-message { margin: 7px 0 0; color: var(--bc-muted); font-size: var(--bc-text-md); line-height: 1.6; }
        #better-codex-confirm .better-codex-confirm-actions { display: flex; min-height: 52px; align-items: center; justify-content: flex-end; gap: 8px; border-top: 1px solid var(--bc-divider); padding: 0 16px; }
        #better-codex-confirm button { display: inline-flex; min-width: 72px; height: 30px; align-items: center; justify-content: center; border: 1px solid var(--bc-border); border-radius: 7px; color: var(--bc-foreground); background: var(--bc-surface); padding: 0 12px; font: inherit; font-size: var(--bc-text-md); font-weight: 550; cursor: pointer; }
        #better-codex-confirm button:hover, #better-codex-confirm button:focus-visible { background: var(--bc-hover); outline: none; }
        #better-codex-confirm button:focus-visible { box-shadow: 0 0 0 2px color-mix(in oklch,var(--bc-ring) 28%,transparent); }
        #better-codex-confirm .better-codex-confirm-primary { border-color: var(--bc-danger); color: #fff; background: var(--bc-danger); }
        #better-codex-confirm .better-codex-confirm-primary:hover, #better-codex-confirm .better-codex-confirm-primary:focus-visible { background: color-mix(in oklch,var(--bc-danger) 88%,#000); }
        #better-codex-dialog { position: fixed; inset: 0; box-sizing: border-box; width: min(806px, calc(100vw - 48px)); height: calc(var(--bc-text-base, 14px) * 38); max-height: calc(100vh - 48px); margin: auto; overflow: visible; border: 1px solid #e4e4e7; border-radius: 14px; color: #27272a; background: #fff; padding: 0; box-shadow: 0 24px 64px rgba(15,23,42,.18),0 4px 14px rgba(15,23,42,.08); font-family: var(--bc-font-ui); transition: width .3s ease,height .3s ease; }
        #better-codex-dialog[data-mode="agent"] { width: min(691px, calc(100vw - 48px)); height: min(var(--bc-dialog-agent-height, 400px), calc(100vh - 48px)); }
        #better-codex-dialog[data-expanded="true"] { width: min(1075px, calc(100vw - 48px)); height: min(84vh, 912px); }
        #better-codex-dialog::backdrop { background: rgba(24,24,27,.19); backdrop-filter: blur(4px); }
        #better-codex-dialog form { display: flex; width: 100%; height: 100%; min-height: 0; flex-direction: column; }
        #better-codex-dialog .better-codex-dialog-head { display: flex; flex: 0 0 auto; align-items: center; justify-content: space-between; padding: 12px 18px 8px 20px; }
        #better-codex-dialog .better-codex-dialog-breadcrumb { display: flex; min-width: 0; align-items: center; gap: 6px; color: #71717a; font-size: var(--bc-text-md); }
        #better-codex-dialog .better-codex-dialog-breadcrumb strong { overflow: hidden; color: #27272a; font-weight: 550; text-overflow: ellipsis; white-space: nowrap; }
        #better-codex-dialog .better-codex-dialog-head-actions { display: flex; align-items: center; gap: 2px; }
        #better-codex-dialog .better-codex-icon-button { display: inline-flex; width: var(--bc-control-height, 32px); height: var(--bc-control-height, 32px); align-items: center; justify-content: center; border: 0; border-radius: 5px; color: #52525b; background: transparent; padding: 0; cursor: pointer; opacity: .72; }
        #better-codex-dialog .better-codex-icon-button:hover { background: #f4f4f5; opacity: 1; }
        #better-codex-dialog .better-codex-dialog-stop { color: #dc2626; }
        #better-codex-dialog .better-codex-dialog-stop:hover { color: #b91c1c; background: #fef2f2; }
        #better-codex-dialog .better-codex-manual-title { width: auto; margin: 0 20px 4px; border: 0; color: #27272a; background: transparent; padding: 0; font: inherit; font-size: var(--bc-text-xl); font-weight: 600; line-height: 1.45; outline: none; }
        #better-codex-dialog .better-codex-manual-title::placeholder { color: #71717a; opacity: 1; }
        #better-codex-dialog .better-codex-dialog-editor { box-sizing: border-box; width: auto; min-height: 0; flex: 1; margin: 0 20px; overflow-y: auto; border: 0; color: #3f3f46; background: transparent; padding: 2px 0; font: inherit; font-size: var(--bc-text-md); line-height: 1.55; outline: none; resize: none; }
        #better-codex-dialog .better-codex-dialog-editor::placeholder { color: #8b8b94; opacity: 1; }
        #better-codex-dialog[data-mode="agent"] .better-codex-dialog-editor { margin-top: 2px; min-height: 120px; }
        #better-codex-dialog .better-codex-agent-picker { display: flex; flex: 0 0 auto; align-items: center; gap: 8px; padding: 5px 20px 8px; color: #71717a; font-size: var(--bc-text-md); }
        #better-codex-dialog .better-codex-agent-assignee { display: flex; min-width: 0; align-items: center; gap: 6px; color: #3f3f46; font-weight: 550; }
        #better-codex-dialog .better-codex-agent-assignee select { max-width: 260px; border: 0; color: inherit; background: transparent; padding: 2px 20px 2px 0; font: inherit; font-weight: inherit; outline: none; cursor: pointer; }
        #better-codex-dialog .better-codex-agent-assignee:focus-within { border-radius: 5px; box-shadow: 0 0 0 2px rgba(24,24,27,.08); }
        #better-codex-dialog .better-codex-agent-avatar { display: inline-flex; width: 18px; height: 18px; align-items: center; justify-content: center; border-radius: 999px; color: #fff; background: #3f3f46; font-size: var(--bc-text-avatar); }
        #better-codex-dialog .better-codex-agent-avatar.is-codex { overflow: hidden; color: inherit; background: transparent; }
        #better-codex-dialog .better-codex-agent-avatar svg { width: 18px; height: 18px; }
        #better-codex-dialog .better-codex-agent-avatar.has-image { overflow: hidden; }
        #better-codex-dialog .better-codex-agent-avatar img { width: 100%; height: 100%; object-fit: cover; }
        #better-codex-dialog .better-codex-run-hint { display: flex; flex: 0 0 auto; align-items: center; gap: 7px; padding: 1px 20px 4px; color: #8b8b94; font-size: var(--bc-text-md); }
        #better-codex-dialog .better-codex-dialog-properties { display: flex; flex: 0 0 auto; align-items: center; flex-wrap: wrap; gap: 6px; padding: 6px 16px 9px; }
        #better-codex-dialog .better-codex-property { display: inline-flex; height: var(--bc-control-height, 32px); max-width: 190px; align-items: center; gap: 6px; overflow: hidden; border: 1px solid #e5e5e7; border-radius: 999px; color: #52525b; background: #fff; padding: 0 9px; font: inherit; font-size: var(--bc-text-md); text-overflow: ellipsis; white-space: nowrap; }
        #better-codex-dialog button.better-codex-property { cursor: pointer; }
        #better-codex-dialog .better-codex-property select, #better-codex-dialog .better-codex-property input { width: auto; max-width: 128px; border: 0; color: inherit; background: transparent; padding: 0; font: inherit; font-size: inherit; outline: none; }
        #better-codex-dialog .better-codex-property input { width: 72px; }
        #better-codex-dialog .better-codex-project-picker { position: relative; display: inline-flex; }
        #better-codex-dialog .better-codex-project-menu { position: absolute; top: calc(100% + 6px); right: 0; bottom: auto; z-index: 30; display: flex; box-sizing: border-box; width: 220px; max-height: min(320px, calc(100dvh - 32px)); overflow: hidden; flex-direction: column; border: 1px solid #e4e4e7; border-radius: 9px; color: #3f3f46; background: #fff; padding: 5px; box-shadow: 0 12px 30px rgba(15,23,42,.14),0 2px 7px rgba(15,23,42,.08); }
        #better-codex-dialog .better-codex-project-menu.is-above { top: auto; bottom: calc(100% + 6px); flex-direction: column-reverse; }
        #better-codex-dialog .better-codex-project-menu[hidden] { display: none; }
        #better-codex-dialog .better-codex-project-search { box-sizing: border-box; width: 100%; height: var(--bc-control-height, 32px); border: 0; border-bottom: 1px solid #ededee; color: inherit; background: transparent; padding: 0 7px 4px; font: inherit; font-size: var(--bc-text-md); outline: none; }
        #better-codex-dialog .better-codex-project-menu > [data-project-options] { display: flex; min-height: 0; max-height: min(260px, calc(100dvh - 96px)); overflow-y: auto; flex-direction: column; overscroll-behavior: contain; }
        #better-codex-dialog .better-codex-project-menu.is-above > [data-project-options] { flex-direction: column-reverse; }
        #better-codex-dialog .better-codex-project-option { display: flex; width: 100%; min-height: var(--bc-row-height, 34px); align-items: center; gap: 7px; border: 0; border-radius: 6px; color: inherit; background: transparent; padding: 0 7px; font: inherit; font-size: var(--bc-text-md); text-align: left; cursor: pointer; }
        #better-codex-dialog .better-codex-project-option:hover, #better-codex-dialog .better-codex-project-option:focus-visible { background: #f4f4f5; outline: none; }
        #better-codex-dialog .better-codex-project-option > span:first-of-type { min-width: 0; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        #better-codex-dialog .better-codex-project-check { width: 14px; flex: 0 0 auto; }
        #better-codex-dialog .better-codex-project-empty { padding: 8px 7px; color: #a1a1aa; font-size: var(--bc-text-md); }
        #better-codex-dialog .better-codex-dialog-attachments { display: flex; flex: 0 0 auto; flex-wrap: wrap; gap: 6px; padding: 0 16px 8px; }
        #better-codex-dialog .better-codex-dialog-attachments[hidden] { display: none; }
        #better-codex-dialog .better-codex-attachment-chip { display: inline-flex; max-width: 100%; min-height: 28px; align-items: center; gap: 6px; border: 1px solid #e5e5e7; border-radius: 999px; color: #52525b; background: #fff; padding: 0 4px 0 9px; font-size: var(--bc-text-md); }
        #better-codex-dialog .better-codex-attachment-chip.is-image { height: 38px; border-radius: 8px; padding-left: 4px; }
        #better-codex-dialog .better-codex-attachment-preview { width: 30px; height: 30px; flex: 0 0 auto; border-radius: 5px; object-fit: cover; outline: 1px solid var(--bc-border); outline-offset: -1px; }
        #better-codex-dialog .better-codex-attachment-chip > span { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        #better-codex-dialog .better-codex-attachment-chip button { display: inline-flex; width: 22px; height: 22px; flex: 0 0 auto; align-items: center; justify-content: center; border: 0; border-radius: 999px; color: #71717a; background: transparent; padding: 0; cursor: pointer; }
        #better-codex-dialog .better-codex-attachment-chip button:hover { color: #27272a; background: #f4f4f5; }
        #better-codex-dialog .better-codex-dialog-footer { display: flex; min-height: 48px; flex: 0 0 auto; align-items: center; justify-content: space-between; gap: 10px; border-top: 1px solid #ededee; padding: 0 14px 0 18px; }
        #better-codex-dialog .better-codex-dialog-footer-right { display: flex; align-items: center; justify-content: flex-end; gap: 8px; }
        #better-codex-dialog .better-codex-switch-mode { display: inline-flex; height: var(--bc-control-height, 32px); align-items: center; gap: 6px; border: 0; border-radius: 5px; color: #71717a; background: transparent; padding: 0 8px; font: inherit; font-size: var(--bc-text-md); cursor: pointer; }
        #better-codex-dialog[data-mode="manual"] .better-codex-switch-mode { color: #5b6472; background: #f7f9ff; box-shadow: inset 0 0 0 1px rgba(75,107,251,.08); }
        #better-codex-dialog .better-codex-switch-mode:hover { color: #27272a; background: #f4f4f5; }
        #better-codex-dialog .better-codex-keep-open { display: flex; align-items: center; gap: 6px; color: #71717a; font-size: var(--bc-text-md); cursor: pointer; user-select: none; }
        #better-codex-dialog .better-codex-toggle { position: relative; width: 23px; height: 13px; appearance: none; -webkit-appearance: none; border: 0; outline: 0; border-radius: 999px; background: #d4d4d8; box-shadow: none; padding: 0; cursor: pointer; transition: background .15s; }
        #better-codex-dialog .better-codex-toggle:focus, #better-codex-dialog .better-codex-toggle:focus-visible { outline: 0; box-shadow: none; }
        #better-codex-dialog .better-codex-toggle::after { position: absolute; top: 2px; left: 2px; width: 9px; height: 9px; border-radius: 999px; background: #fff; box-shadow: 0 1px 2px rgba(0,0,0,.2); content: ""; transition: transform .15s; }
        #better-codex-dialog .better-codex-toggle:checked { background: #27272a; }
        #better-codex-dialog .better-codex-toggle:checked::after { transform: translateX(10px); }
        #better-codex-dialog .better-codex-submit { display: inline-flex; min-width: 112px; height: var(--bc-control-height, 32px); align-items: center; justify-content: center; gap: 6px; border: 0; border-radius: 7px; color: #fff; background: #27272a; padding: 0 11px; font: inherit; font-size: var(--bc-text-md); font-weight: 550; cursor: pointer; }
        #better-codex-dialog .better-codex-submit:disabled { color: #fff; background: #a1a1aa; cursor: not-allowed; opacity: .72; }
        #better-codex-dialog .better-codex-dialog-error { padding: 0 20px 6px; color: #e5484d; font-size: var(--bc-text-md); }
        #\${PANEL_ID} { color: var(--bc-foreground); background: var(--bc-page); }
        #\${PANEL_ID} .better-codex-toolbar { background: var(--bc-page); }
        #\${PANEL_ID} .better-codex-button, #better-codex-dialog .better-codex-button { color: var(--bc-muted); }
        #\${PANEL_ID} .better-codex-button:hover, #better-codex-dialog .better-codex-button:hover { color: var(--bc-foreground); background: var(--bc-hover); }
        #\${PANEL_ID} .better-codex-button.is-active { color: var(--bc-foreground); background: var(--bc-selected); }
        #\${PANEL_ID} .better-codex-button.is-bordered { border-color: var(--bc-border); background: var(--bc-surface); box-shadow: var(--bc-surface-shadow); }
        #\${PANEL_ID} .better-codex-working-chip.has-work { border-color: color-mix(in oklch,var(--bc-warning) 35%,var(--bc-border)); color: color-mix(in oklch,var(--bc-warning) 72%,var(--bc-foreground)); background: color-mix(in oklch,var(--bc-warning) 9%,var(--bc-surface)); }
        #\${PANEL_ID} .better-codex-search { border-color: var(--bc-input); color: var(--bc-foreground); background: var(--bc-surface); }
        #\${PANEL_ID} .better-codex-search::placeholder { color: var(--bc-muted); }
        #\${PANEL_ID} .better-codex-search:focus { border-color: var(--bc-ring); box-shadow: 0 0 0 2px color-mix(in oklch,var(--bc-ring) 20%,transparent); }
        #\${PANEL_ID} .better-codex-filter-menu, #\${PANEL_ID} .better-codex-filter-submenu, #better-codex-context-menu, #better-codex-context-menu .better-codex-context-submenu { border-color: var(--bc-border); color: var(--bc-foreground); background: var(--bc-raised); box-shadow: var(--bc-menu-shadow); }
        #\${PANEL_ID} .better-codex-filter-row:hover, #\${PANEL_ID} .better-codex-filter-row.is-active, #better-codex-context-menu .better-codex-context-item:hover, #better-codex-context-menu .better-codex-context-item:focus-visible, #better-codex-context-menu .better-codex-context-item-wrap:hover > .better-codex-context-item { background: var(--bc-hover); }
        #\${PANEL_ID} .better-codex-filter-count, #\${PANEL_ID} .better-codex-filter-chevron { color: var(--bc-muted); }
        #\${PANEL_ID} .better-codex-filter-check, #better-codex-context-menu .better-codex-context-check { color: var(--bc-foreground); }
        #\${PANEL_ID} .better-codex-filter-separator, #better-codex-context-menu .better-codex-context-divider { background: var(--bc-divider); }
        #better-codex-context-menu .better-codex-context-item.is-danger { color: var(--bc-danger); }
        #\${PANEL_ID} .better-codex-column[data-status="backlog"], #\${PANEL_ID} .better-codex-column[data-status="todo"], #\${PANEL_ID} .better-codex-column[data-status="archive"] { background: color-mix(in oklch,var(--bc-hover) 70%,transparent); }
        #\${PANEL_ID} .better-codex-column[data-status="in_progress"] { background: color-mix(in oklch,var(--bc-warning) 8%,transparent); }
        #\${PANEL_ID} .better-codex-column[data-status="in_review"] { background: color-mix(in oklch,var(--bc-success) 8%,transparent); }
        #\${PANEL_ID} .better-codex-column[data-status="done"] { background: color-mix(in oklch,var(--bc-info) 8%,transparent); }
        #\${PANEL_ID} .better-codex-column[data-status="blocked"] { background: color-mix(in oklch,var(--bc-danger) 8%,transparent); }
        #\${PANEL_ID} .better-codex-column-icon:hover { background: var(--bc-hover); }
        #\${PANEL_ID} .better-codex-card { border-color: var(--bc-color-hairline); color: var(--bc-foreground); background: var(--bc-color-canvas); box-shadow: var(--bc-card-shadow); }
        #\${PANEL_ID} .better-codex-card:hover { border-color: color-mix(in srgb, var(--bc-color-text) 16%, var(--bc-color-hairline)); background: var(--bc-color-canvas); }
        #\${PANEL_ID} .better-codex-card-title { color: var(--bc-foreground); }
        #\${PANEL_ID} .better-codex-chip { color: var(--bc-muted); background: var(--bc-hover); }
        #\${PANEL_ID} .better-codex-card-avatar { color: var(--bc-primary-foreground); background: var(--bc-primary); }
        #\${PANEL_ID} .better-codex-card-avatar.is-fallback, #\${PANEL_ID} .better-codex-card-avatar.is-icon { color: var(--bc-muted); background: var(--bc-hover); }
        #\${PANEL_ID} .better-codex-card-avatar.is-codex { color: inherit; background: transparent; }
        #\${PANEL_ID} .better-codex-avatar, #\${PANEL_ID} .better-codex-agent-card-avatar { color: var(--bc-primary-foreground); background: var(--bc-primary); }
        #\${PANEL_ID} .better-codex-activity[data-run="running"], #\${PANEL_ID} .better-codex-activity[data-run="scheduling"], #\${PANEL_ID} .better-codex-activity[data-run="thinking"] { color: var(--bc-foreground); }
        #\${PANEL_ID} .better-codex-activity[data-run="scheduler-failed"] { color: var(--bc-danger); }
        #\${PANEL_ID} .better-codex-activity[data-run="completed"] { color: var(--bc-success); }
        #\${PANEL_ID} .better-codex-activity[data-run="failed"] { color: var(--bc-danger); }
        #\${PANEL_ID} .better-codex-activity[data-run="interrupted"] { color: var(--bc-danger); }
        #\${PANEL_ID} .better-codex-activity[data-run="not-started"] { color: var(--bc-muted); font-weight: 500; }
        #\${PANEL_ID} .better-codex-shimmer { background-image: linear-gradient(90deg,var(--bc-muted) 0%,var(--bc-muted) 35%,var(--bc-foreground) 50%,var(--bc-muted) 65%,var(--bc-muted) 100%); }
        #\${PANEL_ID} .better-codex-empty { color: var(--bc-faint); }
        #\${PANEL_ID} .better-codex-agent-heading strong, #\${PANEL_ID} .better-codex-agents-empty strong { color: var(--bc-foreground); }
        #\${PANEL_ID} .better-codex-agent-card { border-color: var(--bc-border); color: var(--bc-foreground); background: var(--bc-surface); box-shadow: var(--bc-card-shadow); }
        #\${PANEL_ID} .better-codex-agent-card:hover { border-color: var(--bc-ring); }
        #\${PANEL_ID} .better-codex-agent-card-instructions { color: color-mix(in oklch,var(--bc-foreground) 72%,var(--bc-muted)); }
        #\${PANEL_ID} .better-codex-agent-card-action { color: var(--bc-muted); }
        #\${PANEL_ID} .better-codex-agent-card-action:hover { color: var(--bc-foreground); background: var(--bc-hover); }
        #\${PANEL_ID} .better-codex-agent-card-action.is-danger:hover { color: var(--bc-danger); background: color-mix(in oklch,var(--bc-danger) 10%,var(--bc-surface)); }
        #\${PANEL_ID} .better-codex-agents-empty-icon { border-color: var(--bc-border); color: var(--bc-muted); background: var(--bc-surface); box-shadow: var(--bc-card-shadow); }
        #better-codex-agent-dialog, #better-codex-dialog { border-color: var(--bc-border); color: var(--bc-foreground); background: var(--bc-page); box-shadow: var(--bc-floating-shadow); }
        #better-codex-agent-dialog::backdrop, #better-codex-dialog::backdrop { background: var(--bc-scrim); }
        #better-codex-agent-dialog .better-codex-agent-dialog-head, #better-codex-agent-dialog .better-codex-agent-dialog-footer { border-color: var(--bc-divider); background: var(--bc-raised); }
        #better-codex-agent-dialog .better-codex-agent-dialog-head span, #better-codex-agent-dialog .better-codex-agent-section-title span { color: var(--bc-muted); }
        #better-codex-agent-dialog .better-codex-agent-settings { border-color: var(--bc-border); background: var(--bc-surface); box-shadow: var(--bc-surface-shadow); }
        #better-codex-agent-dialog .better-codex-agent-field + .better-codex-agent-field { border-color: var(--bc-divider); }
        #better-codex-agent-dialog .better-codex-agent-field > label, #better-codex-agent-dialog .better-codex-agent-execution label { color: var(--bc-muted); }
        #better-codex-agent-dialog input, #better-codex-agent-dialog textarea, #better-codex-agent-dialog select { border-color: var(--bc-input); color: var(--bc-foreground); background: var(--bc-raised); }
        #better-codex-agent-dialog input::placeholder, #better-codex-agent-dialog textarea::placeholder { color: var(--bc-muted); }
        #better-codex-agent-dialog input:focus, #better-codex-agent-dialog textarea:focus, #better-codex-agent-dialog select:focus { border-color: var(--bc-ring); box-shadow: 0 0 0 2px color-mix(in oklch,var(--bc-ring) 20%,transparent); }
        #better-codex-agent-dialog .better-codex-button { border-color: var(--bc-border); color: var(--bc-muted); background: var(--bc-surface); }
        #better-codex-agent-dialog .better-codex-submit, #better-codex-dialog .better-codex-submit { border-color: var(--bc-primary); color: var(--bc-primary-foreground); background: var(--bc-primary); }
        #better-codex-dialog .better-codex-dialog-breadcrumb, #better-codex-dialog .better-codex-manual-title::placeholder, #better-codex-dialog .better-codex-agent-picker, #better-codex-dialog .better-codex-run-hint, #better-codex-dialog .better-codex-switch-mode, #better-codex-dialog .better-codex-keep-open, #better-codex-dialog .better-codex-project-empty { color: var(--bc-muted); }
        #better-codex-dialog .better-codex-dialog-breadcrumb strong, #better-codex-dialog .better-codex-manual-title, #better-codex-dialog .better-codex-agent-assignee { color: var(--bc-foreground); }
        #better-codex-dialog .better-codex-agent-assignee:focus-within { box-shadow: 0 0 0 2px color-mix(in oklch,var(--bc-ring) 20%,transparent); }
        #better-codex-dialog .better-codex-icon-button, #better-codex-dialog .better-codex-dialog-editor { color: color-mix(in oklch,var(--bc-foreground) 78%,var(--bc-muted)); }
        #better-codex-dialog .better-codex-icon-button:hover, #better-codex-dialog .better-codex-switch-mode:hover, #better-codex-dialog .better-codex-project-option:hover, #better-codex-dialog .better-codex-project-option:focus-visible { color: var(--bc-foreground); background: var(--bc-hover); }
        #better-codex-dialog .better-codex-dialog-editor::placeholder { color: var(--bc-muted); }
        #better-codex-dialog .better-codex-agent-avatar { color: var(--bc-primary-foreground); background: var(--bc-primary); }
        #better-codex-dialog .better-codex-agent-avatar.is-codex { color: inherit; background: transparent; }
        #better-codex-dialog .better-codex-agent-avatar.is-fallback { border-radius: var(--bc-radius-xs); color: var(--bc-color-text-muted); background: var(--bc-color-control); }
        #better-codex-dialog .better-codex-agent-avatar.is-fallback svg { width: 12px; height: 12px; }
        #better-codex-dialog .better-codex-agent-avatar.is-icon svg { width: 12px; height: 12px; }
        #better-codex-dialog .better-codex-agent-avatar.is-user.is-initials { color: #fff; font-size: 9px; font-weight: 700; line-height: 1; }
        #better-codex-dialog .better-codex-property { border-color: var(--bc-border); color: var(--bc-muted); background: var(--bc-surface); }
        #better-codex-dialog .better-codex-project-menu { border-color: var(--bc-border); color: var(--bc-foreground); background: var(--bc-raised); box-shadow: var(--bc-menu-shadow); }
        #better-codex-dialog .better-codex-project-search, #better-codex-dialog .better-codex-dialog-footer { border-color: var(--bc-divider); }
        #better-codex-dialog .better-codex-attachment-chip { border-color: var(--bc-border); color: var(--bc-muted); background: var(--bc-surface); }
        #better-codex-dialog .better-codex-attachment-chip button { color: var(--bc-muted); }
        #better-codex-dialog .better-codex-attachment-chip button:hover { color: var(--bc-foreground); background: var(--bc-hover); }
        #better-codex-dialog[data-mode="manual"] .better-codex-switch-mode { color: var(--bc-foreground); background: var(--bc-selected); box-shadow: inset 0 0 0 1px var(--bc-divider); }
        #better-codex-dialog .better-codex-toggle { background: var(--bc-input); }
        #better-codex-dialog .better-codex-toggle::after { background: var(--bc-primary-foreground); }
        #better-codex-dialog .better-codex-toggle:checked { background: var(--bc-primary); }
        #better-codex-dialog .better-codex-dialog-error, #better-codex-agent-dialog .better-codex-agent-dialog-error { color: var(--bc-danger); }
        ${betterCodexDesignSystemCss()}
      \`;
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
      const button = document.createElement("button");
      button.type = "button";
      button.className = "better-codex-button";
      button.textContent = t(text);
      return button;
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
      navigation.append(moreEntry, auxiliaryMenu);
      return navigation;
    }

    function syncEntryIcon(button, surface) {
      const svg = button.querySelector("svg");
      if (svg) {
        const definition = LUCIDE_ICONS[surface === "agents" ? "bot" : surface === "projects" ? "folder" : surface === "more" ? "more" : "issues"];
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
      if (!agentsEntry) agentsEntry = createEntry("智能体", AGENTS_ENTRY_ID, "管理智能体", "agents");
      syncEntryLabel(agentsEntry, "智能体", "管理智能体");
      syncEntryIcon(agentsEntry, "agents");
      if (agentsEntry.parentElement !== parent || agentsEntry.previousElementSibling !== entry) entry.after(agentsEntry);
      if (!projectsEntry) projectsEntry = createEntry("项目管理", PROJECTS_ENTRY_ID, "管理项目", "projects");
      syncEntryLabel(projectsEntry, "项目管理", "管理项目");
      syncEntryIcon(projectsEntry, "projects");
      projectsEntry.hidden = !hasFeature("project-management");
      if (HOST_KIND === "web") {
        if (!auxiliaryNavigation) auxiliaryNavigation = createAuxiliaryNavigation();
        syncEntryLabel(moreEntry, "更多", "更多功能");
        syncEntryIcon(moreEntry, "more");
        auxiliaryNavigation.hidden = !hasFeature("project-management");
        if (auxiliaryNavigation.parentElement !== parent || auxiliaryNavigation.previousElementSibling !== agentsEntry) agentsEntry.after(auxiliaryNavigation);
        if (projectsEntry.parentElement !== auxiliaryMenu) auxiliaryMenu.append(projectsEntry);
      } else if (projectsEntry.parentElement !== parent || projectsEntry.previousElementSibling !== agentsEntry) agentsEntry.after(projectsEntry);
      const currentEntry = active && state.surface === "issues" ? entry : active && state.surface === "agents" ? agentsEntry : active && state.surface === "projects" ? projectsEntry : null;
      for (const item of [entry, agentsEntry, projectsEntry]) {
        if (item === currentEntry && item.getAttribute("aria-current") !== "page") item.setAttribute("aria-current", "page");
        if (item !== currentEntry && item.hasAttribute("aria-current")) item.removeAttribute("aria-current");
      }
      if (moreEntry) {
        if (active && state.surface === "projects" && moreEntry.getAttribute("aria-current") !== "page") moreEntry.setAttribute("aria-current", "page");
        if ((!active || state.surface !== "projects") && moreEntry.hasAttribute("aria-current")) moreEntry.removeAttribute("aria-current");
      }
      return entry.isConnected && agentsEntry.isConnected && projectsEntry.isConnected && (HOST_KIND !== "web" || auxiliaryNavigation?.isConnected);
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
        threadId: row ? nativeThreadId(row) : location.pathname.match(/\\/local\\/([^/?#]+)/)?.[1] || "",
        workspacePath: url.searchParams.get("workspace") || url.searchParams.get("cwd") || "",
        projects
      };
    }

    function api(path, options = {}) {
      const method = String(options.method || "GET").toUpperCase();
      const requestPath = path + (path.includes("?") ? "&" : "?") + "locale=" + encodeURIComponent(state.locale);
      const commandId = method === "GET" ? "" : globalThis.crypto?.randomUUID?.() || VERSION + "-command-" + Date.now() + "-" + Math.random().toString(36).slice(2);
      const removalMatch = path.match(/^\\/api\\/issues\\/([^\\/?]+)(?:\\/(archive))?(?:\\?.*)?$/);
      const removalId = removalMatch && (method === "DELETE" || method === "POST" && removalMatch[2] === "archive") ? decodeURIComponent(removalMatch[1]) : "";
      const removalIssue = removalId ? state.issues.find(issue => issue.id === removalId) : null;
      if (removalIssue && !READ_ONLY) {
        pendingIssueRemovals.set(removalId, { commandId, issue: removalIssue });
        state.issues = state.issues.filter(issue => issue.id !== removalId);
        render();
      }
      const startedAt = Date.now();
      const bodyBytes = typeof options.body === "string" ? new TextEncoder().encode(options.body).byteLength : 0;
      appendDiagnostic("api_request", { method, path: requestPath, command_id: commandId, request_body_bytes: bodyBytes });
      if (READ_ONLY && method !== "GET") {
        const error = new Error("remote_read_only");
        reportGlobalError(error, { source: "api", method, path: requestPath, command_id: commandId, request_body_bytes: bodyBytes });
        return Promise.reject(error);
      }
      const attempt = (retriesLeft) => {
        if (typeof window.betterCodexHost?.request === "function") {
          return Promise.resolve(window.betterCodexHost.request({ path: requestPath, method: options.method || "GET", body: options.body, timeoutMs: options.timeoutMs, commandId })).catch(error => {
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
            window.betterCodexRequest(JSON.stringify({ id, token: BRIDGE_TOKEN, path: requestPath, method: options.method || "GET", body: options.body, timeoutMs: options.timeoutMs, commandId }));
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
        appendDiagnostic("api_response", { method, path: requestPath, command_id: commandId, elapsed_ms: Date.now() - startedAt });
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
        appendDiagnostic("api_failure", { method, path: requestPath, command_id: commandId, request_body_bytes: bodyBytes, elapsed_ms: Date.now() - startedAt, error: error instanceof Error ? error.message : String(error || "request_failed"), diagnostics: error?.betterCodexDiagnostics || {} });
        reportGlobalError(error, { source: "api", method, path: requestPath, command_id: commandId, request_body_bytes: bodyBytes, elapsed_ms: Date.now() - startedAt });
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

    async function requestList(path, kind) {
      const key = kind + ":" + path;
      if (listRequests.has(key)) return listRequests.get(key);
      const request = (async () => {
        try {
          return listResponse(await api(path), path, kind);
        } catch (error) {
          if (!(error instanceof Error) || error.message !== "invalid_" + kind + "_response") throw error;
          return listResponse(await api(path), path, kind);
        }
      })();
      listRequests.set(key, request);
      try {
        return await request;
      } finally {
        if (listRequests.get(key) === request) listRequests.delete(key);
      }
    }

    function requestProjects() {
      return requestList("/api/projects", "projects");
    }

    function startLiveUpdates() {
      if (liveUnsubscribe || typeof window.betterCodexHost?.subscribe !== "function") return false;
      liveUnsubscribe = window.betterCodexHost.subscribe(event => {
        if (event?.event === "ready" && !bootstrapReady) return;
        if (document.hidden) {
          liveDirty = true;
          return;
        }
        if (active && !panel?.dataset.recovery) void perform(() => REMOTE ? Promise.all([loadSurface({ background: true }), loadAutoDispatch()]) : loadSurface({ background: true }));
      });
      return typeof liveUnsubscribe === "function";
    }

    function onVisibilityChange() {
      if (document.hidden || !liveDirty || !active || panel?.dataset.recovery) return;
      liveDirty = false;
      void perform(() => REMOTE ? Promise.all([loadSurface({ background: true }), loadAutoDispatch()]) : loadSurface({ background: true }));
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

    async function resumePersistedThread(threadId) {
      const expected = normalizeSessionId(threadId);
      if (!expected) throw new Error("thread_id_invalid");
      const resumed = await sendAppServerRequest("thread/resume", { threadId: expected, excludeTurns: true });
      const resumedId = normalizeSessionId(resumed?.thread?.id);
      if (resumedId !== expected) throw new Error("desktop_thread_resume_invalid");
      relayThreads.add(expected);
      return resumed.thread;
    }

    function isThreadNotFoundError(error) {
      const value = String(error instanceof Error ? error.message : error || "").toLowerCase();
      return value.includes("thread not found") || value.includes("thread_not_found");
    }

    function turnStartParams(threadId, payload) {
      const params = {
        threadId,
        input: [{ type: "text", text: String(payload.message || "") }],
        approvalPolicy: String(payload.approval_policy || "on-request"),
        approvalsReviewer: String(payload.approvals_reviewer || "auto_review")
      };
      if (payload.workspace_path) params.cwd = String(payload.workspace_path);
      if (payload.model) params.model = String(payload.model);
      if (payload.effort) params.effort = String(payload.effort);
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

    async function executeSessionCommand(command) {
      const payload = command?.payload && typeof command.payload === "object" ? command.payload : {};
      let threadId = normalizeSessionId(command?.thread_id);
      let turnId = normalizeSessionId(command?.turn_id);
      const heartbeat = setInterval(() => void heartbeatSessionRelay(), 2000);
      relayCommandInFlight = true;
      relayBufferedEvents = [];
      try {
        if (command.kind === "start") {
          const params = {
            cwd: String(payload.workspace_path || ""),
            approvalPolicy: String(payload.approval_policy || "on-request"),
            approvalsReviewer: String(payload.approvals_reviewer || "auto_review"),
            sandbox: String(payload.sandbox_mode || "workspace-write")
          };
          if (payload.model) params.model = String(payload.model);
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
          const turn = await sendAppServerRequest("turn/start", turnStartParams(threadId, payload));
          turnId = normalizeSessionId(turn?.turn?.id);
          if (!turnId) throw new Error("desktop_turn_start_invalid");
          await api("/api/session-relay/commands/" + encodeURIComponent(command.id) + "/checkpoint", {
            method: "POST",
            body: JSON.stringify({ relay_id: relayId, result: { thread_id: threadId, turn_id: turnId } })
          });
        } else if (command.kind === "turn") {
          if (!threadId) throw new Error("session_thread_invalid");
          relayCurrentThreadId = threadId;
          await resumePersistedThread(threadId);
          let turn;
          try {
            turn = await sendAppServerRequest("turn/start", turnStartParams(threadId, payload));
          } catch (error) {
            if (!isThreadNotFoundError(error)) throw error;
            await resumePersistedThread(threadId);
            turn = await sendAppServerRequest("turn/start", turnStartParams(threadId, payload));
          }
          turnId = normalizeSessionId(turn?.turn?.id);
          if (!turnId) throw new Error("desktop_turn_start_invalid");
          await api("/api/session-relay/commands/" + encodeURIComponent(command.id) + "/checkpoint", {
            method: "POST",
            body: JSON.stringify({ relay_id: relayId, result: { thread_id: threadId, turn_id: turnId } })
          });
        } else if (command.kind === "steer") {
          if (!threadId || !turnId) throw new Error("session_turn_invalid");
          relayCurrentThreadId = threadId;
          const steered = await sendAppServerRequest("turn/steer", {
            threadId,
            expectedTurnId: turnId,
            input: [{ type: "text", text: String(payload.message || "") }]
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
          body: JSON.stringify({ relay_id: relayId, result: { thread_id: threadId, turn_id: turnId } })
        });
        relayCommandInFlight = false;
        flushRelayEvents(turnId, command.kind === "steer" || command.kind === "interrupt");
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

    function errorCause(error) {
      const causes = [];
      let current = error?.cause;
      for (let depth = 0; current && depth < 4; depth += 1) {
        causes.push(current instanceof Error ? { name: current.name, message: current.message, stack: String(current.stack || "").slice(0, 6000) } : diagnosticValue(current));
        current = current?.cause;
      }
      return causes;
    }

    function formatErrorReport(records) {
      return JSON.stringify({
        report: "Better Codex error report",
        exported_at: new Date().toISOString(),
        errors: records,
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
      dialog.innerHTML = '<div class="better-codex-error-report-shell"><header class="better-codex-error-report-head"><span class="better-codex-error-report-icon" aria-hidden="true">' + icon("permissionDanger") + '</span><div><h2 id="better-codex-error-report-title">' + te("错误报告") + '</h2><p id="better-codex-error-report-description">' + te("完整错误、请求信息和相关日志已保留，可直接复制给开发者。") + '</p></div><button class="better-codex-error-report-close" type="button" data-error-report-close aria-label="' + te("关闭") + '">' + icon("close") + '</button></header><section class="better-codex-error-report-summary"><strong data-error-report-message>' + te("发生了一个错误") + '</strong><span data-error-report-time></span></section><pre class="better-codex-error-report-detail" data-error-report-detail tabindex="0"></pre><footer class="better-codex-error-report-footer"><div class="better-codex-error-report-navigation"><button type="button" data-error-report-previous>' + te("上一条") + '</button><output data-error-report-counter>1 / 1</output><button type="button" data-error-report-next>' + te("下一条") + '</button></div><div class="better-codex-error-report-actions"><button type="button" data-error-report-dismiss>' + te("移除当前错误") + '</button><button type="button" data-error-report-copy-all>' + te("复制全部错误") + '</button><button class="is-primary" type="button" data-error-report-copy>' + te("复制当前错误") + '</button></div></footer></div>';
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
        related_logs: diagnosticLog.slice(-30),
        occurrences: 1,
        occurrence_times: [new Date().toISOString()],
      };
      const fingerprint = [record.message, record.context.source || "", record.context.path || "", record.diagnostics.response_detail || ""].join("|");
      const repeatedIndex = errorQueue.findIndex(item => item.fingerprint === fingerprint);
      if (repeatedIndex >= 0) {
        const repeated = errorQueue[repeatedIndex];
        repeated.occurrences += 1;
        repeated.occurrence_times.push(record.time);
        if (repeated.occurrence_times.length > 20) repeated.occurrence_times.shift();
        repeated.related_logs = diagnosticLog.slice(-30);
        errorQueueIndex = repeatedIndex;
        const dialog = ensureErrorDialog();
        renderErrorDialog();
        if (!dialog.open) dialog.showModal();
        return repeated.id;
      }
      record.fingerprint = fingerprint;
      appendDiagnostic("error_reported", { id: record.id, message: record.message, source: record.context.source });
      record.related_logs = diagnosticLog.slice(-30);
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
      if (["runtime_response_invalid", "invalid_projects_response", "invalid_issues_response", "invalid_agents_response"].includes(value)) return t("列表数据暂时无法读取，请稍后重试。");
      if (value === "issue_archived") return t("该会话对应的 Issue 已归档，请先取消归档。");
      if (["project_overview_timeout", "project_overview_unavailable", "project_document_invalid_output", "remote_command_timeout", "workspace_missing"].includes(value)) return projectDocumentErrorLabel(value);
      return t(value);
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
      reportGlobalError(error, { source: "ui_action" });
      state.error = errorLabel(error);
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

    async function waitForUpdateCompletion(notice) {
      const deadline = Date.now() + 10 * 60 * 1000;
      const title = notice.querySelector(".better-codex-update-title");
      const description = notice.querySelector(".better-codex-update-description");
      while (!destroyed && updateNotice === notice && Date.now() < deadline) {
        await new Promise(resolve => setTimeout(resolve, 500));
        let update;
        try {
          update = await api("/api/update");
        } catch (reason) {
          if (destroyed || updateNotice !== notice) return;
          const message = String(reason instanceof Error ? reason.message : reason || "");
          if (["runtime_bridge_timeout", "runtime_bridge_unavailable", "runtime_unavailable", "injection_destroyed"].includes(message)) continue;
          throw reason;
        }
        if (updateNotice !== notice) return;
        if (update?.status === "error") throw new Error(String(update.error || "update_failed"));
        if (update?.status === "current") {
          notice.dataset.status = "current";
          title.textContent = t("Better Codex 已是最新版本");
          description.textContent = REMOTE ? t("远程服务升级完成。") : t("更新已完成。");
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
        if (update?.status === "restarting") {
          notice.dataset.status = "restarting";
          title.textContent = t("正在重启 Better Codex");
          description.textContent = REMOTE ? t("远程服务正在重启，页面稍后会自动恢复。") : t("正在重启 Better Codex Runtime，稍后会自动恢复。");
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
        ? "v" + version + " 已可用，升级时远程服务会暂时重启。"
        : "v" + version + " 已可用，升级时 Better Codex Runtime 会暂时重启，Codex 无需重启。";
      updateNotice.innerHTML = '<button class="better-codex-update-menu-toggle" type="button" aria-label="' + escapeHtml(t("更多操作")) + '" aria-expanded="false" aria-haspopup="menu" data-update-menu-toggle>' + icon("more") + '</button><div class="better-codex-update-menu" data-update-menu hidden><button type="button" role="menuitem" data-update-ignore>' + escapeHtml(t("忽略当前版本")) + '</button></div><button class="better-codex-update-close" type="button" aria-label="' + escapeHtml(t("稍后提醒")) + '">' + icon("close") + '</button><div class="better-codex-update-layout"><span class="better-codex-update-icon">' + icon("refresh") + '</span><div class="better-codex-update-copy"><p class="better-codex-update-title">' + escapeHtml(t("Better Codex 有新版本")) + '</p><p class="better-codex-update-description">' + escapeHtml(t(updateDescription)) + '</p><p class="better-codex-update-error" hidden></p></div><div class="better-codex-update-actions"><button class="better-codex-update-button" type="button" data-update-later>' + escapeHtml(t("稍后")) + '</button><button class="better-codex-update-button is-primary" type="button" data-update-install>' + escapeHtml(t("立即更新")) + '</button></div></div>';
      document.body.appendChild(updateNotice);
      updateNoticeResizeObserver = new ResizeObserver(syncCompletionNoticePosition);
      updateNoticeResizeObserver.observe(updateNotice);
      syncCompletionNoticePosition();
      const notice = updateNotice;
      const menuToggle = notice.querySelector("[data-update-menu-toggle]");
      const menu = notice.querySelector("[data-update-menu]");
      const closeMenu = () => {
        menu.hidden = true;
        menuToggle.setAttribute("aria-expanded", "false");
      };
      menuToggle.addEventListener("click", event => {
        event.stopPropagation();
        menu.hidden = !menu.hidden;
        menuToggle.setAttribute("aria-expanded", String(!menu.hidden));
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
        description.textContent = REMOTE ? t("正在备份并升级远程服务，请不要关闭页面。") : t("正在下载并校验新版本，请不要关闭 Codex。");
        error.hidden = true;
        try {
          const result = await api("/api/update/install", { method: "POST" });
          if (updateNotice !== notice) return;
          if (result?.accepted !== true) throw new Error("update_not_accepted");
          await waitForUpdateCompletion(notice);
        } catch (reason) {
          if (updateNotice !== notice) return;
          reportGlobalError(reason, { source: "update_install" });
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
        }
      });
    }

    async function checkUpdateNotice() {
      try {
        renderUpdateNotice(await api("/api/update"));
      } catch {
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

    async function perform(action) {
      clearError();
      try {
        return await action();
      } catch (error) {
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
        const dialog = document.createElement("dialog");
        dialog.id = "better-codex-confirm";
        dialog.setAttribute(OWNED, "true");
        dialog.innerHTML = '<div class="better-codex-confirm-body"><h2 class="better-codex-confirm-title">' + escapeHtml(t(title)) + '</h2><p class="better-codex-confirm-message">' + escapeHtml(t(message)) + '</p></div><div class="better-codex-confirm-actions"><button type="button" data-confirm-cancel>' + escapeHtml(t("取消")) + '</button><button class="better-codex-confirm-primary" type="button" data-confirm-accept>' + escapeHtml(t(confirmLabel)) + '</button></div>';
        document.body.appendChild(dialog);
        let settled = false;
        const finish = value => {
          if (settled) return;
          settled = true;
          dialog.close();
          resolve(value);
        };
        dialog.querySelector("[data-confirm-cancel]").addEventListener("click", () => finish(false));
        dialog.querySelector("[data-confirm-accept]").addEventListener("click", () => finish(true));
        dialog.addEventListener("cancel", event => { event.preventDefault(); finish(false); });
        bindModalDismiss(dialog, () => finish(false));
        dialog.addEventListener("close", () => {
          if (!settled) resolve(false);
          dialog.remove();
        }, { once: true });
        dialog.showModal();
        dialog.querySelector("[data-confirm-cancel]").focus();
      });
    }

    function openArchiveDialog() {
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
      let projectId = "";
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
          archivedIssues = await requestList("/api/issues?archived=1", "issues");
          const projects = projectsByRecentActivity(state.projects.filter(project => archivedIssues.some(issue => issue.project_id === project.id)), archivedIssues);
          projectOptions = projects;
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
      return '<svg viewBox="0 0 24 24" width="36" height="36" role="img" aria-label="Codex"><path d="M19.503 0H4.496A4.496 4.496 0 000 4.496v15.007A4.496 4.496 0 004.496 24h15.007A4.496 4.496 0 0024 19.503V4.496A4.496 4.496 0 0019.503 0z" fill="#fff"></path><path d="M9.064 3.344a4.578 4.578 0 012.285-.312c1 .115 1.891.54 2.673 1.275.01.01.024.017.037.021a.09.09 0 00.043 0 4.55 4.55 0 013.046.275l.047.022.116.057a4.581 4.581 0 012.188 2.399c.209.51.313 1.041.315 1.595a4.24 4.24 0 01-.134 1.223.123.123 0 00.03.115c.594.607.988 1.33 1.183 2.17.289 1.425-.007 2.71-.887 3.854l-.136.166a4.548 4.548 0 01-2.201 1.388.123.123 0 00-.081.076c-.191.551-.383 1.023-.74 1.494-.9 1.187-2.222 1.846-3.711 1.838-1.187-.006-2.239-.44-3.157-1.302a.107.107 0 00-.105-.024c-.388.125-.78.143-1.204.138a4.441 4.441 0 01-1.945-.466 4.544 4.544 0 01-1.61-1.335c-.152-.202-.303-.392-.414-.617a5.81 5.81 0 01-.37-.961 4.582 4.582 0 01-.014-2.298.124.124 0 00.006-.056.085.085 0 00-.027-.048 4.467 4.467 0 01-1.034-1.651 3.896 3.896 0 01-.251-1.192 5.189 5.189 0 01.141-1.6c.337-1.112.982-1.985 1.933-2.618.212-.141.413-.251.601-.33.215-.089.43-.164.646-.227a.098.098 0 00.065-.066 4.51 4.51 0 01.829-1.615 4.535 4.535 0 011.837-1.388zm3.482 10.565a.637.637 0 000 1.272h3.636a.637.637 0 100-1.272h-3.636zM8.462 9.23a.637.637 0 00-1.106.631l1.272 2.224-1.266 2.136a.636.636 0 101.095.649l1.454-2.455a.636.636 0 00.005-.64L8.462 9.23z" fill="url(#' + gradientId + ')"></path><defs><linearGradient gradientUnits="userSpaceOnUse" id="' + gradientId + '" x1="12" x2="12" y1="3" y2="21"><stop stop-color="#B1A7FF"></stop><stop offset=".5" stop-color="#7A9DFF"></stop><stop offset="1" stop-color="#3941FF"></stop></linearGradient></defs></svg>';
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
          : issue.user_assigned ? "user" : "none";
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
      if (key === "assignee") return [{ value: "user", text: state.user.name || t("我") }, { value: "codex", text: "Codex" }, ...state.agents.filter(agent => !agent.is_default).map(agent => ({ value: agent.id, text: agentDisplayName(agent) })), { value: "none", text: t("未分配") }];
      if (key === "project") return projectsByRecentActivity(state.projects).map(project => ({ value: project.id, text: projectLabel(project) }));
      if (key === "label") return [...new Set(state.issues.flatMap(issue => issue.labels || []))].map(value => ({ value, text: value }));
      return [];
    }

    function filterOptionIcon(key, value) {
      if (key === "status") return statusIcon(value);
      if (key === "priority") return priorityIcon(value);
      if (key === "assignee") {
        if (value === "user") {
          return '<span class="better-codex-filter-avatar is-user is-initials" style="background:' + escapeHtml(state.user.color || "#16a34a") + '">' + escapeHtml(state.user.initials || t("你")) + '</span>';
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
      const statusItems = Object.entries(statusLabels).map(([value, text]) => '<button class="better-codex-context-item" type="button"' + contextLockAttrs + ' data-context-action="update" data-context-field="status" data-context-value="' + value + '"><span class="better-codex-context-check">' + (issue.status === value ? icon("check") : "") + '</span>' + statusIcon(value) + '<span>' + escapeHtml(t(text)) + "</span></button>").join("");
      const priorityItems = Object.entries(priorityLabels).map(([value, text]) => '<button class="better-codex-context-item" type="button"' + contextLockAttrs + ' data-context-action="update" data-context-field="priority" data-context-value="' + value + '"><span class="better-codex-context-check">' + (issue.priority === value ? icon("check") : "") + '</span>' + priorityIcon(value) + '<span>' + escapeHtml(t(value === "none" ? "无优先级" : text + "优先级")) + "</span></button>").join("");
      const userSelected = Boolean(issue.user_assigned) && !issue.agent_enabled;
      const noneSelected = !issue.user_assigned && !issue.agent_enabled;
      const userName = state.user.name || t("我");
      const userAvatar = '<span class="better-codex-context-avatar is-user is-initials" style="background:' + escapeHtml(state.user.color || "#16a34a") + '">' + escapeHtml(state.user.initials || t("你")) + '</span>';
      const contextAssigneeTags = agent => agentConfigTags(agent).map(tag => '<span class="better-codex-context-tag" data-tone="' + escapeHtml(tag.tone) + '">' + escapeHtml(tag.value) + '</span>').join("");
      const contextAssigneeLabel = (name, tags = "") => '<span class="better-codex-context-assignee-label"><span class="better-codex-context-assignee-name">' + escapeHtml(name) + '</span>' + tags + '</span>';
      const unassignedAvatar = '<span class="better-codex-context-avatar is-fallback">' + icon("user") + '</span>';
      const assigneeItems = [
        '<button class="better-codex-context-item" type="button"' + contextLockAttrs + ' data-context-action="assign" data-assignee-kind="none"><span class="better-codex-context-check">' + (noneSelected ? icon("check") : "") + '</span>' + unassignedAvatar + contextAssigneeLabel(t("未指派")) + '</button>',
        '<button class="better-codex-context-item" type="button"' + contextLockAttrs + ' data-context-action="assign" data-assignee-kind="me"><span class="better-codex-context-check">' + (userSelected ? icon("check") : "") + '</span>' + userAvatar + contextAssigneeLabel(userName) + '</button>',
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
      menu.innerHTML = '<div class="better-codex-context-item-wrap' + contextLockClass + '"><button class="better-codex-context-item" type="button"' + contextLockAttrs + '>' + statusIcon(issue.status) + '<span>' + escapeHtml(t("状态")) + '</span>' + icon("chevron") + '</button><div class="better-codex-context-submenu">' + statusItems + '</div></div><div class="better-codex-context-item-wrap' + contextLockClass + '"><button class="better-codex-context-item" type="button"' + contextLockAttrs + '>' + priorityIcon(issue.priority) + '<span>' + escapeHtml(t("优先级")) + '</span>' + icon("chevron") + '</button><div class="better-codex-context-submenu">' + priorityItems + '</div></div><div class="better-codex-context-item-wrap' + contextLockClass + '"><button class="better-codex-context-item" type="button"' + contextLockAttrs + '>' + icon("user") + '<span>' + escapeHtml(t("指定负责人")) + '</span>' + icon("chevron") + '</button><div class="better-codex-context-submenu is-assignee">' + assigneeItems + '</div></div>' + stopItem + (workspacePath ? '<div class="better-codex-context-divider"></div><button class="better-codex-context-item" type="button" data-context-action="copy-workspace">' + icon("folder") + '<span>' + escapeHtml(t("复制本地 workdir 路径")) + '</span></button>' : "") + '<div class="better-codex-context-divider"></div><button class="better-codex-context-item" type="button"' + archiveLockAttrs + ' data-context-action="archive">' + icon("archive") + '<span>' + escapeHtml(t("归档")) + '</span></button>' + (state.mockup ? "" : '<button class="better-codex-context-item is-danger" type="button"' + deleteLockAttrs + ' data-context-action="delete">' + icon("trash") + '<span>' + escapeHtml(t("删除任务")) + '</span></button>');
      document.body.appendChild(menu);
      const rect = menu.getBoundingClientRect();
      menu.style.left = Math.max(8, Math.min(clientX, window.innerWidth - rect.width - 8)) + "px";
      menu.style.top = Math.max(8, Math.min(clientY, window.innerHeight - rect.height - 8)) + "px";

      async function assignIssue(kind, agentId = "") {
        const current = state.issues.find(candidate => candidate.id === menu.dataset.issueId);
        if (!current) return closeIssueMenu();
        const alreadyMe = kind === "me" && current.user_assigned && !current.agent_enabled;
        const alreadyNone = kind === "none" && !current.user_assigned && !current.agent_enabled;
        const alreadyAgent = kind === "agent" && current.agent_enabled && (agentId ? current.agent_id === agentId : !current.agent_id);
        if (alreadyMe || alreadyNone || alreadyAgent) return closeIssueMenu();
        closeIssueMenu();
        const body = kind === "me"
          ? { version: current.version, user_assigned: true, agent_enabled: false, agent_id: "" }
          : kind === "agent"
            ? { version: current.version, user_assigned: false, agent_enabled: true, agent_id: agentId }
            : { version: current.version, user_assigned: false, agent_enabled: false, agent_id: "" };
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
        if (currentPermissions.contextLocked && (item.dataset.contextAction === "update" || item.dataset.contextAction === "assign")) return closeIssueMenu();
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
          return void assignIssue(kind, agentId);
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
      const projectHeading = document.createElement("div");
      projectHeading.className = "better-codex-project-heading";
      projectHeading.innerHTML = '<strong>' + te("项目管理") + '</strong><span data-project-heading-meta></span>';
      projectHeading.addEventListener("click", onProjectsClick);
      const projectActions = document.createElement("div");
      projectActions.className = "better-codex-project-actions";
      const addProject = actionButton("创建项目");
      addProject.classList.add("is-bordered");
      addProject.insertAdjacentHTML("afterbegin", icon("plus"));
      addProject.addEventListener("click", () => state.projectDetailId ? openEditor() : openCreateProjectDialog());
      projectActions.append(addProject);
      toolbar.append(tabs, agentHeading, projectHeading, error, actions, agentActions, projectActions);
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
        if (!event.target.matches("[data-agent-search]")) return;
        state.agentSearch = event.target.value;
        renderAgents();
        const search = agents.querySelector("[data-agent-search]");
        if (search) { search.focus(); search.setSelectionRange(search.value.length, search.value.length); }
      });
      agents.addEventListener("submit", onAgentSubmit);
      const projects = document.createElement("main");
      projects.id = "better-codex-projects";
      projects.className = "better-codex-projects";
      projects.addEventListener("click", onProjectsClick);
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
      section.append(toolbar, board, ...(boardScrollControl ? [boardScrollControl] : []), agents, projects, recovery);
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
          // Only the picker itself is "inside". The avatar field label sits under the
          // popover and must still count as outside.
          if (picker.contains(event.target)) return;
          // Outside mousedown closes the picker only. The matching click must not
          // also dismiss the agent inspector or the whole Better Codex panel.
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

    function agentConfigTags(agent) {
      const model = modelTag(agent?.model);
      const reasoning = reasoningTag(agent?.reasoning_effort);
      return [model ? { value: model, tone: "model" } : null, reasoning ? { value: reasoning, tone: "reasoning" } : null].filter(Boolean);
    }

    function agentOptionLabel(agent, name) {
      return state.locale === "en" ? String(agent?.name_en || name || "") : name;
    }

    function agentDisplayName(agent) {
      return agentOptionLabel(agent, agent?.name || "");
    }

    function applyAppearance(appearance) {
      const root = document.documentElement.style;
      const applyTheme = (mode, profile) => {
        const canvas = String(profile?.surface || "");
        const ink = String(profile?.ink || "");
        const accent = String(profile?.accent || "");
        if (!CSS.supports("color", canvas) || !CSS.supports("color", ink) || !CSS.supports("color", accent)) return;
        const contrast = Math.max(0, Math.min(100, Number(profile?.contrast) || 50));
        const layer = amount => "color-mix(in srgb, " + ink + " " + Math.round(amount * contrast / 50 * 100) / 100 + "%, " + canvas + ")";
        root.setProperty("--bc-host-" + mode + "-canvas", canvas);
        root.setProperty("--bc-host-" + mode + "-ink", ink);
        root.setProperty("--bc-host-" + mode + "-accent", accent);
        root.setProperty("--bc-host-" + mode + "-surface", layer(2.5));
        root.setProperty("--bc-host-" + mode + "-control", layer(5));
        root.setProperty("--bc-host-" + mode + "-raised", layer(7.5));
        root.setProperty("--bc-host-" + mode + "-hover", layer(9));
        root.setProperty("--bc-host-" + mode + "-pressed", layer(12));
        root.setProperty("--bc-host-" + mode + "-hairline", layer(11));
        const uiFont = String(profile?.uiFont || "");
        if (uiFont && CSS.supports("font-family", uiFont)) root.setProperty("--bc-host-" + mode + "-font-ui", uiFont);
      };
      applyTheme("light", appearance?.light);
      applyTheme("dark", appearance?.dark);
      if (HOST_KIND === "web") {
        const storedTheme = localStorage.getItem("better-codex-web-theme");
        const configuredTheme = appearance?.theme;
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
      const rows = options.map(option => {
        const hasDescription = Boolean(option.description);
        const copy = hasDescription
          ? '<span class="better-codex-agent-menu-item-copy">' + (option.icon ? '<span class="better-codex-agent-menu-item-icon">' + icon(option.icon) + '</span>' : "") + '<span><strong>' + escapeHtml(option.label) + '</strong><small>' + escapeHtml(option.description) + '</small></span></span>'
          : '<span class="better-codex-agent-menu-item-copy">' + (option.icon ? '<span class="better-codex-agent-menu-item-icon">' + icon(option.icon) + '</span>' : "") + '<span>' + escapeHtml(option.label) + '</span></span>';
        return '<button class="better-codex-agent-menu-item' + (option.value === current.value ? " is-selected" : "") + (option.tone === "warning" ? " is-warning" : "") + '" type="button" role="option" aria-selected="' + (option.value === current.value) + '" data-agent-option="' + escapeHtml(name) + '" data-agent-option-value="' + escapeHtml(option.value) + '">' + copy + '<span class="better-codex-agent-menu-item-check">' + (option.value === current.value ? icon("check") : "") + '</span></button>';
      }).join("");
      return '<div class="better-codex-agent-setting" data-agent-picker="' + escapeHtml(name) + '"><span>' + escapeHtml(label) + '</span><input type="hidden" name="' + escapeHtml(name) + '" value="' + escapeHtml(current.value) + '"><button class="better-codex-agent-picker-trigger" type="button" role="combobox" aria-haspopup="listbox" aria-expanded="false" data-agent-picker-toggle="' + escapeHtml(name) + '"><span data-agent-picker-label>' + escapeHtml(current.label) + '</span>' + icon("chevron") + '</button><div class="better-codex-agent-menu" role="listbox"><div class="better-codex-agent-menu-title">' + escapeHtml(label) + '</div>' + rows + '</div></div>';
    }

    function agentNumberInput(name, label, value, min, max) {
      const numericValue = Number(value);
      const current = Number.isInteger(numericValue) ? Math.min(max, Math.max(min, numericValue)) : 5;
      return '<label class="better-codex-agent-setting"><span>' + escapeHtml(label) + '</span><input class="better-codex-agent-number-input" type="number" name="' + escapeHtml(name) + '" min="' + min + '" max="' + max + '" step="1" value="' + current + '" aria-label="' + escapeHtml(label) + '"></label>';
    }

    const suggestedAgents = ${JSON.stringify(suggestedAgents)};

    let agentInspectorClosing = false;
    let agentCreateFullscreen = false;
    let agentWindowBoundsObserver = null;

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
      const inspector = panel?.querySelector(".better-codex-agent-inspector");
      if (state.agentPane === "create" && inspector?.matches("dialog")) {
        inspector.close();
        return;
      }
      if (inspector?.classList.contains("is-closing")) return;
      const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
      if (!inspector || reduceMotion) {
        agentInspectorClosing = false;
        state.agentPane = "preview";
        state.selectedAgentId = "";
        state.agentDraft = null;
        renderAgents();
        return;
      }
      agentInspectorClosing = true;
      inspector.classList.add("is-closing");
      inspector.setAttribute("aria-hidden", "true");
      let finished = false;
      const finish = () => {
        if (finished) return;
        finished = true;
        agentInspectorClosing = false;
        inspector.removeEventListener("transitionend", onEnd);
        state.agentPane = "preview";
        state.selectedAgentId = "";
        state.agentDraft = null;
        renderAgents();
      };
      const onEnd = event => {
        if (event.target !== inspector) return;
        if (event.propertyName !== "width" && event.propertyName !== "min-width") return;
        finish();
      };
      inspector.addEventListener("transitionend", onEnd);
      setTimeout(finish, 400);
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
      const tag = creating ? "dialog" : "aside";
      const windowAttr = creating ? ' data-agent-window="create" data-fullscreen="' + agentCreateFullscreen + '"' : "";
      const resizeHandle = creating ? "" : '<div class="better-codex-agent-inspector-resize" data-agent-inspector-resize role="separator" aria-orientation="vertical" aria-label="' + te("调整侧边栏宽度") + '" tabindex="0"></div>';
      const leading = creating ? '<div class="better-codex-agent-inspector-head-leading"><button class="better-codex-agent-window-back" type="button" data-agent-window-back aria-label="' + te("返回") + '">' + icon("back") + '</button><nav class="better-codex-agent-window-title" aria-label="' + te("智能体") + '"><span>' + te("智能体") + '</span><span aria-hidden="true">&gt;</span><strong>' + te("创建智能体") + '</strong></nav></div>' : '<span>' + heading + '</span>';
      const windowAction = creating ? '<button class="better-codex-agent-card-action" type="button" data-agent-window-expand aria-label="' + te(agentCreateFullscreen ? "退出全屏" : "全屏") + '">' + icon(agentCreateFullscreen ? "shrink" : "expand") + '</button>' : "";
      return '<' + tag + ' class="better-codex-agent-inspector"' + animateAttr + windowAttr + '>' + resizeHandle + '<form data-agent-form="' + (creating ? "create" : isDefault ? "default" : "update") + '" data-agent-key="' + escapeHtml(creating ? "" : agentKey(draft)) + '"><header class="better-codex-agent-inspector-head">' + leading + '<div class="better-codex-agent-inspector-head-actions">' + windowAction + '<button class="better-codex-agent-card-action" type="button" data-agent-close-pane aria-label="' + te(creating ? "关闭" : "关闭详情") + '">' + icon("close") + '</button></div></header><div class="better-codex-agent-inspector-scroll">' + profileHead + identity + '<h3>' + te("详情") + '</h3><div class="better-codex-agent-inspector-group">' + agentPicker("model", t("模型"), model, modelOptions) + agentPicker("reasoning_effort", t("推理"), effort, effortOptions) + agentPicker("sandbox_mode", t("权限"), sandboxMode, sandboxOptions) + agentNumberInput("max_concurrency", t("最大并发"), draft.max_concurrency, 1, 20) + '</div>' + instructionField + '<div class="better-codex-agent-inspector-error" hidden></div></div>' + (readOnly ? "" : '<footer class="better-codex-agent-inspector-footer">' + deleteButton + '<button class="better-codex-submit" type="submit">' + te(creating ? "创建" : "保存") + '</button></footer>') + '</form></' + tag + '>';
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
        const meta = modelLabel(agent.model) + " · " + effortLabel(agent.reasoning_effort) + (state.locale === "zh-CN" ? "推理" : " reasoning");
        const description = state.mockup && agent.is_default ? "" : agent.description || (agent.is_default ? "" : t("尚未添加介绍"));
        return '<button class="better-codex-agent-row' + (key === state.selectedAgentId ? " is-selected" : "") + '" type="button" data-agent-key="' + escapeHtml(key) + '">' + avatar + '<span class="better-codex-agent-row-copy"><strong>' + escapeHtml(agentDisplayName(agent)) + (agent.is_default ? '<small>' + te("默认") + '</small>' : "") + '</strong>' + (description ? '<span>' + escapeHtml(description) + '</span>' : '') + '<em>' + escapeHtml(meta) + '</em></span><span class="better-codex-agent-row-chevron">' + icon("chevron") + '</span></button>';
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
      inspector.addEventListener("cancel", event => {
        event.preventDefault();
        closeAgentInspector();
      });
      inspector.addEventListener("close", () => {
        agentWindowBoundsObserver?.disconnect();
        agentWindowBoundsObserver = null;
        agentCreateFullscreen = false;
        if (state.agentPane !== "create") return;
        state.agentPane = "preview";
        state.selectedAgentId = "";
        state.agentDraft = null;
        renderAgents();
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
      const inlineError = state.projectDocumentError?.projectId === project.id ? '<output>' + escapeHtml(state.projectDocumentError.message) + '</output>' : "";
      const form = state.mockup ? "" : '<form class="better-codex-project-document-form" data-project-document-form="' + escapeHtml(project.id) + '"><label><span>' + te("修改意见") + '</span><textarea name="feedback" maxlength="4000" placeholder="' + te("告诉智能体哪些内容需要修正、补充或重新组织") + '">' + escapeHtml(feedback) + '</textarea></label><div>' + projectDocumentAgentPicker(agentId) + '<button class="better-codex-submit" type="submit"' + (generating ? " disabled" : "") + '>' + icon(generating ? "refresh" : "sparkles") + '<span>' + te(pending ? "生成中…" : views.some(view => view.html) ? "重新生成全部" : "生成完整文档") + '</span></button></div>' + inlineError + '</form>';
      return '<section class="better-codex-project-panel better-codex-project-document-panel"><header class="better-codex-project-panel-head"><strong>' + te("项目文档") + '</strong><span>' + escapeHtml(done + "/7") + '</span></header>' + progress + '<nav class="better-codex-project-document-tabs" role="tablist" aria-label="' + te("项目文档") + '">' + tabs + '</nav><div class="better-codex-project-document-scroll">' + content + '</div>' + form + '</section>';
    }

    function projectVersionPlan() {
      const source = String(CORE_VERSION || "0.0.0").replace(/^v/i, "");
      const beta = source.match(/^(\d+)\.(\d+)\.(\d+)-beta\.(\d+)$/i);
      const stable = source.match(/^(\d+)\.(\d+)\.(\d+)$/);
      if (beta) return { current: "v" + source, next: "v" + beta[1] + "." + beta[2] + "." + beta[3] + "-beta." + (Number(beta[4]) + 1), stable: "v" + beta[1] + "." + beta[2] + "." + beta[3] };
      if (stable) return { current: "v" + source, next: "v" + stable[1] + "." + stable[2] + "." + (Number(stable[3]) + 1), stable: "v" + stable[1] + "." + stable[2] + "." + (Number(stable[3]) + 1) };
      return { current: "v" + source, next: t("下一版本"), stable: t("稳定版本") };
    }

    function projectDateLabel(value) {
      return new Intl.DateTimeFormat(state.locale === "zh-CN" ? "zh-CN" : "en", { month: "numeric", day: "numeric" }).format(value);
    }

    function projectDashboardMarkup(project, issues, issuesLoading, paths) {
      const activeIssues = issues.filter(issue => !issue.archived_at);
      const counts = activeIssues.reduce((result, issue) => {
        result[issue.status] = (result[issue.status] || 0) + 1;
        return result;
      }, {});
      const running = activeIssues.filter(issue => issue.status === "in_progress" || ["claimed", "running", "scheduling"].includes(issue.active_run_status)).length;
      const review = counts.in_review || 0;
      const blocked = counts.blocked || 0;
      const attention = activeIssues.filter(issue => issue.needs_attention || issue.status === "blocked" || issue.pending_actor === "user" && issue.status === "in_review");
      const healthTone = blocked ? "danger" : attention.length ? "warning" : "success";
      const healthLabel = blocked ? t("有风险") : attention.length ? t("需关注") : t("进展正常");
      const phase = blocked || review ? 3 : counts.in_progress ? 2 : counts.todo ? 1 : counts.backlog ? 0 : activeIssues.length && activeIssues.every(issue => issue.status === "done") ? 4 : 1;
      const phaseLabels = ["探索", "计划", "开发", "验证", "交付"];
      const phases = phaseLabels.map((label, index) => '<span class="better-codex-project-cycle-step' + (index < phase ? " is-complete" : index === phase ? " is-current" : "") + '">' + te(label) + '</span>').join("");
      const weights = { backlog: 0, todo: .18, in_progress: .56, in_review: .82, blocked: .5, done: 1 };
      const progress = activeIssues.length ? Math.round(activeIssues.reduce((sum, issue) => sum + (weights[issue.status] || 0), 0) / activeIssues.length * 100) : 0;
      const versions = projectVersionPlan();
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const day = 86400000;
      const ticks = Array.from({ length: 13 }, (_, index) => new Date(today.getTime() + (index * 7 - 28) * day));
      const firstTarget = new Date(today.getTime() + 14 * day);
      const stableTarget = new Date(today.getTime() + 42 * day);
      const dateTicks = ticks.map((date, index) => '<span>' + escapeHtml(index === 4 ? t("今天") : projectDateLabel(date)) + '</span>').join("");
      const priority = { blocked: 0, in_review: 1, in_progress: 2, todo: 3, backlog: 4, done: 5 };
      const work = [...activeIssues].filter(issue => ["blocked", "in_review", "in_progress", "todo"].includes(issue.status)).sort((left, right) => (priority[left.status] ?? 9) - (priority[right.status] ?? 9) || String(right.updated_at).localeCompare(String(left.updated_at))).slice(0, 5);
      const issueAssignee = issue => {
        if (issue.user_assigned) return state.user.name || t("你");
        if (!issue.agent_enabled) return t("未指派");
        const agent = state.agents.find(item => agentKey(item) === String(issue.agent_id || "default"));
        return agent ? agentDisplayName(agent) : "Codex";
      };
      const workRows = issuesLoading
        ? '<div class="better-codex-project-dashboard-empty">' + te("正在加载当前工作") + '</div>'
        : work.length ? work.map(issue => '<button class="better-codex-project-work-row" type="button" data-project-issue="' + escapeHtml(issue.id) + '">' + statusIcon(issue.status) + '<b>' + escapeHtml(issue.identifier) + '</b><span class="better-codex-project-work-title"><strong>' + escapeHtml(issue.title) + '</strong><span>' + escapeHtml(issueAssignee(issue)) + ' · ' + te("更新于 " + timeAgo(issue.updated_at)) + '</span></span><span class="better-codex-project-work-state">' + te(statusLabels[issue.status] || issue.status) + '</span></button>').join("")
        : '<div class="better-codex-project-dashboard-empty">' + te("当前没有进行中的工作") + '</div>';
      const attentionRows = issuesLoading
        ? '<div class="better-codex-project-dashboard-empty">' + te("正在加载待处理事项") + '</div>'
        : attention.length ? attention.slice(0, 4).map(issue => {
          const label = issue.status === "blocked" ? t("需解阻") : issue.status === "in_review" ? t("需复核") : t("需处理");
          return '<button class="better-codex-project-attention-row" type="button" data-project-issue="' + escapeHtml(issue.id) + '"><span class="better-codex-project-attention-icon">' + icon(issue.status === "blocked" ? "shield" : "review") + '</span><span class="better-codex-project-attention-copy"><strong>' + escapeHtml(issue.title) + '</strong><span>' + escapeHtml(issue.identifier) + ' · ' + escapeHtml(issueAssignee(issue)) + '</span></span><span class="better-codex-project-attention-state">' + escapeHtml(label) + '</span></button>';
        }).join("") : '<div class="better-codex-project-dashboard-empty">' + te("没有需要你处理的事项") + '</div>';
      const activeAgentIds = new Set(activeIssues.filter(issue => ["in_progress", "in_review", "blocked"].includes(issue.status)).map(issue => String(issue.agent_id || "default")));
      const agents = [...state.agents].sort((left, right) => Number(activeAgentIds.has(agentKey(right))) - Number(activeAgentIds.has(agentKey(left)))).slice(0, 3);
      const peopleAvatars = '<span class="better-codex-project-dashboard-avatar" title="' + escapeHtml(state.user.name || t("你")) + '">' + escapeHtml(state.user.initials || (state.user.name || t("你")).slice(0, 2)) + '</span>' + agents.map(agent => agentAvatarMarkup(agent, "better-codex-project-dashboard-avatar")).join("");
      const collaborators = '<article class="better-codex-project-collaborator"><span class="better-codex-project-dashboard-avatar">' + escapeHtml(state.user.initials || (state.user.name || t("你")).slice(0, 2)) + '</span><div><strong>' + escapeHtml(state.user.name || t("你")) + '</strong><span>' + te("项目负责人") + '</span></div></article>' + agents.map(agent => {
        const agentIssue = activeIssues.find(issue => String(issue.agent_id || "default") === agentKey(agent) && ["in_progress", "in_review", "blocked"].includes(issue.status));
        return '<article class="better-codex-project-collaborator">' + agentAvatarMarkup(agent, "better-codex-project-dashboard-avatar") + '<div><strong>' + escapeHtml(agentDisplayName(agent)) + '</strong><span>' + escapeHtml(agentIssue ? agentIssue.title : t("待命")) + '</span></div></article>';
      }).join("");
      const path = paths[0] || t("未提供项目文件夹");
      return '<section class="better-codex-project-dashboard"><header class="better-codex-project-dashboard-head"><div class="better-codex-project-dashboard-title"><div><h1>' + escapeHtml(projectLabel(project)) + '</h1><span class="better-codex-project-health" data-tone="' + healthTone + '">' + escapeHtml(healthLabel) + '</span></div></div><div class="better-codex-project-dashboard-people" aria-label="' + te("项目协作者") + '">' + peopleAvatars + '</div></header><nav class="better-codex-project-dashboard-tabs" aria-label="' + te("项目页面") + '"><button type="button" aria-current="page">' + te("概览") + '</button><button type="button" data-project-dashboard-work>' + te("工作") + '</button></nav><section class="better-codex-project-dashboard-summary"><article class="better-codex-project-dashboard-card better-codex-project-dashboard-description"><strong>' + te("项目说明") + '</strong><p>' + escapeHtml(project.description || t("尚未生成项目介绍")) + '</p><div class="better-codex-project-dashboard-path" title="' + escapeHtml(path) + '">' + icon("folder") + '<span>' + escapeHtml(path) + '</span></div></article><article class="better-codex-project-dashboard-card"><strong>' + te("当前状态") + '</strong><div class="better-codex-project-metrics"><span class="better-codex-project-metric"><b>' + escapeHtml(String(running)) + '</b><span>' + te("进行中") + '</span></span><span class="better-codex-project-metric" data-tone="warning"><b>' + escapeHtml(String(review)) + '</b><span>' + te("待复核") + '</span></span><span class="better-codex-project-metric" data-tone="danger"><b>' + escapeHtml(String(blocked)) + '</b><span>' + te("阻塞") + '</span></span></div></article><article class="better-codex-project-dashboard-card better-codex-project-cycle"><div class="better-codex-project-cycle-steps">' + phases + '</div><div class="better-codex-project-cycle-facts"><div><span>' + te("当前版本") + '</span><b>' + escapeHtml(versions.current) + '</b></div><div><span>' + te("下一里程碑") + '</span><b>' + escapeHtml(versions.next) + '</b></div><div><span>' + te("当前阶段") + '</span><b>' + te(phaseLabels[phase]) + '</b></div></div></article></section><section class="better-codex-project-timeline"><header class="better-codex-project-section-head"><strong>' + te("版本计划与里程碑") + '</strong><span class="better-codex-project-timeline-legend"><span><i></i>' + te("已发布") + '</span><span><i></i>' + te("进行中") + '</span><span><i></i>' + te("计划") + '</span></span></header><div class="better-codex-project-timeline-scroll"><div class="better-codex-project-timeline-canvas"><div class="better-codex-project-timeline-dates">' + dateTicks + '</div><div class="better-codex-project-timeline-track"><span class="better-codex-project-today"><span>' + te("今天") + ' ' + escapeHtml(projectDateLabel(today)) + '</span></span><div class="better-codex-project-version-band" style="--start:1;--span:4;--row:1"><b>' + escapeHtml(versions.current) + '</b><span>' + te("当前安装") + '</span></div><div class="better-codex-project-version-band" data-tone="current" style="--start:5;--span:4;--row:2"><b>' + escapeHtml(versions.next) + '</b><span>' + te("版本收口") + '</span><span class="better-codex-project-version-progress">' + escapeHtml(progress + "%") + '</span></div><div class="better-codex-project-version-band" data-tone="planned" style="--start:9;--span:4;--row:3"><b>' + escapeHtml(versions.stable) + '</b><span>' + te("稳定交付") + '</span></div></div></div></div><div class="better-codex-project-milestones"><span class="better-codex-project-milestone">' + icon("check") + '<span><b>' + escapeHtml(versions.current) + '</b><span>' + te("当前安装版本") + '</span></span></span><span class="better-codex-project-milestone" data-tone="current">' + icon("calendar") + '<span><b>' + te("预计") + ' ' + escapeHtml(projectDateLabel(firstTarget)) + '</b><span>' + escapeHtml(versions.next) + '</span></span></span><span class="better-codex-project-milestone" data-tone="planned">' + icon("calendar") + '<span><b>' + te("预计") + ' ' + escapeHtml(projectDateLabel(stableTarget)) + '</b><span>' + escapeHtml(versions.stable) + '</span></span></span></div></section><section class="better-codex-project-dashboard-lists"><article class="better-codex-project-dashboard-card"><header class="better-codex-project-section-head"><strong>' + te("当前工作") + '</strong><span>' + escapeHtml(String(work.length)) + '</span></header><div class="better-codex-project-work-list">' + workRows + '</div></article><article class="better-codex-project-dashboard-card"><header class="better-codex-project-section-head"><strong>' + te("等你处理") + '</strong><span>' + escapeHtml(String(attention.length)) + '</span></header><div class="better-codex-project-attention-list">' + attentionRows + '</div></article></section><section class="better-codex-project-dashboard-card better-codex-project-collaborators"><header class="better-codex-project-section-head"><strong>' + te("活跃协作者") + '</strong></header><div class="better-codex-project-collaborator-list">' + collaborators + '</div></section></section>';
    }

    function renderProjects() {
      const container = panel?.querySelector("#better-codex-projects");
      if (!container) return;
      const heading = panel.querySelector(".better-codex-project-heading");
      const createButton = panel.querySelector(".better-codex-project-actions .better-codex-button");
      if (createButton) {
        createButton.hidden = false;
        createButton.innerHTML = icon("plus") + '<span>' + te(state.projectDetailId ? "新建工作项" : "创建项目") + '</span>';
      }
      if (!state.projectDetailId) {
        if (heading) heading.innerHTML = '<strong>' + te("项目管理") + '</strong><span>' + escapeHtml(state.projects.length + " " + t("个项目")) + '</span>';
        if (HOST_KIND === "web" && state.surface === "projects") document.title = t("项目管理") + " · Better Codex";
        if (!state.projects.length) {
          container.innerHTML = '<section class="better-codex-project-empty"><strong>' + te("暂无项目") + '</strong><p>' + te("创建项目后，它会出现在 Codex 的项目列表中。") + '</p></section>';
          return;
        }
        container.innerHTML = '<section class="better-codex-project-list">' + projectsByRecentActivity(state.projects).map(project => {
          const paths = projectRootPaths(project);
          const description = project.description || t("尚未生成项目介绍");
          return '<button class="better-codex-project-card" type="button" data-project-id="' + escapeHtml(project.id) + '"><span class="better-codex-project-card-head"><span class="better-codex-project-card-icon">' + icon("folder") + '</span><span class="better-codex-project-card-title"><strong>' + escapeHtml(projectLabel(project)) + '</strong><span>' + escapeHtml(paths.length + " " + t("个文件夹")) + '</span></span>' + icon("chevron") + '</span><span class="better-codex-project-card-description">' + escapeHtml(description) + '</span><span class="better-codex-project-card-path">' + icon("folder") + '<span>' + escapeHtml(paths[0] || t("未提供")) + '</span></span></button>';
        }).join("") + '</section>';
        return;
      }
      const project = state.projects.find(item => item.id === state.projectDetailId);
      if (!project) {
        if (!state.projectsLoaded) {
          if (heading) heading.innerHTML = '<strong>' + te("项目管理") + '</strong>';
          container.innerHTML = "";
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
      container.innerHTML = '<section class="better-codex-project-detail">' + projectDashboardMarkup(project, issues, issuesLoading, paths) + '</section>';
    }

    async function loadProjects(options = {}) {
      const projects = await requestProjects();
      const projectsChanged = JSON.stringify(projects) !== JSON.stringify(state.projects);
      const pending = state.projectDocumentPending;
      if (pending) {
        const project = projects.find(item => item.id === pending.projectId);
        if (project && (project.overview_status === "generating" || String(project.updated_at || "") !== pending.updatedAt)) state.projectDocumentPending = null;
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
            requestList("/api/issues?project_id=" + encodeURIComponent(projectId), "issues"),
            requestList("/api/issues?archived=1&project_id=" + encodeURIComponent(projectId), "issues"),
          ]);
          if (state.projectDetailId === projectId) {
            state.projectIssues = [...activeIssues, ...archivedIssues];
            state.projectIssuesProjectId = projectId;
          }
        }
      }
      if (options.background && !projectsChanged && !state.projectDetailId) return;
      render();
    }

    async function openProjectDetail(projectId) {
      state.projectDetailId = projectId;
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
      const work = event.target.closest("[data-project-dashboard-work]");
      if (work) {
        state.projectId = state.projectDetailId;
        state.filters.project = state.projectDetailId ? [state.projectDetailId] : [];
        open("issues");
        return;
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
          state.projectDocumentError = { projectId, message: projectDocumentErrorLabel(error instanceof Error ? error.message : error) };
          showError(error);
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
      const directoryBrowser = REMOTE ? '<section class="better-codex-directory-browser" aria-label="' + te("浏览本机文件夹") + '"><div class="better-codex-directory-toolbar"><button type="button" data-directory-up aria-label="' + te("上一级") + '" disabled>' + icon("send") + '</button><input data-directory-path maxlength="4096" aria-label="' + te("目录路径") + '" autocomplete="off" spellcheck="false"><button type="button" data-directory-go>' + te("前往") + '</button></div><div class="better-codex-directory-shortcuts"><button type="button" data-directory-home>' + icon("folder") + '<span>' + te("主目录") + '</span></button><button type="button" data-directory-root>' + icon("folder") + '<span>' + te("文件系统") + '</span></button></div><div class="better-codex-directory-list" aria-label="' + te("浏览本机文件夹") + '"></div><div class="better-codex-directory-footer"><span data-directory-status aria-live="polite"></span><button class="better-codex-directory-select" type="button" data-directory-select disabled>' + te("选择当前文件夹") + '</button></div></section>' : "";
      dialog.innerHTML = '<form><h2>' + te("创建 Codex 项目") + '</h2><p>' + te("创建后会加入 Codex 的项目列表。") + '</p><label><span>' + te("项目名称") + '</span><input name="name" maxlength="120" autocomplete="off" required></label><label><span>' + te("项目文件夹") + '</span><span class="better-codex-project-folder-field"><input name="workspace_path" maxlength="4096" placeholder="' + te("选择本地项目文件夹") + '" autocomplete="off" spellcheck="false" readonly required><button type="button" data-project-choose-folder>' + te("选择文件夹") + '</button></span></label>' + directoryBrowser + '<output hidden></output><div class="better-codex-project-dialog-actions"><button type="button" data-project-create-cancel>' + te("取消") + '</button><button type="submit" disabled>' + te("创建项目") + '</button></div></form>';
      let directoryRequest = 0;
      let currentDirectory = null;
      const workspaceInput = dialog.querySelector('[name="workspace_path"]');
      const nameInput = dialog.querySelector('[name="name"]');
      const submit = dialog.querySelector('button[type="submit"]');
      const output = dialog.querySelector("output");
      const chooseButton = dialog.querySelector("[data-project-choose-folder]");
      const directoryPanel = dialog.querySelector(".better-codex-directory-browser");
      const directoryPath = dialog.querySelector("[data-directory-path]");
      const directoryList = dialog.querySelector(".better-codex-directory-list");
      const directoryStatus = dialog.querySelector("[data-directory-status]");
      const directorySelect = dialog.querySelector("[data-directory-select]");
      const directoryUp = dialog.querySelector("[data-directory-up]");
      const directoryHome = dialog.querySelector("[data-directory-home]");
      const directoryRoot = dialog.querySelector("[data-directory-root]");
      const finish = () => { directoryRequest += 1; dialog.close(); dialog.remove(); };
      dialog.querySelector("[data-project-create-cancel]").addEventListener("click", finish);
      const applyWorkspacePath = workspacePath => {
        workspaceInput.value = workspacePath;
        workspaceInput.title = workspacePath;
        submit.disabled = false;
        chooseButton.textContent = t("更改文件夹");
        if (!nameInput.value.trim()) nameInput.value = workspacePath.replace(/[\\\\/]+$/, "").split(/[\\\\/]/).pop() || "";
        if (directoryPanel) directoryPanel.hidden = true;
        nameInput.focus();
        nameInput.select();
      };
      const directoryErrorLabel = error => {
        const value = error instanceof Error ? error.message : "";
        return value === "incompatible_protocol" ? t("本机 Runtime 版本不支持远程文件夹浏览") : t("无法读取文件夹");
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
        directorySelect.disabled = false;
        directoryStatus.textContent = directory.truncated ? t("仅显示前 500 个文件夹") : "";
        directoryList.innerHTML = directory.directories.length
          ? directory.directories.map(entry => '<button class="better-codex-directory-row" type="button" data-directory-entry="' + escapeHtml(entry.path) + '" title="' + escapeHtml(entry.path) + '" aria-label="' + te("打开文件夹") + ': ' + escapeHtml(entry.name) + '">' + icon("folder") + '<span>' + escapeHtml(entry.name) + '</span>' + icon("chevron") + '</button>').join("")
          : '<span class="better-codex-directory-state">' + te("这个文件夹中没有子文件夹") + '</span>';
      };
      const loadRemoteDirectory = async path => {
        const request = ++directoryRequest;
        directoryPanel.hidden = false;
        directoryPanel.setAttribute("aria-busy", "true");
        directorySelect.disabled = true;
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
          reportGlobalError(error, { source: "directory_browser" });
          currentDirectory = null;
          directoryList.innerHTML = '<span class="better-codex-directory-state">' + escapeHtml(directoryErrorLabel(error)) + '</span>';
          directoryStatus.textContent = directoryErrorLabel(error);
          directorySelect.disabled = true;
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
          reportGlobalError(error, { source: "directory_picker" });
          output.textContent = error instanceof Error ? error.message : t("无法选择文件夹");
          output.hidden = false;
        } finally {
          chooseButton.disabled = false;
          chooseButton.textContent = workspaceInput.value ? t("更改文件夹") : t("选择文件夹");
        }
      };
      dialog.querySelector("[data-project-choose-folder]").addEventListener("click", () => { void chooseFolder(); });
      if (REMOTE) {
        directoryList.addEventListener("click", event => {
          const row = event.target.closest("[data-directory-entry]");
          if (row) void loadRemoteDirectory(row.dataset.directoryEntry);
        });
        directoryUp.addEventListener("click", () => { if (directoryUp.dataset.path) void loadRemoteDirectory(directoryUp.dataset.path); });
        directoryHome.addEventListener("click", () => { if (directoryHome.dataset.path) void loadRemoteDirectory(directoryHome.dataset.path); });
        directoryRoot.addEventListener("click", () => { if (directoryRoot.dataset.path) void loadRemoteDirectory(directoryRoot.dataset.path); });
        dialog.querySelector("[data-directory-go]").addEventListener("click", () => { void loadRemoteDirectory(directoryPath.value); });
        directoryPath.addEventListener("keydown", event => {
          if (event.key !== "Enter") return;
          event.preventDefault();
          void loadRemoteDirectory(directoryPath.value);
        });
        directorySelect.addEventListener("click", () => { if (currentDirectory?.path) applyWorkspacePath(currentDirectory.path); });
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
          reportGlobalError(error, { source: "project_create" });
          output.textContent = error instanceof Error ? error.message : t("创建失败");
          output.hidden = false;
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
      const remoteInstallPrompt = trustedRunbookPrompt + "\\n\\nInstall Better Codex Relay v" + CORE_VERSION + " using the VPS path. Inspect the environment first, preserve existing services and data, ask before privileged, external, or destructive changes, resume a valid partial installation, and complete every acceptance gate before reporting success.";
      const remotePage = [
        '<section class="better-codex-help-page" data-help-page="remote" hidden>',
        '<div class="better-codex-help-page-heading better-codex-remote-heading"><div><h2>' + te("远程访问") + '</h2><p>' + te("从浏览器安全访问你的任务看板") + '</p></div><button type="button" class="better-codex-remote-refresh" data-remote-refresh hidden>' + icon("refresh") + '<span>' + te("刷新状态") + '</span></button></div>',
        '<div class="better-codex-remote-setup" data-remote-guidance>',
        '<section class="better-codex-remote-step"><div><h3>' + te("部署 Hub") + '</h3><p>' + te("复制提示词，交给能访问 VPS 的 Codex") + '</p></div><button type="button" class="better-codex-remote-install" data-remote-copy-install>' + icon("copy") + '<span>' + te("复制安装提示词") + '</span></button></section>',
        '<section class="better-codex-remote-step"><div><h3>' + te("连接 Hub") + '</h3><p>' + te("输入 VPS 部署后的 HTTPS 地址") + '</p></div><div class="better-codex-remote-url"><input type="url" data-remote-url inputmode="url" autocomplete="url" placeholder="https://codex.example.com" aria-label="' + te("访问地址") + '"><button type="button" data-remote-copy-connect disabled>' + icon("copy") + '<span>' + te("复制连接指令") + '</span></button></div></section>',
        '</div>',
        '<section class="better-codex-remote-status" data-remote-status="loading" hidden><div class="better-codex-remote-status-head"><span class="better-codex-remote-status-icon">' + icon("server") + '</span><div><strong data-remote-status-title>' + te("检测中") + '</strong><small data-remote-status-subtitle>' + te("正在检查") + '</small></div><span class="better-codex-remote-status-badge" data-remote-status-badge>' + te("检测中") + '</span></div><dl data-remote-status-details hidden><div><dt>' + te("服务版本") + '</dt><dd data-remote-version>--</dd></div><div><dt>' + te("同步协议") + '</dt><dd data-remote-protocol>--</dd></div><div><dt>' + te("最后同步") + '</dt><dd data-remote-sync>--</dd></div></dl><div class="better-codex-remote-actions" data-remote-actions hidden><a data-remote-open target="_blank" rel="noreferrer">' + icon("external") + '<span>' + te("访问网站") + '</span></a></div></section>',
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
      const renderRemoteStatus = value => {
        if (!remoteStatus) return;
        const remote = value?.remote;
        const reachable = remote?.reachable === true;
        remoteRefresh.disabled = false;
        remoteRefresh.dataset.loading = "false";
        remoteError.hidden = true;
        if (!remote) {
          remotePageNode.dataset.remoteConnected = "false";
          remoteGuidance.hidden = false;
          remoteRefresh.hidden = true;
          remoteStatus.hidden = true;
          remoteStatusDetails.hidden = true;
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
        remoteStatusTitle.textContent = String(remote.name || "Better Codex Relay");
        remoteStatusSubtitle.textContent = te("部署在 VPS") + " · " + String(remote.url || "");
        remoteStatusBadge.textContent = te(reachable ? "服务在线" : "无法访问");
        remoteStatusDetails.hidden = false;
        remoteActions.hidden = false;
        remoteSessions.hidden = REMOTE || value.remote_mode !== "relay";
        dialog.querySelector("[data-remote-version]").textContent = remote.version ? "v" + String(remote.version).replace(/^v/, "") : "--";
        dialog.querySelector("[data-remote-protocol]").textContent = String(remote.protocol_version || "--");
        dialog.querySelector("[data-remote-sync]").textContent = value.last_sync_at ? new Date(value.last_sync_at).toLocaleString(state.locale === "zh-CN" ? "zh-CN" : "en") : te("尚未同步");
        remoteOpen.href = String(remote.url || "");
        if (!reachable && remote.error) {
          reportGlobalError(new Error(String(remote.error)), { source: "remote_status" });
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
      loadRemoteStatus = async (force = false) => {
        if (!remoteStatus || (remoteStatusLoaded && !force)) return;
        remoteStatusLoaded = true;
        remoteRefresh.disabled = true;
        remoteRefresh.dataset.loading = "true";
        remoteStatus.dataset.remoteStatus = "loading";
        remoteStatusBadge.textContent = te("检测中");
        try {
          renderRemoteStatus(await api("/api/remote-access/status"));
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
          remoteError.textContent = te("状态检查失败");
          remoteError.hidden = false;
        }
      };
      remoteStatusTimer = setInterval(() => {
        if (!document.hidden && dialog.open && dialog.querySelector(".better-codex-auto-dispatch-help-shell")?.dataset.helpView === "remote") void loadRemoteStatus(true);
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
      remoteRefresh?.addEventListener("click", () => void loadRemoteStatus(true));
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

    function syncAutoDispatch() {
      const button = panel?.querySelector("#better-codex-auto-dispatch");
      if (!button) return;
      const label = state.autoDispatchPending ? "切换中…" : state.autoDispatch ? "自动运行" : "手动运行";
      button.classList.toggle("is-on", state.autoDispatch);
      button.setAttribute("aria-pressed", String(state.autoDispatch));
      button.disabled = state.autoDispatchPending;
      button.setAttribute("aria-busy", String(state.autoDispatchPending));
      button.removeAttribute("title");
      button.setAttribute("aria-label", t(state.autoDispatch ? "切换为手动运行" : "切换为自动运行"));
      button.innerHTML = icon(state.autoDispatch || state.autoDispatchPending ? "refresh" : "user") + "<span>" + te(label) + "</span>";
    }

    function syncMockupUi() {
      if (!panel) return;
      panel.dataset.mockup = String(state.mockup);
      const autoDispatch = panel.querySelector("#better-codex-auto-dispatch");
      if (autoDispatch) autoDispatch.hidden = false;
      const createToggle = panel.querySelector("#better-codex-create-toggle");
      if (createToggle) createToggle.hidden = false;
    }

    function render() {
      if (!panel) return;
      panel.dataset.surface = state.surface;
      if (HOST_KIND === "web" && state.surface !== "projects") document.title = t(state.surface === "agents" ? "智能体" : "任务看板") + " · Better Codex";
      renderAgents();
      renderProjects();
      syncAutoDispatch();
      syncMockupUi();
      const runningCount = state.issues.filter(issue => issueExecutionRunning(issue)).length;
      panel.querySelectorAll("[data-view]").forEach(button => button.classList.toggle("is-active", button.dataset.view === state.view));
      const working = panel.querySelector("#better-codex-working");
      working.innerHTML = icon("bot") + '<span>' + te(runningCount + " 个智能体工作中") + "</span>";
      working.dataset.runningCount = String(runningCount);
      working.setAttribute("aria-label", t(runningCount + " 个智能体工作中"));
      working.title = t(runningCount ? "查看运行中的任务" : "当前没有运行中的任务");
      working.classList.toggle("has-work", runningCount > 0);
      working.classList.toggle("is-active", state.view === "working");
      working.hidden = false;
      const filterButton = panel.querySelector("#better-codex-filter");
      const filterCount = Object.values(state.filters).reduce((total, values) => total + values.length, 0);
      filterButton.innerHTML = icon("filter") + "<span>" + te(filterCount ? filterCount + " 个筛选" : "筛选") + "</span>";
      filterButton.setAttribute("aria-label", t(filterCount ? filterCount + " 个筛选" : "筛选"));
      filterButton.classList.toggle("is-active", filterCount > 0);
      const visible = state.issues.filter(issue => {
        const assigned = Boolean(issue.agent_enabled || issue.user_assigned);
        const matchesView = state.view === "all"
          || (state.view === "assigned" && assigned)
          || (state.view === "unassigned" && !assigned)
          || (state.view === "working" && issueExecutionRunning(issue));
        return matchesView && issueMatchesFilters(issue);
      });
      const board = panel.querySelector("#better-codex-board");
      if (!state.issuesLoaded) {
        board.innerHTML = '<section class="better-codex-board-loading" role="status" aria-live="polite"><span aria-hidden="true"></span><strong>' + te("正在加载任务看板") + '</strong></section>';
        requestAnimationFrame(syncBoardScrollControl);
        return;
      }
      const visibleStatuses = [...Object.entries(statusLabels), ["archive", "归档"]];
      board.innerHTML = visibleStatuses.map(([status, statusLabel]) => {
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
          const activityState = permissions.remotePending ? "remote-pending" : permissions.remoteConflict ? "remote-conflict" : enrichmentLocked ? "thinking" : issue.session_status === "stopping" ? "stopping" : activeExecutionState || executionState;
          const activityLabel = t(activityState === "remote-pending" ? "同步中" : activityState === "remote-conflict" ? "同步冲突" : enrichmentLocked ? "理解中" : activityState === "stopping" ? "正在停止…" : activityState === "running" ? "工作中" : activityState === "scheduling" ? "调度中" : activityState === "scheduler-failed" ? "调度失败" : activityState === "claimed" ? "排队中" : activityState === "in_review" ? "待审核" : activityState === "completed" ? "已完成" : activityState === "blocked" ? "已阻塞" : activityState === "failed" ? "执行失败" : activityState === "interrupted" ? "已停止" : activityState === "not-started" ? "未开始" : "");
          const activityIcon = activityState === "scheduling" ? '<span class="better-codex-activity-dot better-codex-scheduler-dot" aria-hidden="true"></span>' : activityState === "scheduler-failed" ? '<span class="better-codex-activity-dot better-codex-scheduler-failed-dot" aria-hidden="true"></span>' : ["completed", "interrupted", "not-started"].includes(activityState) ? '<span class="better-codex-activity-dot" aria-hidden="true"></span>' : ["failed", "blocked", "remote-conflict"].includes(activityState) ? icon("close") : agentAvatarMarkup(activityAgent, "better-codex-card-avatar");
          const activity = activityState
            ? '<span class="better-codex-activity" data-run="' + escapeHtml(activityState) + '">' + activityIcon + '<span class="' + (enrichmentLocked || executionRunning || permissions.remotePending ? "better-codex-shimmer" : "") + '">' + activityLabel + '</span></span>'
            : "";
          const description = mockupText(issue.description).replace(/[#*_\`~>\[\]()]/g, "").replace(/\\s+/g, " ").trim();
          const issueProject = state.projects.find(item => item.id === issue.project_id);
          const projectChip = projectLabel(issueProject)
            ? '<span class="better-codex-chip">' + icon("folder") + '<span>' + escapeHtml(projectLabel(issueProject)) + '</span></span>'
            : "";
          const labelChips = (issue.labels || []).map(value => '<span class="better-codex-chip">' + escapeHtml(mockupText(value)) + '</span>').join("");
          const chips = projectChip + labelChips;
          const meta = assignee
            ? '<span class="better-codex-card-assignee">' + agentAvatarMarkup(assignee, "better-codex-card-avatar") + '<span>' + escapeHtml(agentName || "Codex") + '</span></span>'
            : issue.user_assigned
              ? '<span class="better-codex-card-assignee"><span class="better-codex-card-avatar is-user is-initials" style="background:' + escapeHtml(state.user.color || "#16a34a") + '">' + escapeHtml(state.user.initials || t("你")) + '</span><span>' + escapeHtml(state.user.name || t("我")) + '</span></span>'
              : '<span class="better-codex-card-assignee is-empty">' + icon("user") + '<span>' + te("未分配") + '</span></span>';
          return '<article class="better-codex-card' + (issue.id === draggingIssueId ? " is-dragging" : "") + (enrichmentLocked ? " is-enrichment-pending" : "") + (executionRunning ? " is-execution-running" : "") + (permissions.remotePending ? " is-remote-pending" : "") + (permissions.remoteConflict ? " is-remote-conflict" : "") + '" draggable="' + String(!issueLocked && supportsIssueDrag()) + '" aria-disabled="' + String(issueLocked) + '"' + (issueLocked ? ' aria-busy="' + String(enrichmentLocked || executionRunning || permissions.remotePending) + '"' : "") + ' data-issue-id="' + escapeHtml(issue.id) + '"><div class="better-codex-card-row"><div class="better-codex-card-id">' + priorityIcon(issue.priority) + '<span>' + escapeHtml(issue.identifier) + '</span></div>' + activity + '</div><div class="better-codex-card-title">' + escapeHtml(mockupText(issue.title)) + '</div>' + (description ? '<div class="better-codex-card-description">' + escapeHtml(description) + '</div>' : "") + (chips ? '<div class="better-codex-chip-row">' + chips + '</div>' : "") + '<div class="better-codex-card-meta">' + meta + '<span>' + te("更新于 " + timeAgo(issue.updated_at)) + '</span></div></article>';
        }).join("");
        const columnButton = archiveColumn
          ? '<button class="better-codex-column-icon" type="button" data-archive-open aria-label="' + te("查看已归档卡片") + '" title="' + te("查看已归档卡片") + '">' + icon("archive") + '</button>'
          : '<button class="better-codex-column-icon" type="button" data-add-status="' + status + '" aria-label="' + te("新建任务") + '">' + icon("plus") + '</button>';
        return '<section class="better-codex-column" data-status="' + status + '"><div class="better-codex-column-head"><span class="better-codex-column-title">' + statusIcon(status) + '<span>' + te(statusLabel) + '</span>' + (archiveColumn ? "" : '<span>' + issues.length + '</span>') + '</span><span class="better-codex-column-actions">' + columnButton + '</span></div><div class="better-codex-cards">' + (cards || (archiveColumn ? '<div class="better-codex-empty">' + te("拖到这里即可归档") + '</div>' : "")) + '</div></section>';
      }).join("");
      requestAnimationFrame(syncBoardScrollControl);
    }

    async function loadIssues(options = {}) {
      if (options.background && (draggingIssueId || sessionDragPointer?.dragging)) return;
      const query = new URLSearchParams();
      if (state.search) query.set("search", state.search);
      const issuePath = "/api/issues" + (query.toString() ? "?" + query : "");
      let issues;
      try {
        issues = await requestList(issuePath, "issues");
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
      const agents = await requestList("/api/agents", "agents");
      const changed = JSON.stringify(agents) !== JSON.stringify(state.agents);
      state.agents = agents;
      if (options.preserveInspector && panel?.dataset.surface === "agents" && state.agentPane !== "preview") return;
      if (options.background && (state.agentPane !== "preview" || !changed)) return;
      render();
    }

    async function loadAutoDispatch() {
      const result = await api("/api/settings/auto-dispatch");
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
      if (state.surface === "agents") await loadAgents(options);
      else if (state.surface === "projects") await loadProjects(options);
      else await loadIssues(options);
    }

    async function load() {
      clearError();
      try {
        const bootstrap = await api("/api/bootstrap");
        applyAppearance(bootstrap.appearance);
        state.systemLocale = resolveSystemLocale(HOST_KIND === "web" ? INITIAL_LOCALE : bootstrap.locale);
        state.locale = state.languageSetting === "system" ? state.systemLocale : state.languageSetting;
        if (bootstrap.user && typeof bootstrap.user === "object") state.user = bootstrap.user;
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
      agentInspectorClosing = false;
      agentCreateFullscreen = false;
      state.agentPane = "create";
      state.selectedAgentId = "";
      state.agentDraft = draft
        ? { ...draft, avatar: draft.avatar || ("icon:" + draft.key) }
        : { avatar: "icon:bot" };
      renderAgents();
      setTimeout(() => panel?.querySelector('[data-agent-form="create"] [data-agent-name]')?.focus(), 0);
    }

    function onAgentSubmit(event) {
      const form = event.target.closest("[data-agent-form]");
      if (!form) return;
      event.preventDefault();
      if (AGENTS_READ_ONLY) return;
      const mode = form.dataset.agentForm;
      const selected = state.agents.find(agent => agentKey(agent) === form.dataset.agentKey);
      const submit = form.querySelector('[type="submit"]');
      const error = form.querySelector(".better-codex-agent-inspector-error");
      const body = {
        name: form.elements.name?.value || selected?.name || state.agentDraft?.name || form.elements.name_en?.value || "Codex",
        name_en: form.elements.name_en?.value || selected?.name_en || state.agentDraft?.name_en || "",
        description: form.elements.description?.value || "",
        instructions: form.elements.instructions?.value || "",
        model: form.elements.model.value,
        reasoning_effort: form.elements.reasoning_effort.value,
        sandbox_mode: form.elements.sandbox_mode.value,
        max_concurrency: Number(form.elements.max_concurrency?.value || 5),
        avatar: form.elements.avatar?.value || "",
        ...(selected ? { version: selected.version } : {})
      };
      void perform(async () => {
        submit.disabled = true;
        error.hidden = true;
        try {
          const path = mode === "default" ? "/api/agents/default" : mode === "create" ? "/api/agents" : "/api/agents/" + encodeURIComponent(selected.id);
          const saved = await api(path, { method: mode === "create" ? "POST" : "PATCH", body: JSON.stringify(body) });
          state.agentPane = "detail";
          state.selectedAgentId = agentKey(saved);
          state.agentDraft = null;
          await loadAgents();
        } catch (caught) {
          reportGlobalError(caught, { source: "agent_save", mode });
          error.textContent = t(caught instanceof Error ? caught.message : "保存失败");
          error.hidden = false;
          submit.disabled = false;
        }
      });
    }

    function onAgentsClick(event) {
      if (suppressAgentOutside) return;
      if (event.target.closest("[data-agent-window-back]")) return setAgentCreateFullscreen(false);
      if (event.target.closest("[data-agent-window-expand]")) return setAgentCreateFullscreen(!agentCreateFullscreen);
      if (event.target.closest("[data-agent-close-pane]")) return closeAgentInspector();
      const row = event.target.closest(".better-codex-agent-directory [data-agent-key]");
      if (row) {
        const agent = state.agents.find(item => agentKey(item) === row.dataset.agentKey);
        if (!agent) return;
        agentInspectorClosing = false;
        state.selectedAgentId = agentKey(agent);
        state.agentPane = "detail";
        state.agentDraft = null;
        return renderAgents();
      }
      if (state.agentPane !== "preview" && event.target.closest(".better-codex-agent-directory")) return closeAgentInspector();
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
        }
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
        void confirmAction("删除智能体", '确定删除智能体 “' + agentDisplayName(agent) + '” 吗？', "删除").then(confirmed => {
          if (!confirmed) return;
          return perform(async () => {
            await api("/api/agents/" + encodeURIComponent(agent.id), { method: "DELETE", body: JSON.stringify({ version: agent.version }) });
            state.selectedAgentId = "";
            state.agentDraft = null;
            await loadAgents({ preserveInspector: true });
            closeAgentInspector();
          });
        });
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
          cachedPrompt ||= [cachedTitle, cachedDescription].filter(Boolean).join("\\n\\n");
        } else {
          cachedTitle ||= cachedPrompt.split(/\\n/).find(line => line.trim())?.trim().slice(0, 120) || "";
          cachedDescription ||= cachedPrompt;
        }
      }
      const draft = {
        mode: draftMode,
        title: issue?.title || cachedTitle,
        description: issue?.description || cachedDescription,
        prompt: issue?.description || cachedPrompt,
        agentId: issue?.agent_id || "",
        assignee: issue
          ? (issue.agent_enabled ? (issue.agent_id || "codex") : issue.user_assigned ? "user" : "none")
          : "none",
        status: issue?.status || initialStatus,
        priority: issue?.priority || "none",
        runStatus: issue?.mockup_run_status || "not-started",
        labels: (issue?.labels || []).join(", "),
        projectId: issue?.project_id || state.projectId,
        expanded: issue ? false : localStorage.getItem(CREATE_DIALOG_EXPANDED_KEY) === "true",
        descriptionExpanded: false,
        reply: issue?.reply_draft || "",
        attachments: [],
        replyAttachments: []
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
      let lastReplyRequestId = "";
      let lastReplyStatus = issue?.reply_status || "idle";
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

      function recoverReply(requestId, message, attempts = 0) {
        if (!issue || !sessionId || !dialog.isConnected || requestId !== replyRecoveryRequestId) return;
        if (attempts >= 5) {
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
              applyConversation(data, { preserveBody: true });
              return;
            }
          } catch {}
          recoverReply(requestId, message, attempts + 1);
        }, attempts === 0 ? 1500 : 2000);
      }

      function scheduleReplyRecovery(requestId, message) {
        stopReplyRecovery();
        replyRecoveryRequestId = requestId;
        recoverReply(requestId, message);
      }

      function syncDraft() {
        const form = dialog.querySelector("form");
        if (!form) return;
        const value = name => form.querySelector('[name="' + name + '"]')?.value;
        if (draft.mode === "manual") {
          if (value("title") !== undefined) draft.title = String(value("title"));
          if (value("description") !== undefined) draft.description = String(value("description"));
          if (value("status") !== undefined) draft.status = String(value("status"));
          if (value("priority") !== undefined) draft.priority = String(value("priority"));
          if (value("mockup_run_status") !== undefined) draft.runStatus = String(value("mockup_run_status"));
          if (value("assignee") !== undefined) draft.assignee = String(value("assignee"));
          if (value("labels") !== undefined) draft.labels = String(value("labels"));
          if (value("reply") !== undefined) draft.reply = String(value("reply"));
        } else {
          if (value("prompt") !== undefined) draft.prompt = String(value("prompt"));
          if (value("agent_id") !== undefined) draft.agentId = String(value("agent_id"));
        }
      }

      function syncDraftFromIssue() {
        if (!issue) return;
        if (!dirtyDraftFields.has("title")) draft.title = issue.title || "";
        if (!dirtyDraftFields.has("description")) draft.description = issue.description || "";
        if (!dirtyDraftFields.has("status")) draft.status = issue.status || "todo";
        if (!dirtyDraftFields.has("priority")) draft.priority = issue.priority || "none";
        if (!dirtyDraftFields.has("labels")) draft.labels = (issue.labels || []).join(", ");
        if (!dirtyDraftFields.has("assignee")) draft.assignee = issue.agent_enabled ? (issue.agent_id || "codex") : issue.user_assigned ? "user" : "none";
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

      function persistReplyDraft(value) {
        if (!issue || REMOTE) return;
        replyDraftUpdate = replyDraftUpdate.catch(() => {}).then(async () => {
          let current = issue;
          for (let attempt = 0; attempt < 2; attempt += 1) {
            try {
              const updated = await api("/api/issues/" + encodeURIComponent(issue.id), { method: "PATCH", body: JSON.stringify({ version: current.version, reply_draft: value }) });
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
        const draftAgentDisabled = dirtyDraftFields.has("assignee") && ["none", "user"].includes(draft.assignee);
        const startBlocked = !issue || Boolean(issue.archived_at) || !issue.agent_enabled || draftAgentDisabled || Boolean(issue.active_run_status) || Boolean(sessionId) || issue.enrichment_status === "pending" || issue.status === "done";
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
        const mode = stopping ? "stopping" : working ? "stop" : "send";
        const composer = send.closest(".better-codex-composer");
        if (reply) reply.disabled = sessionHandoff || archived;
        if (composer) composer.dataset.state = mode;
        send.dataset.composerMode = mode;
        send.setAttribute("aria-label", t(stopping ? "正在停止…" : working ? "停止任务" : "发送"));
        send.title = t(stopping ? "正在停止…" : working ? "停止任务" : "发送");
        send.innerHTML = icon(working ? "stop" : "send", "", working ? "2.5" : "2");
        send.disabled = stopping || sessionHandoff || archived || (!working && !String(reply?.value || "").trim() && !draft.replyAttachments.length);
        const attach = dialog.querySelector("[data-conversation-attach]");
        if (attach) attach.disabled = sessionHandoff || archived;
      }

      function applyDialogPermissions() {
        if (!dialog.isConnected) return;
        dialog.dataset.executionRunning = String(executionRunning);
        dialog.dataset.executionLocked = String(executionLocked);
        dialog.dataset.locked = String(editingLocked);
        dialog.querySelectorAll("input, textarea, select, button").forEach(control => {
          if (control.matches("[data-dialog-close], [data-dialog-expand], [data-dialog-open-thread], [data-dialog-stop], [data-dialog-restore], [data-description-toggle], [data-conversation-copy]")) {
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
            control.disabled = !control.matches('[name="reply"], [data-conversation-send], [data-conversation-attach], [data-conversation-retry], [data-dialog-attachment-scope="reply"]');
            return;
          }
          if (executionLocked) {
            control.disabled = !(control.matches('[name="reply"], [data-conversation-send], [data-conversation-attach], [data-conversation-retry], [data-dialog-attachment-scope="reply"]') || control.closest('[data-dialog-select="status"], [data-dialog-select="priority"], [data-dialog-select="assignee"]'));
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
        const previousAssignee = [issue.agent_enabled, issue.agent_id || "", issue.user_assigned].join(":");
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
          || previousAssignee !== [issue.agent_enabled, issue.agent_id || "", issue.user_assigned].join(":")
          || previousProjectId !== issue.project_id;
        if (previousSessionId !== sessionId || previousEnrichmentLocked !== enrichmentLocked || previousExecutionRunning !== executionRunning || previousSessionHandoff !== sessionHandoff || previousArchivedAt !== issue.archived_at || footerPresent !== !executionLocked || draftSourceChanged) {
          syncDraft();
          syncDraftFromIssue();
          renderDialog();
          return;
        }
        syncDraftFromIssue();
        applyDialogPermissions();
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
        const backButton = issue ? '<button class="better-codex-dialog-back" type="button" data-dialog-back aria-label="' + te("返回") + '">' + icon("back") + '</button>' : "";
        return '<div class="better-codex-dialog-head"><div class="better-codex-dialog-head-leading">' + backButton + '<nav class="better-codex-dialog-breadcrumb" aria-label="' + te("任务看板") + '">' + crumb + '</nav></div><div class="better-codex-dialog-head-actions">' + restoreButton + openThreadButton + startNowButton + '<button class="better-codex-icon-button" type="button" data-dialog-expand aria-label="' + te(draft.expanded ? (issue ? "退出全屏" : "缩小") : "展开") + '">' + icon(draft.expanded ? "shrink" : "expand") + '</button><button class="better-codex-icon-button" type="button" data-dialog-close aria-label="' + te("关闭") + '">' + icon("close") + '</button></div></div>';
      }

      function conversationPanel() {
        if (!issue || (!sessionId && !executionRunning)) return "";
        const conversationState = issue.reply_status || "idle";
        const conversationStatus = conversationStatusMarkup(conversationState);
        const conversationBody = sessionId ? '<p class="better-codex-markdown-empty">' + te("加载对话…") + '</p>' : "";
        return '<div class="better-codex-conversation-shell"><section class="better-codex-conversation"><div class="better-codex-conversation-head"><span>' + te("对话") + '</span><span class="better-codex-conversation-status" data-conversation-status data-state="' + escapeHtml(conversationState) + '"' + (conversationStatus ? "" : " hidden") + '>' + conversationStatus + '</span></div><div class="better-codex-timeline" data-conversation-body>' + conversationBody + '</div></section><div class="better-codex-conversation-feedback" data-conversation-feedback hidden></div>' + conversationComposer() + '</div>';
      }

      function conversationStatusMarkup(replyStatus) {
        const enrichmentLocked = issuePermissions(issue).enrichmentPending;
        const latestRunStatus = issue?.latest_run_status || "";
        const executionState = issue?.status === "done" ? "completed" : issue?.status === "cancelled" ? "interrupted" : issue?.status === "blocked" ? "blocked" : (issue?.latest_scheduler_error || issue?.latest_scheduler_status === "failed") && issue?.status === "in_review" ? "scheduler-failed" : latestRunStatus === "completed" ? "completed" : latestRunStatus === "failed" ? "failed" : latestRunStatus === "interrupted" ? "interrupted" : latestRunStatus === "scheduling" ? "scheduling" : latestRunStatus === "running" ? "running" : latestRunStatus === "claimed" ? "claimed" : issue?.agent_enabled ? "not-started" : "";
        const sessionExecutionState = issue?.session_status === "stopping" ? "stopping" : issue?.session_status === "starting" ? "claimed" : ["active", "waiting_on_approval", "waiting_on_user"].includes(issue?.session_status) ? "running" : "";
        const activeExecutionState = issue?.active_run_status || (replyStatus === "running" ? "running" : sessionExecutionState);
        const replyResultState = replyStatus === "succeeded" ? "completed" : ["failed", "interrupted"].includes(replyStatus) ? replyStatus : conversationFailureState;
        const relayFailure = issue?.session_relay_error && !issue?.session_relay_connected && issue?.active_run_status === "claimed";
        const activityState = enrichmentLocked ? "thinking" : issue?.session_status === "stopping" ? "stopping" : relayFailure ? "relay-failed" : activeExecutionState || replyResultState || executionState;
        if (!activityState) return "";
        const activityLabel = t(enrichmentLocked ? "理解中" : activityState === "stopping" ? "正在停止…" : activityState === "relay-failed" ? "Codex 会话连接失败" : activityState === "running" ? "工作中" : activityState === "scheduling" ? "调度中" : activityState === "scheduler-failed" ? "调度失败" : activityState === "claimed" ? "排队中" : activityState === "in_review" ? "待审核" : activityState === "completed" ? "已完成" : activityState === "blocked" ? "已阻塞" : activityState === "failed" ? "执行失败" : activityState === "interrupted" ? "已停止" : activityState === "not-started" ? "未开始" : "");
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

      function conversationComposer() {
        if (!issue || !sessionId) return "";
        const stopping = issue.session_status === "stopping";
        const archived = Boolean(issue.archived_at);
        const working = stopping || executionRunning || issue.reply_status === "running";
        const mode = stopping ? "stopping" : working ? "stop" : "send";
        const inputDisabled = sessionHandoff || archived ? " disabled" : "";
        const actionDisabled = stopping || sessionHandoff || archived || (!working && !draft.reply.trim() && !draft.replyAttachments.length) ? " disabled" : "";
        const actionLabel = t(stopping ? "正在停止…" : working ? "停止任务" : "发送");
        const attachments = attachmentList(draft.replyAttachments, "reply");
        const attachButton = '<button class="better-codex-composer-attach" type="button" data-conversation-attach aria-label="' + te("添加附件") + '" title="' + te("添加附件") + '"' + inputDisabled + '>' + icon("plus", "", "1.9") + '</button>';
        return '<div class="better-codex-composer" data-state="' + mode + '">' + attachments + '<textarea name="reply" rows="2" placeholder="' + te(archived ? "取消归档后继续对话" : sessionHandoff ? "请前往会话继续对话" : "输入下一步要求…") + '" aria-label="' + te("回复") + '"' + inputDisabled + '>' + escapeHtml(draft.reply) + '</textarea><div class="better-codex-composer-toolbar">' + attachButton + '<button class="better-codex-composer-send" type="button" data-conversation-send data-composer-mode="' + mode + '" aria-label="' + escapeHtml(actionLabel) + '" title="' + escapeHtml(actionLabel) + '"' + actionDisabled + '>' + icon(working ? "stop" : "send", "", working ? "2.5" : "2") + '</button></div></div>';
      }

      function replyFailureMessage(error, action) {
        const value = String(error || "request_failed").toLowerCase();
        if (action === "load") {
          if (value.includes("timeout") || value.includes("timed out") || value.includes("deadline")) return "会话加载超时。请确认 Better Codex Runtime 正在运行，然后重新加载。";
          if (["permission", "eacces", "eperm", "forbidden", "unauthorized", "401", "403", "approval"].some(marker => value.includes(marker))) return "没有权限加载会话。请调整权限后重新加载。";
          return "无法加载会话。请检查网络和 Better Codex Runtime，然后重新加载。";
        }
        if (value.includes("timeout") || value.includes("timed out") || value.includes("deadline")) return "回复等待超时。请检查模型服务连接后重试。";
        if (["reply_network_error", "apiconnectionerror", "network", "fetch", "econn", "enotfound", "dns", "socket", "relay_stream", "runtime_bridge_unavailable"].some(marker => value.includes(marker))) return "网络连接异常，回复未完成。请检查网络和 Better Codex Runtime 后重试。";
        if (["reply_permission_denied", "permission", "eacces", "eperm", "forbidden", "unauthorized", "401", "403", "approval"].some(marker => value.includes(marker))) return "当前权限不足，无法完成回复。请调整智能体权限或允许所需操作后重试。";
        if (value.includes("runtime_stopped")) return "Better Codex Runtime 已停止。请重新启动后重试。";
        if (value.includes("reply_busy")) return "上一条回复仍在进行中。请稍后重新加载。";
        return "回复未完成。请打开完整会话查看详情，然后重试。";
      }

      function showConversationFailure(error, action = "reply", message = "") {
        const feedback = dialog.querySelector("[data-conversation-feedback]");
        if (!feedback) return;
        const failure = error instanceof Error ? error : new Error(String(error || "request_failed"));
        const failureKey = action + ":" + failure.message;
        if (failureKey !== conversationFailureKey) reportGlobalError(failure, { source: "conversation", action });
        conversationFailureKey = failureKey;
        conversationFailureState = "failed";
        if (message) lastReplyMessage = message;
        feedback.innerHTML = '<span>' + te(replyFailureMessage(failure.message, action)) + '</span><button type="button" data-conversation-retry="' + action + '">' + te(action === "load" ? "重新加载" : "重试回复") + '</button>';
        feedback.hidden = false;
        syncConversationStatus("failed");
        feedback.querySelector("[data-conversation-retry]")?.addEventListener("click", event => {
          if (event.currentTarget.dataset.conversationRetry === "load") void loadConversation();
          else {
            const retryRequestId = lastReplyStatus === "interrupted" ? "" : lastReplyRequestId;
            void sendReply(lastReplyMessage, retryRequestId);
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

      function conversationBubbles(messages, profile = null) {
        const agent = state.agents.find(item => item.id === issue?.agent_id) || state.agents.find(item => item.is_default) || null;
        const agentName = agent ? agentDisplayName(agent) : (issue?.agent_enabled ? "Codex" : t("智能体"));
        const user = profile && profile.name ? profile : state.user || { name: t("你"), initials: t("你"), color: "#16a34a" };
        if (profile && profile.name) state.user = { ...state.user, ...profile };
        return (messages || []).map((message, index) => {
          const isUser = message.role === "user";
          const avatar = isUser
            ? '<span class="better-codex-bubble-avatar is-user is-initials" style="background:' + escapeHtml(user.color || "#16a34a") + '" title="' + escapeHtml(user.handle ? "@" + user.handle : user.name || "") + '" aria-hidden="true">' + escapeHtml(user.initials || t("你")) + '</span>'
            : agentAvatarMarkup(agent, "better-codex-bubble-avatar");
          const name = isUser ? (user.name || t("你")) : agentName;
          const time = relativeTime(message.timestamp);
          return '<article class="better-codex-bubble ' + (isUser ? "is-user" : "is-agent") + '">' + avatar + '<div class="better-codex-bubble-main"><button class="better-codex-bubble-copy" type="button" data-conversation-copy="' + index + '" aria-label="' + te("复制消息") + '" title="' + te("复制消息") + '">' + icon("copy") + '</button><div class="better-codex-bubble-meta"><strong>' + escapeHtml(name) + '</strong>' + (time ? '<time datetime="' + escapeHtml(message.timestamp || "") + '">' + escapeHtml(time) + '</time>' : "") + '</div><div class="better-codex-bubble-content">' + (message.html || renderPlainBubble(message.markdown || "")) + '</div></div></article>';
        }).join("");
      }

      function renderPlainBubble(value) {
        return '<p>' + escapeHtml(value).replace(/\\n/g, "<br>") + '</p>';
      }

      function applyConversation(data, options = {}) {
        const body = dialog.querySelector("[data-conversation-body]");
        const status = dialog.querySelector("[data-conversation-status]");
        const send = dialog.querySelector("[data-conversation-send]");
        if (!body || !status) return;
        if (data?.user && typeof data.user === "object") state.user = { ...state.user, ...data.user };
        const messages = Array.isArray(data?.messages) ? data.messages : [];
        const previousScrollTop = body.scrollTop;
        const stickToBottom = body.scrollHeight - body.scrollTop - body.clientHeight < 48;
        if (messages.length) {
          conversationMessages = messages;
          body.innerHTML = conversationBubbles(messages, data.user);
          body.scrollTop = stickToBottom ? body.scrollHeight : previousScrollTop;
        } else if (data?.html) {
          conversationMessages = [{ role: "agent", html: data.html, markdown: data.markdown || "", timestamp: null }];
          body.innerHTML = conversationBubbles(conversationMessages, data.user);
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
        if (!sessionHandoff && (stateName === "failed" || (stateName === "interrupted" && !expectedInterruption))) showConversationFailure(reply.error, "reply", reply.message);
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

      async function sendReply(retryMessage = "", retryRequestId = "") {
        const textarea = dialog.querySelector('[name="reply"]');
        const send = dialog.querySelector("[data-conversation-send]");
        const errorOutput = dialog.querySelector(".better-codex-dialog-error");
        const retrying = Boolean(retryMessage);
        const text = String(retryMessage || textarea?.value || "").trim();
        const requestId = retryRequestId || (globalThis.crypto?.randomUUID?.() || VERSION + "-reply-" + Date.now() + "-" + Math.random().toString(36).slice(2));
        if (sessionHandoff || !issue || !sessionId || (!text && !draft.replyAttachments.length) || !send || !errorOutput) return;
        stopReplyRecovery();
        send.disabled = true;
        errorOutput.hidden = true;
        clearConversationFailure();
        let message = text;
        let files = [];
        if (REMOTE || !retrying) {
          try {
            if (REMOTE) files = await remoteFiles(draft.replyAttachments);
            else {
              await uploadPastedImages(draft.replyAttachments);
              message = withAttachments(text, draft.replyAttachments);
            }
          } catch (error) {
            reportGlobalError(error, { source: "attachment_prepare", action: "reply" });
            errorOutput.textContent = t(error instanceof Error ? error.message : "图片保存失败");
            errorOutput.hidden = false;
            send.disabled = false;
            return;
          }
        }
        try {
          lastReplyStatus = "running";
          const reply = await api("/api/issues/" + encodeURIComponent(issue.id) + "/reply", { method: "POST", body: JSON.stringify({ message, request_id: requestId, files }), timeoutMs: files.length ? 120_000 : undefined });
          if (reply.initial_run) {
            await loadIssues();
            dialog.close();
            return;
          }
          lastReplyRequestId = reply.request_id || requestId;
          stopReplyRecovery();
          draft.reply = "";
          latestReplyDraft = "";
          draft.replyAttachments.forEach(releaseAttachment);
          draft.replyAttachments = [];
          if (textarea) textarea.value = "";
          const attachments = dialog.querySelector("[data-reply-attachments]");
          if (attachments) {
            attachments.innerHTML = "";
            attachments.hidden = true;
          }
          flushReplyDraft();
          persistReplyDraft("");
          await loadIssues().catch(() => {});
          applyConversation({ found: true, reply }, { preserveBody: true });
          conversationTimer = setTimeout(() => void loadConversation({ quiet: true }), 1500);
        } catch (error) {
          lastReplyRequestId = requestId;
          showConversationFailure(error, "reply", message);
          scheduleReplyRecovery(requestId, message);
          send.disabled = false;
        }
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
          reportGlobalError(error, { source: "issue_stop" });
          if (errorOutput) {
            errorOutput.textContent = errorLabel(error);
            errorOutput.hidden = false;
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
          reportGlobalError(error, { source: "issue_restore" });
          if (errorOutput) {
            errorOutput.textContent = errorLabel(error);
            errorOutput.hidden = false;
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
        const tagMarkup = option => (option.tags || []).map(tag => '<span class="better-codex-dialog-select-tag" data-tone="' + escapeHtml(tag.tone || "model") + '">' + escapeHtml(tag.value) + '</span>').join("");
        const labelMarkup = option => escapeHtml(option.label) + tagMarkup(option);
        const rows = options.map(option => '<button class="better-codex-dialog-select-option' + (option.value === current.value ? " is-selected" : "") + '" type="button" role="option" aria-selected="' + (option.value === current.value) + '" data-dialog-select-option="' + escapeHtml(name) + '" data-dialog-select-value="' + escapeHtml(option.value) + '"><span class="better-codex-dialog-select-option-visual">' + visual(option) + '</span><span>' + labelMarkup(option) + '</span><span class="better-codex-dialog-select-check">' + (option.value === current.value ? icon("check") : "") + '</span></button>').join("");
        return '<span class="better-codex-dialog-select ' + escapeHtml(modifier) + '" data-dialog-select="' + escapeHtml(name) + '"><input type="hidden" name="' + escapeHtml(name) + '" value="' + escapeHtml(current.value) + '"><button class="better-codex-property better-codex-dialog-select-trigger" type="button" role="combobox" aria-label="' + escapeHtml(ariaLabel) + '" aria-haspopup="listbox" aria-expanded="false" data-dialog-select-toggle="' + escapeHtml(name) + '"><span class="better-codex-dialog-select-trigger-visual">' + visual(current) + '</span><span class="better-codex-dialog-select-label" data-dialog-select-label>' + labelMarkup(current) + '</span>' + icon("chevron") + '</button><span class="better-codex-dialog-select-menu" role="listbox" hidden>' + rows + '</span></span>';
      }

      function agentPicker() {
        const selectedAgent = state.agents.find(agent => agent.id === draft.agentId);
        const options = state.agents.map(agent => ({
          value: agent.id,
          label: agentOptionLabel(agent, agent.name),
          tags: agentConfigTags(agent),
          visual: () => agentAvatarMarkup(agent, "better-codex-agent-avatar")
        }));
        return '<div class="better-codex-agent-picker"><span>' + te("指派给") + '</span>' + dialogSelect("agent_id", t("选择执行智能体"), selectedAgent?.id || draft.agentId, options, "is-agent") + '</div>';
      }

      function assigneePicker() {
        const defaultAgent = state.agents.find(agent => agent.is_default) || { name: "Codex", is_default: true, id: "" };
        const userVisual = () => '<span class="better-codex-agent-avatar is-user is-initials" style="background:' + escapeHtml(state.user.color || "#16a34a") + '">' + escapeHtml(state.user.initials || t("你")) + "</span>";
        const options = [
          { value: "none", label: t("未指派"), visual: () => icon("user") },
          { value: "user", label: state.user.name || t("我"), visual: userVisual },
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
        const block = t("附带文件：") + "\\n" + paths.map(path => "- " + path).join("\\n");
        return text ? text + "\\n\\n" + block : block;
      }

      function attachmentList(items = draft.attachments, scope = "issue") {
        const marker = scope === "reply" ? " data-reply-attachments" : " data-dialog-attachments";
        if (!items.length) return '<div class="better-codex-dialog-attachments"' + marker + ' hidden></div>';
        const chips = items.map((item, index) => '<span class="better-codex-attachment-chip' + (item.previewUrl ? ' is-image' : '') + '" title="' + escapeHtml(item.path || item.name) + '">' + (item.previewUrl ? '<img class="better-codex-attachment-preview" src="' + escapeHtml(item.previewUrl) + '" alt="" width="30" height="30">' : icon("paperclip")) + '<span>' + escapeHtml(item.name) + '</span><button type="button" data-dialog-detach="' + index + '" data-dialog-attachment-scope="' + scope + '" aria-label="' + te("移除附件") + '">' + icon("close") + '</button></span>').join("");
        return '<div class="better-codex-dialog-attachments"' + marker + '>' + chips + '</div>';
      }

      function pasteImages(event) {
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
            reportGlobalError(new Error(message), { source: "attachment_paste", action: replyPaste ? "reply" : issue ? "edit" : "create", file_count: files.length, total_bytes: files.reduce((sum, file) => sum + file.size, 0) });
            errorOutput.textContent = t(message);
            errorOutput.hidden = false;
          }
          return;
        }
        syncDraft();
        attachments.push(...accepted.map((file, index) => ({
          name: file.name || t("粘贴的图片") + (accepted.length > 1 ? " " + (index + 1) : ""),
          path: "",
          file,
          previewUrl: URL.createObjectURL(file)
        })));
        renderDialog();
        const active = activeName ? dialog.querySelector('[name="' + activeName + '"]') : null;
        active?.focus();
        if (active?.setSelectionRange && Number.isInteger(selectionStart) && Number.isInteger(selectionEnd)) active.setSelectionRange(selectionStart, selectionEnd);
      }

      function pickAttachments(existing = []) {
        return new Promise(resolve => {
          const input = document.createElement("input");
          input.type = "file";
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
              selected.push({ name: file.name || path.split(/[\\\\/]/).pop() || path || t("附件"), path, file: REMOTE ? file : null, previewUrl: REMOTE && file.type.startsWith("image/") ? URL.createObjectURL(file) : "" });
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
          const selectedAgent = state.agents.find(agent => agent.id === draft.agentId);
          const selectedName = selectedAgent?.name || "Codex";
          dialog.innerHTML = '<form>' + header() + agentPicker() + '<textarea class="better-codex-dialog-editor" name="prompt" placeholder="' + te("告诉智能体要做什么，例如：“修复项目里任务运行状态不可见的问题”") + '">' + escapeHtml(draft.prompt) + '</textarea>' + propertyRows() + attachmentList() + '<div class="better-codex-dialog-error" hidden></div>' + footer() + '</form>';
          dialog.querySelector(".better-codex-dialog-properties")?.insertAdjacentHTML("beforebegin", '<div class="better-codex-run-hint">' + agentAvatarMarkup(selectedAgent, "better-codex-agent-avatar") + '<span>' + te("创建后先由 " + selectedName + " 整理卡片，再自动开始工作。") + '</span></div>');
        } else if (issue) {
          const descriptionEditor = '<div class="better-codex-description-field"><textarea class="better-codex-dialog-editor" name="description" placeholder="' + te("添加描述...") + '" rows="3">' + escapeHtml(draft.description) + '</textarea><button class="better-codex-description-toggle" type="button" data-description-toggle hidden></button></div>';
          dialog.innerHTML = '<form>' + header() + assigneePicker() + '<input class="better-codex-manual-title" name="title" maxlength="500" placeholder="' + te("任务标题") + '" value="' + escapeHtml(draft.title) + '">' + descriptionEditor + conversationPanel() + propertyRows() + attachmentList() + '<div class="better-codex-dialog-error" hidden></div>' + footer() + '</form>';
        } else {
          dialog.innerHTML = '<form>' + header() + assigneePicker() + '<input class="better-codex-manual-title" name="title" maxlength="500" placeholder="' + te("任务标题") + '" value="' + escapeHtml(draft.title) + '"><textarea class="better-codex-dialog-editor" name="description" placeholder="' + te("添加描述...") + '">' + escapeHtml(draft.description) + '</textarea>' + propertyRows() + attachmentList() + '<div class="better-codex-dialog-error" hidden></div>' + footer() + '</form>';
        }
        const content = dialog.querySelector(draft.mode === "agent" ? '[name="prompt"]' : '[name="title"]');
        applyDialogPermissions();
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
          dirtyDraftFields.add(draft.mode === "agent" ? "prompt" : "title");
          updateSubmitState();
        });
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
        replyInput?.addEventListener("input", () => {
          draft.reply = replyInput.value;
          scheduleReplyDraft(replyInput.value);
          updateReplySendState();
        });
        replyInput?.addEventListener("blur", flushReplyDraft);
        sendButton?.addEventListener("click", event => {
          const button = event.currentTarget;
          if (button.dataset.composerMode === "stop") void stopIssueFromDialog(button);
          else if (button.dataset.composerMode === "send") void sendReply();
        });
        dialog.querySelector("[data-conversation-body]")?.addEventListener("click", async event => {
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
          void pickAttachments(draft.replyAttachments).then(result => {
            const errorOutput = dialog.querySelector(".better-codex-dialog-error");
            const showAttachError = message => {
              if (!errorOutput) return;
              reportGlobalError(new Error(message), { source: "attachment_picker", action: "reply" });
              errorOutput.textContent = t(message);
              errorOutput.hidden = false;
            };
            if (!result.picked) return;
            if (!result.files.length) return showAttachError(REMOTE ? "最多传输 4 个文件且总大小不能超过 20 MB" : "当前环境无法读取本地文件路径");
            const known = new Set(draft.replyAttachments.map(file => file.path || file.name + ":" + (file.file?.size || 0)));
            const next = result.files.filter(file => !known.has(file.path || file.name + ":" + (file.file?.size || 0)));
            if (next.length) {
              draft.replyAttachments.push(...next);
              renderDialog();
            }
            if (result.skipped) showAttachError(REMOTE ? "部分文件超出传输限制，已跳过" : "部分文件无法读取本地路径，已跳过");
            dialog.querySelector('[name="reply"]')?.focus();
          });
        });
        replyInput?.addEventListener("keydown", event => {
          if (isSendKeyboardEvent(event)) {
            event.preventDefault();
            if (sendButton?.dataset.composerMode === "send") void sendReply();
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
            if (name === "assignee") persistCompletedIssuePatch(value === "user"
              ? { user_assigned: true, agent_enabled: false, agent_id: "" }
              : value === "none"
                ? { user_assigned: false, agent_enabled: false, agent_id: "" }
                : { user_assigned: false, agent_enabled: true, agent_id: value === "codex" ? "" : value });
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
          if (!issue) localStorage.setItem(CREATE_DIALOG_EXPANDED_KEY, String(draft.expanded));
          if (issue && draft.expanded) syncIssueFullscreenBounds();
          dialog.dataset.expanded = String(draft.expanded);
          if (issue && !draft.expanded) clearIssueFullscreenBounds();
          const button = dialog.querySelector("[data-dialog-expand]");
          button?.setAttribute("aria-label", t(draft.expanded ? (issue ? "退出全屏" : "缩小") : "展开"));
          if (button) button.innerHTML = icon(draft.expanded ? "shrink" : "expand");
        };
        dialog.querySelector("[data-dialog-back]")?.addEventListener("click", () => dialog.close());
        dialog.querySelector("[data-dialog-expand]")?.addEventListener("click", () => {
          setDialogExpanded(!draft.expanded);
        });
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
          renderDialog();
          dialog.querySelector(draft.mode === "agent" ? '[name="prompt"]' : '[name="title"]')?.focus();
        });
        dialog.querySelector("[data-dialog-attach]")?.addEventListener("click", () => {
          void pickAttachments(draft.attachments).then(result => {
            const showAttachError = message => {
              const errorOutput = dialog.querySelector(".better-codex-dialog-error");
              if (!errorOutput) return;
              reportGlobalError(new Error(message), { source: "attachment_picker", action: issue ? "edit" : "create" });
              errorOutput.textContent = t(message);
              errorOutput.hidden = false;
            };
            if (!result.picked) return;
            if (!result.files.length) return showAttachError(REMOTE ? "最多传输 4 个文件且总大小不能超过 20 MB" : "当前环境无法读取本地文件路径");
            const known = new Set(draft.attachments.map(file => file.path || file.name + ":" + (file.file?.size || 0)));
            const next = result.files.filter(file => !known.has(file.path || file.name + ":" + (file.file?.size || 0)));
            if (next.length) {
              draft.attachments.push(...next);
              renderDialog();
            }
            if (result.skipped) showAttachError(REMOTE ? "部分文件超出传输限制，已跳过" : "部分文件无法读取本地路径，已跳过");
            dialog.querySelector(draft.mode === "agent" ? '[name="prompt"]' : '[name="title"]')?.focus();
          });
        });
        dialog.querySelectorAll("[data-dialog-detach]").forEach(button => button.addEventListener("click", event => {
          event.preventDefault();
          const index = Number(button.dataset.dialogDetach);
          if (!Number.isInteger(index) || index < 0) return;
          const scope = button.dataset.dialogAttachmentScope;
          const attachments = scope === "reply" ? draft.replyAttachments : draft.attachments;
          const [removed] = attachments.splice(index, 1);
          if (removed) releaseAttachment(removed);
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
        const title = draft.mode === "agent" ? prompt.split(/\\n/).find(line => line.trim())?.replace(/^[#*\\s-]+/, "").trim().slice(0, 120) || "" : draft.title.trim();
        if (!title) return;
        submitInFlight = true;
        submit.disabled = true;
        errorOutput.hidden = true;
        traceDialog("dialog_submit_start", { action: issue ? "update_issue" : "create_issue" });
        try {
          const assignee = draft.mode === "agent"
            ? { user_assigned: false, agent_enabled: true, agent_id: draft.agentId || "" }
            : draft.assignee === "user"
              ? { user_assigned: true, agent_enabled: false, agent_id: "" }
              : draft.assignee === "none"
                ? { user_assigned: false, agent_enabled: false, agent_id: "" }
                : { user_assigned: false, agent_enabled: true, agent_id: draft.assignee === "codex" ? "" : draft.assignee };
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
          if (REMOTE) files = await remoteFiles(draft.attachments);
          else await uploadPastedImages();
          const body = {
            project_id: draft.projectId,
            title,
            description: REMOTE ? (draft.mode === "agent" ? prompt : draft.description) : withAttachments(draft.mode === "agent" ? prompt : draft.description),
            status: draft.mode === "agent" && !issue ? "todo" : draft.status,
            priority: draft.priority,
            labels: draft.labels.split(/[,，]/).map(value => value.trim()).filter(Boolean),
            workspace_path: workspacePath,
            ai_enrich: draft.mode === "agent" && !issue,
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
          reportGlobalError(error, { source: "issue_dialog_submit", action: issue ? "update" : "create" });
          errorOutput.textContent = t(error instanceof Error ? error.message : "创建失败");
          errorOutput.hidden = false;
          submitInFlight = false;
          submit.disabled = false;
        }
      }

      async function startIssueNow() {
        if (!issue || editingLocked || !issue.agent_enabled || (dirtyDraftFields.has("assignee") && ["none", "user"].includes(draft.assignee))) return;
        const button = dialog.querySelector("[data-dialog-start-now]");
        const errorOutput = dialog.querySelector(".better-codex-dialog-error");
        if (!button || !errorOutput) return;
        button.disabled = true;
        errorOutput.hidden = true;
        try {
          const current = await api("/api/issues/" + encodeURIComponent(issue.id));
          if (current.archived_at || !current.agent_enabled || (dirtyDraftFields.has("assignee") && ["none", "user"].includes(draft.assignee)) || current.active_run_status || issueSessionId(current) || current.enrichment_status === "pending" || current.status === "done") {
            refreshIssueState(current);
            throw new Error("issue_not_startable");
          }
          const agentId = dirtyDraftFields.has("assignee")
            ? draft.assignee && !["none", "user", "codex"].includes(draft.assignee) ? draft.assignee : ""
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
          reportGlobalError(error, { source: "issue_start" });
          errorOutput.textContent = t(error instanceof Error ? error.message : "启动失败");
          errorOutput.hidden = false;
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
      dialog.showModal();
      mobileDialogViewport();
      if (issue && panel && typeof ResizeObserver === "function") {
        dialogBoundsObserver = new ResizeObserver(syncIssueFullscreenBounds);
        dialogBoundsObserver.observe(panel);
      }
      window.visualViewport?.addEventListener("resize", mobileDialogViewport, { passive: true });
      window.visualViewport?.addEventListener("scroll", mobileDialogViewport, { passive: true });
      window.addEventListener("resize", mobileDialogViewport, { passive: true });
      traceDialog("dialog_open", { dialog_open: dialog.open });
      dialog.querySelector(HOST_KIND === "web" && window.matchMedia("(max-width: 720px)").matches ? "[data-dialog-close]" : draft.mode === "agent" ? '[name="prompt"]' : '[name="title"]')?.focus();
      if (issue && sessionId) requestAnimationFrame(() => void loadConversation());
    }

    function onBoardClick(event) {
      if (Date.now() < suppressIssueClickUntil) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      const archiveOpen = event.target.closest("[data-archive-open]");
      if (archiveOpen) return void openArchiveDialog();
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
      return String(attribute || row.getAttribute("aria-label") || row.querySelector(SELECTORS.truncatedText)?.textContent || row.textContent || "").replace(/\\s+/g, " ").trim();
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

    function isBetterCodexRoute() {
      if (HOST_KIND === "web") return location.pathname === "/web" || location.pathname === "/" || Boolean(webProjectRoute());
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
      if (!startLiveUpdates() && pollTimer === null) pollTimer = setInterval(() => { if (!document.hidden && active && !panel?.dataset.recovery) void perform(() => loadSurface({ background: true })); }, 3000);
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
      const match = location.pathname.match(/\\/local\\/([^/?#]+)/);
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
      if (!target || target === entry || target === agentsEntry || target === projectsEntry || target === moreEntry || target.closest("#" + PANEL_ID) || target.closest("#better-codex-dialog") || target.closest("#better-codex-agent-dialog") || target.closest("#better-codex-project-dialog") || target.closest("#better-codex-avatar-picker")) return;
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
      if (HOST_KIND === "web" && !hasFeature("project-management") && /^\\/web\\/projects(?:\\/|$)/.test(location.pathname)) history.replaceState({ betterCodex: true, betterCodexSurface: "issues" }, "", "/web");
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
      document.removeEventListener("DOMContentLoaded", mount);
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("pointerdown", onSessionPointerDown, true);
      document.removeEventListener("pointermove", onSessionPointerMove, true);
      document.removeEventListener("pointerup", onSessionPointerUp, true);
      document.removeEventListener("pointercancel", onSessionPointerCancel, true);
      document.removeEventListener("keydown", onGlobalShortcut, true);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("codex-message-from-view", onHostMessageFromView, true);
      window.removeEventListener("message", onAppServerMessage, true);
      window.removeEventListener("error", onWindowError);
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
      window.removeEventListener("better-codex:error", onExternalError);
      close();
      document.querySelectorAll('[' + OWNED + '="true"]').forEach(node => node.remove());
      ["light", "dark"].forEach(mode => ["canvas", "ink", "accent", "surface", "control", "raised", "hover", "pressed", "hairline"].forEach(token => document.documentElement.style.removeProperty("--bc-host-" + mode + "-" + token)));
      delete window.__betterCodexBridgeResolve;
      delete window.__betterCodexInjection__;
      errorDialog = null;
    }

    function mount() {
      document.removeEventListener("DOMContentLoaded", mount);
      if (destroyed || observer || !document.documentElement) return;
      observer = new MutationObserver(scheduleRefresh);
      observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ["data-theme", "aria-current", ATTRIBUTES.threadActive] });
      startLiveUpdates();
      refresh();
      void checkUpdateNotice();
      updateTimer = setInterval(() => { if (!document.hidden) void checkUpdateNotice(); }, 15000);
    }

    window.__betterCodexInjection__ = { version: VERSION, profile: PROFILE, host: HOST_KIND, endpoint: BASE_URL, refresh, pulse: () => true, open: openRoute, openThread, close, destroy, reportError: reportGlobalError };
    document.addEventListener("click", onClick, true);
    document.addEventListener("pointerdown", onSessionPointerDown, true);
    document.addEventListener("pointermove", onSessionPointerMove, true);
    document.addEventListener("pointerup", onSessionPointerUp, true);
    document.addEventListener("pointercancel", onSessionPointerCancel, true);
    document.addEventListener("keydown", onGlobalShortcut, true);
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("codex-message-from-view", onHostMessageFromView, true);
    window.addEventListener("message", onAppServerMessage, true);
    window.addEventListener("error", onWindowError);
    window.addEventListener("unhandledrejection", onUnhandledRejection);
    window.addEventListener("better-codex:error", onExternalError);
    if (document.documentElement) mount();
    else document.addEventListener("DOMContentLoaded", mount, { once: true });
    return { installed: true, reused: false };
  })()`;
}
