import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
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
const executable = join(binDirectory, platform === "win32" ? "better-codex.exe" : "better-codex");
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
  install();
  install();
  if (!existsSync(executable)) throw new Error("local_install_executable_missing");
  if (!existsSync(join(codexHome, "skills", "better-codex", "SKILL.md"))) throw new Error("local_install_skill_missing");
  if (!existsSync(join(betterCodexHome, "update-public-key.pem"))) throw new Error("local_install_update_key_missing");

  const output = execFileSync(executable, ["version", "--json"], { encoding: "utf8", env: environment });
  const versions = JSON.parse(output);
  if (versions.core !== packageJson.version) {
    throw new Error(`local_install_version_mismatch:expected=${packageJson.version}:actual=${versions.core ?? "unknown"}`);
  }
  console.log(JSON.stringify({ installed: true, reinstalled: true, platform, architecture, version: versions.core }));
} finally {
  await rm(testRoot, { recursive: true, force: true });
}
