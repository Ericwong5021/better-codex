import { renderMarkdown } from "../../../markdown.js";
import type { ComponentContext } from "../../core/component.js";
import { createDisclosure } from "../../components/disclosure.js";
import { createInlineFeedback } from "../../components/inline-feedback.js";
import type { IconDefinition } from "../../primitives/icon.js";
import { historyStateLabel, historyTime, historyTone, type TaskHistory } from "./task-history-model.js";

export type HistoryViewOptions = { chevron: IconDefinition; translate(value: string): string };
type HistoryViewState = { history: TaskHistory | null; loading?: boolean; error?: string };
const node = (tag: string, className: string, text?: string) => {
  const element = document.createElement(tag); element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
};

export function createTaskHistoryView(context: ComponentContext, options: HistoryViewOptions) {
  const root = node("div", "better-codex-task-history");
  root.dataset.taskHistoryContent = "true";
  const t = options.translate;
  let handles: Array<{ destroy(): void }> = [];
  let destroyed = false;
  let lastState = "";
  const resultOpen = new Map<string, boolean>();
  function update(state: HistoryViewState) {
    if (destroyed) return;
    const signature = JSON.stringify(state);
    if (signature === lastState) return;
    lastState = signature;
    const scroll = root.scrollTop;
    const focused = root.contains(document.activeElement) ? (document.activeElement as HTMLElement).closest<HTMLElement>("[data-task-run]")?.dataset.taskRun : undefined;
    handles.forEach(handle => handle.destroy()); handles = [];
    root.replaceChildren();
    if (state.error) {
      const feedback = createInlineFeedback({ message: t("执行记录读取中断") + "：" + state.error, tone: "error" }, { ...context, mountId: `${context.mountId}:error` });
      root.append(feedback.element); handles.push(feedback);
    }
    const history = state.history;
    if (!history) {
      root.append(node("p", "better-codex-history-empty", t(state.loading ? "正在读取执行记录…" : "展开后读取执行记录")));
      return;
    }
    const acceptance = node("div", "better-codex-history-acceptance");
    const accepted = history.acceptance_state === "accepted";
    acceptance.dataset.accepted = String(accepted);
    acceptance.append(node("span", "better-codex-history-status", t(accepted ? "已人工验收" : "验收未确认")), node("span", "better-codex-history-hint", t("执行结果与人工验收分别记录")));
    root.append(acceptance);
    if (history.blocker) {
      const feedback = createInlineFeedback({ message: history.blocker.message, tone: "warning" }, { ...context, mountId: `${context.mountId}:blocker` });
      feedback.element.dataset.historyBlocker = "true";
      root.append(feedback.element); handles.push(feedback);
    }
    if (history.relationships?.parent_issue_id || history.dependencies?.length) {
      const relations = node("div", "better-codex-history-relations");
      if (history.relationships?.parent_issue_id) {
        const parent = node("div", "better-codex-history-relation");
        parent.append(node("span", "better-codex-history-hint", t("父任务")), node("span", "", history.dependencies?.find(item => item.id === history.relationships!.parent_issue_id)?.identifier || history.relationships.parent_issue_id));
        relations.append(parent);
      }
      for (const dependency of history.dependencies || []) {
        const row = node("div", "better-codex-history-relation"); row.dataset.dependencyId = dependency.id;
        const status = node("span", "better-codex-history-status", t(dependency.accepted ? "已人工验收" : historyStateLabel(dependency.status)));
        status.dataset.tone = historyTone(dependency.accepted ? "done" : dependency.status);
        row.append(node("span", "better-codex-history-hint", t("依赖")), node("span", "", dependency.identifier || dependency.id), status);
        relations.append(row);
      }
      root.append(relations);
    }
    if (!history.runs.length) root.append(node("p", "better-codex-history-empty", t("暂无执行记录")));
    history.runs.slice(0, 20).forEach((run, index) => {
      const id = run.id || run.source_run_id || String(run.run_number);
      const article = node("article", "better-codex-history-run"); article.dataset.taskRun = id;
      const header = node("header", "better-codex-history-run-head");
      const status = node("span", "better-codex-history-status", t(historyStateLabel(run.state))); status.dataset.tone = historyTone(run.state);
      header.append(node("strong", "", t(`第 ${run.run_number} 次执行`)), status);
      const date = node("p", "better-codex-history-time", historyTime(run.started_at || run.first_reported_at, document.documentElement.lang || undefined) + (run.finished_at ? ` → ${historyTime(run.finished_at, document.documentElement.lang || undefined)}` : ""));
      date.title = [run.started_at || run.first_reported_at, run.finished_at].filter(Boolean).join(" → ");
      article.append(header, date);
      if (run.blocker) article.append(node("p", "better-codex-history-blocker", run.blocker.message));
      if (run.summary) {
        const result = node("div", "better-codex-history-result better-codex-markdown");
        result.innerHTML = renderMarkdown(run.summary.text, [], [], { images: false });
        if (run.summary.evidence.length) {
          result.append(node("h4", "better-codex-history-evidence-label", t("证据")));
          const evidence = node("ul", "");
          run.summary.evidence.forEach(item => evidence.append(node("li", "", item)));
          result.append(evidence);
        }
        const props = () => ({ label: t("查看结果"), content: result, open: resultOpen.get(id) || false, onToggle(open: boolean) { resultOpen.set(id, open); disclosure.update(props()); } });
        const disclosure = createDisclosure(props(), { ...context, mountId: `${context.mountId}:result:${index}` }, options.chevron);
        disclosure.element.dataset.runResult = id;
        article.append(disclosure.element); handles.push(disclosure);
      }
      root.append(article);
    });
    root.scrollTop = scroll;
    if (focused) Array.from(root.querySelectorAll<HTMLElement>("[data-task-run]")).find(item => item.dataset.taskRun === focused)?.querySelector<HTMLElement>("button")?.focus({ preventScroll: true });
  }
  return { element: root, update, destroy() { if (destroyed) return; destroyed = true; handles.forEach(handle => handle.destroy()); resultOpen.clear(); root.remove(); } };
}
