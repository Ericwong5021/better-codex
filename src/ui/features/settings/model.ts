export interface SettingsFeatureState {
  destroyed: boolean;
  openCount: number;
}

export const dotsReportingInstruction = "对我委派给你的任务，通过已连接电脑上的 Better Codex MCP 主动上报进度。云端工具不可见时，复用本地上报任务转交事件。开始执行时建立任务卡；出现重要进展、等待我处理、失败或完成时更新同一张卡。委派其他任务时传递此要求。上报完成时附上结果和验证依据，进入待验收。只有工具确认保存成功后，才能说看板已更新；失败时保留待同步记录并重试。";

export const dotsReportingInstructionEnglish = "Report my tasks through Better Codex MCP on my connected computer. If cloud tools are absent, reuse a local reporting task. Create one card at start; update it for progress, waiting, failure and completion. Pass this rule to delegates. Include completion evidence for review. Confirm board updates only after receipt and readback. Keep stable event IDs; retain and retry pending reports.";

export interface DotsSetupState {
  copying: boolean;
  copied: boolean;
  copyFailed: boolean;
}

export function dotsSetupMessage(english: boolean) {
  return english
    ? 'Please add a custom rule for my dot using the native custom-rule flow, with the action "Take action without asking". Use the following exact rule text. If an equivalent rule already exists, reuse it. Confirm the actual saved result, or show the native confirmation needed to finish adding it. Also apply this to future delegated tasks. Check my connected computer first. If cloud MCP tools are unavailable, reuse or create one local reporting task there and read the Better Codex dot-reporting Skill. Forward original task identities and state events to that task for external_tasks_report and card/event readback. Reuse it for later events. Retain pending events while offline. Never substitute the reporting task status for source task status. This flow needs no API key, Tunnel or public server.\n\n' + dotsReportingInstructionEnglish
    : '请为我的 Dot 添加一条自定义规则，触发原生的自定义规则添加流程，动作选择“无需询问即可执行”。规则正文使用下方原文。若已有相同规则，请复用。请确认实际保存结果；若需要我确认，请展示原生添加规则事件。同时将它作为后续委派任务的持续指令。请先检查已连接电脑；云端看不到本地 MCP 时，在该电脑复用或建立一个本地上报任务，读取 Better Codex 的 dot-reporting Skill。把原始任务标识和状态事件交给它，由它调用 external_tasks_report 并回读卡片和事件回执。后续状态变化沿用同一上报任务，不为每条事件创建新任务。电脑离线时保留待同步事件，恢复后按顺序重试。不要把本地上报任务的状态冒充源任务状态。此流程不需要 API 密钥、Tunnel 或公网服务。\n\n' + dotsReportingInstruction;
}
