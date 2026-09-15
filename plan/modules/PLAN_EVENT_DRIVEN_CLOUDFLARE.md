# Better Codex 事件型协议迁移与 Cloudflare 用户增长计划

更新日期：2026-08-13

状态：P1–P5 核心实现已完成；本地 Node/Cloudflare acceptance 与 Wrangler dry-run 已通过。真实 Cloudflare 账户部署、R2 恢复和 7 天用量观察仍是发布前验收项。本文只保存在本机 `plan/`，不作为公开承诺。

实施默认在 `main` 分支进行。每个阶段必须完成验收、提交本地代码，并由负责人确认后才能进入下一阶段。

## 1. 决策摘要

Better Codex 迁移的是成熟的事件型 Runtime 通信模型，不迁移其他系统的 Go、PostgreSQL、Redis 或多租户 SaaS 运行栈。

目标架构：

- Runtime 使用一个统一的 `sync/v6` 数据协议和 `control/v1` WebSocket 控制协议。
- WebSocket 负责握手、能力协商、唤醒、心跳和可恢复 RPC。
- HTTP 保留为 projection push、conversation push、ack、恢复和降级通道。
- 当前 Node.js + SQLite Hub 继续支持自备服务器用户。
- 新增 Cloudflare Worker + SQLite Durable Object Hub，支持 Cloudflare Free 账户、`workers.dev` 和可选自定义域名。
- Runtime 本地 SQLite 仍是业务真相和唯一直接写入者。
- Cloudflare 部署默认是每个用户自己的单实例 Hub，不建设 Better Codex 官方托管控制面。

推荐执行顺序：

1. 先让现有 Node Hub 使用事件型 WS 控制面。
2. 再把 Hub 路由和领域逻辑抽成平台无关核心。
3. 在相同协议上实现 Cloudflare Worker 和 SQLite Durable Object。
4. 最后接入一键部署、无复制码配对、升级提示和 Cloudflare 用户增长入口。

## 2. 现状与问题

当前 Runtime 在 `src/sync-client.ts` 中每 5 秒执行一次：

```text
push → pull commands → push
```

这会让空闲 Runtime 产生持续的动态请求。当前 Node Web Hub 的 `/api/events` 还通过 1 秒数据库轮询实现 SSE 推送，无法直接迁移到会休眠的 Durable Object。

事件型 Runtime 通信模型的可复用部分是：

- 一个经过认证的长期 WebSocket 控制连接。
- WS 只承载唤醒、心跳和协商 RPC，不要求所有业务数据都改成 WS。
- WS RPC 具有 request id、响应关联、发送状态和断线退避。
- 如果请求已经发出但响应未知，客户端不能立刻使用另一条通道重复领取。
- WS 不可用时保留 HTTP polling 或显式 HTTP fallback。

这能解决请求量问题，同时保留 Better Codex 现有的本地权威、pending/ack、冲突和幂等边界。

## 3. 目标架构

```text
                        ┌── WSS control/v1 ── Browser
                        │
Runtime ── WSS control/v1 ── Hub Application
   │                    │          │
   └── HTTPS sync/v6 ───┘          └── WebSocket change hints
                                   │
                             Hub Repository
                              /           \
                     Node + SQLite       Worker + SQLite DO
                                             │
                                           R2 backup
```

Cloudflare 路径中的 Worker 只负责静态资源、入口认证和路由；有状态业务全部进入一个 SQLite-backed Durable Object。DO 使用 Hibernation WebSocket，不使用秒级 `setInterval`。

Cloudflare Free 支持 SQLite-backed Durable Objects；当前公开额度包括每天 100,000 个 DO 请求、13,000 GB-s、500 万行读取、100,000 行写入和 5 GB 账户级 SQL 存储。WebSocket 入站消息按 20:1 计入请求，协议心跳必须按实测值控制在安全余量内。上线前必须重新核对 Cloudflare 当前额度并完成至少 7 天实测。

## 4. 协议设计

### 4.1 版本

