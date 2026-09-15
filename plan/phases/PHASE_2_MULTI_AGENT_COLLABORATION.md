# Phase 2：同级 Multi-Agent 协作

## 阶段目标

把多个 Codex Profile 变成能够被指派 Issue、保留独立 Session、互相评论和交接的同级 Agent，并由 Better Codex Runtime 安全调度原生 Codex CLI。

本阶段不建立通用 Agent Provider。所有执行都直接调用用户已安装的 Codex CLI，避免协议转换层损失能力。

## 用户结果

- 可以把本机 Codex Profile 同步为多个 Better Codex Agent。
- 每个 Agent 有独立名称、头像、说明、并发和工作区策略。
- Issue 进入 `ready` 后，Runtime 自动分派给指定 Agent。
- 多个 Agent 可以并行处理不同 Issue。
- Agent 可以通过评论、`@Agent`、子 Issue和显式 handoff 协作。
- 同一 Agent 再次处理同一 Issue 时恢复原 Codex Thread。
- 用户可以在 Codex 内看到 Agent 状态、Run、最终结果和关联 Thread。
- Agent 交付后进入 `in_review`，只有用户可以确认 `done`。

## 本阶段范围

### Agent Profile

- 发现 `$CODEX_HOME/<name>.config.toml` Profile。
- 手动添加未被自动发现的 Profile 名称。
- Profile 名称到 Better Codex Agent 的稳定映射。
- Agent 显示信息、启用状态、默认并发和默认 Project。
- `better-codex agent sync` 只读取和验证 Profile，不重写用户的 Codex 配置。
- 默认共用当前 `CODEX_HOME`，允许单个 Agent 显式配置独立目录。

### Runtime Dispatcher

- 默认每 2 秒执行一次本地调度循环。
- `ready` Issue 的依赖、指派、Agent 状态和容量检查。
- SQLite `BEGIN IMMEDIATE` 原子认领。
- Run 触发去重、租约、心跳、超时和崩溃恢复。
- Runtime 全局并发默认 4，每个 Agent 默认并发 1。
- 同一 `(issue_id, agent_id)` 最多一个活跃 Run。
- 同一非 worktree workspace 最多一个写入型 Run。
- Runtime 是唯一 Dispatcher，不启动第二个调度守护进程。

### Codex Runner

- 新会话使用原生 Codex Profile、workspace 和 JSONL 输出。
- 继续会话使用已记录的 Codex Thread ID。
- 记录 Agent 消息、命令、文件变更、MCP 调用、错误和最终消息。
- 不修改 Profile 中的模型、推理、sandbox 和 approval policy。
- 不调用通用 LLM API，不翻译为其他 Agent 协议。
- Codex JSONL 出现未知事件时保存原始类型和有限 payload，不导致 Run 崩溃。

调用形态：

```text
codex --profile <profile> --cd <workspace> exec --json -
codex --profile <profile> --cd <workspace> exec resume --json <thread-id> -
```

实际参数由当前 Codex CLI 能力探测结果生成。`better-codex doctor` 在调度前验证版本、Profile、登录状态和命令能力。

### Session 与 worktree

- 同一 `(issue_id, agent_id)` 保存最近 Session。
- 新 Run 默认继续该 Session。
- 用户可以明确选择新开 Thread。
- 写入型 Run 默认创建独立 Git worktree。
- worktree 记录来源仓库、基线 SHA、分支、路径和 Run。
- 只读 Agent 可以使用原 workspace 和只读 sandbox。
- Run 失败、Runtime 崩溃或 Issue blocked 时不自动强制删除 worktree。

### 同级协作

- 一个 Issue 只有一个主 Assignee。
- 并行工作优先拆成父 Issue 和子 Issue，每个子 Issue 指派一个 Agent。
- 评论中的显式 `@Agent` 创建咨询型 Run。
- `better-codex issue handoff` 创建交接型 Run并变更主 Assignee。
- Agent 可以创建子 Issue、添加依赖、评论、阻塞和提交交付摘要。
- Agent 不能将 Issue 标记为 `done`，不能修改其他 Agent 的 Codex Profile。

## 本阶段不包含

- Squad、多负责人和自动团队编排。
- 任意自然语言评论都自动启动 Agent。
- Agent 自行批准危险操作。
- App Server、远程 Runtime 和云端 Queue。
- Codex 之外的 Agent Provider。
- 独立 Web UI。

## 领域模型扩展

### `agents`

- `id`
- `name`
- `slug`
- `description`
- `avatar`
- `codex_profile`
- `codex_home`
- `max_concurrency`
- `default_worktree_policy`
- `enabled`
- `last_validated_at`
- `created_at`
- `updated_at`

`codex_profile` 在同一个 `codex_home` 内唯一。

### `agent_sessions`

- `id`
- `issue_id`
- `agent_id`
- `codex_thread_id`
- `workspace_path`
- `worktree_path`
- `profile_snapshot_json`
- `status`
- `last_run_at`
- `created_at`
- `updated_at`

