/** Native panes can remain connected while hidden or inert during navigation. */
export function injectedElementVisible(element: Element | null): element is HTMLElement {
  if (!(element instanceof HTMLElement) || !element.isConnected) return false;
  for (let ancestor: HTMLElement | null = element; ancestor; ancestor = ancestor.parentElement) {
    if (ancestor.hidden || ancestor.inert || ancestor.getAttribute("aria-hidden") === "true") return false;
    const style = getComputedStyle(ancestor);
    if (style.display === "none" || style.visibility === "hidden" || style.visibility === "collapse" || Number(style.opacity) === 0) return false;
  }
  const bounds = element.getBoundingClientRect();
  return bounds.width > 0 && bounds.height > 0 && bounds.right > 0 && bounds.bottom > 0 && bounds.left < innerWidth && bounds.top < innerHeight;
}

export function findInjectedMount(selectors: { contentFrame: string; contentLayout: string }, ownedAttribute: string) {
  const native = (element: Element) => !element.closest(`[${ownedAttribute}="true"]`);
  const layouts = new Set<Element>();
  document.querySelectorAll(selectors.contentFrame).forEach(frame => {
    if (!native(frame)) return;
    const layout = frame.closest(selectors.contentLayout);
    if (layout) layouts.add(layout);
  });
  document.querySelectorAll(selectors.contentLayout).forEach(layout => { if (native(layout)) layouts.add(layout); });
  for (const layout of layouts) {
    const surface = layout.parentElement;
    if (surface?.closest("main") && native(surface) && injectedElementVisible(layout) && injectedElementVisible(surface)) return surface;
  }
  for (const main of document.querySelectorAll("main")) {
    if (!native(main) || !injectedElementVisible(main)) continue;
    return main;
  }
  return null;
}
