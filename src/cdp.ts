import { execFileSync, spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { activeCompatibility, capabilityExpression, clearCompatibilityStatus, missingCapabilities, navigationExpression, readCompatibilityStatus, targetAllowed, type RendererCapabilities, writeCompatibilityStatus } from "./compatibility.js";
import { betterCodexProfile } from "./config.js";
import { injectionScript, injectionVersion } from "./dom.js";
import { recordInjectionOwnership, setInjectionEnabled } from "./injection-state.js";
import { readCodexLocale } from "./locale.js";
import { showNativeChoiceDialog } from "./native-dialog.js";
import { readRuntimeState } from "./runtime-state.js";

type Target = {
  id: string;
  type?: string;
  title?: string;
  url?: string;
  webSocketDebuggerUrl?: string;
};

type CdpReply = {
  id?: number;
  result?: unknown;
  error?: { message?: string };
};

const cdpHttpTimeoutMs = 1500;
const cdpWebSocketOpenTimeoutMs = 2000;
const cdpCommandTimeoutMs = 8000;
const cdpTargetScanTimeoutMs = 30_000;
const cdpTargetCandidateLimit = 32;

class Connection {
  private sequence = 0;
  private socket: WebSocket;

  constructor(
    url: string,
    private readonly openTimeoutMs = cdpWebSocketOpenTimeoutMs,
    private readonly commandTimeoutMs = cdpCommandTimeoutMs,
    private readonly deadlineAt?: number,
  ) {
    this.socket = new WebSocket(url);
  }

  private timeoutBudget(limit: number) {
    if (this.deadlineAt === undefined) return limit;
    return Math.max(1, Math.min(limit, this.deadlineAt - Date.now()));
  }

  open() {
    return new Promise<void>((resolve, reject) => {
      const cleanup = () => {
        clearTimeout(timer);
        this.socket.removeEventListener("open", onOpen);
        this.socket.removeEventListener("error", onError);
      };
      const onOpen = () => { cleanup(); resolve(); };
      const onError = () => { cleanup(); reject(new Error("cdp_websocket_error")); };
      const timer = setTimeout(() => {
        cleanup();
        try { this.socket.close(); } catch {}
        reject(new Error("cdp_websocket_timeout"));
      }, this.timeoutBudget(this.openTimeoutMs));
      this.socket.addEventListener("open", onOpen, { once: true });
      this.socket.addEventListener("error", onError, { once: true });
    });
  }

  send(method: string, params: Record<string, unknown> = {}) {
    const id = ++this.sequence;
    return new Promise<Record<string, unknown>>((resolve, reject) => {
      const cleanup = () => {
        clearTimeout(timer);
        this.socket.removeEventListener("message", onMessage);
        this.socket.removeEventListener("close", onClose);
        this.socket.removeEventListener("error", onError);
      };
      const finish = (error: Error | null, result?: Record<string, unknown>) => {
        cleanup();
        if (error) reject(error);
        else resolve(result ?? {});
      };
      const onMessage = (event: MessageEvent) => {
        let reply: CdpReply;
        try { reply = JSON.parse(String(event.data)) as CdpReply; } catch { return; }
        if (reply.id !== id) return;
        if (reply.error) finish(new Error(reply.error.message ?? "cdp_error"));
        else finish(null, (reply.result ?? {}) as Record<string, unknown>);
      };
      const onClose = () => finish(new Error(`cdp_closed_${method}`));
      const onError = () => finish(new Error("cdp_websocket_error"));
      const timer = setTimeout(() => finish(new Error(`cdp_timeout_${method}`)), this.timeoutBudget(this.commandTimeoutMs));
      this.socket.addEventListener("message", onMessage);
      this.socket.addEventListener("close", onClose, { once: true });
      this.socket.addEventListener("error", onError, { once: true });
      try {
        this.socket.send(JSON.stringify({ id, method, params }));
      } catch (error) {
        finish(error instanceof Error ? error : new Error("cdp_send_failed"));
      }
    });
  }

  on(method: string, listener: (params: Record<string, unknown>) => void) {
    const handler = (event: MessageEvent) => {
      const reply = JSON.parse(String(event.data)) as { method?: string; params?: Record<string, unknown> };
      if (reply.method === method && reply.params) listener(reply.params);
    };
    this.socket.addEventListener("message", handler);
    return () => this.socket.removeEventListener("message", handler);
  }

  onClose(listener: () => void) {
    this.socket.addEventListener("close", listener, { once: true });
    return () => this.socket.removeEventListener("close", listener);
  }

  async close() {
    if (this.socket.readyState === WebSocket.CLOSED) return;
    const closed = new Promise<void>(resolve => {
      this.socket.addEventListener("close", () => resolve(), { once: true });
      this.socket.addEventListener("error", () => resolve(), { once: true });
    });
    try {
      if (this.socket.readyState !== WebSocket.CLOSING) this.socket.close();
    } catch {
      return;
    }
    await Promise.race([closed, new Promise<void>(resolve => setTimeout(resolve, 500))]);
    await new Promise<void>(resolve => setTimeout(resolve, 100));
  }
}

async function bridgeRequest(connection: Connection, runtimePort: number, accessToken: string, payload: unknown) {
  let requestId = "";
  let result: { ok: boolean; status: number; value: unknown };
  try {
    const request = JSON.parse(String(payload)) as { id?: unknown; token?: unknown; path?: unknown; method?: unknown; body?: unknown };
    requestId = typeof request.id === "string" ? request.id : "";
    const path = typeof request.path === "string" ? request.path : "";
    const method = typeof request.method === "string" ? request.method : "GET";
    if (!requestId || request.token !== accessToken || !/^\/api\/(?:bootstrap(?:[?]|$)|update(?:\/(?:install|check))?(?:[?]|$)|projects(?:\/ensure)?(?:[?]|$)|issues(?:[/?]|$)|agents(?:[/?]|$)|mockup\/(?:state|reset)(?:[?]|$)|settings\/auto-dispatch(?:[?]|$)|settings\/scheduler-model(?:[?]|$)|settings\/scheduler-reasoning-effort(?:[?]|$))/.test(path) || !["GET", "POST", "PUT", "PATCH", "DELETE"].includes(method)) throw new Error("invalid_bridge_request");
    const response = await fetch(`http://127.0.0.1:${runtimePort}${path}`, {
      method,
      signal: AbortSignal.timeout(cdpCommandTimeoutMs),
      headers: {
        authorization: `Bearer ${accessToken}`,
        "content-type": "application/json",
      },
      body: typeof request.body === "string" && method !== "GET" ? request.body : undefined,
    });
    result = { ok: response.ok, status: response.status, value: await response.json() };
  } catch (error) {
    result = { ok: false, status: 0, value: { error: error instanceof Error ? error.message : "runtime_unavailable" } };
  }
  if (!requestId) return;
  await evaluate(connection, `window.__betterCodexBridgeResolve?.(${JSON.stringify(requestId)}, ${JSON.stringify(result)})`);
}

async function cdpJson<T>(port: number, path: string, timeoutMs = cdpHttpTimeoutMs) {
  try {
    const response = await fetch(`http://127.0.0.1:${port}${path}`, { signal: AbortSignal.timeout(timeoutMs) });
    if (!response.ok) throw new Error(`cdp_http_${response.status}`);
    return await response.json() as T;
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("cdp_http_")) throw error;
    const suffix = error instanceof Error && ["AbortError", "TimeoutError"].includes(error.name) ? "_timeout" : "";
    throw new Error(`cdp_unavailable_${port}${suffix}`);
  }
}

