import { componentFailure, type ComponentContext, type ComponentHandle } from "./component.js";

const activeComponents = new Set<string>();

export interface ComponentLifecycle<P> {
  handle: ComponentHandle<P>;
  props(): P;
  signal: AbortSignal;
}

export function createComponentLifecycle<P>(component: string, context: ComponentContext, element: HTMLElement, initial: P, render: (props: P) => void, cleanup?: () => void): ComponentLifecycle<P> {
  const identity = `${component}:${context.mountId}`;
  if (activeComponents.has(identity)) throw componentFailure(component, "mount", context, new Error("duplicate_component_mount"));
  activeComponents.add(identity);
  const controller = new AbortController();
  let current = initial;
  let destroyed = false;
  element.dataset.bcComponent = component;
  element.dataset.bcMountId = context.mountId;
  const execute = (phase: string, action: () => void) => {
    try {
      action();
    } catch (error) {
      throw componentFailure(component, phase, context, error);
    }
  };
  execute("mount", () => render(current));
  const handle: ComponentHandle<P> = {
    element,
    update(next) {
      if (destroyed) throw componentFailure(component, "update", context, new Error("component_destroyed"));
      current = next;
      execute("update", () => render(current));
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      activeComponents.delete(identity);
      controller.abort();
      execute("destroy", () => cleanup?.());
      element.remove();
    },
  };
  return { handle, props: () => current, signal: controller.signal };
}

export function observeComponentSize(element: HTMLElement, context: ComponentContext) {
  const apply = (width: number) => {
    if (width <= 0) return;
    element.dataset.bcSize = width < 480 ? "narrow" : width < 900 ? "compact" : "wide";
  };
  let observer: ResizeObserver;
  try {
    observer = new ResizeObserver(entries => {
      try {
        apply(entries.at(-1)?.contentRect.width || element.getBoundingClientRect().width);
      } catch (error) {
        throw componentFailure("responsive-size", "observe", context, error);
      }
    });
    observer.observe(element);
    apply(element.getBoundingClientRect().width);
  } catch (error) {
    throw componentFailure("responsive-size", "mount", context, error);
  }
  return () => observer.disconnect();
}
