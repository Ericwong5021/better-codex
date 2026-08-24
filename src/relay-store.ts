import { createHash, randomBytes, randomUUID } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, renameSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import type { WebCommandEnvelope } from "./command-contract.js";
import { avatarColor, avatarColors } from "./user-profile.js";

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
const rememberedWebSessionExpiresAt = "9999-12-31T23:59:59.999Z";

function settingKey(value: string) {
  if (!/^[a-z0-9:_-]{1,240}$/i.test(value)) throw new Error("invalid_relay_setting");
  return value;
}

function cleanNickname(value: unknown) {
  if (typeof value !== "string" || value.length > 80 || value.includes("\0")) throw new Error("relay_web_nickname_invalid");
  const nickname = value.replace(/\s+/g, " ").trim();
  if (!nickname) throw new Error("relay_web_nickname_invalid");
  return nickname;
}

function cleanAvatar(value: unknown) {
  if (typeof value !== "string" || value.length > 400_000 || value.includes("\0")) throw new Error("relay_web_avatar_invalid");
  if (!value || /^icon:[a-z0-9_-]{1,32}$/i.test(value) || /^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(value)) return value;
  throw new Error("relay_web_avatar_invalid");
}

function cleanAvatarColor(value: unknown) {
  if (typeof value !== "string") throw new Error("relay_web_avatar_color_invalid");
  const color = value.toLowerCase();
  if (!(avatarColors as readonly string[]).includes(color)) throw new Error("relay_web_avatar_color_invalid");
  return color;
}

type SessionRow = {
  id: string;
  user_id: string;
  csrf_token: string;
  created_at: string;
  expires_at: string;
  last_seen_at: string;
  remembered: number;
  device_name: string;
  user_agent: string;
  client_ip: string;
};

export type RelayWebUser = {
  id: string;
  username: string;
  nickname: string;
  avatar: string;
  avatar_color: string;
  avatar_generated: boolean;
  disabled: boolean;
  created_at: string;
  updated_at: string;
};

type DeviceRow = {
  id: string;
  name: string;
  created_at: string;
  revoked_at: string | null;
};

export type RelayCommand = {
  command_id: string;
  session_id: string;
  device_id: string | null;
  kind: string;
  entity_id: string | null;
  method: string;
  path: string;
  headers: Record<string, string>;
  body: Buffer;
  fingerprint: string;
  status: "pending" | "dispatched" | "applied" | "rejected" | "conflict" | "expired";
  delivery_id: string | null;
  attempt_count: number;
  available_at: string;
  dispatch_expires_at: string | null;
  expires_at: string;
  response_status: number | null;
  response_headers: Record<string, string>;
  response_body: Buffer | null;
  last_error: string | null;
  created_at: string;
  updated_at: string;
};

type RelayCommandRow = Omit<RelayCommand, "headers" | "body" | "response_headers" | "response_body"> & {
  headers_json: string;
  body_blob: Uint8Array;
  response_headers_json: string | null;
  response_body_blob: Uint8Array | null;
};

