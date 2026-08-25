import type { ComponentContext } from "../core/component.js";
import { listen } from "../core/events.js";
import { createComponentLifecycle } from "../core/lifecycle.js";
import { iconElement, type IconDefinition } from "./icon.js";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

export interface ButtonProps {
  accessibleName?: string;
  disabled?: boolean;
  icon?: IconDefinition;
  label: string;
  loading?: boolean;
  onPress?: (event: MouseEvent) => void | Promise<void>;
  variant?: ButtonVariant;
}

function button(initial: ButtonProps, context: ComponentContext, iconOnly: boolean, existing?: HTMLButtonElement) {
  const root = existing || document.createElement("button");
  const preserveContent = Boolean(existing);
  root.type = "button";
  const stateObserver = new MutationObserver(() => {
    if (root.disabled && root.dataset.bcState !== "loading") root.dataset.bcState = "disabled";
    else if (!root.disabled && root.dataset.bcState === "disabled") root.dataset.bcState = "default";
  });
  const lifecycle = createComponentLifecycle(iconOnly ? "icon-button" : "button", context, root, initial, props => {
    const variant = props.variant || "secondary";
    const disabled = Boolean(props.disabled || props.loading);
    root.dataset.bcVariant = variant;
    root.dataset.bcState = props.loading ? "loading" : disabled ? "disabled" : "default";
    root.disabled = disabled;
    root.toggleAttribute("aria-busy", Boolean(props.loading));
    if (iconOnly || props.accessibleName) root.setAttribute("aria-label", props.accessibleName || props.label);
    else root.removeAttribute("aria-label");
    if (preserveContent) return;
    const children: Node[] = [];
    if (props.icon) {
      const icon = iconElement({ definition: props.icon });
      if (props.loading) icon.dataset.bcSpin = "true";
      children.push(icon);
    }
    if (!iconOnly) {
      const label = document.createElement("span");
      label.textContent = props.label;
      children.push(label);
    }
    root.replaceChildren(...children);
  }, () => stateObserver.disconnect());
  stateObserver.observe(root, { attributes: true, attributeFilter: ["disabled"] });
  listen(root, "click", event => {
    const props = lifecycle.props();
    if (props.disabled || props.loading || !props.onPress) return;
    try {
      const result = props.onPress(event as MouseEvent);
      if (result instanceof Promise) void result.catch(error => Promise.reject(new Error(JSON.stringify({ code: "ui_component_action_failed", component: iconOnly ? "icon-button" : "button", feature: context.feature, host: context.host, mountId: context.mountId, phase: "action", themeSource: context.themeSource }), { cause: error })));
    } catch (error) {
      throw new Error(JSON.stringify({ code: "ui_component_action_failed", component: iconOnly ? "icon-button" : "button", feature: context.feature, host: context.host, mountId: context.mountId, phase: "action", themeSource: context.themeSource }), { cause: error });
    }
  }, lifecycle.signal);
  return lifecycle.handle;
}

export function createButton(initial: ButtonProps, context: ComponentContext) {
  return button(initial, context, false);
}

export function createIconButton(initial: ButtonProps & { accessibleName: string; icon: IconDefinition }, context: ComponentContext) {
  return button(initial, context, true);
}

export function adoptIconButton(element: HTMLButtonElement, initial: ButtonProps & { accessibleName: string }, context: ComponentContext) {
  return button(initial, context, true, element);
}
