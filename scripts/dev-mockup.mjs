import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const pluginPath = join(mkdtempSync(join(tmpdir(), "better-codex-mockup-plugin-")), "better-codex-mockup");
mkdirSync(pluginPath);
const descriptor = JSON.parse(readFileSync(join(root, "plugins/better-codex-mockup/plugin.json"), "utf8"));
writeFileSync(join(pluginPath, "plugin.json"), `${JSON.stringify(descriptor, null, 2)}\n`);
writeFileSync(join(pluginPath, "mcp.json"), `${JSON.stringify({
  $schema: "https://agent-plugins.org/schemas/1.0.0/mcp.schema.json",
  mcpServers: { "better-codex-mockup": { type: "stdio", command: process.execPath, args: ["--import", join(root, "node_modules/tsx/dist/loader.mjs"), join(root, "src/cli.ts"), "mcp", "--mockup"] } },
}, null, 2)}\n`);
console.log(JSON.stringify({ mockup: true, plugin: pluginPath, registration_name: "better-codex-mockup", command: [process.execPath, "--import", join(root, "node_modules/tsx/dist/loader.mjs"), join(root, "src/cli.ts"), "mcp", "--mockup"], next: "Import this local development plugin in Codex and open Better Codex Mockup. Each MCP connection owns an isolated temporary simulation service." }, null, 2));
