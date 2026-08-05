#!/usr/bin/env node
import { spawn } from "node:child_process";
import { closeSync, existsSync, openSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { isSea } from "node:sea";
import { createInterface } from "node:readline/promises";
import { cdpEject, cdpInject, cdpOpenThread, cdpRestartAndInject, cdpStatus, watchInjection } from "./cdp.js";
import {
  cdpPort,
  ensureDirectories,
  injectorLogPath,
  injectorPidPath,
  betterCodexHome,
  runtimeLogPath,
  token,
} from "./config.js";
import { readRuntimeState } from "./runtime-state.js";
import { injectionEnabled, setInjectionEnabled } from "./injection-state.js";
import { installService, restartService, serviceLogs, serviceStatus, startService, stopService, uninstallService } from "./service.js";

function accessToken() {
  return token();
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
  });
  if (detached) child.unref();
  closeSync(descriptor);
  return child;
}

async function ensureRuntime() {
  try {
    return await health();
  } catch {
    if (process.platform === "darwin" && serviceStatus().installed) startService();
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
  console.log("better-codex version | setup [--yes] | enable | disable | start [--launch] | stop | status | inject [--launch] [--port N] | eject [--port N] | service install|uninstall|start|stop|restart|status|logs | project list|create | issue list|get|create|update|status|link|open");
}

async function confirmSetup() {
  if (!process.stdin.isTTY || !process.stdout.isTTY) throw new Error("setup_requires_interactive_terminal");
  const terminal = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = await terminal.question("Better Codex needs to quit and restart Codex to enable local injection. Continue? [y/N] ");
    return /^(y|yes)$/i.test(answer.trim());
  } finally {
    terminal.close();
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
        priority: option(args, "--priority") ?? "medium",
        thread_id: option(args, "--thread") ?? process.env.CODEX_THREAD_ID ?? "",
        workspace_path: option(args, "--workspace") ?? process.cwd(),
      }),
    }));
  }
  const id = args[0] ?? "";
  const issue = await request(`/api/issues/${encodeURIComponent(id)}`) as { version?: number; thread_id?: string };
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
    for (const [key, flag] of [["title", "--title"], ["description", "--description"], ["priority", "--priority"], ["status", "--status"]]) {
      const value = option(args, flag);
      if (value !== undefined) patch[key] = value;
    }
    return print(await request(`/api/issues/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(patch) }));
  }
  if (action === "open") {
    if (!issue.thread_id) throw new Error("issue_has_no_thread");
    return print(await cdpOpenThread(Number(option(args, "--port") ?? cdpPort), issue.thread_id));
  }
  usage();
}

async function main() {
  const [command, action, ...args] = process.argv.slice(2);
  if (command === "version" || command === "--version" || command === "-v") return console.log("better-codex 0.2.0");
  if (command === "runtime") return runRuntime();
  if (command === "serve") return (await import("./server.js")).startServer();
  if (command === "watch-inject") return watchInjection(Number(action || cdpPort), accessToken());
  if (command === "setup") {
    if (![action, ...args].includes("--yes") && !(await confirmSetup())) return print({ configured: false });
    setInjectionEnabled(false);
    await stopInjector();
    try {
      const runtime = await ensureRuntime();
      const injection = await cdpRestartAndInject(cdpPort, activeRuntimePort(), accessToken());
      setInjectionEnabled(true);
      const pid = await waitForInjector();
      return print({ configured: true, runtime, injection, injectorPid: pid });
    } catch (error) {
      setInjectionEnabled(false);
      await stopInjector();
      throw error;
    }
  }
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

const persistentCommand = ["runtime", "serve", "watch-inject"].includes(process.argv[2]);

void main().then(() => {
  if (!persistentCommand) setImmediate(() => process.exit(0));
}).catch(error => {
  console.error(error instanceof Error ? error.message : error);
  if (!persistentCommand) setImmediate(() => process.exit(1));
  else process.exitCode = 1;
});

process.once("exit", () => {
  if (process.argv[2] === "watch-inject" && existsSync(injectorPidPath)) {
    const recorded = Number(readFileSync(injectorPidPath, "utf8"));
    if (recorded === process.pid) unlinkSync(injectorPidPath);
  }
});

if (["runtime", "serve"].includes(process.argv[2])) ensureDirectories();
if (["runtime", "serve"].includes(process.argv[2])) console.log(`Better Codex home: ${betterCodexHome}`);
