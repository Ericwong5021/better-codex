import { spawn, type ChildProcess } from "node:child_process";
import { closeSync, createWriteStream, existsSync, openSync, readSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { createInterface } from "node:readline";
import { join } from "node:path";
import { agentConfigProfileName } from "./agent-profiles.js";
import { runLogPath, workerLogPath } from "./config.js";
import { Store, type ClaimedIssue } from "./db.js";

const interval = 60000;

function codexPath() {
  const configured = process.env.BETTER_CODEX_CODEX_PATH;
  if (configured) return configured;
  const bundled = "/Applications/ChatGPT.app/Contents/Resources/codex";
  return existsSync(bundled) ? bundled : "codex";
}

function sessionWorkspace(value: string | null) {
  const id = value?.replace(/^(local|cloud):/i, "") || "";
  if (!/^[a-f0-9-]{36}$/i.test(id)) return "";
  const root = join(homedir(), ".codex", "sessions");
  const visit = (directory: string, depth: number): string => {
    if (depth > 3) return "";
    let entries;
    try { entries = readdirSync(directory, { withFileTypes: true }); } catch { return ""; }
    for (const entry of entries) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) {
        const found = visit(path, depth + 1);
        if (found) return found;
      } else if (entry.name.endsWith(`-${id}.jsonl`)) {
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
    }
    return "";
  };
  return visit(root, 0);
}

export function issuePrompt(claim: ClaimedIssue) {
  const details = claim.issue.description.trim();
  return `/better-codex

使用 $better-codex 处理 Better Codex 任务 ${claim.issue.identifier}：${claim.issue.title}${details ? `\n\n${details}` : ""}

此 Session 已由 Better Codex Issue 接管。开始前读取 Skill，结束前按实际结果同步看板状态：无法继续时移到 blocked，完成但需要用户审查时移到 in_review，圆满完成且无需审查时移到 done。通过 Skill 新建的任务必须放到 backlog。

请直接完成任务并验证结果。不要提交或推送代码，完成后简洁说明结果。`;
}

export class IssueWorker {
  private timer: NodeJS.Timeout | null = null;
  private child: ChildProcess | null = null;
  private active: ClaimedIssue | null = null;
  private stopped = true;

  constructor(private readonly store: Store) {}

  start() {
    this.stopped = false;
    this.store.recoverInterruptedRuns();
    this.schedule(0);
  }

  wake() {
    if (this.stopped || this.child) return;
    this.schedule(0);
  }

  stop() {
    this.stopped = true;
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    if (this.active) this.store.interruptRun(this.active.runId, this.active.issue.id);
    this.child?.kill("SIGTERM");
    this.child = null;
    this.active = null;
  }

  private schedule(delay = interval) {
    if (this.stopped) return;
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => void this.tick(), delay);
    this.timer.unref();
  }

  private async tick() {
    try {
      if (!this.child) {
        const claim = this.store.claimNextIssue();
        if (claim) this.run(claim);
      }
    } catch (error) {
      const output = error instanceof Error ? error.stack || error.message : String(error);
      createWriteStream(workerLogPath, { flags: "a" }).end(`${new Date().toISOString()} ${output}\n`);
    } finally {
      this.schedule();
    }
  }

  private run(claim: ClaimedIssue) {
    const workspacePath = claim.workspacePath && existsSync(claim.workspacePath) ? claim.workspacePath : sessionWorkspace(claim.issue.thread_id);
    if (!workspacePath) {
      this.store.finishRun(claim.runId, claim.issue.id, false, "workspace_required");
      return;
    }
    if (workspacePath !== claim.workspacePath) this.store.setRunWorkspace(claim.issue.id, workspacePath);
    const args = [
      "exec",
      ...(claim.issue.agent_id ? ["--profile", agentConfigProfileName(claim.issue.agent_id)] : []),
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
      issuePrompt(claim),
    ];
    const log = createWriteStream(join(runLogPath, `${claim.runId}.log`), { flags: "a" });
    const child = spawn(codexPath(), args, {
      cwd: workspacePath,
      env: {
        ...process.env,
        BETTER_CODEX_ISSUE_ID: claim.issue.id,
        BETTER_CODEX_ISSUE_IDENTIFIER: claim.issue.identifier,
        BETTER_CODEX_RUN_ID: claim.runId,
      },
      stdio: ["ignore", "pipe", "pipe"],
    });
    this.active = claim;
    this.child = child;
    this.store.startRun(claim.runId, child.pid || 0);
    const lines = createInterface({ input: child.stdout! });
    lines.on("line", line => {
      log.write(line + "\n");
      try {
        const event = JSON.parse(line) as { type?: string; thread_id?: string };
        if (event.type === "thread.started" && event.thread_id) this.store.linkRunThread(claim.runId, claim.issue.id, event.thread_id);
      } catch {}
    });
    child.stderr?.on("data", chunk => log.write(chunk));
    child.once("error", error => {
      log.write(error.stack || error.message);
    });
    child.once("close", (code, signal) => {
      lines.close();
      log.end();
      if (!this.stopped) this.store.finishRun(claim.runId, claim.issue.id, code === 0, code === 0 ? undefined : `codex_exit_${code ?? signal ?? "unknown"}`);
      this.child = null;
      this.active = null;
      this.wake();
    });
  }
}
