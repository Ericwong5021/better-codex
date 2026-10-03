import type { TaskBlocker, TaskSummary } from "../../../external-task-journal.js";

export interface TaskHistory {
  acceptance_state?: "accepted" | "unknown";
  relationships?: { parent_issue_id: string | null; depends_on_issue_ids: string[] };
  dependencies?: Array<{ id: string; identifier: string | null; status: string; accepted: boolean }>;
  blocker?: TaskBlocker | null;
  runs: Array<{ id?: string; source_run_id?: string; run_number: number; state: string; started_at?: string; first_reported_at?: string; finished_at: string | null; summary: TaskSummary | null; blocker: TaskBlocker | null }>;
}
const labels: Record<string, string> = {
  queued: "待执行", claimed: "已领取", running: "执行中", scheduling: "等待评审", completed: "执行完成",
  failed: "执行失败", cancelled: "已取消", interrupted: "已停止", blocked: "已阻塞", waiting_user: "等待用户",
  waiting_approval: "等待批准", idle: "空闲", missing: "缺失", done: "已人工验收", in_review: "待人工验收", unknown: "未知",
};
export const historyStateLabel = (state: string) => labels[state] || state;
export function historyTime(value: string | null | undefined, locale?: string): string {
  if (!value || !Number.isFinite(Date.parse(value))) return "时间未知";
  return new Intl.DateTimeFormat(locale, { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}
export function historyTone(state: string) {
  return ["failed", "blocked", "interrupted", "missing"].includes(state) ? "danger"
    : ["running", "claimed", "waiting_user", "waiting_approval"].includes(state) ? "warning"
    : ["completed", "done"].includes(state) ? "success" : "neutral";
}
