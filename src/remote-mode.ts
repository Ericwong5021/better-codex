import { DatabaseSync } from "node:sqlite";

export type BetterCodexRemoteMode = "projection" | "relay";

export function readRemoteMode(): BetterCodexRemoteMode {
  const value = process.env.BETTER_CODEX_REMOTE_MODE || "relay";
  if (value === "projection" || value === "relay") return value;
  throw new Error("invalid_remote_mode");
}

export function disableProjectionSync(file: string) {
  const database = new DatabaseSync(file);
  try {
    database.exec(`
      DROP TRIGGER IF EXISTS sync_project_insert;
      DROP TRIGGER IF EXISTS sync_project_update;
      DROP TRIGGER IF EXISTS sync_project_delete;
      DROP TRIGGER IF EXISTS sync_issue_insert;
      DROP TRIGGER IF EXISTS sync_issue_update;
      DROP TRIGGER IF EXISTS sync_issue_delete;
      DROP TRIGGER IF EXISTS sync_run_insert;
      DROP TRIGGER IF EXISTS sync_run_update;
      DROP TRIGGER IF EXISTS sync_run_delete;
      DROP TRIGGER IF EXISTS sync_session_insert;
      DROP TRIGGER IF EXISTS sync_session_update;
      DROP TRIGGER IF EXISTS sync_session_delete;
      DROP TRIGGER IF EXISTS sync_reply_insert;
      DROP TRIGGER IF EXISTS sync_reply_update;
      DROP TRIGGER IF EXISTS sync_reply_delete;
    `);
  } finally {
    database.close();
  }
}
