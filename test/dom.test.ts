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

test("square icon controls center their SVG geometry instead of using the text baseline", () => {
  const css = betterCodexDesignSystemCss();
  const iconControlRule = css.match(/#better-codex-panel \.better-codex-column-icon,\s*#better-codex-panel \.better-codex-agent-card-action,\s*#better-codex-dialog \.better-codex-icon-button,\s*#better-codex-update-notice \.better-codex-update-close \{([^}]*)\}/)?.[1] || "";

  assert.match(iconControlRule, /display:\s*inline-flex/);
  assert.match(iconControlRule, /align-items:\s*center/);
  assert.match(iconControlRule, /justify-content:\s*center/);
  assert.match(iconControlRule, /padding:\s*0/);
  assert.match(iconControlRule, /line-height:\s*0/);
  assert.match(css, /\.better-codex-column-icon > svg,[\s\S]*?\.better-codex-status-icon \{[^}]*display:\s*block;/);
});

test("task columns only render controls backed by working actions", () => {
  const source = injectionScript(4317, "test-token", "install");

  assert.doesNotMatch(source, /aria-label="更多"/);
  assert.match(source, /data-add-status=/);
  assert.match(source, /aria-label="新建任务"/);
});

test("column action controls share the column corner inset", () => {
  const css = betterCodexDesignSystemCss();

  assert.match(css, /\.better-codex-column-head\s*\{[^}]*padding:\s*0 0 var\(--bc-space-2\) var\(--bc-space-2\);/s);
});

test("default Codex agent opens a branded config editor", () => {
  const source = injectionScript(4317, "test-token", "install");

  assert.ok(source.includes('aria-label="Codex"'));
  assert.ok(source.includes("const isDefault = Boolean(draft.is_default);"));
  assert.ok(source.includes('"/api/agents/default"'));
  assert.ok(source.includes("影响之后新建的 Codex 窗口"));
  assert.ok(source.includes("if (!agent || agent.is_default) return;"));
});

test("agent model picker uses the runtime catalog and a Codex-style popover", () => {
  const source = injectionScript(4317, "test-token", "install");

  assert.ok(source.includes("bootstrap.agentModelCatalog"));
  assert.ok(source.includes('data-agent-picker="'));
  assert.ok(source.includes('role="listbox"'));
  assert.ok(source.includes('role="option"'));
  assert.doesNotMatch(source, /<select name="model"/);
  assert.doesNotMatch(source, /<select name="reasoning_effort"/);
});

test("opening an agent inspector hides the toolbar create action", () => {
  const source = injectionScript(4317, "test-token", "install");

  assert.ok(source.includes('addAgent.hidden = state.agentPane !== "preview"'));
  assert.match(betterCodexDesignSystemCss(), /\.better-codex-agent-actions\[hidden\]\s*\{[^}]*display:\s*none\s*!important/s);
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
