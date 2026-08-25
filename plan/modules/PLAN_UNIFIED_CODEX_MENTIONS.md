# Better Codex 统一 Codex `@` 提及能力实施计划

更新日期：2026-08-25

状态：方案完成，待实施

适用范围：Codex 注入宿主、本地 WebUI、Relay WebUI、Issue 创建与回复、排队回复、Retry、Steer、Session Host 和 Codex App Server 输入

## 0. 执行结论

Better Codex 应把 `@` 定义为统一能力选择入口，而不是 App 专用入口，也不是某一种 App Server 输入类型。

实施采用以下单一路线：

1. 使用有序输入文档保存文本和结构化引用的位置。
2. 使用版本化语义引用区分 Skill、Plugin、App、Browser、Computer、MCP、文件和目录。
3. 语义候选由本地 Runtime 聚合，但必须通过当前 Session Host 持有的同一个 App Server 完成发现或最终校验。
4. Session Host 在 `turn/start` 或 `turn/steer` 前使用唯一编译器重新验证并生成 App Server `UserInput[]`。
5. `@` 搜索所有已验证能力，`$` 保留为同一选择器的 Skill 筛选别名，`/` 保持命令入口。
6. MCP server、tool、resource 首版作为能力来源和父目标导航，不创造 `mcp://`，不宣称可以直接寻址。
7. Browser、Computer、Chrome、目录只按当前 Codex 版本的真实发现结果和真实输入证据启用，不按显示名称硬编码。

最小可交付版本不是“给现有菜单多加几项”，而是完成统一输入模型、同实例发现、提交时重验证，并首批开放 Skill、App、经过验证的 Plugin 和文件。否则队列、Retry、Relay 和桌面入口仍会产生不一致或过期输入。

## 1. 目标与成功标准

### 1.1 目标

- `@` 能统一搜索和选择 Codex 原生可用的 Skill、Plugin、App/Connector、Browser、Computer、Chrome/桌面应用、MCP 能力、文件和目录。
- 用户看到的能力类型与 App Server 的传输类型解耦；UI 不生成 URI，不猜测协议类型。
- 创建 Issue、初次执行、已有 Issue 回复、排队回复、Retry、Steer、桌面注入、本地 WebUI 和 Relay WebUI 使用同一输入文档及同一个编译器。
- Runtime 继续是 Better Codex 业务数据库唯一写入者；Session Host 只负责对当前 App Server 的实时发现、校验、编译和执行，不写业务数据库。
- Relay WebUI 只接触与 Runtime、用户和 workspace 绑定的安全候选句柄，不接触本机绝对路径、Skill 路径或 MCP 敏感配置。
- Codex 原生登录、授权、Computer Use 审批和 MCP 审批保持原样；Better Codex 不自动批准、不吞掉拒绝状态。

### 1.2 完成标准

- 同一输入从三个宿主提交时生成语义等价的 `InputDocumentV2` 和 App Server `UserInput[]`。
- 所有新结构化输入只通过一个 `CodexUserInputCompiler` 生成；UI、Server、Worker 和 Relay 不再各自拼接 `app://`、`plugin://` 或绝对路径。
- 每个引用保留在正文中的顺序和出现次数；允许同一目标重复出现，不再按 `type + name` 去重。
- 候选选择时和真正执行时分别校验；队列等待、Retry 或 App Server 重启后不得复用未经重验的旧路径或旧可用性。
- 一个发现 provider 失败时返回 `partial` 和明确的 `provider_errors`；所有 provider 失败时请求失败，不表现为“没有匹配项”。
- Relay 请求、响应、浏览器状态和普通日志中不存在本机绝对路径、MCP 启动参数、环境变量、凭证或带敏感参数的 resource URI。
- Browser、Computer、Chrome、目录和 MCP 的支持状态都有真实 App Server payload 和真实桌面行为证据，不能只凭 UI 截图通过。
- 旧 `semantic_references` 和旧 `session_commands.payload_json.input` 继续可读；回滚旧版本时不会因为数据库 schema 过新而拒绝启动。

## 2. 官方协议边界

当前本机 `codex-cli` 为 `0.149.1`，以下 feature 已开启：

- `apps`
- `browser_use`
- `browser_use_external`
- `browser_use_full_cdp_access`
- `computer_use`
- `in_app_browser`
- `mentions_v2`
- `plugins`
- `plugin_sharing`

`enable_mcp_apps` 仍是 under development 且未开启。

官方文档和当前生成协议确认：

- Codex Browser 可在产品界面中通过 `@Browser` 指定。
- Computer Use 可通过 `@Computer` 或具体 `@AppName` 指定，Chrome 可表现为 `@Chrome`。
- Plugin 可以同时包含 Skill、Connector 和 MCP server。
- ChatGPT 桌面端可用 `@` 选择 Skill；Codex CLI/IDE 仍以 `$` 或 `/skills` 为常见入口。
- App Server `UserInput` 当前只有 `text`、媒体、`skill` 和通用 `mention`，没有独立的 `browser`、`computer` 或 `mcp` 输入类型。
- `skills/list`、`app/installed`、`app/list`、`plugin/installed`、`mcpServerStatus/list` 和 `fuzzyFileSearch` 是不同的发现接口。
- 已确认的结构化 locator 包括 Skill 路径、`app://`、`plugin://` 和文件绝对路径；没有可据此推导的 `mcp://`。

