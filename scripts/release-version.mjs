export const betaVersionPattern = /^(\d+)\.(\d+)\.(\d+)-beta\.([1-9]\d*)$/;
export const stableVersionPattern = /^(\d+)\.(\d+)\.(\d+)$/;

function versionParts(value) {
  const match = String(value).replace(/^v/, "").match(/^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/);
  if (!match) throw new Error("release_version_invalid");
  return { core: match.slice(1, 4).map(Number), prerelease: match[4] ? match[4].split(".") : [] };
}

export function compareReleaseVersions(left, right) {
  const a = versionParts(left);
  const b = versionParts(right);
  for (let index = 0; index < 3; index += 1) {
    if (a.core[index] !== b.core[index]) return a.core[index] < b.core[index] ? -1 : 1;
  }
  if (!a.prerelease.length || !b.prerelease.length) {
    if (a.prerelease.length === b.prerelease.length) return 0;
    return a.prerelease.length ? -1 : 1;
  }
  for (let index = 0; index < Math.max(a.prerelease.length, b.prerelease.length); index += 1) {
    const x = a.prerelease[index];
    const y = b.prerelease[index];
    if (x === undefined || y === undefined) return x === undefined ? -1 : 1;
    if (x === y) continue;
    const xNumeric = /^\d+$/.test(x);
    const yNumeric = /^\d+$/.test(y);
    if (xNumeric && yNumeric) return Number(x) < Number(y) ? -1 : 1;
    if (xNumeric !== yNumeric) return xNumeric ? -1 : 1;
    return x < y ? -1 : 1;
  }
  return 0;
}

export function nextBetaVersion(currentVersion) {
  const beta = currentVersion.match(betaVersionPattern);
  if (beta) return `${beta[1]}.${beta[2]}.${beta[3]}-beta.${Number(beta[4]) + 1}`;

  const stable = currentVersion.match(stableVersionPattern);
  if (stable) return `${stable[1]}.${stable[2]}.${Number(stable[3]) + 1}-beta.1`;

  throw new Error(`Current version ${currentVersion} is not a stable or Beta release version.`);
}
