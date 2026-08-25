#!/usr/bin/env node
import { execFileSync, spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { accessSync, closeSync, constants, cpSync, existsSync, mkdirSync, openSync, readFileSync, readdirSync, renameSync, rmSync, statSync, unlinkSync, utimesSync, writeFileSync } from "node:fs";
import { isSea } from "node:sea";
import { homedir, hostname } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { createInterface } from "node:readline/promises";
import { cdpEject, cdpInject, cdpOpenThread, cdpRefreshAndInject, cdpRestartAndInject, cdpStatus, codexInstallationStatus, codexProcessRunning, chooseCodexRestartAction, launchCodex, requiresCodexRestartForLaunch, watchInjection } from "./cdp.js";
import { removeManagedAgentProfiles } from "./agent-profiles.js";
import { coreVersion } from "./compatibility.js";
import {
  cdpPort,
  databasePath,
  ensureDirectories,
  injectorLogPath,
  injectorPidPath,
  betterCodexHome,
  betterCodexProfile,
  launchIntentPath,
  launchLockPath,
  logPath,
  managedRuntimePath,
  peerBetterCodexHome,
  runPath,
  runtimeLogPath,
  updatePublicKeyPath,
  token,
  canonicalPath,
  packagedLibexecSkillsPath,
  relayConfigPath,
  sourceProcessArguments,
  syncConfigPath,
} from "./config.js";
import { readRuntimeState, reserveRuntimeAuthorityRecovery } from "./runtime-state.js";
import { injectionEnabled, setInjectionEnabled } from "./injection-state.js";
import { installLaunchIntegration, launchIntegrationStatus, uninstallLaunchIntegration } from "./launch-integration.js";
import { readCodexLocale } from "./locale.js";
import { betterCodexMcpName, startMcpAppServer } from "./mcp-app.js";
import { packagedBuild } from "./build.js";
import { bundledBetterCodexSkill } from "./bundled-skill.js";
import { installService, repairServiceConfiguration, restartService, serviceLogs, serviceStatus, startService, stopService, uninstallService } from "./service.js";
import { activeVersions, checkForUpdates, maybeDelegateToActiveCore, recordGatewayUpdateActivation, rollbackActivatedUpdate, rollbackAllUpdates, selectedUpdateChannel, setUpdateChannel, updateAll, updateCompatibility, type UpdateChannel } from "./updater.js";
import { requireCodexExecutablePath } from "./codex-cli.js";
import { normalizeHubUrl, readSyncConfiguration, removeSyncConfiguration, writeSyncConfiguration } from "./sync-config.js";
import { normalizeRelayUrl, readRelayConfiguration, removeRelayConfiguration, writeRelayConfiguration } from "./relay-config.js";
import { startSessionHost } from "./session-host.js";
import { sessionHostStatus, stopSessionHostProcess } from "./session-host-client.js";

function accessToken() {
  return token();
}

const legacyRuntimePort = 4317;
const updateRuntimeStopTimeout = 60_000;

async function stopLegacyRuntime() {
  const current = readRuntimeState();
  if (current?.port === legacyRuntimePort) return false;
  try {
    const healthResponse = await fetch(`http://127.0.0.1:${legacyRuntimePort}/health`, { signal: AbortSignal.timeout(500) });
    if (!healthResponse.ok) return false;
    const healthValue = await healthResponse.json() as { name?: string; version?: string };
    if (!healthValue.version || healthValue.version === coreVersion || (healthValue.name && healthValue.name !== "Better Codex Runtime")) return false;
    const shutdownResponse = await fetch(`http://127.0.0.1:${legacyRuntimePort}/api/shutdown`, {
      method: "POST",
      signal: AbortSignal.timeout(1000),
      headers: { authorization: `Bearer ${accessToken()}` },
    });
    return shutdownResponse.ok;
  } catch {
    return false;
  }
}

function commandArguments() {
  const values = process.argv.slice(2);
  const launcher = process.env.BETTER_CODEX_LAUNCHER_PATH;
  if (launcher && values[0] && canonicalPath(values[0]) === canonicalPath(launcher)) values.shift();
  return values;
}

function option(args: string[], name: string) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

function secretOption(args: string[], name: string, fileName: string) {
  const value = option(args, name);
  if (value) return value;
  const file = option(args, fileName);
  return file ? readFileSync(resolve(file), "utf8").trim() : undefined;
}

function positionals(args: string[]) {
  const values: string[] = [];
  for (let index = 0; index < args.length; index += 1) {
    if (args[index].startsWith("--")) {
      if (!["--launch", "--json"].includes(args[index])) index += 1;
      continue;
    }
    values.push(args[index]);
  }
  return values;
}

async function request(path: string, options: RequestInit = {}) {
  const runtime = readRuntimeState();
  if (!runtime) throw new Error("runtime_unavailable");
  const response = await fetch(`http://127.0.0.1:${runtime.port}${path}`, {
    ...options,
    headers: {
      authorization: `Bearer ${accessToken()}`,
      "content-type": "application/json",
      ...(options.headers ?? {}),
    },
  });
  const value = await response.json() as Record<string, unknown>;
  if (!response.ok) throw new Error(String(value.error ?? response.statusText));
  return value;
}

async function installRuntimeUpdate(targetVersion: string | undefined, channel: UpdateChannel) {
  if (targetVersion && !/^\d+\.\d+\.\d+(?:-[A-Za-z0-9]+(?:[.-][A-Za-z0-9]+)*)?$/.test(targetVersion)) throw new Error("update_target_version_invalid");
  setUpdateChannel(channel);
  const idempotencyKey = `cli-${randomUUID()}`;
  const accepted = await request("/api/update/install", {
    method: "POST",
    body: JSON.stringify({ idempotency_key: idempotencyKey, ...(targetVersion ? { target_version: targetVersion } : {}) }),
    signal: AbortSignal.timeout(30_000),
  });
  const updateId = String(accepted.update_id || "");
  if (!updateId) throw new Error("update_operation_missing");
  const deadline = Date.now() + 10 * 60 * 1000;
  let lastError = "update_install_timeout";
  while (Date.now() < deadline) {
    try {
      const state = await request(`/api/update?update_id=${encodeURIComponent(updateId)}`, { signal: AbortSignal.timeout(15_000) });
      const operation = state.operation as { id?: string; status?: string; error_code?: string | null } | null;
      if (!operation || operation.id !== updateId) throw new Error("update_operation_missing");
      if (operation.status === "FAILED" || operation.status === "ROLLED_BACK") throw new Error(`update_terminal:${operation.error_code || operation.status.toLowerCase()}`);
      if (operation.status === "COMPLETED") {
        const currentVersion = String(state.currentVersion || "");
        if (targetVersion && currentVersion !== targetVersion) throw new Error(`update_target_version_mismatch:${targetVersion}:${currentVersion || "unknown"}`);
        return { updated: true, update_id: updateId, currentVersion, operation };
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "update_install_failed";
      if (message.startsWith("update_target_version_mismatch:") || message === "update_operation_missing" || message.startsWith("update_terminal:")) throw error;
      lastError = message;
    }
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  throw new Error(`update_install_timeout:${lastError}`);
}

async function health() {
  const runtime = readRuntimeState();
  if (!runtime) throw new Error("runtime_unavailable");
  const response = await fetch(`http://127.0.0.1:${runtime.port}/health`);
  if (!response.ok) throw new Error("runtime_unavailable");
  const value = await response.json() as Record<string, unknown>;
  if (value.instanceId !== runtime.instanceId || value.pid !== runtime.pid) throw new Error("runtime_identity_mismatch");
  return value;
}

async function readiness() {
  const runtime = readRuntimeState();
  if (!runtime) throw new Error("runtime_unavailable");
  const response = await fetch(`http://127.0.0.1:${runtime.port}/readyz`);
  const value = await response.json() as Record<string, unknown>;
  if (value.instanceId !== runtime.instanceId || value.pid !== runtime.pid) throw new Error("runtime_identity_mismatch");
  if (!response.ok || value.ok !== true) {
    throw new Error(`runtime_not_ready:${JSON.stringify({ status: response.status, database: value.database ?? null, storage: value.storage ?? null, compatibility: value.compatibility ?? null, session_host: value.session_host ?? null })}`);
  }
  return value;
}

async function waitForRuntimeReady(timeoutMs = 60_000) {
  const deadline = Date.now() + timeoutMs;
  let lastError: unknown = new Error("runtime_not_ready");
  while (Date.now() < deadline) {
    try {
      return await readiness();
    } catch (error) {
      lastError = error;
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }
  throw lastError;
}

function spawnSelf(args: string[], logFile: string, detached = true) {
  const ownArgs = isSea() ? args : sourceProcessArguments(args);
  if (!ownArgs) throw new Error("self_requires_file_entrypoint");
  ensureDirectories();
  const descriptor = openSync(logFile, "a");
  const child = spawn(process.execPath, ownArgs, {
    cwd: process.cwd(),
    detached,
    env: { ...process.env, BETTER_CODEX_TOKEN: accessToken() },
    stdio: ["ignore", descriptor, descriptor],
    windowsHide: true,
  });
  if (detached) child.unref();
  closeSync(descriptor);
  return child;
}

async function ensureRuntime(timeoutMs = 12_000) {
  await stopLegacyRuntime();
  try {
    return await health();
  } catch {
    if (betterCodexProfile === "stable" && serviceStatus().installed) startService();
    else spawnSelf(["runtime"], runtimeLogPath);
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      try {
        return await health();
      } catch {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }
    throw new Error("runtime_start_failed");
  }
}

async function openWebApp() {
  await ensureRuntime();
  const port = activeRuntimePort();
  const url = `http://127.0.0.1:${port}/web#token=${encodeURIComponent(accessToken())}`;
  const invocation = process.platform === "win32"
    ? { command: "rundll32.exe", args: ["url.dll,FileProtocolHandler", url] }
    : { command: "open", args: [url] };
  const child = spawn(invocation.command, invocation.args, {
    detached: true,
    stdio: "ignore",
    windowsHide: true,
  });
  child.unref();
  return { opened: true, url: `http://127.0.0.1:${port}/web` };
}

async function restartRuntime() {
  setInjectionEnabled(false);
  await stopInjector();
  try { await request("/api/shutdown", { method: "POST" }); } catch {}
  let stopped = false;
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      await health();
    } catch {
      stopped = true;
      break;
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  if (!stopped) throw new Error("runtime_restart_timeout");
  return ensureRuntime();
}

function activeRuntimePort() {
  const runtime = readRuntimeState();
  if (!runtime) throw new Error("runtime_unavailable");
  return runtime.port;
}

function injectionOwnership(profile = betterCodexProfile, stateRunPath = runPath, allowLegacyProfileless = false) {
  const runtime = readJsonFile<{ port?: unknown }>(join(stateRunPath, "runtime.json"));
  const injection = readJsonFile<{ endpoint?: unknown }>(join(stateRunPath, "injection.json"));
  const runtimePort = Number(runtime?.port);
  const recordedEndpoint = typeof injection?.endpoint === "string" ? injection.endpoint : "";
  const expectedEndpoint = Number.isInteger(runtimePort) && runtimePort > 0 ? `http://127.0.0.1:${runtimePort}` : recordedEndpoint;
  return { profile, ...(expectedEndpoint ? { endpoint: expectedEndpoint } : {}), ...(allowLegacyProfileless ? { allowLegacyProfileless: true } : {}) };
}

function processAlive(pid: number) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function processCommandLine(pid: number) {
  try {
    if (process.platform === "win32") {
      return execFileSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", `(Get-CimInstance Win32_Process -Filter \"ProcessId = ${pid}\").CommandLine`], { encoding: "utf8", windowsHide: true }).trim();
    }
    return execFileSync("ps", ["-p", String(pid), "-o", "command="], { encoding: "utf8" }).trim();
  } catch {
    return "";
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

function isInjectorProcess(pid: number) {
  return /\bwatch-inject\b/.test(processCommandLine(pid));
}

function injectorPid() {
  if (!existsSync(injectorPidPath)) return null;
  const pid = Number(readFileSync(injectorPidPath, "utf8"));
  return Number.isInteger(pid) && processAlive(pid) && isInjectorProcess(pid) ? pid : null;
}

const injectorStartLockPath = `${injectorPidPath}.start`;

function tryStartInjector(portNumber: number) {
  const existing = injectorPid();
  if (existing) return existing;
  let lock: number;
  try {
    lock = openSync(injectorStartLockPath, "wx", 0o600);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "EEXIST") return null;
    throw error;
  }
  try {
    writeFileSync(lock, String(process.pid));
    const current = injectorPid();
    if (current) return current;
    const pid = spawnSelf(["watch-inject", String(portNumber)], injectorLogPath).pid;
    if (!pid) throw new Error("injector_start_failed");
    writeFileSync(injectorPidPath, String(pid));
    return pid;
  } finally {
    closeSync(lock);
    try { unlinkSync(injectorStartLockPath); } catch {}
  }
}

async function ensureInjector(portNumber: number) {
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    const pid = injectorPid();
    if (pid) return pid;
    const started = tryStartInjector(portNumber);
    if (started) {
      await new Promise(resolve => setTimeout(resolve, 100));
      const running = injectorPid();
      if (running) return running;
    } else {
      try {
        if (Date.now() - statSync(injectorStartLockPath).mtimeMs > 5000) unlinkSync(injectorStartLockPath);
      } catch {}
    }
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  throw new Error("injector_start_failed");
}

async function runRuntime() {
  await stopLegacyRuntime();
  const server = (await import("./server.js")).startServer();
  await stopInjector();
  let stopping = false;
  let reconciling = false;
  const reconcileWatcher = async () => {
    if (stopping || reconciling) return;
    reconciling = true;
    try {
      if (injectionEnabled()) await ensureInjector(cdpPort);
      else await stopInjector();
    } catch (error) {
      console.error(error instanceof Error ? error.message : "injector_reconcile_failed");
    } finally {
      reconciling = false;
    }
  };
  void reconcileWatcher();
  const watcherTimer = setInterval(() => void reconcileWatcher(), 1000);
  watcherTimer.unref();
  process.once("exit", () => {
    stopping = true;
    clearInterval(watcherTimer);
    const pid = injectorPid();
    if (pid) try { process.kill(pid, "SIGTERM"); } catch {}
  });
  return server;
}

async function stopFailedUpdateRuntime(updateId: string) {
  stopService();
  const current = readRuntimeState();
  if (!current) return;
  if (current.handoffUpdateId !== updateId) throw new Error("update_rollback_runtime_identity_mismatch");
  try {
    await request("/api/shutdown", { method: "POST" });
  } catch (error) {
    console.error(`BETTER_CODEX_DIAGNOSTIC ${JSON.stringify({ timestamp: new Date().toISOString(), scope: "update", event: "failed_runtime_shutdown_request_failed", update_id: updateId, runtime_instance_id: current.instanceId, runtime_pid: current.pid, error: error instanceof Error ? error.message : String(error) })}`);
  }
  const deadline = Date.now() + 10_000;
  while (processAlive(current.pid) && Date.now() < deadline) await new Promise(resolve => setTimeout(resolve, 100));
  if (processAlive(current.pid)) {
    const observed = readRuntimeState();
    if (!observed || observed.pid !== current.pid || observed.instanceId !== current.instanceId || observed.processStartedAt !== current.processStartedAt) throw new Error("update_rollback_runtime_identity_changed");
    process.kill(current.pid, "SIGTERM");
  }
  const killedDeadline = Date.now() + 10_000;
  while (processAlive(current.pid) && Date.now() < killedDeadline) await new Promise(resolve => setTimeout(resolve, 100));
  if (processAlive(current.pid)) throw new Error("update_rollback_runtime_stop_timeout");
}

async function applyUpdate(previousRuntimePid: number, updates: { core: string | null; compatibility: string | null }, updateId: string, sourceCoreVersion: string, targetGeneration: number, drainPath?: string) {
  try {
    recordGatewayUpdateActivation("activating", null, updates, process.pid, updateId, targetGeneration);
    const stopDeadline = Date.now() + updateRuntimeStopTimeout;
    while (processAlive(previousRuntimePid) && (!drainPath || !existsSync(drainPath))) {
      if (Date.now() >= stopDeadline) throw new Error("update_runtime_stop_timeout");
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    if (drainPath && existsSync(drainPath)) unlinkSync(drainPath);
    setInjectionEnabled(false);
    const mcp = installMcp();
    installService();
    await ensureRuntime(120_000);
    let injection: unknown = { refreshed: false, pending: true, reason: "codex_not_connected" };
    try {
      injection = { refreshed: true, targets: await cdpRefreshAndInject(cdpPort, activeRuntimePort(), accessToken()) };
    } catch (error) {
      injection = { refreshed: false, pending: true, error: error instanceof Error ? error.message : "injection_refresh_pending" };
    }
    const launchIntegration = installLaunchIntegration();
    const runtime = await health();
    if (updates.core && runtime.version !== updates.core) throw new Error("core_activation_version_mismatch");
    if (updates.compatibility && activeVersions().compatibility !== updates.compatibility) throw new Error("compatibility_activation_version_mismatch");
    recordGatewayUpdateActivation("success", null, updates, null, updateId);
    return { updated: true, runtime, injection, launchIntegration, mcp };
  } catch (error) {
    const activationError = error instanceof Error ? error.message : "update_activation_failed";
    try {
      await stopFailedUpdateRuntime(updateId);
      const rollback = rollbackActivatedUpdate(updates);
      if ("reason" in rollback && rollback.reason === "update_superseded") throw new Error("update_superseded");
      reserveRuntimeAuthorityRecovery(updateId, sourceCoreVersion);
      installService();
      await ensureRuntime(120_000);
    } catch (rollbackError) {
      const rollbackCode = rollbackError instanceof Error ? rollbackError.message : "update_rollback_failed";
      recordGatewayUpdateActivation("error", `${activationError}:${rollbackCode}`, updates, null, updateId);
      throw new AggregateError([error, rollbackError], "update_activation_and_rollback_failed");
    }
    recordGatewayUpdateActivation("error", activationError, updates, null, updateId);
    throw error;
  } finally {
    setInjectionEnabled(true);
  }
}

async function withLaunchLock<T>(operation: () => Promise<T>) {
  ensureDirectories();
  const token = randomUUID();
  let acquired = false;
  for (let attempt = 0; attempt < 600; attempt += 1) {
    let created = false;
    try {
      mkdirSync(launchLockPath, { mode: 0o700 });
      created = true;
      writeFileSync(join(launchLockPath, "owner.json"), JSON.stringify({ pid: process.pid, token, processStartedAt: new Date(processStartTime(process.pid) ?? Date.now()).toISOString() }), { mode: 0o600 });
      acquired = true;
      break;
    } catch (error) {
      if (created) {
        rmSync(launchLockPath, { recursive: true, force: true });
        throw error;
      }
      let owner: { pid?: number; processStartedAt?: string } | null = null;
      try { owner = JSON.parse(readFileSync(join(launchLockPath, "owner.json"), "utf8")) as { pid?: number; processStartedAt?: string }; } catch {}
      let leaseExpired = false;
      try { leaseExpired = Date.now() - statSync(launchLockPath).mtimeMs > 15_000; } catch {}
      const expectedStart = owner?.processStartedAt ? Date.parse(owner.processStartedAt) : NaN;
      const observedStart = owner?.pid && processAlive(owner.pid) ? processStartTime(owner.pid) : null;
      const identityMismatch = Number.isFinite(expectedStart) && observedStart !== null && Math.abs(expectedStart - observedStart) > 1500;
      const stale = Boolean(owner?.pid && (!processAlive(owner.pid) || identityMismatch)) || Boolean(leaseExpired && (!owner?.pid || !owner.processStartedAt));
      if (stale) {
        const stalePath = `${launchLockPath}.stale.${token}`;
        try {
          renameSync(launchLockPath, stalePath);
          rmSync(stalePath, { recursive: true, force: true });
          continue;
        } catch {}
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  if (!acquired) throw new Error("codex_launch_busy");
  const heartbeat = setInterval(() => {
    try { utimesSync(launchLockPath, new Date(), new Date()); } catch {}
  }, 1000);
  heartbeat.unref();
  try {
    return await operation();
  } finally {
    clearInterval(heartbeat);
    try {
      const owner = JSON.parse(readFileSync(join(launchLockPath, "owner.json"), "utf8")) as { token?: string };
      if (owner.token === token) {
        const releasedPath = `${launchLockPath}.released.${token}`;
        renameSync(launchLockPath, releasedPath);
        rmSync(releasedPath, { recursive: true, force: true });
      }
    } catch {}
  }
}

async function stopInjector() {
  const pid = injectorPid();
  if (pid) {
    try { process.kill(pid, "SIGTERM"); } catch (error) { if (processAlive(pid)) throw error; }
    for (let attempt = 0; attempt < 90 && processAlive(pid); attempt += 1) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    if (processAlive(pid) && isInjectorProcess(pid)) {
      try { process.kill(pid, "SIGKILL"); } catch (error) { if (processAlive(pid)) throw error; }
      for (let attempt = 0; attempt < 10 && processAlive(pid); attempt += 1) await new Promise(resolve => setTimeout(resolve, 100));
    }
    if (processAlive(pid)) throw new Error("injector_stop_failed");
  }
  if (existsSync(injectorPidPath)) {
    const recorded = Number(readFileSync(injectorPidPath, "utf8"));
    if (!Number.isInteger(recorded) || recorded === pid || !processAlive(recorded) || !isInjectorProcess(recorded)) unlinkSync(injectorPidPath);
  }
}

async function nextLaunchIntentSequence() {
  mkdirSync(launchIntentPath, { recursive: true, mode: 0o700 });
  const lockPath = join(launchIntentPath, "sequence.lock");
  const counterPath = join(launchIntentPath, "sequence");
  const ownerToken = randomUUID();
  for (let attempt = 0; attempt < 500; attempt += 1) {
    try {
      mkdirSync(lockPath, { mode: 0o700 });
      writeFileSync(join(lockPath, "owner.json"), JSON.stringify({ pid: process.pid, token: ownerToken, processStartedAt: new Date(processStartTime(process.pid) ?? Date.now()).toISOString() }), { mode: 0o600 });
      try {
        const current = Number(existsSync(counterPath) ? readFileSync(counterPath, "utf8") : "0");
        const sequence = Number.isSafeInteger(current) && current >= 0 ? current + 1 : 1;
        const temporary = `${counterPath}.${process.pid}.tmp`;
        writeFileSync(temporary, String(sequence), { mode: 0o600 });
        renameSync(temporary, counterPath);
        return sequence;
      } finally {
        const owner = readJsonFile<{ token?: string }>(join(lockPath, "owner.json"));
        if (owner?.token === ownerToken) rmSync(lockPath, { recursive: true, force: true });
      }
    } catch {
      const owner = readJsonFile<{ pid?: number; processStartedAt?: string }>(join(lockPath, "owner.json"));
      try {
        const expectedStart = owner?.processStartedAt ? Date.parse(owner.processStartedAt) : NaN;
        const observedStart = owner?.pid && processAlive(owner.pid) ? processStartTime(owner.pid) : null;
        const identityMismatch = Number.isFinite(expectedStart) && observedStart !== null && Math.abs(expectedStart - observedStart) > 1500;
        const ownerGone = Boolean(owner?.pid && (!processAlive(owner.pid) || identityMismatch));
        const ownerMissingAndStale = !owner?.pid && Date.now() - statSync(lockPath).mtimeMs > 5000;
        if (ownerGone || ownerMissingAndStale) {
          const stalePath = `${lockPath}.stale.${ownerToken}`;
          renameSync(lockPath, stalePath);
          rmSync(stalePath, { recursive: true, force: true });
        }
      } catch {}
      await new Promise(resolve => setTimeout(resolve, 10));
    }
  }
  throw new Error("launch_intent_busy");
}

async function recordLaunchIntent(restart: boolean) {
  const intent = { token: randomUUID(), sequence: await nextLaunchIntentSequence(), profile: betterCodexProfile, restart, requestedAt: new Date().toISOString() };
  writeFileSync(join(launchIntentPath, `${intent.token}.json`), JSON.stringify(intent), { mode: 0o600 });
  return intent;
}

function latestLaunchIntent() {
  const processed = Number(existsSync(join(launchIntentPath, "processed")) ? readFileSync(join(launchIntentPath, "processed"), "utf8") : "0");
  const intents = existsSync(launchIntentPath)
    ? readdirSync(launchIntentPath).filter(name => name.endsWith(".json")).map(name => readJsonFile<{ token?: string; sequence?: number; profile?: string; restart?: boolean }>(join(launchIntentPath, name))).filter(value => value?.token && Number.isSafeInteger(value.sequence))
    : [];
  return intents.filter(intent => intent!.sequence! > processed).sort((left, right) => right!.sequence! - left!.sequence!)[0] ?? null;
}

function markLaunchIntentProcessed(sequence: number) {
  const path = join(launchIntentPath, "processed");
  const temporary = `${path}.${process.pid}.tmp`;
  writeFileSync(temporary, String(sequence), { mode: 0o600 });
  renameSync(temporary, path);
  for (const name of readdirSync(launchIntentPath)) {
    if (!name.endsWith(".json")) continue;
    const intent = readJsonFile<{ sequence?: number }>(join(launchIntentPath, name));
    if (Number.isSafeInteger(intent?.sequence) && intent!.sequence! <= sequence) try { unlinkSync(join(launchIntentPath, name)); } catch {}
  }
}

type PeerRuntimeState = {
  pid: number;
  port: number;
  instanceId: string;
  startedAt?: string;
  processStartedAt?: string;
};

function readJsonFile<T>(path: string): T | null {
  try {
    return JSON.parse(readFileSync(path, "utf8")) as T;
  } catch {
    return null;
  }
}

function peerInjectorPid(peerRunPath: string) {
  const path = join(peerRunPath, "injector.pid");
  const pid = Number(existsSync(path) ? readFileSync(path, "utf8") : "");
  return Number.isInteger(pid) && processAlive(pid) && isInjectorProcess(pid) ? pid : null;
}

function peerRuntimeState(peerRunPath: string) {
  const value = readJsonFile<Partial<PeerRuntimeState>>(join(peerRunPath, "runtime.json"));
  if (!value || !Number.isInteger(value.pid) || !Number.isInteger(value.port) || typeof value.instanceId !== "string") return null;
  if (!processAlive(value.pid!)) return null;
  if (typeof value.processStartedAt === "string" || typeof value.startedAt === "string") {
    const expectedStart = Date.parse(value.processStartedAt ?? value.startedAt!);
    const observedStart = processStartTime(value.pid!);
    const tolerance = value.processStartedAt ? 1500 : 30_000;
    if (Number.isFinite(expectedStart) && observedStart !== null && Math.abs(expectedStart - observedStart) > tolerance) return null;
  }
  return value as PeerRuntimeState;
}

async function disablePeerInjection(peerRunPath: string) {
  mkdirSync(peerRunPath, { recursive: true });
  const path = join(peerRunPath, "injection.json");
  const temporary = `${path}.${process.pid}.tmp`;
  const current = readJsonFile<Record<string, unknown>>(path) ?? {};
  writeFileSync(temporary, JSON.stringify({ ...current, enabled: false }), { mode: 0o600 });
  try {
    renameSync(temporary, path);
  } catch {
    try { unlinkSync(temporary); } catch {}
    writeFileSync(path, JSON.stringify({ ...current, enabled: false }), { mode: 0o600 });
  }
}

async function stopPeerInjector(peerRunPath: string) {
  const path = join(peerRunPath, "injector.pid");
  const pid = peerInjectorPid(peerRunPath);
  if (pid) {
    try { process.kill(pid, "SIGTERM"); } catch (error) { if (processAlive(pid)) throw error; }
    for (let attempt = 0; attempt < 90 && processAlive(pid); attempt += 1) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    if (processAlive(pid) && isInjectorProcess(pid)) {
      try { process.kill(pid, "SIGKILL"); } catch (error) { if (processAlive(pid)) throw error; }
      for (let attempt = 0; attempt < 10 && processAlive(pid); attempt += 1) await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  if (existsSync(path)) {
    const recorded = Number(readFileSync(path, "utf8"));
    if (!Number.isInteger(recorded) || !processAlive(recorded)) unlinkSync(path);
  }
  return Boolean(pid && !processAlive(pid));
}

async function stopPeerRuntime(peerHome: string, runtime: PeerRuntimeState | null) {
  if (!runtime) return false;
  if (!processAlive(runtime.pid)) return true;
  const matchesRuntime = async () => {
    try {
      const response = await fetch(`http://127.0.0.1:${runtime.port}/health`, { signal: AbortSignal.timeout(750) });
      const value = await response.json() as { pid?: number; instanceId?: string };
      return response.ok && value.pid === runtime.pid && value.instanceId === runtime.instanceId;
    } catch {
      return false;
    }
  };
  const verified = await matchesRuntime();
  if (!processAlive(runtime.pid)) return true;
  if (!verified) return false;
  try {
    const peerToken = readFileSync(join(peerHome, "run", "token"), "utf8").trim();
    await fetch(`http://127.0.0.1:${runtime.port}/api/shutdown`, {
      method: "POST",
      signal: AbortSignal.timeout(1500),
      headers: { authorization: `Bearer ${peerToken}` },
    });
  } catch {}
  for (let attempt = 0; attempt < 30 && processAlive(runtime.pid); attempt += 1) {
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  if (processAlive(runtime.pid)) {
    if (await matchesRuntime()) {
      try { process.kill(runtime.pid, "SIGTERM"); } catch {}
      for (let attempt = 0; attempt < 10 && processAlive(runtime.pid); attempt += 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
  }
  return !processAlive(runtime.pid);
}

function stopPeerMacService(peerHome: string) {
  if (process.platform !== "darwin") return false;
  const uid = process.getuid?.();
  if (uid === undefined) return false;
  const path = join(homedir(), "Library", "LaunchAgents", "com.better-codex.runtime.plist");
  if (!existsSync(path)) return false;
  const expectedHome = peerHome.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;");
  try {
    const plist = readFileSync(path, "utf8");
    if (!plist.includes(`<key>BETTER_CODEX_HOME</key><string>${expectedHome}</string>`)) return false;
  } catch {
    return false;
  }
  const domain = `gui/${uid}`;
  try {
    execFileSync("/bin/launchctl", ["bootout", domain, path], { stdio: "ignore" });
    return true;
  } catch {
    try {
      execFileSync("/bin/launchctl", ["print", `${domain}/com.better-codex.runtime`], { stdio: "ignore" });
    } catch {
      return true;
    }
    throw new Error("peer_service_stop_failed");
  }
}

async function deactivatePeerInstance() {
  const peerHome = resolve(peerBetterCodexHome);
  if (peerHome === resolve(betterCodexHome)) return null;
  const peerRunPath = join(peerHome, "run");
  const peerProfile = betterCodexProfile === "development" ? "stable" : "development";
  const peerOwnership = injectionOwnership(peerProfile, peerRunPath, true);
  const runtime = peerRuntimeState(peerRunPath);
  const injector = peerInjectorPid(peerRunPath);
  const serviceStopped = stopPeerMacService(peerHome);
  const peerInjectionState = readJsonFile<{ enabled?: boolean }>(join(peerRunPath, "injection.json"));
  const peerEnabled = peerInjectionState?.enabled !== false && peerInjectionState !== null;
  const peerWasActive = Boolean(runtime || injector || serviceStopped || peerEnabled);
  if (peerWasActive) await disablePeerInjection(peerRunPath);
  const injectorStopped = await stopPeerInjector(peerRunPath);
  if (injector && !injectorStopped) throw new Error("peer_injector_stop_failed");
  const runtimeStopped = await stopPeerRuntime(peerHome, runtime);
  if (runtime && !runtimeStopped) throw new Error("peer_runtime_stop_failed");
  let injectionRemoved = false;
  try {
    const peerToken = existsSync(join(peerRunPath, "token")) ? readFileSync(join(peerRunPath, "token"), "utf8").trim() : "";
    const result = await cdpEject(cdpPort, peerToken, peerOwnership);
    injectionRemoved = result.some(item => item.uninstalled === true);
  } catch {}
  if (injectionRemoved && !peerWasActive) await disablePeerInjection(peerRunPath);
  if (peerRuntimeState(peerRunPath) || peerInjectorPid(peerRunPath)) throw new Error("peer_instance_still_running");
  if (!peerWasActive && !injectionRemoved) return null;
  return {
    profile: peerProfile,
    serviceStopped,
    injectorStopped,
    runtimeStopped,
    injectionRemoved,
  };
}

function print(value: unknown) {
  console.log(JSON.stringify(value, null, 2));
}

function usage() {
  console.log("better-codex version | web | relay connect <url> [--pairing-code CODE|--admin-token TOKEN] | relay status|disconnect|doctor | relay user-list|user-add|user-disable|user-enable|user-password-set [--url URL] --admin-token-file PATH | sync connect <url> [--pairing-code CODE|--admin-token TOKEN] [--transport auto|websocket|http] | sync migrate --to <url> --from-admin-token TOKEN | sync status|now|disconnect | update [install --target-version VERSION|check|compatibility|rollback|channel stable|preview] [--channel stable|preview] | setup [--yes] | launch [--restart] | launcher install|uninstall|status | mcp install|uninstall|status | doctor | enable | disable | start [--launch] | stop | status | uninstall | data delete [--yes] | inject [--launch] [--port N] | eject [--port N] | service install|repair|uninstall|start|stop|restart|status|logs | project list|create | agent list | issue list|get|create|update|status|open");
}

function selfCommand() {
  if (isSea()) return [resolve(process.env.BETTER_CODEX_LAUNCHER_PATH ?? process.execPath)];
  if (packagedBuild && process.env.BETTER_CODEX_BASE_ENTRYPOINT) return [resolve(process.execPath), resolve(process.env.BETTER_CODEX_BASE_ENTRYPOINT)];
  const args = sourceProcessArguments([]);
  if (!args) throw new Error("self_requires_file_entrypoint");
  return [resolve(process.execPath), ...args];
}

function codexCliPath() {
  return requireCodexExecutablePath({ applicationPath: codexInstallationStatus().path });
}

function packagedMcpTransport(command: string | undefined, args: string[]) {
  if (!packagedBuild || !command || !existsSync(command)) return false;
  if (args.length === 2 && args[1] === "mcp" && ["node", "node.exe"].includes(basename(command).toLowerCase()) && basename(args[0]).toLowerCase() === "better-codex.cjs" && existsSync(args[0])) return true;
  return args.length === 1 && args[0] === "mcp" && ["better-codex", "better-codex.exe"].includes(basename(command).toLowerCase());
}

function mcpStatus() {
  try {
    const [command, ...commandArgs] = selfCommand();
    const expectedArgs = [...commandArgs, "mcp"];
    const value = execFileSync(codexCliPath(), ["mcp", "get", betterCodexMcpName, "--json"], { encoding: "utf8", windowsHide: true });
    const configuration = JSON.parse(value) as { transport?: { command?: string; args?: string[] } };
    const transportCommand = configuration.transport?.command;
    const transportArgs = configuration.transport?.args ?? [];
    const configured = (transportCommand === command && JSON.stringify(transportArgs) === JSON.stringify(expectedArgs)) || packagedMcpTransport(transportCommand, transportArgs);
    return { installed: true, configured, configuration };
  } catch {
    return { installed: false, configured: false };
  }
}

function installMcp() {
  const cli = codexCliPath();
  const [command, ...commandArgs] = selfCommand();
  const expectedArgs = [...commandArgs, "mcp"];
  const current = mcpStatus();
  if (current.installed) {
    if (current.configured) return { ...current, existing: true };
    execFileSync(cli, ["mcp", "remove", betterCodexMcpName], { stdio: "pipe", windowsHide: true });
  }
  execFileSync(cli, ["mcp", "add", betterCodexMcpName, "--", command, ...expectedArgs], { stdio: "pipe", windowsHide: true });
  return { ...mcpStatus(), existing: false };
}

function uninstallMcp() {
  const current = mcpStatus();
  if (!current.installed) return { installed: false, removed: false };
  execFileSync(codexCliPath(), ["mcp", "remove", betterCodexMcpName], { stdio: "pipe", windowsHide: true });
  return { installed: false, removed: true };
}

async function confirmSetup() {
  if (!process.stdin.isTTY || !process.stdout.isTTY) throw new Error("setup_requires_interactive_terminal");
  const terminal = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = await terminal.question("Better Codex needs to restart Codex and create the Better Codex launcher. Continue? [y/N] ");
    return /^(y|yes)$/i.test(answer.trim());
  } finally {
    terminal.close();
  }
}

async function confirmDataDelete(paths: string[]) {
  if (!process.stdin.isTTY || !process.stdout.isTTY) throw new Error("data_delete_requires_confirmation");
  const terminal = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = await terminal.question(`Permanently delete Better Codex data at ${paths.join(", ")}? [y/N] `);
    return /^(y|yes)$/i.test(answer.trim());
  } finally {
    terminal.close();
  }
}

function writable(path: string) {
  try {
    accessSync(path, constants.W_OK);
    return true;
  } catch {
    return false;
  }
}

function installBundledSkills() {
  const codexHome = process.env.CODEX_HOME || join(homedir(), ".codex");
  const skillRoot = join(codexHome, "skills");
  const skillDirectory = join(skillRoot, "better-codex");
  const installed = existsSync(join(skillDirectory, "SKILL.md")) && existsSync(updatePublicKeyPath);
  const obsoleteIssueSkill = join(codexHome, "skills", "better-codex-issue");
  const launcher = process.env.BETTER_CODEX_LAUNCHER_PATH;
  const candidates = [
    process.env.BETTER_CODEX_SKILLS_PATH,
    join(dirname(process.execPath), "..", "libexec", "skills"),
    packagedBuild && process.argv[1] ? packagedLibexecSkillsPath(process.argv[1]) : null,
    launcher ? join(dirname(launcher), "..", "libexec", "skills") : null,
  ].filter((value): value is string => Boolean(value));
  const source = candidates.find(path => existsSync(join(path, "better-codex", "SKILL.md")) && existsSync(resolve(path, "..", "update-public-key.pem")));
  const embedded = packagedBuild ? bundledBetterCodexSkill() : null;
  if (embedded) {
    const skillPath = join(skillDirectory, "SKILL.md");
    const interfacePath = join(skillDirectory, "agents", "openai.yaml");
    const current = existsSync(skillPath) && existsSync(interfacePath) && readFileSync(skillPath, "utf8") === embedded.skill && readFileSync(interfacePath, "utf8") === embedded.interface;
    if (!current) {
      mkdirSync(skillRoot, { recursive: true });
      const staging = join(skillRoot, `.better-codex-${randomUUID()}`);
      const backup = join(skillRoot, `.better-codex-backup-${randomUUID()}`);
      mkdirSync(join(staging, "agents"), { recursive: true });
      writeFileSync(join(staging, "SKILL.md"), embedded.skill, { mode: 0o644 });
      writeFileSync(join(staging, "agents", "openai.yaml"), embedded.interface, { mode: 0o644 });
      let backedUp = false;
      try {
        if (existsSync(skillDirectory)) {
          renameSync(skillDirectory, backup);
          backedUp = true;
        }
        renameSync(staging, skillDirectory);
        if (backedUp) {
          try { rmSync(backup, { recursive: true, force: true }); } catch {}
        }
      } catch (error) {
        rmSync(staging, { recursive: true, force: true });
        if (backedUp && !existsSync(skillDirectory)) renameSync(backup, skillDirectory);
        throw error;
      }
    }
    if (!existsSync(updatePublicKeyPath) && source) {
      mkdirSync(dirname(updatePublicKeyPath), { recursive: true });
      cpSync(resolve(source, "..", "update-public-key.pem"), updatePublicKeyPath, { force: true });
    }
    rmSync(obsoleteIssueSkill, { recursive: true, force: true });
    return { installed: true, existing: current, updated: !current, embedded: true, path: skillRoot, updateKey: existsSync(updatePublicKeyPath) };
  }
  if (!source) {
    if (installed) rmSync(obsoleteIssueSkill, { recursive: true, force: true });
    return installed
      ? { installed: true, existing: true, path: skillRoot, updateKey: true }
      : { installed: false, reason: "bundled_skills_unavailable", updateKey: false };
  }
  mkdirSync(skillRoot, { recursive: true });
  cpSync(join(source, "better-codex"), skillDirectory, { recursive: true, force: true });
  rmSync(obsoleteIssueSkill, { recursive: true, force: true });
  const publicKey = resolve(source, "..", "update-public-key.pem");
  mkdirSync(dirname(updatePublicKeyPath), { recursive: true });
  cpSync(publicKey, updatePublicKeyPath, { force: true });
  return { installed: true, path: skillRoot, updateKey: true };
}

async function doctor(allowPendingInjection = false) {
  const service = serviceStatus();
  const state = readRuntimeState();
  let runtime: Record<string, unknown> = { ok: false, error: "runtime_unavailable" };
  if (state) {
    try { runtime = await health(); } catch (error) { runtime = { ok: false, error: error instanceof Error ? error.message : "runtime_unavailable" }; }
  }
  const database = runtime.database && typeof runtime.database === "object"
    ? runtime.database
    : { ok: existsSync(databasePath), path: databasePath, directoryWritable: writable(dirname(databasePath)) };
  const codex = codexInstallationStatus();
  const injection = await cdpStatus(cdpPort);
  const compatibility = runtime.compatibility ?? injection.compatibility ?? null;
  const codexHome = process.env.CODEX_HOME || join(homedir(), ".codex");
  const skills = {
    betterCodex: existsSync(join(codexHome, "skills", "better-codex", "SKILL.md")),
  };
  const mcp = mcpStatus();
  const sessionHost = sessionHostStatus();
  const sessionHostRequired = process.env.BETTER_CODEX_DISABLE_RUNTIME_SESSION_RELAY !== "1" && process.env.BETTER_CODEX_DISABLE_DELEGATION !== "1" && !process.env.NODE_TEST_CONTEXT;
  const updateKey = (!isSea() && !packagedBuild) || existsSync(updatePublicKeyPath);
  const injectedTarget = injection.targets.some(target => Boolean((target as { entry?: boolean }).entry) && Boolean((target as { panel?: boolean }).panel));
  const activeInjectorPid = injectorPid();
  const injectionReady = injectionEnabled() && Boolean(activeInjectorPid) && injectedTarget;
  const pendingInjection = allowPendingInjection && !injectionReady;
  const checks = {
    core: { ok: true, ...activeVersions(), profile: betterCodexProfile, home: betterCodexHome, executable: process.env.BETTER_CODEX_LAUNCHER_PATH ?? process.execPath },
    service: { ok: service.installed, ...service },
    runtime,
    database,
    codex,
    compatibility,
    injection: { ...injection, enabled: injectionEnabled(), injectorPid: activeInjectorPid, ready: injectionReady, pending: pendingInjection },
    skills,
    mcp,
    sessionHost: { ...sessionHost, required: sessionHostRequired },
    updateKey,
  };
  return { ok: Boolean(runtime.ok) && Boolean((database as { ok?: boolean }).ok) && codex.installed && Boolean((compatibility as { compatible?: boolean } | null)?.compatible) && (injectionReady || pendingInjection) && skills.betterCodex && mcp.installed && mcp.configured && (!sessionHostRequired || sessionHost.ok) && updateKey, checks };
}

async function uninstall() {
  const dataHome = resolve(betterCodexHome);
  if (dataHome === resolve(homedir()) || dirname(dataHome) === dataHome) throw new Error("unsafe_better_codex_home");
  setInjectionEnabled(false);
  await stopInjector();
  await stopSessionHostProcess();
  let injection: unknown = { removed: false, reason: "cdp_unavailable" };
  try { injection = await cdpEject(cdpPort, accessToken(), injectionOwnership()); } catch {}
  try { await request("/api/shutdown", { method: "POST" }); } catch {}
  const launchIntegration = uninstallLaunchIntegration();
  const mcp = uninstallMcp();
  const service = uninstallService();
  const codexHome = process.env.CODEX_HOME || join(homedir(), ".codex");
  const agentProfiles = removeManagedAgentProfiles(codexHome);
  const sharedDataPaths = betterCodexProfile === "development"
    ? []
    : [databasePath, `${databasePath}-wal`, `${databasePath}-shm`, join(dirname(databasePath), "backups")];
  const preservedDevelopmentData = new Set([
    databasePath,
    `${databasePath}-wal`,
    `${databasePath}-shm`,
    join(dirname(databasePath), "backups"),
  ].map(path => resolve(path)));
  const profileHomePaths = betterCodexProfile === "development" && existsSync(dataHome)
    ? readdirSync(dataHome).map(name => resolve(join(dataHome, name))).filter(path => !preservedDevelopmentData.has(path))
    : [dataHome];
  const programPaths = [...new Set([
    ...profileHomePaths,
    ...sharedDataPaths,
    join(codexHome, "skills", "better-codex"),
    join(codexHome, "skills", "better-codex-issue"),
  ].map(path => resolve(path)))];
  const packagedEntrypoints = packagedBuild
    ? [...new Set([process.argv[1], process.env.BETTER_CODEX_BASE_ENTRYPOINT].filter((value): value is string => Boolean(value)).map(value => resolve(value)))]
    : [];
  const baseEntrypoint = process.env.BETTER_CODEX_BASE_ENTRYPOINT ? resolve(process.env.BETTER_CODEX_BASE_ENTRYPOINT) : packagedEntrypoints[0];
  const packagedLaunchers = baseEntrypoint
    ? process.platform === "win32"
      ? [join(dirname(baseEntrypoint), "better-codex.cmd")]
      : [join(dirname(baseEntrypoint), "better-codex")]
    : [];
  const binaries = isSea()
    ? [...new Set([process.env.BETTER_CODEX_LAUNCHER_PATH, process.execPath].filter((value): value is string => Boolean(value)).map(value => resolve(value)))]
    : packagedEntrypoints.length > 0
      ? [...packagedEntrypoints, ...packagedLaunchers]
      : [];
  const removableBinaries = binaries.filter(path => !path.split(/[\\/]/).some(part => part.toLowerCase() === "cellar"));
  if (process.platform === "win32" && binaries.length > 0) {
    const cleanup = [...programPaths, ...removableBinaries].map(path => `Remove-Item -LiteralPath '${path.replace(/'/g, "''")}' -Recurse -Force -ErrorAction SilentlyContinue`).join("; ");
    const command = `Start-Sleep -Milliseconds 800; ${cleanup}`;
    const child = spawn("powershell.exe", ["-NoProfile", "-NonInteractive", "-WindowStyle", "Hidden", "-Command", command], { detached: true, stdio: "ignore", windowsHide: true });
    child.unref();
  } else {
    for (const path of programPaths) rmSync(path, { recursive: true, force: true });
    for (const path of removableBinaries) rmSync(path, { force: true });
  }
  return { uninstalled: true, service, launchIntegration, mcp, injection, agentProfiles, removed: programPaths, binaries: removableBinaries, packageManagedBinaries: binaries.filter(path => !removableBinaries.includes(path)), dataPreserved: betterCodexProfile === "development" ? [databasePath] : [] };
}

async function deleteData(confirmed: boolean) {
  if (readRuntimeState()) throw new Error("data_delete_requires_stopped_runtime");
  const paths = [databasePath, `${databasePath}-wal`, `${databasePath}-shm`, join(dirname(databasePath), "backups"), syncConfigPath, relayConfigPath];
  if (!confirmed && !(await confirmDataDelete(paths))) return { deleted: false, paths };
  for (const path of paths) rmSync(path, { recursive: true, force: true });
  return { deleted: true, paths };
}

function progress(stage: string, json: boolean) {
  if (!json) console.error(stage);
}

async function openExternalUrl(url: string) {
  const invocation = process.platform === "win32"
    ? { command: "rundll32.exe", args: ["url.dll,FileProtocolHandler", url] }
    : { command: "open", args: [url] };
  try {
    const child = spawn(invocation.command, invocation.args, { detached: true, stdio: "ignore", windowsHide: true });
    child.unref();
    return true;
  } catch {
    return false;
  }
}

async function requestDeviceCredentials(base: string, deviceName: string) {
  const authorization = await fetch(`${base}/api/v1/device-authorizations`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: deviceName }), signal: AbortSignal.timeout(15_000) }).then(async response => {
    const value = await response.json().catch(() => ({})) as Record<string, unknown>;
    if (!response.ok) throw new Error(String(value.error || `hub_http_${response.status}`));
    return value;
  });
  const authorizationId = String(authorization.authorization_id || "");
  const userCode = String(authorization.user_code || "");
  const approvalUrl = String(authorization.approval_url || "");
  if (!authorizationId || !userCode || !approvalUrl) throw new Error("invalid_device_authorization_response");
  const opened = await openExternalUrl(approvalUrl);
  if (!opened) console.error(`Approve this device at ${approvalUrl}`);
  for (let attempt = 0; attempt < 120; attempt += 1) {
    const tokenResponse = await fetch(`${base}/api/v1/device-authorizations/${encodeURIComponent(authorizationId)}/token`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ user_code: userCode }), signal: AbortSignal.timeout(15_000) });
    const tokenBody = await tokenResponse.json().catch(() => ({})) as Record<string, unknown>;
    if (tokenResponse.ok && tokenBody.status === "approved" && tokenBody.device_id && tokenBody.device_token) return { device_id: String(tokenBody.device_id), device_token: String(tokenBody.device_token) };
    if (tokenBody.status === "expired" || tokenBody.status === "denied") throw new Error(`device_authorization_${tokenBody.status}`);
    await new Promise(resolve => setTimeout(resolve, 2_000));
  }
  throw new Error("device_authorization_timeout");
}

async function syncCommand(action: string | undefined, args: string[]) {
  if (action === "connect") {
    const hubUrl = option(args, "--url") ?? positionals(args)[0];
    const pairingCode = option(args, "--pairing-code");
    const adminToken = option(args, "--admin-token");
    if (!hubUrl) throw new Error("hub_url_required");
    if (!pairingCode && !adminToken) {
      const base = normalizeHubUrl(hubUrl);
      const deviceName = option(args, "--name") ?? hostname();
      const credentials = await requestDeviceCredentials(base, deviceName);
      return finishSyncConnect(base, deviceName, credentials.device_id, credentials.device_token, args);
    }
    const base = normalizeHubUrl(hubUrl);
    const deviceName = option(args, "--name") ?? hostname();
    const response = await fetch(`${base}${pairingCode ? "/api/v1/devices/pair" : "/api/v1/devices"}`, {
      method: "POST",
      headers: { "content-type": "application/json", ...(adminToken ? { authorization: `Bearer ${adminToken}` } : {}) },
      body: JSON.stringify(pairingCode ? { pairing_code: pairingCode, name: deviceName, replace_existing: true } : { name: deviceName }),
      signal: AbortSignal.timeout(15_000),
    });
    const body = await response.json().catch(() => ({})) as Record<string, unknown>;
    if (!response.ok) throw new Error(typeof body.error === "string" ? body.error : `hub_http_${response.status}`);
    const deviceId = String(body.device_id ?? "");
    const deviceToken = String(body.device_token ?? "");
    if (!deviceId || !deviceToken) throw new Error("invalid_pair_response");
    const transport = option(args, "--transport");
    if (transport && !["auto", "websocket", "http"].includes(transport)) throw new Error("invalid_sync_transport");
    return finishSyncConnect(base, deviceName, deviceId, deviceToken, args);
  }

  if (action === "migrate") {
    const current = readSyncConfiguration();
    if (!current) throw new Error("sync_not_connected");
    const target = option(args, "--to") ?? positionals(args)[0];
    if (!target) throw new Error("migration_target_required");
    const fromAdminToken = option(args, "--from-admin-token") ?? process.env.BETTER_CODEX_SYNC_MIGRATION_ADMIN_TOKEN ?? process.env.BETTER_CODEX_HUB_ADMIN_TOKEN ?? process.env.BETTER_CODEX_HUB_BOOTSTRAP_SECRET;
    if (!fromAdminToken) throw new Error("migration_admin_token_required");
    const oldResponse = await fetch(`${current.hub_url}/api/v1/admin/read-only`, { method: "POST", headers: { authorization: `Bearer ${fromAdminToken}`, "content-type": "application/json" }, body: JSON.stringify({ read_only: true }), signal: AbortSignal.timeout(15_000) });
    if (!oldResponse.ok) throw new Error(`source_hub_read_only_failed_${oldResponse.status}`);
    for (let attempt = 0; attempt < 30; attempt += 1) {
      const queueResponse = await fetch(`${current.hub_url}/api/v1/admin/command-queue`, { headers: { authorization: `Bearer ${fromAdminToken}` }, signal: AbortSignal.timeout(15_000) });
      if (!queueResponse.ok) throw new Error(`source_hub_queue_check_failed_${queueResponse.status}`);
      const queue = await queueResponse.json() as { pending?: number; dispatched?: number };
      if (!queue.pending && !queue.dispatched) break;
      if (attempt === 29) throw new Error("source_hub_commands_not_drained");
      await new Promise(resolve => setTimeout(resolve, 2_000));
    }
    const base = normalizeHubUrl(target);
    const deviceName = option(args, "--name") ?? current.device_name;
    const credentials = await requestDeviceCredentials(base, deviceName);
    try {
      return await finishSyncConnect(base, deviceName, credentials.device_id, credentials.device_token, args, current);
    } catch (error) {
      await fetch(`${current.hub_url}/api/v1/admin/read-only`, { method: "POST", headers: { authorization: `Bearer ${fromAdminToken}`, "content-type": "application/json" }, body: JSON.stringify({ read_only: false }), signal: AbortSignal.timeout(15_000) }).catch(() => {});
      throw error;
    }
  }

  if (action === "status") {
    const configuration = readSyncConfiguration();
    if (!configuration) return print({ connected: false });
    try {
      await health();
      return print(await request("/api/sync/status"));
    } catch {
      return print({ connected: true, runtime: false, hub_url: configuration.hub_url, device_name: configuration.device_name });
    }
  }
  if (action === "now") {
    await ensureRuntime();
    return print(await request("/api/sync/now", { method: "POST" }));
  }
  if (action === "disconnect") {
    try {
      await ensureRuntime();
      return print(await request("/api/sync/disconnect", { method: "POST" }));
    } catch {
      removeSyncConfiguration();
      return print({ connected: false, runtime: false });
    }
  }
  usage();
}

async function finishSyncConnect(base: string, deviceName: string, deviceId: string, deviceToken: string, args: string[], rollbackConfiguration?: ReturnType<typeof readSyncConfiguration>) {
    const transport = option(args, "--transport");
    if (transport && !["auto", "websocket", "http"].includes(transport)) throw new Error("invalid_sync_transport");
    const configuration = writeSyncConfiguration({ hub_url: base, device_id: deviceId, device_name: deviceName, device_token: deviceToken, transport: transport as "auto" | "websocket" | "http" | undefined });
    try {
      await ensureRuntime();
      return print({ connected: true, hub_url: configuration.hub_url, device_id: configuration.device_id, status: await request("/api/sync/connect", { method: "POST" }) });
    } catch (error) {
      if (rollbackConfiguration) writeSyncConfiguration(rollbackConfiguration);
      else removeSyncConfiguration();
      throw error;
    }
  }

async function relayCommand(action: string | undefined, args: string[]) {
  if (["user-list", "user-add", "user-disable", "user-enable", "user-password-set"].includes(action || "")) {
    const configuration = readRelayConfiguration();
    const relayUrl = option(args, "--url") || configuration?.relay_url;
    if (!relayUrl) throw new Error("relay_url_required");
    const base = normalizeRelayUrl(relayUrl);
    const adminToken = secretOption(args, "--admin-token", "--admin-token-file");
    if (!adminToken) throw new Error("relay_admin_token_required");
    const username = positionals(args)[0];
    if (action !== "user-list" && !username) throw new Error("relay_username_required");
    let path = "/api/v1/admin/users";
    let method = "GET";
    let body: Record<string, unknown> | undefined;
    if (action === "user-add") {
      const passwordFile = option(args, "--password-file");
      if (!passwordFile) throw new Error("relay_password_file_required");
      path = "/api/v1/admin/users";
      method = "POST";
      body = { username, password: readFileSync(resolve(passwordFile), "utf8").trim(), nickname: option(args, "--nickname") || username };
    } else if (action === "user-disable" || action === "user-enable") {
      path = `/api/v1/admin/users/${encodeURIComponent(username!)}/${action === "user-disable" ? "disable" : "enable"}`;
      method = "POST";
    } else if (action === "user-password-set") {
      const passwordFile = option(args, "--password-file");
      if (!passwordFile) throw new Error("relay_password_file_required");
      path = `/api/v1/admin/users/${encodeURIComponent(username!)}/password`;
      method = "POST";
      body = { password: readFileSync(resolve(passwordFile), "utf8").trim() };
    }
    const response = await fetch(`${base}${path}`, {
      method,
      headers: { authorization: `Bearer ${adminToken}`, ...(body ? { "content-type": "application/json" } : {}) },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(15_000),
    });
    const value = await response.json().catch(() => ({})) as Record<string, unknown>;
    if (!response.ok) throw new Error(String(value.error || `relay_http_${response.status}`));
    return print(value);
  }
  if (action === "connect") {
    const relayUrl = option(args, "--url") ?? positionals(args)[0];
    if (!relayUrl) throw new Error("relay_url_required");
    const base = normalizeRelayUrl(relayUrl);
    const deviceName = option(args, "--name") ?? hostname();
    const pairingCode = option(args, "--pairing-code");
    const adminToken = secretOption(args, "--admin-token", "--admin-token-file");
    let credentials: { device_id: string; device_token: string };
    if (pairingCode) {
      const response = await fetch(`${base}/api/v1/devices/pair`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ pairing_code: pairingCode, name: deviceName, replace_existing: true }), signal: AbortSignal.timeout(15_000) });
      const body = await response.json().catch(() => ({})) as Record<string, unknown>;
      if (!response.ok) throw new Error(String(body.error || `relay_http_${response.status}`));
      credentials = { device_id: String(body.device_id || ""), device_token: String(body.device_token || "") };
    } else if (adminToken) {
      const pairingResponse = await fetch(`${base}/api/v1/admin/pairing-codes`, { method: "POST", headers: { authorization: `Bearer ${adminToken}` }, signal: AbortSignal.timeout(15_000) });
      const pairing = await pairingResponse.json().catch(() => ({})) as Record<string, unknown>;
      if (!pairingResponse.ok) throw new Error(String(pairing.error || `relay_http_${pairingResponse.status}`));
      const response = await fetch(`${base}/api/v1/devices/pair`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ pairing_code: pairing.pairing_code, name: deviceName, replace_existing: true }), signal: AbortSignal.timeout(15_000) });
      const body = await response.json().catch(() => ({})) as Record<string, unknown>;
      if (!response.ok) throw new Error(String(body.error || `relay_http_${response.status}`));
      credentials = { device_id: String(body.device_id || ""), device_token: String(body.device_token || "") };
    } else {
      credentials = await requestDeviceCredentials(base, deviceName);
    }
    if (!credentials.device_id || !credentials.device_token) throw new Error("invalid_pair_response");
    const previous = readRelayConfiguration();
    const configuration = writeRelayConfiguration({ relay_url: base, device_id: credentials.device_id, device_name: deviceName, device_token: credentials.device_token });
    try {
      await ensureRuntime();
      await request("/api/relay/connect", { method: "POST" });
      for (let attempt = 0; attempt < 60; attempt += 1) {
        const status = await request("/api/relay/status") as { connected?: boolean; last_error?: string };
        if (status.connected || status.last_error === "unauthorized") return print({ connected: status.connected === true, relay_url: configuration.relay_url, device_id: configuration.device_id, status });
        await new Promise(resolve => setTimeout(resolve, 250));
      }
      return print({ connected: false, relay_url: configuration.relay_url, device_id: configuration.device_id, status: await request("/api/relay/status") });
    } catch (error) {
      if (previous) writeRelayConfiguration(previous);
      else removeRelayConfiguration();
      throw error;
    }
  }
  if (action === "status") {
    const configuration = readRelayConfiguration();
    if (!configuration) return print({ connected: false });
    try {
      await health();
      return print(await request("/api/relay/status"));
    } catch {
      return print({ connected: false, runtime: false, relay_url: configuration.relay_url, device_name: configuration.device_name });
    }
  }
  if (action === "disconnect") {
    try {
      await ensureRuntime();
      return print(await request("/api/relay/disconnect", { method: "POST" }));
    } catch {
      removeRelayConfiguration();
      return print({ connected: false, runtime: false });
    }
  }
  if (action === "doctor") {
    const configuration = readRelayConfiguration();
    if (!configuration) return print({ ok: false, connected: false, error: "relay_not_connected" });
    const [local, remote] = await Promise.all([
      (async () => {
        try { await health(); return await request("/api/relay/status"); } catch (error) { return { connected: false, error: error instanceof Error ? error.message : "runtime_unavailable" }; }
      })(),
      fetch(`${configuration.relay_url}/healthz`, { signal: AbortSignal.timeout(15_000) }).then(async response => ({ status: response.status, body: await response.json().catch(() => ({})) })).catch(error => ({ status: 0, body: { error: error instanceof Error ? error.message : "relay_unavailable" } })),
    ]);
    const remoteBody = remote.body as Record<string, unknown>;
    return print({ ok: Boolean((local as { connected?: boolean }).connected) && remote.status === 200 && remoteBody.name === "Better Codex Relay" && remoteBody.protocol_version === "relay/v1", local, remote });
  }
  usage();
}

