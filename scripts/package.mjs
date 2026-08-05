import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { chmod, copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const packageJson = JSON.parse(await readFile(join(root, "package.json"), "utf8"));
const platform = process.platform === "darwin" ? "darwin" : process.platform;
const architecture = process.arch === "x64" ? "amd64" : process.arch;
if (platform !== "darwin" || !["arm64", "amd64"].includes(architecture)) throw new Error("package_requires_macos");

const work = await mkdtemp(join(tmpdir(), "tilo-package-"));
const output = join(root, "release");
const bundle = join(work, "tilo.cjs");
const blob = join(work, "tilo.blob");
const executable = join(work, "tilo");
const archiveName = `tilo-cli-${packageJson.version}-${platform}-${architecture}.tar.gz`;
const archive = join(output, archiveName);

try {
  await build({ entryPoints: [join(root, "src", "cli.ts")], bundle: true, platform: "node", format: "cjs", target: "node22", outfile: bundle });
  await writeFile(join(work, "sea.json"), JSON.stringify({ main: bundle, output: blob, disableExperimentalSEAWarning: true }));
  execFileSync(process.execPath, ["--experimental-sea-config", join(work, "sea.json")], { stdio: "inherit" });
  await copyFile(process.execPath, executable);
  execFileSync("/usr/bin/codesign", ["--remove-signature", executable], { stdio: "ignore" });
  execFileSync(process.execPath, [
    join(root, "node_modules", "postject", "dist", "cli.js"),
    executable,
    "NODE_SEA_BLOB",
    blob,
    "--sentinel-fuse",
    "NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2",
    "--macho-segment-name",
    "NODE_SEA",
  ], { stdio: "inherit" });
  await chmod(executable, 0o755);
  execFileSync("/usr/bin/codesign", ["--sign", "-", "--force", executable], { stdio: "inherit" });
  execFileSync(executable, ["version"], { stdio: "inherit", env: { ...process.env, TILO_HOME: join(work, "home") } });
  await mkdir(output, { recursive: true });
  execFileSync("/usr/bin/tar", ["-czf", archive, "-C", work, "tilo"], { stdio: "inherit" });
  const digest = createHash("sha256").update(await readFile(archive)).digest("hex");
  await writeFile(join(output, "checksums.txt"), `${digest}  ${archiveName}\n`);
  console.log(JSON.stringify({ archive, checksum: digest }));
} finally {
  await rm(work, { recursive: true, force: true });
}
