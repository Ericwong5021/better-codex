# App Server Protocol Evidence

## 同实例身份

隔离 Runtime 与 Session Host 建立认证连接后，语义响应持续返回以下身份字段：

```json
{
  "host_instance_id": "<host-instance>",
  "app_server_pid": "<pid>",
  "app_server_started_at": "<timestamp>",
  "app_server_version": "0.149.0-alpha.4.1",
  "catalog_generation": "<host-instance>:<generation>:<pid>:<timestamp>"
}
```

Runtime 没有为目录请求启动第二个 App Server。Host 或 App Server identity 改变后，旧候选 handle 会失效。

## 发现接口

当前 App Server 返回的结构形状：

- `skills/list`：`data[].skills[]`，包含 Skill name、path、scope、enabled 和 interface 元数据。
- `app/installed`：`apps[]`，包含稳定 App ID、runtimeName、enabled 和 callable。
- `plugin/installed`：`marketplaces[].plugins[]`，包含 Plugin ID、安装状态、启用状态和 interface 元数据。
- `fuzzyFileSearch`：`files[]`，包含 path、file_name 和 match_type。
- `app/list`：当前账号路径返回 RPC `-32603`，根因是上游 HTTP 403。

聚合服务在 `app/list` 失败时继续返回其他 provider 的结果，状态为 `partial`，公开错误固定为 `DISCOVERY_PROVIDER_FAILED`；本地诊断只记录 `UPSTREAM_HTTP_403`。

## Browser、Computer Use 与 Chrome

同实例目录的脱敏结果：

| 查询 | 可提交 Skill | Plugin 状态 |
| --- | --- | --- |
| browser | `browser:control-in-app-browser`、`chrome:control-chrome` | Browser `unverified` |
| computer | `computer-use:computer-use` | Computer Use `unverified` |
| chrome | `chrome:control-chrome` | Chrome `unverified` |

Browser 插件实际创建并操作了一个本地 WebUI 标签页。Computer Use 对 Codex 应用返回安全限制，对 Finder 返回未授权状态；实现保留原生授权边界，没有自动批准或降级为伪造 mention。

## 目录输入

以下脱敏输入分别在终端 Codex `0.149.1` 和 Session Host 实际使用的 `0.149.0-alpha.4.1` 上得到 `turn/start` 接受响应：

```json
[
  {
    "type": "mention",
    "name": "board",
    "path": "<workspace>/src/ui/features/board"
  }
]
```

实现将目录 mapping 绑定到实测 App Server 版本。其他版本继续返回 `unverified`。执行前编译会再次验证 realpath、workspace 边界、目标仍为目录以及 mapping version。
