import { randomUUID } from "node:crypto";
import { existsSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { mkdirSync } from "node:fs";
import { syncConfigPath } from "./config.js";

export type SyncConfiguration = {
  enabled: true;
  hub_url: string;
  device_id: string;
  device_name: string;
  device_token: string;
  created_at: string;
  transport?: SyncTransport;
};

export type SyncTransport = "auto" | "websocket" | "http";

export function normalizeHubUrl(value: string) {
  const url = new URL(value);
  if (!['https:', 'http:'].includes(url.protocol)) throw new Error("invalid_hub_url");
  if (url.protocol === "http:" && !["127.0.0.1", "localhost", "::1"].includes(url.hostname)) throw new Error("hub_https_required");
  if (url.username || url.password) throw new Error("invalid_hub_url");
  url.pathname = url.pathname.replace(/\/$/, "");
  url.search = "";
  url.hash = "";
  return url.toString().replace(/\/$/, "");
}

export function readSyncConfiguration(): SyncConfiguration | null {
  if (!existsSync(syncConfigPath)) return null;
  try {
    const value = JSON.parse(readFileSync(syncConfigPath, "utf8")) as Partial<SyncConfiguration>;
    if (value.enabled !== true || !value.hub_url || !value.device_id || !value.device_token || !value.device_name) return null;
    const transport = value.transport === "http" || value.transport === "websocket" ? value.transport : "auto";
    return { ...value, transport, hub_url: normalizeHubUrl(value.hub_url) } as SyncConfiguration;
  } catch {
    return null;
  }
}

export function writeSyncConfiguration(input: Omit<SyncConfiguration, "enabled" | "created_at">) {
  const configuration: SyncConfiguration = {
    enabled: true,
    hub_url: normalizeHubUrl(input.hub_url),
    device_id: input.device_id,
    device_name: input.device_name.trim() || "Better Codex",
    device_token: input.device_token,
    created_at: new Date().toISOString(),
    transport: input.transport === "http" || input.transport === "websocket" ? input.transport : "auto",
  };
  mkdirSync(dirname(syncConfigPath), { recursive: true });
  const temporary = `${syncConfigPath}.${randomUUID()}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(configuration, null, 2)}\n`, { mode: 0o600 });
  renameSync(temporary, syncConfigPath);
  return configuration;
}

export function removeSyncConfiguration() {
  rmSync(syncConfigPath, { force: true });
}
