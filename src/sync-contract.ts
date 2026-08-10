import type { IssuePriority, IssueStatus, PendingActor } from "./db.js";

export const syncEntityTypes = ["project", "issue", "agent"] as const;
export type SyncEntityType = typeof syncEntityTypes[number];

export type ProjectProjection = {
  id: string;
  name: string;
  identifier_prefix: string;
  created_at: string;
  updated_at: string;
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
  agent_id: string | null;
  agent_enabled: boolean;
  user_assigned: boolean;
  needs_attention: boolean;
  pending_actor: PendingActor;
  active_run_status: string | null;
  created_at: string;
  updated_at: string;
};

export type AgentProjection = {
  id: string;
  name: string;
  name_en: string;
  created_at: string;
  updated_at: string;
};

export type SyncProjection = ProjectProjection | IssueProjection | AgentProjection;

export type SyncChange = {
  event_id: string;
  entity_type: SyncEntityType;
  entity_id: string;
  operation: "upsert" | "delete";
  changed_at: string;
  projection: SyncProjection | null;
};

export type RemoteCommand = {
  id: string;
  entity_type: "issue";
  entity_id: string;
  operation: "create" | "update" | "archive" | "unarchive";
  patch: Record<string, unknown>;
  expected: Record<string, unknown>;
  created_at: string;
};

export type SyncPushRequest = { changes: SyncChange[] };
export type SyncPushResponse = { accepted: string[]; cursor: number };
export type SyncPullResponse = { cursor: number; commands: RemoteCommand[] };
export type CommandAcknowledgement = {
  status: "applied" | "rejected";
  error?: string;
  projection?: IssueProjection;
};

export type HubBoardEntity<T extends SyncProjection = SyncProjection> = {
  revision: number;
  pending: boolean;
  payload: T;
};

export type HubBoard = {
  revision: number;
  projects: Array<HubBoardEntity<ProjectProjection>>;
  issues: Array<HubBoardEntity<IssueProjection>>;
  agents: Array<HubBoardEntity<AgentProjection>>;
  conflicts: Array<{ id: string; entity_id: string; error: string; created_at: string }>;
};

export const remoteIssuePatchFields = [
  "project_id",
  "title",
  "description",
  "status",
  "priority",
  "labels",
  "sort_order",
  "pinned",
] as const;
