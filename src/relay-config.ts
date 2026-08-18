import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { relayConfigPath } from "./config.js";

export type RelayConfiguration = {
  enabled: true;
  relay_url: string;
  device_id: string;
  device_name: string;
  device_token: string;
  created_at: string;
};

export function normalizeRelayUrl(value: string) {
  const url = new URL(value);
  if (!["https:", "http:"].includes(url.protocol)) throw new Error("invalid_relay_url");
  if (url.protocol === "http:" && !["127.0.0.1", "localhost", "::1"].includes(url.hostname)) throw new Error("relay_https_required");
  if (url.username || url.password || url.pathname !== "/") throw new Error("invalid_relay_url");
  url.pathname = "";
  url.search = "";
  url.hash = "";
  return url.toString().replace(/\/$/, "");
}

export function readRelayConfiguration() {
  if (!existsSync(relayConfigPath)) return null;
  try {
    const value = JSON.parse(readFileSync(relayConfigPath, "utf8")) as Partial<RelayConfiguration>;
    if (value.enabled !== true || !value.relay_url || !value.device_id || !value.device_name || !value.device_token || !value.created_at) return null;
    return { ...value, relay_url: normalizeRelayUrl(value.relay_url) } as RelayConfiguration;
  } catch {
    return null;
  }
}

export function writeRelayConfiguration(input: Omit<RelayConfiguration, "enabled" | "created_at">) {
  const configuration: RelayConfiguration = {
    enabled: true,
    relay_url: normalizeRelayUrl(input.relay_url),
    device_id: input.device_id,
    device_name: input.device_name.trim() || "Better Codex",
    device_token: input.device_token,
    created_at: new Date().toISOString(),
  };
  mkdirSync(dirname(relayConfigPath), { recursive: true });
  const temporary = `${relayConfigPath}.${randomUUID()}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(configuration, null, 2)}\n`, { mode: 0o600 });
  renameSync(temporary, relayConfigPath);
  return configuration;
}

export function removeRelayConfiguration() {
  rmSync(relayConfigPath, { force: true });
}
