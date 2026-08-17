import { spawn, type ChildProcess } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

export type RuntimeFixture = {
  baseUrl: string;
  token: string;
  workspacePath: string;
  output: () => string;
  restart: () => Promise<void>;
  stop: () => Promise<void>;
};

async function availablePort() {
  return await new Promise<number>((resolve, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        server.close();
        reject(new Error("port_unavailable"));
        return;
      }
      server.close(error => error ? reject(error) : resolve(address.port));
    });
  });
}

async function waitForHealth(baseUrl: string, child: ChildProcess, output: () => string) {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`runtime_exited_${child.exitCode}\n${output()}`);
    try {
      const response = await fetch(`${baseUrl}/health`);
      if (response.ok) return;
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error(`runtime_start_timeout\n${output()}`);
}

async function stopProcess(child: ChildProcess) {
  if (child.exitCode !== null) return;
  child.kill("SIGTERM");
  const exited = await Promise.race([
    new Promise<boolean>(resolve => child.once("exit", () => resolve(true))),
    new Promise<boolean>(resolve => setTimeout(() => resolve(false), 5_000)),
  ]);
  if (!exited && child.exitCode === null) child.kill("SIGKILL");
}

export async function startRuntimeFixture(): Promise<RuntimeFixture> {
  const fixtureHome = mkdtempSync(join(tmpdir(), "better-codex-web-e2e-"));
  const codexHome = join(fixtureHome, "codex");
  mkdirSync(codexHome, { recursive: true });
  const port = await availablePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const token = `web-e2e-${randomUUID()}`;
  const outputLines: string[] = [];
  const output = () => outputLines.join("");
  const spawnRuntime = () => {
    const child = spawn(process.execPath, ["--import", "tsx", "src/cli.ts", "serve"], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        BETTER_CODEX_HOME: fixtureHome,
        BETTER_CODEX_DB: join(fixtureHome, "better-codex.db"),
        BETTER_CODEX_PORT: String(port),
        BETTER_CODEX_TOKEN: token,
        CODEX_HOME: codexHome,
      },
      stdio: ["ignore", "pipe", "pipe"],
    });
    child.stdout?.on("data", chunk => outputLines.push(String(chunk)));
    child.stderr?.on("data", chunk => outputLines.push(String(chunk)));
    return child;
  };
  let child = spawnRuntime();
  try {
    await waitForHealth(baseUrl, child, output);
  } catch (error) {
    await stopProcess(child);
    rmSync(fixtureHome, { recursive: true, force: true });
    throw error;
  }
  return {
    baseUrl,
    token,
    workspacePath: fixtureHome,
    output,
    restart: async () => {
      await stopProcess(child);
      child = spawnRuntime();
      await waitForHealth(baseUrl, child, output);
    },
    stop: async () => {
      await stopProcess(child);
      rmSync(fixtureHome, { recursive: true, force: true });
    },
  };
}
