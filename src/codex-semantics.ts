import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { realpathSync } from "node:fs";
import { isAbsolute, relative, resolve } from "node:path";
import { coreVersion } from "./compatibility.js";
import { codexExecutablePath } from "./codex-cli.js";

export type CodexSemanticReference = {
  type: "skill" | "mention";
  name: string;
  path: string;
};

export type CodexSemanticSelection = {
  type: "skill" | "app" | "mention";
  name: string;
  ref: string;
};

export type CodexSemanticInput = { type: "text"; text: string } | CodexSemanticReference;

export type CodexSkill = {
  name: string;
  description: string;
  path: string;
  ref: string;
  scope: string;
};

export type CodexFileMention = {
  name: string;
  displayPath: string;
  path: string;
  ref: string;
  kind: "file" | "directory";
};

export type CodexApp = {
  id: string;
  name: string;
  ref: string;
  enabled: boolean;
  callable: boolean;
};

function object(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function requestCodex(method: string, params: Record<string, unknown>, timeoutMs = 8000) {
  return new Promise<unknown>((resolveRequest, reject) => {
    const child = spawn(codexExecutablePath(), ["app-server"], { stdio: ["pipe", "pipe", "pipe"], windowsHide: true });
    let output = "";
    let outputBytes = 0;
    let errorOutput = "";
    let settled = false;
    const finish = (error?: Error, result?: unknown) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      child.stdout.removeAllListeners("data");
      child.stdout.destroy();
      child.stdin.destroy();
      child.kill();
      if (error) reject(error);
      else resolveRequest(result);
    };
    const timer = setTimeout(() => finish(new Error("codex_semantics_timeout")), timeoutMs);
    child.on("error", error => finish(error));
    child.on("close", code => finish(new Error(errorOutput.trim().slice(0, 1000) || `codex_semantics_closed:${code ?? "unknown"}`)));
    child.stderr.on("data", chunk => {
      if (Buffer.byteLength(errorOutput) < 65_536) errorOutput += String(chunk);
    });
    child.stdout.on("data", chunk => {
      if (settled) return;
      outputBytes += Buffer.byteLength(chunk);
      if (outputBytes > 2_097_152) return finish(new Error("codex_semantics_output_too_large"));
      output += String(chunk);
      const lines = output.split(/\r?\n/);
      output = lines.pop() || "";
      for (const line of lines) {
        try {
          const message = JSON.parse(line) as { id?: number; result?: unknown; error?: unknown };
          if (message.id !== 2) continue;
          if (message.error) {
            const detail = object(message.error);
            return finish(new Error(String(detail.message || detail.code || "codex_semantics_request_failed").slice(0, 1000)));
          }
          return finish(undefined, message.result);
        } catch {}
      }
    });
    child.stdin.write(JSON.stringify({ id: 1, method: "initialize", params: { clientInfo: { name: "better-codex", title: "Better Codex", version: coreVersion }, capabilities: { experimentalApi: true } } }) + "\n");
    child.stdin.write(JSON.stringify({ method: "initialized", params: {} }) + "\n");
    child.stdin.write(JSON.stringify({ id: 2, method, params }) + "\n");
  });
}

function semanticReferenceId(type: "skill" | "mention" | "app", value: string) {
  return createHash("sha256").update(type).update("\0").update(value).digest("base64url").slice(0, 24);
}

export function normalizeCodexSemanticSelections(value: unknown): CodexSemanticSelection[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  return value.slice(0, 32).flatMap((item): CodexSemanticSelection[] => {
    const source = object(item);
    const type = source.type === "skill" || source.type === "app" || source.type === "mention" ? source.type : null;
    const name = String(source.name || "").trim().slice(0, 500);
    const ref = String(source.ref || "").trim().slice(0, 4096);
    const key = `${type}\0${name}\0${ref}`;
    if (!type || !name || !ref || seen.has(key)) return [];
    seen.add(key);
    return [{ type, name, ref }];
  });
}

