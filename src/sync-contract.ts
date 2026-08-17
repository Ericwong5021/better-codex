import type { IssuePriority, IssueReplyStatus, IssueSessionStatus, IssueStatus } from "./db.js";
import type { ConversationMessage } from "./session-transcript.js";

export const legacySyncProtocolVersion = "sync/v5" as const;
export const syncProtocolVersion = "sync/v6" as const;
export const supportedSyncProtocolVersions = [legacySyncProtocolVersion, syncProtocolVersion] as const;
export type SyncProtocolVersion = typeof supportedSyncProtocolVersions[number];
export const syncEntityTypes = ["project", "issue", "agent_directory"] as const;
export type SyncEntityType = typeof syncEntityTypes[number];

export type AgentProjection = {
  id: string;
  role: string;
  name: string;
  name_en: string;
  description: string;
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

export type ProjectProjection = {
  id: string;
  name: string;
  identifier_prefix: string;
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

export const remoteCommandOperations = ["issue.create", "issue.update", "issue.move", "issue.start", "issue.stop", "issue.reply", "issue.archive", "issue.restore"] as const;
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
  projection: IssueProjection | null;
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
  "model",
  "reasoning_effort",
  "prompt",
  "credential",
  "attachment",
  "log",
  "rollout_path",
] as const;
