import { existsSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { compatibilityCurrentPath, compatibilityStatusPath, compatibilityVersionsPath, ensureDirectories } from "./config.js";

export const coreVersion = "0.3.3";

export type CompatibilityManifest = {
  version: string;
  minimumCoreVersion: string;
  supportedPlatforms: string[];
  supportedCodexVersions: {
    strategy: "capability";
    minimum: string | null;
    maximumExclusive: string | null;
  };
  targetRules: {
    urlPrefixes: string[];
    titleTerms: string[];
    excludedRoutes: string[];
  };
  selectors: Record<string, string> & {
    sidebarScroll: string;
    contentLayout: string;
    threadRow: string;
    projectRow: string;
  };
  attributes: Record<string, string> & {
    threadId: string;
  };
  navigation: {
    messageType: string;
    threadRoutePrefix: string;
  };
};

export const bundledCompatibility: CompatibilityManifest = {
  version: "0.3.3",
  minimumCoreVersion: "0.2.0",
  supportedPlatforms: ["darwin", "win32"],
  supportedCodexVersions: {
    strategy: "capability",
    minimum: null,
    maximumExclusive: null,
  },
  targetRules: {
    urlPrefixes: ["app://"],
    titleTerms: ["Codex"],
    excludedRoutes: ["initialRoute=%2Fglobal-dictation", "initialRoute=%2Favatar-overlay"],
  },
  selectors: {
    sidebarScroll: "[data-app-action-sidebar-scroll]",
    sidebarSection: "[data-app-action-sidebar-section]",
    truncatedText: ".text-fade-truncate",
    contentFrame: ".app-shell-main-content-frame",
    contentLayout: "[data-app-shell-main-content-layout]",
    threadRow: "[data-app-action-sidebar-thread-id]",
    projectList: "[data-app-action-sidebar-project-list-id]",
    projectId: "[data-app-action-sidebar-project-id]",
    currentProjectRow: "[data-app-action-sidebar-project-row][aria-current=\"page\"]",
    projectRow: "[data-app-action-sidebar-project-row]",
    searchInput: "input[type=\"search\"]",
    sidebarNavigation: "aside nav[role=\"navigation\"]",
  },
  attributes: {
    threadId: "data-app-action-sidebar-thread-id",
    threadActive: "data-app-action-sidebar-thread-active",
    projectListId: "data-app-action-sidebar-project-list-id",
    projectId: "data-app-action-sidebar-project-id",
    projectLabel: "data-app-action-sidebar-project-label",
  },
  navigation: {
    messageType: "navigate-to-route",
    threadRoutePrefix: "/local/",
  },
};

type CompatibilityPointer = {
  current: string;
  previous: string | null;
  failures: number;
  updatedAt: string;
};

export type RendererCapabilities = {
  sidebar: boolean;
  content: boolean;
  threads: boolean;
  projects: boolean;
};

export type CompatibilityStatus = {
  version: string;
  coreVersion: string;
  supportedCodexVersions: CompatibilityManifest["supportedCodexVersions"];
  platform: string;
  codexVersion: string | null;
  compatible: boolean;
  reason: string | null;
  targetId: string | null;
  capabilities: RendererCapabilities | null;
  checkedAt: string;
  lastSuccessfulAt: string | null;
};

function versionParts(version: string) {
  return version.replace(/^v/, "").split(/[.-]/).map(value => /^\d+$/.test(value) ? Number(value) : value);
}

export function compareVersions(left: string, right: string) {
  const a = versionParts(left);
  const b = versionParts(right);
  for (let index = 0; index < Math.max(a.length, b.length); index += 1) {
    const x = a[index] ?? 0;
    const y = b[index] ?? 0;
    if (x === y) continue;
    if (typeof x === "number" && typeof y === "number") return x < y ? -1 : 1;
    return String(x).localeCompare(String(y));
  }
  return 0;
}

function stringArray(value: unknown, maximum = 32) {
  return Array.isArray(value) && value.length <= maximum && value.every(item => typeof item === "string" && item.length > 0 && item.length <= 512);
}

function stringMap(value: unknown, required: string[]) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const entries = Object.entries(value);
  return entries.length <= 64
    && required.every(key => typeof (value as Record<string, unknown>)[key] === "string")
    && entries.every(([key, item]) => /^[A-Za-z][A-Za-z0-9]*$/.test(key) && typeof item === "string" && item.length > 0 && item.length <= 512);
}

