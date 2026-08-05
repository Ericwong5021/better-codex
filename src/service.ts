import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { isSea } from "node:sea";
import { cdpPort, ensureDirectories, logPath, runtimeLogPath, betterCodexHome } from "./config.js";

const label = "com.better-codex.runtime";
const legacyLabel = "com.better-codex.gateway";
export const launchAgentPath = join(homedir(), "Library", "LaunchAgents", `${label}.plist`);
const legacyLaunchAgentPath = join(homedir(), "Library", "LaunchAgents", `${legacyLabel}.plist`);

function xml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function command() {
  return isSea() ? [process.execPath, "runtime"] : [process.execPath, ...process.execArgv, process.argv[1], "runtime"];
}

export function servicePlist() {
  const argumentsXml = command().map(value => `<string>${xml(value)}</string>`).join("");
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
<key>Label</key><string>${label}</string>
<key>ProgramArguments</key><array>${argumentsXml}</array>
<key>EnvironmentVariables</key><dict>
<key>BETTER_CODEX_HOME</key><string>${xml(betterCodexHome)}</string>
<key>BETTER_CODEX_CDP_PORT</key><string>${cdpPort}</string>
</dict>
<key>WorkingDirectory</key><string>${xml(betterCodexHome)}</string>
<key>RunAtLoad</key><true/>
<key>KeepAlive</key><dict><key>SuccessfulExit</key><false/></dict>
<key>ThrottleInterval</key><integer>5</integer>
<key>ProcessType</key><string>Background</string>
<key>StandardOutPath</key><string>${xml(runtimeLogPath)}</string>
<key>StandardErrorPath</key><string>${xml(join(logPath, "runtime.error.log"))}</string>
</dict></plist>
`;
}

function launchctl(args: string[], ignoreFailure = false) {
  try {
    return execFileSync("/bin/launchctl", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
  } catch (error) {
    if (ignoreFailure) return "";
    const message = error && typeof error === "object" && "stderr" in error ? String(error.stderr).trim() : "launchctl_failed";
    throw new Error(message || "launchctl_failed");
  }
}

function domain() {
  const uid = process.getuid?.();
  if (uid === undefined) throw new Error("service_install_requires_macos");
  return `gui/${uid}`;
}

export function installService() {
  if (process.platform !== "darwin") throw new Error("service_install_requires_macos");
  ensureDirectories();
  mkdirSync(join(homedir(), "Library", "LaunchAgents"), { recursive: true });
  launchctl(["bootout", domain(), legacyLaunchAgentPath], true);
  if (existsSync(legacyLaunchAgentPath)) unlinkSync(legacyLaunchAgentPath);
  writeFileSync(launchAgentPath, servicePlist(), { mode: 0o644 });
  launchctl(["bootout", domain(), launchAgentPath], true);
  launchctl(["bootstrap", domain(), launchAgentPath]);
  launchctl(["kickstart", "-k", `${domain()}/${label}`]);
  return { installed: true, label, path: launchAgentPath };
}

export function uninstallService() {
  launchctl(["bootout", domain(), launchAgentPath], true);
  launchctl(["bootout", domain(), legacyLaunchAgentPath], true);
  if (existsSync(launchAgentPath)) unlinkSync(launchAgentPath);
  if (existsSync(legacyLaunchAgentPath)) unlinkSync(legacyLaunchAgentPath);
  return { installed: false, label, path: launchAgentPath };
}

export function startService() {
  if (!existsSync(launchAgentPath)) throw new Error("service_not_installed");
  launchctl(["bootstrap", domain(), launchAgentPath], true);
  launchctl(["kickstart", "-k", `${domain()}/${label}`]);
  return { started: true, label };
}

export function stopService() {
  launchctl(["bootout", domain(), launchAgentPath], true);
  return { stopped: true, label };
}

export function restartService() {
  stopService();
  return startService();
}

export function serviceStatus() {
  const installed = existsSync(launchAgentPath);
  const output = installed ? launchctl(["print", `${domain()}/${label}`], true) : "";
  const pid = output.match(/\bpid = (\d+)/)?.[1];
  return { installed, running: Boolean(pid), pid: pid ? Number(pid) : null, label, path: launchAgentPath };
}

export function serviceLogs(lines = 50) {
  if (!existsSync(runtimeLogPath)) return "";
  return readFileSync(runtimeLogPath, "utf8").split("\n").slice(-Math.max(1, lines) - 1).join("\n");
}
