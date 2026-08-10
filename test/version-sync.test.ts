import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const packageJson = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")) as { version: string };
const packageLock = JSON.parse(readFileSync(new URL("../package-lock.json", import.meta.url), "utf8")) as { packages: Record<string, { version?: string }> };
const compatibilitySource = readFileSync(new URL("../src/compatibility.ts", import.meta.url), "utf8");
const changelog = readFileSync(new URL("../CHANGELOG.md", import.meta.url), "utf8");
const releaseWorkflow = readFileSync(new URL("../.github/workflows/release.yml", import.meta.url), "utf8");

test("release version sources stay synchronized", () => {
  const version = packageJson.version;
  const coreVersion = compatibilitySource.match(/export const coreVersion = "([^"]+)"/)?.[1];
  const escapedVersion = version.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  assert.match(version, /^\d+\.\d+\.\d+$/);
  assert.equal(packageLock.packages[""].version, version);
  assert.equal(coreVersion, version);
  assert.match(changelog, new RegExp(`^## \\[${escapedVersion}\\] - \\d{4}-\\d{2}-\\d{2}$`, "m"));
  assert.ok(changelog.includes(`[Unreleased]: https://github.com/Ericwong5021/better-codex/compare/v${version}...HEAD`));
  assert.match(releaseWorkflow, /group: better-codex-release/);
  assert.match(releaseWorkflow, /queue: max/);
  assert.match(releaseWorkflow, /Refuse to downgrade the Homebrew formula/);
  assert.match(releaseWorkflow, /git rebase origin\/main/);
});
