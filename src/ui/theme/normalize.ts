import { betterCodexDefaultHostTheme, type HostThemeInput, type HostThemeMode, type HostThemeProfile, type HostThemeSource, type NormalizedHostTheme } from "./contract.js";

function object(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? value as Record<string, unknown> : {};
}

function unique(values: string[]) {
  return [...new Set(values)].sort();
}

function stringArray(value: unknown) {
  return Array.isArray(value) ? value.filter(item => typeof item === "string" && item.trim()).map(item => item.trim()) : [];
}

function profile(value: unknown, mode: "light" | "dark", missingTokens: string[], invalidTokens: string[], fallbackTokens: string[]): HostThemeProfile {
  const source = object(value);
  const fallback = betterCodexDefaultHostTheme[mode];
  const readColor = (key: "accent" | "ink" | "surface") => {
    const path = `${mode}.${key}`;
    if (source[key] === undefined || source[key] === "") {
      missingTokens.push(path);
      fallbackTokens.push(path);
      return fallback[key];
    }
    if (typeof source[key] !== "string" || !/^#[0-9a-f]{6}$/i.test(source[key])) {
      invalidTokens.push(path);
      fallbackTokens.push(path);
      return fallback[key];
    }
    return source[key].toLowerCase();
  };
  const contrastValue = Number(source.contrast);
  let contrast = contrastValue;
  if (source.contrast === undefined || source.contrast === "") {
    missingTokens.push(`${mode}.contrast`);
    fallbackTokens.push(`${mode}.contrast`);
    contrast = fallback.contrast;
  } else if (!Number.isFinite(contrastValue) || contrastValue < 0 || contrastValue > 100) {
    invalidTokens.push(`${mode}.contrast`);
    fallbackTokens.push(`${mode}.contrast`);
    contrast = fallback.contrast;
  }
  let uiFont = typeof source.uiFont === "string" ? source.uiFont.trim() : "";
  if (!uiFont) {
    if (source.uiFont === undefined || source.uiFont === "") missingTokens.push(`${mode}.uiFont`);
    else invalidTokens.push(`${mode}.uiFont`);
    fallbackTokens.push(`${mode}.uiFont`);
    uiFont = fallback.uiFont;
  }
  return { accent: readColor("accent"), contrast, ink: readColor("ink"), surface: readColor("surface"), uiFont };
}

export function normalizeHostThemeInput(value: unknown): NormalizedHostTheme {
  const source = object(value);
  const seedDiagnostics = object(source.diagnostics);
  const missingTokens = stringArray(seedDiagnostics.missingTokens);
  const invalidTokens = stringArray(seedDiagnostics.invalidTokens);
  const fallbackTokens = stringArray(seedDiagnostics.fallbackTokens);
  const schemaVersion = source.schemaVersion === undefined ? 1 : Number(source.schemaVersion);
  if (schemaVersion !== 1) {
    invalidTokens.push("schemaVersion");
    fallbackTokens.push("schemaVersion");
  }
  const validSources: HostThemeSource[] = ["codex-config", "codex-css-probe", "web-bootstrap", "fallback"];
  const themeSource = validSources.includes(source.source as HostThemeSource)
    ? source.source as HostThemeSource
    : source.light || source.dark ? "codex-config" : "fallback";
  if (source.source !== undefined && !validSources.includes(source.source as HostThemeSource)) invalidTokens.push("source");
  if (source.source === undefined) missingTokens.push("source");
  const validModes: HostThemeMode[] = ["system", "light", "dark"];
  const theme = validModes.includes(source.theme as HostThemeMode) ? source.theme as HostThemeMode : "system";
  if (!validModes.includes(source.theme as HostThemeMode)) {
    if (source.theme === undefined || source.theme === "") missingTokens.push("theme");
    else invalidTokens.push("theme");
    fallbackTokens.push("theme");
  }
  const capabilities = stringArray(source.capabilities);
  return {
    input: {
      schemaVersion: 1,
      source: themeSource,
      theme,
      light: profile(source.light, "light", missingTokens, invalidTokens, fallbackTokens),
      dark: profile(source.dark, "dark", missingTokens, invalidTokens, fallbackTokens),
      capabilities: capabilities.length ? unique(capabilities) : [...betterCodexDefaultHostTheme.capabilities],
    },
    missingTokens: unique(missingTokens),
    invalidTokens: unique(invalidTokens),
    fallbackTokens: unique(fallbackTokens),
  };
}
