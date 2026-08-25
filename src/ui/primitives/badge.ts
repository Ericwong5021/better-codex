import type { ComponentContext } from "../core/component.js";
import { createComponentLifecycle } from "../core/lifecycle.js";

export type BadgeVariant = "neutral" | "info" | "success" | "warning" | "danger" | "priority";

export interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
}

function badge(initial: BadgeProps, context: ComponentContext, component: "badge" | "status-badge" | "priority-badge", existing?: HTMLElement) {
  const root = existing || document.createElement("span");
  const preserveContent = Boolean(existing);
  const lifecycle = createComponentLifecycle("badge", context, root, initial, props => {
    root.dataset.bcVariant = props.variant || "neutral";
    root.dataset.bcState = "default";
    if (!preserveContent) root.textContent = props.label;
  });
  lifecycle.handle.element.dataset.bcComponent = component;
  return lifecycle.handle;
}

export function createBadge(initial: BadgeProps, context: ComponentContext) {
  return badge(initial, context, "badge");
}

export function createStatusBadge(initial: BadgeProps, context: ComponentContext) {
  return badge(initial, context, "status-badge");
}

export function createPriorityBadge(initial: BadgeProps, context: ComponentContext) {
  return badge({ ...initial, variant: initial.variant || "priority" }, context, "priority-badge");
}

export function adoptBadge(element: HTMLElement, initial: BadgeProps, context: ComponentContext) {
  return badge(initial, context, "badge", element);
}

export function adoptStatusBadge(element: HTMLElement, initial: BadgeProps, context: ComponentContext) {
  return badge(initial, context, "status-badge", element);
}
