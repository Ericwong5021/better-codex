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
        created_at TEXT NOT NULL,
        finished_at TEXT
      )
    `);
    this.db.prepare("DELETE FROM request_receipts WHERE finished_at IS NOT NULL AND finished_at < ?").run(new Date(Date.now() - 7 * 24 * 60 * 60_000).toISOString());
  }

  begin(requestId: string, method: string, path: string, fingerprint: string) {
    const row = this.db.prepare("SELECT request_fingerprint, status, response_status, response_headers_json, response_body FROM request_receipts WHERE request_id = ?").get(requestId) as ReceiptRow | undefined;
    if (row) {
      if (row.request_fingerprint !== fingerprint) return { kind: "conflict" as const };
      if (row.status !== "finished" || row.response_status === null || !row.response_headers_json || !row.response_body) return { kind: "unknown" as const };
      const headers = JSON.parse(row.response_headers_json) as Record<string, string>;
      return { kind: "replay" as const, response: { status: row.response_status, headers, body: Buffer.from(row.response_body) } };
    }
    this.db.prepare("INSERT INTO request_receipts (request_id, method, path, request_fingerprint, status, created_at) VALUES (?, ?, ?, ?, 'processing', ?)").run(requestId, method, path, fingerprint, new Date().toISOString());
    return { kind: "new" as const };
  }

  finish(requestId: string, response: RequestReceiptResponse) {
    this.db.prepare("UPDATE request_receipts SET status = 'finished', response_status = ?, response_headers_json = ?, response_body = ?, finished_at = ? WHERE request_id = ? AND status = 'processing'")
      .run(response.status, JSON.stringify(response.headers), response.body, new Date().toISOString(), requestId);
  }

  close() {
    this.db.close();
  }
}