export function normalizeCodexSemanticReferences(value: unknown): CodexSemanticReference[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  return value.slice(0, 32).flatMap((item): CodexSemanticReference[] => {
    const source = object(item);
    const type = source.type === "skill" || source.type === "mention" ? source.type : null;
    const name = String(source.name || "").trim().slice(0, 500);
    const path = String(source.path || "").trim().slice(0, 4096);
    const key = `${type}\0${name}\0${path}`;
    if (!type || !name || !path || seen.has(key)) return [];
    seen.add(key);
    return [{ type, name, path }];
  });
}

export function codexSemanticInput(message: string, references: unknown): CodexSemanticInput[] {
  return [{ type: "text", text: message }, ...normalizeCodexSemanticReferences(references)];
}

export function normalizeCodexSemanticInput(value: unknown, fallbackMessage: string): CodexSemanticInput[] {
  if (!Array.isArray(value)) return [{ type: "text", text: fallbackMessage }];
  const input = value.slice(0, 33).flatMap((item): CodexSemanticInput[] => {
    const source = object(item);
    if (source.type === "text") return [{ type: "text", text: String(source.text || "").slice(0, 100000) }];
    return normalizeCodexSemanticReferences([source]);
  });
  return input.some(item => item.type === "text") ? input : [{ type: "text", text: fallbackMessage }, ...input];
}

export function codexSemanticRequestFingerprint(message: string, references: unknown, command: unknown) {
  return JSON.stringify({ message, references: normalizeCodexSemanticReferences(references), command: String(command || "") });
}

function normalizeSkills(value: unknown): CodexSkill[] {
  const data = Array.isArray(object(value).data) ? object(value).data as unknown[] : [];
  const errors = data.flatMap(entry => Array.isArray(object(entry).errors) ? object(entry).errors as unknown[] : []);
  if (errors.length) {
    const first = object(errors[0]);
    throw new Error(String(first.message || first.error || errors[0] || "codex_skills_unavailable").slice(0, 1000));
  }
  return data.flatMap(entry => {
    const skills = Array.isArray(object(entry).skills) ? object(entry).skills as unknown[] : [];
    return skills.flatMap((item): CodexSkill[] => {
      const skill = object(item);
      const name = String(skill.name || "").trim();
      const path = String(skill.path || "").trim();
      if (!name || !path || skill.enabled === false) return [];
      const skillInterface = object(skill.interface);
      return [{
        name,
        path,
        ref: semanticReferenceId("skill", path),
        scope: String(skill.scope || ""),
        description: String(skillInterface.shortDescription || skill.shortDescription || skill.description || "").trim(),
      }];
    });
  }).sort((left, right) => left.name.localeCompare(right.name));
}

const skillCache = new Map<string, { expiresAt: number; value: CodexSkill[] }>();
let appCache: { expiresAt: number; value: CodexApp[] } | null = null;

export async function readCodexSkills(workspacePath: string) {
  const cwd = resolve(workspacePath);
  const cached = skillCache.get(cwd);
  if (cached && cached.expiresAt > Date.now()) return cached.value;
  const value = normalizeSkills(await requestCodex("skills/list", { cwds: [cwd], forceReload: false }));
  skillCache.set(cwd, { expiresAt: Date.now() + 60_000, value });
  return value;
}

export async function readCodexApps() {
  if (appCache && appCache.expiresAt > Date.now()) return appCache.value;
  const result = object(await requestCodex("app/installed", { forceRefresh: false }));
  const apps = (Array.isArray(result.apps) ? result.apps : []).flatMap((item): CodexApp[] => {
    const app = object(item);
    const id = String(app.id || "").trim();
    const name = String(app.runtimeName || "").trim();
    if (!id || !name) return [];
    return [{
      id,
      name,
      ref: semanticReferenceId("app", id),
      enabled: app.enabled === true,
      callable: app.callable === true,
    }];
  }).sort((left, right) => left.name.localeCompare(right.name));
  appCache = { expiresAt: Date.now() + 60_000, value: apps };
  return apps;
}

