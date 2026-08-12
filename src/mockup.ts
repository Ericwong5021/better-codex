import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { mockupStatePath } from "./config.js";

const statuses = ["backlog", "todo", "in_progress", "in_review", "done", "blocked"];
const priorities = ["none", "low", "medium", "high", "urgent"];
const runStatuses = ["not-started", "claimed", "running", "scheduling", "completed", "failed", "interrupted"];
const projectId = "mockup-better-codex";

export const mockupPath = mockupStatePath;
export const maxMockupBytes = 16 * 1024 * 1024;
export type MockupLocale = "zh-CN" | "en";

type MockupRecord = Record<string, unknown>;

export type MockupState = {
  version: number;
  revision: number;
  auto_dispatch: boolean;
  scheduler_model: string;
  scheduler_reasoning_effort: string;
  project: MockupRecord;
  projects: MockupRecord[];
  agents: MockupRecord[];
  issues: MockupRecord[];
};

type MockupDocument = {
  version: 3;
  locales: Record<MockupLocale, MockupState>;
};

export function normalizeMockupLocale(value: unknown): MockupLocale {
  return String(value || "").trim().toLowerCase() === "en" ? "en" : "zh-CN";
}

function defaultAgents(locale: MockupLocale) {
  if (locale === "en") {
    return [
      { id: "", role: "codex", name: "Codex", description: "General task handling", instructions: "", model: "gpt-5.6-sol", reasoning_effort: "high", sandbox_mode: "danger-full-access", is_default: true, max_concurrency: 4, avatar: "", version: 1 },
      { id: "agent-product", role: "product", name: "Product Planning", description: "Clarify requirements, design solutions, and define acceptance criteria", instructions: "", model: "gpt-5.6-sol", reasoning_effort: "high", sandbox_mode: "workspace-write", is_default: false, max_concurrency: 3, avatar: "icon:docs", version: 1 },
      { id: "agent-engineering", role: "engineering", name: "Engineering", description: "Handle frontend and backend implementation, integration, and delivery", instructions: "", model: "gpt-5.6-terra", reasoning_effort: "medium", sandbox_mode: "workspace-write", is_default: false, max_concurrency: 5, avatar: "icon:frontend", version: 1 },
      { id: "agent-quality", role: "quality", name: "Quality Assurance", description: "Locate defects, run regression checks, and enforce release gates", instructions: "", model: "gpt-5.6-sol", reasoning_effort: "high", sandbox_mode: "workspace-write", is_default: false, max_concurrency: 5, avatar: "icon:reviewer", version: 1 },
    ];
  }
  return [
    { id: "", role: "codex", name: "Codex", description: "拆解里程碑、协调依赖并跟进交付节奏", instructions: "", model: "gpt-5.6-sol", reasoning_effort: "high", sandbox_mode: "danger-full-access", is_default: true, max_concurrency: 4, avatar: "", version: 1 },
    { id: "agent-product", role: "product", name: "产品策划", description: "负责需求澄清、方案设计和验收口径", instructions: "", model: "gpt-5.6-sol", reasoning_effort: "high", sandbox_mode: "workspace-write", is_default: false, max_concurrency: 3, avatar: "icon:docs", version: 1 },
    { id: "agent-engineering", role: "engineering", name: "工程实现", description: "负责前后端开发、联调和技术交付", instructions: "", model: "gpt-5.6-terra", reasoning_effort: "medium", sandbox_mode: "workspace-write", is_default: false, max_concurrency: 5, avatar: "icon:frontend", version: 1 },
    { id: "agent-quality", role: "quality", name: "质量保障", description: "负责缺陷定位、回归检查和发布门禁", instructions: "", model: "gpt-5.6-sol", reasoning_effort: "high", sandbox_mode: "workspace-write", is_default: false, max_concurrency: 5, avatar: "icon:reviewer", version: 1 },
  ];
}

function agentId(agents: MockupRecord[], name: string) {
  if (name === "Codex") return null;
  return String(agents.find(agent => agent.name === name)?.id || "") || null;
}