async function targets(port: number, timeoutMs = cdpHttpTimeoutMs) {
  const values = await cdpJson<Target[]>(port, "/json/list", timeoutMs);
  return values.filter(target => target.type === "page" && target.webSocketDebuggerUrl && target.id && targetAllowed(target));
}

async function browserDebuggerUrl(port: number) {
  const value = await cdpJson<{ webSocketDebuggerUrl?: unknown }>(port, "/json/version");
  if (typeof value.webSocketDebuggerUrl !== "string") throw new Error("cdp_browser_websocket_unavailable");
  return value.webSocketDebuggerUrl;
}

async function evaluate(connection: Connection, expression: string) {
  const result = await connection.send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  const payload = result.result as { value?: unknown } | undefined;
  return payload?.value;
}

type MainTargetOptions = { trustIds?: Set<string>; requestTimeoutMs?: number; deadlineAt?: number };

function targetTimeout(options: MainTargetOptions, limit: number) {
  const requestLimit = options.requestTimeoutMs === undefined ? limit : Math.min(limit, options.requestTimeoutMs);
  if (options.deadlineAt === undefined) return Math.max(1, requestLimit);
  return Math.max(1, Math.min(requestLimit, options.deadlineAt - Date.now()));
}

async function mainTargets(port: number, options: MainTargetOptions = {}) {
  const boundedOptions = { ...options, deadlineAt: options.deadlineAt ?? Date.now() + cdpTargetScanTimeoutMs };
  if (!activeCompatibility().supportedPlatforms.some(platform => platform === process.platform)) {
    writeCompatibilityStatus({ codexVersion: null, compatible: false, reason: "unsupported_platform", targetId: null, capabilities: null });
    throw new Error(`codex_incompatible_unsupported_platform_${process.platform}`);
  }
  const discovered = await targets(port, targetTimeout(boundedOptions, cdpHttpTimeoutMs));
  const candidates = boundedOptions.trustIds?.size
    ? [
        ...discovered.filter(target => boundedOptions.trustIds!.has(target.id)),
        ...discovered.filter(target => !boundedOptions.trustIds!.has(target.id)),
      ].slice(0, cdpTargetCandidateLimit)
    : discovered.slice(0, cdpTargetCandidateLimit);
  const selected: Target[] = [];
  const codexVersion = desktopVersion();
  let lastReason = "renderer_not_found";
  let lastTargetId: string | null = null;
  let lastCapabilities: RendererCapabilities | null = null;
  let compatibleCapabilities: RendererCapabilities | null = null;
  for (const target of candidates) {
    if (boundedOptions.trustIds?.has(target.id)) {
      selected.push(target);
      continue;
    }
    if (Date.now() >= boundedOptions.deadlineAt) throw new Error(`cdp_unavailable_${port}_timeout`);
    const connection = new Connection(
      target.webSocketDebuggerUrl!,
      targetTimeout(boundedOptions, cdpWebSocketOpenTimeoutMs),
      targetTimeout(boundedOptions, cdpCommandTimeoutMs),
      boundedOptions.deadlineAt,
    );
    try {
      await connection.open();
      const capabilities = await evaluate(connection, capabilityExpression()) as RendererCapabilities;
      const missing = missingCapabilities(capabilities);
      lastTargetId = target.id;
      lastCapabilities = capabilities;
      if (missing.length === 0) {
        selected.push(target);
        compatibleCapabilities ??= capabilities;
      } else {
        lastReason = `missing_${missing.join("_")}`;
      }
    } catch {
      lastReason = "renderer_probe_failed";
      lastTargetId = target.id;
      lastCapabilities = null;
    } finally {
      await connection.close();
    }
  }
  if (selected.length > 0) {
    if (!boundedOptions.trustIds?.size) {
      writeCompatibilityStatus({ codexVersion, compatible: true, reason: null, targetId: selected[0].id, capabilities: compatibleCapabilities });
    }
    return selected;
  }
  if (Date.now() >= boundedOptions.deadlineAt) throw new Error(`cdp_unavailable_${port}_timeout`);
  writeCompatibilityStatus({ codexVersion, compatible: false, reason: lastReason, targetId: lastTargetId, capabilities: lastCapabilities });
  if (candidates.length > 0) throw new Error(`codex_incompatible_${lastReason}`);
  return [];
}

