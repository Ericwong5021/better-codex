export type BetterCodexUiHostKind = "codex" | "web";

export interface BetterCodexUiHostAdapter {
  kind: BetterCodexUiHostKind;
  remote: boolean;
  relay: boolean;
  capabilities: Record<string, unknown>;
}
