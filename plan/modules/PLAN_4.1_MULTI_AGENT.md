# Plan 4.1：多 Agent 协作

## 目标

把已经存在的 Agent、自动调度、并发限制、最终回复判断和人工审核能力收口成可验证、可恢复的多 Agent 协作系统。

## 启动条件

- `v0.4.1` 的 Session、Run、最终回复和恢复模型稳定。
- 用户对自动执行、并行任务或交接有重复且明确的需求证据。
- 单 Agent 的执行、审批、人工审核和失败恢复模型已经单独验证。

## 范围

- 映射 Codex 原生 Agent/Profile 配置，不复制其模型与权限配置。
- 一个 Issue 一个主负责人；并行工作通过子 Issue 拆分。
- 支持明确指派、人工触发、Session 恢复、handoff 和人工 Review。
- Agent 按 Profile 映射模型、推理等级、沙箱、权限、头像和并发，不复制 Codex 的账号与凭据。
- Runtime 负责唯一调度、幂等触发、并发限制和崩溃恢复。
- 任务执行与状态判断隔离；执行 Session 只收到 Issue 描述，调度器只读取最终 Agent 回复。
- Agent 交付后进入 `done`、`in_review` 或 `blocked`，用户保留最终调整权。
- 所有 Run 保留可读证据和对应 Codex Thread。

## 不包含

- 无限制自主团队、隐式评论触发和 Agent 自行批准危险操作。
- 通用 LLM Provider、云端队列和远程执行。
- 用多 Agent 替代现有单用户任务管理闭环。

## 验收

- 两个真实 Agent 能在独立 Issue 中并行执行，并遵守各自最大并发限制。
- 相同触发不会生成重复 Run。
- Runtime 重启不会重复执行或静默丢失 Run。
- Agent 遇到审批、权限、登录和冲突问题时进入可恢复状态。
- Handoff 有明确来源、目标、摘要和防循环限制。
- 关闭全部 Agent 后，基础看板、Thread 关联和手动工作流继续可用。

## 当前状态

- Agent Profile、指派、手动与自动运行、最大并发、调度模型、最终回复判断和人工审核基础已经实现。
- 仍需基于新的 Codex Desktop Session 执行模型验证多 Agent 并发、审批等待、中断、Runtime 重启、Codex 重启和控制权交接。
- 隔离 worktree、跨 Agent handoff、租约与心跳不视为已完成；只有真实需求和当前 Codex 能力支持时再进入实现。

## 回滚

停止新调度，保留 Run、事件、Thread 和 worktree；旧版本忽略扩展表，不执行破坏性降级 migration。
