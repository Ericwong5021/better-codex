export type SemanticAnchor = {
  start: number;
  end: number;
  handle: string;
  display: string;
};

export type SemanticDraft = {
  text: string;
  anchors: SemanticAnchor[];
  degraded: boolean;
};

function normalizedAnchors(value: SemanticAnchor[], text: string) {
  return value
    .filter(anchor => Number.isInteger(anchor.start) && Number.isInteger(anchor.end) && anchor.start >= 0 && anchor.end > anchor.start && anchor.end <= text.length && text.slice(anchor.start, anchor.end) === anchor.display && anchor.handle)
    .sort((left, right) => left.start - right.start || left.end - right.end)
    .filter((anchor, index, anchors) => !index || anchors[index - 1].end <= anchor.start);
}

export function createSemanticDraft(text = "", document?: { schema_version?: number; parts?: unknown[] }): SemanticDraft {
  if (document?.schema_version !== 2 || !Array.isArray(document.parts)) return { text, anchors: [], degraded: false };
  let value = "";
  const anchors: SemanticAnchor[] = [];
  for (const part of document.parts) {
    if (!part || typeof part !== "object") continue;
    const item = part as Record<string, unknown>;
    if (item.type === "text") value += String(item.text || "");
    if (item.type === "reference") {
      const display = String(item.display || "");
      const handle = String(item.handle || "");
      if (!display || !handle) continue;
      const start = value.length;
      value += display;
      anchors.push({ start, end: value.length, handle, display });
    }
  }
  return { text: value || text, anchors: normalizedAnchors(anchors, value || text), degraded: false };
}

export function applySemanticTextEdit(draft: SemanticDraft, start: number, end: number, replacement: string): SemanticDraft {
  const safeStart = Math.max(0, Math.min(draft.text.length, start));
  const safeEnd = Math.max(safeStart, Math.min(draft.text.length, end));
  const delta = replacement.length - (safeEnd - safeStart);
  let degraded = draft.degraded;
  const anchors = draft.anchors.flatMap(anchor => {
    if (anchor.end <= safeStart) return [anchor];
    if (anchor.start >= safeEnd) return [{ ...anchor, start: anchor.start + delta, end: anchor.end + delta }];
    degraded = true;
    return [];
  });
  const text = draft.text.slice(0, safeStart) + replacement + draft.text.slice(safeEnd);
  return { text, anchors: normalizedAnchors(anchors, text), degraded };
}

export function reconcileSemanticText(draft: SemanticDraft, text: string): SemanticDraft {
  if (draft.text === text) return draft;
  let start = 0;
  while (start < draft.text.length && start < text.length && draft.text[start] === text[start]) start += 1;
  let oldEnd = draft.text.length;
  let newEnd = text.length;
  while (oldEnd > start && newEnd > start && draft.text[oldEnd - 1] === text[newEnd - 1]) {
    oldEnd -= 1;
    newEnd -= 1;
  }
  return applySemanticTextEdit(draft, start, oldEnd, text.slice(start, newEnd));
}

export function insertSemanticReference(draft: SemanticDraft, start: number, end: number, handle: string, display: string) {
  const replacement = `${display} `;
  const edited = applySemanticTextEdit(draft, start, end, replacement);
  const anchor = { start, end: start + display.length, handle, display };
  return { text: edited.text, anchors: normalizedAnchors([...edited.anchors, anchor], edited.text), degraded: edited.degraded };
}

export function serializeSemanticDraft(draft: SemanticDraft) {
  const anchors = normalizedAnchors(draft.anchors, draft.text);
  const parts: Array<{ type: "text"; text: string } | { type: "reference"; handle: string; display: string }> = [];
  let cursor = 0;
  for (const anchor of anchors) {
    if (anchor.start > cursor) parts.push({ type: "text", text: draft.text.slice(cursor, anchor.start) });
    parts.push({ type: "reference", handle: anchor.handle, display: anchor.display });
    cursor = anchor.end;
  }
  if (cursor < draft.text.length || !parts.length) parts.push({ type: "text", text: draft.text.slice(cursor) });
  return { schema_version: 2 as const, parts };
}