参考：

- [Browser](https://learn.chatgpt.com/docs/browser)
- [Computer Use](https://learn.chatgpt.com/docs/computer-use)
- [Build Skills](https://learn.chatgpt.com/docs/build-skills)
- [Skills and Plugins](https://learn.chatgpt.com/docs/skills-and-plugins)
- [Codex App Server](https://learn.chatgpt.com/docs/app-server)
- [Commands](https://learn.chatgpt.com/docs/reference/commands)

结论是：`@` 是产品层的统一发现和选择界面，不是协议层的单一传输类型。

## 3. 当前代码事实

### 3.1 已有能力

| 能力 | 当前实现 | 可复用部分 |
| --- | --- | --- |
| Skill 发现 | `src/codex-semantics.ts` 调用 `skills/list` | Skill 名称、路径、scope、description |
| App 发现 | `src/codex-semantics.ts` 调用 `app/installed` | App ID、runtimeName、enabled、callable |
| 文件搜索 | `src/codex-semantics.ts` 调用 `fuzzyFileSearch` | workspace 相对路径、文件/目录类型、边界检查 |
| 语义 API | `src/server.ts` 的 Project/Issue `semantics` 和 `mentions` 路由 | Runtime 权威的 workspace 解析入口 |
| UI 选择器 | `src/ui/injected-entry.ts` 的 `/`、`$`、`@` 菜单 | 键盘导航、命令入口、共享宿主构建产物 |
| 初次执行持久化 | `issue_initial_semantics.references_json` | 初始 Issue 到首次 Session command 的传递 |
| 后续执行持久化 | `session_commands.payload_json` | 排队、重试、恢复、Steer 的持久命令载体 |
| App Server 执行 | `src/session-relay.ts` | `turn/start`、`turn/steer`、MCP status、审批与事件转发 |
| Runtime/Host 可靠传输 | `session-host/v2`、delivery receipt、connection epoch | 可扩展为受限的语义查询协议 |

### 3.2 当前真实缺口

1. `src/ui/injected-entry.ts` 中 `$` 只显示 Skill，`@` 只显示 App；文件 API 没有进入选择器，MCP 只有 `/mcp` 状态视图。
2. UI 把引用保存为独立数组，并通过正文是否仍包含 `$Name` 或 `@Name` 判断是否提交。相同目标的多次出现会被去重，引用位置没有保存。
3. `codexSemanticInput()` 固定输出一个完整 text item，再把所有引用追加到末尾，不能表达文本和引用交错顺序。
4. App URI 在 `resolveCodexSemanticReferences()` 中直接生成；继续为 Plugin、Browser 或 MCP 增加条件分支会把未知协议固化在 Runtime 前端适配层。
5. `codex-semantics.ts` 每次请求都会临时启动一个新的 `codex app-server`，而真正执行 `turn/start` 的 App Server 由 Session Host 长期持有。发现结果可能与执行实例、profile、安装状态或版本不一致。
6. Skill 缓存按 workspace 保存 60 秒，App 缓存全局保存 60 秒；缓存没有绑定 Host instance、App Server PID/start time、profile、版本或 catalog generation。
7. `session_commands.payload_json` 当前保存已经编译好的 `input`。排队、Retry 和 Promote-to-Steer 会继续使用旧输入，不会在实际 `turn/start` 前重新验证引用。
8. `updateQueuedIssueReply()` 只替换第一个 text input，无法安全编辑带结构化引用的排队回复。
9. `IssueSemanticReference` 和 `CodexSemanticReference` 只有 `skill | mention`，没有区分用户语义、可寻址性、来源和 transport mapping。
10. 当前数据库 schema 为 21；现有 JSON 字段足以承载 V2，不需要为了本功能立刻升级 SQL schema。

### 3.3 对 Pro 方案的代码适配

采纳：

- 有序 `InputDocumentV2`。
- Runtime 安全候选和不透明引用。
- 唯一 resolver/compiler。
- 队列和 Retry 执行前重验证。
- MCP 首版只做 informational 或 via-parent。
- `$` 保留为 Skill 筛选别名。
- 未验证 mapping 必须 fail fast。

调整：

- Pro 方案把主要 UI 落点指向旧的 `src/dom.ts`。当前共享浏览器入口已经迁到 `src/ui/injected-entry.ts`，新选择器模型必须进入 `src/ui/features/board`，`src/dom.ts` 只保留生成入口和运行期配置。
- Pro 方案把编译器描述为 Runtime 内部组件。当前真正持有 App Server 的是 Session Host，因此最终实时校验和 `UserInput[]` 编译必须在 Session Host 侧、针对当前 App Server 实例执行；Runtime 负责业务校验、持久化、安全句柄和命令状态。
- Pro 方案建议加法数据库迁移。本计划先在已有 JSON envelope 中双写 V1/V2，不提升 SQL schema，避免旧二进制因 `database_schema_too_new` 无法回滚。
- Plugin 只有在 `plugin/installed` 返回稳定身份并且捕获到当前版本可复现的原生 mapping 后才可提交；仅看到文档中的 `plugin://` 示例不足以按显示名称生成 URI。

## 4. 目标架构

本功能涉及超过 8 个文件，并扩展 Runtime、Session Host、App Server、数据库命令载体和共享 UI 五个组件，但不新增服务、不引入新语言或前端框架。

```text
Codex Injected / Local Web / Relay Web
                  │
                  │ query + safe candidate handle
                  ▼
          Better Codex Runtime API
                  │
          MentionCatalogService
                  │ typed semantic request
                  ▼
          Session Host protocol
                  │
          active RuntimeSessionRelay
                  │
                  ▼
          same Codex App Server

submit InputDocumentV2
        │
        ▼
Runtime validates handle, workspace and ownership
        │
        ▼
session_commands stores V2 + V1 compatibility input
        │
        ▼
Session Host revalidates against current App Server
        │
        ▼
CodexUserInputCompiler → turn/start or turn/steer
```

依赖方向固定为：

```text
UI draft model
  → Runtime API contract
    → semantic domain model
      → Session Host semantic query/materializer
        → App Server
```

不得形成 UI → App Server、Relay Web → 文件系统或 Session Host → Better Codex 数据库的反向依赖。

## 5. 数据模型

### 5.1 安全候选 `MentionCandidateV2`

Runtime 返回给 UI 的候选只包含：

```ts
type MentionCandidateV2 = {
  handle: string;
  kind:
    | "builtin_browser"
    | "builtin_computer"
    | "desktop_app"
    | "skill"
    | "plugin"
    | "app"
    | "mcp_server"
    | "mcp_tool"
    | "mcp_resource"
    | "file"
    | "directory";
  label: string;
  detail: string;
  source: string;
  availability: "available" | "disabled" | "auth_required" | "unavailable" | "unverified";
  addressability: "direct" | "via_parent" | "informational" | "unverified";
  parent_handle?: string;
  display_path?: string;
};
```

`handle` 必须：

- 使用不可预测随机 ID，不再使用可逆的 base64 路径作为安全边界。
- 绑定 `runtime_instance_id`、`host_instance_id`、App Server identity、workspace ID、用户和 catalog generation。
- 在 Runtime 内存中保存私有 locator，使用短 TTL；过期后返回 `REFERENCE_HANDLE_EXPIRED`，要求重新选择。
- Relay 只收到 handle 和安全显示字段。

### 5.2 编辑器草稿 `DraftInputDocumentV2`

客户端草稿使用：

```ts
type DraftInputPartV2 =
  | { type: "text"; text: string }
  | { type: "reference"; handle: string; display: string };

type DraftInputDocumentV2 = {
  schema_version: 2;
  parts: DraftInputPartV2[];
};
```

选择候选时插入 reference part；手工输入的 `@foo` 或 `$foo` 始终是普通文本。只有从选择器确认的候选才产生 reference part。

当前输入控件是 textarea，不改成 contenteditable。`src/ui/features/board` 新增纯数据草稿模型：

- 所有已知编辑通过 `applyTextEdit(start, end, replacement)` 调整引用锚点。
- 对粘贴、输入法等原生 input，通过最长公共前缀和后缀还原一次文本编辑。
- 编辑与引用范围相交时，该引用降级为普通显示文本并从结构化 parts 删除，不静默绑定同名目标。
- 无法可靠还原多区编辑时，清除受影响的结构化锚点并显示“引用已变成普通文本，请重新选择”。
- 同一引用允许多次出现，每次都有独立 part。

### 5.3 Runtime 持久输入 `InputDocumentV2`

Runtime 把候选 handle 解析为本机私有引用后保存：

```ts
type SemanticReferenceV2 = {
  id: string;
  kind: MentionCandidateV2["kind"];
  addressability: MentionCandidateV2["addressability"];
  display: string;
  locator: Record<string, unknown>;
  workspace_binding?: {
    workspace_id: string;
    relative_path?: string;
    expected_kind?: "file" | "directory";
  };
  provenance: {
    discovery_source: string;
    host_instance_id: string;
    app_server_version: string;
    catalog_generation: string;
  };
  mapping?: {
    id: string;
    verified_version: string;
  };
};

type InputDocumentV2 = {
  schema_version: 2;
  parts: Array<
    | { type: "text"; text: string }
    | { type: "reference"; reference_id: string }
  >;
  references: Record<string, SemanticReferenceV2>;
};
```

私有 `locator` 可以包含 Skill 路径、App ID、Plugin ID、workspace 相对路径和 MCP 父目标，但只存在于本机 Runtime 数据库与 Runtime/Session Host 本机认证通道，不进入 Relay API 或普通诊断日志。

### 5.4 V1/V2 双写

不提升当前 SQL schema 21。利用现有 JSON 字段：

- `issue_initial_semantics.references_json` 写入 `{ references, document, command }`。
- `session_commands.payload_json` 写入 `input_document`，并继续写入已验证的 V1 `input` 兼容快照。
- 新代码优先读取 `input_document`；没有时走当前 V1 reader。
- Retry、排队 dispatch 和 Steer 在 V2 存在时重新编译；V1 历史命令维持原行为，不伪造引用位置。
- 旧二进制会忽略 JSON 中的 `document` 和 `input_document`，继续读取 `references` 与 `input`，因此不触发 schema-too-new。

双写一致性要求：V1 compatibility input 必须由同一个 compiler 生成；客户端不得同时上传两份互相独立的 V1/V2 表达。

## 6. 发现聚合与同实例一致性

### 6.1 替换临时 App Server 发现

当前 `src/codex-semantics.ts` 的 `requestCodex()` 每次启动新的 App Server。实施后：

- `src/server.ts` 不再直接启动 App Server 获取语义目录。
- `src/session-host-protocol.ts` 增加受限的 `semantic_request` / `semantic_response`，不开放任意 App Server RPC 代理。
- 允许的方法固定为：
  - `skills/list`
  - `app/installed`
  - `app/list`
  - `plugin/installed`
  - `mcpServerStatus/list`
  - `fuzzyFileSearch`
- `src/session-host-client.ts` 提供 Runtime 侧的请求方法，包含 request ID、deadline 和预期 Host identity。
- `src/session-host.ts` 验证 Runtime identity、connection epoch、method allowlist、cwd 和请求大小，再交给 `src/session-relay.ts`。
- `src/session-relay.ts` 使用当前已初始化的 App Server connection 执行请求，返回 App Server identity 和原始结构化错误。

如果 Session Host 或 App Server 不可用，语义目录明确返回 `SEMANTIC_HOST_UNAVAILABLE`；普通文本创建和回复仍可使用，但结构化引用不能提交。不得回退到另一个未标识的 App Server 并假装结果等价。

### 6.2 Provider 结构

`src/codex-semantics.ts` 重构为：

```text
MentionCatalogService
├── SkillProvider
├── InstalledAppProvider
├── AppMetadataProvider
├── PluginProvider
├── McpCapabilityProvider
├── FileProvider
└── NativeCapabilityMapper
```

聚合规则：

- `app/installed` 决定 App 是否可提交，`app/list` 只补充显示元数据。
- 同名 Skill、Plugin、App、MCP server 和文件不合并，必须显示来源。
- MCP tool/resource 只有明确父 Plugin/App/Skill 时标记 `via_parent`；否则为 `informational`。
- Browser、Computer、Chrome 不按 label 判断；只按发现来源、Plugin ID、Skill 路径和已验证 mapping 判断。
- `fuzzyFileSearch` 结果必须再次经过 workspace 相对路径、`realpath`、符号链接逃逸和文件类型校验。
- 目录结果在通过真实 App Server acceptance 前返回 `unverified`，可以显示但不能选择。

### 6.3 缓存

缓存键至少包含：

- profile
- Runtime instance ID
- Host instance ID
- App Server PID/start time/version
- workspace ID
- provider
- query

失效事件：

- Host 或 App Server identity 改变。
- Runtime generation 改变。
- workspace 切换。
- Plugin/App 安装、卸载、启用、禁用或认证状态改变。
- Skill list change notification。
- MCP server/auth status 改变。
- 用户显式刷新。

MCP tool 数量可能很大，只有查询长度达到 2 个字符或用户展开具体 server 时才读取 tool/resource；支持分页、取消旧查询和每 provider 独立 deadline。缓存只优化搜索，不能替代执行前校验。

## 7. 解析与编译

### 7.1 唯一编译器

新增 `src/codex-input-document.ts`，负责：

- V1/V2 读取和规范化。
- parts 顺序、长度和数量限制。
- reference ID 完整性。
- V1 compatibility input 生成。
- request fingerprint 的 canonical JSON。

`src/codex-semantics.ts` 负责：

- 候选发现。
- handle 解析。
- workspace、Runtime、Host、来源和 mapping 校验。
- `SemanticReferenceV2` 构造。

`src/session-relay.ts` 中的 `CodexUserInputCompiler` 负责在实际调用前：

1. 检查文档版本。
2. 验证当前 Host/App Server identity 是否仍匹配。
3. 对 Skill、Plugin、App、MCP 父目标重新查询可用性。
4. 对文件和目录重新执行 `realpath` 与 workspace 边界检查。
5. 验证 mapping 适用于当前 App Server 版本。
6. 按 parts 顺序生成 `UserInput[]`。
7. 合并相邻 text，但不移动、去重或重排引用。

任何引用失败时整次输入不发送；保留命令、文档和错误，Runtime 通过现有 fail delivery 事务记录失败。

### 7.2 目标映射

| 用户目标 | 发现来源 | 0.149.1 编译决策 | 首版状态 |
| --- | --- | --- | --- |
| Skill | `skills/list` | `{type:"skill", name, path}` | 直接支持 |
| App | `app/installed` | 已验证 App ID → `app://id` mention | 直接支持 |
| Plugin | `plugin/installed` | 只有真实 payload 证明稳定 Plugin ID → `plugin://id` mention | 证据通过后支持 |
| 文件 | `fuzzyFileSearch` | Session Host 解析工作区绝对路径 → file mention | 直接支持 |
| 目录 | `fuzzyFileSearch` | 真实 `turn/start` 接受后才使用 path mention | 默认不可提交 |
| Browser | Plugin/Skill/native provider | 优先使用实际发现的 Browser Skill 或经验证 Plugin mapping | 证据门控 |
| Computer | Plugin/Skill/native provider | 优先使用实际发现的 Computer Use Skill 或经验证 Plugin mapping | 证据门控 |
| Chrome | `app/installed`、`plugin/installed` 或 Computer provider | 按来源分别映射，禁止 `label === Chrome` 分支 | 条件支持 |
| 桌面应用 | `app/installed` 或 Computer provider | App ID 已确认则走 App；否则走经验证的 Computer mapping | 条件支持 |
| MCP server | `mcpServerStatus/list` | 无直接输入；选择父 Plugin/App/Skill | via-parent/informational |
| MCP tool | server tools | 无直接输入；显示能力和父目标 | via-parent/informational |
| MCP resource | server resources | 不把 resource URI 当 mention | informational |
| MCP resourceTemplate | resource templates | 只显示元数据 | informational |

### 7.3 原生能力 mapping 证据

每个可启用 mapping 保存：

- `mapping_id`
- Codex desktop version
- App Server version
- discovery source 与稳定 ID
- 选择前后输入状态
- 实际 `UserInput[]`
- 审批、认证和失败事件序列
- 实际完成结果

mapping registry 只接受以下结论：

- 原生发送 Skill：编译为 Skill。
- 原生发送 App/Plugin mention：使用发现接口返回的稳定 ID。
- 原生发送固定文本：只有文本内容、版本范围和行为可复现时才使用 versioned text mapping。
- 原生出现新结构化类型：升级 domain 和协议后再支持。
- 桌面 UI 可选但 App Server 无法复现：Better Codex 标记为 `unverified`，不可提交。

## 8. API 与 UI 变更

### 8.1 Runtime API

保留现有路由，增加 V2 协商：

```text
GET /api/projects/:id/semantics?schema_version=2&query=&kinds=&cursor=
GET /api/issues/:id/semantics?schema_version=2&query=&kinds=&cursor=
```

V2 响应：

```json
{
  "schema_version": 2,
  "status": "complete",
  "catalog_generation": "...",
  "results": [],
  "provider_errors": [],
  "next_cursor": null
}
```

现有无 `schema_version` 的调用继续返回 V1 `skills/apps/errors`。现有 `/mentions` 路由保留一个兼容周期，底层改为调用 `FileProvider`。

Issue 创建、回复和排队更新请求增加：

```json
{
  "input_document": {
    "schema_version": 2,
    "parts": []
  }
}
```

兼容规则：

- 新客户端只提交 `input_document`。
- 旧客户端继续提交 `message + semantic_references`。
- 同一请求同时提供 V1/V2 时，Runtime 编译后检查两者语义等价；不等价返回 `SEMANTIC_INPUT_CONFLICT`。
- request fingerprint 使用规范化后的 V2 文档，避免同一 request ID 因字段顺序不同而误判。

### 8.2 共享 UI

语义 composer 属于 Board feature：

```text
src/ui/features/board/
  semantic-model.ts
  semantic-controller.ts
  semantic-view.ts
```

`src/ui/injected-entry.ts` 只负责把 Board controller、Host adapter、API 和 dialog 生命周期连接起来，不继续增长语义业务逻辑。

交互：

- `@`：全部可发现类别，按“能力、Skills、Plugins、Apps、MCP、文件”分组。
- `$`：打开同一个选择器并固定 `kind=skill`。
- `/skills`、`/apps`：切换到同一个选择器的对应筛选，不维护第二份列表。
- `/mcp`：继续显示状态，但数据来自同一个 MCP provider。
- 不可用项可以展示原因，但不能通过键盘或点击提交。
- `auth_required` 项触发 Codex 原生登录/认证流程，不在 Better Codex 保存凭证。
- MCP tool/resource 行显示“通过 <父目标> 使用”；选择时插入父目标引用，不伪装为 tool mention。
- 文件显示 workspace 相对路径；目录带独立图标和“当前版本未验证”状态。

样式只能进入 `src/ui/design/styles/features.ts` 并消费现有 `--bc-*` token，不新增 `--web-*` 或宿主专用产品样式。

### 8.3 排队回复编辑

当前仅更新 message 的 API 无法安全维护引用。实施后：

- 队列列表返回安全的 display parts，不返回私有 locator。
- 新 UI 编辑时恢复 `DraftInputDocumentV2`。
- 更新排队回复提交完整 `input_document`，Runtime 原子更新 `payload_json` 和 request fingerprint。
- 旧客户端只提交 message 时：无引用的队列继续允许更新；带引用的 V2 队列返回 `QUEUED_REPLY_DOCUMENT_REQUIRED`，不静默丢弃或错位引用。
- Promote-to-Steer 保留同一 V2 文档，并在 `turn/steer` 前重新编译。

## 9. 可观测性和错误契约

### 9.1 错误码

至少区分：

- `SEMANTIC_HOST_UNAVAILABLE`
- `DISCOVERY_PROVIDER_FAILED`
- `REFERENCE_HANDLE_EXPIRED`
- `REFERENCE_NOT_FOUND`
- `REFERENCE_STALE`
- `REFERENCE_DISABLED`
- `REFERENCE_AUTH_REQUIRED`
- `REFERENCE_RUNTIME_MISMATCH`
- `REFERENCE_HOST_MISMATCH`
- `REFERENCE_WORKSPACE_MISMATCH`
- `REFERENCE_OUTSIDE_WORKSPACE`
- `REFERENCE_MAPPING_UNVERIFIED`
- `REFERENCE_PARENT_UNAVAILABLE`
- `MCP_TARGET_NOT_DIRECTLY_ADDRESSABLE`
- `DIRECTORY_MENTION_UNVERIFIED`
- `APP_SERVER_VERSION_UNSUPPORTED`
- `APP_SERVER_REJECTED_INPUT`
- `SEMANTIC_INPUT_CONFLICT`
- `QUEUED_REPLY_DOCUMENT_REQUIRED`
- `LEGACY_REFERENCE_RESELECT_REQUIRED`

这些错误进入现有 HTTP error mapping、Session Host fail delivery 和 Issue reply 状态；不能统一包装为 `invalid_bridge_request`。

### 9.2 日志字段

所有 discover、resolve、compile、dispatch 和 approval 事件至少记录：

- `request_id`
- `command_id`
- `issue_id`
- `queue_item_id`
- `thread_id`
- `turn_id`
- `surface`
- `runtime_instance_id`
- `runtime_generation`
- `host_instance_id`
- `connection_epoch`
- `app_server_pid`
- `app_server_started_at`
- `app_server_version`
- `workspace_id_hash`
- `catalog_generation`
- `reference_id`
- `semantic_kind`
- `discovery_source`
- `addressability`
- `mapping_id`
- `stage`
- `outcome`
- `error_code`
- `upstream_error_code`
- `auth_status`
- `resolve_duration_ms`

禁止记录：

- prompt 全文。
- 本机绝对路径。
- Skill 的本机路径。
- MCP server command、环境变量或 token。
- resource 内容。
- 带凭证的 resource URI。

路径日志只允许 workspace 相对路径的脱敏形式或 Runtime 密钥派生的哈希。

### 9.3 历史错误处理

历史上曾观察到输入框只剩 `@` 时创建任务出现 `invalid_bridge_request`，但当前没有 payload、Bridge 日志和同版本复现，不能把它写成根因。

实施时必须分别捕获：

- 只有普通 `@` 文本。
- 只有一个 App 引用。
- 只有一个 Skill 引用。
- 只有一个文件引用。
- text item 为空但存在结构化引用。
- text item 和结构化引用同时存在。

记录错误发生在 UI 校验、Runtime 解析、Session Host 编译、`turn/start` 之前还是 App Server 返回之后。不使用补空格、补伪文本或吞错方式绕过。

## 10. 分阶段实施

每个阶段均可独立合并和使用；后续阶段停止时，已合并版本仍保持可用。

### 阶段一：V2 输入和执行前重验证

目标投入：3 至 5 个工程日。

涉及：

- `src/codex-input-document.ts`，新增。
- `src/codex-semantics.ts`。
- `src/db.ts`。
- `src/worker.ts`。
- `src/session-relay.ts`。
- `src/server.ts`。

工作：

- 建立 `DraftInputDocumentV2`、`InputDocumentV2`、`SemanticReferenceV2` 和 canonical fingerprint。
- 在已有 JSON 中双写 V1/V2，不提升 SQL schema。
- 让当前 Skill 和 App 选择经过 V2 document。
- Session Host 在 `turn/start` 和 `turn/steer` 前重新校验当前 Skill/App 和文件边界。
- Retry、排队、Promote-to-Steer 不再只复用旧编译结果。
- V1 历史命令保持可执行；无法还原引用位置时维持原有 text + references 顺序并标记 legacy，不伪造位置。

独立价值：即使后续选择器不扩展，当前 Skill/App 的队列、Retry 和 Steer 已使用统一模型和执行前校验。

完成门槛：

- 创建、首次启动、回复、队列、Retry 和 Steer 都经过同一个 V2 reader/compiler。
- V1 命令仍能执行。
- 新版写入的数据库可由旧版本打开，不触发 schema-too-new。
- 引用失效时在调用 App Server 前明确失败。

### 阶段二：同一 App Server 的统一发现服务

目标投入：3 至 4 个工程日。

涉及：

- `src/session-host-protocol.ts`。
- `src/session-host-client.ts`。
- `src/session-host.ts`。
- `src/session-relay.ts`。
- `src/codex-semantics.ts`。
- `src/server.ts`。

工作：

- 增加受限语义请求/响应协议和 method allowlist。
- 将 Skill、App 和文件发现切换到 Session Host 当前 App Server。
- 增加 Plugin、App metadata 和 MCP provider。
- 返回 safe candidate handle、catalog generation、partial/provider errors。
- 缓存绑定完整 Host/App Server identity。
- 现有 `/skills`、`/apps`、`/mcp` 和 `/mentions` 复用 provider。

独立价值：现有 Skill/App 菜单的发现实例与执行实例一致，MCP 状态和文件搜索拥有统一错误与缓存边界。

完成门槛：

- Runtime 不再为语义目录临时启动未标识的第二个 App Server。
- Host/App Server 重启后旧 handle 失效，新 catalog generation 生效。
- 单 provider 失败可见，全部失败返回请求错误。
- Session Host 忙于 active turn 时只读目录查询不会破坏 command channel；无法并发时明确返回 busy，不关闭连接。

### 阶段三：统一 `@` 选择器 MVP

目标投入：3 至 5 个工程日。

涉及：

- `src/ui/features/board/semantic-model.ts`，新增。
- `src/ui/features/board/semantic-controller.ts`，新增。
- `src/ui/features/board/semantic-view.ts`，新增。
- `src/ui/injected-entry.ts`。
- `src/ui/design/styles/features.ts`。
- `src/server.ts`。

工作：

- `@` 首批统一 Skill、App、经过验证的 Plugin 和文件。
- `$` 保留为 Skill filter alias。
- MCP server/tool/resource 进入搜索结果，但只允许 via-parent 或 informational。
- 接入有序 textarea draft model，保留重复引用和位置。
- Project create、Issue reply 和 Local Web 使用相同组件。
- Relay Web 在阶段四前只显示非文件本地能力；文件候选保持不可用，避免路径边界提前暴露。

独立价值：本地用户获得真实可用的统一 `@`，文件提及恢复可选，MCP 能力可发现但不会产生错误协议。

完成门槛：

- `@` 和 `$` 选择同一 Skill 后生成相同 reference 和 Skill UserInput。
- 文件选择后 UI 只显示相对路径，提交时 App Server 收到当前绝对路径 mention。
- 同名项目显示来源，不自动合并。
- 手工输入 `@foo` 保持文本。
- 中文输入法、粘贴、删除、重复引用、email 中的 `@` 和只有引用的输入行为明确。

### 阶段四：Relay、队列编辑与安全闭环

目标投入：3 至 4 个工程日。

涉及：

- `src/server.ts`。
- `src/db.ts`。
- `src/worker.ts`。
- `src/runtime-relay-client.ts`。
- `src/relay-protocol.ts`。
- `src/ui/injected-entry.ts` 和 Board semantic files。

工作：

- Relay Web 使用 safe handle 和 V2 document，不发送绝对路径或 Runtime-only locator。
- 候选 handle 绑定 Runtime、workspace、用户和 Host identity。
- 文件搜索始终由本地 Runtime/Session Host 执行。
- 排队回复查看和编辑使用 safe display parts 与完整 V2 document。
- Runtime 离线、Host 更换、handle 过期和本地审批不可远程处理时给出明确状态。
- 网络不确定结果继续使用现有 request receipt/idempotency 机制，V2 fingerprint 参与冲突判断。

独立价值：远程和本地入口达到一致语义及安全边界，队列编辑不再破坏结构化引用。

完成门槛：

- 浏览器网络记录、Relay 帧和日志均无绝对路径或敏感 MCP 字段。
- Relay 无法伪造工作区外文件或另一 Runtime 的 handle。
- Runtime 离线时普通历史内容可读，但发现与结构化提交明确不可用。
- 带引用的排队回复可编辑、删除、Promote-to-Steer，并在执行前重验。

### 阶段五：Browser、Computer、Chrome、目录的证据门控开放

目标投入：2 至 4 个工程日。

涉及：

- `src/codex-semantics.ts` 的 NativeCapabilityMapper。
- `src/session-relay.ts` 的 mapping registry/compiler。
- Board semantic files。
- `plan/evidence/unified-mentions-2026-08-25/`，保存脱敏协议和验收记录。

工作：

- 对当前 0.149.1 捕获 Browser、Computer、Chrome、具体 App、Plugin 和目录的真实 payload 及审批事件。
- Browser/Computer 优先映射到实际发现的 Plugin Skill；只有原生证据指向 Plugin/App mention 时才使用 mention。
- Chrome 按实际 discovery provenance 映射，不建立名称特判。
- 目录通过真实 `turn/start` 后启用；若 App Server 拒绝，保留可见但不可提交状态和上游错误证据。
- MCP 保持 via-parent/informational；只有未来协议出现新结构化输入时再另行升级，不在本计划中创造直接 MCP mention。

独立价值：在不破坏既有 MVP 的前提下开放当前版本可证明的原生 Computer/Browser 能力，并为不支持项提供诚实状态。

完成门槛：

- Browser 实际打开并操作内置浏览器。
- Computer Use 的授权和审批仍由 Codex 展示。
- Chrome 或具体 App 确实使用被选中的目标。
- 未登录 Plugin 保留原生认证路径。
- 目录得到真实接受或真实拒绝结果。
- 每个启用 mapping 都有版本、payload、事件和结果证据。

## 11. 验收矩阵

### 11.1 输入组合

- 纯文本。
- 纯 Skill。
- 纯 App。
- 纯 Plugin。
- 纯文件。
- 只有一个引用且没有普通文本。
- 文本与一个引用交错。
- 多种引用交错。
- 同一引用出现两次。
- 相同名称来自不同 provider。
- 引用后继续输入中文、粘贴、撤销和删除。

### 11.2 生命周期

- 创建 Agent Issue 后立即启动。
- 创建后延迟调度。
- 已有 Issue 回复。
- active turn 中排队回复。
- 队列 Promote-to-Steer。
- Retry 失败命令。
- Runtime 重启后 dispatch。
- Session Host/App Server 重连后 dispatch。
- 排队期间 Plugin 禁用或认证过期。
- 排队期间 Skill 消失。
- 排队期间文件移动、删除或替换为工作区外 symlink。
- request outcome unknown 后使用同 request ID 恢复。

### 11.3 宿主

- Codex 注入宿主。
- 本地 WebUI。
- Relay WebUI。
- 宽、窄、亮、暗布局。
- macOS 和 Windows；文件路径、分隔符和 symlink/junction 分别验证。

### 11.4 现有验证命令

不新增测试代码；复用并在现有检查失效时更新已有验证：

```bash
npm run typecheck
npm run build
npm test
npm run test:web:smoke
npm run test:web
npm run test:acceptance
git diff --check
```

静态和 Web 检查不能替代真实 Codex 验收。最终必须记录实际 App Server payload、真实审批、Browser/Computer/App 行为和 Relay 网络边界。

## 12. 失败攻击与设计变形

### 12.1 依赖失败

如果 Session Host 或 App Server 不可用：

- 普通文本输入保持可用。
- 已选结构化引用不能提交，显示准确故障。
- 目录请求不回退到另一个 App Server。
- 已排队命令保持 pending/failed 可恢复状态，不转成纯文本执行。

### 12.2 规模扩大

最先失效的是全量 MCP tool/resource 搜索。防护：

- 查询阈值。
- provider 分页。
- 取消旧请求。
- 每 server 懒加载。
- 限制单响应条数和字节数。
- provider 独立 deadline。

### 12.3 回滚

- 不提升 SQL schema；V2 只加入现有 JSON envelope。
- 新写入同时包含 V1 compatibility input。
- 关闭 `unifiedMentionCatalog` capability 后，旧 `$` Skill 和 `@` App UI 可继续读取 V1 catalog。
- 阶段提交独立；任一阶段回退不删除数据库记录。
- 已经写入但旧版本无法表达的新引用不得自动降级；在开放新 mapping 前必须证明其 V1 compatibility input 可执行。

## 13. 风险和最脆弱假设

### 13.1 最脆弱假设

本计划假设 Session Host protocol 可以在不破坏 command polling、connection epoch 和 active turn 的前提下处理受限只读语义请求。

如果该假设不成立：

- 发现层使用单独的、明确标记为 probe 的短生命周期 App Server。
- probe 结果只能用于 UI 候选，必须显示其来源和 generation。
- 最终 `turn/start` 前仍由 Session Host 当前 App Server 重新验证和编译。
- probe 不得成为可用性的最终证明，也不得在 Session Host 不可用时允许结构化提交。

该变形保留安全边界和执行正确性，只降低目录刷新速度，不改变数据模型与 UI。

### 13.2 主要风险

- textarea 锚点维护不完整导致引用错位。
- Host semantic request 与 active command 并发产生协议级阻塞。
- Plugin/App/MCP 元数据无法稳定表达父子关系。
- V1/V2 双写产生不等价 fingerprint。
- Windows junction、大小写和路径标准化与 macOS 行为不一致。
- UI 过早显示“可用”导致用户误以为 MCP tool 可直接寻址。
- 语义 provider 错误被当前通用错误处理压缩成单一 Bridge 错误。

每项风险均由前述 fail-fast、identity 绑定、V2 canonicalization、真实桌面验收和显式 addressability 状态控制。

## 14. 非范围

- 不增加 Better Codex 官方 MCP 托管服务、账号或跨设备数据库同步。
- 不改变 Runtime 的数据库唯一写入权。
- 不允许 Relay Web 直接读取本机文件。
- 不实现新的 OAuth、密码或凭证存储。
- 不替代 Codex 的审批、登录和权限模型。
- 不创造未出现在当前协议或真实 payload 中的 URI。
- 不引入 React、Vue、Svelte、Web Components 或第二套前端入口。
- 不在本计划中发布 Preview、Stable 或部署生产服务。

## 15. 推荐方案与被拒绝方案

推荐：完成 V2 有序输入、同 App Server 发现、Session Host 执行前编译和统一 `@`，先支持 Skill/App/验证后的 Plugin/文件，再按证据开放 Browser/Computer/Chrome/目录；MCP 保持 via-parent/informational。

被拒绝：只修改 `src/ui/injected-entry.ts` 菜单，把更多名称映射成 URI，并继续提交 `message + semantic_references[]`。该方案改动较少，但无法解决引用位置、同实例发现、Relay 路径边界、队列过期、Retry 重验证和未知协议映射，不能作为可发布实现。

最小实施边界：阶段一至阶段三。完成后已有 Skill/App 更可靠，`@` 可统一选择 Skill、App、验证后的 Plugin 和文件，MCP 可发现但不冒充直接 mention。阶段四是公开 Relay 使用前的硬门槛，阶段五是宣称 Browser/Computer/Chrome/目录支持前的硬门槛。

## 16. 实施交接

实施顺序固定为阶段一到阶段五，每阶段完成后：

1. 运行现有静态、构建和 Web 验证。
2. 验证旧 V1 数据和旧命令。
3. 验证当前阶段新增的真实 App Server payload。
4. 检查 Runtime、Host、App Server identity 和错误日志。
5. 检查无关工作树改动未被覆盖。
6. 提交当前阶段，下一阶段从该提交继续。

所有阶段完成后再决定 Preview 发布；计划完成本身不构成发布、安装或真实桌面验收证据。
