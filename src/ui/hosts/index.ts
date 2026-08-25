import type { BetterCodexUiHostAdapter, BetterCodexUiHostKind } from "./contract.js";
import { createInjectedHostAdapter } from "./injected.js";
import { createWebHostAdapter } from "./web.js";

export function createHostAdapter(kind: BetterCodexUiHostKind, host: unknown, relay: boolean): BetterCodexUiHostAdapter {
  if (kind === "web") return createWebHostAdapter(host, relay);
  const source = host && typeof host === "object" ? host as { capabilities?: unknown } : {};
  return createInjectedHostAdapter(source.capabilities);
}
