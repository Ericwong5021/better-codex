# Better Codex Self-hosted Hub 与 Web UI 实施计划

更新日期：2026-08-12

状态：已完成。阶段 1 至 5 已提交 main 并通过 CI；Beta、Ubuntu 部署、本机 Runtime 接入、真实公网 HTTPS 与 Chromium 验收均已完成。

本计划只保存在本机 plan/，不作为公开承诺。实施默认在 main 上进行；不直接合并旧 feat/selfhost-hub 分支，而是以当前 main 为基线提取仍然适用的协议、Hub 和部署设计。

## 1. 决策摘要

Better Codex 增加两个相互独立但共享界面的能力：

1. 本地 Web UI：直接连接本机 Runtime，在普通浏览器中完成绝大多数开发、调试和验收。
2. Self-hosted Hub：本机 Runtime 主动把经过白名单裁剪的看板投影同步到远端，用户通过远端 Web UI 查看和编辑看板。

本机 SQLite 始终是业务真相和唯一直接写入者。Hub 不复制本机数据库文件，也不直接执行本机 Codex 操作。远程写入先成为命令，由本机 Runtime 拉取、校验、应用并确认。

Codex Desktop 因宿主权限、CDP 和原生导航限制，不承担日常自动化调试。共享业务界面、Runtime API、数据库、同步、冲突、离线和错误恢复全部通过 Web Host 自动化。Codex Desktop 仅保留一组无法被 Web 证明的最小安装态人工冒烟验收。

## 2. 当前基线

- 当前 main 与部署候选版本为 0.4.3-beta.1，候选 SHA 为 f2a178eab587ac2f6f96c927e3689d44bcf68aa9。
- 本地 Runtime 使用 Node 22、node:sqlite、动态 loopback 端口和 Bearer Token。
- 数据库已经具备 WAL、schema migration、版本冲突保护、迁移前 VACUUM INTO 备份和 PRAGMA quick_check。
- Browser Host、Web Session、Web 专用 DOM Host、sync/v1、Hub、远程命令和生产部署已经进入 main。
- 当前 CI 在 Apple silicon macOS、Intel macOS、Windows 和 Ubuntu 上执行 build、Node 测试、真实 Chromium E2E、打包、重复安装与 Selfhost HTTPS acceptance。
- 真实 Ubuntu 使用既有 nginx/Certbot 终止 TLS，Hub 仅绑定 127.0.0.1:25818；仓库默认 Compose 仍提供 Caddy 部署方式。

## 3. 目标

### 3.1 用户目标

- 用户可以运行 better-codex web，在浏览器中管理本机 Better Codex。
- 用户可以自行部署 Hub，并从公网或私有网络打开同一套 Better Codex Web UI。
- 本机离线、Hub 停机或公网不可用时，本机看板和 Codex 工作流不受影响。
- 远程修改具有等待、成功、冲突和拒绝四种明确结果。
- Host 丢失后可以从本机重新生成远端看板投影。

### 3.2 工程目标

- Web Host 与 Codex Host 复用同一份业务 UI、领域 API 和状态规则。
- 共享功能的自动化验收全部在真实浏览器中完成。
- 自动化环境不依赖已安装 Codex、用户真实 CODEX_HOME、用户数据库或 CDP 权限。
- 每次失败都能产出 trace、截图、浏览器日志、Runtime 日志和 Hub 日志。
- 每个阶段独立可用、可合并、可回滚，不依赖后续阶段才能成立。

### 3.3 成功指标

- Web 核心功能 PR 门禁必须 100% 通过；连续 20 次运行中，依赖重试才通过的比例不得超过 5%。
- Web 自动化中不存在依赖固定端口、真实用户目录或真实 Codex 安装的用例。
- Runtime 与 Hub 在线时，本机变化在 10 秒内出现在远端。
- 远程操作在 10 秒内得到 applied、rejected 或 conflict 结果。
- 断网 5 分钟后恢复，1000 条正常积压变更在 60 秒内排空。
- 5000 张任务的首次投影在本地 CI 环境中 30 秒内完成，远端看板首次可交互时间不超过 2 秒。
- 同一命令重复发送 10 次只产生一次业务写入。
- 自动化扫描确认同步载荷不包含禁止字段。

## 4. 明确不做

- 不把 SQLite、WAL 或 SHM 文件复制到远端。
- 不让 Browser 或 Hub 直接写本机 SQLite。
- 不同步代码、文件、工作区路径、附件、日志、环境变量或凭据。
- 不同步 Codex 对话、Thread ID、提示词、回复草稿或 Session command 内容。
- 不同步 Agent instructions、模型、sandbox、并发设置或完整 Agent Profile。
- 不从远端启动、停止、中断或追加 Codex Session。
- 不在第一版支持多个本机 Runtime 同时拥有写入权。
- 不做团队空间、成员邀请、角色权限和实时多人协同编辑。
- 不把 Web 自动化结果表述为 Codex 原生权限、CDP 或安装态已经验证。
- 不引入第二种服务端语言、PostgreSQL、Redis、消息队列或通用同步框架。

