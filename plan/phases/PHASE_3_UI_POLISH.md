# Phase 3：UI 与安装体验打磨

## 阶段目标

在 Phase 1 和 Phase 2 的领域模型稳定后，把 Better Codex 打磨成与 Codex 桌面端自然融合、接近 Linear 信息组织效率的日常工具。

本阶段不重写 Runtime 和调度模型，重点是信息架构、交互速度、视觉一致性、可访问性、性能和安装体验。

## 用户结果

- Better Codex 在 Codex 中看起来像原生工作区，而不是临时嵌入网页。
- 用户可以快速找到“我的任务、正在运行、等待审核、阻塞、最近对话”。
- Issue、Agent、Run 和 Thread 之间的关系一眼可见。
- 键盘、搜索、筛选和批量操作足以支撑日常使用。
- 安装、更新、诊断和卸载不需要理解内部端口和进程。

## 本阶段范围

### 信息架构

- Codex 左侧保留一个稳定的 Better Codex 入口。
- Better Codex 内部提供 Project、My Issues、Active Runs、Review、Blocked 和 Agents 导航。
- Board 与 List 是同一 Issue 集合的两个视图。
- 全局搜索覆盖 identifier、标题、描述、标签、评论、Agent 和 Thread ID。
- 最近访问、置顶 Issue 和最近 Thread 提供快速入口。
- Issue 详情集中显示任务、讨论、运行证据和交付动作。

### 看板与列表

- Linear 风格紧凑卡片、列头、数量、优先级和 Agent 头像。
- 横向滚动、拖拽反馈、同列排序和跨列移动。
- 列折叠、隐藏已完成、筛选条件持久化。
- List 视图支持状态、优先级、Agent、Project、更新时间和手动排序。
- 批量修改状态、优先级、标签和 Assignee。
- 500 个活动 Issue 下仍保持可用滚动和搜索响应。

### Issue 详情

- 标题、描述和验收要求位于主内容区。
- 状态、优先级、Project、Assignee、标签、依赖和父子关系位于属性区。
- Activity、Comment、Agent Trigger 和 Run Event 使用统一时间线。
- 每个 Run 显示 Agent、Profile、Thread、worktree、耗时、状态和摘要。
- 文件变化、命令结果和最终消息可以展开查看。
- `Open Thread`、`Continue`、`Request Changes`、`Approve` 和 `Handoff` 是明确动作。

### Agent 视图

- Agent 头像、Profile、健康状态和当前 Issue。
- 当前 Run、排队 Trigger、并发占用和最近错误。
- Profile 无效、Codex 未登录、等待人工和 offline 使用不同状态。
- 不在 UI 中复制完整 `config.toml` 编辑器；配置仍由 Codex 管理。

### Codex 原生融合

- 复用 Codex 的布局节奏、浅色和深色主题变量。
- 保持 Codex 原生返回、前进、项目切换和窗口行为。
- Better Codex 面板聚焦时不劫持 Codex 全局快捷键。
- Codex 切换项目和 Thread 时，Better Codex 当前上下文增量更新。
- Better Codex 页面刷新、Runtime 重启和渲染器重建后恢复上次视图。

### 安装与运维体验

- `better-codex setup` 提供单一安装流程和清晰结果。
- `better-codex update` 更新 CLI、Runtime 和前端资源，并保留数据库。
- `better-codex doctor` 输出可读摘要和 `--output json`。
- `better-codex runtime logs -f` 支持实时日志。
- `better-codex status` 分别显示 Runtime、CDP、主渲染器、入口和面板。
- `better-codex uninstall` 默认只移除服务、CLI 注册、Skill 和注入状态，保留数据。
- 永久删除 `~/.better-codex` 必须使用单独的显式数据删除命令，本阶段不自动执行。

## 本阶段不包含

- 新的 Agent 调度语义。
- 云端账号、同步、通知和远程访问。
- 移动端布局。
- 通用工作流编辑器。
- 独立 Web UI 的完整浏览器导航。

## 设计系统

### 视觉原则

- 信息密度接近 Linear，容器和装饰保持克制。
- 状态颜色只用于状态和风险，不作为大面积背景。
- Agent 颜色用于身份，不与 Issue 状态颜色混用。
- 命令、Thread ID、Run ID 和路径使用等宽字体。
- 错误、阻塞、等待人工和执行中必须依靠图标、文案和颜色共同表达。

### 布局

```text
Codex Sidebar
  └── Better Codex

Better Codex Main
  ├── Top Bar：Project / Search / Quick Create / Runtime Status
  ├── View Tabs：My Issues / Board / Active / Review / Blocked / Agents
  └── Content
       ├── Board 或 List
       └── Issue Detail / Agent Detail / Run Detail
```

### 交互

- `Cmd+K` 打开 Better Codex 搜索与命令面板。
- `C` 快速创建 Issue，但输入框聚焦时不触发。
- `Esc` 逐级关闭弹层、详情和 Better Codex 面板。
- 拖拽开始后固定卡片宽度和滚动容器。
- 乐观更新失败时恢复原位置并显示冲突原因。
- 所有 destructive 操作需要明确确认和可见目标。

### 空状态和故障状态

