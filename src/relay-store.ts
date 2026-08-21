import { createHash, randomBytes, randomUUID } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, renameSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
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

const webSessionIdleLifetimeMilliseconds = 12 * 60 * 60 * 1000;
const webSessionMaximumLifetimeMilliseconds = 30 * 24 * 60 * 60 * 1000;
const rememberedWebSessionIdleLifetimeMilliseconds = 30 * 24 * 60 * 60 * 1000;
const rememberedWebSessionMaximumLifetimeMilliseconds = 90 * 24 * 60 * 60 * 1000;

function settingKey(value: string) {
  if (!/^[a-z0-9:_-]{1,240}$/i.test(value)) throw new Error("invalid_relay_setting");
  return value;
}

type SessionRow = {
  id: string;
  csrf_token: string;
  created_at: string;
  expires_at: string;
  last_seen_at: string;
  remembered: number;
  device_name: string;
  user_agent: string;
  client_ip: string;
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
        id TEXT NOT NULL UNIQUE,
        csrf_token TEXT NOT NULL,
        created_at TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        last_seen_at TEXT NOT NULL,
        remembered INTEGER NOT NULL DEFAULT 0,
        device_name TEXT NOT NULL DEFAULT '浏览器设备',
        user_agent TEXT NOT NULL DEFAULT '',
        client_ip TEXT NOT NULL DEFAULT ''
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
    const webSessionColumns = new Set((this.database.prepare("PRAGMA table_info(relay_web_sessions)").all() as Array<{ name: string }>).map(column => column.name));
    if (!webSessionColumns.has("id")) this.database.exec("ALTER TABLE relay_web_sessions ADD COLUMN id TEXT");
    if (!webSessionColumns.has("remembered")) this.database.exec("ALTER TABLE relay_web_sessions ADD COLUMN remembered INTEGER NOT NULL DEFAULT 0");
    if (!webSessionColumns.has("device_name")) this.database.exec("ALTER TABLE relay_web_sessions ADD COLUMN device_name TEXT NOT NULL DEFAULT '浏览器设备'");
    if (!webSessionColumns.has("user_agent")) this.database.exec("ALTER TABLE relay_web_sessions ADD COLUMN user_agent TEXT NOT NULL DEFAULT ''");
    if (!webSessionColumns.has("client_ip")) this.database.exec("ALTER TABLE relay_web_sessions ADD COLUMN client_ip TEXT NOT NULL DEFAULT ''");
    const sessionsWithoutId = this.database.prepare("SELECT token_hash FROM relay_web_sessions WHERE id IS NULL OR id = ''").all() as Array<{ token_hash: string }>;
    const assignSessionId = this.database.prepare("UPDATE relay_web_sessions SET id = ? WHERE token_hash = ?");
    for (const session of sessionsWithoutId) assignSessionId.run(randomUUID(), session.token_hash);
    this.database.exec("CREATE UNIQUE INDEX IF NOT EXISTS relay_web_sessions_id ON relay_web_sessions(id)");
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

  createWebSession(input: { remembered?: boolean; deviceName?: unknown; userAgent?: unknown; clientIp?: unknown } = {}) {
    const token = randomBytes(32).toString("base64url");
    const id = randomUUID();
    const csrfToken = randomBytes(32).toString("base64url");
    const createdAt = now();
    const remembered = input.remembered === true;
    const expiresAt = after(remembered ? rememberedWebSessionIdleLifetimeMilliseconds : webSessionIdleLifetimeMilliseconds);
    const deviceName = typeof input.deviceName === "string" ? input.deviceName.replace(/[\r\n\0]/g, " ").trim().slice(0, 120) || "浏览器设备" : "浏览器设备";
    const userAgent = typeof input.userAgent === "string" ? input.userAgent.replace(/[\r\n\0]/g, " ").trim().slice(0, 500) : "";
    const clientIp = typeof input.clientIp === "string" ? input.clientIp.replace(/[\r\n\0]/g, " ").trim().slice(0, 120) : "";
    this.database.prepare("DELETE FROM relay_web_sessions WHERE expires_at <= ?").run(createdAt);
    this.database.prepare("INSERT INTO relay_web_sessions (token_hash, id, csrf_token, created_at, expires_at, last_seen_at, remembered, device_name, user_agent, client_ip) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").run(tokenHash(token), id, csrfToken, createdAt, expiresAt, createdAt, remembered ? 1 : 0, deviceName, userAgent, clientIp);
    return { token, id, csrf_token: csrfToken, created_at: createdAt, expires_at: expiresAt, remembered };
  }

  webSession(token: string) {
    if (!token) return null;
    const row = this.database.prepare("SELECT id, csrf_token, created_at, expires_at, last_seen_at, remembered, device_name, user_agent, client_ip FROM relay_web_sessions WHERE token_hash = ?").get(tokenHash(token)) as SessionRow | undefined;
    if (!row) return null;
    if (Date.parse(row.expires_at) <= Date.now()) {
      this.database.prepare("DELETE FROM relay_web_sessions WHERE token_hash = ?").run(tokenHash(token));
      return null;
    }
    const seenAtMilliseconds = Date.now();
    const seenAt = new Date(seenAtMilliseconds).toISOString();
    const idleLifetime = row.remembered === 1 ? rememberedWebSessionIdleLifetimeMilliseconds : webSessionIdleLifetimeMilliseconds;
    const maximumLifetime = row.remembered === 1 ? rememberedWebSessionMaximumLifetimeMilliseconds : webSessionMaximumLifetimeMilliseconds;
    const expiresAtMilliseconds = Math.min(seenAtMilliseconds + idleLifetime, Date.parse(row.created_at) + maximumLifetime);
    if (expiresAtMilliseconds <= seenAtMilliseconds) {
      this.database.prepare("DELETE FROM relay_web_sessions WHERE token_hash = ?").run(tokenHash(token));
      return null;
    }
    const expiresAt = new Date(expiresAtMilliseconds).toISOString();
    this.database.prepare("UPDATE relay_web_sessions SET expires_at = ?, last_seen_at = ? WHERE token_hash = ?").run(expiresAt, seenAt, tokenHash(token));
    return { ...row, remembered: row.remembered === 1, expires_at: expiresAt, last_seen_at: seenAt };
  }

  revokeWebSession(token: string) {
    if (token) this.database.prepare("DELETE FROM relay_web_sessions WHERE token_hash = ?").run(tokenHash(token));
  }

  webSessions() {
    const timestamp = now();
    this.database.prepare("DELETE FROM relay_web_sessions WHERE expires_at <= ?").run(timestamp);
    return (this.database.prepare("SELECT id, device_name, created_at, expires_at, last_seen_at, remembered, client_ip FROM relay_web_sessions ORDER BY last_seen_at DESC").all() as Array<Omit<SessionRow, "csrf_token" | "user_agent">>).map(session => ({ ...session, remembered: session.remembered === 1 }));
  }

  revokeWebSessionById(idValue: unknown) {
    const id = typeof idValue === "string" ? idValue.trim() : "";
    const result = this.database.prepare("DELETE FROM relay_web_sessions WHERE id = ?").run(id);
    if (result.changes !== 1) throw new Error("web_session_not_found");
    return { id };
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

  backup(target?: string) {
    const directory = join(dirname(this.file), "backups");
    mkdirSync(directory, { recursive: true });
    const destination = resolve(target || join(directory, `better-codex-relay-${new Date().toISOString().replace(/[:.]/g, "-")}.db`));
    if (existsSync(destination)) throw new Error("backup_already_exists");
    this.database.prepare("VACUUM INTO ?").run(destination);
    const check = new DatabaseSync(destination, { readOnly: true });
    try {
      const integrity = check.prepare("PRAGMA quick_check").get() as { quick_check?: string } | undefined;
      if (integrity?.quick_check !== "ok") throw new Error("backup_integrity_failed");
    } finally {
      check.close();
    }
    this.audit("admin", "backup_created", destination);
    return { backup: destination };
  }

  tableNames() {
    return (this.database.prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name").all() as Array<{ name: string }>).map(row => row.name);
  }
}

export function restoreRelayBackup(databaseFile: string, backupFile: string) {
  const database = resolve(databaseFile);
  const backup = resolve(backupFile);
  if (!existsSync(backup)) throw new Error("backup_not_found");
  const source = new DatabaseSync(backup, { readOnly: true });
  try {
    const integrity = source.prepare("PRAGMA quick_check").get() as { quick_check?: string } | undefined;
    const tables = new Set((source.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all() as Array<{ name: string }>).map(row => row.name));
    if (integrity?.quick_check !== "ok" || !["relay_settings", "relay_web_sessions", "relay_devices", "relay_audit"].every(table => tables.has(table))) throw new Error("backup_invalid");
  } finally {
    source.close();
  }
  mkdirSync(dirname(database), { recursive: true });
  const temporary = `${database}.restore-${randomUUID()}`;
  copyFileSync(backup, temporary);
  if (existsSync(database)) renameSync(database, `${database}.before-restore-${new Date().toISOString().replace(/[:.]/g, "-")}`);
  renameSync(temporary, database);
  return { restored: database, source: backup };
}
