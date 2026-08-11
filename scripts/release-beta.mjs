import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { betaVersionPattern, compareReleaseVersions, nextBetaVersion, stableVersionPattern } from "./release-version.mjs";

export { nextBetaVersion };

const defaultRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function localDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function readReleaseSources(root) {
  return {
    packageJson: readFileSync(join(root, "package.json"), "utf8"),
    packageLock: readFileSync(join(root, "package-lock.json"), "utf8"),
    compatibility: readFileSync(join(root, "src", "compatibility.ts"), "utf8"),
    changelog: readFileSync(join(root, "CHANGELOG.md"), "utf8"),
  };
}

function writeReleaseSources(root, sources) {
  writeFileSync(join(root, "package.json"), sources.packageJson);
  writeFileSync(join(root, "package-lock.json"), sources.packageLock);
  writeFileSync(join(root, "src", "compatibility.ts"), sources.compatibility);
  writeFileSync(join(root, "CHANGELOG.md"), sources.changelog);
}

function restoreReleaseSources(root, original, prepared) {
  const current = readReleaseSources(root);
  const paths = {
    packageJson: "package.json",
    packageLock: "package-lock.json",
    compatibility: "src/compatibility.ts",
    changelog: "CHANGELOG.md",
  };
  const conflicts = Object.keys(paths).filter(key => current[key] !== prepared[key] && current[key] !== original[key]);
  if (conflicts.length) {
    throw new Error(`Rollback refused because these release sources changed during verification: ${conflicts.map(key => paths[key]).join(", ")}.`);
  }
  writeReleaseSources(root, original);
}

function packageVersion(source, label) {
  let parsed;
  try {
    parsed = JSON.parse(source);
  } catch {
    throw new Error(`${label} is not valid JSON.`);
  }
  if (typeof parsed.version !== "string") throw new Error(`${label} does not contain a version.`);
  return parsed.version;
}

function lockVersion(source) {
  let parsed;
  try {
    parsed = JSON.parse(source);
  } catch {
    throw new Error("package-lock.json is not valid JSON.");
  }
  return { top: parsed.version, root: parsed.packages?.[""]?.version };
}

function coreVersion(source) {
  return source.match(/export const coreVersion = "([^"]+)"/)?.[1] || "";
}

