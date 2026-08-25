import { createHash } from "node:crypto";
import { realpathSync, statSync } from "node:fs";
import { isAbsolute, relative, resolve } from "node:path";

export type CodexUserInput =
  | { type: "text"; text: string }
  | { type: "skill"; name: string; path: string }
  | { type: "mention"; name: string; path: string };

export type SemanticKindV2 =
  | "builtin_browser"
  | "builtin_computer"
  | "desktop_app"
  | "skill"
  | "plugin"
  | "app"
  | "mcp_server"
  | "mcp_tool"
  | "mcp_resource"
  | "file"
  | "directory";

export type SemanticAddressabilityV2 = "direct" | "via_parent" | "informational" | "unverified";

export type SemanticReferenceV2 = {
  id: string;
  kind: SemanticKindV2;
  addressability: SemanticAddressabilityV2;
  display: string;
  locator: Record<string, unknown>;
  workspace_binding?: {
    workspace_id: string;
    relative_path?: string;
    expected_kind?: "file" | "directory";
  };
  provenance?: {
    discovery_source: string;
    host_instance_id?: string;
    app_server_version?: string;
    catalog_generation?: string;
  };
  mapping?: {
    id: string;
    verified_version: string;
  };
};

export type InputPartV2 = { type: "text"; text: string } | { type: "reference"; reference_id: string };

export type InputDocumentV2 = {
  schema_version: 2;
  parts: InputPartV2[];
  references: Record<string, SemanticReferenceV2>;
};

export type LegacySemanticReference = {
  type: "skill" | "mention";
  name: string;
  path: string;
};

