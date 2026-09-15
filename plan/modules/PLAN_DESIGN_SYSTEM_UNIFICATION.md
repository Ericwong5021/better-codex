# Better Codex 统一前端与 Design System 实施计划

更新日期：2026-08-25

状态：核心实施完成，当前版本验收通过

适用范围：Codex 注入宿主、本地 WebUI、Relay WebUI 的共享业务界面

## 0. 当前版本实施结果

本计划已在 `main` 上完成共享 Design System、统一浏览器入口、原生 DOM 组件生命周期、feature 边界、宿主别名退役和验收闭环。当前实现以 `src/ui/design/registry.ts` 为唯一令牌注册表，以 `src/ui/injected-entry.ts` 为浏览器组合入口；Codex 注入宿主、本地 WebUI 与 Relay WebUI 消费同一份生成产物。

实现后的准确边界如下：

- 共享视觉值统一使用规范 `--bc-*` 语义令牌，源码、测试与脚本中已无 `--web-*` 消费者。
- Button、IconButton、Badge、EmptyState、InlineFeedback、FieldShell、Dialog、Menu、Notice 等高频共享控件已进入统一生命周期契约。
- Settings、Scheduled、Projects、Agents、Board 已建立独立的 controller、model、view 边界；`src/dom.ts` 只保留运行期配置、资源序列化与生成入口调用。
- `src/ui/injected-entry.ts` 保留为单一浏览器组合根，承载跨 feature 的 Board、Session、实时状态和宿主编排。feature 私有视图不会因为只有一个消费者而被伪装成通用组件；后续只有出现第二个真实消费者时才继续上移抽象。
- Codex 主题缺失时使用可观测 fallback，并记录 `themeSource`、缺失字段和能力签名；产品状态色不从宿主 accent 派生。
- 面板布局由实际容器宽度归一为 `narrow | compact | wide`，不依赖 Codex 窗口 viewport 猜测。

当前版本验证结果：

| 证据层 | 结果 |
| --- | --- |
| 源码与令牌 | `git diff --check`、`npm run check:design-tokens`、`npm run typecheck` 通过 |
| 单元与结构 | `npm test`：266 项，255 通过，11 跳过，0 失败 |
| 构建 | `npm run build` 通过，生成入口与本地开发 App 刷新成功 |
| Web 浏览器 | `npm run test:web:smoke`：2/2；`npm run test:web`：9/9 |
| 真实 Codex | Board 亮/暗、Agents、Projects、Scheduled、Settings 已走查；容器从 wide 压缩到 390px 时正确切换 narrow，恢复后回到 wide |
| 环境恢复 | 临时 Mockup Runtime 与注入已停止，稳定版 Runtime 和 `watch-inject` 已恢复 |

视觉证据保存在 [`plan/evidence/design-system-2026-08-25/`](../evidence/design-system-2026-08-25/README.md)。本计划完成不代表所有业务 DOM 都应成为共享组件；“可复用”只适用于存在稳定契约和真实重复消费者的层级。

## 1. 计划目标与实施前结论

实施前的 Better Codex 已经具备一套较成熟的主题与样式基础，但还不能认定为“完整统一的 Design System”或“组件已经完全模块化复用”。当时的真实状态是：

- 颜色、间距、圆角、动效等基础变量主要集中在 `src/design-system.ts`，并通过 `--bc-*` 变量覆盖多数共享样式。
- Codex 外观输入已经能通过 `src/appearance.ts` 与 `applyAppearance()` 映射到 Better Codex 主题变量。
- 注入宿主与 WebUI 复用同一套业务 UI 源码，WebUI 通过 `--web-*` 到 `--bc-*` 的兼容别名工作。
- 业务 DOM、事件、状态与布局仍高度集中在 `src/dom.ts`；样式集中不等于组件可复用。
- 现有检查能阻止硬编码颜色和未定义颜色变量，但还没有治理间距、字号、圆角、层级、断点和动效字面量。
- 现有 E2E 覆盖主题、移动视口和关键交互，但尚无稳定的视觉基线，也不能替代真实 Codex 宿主中的人工验收。

