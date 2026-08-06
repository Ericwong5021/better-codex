#!/usr/bin/env node
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { accessSync, closeSync, constants, existsSync, mkdirSync, openSync, readFileSync, realpathSync, renameSync, rmSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import { isSea } from "node:sea";
import { dirname, join, resolve } from "node:path";
import { createInterface } from "node:readline/promises";
import { cdpEject, cdpInject, cdpOpenThread, cdpRestartAndInject, cdpStatus, codexInstallationStatus, launchCodex, watchInjection } from "./cdp.js";
import {
  cdpPort,
  databasePath,
  ensureDirectories,
  injectorLogPath,
  injectorPidPath,
  betterCodexHome,
  launchLockPath,
  logPath,
  managedRuntimePath,
  runPath,
  runtimeLogPath,
  updatePublicKeyPath,
  token,
} from "./config.js";
import { readRuntimeState } from "./runtime-state.js";
import { injectionEnabled, setInjectionEnabled } from "./injection-state.js";
import { installLaunchIntegration, launchIntegrationStatus, uninstallLaunchIntegration } from "./launch-integration.js";
import { installService, restartService, serviceLogs, serviceStatus, startService, stopService, uninstallService } from "./service.js";
import { activeVersions, checkForUpdates, maybeDelegateToActiveCore, rollbackCompatibilityUpdate, updateAll, updateCompatibility } from "./updater.js";

function accessToken() {
  return token();
}

function commandArguments() {
  const values = process.argv.slice(2);
  const launcher = process.env.BETTER_CODEX_LAUNCHER_PATH;
  const canonical = (value: string) => {
    try { return realpathSync(value); } catch { return resolve(value); }
  };
  if (launcher && values[0] && canonical(values[0]) === canonical(launcher)) values.shift();
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
  try {
    return await health();
  } catch {
    if (serviceStatus().installed) startService();
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

function activeRuntimePort() {
  const runtime = readRuntimeState();
  if (!runtime) throw new Error("runtime_unavailable");
  return runtime.port;
}

function processAlive(pid: number) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function injectorPid() {
  if (!existsSync(injectorPidPath)) return null;
  const pid = Number(readFileSync(injectorPidPath, "utf8"));
  return Number.isInteger(pid) && processAlive(pid) ? pid : null;
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

async function applyUpdate(previousRuntimePid: number) {
  for (let attempt = 0; attempt < 100 && processAlive(previousRuntimePid); attempt += 1) {
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  if (processAlive(previousRuntimePid)) throw new Error("update_runtime_stop_timeout");
  setInjectionEnabled(false);
  installService();
  await ensureRuntime();
  let injection: unknown;
  try {
    injection = await cdpRestartAndInject(cdpPort, activeRuntimePort(), accessToken());
  } finally {
    setInjectionEnabled(true);
  }
  const launchIntegration = installLaunchIntegration();
  return { updated: true, runtime: await health(), injection, launchIntegration };
}

async function withLaunchLock<T>(operation: () => Promise<T>) {
  ensureDirectories();
  const token = randomUUID();
  let acquired = false;
  for (let attempt = 0; attempt < 100; attempt += 1) {
    let created = false;
    try {
      mkdirSync(launchLockPath, { mode: 0o700 });
      created = true;
      writeFileSync(join(launchLockPath, "owner.json"), JSON.stringify({ pid: process.pid, token }), { mode: 0o600 });
      acquired = true;
      break;
    } catch (error) {
      if (created) {
        rmSync(launchLockPath, { recursive: true, force: true });
        throw error;
      }
      let owner: { pid?: number } | null = null;
      try { owner = JSON.parse(readFileSync(join(launchLockPath, "owner.json"), "utf8")) as { pid?: number }; } catch {}
      let stale = Boolean(owner?.pid && !processAlive(owner.pid));
      if (!owner?.pid) {
        try { stale = Date.now() - statSync(launchLockPath).mtimeMs > 30_000; } catch {}
      }
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
  try {
    return await operation();
  } finally {
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
    process.kill(pid, "SIGTERM");
    for (let attempt = 0; attempt < 30 && processAlive(pid); attempt += 1) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  if (existsSync(injectorPidPath)) unlinkSync(injectorPidPath);
}

function print(value: unknown) {
  console.log(JSON.stringify(value, null, 2));
}

function usage() {
  console.log("better-codex version | update [check|compatibility|rollback] [--channel stable|preview] | setup [--yes] | launch | launcher install|uninstall|status | doctor | enable | disable | start [--launch] | stop | status | uninstall | data delete [--yes] | inject [--launch] [--port N] | eject [--port N] | service install|uninstall|start|stop|restart|status|logs | project list|create | issue list|get|create|update|status|link|open");
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
  const checks = {
    core: { ok: true, ...activeVersions(), executable: process.env.BETTER_CODEX_LAUNCHER_PATH ?? process.execPath },
    service: { ok: service.installed, ...service },
    runtime,
    database,
    codex,
    compatibility,
    injection,
  };
  return { ok: Boolean(runtime.ok) && Boolean((database as { ok?: boolean }).ok) && codex.installed && Boolean((compatibility as { compatible?: boolean } | null)?.compatible) && injection.available, checks };
}

async function uninstall() {
  setInjectionEnabled(false);
  await stopInjector();
  let injection: unknown = { removed: false, reason: "cdp_unavailable" };
  try { injection = await cdpEject(cdpPort, accessToken()); } catch {}
  try { await request("/api/shutdown", { method: "POST" }); } catch {}
  const launchIntegration = uninstallLaunchIntegration();
  const service = uninstallService();
  const programPaths = [runPath, logPath, managedRuntimePath, updatePublicKeyPath];
  const binaries = isSea()
    ? [...new Set([process.env.BETTER_CODEX_LAUNCHER_PATH, process.execPath].filter((value): value is string => Boolean(value)).map(value => resolve(value)))]
    : [];
  if (process.platform === "win32" && binaries.length > 0) {
    const cleanup = [...programPaths, ...binaries].map(path => `Remove-Item -LiteralPath '${path.replace(/'/g, "''")}' -Recurse -Force -ErrorAction SilentlyContinue`).join("; ");
    const command = `Start-Sleep -Milliseconds 800; ${cleanup}`;
    const child = spawn("powershell.exe", ["-NoProfile", "-NonInteractive", "-WindowStyle", "Hidden", "-Command", command], { detached: true, stdio: "ignore", windowsHide: true });
    child.unref();
  } else {
    for (const path of programPaths) rmSync(path, { recursive: true, force: true });
    for (const path of binaries) rmSync(path, { force: true });
  }
  return { uninstalled: true, service, launchIntegration, injection, binaries, dataPreserved: [databasePath, join(dirname(databasePath), "backups")] };
}

async function deleteData(confirmed: boolean) {
  if (readRuntimeState()) throw new Error("data_delete_requires_stopped_runtime");
  const paths = [databasePath, `${databasePath}-wal`, `${databasePath}-shm`, join(dirname(databasePath), "backups")];
  if (!confirmed && !(await confirmDataDelete(paths))) return { deleted: false, paths };
  for (const path of paths) rmSync(path, { recursive: true, force: true });
  return { deleted: true, paths };
}

function progress(stage: string, json: boolean) {
  if (!json) console.error(stage);
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
        thread_id: option(args, "--thread") ?? process.env.CODEX_THREAD_ID ?? "",
        workspace_path: option(args, "--workspace") ?? process.cwd(),
      }),
    }));
  }
  const id = args[0] ?? "";
  const issue = await request(`/api/issues/${encodeURIComponent(id)}`) as { version?: number; thread_id?: string; run_thread_id?: string };
  if (action === "status") {
    return print(await request(`/api/issues/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify({ version: issue.version, status: args[1] }) }));
  }
  if (action === "link") {
    const threadId = args[1] ?? process.env.CODEX_THREAD_ID;
    if (!threadId) throw new Error("thread_required");
    return print(await request(`/api/issues/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify({ version: issue.version, thread_id: threadId }) }));
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
  if (command === "apply-update") return print(await applyUpdate(Number(action)));
  if (command === "version" || command === "--version" || command === "-v") {
    const versions = activeVersions();
    if ([action, ...args].includes("--json")) return console.log(JSON.stringify(versions));
    return console.log(`better-codex core ${versions.core} compatibility ${versions.compatibility}`);
  }
  if (command === "update") {
    const values = [action, ...args].filter(Boolean) as string[];
    const selected = option(values, "--channel") ?? "stable";
    if (!["stable", "preview"].includes(selected)) throw new Error("update_channel_invalid");
    const channel = selected as "stable" | "preview";
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
    if (action === "rollback") return print(rollbackCompatibilityUpdate());
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
  if (command === "watch-inject") return watchInjection(Number(action || cdpPort), accessToken());
  if (command === "launch") {
    return print(await withLaunchLock(async () => {
      if (!injectionEnabled()) {
        launchCodex(cdpPort, true);
        return { launched: true, injectionDisabled: true };
      }
      await ensureRuntime();
      const current = await cdpStatus(cdpPort);
      if (current.available) {
        setInjectionEnabled(true);
        await cdpInject(cdpPort, activeRuntimePort(), accessToken(), false);
        startInjector(cdpPort);
        launchCodex(cdpPort, true);
      } else {
        setInjectionEnabled(false);
        await stopInjector();
        try {
          await cdpRestartAndInject(cdpPort, activeRuntimePort(), accessToken());
          setInjectionEnabled(true);
          await waitForInjector();
        } catch (error) {
          setInjectionEnabled(false);
          throw error;
        }
      }
      return { launched: true, injection: await cdpStatus(cdpPort) };
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
      return print({ configured: true, stages: ["installing_runtime", "starting_runtime", "waiting_for_codex", "injecting", "installing_launcher", "ready"], runtime, injection, launchIntegration, injectorPid: pid });
    } catch (error) {
      setInjectionEnabled(false);
      await stopInjector();
      throw error;
    }
  }
  if (command === "doctor") return print(await doctor());
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
    try { injection = await cdpEject(selectedPort, accessToken()); } catch {}
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
    setInjectionEnabled(true);
    const runtime = await ensureRuntime();
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
    try { await cdpEject(cdpPort, accessToken()); } catch {}
    let runtime: unknown = { stopped: true, alreadyStopped: true };
    try { runtime = await request("/api/shutdown", { method: "POST" }); } catch {}
    return print({ runtime, injection: { stopped: true } });
  }
  if (command === "status") {
    let runtime: unknown;
    try { runtime = await health(); } catch (error) { runtime = { ok: false, error: error instanceof Error ? error.message : "runtime_unavailable" }; }
    return print({ runtime, injection: await cdpStatus(Number(option([action, ...args].filter(Boolean) as string[], "--port") ?? cdpPort)), injectionEnabled: injectionEnabled(), injectorPid: injectorPid() });
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
    return print(await cdpEject(selectedPort, accessToken()));
  }
  await ensureRuntime();
  if (command === "project" && action === "list") return print(await request("/api/projects"));
  if (command === "project" && action === "create") {
    const values = positionals(args);
    const name = option(args, "--name") ?? values.join(" ");
    return print(await request("/api/projects", { method: "POST", body: JSON.stringify({ name, workspace_path: option(args, "--workspace") ?? process.cwd() }) }));
  }
  if (command === "issue") return issueCommand(action, args);
  usage();
}

const persistentCommand = ["runtime", "serve", "watch-inject"].includes(commandArguments()[0]);

void main().then(() => {
  if (!persistentCommand) setImmediate(() => process.exit(0));
}).catch(error => {
  console.error(error instanceof Error ? error.message : error);
  if (!persistentCommand) setImmediate(() => process.exit(1));
  else process.exitCode = 1;
});

process.once("exit", () => {
  if (commandArguments()[0] === "watch-inject" && existsSync(injectorPidPath)) {
    const recorded = Number(readFileSync(injectorPidPath, "utf8"));
    if (recorded === process.pid) unlinkSync(injectorPidPath);
  }
});

if (["runtime", "serve"].includes(commandArguments()[0])) ensureDirectories();
if (["runtime", "serve"].includes(commandArguments()[0])) console.log(`Better Codex home: ${betterCodexHome}`);
