# Runtime update session continuity

## Status

Accepted on 2026-08-25.

## Context

The Runtime owns the Better Codex business database and scheduler, while the single-profile Session Host owns the Codex App Server process and live turns. Restarting both processes during an update interrupted active Issues and created an event-loss window.

## Decision

Runtime updates are persisted in `update_operations` and identified by a browser idempotency key. Staging may continue to serve traffic. Activation closes new dispatch, waits for Runtime-owned child jobs, reserves a higher Runtime authority generation, and creates a Host handoff lease. It never stops an active compatible Session Host.

The Session Host writes every Runtime delivery to `session-host-transport.db` before sending it. A delivery carries a stable ID, Host instance, monotonic sequence, and payload hash. Runtime applies the business mutation and `session_delivery_receipts` record in one transaction, then acknowledges the delivery. Unacknowledged deliveries remain available for ordered replay.

The target Runtime is not ready until it reconnects with the reserved generation and update ID, drains delivery replay, and reconciles active turns and claimed commands. The activator then commits the Host lease and operation. Only after that commit does the Runtime resume its own work and new dispatch. Stale Runtime generations cannot replace the active connection.

If target activation or reconciliation fails, the activator stops the identity-verified target Runtime, restores both version pointers, reserves a still higher recovery generation, and starts the source Runtime. Rollback is complete only after the source Runtime reconnects to the same compatible Host and becomes ready.

Signed update manifests declare the target Session Host protocol and required capabilities. A missing or incompatible declaration enters `WAITING_FOR_HOST_DRAIN`. The source Runtime waits for active turns, in-flight commands, and unacknowledged deliveries to reach zero before it identity-verifies and replaces the Host. This path does not promise Host identity continuity because no live session remains.

## Operational evidence

Update diagnostics include the update ID, Runtime instance and generation, Host instance, App Server PID and start time, active turns, and queued deliveries. `/livez` only proves that the process responds. `/readyz` remains unavailable until replay and reconciliation complete.

The release gate runs the continuity lifecycle, delivery idempotency, update state machine, generation fencing, manifest compatibility, and rollback transaction tests on macOS, Linux, and Windows. The process-level lifecycle test runs a long App Server turn across two consecutive Runtime handoffs and requires the Host, catalog App Server, and active worker identities to remain unchanged through completion.

## Upgrade transaction and recovery contract

Accepted on 2026-09-12. Business schema remains at version 25.

The Runtime persists an immutable request binding before creating the business operation. The binding contains the operation ID, requested target, and channel. Repeated requests return that operation; changing the payload under the same key is a conflict. A missing business row after interrupted admission can be created under the already reserved ID. Status endpoints only read this state.

Staging pins the signed manifest and its digest, validates downloaded bytes, starts the candidate with an isolated temporary home for preflight, and preserves a runnable source core and the complete pointer pair. An originally bundled compatibility package is saved explicitly, even when it had no pointer, so recovery cannot accidentally substitute the new core's bundled package. The `runtime/rollback.json` journal records `staged` before either pointer changes, then `applying` and `ready`. Pointer writes require the same operation, reserved authority, signed artifact hashes, and unchanged source selection. Both pointers are checked again at terminal commit and flushed before that decision. Compatibility probes only publish evidence. The base launcher executes the selected core and reports failures; it does not select another version.

The activator publishes versioned progress in `runtime/update-activation.json` and per-operation records under `runtime/updates/`. Progress carries the source, target, operation ID, Runtime generation, owner PID and process start, phase, failure, and recovery attempts. The current record is authoritative if its per-operation copy lags. Synchronous activation writes and recovery ownership claims are serialized across processes.

Recovery persists `rolling_back` intent before stopping the verified Runtime and restoring pointers. It reserves a newer generation and starts the retained source. It does not restore a business database backup: acknowledged business mutations and delivery receipts survive the switch. `ROLLED_BACK` requires the actual source version, restored pointer pair, Host replay and reconciliation, and service readiness.

