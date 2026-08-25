export function semanticCandidateIcon(kind: string) {
  if (kind === "skill") return "wrench";
  if (kind === "file") return "docs";
  if (kind === "directory") return "folder";
  if (kind.startsWith("mcp_")) return "server";
  if (kind === "plugin" || kind === "app" || kind === "desktop_app") return "sparkles";
  if (kind === "builtin_browser") return "external";
  if (kind === "builtin_computer") return "terminal";
  return "terminal";
}

export function semanticCandidateGroup(kind: string) {
  if (["builtin_browser", "builtin_computer", "desktop_app"].includes(kind)) return "Capabilities";
  if (kind === "skill") return "Skills";
  if (kind === "plugin") return "Plugins";
  if (kind === "app") return "Apps";
  if (kind.startsWith("mcp_")) return "MCP";
  return "Files";
}
