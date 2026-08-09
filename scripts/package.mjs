import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { chmod, copyFile, cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const packageJson = JSON.parse(await readFile(join(root, "package.json"), "utf8"));
const platform = process.platform === "darwin" ? "darwin" : process.platform;
const architecture = process.arch === "x64" ? "amd64" : process.arch;
if (!["darwin", "win32"].includes(platform) || !["arm64", "amd64"].includes(architecture)) throw new Error("package_platform_unsupported");
if (platform === "win32" && architecture !== "amd64") throw new Error("package_architecture_unsupported");

const work = await mkdtemp(join(tmpdir(), "better-codex-package-"));
const output = join(root, "release");
const bundle = join(work, "better-codex.cjs");
const blob = join(work, "better-codex.blob");
const executableName = platform === "win32" ? "better-codex.exe" : "better-codex";
const executable = join(work, executableName);
const packageRoot = join(work, "package");
const archiveName = `better-codex-cli-${packageJson.version}-${platform}-${architecture}.${platform === "win32" ? "zip" : "tar.gz"}`;
const archive = join(output, archiveName);
const coreName = `better-codex-core-${packageJson.version}-${platform}-${architecture}`;
const embedBrandAssets = {
  name: "embed-brand-assets",
  setup(buildApi) {
    buildApi.onLoad({ filter: /[/\\]brand-assets\.ts$/ }, () => {
      const icns = readFileSync(join(root, "assets", "AppIcon.icns")).toString("base64");
      const ico = readFileSync(join(root, "assets", "AppIcon.ico")).toString("base64");
      const logo = readFileSync(join(root, "assets", "better-codex.png")).toString("base64");
      return {
        contents: `export function appIconIcns(){return Buffer.from(${JSON.stringify(icns)},"base64")}
export function appIconIco(){return Buffer.from(${JSON.stringify(ico)},"base64")}
export function betterCodexLogoPng(){return Buffer.from(${JSON.stringify(logo)},"base64")}
`,
        loader: "js",
      };
    });
  },
};

try {
  await build({ entryPoints: [join(root, "src", "cli.ts")], bundle: true, platform: "node", format: "cjs", target: "node22", outfile: bundle, plugins: [embedBrandAssets] });
  await writeFile(join(work, "sea.json"), JSON.stringify({ main: bundle, output: blob, disableExperimentalSEAWarning: true }));
  execFileSync(process.execPath, ["--experimental-sea-config", join(work, "sea.json")], { stdio: "inherit" });
  await copyFile(process.execPath, executable);
  if (platform === "darwin") execFileSync("/usr/bin/codesign", ["--remove-signature", executable], { stdio: "ignore" });
  const postjectArgs = [
    join(root, "node_modules", "postject", "dist", "cli.js"),
    executable,
    "NODE_SEA_BLOB",
    blob,
    "--sentinel-fuse",
    "NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2",
  ];
  if (platform === "darwin") postjectArgs.push("--macho-segment-name", "NODE_SEA");
  execFileSync(process.execPath, postjectArgs, { stdio: "inherit" });
  await chmod(executable, 0o755);
  if (platform === "darwin") {
    const identity = process.env.BETTER_CODEX_CODESIGN_IDENTITY || "-";
    if (process.env.BETTER_CODEX_REQUIRE_SIGNING === "1" && identity === "-") throw new Error("macos_signing_identity_required");
    const signArgs = ["--sign", identity, "--force"];
    if (identity !== "-") signArgs.push("--options", "runtime", "--timestamp");
    signArgs.push(executable);
    execFileSync("/usr/bin/codesign", signArgs, { stdio: "inherit" });
  } else if (platform === "win32") {
    const certificate = process.env.BETTER_CODEX_WINDOWS_PFX_BASE64;
    const password = process.env.BETTER_CODEX_WINDOWS_PFX_PASSWORD;
    if (process.env.BETTER_CODEX_REQUIRE_SIGNING === "1" && (!certificate || !password)) throw new Error("windows_signing_certificate_required");
    if (certificate && password) {
      const certificatePath = join(work, "codesign.pfx");
      await writeFile(certificatePath, Buffer.from(certificate, "base64"), { mode: 0o600 });
      const signtool = execFileSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", "$path = (Get-Command signtool.exe -ErrorAction SilentlyContinue).Source; if (-not $path) { $path = (Get-ChildItem \"${env:ProgramFiles(x86)}\\Windows Kits\\10\\bin\\*\\x64\\signtool.exe\" | Sort-Object FullName -Descending | Select-Object -First 1 -ExpandProperty FullName) }; if (-not $path) { exit 1 }; $path"], { encoding: "utf8", windowsHide: true }).trim();
      execFileSync(signtool, ["sign", "/fd", "SHA256", "/f", certificatePath, "/p", password, "/tr", "http://timestamp.digicert.com", "/td", "SHA256", executable], { stdio: "inherit" });
    }
  }
  const versionEnv = { ...process.env, BETTER_CODEX_HOME: join(work, "home"), BETTER_CODEX_DISABLE_DELEGATION: "1" };
  const versionOutput = execFileSync(executable, ["version", "--json"], { encoding: "utf8", env: versionEnv });
  const versions = JSON.parse(versionOutput);
  if (versions.core !== packageJson.version || (versions.managedCore && versions.managedCore !== packageJson.version)) {
    throw new Error(`package_version_mismatch: expected ${packageJson.version}, got core ${versions.core || "unknown"} managed ${versions.managedCore || "unknown"}`);
  }
  execFileSync(executable, ["version"], { stdio: "inherit", env: versionEnv });
  await mkdir(output, { recursive: true });
  await copyFile(executable, join(output, coreName));
  await mkdir(packageRoot, { recursive: true });
  await copyFile(executable, join(packageRoot, executableName));
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