function defaultIssues(agents: MockupRecord[], locale: MockupLocale) {
  const specs = locale === "en" ? [
    ["PM-101", "Simplify Issue templates", "Reduce extra formatting when creating tasks and keep only the task details, Skill instructions, and taskid.", "backlog", "urgent", "Codex", ["Issue", "Product"], "not-started"],
    ["PM-108", "Unify Issue creation entry points", "Make the top button and board-column shortcuts share the project, status, and default Agent values.", "todo", "medium", "Codex", ["Issue", "Creation"], "claimed"],
    ["PM-122", "Wait for Windows hardware regression", "Verify PNA, CDP connectivity, and card dragging on the Windows target machine.", "in_review", "high", "Engineering", ["Windows", "Blocked"], "interrupted"],
    ["PM-115", "Verify ownership after Agent deletion", "Confirm that related Issues become unassigned after an Agent is deleted and do not fall back to the default Agent.", "in_review", "medium", "Quality Assurance", ["Agent", "Data consistency"], "failed"],
    ["PM-103", "Research Codex session recovery boundaries", "Confirm session recovery behavior after app restarts, thread switches, and interrupted runs.", "in_review", "medium", "Engineering", ["Session", "Research"], "interrupted"],
    ["PM-102", "Review task card information density", "Adjust the visual hierarchy of titles, projects, labels, Agents, and run status.", "backlog", "high", "Product Planning", ["Board", "Interaction"], "not-started"],
    ["PM-104", "Evaluate cross-project workspace switching", "Review path, filter, and context-retention rules when switching between local repositories.", "backlog", "low", "Codex", ["Workspace", "Planning"], "not-started"],
    ["PM-124", "Confirm the Windows CDP compatibility range", "Document supported Codex versions, port discovery methods, and known limitations.", "backlog", "low", "Product Planning", ["Windows", "Planning"], "not-started"],
    ["PM-106", "Complete Mockup data import validation", "Validate duplicate IDs, invalid relations, file size, and card version fields.", "backlog", "high", "Engineering", ["Mockup", "Data"], "not-started"],
    ["PM-126", "Evaluate board column collapse interaction", "Research how to hide low-frequency status columns in narrow windows while keeping count indicators.", "backlog", "low", "Codex", ["Board", "Responsive"], "not-started"],
    ["PM-105", "Improve the Agent configuration form", "Unify the editing experience for models, reasoning levels, permissions, and avatars.", "todo", "urgent", "Product Planning", ["Agent", "Settings"], "claimed"],
    ["PM-127", "Align run status copy", "Unify the backend status values with the waiting, working, completed, failed, and interrupted copy on cards.", "todo", "none", "Engineering", ["Runtime", "Copy"], "claimed"],
    ["PM-128", "Review the Runtime Supervisor reconnect plan", "Complete automatic recovery paths for process exits, port changes, and Codex restarts.", "todo", "low", "Quality Assurance", ["Runtime", "Reconnect"], "claimed"],
    ["PM-109", "Refactor Mockup JSON persistence", "Persist projects, Agents, Issues, run status, and board order together in JSON.", "in_progress", "urgent", "Engineering", ["Mockup", "Persistence"], "running"],
    ["PM-110", "Fix card order synchronization after dragging", "Synchronize the destination column, preceding card, and sort value after dragging, including version conflicts.", "in_progress", "high", "Engineering", ["Drag", "Ordering"], "running"],
    ["PM-111", "Add Agent run status polling", "Automatically update Claimed, Running, and Completed statuses on task cards.", "in_progress", "high", "Codex", ["Agent", "Runtime"], "running"],
    ["PM-112", "Link project filtering and search", "Make project filters, assignee filters, and keyword search work together on board results.", "in_progress", "medium", "Product Planning", ["Filter", "Search"], "claimed"],
    ["PM-123", "Fix the blocked session reply queue", "Release the queue after a reply failure so subsequent messages can continue sending.", "in_progress", "medium", "Quality Assurance", ["Session", "Queue"], "running"],
    ["PM-113", "Review Issue concurrency version conflicts", "Verify that concurrent edits, duplicate submissions, and stale writes return clear conflicts.", "in_review", "urgent", "Quality Assurance", ["Concurrency", "Review"], "completed"],
    ["PM-114", "Regress Codex dragging under zoom", "Check the native drag preview, drop target, and scrolling behavior at different zoom levels.", "in_review", "high", "Quality Assurance", ["Codex", "Drag"], "running"],
    ["PM-116", "Review board run status styling", "Check the colors and copy for waiting, running, completed, failed, and interrupted states.", "in_review", "low", "Product Planning", ["Board", "Status"], "completed"],
    ["PM-117", "Complete multi-project Mockup support", "Mockup can now save multiple projects and show the related project label on cards.", "done", "high", "Engineering", ["Mockup", "Multi-project"], "completed"],
    ["PM-118", "Fix card identifier attribute escaping", "Fix incomplete data-issue-id values caused by special characters and the resulting drag failures.", "done", "medium", "Quality Assurance", ["DOM", "Bug"], "completed"],
    ["PM-119", "Add Runtime health checks", "Show the current runtime port, process, database, and compatibility-layer status.", "done", "medium", "Codex", ["Runtime", "Health check"], "completed"],
    ["PM-120", "Verify the Mockup import/export loop", "Confirm that a complete exported state can be imported again and immediately refresh projects, Agents, and the board.", "done", "low", "Product Planning", ["Mockup", "Acceptance"], "completed"],
    ["PM-121", "Wait for Codex compatibility verification", "A new DOM structure requires regression coverage for the injection entry point and main panel.", "blocked", "urgent", "Codex", ["Compatibility", "Blocked"], "failed"],
    ["PM-107", "Fix sidebar count synchronization", "Locate the issue that prevents task counts from updating after filtering and background refreshes.", "blocked", "high", "Quality Assurance", ["Sidebar", "Bug"], "failed"],
    ["PM-125", "Cancel the multi-Agent orchestration experiment", "Keep the current phase focused on a stable single-user Issue, Thread, and Review loop.", "backlog", "medium", "Product Planning", ["Agent", "Scope control"], "interrupted", true],
  ] as const : [
    ["PM-101", "规划 Issue 模板精简", "减少创建任务时的额外编排，只保留任务详情、Skill 指令和 taskid。", "backlog", "urgent", "Codex", ["Issue", "产品"], "not-started"],
    ["PM-108", "统一 Issue 创建入口", "让顶部按钮和看板列快捷入口共享项目、状态与 Agent 默认值。", "todo", "medium", "Codex", ["Issue", "创建"], "claimed"],
    ["PM-122", "等待 Windows 真机回归", "需要在 Windows 目标机器验证 PNA、CDP 连接和卡片拖拽。", "in_review", "high", "工程实现", ["Windows", "阻塞"], "interrupted"],
    ["PM-115", "校验 Agent 删除后的任务归属", "确认删除 Agent 后相关 Issue 变为未分配且不会错误回退到默认 Agent。", "in_review", "medium", "质量保障", ["Agent", "数据一致性"], "failed"],
    ["PM-103", "调研 Codex 会话恢复边界", "确认应用重启、线程切换和运行中断后的会话恢复行为。", "in_review", "medium", "工程实现", ["会话", "调研"], "interrupted"],
    ["PM-102", "梳理任务卡片信息密度", "调整标题、项目、标签、Agent 与运行状态的视觉层级。", "backlog", "high", "产品策划", ["看板", "交互"], "not-started"],
    ["PM-104", "评估跨项目工作区切换", "梳理多个本地仓库切换时的路径、筛选与上下文保留规则。", "backlog", "low", "Codex", ["工作区", "规划"], "not-started"],
    ["PM-124", "确认 Windows CDP 兼容范围", "整理受支持的 Codex 版本、端口发现方式和已知限制。", "backlog", "low", "产品策划", ["Windows", "规划"], "not-started"],
    ["PM-106", "补齐 Mockup 数据导入校验", "校验重复 ID、失效关联、文件大小和卡片版本字段。", "backlog", "high", "工程实现", ["Mockup", "数据"], "not-started"],
    ["PM-126", "评估看板列折叠交互", "研究窄窗口下隐藏低频状态列并保留数量提示的方式。", "backlog", "low", "Codex", ["看板", "响应式"], "not-started"],
    ["PM-105", "优化 Agent 配置表单", "统一模型、推理等级、权限和头像配置的编辑体验。", "todo", "urgent", "产品策划", ["Agent", "设置"], "claimed"],
    ["PM-127", "对齐运行状态展示文案", "统一后端状态值与卡片上的等待、工作中、完成、失败和中断文案。", "todo", "none", "工程实现", ["Runtime", "文案"], "claimed"],
    ["PM-128", "评审 Runtime Supervisor 重连方案", "补齐进程退出、端口变化和 Codex 重启后的自动恢复路径。", "todo", "low", "质量保障", ["Runtime", "重连"], "claimed"],
    ["PM-109", "重构 Mockup JSON 持久化", "把项目、Agent、Issue、运行状态和看板顺序统一保存到 JSON。", "in_progress", "urgent", "工程实现", ["Mockup", "持久化"], "running"],
    ["PM-110", "修复拖拽后卡片顺序同步", "拖动卡片后同步目标列、前置卡片和排序值，并处理版本冲突。", "in_progress", "high", "工程实现", ["拖拽", "排序"], "running"],
    ["PM-111", "接入 Agent 运行状态轮询", "让 Claimed、Running、Completed 等状态自动更新到任务卡片。", "in_progress", "high", "Codex", ["Agent", "Runtime"], "running"],
    ["PM-112", "实现项目筛选与搜索联动", "项目筛选、负责人筛选和关键词搜索需要共同作用于看板结果。", "in_progress", "medium", "产品策划", ["筛选", "搜索"], "claimed"],
    ["PM-123", "修复会话回复队列阻塞", "处理回复失败后队列未释放，导致后续消息无法继续发送的问题。", "in_progress", "medium", "质量保障", ["会话", "队列"], "running"],
    ["PM-113", "审核 Issue 并发版本冲突处理", "验证并发修改、重复提交和旧版本写入都能返回明确冲突。", "in_review", "urgent", "质量保障", ["并发", "审核"], "completed"],
    ["PM-114", "回归 Codex 缩放下拖拽", "在不同缩放比例下检查原生拖拽预览、落点和滚动行为。", "in_review", "high", "质量保障", ["Codex", "拖拽"], "running"],
    ["PM-116", "评审看板运行状态样式", "检查等待、运行、完成、失败和中断状态的颜色与文案。", "in_review", "low", "产品策划", ["看板", "状态"], "completed"],
    ["PM-117", "完成多项目 Mockup 支持", "Mockup 已能保存多个项目并在卡片上展示对应项目标签。", "done", "high", "工程实现", ["Mockup", "多项目"], "completed"],
    ["PM-118", "修复卡片标识属性转义", "修复特殊字符导致 data-issue-id 不完整并影响拖拽的问题。", "done", "medium", "质量保障", ["DOM", "缺陷"], "completed"],
    ["PM-119", "接入 Runtime 健康检查", "展示运行时端口、进程、数据库和兼容层的当前状态。", "done", "medium", "Codex", ["Runtime", "健康检查"], "completed"],
    ["PM-120", "验证 Mockup 导入导出闭环", "确认导出的完整状态可以再次导入并立即刷新项目、Agent 和看板。", "done", "low", "产品策划", ["Mockup", "验收"], "completed"],
    ["PM-121", "等待 Codex 新版本兼容性验证", "新版本 DOM 结构发生变化，需要完成注入入口和主面板回归。", "blocked", "urgent", "Codex", ["兼容性", "阻塞"], "failed"],
    ["PM-107", "修复侧边栏计数不同步", "定位筛选和后台刷新后任务数量未及时更新的问题。", "blocked", "high", "质量保障", ["侧边栏", "缺陷"], "failed"],
    ["PM-125", "取消多 Agent 自动编排实验", "当前阶段继续聚焦单用户 Issue、Thread 与 Review 的稳定闭环。", "backlog", "medium", "产品策划", ["Agent", "范围控制"], "interrupted", true],
  ] as const;
  const now = Date.now();
  return specs.map((spec, index) => ({
    id: `mockup-${spec[0].slice(4)}`,
    identifier: spec[0],
    project_id: projectId,
    title: spec[1],
    description: spec[2],
    status: spec[3],
    priority: spec[4],
    sort_order: (index + 1) * 1000,
    pinned: false,
    archived_at: spec[8] ? new Date(now - (index + 3) * 60000).toISOString() : null,
    thread_id: null,
    run_thread_id: null,
    workspace_path: "",
    version: 1,
    created_at: new Date(now - (index + 20) * 60000).toISOString(),
    updated_at: new Date(now - (index + 3) * 60000).toISOString(),
    agent_enabled: true,
    agent_id: agentId(agents, spec[5]),
    mockup_agent_name: spec[5],
    user_assigned: false,
    needs_attention: false,
    pending_actor: "user",
    enrichment_status: null,
    reply_draft: "",
    session_handoff_at: null,
    labels: [...spec[6]],
    mockup_run_status: spec[7],
  }));
}

