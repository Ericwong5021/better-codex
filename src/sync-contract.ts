import type { IssuePriority, IssueReplyStatus, IssueSessionStatus, IssueStatus } from "./db.js";
import type { ConversationMessage } from "./session-transcript.js";

export const legacySyncProtocolVersion = "sync/v5" as const;
export const previousSyncProtocolVersion = "sync/v6" as const;
export const syncProtocolVersion = "sync/v7" as const;
export const supportedSyncProtocolVersions = [syncProtocolVersion, previousSyncProtocolVersion, legacySyncProtocolVersion] as const;
export type SyncProtocolVersion = typeof supportedSyncProtocolVersions[number];
export const syncEntityTypes = ["project", "issue", "agent_directory"] as const;
export type SyncEntityType = typeof syncEntityTypes[number];

export type AgentProjection = {
  id: string;
  role: string;
  name: string;
  name_en: string;
  description: string;
  model?: string;
  reasoning_effort?: string;
  avatar: string;
  version: number;
  created_at: string;
  updated_at: string;
};

export type AgentDirectoryProjection = {
  id: string;
  agents: AgentProjection[];
  default_avatar: string;
  local_revision: number;
};

export const projectDocumentKeys = ["charter", "product", "architecture", "roadmap", "work", "delivery", "evidence"] as const;
export type ProjectDocumentKey = typeof projectDocumentKeys[number];
export type ProjectDocumentViewStatus = "idle" | "queued" | "generating" | "ready" | "failed";
export type ProjectDocumentDiagram = {
  nodes: Array<{ id: string; label: string; group: string; detail: string }>;
  edges: Array<{ from: string; to: string; label: string }>;
};
export type ProjectDocumentView = {
  key: ProjectDocumentKey;
  status: ProjectDocumentViewStatus;
  markdown: string;
  html: string;
  diagram: ProjectDocumentDiagram | null;
  error: string | null;
  updated_at: string | null;
};

export type ProjectProjection = {
  id: string;
  name: string;
  identifier_prefix: string;
  root_paths: string[];
  description: string;
  overview_html: string;
  overview_status: "idle" | "generating" | "ready" | "failed";
  overview_error: string | null;
  overview_updated_at: string | null;
  document_views?: ProjectDocumentView[];
  document_agent_id?: string | null;
  document_feedback?: string;
  created_at: string;
  updated_at: string;
  local_revision: number;
};

export type IssueProjection = {
  id: string;
  identifier: string;
  project_id: string;
  title: string;
  description: string;
  status: IssueStatus;
  priority: IssuePriority;
  labels: string[];
  sort_order: number;
  pinned: boolean;
  archived_at: string | null;
  assigned: boolean;
  agent_enabled: boolean;
  agent_id: string | null;
  user_assigned: boolean;
  pending_actor: "user" | "agent";
  active_run_status: "claimed" | "running" | "scheduling" | null;
  latest_run_status: "claimed" | "running" | "scheduling" | "completed" | "failed" | "interrupted" | null;
  latest_scheduler_status: "pending" | "running" | "completed" | "failed" | "interrupted" | null;
  session_status: IssueSessionStatus | null;
  reply_status: IssueReplyStatus;
  has_conversation: boolean;
  last_activity_finished_at: string | null;
  needs_attention: boolean;
  created_at: string;
  updated_at: string;
  local_revision: number;
};

export type RuntimeProjection = {
  device_id: string;
  device_name: string;
  protocol_version: SyncProtocolVersion;
  core_version: string;
  last_seen_at: string;
  last_sync_at: string | null;
  queue_depth: number;
  health_state: "online" | "offline";
  usage?: CodexUsageProjection | null;
  agent_models?: AgentModelCatalogProjection[];
  auto_dispatch?: boolean;
  scheduler_model?: string;
  scheduler_reasoning_effort?: string;
  default_agent_model?: string;
  default_agent_reasoning_effort?: string;
};

export type AgentReasoningEffortProjection = {
  value: string;
  description: string;
};

export type AgentModelCatalogProjection = {
  id: string;
  displayName: string;
  description: string;
  isDefault: boolean;
  defaultReasoningEffort: string;
  supportedReasoningEfforts: AgentReasoningEffortProjection[];
};

export type CodexUsageWindowProjection = {
  usedPercent: number;
  remainingPercent: number;
  windowDurationMins: number;
  resetsAt: number;
};

