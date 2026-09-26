import { closeSync, existsSync, fsyncSync, openSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { betterCodexProfile, compatibilityCurrentPath, compatibilityStatusPath, compatibilityVersionsPath, ensureDirectories, runtimeCurrentPath } from "./config.js";
import { readRuntimeState } from "./runtime-state.js";
import { injectionPreferenceEnabled } from "./injection-state.js";
export { coreVersion } from "./version.js";
import { coreVersion } from "./version.js";

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
  version: "0.3.10",
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
    sidebarNavigationItem: ".sidebar-item",
  },
  attributes: {
    threadId: "data-app-action-sidebar-thread-id",
    threadTitle: "data-app-action-sidebar-thread-title",
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
  loading?: boolean;
  documentId?: number;
};

export type CompatibilityStatus = {
  state?: "ready" | "waiting_window" | "disabled" | "failed";
  runtimeInstanceId?: string | null;
  runtimeGeneration?: number | null;
  profile?: string;
  targetUrl?: string | null;
  documentId?: number | null;
  version: string;
  coreVersion: string;
  supportedCodexVersions: CompatibilityManifest["supportedCodexVersions"];
  platform: string;
  codexVersion: string | null;
  compatible: boolean;
  reason: string | null;
  error?: string | null;
  targetId: string | null;
  capabilities: RendererCapabilities | null;
  checkedAt: string;
  lastSuccessfulAt: string | null;
};

function versionParts(version: string) {
  const normalized = version.replace(/^v/, "").split("+", 1)[0];
  const match = normalized.match(/^(\d+)\.(\d+)\.(\d+)(?:[-.]([A-Za-z0-9.-]+))?$/);
  if (!match) return null;
  return {
    core: match.slice(1, 4).map(Number),
    prerelease: match[4] ? match[4].split(".") : [],
  };
}

