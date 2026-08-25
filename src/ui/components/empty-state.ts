import type { ComponentContext } from "../core/component.js";
import { createComponentLifecycle, observeComponentSize } from "../core/lifecycle.js";
import { createButton, type ButtonProps } from "../primitives/button.js";
import { iconElement, type IconDefinition } from "../primitives/icon.js";

export interface EmptyStateProps {
  action?: ButtonProps;
  description: string;
  icon?: IconDefinition;
  title: string;
}

export function createEmptyState(initial: EmptyStateProps, context: ComponentContext) {
  const root = document.createElement("section");
  let actionHandle: ReturnType<typeof createButton> | null = null;
  let stopSizeObservation = () => {};
  const lifecycle = createComponentLifecycle("empty-state", context, root, initial, props => {
    actionHandle?.destroy();
    actionHandle = null;
    const children: Node[] = [];
    if (props.icon) children.push(iconElement({ definition: props.icon }));
    const title = document.createElement("strong");
    title.textContent = props.title;
    const description = document.createElement("p");
    description.textContent = props.description;
    children.push(title, description);
    if (props.action) {
      actionHandle = createButton(props.action, { ...context, mountId: `${context.mountId}:action` });
      children.push(actionHandle.element);
    }
    root.replaceChildren(...children);
  }, () => {
    actionHandle?.destroy();
    stopSizeObservation();
  });
  stopSizeObservation = observeComponentSize(root, context);
  return lifecycle.handle;
}
