import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";

if (process.platform === "darwin") {
  mkdirSync("build/macos", { recursive: true });
  const arch = process.arch === "arm64" ? "arm64" : "x86_64";
  execFileSync("xcrun", ["swiftc", "-O", "-swift-version", "5", "-target", `${arch}-apple-macosx13.0`,
    "native/macos/MenuBar.swift", "-o", resolve("build/macos/better-codex-menubar")], { stdio: "inherit" });
  execFileSync("codesign", ["--force", "--sign", "-", "build/macos/better-codex-menubar"], { stdio: "inherit" });
}
