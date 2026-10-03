import { z } from "zod";

const text = (max: number) => z.string().max(max).refine(value => !value.includes("\0"), "NUL is forbidden");
const id = text(200).min(1);
const priority = z.enum(["none", "low", "medium", "high", "urgent"]);
const labels = z.array(text(80).min(1)).max(20);
export const emptyInput = z.strictObject({});
export const listTasksInput = z.strictObject({ project_id: id.optional(), search: text(500).optional(), archived: z.boolean().optional() });
export const getTaskInput = z.strictObject({ id });
export const createTaskInput = z.strictObject({
  request_id: z.string().regex(/^[A-Za-z0-9_-]{8,200}$/), project_id: id,
  title: text(500).min(1), description: text(20_000).optional(), priority: priority.optional(), labels: labels.optional(),
  parent_issue_id:id.nullable().optional(),depends_on_issue_ids:z.array(id).max(64).optional(),
});
export const updateTaskInput = z.strictObject({
  id, version: z.number().int().positive(), title: text(500).min(1).optional(), description: text(20_000).optional(),
  priority: priority.optional(), labels: labels.optional(), pinned: z.boolean().optional(),
  parent_issue_id:id.nullable().optional(),depends_on_issue_ids:z.array(id).max(64).optional(),
}).refine(value => Object.keys(value).some(key => key !== "id" && key !== "version"), "A descriptive field is required");
export const taskSchema = z.object({
  id, identifier: z.string(), project_id: id, title: z.string(), description: z.string(),
  status: z.enum(["backlog", "todo", "in_progress", "in_review", "done", "blocked"]), priority, labels: z.array(z.string()),
  pinned: z.boolean(), archived_at: z.string().nullable(), thread_id: z.string().nullable(), agent_enabled: z.boolean(),
  version: z.number().int().positive(), created_at: z.string(), updated_at: z.string(),
  parent_issue_id:id.nullable().optional(),depends_on_issue_ids:z.array(id).optional(),
});
const executionState = z.enum(["queued", "running", "waiting_user", "waiting_approval", "blocked", "failed", "cancelled", "idle", "unknown"]);
export const taskBlockerSchema = z.strictObject({kind:z.enum(["dependency","input","approval","execution","protocol","other"]),message:text(2000).min(1)});
export const taskSummarySchema = z.strictObject({text:text(4000).min(1),evidence:z.array(text(2000).min(1)).max(24)});
export const externalObservationSchema = z.object({
  id, provider: z.string(), account_id: z.string(), host_id: z.string(), thread_id: z.string().nullable(), title: z.string(), description: z.string(),
  project_id: z.string().nullable(), parent_thread_id: z.string().nullable(), execution_state: executionState,
  reported_execution_state: executionState, task_result: z.enum(["unknown", "reported_complete"]), acceptance_state: z.literal("unknown"),
  freshness: z.enum(["fresh", "stale", "disconnected"]), reported_at: z.string(), observed_at: z.string(), updated_at: z.string(),
  sequence: z.number().int().positive(), source: z.object({ kind: z.literal("task_reporter"), attribution: z.literal("declared"), channel: z.enum(["local_file", "mcp"]).optional() }),
  creator: z.object({ name: z.string().nullable(), verification: z.literal("unknown"), avatar: z.null(), local_profile_id: text(80).optional(), display_source: z.literal("user_mapping").optional() }),
  executor: z.object({ name: z.string().nullable(), verification: z.literal("unknown") }).optional(),
  declared_creator_name: z.string().nullable().optional(),
  source_task_id:id.optional(),source_run_id:id.nullable().optional(),run_number:z.number().int().positive().nullable().optional(),
  source_version:z.number().int().positive().optional(),version:z.number().int().positive().optional(),
  parent_source_task_id:id.nullable().optional(),depends_on_source_task_ids:z.array(id).max(64).optional(),
  blocker:taskBlockerSchema.nullable().optional(),summary:taskSummarySchema.nullable().optional(),history_cursor:z.number().int().nonnegative().optional(),
});
export const externalCapabilitySchema = z.object({
  enabled: z.boolean(), connected: z.boolean(), mode: z.enum(["opt_in_reporter", "mcp_reporting", "mixed"]), poll_interval_ms: z.number(), freshness_ttl_ms: z.number(),
  last_poll_at: z.string().nullable(), error: z.string().nullable(), rejected_reports: z.number().int().nonnegative(),
});
export const externalCollectionSchema = z.object({ observations: z.array(externalObservationSchema), capability: externalCapabilitySchema });
export const externalDetailSchema = z.object({ observation: externalObservationSchema, capability: externalCapabilitySchema,
  messages: z.array(z.object({ item_id: z.string(), sequence: z.number().int().positive(), role: z.enum(["agent", "system"]), text: z.string(), created_at: z.string() })),
  runs:z.array(z.object({source_run_id:id,run_number:z.number().int().positive(),state:z.string(),first_reported_at:z.string(),last_reported_at:z.string(),finished_at:z.string().nullable(),summary:taskSummarySchema.nullable(),blocker:taskBlockerSchema.nullable()})).optional(),
  history_cursor:z.number().int().nonnegative().optional(),
});
export const reportExternalInput = z.strictObject({
  schema_version: z.literal(1), provider: text(64).min(1), account_id: text(160).min(1), host_id: text(160).min(1), thread_id: id,
  sequence: z.number().int().positive().max(Number.MAX_SAFE_INTEGER), item_id: id,
  reported_at: text(40).refine(value => Number.isFinite(Date.parse(value)) && Date.parse(value) <= Date.now() + 30_000, "Invalid report time"),
  state: z.enum(["running", "waiting_user", "waiting_approval", "failed", "completed", "idle"]), title: text(300).min(1),
  description: text(20_000), project_id: id.nullable(), parent_thread_id: id.nullable(), creator_name: text(160).nullable(), message: text(20_000).nullable(),
  executor_name: text(160).nullable().optional(),
});
export const reportExternalTaskInput = z.strictObject({
  schema_version:z.literal(2),provider:text(64).min(1),account_id:text(160).min(1),host_id:text(160).min(1),source_task_id:id,
  source_run_id:id.nullable(),run_number:z.number().int().positive().max(Number.MAX_SAFE_INTEGER).nullable(),sequence:z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  event_id:id,version:z.number().int().positive().max(Number.MAX_SAFE_INTEGER),reported_at:text(40),
  event_kind:z.enum(["snapshot","heartbeat","worker_exit"]).optional(),state:z.enum(["queued","running","waiting_user","waiting_approval","blocked","failed","cancelled","completed","idle"]),
  title:text(300).min(1),description:text(20_000),project_id:id.nullable(),thread_id:id.nullable().optional(),
  parent_source_task_id:id.nullable().optional(),depends_on_source_task_ids:z.array(id).max(64).optional(),
  creator_name:text(160).nullable().optional(),executor_name:text(160).nullable().optional(),message:text(20_000).nullable().optional(),
  blocker:taskBlockerSchema.nullable().optional(),summary:taskSummarySchema.nullable().optional(),
});
export const externalEventsInput = z.strictObject({after:z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER).optional(),limit:z.number().int().positive().max(200).optional(),task_id:id.optional()});
export const taskHistoryInput = z.strictObject({id,after:z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER).optional(),limit:z.number().int().positive().max(200).optional()});
export const taskHistorySchema = z.object({task_id:id,acceptance_state:z.enum(["accepted","unknown"]),creator:z.object({source:z.enum(["runtime_user_context","unknown"]),user_id:id.nullable()}),
  relationships:z.object({parent_issue_id:id.nullable(),depends_on_issue_ids:z.array(id)}),blocker:taskBlockerSchema.nullable(),
  dependencies:z.array(z.object({id,identifier:z.string().nullable(),status:z.string(),accepted:z.boolean()})),
  runs:z.array(z.object({id,run_number:z.number().int().positive(),state:z.string(),thread_id:id.nullable(),turn_id:id.nullable(),started_at:z.string(),finished_at:z.string().nullable(),summary:taskSummarySchema.nullable(),blocker:taskBlockerSchema.nullable()})),
  events:z.array(z.object({cursor:z.number().int().positive(),event_id:id,run_id:id.nullable(),kind:z.string(),observed_at:z.string(),payload:z.record(z.string(),z.json())})),next_cursor:z.number().int().nonnegative(),has_more:z.boolean()});
