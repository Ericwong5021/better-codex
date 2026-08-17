#!/usr/bin/env node
import { execFileSync, spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { accessSync, closeSync, constants, cpSync, existsSync, mkdirSync, openSync, readFileSync, readdirSync, renameSync, rmSync, statSync, unlinkSync, utimesSync, writeFileSync } from "node:fs";
import { isSea } from "node:sea";
import { homedir, hostname } from "node:os";
import { dirname, join, resolve } from "node:path";
import { createInterface } from "node:readline/promises";
import { cdpEject, cdpInject, cdpOpenThread, cdpRestartAndInject, cdpStatus, codexInstallationStatus, codexProcessRunning, chooseCodexRestartAction, launchCodex, requiresCodexRestartForLaunch, watchInjection } from "./cdp.js";
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
  syncConfigPath,
} from "./config.js";
import { readRuntimeState } from "./runtime-state.js";
import { injectionEnabled, setInjectionEnabled } from "./injection-state.js";
import { installLaunchIntegration, launchIntegrationStatus, uninstallLaunchIntegration } from "./launch-integration.js";
import { readCodexLocale } from "./locale.js";
import { betterCodexMcpName, startMcpAppServer } from "./mcp-app.js";
import { packagedBuild } from "./build.js";
import { installService, repairServiceConfiguration, restartService, serviceLogs, serviceStatus, startService, stopService, uninstallService } from "./service.js";
import { activeVersions, checkForUpdates, maybeDelegateToActiveCore, recordGatewayUpdateActivation, rollbackActivatedUpdate, rollbackAllUpdates, selectedUpdateChannel, setUpdateChannel, updateAll, updateCompatibility, type UpdateChannel } from "./updater.js";
import { requireCodexExecutablePath } from "./codex-cli.js";
import { normalizeHubUrl, readSyncConfiguration, removeSyncConfiguration, writeSyncConfiguration } from "./sync-config.js";

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

async function health() {
  const runtime = readRuntimeState();
  if (!runtime) throw new Error("runtime_unavailable");
  const response = await fetch(`http://127.0.0.1:${runtime.port}/health`);
  if (!response.ok) throw new Error("runtime_unavailable");
  const value = await response.json() as Record<string, unknown>;
  if (value.instanceId !== runtime.instanceId || value.pid !== runtime.pid) throw new Error("runtime_identity_mismatch");
  return value;
}