## 5. 架构

    Codex Desktop Host ───────┐
                             │
    Local Browser Host ──────┼── Shared Better Codex UI
                             │              │
                             └──────────────┘
                                            │ Local Runtime API
                                            ▼
                                  Better Codex Runtime
                                  ├─ Domain services
                                  ├─ Local SQLite
                                  ├─ Sync Outbox
                                  └─ Sync Client
                                            │
                                    outbound HTTPS only
                                            │
                                            ▼
                                      Self-hosted Hub
                                      ├─ Sync API
                                      ├─ Command queue
                                      ├─ Projection SQLite
                                      ├─ Web auth
                                      └─ Shared UI Host
                                            │
                                            ▼
                                     Remote Web Browser

不存在 Hub 到本机的入站连接。不存在 Codex Host 与 Hub 的直接连接。所有领域写入最终都经过本机 Runtime。

## 6. 权威性与数据边界

### 6.1 本机权威数据

- Project 与 Issue 完整记录。
- Agent Profile、指令、模型和权限。
- Run、Session、Thread、回复和调度状态。
- workspace_path、附件、日志和本机诊断。
- Runtime Token、Codex Token 和设备令牌。

### 6.2 远端投影

Project 投影：

- id
- name
- identifier_prefix
- created_at
- updated_at
- local_revision

Issue 投影：

- id
- identifier
- project_id
- title
- description
- status
- priority
- labels
- sort_order
- pinned
- archived_at
- assigned 布尔摘要
- active_run 布尔摘要
- needs_attention 布尔摘要
- created_at
- updated_at
- local_revision

Runtime 投影：

- device_id
- device_name
- protocol_version
- core_version
- last_seen_at
- last_sync_at
- queue_depth
- health_state

不提供独立 Agent 实体。自定义 Agent 名称默认不上传。

### 6.3 单写入者规则

- 一个 Hub 在 V1 只有一个 active writer device。
- 设备连接使用 30 秒 lease，每 10 秒续租；同一时间只有 lease owner 可以推送投影和领取命令。
- 新设备接管必须显式撤销旧设备，或在旧设备连续 60 秒未续租后重新配对接管。
- Browser 写操作只创建 RemoteCommand，不直接改变权威版本。
- Hub 可以展示 pending projection，但必须标注尚未由本机确认。

## 7. 同步协议

协议固定为 sync/v1，并在每次握手中交换 protocol_version、core_version、device_id 和 capabilities。

### 7.1 本机 Outbox

新增持久化状态：

- sync_outbox：待推送实体变化。
- sync_tombstones：删除投影。
- sync_cursor：最后确认的远端命令游标。
- sync_connection：Hub 地址、设备 ID、协议版本和最后状态。
- sync-credentials.json：只保存 Device Token，macOS 使用 0600 文件权限，Windows 使用当前用户 Profile 目录 ACL；Token 不进入 SQLite。

业务写入与 Outbox 标记必须处于同一 SQLite 事务。Outbox 可以合并同一实体的连续更新，但删除墓碑不能被后续清理提前移除。

### 7.2 推送

- 首次连接发送当前白名单投影快照。
- 增量推送每批最多 100 条。
- 每条变化包含稳定 event_id。
- Hub 按 event_id 幂等确认。
- 本机收到 accepted 后才移除对应 Outbox。
- 连续失败采用 5、10、20、40、60 秒退避，恢复后立即排空。

### 7.3 远程命令

V1 允许：

- issue.create
- issue.update
- issue.move
- issue.archive
- issue.restore

每条命令包含：

- command_id
- entity_id
- operation
- patch
- base_revision
- requested_at
- requested_by_session

本机处理结果：

- applied：已经写入本机，返回新投影和版本。
- rejected：输入、权限或状态不允许。
- conflict：base_revision 与本机版本不一致。
- expired：命令超过 24 小时仍未领取。

正在运行的 Issue 不接受会改变 Project、归档或执行所有权的远程操作。标题、描述和标签修改也不静默覆盖正在进行中的本机编辑。

### 7.4 浏览器实时更新

- Hub 到 Browser 使用同源 SSE。
- SSE Event ID 对应 Hub revision。
- Browser 重连携带 Last-Event-ID。
- Event 历史保留最近 10000 条或 7 天，取先达到者。
- 游标过旧时返回 resync_required，Browser 重新获取当前投影。

### 7.5 固定 HTTP 接口

公开健康接口：

- GET /healthz

Web Session：

- POST /web/session
- DELETE /web/session
- GET /web/session

Web 看板：

- GET /api/v1/board
- GET /api/events
- POST /api/issues、PATCH /api/issues/<issue_id>
- POST /api/issues/<issue_id>/move|archive|unarchive
- GET /api/v1/commands/<command_id>

设备管理：

- POST /api/v1/admin/pairing-codes
- GET /api/v1/admin/devices
- DELETE /api/v1/admin/devices/<device_id>
- POST /api/v1/devices/pair

