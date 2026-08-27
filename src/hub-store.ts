import { createHash, randomBytes, randomUUID } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, renameSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { issuePriorities, issueStatuses } from "./db.js";
import { forbiddenProjectionKeys, normalizeAgentDirectoryProjection, normalizeAgentModelCatalogProjection, normalizeCodexUsageProjection, previousSyncProtocolVersion, projectDocumentKeys, remoteCommandOperations, runtimeProjectionSignature, supportedSyncProtocolVersions, syncEntityTypes, syncProtocolVersion, type AgentDirectoryProjection, type ConversationProjection, type DirectoryBrowserResult, type HubBoard, type IssueProjection, type ProjectDocumentView, type ProjectPlanItem, type ProjectProjection, type RemoteCommand, type RemoteCommandAck, type RemoteCommandOperation, type RemoteCommandStatus, type RuntimeProjection, type SyncChange, type SyncEntityType, type SyncProjection, type SyncPushRequest } from "./sync-contract.js";
import { avatarColor, avatarColors } from "./user-profile.js";
import { coreVersion } from "./version.js";

function now() {
  return new Date().toISOString();
}

function after(milliseconds: number) {
  return new Date(Date.now() + milliseconds).toISOString();
}

function tokenHash(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

const hubSchemaVersion = 9;
const webSessionIdleLifetimeMilliseconds = 12 * 60 * 60_000;
const webSessionMaximumLifetimeMilliseconds = 30 * 24 * 60 * 60_000;

function backupBeforeMigration(file: string) {
  if (!existsSync(file)) return;
  const source = new DatabaseSync(file);
  try {
    const integrity = source.prepare("PRAGMA quick_check").get() as { quick_check?: string } | undefined;
    if (integrity?.quick_check !== "ok") throw new Error("hub_database_integrity_failed");
    let version = 0;
    try { version = Number((source.prepare("SELECT COALESCE(MAX(version), 0) AS version FROM hub_migrations").get() as { version: number }).version); } catch {}
    if (version > hubSchemaVersion) throw new Error("hub_database_schema_too_new");
    if (version >= hubSchemaVersion) return;
    const directory = join(dirname(file), "backups");
    mkdirSync(directory, { recursive: true });
    const destination = join(directory, `before-hub-v${hubSchemaVersion}-${new Date().toISOString().replace(/[:.]/g, "-")}.db`);
    source.prepare("VACUUM INTO ?").run(destination);
  } finally {
    source.close();
  }
}

function cleanString(value: unknown, limit: number, allowEmpty = true) {
  if (typeof value !== "string" || value.length > limit || value.includes("\0") || (!allowEmpty && !value.trim())) throw new Error("invalid_projection");
  return value;
}

function cleanAvatar(value: unknown) {
  const avatar = cleanString(value, 400_000);
  if (!avatar || /^icon:[a-z0-9_-]{1,32}$/i.test(avatar) || /^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(avatar)) return avatar;
  throw new Error("invalid_projection");
}

function cleanAvatarColor(value: unknown) {
  if (typeof value !== "string") throw new Error("invalid_projection");
  const color = value.toLowerCase();
  if (!(avatarColors as readonly string[]).includes(color)) throw new Error("invalid_projection");
  return color;
}

function cleanProjectDocumentViews(value: unknown): ProjectDocumentView[] {
  if (!Array.isArray(value) || value.length > projectDocumentKeys.length) throw new Error("invalid_projection");
  const found = new Map(value.map(item => {
    if (!item || typeof item !== "object" || Array.isArray(item)) throw new Error("invalid_projection");
    const source = item as Record<string, unknown>;
    if (!projectDocumentKeys.includes(source.key as never) || !["idle", "queued", "generating", "ready", "failed"].includes(String(source.status))) throw new Error("invalid_projection");
    const diagramSource = source.diagram === null ? null : source.diagram as Record<string, unknown>;
    let diagram: ProjectDocumentView["diagram"] = null;
    if (diagramSource) {
      if (typeof diagramSource !== "object" || Array.isArray(diagramSource) || !Array.isArray(diagramSource.nodes) || diagramSource.nodes.length > 80 || !Array.isArray(diagramSource.edges) || diagramSource.edges.length > 160) throw new Error("invalid_projection");
      const nodes = diagramSource.nodes.map(node => {
        if (!node || typeof node !== "object" || Array.isArray(node)) throw new Error("invalid_projection");
        const item = node as Record<string, unknown>;
        return { id: cleanString(item.id, 80, false), label: cleanString(item.label, 160, false), group: cleanString(item.group, 80), detail: cleanString(item.detail, 500) };
      });
      const edges = diagramSource.edges.map(edge => {
        if (!edge || typeof edge !== "object" || Array.isArray(edge)) throw new Error("invalid_projection");
        const item = edge as Record<string, unknown>;
        return { from: cleanString(item.from, 80, false), to: cleanString(item.to, 80, false), label: cleanString(item.label, 120) };
      });
      diagram = { nodes, edges };
    }
    const view: ProjectDocumentView = {
      key: source.key as ProjectDocumentView["key"],
      status: source.status as ProjectDocumentView["status"],
      markdown: cleanString(source.markdown, 120_000),
      html: cleanString(source.html, 500_000),
      diagram,
      error: source.error === null ? null : cleanString(source.error, 2_000),
      updated_at: source.updated_at === null ? null : cleanString(source.updated_at, 64, false),
    };
    return [view.key, view] as const;
  }));
  return projectDocumentKeys.map(key => found.get(key) || { key, status: "idle", markdown: "", html: "", diagram: null, error: null, updated_at: null });
}

function cleanProjectPlanning(value: unknown): NonNullable<ProjectProjection["planning"]> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("invalid_projection");
  const source = value as Record<string, unknown>;
  if (!["idle", "running", "ready", "failed"].includes(String(source.status)) || typeof source.revision !== "number" || !Number.isInteger(source.revision) || source.revision < 0) throw new Error("invalid_projection");
  if (!Array.isArray(source.messages) || source.messages.length > 80) throw new Error("invalid_projection");
  const messages: NonNullable<ProjectProjection["planning"]>["messages"] = source.messages.map(message => {
    if (!message || typeof message !== "object" || Array.isArray(message)) throw new Error("invalid_projection");
    const item = message as Record<string, unknown>;
    if (item.role !== "user" && item.role !== "agent") throw new Error("invalid_projection");
    return { id: cleanString(item.id, 80, false), role: item.role, markdown: cleanString(item.markdown, 120_000), html: cleanString(item.html, 500_000), created_at: cleanString(item.created_at, 64, false) };
  });
  const planSource = source.plan === null ? null : source.plan as Record<string, unknown>;
  const plan = planSource ? (() => {
    if (typeof planSource !== "object" || Array.isArray(planSource)) throw new Error("invalid_projection");
    const result = { summary: cleanString(planSource.summary, 4_000) } as NonNullable<NonNullable<ProjectProjection["planning"]>["plan"]>;
    for (const key of ["outcomes", "milestones", "workstreams", "risks", "decisions", "open_questions", "delivery", "evidence"] as const) {
      const values = planSource[key];
      if (!Array.isArray(values) || values.length > 24) throw new Error("invalid_projection");
      result[key] = values.map(value => {
        if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("invalid_projection");
        const item = value as Record<string, unknown>;
        if (!["proposed", "confirmed", "in_progress", "blocked", "done"].includes(String(item.status)) || !["code", "issue", "conversation", "user", "inference"].includes(String(item.source))) throw new Error("invalid_projection");
        if (!Array.isArray(item.dependencies) || item.dependencies.length > 12 || !Array.isArray(item.evidence) || item.evidence.length > 12) throw new Error("invalid_projection");
        return {
          id: cleanString(item.id, 80, false),
          title: cleanString(item.title, 300, false),
          detail: cleanString(item.detail, 2_000),
          status: item.status as ProjectPlanItem["status"],
          source: item.source as ProjectPlanItem["source"],
          target_date: item.target_date === null ? null : cleanString(item.target_date, 10, false),
          dependencies: item.dependencies.map(dependency => cleanString(dependency, 80, false)),
          evidence: item.evidence.map(evidence => cleanString(evidence, 500, false)),
        };
      });
    }
    return result;
  })() : null;
  return {
    status: source.status as NonNullable<ProjectProjection["planning"]>["status"],
    error: source.error === null ? null : cleanString(source.error, 2_000),
    agent_id: source.agent_id === null ? null : cleanString(source.agent_id, 200),
    revision: Number(source.revision),
    updated_at: source.updated_at === null ? null : cleanString(source.updated_at, 64, false),
    messages,
    plan,
  };
}

function containsForbiddenKey(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(containsForbiddenKey);
  if (!value || typeof value !== "object") return false;
  return Object.entries(value as Record<string, unknown>).some(([key, item]) => forbiddenProjectionKeys.some(blocked => key.toLowerCase().includes(blocked)) || containsForbiddenKey(item));
}

function cleanSessionRetry(value: unknown): IssueProjection["session_retry"] {
  if (value === undefined || value === null) return null;
  if (typeof value !== "object" || Array.isArray(value)) throw new Error("invalid_projection");
  const source = value as Record<string, unknown>;
  if (!["network", "stream", "overloaded", "rate_limit", "service"].includes(String(source.kind))) throw new Error("invalid_projection");
  if (!Number.isInteger(source.count) || Number(source.count) < 1) throw new Error("invalid_projection");
  if (typeof source.started_at !== "string" || source.started_at.length > 64 || typeof source.updated_at !== "string" || source.updated_at.length > 64) throw new Error("invalid_projection");
  if (source.http_status !== null && (!Number.isInteger(source.http_status) || Number(source.http_status) < 100 || Number(source.http_status) > 599)) throw new Error("invalid_projection");
  return {
    kind: source.kind as NonNullable<IssueProjection["session_retry"]>["kind"],
    count: Number(source.count),
    started_at: source.started_at,
    updated_at: source.updated_at,
    http_status: source.http_status === null ? null : Number(source.http_status),
  };
}

