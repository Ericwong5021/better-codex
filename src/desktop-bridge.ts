import { activeCompatibility } from "./compatibility.js";
import { betterCodexProfile } from "./config.js";
import { desktopBridgeBundle, desktopBridgeBundleChecksum as bundleChecksum } from "./generated/desktop-bridge.js";

export function desktopBridgeBundleChecksum() { return bundleChecksum; }
export function desktopBridgeVersion() { return activeCompatibility().version; }

export function desktopBridgeScript(port: number, accessToken: string, locale: "zh-CN" | "en" = "zh-CN") {
  const compatibility = activeCompatibility();
  return `${desktopBridgeBundle}\nBetterCodexDesktopBridge.install(${JSON.stringify({ version: compatibility.version, bundleChecksum, profile: betterCodexProfile, baseUrl: `http://127.0.0.1:${port}`, bridgeToken: accessToken, locale, selectors: compatibility.selectors, attributes: compatibility.attributes, navigation: compatibility.navigation })})`;
}

/** Legacy migration removes only Better Codex-owned renderer artifacts. */
export function desktopBridgeCleanupScript() {
  return `(() => {
    window.__betterCodexInjection__?.destroy?.();
    document.querySelectorAll('[data-better-codex-owned="true"]').forEach(node => node.remove());
    for (const attribute of ['data-better-codex-native-hidden', 'data-better-codex-page-host', 'data-better-codex-external-mcp-host-hidden', 'data-better-codex-launcher-hidden']) document.querySelectorAll('[' + attribute + ']').forEach(node => node.removeAttribute(attribute));
    document.documentElement.removeAttribute('data-better-codex-open');
    delete window.__betterCodexInjection__;
    return { uninstalled: true };
  })()`;
}
