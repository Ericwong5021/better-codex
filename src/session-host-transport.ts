import { createHash, randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";
import type { SessionHostDelivery, SessionHostDeliveryAck } from "./session-host-protocol.js";

type DeliveryRow = {
  delivery_id: string;
  host_instance_id: string;
  sequence: number;
  kind: SessionHostDelivery["kind"];
  payload_json: string;
  payload_hash: string;
};

export function sessionHostDeliveryHash(kind: SessionHostDelivery["kind"], payload: Record<string, unknown>) {
  return createHash("sha256").update(JSON.stringify({ kind, payload })).digest("hex");
}

function deliveryFromRow(row: DeliveryRow) {
  const payload = JSON.parse(row.payload_json) as unknown;
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) throw new Error("session_host_delivery_payload_invalid");
  return {
    type: "delivery",
    delivery_id: row.delivery_id,
    host_instance_id: row.host_instance_id,
    sequence: Number(row.sequence),
    payload_hash: row.payload_hash,
    kind: row.kind,
    payload: payload as Record<string, unknown>,
  } satisfies SessionHostDelivery;
}

export class SessionHostTransport {
  private readonly db: DatabaseSync;

  constructor(private readonly file: string, private readonly hostInstanceId: string) {
    mkdirSync(dirname(file), { recursive: true });
    this.db = new DatabaseSync(file);
    this.db.exec(`
      PRAGMA journal_mode = WAL;
      PRAGMA synchronous = FULL;
      PRAGMA busy_timeout = 5000;
      CREATE TABLE IF NOT EXISTS host_sequences (
        host_instance_id TEXT PRIMARY KEY,
        last_sequence INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS deliveries (
        ordinal INTEGER PRIMARY KEY AUTOINCREMENT,
        delivery_id TEXT NOT NULL UNIQUE,
        host_instance_id TEXT NOT NULL,
        sequence INTEGER NOT NULL,
        kind TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        payload_hash TEXT NOT NULL,
        created_at TEXT NOT NULL,
        acked_at TEXT,
        ack_outcome TEXT,
        error_code TEXT,
        attempt_count INTEGER NOT NULL DEFAULT 0,
        last_attempt_at TEXT,
        UNIQUE(host_instance_id, sequence)
      );
      CREATE INDEX IF NOT EXISTS deliveries_pending ON deliveries(acked_at, ordinal);
    `);
    const columns = new Set((this.db.prepare("PRAGMA table_info(deliveries)").all() as Array<{ name: string }>).map(item => item.name));
    if (!columns.has("ack_outcome")) this.db.exec("ALTER TABLE deliveries ADD COLUMN ack_outcome TEXT");
    if (!columns.has("error_code")) this.db.exec("ALTER TABLE deliveries ADD COLUMN error_code TEXT");
    if (!columns.has("attempt_count")) this.db.exec("ALTER TABLE deliveries ADD COLUMN attempt_count INTEGER NOT NULL DEFAULT 0");
    if (!columns.has("last_attempt_at")) this.db.exec("ALTER TABLE deliveries ADD COLUMN last_attempt_at TEXT");
    this.db.prepare("INSERT OR IGNORE INTO host_sequences (host_instance_id, last_sequence) VALUES (?, 0)").run(hostInstanceId);
  }

  enqueue(kind: SessionHostDelivery["kind"], payload: Record<string, unknown>) {
    const payloadJson = JSON.stringify(payload);
    const payloadHash = sessionHostDeliveryHash(kind, payload);
    const deliveryId = randomUUID();
    const createdAt = new Date().toISOString();
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const row = this.db.prepare("SELECT last_sequence FROM host_sequences WHERE host_instance_id = ?").get(this.hostInstanceId) as { last_sequence: number } | undefined;
      if (!row) throw new Error("session_host_sequence_missing");
      const sequence = Number(row.last_sequence) + 1;
      this.db.prepare("UPDATE host_sequences SET last_sequence = ? WHERE host_instance_id = ?").run(sequence, this.hostInstanceId);
      this.db.prepare(`
        INSERT INTO deliveries (delivery_id, host_instance_id, sequence, kind, payload_json, payload_hash, created_at, acked_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, NULL)
      `).run(deliveryId, this.hostInstanceId, sequence, kind, payloadJson, payloadHash, createdAt);
      this.db.exec("COMMIT");
      return { type: "delivery", delivery_id: deliveryId, host_instance_id: this.hostInstanceId, sequence, payload_hash: payloadHash, kind, payload } satisfies SessionHostDelivery;
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }

