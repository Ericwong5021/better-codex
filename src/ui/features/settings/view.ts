import type { SettingsFeatureState } from "./model.js";
import { dotsReportingInstruction, dotsReportingInstructionEnglish, type DotsSetupState } from "./model.js";
import type { ComponentContext } from "../../core/component.js";
import { createButton } from "../../primitives/button.js";

export interface SettingsFeatureView {
  open(initialView: string, state: Readonly<SettingsFeatureState>): void;
}

export function openSettingsFeature(view: SettingsFeatureView, state: SettingsFeatureState, initialView: string) {
  if (state.destroyed) throw new Error("settings_feature_destroyed");
  state.openCount += 1;
  view.open(initialView, state);
}

export function createDotsSetupView(context: ComponentContext, options: {
  translate(value: string): string;
  english: boolean;
  onCopy(): Promise<void>;
}) {
  const t = options.translate;
  const root = document.createElement("section");
  root.className = "better-codex-help-setting-group better-codex-dots-setup";
  root.dataset.dotsSetup = "true";
  const heading = document.createElement("div"); heading.className = "better-codex-help-page-heading";
  const title = document.createElement("h2"); title.textContent = t("dots 适配");
  const subtitle = document.createElement("p"); subtitle.textContent = t("让 Dot 主动上报任务进度到看板");
  heading.append(title, subtitle);
  const panel = document.createElement("div"); panel.className = "better-codex-dots-setup-panel";
  panel.id = `${context.mountId}:instructions`; panel.dataset.dotsSetupPanel = "true";
  const label = document.createElement("label"); label.textContent = t("持续上报指令");
  const instruction = document.createElement("textarea"); instruction.readOnly = true;
  instruction.rows = 6; instruction.id = `${context.mountId}:instruction`;
  instruction.value = options.english ? dotsReportingInstructionEnglish : dotsReportingInstruction;
  instruction.dataset.dotsSetupInstruction = "true";
  label.htmlFor = instruction.id;
  const steps = document.createElement("ol");
  for (const text of ["先在 Dot 的个人资料中连接这台电脑，并保持桌面应用在线。", "复制设置请求。", "打开你的 Dot 对话，粘贴并手动发送请求。", "在 Dot 对话中查看并完成规则添加，然后用真实任务检查看板上报。"]) {
    const step = document.createElement("li"); step.textContent = t(text); steps.append(step);
  }
  const notice = document.createElement("p"); notice.className = "better-codex-dots-setup-notice";
  notice.textContent = t("复制设置请求后，请手动发给你的 Dot。规则保存结果由 Dot 的原生流程确认。");
  const actions = document.createElement("div"); actions.className = "better-codex-dots-setup-actions";
  const copy = createButton({ label: t("复制设置请求"), variant: "primary", onPress: options.onCopy }, { ...context, mountId: `${context.mountId}:copy` });
  copy.element.dataset.dotsSetupCopy = "true";
  const feedback = document.createElement("span"); feedback.setAttribute("role", "status"); feedback.setAttribute("aria-live", "polite");
  feedback.dataset.dotsSetupFeedback = "true";
  actions.append(copy.element, feedback);
  panel.append(label, instruction, notice, actions, steps);
  root.append(heading, panel);
  return {
    element: root,
    instruction: instruction.value,
    update(state: DotsSetupState) {
      copy.update({ label: t(state.copying ? "正在复制…" : "复制设置请求"), variant: "primary", loading: state.copying, onPress: options.onCopy });
      feedback.textContent = state.copyFailed ? t("复制失败，请选中上方指令手动复制。") : state.copied ? t("设置请求已复制，请发送给你的 Dot。") : "";
    },
    destroy() { copy.destroy(); root.remove(); },
  };
}
