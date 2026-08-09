#!/usr/bin/env node
import { execFileSync, spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { accessSync, closeSync, constants, cpSync, existsSync, mkdirSync, openSync, readFileSync, realpathSync, renameSync, rmSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import { isSea } from "node:sea";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { createInterface } from "node:readline/promises";
import { cdpEject, cdpInject, cdpOpenThread, cdpRestartAndInject, cdpStatus, codexInstallationStatus, codexProcessRunning, launchCodex, watchInjection } from "./cdp.js";
import { removeManagedAgentProfiles } from "./agent-profiles.js";
import { coreVersion } from "./compatibility.js";
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
import { readCodexLocale } from "./locale.js";
import { betterCodexMcpName, startMcpAppServer } from "./mcp-app.js";
import { showNativeChoiceDialog } from "./native-dialog.js";
import { installService, restartService, serviceLogs, serviceStatus, startService, stopService, uninstallService } from "./service.js";
import { activeVersions, checkForUpdates, maybeDelegateToActiveCore, recordGatewayUpdateActivation, rollbackCompatibilityUpdate, rollbackCoreUpdate, updateAll, updateCompatibility } from "./updater.js";

function accessToken() {
  return token();
}

const legacyRuntimePort = 4317;

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
  await stopLegacyRuntime();
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

function confirmLaunchRestart() {
  const chinese = readCodexLocale() === "zh-CN";
  const message = chinese
    ? "当前进程正在运行。\n\n请选择操作。"
    : "The current process is already running.\n\nChoose an action.";
  return showNativeChoiceDialog({
    message,
    title: "Better Codex",
    primaryLabel: chinese ? "重启进程" : "Restart process",
    secondaryLabel: chinese ? "直接打开" : "Open directly",
  });
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

function processAlive(pid: number) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function isInjectorProcess(pid: number) {
  try {
    if (process.platform === "win32") {
      const commandLine = execFileSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", `(Get-CimInstance Win32_Process -Filter \"ProcessId = ${pid}\").CommandLine`], { encoding: "utf8", windowsHide: true }).trim();
      return /\bwatch-inject\b/.test(commandLine);
    }
    const commandLine = execFileSync("ps", ["-p", String(pid), "-o", "command="], { encoding: "utf8" }).trim();
    return /\bwatch-inject\b/.test(commandLine);
  } catch {
    return false;
  }
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
    while (processAlive(previousRuntimePid) && (!drainPath || !existsSync(drainPath))) {
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
    if (updates.core) rollbackCoreUpdate(updates.core);
    if (updates.compatibility) rollbackCompatibilityUpdate(updates.compatibility);
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
  console.log("better-codex version | update [check|compatibility|rollback] [--channel stable|preview] | setup [--yes] | launch | launcher install|uninstall|status | mcp install|uninstall|status | doctor | enable | disable | start [--launch] | stop | status | uninstall | data delete [--yes] | inject [--launch] [--port N] | eject [--port N] | service install|uninstall|start|stop|restart|status|logs | project list|create | agent list | issue list|get|create|update|status|open");
}

function selfCommand() {
  if (isSea()) return [resolve(process.env.BETTER_CODEX_LAUNCHER_PATH ?? process.execPath)];
  return [resolve(process.execPath), ...process.execArgv, resolve(process.argv[1])];
}

function codexCliPath() {
  const application = codexInstallationStatus().path;
  const candidates = [
    process.env.CODEX_CLI_PATH,
    application && process.platform === "darwin" ? join(application, "Contents", "Resources", "codex") : null,
    application && process.platform === "win32" ? join(application, "app", "resources", "codex.exe") : null,
    application && process.platform === "win32" ? join(application, "resources", "codex.exe") : null,
    application && process.platform === "win32" ? join(application, "codex.exe") : null,
  ].find((value): value is string => typeof value === "string" && existsSync(value));
  if (!candidates) throw new Error("codex_cli_not_found");
  return candidates;
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
  const updateKey = !isSea() || existsSync(updatePublicKeyPath);
  const checks = {
    core: { ok: true, ...activeVersions(), executable: process.env.BETTER_CODEX_LAUNCHER_PATH ?? process.execPath },
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
  try { injection = await cdpEject(cdpPort, accessToken()); } catch {}
  try { await request("/api/shutdown", { method: "POST" }); } catch {}
  const launchIntegration = uninstallLaunchIntegration();
  const mcp = uninstallMcp();
  const service = uninstallService();
  const codexHome = process.env.CODEX_HOME || join(homedir(), ".codex");
  const agentProfiles = removeManagedAgentProfiles(codexHome);
  const programPaths = [...new Set([
    dataHome,
    databasePath,
    `${databasePath}-wal`,
    `${databasePath}-shm`,
    join(dirname(databasePath), "backups"),
    join(codexHome, "skills", "better-codex"),
    join(codexHome, "skills", "better-codex-issue"),
  ].map(path => resolve(path)))];
  const binaries = isSea()
    ? [...new Set([process.env.BETTER_CODEX_LAUNCHER_PATH, process.execPath].filter((value): value is string => Boolean(value)).map(value => resolve(value)))]
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
  return { uninstalled: true, service, launchIntegration, mcp, injection, agentProfiles, removed: programPaths, binaries: removableBinaries, packageManagedBinaries: binaries.filter(path => !removableBinaries.includes(path)), dataPreserved: [] };
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
  if (command === "mcp" && !action) return startMcpAppServer();
  if (command === "mcp") {
    if (action === "install") return print(installMcp());
    if (action === "uninstall") return print(uninstallMcp());
    if (action === "status") return print(mcpStatus());
    return usage();
  }
  if (command === "launch") {
    return print(await withLaunchLock(async () => {
      const current = await cdpStatus(cdpPort);
      const codexRunning = codexProcessRunning() || current.available || current.targets.length > 0;
      if (!codexRunning) {
        setInjectionEnabled(true);
        await ensureRuntime();
        const injection = await cdpInject(cdpPort, activeRuntimePort(), accessToken(), true);
        startInjector(cdpPort);
        return { launched: true, restarted: false, codexStarted: true, injection };
      }
      if (!confirmLaunchRestart()) {
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
        const injection = await cdpRestartAndInject(cdpPort, activeRuntimePort(), accessToken(), { confirmQuit: false });
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
  if (command === "agent" && action === "list") {
    const bootstrap = await request("/api/bootstrap") as { agents?: unknown[] };
    return print(bootstrap.agents ?? []);
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
