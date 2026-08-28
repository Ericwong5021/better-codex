import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

function assetsDirectory() {
  return join(dirname(fileURLToPath(import.meta.url)), "..", "assets");
}

function readAsset(name: string) {
  const path = join(assetsDirectory(), name);
  if (!existsSync(path)) throw new Error(`brand_asset_missing:${name}`);
  return readFileSync(path);
}

const agentAvatarIds = new Set(["codex", "reviewer", "frontend", "debugger", "bot", "terminal", "wrench", "code", "test", "docs", "shield", "database", "sparkles"]);

export function appIconIcns() {
  return readAsset("AppIcon.icns");
}

export function appIconIco() {
  return readAsset("AppIcon.ico");
}

export function betterCodexLogoPng() {
  return readAsset("better-codex.png");
}

export function betterCodexWebIconPng(size: 192 | 512) {
  return readAsset(`web/better-codex-icon-${size}.png`);
}

export function agentAvatarPng(id: string) {
  if (!agentAvatarIds.has(id)) throw new Error(`agent_avatar_asset_invalid:${id}`);
  return readAsset(`agent-avatars/${id}.png`);
}

export function agentAvatarPngDataUrl(id: string) {
  return `data:image/png;base64,${agentAvatarPng(id).toString("base64")}`;
}