function cleanProjection(type: SyncEntityType, id: string, value: unknown): SyncProjection {
  if (!value || typeof value !== "object" || Array.isArray(value) || containsForbiddenKey(value)) throw new Error("forbidden_projection_field");
  const source = value as Record<string, unknown>;
  if (source.id !== id || !Number.isSafeInteger(source.local_revision) || Number(source.local_revision) < 1) throw new Error("invalid_projection");
  if (type === "project") return {
    id,
    name: cleanString(source.name, 120, false),
    identifier_prefix: cleanString(source.identifier_prefix, 20, false),
    root_paths: Array.isArray(source.root_paths) && source.root_paths.length <= 32 ? source.root_paths.map(path => cleanString(path, 4096, false)) : (() => { throw new Error("invalid_projection"); })(),
    description: cleanString(source.description, 2_000),
    overview_html: cleanString(source.overview_html, 500_000),
    overview_status: ["idle", "generating", "ready", "failed"].includes(String(source.overview_status)) ? source.overview_status as ProjectProjection["overview_status"] : (() => { throw new Error("invalid_projection"); })(),
    overview_error: source.overview_error === null ? null : cleanString(source.overview_error, 2_000),
    overview_updated_at: source.overview_updated_at === null ? null : cleanString(source.overview_updated_at, 64, false),
    document_views: source.document_views === undefined ? undefined : cleanProjectDocumentViews(source.document_views),
    document_agent_id: source.document_agent_id === undefined ? undefined : source.document_agent_id === null ? null : cleanString(source.document_agent_id, 200),
    document_feedback: source.document_feedback === undefined ? undefined : cleanString(source.document_feedback, 4_000),
    planning: source.planning === undefined ? undefined : cleanProjectPlanning(source.planning),
    created_at: cleanString(source.created_at, 64, false),
    updated_at: cleanString(source.updated_at, 64, false),
    local_revision: Number(source.local_revision),
  } satisfies ProjectProjection;
  if (type === "agent_directory") return normalizeAgentDirectoryProjection(source, id);
  if (!issueStatuses.includes(source.status as never) || !issuePriorities.includes(source.priority as never)) throw new Error("invalid_projection");
  if (!Array.isArray(source.labels) || source.labels.length > 20 || source.labels.some(label => typeof label !== "string" || label.length > 100)) throw new Error("invalid_projection");
  if (typeof source.sort_order !== "number" || !Number.isFinite(source.sort_order)) throw new Error("invalid_projection");
  for (const field of ["pinned", "assigned", "agent_enabled", "user_assigned", "has_conversation", "needs_attention"] as const) if (typeof source[field] !== "boolean") throw new Error("invalid_projection");
  if (source.agent_id !== null && (typeof source.agent_id !== "string" || !/^[a-f0-9-]{36}$/i.test(source.agent_id))) throw new Error("invalid_projection");
  if (source.assignee_user_id !== undefined && source.assignee_user_id !== null && (typeof source.assignee_user_id !== "string" || source.assignee_user_id.length > 200)) throw new Error("invalid_projection");
  if (source.pending_actor !== "user" && source.pending_actor !== "agent") throw new Error("invalid_projection");
  if (source.enrichment_status !== undefined && source.enrichment_status !== null && !["pending", "regenerating", "failed"].includes(String(source.enrichment_status))) throw new Error("invalid_projection");
  if (source.archived_at !== null && (typeof source.archived_at !== "string" || source.archived_at.length > 64)) throw new Error("invalid_projection");
  if (source.active_run_status !== null && !["claimed", "running", "scheduling"].includes(String(source.active_run_status))) throw new Error("invalid_projection");
  if (source.latest_run_status !== null && !["claimed", "running", "scheduling", "completed", "failed", "interrupted"].includes(String(source.latest_run_status))) throw new Error("invalid_projection");
  if (source.latest_scheduler_status !== null && !["pending", "running", "completed", "failed", "interrupted"].includes(String(source.latest_scheduler_status))) throw new Error("invalid_projection");
  if (source.session_status !== null && !["starting", "active", "stopping", "waiting_on_approval", "waiting_on_user", "idle", "interrupted", "failed", "disconnected"].includes(String(source.session_status))) throw new Error("invalid_projection");
  if (!["idle", "running", "succeeded", "failed", "interrupted"].includes(String(source.reply_status))) throw new Error("invalid_projection");
  return {
    id,
    identifier: cleanString(source.identifier, 200, false),
    project_id: cleanString(source.project_id, 200, false),
    title: cleanString(source.title, 500, false),
    description: cleanString(source.description, 100_000),
    status: source.status as IssueProjection["status"],
    priority: source.priority as IssueProjection["priority"],
    labels: source.labels as string[],
    sort_order: source.sort_order,
    pinned: source.pinned as boolean,
    archived_at: source.archived_at as string | null,
    assigned: source.assigned as boolean,
    agent_enabled: source.agent_enabled as boolean,
    agent_id: source.agent_id as string | null,
    user_assigned: source.user_assigned as boolean,
    assignee_user_id: typeof source.assignee_user_id === "string" ? source.assignee_user_id : null,
    pending_actor: source.pending_actor,
    enrichment_status: source.enrichment_status === "pending" || source.enrichment_status === "regenerating" || source.enrichment_status === "failed" ? source.enrichment_status : null,
    active_run_status: source.active_run_status as IssueProjection["active_run_status"],
    latest_run_status: source.latest_run_status as IssueProjection["latest_run_status"],
    latest_scheduler_status: source.latest_scheduler_status as IssueProjection["latest_scheduler_status"],
    session_status: source.session_status as IssueProjection["session_status"],
    session_retry: cleanSessionRetry(source.session_retry),
    reply_status: source.reply_status as IssueProjection["reply_status"],
    has_conversation: source.has_conversation as boolean,
    last_activity_finished_at: source.last_activity_finished_at === null ? null : cleanString(source.last_activity_finished_at, 64, false),
    needs_attention: source.needs_attention as boolean,
    created_at: cleanString(source.created_at, 64, false),
    updated_at: cleanString(source.updated_at, 64, false),
    local_revision: Number(source.local_revision),
  } satisfies IssueProjection;
}

function cleanRuntime(value: unknown, deviceId: string): RuntimeProjection {
  if (!value || typeof value !== "object" || Array.isArray(value) || containsForbiddenKey(value)) throw new Error("invalid_runtime_projection");
  const source = value as Record<string, unknown>;
  if (source.device_id !== deviceId || !supportedSyncProtocolVersions.includes(source.protocol_version as never) || source.health_state !== "online") throw new Error("invalid_runtime_projection");
  return {
    device_id: deviceId,
    device_name: cleanString(source.device_name, 120, false),
    protocol_version: source.protocol_version as RuntimeProjection["protocol_version"],
    core_version: cleanString(source.core_version, 40, false),
    last_seen_at: now(),
    last_sync_at: typeof source.last_sync_at === "string" ? cleanString(source.last_sync_at, 64) : null,
    queue_depth: Number.isSafeInteger(source.queue_depth) && Number(source.queue_depth) >= 0 ? Number(source.queue_depth) : 0,
    health_state: "online",
    usage: normalizeCodexUsageProjection(source.usage),
    agent_models: normalizeAgentModelCatalogProjection(source.agent_models),
    auto_dispatch: source.auto_dispatch === true,
    scheduler_model: typeof source.scheduler_model === "string" ? cleanString(source.scheduler_model, 200) : "",
    scheduler_reasoning_effort: typeof source.scheduler_reasoning_effort === "string" ? cleanString(source.scheduler_reasoning_effort, 40) : "",
    default_agent_model: typeof source.default_agent_model === "string" ? cleanString(source.default_agent_model, 200) : "",
    default_agent_reasoning_effort: typeof source.default_agent_reasoning_effort === "string" ? cleanString(source.default_agent_reasoning_effort, 40) : "",
    default_agent_service_tier: typeof source.default_agent_service_tier === "string" ? cleanString(source.default_agent_service_tier, 20) : "default",
  };
}

type EntityRow = { entity_type: SyncEntityType; entity_id: string; payload_json: string; deleted_at: string | null };
type CommandRow = { command_id: string; device_id: string; operation: RemoteCommandOperation; entity_id: string; base_revision: number | null; payload_json: string; status: RemoteCommandStatus; requested_at: string; expires_at: string; finished_at: string | null; error: string | null; delivery_id: string | null; dispatched_at: string | null; dispatch_expires_at: string | null; attempt_count: number | null; last_delivery_error: string | null };

function commandFromRow(row: CommandRow): RemoteCommand {
  return {
    command_id: row.command_id,
    device_id: row.device_id,
    operation: row.operation,
    entity_id: row.entity_id,
    base_revision: row.base_revision,
    payload: JSON.parse(row.payload_json) as Record<string, unknown>,
    status: row.status,
    requested_at: row.requested_at,
    expires_at: row.expires_at,
    finished_at: row.finished_at,
    error: row.error,
    delivery_id: row.delivery_id,
    dispatched_at: row.dispatched_at,
    dispatch_expires_at: row.dispatch_expires_at,
    attempt_count: row.attempt_count ?? 0,
    last_delivery_error: row.last_delivery_error,
  };
}

