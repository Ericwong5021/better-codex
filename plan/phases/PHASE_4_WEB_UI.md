# Phase 4：独立 Web UI

更新日期：2026-08-12

本文件原方案已经被 [Self-hosted Hub 与 Web UI 实施计划](../modules/PLAN_SELF_HOSTED_WEBUI.md)取代。

## 调整原因

- 当前代码没有独立 React 前端，现有 Web 基础直接复用 injectionScript 和 Runtime API。
- codex/web-ui-recovered 已经验证 Browser Host、同源 Web Session 和双宿主方向。
- Web UI 不再只是未来降级界面，而是共享功能的主要自动化调试宿主。
- Selfhost 需要复用同一套 UI，不能继续维护独立 Hub 页面和第二套领域逻辑。
- Codex Desktop 权限、CDP 和原生导航难以稳定自动化，因此只保留最小安装态人工冒烟。

## 当前阶段对应关系

| 原 Phase 4 内容 | 新计划阶段 |
| --- | --- |
| 本地 Browser Host | 阶段 1 |
| 双宿主与共享功能 | 阶段 1、阶段 2 |
| Web 自动化与故障恢复 | 阶段 2 |
| 远端只读 Web UI | 阶段 3 |
| 远程编辑 | 阶段 4 |
| 公网认证与部署 | 阶段 5 |

## 保留边界

- Browser 和 Codex Host 共享领域逻辑、状态规则和 Runtime API。
- Browser 不直接读取或写入 SQLite。
- 本地 Runtime 继续只监听 loopback。
- Web 自动化不冒充 Codex 原生权限和安装态验证。
- Thread 与 Session 的真实打开、输入权和权限行为仍由 Codex 最小人工验收确认。

后续不在本文件继续增加实施细节，所有范围、文件目标、验收、自动化矩阵、CI 和回滚规则统一维护在新计划中。
