function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function inlineMarkdown(source: string) {
  let text = escapeHtml(source);
  text = text.replace(/`([^`\n]+)`/g, "<code>$1</code>");
  text = text.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  text = text.replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, "<em>$1</em>");
  text = text.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer noopener">$1</a>');
  return text;
}

function flushParagraph(lines: string[], out: string[]) {
  if (!lines.length) return;
  out.push(`<p>${inlineMarkdown(lines.join("\n"))}</p>`);
  lines.length = 0;
}

function flushList(kind: "ul" | "ol" | null, items: string[], out: string[]) {
  if (!kind || !items.length) return;
  out.push(`<${kind}>${items.map(item => `<li>${inlineMarkdown(item)}</li>`).join("")}</${kind}>`);
  items.length = 0;
}

/** Escape-first Markdown subset for assistant final answers. */
export function renderMarkdown(source: string) {
  const input = String(source || "").replace(/\r\n?/g, "\n").trim();
  if (!input) return "";

  const fences: string[] = [];
  const withFences = input.replace(/```([a-zA-Z0-9_-]*)\n?([\s\S]*?)```/g, (_match, lang: string, code: string) => {
    const index = fences.length;
    const className = lang ? ` class="language-${escapeHtml(lang)}"` : "";
    fences.push(`<pre><code${className}>${escapeHtml(code.replace(/\n$/, ""))}</code></pre>`);
    return `\n@@FENCE${index}@@\n`;
  });

  const out: string[] = [];
  const paragraph: string[] = [];
  let listKind: "ul" | "ol" | null = null;
  const listItems: string[] = [];

  for (const rawLine of withFences.split("\n")) {
    const fence = rawLine.match(/^@@FENCE(\d+)@@$/);
    if (fence) {
      flushParagraph(paragraph, out);
      flushList(listKind, listItems, out);
      listKind = null;
      out.push(fences[Number(fence[1])] || "");
      continue;
    }

    const line = rawLine;
    if (!line.trim()) {
      flushParagraph(paragraph, out);
      flushList(listKind, listItems, out);
      listKind = null;
      continue;
    }

    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      flushParagraph(paragraph, out);
      flushList(listKind, listItems, out);
      listKind = null;
      const level = heading[1].length;
      out.push(`<h${level}>${inlineMarkdown(heading[2].trim())}</h${level}>`);
      continue;
    }

    const quote = line.match(/^>\s?(.*)$/);
    if (quote) {
      flushParagraph(paragraph, out);
      flushList(listKind, listItems, out);
      listKind = null;
      out.push(`<blockquote><p>${inlineMarkdown(quote[1])}</p></blockquote>`);
      continue;
    }

    const unordered = line.match(/^[-*]\s+(.+)$/);
    if (unordered) {
      flushParagraph(paragraph, out);
      if (listKind && listKind !== "ul") {
        flushList(listKind, listItems, out);
      }
      listKind = "ul";
      listItems.push(unordered[1]);
      continue;
    }

    const ordered = line.match(/^\d+\.\s+(.+)$/);
    if (ordered) {
      flushParagraph(paragraph, out);
      if (listKind && listKind !== "ol") {
        flushList(listKind, listItems, out);
      }
      listKind = "ol";
      listItems.push(ordered[1]);
      continue;
    }

    flushList(listKind, listItems, out);
    listKind = null;
    paragraph.push(line);
  }

  flushParagraph(paragraph, out);
  flushList(listKind, listItems, out);
  return out.join("");
}
