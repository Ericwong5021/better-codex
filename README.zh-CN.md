<p align="center">
  <img src="assets/better-codex.png" width="560" alt="Better Codex" />
</p>

<p align="center">
  <strong>让每一段 Codex 对话都有清晰的下一步。</strong>
</p>

<p align="center">
  <a href="README.md">English</a> · 简体中文
</p>

Better Codex 是面向 Codex 桌面端的本地任务看板和智能体管理工具。它把任务、想法和进度放在 Codex 对话旁边，让你可以随时回到对应的对话，不必把工作流迁移到另一套项目管理工具。

## 你可以做什么

- 把当前 Codex 对话变成任务卡片，之后可以重新打开关联的对话。
- 使用待办、进行中、待审核和已完成状态整理工作。
- 创建项目、搜索任务、设置优先级、置顶卡片和归档已完成的工作。
- 创建 Codex Profile Agent，配置名称、描述、开发者指令、模型和推理等级。
- 使用本地 SQLite 数据库把任务数据保存在自己的电脑上，无需云端账号。

## 适合谁

Better Codex 适合使用 Codex 编程、设计、研究或规划工作，并且需要随时确认每段对话进展的人。

## 安装

Better Codex 支持 macOS 和 Windows 版 Codex 桌面端。请先安装 Node.js 22.5 或更新版本，然后运行：

```bash
git clone https://github.com/Ericwong5021/better-codex.git
cd better-codex
npm ci
npm run build
npm link
better-codex inject --launch
```

### Windows

请使用 Microsoft Store 版 Codex。首次注入前，完全退出 Codex，包括后台进程，然后运行 `better-codex inject --launch`。Better Codex 会冷启动 Codex，并启用本地调试端口。

`better-codex service` 命令目前仅支持 macOS。在 Windows 上，`better-codex inject --launch` 会按需启动本地网关和注入监听进程。

### macOS

运行同一条 `better-codex inject --launch` 命令。注入完成后，Codex 侧边栏会出现 Better Codex 入口。

## 使用 Better Codex

1. 从 Codex 侧边栏打开 Better Codex。
2. 创建一个项目。
3. 添加任务卡片，并在需要时关联 Codex 对话。
4. 根据工作进度移动卡片。
5. 打开智能体页面，创建和管理 Codex Profile Agent。

检查本地服务与看板连接：

```bash
better-codex status
```

暂时移除侧边栏入口：

```bash
better-codex eject
```

这个命令不会删除任务数据。macOS 的数据库位于 `~/.better-codex/better-codex.db`，Windows 的数据库位于 `%USERPROFILE%\.better-codex\better-codex.db`。

## 隐私

任务数据默认只保存在你的电脑上。本地服务只监听 `127.0.0.1`，不会把任务内容发送到第三方服务器。

## 社区

请通过 [GitHub Issues](https://github.com/Ericwong5021/better-codex/issues) 提交问题和功能建议，通过 [GitHub Discussions](https://github.com/Ericwong5021/better-codex/discussions) 讨论想法、提问和分享工作流。为了让所有社区成员都能参与，请在 GitHub 的公开内容中使用英文。
