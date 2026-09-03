import { closeSync, existsSync, openSync, readFileSync, readSync, readdirSync, createReadStream, statSync } from "node:fs";
import { createInterface } from "node:readline";
import { homedir } from "node:os";
import { basename, extname, isAbsolute, join } from "node:path";
import { markdownLinks, renderMarkdown } from "./markdown.js";

const MAX_MESSAGES = 80;
const MAX_ROLLOUT_PATHS = 1024;
const MAX_CONVERSATION_RESULTS = 16;
const MAX_CONVERSATION_ACTIVITIES = 1024;
const rolloutPaths = new Map<string, string>();

export function normalizeSessionId(value: string | null | undefined) {
  const id = value?.replace(/^(local|cloud):/i, "") || "";
  return /^[a-f0-9-]{36}$/i.test(id) ? id : "";
}

export function sessionsRoot() {
  return join(process.env.CODEX_HOME || join(homedir(), ".codex"), "sessions");
}

export function findRolloutPath(sessionId: string) {
  const id = normalizeSessionId(sessionId);
  if (!id) return "";
  const cached = rolloutPaths.get(id);
  if (cached && existsSync(cached)) {
    rolloutPaths.delete(id);
    rolloutPaths.set(id, cached);
    return cached;
  }
  rolloutPaths.delete(id);
  const root = sessionsRoot();
  const visit = (directory: string, depth: number): string => {
    if (depth > 3) return "";
    let entries;
    try {
      entries = readdirSync(directory, { withFileTypes: true });
    } catch {
      return "";
    }
    for (const entry of entries) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) {
        const found = visit(path, depth + 1);
        if (found) return found;
      } else if (entry.name.endsWith(`-${id}.jsonl`)) {
        rolloutPaths.set(id, path);
        if (rolloutPaths.size > MAX_ROLLOUT_PATHS) rolloutPaths.delete(rolloutPaths.keys().next().value!);
        return path;
      }
    }
    return "";
  };
  return visit(root, 0);
}

export function sessionWorkspace(value: string | null | undefined) {
  const path = findRolloutPath(value || "");
  if (!path) return "";
  const descriptor = openSync(path, "r");
  try {
    const buffer = Buffer.alloc(4096);
    const length = readSync(descriptor, buffer, 0, buffer.length, 0);
    const match = buffer.subarray(0, length).toString("utf8").match(/"cwd":("(?:\\.|[^"\\])*")/);
    if (!match) return "";
    const workspace = JSON.parse(match[1]) as string;
    return existsSync(workspace) ? workspace : "";
  } finally {
    closeSync(descriptor);
  }
}

export type ConversationMessage = {
  id: string;
  role: "user" | "agent";
  markdown: string;
  html: string;
  phase: string | null;
  timestamp: string | null;
  attachments?: ConversationAttachment[];
};

export type ConversationAttachment = {
  name: string;
  type: string;
  kind: "image" | "pdf" | "text" | "file";
  source: "local" | "url";
  url?: string;
};

export type ConversationAttachmentData = ConversationAttachment & {
  size: number;
  data: string;
};

export type ConversationActivity = {
  status: "idle" | "running" | "completed" | "interrupted";
  turn_id: string | null;
  started_at: string | null;
  completed_at: string | null;
  updated_at: string | null;
};

export type ConversationResult = {
  thread_id: string;
  markdown: string;
  html: string;
  phase: string | null;
  rollout_path: string | null;
  found: boolean;
  messages: ConversationMessage[];
  activity: ConversationActivity;
};

const conversationResults = new Map<string, { mtimeMs: number; size: number; result: ConversationResult }>();
export type ConversationActivityResult = { activity: ConversationActivity; last_final_at: string | null; last_agent_message: string };
const conversationActivities = new Map<string, { mtimeMs: number; size: number; result: ConversationActivityResult }>();

