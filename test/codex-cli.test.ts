import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { codexExecutableCandidates, createCodexExecutablePathResolver, resolveCodexExecutable } from "../src/codex-cli.js";

function fixture() {
  const root = mkdtempSync(join(tmpdir(), "better-codex-cli-test-"));
  return { root, dispose: () => rmSync(root, { recursive: true, force: true }) };
}

function executable(path: string, modifiedAt = new Date()) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, "test executable");
  utimesSync(path, modifiedAt, modifiedAt);
  return path;
}

test("Windows discovery prefers the newest executable local Codex CLI", () => {
  const current = fixture();
  try {
    const bin = join(current.root, "local", "OpenAI", "Codex", "bin");
    const older = executable(join(bin, "older", "codex.exe"), new Date("2026-01-01T00:00:00Z"));
    const newer = executable(join(bin, "newer", "codex.exe"), new Date("2026-02-01T00:00:00Z"));
    executable(join(bin, "codex.exe"), new Date("2025-12-01T00:00:00Z"));
    const candidates = codexExecutableCandidates({
      platform: "win32",
      arch: "x64",
      env: { LOCALAPPDATA: join(current.root, "local"), Path: "" },
      applicationPath: null,
    });
    assert.ok(candidates.indexOf(newer) < candidates.indexOf(older));
    assert.equal(resolveCodexExecutable({
      platform: "win32",
      arch: "x64",
      env: { LOCALAPPDATA: join(current.root, "local"), Path: "" },
      applicationPath: null,
      probe: value => value === newer,
    }), newer);
  } finally {
    current.dispose();
  }
});

test("Windows discovery can launch the native executable installed by npm", () => {
  const current = fixture();
  try {
    const npmExecutable = executable(join(
      current.root,
      "roaming",
      "npm",
      "node_modules",
      "@openai",
      "codex",
      "node_modules",
      "@openai",
      "codex-win32-x64",
      "vendor",
      "x86_64-pc-windows-msvc",
      "bin",
      "codex.exe",
    ));
    assert.equal(resolveCodexExecutable({
      platform: "win32",
      arch: "x64",
      env: { APPDATA: join(current.root, "roaming"), Path: "" },
      applicationPath: null,
      probe: existsSync,
    }), npmExecutable);
  } finally {
    current.dispose();
  }
});

test("explicit Better Codex CLI configuration stays highest priority", () => {
  const configured = "C:\\tools\\codex.exe";
  const candidates = codexExecutableCandidates({
    platform: "win32",
    arch: "x64",
    env: { BETTER_CODEX_CODEX_PATH: configured, CODEX_CLI_PATH: "C:\\fallback\\codex.exe", Path: "" },
    applicationPath: null,
  });
  assert.equal(candidates[0], configured);
  assert.equal(resolveCodexExecutable({
    platform: "win32",
    arch: "x64",
    env: { BETTER_CODEX_CODEX_PATH: configured, Path: "" },
    applicationPath: null,
    probe: value => value === configured,
  }), configured);
});

test("cached absolute Codex CLI paths are refreshed after an app update removes them", () => {
  const oldExecutable = "C:\\Codex\\old\\codex.exe";
  const newExecutable = "C:\\Codex\\new\\codex.exe";
  const available = new Set([oldExecutable, newExecutable]);
  const discovered = [oldExecutable, newExecutable];
  const executablePath = createCodexExecutablePathResolver(
    () => discovered.shift() ?? null,
    path => available.has(path),
    "win32",
  );

  assert.equal(executablePath(), oldExecutable);
  assert.equal(executablePath(), oldExecutable);
  available.delete(oldExecutable);
  assert.equal(executablePath(), newExecutable);
  assert.equal(discovered.length, 0);
});

test("Windows Store Codex executable is copied outside WindowsApps before use", () => {
  const current = fixture();
  try {
    const source = executable(join(current.root, "Codex", "app", "resources", "codex.exe"));
    const candidates = codexExecutableCandidates({
      platform: "win32",
      arch: "x64",
      env: { Path: "" },
      applicationPath: join(current.root, "Codex"),
      tempDirectory: join(current.root, "temp"),
    });
    assert.notEqual(candidates[0], source);
    assert.ok(existsSync(candidates[0]));
    assert.equal(readFileSync(candidates[0], "utf8"), "test executable");
    assert.ok(candidates.indexOf(candidates[0]) < candidates.indexOf(source));
  } finally {
    current.dispose();
  }
});

test("all background Codex launches use the shared executable resolver", () => {
  const worker = readFileSync(new URL("../src/worker.ts", import.meta.url), "utf8");
  const catalog = readFileSync(new URL("../src/model-catalog.ts", import.meta.url), "utf8");
  for (const source of [worker, catalog]) {
    assert.match(source, /codexExecutablePath/);
    assert.doesNotMatch(source, /function codexPath\(/);
  }
  assert.equal((worker.match(/spawn\(codexExecutablePath\(\)/g) || []).length, 3);
});
