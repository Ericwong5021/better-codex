import { coreVersion } from "./version.js";

export const featureList = [
  { id: "issues", availability: "release" },
  { id: "agents", availability: "release" },
  { id: "project-management", availability: "beta" },
] as const;

export type FeatureId = typeof featureList[number]["id"];
export type ReleaseMode = "beta" | "release";

export function releaseMode(version = coreVersion): ReleaseMode {
  return /-beta\.[1-9]\d*$/.test(version) ? "beta" : "release";
}

export function featureManifest(version = coreVersion) {
  const mode = releaseMode(version);
  return {
    mode,
    features: featureList.map(feature => ({ ...feature, enabled: feature.availability === "release" || mode === "beta" })),
  };
}

export function featureEnabled(id: FeatureId, version = coreVersion) {
  return featureManifest(version).features.some(feature => feature.id === id && feature.enabled);
}
