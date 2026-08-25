# Unified Codex Mentions Evidence

日期：2026-08-25

该目录保存 `PLAN_UNIFIED_CODEX_MENTIONS.md` 阶段五的脱敏协议与行为证据。所有 workspace 绝对路径、候选 locator、令牌、MCP 环境和用户数据均已移除。

## 结论

- 终端 `codex` 版本为 `0.149.1`。
- Better Codex Session Host 实际持有的 ChatGPT 内置 App Server 版本为 `0.149.0-alpha.4.1`。
- Skill、App、Plugin、文件和目录发现均通过当前 Session Host 持有的同一 App Server 请求。
- Browser、Computer Use 和 Chrome 在目录中均存在真实 Skill，Skill 可按原生 `skill` UserInput 提交。
- Browser、Computer Use 和 Chrome 的 Plugin 记录保持 `unverified`，没有根据显示名称生成 `plugin://` 或其他 URI。
- 目录 `mention` 已在两个实测版本上被 `turn/start` 接受，仅对这两个版本开放直接提交。
- MCP server、tool 和 resource 保持 informational，不生成 `mcp://`。
- `app/list` 当前返回上游 HTTP 403；聚合结果为 `partial`，日志记录 `UPSTREAM_HTTP_403`，响应不包含上游 HTML。

## 验证

- `npm run build` 通过；构建使用空的临时开发 Home，未刷新现有本机安装。
- `npm run typecheck` 通过。
- `npm test` 通过：255 passed，11 skipped。
- `npm run test:web:smoke` 通过：2 passed。
- `npm run test:web` 通过：9 passed。
- `npm run test:acceptance` 的类型检查、全量单测和 Web 套件通过；Docker 自托管阶段因本机 Docker daemon 无响应而被终止，未记录为通过。

## 文件

- `app-server-protocol.md`：App Server 发现、版本和目录输入证据。
- `ui-relay-acceptance.md`：共享 WebUI、Relay 句柄隔离和安全响应证据。
