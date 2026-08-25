import type { ComponentContext } from "../core/component.js";
import { listen } from "../core/events.js";
import { createComponentLifecycle, type ComponentLifecycle } from "../core/lifecycle.js";

export interface MenuProps {
  onClose?: () => void;
  open: boolean;
  trigger: HTMLElement;
}

export function adoptMenu(root: HTMLElement, initial: MenuProps, context: ComponentContext) {
  let lifecycle!: ComponentLifecycle<MenuProps>;
  lifecycle = createComponentLifecycle("menu", context, root, initial, props => {
    root.hidden = !props.open;
    props.trigger.setAttribute("aria-expanded", String(props.open));
    root.dataset.bcState = props.open ? "open" : "closed";
  }, () => lifecycle.props().trigger.setAttribute("aria-expanded", "false"));
  const items = () => [...root.querySelectorAll<HTMLElement>('[role="menuitem"], [role="option"], button:not(:disabled)')].filter(item => !item.hidden);
  listen(root, "keydown", event => {
    const key = event as KeyboardEvent;
    const entries = items();
    if (!entries.length) return;
    const index = Math.max(0, entries.indexOf(document.activeElement as HTMLElement));
    const destination = key.key === "Home" ? entries[0] : key.key === "End" ? entries.at(-1) : key.key === "ArrowDown" ? entries[(index + 1) % entries.length] : key.key === "ArrowUp" ? entries[(index - 1 + entries.length) % entries.length] : null;
    if (destination) {
      event.preventDefault();
      destination.focus();
    } else if (key.key === "Escape") {
      event.preventDefault();
      lifecycle.props().onClose?.();
      lifecycle.props().trigger.focus();
    }
  }, lifecycle.signal);
  listen(document, "pointerdown", event => {
    const props = lifecycle.props();
    if (props.open && !root.contains(event.target as Node) && !props.trigger.contains(event.target as Node)) props.onClose?.();
  }, lifecycle.signal, { capture: true });
  return lifecycle.handle;
}
