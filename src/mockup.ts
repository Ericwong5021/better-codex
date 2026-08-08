import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { mockupStatePath } from "./config.js";

const statuses = ["backlog", "todo", "in_progress", "in_review", "done", "blocked", "cancelled"];
const priorities = ["none", "low", "medium", "high", "urgent"];
const runStatuses = ["not-started", "claimed", "running", "completed", "failed", "interrupted"];
const projectId = "mockup-better-codex";

export const mockupPath = mockupStatePath;
export const maxMockupBytes = 16 * 1024 * 1024;

type MockupRecord = Record<string, unknown>;

export type MockupState = {
  version: number;
  revision: number;
  auto_dispatch: boolean;
  project: MockupRecord;
  projects: MockupRecord[];
  agents: MockupRecord[];
  issues: MockupRecord[];
};

function defaultAgents() {
  return [
    { id: "", role: "codex", name: "Codex", description: "通用任务处理", instructions: "", model: "gpt-5.6-sol", reasoning_effort: "medium", sandbox_mode: "danger-full-access", is_default: true, max_concurrency: 5, avatar: "", version: 1 },
    { id: "mockup-reviewer", role: "reviewer", name: "代码审查", description: "检查改动的正确性、回归风险和可维护性", instructions: "", model: "gpt-5.6-sol", reasoning_effort: "high", sandbox_mode: "workspace-write", is_default: false, max_concurrency: 5, avatar: "icon:reviewer", version: 1 },
    { id: "mockup-frontend", role: "frontend", name: "前端实现", description: "负责 Codex 原生风格的界面实现与视觉验证", instructions: "", model: "gpt-5.6-terra", reasoning_effort: "medium", sandbox_mode: "workspace-write", is_default: false, max_concurrency: 5, avatar: "icon:frontend", version: 1 },
    { id: "mockup-debugger", role: "debugger", name: "问题排查", description: "定位崩溃、回归和异常行为的根因", instructions: "", model: "gpt-5.6-sol", reasoning_effort: "high", sandbox_mode: "workspace-write", is_default: false, max_concurrency: 5, avatar: "icon:debugger", version: 1 },
  ];
}

function agentId(agents: MockupRecord[], name: string) {
  if (name === "Codex") return null;
  return String(agents.find(agent => agent.name === name)?.id || "") || null;
}

function defaultIssues(agents: MockupRecord[]) {
  const specs = [
    ["BET-20", "修复任务卡片拖拽错位", "复现缩放状态下的卡片拖拽偏移，并修正坐标计算与落点反馈。", "backlog", "urgent", "问题排查", ["问题排查"], "not-started"],
    ["BET-21", "重写首页首屏价值主张", "提炼 Better Codex 的核心价值，让新访客快速理解产品用途。", "backlog", "high", "Codex", ["文案"], "not-started"],
    ["BET-22", "调研独立开发者工作流", "整理从想法到交付的常见流程、主要痛点和决策节点。", "backlog", "medium", "Codex", ["调研"], "not-started"],
    ["BET-23", "整理本地安装步骤", "核对安装、启动与常见异常处理步骤，统一文档表达。", "backlog", "high", "Codex", ["文档"], "not-started"],
    ["BET-24", "优化首次启动加载速度", "定位启动阶段主要耗时，缩短进入任务看板前的等待时间。", "in_progress", "urgent", "问题排查", ["性能"], "claimed"],
    ["BET-25", "整理功能亮点短文案", "为任务分派、会话协作和代码审核分别撰写简洁说明。", "todo", "medium", "Codex", ["文案"], "not-started"],
    ["BET-26", "对比三款任务看板体验", "对比 Linear、Notion 和 Trello 的卡片密度、拖拽与筛选体验。", "in_progress", "medium", "前端实现", ["调研"], "claimed"],
    ["BET-27", "撰写产品发布介绍", "围绕目标用户、核心问题和使用方式准备公开发布稿。", "todo", "high", "Codex", ["写作"], "not-started"],
    ["BET-28", "完善会话回复失败提示", "梳理超时、网络异常和权限问题的提示文案与重试入口。", "in_progress", "urgent", "问题排查", ["问题排查"], "running"],
    ["BET-29", "优化空状态引导语", "重写空看板与空会话的标题、说明和首个行动提示。", "in_progress", "medium", "前端实现", ["前端实现"], "running"],
    ["BET-30", "收集首批用户常见问题", "汇总安装、任务分派、运行状态和数据存储相关问题。", "in_progress", "medium", "Codex", ["调研"], "running"],
    ["BET-31", "准备更新日志发布稿", "整理本次新增、修复和已知限制，形成可直接发布的更新日志。", "in_progress", "medium", "Codex", ["写作"], "claimed"],
    ["BET-32", "统一看板筛选状态", "检查筛选逻辑与顶部计数，确保切换后卡片结果同步更新。", "in_review", "high", "代码审查", ["代码审查"], "completed"],
    ["BET-33", "检查 Windows 安装流程", "核对安装、启动、权限与卸载流程，记录关键异常。", "in_review", "high", "问题排查", ["问题排查"], "running"],
    ["BET-34", "起草用户访谈邀请信", "说明访谈目的、所需时间和隐私边界，给出清晰回复方式。", "in_review", "low", "Codex", ["写作"], "completed"],
    ["BET-35", "归档版本发布资料", "整理版本说明、截图、校验结果和发布链接，方便后续复盘。", "in_review", "low", "Codex", ["文档"], "completed"],
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
    archived_at: null,
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
    labels: [...spec[6]],
    mockup_run_status: spec[7],
  }));
}

