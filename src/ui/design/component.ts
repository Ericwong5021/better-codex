import type { DesignTokenDefinition } from "./registry-types.js";

export const componentTokens = [
  { name: "--bc-switch-count", layer: "component", light: "3", hostOverridable: false, order: 118, scope: "local" },
  { name: "--bc-dialog-content-gutter", layer: "component", light: "calc(var(--bc-text-base) * 1.714286)", hostOverridable: false, order: 119, scope: "local" },
  { name: "--bc-board-scroll-thumb-width", layer: "component", light: "48px", hostOverridable: false, order: 124, scope: "local" },
  { name: "--bc-board-scroll-track-size", layer: "component", light: "5px", hostOverridable: false, order: 125, scope: "local" },
  { name: "--bc-board-scroll-thumb-size", layer: "component", light: "16px", hostOverridable: false, order: 126, scope: "local" },
  { name: "--bc-board-scroll-focus-shadow", layer: "component", light: "var(--bc-elevation-thumb), 0 0 0 3px color-mix(in oklch, var(--bc-color-focus) 40%, transparent)", hostOverridable: false, order: 127, scope: "local" },
] as const satisfies readonly DesignTokenDefinition[];
