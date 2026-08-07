import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(join(fileURLToPath(new URL(".", import.meta.url)), ".."));
const home = resolve(process.env.BETTER_CODEX_HOME || join(homedir(), ".better-codex"));
const executable = join(root, "dist", "cli.js");
const launchStatePath = join(home, "run", "launch-integration.json");
const launchAgentPath = join(homedir(), "Library", "LaunchAgents", "com.better-codex.runtime.plist");
const environment = { ...process.env, BETTER_CODEX_DISABLE_DELEGATION: "1" };

if (!existsSync(launchStatePath) && !existsSync(launchAgentPath)) process.exit(0);

function run(args) {
  const result = spawnSync(process.execPath, [executable, ...args], { encoding: "utf8", env: environment, stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

const serviceStatus = spawnSync(process.execPath, [executable, "service", "status"], { encoding: "utf8", env: environment });
if (serviceStatus.status !== 0) process.exit(serviceStatus.status ?? 1);

let service;
try {
  service = JSON.parse(serviceStatus.stdout);
} catch {
  process.exit(1);
}

const serviceNeedsRefresh = process.platform !== "darwin"
  || !existsSync(launchAgentPath)
  || !readFileSync(launchAgentPath, "utf8").includes(executable);
if (service.installed === true && serviceNeedsRefresh) run(["service", "install"]);
if (existsSync(launchStatePath)) run(["launcher", "install"]);
