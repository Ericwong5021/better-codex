import type { AgentsFeatureState } from "./model.js";
import { renderAgentsFeature, type AgentsFeatureView } from "./view.js";

export function createAgentsController(view: AgentsFeatureView) {
  const state: AgentsFeatureState = { active: false, destroyed: false, renderCount: 0 };
  return {
    render: () => renderAgentsFeature(view, state),
    deactivate: () => { state.active = false; },
    destroy: () => { state.active = false; state.destroyed = true; },
  };
}
