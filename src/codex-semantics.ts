import { createHash, randomUUID } from "node:crypto";
import { realpathSync, statSync } from "node:fs";
import { isAbsolute, relative, resolve } from "node:path";
import { compileInputDocument, inputDocumentFingerprint, legacyInputDocument, normalizeInputDocument, type CodexUserInput, type InputDocumentV2, type SemanticKindV2, type SemanticReferenceV2 } from "./codex-input-document.js";
import type { SessionHostSemanticMethod, SessionHostSemanticResponse } from "./session-host-protocol.js";

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

export type CodexSemanticInput = CodexUserInput;

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

export type MentionCandidateV2 = {
  handle: string;
  kind: SemanticKindV2;
  label: string;
  detail: string;
  source: string;
  availability: "available" | "disabled" | "auth_required" | "unavailable" | "unverified";
  addressability: "direct" | "via_parent" | "informational" | "unverified";
  parent_handle?: string;
  display_path?: string;
};

export type DraftInputDocumentV2 = {
  schema_version: 2;
  parts: Array<{ type: "text"; text: string } | { type: "reference"; handle: string; display: string }>;
};

type CandidateRecord = {
  expiresAt: number;
  runtimeInstanceId: string;
  workspaceId: string;
  workspacePath: string;
  audience: string;
  identity: SessionHostSemanticResponse["identity"];
  candidate: MentionCandidateV2;
  reference: Omit<SemanticReferenceV2, "id" | "display">;
};

const directoryMentionVersions = new Set(["0.149.1", "0.149.0-alpha.4.1"]);

