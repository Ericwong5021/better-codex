# Better Codex design language

## 1. Visual theme and atmosphere

Better Codex should feel like a native Codex task-management surface, not a web dashboard embedded inside Codex. The interface is quiet, rounded, compact, and uses luminance steps instead of visible borders to communicate hierarchy.

## 2. Color palette and roles

All production values live in `src/design-system.ts`. Components must consume semantic tokens and must not copy their resolved values.

- `--bc-color-canvas`: page background
- `--bc-color-surface`: grouped content and board columns
- `--bc-color-surface-raised`: cards, menus, and dialogs
- `--bc-color-control`: resting controls and inputs
- `--bc-color-hover` / `--bc-color-pressed`: interaction states
- `--bc-color-text`, `--bc-color-text-muted`, `--bc-color-text-faint`: text hierarchy
- `--bc-color-primary` / `--bc-color-on-primary`: primary actions
- `--bc-color-danger` / `--bc-color-danger-soft`: destructive actions

## 3. Typography rules

Use the Codex host font when available, then the operating-system UI stack. Size type with `--bc-text-*` tokens that follow Codex Settings → Appearance sans font size (`--font-size-base`, default 14px): primary UI and titles use `--bc-text-md`, supporting copy uses `--bc-text-sm` / `--bc-text-caption`, and dialog task titles use `--bc-text-xl`. Scale interactive chrome with `--bc-control-height`, `--bc-row-height`, `--bc-toolbar-height`, and `--bc-icon-*` derived from the same base. Do not hard-code absolute `px` font sizes or control heights for text UI. Use tabular numerals for live counters and avoid letter-spacing changes on Chinese text.

## 4. Component styling

- Buttons: borderless, 32px high, 10px radius, background fill only when active or contained.
- Inputs: borderless control surface, 10px radius, focus ring supplied by the focus token.
- Cards: no outline or decorative shadow, 13-16px radius, separated from parents by a surface step.
- Menus: raised surface, 13px radius, floating elevation, compact 34px rows.
- Dialogs: raised surface, 20px radius, no header or footer divider.
- Chips: pill radius, muted text, control background.
- Agent management: a centered searchable list in preview state, plus a right-side inspector for detail and creation states. Do not reintroduce card grids or modal editors for this workflow.
- Agent pickers: use Better Codex popovers, never operating-system `<select>` menus. Model names, defaults, and model-specific reasoning choices come from Codex app-server `model/list` through `src/model-catalog.ts`.

## 5. Layout principles

Use the shared 4, 8, 12, 16, and 20px spacing scale. The toolbar orients and enables action. The board scans horizontally. Cards contain information but do not become decorative containers.

## 6. Depth and elevation

Canvas, grouped surface, raised surface, and control fill provide normal depth. Shadows are reserved for detached menus, update notices, and modal dialogs. Borders are not used to fence cards, inputs, toolbars, or dialog sections.

## 7. Do and do not

- Do update semantic tokens when Codex changes its visual language.
- Do keep status colors muted and subordinate to task content.
- Do use one named radius tier per class of element.
- Do preserve keyboard focus and destructive-action clarity.
- Do hide competing toolbar actions while a right-side inspector is open.
- Do not add one-off hex values in page styles.
- Do not add card outlines or section dividers for routine hierarchy.
- Do not introduce a second CSS system or framework.
- Do not use blur as the default depth treatment.

## 8. Responsive behavior

The desktop board remains horizontally scrollable. Below 720px the toolbar stacks, action groups scroll horizontally, agent cards collapse to one column, and dialogs retain 12px viewport gutters. Chinese labels and compact button text must remain visible without ellipsis.

The agent inspector occupies a fixed right-side surface on desktop. Below 720px it becomes a full-width view and temporarily hides the directory, with a visible close action returning to the list.

## 9. Agent prompt guide

- Toolbar: use `--bc-color-canvas`, 56px desktop height, 20px horizontal padding, 32px controls, and `--bc-radius-sm`.
- Task column: use `--bc-color-surface`, 292px width, `--bc-radius-lg`, and 8px internal padding with no border.
- Task card: use `--bc-color-surface-raised`, `--bc-radius-md`, 12px padding, and no border or shadow.
- Menu: use `--bc-color-surface-raised`, `--bc-radius-md`, 34px rows, and `--bc-elevation-menu`.
- Dialog: use `--bc-color-surface-raised`, `--bc-radius-xl`, no internal dividers, and `--bc-elevation-float`.
