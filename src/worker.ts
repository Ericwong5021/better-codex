import { spawn, type ChildProcess } from "node:child_process";
import { createWriteStream, existsSync } from "node:fs";
import { createInterface } from "node:readline";
import { join } from "node:path";
import { agentConfigProfileName, defaultAgentProfile } from "./agent-profiles.js";
import { debugLoggingEnabled, runLogPath, workerLogPath } from "./config.js";
import { agentSandboxModes, Store, type AgentSandboxMode, type ClaimedIssue, type Issue } from "./db.js";
import { mockupSessionActive } from "./injection-state.js";

const interval = 60000;
const enrichmentTimeout = 30000;

function workerDebug(event: string, fields: Record<string, unknown> = {}) {
  if (!debugLoggingEnabled) return;
  try {
    createWriteStream(workerLogPath, { flags: "a" }).end(JSON.stringify({
      timestamp: new Date().toISOString(),
      scope: "worker",
      event,
      ...fields,
    }) + "\n");
  } catch {}
}

function codexPath() {
  const configured = process.env.BETTER_CODEX_CODEX_PATH;
  if (configured) return configured;
  const bundled = "/Applications/ChatGPT.app/Contents/Resources/codex";
  return existsSync(bundled) ? bundled : "codex";
}

// 这是给 AI 的自然语言任务提示，不是固定协议；任务详情、Skill 要求和 taskid 已足够，千万不要增加标题、标签、分隔符或其他复杂编排。
export function issuePrompt(claim: ClaimedIssue) {
  const details = claim.issue.description.trim();
  return `${details}

按照 /better-codex-issue skill 完成以上任务
taskid: ${claim.issue.identifier}`;
}

export class IssueWorker {
  private timer: NodeJS.Timeout | null = null;
  private readonly runs = new Map<string, { child: ChildProcess; claim: ClaimedIssue }>();
  private readonly enrichments = new Map<string, ChildProcess>();
  private readonly manualQueue = new Set<string>();
  private readonly stoppingRuns = new Set<string>();
  private stopped = true;

  constructor(private readonly store: Store) {}

  start() {
    this.stopped = false;
    this.store.recoverInterruptedRuns();
    for (const issue of this.store.listPendingEnrichmentIssues()) this.enrichIssue(issue, issue.description, issue.agent_id || "");
    this.schedule(0);
  }

  wake() {
    if (this.stopped) return;
    this.schedule(0);
  }

  startIssue(issueId: string) {
    if (this.stopped || mockupSessionActive()) return false;
    if (Array.from(this.runs.values()).some(({ claim }) => claim.issue.id === issueId)) return false;
    const claim = this.store.claimNextIssue(issueId);
    if (!claim) {
      const issue = this.store.getIssue(issueId);
      if (!issue || !this.store.isDispatchable(issue)) return false;
      this.manualQueue.add(issueId);
      this.wake();
      return true;
    }
    this.run(claim);
    return true;
  }

