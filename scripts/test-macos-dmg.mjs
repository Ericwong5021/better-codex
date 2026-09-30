import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

if (process.platform !== "darwin") process.exit(0);
const root = resolve(".");
const version = JSON.parse(readFileSync(join(root, "package.json"), "utf8")).version;
const architecture = process.arch === "arm64" ? "arm64" : "amd64";
const work = mkdtempSync(join(tmpdir(), "better-codex-dmg-check-"));
const mount = join(work, "volume");
const home = join(work, "data");
const bin = join(work, "bin");
let mounted = false;
try {
  mkdirSync(mount);
  execFileSync("hdiutil", ["attach", "-readonly", "-nobrowse", "-mountpoint", mount, join(root, `release/better-codex-${version}-darwin-${architecture}.dmg`)], { stdio: "pipe" });
  mounted = true;
  const app = join(mount, "Better Codex.app");
  execFileSync("codesign", ["--verify", "--deep", "--strict", app], { stdio: "pipe" });
  const resources = join(app, "Contents/Resources");
  const payload = JSON.parse(readFileSync(join(resources, "desktop-payload.json"), "utf8"));
  assert.equal(payload.version, version);
  const env = {
    ...process.env, HOME: join(work, "user"), CODEX_HOME: join(work, "codex"),
    BETTER_CODEX_HOME: home, BETTER_CODEX_BIN_DIR: bin, BETTER_CODEX_DISABLE_DELEGATION: "1",
    BETTER_CODEX_ARCHIVE: join(resources, payload.archive), BETTER_CODEX_CHECKSUMS: join(resources, "checksums.txt"),
    BETTER_CODEX_BUNDLED_NODE: join(resources, "node/bin/node"), BETTER_CODEX_SKIP_PATH_UPDATE: "1",
    BETTER_CODEX_REPO: "invalid/local-install-must-not-download",
    PATH: `${join(resources, "node/bin") }:/usr/bin:/bin:/usr/sbin:/sbin`,
  };
  mkdirSync(env.HOME);
  mkdirSync(home);
  writeFileSync(join(home, "better-codex.db"), "preserve-existing-database");
  for (let attempt = 0; attempt < 2; attempt++) {
    execFileSync("/bin/bash", [join(resources, "install.sh"), "--no-service"], { env, stdio: "pipe", timeout: 300_000 });
    assert.equal(readFileSync(join(home, "better-codex.db"), "utf8"), "preserve-existing-database");
  }
  // Reproduce an existing published managed core with the same version as an
  // unreleased DMG. Even if the base launcher already matches the new package,
  // it must not hide the different selected core behind a successful update.
  const managed = join(home, "runtime/versions", version, "better-codex.cjs");
  mkdirSync(join(home, "runtime/versions", version), { recursive: true });
  const pointerPath = join(home, "runtime/current.json");
  const pointer = JSON.stringify({ current: version, previous: null, executable: managed, updatedAt: new Date().toISOString() });
  writeFileSync(managed, "older published core");
  writeFileSync(pointerPath, pointer);
  const preservedPaths = [join(bin, "better-codex"), join(bin, "better-codex.cjs"), pointerPath, managed, join(home, "better-codex.db"), join(env.CODEX_HOME, "skills/better-codex/SKILL.md")];
  const before = preservedPaths.map(file => readFileSync(file));
  const conflict = spawnSync("/bin/bash", [join(resources, "install.sh")], { env, encoding: "utf8", timeout: 60_000 });
  assert.equal(conflict.error, undefined);
  assert.equal(conflict.status, 1, conflict.stdout + conflict.stderr);
  assert.match(conflict.stderr, /install_same_version_core_conflict/);
  assert.doesNotMatch(conflict.stdout, /Applying .* live Runtime|Refreshing launcher/);
  preservedPaths.forEach((file, index) => assert.deepEqual(readFileSync(file), before[index]));
  rmSync(pointerPath);
  // The installed command must work after ejecting the image, with no system Node.
  execFileSync("hdiutil", ["detach", mount], { stdio: "pipe" });
  mounted = false;
  const result = JSON.parse(execFileSync(join(bin, "better-codex"), ["version", "--json"], { env: { ...env, PATH: "/usr/bin:/bin" }, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }));
  assert.equal(result.core, version);
  console.log(JSON.stringify({ dmg: "verified", version, reinstalled: true, sameVersionConflictRejectedBeforeMutation: true, databasePreserved: true, worksAfterEject: true, requiresSystemNode: false, systemServiceChanged: false }));
} finally {
  if (mounted) execFileSync("hdiutil", ["detach", mount], { stdio: "pipe" });
  rmSync(work, { recursive: true, force: true });
}
