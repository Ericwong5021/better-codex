import { randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { closeSync, existsSync, openSync, readFileSync, renameSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import { ensureDirectories, runtimeAuthorityPath, runtimeLockPath, runtimeStatePath } from "./config.js";
import { coreVersion } from "./compatibility.js";

export type RuntimeState = {
  pid: number;
  port: number;
  instanceId: string;
  version: string;
  startedAt: string;
  processStartedAt: string;
  generation: number;
  handoffUpdateId: string | null;
  handoffRecovery: boolean;
  handoffHostReplacement: boolean;
};

type RuntimeAuthority = {
  generation: number;
  status: "claimed" | "reserved";
  runtimeInstanceId: string;
  runtimePid: number;
  processStartedAt: string;
  updateId: string | null;
  targetVersion: string | null;
  recovery: boolean;
  hostReplacement: boolean;
  settledUpdateId?: string | null;
  settledOutcome?: "committed" | "rolled_back" | null;
  updatedAt: string;
};

export type RuntimeAuthorityUpdateState = "active" | "committed" | "rolled_back" | "superseded" | "missing";

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

function readAuthority() {
  try {
    const value = JSON.parse(readFileSync(runtimeAuthorityPath, "utf8")) as Partial<RuntimeAuthority>;
    if (!Number.isSafeInteger(value.generation) || value.generation! < 1 || !["claimed", "reserved"].includes(String(value.status))) return null;
    return value as RuntimeAuthority;
  } catch {
    return null;
  }
}

function writeAuthority(authority: RuntimeAuthority) {
  const temporary = `${runtimeAuthorityPath}.${process.pid}.tmp`;
  writeFileSync(temporary, JSON.stringify(authority), { mode: 0o600 });
  renameSync(temporary, runtimeAuthorityPath);
}

export function readRuntimeState() {
  const value = parse(runtimeStatePath);
  if (!value || !Number.isInteger(value.pid) || value.pid! < 1 || !Number.isInteger(value.port) || value.port! < 1 || value.port! > 65535 || typeof value.instanceId !== "string" || !value.instanceId) return null;
  if (!processAlive(value.pid!)) return null;
  return { ...value, generation: Number.isSafeInteger(value.generation) ? Number(value.generation) : 0, handoffUpdateId: typeof value.handoffUpdateId === "string" ? value.handoffUpdateId : null, handoffRecovery: value.handoffRecovery === true, handoffHostReplacement: value.handoffHostReplacement === true } as RuntimeState;
}

export function createRuntimeIdentity() {
  return {
    pid: process.pid,
    instanceId: randomUUID(),
    version: coreVersion,
    startedAt: new Date().toISOString(),
    processStartedAt: new Date(processStartTime(process.pid) ?? Date.now()).toISOString(),
    generation: 0,
    handoffUpdateId: null,
    handoffRecovery: false,
    handoffHostReplacement: false,
  };
}

export function claimRuntimeAuthority<T extends ReturnType<typeof createRuntimeIdentity>>(identity: T) {
  const lock = parse(runtimeLockPath);
  if (lock?.instanceId !== identity.instanceId || lock.pid !== process.pid) throw new Error("runtime_authority_lock_mismatch");
  const current = readAuthority();
  const reserved = current?.status === "reserved";
  const continuing = Boolean(current?.status === "claimed" && current.updateId && current.runtimePid !== process.pid && !processAlive(current.runtimePid));
  const generation = reserved ? current.generation : Math.max(current?.generation || 0, identity.generation) + 1;
  const handoffUpdateId = reserved || continuing ? current!.updateId : null;
  writeAuthority({
    generation,
    status: "claimed",
    runtimeInstanceId: identity.instanceId,
    runtimePid: process.pid,
    processStartedAt: identity.processStartedAt,
    updateId: handoffUpdateId,
    targetVersion: reserved || continuing ? current!.targetVersion : identity.version,
    recovery: (reserved || continuing) && current!.recovery === true,
    hostReplacement: (reserved || continuing) && current!.hostReplacement === true,
    updatedAt: new Date().toISOString(),
  });
  return { ...identity, generation, handoffUpdateId, handoffRecovery: (reserved || continuing) && current!.recovery === true, handoffHostReplacement: (reserved || continuing) && current!.hostReplacement === true };
}

export function reserveRuntimeAuthority(identity: Pick<RuntimeState, "instanceId" | "generation" | "processStartedAt">, updateId: string, targetVersion: string | null, hostReplacement = false) {
  const current = readAuthority();
  if (!current || current.status !== "claimed" || current.runtimeInstanceId !== identity.instanceId || current.runtimePid !== process.pid || current.generation !== identity.generation || current.processStartedAt !== identity.processStartedAt) throw new Error("runtime_authority_owner_mismatch");
  const generation = current.generation + 1;
  writeAuthority({ ...current, generation, status: "reserved", updateId, targetVersion, recovery: false, hostReplacement, updatedAt: new Date().toISOString() });
  return generation;
}

export function cancelRuntimeAuthorityReservation(identity: Pick<RuntimeState, "instanceId" | "generation" | "processStartedAt" | "version">, updateId: string) {
  const current = readAuthority();
  if (!current || current.status !== "reserved" || current.runtimeInstanceId !== identity.instanceId || current.runtimePid !== process.pid || current.processStartedAt !== identity.processStartedAt || current.updateId !== updateId) throw new Error("runtime_authority_reservation_mismatch");
  writeAuthority({ ...current, generation: identity.generation, status: "claimed", updateId: null, targetVersion: identity.version, recovery: false, hostReplacement: false, updatedAt: new Date().toISOString() });
}

export function runtimeAuthorityUpdateState(updateId: string, expectedGeneration?: number) {
  const current = readAuthority();
  if (!current) return { state: "missing" as RuntimeAuthorityUpdateState, generation: null, runtimeInstanceId: null };
  const generationMatches = expectedGeneration === undefined || current.generation === expectedGeneration;
  if (current.updateId === updateId && generationMatches) return { state: "active" as RuntimeAuthorityUpdateState, generation: current.generation, runtimeInstanceId: current.runtimeInstanceId };
  if (current.settledUpdateId === updateId && (expectedGeneration === undefined || current.generation >= expectedGeneration)) {
    return { state: current.settledOutcome === "rolled_back" ? "rolled_back" as RuntimeAuthorityUpdateState : "committed" as RuntimeAuthorityUpdateState, generation: current.generation, runtimeInstanceId: current.runtimeInstanceId };
  }
  return { state: "superseded" as RuntimeAuthorityUpdateState, generation: current.generation, runtimeInstanceId: current.runtimeInstanceId };
}

export function reserveRuntimeAuthorityRecovery(updateId: string, targetVersion: string | null, expectedGeneration?: number) {
  const current = readAuthority();
  if (current?.settledUpdateId === updateId && current.settledOutcome === "committed") throw new Error("runtime_authority_update_committed");
  if (!current || current.updateId !== updateId || expectedGeneration !== undefined && current.generation !== expectedGeneration) throw new Error("runtime_authority_recovery_mismatch");
  if (current.runtimePid !== process.pid && processAlive(current.runtimePid)) throw new Error("runtime_authority_owner_alive");
  const generation = current.generation + 1;
  writeAuthority({ ...current, generation, status: "reserved", updateId, targetVersion, recovery: true, hostReplacement: current.hostReplacement === true, updatedAt: new Date().toISOString() });
  return generation;
}

export function completeRuntimeAuthorityHandoff(identity: Pick<RuntimeState, "instanceId" | "generation" | "processStartedAt">, updateId: string, outcome: "committed" | "rolled_back" = "committed") {
  const current = readAuthority();
  const ownerMatches = current?.status === "claimed" && current.runtimeInstanceId === identity.instanceId && current.runtimePid === process.pid && current.generation === identity.generation && current.processStartedAt === identity.processStartedAt;
  if (!ownerMatches) throw new Error("runtime_authority_handoff_mismatch");
  if (current!.updateId === null && current!.settledUpdateId === updateId && current!.settledOutcome === outcome) return;
  if (current!.updateId !== updateId) throw new Error("runtime_authority_handoff_mismatch");
  writeAuthority({ ...current!, updateId: null, targetVersion: null, recovery: false, hostReplacement: false, settledUpdateId: updateId, settledOutcome: outcome, updatedAt: new Date().toISOString() });
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