export function defaultMockupState(locale: MockupLocale = "zh-CN"): MockupState {
  const agents = defaultAgents(locale);
  const project = locale === "en"
    ? { id: projectId, external_id: "mockup", name: "Better Codex Desktop", workspace_path: "" }
    : { id: projectId, external_id: "mockup", name: "better-codex", workspace_path: "" };
  return {
    version: 1,
    revision: 1,
    auto_dispatch: false,
    scheduler_model: "gpt-5.6-sol",
    scheduler_reasoning_effort: "high",
    project,
    projects: [project],
    agents,
    issues: defaultIssues(agents, locale),
  };
}

function asRecord(value: unknown): MockupRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("invalid_mockup_data");
  return value as MockupRecord;
}

function normalizeAgent(value: unknown, index: number): MockupRecord {
  const source = asRecord(value);
  if (index > 0 && source.is_default === true) throw new Error("invalid_mockup_agent");
  const isDefault = index === 0;
  const name = isDefault ? "Codex" : String(source.name || "").trim();
  if (!name || name.length > 80) throw new Error("invalid_mockup_agent");
  const id = isDefault ? "" : String(source.id || `mockup-agent-${index}`);
  if (!isDefault && !id) throw new Error("invalid_mockup_agent");
  const description = String(source.description || "");
  const instructions = String(source.instructions || "");
  const avatar = String(source.avatar || "");
  if (description.length > 500 || instructions.length > 100000 || avatar.length > 400000) throw new Error("invalid_mockup_agent");
  const maxConcurrency = Number(source.max_concurrency ?? 5);
  if (!Number.isInteger(maxConcurrency) || maxConcurrency < 1 || maxConcurrency > 20) throw new Error("invalid_mockup_agent");
  return {
    ...source,
    id,
    role: String(source.role || (isDefault ? "codex" : "custom")),
    name,
    description,
    instructions,
    model: String(source.model || "gpt-5.6-sol"),
    reasoning_effort: String(source.reasoning_effort || "medium"),
    sandbox_mode: String(source.sandbox_mode || "workspace-write"),
    is_default: isDefault,
    max_concurrency: maxConcurrency,
    avatar,
    version: Number.isInteger(source.version) ? source.version : 1,
  };
}