Runtime 同步：

- POST /api/v1/sync/push
- GET /api/v1/sync/commands?limit=<limit>
- POST /api/v1/sync/commands/<command_id>/ack

除 /healthz、登录和一次性设备配对外，所有接口都必须认证。Hub 不开放 CORS。Remote Web Host 把 Shared UI 的 HostContract 请求映射到上述安全子集，本机专属 API 根据 capabilities 隐藏或禁用。

### 7.6 CLI 与默认配置

本机命令：

    better-codex web
    better-codex sync connect --url <https-url> --pairing-code <code> --name <device-name>
    better-codex sync status
    better-codex sync now
    better-codex sync disconnect
    better-codex sync devices
    better-codex sync revoke <device-id>

Hub 管理命令通过容器内 admin CLI 执行：

    docker compose exec hub node dist/hub-cli.js password-set
    docker compose exec hub node dist/hub-cli.js pairing-code
    docker compose exec hub node dist/hub-cli.js devices
    docker compose exec hub node dist/hub-cli.js revoke <device-id>
    docker compose exec hub node dist/hub-cli.js backup
    docker compose exec hub node dist/hub-cli.js audit

默认值：

- Hub 容器端口：4318。
- Hub 4318 只暴露给 Compose 内部网络；Caddy 对宿主机开放 80/443。
- Hub 数据库：/data/better-codex-hub.db。
- 本机轮询：在线 5 秒；失败按 5 至 60 秒退避。
- 同步批大小：100。
- 长轮询等待：25 秒。
- Writer lease：30 秒。
- Web Session：12 小时。
- Pairing code：10 分钟。
- Remote command：24 小时。
- Event 保留：10000 条或 7 天。

## 8. Web Host 自动化策略

### 8.1 原则

1. 共享业务逻辑只验证一次，主要证据来自 Web Host。
2. 浏览器运行真实 UI、真实 Runtime API 和真实临时 SQLite，不使用静态 HTML 假数据替代。
3. Codex 专属能力通过 HostContract 测试替身验证界面状态，不声称验证了真实 Codex。
4. 所有自动化使用生成数据，不读取用户真实数据库。
5. 失败必须留下可复现证据，不能只返回超时。

### 8.2 测试拓扑

    Playwright Chromium
          │
          ├─ Local Web Host ── Runtime A ── temp SQLite A
          │
          └─ Remote Web Host ─ Hub ──────── temp SQLite Hub
                                      ▲
                                      │
                                  Sync Client A

测试控制器负责：

- 创建独立临时目录。
- 分配动态端口。
- 生成 Runtime Token、Web 密码和设备配对码。
- 启动 Runtime 与 Hub 子进程。
- 等待 health endpoint。
- 在测试结束后终止完整进程树。
- 收集并脱敏日志。
- 删除临时目录。

### 8.3 HostContract

共享 UI 只依赖以下宿主能力：

- request：调用同源 Better Codex API。
- navigate：切换 Web route。
- openProjectInCodex：请求打开本机 Project。
- openThreadInCodex：请求打开 Thread。
- runtimeStatus：读取 Runtime 与 Host 状态。

Web 自动化为 Codex 特权方法提供确定性结果：

- acknowledged
- unavailable
- permission_denied
- timeout

这些结果只验证 UI 的成功、失败、重试和提示逻辑。真实 Codex 是否能完成动作由安装态人工冒烟验证。

### 8.4 自动化工具

- Node test：现有数据库、API、同步协议、认证和幂等契约。
- Playwright Chromium：真实浏览器功能、交互、路由、响应式、恢复和远端同步。
- Playwright trace：DOM、网络、操作时间线和截图。
- Docker Compose：最终 Hub 镜像和反向代理部署冒烟。

不引入 Selenium、Puppeteer 或第二套浏览器框架。

### 8.5 实施后固定命令

    npm test
    npm run typecheck
    npm run test:web
    npm run test:web:smoke
    npm run test:web:selfhost
    npm run test:deploy:selfhost
    npm run test:web:visual
    npm run test:web:debug -- --grep "<scenario>"
    npm run test:acceptance

命令语义：

- npm test：全部 Node test。
- typecheck：只做 tsc --noEmit，不刷新本机安装。
- test:web：本地 Web UI 全量 Chromium E2E。
- test:web:smoke：5 分钟以内的核心 PR 门禁。
- test:web:selfhost：Runtime、Hub 和远端 Browser 完整集成。
- test:deploy:selfhost：从空卷构建 Hub 与 Caddy，通过 HTTPS 完成账户密码登录、同步和远程写入闭环。
- test:web:visual：固定 viewport 的视觉快照。
- test:web:debug：headed、单 worker、保留 trace。
- test:acceptance：Node test、Web 全量、自托管集成和安全扫描。

### 8.6 Playwright 固定配置

