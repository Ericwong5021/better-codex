import type { ComponentContext } from "../core/component.js";
import { createComponentLifecycle } from "../core/lifecycle.js";

export function adoptToolbar(root: HTMLElement, context: ComponentContext) {
  return createComponentLifecycle("toolbar", context, root, {}, () => {}).handle;
}