因此本计划不重写产品，也不引入 React、Vue 或另一套视觉语言。目标是在保持当前原生 DOM 架构、Runtime 权威边界和 Codex 原生观感的前提下，将现有“集中式样式 + 单体 DOM”演进为：

```text
Codex appearance / Web bootstrap
                ↓
          Host Theme Provider
                ↓
Theme Adapter: validate → normalize → derive → diagnose
                ↓
       Canonical semantic tokens
                ↓
 primitives → components → patterns
                ↓
          feature/page views
                ↑
 feature controller / state / API / transport
```

完成后的判断标准不是文件数量，而是以下四点同时成立：

1. 所有共享视觉值有唯一语义来源，宿主差异通过适配器进入，不在功能代码中散落覆盖。
2. 高频通用控件拥有可更新、可销毁、可观测的原生 DOM 组件契约。
3. Codex 注入宿主和 WebUI 共享同一组件与样式实现，只保留挂载、主题输入、传输和宿主能力差异。
4. 每次迁移都能用静态检查、现有自动化、WebUI 浏览器验收和真实 Codex 人工验收给出证据。

## 2. 实施前代码事实

### 2.1 已有基础

| 能力 | 当前实现 | 结论 |
| --- | --- | --- |
| 主题入口 | `src/appearance.ts`、`src/dom.ts` 中的 `applyAppearance()` | 可保留输入模型，需要明确适配契约与诊断 |
| 设计变量 | `src/design-system.ts` | 已有基础，但文件过大且令牌、兼容别名、组件样式混杂 |
| 共享 UI | `src/dom.ts` 的 `injectionScript()` | 两类宿主共用，但业务、DOM、事件和样式耦合过重 |
| Web 宿主 | `src/web-host.ts`、`src/web-app.ts` | 已有独立宿主壳层，仍存在 `--web-*` 兼容层 |
| Token 检查 | `scripts/check-design-tokens.mjs` | 已覆盖颜色定义、外部定义和未定义引用，治理维度不足 |
| 单元与结构验证 | `test/dom.test.ts` | 已有设计变量和注入源码结构断言，可在迁移时更新 |
| Web E2E | `test/e2e/web/shared-regression.spec.ts` | 已覆盖英文、暗色、移动端、主题与常用交互 |
| 构建链 | `package.json`、`scripts/package.mjs`、`scripts/refresh-injector.mjs` | 当前以 TypeScript 编译和服务端打包为主，不应误判为已有浏览器 IIFE 组件构建 |

静态盘点显示，当前大约有 119 个 `--bc-*` 定义、537 个 Better Codex CSS 类、110 处 HTML 构造点；在 `src/design-system.ts` 之外仍存在约 48 处数值圆角、34 处数值字号和 163 处数值间距声明。数字只用于确定治理规模，不作为完成度指标。

### 2.2 根因判断

当前不统一问题的根因不是“缺少更多 CSS 变量”，而是四个层次没有形成清晰依赖方向：

- Token 定义、组件样式、兼容别名和响应式规则集中在单个大文件中，缺少机器可读的规范层。
- `src/dom.ts` 同时承担业务控制器、视图模板、组件状态、事件绑定、生命周期与宿主集成。
- Codex 与 WebUI 的差异以变量别名和局部条件散落表达，没有显式 Host Adapter 契约。
- 自动检查偏向颜色正确性，尚未形成视觉回归、组件状态矩阵和真实宿主证据链。

继续在现有大文件里追加局部 class、硬编码尺寸或兼容覆盖，只会提高迁移成本，不能形成真正的复用。

## 3. 范围与非范围

### 3.1 本计划包含

- 建立唯一的设计令牌注册表和分层语义。
- 将主题处理整理为可验证、可诊断的 Theme Adapter。
- 建立原生 DOM 组件生命周期契约。
- 优先抽取低风险、高重复组件，再迁移覆盖层与复杂模式。
- 将 `src/dom.ts` 按功能边界拆分，同时保持公开注入入口兼容。
- 统一 Codex 注入宿主、本地 WebUI 和 Relay WebUI 的组件及样式实现。
- 扩展现有检查与验收矩阵，建立新增债务的阻断机制。
- 清理确认无消费者的旧别名和重复规则。

### 3.2 本计划不包含

