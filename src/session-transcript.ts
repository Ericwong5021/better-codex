import { closeSync, existsSync, openSync, readSync, readdirSync, createReadStream, statSync } from "node:fs";
import { createInterface } from "node:readline";
import { homedir } from "node:os";
import { join } from "node:path";
import { renderMarkdown } from "./markdown.js";

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
export type ConversationActivityResult = { activity: ConversationActivity; last_final_at: string | null };
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
  let activity: ConversationActivity = { status: "idle", turn_id: null, started_at: null, completed_at: null, updated_at: null };
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
    if (!line.includes("user_message") && !line.includes("agent_message") && !line.includes("response_item") && !line.includes("task_started") && !line.includes("task_complete") && !line.includes("turn_aborted")) continue;
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
  return { messages: messages.length > MAX_MESSAGES ? messages.slice(-MAX_MESSAGES) : messages, activity };
}

export async function readConversationActivity(threadId: string | null | undefined): Promise<ConversationActivityResult> {
  const empty = (): ConversationActivityResult => ({ activity: { status: "idle", turn_id: null, started_at: null, completed_at: null, updated_at: null }, last_final_at: null });
  const id = normalizeSessionId(threadId);
  if (!id) return empty();
  const rolloutPath = findRolloutPath(id);
  if (!rolloutPath) return empty();
  let initialStats: { mtimeMs: number; size: number };
  try {
    initialStats = statSync(rolloutPath);
    const cached = conversationActivities.get(rolloutPath);
    if (cached && cached.mtimeMs === initialStats.mtimeMs && cached.size === initialStats.size) return cached.result;
  } catch {
    return empty();
  }
  let activity: ConversationActivity = { status: "idle", turn_id: null, started_at: null, completed_at: null, updated_at: null };
  let lastFinalAt: string | null = null;
  const lines = createInterface({ input: createReadStream(rolloutPath, { encoding: "utf8" }), crlfDelay: Infinity });
  for await (const line of lines) {
    if (!line.includes("task_started") && !line.includes("task_complete") && !line.includes("turn_aborted") && !line.includes("agent_message") && !line.includes("response_item")) continue;
    let event: { type?: string; timestamp?: unknown; payload?: { type?: string; role?: string; phase?: unknown; turn_id?: unknown } };
    try { event = JSON.parse(line) as typeof event; } catch { continue; }
    const timestamp = typeof event.timestamp === "string" ? event.timestamp : null;
    if (activity.status === "running" && timestamp) activity.updated_at = timestamp;
    if (event.type === "event_msg" && event.payload?.type === "task_started") {
      activity = { status: "running", turn_id: typeof event.payload.turn_id === "string" ? event.payload.turn_id : null, started_at: timestamp, completed_at: null, updated_at: timestamp };
    } else if (event.type === "event_msg" && event.payload?.type === "task_complete") {
      const turnId = typeof event.payload.turn_id === "string" ? event.payload.turn_id : null;
      if (!activity.turn_id || !turnId || activity.turn_id === turnId) activity = { status: "completed", turn_id: turnId || activity.turn_id, started_at: activity.started_at, completed_at: timestamp, updated_at: timestamp };
    } else if (event.type === "event_msg" && event.payload?.type === "turn_aborted") {
      const turnId = typeof event.payload.turn_id === "string" ? event.payload.turn_id : null;
      if (!activity.turn_id || !turnId || activity.turn_id === turnId) activity = { status: "interrupted", turn_id: turnId || activity.turn_id, started_at: activity.started_at, completed_at: timestamp, updated_at: timestamp };
    }
    if (((event.type === "event_msg" && event.payload?.type === "agent_message") || (event.type === "response_item" && event.payload?.type === "message" && event.payload.role === "assistant")) && event.payload?.phase === "final_answer") lastFinalAt = timestamp;
  }
  const result = { activity, last_final_at: lastFinalAt };
  try {
    const stats = statSync(rolloutPath);
    if (stats.mtimeMs === initialStats.mtimeMs && stats.size === initialStats.size) {
      conversationActivities.set(rolloutPath, { mtimeMs: stats.mtimeMs, size: stats.size, result });
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
      conversationActivities.set(rolloutPath, { mtimeMs: stats.mtimeMs, size: stats.size, result: { activity, last_final_at: lastFinalAt } });
      if (conversationActivities.size > MAX_CONVERSATION_ACTIVITIES) conversationActivities.delete(conversationActivities.keys().next().value!);
    }
  } catch {}
  return result;
}