- `sync/v5`：保留两个发布周期，供旧 Runtime 使用。
- `sync/v6`：增加 capabilities、command delivery lease、cursor 和恢复字段。
- `control/v1`：新增统一 WS frame envelope。
- `rpc-v1`：首期只实现 `commands.claim` 和 `sync.heartbeat`。
- Runtime transport mode：`auto`、`websocket`、`http`，默认 `auto`。

### 4.2 WS envelope

所有 WS frame 使用稳定的 JSON envelope：

- `hello`：device id、core version、sync protocol、capabilities、last cursor。
- `hello_ack`：服务端协议、能力、revision、lease 状态和待处理提示。
- `heartbeat` / `heartbeat_ack`：续租、连接状态、command revision 和 `commands_available`。
- `event`：`commands_available`、`projection_changed`、`resync_required`。
- `rpc_request` / `rpc_response`：request id、method、timeout、body、status、error。
- `close`：可恢复原因和建议重连时间。

WS 只传递事件和受大小限制的命令批次。大型 conversation 或未来附件仍通过 HTTP/R2 传输。

### 4.3 Command delivery lease

`remote_commands` 增加：

- `delivery_id`
- `dispatched_at`
- `dispatch_expires_at`
- `attempt_count`
- `last_delivery_error`

状态流程：

```text
pending → dispatched → applied/rejected/conflict
                    ↘ expired → dispatched
```

规则：

- claim 必须在事务内从 `pending` 变为 `dispatched`。
- ack 必须携带 `command_id + delivery_id + status`。
- 旧 delivery 的迟到 ack 只能被记录，不能覆盖新 delivery。
- WS 已发送但响应未知时，Runtime 等待 delivery recovery window，不立即 HTTP 重领。
- `sync_command_receipts` 继续保证本地应用幂等。
- writer lease 初始使用 90 秒有效期，Runtime 每 30 秒续租；断线后不立即释放，等待 lease 过期再接管。

### 4.4 HTTP 兼容接口

保留：

- `POST /api/v1/sync/push`
- `GET /api/v1/sync/commands`
- `POST /api/v1/sync/commands/<id>/ack`

新增：

- `GET /api/v1/control`：Runtime 或 Browser WS upgrade。
- `POST /api/v1/sync/commands/claim`：WS 不可用时的安全 fallback。
- `GET /api/v1/capabilities`：协议和部署能力发现。
- `POST /api/v1/device-authorizations`：CLI 发起短期设备授权。
- `POST /api/v1/device-authorizations/<id>/token`：CLI 轮询短期授权结果。
- `POST /api/v1/device-authorizations/<id>/approve`：已登录浏览器批准设备。

旧 pairing code 继续支持 headless 环境，但默认 CLI 流程改成浏览器批准式配对。

## 5. Cloudflare 用户体验目标

### 5.1 默认部署路径

目标用户不需要预先准备 VPS、Docker、域名、数据库或反向代理：

1. 点击 `Deploy to Cloudflare`。
2. 登录自己的 Cloudflare 账户。
3. 输入 Worker 名称和管理员密码。
4. 自动创建 Worker、SQLite Durable Object、Static Assets 和可选 R2。
5. 获得 `workers.dev` URL。
6. 运行 `better-codex sync connect <URL>`。
7. CLI 打开浏览器，用户登录 Hub 并批准 Runtime。
8. 浏览器返回成功，CLI 保存 device token 并启动 WS control。

Cloudflare Deploy Button 要求公开 GitHub/GitLab 仓库；如果使用子目录，该子目录必须是完全隔离的应用并包含自己的依赖。因此模板放在 `deploy/cloudflare/`，不得直接把当前 monorepo 根目录交给 Deploy Button。

### 5.2 认证

- 部署时设置 `BETTER_CODEX_HUB_WEB_PASSWORD` Secret。
- 默认用户名为 `admin`，不允许“第一个访问者初始化管理员”。
- 复用当前 scrypt 格式、Secure/HttpOnly/SameSite=Strict cookie、CSRF、Origin/Host 检查、rate limit、设备撤销和审计。
- Cloudflare 账户凭据不进入 Better Codex；Cloudflare Access 作为可选增强，不作为默认安装前置条件。
- 管理员密码变更必须提供显式的轮换操作，并使旧 Web sessions 和设备授权失效。