function cleanCommandPayload(operation: RemoteCommandOperation, value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value) || (operation !== "project.create" && containsForbiddenKey(value))) throw new Error("invalid_command_payload");
  const source = value as Record<string, unknown>;
  const allowed = operation === "issue.create"
    ? ["project_id", "title", "description", "status", "priority", "labels", "agent_enabled", "agent_id", "user_assigned", "assignee_user_id", "ai_enrich", "files"]
    : operation === "issue.update"
      ? ["project_id", "title", "description", "status", "priority", "labels", "sort_order", "pinned", "agent_enabled", "agent_id", "user_assigned", "assignee_user_id", "files"]
      : operation === "issue.start"
        ? ["project_id", "title", "description", "status", "priority", "labels", "agent_id"]
      : operation === "issue.reply" ? ["message", "files"]
      : operation === "issue.queue.update" ? ["request_id", "message"]
      : operation === "issue.queue.send" ? ["request_id"]
      : operation === "issue.queue.delete" ? ["request_id"]
      : operation === "issue.move" ? ["status", "before_id"]
      : operation === "project.browse_directory" ? ["path"]
      : operation === "project.create_directory" ? ["parent_path", "name"]
      : operation === "project.create" ? ["name", "workspace_path"]
      : operation === "project.overview" ? ["agent_id", "feedback"]
      : operation === "project.planning.reply" ? ["agent_id", "message"]
      : operation === "settings.auto-dispatch" ? ["enabled"] : [];
  if (Object.keys(source).some(key => !allowed.includes(key))) throw new Error("forbidden_command_field");
  const payload: Record<string, unknown> = {};
  if (source.project_id !== undefined) payload.project_id = cleanString(source.project_id, 200, false);
  if (source.title !== undefined) payload.title = cleanString(source.title, 500, false);
  if (source.description !== undefined) payload.description = cleanString(source.description, 100_000);
  if (source.status !== undefined) {
    if (!issueStatuses.includes(source.status as never)) throw new Error("invalid_status");
    payload.status = source.status;
  }
  if (source.priority !== undefined) {
    if (!issuePriorities.includes(source.priority as never)) throw new Error("invalid_priority");
    payload.priority = source.priority;
  }
  if (source.labels !== undefined) {
    if (!Array.isArray(source.labels) || source.labels.length > 20 || source.labels.some(label => typeof label !== "string" || label.length > 100)) throw new Error("invalid_labels");
    payload.labels = source.labels;
  }
  if (source.sort_order !== undefined) {
    if (typeof source.sort_order !== "number" || !Number.isFinite(source.sort_order)) throw new Error("invalid_sort_order");
    payload.sort_order = source.sort_order;
  }
  if (source.pinned !== undefined) payload.pinned = source.pinned === true;
  if (source.agent_enabled !== undefined) payload.agent_enabled = source.agent_enabled === true;
  if (source.agent_id !== undefined) {
    const agentId = cleanString(source.agent_id, 200);
    if (agentId && !/^[a-f0-9-]{36}$/i.test(agentId)) throw new Error("invalid_agent_id");
    payload.agent_id = agentId;
  }
  if (source.user_assigned !== undefined) payload.user_assigned = source.user_assigned === true;
  if (source.assignee_user_id !== undefined) payload.assignee_user_id = source.assignee_user_id === null ? null : cleanString(source.assignee_user_id, 200);
  if (source.ai_enrich !== undefined) payload.ai_enrich = source.ai_enrich === true;
  if (source.enabled !== undefined) payload.enabled = source.enabled === true;
  if (source.before_id !== undefined) payload.before_id = cleanString(source.before_id, 200);
  if (source.request_id !== undefined) payload.request_id = cleanString(source.request_id, 200, false);
  if (source.message !== undefined) payload.message = cleanString(source.message, operation === "project.planning.reply" ? 12_000 : 100_000, false).trim();
  if (source.feedback !== undefined) payload.feedback = cleanString(source.feedback, 4_000).trim();
  if (source.name !== undefined) payload.name = cleanString(source.name, 120, false).trim();
  if (source.path !== undefined) payload.path = cleanString(source.path, 4096).trim();
  if (source.parent_path !== undefined) payload.parent_path = cleanString(source.parent_path, 4096, false).trim();
  if (source.workspace_path !== undefined) payload.workspace_path = cleanString(source.workspace_path, 4096, false).trim();
  if (source.files !== undefined) {
    if (!Array.isArray(source.files) || source.files.length > 4) throw new Error("invalid_files");
    const files = source.files.map(value => {
      if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("invalid_files");
      const file = value as Record<string, unknown>;
      if (Object.keys(file).some(key => !["name", "type", "data"].includes(key))) throw new Error("invalid_files");
      const name = cleanString(file.name, 160, false);
      const type = cleanString(file.type, 120, false).toLowerCase();
      const data = cleanString(file.data, 14_000_000, false);
      if (!/^[a-z0-9][a-z0-9.+-]*\/[a-z0-9][a-z0-9.+-]*$/i.test(type) || !data.startsWith(`data:${type};base64,`)) throw new Error("invalid_files");
      return { name, type, data };
    });
    if (files.reduce((size, file) => size + file.data.length, 0) > 28_000_000) throw new Error("body_too_large");
    payload.files = files;
  }
  if (operation === "issue.create" && (!payload.project_id || !payload.title)) throw new Error("invalid_command_payload");
  if (operation === "issue.move" && !payload.status) throw new Error("invalid_command_payload");
  if (operation === "issue.start" && !payload.title) throw new Error("invalid_command_payload");
  if (operation === "issue.reply" && !payload.message && !(payload.files as unknown[] | undefined)?.length) throw new Error("message_required");
  if (operation === "issue.queue.update" && (!payload.request_id || !payload.message)) throw new Error("invalid_command_payload");
  if (operation === "issue.queue.send" && !payload.request_id) throw new Error("invalid_command_payload");
  if (operation === "issue.queue.delete" && !payload.request_id) throw new Error("invalid_command_payload");
  if (operation === "project.create" && (!payload.name || !payload.workspace_path)) throw new Error("invalid_command_payload");
  if (operation === "project.planning.reply" && !payload.message) throw new Error("message_required");
  if (operation === "project.browse_directory" && typeof payload.path !== "string") throw new Error("invalid_command_payload");
  if (operation === "project.create_directory" && (!payload.parent_path || !payload.name)) throw new Error("invalid_command_payload");
  if (operation === "settings.auto-dispatch" && typeof source.enabled !== "boolean") throw new Error("invalid_auto_dispatch");
  return payload;
}

function cleanDirectoryBrowserResult(value: unknown): DirectoryBrowserResult {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("invalid_command_result");
  const source = value as Record<string, unknown>;
  const keys = ["path", "parent_path", "home_path", "root_path", "directories", "truncated"];
  if (Object.keys(source).some(key => !keys.includes(key)) || !Array.isArray(source.directories) || source.directories.length > 500 || typeof source.truncated !== "boolean") throw new Error("invalid_command_result");
  const directories = source.directories.map(value => {
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("invalid_command_result");
    const entry = value as Record<string, unknown>;
    if (Object.keys(entry).some(key => key !== "name" && key !== "path")) throw new Error("invalid_command_result");
    return { name: cleanString(entry.name, 512, false), path: cleanString(entry.path, 4096, false) };
  });
  return {
    path: cleanString(source.path, 4096, false),
    parent_path: source.parent_path === null ? null : cleanString(source.parent_path, 4096, false),
    home_path: cleanString(source.home_path, 4096, false),
    root_path: cleanString(source.root_path, 4096, false),
    directories,
    truncated: source.truncated,
  };
}

export class HubStore {
  readonly db: DatabaseSync;

