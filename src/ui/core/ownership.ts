import type { ComponentHandle } from "./component.js";

const ownedComponents = new WeakMap<HTMLElement, ComponentHandle<unknown>>();

export function registerOwnedComponent(element: HTMLElement, handle: ComponentHandle<unknown>) {
  const current = ownedComponents.get(element);
  if (current && current !== handle) current.destroy();
  ownedComponents.set(element, handle);
  return handle;
}

export function destroyOwnedComponents(root: Node, retainedRoots: readonly HTMLElement[] = []) {
  if (!(root instanceof HTMLElement)) return;
  const elements = [root, ...root.querySelectorAll<HTMLElement>("[data-bc-component]")];
  elements.forEach(element => {
    if (retainedRoots.some(retained => retained === element || retained.contains(element))) return;
    const handle = ownedComponents.get(element);
    if (!handle) return;
    ownedComponents.delete(element);
    handle.destroy();
  });
}

export function destroyRemovedComponents(records: MutationRecord[], options: { retainedRoots?: readonly HTMLElement[] } = {}) {
  records.forEach(record => record.removedNodes.forEach(node => {
    if (!node.isConnected) destroyOwnedComponents(node, options.retainedRoots || []);
  }));
}
