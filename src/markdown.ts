import MarkdownIt from "markdown-it";

const markdown = new MarkdownIt({
  html: false,
  linkify: false,
  typographer: false,
});

markdown.renderer.rules.link_open = (tokens, index, options, _environment, renderer) => {
  tokens[index].attrSet("target", "_blank");
  tokens[index].attrSet("rel", "noreferrer noopener");
  return renderer.renderToken(tokens, index, options);
};

markdown.renderer.rules.table_open = () => '<div class="better-codex-table-wrap"><table>\n';
markdown.renderer.rules.table_close = () => "</table></div>\n";

export function renderMarkdown(source: string) {
  const input = String(source || "").trim();
  return input ? markdown.render(input) : "";
}
