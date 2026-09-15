# Better Codex Design System 验收证据

验收日期：2026-08-25

对应计划：[`PLAN_DESIGN_SYSTEM_UNIFICATION.md`](../../modules/PLAN_DESIGN_SYSTEM_UNIFICATION.md)

## 自动验证

| 命令 | 结果 |
| --- | --- |
| `git diff --check` | 通过 |
| `npm run check:design-tokens` | 通过 |
| `npm run typecheck` | 通过 |
| `npm test` | 266 项，255 通过，11 跳过，0 失败 |
| `npm run build` | 通过 |
| `npm run test:web:smoke` | 2/2 通过 |
| `npm run test:web` | 9/9 通过 |

## 真实 Codex 宿主

通过 Codex Desktop 的真实 CDP 页面验证统一生成入口，不以 WebUI 结果替代。已覆盖：

- Board：亮色、暗色、卡片密度和主工具栏。
- Agents：亮色目录、详情区和宽布局。
- Projects：亮色列表、Badge 和主操作。
- Scheduled：亮色空状态与 bridge 路由。
- Settings：暗色 Dialog、FieldShell 和操作区。
- 响应式容器：面板默认 `wide`；宽度设为 390px 后由 `ResizeObserver` 切换为 `narrow`，工具栏变为纵排；恢复宽度后回到 `wide`。
- 主题诊断：真实 Codex 未提供完整主题字段时记录 `themeSource=fallback`，界面仍使用规范语义令牌，降级状态没有被隐藏。

## 截图索引

- `codex-board-light.png`
- `codex-board-dark.png`
- `codex-agents-light.png`
- `codex-projects-light.png`
- `codex-scheduled-light.png`
- `codex-settings-dark.png`
- `web-board-wide-light.png`
- `web-board-wide-dark.png`
- `web-board-compact-light.png`
- `web-board-narrow-dark.png`

截图仅作为当前版本视觉证据。动态数据、运行状态和发布状态仍以 Runtime、测试输出和发布资产分别核验。