function normalizeIssue(value: unknown, index: number): MockupRecord {
  const source = asRecord(value);
  const title = String(source.title || "").trim();
  const description = String(source.description || "");
  const replyDraft = String(source.reply_draft || "");
  const labels = Array.isArray(source.labels) ? source.labels.map(String).filter(Boolean) : [];
  if (!title || title.length > 500 || description.length > 100000 || replyDraft.length > 100000) throw new Error("invalid_mockup_issue");
  if (labels.length > 50 || labels.some(label => label.length > 100)) throw new Error("invalid_mockup_issue");
  const now = new Date().toISOString();
  const legacyCancelled = source.status === "cancelled";
  const mockupRunStatus = runStatuses.includes(String(source.mockup_run_status)) ? String(source.mockup_run_status) : "not-started";
  return {
    ...source,
    id: String(source.id || `mockup-import-${index + 1}`),
    identifier: String(source.identifier || `BET-${index + 20}`),
    project_id: String(source.project_id || projectId),
    title,
    description,
    status: legacyCancelled ? "backlog" : statuses.includes(String(source.status)) ? source.status : "backlog",
    priority: priorities.includes(String(source.priority)) ? source.priority : "none",
    sort_order: Number.isFinite(Number(source.sort_order)) ? Number(source.sort_order) : (index + 1) * 1000,
    pinned: Boolean(source.pinned),
    archived_at: source.archived_at || (legacyCancelled ? source.updated_at || now : null),
    thread_id: source.thread_id || null,
    run_thread_id: null,
    workspace_path: String(source.workspace_path || ""),
    version: Number.isInteger(source.version) ? source.version : 1,
    created_at: String(source.created_at || now),
    updated_at: String(source.updated_at || now),
    agent_enabled: Boolean(source.agent_enabled),
    agent_id: source.agent_id ? String(source.agent_id) : null,
    mockup_agent_name: String(source.mockup_agent_name || ""),
    user_assigned: Boolean(source.user_assigned),
    needs_attention: legacyCancelled ? false : Boolean(source.needs_attention),
    pending_actor: legacyCancelled ? "user" : source.pending_actor === "agent" ? "agent" : "user",
    enrichment_status: source.enrichment_status === "pending" ? "pending" : null,
    reply_draft: replyDraft,
    session_handoff_at: source.session_handoff_at ? String(source.session_handoff_at) : null,
    labels,
    mockup_run_status: mockupRunStatus,
    active_run_status: ["claimed", "running", "scheduling"].includes(mockupRunStatus) ? mockupRunStatus : null,
    latest_run_status: mockupRunStatus === "not-started" ? null : mockupRunStatus,
  };
}

