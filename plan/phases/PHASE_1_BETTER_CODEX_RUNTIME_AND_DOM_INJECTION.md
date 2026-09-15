# Phase 1：Better Codex Runtime 与 Codex DOM 注入

## 阶段目标

在 Codex 桌面端内交付一个真正可用的本地任务面板，让用户能够整理任务、关联对话、搜索历史工作并重新打开对应 Codex Thread。

本阶段完成后，即使没有 Multi-Agent，Better Codex 也已经能独立解决“任务无处管理、对话沉底、找不到历史对话”的问题。

## 用户结果

- Codex 左侧导航出现稳定的 Better Codex 入口。
- 点击入口后，在 Codex 主内容区打开嵌入式任务面板。
- 可以把当前 Codex 对话创建为新 Issue，或关联到已有 Issue。
- 可以从 Issue 卡片和详情重新打开关联的 Codex Thread。
- 可以创建 Project、拖动状态、调整优先级、添加标签、搜索和置顶 Issue。
- Runtime 和 Codex 重启后，任务、排序、评论和 Thread 关联仍然存在。

## 本阶段范围

### Runtime 内核

- 单一 Node.js Runtime 进程。
- 只监听 `127.0.0.1`，默认由操作系统分配动态空闲端口。
- 原子写入 `~/.better-codex/run/runtime.json`，保存 PID、端口、实例 ID、版本和启动时间。
- CLI 与 Injector 必须通过运行描述文件和 `/health` 身份校验发现 Runtime。
- Runtime Supervisor 统一管理 Injector，并通过单实例锁避免重复 Runtime。
- SQLite WAL、migration、事务和备份。
- Project、Issue、Comment、Thread Link 和 Activity Event。
- HTTP API 和健康检查。
- Runtime 用户服务、PID、日志和崩溃后重启。
- UI、CLI 和注入器调用同一套领域服务。

### Kanban

- Project 切换。
- `backlog / todo / ready / in_progress / in_review / blocked / done / canceled` 八列状态。
- 卡片拖拽和同列排序。
- 标题、描述、优先级、标签、置顶和归档。
- 列表搜索和组合筛选。
- Issue 详情、活动时间线和评论。
- 当前 Thread 快速创建 Issue。
- 一个 Issue 关联多个 Codex Thread，并设置主 Thread。
- 从 Issue 打开关联 Thread。

### Codex 注入

- 启动或连接带 CDP 的 Codex 桌面端。
- 默认 CDP 端口 `9229`。
- 只选择 Codex 主渲染器。
- 排除 `global-dictation`、`avatar-overlay` 和没有主导航的辅助渲染器。
- 在左侧导航挂载 Better Codex 入口。
- 在主内容区直接挂载原生 DOM 任务面板，不覆盖原生数据和本地文件。
- Codex 页面重载、项目切换和渲染器重建后自动协调注入状态。
- 注入器退出后可以再次连接，不产生重复入口。
- `eject` 完整移除新文档脚本、入口、面板、样式和全局状态。

### CLI

```text
better-codex version
better-codex service install|uninstall|start|stop|restart|status|logs
better-codex start|stop|status
better-codex inject|eject
better-codex project list|get|create|update
better-codex issue list|get|create|update|status|search
better-codex issue comment list|add
better-codex issue thread list|link|unlink|open
better-codex doctor
```

## 本阶段不包含

- 自动启动 Codex Agent 执行 Issue。
- Agent Profile、任务指派和多 Agent 调度。
- worktree 自动创建。
- Agent 评论触发和 Session 恢复。
- 独立浏览器产品体验。
- 大规模视觉重新设计。

## 实现架构

```text
Codex 主渲染器
  │
  ├── 原生左侧导航入口
  └── 原生 DOM 任务面板
        ├── 读取当前 project/workspace/thread
        ├── 复用 Codex 按钮、布局类名和主题变量
        └── 调用原生 Thread 导航
             │ HTTP
             ▼
       127.0.0.1:{runtime-port}
       Better Codex Runtime
        ├── HTTP API
        └── SQLite
```

