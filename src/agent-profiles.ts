import { existsSync, mkdirSync, readFileSync, readdirSync, unlinkSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import type { AgentProfile } from "./db.js";

const codexHome = process.env.CODEX_HOME || join(homedir(), ".codex");
const configPath = join(codexHome, "config.toml");
const profilesPath = join(codexHome, "agents", "better-codex");

function quoted(value: string) {
  return JSON.stringify(value);
}

function withoutManagedRoles(source: string) {
  const lines = source.split("\n");
  const output: string[] = [];
  let skipping = false;
  for (const line of lines) {
    if (/^\s*\[agents\.better_codex_[a-f0-9_]+\]\s*$/.test(line)) {
      skipping = true;
      continue;
    }
    if (skipping && /^\s*\[\[?[A-Za-z0-9_".-]/.test(line)) skipping = false;
    if (!skipping) output.push(line);
  }
  return output.join("\n").trimEnd();
}

export function syncAgentProfiles(profiles: AgentProfile[]) {
  mkdirSync(profilesPath, { recursive: true });
  const activeFiles = new Set<string>();
  for (const profile of profiles) {
    const file = `${profile.id}.toml`;
    activeFiles.add(file);
    writeFileSync(join(profilesPath, file), [
      `model = ${quoted(profile.model)}`,
      `model_reasoning_effort = ${quoted(profile.reasoning_effort)}`,
      `developer_instructions = ${quoted(profile.instructions)}`,
      "",
    ].join("\n"), { mode: 0o600 });
  }
  for (const file of readdirSync(profilesPath)) {
    if (/^[a-f0-9-]{36}\.toml$/i.test(file) && !activeFiles.has(file)) unlinkSync(join(profilesPath, file));
  }
  const source = existsSync(configPath) ? readFileSync(configPath, "utf8") : "";
  const base = withoutManagedRoles(source);
  const blocks = profiles.map(profile => [
    `[agents.${profile.role}]`,
    `description = ${quoted(`${profile.name}: ${profile.description}`)}`,
    `config_file = ${quoted(`agents/better-codex/${profile.id}.toml`)}`,
  ].join("\n"));
  const next = [base, ...blocks].filter(Boolean).join("\n\n") + "\n";
  if (next !== source) writeFileSync(configPath, next, { mode: 0o600 });
}
