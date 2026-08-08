<p align="center">
  <img src="assets/better-codex.png" width="132" alt="Better Codex" />
</p>

<h1 align="center">Better Codex</h1>

<p align="center">
  <strong>从开始到完成，让 Codex 里的工作清晰可见。</strong>
</p>

<p align="center">
  直接运行在 Codex Desktop 里的任务看板与 Agent 系统，在侧边栏提供两个独立入口。本地优先，一行命令安装。
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

<p align="center">
  <img src="assets/better-codex-board.png" width="1200" alt="Codex Desktop 中的 Better Codex 任务看板" />
</p>

## 为什么会有这个项目

如果你是 Codex 的重度用户，下面这些场景你多半不陌生：

- **会话列表杂乱难找。** 几十上百个对话堆在一起，标题大同小异，也没法按项目归类。想找回"上次调 auth 那个会话"，只能一边滚动一边靠猜。
- **所有会话共用一套模型配置。** 为了一个复杂重构调高推理等级，之后每个新会话都跟着买单；为了快速问答换了个轻量模型，下次深度排查开局就先天不足。全局只有这一个旋钮，所有任务都在抢它。
- **想法没有地方放。** 聊着聊着又想到三件值得做的事，但 Codex 没有任何地方能记下它们，最后要么丢进备忘录，要么写成 TODO 注释，要么干脆忘了。那些"本来打算做的事"就这么悄悄蒸发了。
- **Codex 长成了聊天的样子，但你的工作不是。** 真实的工作是一个跨越好几天、横跨好多会话的项目。Codex 只递给你一堆聊天记录，剩下的自求多福。

这些都不是模型的问题，模型很强。缺的是模型之上的那一层**工作系统**。所以我们动手做了一款更好的 Codex：Better Codex。

## 你会得到什么

Better Codex 基于原生 Codex Desktop 二次开发。侧边栏有两个独立入口：`任务看板` 用于组织和运行任务，`智能体` 用于创建和管理智能体。所有东西都在 Codex *里面*，同一个窗口、同一套视觉语言，接近原生的体验。不用多开网页工作台，不用注册账号，数据也不出你这台机器。

**会话找不到 → 任务和会话双向关联。** 把任何对话一键收进看板，按项目、状态、优先级、标签和负责人组织起来。三天后回来，不用再翻聊天记录，打开任务卡片，直接落在关联的那个会话里，上下文原封不动。

**想法没处放 → 一个真正的待办池。** 聊到一半想到新点子？几秒钟丢进看板，然后继续手头的事。明天它还在那儿，带着状态和负责人，而不是消失在聊天记录里。

**聊天式工作 → 看得见的工作闭环。** 把任务分配给自己或某个 Agent。手动逐个启动，或者开启自动运行，让满足条件的 Agent 任务自动排队。看板会显示排队中、运行中、已完成、执行失败和已中断等状态。需要你审核、拍板或解除阻塞时，任务会回到你手上，就在看板上，一眼就能看到。有关联会话的任务还可以在详情里查看最新结果并直接回复。

**灵活配置 Agent 和模型。** 你可以为不同类型的工作创建带专属指令的 Agent 角色：高推理等级的代码审查员、带专属指令的前端工程师、运行在快速模型上的问答助手。每个角色的模型、推理等级、工作区权限、指令、头像和并发上限都可以独立配置。默认 Codex 智能体会读取 Codex 配置中的模型、推理等级和沙盒权限。

<p align="center">
  <img src="assets/better-codex-agents.png" width="1200" alt="Better Codex 中可复用的智能体配置" />
</p>

## 用起来是什么样

1. 从 Codex 侧边栏打开 `任务看板` 管理任务，或打开 `智能体` 配置智能体。
2. 创建项目，手动添加任务，或者直接把当前对话收进任务。
3. 把任务分配给自己、默认 Codex 智能体或某个自定义智能体。
4. 想完全掌控就用手动运行；想持续推进就开自动运行。
5. 在看板上跟踪进度。任务需要审核或决定时，会回到你手上。
6. 打开任务查看关联会话、回复消息，或回到 Codex 继续工作。

同一套流程可以用于编程、调研、写作、文档整理，所有你已经在 Codex 里做的事。

## 安装方法

macOS：

```bash
curl -fsSL https://raw.githubusercontent.com/Ericwong5021/better-codex/main/scripts/install.sh | bash
```

Windows（PowerShell）：

```powershell
irm https://raw.githubusercontent.com/Ericwong5021/better-codex/main/scripts/install.ps1 | iex
```

从 Better Codex 启动入口重启 Codex，侧边栏会出现 `任务看板` 和 `智能体` 两个入口。随时可以用 `better-codex eject` 卸载，任务数据会保留。

## 常见问题

**这是 OpenAI 官方产品吗？**
不是。Better Codex 是一个独立的开源项目，基于 Codex Desktop 二次开发，与 OpenAI 没有隶属或背书关系。

**我的数据会去哪里？**
哪儿也不去。项目、任务、分配关系和运行状态全部保存在本机 SQLite 数据库（macOS 在 `~/.better-codex/better-codex.db`，Windows 在 `%USERPROFILE%\.better-codex\better-codex.db`）。运行时只监听 `127.0.0.1`，没有云端服务，也不需要账号。

**它会搞坏我的 Codex 吗？**
集成使用桌面应用的本地 CDP 接口和页面结构，不修改 Codex 的二进制文件。Codex 更新后偶尔需要安装对应的兼容性更新，届时 Codex 内会出现提示。感觉哪里不对时，运行 `better-codex doctor` 检查。

**怎么卸载？**
`better-codex eject` 会移除侧边栏集成，任务数据原样保留。

**更新怎么做？**
Better Codex 会在后台检查带签名的更新清单，发现新版本时在 Codex 内提示。你也可以随时重新运行安装命令，它会优先原地升级。

**支持哪些平台？**
macOS 版 Codex Desktop（Apple Silicon 和 Intel），以及 Windows x64 上 Microsoft Store 版本的 Codex。Release 安装包和 CI 覆盖全部三个平台。

## 常用命令

```bash
better-codex doctor            # 检查运行时、数据库、Codex 兼容性和注入状态
better-codex status            # 查看当前服务与看板连接
better-codex launcher install  # 安装系统启动入口
better-codex launcher status   # 检查系统启动入口
better-codex eject             # 移除侧边栏集成，保留任务数据
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

## 社区

- 发现 Bug 或想要新功能？提交 [GitHub Issue](https://github.com/Ericwong5021/better-codex/issues)。
- 使用问题和工作流想法欢迎到 [GitHub Discussions](https://github.com/Ericwong5021/better-codex/discussions) 交流。

如果 Better Codex 让你的 Codex 变得更好用，点个 Star 能帮更多重度用户找到它。

<p align="center">
  <a href="https://star-history.com/#Ericwong5021/better-codex&Date">
    <img src="https://api.star-history.com/svg?repos=Ericwong5021/better-codex&type=Date" width="600" alt="Star History Chart" />
  </a>
</p>
