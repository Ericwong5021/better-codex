# Relay 与 Runtime 权威边界

- 状态：Accepted
- 日期：2026-08-18
- 目标协议：`relay/v1`

## 决策

Better Codex 远程访问采用单 Runtime 反向隧道。Runtime 主动连接 Relay，公网浏览器的实时请求通过 Relay 转发到 Runtime 本地 HTTP API。

本地 Runtime SQLite 是项目、Issue、Agent、会话、附件和执行状态的唯一事实源。Relay 只处理 Web 登录、会话、CSRF、设备鉴权、在线连接、请求路由、流量限制和审计，不保存业务投影、远程命令或请求正文。

Runtime 离线时，Relay 立即拒绝业务请求，不缓存、不排队、不补发。Runtime 恢复后，浏览器重新建立请求和 SSE 连接。

本地 Runtime 继续仅监听回环地址。Relay Device Token 只用于 Runtime 到 Relay 的 WSS 鉴权，本地 Runtime Token 只在 Runtime 进程内用于回环请求。

## 约束

- 同一时刻只允许一个 Runtime 连接。
- 每次 Runtime 进程启动生成新的实例 ID。
- Relay 为连接分配递增 epoch，并拒绝旧 epoch 的迟到消息。
- 浏览器写请求携带稳定 Request ID，Relay 不自动重试。
- HTTP、SSE 和附件通过同一隧道协议流式转发。
- Relay 日志只记录路由类别、状态、耗时和字节数。
- 本机 WebUI 无需 Relay 即可独立运行。

## 迁移

先建立 Relay 隧道并完成远程 WebUI 验收，再停止旧 Projection Sync 与 Remote Command。回滚窗口内保留旧表和 `BETTER_CODEX_REMOTE_MODE=projection`，但 Relay 模式不得读取或写入旧业务投影。
