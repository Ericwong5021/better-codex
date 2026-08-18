import assert from "node:assert/strict";
import { spawn, type ChildProcess } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

async function availablePort() {
  return new Promise<number>((resolve, reject) => {
    const probe = createServer();
    probe.once("error", reject);
    probe.listen(0, "127.0.0.1", () => {
      const address = probe.address();
      const port = typeof address === "object" && address ? address.port : 0;
      probe.close(error => error ? reject(error) : resolve(port));
    });
  });
}

function startRuntime(home: string, port: number, token: string) {
  return spawn(process.execPath, ["--import", "tsx", "src/cli.ts", "serve"], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      BETTER_CODEX_HOME: home,
      BETTER_CODEX_DB: join(home, "better-codex.db"),
      BETTER_CODEX_PORT: String(port),
      BETTER_CODEX_TOKEN: token,
      BETTER_CODEX_DISABLE_RUNTIME_SESSION_RELAY: "1",
      CODEX_HOME: join(home, "codex"),
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
}

async function waitForRuntime(port: number, process: ChildProcess) {
  let errorOutput = "";
  process.stderr?.on("data", chunk => { errorOutput += String(chunk); });
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    if (process.exitCode !== null) throw new Error(errorOutput || `runtime_exit_${process.exitCode}`);
    try {
      if ((await fetch(`http://127.0.0.1:${port}/health`)).ok) return;
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  throw new Error(errorOutput || "runtime_start_timeout");
}

async function stopRuntime(process: ChildProcess) {
  if (process.exitCode !== null) return;
  process.kill("SIGTERM");
  await new Promise<void>(resolve => process.once("exit", () => resolve()));
}

async function readStreamChunk(reader: ReadableStreamDefaultReader<Uint8Array>) {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      reader.read(),
      new Promise<never>((_, reject) => { timeout = setTimeout(() => reject(new Error("event_stream_timeout")), 2000); }),
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

test("request body limits stop buffering after rejection", () => {
  const source = readFileSync(new URL("../src/server.ts", import.meta.url), "utf8");

  assert.match(source, /declaredLength > limit[\s\S]*request\.resume\(\)/);
  assert.match(source, /size > limit[\s\S]*request\.off\("data", onData\)[\s\S]*request\.resume\(\)/);
});

test("web host boots the shared DOM injection behind a local session", async () => {
  const home = mkdtempSync(join(tmpdir(), "better-codex-web-test-"));
  mkdirSync(join(home, "codex"));
  const port = await availablePort();
  const token = "web-test-token";
  const runtime = startRuntime(home, port, token);
  const base = `http://127.0.0.1:${port}`;

  try {
    await waitForRuntime(port, runtime);

    const page = await fetch(`${base}/web`);
    assert.equal(page.status, 200);
    const html = await page.text();
    assert.match(html, /data-better-codex-web-surface/);
    assert.match(html, /\/web\/host\.js/);
    assert.match(html, /class="web-brand-logo"/);
    assert.match(html, /<link rel="icon" type="image\/png" href="data:image\/png;base64,/);
    assert.match(html, /<strong>Better Codex<\/strong>/);
    assert.match(html, /id="web-profile-name">你<\/strong>/);
    assert.match(html, /id="web-usage"[^>]*hidden/);
    assert.doesNotMatch(html, />新对话<|>已安排<|>插件</);
    assert.match(page.headers.get("content-security-policy") || "", /script-src 'self'/);
    assert.equal(page.headers.get("cross-origin-resource-policy"), "same-origin");

    const hostScript = await (await fetch(`${base}/web/host.js`)).text();
    assert.match(hostScript, /navigator\.language \|\| document\.documentElement\.lang/);
    assert.match(hostScript, /consumeFragmentToken\(\)/);
    assert.match(hostScript, /sessionStorage\.setItem\("better-codex-web-session", sessionToken\)/);
    assert.match(hostScript, /authorization: "Bearer " \+ sessionToken/);
    assert.doesNotMatch(hostScript, /authorization: "Bearer " \+ request\.token/);
    assert.match(hostScript, /response\.status === 401/);
    assert.match(hostScript, /window\.betterCodexHost = Object\.freeze/);
    assert.match(hostScript, /subscribe: subscribeRuntime/);
    assert.match(hostScript, /better-codex-web-event-cursor/);
    assert.match(hostScript, /better-codex:bootstrap/);
    assert.match(hostScript, /if \(usageLoadedAt\) renderUsage\(cachedUsage\)/);
    assert.match(hostScript, /\/api\/account\/usage/);
    assert.match(hostScript, /profileButton\.setAttribute\("aria-expanded"/);

    const hostCss = await (await fetch(`${base}/web/host.css`)).text();
    assert.doesNotMatch(hostCss, /^\s*\*\s*\{/m);
    assert.doesNotMatch(hostCss, /^\s*button(?:\s*,\s*input)?\s*\{/m);
    assert.doesNotMatch(hostCss, /^\s*button:(?:active|focus-visible)/m);
    assert.match(hostCss, /\.web-sidebar button/);

    const unauthorized = await fetch(`${base}/web/injection.js`);
    assert.equal(unauthorized.status, 401);

    const invalidSession = await fetch(`${base}/web/session`, {
      method: "POST",
      headers: { "content-type": "application/json", origin: base },
      body: JSON.stringify({ token: "wrong-token" }),
    });
    assert.equal(invalidSession.status, 401);

    const crossOriginSession = await fetch(`${base}/web/session`, {
      method: "POST",
      headers: { "content-type": "application/json", origin: "https://example.com" },
      body: JSON.stringify({ token }),
    });
    assert.equal(crossOriginSession.status, 403);

    const oversizedSession = await fetch(`${base}/web/session`, {
      method: "POST",
      headers: { "content-type": "application/json", origin: base },
      body: JSON.stringify({ token: "x".repeat(5000) }),
    });
    assert.equal(oversizedSession.status, 413);
    assert.deepEqual(await oversizedSession.json(), { error: "body_too_large" });

    const session = await fetch(`${base}/web/session`, {
      method: "POST",
      headers: { "content-type": "application/json", origin: base },
      body: JSON.stringify({ token }),
    });
    assert.equal(session.status, 200);
    assert.equal(session.headers.get("set-cookie"), null);
    const sessionToken = ((await session.json()) as { token?: string }).token || "";
    assert.match(sessionToken, /^[0-9a-f-]{36}$/);

    const crossOriginInjection = await fetch(`${base}/web/injection.js?locale=zh-CN&session=${sessionToken}`, {
      headers: { "sec-fetch-site": "same-site" },
    });
    assert.equal(crossOriginInjection.status, 403);

    const injection = await fetch(`${base}/web/injection.js?locale=zh-CN&session=${sessionToken}`, {
      headers: { "sec-fetch-site": "same-origin" },
    });
    assert.equal(injection.status, 200);
    assert.equal(injection.headers.get("cross-origin-resource-policy"), "same-origin");
    const source = await injection.text();
    assert.doesNotMatch(source, new RegExp(token));
    assert.match(source, new RegExp(sessionToken));
    assert.match(source, /const HOST_KIND = "web"/);
    assert.match(source, /const INITIAL_LOCALE = "zh-CN"/);
    assert.match(source, /HOST_KIND === "web" \? INITIAL_LOCALE : bootstrap\.locale/);
    assert.match(source, /data-better-codex-web-surface/);
    assert.match(source, /button\.className = "web-nav-button"/);
    assert.match(source, /parent\.prepend\(entry\)/);
    assert.match(source, /document\.documentElement\.dataset\.theme = resolvedTheme/);
    assert.match(source, /--bc-host-" \+ mode \+ "-font-ui/);
    assert.doesNotThrow(() => new Function(source));

    const relayInjection = await fetch(`${base}/web/injection.js?locale=en-US`, {
      headers: { authorization: `Bearer ${token}`, "x-better-codex-relay": "1", "sec-fetch-site": "cross-site" },
    });
    assert.equal(relayInjection.status, 200);
    const relaySource = await relayInjection.text();
    assert.doesNotMatch(relaySource, new RegExp(token));
    assert.doesNotMatch(relaySource, new RegExp(sessionToken));
    assert.match(relaySource, /const HOST_KIND = "web"/);
    assert.match(relaySource, /const INITIAL_LOCALE = "en"/);
    assert.doesNotThrow(() => new Function(relaySource));

    const webBootstrap = await fetch(`${base}/api/bootstrap`, { headers: { authorization: `Bearer ${sessionToken}` } });
    assert.equal(webBootstrap.status, 200);

    const accountUsage = await fetch(`${base}/api/account/usage`, { headers: { authorization: `Bearer ${sessionToken}` } });
    assert.equal(accountUsage.status, 200);
    assert.ok(Object.hasOwn(await accountUsage.json(), "usage"));

    const eventController = new AbortController();
    const eventResponse = await fetch(`${base}/api/events`, {
      headers: { authorization: `Bearer ${sessionToken}` },
      signal: eventController.signal,
    });
    assert.equal(eventResponse.status, 200);
    assert.match(eventResponse.headers.get("content-type") || "", /text\/event-stream/);
    const eventReader = eventResponse.body?.getReader();
    assert.ok(eventReader);
    let eventSource = new TextDecoder().decode((await readStreamChunk(eventReader)).value);
    assert.match(eventSource, /event: ready/);
    const eventMutation = await fetch(`${base}/api/projects`, {
      method: "POST",
      headers: { authorization: `Bearer ${sessionToken}`, "content-type": "application/json" },
      body: JSON.stringify({ name: "Event project", workspace_path: home }),
    });
    assert.equal(eventMutation.status, 201);
    while (!eventSource.includes("event: change")) {
      const chunk = await readStreamChunk(eventReader);
      if (chunk.done) break;
      eventSource += new TextDecoder().decode(chunk.value);
    }
    assert.match(eventSource, /event: change/);
    assert.match(eventSource, /id: 1/);
    eventController.abort();

    const replayController = new AbortController();
    const replayResponse = await fetch(`${base}/api/events`, {
      headers: { authorization: `Bearer ${sessionToken}`, "last-event-id": "0" },
      signal: replayController.signal,
    });
    const replayReader = replayResponse.body?.getReader();
    assert.ok(replayReader);
    const replaySource = new TextDecoder().decode((await readStreamChunk(replayReader)).value);
    assert.match(replaySource, /event: change/);
    assert.match(replaySource, /id: 1/);
    replayController.abort();

    const resetController = new AbortController();
    const resetResponse = await fetch(`${base}/api/events`, {
      headers: { authorization: `Bearer ${sessionToken}`, "last-event-id": "999" },
      signal: resetController.signal,
    });
    const resetReader = resetResponse.body?.getReader();
    assert.ok(resetReader);
    const resetSource = new TextDecoder().decode((await readStreamChunk(resetReader)).value);
    assert.match(resetSource, /event: reset/);
    assert.match(resetSource, /id: 1/);
    resetController.abort();

    const englishInjection = await fetch(`${base}/web/injection.js?locale=en-US&session=${sessionToken}`);
    assert.equal(englishInjection.status, 200);
    assert.match(await englishInjection.text(), /const INITIAL_LOCALE = "en"/);

    let newestSessionToken = "";
    for (let index = 0; index < 32; index++) {
      const nextSession = await fetch(`${base}/web/session`, {
        method: "POST",
        headers: { "content-type": "application/json", origin: base },
        body: JSON.stringify({ token }),
      });
      assert.equal(nextSession.status, 200);
      newestSessionToken = ((await nextSession.json()) as { token?: string }).token || "";
    }
    assert.equal((await fetch(`${base}/api/bootstrap`, { headers: { authorization: `Bearer ${sessionToken}` } })).status, 401);
    assert.equal((await fetch(`${base}/api/bootstrap`, { headers: { authorization: `Bearer ${newestSessionToken}` } })).status, 200);

    const threadFallback = await fetch(`${base}/local/00000000-0000-4000-8000-000000000000`);
    assert.equal(threadFallback.status, 200);
    assert.match(await threadFallback.text(), /会话已在 Codex 中打开/);
  } finally {
    await stopRuntime(runtime);
    rmSync(home, { recursive: true, force: true });
  }
});