function object(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function string(value: unknown, limit: number) {
  return typeof value === "string" ? value.slice(0, limit) : "";
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => `${JSON.stringify(key)}:${canonicalJson(item)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

function referenceId(reference: LegacySemanticReference) {
  return createHash("sha256")
    .update(reference.type)
    .update("\0")
    .update(reference.name)
    .update("\0")
    .update(reference.path)
    .digest("base64url")
    .slice(0, 24);
}

function normalizeLegacyReference(value: unknown): LegacySemanticReference {
  const source = object(value);
  const type = source.type === "skill" || source.type === "mention" ? source.type : null;
  const name = string(source.name, 500).trim();
  const path = string(source.path, 4096).trim();
  if (!type || !name || !path) throw new Error("semantic_reference_invalid");
  return { type, name, path };
}

function normalizeSemanticReference(value: unknown, id: string): SemanticReferenceV2 {
  const source = object(value);
  const kinds: SemanticKindV2[] = ["builtin_browser", "builtin_computer", "desktop_app", "skill", "plugin", "app", "mcp_server", "mcp_tool", "mcp_resource", "file", "directory"];
  const addressabilities: SemanticAddressabilityV2[] = ["direct", "via_parent", "informational", "unverified"];
  const kind = kinds.includes(source.kind as SemanticKindV2) ? source.kind as SemanticKindV2 : null;
  const addressability = addressabilities.includes(source.addressability as SemanticAddressabilityV2) ? source.addressability as SemanticAddressabilityV2 : null;
  const display = string(source.display, 1000).trim();
  const locator = object(source.locator);
  if (!id || !kind || !addressability || !display || !Object.keys(locator).length) throw new Error("semantic_reference_invalid");
  const binding = object(source.workspace_binding);
  const expectedKind = binding.expected_kind === "file" || binding.expected_kind === "directory" ? binding.expected_kind : undefined;
  const workspaceId = string(binding.workspace_id, 200).trim();
  const relativePath = string(binding.relative_path, 4096).trim();
  const provenanceSource = object(source.provenance);
  const mappingSource = object(source.mapping);
  return {
    id,
    kind,
    addressability,
    display,
    locator,
    ...(workspaceId ? { workspace_binding: { workspace_id: workspaceId, ...(relativePath ? { relative_path: relativePath } : {}), ...(expectedKind ? { expected_kind: expectedKind } : {}) } } : {}),
    ...(Object.keys(provenanceSource).length ? { provenance: {
      discovery_source: string(provenanceSource.discovery_source, 200).trim(),
      ...(string(provenanceSource.host_instance_id, 200).trim() ? { host_instance_id: string(provenanceSource.host_instance_id, 200).trim() } : {}),
      ...(string(provenanceSource.app_server_version, 200).trim() ? { app_server_version: string(provenanceSource.app_server_version, 200).trim() } : {}),
      ...(string(provenanceSource.catalog_generation, 200).trim() ? { catalog_generation: string(provenanceSource.catalog_generation, 200).trim() } : {}),
    } } : {}),
    ...(string(mappingSource.id, 200).trim() && string(mappingSource.verified_version, 200).trim() ? { mapping: { id: string(mappingSource.id, 200).trim(), verified_version: string(mappingSource.verified_version, 200).trim() } } : {}),
  };
}

export function normalizeInputDocument(value: unknown): InputDocumentV2 {
  const source = object(value);
  if (source.schema_version !== 2) throw new Error("semantic_document_version_unsupported");
  const sourceReferences = object(source.references);
  const referenceEntries = Object.entries(sourceReferences);
  if (referenceEntries.length > 64) throw new Error("semantic_document_invalid");
  const references = Object.fromEntries(referenceEntries.map(([id, reference]) => {
    const normalizedId = id.trim().slice(0, 200);
    return [normalizedId, normalizeSemanticReference(reference, normalizedId)];
  }));
  if (!Array.isArray(source.parts)) throw new Error("semantic_document_invalid");
  if (source.parts.length > 256) throw new Error("semantic_document_invalid");
  const parts = source.parts.map((part): InputPartV2 => {
    const item = object(part);
    if (item.type === "text") return { type: "text", text: string(item.text, 100_000) };
    if (item.type === "reference") {
      const id = string(item.reference_id, 200).trim();
      if (!id || !references[id]) throw new Error("semantic_reference_not_found");
      return { type: "reference", reference_id: id };
    }
    throw new Error("semantic_document_invalid");
  });
  if (!parts.length) throw new Error("semantic_document_empty");
  const used = new Set(parts.flatMap(part => part.type === "reference" ? [part.reference_id] : []));
  if (Object.keys(references).some(id => !used.has(id))) throw new Error("semantic_reference_unused");
  return { schema_version: 2, parts, references };
}

export function legacyInputDocument(message: string, value: unknown): InputDocumentV2 {
  const references = Array.isArray(value) ? value.slice(0, 64).map(normalizeLegacyReference) : [];
  const referenceMap: Record<string, SemanticReferenceV2> = {};
  const tokenMap = new Map<string, string>();
  for (const reference of references) {
    const id = referenceId(reference);
    const token = `${reference.type === "skill" ? "$" : "@"}${reference.name}`;
    const path = reference.path;
    const kind: SemanticKindV2 = reference.type === "skill" ? "skill" : path.startsWith("app://") ? "app" : path.startsWith("plugin://") ? "plugin" : "file";
    referenceMap[id] = {
      id,
      kind,
      addressability: "direct",
      display: token,
      locator: reference,
      provenance: { discovery_source: "legacy" },
    };
    tokenMap.set(token, id);
  }
  const parts: InputPartV2[] = [];
  if (tokenMap.size) {
    const tokens = [...tokenMap.keys()].sort((left, right) => right.length - left.length);
    const escaped = tokens.map(token => token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
    const pattern = new RegExp(`(^|\\s)(${escaped.join("|")})(?=\\s|$)`, "g");
    let cursor = 0;
    for (const match of message.matchAll(pattern)) {
      const offset = match.index ?? 0;
      const prefix = match[1] || "";
      const token = match[2];
      const tokenStart = offset + prefix.length;
      if (tokenStart > cursor) parts.push({ type: "text", text: message.slice(cursor, tokenStart) });
      parts.push({ type: "reference", reference_id: tokenMap.get(token)! });
      cursor = tokenStart + token.length;
    }
    if (cursor < message.length) parts.push({ type: "text", text: message.slice(cursor) });
  }
  if (!parts.length) parts.push({ type: "text", text: message });
  const used = new Set(parts.flatMap(part => part.type === "reference" ? [part.reference_id] : []));
  for (const reference of references) {
    const id = referenceId(reference);
    if (!used.has(id)) parts.push({ type: "reference", reference_id: id });
  }
  return { schema_version: 2, parts, references: referenceMap };
}

export function inputDocumentText(documentValue: unknown) {
  const document = normalizeInputDocument(documentValue);
  return document.parts.map(part => part.type === "text" ? part.text : document.references[part.reference_id].display).join("");
}

export function appendInputDocumentText(documentValue: unknown, text: string) {
  const document = normalizeInputDocument(documentValue);
  if (!text) return document;
  const parts = [...document.parts];
  const previous = parts.at(-1);
  if (previous?.type === "text") previous.text += text;
  else parts.push({ type: "text", text });
  return normalizeInputDocument({ ...document, parts });
}

export function inputDocumentLegacyReferences(documentValue: unknown): LegacySemanticReference[] {
  const document = normalizeInputDocument(documentValue);
  const seen = new Set<string>();
  return document.parts.flatMap(part => {
    if (part.type !== "reference" || seen.has(part.reference_id)) return [];
    seen.add(part.reference_id);
    return [normalizeLegacyReference(document.references[part.reference_id].locator)];
  });
}

export function compileInputDocument(documentValue: unknown, workspacePath = ""): CodexUserInput[] {
  const document = normalizeInputDocument(documentValue);
  const cwd = workspacePath ? resolve(workspacePath) : "";
  const root = cwd ? realpathSync(cwd) : "";
  const input: CodexUserInput[] = [];
  const pushText = (text: string) => {
    if (!text) return;
    const previous = input.at(-1);
    if (previous?.type === "text") previous.text += text;
    else input.push({ type: "text", text });
  };
  for (const part of document.parts) {
    if (part.type === "text") {
      pushText(part.text);
      continue;
    }
    const reference = document.references[part.reference_id];
    if (reference.addressability !== "direct") throw new Error(reference.addressability === "via_parent" ? "reference_parent_required" : "reference_mapping_unverified");
    const locator = normalizeLegacyReference(reference.locator);
    if (reference.kind === "file" || reference.kind === "directory") {
      if (!cwd || !isAbsolute(locator.path)) throw new Error("reference_workspace_mismatch");
      const target = realpathSync(locator.path);
      const relativePath = relative(root, target);
      if (!relativePath || relativePath.startsWith("..") || isAbsolute(relativePath)) throw new Error("reference_outside_workspace");
      const expectedKind = reference.workspace_binding?.expected_kind;
      const directory = statSync(target).isDirectory();
      if (expectedKind === "directory" && !directory || expectedKind === "file" && directory) throw new Error("reference_kind_changed");
    }
    input.push(locator);
  }
  if (!input.length && document.parts.some(part => part.type === "text")) return [{ type: "text", text: "" }];
  if (!input.length) throw new Error("semantic_document_empty");
  return input;
}

export function inputDocumentFingerprint(documentValue: unknown, command: unknown) {
  return canonicalJson({ command: String(command || ""), document: normalizeInputDocument(documentValue) });
}