- 没有 Project：引导创建或绑定当前 Codex workspace。
- 没有 Issue：提供从当前 Thread 创建入口。
- Runtime 不可用：显示恢复按钮和日志入口。
- 注入 Bridge 不可用：保留任务操作，禁用原生 Thread 跳转。
- Agent Profile 无效：显示诊断结果，不允许进入 `ready`。
- Run lost：显示保留的 worktree 和恢复选择。

## 性能边界

- 前端初次加载只请求 bootstrap 和当前视图数据。
- SSE 事件增量更新本地缓存，不因每个事件全量刷新 Board。
- 搜索输入使用本地 debounce，服务端查询可以取消。
- 长 Activity 和 Run Event 列表使用窗口化渲染。
- 500 个活动 Issue 的 Board 可以滚动、筛选和拖拽。
- 10 个同时运行的 Run 持续输出时，界面仍能打开 Issue 和切换视图。
- 后台标签停止高频动画，避免无意义 CPU 占用。

## 可访问性

- Board、List、Dialog、Menu 和 Tabs 有明确语义与焦点顺序。
- 关键操作支持键盘完成。
- 焦点进入和离开 Better Codex 面板时状态可见。
- 状态不只依赖颜色。
- 文本和图标在浅色、深色主题下满足清晰可读。
- 动画遵守系统减少动态效果设置。

## 安装设计

开发和本地使用流程固定为：

```text
curl -fsSL https://raw.githubusercontent.com/Ericwong5021/better-codex/main/scripts/install.sh | bash
better-codex service status
better-codex status
```

升级流程固定为：

```text
better-codex update
better-codex doctor
```

卸载分为两个动作：

```text
better-codex uninstall
better-codex data delete
```

- `better-codex uninstall` 可恢复，保留 SQLite、备份、评论和 Run 历史。
- `better-codex data delete` 是独立破坏性操作，列出精确目录并要求明确确认。
- UI、Skill、CLI、Runtime 和 DOM 注入在状态页分别展示，不能把其中一个成功称为全部安装成功。

## 目标文件边界

```text
web/src/app/
web/src/components/
web/src/features/issues/
web/src/features/agents/
web/src/features/runs/
web/src/styles/
web/src/host/
src/cli/commands/setup.ts
src/cli/commands/update.ts
src/cli/commands/doctor.ts
src/cli/commands/uninstall.ts
src/runtime/status.ts
inject/
scripts/package.ts
```

本阶段不修改 `src/core/dispatch.ts` 的既有调度规则，除非真实 UI 验收发现领域层违反已批准状态机。

## 实现顺序

1. 固化页面层级、导航、快捷入口和响应状态。
2. 打磨 Board、List、筛选、搜索和批量操作。
3. 打磨 Issue Detail、Activity、Comment、Run 和 Review。
4. 打磨 Agent 和 Active Runs 视图。
5. 统一主题、字体、状态、空状态和错误状态。
6. 优化 SSE 缓存、长列表和高频 Run 输出性能。
7. 完成键盘、焦点和可访问性。
8. 完成 setup、update、doctor 和 uninstall 体验。
9. 在真实 Codex 浅色和深色主题中完成视觉验收。

## 验证命令

```text
npm run typecheck
npm run build
better-codex doctor
better-codex runtime status
better-codex codex status
```

## 人工验收

### 日常任务路径

- 在 Codex 中通过快捷入口创建、搜索、置顶和打开 Issue。
- Board 和 List 使用同一筛选条件并保持当前 Project。
- 从 Issue 打开正确 Thread，返回 Better Codex 后仍在原位置。
- 键盘完成搜索、创建、打开详情和关闭详情。

### 多 Agent 路径

- 同时观察多个 Agent Run，不发生整页闪烁和滚动跳动。
- `awaiting_human`、`blocked`、`failed` 和 `lost` 可以快速区分。
- Review 页面能看到足够证据决定批准或要求修改。
- Handoff 路径和父子 Issue 进度可读。

### 兼容与性能路径

- Codex 浅色和深色主题下界面清晰。
- 500 个活动 Issue 下搜索、筛选和拖拽可用。
- 10 个 Run 输出事件时可以正常切换页面。
- Runtime 重启和 Codex 渲染器重建后恢复上次视图。
- Better Codex 面板聚焦不破坏 Codex 原生快捷键和输入。

### 安装路径

- 从已构建仓库完成全新安装、诊断、启动和注入。
- 更新后数据库和 UI 状态保留。
- 默认卸载后 Codex 恢复原状，用户数据仍存在。
- Skill、CLI、Runtime、CDP 和 DOM 状态分别验证。

## 阶段完成标准

- 用户可以把 Better Codex 作为日常 Codex 工作入口，而不是演示页面。
- UI 与安装体验不要求用户理解 Runtime、SSE、CDP 或数据库细节。
- Phase 1 和 Phase 2 的所有核心流程保持可用。
- 真实 Codex 桌面端的视觉、交互、性能和卸载均通过人工验收。

## 回滚

- UI 资源使用版本化构建目录，更新失败时回到上一个完整构建。
- 数据库 migration 不与纯 UI 发布绑定。
- 安装器更新失败时保留旧 CLI、Runtime 和数据。
- 视觉版本回滚不改变 Issue、Agent、Run 和 Event schema。