function spawnSelf(args: string[], logFile: string, detached = true) {
  ensureDirectories();
  const descriptor = openSync(logFile, "a");
  const ownArgs = isSea() ? args : [...process.execArgv, process.argv[1], ...args];
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

async function ensureRuntime() {
  await stopLegacyRuntime();
  repairServiceConfiguration();
  try {
    return await health();
  } catch {
    if (betterCodexProfile === "stable" && serviceStatus().installed) startService();
    else spawnSelf(["runtime"], runtimeLogPath);
    for (let attempt = 0; attempt < 60; attempt += 1) {
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

function startInjector(portNumber: number) {
  const existing = injectorPid();
  if (existing) return existing;
  const pid = spawnSelf(["watch-inject", String(portNumber)], injectorLogPath).pid;
  if (!pid) throw new Error("injector_start_failed");
  writeFileSync(injectorPidPath, String(pid));
  return pid;
}

async function waitForInjector() {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const pid = injectorPid();
    if (pid) return pid;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error("injector_start_failed");
}

async function runRuntime() {
  await stopLegacyRuntime();
  const server = (await import("./server.js")).startServer();
  await stopInjector();
  let stopping = false;
  let watcher: ReturnType<typeof spawn> | null = null;
  const startWatcher = () => {
    if (stopping || watcher || !injectionEnabled()) return;
    watcher = spawnSelf(["watch-inject", String(cdpPort)], injectorLogPath, false);
    if (!watcher.pid) throw new Error("injector_start_failed");
    writeFileSync(injectorPidPath, String(watcher.pid));
    watcher.once("exit", () => {
      watcher = null;
    });
  };
  const reconcileWatcher = () => {
    if (!injectionEnabled()) {
      watcher?.kill("SIGTERM");
      return;
    }
    startWatcher();
  };
  startWatcher();
  const watcherTimer = setInterval(reconcileWatcher, 1000);
  watcherTimer.unref();
  process.once("exit", () => {
    stopping = true;
    clearInterval(watcherTimer);
    watcher?.kill("SIGTERM");
    if (watcher?.pid && existsSync(injectorPidPath)) {
      const recorded = Number(readFileSync(injectorPidPath, "utf8"));
      if (recorded === watcher.pid) unlinkSync(injectorPidPath);
    }
  });
  return server;
}

async function applyUpdate(previousRuntimePid: number, updates: { core: string | null; compatibility: string | null }, drainPath?: string) {
  try {
    recordGatewayUpdateActivation("activating", null, updates, process.pid);
    const stopDeadline = Date.now() + updateRuntimeStopTimeout;
    while (processAlive(previousRuntimePid) && (!drainPath || !existsSync(drainPath))) {
      if (Date.now() >= stopDeadline) throw new Error("update_runtime_stop_timeout");
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    if (drainPath && existsSync(drainPath)) unlinkSync(drainPath);
    setInjectionEnabled(false);
    installService();
    await ensureRuntime();
    const injection = await cdpRestartAndInject(cdpPort, activeRuntimePort(), accessToken());
    const launchIntegration = installLaunchIntegration();
    const runtime = await health();
    if (updates.core && runtime.version !== updates.core) throw new Error("core_activation_version_mismatch");
    if (updates.compatibility && activeVersions().compatibility !== updates.compatibility) throw new Error("compatibility_activation_version_mismatch");
    recordGatewayUpdateActivation("success");
    return { updated: true, runtime, injection, launchIntegration };
  } catch (error) {
    rollbackActivatedUpdate(updates);
    try {
      installService();
      await ensureRuntime();
    } catch {}
    recordGatewayUpdateActivation("error", error instanceof Error ? error.message : "update_activation_failed");
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
  console.log("better-codex version | web | sync connect <url> [--pairing-code CODE|--admin-token TOKEN] [--transport auto|websocket|http] | sync migrate --to <url> --from-admin-token TOKEN | sync status|now|disconnect | update [check|compatibility|rollback|channel stable|preview] [--channel stable|preview] | setup [--yes] | launch [--restart] | launcher install|uninstall|status | mcp install|uninstall|status | doctor | enable | disable | start [--launch] | stop | status | uninstall | data delete [--yes] | inject [--launch] [--port N] | eject [--port N] | service install|uninstall|start|stop|restart|status|logs | project list|create | agent list | issue list|get|create|update|status|open");
}

function selfCommand() {
  if (isSea()) return [resolve(process.env.BETTER_CODEX_LAUNCHER_PATH ?? process.execPath)];
  return [resolve(process.execPath), ...process.execArgv, resolve(process.argv[1])];
}

function codexCliPath() {
  return requireCodexExecutablePath({ applicationPath: codexInstallationStatus().path });
}

function mcpStatus() {
  try {
    const value = execFileSync(codexCliPath(), ["mcp", "get", betterCodexMcpName, "--json"], { encoding: "utf8", windowsHide: true });
    return { installed: true, configuration: JSON.parse(value) as unknown };
  } catch {
    return { installed: false };
  }
}

function installMcp() {
  const cli = codexCliPath();
  const [command, ...commandArgs] = selfCommand();
  const expectedArgs = [...commandArgs, "mcp"];
  const current = mcpStatus();
  if (current.installed) {
    const transport = (current.configuration as { transport?: { command?: string; args?: string[] } }).transport;
    if (transport?.command === command && JSON.stringify(transport.args ?? []) === JSON.stringify(expectedArgs)) return { ...current, existing: true };
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
  const installed = existsSync(join(codexHome, "skills", "better-codex", "SKILL.md")) && existsSync(updatePublicKeyPath);
  const obsoleteIssueSkill = join(codexHome, "skills", "better-codex-issue");
  const launcher = process.env.BETTER_CODEX_LAUNCHER_PATH;
  const candidates = [
    process.env.BETTER_CODEX_SKILLS_PATH,
    join(dirname(process.execPath), "..", "libexec", "skills"),
    packagedBuild && process.argv[1] ? packagedLibexecSkillsPath(process.argv[1]) : null,
    launcher ? join(dirname(launcher), "..", "libexec", "skills") : null,
  ].filter((value): value is string => Boolean(value));
  const source = candidates.find(path => existsSync(join(path, "better-codex", "SKILL.md")) && existsSync(resolve(path, "..", "update-public-key.pem")));
  if (!source) {
    if (installed) rmSync(obsoleteIssueSkill, { recursive: true, force: true });
    return installed
      ? { installed: true, existing: true, path: join(codexHome, "skills"), updateKey: true }
      : { installed: false, reason: "bundled_skills_unavailable", updateKey: false };
  }
  mkdirSync(join(codexHome, "skills"), { recursive: true });
  cpSync(join(source, "better-codex"), join(codexHome, "skills", "better-codex"), { recursive: true, force: true });
  rmSync(obsoleteIssueSkill, { recursive: true, force: true });
  const publicKey = resolve(source, "..", "update-public-key.pem");
  mkdirSync(dirname(updatePublicKeyPath), { recursive: true });
  cpSync(publicKey, updatePublicKeyPath, { force: true });
  return { installed: true, path: join(codexHome, "skills"), updateKey: true };
}

async function doctor() {
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
  const updateKey = (!isSea() && !packagedBuild) || existsSync(updatePublicKeyPath);
  const checks = {
    core: { ok: true, ...activeVersions(), profile: betterCodexProfile, home: betterCodexHome, executable: process.env.BETTER_CODEX_LAUNCHER_PATH ?? process.execPath },
    service: { ok: service.installed, ...service },
    runtime,
    database,
    codex,
    compatibility,
    injection,
    skills,
    mcp,
    updateKey,
  };
  return { ok: Boolean(runtime.ok) && Boolean((database as { ok?: boolean }).ok) && codex.installed && Boolean((compatibility as { compatible?: boolean } | null)?.compatible) && injection.available && skills.betterCodex && mcp.installed && updateKey, checks };
}

async function uninstall() {
  const dataHome = resolve(betterCodexHome);
  if (dataHome === resolve(homedir()) || dirname(dataHome) === dataHome) throw new Error("unsafe_better_codex_home");
  setInjectionEnabled(false);
  await stopInjector();
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
  const paths = [databasePath, `${databasePath}-wal`, `${databasePath}-shm`, join(dirname(databasePath), "backups"), syncConfigPath];
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
    const adminToken = option(args, "--admin-token") ?? process.env.BETTER_CODEX_CLOUDFLARE_ADMIN_TOKEN;
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
      await ensureRuntime();
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
  if (command === "apply-update") {
    const versions = activeVersions();
    return print(await applyUpdate(Number(action), {
      core: option(args, "--expected-core") ?? (args.includes("--core-updated") ? versions.core : null),
      compatibility: option(args, "--expected-compatibility") ?? (args.includes("--compatibility-updated") ? versions.compatibility : null),
    }, option(args, "--drain-path")));
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
    if (result.compatibility.updated && injectionEnabled()) {
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
        startInjector(cdpPort);
        return { launched: true, restarted: false, codexStarted: true, switchedFrom, injection };
      }
      if (restartChoice === "reset-runtime") {
        await restartRuntime();
        setInjectionEnabled(true);
        launchCodex(cdpPort, true);
        startInjector(cdpPort);
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
          startInjector(cdpPort);
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
          startInjector(cdpPort);
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
        await waitForInjector();
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
    if (!values.includes("--yes") && !(await confirmSetup())) return print({ configured: false });
    progress("installing_runtime", json);
    setInjectionEnabled(false);
    await stopInjector();
    try {
      try { await request("/api/shutdown", { method: "POST" }); } catch {}
      const skills = installBundledSkills();
      if (!skills.installed || !skills.updateKey) throw new Error("reason" in skills ? skills.reason : "bundled_assets_unavailable");
      const mcp = installMcp();
      installService();
      progress("starting_runtime", json);
      const runtime = await ensureRuntime();
      progress("waiting_for_codex", json);
      if (!codexInstallationStatus().installed) throw new Error("codex_not_found");
      progress("injecting", json);
      const injection = await cdpRestartAndInject(cdpPort, activeRuntimePort(), accessToken());
      setInjectionEnabled(true);
      const pid = await waitForInjector();
      const launchIntegration = installLaunchIntegration();
      progress("ready", json);
      return print({ configured: true, stages: ["installing_runtime", "installing_mcp", "starting_runtime", "waiting_for_codex", "injecting", "installing_launcher", "ready"], runtime, injection, launchIntegration, skills, mcp, injectorPid: pid });
    } catch (error) {
      setInjectionEnabled(false);
      await stopInjector();
      throw error;
    }
  }
  if (command === "doctor") return print(await doctor());
  if (command === "sync") return syncCommand(action, args);
  if (command === "enable") {
    setInjectionEnabled(false);
    await stopInjector();
    try {
      const runtime = await ensureRuntime();
      const selectedPort = Number(option([action, ...args].filter(Boolean) as string[], "--port") ?? cdpPort);
      await cdpInject(selectedPort, activeRuntimePort(), accessToken(), false);
      setInjectionEnabled(true);
      await waitForInjector();
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
      return print(installService());
    }
    if (action === "uninstall") return print(uninstallService());
    if (action === "start") return print(startService());
    if (action === "stop") return print(stopService());
    if (action === "restart") return print(restartService());
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
      startInjector(selectedPort);
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
        const injectorPid = await waitForInjector();
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
      const pid = await waitForInjector();
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
