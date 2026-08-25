import type { BetterCodexUiHostAdapter } from "./contract.js";

export function createInjectedHostAdapter(capabilities: unknown): BetterCodexUiHostAdapter {
  return { kind: "codex", remote: false, relay: false, capabilities: capabilities && typeof capabilities === "object" ? capabilities as Record<string, unknown> : {} };
}
