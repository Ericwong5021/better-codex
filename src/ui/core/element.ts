export function htmlElement<K extends keyof HTMLElementTagNameMap>(tag: K, attributes: Record<string, string> = {}) {
  const element = document.createElement(tag);
  for (const [name, value] of Object.entries(attributes)) element.setAttribute(name, value);
  return element;
}

export function replaceText(element: HTMLElement, value: unknown) {
  element.textContent = String(value ?? "");
}
