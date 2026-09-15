# 🥷 Plan 1.5：升级不中断正在运行的 Issue

| 项目 | 内容 |
| --- | --- |
| 状态 | 代码已实施，待桥接版本连续升级验收 |
| 优先级 | P0 |
| 计划日期 | 2026-08-25 |
| 代码基线 | `main@f2ce809` |
| 本地项目 | `/Users/wangyidong/project/better-codex` |
| GitHub 项目 | [Ericwong5021/better-codex](https://github.com/Ericwong5021/better-codex) |

## 一、结论

这个功能可以实现，但不能只删除更新弹窗里的中断确认。

Better Codex 已经把 Session Host、Codex App Server 和 Runtime 分成独立进程，正确方向是只重启 Runtime 和 Web 控制面，让 Session Host 与 Codex App Server 继续承载正在运行的会话。新 Runtime 启动后重新连接同一个 Session Host，按顺序接收离线期间的事件，核对仍在运行的 turn，完成数据库状态收敛，再恢复新任务调度。

第一版不做双 Runtime、不迁移正在运行的 turn，也不在有活跃会话时热升级 Session Host。目标是复用现有单 Runtime、单 Session Host 架构，把更新流程补成可恢复的控制面切换。

## 二、用户目标

用户点击更新弹窗中的“立即更新”后：

1. 更新请求正常受理，不再返回 `issue_execution_running`。
2. 正在运行的 Issue 和会话继续执行，不被调用 `stopIssue`，不被标记为 `interrupted`、`failed` 或 `blocked`。
3. 更新期间暂停领取新任务，新的手动操作得到明确的“升级中，稍后执行”状态。
4. Session Host 和 Codex App Server 的 PID、启动时间、实例 ID 在 Runtime 重启前后保持不变。
5. Runtime 恢复后自动回放离线事件，正在运行的会话仍能继续显示进度并正常完成。
6. 如果新版本启动或对账失败，系统自动恢复旧版本 Runtime，并继续连接原 Session Host。
7. 浏览器短暂断开只显示重连进度，不把 Runtime 重连误报成 Issue 执行失败。

建议更新文案：

> 正在升级 Better Codex。正在运行的会话会继续执行，新任务会在升级完成后开始。

## 三、当前代码事实

### 3.1 已具备的基础

- `src/session-host.ts` 已把 Session Host 作为独立进程运行，并持有 Codex App Server。
- `src/session-host-client.ts` 支持 Runtime 重新连接 Session Host。
- `src/session-host.ts` 使用连接 epoch 替换旧连接，并在重连后重发未 ACK 的内存消息。
- `src/session-relay.ts` 已暴露 App Server PID、连接状态、当前请求和命令状态。
- `src/updater.ts` 已有签名更新、版本目录、当前版本指针、激活状态和回滚能力。
- `src/web-host.ts` 与 `src/dom.ts` 已有更新后的页面恢复和 Runtime 重连入口。
- Runtime 仍是 Better Codex 业务数据库的唯一写入者，现有边界可以继续保留。

### 3.2 直接阻断目标的行为

| 位置 | 当前行为 | 后果 |
| --- | --- | --- |
| `src/worker.ts` 的 `pauseForUpdate` | 有活跃 Issue 时拒绝更新；强制更新会调用 `stopIssue` | 用户必须在“等待”与“中断任务”之间选择 |
| `src/server.ts` 的 `/api/update/install` | 依赖 `interrupt_running`，否则抛出 `issue_execution_running` | 正常点击更新无法在活跃会话期间受理 |
| `src/dom.ts` 的更新弹窗 | 捕获 `issue_execution_running` 后展示中断确认，再发送 `interrupt_running: true` | 产品层明确把升级实现成破坏性操作 |
| `src/cli.ts` 的 `applyUpdate` | 旧 Runtime 退出后调用 `stopSessionHostProcess()` | Session Host 与 Codex App Server 被主动停止 |
| `src/session-host.ts` 的 `deliver` | 事件只保存在内存数组，超过 4096 条时静默删除旧消息 | Runtime 离线或重启较慢时可能丢事件 |
| `src/session-host-client.ts` 的 `handleDelivery` | 回调在 `finally` 中发送 ACK | 数据库写入失败时也可能确认并删除 Host 事件 |
| `src/session-host.ts` 的孤儿退出 | 只依据 Relay 的短时请求状态判断空闲 | App Server 中仍在运行的 turn 可能被误判为空闲 |
| `src/db.ts` 的 Runtime 恢复 | 新 Relay 获取租约时会把部分已领取命令标为 `session_outcome_unknown` | 正常更新可能被当作未知结果或 Runtime 异常 |

### 3.3 需要保留的系统不变量

1. Runtime 继续作为业务数据库的唯一写入者。
2. 每个 profile 只有一个 Session Host，不能误杀其他 profile 或 `untracked` Host。
3. Runtime 与 Host 身份必须包含 PID、启动时间、实例 ID、版本、profile 和连接代次。
4. 数据库写入失败不能返回成功 ACK，健康检查不能把依赖失败转换成成功。
5. 更新完成的判定必须是新 Runtime 已完成 Host 对账并达到 `SERVING_READY`，不能只看进程已启动。
6. 回滚完成的判定必须是旧版本 Runtime 重新达到 `SERVING_READY`。

## 四、范围

### 4.1 第一版必须完成

- 活跃会话期间正常受理更新。
- 更新开始后关闭新任务调度入口，但不停止活跃 Session Host 会话。
- 更新激活时只停止旧 Runtime，不停止 Session Host 与 Codex App Server。
- 为 Host 到 Runtime 的事件增加持久化传输队列、顺序号、稳定 delivery ID 和 payload hash。
- ACK 只在 Runtime 数据库事务提交后发送。
- 新 Runtime 重连后完成事件回放、活跃 turn 对账和 Relay 租约恢复。
- 增加 Runtime authority generation，阻止旧 Runtime 在更新后重新抢占 Host 连接。
- 增加更新事务 ID 和幂等键，浏览器重试不会触发第二次更新。
- 新版本失败时自动恢复源版本 Runtime。
- 更新 UI 删除中断确认，显示下载、切换、对账、恢复或等待状态。

### 4.2 第一版不做

- 不同时运行两个可写 Runtime。
- 不把正在运行的 turn 从一个 App Server 迁移到另一个 App Server。
- 不在有活跃 turn 或未 ACK 事件时升级 Session Host。
- 不让 Session Host 写 Better Codex 业务数据库。
- 不实现跨设备会话迁移。
- 不把所有浏览器写操作做成离线 outbox。Runtime 离线的短窗口内，前端保留草稿并禁用提交即可。

## 五、目标架构

更新期间分成控制面与会话数据面：

| 组件 | 更新期间职责 | 第一版处理方式 |
| --- | --- | --- |
| WebUI | 发起更新、展示状态、重连 | 页面可短暂断开，通过同一 `update_id` 恢复 |
| Runtime/API | 数据库、调度、HTTP、对账 | 关闭调度入口后重启 |
| Session Host | 持有 Relay、事件队列、handoff lease | 全程保留，不重启 |
| Codex App Server | 执行 thread 和 turn | 全程保留，不迁移 |
| 更新激活器 | 切换指针、分配 generation、启动目标 Runtime、失败回滚 | 在旧 Runtime 退出后继续运行 |

关键链路：

```text
用户点击更新
  -> Runtime 创建 update_id 并完成包校验
  -> Runtime 关闭新调度入口
  -> Session Host 建立 handoff lease 并拒绝旧连接领取新命令
  -> 激活器分配更高 authority generation
  -> 旧 Runtime 退出
  -> Session Host 与 App Server 继续执行 turn，并把事件写入持久队列
  -> 新 Runtime 启动并通过 generation 校验
  -> Host 按顺序回放事件
  -> Runtime 在业务事务中应用事件并记录 receipt
  -> Runtime 对账活跃 turn 和已领取命令
  -> Runtime 获得 Relay 租约并开放调度
  -> 更新进入 COMPLETED
```

## 六、状态机

更新操作必须持久化，不能只依赖 `updateInstallInProgress` 这个进程内布尔值。

| 状态 | 含义 | 是否允许新任务 |
| --- | --- | --- |
| `ACCEPTED` | 更新请求已按幂等键受理 | 是 |
| `STAGING` | 下载、验签、解包、预检 | 是 |
| `DRAINING_DISPATCH` | 已关闭新任务领取入口 | 否 |
| `WAITING_FOR_HOST_DRAIN` | 目标版本不能复用当前 Host，等待活跃 turn 和未 ACK 事件清零 | 否 |
| `HANDOFF_READY` | Host 已固定源 Runtime、目标 generation 和 update ID | 否 |
| `RESTARTING_RUNTIME` | 旧 Runtime 已退出，目标 Runtime 正在启动 | 否 |
| `REPLAYING` | Host 正在回放离线事件 | 否 |
| `RECONCILING` | 新 Runtime 正在核对 turn、命令和 Relay 租约 | 否 |
| `SERVING_READY` | 新 Runtime 已可安全服务 | 是 |
| `COMPLETED` | 更新事务完成 | 是 |
| `ROLLING_BACK` | 目标启动或对账失败，恢复源版本 | 否 |
| `ROLLED_BACK` | 源版本重新达到 `SERVING_READY` | 是 |
| `FAILED` | 源版本也无法恢复，需要人工介入 | 否 |

状态转换必须记录 `update_id`、源版本、目标版本、源 Runtime identity、目标 generation、Host identity、时间戳和结构化错误。每个状态转换都需要幂等，重复执行不能再次切换版本指针或再次创建 Host。

## 七、数据与协议设计

### 7.1 更新操作

在 Runtime 业务数据库中新增 `update_operations`：

| 字段 | 用途 |
| --- | --- |
| `id` | 服务端生成的 `update_id` |
| `idempotency_key` | 浏览器重试和恢复使用，唯一 |
| `status` | 状态机当前状态 |
| `source_core_version` | 回滚目标 |
| `target_core_version` | 本次目标版本 |
| `source_runtime_instance_id` | handoff 来源校验 |
| `target_runtime_generation` | 新 Runtime 权限代次 |
| `host_instance_id` | 必须保持不变的 Host |
| `error_code`、`error_details` | 结构化失败原因 |
| `created_at`、`updated_at` | 恢复和超时判断 |

激活器仍可使用 `update-activation.json` 跨 Runtime 传递最小启动信息，但数据库表是 UI 查询与最终审计的事实来源。新 Runtime 启动后必须把文件状态与数据库记录对账，发现不一致时失败并触发回滚，不能静默选择一边。

### 7.2 Runtime authority generation

在 profile 的 `run` 目录增加原子写入的 `runtime-authority.json`，记录单调递增的 generation、授权的 update ID 和目标版本。正常启动与更新启动都必须先在运行锁保护下分配 generation。

`SessionHostHello` 增加：

- `runtime_generation`
- `runtime_version`
- `profile`
- `handoff_update_id`
- `capabilities`

Session Host 只接受不低于已授权 generation 的 Runtime。handoff 期间只接受与 lease 中 update ID 和目标 generation 一致的新 Runtime。旧 Runtime 即使使用同一个 token 重新连接，也必须得到 `stale_runtime_generation`，不能替换目标连接。

### 7.3 Host handoff lease

协议增加 `begin_handoff`、`handoff_ack` 和 `handoff_status`：

- 源 Runtime 在关闭调度入口后发送 `begin_handoff`。
- Host 记录 `update_id`、源 Runtime identity、目标 generation、开始时间和截止时间。
- handoff 开始后，Host 不再向源 Runtime 请求或执行新的业务命令。
- Host 继续接收 App Server 通知并写入传输队列。
- 新 Runtime 完成回放与对账后发送 `complete_handoff`。
- handoff lease、活跃 turn 或未 ACK 事件存在时，Host 禁止孤儿退出。

### 7.4 Host 持久化传输队列

把 `QueuedDelivery[]` 替换为独立的 `session-host-transport.db`。它位于当前 profile 的 `run` 目录，只保存传输数据，不保存 Issue、项目、用户或调度业务状态。Session Host 是该传输库的唯一写入者。

每条 delivery 至少包含：

- `delivery_id`
- `host_instance_id`
- `sequence`
- `kind`
- `payload_json`
- `payload_hash`
- `created_at`
- `acked_at`

要求：

1. delivery 先提交到传输库，再尝试发送。
2. 同一 Host instance 的 sequence 严格递增。
3. 未 ACK delivery 按 sequence 重放。
4. 不允许静默截断。达到容量或磁盘阈值时，Host `/readyz` 降级并输出结构化错误。
5. 只有收到 Runtime 的提交后 ACK 才能标记并清理。
6. 清理采用明确的保留窗口，不影响未 ACK 数据。

### 7.5 Runtime 幂等入库

在业务数据库新增 `session_delivery_receipts`：

| 字段 | 约束 |
| --- | --- |
| `delivery_id` | 主键 |
| `host_instance_id`、`sequence` | 唯一组合 |
| `payload_hash` | 重复 delivery 的一致性校验 |
| `applied_at` | 审计时间 |

Runtime 处理 delivery 时必须在同一个数据库事务内：

1. 查询 receipt。
2. 已存在且 hash 相同则视为幂等重放。
3. 已存在但 hash 不同则抛出 `delivery_id_conflict`，关闭该通道并保留 Host 数据。
4. 未存在则应用 checkpoint、complete、fail 或 event。
5. 插入 receipt。
6. 提交事务。
7. 事务成功后才向 Host 发送 `delivery_ack`。

任何回调或数据库写入失败都不能 ACK。当前 `finally` ACK 必须删除。

### 7.6 活跃 turn 对账

`RuntimeSessionRelay` 增加活跃 turn 集合，依据 `turn/started`、`turn/completed` 和 thread status 更新。Host 状态与 handoff snapshot 至少包含：

- `command_in_flight`
- `active_turns`
- `queued_deliveries`
- `last_delivery_sequence`
- `last_acked_sequence`
- `app_server_pid`
- `app_server_started_at`

新 Runtime 不能直接调用现有 `failClaimedSessionCommands()` 把更新前命令标成未知结果。对账规则为：

1. Host 仍报告同一 thread 和 turn 活跃时，保留数据库中的 active turn，并把命令归属迁移到新 Relay lease。
2. Host 已有完成事件时，先回放事件，再收敛命令和 Issue 状态。
3. Host 与数据库都没有完成证据，但 App Server 可查询到 turn 状态时，使用现有会话活动读取能力补账。
4. Host 丢失或 App Server 身份改变时，明确标记 `session_host_lost` 或 `session_outcome_unknown`，不自动重试用户任务。

## 八、API 与 UI 调整

### 8.1 API

保留现有接口路径，减少前后端迁移范围：

- `POST /api/update/install`
- `GET /api/update`

`POST /api/update/install` 接收 `idempotency_key`，返回：

```json
{
  "accepted": true,
  "update_id": "...",
  "state": "STAGING"
}
```

同一幂等键重复请求必须返回同一个 `update_id`。删除 `interrupt_running` 参数及其分支。更新已在进行时，不再只返回 `update_in_progress`，而是返回当前操作的 `update_id` 与状态。

`GET /api/update` 增加当前操作、阶段、是否接受新任务、Host identity、源版本、目标版本和可恢复错误。页面重连后根据 `update_id` 恢复同一进度。

### 8.2 WebUI

`src/dom.ts`：

- 删除“升级会中断正在执行的任务”确认框。
- 点击后立即生成并保存 idempotency key。
- 显示 `STAGING`、`DRAINING_DISPATCH`、`RESTARTING_RUNTIME`、`RECONCILING`、`COMPLETED`、`ROLLED_BACK`。
- `WAITING_FOR_HOST_DRAIN` 显示“正在等待当前会话完成后升级组件”，不显示失败。
- Runtime 断开期间保留输入草稿，禁用会产生新写入的按钮，并展示自动重连。

`src/web-host.ts`：

- 更新恢复绑定 `update_id`，而不是只依赖页面内定时器。
- 区分 `runtime_reconnecting` 与 `issue_failed`。
- 新 Runtime 返回 `SERVING_READY` 后恢复页面数据，再解除写入禁用。

## 九、分阶段实施

每个阶段独立提交，阶段验收通过后再进入下一阶段。任何阶段回滚都不能删除用户数据库或停止未经身份核验的 Host。

### Phase 0：补齐可观测性与基线验收

改动范围：

- `src/session-relay.ts`
- `src/session-host.ts`
- `src/session-host-protocol.ts`
- `src/server.ts`
- 现有 Runtime、Relay、Web E2E 测试

工作项：

1. 在 Host 状态中增加 App Server 启动时间、活跃 turn、最后 delivery sequence 和 ACK sequence。
2. 为更新日志统一加入 update ID、Runtime identity、Host identity、generation 和状态转换。
3. 为现有更新流程增加一条长 turn 验收场景，先证明当前版本会被拒绝或中断。
4. 记录更新前后 Runtime、Host、App Server 的 PID、启动时间和实例 ID。

验收：失败基线可稳定复现，日志能够明确指出是更新拒绝、`stopIssue`、Host 停止还是事件丢失。

### Phase 1：可靠 Host 传输

改动范围：

- `src/config.ts`
- `src/session-host.ts`
- `src/session-host-client.ts`
- `src/session-host-protocol.ts`
- `src/db.ts`
- `src/worker.ts`

工作项：

1. 增加独立传输库和 delivery sequence。
2. 增加 `session_delivery_receipts` 迁移。
3. 把所有 Host delivery 处理收口到单一数据库事务入口。
4. 改为提交后 ACK。
5. 删除 4096 条静默截断。
6. 增加断线重放、重复 delivery、hash 冲突和数据库提交失败的现有测试扩展。

验收：在“数据库已提交但 ACK 未发出”窗口强制结束 Runtime，重启后 delivery 会重放，但业务状态只应用一次。

### Phase 2：handoff 与 Runtime fencing

改动范围：

- `src/config.ts`
- `src/session-host-protocol.ts`
- `src/session-host.ts`
- `src/session-host-client.ts`
- `src/session-relay.ts`
- `src/worker.ts`
- `src/updater.ts`

工作项：

1. 增加 Runtime authority generation。
2. 增加 handoff lease 协议和状态。
3. handoff 后阻止源 Runtime 领取新命令。
4. Host 显式跟踪活跃 turn，修正孤儿退出条件。
5. 新 Runtime 连接必须通过 profile、版本、generation、update ID 和能力协商。
6. 旧 generation 重连必须被拒绝并记录诊断。

验收：源 Runtime 退出后，Host 与 App Server 持续存活；模拟源 Runtime 再连接时得到 `stale_runtime_generation`，不能替换目标连接。

### Phase 3：更新编排与回滚

改动范围：

- `src/db.ts`
- `src/worker.ts`
- `src/server.ts`
- `src/updater.ts`
- `src/cli.ts`

工作项：

1. 增加 `update_operations` 和幂等状态机。
2. 把 `pauseForUpdate` 拆成“关闭调度入口”和“停止全部工作”两种明确操作。
3. 更新流程使用关闭调度入口，不调用 `stopIssue`，不停止 Session Relay 客户端之前的数据面。
4. `applyUpdate` 删除更新路径中的 `stopSessionHostProcess()`。
5. 新 Runtime 启动顺序固定为：数据库锁与迁移、激活记录核对、Host 协商、delivery 回放、turn 对账、Relay lease、恢复 Runtime 自有任务、开放调度。
6. 目标启动或对账失败时回滚版本指针，以更高 generation 启动源版本 Runtime，并连接同一 Host。
7. 只有源版本达到 `SERVING_READY` 才写入 `ROLLED_BACK`。

验收：真实长 turn 中更新 Runtime，Runtime PID 和实例 ID 变化，Host 与 App Server identity 不变，turn 正常完成。

### Phase 4：UI 与兼容等待

改动范围：

- `src/dom.ts`
- `src/web-host.ts`
- 更新 manifest 读取与兼容性校验

工作项：

1. 删除中断确认和 `interrupt_running` 请求。
2. UI 使用 update ID 恢复进度。
3. manifest 声明 Runtime 与 Session Host 协议范围及必需 capability。
4. 目标版本不能复用当前 Host 时进入 `WAITING_FOR_HOST_DRAIN`。
5. 活跃 turn 与未 ACK delivery 清零后，才允许停止并升级 Host。
6. 等待期间保持源 Runtime 与 Host 正常服务已有会话，新的 Issue 保持排队。

验收：兼容更新无确认、无错误完成；不兼容更新显示等待，不中断会话，会话完成后自动继续升级。

### Phase 5：跨平台与发布门禁

改动范围：

- `test/updater-security.test.ts`
- `test/update-channel.test.ts`
- `test/relay-runtime-e2e.test.ts`
- `test/worker.test.ts`
- `test/web.test.ts`
- `test/e2e/web/shared-regression.spec.ts`
- macOS、Linux、Windows 安装与更新流程

工作项：

1. 扩展现有测试，不另建与现有体系重复的测试框架。
2. 覆盖长 turn、并发 Issue、重复更新请求、离线回放、目标失败、回滚失败、旧 Runtime 抢占和浏览器重连。
3. 在三个平台验证路径、socket 或 named pipe、服务管理、文件锁和原子指针切换。
4. 更新 `AGENTS.md`、模块更新计划和安装生命周期文档中的最终不变量。
5. 把“更新不中断活跃会话”设为稳定版本发布门禁。

验收：所有平台满足第十节的验收矩阵，发布包才允许进入稳定通道。

## 十、验收矩阵

| 场景 | 必须结果 |
| --- | --- |
| 单个长 turn 运行时更新 | turn 正常完成，Runtime identity 变化，Host 和 App Server identity 不变 |
| 多个 Issue 并发运行时更新 | 所有事件按 thread 和 turn 正确归属，无串线 |
| Runtime 离线期间 turn 完成 | 完成事件进入 Host 传输库，新 Runtime 回放后 Issue 正常完成 |
| 数据库提交后、ACK 前 Runtime 崩溃 | 重放后只应用一次，无重复消息或重复调度 |
| delivery ID 相同但 hash 不同 | 明确失败并保留 Host 数据，不 ACK，不继续污染数据库 |
| 用户连续点击两次更新 | 只创建一个 update ID，只切换一次版本指针 |
| 浏览器在 Runtime 重启时刷新 | 使用相同 update ID 恢复进度，不显示 Issue 失败 |
| 新 Runtime 启动失败 | 回滚源版本并连接原 Host，活跃 turn 不被中断 |
| 新 Runtime 对账失败 | 不开放调度，进入回滚，保留诊断证据 |
| 旧 Runtime 尝试重连 | 被 generation fencing 拒绝，不能替换当前连接 |
| Host 与目标协议不兼容 | 进入等待，不中断活跃 turn，清空后再轮换 Host |
| Host 意外崩溃 | 明确记录 `session_host_lost` 或 `session_outcome_unknown`，不宣称无损恢复 |
| 其他 profile 存在 Host | 不停止、不替换、不修改其状态文件 |
| 磁盘低于安全阈值 | staging 前阻止更新并报告结构化存储错误 |

禁止把以下证据单独视为验收通过：

- 更新接口返回 `202`。
- 新 Runtime 的 `/livez` 返回成功。
- 版本指针已切换。
- 浏览器重新加载成功。
- `git diff --check` 或单元测试通过。

最终证据必须同时包含进程 identity、更新状态机、Host 队列与 ACK、数据库 Issue 状态、真实 turn 完成结果和目标 Runtime `/readyz`。

## 十一、桥接版本与发布策略

当前版本的更新流程会在目标版本接管前执行 `pauseForUpdate`，并在激活器中停止 Session Host。因此，仅发布一个已经实现新逻辑的目标版本，不能保证从所有旧版本直接无中断升级。

需要先发布桥接版本：

1. 桥接版本实现非破坏性 dispatch drain、Host 保留、handoff、持久 delivery 和新 Runtime 对账。
2. 从桥接版本开始，manifest 声明支持 `runtime-session-handoff/v1`。
3. 旧于桥接版本的客户端继续使用原更新语义，并在发布说明中明确首次升级可能需要等待空闲窗口。
4. 如果产品要求从所有旧版本首次升级也不中断，需要额外提供独立于旧 Runtime 的外部安装器或 launcher 更新路径。该工作不纳入本计划第一版。

桥接版本发布后，连续验证两次更新：旧桥接版本到新版本、新版本到下一版本。只有第二次仍保持 Host 与 App Server identity，才能证明协议不是一次性特例。

## 十二、风险与处理

| 风险 | 处理方式 |
| --- | --- |
| Host 持久队列被误做成第二个业务数据库 | 严格限制 schema，只保存 delivery 与 ACK 元数据 |
| 事件回放顺序错误 | 单 Host instance 使用严格 sequence，缺号时停止通道并报警 |
| 新旧 Runtime 同时连接 | authority generation 与 handoff update ID 双重 fencing |
| 更新状态文件和数据库不一致 | 启动时强制对账，不一致则回滚或失败，不静默修正 |
| App Server 实际已重启但 PID 复用 | 同时核对 PID、启动时间和 Host instance，不只比较 PID |
| 更新期间新命令进入 Host | 先关闭 Runtime dispatch gate，再建立 Host handoff lease |
| 不兼容 Host 版本无法热切换 | 进入等待，活跃 turn 和未 ACK delivery 清零后再轮换 |
| 回滚覆盖真实根因 | 保留目标启动、Host 协商、回放与对账日志，回滚只恢复服务，不吞掉错误 |

## 十三、完成定义

以下条件全部满足，功能才算完成：

1. 更新弹窗不再出现中断任务确认，也不再发送 `interrupt_running`。
2. 活跃会话期间更新接口正常返回 update ID。
3. Runtime 更新过程中 Session Host 与 Codex App Server identity 不变。
4. Host 到 Runtime 的 delivery 在进程崩溃窗口中不丢失、不重复应用。
5. 新 Runtime 只有在回放和对账完成后才开放调度并通过 `/readyz`。
6. 目标失败能够恢复源版本 Runtime，并继续使用原 Host。
7. 不兼容更新能够等待会话排空，而不是中断会话或报通用错误。
8. macOS、Linux、Windows 的真实更新验收均通过。
9. 项目运行不变量与更新文档已经同步。
10. 从桥接版本开始，连续两次版本升级都通过无中断验收。

## 十四、实施结果

截至 2026-08-25，Phase 0–5 的代码和发布门禁已落地：

- Host delivery 已改为独立 SQLite 持久队列，Runtime 业务事务与 receipt 原子提交后才 ACK。
- Runtime authority generation、Host handoff lease、旧 generation fencing、活跃 turn 与 App Server identity 快照已落地。
- `update_operations`、幂等更新 API、非破坏性 dispatch drain、目标 Runtime 对账、源版本自动回滚已落地。
- 更新激活器不再停止兼容 Session Host；协议不兼容时进入 `WAITING_FOR_HOST_DRAIN`，排空后才替换 Host。
- WebUI 已移除中断确认，使用 `update_id` 恢复阶段；Web Host 的远程恢复也绑定同一操作。
- 签名 manifest 已声明 `session-host/v2` 与 `durable_deliveries`、`runtime_handoff` capability。
- macOS、Linux、Windows CI 与稳定发布门禁均运行状态机、持久回放、generation fencing、manifest 兼容和长 turn 进程级交接测试。

本计划仍保留“代码已实施，待桥接版本连续升级验收”状态，因为第十三节第 8、10 项要求真实发布包在三个系统上完成两次连续升级；这属于发布动作和外部 CI 证据，不能用本地测试代替。
