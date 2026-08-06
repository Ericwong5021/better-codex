import { closeSync, existsSync, openSync, readSync, readdirSync, createReadStream } from "node:fs";
import { createInterface } from "node:readline";
import { homedir } from "node:os";
import { join } from "node:path";
import { renderMarkdown } from "./markdown.js";

const MAX_MESSAGES = 80;

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
};

export type ConversationResult = {
  thread_id: string;
  markdown: string;
  html: string;
  phase: string | null;
  rollout_path: string | null;
  found: boolean;
  messages: ConversationMessage[];
};

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

type PendingAgent = {
  message: string;
  phase: string | null;
  timestamp: string | null;
};

async function readConversationMessages(rolloutPath: string) {
  const messages: ConversationMessage[] = [];
  let index = 0;
  let lastIncludedUserAt: string | null = null;
  const turnStartedAt = new Map<string, string>();
  let pendingAgent: PendingAgent | null = null;

  const pushUser = (message: string, timestamp: string | null) => {
    flushPendingAgent(null);
    lastIncludedUserAt = timestamp;
    messages.push({
      id: `user-${index++}`,
      role: "user",
      markdown: message,
      html: renderMarkdown(message),
      phase: null,
      timestamp,
    });
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
    messages.push({
      id: `agent-${index++}`,
      role: "agent",
      markdown: message,
      html: renderMarkdown(message),
      phase,
      timestamp,
    });
  };

  const flushPendingAgent = (turnId: string | null) => {
    if (!pendingAgent) return;
    const next = pendingAgent;
    pendingAgent = null;
    pushAgent(next.message, next.phase, next.timestamp, turnId);
  };

  const lines = createInterface({ input: createReadStream(rolloutPath, { encoding: "utf8" }), crlfDelay: Infinity });
  for await (const line of lines) {
    if (!line.includes("user_message") && !line.includes("agent_message") && !line.includes("response_item")) continue;
    let event: {
      type?: string;
      timestamp?: unknown;
      payload?: {
        type?: string;
        role?: string;
        message?: unknown;
        phase?: unknown;
        content?: unknown;
        internal_chat_message_metadata_passthrough?: { turn_id?: unknown };
      };
    };
    try {
      event = JSON.parse(line) as typeof event;
    } catch {
      continue;
    }

    const timestamp = typeof event.timestamp === "string" ? event.timestamp : null;

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
    const message = typeof event.payload.message === "string" ? event.payload.message.trim() : "";
    if (!message) continue;

    if (type === "user_message") {
      if (!shouldIncludeUserMessage(message)) continue;
      pushUser(message, timestamp);
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
  return messages.length > MAX_MESSAGES ? messages.slice(-MAX_MESSAGES) : messages;
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
    ...partial,
  });

  const id = normalizeSessionId(threadId);
  if (!id) return empty();
  const rolloutPath = findRolloutPath(id);
  if (!rolloutPath) return empty({ thread_id: id });

  const messages = await readConversationMessages(rolloutPath);
  const lastAgent = [...messages].reverse().find(item => item.role === "agent") || null;
  return {
    thread_id: id,
    markdown: lastAgent?.markdown || "",
    html: lastAgent?.html || "",
    phase: lastAgent?.phase || null,
    rollout_path: rolloutPath,
    found: messages.length > 0,
    messages,
  };
}
