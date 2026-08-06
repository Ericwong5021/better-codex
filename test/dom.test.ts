import assert from "node:assert/strict";
import test from "node:test";
import { betterCodexDesignSystemCss } from "../src/design-system.js";
import { injectionScript } from "../src/dom.js";

test("generated injection script is valid JavaScript", () => {
  const source = injectionScript(4317, "test-token", "install");

  assert.doesNotThrow(() => new Function(source));
  assert.ok(source.includes("location.pathname.match(/\\/local\\/([^/?#]+)/)"));
});

test("injected panel opts out of the native Electron drag region", () => {
  const source = injectionScript(4317, "test-token", "install");

  assert.match(source, /#\$\{PANEL_ID\}[^}]*-webkit-app-region:\s*no-drag\s*!important/);
});

test("default Codex agent renders with branded, read-only treatment", () => {
  const source = injectionScript(4317, "test-token", "install");

  assert.ok(source.includes('aria-label="Codex"'));
  assert.ok(source.includes("const isDefault = Boolean(draft.is_default);"));
  assert.ok(source.includes("if (!agent || agent.is_default) return;"));
});

test("destructive actions use the branded confirmation dialog", () => {
  const source = injectionScript(4317, "test-token", "install");

  assert.ok(source.includes('dialog.id = "better-codex-confirm"'));
  assert.ok(source.includes('confirmAction("删除任务"'));
  assert.ok(source.includes('confirmAction("删除智能体"'));
  assert.doesNotMatch(source, /\b(?:window\.)?confirm\s*\(/);
});

test("Codex-native visual values live behind semantic design tokens", () => {
  const css = betterCodexDesignSystemCss();
  const source = injectionScript(4317, "test-token", "install");

  assert.ok(css.includes("--bc-color-canvas:"));
  assert.ok(css.includes("--bc-radius-xl:"));
  assert.ok(css.includes("--bc-motion-fast:"));
  assert.match(css, /\.better-codex-card\s*\{[^}]*border:\s*0;/s);
  assert.match(css, /\.better-codex-search\s*\{[^}]*border:\s*0;/s);
  assert.ok(source.includes("--bc-color-surface-raised:"));
});
