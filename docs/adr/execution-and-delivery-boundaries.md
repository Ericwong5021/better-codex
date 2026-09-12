# 执行、投递与发布边界

状态：Accepted，2026-09-08。

## 决策背景

BET-398 的绑定命令返回线程 ID 后，Host 以 `command_complete:bind` 结束了创建线程的进程。后续 `thread/resume` 失败，首次 turn 没有启动。当前 Codex 的隔离验证表明：空线程可能尚未 materialize；返回线程 ID 或路径不等于该路径已经可恢复。固定等待不能建立持久化保证。

审视范围覆盖 Issue 创建与调度、Session Host 与 App Server、Runtime 数据库及回执、Relay 和兼容 Projection Sync、WebUI、构建、CI、更新切换与回滚。此次采用现有进程边界内的模块化重构，不引入新的服务、数据库或消息中间件。

## 状态与所有者

| 对象 | 权威所有者 | 完成证据 | 恢复方式 |
| --- | --- | --- | --- |
| Issue、原始输入、调度意图 | Runtime SQLite | 事务提交 | 重启后读取持久队列 |
| 线程 ID 分配 | 线程 worker | `thread/start` 响应与 checkpoint | 未持久化时保留原 worker |
| 首次执行 | 同一线程 worker | `turn/start` 和 turn checkpoint | 原线程继续；已启动 turn 不重放为新线程 |
| 线程历史 | Codex | 返回的 rollout 路径已非空 | 后续 worker 恢复原线程 |
| Host 到 Runtime 事件 | Host 持久队列 | Runtime 事务与 receipt 提交后 ACK | 按 sequence 重放 |
| 浏览器写请求 | 浏览器本地队列，随后 Relay/Runtime 接收 | 持久接收或确定的业务结果 | 同一 Command ID 重试 |
| 远程业务数据 | Runtime | Runtime 查询结果 | Relay 转发，不增设业务副本 |
| 版本交付 | 同 SHA 的 CI 与签名产物 | 质量门禁、签名、安装及 readyz | 持久更新事务与 generation fencing |

这些证据不可互换。202 表示已接收，不能显示为已执行；命令派发不等于 turn 已开始；进程可回应不等于已恢复业务服务。

## Issue 调度与线程生命周期

新 Issue 先保存内容。首次执行的持久 `start` 命令在一个 worker 内完成线程创建和首次输入，不再为所有空卡片提前建立独立 `bind` 命令。这同时去除两个命令之间的进程回收窗口，以及大量未执行卡片占用常驻 worker 的问题。

已有 `bind` 队列保持可消费。其创建的线程在首次持久化前保留原 worker；同一 worker 的首次输入直接使用已加载线程，不从磁盘 resume。Host 状态报告 `awaiting_persistence`，命令结果报告 `persistence`。原 worker 丢失时保留错误，不通过重复改名或固定 sleep 掩盖它。

已经开始过 turn 的线程保持原有绑定。现有首次启动失败补偿只适用于没有活跃 turn 和历史 turn 的空会话；旧 command/checkpoint 记录保留追踪依据。不得将已有对话当作空会话重建。

线程执行与全局领单分离：Host 最多同时处理 8 个命令，SQLite 拒绝同时领取同一 Issue 的两个命令，每个 worker 内部继续串行。此限制约束启动与控制 RPC 的并发，不替代 Agent 的执行并发上限。停止命令仍保留队列优先级。

`src/session-relay.ts` 管理领单、worker 所有权、回收和 handoff。`src/session-app-server.ts` 管理一个 App Server 的协议、已加载线程、turn 与事件。数据库不控制子进程；协议适配器不直接写业务数据库。

## 目录发现

模型列表与语义目录都通过 Host 的唯一 catalog App Server 读取。Runtime 的模型模块只负责规范化、按 Host 身份缓存和暴露错误，不再临时启动 App Server，也不尝试其他 executable 后用静态模型表伪装成功。

