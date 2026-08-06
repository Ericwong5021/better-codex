import { randomUUID } from "node:crypto";
import { closeSync, existsSync, openSync, readFileSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
import { ensureDirectories, runtimeLockPath, runtimeStatePath } from "./config.js";
import { coreVersion } from "./compatibility.js";

export type RuntimeState = {
  pid: number;
  port: number;
  instanceId: string;
  version: string;
  startedAt: string;
};

function processAlive(pid: number) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
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
  };
}

export function acquireRuntimeLock(instanceId: string) {
  ensureDirectories();
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const descriptor = openSync(runtimeLockPath, "wx", 0o600);
      writeFileSync(descriptor, JSON.stringify({ pid: process.pid, instanceId }));
      closeSync(descriptor);
      return;
    } catch (error) {
      const current = parse(runtimeLockPath);
      if (current?.pid && processAlive(current.pid)) throw new Error("runtime_already_running");
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
