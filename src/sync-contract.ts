import type { IssuePriority, IssueReplyStatus, IssueSessionStatus, IssueStatus } from "./db.js";
import type { ConversationMessage } from "./session-transcript.js";

export const syncProtocolVersion = "sync/v3";
export const syncEntityTypes = ["project", "issue", "agent_directory"] as const;
export type SyncEntityType = typeof syncEntityTypes[number];

export type AgentProjection = {
  id: string;
  role: string;
  name: string;
  name_en: string;
  description: string;
  version: number;
  created_at: string;
  updated_at: string;
};

export type AgentDirectoryProjection = {
  id: string;
  agents: AgentProjection[];
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
  needs_attention: boolean;
  created_at: string;
  updated_at: string;
  local_revision: number;
};

export type RuntimeProjection = {
  device_id: string;
  device_name: string;
  protocol_version: typeof syncProtocolVersion;
  core_version: string;
  last_seen_at: string;
  last_sync_at: string | null;
  queue_depth: number;
  health_state: "online" | "offline";
};

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
  protocol_version: typeof syncProtocolVersion;
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
export type RemoteCommandStatus = "pending" | "applied" | "rejected" | "conflict" | "expired";

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
};

export type RemoteCommandAck = {
  command_id: string;
  status: Exclude<RemoteCommandStatus, "pending" | "expired">;
  error: string | null;
  projection: IssueProjection | null;
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
