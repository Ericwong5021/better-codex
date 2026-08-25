import type { ComponentContext } from "../core/component.js";
import { createComponentLifecycle } from "../core/lifecycle.js";

export type InlineFeedbackTone = "info" | "success" | "warning" | "error";

export interface InlineFeedbackProps {
  message: string;
  tone?: InlineFeedbackTone;
}

function inlineFeedback(initial: InlineFeedbackProps, context: ComponentContext, existing?: HTMLElement) {
  const root = existing || document.createElement("div");
  const preserveContent = Boolean(existing);
  const lifecycle = createComponentLifecycle("inline-feedback", context, root, initial, props => {
    const tone = props.tone || "info";
    root.dataset.bcVariant = tone;
    root.dataset.bcState = "default";
    root.setAttribute("role", tone === "error" ? "alert" : "status");
    if (!preserveContent) root.textContent = props.message;
  });
  return lifecycle.handle;
}

export function createInlineFeedback(initial: InlineFeedbackProps, context: ComponentContext) {
  return inlineFeedback(initial, context);
}

export function adoptInlineFeedback(element: HTMLElement, initial: InlineFeedbackProps, context: ComponentContext) {
  return inlineFeedback(initial, context, element);
}