### 5.3 自定义域名

第一步使用 `workers.dev`，让没有域名的 Cloudflare 用户能够直接启动。仪表盘提供“添加自定义域名”入口，但不阻塞初始配对。

自定义域名需要用户拥有一个 Cloudflare zone；添加后，旧 `workers.dev` URL 继续作为回滚入口，直到用户主动关闭。

## 6. 实施阶段

### P1：Node Hub 的 WS 控制面

预计：5–7 个工程日。当前已完成协议类型、WebSocket 控制连接、心跳、事件唤醒、命令 claim/delivery lease、`sync/v5` 兼容和 HTTP fallback 的首轮实现。

范围：

- `src/sync-contract.ts` 增加 `sync/v6`、capabilities 和 envelope 类型。
- `src/sync-client.ts` 增加 WS reconnect、heartbeat、RPC request id、uncertain outcome 和 HTTP fallback。
- `src/hub-store.ts` 增加 delivery lease 字段、claim 事务和恢复逻辑。
- `src/hub-server.ts` 增加 Runtime/Browser WS endpoint，SSE 继续保留兼容。
- 去掉空闲周期中的网络 push/pull；仅保留本地 outbox 检查和显式 wake。
- 新增 `BETTER_CODEX_SYNC_TRANSPORT=auto|websocket|http` 配置。

阶段门槛：

- 空闲 10 分钟内 sync push/commands/ack HTTP 请求为 0。
- Browser 创建远程命令后，Runtime 在 2 秒内收到事件提示。
- WS claim 响应丢失不会造成重复应用或双重 claim。
- WS 断开后可以安全 fallback，恢复后可以重新协商 capabilities。
- 旧 `sync/v5` Runtime 仍能工作。

### P2：平台无关 Hub Application/Repository

预计：4–6 个工程日。

范围：

- 新建平台无关的 `HubApplication`，使用 Web 标准 `Request`/`Response`。
- 新建高层 `HubRepository` 接口，不泄漏 SQLite 查询细节。
- Node Hub 通过 Node SQLite Repository 继续提供现有 API。
- 抽离 auth、clock、random、secret、realtime broadcaster 依赖。
- Node HTTP server 只负责 IncomingMessage/ServerResponse 适配。

阶段门槛：

- Node Hub URL、认证行为和 `sync/v5`/`sync/v6` 数据格式不回归。
- 同一份 protocol contract 可以驱动 Node Repository 和内存 fake Repository。
- 不把本机 SQLite 文件、WAL、SHM 或 Codex Session 暴露给 Hub Application。

### P3：Cloudflare Worker + SQLite Durable Object

预计：7–10 个工程日。

范围：

- 新增 `src/cloudflare-worker.ts` 或等价 Worker entrypoint。
- 新增 SQLite-backed `BetterCodexHubObject` Durable Object。
- Worker 路由 `/api/*`、`/web/*` 和 WS upgrade 到同一个 `primary` DO。
- 使用 `ctx.acceptWebSocket()`、`serializeAttachment()` 和 `deserializeAttachment()`。
- DO 内不使用 `setInterval`/`setTimeout`；Alarm 只用于有明确到期任务的清理或备份。
- Static Assets 提供远端 Web UI。
- R2 提供可恢复的逻辑备份；R2 故障只标记备份不健康，不阻塞主写入。
- Wrangler 配置声明 `nodejs_compat`、DO SQLite migration、Assets 和 R2 binding。

阶段门槛：

- Wrangler 本地和远端环境都能启动 Worker、DO 和 WebSocket。
- Node Hub 与 Cloudflare Hub 通过同一组 projection、command、auth 和 recovery contract。
- DO 从 hibernation 恢复后，连接身份、lease 和 cursor 不丢失。
- DO schema migration 只做向前兼容的加列/加表，不删除现有 class。
- R2 备份能够恢复到干净的新 DO。

### P4：Deploy Button、CLI device flow 与升级体验

预计：4–6 个工程日。核心代码已完成，真实账户验收待完成。

范围：