- 不改 Runtime、Relay、Session Host、数据库、API 或传输协议的权威边界。
- 不引入 React、Vue、Svelte、Web Components、Shadow DOM、Tailwind 或 CSS-in-JS。
- 不重新设计 Better Codex 品牌，不复制某个 Codex 页面像素稿。
- 不把产品状态色改成主题强调色；成功、警告、危险、优先级和 Agent 身份色保持独立语义。
- 不把移动端实现为第三套 UI；移动端是共享界面的窄布局模式。
- 不在本计划中发布 Preview、Release 或部署生产环境。
- 不以 WebUI 自动化结果替代真实 Codex 宿主验收。

## 4. 关键技术决策

### 4.1 令牌采用六层单向依赖

令牌层级固定如下，上层可以引用下层，下层不得引用上层：

1. Foundation：间距、字号、行高、字重、圆角、控件高度、图标尺寸、边框宽度、阴影、动效、层级。
2. Codex Neutral Semantic：画布、表面、浮层、控件、悬停、按下、正文、弱文本、边框、强调、焦点、选区、遮罩。
3. Better Codex Product Semantic：成功、警告、危险、信息、优先级、Agent/Avatar 身份。
4. Brand：仅 Logo、品牌渐变和明确品牌区域可用。
5. Component Contract：只有在多处复用、具备组件语义或需要主题响应时才建立组件级令牌。
6. Legacy Alias：旧变量只能单向指向规范变量，并带有可统计的淘汰清单。

`HostThemeInput` 不属于视觉令牌，它是主题适配器的输入协议，至少包含：

- `schemaVersion`
- `source`: `codex-config | codex-css-probe | web-bootstrap | fallback`
- `mode`: `light | dark | system`
- `canvas`
- `ink`
- `accent`
- `fontFamily`
- `capabilities`

断点不做成 CSS 自定义属性，因为自定义属性不能直接作为媒体查询条件。WebUI 继续使用构建期断点；Codex 注入面板同时使用 `ResizeObserver` 将容器归一为 `narrow | compact | wide`，通过 `data-bc-size` 驱动布局，避免只按浏览器 viewport 判断。

### 4.2 Codex 原生配色由适配器派生

Theme Adapter 固定执行以下顺序：

```text
read → validate → normalize → derive → contrast guard → apply → diagnose
```

它必须输出可追踪诊断：主题来源、缺失字段、非法字段、采用的 fallback、被对比度保护调整的值、宿主能力签名。Fallback 可以保证界面可用，但必须记录为降级，不得伪装成成功读取 Codex 主题。

Codex 中性语义色从宿主输入派生；产品状态色使用独立的明暗语义表，不从 `accent` 派生。这样既保持原生 Codex 观感，也避免不同主题下危险、成功和优先级含义漂移。

### 4.3 原生 DOM 组件统一生命周期

共享组件采用薄契约：

```ts
interface ComponentHandle<P> {
  element: HTMLElement;
  update(next: P): void;
  destroy(): void;
}
```

组件约束：

- 不读取 Runtime、Relay、全局业务状态或 Codex CSS 变量。
- 用户内容只通过 `textContent` 或 `Node` 写入，不接受动态 `innerHTML`。
- 文案和国际化结果由 feature 层传入。
- 事件通过回调传入，并使用 `AbortController` 统一注销。
- `destroy()` 必须清理监听器、观察器、portal 和临时 DOM。
- variant 使用受限联合类型，不开放任意颜色或任意 style 逃生口。
- 根节点输出稳定的 `data-bc-component`，状态输出 `data-bc-state`。
- 错误包含组件名、阶段、宿主、主题来源并保留原始异常，不静默吞错。

### 4.4 宿主只负责四件事

Codex 注入宿主与 WebUI 宿主只拥有：

1. mount/unmount；
2. Theme Input；
3. Transport Adapter；
4. Host Capabilities。

本地 WebUI 与 Relay WebUI 使用同一个 Web Host，差异只由 Transport Adapter 表达。业务组件不得判断“当前是否 Relay”。

### 4.5 构建策略分两步落地

当前构建并没有独立的浏览器 IIFE 组件入口，因此不能直接按“已有前端 bundler”重排代码。

