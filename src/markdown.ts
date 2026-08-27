import MarkdownIt from "markdown-it";

const markdown = new MarkdownIt({
  html: false,
  linkify: false,
  typographer: false,
});

type MarkdownEnvironment = {
  plainLinks?: Set<string>;
  literalLinks?: Set<string>;
  plainLinkDepth?: number;
  literalLinkDepth?: number;
};

markdown.renderer.rules.link_open = (tokens, index, options, _environment, renderer) => {
  const environment = _environment as MarkdownEnvironment | undefined;
  const attribute = tokens[index].attrGet("href");
  const href = attribute === null ? "" : String(attribute);
  if (href && environment?.literalLinks?.has(href)) {
    environment.literalLinkDepth = (environment.literalLinkDepth || 0) + 1;
    return `<code>${markdown.utils.escapeHtml(decodeURIComponent(href))}</code><span hidden>`;
  }
  if (href && environment?.plainLinks?.has(href)) {
    environment.plainLinkDepth = (environment.plainLinkDepth || 0) + 1;
    return "";
  }
  tokens[index].attrSet("target", "_blank");
  tokens[index].attrSet("rel", "noreferrer noopener");
  return renderer.renderToken(tokens, index, options);
};

markdown.renderer.rules.link_close = (tokens, index, options, _environment, renderer) => {
  const environment = _environment as MarkdownEnvironment | undefined;
  if (environment?.literalLinkDepth) {
    environment.literalLinkDepth -= 1;
    return "</span>";
  }
  if (environment?.plainLinkDepth) {
    environment.plainLinkDepth -= 1;
    return "";
  }
  return renderer.renderToken(tokens, index, options);
};

const renderImage = markdown.renderer.rules.image;
markdown.renderer.rules.image = (tokens, index, options, _environment, renderer) => {
  const environment = _environment as MarkdownEnvironment | undefined;
  const attribute = tokens[index].attrGet("src");
  const source = attribute === null ? "" : String(attribute);
  if (source && environment?.plainLinks?.has(source)) return markdown.utils.escapeHtml(tokens[index].content);
  return renderImage(tokens, index, options, _environment, renderer);
};

markdown.renderer.rules.table_open = () => '<div class="better-codex-table-wrap"><table>\n';
markdown.renderer.rules.table_close = () => "</table></div>\n";

export function markdownLinks(source: string) {
  const links: string[] = [];
  for (const token of markdown.parse(String(source || ""), {})) {
    for (const child of token.children || []) {
      const attribute = child.type === "link_open" ? child.attrGet("href") : child.type === "image" ? child.attrGet("src") : null;
      if (attribute !== null) links.push(String(attribute));
    }
  }
  return links;
}

export function renderMarkdown(source: string, plainLinks: readonly string[] = [], literalLinks: readonly string[] = []) {
  const input = String(source || "").trim();
  return input ? markdown.render(input, plainLinks.length || literalLinks.length ? { plainLinks: new Set(plainLinks), literalLinks: new Set(literalLinks), plainLinkDepth: 0, literalLinkDepth: 0 } : undefined) : "";
}
