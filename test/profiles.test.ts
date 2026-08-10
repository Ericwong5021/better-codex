import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const configSource = readFileSync(new URL("../src/config.ts", import.meta.url), "utf8");
const cliSource = readFileSync(new URL("../src/cli.ts", import.meta.url), "utf8");
const updaterSource = readFileSync(new URL("../src/updater.ts", import.meta.url), "utf8");
const cdpSource = readFileSync(new URL("../src/cdp.ts", import.meta.url), "utf8");
const domSource = readFileSync(new URL("../src/dom.ts", import.meta.url), "utf8");
const serviceSource = readFileSync(new URL("../src/service.ts", import.meta.url), "utf8");
const launchIntegrationSource = readFileSync(new URL("../src/launch-integration.ts", import.meta.url), "utf8");
const refreshSource = readFileSync(new URL("../scripts/refresh-local-install.mjs", import.meta.url), "utf8");
const refreshInjectorSource = readFileSync(new URL("../scripts/refresh-injector.mjs", import.meta.url), "utf8");
const developmentInstaller = readFileSync(new URL("../scripts/development-instance.mjs", import.meta.url), "utf8");
const runtimeStateSource = readFileSync(new URL("../src/runtime-state.ts", import.meta.url), "utf8");

test("stable and development profiles use isolated homes and one shared launch lock", () => {
  assert.match(configSource, /BetterCodexProfile = "stable" \| "development"/);
  assert.match(configSource, /"\.better-codex-dev" : "\.better-codex"/);
  assert.match(configSource, /peerBetterCodexHome/);
  assert.match(configSource, /"\.better-codex-launch\.lock"/);
  assert.match(configSource, /"\.better-codex-launch-intents"/);
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
  assert.match(updaterSource, /coreUpdateSupported: isSea\(\)/);
  assert.match(updaterSource, /const coreAvailable = Boolean\(isSea\(\) && result\.core\?\.available\)/);
  assert.match(domSource, /update\?\.coreUpdateSupported === false/);
  assert.match(domSource, /源码开发版仅检查兼容层更新/);
  assert.match(domSource, /profile: PROFILE/);
});

test("Windows shortcut status expands JSON arrays on Windows PowerShell 5.1", () => {
  assert.match(launchIntegrationSource, /ConvertFrom-Json -InputObject \$json/);
  assert.match(launchIntegrationSource, /\$items\[0\] -is \[Array\]/);
});
