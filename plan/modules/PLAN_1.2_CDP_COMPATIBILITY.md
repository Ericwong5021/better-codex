# Plan 1.2：CDP 兼容适配层

## 目标

把容易随 Codex 更新变化的 target 识别、DOM 选择器、导航和注入逻辑集中到独立兼容层，使 Codex 更新不会迫使整个产品同步重构。

## 方案

兼容层由版本化 manifest 和注入资源组成：

```text
CLI / Runtime
  └── Compatibility Loader
        ├── target rules
        ├── DOM capabilities
        ├── selectors and navigation
        └── injected UI resource
```

核心程序只提供 CDP 连接、签名校验、生命周期和本地 API；兼容层负责宿主识别与 DOM 行为。

## 范围

- 探测 Codex App 版本、平台、renderer 和所需 DOM capability。
- 用 capability 判断代替单一固定选择器判断。
- 将 target 规则、选择器、导航策略和注入版本集中管理。
- 保存当前兼容层版本、支持的 Codex 版本范围和最近成功状态。
- 不兼容时停止注入并展示诊断，不盲目执行未知 DOM 操作。
- `disable` 完整移除新文档脚本、DOM、样式和守护进程。

## 不包含

- 在线下载和升级协议，由 Plan 1.3 负责。
- 绕过非本地安全边界或开放任意 CDP 执行接口。
- 读取完成任务关联所不需要的对话正文。

## 验收

- 主 renderer 与辅助 renderer 能稳定区分。
- Codex 页面重载、项目切换和 renderer 重建后只存在一个入口。
- 修改一个兼容规则不需要修改数据库和领域服务。
- 模拟缺少关键 DOM capability 时停止注入，Runtime 和 CLI 仍可使用。
- `disable` 后当前页面和重载页面均无 Better Codex 残留。

## 最脆弱假设

本计划假设 Codex Desktop 继续提供本地 CDP 启动能力。如果该能力消失，注入功能停止，但 Runtime、SQLite、CLI 和用户数据继续可用，并转入 Plan 4.2 的独立界面。

## 回滚

切回上一个已验证兼容层；不回滚数据库，不删除用户数据。

## 当前进度

实现已完成：

- 建立版本化 bundled compatibility manifest，集中管理平台、target 规则、DOM selectors、attributes 和 Thread 导航策略。
- CDP 核心只负责连接、页面生命周期和脚本执行，不再直接持有 Codex DOM 规则。
- 注入前探测 Codex 版本、renderer 和 sidebar/content/thread/project capabilities。
- 缺少必需 capability 时返回 `codex_incompatible_*` 并停止注入，不回退到未知 renderer。
- 兼容版本、支持策略、Codex 版本、capability、最近检查和最近成功时间写入 `~/.better-codex/compatibility/status.json`。
- Runtime `/health` 和 CLI `status` 返回兼容状态。
- `enable` 与 `disable` 使用持久化注入状态；禁用后 Runtime Supervisor 不再重启 Injector。
- `disable` 在 renderer 已不兼容时仍可直接清理候选页面的新文档脚本和 DOM 状态。

已验证：

- TypeScript 构建和现有测试通过。
- 发布包包含 compatibility 与 injection state 模块。
- 隔离 Runtime 中禁用后 Injector 不会被 Supervisor 重新拉起，禁用状态与兼容状态正确保留。
- macOS Codex `26.730.61639` 完成真实客户端重启和首次注入。
- 主 renderer 四项 capability 通过，`avatar-overlay` 辅助 renderer 未注入。
- 入口、样式和面板均保持单实例，面板通过 CDP Runtime Binding 正常读取本地 Runtime 数据，不依赖 Codex `connect-src` CSP。
- 页面重载后 Injector 自动恢复 binding、入口和面板；项目切换后保持单实例并恢复原项目。
- `disable` 后当前页面无入口、面板、样式和全局注入状态，页面再次重载仍无残留。
- 验收结束后 Runtime、Injector 和调试端口均已停止，Codex 已恢复普通启动。

待验收：

- Windows 验证真实 Codex 主 renderer、辅助 renderer、页面重载、项目切换和 renderer 重建。
- Windows 确认 `disable` 后当前页面和重载页面均无入口、面板、样式和新文档脚本残留。

Plan 1.2 当前为代码完成、macOS 验收通过、Windows 验收中；Windows 真实环境证据齐全后正式完成。
