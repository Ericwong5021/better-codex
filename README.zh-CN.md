<p align="center">
  <img src="assets/better-codex.png" width="560" alt="Better Codex" />
</p>

<p align="center">
  <strong>让 Codex 里的工作持续推进。</strong>
</p>

<p align="center">
  管理任务、回到对应的对话，并把工作指派给不同 Agent，全程无需离开 Codex 桌面端。
</p>

<p align="center">
  <a href="https://github.com/Ericwong5021/better-codex/releases/latest"><img alt="Release" src="https://img.shields.io/github/v/release/Ericwong5021/better-codex" /></a>
  <a href="https://github.com/Ericwong5021/better-codex/stargazers"><img alt="Stars" src="https://img.shields.io/github/stars/Ericwong5021/better-codex" /></a>
  <a href="https://github.com/Ericwong5021/better-codex/releases"><img alt="Downloads" src="https://img.shields.io/github/downloads/Ericwong5021/better-codex/total" /></a>
  <a href="https://github.com/Ericwong5021/better-codex/actions/workflows/ci.yml"><img alt="Build" src="https://img.shields.io/github/actions/workflow/status/Ericwong5021/better-codex/ci.yml?branch=main&label=build" /></a>
  <img alt="macOS" src="https://img.shields.io/badge/macOS-Apple%20Silicon%20%7C%20Intel-black?logo=apple" />
  <img alt="Windows" src="https://img.shields.io/badge/Windows-x64-0078D4?logo=windows11" />
</p>

<p align="center">
  <a href="README.md">English</a> · 简体中文
</p>

Better Codex 是 Codex 桌面端的本地工作流扩展。它在 Codex 侧边栏中加入任务和项目管理，任务数据保存在本地 SQLite 数据库中。

<p align="center">
  <img src="assets/better-codex-board.png" width="1200" alt="Better Codex 在 Codex 桌面端中运行" />
</p>

## 快速使用

### macOS

支持 Apple Silicon 和 Intel Mac。

```bash
curl -fsSL https://raw.githubusercontent.com/Ericwong5021/better-codex/main/scripts/install.sh | bash
```

### Windows

请使用 Microsoft Store 版本的 Codex，然后在 PowerShell 中运行：

```powershell
irm https://raw.githubusercontent.com/Ericwong5021/better-codex/main/scripts/install.ps1 | iex
```

安装过程中 Codex 会重启，请先保存当前工作，确保关键进度不会丢失。

安装完成后，Codex 侧边栏会出现两个新入口：

- `Better Codex`：打开任务和项目界面。
- `智能体`：打开 Profile Agent 管理界面。

安装程序也会配置支持注入的启动入口：

- macOS：在 `/Applications` 创建 `Better Codex Launcher.app`，可将它固定到 Dock；以后请从该入口启动 Codex。
- Windows：将当前用户桌面、开始菜单和任务栏中的 Codex 快捷方式改为通过 Better Codex 启动。原快捷方式配置会被备份，并在卸载时恢复。

如果 Codex 已经以不支持注入的方式运行，从这些入口再次启动会先退出并重新启动 Codex，请先保存正在进行的工作。

## 当前功能

| 模块 | 功能 |
| --- | --- |
| 任务和项目 | 创建项目和任务，设置优先级，搜索、筛选、置顶、归档，并在不同状态之间移动任务卡片。 |
| Codex 对话 | 从当前对话创建任务，也可以从任务卡片重新打开关联的对话。 |
| Profile Agent | 创建带有独立描述、开发者指令、模型和推理等级的 Agent，并把任务指派给它。 |
| 执行状态 | 查看任务正在等待 Session、执行中、审核中、已完成、已阻塞或已取消。 |
| 本地数据 | 使用本地 SQLite 保存项目、任务、Agent 指派和运行状态，无需注册 Better Codex 账号。 |
| 版本更新 | 通过 Codex 内的更新提示安装带签名的更新，也可以重新运行安装命令完成升级。 |

## 基本流程

1. 从 Codex 侧边栏打开 `Better Codex`。
2. 创建项目，并添加一个任务。
3. 把任务关联到 Codex 对话，或者直接从当前对话创建任务。
4. 随着工作推进移动任务卡片。
5. 打开任务，回到对应的 Codex 对话。
6. 需要特定角色或配置时，把任务指派给对应的 Profile Agent。

这套流程可以用于编程、调研、写作、资料整理、数据收集，以及其他已经在 Codex 中完成的工作。

## 版本更新

再次运行安装命令即可升级。Better Codex 会优先升级现有运行时，需要时自动执行完整安装。

从 v0.3.7 开始，Better Codex 会在后台检查带签名的更新清单。发现新版本后，Codex 内会显示更新提示，安装完成后自动重启 Codex。

## 数据与隐私

| 平台 | 数据库路径 |
| --- | --- |
| macOS | `~/.better-codex/better-codex.db` |
| Windows | `%USERPROFILE%\.better-codex\better-codex.db` |

Better Codex 运行时只监听 `127.0.0.1`。它不依赖 Better Codex 云端服务，也不会向此类服务上传任务内容。

## 常用命令

检查运行时、数据库、Codex 兼容性和注入状态：

```bash
better-codex doctor
```

查看当前服务与看板连接：

```bash
better-codex status
```

重新配置或检查系统启动入口：

```bash
better-codex launcher install
better-codex launcher status
```

移除侧边栏入口，同时保留任务数据：

```bash
better-codex eject
```

## 从源码安装

请先安装 Node.js 22.5 或更新版本，然后运行：

```bash
git clone https://github.com/Ericwong5021/better-codex.git
cd better-codex
npm ci
npm run build
npm link
better-codex inject --launch
# 创建 Better Codex Launcher.app 启动快捷方式
better-codex launcher install
```

## 兼容性

Better Codex 支持 macOS 版 Codex 桌面端，以及 Windows 上通过 Microsoft Store 安装的 Codex。它依赖桌面应用的本地 CDP 接口和页面结构，因此部分 Codex 更新可能需要 Better Codex 跟进适配。

Release 安装包和 CI 检查覆盖 Apple Silicon、Intel Mac 和 Windows x64。

## 社区

请通过 [GitHub Issues](https://github.com/Ericwong5021/better-codex/issues) 提交问题和功能建议，通过 [GitHub Discussions](https://github.com/Ericwong5021/better-codex/discussions) 交流问题和工作流想法。

请在 GitHub 的公开讨论中使用英文，方便所有人阅读和参与。