let cachedCodexVersion: string | null | undefined;

function desktopVersion() {
  if (cachedCodexVersion !== undefined) return cachedCodexVersion;
  try {
    if (process.platform === "darwin") {
      cachedCodexVersion = execFileSync("/usr/libexec/PlistBuddy", ["-c", "Print :CFBundleShortVersionString", join(desktopApplication(), "Contents", "Info.plist")], { encoding: "utf8" }).trim() || null;
    } else if (process.platform === "win32") {
      cachedCodexVersion = execFileSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", "(Get-AppxPackage -Name OpenAI.Codex | Select-Object -First 1 -ExpandProperty Version)"], { encoding: "utf8", windowsHide: true }).trim() || null;
    } else {
      cachedCodexVersion = null;
    }
  } catch {
    cachedCodexVersion = null;
  }
  return cachedCodexVersion;
}

function desktopApplication() {
  const application = ["/Applications/Codex.app", "/Applications/ChatGPT.app"].find(existsSync);
  if (!application) throw new Error("codex_app_not_found");
  return application;
}

export function codexInstallationStatus() {
  if (process.platform === "darwin") {
    const path = ["/Applications/Codex.app", "/Applications/ChatGPT.app"].find(existsSync) ?? null;
    return { installed: Boolean(path), platform: process.platform, path, version: path ? desktopVersion() : null };
  }
  if (process.platform === "win32") {
    try {
      const value = execFileSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", "$app = Get-AppxPackage -Name OpenAI.Codex | Select-Object -First 1; if ($app) { $app | Select-Object Name, Version, InstallLocation | ConvertTo-Json -Compress }"], { encoding: "utf8", windowsHide: true }).trim();
      if (!value) return { installed: false, platform: process.platform, path: null, version: null };
      const app = JSON.parse(value) as { Version?: string; InstallLocation?: string };
      return { installed: true, platform: process.platform, path: app.InstallLocation ?? null, version: app.Version ?? desktopVersion() };
    } catch {
      return { installed: false, platform: process.platform, path: null, version: null };
    }
  }
  return { installed: false, platform: process.platform, path: null, version: null };
}

