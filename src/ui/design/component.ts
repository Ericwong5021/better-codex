import type { DesignTokenDefinition } from "./registry-types.js";

export const componentTokens = [
  { name: "--bc-switch-count", layer: "component", light: "3", hostOverridable: false, order: 118, scope: "local" },
  { name: "--bc-dialog-content-gutter", layer: "component", light: "calc(var(--bc-text-base) * 1.714286)", hostOverridable: false, order: 119, scope: "local" },
  { name: "--bc-board-scroll-thumb-width", layer: "component", light: "48px", hostOverridable: false, order: 124, scope: "local" },
  { name: "--bc-board-scroll-control-size", layer: "component", light: "32px", hostOverridable: false, order: 125 },
  { name: "--bc-board-scroll-input-size", layer: "component", light: "22px", hostOverridable: false, order: 126 },
  { name: "--bc-board-scroll-track-size", layer: "component", light: "5px", hostOverridable: false, order: 127 },
  { name: "--bc-board-scroll-thumb-size", layer: "component", light: "13px", hostOverridable: false, order: 128 },
  { name: "--bc-board-scroll-thumb-shadow", layer: "component", light: "var(--bc-elevation-thumb)", hostOverridable: false, order: 129 },
  { name: "--bc-switch-outline", layer: "component", light: "inset 0 0 0 1px var(--bc-color-text-muted)", hostOverridable: false, order: 130 },
] as const satisfies readonly DesignTokenDefinition[];
