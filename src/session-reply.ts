import { spawn, type ChildProcess } from "node:child_process";
import { createWriteStream, existsSync } from "node:fs";
import { join } from "node:path";
import { agentConfigProfileName } from "./agent-profiles.js";
import { runLogPath } from "./config.js";
import { normalizeSessionId, sessionWorkspace } from "./session-transcript.js";

function codexPath() {
  const configured = process.env.BETTER_CODEX_CODEX_PATH;
  if (configured) return configured;
  const bundled = "/Applications/ChatGPT.app/Contents/Resources/codex";
  return existsSync(bundled) ? bundled : "codex";
}

export type IssueReplyState = {
  issue_id: string;
  status: "idle" | "running" | "succeeded" | "failed";
  message: string;
  error?: string;
  started_at?: string;
  finished_at?: string;
};

type ActiveReply = {
  state: IssueReplyState;
  child: ChildProcess;
};

const replies = new Map<string, ActiveReply | { state: IssueReplyState }>();

export function getIssueReplyState(issueId: string): IssueReplyState {
  const current = replies.get(issueId);
  if (!current) {
    return { issue_id: issueId, status: "idle", message: "" };
  }
  return current.state;
}

export function stopIssueReplies() {
  const finishedAt = new Date().toISOString();
  for (const [issueId, current] of replies) {
    if ("child" in current && current.state.status === "running") {
      current.state.status = "failed";
      current.state.error = "runtime_stopped";
      current.state.finished_at = finishedAt;
      current.child.kill("SIGTERM");
      replies.set(issueId, { state: current.state });
    }
  }
}

export function startIssueReply(input: {
  issueId: string;
  threadId: string;
  workspacePath?: string | null;
  message: string;
  agentId?: string | null;
}) {
  const issueId = input.issueId;
  const current = replies.get(issueId);
  if (current && "child" in current && current.state.status === "running") {
    throw new Error("reply_busy");
  }

  const sessionId = normalizeSessionId(input.threadId);
  if (!sessionId) throw new Error("session_required");
  const message = input.message.trim();
  if (!message) throw new Error("message_required");

  const workspacePath = input.workspacePath && existsSync(input.workspacePath)
    ? input.workspacePath
    : sessionWorkspace(sessionId);
  if (!workspacePath) throw new Error("workspace_required");

  const args = [
    "exec",
    ...(input.agentId ? ["--profile", agentConfigProfileName(input.agentId)] : []),
    "--json",
    "--color",
    "never",
    "-C",
    workspacePath,
    "-s",
    "workspace-write",
    "-c",
    'approval_policy="on-request"',
    "-c",
    'approvals_reviewer="auto_review"',
    "resume",
    sessionId,
    message,
  ];

  const startedAt = new Date().toISOString();
  const state: IssueReplyState = {
    issue_id: issueId,
    status: "running",
    message,
    started_at: startedAt,
  };
  const log = createWriteStream(join(runLogPath, `reply-${issueId}.log`), { flags: "a" });
  log.write(`\n--- ${startedAt} resume ${sessionId} ---\n`);
  const child = spawn(codexPath(), args, {
    cwd: workspacePath,
    env: {
      ...process.env,
      BETTER_CODEX_ISSUE_ID: issueId,
      BETTER_CODEX_REPLY: "1",
    },
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });
  const active: ActiveReply = { state, child };
  replies.set(issueId, active);

  child.stdout?.on("data", chunk => log.write(chunk));
  child.stderr?.on("data", chunk => log.write(chunk));
  child.once("error", error => {
    state.status = "failed";
    state.error = error.message;
    state.finished_at = new Date().toISOString();
    log.write(error.stack || error.message);
    log.end();
    replies.set(issueId, { state });
  });
  child.once("close", (code, signal) => {
    if (state.status === "running") {
      if (code === 0) {
        state.status = "succeeded";
      } else {
        state.status = "failed";
        state.error = `codex_exit_${code ?? signal ?? "unknown"}`;
      }
      state.finished_at = new Date().toISOString();
    }
    log.end();
    replies.set(issueId, { state });
  });

  return state;
}