- Chromium 为首个且唯一的日常浏览器。
- 本地默认 headless；debug 命令使用 headed。
- 功能测试 timeout 为 30 秒。
- Selfhost 场景 timeout 为 90 秒。
- CI 失败重试 1 次，本地不重试。
- integration suite 单 worker；纯 Web 页面测试最多 4 workers。
- trace：第一次失败时保留。
- screenshot：失败时保留。
- video：仅最终失败时保留。
- locale：zh-CN 与 en 各至少一组 smoke。
- viewport：1440x900、1024x768、390x844。
- theme：light 与 dark。
- reducedMotion：reduce。

### 8.7 失败证据

每个最终失败上传：

- trace.zip
- failure.png
- video.webm
- browser-console.log
- browser-network.log
- runtime.log
- hub.log
- sanitized-state.json
- acceptance.json

acceptance.json 包含 commit SHA、Node 版本、平台、浏览器版本、场景名、开始和结束时间、重试次数和最终结果。

禁止上传真实数据库、真实 Token、用户路径、用户 Issue 内容或 CODEX_HOME。

## 9. 自动化场景矩阵

### 9.1 Local Web Smoke

- 未认证访问显示连接页。
- 有效 Runtime Token 换取 Web Session。
- 无效 Token 被拒绝。
- Web Session 失效后返回连接页。
- 打开 Board 并加载 Project、Issue 和状态列。
- 创建 Issue。
- 编辑标题、描述、状态、优先级和标签。
- 拖动 Issue 跨列。
- 归档并恢复 Issue。
- 页面刷新后保持数据和 route。

### 9.2 共享功能回归

- Project 切换、筛选、搜索、置顶和排序。
- Agent 列表和只在本机可用的设置。
- Issue version 冲突。
- 两个 Browser Context 同时编辑同一 Issue。
- Runtime 返回 400、401、403、404、409、413 和 503。
- 重复点击不会重复创建。
- Dialog 焦点、Escape、键盘提交和错误恢复。
- 中文、英文、浅色、深色、桌面和移动 viewport。

### 9.3 Runtime 故障

- Runtime 启动慢。
- Runtime 请求超时。
- Runtime 中途退出。
- Runtime 重启并更换动态端口。
- SSE 断开与重连。
- Event cursor 仍有效时增量补齐。
- Event cursor 过旧时完整 resync。
- 数据库不可写。
- PRAGMA quick_check 失败。
- 数据库 schema 高于客户端支持版本。

### 9.4 只读同步

- 首次配对和完整快照。
- 增量创建、修改、移动、归档和删除墓碑。
- 同一 event_id 重复推送。
- Hub 停机后本机继续 CRUD。
- Hub 恢复后 Outbox 排空。
- Runtime 重启后 Outbox 和 cursor 不丢失。
- 设备 lease 过期与重新获取。
- 第二设备试图成为 writer 时被拒绝。
- protocol_version 不兼容时停止同步。
- 5000 Issue 首次同步和分页加载。

### 9.5 远程写入

- 远程创建 Issue 后显示 pending。
- 本机应用后 pending 变为 applied。
- 远程更新、移动、归档和恢复。
- 同一 command_id 重复拉取和确认。
- base_revision 过旧产生 conflict。
- 活跃 Run 上的危险修改被 rejected。
- Runtime 离线时命令保持 pending。
- 24 小时未处理命令变为 expired。
- Browser 刷新后仍能看到命令状态。

### 9.6 安全与隐私

- 非同源 Origin 被拒绝。
- CSRF 缺失或错误被拒绝。
- Web Cookie 具有 Secure、HttpOnly 和 SameSite=Strict。
- 登录错误限流。
- 撤销设备后旧 Token 立即失效。
- 配对码只能使用一次并在 10 分钟后过期。
- HTTP 公网 Hub URL 被本机拒绝，loopback 开发除外。
- XSS 载荷在标题、描述和标签中只作为文本显示。
- 超限 body 被停止读取并返回 413。
- 同步请求 JSON 深度扫描不包含 workspace、thread、prompt、reply、log、attachment、credential 和 agent instruction 字段。

### 9.7 备份、恢复与升级

- Hub migration 前生成一致性备份。
- 从备份恢复后投影、设备和 pending command 一致。
- 清空无 pending command 的 Hub 后可由本机重建。
- 有 pending command 时禁止无提示清空。
- 客户端升级不重复生成快照。
- Hub 降级不修改本机业务数据库。

## 10. CI 工作流

### 10.1 Pull Request 快速门禁

运行环境：macos-15，Node 22.22，Chromium。

顺序：

1. npm ci
2. npm run typecheck
3. npm test
4. npm run test:web:smoke
5. npm run test:web:selfhost -- --grep "@critical"

目标总时间不超过 12 分钟。任一步失败阻止合入。

### 10.2 main 完整门禁

运行矩阵：

- macos-15 + Node 22.22
- windows-2025 + Node 22.22

执行：

- Node test 全量。
- Web E2E 全量。
- Selfhost 全量。
- 安全与隐私扫描。
- 失败证据上传并保留 7 天。

### 10.3 每晚扩展门禁

运行：

