# Runtime update session continuity

## Status

Accepted on 2026-08-25.

## Context

The Runtime owns the Better Codex business database and scheduler, while the single-profile Session Host owns the Codex App Server process and live turns. Restarting both processes during an update interrupted active Issues and created an event-loss window.

## Decision

Runtime updates are persisted in `update_operations` and identified by a browser idempotency key. Staging may continue to serve traffic. Activation closes new dispatch, waits for Runtime-owned child jobs, reserves a higher Runtime authority generation, and creates a Host handoff lease. It never stops an active compatible Session Host.

The Session Host writes every Runtime delivery to `session-host-transport.db` before sending it. A delivery carries a stable ID, Host instance, monotonic sequence, and payload hash. Runtime applies the business mutation and `session_delivery_receipts` record in one transaction, then acknowledges the delivery. Unacknowledged deliveries remain available for ordered replay.

The target Runtime is not ready until it reconnects with the reserved generation and update ID, drains delivery replay, reconciles active turns and claimed commands, and completes the Host lease. Only then does it resume Runtime-owned work and new dispatch. Stale Runtime generations cannot replace the active connection.

If target activation or reconciliation fails, the activator stops the identity-verified target Runtime, restores both version pointers, reserves a still higher recovery generation, and starts the source Runtime. Rollback is complete only after the source Runtime reconnects to the same compatible Host and becomes ready.

Signed update manifests declare the target Session Host protocol and required capabilities. A missing or incompatible declaration enters `WAITING_FOR_HOST_DRAIN`. The source Runtime waits for active turns, in-flight commands, and unacknowledged deliveries to reach zero before it identity-verifies and replaces the Host. This path does not promise Host identity continuity because no live session remains.

## Operational evidence

Update diagnostics include the update ID, Runtime instance and generation, Host instance, App Server PID and start time, active turns, and queued deliveries. `/livez` only proves that the process responds. `/readyz` remains unavailable until replay and reconciliation complete.

The release gate runs the continuity lifecycle, delivery idempotency, update state machine, generation fencing, manifest compatibility, and rollback transaction tests on macOS, Linux, and Windows. The process-level lifecycle test runs a long App Server turn across a source-to-target Runtime handoff and requires the Host and App Server identities to remain unchanged through completion.

## Compatibility boundary

This implementation is the bridge release. Versions older than the bridge do not possess the durable Host queue or non-destructive activation path, so their first update retains the legacy behavior. Continuous-session guarantees apply from this bridge release to later manifests that declare a compatible handoff protocol. A stable release requires two consecutive bridge-aware update validations.
