import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const betterCodexHome = resolve(process.env.BETTER_CODEX_DEV_HOME || join(homedir(), ".better-codex-dev"));
const injectionStatePath = join(betterCodexHome, "run", "injection.json");
const executable = join(root, "dist", "cli.js");
const environment = { ...process.env, BETTER_CODEX_PROFILE: "development", BETTER_CODEX_HOME: betterCodexHome, BETTER_CODEX_DISABLE_DELEGATION: "1" };

if (!existsSync(injectionStatePath)) process.exit(0);

let injectionState;
try {
  injectionState = JSON.parse(readFileSync(injectionStatePath, "utf8"));
} catch {
  process.exit(0);
}

if (injectionState?.enabled !== true) process.exit(0);

const status = spawnSync(process.execPath, [executable, "status"], { encoding: "utf8", env: environment });
if (status.status !== 0) process.exit(0);

let current;
try {
  current = JSON.parse(status.stdout);
} catch {
  process.exit(0);
}

const runtimePort = Number(current?.runtime?.port);
const expectedEndpoint = Number.isInteger(runtimePort) && runtimePort > 0 ? `http://127.0.0.1:${runtimePort}` : "";
const ownsInjection = expectedEndpoint && current?.injection?.targets?.some(target => target.endpoint === expectedEndpoint);
if (!current?.injection?.available || !ownsInjection) process.exit(0);

const refresh = spawnSync(process.execPath, [executable, "refresh-injection"], { stdio: "inherit", env: environment });
process.exit(refresh.status ?? 1);
