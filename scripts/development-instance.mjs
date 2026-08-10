import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const executable = join(root, "dist", "cli.js");
const home = resolve(process.env.BETTER_CODEX_DEV_HOME || join(homedir(), ".better-codex-dev"));
const stableHome = resolve(process.env.BETTER_CODEX_STABLE_HOME || join(homedir(), ".better-codex"));
const environment = {
  ...process.env,
  BETTER_CODEX_PROFILE: "development",
  BETTER_CODEX_HOME: home,
  BETTER_CODEX_PEER_HOME: stableHome,
  BETTER_CODEX_DISABLE_DELEGATION: "1",
};

function run(args, capture = false) {
  const result = spawnSync(process.execPath, [executable, ...args], {
    cwd: root,
    encoding: "utf8",
    env: environment,
    stdio: capture ? "pipe" : "inherit",
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    if (capture && result.stderr) process.stderr.write(result.stderr);
    process.exit(result.status ?? 1);
  }
  return capture ? result.stdout.trim() : "";
}

function ensureStableWindowsLauncher() {
  if (process.platform !== "win32") return { checked: false, reason: "windows_only" };
  const defaultExecutable = process.env.LOCALAPPDATA ? join(process.env.LOCALAPPDATA, "BetterCodex", "bin", "better-codex.exe") : "";
  const configuredExecutable = process.env.BETTER_CODEX_STABLE_EXECUTABLE || defaultExecutable;
  if (!configuredExecutable) throw new Error("stable_binary_required");
  const officialExecutable = resolve(configuredExecutable);
  if (!existsSync(officialExecutable)) throw new Error("stable_binary_required");
  const stableEnvironment = {
    ...process.env,
    BETTER_CODEX_PROFILE: "stable",
    BETTER_CODEX_HOME: stableHome,
    BETTER_CODEX_PEER_HOME: home,
    BETTER_CODEX_DISABLE_DELEGATION: "1",
  };
  delete stableEnvironment.BETTER_CODEX_LAUNCHER_PATH;
  const result = spawnSync(officialExecutable, ["launcher", "install"], { encoding: "utf8", env: stableEnvironment, stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
  const versionResult = spawnSync(officialExecutable, ["version", "--json"], { encoding: "utf8", env: stableEnvironment });
  let supportsProfiles = false;
  try { supportsProfiles = JSON.parse(versionResult.stdout).profile === "stable"; } catch {}
  const launchArguments = supportsProfiles ? "launch" : "start --launch";
  mkdirSync(stableHome, { recursive: true });
  const commandLine = `"${officialExecutable.replace(/"/g, "\"\"")}"`;
  writeFileSync(join(stableHome, "Better Codex Launcher.vbs"), `Option Explicit
Dim shell
Set shell = CreateObject("WScript.Shell")
shell.Environment("Process")("BETTER_CODEX_PROFILE") = "stable"
shell.Environment("Process")("BETTER_CODEX_HOME") = "${stableHome.replace(/"/g, "\"\"")}"
shell.Environment("Process")("BETTER_CODEX_PEER_HOME") = "${home.replace(/"/g, "\"\"")}"
shell.Run "${commandLine.replace(/"/g, '""')}" & " ${launchArguments}", 0, False
`, { mode: 0o600 });
  return { checked: true, executable: officialExecutable, home: stableHome, supportsProfiles, launchArguments };
}

if (!existsSync(executable)) throw new Error("development_build_required");
const action = process.argv[2];

if (action === "install") {
  const stable = ensureStableWindowsLauncher();
  mkdirSync(home, { recursive: true });
  copyFileSync(join(root, "assets", "update-public-key.pem"), join(home, "update-public-key.pem"));
  run(["launcher", "install"]);
  console.log(JSON.stringify({ installed: true, profile: "development", home, stable }, null, 2));
} else if (action === "uninstall") {
  run(["stop"]);
  run(["launcher", "uninstall"]);
  console.log(JSON.stringify({ uninstalled: true, profile: "development", home, dataPreserved: true }, null, 2));
} else if (action === "status") {
  const launcher = JSON.parse(run(["launcher", "status"], true) || "{}");
  const status = JSON.parse(run(["status"], true) || "{}");
  console.log(JSON.stringify({ profile: "development", home, launcher, ...status }, null, 2));
} else {
  console.error("Usage: node scripts/development-instance.mjs install|uninstall|status");
  process.exit(1);
}
