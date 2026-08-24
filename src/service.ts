import { execFileSync, spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { isAbsolute, join, relative, resolve } from "node:path";
import { isSea } from "node:sea";
import { isDeepStrictEqual } from "node:util";
import { betterCodexHome, betterCodexProfile, cdpPort, ensureDirectories, logPath, runPath, runtimeLogPath, sourceProcessArguments } from "./config.js";

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
  if (isSea()) return [process.env.BETTER_CODEX_LAUNCHER_PATH || process.execPath, "runtime"];
  const args = sourceProcessArguments(["runtime"]);
  if (!args) throw new Error("service_requires_file_entrypoint");
  return [process.execPath, ...args];
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
    const output = execFileSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", `(Get-CimInstance Win32_Process -Filter \"ProcessId = ${value.pid}\" | Select-Object ProcessId,ExecutablePath,CommandLine | ConvertTo-Json -Compress)`], { encoding: "utf8", windowsHide: true }).trim();
    if (!output) return null;
    const processInfo = JSON.parse(output) as { ProcessId?: number; ExecutablePath?: string; CommandLine?: string };
    if (processInfo.ProcessId !== value.pid || !processInfo.ExecutablePath || !processInfo.CommandLine || !/(?:^|\s)runtime(?:\s|$)/i.test(processInfo.CommandLine)) return null;
    const executable = resolve(processInfo.ExecutablePath).toLowerCase();
    const expected = [command()[0], process.env.BETTER_CODEX_LAUNCHER_PATH].filter((item): item is string => Boolean(item)).map(item => resolve(item).toLowerCase());
    const managedRoot = resolve(join(betterCodexHome, "runtime", "versions")).toLowerCase();
    const managedRelation = relative(managedRoot, executable);
    if (!expected.includes(executable) && (!managedRelation || managedRelation.startsWith("..") || isAbsolute(managedRelation))) return null;
    process.kill(value.pid!, 0);
    return value.pid!;
  } catch {
    return null;
  }
}

export function servicePlist() {
  const definition = serviceDefinition();
  const argumentsXml = definition.ProgramArguments.map(value => `<string>${xml(value)}</string>`).join("");
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
<key>Label</key><string>${definition.Label}</string>
<key>ProgramArguments</key><array>${argumentsXml}</array>
<key>EnvironmentVariables</key><dict>
<key>BETTER_CODEX_HOME</key><string>${xml(definition.EnvironmentVariables.BETTER_CODEX_HOME)}</string>
<key>BETTER_CODEX_CDP_PORT</key><string>${definition.EnvironmentVariables.BETTER_CODEX_CDP_PORT}</string>
</dict>
<key>WorkingDirectory</key><string>${xml(definition.WorkingDirectory)}</string>
<key>RunAtLoad</key><true/>
<key>KeepAlive</key><dict><key>SuccessfulExit</key><false/></dict>
<key>ThrottleInterval</key><integer>${definition.ThrottleInterval}</integer>
<key>ProcessType</key><string>${definition.ProcessType}</string>
<key>StandardOutPath</key><string>${xml(definition.StandardOutPath)}</string>
<key>StandardErrorPath</key><string>${xml(definition.StandardErrorPath)}</string>
</dict></plist>
`;
}

function serviceDefinition() {
  return {
    Label: label,
    ProgramArguments: command(),
    EnvironmentVariables: { BETTER_CODEX_HOME: betterCodexHome, BETTER_CODEX_CDP_PORT: String(cdpPort) },
    WorkingDirectory: betterCodexHome,
    RunAtLoad: true,
    KeepAlive: { SuccessfulExit: false },
    ThrottleInterval: 5,
    ProcessType: "Background",
    StandardOutPath: runtimeLogPath,
    StandardErrorPath: join(logPath, "runtime.error.log"),
  };
}

function serviceConfigurationMatches() {
  if (process.platform !== "darwin" || !existsSync(launchAgentPath)) return false;
  try {
    const installed = JSON.parse(execFileSync("/usr/bin/plutil", ["-convert", "json", "-o", "-", launchAgentPath], { encoding: "utf8" })) as Record<string, unknown>;
    return isDeepStrictEqual(installed, serviceDefinition());
  } catch {
    return false;
  }
}

export function repairServiceConfiguration() {
  if (betterCodexProfile === "development" || process.platform !== "darwin" || !existsSync(launchAgentPath)) return false;
  if (serviceConfigurationMatches()) return false;
  installService();
  return true;
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
  if (betterCodexProfile === "development") return { installed: false, label: "Better Codex Dev Runtime", path: null, reason: "development_runtime_unmanaged" };
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
  if (!serviceConfigurationMatches()) throw new Error("service_configuration_write_failed");
  launchctl(["bootout", domain(), launchAgentPath], true);
  launchctl(["bootstrap", domain(), launchAgentPath]);
  launchctl(["kickstart", "-k", `${domain()}/${label}`]);
  return { installed: true, label, path: launchAgentPath };
}

export function uninstallService() {
  if (betterCodexProfile === "development") return { installed: false, label: "Better Codex Dev Runtime", path: null, reason: "development_runtime_unmanaged" };
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
  if (betterCodexProfile === "development") throw new Error("development_runtime_unmanaged");
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
  if (!serviceConfigurationMatches()) throw new Error("service_configuration_mismatch");
  launchctl(["bootstrap", domain(), launchAgentPath], true);
  launchctl(["kickstart", "-k", `${domain()}/${label}`]);
  return { started: true, label };
}

export function stopService() {
  if (betterCodexProfile === "development") return { stopped: true, label: "Better Codex Dev Runtime", unmanaged: true };
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
  if (betterCodexProfile === "development") return { installed: false, running: false, pid: null, label: "Better Codex Dev Runtime", path: null, reason: "development_runtime_unmanaged" };
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
  return { installed, running: Boolean(pid), pid: pid ? Number(pid) : null, label, path: launchAgentPath, configurationMatches: installed && serviceConfigurationMatches() };
}

export function serviceLogs(lines = 50) {
  if (!existsSync(runtimeLogPath)) return "";
  return readFileSync(runtimeLogPath, "utf8").split("\n").slice(-Math.max(1, lines) - 1).join("\n");
}
