import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn, type ChildProcess } from "node:child_process";
import test from "node:test";

async function availablePort() {
  return new Promise<number>((resolve, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      server.close(error => error ? reject(error) : resolve(port));
    });
  });
}

function startGateway(home: string, port: number, token: string) {
  return spawn(process.execPath, ["--import", "tsx", "src/cli.ts", "serve"], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      BETTER_CODEX_HOME: home,
      BETTER_CODEX_PORT: String(port),
      BETTER_CODEX_TOKEN: token,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
}

async function waitForGateway(port: number, process: ChildProcess) {
  let output = "";
  process.stderr?.on("data", chunk => { output += String(chunk); });
  for (let attempt = 0; attempt < 80; attempt += 1) {
    if (process.exitCode !== null) throw new Error(output || `gateway_exit_${process.exitCode}`);
    try {
      const response = await fetch(`http://127.0.0.1:${port}/health`);
      if (response.ok) return;
    } catch {
    }
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  throw new Error(output || "gateway_start_timeout");
}

async function stopGateway(process: ChildProcess) {
  if (process.exitCode !== null) return;
  process.kill("SIGTERM");
  await new Promise<void>(resolve => process.once("exit", () => resolve()));
}

test("gateway completes the issue workflow and survives restart", async () => {
  const home = mkdtempSync(join(tmpdir(), "better-codex-gateway-test-"));
  const port = await availablePort();
  const token = "gateway-test-token";
  let gateway = startGateway(home, port, token);
  const request = async (path: string, options: RequestInit = {}) => fetch(`http://127.0.0.1:${port}${path}`, {
    ...options,
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
      ...(options.headers ?? {}),
    },
  });

  try {
    await waitForGateway(port, gateway);
    const health = await (await fetch(`http://127.0.0.1:${port}/health`)).json() as { database: { schemaVersion: number } };
    assert.equal(health.database.schemaVersion, 2);

    const preflight = await fetch(`http://127.0.0.1:${port}/api/bootstrap`, {
      method: "OPTIONS",
      headers: {
        origin: "app://-",
        "access-control-request-method": "GET",
        "access-control-request-headers": "content-type",
        "access-control-request-private-network": "true",
      },
    });
    assert.equal(preflight.status, 204);
    assert.equal(preflight.headers.get("access-control-allow-origin"), "app://-");
    assert.equal(preflight.headers.get("access-control-allow-private-network"), "true");

    const projectResponse = await request("/api/projects", { method: "POST", body: JSON.stringify({ name: "Gateway" }) });
    assert.equal(projectResponse.status, 201);
    const project = await projectResponse.json() as { id: string };

    const issueResponse = await request("/api/issues", { method: "POST", body: JSON.stringify({ project_id: project.id, title: "Round trip", thread_id: "local:gateway-thread" }) });
    assert.equal(issueResponse.status, 201);
    const issue = await issueResponse.json() as { id: string; version: number };

    const invalidResponse = await request(`/api/issues/${issue.id}`, { method: "PATCH", body: JSON.stringify({ version: issue.version, pinned: "false" }) });
    assert.equal(invalidResponse.status, 400);
    assert.deepEqual(await invalidResponse.json(), { error: "invalid_pinned" });

    const updatedResponse = await request(`/api/issues/${issue.id}`, { method: "PATCH", body: JSON.stringify({ version: issue.version, status: "in_progress" }) });
    assert.equal(updatedResponse.status, 200);
    const staleResponse = await request(`/api/issues/${issue.id}`, { method: "PATCH", body: JSON.stringify({ version: issue.version, title: "Stale" }) });
    assert.equal(staleResponse.status, 409);
    assert.deepEqual(await staleResponse.json(), { error: "version_conflict" });

    await stopGateway(gateway);
    gateway = startGateway(home, port, token);
    await waitForGateway(port, gateway);
    const restoredResponse = await request(`/api/issues/${issue.id}`);
    assert.equal(restoredResponse.status, 200);
    const restored = await restoredResponse.json() as { status: string; thread_id: string };
    assert.equal(restored.status, "in_progress");
    assert.equal(restored.thread_id, "local:gateway-thread");
  } finally {
    await stopGateway(gateway);
    rmSync(home, { recursive: true, force: true });
  }
});
