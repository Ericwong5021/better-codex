import type { ComponentContext } from "../core/component.js";
import { createComponentLifecycle } from "../core/lifecycle.js";

export function adoptFormRow(root: HTMLElement, context: ComponentContext) {
  return createComponentLifecycle("form-row", context, root, {}, () => {}).handle;
}
