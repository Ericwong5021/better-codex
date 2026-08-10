import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(join(fileURLToPath(new URL(".", import.meta.url)), ".."));
const home = resolve(process.env.BETTER_CODEX_DEV_HOME || join(homedir(), ".better-codex-dev"));
const stableHome = resolve(process.env.BETTER_CODEX_STABLE_HOME || join(homedir(), ".better-codex"));
const executable = join(root, "dist", "cli.js");
const launchStatePath = join(home, "run", "launch-integration.json");
const environment = { ...process.env, BETTER_CODEX_PROFILE: "development", BETTER_CODEX_HOME: home, BETTER_CODEX_PEER_HOME: stableHome, BETTER_CODEX_DISABLE_DELEGATION: "1" };

if (!existsSync(launchStatePath)) process.exit(0);

function run(args, capture = false) {
  const result = spawnSync(process.execPath, [executable, ...args], { encoding: "utf8", env: environment, stdio: capture ? "pipe" : "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
  return capture ? result.stdout.trim() : "";
}

run(["launcher", "install"]);
let status;
try {
  status = JSON.parse(run(["status"], true) || "{}");
} catch {
  process.exit(1);
}
if (status.runtime?.ok === true) {
  const expectedEndpoint = `http://127.0.0.1:${status.runtime.port}`;
  const ownsInjection = status.injection?.targets?.some(target => target.endpoint === expectedEndpoint) === true;
  run(["stop"]);
  if (ownsInjection) run(["start"]);
}
