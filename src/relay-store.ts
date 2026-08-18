import { createHash, randomBytes, randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";

function now() {
  return new Date().toISOString();
}

function after(milliseconds: number) {
  return new Date(Date.now() + milliseconds).toISOString();
}

function tokenHash(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function settingKey(value: string) {
  if (!/^[a-z0-9:_-]{1,240}$/i.test(value)) throw new Error("invalid_relay_setting");
  return value;
}

type SessionRow = {
  csrf_token: string;
  created_at: string;
  expires_at: string;
  last_seen_at: string;
};

type DeviceRow = {
  id: string;
  name: string;
  created_at: string;
  revoked_at: string | null;
};

export class RelayStore {
  private readonly database: DatabaseSync;

  constructor(readonly file: string) {
    if (file !== ":memory:") mkdirSync(dirname(file), { recursive: true });
    this.database = new DatabaseSync(file);
    this.database.exec("PRAGMA foreign_keys = ON");
    this.database.exec("PRAGMA journal_mode = WAL");
    this.database.exec(`
      CREATE TABLE IF NOT EXISTS relay_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS relay_web_sessions (
        token_hash TEXT PRIMARY KEY,
        csrf_token TEXT NOT NULL,
        created_at TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        last_seen_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS relay_devices (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        token_hash TEXT NOT NULL UNIQUE,
        created_at TEXT NOT NULL,
        revoked_at TEXT
      );
      CREATE TABLE IF NOT EXISTS relay_audit (
        seq INTEGER PRIMARY KEY AUTOINCREMENT,
        actor TEXT NOT NULL,
        event TEXT NOT NULL,
        detail TEXT,
        created_at TEXT NOT NULL
      );
    `);
  }

  close() {
    this.database.close();
  }

  setting(key: string) {
    const row = this.database.prepare("SELECT value FROM relay_settings WHERE key = ?").get(settingKey(key)) as { value: string } | undefined;
    return row?.value ?? null;
  }

  setSetting(key: string, value: string) {
    this.database.prepare("INSERT INTO relay_settings (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at").run(settingKey(key), value, now());
  }

  ensureWebCredentials(username: string, hash: string) {
    if (!this.setting("web_username")) this.setSetting("web_username", username);
    if (!this.setting("web_password_hash")) this.setSetting("web_password_hash", hash);
  }

  setWebCredentials(username: string, hash: string) {
    this.database.exec("BEGIN IMMEDIATE");
    try {
      this.setSetting("web_username", username);
      this.setSetting("web_password_hash", hash);
      this.database.exec("DELETE FROM relay_web_sessions");
      this.database.exec("COMMIT");
    } catch (error) {
      this.database.exec("ROLLBACK");
      throw error;
    }
  }

  webUsername() {
    return this.setting("web_username") || "admin";
  }

  webPasswordHash() {
    return this.setting("web_password_hash") || "";
  }

  createWebSession(ttlMilliseconds = 12 * 60 * 60 * 1000) {
    const token = randomBytes(32).toString("base64url");
    const csrfToken = randomBytes(32).toString("base64url");
    const createdAt = now();
    const expiresAt = after(ttlMilliseconds);
    this.database.prepare("DELETE FROM relay_web_sessions WHERE expires_at <= ?").run(createdAt);
    this.database.prepare("INSERT INTO relay_web_sessions (token_hash, csrf_token, created_at, expires_at, last_seen_at) VALUES (?, ?, ?, ?, ?)").run(tokenHash(token), csrfToken, createdAt, expiresAt, createdAt);
    return { token, csrf_token: csrfToken, created_at: createdAt, expires_at: expiresAt };
  }

  webSession(token: string) {
    if (!token) return null;
    const row = this.database.prepare("SELECT csrf_token, created_at, expires_at, last_seen_at FROM relay_web_sessions WHERE token_hash = ?").get(tokenHash(token)) as SessionRow | undefined;
    if (!row) return null;
    if (Date.parse(row.expires_at) <= Date.now()) {
      this.database.prepare("DELETE FROM relay_web_sessions WHERE token_hash = ?").run(tokenHash(token));
      return null;
    }
    const seenAt = now();
    this.database.prepare("UPDATE relay_web_sessions SET last_seen_at = ? WHERE token_hash = ?").run(seenAt, tokenHash(token));
    return { ...row, last_seen_at: seenAt };
  }

  revokeWebSession(token: string) {
    if (token) this.database.prepare("DELETE FROM relay_web_sessions WHERE token_hash = ?").run(tokenHash(token));
  }

  createPairingCode(ttlMilliseconds = 10 * 60 * 1000) {
    const code = randomBytes(9).toString("base64url").toUpperCase();
    this.setSetting("pairing_code_hash", tokenHash(code));
    this.setSetting("pairing_code_expires_at", after(ttlMilliseconds));
    return { pairing_code: code, expires_at: this.setting("pairing_code_expires_at") };
  }

  pairDevice(nameValue: unknown, pairingCodeValue: unknown, replaceExisting = true) {
    const name = typeof nameValue === "string" ? nameValue.trim().slice(0, 120) : "";
    const pairingCode = typeof pairingCodeValue === "string" ? pairingCodeValue.trim() : "";
    const expected = this.setting("pairing_code_hash");
    const expiresAt = this.setting("pairing_code_expires_at");
    if (!name) throw new Error("device_name_required");
    if (!expected || !expiresAt || Date.parse(expiresAt) <= Date.now() || tokenHash(pairingCode) !== expected) throw new Error("pairing_code_invalid");
    const current = this.database.prepare("SELECT id FROM relay_devices WHERE revoked_at IS NULL ORDER BY created_at DESC LIMIT 1").get() as { id: string } | undefined;
    if (current && !replaceExisting) throw new Error("runtime_already_paired");
    const id = current?.id || randomUUID();
    const token = randomBytes(32).toString("base64url");
    const createdAt = now();
    this.database.exec("BEGIN IMMEDIATE");
    try {
      if (current) this.database.prepare("UPDATE relay_devices SET name = ?, token_hash = ?, revoked_at = NULL WHERE id = ?").run(name, tokenHash(token), id);
      else this.database.prepare("INSERT INTO relay_devices (id, name, token_hash, created_at, revoked_at) VALUES (?, ?, ?, ?, NULL)").run(id, name, tokenHash(token), createdAt);
      this.database.prepare("DELETE FROM relay_settings WHERE key IN ('pairing_code_hash', 'pairing_code_expires_at')").run();
      this.database.exec("COMMIT");
    } catch (error) {
      this.database.exec("ROLLBACK");
      throw error;
    }
    this.audit(id, "device_paired");
    return { device_id: id, device_name: name, device_token: token, created_at: createdAt };
  }

  deviceForToken(token: string) {
    if (!token) return null;
    const row = this.database.prepare("SELECT id, name, created_at, revoked_at FROM relay_devices WHERE token_hash = ? AND revoked_at IS NULL").get(tokenHash(token)) as DeviceRow | undefined;
    return row || null;
  }

  device(id: string) {
    return (this.database.prepare("SELECT id, name, created_at, revoked_at FROM relay_devices WHERE id = ?").get(id) as DeviceRow | undefined) || null;
  }

  devices() {
    return this.database.prepare("SELECT id, name, created_at, revoked_at FROM relay_devices ORDER BY created_at DESC").all() as DeviceRow[];
  }

  revokeDevice(id: string) {
    const revokedAt = now();
    const result = this.database.prepare("UPDATE relay_devices SET revoked_at = ? WHERE id = ? AND revoked_at IS NULL").run(revokedAt, id);
    if (result.changes !== 1) throw new Error("device_not_found");
    this.audit(id, "device_revoked");
    return { id, revoked_at: revokedAt };
  }

  rotateDeviceToken(id: string) {
    const token = randomBytes(32).toString("base64url");
    const result = this.database.prepare("UPDATE relay_devices SET token_hash = ? WHERE id = ? AND revoked_at IS NULL").run(tokenHash(token), id);
    if (result.changes !== 1) throw new Error("device_not_found");
    this.audit(id, "device_token_rotated");
    return { device_id: id, device_token: token };
  }

  nextConnectionEpoch(deviceId: string) {
    const key = `connection_epoch:${deviceId}`;
    this.database.exec("BEGIN IMMEDIATE");
    try {
      const current = Number(this.setting(key) || 0);
      const epoch = Number.isSafeInteger(current) && current >= 0 ? current + 1 : 1;
      this.setSetting(key, String(epoch));
      this.database.exec("COMMIT");
      return epoch;
    } catch (error) {
      this.database.exec("ROLLBACK");
      throw error;
    }
  }

  audit(actorValue: unknown, eventValue: unknown, detailValue?: unknown) {
    const actor = typeof actorValue === "string" ? actorValue.slice(0, 200) : "unknown";
    const event = typeof eventValue === "string" ? eventValue.slice(0, 120) : "unknown";
    const detail = typeof detailValue === "string" ? detailValue.replace(/[\r\n\0]/g, " ").slice(0, 500) : null;
    this.database.prepare("INSERT INTO relay_audit (actor, event, detail, created_at) VALUES (?, ?, ?, ?)").run(actor, event, detail, now());
  }

  auditEvents(limit = 100) {
    const safeLimit = Number.isInteger(limit) ? Math.max(1, Math.min(limit, 1000)) : 100;
    return this.database.prepare("SELECT seq, actor, event, detail, created_at FROM relay_audit ORDER BY seq DESC LIMIT ?").all(safeLimit);
  }

  tableNames() {
    return (this.database.prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name").all() as Array<{ name: string }>).map(row => row.name);
  }
}
