import { spawn } from "node:child_process";
import { coreVersion } from "./compatibility.js";
import { codexExecutablePath } from "./codex-cli.js";

export type ReasoningEffortOption = {
  value: string;
  description: string;
};

export type ModelCatalogEntry = {
  id: string;
  displayName: string;
  description: string;
  isDefault: boolean;
  defaultReasoningEffort: string;
  supportedReasoningEfforts: ReasoningEffortOption[];
};

const fallbackCatalog: ModelCatalogEntry[] = [
  ["gpt-5.6-sol", "GPT-5.6-Sol", "low", ["low", "medium", "high", "xhigh", "max", "ultra"]],
  ["gpt-5.6-terra", "GPT-5.6-Terra", "medium", ["low", "medium", "high", "xhigh", "max", "ultra"]],
  ["gpt-5.6-luna", "GPT-5.6-Luna", "medium", ["low", "medium", "high", "xhigh", "max"]],
  ["gpt-5.5", "GPT-5.5", "medium", ["low", "medium", "high", "xhigh"]],
  ["gpt-5.4", "GPT-5.4", "medium", ["low", "medium", "high", "xhigh"]],
  ["gpt-5.4-mini", "GPT-5.4-Mini", "medium", ["low", "medium", "high", "xhigh"]],
  ["gpt-5.3-codex-spark", "GPT-5.3-Codex-Spark", "high", ["low", "medium", "high", "xhigh"]],
].map(([id, displayName, defaultReasoningEffort, efforts], index) => ({
  id: id as string,
  displayName: displayName as string,
  description: "",
  isDefault: index === 0,
  defaultReasoningEffort: defaultReasoningEffort as string,
  supportedReasoningEfforts: (efforts as string[]).map(value => ({ value, description: "" })),
}));

export function normalizeModelCatalog(value: unknown): ModelCatalogEntry[] {
  const data = value && typeof value === "object" && Array.isArray((value as { data?: unknown }).data)
    ? (value as { data: unknown[] }).data
    : [];
  return data.flatMap((item): ModelCatalogEntry[] => {
    if (!item || typeof item !== "object") return [];
    const model = item as Record<string, unknown>;
    const id = String(model.model || model.id || "").trim();
    if (!id || model.hidden === true) return [];
    const efforts = Array.isArray(model.supportedReasoningEfforts) ? model.supportedReasoningEfforts.flatMap((effort): ReasoningEffortOption[] => {
      if (!effort || typeof effort !== "object") return [];
      const source = effort as Record<string, unknown>;
      const value = String(source.reasoningEffort || "").trim();
      return value ? [{ value, description: String(source.description || "") }] : [];
    }) : [];
    const defaultEffort = String(model.defaultReasoningEffort || efforts[0]?.value || "medium");
    return [{
      id,
      displayName: String(model.displayName || id),
      description: String(model.description || ""),
      isDefault: model.isDefault === true,
      defaultReasoningEffort: defaultEffort,
      supportedReasoningEfforts: efforts.length ? efforts : [{ value: defaultEffort, description: "" }],
    }];
  });
}

function queryCatalog(executable: string) {
  return new Promise<ModelCatalogEntry[]>((resolve, reject) => {
    const child = spawn(executable, ["app-server"], { stdio: ["pipe", "pipe", "ignore"], windowsHide: true });
    let output = "";
    let settled = false;
    const finish = (error?: Error, catalog?: ModelCatalogEntry[]) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      child.kill();
      if (error) reject(error);
      else resolve(catalog || []);
    };
    const timer = setTimeout(() => finish(new Error("model_catalog_timeout")), 5000);
    child.on("error", error => finish(error));
    child.stdout.on("data", chunk => {
      output += String(chunk);
      const lines = output.split(/\r?\n/);
      output = lines.pop() || "";
      for (const line of lines) {
        try {
          const message = JSON.parse(line) as { id?: number; result?: unknown; error?: unknown };
          if (message.id !== 2) continue;
          if (message.error) return finish(new Error("model_catalog_request_failed"));
          const catalog = normalizeModelCatalog(message.result);
          return catalog.length ? finish(undefined, catalog) : finish(new Error("model_catalog_empty"));
        } catch { /* app-server can emit non-protocol diagnostics */ }
      }
    });
    child.stdin.write(JSON.stringify({ id: 1, method: "initialize", params: { clientInfo: { name: "better-codex", title: "Better Codex", version: coreVersion }, capabilities: { experimentalApi: true } } }) + "\n");
    child.stdin.write(JSON.stringify({ method: "initialized", params: {} }) + "\n");
    child.stdin.write(JSON.stringify({ id: 2, method: "model/list", params: { cursor: null, includeHidden: false, limit: 100 } }) + "\n");
  });
}

let cachedCatalog: { expiresAt: number; value: ModelCatalogEntry[] } | null = null;
let catalogRefresh: Promise<void> | null = null;

function refreshModelCatalog() {
  if (catalogRefresh) return catalogRefresh;
  const candidates = [codexExecutablePath()];
  const refresh = (async () => {
    for (const executable of candidates) {
      try {
        const value = await queryCatalog(executable);
        cachedCatalog = { expiresAt: Date.now() + 5 * 60_000, value };
        return;
      } catch {}
    }
    cachedCatalog = { expiresAt: Date.now() + 30_000, value: fallbackCatalog };
  })().finally(() => {
    if (catalogRefresh === refresh) catalogRefresh = null;
  });
  catalogRefresh = refresh;
  return refresh;
}

export async function readModelCatalog() {
  if (!cachedCatalog || cachedCatalog.expiresAt <= Date.now()) await refreshModelCatalog();
  return cachedCatalog?.value ?? fallbackCatalog;
}