第一步先把 CSS 与令牌拆成 TypeScript 字符串模块，继续由 `betterCodexDesignSystemCss()` 拼装，保持现有 `tsc`、注入和打包链不变。不要先改成裸 `.css` import，因为当前 `tsc` 不负责复制这些资源。

第二步建立单一浏览器 IIFE 入口，把原生 DOM 组件和 feature view 编译为无 code splitting 的浏览器产物。`injectionScript()` 保留为公开门面，负责注入运行期配置并返回最终脚本；Codex 与 WebUI 都消费同一个构建产物。迁移完成后不保留旧渲染器、隐藏 kill switch 或长期双路径，回滚依靠阶段提交。

这是本方案最脆弱的技术假设：当前注入执行顺序、动态运行期配置、错误堆栈与产物寻址可以在单 IIFE 下保持一致。第二阶段必须用完整验收证明这一点；若不能证明，则回滚该阶段，继续使用 TypeScript 字符串模块，不允许通过双渲染路径掩盖问题。

## 5. 目标目录与依赖规则

目标结构如下，允许阶段内逐步建立，但最终命名和依赖方向固定：

```text
src/ui/
  design/
    registry.ts
    foundation.ts
    codex-semantic.ts
    product-semantic.ts
    brand.ts
    aliases.ts
    css.ts
    styles/
      primitives.ts
      components.ts
      patterns.ts
      features.ts
  theme/
    contract.ts
    normalize.ts
    derive.ts
    diagnostics.ts
  core/
    component.ts
    element.ts
    events.ts
    lifecycle.ts
  primitives/
    icon.ts
    button.ts
    badge.ts
  components/
    empty-state.ts
    inline-feedback.ts
    field-shell.ts
    dialog.ts
    menu.ts
    notice.ts
  patterns/
    toolbar.ts
    form-row.ts
    list-row.ts
  features/
    board/
    agents/
    projects/
    scheduled/
    settings/
  hosts/
    contract.ts
    injected.ts
    web.ts
  injected-entry.ts
```

依赖规则：

- `design` 不依赖 UI、feature、host。
- `theme` 只依赖 `design` 的数据契约。
- `core` 不依赖业务、API、Runtime 或 host。
- `primitives` 只依赖 `core` 与 `design` 契约。
- `components` 只依赖 `core`、`primitives`。
- `patterns` 可依赖 `components`，不能直接访问 API。
- `features` 负责 ViewModel、业务状态、API 调用和组件组合。
- `hosts` 负责挂载、主题输入、传输与能力，不拥有业务规则。
- `src/design-system.ts` 在迁移期是兼容门面，最终只做公共导出和 CSS 拼装。
- `src/dom.ts` 在迁移期是注入门面，最终只做配置序列化和启动调用。

禁止 `ui` 目录反向导入 `src/server.ts`、`src/relay.ts`、数据库模块或 Session Host 实现。

## 6. 分阶段实施

每个阶段必须在 `main` 上独立提交，开始前确认工作树，提交时只暂存该阶段文件。任何阶段失败都回滚该阶段提交，不通过新增兜底路径维持表面可用。

### 阶段一：建立规范注册表与新增债务闸门

目标：在不改变当前视觉的情况下，让设计值有机器可读的唯一来源，并从本阶段开始阻止新增不统一写法。

修改范围：

- 新建 `src/ui/design/registry.ts`，登记规范变量、层级、明暗值、是否允许宿主覆盖和旧别名。
- 新建 `src/ui/design/foundation.ts`、`codex-semantic.ts`、`product-semantic.ts`、`brand.ts`、`aliases.ts`。
- 新建 `src/ui/design/css.ts` 与 `styles/*.ts`，按原始顺序输出与当前等价的 CSS 字符串。
- 将 `src/design-system.ts` 收敛为兼容门面，保留 `betterCodexDesignSystemCss()` 的公开行为。
- 扩展 `scripts/check-design-tokens.mjs`，检查颜色、间距、字号、行高、圆角、阴影、动效和 z-index。
- 为现有字面量建立受控基线，只允许存量递减；新增或增加计数直接失败。基线文件固定为 `scripts/design-literal-baseline.json`。
- 更新因源码结构改变而过时的 `test/dom.test.ts` 断言，不建立平行测试框架。

