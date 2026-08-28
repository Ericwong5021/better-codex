import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { chmod, copyFile, cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import { javascriptStringLiteral } from "./javascript-literal.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const packageJson = JSON.parse(await readFile(join(root, "package.json"), "utf8"));
const platform = process.platform === "darwin" ? "darwin" : process.platform;
const architecture = process.arch === "x64" ? "amd64" : process.arch;
if (!["darwin", "win32"].includes(platform) || !["arm64", "amd64"].includes(architecture)) throw new Error("package_platform_unsupported");
if (platform === "win32" && architecture !== "amd64") throw new Error("package_architecture_unsupported");

const work = await mkdtemp(join(tmpdir(), "better-codex-package-"));
const output = join(root, "release");
const bundleName = "better-codex.cjs";
const bundle = join(work, bundleName);
const packageRoot = join(work, "package");
const archiveName = `better-codex-cli-${packageJson.version}-${platform}-${architecture}.${platform === "win32" ? "zip" : "tar.gz"}`;
const archive = join(output, archiveName);
const coreName = `better-codex-core-${packageJson.version}-${platform}-${architecture}`;
const embedSkill = {
  name: "embed-skill",
  setup(buildApi) {
    buildApi.onLoad({ filter: /[/\\]bundled-skill\.ts$/ }, () => {
      const skill = readFileSync(join(root, "skills", "better-codex", "SKILL.md"), "utf8");
      const interfaceMetadata = readFileSync(join(root, "skills", "better-codex", "agents", "openai.yaml"), "utf8");
      return {
        contents: `export function bundledBetterCodexSkill(){return{skill:${javascriptStringLiteral(skill)},interface:${javascriptStringLiteral(interfaceMetadata)}}}\n`,
        loader: "js",
      };
    });
  },
};
const embedBrandAssets = {
  name: "embed-brand-assets",
  setup(buildApi) {
    buildApi.onLoad({ filter: /[/\\]brand-assets\.ts$/ }, () => {
      const icns = readFileSync(join(root, "assets", "AppIcon.icns")).toString("base64");
      const ico = readFileSync(join(root, "assets", "AppIcon.ico")).toString("base64");
      const logo = readFileSync(join(root, "assets", "better-codex.png")).toString("base64");
      const webIcon192 = readFileSync(join(root, "assets", "web", "better-codex-icon-192.png")).toString("base64");
      const webIcon512 = readFileSync(join(root, "assets", "web", "better-codex-icon-512.png")).toString("base64");
      const agentAvatarIds = ["codex", "reviewer", "frontend", "debugger", "bot", "terminal", "wrench", "code", "test", "docs", "shield", "database", "sparkles"];
      const agentAvatars = Object.fromEntries(agentAvatarIds.map(id => [id, readFileSync(join(root, "assets", "agent-avatars", `${id}.png`)).toString("base64")]));
      return {
        contents: `export function appIconIcns(){return Buffer.from(${javascriptStringLiteral(icns)},"base64")}
export function appIconIco(){return Buffer.from(${javascriptStringLiteral(ico)},"base64")}
export function betterCodexLogoPng(){return Buffer.from(${javascriptStringLiteral(logo)},"base64")}
export function betterCodexWebIconPng(size){return Buffer.from(size===192?${javascriptStringLiteral(webIcon192)}:${javascriptStringLiteral(webIcon512)},"base64")}
const agentAvatars=${JSON.stringify(agentAvatars)}
export function agentAvatarPng(id){const value=agentAvatars[id];if(!value)throw new Error("agent_avatar_asset_invalid:"+id);return Buffer.from(value,"base64")}
export function agentAvatarPngDataUrl(id){return "data:image/png;base64,"+agentAvatarPng(id).toString("base64")}
`,
        loader: "js",
      };
    });
  },
};

try {
  await build({
    entryPoints: [join(root, "src", "cli.ts")],
    bundle: true,
    platform: "node",
    format: "cjs",
    target: "node22",
    outfile: bundle,
    define: { __BETTER_CODEX_PACKAGED__: "true" },
    plugins: [embedSkill, embedBrandAssets],
  });
  await chmod(bundle, 0o755);
  const versionEnv = { ...process.env, BETTER_CODEX_HOME: join(work, "home"), BETTER_CODEX_DISABLE_DELEGATION: "1", CODEX_HOME: join(work, "codex") };
  const versionOutput = execFileSync(process.execPath, [bundle, "version", "--json"], { encoding: "utf8", env: versionEnv });
  const versions = JSON.parse(versionOutput);
  if (versions.core !== packageJson.version || (versions.managedCore && versions.managedCore !== packageJson.version)) {
    throw new Error(`package_version_mismatch: expected ${packageJson.version}, got core ${versions.core || "unknown"} managed ${versions.managedCore || "unknown"}`);
  }
  const mcpOutput = execFileSync(process.execPath, [bundle, "mcp"], {
    encoding: "utf8",
    env: versionEnv,
    input: `${JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-06-18" } })}\n${JSON.stringify({ jsonrpc: "2.0", id: 2, method: "tools/list", params: {} })}\n`,
  }).trim().split("\n").map(line => JSON.parse(line));
  const mcpInitialize = mcpOutput.find(message => message.id === 1);
  const mcpTools = mcpOutput.find(message => message.id === 2);
  if (mcpInitialize?.result?.serverInfo?.version !== packageJson.version || !mcpTools?.result?.tools?.some(tool => tool.name === "board")) throw new Error("package_mcp_validation_failed");
  execFileSync(process.execPath, [bundle, "version"], { stdio: "inherit", env: versionEnv });
  await mkdir(output, { recursive: true });
  await copyFile(bundle, join(output, coreName));
  await mkdir(packageRoot, { recursive: true });
  await copyFile(bundle, join(packageRoot, bundleName));
  if (platform === "win32") {
    await writeFile(join(packageRoot, "better-codex.cmd"), "@echo off\r\nnode.exe \"%~dp0better-codex.cjs\" %*\r\n", { mode: 0o755 });
  } else {
    await writeFile(join(packageRoot, "better-codex"), "#!/bin/sh\nexec node \"$(dirname \"$0\")/better-codex.cjs\" \"$@\"\n", { mode: 0o755 });
  }
  await copyFile(join(root, "assets", "update-public-key.pem"), join(packageRoot, "update-public-key.pem"));
  await cp(join(root, "skills", "better-codex"), join(packageRoot, "skills", "better-codex"), { recursive: true });
  if (platform === "win32") {
    execFileSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", `Compress-Archive -Path '${join(packageRoot, "*").replace(/'/g, "''")}' -DestinationPath '${archive.replace(/'/g, "''")}' -Force`], { stdio: "inherit" });
  } else {
    execFileSync("/usr/bin/tar", ["-czf", archive, "-C", packageRoot, "."], { stdio: "inherit" });
  }
  const digest = createHash("sha256").update(await readFile(archive)).digest("hex");
  await writeFile(join(output, "checksums.txt"), `${digest}  ${archiveName}\n`);
  console.log(JSON.stringify({ archive, checksum: digest }));
} finally {
  await rm(work, { recursive: true, force: true });
}
