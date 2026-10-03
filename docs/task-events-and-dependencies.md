# Task events and execution attempts — local .7

This implementation uses original TypeScript code. Hermes supplied architecture ideas, not copied code or a second scheduler. Runtime owns the existing business database and all writes. The Session Host and issue/thread ownership protocol remain authoritative for local execution.

## External v2 reporting

Use the existing opt-in local `external_tasks_report` MCP tool. It reaches the existing authorized ingestion route. It neither discovers cloud dots nor creates a network listener, credential, permission or execution worker. V1 file reporting remains supported; its file writer is not a v2 producer.

Each v2 report contains:

- A declared namespace: `provider`, `account_id`, `host_id`.
- Stable `source_task_id`, independent of optional real `thread_id`. Missing thread IDs stay null. Card identity hashes the namespace and source task ID, never the title.
- Nullable `source_run_id` plus `run_number`. Both are required together for an execution attempt. A retry after completed/failed/cancelled uses a new run ID and a strictly larger attempt ordinal.
- Positive task-wide `sequence` and source `version`, plus `event_id`. The producer must persist these counters across retries and restarts. Sequence must increase across attempts; source version cannot decrease. A legacy card upgrade must exceed its existing sequence watermark.
- `reported_at`, state, title, optional description, parent and dependencies, declared creator/executor labels, message, typed blocker and structured summary.
- `event_kind`: snapshot, heartbeat or worker_exit. Heartbeats require an existing run and cannot change its state.

Snapshot, run and receipt update atomically under `BEGIN IMMEDIATE` or an owning transaction savepoint. Exact duplicate events return duplicate without another receipt. A changed payload with the same event ID conflicts. Old runs, old sequence/version and terminal-run reversals retain ignored receipts without updating the current projection. A known run cannot change ordinal, and an ordinal cannot switch to another run ID. Unknown old attempts are never invented from v1 messages.

A worker exit without a preceding completion, failure, cancellation, waiting or blocked protocol event is a typed protocol blocker. It never grants completion. Explicit waiting/blocked states survive process exit. Silence only changes freshness to stale/unknown; it cannot imply failure, success or restart.

`GET /api/external-observations/events?after=CURSOR&limit=100&task_id=OPTIONAL_ID` and `external_observations_events` return ascending receiver cursors, `next_cursor` and `has_more`. Persist the cursor after handling each page. The cursor and ignored receipts survive Runtime restart. It is not the producer sequence and does not claim exhaustive discovery or delivery from cloud dots. Events include the reported state, applied state and blocker/summary; those remain distinct for protocol anomalies. Task detail returns latest 200 messages and up to 100 runs.

Creator verification remains unknown. Runtime selects the ingestion channel and reads optional private user mappings on the receiving side; report fields cannot set a verified creator, avatar, profile mapping or acceptance. A mapping is a user display association, not an official platform creator ID. No signed avatar URL is stored in source. Owned creator provenance comes from the persisted Runtime user context, not a model-supplied author label.

External parent/dependency references are declarations within the source namespace. Cycles are rejected atomically, including cycles through an initially unknown reference. They do not unlock local execution or prove that the prerequisites were accepted. Completed external reports show review; external acceptance remains unknown.

## Owned task history and dependency admission

Existing `issue_runs` remain the single local Run table. Additive `issue_task_events`, `issue_task_relationships` and `issue_dependencies` store receiver events and explicit relations. Run insert/status/result changes and task version changes generate receipts within the same database transaction. History does not manufacture past events: historical runs remain readable from the canonical Run table, while event collection starts with this feature.

`tasks_create` and versioned `tasks_update` accept optional `parent_issue_id` and `depends_on_issue_ids`, limited to 64 same-project owned tasks. Parent hierarchy is informational; ordering requires explicit dependencies. Relationships and content share optimistic-version checks, cycle checks, request-id deduplication and the same commit. These MCP tools still cannot assign execution, mutate creators, set status, or accept completion. Existing bound title synchronization may enqueue its normal rename command.

`claimNextIssue` checks dependencies inside its existing `BEGIN IMMEDIATE` admission transaction. Only persisted manual `done` acceptance satisfies a prerequisite. Review, failure, interruption, blocked and missing prerequisites do not. Deleting a prerequisite leaves a visible missing dependency; it cannot silently release the child. A database trigger also rejects a claimed Run inserted through the older admission path, retaining this protection across an older core rollback. Concurrent claim tests admit exactly one run.

Late scheduler, finish and interruption callbacks may close their own old Run, but only the latest inserted Run can change the task projection. Stale callbacks cannot increment the newer task version. Successful execution/evaluation still maps to review, never model acceptance.

`tasks_history` and `GET /api/issues/:id/history?after=CURSOR&limit=100` return attempts, safe execution summaries, typed blockers, relationship status, creator provenance, task acceptance and receiver events. The shared Web and MCP App details expose history on demand. Refresh updates only that pane and preserves unsaved description/reply content. Relay history UI is not exposed in this MVP; external write ingestion continues to reject Relay.

## Timing and recovery

There is no latency SLA. Local report ingestion commits before the response and emits the existing change notification. Supported subscriptions refresh on change and on a new/reset stream. Shared Web UI falls back to 3-second polling; the MCP App has a 15-second fallback. The freshness clock redraws every 5 seconds, with a 30-second report TTL. Suspended/hidden renderers may delay refresh. The v1 file watcher runs about once a second plus backlog work.

Network reconnection refreshes the snapshot and exposes persisted event replay to consumers. Standalone Web sessions are generation-scoped: a plain Runtime restart invalidates that browser session, requiring the supported login flow. The tests distinguish this from a transport disconnect and from desktop bridge reconnection. No authentication is bypassed.

Feature schema is additive and records versions in `task_journal_migrations` without advancing the existing business schema version. Runtime updates retain Session Host ownership. Code rollback never restores a business database snapshot. Existing user tasks are not used to generate test runs or fake reports. Native verification reads the installed projection; synthetic scenarios use temporary Runtime homes.

MVP value is reliable per-source reporting and history for connected, opt-in executors. Automatic collection of every dot, official dot identity, cross-executor claiming and scheduling remain outside the supported boundary. Building those requires a supported authorized source integration, not local private API or credential access.
