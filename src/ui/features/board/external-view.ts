import type { ExternalObservation, ExternalObservationMessage } from "../../../external-observations.js";
import type { ComponentContext } from "../../core/component.js";
import { createDialog } from "../../components/dialog.js";
import { createDisclosure } from "../../components/disclosure.js";
import { createIconButton } from "../../primitives/button.js";
import { iconElement, type IconDefinition } from "../../primitives/icon.js";
import { externalMessageGroups, externalObservationPresentation } from "./external-model.js";
import { taskCreatorPresentation } from "./creator-model.js";
import type { TaskCreatorProfile } from "../../../task-creator-profiles.js";
import { renderMarkdown } from "../../../markdown.js";
import { creatorDetailMarkup } from "./creator-view.js";
import { createTaskHistoryView } from "./task-history-view.js";
import { historyTime } from "./task-history-model.js";
import type { ExternalTaskRun } from "../../../external-task-journal.js";

type Detail = { observation: ExternalObservation; messages: ExternalObservationMessage[]; runs?: ExternalTaskRun[]; connected: boolean; receivedAt: number; error?: string; creatorProfiles?: TaskCreatorProfile[]; projectName?: string };
type ViewOptions = { icons: Record<string, IconDefinition>; translate: (value: string) => string };
const element = (tag: string, className: string, text?: string) => {
  const node = document.createElement(tag); node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
};
const escape = (value: string) => value.replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!);
const markdown = (text: string, className: string) => {
  const node = element("div", `better-codex-markdown ${className}`);
  node.innerHTML = renderMarkdown(text, [], [], { images: false });
  return node;
};