function shouldIncludeUserMessage(message: string) {
  const trimmed = message.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith("/better-codex")) return false;
  if (/处理 Better Codex 任务\s+[A-Z]+-\d+/i.test(trimmed)) return false;
  if (trimmed.includes("使用 $better-codex 处理 Better Codex 任务")) return false;
  if (trimmed.includes("此 Session 已由 Better Codex Issue 接管")) return false;
  return true;
}

function stripMemoryCitation(value: string) {
  return value.replace(/<oai-mem-citation>[\s\S]*?<\/oai-mem-citation>/g, "").trim();
}

function agentTextFingerprint(message: string, phase: string | null) {
  return `${phase || ""}|${stripMemoryCitation(message).replace(/\s+/g, " ").trim()}`;
}

function attachmentType(value: string) {
  const extension = extname(value.split(/[?#]/, 1)[0]).toLowerCase();
  const types: Record<string, string> = {
    ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".gif": "image/gif", ".avif": "image/avif", ".bmp": "image/bmp", ".svg": "image/svg+xml",
    ".pdf": "application/pdf", ".txt": "text/plain", ".md": "text/markdown", ".log": "text/plain", ".csv": "text/csv", ".json": "application/json", ".yaml": "text/yaml", ".yml": "text/yaml", ".xml": "application/xml",
    ".doc": "application/msword", ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document", ".xls": "application/vnd.ms-excel", ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", ".ppt": "application/vnd.ms-powerpoint", ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ".zip": "application/zip", ".gz": "application/gzip", ".tar": "application/x-tar",
  };
  return types[extension] || "application/octet-stream";
}

function attachmentKind(type: string): ConversationAttachment["kind"] {
  if (type.startsWith("image/")) return "image";
  if (type === "application/pdf") return "pdf";
  if (type.startsWith("text/") || ["application/json", "application/xml"].includes(type)) return "text";
  return "file";
}

function attachmentName(value: string) {
  if (!/^https?:\/\//i.test(value)) return basename(value) || value;
  try {
    const name = basename(decodeURIComponent(new URL(value).pathname));
    return name || new URL(value).hostname;
  } catch {
    return value;
  }
}

function conversationAttachment(value: string) {
  const remote = /^https?:\/\//i.test(value);
  if (!remote && !isAbsolute(value)) return null;
  const type = attachmentType(value);
  return { name: attachmentName(value), type, kind: attachmentKind(type), source: remote ? "url" as const : "local" as const, ...(remote ? { url: value } : {}), value };
}

function conversationAttachmentKey(attachment: { source: "local" | "url"; value: string }) {
  return `${attachment.source}:${attachment.value}`;
}

function localMarkdownPath(value: string) {
  if (/^https?:\/\//i.test(value)) return value;
  return decodeURIComponent(value);
}

export function conversationContent(value: string, excludedAttachments?: ReadonlySet<string>) {
  const source = stripMemoryCitation(String(value || "").replace(/\r\n?/g, "\n")).trim();
  const lines = source.split("\n");
  let marker = -1;
  for (let index = lines.length - 1; index >= 0; index -= 1) {
    if (["附带文件：", "Attached files:"].includes(lines[index].trim())) {
      marker = index;
      break;
    }
  }
  const trailing = marker < 0 ? [] : lines.slice(marker + 1).filter(line => line.trim());
  const attachmentBlock = trailing.length > 0 && trailing.every(line => /^\s*[-*]\s+\S/.test(line));
  const listed = attachmentBlock
    ? trailing.map(line => line.replace(/^\s*[-*]\s+/, "").trim()).filter(Boolean).slice(0, 16).flatMap(value => {
      const attachment = conversationAttachment(value);
      return attachment ? [attachment] : [];
    })
    : [];
  const markdown = listed.length ? lines.slice(0, marker).join("\n").trim() : source;
  const attachments = [...listed];
  const selected = new Set(attachments.map(conversationAttachmentKey));
  const attachmentLinks: string[] = [];
  const literalLinks: string[] = [];
  for (const link of markdownLinks(markdown)) {
    const attachment = conversationAttachment(localMarkdownPath(link));
    if (!attachment) continue;
    if (attachment.source === "local" && attachment.kind !== "image") {
      literalLinks.push(link);
      continue;
    }
    if (attachment.kind !== "image") continue;
    const key = conversationAttachmentKey(attachment);
    if (!selected.has(key)) {
      if (attachments.length >= 16) continue;
      selected.add(key);
      attachments.push(attachment);
    }
    attachmentLinks.push(link);
  }
  return {
    markdown,
    attachments: excludedAttachments ? attachments.filter(attachment => !excludedAttachments.has(conversationAttachmentKey(attachment))) : attachments,
    attachmentLinks,
    literalLinks,
  };
}

export function conversationMessagesWithPendingReply(
  messages: ConversationMessage[],
  reply: { request_id?: string; status: string; message: string; started_at?: string },
  issueId: string,
) {
  const projected = messages.slice(-MAX_MESSAGES);
  if (reply.status !== "running" || !reply.message) return projected;
  const replyId = `reply-${reply.request_id || issueId}`;
  const startedAt = Date.parse(reply.started_at || "");
  const confirmed = projected.some(message => {
    if (message.id === replyId) return true;
    if (message.role !== "user" || message.markdown !== reply.message) return false;
    const messageAt = Date.parse(message.timestamp || "");
    return !Number.isFinite(startedAt) || Number.isFinite(messageAt) && messageAt >= startedAt;
  });
  if (confirmed) return projected;
  const content = conversationContent(reply.message);
  projected.push({
    id: replyId,
    role: "user",
    markdown: reply.message,
    html: renderMarkdown(content.markdown, content.attachmentLinks, content.literalLinks),
    phase: null,
    timestamp: reply.started_at || null,
    ...(content.attachments.length ? { attachments: content.attachments.map(({ value: _value, ...attachment }) => attachment) } : {}),
  });
  return projected.slice(-MAX_MESSAGES);
}

function extractAssistantText(content: unknown) {
  if (!Array.isArray(content)) return "";
  const parts: string[] = [];
  for (const item of content) {
    if (!item || typeof item !== "object") continue;
    const row = item as { type?: unknown; text?: unknown };
    if (row.type === "output_text" && typeof row.text === "string" && row.text.trim()) {
      parts.push(row.text.trim());
    }
  }
  return stripMemoryCitation(parts.join("\n"));
}

function extractItemUserMessage(item: unknown) {
  if (!item || typeof item !== "object") return null;
  const record = item as { type?: unknown; content?: unknown };
  if (record.type !== "UserMessage" || !Array.isArray(record.content)) return null;
  const texts: string[] = [];
  const imagePaths: string[] = [];
  for (const entry of record.content) {
    if (!entry || typeof entry !== "object") continue;
    const row = entry as { type?: unknown; text?: unknown; path?: unknown };
    if (row.type === "text" && typeof row.text === "string" && row.text.trim()) {
      texts.push(row.text.trim());
    } else if (row.type === "local_image" && typeof row.path === "string" && row.path.trim()) {
      imagePaths.push(row.path.trim());
    }
  }
  let message = texts.join("\n").trim();
  if (imagePaths.length && !imagePaths.some(path => message.includes(path))) {
    const list = imagePaths.map(path => `- ${path}`).join("\n");
    message = message ? `${message}\n\n附带文件：\n${list}` : `附带文件：\n${list}`;
  }
  return message;
}

function extractItemAgentMessage(item: unknown) {
  if (!item || typeof item !== "object") return "";
  const record = item as { type?: unknown; content?: unknown };
  if (record.type !== "AgentMessage" || !Array.isArray(record.content)) return "";
  const texts: string[] = [];
  for (const entry of record.content) {
    if (!entry || typeof entry !== "object") continue;
    const row = entry as { type?: unknown; text?: unknown };
    if (typeof row.type === "string" && row.type.toLowerCase() === "text" && typeof row.text === "string" && row.text.trim()) {
      texts.push(row.text.trim());
    }
  }
  return stripMemoryCitation(texts.join("\n"));
}

type PendingAgent = {
  message: string;
  phase: string | null;
  timestamp: string | null;
};

async function readConversationMessages(rolloutPath: string, limited = true) {
  const messages: ConversationMessage[] = [];
  const attachmentsByMessage = new Map<string, Array<ConversationAttachment & { value: string }>>();
  let activity: ConversationActivity = { status: "idle", turn_id: null, started_at: null, completed_at: null, updated_at: null };
  let index = 0;
  let lastIncludedUserAt: string | null = null;
  const turnStartedAt = new Map<string, string>();
  const userAttachments = new Set<string>();
  let pendingAgent: PendingAgent | null = null;

  const pushUser = (message: string, timestamp: string | null, content = conversationContent(message)) => {
    flushPendingAgent(null);
    lastIncludedUserAt = timestamp;
    const id = `user-${index++}`;
    messages.push({
      id,
      role: "user",
      markdown: message,
      html: renderMarkdown(content.markdown, content.attachmentLinks, content.literalLinks),
      phase: null,
      timestamp,
      ...(content.attachments.length ? { attachments: content.attachments.map(({ value: _value, ...attachment }) => attachment) } : {}),
    });
    attachmentsByMessage.set(id, content.attachments);
  };

  const shouldDropStaleTurn = (turnId: string | null, timestamp: string | null) => {
    if (!turnId || !lastIncludedUserAt || !timestamp) return false;
    const started = turnStartedAt.get(turnId);
    if (!started) return false;
    return started < lastIncludedUserAt && timestamp > lastIncludedUserAt;
  };

  const rememberTurn = (turnId: string | null, timestamp: string | null) => {
    if (!turnId || !timestamp || turnStartedAt.has(turnId)) return;
    turnStartedAt.set(turnId, timestamp);
  };

  const pushAgent = (message: string, phase: string | null, timestamp: string | null, turnId: string | null) => {
    rememberTurn(turnId, timestamp);
    if (shouldDropStaleTurn(turnId, timestamp)) return;
    const previous = messages[messages.length - 1];
    if (
      previous?.role === "agent"
      && previous.phase === phase
      && previous.markdown === message
    ) {
      return;
    }
    const content = conversationContent(message, userAttachments);
    const id = `agent-${index++}`;
    messages.push({
      id,
      role: "agent",
      markdown: message,
      html: renderMarkdown(content.markdown, content.attachmentLinks, content.literalLinks),
      phase,
      timestamp,
      ...(content.attachments.length ? { attachments: content.attachments.map(({ value: _value, ...attachment }) => attachment) } : {}),
    });
    attachmentsByMessage.set(id, content.attachments);
  };

  const flushPendingAgent = (turnId: string | null) => {
    if (!pendingAgent) return;
    const next = pendingAgent;
    pendingAgent = null;
    pushAgent(next.message, next.phase, next.timestamp, turnId);
  };

  const lines = createInterface({ input: createReadStream(rolloutPath, { encoding: "utf8" }), crlfDelay: Infinity });
  for await (const line of lines) {
    if (!line.includes("user_message") && !line.includes("agent_message") && !line.includes("response_item") && !line.includes("task_started") && !line.includes("task_complete") && !line.includes("turn_aborted") && !line.includes("item_completed")) continue;
    let event: {
      type?: string;
      timestamp?: unknown;
      payload?: {
        type?: string;
        role?: string;
        message?: unknown;
        phase?: unknown;
        content?: unknown;
        turn_id?: unknown;
        internal_chat_message_metadata_passthrough?: { turn_id?: unknown };
        item?: unknown;
        last_agent_message?: unknown;
      };
    };
    try {
      event = JSON.parse(line) as typeof event;
    } catch {
      continue;
    }

    const timestamp = typeof event.timestamp === "string" ? event.timestamp : null;
    if (activity.status === "running" && timestamp) activity.updated_at = timestamp;

    if (event.type === "event_msg" && event.payload?.type === "task_started") {
      activity = {
        status: "running",
        turn_id: typeof event.payload.turn_id === "string" ? event.payload.turn_id : null,
        started_at: timestamp,
        completed_at: null,
        updated_at: timestamp,
      };
      continue;
    }

    if (event.type === "event_msg" && event.payload?.type === "task_complete") {
      const turnId = typeof event.payload.turn_id === "string" ? event.payload.turn_id : null;
      if (!activity.turn_id || !turnId || activity.turn_id === turnId) {
        activity = {
          status: "completed",
          turn_id: turnId || activity.turn_id,
          started_at: activity.started_at,
          completed_at: timestamp,
          updated_at: timestamp,
        };
      }
      const lastMessage = typeof event.payload.last_agent_message === "string" ? event.payload.last_agent_message.trim() : "";
      if (lastMessage) {
        const target = [...messages].reverse().find(m => m.role === "agent" && m.markdown === lastMessage);
        if (target && !target.phase) target.phase = "final_answer";
      }
      continue;
    }

    if (event.type === "event_msg" && event.payload?.type === "turn_aborted") {
      const turnId = typeof event.payload.turn_id === "string" ? event.payload.turn_id : null;
      if (!activity.turn_id || !turnId || activity.turn_id === turnId) {
        activity = {
          status: "interrupted",
          turn_id: turnId || activity.turn_id,
          started_at: activity.started_at,
          completed_at: timestamp,
          updated_at: timestamp,
        };
      }
      continue;
    }

    if (event.type === "response_item" && event.payload?.type === "message" && event.payload.role === "assistant") {
      const turnId = typeof event.payload.internal_chat_message_metadata_passthrough?.turn_id === "string"
        ? event.payload.internal_chat_message_metadata_passthrough.turn_id
        : null;
      const phase = typeof event.payload.phase === "string" ? event.payload.phase : null;
      const text = extractAssistantText(event.payload.content);
      if (pendingAgent && text && agentTextFingerprint(pendingAgent.message, pendingAgent.phase) === agentTextFingerprint(text, phase)) {
        flushPendingAgent(turnId);
      } else {
        rememberTurn(turnId, timestamp);
      }
      continue;
    }

    if (event.type !== "event_msg" || !event.payload) continue;
    const type = event.payload.type;

    if (type === "item_completed" && event.payload.item) {
      const userMessage = extractItemUserMessage(event.payload.item);
      if (userMessage !== null) {
        const content = conversationContent(userMessage);
        for (const attachment of content.attachments) userAttachments.add(conversationAttachmentKey(attachment));
        if (!shouldIncludeUserMessage(userMessage)) continue;
        pushUser(userMessage, timestamp, content);
        continue;
      }
      const agentMessage = extractItemAgentMessage(event.payload.item);
      if (agentMessage) {
        const turnId = typeof event.payload.turn_id === "string" ? event.payload.turn_id : null;
        flushPendingAgent(null);
        pushAgent(agentMessage, null, timestamp, turnId);
        continue;
      }
    }

    const message = typeof event.payload.message === "string" ? event.payload.message.trim() : "";
    if (!message) continue;

    if (type === "user_message") {
      const content = conversationContent(message);
      for (const attachment of content.attachments) userAttachments.add(conversationAttachmentKey(attachment));
      if (!shouldIncludeUserMessage(message)) continue;
      pushUser(message, timestamp, content);
      continue;
    }

    if (type === "agent_message") {
      const phase = typeof event.payload.phase === "string" ? event.payload.phase : null;
      if (phase !== "final_answer" && phase !== "commentary") continue;
      flushPendingAgent(null);
      pendingAgent = { message, phase, timestamp };
    }
  }
  flushPendingAgent(null);
  return { messages: limited && messages.length > MAX_MESSAGES ? messages.slice(-MAX_MESSAGES) : messages, activity, attachmentsByMessage };
}

export async function readConversationActivity(threadId: string | null | undefined, expectedTurnId = ""): Promise<ConversationActivityResult> {
  const empty = (): ConversationActivityResult => ({ activity: { status: "idle", turn_id: null, started_at: null, completed_at: null, updated_at: null }, last_final_at: null, last_agent_message: "" });
  const id = normalizeSessionId(threadId);
  if (!id) return empty();
  const rolloutPath = findRolloutPath(id);
  if (!rolloutPath) return empty();
  let initialStats: { mtimeMs: number; size: number };
  try {
    initialStats = statSync(rolloutPath);
    const cacheKey = expectedTurnId ? `${rolloutPath}:${expectedTurnId}` : rolloutPath;
    const cached = conversationActivities.get(cacheKey);
    if (cached && cached.mtimeMs === initialStats.mtimeMs && cached.size === initialStats.size) return cached.result;
  } catch {
    return empty();
  }
  let activity: ConversationActivity = { status: "idle", turn_id: null, started_at: null, completed_at: null, updated_at: null };
  let lastFinalAt: string | null = null;
  let lastAgentMessage = "";
  const lines = createInterface({ input: createReadStream(rolloutPath, { encoding: "utf8" }), crlfDelay: Infinity });
  for await (const line of lines) {
    if (!line.includes("task_started") && !line.includes("task_complete") && !line.includes("turn_aborted") && !line.includes("agent_message") && !line.includes("response_item") && !line.includes("item_completed")) continue;
    let event: { type?: string; timestamp?: unknown; payload?: { type?: string; role?: string; phase?: unknown; turn_id?: unknown; last_agent_message?: unknown } };
    try { event = JSON.parse(line) as typeof event; } catch { continue; }
    const timestamp = typeof event.timestamp === "string" ? event.timestamp : null;
    if (activity.status === "running" && timestamp) activity.updated_at = timestamp;
    if (event.type === "event_msg" && event.payload?.type === "task_started") {
      const turnId = typeof event.payload.turn_id === "string" ? event.payload.turn_id : null;
      if (!expectedTurnId || turnId === expectedTurnId) activity = { status: "running", turn_id: turnId, started_at: timestamp, completed_at: null, updated_at: timestamp };
    } else if (event.type === "event_msg" && event.payload?.type === "task_complete") {
      const turnId = typeof event.payload.turn_id === "string" ? event.payload.turn_id : null;
      if ((!expectedTurnId || turnId === expectedTurnId) && (!activity.turn_id || !turnId || activity.turn_id === turnId)) {
        activity = { status: "completed", turn_id: turnId || activity.turn_id, started_at: activity.started_at, completed_at: timestamp, updated_at: timestamp };
        lastAgentMessage = typeof event.payload.last_agent_message === "string" ? event.payload.last_agent_message.trim() : "";
        if (lastAgentMessage && timestamp) lastFinalAt = timestamp;
      }
    } else if (event.type === "event_msg" && event.payload?.type === "turn_aborted") {
      const turnId = typeof event.payload.turn_id === "string" ? event.payload.turn_id : null;
      if ((!expectedTurnId || turnId === expectedTurnId) && (!activity.turn_id || !turnId || activity.turn_id === turnId)) activity = { status: "interrupted", turn_id: turnId || activity.turn_id, started_at: activity.started_at, completed_at: timestamp, updated_at: timestamp };
    }
    if (((event.type === "event_msg" && event.payload?.type === "agent_message") || (event.type === "response_item" && event.payload?.type === "message" && event.payload.role === "assistant")) && event.payload?.phase === "final_answer") lastFinalAt = timestamp;
  }
  const result = { activity, last_final_at: lastFinalAt, last_agent_message: lastAgentMessage };
  try {
    const stats = statSync(rolloutPath);
    if (stats.mtimeMs === initialStats.mtimeMs && stats.size === initialStats.size) {
      const cacheKey = expectedTurnId ? `${rolloutPath}:${expectedTurnId}` : rolloutPath;
      conversationActivities.set(cacheKey, { mtimeMs: stats.mtimeMs, size: stats.size, result });
      if (conversationActivities.size > MAX_CONVERSATION_ACTIVITIES) conversationActivities.delete(conversationActivities.keys().next().value!);
    }
  } catch {}
  return result;
}

export async function readConversationResult(threadId: string | null | undefined): Promise<ConversationResult> {
  const empty = (partial: Partial<ConversationResult> = {}): ConversationResult => ({
    thread_id: "",
    markdown: "",
    html: "",
    phase: null,
    rollout_path: null,
    found: false,
    messages: [],
    activity: { status: "idle", turn_id: null, started_at: null, completed_at: null, updated_at: null },
    ...partial,
  });

  const id = normalizeSessionId(threadId);
  if (!id) return empty();
  const rolloutPath = findRolloutPath(id);
  if (!rolloutPath) return empty({ thread_id: id });

  let initialStats: { mtimeMs: number; size: number };
  try {
    initialStats = statSync(rolloutPath);
    const cached = conversationResults.get(rolloutPath);
    if (cached && cached.mtimeMs === initialStats.mtimeMs && cached.size === initialStats.size) {
      conversationResults.delete(rolloutPath);
      conversationResults.set(rolloutPath, cached);
      return cached.result;
    }
  } catch {
    return empty({ thread_id: id });
  }

  const { messages, activity } = await readConversationMessages(rolloutPath);
  const lastAgent = [...messages].reverse().find(item => item.role === "agent") || null;
  const result: ConversationResult = {
    thread_id: id,
    markdown: lastAgent?.markdown || "",
    html: lastAgent?.html || "",
    phase: lastAgent?.phase || null,
    rollout_path: rolloutPath,
    found: messages.length > 0,
    messages,
    activity,
  };
  try {
    const stats = statSync(rolloutPath);
    if (stats.mtimeMs === initialStats.mtimeMs && stats.size === initialStats.size) {
      conversationResults.set(rolloutPath, { mtimeMs: stats.mtimeMs, size: stats.size, result });
      if (conversationResults.size > MAX_CONVERSATION_RESULTS) conversationResults.delete(conversationResults.keys().next().value!);
      const lastFinalAt = [...messages].reverse().find(item => item.role === "agent" && item.phase === "final_answer")?.timestamp || null;
      conversationActivities.set(rolloutPath, { mtimeMs: stats.mtimeMs, size: stats.size, result: { activity, last_final_at: lastFinalAt, last_agent_message: "" } });
      if (conversationActivities.size > MAX_CONVERSATION_ACTIVITIES) conversationActivities.delete(conversationActivities.keys().next().value!);
    }
  } catch {}
  return result;
}

export async function readConversationAttachment(threadId: string | null | undefined, messageId: string, attachmentIndex: number): Promise<ConversationAttachmentData> {
  if (!Number.isInteger(attachmentIndex) || attachmentIndex < 0 || attachmentIndex >= 16) throw new Error("attachment_not_found");
  const conversation = await readConversationResult(threadId);
  if (!conversation.messages.some(item => item.id === messageId) || !conversation.rollout_path) throw new Error("attachment_not_found");
  const { messages, attachmentsByMessage } = await readConversationMessages(conversation.rollout_path, false);
  if (!messages.some(item => item.id === messageId)) throw new Error("attachment_not_found");
  const attachment = attachmentsByMessage.get(messageId)?.[attachmentIndex];
  if (!attachment || attachment.source !== "local") throw new Error("attachment_not_found");
  let stats;
  try {
    stats = statSync(attachment.value);
  } catch {
    throw new Error("attachment_not_found");
  }
  if (!stats.isFile() || stats.size <= 0 || stats.size > 10 * 1024 * 1024) throw new Error("attachment_unavailable");
  const { value: _value, ...metadata } = attachment;
  return { ...metadata, size: stats.size, data: `data:${attachment.type};base64,${readFileSync(attachment.value).toString("base64")}` };
}
