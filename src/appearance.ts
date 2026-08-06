import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

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
};

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
  };
}

export function readCodexAppearance(path = defaultConfigPath): CodexAppearance {
  const source = existsSync(path) ? readFileSync(path, "utf8") : "";
  const configuredTheme = sectionString(source, "desktop", "appearanceTheme");
  const theme = configuredTheme === "light" || configuredTheme === "dark" ? configuredTheme : "system";
  return {
    theme,
    light: chromeTheme(source, "desktop.appearanceLightChromeTheme", { accent: "#339cff", contrast: 45, ink: "#1a1c1f", surface: "#ffffff" }),
    dark: chromeTheme(source, "desktop.appearanceDarkChromeTheme", { accent: "#007acc", contrast: 50, ink: "#d4d4d4", surface: "#1e1e1e" }),
  };
}