/** Task detail uses the shared dialog, controls and history with observation-only actions. */
export function createExternalObservationDetail(initial: Detail, context: ComponentContext, options: ViewOptions) {
  let value = initial;
  let expanded = false, destroyed = false, metadataOpen = false, historyOpen = false;
  const repeatedOpen = new Map<string, boolean>();
  let repeatedSections: ReturnType<typeof createDisclosure>[] = [];
  const t = options.translate;
  const content = element("div", "better-codex-external-detail");
  const metadataBody = element("div", "better-codex-external-source-content");
  const metadataProps = () => ({ label: t("来源与同步详情"), content: metadataBody, open: metadataOpen, onToggle(open: boolean) { metadataOpen = open; metadata.update(metadataProps()); } });
  const metadata = createDisclosure(metadataProps(), { ...context, mountId: `${context.mountId}:source` }, options.icons.chevron);
  metadata.element.classList.add("better-codex-external-metadata");
  const attempts = createTaskHistoryView({ ...context, mountId: `${context.mountId}:attempts` }, { chevron: options.icons.chevron, translate: t });
  const historyProps = () => ({ label: t("执行记录与依赖"), detail: String(value.runs?.length || 0), content: attempts.element, open: historyOpen, onToggle(open: boolean) { historyOpen = open; historySection.update(historyProps()); } });
  const historySection = createDisclosure(historyProps(), { ...context, mountId: `${context.mountId}:history` }, options.icons.chevron);
  historySection.element.dataset.externalTaskHistory = "true";
  let dialog: ReturnType<typeof createDialog>;
  const closeButton = createIconButton({ label: t("关闭"), accessibleName: t("关闭"), icon: options.icons.close, variant: "ghost", onPress: () => destroy() }, { ...context, mountId: `${context.mountId}:close` });
  closeButton.element.classList.add("better-codex-icon-button"); closeButton.element.dataset.dialogClose = "true";
  const expandProps = () => ({ label: t(expanded ? "退出全屏" : "展开"), accessibleName: t(expanded ? "退出全屏" : "展开"), icon: options.icons[expanded ? "shrink" : "expand"], variant: "ghost" as const,
    onPress: () => { expanded = !expanded; syncBounds(); expandButton.update(expandProps()); } });
  const expandButton = createIconButton(expandProps(), { ...context, mountId: `${context.mountId}:expand` });
  expandButton.element.classList.add("better-codex-icon-button"); expandButton.element.dataset.dialogExpand = "true";
  function syncBounds() {
    if (!dialog) return;
    dialog.element.dataset.expanded = String(expanded);
    const bounds = document.getElementById("better-codex-panel")?.getBoundingClientRect();
    const frame = bounds?.width && bounds?.height ? bounds : { top: 0, left: 0, width: innerWidth, height: innerHeight };
    for (const name of ["top", "left", "width", "height"] as const) dialog.element.style.setProperty(`--bc-dialog-fullscreen-${name}`, `${frame[name]}px`);
  }
  function render() {
    const previousBody = content.querySelector<HTMLElement>(".better-codex-external-detail-body");
    const scroll = previousBody?.scrollTop || 0;
    const secondaryScroll = content.querySelector<HTMLElement>(".better-codex-external-secondary")?.scrollTop || 0;
    const active = document.activeElement as HTMLElement | null;
    const preserveFocus = active && content.contains(active);
    const focusedRun = active?.closest<HTMLElement>("[data-task-run]")?.dataset.taskRun;
    const focusedRepeat = active?.closest<HTMLElement>("[data-external-repeat]")?.dataset.externalRepeat;
    for (const section of repeatedSections) section.destroy();
    repeatedSections = [];
    const record = value.observation;
    const presentation = externalObservationPresentation(record, value);
    const creator = taskCreatorPresentation({ external_observation: record }, value.creatorProfiles || [], []);
    const head = element("div", "better-codex-dialog-head better-codex-external-detail-head");
    const leading = element("div", "better-codex-dialog-head-leading");
    const breadcrumb = element("nav", "better-codex-dialog-breadcrumb"); breadcrumb.setAttribute("aria-label", t("任务看板"));
    breadcrumb.append(element("span", "", value.projectName || t("未提供")), iconElement({ definition: options.icons.chevron }), element("strong", "", `EXT-${record.id.slice(-6).toUpperCase()}`));
    leading.append(breadcrumb);
    const actions = element("div", "better-codex-dialog-head-actions");
    actions.innerHTML = creatorDetailMarkup(creator, escape, t);
    actions.append(expandButton.element, closeButton.element); head.append(leading, actions);
    const title = element("h2", "better-codex-manual-title", record.title);
    const description = element("section", "better-codex-description-field better-codex-external-description");
    description.setAttribute("aria-label", t("任务说明"));
    description.append(record.description ? markdown(record.description, "") : element("p", "better-codex-external-sync", t("暂无任务说明")));
    const fields = element("dl", "better-codex-external-fields");
    const rows = [
      ["创建者来源", creator.tooltip], ["当前执行者", record.executor?.name ? `${record.executor.name}（任务自报）` : "未知"],
      ["来源可信度", "任务自报 · 创建者未验证"], ["同步情况", presentation.freshnessLabel],
      ["最近上报", historyTime(record.reported_at)], ["最近接收", historyTime(record.observed_at)],
      ["结果与验收", presentation.resultReady ? "任务自报完成；尚未人工验收" : "任务目标是否完成：未知"],
      ["来源范围", `${record.provider} / ${record.account_id} / ${record.host_id}（声明）`],
      ["来源任务", record.source_task_id || record.thread_id || "未知"], ["源线程", record.thread_id || "未提供"], ["上报序号", String(record.sequence)],
    ];
    for (const [label, text] of rows) fields.append(element("dt", "", t(label)), element("dd", "", t(text)));
    metadataBody.replaceChildren(element("p", "better-codex-external-capability", t("此任务由来源对话执行，当前页面同步展示。自动发现尚未接通。")), fields);
    attempts.update({ history: { runs: value.runs || [], blocker: record.blocker, relationships: { parent_issue_id: record.parent_source_task_id || null, depends_on_issue_ids: record.depends_on_source_task_ids || [] }, dependencies: (record.depends_on_source_task_ids || []).map(id => ({ id, identifier: null, status: "未知 · 来源声明", accepted: false })) } });
    historySection.update(historyProps());
    const history = element("section", "better-codex-conversation better-codex-external-history");
    const historyHead = element("div", "better-codex-conversation-head");
    historyHead.append(element("span", "", t("对话")), element("span", "better-codex-conversation-status", t("任务上报")));
    history.append(historyHead);
    const messages = element("div", "better-codex-timeline better-codex-external-detail-body better-codex-external-messages");
    if (value.error) { const feedback = element("p", "better-codex-external-warning", t("读取中断") + `：${value.error}`); feedback.setAttribute("role", "alert"); messages.append(feedback); }
    const groups = externalMessageGroups(value.messages);
    const keys = new Set(groups.map(group => group.key));
    for (const key of repeatedOpen.keys()) if (!keys.has(key)) repeatedOpen.delete(key);
    for (const group of groups) {
      const message = group.messages[0];
      const latest = group.messages.at(-1)!;
      const row = element("article", "better-codex-bubble is-agent better-codex-external-message"); row.dataset.externalReportGroup = group.key;
      // Reuse the user-mapped source portrait; it does not assert message authorship.
      const sourceAvatar = message.role === "agent" && record.creator.display_source === "user_mapping" ? creator.avatar : null;
      const avatar = element("div", `better-codex-bubble-avatar${sourceAvatar ? " has-image" : " is-fallback"}`); avatar.setAttribute("aria-hidden", "true");
      if (sourceAvatar) {
        avatar.dataset.externalReportAvatar = record.creator.local_profile_id;
        const image = document.createElement("img"); image.alt = "";
        image.addEventListener("error", () => {
          avatar.classList.remove("has-image"); avatar.classList.add("is-fallback");
          avatar.replaceChildren(iconElement({ definition: options.icons.bot }));
        }, { once: true });
        image.src = sourceAvatar; avatar.append(image);
      } else avatar.append(iconElement({ definition: options.icons.bot }));
      const main = element("div", "better-codex-bubble-main");
      const meta = element("div", "better-codex-bubble-meta");
      const time = element("time", "", historyTime(latest.created_at)); time.setAttribute("datetime", latest.created_at); time.title = latest.created_at;
      meta.append(element("strong", "", t(message.role === "system" ? "系统记录" : "任务上报")), time);
      main.append(meta, markdown(message.text, "better-codex-bubble-content better-codex-external-message-content"));
      if (group.messages.length === 1) {
        row.dataset.externalMessageId = message.item_id;
      } else {
        const records = element("ol", "better-codex-external-repeat-records");
        for (const report of group.messages) {
          const entry = element("li", ""); entry.dataset.externalMessageId = report.item_id; entry.title = report.item_id;
          const timestamp = element("time", "", historyTime(report.created_at)); timestamp.setAttribute("datetime", report.created_at); timestamp.title = report.created_at;
          entry.append(timestamp, element("span", "", `${t("上报序号")} ${report.sequence}`)); records.append(entry);
        }
        const props = () => ({ label: t("相同内容上报"), detail: String(group.messages.length), content: records, open: repeatedOpen.get(group.key) || false,
          onToggle(open: boolean) { repeatedOpen.set(group.key, open); disclosure.update(props()); } });
        const disclosure = createDisclosure(props(), { ...context, mountId: `${context.mountId}:repeat:${group.key}` }, options.icons.chevron);
        disclosure.element.dataset.externalRepeat = group.key;
        repeatedSections.push(disclosure); main.append(disclosure.element);
      }
      row.append(avatar, main); messages.append(row);
    }
    if (!value.messages.length) messages.append(element("p", "better-codex-history-empty", t("暂未收到上报正文")));
    history.append(messages);
    const secondary = element("div", "better-codex-external-secondary");
    if (value.runs?.length || record.blocker || record.depends_on_source_task_ids?.length || record.parent_source_task_id) secondary.append(historySection.element);
    secondary.append(metadata.element);
    const properties = element("div", "better-codex-dialog-properties better-codex-external-properties");
    const status = element("span", "better-codex-property better-codex-external-status", t(presentation.statusLabel)); status.dataset.status = presentation.status;
    const sync = element("span", "better-codex-external-sync", t(presentation.freshnessLabel)); sync.dataset.fresh = String(presentation.fresh);
    properties.append(status, sync);
    content.replaceChildren(head, title, description, history, secondary, properties); messages.scrollTop = scroll; secondary.scrollTop = secondaryScroll;
    if (preserveFocus) {
      const target = active?.isConnected ? active : focusedRepeat
        ? Array.from(content.querySelectorAll<HTMLElement>("[data-external-repeat]")).find(item => item.dataset.externalRepeat === focusedRepeat)?.querySelector<HTMLElement>("button")
        : Array.from(attempts.element.querySelectorAll<HTMLElement>("[data-task-run]")).find(item => item.dataset.taskRun === focusedRun)?.querySelector<HTMLElement>("button");
      target?.focus({ preventScroll: true });
    }
  }
  function destroy() {
    if (destroyed) return; destroyed = true;
    window.removeEventListener("resize", syncBounds);
    for (const section of repeatedSections) section.destroy(); repeatedOpen.clear();
    metadata.destroy(); attempts.destroy(); historySection.destroy(); closeButton.destroy(); expandButton.destroy(); dialog.destroy();
  }
  render();
  dialog = createDialog({ accessibleName: t("外部任务详情"), content, initialFocus: closeButton.element, onRequestClose: destroy }, context);
  dialog.element.id = "better-codex-dialog";
  dialog.element.classList.add("is-external-observation");
  dialog.element.dataset.externalId = initial.observation.id;
  dialog.element.dataset.detail = "true"; dialog.element.dataset.mode = "manual"; dialog.element.dataset.host = context.host.split(":")[0];
  syncBounds(); window.addEventListener("resize", syncBounds);
  return { element: dialog.element, update: (next: Detail) => { if (!destroyed) { value = next; render(); } }, destroy };
}
