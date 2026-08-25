import { betterCodexThemeColors } from "../design/codex-semantic.js";

export type HostThemeMode = "system" | "light" | "dark";
export type HostThemeSource = "codex-config" | "codex-css-probe" | "web-bootstrap" | "fallback";

export interface HostThemeProfile {
  accent: string;
  contrast: number;
  ink: string;
  surface: string;
  uiFont: string;
}

export interface HostThemeInput {
  schemaVersion: 1;
  source: HostThemeSource;
  theme: HostThemeMode;
  light: HostThemeProfile;
  dark: HostThemeProfile;
  capabilities: string[];
  diagnostics?: {
    missingTokens?: string[];
    invalidTokens?: string[];
    fallbackTokens?: string[];
  };
}

export interface HostThemeDiagnostics {
  host: string;
  themeSource: HostThemeSource;
  schemaVersion: number;
  missingTokens: string[];
  invalidTokens: string[];
  fallbackTokens: string[];
  contrastAdjustedTokens: string[];
  capabilitySignature: string;
}

export interface NormalizedHostTheme {
  input: HostThemeInput;
  missingTokens: string[];
  invalidTokens: string[];
  fallbackTokens: string[];
}

export const betterCodexDefaultUiFont = 'ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif';

export const betterCodexDefaultHostTheme: HostThemeInput = {
  schemaVersion: 1,
  source: "fallback",
  theme: "system",
  light: { accent: betterCodexThemeColors.light.accent, contrast: 45, ink: betterCodexThemeColors.light.ink, surface: betterCodexThemeColors.light.canvas, uiFont: betterCodexDefaultUiFont },
  dark: { accent: betterCodexThemeColors.dark.accent, contrast: 50, ink: betterCodexThemeColors.dark.ink, surface: betterCodexThemeColors.dark.canvas, uiFont: betterCodexDefaultUiFont },
  capabilities: ["light", "dark", "font-family", "contrast"],
};
