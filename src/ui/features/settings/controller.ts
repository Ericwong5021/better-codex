import type { SettingsFeatureState } from "./model.js";
import { openSettingsFeature, type SettingsFeatureView } from "./view.js";

export function createSettingsController(view: SettingsFeatureView) {
  const state: SettingsFeatureState = { destroyed: false, openCount: 0 };
  return {
    open: (initialView: string) => openSettingsFeature(view, state, initialView),
    destroy: () => { state.destroyed = true; },
  };
}
