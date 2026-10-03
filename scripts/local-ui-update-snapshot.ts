import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { isAbsolute } from "node:path";
import { createHash } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { databasePath } from "../src/config.js";
import { readRuntimeState, runtimeIdentityHealth } from "../src/runtime-state.js";
import { sessionHostStatus } from "../src/session-host-client.js";

const [outputPath, baseCorePath, ...flags] = process.argv.slice(2);
const usage = "Usage: npx tsx scripts/local-ui-update-snapshot.ts <output.json> <absolute-base-core-path> [--assert-idle]";
assert.ok(outputPath && baseCorePath && isAbsolute(baseCorePath) && flags.every(flag => flag === "--assert-idle"), usage);
const baseCoreSha256 = createHash("sha256").update(readFileSync(baseCorePath)).digest("hex");
const state = readRuntimeState(); assert.ok(state); assert.equal(runtimeIdentityHealth(state).ok, true);
const ready = await fetch(`http://127.0.0.1:${state.port}/readyz`, { signal: AbortSignal.timeout(8000) }); assert.equal(ready.status, 200);
const hosts = sessionHostStatus(); assert.equal(hosts.current.ok, true); assert.equal(hosts.untracked.length, 0);
const summarize = (host: any) => host && ({ pid: host.host_pid, instance_id: host.host_instance_id, started_at: host.started_at, connected: host.runtime_connected, runtime_version: host.runtime_version,
  idle: !host.command_in_flight && !host.pending_requests && !host.active_turns.length && !host.thread_workers.some((worker: any) => worker.busy || worker.command_in_flight || worker.pending_requests || worker.active_turns.length) && !host.queued_deliveries && !host.retrying_deliveries });
const current = summarize(hosts.current.status), peer = summarize(hosts.peer.status);
const db = new DatabaseSync(databasePath, { readOnly: true });
const counts = Object.fromEntries(["issues", "issue_runs", "issue_sessions", "session_commands"].map(table => [table, (db.prepare(`SELECT COUNT(*) n FROM ${table}`).get() as any).n]));
const active = { runs: (db.prepare("SELECT COUNT(*) n FROM issue_runs WHERE status IN ('claimed','running','scheduling')").get() as any).n, commands: (db.prepare("SELECT COUNT(*) n FROM session_commands WHERE status IN ('pending','claimed')").get() as any).n }; db.close();
const proof = { checked_at: new Date().toISOString(), runtime: { version: state.version, pid: state.pid, instance_id: state.instanceId, generation: state.generation, identity_ok: true, ready_http: ready.status }, host: current, peer, untracked_hosts: 0, counts, active,
  base_core_sha256: baseCoreSha256 };
if (process.argv.includes("--assert-idle")) { assert.ok(current?.idle && (!hosts.peer.alive || peer?.idle), "Installed hosts must be idle before update"); assert.equal(active.runs, 0); assert.equal(active.commands, 0); }
writeFileSync(outputPath, JSON.stringify(proof, null, 2) + "\n"); console.log(JSON.stringify(proof, null, 2));
