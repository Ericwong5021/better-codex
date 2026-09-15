# Plan 1.4：安装、诊断与卸载

## 目标

让 macOS 与 Windows 的陌生用户都能通过一个公开入口完成安装，并能准确知道 Better Codex 修改了什么、当前是否正常、如何关闭和如何卸载。

安装固定为：运行一行安装命令，检测系统 Node、安装或升级 Better Codex、运行 `setup`、检测 Codex、启动 Runtime、启用注入，然后在 Codex 中出现 Better Codex。用户不需要 Git、clone、build、`npm link` 或手动配置端口；缺少 Node.js 22.5 或版本过低时，安装器必须说明依赖并在取得确认后安装或升级。

安装过程必须连续展示以下状态：

```text
installing_runtime
→ starting_runtime
→ waiting_for_codex
→ injecting
→ ready
```

失败状态至少区分 `runtime_install_failed`、`runtime_start_failed`、`codex_not_found`、`codex_restart_required`、`cdp_unavailable` 和 `injection_incompatible`，并提供重试或修复入口。

## 用户命令

```text
better-codex setup
better-codex doctor
better-codex enable
better-codex disable
better-codex status
better-codex update
better-codex uninstall
better-codex data delete
```

保留已有低层命令作为高级入口，但 README 和首次使用只展示上述生命周期命令。

## 范围

- 提供不依赖 clone、build 和 `npm link` 的安装入口。
- macOS 支持 Apple silicon 与 Intel 的签名安装资产和一行 Preview 安装命令。
- Windows 支持签名安装资产、PowerShell 一行安装命令和明确的 Codex Desktop 前置条件。
- 两个平台统一使用轻量系统 Node Bundle；安装器检测 Node.js 22.5 或更高版本，并在需要变更系统依赖时取得用户确认。
- 两个平台都提供自动启动与后台生命周期，不要求终端窗口常驻。
- Runtime 只监听 `127.0.0.1`，默认使用操作系统分配的动态空闲端口，不保留固定业务端口。
- Runtime 将 PID、端口、实例 ID、版本和启动时间原子写入权限受限的 `~/.better-codex/run/runtime.json`。
- CLI 和 Injector 读取运行描述文件并通过 `/health` 校验 PID 与实例 ID，不能仅凭端口判断服务身份。
- Runtime Supervisor 是 Runtime 与 Injector 的唯一进程所有者，负责单实例、异常恢复和退出清理。
- `setup` 完成 Runtime、服务、兼容层、Codex 检测和首次注入。
- `doctor` 分别报告 core、Runtime、数据库、CDP、Codex、兼容层和注入状态。
- `disable` 关闭注入与调试生命周期，不删除任务数据。
- `uninstall` 移除程序、服务、注入状态和注册项，默认保留数据。
- `data delete` 单独列出精确目录并明确确认永久删除。

## 验收

- 干净 macOS 和 Windows 用户环境均能通过公开安装入口完成安装并在 Codex 中看到 Better Codex。
- 安装完成后无需打开仓库或运行 npm。
- 缺少合格 Node.js 时，用户能看懂原因、选择安装或取消，取消后不留下半安装状态。
- 安装完成后无需手动配置 Runtime 或 CDP 端口。
- `doctor` 能定位 Codex 未安装、未开放 CDP、Runtime 不可用、兼容层不匹配和数据库不可写。
- `disable` 后 Codex 普通启动不再开放 Better Codex 注入。
- 默认卸载后 CLI、服务、监听端口和 DOM 入口均不存在，数据库仍保留。
- 数据删除只能由独立命令完成，不能被升级或默认卸载触发。
- 任一平台未通过安装、升级、禁用和卸载验收时，Plan 1.4 不完成。

## 回滚

安装和升级失败时保留旧程序与数据；卸载不成功时 `doctor` 列出剩余进程、文件和注册项。

## 当前进度

截至 2026-08-11 已完成：

- Better Codex Runtime 命名和 `com.better-codex.runtime` macOS 用户服务标识。
- 动态回环端口、`runtime.json`、实例身份校验和单实例锁。
- Runtime Supervisor 管理 Injector，Injector 崩溃后自动重启，Runtime 停止后清理运行状态。
- 注入层检测 Runtime 端口变化并重新注入新端点。
- 兼容清理旧 `com.better-codex.gateway` launchd 服务。
- `setup`、`doctor`、`enable`、`disable`、`status`、`update`、`uninstall` 和 `data delete` 生命周期命令。
- Stable 与 Preview 双更新通道、版本隔离、签名校验、更新暂存、激活和回滚。
- Apple silicon、Intel macOS 与 Windows Preview 发布资产和一行安装入口。
- Windows 系统 Node Bundle、Node 版本检测和需确认的依赖安装流程。
- Stable、Preview 与开发实例使用隔离目录，并能交接当前 Codex 注入所有权。

仍需完成：

- 在真实 Apple silicon、Intel macOS 和 Windows 用户环境完成 Preview 安装与重装验收。
- 分别验证从旧独立可执行版本迁移到系统 Node Bundle 的成功、取消和回滚路径。
- 验证慢网络、Codex 未关闭、WindowsApps 伪路径、权限不足和下载损坏时的可执行提示。
- 验证 Stable 与 Preview 相互切换时数据库、更新通道和注入所有权保持正确。
- 将 Preview 中已验证的安装链路晋升到 Stable，并保留可靠降级路径。

在上述路径通过 macOS 与 Windows 真实安装验收前，Plan 1.4 保持进行中；CI 安装测试和发布资产存在不能代替目标机器验收。
