# Relay API 清单

## Runtime 本地接口

Relay 模式复用以下 Runtime 路由，不实现第二套业务状态机。

### 页面与静态资源

| 方法 | 路径 |
| --- | --- |
| GET | `/web` |
| GET | `/web/projects` |
| GET | `/web/projects/:projectId` |
| GET | `/web/host.css` |
| GET | `/web/host.js` |
| GET | `/web/injection.js` |
| GET | `/web/manifest.webmanifest` |
| GET | `/web/service-worker.js` |
| GET | `/better-codex-icon-192.png` |
| GET | `/better-codex-icon-512.png` |

### Runtime 与实时状态

| 方法 | 路径 |
| --- | --- |
| GET | `/health` |
| GET | `/api/bootstrap` |
| GET | `/api/events` |
| GET | `/api/account/usage` |
| GET | `/api/remote-access/status` |
| GET | `/api/update` |
| POST | `/api/update/check` |
| POST | `/api/update/install` |

### 项目与系统

| 方法 | 路径 |
| --- | --- |
| GET, POST | `/api/projects` |
| POST | `/api/projects/ensure` |
| GET | `/api/projects/:projectId` |
| POST | `/api/projects/:projectId/overview` |
| POST | `/api/system/directory` |

### Issue 与会话

| 方法 | 路径 |
| --- | --- |
| GET, POST | `/api/issues` |
| POST | `/api/issues/attachments` |
| GET, PATCH, DELETE | `/api/issues/:issueId` |
| POST | `/api/issues/:issueId/move` |
| POST | `/api/issues/:issueId/start` |
| POST | `/api/issues/:issueId/stop` |
| POST | `/api/issues/:issueId/archive` |
| POST | `/api/issues/:issueId/unarchive` |
| GET | `/api/issues/:issueId/conversation` |
| POST | `/api/issues/:issueId/reply` |
| POST | `/api/issues/:issueId/session-handoff` |

### Agent 与设置

| 方法 | 路径 |
| --- | --- |
| GET, POST | `/api/agents` |
| GET, PATCH, DELETE | `/api/agents/:agentId` |
| GET, PATCH | `/api/settings/auto-dispatch` |
| GET, PATCH | `/api/settings/scheduler-model` |
| GET, PATCH | `/api/settings/scheduler-reasoning-effort` |

### Runtime 内部接口

`/api/session-relay/*`、`/api/mockup/*`、`/api/shutdown` 与 `/api/sync/*` 不向公网浏览器开放。Relay Runtime Client 只向本地 Runtime 注入本地 Bearer Token。

## Relay 保留接口

| 方法 | 路径 |
| --- | --- |
| GET | `/healthz` |
| POST, GET | `/relay/session` |
| DELETE | `/relay/logout` |
| GET | `/relay/status` |
| GET | `/relay/device` |
| POST | `/api/v1/device-authorizations` |
| GET | `/api/v1/device-authorizations/:authorizationId` |
| POST | `/api/v1/device-authorizations/:authorizationId/token` |
| POST | `/api/v1/device-authorizations/:authorizationId/approve` |
| POST | `/api/v1/devices/pair` |
| GET | `/api/v1/runtime/connect` WSS |

除 Relay 保留接口和 Runtime 内部接口外，页面、静态资源与 `/api/*` 请求均实时转发到当前 Runtime。

## 旧 Hub 接口

灰度回滚窗口内保留旧 `/api/v1/sync/*`、`/api/v1/control`、Projection、Conversation Projection 和 Remote Command 路由。Relay 模式不调用这些接口。稳定后删除旧实现和数据清理迁移。
