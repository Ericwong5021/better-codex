import type { AgentsFeatureState } from "./model.js";

export interface AgentsFeatureView {
  render(state: Readonly<AgentsFeatureState>): void;
}

export function renderAgentsFeature(view: AgentsFeatureView, state: AgentsFeatureState) {
  if (state.destroyed) throw new Error("agents_feature_destroyed");
  state.active = true;
  state.renderCount += 1;
  view.render(state);
}