同一 `(issue_id, agent_id)` 只能有一个 `current` Session，历史 Session 保留。

### `run_triggers`

- `id`
- `issue_id`
- `agent_id`
- `kind`
- `source_id`
- `root_trigger_id`
- `parent_trigger_id`
- `depth`
- `status`
- `created_at`

`kind` 固定为：

```text
assignment
mention
handoff
revision
manual_retry
```

`(kind, source_id, agent_id)` 唯一，保证同一个动作不会重复启动 Agent。

### `runs`

- `id`
- `trigger_id`
- `issue_id`
- `agent_id`
- `session_id`
- `status`
- `pid`
- `lease_token`
- `lease_expires_at`
- `heartbeat_at`
- `workspace_path`
- `worktree_path`
- `base_sha`
- `codex_thread_id`
- `exit_code`
- `summary`
- `error_code`
- `started_at`
- `finished_at`
- `created_at`

### `run_events`

- `id`
- `run_id`
- `issue_id`
- `type`
- `payload_json`
- `created_at`

### `issue_dependencies`

- `issue_id`
- `depends_on_issue_id`

禁止自依赖和依赖环。依赖未完成时 Issue 不进入可调度状态。

## 调度状态机

### Assignment Run

```text
Issue ready
  → Trigger queued
  → Run claimed
  → Run running
  → succeeded → Issue in_review
  → awaiting_human → Issue blocked
  → failed/lost → Issue blocked
  → canceled → Issue ready 或 canceled
```

### Mention Run

```text
Comment @Agent
  → Mention Trigger queued
  → Agent Run
  → 结果回复到触发评论线程
  → Issue 主状态保持不变
```

### Handoff Run

```text
Agent A 显式 handoff 给 Agent B
  → 记录原因和 root_trigger_id
  → Assignee 变更为 B
  → B 获得 Issue、评论、依赖和 A 的交付摘要
  → B 创建独立 Session 或恢复自己的历史 Session
```

## 防重复和防循环规则

- 一个触发对一个 Agent 只产生一个最终 Run 结果。
- Agent 正在运行时收到的新触发进入 FIFO，不中断当前 Run。
- 评论触发必须在对应评论线程下回复。
- Handoff 链记录 `root_trigger_id` 和 Agent 路径。
- 同一个 Agent 不允许在同一 Handoff 链中出现第二次。
- Handoff 深度达到 4 时停止自动分派，Issue 进入 `blocked` 等待用户。
- 状态拖动、普通评论和页面刷新不会隐式创建 Run。
- Runtime 重启时先恢复已有 Run，再扫描新 Issue，不能重复认领。

## 租约与恢复

- 调度认领时生成随机 `lease_token`。
- Runner 每 5 秒更新心跳。
- 租约有效期 30 秒。
- Runtime 启动时检查数据库中的 `claimed / running` Run。
- PID 存活且归属当前 Runtime 时重新接管监控。
- PID 不存在或归属无法验证时标记 `lost`，保留 worktree 和事件，并将主 Assignment Issue 移到 `blocked`。
- 不把 `lost` Run 自动重试；用户或 Agent 必须创建新的 retry Trigger。

## Codex Profile 规则

- Better Codex 把 Profile 名称作为 Codex 原生配置入口，不复制解析后的模型和权限字段到第二套配置系统。
- Agent 页面展示 `better-codex doctor` 得到的有效配置摘要，但运行时仍由 Codex 解析配置。
- Profile 缺失、Codex 未登录或配置解析失败时 Agent 显示 `invalid`，不参与调度。
- 非交互执行遇到审批或权限阻塞时，Run 进入 `awaiting_human`，保留 Thread，用户可在 Codex 打开继续。
- Better Codex 绝不把失败的审批自动改为 `never`，也不提升 sandbox。

## Agent 使用 Better Codex 的方式

阶段二提供一个独立的 Better Codex 协作 Skill，指导 Agent：

- 开始前读取完整 Issue、依赖和未解决评论。
- 只处理当前 Run 对应的 Trigger。
- 使用 `better-codex issue comment add` 汇报进度和阻塞。
- 通过 `better-codex issue child create` 拆分并行任务。
- 通过 `better-codex issue handoff` 显式交接，不依赖模糊自然语言。
- 完成时提交结构化摘要、文件变化和验证结果。
- 进入 `in_review` 后停止，不自行标记 `done`。

Skill 与 DOM 插件分别安装和验证。Skill 安装成功不代表 Codex 侧边栏已经注入。

## CLI 扩展

```text
better-codex agent list|get|sync|enable|disable
better-codex issue assign <issue> --agent <agent>
better-codex issue handoff <issue> --to <agent> --reason-stdin
better-codex issue child create <issue> --agent <agent>
better-codex issue dependency add|remove
better-codex issue comment add <issue> --body-stdin
better-codex run list|get|cancel|retry
better-codex run events <run>
```

