# Plan 1.3：模块化在线升级

## 目标

允许兼容层独立快速更新，不要求用户每次重新下载完整 Better Codex；核心程序升级仍使用完整、原子化发布包。

## 模块边界

| 模块 | 更新方式 | 内容 |
| --- | --- | --- |
| core | 完整二进制原子替换 | CLI、Runtime、数据库访问、更新器 |
| compatibility | 独立资源包 | Codex 版本规则、target 规则、选择器、导航与注入资源 |

首期不把数据库 migration、任意可执行程序或第三方插件放入兼容资源包。

## Runtime 版本布局

```text
~/.better-codex/runtime/
├── versions/
│   ├── 0.2.0/
│   └── 0.2.1/
├── current.json
└── compatibility/
```

- 稳定 Launcher 负责解析活动版本、启动 Runtime 和执行修复。
- core 与 compatibility 分开发布，兼容层更新不替换完整二进制。
- Windows 不依赖符号链接，两个平台统一使用原子更新的活动版本描述文件。
- Runtime 升级前保留上一成功版本；新版本必须完成版本探测、健康检查和注入验收后才能成为活动版本。

## 更新协议

- 发布端提供签名 manifest、版本、兼容范围、下载地址、SHA-256 和最低 core 版本。
- 客户端只通过 HTTPS 获取 manifest 与资源包。
- 下载到临时目录，完成签名、哈希、结构和兼容性检查后再原子切换。
- 保留当前版本和上一个成功版本。
- 注入成功并通过健康检查后标记版本可用；连续失败自动回滚。
- 默认在启动时低频检查，用户也可以执行 `better-codex update`。
- 支持稳定更新通道；预览通道只能由用户显式开启。

## 命令结果

- `better-codex update check`：显示 core、compatibility 和 Codex 兼容状态。
- `better-codex update`：更新适用模块并返回每个模块结果。
- `better-codex update compatibility`：只更新兼容层。
- `better-codex update rollback`：恢复上一个成功兼容层。
- `better-codex version`：分别显示 core 与 compatibility 版本。

## 安全边界

- manifest 与资源包必须验证发布签名和 SHA-256。
- 兼容包只能声明允许字段，不能包含原生可执行文件和安装脚本。
- 更新失败不覆盖正在工作的版本。
- 更新过程不修改 SQLite 业务数据。
- 日志记录版本和结果，不记录 token、任务内容和对话内容。

## 验收

- 在不替换 core 二进制的情况下升级兼容层并恢复注入。
- 无效签名、哈希错误、下载中断和不兼容 core 均被拒绝。
- 新兼容层注入失败后自动恢复上一个成功版本。
- 离线状态继续使用当前版本，不阻塞本地看板。
- core 完整升级失败时旧二进制仍可启动。

## 回滚

兼容层使用双版本目录和原子活动指针；core 使用临时文件验证后替换，保留上一个可执行版本。

## 当前进度

已完成：

- Runtime 动态端口发现、实例身份校验和单实例锁。
- Runtime Supervisor 统一启动、停止并监控 Injector。
- Runtime 端口变化后 Injector 自动替换旧注入端点。
- 建立 `runtime/versions`、`runtime/current.json`、`runtime/compatibility/versions` 和兼容层原子活动指针。
- 稳定二进制入口按活动指针委派到新 core；活动文件缺失或无法启动时继续使用旧入口。
- 兼容资源包限制为声明式 JSON，校验允许字段、平台、最低 core 版本和结构。
- 更新清单使用 Ed25519 签名，资源使用 SHA-256 校验，下载仅允许 HTTPS。
- 支持 stable、显式 preview、24 小时低频检查和离线继续使用当前版本。
- 完成 `update check`、全量更新、兼容层独立更新、兼容层回滚和双版本显示。
- Injector 根据兼容版本变化重新注入；新兼容层连续三次能力检测失败后自动回滚。
- 发布流程生成 core 独立资产、兼容资源、签名清单和安装时固化的更新公钥。
- 本地签名 HTTPS 夹具已通过兼容更新、自动回滚、伪造签名拒绝和 core 更新失败保留旧版本验收。

未完成：

- 配置正式发布私钥并发布首个真实签名更新清单。
- 使用高于当前版本的真实 core 二进制完成 macOS 成功升级验收。
- Windows 正式二进制完成成功升级、失败保留旧版本和兼容层回滚验收。

在正式签名资产与 macOS、Windows 真实升级均通过前，Plan 1.3 保持进行中。
