import { betterCodexThemeColors } from "./design-system.js";

const webAppIcons = [
  { src: "/better-codex-icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
  { src: "/better-codex-icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
];

export function betterCodexWebManifest() {
  return JSON.stringify({
    id: "/web",
    name: "Better Codex",
    short_name: "Better Codex",
    description: "Better Codex 任务与智能体工作台",
    lang: "zh-CN",
    start_url: "/web",
    scope: "/",
    display: "standalone",
    background_color: betterCodexThemeColors.light.canvas,
    theme_color: betterCodexThemeColors.light.navigation,
    icons: webAppIcons,
  });
}

export function betterCodexWebServiceWorker() {
  return `self.addEventListener("install",()=>self.skipWaiting());self.addEventListener("activate",event=>event.waitUntil(self.clients.claim()));`;
}

export function betterCodexWebAppRegistrationJavaScript() {
  return `if("serviceWorker" in navigator)window.addEventListener("load",()=>{void navigator.serviceWorker.register("/web/service-worker.js",{scope:"/"}).catch(()=>{})});`;
}
