import type { DesignTokenDefinition } from "./registry-types.js";

export const betterCodexAvatarColors = ["#2563eb", "#7c3aed", "#0f766e", "#15803d", "#4d7c0f", "#a16207", "#c2410c", "#be185d"] as const;

export const productSemanticTokens = [
  { name: "--bc-color-on-avatar", layer: "product-semantic", light: "#ffffff", hostOverridable: false, order: 51 },
  { name: "--bc-color-danger", layer: "product-semantic", light: "oklch(.59 .2 27)", dark: "oklch(.68 .18 24)", hostOverridable: false, order: 52 },
  { name: "--bc-color-danger-soft", layer: "product-semantic", light: "color-mix(in oklch, var(--bc-color-danger) 12%, var(--bc-color-surface))", hostOverridable: false, order: 53 },
  { name: "--bc-color-success", layer: "product-semantic", light: "oklch(.55 .16 145)", dark: "oklch(.65 .15 145)", hostOverridable: false, order: 54 },
  { name: "--bc-color-warning", layer: "product-semantic", light: "oklch(.75 .16 85)", dark: "oklch(.70 .16 85)", hostOverridable: false, order: 55 },
  { name: "--bc-color-online", layer: "product-semantic", light: "var(--bc-color-success)", hostOverridable: false, order: 56 },
  { name: "--bc-color-star", layer: "product-semantic", light: "var(--bc-color-warning)", hostOverridable: false, order: 57 },
  { name: "--bc-priority-none", layer: "product-semantic", light: "oklch(.62 .01 286)", dark: "oklch(.68 .01 286)", hostOverridable: false, order: 62 },
  { name: "--bc-priority-low", layer: "product-semantic", light: "oklch(.55 .1 250)", dark: "oklch(.68 .1 250)", hostOverridable: false, order: 63 },
  { name: "--bc-priority-medium", layer: "product-semantic", light: "oklch(.76 .15 95)", dark: "oklch(.78 .14 95)", hostOverridable: false, order: 64 },
  { name: "--bc-priority-high", layer: "product-semantic", light: "oklch(.68 .18 52)", dark: "oklch(.74 .16 52)", hostOverridable: false, order: 65 },
  { name: "--bc-priority-urgent", layer: "product-semantic", light: "var(--bc-color-danger)", dark: "var(--bc-color-danger)", hostOverridable: false, order: 66 },
] as const satisfies readonly DesignTokenDefinition[];
