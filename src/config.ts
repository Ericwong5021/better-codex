import { randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";

export const tiloHome = resolve(process.env.TILO_HOME || join(homedir(), ".tilo"));
export const databasePath = resolve(process.env.TILO_DB || join(tiloHome, "tilo.db"));
export const runPath = join(tiloHome, "run");
export const logPath = join(tiloHome, "logs");
export const tokenPath = join(runPath, "token");
export const gatewayLogPath = join(logPath, "gateway.log");
export const injectorLogPath = join(logPath, "injector.log");
export const injectorPidPath = join(runPath, "injector.pid");
export const port = Number(process.env.TILO_PORT ?? 4317);
export const cdpPort = Number(process.env.TILO_CDP_PORT ?? 9229);

export function ensureDirectories() {
  mkdirSync(runPath, { recursive: true });
  mkdirSync(logPath, { recursive: true });
}

export function token() {
  ensureDirectories();
  if (process.env.TILO_TOKEN) return process.env.TILO_TOKEN;
  if (existsSync(tokenPath)) return readFileSync(tokenPath, "utf8").trim();
  const value = randomBytes(32).toString("hex");
  writeFileSync(tokenPath, value, { mode: 0o600 });
  return value;
}
