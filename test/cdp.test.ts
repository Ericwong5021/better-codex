import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { WebSocketServer } from "ws";
import { darwinCdpListenerTrusted, desktopIntegrationState, desktopRendererProbeReason, windowsCodexPackageProcessPowerShell } from "../src/cdp.js";
import { targetAllowed, missingCapabilities } from "../src/compatibility.js";
import { betterCodexProfile } from "../src/config.js";
import { desktopBridgeBundleChecksum, desktopBridgeVersion } from "../src/desktop-bridge.js";

const source = readFileSync(new URL("../src/cdp.ts", import.meta.url), "utf8");
const cliSource = readFileSync(new URL("../src/cli.ts", import.meta.url), "utf8");
const nativeDialogSource = readFileSync(new URL("../src/native-dialog.ts", import.meta.url), "utf8");
const serverSource = readFileSync(new URL("../src/server.ts", import.meta.url), "utf8");

test("desktop bridge reacts to renderer target changes instead of waiting for its fallback sweep", () => {
  assert.ok(source.includes('connection.send("Target.setDiscoverTargets", { discover: true })'));
  assert.ok(source.includes('connection.on("Target.targetCreated", wake)'));
  assert.ok(source.includes('connection.on("Target.targetInfoChanged", wake)'));
  assert.ok(source.includes('connection.on("Target.targetDestroyed", wake)'));
  assert.ok(source.includes("await Promise.race([activity, new Promise<void>(resolve => setTimeout(resolve, settleMs))]"));
});

test("desktop bridge waits for the first capable renderer without a multi-second stability hold", () => {
  assert.match(source, /async function waitForTargets\(port: number\)/);
  assert.match(source, /if \(values\.length > 0\) return values;/);
  assert.match(source, /if \(error instanceof Error && error\.message\.startsWith\("codex_incompatible_"\)\) values = await waitForTargets\(port\);/);
  assert.doesNotMatch(source, /stableCount\s*>=\s*4/);
  assert.doesNotMatch(source, /stableCount/);
  assert.match(source, /setTimeout\(resolve, 150\)/);
  assert.match(source, /settleMs = message\.startsWith\("codex_incompatible_"\) \|\| message\.startsWith\("cdp_unavailable_"\) \? 200 : 500/);
});

test("desktop bridge does not open a second debugger against already attached targets", () => {
  assert.match(source, /trustIds\?: Set<string>/);
  assert.match(source, /mainTargets\(port, \{ trustIds: new Set\(attached\.keys\(\)\) \}\)/);
  assert.match(source, /discovered\.filter\(target => boundedOptions\.trustIds!\.has\(target\.id\)\)/);
  assert.match(source, /if \(boundedOptions\.trustIds\?\.has\(target\.id\)\)/);
});

