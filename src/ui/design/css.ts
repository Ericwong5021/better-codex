import { betterCodexDesignTokenRegistry } from "./registry.js";

function declarations(mode: "light" | "dark") {
  return betterCodexDesignTokenRegistry
    .filter(token => token.scope !== "local" && (mode === "light" || token.dark !== undefined))
    .map(token => `      ${token.name}: ${mode === "dark" ? token.dark : token.light};`)
    .join("\n");
}

export function betterCodexDesignTokensCss() {
  return String.raw`
    :root {
${declarations("light")}
    }

    html.electron-dark, html.dark, html[data-theme="dark"] {
${declarations("dark")}
    }
  `;
}
