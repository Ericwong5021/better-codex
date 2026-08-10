import { execFileSync, spawn } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const packageJson = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const platform = process.platform === "darwin" ? "darwin" : process.platform;
const architecture = process.arch === "x64" ? "amd64" : process.arch;

if (![["darwin", "arm64"], ["darwin", "amd64"], ["win32", "amd64"]].some(([os, arch]) => os === platform && arch === architecture)) {
  throw new Error(`local_install_test_unsupported:${platform}-${architecture}`);
}

const releaseDirectory = join(root, "release");
const extension = platform === "win32" ? "zip" : "tar.gz";
const archive = join(releaseDirectory, `better-codex-cli-${packageJson.version}-${platform}-${architecture}.${extension}`);
const checksums = join(releaseDirectory, "checksums.txt");
if (!existsSync(archive)) throw new Error(`local_install_archive_missing:${archive}`);
if (!existsSync(checksums)) throw new Error(`local_install_checksums_missing:${checksums}`);

const testRoot = await mkdtemp(join(tmpdir(), "better-codex-local-install-"));
const userHome = join(testRoot, "user");
const codexHome = join(testRoot, "codex");
const betterCodexHome = join(testRoot, "better-codex");
const binDirectory = join(testRoot, "bin");
const bundle = join(binDirectory, "better-codex.cjs");
const launcher = join(binDirectory, platform === "win32" ? "better-codex.cmd" : "better-codex");
const legacyExecutable = join(binDirectory, "better-codex.exe");
const database = join(betterCodexHome, "better-codex.db");
const environment = {
  ...process.env,
  BETTER_CODEX_ARCHIVE: archive,
  BETTER_CODEX_CHECKSUMS: checksums,
  BETTER_CODEX_DISABLE_DELEGATION: "1",
  BETTER_CODEX_HOME: betterCodexHome,
  BETTER_CODEX_SKIP_PATH_UPDATE: "1",
  CODEX_HOME: codexHome,
  HOME: userHome,
  USERPROFILE: userHome,
};
for (const key of Object.keys(environment)) {
  if (key.toLowerCase() === "psmodulepath") delete environment[key];
}

function install() {
  if (platform === "win32") {
    execFileSync("powershell.exe", [
      "-NoProfile",
      "-NonInteractive",
      "-ExecutionPolicy", "Bypass",
      "-File", join(root, "scripts", "install.ps1"),
      "-Repository", "invalid/local-install-must-not-download",
      "-BinDirectory", binDirectory,
      "-NoService",
    ], { env: environment, stdio: "inherit" });
    return;
  }
  execFileSync("/bin/bash", [join(root, "scripts", "install.sh"), "--no-service"], {
    env: { ...environment, BETTER_CODEX_BIN_DIR: binDirectory, BETTER_CODEX_REPO: "invalid/local-install-must-not-download" },
    stdio: "inherit",
  });
}

async function availablePort() {
  return await new Promise((resolve, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      server.close(error => error ? reject(error) : resolve(port));
    });
  });
}

async function waitFor(check, error) {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    try {
      const value = await check();
      if (value) return value;
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error(error);
}

async function verifyInstalledSync(run) {
  const hubEntry = join(root, "dist", "hub-cli.js");
  if (!existsSync(hubEntry)) throw new Error("local_install_hub_build_missing");
  const hubPort = await availablePort();
  const adminToken = "local-install-sync-".padEnd(64, "x");
  const hub = spawn(process.execPath, [hubEntry], {
    cwd: root,
    env: {
      ...process.env,
      BETTER_CODEX_HUB_HOST: "127.0.0.1",
      BETTER_CODEX_HUB_PORT: String(hubPort),
      BETTER_CODEX_HUB_DB: join(testRoot, "hub", "hub.db"),
      BETTER_CODEX_HUB_ADMIN_TOKEN: adminToken,
    },
    stdio: "ignore",
    windowsHide: true,
  });
  try {
    await waitFor(async () => (await fetch(`http://127.0.0.1:${hubPort}/healthz`)).ok, "local_install_hub_start_timeout");
    const project = JSON.parse(run(["project", "create", "--name", "Install Sync", "--workspace", testRoot]));
    const issue = JSON.parse(run(["issue", "create", "--project", project.id, "--title", "Installed sync round trip", "--description", "safe description", "--status", "todo", "--workspace", testRoot]));
    const connected = JSON.parse(run(["sync", "connect", "--url", `http://127.0.0.1:${hubPort}`, "--token", adminToken, "--name", "installed-smoke"]));
    if (!connected.connected) throw new Error("local_install_sync_connect_failed");
    const board = await waitFor(async () => {
      const response = await fetch(`http://127.0.0.1:${hubPort}/api/v1/board`, { headers: { authorization: `Bearer ${adminToken}` } });
      if (!response.ok) return null;
      const value = await response.json();
      return value.issues?.some(item => item.payload?.id === issue.id) ? value : null;
    }, "local_install_sync_timeout");
    const serialized = JSON.stringify(board.issues.find(item => item.payload?.id === issue.id));
    if (/workspace_path|thread_id/.test(serialized) || serialized.includes(testRoot)) throw new Error("local_install_sync_private_field_leak");
    return { connected: true, project: project.id, issue: issue.id, mirroredIssues: board.issues.length };
  } finally {
    try { run(["stop"]); } catch {}
    hub.kill();
    await new Promise(resolve => hub.exitCode === null ? hub.once("exit", resolve) : resolve());
  }
}

try {
  mkdirSync(binDirectory, { recursive: true });
  mkdirSync(betterCodexHome, { recursive: true });
  writeFileSync(database, "preserve-database");
  if (platform === "win32") copyFileSync(process.execPath, legacyExecutable);
  install();
  install();
  if (!existsSync(bundle)) throw new Error("local_install_bundle_missing");
  if (!existsSync(launcher)) throw new Error("local_install_launcher_missing");
  if (platform === "win32" && existsSync(legacyExecutable)) throw new Error("local_install_legacy_executable_preserved_after_success");
  if (readFileSync(database, "utf8") !== "preserve-database") throw new Error("local_install_database_changed");
  await rm(database, { force: true });
  if (!existsSync(join(codexHome, "skills", "better-codex", "SKILL.md"))) throw new Error("local_install_skill_missing");
  if (!existsSync(join(betterCodexHome, "update-public-key.pem"))) throw new Error("local_install_update_key_missing");

  const run = args => platform === "win32"
    ? execFileSync(process.env.ComSpec || "cmd.exe", ["/d", "/c", launcher, ...args], { encoding: "utf8", env: environment })
    : execFileSync(launcher, args, { encoding: "utf8", env: environment });
  const output = run(["version", "--json"]);
  const versions = JSON.parse(output);
  if (versions.core !== packageJson.version) {
    throw new Error(`local_install_version_mismatch:expected=${packageJson.version}:actual=${versions.core ?? "unknown"}`);
  }
  const preview = JSON.parse(run(["update", "channel", "preview"]));
  if (preview.channel !== "preview" || preview.previous !== "stable") throw new Error("local_install_preview_channel_failed");
  const stable = JSON.parse(run(["update", "channel", "stable"]));
  if (stable.channel !== "stable" || stable.previous !== "preview") throw new Error("local_install_stable_channel_failed");
  const sync = await verifyInstalledSync(run);
  console.log(JSON.stringify({ installed: true, reinstalled: true, platform, architecture, version: versions.core, channels: [preview.channel, stable.channel], sync }));
} finally {
  await rm(testRoot, { recursive: true, force: true });
}
