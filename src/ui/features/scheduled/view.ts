import type { ScheduledFeatureState } from "./model.js";

export interface ScheduledFeatureView {
  render(state: Readonly<ScheduledFeatureState>): void;
}

export function renderScheduledFeature(view: ScheduledFeatureView, state: ScheduledFeatureState) {
  if (state.destroyed) throw new Error("scheduled_feature_destroyed");
  state.active = true;
  state.renderCount += 1;
  view.render(state);
}
