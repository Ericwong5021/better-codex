import { randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { isSea } from "node:sea";
import { join, resolve } from "node:path";
import { packagedBuild } from "./build.js";

export type BetterCodexProfile = "stable" | "development";

function configuredProfile(): BetterCodexProfile {
  const value = process.env.BETTER_CODEX_PROFILE || "stable";
  if (value === "stable" || value === "development") return value;
  throw new Error("invalid_better_codex_profile");
}

export const betterCodexProfile = configuredProfile();
const defaultHome = join(homedir(), betterCodexProfile === "development" ? ".better-codex-dev" : ".better-codex");
const defaultPeerHome = join(homedir(), betterCodexProfile === "development" ? ".better-codex" : ".better-codex-dev");
export const betterCodexHome = resolve(process.env.BETTER_CODEX_HOME || defaultHome);
export const peerBetterCodexHome = resolve(process.env.BETTER_CODEX_PEER_HOME || defaultPeerHome);
const configuredDatabasePath = process.env.BETTER_CODEX_DB;
export const databasePath = resolve(configuredDatabasePath || join(betterCodexHome, "better-codex.db"));
export const developmentDatabaseSnapshotSourcePath = betterCodexProfile === "development" && !configuredDatabasePath
  ? resolve(join(peerBetterCodexHome, "better-codex.db"))
  : null;
export const runPath = join(betterCodexHome, "run");
export const logPath = join(betterCodexHome, "logs");
export const attachmentPath = join(betterCodexHome, "attachments");
export const managedRuntimePath = join(betterCodexHome, "runtime");
export const compatibilityPath = join(managedRuntimePath, "compatibility");
export const compatibilityStatusPath = join(compatibilityPath, "status.json");
export const compatibilityVersionsPath = join(compatibilityPath, "versions");
export const compatibilityCurrentPath = join(compatibilityPath, "current.json");
export const runtimeVersionsPath = join(managedRuntimePath, "versions");
export const runtimeCurrentPath = join(managedRuntimePath, "current.json");
export const updateStatePath = join(managedRuntimePath, "update.json");
export const updateChannelPath = join(managedRuntimePath, "channel.json");
export const updateRollbackPath = join(managedRuntimePath, "rollback.json");
export const updateActivationPath = join(managedRuntimePath, "update-activation.json");
export const updatePublicKeyPath = join(betterCodexHome, "update-public-key.pem");
export const tokenPath = join(runPath, "token");
export const runtimeStatePath = join(runPath, "runtime.json");
export const runtimeLockPath = join(runPath, "runtime.lock");
export const runtimeLogPath = join(logPath, "runtime.log");
export const injectorLogPath = join(logPath, "injector.log");
export const updateLogPath = join(logPath, "update.log");
export const workerLogPath = join(logPath, "worker.log");
export const runLogPath = join(logPath, "runs");
export const schedulerRuntimePath = join(betterCodexHome, "scheduler-runtime");
export const schedulerSchemaPath = join(schedulerRuntimePath, "output-schema.json");
export const injectorPidPath = join(runPath, "injector.pid");
export const injectionStatePath = join(runPath, "injection.json");
export const mockupSessionPath = join(runPath, "mockup-session.json");
export const mockupStatePath = join(betterCodexHome, "mockup.json");
export const launchIntegrationStatePath = join(runPath, "launch-integration.json");
export const launchLockPath = join(homedir(), ".better-codex-launch.lock");
export const launchIntentPath = join(homedir(), ".better-codex-launch-intents");
export const runtimePort = Number(process.env.BETTER_CODEX_RUNTIME_PORT ?? process.env.BETTER_CODEX_PORT ?? 0);
export const cdpPort = Number(process.env.BETTER_CODEX_CDP_PORT ?? 9229);
export const debugLoggingEnabled = !isSea() && !packagedBuild;

export function ensureDirectories() {
  mkdirSync(runPath, { recursive: true });
  mkdirSync(logPath, { recursive: true });
  mkdirSync(attachmentPath, { recursive: true, mode: 0o700 });
  mkdirSync(runLogPath, { recursive: true });
  mkdirSync(schedulerRuntimePath, { recursive: true });
  mkdirSync(compatibilityPath, { recursive: true });
  mkdirSync(compatibilityVersionsPath, { recursive: true });
  mkdirSync(runtimeVersionsPath, { recursive: true });
}

export function token() {
  ensureDirectories();
  if (process.env.BETTER_CODEX_TOKEN) return process.env.BETTER_CODEX_TOKEN;
  if (existsSync(tokenPath)) return readFileSync(tokenPath, "utf8").trim();
  const value = randomBytes(32).toString("hex");
  writeFileSync(tokenPath, value, { mode: 0o600 });
  return value;
}
