import type { SettingsFeatureState } from "./model.js";

export interface SettingsFeatureView {
  open(initialView: string, state: Readonly<SettingsFeatureState>): void;
}

export function openSettingsFeature(view: SettingsFeatureView, state: SettingsFeatureState, initialView: string) {
  if (state.destroyed) throw new Error("settings_feature_destroyed");
  state.openCount += 1;
  view.open(initialView, state);
}