静态模型表只供显式 Mockup 使用。真实 bootstrap 可以返回可浏览的项目和 Issue，同时用 `agentModelCatalogError` 明确报告目录故障。模型选择与设置仍要求真实目录校验。

模型发现、worker 和 Host 的版本记录需要一起判断。此次能力变更通过 `thread_binding_lifecycle` 门槛触发不兼容旧 Host 的正常 drain/replacement，不把新 Runtime 连接成功当作新 Host 代码已经生效。

## 远端命令与同步

`src/web-command-policy.ts` 是浏览器、Runtime 和 Relay 共用的命令路由与响应分类来源，保持为无 Node 依赖的纯策略模块。`src/command-contract.ts` 只增加服务端的信封、指纹和字节数据。

命令正文上限统一为 2 MiB。计划任务和项目删除不再出现浏览器与服务端白名单不同的情况。401、408、425、429、5xx 和结果未知不被当作业务终态。确定的拒绝可以结束投递，但不能显示为成功。

浏览器只有在 IndexedDB 写入成功后才可返回“本地已排队”。解析失败的响应不构成删除本地副本的依据。同一页面只有一个 drain；同一实体的后续命令不能越过尚在退避的前序命令，不同实体可以继续。

UI 对命令结果的观察集中在 `src/ui/core/command-observer.ts`：同一个 Command ID 共用轮询，超时只结束当前等待者，卸载时清理观察器。业务投递由持久队列负责，不依赖页面定时器存活。

Projection Sync 继续作为回滚兼容路径保留。Relay 模式根据实际注册的投影 Outbox trigger 禁用投影写入，避免后来新增的 session-command trigger 遗漏。兼容模式下模型目录错误单独同步为 `agent_models_error`，不阻止 Issue 数据投影，也不假造可选模型。

## WebUI

三个宿主继续消费同一个生成入口。宿主负责连接、鉴权、传输和主题；失败空状态的产品判断放在 Board model 中。

会话空状态分别表达尚未开始、正在启动、正在处理、启动失败和执行失败。缺失线程历史时要求先解决绑定问题，保留原始原因及输入，不再在失败状态中展示鼓励直接继续的通用空对话提示。

`injected-entry.ts` 仍有较多历史产品逻辑。此次按真实状态所有权拆出命令观察和会话状态，不机械地把大文件切成多个互相依赖的闭包文件。后续迁移必须按完整 feature 的状态、API 意图、生命周期一起移动。

## 构建、CI 与升级

`npm run build` 只生成和编译；不会更新本机安装、停止 Runtime 或刷新注入。显式 `npm run dev:refresh` 才触发本机刷新。验证与生产进程操作不再隐式耦合。

CI 同时支持普通提交与 reusable workflow。Release 与 Preview 在版本校验后调用同一个 CI，以标签对应 SHA 完成类型、后端、WebUI、部署验收、打包与安装检查，然后才发布。Release 内重复的检查定义移除，避免两套检查逐渐漂移。

Runtime 更新继续复用持久 update operation、drain、Host capability 协商、投递 replay、generation fencing、readyz 和回滚。新增生命周期能力写入签名 manifest，旧 Host 未声明时必须完成受控替换。处于未持久化状态的旧 worker 不能被误判为空闲而强制结束。

一次更新固定操作 ID、请求参数、频道、签名 manifest 和原版本指针。暂存阶段完成签名、摘要、隔离启动预检及原版本产物保留，随后才进入切换。版本化文件日志负责跨进程进度，业务数据库继续保存 operation 生命周期，schema 保持兼容。读取状态只观察；Runtime 启动和激活器通过操作身份与进程代次协调恢复，不允许查询接口或启动器自行选择回退版本。

