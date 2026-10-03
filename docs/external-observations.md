# External task observations in the existing board

External observations are a read-only projection alongside Better Codex-owned Issues. The Runtime owns the storage and watcher. They never enter `issues`, `issue_sessions`, `session_commands`, IssueWorker, auto dispatch, rename, resume, or title generation.

The adapters support **opt-in task reporting through a shared local directory or standard MCP tools**. They do not automatically discover cloud/durable dot tasks, and do not imply that Better Codex can call platform-only task tools. The reporter's provider/account/host/parent/creator fields are declared namespaces and labels, not authenticated identities.

## Runtime and API contract

Set `BETTER_CODEX_EXTERNAL_REPORTS_DIR` to an authorized report directory when starting the intended Runtime. Without it, the adapter is disabled. Do not point a production Runtime at test fixtures. The directory is never discovered or inferred from private databases or credentials.

The Runtime creates `external_observations` and `external_observation_messages` on its existing SQLite connection. No second business database owner is introduced. The former has a unique `(provider, account_id, host_id, thread_id)` key and durable sequence watermark; the latter deduplicates `(observation_id, item_id)` and `(observation_id, sequence)`. State and message receipt commit in one savepoint transaction. Replayed/older records cannot rewind state after Runtime or watcher restart.

Existing authorization applies to all endpoints:

- `GET /api/external-observations` → `{observations, capability}`.
- `GET /api/external-observations/:id` → `{observation, messages, capability}`. Messages contain the latest 200 report messages/status entries, not the source task's full conversation.
- `GET /api/bootstrap` includes `external_observations` and `external_observation_capability`.
- Existing `GET /api/events` sends `change` when reports, source connectivity, or freshness change. Browsers query the shared projection; they do not scan files.
- `POST /api/external-observations/report` is the MCP ingestion route, enabled only when the intended Runtime starts with `BETTER_CODEX_MCP_ALLOW_REPORTS=1`. Existing loopback Bearer authorization applies; Relay ingestion is rejected. This does not start or control source tasks.
- Other writes to the external route return `405 external_observations_read_only`. Missing observations return `404`.

Types are exported from `src/external-observations.ts`:

- `execution_state`: current observed execution. `reported_execution_state` retains the last source claim.
- `freshness`: `fresh`, `stale`, or `disconnected`. After 30 seconds without a current report, or when the directory is unavailable, current execution becomes `unknown`.
- `task_result`: `unknown` or `reported_complete`. A completed report remains a completion claim even after it becomes stale.
- `acceptance_state`: always `unknown`. The adapter never declares a user-accepted `done`.
- `source`: `{kind: "task_reporter", attribution: "declared", channel: "local_file" | "mcp"}`. Channel is assigned by Runtime, not supplied by the reporter.
- `creator`: optional declared name, `verification: "unknown"`, `avatar: null`. Input claims of verified identity, avatars or ownership are discarded.

The source can explicitly report `running`, `waiting_user`, `waiting_approval`, `failed`, `idle`, or `completed`. `idle` and disconnection do not mean completion. An unavailable source does not mean failure. The UI maps a completed report to awaiting review, without giving it source-task controls.

## Report from an authorized task

From the source checkout, with its existing dependencies:

```sh
node --import tsx src/external-report-cli.ts \
  --spool /authorized/shared/report-directory \
  --thread-id SOURCE_THREAD_ID \
  --parent-id PARENT_THREAD_ID \
  --state running \
  --title 'Better Codex 现有看板接入' \
  --creator-name dot \
  --message '正在验证 Runtime 的只读观测链路。'
```

Omitting `--thread-id` uses only `CODEX_THREAD_ID`. The CLI does not inspect other task history, credentials, tokens or cookies. Defaults `provider=codex`, `account_id=local-opt-in`, `host_id=task-environment` are **declared names**, not official account/host IDs. Set `--provider`, `--account-id`, and `--host-id` consistently to distinguish authorized sources. `--project-id` optionally maps to an existing Better Codex project and never creates one. `--description` is optional.

Publish another truthful report for each state transition. Use `--state completed` only after the source task considers its work complete. A running/waiting source must report more frequently than 30 seconds to remain current; this adapter does not install a heartbeat daemon or pretend directory existence proves task liveness.

