import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
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
  const expectedInstalledChannel = /-beta\.[1-9][0-9]*$/.test(packageJson.version) ? "preview" : "stable";
  const installedChannel = JSON.parse(readFileSync(join(betterCodexHome, "runtime", "channel.json"), "utf8"));
  if (installedChannel.channel !== expectedInstalledChannel) throw new Error(`local_install_channel_mismatch:expected=${expectedInstalledChannel}:actual=${installedChannel.channel}`);
  const preview = JSON.parse(run(["update", "channel", "preview"]));
  if (preview.channel !== "preview" || preview.previous !== expectedInstalledChannel) throw new Error("local_install_preview_channel_failed");
  const stable = JSON.parse(run(["update", "channel", "stable"]));
  if (stable.channel !== "stable" || stable.previous !== "preview") throw new Error("local_install_stable_channel_failed");
  console.log(JSON.stringify({ installed: true, reinstalled: true, platform, architecture, version: versions.core, channels: [preview.channel, stable.channel] }));
} finally {
  await rm(testRoot, { recursive: true, force: true });
}