完成条件：

- 生成 CSS 与迁移前内容在规范化后等价，变量命名和级联顺序没有改变。
- `--bc-*` 只有注册表可以定义；兼容别名只能定义在 `aliases.ts`。
- 所有未登记变量、反向别名、新增设计字面量和重复 token 都会导致检查失败。
- 当前页面在本地 WebUI 的亮色、暗色和移动视口下无视觉变化。

回滚：单独回滚阶段一提交即可恢复原 `src/design-system.ts`；不保留第二份令牌源。

### 阶段二：建立 Theme Adapter 与单一浏览器入口

目标：显式化主题协议和宿主诊断，并为后续真实组件模块建立可编译入口；业务界面保持不变。

修改范围：

- 新建 `src/ui/theme/contract.ts`，定义版本化 `HostThemeInput` 与规范主题输出。
- 新建 `normalize.ts`、`derive.ts`、`diagnostics.ts`，把当前 `applyAppearance()` 逻辑迁入可验证的纯函数和应用层。
- 调整 `src/appearance.ts`，只负责产生合法主题输入，不再隐式承担组件样式职责。
- 新建 `src/ui/hosts/contract.ts`、`injected.ts`、`web.ts`，显式提供 mount、theme、transport、capabilities。
- 新建 `src/ui/injected-entry.ts`。
- 新建 `scripts/build-injected-ui.mjs`，使用项目已有 esbuild 依赖生成单 IIFE、关闭 code splitting，并在失败时使构建退出非零。
- 调整 `package.json` 的 build 顺序，确保 IIFE 先生成、TypeScript 再编译、现有 refresh 流程最后执行。
- 调整 `src/dom.ts`，保留 `injectionScript()` 外部契约，只拼接运行期配置与生成产物。
- 调整 `src/web-host.ts`，消费同一 UI 入口，不复制组件逻辑。
- 将生成文件放入 `src/generated/injected-ui.ts`，文件头不写人工注释；该文件只能由构建脚本生成并通过校验确保最新。

诊断要求：

- 主题事件至少记录 `host`、`themeSource`、`schemaVersion`、`missingTokens`、`invalidTokens`、`fallbackTokens`、`contrastAdjustedTokens`、`capabilitySignature`。
- 生成产物失败、缺失或版本不匹配时启动失败，不能退回旧注入脚本继续运行。
- 浏览器运行异常保留 source map 定位能力；生产包不依赖外部 source map 才能启动。

完成条件：

- 同一个注入产物能启动 Codex 宿主、本地 WebUI 和 Relay WebUI。
- 迁移前后 DOM 关键标识、主题值、事件顺序与 API 请求保持一致。
- 构建连续运行两次，第二次不产生未提交差异。
- 注入产物缺失、损坏和主题输入非法三类故障都明确失败并输出结构化诊断。
- 真实 Codex 亮色、暗色各完成一次人工走查；WebUI 结果不能代替此项。

回滚：回滚阶段二提交，恢复字符串注入路径。阶段一继续有效。

### 阶段三：建立低风险组件基础并接入一个真实消费者

目标：用真实业务消费验证组件契约，不先抽取 Board Card 等高耦合区域。

抽取顺序固定为：

1. `Icon`
2. `Button` / `IconButton`
3. `Badge` / `StatusBadge` / `PriorityBadge`
4. `EmptyState`
5. `InlineFeedback`

修改范围：

- 新建 `src/ui/core/component.ts`、`element.ts`、`events.ts`、`lifecycle.ts`。
- 新建对应 `primitives` 与 `components` 文件。
- 在 `src/ui/design/styles/primitives.ts` 和 `components.ts` 中迁入对应样式。
- 第一个真实消费者固定选择项目列表中的空状态、刷新按钮和状态 Badge；一次只替换这三个局部，不同时重排项目页结构。
- 更新过时的 `test/dom.test.ts` 结构断言和既有 Web E2E 定位器。

组件状态矩阵：

- Button：default、hover、active、focus-visible、disabled、loading、danger。
- IconButton：上述状态加 accessible name。
- Badge：neutral、info、success、warning、danger、priority。
- EmptyState：标题、说明、可选主操作、无操作。
- InlineFeedback：info、success、warning、error。

