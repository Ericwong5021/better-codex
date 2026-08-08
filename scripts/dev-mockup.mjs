import { spawn, spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { closeSync, existsSync, mkdirSync, openSync, readFileSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const executable = join(root, "node_modules", ".bin", process.platform === "win32" ? "tsx.cmd" : "tsx");
const mockupHome = resolve(process.env.BETTER_CODEX_MOCKUP_HOME || join(tmpdir(), "better-codex-mockup"));
const productionHome = resolve(process.env.BETTER_CODEX_HOME || join(homedir(), ".better-codex"));
if (mockupHome === productionHome) throw new Error("mockup_home_conflicts_with_production");
const sessionPath = join(productionHome, "run", "mockup-session.json");
const sessionToken = randomUUID();
let restoreInjection = false;

function alive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function sessionValue(pid) {
  return JSON.stringify({ pid, token: sessionToken, mockup_home: mockupHome, restore_injection: restoreInjection, started_at: new Date().toISOString() });
}

function acquireSession() {
  mkdirSync(dirname(sessionPath), { recursive: true });
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const descriptor = openSync(sessionPath, "wx", 0o600);
      writeFileSync(descriptor, sessionValue(process.pid));
      closeSync(descriptor);
      return;
    } catch (error) {
      let current = null;
      try { current = JSON.parse(readFileSync(sessionPath, "utf8")); } catch {}
      if (Number.isInteger(current?.pid) && alive(current.pid)) throw new Error("mockup_already_running");
      try { unlinkSync(sessionPath); } catch {}
      if (attempt === 1) throw error;
    }
  }
}

function transferSession(pid) {
  const temporary = `${sessionPath}.${process.pid}.tmp`;
  writeFileSync(temporary, sessionValue(pid), { mode: 0o600 });
  renameSync(temporary, sessionPath);
}

function releaseSession() {
  try {
    const current = JSON.parse(readFileSync(sessionPath, "utf8"));
    if (current.token === sessionToken) unlinkSync(sessionPath);
  } catch {}
}

function restoreInjectionState() {
  const path = join(productionHome, "run", "injection.json");
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.tmp`;
  writeFileSync(temporary, JSON.stringify({ enabled: true }), { mode: 0o600 });
  renameSync(temporary, path);
}

acquireSession();
const installedTokenPath = join(productionHome, "run", "token");
const installedToken = process.env.BETTER_CODEX_TOKEN || (existsSync(installedTokenPath) ? readFileSync(installedTokenPath, "utf8").trim() : "");
const injectionStatePath = join(productionHome, "run", "injection.json");
restoreInjection = existsSync(installedTokenPath);
try {
  if (existsSync(injectionStatePath)) restoreInjection = JSON.parse(readFileSync(injectionStatePath, "utf8")).enabled !== false;
} catch {}
transferSession(process.pid);
const sourceCli = ["src/cli.ts"];
if (restoreInjection) {
  const disabled = spawnSync(executable, [...sourceCli, "disable", "--port", String(process.env.BETTER_CODEX_CDP_PORT || 9229)], { cwd: root, stdio: "inherit" });
  if (disabled.status !== 0) {
    restoreInjectionState();
    releaseSession();
    process.exit(disabled.status ?? 1);
  }
}
const environment = {
  ...process.env,
  BETTER_CODEX_HOME: mockupHome,
  BETTER_CODEX_DB: join(mockupHome, "better-codex.db"),
  BETTER_CODEX_RUNTIME_PORT: "0",
  BETTER_CODEX_DISABLE_DELEGATION: "1",
  CODEX_HOME: join(mockupHome, "codex"),
  ...(installedToken ? { BETTER_CODEX_TOKEN: installedToken } : {}),
};
const cdpPort = String(process.env.BETTER_CODEX_CDP_PORT || 9229);

const server = spawn(executable, [...sourceCli, "serve", "--mockup"], { cwd: root, env: environment, stdio: "inherit" });
const watcher = spawn(executable, [...sourceCli, "watch-inject", cdpPort], { cwd: root, env: environment, stdio: "inherit" });
const guardian = spawn(process.execPath, [join(root, "scripts", "dev-mockup-restore.mjs"), String(process.pid), root, productionHome, mockupHome, cdpPort, String(restoreInjection), sessionPath, sessionToken, String(server.pid || 0), String(watcher.pid || 0)], { cwd: root, env: { ...process.env, ...(installedToken ? { BETTER_CODEX_TOKEN: installedToken } : {}) }, detached: true, stdio: "ignore" });
if (!guardian.pid) {
  server.kill("SIGTERM");
  watcher.kill("SIGTERM");
  if (restoreInjection) restoreInjectionState();
  releaseSession();
  throw new Error("mockup_guardian_start_failed");
}
transferSession(guardian.pid);
guardian.unref();
let stopping = false;
let serverExited = false;
let watcherExited = false;
let exitCode = 0;
let cleaned = false;

function finish() {
  if (!serverExited || !watcherExited || cleaned) return;
  cleaned = true;
  process.exit(exitCode);
}

function stop(code = 0) {
  if (stopping) return finish();
  stopping = true;
  exitCode = code;
  if (!serverExited) server.kill("SIGTERM");
  if (!watcherExited) watcher.kill("SIGTERM");
  finish();
}

server.once("exit", code => {
  serverExited = true;
  if (!stopping) stop(code ?? 1);
  finish();
});
watcher.once("exit", code => {
  watcherExited = true;
  if (!stopping) stop(code ?? 1);
  finish();
});
process.once("SIGINT", () => stop());
process.once("SIGTERM", () => stop());
