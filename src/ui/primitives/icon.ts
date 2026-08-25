import type { ComponentContext } from "../core/component.js";
import { createComponentLifecycle } from "../core/lifecycle.js";

export interface IconDefinition {
  name: string;
  nodes: string;
}

export interface IconProps {
  definition: IconDefinition;
  label?: string;
}

const allowedElements = new Set(["circle", "ellipse", "line", "path", "polygon", "polyline", "rect"]);
const allowedAttributes = new Set(["cx", "cy", "d", "fill", "height", "opacity", "points", "r", "rx", "ry", "stroke", "stroke-linecap", "stroke-linejoin", "stroke-width", "width", "x", "x1", "x2", "y", "y1", "y2"]);

function iconNodes(definition: IconDefinition) {
  if (!/^[a-z0-9-]+$/.test(definition.name)) throw new Error("icon_name_invalid");
  const parsed = new DOMParser().parseFromString(`<svg xmlns="http://www.w3.org/2000/svg">${definition.nodes}</svg>`, "image/svg+xml");
  if (parsed.querySelector("parsererror")) throw new Error(`icon_nodes_invalid:${definition.name}`);
  for (const node of parsed.documentElement.querySelectorAll("*")) {
    if (!allowedElements.has(node.localName)) throw new Error(`icon_element_invalid:${definition.name}:${node.localName}`);
    for (const attribute of Array.from(node.attributes)) if (!allowedAttributes.has(attribute.name)) throw new Error(`icon_attribute_invalid:${definition.name}:${attribute.name}`);
  }
  return Array.from(parsed.documentElement.children).map(node => document.importNode(node, true));
}

export function iconElement(props: IconProps) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "2");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  svg.replaceChildren(...iconNodes(props.definition));
  if (props.label) {
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", props.label);
  } else {
    svg.setAttribute("aria-hidden", "true");
  }
  return svg;
}

export function createIcon(initial: IconProps, context: ComponentContext) {
  const root = document.createElement("span");
  const lifecycle = createComponentLifecycle("icon", context, root, initial, props => {
    root.replaceChildren(iconElement(props));
  });
  return lifecycle.handle;
}
