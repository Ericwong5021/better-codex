<p align="center">
  <img src="assets/tilo-logo.svg" width="280" alt="Tilo" />
</p>

<p align="center">让每一段 Codex 对话，都有清晰的下一步。</p>

Tilo 是给 Codex 桌面端用户准备的本地任务看板。它把散落在聊天里的待办、想法和进度放到一个看板里：你不用切换到另一套复杂工具，也不用把工作计划记在脑子里。

## 你可以用 Tilo 做什么

- 把当前 Codex 对话变成一张任务卡片，随时回到原来的对话。
- 用待办、进行中、待审核、已完成等状态整理工作，不再让重要事项沉下去。
- 创建项目、搜索任务、设置优先级、置顶或归档卡片。
- 把所有任务留在自己的 Mac 上，本地 SQLite 数据库保存，不依赖云端账号。

## 适合谁

如果你经常用 Codex 写代码、做设计、整理需求，打开的对话越来越多，却总要花时间找回“上次做到哪里”，Tilo 就是为这个场景做的。

## 三步开始

目前 Tilo 面向 macOS 和 Codex 桌面端。先准备好 Node.js 22.5 或更新版本，然后运行：

```bash
git clone https://github.com/Ericwong5021/tilo.git
cd tilo
npm ci
npm run build
npm link
tilo inject --launch
```

回到 Codex 桌面端，侧边栏会出现 Tilo。打开它，创建第一个项目和任务卡片即可。

## 日常使用

打开 Tilo 后：

1. 新建一个项目，例如“我的网站”。
2. 把要做的事情写成任务卡片。
3. 需要时关联当前 Codex 对话。
4. 完成一步就拖动卡片更新状态。

想确认本地服务与看板连接是否正常，运行：

```bash
tilo status
```

如需暂时移除看板入口，运行：

```bash
tilo eject
```

这不会删除你的任务数据。数据默认保存在 `~/.tilo/tilo.db`。

## 开源与隐私

Tilo 是开源项目。任务数据默认只保存在你的电脑上；本地服务只监听 `127.0.0.1`，不会把任务内容发送到第三方服务器。

欢迎提交 Issue、分享使用反馈，或参与改进这个项目。