export type CodexUsageProjection = {
  planType: string;
  primary: CodexUsageWindowProjection | null;
  secondary: CodexUsageWindowProjection | null;
};

function usageNumber(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function normalizeUsageWindow(value: unknown): CodexUsageWindowProjection | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const source = value as Record<string, unknown>;
  const usedPercent = usageNumber(source.usedPercent);
  const windowDurationMins = usageNumber(source.windowDurationMins);
  const resetsAt = usageNumber(source.resetsAt);
  if (usedPercent === null || windowDurationMins === null || resetsAt === null || windowDurationMins <= 0 || resetsAt <= 0) return null;
  const used = Math.min(100, Math.max(0, Math.round(usedPercent)));
  return {
    usedPercent: used,
    remainingPercent: 100 - used,
    windowDurationMins: Math.round(windowDurationMins),
    resetsAt: Math.round(resetsAt),
  };
}

export function normalizeCodexUsageProjection(value: unknown): CodexUsageProjection | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const source = value as Record<string, unknown>;
  const primary = normalizeUsageWindow(source.primary);
  const secondary = normalizeUsageWindow(source.secondary);
  if (!primary && !secondary) return null;
  return {
    planType: typeof source.planType === "string" ? source.planType.trim().slice(0, 40) : "",
    primary,
    secondary,
  };
}

function projectionString(value: unknown, limit: number) {
  return typeof value === "string" && !value.includes("\0") ? value.trim().slice(0, limit) : "";
}

function requiredProjectionString(value: unknown, limit: number) {
  if (typeof value !== "string" || !value.trim() || value.length > limit || value.includes("\0")) throw new Error("invalid_projection");
  return value;
}

function optionalProjectionString(value: unknown, limit: number) {
  if (value === undefined) return "";
  if (typeof value !== "string" || value.length > limit || value.includes("\0")) throw new Error("invalid_projection");
  return value;
}

function normalizeAgentAvatar(value: unknown) {
  const avatar = optionalProjectionString(value, 400_000);
  if (!avatar || /^icon:[a-z0-9_-]{1,32}$/i.test(avatar) || /^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(avatar)) return avatar;
  throw new Error("invalid_projection");
}

export function normalizeAgentDirectoryProjection(value: unknown, id: string): AgentDirectoryProjection {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("invalid_projection");
  const source = value as Record<string, unknown>;
  if (id !== "agents" || source.id !== id || !Number.isSafeInteger(source.local_revision) || Number(source.local_revision) < 1 || !Array.isArray(source.agents) || source.agents.length > 100) throw new Error("invalid_projection");
  const agents = source.agents.map(value => {
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("invalid_projection");
    const agent = value as Record<string, unknown>;
    const agentId = requiredProjectionString(agent.id, 200);
    if (!/^[a-f0-9-]{36}$/i.test(agentId) || !Number.isInteger(agent.version) || Number(agent.version) < 1) throw new Error("invalid_projection");
    return {
      id: agentId,
      role: requiredProjectionString(agent.role, 200),
      name: requiredProjectionString(agent.name, 80),
      name_en: optionalProjectionString(agent.name_en, 80),
      description: optionalProjectionString(agent.description, 500),
      model: optionalProjectionString(agent.model, 200),
      reasoning_effort: optionalProjectionString(agent.reasoning_effort, 40),
      avatar: normalizeAgentAvatar(agent.avatar),
      version: Number(agent.version),
      created_at: requiredProjectionString(agent.created_at, 64),
      updated_at: requiredProjectionString(agent.updated_at, 64),
    };
  });
  if (new Set(agents.map(agent => agent.id)).size !== agents.length || new Set(agents.map(agent => agent.role)).size !== agents.length) throw new Error("invalid_projection");
  return { id, agents, default_avatar: normalizeAgentAvatar(source.default_avatar), local_revision: Number(source.local_revision) };
}