async function issueCommand(action: string | undefined, args: string[]) {
  if (action === "list") {
    const query = new URLSearchParams();
    const project = option(args, "--project");
    const search = option(args, "--search");
    if (project) query.set("project_id", project);
    if (search) query.set("search", search);
    return print(await request("/api/issues?" + query));
  }
  if (action === "get") return print(await request(`/api/issues/${encodeURIComponent(args[0] ?? "")}`));
  if (action === "create") {
    const title = option(args, "--title") ?? positionals(args).join(" ");
    const bootstrap = await request("/api/bootstrap") as { projects?: Array<{ id: string }> };
    const projectId = option(args, "--project") ?? bootstrap.projects?.[0]?.id;
    if (!projectId) throw new Error("project_required");
    return print(await request("/api/issues", {
      method: "POST",
      body: JSON.stringify({
        project_id: projectId,
        title,
        description: option(args, "--description") ?? "",
        status: option(args, "--status") ?? "backlog",
        priority: option(args, "--priority") ?? "medium",
        workspace_path: option(args, "--workspace") ?? process.cwd(),
      }),
    }));
  }
  const id = args[0] ?? "";
  const issue = await request(`/api/issues/${encodeURIComponent(id)}`) as { version?: number; thread_id?: string; run_thread_id?: string };
  if (action === "status") {
    return print(await request(`/api/issues/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify({ version: issue.version, status: args[1] }) }));
  }
  if (action === "update") {
    const patch: Record<string, unknown> = { version: issue.version };
    for (const [key, flag] of [["title", "--title"], ["description", "--description"], ["priority", "--priority"], ["status", "--status"], ["pending_actor", "--pending-actor"]]) {
      const value = option(args, flag);
      if (value !== undefined) patch[key] = value;
    }
    const needsAttention = option(args, "--needs-attention");
    if (needsAttention !== undefined) {
      if (!["true", "false", "1", "0"].includes(needsAttention)) throw new Error("invalid_needs_attention");
      patch.needs_attention = needsAttention === "true" || needsAttention === "1";
    }
    const agentId = option(args, "--agent-id");
    if (agentId !== undefined) {
      patch.user_assigned = false;
      patch.agent_enabled = agentId !== "none";
      patch.agent_id = agentId === "none" || agentId === "codex" ? null : agentId;
    }
    return print(await request(`/api/issues/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(patch) }));
  }
  if (action === "open") {
    if (!issue.run_thread_id) throw new Error("issue_has_no_thread");
    return print(await cdpOpenThread(Number(option(args, "--port") ?? cdpPort), issue.run_thread_id));
  }
  usage();
}