export function normalizeMockupState(value: unknown): MockupState {
  const source = asRecord(value);
  if (!Array.isArray(source.agents) || !Array.isArray(source.issues)) throw new Error("invalid_mockup_data");
  if (source.agents.length > 100 || source.issues.length > 500) throw new Error("invalid_mockup_data");
  const agents = source.agents.map(normalizeAgent);
  if (!agents.length || agents[0].is_default !== true) throw new Error("invalid_mockup_data");
  const agentIds = agents.map(agent => String(agent.id || ""));
  if (new Set(agentIds).size !== agentIds.length) throw new Error("invalid_mockup_data");
  const issues = source.issues.map(normalizeIssue);
  const schedulerModel = String(source.scheduler_model || "gpt-5.6-sol").trim();
  const schedulerReasoningEffort = String(source.scheduler_reasoning_effort || "high").trim();
  if (!schedulerModel || schedulerModel.length > 200 || schedulerModel.includes("\0") || !schedulerReasoningEffort || schedulerReasoningEffort.length > 20 || schedulerReasoningEffort.includes("\0")) throw new Error("invalid_mockup_data");
  const projectSource = Array.isArray(source.projects) && source.projects.length ? source.projects : [source.project || {}];
  const projects = projectSource.map((value, index) => {
    const item = asRecord(value);
    const id = String(item.id || (index === 0 ? projectId : `mockup-project-${index + 1}`));
    const name = String(item.name || "").trim();
    if (!id || !name || name.length > 120) throw new Error("invalid_mockup_data");
    return { ...item, id, external_id: String(item.external_id || id), name, workspace_path: String(item.workspace_path || "") };
  });
  const primaryIndex = projects.findIndex(project => project.id === projectId);
  if (primaryIndex < 0) throw new Error("invalid_mockup_data");
  const projectIds = projects.map(project => String(project.id));
  if (new Set(projectIds).size !== projectIds.length) throw new Error("invalid_mockup_data");
  const issueIds = issues.map(issue => String(issue.id));
  const identifiers = issues.map(issue => String(issue.identifier));
  if (new Set(issueIds).size !== issueIds.length || new Set(identifiers).size !== identifiers.length) throw new Error("invalid_mockup_data");
  const agentNames = new Map(agents.map(agent => [String(agent.id || ""), String(agent.name)]));
  for (const issue of issues) {
    if (!projectIds.includes(String(issue.project_id))) throw new Error("invalid_mockup_data");
    if (issue.agent_enabled && issue.user_assigned) throw new Error("invalid_mockup_data");
    const assignedId = issue.agent_id === null ? "" : String(issue.agent_id || "");
    if (issue.agent_enabled && !agentNames.has(assignedId)) throw new Error("invalid_mockup_data");
    if (!issue.agent_enabled && issue.agent_id !== null) throw new Error("invalid_mockup_data");
    issue.mockup_agent_name = issue.agent_enabled ? agentNames.get(assignedId) || "" : "";
  }
  issues.sort((left, right) => Number(Boolean(right.pinned)) - Number(Boolean(left.pinned)) || Number(left.sort_order) - Number(right.sort_order) || String(left.created_at).localeCompare(String(right.created_at)));
  const state = {
    version: Number.isInteger(source.version) ? source.version as number : 1,
    revision: Number.isInteger(source.revision) && Number(source.revision) > 0 ? source.revision as number : 1,
    auto_dispatch: source.auto_dispatch === true,
    scheduler_model: schedulerModel,
    scheduler_reasoning_effort: schedulerReasoningEffort,
    project: projects[primaryIndex],
    projects,
    agents,
    issues,
  };
  if (Buffer.byteLength(JSON.stringify(state)) > maxMockupBytes) throw new Error("mockup_data_too_large");
  return state;
}