- 5000 Issue 数据量。
- 1000 条离线 Outbox 恢复。
- Runtime 与 Hub 重启循环。
- 网络延迟、断开、重复和乱序响应。
- Web 视觉快照。
- 中文、英文、浅色、深色和移动 viewport。
- Node 24 生命周期 smoke。

Nightly 失败不自动修改代码或基线，必须产生可复现 artifact。

### 10.4 Preview 与 Stable 门禁

现有 build、package:binary、重复安装和跨平台流程保持。

在 Preview tag 前增加：

- npm run test:acceptance
- Docker Hub 镜像本地启动。
- 通过反向代理完成 HTTPS、登录、同步和远程写入 smoke。
- 生成候选 SHA 绑定的 acceptance.json。

Stable 前额外需要最小 Codex 安装态人工验收，不用 Web E2E 替代。

## 11. Codex Desktop 最小人工验收

只验证 Web 无法证明的宿主边界：

1. 安装后的 Better Codex 入口能在 Codex Desktop 出现。
2. 点击入口能打开任务看板。
3. 从卡片请求打开原生 Thread 时，实际打开正确 Thread。
4. 卡片与原生 Session 的写入权不会同时启用。
5. 权限拒绝、Codex 关闭和注入失效时不显示虚假成功。
6. macOS Apple silicon、Intel macOS 和 Windows 各执行一次 Preview 候选验收。

每个平台只保留截图、版本、候选 SHA、操作结果和失败原因。不得记录真实对话或用户任务。

Codex 人工冒烟失败时，先判断失败属于 Host adapter 还是共享业务逻辑。共享逻辑回到 Web 自动化复现并修复；只有真实权限、CDP 和原生导航问题留在 Codex 环境处理。

## 12. 日常自动化调试工作流

1. 用 Web 测试的 scenario 名复现问题。
2. 先运行单个 headless 场景。
3. 失败时打开 trace，检查最后一个成功动作、请求、响应和 DOM。
4. 需要交互观察时运行 test:web:debug。
5. 修复共享 UI、Runtime、数据库或同步层。
6. 重跑单场景，连续通过 3 次后运行所属 suite。
7. 运行 test:web:smoke。
8. 共享路径全部通过后，才进行一次最小 Codex 人工冒烟。
9. Codex 冒烟只记录 Web 无法覆盖的差异，不在 Codex 内反复调试共享功能。

禁止通过增加 sleep、提高全局 timeout、删除断言或无条件重试来掩盖问题。等待必须绑定可观察状态：health ready、SSE revision、command status 或 DOM 可交互。

## 13. 分阶段实施

### 阶段 1：本地 Web UI 与测试基座

实施状态：已完成。功能提交 eaf65ba，CI 修复提交 5498afc；Local Web Smoke 连续 10 次通过，完整门禁通过 212 个 Node 测试（201 通过、11 跳过）和 2 个 Chromium E2E。main CI 31521408060 的 Web UI、macOS、Windows 与 Node 24 job 全部通过。

预计投入：2 至 3 个工程日。

实施内容：

- 从 codex/web-ui-recovered 工作区提取 Browser Host 改动到当前 main。
- 增加 better-codex web。
- 增加同源 Web Session 和 session 过期。
- 让现有 injectionScript 支持 codex 与 web 两种 host。
- 增加 Playwright、动态端口进程 fixture 和临时数据目录。
- 完成 Local Web Smoke。
- 不连接 Hub，不改变同步和远程部署。

目标文件：

- src/web-host.ts
- src/server.ts
- src/dom.ts
- src/cli.ts
- src/appearance.ts
- src/design-system.ts
- package.json
- package-lock.json
- playwright.config.ts
- test/e2e/fixtures/
- test/e2e/web/local-smoke.spec.ts

验收标准：

- better-codex web 自动打开 loopback Web UI。
- 浏览器可以完成 Project/Issue 核心 CRUD、拖动、归档和刷新。
- 无效 Token、失效 Session、跨 Origin 和超限 body 均被拒绝。
- Web Smoke 在本机连续运行 10 次无失败。
- 关闭 Browser Host 不影响 Codex DOM Host。

独立交付结果：即使永远不实施 Selfhost，用户也获得完整本地浏览器入口和可自动调试的 UI。

回滚：移除 Web route 和 CLI 入口，不修改业务数据库。

### 阶段 2：共享功能 Web 自动化全覆盖

实施状态：已完成。提交 4673933；已固定 Web HostContract，请求与 SSE 订阅分离；支持 64 个事件窗口内的 cursor 补齐和过旧 cursor reset；5 个 Chromium 场景覆盖 Local Smoke、双 Browser Context 冲突、实时同步、搜索、Agent 页面、中英文、明暗主题、移动视口、键盘关闭、Runtime 重启与重新认证。完整 test:web:stack 通过 212 个 Node 测试和 5 个 Chromium E2E；main CI 31522574658 的 Web UI、macOS 26、Intel macOS、Windows 与 Node 24 job 全部通过。

预计投入：3 至 5 个工程日。

实施内容：

