import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join, posix, win32 } from "node:path";

export type CodexExecutableDiscoveryOptions = {
  platform?: NodeJS.Platform;
  arch?: string;
  env?: NodeJS.ProcessEnv;
  applicationPath?: string | null;
  tempDirectory?: string;
  probe?: (executable: string) => boolean;
};

function unique(values: Array<string | null | undefined>) {
  return [...new Set(values.filter((value): value is string => Boolean(value)))];
}

function existing(values: Array<string | null | undefined>) {
  return unique(values).filter(value => existsSync(value));
}

function modifiedAt(path: string) {
  try {
    return statSync(path).mtimeMs;
  } catch {
    return 0;
  }
}

function windowsLocalCliCandidates(env: NodeJS.ProcessEnv) {
  const root = env.LOCALAPPDATA ? join(env.LOCALAPPDATA, "OpenAI", "Codex", "bin") : null;
  if (!root || !existsSync(root)) return [];
  let versioned: string[] = [];
  try {
    versioned = readdirSync(root, { withFileTypes: true })
      .filter(entry => entry.isDirectory())
      .map(entry => join(root, entry.name, "codex.exe"));
  } catch {}
  return existing([...versioned, join(root, "codex.exe")])
    .sort((left, right) => modifiedAt(right) - modifiedAt(left));
}

function windowsNpmCliCandidates(env: NodeJS.ProcessEnv, arch: string) {
  const packageName = arch === "arm64" ? "codex-win32-arm64" : "codex-win32-x64";
  const target = arch === "arm64" ? "aarch64-pc-windows-msvc" : "x86_64-pc-windows-msvc";
  const pathValue = env.Path || env.PATH || "";
  const prefixes = unique([
    env.APPDATA ? join(env.APPDATA, "npm") : null,
    ...pathValue.split(";").map(value => value.trim().replace(/^"|"$/g, "")),
  ]);
  return existing(prefixes.flatMap(prefix => [
    join(prefix, "node_modules", "@openai", "codex", "node_modules", "@openai", packageName, "vendor", target, "bin", "codex.exe"),
    join(prefix, "node_modules", "@openai", packageName, "vendor", target, "bin", "codex.exe"),
  ]));
}

function windowsApplicationPath() {
  try {
    return execFileSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", "(Get-AppxPackage -Name OpenAI.Codex | Select-Object -First 1 -ExpandProperty InstallLocation)"], {
      encoding: "utf8",
      windowsHide: true,
      timeout: 5000,
    }).trim() || null;
  } catch {
    return null;
  }
}

function copiedWindowsApplicationCandidates(applicationPath: string | null, tempDirectory: string) {
  if (!applicationPath) return [];
  const sources = existing([
    join(applicationPath, "app", "resources", "codex.exe"),
    join(applicationPath, "resources", "codex.exe"),
    join(applicationPath, "codex.exe"),
  ]);
  return sources.flatMap(source => {
    try {
      const stats = statSync(source);
      const destinationDirectory = join(tempDirectory, "better-codex", "codex-cli");
      const destination = join(destinationDirectory, `codex-${stats.size}-${Math.floor(stats.mtimeMs)}.exe`);
      mkdirSync(destinationDirectory, { recursive: true });
      if (!existsSync(destination)) copyFileSync(source, destination);
      return [destination, source];
    } catch {
      return [source];
    }
  });
}

function unixLocalCliCandidates() {
  const home = homedir();
  const paths = [
    join(home, ".hermes", "node", "bin", "codex"),
    join(home, ".local", "bin", "codex"),
    join(home, ".npm-global", "bin", "codex"),
    join(home, ".yarn", "bin", "codex"),
    "/opt/homebrew/bin/codex",
    "/usr/local/bin/codex",
    "/usr/bin/codex",
  ];
  return existing(paths);
}

function macApplicationCandidates(applicationPath: string | null | undefined) {
  const applications = applicationPath === undefined
    ? ["/Applications/Codex.app", "/Applications/ChatGPT.app"]
    : [applicationPath];
  return existing(applications.map(application => application ? join(application, "Contents", "Resources", "codex") : null));
}

export function codexExecutableCandidates(options: CodexExecutableDiscoveryOptions = {}) {
  const platform = options.platform ?? process.platform;
  const arch = options.arch ?? process.arch;
  const env = options.env ?? process.env;
  const configured = [env.BETTER_CODEX_CODEX_PATH, env.CODEX_CLI_PATH];
  if (platform === "win32") {
    const applicationPath = options.applicationPath === undefined ? windowsApplicationPath() : options.applicationPath;
    return unique([
      ...configured,
      ...windowsLocalCliCandidates(env),
      ...windowsNpmCliCandidates(env, arch),
      ...copiedWindowsApplicationCandidates(applicationPath, options.tempDirectory ?? tmpdir()),
      "codex",
    ]);
  }
  if (platform === "darwin") return unique([...configured, ...macApplicationCandidates(options.applicationPath), ...unixLocalCliCandidates(), "codex"]);
  if (platform === "linux") return unique([...configured, ...unixLocalCliCandidates(), "codex"]);
  return unique([...configured, "codex"]);
}

export function probeCodexExecutable(executable: string) {
  try {
    execFileSync(executable, ["--version"], { stdio: "ignore", windowsHide: true, timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}

export function resolveCodexExecutable(options: CodexExecutableDiscoveryOptions = {}) {
  const probe = options.probe ?? probeCodexExecutable;
  const platform = options.platform ?? process.platform;
  if (platform === "win32") {
    const local = codexExecutableCandidates({ ...options, applicationPath: null }).find(probe);
    if (local) return local;
    const applicationPath = options.applicationPath === undefined ? windowsApplicationPath() : options.applicationPath;
    return codexExecutableCandidates({ ...options, applicationPath }).find(probe) ?? null;
  }
  return codexExecutableCandidates(options).find(probe) ?? null;
}

export function createCodexExecutablePathResolver(
  discover: () => string | null = () => resolveCodexExecutable(),
  pathExists: (path: string) => boolean = existsSync,
  platform: NodeJS.Platform = process.platform,
) {
  let cachedExecutable: string | undefined;
  return () => {
    const absolute = cachedExecutable && (platform === "win32" ? win32.isAbsolute(cachedExecutable) : posix.isAbsolute(cachedExecutable));
    if (!cachedExecutable || (absolute && !pathExists(cachedExecutable))) cachedExecutable = discover() ?? "codex";
    return cachedExecutable;
  };
}

const cachedCodexExecutablePath = createCodexExecutablePathResolver();

export function codexExecutablePath() {
  return cachedCodexExecutablePath();
}

export function requireCodexExecutablePath(options: CodexExecutableDiscoveryOptions = {}) {
  const executable = resolveCodexExecutable(options);
  if (!executable) throw new Error("codex_cli_not_found");
  return executable;
}
