# Plan：官方 MCP 与多设备同步

更新日期：2026-08-12

状态：延后，不属于当前执行路线。

当前先实施 [Self-hosted Hub 与 Web UI](PLAN_SELF_HOSTED_WEBUI.md)。本文件保留为未来“Better Codex 官方托管账号与 MCP 服务”的历史方案，不与 Selfhost 并行开发。

重新启动本计划必须同时满足：

- Selfhost 已完成真实用户验证，证明托管服务能解决额外问题。
- 用户明确需要官方账号、跨多个本机 Runtime 同步或第三方 MCP 客户端。
- 团队能够承担 OAuth、账号删除、隐私政策、服务可用性和长期运维。

在此之前，远程看板、Outbox、冲突、设备撤销和 Web 自动化统一由 Selfhost 计划负责；不得同时实现两套同步协议。

## 目标

通过远程 Better Codex MCP Server 让用户登录账号，并在多台设备之间同步明确选择的 Project 与 Issue，同时保留本地 SQLite、离线使用和本地 Agent 执行能力。

同步后台由 Better Codex Runtime 主动执行，不依赖 Codex Agent 是否调用 MCP 工具。Codex 和其他 MCP 客户端使用同一服务查看与修改云端看板。

## 启动条件

- `v0.4.1` Session、Run、回复和恢复模型已经稳定。
- 小范围真实用户验证达到安装、激活和重复使用门槛。
- 用户明确需要跨设备继续 Issue，并接受把所选 Project 的 Issue 标题、描述和看板字段保存到云端。
- 远程服务、账号、存储、同步队列、冲突处理和删除机制都有独立回滚方案。

## 架构

```text
Codex / MCP 客户端
        │
        ▼
远程 Better Codex MCP
        │
        ├── OAuth 2.1、PKCE、设备授权
        ├── Project、Issue、版本与变更日志
        └── sync_exchange、冲突与游标
        ▲
        │
Better Codex Runtime
        │
        ├── 本地 SQLite
        ├── Outbox 与入站游标
        ├── 冲突记录
        └── 系统凭据存储中的令牌
        ▲
        │
本地看板、CLI、Agent 与 Codex Session
```

## 数据边界

### 同步到云端

- Project 名称与稳定远程 ID。
- Issue 标题、描述、状态、优先级、标签、置顶和归档状态。
- 语义排序操作、实体版本、更新时间和最后修改设备。
- 删除墓碑、同步游标、操作 ID 和冲突记录。

### 只保留本机

- `workspace_path`、本地 Codex Project ID 和本机路径。
- Codex 对话正文、Thread 内容、Run、回复草稿、日志和附件。
- Agent Profile、模型、指令、权限、并发和沙箱设置。
- `agent_id`、`needs_attention`、`pending_actor` 和本地诊断信息。
- 代码、文件、环境变量和凭据。

远程变更不得启动、停止或中断本机 Agent。Issue 正在运行时收到远程修改，先挂起并提示处理，不能覆盖本地 Session 与 Run 状态。

## MCP 能力

- `board`
- `project_list`
- `issue_list`
- `issue_get`
- `issue_create`
- `issue_update`
- `issue_move`
- `issue_archive`
- `issue_restore`
- `sync_exchange`
- `sync_status`
- `device_list`
- `device_revoke`

所有写操作携带 `base_revision` 和 `operation_id`。重复请求按 `operation_id` 幂等处理，不重复创建或移动 Issue。

## 实施阶段

### 阶段一：远程 MCP 基础

目标投入：1.5 至 2 周。

- 部署独立远程 MCP 服务。
- GitHub 登录作为首个账号入口。
- OAuth 2.1、PKCE、刷新令牌轮换、设备授权和撤销。
- Project、Issue、设备、变更日志和永久删除墓碑。
- 云端看板与完整 Issue CRUD。
- `sync_exchange` 协议固定为 `sync/v1`。

阶段一独立交付后，用户可以从不同 MCP 客户端访问同一个云端看板，但本地 Better Codex 尚不自动同步。

### 阶段二：单 Project 手动同步

目标投入：2 至 3 周。

- 本地新增远程映射、远程版本、Outbox、同步游标和冲突记录。
- 设置页提供登录、选择 Project、预览、立即同步、暂停和退出。
- 首次开启显示上传、新增、合并和冲突数量，不自动上传全部本地数据。
- 非重叠字段自动合并；同一字段双端修改时逐字段确认。
- 离线创建使用稳定 UUID；正式编号由目标 Project 规则生成，不改实体 ID。
- 首版只允许一个 Project 开启同步。

阶段二是最小可上线版本：两台设备通过“立即同步”可靠交换 Issue。

### 阶段三：自动同步与公开 Beta

目标投入：约 2 周。

- 本地业务写入和 Outbox 写入处于同一 SQLite 事务。
- 写入后立即尝试推送；看板打开时每 10 秒拉取，后台每 60 秒拉取。
- 失败采用 5 秒到 5 分钟的指数退避并加入抖动。
- 网络恢复后自动排空队列。
- 提供设备列表、最后在线时间、单设备撤销、全部退出和远程数据删除。
- 完成 macOS 与 Windows 双设备私测后再默认展示同步入口。

在线且看板打开时，同步延迟目标为 P95 小于 15 秒；恢复联网后 60 秒内排空正常队列。

## 冲突规则

- 修改字段不重叠：自动合并。
- 修改字段重叠：保留本地和远程两个版本，等待用户选择。
- 本机 Issue 正在运行：远程修改挂起，不中断 Run。
- 远程归档与本机编辑冲突：必须人工确认。
- 同一操作重复发送：幂等确认。
- 被撤销设备：立即拒绝后续读取和写入，本地看板继续可用。
- 服务端不可用：只暂停同步，不锁看板、不删除本地数据。
- 客户端遇到更高协议版本：停止同步并退回本地模式。

## 明确不做

- 不同步 Codex 对话正文、代码、文件、附件、日志和环境变量。
- 不远程启动本机任务或控制本机 Codex Session。
- 不同步 Agent Profile。
- 不做团队空间、成员权限和协同编辑。
- 不把云端变成 Runtime 的唯一数据源。
- 不直接复制 SQLite 文件。
- 不依赖 Codex Agent 是否调用 MCP 工具。

## 验收

- 设备 A 创建、编辑、移动和归档后，设备 B 结果一致。
- 两端离线编辑同一字段时不发生静默覆盖。
- 同一操作重试十次不会重复创建 Issue。
- 撤销设备后，旧令牌不能继续读取或写入。
- 远程服务中断时，本地 CRUD 和 Agent 执行不受影响。
- Thread、工作目录、Agent 配置、日志和附件不会进入远程数据。
- 关闭同步后保留全部本地数据，可随时重新连接。
- macOS、Windows、离线、冲突、撤销授权、服务故障和账号删除均有真实验收证据。

## 回滚

- 阶段一可以独立关闭远程 MCP，不影响本地 Better Codex。
- 阶段二或阶段三失败时停止同步循环，保留本地实体、Outbox、游标和冲突记录。
- 关闭同步不删除本地数据；远程数据删除必须独立确认。
- 服务恢复后从最后确认游标继续，不重新上传完整数据库。

## 当前状态

方案已完成，尚未开始 MCP Server、账号系统和同步实现。完整实现预计 6 至 8 个工程周；最小“单 Project 加手动同步”预计约 3 周。