- Agent 命令默认输出适合人阅读的简洁结果。
- `--output json` 提供稳定机器格式。
- 写命令返回新的 Issue version 和对应 Event ID。
- CLI 退出码区分参数错误、冲突、Runtime 不可用、Agent 不可用和 Run 失败。

## UI 扩展

- Issue 卡片显示 Assignee 头像、Run 状态和 Thread 数量。
- Agent 视图显示 Profile、有效性、当前 Issue、队列和并发占用。
- Issue 详情显示 Session、Run、触发来源、命令、文件修改和最终摘要。
- 评论支持 `@Agent` 选择器和触发状态。
- Handoff 显示来源 Agent、目标 Agent、原因和链路。
- `awaiting_human`、`blocked`、`failed` 和 `lost` 使用不同视觉状态。
- 用户可以从 Run 打开对应 Codex Thread 和 worktree。

## 目标文件边界

```text
src/core/agents.ts
src/core/dispatch.ts
src/core/collaboration.ts
src/db/migrations/
src/db/repositories/agents.ts
src/db/repositories/runs.ts
src/runtime/dispatcher.ts
src/runtime/run-supervisor.ts
src/codex/profiles.ts
src/codex/runner.ts
src/codex/events.ts
src/codex/worktrees.ts
src/cli/commands/agent.ts
src/cli/commands/run.ts
skills/better-codex/
web/src/features/agents/
web/src/features/runs/
```

不恢复当前原型的通用 `Runner` Provider 方向，不实现第二个调度进程。

## 实现顺序

1. 增加 Agent、Session、Trigger、Run、Run Event 和 Dependency migration。
2. 实现 Codex Profile 发现、验证和 Agent 同步。
3. 实现 Trigger 去重、原子认领、容量和依赖检查。
4. 实现 Codex Runner、JSONL 事件和 Thread 保存。
5. 实现 lease、heartbeat、Runtime 重启恢复和 Run 终态。
6. 实现 worktree 创建、隔离、保留和安全清理入口。
7. 实现 Assignment、Mention、Handoff 和 Revision 流程。
8. 实现 Agent 协作 CLI 和 Skill。
9. 在 Codex 内嵌 UI 增加 Agent、Run 和协作交互。
10. 完成两 Agent 真实并发与崩溃恢复验收。

## 验证命令

```text
npm run typecheck
npm run build
better-codex doctor
better-codex agent sync
better-codex agent list --output json
better-codex run list --output json
```

## 人工验收

### 正常路径

- 准备两个真实 Codex Profile，`better-codex agent sync` 后显示为两个 Agent。
- 两个 Issue 分别指派给两个 Agent，进入 `ready` 后并行执行。
- 两个 Run 使用正确 Profile、workspace 和独立 worktree。
- UI 实时显示 Agent 消息、命令、文件变化和最终摘要。
- Run 成功后 Issue 进入 `in_review`，不会直接进入 `done`。
- 用户批准后 Issue 才进入 `done`。
- 同一 Agent 对同一 Issue 追加修改时恢复原 Thread。
- Agent A 创建子 Issue并指派 Agent B，B 完成后父 Issue显示进度。
- 评论 `@Agent B` 只触发一次 Run，结果回复到原评论线程。
- Agent A handoff 给 B 后，B 获得完整上下文且 A 不再被重复调度。

### 错误路径

- Profile 文件不存在时 Agent 不进入调度队列。
- Codex 登录失效时 Run 失败原因明确，Issue 进入 `blocked`。
- worktree 创建失败时不在原 workspace 启动写入 Run。
- 同一 Trigger 重放时数据库拒绝重复 Run。
- Agent 达到并发上限时 Issue 保持 `ready`。
- Runtime 在 Run 进行中重启时，不重复执行相同 Trigger。
- Codex 进程消失后 Run 变为 `lost`，worktree 和事件保留。
- Handoff 形成回环或深度超过 4 时停止并等待用户。
- 未知 Codex JSONL 事件不终止 Run。

## 阶段完成标准

- 两个同级 Codex Agent 能通过 Better Codex Issue 真实协作，而不是 subagent 模式。
- 调度路径只使用原生 Codex CLI 和 Profile。
- Assignment、Mention、Handoff、Session Resume 和人工 Review 均有真实证据。
- Runtime 重启、进程崩溃和重复触发不会造成重复执行或静默丢失。
- 关闭任一 Agent 不影响 Phase 1 的任务和 Thread 管理能力。

## 回滚

- 通过 `better-codex agent disable` 停止新调度。
- 取消队列中的 Trigger，不强制删除运行产物。
- 停止 Runtime 前记录活跃 PID、Run 和 worktree。
- 回滚代码时保留新增表和历史 Run；旧版本忽略新表，不执行破坏性 down migration。