export async function readCodexSemanticCatalog(workspacePath: string) {
  const [skillsResult, appsResult] = await Promise.allSettled([readCodexSkills(workspacePath), readCodexApps()]);
  return {
    skills: skillsResult.status === "fulfilled" ? skillsResult.value : [],
    apps: appsResult.status === "fulfilled" ? appsResult.value : [],
    errors: [
      ...(skillsResult.status === "rejected" ? [{ source: "skills", message: skillsResult.reason instanceof Error ? skillsResult.reason.message : "codex_skills_unavailable" }] : []),
      ...(appsResult.status === "rejected" ? [{ source: "apps", message: appsResult.reason instanceof Error ? appsResult.reason.message : "codex_apps_unavailable" }] : []),
    ],
  };
}

export async function resolveCodexSemanticReferences(workspacePath: string, value: unknown) {
  const selections = normalizeCodexSemanticSelections(value);
  if (!selections.length) return [];
  const cwd = resolve(workspacePath);
  const skills = selections.some(selection => selection.type === "skill") ? await readCodexSkills(cwd) : [];
  const apps = selections.some(selection => selection.type === "app") ? await readCodexApps() : [];
  return selections.map((selection): CodexSemanticReference => {
    if (selection.type === "skill") {
      const skill = skills.find(item => item.ref === selection.ref && item.name === selection.name);
      if (!skill) throw new Error("semantic_reference_invalid");
      return { type: "skill", name: skill.name, path: skill.path };
    }
    if (selection.type === "app") {
      const app = apps.find(item => item.ref === selection.ref && item.name === selection.name);
      if (!app || !app.enabled || !app.callable) throw new Error("semantic_app_unavailable");
      return { type: "mention", name: app.name, path: `app://${app.id}` };
    }
    if (!selection.ref.startsWith("f_")) throw new Error("semantic_reference_invalid");
    const referencePath = Buffer.from(selection.ref.slice(2), "base64url").toString("utf8");
    const fullPath = resolve(cwd, referencePath);
    const displayPath = relative(cwd, fullPath);
    if (!displayPath || displayPath.startsWith("..") || isAbsolute(displayPath) || displayPath !== referencePath) throw new Error("semantic_reference_invalid");
    try {
      const resolvedFromRoot = relative(realpathSync(cwd), realpathSync(fullPath));
      if (!resolvedFromRoot || resolvedFromRoot.startsWith("..") || isAbsolute(resolvedFromRoot)) throw new Error("semantic_reference_invalid");
    } catch {
      throw new Error("semantic_reference_invalid");
    }
    return { type: "mention", name: selection.name, path: fullPath };
  });
}

export async function searchCodexFiles(workspacePath: string, query: string) {
  const cwd = resolve(workspacePath);
  const result = object(await requestCodex("fuzzyFileSearch", { query: query.slice(0, 500), roots: [cwd] }));
  const files = Array.isArray(result.files) ? result.files : [];
  return files.slice(0, 50).flatMap((item): CodexFileMention[] => {
    const match = object(item);
    const relativePath = String(match.path || "").trim();
    const fullPath = isAbsolute(relativePath) ? relativePath : resolve(cwd, relativePath);
    const displayPath = relative(cwd, fullPath);
    if (!relativePath || displayPath.startsWith("..") || isAbsolute(displayPath)) return [];
    return [{
      name: String(match.file_name || relativePath).trim().slice(0, 500),
      displayPath: displayPath || String(match.file_name || relativePath).trim().slice(0, 500),
      path: fullPath,
      ref: `f_${Buffer.from(displayPath, "utf8").toString("base64url")}`,
      kind: match.match_type === "directory" ? "directory" : "file",
    }];
  });
}
