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
      --bc-font-ui: var(--bc-host-light-font-ui, var(--font-sans, ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif));
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
      --bc-page-toolbar-height: max(50px, calc(var(--bc-control-height) + var(--bc-space-2)));
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
      --bc-success: oklch(.55 .16 145);
      --bc-warning: oklch(.75 .16 85);
      --bc-color-scrim: rgb(18 18 20 / .28);
      --bc-priority-none: oklch(.62 .01 286);
      --bc-priority-low: oklch(.55 .1 250);
      --bc-priority-medium: oklch(.76 .15 95);
      --bc-priority-high: oklch(.68 .18 52);
      --bc-priority-urgent: var(--bc-color-danger);
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
      --bc-elevation-card: 0 1px 2px rgb(15 15 18 / .04), 0 2px 6px rgb(15 15 18 / .05);

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
      --bc-font-ui: var(--bc-host-dark-font-ui, var(--font-sans, ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif));
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
      --bc-success: oklch(.65 .15 145);
      --bc-warning: oklch(.70 .16 85);
      --bc-color-scrim: rgb(0 0 0 / .56);
      --bc-priority-none: oklch(.68 .01 286);
      --bc-priority-low: oklch(.68 .1 250);
      --bc-priority-medium: oklch(.78 .14 95);
      --bc-priority-high: oklch(.74 .16 52);
      --bc-priority-urgent: var(--bc-color-danger);
      --bc-elevation-float: 0 22px 58px rgb(0 0 0 / .5), 0 4px 14px rgb(0 0 0 / .3);
      --bc-elevation-menu: 0 14px 34px rgb(0 0 0 / .38), 0 3px 10px rgb(0 0 0 / .22);
      --bc-elevation-card: 0 1px 2px rgb(0 0 0 / .2), 0 2px 8px rgb(0 0 0 / .22);
    }

    #better-codex-panel,
    #better-codex-archive-dialog,
    #better-codex-dialog,
    #better-codex-agent-dialog,
    #better-codex-confirm,
    #better-codex-auto-dispatch-help-dialog,
    #better-codex-context-menu,
    #better-codex-update-notice,
    .better-codex-completion-notice,
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

    #better-codex-archive-dialog {
      width: min(1120px, calc(100vw - 48px), calc((100vh - 48px) * 1.5));
      height: min(746.667px, calc(100vh - 48px), calc((100vw - 48px) * .666667));
      max-height: calc(100vh - 48px);
      margin: auto;
      border: 0;
      border-radius: var(--bc-radius-lg);
      padding: 0;
      color: var(--bc-color-text);
      background: var(--bc-color-canvas);
      box-shadow: var(--bc-elevation-float);
    }

    #better-codex-archive-dialog::backdrop {
      background: var(--bc-color-scrim);
    }

    #better-codex-archive-dialog .better-codex-archive-shell {
      display: flex;
      height: 100%;
      flex-direction: column;
      overflow: auto;
      box-sizing: border-box;
      padding: 64px 96px 0;
    }

    #better-codex-archive-dialog header {
      display: flex;
      min-height: var(--bc-control-height);
      align-items: center;
      justify-content: space-between;
      gap: var(--bc-space-3);
      margin-bottom: 24px;
      padding: 0;
    }

    #better-codex-archive-dialog header h1 {
      display: inline-flex;
      align-items: center;
      margin: 0;
      font-size: 30px;
      font-weight: 400;
      line-height: 1.2;
    }

    #better-codex-archive-dialog .better-codex-archive-delete-all {
      display: inline-flex;
      height: 36px;
      align-items: center;
      gap: 6px;
      border: 0;
      border-radius: 12px;
      padding-inline: var(--bc-control-padding);
      color: var(--bc-color-danger);
      background: var(--bc-color-danger-soft);
      font: inherit;
      font-size: var(--bc-text-md);
      font-weight: 500;
      cursor: pointer;
    }

    #better-codex-archive-dialog .better-codex-archive-delete-all svg {
      width: var(--bc-icon-md);
      height: var(--bc-icon-md);
    }

    #better-codex-archive-dialog .better-codex-archive-toolbar {
      position: relative;
      display: grid;
      grid-template-columns: minmax(0, 1fr) 210px;
      align-items: center;
      gap: var(--bc-space-2);
      margin-bottom: 36px;
    }

    #better-codex-archive-dialog .better-codex-archive-search,
    #better-codex-archive-dialog .better-codex-archive-filter {
      display: flex;
      box-sizing: border-box;
      align-items: center;
      gap: 9px;
      height: 36px;
      border: 0;
      border-radius: 12px;
      color: var(--bc-color-text);
      background: var(--bc-color-canvas);
      box-shadow: var(--bc-inset-hairline);
      padding-inline: var(--bc-control-padding);
      font: inherit;
      font-size: 16px;
    }

    #better-codex-archive-dialog .better-codex-archive-search {
      width: auto;
      min-width: 0;
      color: var(--bc-color-text-muted);
    }

    #better-codex-archive-dialog .better-codex-archive-search > svg,
    #better-codex-archive-dialog .better-codex-archive-filter > svg:first-child {
      width: 18px;
      height: 18px;
      color: var(--bc-color-text-muted);
    }

    #better-codex-archive-dialog .better-codex-archive-filter > svg:last-child {
      width: var(--bc-icon-sm);
      height: var(--bc-icon-sm);
      color: var(--bc-color-text-faint);
    }

    #better-codex-archive-dialog .better-codex-archive-project-filter > svg:first-child {
      color: var(--bc-color-text);
    }

    #better-codex-archive-dialog .better-codex-archive-project-filter {
      width: 210px;
      flex: 0 0 auto;
      margin-left: 0;
      white-space: nowrap;
    }

    #better-codex-archive-dialog .better-codex-archive-search input,
    #better-codex-archive-dialog .better-codex-archive-project-filter select {
      min-width: 0;
      flex: 1;
      border: 0;
      outline: 0;
      color: inherit;
      background: transparent;
      font: inherit;
      font-size: inherit;
    }

    #better-codex-archive-dialog .better-codex-archive-search input::placeholder {
      color: var(--bc-color-text-muted);
    }

    #better-codex-archive-dialog .better-codex-archive-filter {
      justify-content: space-between;
      cursor: pointer;
    }

    #better-codex-archive-dialog .better-codex-archive-filter > svg:first-child {
      flex: 0 0 auto;
    }

    #better-codex-archive-dialog .better-codex-archive-project-filter select {
      appearance: none;
      cursor: pointer;
    }

    #better-codex-archive-dialog .better-codex-archive-project-menu {
      position: absolute;
      top: calc(100% + var(--bc-space-1));
      right: 0;
      z-index: 2;
      display: flex;
      width: 210px;
      box-sizing: border-box;
      flex-direction: column;
      gap: 2px;
      border: 0;
      border-radius: var(--bc-radius-md);
      padding: var(--bc-space-1);
      background: var(--bc-color-surface-raised);
      box-shadow: var(--bc-elevation-menu);
    }

    #better-codex-archive-dialog .better-codex-archive-project-menu button {
      display: flex;
      min-height: 34px;
      align-items: center;
      gap: 8px;
      width: 100%;
      border: 0;
      border-radius: 12px;
      color: var(--bc-color-text);
      background: transparent;
      padding: 0 var(--bc-space-3);
      font: inherit;
      font-size: var(--bc-text-md);
      text-align: left;
      cursor: pointer;
    }

    #better-codex-archive-dialog .better-codex-archive-project-menu button svg {
      width: var(--bc-icon-sm);
      height: var(--bc-icon-sm);
      flex: 0 0 auto;
    }

    #better-codex-archive-dialog .better-codex-archive-project-menu button.is-danger {
      color: var(--bc-color-danger);
    }

    #better-codex-archive-dialog .better-codex-archive-project-menu button:hover {
      background: var(--bc-color-hover);
    }

    #better-codex-archive-dialog .better-codex-archive-group-menu {
      width: max-content;
      max-width: calc(100vw - 32px);
    }

    #better-codex-archive-dialog .better-codex-archive-group-menu button {
      width: max-content;
      max-width: 100%;
      white-space: nowrap;
    }

    #better-codex-archive-dialog .better-codex-archive-list {
      display: flex;
      min-height: 120px;
      flex-direction: column;
      gap: 36px;
    }

    #better-codex-archive-dialog .better-codex-archive-end-spacer {
      height: 64px;
      flex: 0 0 64px;
      margin-top: -36px;
    }

    #better-codex-archive-dialog .better-codex-archive-group {
      display: flex;
      flex-direction: column;
      gap: var(--bc-space-3);
    }

    #better-codex-archive-dialog .better-codex-archive-group-head,
    #better-codex-archive-dialog .better-codex-archive-project-name,
    #better-codex-archive-dialog .better-codex-archive-row,
    #better-codex-archive-dialog .better-codex-archive-row-actions {
      display: flex;
      align-items: center;
    }

    #better-codex-archive-dialog .better-codex-archive-group-head {
      position: relative;
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto var(--bc-control-height);
      gap: var(--bc-space-2);
    }

    #better-codex-archive-dialog .better-codex-archive-project-name {
      min-width: 0;
      width: max-content;
      max-width: 100%;
      justify-self: start;
      gap: var(--bc-space-2);
      border: 0;
      color: var(--bc-color-text);
      background: transparent;
      padding: 0;
      font: inherit;
      text-align: start;
      cursor: pointer;
    }

    #better-codex-archive-dialog .better-codex-archive-project-name svg {
      width: 18px;
      height: 18px;
      color: var(--bc-color-text);
    }

    #better-codex-archive-dialog .better-codex-archive-project-name strong {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-size: 16px;
      font-weight: 500;
    }

    #better-codex-archive-dialog .better-codex-archive-project-count {
      color: var(--bc-color-text-muted);
      font-size: 14px;
    }

    #better-codex-archive-dialog .better-codex-archive-more {
      display: inline-flex;
      width: var(--bc-control-height);
      height: var(--bc-control-height);
      flex: 0 0 auto;
      align-items: center;
      justify-content: center;
      border: 0;
      border-radius: var(--bc-radius-sm);
      color: var(--bc-color-text-muted);
      background: transparent;
      padding: 0;
      font: inherit;
      line-height: 0;
      cursor: pointer;
    }

    #better-codex-archive-dialog .better-codex-archive-more svg {
      width: var(--bc-icon-md);
      height: var(--bc-icon-md);
    }

    #better-codex-archive-dialog .better-codex-archive-card {
      overflow: hidden;
      border: 1px solid var(--bc-color-hairline);
      border-radius: var(--bc-radius-lg);
      background: var(--bc-color-canvas);
      box-shadow: none;
    }

    #better-codex-archive-dialog .better-codex-archive-row {
      min-width: 0;
      display: grid;
      grid-template-columns: minmax(0, 1fr) 140px;
      gap: 18px;
      padding: 14px 20px;
    }

    #better-codex-archive-dialog .better-codex-archive-row + .better-codex-archive-row {
      border-top: 1px solid var(--bc-color-hairline);
    }

    #better-codex-archive-dialog .better-codex-archive-row-copy {
      display: flex;
      min-width: 0;
      flex: 1;
      flex-direction: column;
      gap: 5px;
    }

    #better-codex-archive-dialog .better-codex-archive-row-copy strong {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-size: 16px;
      font-weight: 500;
    }

    #better-codex-archive-dialog .better-codex-archive-row-copy span {
      color: var(--bc-color-text-muted);
      font-size: var(--bc-text-sm);
    }

    #better-codex-archive-dialog .better-codex-archive-row-actions {
      width: 140px;
      justify-content: flex-end;
      gap: var(--bc-space-2);
    }

    #better-codex-archive-dialog .better-codex-archive-trash,
    #better-codex-archive-dialog .better-codex-archive-restore {
      display: inline-flex;
      min-width: var(--bc-control-height);
      height: var(--bc-control-height);
      align-items: center;
      justify-content: center;
      border: 0;
      border-radius: var(--bc-radius-sm);
      color: var(--bc-color-text-muted);
      background: transparent;
      font: inherit;
      font-size: 16px;
      line-height: 1;
      cursor: pointer;
    }

    #better-codex-archive-dialog .better-codex-archive-trash svg {
      width: var(--bc-icon-md);
      height: var(--bc-icon-md);
      color: var(--bc-color-text-muted);
    }

    #better-codex-archive-dialog .better-codex-archive-restore {
      gap: 6px;
      padding-inline: var(--bc-control-padding);
      color: var(--bc-color-text);
      background: var(--bc-color-control);
      font-weight: 500;
    }

    #better-codex-archive-dialog .better-codex-archive-restore svg {
      width: var(--bc-icon-sm);
      height: var(--bc-icon-sm);
    }

    #better-codex-archive-dialog .better-codex-archive-empty {
      display: grid;
      min-height: 180px;
      place-items: center;
      color: var(--bc-color-text-muted);
      text-align: center;
    }

    @media (hover: hover) {
      #better-codex-archive-dialog .better-codex-archive-delete-all:hover { background: color-mix(in srgb, var(--bc-color-danger) 16%, var(--bc-color-canvas)); }
      #better-codex-archive-dialog .better-codex-archive-trash:hover { background: var(--bc-color-hover); }
      #better-codex-archive-dialog .better-codex-archive-more:hover { background: var(--bc-color-hover); }
      #better-codex-archive-dialog .better-codex-archive-restore:hover { background: var(--bc-color-hover); }
    }

    @media (max-width: 900px) {
      #better-codex-archive-dialog .better-codex-archive-shell { padding-inline: 64px; }
      #better-codex-archive-dialog .better-codex-archive-row { padding-inline: 20px; }
    }

    @media (max-width: 720px) {
      #better-codex-archive-dialog { width: calc(100vw - 24px); height: calc(100vh - 24px); max-height: calc(100vh - 24px); border-radius: var(--bc-radius-lg); }
      #better-codex-archive-dialog .better-codex-archive-shell { padding: 24px 24px 0; }
      #better-codex-archive-dialog .better-codex-archive-end-spacer { height: 24px; flex-basis: 24px; }
      #better-codex-archive-dialog header { margin-bottom: 24px; }
      #better-codex-archive-dialog header h1 { font-size: calc(var(--bc-text-xl) + 5px); }
      #better-codex-archive-dialog .better-codex-archive-toolbar { grid-template-columns: 1fr; align-items: stretch; margin: 0 0 30px; }
      #better-codex-archive-dialog .better-codex-archive-search,
      #better-codex-archive-dialog .better-codex-archive-project-filter { width: auto; }
      #better-codex-archive-dialog .better-codex-archive-row { grid-template-columns: 1fr; align-items: flex-start; gap: 12px; padding-inline: 16px; }
      #better-codex-archive-dialog .better-codex-archive-row-actions { width: 100%; justify-content: flex-end; }
    }

    #better-codex-panel .better-codex-toolbar {
      box-sizing: border-box;
      height: var(--bc-page-toolbar-height);
      min-height: var(--bc-page-toolbar-height);
      flex: 0 0 var(--bc-page-toolbar-height);
      gap: var(--bc-space-2);
      padding: 0 8px 0 var(--bc-space-4);
      background: var(--bc-color-canvas);
      -webkit-app-region: drag;
    }

    #better-codex-panel .better-codex-toolbar :is(button, input, a, select, textarea, label),
    #better-codex-panel .better-codex-agent-inspector-head :is(button, input, a, select, textarea, label) {
      -webkit-app-region: no-drag;
    }

    #better-codex-panel .better-codex-tabs,
    #better-codex-panel .better-codex-actions,
    #better-codex-panel .better-codex-agent-actions {
      gap: var(--bc-space-1);
    }

    #better-codex-panel .better-codex-tabs,
    #better-codex-panel .better-codex-agent-heading {
      margin: 0;
      padding: 0;
    }

    #better-codex-panel .better-codex-actions {
      gap: var(--bc-space-2);
    }

    #better-codex-panel .better-codex-button {
      min-height: 30px;
      border-radius: 8px;
      padding-inline: 10px;
      font-size: var(--bc-text-md);
    }

    #better-codex-panel .better-codex-working-dot {
      display: inline-block;
      width: 7px;
      height: 7px;
      flex: 0 0 7px;
      margin-right: 0;
      border-radius: 50%;
      background: #a1a1aa;
      box-shadow: none;
    }

    #better-codex-panel .better-codex-working-chip.has-work .better-codex-working-dot {
      border-color: currentColor;
      background: currentColor;
      box-shadow: 0 0 0 3px color-mix(in oklch, var(--bc-warning) 12%, transparent);
    }

    #better-codex-panel .better-codex-agent-actions[hidden] {
      display: none !important;
    }

    #better-codex-panel[data-surface="agents"] {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      grid-template-rows: var(--bc-page-toolbar-height) minmax(0, 1fr);
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
    #better-codex-dialog .better-codex-dialog-start-now,
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
      height: 30px;
      align-items: stretch;
      border-radius: 8px;
      color: var(--bc-color-on-primary);
      background: var(--bc-color-primary);
    }

    #better-codex-panel .better-codex-create-primary,
    #better-codex-panel .better-codex-create-toggle {
      display: inline-flex;
      min-height: 30px;
      align-items: center;
      justify-content: center;
      gap: 6px;
      border: 0;
      color: inherit;
      background: transparent;
      padding: 0 10px;
      font: inherit;
      font-size: var(--bc-text-md);
      cursor: pointer;
      transition: transform var(--bc-motion-fast) var(--bc-ease-out), background-color var(--bc-motion-fast) ease-out;
    }

    #better-codex-panel .better-codex-create-primary {
      border-radius: 8px 0 0 8px;
    }

    #better-codex-panel .better-codex-create-toggle {
      width: 26px;
      border-inline-start: 1px solid color-mix(in oklch, var(--bc-color-on-primary) 16%, transparent);
      border-radius: 0 8px 8px 0;
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
      width: 100%;
      height: 28px;
      border: 0;
      border-radius: 8px;
      color: var(--bc-color-text);
      background: transparent;
      padding: 0 8px 0 0;
      box-shadow: none;
      transition: background-color var(--bc-motion-fast) ease-out, box-shadow var(--bc-motion-fast) ease-out;
    }

    #better-codex-panel .better-codex-search:focus {
      border: 0;
      background: transparent;
      box-shadow: none;
    }

    #better-codex-panel .better-codex-search-wrap {
      display: flex;
      width: 124px;
      height: 30px;
      flex: 0 0 124px;
      align-items: center;
      gap: 7px;
      border-radius: 8px;
      background: var(--bc-color-control);
      box-shadow: inset 0 0 0 1px color-mix(in oklch, var(--bc-color-text) 8%, transparent);
      padding-inline: 9px;
      -webkit-app-region: no-drag;
    }

    #better-codex-panel .better-codex-search-wrap > svg {
      width: 14px;
      height: 14px;
      flex: 0 0 auto;
      color: var(--bc-color-text-muted);
    }

    #better-codex-panel .better-codex-working-chip.has-work {
      border: 0;
      color: color-mix(in oklch, var(--bc-warning) 72%, var(--bc-color-text));
      background: color-mix(in oklch, var(--bc-warning) 12%, var(--bc-color-control));
    }

    #better-codex-panel .better-codex-auto-dispatch-wrap {
      display: inline-flex;
      flex: 0 0 auto;
      align-items: center;
      gap: var(--bc-space-1);
    }

    #better-codex-panel #better-codex-auto-dispatch[hidden] {
      display: none;
    }

    #better-codex-panel .better-codex-auto-dispatch {
      min-width: 0;
      gap: 6px;
      padding-inline: var(--bc-control-padding);
      color: var(--bc-color-text-muted);
      line-height: normal;
    }

    #better-codex-panel .better-codex-auto-dispatch > svg {
      display: block;
      width: var(--bc-icon-md);
      height: var(--bc-icon-md);
      flex: 0 0 auto;
    }

    #better-codex-panel .better-codex-auto-dispatch > span {
      white-space: nowrap;
    }

    #better-codex-panel .better-codex-auto-dispatch.is-on {
      color: var(--bc-success);
      background: color-mix(in oklch, var(--bc-success) 12%, var(--bc-color-control));
    }

    @media (hover: hover) {
      #better-codex-panel .better-codex-auto-dispatch:hover {
        color: var(--bc-color-text);
        background: var(--bc-color-hover);
      }

      #better-codex-panel .better-codex-auto-dispatch.is-on:hover {
        color: var(--bc-success);
        background: color-mix(in oklch, var(--bc-success) 22%, var(--bc-color-control));
      }
    }

    #better-codex-panel .better-codex-auto-dispatch-help {
      display: inline-flex;
      width: 24px;
      height: 24px;
      flex: 0 0 24px;
      align-items: center;
      justify-content: center;
      border: 0;
      border-radius: 999px;
      color: var(--bc-color-text-faint);
      background: transparent;
      padding: 0;
      line-height: 0;
      cursor: pointer;
    }

    #better-codex-panel .better-codex-auto-dispatch-help:hover,
    #better-codex-panel .better-codex-auto-dispatch-help:focus-visible {
      color: var(--bc-color-text);
      background: var(--bc-color-hover);
      outline: 0;
    }

    #better-codex-panel .better-codex-auto-dispatch-help > svg {
      display: block;
      width: var(--bc-icon-sm);
      height: var(--bc-icon-sm);
    }

    #better-codex-auto-dispatch-help-dialog {
      position: fixed;
      inset: 0;
      z-index: 140;
      width: min(720px, calc(100vw - 32px));
      height: fit-content;
      max-height: calc(100vh - 32px);
      margin: auto;
      border: 0;
      border-radius: var(--bc-radius-lg);
      color: var(--bc-color-text);
      background: var(--bc-color-surface-raised);
      padding: 0;
      box-shadow: var(--bc-elevation-menu);
    }

    #better-codex-auto-dispatch-help-dialog::backdrop {
      background: var(--bc-color-scrim);
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-auto-dispatch-help-shell {
      display: flex;
      height: min(360px, calc(100vh - 32px));
      flex-direction: column;
      overflow: hidden;
      transition: height var(--bc-motion-normal) var(--bc-ease-out);
    }

    #better-codex-auto-dispatch-help-dialog header,
    #better-codex-auto-dispatch-help-dialog footer {
      display: flex;
      align-items: center;
    }

    #better-codex-auto-dispatch-help-dialog header {
      justify-content: space-between;
      gap: var(--bc-space-2);
      padding: 12px 14px;
      box-shadow: inset 0 -1px 0 var(--bc-color-hairline);
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-help-tabs {
      display: flex;
      min-width: 0;
      align-items: center;
      gap: 3px;
      overflow-x: auto;
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-help-tabs button {
      min-height: 34px;
      flex: 0 0 auto;
      border: 0;
      border-radius: 9px;
      color: var(--bc-color-text-muted);
      background: transparent;
      padding: 0 13px;
      font: inherit;
      font-size: var(--bc-text-lg);
      cursor: pointer;
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-help-tabs button:hover,
    #better-codex-auto-dispatch-help-dialog .better-codex-help-tabs button:focus-visible {
      color: var(--bc-color-text);
      background: var(--bc-color-hover);
      outline: 0;
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-help-tabs button.is-active {
      color: var(--bc-color-text);
      background: var(--bc-color-pressed);
      font-weight: 600;
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-help-mockup {
      position: relative;
      display: flex;
      margin-left: auto;
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-help-mockup > button {
      display: inline-flex;
      height: 30px;
      align-items: center;
      gap: 6px;
      border: 1px solid color-mix(in oklch, var(--bc-warning) 38%, var(--bc-color-hairline));
      border-radius: var(--bc-radius-sm);
      color: var(--bc-warning);
      background: color-mix(in oklch, var(--bc-warning) 7%, var(--bc-color-control));
      padding: 0 9px;
      font: inherit;
      font-size: var(--bc-text-sm);
      font-weight: 600;
      cursor: pointer;
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-help-mockup > button:hover {
      background: color-mix(in oklch, var(--bc-warning) 13%, var(--bc-color-control));
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-help-mockup > button svg {
      width: 14px;
      height: 14px;
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-help-mockup-menu {
      position: absolute;
      top: calc(100% + 6px);
      right: 0;
      z-index: 2;
      min-width: 148px;
      padding: 4px;
      border: 1px solid var(--bc-color-hairline);
      border-radius: var(--bc-radius-md);
      background: var(--bc-color-surface-raised);
      box-shadow: var(--bc-elevation-menu);
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-help-mockup-menu[hidden] {
      display: none;
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-help-mockup-menu button {
      display: block;
      width: 100%;
      min-height: 32px;
      border: 0;
      border-radius: var(--bc-radius-sm);
      color: var(--bc-color-text);
      background: transparent;
      padding: 0 9px;
      text-align: left;
      font: inherit;
      font-size: var(--bc-text-sm);
      cursor: pointer;
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-help-mockup-menu button:hover {
      background: var(--bc-color-hover);
    }

    #better-codex-auto-dispatch-help-dialog header > button {
      display: inline-flex;
      width: 32px;
      height: 32px;
      align-items: center;
      justify-content: center;
      border: 0;
      border-radius: var(--bc-radius-sm);
      color: var(--bc-color-text-muted);
      background: transparent;
      padding: 0;
      cursor: pointer;
    }

    #better-codex-auto-dispatch-help-dialog header > button > svg {
      display: block;
      width: 16px;
      height: 16px;
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-help-content {
      display: flex;
      min-height: 0;
      flex: 1;
      overflow: auto;
      padding: 30px 36px;
    }

    #better-codex-auto-dispatch-help-dialog:has(.better-codex-help-duration.is-open, .better-codex-help-model.is-open),
    #better-codex-auto-dispatch-help-dialog:has(.better-codex-help-duration.is-open, .better-codex-help-model.is-open) .better-codex-auto-dispatch-help-shell,
    #better-codex-auto-dispatch-help-dialog:has(.better-codex-help-duration.is-open, .better-codex-help-model.is-open) .better-codex-help-content {
      overflow: visible;
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-help-page {
      display: none;
      width: 100%;
      min-width: 0;
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-help-page.is-active {
      display: flex;
      flex-direction: column;
      justify-content: center;
      animation: better-codex-help-page-in var(--bc-motion-normal) var(--bc-ease-out);
    }

    #better-codex-auto-dispatch-help-dialog [data-help-page="mode"].is-active {
      display: flex;
      align-items: center;
    }

    #better-codex-auto-dispatch-help-dialog [data-help-page="settings"].is-active {
      justify-content: center;
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-auto-dispatch-help-shell[data-help-view="settings"] .better-codex-help-content {
      padding-block: 24px;
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-auto-dispatch-help-shell[data-help-view="remote"] {
      height: min(680px, calc(100vh - 32px));
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-auto-dispatch-help-shell[data-help-view="remote"] .better-codex-help-content {
      padding: 24px 30px 30px;
    }

    #better-codex-auto-dispatch-help-dialog [data-help-page="remote"].is-active {
      max-width: 640px;
      margin-inline: auto;
      justify-content: flex-start;
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-remote-heading,
    #better-codex-auto-dispatch-help-dialog .better-codex-remote-status-head,
    #better-codex-auto-dispatch-help-dialog .better-codex-remote-actions,
    #better-codex-auto-dispatch-help-dialog .better-codex-remote-url,
    #better-codex-auto-dispatch-help-dialog .better-codex-remote-command {
      display: flex;
      align-items: center;
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-remote-heading {
      justify-content: space-between;
      gap: 16px;
      margin-bottom: 18px;
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-remote-heading h2 {
      margin: 0;
      font-size: calc(var(--bc-text-xl) + 3px);
      font-weight: 720;
      letter-spacing: -.025em;
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-remote-heading p,
    #better-codex-auto-dispatch-help-dialog .better-codex-remote-step p {
      margin: 5px 0 0;
      color: var(--bc-color-text-muted);
      font-size: var(--bc-text-sm);
      line-height: 1.5;
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-remote-refresh,
    #better-codex-auto-dispatch-help-dialog .better-codex-remote-command button,
    #better-codex-auto-dispatch-help-dialog .better-codex-remote-url button,
    #better-codex-auto-dispatch-help-dialog .better-codex-remote-actions a,
    #better-codex-auto-dispatch-help-dialog .better-codex-remote-actions button {
      display: inline-flex;
      min-height: 34px;
      align-items: center;
      justify-content: center;
      gap: 7px;
      border: 0;
      border-radius: var(--bc-radius-sm);
      color: var(--bc-color-text);
      background: var(--bc-color-control);
      padding: 0 11px;
      font: inherit;
      font-size: var(--bc-text-sm);
      font-weight: 600;
      text-decoration: none;
      cursor: pointer;
      transition: background var(--bc-motion-fast) var(--bc-ease-out), transform var(--bc-motion-fast) var(--bc-ease-out);
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-remote-refresh svg,
    #better-codex-auto-dispatch-help-dialog .better-codex-remote-command button svg,
    #better-codex-auto-dispatch-help-dialog .better-codex-remote-url button svg,
    #better-codex-auto-dispatch-help-dialog .better-codex-remote-actions svg {
      width: 15px;
      height: 15px;
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-remote-refresh[data-loading="true"] svg {
      animation: better-codex-spin .85s linear infinite;
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-remote-provider {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 8px;
      margin-bottom: 12px;
      padding: 5px;
      border-radius: var(--bc-radius-lg);
      background: var(--bc-color-control);
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-remote-provider > button {
      display: flex;
      min-width: 0;
      align-items: center;
      gap: 11px;
      border: 0;
      border-radius: var(--bc-radius-md);
      color: var(--bc-color-text-muted);
      background: transparent;
      padding: 12px;
      text-align: left;
      font: inherit;
      cursor: pointer;
      transition: background var(--bc-motion-fast) var(--bc-ease-out), color var(--bc-motion-fast) var(--bc-ease-out);
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-remote-provider > button.is-active {
      color: var(--bc-color-text);
      background: var(--bc-color-canvas);
      box-shadow: var(--bc-elevation-card);
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-remote-provider-icon,
    #better-codex-auto-dispatch-help-dialog .better-codex-remote-status-icon {
      display: inline-flex;
      width: 34px;
      height: 34px;
      flex: 0 0 34px;
      align-items: center;
      justify-content: center;
      border-radius: var(--bc-radius-sm);
      color: var(--bc-color-text);
      background: var(--bc-color-pressed);
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-remote-provider-icon svg,
    #better-codex-auto-dispatch-help-dialog .better-codex-remote-status-icon svg {
      width: 17px;
      height: 17px;
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-remote-provider strong,
    #better-codex-auto-dispatch-help-dialog .better-codex-remote-provider small {
      display: block;
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-remote-provider strong {
      font-size: var(--bc-text-body);
      line-height: 1.3;
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-remote-provider small {
      overflow: hidden;
      margin-top: 3px;
      color: var(--bc-color-text-muted);
      font-size: var(--bc-text-caption);
      font-weight: 450;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-remote-setup {
      display: grid;
      gap: 8px;
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-remote-step {
      display: grid;
      grid-template-columns: 28px minmax(0, 1fr);
      gap: 10px;
      border-radius: var(--bc-radius-lg);
      background: var(--bc-color-surface);
      padding: 13px;
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-remote-step-number {
      display: inline-flex;
      width: 26px;
      height: 26px;
      align-items: center;
      justify-content: center;
      border-radius: var(--bc-radius-pill);
      color: var(--bc-color-on-primary);
      background: var(--bc-color-primary);
      font-size: var(--bc-text-caption);
      font-weight: 700;
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-remote-step h3 {
      margin: 2px 0 0;
      font-size: var(--bc-text-body);
      font-weight: 650;
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-remote-command,
    #better-codex-auto-dispatch-help-dialog .better-codex-remote-url {
      min-width: 0;
      gap: 7px;
      margin-top: 9px;
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-remote-command {
      border-radius: var(--bc-radius-md);
      background: var(--bc-color-control);
      padding: 5px;
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-remote-command > span {
      overflow: hidden;
      min-width: 0;
      flex: 1;
      padding-inline: 7px;
      color: var(--bc-color-text-muted);
      font-size: var(--bc-text-sm);
      font-weight: 560;
      line-height: 1.45;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-remote-command button,
    #better-codex-auto-dispatch-help-dialog .better-codex-remote-url button {
      flex: 0 0 auto;
      color: var(--bc-color-on-primary);
      background: var(--bc-color-primary);
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-remote-url input {
      min-width: 0;
      min-height: 36px;
      flex: 1;
      border: 0;
      border-radius: var(--bc-radius-sm);
      outline: 0;
      color: var(--bc-color-text);
      background: var(--bc-color-control);
      padding: 0 11px;
      font: inherit;
      font-size: var(--bc-text-sm);
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-remote-url input:focus {
      box-shadow: var(--bc-focus-ring);
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-remote-status {
      margin-top: 12px;
      border-radius: var(--bc-radius-lg);
      background: var(--bc-color-control);
      padding: 14px;
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-remote-status-head {
      gap: 10px;
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-remote-status-head > div {
      min-width: 0;
      flex: 1;
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-remote-status-head strong,
    #better-codex-auto-dispatch-help-dialog .better-codex-remote-status-head small {
      display: block;
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-remote-status-head strong {
      font-size: var(--bc-text-body);
      font-weight: 650;
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-remote-status-head small {
      overflow: hidden;
      margin-top: 3px;
      color: var(--bc-color-text-muted);
      font-size: var(--bc-text-caption);
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-remote-status-badge {
      flex: 0 0 auto;
      border-radius: var(--bc-radius-pill);
      color: var(--bc-color-text-muted);
      background: var(--bc-color-pressed);
      padding: 5px 9px;
      font-size: var(--bc-text-caption);
      font-weight: 650;
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-remote-status[data-remote-status="online"] .better-codex-remote-status-icon,
    #better-codex-auto-dispatch-help-dialog .better-codex-remote-status[data-remote-status="online"] .better-codex-remote-status-badge {
      color: var(--bc-success);
      background: color-mix(in oklch, var(--bc-success) 13%, var(--bc-color-control));
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-remote-status[data-remote-status="offline"] .better-codex-remote-status-icon,
    #better-codex-auto-dispatch-help-dialog .better-codex-remote-status[data-remote-status="offline"] .better-codex-remote-status-badge {
      color: var(--bc-color-danger);
      background: var(--bc-color-danger-soft);
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-remote-status-empty {
      margin: 13px 0 1px;
      color: var(--bc-color-text-muted);
      font-size: var(--bc-text-sm);
      line-height: 1.5;
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-remote-status dl {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 6px;
      margin: 12px 0 0;
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-remote-status dl[hidden],
    #better-codex-auto-dispatch-help-dialog .better-codex-remote-actions[hidden],
    #better-codex-auto-dispatch-help-dialog .better-codex-remote-status-empty[hidden] {
      display: none;
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-remote-status dl > div {
      min-width: 0;
      border-radius: var(--bc-radius-sm);
      background: var(--bc-color-surface-raised);
      padding: 9px 10px;
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-remote-status dt {
      color: var(--bc-color-text-muted);
      font-size: var(--bc-text-caption);
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-remote-status dd {
      overflow: hidden;
      margin: 4px 0 0;
      color: var(--bc-color-text);
      font-size: var(--bc-text-sm);
      font-weight: 600;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-remote-actions {
      gap: 7px;
      margin-top: 9px;
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-remote-actions a {
      color: var(--bc-color-on-primary);
      background: var(--bc-color-primary);
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-remote-refresh:disabled,
    #better-codex-auto-dispatch-help-dialog .better-codex-remote-url button:disabled,
    #better-codex-auto-dispatch-help-dialog .better-codex-remote-actions button:disabled {
      color: var(--bc-color-text-faint);
      background: var(--bc-color-pressed);
      cursor: default;
    }

    @media (hover: hover) {
      #better-codex-auto-dispatch-help-dialog .better-codex-remote-refresh:hover:not(:disabled),
      #better-codex-auto-dispatch-help-dialog .better-codex-remote-command button:hover:not(:disabled),
      #better-codex-auto-dispatch-help-dialog .better-codex-remote-url button:hover:not(:disabled),
      #better-codex-auto-dispatch-help-dialog .better-codex-remote-actions a:hover,
      #better-codex-auto-dispatch-help-dialog .better-codex-remote-actions button:hover:not(:disabled),
      #better-codex-auto-dispatch-help-dialog .better-codex-remote-provider > button:hover:not(.is-active) {
        background: var(--bc-color-hover);
      }
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-remote-refresh:focus-visible,
    #better-codex-auto-dispatch-help-dialog .better-codex-remote-command button:focus-visible,
    #better-codex-auto-dispatch-help-dialog .better-codex-remote-url button:focus-visible,
    #better-codex-auto-dispatch-help-dialog .better-codex-remote-actions a:focus-visible,
    #better-codex-auto-dispatch-help-dialog .better-codex-remote-actions button:focus-visible,
    #better-codex-auto-dispatch-help-dialog .better-codex-remote-provider > button:focus-visible {
      outline: 0;
      box-shadow: var(--bc-focus-ring);
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-remote-command button:active:not(:disabled),
    #better-codex-auto-dispatch-help-dialog .better-codex-remote-url button:active:not(:disabled),
    #better-codex-auto-dispatch-help-dialog .better-codex-remote-actions a:active,
    #better-codex-auto-dispatch-help-dialog .better-codex-remote-actions button:active:not(:disabled) {
      transform: scale(.97);
    }

    #better-codex-auto-dispatch-help-dialog [data-help-page="settings"] .better-codex-help-setting-group {
      margin-top: 10px;
    }

    #better-codex-auto-dispatch-help-dialog [data-help-page="settings"] .better-codex-help-setting-group:first-child {
      margin-top: 0;
    }

    #better-codex-auto-dispatch-help-dialog [data-help-page="shortcuts"] .better-codex-help-page-heading {
      margin-bottom: 22px;
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-help-shortcut-controls {
      display: flex;
      width: 240px;
      flex: 0 0 240px;
      align-items: center;
      justify-content: flex-end;
      gap: 8px;
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-help-shortcut-key {
      min-width: 112px;
      min-height: 32px;
      border: 1px solid var(--bc-color-hairline);
      border-radius: 8px;
      color: var(--bc-color-text);
      background: var(--bc-color-control);
      padding: 0 10px;
      font: inherit;
      font-size: var(--bc-text-sm);
      font-weight: 600;
      cursor: pointer;
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-help-shortcut-key:hover,
    #better-codex-auto-dispatch-help-dialog .better-codex-help-shortcut-key[data-setting-shortcut-recording="true"] {
      border-color: var(--bc-color-primary);
      background: var(--bc-color-hover);
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-help-shortcut-key:focus-visible,
    #better-codex-auto-dispatch-help-dialog .better-codex-help-shortcut-clear:focus-visible {
      outline: 0;
      box-shadow: var(--bc-focus-ring);
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-help-shortcut-clear {
      min-height: 30px;
      border: 0;
      border-radius: 8px;
      color: var(--bc-color-text-muted);
      background: transparent;
      padding: 0 5px;
      font: inherit;
      font-size: var(--bc-text-sm);
      cursor: pointer;
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-help-shortcut-clear:hover:not(:disabled) {
      color: var(--bc-color-text);
      background: var(--bc-color-hover);
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-help-shortcut-clear:disabled {
      color: var(--bc-color-text-faint);
      cursor: default;
    }

    @keyframes better-codex-help-page-in {
      from { opacity: 0; transform: translateY(3px); }
      to { opacity: 1; transform: translateY(0); }
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-auto-dispatch-help-panels {
      display: grid;
      width: 100%;
      max-width: 620px;
      min-height: 230px;
      grid-template-columns: minmax(0, 1fr) 1px minmax(0, 1fr);
      gap: 20px;
      align-items: stretch;
      margin: 0 auto;
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-auto-dispatch-help-divider {
      width: 1px;
      align-self: stretch;
      background: color-mix(in srgb, var(--bc-color-text) 14%, var(--bc-color-hairline));
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-auto-dispatch-help-panel {
      display: flex;
      min-width: 0;
      flex-direction: column;
      align-items: flex-start;
      gap: 16px;
      text-align: left;
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-auto-dispatch-help-heading {
      display: flex;
      width: 100%;
      flex-direction: column;
      align-items: center;
      gap: 9px;
      text-align: center;
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-auto-dispatch-help-heading > svg {
      display: block;
      width: calc(var(--bc-icon-md) + 4px);
      height: calc(var(--bc-icon-md) + 4px);
      flex: 0 0 auto;
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-auto-dispatch-help-panel.is-manual .better-codex-auto-dispatch-help-heading {
      color: var(--bc-color-text-muted);
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-auto-dispatch-help-panel.is-auto .better-codex-auto-dispatch-help-heading {
      color: var(--bc-success);
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-auto-dispatch-help-heading h3 {
      margin: 0;
      font-size: calc(var(--bc-text-xl) + 2px);
      font-weight: 680;
      letter-spacing: -.01em;
      line-height: 1.35;
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-help-mode-markdown {
      min-width: 0;
      color: var(--bc-color-text-muted);
      font-size: var(--bc-text-lg);
      line-height: 1.75;
      text-wrap: pretty;
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-help-mode-markdown p {
      margin: 0;
      text-align: left;
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-auto-dispatch-help-panel p {
      text-align: left;
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-help-mode-markdown p + p {
      margin-top: 12px;
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-help-mode-markdown strong {
      color: var(--bc-color-text);
      font-weight: 680;
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-help-inline-control,
    #better-codex-auto-dispatch-help-dialog .better-codex-help-inline-state {
      display: inline-flex;
      width: max-content;
      height: 28px;
      align-items: center;
      justify-content: center;
      box-sizing: border-box;
      margin-inline: 2px;
      font-size: inherit;
      vertical-align: baseline;
      white-space: nowrap;
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-help-inline-control {
      border-radius: var(--bc-radius-sm);
      padding: 0 10px;
      font-weight: 560;
      line-height: 1;
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-help-inline-control.is-start {
      border: 1px solid var(--bc-color-hairline);
      color: var(--bc-color-text);
      background: var(--bc-color-control);
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-help-inline-control.is-send {
      min-width: 56px;
      border: 0;
      color: var(--bc-color-on-primary);
      background: var(--bc-color-primary);
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-help-inline-state {
      gap: 6px;
      border: 1px solid var(--bc-color-hairline);
      border-radius: var(--bc-radius-sm);
      color: var(--bc-color-text);
      background: var(--bc-color-control);
      padding: 0 8px;
      font-weight: 580;
      line-height: 1;
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-help-inline-state.is-backlog {
      background: color-mix(in oklch, var(--bc-color-control) 86%, var(--bc-color-text));
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-help-inline-state svg {
      width: 15px;
      height: 15px;
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-help-page-heading,
    #better-codex-auto-dispatch-help-dialog .better-codex-help-setting-group,
    #better-codex-auto-dispatch-help-dialog .better-codex-help-about,
    #better-codex-auto-dispatch-help-dialog .better-codex-help-about-details,
    #better-codex-auto-dispatch-help-dialog .better-codex-help-error {
      width: 100%;
      max-width: 540px;
      margin-inline: auto;
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-help-page-heading {
      margin-bottom: 22px;
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-help-page-heading h2,
    #better-codex-auto-dispatch-help-dialog .better-codex-help-about h2 {
      margin: 0;
      font-size: calc(var(--bc-text-xl) + 4px);
      font-weight: 720;
      letter-spacing: -.025em;
      line-height: 1.2;
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-help-page-heading p,
    #better-codex-auto-dispatch-help-dialog .better-codex-help-about p {
      margin: 7px 0 0;
      color: var(--bc-color-text-muted);
      font-size: var(--bc-text-body);
      line-height: 1.55;
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-help-about-slogan {
      font-weight: 500;
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-help-setting-group {
      margin-top: 18px;
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-help-setting-group h3 {
      margin: 0 0 6px;
      color: var(--bc-color-text-faint);
      font-size: var(--bc-text-body);
      font-weight: 650;
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-help-setting-row {
      display: flex;
      min-height: 50px;
      align-items: center;
      justify-content: space-between;
      gap: 18px;
      box-shadow: inset 0 -1px 0 var(--bc-color-hairline);
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-help-setting-row > span:first-child {
      display: flex;
      min-width: 0;
      flex-direction: column;
      gap: 3px;
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-help-setting-row strong {
      font-size: var(--bc-text-lg);
      font-weight: 600;
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-help-setting-row small {
      color: var(--bc-color-text-muted);
      font-size: var(--bc-text-body);
      line-height: 1.4;
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-help-setting-controls {
      display: flex;
      width: 240px;
      flex: 0 0 240px;
      align-items: center;
      justify-content: flex-end;
      gap: 12px;
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-help-scheduler-controls {
      width: 300px;
      flex-basis: 300px;
      gap: 8px;
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-help-scheduler-controls [data-setting-scheduler-model-picker] {
      min-width: 0;
      flex: 1 1 auto;
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-help-scheduler-controls [data-setting-scheduler-reasoning-picker] {
      width: 76px;
      flex: 0 0 76px;
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-help-scheduler-controls [data-setting-scheduler-reasoning-picker] .better-codex-help-model-menu {
      width: 180px;
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-help-duration {
      position: relative;
      flex: 0 0 auto;
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-help-duration-toggle {
      display: inline-flex;
      min-width: 92px;
      min-height: 30px;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      border: 1px solid var(--bc-color-hairline);
      border-radius: 8px;
      color: var(--bc-color-text);
      background: var(--bc-color-control);
      padding: 0 9px 0 10px;
      font: inherit;
      font-size: var(--bc-text-body);
      cursor: pointer;
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-help-duration-toggle:hover,
    #better-codex-auto-dispatch-help-dialog .better-codex-help-duration.is-open .better-codex-help-duration-toggle {
      background: var(--bc-color-hover);
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-help-duration-toggle > svg {
      width: 14px;
      height: 14px;
      transition: transform var(--bc-motion-fast) var(--bc-ease-out);
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-help-duration.is-open .better-codex-help-duration-toggle > svg {
      transform: rotate(180deg);
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-help-duration-toggle:disabled {
      color: var(--bc-color-text-faint);
      background: color-mix(in oklch, var(--bc-color-control) 55%, transparent);
      cursor: not-allowed;
      opacity: .55;
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-help-duration-toggle:focus-visible {
      outline: 0;
      box-shadow: var(--bc-focus-ring);
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-help-duration-menu {
      position: absolute;
      top: calc(100% + 6px);
      right: 0;
      z-index: 3;
      min-width: 148px;
      padding: 4px;
      border: 1px solid var(--bc-color-hairline);
      border-radius: var(--bc-radius-md);
      background: var(--bc-color-surface-raised);
      box-shadow: var(--bc-elevation-menu);
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-help-duration-menu[hidden] {
      display: none;
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-help-duration-menu button {
      display: flex;
      width: 100%;
      min-height: 32px;
      align-items: center;
      justify-content: space-between;
      border: 0;
      border-radius: var(--bc-radius-sm);
      color: var(--bc-color-text);
      background: transparent;
      padding: 0 9px;
      text-align: left;
      font: inherit;
      font-size: var(--bc-text-body);
      cursor: pointer;
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-help-duration-menu button:hover,
    #better-codex-auto-dispatch-help-dialog .better-codex-help-duration-menu button:focus-visible {
      background: var(--bc-color-hover);
      outline: 0;
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-help-duration-menu button.is-selected {
      background: var(--bc-color-hover);
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-help-duration-menu button svg {
      width: 14px;
      height: 14px;
      color: var(--bc-color-text-muted);
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-help-model {
      position: relative;
      width: 240px;
      flex: 0 0 240px;
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-help-model-toggle {
      display: flex;
      width: 100%;
      min-height: 34px;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      border: 0;
      border-radius: 10px;
      color: var(--bc-color-text);
      background: var(--bc-color-control);
      padding: 0 10px 0 12px;
      font: inherit;
      font-size: var(--bc-text-body);
      cursor: pointer;
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-help-model-toggle:hover,
    #better-codex-auto-dispatch-help-dialog .better-codex-help-model.is-open .better-codex-help-model-toggle {
      background: var(--bc-color-hover);
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-help-model-toggle:focus-visible {
      outline: 0;
      box-shadow: var(--bc-focus-ring);
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-help-model-toggle > svg {
      width: 14px;
      height: 14px;
      color: var(--bc-color-text-muted);
      transition: transform var(--bc-motion-fast) var(--bc-ease-out);
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-help-model-toggle > span,
    #better-codex-auto-dispatch-help-dialog .better-codex-help-model-menu button > span:first-child {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-help-model.is-open .better-codex-help-model-toggle > svg {
      transform: rotate(180deg);
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-help-model-menu {
      position: absolute;
      top: calc(100% + 7px);
      right: 0;
      z-index: 4;
      width: 360px;
      max-width: calc(100vw - 64px);
      padding: 7px;
      border: 1px solid var(--bc-color-hairline);
      border-radius: var(--bc-radius-lg);
      background: var(--bc-color-surface-raised);
      box-shadow: var(--bc-elevation-menu);
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-help-scheduler-controls [data-setting-scheduler-model-picker] .better-codex-help-model-menu {
      width: max-content;
      min-width: 180px;
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-help-model-menu[hidden] {
      display: none;
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-help-model-title {
      display: block;
      padding: 6px 10px 5px;
      color: var(--bc-color-text-faint);
      font-size: var(--bc-text-sm);
      font-weight: 620;
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-help-model-menu button {
      display: flex;
      width: 100%;
      min-height: 38px;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      border: 0;
      border-radius: var(--bc-radius-sm);
      color: var(--bc-color-text);
      background: transparent;
      padding: 0 10px;
      text-align: left;
      font: inherit;
      font-size: var(--bc-text-body);
      cursor: pointer;
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-help-model-menu button:hover,
    #better-codex-auto-dispatch-help-dialog .better-codex-help-model-menu button:focus-visible {
      background: var(--bc-color-hover);
      outline: 0;
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-help-model-check {
      display: flex;
      width: 16px;
      height: 16px;
      flex: 0 0 16px;
      align-items: center;
      justify-content: center;
      color: var(--bc-color-text-muted);
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-help-model-check svg {
      width: 15px;
      height: 15px;
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-language-switch {
      position: relative;
      display: grid;
      width: 240px;
      flex: 0 0 240px;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      border-radius: 10px;
      background: var(--bc-color-control);
      padding: 3px;
      isolation: isolate;
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-language-switch::before {
      position: absolute;
      z-index: -1;
      top: 3px;
      left: 3px;
      width: calc((100% - 6px) / 3);
      height: calc(100% - 6px);
      border-radius: 8px;
      background: var(--bc-color-canvas);
      box-shadow: 0 1px 3px rgb(0 0 0 / .12);
      content: "";
      transition: transform var(--bc-motion-normal) var(--bc-ease-out);
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-language-switch[data-language-value="zh-CN"]::before {
      transform: translateX(100%);
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-language-switch[data-language-value="en"]::before {
      transform: translateX(200%);
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-language-switch button {
      min-width: 0;
      min-height: 30px;
      border: 0;
      border-radius: 8px;
      color: var(--bc-color-text-muted);
      background: transparent;
      padding: 0 8px;
      font: inherit;
      font-size: var(--bc-text-body);
      cursor: pointer;
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-language-switch button[aria-checked="true"] {
      color: var(--bc-color-text);
      font-weight: 600;
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-language-switch button:focus-visible {
      outline: 0;
      box-shadow: var(--bc-focus-ring);
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-help-setting-row input {
      position: relative;
      width: 34px;
      height: 20px;
      flex: 0 0 34px;
      appearance: none;
      border: 0;
      border-radius: 999px;
      background: var(--bc-color-pressed);
      cursor: pointer;
      transition: background var(--bc-motion-fast) var(--bc-ease-out);
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-help-setting-row input::after {
      position: absolute;
      top: 3px;
      left: 3px;
      width: 14px;
      height: 14px;
      border-radius: 999px;
      background: var(--bc-color-canvas);
      box-shadow: 0 1px 3px rgb(0 0 0 / .22);
      content: "";
      transition: transform var(--bc-motion-fast) var(--bc-ease-out);
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-help-setting-row input:checked {
      background: var(--bc-color-primary);
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-help-setting-row input:checked::after {
      transform: translateX(14px);
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-help-setting-row input:focus-visible {
      outline: 0;
      box-shadow: var(--bc-focus-ring);
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-help-check-update {
      min-height: 30px;
      border: 0;
      border-radius: 8px;
      color: var(--bc-color-text);
      background: var(--bc-color-control);
      padding: 0 11px;
      font: inherit;
      font-size: var(--bc-text-caption);
      font-weight: 600;
      cursor: pointer;
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-help-check-update:hover,
    #better-codex-auto-dispatch-help-dialog .better-codex-help-check-update:focus-visible {
      background: var(--bc-color-hover);
      outline: 0;
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-help-check-update:disabled {
      color: var(--bc-color-text-faint);
      cursor: default;
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-help-error {
      margin-top: 12px;
      color: var(--bc-color-danger);
      font-size: var(--bc-text-caption);
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-help-about {
      position: relative;
      display: flex;
      align-items: center;
      gap: 16px;
      margin-top: 18px;
      margin-bottom: 32px;
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-help-about-logo,
    #better-codex-auto-dispatch-help-dialog .better-codex-help-about-logo svg,
    #better-codex-auto-dispatch-help-dialog .better-codex-help-about-logo img {
      display: block;
      width: 50px;
      height: 50px;
      flex: 0 0 50px;
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-help-about-details {
      margin-block: 0;
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-help-about-details > div {
      display: flex;
      min-height: 54px;
      align-items: center;
      justify-content: space-between;
      gap: 18px;
      box-shadow: inset 0 -1px 0 var(--bc-color-hairline);
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-help-about-details dt {
      color: var(--bc-color-text-muted);
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-help-about-details dd {
      display: flex;
      align-items: center;
      gap: 14px;
      margin: 0;
      font-variant-numeric: tabular-nums;
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-help-runtime-status {
      position: absolute;
      top: 6px;
      right: 0;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      font-weight: 600;
      white-space: nowrap;
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-help-status-dot {
      width: 7px;
      height: 7px;
      border-radius: 999px;
      background: var(--bc-success);
      box-shadow: 0 0 0 3px color-mix(in oklch, var(--bc-success) 14%, transparent);
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-help-github-row {
      display: flex;
      align-items: center;
      flex-direction: column;
      justify-content: center;
      gap: 8px;
      margin: 34px auto 0;
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-help-github {
      display: flex;
      width: fit-content;
      min-height: 34px;
      align-items: center;
      gap: 7px;
      border: 0;
      border-radius: 9px;
      color: var(--bc-color-text-muted);
      background: var(--bc-color-control);
      padding: 0 12px;
      font-size: var(--bc-text-caption);
      text-decoration: none;
      transition: color var(--bc-motion-fast) var(--bc-ease-out), background var(--bc-motion-fast) var(--bc-ease-out);
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-help-github-stars {
      display: inline-flex;
      align-items: center;
      margin-left: 2px;
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-help-github-name {
      font-weight: 600;
      transform: translateY(1px);
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-help-star {
      color: #f5c542;
      fill: currentColor;
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-help-github-row p {
      margin: 0;
      color: var(--bc-color-text-muted);
      font-size: var(--bc-text-caption);
      line-height: 1.4;
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-help-github:hover {
      color: var(--bc-color-text);
      background: var(--bc-color-hover);
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-help-github:active {
      color: var(--bc-color-text);
      background: var(--bc-color-pressed);
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-help-github:focus-visible {
      outline: 0;
      box-shadow: var(--bc-focus-ring);
    }

    @media (max-width: 600px) {
      #better-codex-auto-dispatch-help-dialog .better-codex-help-mockup > button span {
        display: none;
      }

      #better-codex-auto-dispatch-help-dialog .better-codex-help-mockup > button {
        padding: 0 8px;
      }

      #better-codex-auto-dispatch-help-dialog .better-codex-auto-dispatch-help-shell {
        height: min(540px, calc(100vh - 32px));
      }

      #better-codex-auto-dispatch-help-dialog .better-codex-help-tabs button {
        padding-inline: 10px;
      }

      #better-codex-auto-dispatch-help-dialog .better-codex-help-content {
        padding: 24px 22px;
      }

      #better-codex-auto-dispatch-help-dialog .better-codex-auto-dispatch-help-shell[data-help-view="remote"] .better-codex-help-content {
        padding: 20px 16px 24px;
      }

      #better-codex-auto-dispatch-help-dialog .better-codex-remote-heading {
        align-items: flex-start;
      }

      #better-codex-auto-dispatch-help-dialog .better-codex-remote-refresh span {
        display: none;
      }

      #better-codex-auto-dispatch-help-dialog .better-codex-remote-provider {
        grid-template-columns: minmax(0, 1fr);
      }

      #better-codex-auto-dispatch-help-dialog .better-codex-remote-provider small {
        white-space: normal;
      }

      #better-codex-auto-dispatch-help-dialog .better-codex-remote-url {
        align-items: stretch;
        flex-direction: column;
      }

      #better-codex-auto-dispatch-help-dialog .better-codex-remote-url button {
        width: 100%;
      }

      #better-codex-auto-dispatch-help-dialog .better-codex-remote-status dl {
        grid-template-columns: minmax(0, 1fr);
      }

      #better-codex-auto-dispatch-help-dialog .better-codex-remote-actions {
        align-items: stretch;
        flex-direction: column;
      }

      #better-codex-auto-dispatch-help-dialog .better-codex-help-page.is-active {
        justify-content: flex-start;
      }

      #better-codex-auto-dispatch-help-dialog .better-codex-help-github-row {
        flex-wrap: wrap;
      }

      #better-codex-auto-dispatch-help-dialog .better-codex-help-setting-row.is-language,
      #better-codex-auto-dispatch-help-dialog .better-codex-help-setting-row.is-notification,
      #better-codex-auto-dispatch-help-dialog .better-codex-help-setting-row.is-model,
      #better-codex-auto-dispatch-help-dialog .better-codex-help-setting-row.is-shortcut {
        align-items: stretch;
        flex-direction: column;
        padding-block: 10px;
      }

      #better-codex-auto-dispatch-help-dialog .better-codex-language-switch {
        width: 100%;
        flex-basis: auto;
      }

      #better-codex-auto-dispatch-help-dialog .better-codex-help-setting-controls,
      #better-codex-auto-dispatch-help-dialog .better-codex-help-model {
        width: 100%;
        flex-basis: auto;
      }

      #better-codex-auto-dispatch-help-dialog .better-codex-help-scheduler-controls {
        gap: 8px;
      }

      #better-codex-auto-dispatch-help-dialog .better-codex-help-shortcut-controls {
        width: 100%;
        flex-basis: auto;
        justify-content: flex-start;
      }

      #better-codex-auto-dispatch-help-dialog .better-codex-help-scheduler-controls [data-setting-scheduler-model-picker] {
        min-width: 0;
        flex: 1 1 auto;
      }

      #better-codex-auto-dispatch-help-dialog .better-codex-help-scheduler-controls [data-setting-scheduler-reasoning-picker] {
        width: 76px;
        flex: 0 0 76px;
      }

      #better-codex-auto-dispatch-help-dialog .better-codex-help-model-menu {
        width: 100%;
        max-width: none;
      }

      #better-codex-auto-dispatch-help-dialog .better-codex-help-scheduler-controls [data-setting-scheduler-model-picker] .better-codex-help-model-menu {
        width: 100%;
        max-width: none;
      }

      #better-codex-auto-dispatch-help-dialog .better-codex-auto-dispatch-help-panels {
        grid-template-columns: minmax(0, 1fr);
        gap: 20px;
      }

      #better-codex-auto-dispatch-help-dialog .better-codex-auto-dispatch-help-divider {
        width: 100%;
        height: 1px;
      }
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
      position: absolute;
      top: -5px;
      left: 100%;
      display: none;
      width: max-content;
      min-width: 148px;
      max-width: min(240px, calc(100vw - 24px));
      max-height: min(320px, calc(100vh - 24px));
      overflow-y: auto;
    }

    #better-codex-context-menu .better-codex-context-submenu.is-assignee {
      min-width: 214px;
    }

    #better-codex-context-menu[data-align="left"] .better-codex-context-submenu {
      right: 100%;
      left: auto;
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

    #better-codex-context-menu .better-codex-context-item-wrap.is-disabled > .better-codex-context-submenu {
      display: none !important;
    }

    #better-codex-context-menu .better-codex-context-item:disabled {
      color: var(--bc-color-text-faint);
      cursor: not-allowed;
      opacity: .65;
    }

    #better-codex-context-menu .better-codex-context-item-wrap.is-disabled:hover > .better-codex-context-item {
      background: transparent;
    }

    #better-codex-context-menu .better-codex-context-assignee-label {
      display: inline-flex;
      min-width: 0;
      flex: 1;
      align-items: center;
      gap: 5px;
      overflow: hidden;
    }

    #better-codex-context-menu .better-codex-context-assignee-name {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    #better-codex-context-menu .better-codex-context-tag {
      flex: 0 0 auto;
      border-radius: 999px;
      padding: 1px 5px;
      font-size: var(--bc-text-xs);
      font-weight: 650;
      line-height: 1.25;
    }

    #better-codex-context-menu .better-codex-context-tag[data-tone="model"] {
      color: var(--bc-info);
      background: color-mix(in srgb, var(--bc-info) 13%, var(--bc-color-control));
    }

    #better-codex-context-menu .better-codex-context-tag[data-tone="reasoning"] {
      color: var(--bc-success);
      background: color-mix(in srgb, var(--bc-success) 13%, var(--bc-color-control));
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

    #better-codex-context-menu .better-codex-context-avatar {
      display: inline-flex;
      width: 16px;
      height: 16px;
      flex: 0 0 16px;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      border-radius: 999px;
      color: var(--bc-primary-foreground);
      background: var(--bc-primary);
      line-height: 0;
    }

    #better-codex-context-menu .better-codex-context-avatar.is-codex {
      color: inherit;
      background: transparent;
      border-radius: 4px;
    }

    #better-codex-context-menu .better-codex-context-avatar.is-fallback,
    #better-codex-context-menu .better-codex-context-avatar.is-icon {
      color: var(--bc-color-text-muted);
      background: var(--bc-color-control);
    }

    #better-codex-context-menu .better-codex-context-avatar img,
    #better-codex-context-menu .better-codex-context-avatar svg {
      display: block;
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    #better-codex-context-menu .better-codex-context-avatar.is-fallback svg,
    #better-codex-context-menu .better-codex-context-avatar.is-icon svg {
      width: 10px;
      height: 10px;
      margin: auto;
    }

    #better-codex-context-menu .better-codex-context-avatar.is-user.is-initials {
      color: #fff;
      font-size: 9px;
      font-weight: 700;
      line-height: 1;
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

    #better-codex-panel .better-codex-filter-avatar {
      display: inline-flex;
      width: var(--bc-icon-sm);
      height: var(--bc-icon-sm);
      flex: 0 0 var(--bc-icon-sm);
      align-items: center;
      justify-content: center;
      overflow: hidden;
      border-radius: var(--bc-radius-pill);
      color: var(--bc-color-on-primary);
      background: var(--bc-color-primary);
      line-height: 0;
    }

    #better-codex-panel .better-codex-filter-avatar.is-codex {
      color: inherit;
      background: transparent;
      border-radius: var(--bc-radius-xs);
    }

    #better-codex-panel .better-codex-filter-avatar.is-fallback,
    #better-codex-panel .better-codex-filter-avatar.is-icon {
      color: var(--bc-color-text-muted);
      background: var(--bc-color-control);
    }

    #better-codex-panel .better-codex-filter-avatar img,
    #better-codex-panel .better-codex-filter-avatar svg {
      display: block;
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    #better-codex-panel .better-codex-filter-avatar.is-fallback svg,
    #better-codex-panel .better-codex-filter-avatar.is-icon svg {
      width: 10px;
      height: 10px;
      margin: auto;
    }

    #better-codex-panel .better-codex-filter-avatar.is-user.is-initials {
      color: #fff;
      font-size: var(--bc-text-avatar);
      font-weight: 700;
      line-height: 1;
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

    #better-codex-panel .better-codex-board-empty {
      display: flex;
      min-width: 100%;
      flex: 1;
      align-items: center;
      justify-content: center;
      flex-direction: column;
      padding: calc(var(--bc-space-5) * 2);
      text-align: center;
    }

    #better-codex-panel .better-codex-board-empty h2,
    #better-codex-dialog .better-codex-conversation-empty h3 {
      margin: 0;
      color: var(--bc-foreground);
      font-size: var(--bc-text-lg);
      font-weight: 650;
    }

    #better-codex-panel .better-codex-board-empty p,
    #better-codex-dialog .better-codex-conversation-empty p {
      margin: var(--bc-space-2) 0 0;
      color: var(--bc-muted);
      font-size: var(--bc-text-md);
    }

    #better-codex-panel .better-codex-board-empty > div {
      display: flex;
      gap: var(--bc-space-2);
    }

    #better-codex-panel .better-codex-board-empty button {
      display: inline-flex;
      height: var(--bc-control-height);
      align-items: center;
      gap: var(--bc-space-2);
      margin-top: var(--bc-space-4);
      border: 0;
      border-radius: var(--bc-radius-sm);
      color: var(--bc-primary-foreground);
      background: var(--bc-primary);
      padding: 0 var(--bc-space-3);
      font: inherit;
      font-weight: 600;
      cursor: pointer;
    }

    #better-codex-panel .better-codex-board-empty button:hover {
      background: color-mix(in oklch, var(--bc-primary) 88%, white);
    }

    #better-codex-panel .better-codex-board-empty [data-archive-open] {
      border: 1px solid var(--bc-border);
      color: var(--bc-foreground);
      background: var(--bc-raised);
    }

    #better-codex-panel .better-codex-board-empty [data-archive-open]:hover {
      background: var(--bc-hover);
    }

    #better-codex-panel .better-codex-board-empty button svg {
      width: var(--bc-icon-sm);
      height: var(--bc-icon-sm);
    }

    #better-codex-panel[data-recovery="true"] .better-codex-toolbar,
    #better-codex-panel[data-recovery="true"] .better-codex-board,
    #better-codex-panel[data-recovery="true"] .better-codex-agents {
      display: none;
    }

    #better-codex-panel .better-codex-recovery {
      box-sizing: border-box;
      display: flex;
      min-width: 0;
      min-height: 0;
      flex: 1;
      align-items: center;
      justify-content: center;
      padding: calc(var(--bc-space-5) * 2);
      overflow-y: auto;
    }

    #better-codex-panel .better-codex-recovery[hidden] {
      display: none;
    }

    #better-codex-panel .better-codex-recovery-card {
      display: flex;
      width: min(440px, 100%);
      align-items: center;
      flex-direction: column;
      text-align: center;
    }

    #better-codex-panel .better-codex-recovery-icon {
      display: inline-flex;
      width: 44px;
      height: 44px;
      align-items: center;
      justify-content: center;
      border-radius: var(--bc-radius-md);
      color: var(--bc-foreground);
      background: var(--bc-surface);
      box-shadow: var(--bc-inset-hairline), var(--bc-surface-shadow);
    }

    #better-codex-panel .better-codex-recovery-icon svg {
      width: 20px;
      height: 20px;
    }

    #better-codex-panel .better-codex-recovery h2 {
      margin: var(--bc-space-4) 0 0;
      color: var(--bc-foreground);
      font-size: var(--bc-text-xl);
      font-weight: 650;
      letter-spacing: -.02em;
    }

    #better-codex-panel .better-codex-recovery p {
      max-width: 400px;
      margin: var(--bc-space-2) 0 0;
      color: var(--bc-muted);
      font-size: var(--bc-text-md);
      line-height: 1.55;
    }

    #better-codex-panel .better-codex-recovery-command {
      box-sizing: border-box;
      display: flex;
      width: 100%;
      min-width: 0;
      align-items: center;
      gap: var(--bc-space-2);
      margin-top: var(--bc-space-5);
      border-radius: var(--bc-radius-sm);
      background: var(--bc-surface);
      padding: var(--bc-space-2);
      box-shadow: var(--bc-inset-hairline);
    }

    #better-codex-panel .better-codex-recovery-command code {
      min-width: 0;
      flex: 1;
      overflow-x: auto;
      color: var(--bc-foreground);
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: var(--bc-text-sm);
      text-align: left;
      white-space: nowrap;
    }

    #better-codex-panel .better-codex-recovery-command button {
      height: var(--bc-control-height);
      flex: 0 0 auto;
      border: 0;
      border-radius: var(--bc-radius-xs);
      color: var(--bc-foreground);
      background: var(--bc-hover);
      padding: 0 var(--bc-space-3);
      font: inherit;
      font-size: var(--bc-text-sm);
      font-weight: 600;
      cursor: pointer;
    }

    #better-codex-panel .better-codex-recovery-command button:hover {
      background: var(--bc-selected);
    }

    #better-codex-panel .better-codex-recovery-retry {
      display: inline-flex;
      height: var(--bc-control-height);
      align-items: center;
      gap: var(--bc-space-2);
      margin-top: var(--bc-space-3);
      border: 0;
      border-radius: var(--bc-radius-sm);
      color: var(--bc-primary-foreground);
      background: var(--bc-primary);
      padding: 0 var(--bc-space-4);
      font: inherit;
      font-weight: 600;
      cursor: pointer;
    }

    #better-codex-panel .better-codex-recovery-retry:hover {
      background: color-mix(in oklch, var(--bc-primary) 88%, white);
    }

    #better-codex-panel .better-codex-recovery-retry:disabled {
      cursor: wait;
      opacity: .62;
    }

    #better-codex-panel .better-codex-recovery-retry svg {
      width: var(--bc-icon-sm);
      height: var(--bc-icon-sm);
    }

    #better-codex-panel .better-codex-recovery-retry:disabled svg {
      animation: better-codex-spin .8s linear infinite;
    }

    #better-codex-panel .better-codex-recovery details {
      margin-top: var(--bc-space-4);
      color: var(--bc-faint);
      font-size: var(--bc-text-sm);
    }

    #better-codex-panel .better-codex-recovery summary {
      cursor: pointer;
    }

    #better-codex-panel .better-codex-recovery details code {
      display: block;
      margin-top: var(--bc-space-2);
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    }

    @media (max-width: 480px) {
      #better-codex-panel .better-codex-recovery {
        padding: var(--bc-space-5);
      }

      #better-codex-panel .better-codex-recovery-command {
        align-items: stretch;
        flex-direction: column;
      }

      #better-codex-panel .better-codex-recovery-command code {
        width: 100%;
        overflow: visible;
        text-align: center;
      }

      #better-codex-dialog[data-detail="true"] .better-codex-dialog-head {
        gap: var(--bc-space-2);
      }

      #better-codex-dialog[data-detail="true"] .better-codex-dialog-breadcrumb > [data-dialog-breadcrumb-project],
      #better-codex-dialog[data-detail="true"] .better-codex-dialog-breadcrumb > [aria-hidden="true"] {
        display: none;
      }

      #better-codex-dialog[data-detail="true"] .better-codex-dialog-open-thread {
        padding-inline: var(--bc-space-2);
        white-space: nowrap;
      }

      #better-codex-dialog[data-detail="true"] .better-codex-dialog-head-actions {
        gap: var(--bc-space-1);
      }
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
    #better-codex-panel .better-codex-column[data-status="archive"] {
      background: var(--bc-color-surface);
    }

    #better-codex-panel .better-codex-column[data-status="in_progress"] { background: color-mix(in oklch, var(--bc-warning) 7%, var(--bc-color-surface)); }
    #better-codex-panel .better-codex-column[data-status="in_review"] { background: color-mix(in oklch, var(--bc-success) 7%, var(--bc-color-surface)); }
    #better-codex-panel .better-codex-column[data-status="done"] { background: color-mix(in oklch, var(--bc-info) 7%, var(--bc-color-surface)); }
    #better-codex-panel .better-codex-column[data-status="blocked"] { background: color-mix(in oklch, var(--bc-danger) 7%, var(--bc-color-surface)); }

    #better-codex-panel .better-codex-column-head {
      min-height: 36px;
      padding: 0 0 var(--bc-space-2);
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

    #better-codex-panel .better-codex-priority,
    #better-codex-context-menu .better-codex-priority,
    #better-codex-dialog .better-codex-priority {
      color: var(--bc-priority-none, var(--bc-muted));
    }

    #better-codex-panel .better-codex-priority[data-priority="none"],
    #better-codex-context-menu .better-codex-priority[data-priority="none"],
    #better-codex-dialog .better-codex-priority[data-priority="none"] {
      color: var(--bc-priority-none, var(--bc-muted));
    }

    #better-codex-panel .better-codex-priority[data-priority="low"],
    #better-codex-context-menu .better-codex-priority[data-priority="low"],
    #better-codex-dialog .better-codex-priority[data-priority="low"] {
      color: var(--bc-priority-low, var(--bc-info));
    }

    #better-codex-panel .better-codex-priority[data-priority="medium"],
    #better-codex-context-menu .better-codex-priority[data-priority="medium"],
    #better-codex-dialog .better-codex-priority[data-priority="medium"] {
      color: var(--bc-priority-medium, var(--bc-warning));
    }

    #better-codex-panel .better-codex-priority[data-priority="high"],
    #better-codex-context-menu .better-codex-priority[data-priority="high"],
    #better-codex-dialog .better-codex-priority[data-priority="high"] {
      color: var(--bc-priority-high, oklch(.68 .18 52));
    }

    #better-codex-panel .better-codex-priority[data-priority="urgent"],
    #better-codex-context-menu .better-codex-priority[data-priority="urgent"],
    #better-codex-dialog .better-codex-priority[data-priority="urgent"] {
      color: var(--bc-priority-urgent, var(--bc-danger));
    }

    #better-codex-panel .better-codex-cards {
      padding: 0;
      border-radius: var(--bc-radius-md);
    }

    #better-codex-panel .better-codex-card {
      width: 100%;
      box-sizing: border-box;
      margin-bottom: var(--bc-space-2);
      border: 1px solid var(--bc-color-hairline);
      border-radius: var(--bc-radius-md);
      color: var(--bc-color-text);
      background: var(--bc-color-canvas);
      padding: var(--bc-space-3);
      box-shadow: var(--bc-card-shadow);
      transition: transform var(--bc-motion-fast) var(--bc-ease-out), border-color var(--bc-motion-fast) ease-out, box-shadow var(--bc-motion-fast) ease-out;
    }

    #better-codex-panel .better-codex-card:hover {
      border-color: color-mix(in srgb, var(--bc-color-text) 16%, var(--bc-color-hairline));
      background: var(--bc-color-canvas);
      box-shadow: var(--bc-card-shadow), 0 4px 12px color-mix(in srgb, var(--bc-color-text) 6%, transparent);
    }

    #better-codex-panel .better-codex-card:active { transform: scale(.98); }

    #better-codex-panel .better-codex-card.is-dragging {
      opacity: .42;
    }

    #better-codex-panel .better-codex-card.is-dragging:active {
      transform: none;
    }

    .better-codex-card.is-drag-ghost {
      display: block;
      margin: 0 !important;
      border: 1px solid var(--bc-color-hairline, #e5e5e6);
      border-radius: var(--bc-radius-md, 13px);
      color: var(--bc-color-text, #1a1c1f);
      background: var(--bc-color-canvas, #ffffff);
      padding: var(--bc-space-3, 12px);
      opacity: 1 !important;
      box-shadow: var(--bc-card-shadow), 0 6px 16px color-mix(in srgb, var(--bc-color-text, #1a1c1f) 8%, transparent);
      cursor: grabbing;
      font-family: var(--bc-font-ui, ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif);
      font-size: var(--bc-text-base, 14px);
      -webkit-font-smoothing: antialiased;
    }

    .better-codex-card.is-drag-ghost .better-codex-card-row,
    .better-codex-card.is-drag-ghost .better-codex-card-id,
    .better-codex-card.is-drag-ghost .better-codex-card-meta {
      display: flex;
      align-items: center;
    }

    .better-codex-card.is-drag-ghost .better-codex-card-row {
      justify-content: space-between;
      gap: 8px;
    }

    .better-codex-card.is-drag-ghost .better-codex-card-id {
      min-width: 0;
      gap: 6px;
      color: var(--bc-color-text-muted, #71717a);
      font-size: var(--bc-text-sm, 12px);
    }

    .better-codex-card.is-drag-ghost .better-codex-card-title {
      display: -webkit-box;
      margin: 5px 0 0;
      overflow: hidden;
      color: var(--bc-color-text, #1a1c1f);
      font-size: var(--bc-text-md, 14px);
      font-weight: 550;
      line-height: 1.38;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 2;
    }

    .better-codex-card.is-drag-ghost .better-codex-card-description {
      margin-top: 4px;
      overflow: hidden;
      color: var(--bc-color-text-muted, #71717a);
      font-size: var(--bc-text-sm, 12px);
      line-height: 1.35;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .better-codex-card.is-drag-ghost .better-codex-chip-row {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 7px;
    }

    .better-codex-card.is-drag-ghost .better-codex-chip {
      display: inline-flex;
      max-width: 155px;
      align-items: center;
      gap: 4px;
      overflow: hidden;
      border-radius: 999px;
      color: var(--bc-color-text-muted, #71717a);
      background: var(--bc-color-control, #f3f3f4);
      padding: 2px 6px;
      font-size: var(--bc-text-caption, 11px);
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .better-codex-card.is-drag-ghost .better-codex-chip > svg {
      width: 11px;
      height: 11px;
      flex: 0 0 auto;
    }

    .better-codex-card.is-drag-ghost .better-codex-card-meta {
      justify-content: space-between;
      gap: 8px;
      margin-top: 8px;
      color: var(--bc-color-text-muted, #71717a);
      font-size: var(--bc-text-sm, 12px);
    }

    .better-codex-card.is-drag-ghost .better-codex-card-assignee {
      display: inline-flex;
      min-width: 0;
      align-items: center;
      gap: 5px;
      overflow: hidden;
    }

    .better-codex-card.is-drag-ghost .better-codex-card-avatar {
      display: inline-flex;
      width: 16px;
      height: 16px;
      flex: 0 0 auto;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      border-radius: 999px;
    }

    .better-codex-card.is-drag-ghost .better-codex-priority,
    .better-codex-card.is-drag-ghost .better-codex-status-icon,
    .better-codex-card.is-drag-ghost svg {
      flex: 0 0 auto;
    }

    #better-codex-panel .better-codex-chip,
    #better-codex-panel .better-codex-agent-default-badge,
    #better-codex-dialog .better-codex-property {
      border: 0;
      border-radius: var(--bc-radius-pill);
      color: var(--bc-color-text-muted);
      background: var(--bc-color-control);
      box-shadow: none;
    }

    #better-codex-panel .better-codex-chip {
      display: inline-flex;
      max-width: 155px;
      align-items: center;
      gap: 4px;
      overflow: hidden;
      padding: 2px 6px;
      font-size: var(--bc-text-caption);
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    #better-codex-panel .better-codex-chip > svg {
      width: 11px;
      height: 11px;
      flex: 0 0 auto;
    }

    #better-codex-panel .better-codex-chip > span {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    #better-codex-panel .better-codex-card-assignee {
      display: inline-flex;
      min-width: 0;
      align-items: center;
      gap: 5px;
      overflow: hidden;
      color: var(--bc-color-text-muted);
    }

    #better-codex-panel .better-codex-card-assignee > span:last-child {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    #better-codex-panel .better-codex-card-assignee > svg {
      width: 12px;
      height: 12px;
      flex: 0 0 auto;
    }

    #better-codex-panel .better-codex-card-avatar {
      display: inline-flex;
      width: 16px;
      height: 16px;
      flex: 0 0 auto;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      border-radius: 999px;
      color: var(--bc-primary-foreground);
      background: var(--bc-primary);
    }

    #better-codex-panel .better-codex-card-avatar.is-codex {
      color: inherit;
      background: transparent;
      border-radius: 4px;
    }

    #better-codex-panel .better-codex-card-avatar.is-fallback,
    #better-codex-panel .better-codex-card-avatar.is-icon {
      color: var(--bc-color-text-muted);
      background: var(--bc-color-control);
    }

    #better-codex-panel .better-codex-card-avatar img,
    #better-codex-panel .better-codex-card-avatar svg {
      display: block;
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    #better-codex-panel .better-codex-card-avatar.is-fallback svg,
    #better-codex-panel .better-codex-card-avatar.is-icon svg {
      width: 10px;
      height: 10px;
      margin: auto;
    }

    #better-codex-panel .better-codex-card-avatar.is-user.is-initials {
      color: #fff;
      font-size: 9px;
      font-weight: 700;
      line-height: 1;
    }

    #better-codex-panel .better-codex-activity[data-run="blocked"],
    #better-codex-dialog .better-codex-conversation-status .better-codex-activity[data-run="blocked"] {
      color: var(--bc-danger);
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

    #better-codex-dialog .better-codex-property:disabled,
    #better-codex-dialog .better-codex-property:disabled:hover,
    #better-codex-dialog .better-codex-property:has(:disabled),
    #better-codex-dialog .better-codex-property:has(:disabled):hover,
    #better-codex-dialog .better-codex-dialog-select-trigger:disabled,
    #better-codex-dialog .better-codex-dialog-select-trigger:disabled:hover {
      color: var(--bc-color-text-muted);
      background: var(--bc-color-control);
      cursor: not-allowed;
      opacity: .55;
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

    #better-codex-dialog .better-codex-dialog-select-trigger-visual > .better-codex-agent-avatar,
    #better-codex-dialog .better-codex-dialog-select-option-visual > .better-codex-agent-avatar {
      width: var(--bc-icon-sm);
      height: var(--bc-icon-sm);
      flex: 0 0 var(--bc-icon-sm);
      aspect-ratio: 1;
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

    #better-codex-dialog .better-codex-dialog-select.is-assignee .better-codex-dialog-select-menu {
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
      display: inline-flex;
      align-items: center;
      gap: 4px;
      min-width: 0;
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    #better-codex-dialog .better-codex-dialog-select-label {
      display: inline-flex;
      min-width: 0;
      align-items: center;
      gap: 4px;
      overflow: hidden;
      white-space: nowrap;
    }

    #better-codex-dialog .better-codex-dialog-select-tag {
      flex: 0 0 auto;
      border-radius: 999px;
      padding: 1px 5px;
      font-size: var(--bc-text-xs);
      font-weight: 650;
      line-height: 1.25;
    }

    #better-codex-dialog .better-codex-dialog-select-tag[data-tone="model"] {
      color: var(--bc-info);
      background: color-mix(in srgb, var(--bc-info) 13%, var(--bc-color-control));
    }

    #better-codex-dialog .better-codex-dialog-select-tag[data-tone="reasoning"] {
      color: var(--bc-success);
      background: color-mix(in srgb, var(--bc-success) 13%, var(--bc-color-control));
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
      padding: 12px 32px 48px;
    }

    #better-codex-panel .better-codex-agent-page-heading,
    #better-codex-panel .better-codex-agent-search-wrap,
    #better-codex-panel .better-codex-agent-list,
    #better-codex-panel .better-codex-agent-suggestions {
      width: min(100%, 802px);
      margin-inline: auto;
    }

    #better-codex-panel .better-codex-agent-page-heading {
      margin-bottom: 20px;
    }

    #better-codex-panel .better-codex-agent-page-heading h1 {
      margin: 0;
      color: var(--bc-color-text);
      font-size: calc(var(--bc-text-base) + 12px);
      font-weight: 650;
      line-height: 1.2;
    }

    #better-codex-panel .better-codex-agent-page-heading p {
      margin: 5px 0 0;
      color: var(--bc-color-text-muted);
      font-size: var(--bc-text-md);
      line-height: 1.45;
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
      border: 1px solid var(--bc-color-hairline);
      background: var(--bc-color-canvas);
      padding-left: 38px;
      border-radius: var(--bc-radius-md);
      box-shadow: none;
    }

    #better-codex-panel .better-codex-agent-search-wrap .better-codex-search:focus {
      border-color: var(--bc-color-focus);
      background: var(--bc-color-canvas);
      box-shadow: 0 0 0 2px color-mix(in oklch, var(--bc-color-focus) 18%, transparent);
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

    #better-codex-panel :is(.better-codex-filter-avatar, .better-codex-card-avatar, .better-codex-agent-list-avatar).is-icon,
    #better-codex-context-menu .better-codex-context-avatar.is-icon,
    #better-codex-dialog :is(.better-codex-agent-avatar, .better-codex-bubble-avatar).is-icon {
      color: var(--bc-color-text-muted);
      background: var(--bc-color-control);
    }

    #better-codex-panel .better-codex-agent-list-avatar.is-icon svg {
      width: 18px;
      height: 18px;
    }

    #better-codex-panel :is(.better-codex-filter-avatar, .better-codex-card-avatar, .better-codex-agent-list-avatar).is-icon[data-tone="info"],
    #better-codex-context-menu .better-codex-context-avatar.is-icon[data-tone="info"],
    #better-codex-dialog :is(.better-codex-agent-avatar, .better-codex-bubble-avatar).is-icon[data-tone="info"] {
      color: var(--bc-info);
      background: color-mix(in oklch, var(--bc-info) 14%, var(--bc-color-surface));
    }

    #better-codex-panel :is(.better-codex-filter-avatar, .better-codex-card-avatar, .better-codex-agent-list-avatar).is-icon[data-tone="success"],
    #better-codex-context-menu .better-codex-context-avatar.is-icon[data-tone="success"],
    #better-codex-dialog :is(.better-codex-agent-avatar, .better-codex-bubble-avatar).is-icon[data-tone="success"] {
      color: var(--bc-success);
      background: color-mix(in oklch, var(--bc-success) 14%, var(--bc-color-surface));
    }

    #better-codex-panel :is(.better-codex-filter-avatar, .better-codex-card-avatar, .better-codex-agent-list-avatar).is-icon[data-tone="warning"],
    #better-codex-context-menu .better-codex-context-avatar.is-icon[data-tone="warning"],
    #better-codex-dialog :is(.better-codex-agent-avatar, .better-codex-bubble-avatar).is-icon[data-tone="warning"] {
      color: var(--bc-warning);
      background: color-mix(in oklch, var(--bc-warning) 16%, var(--bc-color-surface));
    }

    #better-codex-panel :is(.better-codex-filter-avatar, .better-codex-card-avatar, .better-codex-agent-list-avatar).is-icon[data-tone="muted"],
    #better-codex-context-menu .better-codex-context-avatar.is-icon[data-tone="muted"],
    #better-codex-dialog :is(.better-codex-agent-avatar, .better-codex-bubble-avatar).is-icon[data-tone="muted"] {
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
      position: relative;
      box-sizing: border-box;
      width: var(--bc-agent-inspector-width, min(32vw, 516px));
      min-width: 430px;
      flex: 0 0 auto;
      overflow: hidden;
      color: var(--bc-color-text);
      background: var(--bc-color-canvas);
      box-shadow: inset 1px 0 color-mix(in oklch, var(--bc-color-text) 6%, transparent);
      transform: translateX(0);
      opacity: 1;
      transition: width var(--bc-motion-normal) var(--bc-ease-out), min-width var(--bc-motion-normal) var(--bc-ease-out), opacity var(--bc-motion-fast) ease-out, transform var(--bc-motion-normal) var(--bc-ease-out), box-shadow var(--bc-motion-fast) ease-out;
    }

    #better-codex-panel .better-codex-agent-inspector[data-resized="true"] {
      min-width: 320px;
    }

    #better-codex-panel .better-codex-agent-inspector.is-resizing {
      transition: none;
    }

    #better-codex-panel .better-codex-agent-inspector-resize {
      position: absolute;
      z-index: 4;
      top: 0;
      bottom: 0;
      left: 0;
      width: 9px;
      cursor: col-resize;
      touch-action: none;
      outline: none;
    }

    #better-codex-panel .better-codex-agent-inspector-resize::after {
      position: absolute;
      top: 0;
      bottom: 0;
      left: 0;
      width: 1px;
      background: transparent;
      content: "";
      transition: background-color var(--bc-motion-fast) ease-out;
    }

    #better-codex-panel .better-codex-agent-inspector-resize:hover::after,
    #better-codex-panel .better-codex-agent-inspector-resize:focus-visible::after,
    #better-codex-panel .better-codex-agent-inspector.is-resizing .better-codex-agent-inspector-resize::after {
      background: var(--bc-color-accent);
    }

    #better-codex-panel[data-agent-resizing="true"],
    #better-codex-panel[data-agent-resizing="true"] * {
      cursor: col-resize !important;
      user-select: none !important;
    }

    #better-codex-panel .better-codex-agent-inspector[data-animate="enter"] {
      animation: better-codex-inspector-enter var(--bc-motion-normal) var(--bc-ease-out);
    }

    #better-codex-panel .better-codex-agent-inspector.is-closing {
      width: 0 !important;
      min-width: 0 !important;
      opacity: 0;
      transform: translateX(18px);
      box-shadow: none;
      pointer-events: none;
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
      -webkit-app-region: drag;
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
      font-size: var(--bc-text-lg);
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
      font-size: var(--bc-text-lg);
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
      font-size: var(--bc-text-md);
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

    #better-codex-panel .better-codex-agent-number-input {
      box-sizing: border-box;
      width: 76px;
      min-height: 32px;
      border: 0;
      border-radius: var(--bc-radius-pill);
      color: var(--bc-color-text);
      background: transparent;
      padding: 7px 9px;
      font: inherit;
      text-align: right;
      outline: 0;
    }

    #better-codex-panel .better-codex-agent-number-input:focus {
      background: var(--bc-color-hover);
      box-shadow: var(--bc-focus-ring);
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
      width: min(300px, calc(100vw - 48px));
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

    #better-codex-panel .better-codex-agent-menu-item-copy {
      display: flex;
      min-width: 0;
      align-items: center;
      gap: 9px;
    }

    #better-codex-panel .better-codex-agent-menu-item-copy > span:last-child {
      display: flex;
      min-width: 0;
      flex-direction: column;
      gap: 2px;
    }

    #better-codex-panel .better-codex-agent-menu-item-copy strong {
      font-size: var(--bc-text-sm);
      font-weight: 600;
    }

    #better-codex-panel .better-codex-agent-menu-item-copy small {
      color: var(--bc-color-text-faint);
      font-size: var(--bc-text-caption);
      line-height: 1.35;
      white-space: normal;
    }

    #better-codex-panel .better-codex-agent-menu-item-icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 18px;
      height: 18px;
      flex: 0 0 18px;
      color: var(--bc-color-text-muted);
    }

    #better-codex-panel .better-codex-agent-menu-item-icon svg {
      width: 16px;
      height: 16px;
    }

    #better-codex-panel .better-codex-agent-menu-item-check {
      display: inline-flex;
      flex: 0 0 auto;
      align-items: center;
      justify-content: center;
      width: 14px;
    }

    #better-codex-panel .better-codex-agent-setting[data-agent-picker="sandbox_mode"] .better-codex-agent-menu {
      width: min(340px, calc(100vw - 48px));
    }

    #better-codex-panel .better-codex-agent-setting[data-agent-picker="sandbox_mode"] .better-codex-agent-menu-item {
      box-sizing: border-box;
      height: 64px;
      min-height: 64px;
      align-items: center;
      padding: 8px 9px;
    }

    #better-codex-panel .better-codex-agent-menu-item.is-warning,
    #better-codex-panel .better-codex-agent-menu-item.is-warning .better-codex-agent-menu-item-icon {
      color: var(--bc-warning, #c2410c);
    }

    #better-codex-panel .better-codex-agent-menu-item.is-warning small {
      color: color-mix(in oklch, var(--bc-warning, #c2410c) 78%, var(--bc-color-text));
    }

    #better-codex-panel .better-codex-agent-inspector-field {
      display: flex;
      margin-bottom: 18px;
      flex-direction: column;
      gap: 8px;
      color: var(--bc-color-text-muted);
      font-size: var(--bc-text-md);
    }

    #better-codex-panel .better-codex-agent-inspector-field small {
      color: var(--bc-color-text-faint);
      font-size: var(--bc-text-sm);
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
    }

    #better-codex-panel .better-codex-agent-inspector-field textarea {
      resize: none;
      overflow-x: hidden;
      overflow-y: auto;
    }

    #better-codex-panel .better-codex-agent-inspector-field textarea[name="description"] {
      height: calc((var(--bc-text-md) * 1.55 * 4) + 26px);
    }

    #better-codex-panel .better-codex-agent-inspector-field textarea[name="instructions"] {
      height: calc((var(--bc-text-md) * 1.55 * 12) + 26px);
      font-size: var(--bc-text-md);
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
      gap: var(--bc-space-2);
      cursor: pointer;
      transition: transform var(--bc-motion-fast) var(--bc-ease-out), background-color var(--bc-motion-fast) ease-out, opacity var(--bc-motion-fast) ease-out;
    }

    #better-codex-dialog .better-codex-dialog-open-thread:hover {
      background: color-mix(in oklch, var(--bc-color-primary) 88%, var(--bc-color-canvas));
    }

    #better-codex-dialog .better-codex-dialog-open-thread:active {
      transform: scale(.96);
    }

    #better-codex-dialog .better-codex-dialog-open-thread:disabled {
      cursor: wait;
      opacity: .72;
    }

    #better-codex-dialog .better-codex-dialog-open-thread.is-loading svg {
      animation: better-codex-dialog-open-thread-spin .85s linear infinite;
    }

    @keyframes better-codex-dialog-open-thread-spin { to { transform: rotate(360deg); } }

    @media (prefers-reduced-motion: reduce) {
      #better-codex-dialog .better-codex-dialog-open-thread.is-loading svg { animation: none; }
    }

    #better-codex-dialog .better-codex-dialog-start-now {
      display: inline-flex;
      min-height: var(--bc-control-height);
      align-items: center;
      justify-content: center;
      border: 1px solid var(--bc-color-hairline);
      border-radius: var(--bc-radius-sm);
      color: var(--bc-color-text);
      background: var(--bc-color-control);
      padding: 0 var(--bc-control-padding);
      font: inherit;
      font-size: var(--bc-text-md);
      font-weight: 560;
      cursor: pointer;
      transition: transform var(--bc-motion-fast) var(--bc-ease-out), background-color var(--bc-motion-fast) ease-out, opacity var(--bc-motion-fast) ease-out;
    }

    #better-codex-dialog .better-codex-dialog-start-now:hover {
      background: color-mix(in oklch, var(--bc-color-control) 82%, var(--bc-color-text));
    }

    #better-codex-dialog .better-codex-dialog-start-now:active {
      transform: scale(.96);
    }

    #better-codex-dialog .better-codex-dialog-start-now:disabled,
    #better-codex-dialog .better-codex-submit:disabled {
      cursor: not-allowed;
      opacity: .5;
    }

    #better-codex-dialog[data-detail="true"][data-expanded="false"] {
      width: min(720px, calc(100vw - 48px));
      height: fit-content;
      max-height: calc(100vh - 48px);
    }

    #better-codex-dialog[data-detail="true"][data-expanded="false"]:has(.better-codex-conversation) {
      height: min(62vh, 640px);
    }

    #better-codex-dialog[data-detail="true"][data-expanded="true"] {
      --bc-dialog-content-gutter: calc(var(--bc-text-base) * 1.714286);
      width: min(1200px, calc(100vw - 48px));
      height: fit-content;
      max-height: calc(100vh - 48px);
    }

    #better-codex-dialog[data-detail="true"][data-expanded="true"]:has(.better-codex-conversation) {
      height: min(76vh, 780px);
    }

    #better-codex-dialog[data-detail="true"][data-expanded="true"] .better-codex-dialog-head,
    #better-codex-dialog[data-detail="true"][data-expanded="true"] .better-codex-agent-picker {
      padding-inline: var(--bc-dialog-content-gutter);
    }

    #better-codex-dialog[data-detail="true"][data-expanded="true"] .better-codex-manual-title {
      width: calc(100% - (var(--bc-dialog-content-gutter) * 2));
      margin-inline: var(--bc-dialog-content-gutter);
      padding-inline: var(--bc-space-3);
    }

    #better-codex-dialog[data-detail="true"][data-expanded="true"] .better-codex-description-field {
      margin: 0 var(--bc-dialog-content-gutter) var(--bc-space-2);
      background: var(--bc-color-input);
      padding: var(--bc-space-1) var(--bc-space-3) var(--bc-space-2);
      box-shadow: var(--bc-inset-hairline);
    }

    #better-codex-dialog[data-detail="true"][data-expanded="true"] .better-codex-description-field .better-codex-dialog-editor {
      height: calc((var(--bc-text-md) * 1.55 * 2) + var(--bc-space-1));
      max-height: calc((var(--bc-text-md) * 1.55 * 2) + var(--bc-space-1));
    }

    #better-codex-dialog[data-detail="true"][data-expanded="true"][data-description-expanded="true"] .better-codex-description-field .better-codex-dialog-editor {
      height: min(36vh, calc((var(--bc-text-md) * 1.55 * 12) + var(--bc-space-1)));
      max-height: min(36vh, calc((var(--bc-text-md) * 1.55 * 12) + var(--bc-space-1)));
    }

    #better-codex-dialog form {
      min-height: 0;
      overflow: hidden;
    }

    #better-codex-dialog form:has(.better-codex-project-menu:not([hidden])) {
      overflow: visible;
    }

    #better-codex-dialog .better-codex-description-field {
      display: flex;
      min-height: 0;
      flex: 0 0 auto;
      flex-direction: column;
      align-items: flex-start;
      margin: 0 var(--bc-space-4);
      border-radius: var(--bc-radius-sm);
      padding: var(--bc-space-1) var(--bc-space-2) var(--bc-space-2);
      transition: background-color var(--bc-motion-fast) ease-out, box-shadow var(--bc-motion-fast) ease-out;
    }

    #better-codex-dialog[data-detail="true"] .better-codex-manual-title {
      box-sizing: border-box;
      width: calc(100% - (var(--bc-space-4) * 2));
      margin: 0 var(--bc-space-4) var(--bc-space-1);
      border-radius: var(--bc-radius-sm);
      padding: var(--bc-space-1) var(--bc-space-2);
      transition: background-color var(--bc-motion-fast) ease-out, box-shadow var(--bc-motion-fast) ease-out;
    }

    #better-codex-dialog[data-detail="true"] .better-codex-manual-title:hover,
    #better-codex-dialog[data-detail="true"] .better-codex-description-field:hover {
      background: color-mix(in oklch, var(--bc-color-input) 58%, transparent);
    }

    #better-codex-dialog[data-detail="true"] .better-codex-manual-title:focus,
    #better-codex-dialog[data-detail="true"] .better-codex-description-field:focus-within {
      background: var(--bc-color-input);
      box-shadow: var(--bc-inset-hairline), var(--bc-focus-ring);
    }

    #better-codex-dialog .better-codex-description-field .better-codex-dialog-editor {
      width: 100%;
      flex: 0 0 auto;
      max-height: calc((var(--bc-text-md) * 1.55 * 3) + var(--bc-space-1));
      margin: 0;
      overflow-y: hidden;
    }

    #better-codex-dialog[data-description-expanded="true"] .better-codex-description-field .better-codex-dialog-editor {
      height: min(36vh, calc((var(--bc-text-md) * 1.55 * 12) + var(--bc-space-1)));
      max-height: min(36vh, calc((var(--bc-text-md) * 1.55 * 12) + var(--bc-space-1)));
      overflow-y: auto;
    }

    #better-codex-dialog .better-codex-description-toggle {
      min-height: var(--bc-control-height);
      border: 0;
      border-radius: var(--bc-radius-sm);
      color: var(--bc-color-text-muted);
      background: transparent;
      padding: 0 var(--bc-space-2);
      font: inherit;
      font-size: var(--bc-text-sm);
      cursor: pointer;
    }

    #better-codex-dialog .better-codex-description-toggle:hover {
      color: var(--bc-color-text);
      background: var(--bc-color-hover);
    }

    #better-codex-dialog .better-codex-description-toggle:focus-visible {
      outline: none;
      box-shadow: var(--bc-focus-ring);
    }

    #better-codex-dialog .better-codex-description-toggle[hidden] {
      display: none;
    }

    #better-codex-dialog .better-codex-conversation {
      display: flex;
      min-height: 0;
      flex: 1 1 0;
      flex-direction: column;
      margin: 0 20px;
      overflow: hidden;
      border: 1px solid var(--bc-border);
      border-radius: var(--bc-radius-md);
      background: color-mix(in oklch, var(--bc-surface) 92%, var(--bc-hover));
    }

    #better-codex-dialog[data-detail="true"][data-expanded="true"] .better-codex-conversation {
      margin-inline: var(--bc-dialog-content-gutter);
      border: 0;
      background: var(--bc-color-input);
      box-shadow: var(--bc-inset-hairline);
    }

    #better-codex-dialog[data-detail="true"][data-expanded="true"] .better-codex-conversation-head,
    #better-codex-dialog[data-detail="true"][data-expanded="true"] .better-codex-timeline {
      padding-inline: var(--bc-space-3);
    }

    #better-codex-dialog .better-codex-conversation-head {
      display: flex;
      flex: 0 0 auto;
      align-items: center;
      justify-content: space-between;
      gap: var(--bc-space-2);
      border-bottom: 1px solid var(--bc-divider);
      padding: calc(var(--bc-text-base) * 0.55) calc(var(--bc-text-base) * 0.85);
      color: var(--bc-muted);
      font-size: var(--bc-text-md);
      font-weight: 550;
    }

    #better-codex-dialog .better-codex-conversation-status {
      display: inline-flex;
      align-items: center;
      color: var(--bc-faint);
      font-weight: 500;
    }

    #better-codex-dialog .better-codex-conversation-status .better-codex-activity {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      color: var(--bc-muted);
      font-size: var(--bc-text-caption);
      font-weight: 600;
    }

    #better-codex-dialog .better-codex-conversation-status .better-codex-activity[data-run="replying"] {
      color: var(--bc-foreground);
    }

    #better-codex-dialog .better-codex-conversation-status .better-codex-activity[data-run="completed"] {
      color: var(--bc-success);
    }

    #better-codex-dialog .better-codex-conversation-status .better-codex-activity[data-run="reply-failed"],
    #better-codex-dialog .better-codex-conversation-status .better-codex-activity[data-run="failed"],
    #better-codex-dialog .better-codex-conversation-status .better-codex-activity[data-run="interrupted"] {
      color: var(--bc-danger);
    }

    #better-codex-dialog .better-codex-conversation-status .better-codex-activity[data-run="claimed"],
    #better-codex-dialog .better-codex-conversation-status .better-codex-activity[data-run="not-started"] {
      color: var(--bc-muted);
    }

    #better-codex-dialog .better-codex-conversation-status-avatar {
      width: 16px;
      height: 16px;
      border: 0;
    }

    #better-codex-dialog .better-codex-conversation-status-avatar.is-fallback svg,
    #better-codex-dialog .better-codex-conversation-status-avatar.is-icon svg {
      width: 10px;
      height: 10px;
    }

    #better-codex-dialog .better-codex-conversation-status-avatar.is-codex svg {
      width: 16px;
      height: 16px;
    }

    #better-codex-panel .better-codex-activity-dot,
    #better-codex-dialog .better-codex-conversation-status .better-codex-activity-dot {
      display: block;
      width: 6px;
      height: 6px;
      min-width: 6px;
      min-height: 6px;
      flex: 0 0 6px;
      aspect-ratio: 1;
      box-sizing: border-box;
      border-radius: var(--bc-radius-pill);
      background: currentColor;
    }

    #better-codex-panel .better-codex-scheduler-dot,
    #better-codex-dialog .better-codex-scheduler-dot {
      background: var(--bc-info);
    }

    #better-codex-panel .better-codex-scheduler-failed-dot,
    #better-codex-dialog .better-codex-scheduler-failed-dot {
      background: var(--bc-danger);
    }

    #better-codex-dialog .better-codex-conversation-status .better-codex-shimmer {
      background-image: linear-gradient(90deg, var(--bc-muted) 0%, var(--bc-muted) 35%, var(--bc-foreground) 50%, var(--bc-muted) 65%, var(--bc-muted) 100%);
      background-size: 200% 100%;
      background-clip: text;
      color: transparent;
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      animation: better-codex-shimmer 2.5s linear infinite;
    }

    #better-codex-dialog .better-codex-timeline {
      display: flex;
      min-height: 0;
      flex: 1 1 0;
      flex-direction: column;
      gap: calc(var(--bc-text-base) * 1.05);
      overflow-y: auto;
      padding: calc(var(--bc-text-base) * 0.85) calc(var(--bc-text-base) * 0.95);
    }

    #better-codex-dialog .better-codex-bubble {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      min-width: 0;
    }

    #better-codex-dialog .better-codex-bubble-avatar {
      display: inline-flex;
      width: 28px;
      height: 28px;
      flex: 0 0 auto;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      border-radius: 999px;
      color: var(--bc-primary-foreground);
      background: var(--bc-primary);
      font-size: var(--bc-text-avatar);
    }

    #better-codex-dialog .better-codex-bubble-avatar.is-user {
      color: #fff;
      background: #16a34a;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.02em;
      line-height: 1;
      text-transform: uppercase;
    }

    #better-codex-dialog .better-codex-bubble-avatar.is-user.is-initials {
      font-family: var(--bc-font-ui);
    }

    #better-codex-dialog .better-codex-bubble-avatar.is-codex {
      color: inherit;
      background: transparent;
    }

    #better-codex-dialog .better-codex-bubble-avatar.is-fallback {
      border-radius: var(--bc-radius-xs);
      color: var(--bc-color-text-muted);
      background: var(--bc-color-control);
    }

    #better-codex-dialog .better-codex-bubble-avatar.has-image img,
    #better-codex-dialog .better-codex-bubble-avatar svg {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    #better-codex-dialog .better-codex-bubble-avatar.is-fallback svg,
    #better-codex-dialog .better-codex-bubble-avatar.is-icon svg,
    #better-codex-dialog .better-codex-bubble-avatar.is-user svg {
      width: 14px;
      height: 14px;
    }

    #better-codex-dialog .better-codex-bubble-avatar.is-codex svg {
      width: 28px;
      height: 28px;
    }

    #better-codex-dialog .better-codex-bubble-main {
      min-width: 0;
      flex: 1;
    }

    #better-codex-dialog .better-codex-bubble-meta {
      display: flex;
      align-items: baseline;
      gap: 8px;
      margin-bottom: 4px;
      min-width: 0;
    }

    #better-codex-dialog .better-codex-bubble-meta strong {
      overflow: hidden;
      color: var(--bc-foreground);
      font-size: var(--bc-text-md);
      font-weight: 650;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    #better-codex-dialog .better-codex-bubble-meta time {
      flex: 0 0 auto;
      color: var(--bc-faint);
      font-size: calc(var(--bc-text-md) * 0.92);
    }

    #better-codex-dialog .better-codex-bubble-content {
      color: color-mix(in oklch, var(--bc-foreground) 88%, var(--bc-muted));
      font-size: var(--bc-text-md);
      line-height: 1.6;
    }

    #better-codex-dialog .better-codex-bubble.is-user .better-codex-bubble-content {
      color: color-mix(in oklch, var(--bc-foreground) 82%, var(--bc-muted));
    }

    #better-codex-dialog .better-codex-markdown > :first-child,
    #better-codex-dialog .better-codex-bubble-content > :first-child {
      margin-top: 0;
    }

    #better-codex-dialog .better-codex-markdown > :last-child,
    #better-codex-dialog .better-codex-bubble-content > :last-child {
      margin-bottom: 0;
    }

    #better-codex-dialog .better-codex-markdown p,
    #better-codex-dialog .better-codex-markdown ul,
    #better-codex-dialog .better-codex-markdown ol,
    #better-codex-dialog .better-codex-markdown pre,
    #better-codex-dialog .better-codex-markdown blockquote,
    #better-codex-dialog .better-codex-bubble-content p,
    #better-codex-dialog .better-codex-bubble-content ul,
    #better-codex-dialog .better-codex-bubble-content ol,
    #better-codex-dialog .better-codex-bubble-content pre,
    #better-codex-dialog .better-codex-bubble-content blockquote {
      margin: 0 0 .75em;
    }

    #better-codex-dialog .better-codex-markdown h1,
    #better-codex-dialog .better-codex-markdown h2,
    #better-codex-dialog .better-codex-markdown h3,
    #better-codex-dialog .better-codex-bubble-content h1,
    #better-codex-dialog .better-codex-bubble-content h2,
    #better-codex-dialog .better-codex-bubble-content h3 {
      margin: 0 0 .5em;
      color: var(--bc-foreground);
      font-weight: 650;
      line-height: 1.35;
    }

    #better-codex-dialog .better-codex-markdown h1,
    #better-codex-dialog .better-codex-bubble-content h1 { font-size: 1.2em; }
    #better-codex-dialog .better-codex-markdown h2,
    #better-codex-dialog .better-codex-bubble-content h2 { font-size: 1.1em; }
    #better-codex-dialog .better-codex-markdown h3,
    #better-codex-dialog .better-codex-bubble-content h3 { font-size: 1.05em; }

    #better-codex-dialog .better-codex-markdown ul,
    #better-codex-dialog .better-codex-markdown ol,
    #better-codex-dialog .better-codex-bubble-content ul,
    #better-codex-dialog .better-codex-bubble-content ol {
      padding-left: 1.35em;
    }

    #better-codex-dialog .better-codex-markdown li + li,
    #better-codex-dialog .better-codex-bubble-content li + li {
      margin-top: .28em;
    }

    #better-codex-dialog .better-codex-markdown a,
    #better-codex-dialog .better-codex-bubble-content a {
      color: var(--bc-info);
      text-decoration: underline;
      text-underline-offset: 2px;
    }

    #better-codex-dialog .better-codex-markdown code,
    #better-codex-dialog .better-codex-bubble-content code {
      border-radius: 4px;
      background: color-mix(in oklch, var(--bc-hover) 80%, var(--bc-border));
      padding: .08em .35em;
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-size: .92em;
    }

    #better-codex-dialog .better-codex-markdown pre,
    #better-codex-dialog .better-codex-bubble-content pre {
      overflow: auto;
      border-radius: var(--bc-radius-sm);
      background: color-mix(in oklch, var(--bc-hover) 70%, var(--bc-border));
      padding: .7em .85em;
    }

    #better-codex-dialog .better-codex-markdown pre code,
    #better-codex-dialog .better-codex-bubble-content pre code {
      background: transparent;
      padding: 0;
      font-size: .9em;
    }

    #better-codex-dialog .better-codex-markdown blockquote,
    #better-codex-dialog .better-codex-bubble-content blockquote {
      border-left: 3px solid var(--bc-border);
      color: var(--bc-muted);
      padding-left: .75em;
    }

    #better-codex-dialog .better-codex-markdown-empty {
      margin: auto;
      padding: 18px 8px;
      color: var(--bc-faint);
      text-align: center;
    }

    #better-codex-dialog .better-codex-conversation-empty {
      margin: auto;
      padding: 18px 8px;
      text-align: center;
    }

    #better-codex-dialog .better-codex-conversation-empty span {
      display: block;
      margin-top: var(--bc-space-3);
      color: var(--bc-faint);
      font-size: var(--bc-text-sm);
    }

    #better-codex-dialog .better-codex-composer {
      display: grid;
      flex: 0 0 auto;
      grid-template-columns: minmax(0, 1fr);
      gap: 6px;
      margin: 8px 20px 0;
      border: 0;
      border-radius: 23px;
      background: var(--bc-color-input);
      padding: 8px;
      box-shadow: var(--bc-inset-hairline);
    }

    #better-codex-dialog[data-detail="true"][data-expanded="true"] .better-codex-composer {
      margin: var(--bc-space-2) var(--bc-dialog-content-gutter) 0;
    }

    #better-codex-dialog .better-codex-composer .better-codex-dialog-attachments {
      box-sizing: border-box;
      width: 100%;
      padding: 0 0 2px;
    }

    #better-codex-dialog .better-codex-conversation-feedback {
      display: flex;
      flex: 0 0 auto;
      align-items: center;
      justify-content: space-between;
      gap: var(--bc-space-3);
      margin: 8px 20px 0;
      border: 1px solid color-mix(in oklch, var(--bc-danger) 32%, var(--bc-border));
      border-radius: var(--bc-radius-sm);
      color: var(--bc-danger);
      background: color-mix(in oklch, var(--bc-danger) 7%, var(--bc-surface));
      padding: 8px 10px;
      font-size: var(--bc-text-md);
      line-height: 1.45;
    }

    #better-codex-dialog[data-detail="true"][data-expanded="true"] .better-codex-conversation-feedback {
      margin-inline: var(--bc-dialog-content-gutter);
    }

    #better-codex-dialog .better-codex-conversation-feedback[hidden] {
      display: none;
    }

    #better-codex-dialog .better-codex-conversation-feedback button {
      flex: 0 0 auto;
      border: 1px solid color-mix(in oklch, var(--bc-danger) 36%, var(--bc-border));
      border-radius: var(--bc-radius-sm);
      color: var(--bc-danger);
      background: var(--bc-surface);
      padding: 5px 9px;
      font: inherit;
      font-weight: 600;
      cursor: pointer;
    }

    #better-codex-dialog .better-codex-composer textarea {
      box-sizing: border-box;
      width: 100%;
      height: calc(2.9em + 8px);
      border: 0;
      color: var(--bc-foreground);
      background: transparent;
      padding: 5px 8px 2px;
      font: inherit;
      font-size: var(--bc-text-md);
      line-height: 1.45;
      outline: none;
      overflow-y: auto;
      resize: none;
    }

    #better-codex-dialog[data-detail="true"][data-expanded="true"] .better-codex-composer textarea {
      height: calc(5.8em + 8px);
      padding-inline: var(--bc-space-1);
    }

    #better-codex-dialog .better-codex-composer textarea::placeholder {
      color: var(--bc-muted);
    }

    #better-codex-dialog .better-codex-composer-toolbar {
      display: flex;
      height: 30px;
      align-items: center;
      justify-content: space-between;
    }

    #better-codex-dialog .better-codex-composer-attach,
    #better-codex-dialog .better-codex-composer-send {
      display: inline-flex;
      width: 30px;
      height: 30px;
      flex: 0 0 30px;
      align-items: center;
      justify-content: center;
      border: 0;
      border-radius: var(--bc-radius-pill);
      padding: 0;
      font: inherit;
      cursor: pointer;
      transition: transform var(--bc-motion-fast) var(--bc-ease-out), background-color var(--bc-motion-fast) var(--bc-ease-out), color var(--bc-motion-fast) var(--bc-ease-out), opacity var(--bc-motion-fast) var(--bc-ease-out);
    }

    #better-codex-dialog .better-codex-composer-attach {
      color: var(--bc-color-text-muted);
      background: transparent;
    }

    #better-codex-dialog .better-codex-composer-send {
      color: var(--bc-primary-foreground);
      background: var(--bc-primary);
    }

    #better-codex-dialog .better-codex-composer-send svg {
      width: 16px;
      height: 16px;
    }

    #better-codex-dialog .better-codex-composer-send[data-composer-mode="stop"] svg,
    #better-codex-dialog .better-codex-composer-send[data-composer-mode="stopping"] svg {
      width: 11px;
      height: 11px;
      fill: currentColor;
    }

    #better-codex-dialog .better-codex-composer :is(.better-codex-composer-attach, .better-codex-composer-send):active:not(:disabled) {
      transform: scale(.92);
    }

    #better-codex-dialog .better-codex-composer :is(.better-codex-composer-attach, .better-codex-composer-send):focus-visible {
      outline: 2px solid var(--bc-color-focus);
      outline-offset: 2px;
    }

    @media (hover: hover) {
      #better-codex-dialog .better-codex-composer-attach:hover:not(:disabled) {
        color: var(--bc-color-text);
        background: var(--bc-color-hover);
      }

      #better-codex-dialog .better-codex-composer-send:hover:not(:disabled) {
        background: color-mix(in oklch, var(--bc-primary) 88%, var(--bc-color-input));
      }
    }

    #better-codex-dialog .better-codex-composer :is(.better-codex-composer-attach, .better-codex-composer-send):disabled {
      cursor: default;
      opacity: .42;
    }

    @media (prefers-reduced-motion: reduce) {
      #better-codex-dialog .better-codex-composer :is(.better-codex-composer-attach, .better-codex-composer-send) {
        transition: none;
      }
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
    #better-codex-dialog .better-codex-dialog-start-now,
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

    #better-codex-dialog [data-dialog-project] [data-project-label] {
      color: var(--bc-color-text);
      font-weight: 700;
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

    #better-codex-dialog[data-detail="true"][data-expanded="true"] .better-codex-dialog-properties {
      padding-inline: var(--bc-dialog-content-gutter);
    }

    #better-codex-dialog[data-mode="agent"] .better-codex-project-menu {
      right: auto;
      left: 0;
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
      appearance: none;
      -webkit-appearance: none;
      border: 0;
      outline: 0;
      background: var(--bc-color-control);
      box-shadow: var(--bc-inset-hairline);
    }

    #better-codex-dialog .better-codex-toggle:focus,
    #better-codex-dialog .better-codex-toggle:focus-visible {
      outline: 0;
      box-shadow: var(--bc-inset-hairline), var(--bc-focus-ring);
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
      border: 1px solid var(--color-token-border, var(--bc-color-hairline));
      border-radius: var(--bc-radius-lg);
      outline: 0;
      color: var(--color-token-foreground, var(--bc-color-text));
      background: var(--color-token-dropdown-background, var(--bc-color-surface-raised));
      box-shadow: var(--shadow-lg, var(--bc-elevation-menu));
    }

    #better-codex-update-notice :is(.better-codex-update-close, .better-codex-update-menu-toggle) {
      width: 16px;
      height: 16px;
      flex: 0 0 16px;
      margin-top: 2px;
      border-radius: var(--bc-radius-pill);
      color: var(--color-token-foreground, var(--bc-color-text));
      background: transparent;
      opacity: .5;
    }

    #better-codex-update-notice .better-codex-update-button {
      min-height: 32px;
      border-radius: var(--bc-radius-pill);
      padding-inline: 10px;
      color: var(--color-token-foreground, var(--bc-color-text));
      background: var(--color-token-button-secondary-background, var(--bc-color-control));
    }

    #better-codex-update-notice .better-codex-update-button.is-primary {
      color: var(--color-token-background-primary, var(--bc-color-on-primary));
      background: var(--color-token-foreground, var(--bc-color-primary));
    }

    .better-codex-completion-notice {
      border-color: var(--bc-color-hairline);
      border-radius: var(--bc-radius-sm);
      color: var(--bc-color-text);
      background: var(--bc-color-surface-raised);
      box-shadow: var(--bc-elevation-menu);
    }

    .better-codex-completion-notice .better-codex-completion-avatar {
      width: 24px;
      height: 24px;
      flex: 0 0 auto;
      border-radius: var(--bc-radius-sm);
      overflow: hidden;
    }

    .better-codex-completion-notice .better-codex-completion-avatar img,
    .better-codex-completion-notice .better-codex-completion-avatar svg {
      width: 100%;
      height: 100%;
      display: block;
      object-fit: cover;
    }

    .better-codex-completion-notice .better-codex-completion-status {
      flex: 0 0 auto;
      border-radius: var(--bc-radius-pill);
      padding: 2px 7px;
      color: var(--bc-color-text-muted);
      background: var(--bc-color-control);
      font-size: var(--bc-text-xs);
      font-weight: 500;
      line-height: 1.4;
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
    #better-codex-archive-dialog button:focus-visible,
    #better-codex-archive-dialog input:focus-visible,
    #better-codex-dialog button:focus-visible,
    #better-codex-agent-dialog button:focus-visible,
    #better-codex-confirm button:focus-visible,
    #better-codex-context-menu button:focus-visible,
    #better-codex-avatar-cropper button:focus-visible,
    #better-codex-avatar-cropper input:focus-visible,
    #better-codex-update-notice button:focus-visible,
    .better-codex-completion-notice button:focus-visible {
      outline: 0;
      box-shadow: var(--bc-focus-ring);
    }

    #better-codex-panel button:active,
    #better-codex-archive-dialog button:active,
    #better-codex-dialog button:active,
    #better-codex-agent-dialog button:active,
    #better-codex-confirm button:active,
    #better-codex-context-menu button:active,
    #better-codex-avatar-cropper button:active,
    #better-codex-update-notice button:active,
    .better-codex-completion-notice button:active {
      transform: scale(.96);
    }

    @media (hover: hover) {
      #better-codex-panel .better-codex-button:hover,
      #better-codex-panel .better-codex-column-icon:hover,
      #better-codex-panel .better-codex-agent-card-action:hover,
      #better-codex-dialog .better-codex-icon-button:hover,
      #better-codex-dialog .better-codex-switch-mode:hover,
      #better-codex-confirm button:hover,
      #better-codex-update-notice button:hover,
      .better-codex-completion-notice button:hover {
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

    @keyframes better-codex-inspector-enter {
      from {
        width: 0;
        min-width: 0;
        opacity: 0;
        transform: translateX(18px);
      }
      to {
        width: min(32vw, 516px);
        min-width: 430px;
        opacity: 1;
        transform: translateX(0);
      }
    }

    @keyframes better-codex-inspector-enter-mobile {
      from {
        width: 0;
        min-width: 0;
        opacity: 0;
        transform: translateX(18px);
      }
      to {
        width: 100%;
        min-width: 0;
        opacity: 1;
        transform: translateX(0);
      }
    }

    @media (max-width: 720px) {
      #better-codex-panel[data-surface="agents"] {
        grid-template-rows: auto minmax(0, 1fr);
      }

      #better-codex-panel .better-codex-toolbar {
        height: auto;
        min-height: auto;
        flex: 0 0 auto;
        align-items: stretch;
        flex-direction: column;
        padding: var(--bc-space-3);
      }

      #better-codex-panel .better-codex-actions,
      #better-codex-panel .better-codex-agent-actions {
        width: 100%;
        overflow: visible;
        padding-bottom: 0;
      }

      #better-codex-panel .better-codex-actions {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        grid-template-areas:
          "error error"
          "working search"
          "filter auto"
          "create create";
        align-items: center;
        gap: var(--bc-space-2);
      }

      #better-codex-panel .better-codex-actions > .better-codex-error { grid-area: error; max-width: 100%; margin: 0; overflow-wrap: anywhere; }
      #better-codex-panel .better-codex-actions > * { min-width: 0; }
      #better-codex-panel .better-codex-actions > #better-codex-working { grid-area: working; min-width: 0; justify-content: flex-start; }
      #better-codex-panel .better-codex-actions > .better-codex-search-wrap { grid-area: search; width: auto; min-width: 0; flex: 1 1 auto; }
      #better-codex-panel .better-codex-actions > .better-codex-filter-wrap { grid-area: filter; min-width: 0; }
      #better-codex-panel .better-codex-actions > .better-codex-auto-dispatch-wrap { grid-area: auto; min-width: 0; justify-content: flex-end; }
      #better-codex-panel .better-codex-actions > .better-codex-create-split { grid-area: create; justify-self: start; max-width: 100%; }
      #better-codex-panel .better-codex-create-primary { min-width: 0; max-width: calc(100% - 26px); overflow-wrap: anywhere; white-space: normal; }
      #better-codex-panel .better-codex-search { width: 100%; min-width: 0; flex: 1; }
      #better-codex-panel .better-codex-agent-actions { flex-wrap: wrap; }
      #better-codex-panel .better-codex-agent-actions .better-codex-button { flex: 1 1 180px; }
      #better-codex-panel .better-codex-board { padding-inline: var(--bc-space-3); }
      #better-codex-panel .better-codex-agents { padding-inline: var(--bc-space-3); }
      #better-codex-panel .better-codex-agent-directory { padding: 18px 12px 36px; }
      #better-codex-panel .better-codex-agent-shell[data-pane="detail"] .better-codex-agent-directory,
      #better-codex-panel .better-codex-agent-shell[data-pane="create"] .better-codex-agent-directory { display: none; }
      #better-codex-panel[data-surface="agents"][data-agent-pane="detail"],
      #better-codex-panel[data-surface="agents"][data-agent-pane="create"] { grid-template-columns: 0 minmax(0, 1fr); }
      #better-codex-panel[data-surface="agents"][data-agent-pane="detail"] .better-codex-toolbar,
      #better-codex-panel[data-surface="agents"][data-agent-pane="create"] .better-codex-toolbar { display: none; }
      #better-codex-panel .better-codex-agent-inspector,
      #better-codex-panel .better-codex-agent-inspector[data-resized="true"] { width: 100%; min-width: 0; }
      #better-codex-panel .better-codex-agent-inspector-resize { display: none; }
      #better-codex-panel .better-codex-agent-inspector[data-animate="enter"] {
        animation-name: better-codex-inspector-enter-mobile;
      }
      #better-codex-panel .better-codex-agent-grid { grid-template-columns: 1fr; }
      #better-codex-dialog, #better-codex-agent-dialog, #better-codex-confirm, #better-codex-auto-dispatch-help-dialog, #better-codex-avatar-picker, #better-codex-avatar-cropper { width: calc(100vw - 24px); }
      #better-codex-dialog[data-detail="true"][data-expanded="false"],
      #better-codex-dialog[data-detail="true"][data-expanded="true"] {
        width: calc(100vw - 24px);
        --bc-dialog-content-gutter: var(--bc-space-4);
      }
      #better-codex-dialog .better-codex-dialog-head {
        align-items: flex-start;
        flex-wrap: wrap;
        gap: var(--bc-space-2);
      }
      #better-codex-dialog .better-codex-dialog-breadcrumb { flex: 1 1 100%; }
      #better-codex-dialog .better-codex-dialog-head-actions {
        width: 100%;
        flex-wrap: wrap;
        justify-content: flex-end;
      }
      #better-codex-dialog .better-codex-dialog-head-actions :is(.better-codex-dialog-open-thread, .better-codex-dialog-start-now) {
        min-width: 0;
        flex: 1 1 140px;
        height: auto;
        min-height: var(--bc-control-height);
        padding-block: var(--bc-space-2);
        text-align: center;
        white-space: normal;
      }
      #better-codex-dialog .better-codex-dialog-footer {
        display: grid;
        grid-template-columns: var(--bc-control-height) minmax(0, 1fr);
        align-items: start;
        padding-block: var(--bc-space-2);
      }
      #better-codex-dialog .better-codex-dialog-footer-right {
        display: grid;
        min-width: 0;
        grid-template-columns: minmax(0, 1fr) auto;
        align-items: center;
        gap: var(--bc-space-2);
      }
      #better-codex-dialog .better-codex-switch-mode {
        width: 100%;
        min-width: 0;
        grid-column: 1 / -1;
        height: auto;
        min-height: var(--bc-control-height);
        justify-content: flex-start;
        padding-block: var(--bc-space-2);
        text-align: left;
        white-space: normal;
      }
      #better-codex-dialog .better-codex-keep-open { grid-column: 1; min-width: 0; white-space: normal; }
      #better-codex-dialog .better-codex-submit {
        grid-column: 2;
        min-width: 0;
        max-width: 100%;
        height: auto;
        min-height: var(--bc-control-height);
        padding-block: var(--bc-space-2);
        white-space: normal;
      }
      #better-codex-update-notice {
        right: 12px;
        bottom: 12px;
        left: 12px;
        width: auto;
      }
      #better-codex-update-notice .better-codex-update-layout { flex-wrap: wrap; }
      #better-codex-update-notice .better-codex-update-actions {
        width: 100%;
        justify-content: flex-end;
        margin: var(--bc-space-1) 0 0;
      }
      #better-codex-update-notice .better-codex-update-button { flex: 1 1 120px; }
      #better-codex-completion-notices { right: 12px; left: 12px; max-width: none; align-items: stretch; }
      .better-codex-completion-notice { width: 100%; max-width: none; }
    }

    @media (max-width: 350px) {
      #better-codex-panel .better-codex-actions {
        grid-template-columns: minmax(0, 1fr);
        grid-template-areas:
          "error"
          "working"
          "search"
          "filter"
          "auto"
          "create";
      }
      #better-codex-panel .better-codex-actions > .better-codex-search-wrap,
      #better-codex-panel .better-codex-actions > .better-codex-filter-wrap,
      #better-codex-panel .better-codex-actions > .better-codex-auto-dispatch-wrap,
      #better-codex-panel .better-codex-actions > .better-codex-create-split {
        width: 100%;
      }
      #better-codex-panel .better-codex-actions > .better-codex-filter-wrap,
      #better-codex-panel .better-codex-actions > .better-codex-auto-dispatch-wrap {
        justify-content: flex-start;
      }
      #better-codex-panel .better-codex-actions > .better-codex-create-split { justify-self: stretch; }
      #better-codex-panel .better-codex-create-primary { flex: 1 1 auto; }
    }

    @media (prefers-reduced-motion: reduce) {
      #better-codex-dialog,
      #better-codex-agent-dialog,
      #better-codex-confirm,
      #better-codex-avatar-picker,
      #better-codex-avatar-cropper,
      #better-codex-update-notice,
      .better-codex-completion-notice {
        animation: none;
      }

      #better-codex-panel .better-codex-agent-inspector,
      #better-codex-panel .better-codex-agent-inspector[data-animate="enter"] {
        animation: none;
        transition: none;
      }

      #better-codex-panel button,
      #better-codex-dialog button,
      #better-codex-agent-dialog button,
      #better-codex-confirm button,
      #better-codex-context-menu button,
      #better-codex-avatar-picker button,
      #better-codex-avatar-cropper button,
      #better-codex-update-notice button,
      .better-codex-completion-notice button {
        transition: none;
      }
    }
  `;
}
