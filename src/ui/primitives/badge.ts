import type { ComponentContext } from "../core/component.js";
import { createComponentLifecycle } from "../core/lifecycle.js";

export type BadgeVariant = "neutral" | "info" | "success" | "warning" | "danger" | "priority";

export interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
}

export function createBadge(initial: BadgeProps, context: ComponentContext) {
  const root = document.createElement("span");
  const lifecycle = createComponentLifecycle("badge", context, root, initial, props => {
    root.dataset.bcVariant = props.variant || "neutral";
    root.dataset.bcState = "default";
    root.textContent = props.label;
  });
  return lifecycle.handle;
}

export function createStatusBadge(initial: BadgeProps, context: ComponentContext) {
  const handle = createBadge(initial, context);
  handle.element.dataset.bcComponent = "status-badge";
  return handle;
}

export function createPriorityBadge(initial: BadgeProps, context: ComponentContext) {
  const handle = createBadge({ ...initial, variant: initial.variant || "priority" }, context);
  handle.element.dataset.bcComponent = "priority-badge";
  return handle;
}