function relayCommandFromRow(row: RelayCommandRow): RelayCommand {
  return {
    ...row,
    headers: JSON.parse(row.headers_json) as Record<string, string>,
    body: Buffer.from(row.body_blob),
    response_headers: row.response_headers_json ? JSON.parse(row.response_headers_json) as Record<string, string> : {},
    response_body: row.response_body_blob ? Buffer.from(row.response_body_blob) : null,
  };
}

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
      CREATE TABLE IF NOT EXISTS relay_web_users (
        id TEXT PRIMARY KEY,
        username TEXT NOT NULL COLLATE NOCASE UNIQUE,
        password_hash TEXT NOT NULL,
        nickname TEXT NOT NULL,
        avatar TEXT NOT NULL DEFAULT '',
        avatar_color TEXT NOT NULL DEFAULT '',
        avatar_generated INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        disabled_at TEXT
      );
      CREATE TABLE IF NOT EXISTS relay_web_sessions (
        token_hash TEXT PRIMARY KEY,
        id TEXT NOT NULL UNIQUE,
        user_id TEXT NOT NULL REFERENCES relay_web_users(id) ON DELETE CASCADE,
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
      CREATE TABLE IF NOT EXISTS relay_commands (
        command_id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        device_id TEXT,
        kind TEXT NOT NULL,
        entity_id TEXT,
        method TEXT NOT NULL,
        path TEXT NOT NULL,
        headers_json TEXT NOT NULL,
        body_blob BLOB NOT NULL,
        fingerprint TEXT NOT NULL,
        status TEXT NOT NULL,
        delivery_id TEXT,
        attempt_count INTEGER NOT NULL DEFAULT 0,
        available_at TEXT NOT NULL,
        dispatch_expires_at TEXT,
        expires_at TEXT NOT NULL,
        response_status INTEGER,
        response_headers_json TEXT,
        response_body_blob BLOB,
        last_error TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS relay_commands_delivery ON relay_commands(status, available_at, dispatch_expires_at, created_at);
      CREATE INDEX IF NOT EXISTS relay_commands_session ON relay_commands(session_id, created_at);
    `);
    const webUserColumns = new Set((this.database.prepare("PRAGMA table_info(relay_web_users)").all() as Array<{ name: string }>).map(column => column.name));
    if (!webUserColumns.has("avatar_color")) this.database.exec("ALTER TABLE relay_web_users ADD COLUMN avatar_color TEXT NOT NULL DEFAULT ''");
    if (!webUserColumns.has("avatar_generated")) {
      this.database.exec("ALTER TABLE relay_web_users ADD COLUMN avatar_generated INTEGER NOT NULL DEFAULT 1");
      this.database.exec("UPDATE relay_web_users SET avatar_generated = 0 WHERE avatar <> ''");
    }
    const webSessionColumns = new Set((this.database.prepare("PRAGMA table_info(relay_web_sessions)").all() as Array<{ name: string }>).map(column => column.name));
    if (!webSessionColumns.has("id")) this.database.exec("ALTER TABLE relay_web_sessions ADD COLUMN id TEXT");
    if (!webSessionColumns.has("user_id")) this.database.exec("ALTER TABLE relay_web_sessions ADD COLUMN user_id TEXT REFERENCES relay_web_users(id) ON DELETE CASCADE");
    if (!webSessionColumns.has("remembered")) this.database.exec("ALTER TABLE relay_web_sessions ADD COLUMN remembered INTEGER NOT NULL DEFAULT 0");
    if (!webSessionColumns.has("device_name")) this.database.exec("ALTER TABLE relay_web_sessions ADD COLUMN device_name TEXT NOT NULL DEFAULT '浏览器设备'");
    if (!webSessionColumns.has("user_agent")) this.database.exec("ALTER TABLE relay_web_sessions ADD COLUMN user_agent TEXT NOT NULL DEFAULT ''");
    if (!webSessionColumns.has("client_ip")) this.database.exec("ALTER TABLE relay_web_sessions ADD COLUMN client_ip TEXT NOT NULL DEFAULT ''");
    const sessionsWithoutId = this.database.prepare("SELECT token_hash FROM relay_web_sessions WHERE id IS NULL OR id = ''").all() as Array<{ token_hash: string }>;
    const assignSessionId = this.database.prepare("UPDATE relay_web_sessions SET id = ? WHERE token_hash = ?");
    for (const session of sessionsWithoutId) assignSessionId.run(randomUUID(), session.token_hash);
    const userCount = Number((this.database.prepare("SELECT COUNT(*) AS value FROM relay_web_users").get() as { value: number }).value);
    const legacyUsername = this.setting("web_username");
    const legacyPasswordHash = this.setting("web_password_hash");
    if (userCount === 0 && legacyUsername && legacyPasswordHash) {
      const timestamp = now();
      this.database.prepare("INSERT INTO relay_web_users (id, username, password_hash, nickname, avatar, created_at, updated_at) VALUES (?, ?, ?, ?, '', ?, ?)")
        .run(randomUUID(), legacyUsername, legacyPasswordHash, legacyUsername, timestamp, timestamp);
    }
    this.database.exec("DELETE FROM relay_web_sessions WHERE user_id IS NULL OR user_id = ''");
    this.database.prepare("UPDATE relay_web_sessions SET expires_at = ? WHERE remembered = 1").run(rememberedWebSessionExpiresAt);
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
    const count = Number((this.database.prepare("SELECT COUNT(*) AS value FROM relay_web_users").get() as { value: number }).value);
    if (count === 0) this.createWebUser(username, hash);
  }

  setWebCredentials(username: string, hash: string) {
    const user = this.webUserCredentials(username) || this.listWebUsers().find(item => item.username.toLowerCase() === username.toLowerCase());
    if (user) this.setWebUserPassword(username, hash);
    else this.createWebUser(username, hash);
  }

  webUsername() {
    return this.listWebUsers().find(user => !user.disabled)?.username || "admin";
  }

  webPasswordHash() {
    const user = this.webUserCredentials(this.webUsername());
    return user?.password_hash || "";
  }

  private webUserFromRow(row: Record<string, unknown>): RelayWebUser {
    const id = String(row.id);
    const storedColor = String(row.avatar_color || "").toLowerCase();
    return {
      id,
      username: String(row.username),
      nickname: String(row.nickname || row.username),
      avatar: String(row.avatar || ""),
      avatar_color: (avatarColors as readonly string[]).includes(storedColor) ? storedColor : avatarColor(id),
      avatar_generated: Number(row.avatar_generated) !== 0,
      disabled: Boolean(row.disabled_at),
      created_at: String(row.created_at),
      updated_at: String(row.updated_at),
    };
  }

  webUserCredentials(username: string) {
    const row = this.database.prepare("SELECT * FROM relay_web_users WHERE username = ? COLLATE NOCASE AND disabled_at IS NULL").get(username) as Record<string, unknown> | undefined;
    return row ? { ...this.webUserFromRow(row), password_hash: String(row.password_hash) } : null;
  }

  webUser(id: string) {
    const row = this.database.prepare("SELECT * FROM relay_web_users WHERE id = ?").get(id) as Record<string, unknown> | undefined;
    return row ? this.webUserFromRow(row) : null;
  }

  listWebUsers() {
    return (this.database.prepare("SELECT * FROM relay_web_users ORDER BY disabled_at IS NOT NULL, nickname COLLATE NOCASE, username COLLATE NOCASE").all() as Record<string, unknown>[]).map(row => this.webUserFromRow(row));
  }

  createWebUser(username: string, encoded: string, nicknameValue: unknown = username) {
    if (!encoded.startsWith("scrypt$") || !username) throw new Error("relay_web_credentials_invalid");
    if (this.listWebUsers().some(user => user.username.toLowerCase() === username.toLowerCase())) throw new Error("web_user_exists");
    const nickname = cleanNickname(nicknameValue);
    const id = randomUUID();
    const timestamp = now();
    this.database.prepare("INSERT INTO relay_web_users (id, username, password_hash, nickname, avatar, created_at, updated_at) VALUES (?, ?, ?, ?, '', ?, ?)")
      .run(id, username, encoded, nickname, timestamp, timestamp);
    this.audit(id, "web_user_created", username);
    return this.webUser(id)!;
  }

  setWebUserPassword(username: string, encoded: string) {
    if (!encoded.startsWith("scrypt$") || !username) throw new Error("relay_web_credentials_invalid");
    const user = this.webUserCredentials(username) || this.listWebUsers().find(item => item.username.toLowerCase() === username.toLowerCase());
    if (!user) throw new Error("web_user_not_found");
    this.database.exec("BEGIN IMMEDIATE");
    try {
      this.database.prepare("UPDATE relay_web_users SET password_hash = ?, updated_at = ? WHERE id = ?").run(encoded, now(), user.id);
      this.database.prepare("DELETE FROM relay_web_sessions WHERE user_id = ?").run(user.id);
      this.database.exec("COMMIT");
    } catch (error) {
      this.database.exec("ROLLBACK");
      throw error;
    }
    this.audit(user.id, "web_password_rotated");
    return this.webUser(user.id)!;
  }

  setWebUserDisabled(username: string, disabled: boolean) {
    const user = this.listWebUsers().find(item => item.username.toLowerCase() === username.toLowerCase());
    if (!user) throw new Error("web_user_not_found");
    this.database.exec("BEGIN IMMEDIATE");
    try {
      this.database.prepare("UPDATE relay_web_users SET disabled_at = ?, updated_at = ? WHERE id = ?").run(disabled ? now() : null, now(), user.id);
      if (disabled) this.database.prepare("DELETE FROM relay_web_sessions WHERE user_id = ?").run(user.id);
      this.database.exec("COMMIT");
    } catch (error) {
      this.database.exec("ROLLBACK");
      throw error;
    }
    this.audit(user.id, disabled ? "web_user_disabled" : "web_user_enabled");
    return this.webUser(user.id)!;
  }

  setWebUserProfile(id: string, nicknameValue: unknown, avatarValue: unknown, avatarColorValue?: unknown, avatarGeneratedValue?: unknown) {
    const current = this.webUser(id);
    if (!current || current.disabled) throw new Error("web_user_not_found");
    const nickname = cleanNickname(nicknameValue);
    const avatar = cleanAvatar(avatarValue);
    const color = avatarColorValue === undefined ? current.avatar_color : cleanAvatarColor(avatarColorValue);
    const avatarGenerated = avatarGeneratedValue === undefined ? avatar === current.avatar ? current.avatar_generated : false : avatarGeneratedValue;
    if (typeof avatarGenerated !== "boolean") throw new Error("relay_web_avatar_generated_invalid");
    if (avatarGenerated && avatar && !avatar.startsWith("data:image/png;base64,")) throw new Error("relay_web_avatar_generated_invalid");
    const result = this.database.prepare("UPDATE relay_web_users SET nickname = ?, avatar = ?, avatar_color = ?, avatar_generated = ?, updated_at = ? WHERE id = ? AND disabled_at IS NULL").run(nickname, avatar, color, avatarGenerated ? 1 : 0, now(), id);
    if (result.changes !== 1) throw new Error("web_user_not_found");
    this.audit(id, "web_profile_updated");
    return this.webUser(id)!;
  }

  createWebSession(userId: string, input: { remembered?: boolean; deviceName?: unknown; userAgent?: unknown; clientIp?: unknown } = {}) {
    const user = this.webUser(userId);
    if (!user || user.disabled) throw new Error("web_user_not_found");
    const token = randomBytes(32).toString("base64url");
    const id = randomUUID();
    const csrfToken = randomBytes(32).toString("base64url");
    const createdAt = now();
    const remembered = input.remembered === true;
    const expiresAt = remembered ? rememberedWebSessionExpiresAt : after(webSessionIdleLifetimeMilliseconds);
    const deviceName = typeof input.deviceName === "string" ? input.deviceName.replace(/[\r\n\0]/g, " ").trim().slice(0, 120) || "浏览器设备" : "浏览器设备";
    const userAgent = typeof input.userAgent === "string" ? input.userAgent.replace(/[\r\n\0]/g, " ").trim().slice(0, 500) : "";
    const clientIp = typeof input.clientIp === "string" ? input.clientIp.replace(/[\r\n\0]/g, " ").trim().slice(0, 120) : "";
    this.database.prepare("DELETE FROM relay_web_sessions WHERE expires_at <= ?").run(createdAt);
    this.database.prepare("INSERT INTO relay_web_sessions (token_hash, id, user_id, csrf_token, created_at, expires_at, last_seen_at, remembered, device_name, user_agent, client_ip) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").run(tokenHash(token), id, userId, csrfToken, createdAt, expiresAt, createdAt, remembered ? 1 : 0, deviceName, userAgent, clientIp);
    return { token, id, csrf_token: csrfToken, created_at: createdAt, expires_at: expiresAt, remembered, user };
  }

  webSession(token: string) {
    if (!token) return null;
    const row = this.database.prepare("SELECT relay_web_sessions.id, relay_web_sessions.user_id, relay_web_sessions.csrf_token, relay_web_sessions.created_at, relay_web_sessions.expires_at, relay_web_sessions.last_seen_at, relay_web_sessions.remembered, relay_web_sessions.device_name, relay_web_sessions.user_agent, relay_web_sessions.client_ip FROM relay_web_sessions JOIN relay_web_users ON relay_web_users.id = relay_web_sessions.user_id WHERE relay_web_sessions.token_hash = ? AND relay_web_users.disabled_at IS NULL").get(tokenHash(token)) as SessionRow | undefined;
    if (!row) return null;
    if (row.remembered !== 1 && Date.parse(row.expires_at) <= Date.now()) {
      this.database.prepare("DELETE FROM relay_web_sessions WHERE token_hash = ?").run(tokenHash(token));
      return null;
    }
    const seenAtMilliseconds = Date.now();
    const seenAt = new Date(seenAtMilliseconds).toISOString();
    const expiresAtMilliseconds = row.remembered === 1 ? Date.parse(rememberedWebSessionExpiresAt) : Math.min(seenAtMilliseconds + webSessionIdleLifetimeMilliseconds, Date.parse(row.created_at) + webSessionMaximumLifetimeMilliseconds);
    if (expiresAtMilliseconds <= seenAtMilliseconds) {
      this.database.prepare("DELETE FROM relay_web_sessions WHERE token_hash = ?").run(tokenHash(token));
      return null;
    }
    const expiresAt = row.remembered === 1 ? rememberedWebSessionExpiresAt : new Date(expiresAtMilliseconds).toISOString();
    this.database.prepare("UPDATE relay_web_sessions SET expires_at = ?, last_seen_at = ? WHERE token_hash = ?").run(expiresAt, seenAt, tokenHash(token));
    const user = this.webUser(row.user_id);
    return user ? { ...row, remembered: row.remembered === 1, expires_at: expiresAt, last_seen_at: seenAt, user } : null;
  }

  revokeWebSession(token: string) {
    if (token) this.database.prepare("DELETE FROM relay_web_sessions WHERE token_hash = ?").run(tokenHash(token));
  }

  webSessions() {
    const timestamp = now();
    this.database.prepare("DELETE FROM relay_web_sessions WHERE remembered = 0 AND expires_at <= ?").run(timestamp);
    return (this.database.prepare("SELECT relay_web_sessions.id, relay_web_sessions.user_id, relay_web_users.username, relay_web_users.nickname, relay_web_sessions.device_name, relay_web_sessions.created_at, relay_web_sessions.expires_at, relay_web_sessions.last_seen_at, relay_web_sessions.remembered, relay_web_sessions.client_ip FROM relay_web_sessions JOIN relay_web_users ON relay_web_users.id = relay_web_sessions.user_id ORDER BY relay_web_sessions.last_seen_at DESC").all() as Array<Omit<SessionRow, "csrf_token" | "user_agent"> & { username: string; nickname: string }>).map(session => ({ ...session, remembered: session.remembered === 1 }));
  }

  webSessionIdsForUser(userId: string) {
    return (this.database.prepare("SELECT id FROM relay_web_sessions WHERE user_id = ?").all(userId) as Array<{ id: string }>).map(session => session.id);
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

  enqueueCommand(sessionId: string, command: WebCommandEnvelope, headers: Record<string, string>) {
    const existing = this.relayCommand(command.command_id);
    if (existing) return existing.fingerprint === command.fingerprint ? { kind: "existing" as const, command: existing } : { kind: "conflict" as const, command: existing };
    const timestamp = now();
    const expiresAt = after(7 * 24 * 60 * 60_000);
    this.database.prepare(`
      INSERT INTO relay_commands (
        command_id, session_id, device_id, kind, entity_id, method, path, headers_json, body_blob, fingerprint,
        status, delivery_id, attempt_count, available_at, dispatch_expires_at, expires_at, created_at, updated_at
      ) VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, 'pending', NULL, 0, ?, NULL, ?, ?, ?)
    `).run(command.command_id, sessionId, command.kind, command.entity_id, command.method, command.path, JSON.stringify(headers), command.body, command.fingerprint, timestamp, expiresAt, timestamp, timestamp);
    return { kind: "new" as const, command: this.relayCommand(command.command_id)! };
  }

  relayCommand(commandId: string) {
    const row = this.database.prepare("SELECT * FROM relay_commands WHERE command_id = ?").get(commandId) as RelayCommandRow | undefined;
    return row ? relayCommandFromRow(row) : null;
  }

  claimCommands(deviceId: string, limit = 8, leaseMilliseconds = 120_000) {
    const timestamp = now();
    const leaseExpiresAt = after(leaseMilliseconds);
    this.database.exec("BEGIN IMMEDIATE");
    try {
      this.database.prepare("UPDATE relay_commands SET status = 'expired', delivery_id = NULL, dispatch_expires_at = NULL, updated_at = ? WHERE status IN ('pending', 'dispatched') AND expires_at <= ?").run(timestamp, timestamp);
      this.database.prepare("UPDATE relay_commands SET status = 'pending', delivery_id = NULL, dispatch_expires_at = NULL, available_at = ?, updated_at = ? WHERE status = 'dispatched' AND dispatch_expires_at <= ?").run(timestamp, timestamp, timestamp);
      const rows = this.database.prepare(`
        SELECT command_id
        FROM relay_commands AS candidate
        WHERE status = 'pending'
          AND available_at <= ?
          AND expires_at > ?
          AND attempt_count < 20
          AND (device_id IS NULL OR device_id = ?)
          AND (
            entity_id IS NULL
            OR NOT EXISTS (
              SELECT 1
              FROM relay_commands AS earlier
              WHERE earlier.kind = candidate.kind
                AND earlier.entity_id = candidate.entity_id
                AND earlier.status IN ('pending', 'dispatched')
                AND (earlier.created_at < candidate.created_at OR (earlier.created_at = candidate.created_at AND earlier.command_id < candidate.command_id))
            )
          )
        ORDER BY created_at, command_id
        LIMIT ?
      `).all(timestamp, timestamp, deviceId, Math.max(1, Math.min(limit, 32))) as Array<{ command_id: string }>;
      const claimed: RelayCommand[] = [];
      const update = this.database.prepare("UPDATE relay_commands SET device_id = ?, status = 'dispatched', delivery_id = ?, attempt_count = attempt_count + 1, dispatch_expires_at = ?, updated_at = ? WHERE command_id = ? AND status = 'pending'");
      for (const row of rows) {
        const deliveryId = randomUUID();
        const result = update.run(deviceId, deliveryId, leaseExpiresAt, timestamp, row.command_id);
        if (result.changes === 1) {
          const command = this.relayCommand(row.command_id);
          if (command) claimed.push(command);
        }
      }
      this.database.exec("COMMIT");
      return claimed;
    } catch (error) {
      this.database.exec("ROLLBACK");
      throw error;
    }
  }

  completeCommand(commandId: string, deliveryId: string, status: number, headers: Record<string, string>, body: Buffer) {
    const commandStatus = status === 409 ? "conflict" : status >= 200 && status < 400 ? "applied" : "rejected";
    const result = this.database.prepare("UPDATE relay_commands SET status = ?, response_status = ?, response_headers_json = ?, response_body_blob = ?, delivery_id = NULL, dispatch_expires_at = NULL, last_error = NULL, updated_at = ? WHERE command_id = ? AND delivery_id = ? AND status = 'dispatched'")
      .run(commandStatus, status, JSON.stringify(headers), body, now(), commandId, deliveryId);
    return result.changes === 1;
  }

  retryCommand(commandId: string, deliveryId: string, error: string) {
    const command = this.relayCommand(commandId);
    if (!command || command.status !== "dispatched" || command.delivery_id !== deliveryId) return false;
    const delays = [1000, 5000, 30000, 120000, 600000, 1800000];
    const delay = delays[Math.min(Math.max(0, command.attempt_count - 1), delays.length - 1)];
    const status = command.attempt_count >= 20 || Date.parse(command.expires_at) <= Date.now() ? "expired" : "pending";
    const result = this.database.prepare("UPDATE relay_commands SET status = ?, delivery_id = NULL, dispatch_expires_at = NULL, available_at = ?, last_error = ?, updated_at = ? WHERE command_id = ? AND delivery_id = ? AND status = 'dispatched'")
      .run(status, new Date(Date.now() + delay).toISOString(), error.slice(0, 1000), now(), commandId, deliveryId);
    return result.changes === 1;
  }

  pendingCommandCount() {
    const row = this.database.prepare("SELECT COUNT(*) AS count FROM relay_commands WHERE status IN ('pending', 'dispatched')").get() as { count: number };
    return Number(row.count);
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
