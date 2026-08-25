import type { ComponentContext } from "../core/component.js";
import { createComponentLifecycle } from "../core/lifecycle.js";

export type InlineFeedbackTone = "info" | "success" | "warning" | "error";

export interface InlineFeedbackProps {
  message: string;
  tone?: InlineFeedbackTone;
}

export function createInlineFeedback(initial: InlineFeedbackProps, context: ComponentContext) {
  const root = document.createElement("div");
  const lifecycle = createComponentLifecycle("inline-feedback", context, root, initial, props => {
    const tone = props.tone || "info";
    root.dataset.bcVariant = tone;
    root.dataset.bcState = "default";
    root.setAttribute("role", tone === "error" ? "alert" : "status");
    root.textContent = props.message;
  });
  return lifecycle.handle;
}
