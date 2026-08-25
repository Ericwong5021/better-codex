import type { ComponentContext } from "../core/component.js";
import { listen } from "../core/events.js";
import { createComponentLifecycle, type ComponentLifecycle } from "../core/lifecycle.js";

export interface NoticeProps {
  dismissible?: boolean;
  duration?: number;
  message: string;
  onDismiss?: () => void;
  tone?: "info" | "success" | "warning" | "error";
}

function notice(initial: NoticeProps, context: ComponentContext, existing?: HTMLElement) {
  const root = existing || document.createElement("section");
  const preserveContent = Boolean(existing);
  let timer: ReturnType<typeof setTimeout> | null = null;
  let remaining = initial.duration || 0;
  let startedAt = 0;
  const stop = () => {
    if (timer !== null) clearTimeout(timer);
    timer = null;
    if (startedAt) remaining = Math.max(0, remaining - (Date.now() - startedAt));
    startedAt = 0;
  };
  const start = () => {
    stop();
    if (!remaining) return;
    startedAt = Date.now();
    timer = setTimeout(() => lifecycle.props().onDismiss?.(), remaining);
  };
  let lifecycle!: ComponentLifecycle<NoticeProps>;
  lifecycle = createComponentLifecycle("notice", context, root, initial, props => {
    remaining = props.duration || 0;
    root.dataset.bcVariant = props.tone || "info";
    root.setAttribute("role", props.tone === "error" ? "alert" : "status");
    root.setAttribute("aria-live", props.tone === "error" ? "assertive" : "polite");
    if (!preserveContent) {
      const message = document.createElement("p");
      message.textContent = props.message;
      const children: Node[] = [message];
      if (props.dismissible) {
        const close = document.createElement("button");
        close.type = "button";
        close.setAttribute("aria-label", "Dismiss");
        close.textContent = "×";
        close.addEventListener("click", () => lifecycle.props().onDismiss?.(), { signal: lifecycle.signal });
        children.push(close);
      }
      root.replaceChildren(...children);
    }
    start();
  }, stop);
  listen(root, "pointerenter", stop, lifecycle.signal);
  listen(root, "pointerleave", start, lifecycle.signal);
  listen(root, "focusin", stop, lifecycle.signal);
  listen(root, "focusout", start, lifecycle.signal);
  return lifecycle.handle;
}

export function createNotice(initial: NoticeProps, context: ComponentContext) {
  return notice(initial, context);
}

export function adoptNotice(element: HTMLElement, initial: NoticeProps, context: ComponentContext) {
  return notice(initial, context, element);
}
