import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createServer, type RequestListener } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

async function desktopStopFixture(handler: RequestListener) {
  const home = mkdtempSync(join(tmpdir(), "better-codex-desktop-stop-"));
  // A disposable process stands in for Runtime so a regression cannot signal
  // this test process or an installed Runtime, Session Host, or service.
  const runtime = spawn(process.execPath, ["-e", `
    process.on("SIGTERM", () => process.stdout.write("signal:SIGTERM\\n"));
    process.on("SIGINT", () => process.stdout.write("signal:SIGINT\\n"));
    setInterval(() => {}, 1000);
    process.stdout.write("ready\\n");
  `], { stdio: ["ignore", "pipe", "pipe"] });
  let runtimeOutput = "";
  runtime.stdout.on("data", chunk => { runtimeOutput += String(chunk); });
  await once(runtime.stdout, "data");
  const requests: string[] = [];
  const server = createServer((request, response) => {
    requests.push(`${request.method} ${request.url}`);
    handler(request, response);
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert.ok(address && typeof address === "object");
  const identity = {
    pid: runtime.pid!, port: address.port, instanceId: "desktop-stop-runtime", generation: 7,
    version: "1.2.3", startedAt: new Date().toISOString(), processStartedAt: new Date().toISOString(),
    handoffUpdateId: null, handoffRecovery: false, handoffHostReplacement: false,
  };
  mkdirSync(join(home, "run"));
  const statePath = join(home, "run", "runtime.json");
  const originalState = JSON.stringify(identity);
  writeFileSync(statePath, originalState);
  return {
    home, identity, requests,
    async stop() {
      const child = spawn(process.execPath, ["--import", "tsx", "src/cli.ts", "desktop", "stop"], {
        cwd: new URL("..", import.meta.url),
        env: {
          ...process.env,
          BETTER_CODEX_HOME: home,
          BETTER_CODEX_PEER_HOME: join(home, "peer"),
          BETTER_CODEX_DB: join(home, "better-codex.db"),
          BETTER_CODEX_PROFILE: "development",
          BETTER_CODEX_TOKEN: "desktop-stop-fixture-token",
          BETTER_CODEX_DISABLE_DELEGATION: "1",
          BETTER_CODEX_DISABLE_DESKTOP_BRIDGE: "1",
        },
        stdio: ["ignore", "pipe", "pipe"],
        timeout: 12_000,
      });
      let stdout = "";
      let stderr = "";
      child.stdout.on("data", chunk => { stdout += String(chunk); });
      child.stderr.on("data", chunk => { stderr += String(chunk); });
      const [code, signal] = await once(child, "close");
      return { code, signal, stdout, stderr };
    },
    assertPreserved() {
      assert.equal(runtime.exitCode, null, "Runtime stand-in must remain alive");
      assert.equal(runtime.signalCode, null, "Runtime stand-in must not be killed");
      assert.doesNotMatch(runtimeOutput, /signal:/, "Runtime stand-in must not receive termination signals");
      assert.equal(readFileSync(statePath, "utf8"), originalState, "Runtime identity must remain unchanged");
    },
    async cleanup() {
      server.closeAllConnections();
      await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
      if (runtime.exitCode === null && runtime.signalCode === null) {
        const exited = once(runtime, "exit");
        runtime.kill("SIGKILL");
        await exited;
      }
      rmSync(home, { recursive: true, force: true });
    },
  };
}

function diagnostics(stderr: string) {
  return stderr.split("\n").filter(line => line.startsWith("BETTER_CODEX_DIAGNOSTIC "))
    .map(line => JSON.parse(line.slice("BETTER_CODEX_DIAGNOSTIC ".length)) as Record<string, unknown>);
}

test("menu-bar stop reports an unknown outcome when Runtime shutdown times out", { timeout: 20_000 }, async () => {
  const fixture = await desktopStopFixture(request => { request.resume(); });
  try {
    const result = await fixture.stop();
    assert.equal(result.signal, null, result.stderr);
    assert.equal(result.code, 1, result.stderr);
    assert.match(result.stderr, /Runtime 未响应退出请求，退出结果尚未确认/);
    assert.doesNotMatch(result.stdout, /"stopped"\s*:\s*true/);
    const failure = diagnostics(result.stderr).find(value => value.scope === "desktop" && value.event === "shutdown_request_failed");
    assert.ok(failure, result.stderr);
    assert.equal(failure.profile, "development");
    assert.equal(failure.home, fixture.home);
    assert.equal(failure.runtime_pid, fixture.identity.pid);
    assert.equal(failure.runtime_instance_id, fixture.identity.instanceId);
    assert.equal(failure.runtime_generation, fixture.identity.generation);
    assert.equal(failure.phase, "request_shutdown");
    assert.equal(failure.outcome, "unknown");
    assert.equal(typeof failure.error, "string");
    assert.ok(failure.error);
    assert.deepEqual(fixture.requests, ["POST /api/shutdown"]);
    fixture.assertPreserved();
  } finally { await fixture.cleanup(); }
});

test("menu-bar stop preserves an update-in-progress rejection", { timeout: 15_000 }, async () => {
  const fixture = await desktopStopFixture((request, response) => {
    request.resume();
    response.writeHead(409, { "content-type": "application/json" });
    response.end(JSON.stringify({ error: "desktop_exit_update_in_progress" }));
  });
  try {
    const result = await fixture.stop();
    assert.equal(result.signal, null, result.stderr);
    assert.equal(result.code, 1, result.stderr);
    assert.match(result.stderr, /desktop_exit_update_in_progress/);
    assert.doesNotMatch(result.stderr, /Runtime 未响应退出请求/);
    assert.doesNotMatch(result.stdout, /"stopped"\s*:\s*true/);
    assert.equal(diagnostics(result.stderr).find(value => value.event === "shutdown_request_failed")?.outcome, "rejected");
    assert.deepEqual(fixture.requests, ["POST /api/shutdown"]);
    fixture.assertPreserved();
  } finally { await fixture.cleanup(); }
});