function desktopApplicationBundleId(application: string) {
  const bundleId = execFileSync("/usr/libexec/PlistBuddy", ["-c", "Print :CFBundleIdentifier", join(application, "Contents", "Info.plist")], { encoding: "utf8" }).trim();
  if (!bundleId) throw new Error("codex_app_bundle_id_unavailable");
  return bundleId;
}

function windowsActivationScript(port: number, allowExisting = false) {
  return `$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"
try {
$runningMainProcess = Get-CimInstance Win32_Process -Filter "Name = 'ChatGPT.exe'" |
  Where-Object { $_.CommandLine -notmatch "--type=" } |
  Select-Object -First 1
if ($runningMainProcess -and ${allowExisting ? "$false" : "$true"}) {
  throw "Codex is already running without CDP. Quit Codex completely and try again."
}

$codexApp = Get-StartApps |
  Where-Object { $_.AppID -like "OpenAI.Codex_*!App" } |
  Select-Object -First 1
if (-not $codexApp) {
  throw "The Microsoft Store Codex application is not installed for this Windows user."
}

$activationSource = @'
using System;
using System.Runtime.InteropServices;

[ComImport]
[Guid("2e941141-7f97-4756-ba1d-9decde894a3d")]
[InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
public interface IApplicationActivationManager {
  [PreserveSig]
  int ActivateApplication(
    [MarshalAs(UnmanagedType.LPWStr)] string appUserModelId,
    [MarshalAs(UnmanagedType.LPWStr)] string arguments,
    uint options,
    out uint processId);
}

[ComImport]
[Guid("45BA127D-10A8-46EA-8AB7-56EA9078943C")]
public class ApplicationActivationManager {}

public static class BetterCodexApplication {
  public static uint Activate(string appUserModelId, string arguments) {
    var manager = (IApplicationActivationManager)new ApplicationActivationManager();
    uint processId;
    int result = manager.ActivateApplication(appUserModelId, arguments, 0, out processId);
    Marshal.ThrowExceptionForHR(result);
    return processId;
  }
}
'@

Add-Type -TypeDefinition $activationSource
$arguments = "--remote-debugging-port=${port} --remote-allow-origins=http://127.0.0.1:${port}"
[void][BetterCodexApplication]::Activate($codexApp.AppID, $arguments)
} catch {
  [Console]::Error.WriteLine($_.Exception.Message)
  exit 1
}
`;
}

export function launchCodex(port: number, activateExisting = false) {
  if (process.platform === "darwin") {
    const application = desktopApplication();
    const child = spawn("/usr/bin/open", [
      ...(activateExisting ? [] : ["-n"]),
      "-a",
      application,
      "--args",
      `--remote-debugging-port=${port}`,
      `--remote-allow-origins=http://127.0.0.1:${port}`,
    ], { detached: true, stdio: "ignore" });
    child.unref();
    return;
  }
  if (process.platform === "win32") {
    const encoded = Buffer.from(windowsActivationScript(port, activateExisting), "utf16le").toString("base64");
    try {
      execFileSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-OutputFormat", "Text", "-EncodedCommand", encoded], {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
        windowsHide: true,
      });
    } catch (error) {
      const output = error && typeof error === "object"
        ? String("stderr" in error ? error.stderr : "stdout" in error ? error.stdout : "").trim()
        : "";
      throw new Error(output || "codex_windows_launch_failed");
    }
    return;
  }
  throw new Error(`codex_launch_unsupported_${process.platform}`);
}

export function requiresCodexRestartForLaunch(codexRunning: boolean, platform: NodeJS.Platform = process.platform) {
  return platform === "win32" && codexRunning;
}

export function codexProcessRunning() {
  if (process.platform === "win32") {
    const processes = execFileSync("tasklist.exe", ["/FI", "IMAGENAME eq ChatGPT.exe", "/NH", "/FO", "CSV"], { encoding: "utf8", windowsHide: true });
    return /"ChatGPT\.exe"/i.test(processes);
  }
  if (process.platform !== "darwin") return false;
  const application = desktopApplication();
  const bundleId = desktopApplicationBundleId(application);
  const appleScriptBundleId = bundleId.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  try {
    const result = execFileSync("/usr/bin/osascript", ["-e", `tell application id "${appleScriptBundleId}" to return running`], { encoding: "utf8" }).trim();
    return result === "true";
  } catch {
    return false;
  }
}

