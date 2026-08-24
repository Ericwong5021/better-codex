export const sessionNativeCommands = [
  "approve",
  "fast",
  "feedback",
  "fork",
  "goal",
  "init",
  "mcp",
  "memories",
  "model",
  "personality",
  "plan",
  "project",
  "reasoning",
] as const;

export const desktopNativeCommands = [
  "cloud",
  "cloud-environment",
  "ide-context",
  "local",
  "pet",
  "side",
  "task",
  "worktree",
] as const;

export const nativeCommands = [...sessionNativeCommands, ...desktopNativeCommands] as const;

export type SessionNativeCommand = typeof sessionNativeCommands[number];
export type DesktopNativeCommand = typeof desktopNativeCommands[number];
export type NativeCommand = typeof nativeCommands[number];

export function sessionNativeCommand(value: unknown): SessionNativeCommand | null {
  return typeof value === "string" && sessionNativeCommands.includes(value as SessionNativeCommand) ? value as SessionNativeCommand : null;
}

export function desktopNativeCommand(value: unknown): DesktopNativeCommand | null {
  return typeof value === "string" && desktopNativeCommands.includes(value as DesktopNativeCommand) ? value as DesktopNativeCommand : null;
}