完成条件：

- 组件不直接访问 API、全局状态或宿主变量。
- 所有监听器都能由 `destroy()` 注销；重复 mount/unmount 不增加监听器数量。
- 用户可见动态内容没有通过 `innerHTML` 写入。
- 组件在亮色、暗色、narrow、compact、wide 下均可读。
- 项目列表的真实交互、错误反馈和键盘焦点顺序保持一致。

回滚：只回滚真实消费者与组件提交；不在旧页面保留运行时开关。

### 阶段四：覆盖全局低风险控件

目标：消除全局重复的按钮、图标、Badge、空状态和行内反馈实现。

迁移顺序：

1. 全局工具栏与刷新/关闭/复制等 IconButton。
2. Board、Agents、Projects、Scheduled、Settings 中的普通按钮。
3. 状态、优先级和计数 Badge。
4. 空状态、加载失败和行内反馈。

每类组件单独提交，提交中不得同时重写 feature 状态管理。每次迁移后更新字面量债务基线，计数只能下降。

完成条件：

- 相同语义控件不再由 feature 自建 class 和事件生命周期。
- 全局没有新增任意颜色、任意 style 或未注册 variant。
- 既有功能测试和 Web E2E 全部通过。
- 真实 Codex 至少验收 Board、Agents、Projects 三个高频入口的亮暗主题与键盘操作。

回滚：按组件类别回滚对应提交，不影响已验证类别。

### 阶段五：统一表单、覆盖层和通知

目标：解决最容易出现样式与生命周期漂移的 Field、Dialog、Menu 和 Notice。

抽取顺序固定为：

1. `FieldShell`
2. `Dialog`
3. `Menu`
4. `Notice` / `Toast`
5. `Toolbar`、`FormRow`、`ListRow` patterns

行为契约：

- FieldShell 统一 label、description、error、required、disabled 和控件关联。
- Dialog 统一 portal、focus trap、Esc、遮罩点击、恢复焦点、滚动锁和销毁。
- Menu 统一打开来源、方向键、Home/End、Esc、外部点击、焦点恢复和视口边界。
- Notice 统一严重级别、可关闭性、自动关闭计时、暂停和销毁。
- Overlay 层级只使用登记的 z-index，不允许页面自行增加更大数值。

迁移顺序从 Settings 表单与确认框开始，再处理 Agents、Projects、Scheduled，最后处理 Board 快捷操作。拖拽区域、流式会话和复杂项目详情不在本阶段抽象。

完成条件：

- 打开、更新、关闭、销毁的完整生命周期可追踪。
- 键盘、屏幕阅读器名称、错误关联和焦点恢复符合既有产品行为。
- 窄布局没有弹层溢出、不可达操作或背景误滚动。
- 同类 Field/Dialog/Menu/Notice 不再保留 feature 私有实现。

回滚：按组件与首个消费者成对回滚，不能只回滚样式而保留不同生命周期实现。

### 阶段六：按功能拆分 `src/dom.ts`

目标：将单体注入实现收敛为清晰的 feature controller/view 边界，同时保持共享组件稳定。

迁移顺序固定为：

1. Settings
2. Scheduled
3. Projects
4. Agents
5. Board

每个 feature 使用以下顺序，且每一步独立提交：

1. 原样移动状态与视图代码，不改变行为。
2. 将 DOM 构造替换为已验证组件和 pattern。
3. 删除迁移后的旧函数、旧样式和旧选择器。
4. 更新过时的现有断言、E2E 定位器和验收证据。

Feature 目录内部固定分工：

```text
feature/
  controller.ts
  model.ts
  view.ts
```

- `controller.ts` 协调状态、API、transport 和生命周期。
- `model.ts` 定义 feature 内部 ViewModel，不复制服务端领域模型。
- `view.ts` 只组合组件、渲染状态并发出用户意图。

Board 最后迁移，因为它包含卡片、列、拖拽、会话与实时状态，是最高风险区域。第一轮只拆边界，不把 Board Card、Column、Conversation Message、Agent Panel、Project Detail、流式区域或拖拽区域强行做成通用组件；只有出现第二个真实消费者时才升级为 shared component/pattern。

完成条件：