  pending() {
    const rows = this.db.prepare(`
      SELECT delivery_id, host_instance_id, sequence, kind, payload_json, payload_hash
      FROM deliveries
      WHERE acked_at IS NULL
      ORDER BY ordinal
    `).all() as DeliveryRow[];
    return rows.map(deliveryFromRow);
  }

  private deliveryForResult(input: Pick<SessionHostDeliveryAck, "delivery_id" | "host_instance_id" | "sequence" | "payload_hash">) {
    const row = this.db.prepare(`
      SELECT host_instance_id, sequence, payload_hash, acked_at
      FROM deliveries
      WHERE delivery_id = ?
    `).get(input.delivery_id) as { host_instance_id: string; sequence: number; payload_hash: string; acked_at: string | null } | undefined;
    if (!row) throw new Error("session_host_delivery_missing");
    if (row.host_instance_id !== input.host_instance_id || Number(row.sequence) !== input.sequence || row.payload_hash !== input.payload_hash) throw new Error("session_host_delivery_ack_mismatch");
    return row;
  }

  acknowledge(input: SessionHostDeliveryAck) {
    const row = this.deliveryForResult(input);
    if (!row.acked_at) {
      const acknowledgedAt = new Date().toISOString();
      const outcome = input.outcome || "applied";
      if (!["applied", "rejected_terminal"].includes(outcome)) throw new Error("session_host_delivery_ack_outcome_invalid");
      if (outcome === "rejected_terminal" && !input.error_code) throw new Error("session_host_delivery_ack_error_missing");
      this.db.prepare("UPDATE deliveries SET acked_at = ?, ack_outcome = ?, error_code = ?, attempt_count = attempt_count + 1, last_attempt_at = ? WHERE delivery_id = ? AND acked_at IS NULL")
        .run(acknowledgedAt, outcome, input.error_code || null, acknowledgedAt, input.delivery_id);
      const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      this.db.prepare(`
        DELETE FROM deliveries
        WHERE acked_at IS NOT NULL
          AND acked_at < ?
          AND ordinal NOT IN (
            SELECT ordinal FROM deliveries WHERE acked_at IS NOT NULL ORDER BY ordinal DESC LIMIT 2048
          )
      `).run(cutoff);
    }
  }

  retry(input: SessionHostDeliveryAck) {
    const row = this.deliveryForResult(input);
    if (row.acked_at) throw new Error("session_host_delivery_already_acknowledged");
    if (input.outcome !== "retryable_error" || !input.error_code) throw new Error("session_host_delivery_retry_invalid");
    const attemptedAt = new Date().toISOString();
    this.db.prepare("UPDATE deliveries SET error_code = ?, attempt_count = attempt_count + 1, last_attempt_at = ? WHERE delivery_id = ? AND acked_at IS NULL")
      .run(input.error_code, attemptedAt, input.delivery_id);
    const attempt = this.db.prepare("SELECT attempt_count FROM deliveries WHERE delivery_id = ?").get(input.delivery_id) as { attempt_count: number };
    return Number(attempt.attempt_count);
  }

  stats() {
    const pending = this.db.prepare("SELECT COUNT(*) AS count FROM deliveries WHERE acked_at IS NULL").get() as { count: number };
    const sequence = this.db.prepare("SELECT last_sequence FROM host_sequences WHERE host_instance_id = ?").get(this.hostInstanceId) as { last_sequence: number } | undefined;
    const acknowledged = this.db.prepare("SELECT COALESCE(MAX(sequence), 0) AS sequence FROM deliveries WHERE host_instance_id = ? AND acked_at IS NOT NULL").get(this.hostInstanceId) as { sequence: number };
    const rejected = this.db.prepare("SELECT COUNT(*) AS count FROM deliveries WHERE ack_outcome = 'rejected_terminal'").get() as { count: number };
    const retrying = this.db.prepare("SELECT COUNT(*) AS count FROM deliveries WHERE acked_at IS NULL AND attempt_count > 0").get() as { count: number };
    const lastError = this.db.prepare("SELECT error_code FROM deliveries WHERE error_code IS NOT NULL ORDER BY COALESCE(last_attempt_at, acked_at, created_at) DESC LIMIT 1").get() as { error_code: string } | undefined;
    return {
      queued_deliveries: Number(pending.count),
      last_delivery_sequence: Number(sequence?.last_sequence || 0),
      last_acked_sequence: Number(acknowledged.sequence || 0),
      terminal_rejected_deliveries: Number(rejected.count),
      retrying_deliveries: Number(retrying.count),
      last_delivery_error: lastError?.error_code || null,
    };
  }

  close() {
    this.db.close();
  }
}