async function main() {
  const [command, action, ...args] = commandArguments();
  const delegated = maybeDelegateToActiveCore();
  if (delegated !== null) process.exit(delegated);
  if (command === "update" && action === "install") {
    const selected = option(args, "--channel") ?? selectedUpdateChannel();
    if (!["stable", "preview"].includes(selected)) throw new Error("update_channel_invalid");
    return print(await installRuntimeUpdate(option(args, "--target-version"), selected as UpdateChannel));
  }
  if (packagedBuild) installBundledSkills();
  if (command === "apply-update") {
    const versions = activeVersions();
    const updateId = option(args, "--update-id");
    if (!updateId) throw new Error("update_id_required");
    const sourceCoreVersion = option(args, "--source-core");
    if (!sourceCoreVersion) throw new Error("update_source_core_required");
    const targetGeneration = Number(option(args, "--target-generation"));
    if (!Number.isSafeInteger(targetGeneration) || targetGeneration < 1) throw new Error("update_target_generation_required");
    return print(await applyUpdate(Number(action), {
      core: option(args, "--expected-core") ?? (args.includes("--core-updated") ? versions.core : null),
      compatibility: option(args, "--expected-compatibility") ?? (args.includes("--compatibility-updated") ? versions.compatibility : null),
    }, updateId, sourceCoreVersion, targetGeneration, option(args, "--drain-path")));
  }
  if (command === "version" || command === "--version" || command === "-v") {
    const versions = activeVersions();
    if ([action, ...args].includes("--json")) return console.log(JSON.stringify({ ...versions, profile: betterCodexProfile, home: betterCodexHome }));
    return console.log(`better-codex core ${versions.core} compatibility ${versions.compatibility}`);
  }
  if (command === "update") {
    const values = [action, ...args].filter(Boolean) as string[];
    if (action === "channel") {
      const requested = args[0];
      if (!requested || args.length !== 1 || !["stable", "preview"].includes(requested)) throw new Error("update_channel_invalid");
      return print(setUpdateChannel(requested as UpdateChannel));
    }
    const selected = option(values, "--channel") ?? selectedUpdateChannel();
    if (!["stable", "preview"].includes(selected)) throw new Error("update_channel_invalid");
    const channel = selected as UpdateChannel;
    if (action === "check") return print(await checkForUpdates(channel));
    if (action === "compatibility") {
      const result = await updateCompatibility(undefined, channel);
      if (result.updated && injectionEnabled()) {
        try {
          await ensureRuntime();
          await cdpInject(cdpPort, activeRuntimePort(), accessToken(), false);
          return print({ ...result, injection: { restored: true } });
        } catch (error) {
          return print({ ...result, injection: { restored: false, pending: true, error: error instanceof Error ? error.message : "injection_unavailable" } });
        }
      }
      return print(result);
    }
    if (action === "rollback") return print(rollbackAllUpdates());
    if (action && !action.startsWith("--")) return usage();
    const result = await updateAll(channel);
    const mcp = installMcp();
    if (result.compatibility.updated && injectionEnabled()) {
      try {
        await ensureRuntime();
        await cdpInject(cdpPort, activeRuntimePort(), accessToken(), false);
        return print({ ...result, mcp, injection: { restored: true } });
      } catch (error) {
        return print({ ...result, mcp, injection: { restored: false, pending: true, error: error instanceof Error ? error.message : "injection_unavailable" } });
      }
    }
    return print({ ...result, mcp });
  }
  if (command === "session-host") return startSessionHost();
  if (command === "runtime") return runRuntime();
  if (command === "serve") return (await import("./server.js")).startServer();
  if (command === "web") return print(await openWebApp());
  if (command === "watch-inject") return watchInjection(Number(action || cdpPort), accessToken());
  if (command === "mcp" && !action) return startMcpAppServer();
  if (command === "mcp") {
    if (action === "install") return print(installMcp());
    if (action === "uninstall") return print(uninstallMcp());
    if (action === "status") return print(mcpStatus());
    return usage();
  }
  if (command === "launch") {
    const intent = await recordLaunchIntent([action, ...args].includes("--restart"));
    return print(await withLaunchLock(async () => {
      const latestIntent = latestLaunchIntent();
      if (latestIntent?.token !== intent.token) return { launched: false, superseded: true, requestedProfile: intent.profile };
      markLaunchIntentProcessed(intent.sequence);
      const explicitRestartRequested = latestIntent.restart === true;
      const detectedCodexRunning = ["darwin", "win32"].includes(process.platform) && codexProcessRunning();
      const restartChoice = detectedCodexRunning && !explicitRestartRequested ? chooseCodexRestartAction() : null;
      if (restartChoice === "cancelled") {
        return { launched: false, restarted: false, cancelled: true };
      }
      const current = process.platform === "win32" ? { available: false, targets: [] } : await cdpStatus(cdpPort);
      const codexRunning = detectedCodexRunning || current.available || current.targets.length > 0;
      const restartRequested = explicitRestartRequested || restartChoice === "restart-codex" || (restartChoice === null && requiresCodexRestartForLaunch(codexRunning));
      const switchedFrom = await deactivatePeerInstance();
      if (!codexRunning) {
        setInjectionEnabled(true);
        await ensureRuntime();
        const injection = await cdpInject(cdpPort, activeRuntimePort(), accessToken(), true);
        await ensureInjector(cdpPort);
        return { launched: true, restarted: false, codexStarted: true, switchedFrom, injection };
      }
      if (restartChoice === "reset-runtime") {
        await restartRuntime();
        setInjectionEnabled(true);
        launchCodex(cdpPort, true);
        await ensureInjector(cdpPort);
        try {
          const injection = await cdpInject(cdpPort, activeRuntimePort(), accessToken(), false);
          return { launched: true, restarted: false, runtimeReset: true, openedCurrentCodex: true, switchedFrom, injection };
        } catch (error) {
          return { launched: true, restarted: false, runtimeReset: true, openedCurrentCodex: true, switchedFrom, injection: { restored: false, pending: true, error: error instanceof Error ? error.message : "injection_unavailable" } };
        }
      }
      if (switchedFrom && !restartRequested) {
        setInjectionEnabled(true);
        await ensureRuntime();
        launchCodex(cdpPort, true);
        try {
          const injection = await cdpInject(cdpPort, activeRuntimePort(), accessToken(), true);
          await ensureInjector(cdpPort);
          return { launched: true, restarted: false, openedCurrentCodex: true, switchedFrom, injection };
        } catch (error) {
          setInjectionEnabled(false);
          throw error;
        }
      }
      if (!restartRequested) {
        setInjectionEnabled(true);
        await ensureRuntime();
        launchCodex(cdpPort, true);
        try {
          const injection = await cdpInject(cdpPort, activeRuntimePort(), accessToken(), true);
          await ensureInjector(cdpPort);
          return { launched: true, restarted: false, openedCurrentCodex: true, injection };
        } catch (error) {
          setInjectionEnabled(false);
          throw error;
        }
      }
      await restartRuntime();
      setInjectionEnabled(true);
      try {
        const injection = await cdpRestartAndInject(cdpPort, activeRuntimePort(), accessToken());
        await ensureInjector(cdpPort);
        return { launched: true, restarted: true, injection };
      } catch (error) {
        setInjectionEnabled(false);
        throw error;
      }
    }));
  }
  if (command === "launcher") {
    if (action === "install") return print(installLaunchIntegration());
    if (action === "uninstall") return print(uninstallLaunchIntegration());
    if (action === "status") return print(launchIntegrationStatus());
    return usage();
  }
  if (command === "setup") {
    const values = [action, ...args].filter(Boolean) as string[];
    const json = values.includes("--json");
    const preserveCodex = values.includes("--preserve-codex");
    if (!values.includes("--yes") && !(await confirmSetup())) return print({ configured: false });
    progress("installing_runtime", json);
    setInjectionEnabled(false);
    await stopInjector();
    try {
      try { await request("/api/shutdown", { method: "POST" }); } catch {}
      await stopSessionHostProcess();
      const skills = installBundledSkills();
      if (!skills.installed || !skills.updateKey) throw new Error("reason" in skills ? skills.reason : "bundled_assets_unavailable");
      const mcp = installMcp();
      installService();
      progress("starting_runtime", json);
      const runtime = await ensureRuntime();
      await waitForRuntimeReady();
      progress("waiting_for_codex", json);
      if (!codexInstallationStatus().installed) throw new Error("codex_not_found");
      progress("injecting", json);
      let injection: unknown;
      if (preserveCodex) {
        try {
          injection = { refreshed: true, targets: await cdpRefreshAndInject(cdpPort, activeRuntimePort(), accessToken()) };
        } catch (error) {
          injection = { refreshed: false, pending: true, error: error instanceof Error ? error.message : "injection_refresh_pending" };
        }
      } else {
        injection = await cdpRestartAndInject(cdpPort, activeRuntimePort(), accessToken());
      }
      setInjectionEnabled(true);
      const pid = await ensureInjector(cdpPort);
      const launchIntegration = installLaunchIntegration();
      progress("ready", json);
      return print({ configured: true, stages: ["installing_runtime", "installing_mcp", "starting_runtime", "waiting_for_codex", "injecting", "installing_launcher", "ready"], runtime, injection, launchIntegration, skills, mcp, injectorPid: pid });
    } catch (error) {
      setInjectionEnabled(false);
      await stopInjector();
      throw error;
    }
  }
  if (command === "doctor") return print(await doctor([action, ...args].includes("--allow-pending-injection")));
  if (command === "relay") return relayCommand(action, args);
  if (command === "sync") return syncCommand(action, args);
  if (command === "enable") {
    setInjectionEnabled(false);
    await stopInjector();
    try {
      const runtime = await ensureRuntime();
      const selectedPort = Number(option([action, ...args].filter(Boolean) as string[], "--port") ?? cdpPort);
      await cdpInject(selectedPort, activeRuntimePort(), accessToken(), false);
      setInjectionEnabled(true);
      await ensureInjector(selectedPort);
      return print({ enabled: true, runtime, injection: await cdpStatus(selectedPort) });
    } catch (error) {
      setInjectionEnabled(false);
      await stopInjector();
      throw error;
    }
  }
  if (command === "disable") {
    setInjectionEnabled(false);
    await stopInjector();
    const selectedPort = Number(option([action, ...args].filter(Boolean) as string[], "--port") ?? cdpPort);
    let injection: unknown = { available: false, disabled: true };
    try { injection = await cdpEject(selectedPort, accessToken(), injectionOwnership()); } catch {}
    return print({ enabled: false, injection });
  }
  if (command === "uninstall") return print(await uninstall());
  if (command === "data" && action === "delete") return print(await deleteData(args.includes("--yes")));
  if (command === "service") {
    if (action === "install") {
      try { await request("/api/shutdown", { method: "POST" }); } catch {}
      for (let attempt = 0; attempt < 30; attempt += 1) {
        try {
          await health();
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch {
          break;
        }
      }
      await stopSessionHostProcess();
      return print(installService());
    }
    if (action === "repair") return print(repairServiceConfiguration());
    if (action === "uninstall") return print(uninstallService());
    if (action === "start") return print(startService());
    if (action === "stop") {
      await stopSessionHostProcess();
      return print(stopService());
    }
    if (action === "restart") {
      await stopSessionHostProcess();
      return print(restartService());
    }
    if (action === "status") return print(serviceStatus());
    if (action === "logs") return console.log(serviceLogs(Number(option(args, "--lines") ?? 50)));
    return usage();
  }
  if (command === "start") {
    const runtime = await ensureRuntime();
    if ([action, ...args].includes("--runtime-only")) return print({ runtime });
    setInjectionEnabled(true);
    const selectedPort = Number(option([action, ...args].filter(Boolean) as string[], "--port") ?? cdpPort);
    let injection: unknown = await cdpStatus(selectedPort);
    if ((injection as { available?: boolean }).available || [action, ...args].includes("--launch")) {
      await cdpInject(selectedPort, activeRuntimePort(), accessToken(), [action, ...args].includes("--launch"));
      await ensureInjector(selectedPort);
      injection = await cdpStatus(selectedPort);
    }
    return print({ runtime, injection });
  }
  if (command === "stop") {
    await stopInjector();
    try { await cdpEject(cdpPort, accessToken(), injectionOwnership()); } catch {}
    let runtime: unknown = { stopped: true, alreadyStopped: true };
    try { runtime = await request("/api/shutdown", { method: "POST" }); } catch {}
    return print({ runtime, injection: { stopped: true } });
  }
  if (command === "status") {
    let runtime: unknown;
    try { runtime = await health(); } catch (error) { runtime = { ok: false, error: error instanceof Error ? error.message : "runtime_unavailable" }; }
    return print({ profile: betterCodexProfile, home: betterCodexHome, runtime, injection: await cdpStatus(Number(option([action, ...args].filter(Boolean) as string[], "--port") ?? cdpPort)), injectionEnabled: injectionEnabled(), injectorPid: injectorPid() });
  }
  if (command === "refresh-injection") {
    return print(await withLaunchLock(async () => {
      const selectedPort = Number(option([action, ...args].filter(Boolean) as string[], "--port") ?? cdpPort);
      const runtimeBeforeRefresh = readRuntimeState();
      setInjectionEnabled(false);
      await stopInjector();
      try {
        await ensureRuntime();
        const removed = await cdpEject(selectedPort, accessToken(), injectionOwnership());
        const injection = await cdpInject(selectedPort, activeRuntimePort(), accessToken(), false);
        setInjectionEnabled(true);
        const injectorPid = await ensureInjector(selectedPort);
        return { refreshed: true, removed, injection, injectorPid };
      } catch (error) {
        setInjectionEnabled(false);
        await stopInjector();
        if (!runtimeBeforeRefresh && readRuntimeState()) {
          try { await request("/api/shutdown", { method: "POST" }); } catch {}
        }
        throw error;
      }
    }));
  }
  if (command === "inject") {
    setInjectionEnabled(false);
    await stopInjector();
    try {
      await ensureRuntime();
      const selectedPort = Number(option([action, ...args].filter(Boolean) as string[], "--port") ?? cdpPort);
      const launch = [action, ...args].includes("--launch");
      await cdpInject(selectedPort, activeRuntimePort(), accessToken(), launch);
      setInjectionEnabled(true);
      const pid = await ensureInjector(selectedPort);
      return print({ ...(await cdpStatus(selectedPort)), injectorPid: pid });
    } catch (error) {
      setInjectionEnabled(false);
      await stopInjector();
      throw error;
    }
  }
  if (command === "eject") {
    setInjectionEnabled(false);
    const selectedPort = Number(option([action, ...args].filter(Boolean) as string[], "--port") ?? cdpPort);
    await stopInjector();
    return print(await cdpEject(selectedPort, accessToken(), injectionOwnership()));
  }
  await ensureRuntime();
  if (command === "project" && action === "list") return print(await request("/api/projects"));
  if (command === "project" && action === "create") {
    const values = positionals(args);
    const name = option(args, "--name") ?? values.join(" ");
    return print(await request("/api/projects", { method: "POST", body: JSON.stringify({ name, workspace_path: option(args, "--workspace") ?? process.cwd() }) }));
  }
  if (command === "agent" && action === "list") {
    const bootstrap = await request("/api/bootstrap") as { agents?: unknown[] };
    return print(bootstrap.agents ?? []);
  }
  if (command === "issue") return issueCommand(action, args);
  usage();
}

void main().catch(error => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

process.once("exit", () => {
  if (commandArguments()[0] === "watch-inject" && existsSync(injectorPidPath)) {
    const recorded = Number(readFileSync(injectorPidPath, "utf8"));
    if (recorded === process.pid) unlinkSync(injectorPidPath);
  }
});

if (["runtime", "serve"].includes(commandArguments()[0])) ensureDirectories();
if (["runtime", "serve"].includes(commandArguments()[0])) console.log(`Better Codex home: ${betterCodexHome}`);
