import { betterCodexDesignTokensCss } from "./ui/design/css.js";
import { betterCodexComponentStylesCss } from "./ui/design/styles/components.js";
import { betterCodexFeatureStructureStylesCss, betterCodexFeatureStylesCss } from "./ui/design/styles/features.js";
import { betterCodexPatternStylesCss } from "./ui/design/styles/patterns.js";
import { betterCodexPrimitiveStylesCss } from "./ui/design/styles/primitives.js";

export { betterCodexThemeColors } from "./ui/design/codex-semantic.js";
export { betterCodexAvatarColors } from "./ui/design/product-semantic.js";
export { betterCodexDesignTokenRegistry } from "./ui/design/registry.js";
export { betterCodexDesignTokensCss };

export function betterCodexDesignSystemCss() {
  return [betterCodexDesignTokensCss(), betterCodexFeatureStructureStylesCss(), betterCodexPrimitiveStylesCss(), betterCodexComponentStylesCss(), betterCodexPatternStylesCss(), betterCodexFeatureStylesCss()].join("");
}
