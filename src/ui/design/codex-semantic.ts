import type { DesignTokenDefinition } from "./registry-types.js";

export const betterCodexThemeColors = {
  light: { canvas: "#ffffff", navigation: "#f8f8f8", surface: "#f8f8f8", raised: "#ededee", control: "#f3f3f4", hover: "#eaeaeb", pressed: "#e3e3e4", hairline: "#e5e5e6", ink: "#1a1c1f", accent: "#339cff" },
  dark: { canvas: "#1e1e1e", navigation: "#181818", surface: "#232323", raised: "#2c2c2c", control: "#272727", hover: "#2f2f2f", pressed: "#343434", hairline: "#323232", ink: "#d4d4d4", accent: "#007acc" },
} as const;

export const codexSemanticTokens = [
  { name: "--bc-color-canvas", layer: "codex-semantic", light: `var(--bc-host-light-canvas, ${betterCodexThemeColors.light.canvas})`, dark: `var(--bc-host-dark-canvas, ${betterCodexThemeColors.dark.canvas})`, hostOverridable: true, order: 35 },
  { name: "--bc-color-navigation", layer: "codex-semantic", light: betterCodexThemeColors.light.navigation, dark: betterCodexThemeColors.dark.navigation, hostOverridable: false, order: 36 },
  { name: "--bc-color-surface", layer: "codex-semantic", light: `var(--bc-host-light-surface, ${betterCodexThemeColors.light.surface})`, dark: `var(--bc-host-dark-surface, ${betterCodexThemeColors.dark.surface})`, hostOverridable: true, order: 37 },
  { name: "--bc-color-surface-raised", layer: "codex-semantic", light: `var(--bc-host-light-raised, ${betterCodexThemeColors.light.raised})`, dark: `var(--bc-host-dark-raised, ${betterCodexThemeColors.dark.raised})`, hostOverridable: true, order: 38 },
  { name: "--bc-color-control", layer: "codex-semantic", light: `var(--bc-host-light-control, ${betterCodexThemeColors.light.control})`, dark: `var(--bc-host-dark-control, ${betterCodexThemeColors.dark.control})`, hostOverridable: true, order: 39 },
  { name: "--bc-color-input", layer: "codex-semantic", light: "var(--bc-color-canvas)", dark: "var(--bc-color-control)", hostOverridable: false, order: 40 },
  { name: "--bc-color-hover", layer: "codex-semantic", light: `var(--bc-host-light-hover, ${betterCodexThemeColors.light.hover})`, dark: `var(--bc-host-dark-hover, ${betterCodexThemeColors.dark.hover})`, hostOverridable: true, order: 41 },
  { name: "--bc-color-pressed", layer: "codex-semantic", light: `var(--bc-host-light-pressed, ${betterCodexThemeColors.light.pressed})`, dark: `var(--bc-host-dark-pressed, ${betterCodexThemeColors.dark.pressed})`, hostOverridable: true, order: 42 },
  { name: "--bc-color-hairline", layer: "codex-semantic", light: `var(--bc-host-light-hairline, ${betterCodexThemeColors.light.hairline})`, dark: `var(--bc-host-dark-hairline, ${betterCodexThemeColors.dark.hairline})`, hostOverridable: true, order: 43 },
  { name: "--bc-color-text", layer: "codex-semantic", light: `var(--bc-host-light-ink, ${betterCodexThemeColors.light.ink})`, dark: `var(--bc-host-dark-ink, ${betterCodexThemeColors.dark.ink})`, hostOverridable: true, order: 44 },
  { name: "--bc-color-text-muted", layer: "codex-semantic", light: "color-mix(in srgb, var(--bc-color-text) 62%, var(--bc-color-canvas))", hostOverridable: false, order: 45 },
  { name: "--bc-color-text-faint", layer: "codex-semantic", light: "color-mix(in srgb, var(--bc-color-text) 44%, var(--bc-color-canvas))", hostOverridable: false, order: 46 },
  { name: "--bc-color-focus", layer: "codex-semantic", light: `var(--bc-host-light-accent, ${betterCodexThemeColors.light.accent})`, dark: `var(--bc-host-dark-accent, ${betterCodexThemeColors.dark.accent})`, hostOverridable: true, order: 47 },
  { name: "--bc-color-info", layer: "codex-semantic", light: "var(--bc-color-focus)", hostOverridable: false, order: 48 },
  { name: "--bc-color-primary", layer: "codex-semantic", light: "var(--bc-color-text)", dark: "var(--bc-color-text)", hostOverridable: false, order: 49 },
  { name: "--bc-color-on-primary", layer: "codex-semantic", light: "var(--bc-color-canvas)", dark: "var(--bc-color-canvas)", hostOverridable: false, order: 50 },
  { name: "--bc-color-scrim", layer: "codex-semantic", light: "rgb(18 18 20 / .28)", dark: "rgb(0 0 0 / .56)", hostOverridable: false, order: 61 },
] as const satisfies readonly DesignTokenDefinition[];
