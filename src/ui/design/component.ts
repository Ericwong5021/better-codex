import type { DesignTokenDefinition } from "./registry-types.js";

export const componentTokens = [
  { name: "--bc-switch-count", layer: "component", light: "3", hostOverridable: false, order: 118, scope: "local" },
  { name: "--bc-dialog-content-gutter", layer: "component", light: "calc(var(--bc-text-base) * 1.714286)", hostOverridable: false, order: 119, scope: "local" },
  { name: "--bc-board-scroll-thumb-width", layer: "component", light: "48px", hostOverridable: false, order: 124, scope: "local" },
  { name: "--bc-slider-track-size", layer: "component", light: "5px", hostOverridable: false, order: 125, scope: "local" },
  { name: "--bc-slider-thumb-size", layer: "component", light: "13px", hostOverridable: false, order: 126, scope: "local" },
  { name: "--bc-slider-thumb-min-length", layer: "component", light: "48px", hostOverridable: false, order: 127, scope: "local" },
  { name: "--bc-slider-thumb-inline-size", layer: "component", light: "var(--bc-slider-thumb-size)", hostOverridable: false, order: 128, scope: "local" },
] as const satisfies readonly DesignTokenDefinition[];
