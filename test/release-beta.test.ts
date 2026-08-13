import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { nextBetaVersion, prepareAndVerifyBetaRelease, prepareBetaRelease, validateBetaRelease } from "../scripts/release-beta.mjs";

function fixture(version = "0.4.1", unreleased = "### Fixed\n\n- Keep the cached CLI path fresh.") {
  const root = mkdtempSync(join(tmpdir(), "better-codex-release-beta-"));
  mkdirSync(join(root, "src"));
  writeFileSync(join(root, "package.json"), `${JSON.stringify({ name: "better-codex", version }, null, 2)}\n`);
  writeFileSync(join(root, "package-lock.json"), `${JSON.stringify({ name: "better-codex", version, lockfileVersion: 3, packages: { "": { name: "better-codex", version } } }, null, 2)}\n`);
  writeFileSync(join(root, "src", "version.ts"), `export const coreVersion = "${version}";\n`);
  writeFileSync(join(root, "CHANGELOG.md"), `# Changelog\n\n## [Unreleased]\n\n${unreleased}\n\n## [${version}] - 2026-08-10\n\n### Fixed\n\n- Previous change.\n\n[Unreleased]: https://github.com/example/better-codex/compare/v${version}...HEAD\n[${version}]: https://github.com/example/better-codex/tree/v${version}\n`);
  return root;
}

test("next Beta defaults to the next patch or increments the current Beta", () => {
  assert.equal(nextBetaVersion("0.4.1"), "0.4.2-beta.1");
  assert.equal(nextBetaVersion("0.4.2-beta.1"), "0.4.2-beta.2");
  assert.throws(() => nextBetaVersion("0.4.2-rc.1"), /not a stable or Beta/);
});

test("Beta preparation synchronizes versions and releases Unreleased notes", () => {
  const root = fixture();
  try {
    assert.deepEqual(prepareBetaRelease(root, "0.5.0-beta.1", "2026-08-11"), { currentVersion: "0.4.1", nextVersion: "0.5.0-beta.1" });
    assert.equal(JSON.parse(readFileSync(join(root, "package.json"), "utf8")).version, "0.5.0-beta.1");
    assert.equal(JSON.parse(readFileSync(join(root, "package-lock.json"), "utf8")).packages[""].version, "0.5.0-beta.1");
    assert.match(readFileSync(join(root, "src", "version.ts"), "utf8"), /coreVersion = "0\.5\.0-beta\.1"/);
    const changelog = readFileSync(join(root, "CHANGELOG.md"), "utf8");
    assert.match(changelog, /## \[Unreleased\]\n\n## \[0\.5\.0-beta\.1\] - 2026-08-11/);
    assert.match(changelog, /\[Unreleased\]: .+\/compare\/v0\.5\.0-beta\.1\.\.\.HEAD/);
    assert.match(changelog, /\[0\.5\.0-beta\.1\]: .+\/compare\/v0\.4\.1\.\.\.v0\.5\.0-beta\.1/);
    assert.deepEqual(validateBetaRelease(root, "0.5.0-beta.1", "v0.5.0-beta.1"), { version: "0.5.0-beta.1" });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("Beta preparation refuses empty notes without changing release sources", () => {
  const root = fixture("0.4.1", "");
  try {
    const paths = ["package.json", "package-lock.json", join("src", "version.ts"), "CHANGELOG.md"];
    const before = paths.map(path => readFileSync(join(root, path), "utf8"));
    assert.throws(() => prepareBetaRelease(root, "0.4.2-beta.1", "2026-08-11"), /Unreleased must contain at least one change/);
    assert.deepEqual(paths.map(path => readFileSync(join(root, path), "utf8")), before);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("Beta preparation refuses a drifted baseline without changing release sources", () => {
  const root = fixture();
  try {
    const packageJsonPath = join(root, "package.json");
    const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));
    packageJson.version = "0.9.0";
    writeFileSync(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`);
    const paths = ["package.json", "package-lock.json", join("src", "version.ts"), "CHANGELOG.md"];
    const before = paths.map(path => readFileSync(join(root, path), "utf8"));
    assert.throws(() => prepareBetaRelease(root, "0.9.1-beta.1", "2026-08-11"), /Current version sources are not synchronized/);
    assert.deepEqual(paths.map(path => readFileSync(join(root, path), "utf8")), before);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("Beta preparation rolls release sources back when verification fails", () => {
  const root = fixture();
  try {
    const paths = ["package.json", "package-lock.json", join("src", "version.ts"), "CHANGELOG.md"];
    const before = paths.map(path => readFileSync(join(root, path), "utf8"));
    assert.throws(() => prepareAndVerifyBetaRelease(root, "0.4.2-beta.1", "2026-08-11", () => {
      throw new Error("package_failed");
    }), /package_failed/);
    assert.deepEqual(paths.map(path => readFileSync(join(root, path), "utf8")), before);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("Beta rollback never overwrites a release source changed during verification", () => {
  const root = fixture();
  try {
    const changelogPath = join(root, "CHANGELOG.md");
    assert.throws(() => prepareAndVerifyBetaRelease(root, "0.4.2-beta.1", "2026-08-11", () => {
      writeFileSync(changelogPath, `${readFileSync(changelogPath, "utf8")}\nExternal release note.\n`);
      throw new Error("package_failed");
    }), /rollback was not safe: Rollback refused.+CHANGELOG\.md/);
    assert.match(readFileSync(changelogPath, "utf8"), /External release note/);
    assert.equal(JSON.parse(readFileSync(join(root, "package.json"), "utf8")).version, "0.4.2-beta.1");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("Beta validation rejects version and tag drift", () => {
  const root = fixture();
  try {
    prepareBetaRelease(root, "0.4.2-beta.1", "2026-08-11");
    assert.throws(() => validateBetaRelease(root, "0.4.2-beta.2"), /does not match expected version/);
    assert.throws(() => validateBetaRelease(root, "0.4.2-beta.1", "v0.4.2-beta.2"), /Preview tag/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
