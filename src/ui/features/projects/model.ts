export type ProjectDashboardPage = "overview" | "planning" | "work";
export type ProjectPlanningPane = "plan" | "chat";

export interface ProjectsFeatureState {
  active: boolean;
  destroyed: boolean;
  renderCount: number;
  planningPane: ProjectPlanningPane;
}