export function defaultMockupState(): MockupState {
  const agents = defaultAgents();
  const project = { id: projectId, external_id: "mockup", name: "better-codex", workspace_path: "" };
  return {
    version: 1,
    revision: 1,
    auto_dispatch: false,
    project,
    projects: [project],
    agents,
    issues: defaultIssues(agents),
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
  const name = String(source.name || "").trim();
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
  const mockupRunStatus = runStatuses.includes(String(source.mockup_run_status)) ? String(source.mockup_run_status) : "not-started";
  return {
    ...source,
    id: String(source.id || `mockup-import-${index + 1}`),
    identifier: String(source.identifier || `BET-${index + 20}`),
    project_id: String(source.project_id || projectId),
    title,
    description,
    status: statuses.includes(String(source.status)) ? source.status : "backlog",
    priority: priorities.includes(String(source.priority)) ? source.priority : "none",
    sort_order: Number.isFinite(Number(source.sort_order)) ? Number(source.sort_order) : (index + 1) * 1000,
    pinned: Boolean(source.pinned),
    archived_at: source.archived_at || null,
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
    needs_attention: Boolean(source.needs_attention),
    pending_actor: source.pending_actor === "agent" ? "agent" : "user",
    enrichment_status: source.enrichment_status === "pending" ? "pending" : null,
    reply_draft: replyDraft,
    labels,
    mockup_run_status: mockupRunStatus,
    active_run_status: ["claimed", "running"].includes(mockupRunStatus) ? mockupRunStatus : null,
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
    project: projects[primaryIndex],
    projects,
    agents,
    issues,
  };
  if (Buffer.byteLength(JSON.stringify(state)) > maxMockupBytes) throw new Error("mockup_data_too_large");
  return state;
}

export function writeMockupState(value: unknown) {
  const state = normalizeMockupState(value);
  mkdirSync(dirname(mockupPath), { recursive: true });
  const temporary = `${mockupPath}.${process.pid}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(state, null, 2)}\n`, { mode: 0o600 });
  renameSync(temporary, mockupPath);
  return state;
}

export function updateMockupState<T>(mutate: (state: MockupState) => T) {
  const state = readMockupState();
  const result = mutate(state);
  state.revision += 1;
  return { state: writeMockupState(state), result };
}

export function replaceMockupState(value: unknown) {
  const current = readMockupState();
  const state = normalizeMockupState(value);
  state.revision = current.revision + 1;
  state.agents.forEach(agent => { agent.version = state.revision; });
  state.issues.forEach(issue => { issue.version = state.revision; });
  return writeMockupState(state);
}

export function readMockupState() {
  if (!existsSync(mockupPath)) return writeMockupState(defaultMockupState());
  try {
    return normalizeMockupState(JSON.parse(readFileSync(mockupPath, "utf8")));
  } catch {
    const backup = `${mockupPath}.invalid-${Date.now()}`;
    renameSync(mockupPath, backup);
    return writeMockupState(defaultMockupState());
  }
}

export function resetMockupState() {
  const current = readMockupState();
  const state = defaultMockupState();
  state.revision = current.revision + 1;
  state.agents.forEach(agent => { agent.version = state.revision; });
  state.issues.forEach(issue => { issue.version = state.revision; });
  return writeMockupState(state);
}