Runtime 负责数据和状态。注入层负责最小界面、宿主上下文和原生导航，不提供独立网页。

## 数据模型

### `schema_migrations`

- `version`
- `applied_at`

### `projects`

- `id`
- `identifier_prefix`
- `name`
- `workspace_path`
- `default_branch`
- `created_at`
- `updated_at`

### `issues`

- `id`
- `identifier`
- `project_id`
- `parent_issue_id`
- `title`
- `description`
- `status`
- `priority`
- `labels_json`
- `sort_order`
- `pinned`
- `archived_at`
- `version`
- `created_at`
- `updated_at`

### `issue_threads`

- `id`
- `issue_id`
- `codex_thread_id`
- `workspace_path`
- `project_context`
- `is_primary`
- `linked_at`
- `last_opened_at`

同一个 `codex_thread_id` 在一个 Project 内只能关联一次；一个 Issue 只能有一个主 Thread。

### `comments`

- `id`
- `issue_id`
- `author_type`
- `author_id`
- `body`
- `parent_id`
- `codex_thread_id`
- `created_at`
- `updated_at`

第一阶段只创建 `human` 和 `system` 作者，第二阶段增加 `agent`。

### `activity_events`

- `id`
- `issue_id`
- `actor_type`
- `actor_id`
- `kind`
- `payload_json`
- `created_at`

## 状态与事务规则

- Issue 更新必须携带当前 `version`。
- 版本不一致返回冲突，不静默覆盖。
- Issue 状态、排序或 Thread 关联变化与对应 Event 在同一事务提交。
- `done` 和 `canceled` 不删除 Issue，只从默认活动视图隐藏。
- 归档与删除分离；本阶段不提供永久删除入口。

## API 边界

```text
GET    /health
GET    /api/bootstrap
GET    /api/projects
POST   /api/projects
PATCH  /api/projects/:id
GET    /api/board
GET    /api/issues/:id
POST   /api/issues
PATCH  /api/issues/:id
GET    /api/issues/:id/comments
POST   /api/issues/:id/comments
GET    /api/issues/:id/threads
POST   /api/issues/:id/threads
DELETE /api/issues/:id/threads/:threadId
POST   /api/issues/:id/threads/:threadId/open
```

- `bootstrap` 一次返回面板启动所需的 Project 和状态。
- `board` 支持 Project、状态、优先级、标签、置顶、归档和文本搜索条件。
- 所有写接口使用相同的输入 schema、领域服务和 Event 规则。

## Codex 上下文

注入面板直接从 Codex 主渲染器读取当前 Project、workspace 和 Thread 标识。打开 Thread 时优先点击 Codex 原生侧边栏节点，找不到节点时才调用现有路由消息。注入层不开放任意 CDP 执行入口。

## 初版界面

第一阶段以 Better Codex 的已验证形态为基础：

- 左侧导航增加“任务面板”入口。
- 主区使用 Linear 风格 Project Header、筛选和横向 Kanban。
- 卡片显示 identifier、标题、优先级、标签和关联 Thread 标记。
- Issue 详情采用主内容、活动时间线、评论和右侧属性布局。
- 当前对话存在时提供“关联当前对话”和“从当前对话创建 Issue”。
- 保留 Codex 原生返回、项目切换和导航行为。

本阶段只完成清晰、稳定和可用，不进行品牌动画、复杂主题和高级密度设置。

## CLI 安装与生命周期

发布安装路径：

```text
curl -fsSL https://raw.githubusercontent.com/Ericwong5021/better-codex/main/scripts/install.sh | bash
```

安装器：

