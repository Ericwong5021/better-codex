import { createHash } from "node:crypto";
import { DatabaseSync } from "node:sqlite";

export type RequestReceiptResponse = {
  status: number;
  headers: Record<string, string>;
  body: Buffer;
};

type ReceiptRow = {
  request_fingerprint: string;
  status: string;
  response_status: number | null;
  response_headers_json: string | null;
  response_body: Uint8Array | null;
  lease_expires_at: string | null;
};

export function requestFingerprint(method: string, path: string, body: Buffer) {
  return createHash("sha256").update(method).update("\0").update(path).update("\0").update(body).digest("hex");
}

export class RequestReceiptStore {
  private readonly db: DatabaseSync;

  constructor(file: string) {
    this.db = new DatabaseSync(file);
    this.db.exec("PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000");
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS request_receipts (
        request_id TEXT PRIMARY KEY,
        method TEXT NOT NULL,
        path TEXT NOT NULL,
        request_fingerprint TEXT NOT NULL,
        status TEXT NOT NULL,
        response_status INTEGER,
        response_headers_json TEXT,
        response_body BLOB,
        attempt_count INTEGER NOT NULL DEFAULT 1,
        lease_expires_at TEXT,
        created_at TEXT NOT NULL,
        finished_at TEXT
      )
    `);
    const columns = new Set((this.db.prepare("PRAGMA table_info(request_receipts)").all() as Array<{ name: string }>).map(column => column.name));
    if (!columns.has("attempt_count")) this.db.exec("ALTER TABLE request_receipts ADD COLUMN attempt_count INTEGER NOT NULL DEFAULT 1");
    if (!columns.has("lease_expires_at")) this.db.exec("ALTER TABLE request_receipts ADD COLUMN lease_expires_at TEXT");
    this.db.prepare("DELETE FROM request_receipts WHERE finished_at IS NOT NULL AND finished_at < ?").run(new Date(Date.now() - 7 * 24 * 60 * 60_000).toISOString());
  }

  begin(requestId: string, method: string, path: string, fingerprint: string) {
    const row = this.db.prepare("SELECT request_fingerprint, status, response_status, response_headers_json, response_body, lease_expires_at FROM request_receipts WHERE request_id = ?").get(requestId) as ReceiptRow | undefined;
    if (row) {
      if (row.request_fingerprint !== fingerprint) return { kind: "conflict" as const };
      if (row.status !== "finished") {
        if (row.lease_expires_at && Date.parse(row.lease_expires_at) <= Date.now()) {
          this.db.prepare("UPDATE request_receipts SET attempt_count = attempt_count + 1, lease_expires_at = ? WHERE request_id = ? AND status = 'processing'")
            .run(new Date(Date.now() + 10 * 60_000).toISOString(), requestId);
          return { kind: "new" as const };
        }
        return { kind: "unknown" as const };
      }
      if (row.response_status === null || !row.response_headers_json || !row.response_body) return { kind: "unknown" as const };
      const headers = JSON.parse(row.response_headers_json) as Record<string, string>;
      return { kind: "replay" as const, response: { status: row.response_status, headers, body: Buffer.from(row.response_body) } };
    }
    this.db.prepare("INSERT INTO request_receipts (request_id, method, path, request_fingerprint, status, attempt_count, lease_expires_at, created_at) VALUES (?, ?, ?, ?, 'processing', 1, ?, ?)").run(requestId, method, path, fingerprint, new Date(Date.now() + 10 * 60_000).toISOString(), new Date().toISOString());
    return { kind: "new" as const };
  }

  finish(requestId: string, response: RequestReceiptResponse) {
    this.db.prepare("UPDATE request_receipts SET status = 'finished', response_status = ?, response_headers_json = ?, response_body = ?, lease_expires_at = NULL, finished_at = ? WHERE request_id = ? AND status = 'processing'")
      .run(response.status, JSON.stringify(response.headers), response.body, new Date().toISOString(), requestId);
  }

  status(requestId: string) {
    const row = this.db.prepare("SELECT request_fingerprint, status, response_status, response_headers_json, response_body, lease_expires_at FROM request_receipts WHERE request_id = ?").get(requestId) as ReceiptRow | undefined;
    if (!row) return { kind: "missing" as const };
    if (row.status !== "finished" || row.response_status === null || !row.response_headers_json || !row.response_body) return { kind: "pending" as const };
    return { kind: "replay" as const, response: { status: row.response_status, headers: JSON.parse(row.response_headers_json) as Record<string, string>, body: Buffer.from(row.response_body) } };
  }

  close() {
    this.db.close();
  }
}
