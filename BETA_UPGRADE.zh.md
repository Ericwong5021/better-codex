# Better Codex Beta 升级指南

<p align="center">
  <a href="BETA_UPGRADE.md">English</a> · 简体中文
</p>

本指南适用于已经完整发布到签名 Preview 更新源的 Beta 版本。只有 Git Tag 或草稿 Release 时，客户端还不一定能够安装该版本。

## 先确认升级对象

本机和远程服务需要分别升级：

| 从哪里发起更新 | 会升级什么 | 不会升级什么 |
| --- | --- | --- |
| 本机 Codex 客户端内的 Better Codex | 本机 CLI、Runtime、Skill、MCP 集成、启动入口和页面集成 | VPS Relay 和远程 Web UI |
| 公网浏览器里的 Better Codex | VPS Relay 和远程 Web UI | 本机 Runtime 和本机安装组件 |

本机 Runtime 始终是项目、Issue、Agent、会话、附件和运行数据的唯一所有者。Relay 只保存认证、Web 会话、设备、设置和审计记录，不保存 Better Codex 业务数据。

启用了远程访问时，需要完成两侧升级，并确认 Runtime 与 Relay 最终运行同一个目标 Beta 版本。

## 升级前检查

- 等待维护者确认签名 Preview 更新源和 Release 资产已经完整发布。
- 记录完整目标版本，例如 `vX.Y.Z-beta.N`。
- 升级本机时保持 Codex 打开，在线升级 Relay 时保持浏览器页面打开。
- 日常升级前先处理存储空间警告；低于关键保留空间时，系统会阻止更新进入暂存阶段。
- 不要通过卸载或删除 `~/.better-codex`、`%USERPROFILE%\.better-codex`、`/opt/better-codex`、Relay 数据卷或密钥来完成升级。

## 首次加入 Beta 通道

### 本机安装

macOS：

```bash
curl -fsSL https://raw.githubusercontent.com/Ericwong5021/better-codex/main/scripts/install-beta.sh | bash
```

Windows PowerShell：

```powershell
irm https://raw.githubusercontent.com/Ericwong5021/better-codex/main/scripts/install-beta.ps1 | iex
```

Beta 安装器会选择 `preview` 通道并原地升级现有安装，已有配置和本地任务数据库都会保留。

### 现有 Relay 仍是稳定版

Relay 根据服务器上已经安装的版本选择更新通道。稳定版 Relay 只检查 Stable 更新源，不会在 Web UI 中提示 Beta。

按照[自托管运行手册](SELF_HOSTING.md)验证目标 Release 及其 `selfhost.sh`、`checksums.txt`、`checksums.sig`、`update-public-key.pem` 和 `source-commit.txt`，然后把现有 VPS 部署升级到指定 Beta：

```bash
sudo env BETTER_CODEX_SELFHOST_DIR=/opt/better-codex \
  bash /opt/better-codex/scripts/selfhost.sh upgrade vps vX.Y.Z-beta.N
```

如果部署目录不是 `/opt/better-codex`，请替换为实际绝对路径。Relay 进入 Beta 后，后续在线更新会跟随 Preview 更新源。

## 升级现有 Beta 安装

### 升级 VPS Relay 和远程 Web UI

启用了远程访问时，建议先升级 VPS 服务：

1. 登录公网 Better Codex Web UI。
2. 打开 `更多` → `远程访问`。
3. 在服务版本旁点击`检查升级`或`升级`。
4. 保持页面打开，等待服务验证 Release、备份认证数据库、重新构建、重启并执行健康检查。
5. 等待页面显示`远程服务升级完成`，确认服务版本与目标 Beta 一致。

Relay 重启时，公网页面可能短暂断开。已经在本机 Runtime 中运行的工作会继续，但 Relay 恢复并重新连接 Runtime 前，公网浏览器无法发送新请求。

如果页面提示无法在线安装、Relay 仍在 Stable 通道，或者在线升级失败，请使用上一节的精确版本 VPS 命令。自托管升级流程会保留部署模式和密钥，创建数据库备份，检查目标版本，并在验证失败时恢复上一版本。

### 升级本机 Runtime

在本机 Codex 客户端中看到更新提示后点击`立即更新`。也可以进入`帮助与设置` → `关于` → `检查新版本`手动检查。

命令行升级方式：

```bash
better-codex version
better-codex update channel preview
better-codex update check
better-codex update
```

Runtime 激活新版本时会暂停新任务分发，兼容的活动会话继续由 Session Host 和 Codex App Server 执行。新 Runtime 完成交付重放、状态校准和就绪检查后，新任务才会开始。页面明确显示更新完成前，请保持 Codex 打开。

安装成功后，如果页面集成没有自动刷新，请通过 Better Codex 启动入口重新打开 Codex。Skill 和 MCP 安装本身不需要重启 Codex。

## 验证升级结果

检查本机安装：

```bash
better-codex version
better-codex doctor
better-codex status
better-codex mcp status
better-codex launcher status
```

启用了远程访问时，将 `relay.example.com` 替换为 Relay 公网域名，然后继续执行：

```bash
better-codex relay status
better-codex relay doctor
curl -fsSL "https://relay.example.com/healthz"
curl -fsSL "https://relay.example.com/readyz"
```

完整验收需要满足以下条件：

- 本机 Runtime 和 VPS Relay 都报告目标 Beta 版本。
- `better-codex relay status` 显示 `connected: true` 和 `last_error: null`。
- Runtime 与 Relay 都报告 `relay/v1`，连接身份信息一致且心跳时间有效。
- 公网 `/healthz` 显示 `ok: true`、`name: "Better Codex Relay"` 和目标版本。
- 公网 `/readyz` 显示 `ok: true`、`runtime_ready: true`、健康的存储与数据库状态，以及有效的 Runtime 心跳。
- 登录后的浏览器能够打开看板，并完成一次真实的鉴权读取和写入操作。

如果 Relay 升级后浏览器仍显示旧页面，可以为 `/web` 增加一次版本查询参数后重新加载，例如 `/web?v=X.Y.Z-beta.N`。

## 升级失败时

Release 已发布、更新请求已接受、进程健康或登录页面可见，都不能单独证明升级已经完成。

本机升级失败时，保留当前安装并收集：

```bash
better-codex version
better-codex doctor
better-codex status
better-codex service status
better-codex service logs --lines 100
better-codex relay status
```

反馈中需要包含操作系统、架构、Codex 版本与分发渠道、目标 Better Codex 版本、完整错误、复现步骤和脱敏后的诊断结果。如果页面显示已经恢复上一版 Runtime，请先确认当前安装版本和实际服务版本，再决定是否重试。

Relay 升级失败时，保留备份、当前代码签出、Compose 模式、代理配置、数据卷和更新器状态，按照 [SELF_HOSTING.md](SELF_HOSTING.md) 的恢复说明排查。不要把 `docker compose down -v` 当作常规恢复命令。

## 返回 Stable 更新通道

将本机更新通道切回 Stable：

```bash
better-codex update channel stable
```

切换通道不会自动把较新的 Beta 降级。只有正式版签名资产完整发布后，才能安装指定 Stable 版本。Beta Relay 也需要通过精确版本 VPS 升级回到 Stable，之后才会重新跟随 Stable 更新源。
