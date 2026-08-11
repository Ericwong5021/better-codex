import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { Store } from "../src/db.js";
import { canonicalPath, packagedLibexecSkillsPath } from "../src/config.js";

const configSource = readFileSync(new URL("../src/config.ts", import.meta.url), "utf8");
const cliSource = readFileSync(new URL("../src/cli.ts", import.meta.url), "utf8");
const codexCliSource = readFileSync(new URL("../src/codex-cli.ts", import.meta.url), "utf8");
const updaterSource = readFileSync(new URL("../src/updater.ts", import.meta.url), "utf8");
const cdpSource = readFileSync(new URL("../src/cdp.ts", import.meta.url), "utf8");
const domSource = readFileSync(new URL("../src/dom.ts", import.meta.url), "utf8");
const serviceSource = readFileSync(new URL("../src/service.ts", import.meta.url), "utf8");
const launchIntegrationSource = readFileSync(new URL("../src/launch-integration.ts", import.meta.url), "utf8");
const refreshSource = readFileSync(new URL("../scripts/refresh-local-install.mjs", import.meta.url), "utf8");
const refreshInjectorSource = readFileSync(new URL("../scripts/refresh-injector.mjs", import.meta.url), "utf8");
const developmentInstaller = readFileSync(new URL("../scripts/development-instance.mjs", import.meta.url), "utf8");
const runtimeStateSource = readFileSync(new URL("../src/runtime-state.ts", import.meta.url), "utf8");

