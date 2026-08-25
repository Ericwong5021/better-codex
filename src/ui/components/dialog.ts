import type { ComponentContext } from "../core/component.js";
import { listen } from "../core/events.js";
import { createComponentLifecycle } from "../core/lifecycle.js";

export interface DialogProps {
  accessibleName: string;
  content: Node;
  initialFocus?: HTMLElement | null;
  onRequestClose?: () => void;
}

function focusable(dialog: HTMLDialogElement) {
  return [...dialog.querySelectorAll<HTMLElement>('button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])')].filter(element => !element.hidden);
}

export function createDialog(initial: DialogProps, context: ComponentContext) {
  const root = document.createElement("dialog");
  const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  const previousOverflow = document.documentElement.style.overflow;
  const lifecycle = createComponentLifecycle("dialog", context, root, initial, props => {
    root.setAttribute("aria-label", props.accessibleName);
    if (root.firstChild !== props.content) root.replaceChildren(props.content);
  }, () => {
    if (root.open) root.close();
    document.documentElement.style.overflow = previousOverflow;
    if (previousFocus?.isConnected) previousFocus.focus();
  });
  listen(root, "cancel", event => {
    event.preventDefault();
    lifecycle.props().onRequestClose?.();
  }, lifecycle.signal);
  listen(root, "click", event => {
    if (event.target !== root) return;
    const pointer = event as MouseEvent;
    const bounds = root.getBoundingClientRect();
    if (pointer.clientX < bounds.left || pointer.clientX > bounds.right || pointer.clientY < bounds.top || pointer.clientY > bounds.bottom) lifecycle.props().onRequestClose?.();
  }, lifecycle.signal);
  listen(root, "keydown", event => {
    const key = event as KeyboardEvent;
    if (key.key !== "Tab") return;
    const elements = focusable(root);
    if (!elements.length) return;
    const first = elements[0];
    const last = elements.at(-1)!;
    if (key.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!key.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }, lifecycle.signal);
  document.body.append(root);
  document.documentElement.style.overflow = "hidden";
  root.showModal();
  queueMicrotask(() => (lifecycle.props().initialFocus || focusable(root)[0] || root).focus());
  return lifecycle.handle;
}