export function validateCompatibility(value: unknown): CompatibilityManifest {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("compatibility_invalid");
  const item = value as Record<string, unknown>;
  const allowed = ["version", "minimumCoreVersion", "supportedPlatforms", "supportedCodexVersions", "targetRules", "selectors", "attributes", "navigation"];
  if (Object.keys(item).some(key => !allowed.includes(key))) throw new Error("compatibility_field_not_allowed");
  if (typeof item.version !== "string" || !/^\d+\.\d+\.\d+(?:[-.][A-Za-z0-9.-]+)?$/.test(item.version)) throw new Error("compatibility_version_invalid");
  if (typeof item.minimumCoreVersion !== "string" || compareVersions(coreVersion, item.minimumCoreVersion) < 0) throw new Error("compatibility_core_incompatible");
  if (!stringArray(item.supportedPlatforms) || !(item.supportedPlatforms as string[]).every(platform => ["darwin", "win32"].includes(platform))) throw new Error("compatibility_platforms_invalid");
  const codex = item.supportedCodexVersions as Record<string, unknown>;
  if (!codex || codex.strategy !== "capability" || ![null, "string"].includes(codex.minimum === null ? null : typeof codex.minimum) || ![null, "string"].includes(codex.maximumExclusive === null ? null : typeof codex.maximumExclusive)) throw new Error("compatibility_codex_range_invalid");
  const rules = item.targetRules as Record<string, unknown>;
  if (!rules || !stringArray(rules.urlPrefixes) || !stringArray(rules.titleTerms) || !stringArray(rules.excludedRoutes)) throw new Error("compatibility_target_rules_invalid");
  if (!stringMap(item.selectors, ["sidebarScroll", "contentLayout", "threadRow", "projectRow"])) throw new Error("compatibility_selectors_invalid");
  if (!stringMap(item.attributes, ["threadId"])) throw new Error("compatibility_attributes_invalid");
  const navigation = item.navigation as Record<string, unknown>;
  if (!navigation || Object.keys(navigation).some(key => !["messageType", "threadRoutePrefix"].includes(key)) || typeof navigation.messageType !== "string" || typeof navigation.threadRoutePrefix !== "string") throw new Error("compatibility_navigation_invalid");
  return value as CompatibilityManifest;
}

export function readCompatibilityPointer() {
  try {
    const value = JSON.parse(readFileSync(compatibilityCurrentPath, "utf8")) as CompatibilityPointer;
    if (typeof value.current !== "string" || !Number.isInteger(value.failures)) return null;
    return value;
  } catch {
    return null;
  }
}

export function writeCompatibilityPointer(value: CompatibilityPointer) {
  ensureDirectories();
  const temporary = `${compatibilityCurrentPath}.${process.pid}.tmp`;
  writeFileSync(temporary, JSON.stringify(value), { mode: 0o600 });
  renameSync(temporary, compatibilityCurrentPath);
}

export function activeCompatibility() {
  const pointer = readCompatibilityPointer();
  if (!pointer || pointer.current === bundledCompatibility.version) return bundledCompatibility;
  try {
    return validateCompatibility(JSON.parse(readFileSync(join(compatibilityVersionsPath, pointer.current, "manifest.json"), "utf8")));
  } catch {
    return bundledCompatibility;
  }
}

export function rollbackCompatibility() {
  const pointer = readCompatibilityPointer();
  if (!pointer?.previous) throw new Error("compatibility_rollback_unavailable");
  const target = pointer.previous;
  const manifest = target === bundledCompatibility.version
    ? bundledCompatibility
    : validateCompatibility(JSON.parse(readFileSync(join(compatibilityVersionsPath, target, "manifest.json"), "utf8")));
  writeCompatibilityPointer({ current: target, previous: pointer.current, failures: 0, updatedAt: new Date().toISOString() });
  return manifest;
}

export function targetAllowed(target: { url?: string; title?: string }) {
  const compatibility = activeCompatibility();
  const url = target.url ?? "";
  if (compatibility.targetRules.excludedRoutes.some(route => url.includes(route))) return false;
  return compatibility.targetRules.urlPrefixes.some(prefix => url.startsWith(prefix))
    || compatibility.targetRules.titleTerms.some(term => target.title?.includes(term));
}

export function capabilityExpression() {
  const selectors = JSON.stringify(activeCompatibility().selectors);
  return `(() => {
    const selectors = ${selectors};
    const layout = document.querySelector(selectors.contentLayout);
    const surface = layout?.parentElement;
    return {
      sidebar: Boolean(document.querySelector(selectors.sidebarScroll)),
      content: Boolean(layout && surface?.closest("main")),
      threads: Boolean(document.querySelector(selectors.threadRow)),
      projects: Boolean(document.querySelector(selectors.projectRow))
    };
  })()`;
}

