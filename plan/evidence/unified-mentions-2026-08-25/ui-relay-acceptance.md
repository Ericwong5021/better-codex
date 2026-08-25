# UI and Relay Acceptance Evidence

## 共享 WebUI

隔离 Runtime 的真实 WebUI 完成以下操作：

1. 在 Agent Issue 编辑器输入 `@semantic-model`。
2. 菜单通过同实例目录返回 `Files` 分组及相对路径 `src/ui/features/board/semantic-model.ts`。
3. 选择后 textarea 显示 `@src/ui/features/board/semantic-model.ts`，候选菜单关闭。
4. 修改引用范围内字符后，引用从结构化锚点移除，并显示“引用已变成普通文本，请重新选择”。

纯数据草稿验收同时确认：

- 同一 handle 可出现两次，序列化保留两次 reference part。
- 只有引用、文本与引用交错、引用后文本均保留顺序。
- email 中的 `@` 保持普通文本。
- 与一个引用相交的编辑只降级受影响引用。

## 安全响应

项目 V2 目录响应经过完整 JSON 扫描，未出现：

- 本机绝对路径前缀。
- `app://`。
- `plugin://`。
- `mcp://`。
- MCP resource URI、启动参数或环境变量。

文件和目录候选只返回随机 handle、相对 display path、来源、可用性和 addressability。

## Relay 隔离

- 使用本地 audience 获取的文件 handle，通过 Relay audience 提交时在持久化前返回 `REFERENCE_RUNTIME_MISMATCH`。
- 客户端使用有效 handle 但伪造 display 文本时，在持久化前返回 `semantic_reference_invalid`。
- 目录候选持久化为 V2 document 时，记录 `directory`、`direct`、`expected_kind=directory`、版本化 mapping 和 V1 `mention` 兼容快照；API 验收后已删除临时 Issue。
- 队列恢复只返回重新签发的安全 handle 与 display parts，不返回持久化 locator。
