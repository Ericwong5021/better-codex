import { randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { closeSync, existsSync, openSync, readFileSync, renameSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import { ensureDirectories, runtimeLockPath, runtimeStatePath } from "./config.js";
import { coreVersion } from "./compatibility.js";

export type RuntimeState = {
  pid: number;
  port: number;
  instanceId: string;
  version: string;
  startedAt: string;
  processStartedAt: string;
};

function processAlive(pid: number) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function processStartTime(pid: number) {
  try {
    const value = process.platform === "win32"
      ? execFileSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", `$process = Get-CimInstance Win32_Process -Filter \"ProcessId = ${pid}\"; if ($process) { $process.CreationDate.ToUniversalTime().ToString('o') }`], { encoding: "utf8", windowsHide: true }).trim()
      : execFileSync("ps", ["-p", String(pid), "-o", "lstart="], { encoding: "utf8" }).trim();
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function parse(path: string) {
  try {
    return JSON.parse(readFileSync(path, "utf8")) as Partial<RuntimeState>;
  } catch {
    return null;
  }
}

export function readRuntimeState() {
  const value = parse(runtimeStatePath);
  if (!value || !Number.isInteger(value.pid) || value.pid! < 1 || !Number.isInteger(value.port) || value.port! < 1 || value.port! > 65535 || typeof value.instanceId !== "string" || !value.instanceId) return null;
  if (!processAlive(value.pid!)) return null;
  return value as RuntimeState;
}

export function createRuntimeIdentity() {
  return {
    pid: process.pid,
    instanceId: randomUUID(),
    version: coreVersion,
    startedAt: new Date().toISOString(),
    processStartedAt: new Date(processStartTime(process.pid) ?? Date.now()).toISOString(),
  };
}

export function acquireRuntimeLock(identity: Pick<RuntimeState, "instanceId" | "startedAt" | "processStartedAt">) {
  ensureDirectories();
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const descriptor = openSync(runtimeLockPath, "wx", 0o600);
      writeFileSync(descriptor, JSON.stringify({ pid: process.pid, instanceId: identity.instanceId, startedAt: identity.startedAt, processStartedAt: identity.processStartedAt }));
      closeSync(descriptor);
      return;
    } catch (error) {
      const current = parse(runtimeLockPath);
      if (current?.pid && processAlive(current.pid)) {
        const expectedStart = typeof current.processStartedAt === "string" ? Date.parse(current.processStartedAt) : NaN;
        const observedStart = processStartTime(current.pid);
        const reused = Number.isFinite(expectedStart) && observedStart !== null && Math.abs(expectedStart - observedStart) > 1500;
        let legacyStale = false;
        try { legacyStale = !current.processStartedAt && Date.now() - statSync(runtimeLockPath).mtimeMs > 30_000; } catch {}
        if (!reused && !legacyStale) throw new Error("runtime_already_running");
      }
      if (existsSync(runtimeLockPath)) unlinkSync(runtimeLockPath);
      if (attempt === 1) throw error;
    }
  }
}

export function publishRuntimeState(state: RuntimeState) {
  ensureDirectories();
  const temporary = `${runtimeStatePath}.${process.pid}.tmp`;
  writeFileSync(temporary, JSON.stringify(state), { mode: 0o600 });
  renameSync(temporary, runtimeStatePath);
}

export function clearRuntimeState(instanceId: string) {
  const state = parse(runtimeStatePath);
  if (state?.instanceId === instanceId && existsSync(runtimeStatePath)) unlinkSync(runtimeStatePath);
  const lock = parse(runtimeLockPath);
  if (lock?.instanceId === instanceId && existsSync(runtimeLockPath)) unlinkSync(runtimeLockPath);
}
