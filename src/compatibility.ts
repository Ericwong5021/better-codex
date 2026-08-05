import { readFileSync, renameSync, writeFileSync } from "node:fs";
import { compatibilityStatusPath, ensureDirectories } from "./config.js";

export const bundledCompatibility = {
  version: "0.2.0",
  coreVersion: "0.2.0",
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
} as const;

export type RendererCapabilities = {
  sidebar: boolean;
  content: boolean;
  threads: boolean;
  projects: boolean;
};

export type CompatibilityStatus = {
  version: string;
  coreVersion: string;
  supportedCodexVersions: typeof bundledCompatibility.supportedCodexVersions;
  platform: string;
  codexVersion: string | null;
  compatible: boolean;
  reason: string | null;
  targetId: string | null;
  capabilities: RendererCapabilities | null;
  checkedAt: string;
  lastSuccessfulAt: string | null;
};

export function targetAllowed(target: { url?: string; title?: string }) {
  const url = target.url ?? "";
  if (bundledCompatibility.targetRules.excludedRoutes.some(route => url.includes(route))) return false;
  return bundledCompatibility.targetRules.urlPrefixes.some(prefix => url.startsWith(prefix))
    || bundledCompatibility.targetRules.titleTerms.some(term => target.title?.includes(term));
}

export function capabilityExpression() {
  const selectors = JSON.stringify(bundledCompatibility.selectors);
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
  return [
    capabilities.sidebar ? null : "sidebar",
    capabilities.content ? null : "content",
  ].filter((value): value is string => Boolean(value));
}

export function navigationExpression(threadId: string) {
  const selectors = JSON.stringify(bundledCompatibility.selectors);
  const attributes = JSON.stringify(bundledCompatibility.attributes);
  const navigation = JSON.stringify(bundledCompatibility.navigation);
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
    if (decodeURIComponent(current) === expected) {
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
  const previous = readCompatibilityStatus();
  const now = new Date();
  const unchanged = previous
    && previous.version === bundledCompatibility.version
    && previous.codexVersion === input.codexVersion
    && previous.compatible === input.compatible
    && previous.reason === input.reason
    && previous.targetId === input.targetId
    && JSON.stringify(previous.capabilities) === JSON.stringify(input.capabilities);
  const lastWrite = previous ? Date.parse(successful ? previous.lastSuccessfulAt ?? "" : previous.checkedAt) : 0;
  if (unchanged && Number.isFinite(lastWrite) && now.getTime() - lastWrite < 60000) return previous;
  const value: CompatibilityStatus = {
    version: bundledCompatibility.version,
    coreVersion: bundledCompatibility.coreVersion,
    supportedCodexVersions: bundledCompatibility.supportedCodexVersions,
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