function changelogSection(changelog, version) {
  const heading = new RegExp(`^## \\[${escapeRegExp(version)}\\] - \\d{4}-\\d{2}-\\d{2}$`, "gm");
  const matches = [...changelog.matchAll(heading)];
  if (matches.length !== 1) throw new Error(`CHANGELOG.md must contain exactly one dated section for ${version}.`);
  const start = matches[0].index + matches[0][0].length;
  const next = changelog.slice(start).search(/^## \[/m);
  return changelog.slice(start, next === -1 ? changelog.length : start + next);
}

function validateCurrentReleaseSources(sources) {
  const version = packageVersion(sources.packageJson, "package.json");
  const lock = lockVersion(sources.packageLock);
  const core = coreVersion(sources.compatibility);
  if (!stableVersionPattern.test(version) && !betaVersionPattern.test(version)) {
    throw new Error(`Current package version ${version} is not a stable or Beta release version.`);
  }
  if (lock.top !== version || lock.root !== version || core !== version) {
    throw new Error(`Current version sources are not synchronized: package=${version} lock=${lock.root || lock.top || "missing"} core=${core || "missing"}.`);
  }
  const section = changelogSection(sources.changelog, version);
  if (!/^- /m.test(section)) throw new Error(`CHANGELOG.md must contain at least one change for current version ${version}.`);
  const versionLinks = sources.changelog.split(/\r?\n/).filter(line => line.startsWith(`[${version}]:`));
  if (versionLinks.length !== 1) throw new Error(`CHANGELOG.md must contain exactly one link for current version ${version}.`);
  const unreleasedLines = sources.changelog.split(/\r?\n/).filter(line => line.startsWith("[Unreleased]:"));
  if (unreleasedLines.length !== 1 || !unreleasedLines[0].endsWith(`/compare/v${version}...HEAD`)) {
    throw new Error(`The current Unreleased changelog link must start after v${version}.`);
  }
  return { version };
}

export function validateBetaSources(sources, expectedVersion, expectedTag = "") {
  const version = packageVersion(sources.packageJson, "package.json");
  const lock = lockVersion(sources.packageLock);
  const core = coreVersion(sources.compatibility);
  if (!betaVersionPattern.test(version)) throw new Error(`Package version ${version} is not a Beta version.`);
  if (expectedVersion && version !== expectedVersion) throw new Error(`Package version ${version} does not match expected version ${expectedVersion}.`);
  if (lock.top !== version || lock.root !== version || core !== version) {
    throw new Error(`Version mismatch: package=${version} lock=${lock.root || lock.top || "missing"} core=${core || "missing"}.`);
  }
  if (expectedTag && expectedTag !== `v${version}`) throw new Error(`Preview tag ${expectedTag} does not match package version ${version}.`);

  const section = changelogSection(sources.changelog, version);
  if (!/^- /m.test(section)) throw new Error(`CHANGELOG.md must contain at least one change for ${version}.`);
  const linkPattern = new RegExp(`^\\[${escapeRegExp(version)}\\]: .+\\.\\.\\.v${escapeRegExp(version)}$`, "gm");
  if ([...sources.changelog.matchAll(linkPattern)].length !== 1) throw new Error(`CHANGELOG.md must contain exactly one comparison link for ${version}.`);
  const unreleased = `[Unreleased]:`;
  const expectedUnreleasedSuffix = `/compare/v${version}...HEAD`;
  const unreleasedLines = sources.changelog.split(/\r?\n/).filter(line => line.startsWith(unreleased));
  if (unreleasedLines.length !== 1 || !unreleasedLines[0].endsWith(expectedUnreleasedSuffix)) {
    throw new Error(`The Unreleased changelog link must start after v${version}.`);
  }
  return { version };
}

function replacePackageVersion(source, version, label) {
  const replaced = source.replace(/^(  "version": ")[^"]+("[,]?)$/m, `$1${version}$2`);
  if (replaced === source) throw new Error(`${label} version field could not be updated.`);
  return replaced;
}

function replaceLockVersions(source, version) {
  let count = 0;
  const replaced = source.replace(/^([ ]{2,6}"version": ")[^"]+("[,]?)$/gm, (line, prefix, suffix) => {
    if (count >= 2) return line;
    count += 1;
    return `${prefix}${version}${suffix}`;
  });
  if (count !== 2) throw new Error("package-lock.json version fields could not be updated.");
  return replaced;
}

function replaceCoreVersion(source, version) {
  const replaced = source.replace(/(export const coreVersion = ")[^"]+(";)/, `$1${version}$2`);
  if (replaced === source) throw new Error("src/compatibility.ts coreVersion could not be updated.");
  return replaced;
}

function releaseChangelog(source, currentVersion, nextVersion, date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error(`Invalid release date ${date}.`);
  if (source.includes(`## [${nextVersion}] - `) || source.includes(`[${nextVersion}]:`)) {
    throw new Error(`CHANGELOG.md already contains ${nextVersion}.`);
  }
  const newline = source.includes("\r\n") ? "\r\n" : "\n";
  const headingMatch = /^## \[Unreleased\]\r?$/m.exec(source);
  if (!headingMatch) throw new Error("CHANGELOG.md does not contain an Unreleased section.");
  const headingEnd = headingMatch.index + headingMatch[0].length;
  const bodyStart = source.indexOf("\n", headingEnd) + 1;
  const nextHeadingOffset = source.slice(bodyStart).search(/^## \[/m);
  if (bodyStart === 0 || nextHeadingOffset === -1) throw new Error("CHANGELOG.md Unreleased section is malformed.");
  const nextHeading = bodyStart + nextHeadingOffset;
  const body = source.slice(bodyStart, nextHeading).trim();
  if (!/^- /m.test(body)) throw new Error("CHANGELOG.md Unreleased must contain at least one change before preparing a Beta.");

  const released = `${source.slice(0, bodyStart)}${newline}## [${nextVersion}] - ${date}${newline}${newline}${body}${newline}${newline}${source.slice(nextHeading)}`;
  const linkPattern = /^(\[Unreleased\]: )(https:\/\/github\.com\/[^/]+\/[^/]+\/compare\/)v[^ ]+\.\.\.HEAD$/m;
  const link = linkPattern.exec(released);
  if (!link) throw new Error("CHANGELOG.md Unreleased comparison link is malformed.");
  const replacement = `${link[1]}${link[2]}v${nextVersion}...HEAD${newline}[${nextVersion}]: ${link[2]}v${currentVersion}...v${nextVersion}`;
  return released.replace(linkPattern, replacement);
}

export function prepareBetaRelease(root, requestedVersion = "", date = localDate()) {
  const sources = readReleaseSources(root);
  const { version: currentVersion } = validateCurrentReleaseSources(sources);
  const nextVersion = requestedVersion || nextBetaVersion(currentVersion);
  if (!betaVersionPattern.test(nextVersion)) throw new Error(`Target version ${nextVersion} must match X.Y.Z-beta.N.`);
  if (compareReleaseVersions(nextVersion, currentVersion) <= 0) throw new Error(`Target version ${nextVersion} must be newer than ${currentVersion}.`);

  const prepared = {
    packageJson: replacePackageVersion(sources.packageJson, nextVersion, "package.json"),
    packageLock: replaceLockVersions(sources.packageLock, nextVersion),
    compatibility: replaceCoreVersion(sources.compatibility, nextVersion),
    changelog: releaseChangelog(sources.changelog, currentVersion, nextVersion, date),
  };
  validateBetaSources(prepared, nextVersion);

  try {
    writeReleaseSources(root, prepared);
  } catch (error) {
    try {
      restoreReleaseSources(root, sources, prepared);
    } catch (rollbackError) {
      const detail = rollbackError instanceof Error ? rollbackError.message : "unknown rollback error";
      throw new AggregateError([error, rollbackError], `Beta release preparation failed and rollback was not safe: ${detail}`);
    }
    throw error;
  }
  return { currentVersion, nextVersion };
}

export function validateBetaRelease(root, expectedVersion = "", expectedTag = "") {
  return validateBetaSources(readReleaseSources(root), expectedVersion, expectedTag);
}

export function prepareAndVerifyBetaRelease(root, requestedVersion, date, verify) {
  const original = readReleaseSources(root);
  let prepared = original;
  try {
    const result = prepareBetaRelease(root, requestedVersion, date);
    prepared = readReleaseSources(root);
    verify();
    validateBetaRelease(root, result.nextVersion);
    return result;
  } catch (error) {
    try {
      restoreReleaseSources(root, original, prepared);
    } catch (rollbackError) {
      const detail = rollbackError instanceof Error ? rollbackError.message : "unknown rollback error";
      throw new AggregateError([error, rollbackError], `Beta release verification failed and rollback was not safe: ${detail}`);
    }
    throw error;
  }
}

function runNpm(root, args) {
  const npmCli = process.env.npm_execpath;
  if (npmCli) {
    execFileSync(process.execPath, [npmCli, ...args], { cwd: root, stdio: "inherit" });
    return;
  }
  execFileSync(process.platform === "win32" ? "npm.cmd" : "npm", args, { cwd: root, stdio: "inherit" });
}

function parseArguments(args) {
  const options = { command: args[0] || "prepare", version: "", tag: "", date: "" };
  for (let index = 1; index < args.length; index += 1) {
    const value = args[index];
    if (value === "--tag") options.tag = args[++index] || "";
    else if (value === "--date") options.date = args[++index] || "";
    else if (!options.version) options.version = value;
    else throw new Error(`Unknown argument ${value}.`);
  }
  if (!["prepare", "check"].includes(options.command)) throw new Error("Usage: release-beta.mjs prepare [version] [--date YYYY-MM-DD] | check [version] [--tag vX.Y.Z-beta.N]");
  return options;
}

function main(args) {
  const options = parseArguments(args);
  if (options.command === "check") {
    const result = validateBetaRelease(defaultRoot, options.version, options.tag);
    console.log(`Beta release sources are synchronized for v${result.version}.`);
    return;
  }

  const result = prepareAndVerifyBetaRelease(defaultRoot, options.version, options.date || localDate(), () => {
    console.log("Release sources prepared. Running build, tests, and package verification...");
    runNpm(defaultRoot, ["run", "build"]);
    runNpm(defaultRoot, ["test"]);
    runNpm(defaultRoot, ["run", "package:binary"]);
  });
  console.log(`Beta v${result.nextVersion} is prepared and locally verified. Review the diff before committing and tagging.`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    main(process.argv.slice(2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : "beta_release_failed");
    process.exit(1);
  }
}