  stopIssue(issueId: string) {
    this.manualQueue.delete(issueId);
    const active = Array.from(this.runs.values()).find(({ claim }) => claim.issue.id === issueId);
    if (!active) return Promise.resolve(false);
    this.stoppingRuns.add(active.claim.runId);
    active.child.kill("SIGTERM");
    return new Promise<boolean>(resolve => {
      let settled = false;
      const finish = (stopped: boolean) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(stopped);
      };
      const timer = setTimeout(() => {
        active.child.kill("SIGKILL");
        setTimeout(() => finish(false), 1000).unref();
      }, 5000);
      timer.unref();
      active.child.once("close", () => finish(true));
    });
  }

  stop() {
    this.stopped = true;
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    this.manualQueue.clear();
    for (const { child, claim } of this.runs.values()) {
      this.store.interruptRun(claim.runId, claim.issue.id);
      child.kill("SIGTERM");
    }
    this.runs.clear();
    this.stoppingRuns.clear();
    for (const child of this.enrichments.values()) child.kill("SIGTERM");
    this.enrichments.clear();
  }

  private sandboxMode(agentId: string | null) {
    const mode = agentId ? this.store.getAgentProfile(agentId)?.sandbox_mode : defaultAgentProfile().sandbox_mode;
    return agentSandboxModes.includes(mode as AgentSandboxMode) ? mode as AgentSandboxMode : "workspace-write";
  }

  enrichIssue(issue: Issue, prompt: string, agentId: string) {
    const workspacePath = issue.workspace_path || "";
    if (this.enrichments.has(issue.id) || this.stopped) {
      workerDebug("enrichment_skipped", {
        issue_id: issue.id,
        identifier: issue.identifier,
        reason: this.stopped ? "worker_stopped" : "already_running",
      });
      return;
    }
    if (!workspacePath) {
      this.failEnrichment(issue, "workspace_missing");
      return;
    }
    workerDebug("enrichment_started", {
      issue_id: issue.id,
      identifier: issue.identifier,
      agent_id: agentId || null,
      prompt_length: prompt.length,
    });
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
    let finished = false;
    let timeout: NodeJS.Timeout | null = setTimeout(() => {
      workerDebug("enrichment_timeout", { issue_id: issue.id, identifier: issue.identifier, timeout_ms: enrichmentTimeout });
      finish("timeout");
      child.kill("SIGTERM");
    }, enrichmentTimeout);
    const lines = createInterface({ input: child.stdout! });
    lines.on("line", line => {
      const message = enrichmentMessage(line);
      if (message) messages.push(message);
    });
    const finish = (event: "error" | "close" | "timeout", code?: number | null, signal?: NodeJS.Signals | null) => {
      if (finished) return;
      finished = true;
      if (timeout) clearTimeout(timeout);
      timeout = null;
      lines.close();
      this.enrichments.delete(issue.id);
      const raw = messages.at(-1) || "";
      const result = event === "close" && code === 0 ? parseEnrichment(raw) : null;
      workerDebug("enrichment_finished", {
        issue_id: issue.id,
        identifier: issue.identifier,
        finish_event: event,
        exit_code: code ?? null,
        signal: signal ?? null,
        message_count: messages.length,
        last_message_length: raw.length,
        parse_succeeded: Boolean(result),
        title_same_as_input: result ? result.title === issue.title : null,
        description_same_as_input: result ? result.description === issue.description : null,
      });
      if (this.stopped) {
        workerDebug("enrichment_discarded", {
          issue_id: issue.id,
          identifier: issue.identifier,
          reason: "worker_stopped",
        });
        return;
      }
      const current = this.store.getIssue(issue.id);
      if (!current || current.version !== issue.version) {
        workerDebug("enrichment_discarded", {
          issue_id: issue.id,
          identifier: issue.identifier,
          reason: !current ? "issue_missing" : "version_changed",
          expected_version: issue.version,
          current_version: current?.version ?? null,
        });
        return;
      }
      try {
        const updated = this.store.updateIssue(issue.id, current.version, {
          ...(result
            ? {
                title: result.title,
                description: result.description,
                status: "todo",
                agent_enabled: true,
                agent_id: agentId,
                user_assigned: false,
                pending_actor: "agent",
                needs_attention: true,
                enrichment_status: null,
              }
            : {
                title: "任务理解失败",
                status: "blocked",
                agent_enabled: true,
                agent_id: agentId,
                user_assigned: false,
                pending_actor: "user",
                needs_attention: true,
                enrichment_status: "failed",
              }),
        });
        workerDebug("enrichment_applied", {
          issue_id: issue.id,
          identifier: issue.identifier,
          version: updated.version,
          used_fallback: !result,
          title_same_as_input: updated.title === issue.title,
          description_same_as_input: updated.description === issue.description,
        });
        if (this.store.isDispatchable(updated)) this.wake();
      } catch (error) {
        workerDebug("enrichment_apply_failed", {
          issue_id: issue.id,
          identifier: issue.identifier,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    };
    child.once("error", error => {
      workerDebug("enrichment_process_error", {
        issue_id: issue.id,
        identifier: issue.identifier,
        error: error.message,
      });
      finish("error");
    });
    child.once("close", (code, signal) => finish("close", code, signal));
  }

  private failEnrichment(issue: Issue, reason: string) {
    workerDebug("enrichment_failed", { issue_id: issue.id, identifier: issue.identifier, reason });
    try {
      this.store.updateIssue(issue.id, issue.version, {
        title: "任务理解失败",
        status: "blocked",
        agent_enabled: true,
        agent_id: issue.agent_id,
        user_assigned: false,
        pending_actor: "user",
        needs_attention: true,
        enrichment_status: "failed",
      });
    } catch (error) {
      workerDebug("enrichment_apply_failed", {
        issue_id: issue.id,
        identifier: issue.identifier,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private schedule(delay = interval) {
    if (this.stopped) return;
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => void this.tick(), delay);
    this.timer.unref();
  }

  private async tick() {
    try {
      if (mockupSessionActive()) return;
      for (const issueId of [...this.manualQueue]) {
        const issue = this.store.getIssue(issueId);
        if (!issue || !this.store.isDispatchable(issue)) {
          this.manualQueue.delete(issueId);
          continue;
        }
        const claim = this.store.claimNextIssue(issueId);
        if (!claim) continue;
        this.manualQueue.delete(issueId);
        this.run(claim);
      }
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
      this.sandboxMode(claim.issue.agent_id),
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
      const interrupted = this.stoppingRuns.delete(claim.runId);
      if (!this.stopped) {
        if (interrupted) this.store.interruptRun(claim.runId, claim.issue.id);
        else this.store.finishRun(claim.runId, claim.issue.id, code === 0, code === 0 ? undefined : `codex_exit_${code ?? signal ?? "unknown"}`);
      }
      this.runs.delete(claim.runId);
      this.wake();
    });
  }
}

function enrichmentPrompt(prompt: string) {
  return `你是 Better Codex 的 Issue 整理器。只整理用户输入，不执行任务，不修改工作区文件。输出且只输出一个 JSON 对象，不要 Markdown 代码围栏，不要额外文字，格式为 {"title":"...","description":"..."}。title 压缩成适合卡片展示的短语，只保留核心动作、对象和必要的引用编号，省略背景、原因与实现细节；中文尽量不超过 20 个字，英文最长 160 个字符。description 忠实、完整地转述用户意图，不要仅重复 title，去掉“帮我建个 issue”等路由废话；可以使用清晰的小标题或列表组织内容，但不得编造用户没有提供的需求、事实、进度或验收标准，必须保留输入中的 URL、PR 编号和文件路径。原始输入如下：\n\n${prompt}`;
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