function object(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function semanticDiagnostic(event: string, detail: Record<string, unknown>) {
  console.error(`BETTER_CODEX_DIAGNOSTIC ${JSON.stringify({ timestamp: new Date().toISOString(), scope: "mention_catalog", event, ...detail })}`);
}

function providerErrorCode(value: unknown) {
  const message = value instanceof Error ? value.message : String(value || "");
  const status = message.match(/Request failed with status (\d{3})\b/i)?.[1];
  if (status) return `UPSTREAM_HTTP_${status}`;
  return /^[A-Za-z0-9_:-]{1,200}$/.test(message) ? message : "DISCOVERY_PROVIDER_FAILED";
}

export type CodexSemanticRequester = (method: SessionHostSemanticMethod, params: Record<string, unknown>, timeout?: number) => Promise<{ result: unknown; identity: SessionHostSemanticResponse["identity"] }>;

function candidateMatches(candidate: MentionCandidateV2, query: string, kinds: Set<SemanticKindV2>) {
  if (kinds.size && !kinds.has(candidate.kind)) return false;
  const needle = query.trim().toLocaleLowerCase();
  return !needle || `${candidate.label}\n${candidate.detail}\n${candidate.source}`.toLocaleLowerCase().includes(needle);
}

function pluginRows(value: unknown) {
  const marketplaces = Array.isArray(object(value).marketplaces) ? object(value).marketplaces as unknown[] : [];
  return marketplaces.flatMap(marketplace => {
    const source = object(marketplace);
    const marketplaceName = String(source.name || "Plugin").trim();
    const plugins = Array.isArray(source.plugins) ? source.plugins : [];
    return plugins.flatMap(item => {
      const plugin = object(item);
      const id = String(plugin.id || "").trim();
      const name = String(object(plugin.interface).displayName || plugin.name || "").trim();
      if (!id || !name) return [];
      return [{ id, name, marketplaceName, enabled: plugin.enabled === true, installed: plugin.installed === true, availability: String(plugin.availability || ""), detail: String(object(plugin.interface).shortDescription || "").trim() }];
    });
  });
}

function mcpRows(value: unknown) {
  const data = Array.isArray(object(value).data) ? object(value).data as unknown[] : [];
  return data.flatMap(item => {
    const server = object(item);
    const name = String(server.name || "").trim();
    if (!name) return [];
    const resources = (Array.isArray(server.resources) ? server.resources : []).flatMap(resource => {
      const item = object(resource);
      const label = String(item.name || item.title || "").trim();
      return label ? [label] : [];
    });
    return [{ name, authStatus: String(server.authStatus || ""), tools: Object.keys(object(server.tools)), resources }];
  });
}

export class MentionCatalogService {
  private readonly handles = new Map<string, CandidateRecord>();

  constructor(private readonly runtimeInstanceId: string, private readonly request: CodexSemanticRequester) {}

  async catalog(input: { workspaceId: string; workspacePath: string; audience: string; query?: string; kinds?: SemanticKindV2[]; threadId?: string }) {
    this.prune();
    const workspacePath = realpathSync(resolve(input.workspacePath));
    const query = String(input.query || "").slice(0, 500);
    const kinds = new Set(input.kinds || []);
    const providers: Array<{ source: string; run: () => Promise<{ identity: SessionHostSemanticResponse["identity"]; rows: Array<{ candidate: Omit<MentionCandidateV2, "handle">; reference: CandidateRecord["reference"] }> }> }> = [
      { source: "skills", run: async () => {
        const response = await this.request("skills/list", { cwds: [workspacePath], forceReload: false });
        return { identity: response.identity, rows: normalizeSkills(response.result).map(skill => ({ candidate: { kind: "skill", label: skill.name, detail: skill.description || skill.scope, source: "Skill", availability: "available", addressability: "direct" }, reference: { kind: "skill", addressability: "direct", locator: { type: "skill", name: skill.name, path: skill.path }, provenance: { discovery_source: "skills/list", host_instance_id: response.identity.host_instance_id, app_server_version: response.identity.app_server_version, catalog_generation: response.identity.catalog_generation } } })) };
      } },
      { source: "apps", run: async () => {
        const response = await this.request("app/installed", { forceRefresh: false });
        const result = object(response.result);
        const apps = (Array.isArray(result.apps) ? result.apps : []).flatMap(item => {
          const app = object(item);
          const id = String(app.id || "").trim();
          const name = String(app.runtimeName || "").trim();
          if (!id || !name) return [];
          const available = app.enabled === true && app.callable === true;
          return [{ candidate: { kind: "app" as const, label: name, detail: available ? "Codex App" : "Codex App unavailable", source: "App", availability: available ? "available" as const : app.enabled === false ? "disabled" as const : "unavailable" as const, addressability: available ? "direct" as const : "unverified" as const }, reference: { kind: "app" as const, addressability: available ? "direct" as const : "unverified" as const, locator: { type: "mention", name, path: `app://${id}` }, provenance: { discovery_source: "app/installed", host_instance_id: response.identity.host_instance_id, app_server_version: response.identity.app_server_version, catalog_generation: response.identity.catalog_generation } } }];
        });
        return { identity: response.identity, rows: apps };
      } },
      { source: "app_metadata", run: async () => {
        const response = await this.request("app/list", {});
        return { identity: response.identity, rows: [] };
      } },
      { source: "plugins", run: async () => {
        const response = await this.request("plugin/installed", {});
        return { identity: response.identity, rows: pluginRows(response.result).map(plugin => ({ candidate: { kind: "plugin", label: plugin.name, detail: plugin.detail || plugin.marketplaceName, source: `Plugin · ${plugin.marketplaceName}`, availability: plugin.installed && plugin.enabled ? "unverified" : plugin.enabled ? "unavailable" : "disabled", addressability: "unverified" }, reference: { kind: "plugin", addressability: "unverified", locator: { type: "mention", name: plugin.name, path: `plugin://${plugin.id}` }, provenance: { discovery_source: "plugin/installed", host_instance_id: response.identity.host_instance_id, app_server_version: response.identity.app_server_version, catalog_generation: response.identity.catalog_generation } } })) };
      } },
      { source: "files", run: async () => {
        const response = await this.request("fuzzyFileSearch", { query, roots: [workspacePath] });
        const result = object(response.result);
        const files = Array.isArray(result.files) ? result.files : [];
        return { identity: response.identity, rows: files.slice(0, 50).flatMap(item => {
          const match = object(item);
          const reportedPath = String(match.path || "").trim();
          if (!reportedPath) return [];
          const fullPath = realpathSync(isAbsolute(reportedPath) ? reportedPath : resolve(workspacePath, reportedPath));
          const displayPath = relative(workspacePath, fullPath);
          if (!displayPath || displayPath.startsWith("..") || isAbsolute(displayPath)) throw new Error("REFERENCE_OUTSIDE_WORKSPACE");
          const directory = statSync(fullPath).isDirectory();
          const directoryVerified = directory && directoryMentionVersions.has(response.identity.app_server_version);
          const name = String(match.file_name || displayPath).trim().slice(0, 500);
          return [{ candidate: { kind: directory ? "directory" as const : "file" as const, label: name, detail: displayPath, display_path: displayPath, source: directory ? "Directory" : "File", availability: !directory || directoryVerified ? "available" as const : "unverified" as const, addressability: !directory || directoryVerified ? "direct" as const : "unverified" as const }, reference: { kind: directory ? "directory" as const : "file" as const, addressability: !directory || directoryVerified ? "direct" as const : "unverified" as const, locator: { type: "mention", name, path: fullPath }, workspace_binding: { workspace_id: input.workspaceId, relative_path: displayPath, expected_kind: directory ? "directory" as const : "file" as const }, provenance: { discovery_source: "fuzzyFileSearch", host_instance_id: response.identity.host_instance_id, app_server_version: response.identity.app_server_version, catalog_generation: response.identity.catalog_generation }, ...(directoryVerified ? { mapping: { id: "codex-mention-absolute-directory", verified_version: response.identity.app_server_version } } : {}) } }];
        }) };
      } },
    ];
    if (input.threadId) providers.push({ source: "mcp", run: async () => {
      const response = await this.request("mcpServerStatus/list", { threadId: input.threadId, cursor: null, limit: 100, detail: "toolsAndAuthOnly" });
      const rows = mcpRows(response.result).flatMap(server => {
        const authRequired = server.authStatus && !["authenticated", "notRequired"].includes(server.authStatus);
        const base = { candidate: { kind: "mcp_server" as const, label: server.name, detail: `${server.tools.length} tools · ${server.resources.length} resources`, source: "MCP", availability: authRequired ? "auth_required" as const : "unverified" as const, addressability: "informational" as const }, reference: { kind: "mcp_server" as const, addressability: "informational" as const, locator: { parent: server.name }, provenance: { discovery_source: "mcpServerStatus/list", host_instance_id: response.identity.host_instance_id, app_server_version: response.identity.app_server_version, catalog_generation: response.identity.catalog_generation } } };
        const details = query.length < 2 ? [] : [
          ...server.tools.filter(tool => tool.toLocaleLowerCase().includes(query.toLocaleLowerCase())).slice(0, 50).map(tool => ({ candidate: { kind: "mcp_tool" as const, label: tool, detail: `通过 ${server.name} 使用`, source: `MCP · ${server.name}`, availability: "unverified" as const, addressability: "informational" as const }, reference: { kind: "mcp_tool" as const, addressability: "informational" as const, locator: { parent: server.name, tool }, provenance: { discovery_source: "mcpServerStatus/list", host_instance_id: response.identity.host_instance_id, app_server_version: response.identity.app_server_version, catalog_generation: response.identity.catalog_generation } } })),
          ...server.resources.filter(resource => resource.toLocaleLowerCase().includes(query.toLocaleLowerCase())).slice(0, 50).map(resource => ({ candidate: { kind: "mcp_resource" as const, label: resource, detail: `来自 ${server.name}`, source: `MCP · ${server.name}`, availability: "unverified" as const, addressability: "informational" as const }, reference: { kind: "mcp_resource" as const, addressability: "informational" as const, locator: { parent: server.name, resource }, provenance: { discovery_source: "mcpServerStatus/list", host_instance_id: response.identity.host_instance_id, app_server_version: response.identity.app_server_version, catalog_generation: response.identity.catalog_generation } } })),
        ];
        return [base, ...details];
      });
      return { identity: response.identity, rows };
    } });
    const settled = await Promise.allSettled(providers.map(provider => provider.run()));
    settled.forEach((result, index) => {
      if (result.status === "rejected") {
        semanticDiagnostic("provider_failed", { provider: providers[index].source, runtime_instance_id: this.runtimeInstanceId, error_code: providerErrorCode(result.reason) });
      }
    });
    const errors = settled.flatMap((result, index) => result.status === "rejected" ? [{ source: providers[index].source, message: "DISCOVERY_PROVIDER_FAILED" }] : []);
    const fulfilled = settled.flatMap(result => result.status === "fulfilled" ? [result.value] : []);
    if (!fulfilled.length) throw new Error("DISCOVERY_PROVIDER_FAILED");
    const generations = new Set(fulfilled.map(result => result.identity.catalog_generation));
    if (generations.size !== 1) throw new Error("REFERENCE_STALE");
    const results = fulfilled.flatMap(provider => provider.rows.flatMap(row => {
      const candidate = { handle: randomUUID(), ...row.candidate } satisfies MentionCandidateV2;
      if (!candidateMatches(candidate, query, kinds)) return [];
      this.handles.set(candidate.handle, { expiresAt: Date.now() + 120_000, runtimeInstanceId: this.runtimeInstanceId, workspaceId: input.workspaceId, workspacePath, audience: input.audience, identity: provider.identity, candidate, reference: row.reference });
      return [candidate];
    })).slice(0, 100);
    return { schema_version: 2, status: errors.length ? "partial" : "complete", catalog_generation: fulfilled[0].identity.catalog_generation, results, provider_errors: errors, next_cursor: null };
  }

  async resolveDocument(value: unknown, input: { workspaceId: string; workspacePath: string; audience: string }) {
    this.prune();
    const source = object(value);
    if (source.schema_version !== 2 || !Array.isArray(source.parts) || !source.parts.length || source.parts.length > 256) throw new Error("semantic_document_invalid");
    const draft = source as DraftInputDocumentV2;
    const handles = [...new Set(draft.parts.flatMap(part => part.type === "reference" && typeof part.handle === "string" ? [part.handle] : []))];
    if (handles.length > 64) throw new Error("semantic_document_invalid");
    const records = new Map<string, CandidateRecord>();
    for (const handle of handles) {
      const record = this.handles.get(handle);
      if (!record) throw new Error("REFERENCE_HANDLE_EXPIRED");
      if (record.runtimeInstanceId !== this.runtimeInstanceId) throw new Error("REFERENCE_RUNTIME_MISMATCH");
      if (record.workspaceId !== input.workspaceId || record.workspacePath !== realpathSync(resolve(input.workspacePath))) throw new Error("REFERENCE_WORKSPACE_MISMATCH");
      if (record.audience !== input.audience) throw new Error("REFERENCE_RUNTIME_MISMATCH");
      if (record.candidate.availability === "auth_required") throw new Error("REFERENCE_AUTH_REQUIRED");
      if (record.candidate.availability === "disabled" || record.candidate.availability === "unavailable") throw new Error("REFERENCE_DISABLED");
      if (record.candidate.addressability === "informational") throw new Error("MCP_TARGET_NOT_DIRECTLY_ADDRESSABLE");
      if (record.candidate.addressability !== "direct") throw new Error("REFERENCE_MAPPING_UNVERIFIED");
      records.set(handle, record);
    }
    if (records.size) {
      const current = await this.request("skills/list", { cwds: [realpathSync(resolve(input.workspacePath))], forceReload: false });
      for (const record of records.values()) {
        if (record.identity.host_instance_id !== current.identity.host_instance_id) throw new Error("REFERENCE_HOST_MISMATCH");
        if (record.identity.catalog_generation !== current.identity.catalog_generation) throw new Error("REFERENCE_STALE");
      }
    }
    const references: Record<string, SemanticReferenceV2> = {};
    const parts = draft.parts.slice(0, 256).map(part => {
      if (part.type === "text") return { type: "text" as const, text: String(part.text || "").slice(0, 100_000) };
      if (part.type !== "reference" || typeof part.handle !== "string") throw new Error("semantic_document_invalid");
      const record = records.get(part.handle);
      if (!record) throw new Error("REFERENCE_HANDLE_EXPIRED");
      const id = `r_${createHash("sha256").update(part.handle).digest("base64url").slice(0, 24)}`;
      const display = String(part.display || "").trim().slice(0, 1000);
      const target = record.candidate.display_path || record.candidate.label;
      if (display !== `@${target}` && !(record.candidate.kind === "skill" && display === `$${target}`)) throw new Error("semantic_reference_invalid");
      references[id] ||= { id, display, ...record.reference };
      return { type: "reference" as const, reference_id: id };
    });
    return normalizeInputDocument({ schema_version: 2, parts, references });
  }

  restoreDraft(documentValue: unknown, input: { workspaceId: string; workspacePath: string; audience: string }) {
    this.prune();
    const document = normalizeInputDocument(documentValue);
    const workspacePath = realpathSync(resolve(input.workspacePath));
    const handles = new Map<string, string>();
    const parts = document.parts.map(part => {
      if (part.type === "text") return part;
      const reference = document.references[part.reference_id];
      let handle = handles.get(part.reference_id);
      if (!handle) {
        handle = randomUUID();
        handles.set(part.reference_id, handle);
        const availability = reference.addressability === "direct" ? "available" : "unverified";
        const candidate: MentionCandidateV2 = { handle, kind: reference.kind, label: reference.display.replace(/^[@$]/, ""), detail: reference.workspace_binding?.relative_path || reference.kind, source: reference.provenance?.discovery_source || "Persisted", availability, addressability: reference.addressability, ...(reference.workspace_binding?.relative_path ? { display_path: reference.workspace_binding.relative_path } : {}) };
        this.handles.set(handle, { expiresAt: Date.now() + 120_000, runtimeInstanceId: this.runtimeInstanceId, workspaceId: input.workspaceId, workspacePath, audience: input.audience, identity: { host_instance_id: reference.provenance?.host_instance_id || "", app_server_pid: null, app_server_started_at: null, app_server_version: reference.provenance?.app_server_version || "", catalog_generation: reference.provenance?.catalog_generation || "" }, candidate, reference: { kind: reference.kind, addressability: reference.addressability, locator: reference.locator, ...(reference.workspace_binding ? { workspace_binding: reference.workspace_binding } : {}), ...(reference.provenance ? { provenance: reference.provenance } : {}), ...(reference.mapping ? { mapping: reference.mapping } : {}) } });
      }
      return { type: "reference" as const, handle, display: reference.display };
    });
    return { schema_version: 2 as const, parts };
  }

  private prune() {
    const current = Date.now();
    for (const [handle, record] of this.handles) if (record.expiresAt <= current) this.handles.delete(handle);
  }
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

export function codexSemanticInput(message: string, references: unknown, workspacePath = ""): CodexSemanticInput[] {
  return compileInputDocument(legacyInputDocument(message, normalizeCodexSemanticReferences(references)), workspacePath);
}

export function codexSemanticDocument(message: string, references: unknown): InputDocumentV2 {
  return legacyInputDocument(message, normalizeCodexSemanticReferences(references));
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

export function codexSemanticRequestFingerprint(message: string, references: unknown, command: unknown, document?: unknown) {
  return inputDocumentFingerprint(normalizeCodexSemanticDocument(document, message, references), command);
}

export function normalizeCodexSemanticDocument(value: unknown, fallbackMessage: string, fallbackReferences: unknown = []) {
  if (value && typeof value === "object" && !Array.isArray(value)) return normalizeInputDocument(value);
  return codexSemanticDocument(fallbackMessage, fallbackReferences);
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

export async function readCodexSkills(workspacePath: string, request: CodexSemanticRequester) {
  const cwd = resolve(workspacePath);
  return normalizeSkills((await request("skills/list", { cwds: [cwd], forceReload: false })).result);
}

export async function readCodexApps(request: CodexSemanticRequester) {
  const result = object((await request("app/installed", { forceRefresh: false })).result);
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
  return apps;
}

export async function readCodexSemanticCatalog(workspacePath: string, request: CodexSemanticRequester) {
  const [skillsResult, appsResult] = await Promise.allSettled([readCodexSkills(workspacePath, request), readCodexApps(request)]);
  return {
    skills: skillsResult.status === "fulfilled" ? skillsResult.value : [],
    apps: appsResult.status === "fulfilled" ? appsResult.value : [],
    errors: [
      ...(skillsResult.status === "rejected" ? [{ source: "skills", message: "codex_skills_unavailable" }] : []),
      ...(appsResult.status === "rejected" ? [{ source: "apps", message: "codex_apps_unavailable" }] : []),
    ],
  };
}

export async function resolveCodexSemanticReferences(workspacePath: string, value: unknown, request: CodexSemanticRequester) {
  const selections = normalizeCodexSemanticSelections(value);
  if (!selections.length) return [];
  const cwd = resolve(workspacePath);
  const skills = selections.some(selection => selection.type === "skill") ? await readCodexSkills(cwd, request) : [];
  const apps = selections.some(selection => selection.type === "app") ? await readCodexApps(request) : [];
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

export async function searchCodexFiles(workspacePath: string, query: string, request: CodexSemanticRequester) {
  const cwd = resolve(workspacePath);
  const result = object((await request("fuzzyFileSearch", { query: query.slice(0, 500), roots: [cwd] })).result);
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