export function missingCapabilities(capabilities: RendererCapabilities) {
  return [capabilities.sidebar ? null : "sidebar", capabilities.content ? null : "content"].filter((value): value is string => Boolean(value));
}

export function navigationExpression(threadId: string) {
  const compatibility = activeCompatibility();
  const selectors = JSON.stringify(compatibility.selectors);
  const attributes = JSON.stringify(compatibility.attributes);
  const navigation = JSON.stringify(compatibility.navigation);
  return `(async () => {
    const selectors = ${selectors};
    const attributes = ${attributes};
    const navigation = ${navigation};
    const expected = ${JSON.stringify(threadId)}.replace(/^(local|cloud):/i, "");
    const row = Array.from(document.querySelectorAll(selectors.threadRow)).find(item => String(item.getAttribute(attributes.threadId) || "").replace(/^(local|cloud):/i, "") === expected);
    if (row) {
      window.__betterCodexInjection__?.close?.();
      row.click();
      return { opened: true, via: "sidebar" };
    }
    window.postMessage({ type: navigation.messageType, path: navigation.threadRoutePrefix + encodeURIComponent(expected) }, window.location.origin);
    await new Promise(resolve => setTimeout(resolve, 400));
    const current = location.pathname.match(/\\/local\\/([^/?#]+)/)?.[1] || "";
    const activeRow = Array.from(document.querySelectorAll(selectors.threadRow)).find(item => item.getAttribute(attributes.threadActive) === "true");
    const activeThread = String(activeRow?.getAttribute(attributes.threadId) || "").replace(/^(local|cloud):/i, "");
    if (decodeURIComponent(current) === expected || activeThread === expected) {
      window.__betterCodexInjection__?.close?.();
      return { opened: true, via: "route" };
    }
    return { opened: false, requested: true, via: "route", error: "thread_open_unconfirmed" };
  })()`;
}

export function readCompatibilityStatus() {
  try {
    return JSON.parse(readFileSync(compatibilityStatusPath, "utf8")) as CompatibilityStatus;
  } catch {
    return null;
  }
}

export function writeCompatibilityStatus(input: Omit<CompatibilityStatus, "version" | "coreVersion" | "supportedCodexVersions" | "platform" | "checkedAt" | "lastSuccessfulAt">, successful = false) {
  ensureDirectories();
  let compatibility = activeCompatibility();
  const pointer = readCompatibilityPointer();
  if (pointer && pointer.current === compatibility.version) {
    if (successful && pointer.failures !== 0) writeCompatibilityPointer({ ...pointer, failures: 0, updatedAt: new Date().toISOString() });
    if (!successful && input.reason?.startsWith("missing_") && pointer.previous) {
      const failures = pointer.failures + 1;
      writeCompatibilityPointer({ ...pointer, failures, updatedAt: new Date().toISOString() });
      if (failures >= 3) compatibility = rollbackCompatibility();
    }
  }
  const previous = readCompatibilityStatus();
  const now = new Date();
  const unchanged = previous && previous.version === compatibility.version && previous.codexVersion === input.codexVersion && previous.compatible === input.compatible && previous.reason === input.reason && previous.targetId === input.targetId && JSON.stringify(previous.capabilities) === JSON.stringify(input.capabilities);
  const lastWrite = previous ? Date.parse(successful ? previous.lastSuccessfulAt ?? "" : previous.checkedAt) : 0;
  if (unchanged && Number.isFinite(lastWrite) && now.getTime() - lastWrite < 60000) return previous;
  const value: CompatibilityStatus = {
    version: compatibility.version,
    coreVersion,
    supportedCodexVersions: compatibility.supportedCodexVersions,
    platform: process.platform,
    codexVersion: input.codexVersion,
    compatible: input.compatible,
    reason: input.reason,
    targetId: input.targetId,
    capabilities: input.capabilities,
    checkedAt: now.toISOString(),
    lastSuccessfulAt: successful ? now.toISOString() : previous?.lastSuccessfulAt ?? null,
  };
  const temporary = `${compatibilityStatusPath}.${process.pid}.tmp`;
  writeFileSync(temporary, JSON.stringify(value), { mode: 0o600 });
  renameSync(temporary, compatibilityStatusPath);
  return value;
}

export function clearCompatibilityStatus() {
  return writeCompatibilityStatus({ codexVersion: null, compatible: false, reason: "disabled", targetId: null, capabilities: null });
}
