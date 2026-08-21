# Relay 与 Runtime 权威边界

- 状态：Accepted
- 日期：2026-08-21
- 目标协议：`relay/v1`

## 决策

Better Codex 远程访问采用单 Runtime 反向隧道。Runtime 主动连接 Relay，公网浏览器的实时请求通过 Relay 转发到 Runtime 本地 HTTP API。

本地 Runtime SQLite 是项目、Issue、Agent、会话、附件和执行状态的唯一事实源。Relay 不保存业务投影，不执行或解释业务规则；Relay 可以持久化经过白名单识别的命令信封及其有限大小的请求正文，用于离线接收、租约派发、结果回执和重放。

Runtime 离线时，Relay 接受符合命令契约的写请求并返回 `202 Accepted`。查询、附件、目录选择、更新安装、远程会话管理及其他未进入命令白名单的请求不缓存，仍按实时请求处理。Runtime 恢复后，Relay 自动派发未完成命令；浏览器无需保持原 HTTP 连接。

WebUI 在发出白名单写请求前将同一命令信封写入 IndexedDB。Relay 确认持久接收或返回确定性结果后，WebUI 才删除本地副本。删除和归档使用乐观隐藏；确定性拒绝时恢复，超时或结果未知时保持待定并查询命令结果。

Runtime 在执行业务处理前将 Request ID、请求指纹和处理租约写入本地 SQLite 收件箱。业务数据变更和后续外部副作用分别使用本地事务与持久 Outbox。系统提供的是至少一次投递加幂等消费，不承诺网络意义上的恰好一次执行。

本地 Runtime 继续仅监听回环地址。Relay Device Token 只用于 Runtime 到 Relay 的 WSS 鉴权，本地 Runtime Token 只在 Runtime 进程内用于回环请求。

## 约束

- 同一时刻只允许一个 Runtime 连接。
- 每次 Runtime 进程启动生成新的实例 ID。
- Relay 为连接分配递增 epoch，并拒绝旧 epoch 的迟到消息。
- 浏览器写请求携带稳定 Command ID；同一 ID 的方法、路径或正文指纹不一致时必须返回冲突。
- Relay 命令使用派发租约。连接中断、租约超时、`408`、`425`、`429`、`5xx` 和 Runtime 结果未知可以重试；确定性 `4xx` 不重试。
- Relay 重试采用有上限的指数退避，最多 20 次，命令最长保留 7 天；过期命令进入终态，不再补发。
- Runtime 正在处理且租约未过期时返回结果未知，Relay 保持命令待定；本地处理租约过期后允许同一指纹重放。
- Relay 只缓存不超过 512 KiB 的白名单命令正文，流式附件和大请求不进入命令队列。
- HTTP、SSE 和附件通过同一隧道协议流式转发。
- Relay 审计日志只记录路由类别、命令状态、耗时和字节数；命令正文只存在 Relay SQLite 命令表，不写入日志。
- 本机 WebUI 无需 Relay 即可独立运行。

## 迁移

Relay 命令队列只保存传输信封，不恢复旧 Projection Sync 的业务副本。回滚窗口内保留旧表和 `BETTER_CODEX_REMOTE_MODE=projection`，但 Relay 模式不得读取或写入旧业务投影。
