import { randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";

const defaultHome = join(homedir(), ".better-codex");
const legacyHome = join(homedir(), ".tilo");
export const betterCodexHome = resolve(process.env.BETTER_CODEX_HOME || (existsSync(defaultHome) || !existsSync(legacyHome) ? defaultHome : legacyHome));
export const databasePath = resolve(process.env.BETTER_CODEX_DB || join(betterCodexHome, "better-codex.db"));
export const runPath = join(betterCodexHome, "run");
export const logPath = join(betterCodexHome, "logs");
export const tokenPath = join(runPath, "token");
export const gatewayLogPath = join(logPath, "gateway.log");
export const injectorLogPath = join(logPath, "injector.log");
export const injectorPidPath = join(runPath, "injector.pid");
export const port = Number(process.env.BETTER_CODEX_PORT ?? 4317);
export const cdpPort = Number(process.env.BETTER_CODEX_CDP_PORT ?? 9229);

export function ensureDirectories() {
  mkdirSync(runPath, { recursive: true });
  mkdirSync(logPath, { recursive: true });
}

export function token() {
  ensureDirectories();
  if (process.env.BETTER_CODEX_TOKEN) return process.env.BETTER_CODEX_TOKEN;
  if (existsSync(tokenPath)) return readFileSync(tokenPath, "utf8").trim();
  const value = randomBytes(32).toString("hex");
  writeFileSync(tokenPath, value, { mode: 0o600 });
  return value;
}