function normalizeMockupDocument(value: unknown): MockupDocument {
  const source = asRecord(value);
  if (source.locales && typeof source.locales === "object" && !Array.isArray(source.locales)) {
    const locales = source.locales as Record<string, unknown>;
    const english = Number(source.version) >= 3 ? normalizeMockupState(locales.en || defaultMockupState("en")) : defaultMockupState("en");
    return {
      version: 3,
      locales: {
        "zh-CN": normalizeMockupState(locales["zh-CN"] || defaultMockupState("zh-CN")),
        en: english,
      },
    };
  }
  return {
    version: 3,
    locales: {
      "zh-CN": normalizeMockupState(value),
      en: defaultMockupState("en"),
    },
  };
}

function writeMockupDocument(document: MockupDocument) {
  if (Buffer.byteLength(JSON.stringify(document)) > maxMockupBytes) throw new Error("mockup_data_too_large");
  mkdirSync(dirname(mockupPath), { recursive: true });
  const temporary = `${mockupPath}.${process.pid}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(document, null, 2)}\n`, { mode: 0o600 });
  renameSync(temporary, mockupPath);
  return document;
}

function readMockupDocument() {
  if (!existsSync(mockupPath)) return writeMockupDocument({ version: 3, locales: { "zh-CN": defaultMockupState("zh-CN"), en: defaultMockupState("en") } });
  try {
    const value = JSON.parse(readFileSync(mockupPath, "utf8"));
    const source = asRecord(value);
    const document = normalizeMockupDocument(value);
    const locales = source.locales && typeof source.locales === "object" && !Array.isArray(source.locales) ? source.locales as Record<string, unknown> : null;
    return locales?.["zh-CN"] && locales.en && JSON.stringify(value) === JSON.stringify(document) ? document : writeMockupDocument(document);
  } catch {
    const backup = `${mockupPath}.invalid-${Date.now()}`;
    renameSync(mockupPath, backup);
    return writeMockupDocument({ version: 3, locales: { "zh-CN": defaultMockupState("zh-CN"), en: defaultMockupState("en") } });
  }
}