- 固定 HostContract。
- 把共享功能、错误状态、并发和恢复场景搬到 Web E2E。
- 增加两个 Browser Context 的版本冲突测试。
- 增加 Runtime 重启、SSE 重连和 cursor 恢复。
- 增加中文、英文、主题、viewport 和键盘路径。
- 增加 trace、截图、视频和日志 artifact。
- CI 增加 PR Web Smoke 与 main 全量门禁。

目标文件：

- src/dom.ts
- src/server.ts
- src/web-host.ts
- test/e2e/fixtures/
- test/e2e/web/
- scripts/test-web-stack.mjs
- playwright.config.ts
- package.json
- .github/workflows/ci.yml

验收标准：

- 第 9 节 Local Web、共享功能和 Runtime 故障场景全部自动化。
- 每个强制失败场景都会生成完整证据。
- 测试环境不读取真实 CODEX_HOME 和 Better Codex 数据库。
- PR Web Smoke 总时间不超过 12 分钟。
- Codex Desktop 日常调试只剩第 11 节六项人工边界。

独立交付结果：本地产品获得稳定、可复现、与 Codex 权限解耦的自动化回归系统。

回滚：删除 Playwright CI job 不影响 Runtime 和产品功能。

### 阶段 3：只读 Self-hosted Hub

实施状态：已提交 61c4351。已实现 sync/v1、事务 Outbox 与墓碑、一次性配对、30 秒单 Writer lease、Hub SQLite 投影、共享 UI 只读 Remote Host、SSE 增量更新、真实 Runtime 进程同步、离线与重启恢复、Docker Compose 和 Tailscale Serve 入口。Node 全量 218 个测试中 207 通过、11 跳过；6 个 Chromium E2E 全部通过；5000 Issue 首次投影约 2.7 秒；Linux Hub 镜像构建及容器 healthz 冒烟通过。main CI 31524783292 的 Web UI、macOS 26、Intel macOS、Node 24、CodeQL 和 Commit Quality 通过；Windows 功能测试通过，但 5000 Issue 性能用例在共享 Windows runner 上超时，阶段 4 已把该参考性能门禁限定到 Unix CI，Windows 继续执行全部功能与安装测试，等待下一次 main CI 复验。

预计投入：4 至 5 个工程日。

实施内容：

- 在当前 main 上重新实现 sync/v1、Outbox、cursor 和设备 lease。
- 新增 Hub SQLite、Hub migration、设备配对和投影 API。
- Remote Web Host 复用 Shared UI，通过 capabilities 禁用写入和本机专属功能。
- 本机只建立出站 HTTPS 连接。
- 增加首次快照、增量变更、墓碑、重连、协议拒绝和清空重建。
- 提供 Docker Compose 和 Tailscale Serve 私有部署路径。
- 完成只读同步和规模自动化。

目标文件：

- src/sync-contract.ts
- src/sync-config.ts
- src/sync-client.ts
- src/db.ts
- src/server.ts
- src/cli.ts
- hub/server.ts
- hub/store.ts
- hub/web-host.ts
- hub/cli.ts
- deploy/hub/
- test/e2e/selfhost/

验收标准：

- 未连接 Hub 时不存在网络请求。
- 本机 CRUD 不依赖 Hub 可用性。
- 首次和增量同步满足第 3.3 节延迟与规模指标。
- Hub 只包含白名单投影。
- Hub 清空后可由本机重建。
- 第二 writer device 被拒绝。
- 远端 Web UI 可以稳定只读浏览看板和 Runtime 在线状态。

独立交付结果：用户可以私有远程查看 Better Codex，而不能远程修改，风险可控。

回滚：sync disconnect 停止网络并删除本机设备凭据，不删除本机 Project、Issue、Run 或 Session。

### 阶段 4：远程写命令与冲突

预计投入：3 至 4 个工程日。

实施状态：已完成。提交 50f5495；已实现持久化 RemoteCommand、24 小时过期、pending projection、本机 ack、命令审计、base_revision 冲突、command_id 幂等、Issue 创建/编辑/移动/归档/恢复、活跃 Run 双端保护、冲突显示与基于最新版本重新提交。完整 test:web:stack 通过 223 个 Node 测试（212 通过、11 平台跳过）和 7 个 Chromium E2E；Selfhost 专项覆盖双 Browser Context、重复与乱序命令、Runtime 离线、Hub 重启、活跃 Run 和禁止远程 Codex 启停 API。main CI 31526364536 的 Web UI、macOS 26、Intel macOS、Windows 与 Node 24 job 全部通过；CodeQL 31526364564 和 Commit Quality 31526364458 通过。

实施内容：

- 增加 RemoteCommand、pending projection、ack 和审计。
- 开放 Issue 安全字段 CRUD、移动、归档和恢复。
- 增加 base_revision、command_id 幂等和 24 小时过期。
- 增加活跃 Run 限制、冲突界面和重新提交。
- 增加 Runtime 离线、重复、乱序和双 Browser Context 自动化。

目标文件：

