---
name: dot-reporting
description: Track user-authorized Dot tasks in Better Codex as external observations, with stable identities, durable retry payloads and verified synchronization receipts. Use for progress reporting or resuming pending synchronization, not to start Better Codex-owned execution.
---

# Dot task reporting

Use `external_tasks_report` with `schema_version: 2` for work executed by Dot. Reporting grants no local worker ownership, verified creator identity or human acceptance. Do not create an owned Issue with `tasks_create` to mirror external execution. Do not resume paused work as part of synchronization.

## Connected-computer delivery

For local-only management, use the user's already authorized Dot computer connection. No Platform API key, public endpoint or Secure MCP Tunnel is required for this route. The cloud Dot may not see local stdio tools: use its supported local-task delegation to reuse one local reporting task on the connected computer. Forward the immutable source payload to that task, which calls the installed Better Codex MCP tools and returns actual receipts plus observation/event readback. Read-only discovery must confirm tool availability and reporting opt-in before delivery. Do not enable new computer access silently.

Keep the source Dot task/account/host/run identity in the forwarded payload. The local reporter is transport, not the task being mirrored; never replace source identity with the reporter thread ID or infer progress from its turn status. Reuse that reporting task for subsequent events rather than allocating one thread per update. Do not execute the original task again or create an owned Better Codex Issue. Report only events supplied by the source; never fabricate missing historical states.

Persist events on the source before delegation; once received locally, the helper below can retain them through delivery retries. If the computer is offline, preserve source-side pending events and deliver them in sequence when available. A local queue cannot preserve an event it never received. Local-task delegation can consume model usage and is not a guaranteed always-on transport; verify a real Dot-originated round trip before claiming this route is connected.

A developer may optionally use `better-codex mcp --dot` through Secure MCP Tunnel. It exposes only four external reporting tools. Tunnel does not automatically install this Skill in Dot; `initialize.instructions` carries the essential reporting contract.

## Discover and identify

Read `external_observations_list` for existing observations and reporting capability. Match the persisted source identity, not a similar title. Keep `provider`, `account_id`, `host_id` and `source_task_id` stable across retries, renames, reconnections and new execution attempts. Use `provider: "dot"` for Dot; use a stable source host identifier, not a transient Tunnel process ID. Never substitute an unrelated account or host to evade a conflict.

Each actual attempt has a stable `source_run_id` and increasing `run_number`. Before any attempt, both may be null only for `queued`, `idle` or `blocked` snapshot reports. Keep existing run identity when reporting pauses. Increase `sequence` across the entire task, including later attempts; increase source `version` for each new queued event. Allocate a new `event_id` once per new event. `reported_at` records when that event occurred.

## Persist and send

Before sending, persist the complete immutable payload in durable storage owned by the producer. Keep a per-task sequence counter, run identity, event payloads, delivery receipts and receiver cursor together. Read back a saved payload before calling it queued. A conversation note is not a reliable automatic retry worker.

Use an available, authorized producer storage facility. Where this Skill's files and Python 3 are accessible on a Unix producer, [scripts/outbox.py](scripts/outbox.py) stores immutable event payloads and confirmed receipts. Its directory must be private (0700); the bounded queue stops at 2 MiB instead of silently dropping records. Store raw MCP structured results in the receipt/event files, not the outer tool envelope:

```sh
python3 scripts/outbox.py enqueue --directory /producer/durable-outbox --report /producer/event.json
python3 scripts/outbox.py next --directory /producer/durable-outbox
python3 scripts/outbox.py status --directory /producer/durable-outbox
```

Resolve the script relative to this Skill; choose paths in the producer's actual durable storage. Send the payload returned by `next`, then save real tool responses to receipt and event-log files. After the readback checks below, acknowledge it with:

```sh
python3 scripts/outbox.py ack --directory /producer/durable-outbox --event-id EVENT_ID --receipt /producer/receipt.json --events /producer/events.json
```

The script validates receipt and event-log evidence; separately read the observation before acknowledgement to verify its current task/run/state. If the producer cannot access a persistent execution environment or equivalent storage, disclose that the event is only prepared and cannot survive a producer restart reliably. A local Runtime or Tunnel cannot save cloud-side events it never received. Running this script locally does not install a cloud outbox or a retry worker. Unattended delivery needs an available, authorized Dot follow-up or wakeup mechanism; do not claim one was configured merely by saving this Skill or a rule.

Send pending payloads in task sequence order. After a transport failure, lost receipt or reconnect, retry the exact saved payload, including event ID, timestamp, sequence and source version. Do not create a new task or run for a delivery retry. Bound transient retries to three per invocation, then retain pending events and report the connection blocker. Missing tools, disabled reporting or authorization errors require restoring the intended connection; do not bypass authentication or switch to unrelated APIs.

## Verify the receipt

Keep these user-visible states separate:

| State | Required evidence |
| --- | --- |
| Prepared | Content assembled; no durable queue or receiver receipt claimed |
| Pending sync | Producer payload durably saved and read back; receiver confirmation absent |
| Saved receipt | Actual `external_tasks_report` response with `applied` or `duplicate`; retain returned `id` |
| Readback-confirmed sync | `external_observations_get` for that `id`, plus matching `event_id` with original `outcome: "applied"` in `external_observations_events` |

Replay events with `task_id`, `after` and `limit`; follow `next_cursor` while `has_more` until the event is found. Persist receiver cursors only after processing their events; retain confirmed event receipts so a later duplicate can be checked. `duplicate` alone proves only that the receiver already recorded the event ID: the original event may have been rejected. An event with `out_of_order`, `stale_run` or `terminal_run` did not update current state. Keep it for reconciliation and report the reason; do not renumber it or invent a new run to force acceptance.

Verify task identity and current run in the readback. A later snapshot can legitimately supersede an applied event. In that case say the event was received and identify the newer current state; do not claim the old state is still current. Mark an event confirmed only after this check, retaining its receipt rather than sending it again.

## Report source state faithfully

Use the tool's state schema: queued, running, waiting_user, waiting_approval, blocked, failed, cancelled, completed or idle. Preserve the source's actual waiting and failure reasons in `blocker` and `message`. For a pause without a dedicated source state mapping, use `idle` with a clear pause message, or `blocked` when there is a real blocker; do not infer that work resumed. Keep the existing run if one exists.

Use `completed` only with actual execution evidence; provide a `summary` containing a concise result and available evidence references. Completion remains `task_result: "reported_complete"` and `acceptance_state: "unknown"`. Tests, deployment, device behavior and manual acceptance are distinct evidence. Do not invent acceptance or verified creator identity. A paused or uncertain historical task stays paused or pending clarification.

State precisely what was prepared, queued, saved or confirmed. A task list saved elsewhere, missing tool, or timeout is never proof that Better Codex was updated.
