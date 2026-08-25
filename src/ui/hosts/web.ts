import type { BetterCodexUiHostAdapter } from "./contract.js";

export function createWebHostAdapter(host: unknown, relay: boolean): BetterCodexUiHostAdapter {
  const source = host && typeof host === "object" ? host as { kind?: unknown; capabilities?: unknown } : {};
  return { kind: "web", remote: source.kind === "remote" || relay, relay, capabilities: source.capabilities && typeof source.capabilities === "object" ? source.capabilities as Record<string, unknown> : {} };
}