test("native bridge admits only relay operations and bounded native handoff", () => {
  assert.match(source, /session-relay/);
  assert.match(source, /checkpoint\|complete\|fail/);
  assert.match(source, /session-handoff/);
  assert.doesNotMatch(source, /settings\\\/auto-dispatch|mockup\\\//);
});

test("thread navigation opens a sidebar row or falls back to the native route", () => {
  const compatibility = readFileSync(new URL("../src/compatibility.ts", import.meta.url), "utf8");
  const navigation = compatibility.slice(compatibility.indexOf("export function navigationExpression"), compatibility.indexOf("export function readCompatibilityStatus"));

  assert.match(navigation, /const deadline = Date\.now\(\) \+ 10000/);
  assert.match(navigation, /if \(current\.active === expected\)/);
  assert.match(navigation, /window\.postMessage\(\{ type: navigation\.messageType/);
  assert.match(navigation, /location\.pathname\.match/);
  assert.match(navigation, /thread_open_timeout/);
  assert.match(navigation, /threadRoutePrefix/);
  assert.match(navigation, /__betterCodexDesktopBridge__\?\.openThread/);
});

test("Windows restart terminates the complete installed Codex package process tree", () => {
  const helperStart = source.indexOf("export function windowsCodexPackageProcessPowerShell");
  const start = source.indexOf("async function quitCodex()");
  const end = source.indexOf('if (process.platform !== "darwin")', start);
  assert.ok(helperStart >= 0 && start > helperStart && end > start, "quitCodex Windows implementation is missing");
  const windowsQuit = source.slice(helperStart, end);
  assert.match(windowsQuit, /Get-CimInstance Win32_Process -Filter \\\"Name = 'ChatGPT\.exe'\\\"/);
  assert.match(windowsQuit, /ExecutablePath -notlike \\\"\*\\\\WindowsApps\\\\OpenAI\.Codex_\*\\\"/);
  assert.match(windowsQuit, /SessionId/);
  assert.match(windowsQuit, /GetOwnerSid/);
  assert.match(windowsQuit, /Stop-Process -Id \$_.ProcessId/);
  assert.match(windowsQuit, /\$processes = @\(\$\{ownedPackageProcesses\}\)/);
  assert.match(windowsQuit, /windowsCodexPackageProcessPowerShell\("stop"\)/);
  assert.match(windowsQuit, /windowsCodexPackageProcessPowerShell\("count"\)/);
  assert.doesNotMatch(windowsQuit, /CommandLine -notmatch/);
  assert.doesNotMatch(windowsQuit, /Get-Process -Name 'ChatGPT','Codex'/);
});

test("Windows restart process-count command is valid PowerShell", {
  skip: process.platform !== "win32" ? "requires Windows PowerShell 5.1" : false,
}, () => {
  const command = windowsCodexPackageProcessPowerShell("count");
  const result = spawnSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", command], {
    encoding: "utf8",
  });

  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  assert.match(result.stdout.trim(), /^\d+$/);
});


test("Windows launch detects Codex without starting PowerShell or probing CDP", () => {
  const start = source.indexOf("export function codexProcessRunning()");
  const end = source.indexOf("export function windowsCodexPackageProcessPowerShell", start);
  const branch = source.slice(start, end);
  assert.match(branch, /tasklist\.exe/);
  assert.match(branch, /IMAGENAME eq ChatGPT\.exe/);
  assert.doesNotMatch(branch, /Get-CimInstance/);
});

test("directory picker does not block the Runtime request loop", () => {
  const start = nativeDialogSource.indexOf("export async function chooseNativeDirectory");
  assert.ok(start >= 0);
  const body = nativeDialogSource.slice(start);
  assert.match(body, /execFile\(/);
  assert.doesNotMatch(body, /execFileSync\(/);
  assert.match(serverSource, /workspace_path: await chooseNativeDirectory\(\)/);
});

test("every main target scan has a total deadline and candidate cap", () => {
  assert.match(source, /const cdpTargetScanTimeoutMs = 30_000/);
  assert.match(source, /const cdpTargetCandidateLimit = 32/);
  assert.match(source, /deadlineAt: options\.deadlineAt \?\? Date\.now\(\) \+ cdpTargetScanTimeoutMs/);
  assert.match(source, /\.slice\(0, cdpTargetCandidateLimit\)/);
});

test("CDP bridge trusts only the installed Codex listener and same-port loopback sockets", () => {
  const application = "/Applications/Codex.app";
  const codex = { socket: "0xabc", uid: 501, executable: `${application}/Contents/MacOS/ChatGPT` };
  const helper = { socket: "0xabc", uid: 501, executable: "/usr/local/bin/SkyComputerUseService" };
  assert.equal(darwinCdpListenerTrusted([codex, helper], 501, application), true);
  assert.equal(darwinCdpListenerTrusted([codex, { ...helper, socket: "0xdef" }], 501, application), false);
  assert.equal(darwinCdpListenerTrusted([codex, { ...helper, uid: 502 }], 501, application), false);
  assert.equal(darwinCdpListenerTrusted([helper], 501, application), false);
  assert.match(source, /function assertTrustedCdpListener\(port: number\)/);
  assert.match(source, /Get-NetTCPConnection -State Listen/);
  assert.match(source, /GetOwnerSid/);
  assert.match(source, /OpenAI\.Codex_/);
  assert.match(source, /\/usr\/sbin\/lsof/);
  assert.match(source, /-F0pd/);
  assert.doesNotMatch(source, /pids\.length !== 1/);
  assert.match(source, /new Set\(listeners\.map\(listener => listener\.socket\)\)\.size === 1/);
  assert.match(source, /listeners\.every\(listener => listener\.uid === currentUid\)/);
  assert.match(source, /listeners\.some\(listener => listener\.executable\.startsWith/);
  assert.match(source, /function debuggerUrlAllowed/);
  assert.match(source, /\["127\.0\.0\.1", "::1", "localhost"\]/);
  assert.match(source, /Number\(url\.port\) === port/);
  assert.match(source, /redirect: "error"/);
  assert.match(source, /if \(verifyListener\) assertTrustedCdpListener\(port\)/);
});

test("CDP bridge never treats the Better Codex Web UI as a desktop renderer", () => {
  assert.equal(targetAllowed({ url: "app://-/index.html", title: "Codex" }), true);
  assert.equal(targetAllowed({ url: "app://-/detached-window.html?initialRoute=%2Fdetached-window", title: "Codex" }), false);
  assert.equal(targetAllowed({ url: "app://-/index.html?initialRoute=%2Fglobal-dictation", title: "Codex" }), false);
  assert.equal(targetAllowed({ url: "app://-/index.html?initialRoute=%2Favatar-overlay", title: "Codex" }), false);
  assert.equal(targetAllowed({ url: "", title: "Codex" }), false);
  assert.equal(targetAllowed({ url: "https://aionui.talktodo.cn/web", title: "Better Codex" }), false);
  assert.equal(targetAllowed({ url: "http://127.0.0.1:57515/web", title: "Better Codex" }), false);
});

test("desktop bridge readiness follows bootstrap state instead of panel visibility", () => {
  assert.match(source, /ready: typeof window\.__betterCodexDesktopBridge__\?\.ready === 'function' && Boolean\(window\.__betterCodexDesktopBridge__\.ready\(\)\)/);
  assert.match(cliSource, /target => Boolean\(\(target as \{ bridge\?: boolean \}\)\.bridge\) && Boolean\(\(target as \{ ready\?: boolean \}\)\.ready\)/);
  assert.doesNotMatch(cliSource, /target => Boolean\(\(target as \{ bridge\?: boolean \}\)\.bridge\) && Boolean\(\(target as \{ panel\?: boolean \}\)\.panel\)/);
});

test("loading renderers remain pending even when content and native capabilities are present", () => {
  const capabilities = { content: true, sidebar: true, threads: false, projects: false, loading: true, documentId: 100 };
  const identity = {
    version: desktopBridgeVersion(), bundleChecksum: desktopBridgeBundleChecksum(), profile: betterCodexProfile,
    endpoint: "http://127.0.0.1:1234", pulse: true, ready: true, documentId: 100,
  };
  assert.equal(desktopRendererProbeReason(capabilities), "renderer_loading");
  assert.deepEqual(desktopIntegrationState(identity, identity.endpoint, capabilities), {
    state: "waiting_window", compatible: false, reason: "renderer_loading", error: null,
  });
  assert.equal(desktopIntegrationState({ ...identity, ready: false, bootstrapError: "desktop_catalog_loading" }, identity.endpoint, capabilities).state, "waiting_window");
  assert.equal(desktopIntegrationState({ ...identity, ready: false, bootstrapError: "desktop_catalog_loading" }, identity.endpoint, { ...capabilities, loading: false }).state, "waiting_window");
  assert.deepEqual(desktopIntegrationState(identity, identity.endpoint, { ...capabilities, loading: false }), {
    state: "ready", compatible: true, reason: null, error: null,
  });
});

test("desktop integration distinguishes missing capability, bootstrap failure, and changed document", () => {
  const capabilities = { content: true, sidebar: false, threads: false, projects: false, loading: false, documentId: 100 };
  const identity = { ready: false, bootstrapError: "desktop_catalog_service_unavailable", documentId: 100 };
  assert.deepEqual(desktopIntegrationState(identity, "http://127.0.0.1:1234", capabilities), {
    state: "failed", compatible: false, reason: "desktop_bridge_bootstrap_failed", error: "desktop_catalog_service_unavailable",
  });
  assert.equal(desktopRendererProbeReason({ ...capabilities, content: false }), "missing_content");
  assert.equal(desktopIntegrationState(identity, "http://127.0.0.1:1234", { ...capabilities, content: false }).reason, "missing_content");
  assert.deepEqual(desktopIntegrationState(identity, "http://127.0.0.1:1234", { ...capabilities, documentId: 200 }), {
    state: "waiting_window", compatible: false, reason: "renderer_document_changed", error: null,
  });
  for (const bootstrapError of ["desktop_catalog_sync_pending", "desktop_catalog_mutation_pending", "desktop_catalog_renderer_changed"]) {
    assert.deepEqual(desktopIntegrationState({ ...identity, bootstrapError }, "http://127.0.0.1:1234", capabilities), {
      state: "waiting_window", compatible: false, reason: "bootstrap_pending", error: bootstrapError,
    });
  }
  assert.equal(desktopIntegrationState({ ...identity, bootstrapError: "desktop_catalog_renderer_unavailable" }, "http://127.0.0.1:1234", capabilities).state, "failed");
});

type FakeRenderer = {
  id: string;
  url?: string;
  capabilities: { content: boolean; sidebar: boolean; threads: boolean; projects: boolean; loading: boolean; documentId: number };
  identity?: Record<string, unknown>;
};

async function runRendererFixture(renderers: FakeRenderer[], script: string) {
  const home = mkdtempSync(join(tmpdir(), "better-codex-cdp-renderers-"));
  const evaluated: string[] = [];
  const server = createServer((_request, response) => {
    const address = server.address();
    assert.ok(address && typeof address === "object");
    response.setHeader("content-type", "application/json");
    response.end(JSON.stringify(renderers.map(renderer => ({
      id: renderer.id, type: "page", title: "Codex", url: renderer.url || "app://-/index.html",
      webSocketDebuggerUrl: `ws://127.0.0.1:${address.port}/${renderer.id}`,
    }))));
  });
  const websocket = new WebSocketServer({ server });
  websocket.on("connection", (socket, request) => {
    const renderer = renderers.find(value => request.url === `/${value.id}`);
    assert.ok(renderer);
    socket.on("message", data => {
      const command = JSON.parse(String(data));
      assert.equal(command.method, "Runtime.evaluate");
      evaluated.push(renderer.id);
      const value = command.params.expression.includes("__betterCodexDesktopBridge__")
        ? { documentId: renderer.capabilities.documentId, ...renderer.identity }
        : renderer.capabilities;
      socket.send(JSON.stringify({ id: command.id, result: { result: { value } } }));
    });
  });
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  try {
    const address = server.address();
    assert.ok(address && typeof address === "object");
    const child = spawn(process.execPath, ["--import", "tsx", "--input-type=module", "-e", script, String(address.port)], {
      cwd: new URL("..", import.meta.url),
      env: { ...process.env, BETTER_CODEX_HOME: home, BETTER_CODEX_PEER_HOME: join(home, "peer"), BETTER_CODEX_DISABLE_DESKTOP_BRIDGE: "0" },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", chunk => { stdout += chunk; });
    child.stderr.on("data", chunk => { stderr += chunk; });
    const code = await new Promise<number | null>((resolve, reject) => {
      child.once("error", reject);
      child.once("close", resolve);
    });
    assert.equal(code, 0, stderr);
    return { value: JSON.parse(stdout.trim()), evaluated };
  } finally {
    for (const client of websocket.clients) client.terminate();
    await new Promise<void>(resolve => websocket.close(() => resolve()));
    await new Promise<void>(resolve => server.close(() => resolve()));
    rmSync(home, { recursive: true, force: true });
  }
}

const rendererCapabilities = { content: true, sidebar: false, threads: false, projects: false, loading: false, documentId: 100 };

test("CDP discovery preserves completed incompatible-document evidence across loading and auxiliary targets", { skip: process.platform === "linux" }, async t => {
  const incompatible = { id: "incompatible", capabilities: { ...rendererCapabilities, content: false } };
  const loading = { id: "loading", capabilities: { ...rendererCapabilities, loading: true, documentId: 200 } };
  const auxiliary = { id: "auxiliary", url: "app://-/index.html?initialRoute=%2Favatar-overlay", capabilities: { ...rendererCapabilities, content: false, documentId: 300 } };
  for (const renderers of [[incompatible, loading, auxiliary], [loading, auxiliary, incompatible]]) {
    await t.test(renderers[0].id, async () => {
      const result = await runRendererFixture(renderers, `
        const { probeMainCdpTargetsForTest } = await import('./src/cdp.ts');
        const { readCompatibilityStatus } = await import('./src/compatibility.ts');
        let error = null;
        try { await probeMainCdpTargetsForTest(Number(process.argv[1]), 3000); } catch (failure) { error = failure.message; }
        console.log(JSON.stringify({ error, status: readCompatibilityStatus() }));
      `);
      assert.equal(result.value.error, "codex_incompatible_missing_content");
      assert.equal(result.value.status.state, "failed");
      assert.equal(result.value.status.targetId, "incompatible");
      assert.equal(result.value.status.documentId, 100);
      assert.ok(!result.evaluated.includes("auxiliary"));
    });
  }
});

test("CDP attached-document observations keep failure ahead of loading and release removed evidence", async () => {
  const result = await runRendererFixture([
    { id: "failed", capabilities: rendererCapabilities, identity: { bootstrapError: "desktop_catalog_service_unavailable" } },
    { id: "loading", capabilities: { ...rendererCapabilities, loading: true, documentId: 200 }, identity: { bootstrapError: "desktop_catalog_loading" } },
    { id: "reloaded", capabilities: { ...rendererCapabilities, documentId: 300 }, identity: { documentId: 299, bootstrapError: "desktop_catalog_service_unavailable" } },
  ], `
    const { recordDesktopIntegrationsForTest } = await import('./src/cdp.ts');
    const { readCompatibilityStatus } = await import('./src/compatibility.ts');
    const target = id => ({ id, url: 'app://-/index.html', webSocketDebuggerUrl: 'ws://127.0.0.1:' + process.argv[1] + '/' + id });
    await recordDesktopIntegrationsForTest(['failed', 'loading'].map(target), 'http://127.0.0.1:1234');
    const failed = readCompatibilityStatus();
    await recordDesktopIntegrationsForTest([target('loading')], 'http://127.0.0.1:1234');
    const loading = readCompatibilityStatus();
    await recordDesktopIntegrationsForTest([target('reloaded')], 'http://127.0.0.1:1234');
    console.log(JSON.stringify({ failed, loading, reloaded: readCompatibilityStatus() }));
  `);
  assert.equal(result.value.failed.state, "failed");
  assert.equal(result.value.failed.targetId, "failed");
  assert.equal(result.value.failed.documentId, 100);
  assert.equal(result.value.loading.state, "waiting_window");
  assert.equal(result.value.loading.targetId, "loading");
  assert.equal(result.value.loading.documentId, 200);
  assert.equal(result.value.reloaded.state, "waiting_window");
  assert.equal(result.value.reloaded.reason, "renderer_document_changed");
  assert.equal(result.value.reloaded.documentId, 300);
  assert.equal(result.value.reloaded.capabilities.documentId, 300);
});

test("CDP discovery defers a loading main with mounted content", { skip: process.platform === "linux" }, async () => {
  const result = await runRendererFixture([
    { id: "loading", capabilities: { ...rendererCapabilities, loading: true } },
  ], `
    const { probeMainCdpTargetsForTest } = await import('./src/cdp.ts');
    const { readCompatibilityStatus } = await import('./src/compatibility.ts');
    const targets = await probeMainCdpTargetsForTest(Number(process.argv[1]), 3000);
    console.log(JSON.stringify({ targets, status: readCompatibilityStatus() }));
  `);
  assert.deepEqual(result.value.targets, []);
  assert.equal(result.value.status.state, "waiting_window");
  assert.equal(result.value.status.compatible, false);
  assert.equal(result.value.status.reason, "renderer_loading");
  assert.equal(result.value.status.documentId, 100);
});

test("macOS restart quits only the installed Desktop app by Bundle ID", () => {
  assert.match(source, /function desktopApplicationBundleId\(application: string\)/);
  assert.match(source, /tell application id/);
  assert.match(source, /return running/);
  assert.doesNotMatch(source, /const names = \["ChatGPT", "Codex"\]/);
  assert.doesNotMatch(source, /\/usr\/bin\/killall/);
});


test("desktop capability accepts the navigation shell when the thread list is unmounted", () => {
  const compatibility = readFileSync(new URL("../src/compatibility.ts", import.meta.url), "utf8");
  const expression = compatibility.slice(compatibility.indexOf("export function capabilityExpression"), compatibility.indexOf("export function missingCapabilities"));
  assert.match(expression, /selectors\.sidebarScroll/);
  assert.match(expression, /\[data-app-navigation-rail\], \[data-app-shell-page-sidebar\]/);
});

test("plugin launch never starts retired injection or restarts Codex for a missing listener", () => {
  const mcpRoute = cliSource.slice(cliSource.indexOf('if (command === "mcp" && !action)'), cliSource.indexOf('if (command === "mcp")'));
  assert.match(mcpRoute, /startMcpAppServer\(\{ ensureRuntime \}\)/);
  assert.doesNotMatch(mcpRoute, /restart|launchSidebar|cdpConnect/);
});

test("native restart choice uses Better Codex branding on Windows and macOS", () => {
  assert.match(nativeDialogSource, /appIconIco/);
  assert.match(nativeDialogSource, /AppIcon\.ico/);
  assert.match(nativeDialogSource, /\$form\.Icon = \$dialogIcon/);
  assert.match(nativeDialogSource, /\$form\.ShowIcon = \$true/);
  assert.match(nativeDialogSource, /appIconIcns/);
  assert.match(nativeDialogSource, /AppIcon\.icns/);
  assert.match(nativeDialogSource, /with icon \(POSIX file/);
});

test("Windows restart choice uses standard Windows dialog chrome and two explicit actions", () => {
  assert.match(nativeDialogSource, /AutoScaleMode.*Dpi/);
  assert.match(nativeDialogSource, /SystemFonts\]::MessageBoxFont/);
  assert.match(nativeDialogSource, /SystemColors\]::Control/);
  assert.match(nativeDialogSource, /FlatStyle.*System/);
  assert.match(nativeDialogSource, /UseVisualStyleBackColor = \$true/);
  assert.match(nativeDialogSource, /AccessibleName/);
  assert.match(nativeDialogSource, /FormBorderStyle.*FixedDialog/);
  assert.match(nativeDialogSource, /\$form\.ControlBox = \$true/);
  assert.match(nativeDialogSource, /Write-Output 'primary'/);
  assert.match(nativeDialogSource, /Write-Output 'secondary'/);
  assert.match(nativeDialogSource, /\$secondary\.Focus\(\)/);
  assert.match(nativeDialogSource, /default button \$\{secondary\}/);
  assert.doesNotMatch(nativeDialogSource, /\$form\.CancelButton = \$secondary/);
  assert.doesNotMatch(nativeDialogSource, /GraphicsPath/);
  assert.doesNotMatch(nativeDialogSource, /Set-RoundedRegion/);
  assert.doesNotMatch(nativeDialogSource, /Add_Paint/);
  assert.doesNotMatch(nativeDialogSource, /\$close = New-Object System\.Windows\.Forms\.Button/);
});

test("desktop native bridge does not require mounted sidebar UI", () => {
  assert.deepEqual(missingCapabilities({ content: true, sidebar: false, threads: false, projects: false }), []);
  assert.deepEqual(missingCapabilities({ content: false, sidebar: true, threads: true, projects: true }), ["content"]);
});
