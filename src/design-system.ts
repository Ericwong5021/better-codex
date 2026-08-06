/**
 * Better Codex visual language.
 *
 * This is the single seam between product UI and the current Codex visual
 * language. Components consume semantic --bc-* tokens below. When Codex
 * changes its appearance, update the token values here instead of restyling
 * every surface.
 */
export function betterCodexDesignSystemCss() {
  return String.raw`
    :root {
      --bc-font-ui: var(--font-sans, ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif);
      /* Follow Codex Settings > Appearance sansFontSize via host tokens. */
      --bc-text-base: var(--font-size-base, var(--font-text-md-size, var(--codex-chat-font-size, 14px)));
      --bc-text-md: var(--font-size-normal, var(--bc-text-base));
      --bc-text-sm: var(--font-size-small, max(11px, calc(var(--bc-text-base) - 2px)));
      --bc-text-body: var(--font-size-tooltip, max(11px, calc(var(--bc-text-base) - 1px)));
      --bc-text-caption: max(11px, calc(var(--bc-text-base) - 3px));
      --bc-text-xs: max(10px, calc(var(--bc-text-base) - 4px));
      --bc-text-2xs: max(9px, calc(var(--bc-text-base) - 5px));
      --bc-text-lg: calc(var(--bc-text-base) + 1px);
      --bc-text-xl: calc(var(--bc-text-base) + 5px);
      --bc-text-avatar: max(8px, calc(var(--bc-text-base) - 6px));
      --bc-text-icon: calc(var(--bc-text-base) + 2px);
      --bc-text-icon-lg: calc(var(--bc-text-base) + 3px);
      /* Interactive chrome scales with Settings > Appearance sans font size. */
      --bc-control-height: calc(var(--bc-text-base) * 2.285714);
      --bc-control-padding: calc(var(--bc-text-base) * 0.785714);
      --bc-row-height: calc(var(--bc-text-base) * 2.428571);
      --bc-toolbar-height: calc(var(--bc-text-base) * 4);
      --bc-icon-sm: var(--bc-text-base);
      --bc-icon-md: calc(var(--bc-text-base) + 2px);
      --bc-color-canvas: var(--bc-host-light-canvas, #ffffff);
      --bc-color-surface: var(--bc-host-light-surface, #f8f8f8);
      --bc-color-surface-raised: var(--bc-host-light-raised, #ededee);
      --bc-color-control: var(--bc-host-light-control, #f3f3f4);
      --bc-color-input: var(--bc-color-canvas);
      --bc-color-hover: var(--bc-host-light-hover, #eaeaeb);
      --bc-color-pressed: var(--bc-host-light-pressed, #e3e3e4);
      --bc-color-hairline: var(--bc-host-light-hairline, #e5e5e6);
      --bc-color-text: var(--bc-host-light-ink, #1a1c1f);
      --bc-color-text-muted: color-mix(in srgb, var(--bc-color-text) 62%, var(--bc-color-canvas));
      --bc-color-text-faint: color-mix(in srgb, var(--bc-color-text) 44%, var(--bc-color-canvas));
      --bc-color-focus: var(--bc-host-light-accent, #339cff);
      --bc-color-primary: var(--bc-color-text);
      --bc-color-on-primary: var(--bc-color-canvas);
      --bc-color-danger: oklch(.59 .2 27);
      --bc-color-danger-soft: color-mix(in oklch, var(--bc-color-danger) 12%, var(--bc-color-surface));
      --bc-color-scrim: rgb(18 18 20 / .28);
      --bc-radius-xs: 7px;
      --bc-radius-sm: 10px;
      --bc-radius-md: 13px;
      --bc-radius-lg: 16px;
      --bc-radius-xl: 20px;
      --bc-radius-pill: 999px;
      --bc-dialog-agent-height: 400px;
      --bc-space-1: 4px;
      --bc-space-2: 8px;
      --bc-space-3: 12px;
      --bc-space-4: 16px;
      --bc-space-5: 20px;
      --bc-motion-fast: 120ms;
      --bc-motion-normal: 180ms;
      --bc-ease-out: cubic-bezier(.16, 1, .3, 1);
      --bc-focus-ring: 0 0 0 2px color-mix(in oklch, var(--bc-color-focus) 42%, transparent);
      --bc-inset-hairline: inset 0 0 0 1px var(--bc-color-hairline);
      --bc-elevation-float: 0 18px 52px rgb(15 15 18 / .16), 0 3px 12px rgb(15 15 18 / .08);
      --bc-elevation-menu: 0 12px 32px rgb(15 15 18 / .13), 0 2px 8px rgb(15 15 18 / .06);
      --bc-elevation-card: 0 1px 2px rgb(15 15 18 / .04), 0 4px 14px rgb(15 15 18 / .07);

      /* Backward-compatible semantic aliases for the existing renderer. */
      --bc-page: var(--bc-color-canvas);
      --bc-surface: var(--bc-color-surface);
      --bc-raised: var(--bc-color-surface-raised);
      --bc-hover: var(--bc-color-hover);
      --bc-selected: var(--bc-color-pressed);
      --bc-foreground: var(--bc-color-text);
      --bc-muted: var(--bc-color-text-muted);
      --bc-faint: var(--bc-color-text-faint);
      --bc-border: transparent;
      --bc-divider: transparent;
      --bc-input: transparent;
      --bc-ring: var(--bc-color-focus);
      --bc-primary: var(--bc-color-primary);
      --bc-primary-foreground: var(--bc-color-on-primary);
      --bc-danger: var(--bc-color-danger);
      --bc-surface-shadow: none;
      --bc-card-shadow: var(--bc-elevation-card);
      --bc-floating-shadow: var(--bc-elevation-float);
      --bc-menu-shadow: var(--bc-elevation-menu);
      --bc-scrim: var(--bc-color-scrim);
    }

    html.electron-dark, html.dark, html[data-theme="dark"] {
      --bc-color-canvas: var(--bc-host-dark-canvas, #1e1e1e);
      --bc-color-surface: var(--bc-host-dark-surface, #232323);
      --bc-color-surface-raised: var(--bc-host-dark-raised, #2c2c2c);
      --bc-color-control: var(--bc-host-dark-control, #272727);
      --bc-color-input: var(--bc-color-control);
      --bc-color-hover: var(--bc-host-dark-hover, #2f2f2f);
      --bc-color-pressed: var(--bc-host-dark-pressed, #343434);
      --bc-color-hairline: var(--bc-host-dark-hairline, #323232);
      --bc-color-text: var(--bc-host-dark-ink, #d4d4d4);
      --bc-color-focus: var(--bc-host-dark-accent, #007acc);
      --bc-color-primary: var(--bc-color-text);
      --bc-color-on-primary: var(--bc-color-canvas);
      --bc-color-danger: oklch(.68 .18 24);
      --bc-color-scrim: rgb(0 0 0 / .56);
      --bc-elevation-float: 0 22px 58px rgb(0 0 0 / .5), 0 4px 14px rgb(0 0 0 / .3);
      --bc-elevation-menu: 0 14px 34px rgb(0 0 0 / .38), 0 3px 10px rgb(0 0 0 / .22);
      --bc-elevation-card: 0 1px 2px rgb(0 0 0 / .22), 0 6px 18px rgb(0 0 0 / .28);
    }

    #better-codex-panel,
    #better-codex-dialog,
    #better-codex-agent-dialog,
    #better-codex-confirm,
    #better-codex-context-menu,
    #better-codex-update-notice,
    #better-codex-avatar-picker,
    #better-codex-avatar-cropper {
      font-family: var(--bc-font-ui);
      font-size: var(--bc-text-base);
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }

    #better-codex-panel {
      color: var(--bc-color-text);
      background: var(--bc-color-canvas);
    }

    #better-codex-panel .better-codex-toolbar {
      min-height: 56px;
      gap: var(--bc-space-3);
      padding: 0 var(--bc-space-5);
      background: var(--bc-color-canvas);
    }

    #better-codex-panel .better-codex-tabs,
    #better-codex-panel .better-codex-actions,
    #better-codex-panel .better-codex-agent-actions {
      gap: var(--bc-space-1);
    }

    #better-codex-panel .better-codex-agent-actions[hidden] {
      display: none !important;
    }

    #better-codex-panel[data-surface="agents"] {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      grid-template-rows: var(--bc-toolbar-height) minmax(0, 1fr);
    }

    #better-codex-panel[data-surface="agents"] .better-codex-toolbar {
      min-width: 0;
      grid-column: 1;
      grid-row: 1;
    }

    #better-codex-panel[data-surface="agents"] .better-codex-agents,
    #better-codex-panel[data-surface="agents"] .better-codex-agent-shell {
      display: contents;
    }

    #better-codex-panel[data-surface="agents"] .better-codex-agent-directory {
      grid-column: 1;
      grid-row: 2;
    }

    #better-codex-panel[data-surface="agents"] .better-codex-agent-inspector {
      height: 100%;
      grid-column: 2;
      grid-row: 1 / 3;
    }

    #better-codex-panel .better-codex-button,
    #better-codex-agent-dialog .better-codex-button,
    #better-codex-dialog .better-codex-button,
    #better-codex-dialog .better-codex-submit,
    #better-codex-agent-dialog .better-codex-submit,
    #better-codex-update-notice .better-codex-update-button {
      min-height: var(--bc-control-height);
      border: 0;
      border-radius: var(--bc-radius-sm);
      padding-inline: var(--bc-control-padding);
      box-shadow: none;
      transition: transform var(--bc-motion-fast) var(--bc-ease-out), background-color var(--bc-motion-fast) ease-out, color var(--bc-motion-fast) ease-out, opacity var(--bc-motion-fast) ease-out;
      touch-action: manipulation;
    }

    #better-codex-panel .better-codex-button.is-bordered,
    #better-codex-agent-dialog .better-codex-button {
      border: 0;
      color: var(--bc-color-text);
      background: var(--bc-color-control);
      box-shadow: none;
    }

    #better-codex-panel .better-codex-button.is-active {
      color: var(--bc-color-text);
      background: var(--bc-color-control);
    }

    #better-codex-panel .better-codex-create-split {
      position: relative;
      display: inline-flex;
      flex: 0 0 auto;
      height: var(--bc-control-height);
      align-items: stretch;
      border-radius: var(--bc-radius-sm);
      color: var(--bc-color-on-primary);
      background: var(--bc-color-primary);
    }

    #better-codex-panel .better-codex-create-primary,
    #better-codex-panel .better-codex-create-toggle {
      display: inline-flex;
      min-height: var(--bc-control-height);
      align-items: center;
      justify-content: center;
      gap: 6px;
      border: 0;
      color: inherit;
      background: transparent;
      padding: 0 var(--bc-control-padding);
      font: inherit;
      font-size: var(--bc-text-md);
      cursor: pointer;
      transition: transform var(--bc-motion-fast) var(--bc-ease-out), background-color var(--bc-motion-fast) ease-out;
    }

    #better-codex-panel .better-codex-create-primary {
      border-radius: var(--bc-radius-sm) 0 0 var(--bc-radius-sm);
    }

    #better-codex-panel .better-codex-create-toggle {
      width: 30px;
      border-inline-start: 1px solid color-mix(in oklch, var(--bc-color-on-primary) 16%, transparent);
      border-radius: 0 var(--bc-radius-sm) var(--bc-radius-sm) 0;
      padding: 0;
    }

    #better-codex-panel .better-codex-create-primary:hover,
    #better-codex-panel .better-codex-create-toggle:hover,
    #better-codex-panel .better-codex-create-toggle[aria-expanded="true"] {
      background: color-mix(in oklch, var(--bc-color-on-primary) 10%, transparent);
    }

    #better-codex-panel .better-codex-create-primary:active,
    #better-codex-panel .better-codex-create-toggle:active {
      transform: scale(.96);
    }

    #better-codex-panel .better-codex-create-primary:focus-visible,
    #better-codex-panel .better-codex-create-toggle:focus-visible {
      outline: 0;
      box-shadow: var(--bc-focus-ring);
    }

    #better-codex-panel .better-codex-create-menu {
      position: absolute;
      z-index: 90;
      top: calc(100% + var(--bc-space-1));
      right: 0;
      min-width: 176px;
      border: 0;
      border-radius: var(--bc-radius-md);
      color: var(--bc-color-text);
      background: var(--bc-color-surface-raised);
      padding: var(--bc-space-1);
      box-shadow: var(--bc-elevation-menu);
      animation: better-codex-surface-enter var(--bc-motion-normal) var(--bc-ease-out);
    }

    #better-codex-panel .better-codex-create-menu-item {
      display: flex;
      width: 100%;
      min-height: var(--bc-row-height);
      align-items: center;
      gap: var(--bc-space-2);
      border: 0;
      border-radius: var(--bc-radius-sm);
      color: inherit;
      background: transparent;
      padding: 0 var(--bc-space-3);
      font: inherit;
      font-size: var(--bc-text-md);
      text-align: start;
      cursor: pointer;
    }

    #better-codex-panel .better-codex-create-menu-item:hover,
    #better-codex-panel .better-codex-create-menu-item:focus-visible {
      outline: 0;
      background: var(--bc-color-hover);
    }

    #better-codex-panel .better-codex-search {
      height: var(--bc-control-height);
      border: 0;
      border-radius: var(--bc-radius-sm);
      color: var(--bc-color-text);
      background: var(--bc-color-input);
      padding-inline: var(--bc-control-padding);
      box-shadow: var(--bc-inset-hairline);
      transition: background-color var(--bc-motion-fast) ease-out, box-shadow var(--bc-motion-fast) ease-out;
    }

    #better-codex-panel .better-codex-search:focus {
      border: 0;
      background: var(--bc-color-input);
      box-shadow: var(--bc-inset-hairline), var(--bc-focus-ring);
    }

    #better-codex-panel .better-codex-working-chip.has-work {
      border: 0;
      color: color-mix(in oklch, var(--bc-warning) 72%, var(--bc-color-text));
      background: color-mix(in oklch, var(--bc-warning) 12%, var(--bc-color-control));
    }

    #better-codex-panel .better-codex-filter-menu,
    #better-codex-panel .better-codex-filter-submenu,
    #better-codex-context-menu,
    #better-codex-context-menu .better-codex-context-submenu,
    #better-codex-dialog .better-codex-project-menu,
    #better-codex-dialog .better-codex-dialog-select-menu {
      border: 0;
      border-radius: var(--bc-radius-md);
      color: var(--bc-color-text);
      background: var(--bc-color-surface-raised);
      box-shadow: var(--bc-elevation-menu);
    }

    #better-codex-context-menu {
      width: max-content;
      min-width: 188px;
      max-width: min(280px, calc(100vw - 24px));
    }

    #better-codex-context-menu .better-codex-context-submenu {
      width: max-content;
      min-width: 148px;
      max-width: min(220px, calc(100vw - 24px));
    }

    #better-codex-panel .better-codex-filter-row,
    #better-codex-context-menu .better-codex-context-item,
    #better-codex-dialog .better-codex-project-option,
    #better-codex-dialog .better-codex-dialog-select-option {
      min-height: var(--bc-row-height);
      border-radius: var(--bc-radius-sm);
    }

    #better-codex-context-menu .better-codex-context-item {
      gap: var(--bc-space-2);
      padding-inline: 10px;
      white-space: nowrap;
    }

    #better-codex-context-menu .better-codex-context-check,
    #better-codex-context-menu .better-codex-status-icon,
    #better-codex-context-menu .better-codex-priority {
      display: inline-flex;
      flex: 0 0 auto;
      align-items: center;
      justify-content: center;
      line-height: 0;
    }

    #better-codex-context-menu .better-codex-status-icon,
    #better-codex-context-menu .better-codex-priority {
      width: var(--bc-icon-md);
      height: var(--bc-icon-md);
    }

    #better-codex-panel .better-codex-filter-visual,
    #better-codex-panel .better-codex-filter-check {
      display: inline-flex;
      width: var(--bc-icon-sm);
      height: var(--bc-icon-sm);
      flex: 0 0 var(--bc-icon-sm);
      align-items: center;
      justify-content: center;
      line-height: 0;
    }

    #better-codex-panel .better-codex-filter-visual > svg,
    #better-codex-panel .better-codex-filter-check > svg {
      display: block;
      width: var(--bc-icon-sm);
      height: var(--bc-icon-sm);
      flex: 0 0 auto;
    }

    #better-codex-panel .better-codex-status-icon,
    #better-codex-panel .better-codex-priority,
    #better-codex-dialog .better-codex-status-icon,
    #better-codex-dialog .better-codex-priority {
      width: var(--bc-icon-sm);
      height: var(--bc-icon-sm);
      flex: 0 0 var(--bc-icon-sm);
    }

    #better-codex-panel .better-codex-filter-separator,
    #better-codex-context-menu .better-codex-context-divider {
      height: 6px;
      margin: 0;
      background: transparent;
    }

    #better-codex-panel .better-codex-board {
      gap: var(--bc-space-3);
      padding: 0 var(--bc-space-4) var(--bc-space-4);
    }

    #better-codex-panel .better-codex-column {
      width: 292px;
      min-width: 292px;
      border: 0;
      border-radius: var(--bc-radius-lg);
      padding: var(--bc-space-2);
      box-shadow: none;
    }

    #better-codex-panel .better-codex-column[data-status="backlog"],
    #better-codex-panel .better-codex-column[data-status="todo"],
    #better-codex-panel .better-codex-column[data-status="cancelled"] {
      background: var(--bc-color-surface);
    }

    #better-codex-panel .better-codex-column[data-status="in_progress"] { background: color-mix(in oklch, var(--bc-warning) 7%, var(--bc-color-surface)); }
    #better-codex-panel .better-codex-column[data-status="in_review"] { background: color-mix(in oklch, var(--bc-success) 7%, var(--bc-color-surface)); }
    #better-codex-panel .better-codex-column[data-status="done"] { background: color-mix(in oklch, var(--bc-info) 7%, var(--bc-color-surface)); }
    #better-codex-panel .better-codex-column[data-status="blocked"] { background: color-mix(in oklch, var(--bc-danger) 7%, var(--bc-color-surface)); }

    #better-codex-panel .better-codex-column-head {
      min-height: 36px;
      padding: 0 0 var(--bc-space-2) var(--bc-space-2);
      font-variant-numeric: tabular-nums;
    }

    #better-codex-panel .better-codex-column-icon,
    #better-codex-panel .better-codex-agent-card-action,
    #better-codex-dialog .better-codex-icon-button,
    #better-codex-update-notice .better-codex-update-close {
      display: inline-flex;
      width: 32px;
      height: 32px;
      flex: 0 0 auto;
      align-items: center;
      justify-content: center;
      border: 0;
      border-radius: var(--bc-radius-sm);
      background: transparent;
      padding: 0;
      line-height: 0;
      transition: transform var(--bc-motion-fast) var(--bc-ease-out), background-color var(--bc-motion-fast) ease-out, color var(--bc-motion-fast) ease-out, opacity var(--bc-motion-fast) ease-out;
      touch-action: manipulation;
    }

    #better-codex-panel .better-codex-column-icon > svg,
    #better-codex-panel .better-codex-agent-card-action > svg,
    #better-codex-dialog .better-codex-icon-button > svg,
    #better-codex-update-notice .better-codex-update-close > svg,
    #better-codex-panel .better-codex-status-icon {
      display: block;
      flex: 0 0 auto;
    }

    #better-codex-panel #better-codex-filter > svg {
      color: var(--bc-info);
    }

    #better-codex-panel .better-codex-status-icon,
    #better-codex-context-menu .better-codex-status-icon,
    #better-codex-dialog .better-codex-status-icon {
      color: var(--bc-muted);
    }

    #better-codex-panel .better-codex-status-icon[data-status="in_progress"],
    #better-codex-panel [data-status="in_progress"] .better-codex-status-icon,
    #better-codex-context-menu .better-codex-status-icon[data-status="in_progress"],
    #better-codex-dialog .better-codex-status-icon[data-status="in_progress"] {
      color: var(--bc-warning);
    }

    #better-codex-panel .better-codex-status-icon[data-status="in_review"],
    #better-codex-panel [data-status="in_review"] .better-codex-status-icon,
    #better-codex-context-menu .better-codex-status-icon[data-status="in_review"],
    #better-codex-dialog .better-codex-status-icon[data-status="in_review"] {
      color: var(--bc-success);
    }

    #better-codex-panel .better-codex-status-icon[data-status="done"],
    #better-codex-panel [data-status="done"] .better-codex-status-icon,
    #better-codex-context-menu .better-codex-status-icon[data-status="done"],
    #better-codex-dialog .better-codex-status-icon[data-status="done"] {
      color: var(--bc-info);
    }

    #better-codex-panel .better-codex-status-icon[data-status="blocked"],
    #better-codex-panel [data-status="blocked"] .better-codex-status-icon,
    #better-codex-context-menu .better-codex-status-icon[data-status="blocked"],
    #better-codex-dialog .better-codex-status-icon[data-status="blocked"] {
      color: var(--bc-danger);
    }

    #better-codex-panel .better-codex-cards {
      padding: var(--bc-space-1);
      border-radius: var(--bc-radius-md);
    }

    #better-codex-panel .better-codex-card {
      width: 260px;
      margin-bottom: var(--bc-space-2);
      border: 1px solid var(--bc-color-hairline);
      border-radius: var(--bc-radius-md);
      color: var(--bc-color-text);
      background: transparent;
      padding: var(--bc-space-3);
      box-shadow: var(--bc-card-shadow);
      transition: transform var(--bc-motion-fast) var(--bc-ease-out), border-color var(--bc-motion-fast) ease-out, box-shadow var(--bc-motion-fast) ease-out;
    }

    #better-codex-panel .better-codex-card:hover {
      border-color: color-mix(in srgb, var(--bc-color-text) 16%, var(--bc-color-hairline));
      background: transparent;
      box-shadow: var(--bc-card-shadow), 0 8px 22px color-mix(in srgb, var(--bc-color-text) 8%, transparent);
    }

    #better-codex-panel .better-codex-card:active { transform: scale(.98); }

    #better-codex-panel .better-codex-chip,
    #better-codex-panel .better-codex-agent-default-badge,
    #better-codex-dialog .better-codex-property {
      border: 0;
      border-radius: var(--bc-radius-pill);
      color: var(--bc-color-text-muted);
      background: var(--bc-color-control);
      box-shadow: none;
    }

    #better-codex-dialog .better-codex-dialog-select {
      position: relative;
      display: inline-flex;
      min-width: 0;
    }

    #better-codex-dialog .better-codex-dialog-select-trigger {
      max-width: 220px;
      cursor: pointer;
      transition: background-color var(--bc-motion-fast) ease-out, box-shadow var(--bc-motion-fast) ease-out;
    }

    #better-codex-dialog .better-codex-dialog-select-trigger:hover,
    #better-codex-dialog .better-codex-dialog-select.is-open .better-codex-dialog-select-trigger {
      color: var(--bc-color-text);
      background: var(--bc-color-hover);
    }

    #better-codex-dialog .better-codex-dialog-select-trigger:focus-visible {
      outline: none;
      box-shadow: var(--bc-focus-ring);
    }

    #better-codex-dialog .better-codex-dialog-select-trigger > svg:last-child {
      width: calc(var(--bc-text-base) - 2px);
      height: calc(var(--bc-text-base) - 2px);
      margin-left: 1px;
      transition: transform var(--bc-motion-fast) var(--bc-ease-out);
    }

    #better-codex-dialog .better-codex-dialog-select.is-open .better-codex-dialog-select-trigger > svg:last-child {
      transform: rotate(180deg);
    }

    #better-codex-dialog .better-codex-dialog-select-trigger-visual,
    #better-codex-dialog .better-codex-dialog-select-option-visual {
      display: inline-flex;
      width: var(--bc-icon-sm);
      height: var(--bc-icon-sm);
      flex: 0 0 var(--bc-icon-sm);
      align-items: center;
      justify-content: center;
      line-height: 0;
    }

    #better-codex-dialog .better-codex-dialog-select-trigger-visual > svg,
    #better-codex-dialog .better-codex-dialog-select-option-visual > svg {
      display: block;
      width: var(--bc-icon-sm);
      height: var(--bc-icon-sm);
      flex: 0 0 auto;
    }

    #better-codex-dialog .better-codex-dialog-select-menu {
      position: absolute;
      bottom: calc(100% + var(--bc-space-2));
      left: 0;
      z-index: 40;
      box-sizing: border-box;
      width: max-content;
      min-width: 180px;
      max-width: min(280px, calc(100vw - 32px));
      max-height: 260px;
      overflow-y: auto;
      padding: 5px;
    }

    #better-codex-dialog .better-codex-dialog-select-menu[hidden] { display: none; }

    #better-codex-dialog .better-codex-dialog-select.is-agent .better-codex-dialog-select-menu {
      top: calc(100% + var(--bc-space-2));
      right: auto;
      bottom: auto;
    }

    #better-codex-dialog .better-codex-dialog-select-option {
      display: flex;
      width: 100%;
      align-items: center;
      gap: var(--bc-space-2);
      border: 0;
      color: var(--bc-color-text);
      background: transparent;
      padding: 0 var(--bc-space-2);
      font: inherit;
      font-size: var(--bc-text-sm);
      text-align: left;
      cursor: pointer;
    }

    #better-codex-dialog .better-codex-dialog-select-option:hover,
    #better-codex-dialog .better-codex-dialog-select-option:focus-visible,
    #better-codex-dialog .better-codex-dialog-select-option.is-selected {
      background: var(--bc-color-hover);
      outline: none;
    }

    #better-codex-dialog .better-codex-dialog-select-option > span:nth-child(2) {
      min-width: 0;
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    #better-codex-dialog .better-codex-dialog-select-check {
      display: inline-flex;
      width: 14px;
      flex: 0 0 auto;
      justify-content: center;
      color: var(--bc-color-text-muted);
    }

    #better-codex-panel .better-codex-agents {
      padding: 0;
      overflow: hidden;
    }

    #better-codex-panel .better-codex-agent-heading {
      align-items: center;
      gap: var(--bc-space-1);
    }

    #better-codex-panel .better-codex-agent-heading .better-codex-button {
      color: var(--bc-color-text-muted);
    }

    #better-codex-panel .better-codex-agent-heading .better-codex-button.is-active {
      color: var(--bc-color-text);
      background: var(--bc-color-control);
    }

    #better-codex-panel .better-codex-agent-shell {
      display: flex;
      width: 100%;
      height: 100%;
      min-height: 0;
    }

    #better-codex-panel .better-codex-agent-directory {
      box-sizing: border-box;
      width: 100%;
      min-width: 0;
      flex: 1;
      overflow-y: auto;
      padding: 24px 32px 48px;
    }

    #better-codex-panel .better-codex-agent-search-wrap,
    #better-codex-panel .better-codex-agent-list,
    #better-codex-panel .better-codex-agent-suggestions {
      width: min(100%, 802px);
      margin-inline: auto;
    }

    #better-codex-panel .better-codex-agent-search-wrap {
      position: relative;
      display: flex;
      align-items: center;
      margin-bottom: 30px;
    }

    #better-codex-panel .better-codex-agent-search-wrap > svg {
      position: absolute;
      left: 13px;
      z-index: 1;
      width: 16px;
      height: 16px;
      color: var(--bc-color-text-muted);
      pointer-events: none;
    }

    #better-codex-panel .better-codex-agent-search-wrap .better-codex-search {
      width: 100%;
      height: 36px;
      padding-left: 38px;
      border-radius: var(--bc-radius-md);
    }

    #better-codex-panel .better-codex-agent-list {
      display: grid;
      gap: var(--bc-space-1);
    }

    #better-codex-panel .better-codex-agent-row {
      box-sizing: border-box;
      display: flex;
      width: 100%;
      min-height: 72px;
      align-items: center;
      gap: var(--bc-space-3);
      border: 0;
      border-radius: var(--bc-radius-md);
      color: var(--bc-color-text);
      background: transparent;
      padding: 10px 14px;
      font: inherit;
      text-align: left;
      cursor: pointer;
      transition: background-color var(--bc-motion-fast) ease-out;
    }

    #better-codex-panel .better-codex-agent-row.is-selected {
      background: var(--bc-color-control);
    }

    #better-codex-panel .better-codex-agent-list-avatar {
      display: inline-flex;
      width: 36px;
      height: 36px;
      flex: 0 0 auto;
      align-items: center;
      justify-content: center;
      border-radius: var(--bc-radius-sm);
      overflow: hidden;
      color: var(--bc-color-text-muted);
      background: var(--bc-color-control);
    }

    #better-codex-panel .better-codex-agent-list-avatar.is-codex {
      overflow: hidden;
      color: inherit;
      background: transparent;
    }

    #better-codex-panel .better-codex-agent-list-avatar svg {
      width: 36px;
      height: 36px;
    }

    #better-codex-panel .better-codex-agent-list-avatar.is-fallback svg {
      width: 20px;
      height: 20px;
    }

    #better-codex-panel .better-codex-agent-list-avatar img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    #better-codex-panel .better-codex-agent-avatar-editor {
      position: relative;
      display: inline-flex;
      width: 36px;
      height: 36px;
      flex: 0 0 auto;
      border: 0;
      border-radius: var(--bc-radius-sm);
      background: transparent;
      padding: 0;
      font: inherit;
      cursor: pointer;
    }

    #better-codex-panel .better-codex-agent-avatar-overlay {
      position: absolute;
      inset: 0;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: inherit;
      color: white;
      background: rgb(0 0 0 / .58);
      opacity: 0;
      transition: opacity var(--bc-motion-fast) ease-out;
    }

    #better-codex-panel .better-codex-agent-avatar-overlay svg {
      width: 17px;
      height: 17px;
    }

    #better-codex-panel .better-codex-agent-avatar-editor:hover .better-codex-agent-avatar-overlay,
    #better-codex-panel .better-codex-agent-avatar-editor:focus-visible .better-codex-agent-avatar-overlay {
      opacity: 1;
    }

    #better-codex-panel .better-codex-agent-row-copy {
      display: flex;
      min-width: 0;
      flex: 1;
      flex-direction: column;
      gap: 2px;
    }

    #better-codex-panel .better-codex-agent-row-copy strong {
      display: flex;
      align-items: center;
      gap: var(--bc-space-2);
      font-size: var(--bc-text-md);
      font-weight: 620;
    }

    #better-codex-panel .better-codex-agent-row-copy strong small {
      border-radius: var(--bc-radius-pill);
      color: var(--bc-color-text-muted);
      background: var(--bc-color-control);
      padding: 1px 6px;
      font-size: var(--bc-text-xs);
      font-weight: 600;
    }

    #better-codex-panel .better-codex-agent-row-copy > span,
    #better-codex-panel .better-codex-agent-row-copy em {
      overflow: hidden;
      color: var(--bc-color-text-muted);
      font-size: var(--bc-text-sm);
      font-style: normal;
      line-height: 1.4;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    #better-codex-panel .better-codex-agent-row-copy em {
      color: var(--bc-color-text-faint);
      font-size: var(--bc-text-caption);
    }

    #better-codex-panel .better-codex-agent-row-chevron {
      display: inline-flex;
      color: var(--bc-color-text-faint);
      opacity: 0;
      transition: opacity var(--bc-motion-fast) ease-out, transform var(--bc-motion-fast) var(--bc-ease-out);
    }

    #better-codex-panel .better-codex-agent-row.is-selected .better-codex-agent-row-chevron {
      opacity: 1;
    }

    #better-codex-panel .better-codex-agent-list-empty {
      padding: 34px 14px;
      color: var(--bc-color-text-faint);
      font-size: var(--bc-text-md);
      text-align: center;
    }

    #better-codex-panel .better-codex-agent-suggestions {
      margin-top: 18px;
      padding-top: 18px;
    }

    #better-codex-panel .better-codex-agent-suggestions h3,
    #better-codex-panel .better-codex-agent-inspector-scroll > h3 {
      margin: 0 0 10px 8px;
      color: var(--bc-color-text-muted);
      font-size: var(--bc-text-md);
      font-weight: 560;
    }

    #better-codex-panel .better-codex-agent-suggestion {
      display: flex;
      width: 100%;
      min-height: 62px;
      align-items: center;
      gap: var(--bc-space-3);
      border: 0;
      border-radius: var(--bc-radius-md);
      color: var(--bc-color-text);
      background: transparent;
      padding: 10px 14px;
      font: inherit;
      text-align: left;
      cursor: pointer;
      transition: transform var(--bc-motion-fast) var(--bc-ease-out), background-color var(--bc-motion-fast) ease-out;
    }

    #better-codex-panel .better-codex-agent-suggestion-icon {
      display: inline-flex;
      width: 34px;
      height: 34px;
      flex: 0 0 auto;
      align-items: center;
      justify-content: center;
      border-radius: var(--bc-radius-sm);
      color: var(--bc-color-text-muted);
      background: var(--bc-color-surface);
    }

    #better-codex-panel .better-codex-agent-suggestion-icon > svg {
      width: 18px;
      height: 18px;
    }

    #better-codex-panel .better-codex-agent-suggestion-icon[data-tone="info"] {
      color: var(--bc-info);
      background: color-mix(in oklch, var(--bc-info) 14%, var(--bc-color-surface));
    }

    #better-codex-panel .better-codex-agent-suggestion-icon[data-tone="success"] {
      color: var(--bc-success);
      background: color-mix(in oklch, var(--bc-success) 14%, var(--bc-color-surface));
    }

    #better-codex-panel .better-codex-agent-suggestion-icon[data-tone="warning"] {
      color: var(--bc-warning);
      background: color-mix(in oklch, var(--bc-warning) 16%, var(--bc-color-surface));
    }

    #better-codex-panel .better-codex-agent-suggestion.is-selected {
      background: var(--bc-color-control);
    }

    #better-codex-panel .better-codex-agent-list-avatar.is-icon,
    #better-codex-dialog .better-codex-agent-avatar.is-icon {
      color: var(--bc-color-text-muted);
      background: var(--bc-color-control);
    }

    #better-codex-panel .better-codex-agent-list-avatar.is-icon svg {
      width: 18px;
      height: 18px;
    }

    #better-codex-panel .better-codex-agent-list-avatar.is-icon[data-tone="info"],
    #better-codex-dialog .better-codex-agent-avatar.is-icon[data-tone="info"] {
      color: var(--bc-info);
      background: color-mix(in oklch, var(--bc-info) 14%, var(--bc-color-surface));
    }

    #better-codex-panel .better-codex-agent-list-avatar.is-icon[data-tone="success"],
    #better-codex-dialog .better-codex-agent-avatar.is-icon[data-tone="success"] {
      color: var(--bc-success);
      background: color-mix(in oklch, var(--bc-success) 14%, var(--bc-color-surface));
    }

    #better-codex-panel .better-codex-agent-list-avatar.is-icon[data-tone="warning"],
    #better-codex-dialog .better-codex-agent-avatar.is-icon[data-tone="warning"] {
      color: var(--bc-warning);
      background: color-mix(in oklch, var(--bc-warning) 16%, var(--bc-color-surface));
    }

    #better-codex-panel .better-codex-agent-list-avatar.is-icon[data-tone="muted"],
    #better-codex-dialog .better-codex-agent-avatar.is-icon[data-tone="muted"] {
      color: var(--bc-color-text-muted);
      background: var(--bc-color-control);
    }

    #better-codex-panel .better-codex-agent-suggestion > span:last-child {
      display: flex;
      min-width: 0;
      flex-direction: column;
      gap: 3px;
    }

    #better-codex-panel .better-codex-agent-suggestion strong {
      font-size: var(--bc-text-md);
      font-weight: 600;
    }

    #better-codex-panel .better-codex-agent-suggestion small {
      overflow: hidden;
      color: var(--bc-color-text-muted);
      font-size: var(--bc-text-sm);
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    #better-codex-panel .better-codex-agent-inspector {
      width: min(32vw, 516px);
      min-width: 430px;
      flex: 0 0 auto;
      color: var(--bc-color-text);
      background: var(--bc-color-canvas);
      box-shadow: inset 1px 0 color-mix(in oklch, var(--bc-color-text) 6%, transparent);
    }

    #better-codex-panel .better-codex-agent-inspector form {
      display: flex;
      height: 100%;
      min-height: 0;
      flex-direction: column;
    }

    #better-codex-panel .better-codex-agent-inspector-head {
      display: flex;
      min-height: 56px;
      flex: 0 0 auto;
      align-items: center;
      justify-content: space-between;
      padding: 0 18px 0 22px;
      color: var(--bc-color-text-muted);
      font-size: var(--bc-text-md);
      font-weight: 600;
    }

    #better-codex-panel .better-codex-agent-inspector-scroll {
      min-height: 0;
      flex: 1;
      overflow-y: auto;
      padding: 0 22px 28px;
    }

    #better-codex-panel .better-codex-agent-profile-head {
      position: relative;
      display: grid;
      grid-template-columns: 54px minmax(0, 1fr);
      align-items: center;
      gap: var(--bc-space-3);
      margin: -2px 0 24px;
      isolation: isolate;
    }

    #better-codex-panel .better-codex-agent-profile-head h2 {
      min-width: 0;
      margin: 0;
      overflow: hidden;
      font-size: var(--bc-text-xl);
      font-weight: 570;
      letter-spacing: -.012em;
      line-height: 1.3;
      text-overflow: ellipsis;
      text-wrap: balance;
    }

    #better-codex-panel .better-codex-agent-profile-name {
      box-sizing: border-box;
      width: 100%;
      max-width: 100%;
      min-width: 0;
      height: 54px;
      border: 0;
      border-radius: var(--bc-radius-md);
      color: var(--bc-color-text);
      background: var(--bc-color-control);
      padding: 0 14px;
      box-shadow: var(--bc-inset-hairline);
      font: inherit;
      font-size: var(--bc-text-lg);
      font-weight: 560;
      outline: 0;
    }

    #better-codex-panel .better-codex-agent-profile-name::placeholder {
      color: var(--bc-color-text-faint);
      font-weight: 450;
    }

    #better-codex-panel .better-codex-agent-profile-name:focus {
      background: var(--bc-color-surface-raised);
      box-shadow: var(--bc-inset-hairline), var(--bc-focus-ring);
    }

    #better-codex-panel .better-codex-agent-profile-head .better-codex-agent-avatar-editor,
    #better-codex-panel .better-codex-agent-profile-head .better-codex-agent-list-avatar {
      width: 54px;
      height: 54px;
      border-radius: var(--bc-radius-md);
    }

    #better-codex-panel .better-codex-agent-profile-head .better-codex-agent-avatar-editor {
      position: relative;
      z-index: 1;
      grid-column: 1;
    }

    #better-codex-panel .better-codex-agent-profile-head .better-codex-agent-profile-name,
    #better-codex-panel .better-codex-agent-profile-head h2 {
      grid-column: 2;
    }

    #better-codex-panel .better-codex-agent-profile-head .better-codex-agent-list-avatar svg {
      width: 54px;
      height: 54px;
    }

    #better-codex-panel .better-codex-agent-profile-head .better-codex-agent-list-avatar.is-fallback svg {
      width: 27px;
      height: 27px;
    }

    #better-codex-panel .better-codex-agent-profile-head .better-codex-agent-list-avatar.is-icon svg,
    #better-codex-panel .better-codex-agent-avatar-field .better-codex-agent-list-avatar.is-icon svg {
      width: 26px;
      height: 26px;
    }

    #better-codex-panel .better-codex-agent-inspector-scroll > h2 {
      margin: 0 0 22px;
      font-size: var(--bc-text-xl);
      font-weight: 570;
      letter-spacing: -.012em;
      line-height: 1.3;
      text-wrap: balance;
    }

    #better-codex-panel .better-codex-agent-avatar-field {
      display: flex;
      align-items: center;
      gap: var(--bc-space-3);
      margin: -6px 0 24px;
    }

    #better-codex-panel .better-codex-agent-avatar-field .better-codex-agent-avatar-editor,
    #better-codex-panel .better-codex-agent-avatar-field .better-codex-agent-list-avatar {
      width: 54px;
      height: 54px;
      border-radius: var(--bc-radius-md);
    }

    #better-codex-panel .better-codex-agent-avatar-field .better-codex-agent-list-avatar svg {
      width: 54px;
      height: 54px;
    }

    #better-codex-panel .better-codex-agent-avatar-field .better-codex-agent-list-avatar.is-fallback svg {
      width: 27px;
      height: 27px;
    }

    #better-codex-panel .better-codex-agent-avatar-field .better-codex-agent-list-avatar.is-icon svg {
      width: 26px;
      height: 26px;
    }

    #better-codex-panel .better-codex-agent-avatar-field > div {
      display: flex;
      min-width: 0;
      flex-direction: column;
      gap: 3px;
    }

    #better-codex-panel .better-codex-agent-avatar-field strong {
      font-size: var(--bc-text-md);
      font-weight: 620;
    }

    #better-codex-panel .better-codex-agent-avatar-field span {
      color: var(--bc-color-text-muted);
      font-size: var(--bc-text-sm);
    }

    #better-codex-panel .better-codex-agent-summary {
      display: flex;
      align-items: flex-start;
      gap: var(--bc-space-3);
      margin-bottom: 30px;
      border-radius: var(--bc-radius-lg);
      background: var(--bc-color-control);
      padding: 16px;
      box-shadow: var(--bc-inset-hairline);
    }

    #better-codex-panel .better-codex-agent-summary-logo {
      display: inline-flex;
      width: 38px;
      height: 38px;
      flex: 0 0 auto;
    }

    #better-codex-panel .better-codex-agent-summary-logo svg {
      width: 38px;
      height: 38px;
    }

    #better-codex-panel .better-codex-agent-summary strong {
      display: block;
      margin-top: 1px;
      font-size: var(--bc-text-md);
      font-weight: 620;
    }

    #better-codex-panel .better-codex-agent-summary p {
      margin: 5px 0 0;
      color: var(--bc-color-text-muted);
      font-size: var(--bc-text-sm);
      line-height: 1.55;
      text-wrap: pretty;
    }

    #better-codex-panel .better-codex-agent-inspector-group {
      overflow: visible;
      margin-bottom: 26px;
      border-radius: var(--bc-radius-lg);
      background: var(--bc-color-input);
      padding: var(--bc-space-1);
      box-shadow: var(--bc-inset-hairline);
    }

    #better-codex-panel .better-codex-agent-setting {
      position: relative;
      display: flex;
      min-height: 46px;
      align-items: center;
      justify-content: space-between;
      gap: var(--bc-space-3);
      border-radius: var(--bc-radius-md);
      padding: 0 12px;
      font-size: var(--bc-text-md);
    }

    #better-codex-panel .better-codex-agent-setting + .better-codex-agent-setting {
      margin-top: 2px;
    }

    #better-codex-panel .better-codex-agent-picker-trigger {
      display: inline-flex;
      max-width: 245px;
      min-height: 32px;
      align-items: center;
      gap: 6px;
      border: 0;
      border-radius: var(--bc-radius-pill);
      color: var(--bc-color-text);
      background: transparent;
      padding: 7px 9px;
      font: inherit;
      text-align: right;
      outline: 0;
      cursor: pointer;
    }

    #better-codex-panel .better-codex-agent-picker-trigger > span {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    #better-codex-panel .better-codex-agent-picker-trigger svg {
      width: 12px;
      height: 12px;
      color: var(--bc-color-text-faint);
      transform: rotate(90deg);
      transition: transform var(--bc-motion-fast) var(--bc-ease-out);
    }

    #better-codex-panel .better-codex-agent-setting.is-open .better-codex-agent-picker-trigger {
      background: var(--bc-color-hover);
    }

    #better-codex-panel .better-codex-agent-setting.is-open .better-codex-agent-picker-trigger svg {
      transform: rotate(-90deg);
    }

    #better-codex-panel .better-codex-agent-menu {
      position: absolute;
      top: calc(100% - 2px);
      right: 8px;
      z-index: 120;
      box-sizing: border-box;
      display: none;
      width: min(232px, calc(100vw - 48px));
      max-height: 330px;
      overflow-y: auto;
      border: 0;
      border-radius: var(--bc-radius-md);
      color: var(--bc-color-text);
      background: var(--bc-color-surface-raised);
      padding: 6px;
      box-shadow: var(--bc-elevation-menu);
      transform-origin: top right;
    }

    #better-codex-panel .better-codex-agent-setting.is-open .better-codex-agent-menu {
      display: block;
      animation: better-codex-menu-enter var(--bc-motion-fast) var(--bc-ease-out);
    }

    #better-codex-panel .better-codex-agent-menu-title {
      padding: 5px 9px 7px;
      color: var(--bc-color-text-faint);
      font-size: var(--bc-text-caption);
      font-weight: 560;
    }

    #better-codex-panel .better-codex-agent-menu-item {
      display: flex;
      width: 100%;
      min-height: 32px;
      align-items: center;
      justify-content: space-between;
      gap: var(--bc-space-3);
      border: 0;
      border-radius: var(--bc-radius-xs);
      color: var(--bc-color-text);
      background: transparent;
      padding: 0 9px;
      font: inherit;
      font-size: var(--bc-text-sm);
      text-align: left;
      cursor: pointer;
    }

    #better-codex-panel .better-codex-agent-menu-item:hover,
    #better-codex-panel .better-codex-agent-menu-item:focus-visible {
      background: var(--bc-color-hover);
      outline: 0;
    }

    #better-codex-panel .better-codex-agent-menu-item svg {
      width: 13px;
      height: 13px;
      flex: 0 0 auto;
      color: var(--bc-color-text-muted);
    }

    #better-codex-panel .better-codex-agent-inspector-field {
      display: flex;
      margin-bottom: 18px;
      flex-direction: column;
      gap: 8px;
      color: var(--bc-color-text-muted);
      font-size: var(--bc-text-sm);
    }

    #better-codex-panel .better-codex-agent-inspector-field small {
      color: var(--bc-color-text-faint);
      font-size: var(--bc-text-caption);
      font-weight: 400;
    }

    #better-codex-panel .better-codex-agent-inspector-field input,
    #better-codex-panel .better-codex-agent-inspector-field textarea {
      box-sizing: border-box;
      width: 100%;
      border: 0;
      border-radius: var(--bc-radius-lg);
      color: var(--bc-color-text);
      background: var(--bc-color-input);
      padding: 13px 15px;
      box-shadow: var(--bc-inset-hairline);
      font: inherit;
      font-size: var(--bc-text-md);
      line-height: 1.55;
      outline: 0;
      resize: vertical;
    }

    #better-codex-panel .better-codex-agent-inspector-field input:focus,
    #better-codex-panel .better-codex-agent-inspector-field textarea:focus,
    #better-codex-panel .better-codex-agent-picker-trigger:focus-visible {
      background: var(--bc-color-input);
      box-shadow: var(--bc-inset-hairline), var(--bc-focus-ring);
    }

    #better-codex-panel .better-codex-agent-inspector-error {
      color: var(--bc-color-danger);
      font-size: var(--bc-text-sm);
    }

    #better-codex-panel .better-codex-agent-inspector-footer {
      display: flex;
      min-height: 72px;
      flex: 0 0 auto;
      align-items: center;
      justify-content: flex-end;
      gap: var(--bc-space-2);
      padding: 0 22px;
    }

    #better-codex-panel .better-codex-agent-inspector-footer .better-codex-submit,
    #better-codex-panel .better-codex-agent-danger {
      min-height: var(--bc-control-height);
      border: 0;
      border-radius: var(--bc-radius-sm);
      padding: 0 var(--bc-control-padding);
      font: inherit;
      font-size: var(--bc-text-sm);
      font-weight: 600;
      cursor: pointer;
    }

    #better-codex-panel .better-codex-agent-inspector-footer .better-codex-submit {
      min-width: 74px;
      color: var(--bc-color-on-primary);
      background: var(--bc-color-primary);
    }

    #better-codex-panel .better-codex-agent-danger {
      margin-right: auto;
      color: var(--bc-color-danger);
      background: var(--bc-color-danger-soft);
    }

    @keyframes better-codex-menu-enter {
      from { opacity: 0; transform: translateY(-4px) scale(.98); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }

    #better-codex-panel .better-codex-agent-grid {
      gap: var(--bc-space-3);
    }

    #better-codex-panel .better-codex-agent-card {
      min-height: 214px;
      border: 0;
      border-radius: var(--bc-radius-lg);
      color: var(--bc-color-text);
      background: var(--bc-color-surface);
      padding: var(--bc-space-4);
      box-shadow: none;
      transition: transform var(--bc-motion-fast) var(--bc-ease-out), background-color var(--bc-motion-fast) ease-out;
    }

    #better-codex-panel .better-codex-agent-card:hover {
      border: 0;
      background: var(--bc-color-control);
    }

    #better-codex-panel .better-codex-agent-card:active { transform: scale(.98); }

    #better-codex-panel .better-codex-agents-empty-icon {
      border: 0;
      border-radius: var(--bc-radius-lg);
      color: var(--bc-color-text-muted);
      background: var(--bc-color-surface);
      box-shadow: none;
    }


    /* Create/edit dialog: match board control density and dynamic type. */
    #better-codex-dialog {
      height: calc(var(--bc-text-base) * 38);
      max-height: calc(100vh - 48px);
    }

    #better-codex-dialog .better-codex-dialog-head {
      min-height: var(--bc-toolbar-height);
      padding: calc(var(--bc-text-base) * 0.7) calc(var(--bc-text-base) * 1.3) calc(var(--bc-text-base) * 0.5) calc(var(--bc-text-base) * 1.4);
    }

    #better-codex-dialog .better-codex-dialog-head-actions {
      display: inline-flex;
      align-items: center;
      gap: var(--bc-space-2);
    }

    #better-codex-dialog .better-codex-dialog-open-thread {
      display: inline-flex;
      min-height: var(--bc-control-height);
      align-items: center;
      justify-content: center;
      border: 0;
      border-radius: var(--bc-radius-sm);
      color: var(--bc-color-on-primary);
      background: var(--bc-color-primary);
      padding: 0 var(--bc-control-padding);
      font: inherit;
      font-size: var(--bc-text-md);
      font-weight: 600;
      cursor: pointer;
      transition: transform var(--bc-motion-fast) var(--bc-ease-out), background-color var(--bc-motion-fast) ease-out, opacity var(--bc-motion-fast) ease-out;
    }

    #better-codex-dialog .better-codex-dialog-open-thread:hover {
      background: color-mix(in oklch, var(--bc-color-primary) 88%, var(--bc-color-canvas));
    }

    #better-codex-dialog .better-codex-dialog-open-thread:active {
      transform: scale(.96);
    }

    #better-codex-dialog .better-codex-dialog-breadcrumb,
    #better-codex-dialog .better-codex-dialog-editor,
    #better-codex-dialog .better-codex-agent-picker,
    #better-codex-dialog .better-codex-property,
    #better-codex-dialog .better-codex-project-search,
    #better-codex-dialog .better-codex-project-option,
    #better-codex-dialog .better-codex-dialog-select-option,
    #better-codex-dialog .better-codex-switch-mode,
    #better-codex-dialog .better-codex-keep-open,
    #better-codex-dialog .better-codex-submit,
    #better-codex-dialog .better-codex-run-hint,
    #better-codex-dialog .better-codex-dialog-error,
    #better-codex-confirm .better-codex-confirm-title,
    #better-codex-confirm .better-codex-confirm-message,
    #better-codex-confirm button,
    #better-codex-agent-dialog .better-codex-button,
    #better-codex-agent-dialog .better-codex-submit {
      font-size: var(--bc-text-md);
    }

    #better-codex-dialog .better-codex-manual-title {
      font-size: var(--bc-text-xl);
      line-height: 1.45;
    }

    #better-codex-dialog .better-codex-icon-button {
      width: var(--bc-control-height);
      height: var(--bc-control-height);
      border-radius: var(--bc-radius-sm);
    }

    #better-codex-dialog .better-codex-icon-button svg {
      width: var(--bc-icon-md);
      height: var(--bc-icon-md);
    }

    #better-codex-dialog .better-codex-property {
      height: var(--bc-control-height);
      max-width: min(240px, 42vw);
      gap: var(--bc-space-2);
      padding-inline: calc(var(--bc-text-base) * 0.75);
    }

    #better-codex-dialog .better-codex-property svg,
    #better-codex-dialog .better-codex-status-icon,
    #better-codex-dialog .better-codex-priority {
      width: var(--bc-icon-sm);
      height: var(--bc-icon-sm);
      flex: 0 0 var(--bc-icon-sm);
    }

    #better-codex-dialog .better-codex-dialog-properties {
      gap: var(--bc-space-2);
      padding: var(--bc-space-2) calc(var(--bc-text-base) * 1.15) calc(var(--bc-text-base) * 0.75);
    }

    #better-codex-dialog .better-codex-dialog-footer {
      min-height: calc(var(--bc-control-height) + var(--bc-space-4));
      gap: var(--bc-space-3);
      padding: 0 var(--bc-space-4) 0 calc(var(--bc-text-base) * 1.3);
    }

    #better-codex-dialog .better-codex-switch-mode {
      height: var(--bc-control-height);
      gap: var(--bc-space-2);
      border-radius: var(--bc-radius-sm);
      padding: 0 var(--bc-control-padding);
    }

    #better-codex-dialog .better-codex-submit {
      min-width: calc(var(--bc-text-base) * 8);
      height: var(--bc-control-height);
      border-radius: var(--bc-radius-sm);
      padding: 0 var(--bc-control-padding);
    }

    #better-codex-dialog .better-codex-keep-open {
      gap: var(--bc-space-2);
    }

    #better-codex-dialog .better-codex-project-search {
      height: var(--bc-control-height);
    }

    #better-codex-panel .better-codex-button,
    #better-codex-dialog .better-codex-button,
    #better-codex-panel .better-codex-search {
      min-height: var(--bc-control-height);
      font-size: var(--bc-text-md);
    }

    #better-codex-panel .better-codex-search {
      height: var(--bc-control-height);
    }

    #better-codex-panel .better-codex-column-icon,
    #better-codex-panel .better-codex-agent-card-action,
    #better-codex-update-notice .better-codex-update-close {
      width: var(--bc-control-height);
      height: var(--bc-control-height);
    }

    #better-codex-confirm button {
      height: var(--bc-control-height);
      min-height: var(--bc-control-height);
    }

    #better-codex-agent-dialog .better-codex-button,
    #better-codex-agent-dialog .better-codex-submit {
      min-height: var(--bc-control-height);
    }

    #better-codex-panel .better-codex-agent-inspector-head {
      min-height: var(--bc-toolbar-height);
    }

    #better-codex-dialog,
    #better-codex-agent-dialog,
    #better-codex-confirm {
      border: 0;
      border-radius: var(--bc-radius-xl);
      color: var(--bc-color-text);
      background: var(--bc-color-surface-raised);
      box-shadow: var(--bc-elevation-float);
      animation: better-codex-surface-enter var(--bc-motion-normal) var(--bc-ease-out);
    }

    #better-codex-dialog::backdrop,
    #better-codex-agent-dialog::backdrop,
    #better-codex-confirm::backdrop {
      background: var(--bc-color-scrim);
      backdrop-filter: none;
    }

    #better-codex-agent-dialog .better-codex-agent-dialog-head,
    #better-codex-agent-dialog .better-codex-agent-dialog-footer,
    #better-codex-dialog .better-codex-dialog-footer,
    #better-codex-confirm .better-codex-confirm-actions {
      border: 0;
      background: transparent;
    }

    #better-codex-agent-dialog .better-codex-agent-settings {
      border: 0;
      border-radius: var(--bc-radius-md);
      background: var(--bc-color-input);
      box-shadow: none;
    }

    #better-codex-agent-dialog .better-codex-agent-field + .better-codex-agent-field {
      border: 0;
      margin-top: var(--bc-space-1);
    }

    #better-codex-dialog .better-codex-toggle {
      width: calc(var(--bc-text-base) * 1.85);
      height: calc(var(--bc-text-base) * 1.05);
      background: var(--bc-color-control);
      box-shadow: var(--bc-inset-hairline);
    }

    #better-codex-dialog .better-codex-toggle::after {
      top: calc(var(--bc-text-base) * 0.15);
      left: calc(var(--bc-text-base) * 0.15);
      width: calc(var(--bc-text-base) * 0.75);
      height: calc(var(--bc-text-base) * 0.75);
    }

    #better-codex-dialog .better-codex-toggle:checked::after {
      transform: translateX(calc(var(--bc-text-base) * 0.8));
    }

    #better-codex-agent-dialog input,
    #better-codex-agent-dialog textarea,
    #better-codex-agent-dialog select,
    #better-codex-dialog .better-codex-project-search {
      border: 0;
      border-radius: var(--bc-radius-sm);
      color: var(--bc-color-text);
      background: var(--bc-color-input);
      box-shadow: var(--bc-inset-hairline);
    }

    #better-codex-agent-dialog input:focus,
    #better-codex-agent-dialog textarea:focus,
    #better-codex-agent-dialog select:focus,
    #better-codex-dialog .better-codex-project-search:focus {
      border: 0;
      background: var(--bc-color-input);
      box-shadow: var(--bc-inset-hairline), var(--bc-focus-ring);
    }

    #better-codex-confirm .better-codex-confirm-actions { padding: 0 var(--bc-space-4) var(--bc-space-4); }

    #better-codex-confirm button {
      height: var(--bc-control-height);
      border: 0;
      border-radius: var(--bc-radius-sm);
      color: var(--bc-color-text);
      background: var(--bc-color-control);
      box-shadow: none;
      transition: transform var(--bc-motion-fast) var(--bc-ease-out), background-color var(--bc-motion-fast) ease-out;
    }

    #better-codex-confirm .better-codex-confirm-primary {
      color: var(--bc-color-on-primary);
      background: var(--bc-color-danger);
    }

    #better-codex-update-notice {
      border: 0;
      border-radius: var(--bc-radius-lg);
      outline: 0;
      color: var(--bc-color-text);
      background: var(--bc-color-surface-raised);
      box-shadow: var(--bc-elevation-float);
    }

    #better-codex-avatar-picker {
      position: fixed;
      z-index: 120;
      width: min(360px, calc(100vw - 16px));
      border: 0;
      border-radius: var(--bc-radius-lg);
      outline: 0;
      color: var(--bc-color-text);
      background: var(--bc-color-surface-raised);
      padding: 0;
      box-shadow: var(--bc-elevation-menu);
    }

    #better-codex-avatar-picker::backdrop {
      display: none;
    }

    #better-codex-avatar-picker[open] {
      animation: none;
    }

    #better-codex-avatar-picker .better-codex-avatar-picker-shell {
      display: flex;
      flex-direction: column;
      gap: var(--bc-space-3);
      padding: var(--bc-space-3);
    }

    #better-codex-avatar-picker header,
    #better-codex-avatar-picker footer {
      display: flex;
      align-items: center;
      gap: var(--bc-space-2);
    }

    #better-codex-avatar-picker header {
      justify-content: space-between;
    }

    #better-codex-avatar-picker header > div {
      display: flex;
      min-width: 0;
      flex: 1;
      flex-direction: column;
      gap: 2px;
    }

    #better-codex-avatar-picker header strong {
      font-size: var(--bc-text-lg);
      font-weight: 650;
      letter-spacing: -.01em;
    }

    #better-codex-avatar-picker header span {
      color: var(--bc-color-text-muted);
      font-size: var(--bc-text-sm);
      line-height: 1.4;
    }

    #better-codex-avatar-picker header > button {
      display: inline-flex;
      width: 32px;
      height: 32px;
      flex: 0 0 auto;
      align-items: center;
      justify-content: center;
      border: 0;
      border-radius: var(--bc-radius-sm);
      color: var(--bc-color-text-muted);
      background: transparent;
      padding: 0;
      cursor: pointer;
      transition: background-color var(--bc-motion-fast) ease-out, color var(--bc-motion-fast) ease-out, transform var(--bc-motion-fast) var(--bc-ease-out);
    }

    #better-codex-avatar-picker header > button > svg {
      display: block;
      width: 16px;
      height: 16px;
    }

    #better-codex-avatar-picker .better-codex-avatar-preset-grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: var(--bc-space-1);
      padding: var(--bc-space-1);
      border-radius: var(--bc-radius-md);
      background: var(--bc-color-canvas);
      box-shadow: var(--bc-inset-hairline);
    }

    #better-codex-avatar-picker .better-codex-avatar-preset {
      display: flex;
      min-width: 0;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 6px;
      border: 0;
      border-radius: var(--bc-radius-sm);
      color: var(--bc-color-text);
      background: transparent;
      padding: 10px 6px 8px;
      font: inherit;
      cursor: pointer;
      transition: background-color var(--bc-motion-fast) ease-out, transform var(--bc-motion-fast) var(--bc-ease-out);
    }

    #better-codex-avatar-picker .better-codex-avatar-preset-visual {
      display: inline-flex;
      width: 40px;
      height: 40px;
      flex: 0 0 auto;
      align-items: center;
      justify-content: center;
      border-radius: var(--bc-radius-sm);
      color: var(--bc-color-text-muted);
      background: var(--bc-color-control);
      transition: box-shadow var(--bc-motion-fast) ease-out, transform var(--bc-motion-fast) var(--bc-ease-out);
    }

    #better-codex-avatar-picker .better-codex-avatar-preset-visual > svg {
      display: block;
      width: 18px;
      height: 18px;
    }

    #better-codex-avatar-picker .better-codex-avatar-preset-visual[data-tone="info"] {
      color: var(--bc-info);
      background: color-mix(in oklch, var(--bc-info) 14%, var(--bc-color-surface));
    }

    #better-codex-avatar-picker .better-codex-avatar-preset-visual[data-tone="success"] {
      color: var(--bc-success);
      background: color-mix(in oklch, var(--bc-success) 14%, var(--bc-color-surface));
    }

    #better-codex-avatar-picker .better-codex-avatar-preset-visual[data-tone="warning"] {
      color: var(--bc-warning);
      background: color-mix(in oklch, var(--bc-warning) 16%, var(--bc-color-surface));
    }

    #better-codex-avatar-picker .better-codex-avatar-preset-visual[data-tone="muted"] {
      color: var(--bc-color-text-muted);
      background: var(--bc-color-control);
    }

    #better-codex-avatar-picker .better-codex-avatar-preset-label {
      max-width: 100%;
      overflow: hidden;
      color: var(--bc-color-text-muted);
      font-size: var(--bc-text-sm);
      line-height: 1.3;
      text-align: center;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    #better-codex-avatar-picker .better-codex-avatar-preset.is-selected {
      background: var(--bc-color-control);
    }

    #better-codex-avatar-picker .better-codex-avatar-preset.is-selected .better-codex-avatar-preset-visual {
      box-shadow: var(--bc-inset-hairline), var(--bc-focus-ring);
    }

    #better-codex-avatar-picker .better-codex-avatar-preset.is-selected .better-codex-avatar-preset-label {
      color: var(--bc-color-text);
      font-weight: 560;
    }

    #better-codex-avatar-picker footer {
      justify-content: flex-end;
    }

    #better-codex-avatar-picker footer button {
      display: inline-flex;
      min-height: var(--bc-control-height);
      align-items: center;
      justify-content: center;
      gap: 6px;
      border: 0;
      border-radius: var(--bc-radius-sm);
      color: var(--bc-color-text);
      background: var(--bc-color-control);
      padding: 0 var(--bc-control-padding);
      font: inherit;
      font-size: var(--bc-text-sm);
      font-weight: 560;
      cursor: pointer;
      transition: background-color var(--bc-motion-fast) ease-out, color var(--bc-motion-fast) ease-out, transform var(--bc-motion-fast) var(--bc-ease-out);
    }

    #better-codex-avatar-picker footer button.is-primary {
      color: var(--bc-color-on-primary);
      background: var(--bc-color-primary);
    }

    #better-codex-avatar-picker footer button > svg {
      display: block;
      width: 14px;
      height: 14px;
    }

    #better-codex-avatar-cropper {
      width: min(420px, calc(100vw - 32px));
      border: 0;
      border-radius: var(--bc-radius-xl);
      outline: 0;
      color: var(--bc-color-text);
      background: var(--bc-color-surface-raised);
      padding: 0;
      box-shadow: var(--bc-elevation-float);
    }

    #better-codex-avatar-cropper::backdrop {
      background: var(--bc-color-scrim);
    }

    #better-codex-avatar-cropper[open] {
      animation: better-codex-surface-enter var(--bc-motion-normal) var(--bc-ease-out);
    }

    #better-codex-avatar-cropper .better-codex-avatar-cropper-shell {
      padding: 18px;
    }

    #better-codex-avatar-cropper header,
    #better-codex-avatar-cropper footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    #better-codex-avatar-cropper header {
      margin-bottom: 16px;
    }

    #better-codex-avatar-cropper header > div {
      display: flex;
      flex-direction: column;
      gap: 3px;
    }

    #better-codex-avatar-cropper header strong {
      font-size: var(--bc-text-lg);
      font-weight: 630;
    }

    #better-codex-avatar-cropper header span {
      color: var(--bc-color-text-muted);
      font-size: var(--bc-text-sm);
    }

    #better-codex-avatar-cropper button {
      min-height: 34px;
      border: 0;
      border-radius: var(--bc-radius-sm);
      color: var(--bc-color-text);
      background: var(--bc-color-control);
      padding: 0 13px;
      font: inherit;
      font-size: var(--bc-text-md);
      cursor: pointer;
    }

    #better-codex-avatar-cropper header button {
      display: inline-flex;
      width: 32px;
      min-height: 32px;
      align-items: center;
      justify-content: center;
      background: transparent;
      padding: 0;
    }

    #better-codex-avatar-cropper .better-codex-avatar-canvas-wrap {
      position: relative;
      overflow: hidden;
      width: min(100%, 344px);
      aspect-ratio: 1;
      margin-inline: auto;
      border-radius: var(--bc-radius-lg);
      background: var(--bc-color-control);
      touch-action: none;
    }

    #better-codex-avatar-cropper canvas {
      display: block;
      width: 100%;
      height: 100%;
      cursor: grab;
    }

    #better-codex-avatar-cropper canvas:active {
      cursor: grabbing;
    }

    #better-codex-avatar-cropper .better-codex-avatar-crop-guide {
      position: absolute;
      inset: 0;
      border: 1px solid rgb(255 255 255 / .7);
      border-radius: inherit;
      box-shadow: inset 0 0 0 1px rgb(0 0 0 / .22);
      pointer-events: none;
    }

    #better-codex-avatar-cropper .better-codex-avatar-zoom {
      display: flex;
      align-items: center;
      gap: 10px;
      margin: 14px 3px 18px;
      color: var(--bc-color-text-muted);
    }

    #better-codex-avatar-cropper .better-codex-avatar-zoom span {
      display: inline-flex;
    }

    #better-codex-avatar-cropper .better-codex-avatar-zoom span:first-child svg {
      width: 14px;
      height: 14px;
    }

    #better-codex-avatar-cropper .better-codex-avatar-zoom span:last-child svg {
      width: 19px;
      height: 19px;
    }

    #better-codex-avatar-cropper input[type="range"] {
      min-width: 0;
      flex: 1;
      accent-color: var(--bc-color-primary);
    }

    #better-codex-avatar-cropper footer {
      justify-content: flex-end;
      gap: var(--bc-space-2);
    }

    #better-codex-avatar-cropper button.is-primary {
      color: var(--bc-color-on-primary);
      background: var(--bc-color-primary);
    }

    #better-codex-panel button:focus-visible,
    #better-codex-panel input:focus-visible,
    #better-codex-dialog button:focus-visible,
    #better-codex-agent-dialog button:focus-visible,
    #better-codex-confirm button:focus-visible,
    #better-codex-context-menu button:focus-visible,
    #better-codex-avatar-cropper button:focus-visible,
    #better-codex-avatar-cropper input:focus-visible,
    #better-codex-update-notice button:focus-visible {
      outline: 0;
      box-shadow: var(--bc-focus-ring);
    }

    #better-codex-panel button:active,
    #better-codex-dialog button:active,
    #better-codex-agent-dialog button:active,
    #better-codex-confirm button:active,
    #better-codex-context-menu button:active,
    #better-codex-avatar-cropper button:active,
    #better-codex-update-notice button:active {
      transform: scale(.96);
    }

    @media (hover: hover) {
      #better-codex-panel .better-codex-button:hover,
      #better-codex-panel .better-codex-column-icon:hover,
      #better-codex-panel .better-codex-agent-card-action:hover,
      #better-codex-dialog .better-codex-icon-button:hover,
      #better-codex-dialog .better-codex-switch-mode:hover,
      #better-codex-confirm button:hover,
      #better-codex-update-notice button:hover {
        color: var(--bc-color-text);
        background: var(--bc-color-hover);
      }

      #better-codex-panel .better-codex-agent-row:hover,
      #better-codex-panel .better-codex-agent-suggestion:hover {
        background: var(--bc-color-hover);
      }

      #better-codex-panel .better-codex-agent-row:hover .better-codex-agent-row-chevron {
        opacity: 1;
        transform: translateX(2px);
      }

      #better-codex-confirm .better-codex-confirm-primary:hover {
        color: var(--bc-color-on-primary);
        background: color-mix(in oklch, var(--bc-color-danger) 86%, black);
      }

      #better-codex-avatar-picker header > button:hover {
        color: var(--bc-color-text);
        background: var(--bc-color-hover);
      }

      #better-codex-avatar-picker .better-codex-avatar-preset:hover {
        background: var(--bc-color-hover);
      }

      #better-codex-avatar-picker footer button:hover {
        background: var(--bc-color-hover);
      }

      #better-codex-avatar-picker footer button.is-primary:hover {
        background: color-mix(in srgb, var(--bc-color-primary) 90%, var(--bc-color-canvas));
      }
    }

    @keyframes better-codex-surface-enter {
      from { opacity: 0; transform: translateY(8px) scale(.985); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }

    @media (max-width: 720px) {
      #better-codex-panel .better-codex-toolbar {
        min-height: auto;
        align-items: stretch;
        flex-direction: column;
        padding: var(--bc-space-3);
      }

      #better-codex-panel .better-codex-actions,
      #better-codex-panel .better-codex-agent-actions {
        width: 100%;
        overflow-x: auto;
        padding-bottom: 2px;
      }

      #better-codex-panel .better-codex-search { min-width: 140px; flex: 1; }
      #better-codex-panel .better-codex-board { padding-inline: var(--bc-space-3); }
      #better-codex-panel .better-codex-agents { padding-inline: var(--bc-space-3); }
      #better-codex-panel .better-codex-agent-directory { padding: 18px 12px 36px; }
      #better-codex-panel .better-codex-agent-shell[data-pane="detail"] .better-codex-agent-directory,
      #better-codex-panel .better-codex-agent-shell[data-pane="create"] .better-codex-agent-directory { display: none; }
      #better-codex-panel[data-surface="agents"][data-agent-pane="detail"],
      #better-codex-panel[data-surface="agents"][data-agent-pane="create"] { grid-template-columns: 0 minmax(0, 1fr); }
      #better-codex-panel[data-surface="agents"][data-agent-pane="detail"] .better-codex-toolbar,
      #better-codex-panel[data-surface="agents"][data-agent-pane="create"] .better-codex-toolbar { display: none; }
      #better-codex-panel .better-codex-agent-inspector { width: 100%; min-width: 0; }
      #better-codex-panel .better-codex-agent-grid { grid-template-columns: 1fr; }
      #better-codex-dialog, #better-codex-agent-dialog, #better-codex-confirm, #better-codex-avatar-picker, #better-codex-avatar-cropper { width: calc(100vw - 24px); }
      #better-codex-dialog .better-codex-dialog-footer { align-items: flex-end; padding-block: var(--bc-space-2); }
      #better-codex-dialog .better-codex-dialog-footer-right { flex-wrap: wrap; }
    }

    @media (prefers-reduced-motion: reduce) {
      #better-codex-dialog,
      #better-codex-agent-dialog,
      #better-codex-confirm,
      #better-codex-avatar-picker,
      #better-codex-avatar-cropper,
      #better-codex-update-notice {
        animation: none;
      }

      #better-codex-panel button,
      #better-codex-dialog button,
      #better-codex-agent-dialog button,
      #better-codex-confirm button,
      #better-codex-context-menu button,
      #better-codex-avatar-picker button,
      #better-codex-avatar-cropper button,
      #better-codex-update-notice button {
        transition: none;
      }
    }
  `;
}