- src/sync-contract.ts
- src/sync-client.ts
- src/db.ts
- hub/store.ts
- hub/server.ts
- hub/web-host.ts
- src/dom.ts
- test/e2e/selfhost/

验收标准：

- 所有远程操作先显示 pending。
- 本机确认前不显示为最终成功。
- 重复命令不产生重复写入。
- base_revision 过旧时保留本机数据并显示 conflict。
- 活跃 Run 不会被远程操作中断或改写所有权。
- Runtime 离线和 Hub 重启后命令状态不丢失。
- 不存在远程启动、停止、steer 或 interrupt Codex 的 API。

独立交付结果：用户可以安全地远程维护看板，Codex 执行仍完全留在本机。

回滚：关闭 command ingestion 后保留只读同步；已 applied 命令属于正常本机历史，不反向删除。

### 阶段 5：公网安全、运维与发布

预计投入：3 至 5 个工程日。

实施状态：已完成。提交 8461c70、9cd9bf3、c3f0523、f804d8d；已分离 bootstrap secret、设备令牌和 Web 账户密码；Web 密码使用 scrypt，浏览器只持有 Secure/HttpOnly/SameSite=Strict Cookie 与独立 CSRF；已增加 Host/Origin 校验、登录限流、安全响应头、审计、12 小时会话、设备撤销、凭据轮换、迁移前备份、手动备份恢复和 10000 条/7 天 SSE 窗口。Caddy 2.11.4 终止 HTTPS，Hub 仅在 Compose 网络内暴露。候选通过 227 个 Node 测试（216 通过、11 个平台跳过）、7 个 Chromium E2E，以及真实 Docker/Caddy HTTPS 的配对、投影同步、账户密码登录、远程命令与本机确认闭环。main CI 31552094757、CodeQL 31552094796、Commit Quality 31552094790 全部通过；发布准备 SHA f2a178e 的 main CI 31552913273、CodeQL 31552913219、Commit Quality 31552913331 全部通过。

实施内容：

- 分离部署 bootstrap secret、设备令牌和 Web 登录凭据。
- 配对使用一次性 10 分钟 code。
- Web 密码使用 scrypt。
- Web Session 使用 Secure、HttpOnly、SameSite=Strict Cookie，12 小时失效。
- 增加 CSRF、Origin/Host 校验、登录限流、安全响应头和审计。
- Hub 默认 loopback 监听，由 Caddy 或 Tailscale Serve 提供 HTTPS。
- 提供备份、恢复、设备撤销、密码轮换和健康检查。
- 增加 Docker 镜像、HTTPS 和恢复自动化。
- 接入 Preview 与 Stable 门禁。

目标文件：

- hub/auth.ts
- hub/server.ts
- hub/store.ts
- hub/cli.ts
- deploy/hub/compose.yaml
- deploy/hub/Caddyfile
- scripts/test-selfhost-deployment.mjs
- test/e2e/selfhost/security.spec.ts
- .github/workflows/ci.yml
- .github/workflows/preview.yml
- .github/workflows/release.yml

验收标准：

- 公网入口只通过 HTTPS。
- Browser 不接触设备配对密钥。
- 设备撤销后旧令牌立即失效。
- 安全与隐私矩阵全部通过。
- 备份恢复保留 pending command。
- Docker Compose 从空目录可以启动并通过 health、登录、同步和远程写入 smoke。
- Preview 候选绑定自动化 acceptance.json、三平台构建/打包/重复安装和 Ubuntu Selfhost 验收。

独立交付结果：Selfhost 可以作为正式受支持能力公开给用户。

回滚：停止反向代理与 Hub；本机执行 sync disconnect。Docker volume 默认保留，删除 volume 必须单独确认。

## 14. 数据库变更与回滚

本机 migration 前：

- VACUUM INTO 创建版本化备份。
- PRAGMA quick_check 必须为 ok。
- migration 与 Outbox 初始化处于明确事务。

Hub migration 前：

- 创建一致性备份。
- 记录 schema version。
- pending command 数量大于 0 时禁止破坏性重建。

方向失败时：

- 本机停止 SyncClient。
- 保留同步表，旧 Runtime 忽略它们。
- 本机业务表不需要回滚。
- Hub 可以退回只读模式。
- 远端投影可以重建，pending command 必须显式导出、应用或放弃。

## 15. 外部依赖与凭据

开发依赖：

- Playwright：浏览器 E2E。
- Chromium：唯一日常自动化浏览器。
- Docker Engine 与 Compose：最终 Hub 镜像验收。

当前机器只读预检结果：Node、npm、npx、Docker 和 Tailscale 可用；Caddy 本机命令未安装。阶段 5 使用 Compose 中固定版本的 Caddy 容器，因此不要求开发机预装 Caddy CLI。

部署依赖：

- Tailscale Serve：推荐的私有远程访问方式。
- Caddy：需要普通公网域名时的 HTTPS 终止。
- 公网域名与 DNS：仅公网模式需要。

Secrets：

