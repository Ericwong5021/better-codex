import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { betterCodexThemeColors } from "./design-system.js";
import { betterCodexDefaultUiFont, type HostThemeInput } from "./ui/theme/contract.js";

export type CodexAppearance = {
  theme: "system" | "light" | "dark";
  light: CodexChromeTheme;
  dark: CodexChromeTheme;
};

export type CodexChromeTheme = {
  accent: string;
  contrast: number;
  ink: string;
  surface: string;
  uiFont: string;
};

const defaultUiFont = betterCodexDefaultUiFont;

const defaultConfigPath = join(process.env.CODEX_HOME || join(homedir(), ".codex"), "config.toml");

function tomlString(value: string) {
  const source = value.trim();
  if (source.startsWith('"')) {
    try { return JSON.parse(source) as string; } catch { return ""; }
  }
  if (source.startsWith("'")) {
    const end = source.indexOf("'", 1);
    return end < 0 ? "" : source.slice(1, end);
  }
  return source.split(/\s+#/, 1)[0].trim();
}

function sectionString(source: string, section: string, key: string) {
  let active = false;
  for (const line of source.split(/\r?\n/)) {
    const heading = line.match(/^\s*\[([^\]]+)\]\s*(?:#.*)?$/);
    if (heading) {
      active = heading[1].trim() === section;
      continue;
    }
    if (!active) continue;
    const assignment = line.match(new RegExp(`^\\s*${key}\\s*=\\s*(.+?)\\s*$`));
    if (assignment) return tomlString(assignment[1]);
  }
  return "";
}

function color(value: string, fallback: string) {
  return /^#[0-9a-f]{6}$/i.test(value) ? value.toLowerCase() : fallback;
}

function sectionNumber(source: string, section: string, key: string, fallback: number) {
  const configured = sectionString(source, section, key);
  if (!configured) return fallback;
  const value = Number(configured);
  return Number.isFinite(value) && value >= 0 && value <= 100 ? value : fallback;
}

function chromeTheme(source: string, section: string, fallback: CodexChromeTheme): CodexChromeTheme {
  return {
    accent: color(sectionString(source, section, "accent"), fallback.accent),
    contrast: sectionNumber(source, section, "contrast", fallback.contrast),
    ink: color(sectionString(source, section, "ink"), fallback.ink),
    surface: color(sectionString(source, section, "surface"), fallback.surface),
    uiFont: sectionString(source, `${section}.fonts`, "ui") || fallback.uiFont,
  };
}

export function readCodexAppearance(path = defaultConfigPath): CodexAppearance {
  const source = existsSync(path) ? readFileSync(path, "utf8") : "";
  const configuredTheme = sectionString(source, "desktop", "appearanceTheme");
  const theme = configuredTheme === "light" || configuredTheme === "dark" ? configuredTheme : "system";
  return {
    theme,
    light: chromeTheme(source, "desktop.appearanceLightChromeTheme", { accent: betterCodexThemeColors.light.accent, contrast: 45, ink: betterCodexThemeColors.light.ink, surface: betterCodexThemeColors.light.canvas, uiFont: defaultUiFont }),
    dark: chromeTheme(source, "desktop.appearanceDarkChromeTheme", { accent: betterCodexThemeColors.dark.accent, contrast: 50, ink: betterCodexThemeColors.dark.ink, surface: betterCodexThemeColors.dark.canvas, uiFont: defaultUiFont }),
  };
}

export function readHostThemeInput(path = defaultConfigPath): HostThemeInput {
  const exists = existsSync(path);
  const source = exists ? readFileSync(path, "utf8") : "";
  const appearance = readCodexAppearance(path);
  const missingTokens: string[] = [];
  const invalidTokens: string[] = [];
  const fallbackTokens: string[] = [];
  const inspect = (mode: "light" | "dark", section: string) => {
    for (const key of ["accent", "ink", "surface"] as const) {
      const value = sectionString(source, section, key);
      if (!value) missingTokens.push(`${mode}.${key}`);
      else if (!/^#[0-9a-f]{6}$/i.test(value)) invalidTokens.push(`${mode}.${key}`);
    }
    const contrast = sectionString(source, section, "contrast");
    const numericContrast = Number(contrast);
    if (!contrast) missingTokens.push(`${mode}.contrast`);
    else if (!Number.isFinite(numericContrast) || numericContrast < 0 || numericContrast > 100) invalidTokens.push(`${mode}.contrast`);
    if (!sectionString(source, `${section}.fonts`, "ui")) missingTokens.push(`${mode}.uiFont`);
  };
  inspect("light", "desktop.appearanceLightChromeTheme");
  inspect("dark", "desktop.appearanceDarkChromeTheme");
  const configuredTheme = sectionString(source, "desktop", "appearanceTheme");
  if (!configuredTheme) missingTokens.push("theme");
  else if (configuredTheme !== "system" && configuredTheme !== "light" && configuredTheme !== "dark") invalidTokens.push("theme");
  fallbackTokens.push(...missingTokens, ...invalidTokens);
  return {
    schemaVersion: 1,
    source: exists && (configuredTheme || missingTokens.length < 11) ? "codex-config" : "fallback",
    theme: appearance.theme,
    light: appearance.light,
    dark: appearance.dark,
    capabilities: ["light", "dark", "font-family", "contrast"],
    diagnostics: {
      missingTokens: [...new Set(missingTokens)].sort(),
      invalidTokens: [...new Set(invalidTokens)].sort(),
      fallbackTokens: [...new Set(fallbackTokens)].sort(),
    },
  };
}