  constructor(readonly file: string) {
    mkdirSync(dirname(file), { recursive: true });
    backupBeforeMigration(file);
    this.db = new DatabaseSync(file);
    this.db.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;");
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS hub_migrations (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS pairing_codes (code_hash TEXT PRIMARY KEY, expires_at TEXT NOT NULL, used_at TEXT);
      CREATE TABLE IF NOT EXISTS devices (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        token_hash TEXT NOT NULL UNIQUE,
        created_at TEXT NOT NULL,
        last_seen_at TEXT NOT NULL,
        lease_expires_at TEXT,
        revoked_at TEXT
      );
      CREATE TABLE IF NOT EXISTS entities (
        entity_type TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        owner_device_id TEXT NOT NULL REFERENCES devices(id),
        local_revision INTEGER NOT NULL,
        payload_json TEXT NOT NULL,
        deleted_at TEXT,
        updated_at TEXT NOT NULL,
        PRIMARY KEY (entity_type, entity_id)
      );
      CREATE TABLE IF NOT EXISTS sync_events (event_id TEXT PRIMARY KEY, device_id TEXT NOT NULL, received_at TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS changes (seq INTEGER PRIMARY KEY AUTOINCREMENT, entity_type TEXT NOT NULL, entity_id TEXT NOT NULL, operation TEXT NOT NULL, created_at TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS runtime_projection (device_id TEXT PRIMARY KEY REFERENCES devices(id), payload_json TEXT NOT NULL, updated_at TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS conversations (issue_id TEXT PRIMARY KEY, owner_device_id TEXT NOT NULL REFERENCES devices(id), payload_json TEXT NOT NULL, updated_at TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS remote_commands (
        command_id TEXT PRIMARY KEY,
        device_id TEXT NOT NULL REFERENCES devices(id),
        operation TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        base_revision INTEGER,
        payload_json TEXT NOT NULL,
        status TEXT NOT NULL,
        requested_at TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        finished_at TEXT,
        error TEXT,
        delivery_id TEXT,
        dispatched_at TEXT,
        dispatch_expires_at TEXT,
        attempt_count INTEGER NOT NULL DEFAULT 0,
        last_delivery_error TEXT
      );
      CREATE TABLE IF NOT EXISTS remote_command_audit (
        seq INTEGER PRIMARY KEY AUTOINCREMENT,
        command_id TEXT NOT NULL,
        status TEXT NOT NULL,
        detail TEXT,
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS hub_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS web_users (
        id TEXT PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        nickname TEXT NOT NULL,
        avatar TEXT NOT NULL DEFAULT '',
        avatar_color TEXT NOT NULL DEFAULT '',
        avatar_generated INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        disabled_at TEXT
      );
      CREATE TABLE IF NOT EXISTS web_sessions (
        token_hash TEXT PRIMARY KEY,
        user_id TEXT REFERENCES web_users(id) ON DELETE CASCADE,
        csrf_token TEXT NOT NULL,
        created_at TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        last_seen_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS device_authorizations (
        authorization_id TEXT PRIMARY KEY,
        user_code_hash TEXT NOT NULL UNIQUE,
        device_name TEXT NOT NULL,
        status TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        device_id TEXT,
        device_token_hash TEXT,
        device_token TEXT,
        created_at TEXT NOT NULL,
        approved_at TEXT
      );
      CREATE TABLE IF NOT EXISTS hub_audit (
        seq INTEGER PRIMARY KEY AUTOINCREMENT,
        actor TEXT NOT NULL,
        event TEXT NOT NULL,
        detail TEXT,
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS changes_created_at ON changes(created_at);
      CREATE INDEX IF NOT EXISTS remote_commands_queue ON remote_commands(device_id, status, requested_at);
      INSERT OR IGNORE INTO hub_migrations (version, applied_at) VALUES (1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));
      INSERT OR IGNORE INTO hub_migrations (version, applied_at) VALUES (2, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));
      INSERT OR IGNORE INTO hub_migrations (version, applied_at) VALUES (3, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));
    `);
    const currentVersion = Number((this.db.prepare("SELECT COALESCE(MAX(version), 0) AS version FROM hub_migrations").get() as { version: number }).version);
    if (currentVersion < 5) {
      this.db.exec("BEGIN IMMEDIATE");
      try {
        const timestamp = now();
        const rows = this.db.prepare("SELECT entity_id, local_revision, payload_json FROM entities WHERE entity_type = 'issue' AND deleted_at IS NULL").all() as Array<{ entity_id: string; local_revision: number; payload_json: string }>;
        for (const row of rows) {
          const projection = JSON.parse(row.payload_json) as Record<string, unknown>;
          if (projection.status !== "cancelled") continue;
          projection.status = "backlog";
          projection.archived_at ||= projection.updated_at || timestamp;
          projection.needs_attention = false;
          const nextRevision = Number(row.local_revision) + 1;
          projection.local_revision = nextRevision;
          this.db.prepare("UPDATE entities SET local_revision = ?, payload_json = ?, updated_at = ? WHERE entity_type = 'issue' AND entity_id = ?")
            .run(nextRevision, JSON.stringify(projection), timestamp, row.entity_id);
          this.db.prepare("INSERT INTO changes (entity_type, entity_id, operation, created_at) VALUES ('issue', ?, 'upsert', ?)").run(row.entity_id, timestamp);
        }
        const obsoleteCommands = this.db.prepare("SELECT command_id, payload_json FROM remote_commands WHERE status = 'pending'").all() as Array<{ command_id: string; payload_json: string }>;
        for (const command of obsoleteCommands) {
          const payload = JSON.parse(command.payload_json) as Record<string, unknown>;
          if (payload.status !== "cancelled") continue;
          this.db.prepare("UPDATE remote_commands SET status = 'rejected', finished_at = ?, error = 'obsolete_cancelled_status' WHERE command_id = ? AND status = 'pending'")
            .run(timestamp, command.command_id);
          this.db.prepare("INSERT INTO remote_command_audit (command_id, status, detail, created_at) VALUES (?, 'rejected', 'obsolete_cancelled_status', ?)")
            .run(command.command_id, timestamp);
        }
        this.db.prepare("INSERT INTO hub_migrations (version, applied_at) VALUES (5, ?)").run(timestamp);
        this.db.exec("COMMIT");
      } catch (error) {
        this.db.exec("ROLLBACK");
        throw error;
      }
    }
    const migratedVersion = Number((this.db.prepare("SELECT COALESCE(MAX(version), 0) AS version FROM hub_migrations").get() as { version: number }).version);
    if (migratedVersion < 6) {
      this.db.exec("BEGIN IMMEDIATE");
      try {
        const columns = this.db.prepare("PRAGMA table_info(remote_commands)").all() as Array<{ name: string }>;
        const names = new Set(columns.map(column => column.name));
        if (!names.has("delivery_id")) this.db.exec("ALTER TABLE remote_commands ADD COLUMN delivery_id TEXT");
        if (!names.has("dispatched_at")) this.db.exec("ALTER TABLE remote_commands ADD COLUMN dispatched_at TEXT");
        if (!names.has("dispatch_expires_at")) this.db.exec("ALTER TABLE remote_commands ADD COLUMN dispatch_expires_at TEXT");
        if (!names.has("attempt_count")) this.db.exec("ALTER TABLE remote_commands ADD COLUMN attempt_count INTEGER NOT NULL DEFAULT 0");
        if (!names.has("last_delivery_error")) this.db.exec("ALTER TABLE remote_commands ADD COLUMN last_delivery_error TEXT");
        this.db.prepare("INSERT INTO hub_migrations (version, applied_at) VALUES (6, ?)").run(now());
        this.db.exec("COMMIT");
      } catch (error) {
        this.db.exec("ROLLBACK");
        throw error;
      }
    }
    const latestVersion = Number((this.db.prepare("SELECT COALESCE(MAX(version), 0) AS version FROM hub_migrations").get() as { version: number }).version);
    if (latestVersion < 7) {
      this.db.exec("BEGIN IMMEDIATE");
      try {
        const columns = this.db.prepare("PRAGMA table_info(device_authorizations)").all() as Array<{ name: string }>;
        if (!columns.some(column => column.name === "device_token")) this.db.exec("ALTER TABLE device_authorizations ADD COLUMN device_token TEXT");
        this.db.prepare("INSERT INTO hub_migrations (version, applied_at) VALUES (7, ?)").run(now());
        this.db.exec("COMMIT");
      } catch (error) {
        this.db.exec("ROLLBACK");
        throw error;
      }
    }
    const userVersion = Number((this.db.prepare("SELECT COALESCE(MAX(version), 0) AS version FROM hub_migrations").get() as { version: number }).version);
    if (userVersion < 8) {
      this.db.exec("BEGIN IMMEDIATE");
      try {
        const columns = this.db.prepare("PRAGMA table_info(web_sessions)").all() as Array<{ name: string }>;
        if (!columns.some(column => column.name === "user_id")) this.db.exec("ALTER TABLE web_sessions ADD COLUMN user_id TEXT REFERENCES web_users(id) ON DELETE CASCADE");
        const legacyUsername = this.db.prepare("SELECT value FROM hub_settings WHERE key = 'web_username'").get() as { value: string } | undefined;
        const legacyPassword = this.db.prepare("SELECT value FROM hub_settings WHERE key = 'web_password_hash'").get() as { value: string } | undefined;
        if (legacyUsername?.value && legacyPassword?.value) {
          const timestamp = now();
          this.db.prepare("INSERT OR IGNORE INTO web_users (id, username, password_hash, nickname, avatar, created_at, updated_at) VALUES (?, ?, ?, ?, '', ?, ?)")
            .run(randomUUID(), legacyUsername.value, legacyPassword.value, legacyUsername.value, timestamp, timestamp);
        }
        this.db.exec("DELETE FROM web_sessions");
        this.db.prepare("INSERT INTO hub_migrations (version, applied_at) VALUES (8, ?)").run(now());
        this.db.exec("COMMIT");
      } catch (error) {
        this.db.exec("ROLLBACK");
        throw error;
      }
    }
    const avatarVersion = Number((this.db.prepare("SELECT COALESCE(MAX(version), 0) AS version FROM hub_migrations").get() as { version: number }).version);
    if (avatarVersion < 9) {
      this.db.exec("BEGIN IMMEDIATE");
      try {
        const columns = new Set((this.db.prepare("PRAGMA table_info(web_users)").all() as Array<{ name: string }>).map(column => column.name));
        if (!columns.has("avatar_color")) this.db.exec("ALTER TABLE web_users ADD COLUMN avatar_color TEXT NOT NULL DEFAULT ''");
        if (!columns.has("avatar_generated")) this.db.exec("ALTER TABLE web_users ADD COLUMN avatar_generated INTEGER NOT NULL DEFAULT 1");
        this.db.exec("UPDATE web_users SET avatar_generated = 0 WHERE avatar <> '' AND avatar_generated = 1");
        this.db.prepare("INSERT INTO hub_migrations (version, applied_at) VALUES (9, ?)").run(now());
        this.db.exec("COMMIT");
      } catch (error) {
        this.db.exec("ROLLBACK");
        throw error;
      }
    }
  }

  close() {
    this.db.close();
  }

  health() {
    const check = this.db.prepare("PRAGMA quick_check").get() as { quick_check?: string } | undefined;
    const devices = this.db.prepare("SELECT COUNT(*) AS value FROM devices WHERE revoked_at IS NULL").get() as { value: number };
    return { ok: check?.quick_check === "ok", name: "Better Codex Hub", deployment: "vps", version: coreVersion, protocol_version: syncProtocolVersion, devices: Number(devices.value), revision: this.cursor() };
  }

  audit(actor: string, event: string, detail: string | null = null) {
    this.db.prepare("INSERT INTO hub_audit (actor, event, detail, created_at) VALUES (?, ?, ?, ?)").run(actor.slice(0, 120), event.slice(0, 120), detail?.slice(0, 1000) ?? null, now());
  }

  auditEvents(limit = 100) {
    return this.db.prepare("SELECT seq, actor, event, detail, created_at FROM hub_audit ORDER BY seq DESC LIMIT ?").all(Math.min(Math.max(Math.trunc(limit), 1), 1000));
  }

  private webUserFromRow(row: Record<string, unknown>) {
    const nickname = String(row.nickname || row.username || "");
    const id = String(row.id);
    const storedColor = String(row.avatar_color || "").toLowerCase();
    return {
      id,
      username: String(row.username),
      nickname,
      avatar: String(row.avatar || ""),
      avatar_color: (avatarColors as readonly string[]).includes(storedColor) ? storedColor : avatarColor(id),
      avatar_generated: Number(row.avatar_generated) !== 0,
      initials: Array.from(nickname.replace(/\s+/g, "")).slice(0, 2).join("") || "?",
      disabled: Boolean(row.disabled_at),
      created_at: String(row.created_at),
      updated_at: String(row.updated_at),
    };
  }

  webUserCredentials(username: string) {
    const row = this.db.prepare("SELECT * FROM web_users WHERE username = ? COLLATE NOCASE AND disabled_at IS NULL").get(username) as Record<string, unknown> | undefined;
    return row ? { ...this.webUserFromRow(row), password_hash: String(row.password_hash) } : null;
  }

  webUser(id: string) {
    const row = this.db.prepare("SELECT * FROM web_users WHERE id = ?").get(id) as Record<string, unknown> | undefined;
    return row ? this.webUserFromRow(row) : null;
  }

  listWebUsers() {
    return (this.db.prepare("SELECT * FROM web_users ORDER BY disabled_at IS NOT NULL, nickname COLLATE NOCASE, username COLLATE NOCASE").all() as Record<string, unknown>[]).map(row => this.webUserFromRow(row));
  }

  defaultWebUser() {
    const row = this.db.prepare("SELECT * FROM web_users WHERE disabled_at IS NULL ORDER BY created_at, rowid LIMIT 1").get() as Record<string, unknown> | undefined;
    return row ? this.webUserFromRow(row) : null;
  }

  createWebUser(username: string, encoded: string) {
    if (!encoded.startsWith("scrypt$") || !username) throw new Error("hub_web_credentials_invalid");
    const id = randomUUID();
    const timestamp = now();
    this.db.prepare("INSERT INTO web_users (id, username, password_hash, nickname, avatar, created_at, updated_at) VALUES (?, ?, ?, ?, '', ?, ?)")
      .run(id, username, encoded, username, timestamp, timestamp);
    this.audit(id, "web_user_created");
    return this.webUser(id)!;
  }

  setWebUserPassword(username: string, encoded: string) {
    if (!encoded.startsWith("scrypt$") || !username) throw new Error("hub_web_credentials_invalid");
    const user = this.webUserCredentials(username) || this.listWebUsers().find(item => item.username.toLowerCase() === username.toLowerCase());
    if (!user) throw new Error("web_user_not_found");
    this.db.prepare("UPDATE web_users SET password_hash = ?, updated_at = ? WHERE id = ?").run(encoded, now(), user.id);
    this.db.prepare("DELETE FROM web_sessions WHERE user_id = ?").run(user.id);
    this.audit(user.id, "web_password_rotated");
    return this.webUser(user.id)!;
  }

  ensureWebCredentials(username: string, encoded: string) {
    const count = this.db.prepare("SELECT COUNT(*) AS value FROM web_users").get() as { value: number };
    if (Number(count.value) === 0) this.createWebUser(username, encoded);
  }

  setWebUserDisabled(username: string, disabled: boolean) {
    const row = this.db.prepare("SELECT id FROM web_users WHERE username = ? COLLATE NOCASE").get(username) as { id: string } | undefined;
    if (!row) throw new Error("web_user_not_found");
    this.db.prepare("UPDATE web_users SET disabled_at = ?, updated_at = ? WHERE id = ?").run(disabled ? now() : null, now(), row.id);
    if (disabled) this.db.prepare("DELETE FROM web_sessions WHERE user_id = ?").run(row.id);
    this.audit(row.id, disabled ? "web_user_disabled" : "web_user_enabled");
    return this.webUser(row.id)!;
  }

  setWebUserProfile(id: string, nicknameValue: unknown, avatarValue: unknown, avatarColorValue?: unknown, avatarGeneratedValue?: unknown) {
    const current = this.webUser(id);
    if (!current || current.disabled) throw new Error("web_user_not_found");
    const nickname = cleanString(nicknameValue, 80, false).replace(/\s+/g, " ").trim();
    const avatar = cleanAvatar(avatarValue);
    const color = avatarColorValue === undefined ? current.avatar_color : cleanAvatarColor(avatarColorValue);
    const avatarGenerated = avatarGeneratedValue === undefined ? avatar === current.avatar ? current.avatar_generated : false : avatarGeneratedValue;
    if (typeof avatarGenerated !== "boolean") throw new Error("invalid_projection");
    if (avatarGenerated && avatar && !avatar.startsWith("data:image/png;base64,")) throw new Error("invalid_projection");
    const result = this.db.prepare("UPDATE web_users SET nickname = ?, avatar = ?, avatar_color = ?, avatar_generated = ?, updated_at = ? WHERE id = ? AND disabled_at IS NULL").run(nickname, avatar, color, avatarGenerated ? 1 : 0, now(), id);
    if (Number(result.changes) !== 1) throw new Error("web_user_not_found");
    this.audit(id, "web_profile_updated");
    return this.webUser(id)!;
  }

  createWebSession(userId: string) {
    const user = this.webUser(userId);
    if (!user || user.disabled) throw new Error("web_user_not_found");
    const token = randomBytes(32).toString("base64url");
    const csrf_token = randomBytes(32).toString("base64url");
    const created_at = now();
    const expires_at = after(webSessionIdleLifetimeMilliseconds);
    this.db.prepare("INSERT INTO web_sessions (token_hash, user_id, csrf_token, created_at, expires_at, last_seen_at) VALUES (?, ?, ?, ?, ?, ?)").run(tokenHash(token), userId, csrf_token, created_at, expires_at, created_at);
    this.audit(userId, "web_session_created");
    return { token, csrf_token, expires_at, user };
  }

  webSession(token: string) {
    if (!token) return null;
    const timestampMilliseconds = Date.now();
    const timestamp = new Date(timestampMilliseconds).toISOString();
    this.db.prepare("DELETE FROM web_sessions WHERE expires_at <= ?").run(timestamp);
    const row = this.db.prepare("SELECT web_sessions.user_id, web_sessions.csrf_token, web_sessions.created_at, web_sessions.expires_at, web_sessions.last_seen_at FROM web_sessions JOIN web_users ON web_users.id = web_sessions.user_id WHERE web_sessions.token_hash = ? AND web_sessions.expires_at > ? AND web_users.disabled_at IS NULL").get(tokenHash(token), timestamp) as { user_id: string; csrf_token: string; created_at: string; expires_at: string; last_seen_at: string } | undefined;
    if (!row) return null;
    const expires_at = new Date(Math.min(timestampMilliseconds + webSessionIdleLifetimeMilliseconds, Date.parse(row.created_at) + webSessionMaximumLifetimeMilliseconds)).toISOString();
    this.db.prepare("UPDATE web_sessions SET expires_at = ?, last_seen_at = ? WHERE token_hash = ?").run(expires_at, timestamp, tokenHash(token));
    const user = this.webUser(row.user_id);
    return user ? { csrf_token: row.csrf_token, expires_at, user } : null;
  }

  setReadOnly(readOnly: boolean) {
    this.db.prepare("INSERT INTO hub_settings (key, value, updated_at) VALUES ('read_only', ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at").run(readOnly ? "1" : "0", now());
    this.audit("admin", readOnly ? "hub_read_only_enabled" : "hub_read_only_disabled");
    return { read_only: readOnly };
  }

  isReadOnly() {
    const row = this.db.prepare("SELECT value FROM hub_settings WHERE key = 'read_only'").get() as { value: string } | undefined;
    return row?.value === "1";
  }

  revokeWebSession(token: string) {
    if (token) this.db.prepare("DELETE FROM web_sessions WHERE token_hash = ?").run(tokenHash(token));
    this.audit("browser", "web_session_revoked");
  }

  createDeviceAuthorization(nameValue: unknown) {
    const device_name = cleanString(nameValue, 120, false).trim();
    const authorization_id = randomUUID();
    const user_code = randomBytes(5).toString("base64url").toUpperCase();
    const expires_at = after(10 * 60_000);
    this.db.prepare("INSERT INTO device_authorizations (authorization_id, user_code_hash, device_name, status, expires_at, created_at) VALUES (?, ?, ?, 'pending', ?, ?)").run(authorization_id, tokenHash(user_code), device_name, expires_at, now());
    this.audit("cli", "device_authorization_created", authorization_id);
    return { authorization_id, user_code, device_name, status: "pending" as const, expires_at };
  }

  deviceAuthorization(authorizationId: string) {
    this.db.prepare("UPDATE device_authorizations SET status = 'expired' WHERE status = 'pending' AND expires_at <= ?").run(now());
    const row = this.db.prepare("SELECT authorization_id, device_name, status, expires_at, device_id FROM device_authorizations WHERE authorization_id = ?").get(authorizationId) as { authorization_id: string; device_name: string; status: "pending" | "approved" | "expired" | "denied"; expires_at: string; device_id: string | null } | undefined;
    return row ? { ...row, device_id: row.device_id || undefined } : null;
  }

  approveDeviceAuthorization(authorizationId: string, userCode: unknown) {
    if (typeof userCode !== "string" || !userCode) throw new Error("invalid_device_authorization");
    this.db.prepare("UPDATE device_authorizations SET status = 'expired' WHERE status = 'pending' AND expires_at <= ?").run(now());
    const row = this.db.prepare("SELECT device_name, status, expires_at FROM device_authorizations WHERE authorization_id = ? AND user_code_hash = ?").get(authorizationId, tokenHash(userCode.trim().toUpperCase())) as { device_name: string; status: string; expires_at: string } | undefined;
    if (!row || row.status !== "pending" || row.expires_at <= now()) throw new Error("invalid_device_authorization");
    const id = randomUUID();
    const token = randomBytes(32).toString("hex");
    const timestamp = now();
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const claimed = this.db.prepare("UPDATE device_authorizations SET status = 'approved', device_id = ?, device_token_hash = ?, device_token = ?, approved_at = ? WHERE authorization_id = ? AND status = 'pending'").run(id, tokenHash(token), token, timestamp, authorizationId);
      if (claimed.changes !== 1) throw new Error("invalid_device_authorization");
      this.db.prepare("INSERT INTO devices (id, name, token_hash, created_at, last_seen_at) VALUES (?, ?, ?, ?, ?)").run(id, row.device_name, tokenHash(token), timestamp, timestamp);
      this.db.exec("COMMIT");
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
    this.audit(id, "device_authorization_approved", authorizationId);
    return { authorization_id: authorizationId, device_id: id, device_name: row.device_name, status: "approved" as const };
  }

  deviceAuthorizationToken(authorizationId: string, userCode: unknown) {
    if (typeof userCode !== "string" || !userCode) throw new Error("invalid_device_authorization");
    const row = this.db.prepare("SELECT device_name, status, expires_at, device_id, device_token FROM device_authorizations WHERE authorization_id = ? AND user_code_hash = ?").get(authorizationId, tokenHash(userCode.trim().toUpperCase())) as { device_name: string; status: string; expires_at: string; device_id: string | null; device_token: string | null } | undefined;
    if (!row || row.expires_at <= now()) throw new Error("invalid_device_authorization");
    if (row.status !== "approved" || !row.device_id || !row.device_token) return { authorization_id: authorizationId, status: row.status };
    this.db.prepare("UPDATE device_authorizations SET device_token = NULL WHERE authorization_id = ? AND device_token IS NOT NULL").run(authorizationId);
    return { authorization_id: authorizationId, status: "approved" as const, device_id: row.device_id, device_name: row.device_name, device_token: row.device_token };
  }

  backup(target?: string) {
    const directory = join(dirname(this.file), "backups");
    mkdirSync(directory, { recursive: true });
    const destination = resolve(target || join(directory, `better-codex-hub-${new Date().toISOString().replace(/[:.]/g, "-")}.db`));
    if (existsSync(destination)) throw new Error("backup_already_exists");
    this.db.prepare("VACUUM INTO ?").run(destination);
    const check = new DatabaseSync(destination, { readOnly: true });
    try {
      const integrity = check.prepare("PRAGMA quick_check").get() as { quick_check?: string } | undefined;
      if (integrity?.quick_check !== "ok") throw new Error("backup_integrity_failed");
    } finally {
      check.close();
    }
    this.audit("admin", "backup_created", destination);
    return { backup: destination };
  }

  createPairingCode() {
    const code = randomBytes(6).toString("base64url");
    const expires_at = after(10 * 60_000);
    this.db.prepare("INSERT INTO pairing_codes (code_hash, expires_at) VALUES (?, ?)").run(tokenHash(code), expires_at);
    this.audit("admin", "pairing_code_created");
    return { pairing_code: code, expires_at };
  }

  pairDevice(nameValue: unknown, code: unknown, replaceExisting = false) {
    const name = cleanString(nameValue, 120, false).trim();
    if (typeof code !== "string" || !code) throw new Error("invalid_pairing_code");
    const row = this.db.prepare("SELECT expires_at, used_at FROM pairing_codes WHERE code_hash = ?").get(tokenHash(code)) as { expires_at: string; used_at: string | null } | undefined;
    if (!row || row.used_at || row.expires_at <= now()) throw new Error("invalid_pairing_code");
    const id = randomUUID();
    const token = randomBytes(32).toString("hex");
    const timestamp = now();
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const pairing = this.db.prepare("UPDATE pairing_codes SET used_at = ? WHERE code_hash = ? AND used_at IS NULL").run(timestamp, tokenHash(code));
      if (pairing.changes !== 1) throw new Error("invalid_pairing_code");
      this.db.prepare("INSERT INTO devices (id, name, token_hash, created_at, last_seen_at) VALUES (?, ?, ?, ?, ?)").run(id, name, tokenHash(token), timestamp, timestamp);
      if (replaceExisting) {
        this.db.prepare("UPDATE devices SET revoked_at = ?, lease_expires_at = NULL WHERE id != ? AND revoked_at IS NULL").run(timestamp, id);
        this.db.prepare("UPDATE entities SET owner_device_id = ? WHERE owner_device_id != ?").run(id, id);
        this.db.prepare("UPDATE conversations SET owner_device_id = ? WHERE owner_device_id != ?").run(id, id);
        this.db.prepare("UPDATE remote_commands SET device_id = ? WHERE device_id != ? AND status = 'pending'").run(id, id);
        this.db.prepare("DELETE FROM runtime_projection WHERE device_id != ?").run(id);
      }
      this.db.exec("COMMIT");
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
    this.audit(id, "device_paired", name);
    if (replaceExisting) this.audit(id, "device_ownership_transferred");
    return { protocol_version: syncProtocolVersion, device_id: id, device_token: token, device_name: name };
  }

  deviceForToken(token: string) {
    if (!token) return null;
    return this.db.prepare("SELECT id, name, lease_expires_at FROM devices WHERE token_hash = ? AND revoked_at IS NULL").get(tokenHash(token)) as { id: string; name: string; lease_expires_at: string | null } | undefined ?? null;
  }

  devices() {
    return this.db.prepare("SELECT id, name, created_at, last_seen_at, lease_expires_at, revoked_at FROM devices ORDER BY created_at").all();
  }

  revokeDevice(id: string) {
    const result = this.db.prepare("UPDATE devices SET revoked_at = ?, lease_expires_at = NULL WHERE id = ? AND revoked_at IS NULL").run(now(), id);
    if (result.changes !== 1) throw new Error("device_not_found");
    this.audit("admin", "device_revoked", id);
    return { revoked: true, device_id: id };
  }

  private cursor() {
    return Number((this.db.prepare("SELECT COALESCE(MAX(seq), 0) AS value FROM changes").get() as { value: number }).value);
  }

  private writerDeviceId(entityId = "", entityType: SyncEntityType = "issue") {
    if (entityId) {
      const entity = this.db.prepare("SELECT owner_device_id FROM entities WHERE entity_type = ? AND entity_id = ?").get(entityType, entityId) as { owner_device_id: string } | undefined;
      if (entity) return entity.owner_device_id;
    }
    const device = this.db.prepare("SELECT id FROM devices WHERE revoked_at IS NULL AND lease_expires_at IS NOT NULL ORDER BY last_seen_at DESC LIMIT 1").get() as { id: string } | undefined;
    if (!device) throw new Error("runtime_not_paired");
    return device.id;
  }

  private recordCommandChange(commandId: string, status: RemoteCommandStatus, detail: string | null = null) {
    const timestamp = now();
    this.db.prepare("INSERT INTO remote_command_audit (command_id, status, detail, created_at) VALUES (?, ?, ?, ?)").run(commandId, status, detail, timestamp);
    this.db.prepare("INSERT INTO changes (entity_type, entity_id, operation, created_at) VALUES ('issue', ?, 'command', ?)").run(commandId, timestamp);
    this.pruneChanges();
  }

  private pruneChanges() {
    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60_000).toISOString();
    this.db.prepare("DELETE FROM changes WHERE created_at < ? OR seq <= (SELECT MAX(seq) - 10000 FROM changes)").run(cutoff);
  }

  private expireCommands() {
    const timestamp = now();
    const recovered = this.db.prepare("SELECT command_id FROM remote_commands WHERE status = 'dispatched' AND dispatch_expires_at IS NOT NULL AND dispatch_expires_at <= ?").all(timestamp) as Array<{ command_id: string }>;
    for (const row of recovered) {
      this.db.prepare("UPDATE remote_commands SET status = 'pending', delivery_id = NULL, dispatched_at = NULL, dispatch_expires_at = NULL, last_delivery_error = 'delivery_lease_expired' WHERE command_id = ? AND status = 'dispatched'").run(row.command_id);
      this.recordCommandChange(row.command_id, "pending", "delivery_lease_expired");
    }
    const rows = this.db.prepare("SELECT command_id FROM remote_commands WHERE status = 'pending' AND expires_at <= ?").all(timestamp) as Array<{ command_id: string }>;
    for (const row of rows) {
      this.db.prepare("UPDATE remote_commands SET status = 'expired', finished_at = ?, error = 'command_expired' WHERE command_id = ? AND status = 'pending'").run(now(), row.command_id);
      this.recordCommandChange(row.command_id, "expired", "command_expired");
    }
  }

  createRemoteCommand(input: { command_id?: unknown; operation: unknown; entity_id?: unknown; base_revision?: unknown; payload?: unknown }) {
    if (this.isReadOnly()) throw new Error("hub_read_only");
    if (!remoteCommandOperations.includes(input.operation as never)) throw new Error("invalid_command_operation");
    const operation = input.operation as RemoteCommandOperation;
    const settingOperation = operation === "settings.auto-dispatch";
    const directoryOperation = operation === "project.pick_directory" || operation === "project.browse_directory" || operation === "project.create_directory";
    const projectOperation = operation.startsWith("project.");
    const createOperation = operation === "issue.create" || operation === "project.create" || directoryOperation;
    const commandId = input.command_id === undefined ? randomUUID() : cleanString(input.command_id, 200, false);
    if (!/^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,199}$/.test(commandId)) throw new Error("invalid_command_id");
    const baseRevision = createOperation || settingOperation ? null : Number(input.base_revision);
    if (!createOperation && !settingOperation && (!Number.isInteger(baseRevision) || Number(baseRevision) < 1)) throw new Error("invalid_version");
    const payload = cleanCommandPayload(operation, input.payload ?? {});
    const existing = this.db.prepare("SELECT * FROM remote_commands WHERE command_id = ?").get(commandId) as CommandRow | undefined;
    if (existing) {
      if (existing.operation !== operation || (input.entity_id !== undefined && existing.entity_id !== input.entity_id) || existing.base_revision !== baseRevision || existing.payload_json !== JSON.stringify(payload)) throw new Error("command_id_conflict");
      return commandFromRow(existing);
    }
    if (settingOperation) {
      const active = this.db.prepare("SELECT * FROM remote_commands WHERE operation = ? AND entity_id = 'auto-dispatch' AND status IN ('pending', 'dispatched') ORDER BY requested_at LIMIT 1").get(operation) as CommandRow | undefined;
      if (active) {
        if (active.payload_json === JSON.stringify(payload)) return commandFromRow(active);
        throw new Error("setting_busy");
      }
    }
    const entityId = settingOperation ? "auto-dispatch" : createOperation && input.entity_id === undefined ? randomUUID() : cleanString(input.entity_id, 200, false);
    if (!/^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,199}$/.test(entityId)) throw new Error("invalid_entity_id");
    const entityType: SyncEntityType = projectOperation ? "project" : "issue";
    const current = this.db.prepare("SELECT payload_json, deleted_at FROM entities WHERE entity_type = ? AND entity_id = ?").get(entityType, entityId) as { payload_json: string; deleted_at: string | null } | undefined;
    if (createOperation && current && !current.deleted_at) throw new Error(`${entityType}_exists`);
    if (!createOperation && !settingOperation && (!current || current.deleted_at)) throw new Error(`${entityType}_not_found`);
    const currentProjection = current && !projectOperation ? JSON.parse(current.payload_json) as IssueProjection : null;
    const pendingReply = createOperation || settingOperation || projectOperation ? undefined : this.db.prepare("SELECT 1 AS value FROM remote_commands WHERE entity_id = ? AND operation = 'issue.reply' AND status IN ('pending', 'dispatched') LIMIT 1").get(entityId);
    const running = Boolean(currentProjection?.active_run_status || currentProjection?.reply_status === "running" || ["starting", "active", "stopping", "waiting_on_approval", "waiting_on_user"].includes(currentProjection?.session_status || "") || pendingReply);
    if (current && running && !["issue.reply", "issue.stop", "issue.queue.update", "issue.queue.send", "issue.queue.delete"].includes(operation)) throw new Error("issue_execution_running");
    if (operation === "issue.reply" && currentProjection?.archived_at) throw new Error("issue_archived");
    if (operation === "issue.reply" && !currentProjection?.has_conversation) throw new Error("session_required");
    if (["issue.queue.update", "issue.queue.send", "issue.queue.delete"].includes(operation) && currentProjection?.archived_at) throw new Error("issue_archived");
    if (["issue.queue.update", "issue.queue.send", "issue.queue.delete"].includes(operation) && !currentProjection?.has_conversation) throw new Error("session_required");
    if (operation === "issue.stop" && !running) throw new Error("issue_not_running");
    if (payload.agent_id && !this.board().agents.some(agent => agent.id === payload.agent_id)) throw new Error("agent_not_found");
    const deviceId = this.writerDeviceId(settingOperation || createOperation ? "" : entityId, entityType);
    if (operation === "issue.delete" || operation === "project.delete" || operation === "project.browse_directory" || operation === "project.create_directory" || operation === "issue.queue.update" || operation === "issue.queue.send" || operation === "issue.queue.delete" || operation === "issue.regenerate-title") {
      const runtimeRow = this.db.prepare("SELECT payload_json FROM runtime_projection WHERE device_id = ?").get(deviceId) as { payload_json: string } | undefined;
      const protocolVersion = runtimeRow ? (JSON.parse(runtimeRow.payload_json) as RuntimeProjection).protocol_version : null;
      const incompatible = operation === "project.delete" || operation === "project.browse_directory" || operation === "project.create_directory" || operation === "issue.queue.update" || operation === "issue.queue.send" || operation === "issue.queue.delete" || operation === "issue.regenerate-title"
        ? protocolVersion !== syncProtocolVersion
        : protocolVersion !== syncProtocolVersion && protocolVersion !== previousSyncProtocolVersion;
      if (incompatible) throw new Error("incompatible_protocol");
    }
    const requestedAt = now();
    const expiresAt = after(24 * 60 * 60_000);
    this.db.prepare("UPDATE remote_commands SET status = 'expired', finished_at = ?, error = 'superseded' WHERE entity_id = ? AND status IN ('conflict', 'rejected')").run(requestedAt, entityId);
    this.db.prepare("INSERT INTO remote_commands (command_id, device_id, operation, entity_id, base_revision, payload_json, status, requested_at, expires_at) VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?)").run(commandId, deviceId, operation, entityId, baseRevision, JSON.stringify(payload), requestedAt, expiresAt);
    this.recordCommandChange(commandId, "pending");
    return commandFromRow(this.db.prepare("SELECT * FROM remote_commands WHERE command_id = ?").get(commandId) as CommandRow);
  }

  commandQueueEmpty() {
    const summary = this.pendingCommandSummary();
    return summary.pending === 0 && summary.dispatched === 0;
  }

  remoteCommand(commandId: string) {
    this.expireCommands();
    const row = this.db.prepare("SELECT * FROM remote_commands WHERE command_id = ?").get(commandId) as CommandRow | undefined;
    return row ? commandFromRow(row) : null;
  }

  activeAutoDispatchCommand() {
    this.expireCommands();
    const row = this.db.prepare("SELECT * FROM remote_commands WHERE operation = 'settings.auto-dispatch' AND entity_id = 'auto-dispatch' AND status IN ('pending', 'dispatched') ORDER BY requested_at LIMIT 1").get() as CommandRow | undefined;
    return row ? commandFromRow(row) : null;
  }

  pendingCommands(deviceId: string, limit = 100) {
    this.expireCommands();
    return (this.db.prepare("SELECT * FROM remote_commands WHERE device_id = ? AND status = 'pending' ORDER BY requested_at, rowid LIMIT ?").all(deviceId, Math.min(Math.max(Math.trunc(limit), 1), 100)) as CommandRow[]).map(commandFromRow);
  }

  claimCommands(deviceId: string, limit = 100) {
    this.expireCommands();
    const boundedLimit = Math.min(Math.max(Math.trunc(limit), 1), 100);
    const rows = this.db.prepare("SELECT command_id FROM remote_commands WHERE device_id = ? AND status = 'pending' ORDER BY requested_at, rowid LIMIT ?").all(deviceId, boundedLimit) as Array<{ command_id: string }>;
    const claimed: RemoteCommand[] = [];
    this.db.exec("BEGIN IMMEDIATE");
    try {
      for (const row of rows) {
        const deliveryId = randomUUID();
        const dispatchedAt = now();
        const operation = this.db.prepare("SELECT operation FROM remote_commands WHERE command_id = ?").get(row.command_id) as { operation: RemoteCommandOperation } | undefined;
        const dispatchExpiresAt = after(operation?.operation === "project.pick_directory" || operation?.operation === "project.browse_directory" || operation?.operation === "project.create_directory" ? 300_000 : 90_000);
        const result = this.db.prepare("UPDATE remote_commands SET status = 'dispatched', delivery_id = ?, dispatched_at = ?, dispatch_expires_at = ?, attempt_count = COALESCE(attempt_count, 0) + 1 WHERE command_id = ? AND device_id = ? AND status = 'pending'").run(deliveryId, dispatchedAt, dispatchExpiresAt, row.command_id, deviceId);
        if (result.changes !== 1) continue;
        this.recordCommandChange(row.command_id, "dispatched", deliveryId);
        const command = this.db.prepare("SELECT * FROM remote_commands WHERE command_id = ?").get(row.command_id) as CommandRow;
        claimed.push(commandFromRow(command));
      }
      this.db.exec("COMMIT");
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
    return claimed;
  }

  pendingCommandCount(deviceId: string) {
    this.expireCommands();
    const row = this.db.prepare("SELECT COUNT(*) AS value FROM remote_commands WHERE device_id = ? AND status IN ('pending', 'dispatched')").get(deviceId) as { value: number };
    return Number(row.value);
  }

  pendingCommandSummary() {
    this.expireCommands();
    const rows = this.db.prepare("SELECT status, COUNT(*) AS value FROM remote_commands WHERE status IN ('pending', 'dispatched') GROUP BY status").all() as Array<{ status: "pending" | "dispatched"; value: number }>;
    return { pending: Number(rows.find(row => row.status === "pending")?.value || 0), dispatched: Number(rows.find(row => row.status === "dispatched")?.value || 0) };
  }

  revision() {
    return this.cursor();
  }

  heartbeat(deviceId: string) {
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const lease_expires_at = this.acquireLease(deviceId);
      const commands_available = this.pendingCommandCount(deviceId);
      this.db.exec("COMMIT");
      return { lease_expires_at, commands_available };
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }

  ackRemoteCommand(deviceId: string, ack: RemoteCommandAck) {
    const row = this.db.prepare("SELECT * FROM remote_commands WHERE command_id = ? AND device_id = ?").get(ack.command_id, deviceId) as CommandRow | undefined;
    if (!row) throw new Error("command_not_found");
    if (row.status !== "pending" && row.status !== "dispatched") return commandFromRow(row);
    if (row.status === "dispatched" && row.delivery_id && ack.delivery_id !== row.delivery_id) throw new Error("stale_command_delivery");
    if (!(["applied", "rejected", "conflict"] as const).includes(ack.status)) throw new Error("invalid_command_status");
    this.db.exec("BEGIN IMMEDIATE");
    try {
      if (ack.status === "applied" && (row.operation === "project.pick_directory" || row.operation === "project.create_directory")) {
        const result = ack.result;
        if (!result || typeof result !== "object" || Array.isArray(result) || Object.keys(result).some(key => key !== "workspace_path")) throw new Error("invalid_command_result");
        const workspacePath = cleanString("workspace_path" in result ? result.workspace_path ?? "" : "", 4096).trim();
        this.db.prepare("UPDATE remote_commands SET payload_json = ? WHERE command_id = ?").run(JSON.stringify({ workspace_path: workspacePath }), ack.command_id);
      }
      if (ack.status === "applied" && row.operation === "project.browse_directory") {
        this.db.prepare("UPDATE remote_commands SET payload_json = ? WHERE command_id = ?").run(JSON.stringify(cleanDirectoryBrowserResult(ack.result)), ack.command_id);
      }
      if (ack.status === "applied" && row.operation === "issue.delete") {
        const timestamp = now();
        this.db.prepare("UPDATE entities SET deleted_at = ?, updated_at = ? WHERE entity_type = 'issue' AND entity_id = ? AND owner_device_id = ?").run(timestamp, timestamp, row.entity_id, deviceId);
        this.db.prepare("DELETE FROM conversations WHERE issue_id = ?").run(row.entity_id);
      }
      if (ack.status === "applied" && row.operation === "project.delete") {
        const timestamp = now();
        this.db.prepare("UPDATE entities SET deleted_at = ?, updated_at = ? WHERE entity_type = 'project' AND entity_id = ? AND owner_device_id = ?").run(timestamp, timestamp, row.entity_id, deviceId);
        const issues = this.db.prepare("SELECT entity_id FROM entities WHERE entity_type = 'issue' AND owner_device_id = ? AND deleted_at IS NULL AND json_extract(payload_json, '$.project_id') = ?").all(deviceId, row.entity_id) as Array<{ entity_id: string }>;
        for (const issue of issues) {
          this.db.prepare("UPDATE entities SET deleted_at = ?, updated_at = ? WHERE entity_type = 'issue' AND entity_id = ? AND owner_device_id = ?").run(timestamp, timestamp, issue.entity_id, deviceId);
          this.db.prepare("DELETE FROM conversations WHERE issue_id = ?").run(issue.entity_id);
        }
      }
      if (ack.status === "applied" && row.operation !== "settings.auto-dispatch" && row.operation !== "project.pick_directory" && row.operation !== "project.browse_directory" && row.operation !== "project.create_directory" && row.operation !== "project.delete" && row.operation !== "issue.delete") {
        const entityType: SyncEntityType = row.operation.startsWith("project.") ? "project" : "issue";
        const projectionId = row.operation === "project.create" && ack.projection && "id" in ack.projection ? ack.projection.id : row.entity_id;
        const projection = cleanProjection(entityType, projectionId, ack.projection);
        const current = this.db.prepare("SELECT owner_device_id FROM entities WHERE entity_type = ? AND entity_id = ?").get(entityType, projectionId) as { owner_device_id: string } | undefined;
        if (!current) this.db.prepare("INSERT INTO entities (entity_type, entity_id, owner_device_id, local_revision, payload_json, deleted_at, updated_at) VALUES (?, ?, ?, ?, ?, NULL, ?)").run(entityType, projectionId, deviceId, projection.local_revision, JSON.stringify(projection), now());
        else this.db.prepare("UPDATE entities SET local_revision = ?, payload_json = ?, deleted_at = NULL, updated_at = ? WHERE entity_type = ? AND entity_id = ? AND owner_device_id = ?").run(projection.local_revision, JSON.stringify(projection), now(), entityType, projectionId, deviceId);
      }
      if (ack.status === "applied" && row.operation === "settings.auto-dispatch") {
        const runtimeRow = this.db.prepare("SELECT payload_json FROM runtime_projection WHERE device_id = ?").get(deviceId) as { payload_json: string } | undefined;
        if (runtimeRow) this.db.prepare("UPDATE runtime_projection SET payload_json = ?, updated_at = ? WHERE device_id = ?").run(JSON.stringify({ ...JSON.parse(runtimeRow.payload_json), auto_dispatch: commandFromRow(row).payload.enabled === true }), now(), deviceId);
      }
      this.db.prepare("UPDATE remote_commands SET status = ?, finished_at = ?, error = ?, delivery_id = NULL, dispatched_at = NULL, dispatch_expires_at = NULL WHERE command_id = ? AND status IN ('pending', 'dispatched')").run(ack.status, now(), ack.error, ack.command_id);
      this.recordCommandChange(ack.command_id, ack.status, ack.error);
      this.db.exec("COMMIT");
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
    return this.remoteCommand(ack.command_id)!;
  }

  private acquireLease(deviceId: string) {
    const timestamp = now();
    const takeoverAt = new Date(Date.now() - 180_000).toISOString();
    const owner = this.db.prepare("SELECT id FROM devices WHERE id != ? AND revoked_at IS NULL AND lease_expires_at IS NOT NULL AND last_seen_at > ? LIMIT 1").get(deviceId, takeoverAt);
    if (owner) throw new Error("writer_lease_conflict");
    const expires = after(90_000);
    const renewed = this.db.prepare("UPDATE devices SET last_seen_at = ?, lease_expires_at = ? WHERE id = ? AND revoked_at IS NULL").run(timestamp, expires, deviceId);
    if (renewed.changes !== 1) throw new Error("device_revoked");
    return expires;
  }

  push(deviceId: string, request: SyncPushRequest) {
    if (!supportedSyncProtocolVersions.includes(request.protocol_version)) throw new Error("incompatible_protocol");
    if (request.device_id !== deviceId || !Array.isArray(request.changes) || request.changes.length > 100) throw new Error("invalid_changes");
    const runtime = cleanRuntime(request.runtime, deviceId);
    const accepted: string[] = [];
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const lease_expires_at = this.acquireLease(deviceId);
      for (const change of request.changes) {
        if (!change || !syncEntityTypes.includes(change.entity_type) || typeof change.entity_id !== "string" || !change.entity_id || typeof change.event_id !== "string" || !change.event_id || !["upsert", "delete"].includes(change.operation)) throw new Error("invalid_change");
        if (this.db.prepare("SELECT 1 FROM sync_events WHERE event_id = ?").get(change.event_id)) {
          accepted.push(change.event_id);
          continue;
        }
        const current = this.db.prepare("SELECT * FROM entities WHERE entity_type = ? AND entity_id = ?").get(change.entity_type, change.entity_id) as (EntityRow & { owner_device_id: string; local_revision: number }) | undefined;
        if (current && current.owner_device_id !== deviceId) throw new Error("entity_owned_by_another_device");
        const projection = change.operation === "upsert" ? cleanProjection(change.entity_type, change.entity_id, change.projection) : null;
        const payload = projection ? JSON.stringify(projection) : current?.payload_json ?? "{}";
        const deletedAt = projection ? null : cleanString(change.changed_at, 64, false);
        const localRevision = projection?.local_revision ?? current?.local_revision ?? 0;
        const changed = !current || current.payload_json !== payload || current.deleted_at !== deletedAt;
        if (!current) this.db.prepare("INSERT INTO entities (entity_type, entity_id, owner_device_id, local_revision, payload_json, deleted_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)").run(change.entity_type, change.entity_id, deviceId, localRevision, payload, deletedAt, now());
        else if (changed) this.db.prepare("UPDATE entities SET local_revision = ?, payload_json = ?, deleted_at = ?, updated_at = ? WHERE entity_type = ? AND entity_id = ?").run(localRevision, payload, deletedAt, now(), change.entity_type, change.entity_id);
        if (change.entity_type === "issue" && !projection) this.db.prepare("DELETE FROM conversations WHERE issue_id = ?").run(change.entity_id);
        this.db.prepare("INSERT INTO sync_events (event_id, device_id, received_at) VALUES (?, ?, ?)").run(change.event_id, deviceId, now());
        if (changed) this.db.prepare("INSERT INTO changes (entity_type, entity_id, operation, created_at) VALUES (?, ?, ?, ?)").run(change.entity_type, change.entity_id, projection ? "upsert" : "delete", now());
        accepted.push(change.event_id);
      }
      const previousRuntime = this.db.prepare("SELECT payload_json FROM runtime_projection WHERE device_id = ?").get(deviceId) as { payload_json: string } | undefined;
      const nextRuntime = { ...runtime, last_seen_at: now() };
      this.db.prepare("INSERT INTO runtime_projection (device_id, payload_json, updated_at) VALUES (?, ?, ?) ON CONFLICT(device_id) DO UPDATE SET payload_json = excluded.payload_json, updated_at = excluded.updated_at").run(deviceId, JSON.stringify(nextRuntime), now());
      if (runtimeProjectionSignature(previousRuntime ? JSON.parse(previousRuntime.payload_json) as RuntimeProjection : null) !== runtimeProjectionSignature(nextRuntime)) this.db.prepare("INSERT INTO changes (entity_type, entity_id, operation, created_at) VALUES ('runtime', ?, 'upsert', ?)").run(deviceId, now());
      this.pruneChanges();
      this.db.exec("COMMIT");
      return { accepted, cursor: this.cursor(), lease_expires_at };
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }

  runtime() {
    const runtimeRow = this.db.prepare("SELECT payload_json, updated_at FROM runtime_projection ORDER BY updated_at DESC LIMIT 1").get() as { payload_json: string; updated_at: string } | undefined;
    let runtime = runtimeRow ? JSON.parse(runtimeRow.payload_json) as RuntimeProjection : null;
    if (runtime && Date.now() - Date.parse(runtimeRow!.updated_at) > 60_000) runtime = { ...runtime, health_state: "offline" };
    return runtime;
  }

  board(): HubBoard {
    this.expireCommands();
    const rows = this.db.prepare("SELECT entity_type, entity_id, payload_json, deleted_at FROM entities WHERE deleted_at IS NULL ORDER BY entity_type, updated_at").all() as EntityRow[];
    const runtime = this.runtime();
    const issues = rows.filter(row => row.entity_type === "issue").map(row => JSON.parse(row.payload_json) as IssueProjection);
    const directory = rows.find(row => row.entity_type === "agent_directory");
    const agentDirectory = directory ? JSON.parse(directory.payload_json) as AgentDirectoryProjection : null;
    const agents = agentDirectory?.agents ?? [];
    const commands = this.db.prepare("SELECT * FROM remote_commands WHERE status IN ('pending', 'dispatched', 'conflict', 'rejected') ORDER BY requested_at, rowid").all() as CommandRow[];
    for (const row of commands) {
      const command = commandFromRow(row);
      let issue = issues.find(item => item.id === command.entity_id);
      if (!issue && command.operation === "issue.create" && ["pending", "dispatched"].includes(command.status)) {
        issue = {
          id: command.entity_id,
          identifier: `PENDING-${command.entity_id.slice(0, 8).toUpperCase()}`,
          project_id: String(command.payload.project_id),
          title: String(command.payload.title),
          description: String(command.payload.description || ""),
          status: command.payload.ai_enrich === true ? "todo" : command.payload.status as IssueProjection["status"] || "todo",
          priority: command.payload.priority as IssueProjection["priority"] || "medium",
          labels: command.payload.labels as string[] || [],
          sort_order: Number.MAX_SAFE_INTEGER,
          pinned: false,
          archived_at: null,
          assigned: command.payload.agent_enabled === true || command.payload.user_assigned === true,
          agent_enabled: command.payload.agent_enabled === true,
          agent_id: typeof command.payload.agent_id === "string" && command.payload.agent_id ? command.payload.agent_id : null,
          user_assigned: command.payload.user_assigned === true,
          assignee_user_id: typeof command.payload.assignee_user_id === "string" && command.payload.assignee_user_id ? command.payload.assignee_user_id : null,
          pending_actor: command.payload.agent_enabled === true ? "agent" : "user",
          enrichment_status: command.payload.ai_enrich === true ? "pending" : null,
          active_run_status: null,
          latest_run_status: null,
          latest_scheduler_status: null,
          session_status: null,
          reply_status: "idle",
          has_conversation: false,
          last_activity_finished_at: null,
          needs_attention: false,
          created_at: command.requested_at,
          updated_at: command.requested_at,
          local_revision: 0,
        };
        issues.push(issue);
      }
      if (!issue) continue;
      if (["pending", "dispatched"].includes(command.status) && ["issue.update", "issue.move", "issue.start", "issue.regenerate-title"].includes(command.operation)) {
        Object.assign(issue, command.payload, { updated_at: command.requested_at });
        if (command.operation === "issue.start") Object.assign(issue, { agent_enabled: true, user_assigned: false, assignee_user_id: null, pending_actor: "agent", assigned: true });
        if (command.operation === "issue.regenerate-title") Object.assign(issue, { enrichment_status: "regenerating" });
      }
      Object.assign(issue, { remote_state: { command_id: command.command_id, status: command.status, operation: command.operation, error: command.error } });
    }
    return {
      revision: this.cursor(),
      projects: rows.filter(row => row.entity_type === "project").map(row => JSON.parse(row.payload_json) as ProjectProjection),
      issues: issues.sort((left, right) => left.sort_order - right.sort_order || left.created_at.localeCompare(right.created_at)),
      agents,
      default_avatar: agentDirectory?.default_avatar ?? "",
      runtime,
    };
  }

  changesAfter(cursor: number, limit = 1000) {
    if (!Number.isSafeInteger(cursor) || cursor < 0) throw new Error("invalid_cursor");
    return this.db.prepare("SELECT seq, entity_type, entity_id, operation, created_at FROM changes WHERE seq > ? ORDER BY seq LIMIT ?").all(cursor, Math.min(Math.max(limit, 1), 1000)) as Array<{ seq: number; entity_type: string; entity_id: string; operation: string; created_at: string }>;
  }

  putConversation(deviceId: string, issueId: string, value: unknown) {
    const entity = this.db.prepare("SELECT owner_device_id FROM entities WHERE entity_type = 'issue' AND entity_id = ? AND deleted_at IS NULL").get(issueId) as { owner_device_id: string } | undefined;
    if (!entity || entity.owner_device_id !== deviceId) throw new Error("issue_not_found");
    if (!value || typeof value !== "object" || Array.isArray(value) || containsForbiddenKey(value)) throw new Error("invalid_conversation_projection");
    const source = value as Record<string, unknown>;
    if (source.issue_id !== issueId || typeof source.found !== "boolean" || !Array.isArray(source.messages) || source.messages.length > 80) throw new Error("invalid_conversation_projection");
    const messages = source.messages.map((value, index) => {
      if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("invalid_conversation_projection");
      const message = value as Record<string, unknown>;
      if (message.role !== "user" && message.role !== "agent") throw new Error("invalid_conversation_projection");
      return {
        id: cleanString(message.id ?? `${message.role}-${index}`, 200, false),
        role: message.role as "user" | "agent",
        markdown: cleanString(message.markdown, 100_000),
        html: "",
        phase: message.phase === null || message.phase === undefined ? null : cleanString(message.phase, 40),
        timestamp: message.timestamp === null || message.timestamp === undefined ? null : cleanString(message.timestamp, 64),
      };
    });
    const replySource = source.reply;
    if (!replySource || typeof replySource !== "object" || Array.isArray(replySource)) throw new Error("invalid_conversation_projection");
    const reply = replySource as Record<string, unknown>;
    if (!["idle", "running", "succeeded", "failed", "interrupted"].includes(String(reply.status))) throw new Error("invalid_conversation_projection");
    const queuedReplies = Array.isArray(source.queued_replies) ? source.queued_replies.map(value => {
      if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("invalid_conversation_projection");
      const queued = value as Record<string, unknown>;
      return {
        request_id: cleanString(queued.request_id, 200, false),
        message: cleanString(queued.message, 100_000),
        created_at: cleanString(queued.created_at, 64, false),
      };
    }).slice(0, 100) : [];
    const projection: ConversationProjection = {
      issue_id: issueId,
      found: source.found,
      messages,
      reply: {
        ...(typeof reply.request_id === "string" ? { request_id: cleanString(reply.request_id, 200) } : {}),
        status: reply.status as ConversationProjection["reply"]["status"],
        message: cleanString(reply.message, 100_000),
        ...(typeof reply.error === "string" ? { error: cleanString(reply.error, 2000) } : {}),
        ...(typeof reply.started_at === "string" ? { started_at: cleanString(reply.started_at, 64) } : {}),
        ...(typeof reply.finished_at === "string" ? { finished_at: cleanString(reply.finished_at, 64) } : {}),
      },
      queued_replies: queuedReplies,
      updated_at: cleanString(source.updated_at, 64, false),
    };
    const payload = JSON.stringify(projection);
    const current = this.db.prepare("SELECT payload_json FROM conversations WHERE issue_id = ?").get(issueId) as { payload_json: string } | undefined;
    if (current?.payload_json === payload) return projection;
    const timestamp = now();
    this.db.prepare("INSERT INTO conversations (issue_id, owner_device_id, payload_json, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(issue_id) DO UPDATE SET owner_device_id = excluded.owner_device_id, payload_json = excluded.payload_json, updated_at = excluded.updated_at").run(issueId, deviceId, payload, timestamp);
    this.db.prepare("INSERT INTO changes (entity_type, entity_id, operation, created_at) VALUES ('issue', ?, 'conversation', ?)").run(issueId, timestamp);
    this.pruneChanges();
    return projection;
  }

  conversation(issueId: string) {
    const row = this.db.prepare("SELECT payload_json FROM conversations WHERE issue_id = ?").get(issueId) as { payload_json: string } | undefined;
    return row ? JSON.parse(row.payload_json) as ConversationProjection : null;
  }

  changeWindow(cursor: number, limit = 1000) {
    if (!Number.isSafeInteger(cursor) || cursor < 0) throw new Error("invalid_cursor");
    const current = this.cursor();
    const oldest = Number((this.db.prepare("SELECT COALESCE(MIN(seq), ?) AS value FROM changes").get(current + 1) as { value: number }).value);
    if (cursor > current || cursor < oldest - 1) return { resync_required: true, revision: current, changes: [] as ReturnType<HubStore["changesAfter"]> };
    return { resync_required: false, revision: current, changes: this.changesAfter(cursor, limit) };
  }

  clearProjection() {
    const pending = this.db.prepare("SELECT COUNT(*) AS value FROM remote_commands WHERE status = 'pending'").get() as { value: number };
    if (Number(pending.value) > 0) throw new Error("pending_commands_exist");
    this.db.exec("BEGIN IMMEDIATE");
    try {
      this.db.exec("DELETE FROM runtime_projection; DELETE FROM conversations; DELETE FROM sync_events; DELETE FROM entities; DELETE FROM changes;");
      this.db.exec("COMMIT");
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
    this.audit("admin", "projection_cleared");
    return { cleared: true };
  }
}

export function restoreHubBackup(databaseFile: string, backupFile: string) {
  const database = resolve(databaseFile);
  const backup = resolve(backupFile);
  if (!existsSync(backup)) throw new Error("backup_not_found");
  const source = new DatabaseSync(backup, { readOnly: true });
  try {
    const integrity = source.prepare("PRAGMA quick_check").get() as { quick_check?: string } | undefined;
    const migration = source.prepare("SELECT MAX(version) AS version FROM hub_migrations").get() as { version?: number } | undefined;
    const version = Number(migration?.version);
    if (integrity?.quick_check !== "ok" || !Number.isInteger(version) || version < 1) throw new Error("backup_invalid");
    if (version > hubSchemaVersion) throw new Error("hub_backup_schema_too_new");
  } finally {
    source.close();
  }
  mkdirSync(dirname(database), { recursive: true });
  const temporary = `${database}.restore-${randomUUID()}`;
  copyFileSync(backup, temporary);
  if (existsSync(database)) renameSync(database, `${database}.before-restore-${new Date().toISOString().replace(/[:.]/g, "-")}`);
  renameSync(temporary, database);
  return { restored: database, source: backup };
}
