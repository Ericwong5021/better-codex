import type { IssuePriority, IssueStatus } from "./db.js";

export const syncProtocolVersion = "sync/v1";
export const syncEntityTypes = ["project", "issue"] as const;
export type SyncEntityType = typeof syncEntityTypes[number];

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
  active_run: boolean;
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

export type SyncProjection = ProjectProjection | IssueProjection;

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

export type HubBoard = {
  revision: number;
  projects: ProjectProjection[];
  issues: IssueProjection[];
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
] as const;
