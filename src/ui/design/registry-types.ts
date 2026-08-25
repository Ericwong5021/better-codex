export type DesignTokenLayer = "foundation" | "codex-semantic" | "product-semantic" | "brand" | "component" | "legacy";

export interface DesignTokenDefinition {
  name: `--bc-${string}`;
  layer: DesignTokenLayer;
  light: string;
  dark?: string;
  hostOverridable: boolean;
  order: number;
  scope?: "root" | "local";
}
