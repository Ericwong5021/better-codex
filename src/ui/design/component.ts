import type { DesignTokenDefinition } from "./registry-types.js";

export const componentTokens = [
  { name: "--bc-switch-count", layer: "component", light: "3", hostOverridable: false, order: 118, scope: "local" },
  { name: "--bc-dialog-content-gutter", layer: "component", light: "calc(var(--bc-text-base) * 1.714286)", hostOverridable: false, order: 119, scope: "local" },
] as const satisfies readonly DesignTokenDefinition[];
