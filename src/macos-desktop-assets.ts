import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

// Replaced with embedded, platform-specific bytes by the release packager.
export function macMenuBarExecutable(): Buffer {
  return readFileSync(fileURLToPath(new URL("../build/macos/better-codex-menubar", import.meta.url)));
}

export function macMenuBarIcon(): Buffer {
  return readFileSync(fileURLToPath(new URL("../assets/menubar-template.png", import.meta.url)));
}
