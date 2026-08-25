import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { build } from "esbuild";

const root = process.cwd();
const outputFile = join(root, "src", "generated", "injected-ui.ts");
const result = await build({
  entryPoints: [join(root, "src", "ui", "injected-entry.ts")],
  bundle: true,
  platform: "browser",
  format: "iife",
  globalName: "BetterCodexInjected",
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
if (!browserBundle.includes("BetterCodexInjected") || !browserBundle.includes("install")) throw new Error("injected_ui_bundle_invalid");
const checksum = createHash("sha256").update(browserBundle).digest("hex");
const generated = [
  `export const injectedUiBundleSchemaVersion = 1;`,
  `export const injectedUiBundleChecksum = ${JSON.stringify(checksum)};`,
  `export const injectedUiBundle = ${JSON.stringify(browserBundle)};`,
  "",
].join("\n");

if (process.argv.includes("--check")) {
  const current = existsSync(outputFile) ? readFileSync(outputFile, "utf8").replace(/\r\n?/g, "\n") : "";
  if (current !== generated) throw new Error(`injected_ui_bundle_stale:${JSON.stringify({ platform: process.platform, output_file: outputFile, expected_checksum: checksum })}`);
} else {
  mkdirSync(dirname(outputFile), { recursive: true });
  writeFileSync(outputFile, generated);
}