export function normalizeAgentModelCatalogProjection(value: unknown): AgentModelCatalogProjection[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 100).flatMap((item): AgentModelCatalogProjection[] => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const source = item as Record<string, unknown>;
    const id = projectionString(source.id, 200);
    if (!id) return [];
    const efforts = Array.isArray(source.supportedReasoningEfforts)
      ? source.supportedReasoningEfforts.slice(0, 20).flatMap((item): AgentReasoningEffortProjection[] => {
        if (!item || typeof item !== "object" || Array.isArray(item)) return [];
        const effort = item as Record<string, unknown>;
        const effortValue = projectionString(effort.value, 40);
        return effortValue ? [{ value: effortValue, description: projectionString(effort.description, 500) }] : [];
      })
      : [];
    const defaultReasoningEffort = projectionString(source.defaultReasoningEffort, 40) || efforts[0]?.value || "medium";
    return [{
      id,
      displayName: projectionString(source.displayName, 200) || id,
      description: projectionString(source.description, 2000),
      isDefault: source.isDefault === true,
      defaultReasoningEffort,
      supportedReasoningEfforts: efforts.length ? efforts : [{ value: defaultReasoningEffort, description: "" }],
    }];
  });
}

export function runtimeProjectionSignature(value: RuntimeProjection | null | undefined) {
  if (!value) return "";
  const { last_seen_at: _lastSeenAt, last_sync_at: _lastSyncAt, ...projection } = value;
  return JSON.stringify(projection);
}

export type SyncProjection = ProjectProjection | IssueProjection | AgentDirectoryProjection;

export type SyncChange = {
  event_id: string;
  entity_type: SyncEntityType;
  entity_id: string;
  operation: "upsert" | "delete";
  changed_at: string;
  projection: SyncProjection | null;
};

export type SyncPushRequest = {
  protocol_version: SyncProtocolVersion;
  core_version: string;
  device_id: string;
  runtime: RuntimeProjection;
  changes: SyncChange[];
};

export type SyncPushResponse = {
  accepted: string[];
  cursor: number;
  lease_expires_at: string;
};

export const remoteCommandOperations = ["project.create", "project.overview", "issue.create", "issue.update", "issue.move", "issue.start", "issue.stop", "issue.reply", "issue.archive", "issue.restore", "settings.auto-dispatch"] as const;
export type RemoteCommandOperation = typeof remoteCommandOperations[number];
export type RemoteCommandStatus = "pending" | "dispatched" | "applied" | "rejected" | "conflict" | "expired";

export type RemoteCommand = {
  command_id: string;
  device_id: string;
  operation: RemoteCommandOperation;
  entity_id: string;
  base_revision: number | null;
  payload: Record<string, unknown>;
  status: RemoteCommandStatus;
  requested_at: string;
  expires_at: string;
  finished_at: string | null;
  error: string | null;
  delivery_id?: string | null;
  dispatched_at?: string | null;
  dispatch_expires_at?: string | null;
  attempt_count?: number;
  last_delivery_error?: string | null;
};

export type RemoteFilePayload = {
  name: string;
  type: string;
  data: string;
};

export type RemoteCommandAck = {
  command_id: string;
  status: Exclude<RemoteCommandStatus, "pending" | "dispatched" | "expired">;
  error: string | null;
  projection: ProjectProjection | IssueProjection | null;
  delivery_id?: string | null;
};

export type DeviceAuthorization = {
  authorization_id: string;
  user_code: string;
  device_name: string;
  status: "pending" | "approved" | "expired" | "denied";
  expires_at: string;
  device_id?: string;
  device_token?: string;
};

export type ConversationProjection = {
  issue_id: string;
  found: boolean;
  messages: ConversationMessage[];
  reply: {
    request_id?: string;
    status: IssueReplyStatus;
    message: string;
    error?: string;
    started_at?: string;
    finished_at?: string;
  };
  updated_at: string;
};

export type RemoteIssueState = {
  command_id: string;
  status: RemoteCommandStatus;
  operation: RemoteCommandOperation;
  error: string | null;
};

export type RemoteIssueProjection = IssueProjection & {
  remote_state?: RemoteIssueState;
};

export type HubBoard = {
  revision: number;
  projects: ProjectProjection[];
  issues: RemoteIssueProjection[];
  agents: AgentProjection[];
  default_avatar: string;
  runtime: RuntimeProjection | null;
};

export const forbiddenProjectionKeys = [
  "workspace_path",
  "thread_id",
  "session_thread_id",
  "run_thread_id",
  "reply_draft",
  "instructions",
  "sandbox_mode",
  "prompt",
  "credential",
  "attachment",
  "log",
  "rollout_path",
] as const;