- 下载匹配架构的单文件 CLI 并校验 SHA-256。
- 创建 `~/.better-codex` 数据、日志、运行和备份目录。
- 注册并启动 launchd Runtime 用户服务。
- 从 `runtime.json` 读取动态端口并验证 `/health` 的 PID 与实例 ID。
- 不要求用户预装 Node 或 npm。

`better-codex doctor` 至少报告：

- Better Codex 版本和构建版本。
- Runtime PID、监听地址、数据库版本和日志路径。
- Codex CLI 路径和版本。
- Codex App 路径、进程和 CDP 端口。
- 主渲染器、入口和 DOM 面板状态。
- 当前数据库备份状态。

## 安全实现

- Runtime 拒绝非回环连接。
- Host 和 Origin 使用允许列表，不返回通配 CORS。
- Runtime 启动时生成随机会话凭据。
- 注入凭据不写数据库和日志。
- CDP WebSocket 只连接回环地址。
- 注入器不读取任务面板所需范围之外的对话内容。
- `better-codex inject --launch` 遇到已运行且未开放 CDP 的 Codex 时返回错误，不终止用户进程。

## 目标文件边界

```text
package.json
tsconfig.json
src/db.ts
src/server.ts
src/dom.ts
src/cdp.ts
src/cli.ts
src/service.ts
scripts/package.mjs
scripts/install.sh
```

## 实现顺序

1. 建立正式目录边界、构建入口和配置解析。
2. 建立 migration、事务和 Project/Issue/Thread/Event repository。
3. 建立领域服务、乐观锁和 API。
4. 实现原生 DOM 看板和 Thread 关联。
5. 实现主渲染器识别、注入协调和完整 eject。
6. 实现单文件打包、安装器和 launchd 生命周期。
7. 完成真实 Codex 桌面端验收。

## 验证命令

```text
npm run typecheck
npm run build
better-codex doctor
better-codex service status
better-codex status
```

## 人工验收

### 正常路径

- 从干净数据目录运行安装器，Runtime 用户服务启动成功。
- 启动带 CDP 的 Codex，注入器选择主渲染器。
- 左侧只有一个 Better Codex 入口，原生 DOM 面板加载完成。
- 从当前 Codex Thread 创建 Issue，Issue 自动关联正确 Thread 和 Project。
- 拖动卡片后刷新 Codex，状态和排序不丢失。
- 搜索标题、描述和 identifier 能定位 Issue。
- 置顶 Issue 后可以从固定视图快速找到。
- 点击 Thread 链接打开正确 Codex 对话。
- Runtime 重启后面板重新加载数据，数据不丢失。

### 错误路径

- Codex 已运行但没有 CDP 时，命令明确失败且不终止 Codex。
- CDP 首个 target 是辅助渲染器时，注入器仍选择主渲染器。
- Runtime 停止时面板显示可恢复错误，Runtime 恢复后可刷新重连。
- API 收到外部 Origin 或非回环请求时拒绝访问。
- 数据库 migration 失败时不启动写服务，原数据库和备份保持完整。
- 同一 Issue 被两个界面同时编辑时，旧版本写入得到冲突提示。

### 卸载路径

- 执行 `better-codex eject` 后，当前页面无入口、面板、样式和注入全局变量。
- 页面重新加载后不会再次注入。
- Runtime 可以独立停止，数据库保留。
- 普通方式重新打开 Codex 后界面恢复原状。

## 阶段完成标准

- 任务和 Thread 整理闭环在真实 Codex 桌面端可用。
- Runtime、SQLite、注入和 eject 均有真实运行证据。
- 关闭 Multi-Agent 相关功能不影响本阶段任何流程。
- 不需要打开独立浏览器页面即可完成主要操作。

## 回滚

- 停止 Runtime 用户服务。
- 执行完整 eject 并普通重启 Codex。
- 保留 `~/.better-codex/better-codex.db` 和备份。
- 新 migration 导致问题时恢复启动前备份，不删除原型数据库和用户任务。
