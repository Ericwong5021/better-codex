import { spawn, spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const executable = join(root, "node_modules", ".bin", process.platform === "win32" ? "tsx.cmd" : "tsx");
const mockupHome = resolve(process.env.BETTER_CODEX_MOCKUP_HOME || join(tmpdir(), "better-codex-mockup"));
const productionHome = resolve(process.env.BETTER_CODEX_HOME || join(homedir(), ".better-codex"));
const installedTokenPath = join(productionHome, "run", "token");
const installedToken = process.env.BETTER_CODEX_TOKEN || (existsSync(installedTokenPath) ? readFileSync(installedTokenPath, "utf8").trim() : "");
const injectionStatePath = join(productionHome, "run", "injection.json");
let restoreInjection = existsSync(installedTokenPath);
try {
  if (existsSync(injectionStatePath)) restoreInjection = JSON.parse(readFileSync(injectionStatePath, "utf8")).enabled !== false;
} catch {}
const sourceCli = ["src/cli.ts"];
if (restoreInjection) {
  const disabled = spawnSync(executable, [...sourceCli, "disable"], { cwd: root, stdio: "inherit" });
  if (disabled.status !== 0) process.exit(disabled.status ?? 1);
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
if (restoreInjection) {
  const guardian = spawn(process.execPath, [join(root, "scripts", "dev-mockup-restore.mjs"), String(process.pid), root, productionHome, mockupHome, cdpPort, String(server.pid || 0), String(watcher.pid || 0)], { cwd: root, env: { ...process.env, ...(installedToken ? { BETTER_CODEX_TOKEN: installedToken } : {}) }, detached: true, stdio: "ignore" });
  guardian.unref();
}
let stopping = false;
let serverExited = false;
let watcherExited = false;
let exitCode = 0;
let cleaned = false;

function finish() {
  if (!serverExited || !watcherExited || cleaned) return;
  cleaned = true;
  if (!restoreInjection) spawnSync(executable, [...sourceCli, "eject", "--port", cdpPort], { cwd: root, env: environment, stdio: "ignore" });
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