export function compareVersions(left: string, right: string) {
  const a = versionParts(left);
  const b = versionParts(right);
  if (!a || !b) return a ? 1 : b ? -1 : left.localeCompare(right);
  for (let index = 0; index < Math.max(a.core.length, b.core.length); index += 1) {
    const x = a.core[index] ?? 0;
    const y = b.core[index] ?? 0;
    if (x === y) continue;
    return x < y ? -1 : 1;
  }
  if (!a.prerelease.length || !b.prerelease.length) {
    if (a.prerelease.length === b.prerelease.length) return 0;
    return a.prerelease.length ? -1 : 1;
  }
  for (let index = 0; index < Math.max(a.prerelease.length, b.prerelease.length); index += 1) {
    const x = a.prerelease[index];
    const y = b.prerelease[index];
    if (x === undefined || y === undefined) return x === undefined ? -1 : 1;
    if (x === y) continue;
    const xNumeric = /^\d+$/.test(x);
    const yNumeric = /^\d+$/.test(y);
    if (xNumeric && yNumeric) return Number(x) < Number(y) ? -1 : 1;
    if (xNumeric !== yNumeric) return xNumeric ? -1 : 1;
    return x < y ? -1 : 1;
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

export function validateCompatibility(value: unknown, activeCoreVersion = coreVersion): CompatibilityManifest {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("compatibility_invalid");
  const item = value as Record<string, unknown>;
  const allowed = ["version", "minimumCoreVersion", "supportedPlatforms", "supportedCodexVersions", "targetRules", "selectors", "attributes", "navigation"];
  if (Object.keys(item).some(key => !allowed.includes(key))) throw new Error("compatibility_field_not_allowed");
  if (typeof item.version !== "string" || !/^\d+\.\d+\.\d+(?:[-.][A-Za-z0-9.-]+)?$/.test(item.version)) throw new Error("compatibility_version_invalid");
  if (typeof item.minimumCoreVersion !== "string" || !versionParts(item.minimumCoreVersion) || compareVersions(activeCoreVersion, item.minimumCoreVersion) < 0) throw new Error("compatibility_core_incompatible");
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
    if (typeof value.current !== "string" || !Number.isInteger(value.failures)) throw new Error("compatibility_pointer_invalid");
    return value;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

export function writeCompatibilityPointer(value: CompatibilityPointer) {
  ensureDirectories();
  const temporary = `${compatibilityCurrentPath}.${process.pid}.tmp`;
  const descriptor = openSync(temporary, "w", 0o600);
  try { writeFileSync(descriptor, JSON.stringify(value)); fsyncSync(descriptor); }
  finally { closeSync(descriptor); }
  renameSync(temporary, compatibilityCurrentPath);
  if (process.platform !== "win32") {
    const directory = openSync(dirname(compatibilityCurrentPath), "r");
    try { fsyncSync(directory); } finally { closeSync(directory); }
  }
}

function activeCoreVersion() {
  try {
    const value = JSON.parse(readFileSync(runtimeCurrentPath, "utf8")) as { current?: string };
    return typeof value.current === "string" ? value.current : coreVersion;
  } catch {
    return coreVersion;
  }
}

export function activeCompatibility() {
  const pointer = readCompatibilityPointer();
  if (!pointer || pointer.current === bundledCompatibility.version) return bundledCompatibility;
  try {
    return validateCompatibility(JSON.parse(readFileSync(join(compatibilityVersionsPath, pointer.current, "manifest.json"), "utf8")), activeCoreVersion());
  } catch (error) {
    throw new Error("compatibility_package_invalid", { cause: error });
  }
}

export function rollbackCompatibility(expectedVersion?: string | null) {
  const pointer = readCompatibilityPointer();
  if (!pointer?.previous) throw new Error("compatibility_rollback_unavailable");
  if (expectedVersion && pointer.current !== expectedVersion) return activeCompatibility();
  const target = pointer.previous;
  const manifest = target === bundledCompatibility.version
    ? bundledCompatibility
    : validateCompatibility(JSON.parse(readFileSync(join(compatibilityVersionsPath, target, "manifest.json"), "utf8")), activeCoreVersion());
  writeCompatibilityPointer({ current: target, previous: pointer.current, failures: 0, updatedAt: new Date().toISOString() });
  return manifest;
}

export function targetAllowed(target: { url?: string; title?: string }) {
  const compatibility = activeCompatibility();
  const url = target.url ?? "";
  if (/detached-window|global-dictation|avatar-overlay/i.test(url)) return false;
  if (compatibility.targetRules.excludedRoutes.some(route => url.includes(route))) return false;
  if (/^https?:\/\//i.test(url)) return false;
  return compatibility.targetRules.urlPrefixes.some(prefix => url.startsWith(prefix));
}

export function capabilityExpression() {
  const selectors = JSON.stringify(activeCompatibility().selectors);
  return `(() => {
    const selectors = ${selectors};
    const layout = document.querySelector(selectors.contentLayout);
    const surface = layout?.parentElement || document.querySelector("main > div");
    return {
      loading: document.readyState !== "complete" || (!document.querySelector("main") && performance.now() < 30000),
      documentId: performance.timeOrigin,
      sidebar: Boolean(document.querySelector(selectors.sidebarScroll) || document.querySelector("[data-app-navigation-rail], [data-app-shell-page-sidebar]")),
      content: Boolean((layout && surface?.closest("main")) || document.querySelector("main")),
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
    if (typeof window.__betterCodexInjection__?.openThread === "function") {
      return await window.__betterCodexInjection__.openThread(expected);
    }
    const normalize = value => String(value || "").replace(/^(local|cloud):/i, "");
    const findRow = () => Array.from(document.querySelectorAll(selectors.threadRow)).find(item => normalize(item.getAttribute(attributes.threadId)) === expected);
    const currentRoute = () => {
      const match = location.pathname.match(/\\/local\\/([^/?#]+)/);
      if (!match) return "";
      try { return normalize(decodeURIComponent(match[1])); } catch { return ""; }
    };
    const currentState = () => {
      const activeRow = Array.from(document.querySelectorAll(selectors.threadRow)).find(item => item.getAttribute(attributes.threadActive) === "true");
      return { active: normalize(activeRow?.getAttribute(attributes.threadId)) };
    };
    const deadline = Date.now() + 10000;
    let clickedRow = false;
    let requestedRoute = false;
    while (Date.now() < deadline) {
      const current = currentState();
      if (current.active === expected) {
        window.__betterCodexInjection__?.close?.();
        return { opened: true, via: "sidebar" };
      }
      if (currentRoute() === expected) {
        window.__betterCodexInjection__?.close?.();
        return { opened: true, via: "route" };
      }
      const row = findRow();
      if (row && !clickedRow) {
        clickedRow = true;
        row.click();
      } else if (!row && !requestedRoute) {
        requestedRoute = true;
        window.postMessage({ type: navigation.messageType, path: navigation.threadRoutePrefix + encodeURIComponent(expected) }, window.location.origin);
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    return { opened: false, requested: false, via: "sidebar", error: "thread_open_timeout" };
  })()`;
}

export function readCompatibilityStatus() {
  const runtime = readRuntimeState();
  const base: CompatibilityStatus = { state: "waiting_window", compatible: false, reason: "probe_pending", version: bundledCompatibility.version, coreVersion, supportedCodexVersions: bundledCompatibility.supportedCodexVersions, platform: process.platform, codexVersion: null, targetId: null, targetUrl: null, documentId: null, capabilities: null, checkedAt: new Date().toISOString(), lastSuccessfulAt: null, profile: betterCodexProfile, runtimeInstanceId: runtime?.instanceId || null, runtimeGeneration: runtime?.generation ?? null };
  if (!injectionPreferenceEnabled()) return { ...base, state: "disabled" as const, reason: "disabled" };
  let compatibility: CompatibilityManifest;
  try { compatibility = activeCompatibility(); }
  catch (error) { return { ...base, state: "failed" as const, reason: "compatibility_package_invalid", error: String(error) }; }
  base.version = compatibility.version;
  base.supportedCodexVersions = compatibility.supportedCodexVersions;
  try {
    const value = JSON.parse(readFileSync(compatibilityStatusPath, "utf8")) as CompatibilityStatus;
    if (value.coreVersion !== coreVersion || value.version !== compatibility.version || value.profile !== betterCodexProfile || value.runtimeInstanceId !== (runtime?.instanceId || null) || value.runtimeGeneration !== (runtime?.generation ?? null) || !Number.isFinite(Date.parse(value.checkedAt)) || Date.now() - Date.parse(value.checkedAt) > 90_000) return base;
    return value;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") return { ...base, state: "failed" as const, reason: "compatibility_status_invalid", error: String(error) };
    return base;
  }
}

export function writeCompatibilityStatus(input: Omit<CompatibilityStatus, "version" | "coreVersion" | "supportedCodexVersions" | "platform" | "checkedAt" | "lastSuccessfulAt">, successful = false) {
  ensureDirectories();
  const compatibility = activeCompatibility();
  const runtime = readRuntimeState();
  const previous = readCompatibilityStatus();
  const now = new Date();
  const state = input.state || (input.reason === "disabled" ? "disabled" : successful ? "ready" : input.reason?.startsWith("missing_") || input.reason === "unsupported_platform" || input.reason === "injection_bootstrap_failed" ? "failed" : "waiting_window");
  const unchanged = previous && previous.state === state && previous.runtimeInstanceId === runtime?.instanceId && previous.runtimeGeneration === runtime?.generation && previous.version === compatibility.version && previous.codexVersion === input.codexVersion && previous.compatible === input.compatible && previous.reason === input.reason && previous.targetId === input.targetId && previous.documentId === input.documentId && JSON.stringify(previous.capabilities) === JSON.stringify(input.capabilities);
  const lastWrite = previous ? Date.parse(successful ? previous.lastSuccessfulAt ?? "" : previous.checkedAt) : 0;
  if (unchanged && Number.isFinite(lastWrite) && now.getTime() - lastWrite < 60000) return previous;
  const value: CompatibilityStatus = {
    state,
    runtimeInstanceId: runtime?.instanceId || null,
    runtimeGeneration: runtime?.generation ?? null,
    profile: betterCodexProfile,
    targetUrl: input.targetUrl || null,
    documentId: input.documentId ?? input.capabilities?.documentId ?? null,
    version: compatibility.version,
    coreVersion,
    supportedCodexVersions: compatibility.supportedCodexVersions,
    platform: process.platform,
    codexVersion: input.codexVersion,
    compatible: input.compatible,
    reason: input.reason,
    error: input.error || null,
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