export function writeMockupState(value: unknown, locale: MockupLocale = "zh-CN") {
  const document = readMockupDocument();
  const state = normalizeMockupState(value);
  document.locales[locale] = state;
  writeMockupDocument(document);
  return state;
}

export function updateMockupState<T>(locale: MockupLocale, mutate: (state: MockupState) => T) {
  const document = readMockupDocument();
  const state = document.locales[locale];
  const result = mutate(state);
  state.revision += 1;
  writeMockupDocument(document);
  return { state, result };
}

export function replaceMockupState(locale: MockupLocale, value: unknown) {
  const document = readMockupDocument();
  const current = document.locales[locale];
  const state = normalizeMockupState(value);
  state.revision = current.revision + 1;
  state.agents.forEach(agent => { agent.version = state.revision; });
  state.issues.forEach(issue => { issue.version = state.revision; });
  document.locales[locale] = state;
  writeMockupDocument(document);
  return state;
}

export function readMockupState(locale: MockupLocale = "zh-CN") {
  return readMockupDocument().locales[locale];
}

export function resetMockupState(locale: MockupLocale = "zh-CN") {
  const document = readMockupDocument();
  const current = document.locales[locale];
  const state = defaultMockupState(locale);
  state.revision = current.revision + 1;
  state.agents.forEach(agent => { agent.version = state.revision; });
  state.issues.forEach(issue => { issue.version = state.revision; });
  document.locales[locale] = state;
  writeMockupDocument(document);
  return state;
}
