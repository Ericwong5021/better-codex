import type { ComponentContext } from "../core/component.js";
import { createComponentLifecycle } from "../core/lifecycle.js";

export function adoptListRow(root: HTMLElement, context: ComponentContext) {
  return createComponentLifecycle("list-row", context, root, {}, () => {}).handle;
}
