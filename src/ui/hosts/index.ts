import type { BetterCodexUiHostAdapter, BetterCodexUiHostKind } from "./contract.js";
import { createWebHostAdapter } from "./web.js";

export function createHostAdapter(kind: BetterCodexUiHostKind, host: unknown, relay: boolean): BetterCodexUiHostAdapter {
  if (kind !== "web") throw new Error("browser_ui_host_invalid");
  return createWebHostAdapter(host, relay);
}
