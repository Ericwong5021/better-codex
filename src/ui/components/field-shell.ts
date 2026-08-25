import type { ComponentContext } from "../core/component.js";
import { createComponentLifecycle } from "../core/lifecycle.js";

export interface FieldShellProps {
  control: HTMLElement;
  description?: string;
  disabled?: boolean;
  error?: string;
  label: string;
  required?: boolean;
}

export function createFieldShell(initial: FieldShellProps, context: ComponentContext) {
  const root = document.createElement("label");
  const lifecycle = createComponentLifecycle("field-shell", context, root, initial, props => {
    const label = document.createElement("span");
    label.dataset.bcFieldLabel = "true";
    label.textContent = props.label;
    if (props.required) label.dataset.required = "true";
    const children: Node[] = [label, props.control];
    const messages: string[] = [];
    if (props.description) messages.push(props.description);
    if (props.error) messages.push(props.error);
    if (messages.length) {
      const description = document.createElement("small");
      description.id = context.mountId + "-description";
      description.dataset.bcFieldMessage = props.error ? "error" : "description";
      description.textContent = messages.join(" ");
      props.control.setAttribute("aria-describedby", description.id);
      props.control.toggleAttribute("aria-invalid", Boolean(props.error));
      children.push(description);
    } else {
      props.control.removeAttribute("aria-describedby");
      props.control.removeAttribute("aria-invalid");
    }
    props.control.toggleAttribute("required", Boolean(props.required));
    props.control.toggleAttribute("disabled", Boolean(props.disabled));
    root.replaceChildren(...children);
  });
  return lifecycle.handle;
}

export function adoptFieldShell(root: HTMLElement, context: ComponentContext) {
  const control = root.querySelector<HTMLElement>("input, textarea, select, button, [role=\"radiogroup\"]");
  const label = root.querySelector("strong, [data-bc-field-label]")?.textContent?.trim();
  if (!control || !label) throw new Error("field_shell_contract_invalid");
  const description = root.querySelector("small")?.textContent?.trim() || "";
  const lifecycle = createComponentLifecycle("field-shell", context, root, { control, description, label }, () => {
    root.dataset.bcState = control.matches(":disabled") ? "disabled" : "default";
    if (description) {
      const descriptionNode = root.querySelector<HTMLElement>("small");
      if (descriptionNode) {
        descriptionNode.id ||= context.mountId + "-description";
        control.setAttribute("aria-describedby", descriptionNode.id);
      }
    }
  });
  return lifecycle.handle;
}
