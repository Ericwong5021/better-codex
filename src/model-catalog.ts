export type ReasoningEffortOption = {
  value: string;
  description: string;
};

export type ModelServiceTier = {
  id: string;
  name: string;
  description: string;
};

export type ModelCatalogEntry = {
  id: string;
  displayName: string;
  description: string;
  provider: string;
  isDefault: boolean;
  defaultReasoningEffort: string;
  supportedReasoningEfforts: ReasoningEffortOption[];
  serviceTiers: ModelServiceTier[];
};

export function inferModelProvider(modelId: string, displayName = ""): string {
  const normalizedId = String(modelId || "").trim().toLowerCase();
  const normalizedName = String(displayName || "").trim().toLowerCase();
  if (
    normalizedId.startsWith("gpt-") ||
    normalizedId.startsWith("o1") ||
    normalizedId.startsWith("o3") ||
    normalizedId.startsWith("o4") ||
    normalizedId.startsWith("chatgpt") ||
    normalizedName.startsWith("gpt") ||
    normalizedName.startsWith("openai")
  ) {
    return "OpenAI";
  }
  if (normalizedId.startsWith("claude") || normalizedName.startsWith("claude") || normalizedName.includes("anthropic")) {
    return "Anthropic";
  }
  if (normalizedId.startsWith("gemini") || normalizedName.startsWith("gemini") || normalizedName.includes("google")) {
    return "Google";
  }
  if (normalizedId.startsWith("deepseek") || normalizedName.startsWith("deepseek")) {
    return "DeepSeek";
  }
  if (normalizedId.startsWith("qwen") || normalizedName.startsWith("qwen")) {
    return "Qwen";
  }
  if (normalizedId.startsWith("llama") || normalizedId.startsWith("meta-") || normalizedName.startsWith("llama") || normalizedName.startsWith("meta")) {
    return "Meta";
  }
  if (normalizedId.startsWith("mistral") || normalizedId.startsWith("mixtral") || normalizedName.startsWith("mistral")) {
    return "Mistral";
  }
  if (normalizedId.startsWith("grok") || normalizedName.startsWith("grok") || normalizedName.includes("xai")) {
    return "xAI";
  }
  return "Other";
}

export const mockupModelCatalog: ModelCatalogEntry[] = [
  ["gpt-5.6-sol", "GPT-5.6-Sol", "low", ["low", "medium", "high", "xhigh", "max", "ultra"], true],
  ["gpt-5.6-terra", "GPT-5.6-Terra", "medium", ["low", "medium", "high", "xhigh", "max", "ultra"], true],
  ["gpt-5.6-luna", "GPT-5.6-Luna", "medium", ["low", "medium", "high", "xhigh", "max"], true],
  ["gpt-5.5", "GPT-5.5", "medium", ["low", "medium", "high", "xhigh"], true],
  ["gpt-5.4", "GPT-5.4", "medium", ["low", "medium", "high", "xhigh"], true],
  ["gpt-5.4-mini", "GPT-5.4-Mini", "medium", ["low", "medium", "high", "xhigh"], false],
  ["gpt-5.3-codex-spark", "GPT-5.3-Codex-Spark", "high", ["low", "medium", "high", "xhigh"], false],
].map(([id, displayName, defaultReasoningEffort, efforts, fast], index) => ({
  id: id as string,
  displayName: displayName as string,
  description: "",
  provider: inferModelProvider(id as string, displayName as string),
  isDefault: index === 0,
  defaultReasoningEffort: defaultReasoningEffort as string,
  supportedReasoningEfforts: (efforts as string[]).map(value => ({ value, description: "" })),
  serviceTiers: fast ? [{ id: "priority", name: "Fast", description: "1.5x speed, increased usage" }] : [],
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
    const displayName = String(model.displayName || id);
    const provider = String(model.provider || "").trim() || inferModelProvider(id, displayName);
    const efforts = Array.isArray(model.supportedReasoningEfforts) ? model.supportedReasoningEfforts.flatMap((effort): ReasoningEffortOption[] => {
      if (!effort || typeof effort !== "object") return [];
      const source = effort as Record<string, unknown>;
      const value = String(source.reasoningEffort || "").trim();
      return value ? [{ value, description: String(source.description || "") }] : [];
    }) : [];
    const serviceTiers = Array.isArray(model.serviceTiers) ? model.serviceTiers.flatMap((tier): ModelServiceTier[] => {
      if (!tier || typeof tier !== "object") return [];
      const source = tier as Record<string, unknown>;
      const tierId = String(source.id || "").trim();
      return tierId ? [{ id: tierId, name: String(source.name || tierId), description: String(source.description || "") }] : [];
    }) : [];
    const defaultEffort = String(model.defaultReasoningEffort || efforts[0]?.value || "medium");
    return [{
      id,
      displayName,
      description: String(model.description || ""),
      provider,
      isDefault: model.isDefault === true,
      defaultReasoningEffort: defaultEffort,
      supportedReasoningEfforts: efforts.length ? efforts : [{ value: defaultEffort, description: "" }],
      serviceTiers,
    }];
  });
}

export class ModelCatalog {
  private cached: { key: string; expiresAt: number; value: ModelCatalogEntry[] } | null = null;
  private refresh: { key: string; promise: Promise<ModelCatalogEntry[]> } | null = null;
  private lastError: string | null = null;

  constructor(private readonly load: () => Promise<unknown>, private readonly identity: () => string) {}

  status() {
    return { source: "session_host", available: Boolean(this.cached && this.cached.key === this.identity() && this.cached.expiresAt > Date.now()), error: this.lastError };
  }

  async read() {
    const key = this.identity();
    if (this.cached?.key === key && this.cached.expiresAt > Date.now()) return this.cached.value;
    if (this.refresh?.key === key) return this.refresh.promise;
    const promise = this.load().then(result => {
      const loadedKey = this.identity();
      if (!loadedKey || key && loadedKey !== key) throw new Error("model_catalog_host_changed");
      const value = normalizeModelCatalog(result);
      if (!value.length) throw new Error("model_catalog_empty");
      this.cached = { key: loadedKey, expiresAt: Date.now() + 5 * 60_000, value };
      this.lastError = null;
      return value;
    }).catch(error => {
      this.lastError = error instanceof Error ? error.message : String(error);
      console.error(`BETTER_CODEX_DIAGNOSTIC ${JSON.stringify({ timestamp: new Date().toISOString(), scope: "model_catalog", event: "query_failed", host_identity: key, error: this.lastError })}`);
      throw error;
    }).finally(() => {
      if (this.refresh?.promise === promise) this.refresh = null;
    });
    this.refresh = { key, promise };
    return promise;
  }
}
