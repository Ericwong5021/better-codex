import { existsSync, mkdirSync, readFileSync, readdirSync, unlinkSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import type { AgentProfile } from "./db.js";

const codexHome = process.env.CODEX_HOME || join(homedir(), ".codex");
const configPath = join(codexHome, "config.toml");
const profilesPath = join(codexHome, "agents", "better-codex");

function topLevelString(source: string, key: string) {
  for (const line of source.split("\n")) {
    if (/^\s*\[/.test(line)) break;
    const match = line.match(new RegExp(`^\\s*${key}\\s*=\\s*("(?:\\\\.|[^"\\\\])*"|'[^']*'|[^#\\s]+)`));
    if (!match) continue;
    const value = match[1];
    if (value.startsWith('"')) {
      try { return JSON.parse(value) as string; } catch { return value.slice(1, -1); }
    }
    if (value.startsWith("'")) return value.slice(1, -1);
    return value;
  }
  return "";
}

function withTopLevelString(source: string, key: string, value: string) {
  const assignment = `${key} = ${JSON.stringify(value)}`;
  const lines = source.split("\n");
  const sectionIndex = lines.findIndex(line => /^\s*\[/.test(line));
  const limit = sectionIndex < 0 ? lines.length : sectionIndex;
  for (let index = 0; index < limit; index += 1) {
    if (new RegExp(`^\\s*${key}\\s*=`).test(lines[index])) {
      lines[index] = assignment;
      return lines.join("\n");
    }
  }
  lines.splice(limit, 0, assignment);
  return lines.join("\n");
}

export function defaultAgentProfile(path = configPath) {
  const source = existsSync(path) ? readFileSync(path, "utf8") : "";
  return {
    id: "",
    role: "codex",
    name: "Codex",
    description: "默认智能体，直接读取 config.toml",
    instructions: "使用 Codex 默认配置承接并执行 Better Codex Issue。",
    model: topLevelString(source, "model") || "默认模型",
    reasoning_effort: topLevelString(source, "model_reasoning_effort") || "默认推理等级",
    version: 1,
    created_at: "",
    updated_at: "",
    is_default: true,
  };
}

export function updateDefaultAgentProfile(input: { model: string; reasoning_effort: string }, path = configPath) {
  const source = existsSync(path) ? readFileSync(path, "utf8") : "";
  const next = withTopLevelString(withTopLevelString(source, "model", input.model), "model_reasoning_effort", input.reasoning_effort);
  mkdirSync(dirname(path), { recursive: true });
  if (next !== source) writeFileSync(path, next, { mode: 0o600 });
  return defaultAgentProfile(path);
}

export function agentConfigProfileName(id: string) {
  return `better-codex-${id}`;
}

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
    const configuration = [
      `model = ${quoted(profile.model)}`,
      `model_reasoning_effort = ${quoted(profile.reasoning_effort)}`,
      `developer_instructions = ${quoted(profile.instructions)}`,
      "",
    ].join("\n");
    writeFileSync(join(profilesPath, file), configuration, { mode: 0o600 });
    writeFileSync(join(codexHome, `${agentConfigProfileName(profile.id)}.config.toml`), configuration, { mode: 0o600 });
  }
  for (const file of readdirSync(profilesPath)) {
    if (/^[a-f0-9-]{36}\.toml$/i.test(file) && !activeFiles.has(file)) unlinkSync(join(profilesPath, file));
  }
  const activeConfigProfiles = new Set(profiles.map(profile => `${agentConfigProfileName(profile.id)}.config.toml`));
  for (const file of readdirSync(codexHome)) {
    if (/^better-codex-[a-f0-9-]{36}\.config\.toml$/i.test(file) && !activeConfigProfiles.has(file)) unlinkSync(join(codexHome, file));
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