export function confirmCodexRestart() {
  const chinese = readCodexLocale() === "zh-CN";
  return showNativeChoiceDialog({
    message: chinese ? "当前进程正在运行。\n\n需要重启进程才能启动注入。" : "The current process is already running.\n\nRestart the process to enable injection.",
    title: "Better Codex",
    primaryLabel: chinese ? "重启进程" : "Restart process",
    secondaryLabel: chinese ? "取消" : "Cancel",
    icon: "caution",
  });
}

export function windowsCodexPackageProcessPowerShell(action: "stop" | "count") {
  const ownedPackageProcesses = "& { $sessionId = [Diagnostics.Process]::GetCurrentProcess().SessionId; $ownerSid = [Security.Principal.WindowsIdentity]::GetCurrent().User.Value; @(Get-CimInstance Win32_Process -Filter \"Name = 'ChatGPT.exe'\" | Where-Object { if ($_.SessionId -ne $sessionId -or $_.ExecutablePath -notlike \"*\\WindowsApps\\OpenAI.Codex_*\") { return $false }; try { return (Invoke-CimMethod -InputObject $_ -MethodName GetOwnerSid -ErrorAction Stop).Sid -eq $ownerSid } catch { return $false } }) }";
  if (action === "stop") {
    return `$processes = @(${ownedPackageProcesses}); if ($processes.Count -gt 0) { $processes | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue } }; exit 0`;
  }
  return `$processes = @(${ownedPackageProcesses}); $count = @($processes).Count; Write-Output $count; exit 0`;
}