- 新增完全隔离的 `deploy/cloudflare/` 模板。
- 增加 `.dev.vars.example`、binding description、默认 Worker 名称和 `workers.dev` 配置。
- 增加 `better-codex sync connect <URL>` 浏览器授权流程。
- 保留 `--pairing-code` 作为无浏览器 fallback。
- Dashboard 展示协议版本、Runtime 在线状态、备份状态和 Cloudflare 用量估算。
- Cloudflare 模板 pin 版本化 `@better-codex/cloudflare-hub` 包。
- 为模板配置 Dependabot 或等价升级 PR，避免用户 fork 永远停在首次部署版本。

阶段门槛：

- 新 Cloudflare Free 账户无需域名即可完成部署和配对。
- 管理员 Secret 不出现在 URL、日志、Worker response 或 git 文件中。
- CLI 中断、浏览器拒绝、授权超时和重复批准都有明确结果。
- 更新 Worker 版本不会破坏现有 DO 数据或设备 token。

### P5：Node → Cloudflare 迁移、Beta 与增长入口

预计：4–6 个工程日，另加 7 天用量观察。迁移命令、只读冻结、队列排空、目标配对和失败回滚已实现。

范围：

- 增加 `better-codex sync migrate --to <URL>`。
- 增加 `/api/v1/admin/read-only`、`/api/v1/admin/command-queue`，迁移前冻结旧 Hub 并等待命令队列排空。
- Cloudflare DO 提供 R2 逻辑快照、状态、恢复、密码轮换和只读管理接口；恢复保留当前部署 Secret 生成的 Web 密码。
- 迁移前冻结旧 Hub Web 写入并排空 pending commands。
- 新 Hub 由本地 Runtime 重新发布完整 projection，不上传 SQLite 文件。
- 旧 Hub 保持只读 7 天，支持重新配对回滚。
- README 首屏放置 Cloudflare Deploy Button 和 3 分钟价值说明。
- 创建 Cloudflare 专用安装入口、问题模板和升级提示。
- 以用户自有 Cloudflare 账户为中心进行社区传播，默认不收集遥测。

阶段门槛：

- 新旧 Hub 切换后 project、issue、conversation、agent directory 和 remote command 均可验证。
- 断网、Runtime 重启、DO 重启和 Worker 版本回滚后无数据丢失。
- 单 Runtime、活跃 Browser 和 7 天正常使用的估算用量低于各 Free 额度的 20%。
- Cloudflare 用户可以在没有 VPS 和域名的情况下完成首次价值闭环。

## 7. 预计文件范围

这是一个跨层变更，预计修改 15–25 个文件，并新增一个 Cloudflare Worker/DO 部署产物。

核心源码：

- `src/sync-contract.ts`
- `src/sync-client.ts`
- `src/hub-store.ts`
- `src/hub-server.ts`
- `src/hub-auth.ts`
- `src/server.ts`
- `src/web-host.ts`
- `src/dom.ts`
- `src/cli.ts`

新增模块：

- `src/control-protocol.ts`
- `src/hub-application.ts`
- `src/hub-repository.ts`
- `src/cloudflare-worker.ts`
- `src/cloudflare-hub-object.ts`

部署和发布：

- `deploy/cloudflare/package.json`
- `deploy/cloudflare/wrangler.jsonc`
- `deploy/cloudflare/.dev.vars.example`
- `deploy/cloudflare/src/*`
- `deploy/cloudflare/assets/*`
- 版本发布和模板升级配置

按当前仓库规则，不主动新增独立测试文件。协议变化会使现有 Hub sync/security/self-host acceptance 成为过时验证面，因此只在这些现有验证文件中更新必要断言；Cloudflare 端优先复用同一 contract，通过真实 Wrangler/DO acceptance 验证。

## 8. 数据迁移与回滚

### 8.1 不做文件复制

禁止直接复制 Node SQLite、WAL 或 SHM 到 Durable Object。Hub 保存的是本机权威数据的投影，不是 Runtime 数据库镜像。

### 8.2 迁移流程

