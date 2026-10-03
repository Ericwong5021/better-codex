import type { ComponentContext } from "../core/component.js";
import { createComponentLifecycle } from "../core/lifecycle.js";
import { createButton } from "../primitives/button.js";
import type { IconDefinition } from "../primitives/icon.js";

export interface DisclosureProps {
  label: string;
  content: HTMLElement;
  open: boolean;
  detail?: string;
  onToggle(open: boolean): void;
}

/** Shared keyboard-operable section, retaining content while collapsed. */
export function createDisclosure(initial: DisclosureProps, context: ComponentContext, icon: IconDefinition) {
  const root = document.createElement("section");
  root.className = "better-codex-disclosure";
  const body = document.createElement("div");
  body.className = "better-codex-disclosure-body";
  body.id = `bc-disclosure-${context.mountId.replace(/[^a-z0-9-]/gi, "-")}`;
  const detail = document.createElement("span");
  detail.className = "better-codex-disclosure-detail";
  const trigger = createButton({ label: initial.label, icon, variant: "ghost" }, { ...context, mountId: `${context.mountId}:trigger` });
  trigger.element.classList.add("better-codex-disclosure-trigger");
  trigger.element.setAttribute("aria-controls", body.id);
  root.append(trigger.element, body);
  const lifecycle = createComponentLifecycle("disclosure", context, root, initial, props => {
    trigger.update({ label: props.label, icon, variant: "ghost", onPress: () => props.onToggle(!lifecycle.props().open) });
    trigger.element.setAttribute("aria-expanded", String(props.open));
    detail.textContent = props.detail || "";
    trigger.element.append(detail);
    root.dataset.open = String(props.open);
    body.hidden = !props.open;
    if (body.firstChild !== props.content) body.replaceChildren(props.content);
  }, () => trigger.destroy());
  return lifecycle.handle;
}