async function quitCodex() {
  if (process.platform === "win32") {
    const stopPackageProcesses = windowsCodexPackageProcessPowerShell("stop");
    const countPackageProcesses = windowsCodexPackageProcessPowerShell("count");
    execFileSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", stopPackageProcesses], { stdio: "ignore", windowsHide: true });
    for (let attempt = 0; attempt < 40; attempt += 1) {
      const count = execFileSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", countPackageProcesses], { encoding: "utf8", windowsHide: true }).trim();
      if (Number(count) === 0) return;
      await new Promise(resolve => setTimeout(resolve, 250));
    }
    throw new Error("codex_quit_timeout");
  }
  if (process.platform !== "darwin") throw new Error(`codex_quit_unsupported_${process.platform}`);
  const application = desktopApplication();
  const bundleId = desktopApplicationBundleId(application);
  const appleScriptBundleId = bundleId.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  const running = () => {
    try {
      const result = execFileSync("/usr/bin/osascript", ["-e", `tell application id "${appleScriptBundleId}" to return running`], { encoding: "utf8" }).trim();
      return result === "true";
    } catch {
      return false;
    }
  };
  try {
    execFileSync("/usr/bin/osascript", ["-e", `tell application id "${appleScriptBundleId}" to quit`], { stdio: "ignore" });
  } catch {
  }
  for (let attempt = 0; attempt < 40; attempt += 1) {
    if (!running()) return;
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  throw new Error("codex_quit_timeout");
}

async function waitForTargetsWithin(port: number, timeoutMs: number) {
  const deadline = Date.now() + timeoutMs;
  let incompatibility: Error | null = null;
  while (Date.now() < deadline) {
    try {
      const values = await mainTargets(port, { deadlineAt: deadline });
      if (values.length > 0) return values;
    } catch (error) {
      if (error instanceof Error && error.message.startsWith("codex_incompatible_")) {
        incompatibility = error;
      }
    }
    if (Date.now() >= deadline) break;
    await new Promise(resolve => setTimeout(resolve, 150));
  }
  if (incompatibility) throw incompatibility;
  throw new Error(`cdp_unavailable_${port}`);
}

async function waitForTargets(port: number) {
  return waitForTargetsWithin(port, 30_000);
}

async function installTarget(target: Target, runtimePort: number, accessToken: string) {
  const connection = new Connection(target.webSocketDebuggerUrl!);
  try {
    await connection.open();
    await connection.send("Page.enable");
    await connection.send("Page.setBypassCSP", { enabled: true });
    await connection.send("Runtime.enable");
    try { await connection.send("Runtime.addBinding", { name: "betterCodexRequest" }); } catch {}
    const existing = await evaluate(connection, "({ version: window.__betterCodexInjection__?.version || null, profile: window.__betterCodexInjection__?.profile || null, endpoint: window.__betterCodexInjection__?.endpoint || null })") as { version?: string; profile?: string; endpoint?: string };
    const expectedEndpoint = `http://127.0.0.1:${runtimePort}`;
    const foreignDevelopmentInjection = betterCodexProfile === "development"
      && ((existing.profile && existing.profile !== betterCodexProfile) || (!existing.profile && existing.endpoint && existing.endpoint !== expectedEndpoint));
    if (foreignDevelopmentInjection) throw new Error("profile_not_active");
    if (existing.version === injectionVersion() && existing.profile === betterCodexProfile && existing.endpoint === expectedEndpoint) {
      const storedIdentifier = await evaluate(connection, "window.__betterCodexNewDocumentScriptId || null");
      await evaluate(connection, "window.__betterCodexInjection__.refresh()");
      const current = readCompatibilityStatus();
      writeCompatibilityStatus({ codexVersion: current?.codexVersion ?? desktopVersion(), compatible: true, reason: null, targetId: target.id, capabilities: current?.capabilities ?? null }, true);
      return { targetId: target.id, title: target.title, installed: true, reused: true, identifier: typeof storedIdentifier === "string" ? storedIdentifier : undefined };
    }
    const source = injectionScript(runtimePort, accessToken, "install", readCodexLocale());
    const registration = await connection.send("Page.addScriptToEvaluateOnNewDocument", { source });
    const identifier = String(registration.identifier ?? "");
    await evaluate(connection, source);
    await evaluate(connection, `window.__betterCodexNewDocumentScriptId = ${JSON.stringify(identifier)}`);
    const current = readCompatibilityStatus();
    writeCompatibilityStatus({ codexVersion: current?.codexVersion ?? desktopVersion(), compatible: true, reason: null, targetId: target.id, capabilities: current?.capabilities ?? null }, true);
    return { targetId: target.id, title: target.title, installed: true, reused: false, identifier };
  } finally {
    await connection.close();
  }
}

type InjectionOwnership = { profile: string; endpoint?: string; allowLegacyProfileless?: boolean };

async function uninstallTarget(target: Target, accessToken: string, ownership?: InjectionOwnership) {
  const connection = new Connection(target.webSocketDebuggerUrl!);
  try {
    await connection.open();
    await connection.send("Page.enable");
    await connection.send("Runtime.enable");
    const existing = await evaluate(connection, "({ profile: window.__betterCodexInjection__?.profile || null, endpoint: window.__betterCodexInjection__?.endpoint || null })") as { profile?: string; endpoint?: string };
    if (ownership) {
      const owned = existing.profile
        ? existing.profile === ownership.profile
        : Boolean(ownership.allowLegacyProfileless || (ownership.endpoint && existing.endpoint === ownership.endpoint));
      if (!owned) return { targetId: target.id, title: target.title, uninstalled: false, reason: "profile_not_active" };
    }
    const stored = await evaluate(connection, "window.__betterCodexNewDocumentScriptId || null");
    const scriptIdentifier = typeof stored === "string" ? stored : "";
    if (scriptIdentifier) {
      try {
        await connection.send("Page.removeScriptToEvaluateOnNewDocument", { identifier: scriptIdentifier });
      } catch {
      }
    }
    const value = await evaluate(connection, injectionScript(0, accessToken, "uninstall"));
    return { targetId: target.id, title: target.title, uninstalled: true, value };
  } finally {
    await connection.close();
  }
}

export async function cdpInject(port: number, runtimePort: number, accessToken: string, launch = false) {
  let values: Target[];
  try {
    values = await mainTargets(port);
  } catch (error) {
    if (!launch) throw error;
    if (error instanceof Error && error.message.startsWith("codex_incompatible_")) values = await waitForTargets(port);
    else {
      launchCodex(port);
      values = await waitForTargets(port);
    }
  }
  if (values.length === 0 && launch) {
    launchCodex(port);
    values = await waitForTargets(port);
  }
  if (values.length === 0) throw new Error("cdp_main_renderer_not_found");
  const installed = await Promise.all(values.map(target => installTarget(target, runtimePort, accessToken)));
  recordInjectionOwnership(betterCodexProfile, `http://127.0.0.1:${runtimePort}`);
  return installed;
}

export async function cdpRestartAndInject(port: number, runtimePort: number, accessToken: string, options: { confirmQuit?: boolean } = {}) {
  if (!['darwin', 'win32'].includes(process.platform)) throw new Error(`setup_unsupported_${process.platform}`);
  if (options.confirmQuit && codexProcessRunning() && !confirmCodexRestart()) throw new Error("codex_quit_cancelled");
  await quitCodex();
  return cdpInject(port, runtimePort, accessToken, true);
}

export async function cdpEject(port: number, accessToken: string, ownership?: InjectionOwnership) {
  try {
    const values = await targets(port);
    return await Promise.all(values.map(target => uninstallTarget(target, accessToken, ownership)));
  } finally {
    clearCompatibilityStatus();
  }
}

export async function cdpStatus(port: number) {
  try {
    const values = await mainTargets(port);
    const rendered = [];
    for (const target of values) {
      const connection = new Connection(target.webSocketDebuggerUrl!);
      try {
        await connection.open();
        const value = await evaluate(connection, `({
          version: window.__betterCodexInjection__?.version || null,
          profile: window.__betterCodexInjection__?.profile || null,
          endpoint: window.__betterCodexInjection__?.endpoint || null,
          entry: Boolean(document.getElementById('better-codex-entry')),
          panel: Boolean(document.getElementById('better-codex-panel')),
          open: document.documentElement.hasAttribute('data-better-codex-open')
        })`);
        rendered.push({ targetId: target.id, title: target.title, url: target.url, ...(value as object) });
      } finally {
        await connection.close();
      }
    }
    return { available: true, port, compatibility: readCompatibilityStatus(), targets: rendered };
  } catch (error) {
    return { available: false, port, error: error instanceof Error ? error.message : "cdp_error", compatibility: readCompatibilityStatus(), targets: [] };
  }
}

export async function cdpOpenThread(port: number, threadId: string) {
  const values = await mainTargets(port);
  const target = values[0];
  if (!target) throw new Error("cdp_main_renderer_not_found");
  const connection = new Connection(target.webSocketDebuggerUrl!);
  try {
    await connection.open();
    return await evaluate(connection, navigationExpression(threadId));
  } finally {
    await connection.close();
  }
}

export async function watchInjection(port: number, accessToken: string) {
  const attached = new Map<string, { connection: Connection; identifier?: string; target: Target }>();
  let activeRuntimePort = 0;
  let stopping = false;
  let yieldedToPeer = false;
  let discovery: Connection | null = null;
  let wakeTargetActivity: (() => void) | null = null;
  const wake = () => {
    const finish = wakeTargetActivity;
    wakeTargetActivity = null;
    finish?.();
  };
  const stop = () => { stopping = true; wake(); };
  const ensureDiscovery = async () => {
    if (discovery) return;
    let connection: Connection | null = null;
    try {
      connection = new Connection(await browserDebuggerUrl(port));
      await connection.open();
      const reset = () => {
        if (discovery === connection) discovery = null;
        wake();
      };
      connection.onClose(reset);
      connection.on("Target.targetCreated", wake);
      connection.on("Target.targetInfoChanged", wake);
      connection.on("Target.targetDestroyed", wake);
      await connection.send("Target.setDiscoverTargets", { discover: true });
      discovery = connection;
    } catch {
      await connection?.close();
    }
  };
  const targetActivity = () => new Promise<void>(resolve => {
    const finish = () => {
      if (wakeTargetActivity === finish) wakeTargetActivity = null;
      resolve();
    };
    wakeTargetActivity = finish;
  });
  process.once("SIGINT", stop);
  process.once("SIGTERM", stop);
  while (!stopping) {
    // Arm wake immediately so target events during this cycle can cut the wait short.
    let settleMs = 250;
    const activity = targetActivity();
    try {
      await ensureDiscovery();
      const runtime = readRuntimeState();
      if (!runtime) throw new Error("runtime_unavailable");
      if (activeRuntimePort && activeRuntimePort !== runtime.port) {
        for (const current of attached.values()) {
          try {
            if (current.identifier) await current.connection.send("Page.removeScriptToEvaluateOnNewDocument", { identifier: current.identifier });
            await evaluate(current.connection, injectionScript(0, accessToken, "uninstall"));
          } catch {
          }
          await current.connection.close();
        }
        attached.clear();
      }
      activeRuntimePort = runtime.port;
      const values = await mainTargets(port, { trustIds: new Set(attached.keys()) });
      const activeIds = new Set(values.map(target => target.id));
      for (const [id, current] of attached) {
        if (!activeIds.has(id)) {
          await current.connection.close();
          attached.delete(id);
        }
      }
      for (const target of values) {
        if (attached.has(target.id)) continue;
        const connection = new Connection(target.webSocketDebuggerUrl!);
        let transferred = false;
        try {
          await connection.open();
          await connection.send("Page.enable");
          await connection.send("Page.setBypassCSP", { enabled: true });
          await connection.send("Runtime.enable");
          try { await connection.send("Runtime.addBinding", { name: "betterCodexRequest" }); } catch {}
          connection.on("Runtime.bindingCalled", params => {
            if (params.name === "betterCodexRequest") void bridgeRequest(connection, activeRuntimePort, accessToken, params.payload);
          });
          const existing = await evaluate(connection, "({ version: window.__betterCodexInjection__?.version || null, profile: window.__betterCodexInjection__?.profile || null, endpoint: window.__betterCodexInjection__?.endpoint || null })") as { version?: string; profile?: string; endpoint?: string };
          const expectedEndpoint = `http://127.0.0.1:${activeRuntimePort}`;
          if (betterCodexProfile === "development" && (existing.profile ? existing.profile !== betterCodexProfile : Boolean(existing.endpoint && existing.endpoint !== expectedEndpoint))) {
            setInjectionEnabled(false);
            stopping = true;
            yieldedToPeer = true;
            break;
          }
          let identifier: string | undefined;
          if (existing.version === injectionVersion() && existing.profile === betterCodexProfile && existing.endpoint === expectedEndpoint) {
            const stored = await evaluate(connection, "window.__betterCodexNewDocumentScriptId || null");
            identifier = typeof stored === "string" ? stored : undefined;
            await evaluate(connection, "window.__betterCodexInjection__.refresh()");
          } else {
            const source = injectionScript(activeRuntimePort, accessToken, "install", readCodexLocale());
            const registration = await connection.send("Page.addScriptToEvaluateOnNewDocument", { source });
            identifier = String(registration.identifier ?? "") || undefined;
            await evaluate(connection, source);
            await evaluate(connection, `window.__betterCodexNewDocumentScriptId = ${JSON.stringify(identifier ?? "")}`);
          }
          attached.set(target.id, { connection, identifier, target });
          transferred = true;
          recordInjectionOwnership(betterCodexProfile, expectedEndpoint);
          const current = readCompatibilityStatus();
          writeCompatibilityStatus({ codexVersion: current?.codexVersion ?? desktopVersion(), compatible: true, reason: null, targetId: target.id, capabilities: current?.capabilities ?? null }, true);
        } finally {
          if (!transferred) await connection.close();
        }
      }
      if (stopping) break;
      // Health-check attached sessions without opening a second debugger to the same target.
      for (const [id, current] of attached) {
        try {
          const existing = await evaluate(current.connection, "({ version: window.__betterCodexInjection__?.version || null, profile: window.__betterCodexInjection__?.profile || null, endpoint: window.__betterCodexInjection__?.endpoint || null })") as { version?: string; profile?: string; endpoint?: string };
          if (betterCodexProfile === "development" && (existing.profile ? existing.profile !== betterCodexProfile : Boolean(existing.endpoint && existing.endpoint !== `http://127.0.0.1:${activeRuntimePort}`))) {
            setInjectionEnabled(false);
            stopping = true;
            yieldedToPeer = true;
            break;
          }
          if (existing.version !== injectionVersion() || existing.profile !== betterCodexProfile || existing.endpoint !== `http://127.0.0.1:${activeRuntimePort}`) {
            if (current.identifier) {
              try { await current.connection.send("Page.removeScriptToEvaluateOnNewDocument", { identifier: current.identifier }); } catch {}
            }
            await current.connection.close();
            attached.delete(id);
          }
        } catch {
          await current.connection.close();
          attached.delete(id);
        }
      }
      if (stopping) break;
      settleMs = attached.size > 0 ? 2500 : 250;
    } catch (error) {
      const message = error instanceof Error ? error.message : "injector_cycle_failed";
      // Renderer often appears before sidebar/content; probe faster than the idle sweep.
      settleMs = message.startsWith("codex_incompatible_") || message.startsWith("cdp_unavailable_") ? 200 : 500;
      console.error(message);
    }
    await Promise.race([activity, new Promise<void>(resolve => setTimeout(resolve, settleMs))]);
    wake();
  }
  const activeDiscovery = discovery as Connection | null;
  await activeDiscovery?.close();
  for (const current of attached.values()) {
    try {
      if (current.identifier) await current.connection.send("Page.removeScriptToEvaluateOnNewDocument", { identifier: current.identifier });
      if (!yieldedToPeer) await evaluate(current.connection, injectionScript(0, accessToken, "uninstall"));
    } catch {
    }
    await current.connection.close();
  }
}

export async function probeCdpTargetsForTest(port: number, timeoutMs: number) {
  return targets(port, timeoutMs);
}

export async function waitForCdpTargetsForTest(port: number, timeoutMs: number) {
  return waitForTargetsWithin(port, timeoutMs);
}

export async function closeCdpConnectionForTest(url: string, openTimeoutMs = cdpWebSocketOpenTimeoutMs) {
  const connection = new Connection(url, openTimeoutMs);
  try {
    await connection.open();
  } finally {
    await connection.close();
  }
}
