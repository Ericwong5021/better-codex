import { activeCompatibility } from "./compatibility.js";
import { betterCodexDesignSystemCss } from "./design-system.js";
import {
  ArrowLeftRight,
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
  CircleX,
  Columns3,
  Database,
  Ellipsis,
  FileCode2,
  FlaskConical,
  Folder,
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
  ShieldCheck,
  SignalHigh,
  SignalLow,
  SignalMedium,
  SlidersHorizontal,
  Sparkles,
  SquareKanban,
  Tag,
  Terminal,
  Trash2,
  User,
  UserRoundPen,
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
  more: Ellipsis,
  filter: ListFilter,
  display: SlidersHorizontal,
  board: Columns3,
  switch: ArrowLeftRight,
  expand: Maximize2,
  shrink: Minimize2,
  close: X,
  paperclip: Paperclip,
  folder: Folder,
  tag: Tag,
  calendar: Calendar,
  user: User,
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
  database: Database,
  sparkles: Sparkles,
  edit: Pencil,
  chevron: ChevronRight,
  chevronDown: ChevronDown,
  check: Check,
  circle: Circle,
  help: CircleHelp,
  dash: Minus,
  trash: Trash2,
  refresh: RefreshCw,
  issues: SquareKanban,
  statusBacklog: CircleDashed,
  statusTodo: Circle,
  statusInProgress: LoaderCircle,
  statusInReview: CircleDot,
  statusDone: CircleCheckBig,
  statusBlocked: CircleSlash2,
  statusCancelled: CircleX,
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

export function injectionScript(port: number, accessToken: string, action: "install" | "uninstall", locale: "zh-CN" | "en" = "zh-CN") {
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
    const INITIAL_LOCALE = ${JSON.stringify(locale)};
    const SELECTORS = ${JSON.stringify(compatibility.selectors)};
    const ATTRIBUTES = ${JSON.stringify(compatibility.attributes)};
    const NAVIGATION = ${JSON.stringify(compatibility.navigation)};
    const LUCIDE_ICONS = ${JSON.stringify(lucideIcons)};
    const AGENT_AVATAR_PRESETS = ${JSON.stringify(agentAvatarPresets)};
    const RESUME_SURFACE_KEY = "better-codex-resume-surface";
    const PROJECT_KEY = "better-codex-project-id";
    const THREAD_OPEN_TIMEOUT_MS = 10000;
    const THREAD_OPEN_POLL_MS = 100;
    const statusLabels = { backlog: "待规划", todo: "待办", in_progress: "进行中", in_review: "审核中", done: "已完成", blocked: "已阻塞", cancelled: "已取消" };
    const priorityLabels = { none: "无", low: "低", medium: "中", high: "高", urgent: "紧急" };
    const rememberedSurface = sessionStorage.getItem(RESUME_SURFACE_KEY);
    const rememberedProjectId = localStorage.getItem(PROJECT_KEY) || "";
    const state = { projects: [], issues: [], agents: [], agentModelCatalog: [], agentModels: [], agentReasoningEfforts: [], user: { id: "", name: "你", email: "", handle: "", initials: "你", color: "#16a34a" }, projectId: "", search: "", agentSearch: "", agentView: "all", agentPane: "preview", selectedAgentId: "", agentDraft: null, surface: ["issues", "agents"].includes(rememberedSurface) ? rememberedSurface : "issues", view: "all", autoDispatch: false, createMode: "manual", keepCreate: false, selected: null, error: "", locale: INITIAL_LOCALE === "zh-CN" ? "zh-CN" : "en", filters: { status: [], priority: [], date: [], assignee: [], creator: [], project: [], label: [] } };
    const englishText = {
      "任务看板": "Task board", "打开任务看板": "Open task board", "智能体": "Agents", "管理智能体": "Manage agents",
      "全部": "All", "已分配": "Assigned", "未分配": "Unassigned", "待规划": "Backlog", "待办": "Todo", "进行中": "In progress", "审核中": "In review", "已完成": "Done", "已阻塞": "Blocked", "已取消": "Canceled",
      "无": "None", "低": "Low", "中": "Medium", "高": "High", "紧急": "Urgent", "超高": "Urgent", "无优先级": "No priority", "优先级": "Priority", "状态": "Status", "日期": "Date", "筛选": "Filter", "标签": "Labels",
      "新建": "New", "新建 issue": "New issue", "新建任务": "New task", "新建智能体": "New agent", "创建": "Create", "创建任务": "Create task", "删除": "Delete", "删除任务": "Delete task", "删除智能体": "Delete agent", "保存": "Save", "确认": "Confirm", "取消": "Cancel", "关闭": "Close", "重试": "Retry", "稍后": "Later", "展开": "Expand", "缩小": "Minimize", "缩放头像": "Zoom avatar",
      "项目": "Project", "无项目": "No project", "选择项目": "Select project", "选择责任人": "Select owner", "选择执行智能体": "Select agent", "选择 issue 创建方式": "Choose how to create the issue", "任务标题": "Task title", "添加描述...": "Add description...", "添加标签": "Add label", "添加附件": "Add attachment", "移除附件": "Remove attachment", "搜索任务": "Search tasks", "搜索项目": "Search projects", "搜索项目...": "Search projects...", "搜索智能体": "Search agents",
      "负责人": "Owner", "创建者": "Creator", "指定负责人": "Assign owner", "由我创建": "Created by me", "由我": "By me", "我": "Me", "你": "You", "未指派": "Not assigned", "未提供": "Not provided", "已同步": "Synced",
      "自动运行": "Auto-run", "手动运行": "Manual run", "切换为自动运行": "Switch to auto-run", "切换为手动运行": "Switch to manual run", "切换到智能体": "Switch to agents", "手动创建": "Manual creation", "通过智能体创建": "Create with agent", "运行模式说明": "Run mode", "最大并发": "Max concurrency", "模型": "Model", "推理": "Reasoning", "默认": "Default", "自定义": "Custom",
      "代码审查": "Code review", "问题排查": "Troubleshooting", "前端实现": "Frontend implementation", "文档写作": "Documentation", "创意探索": "Creative exploration", "终端工程": "Terminal engineering", "通用助手": "General assistant", "修复工具": "Fixer", "安全审查": "Security review", "测试验证": "Test verification", "插件": "Plugins", "数据与存储": "Data and storage", "检查改动的正确性、回归风险和可维护性": "Review changes for correctness, regression risk, and maintainability", "负责 Codex 原生风格的界面实现与视觉验证": "Build and visually verify interfaces in the native Codex style", "定位崩溃、回归和异常行为的根因": "Find the root cause of crashes, regressions, and unexpected behavior",
      "选择头像": "Choose avatar", "预设头像": "Preset avatars", "自定义": "Custom", "更换": "Change", "保存失败": "Save failed", "创建失败": "Creation failed", "加载失败": "Loading failed", "启动失败": "Start failed", "发送失败": "Send failed", "回复失败": "Reply failed", "回复": "Reply", "回复中": "Replying", "回复完成": "Reply completed", "回复进行中…": "Replying…", "回复已完成": "Reply completed", "等待对话": "Waiting for conversation", "加载中…": "Loading…", "加载对话…": "Loading conversation…", "正在打开…": "Opening…", "在对话中打开": "Open in conversation", "在此回复智能体…": "Reply to the agent here…", "对话": "Conversation", "详情": "Details", "关闭详情": "Close details", "Issue 详情": "Issue details", "名称": "Name", "介绍": "Description", "智能体名称": "Agent name", "尚未添加介绍": "No description yet", "没有匹配的智能体": "No matching agents", "此分类暂无智能体": "No agents in this category",
      "裁剪头像": "Crop avatar", "拖动图片调整位置": "Drag the image to adjust its position", "正在更新": "Updating", "正在更新 Better Codex": "Updating Better Codex", "更新完成": "Update complete", "更新未完成": "Update incomplete", "稍后提醒": "Remind me later", "Better Codex 有新版本": "A new Better Codex version is available", "Better Codex 已是最新版本": "Better Codex is up to date", "Better Codex 保持当前版本运行。": "Better Codex will continue running on the current version.", "正在下载并校验新版本，请不要关闭 Codex。": "Downloading and verifying the update. Please do not close Codex.", "正在重启 Codex，稍后会自动恢复。": "Restarting Codex. It will resume shortly.", "刚刚完成检查，无需更新。": "Just checked. No update is needed.", "部分文件无法读取本地路径，已跳过": "Some files could not be read locally and were skipped", "当前环境无法读取本地文件路径": "The current environment cannot read local file paths", "无关联对话。": "No linked conversation.", "暂无对话，可在下方回复或打开完整对话。": "No conversation yet. Reply below or open the full conversation.", "图片不能超过 10 MB": "Images must be 10 MB or smaller", "请选择 PNG、JPEG 或 WebP 图片": "Choose a PNG, JPEG, or WebP image", "无法读取这张图片": "Unable to read this image", "创建智能体 Issue 需要本地工作区：请先打开该项目下的一个 Codex 会话": "Creating an agent issue requires a local workspace. Open a Codex conversation in this project first.",
      "创建任务": "Create task", "添加描述": "Add description", "新建 issue": "New issue", "项目": "Project", "状态": "Status", "优先级": "Priority", "选择项目": "Select project", "保存": "Save", "删除": "Delete",
      "对话链接无效。": "The conversation link is invalid.", "对话仍在加载，请稍后重试。": "The conversation is still loading. Try again shortly.", "当前为手动运行，请先点击“立即开始任务”。": "Manual run is enabled. Click “Start task now” first.", "待规划中的 Issue 不会自动触发任务，请先移出待规划区。": "Issues in Backlog do not trigger tasks automatically. Move it out of Backlog first.", "当前没有运行中的任务": "No agents are currently working", "查看运行中的任务": "View running tasks", "暂无任务": "No tasks", "未分配": "Unassigned", "已分配": "Assigned", "新建任务": "New task", "新建智能体": "New agent", "运行模式说明": "Run mode", "手动运行时，只有点击“立即开始任务”才会触发智能体任务。": "In manual mode, agent tasks start only after you click “Start task now”.", "自动运行时，只要 Issue 不在「待规划」区，你发送的新消息都会触发任务；「待规划」里的 Issue 不会自动触发。": "In auto-run mode, new messages trigger tasks unless the Issue is in Backlog; Issues in Backlog do not trigger tasks automatically.", "未关联对话。": "No linked conversation.",
      "确定删除任务 “": "Delete task “", "吗？": "”?", "创建后先由 ": "After creation, ", " 整理卡片，再自动开始工作。": " will organize the card and start working automatically.", "刚刚": "Just now", "分钟": "minutes", "小时": "hours", "天": "days", "更新于": "Updated", "个筛选": "filters", "个智能体工作中": "agents working", "条": "items"
    };
    const bridgeRequests = new Map();
    let bridgeSequence = 0;
    let entry = null;
    let agentsEntry = null;
    let panel = null;
    let observer = null;
    let refreshPending = false;
    let pollTimer = null;
    let updateTimer = null;
    let updateNotice = null;
    let dismissedUpdateVersion = sessionStorage.getItem("better-codex-dismissed-update") || "";
    let filterDismiss = null;
    let createMenuDismiss = null;
    let issueMenu = null;
    let issueMenuDismiss = null;
    let avatarPickerClose = null;
    let suppressAgentOutside = false;
    let draggingIssueId = "";
    let draggingGhost = null;
    let draggingGhostOffsetX = 0;
    let draggingGhostOffsetY = 0;
    let codexLogoSequence = 0;
    let active = false;
    let destroyed = false;

    function label(value) {
      return String(value || "").replace(/\\s+/g, " ").trim().toLowerCase();
    }

    function escapeHtml(value) {
      return String(value ?? "").replace(/[&<>\"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\\\"": "&quot;", "'": "&#39;" })[character]);
    }

    function translateText(value) {
      const source = String(value ?? "");
      if (state.locale === "zh-CN" || !/[\\p{Script=Han}]/u.test(source)) return source;
      const leading = source.match(/^\\s*/)?.[0] || "";
      const trailing = source.match(/\\s*$/)?.[0] || "";
      const core = source.slice(leading.length, source.length - trailing.length || undefined);
      if (englishText[core]) return leading + englishText[core] + trailing;
      let match = core.match(/^(\\d+) 个智能体工作中$/);
      if (match) return leading + match[1] + " agents working" + trailing;
      match = core.match(/^(\\d+) 个筛选$/);
      if (match) return leading + match[1] + " filters" + trailing;
      match = core.match(/^更新于 (.+)$/);
      if (match) return leading + "Updated " + match[1] + trailing;
      match = core.match(/^(\\d+) 分钟前$/);
      if (match) return leading + match[1] + " minutes ago" + trailing;
      match = core.match(/^(\\d+) 小时前$/);
      if (match) return leading + match[1] + " hours ago" + trailing;
      match = core.match(/^(\\d+) 天前$/);
      if (match) return leading + match[1] + " days ago" + trailing;
      match = core.match(/^确定删除任务 “(.+)” 吗？$/);
      if (match) return leading + "Delete task “" + match[1] + "”?" + trailing;
      match = core.match(/^创建后先由 (.+) 整理卡片，再自动开始工作。$/);
      if (match) return leading + "After creation, " + match[1] + " will organize the card and start working automatically." + trailing;
      match = core.match(/^(.+) · 点击刷新重试$/);
      if (match) return leading + match[1] + " · Click to retry" + trailing;
      match = core.match(/^v(.+) 已可用，更新完成后将自动重启 Codex。$/);
      if (match) return leading + "v" + match[1] + " is available. Codex will restart automatically after the update." + trailing;
      match = core.match(/^更换 (.+) 的头像$/);
      if (match) return leading + "Change " + match[1] + "'s avatar" + trailing;
      return source;
    }

    function localizeOwnedTree(root) {
      if (!root || state.locale === "zh-CN") return;
      const isOwned = node => node?.nodeType === 1 && (node.matches?.("[" + OWNED + '=\"true\"]') || node.closest?.("[" + OWNED + '=\"true\"]'));
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      const textNodes = [];
      while (walker.nextNode()) textNodes.push(walker.currentNode);
      for (const node of textNodes) {
        if (!isOwned(node.parentElement)) continue;
        const translated = translateText(node.nodeValue);
        if (translated !== node.nodeValue) node.nodeValue = translated;
      }
      const descendants = root.querySelectorAll ? Array.from(root.querySelectorAll("*")) : [];
      const elements = root.nodeType === 1 ? [root, ...descendants] : descendants;
      for (const element of elements) {
        if (!isOwned(element)) continue;
        for (const attribute of ["aria-label", "title", "placeholder"]) {
          if (!element.hasAttribute(attribute)) continue;
          const value = element.getAttribute(attribute);
          const translated = translateText(value);
          if (translated !== value) element.setAttribute(attribute, translated);
        }
      }
    }

    function normalizeSessionId(value) {
      const id = String(value || "").replace(/^(local|cloud):/i, "");
      return /^[a-f0-9-]{36}$/i.test(id) ? id : "";
    }

    function issueSessionId(issue) {
      return normalizeSessionId(issue?.run_thread_id) || "";
    }

    async function resolveWorkspacePath(context) {
      const fromUrl = String(context?.workspacePath || "").trim();
      if (fromUrl) return fromUrl;
      const threadId = normalizeSessionId(context?.threadId);
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
        #\${ENTRY_ID}[aria-current="page"], #\${AGENTS_ENTRY_ID}[aria-current="page"] { background: var(--color-background-primary-soft-active, var(--color-token-list-hover-background, color-mix(in srgb, currentColor 8%, transparent))); }
        html[data-better-codex-open="true"] \${SELECTORS.sidebarNavigation} [aria-current="page"]:not(#\${ENTRY_ID}):not(#\${AGENTS_ENTRY_ID}) { background: transparent !important; }
        html[data-better-codex-open="true"] \${SELECTORS.sidebarNavigation} [aria-current="page"]:not(#\${ENTRY_ID}):not(#\${AGENTS_ENTRY_ID}) .text-token-list-active-selection-foreground { color: var(--color-token-foreground) !important; }
        [\${HOST}="true"] { position: relative !important; z-index: 31 !important; pointer-events: none !important; }
        [\${HIDDEN}="true"] { visibility: hidden !important; pointer-events: none !important; }
        html { --bc-page: oklch(.988087 0 0); --bc-surface: oklch(1 0 0); --bc-raised: oklch(1 0 0); --bc-hover: oklch(.967 .001 286.375); --bc-selected: oklch(.95 .002 286.375); --bc-foreground: oklch(.141 .005 285.823); --bc-muted: oklch(.505 .016 285.938); --bc-faint: oklch(.606 .016 285.938); --bc-border: oklch(.92 .004 286.32); --bc-divider: oklch(.945 .003 286.32); --bc-input: oklch(.92 .004 286.32); --bc-ring: oklch(.705 .015 286.067); --bc-primary: oklch(.21 .006 285.885); --bc-primary-foreground: oklch(.985 0 0); --bc-warning: oklch(.75 .16 85); --bc-success: oklch(.55 .16 145); --bc-info: oklch(.55 .18 250); --bc-danger: oklch(.577 .245 27.325); --bc-priority-none: oklch(.62 .01 286); --bc-priority-low: oklch(.55 .1 250); --bc-priority-medium: oklch(.76 .15 95); --bc-priority-high: oklch(.68 .18 52); --bc-priority-urgent: var(--bc-danger); --bc-surface-shadow: 0 1px 2px rgb(15 23 42 / .04),0 1px 1px rgb(15 23 42 / .03); --bc-card-shadow: 0 1px 3px rgb(15 23 42 / .10); --bc-floating-shadow: 0 16px 40px rgb(15 23 42 / .14),0 3px 10px rgb(15 23 42 / .08); --bc-menu-shadow: 0 8px 24px rgb(15 23 42 / .08),0 2px 6px rgb(15 23 42 / .05); --bc-scrim: rgb(24 24 27 / .22); color-scheme: light; }
        html.electron-dark, html.dark, html[data-theme="dark"] { --bc-page: oklch(.18 .005 285.823); --bc-surface: oklch(.21 .006 285.885); --bc-raised: oklch(.235 .007 285.885); --bc-hover: oklch(.274 .006 286.033); --bc-selected: oklch(.3 .006 286.033); --bc-foreground: oklch(.985 0 0); --bc-muted: oklch(.705 .015 286.067); --bc-faint: oklch(.60 .015 286.067); --bc-border: oklch(1 0 0 / 10%); --bc-divider: oklch(1 0 0 / 6%); --bc-input: oklch(1 0 0 / 15%); --bc-ring: oklch(.552 .016 285.938); --bc-primary: oklch(.92 .004 286.32); --bc-primary-foreground: oklch(.21 .006 285.885); --bc-warning: oklch(.70 .16 85); --bc-success: oklch(.65 .15 145); --bc-info: oklch(.65 .18 250); --bc-danger: oklch(.704 .191 22.216); --bc-priority-none: oklch(.68 .01 286); --bc-priority-low: oklch(.68 .1 250); --bc-priority-medium: oklch(.78 .14 95); --bc-priority-high: oklch(.74 .16 52); --bc-priority-urgent: var(--bc-danger); --bc-surface-shadow: 0 1px 2px rgb(0 0 0 / .2),0 1px 1px rgb(0 0 0 / .16); --bc-card-shadow: 0 0 0 1px rgb(255 255 255 / .03); --bc-floating-shadow: 0 20px 48px rgb(0 0 0 / .46),0 4px 12px rgb(0 0 0 / .28); --bc-menu-shadow: 0 10px 28px rgb(0 0 0 / .3),0 2px 8px rgb(0 0 0 / .18); --bc-scrim: rgb(0 0 0 / .5); color-scheme: dark; }
        #\${PANEL_ID} { position: absolute; inset: 0; z-index: 2; display: flex; min-width: 0; min-height: 0; flex-direction: column; overflow: hidden; color: var(--color-text-foreground, inherit); background: var(--color-background-surface, var(--wb-surface-primary, var(--color-token-bg-primary, Canvas))); pointer-events: auto; -webkit-app-region: no-drag !important; }
        #\${PANEL_ID}[hidden] { display: none !important; }
        #better-codex-update-notice { position: fixed; right: 16px; bottom: 16px; z-index: 2147483000; box-sizing: border-box; width: min(320px,calc(100vw - 32px)); color: var(--bc-foreground); background: var(--bc-raised); padding: 16px; border-radius: 12px; box-shadow: var(--bc-floating-shadow); outline: 1px solid color-mix(in srgb,var(--bc-foreground) 10%,transparent); outline-offset: -1px; font-family: var(--bc-font-ui); animation: better-codex-update-enter .3s cubic-bezier(.16,1,.3,1); }
        #better-codex-update-notice .better-codex-update-close { position: absolute; top: 6px; right: 6px; display: inline-flex; width: 40px; height: 40px; align-items: center; justify-content: center; border: 0; border-radius: 8px; color: var(--bc-muted); background: transparent; cursor: pointer; }
        #better-codex-update-notice .better-codex-update-layout { display: flex; align-items: flex-start; gap: 11px; padding-right: 22px; }
        #better-codex-update-notice .better-codex-update-icon { display: inline-flex; width: 28px; height: 28px; flex: 0 0 auto; align-items: center; justify-content: center; border-radius: 8px; color: var(--bc-success); background: color-mix(in srgb,var(--bc-success) 12%,transparent); }
        #better-codex-update-notice .better-codex-update-icon svg { width: 15px; height: 15px; }
        #better-codex-update-notice[data-status="installing"] .better-codex-update-icon svg { animation: better-codex-update-spin 1s linear infinite; }
        #better-codex-update-notice .better-codex-update-copy { min-width: 0; flex: 1; }
        #better-codex-update-notice .better-codex-update-title { margin: 1px 0 0; font-size: var(--bc-text-md); font-weight: 650; line-height: 1.4; }
        #better-codex-update-notice .better-codex-update-description { margin: 3px 0 0; color: var(--bc-muted); font-size: var(--bc-text-sm); line-height: 1.55; text-wrap: pretty; }
        #better-codex-update-notice .better-codex-update-error { margin: 6px 0 0; color: var(--bc-danger); font-size: var(--bc-text-sm); line-height: 1.45; }
        #better-codex-update-notice .better-codex-update-actions { display: flex; align-items: center; gap: 7px; margin-top: 11px; }
        #better-codex-update-notice .better-codex-update-button { display: inline-flex; min-height: 40px; align-items: center; justify-content: center; border: 0; border-radius: 8px; padding: 0 13px; color: var(--bc-foreground); background: var(--bc-hover); font: inherit; font-size: var(--bc-text-sm); font-weight: 600; cursor: pointer; transition: transform .15s,color .15s,background-color .15s; }
        #better-codex-update-notice .better-codex-update-button.is-primary { color: var(--bc-primary-foreground); background: var(--bc-primary); }
        #better-codex-update-notice .better-codex-update-button:active { transform: scale(.96); }
        #better-codex-update-notice .better-codex-update-button:focus-visible, #better-codex-update-notice .better-codex-update-close:focus-visible { outline: 2px solid var(--bc-ring); outline-offset: 2px; }
        #better-codex-update-notice .better-codex-update-button:disabled, #better-codex-update-notice .better-codex-update-close:disabled { cursor: default; opacity: .48; }
        @keyframes better-codex-update-enter { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes better-codex-update-spin { to { transform: rotate(360deg); } }
        @media (hover: hover) { #better-codex-update-notice .better-codex-update-close:hover { color: var(--bc-foreground); background: var(--bc-hover); } #better-codex-update-notice .better-codex-update-button:hover { background: var(--bc-selected); } #better-codex-update-notice .better-codex-update-button.is-primary:hover { background: color-mix(in srgb,var(--bc-primary) 90%,var(--bc-surface)); } }
        @media (prefers-reduced-motion: reduce) { #better-codex-update-notice, #better-codex-update-notice[data-status="installing"] .better-codex-update-icon svg { animation: none; } }
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
        #\${PANEL_ID} .better-codex-column { box-sizing: border-box; display: flex; width: 280px; min-width: 280px; min-height: 200px; flex-direction: column; border-radius: 12px; padding: 8px; }
        #\${PANEL_ID} .better-codex-column[data-status="backlog"], #\${PANEL_ID} .better-codex-column[data-status="todo"], #\${PANEL_ID} .better-codex-column[data-status="cancelled"] { background: rgba(228,228,231,.42); }
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
        #\${PANEL_ID} .better-codex-avatar { display: inline-flex; width: 16px; height: 16px; align-items: center; justify-content: center; border: 1.5px solid #fff; border-radius: 999px; color: #fff; background: #27272a; font-size: var(--bc-text-avatar); }
        #\${PANEL_ID} .better-codex-activity[data-run="running"], #\${PANEL_ID} .better-codex-activity[data-run="replying"] { color: #52525b; }
        #\${PANEL_ID} .better-codex-activity[data-run="reply-failed"] { color: #dc2626; }
        #\${PANEL_ID} .better-codex-activity[data-run="reply-succeeded"] { color: #15803d; }
        #\${PANEL_ID} .better-codex-activity[data-run="claimed"] { color: var(--bc-muted); opacity: .62; }
        @keyframes better-codex-shimmer { 0% { background-position: 200% 0 } 100% { background-position: -200% 0 } }
        #\${PANEL_ID} .better-codex-shimmer { background-image: linear-gradient(90deg,#71717a 0%,#71717a 35%,#18181b 50%,#71717a 65%,#71717a 100%); background-size: 200% 100%; background-clip: text; -webkit-background-clip: text; color: transparent; -webkit-text-fill-color: transparent; animation: better-codex-shimmer 2.5s linear infinite; }
        #\${PANEL_ID} .better-codex-empty { padding: 18px 4px; text-align: center; color: #a1a1aa; font-size: var(--bc-text-sm); }
        #\${PANEL_ID} .better-codex-agent-heading { display: none; min-width: 0; align-items: baseline; gap: 10px; }
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
        #better-codex-dialog .better-codex-project-menu { position: absolute; top: calc(100% + 6px); right: 0; z-index: 30; box-sizing: border-box; width: 220px; border: 1px solid #e4e4e7; border-radius: 9px; color: #3f3f46; background: #fff; padding: 5px; box-shadow: 0 12px 30px rgba(15,23,42,.14),0 2px 7px rgba(15,23,42,.08); }
        #better-codex-dialog .better-codex-project-menu[hidden] { display: none; }
        #better-codex-dialog .better-codex-project-search { box-sizing: border-box; width: 100%; height: var(--bc-control-height, 32px); border: 0; border-bottom: 1px solid #ededee; color: inherit; background: transparent; padding: 0 7px 4px; font: inherit; font-size: var(--bc-text-md); outline: none; }
        #better-codex-dialog .better-codex-project-option { display: flex; width: 100%; min-height: var(--bc-row-height, 34px); align-items: center; gap: 7px; border: 0; border-radius: 6px; color: inherit; background: transparent; padding: 0 7px; font: inherit; font-size: var(--bc-text-md); text-align: left; cursor: pointer; }
        #better-codex-dialog .better-codex-project-option:hover, #better-codex-dialog .better-codex-project-option:focus-visible { background: #f4f4f5; outline: none; }
        #better-codex-dialog .better-codex-project-option > span:first-of-type { min-width: 0; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        #better-codex-dialog .better-codex-project-check { width: 14px; flex: 0 0 auto; }
        #better-codex-dialog .better-codex-project-empty { padding: 8px 7px; color: #a1a1aa; font-size: var(--bc-text-md); }
        #better-codex-dialog .better-codex-dialog-attachments { display: flex; flex: 0 0 auto; flex-wrap: wrap; gap: 6px; padding: 0 16px 8px; }
        #better-codex-dialog .better-codex-dialog-attachments[hidden] { display: none; }
        #better-codex-dialog .better-codex-attachment-chip { display: inline-flex; max-width: 100%; min-height: 28px; align-items: center; gap: 6px; border: 1px solid #e5e5e7; border-radius: 999px; color: #52525b; background: #fff; padding: 0 4px 0 9px; font-size: var(--bc-text-md); }
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
        #\${PANEL_ID} .better-codex-column[data-status="backlog"], #\${PANEL_ID} .better-codex-column[data-status="todo"], #\${PANEL_ID} .better-codex-column[data-status="cancelled"] { background: color-mix(in oklch,var(--bc-hover) 70%,transparent); }
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
        #\${PANEL_ID} .better-codex-activity[data-run="running"], #\${PANEL_ID} .better-codex-activity[data-run="replying"] { color: var(--bc-foreground); }
        #\${PANEL_ID} .better-codex-activity[data-run="reply-failed"] { color: var(--bc-danger); }
        #\${PANEL_ID} .better-codex-activity[data-run="reply-succeeded"] { color: #65c18c; }
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
      syncEntryIcon(button, surface);
      button.addEventListener("click", event => {
        event.preventDefault();
        event.stopPropagation();
        state.surface = surface;
        open(surface);
      });
      return button;
    }

    function syncEntryIcon(button, surface) {
      const svg = button.querySelector("svg");
      if (svg) {
        const definition = LUCIDE_ICONS[surface === "agents" ? "bot" : "issues"];
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
      if (!reference?.parentElement) return false;
      if (!entry) entry = createEntry("任务看板", ENTRY_ID, "打开任务看板", "issues");
      syncEntryLabel(entry, "任务看板", "打开任务看板");
      syncEntryIcon(entry, "issues");
      if (entry.parentElement !== reference.parentElement || entry.previousElementSibling !== reference) reference.after(entry);
      if (!agentsEntry) agentsEntry = createEntry("智能体", AGENTS_ENTRY_ID, "管理智能体", "agents");
      syncEntryLabel(agentsEntry, "智能体", "管理智能体");
      syncEntryIcon(agentsEntry, "agents");
      if (agentsEntry.parentElement !== reference.parentElement || agentsEntry.previousElementSibling !== entry) entry.after(agentsEntry);
      const currentEntry = active && state.surface === "issues" ? entry : active && state.surface === "agents" ? agentsEntry : null;
      for (const item of [entry, agentsEntry]) {
        if (item === currentEntry && item.getAttribute("aria-current") !== "page") item.setAttribute("aria-current", "page");
        if (item !== currentEntry && item.hasAttribute("aria-current")) item.removeAttribute("aria-current");
      }
      return entry.isConnected && agentsEntry.isConnected;
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
      const attempt = (retriesLeft) => {
        const id = VERSION + ":" + (++bridgeSequence);
        return new Promise((resolve, reject) => {
          const timer = setTimeout(() => {
            bridgeRequests.delete(id);
            reject(new Error("runtime_bridge_timeout"));
          }, 10000);
          bridgeRequests.set(id, { resolve, reject, timer });
          try {
            window.betterCodexRequest(JSON.stringify({ id, token: BRIDGE_TOKEN, path, method: options.method || "GET", body: options.body }));
          } catch (error) {
            bridgeRequests.delete(id);
            clearTimeout(timer);
            reject(error instanceof Error ? error : new Error("runtime_bridge_unavailable"));
          }
        }).catch(error => {
          if (retriesLeft > 0 && error instanceof Error && error.message === "runtime_bridge_timeout") {
            return attempt(retriesLeft - 1);
          }
          throw error;
        });
      };
      return attempt(1);
    }

    window.__betterCodexBridgeResolve = (id, result) => {
      const pending = bridgeRequests.get(id);
      if (!pending) return;
      bridgeRequests.delete(id);
      clearTimeout(pending.timer);
      if (result?.ok) pending.resolve(result.value);
      else pending.reject(new Error(result?.value?.error || "request_failed"));
    };

    function errorLabel(error) {
      const value = error instanceof Error ? error.message : String(error || "request_failed");
      if (value === "thread_open_timeout" || value === "thread_open_unconfirmed") return "对话仍在加载，请稍后重试。";
      if (value === "thread_id_invalid") return "对话链接无效。";
      if (value === "manual_start_required") return "当前为手动运行，请先点击“立即开始任务”。";
      if (value === "backlog_reply_blocked") return "待规划中的 Issue 不会自动触发任务，请先移出待规划区。";
      return value;
    }

    function showError(error) {
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

    function dismissUpdate(version) {
      dismissedUpdateVersion = version;
      sessionStorage.setItem("better-codex-dismissed-update", version);
      updateNotice?.remove();
      updateNotice = null;
    }

    function renderUpdateNotice(update) {
      const version = String(update?.latestVersion || "");
      if (update?.status !== "available" || !version || dismissedUpdateVersion === version) return;
      if (updateNotice?.dataset.version === version) return;
      updateNotice?.remove();
      updateNotice = document.createElement("section");
      updateNotice.id = "better-codex-update-notice";
      updateNotice.dataset.version = version;
      updateNotice.dataset.status = "available";
      updateNotice.setAttribute(OWNED, "true");
      updateNotice.setAttribute("role", "status");
      updateNotice.setAttribute("aria-live", "polite");
      updateNotice.innerHTML = '<button class="better-codex-update-close" type="button" aria-label="稍后提醒">' + icon("close") + '</button><div class="better-codex-update-layout"><span class="better-codex-update-icon">' + icon("refresh") + '</span><div class="better-codex-update-copy"><p class="better-codex-update-title">Better Codex 有新版本</p><p class="better-codex-update-description">v' + escapeHtml(version) + ' 已可用，更新完成后将自动重启 Codex。</p><p class="better-codex-update-error" hidden></p><div class="better-codex-update-actions"><button class="better-codex-update-button" type="button" data-update-later>稍后</button><button class="better-codex-update-button is-primary" type="button" data-update-install>立即更新</button></div></div></div>';
      document.body.appendChild(updateNotice);
      updateNotice.querySelector(".better-codex-update-close").addEventListener("click", () => dismissUpdate(version));
      updateNotice.querySelector("[data-update-later]").addEventListener("click", () => dismissUpdate(version));
      updateNotice.querySelector("[data-update-install]").addEventListener("click", async event => {
        const install = event.currentTarget;
        const close = updateNotice.querySelector(".better-codex-update-close");
        const later = updateNotice.querySelector("[data-update-later]");
        const title = updateNotice.querySelector(".better-codex-update-title");
        const description = updateNotice.querySelector(".better-codex-update-description");
        const error = updateNotice.querySelector(".better-codex-update-error");
        updateNotice.dataset.status = "installing";
        install.disabled = true;
        close.disabled = true;
        later.disabled = true;
        install.textContent = "正在更新";
        title.textContent = "正在更新 Better Codex";
        description.textContent = "正在下载并校验新版本，请不要关闭 Codex。";
        error.hidden = true;
        try {
          const result = await api("/api/update/install", { method: "POST" });
          if (result?.updated === false) {
            updateNotice.dataset.status = "current";
            title.textContent = "Better Codex 已是最新版本";
            description.textContent = "刚刚完成检查，无需更新。";
            setTimeout(() => {
              updateNotice?.remove();
              updateNotice = null;
            }, 1800);
            return;
          }
          title.textContent = "更新完成";
          description.textContent = "正在重启 Codex，稍后会自动恢复。";
        } catch (reason) {
          updateNotice.dataset.status = "available";
          install.disabled = false;
          close.disabled = false;
          later.disabled = false;
          install.textContent = "重试";
          title.textContent = "更新未完成";
          description.textContent = "Better Codex 保持当前版本运行。";
          error.textContent = reason instanceof Error ? reason.message : "update_install_failed";
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

    async function perform(action) {
      clearError();
      try {
        return await action();
      } catch (error) {
        showError(error);
        return null;
      }
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
        dialog.innerHTML = '<div class="better-codex-confirm-body"><h2 class="better-codex-confirm-title">' + escapeHtml(title) + '</h2><p class="better-codex-confirm-message">' + escapeHtml(message) + '</p></div><div class="better-codex-confirm-actions"><button type="button" data-confirm-cancel>取消</button><button class="better-codex-confirm-primary" type="button" data-confirm-accept>' + escapeHtml(confirmLabel) + '</button></div>';
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

    function codexLogo() {
      const gradientId = "better-codex-logo-gradient-" + (++codexLogoSequence);
      return '<svg viewBox="0 0 24 24" width="36" height="36" role="img" aria-label="Codex"><path d="M19.503 0H4.496A4.496 4.496 0 000 4.496v15.007A4.496 4.496 0 004.496 24h15.007A4.496 4.496 0 0024 19.503V4.496A4.496 4.496 0 0019.503 0z" fill="#fff"></path><path d="M9.064 3.344a4.578 4.578 0 012.285-.312c1 .115 1.891.54 2.673 1.275.01.01.024.017.037.021a.09.09 0 00.043 0 4.55 4.55 0 013.046.275l.047.022.116.057a4.581 4.581 0 012.188 2.399c.209.51.313 1.041.315 1.595a4.24 4.24 0 01-.134 1.223.123.123 0 00.03.115c.594.607.988 1.33 1.183 2.17.289 1.425-.007 2.71-.887 3.854l-.136.166a4.548 4.548 0 01-2.201 1.388.123.123 0 00-.081.076c-.191.551-.383 1.023-.74 1.494-.9 1.187-2.222 1.846-3.711 1.838-1.187-.006-2.239-.44-3.157-1.302a.107.107 0 00-.105-.024c-.388.125-.78.143-1.204.138a4.441 4.441 0 01-1.945-.466 4.544 4.544 0 01-1.61-1.335c-.152-.202-.303-.392-.414-.617a5.81 5.81 0 01-.37-.961 4.582 4.582 0 01-.014-2.298.124.124 0 00.006-.056.085.085 0 00-.027-.048 4.467 4.467 0 01-1.034-1.651 3.896 3.896 0 01-.251-1.192 5.189 5.189 0 01.141-1.6c.337-1.112.982-1.985 1.933-2.618.212-.141.413-.251.601-.33.215-.089.43-.164.646-.227a.098.098 0 00.065-.066 4.51 4.51 0 01.829-1.615 4.535 4.535 0 011.837-1.388zm3.482 10.565a.637.637 0 000 1.272h3.636a.637.637 0 100-1.272h-3.636zM8.462 9.23a.637.637 0 00-1.106.631l1.272 2.224-1.266 2.136a.636.636 0 101.095.649l1.454-2.455a.636.636 0 00.005-.64L8.462 9.23z" fill="url(#' + gradientId + ')"></path><defs><linearGradient gradientUnits="userSpaceOnUse" id="' + gradientId + '" x1="12" x2="12" y1="3" y2="21"><stop stop-color="#B1A7FF"></stop><stop offset=".5" stop-color="#7A9DFF"></stop><stop offset="1" stop-color="#3941FF"></stop></linearGradient></defs></svg>';
    }

    function icon(name, className = "", strokeWidth = "1.7") {
      const definition = LUCIDE_ICONS[name];
      if (!definition) return "";
      const classes = "lucide lucide-" + definition.name + (className ? " " + escapeHtml(className) : "");
      return '<svg class="' + classes + '" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="' + escapeHtml(strokeWidth) + '" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + definition.nodes + '</svg>';
    }

    function statusIcon(status) {
      const names = { backlog: "statusBacklog", todo: "statusTodo", in_progress: "statusInProgress", in_review: "statusInReview", done: "statusDone", blocked: "statusBlocked", cancelled: "statusCancelled" };
      const markup = icon(names[status] || "statusTodo", "better-codex-status-icon", "2.35");
      return markup.replace("<svg ", '<svg data-status="' + escapeHtml(status) + '" ');
    }

    function priorityIcon(priority) {
      const names = { none: "priorityNone", low: "priorityLow", medium: "priorityMedium", high: "priorityHigh", urgent: "priorityUrgent" };
      const markup = icon(names[priority] || "priorityNone", "better-codex-priority", "2.35");
      return markup.replace("<svg ", '<svg data-priority="' + escapeHtml(priority) + '" ');
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
        const assignee = issue.agent_enabled
          ? issue.agent_id || "codex"
          : issue.user_assigned ? "user" : "none";
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
      const agent = document.createElement("button");
      agent.type = "button";
      agent.className = "better-codex-create-menu-item";
      agent.setAttribute("role", "menuitem");
      agent.innerHTML = icon("bot") + "<span>通过智能体创建</span>";
      agent.addEventListener("click", event => {
        event.stopPropagation();
        state.createMode = "agent";
        closeCreateMenu();
        void perform(() => openEditor());
      });
      menu.append(agent);
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
      if (key === "status") return Object.entries(statusLabels).map(([value, text]) => ({ value, text }));
      if (key === "priority") return Object.entries(priorityLabels).map(([value, text]) => ({ value, text: value === "none" ? "无优先级" : text + "优先级" }));
      if (key === "date") return [{ value: "1", text: "最近 24 小时" }, { value: "7", text: "最近 7 天" }, { value: "30", text: "最近 30 天" }];
      if (key === "assignee") return [{ value: "user", text: state.user.name || "我" }, { value: "codex", text: "Codex" }, ...state.agents.filter(agent => !agent.is_default).map(agent => ({ value: agent.id, text: agent.name })), { value: "none", text: "未分配" }];
      if (key === "creator") return [{ value: "me", text: "由我创建" }];
      if (key === "project") return state.projects.map(project => ({ value: project.id, text: project.name }));
      if (key === "label") return [...new Set(state.issues.flatMap(issue => issue.labels || []))].map(value => ({ value, text: value }));
      return [];
    }

    function filterOptionIcon(key, value) {
      if (key === "status") return statusIcon(value);
      if (key === "priority") return priorityIcon(value);
      const names = { date: "calendar", assignee: "user", creator: "userEdit", project: "folder", label: "tag" };
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
      const userSelected = Boolean(issue.user_assigned) && !issue.agent_enabled;
      const noneSelected = !issue.user_assigned && !issue.agent_enabled;
      const userName = state.user.name || "我";
      const userAvatar = '<span class="better-codex-context-avatar is-user is-initials" style="background:' + escapeHtml(state.user.color || "#16a34a") + '">' + escapeHtml(state.user.initials || "你") + '</span>';
      const contextAssigneeTags = agent => agentConfigTags(agent).map(tag => '<span class="better-codex-context-tag" data-tone="' + escapeHtml(tag.tone) + '">' + escapeHtml(tag.value) + '</span>').join("");
      const contextAssigneeLabel = (name, tags = "") => '<span class="better-codex-context-assignee-label"><span class="better-codex-context-assignee-name">' + escapeHtml(name) + '</span>' + tags + '</span>';
      const unassignedAvatar = '<span class="better-codex-context-avatar is-fallback">' + icon("user") + '</span>';
      const assigneeItems = [
        '<button class="better-codex-context-item" type="button" data-context-action="assign" data-assignee-kind="none"><span class="better-codex-context-check">' + (noneSelected ? icon("check") : "") + '</span>' + unassignedAvatar + contextAssigneeLabel("未指派") + '</button>',
        '<button class="better-codex-context-item" type="button" data-context-action="assign" data-assignee-kind="me"><span class="better-codex-context-check">' + (userSelected ? icon("check") : "") + '</span>' + userAvatar + contextAssigneeLabel(userName) + '</button>',
        ...state.agents.map(agent => {
          const selected = Boolean(issue.agent_enabled) && (agent.is_default ? !issue.agent_id : issue.agent_id === agent.id);
          return '<button class="better-codex-context-item" type="button" data-context-action="assign" data-assignee-kind="agent" data-context-agent-id="' + escapeHtml(agent.id || "") + '"><span class="better-codex-context-check">' + (selected ? icon("check") : "") + '</span>' + agentAvatarMarkup(agent, "better-codex-context-avatar") + contextAssigneeLabel(agent.name, contextAssigneeTags(agent)) + '</button>';
        }),
      ].join("");
      const menu = document.createElement("div");
      menu.id = "better-codex-context-menu";
      menu.setAttribute(OWNED, "true");
      menu.dataset.issueId = issue.id;
      menu.dataset.align = event.clientX + 430 > window.innerWidth ? "left" : "right";
      menu.innerHTML = '<div class="better-codex-context-item-wrap"><button class="better-codex-context-item" type="button">' + statusIcon(issue.status) + '<span>状态</span>' + icon("chevron") + '</button><div class="better-codex-context-submenu">' + statusItems + '</div></div><div class="better-codex-context-item-wrap"><button class="better-codex-context-item" type="button">' + priorityIcon(issue.priority) + '<span>优先级</span>' + icon("chevron") + '</button><div class="better-codex-context-submenu">' + priorityItems + '</div></div><div class="better-codex-context-item-wrap"><button class="better-codex-context-item" type="button">' + icon("user") + '<span>指定负责人</span>' + icon("chevron") + '</button><div class="better-codex-context-submenu is-assignee">' + assigneeItems + '</div></div>' + (workspacePath ? '<div class="better-codex-context-divider"></div><button class="better-codex-context-item" type="button" data-context-action="copy-workspace">' + icon("folder") + '<span>复制本地 workdir 路径</span></button>' : "") + '<div class="better-codex-context-divider"></div><button class="better-codex-context-item is-danger" type="button" data-context-action="archive">' + icon("trash") + '<span>删除任务</span></button>';
      document.body.appendChild(menu);
      const rect = menu.getBoundingClientRect();
      menu.style.left = Math.max(8, Math.min(event.clientX, window.innerWidth - rect.width - 8)) + "px";
      menu.style.top = Math.max(8, Math.min(event.clientY, window.innerHeight - rect.height - 8)) + "px";

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
        if (item.dataset.contextAction === "copy-workspace") {
          closeIssueMenu();
          return void perform(() => copyText(workspacePath));
        }
        if (item.dataset.contextAction === "archive") {
          closeIssueMenu();
          return void confirmAction("删除任务", "确定删除任务 “" + current.identifier + "” 吗？", "删除").then(confirmed => {
            if (!confirmed) return;
            return perform(async () => {
              await api("/api/issues/" + encodeURIComponent(current.id) + "/archive", { method: "POST", body: JSON.stringify({ version: current.version }) });
              await loadIssues();
            });
          });
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
      for (const [view, text] of [["all", "全部"], ["assigned", "已分配"], ["unassigned", "未分配"]]) {
        const button = actionButton(text);
        button.dataset.view = view;
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
      working.classList.add("better-codex-working-chip", "is-bordered");
      working.addEventListener("click", () => { state.view = state.view === "agent" ? "all" : "agent"; render(); });
      const search = document.createElement("input");
      search.id = "better-codex-search";
      search.className = "better-codex-search";
      search.placeholder = "搜索任务";
      search.value = "";
      search.addEventListener("input", () => { state.search = search.value; void perform(loadIssues); });
      const filter = actionButton("筛选");
      filter.id = "better-codex-filter";
      filter.classList.add("is-bordered");
      filter.insertAdjacentHTML("afterbegin", icon("filter"));
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
      autoDispatch.setAttribute("aria-label", "切换为自动运行");
      autoDispatch.innerHTML = icon("user") + "<span>手动运行</span>";
      autoDispatch.addEventListener("click", () => {
        const next = !state.autoDispatch;
        state.autoDispatch = next;
        syncAutoDispatch();
        void perform(async () => {
          try {
            const result = await api("/api/settings/auto-dispatch", { method: "PATCH", body: JSON.stringify({ enabled: next }) });
            state.autoDispatch = Boolean(result.enabled);
          } catch (error) {
            state.autoDispatch = !next;
            throw error;
          } finally {
            syncAutoDispatch();
          }
        });
      });
      const autoDispatchHelp = actionButton("");
      autoDispatchHelp.className = "better-codex-auto-dispatch-help";
      autoDispatchHelp.setAttribute("aria-label", "运行模式说明");
      autoDispatchHelp.innerHTML = icon("help");
      autoDispatchHelp.addEventListener("click", event => {
        event.stopPropagation();
        showAutoDispatchHelp();
      });
      autoDispatchWrap.append(autoDispatch, autoDispatchHelp);
      const addIssue = actionButton("新建 issue");
      addIssue.className = "better-codex-create-primary";
      addIssue.insertAdjacentHTML("afterbegin", icon("plus"));
      addIssue.addEventListener("click", () => {
        closeCreateMenu();
        state.createMode = "manual";
        void perform(() => openEditor());
      });
      const createToggle = actionButton("");
      createToggle.className = "better-codex-create-toggle";
      createToggle.dataset.createMenuToggle = "true";
      createToggle.setAttribute("aria-label", "选择 issue 创建方式");
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
      actions.append(error, working, search, filterWrap, autoDispatchWrap, createSplit);
      const agentActions = document.createElement("div");
      agentActions.className = "better-codex-agent-actions";
      const addAgent = actionButton("新建智能体");
      addAgent.classList.add("is-bordered");
      addAgent.insertAdjacentHTML("afterbegin", icon("plus"));
      addAgent.addEventListener("click", () => startAgentCreate());
      agentActions.append(addAgent);
      toolbar.append(tabs, agentHeading, actions, agentActions);
      const board = document.createElement("main");
      board.id = "better-codex-board";
      board.className = "better-codex-board better-codex-issue-only";
      board.addEventListener("click", onBoardClick);
      board.addEventListener("contextmenu", openIssueMenu);
      board.addEventListener("dragstart", onCardDragStart);
      board.addEventListener("drag", onCardDragMove);
      board.addEventListener("dragend", onCardDragEnd);
      board.addEventListener("dragover", onCardDragOver);
      board.addEventListener("drop", onDrop);
      const agents = document.createElement("main");
      agents.id = "better-codex-agents";
      agents.className = "better-codex-agents";
      agents.addEventListener("click", onAgentsClick);
      agents.addEventListener("keydown", event => {
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
      section.append(toolbar, board, agents);
      return section;
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
      return '<button class="better-codex-agent-avatar-editor" type="button" data-agent-avatar-form="' + escapeHtml(key) + '" aria-label="更换 ' + escapeHtml(agent?.name || "智能体") + ' 的头像">' + agentAvatarMarkup(agent, "better-codex-agent-list-avatar") + '<span class="better-codex-agent-avatar-overlay" aria-hidden="true">' + icon("plus") + '</span></button>';
    }

    function chooseAgentAvatar(current = "", anchor = null) {
      avatarPickerClose?.();
      document.getElementById("better-codex-avatar-picker")?.remove();
      return new Promise(resolve => {
        const picker = document.createElement("div");
        picker.id = "better-codex-avatar-picker";
        picker.setAttribute(OWNED, "true");
        picker.setAttribute("role", "dialog");
        picker.setAttribute("aria-label", "选择头像");
        const currentPreset = parseIconAvatar(current)?.id || "";
        const presets = AGENT_AVATAR_PRESETS.map(item => '<button class="better-codex-avatar-preset' + (item.id === currentPreset ? " is-selected" : "") + '" type="button" data-avatar-preset="' + escapeHtml(item.id) + '" title="' + escapeHtml(item.label) + '" aria-label="' + escapeHtml(item.label) + '" aria-pressed="' + (item.id === currentPreset) + '"><span class="better-codex-avatar-preset-visual is-icon" data-tone="' + escapeHtml(item.tone) + '">' + icon(item.icon, "", "2.25") + '</span><span class="better-codex-avatar-preset-label">' + escapeHtml(item.label) + "</span></button>").join("");
        picker.innerHTML = '<div class="better-codex-avatar-picker-shell"><header><div><strong>选择头像</strong><span>从预设图标中选择，也可以上传图片</span></div><button type="button" data-avatar-picker-cancel aria-label="关闭">' + icon("close") + '</button></header><div class="better-codex-avatar-preset-grid" role="listbox" aria-label="预设头像">' + presets + '</div><footer><button type="button" data-avatar-picker-cancel>取消</button><button class="is-primary" type="button" data-avatar-picker-upload>' + icon("image") + '<span>上传图片</span></button></footer></div>';
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
          dialog.innerHTML = '<div class="better-codex-avatar-cropper-shell"><header><div><strong>裁剪头像</strong><span>拖动图片调整位置</span></div><button type="button" data-avatar-crop-cancel aria-label="关闭">' + icon("close") + '</button></header><div class="better-codex-avatar-canvas-wrap"><canvas width="' + size + '" height="' + size + '"></canvas><span class="better-codex-avatar-crop-guide" aria-hidden="true"></span></div><label class="better-codex-avatar-zoom"><span>' + icon("image") + '</span><input type="range" min="1" max="3" value="1" step="0.01" aria-label="缩放头像"><span>' + icon("image") + '</span></label><footer><button type="button" data-avatar-crop-cancel>取消</button><button class="is-primary" type="button" data-avatar-crop-save>使用此头像</button></footer></div>';
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
      return ({ low: "低", medium: "中", high: "高", xhigh: "超高", max: "最大", ultra: "极致" })[value] || value;
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
      return name;
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
      };
      applyTheme("light", appearance?.light);
      applyTheme("dark", appearance?.dark);
    }

    function effortsForModel(model) {
      const entry = state.agentModelCatalog.find(item => item.id === model);
      return entry?.supportedReasoningEfforts?.length
        ? entry.supportedReasoningEfforts.map(item => ({ value: item.value, label: effortLabel(item.value), description: item.description || "" }))
        : state.agentReasoningEfforts.map(value => ({ value, label: effortLabel(value), description: "" }));
    }

    function agentPicker(name, label, selected, options) {
      const current = options.find(option => option.value === selected) || options[0] || { value: "", label: "未提供" };
      const rows = options.map(option => '<button class="better-codex-agent-menu-item' + (option.value === current.value ? " is-selected" : "") + '" type="button" role="option" aria-selected="' + (option.value === current.value) + '" data-agent-option="' + escapeHtml(name) + '" data-agent-option-value="' + escapeHtml(option.value) + '"><span>' + escapeHtml(option.label) + '</span>' + (option.value === current.value ? icon("check") : "") + '</button>').join("");
      return '<div class="better-codex-agent-setting" data-agent-picker="' + escapeHtml(name) + '"><span>' + escapeHtml(label) + '</span><input type="hidden" name="' + escapeHtml(name) + '" value="' + escapeHtml(current.value) + '"><button class="better-codex-agent-picker-trigger" type="button" role="combobox" aria-haspopup="listbox" aria-expanded="false" data-agent-picker-toggle="' + escapeHtml(name) + '"><span data-agent-picker-label>' + escapeHtml(current.label) + '</span>' + icon("chevron") + '</button><div class="better-codex-agent-menu" role="listbox"><div class="better-codex-agent-menu-title">' + escapeHtml(label) + '</div>' + rows + '</div></div>';
    }

    function agentNumberInput(name, label, value, min, max) {
      const numericValue = Number(value);
      const current = Number.isInteger(numericValue) ? Math.min(max, Math.max(min, numericValue)) : 5;
      return '<label class="better-codex-agent-setting"><span>' + escapeHtml(label) + '</span><input class="better-codex-agent-number-input" type="number" name="' + escapeHtml(name) + '" min="' + min + '" max="' + max + '" step="1" value="' + current + '" aria-label="' + escapeHtml(label) + '"></label>';
    }

    const suggestedAgents = ${JSON.stringify(suggestedAgents)};

    let agentInspectorClosing = false;

    function closeAgentInspector() {
      if (state.agentPane === "preview") return;
      const inspector = panel?.querySelector(".better-codex-agent-inspector");
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
      const isDefault = Boolean(draft.is_default);
      const name = creating ? draft.name || "" : draft.name;
      const description = creating ? draft.description || "" : draft.description || "";
      const instructions = creating ? draft.instructions || "" : draft.instructions || "";
      const defaultModel = state.agentModelCatalog.find(item => item.isDefault) || state.agentModelCatalog[0];
      const model = state.agentModels.includes(draft.model) ? draft.model : defaultModel?.id || draft.model || "";
      const effortOptions = effortsForModel(model);
      const preferredEffort = draft.reasoning_effort || state.agentModelCatalog.find(item => item.id === model)?.defaultReasoningEffort;
      const effort = effortOptions.some(item => item.value === preferredEffort) ? preferredEffort : effortOptions[0]?.value || "medium";
      const heading = creating ? "新建" : "智能体";
      const avatarInput = '<input type="hidden" name="avatar" value="' + escapeHtml(draft.avatar || "") + '">';
      const profileHead = creating
        ? '<h2>创建智能体</h2><div class="better-codex-agent-avatar-field">' + agentAvatarEditorMarkup(draft, "") + '<div><strong>头像</strong><span>点击选择预设图标，或上传图片</span></div>' + avatarInput + '</div>'
        : '<div class="better-codex-agent-profile-head">' + agentAvatarEditorMarkup(draft, agentKey(draft)) + '<h2>' + escapeHtml(draft.name) + '</h2>' + avatarInput + '</div>';
      const identity = isDefault
        ? '<div class="better-codex-agent-summary"><div><strong>Codex 默认智能体</strong></div></div>'
        : '<label class="better-codex-agent-inspector-field"><span>名称</span><input name="name" maxlength="80" value="' + escapeHtml(name) + '" placeholder="智能体名称" required></label><label class="better-codex-agent-inspector-field"><span>介绍 <small>可选</small></span><textarea name="description" maxlength="500" rows="3" placeholder="说明这个智能体适合承担什么工作">' + escapeHtml(description) + '</textarea></label>';
      const instructionField = isDefault ? "" : '<label class="better-codex-agent-inspector-field"><span>Instruct <small>可选</small></span><textarea name="instructions" rows="7" placeholder="定义职责、工作方式和输出要求">' + escapeHtml(instructions) + '</textarea></label>';
      const deleteButton = !creating && !isDefault ? '<button class="better-codex-agent-danger" type="button" data-agent-delete data-agent-key="' + escapeHtml(agentKey(draft)) + '">删除智能体</button>' : "";
      const modelOptions = state.agentModelCatalog.map(item => ({ value: item.id, label: item.displayName, description: item.description || "" }));
       const animateAttr = options.animateEnter ? ' data-animate="enter"' : "";
       return '<aside class="better-codex-agent-inspector"' + animateAttr + '><form data-agent-form="' + (creating ? "create" : isDefault ? "default" : "update") + '" data-agent-key="' + escapeHtml(creating ? "" : agentKey(draft)) + '"><header class="better-codex-agent-inspector-head"><span>' + heading + '</span><button class="better-codex-agent-card-action" type="button" data-agent-close-pane aria-label="关闭详情">' + icon("close") + '</button></header><div class="better-codex-agent-inspector-scroll">' + profileHead + identity + '<h3>详情</h3><div class="better-codex-agent-inspector-group">' + agentPicker("model", "模型", model, modelOptions) + agentPicker("reasoning_effort", "推理", effort, effortOptions) + agentNumberInput("max_concurrency", "最大并发", draft.max_concurrency, 1, 20) + '</div>' + instructionField + '<div class="better-codex-agent-inspector-error" hidden></div></div><footer class="better-codex-agent-inspector-footer">' + deleteButton + '<button class="better-codex-submit" type="submit">' + (creating ? "创建" : "保存") + '</button></footer></form></aside>';
    }

    function renderAgents() {
      const container = panel?.querySelector("#better-codex-agents");
      if (!container) return;
      const previousPane = panel.dataset.agentPane || "preview";
      panel.dataset.agentPane = state.agentPane;
      const addAgent = panel.querySelector(".better-codex-agent-actions");
      if (addAgent) addAgent.hidden = state.agentPane !== "preview";
      panel.querySelectorAll("[data-agent-view]").forEach(button => button.classList.toggle("is-active", button.dataset.agentView === state.agentView));
      const query = state.agentSearch.trim().toLowerCase();
      const agents = state.agents.filter(agent => {
        const matchesView = state.agentView === "all" || (state.agentView === "default" ? agent.is_default : !agent.is_default);
        return matchesView && (!query || [agent.name, agent.description, agent.instructions, agent.model].some(value => String(value || "").toLowerCase().includes(query)));
      });
      const selected = state.agents.find(agent => agentKey(agent) === state.selectedAgentId);
      const rows = agents.map(agent => {
        const key = agentKey(agent);
        const avatar = agentAvatarMarkup(agent, "better-codex-agent-list-avatar");
        const meta = modelLabel(agent.model) + " · " + effortLabel(agent.reasoning_effort) + "推理";
        const description = agent.description || (agent.is_default ? "" : "尚未添加介绍");
        return '<button class="better-codex-agent-row' + (key === state.selectedAgentId ? " is-selected" : "") + '" type="button" data-agent-key="' + escapeHtml(key) + '">' + avatar + '<span class="better-codex-agent-row-copy"><strong>' + escapeHtml(agent.name) + (agent.is_default ? '<small>默认</small>' : "") + '</strong>' + (description ? '<span>' + escapeHtml(description) + '</span>' : '') + '<em>' + escapeHtml(meta) + '</em></span><span class="better-codex-agent-row-chevron">' + icon("chevron") + '</span></button>';
      }).join("");
      const empty = '<div class="better-codex-agent-list-empty">' + (query ? "没有匹配的智能体" : "此分类暂无智能体") + '</div>';
      const suggestions = suggestedAgents.map(item => {
        const selected = state.agentPane === "create" && state.agentDraft?.key === item.key;
        return '<button class="better-codex-agent-suggestion' + (selected ? " is-selected" : "") + '" type="button" data-agent-template="' + item.key + '" aria-pressed="' + selected + '"><span class="better-codex-agent-suggestion-icon" data-tone="' + escapeHtml(item.tone) + '">' + icon(item.icon, "", "2.4") + '</span><span><strong>' + escapeHtml(item.name) + '</strong><small>' + escapeHtml(item.description) + '</small></span></button>';
      }).join("");
      const animateEnter = previousPane === "preview" && state.agentPane !== "preview";
      container.innerHTML = '<div class="better-codex-agent-shell" data-pane="' + state.agentPane + '"><section class="better-codex-agent-directory"><div class="better-codex-agent-search-wrap">' + icon("search") + '<input class="better-codex-search" data-agent-search type="search" value="' + escapeHtml(state.agentSearch) + '" placeholder="搜索智能体" aria-label="搜索智能体"></div><div class="better-codex-agent-list">' + (rows || empty) + '</div>' + (state.agentView === "all" && !query ? '<div class="better-codex-agent-suggestions"><h3>建议</h3>' + suggestions + '</div>' : "") + '</section>' + agentInspector(selected, { animateEnter }) + '</div>';
    }

    function showAutoDispatchHelp() {
      document.getElementById("better-codex-auto-dispatch-help-dialog")?.remove();
      const dialog = document.createElement("dialog");
      dialog.id = "better-codex-auto-dispatch-help-dialog";
      dialog.setAttribute(OWNED, "true");
      dialog.innerHTML = [
        '<div class="better-codex-auto-dispatch-help-shell">',
        '<header><strong>运行模式说明</strong><button type="button" data-help-close aria-label="关闭">' + icon("close") + "</button></header>",
        '<div class="better-codex-auto-dispatch-help-panels">',
        '<section class="better-codex-auto-dispatch-help-panel is-manual">',
        '<div class="better-codex-auto-dispatch-help-heading">' + icon("user") + "<h3>手动运行</h3></div>",
        "<p>手动运行时，只有点击“立即开始任务”才会触发智能体任务。</p>",
        "</section>",
        '<div class="better-codex-auto-dispatch-help-divider" aria-hidden="true"></div>',
        '<section class="better-codex-auto-dispatch-help-panel is-auto">',
        '<div class="better-codex-auto-dispatch-help-heading">' + icon("refresh") + "<h3>自动运行</h3></div>",
        "<p>自动运行时，只要 Issue 不在「待规划」区，你发送的新消息都会触发任务；「待规划」里的 Issue 不会自动触发。</p>",
        "</section>",
        "</div>",
        '<footer><button type="button" data-help-close>知道了</button></footer>',
        "</div>",
      ].join("");
      const finish = () => {
        dialog.close();
        dialog.remove();
      };
      dialog.querySelectorAll("[data-help-close]").forEach(button => button.addEventListener("click", finish));
      dialog.addEventListener("cancel", event => { event.preventDefault(); finish(); });
      bindModalDismiss(dialog, finish);
      document.body.appendChild(dialog);
      dialog.showModal();
    }

    function syncAutoDispatch() {
      const button = panel?.querySelector("#better-codex-auto-dispatch");
      if (!button) return;
      const label = state.autoDispatch ? "自动运行" : "手动运行";
      button.classList.toggle("is-on", state.autoDispatch);
      button.setAttribute("aria-pressed", String(state.autoDispatch));
      button.removeAttribute("title");
      button.setAttribute("aria-label", state.autoDispatch ? "切换为手动运行" : "切换为自动运行");
      button.innerHTML = icon(state.autoDispatch ? "refresh" : "user") + "<span>" + label + "</span>";
    }

    function render() {
      if (!panel) return;
      panel.dataset.surface = state.surface;
      renderAgents();
      syncAutoDispatch();
      const runningCount = state.issues.filter(issue => issue.active_run_status === "running" || issue.active_run_status === "claimed" || issue.reply_status === "running").length;
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
      const visible = state.issues.filter(issue => {
        const assigned = Boolean(issue.agent_enabled || issue.user_assigned);
        const matchesView = state.view === "all"
          || (state.view === "assigned" && assigned)
          || (state.view === "unassigned" && !assigned)
          || (state.view === "agent" && Boolean(issue.agent_enabled));
        return matchesView && issueMatchesFilters(issue);
      });
      const project = state.projects.find(item => item.id === state.projectId);
      panel.querySelector("#better-codex-board").innerHTML = Object.entries(statusLabels).map(([status, statusLabel]) => {
        const issues = visible.filter(issue => issue.status === status);
        const cards = issues.map(issue => {
          const enrichmentLocked = issue.enrichment_status === "pending";
          const assignedAgent = state.agents.find(agent => agent.id === issue.agent_id);
          const defaultAgent = state.agents.find(agent => agent.is_default);
          const assignee = issue.agent_enabled
            ? (assignedAgent || defaultAgent || { name: "Codex", is_default: true })
            : null;
          const agentName = assignee?.name || "";
          const activityAgent = assignee || defaultAgent || { name: "Codex", is_default: true };
          const replyStatus = issue.reply_status || "idle";
          const replyActivityState = replyStatus === "running" ? "replying" : replyStatus === "failed" ? "reply-failed" : replyStatus === "succeeded" ? "reply-succeeded" : "";
          const activityState = issue.active_run_status || replyActivityState;
          const replyActivity = !issue.active_run_status && Boolean(replyActivityState);
          const activity = activityState
            ? '<span class="better-codex-activity" data-run="' + escapeHtml(activityState) + '">' + agentAvatarMarkup(activityAgent, "better-codex-card-avatar") + '<span class="' + (replyActivityState === "replying" || issue.active_run_status === "running" ? "better-codex-shimmer" : "") + '">' + (replyActivity ? (replyStatus === "running" ? "回复中" : replyStatus === "failed" ? "回复失败" : "回复完成") : issue.active_run_status === "running" ? "Working" : "Queued") + '</span></span>'
            : "";
          const description = String(issue.description || "").replace(/[#*_\`~>\[\]()]/g, "").replace(/\s+/g, " ").trim();
          const issueProject = state.projects.find(item => item.id === issue.project_id) || project;
          const projectChip = issueProject?.name
            ? '<span class="better-codex-chip">' + icon("folder") + '<span>' + escapeHtml(issueProject.name) + '</span></span>'
            : "";
          const labelChips = (issue.labels || []).map(value => '<span class="better-codex-chip">' + escapeHtml(value) + '</span>').join("");
          const chips = projectChip + labelChips;
          const meta = assignee
            ? '<span class="better-codex-card-assignee">' + agentAvatarMarkup(assignee, "better-codex-card-avatar") + '<span>' + escapeHtml(agentName || "Codex") + '</span></span>'
            : issue.user_assigned
              ? '<span class="better-codex-card-assignee"><span class="better-codex-card-avatar is-user is-initials" style="background:' + escapeHtml(state.user.color || "#16a34a") + '">' + escapeHtml(state.user.initials || "你") + '</span><span>' + escapeHtml(state.user.name || "我") + '</span></span>'
              : '<span class="better-codex-card-assignee is-empty">' + icon("user") + '<span>未分配</span></span>';
          return '<article class="better-codex-card' + (issue.id === draggingIssueId ? " is-dragging" : "") + (enrichmentLocked ? " is-enrichment-pending" : "") + '" draggable="' + String(!enrichmentLocked) + '" aria-disabled="' + String(enrichmentLocked) + '" data-issue-id="' + escapeHtml(issue.id) + '"><div class="better-codex-card-row"><div class="better-codex-card-id">' + priorityIcon(issue.priority) + '<span>' + escapeHtml(issue.identifier) + '</span></div>' + activity + '</div><div class="better-codex-card-title">' + escapeHtml(issue.title) + '</div>' + (description ? '<div class="better-codex-card-description">' + escapeHtml(description) + '</div>' : "") + (chips ? '<div class="better-codex-chip-row">' + chips + '</div>' : "") + '<div class="better-codex-card-meta">' + meta + '<span>更新于 ' + timeAgo(issue.updated_at) + '</span></div></article>';
        }).join("");
        return '<section class="better-codex-column" data-status="' + status + '"><div class="better-codex-column-head"><span class="better-codex-column-title">' + statusIcon(status) + '<span>' + statusLabel + '</span><span>' + issues.length + '</span></span><span class="better-codex-column-actions"><button class="better-codex-column-icon" type="button" data-add-status="' + status + '" aria-label="新建任务">' + icon("plus") + '</button></span></div><div class="better-codex-cards">' + (cards || '<div class="better-codex-empty">暂无任务</div>') + '</div></section>';
      }).join("");
    }

    async function loadIssues(options = {}) {
      if (options.background && draggingIssueId) return;
      const query = new URLSearchParams();
      if (state.search) query.set("search", state.search);
      state.issues = await api("/api/issues" + (query.toString() ? "?" + query : ""));
      render();
    }

    async function loadAgents(options = {}) {
      const agents = await api("/api/agents");
      const changed = JSON.stringify(agents) !== JSON.stringify(state.agents);
      state.agents = agents;
      if (options.preserveInspector && panel?.dataset.surface === "agents" && state.agentPane !== "preview") return;
      if (options.background && (state.agentPane !== "preview" || !changed)) return;
      render();
    }

    async function loadSurface(options = {}) {
      if (state.surface === "agents") await loadAgents(options);
      else await loadIssues(options);
    }

    async function load() {
      clearError();
      try {
        const bootstrap = await api("/api/bootstrap");
        applyAppearance(bootstrap.appearance);
        state.locale = bootstrap.locale === "zh-CN" ? "zh-CN" : "en";
        if (bootstrap.user && typeof bootstrap.user === "object") state.user = bootstrap.user;
        state.projects = bootstrap.projects;
        state.agents = bootstrap.agents || [];
        state.agentModelCatalog = bootstrap.agentModelCatalog || (bootstrap.agentModels || []).map(id => ({ id, displayName: id, description: "", isDefault: false, defaultReasoningEffort: "medium", supportedReasoningEfforts: (bootstrap.agentReasoningEfforts || []).map(value => ({ value, description: "" })) }));
        state.agentModels = state.agentModelCatalog.map(model => model.id);
        state.agentReasoningEfforts = bootstrap.agentReasoningEfforts || [];
        state.autoDispatch = Boolean(bootstrap.autoDispatch);
        syncAutoDispatch();
        const context = readContext();
        if (context.projectId) {
          await ensureContextProject(context);
        } else if (!state.projects.some(item => item.id === state.projectId)) {
          state.projectId = state.projects.find(item => item.id === rememberedProjectId)?.id || state.projects[0]?.id || "";
        }
        if (state.projectId) localStorage.setItem(PROJECT_KEY, state.projectId);
        await loadSurface({ preserveInspector: true });
      } catch (error) {
        const board = panel?.querySelector("#better-codex-board");
        const message = error instanceof Error ? error.message : "无法连接 Better Codex Runtime";
        showError(message);
        if (board) board.innerHTML = '<div class="better-codex-empty">' + escapeHtml(message) + " · 点击刷新重试</div>";
      }
    }

    function startAgentCreate(draft = null) {
      agentInspectorClosing = false;
      state.agentPane = "create";
      state.selectedAgentId = "";
      state.agentDraft = draft
        ? { ...draft, avatar: draft.avatar || ("icon:" + draft.key) }
        : { avatar: "icon:bot" };
      renderAgents();
      setTimeout(() => panel?.querySelector('[data-agent-form="create"] [name="name"]')?.focus(), 0);
    }

    function onAgentSubmit(event) {
      const form = event.target.closest("[data-agent-form]");
      if (!form) return;
      event.preventDefault();
      const mode = form.dataset.agentForm;
      const selected = state.agents.find(agent => agentKey(agent) === form.dataset.agentKey);
      const submit = form.querySelector('[type="submit"]');
      const error = form.querySelector(".better-codex-agent-inspector-error");
      const body = {
        name: form.elements.name?.value || selected?.name || "Codex",
        description: form.elements.description?.value || "",
        instructions: form.elements.instructions?.value || "",
        model: form.elements.model.value,
        reasoning_effort: form.elements.reasoning_effort.value,
        max_concurrency: Number(form.elements.max_concurrency?.value || 5),
        avatar: form.elements.avatar?.value || "",
        ...(selected && !selected.is_default ? { version: selected.version } : {})
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
          error.textContent = caught instanceof Error ? caught.message : "保存失败";
          error.hidden = false;
          submit.disabled = false;
        }
      });
    }

    function onAgentsClick(event) {
      if (suppressAgentOutside) return;
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
         picker.querySelector("[data-agent-picker-label]").textContent = name === "model" ? modelLabel(value) : effortLabel(value);
        picker.querySelectorAll("[data-agent-option]").forEach(row => {
          const selected = row.dataset.agentOptionValue === value;
          row.classList.toggle("is-selected", selected);
          row.setAttribute("aria-selected", String(selected));
          row.querySelector("svg")?.remove();
          if (selected) row.insertAdjacentHTML("beforeend", icon("check"));
        });
        picker.classList.remove("is-open");
        picker.querySelector("[data-agent-picker-toggle]").setAttribute("aria-expanded", "false");
        if (name === "model") {
          const efforts = effortsForModel(value);
          const effortPicker = form.querySelector('[data-agent-picker="reasoning_effort"]');
          const oldEffort = form.elements.reasoning_effort.value;
          const modelDefault = state.agentModelCatalog.find(item => item.id === value)?.defaultReasoningEffort;
          const nextEffort = efforts.some(item => item.value === oldEffort) ? oldEffort : modelDefault || efforts[0]?.value || "medium";
          effortPicker.outerHTML = agentPicker("reasoning_effort", "推理", nextEffort, efforts);
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
      if (event.target.closest("[data-agent-close-pane]")) return closeAgentInspector();
      const deleteButton = event.target.closest("[data-agent-delete]");
      if (deleteButton) {
        const agent = state.agents.find(item => agentKey(item) === deleteButton.dataset.agentKey);
        if (!agent || agent.is_default) return;
        void confirmAction("删除智能体", '确定删除智能体 “' + agent.name + '” 吗？', "删除").then(confirmed => {
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
    }

    async function openEditor(issue = null, initialStatus = "todo") {
      state.agents = await api("/api/agents");
      state.selected = issue;
      document.getElementById("better-codex-dialog")?.remove();
      const context = readContext();
      const project = state.projects.find(item => item.id === state.projectId);
      const draft = {
        mode: issue ? "manual" : state.createMode,
        title: issue?.title || "",
        description: issue?.description || "",
        prompt: issue?.description || "",
        agentId: issue?.agent_id || "",
        assignee: issue
          ? (issue.agent_enabled ? (issue.agent_id || "codex") : issue.user_assigned ? "user" : "none")
          : "none",
        status: issue?.status || initialStatus,
        priority: issue?.priority || "none",
        labels: (issue?.labels || []).join(", "),
        projectId: issue?.project_id || state.projectId,
        expanded: false,
        reply: "",
        attachments: []
      };
      const dialog = document.createElement("dialog");
      dialog.id = "better-codex-dialog";
      dialog.setAttribute(OWNED, "true");
      let projectDismiss = null;
      let selectDismiss = null;
      let conversationTimer = null;
      const sessionId = issueSessionId(issue);
      const enrichmentLocked = Boolean(issue?.enrichment_status === "pending");

      function stopConversationPoll() {
        if (conversationTimer !== null) {
          clearTimeout(conversationTimer);
          conversationTimer = null;
        }
      }

      function syncDraft() {
        const form = dialog.querySelector("form");
        if (!form) return;
        const values = new FormData(form);
        if (draft.mode === "manual") {
          draft.title = String(values.get("title") || "");
          draft.description = String(values.get("description") || "");
          draft.status = String(values.get("status") || draft.status);
          draft.priority = String(values.get("priority") || draft.priority);
          draft.assignee = String(values.get("assignee") || draft.assignee || "none");
          draft.labels = String(values.get("labels") || "");
          draft.reply = String(values.get("reply") || "");
        } else {
          draft.prompt = String(values.get("prompt") || "");
          draft.agentId = String(values.get("agent_id") || "");
        }
      }

      function header() {
        const openThreadButton = issue && sessionId && !enrichmentLocked
          ? '<button class="better-codex-dialog-open-thread" type="button" data-dialog-open-thread="' + escapeHtml(sessionId) + '">在会话中打开</button>'
          : "";
        const startNowButton = issue && !enrichmentLocked && !sessionId && !state.autoDispatch && issue.agent_enabled && !issue.active_run_status
          ? '<button class="better-codex-dialog-start-now" type="button" data-dialog-start-now>立即开始任务</button>'
          : "";
        const title = draft.mode === "agent" ? "通过智能体创建" : issue ? "Issue 详情" : "手动创建";
        const crumb = issue
          ? '<span>' + escapeHtml(project?.name || "Better Codex") + '</span><span aria-hidden="true">' + icon("chevron") + '</span><strong>' + title + '</strong>'
          : '<strong>' + title + '</strong>';
        return '<div class="better-codex-dialog-head"><div class="better-codex-dialog-breadcrumb">' + crumb + '</div><div class="better-codex-dialog-head-actions">' + openThreadButton + startNowButton + '<button class="better-codex-icon-button" type="button" data-dialog-expand aria-label="' + (draft.expanded ? "缩小" : "展开") + '">' + icon(draft.expanded ? "shrink" : "expand") + '</button><button class="better-codex-icon-button" type="button" data-dialog-close aria-label="关闭">' + icon("close") + '</button></div></div>';
      }

      function conversationPanel() {
        if (!issue || !sessionId) return "";
        return '<section class="better-codex-conversation"><div class="better-codex-conversation-head"><span>对话</span><span class="better-codex-conversation-status" data-conversation-status data-state="idle">加载中…</span></div><div class="better-codex-timeline" data-conversation-body><p class="better-codex-markdown-empty">加载对话…</p></div></section><div class="better-codex-composer"><textarea name="reply" rows="2" placeholder="在此回复智能体…" aria-label="回复">' + escapeHtml(draft.reply) + '</textarea><button class="better-codex-composer-send" type="button" data-conversation-send>发送</button></div>';
      }

      function relativeTime(value) {
        if (!value) return "";
        const time = Date.parse(value);
        if (!Number.isFinite(time)) return "";
        const delta = Math.max(0, Date.now() - time);
        const minute = 60 * 1000;
        const hour = 60 * minute;
        const day = 24 * hour;
        if (delta < minute) return "刚刚";
        if (delta < hour) return Math.floor(delta / minute) + " 分钟前";
        if (delta < day) return Math.floor(delta / hour) + " 小时前";
        if (delta < day * 30) return Math.floor(delta / day) + " 天前";
        return new Date(time).toLocaleDateString();
      }

      function conversationBubbles(messages, profile = null) {
        const agent = state.agents.find(item => item.id === issue?.agent_id) || state.agents.find(item => item.is_default) || null;
        const agentName = agent?.name || (issue?.agent_enabled ? "Codex" : "智能体");
        const user = profile && profile.name ? profile : state.user || { name: "你", initials: "你", color: "#16a34a" };
        if (profile && profile.name) state.user = { ...state.user, ...profile };
        return (messages || []).map(message => {
          const isUser = message.role === "user";
          const avatar = isUser
            ? '<span class="better-codex-bubble-avatar is-user is-initials" style="background:' + escapeHtml(user.color || "#16a34a") + '" title="' + escapeHtml(user.handle ? "@" + user.handle : user.name || "") + '" aria-hidden="true">' + escapeHtml(user.initials || "你") + '</span>'
            : agentAvatarMarkup(agent, "better-codex-bubble-avatar");
          const name = isUser ? (user.name || "你") : agentName;
          const time = relativeTime(message.timestamp);
          return '<article class="better-codex-bubble ' + (isUser ? "is-user" : "is-agent") + '">' + avatar + '<div class="better-codex-bubble-main"><div class="better-codex-bubble-meta"><strong>' + escapeHtml(name) + '</strong>' + (time ? '<time datetime="' + escapeHtml(message.timestamp || "") + '">' + escapeHtml(time) + '</time>' : "") + '</div><div class="better-codex-bubble-content">' + (message.html || renderPlainBubble(message.markdown || "")) + '</div></div></article>';
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
        if (messages.length) {
          body.innerHTML = conversationBubbles(messages, data.user);
          body.scrollTop = body.scrollHeight;
        } else if (data?.html) {
          body.innerHTML = conversationBubbles([{ role: "agent", html: data.html, markdown: data.markdown || "", timestamp: null }], data.user);
          body.scrollTop = body.scrollHeight;
        } else {
          body.innerHTML = '<p class="better-codex-markdown-empty">' + (sessionId ? "暂无对话，可在下方回复或打开完整对话。" : "未关联对话。") + "</p>";
        }
        const reply = data?.reply || { status: "idle" };
        const stateName = reply.status || "idle";
        status.dataset.state = stateName;
        const countLabel = messages.length ? (messages.length + " 条") : "";
        status.textContent = stateName === "running" ? "回复进行中…" : stateName === "failed" ? ("回复失败" + (reply.error ? "：" + reply.error : "")) : stateName === "succeeded" ? "回复已完成" : (countLabel || (data?.found ? "已同步" : "等待对话"));
        if (send) send.disabled = stateName === "running" || !String(dialog.querySelector('[name="reply"]')?.value || "").trim();
        stopConversationPoll();
        if (stateName === "running") conversationTimer = setTimeout(() => void loadConversation({ quiet: true }), 2000);
        else if (stateName === "succeeded" && !options.afterSuccess) conversationTimer = setTimeout(() => void loadConversation({ quiet: true, afterSuccess: true }), 1200);
      }

      async function loadConversation(options = {}) {
        if (!issue || !sessionId || !dialog.isConnected) return;
        try {
          const data = await api("/api/issues/" + encodeURIComponent(issue.id) + "/conversation");
          applyConversation(data, options);
        } catch (error) {
          if (options.quiet) {
            conversationTimer = setTimeout(() => void loadConversation({ quiet: true }), 2500);
            return;
          }
          applyConversation({ html: "", found: false, reply: { status: "failed", error: error instanceof Error ? error.message : "加载失败" } });
        }
      }

      async function sendReply() {
        const textarea = dialog.querySelector('[name="reply"]');
        const send = dialog.querySelector("[data-conversation-send]");
        const errorOutput = dialog.querySelector(".better-codex-dialog-error");
        const message = String(textarea?.value || "").trim();
        if (!issue || !sessionId || !message) return;
        send.disabled = true;
        errorOutput.hidden = true;
        try {
          const reply = await api("/api/issues/" + encodeURIComponent(issue.id) + "/reply", { method: "POST", body: JSON.stringify({ message }) });
          draft.reply = "";
          if (textarea) textarea.value = "";
          applyConversation({ html: dialog.querySelector("[data-conversation-body]")?.innerHTML || "", found: true, reply });
          conversationTimer = setTimeout(() => void loadConversation({ quiet: true }), 1500);
        } catch (error) {
          errorOutput.textContent = error instanceof Error ? error.message : "发送失败";
          errorOutput.hidden = false;
          send.disabled = false;
        }
      }

      function projectPicker() {
        const selectedProject = state.projects.find(item => item.id === draft.projectId);
        const options = state.projects.map(item => '<button class="better-codex-project-option" type="button" data-dialog-project-option="' + escapeHtml(item.id) + '">' + icon("folder") + '<span>' + escapeHtml(item.name) + '</span><span class="better-codex-project-check">' + (item.id === draft.projectId ? icon("check") : "") + '</span></button>').join("");
        return '<span class="better-codex-project-picker"><button class="better-codex-property" type="button" data-dialog-project>' + icon("folder") + '<span data-project-label>' + escapeHtml(selectedProject?.name || "选择项目") + '</span>' + icon("chevron") + '</button><span class="better-codex-project-menu" hidden><input class="better-codex-project-search" type="search" placeholder="搜索项目..." aria-label="搜索项目"><span data-project-options>' + (options || '<span class="better-codex-project-empty">暂无项目</span>') + '</span></span></span>';
      }

      function dialogSelect(name, ariaLabel, selected, options, modifier = "") {
        const current = options.find(option => option.value === selected) || options[0] || { value: "", label: "未提供", visual: "" };
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
        return '<div class="better-codex-agent-picker"><span>指派给</span>' + dialogSelect("agent_id", "选择执行智能体", selectedAgent?.id || draft.agentId, options, "is-agent") + '</div>';
      }

      function assigneePicker() {
        const defaultAgent = state.agents.find(agent => agent.is_default) || { name: "Codex", is_default: true, id: "" };
        const userVisual = () => '<span class="better-codex-agent-avatar is-user is-initials" style="background:' + escapeHtml(state.user.color || "#16a34a") + '">' + escapeHtml(state.user.initials || "你") + "</span>";
        const options = [
          { value: "none", label: "未指派", visual: () => icon("user") },
          { value: "user", label: state.user.name || "我", visual: userVisual },
          { value: "codex", label: agentOptionLabel(defaultAgent, defaultAgent.name || "Codex"), tags: agentConfigTags(defaultAgent), visual: () => agentAvatarMarkup(defaultAgent, "better-codex-agent-avatar") },
          ...state.agents.filter(agent => !agent.is_default).map(agent => ({
            value: agent.id,
            label: agentOptionLabel(agent, agent.name),
            tags: agentConfigTags(agent),
            visual: () => agentAvatarMarkup(agent, "better-codex-agent-avatar")
          }))
        ];
        return '<div class="better-codex-agent-picker"><span>指派给</span>' + dialogSelect("assignee", "选择责任人", draft.assignee || "none", options, "is-assignee") + '</div>';
      }

      function propertyRows() {
        const projectChip = projectPicker();
        if (draft.mode === "agent") return '<div class="better-codex-dialog-properties">' + projectChip + '</div>';
        const statuses = Object.entries(statusLabels).map(([value, text]) => ({ value, label: text, visual: statusIcon(value) }));
        const priorities = Object.entries(priorityLabels).map(([value, text]) => ({ value, label: value === "none" ? "无优先级" : text + "优先级", visual: priorityIcon(value) }));
        return '<div class="better-codex-dialog-properties">' + dialogSelect("status", "状态", draft.status, statuses) + dialogSelect("priority", "优先级", draft.priority, priorities) + '<label class="better-codex-property">' + icon("tag") + '<input name="labels" value="' + escapeHtml(draft.labels) + '" placeholder="添加标签" aria-label="标签"></label>' + projectChip + '</div>';
      }

      function attachmentPaths() {
        return draft.attachments.map(item => item.path);
      }

      function withAttachments(text) {
        const paths = attachmentPaths();
        if (!paths.length) return text;
        const block = "附带文件：\\n" + paths.map(path => "- " + path).join("\\n");
        return text ? text + "\\n\\n" + block : block;
      }

      function attachmentList() {
        if (!draft.attachments.length) return '<div class="better-codex-dialog-attachments" data-dialog-attachments hidden></div>';
        const chips = draft.attachments.map((item, index) => '<span class="better-codex-attachment-chip" title="' + escapeHtml(item.path) + '">' + icon("paperclip") + '<span>' + escapeHtml(item.name) + '</span><button type="button" data-dialog-detach="' + index + '" aria-label="移除附件">' + icon("close") + '</button></span>').join("");
        return '<div class="better-codex-dialog-attachments" data-dialog-attachments>' + chips + '</div>';
      }

      function pickAttachments() {
        return new Promise(resolve => {
          const input = document.createElement("input");
          input.type = "file";
          input.multiple = true;
          input.addEventListener("change", () => {
            const files = Array.from(input.files || []);
            const selected = [];
            let skipped = 0;
            for (const file of files) {
              const path = String(file.path || "").trim();
              if (!path) {
                skipped += 1;
                continue;
              }
              selected.push({ name: file.name || path.split(/[\\\\/]/).pop() || path, path });
            }
            resolve({ files: selected, skipped, picked: files.length });
          }, { once: true });
          input.addEventListener("cancel", () => resolve({ files: [], skipped: 0, picked: 0 }), { once: true });
          input.click();
        });
      }

      function footer() {
        const switchButton = issue ? "" : '<button class="better-codex-switch-mode" type="button" data-dialog-switch>' + icon("switch") + (draft.mode === "agent" ? "切换到手动" : "切换到智能体") + '</button>';
        const submitText = issue ? "保存" : draft.mode === "agent" ? "创建" : "创建任务";
        const keepOpen = issue ? "" : '<label class="better-codex-keep-open"><input class="better-codex-toggle" name="keep" type="checkbox"' + (state.keepCreate ? " checked" : "") + '>继续创建</label>';
        return '<div class="better-codex-dialog-footer"><button class="better-codex-icon-button" type="button" data-dialog-attach aria-label="添加附件">' + icon("paperclip") + '</button><div class="better-codex-dialog-footer-right">' + switchButton + keepOpen + '<button class="better-codex-submit" type="submit">' + submitText + '</button></div></div>';
      }

      function renderDialog() {
        if (projectDismiss) document.removeEventListener("pointerdown", projectDismiss, true);
        if (selectDismiss) document.removeEventListener("pointerdown", selectDismiss, true);
        projectDismiss = null;
        selectDismiss = null;
        stopConversationPoll();
        dialog.dataset.mode = draft.mode;
        dialog.dataset.detail = issue ? "true" : "false";
        dialog.dataset.expanded = String(draft.expanded);
        dialog.dataset.locked = String(enrichmentLocked);
        if (draft.mode === "agent") {
          const selectedAgent = state.agents.find(agent => agent.id === draft.agentId);
          const selectedName = selectedAgent?.name || "Codex";
          dialog.innerHTML = '<form>' + header() + agentPicker() + '<textarea class="better-codex-dialog-editor" name="prompt" placeholder="告诉智能体要做什么，例如：&quot;修复项目里任务运行状态不可见的问题&quot;">' + escapeHtml(draft.prompt) + '</textarea>' + propertyRows() + attachmentList() + '<div class="better-codex-dialog-error" hidden></div>' + footer() + '</form>';
          dialog.querySelector(".better-codex-dialog-properties")?.insertAdjacentHTML("beforebegin", '<div class="better-codex-run-hint">' + agentAvatarMarkup(selectedAgent, "better-codex-agent-avatar") + '<span>创建后先由 ' + escapeHtml(selectedName) + ' 整理卡片，再自动开始工作。</span></div>');
        } else if (issue) {
          const descriptionEditor = sessionId
            ? '<textarea class="better-codex-dialog-editor" name="description" placeholder="添加描述..." rows="2" style="flex:0 0 auto;min-height:56px;max-height:96px">' + escapeHtml(draft.description) + '</textarea>'
            : '<textarea class="better-codex-dialog-editor" name="description" placeholder="添加描述...">' + escapeHtml(draft.description) + '</textarea>';
          dialog.innerHTML = '<form>' + header() + assigneePicker() + '<input class="better-codex-manual-title" name="title" maxlength="500" placeholder="任务标题" value="' + escapeHtml(draft.title) + '">' + descriptionEditor + conversationPanel() + propertyRows() + attachmentList() + '<div class="better-codex-dialog-error" hidden></div>' + footer() + '</form>';
        } else {
          dialog.innerHTML = '<form>' + header() + assigneePicker() + '<input class="better-codex-manual-title" name="title" maxlength="500" placeholder="任务标题" value="' + escapeHtml(draft.title) + '"><textarea class="better-codex-dialog-editor" name="description" placeholder="添加描述...">' + escapeHtml(draft.description) + '</textarea>' + propertyRows() + attachmentList() + '<div class="better-codex-dialog-error" hidden></div>' + footer() + '</form>';
        }
        const submit = dialog.querySelector(".better-codex-submit");
        const startNow = dialog.querySelector("[data-dialog-start-now]");
        const content = dialog.querySelector(draft.mode === "agent" ? '[name="prompt"]' : '[name="title"]');
        const updateSubmit = () => {
          const disabled = !String(content?.value || "").trim();
          submit.disabled = disabled;
          if (startNow) startNow.disabled = disabled;
        };
        updateSubmit();
        if (enrichmentLocked) {
          dialog.querySelectorAll("input, textarea, select, button").forEach(control => {
            if (control.matches("[data-dialog-close], [data-dialog-expand]")) return;
            control.disabled = true;
          });
        }
        content?.addEventListener("input", updateSubmit);
        dialog.querySelector('[name="keep"]')?.addEventListener("change", event => { state.keepCreate = event.currentTarget.checked; });
        const replyInput = dialog.querySelector('[name="reply"]');
        const sendButton = dialog.querySelector("[data-conversation-send]");
        const updateSend = () => {
          if (!sendButton) return;
          const status = dialog.querySelector("[data-conversation-status]")?.dataset.state;
          sendButton.disabled = status === "running" || !String(replyInput?.value || "").trim();
        };
        replyInput?.addEventListener("input", updateSend);
        sendButton?.addEventListener("click", () => void sendReply());
        replyInput?.addEventListener("keydown", event => {
          if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
            event.preventDefault();
            void sendReply();
          }
        });
        if (issue && sessionId) void loadConversation();
        const closeDialogSelects = () => {
          dialog.querySelectorAll("[data-dialog-select]").forEach(picker => {
            picker.classList.remove("is-open");
            picker.querySelector("[data-dialog-select-toggle]")?.setAttribute("aria-expanded", "false");
            const menu = picker.querySelector(".better-codex-dialog-select-menu");
            if (menu) menu.hidden = true;
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
          if (name === "status") draft.status = value;
          if (name === "priority") draft.priority = value;
          if (name === "assignee") draft.assignee = value;
          if (name === "agent_id") {
            draft.agentId = value;
            const selectedAgent = state.agents.find(agent => agent.id === draft.agentId);
            const selectedName = selectedAgent?.name || "Codex";
            const runAvatar = dialog.querySelector(".better-codex-run-hint .better-codex-agent-avatar");
            syncAgentAvatar(runAvatar, selectedAgent);
            const hint = dialog.querySelector(".better-codex-run-hint span:last-child");
            if (hint) hint.textContent = "创建后先由 " + selectedName + " 整理卡片，再自动开始工作。";
          }
          closeDialogSelects();
          picker.querySelector("[data-dialog-select-toggle]")?.focus();
        }));
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
        dialog.querySelector("[data-dialog-open-thread]")?.addEventListener("click", event => {
          const button = event.currentTarget;
          const threadId = normalizeSessionId(event.currentTarget.dataset.dialogOpenThread);
          if (!threadId || button.disabled) return;
          const errorOutput = dialog.querySelector(".better-codex-dialog-error");
          const idleLabel = button.textContent || "在对话中打开";
          clearError();
          button.disabled = true;
          button.classList.add("is-loading");
          button.setAttribute("aria-busy", "true");
          button.innerHTML = icon("refresh") + "<span>正在打开…</span>";
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
        startNow?.addEventListener("click", () => {
          syncDraft();
          void startIssueNow();
        });
        dialog.querySelector("[data-dialog-expand]")?.addEventListener("click", event => {
          draft.expanded = !draft.expanded;
          dialog.dataset.expanded = String(draft.expanded);
          const button = event.currentTarget;
          button.setAttribute("aria-label", draft.expanded ? "缩小" : "展开");
          button.innerHTML = icon(draft.expanded ? "shrink" : "expand");
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
          state.createMode = draft.mode;
          renderDialog();
          dialog.querySelector(draft.mode === "agent" ? '[name="prompt"]' : '[name="title"]')?.focus();
        });
        dialog.querySelector("[data-dialog-attach]")?.addEventListener("click", () => {
          void pickAttachments().then(result => {
            const showAttachError = message => {
              const errorOutput = dialog.querySelector(".better-codex-dialog-error");
              if (!errorOutput) return;
              errorOutput.textContent = message;
              errorOutput.hidden = false;
            };
            if (!result.picked) return;
            if (!result.files.length) return showAttachError("当前环境无法读取本地文件路径");
            const known = new Set(attachmentPaths());
            const next = result.files.filter(file => !known.has(file.path));
            if (next.length) {
              draft.attachments.push(...next);
              renderDialog();
            }
            if (result.skipped) showAttachError("部分文件无法读取本地路径，已跳过");
            dialog.querySelector(draft.mode === "agent" ? '[name="prompt"]' : '[name="title"]')?.focus();
          });
        });
        dialog.querySelectorAll("[data-dialog-detach]").forEach(button => button.addEventListener("click", event => {
          event.preventDefault();
          const index = Number(button.dataset.dialogDetach);
          if (!Number.isInteger(index) || index < 0) return;
          draft.attachments.splice(index, 1);
          renderDialog();
          dialog.querySelector(draft.mode === "agent" ? '[name="prompt"]' : '[name="title"]')?.focus();
        }));
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
        if (enrichmentLocked) return;
        const submit = dialog.querySelector(".better-codex-submit");
        const errorOutput = dialog.querySelector(".better-codex-dialog-error");
        const prompt = draft.prompt.trim();
        const title = draft.mode === "agent" ? prompt.split(/\\n/).find(line => line.trim())?.replace(/^[#*\\s-]+/, "").trim().slice(0, 120) || "" : draft.title.trim();
        if (!title) return;
        submit.disabled = true;
        errorOutput.hidden = true;
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
          if (draft.mode === "agent" && !issue && !workspacePath) {
            throw new Error("创建智能体 Issue 需要本地工作区：请先打开该项目下的一个 Codex 会话");
          }
          const body = {
            project_id: draft.projectId,
            title,
            description: withAttachments(draft.mode === "agent" ? prompt : draft.description),
            status: draft.mode === "agent" && !issue ? "todo" : draft.status,
            priority: draft.priority,
            labels: draft.labels.split(/[,，]/).map(value => value.trim()).filter(Boolean),
            workspace_path: workspacePath,
            ai_enrich: draft.mode === "agent" && !issue,
            ...assignee
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
            draft.attachments = [];
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

      async function startIssueNow() {
        if (!issue || enrichmentLocked) return;
        const button = dialog.querySelector("[data-dialog-start-now]");
        const errorOutput = dialog.querySelector(".better-codex-dialog-error");
        const agentId = draft.assignee && !["none", "user", "codex"].includes(draft.assignee) ? draft.assignee : "";
        button.disabled = true;
        errorOutput.hidden = true;
        try {
          await api("/api/issues/" + encodeURIComponent(issue.id) + "/start", {
            method: "POST",
            body: JSON.stringify({
              version: issue.version,
              title: draft.title,
              description: withAttachments(draft.description),
              status: draft.status,
              priority: draft.priority,
              labels: draft.labels.split(/[,，]/).map(value => value.trim()).filter(Boolean),
              agent_id: agentId,
            })
          });
          await loadIssues();
          dialog.close();
        } catch (error) {
          errorOutput.textContent = error instanceof Error ? error.message : "启动失败";
          errorOutput.hidden = false;
          button.disabled = false;
        }
      }

      document.body.append(dialog);
      dialog.addEventListener("close", () => {
        stopConversationPoll();
        if (projectDismiss) document.removeEventListener("pointerdown", projectDismiss, true);
        if (selectDismiss) document.removeEventListener("pointerdown", selectDismiss, true);
        dialog.remove();
      }, { once: true });
      bindModalDismiss(dialog, () => dialog.close());
      renderDialog();
      dialog.showModal();
      dialog.querySelector(draft.mode === "agent" ? '[name="prompt"]' : '[name="title"]')?.focus();
    }

    function onBoardClick(event) {
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
        if (!issue) return;
        return void perform(async () => {
          await api("/api/issues/" + encodeURIComponent(issue.id), { method: "PATCH", body: JSON.stringify({ version: issue.version, pinned: !issue.pinned }) });
          await loadIssues();
        });
      }
      const card = event.target.closest("[data-issue-id]");
      const issue = state.issues.find(item => item.id === card?.dataset.issueId);
      if (issue && issue.enrichment_status !== "pending") return void perform(() => openEditor(issue));
    }

    function onCardDragStart(event) {
      const card = event.target.closest("[data-issue-id]");
      if (!card || !event.dataTransfer) return;
      const issueId = card.dataset.issueId || "";
      const issue = state.issues.find(item => item.id === issueId);
      if (issue?.enrichment_status === "pending") return;
      draggingIssueId = issueId;
      event.dataTransfer.setData("text/plain", issueId);
      event.dataTransfer.effectAllowed = "move";
      const host = panel || document.getElementById(PANEL_ID) || document.body;
      const ghost = card.cloneNode(true);
      ghost.removeAttribute("draggable");
      ghost.removeAttribute("data-issue-id");
      ghost.classList.remove("is-dragging");
      ghost.classList.add("is-drag-ghost");
      ghost.setAttribute(OWNED, "true");
      const rect = card.getBoundingClientRect();
      const canvas = getComputedStyle(panel || document.documentElement).getPropertyValue("--bc-color-canvas").trim()
        || getComputedStyle(document.documentElement).getPropertyValue("--bc-page").trim()
        || "#ffffff";
      ghost.style.cssText = [
        "box-sizing:border-box",
        "width:" + card.offsetWidth + "px",
        "margin:0",
        "position:fixed",
        "top:" + rect.top + "px",
        "left:" + rect.left + "px",
        "opacity:1",
        "pointer-events:none",
        "z-index:2147483000",
        "background:" + canvas,
      ].join(";");
      host.appendChild(ghost);
      draggingGhost = ghost;
      draggingGhostOffsetX = Math.max(12, event.clientX - rect.left);
      draggingGhostOffsetY = Math.max(12, event.clientY - rect.top);
      const transparentDragImage = document.createElement("canvas");
      transparentDragImage.width = 1;
      transparentDragImage.height = 1;
      transparentDragImage.style.position = "fixed";
      transparentDragImage.style.left = "-10000px";
      host.appendChild(transparentDragImage);
      event.dataTransfer.setDragImage(transparentDragImage, 0, 0);
      card.classList.add("is-dragging");
      requestAnimationFrame(() => transparentDragImage.remove());
    }

    function onCardDragMove(event) {
      updateDraggingGhostPosition(event);
    }

    function onCardDragOver(event) {
      event.preventDefault();
      updateDraggingGhostPosition(event);
    }

    function updateDraggingGhostPosition(event) {
      if (!draggingGhost || (!event.clientX && !event.clientY)) return;
      draggingGhost.style.left = Math.round(event.clientX - draggingGhostOffsetX) + "px";
      draggingGhost.style.top = Math.round(event.clientY - draggingGhostOffsetY) + "px";
    }

    function onCardDragEnd(event) {
      draggingIssueId = "";
      draggingGhost?.remove();
      draggingGhost = null;
      event.target.closest("[data-issue-id]")?.classList.remove("is-dragging");
      document.querySelectorAll(".better-codex-card.is-dragging").forEach(node => node.classList.remove("is-dragging"));
    }

    function onDrop(event) {
      event.preventDefault();
      const id = event.dataTransfer?.getData("text/plain");
      const status = event.target.closest("[data-status]")?.dataset.status;
      const issue = state.issues.find(item => item.id === id);
      if (!issue || issue.enrichment_status === "pending" || !status || issue.status === status) return;
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
      sessionStorage.setItem(RESUME_SURFACE_KEY, surface);
      active = true;
      ensureEntry();
      mountPanel();
      void load();
      if (pollTimer === null) pollTimer = setInterval(() => { if (active) void perform(() => loadSurface({ background: true })); }, 3000);
    }

    function close(options = {}) {
      const resume = Boolean(options.resume);
      if (resume) sessionStorage.setItem(RESUME_SURFACE_KEY, state.surface);
      else sessionStorage.removeItem(RESUME_SURFACE_KEY);
      active = false;
      closeFilterMenu();
      closeCreateMenu();
      closeIssueMenu();
      if (pollTimer !== null) {
        clearInterval(pollTimer);
        pollTimer = null;
      }
      if (panel) panel.hidden = true;
      restoreNative();
      ensureEntry();
    }

    function findThreadRow(expected) {
      return Array.from(document.querySelectorAll(SELECTORS.threadRow)).find(item => normalizeSessionId(item.getAttribute(ATTRIBUTES.threadId)) === expected);
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
      return normalizeSessionId(activeRow?.getAttribute(ATTRIBUTES.threadId));
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
      const row = findThreadRow(expected);
      close();
      if (!row) window.postMessage({ type: NAVIGATION.messageType, path: NAVIGATION.threadRoutePrefix + encodeURIComponent(expected) }, window.location.origin);
      const result = await waitForThreadOpen(expected);
      close();
      return result;
    }

    function onClick(event) {
      if (!active || suppressAgentOutside) return;
      const target = event.target?.closest?.("button,a,[role='button']," + SELECTORS.threadRow);
      if (!target || target === entry || target === agentsEntry || target.closest("#" + PANEL_ID) || target.closest("#better-codex-dialog") || target.closest("#better-codex-agent-dialog") || target.closest("#better-codex-avatar-picker")) return;
      if (target.closest(SELECTORS.sidebarNavigation)) close();
    }

    function refresh() {
      const entriesAvailable = ensureEntry();
      if (!entriesAvailable) {
        if (active) close({ resume: true });
        return;
      }
      const resumeSurface = sessionStorage.getItem(RESUME_SURFACE_KEY);
      if (!active && ["issues", "agents"].includes(resumeSurface)) return open(resumeSurface);
      if (active) mountPanel();
    }

    function scheduleRefresh() {
      if (refreshPending || destroyed) return;
      refreshPending = true;
      queueMicrotask(() => {
        refreshPending = false;
        if (destroyed) return;
        refresh();
        localizeOwnedTree(document.body);
      });
    }

    function destroy() {
      if (destroyed) return;
      destroyed = true;
      refreshPending = false;
      if (pollTimer !== null) clearInterval(pollTimer);
      if (updateTimer !== null) clearInterval(updateTimer);
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
      ["light", "dark"].forEach(mode => ["canvas", "ink", "accent", "surface", "control", "raised", "hover", "pressed", "hairline"].forEach(token => document.documentElement.style.removeProperty("--bc-host-" + mode + "-" + token)));
      delete window.__betterCodexBridgeResolve;
      delete window.__betterCodexInjection__;
    }

    function mount() {
      document.removeEventListener("DOMContentLoaded", mount);
      if (destroyed || observer || !document.documentElement) return;
      observer = new MutationObserver(scheduleRefresh);
      observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ["class", "data-theme", "aria-current", ATTRIBUTES.threadActive] });
      refresh();
      localizeOwnedTree(document.body);
      void checkUpdateNotice();
      updateTimer = setInterval(checkUpdateNotice, 15000);
    }

    window.__betterCodexInjection__ = { version: VERSION, endpoint: BASE_URL, refresh, open, close, destroy };
    document.addEventListener("click", onClick, true);
    if (document.documentElement) mount();
    else document.addEventListener("DOMContentLoaded", mount, { once: true });
    return { installed: true, reused: false };
  })()`;
}
