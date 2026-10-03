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
const injectedUiSource = readFileSync(new URL("../src/ui/browser-entry.ts", import.meta.url), "utf8");
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

test("desktop bridge yields across profiles without stopping peer tasks", () => {
  assert.doesNotMatch(cliSource, /deactivatePeerInstance|stopPeerRuntime|stopPeerMacService|disablePeerInjection/);
  assert.match(cdpSource, /profile_not_active/);
  assert.match(cdpSource, /existing\.profile === betterCodexProfile/);
  assert.match(cdpSource, /foreignDesktopBridge/);
  assert.match(cdpSource, /peer_profile_active/);
  assert.match(cliSource, /desktopBridgeIdentityMatches/);
  assert.match(cliSource, /legacyInjectorIdentityMatches/);
  assert.doesNotMatch(cdpSource, /allowLegacyProfileless|setInjectionEnabled|recordInjectionOwnership/);
  const ensureRuntimeStart = cliSource.indexOf("async function ensureRuntime(");
  const openWebAppStart = cliSource.indexOf("async function openWebApp()");
  assert.ok(ensureRuntimeStart >= 0 && openWebAppStart > ensureRuntimeStart);
  assert.doesNotMatch(cliSource.slice(ensureRuntimeStart, openWebAppStart), /repairServiceConfiguration\(\)/);
  const relayCommandStart = cliSource.indexOf("async function relayCommand");
  const relayStatusStart = cliSource.indexOf('if (action === "status")', relayCommandStart);
  const relayDisconnectStart = cliSource.indexOf('if (action === "disconnect")', relayStatusStart);
  assert.match(cliSource.slice(relayStatusStart, relayDisconnectStart), /await health\(\)/);
  assert.doesNotMatch(cliSource.slice(relayStatusStart, relayDisconnectStart), /ensureRuntime\(\)/);
  assert.match(cliSource, /if \(action === "repair"\) return print\(repairServiceConfiguration\(\)\)/);
  assert.match(serviceSource, /isDeepStrictEqual/);
  assert.doesNotMatch(serviceSource, /readFileSync\(launchAgentPath, "utf8"\) === servicePlist\(\)/);
  assert.match(runtimeStateSource, /startedAt: identity\.startedAt/);
  assert.match(runtimeStateSource, /processStartTime\(current\.pid\)/);
  assert.match(serviceSource, /betterCodexProfile === "development"/);
  assert.match(serviceSource, /development_runtime_unmanaged/);
  assert.match(serviceSource, /BETTER_CODEX_BASE_ENTRYPOINT/);
});

test("source builds refresh only the development instance", () => {
  assert.match(refreshSource, /BETTER_CODEX_PROFILE: "development"/);
  assert.match(refreshSource, /BETTER_CODEX_PEER_HOME: stableHome/);
  assert.match(refreshSource, /"\.better-codex-dev"/);
  assert.match(refreshSource, /if \(status\.runtime\?\.ok === true\)/);
  assert.match(refreshSource, /run\(\["start"\]\)/);
  assert.match(developmentInstaller, /BETTER_CODEX_PROFILE: "development"/);
  assert.match(developmentInstaller, /BETTER_CODEX_PEER_HOME: stableHome/);
  assert.match(developmentInstaller, /\["launcher", "install"\]/);
  assert.match(developmentInstaller, /stable_binary_required/);
  assert.match(developmentInstaller, /BETTER_CODEX_STABLE_EXECUTABLE/);
  assert.match(developmentInstaller, /Better Codex Launcher\.vbs/);
  assert.match(developmentInstaller, /supportsProfiles \? "launch" : "start --launch"/);
  assert.match(developmentInstaller, /dataPreserved: true/);
  assert.match(refreshInjectorSource, /page_injection_retired/);
  assert.doesNotMatch(refreshInjectorSource, /spawnSync|refresh-injection/);
  assert.match(cliSource, /page_injection_retired/);

});

test("source mode does not advertise an unsupported core update", () => {
  assert.match(updaterSource, /const coreUpdatesSupported = isSea\(\) \|\| packagedBuild/);
  assert.match(updaterSource, /coreUpdateSupported: coreUpdatesSupported/);
  assert.match(updaterSource, /const coreAvailable = Boolean\(coreUpdatesSupported && result\.core\?\.available\)/);
  assert.match(injectedUiSource, /update\?\.coreUpdateSupported === false/);
  assert.match(injectedUiSource, /源码开发版仅检查兼容层更新/);
  assert.match(injectedUiSource, /profile: PROFILE/);
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
