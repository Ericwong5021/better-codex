# Plan：`v0.4.1` 稳定性收口

## 目标

把 Preview 中已经形成的安装、更新、看板、多 Agent 与会话能力收口为一个可进入 Stable 的版本。完成标准是任务从创建到执行、补充消息、人工审核、会话交接、恢复和退出都具有唯一状态与真实桌面证据。

## 范围

- 让 Better Codex Runtime 通过 Codex Desktop Session 执行首次任务和后续 turn。
- 持久化 Issue 与 Session 的绑定、active turn、最后回复、错误和连接状态。
- 区分 starting、active、waiting on approval、waiting on user、idle、interrupted、failed 和 disconnected。
- 支持 start、turn、steer 和 interrupt，并保证请求幂等。
- 以 Session 状态和写入权决定卡片输入框、开始、中断和打开会话操作是否可用。
- 在卡片与 Codex 原生会话之间进行明确控制权交接，禁止双端同时写入。
- Runtime 或 Codex 重启后重新核对 Session、turn、Run 和 Issue 状态。
- 保留纯 Codex 执行对话；任务完成判断继续只读取最终 Agent 回复。
- 完成 Apple silicon、Intel macOS 和 Windows 的 Preview 安装、重装、升级与回滚验收。
- 清理已完成但仍停留在待办或待审核的看板卡片。

## 不包含

- 远程 MCP、多端同步、团队空间和云端远程执行。
- 同步 Codex 对话正文、代码、文件、附件或日志。
- 新增工作流节点、Agent 团队编排或新的发布渠道。
- 为了兼容旧执行方式长期保留两套并行的 Session 写入模型。

## 状态所有权

- Codex Desktop Session 是 turn 是否运行、等待、完成或中断的事实来源。
- Better Codex Runtime 是 Issue、Run、Session 绑定、调度与恢复的事实来源。
- 看板只展示 Runtime 汇总后的状态，不根据按钮点击或超时自行猜测完成结果。
- 调度器只根据最终 Agent 回复判断 done、in review 或 blocked，不读取过程日志推断结果。
- 控制权交给 Codex 原生会话后，卡片不再发送补充消息；只有明确取回控制权后才能恢复写入。

## 实施顺序

### 1. Session 执行闭环

- 首次执行创建 Session 和 turn。
- 后续消息在空闲 Session 创建新 turn。
- 运行中补充要求使用 steer，不创建重复 turn。
- 中断只作用于当前 active turn。
- 每个命令具有稳定 request ID，重复请求返回同一结果。

### 2. 状态核对与恢复

- Runtime 启动时核对所有未完成 Run 与 Session。
- Codex 重启、端口变化、Relay 更换和连接超时都有明确错误与恢复动作。
- 已送达但响应超时的命令进入待确认，不立即把 Issue 打回 blocked。
- 最终回复持久化后再进入独立调度判断。

### 3. 卡片与原生会话交接

- 输入框禁用时显示原因和下一步动作。
- 运行中打开会话前明确说明控制权变化。
- 原生会话持有控制权时，卡片只展示状态和导航入口。
- 空闲后是否允许取回控制权由真实 Session 能力决定，不通过固定等待时间猜测。

### 4. 发布收口

- 回归任务创建、自动运行、手动运行、回复、中断、审核、完成后再激活和归档。
- 验证 Runtime 热重启、冷重启、Codex 重启和系统重启。
- 验证 Preview 安装、重装、升级、回滚、禁用和卸载。
- 清理看板状态并补充本版本 Changelog。
- Preview 完成双平台真实验收后再创建 Stable Tag。

## 验收

- 新建任务能在 Codex Desktop 中产生唯一 Session 和唯一 active turn。
- Session 运行中补充消息不会创建第二个并行写入者。
- 已送达消息不会因为接口超时被显示为发送失败。
- 中断后 Session、Run 和 Issue 状态一致，并可继续创建下一次 turn。
- 等待审批和等待用户输入不会被误判为失败或完成。
- Runtime、Codex 或 Relay 重启后不会重复执行、丢失最终回复或静默改变 Issue 状态。
- 已完成 Issue 收到新消息后能进入新的执行周期，同时保留历史 Session。
- 交给 Codex 原生会话后，卡片输入被禁止且说明清楚；不存在双端同时写入。
- Apple silicon、Intel macOS 和 Windows 均有真实 Preview 安装与重装证据。
- Stable 发布资产、版本、Changelog、安装器、更新通道和校验文件一致。

## 回滚

- 新 Session 执行模式未通过验收时不进入 Stable，继续停留在 Preview。
- 数据库迁移只新增可忽略的 Session 与命令状态，不删除现有 Issue、Run、回复和 Thread 数据。
- Relay 失效时停止新调度并显示恢复入口，不尝试并行启动旧执行方式。
- 安装或升级失败时恢复上一个已验证版本，保留数据库和用户配置。