The reporter reserves a monotonically increasing sequence under an exclusive task-specific lock, then writes an immutable event through a 0600 temporary file, file sync and atomic rename. The directory is created 0700 and group/other-writable or symlink report directories are rejected. The 1-second Runtime watcher validates filenames, sizes and metadata before reading, rejects report symlinks, and stores only whitelisted fields. Error messages exclude local file paths and report bodies.

The spool must persist across reporter restarts. Deleting its `.sequence` files can reset producer revisions; the Runtime correctly rejects those old revisions rather than silently accepting a rollback. A crashed writer may leave a `.lock` and subsequent writers fail visibly with `external_report_writer_locked`; verify the exact writer has ended before manually recovering that lock. The current local file protocol does not implement automatic stale-lock takeover.

Journal files retain intermediate events between polls, unlike the original proof-of-concept snapshot. Each poll lists/stat-checks the retained files: metadata work is **O(N)** in journal-file count, plus **O(T)** in retained tasks for freshness projection. Report bodies are read only when their metadata changes; each accepted body is capped at 64 KiB. Polls do not overlap and the next starts one second after the previous finishes, so a large backlog can exceed one second of detection latency. This initial adapter does not automatically prune the spool or message history. Bounded retention/indexed journal intake, producer generation negotiation, durable remote authentication and secure transport are follow-up work. File fsync/rename is not claimed to be a full cross-platform power-loss durability protocol. A remote execution environment without access to the directory cannot use this adapter.

The explicit distribution manifest includes all four `dist/external-*.js` modules required by the server and optional reporter. From a built distribution, the reporter can run as `node /path/to/dist/external-report-cli.js` with the same arguments; no separate npm dependency or new persistent service is installed.

## Report through standard MCP

The `better-codex mcp` stdio server uses the official MCP SDK and delegates to the already-running Runtime; it never opens the business database. Use `external_observations_report` with the strict `ExternalReport` schema to submit task-owned state transitions and messages. Required sequence and item IDs fence retries and older reports in the same persisted transaction used by the file adapter. Tool inputs reject verification, avatars, acceptance and worker ownership fields.

The stdio process uses existing Runtime authorization through its normal local connection. It does not read Codex cookies/authentication, create credentials, or send a Runtime token to the App iframe. HTTP ingestion is disabled by default. The feature flag is server-side; passing a client flag cannot authorize ingestion.

Capability mode is `opt_in_reporter`, `mcp_reporting`, or `mixed`. Each record's connectivity is projected according to its ingestion channel; a healthy MCP channel does not conceal a disconnected file source. A reachable ingestion endpoint means reports can arrive, not that a source task is alive. Every report still expires after 30 seconds without a new source timestamp.

MCP `resources/subscribe` and `notifications/resources/updated` follow Runtime change events. The MCP App uses host-mediated resource subscriptions when its host exposes the optional OpenAI resource extension, plus a 15-second fallback refresh and a 5-second local freshness render clock. These are separate from the 1-second file watcher. No latency SLA or exhaustive remote event delivery is claimed.

Only an authorized execution environment that can reach this local integration can report. Installing a local stdio plugin does not grant cloud/durable tasks access to localhost, discover those tasks, verify their creator, or provide historical backfill. See [standard MCP implementation](standard-mcp.md).

## Isolated verification

```sh
node --import tsx --test test/external-observations.test.ts test/external-observations-gateway.test.ts
```

These synthetic tests create temporary databases and isolated Runtime homes. `startRuntimeFixture({externalReportsDirectory})` is the existing shared fixture, extended with an optional report directory. Existing fixture calls clear inherited report-directory configuration. Its Codex home and database are temporary and its Session Host is disabled; it does not alter the installed Runtime or import production tasks.

The targeted suite verifies separate ownership, identity and item deduplication, persistent sequence fencing, exact waiting/failure semantics, stale/disconnected unknown state, completed-but-unaccepted status, read-only authentication boundaries, bootstrap integration, existing event delivery, report history, Runtime restart, disabled capability, symlink rejection and uncertain writer locks. Live user-task reports and browser observations must be reported separately from these synthetic tests.
