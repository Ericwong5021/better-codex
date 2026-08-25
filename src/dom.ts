import { activeCompatibility, coreVersion } from "./compatibility.js";
import { betterCodexLogoPng } from "./brand-assets.js";
import { betterCodexProfile } from "./config.js";
import { betterCodexDesignSystemCss } from "./design-system.js";
import { renderMarkdown } from "./markdown.js";
import { betterCodexMcpRoute } from "./mcp-app.js";
import { featureManifest } from "./features.js";
import { injectedUiBundle, injectedUiBundleChecksum, injectedUiBundleSchemaVersion } from "./generated/injected-ui.js";
import { desktopNativeCommands, sessionNativeCommands } from "./native-commands.js";
import { avatarColors } from "./user-profile.js";
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
  CircleGauge,
  CircleHelp,
  CircleSlash2,
  Cloud,
  Columns3,
  Copy,
  Database,
  Download,
  Ellipsis,
  Eye,
  EyeOff,
  ExternalLink,
  FileCode2,
  FlaskConical,
  FolderOpen,
  Folder,
  Hand,
  Image,
  LayoutTemplate,
  ListEnd,
  ListFilter,
  LoaderCircle,
  Maximize2,
  Minimize2,
  Minus,
  Moon,
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
  Sun,
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
  Zap,
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
  eye: Eye,
  eyeOff: EyeOff,
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
  queue: ListEnd,
  bug: Bug,
  terminal: Terminal,
  wrench: Wrench,
  fast: Zap,
  code: FileCode2,
  test: FlaskConical,
  docs: BookOpen,
  shield: ShieldCheck,
  permissionReadOnly: Hand,
  permissionWorkspace: FolderOpen,
  permissionDanger: TriangleAlert,
  database: Database,
  download: Download,
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
  usage: CircleGauge,
  moon: Moon,
  sun: Sun,
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

export function injectionBundleChecksum() {
  return injectedUiBundleChecksum;
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
  if (injectedUiBundleSchemaVersion !== 1 || !/^[0-9a-f]{64}$/.test(injectedUiBundleChecksum) || !injectedUiBundle.includes("BetterCodexInjected")) {
    throw new Error("injected_ui_bundle_invalid");
  }
  const compatibility = activeCompatibility();
  const config = {
    schemaVersion: injectedUiBundleSchemaVersion,
    bundleChecksum: injectedUiBundleChecksum,
    version: compatibility.version,
    coreVersion,
    profile: betterCodexProfile,
    host,
    sessionNativeCommands,
    desktopNativeCommands,
    helpModeMarkdown: {
      "zh-CN": {
        manual: renderMarkdown("点击 {{start}}，或者在已完成的会话卡片中 {{send}} 新消息，智能体才会执行任务。"),
        auto: renderMarkdown("{{agent}} 会主动执行分配给自己的任务，但是不会执行 {{backlog}} 区域的任务。"),
      },
      en: {
        manual: renderMarkdown("Click {{start}}, or use {{send}} to post a new message in a completed conversation card. Only then will the agent run the task."),
        auto: renderMarkdown("{{agent}} automatically runs tasks assigned to it, but does not run {{backlog}} tasks."),
      },
    },
    baseUrl: `http://127.0.0.1:${port}`,
    bridgeToken: accessToken,
    logoUrl: `data:image/png;base64,${betterCodexLogoPng().toString("base64")}`,
    initialLocale: locale,
    selectors: compatibility.selectors,
    attributes: compatibility.attributes,
    navigation: compatibility.navigation,
    betterCodexRoute: betterCodexMcpRoute,
    featureManifest: featureManifest(),
    lucideIcons,
    agentAvatarPresets,
    userAvatarColors: avatarColors,
    designSystemCss: betterCodexDesignSystemCss(),
    suggestedAgents,
  };
  return `${injectedUiBundle}\nBetterCodexInjected.install(${JSON.stringify(config)})`;
}