切换失败先保存 `rolling_back` 意图，再停止身份匹配的目标 Runtime。恢复指针不代表恢复完成：原版本、指针、Host 重连、投递重放、业务 reconciliation 和服务就绪全部通过后才提交 `ROLLED_BACK`。激活器中断由 Runtime 接管恢复；恢复失败保留错误和日志并暂停激活。已经提交的操作拒绝迟到失败，业务数据库不随二进制回滚恢复备份，避免覆盖已确认的数据。

`/readyz` 检查服务依赖，不再等待 Codex 注入。响应另列 `desktop` 状态：`ready`、`waiting_window`、`disabled`、`failed`。桌面记录携带 Runtime instance/generation、profile、兼容包及文档身份，旧代次探测只能视为待重探测。detached、听写和头像辅助窗口不参与兼容判定；加载和无窗口属于等待状态，主窗口能力缺失或 bootstrap 确认失败才报告集成故障。后台 injector 随窗口出现及文档重载恢复，不修改用户的注入偏好。

CLI 安装客户端持久保存原请求键和操作 ID，接收回执丢失后复用原请求，等待终态时使用 `/readyz` 验证目标版本。macOS、Windows 安装器以 Runtime 操作完成为提交点；之后桌面或安装附件检查失败不能再执行文件回退，也不会为升级强制启动 Codex。

VPS 的 `request`、`request.running`、`operations/<id>.json` 和请求指纹索引保存真实操作。查询未知 ID 返回 404，重复请求返回原操作；stable/preview 使用同一版本选择规则，Preview 可接收已经转正的 Release。宿主执行器使用 OS 文件锁，阶段及耗时以原子文件写入，最多接管一次中断操作，随后暂停并保留现场。切换前保存原镜像 digest、保留镜像标签及解析后的 Compose 配置，回退直接使用保留产物；内部与公网 `/readyz` 均验证实际版本，数据库不回退。宿主需要 Python 3 和 flock。升级脚本通过原子替换安装，避免正在执行的脚本被覆盖截断。

## 保留的边界与风险

- 本次不修改业务数据，不自动重试 BET-398，不部署本机或 VPS。新代码的上线需要正常发布与能力切换。
- 若旧空线程的原进程已经退出且没有历史，无法从不存在的 rollout 还原该线程。原始 Issue 输入仍在，修复代码不等于历史已恢复。
- 旧 `bind` worker 在首次输入前会占用进程；新建 Issue 已走惰性启动，旧队列只能按已知意图继续或由明确的删除操作释放。未持久化 worker 会阻挡要求替换 Host 的升级，这是防止丢失的限制。
- 非空 rollout 是本机进程重启的释放依据，不宣称操作系统断电后的 fsync 保证。真正的跨版本持久化能力仍受 Codex 协议契约约束。
- 原生 Codex 原位升级时，存活 catalog 和随后创建的 worker 仍可能出现版本差异；状态包含版本信息，但不能把同一个文件路径视为同一个二进制版本。该边界需要独立的 generation 协商，不适合在活动 worker 存在时直接重启全部进程。
- 请求回执提供至少一次投递和幂等消费，外部副作用仍必须各自拥有持久意图或幂等键。不能将 HTTP 成功回执包装成跨进程的分布式事务承诺。
- Projection Sync 不是新增功能的第二份业务实现；新远程能力优先进入 Runtime API 和 Relay 透传。删除兼容路径必须另有明确迁移与回滚窗口。

## 验证入口

- `npm run verify`：类型、生成产物、设计 token 与现有后端验证。
- `npm run test:web`：真实 Chromium 中的本地与远程共享 UI。
- `npm run test:acceptance`：流式 Web 链路和 Docker 自部署生命周期。
- `test/gateway.test.ts` 的既有进程级场景现在模拟首次输入前未落盘，验证旧 bind → 同 worker 首次 turn → Runtime handoff → 终态释放。
- `test/codex-cli.test.ts` 的既有 executable 约束检查跟随实际进程所有者迁移到 Session Host adapter。
