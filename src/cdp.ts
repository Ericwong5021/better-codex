import { execFileSync, spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { basename } from "node:path";
import { port as gatewayPort } from "./config.js";
import { injectionScript, injectionVersion } from "./dom.js";

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

class Connection {
  private sequence = 0;
  private socket: WebSocket;

  constructor(url: string) {
    this.socket = new WebSocket(url);
  }

  open() {
    return new Promise<void>((resolve, reject) => {
      this.socket.addEventListener("open", () => resolve(), { once: true });
      this.socket.addEventListener("error", () => reject(new Error("cdp_websocket_error")), { once: true });
    });
  }

  send(method: string, params: Record<string, unknown> = {}) {
    const id = ++this.sequence;
    return new Promise<Record<string, unknown>>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`cdp_timeout_${method}`)), 8000);
      const onMessage = (event: MessageEvent) => {
        const reply = JSON.parse(String(event.data)) as CdpReply;
        if (reply.id !== id) return;
        clearTimeout(timer);
        this.socket.removeEventListener("message", onMessage);
        if (reply.error) reject(new Error(reply.error.message ?? "cdp_error"));
        else resolve((reply.result ?? {}) as Record<string, unknown>);
      };
      this.socket.addEventListener("message", onMessage);
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }

  close() {
    this.socket.close();
  }
}

async function targets(port: number) {
  let response: Response;
  try {
    response = await fetch(`http://127.0.0.1:${port}/json/list`);
  } catch {
    throw new Error(`cdp_unavailable_${port}`);
  }
  if (!response.ok) throw new Error(`cdp_http_${response.status}`);
  const values = await response.json() as Target[];
  return values.filter(target => {
    if (target.type !== "page" || !target.webSocketDebuggerUrl || !target.id) return false;
    if (target.url?.includes("initialRoute=%2Fglobal-dictation") || target.url?.includes("initialRoute=%2Favatar-overlay")) return false;
    return target.url?.startsWith("app://") || target.title?.includes("Codex");
  });
}

async function evaluate(connection: Connection, expression: string) {
  const result = await connection.send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  const payload = result.result as { value?: unknown } | undefined;
  return payload?.value;
}

async function mainTargets(port: number) {
  const candidates = await targets(port);
  const selected: Target[] = [];
  for (const target of candidates) {
    const connection = new Connection(target.webSocketDebuggerUrl!);
    try {
      await connection.open();
      const main = await evaluate(connection, "Boolean(document.querySelector('[data-app-action-sidebar-scroll], [data-app-shell-main-content-layout]'))");
      if (main) selected.push(target);
    } catch {
    } finally {
      connection.close();
    }
  }
  return selected.length > 0 ? selected : candidates.slice(0, 1);
}

function desktopApplication() {
  const application = ["/Applications/ChatGPT.app", "/Applications/Codex.app"].find(existsSync);
  if (!application) throw new Error("codex_app_not_found");
  return application;
}

function desktopApplicationName(application: string) {
  return basename(application, ".app");
}

function windowsActivationScript(port: number) {
  return `$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"
try {
$runningMainProcess = Get-CimInstance Win32_Process -Filter "Name = 'ChatGPT.exe'" |
  Where-Object { $_.CommandLine -notmatch "--type=" } |
  Select-Object -First 1
if ($runningMainProcess) {
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

function launchCodex(port: number) {
  if (process.platform === "darwin") {
    const application = desktopApplication();
    const child = spawn("/usr/bin/open", [
      "-n",
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
    const encoded = Buffer.from(windowsActivationScript(port), "utf16le").toString("base64");
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

async function quitCodex() {
  const application = desktopApplication();
  const name = desktopApplicationName(application);
  try {
    execFileSync("/usr/bin/osascript", ["-e", `tell application \"${name}\" to quit`], { stdio: "ignore" });
  } catch {
  }
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      execFileSync("/usr/bin/pgrep", ["-x", name], { stdio: "ignore" });
    } catch {
      return;
    }
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  throw new Error("codex_quit_timeout");
}