test("packaged skill lookup follows Homebrew prefix symlinks into the Cellar", () => {
  const directory = mkdtempSync(join(tmpdir(), "better-codex-homebrew-"));
  try {
    const cellarRoot = join(directory, "Cellar", "better-codex", "0.4.2");
    const cellarBin = join(cellarRoot, "bin");
    const prefix = join(directory, "prefix");
    mkdirSync(cellarBin, { recursive: true });
    mkdirSync(join(cellarRoot, "libexec", "skills"), { recursive: true });
    mkdirSync(prefix, { recursive: true });
    writeFileSync(join(cellarBin, "better-codex.cjs"), "#!/usr/bin/env node\n");
    symlinkSync(cellarBin, join(prefix, "bin"), process.platform === "win32" ? "junction" : "dir");

    assert.equal(
      packagedLibexecSkillsPath(join(prefix, "bin", "better-codex.cjs")),
      canonicalPath(join(cellarRoot, "libexec", "skills")),
    );
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("stable and development profiles isolate databases and runtime homes", () => {
  assert.match(configSource, /BetterCodexProfile = "stable" \| "development"/);
  assert.match(configSource, /"\.better-codex-dev" : "\.better-codex"/);
  assert.match(configSource, /peerBetterCodexHome/);
  assert.match(configSource, /databasePath = resolve\(configuredDatabasePath \|\| join\(betterCodexHome, "better-codex\.db"\)\)/);
  assert.match(configSource, /developmentDatabaseSnapshotSourcePath = betterCodexProfile === "development"/);
  assert.match(configSource, /resolve\(join\(peerBetterCodexHome, "better-codex\.db"\)\)/);
  assert.match(cliSource, /const sharedDataPaths = betterCodexProfile === "development"\s*\? \[\]/);
  assert.match(cliSource, /const preservedDevelopmentData = new Set/);
  assert.match(cliSource, /filter\(path => !preservedDevelopmentData\.has\(path\)\)/);
  assert.match(cliSource, /dataPreserved: betterCodexProfile === "development" \? \[databasePath\] : \[\]/);
  assert.match(configSource, /"\.better-codex-launch\.lock"/);
  assert.match(configSource, /"\.better-codex-launch-intents"/);
});

test("development database starts from one stable snapshot and then diverges", () => {
  const directory = mkdtempSync(join(tmpdir(), "better-codex-profile-db-"));
  const stableHome = join(directory, "stable");
  const developmentHome = join(directory, "development");
  const stableDatabase = join(stableHome, "better-codex.db");
  try {
    let stable = new Store(stableDatabase);
    const project = stable.createProject({ name: "Snapshot source", workspacePath: directory });
    stable.createIssue({ projectId: project.id, title: "Copied from stable" });
    stable.close();

    const environment = {
      ...process.env,
      BETTER_CODEX_PROFILE: "development",
      BETTER_CODEX_HOME: developmentHome,
      BETTER_CODEX_PEER_HOME: stableHome,
    };
    delete environment.BETTER_CODEX_DB;
    const runDevelopment = (addDevelopmentIssue: boolean) => {
      const script = `
        const { Store } = await import(${JSON.stringify(new URL("../src/db.ts", import.meta.url).href)});
        const { databasePath } = await import(${JSON.stringify(new URL("../src/config.ts", import.meta.url).href)});
        const store = new Store();
        const before = store.listIssues().map(issue => issue.title).sort();
        if (${JSON.stringify(addDevelopmentIssue)}) {
          const project = store.listProjects().find(item => item.name === "Snapshot source");
          store.createIssue({ projectId: project.id, title: "Development only" });
        }
        const after = store.listIssues().map(issue => issue.title).sort();
        store.close();
        console.log(JSON.stringify({ databasePath, before, after }));
      `;
      const result = spawnSync(process.execPath, ["--import", "tsx", "--input-type=module", "--eval", script], {
        cwd: process.cwd(),
        encoding: "utf8",
        env: environment,
      });
      assert.equal(result.status, 0, result.stderr || result.stdout);
      return JSON.parse(result.stdout.trim()) as { databasePath: string; before: string[]; after: string[] };
    };

    const first = runDevelopment(true);
    assert.equal(first.databasePath, join(developmentHome, "better-codex.db"));
    assert.deepEqual(first.before, ["Copied from stable"]);
    assert.deepEqual(first.after, ["Copied from stable", "Development only"]);

    stable = new Store(stableDatabase);
    assert.deepEqual(stable.listIssues().map(issue => issue.title), ["Copied from stable"]);
    stable.createIssue({ projectId: project.id, title: "Added to stable later" });
    stable.close();

    const second = runDevelopment(false);
    assert.deepEqual(second.before, ["Copied from stable", "Development only"]);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("profile switching disables and stops the peer before injecting", () => {
  const switchStart = cliSource.indexOf("async function deactivatePeerInstance()");
  const launchStart = cliSource.indexOf('if (command === "launch")');
  assert.ok(switchStart >= 0 && launchStart > switchStart);
  assert.match(cliSource.slice(switchStart, launchStart), /disablePeerInjection/);
  assert.match(cliSource.slice(switchStart, launchStart), /stopPeerInjector/);
  assert.match(cliSource.slice(switchStart, launchStart), /stopPeerRuntime/);
  assert.match(cliSource.slice(switchStart, launchStart), /stopPeerMacService/);
  assert.ok(cliSource.slice(switchStart, launchStart).indexOf("const peerOwnership = injectionOwnership") < cliSource.slice(switchStart, launchStart).indexOf("stopPeerRuntime"));
  assert.match(cliSource.slice(switchStart, launchStart), /cdpEject\(cdpPort, peerToken, peerOwnership\)/);
  assert.ok(cliSource.slice(switchStart, launchStart).indexOf("cdpEject") < cliSource.slice(switchStart, launchStart).lastIndexOf("return null"));
  assert.match(cliSource.slice(switchStart, launchStart), /peerInjectionState/);
  assert.match(cliSource.slice(switchStart, launchStart), /injectionRemoved && !peerWasActive/);
  assert.match(cliSource.slice(switchStart, launchStart), /injectionOwnership\(peerProfile, peerRunPath, true\)/);
  assert.match(cliSource.slice(launchStart), /const switchedFrom = await deactivatePeerInstance\(\)/);
  assert.match(cliSource, /function injectionOwnership/);
  assert.match(cliSource, /cdpEject\(selectedPort, accessToken\(\), injectionOwnership\(\)\)/);
  assert.match(cdpSource, /profile_not_active/);
  assert.match(cliSource, /betterCodexProfile === "stable" && serviceStatus\(\)\.installed/);
  assert.match(cdpSource, /betterCodexProfile === "development" && \(existing\.profile \?/);
  assert.match(cdpSource, /setInjectionEnabled\(false\)/);
  assert.match(cdpSource, /existing\.profile === betterCodexProfile/);
  assert.match(cdpSource, /foreignDevelopmentInjection/);
  assert.match(cdpSource, /await connection\.close\(\)/);
  assert.match(cdpSource, /allowLegacyProfileless/);
  assert.match(cdpSource, /recordInjectionOwnership/);
  assert.doesNotMatch(cliSource, /setImmediate\(\(\) => process\.exit/);
  assert.match(cliSource, /processStartTime/);
  assert.match(cliSource, /injector_stop_failed/);
  assert.match(runtimeStateSource, /startedAt: identity\.startedAt/);
  assert.match(runtimeStateSource, /processStartTime\(current\.pid\)/);
  assert.match(serviceSource, /betterCodexProfile === "development"/);
  assert.match(serviceSource, /development_runtime_unmanaged/);
});

test("source builds refresh only the development instance", () => {
  assert.match(refreshSource, /BETTER_CODEX_PROFILE: "development"/);
  assert.match(refreshSource, /BETTER_CODEX_PEER_HOME: stableHome/);
  assert.match(refreshSource, /"\.better-codex-dev"/);
  assert.match(refreshSource, /if \(status\.runtime\?\.ok === true\)/);
  assert.match(refreshSource, /if \(ownsInjection\) run\(\["start"\]\)/);
  assert.match(developmentInstaller, /BETTER_CODEX_PROFILE: "development"/);
  assert.match(developmentInstaller, /BETTER_CODEX_PEER_HOME: stableHome/);
  assert.match(developmentInstaller, /\["launcher", "install"\]/);
  assert.match(developmentInstaller, /stable_binary_required/);
  assert.match(developmentInstaller, /BETTER_CODEX_STABLE_EXECUTABLE/);
  assert.match(developmentInstaller, /Better Codex Launcher\.vbs/);
  assert.match(developmentInstaller, /supportsProfiles \? "launch" : "start --launch"/);
  assert.match(developmentInstaller, /dataPreserved: true/);
  assert.match(refreshInjectorSource, /target\.endpoint === expectedEndpoint/);
  assert.match(refreshInjectorSource, /\[executable, "refresh-injection"\]/);
  assert.doesNotMatch(refreshInjectorSource, /\[executable, "eject"\]/);
  assert.match(cliSource, /command === "refresh-injection"/);
  assert.match(cliSource, /runtimeBeforeRefresh/);
  assert.match(cliSource, /!runtimeBeforeRefresh && readRuntimeState\(\)/);
});

test("source mode does not advertise an unsupported core update", () => {
  assert.match(updaterSource, /const coreUpdatesSupported = isSea\(\) \|\| packagedBuild/);
  assert.match(updaterSource, /coreUpdateSupported: coreUpdatesSupported/);
  assert.match(updaterSource, /const coreAvailable = Boolean\(coreUpdatesSupported && result\.core\?\.available\)/);
  assert.match(domSource, /update\?\.coreUpdateSupported === false/);
  assert.match(domSource, /源码开发版仅检查兼容层更新/);
  assert.match(domSource, /profile: PROFILE/);
});

test("Windows shortcut status expands JSON arrays on Windows PowerShell 5.1", () => {
  assert.match(launchIntegrationSource, /ConvertFrom-Json -InputObject \$json/);
  assert.match(launchIntegrationSource, /\$items\[0\] -is \[Array\]/);
});

test("development launcher supports the stable Node bundle and legacy executable", () => {
  assert.match(developmentInstaller, /better-codex\.cjs/);
  assert.match(developmentInstaller, /better-codex\.exe/);
  assert.match(developmentInstaller, /officialExecutable\.toLowerCase\(\)\.endsWith\("\.cjs"\) \? process\.execPath/);
  assert.match(developmentInstaller, /spawnSync\(stableCommand, \[\.\.\.stableArguments, "launcher", "install"\]/);
});

test("Windows MCP discovery prefers and probes the executable local Codex CLI", () => {
  assert.match(cliSource, /requireCodexExecutablePath\(\{ applicationPath: codexInstallationStatus\(\)\.path \}\)/);
  assert.ok(codexCliSource.indexOf("windowsLocalCliCandidates") < codexCliSource.indexOf("copiedWindowsApplicationCandidates"));
  assert.match(codexCliSource, /execFileSync\(executable, \["--version"\]/);
  assert.match(codexCliSource, /timeout: 5000/);
});
