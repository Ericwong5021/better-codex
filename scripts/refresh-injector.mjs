import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const betterCodexHome = resolve(process.env.BETTER_CODEX_HOME || join(homedir(), ".better-codex"));
const injectionStatePath = join(betterCodexHome, "run", "injection.json");
const executable = join(root, "dist", "cli.js");
const environment = { ...process.env, BETTER_CODEX_DISABLE_DELEGATION: "1" };

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

if (!current?.injection?.available || !current.injection.targets?.length) process.exit(0);

const eject = spawnSync(process.execPath, [executable, "eject"], { stdio: "inherit", env: environment });
if (eject.status !== 0) process.exit(eject.status ?? 1);

const inject = spawnSync(process.execPath, [executable, "inject"], { stdio: "inherit", env: environment });
process.exit(inject.status ?? 1);
