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
