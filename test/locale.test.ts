import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { normalizeCodexLocale, readCodexLocale } from "../src/locale.js";

test("Codex locale keeps Simplified Chinese and maps other locales to English", () => {
  assert.equal(normalizeCodexLocale("zh-CN"), "zh-CN");
  assert.equal(normalizeCodexLocale("zh_CN"), "zh-CN");
  assert.equal(normalizeCodexLocale("zh-Hans"), "zh-CN");
  assert.equal(normalizeCodexLocale("en-US"), "en");
  assert.equal(normalizeCodexLocale("ja-JP"), "en");
  assert.equal(normalizeCodexLocale(undefined), "en");
});

test("Codex locale is read from computer-use config", () => {
  const directory = mkdtempSync(join(tmpdir(), "better-codex-locale-"));
  const configPath = join(directory, "config.json");
  writeFileSync(configPath, JSON.stringify({ locale: "en-US" }));
  assert.equal(readCodexLocale(configPath), "en");
  writeFileSync(configPath, JSON.stringify({ locale: "zh-CN" }));
  assert.equal(readCodexLocale(configPath), "zh-CN");
  writeFileSync(configPath, "not-json");
  assert.equal(readCodexLocale(configPath), "en");
});
