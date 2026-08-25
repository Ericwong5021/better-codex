import { legacyAliasTokens } from "./aliases.js";
import { brandTokens } from "./brand.js";
import { codexSemanticTokens } from "./codex-semantic.js";
import { componentTokens } from "./component.js";
import { foundationTokens } from "./foundation.js";
import { productSemanticTokens } from "./product-semantic.js";
import type { DesignTokenDefinition } from "./registry-types.js";

const tokens: DesignTokenDefinition[] = [
  ...foundationTokens,
  ...codexSemanticTokens,
  ...productSemanticTokens,
  ...brandTokens,
  ...componentTokens,
  ...legacyAliasTokens,
].sort((left, right) => left.order - right.order);

const names = new Set<string>();
const orders = new Set<number>();

for (const token of tokens) {
  if (names.has(token.name)) throw new Error(`Duplicate Better Codex design token: ${token.name}`);
  if (orders.has(token.order)) throw new Error(`Duplicate Better Codex design token order: ${token.order}`);
  names.add(token.name);
  orders.add(token.order);
}

export const betterCodexDesignTokenRegistry = Object.freeze(tokens);
export type { DesignTokenDefinition, DesignTokenLayer } from "./registry-types.js";
