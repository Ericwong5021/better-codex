<p align="center">
  <img src="assets/better-codex.png" width="132" alt="Better Codex" />
</p>

<h1 align="center">Better Codex</h1>

<p align="center">
  <strong>把 Codex 对话，变成能持续推进的工作。</strong>
</p>

<p align="center">
  直接运行在 Codex Desktop 里的本地任务看板与智能体工作流。
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

Better Codex 给 Codex Desktop 补上了一条真正能推进工作的闭环：把当前对话收进任务，在看板上持续推进，交给一个明确负责人，并在需要判断时回到原始对话继续处理。

它不是另一个需要维护的 Web 工作台。任务看板、智能体配置、执行状态和人工审核都在 Codex 里面。

<p align="center">
  <img src="assets/better-codex-board.png" width="1200" alt="Codex Desktop 中的 Better Codex 任务看板" />
</p>

## Better Codex 的产品特色

| | 能力 | 带来的变化 |
| --- | --- | --- |
| **01** | 对话与任务双向关联 | 从当前 Codex 对话创建任务，也能从任务重新打开对应会话。上下文始终跟着工作走。 |
| **02** | 一眼看清全部进度 | 按项目、状态、优先级、标签和负责人管理任务。拖动卡片即可推进，并清楚看到等待中、执行中、审核中、已阻塞和已完成的工作。 |
| **03** | 可复用的智能体配置 | 为代码审查、前端实现、问题排查等角色分别设置指令、模型、推理等级和头像。每个任务仍然只有一个明确负责人。 |
| **04** | 手动运行与自动运行 | 你可以亲自决定每次何时开始，也可以让自动运行领取已经就绪的智能体任务。遇到审核、决策或阻塞时，控制权会回到你。 |
| **05** | 本地优先 | 项目、任务、负责人和运行状态保存在本机 SQLite 数据库，不需要注册 Better Codex 账号，也不依赖托管任务服务。 |

<p align="center">
  <img src="assets/better-codex-agents.png" width="1200" alt="Better Codex 中可复用的智能体配置" />
</p>

## 安装

### macOS

支持 Apple Silicon 和 Intel Mac。

```bash
curl -fsSL https://raw.githubusercontent.com/Ericwong5021/better-codex/main/scripts/install.sh | bash
```

### Windows

支持 Windows x64 与 Microsoft Store 版本的 Codex。请在 PowerShell 中运行：

```powershell
iex (iwr -UseBasicParsing -Headers @{'Cache-Control'='no-cache'} https://raw.githubusercontent.com/Ericwong5021/better-codex/main/scripts/install.ps1).Content
```

PowerShell 的 `irm` 可能缓存旧安装脚本；加上 `Cache-Control` 可强制拉取最新脚本，并由脚本解析 GitHub 最新 release。

安装程序会下载对应版本、校验 SHA-256、安装本地运行时、配置 Codex 集成，并确认安装结果。

如果 Codex 正在运行，安装程序会先征求关闭许可。继续前请保存当前工作。

安装完成后：

- Codex 侧边栏会出现 `Better Codex`，用于管理任务和项目。
- 侧边栏会出现 `智能体`，用于管理可复用的智能体配置。
- macOS 会创建 `/Applications/Better Codex.app`，可以固定到 Dock。
- Windows 会在桌面和开始菜单创建 `Better Codex` 快捷方式。

以后请从 Better Codex 创建的启动入口打开 Codex，确保本地集成正常启用。

## 一套完整的工作流程

1. 从 Codex 侧边栏打开 `Better Codex`。
2. 创建项目，并手动添加任务，或者直接把当前对话收进任务。
3. 把任务分配给自己、默认 Codex 配置或自定义智能体配置。
4. 需要完整控制时使用手动运行，需要持续推进时开启自动运行。
5. 在看板上跟踪进度。任务需要审核或决定时，会重新交给你。
6. 打开任务，回到关联的 Codex 对话继续工作。

同一套流程可以用于编程、调研、写作、文档整理，以及其他已经在 Codex 中完成的工作。

## 本地数据与隐私

| 平台 | 数据库路径 |
| --- | --- |
| macOS | `~/.better-codex/better-codex.db` |
| Windows | `%USERPROFILE%\.better-codex\better-codex.db` |

Better Codex 运行时只监听 `127.0.0.1`。它不需要 Better Codex 云端服务，也不会向此类服务上传任务内容。

## 版本更新

Better Codex 会在后台检查带签名的更新清单。发现新版本后，Codex 内会显示更新提示。完成安装后，Codex 会自动重启并重新验证集成状态。

你也可以随时重新运行安装命令。Better Codex 会优先升级现有运行时，需要时再执行完整安装。

## 常用命令

检查运行时、数据库、Codex 兼容性和注入状态：

```bash
better-codex doctor
```

查看当前服务与看板连接：

```bash
better-codex status
```

安装或检查系统启动入口：

```bash
better-codex launcher install
better-codex launcher status
```

移除 Codex 侧边栏集成，同时保留任务数据：

```bash
better-codex eject
```

## 从源码安装

需要 Node.js 22.5 或更新版本。

```bash
git clone https://github.com/Ericwong5021/better-codex.git
cd better-codex
npm ci
npm run build
npm link
better-codex inject --launch
better-codex launcher install
```

## 兼容性

Better Codex 支持 macOS 版 Codex Desktop，以及 Windows 上通过 Microsoft Store 安装的 Codex。Release 安装包和 CI 覆盖 Apple Silicon、Intel Mac 和 Windows x64。

Better Codex 使用桌面应用的本地 CDP 接口和页面结构。Codex 更新后，偶尔可能需要安装对应的 Better Codex 兼容性更新。

## 社区

请通过 [GitHub Issues](https://github.com/Ericwong5021/better-codex/issues) 提交问题和功能建议，通过 [GitHub Discussions](https://github.com/Ericwong5021/better-codex/discussions) 交流使用问题和工作流想法。

请在 GitHub 的公开讨论中使用英文，方便所有人阅读和参与。
