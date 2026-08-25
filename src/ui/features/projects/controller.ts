import type { ProjectsFeatureState } from "./model.js";
import { renderProjectsFeature, type ProjectsFeatureView } from "./view.js";

export function createProjectsController(view: ProjectsFeatureView) {
  const state: ProjectsFeatureState = { active: false, destroyed: false, renderCount: 0 };
  return {
    render: () => renderProjectsFeature(view, state),
    deactivate: () => { state.active = false; },
    destroy: () => { state.active = false; state.destroyed = true; },
  };
}
