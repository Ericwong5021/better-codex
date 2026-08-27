import type { ProjectDashboardPage, ProjectPlanningPane, ProjectsFeatureState } from "./model.js";
import { renderProjectDashboardTabs, renderProjectsFeature, type ProjectsFeatureView } from "./view.js";

export function createProjectsController(view: ProjectsFeatureView) {
  const state: ProjectsFeatureState = { active: false, destroyed: false, renderCount: 0, planningPane: "plan" };
  return {
    render: () => renderProjectsFeature(view, state),
    planningPane: () => state.planningPane,
    resetPlanningPane: () => { state.planningPane = "plan"; },
    selectDashboard: (page: string, pane: string): { page: ProjectDashboardPage; planningPane: ProjectPlanningPane } => {
      const selectedPage: ProjectDashboardPage = page === "planning" || page === "work" ? page : "overview";
      if (selectedPage === "planning") state.planningPane = pane === "chat" ? "chat" : "plan";
      return { page: selectedPage, planningPane: state.planningPane };
    },
    renderDashboardTabs: (page: ProjectDashboardPage, labels: { page: string; overview: string; planning: string; conversation: string; conversationAria: string; work: string }) => renderProjectDashboardTabs(state, page, labels),
    deactivate: () => { state.active = false; },
    destroy: () => { state.active = false; state.destroyed = true; },
  };
}
