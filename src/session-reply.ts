import { spawn, type ChildProcess } from "node:child_process";
import { createWriteStream, existsSync } from "node:fs";
import { join } from "node:path";
import { agentConfigProfileName } from "./agent-profiles.js";
import { runLogPath } from "./config.js";
import type { AgentSandboxMode, IssueReplyState, Store } from "./db.js";
import { normalizeSessionId, sessionWorkspace } from "./session-transcript.js";

function codexPath() {
  const configured = process.env.BETTER_CODEX_CODEX_PATH;
  if (configured) return configured;
  const bundled = "/Applications/ChatGPT.app/Contents/Resources/codex";
  return existsSync(bundled) ? bundled : "codex";
}

type ActiveReply = {
  state: IssueReplyState;
  child: ChildProcess;
};

const replies = new Map<string, ActiveReply>();

function replyFailure(output: string, fallback: string) {
  const value = output.toLowerCase();
  if (["timed out", "timeout", "deadline exceeded"].some(marker => value.includes(marker))) return "reply_timeout";
  if (["apiconnectionerror", "network", "fetch failed", "econnreset", "econnrefused", "enotfound", "dns", "socket hang up", "connection error"].some(marker => value.includes(marker))) return "reply_network_error";
  if (["permission denied", "operation not permitted", "eacces", "eperm", "forbidden", "unauthorized", "status 401", "status 403", "approval denied"].some(marker => value.includes(marker))) return "reply_permission_denied";
  return fallback;
}

export function getIssueReplyState(store: Store, issueId: string): IssueReplyState {
  return store.getIssueReplyState(issueId);
}

export function hasActiveIssueReplies() {
  return [...replies.values()].some(current => current.state.status === "running");
}

export function stopIssueReply(store: Store, issueId: string) {
  const current = replies.get(issueId);
  if (!current || current.state.status !== "running") return false;
  current.state.status = "interrupted";
  current.state.error = "runtime_stopped";
  current.state.finished_at = new Date().toISOString();
  current.child.kill("SIGTERM");
  store.setIssueReplyState(current.state);
  store.finishReplyRun(issueId, false);
  replies.delete(issueId);
  return true;
}

export function stopIssueReplies(store: Store) {
  for (const issueId of [...replies.keys()]) stopIssueReply(store, issueId);
}

export function startIssueReply(store: Store, input: {
  issueId: string;
  requestId: string;
  threadId: string;
  workspacePath?: string | null;
  message: string;
  agentId?: string | null;
  sandboxMode: AgentSandboxMode;
}) {
  const issueId = input.issueId;
  const currentState = store.getIssueReplyState(issueId);
  const current = replies.get(issueId);
  if (currentState.request_id === input.requestId && currentState.status !== "failed" && currentState.status !== "interrupted") return currentState;
  if (current?.state.status === "running") {
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

  store.beginReplyRun(issueId);

  const args = [
    "exec",
    ...(input.agentId ? ["--profile", agentConfigProfileName(input.agentId)] : []),
    "--json",
    "--color",
    "never",
    "-C",
    workspacePath,
    "-s",
    input.sandboxMode,
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
    request_id: input.requestId,
    status: "running",
    message,
    started_at: startedAt,
  };
  store.setIssueReplyState(state);
  const log = createWriteStream(join(runLogPath, `reply-${issueId}.log`), { flags: "a" });
  let failureOutput = "";
  let issueFinished = false;
  const finishIssue = (success: boolean) => {
    if (issueFinished) return;
    issueFinished = true;
    store.finishReplyRun(issueId, success);
  };
  const captureFailureOutput = (chunk: unknown) => {
    failureOutput = (failureOutput + String(chunk)).slice(-32768);
  };
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

  child.stdout?.on("data", chunk => {
    captureFailureOutput(chunk);
    log.write(chunk);
  });
  child.stderr?.on("data", chunk => {
    captureFailureOutput(chunk);
    log.write(chunk);
  });
  child.once("error", error => {
    if (state.status === "interrupted") {
      finishIssue(false);
      log.end();
      replies.delete(issueId);
      return;
    }
    state.status = "failed";
    state.error = replyFailure(error.message, error.message);
    state.finished_at = new Date().toISOString();
    log.write(error.stack || error.message);
    log.end();
    store.setIssueReplyState(state);
    finishIssue(false);
    replies.delete(issueId);
  });
  child.once("close", (code, signal) => {
    if (state.status === "interrupted") {
      finishIssue(false);
      log.end();
      replies.delete(issueId);
      return;
    }
    if (state.status === "running") {
      if (code === 0) {
        state.status = "succeeded";
      } else {
        state.status = "failed";
        state.error = replyFailure(failureOutput, `codex_exit_${code ?? signal ?? "unknown"}`);
      }
      state.finished_at = new Date().toISOString();
    }
    log.end();
    store.setIssueReplyState(state);
    finishIssue(state.status === "succeeded");
    replies.delete(issueId);
  });

  return state;
}