- `src/dom.ts` 只保留配置序列化、兼容公开入口和启动调用。
- feature 之间不导入对方的内部 controller/view。
- API 与 transport 访问只存在于 controller 或既有服务层。
- 每个 feature 在拆分前后拥有等价功能证据，Board 额外验证拖拽、实时更新和会话切换。

回滚：按 feature 回滚；未开始的 feature 不受影响。

### 阶段七：宿主统一、别名退役与最终校准

目标：清理迁移期兼容层，并以真实宿主证据确认最终统一性。

修改范围：

- 统计 `--web-*` 的所有消费者，逐项迁移到 `--bc-*` 规范语义。
- 只有在源码、生成产物和运行时检查均无消费者时，删除 `src/web-host.ts` 中对应别名。
- 删除令牌注册表中零消费者的 legacy alias。
- 将字面量基线收紧到只允许明确例外；例外必须记录语义、文件和删除条件。
- 清理已迁移旧 CSS、DOM helper 和事件绑定函数。
- 更新 `AGENTS.md` 中前端架构单一事实来源，记录令牌、组件、feature 与 host 的依赖规则。
- 在 `plan/ROADMAP.md` 中标记本计划状态；该文件仍遵循本地规划区约定。

完成条件：

- Codex 与 WebUI 使用同一规范令牌、组件、pattern 和 feature view。
- 宿主差异只存在于 Host Adapter。
- 兼容别名数量为零，或每个剩余项都有已验证外部消费者、负责人和删除条件。
- 亮色、暗色、窄/中/宽布局和关键组件状态矩阵全部有当前版本证据。
- 真实 Codex 人工验收与 WebUI 自动化均通过，二者分别记录，不互相替代。

回滚：别名删除、文档更新和每类清理分别提交；出现外部消费者时只回滚对应别名删除提交。

## 7. 验证与证据矩阵

### 7.1 每个阶段必跑

```bash
git diff --check
npm run check:design-tokens
npm run typecheck
npm test
npm run build
npm run test:web:smoke
npm run test:web
```

如果仓库脚本名称发生变化，以当时 `package.json` 的等价现有命令为准，并同步修订本计划。不得将静态检查通过描述为浏览器或真实宿主通过。

### 7.2 主题矩阵

| 宿主 | 亮色 | 暗色 | 系统切换 | 非法主题输入 | Fallback 可见诊断 |
| --- | --- | --- | --- | --- | --- |
| Codex 注入宿主 | 人工 | 人工 | 人工 | 自动/日志 | 日志 |
| 本地 WebUI | 自动 + 人工 | 自动 + 人工 | 自动 | 自动 | 自动/日志 |
| Relay WebUI | 自动 + 人工 | 自动 + 人工 | 自动 | 自动 | 自动/日志 |

### 7.3 布局矩阵

- `narrow`：320–479px，单列、触控目标可达、弹层不溢出。
- `compact`：480–899px，保留核心上下文，次级动作可折叠。
- `wide`：900px 及以上，保持当前高密度桌面布局。
- Codex 面板按容器宽度判定；WebUI 同时验证 viewport 与实际内容容器。

### 7.4 关键功能矩阵

- Board：列、卡片、拖拽、筛选、详情、实时状态。
- Agents：列表、状态、操作、空状态、错误反馈。
- Projects：列表、刷新、Badge、空状态、详情入口。
- Scheduled：列表、启停、表单、确认与错误。
- Settings：Field、校验、保存、Dialog、通知。
- 全局：语言切换、主题切换、键盘导航、焦点可见、断线/错误状态。

### 7.5 视觉证据

不在本计划中创建新的平行测试框架。先复用现有 Playwright 流程，在固定数据、固定 viewport、固定主题下产出验收截图；只有当现有 E2E 因组件迁移而过时时才更新对应测试。视觉证据至少覆盖：

- light / dark；
- narrow / compact / wide；
- Button、Badge、Field、Dialog、Menu、Notice 的主要状态；
- Board、Agents、Projects、Scheduled、Settings 的稳定页面状态；
- Codex 真实窗口的人工截图与记录。

任何动态时间、随机 ID、流式状态必须先稳定化再作为基线，不允许通过放宽截图阈值掩盖真实漂移。

