import { betterCodexDefaultHostTheme, type HostThemeDiagnostics } from "./contract.js";
import { deriveHostTheme } from "./derive.js";
import { themeCapabilitySignature } from "./diagnostics.js";
import { normalizeHostThemeInput } from "./normalize.js";

export interface HostThemeApplyEnvironment {
  host: string;
  style: { setProperty(name: string, value: string): void };
  colorMixSupported: boolean;
  fontFamilySupported: (value: string) => boolean;
}

export function applyHostTheme(value: unknown, environment: HostThemeApplyEnvironment) {
  const normalized = normalizeHostThemeInput(value);
  const derived = deriveHostTheme(normalized.input, environment.colorMixSupported);
  const invalidTokens = [...normalized.invalidTokens];
  const fallbackTokens = [...normalized.fallbackTokens];
  for (const [name, tokenValue] of Object.entries(derived.tokens)) {
    if (name.endsWith("font-ui") && !environment.fontFamilySupported(tokenValue)) {
      invalidTokens.push(name);
      fallbackTokens.push(name);
      const mode = name.includes("-dark-") ? "dark" : "light";
      environment.style.setProperty(name, betterCodexDefaultHostTheme[mode].uiFont);
    } else {
      environment.style.setProperty(name, tokenValue);
    }
  }
  const diagnostics: HostThemeDiagnostics = {
    host: environment.host,
    themeSource: normalized.input.source,
    schemaVersion: normalized.input.schemaVersion,
    missingTokens: normalized.missingTokens,
    invalidTokens: [...new Set(invalidTokens)].sort(),
    fallbackTokens: [...new Set(fallbackTokens)].sort(),
    contrastAdjustedTokens: derived.contrastAdjustedTokens,
    capabilitySignature: themeCapabilitySignature(environment.host, normalized.input.capabilities, environment.colorMixSupported, environment.fontFamilySupported(normalized.input.light.uiFont) && environment.fontFamilySupported(normalized.input.dark.uiFont)),
  };
  return { theme: normalized.input, diagnostics };
}