async function waitForTargets(port: number) {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      const values = await mainTargets(port);
      if (values.length > 0) return values;
    } catch {
    }
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  throw new Error(`cdp_unavailable_${port}`);
}

async function installTarget(target: Target, port: number, accessToken: string) {
  const connection = new Connection(target.webSocketDebuggerUrl!);
  await connection.open();
  try {
    await connection.send("Page.enable");
    await connection.send("Page.setBypassCSP", { enabled: true });
    await connection.send("Runtime.enable");
    const existing = await evaluate(connection, "window.__betterCodexInjection__?.version || null");
    if (existing === injectionVersion) {
      const storedIdentifier = await evaluate(connection, "window.__betterCodexNewDocumentScriptId || null");
      await evaluate(connection, "window.__betterCodexInjection__.refresh()");
      return { targetId: target.id, title: target.title, installed: true, reused: true, identifier: typeof storedIdentifier === "string" ? storedIdentifier : undefined };
    }
    const source = injectionScript(gatewayPort, accessToken, "install");
    const registration = await connection.send("Page.addScriptToEvaluateOnNewDocument", { source });
    const identifier = String(registration.identifier ?? "");
    await evaluate(connection, source);
    await evaluate(connection, `window.__betterCodexNewDocumentScriptId = ${JSON.stringify(identifier)}`);
    return { targetId: target.id, title: target.title, installed: true, reused: false, identifier };
  } finally {
    connection.close();
  }
}

async function uninstallTarget(target: Target, port: number, accessToken: string) {
  const connection = new Connection(target.webSocketDebuggerUrl!);
  await connection.open();
  try {
    await connection.send("Page.enable");
    await connection.send("Runtime.enable");
    const stored = await evaluate(connection, "window.__betterCodexNewDocumentScriptId || null");
    const scriptIdentifier = typeof stored === "string" ? stored : "";
    if (scriptIdentifier) {
      try {
        await connection.send("Page.removeScriptToEvaluateOnNewDocument", { identifier: scriptIdentifier });
      } catch {
      }
    }
    const value = await evaluate(connection, injectionScript(gatewayPort, accessToken, "uninstall"));
    return { targetId: target.id, title: target.title, uninstalled: true, value };
  } finally {
    connection.close();
  }
}

export async function cdpInject(port: number, accessToken: string, launch = false) {
  let values: Target[];
  try {
    values = await mainTargets(port);
  } catch (error) {
    if (!launch) throw error;
    launchCodex(port);
    values = await waitForTargets(port);
  }
  if (values.length === 0 && launch) {
    launchCodex(port);
    values = await waitForTargets(port);
  }
  if (values.length === 0) throw new Error("cdp_main_renderer_not_found");
  return Promise.all(values.map(target => installTarget(target, port, accessToken)));
}

export async function cdpRestartAndInject(port: number, accessToken: string) {
  if (process.platform === "darwin") await quitCodex();
  if (!['darwin', 'win32'].includes(process.platform)) throw new Error(`setup_unsupported_${process.platform}`);
  return cdpInject(port, accessToken, true);
}

export async function cdpEject(port: number, accessToken: string) {
  const values = await mainTargets(port);
  return Promise.all(values.map(target => uninstallTarget(target, port, accessToken)));
}

export async function cdpStatus(port: number) {
  try {
    const values = await mainTargets(port);
    const rendered = [];
    for (const target of values) {
      const connection = new Connection(target.webSocketDebuggerUrl!);
      await connection.open();
      try {
        const value = await evaluate(connection, `({
          version: window.__betterCodexInjection__?.version || null,
          entry: Boolean(document.getElementById('better-codex-entry')),
          panel: Boolean(document.getElementById('better-codex-panel')),
          open: document.documentElement.hasAttribute('data-better-codex-open')
        })`);
        rendered.push({ targetId: target.id, title: target.title, url: target.url, ...(value as object) });
      } finally {
        connection.close();
      }
    }
    return { available: true, port, targets: rendered };
  } catch (error) {
    return { available: false, port, error: error instanceof Error ? error.message : "cdp_error", targets: [] };
  }
}