Cross-file terminal commits have a durable decision marker. After Host completion, the activator records `committing` or `committing_rollback` before the database terminal transition, then settles authority and clears the Runtime handoff identity. Recovery completes the same decision. The API continues to show a nonterminal phase while the identity still carries that handoff. Late failures cannot reverse a committed operation.

The Runtime detects a dead activator by PID and process start. The same coordinator also runs when Runtime bootstrap fails before the HTTP listener exists. A replacement recovery owner retains the operation and phase. Two interrupted recovery attempts stop further automatic activation and retain the evidence for user action. Artifact download retries are bounded to three attempts; signature, hash, storage, and identity failures remain explicit.

## Service and desktop evidence

`/readyz` checks Runtime lock, published identity and authority, database, storage, required Session Host connection, and completed replay/reconciliation. Desktop compatibility never changes its result. `/livez` still proves only process responsiveness.

Desktop state is `ready`, `waiting_window`, `disabled`, or `failed`, scoped to the Runtime instance and generation, profile, compatibility package, renderer target, and document. Loading main windows and missing main windows are pending. Detached, dictation, and avatar windows cannot establish incompatibility. Stale evidence expires after 90 seconds. Corrupt compatibility state or package data remains a separate visible desktop failure.

Core activation preserves the user's injection preference. The resident watcher reconnects when a supported main window becomes available; a closed Codex window does not block a service upgrade. MCP or launcher setup failures are retained separately and do not roll back a healthy service.

## Installer, VPS, and browser boundaries

Desktop and CLI installers enter the Runtime operation and poll its ID. An uncertain receipt retains the same request key. Installers may use an offline installation path only when no Runtime accepted the operation; they cannot start another rollback after the Runtime committed. Legacy direct pointer helpers refuse a running Runtime or active activation.

VPS admission persists the signed channel manifest, request fingerprint, operation ID, and target. New manifests also sign the source commit, checked against the signed source asset before checkout. Older manifests acquire their immutable source pin when that asset is first verified. Updates retain the Hub and Caddy image digests and resolved Compose/Caddy configuration before building. Both internal and public target-version readiness are required for success. Rollback starts the retained artifacts without rebuilding and validates the original version through both checks.

The host executor uses an inherited file lock, so a deployment child keeps ownership if its Python supervisor dies. A replacement waits for that child before recovering the same operation. Queue and history writes are durable, state directories inherit the Relay's group, failed installations pause automatic retries, and recovery failure preserves the transaction. Shell rollback state belongs to the deployment subshell so it remains available to the exit handler.

One shared browser observer serves desktop, local Web, and remote Web. It preserves acceptance identity through receipt loss, reloads, and injection rebuilds. Other windows clearing shared storage cannot stop an already observing window. Polling timeout means that the outcome is unknown, and never proves failure or restoration. Normal reconnection is inline progress. `升级完成`, `正在恢复`, `已恢复旧版`, and `恢复未完成` require the corresponding operation and recovery evidence. Detailed reports are user-opened and carry operation IDs and structured state.

Verification evidence and untested production boundaries are recorded in [the September 12 acceptance record](../verification/upgrade-reliability-2026-09-12.md).

## Compatibility boundary

This implementation is the bridge release. Versions older than the bridge do not possess the durable Host queue or non-destructive activation path, so their first update retains the legacy behavior. Continuous-session guarantees apply from this bridge release to later manifests that declare a compatible handoff protocol. A stable release requires two consecutive bridge-aware update validations.

## Thread allocation capability

The `thread_binding_lifecycle` capability distinguishes workers that retain unmaterialized threads from older command-scoped workers. Manifests requiring it must drain and replace older Hosts. New Issues allocate their physical thread together with the first input; legacy bind commands remain supported. An unmaterialized worker is not safe for a Host-replacing update. See [execution and delivery boundaries](execution-and-delivery-boundaries.md).
