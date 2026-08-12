import { spawn } from "node:child_process";
import { coreVersion } from "./compatibility.js";
import { codexExecutablePath } from "./codex-cli.js";

export type CodexUsageWindow = {
  usedPercent: number;
  remainingPercent: number;
  windowDurationMins: number;
  resetsAt: number;
};

export type CodexUsage = {
  planType: string;
  primary: CodexUsageWindow | null;
  secondary: CodexUsageWindow | null;
};

function finiteNumber(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function normalizeWindow(value: unknown): CodexUsageWindow | null {
  if (!value || typeof value !== "object") return null;
  const source = value as Record<string, unknown>;
  const usedPercent = finiteNumber(source.usedPercent);
  const windowDurationMins = finiteNumber(source.windowDurationMins);
  const resetsAt = finiteNumber(source.resetsAt);
  if (usedPercent === null || windowDurationMins === null || resetsAt === null || windowDurationMins <= 0 || resetsAt <= 0) return null;
  const used = Math.min(100, Math.max(0, Math.round(usedPercent)));
  return {
    usedPercent: used,
    remainingPercent: 100 - used,
    windowDurationMins: Math.round(windowDurationMins),
    resetsAt: Math.round(resetsAt),
  };
}

export function normalizeCodexUsage(value: unknown): CodexUsage | null {
  if (!value || typeof value !== "object") return null;
  const result = value as Record<string, unknown>;
  const rateLimits = result.rateLimits;
  if (!rateLimits || typeof rateLimits !== "object") return null;
  const source = rateLimits as Record<string, unknown>;
  const primary = normalizeWindow(source.primary);
  const secondary = normalizeWindow(source.secondary);
  if (!primary && !secondary) return null;
  return {
    planType: typeof source.planType === "string" ? source.planType.trim().slice(0, 40) : "",
    primary,
    secondary,
  };
}

function queryCodexUsage(executable: string) {
  return new Promise<CodexUsage>((resolve, reject) => {
    const maxOutputBytes = 1_048_576;
    const maxLineBytes = 262_144;
    const child = spawn(executable, ["app-server"], { stdio: ["pipe", "pipe", "ignore"], windowsHide: true });
    let output = "";
    let outputBytes = 0;
    let settled = false;
    const finish = (error?: Error, usage?: CodexUsage) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      child.stdout.removeAllListeners("data");
      child.stdout.destroy();
      child.stdin.destroy();
      child.kill();
      if (error) reject(error);
      else if (usage) resolve(usage);
      else reject(new Error("codex_usage_empty"));
    };
    const timer = setTimeout(() => finish(new Error("codex_usage_timeout")), 5000);
    child.on("error", error => finish(error));
    child.stdout.on("data", chunk => {
      if (settled) return;
      outputBytes += Buffer.byteLength(chunk);
      if (outputBytes > maxOutputBytes) return finish(new Error("codex_usage_output_too_large"));
      output += String(chunk);
      if (Buffer.byteLength(output) > maxLineBytes) return finish(new Error("codex_usage_line_too_large"));
      const lines = output.split(/\r?\n/);
      output = lines.pop() || "";
      for (const line of lines) {
        try {
          const message = JSON.parse(line) as { id?: number; result?: unknown; error?: unknown };
          if (message.id !== 2) continue;
          if (message.error) return finish(new Error("codex_usage_request_failed"));
          const usage = normalizeCodexUsage(message.result);
          return usage ? finish(undefined, usage) : finish(new Error("codex_usage_empty"));
        } catch { /* app-server can emit non-protocol diagnostics */ }
      }
    });
    child.stdin.write(JSON.stringify({ id: 1, method: "initialize", params: { clientInfo: { name: "better-codex", title: "Better Codex", version: coreVersion }, capabilities: { experimentalApi: true } } }) + "\n");
    child.stdin.write(JSON.stringify({ method: "initialized", params: {} }) + "\n");
    child.stdin.write(JSON.stringify({ id: 2, method: "account/rateLimits/read", params: {} }) + "\n");
  });
}

let cachedUsage: { expiresAt: number; value: CodexUsage | null } | null = null;
let usageRefresh: Promise<void> | null = null;

function refreshCodexUsage() {
  if (usageRefresh) return usageRefresh;
  const refresh = (async () => {
    try {
      cachedUsage = { expiresAt: Date.now() + 60_000, value: await queryCodexUsage(codexExecutablePath()) };
    } catch {
      cachedUsage = { expiresAt: Date.now() + 15_000, value: null };
    }
  })().finally(() => {
    if (usageRefresh === refresh) usageRefresh = null;
  });
  usageRefresh = refresh;
  return refresh;
}

export async function readCodexUsage() {
  if (!cachedUsage || cachedUsage.expiresAt <= Date.now()) await refreshCodexUsage();
  return cachedUsage?.value ?? null;
}
