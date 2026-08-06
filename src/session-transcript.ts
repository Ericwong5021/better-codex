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

async function readConversationMessages(rolloutPath: string) {
  const messages: ConversationMessage[] = [];
  let index = 0;
  const lines = createInterface({ input: createReadStream(rolloutPath, { encoding: "utf8" }), crlfDelay: Infinity });
  for await (const line of lines) {
    if (!line.includes("user_message") && !line.includes("agent_message")) continue;
    let event: {
      type?: string;
      timestamp?: unknown;
      payload?: { type?: string; message?: unknown; phase?: unknown };
    };
    try {
      event = JSON.parse(line) as typeof event;
    } catch {
      continue;
    }
    if (event.type !== "event_msg" || !event.payload) continue;
    const type = event.payload.type;
    const message = typeof event.payload.message === "string" ? event.payload.message.trim() : "";
    if (!message) continue;
    const timestamp = typeof event.timestamp === "string" ? event.timestamp : null;
    if (type === "user_message") {
      if (!shouldIncludeUserMessage(message)) continue;
      messages.push({
        id: `user-${index++}`,
        role: "user",
        markdown: message,
        html: renderMarkdown(message),
        phase: null,
        timestamp,
      });
      continue;
    }
    if (type === "agent_message") {
      const phase = typeof event.payload.phase === "string" ? event.payload.phase : null;
      if (phase !== "final_answer") continue;
      messages.push({
        id: `agent-${index++}`,
        role: "agent",
        markdown: message,
        html: renderMarkdown(message),
        phase,
        timestamp,
      });
    }
  }
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
