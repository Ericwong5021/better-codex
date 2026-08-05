import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

const args = process.argv.slice(2);

function option(name) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

const version = option("--version");
const checksumsPath = option("--checksums");
const output = option("--output");
if (!version || !checksumsPath || !output) throw new Error("formula_arguments_required");

const checksums = new Map((await readFile(checksumsPath, "utf8"))
  .trim()
  .split("\n")
  .map(line => line.trim().split(/\s+/))
  .map(([digest, filename]) => [filename, digest]));
const arm64 = checksums.get(`better-codex-cli-${version}-darwin-arm64.tar.gz`);
const amd64 = checksums.get(`better-codex-cli-${version}-darwin-amd64.tar.gz`);
if (!arm64 || !amd64) throw new Error("formula_checksums_incomplete");

await mkdir(dirname(output), { recursive: true });
await writeFile(output, `class BetterCodex < Formula
  desc "Local task board for Codex desktop"
  homepage "https://github.com/Ericwong5021/better-codex"
  version "${version}"

  on_arm do
    url "https://github.com/Ericwong5021/better-codex/releases/download/v#{version}/better-codex-cli-#{version}-darwin-arm64.tar.gz"
    sha256 "${arm64}"
  end

  on_intel do
    url "https://github.com/Ericwong5021/better-codex/releases/download/v#{version}/better-codex-cli-#{version}-darwin-amd64.tar.gz"
    sha256 "${amd64}"
  end

  def install
    bin.install "better-codex"
  end

  test do
    assert_match version.to_s, shell_output("#{bin}/better-codex version")
  end
end
`);