## 8. 提交、回滚与发布边界

- 所有实施直接在 `main` 进行，不创建长期分支或额外 worktree，除非用户另行要求。
- 开始每个提交前执行 `git status --short --branch`，保护用户已有 WIP。
- 每个提交只包含一个可验收变化：令牌、构建入口、某类组件、某个 feature 或某类清理。
- 不把机械移动、行为重构和视觉变化混在一个提交中。
- 每个提交都必须能构建并通过该阶段适用的验证。
- 回滚使用提交边界，不维护隐藏旧路径、静默 fallback 或长期 feature flag。
- 本计划完成不自动触发 Preview、Release、VPS 部署或本机正式版本替换；这些动作需要单独明确授权。

## 9. 可观测性要求

新增前端错误和主题诊断至少带有：

- `host`
- `phase`
- `component`
- `feature`
- `themeSource`
- `themeSchemaVersion`
- `capabilitySignature`
- `mountId`
- 原始异常与 cause

组件 mount、update、destroy 不需要默认打印噪声日志，但生命周期异常、重复 mount、销毁后更新、观察器泄漏和 portal 残留必须明确失败或输出结构化错误。不得捕获异常后返回成功 UI。

## 10. 明确拒绝的替代方案

### 10.1 整体改写为框架应用

拒绝原因：会同时改变构建、运行时、DOM、状态和宿主集成，难以把视觉回归与基础设施回归分开，也不符合当前原生注入架构。

### 10.2 只补充更多 CSS 变量

拒绝原因：无法解决 DOM 生命周期、事件清理、业务耦合和宿主边界问题。

### 10.3 使用 Shadow DOM 隔离

拒绝原因：会削弱 Codex 原生样式继承，并增加 portal、焦点、主题与自动化复杂度。

### 10.4 长期保留旧新双渲染器

拒绝原因：两条路径会持续漂移，并把真实错误变成隐藏 fallback。迁移使用可回滚提交，不使用运行时双轨。

### 10.5 一开始抽象 Board Card 和拖拽系统

拒绝原因：这些区域业务耦合最高，过早抽象会把业务状态包装成伪通用组件。先用低风险组件验证契约，Board 最后拆分。

## 11. 完成定义

只有同时满足以下条件，本计划才可标记完成：

- 设计令牌存在唯一、机器可读、分层的规范注册表。
- 颜色、间距、字号、圆角、阴影、动效、层级的新债务会被 CI 阻断。
- Codex 主题输入经过版本化 Theme Adapter，fallback 与对比度调整可观测。
- 高频通用控件已迁移到统一原生 DOM 组件契约。
- Field、Dialog、Menu、Notice 的生命周期与无障碍行为统一。
- `src/dom.ts` 已收敛为入口，业务按 feature 边界组织。
- Codex、本地 WebUI、Relay WebUI 共享同一组件与样式实现。
- 旧别名和重复实现已删除，或有明确、可验证的保留依据。
- 静态检查、现有测试、Web E2E、构建和真实 Codex 人工验收均有当前版本证据。
- `AGENTS.md` 与本地 Roadmap 已同步最终架构，不记录尚未实现的能力。

## 12. 实施起点

开始实现时只启动阶段一。阶段一完成并提交后，核对生成 CSS 等价性与 WebUI 亮暗主题证据；只有该阶段验收通过，才进入阶段二。不得在阶段一顺手抽组件，也不得在阶段二同时迁移业务页面。

第一批允许修改的文件集合固定为：

```text
src/design-system.ts
src/ui/design/registry.ts
src/ui/design/foundation.ts
src/ui/design/codex-semantic.ts
src/ui/design/product-semantic.ts
src/ui/design/brand.ts
src/ui/design/aliases.ts
src/ui/design/css.ts
src/ui/design/styles/primitives.ts
src/ui/design/styles/components.ts
src/ui/design/styles/patterns.ts
src/ui/design/styles/features.ts
scripts/check-design-tokens.mjs
scripts/design-literal-baseline.json
test/dom.test.ts
```

除非阶段一验证暴露真实依赖，不扩大首批修改范围。若必须扩大，先在本计划中记录原因、受影响边界和新增验证，再修改代码。