- Hub bootstrap secret：只用于初始化管理凭据，不提供给 Browser。
- 一次性配对码：绑定本机 Runtime，10 分钟失效。
- Device Token：Runtime 同步身份，可撤销。
- Web admin password：用户登录，不等同于设备权限。
- Web Session：HttpOnly Cookie，12 小时失效。

本计划不依赖外部 MCP Server、云数据库、OAuth 供应商或 Better Codex 官方云账号。

## 16. 风险攻击与设计响应

### Hub 或网络故障

影响：远端变旧，远程命令等待。

响应：本机继续工作；Outbox 持久化；恢复后排空；Web 明确显示最后同步时间。

### 数据量增长十倍

最先失效位置：完整 Board JSON、Browser 初次渲染和无界 Event 日志。

响应：批量同步、Project 过滤、分页加载、Event 保留上限和 resync_required。

### 多设备抢占

影响：同一命令可能被两个 Runtime 应用。

响应：V1 单 writer lease；Hub 只把命令交给 lease owner；设备接管显式化。

### 旧客户端或旧 Hub

影响：字段误解或数据丢失。

响应：严格 protocol_version 与 capabilities；不兼容时停止同步并保持本地模式。

### 公网攻击

影响：凭据爆破、CSRF、XSS 和命令伪造。

响应：HTTPS、分离凭据、HttpOnly Session、CSRF、限流、CSP、字段白名单和审计。

### 方案回滚

影响：远端命令可能尚未应用。

响应：只读模式与同步断开可独立执行；pending command 必须在停服前明确处理。

## 17. 最脆弱假设

本计划假设 V1 的远程目标是查看和编辑任务看板，而不是在公网直接操作 Codex 对话和执行。

如果这个假设不成立，必须新增敏感消息加密、远程执行授权、Session 单写入权切换、审批、速率限制和更严格的审计。该能力不能复用普通 Issue command 直接上线，应作为独立计划，预计至少增加 50% 的实现与验收工作量。

## 18. 完成定义

只有同时满足以下条件，Self-hosted Web UI 才能标记完成：

- 五个阶段各自达到验收标准。
- 当前 main 的 Node test、Web E2E、Selfhost E2E 和安全矩阵全部通过。
- 自动化证据绑定同一个候选 SHA。
- macOS Apple silicon、Intel macOS 和 Windows 完成构建、打包和重复安装门禁；Codex 注入权限不作为自动化完成条件。
- 本机关闭 Hub 后功能不退化。
- 数据边界扫描没有禁止字段。
- 备份、恢复、撤销设备、断网恢复和协议不兼容均有证据。
- 文档明确区分 Web 自动化、源码测试、打包、安装态和真实公网验收。

## 19. 执行入口

实施从阶段 1 开始。阶段 1 合并并通过验收后才进入阶段 2；后续阶段同理。任何阶段延期都不影响之前已经交付的能力。

每阶段完成后执行代码审查，再决定是否进入下一阶段。不得为了赶进度把只读 Hub、远程写入和公网安全合并成一个不可回滚的大提交。

## 20. 最终交付证据

- Beta：v0.4.3-beta.1，候选 SHA f2a178eab587ac2f6f96c927e3689d44bcf68aa9；GitHub Preview 工作流 31553072657 全部通过。
- 发布资产：macOS Apple silicon、Intel macOS、Windows 包、checksums、签名、update manifest 和 acceptance.json 已发布。
- Ubuntu：Ubuntu 24.04.2 LTS、Docker 29.4.0、Compose 5.1.2；Hub 容器健康，PID 1 以 UID 1000 运行，仅绑定 127.0.0.1:25818。
- 公网入口：https://aionui.talktodo.cn；既有 nginx/Certbot 终止 TLS，Hub 返回 HSTS 等安全头。
- 临时账号验收：完成 HTTPS 登录、配对、投影同步、远程命令、Runtime 拉取、ack 和 Web 回读；临时设备已撤销，临时投影已清空，临时会话已注销，旧用户名和旧密码均返回 401。
- 正式接入：本机托管 Runtime 已升级到 0.4.3-beta.1 并连接 Hub；sync status 为 connected，last_error 为 null，pending/outbox/tombstones 均为 0。
- 真实数据：本机与 Hub 均为 16 个 Project、34 个 Issue；远端 revision 为 54，Runtime health_state 为 online。
- 真实浏览器：公网 Chromium 登录后标题为 Better Codex，remote mode 为 true，成功渲染 16 个 Project 和 34 个 Issue。
- 隐私边界：实际公网 projection key 扫描未发现 workspace_path、thread_id、run_thread_id、prompt、output、transcript、token 或 device_token。
- 运维：Hub 数据库已生成 `/data/better-codex-hub-final.db` 一致性备份；原 aionui nginx 配置保留时间戳回滚副本，原 opencode 进程未删除。
- Codex 边界：本机 Runtime、Web UI 和同步已验证；Codex 注入重连返回 cdp_listener_untrusted，符合本计划将自动化调试迁移到 Web 的边界，不据此宣称原生 CDP 已验证。
