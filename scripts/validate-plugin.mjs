import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { basename, resolve } from "node:path";
import { Validator } from "@cfworker/json-schema";

// Validate against the public, unchanged Agent Plugins 1.0.0 schemas.
// This is schema validation, not OpenAI's unavailable validate_plugin.py helper.
const root = resolve(process.argv[2] || "plugins/better-codex");
for (const file of ["plugin", "mcp"]) {
  const schema = JSON.parse(readFileSync(new URL(`./schemas/agent-plugins-1.0.0-${file}.schema.json`, import.meta.url), "utf8"));
  const document = JSON.parse(readFileSync(resolve(root, `${file}.json`), "utf8"));
  const result = new Validator(schema, "2020-12", false).validate(document);
  assert.equal(result.valid, true, JSON.stringify(result.errors));
  if (file === "plugin") assert.equal(document.name, basename(root), "plugin directory must match its manifest name");
  if (file === "mcp") {
    assert.equal(document.mcpServers["better-codex"].command, "better-codex", "use the stable installation entrypoint");
    assert.deepEqual(document.mcpServers["better-codex"].args, ["mcp"]);
  }
}
console.log("Portable plugin manifests pass the official Agent Plugins 1.0.0 JSON schemas.");
