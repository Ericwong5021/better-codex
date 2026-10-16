import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

function fixture() {
  const home = mkdtempSync(join(tmpdir(), "better-codex-desktop-start-"));
  mkdirSync(join(home, "runtime"));
  mkdirSync(join(home, "run"));
  const activationPath = join(home, "runtime", "update-activation.json");
  const activation = JSON.stringify({ status: "activating", updateId: "11111111-1111-4111-8111-111111111111", stage: "activating", updatedAt: new Date().toISOString() });
  writeFileSync(activationPath, activation);
  const lockPath = join(home, "run", "runtime.lock");
  // Also fence an accidental child startup so a failing regression cannot leave
  // an orphan Runtime or touch a business database while waiting for readiness.
  const lock = JSON.stringify({ pid: process.pid, instanceId: "fixture-start-lock", startedAt: new Date().toISOString() });
  writeFileSync(lockPath, lock);
  return {
    home,
    async start() {
      const child = spawn(process.execPath, ["--import", "tsx", "src/cli.ts", "desktop", "start"], {
        cwd: new URL("..", import.meta.url),
        env: {
          ...process.env,
          BETTER_CODEX_HOME: home, BETTER_CODEX_PEER_HOME: join(home, "peer"), BETTER_CODEX_PROFILE: "development",
          BETTER_CODEX_DB: join(home, "fixture.db"), BETTER_CODEX_TOKEN: "desktop-start-fixture-token",
          BETTER_CODEX_DISABLE_DELEGATION: "1", BETTER_CODEX_DISABLE_DESKTOP_BRIDGE: "1",
          BETTER_CODEX_DISABLE_MENUBAR: "1", BETTER_CODEX_DISABLE_RUNTIME_SESSION_RELAY: "1",
          CODEX_HOME: join(home, "codex"),
        },
        stdio: ["ignore", "pipe", "pipe"], timeout: 15_000,
      });
      let stdout = "";
      let stderr = "";
      child.stdout.on("data", chunk => { stdout += String(chunk); });
      child.stderr.on("data", chunk => { stderr += String(chunk); });
      const [code, signal] = await once(child, "close");
      return { code, signal, stdout, stderr };
    },
    assertPreserved() {
      assert.equal(readFileSync(activationPath, "utf8"), activation);
      assert.equal(readFileSync(lockPath, "utf8"), lock);
      for (const path of ["fixture.db", "run/session-host.lock", "run/session-host.pid", "run/desktop-bridge.json"]) {
        assert.equal(existsSync(join(home, path)), false, `${path} must not be created`);
      }
    },
    cleanup() { rmSync(home, { recursive: true, force: true }); },
  };
}

test("desktop start cannot launch a missing Runtime during update activation", { timeout: 20_000 }, async () => {
  const isolated = fixture();
  try {
    const result = await isolated.start();
    assert.equal(result.signal, null, result.stderr);
    assert.equal(result.code, 1, result.stderr);
    assert.match(result.stderr, /desktop_start_update_in_progress/);
    assert.doesNotMatch(result.stdout, /"runtime"\s*:\s*"ready"/);
    assert.equal(existsSync(join(isolated.home, "run/runtime.json")), false);
    assert.equal(existsSync(join(isolated.home, "logs/runtime.log")), false, "no Runtime child may be spawned");
    isolated.assertPreserved();
  } finally { isolated.cleanup(); }
});

test("desktop start waits for an existing unhealthy Runtime without restarting it during activation", { timeout: 10_000 }, async () => {
  const isolated = fixture();
  const paths: string[] = [];
  const state = {
    pid: process.pid, port: 0, instanceId: "fixture-existing-runtime", version: "1.2.3", generation: 4,
    startedAt: new Date().toISOString(), processStartedAt: new Date().toISOString(), handoffUpdateId: null,
  };
  const server = createServer((request, response) => {
    paths.push(request.url || "");
    const ready = paths.length > 1;
    response.writeHead(ready ? 200 : 503, { "content-type": "application/json" });
    response.end(JSON.stringify({ ...state, ok: ready, runtime_identity: { ok: true }, database: { ok: ready }, desktop: { state: "disabled" } }));
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert.ok(address && typeof address === "object");
  state.port = address.port;
  const statePath = join(isolated.home, "run/runtime.json");
  const originalState = JSON.stringify(state);
  writeFileSync(statePath, originalState);
  try {
    const result = await isolated.start();
    assert.equal(result.signal, null, result.stderr);
    assert.equal(result.code, 0, result.stderr);
    assert.equal(JSON.parse(result.stdout).runtime, "ready");
    assert.ok(paths.length >= 3, "readiness must recover before the final desktop status check");
    assert.ok(paths.every(path => path === "/readyz"), JSON.stringify(paths));
    assert.equal(readFileSync(statePath, "utf8"), originalState);
    assert.equal(existsSync(join(isolated.home, "logs/runtime.log")), false);
    isolated.assertPreserved();
  } finally {
    server.closeAllConnections();
    await new Promise<void>(resolve => server.close(() => resolve()));
    isolated.cleanup();
  }
});
