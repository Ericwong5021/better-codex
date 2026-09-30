import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, writeFile, copyFile, cp, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";

const digest = bytes => createHash("sha256").update(bytes).digest("hex");
const nodeVersion = "22.22.0";
const run = (command, args) => execFileSync(command, args, { stdio: "inherit" });

export async function packageDmg({ root, output, archive, archiveDigest, version, architecture }) {
  const identity = process.env.BETTER_CODEX_MACOS_SIGN_IDENTITY || "-";
  const notaryProfile = process.env.BETTER_CODEX_MACOS_NOTARY_PROFILE;
  if (process.env.BETTER_CODEX_REQUIRE_MACOS_SIGNING === "1" && (identity === "-" || !notaryProfile)) throw new Error("macos_distribution_signing_and_notarization_required");
  const notaryKeychain = process.env.BETTER_CODEX_MACOS_KEYCHAIN;
  const notarize = path => run("xcrun", ["notarytool", "submit", path, "--keychain-profile", notaryProfile,
    ...(notaryKeychain ? ["--keychain", notaryKeychain] : []), "--wait"]);
  const work = await mkdtemp(join(tmpdir(), "better-codex-dmg-"));
  const name = `better-codex-${version}-darwin-${architecture}.dmg`;
  const destination = join(output, name);
  try {
    const stage = join(work, "volume");
    const app = join(stage, "Better Codex.app");
    const contents = join(app, "Contents");
    const resources = join(contents, "Resources");
    await mkdir(join(contents, "MacOS"), { recursive: true });
    await mkdir(resources, { recursive: true });
    const executable = join(root, "build/macos/better-codex-menubar");
    await copyFile(executable, join(contents, "MacOS/better-codex-menubar"));
    await copyFile(join(root, "assets/AppIcon.icns"), join(resources, "AppIcon.icns"));
    await copyFile(join(root, "assets/menubar-template.png"), join(resources, "MenuBarTemplate.png"));
    await copyFile(join(root, "scripts/install.sh"), join(resources, "install.sh"));
    await copyFile(archive, join(resources, basename(archive)));
    await writeFile(join(resources, "checksums.txt"), `${archiveDigest}  ${basename(archive)}\n`);
    await writeFile(join(resources, "desktop-payload.json"), JSON.stringify({ version, archive: basename(archive), sha256: archiveDigest }));
    await writeFile(join(resources, "desktop-bundle.json"), JSON.stringify({ kind: "better-codex-desktop", schemaVersion: 1, executableSha256: digest(await readFile(executable)) }));
    await writeFile(join(contents, "Info.plist"), `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
<key>CFBundleIdentifier</key><string>com.better-codex.launcher</string>
<key>CFBundleName</key><string>Better Codex</string>
<key>CFBundleDisplayName</key><string>Better Codex</string>
<key>CFBundleExecutable</key><string>better-codex-menubar</string>
<key>CFBundlePackageType</key><string>APPL</string>
<key>CFBundleShortVersionString</key><string>${version}</string>
<key>CFBundleVersion</key><string>${version.replace(/-beta\./, ".")}</string>
<key>CFBundleIconFile</key><string>AppIcon</string>
<key>LSUIElement</key><true/>
<key>LSMinimumSystemVersion</key><string>13.0</string>
<key>BetterCodexProfile</key><string>stable</string>
</dict></plist>\n`);

    // Never copy the build machine's Node: Homebrew/CI binaries can depend on
    // libraries absent on a clean Mac. Bundle the checksum-verified official build.
    const nodeArch = architecture === "amd64" ? "x64" : architecture;
    const nodeName = `node-v${nodeVersion}-darwin-${nodeArch}.tar.gz`;
    const cache = join(root, "build/node-downloads");
    await mkdir(cache, { recursive: true });
    const sums = await fetch(`https://nodejs.org/dist/v${nodeVersion}/SHASUMS256.txt`, { signal: AbortSignal.timeout(30_000), redirect: "error" });
    if (!sums.ok) throw new Error(`node_checksum_download_failed:${sums.status}`);
    const checksum = (await sums.text()).split("\n").find(line => line.trim().split(/\s+/)[1] === nodeName)?.split(/\s+/)[0];
    if (!checksum || !/^[a-f0-9]{64}$/.test(checksum)) throw new Error("node_checksum_missing");
    const nodeArchive = join(cache, nodeName);
    let cached = await readFile(nodeArchive).catch(() => null);
    if (!cached || digest(cached) !== checksum) {
      run("curl", ["-fL", "--connect-timeout", "15", "--max-time", "300", "--retry", "2", `https://nodejs.org/dist/v${nodeVersion}/${nodeName}`, "-o", nodeArchive]);
      cached = await readFile(nodeArchive);
    }
    if (digest(cached) !== checksum) throw new Error("node_archive_checksum_mismatch");
    run("/usr/bin/tar", ["-xzf", nodeArchive, "-C", work]);
    const nodeRoot = join(work, nodeName.replace(/\.tar\.gz$/, ""));
    await mkdir(join(resources, "node/bin"), { recursive: true });
    await copyFile(join(nodeRoot, "bin/node"), join(resources, "node/bin/node"));
    await cp(join(nodeRoot, "LICENSE"), join(resources, "node/LICENSE"));

    const entitlements = join(work, "node-entitlements.plist");
    await writeFile(entitlements, '<?xml version="1.0"?><plist version="1.0"><dict><key>com.apple.security.cs.allow-jit</key><true/></dict></plist>');
    const signing = identity === "-" ? [] : ["--timestamp", "--options", "runtime"];
    run("codesign", ["--force", "--sign", identity, ...signing, "--entitlements", entitlements, join(resources, "node/bin/node")]);
    run("codesign", ["--force", "--sign", identity, ...signing, app]);
    run("codesign", ["--verify", "--deep", "--strict", app]);
    if (notaryProfile) {
      if (identity === "-") throw new Error("notarization_requires_developer_id");
      const zip = join(work, "app.zip");
      run("ditto", ["-c", "-k", "--keepParent", app, zip]);
      notarize(zip);
      run("xcrun", ["stapler", "staple", app]);
    }
    await symlink("/Applications", join(stage, "Applications"));
    await writeFile(join(stage, "安装说明.txt"), "将 Better Codex 拖入 Applications，然后打开。\n程序静默运行，状态显示在屏幕顶部菜单栏。\n从菜单中打开 Codex 可启用任务看板；首次使用需要已安装 Codex 桌面端。\n退出 Better Codex 会停止看板服务，已有任务保留其执行进程；重新打开后同步结果。\n");
    await rm(destination, { force: true });
    run("hdiutil", ["create", "-volname", "Better Codex", "-srcfolder", stage, "-format", "UDZO", "-ov", destination]);
    if (identity !== "-") run("codesign", ["--sign", identity, "--timestamp", destination]);
    if (notaryProfile) {
      notarize(destination);
      run("xcrun", ["stapler", "staple", destination]);
      run("xcrun", ["stapler", "validate", destination]);
    }
    console.log(JSON.stringify({ dmg: destination, signing: identity === "-" ? "ad-hoc-local-testing" : "developer-id", notarized: Boolean(notaryProfile) }));
    return { name, sha256: digest(await readFile(destination)) };
  } finally { await rm(work, { recursive: true, force: true }); }
}
