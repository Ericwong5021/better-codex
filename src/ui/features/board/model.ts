import { sessionThreadMissing } from "../../../session-execution-policy.js";

export interface BoardFeatureState {
  active: boolean;
  destroyed: boolean;
  renderCount: number;
}

export function conversationEmptyState(input: { hasThread: boolean; running: boolean; started: boolean; failed: boolean; error?: unknown }) {
  if (input.failed) return {
    title: input.started ? "任务执行失败" : "任务尚未启动",
    description: sessionThreadMissing(input.error) ? "会话记录尚不可恢复，需要先处理会话绑定问题。" : "请查看下方失败原因，处理后再继续。",
    hint: "原始任务内容已保留",
  };
  if (input.running) return {
    title: input.started ? "正在处理任务" : "正在启动任务",
    description: input.started ? "智能体回复产生后会显示在这里。" : "请求已接收，正在准备会话。",
    hint: "请稍候",
  };
  return input.hasThread
    ? { title: "开始对话", description: "补充下一步要求，智能体会继续处理。", hint: "在下方输入消息并发送" }
    : { title: "尚未开始对话", description: "发送消息后将开始处理任务。", hint: "在下方输入消息并发送" };
}
