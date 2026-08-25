import type { DesignTokenDefinition } from "./registry-types.js";

export const brandTokens = [
  { name: "--bc-logo-gradient-start", layer: "brand", light: "#b1a7ff", hostOverridable: false, order: 58 },
  { name: "--bc-logo-gradient-middle", layer: "brand", light: "#7a9dff", hostOverridable: false, order: 59 },
  { name: "--bc-logo-gradient-end", layer: "brand", light: "#3941ff", hostOverridable: false, order: 60 },
] as const satisfies readonly DesignTokenDefinition[];
