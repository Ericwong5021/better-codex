import type { HostThemeDiagnostics } from "./contract.js";

export function themeCapabilitySignature(host: string, declared: string[], colorMixSupported: boolean, fontFamilySupported: boolean) {
  return [host, ...declared, `color-mix:${colorMixSupported ? "yes" : "no"}`, `font-family:${fontFamilySupported ? "yes" : "no"}`].sort().join("|");
}

export function themeIsDegraded(diagnostics: HostThemeDiagnostics) {
  return diagnostics.invalidTokens.length > 0 || diagnostics.fallbackTokens.length > 0 || diagnostics.contrastAdjustedTokens.length > 0;
}
