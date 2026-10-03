import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { build } from "esbuild";

const root = process.cwd();
const outputFile = join(root, "src", "generated", "browser-ui.ts");
const result = await build({
  entryPoints: [join(root, "src", "ui", "browser-entry.ts")],
  bundle: true,
  platform: "browser",
  format: "iife",
  globalName: "BetterCodexUI",
  target: ["chrome120"],
  charset: "utf8",
  legalComments: "none",
  logOverride: { "duplicate-object-key": "error" },
  sourcemap: false,
  write: false,
});
const browserBundle = result.outputFiles[0].text
  .replace(/\r\n?/g, "\n")
  .replace(/^\s*\/\/.*$/gm, "")
  .replace(/\n{3,}/g, "\n\n")
  .trim();
if (!browserBundle.includes("BetterCodexUI") || !browserBundle.includes("install")) throw new Error("browser_ui_bundle_invalid");
const checksum = createHash("sha256").update(browserBundle).digest("hex");
const generated = [
  `export const browserUiBundleSchemaVersion = 1;`,
  `export const browserUiBundleChecksum = ${JSON.stringify(checksum)};`,
  `export const browserUiBundle = ${JSON.stringify(browserBundle)};`,
  "",
].join("\n");

if (process.argv.includes("--check")) {
  const current = existsSync(outputFile) ? readFileSync(outputFile, "utf8").replace(/\r\n?/g, "\n") : "";
  if (current !== generated) throw new Error(`browser_ui_bundle_stale:${JSON.stringify({ platform: process.platform, output_file: outputFile, expected_checksum: checksum })}`);
} else {
  mkdirSync(dirname(outputFile), { recursive: true });
  writeFileSync(outputFile, generated);
  // TypeScript does not prune deleted sources. Remove only retired build outputs
  // so an incremental build cannot package the former injection hosts.
  for (const retired of [
    "dom.js", "injection-state.js", "mcp-board-resource.js",
    "generated/injected-ui.js", "generated/mcp-app-ui.js",
    "ui/injected-entry.js", "ui/hosts/injected.js",
    "ui/hosts/injected-mount.js", "ui/hosts/mcp-app-entry.js",
  ]) rmSync(join(root, "dist", retired), { force: true });
}
