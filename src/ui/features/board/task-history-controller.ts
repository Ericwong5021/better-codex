import type { ComponentContext } from "../../core/component.js";
import { createDisclosure } from "../../components/disclosure.js";
import { createTaskHistoryView, type HistoryViewOptions } from "./task-history-view.js";
import type { TaskHistory } from "./task-history-model.js";

export function createTaskHistoryController(issueId: string, read: (issueId: string) => Promise<TaskHistory>, context: ComponentContext, options: HistoryViewOptions) {
  let open = false, destroyed = false, loading = false, sequence = 0;
  let history: TaskHistory | null = null;
  let error = "";
  const view = createTaskHistoryView(context, options);
  const props = () => ({ label: options.translate("执行记录与依赖"), detail: history ? String(history.runs.length) : "", content: view.element, open,
    onToggle(next: boolean) { open = next; section.update(props()); if (open) void refresh(); } });
  const section = createDisclosure(props(), { ...context, mountId: `${context.mountId}:section` }, options.chevron);
  section.element.classList.add("better-codex-owned-task-history"); section.element.dataset.taskHistory = "true";
  view.element.dataset.ownedTaskHistoryContent = "true";
  async function refresh() {
    if (!open || destroyed || loading) return;
    const request = ++sequence; loading = true;
    if (!history) view.update({ history, loading, error });
    try {
      const next = await read(issueId);
      if (destroyed || request !== sequence) return;
      history = next; error = "";
    } catch (failure) {
      if (destroyed || request !== sequence) return;
      error = failure instanceof Error ? failure.message : String(failure);
    } finally {
      if (!destroyed && request === sequence) {
        loading = false;
        view.update({ history, error }); section.update(props());
      }
    }
  }
  function retainInteraction() {
    const focus = section.element.contains(document.activeElement) ? document.activeElement as HTMLElement : null;
    const scroll = view.element.scrollTop;
    return () => {
      if (destroyed) return;
      if (focus?.isConnected) focus.focus({ preventScroll: true });
      view.element.scrollTop = scroll;
    };
  }
  return { element: section.element, refresh, retainInteraction, destroy() { if (destroyed) return; destroyed = true; sequence += 1; view.destroy(); section.destroy(); } };
}
