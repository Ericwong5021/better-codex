import type { ProjectDashboardPage, ProjectsFeatureState } from "./model.js";

export interface ProjectsFeatureView {
  render(state: Readonly<ProjectsFeatureState>): void;
}

export function renderProjectsFeature(view: ProjectsFeatureView, state: ProjectsFeatureState) {
  if (state.destroyed) throw new Error("projects_feature_destroyed");
  state.active = true;
  state.renderCount += 1;
  view.render(state);
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!);
}

export function renderProjectDashboardTabs(state: Readonly<ProjectsFeatureState>, page: ProjectDashboardPage, labels: { page: string; overview: string; planning: string; conversation: string; conversationAria: string; work: string }) {
  const current = (target: ProjectDashboardPage, pane = "") => page === target && (!pane || state.planningPane === pane) ? ' aria-current="page"' : "";
  const label = Object.fromEntries(Object.entries(labels).map(([key, value]) => [key, escapeHtml(value)])) as typeof labels;
  const desktop = '<nav class="better-codex-project-dashboard-tabs better-codex-project-dashboard-tabs-desktop" aria-label="' + label.page + '"><button type="button" data-project-dashboard-view="overview"' + current("overview") + '>' + label.overview + '</button><button type="button" data-project-dashboard-view="planning"' + current("planning") + '>' + label.planning + '</button><button type="button" data-project-dashboard-view="work"' + current("work") + '>' + label.work + '</button></nav>';
  const mobile = '<nav class="better-codex-project-dashboard-tabs better-codex-project-dashboard-tabs-mobile" aria-label="' + label.page + '"><button type="button" data-project-dashboard-view="overview"' + current("overview") + '>' + label.overview + '</button><button type="button" data-project-dashboard-view="planning" data-project-planning-pane="plan"' + current("planning", "plan") + '>' + label.planning + '</button><button type="button" data-project-dashboard-view="planning" data-project-planning-pane="chat" aria-label="' + label.conversationAria + '"' + current("planning", "chat") + '>' + label.conversation + '</button><button type="button" data-project-dashboard-view="work"' + current("work") + '>' + label.work + '</button></nav>';
  return desktop + mobile;
}