export const externalEventsSchema = z.object({events:z.array(z.object({cursor:z.number().int().positive(),task_id:id,event_id:id,source_run_id:id.nullable(),sequence:z.number().int().positive(),source_version:z.number().int().positive().nullable(),kind:z.string(),state:z.string().nullable(),outcome:z.string(),reported_at:z.string(),observed_at:z.string().nullable(),message:z.string().nullable(),applied_state:z.string().nullable(),detail:z.object({blocker:taskBlockerSchema.nullable(),summary:taskSummarySchema.nullable()}).nullable()})),next_cursor:z.number().int().nonnegative(),has_more:z.boolean()});
export const externalReportResultSchema = z.object({ status: z.enum(["applied", "duplicate", "out_of_order","stale_run","terminal_run"]), id, observation: externalObservationSchema });
export const projectsSchema = z.array(z.object({ id, name: z.string() }));
export const boardSnapshotSchema = z.object({ tasks: z.array(taskSchema), external_observations: z.array(externalObservationSchema),
  external_observation_capability: externalCapabilitySchema, projects: projectsSchema });
export const boardApiInput = z.strictObject({ path: z.string().max(1000), method: z.literal("GET").optional() });
export const boardApiOutput = z.object({ data: z.json() });
export type BoardSnapshot = z.infer<typeof boardSnapshotSchema>;