export async function cdpOpenThread(port: number, threadId: string) {
  const values = await mainTargets(port);
  const target = values[0];
  if (!target) throw new Error("cdp_main_renderer_not_found");
  const connection = new Connection(target.webSocketDebuggerUrl!);
  await connection.open();
  try {
    return await evaluate(connection, `(async () => {
      const expected = ${JSON.stringify(threadId)}.replace(/^(local|cloud):/i, '');
      const row = Array.from(document.querySelectorAll('[data-app-action-sidebar-thread-id]')).find(item => String(item.getAttribute('data-app-action-sidebar-thread-id') || '').replace(/^(local|cloud):/i, '') === expected);
      if (row) {
        window.__betterCodexInjection__?.close?.();
        row.click();
        return { opened: true, via: 'sidebar' };
      }
      window.postMessage({ type: 'navigate-to-route', path: '/local/' + encodeURIComponent(expected) }, window.location.origin);
      await new Promise(resolve => setTimeout(resolve, 400));
      const current = location.pathname.match(/\\/local\\/([^/?#]+)/)?.[1] || '';
      if (decodeURIComponent(current) === expected) {
        window.__betterCodexInjection__?.close?.();
        return { opened: true, via: 'route' };
      }
      return { opened: false, requested: true, via: 'route', error: 'thread_open_unconfirmed' };
    })()`);
  } finally {
    connection.close();
  }
}

export async function watchInjection(port: number, accessToken: string) {
  const attached = new Map<string, { connection: Connection; identifier?: string; target: Target }>();
  let stopping = false;
  const stop = () => { stopping = true; };
  process.once("SIGINT", stop);
  process.once("SIGTERM", stop);
  while (!stopping) {
    try {
      const values = await mainTargets(port);
      const activeIds = new Set(values.map(target => target.id));
      for (const [id, current] of attached) {
        if (!activeIds.has(id)) {
          current.connection.close();
          attached.delete(id);
        }
      }
      for (const target of values) {
        if (attached.has(target.id)) continue;
        const connection = new Connection(target.webSocketDebuggerUrl!);
        await connection.open();
        await connection.send("Page.enable");
        await connection.send("Page.setBypassCSP", { enabled: true });
        await connection.send("Runtime.enable");
        const existing = await evaluate(connection, "window.__betterCodexInjection__?.version || null");
        let identifier: string | undefined;
        if (existing === injectionVersion) {
          const stored = await evaluate(connection, "window.__betterCodexNewDocumentScriptId || null");
          identifier = typeof stored === "string" ? stored : undefined;
          await evaluate(connection, "window.__betterCodexInjection__.refresh()");
        } else {
          const source = injectionScript(gatewayPort, accessToken, "install");
          const registration = await connection.send("Page.addScriptToEvaluateOnNewDocument", { source });
          identifier = String(registration.identifier ?? "") || undefined;
          await evaluate(connection, source);
          await evaluate(connection, `window.__betterCodexNewDocumentScriptId = ${JSON.stringify(identifier ?? "")}`);
        }
        attached.set(target.id, { connection, identifier, target });
      }
      for (const [id, current] of attached) {
        try {
          await evaluate(current.connection, "window.__betterCodexInjection__?.version || null");
        } catch {
          current.connection.close();
          attached.delete(id);
        }
      }
    } catch (error) {
      console.error(error instanceof Error ? error.message : "injector_cycle_failed");
    }
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  for (const current of attached.values()) {
    try {
      if (current.identifier) await current.connection.send("Page.removeScriptToEvaluateOnNewDocument", { identifier: current.identifier });
      await evaluate(current.connection, injectionScript(gatewayPort, accessToken, "uninstall"));
    } catch {
    }
    current.connection.close();
  }
}