1. 旧 Hub 标记 read-only，禁止新的 Browser remote write。
2. Runtime 处理完旧 Hub 的 pending commands。
3. 创建 Cloudflare Hub 并完成管理员登录。
4. Runtime 配对新 Hub，清理并重建本地 sync outbox。
5. 发送完整 project、issue、agent directory 和 conversation projection。
6. 验证 revision、命令 ack、设备 lease、Web session 和备份。
7. 解除新 Hub 的 read-only 状态。

### 8.3 回滚流程

- 协议回滚：设置 transport 为 `http`，保留 `sync/v5`。
- Cloudflare Worker 回滚：恢复上一个 Worker 版本，但不删除或重命名 Durable Object class。
- 数据回滚：Runtime 重新配对旧 Hub，旧 Hub 作为事实来源重新投影。
- R2 恢复：创建新的 DO 实例，导入最近一次逻辑快照，再切换 Runtime URL。
- 任何迁移前必须先生成 Node Hub backup，并记录当前 Worker/DO 版本。

## 9. 不在本阶段做

- 不引入 Go、PostgreSQL、Redis、D1、Queues 或 Workers Containers。
- 不建设 Better Codex 官方 SaaS、账号体系、计费和集中式多租户控制面。
- 不把完整 Codex session、代码、文件、日志、凭据或本地 SQLite 上传到 Cloudflare。
- 不把所有 API 改造成 WebSocket。
- 不强制要求用户购买域名或配置 Cloudflare Access。
- 不在协议未通过断线/重复执行验收前制作公开宣传材料。

## 10. 关键风险与处理

| 风险 | 处理 |
| --- | --- |
| WS 已发送但响应丢失 | request id、delivery id、uncertain 状态和 recovery window，禁止立即重领 |
| DO hibernation 丢失内存状态 | 连接身份写入 attachment，权威 cursor/lease 写入 SQLite |
| Cloudflare Free 额度漂移 | 每次部署前重新核对官方额度；内置估算，不宣称绝对免费 |
| Worker/DO 版本回滚破坏 schema | 只增量迁移；不删除或重命名 DO class |
| R2 备份失败 | 不阻塞主写入，显示 backup unhealthy 并触发提醒 |
| Deploy Button monorepo 限制 | 使用完全隔离的 `deploy/cloudflare/` 子目录 |
| 多 Runtime 同时写入 | V1 保持单 writer lease；未来多租户必须按 workspace/tenant 分片 DO |
| Browser WS 不可用 | Node 保留 SSE；Cloudflare 使用 HTTP resync fallback |
| Cloudflare 完全不可用 | Runtime 本地继续运行，outbox 持久堆积，恢复后重新同步 |

## 11. 完成定义

本计划完成必须同时满足：

- Node Hub 和 Cloudflare Hub 都支持 `sync/v6 + control/v1`。
- `sync/v5` 在兼容窗口内仍可用。
- 空闲 Runtime 不再产生固定周期的动态 sync HTTP 请求。
- Remote command 在 WS、HTTP fallback、重启和响应丢失场景下保持幂等。
- Cloudflare Free 用户可通过 `workers.dev` 完成一键部署和浏览器批准式配对。
- Node Hub 到 Cloudflare Hub 可以通过 Runtime 重新投影迁移和回滚。
- 公开文档只在真实 Cloudflare acceptance 和 7 天用量观察完成后更新为“可用”。

## 12. 官方约束参考

- [Cloudflare Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/)
- [Durable Objects pricing](https://developers.cloudflare.com/durable-objects/platform/pricing/)
- [Durable Objects limits](https://developers.cloudflare.com/durable-objects/platform/limits/)
- [Durable Object WebSocket Hibernation](https://developers.cloudflare.com/durable-objects/best-practices/websockets/)
- [Deploy to Cloudflare buttons](https://developers.cloudflare.com/workers/platform/deploy-buttons/)
- [workers.dev](https://developers.cloudflare.com/workers/configuration/routing/workers-dev/)
- [Cloudflare Node.js crypto compatibility](https://developers.cloudflare.com/workers/runtime-apis/nodejs/crypto/)
- [Cloudflare R2 pricing](https://developers.cloudflare.com/r2/pricing/)
