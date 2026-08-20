import { spawn } from "node:child_process";
import { coreVersion } from "./compatibility.js";
import { codexExecutablePath } from "./codex-cli.js";

export type CodexThreadAction = "archive" | "unarchive" | "delete";

function appServerError(value: unknown) {
  if (typeof value === "string" && value) return value;
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const error = value as Record<string, unknown>;
    if (typeof error.message === "string" && error.message) return error.message;
    if (typeof error.code === "string" && error.code) return error.code;
  }
  return "codex_thread_action_failed";
}

function missingThread(error: unknown) {
  const value = String(error instanceof Error ? error.message : error || "").toLowerCase();
  return value.includes("thread not found") || value.includes("thread_not_found") || value.includes("rollout not found");
}

function actionAlreadyApplied(action: CodexThreadAction, error: unknown) {
  const value = String(error instanceof Error ? error.message : error || "").toLowerCase();
  if (action === "archive") return value.includes("already archived") || value.includes("thread_archived");
  if (action === "unarchive") return value.includes("not archived") || value.includes("already unarchived");
  return missingThread(error);
}

export function applyCodexThreadAction(threadIds: string[], action: CodexThreadAction) {
  const ids = [...new Set(threadIds.filter(value => /^[a-f0-9-]{36}$/i.test(value)))];
  if (!ids.length) return Promise.resolve();
  return new Promise<void>((resolve, reject) => {
    const child = spawn(codexExecutablePath(), ["app-server"], { stdio: ["pipe", "pipe", "ignore"], windowsHide: true });
    const pending = new Map<number, { resolve: () => void; reject: (error: Error) => void }>();
    let output = "";
    let sequence = 0;
    let settled = false;
    const finish = (error?: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      child.kill();
      for (const request of pending.values()) request.reject(error || new Error("codex_thread_action_closed"));
      pending.clear();
      if (error) reject(error);
      else resolve();
    };
    const request = (method: string, params: Record<string, unknown>) => {
      const id = ++sequence;
      return new Promise<void>((requestResolve, requestReject) => {
        pending.set(id, { resolve: requestResolve, reject: requestReject });
        child.stdin.write(`${JSON.stringify({ id, method, params })}\n`);
      });
    };
    const timeout = setTimeout(() => finish(new Error("codex_thread_action_timeout")), 30000);
    timeout.unref();
    child.once("error", error => finish(error));
    child.once("close", () => finish(new Error("codex_thread_action_closed")));
    child.stdout.on("data", chunk => {
      output += String(chunk);
      const lines = output.split(/\r?\n/);
      output = lines.pop() || "";
      for (const line of lines) {
        try {
          const message = JSON.parse(line) as { id?: unknown; result?: unknown; error?: unknown; method?: unknown };
          if (message.id === undefined || message.method) continue;
          const id = Number(message.id);
          const current = pending.get(id);
          if (!current) continue;
          pending.delete(id);
          if (message.error) current.reject(new Error(appServerError(message.error)));
          else current.resolve();
        } catch {}
      }
    });
    void (async () => {
      try {
        await request("initialize", {
          clientInfo: { name: "better-codex", title: "Better Codex", version: coreVersion },
          capabilities: { experimentalApi: true },
        });
        child.stdin.write(`${JSON.stringify({ method: "initialized", params: {} })}\n`);
        for (const threadId of ids) {
          try {
            await request(`thread/${action}`, { threadId });
          } catch (error) {
            if (!missingThread(error) && !actionAlreadyApplied(action, error)) throw error;
          }
        }
        finish();
      } catch (error) {
        finish(error instanceof Error ? error : new Error("codex_thread_action_failed"));
      }
    })();
  });
}
