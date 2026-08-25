import type { ProjectsFeatureState } from "./model.js";

export interface ProjectsFeatureView {
  render(state: Readonly<ProjectsFeatureState>): void;
}

export function renderProjectsFeature(view: ProjectsFeatureView, state: ProjectsFeatureState) {
  if (state.destroyed) throw new Error("projects_feature_destroyed");
  state.active = true;
  state.renderCount += 1;
  view.render(state);
}
