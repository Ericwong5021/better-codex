import type { ScheduledFeatureState } from "./model.js";
import { renderScheduledFeature, type ScheduledFeatureView } from "./view.js";

export function createScheduledController(view: ScheduledFeatureView) {
  const state: ScheduledFeatureState = { active: false, destroyed: false, renderCount: 0 };
  return {
    render: () => renderScheduledFeature(view, state),
    deactivate: () => { state.active = false; },
    destroy: () => { state.active = false; state.destroyed = true; },
  };
}
