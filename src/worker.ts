import { spawn, type ChildProcess } from "node:child_process";
import { createWriteStream, existsSync } from "node:fs";
import { createInterface } from "node:readline";
import { join } from "node:path";
import { agentConfigProfileName } from "./agent-profiles.js";
import { runLogPath, workerLogPath } from "./config.js";
import { Store, type ClaimedIssue, type Issue } from "./db.js";

const interval = 60000;

function codexPath() {
  const configured = process.env.BETTER_CODEX_CODEX_PATH;
  if (configured) return configured;
  const bundled = "/Applications/ChatGPT.app/Contents/Resources/codex";
  return existsSync(bundled) ? bundled : "codex";
}

export function issuePrompt(claim: ClaimedIssue) {
  const details = claim.issue.description.trim();
  return `/better-codex

处理 Better Codex 任务 ${claim.issue.identifier}：${claim.issue.title}${details ? `\n\n${details}` : ""}`;
}

export class IssueWorker {
  private timer: NodeJS.Timeout | null = null;
  private readonly runs = new Map<string, { child: ChildProcess; claim: ClaimedIssue }>();
  private readonly enrichments = new Map<string, ChildProcess>();
  private stopped = true;

  constructor(private readonly store: Store) {}

  start() {
    this.stopped = false;
    this.store.recoverInterruptedRuns();
    this.schedule(0);
  }

  wake() {
    if (this.stopped) return;
    this.schedule(0);
  }

  startIssue(issueId: string) {
    if (this.stopped) return false;
    const claim = this.store.claimNextIssue(issueId);
    if (!claim) return false;
    this.run(claim);
    return true;
  }

  stop() {
    this.stopped = true;
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    for (const { child, claim } of this.runs.values()) {
      this.store.interruptRun(claim.runId, claim.issue.id);
      child.kill("SIGTERM");
    }
    this.runs.clear();
    for (const child of this.enrichments.values()) child.kill("SIGTERM");
    this.enrichments.clear();
  }

  enrichIssue(issue: Issue, prompt: string, agentId: string) {
    const workspacePath = issue.workspace_path || "";
    if (!workspacePath || this.stopped) return;
    const args = [
      "exec",
      ...(agentId ? ["--profile", agentConfigProfileName(agentId)] : []),
      "--json",
      "--color",
      "never",
      "-C",
      workspacePath,
      "-s",
      "read-only",
      enrichmentPrompt(prompt),
    ];
    const child = spawn(codexPath(), args, {
      cwd: workspacePath,
      env: {
        ...process.env,
        BETTER_CODEX_ISSUE_ID: issue.id,
        BETTER_CODEX_ISSUE_IDENTIFIER: issue.identifier,
        BETTER_CODEX_ENRICHMENT: "1",
      },
      stdio: ["ignore", "pipe", "ignore"],
      windowsHide: true,
    });
    this.enrichments.set(issue.id, child);
    const messages: string[] = [];
    const lines = createInterface({ input: child.stdout! });
    lines.on("line", line => {
      const message = enrichmentMessage(line);
      if (message) messages.push(message);
    });
    const finish = () => {
      lines.close();
      this.enrichments.delete(issue.id);
      if (this.stopped) return;
      const current = this.store.getIssue(issue.id);
      if (!current || current.version !== issue.version) return;
      const result = parseEnrichment(messages.at(-1) || "");
      const fallback = fallbackEnrichment(issue.identifier, issue.description);
      try {
        const updated = this.store.updateIssue(issue.id, current.version, {
          title: result?.title || fallback.title,
          description: result?.description || fallback.description,
          status: "todo",
          agent_enabled: true,
          agent_id: agentId,
          user_assigned: false,
          pending_actor: "agent",
          needs_attention: true,
        });
        if (this.store.isDispatchable(updated)) this.wake();
      } catch {}
    };
    child.once("error", finish);
    child.once("close", finish);
  }

  private schedule(delay = interval) {
    if (this.stopped) return;
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => void this.tick(), delay);
    this.timer.unref();
  }

  private async tick() {
    try {
      // claimNextIssue enforces per-agent max_concurrency, so keep claiming
      // until every agent with pending work is at capacity.
      let claim: ClaimedIssue | null;
      while (!this.stopped && (claim = this.store.claimNextIssue())) this.run(claim);
    } catch (error) {
      const output = error instanceof Error ? error.stack || error.message : String(error);
      createWriteStream(workerLogPath, { flags: "a" }).end(`${new Date().toISOString()} ${output}\n`);
    } finally {
      this.schedule();
    }
  }

  private run(claim: ClaimedIssue) {
    const workspacePath = claim.workspacePath && existsSync(claim.workspacePath) ? claim.workspacePath : "";
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
      windowsHide: true,
    });
    this.runs.set(claim.runId, { child, claim });
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
      this.runs.delete(claim.runId);
      this.wake();
    });
  }
}

function enrichmentPrompt(prompt: string) {
  return `你是 Better Codex 的 Issue 整理器。只整理用户输入，不执行任务，不修改工作区文件。输出且只输出一个 JSON 对象，不要 Markdown 代码围栏，不要额外文字，格式为 {"title":"...","description":"..."}。title 用简洁、明确、可执行的语义化标题，保留关键对象、目标和引用编号，最长 120 个字符。description 忠实转述用户意图，去掉“帮我建个 issue”等路由废话；可以使用清晰的小标题或列表组织内容，但不得编造用户没有提供的需求、事实、进度或验收标准，必须保留输入中的 URL、PR 编号和文件路径。原始输入如下：\n\n${prompt}`;
}

export function enrichmentMessage(line: string) {
  try {
    const event = JSON.parse(line) as {
      type?: string;
      item?: { type?: string; text?: string };
      payload?: { type?: string; message?: string; content?: Array<{ type?: string; text?: string }> };
    };
    if (event.type === "item.completed" && event.item?.type === "agent_message") return event.item.text || "";
    if (event.type === "event_msg" && event.payload?.type === "agent_message") return event.payload.message || "";
    if (event.type === "response_item" && event.payload?.type === "message") {
      return (event.payload.content || []).filter(item => item.type === "output_text").map(item => item.text || "").join("\n");
    }
  } catch {}
  return "";
}

export function parseEnrichment(value: string) {
  const start = value.indexOf("{");
  const end = value.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    const parsed = JSON.parse(value.slice(start, end + 1)) as { title?: unknown; description?: unknown };
    const title = typeof parsed.title === "string" ? parsed.title.trim().slice(0, 500) : "";
    const description = typeof parsed.description === "string" ? parsed.description.trim().slice(0, 100000) : "";
    return title && description ? { title, description } : null;
  } catch {
    return null;
  }
}

export function fallbackEnrichment(identifier: string, description: string) {
  const source = description.trim();
  return {
    title: identifier.trim() || "未命名 Issue",
    description: source,
  };
}
