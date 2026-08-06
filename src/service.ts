import { execFileSync, spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { isSea } from "node:sea";
import { cdpPort, ensureDirectories, logPath, runtimeLogPath, betterCodexHome, runPath } from "./config.js";

const label = "com.better-codex.runtime";
const legacyLabel = "com.better-codex.gateway";
const windowsTask = "Better Codex Runtime";
const windowsRunKey = "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run";
export const launchAgentPath = join(homedir(), "Library", "LaunchAgents", `${label}.plist`);
const legacyLaunchAgentPath = join(homedir(), "Library", "LaunchAgents", `${legacyLabel}.plist`);

function xml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function command() {
  return isSea() ? [process.execPath, "runtime"] : [process.execPath, ...process.execArgv, process.argv[1], "runtime"];
}

function quotePowerShell(value: string) {
  return `'${value.replace(/'/g, "''")}'`;
}

function windowsStartupCommand() {
  const [executable, ...args] = command();
  const script = `Start-Process -FilePath ${quotePowerShell(executable)} -ArgumentList @(${args.map(quotePowerShell).join(",")}) -WindowStyle Hidden`;
  return `powershell.exe -NoProfile -NonInteractive -WindowStyle Hidden -EncodedCommand ${Buffer.from(script, "utf16le").toString("base64")}`;
}

function windowsRuntime() {
  try {
    const value = JSON.parse(readFileSync(join(runPath, "runtime.json"), "utf8")) as { pid?: number };
    if (!Number.isInteger(value.pid) || value.pid! < 1) return null;
    process.kill(value.pid!, 0);
    return value.pid!;
  } catch {
    return null;
  }
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

function reg(args: string[], ignoreFailure = false) {
  try {
    return execFileSync("reg.exe", args, { encoding: "utf8", windowsHide: true, stdio: ["ignore", "pipe", "pipe"] }).trim();
  } catch (error) {
    if (ignoreFailure) return "";
    const message = error && typeof error === "object" && "stderr" in error ? String(error.stderr).trim() : "windows_service_failed";
    throw new Error(message || "windows_service_failed");
  }
}

function domain() {
  const uid = process.getuid?.();
  if (uid === undefined) throw new Error("service_install_requires_macos");
  return `gui/${uid}`;
}

export function installService() {
  ensureDirectories();
  if (process.platform === "win32") {
    reg(["ADD", windowsRunKey, "/V", windowsTask, "/T", "REG_SZ", "/D", windowsStartupCommand(), "/F"]);
    startService();
    return { installed: true, label: windowsTask, path: null };
  }
  if (process.platform !== "darwin") throw new Error("service_install_unsupported");
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
  if (process.platform === "win32") {
    stopService();
    reg(["DELETE", windowsRunKey, "/V", windowsTask, "/F"], true);
    return { installed: false, label: windowsTask, path: null };
  }
  if (process.platform !== "darwin") throw new Error("service_uninstall_unsupported");
  launchctl(["bootout", domain(), launchAgentPath], true);
  launchctl(["bootout", domain(), legacyLaunchAgentPath], true);
  if (existsSync(launchAgentPath)) unlinkSync(launchAgentPath);
  if (existsSync(legacyLaunchAgentPath)) unlinkSync(legacyLaunchAgentPath);
  return { installed: false, label, path: launchAgentPath };
}

export function startService() {
  if (process.platform === "win32") {
    if (!serviceStatus().installed) throw new Error("service_not_installed");
    if (!windowsRuntime()) {
      const [executable, ...args] = command();
      const child = spawn(executable, args, { cwd: betterCodexHome, detached: true, stdio: "ignore", windowsHide: true });
      child.unref();
    }
    return { started: true, label: windowsTask };
  }
  if (!existsSync(launchAgentPath)) throw new Error("service_not_installed");
  launchctl(["bootstrap", domain(), launchAgentPath], true);
  launchctl(["kickstart", "-k", `${domain()}/${label}`]);
  return { started: true, label };
}

export function stopService() {
  if (process.platform === "win32") {
    const pid = windowsRuntime();
    if (pid) {
      try { process.kill(pid); } catch {}
    }
    return { stopped: true, label: windowsTask };
  }
  launchctl(["bootout", domain(), launchAgentPath], true);
  return { stopped: true, label };
}

export function restartService() {
  stopService();
  return startService();
}

export function serviceStatus() {
  if (process.platform === "win32") {
    const output = reg(["QUERY", windowsRunKey, "/V", windowsTask], true);
    const installed = Boolean(output);
    const pid = windowsRuntime();
    return { installed, running: Boolean(pid), pid, label: windowsTask, path: null };
  }
  if (process.platform !== "darwin") return { installed: false, running: false, pid: null, label, path: null };
  const installed = existsSync(launchAgentPath);
  const output = installed ? launchctl(["print", `${domain()}/${label}`], true) : "";
  const pid = output.match(/\bpid = (\d+)/)?.[1];
  return { installed, running: Boolean(pid), pid: pid ? Number(pid) : null, label, path: launchAgentPath };
}

export function serviceLogs(lines = 50) {
  if (!existsSync(runtimeLogPath)) return "";
  return readFileSync(runtimeLogPath, "utf8").split("\n").slice(-Math.max(1, lines) - 1).join("\n");
}
