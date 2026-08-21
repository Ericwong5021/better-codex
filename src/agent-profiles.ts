import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, unlinkSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import type { AgentProfile, AgentSandboxMode } from "./db.js";

const codexHome = process.env.CODEX_HOME || join(homedir(), ".codex");
const configPath = join(codexHome, "config.toml");
const defaultSandboxMode: AgentSandboxMode = "workspace-write";
const sandboxModes: AgentSandboxMode[] = ["read-only", "workspace-write", "danger-full-access"];

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

function sandboxMode(source: string) {
  const value = topLevelString(source, "sandbox_mode") as AgentSandboxMode;
  return sandboxModes.includes(value) ? value : defaultSandboxMode;
}

export function defaultAgentProfile(path = configPath) {
  const source = existsSync(path) ? readFileSync(path, "utf8") : "";
  return {
    id: "",
    role: "codex",
    name: "Codex",
    description: "",
    instructions: "使用 Codex 默认配置承接并执行 Better Codex Issue。",
    model: topLevelString(source, "model") || "默认模型",
    reasoning_effort: topLevelString(source, "model_reasoning_effort") || "默认推理等级",
    service_tier: ["fast", "priority"].includes(topLevelString(source, "service_tier")) ? "fast" as const : "default" as const,
    sandbox_mode: sandboxMode(source),
    version: 1,
    created_at: "",
    updated_at: "",
    is_default: true,
  };
}

export function updateDefaultAgentProfile(input: { model: string; reasoning_effort: string; service_tier?: "default" | "fast"; sandbox_mode?: AgentSandboxMode }, path = configPath) {
  const source = existsSync(path) ? readFileSync(path, "utf8") : "";
  const next = withTopLevelString(withTopLevelString(withTopLevelString(withTopLevelString(source, "model", input.model), "model_reasoning_effort", input.reasoning_effort), "service_tier", input.service_tier || "default"), "sandbox_mode", input.sandbox_mode || defaultSandboxMode);
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

export function removeManagedAgentProfiles(home = codexHome) {
  const homeConfigPath = join(home, "config.toml");
  const homeProfilesPath = join(home, "agents", "better-codex");
  let configurationFiles = 0;
  if (existsSync(home)) {
    for (const file of readdirSync(home)) {
      if (!/^better-codex-[a-f0-9-]{36}\.config\.toml$/i.test(file)) continue;
      unlinkSync(join(home, file));
      configurationFiles += 1;
    }
  }
  rmSync(homeProfilesPath, { recursive: true, force: true });
  if (existsSync(homeConfigPath)) {
    const source = readFileSync(homeConfigPath, "utf8");
    const base = withoutManagedRoles(source);
    const next = base ? `${base}\n` : "";
    if (next !== source) writeFileSync(homeConfigPath, next, { mode: 0o600 });
  }
  return { removed: true, path: homeProfilesPath, configurationFiles };
}

export function syncAgentProfiles(profiles: AgentProfile[], home = codexHome) {
  const homeConfigPath = join(home, "config.toml");
  const homeProfilesPath = join(home, "agents", "better-codex");
  mkdirSync(homeProfilesPath, { recursive: true });
  const activeFiles = new Set<string>();
  for (const profile of profiles) {
    const file = `${profile.id}.toml`;
    activeFiles.add(file);
    const configuration = [
      `model = ${quoted(profile.model)}`,
      `model_reasoning_effort = ${quoted(profile.reasoning_effort)}`,
      `service_tier = ${quoted(profile.service_tier)}`,
      `sandbox_mode = ${quoted(profile.sandbox_mode)}`,
      profile.instructions ? `developer_instructions = ${quoted(profile.instructions)}` : "",
      "",
    ].filter(Boolean).join("\n") + "\n";
    writeFileSync(join(homeProfilesPath, file), configuration, { mode: 0o600 });
    writeFileSync(join(home, `${agentConfigProfileName(profile.id)}.config.toml`), configuration, { mode: 0o600 });
  }
  for (const file of readdirSync(homeProfilesPath)) {
    if (/^[a-f0-9-]{36}\.toml$/i.test(file) && !activeFiles.has(file)) unlinkSync(join(homeProfilesPath, file));
  }
  const activeConfigProfiles = new Set(profiles.map(profile => `${agentConfigProfileName(profile.id)}.config.toml`));
  for (const file of readdirSync(home)) {
    if (/^better-codex-[a-f0-9-]{36}\.config\.toml$/i.test(file) && !activeConfigProfiles.has(file)) unlinkSync(join(home, file));
  }
  const source = existsSync(homeConfigPath) ? readFileSync(homeConfigPath, "utf8") : "";
  const base = withoutManagedRoles(source);
  const blocks = profiles.map(profile => [
    `[agents.${profile.role}]`,
    `description = ${quoted(`${profile.name}: ${profile.description}`)}`,
    `config_file = ${quoted(`agents/better-codex/${profile.id}.toml`)}`,
  ].join("\n"));
  const next = [base, ...blocks].filter(Boolean).join("\n\n") + "\n";
  if (next !== source) writeFileSync(homeConfigPath, next, { mode: 0o600 });
}
