import type { SemanticKindV2 } from "../../../codex-input-document.js";

export function createSemanticController(input: { request: (path: string) => Promise<unknown>; endpoint: () => string }) {
  let generation = 0;
  return {
    async search(query: string, kinds: SemanticKindV2[] = []) {
      const current = ++generation;
      const path = `${input.endpoint()}?schema_version=2&query=${encodeURIComponent(query)}${kinds.length ? `&kinds=${encodeURIComponent(kinds.join(","))}` : ""}`;
      const result = await input.request(path) as Record<string, unknown>;
      if (current !== generation) throw new Error("semantic_search_cancelled");
      return result;
    },
    cancel() {
      generation += 1;
    },
  };
}
