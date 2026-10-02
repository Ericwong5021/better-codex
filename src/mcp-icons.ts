import { SquareKanban } from "lucide-static";

export function taskBoardIconSvg(theme: "light" | "dark" = "light") {
  return SquareKanban.trim()
    .replace('stroke="currentColor"', `stroke="${theme === "dark" ? "white" : "black"}"`)
    .replace('stroke-width="2"', 'stroke-width="1.8"');
}

export function betterCodexMcpIcons() {
  return (["light", "dark"] as const).map(theme => ({
    src: `data:image/svg+xml;base64,${Buffer.from(taskBoardIconSvg(theme)).toString("base64")}`,
    mimeType: "image/svg+xml",
    sizes: ["any"],
    theme,
  }));
}
