import { randomUUID } from "node:crypto";
import { mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { betterCodexHome } from "./config.js";

export const mcpReportingPath = join(betterCodexHome, "mcp-reporting.json");

export function readMcpReportingSetting(path = mcpReportingPath): boolean {
  try {
    const value = JSON.parse(readFileSync(path, "utf8"));
    return value.schema_version === 1 && value.enabled === true;
  } catch { return false; }
}

export function mcpReportingEnabled(path = mcpReportingPath, environment = process.env): boolean {
  const override = environment.BETTER_CODEX_MCP_ALLOW_REPORTS;
  return override === undefined ? readMcpReportingSetting(path) : override === "1";
}

export function writeMcpReportingSetting(enabled: boolean, path = mcpReportingPath) {
  mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  const temporary = `${path}.${randomUUID()}.tmp`;
  try {
    writeFileSync(temporary, JSON.stringify({ schema_version: 1, enabled }, null, 2) + "\n", { mode: 0o600, flag: "wx" });
    renameSync(temporary, path);
  } finally { rmSync(temporary, { force: true }); }
  return { path, configured: enabled, enabled: mcpReportingEnabled(path), restartRequired: true };
}

export function mcpReportingEnvironment(): Record<string, string> {
  return mcpReportingEnabled() ? { BETTER_CODEX_MCP_ALLOW_REPORTS: "1" } : {};
}
