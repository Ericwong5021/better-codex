import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

export type BetterCodexLocale = "zh-CN" | "en";

export function codexComputerUseConfigPath() {
  const codexHome = process.env.CODEX_HOME || join(homedir(), ".codex");
  return join(codexHome, "computer-use", "config.json");
}

export function normalizeCodexLocale(value: unknown): BetterCodexLocale {
  const locale = String(value ?? "").trim().toLowerCase().replace(/_/g, "-");
  return ["zh-cn", "zh-hans", "zh-hans-cn"].includes(locale) ? "zh-CN" : "en";
}

export function readCodexLocale(configPath = codexComputerUseConfigPath()): BetterCodexLocale {
  try {
    const parsed = JSON.parse(readFileSync(configPath, "utf8")) as { locale?: unknown };
    return normalizeCodexLocale(parsed?.locale);
  } catch {
    return "en";
  }
}
