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
    const triggers = database.prepare("SELECT name FROM sqlite_master WHERE type = 'trigger' AND name GLOB 'sync_*' AND sql LIKE '%sync_outbox%'").all() as Array<{ name: string }>;
    database.exec("BEGIN IMMEDIATE");
    try {
      for (const trigger of triggers) database.exec(`DROP TRIGGER "${trigger.name.replaceAll('"', '""')}"`);
      database.exec("COMMIT");
    } catch (error) {
      database.exec("ROLLBACK");
      throw error;
    }
  } finally {
    database.close();
  }
}
