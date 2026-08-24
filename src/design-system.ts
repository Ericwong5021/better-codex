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
      --bc-color-on-avatar: #ffffff;
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
    #better-codex-scheduled-dialog,
    #better-codex-attachment-dialog,
    #better-codex-agent-dialog,
    #better-codex-confirm,
    #better-codex-auto-dispatch-help-dialog,
    #better-codex-profile-dialog,
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

    #better-codex-panel .better-codex-tab-icon {
      display: none;
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

    #better-codex-panel .better-codex-project-planning-layout {
      color: var(--bc-color-text);
      font-family: var(--bc-font-ui);
      font-size: var(--bc-text-base);
    }

    #better-codex-panel .better-codex-project-dashboard-tabs {
      gap: var(--bc-space-1);
      border-radius: var(--bc-radius-md);
      background: var(--bc-color-control);
      padding: var(--bc-space-1);
    }

    #better-codex-panel .better-codex-project-dashboard-tabs button {
      min-height: var(--bc-control-height);
      border: 0;
      border-radius: var(--bc-radius-sm);
      color: var(--bc-color-text-muted);
      background: transparent;
      padding-inline: var(--bc-control-padding);
      font: inherit;
      font-size: var(--bc-text-md);
      font-weight: 500;
      transition: transform var(--bc-motion-fast) var(--bc-ease-out), background-color var(--bc-motion-fast) ease-out, color var(--bc-motion-fast) ease-out;
      touch-action: manipulation;
    }

    #better-codex-panel .better-codex-project-dashboard-tabs button[aria-current="page"] {
      color: var(--bc-color-text);
      background: var(--bc-color-surface);
      box-shadow: var(--bc-elevation-card);
    }

    #better-codex-panel .better-codex-project-planning-overview .better-codex-project-section-head button,
    #better-codex-panel .better-codex-project-planning-panel-head > button,
    #better-codex-panel .better-codex-project-planning-starters button {
      min-height: var(--bc-control-height);
      border: 0;
      border-radius: var(--bc-radius-sm);
      padding-inline: var(--bc-control-padding);
      font: inherit;
      font-size: var(--bc-text-md);
      font-weight: 500;
      transition: transform var(--bc-motion-fast) var(--bc-ease-out), background-color var(--bc-motion-fast) ease-out, color var(--bc-motion-fast) ease-out;
      touch-action: manipulation;
    }

    #better-codex-panel .better-codex-project-planning-overview .better-codex-project-section-head button {
      color: var(--bc-color-text-muted);
      background: transparent;
    }

    #better-codex-panel .better-codex-project-planning-panel-head > button {
      color: var(--bc-color-text);
      background: var(--bc-color-control);
    }

    #better-codex-panel .better-codex-project-planning-starters {
      gap: var(--bc-space-1);
    }

    #better-codex-panel .better-codex-project-planning-starters > span {
      margin-bottom: var(--bc-space-2);
      color: var(--bc-color-text-muted);
      font-size: var(--bc-text-sm);
    }

    #better-codex-panel .better-codex-project-planning-starters button {
      min-height: var(--bc-row-height);
      border: 0;
      color: var(--bc-color-text);
      background: transparent;
      padding-block: var(--bc-space-2);
      line-height: 1.45;
    }

    #better-codex-panel .better-codex-project-planning-form {
      gap: var(--bc-space-2);
      border-color: var(--bc-color-hairline);
      background: var(--bc-color-surface);
      padding: var(--bc-space-3);
    }

    #better-codex-panel .better-codex-project-planning-form textarea {
      min-height: calc(var(--bc-row-height) * 2);
      border: 0;
      border-radius: var(--bc-radius-md);
      color: var(--bc-color-text);
      background: var(--bc-color-input);
      padding: 10px 12px;
      box-shadow: var(--bc-inset-hairline);
      font: inherit;
      font-size: var(--bc-text-md);
      line-height: 1.5;
    }

    #better-codex-panel .better-codex-project-planning-form textarea::placeholder {
      color: var(--bc-color-text-faint);
    }

    #better-codex-panel .better-codex-project-planning-form textarea:focus {
      border-color: transparent;
      background: var(--bc-color-input);
      box-shadow: var(--bc-inset-hairline), var(--bc-focus-ring);
    }

    #better-codex-panel .better-codex-project-planning-form .better-codex-project-document-agent-picker .better-codex-agent-picker-trigger {
      min-height: var(--bc-control-height);
      border: 0;
      border-radius: var(--bc-radius-sm);
      color: var(--bc-color-text-muted);
      background: transparent;
      padding-inline: var(--bc-control-padding);
      box-shadow: none;
      font: inherit;
      font-size: var(--bc-text-md);
    }

    #better-codex-panel .better-codex-project-planning-form .better-codex-project-document-agent-picker .better-codex-agent-picker-trigger:focus-visible {
      outline: 0;
      background: var(--bc-color-hover);
      box-shadow: var(--bc-focus-ring);
    }

    #better-codex-panel .better-codex-project-planning-agent {
      min-height: var(--bc-control-height);
      color: var(--bc-color-text-muted);
      font-size: var(--bc-text-md);
    }

    #better-codex-panel .better-codex-project-planning-form .better-codex-submit {
      min-height: var(--bc-control-height);
      border: 0;
      border-radius: var(--bc-radius-sm);
      color: var(--bc-color-on-primary);
      background: var(--bc-color-primary);
      padding-inline: var(--bc-control-padding);
      box-shadow: none;
      font: inherit;
      font-size: var(--bc-text-md);
      font-weight: 600;
      cursor: pointer;
      transition: transform var(--bc-motion-fast) var(--bc-ease-out), background-color var(--bc-motion-fast) ease-out, opacity var(--bc-motion-fast) ease-out;
      touch-action: manipulation;
    }

    #better-codex-panel .better-codex-project-planning-form .better-codex-submit:disabled {
      cursor: not-allowed;
      opacity: .45;
    }

    #better-codex-panel .better-codex-project-planning-form output {
      color: var(--bc-color-danger);
      font-size: var(--bc-text-sm);
    }

    @media (hover: hover) {
      #better-codex-panel .better-codex-project-dashboard-tabs button:hover,
      #better-codex-panel .better-codex-project-planning-overview .better-codex-project-section-head button:hover,
      #better-codex-panel .better-codex-project-planning-panel-head > button:hover:not(:disabled),
      #better-codex-panel .better-codex-project-planning-starters button:hover,
      #better-codex-panel .better-codex-project-planning-form .better-codex-agent-picker-trigger:hover {
        color: var(--bc-color-text);
        background: var(--bc-color-hover);
      }

      #better-codex-panel .better-codex-project-planning-form .better-codex-submit:hover:not(:disabled) {
        background: color-mix(in srgb, var(--bc-color-primary) 88%, var(--bc-color-canvas));
      }
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

    #better-codex-profile-dialog {
      position: fixed;
      inset: 0;
      z-index: 145;
      width: min(420px, calc(100vw - 32px));
      max-height: calc(100vh - 32px);
      margin: auto;
      overflow: hidden;
      border: 0;
      border-radius: var(--bc-radius-lg);
      color: var(--bc-color-text);
      background: var(--bc-color-surface-raised);
      padding: 0;
      box-shadow: var(--bc-elevation-float);
    }

    #better-codex-profile-dialog::backdrop {
      background: var(--bc-color-scrim);
    }

    #better-codex-profile-dialog form {
      display: flex;
      min-height: 0;
      flex-direction: column;
    }

    #better-codex-profile-dialog header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: var(--bc-space-4);
      padding: 18px 20px 16px;
      box-shadow: inset 0 -1px 0 var(--bc-color-hairline);
    }

    #better-codex-profile-dialog h2 {
      margin: 0;
      font-size: calc(var(--bc-text-base) + 3px);
      font-weight: 650;
      letter-spacing: -.01em;
    }

    #better-codex-profile-dialog header p {
      margin: 4px 0 0;
      color: var(--bc-color-text-muted);
      font-size: var(--bc-text-sm);
      line-height: 1.5;
    }

    #better-codex-profile-dialog header > button {
      display: grid;
      width: var(--bc-control-height);
      height: var(--bc-control-height);
      flex: 0 0 var(--bc-control-height);
      border: 0;
      border-radius: var(--bc-radius-sm);
      place-items: center;
      color: var(--bc-color-text-muted);
      background: transparent;
      padding: 0;
      cursor: pointer;
    }

    #better-codex-profile-dialog header > button svg {
      width: var(--bc-icon-md);
      height: var(--bc-icon-md);
    }

    #better-codex-profile-dialog .better-codex-profile-dialog-body {
      display: grid;
      grid-template-columns: 72px minmax(0, 1fr);
      align-items: center;
      gap: 18px;
      padding: 24px 20px;
    }

    #better-codex-profile-dialog .better-codex-profile-dialog-avatar-button {
      position: relative;
      width: 72px;
      height: 72px;
      border: 0;
      border-radius: 999px;
      background: transparent;
      padding: 0;
      cursor: pointer;
    }

    #better-codex-profile-dialog .better-codex-profile-dialog-avatar {
      display: grid;
      width: 72px;
      height: 72px;
      place-items: center;
      overflow: hidden;
      border-radius: 999px;
      color: var(--bc-color-on-avatar);
      font-size: calc(var(--bc-text-base) + 4px);
      font-weight: 700;
      box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--bc-color-on-avatar) 14%, transparent);
    }

    #better-codex-profile-dialog .better-codex-profile-dialog-avatar img {
      display: block;
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    #better-codex-profile-dialog .better-codex-profile-dialog-avatar-button > span:last-child {
      position: absolute;
      right: -2px;
      bottom: -2px;
      display: grid;
      width: 26px;
      height: 26px;
      place-items: center;
      border: 3px solid var(--bc-color-surface-raised);
      border-radius: 999px;
      color: var(--bc-color-text);
      background: var(--bc-color-control);
      box-shadow: var(--bc-elevation-card);
    }

    #better-codex-profile-dialog .better-codex-profile-dialog-avatar-button > span:last-child svg {
      width: 12px;
      height: 12px;
    }

    #better-codex-profile-dialog label {
      display: grid;
      gap: 7px;
      color: var(--bc-color-text-muted);
      font-size: var(--bc-text-sm);
      font-weight: 600;
    }

    #better-codex-profile-dialog fieldset {
      display: grid;
      grid-column: 2;
      gap: 9px;
      min-width: 0;
      margin: 0;
      border: 0;
      padding: 0;
    }

    #better-codex-profile-dialog legend {
      color: var(--bc-color-text-muted);
      padding: 0;
      font-size: var(--bc-text-sm);
      font-weight: 600;
    }

    #better-codex-profile-dialog .better-codex-profile-avatar-colors {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    #better-codex-profile-dialog .better-codex-profile-avatar-color {
      display: grid;
      width: 28px;
      height: 28px;
      flex: 0 0 28px;
      border: 0;
      border-radius: 999px;
      place-items: center;
      color: #fff;
      background: var(--profile-avatar-color);
      padding: 0;
      cursor: pointer;
      box-shadow: 0 0 0 1px color-mix(in srgb, var(--profile-avatar-color) 76%, var(--bc-color-text));
      transition: box-shadow var(--bc-motion-fast) ease-out, transform var(--bc-motion-fast) var(--bc-ease-out);
    }

    #better-codex-profile-dialog .better-codex-profile-avatar-color svg {
      width: 14px;
      height: 14px;
      opacity: 0;
      stroke-width: 3;
    }

    #better-codex-profile-dialog .better-codex-profile-avatar-color.is-selected {
      box-shadow: 0 0 0 2px var(--bc-color-surface-raised), 0 0 0 4px var(--profile-avatar-color);
    }

    #better-codex-profile-dialog .better-codex-profile-avatar-color.is-selected svg {
      opacity: 1;
    }

    #better-codex-profile-dialog input {
      box-sizing: border-box;
      width: 100%;
      height: calc(var(--bc-control-height) + 6px);
      border: 0;
      border-radius: var(--bc-radius-sm);
      color: var(--bc-color-text);
      background: var(--bc-color-input);
      padding: 0 var(--bc-space-3);
      font: inherit;
      font-size: var(--bc-text-md);
      font-weight: 500;
      outline: 0;
      box-shadow: var(--bc-inset-hairline);
    }

    #better-codex-profile-dialog output {
      grid-column: 1 / -1;
      color: var(--bc-color-danger);
      font-size: var(--bc-text-sm);
      line-height: 1.5;
    }

    #better-codex-profile-dialog output[data-tone="warning"] {
      color: var(--bc-warning);
    }

    #better-codex-profile-dialog output[data-tone="info"] {
      color: var(--bc-info);
    }

    #better-codex-profile-dialog output[hidden] {
      display: none;
    }

    #better-codex-profile-dialog footer {
      display: flex;
      justify-content: flex-end;
      gap: var(--bc-space-2);
      padding: 14px 20px 18px;
      box-shadow: inset 0 1px 0 var(--bc-color-hairline);
    }

    #better-codex-profile-dialog footer button {
      min-height: var(--bc-control-height);
      border: 0;
      border-radius: var(--bc-radius-sm);
      color: var(--bc-color-text);
      background: var(--bc-color-control);
      padding: 0 var(--bc-control-padding);
      font: inherit;
      font-size: var(--bc-text-sm);
      font-weight: 600;
      cursor: pointer;
    }

    #better-codex-profile-dialog footer button.is-primary {
      color: var(--bc-color-on-primary);
      background: var(--bc-color-primary);
    }

    #better-codex-profile-dialog button:focus-visible,
    #better-codex-profile-dialog input:focus {
      outline: 0;
      box-shadow: var(--bc-focus-ring);
    }

    #better-codex-profile-dialog button:active {
      transform: scale(.96);
    }

    #better-codex-profile-dialog button:disabled {
      cursor: wait;
      opacity: .56;
    }

    @media (hover: hover) {
      #better-codex-profile-dialog header > button:hover,
      #better-codex-profile-dialog footer button:hover,
      #better-codex-profile-dialog .better-codex-profile-dialog-avatar-button:hover > span:last-child {
        background: var(--bc-color-hover);
      }

      #better-codex-profile-dialog footer button.is-primary:hover {
        background: color-mix(in oklch, var(--bc-color-primary) 88%, var(--bc-color-canvas));
      }

      #better-codex-profile-dialog .better-codex-profile-avatar-color:hover {
        transform: scale(1.08);
      }
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

    #better-codex-auto-dispatch-help-dialog [data-help-page="remote"].is-active {
      max-width: 540px;
      margin-inline: auto;
      justify-content: center;
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-remote-heading,
    #better-codex-auto-dispatch-help-dialog .better-codex-remote-status-head,
    #better-codex-auto-dispatch-help-dialog .better-codex-remote-actions,
    #better-codex-auto-dispatch-help-dialog .better-codex-remote-url {
      display: flex;
      align-items: center;
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-remote-refresh[hidden],
    #better-codex-auto-dispatch-help-dialog .better-codex-remote-upgrade[hidden],
    #better-codex-auto-dispatch-help-dialog .better-codex-remote-update[hidden],
    #better-codex-auto-dispatch-help-dialog .better-codex-remote-setup[hidden],
    #better-codex-auto-dispatch-help-dialog .better-codex-remote-status[hidden],
    #better-codex-auto-dispatch-help-dialog .better-codex-remote-sessions[hidden],
    #better-codex-auto-dispatch-help-dialog .better-codex-remote-sessions-panel[hidden],
    #better-codex-auto-dispatch-help-dialog .better-codex-remote-sessions-count[hidden] {
      display: none;
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-help-page-heading.better-codex-remote-heading {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 16px;
      margin-bottom: 14px;
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-remote-step p {
      margin: 3px 0 0;
      color: var(--bc-color-text-muted);
      font-size: var(--bc-text-body);
      line-height: 1.4;
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-remote-refresh,
    #better-codex-auto-dispatch-help-dialog .better-codex-remote-install,
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
    #better-codex-auto-dispatch-help-dialog .better-codex-remote-install svg,
    #better-codex-auto-dispatch-help-dialog .better-codex-remote-url button svg,
    #better-codex-auto-dispatch-help-dialog .better-codex-remote-actions svg {
      width: 15px;
      height: 15px;
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-remote-refresh[data-loading="true"] svg {
      animation: better-codex-spin .85s linear infinite;
    }

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

    #better-codex-auto-dispatch-help-dialog .better-codex-remote-status-icon svg {
      width: 17px;
      height: 17px;
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-remote-setup {
      display: grid;
      width: 100%;
      max-width: 540px;
      margin-inline: auto;
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-remote-step {
      display: flex;
      min-height: 64px;
      align-items: center;
      justify-content: space-between;
      gap: 18px;
      box-shadow: inset 0 -1px 0 var(--bc-color-hairline);
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-remote-step > div:first-child {
      min-width: 0;
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-remote-step h3 {
      margin: 0;
      font-size: var(--bc-text-lg);
      font-weight: 600;
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-remote-url {
      width: 300px;
      min-width: 0;
      flex: 0 0 300px;
      gap: 7px;
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-remote-install,
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
      width: 100%;
      max-width: 540px;
      box-sizing: border-box;
      margin: 0 auto;
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

    #better-codex-auto-dispatch-help-dialog .better-codex-remote-status dl {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 6px;
      margin: 12px 0 0;
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-remote-status dl[hidden],
    #better-codex-auto-dispatch-help-dialog .better-codex-remote-actions[hidden] {
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

    #better-codex-auto-dispatch-help-dialog .better-codex-remote-version-label {
      display: flex;
      min-height: 28px;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      margin-top: -3px;
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-remote-upgrade {
      display: inline-flex;
      min-height: 26px;
      flex: 0 0 auto;
      align-items: center;
      justify-content: center;
      gap: 5px;
      border: 0;
      border-radius: var(--bc-radius-pill);
      color: var(--bc-color-text);
      background: var(--bc-color-control);
      padding: 0 8px;
      font: inherit;
      font-size: var(--bc-text-caption);
      font-weight: 650;
      white-space: nowrap;
      cursor: pointer;
      transition: background var(--bc-motion-fast) var(--bc-ease-out), transform var(--bc-motion-fast) var(--bc-ease-out);
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-remote-upgrade svg {
      width: 13px;
      height: 13px;
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-remote-upgrade[data-loading="true"] svg {
      animation: better-codex-spin .85s linear infinite;
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

    #better-codex-auto-dispatch-help-dialog .better-codex-remote-status dl > .better-codex-remote-update {
      grid-column: 1 / -1;
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-remote-update dd {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-remote-update-track {
      height: 5px;
      margin-top: 8px;
      overflow: hidden;
      border-radius: var(--bc-radius-pill);
      background: var(--bc-color-pressed);
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-remote-update-track i {
      display: block;
      width: 0;
      height: 100%;
      border-radius: inherit;
      background: var(--bc-success);
      transition: width var(--bc-motion-normal) var(--bc-ease-out);
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-remote-update[data-status="error"] .better-codex-remote-update-track i {
      background: var(--bc-color-danger);
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-remote-actions {
      gap: 7px;
      margin-top: 9px;
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-remote-actions a {
      color: var(--bc-color-on-primary);
      background: var(--bc-color-primary);
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-remote-sessions {
      width: 100%;
      max-width: 540px;
      box-sizing: border-box;
      margin: 10px auto 0;
      overflow: hidden;
      border-radius: var(--bc-radius-lg);
      background: var(--bc-color-control);
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-remote-sessions-toggle {
      display: flex;
      width: 100%;
      min-height: 62px;
      align-items: center;
      gap: 10px;
      border: 0;
      border-radius: inherit;
      color: var(--bc-color-text);
      background: transparent;
      padding: 10px 14px;
      font: inherit;
      text-align: left;
      cursor: pointer;
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-remote-sessions-icon,
    #better-codex-auto-dispatch-help-dialog .better-codex-remote-session-icon {
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

    #better-codex-auto-dispatch-help-dialog .better-codex-remote-sessions-icon svg,
    #better-codex-auto-dispatch-help-dialog .better-codex-remote-session-icon svg {
      width: 17px;
      height: 17px;
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-remote-sessions-heading {
      display: block;
      min-width: 0;
      flex: 1;
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-remote-sessions-heading strong,
    #better-codex-auto-dispatch-help-dialog .better-codex-remote-sessions-heading small {
      display: block;
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-remote-sessions-heading strong {
      font-size: var(--bc-text-body);
      font-weight: 650;
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-remote-sessions-heading small {
      overflow: hidden;
      margin-top: 3px;
      color: var(--bc-color-text-muted);
      font-size: var(--bc-text-caption);
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-remote-sessions-count {
      flex: 0 0 auto;
      color: var(--bc-color-text-muted);
      font-size: var(--bc-text-caption);
      font-weight: 600;
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-remote-sessions-chevron {
      display: inline-flex;
      width: 18px;
      height: 18px;
      flex: 0 0 18px;
      color: var(--bc-color-text-muted);
      transition: transform var(--bc-motion-fast) var(--bc-ease-out);
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-remote-sessions-chevron svg {
      width: 18px;
      height: 18px;
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-remote-sessions-toggle[aria-expanded="true"] .better-codex-remote-sessions-chevron {
      transform: rotate(180deg);
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-remote-sessions-panel {
      box-shadow: inset 0 1px 0 var(--bc-color-hairline);
      padding: 0 14px;
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-remote-sessions-list > p {
      margin: 0;
      padding: 14px 0;
      color: var(--bc-color-text-muted);
      font-size: var(--bc-text-sm);
      text-align: center;
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-remote-sessions-list article {
      display: grid;
      min-height: 62px;
      grid-template-columns: 34px minmax(0, 1fr) auto;
      align-items: center;
      gap: 10px;
      padding: 9px 0;
      box-shadow: inset 0 -1px 0 var(--bc-color-hairline);
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-remote-sessions-list article:last-child {
      box-shadow: none;
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-remote-sessions-list article > div {
      min-width: 0;
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-remote-sessions-list article strong,
    #better-codex-auto-dispatch-help-dialog .better-codex-remote-sessions-list article small {
      display: block;
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-remote-sessions-list article strong {
      overflow: hidden;
      font-size: var(--bc-text-sm);
      font-weight: 650;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-remote-sessions-list article small {
      overflow: hidden;
      margin-top: 4px;
      color: var(--bc-color-text-muted);
      font-size: var(--bc-text-caption);
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-remote-sessions-list article button {
      display: inline-flex;
      min-height: 34px;
      align-items: center;
      gap: 6px;
      border: 0;
      border-radius: var(--bc-radius-sm);
      color: var(--bc-color-danger);
      background: var(--bc-color-danger-soft);
      padding: 0 10px;
      font: inherit;
      font-size: var(--bc-text-caption);
      font-weight: 650;
      cursor: pointer;
      transition: background var(--bc-motion-fast) var(--bc-ease-out), transform var(--bc-motion-fast) var(--bc-ease-out);
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-remote-sessions-list article button svg {
      width: 14px;
      height: 14px;
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-remote-refresh:disabled,
    #better-codex-auto-dispatch-help-dialog .better-codex-remote-upgrade:disabled,
    #better-codex-auto-dispatch-help-dialog .better-codex-remote-url button:disabled,
    #better-codex-auto-dispatch-help-dialog .better-codex-remote-actions button:disabled {
      color: var(--bc-color-text-faint);
      background: var(--bc-color-pressed);
      cursor: default;
    }

    @media (hover: hover) {
      #better-codex-auto-dispatch-help-dialog .better-codex-remote-refresh:hover:not(:disabled),
      #better-codex-auto-dispatch-help-dialog .better-codex-remote-upgrade:hover:not(:disabled),
      #better-codex-auto-dispatch-help-dialog .better-codex-remote-install:hover:not(:disabled),
      #better-codex-auto-dispatch-help-dialog .better-codex-remote-url button:hover:not(:disabled),
      #better-codex-auto-dispatch-help-dialog .better-codex-remote-actions a:hover,
      #better-codex-auto-dispatch-help-dialog .better-codex-remote-actions button:hover:not(:disabled) {
        background: var(--bc-color-hover);
      }

      #better-codex-auto-dispatch-help-dialog .better-codex-remote-sessions-toggle:hover {
        background: var(--bc-color-hover);
      }

      #better-codex-auto-dispatch-help-dialog .better-codex-remote-sessions-list article button:hover:not(:disabled) {
        background: color-mix(in oklch, var(--bc-color-danger) 18%, var(--bc-color-control));
      }
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-remote-refresh:focus-visible,
    #better-codex-auto-dispatch-help-dialog .better-codex-remote-upgrade:focus-visible,
    #better-codex-auto-dispatch-help-dialog .better-codex-remote-install:focus-visible,
    #better-codex-auto-dispatch-help-dialog .better-codex-remote-url button:focus-visible,
    #better-codex-auto-dispatch-help-dialog .better-codex-remote-actions a:focus-visible,
    #better-codex-auto-dispatch-help-dialog .better-codex-remote-actions button:focus-visible {
      outline: 0;
      box-shadow: var(--bc-focus-ring);
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-remote-sessions-toggle:focus-visible,
    #better-codex-auto-dispatch-help-dialog .better-codex-remote-sessions-list article button:focus-visible {
      outline: 0;
      box-shadow: inset var(--bc-focus-ring);
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-remote-install:active:not(:disabled),
    #better-codex-auto-dispatch-help-dialog .better-codex-remote-upgrade:active:not(:disabled),
    #better-codex-auto-dispatch-help-dialog .better-codex-remote-url button:active:not(:disabled),
    #better-codex-auto-dispatch-help-dialog .better-codex-remote-actions a:active,
    #better-codex-auto-dispatch-help-dialog .better-codex-remote-actions button:active:not(:disabled) {
      transform: scale(.97);
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-remote-sessions-list article button:active:not(:disabled) {
      transform: scale(.97);
    }

    #better-codex-auto-dispatch-help-dialog [data-help-page="settings"] .better-codex-help-setting-group {
      margin-top: 10px;
    }

    #better-codex-auto-dispatch-help-dialog [data-help-page="settings"] .better-codex-help-setting-group:first-child {
      margin-top: 0;
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

    #better-codex-auto-dispatch-help-dialog .better-codex-language-switch,
    #better-codex-auto-dispatch-help-dialog .better-codex-send-mode-switch {
      --bc-switch-count: 3;
      position: relative;
      display: grid;
      width: 240px;
      flex: 0 0 240px;
      grid-template-columns: repeat(var(--bc-switch-count), minmax(0, 1fr));
      border-radius: 10px;
      background: var(--bc-color-control);
      padding: 3px;
      isolation: isolate;
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-send-mode-switch {
      --bc-switch-count: 2;
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-language-switch::before,
    #better-codex-auto-dispatch-help-dialog .better-codex-send-mode-switch::before {
      position: absolute;
      z-index: -1;
      top: 3px;
      left: 3px;
      width: calc((100% - 6px) / var(--bc-switch-count));
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

    #better-codex-auto-dispatch-help-dialog .better-codex-send-mode-switch[data-send-mode-value="enter"]::before {
      transform: translateX(100%);
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-language-switch button,
    #better-codex-auto-dispatch-help-dialog .better-codex-send-mode-switch button {
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

    #better-codex-auto-dispatch-help-dialog .better-codex-language-switch button[aria-checked="true"],
    #better-codex-auto-dispatch-help-dialog .better-codex-send-mode-switch button[aria-checked="true"] {
      color: var(--bc-color-text);
      font-weight: 600;
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-language-switch button:focus-visible,
    #better-codex-auto-dispatch-help-dialog .better-codex-send-mode-switch button:focus-visible {
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

    #better-codex-auto-dispatch-help-dialog .better-codex-help-error[data-tone="warning"] {
      color: var(--bc-warning);
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-help-error[data-tone="info"] {
      color: var(--bc-info);
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

      #better-codex-auto-dispatch-help-dialog .better-codex-remote-heading {
        align-items: flex-start;
      }

      #better-codex-auto-dispatch-help-dialog .better-codex-remote-refresh span {
        display: none;
      }

      #better-codex-auto-dispatch-help-dialog .better-codex-remote-step {
        align-items: stretch;
        flex-direction: column;
        gap: 10px;
        padding-block: 10px;
      }

      #better-codex-auto-dispatch-help-dialog .better-codex-remote-install {
        width: 100%;
      }

      #better-codex-auto-dispatch-help-dialog .better-codex-remote-url {
        width: 100%;
        flex-basis: auto;
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

      #better-codex-auto-dispatch-help-dialog .better-codex-remote-sessions-list article {
        grid-template-columns: 34px minmax(0, 1fr);
      }

      #better-codex-auto-dispatch-help-dialog .better-codex-remote-sessions-list article button {
        grid-column: 1 / -1;
        justify-content: center;
      }

      #better-codex-auto-dispatch-help-dialog .better-codex-help-page.is-active {
        justify-content: flex-start;
      }

      #better-codex-auto-dispatch-help-dialog .better-codex-help-github-row {
        flex-wrap: wrap;
      }

      #better-codex-auto-dispatch-help-dialog .better-codex-help-setting-row.is-language,
      #better-codex-auto-dispatch-help-dialog .better-codex-help-setting-row.is-send-mode,
      #better-codex-auto-dispatch-help-dialog .better-codex-help-setting-row.is-notification,
      #better-codex-auto-dispatch-help-dialog .better-codex-help-setting-row.is-model,
      #better-codex-auto-dispatch-help-dialog .better-codex-help-setting-row.is-shortcut {
        align-items: stretch;
        flex-direction: column;
        padding-block: 10px;
      }

      #better-codex-auto-dispatch-help-dialog .better-codex-language-switch,
      #better-codex-auto-dispatch-help-dialog .better-codex-send-mode-switch {
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
      transition: box-shadow var(--bc-motion-fast) var(--bc-ease-out);
    }

    #better-codex-panel .better-codex-board.is-session-drop-target {
      border-radius: var(--bc-radius-lg);
      box-shadow: inset 0 0 0 2px color-mix(in oklch, var(--bc-color-focus) 46%, transparent);
    }

    #better-codex-panel[data-host="web"] .better-codex-board {
      padding-bottom: var(--bc-space-2);
      scrollbar-width: none;
    }

    #better-codex-panel[data-host="web"] .better-codex-board::-webkit-scrollbar {
      display: none;
    }

    #better-codex-panel .better-codex-board-scroll {
      box-sizing: border-box;
      display: flex;
      min-height: 32px;
      flex: 0 0 32px;
      align-items: center;
      gap: var(--bc-space-2);
      padding: 0 var(--bc-space-4) var(--bc-space-2);
      color: var(--bc-color-text-faint);
      background: var(--bc-color-canvas);
    }

    #better-codex-panel .better-codex-board-scroll[hidden] {
      display: none;
    }

    #better-codex-panel .better-codex-board-scroll > span {
      display: inline-flex;
      width: var(--bc-icon-sm);
      height: var(--bc-icon-sm);
      flex: 0 0 var(--bc-icon-sm);
      align-items: center;
      justify-content: center;
    }

    #better-codex-panel .better-codex-board-scroll > span.is-start {
      transform: rotate(180deg);
    }

    #better-codex-panel .better-codex-board-scroll svg {
      width: 100%;
      height: 100%;
    }

    #better-codex-panel .better-codex-board-scroll input {
      width: 100%;
      min-width: 0;
      height: 22px;
      margin: 0;
      appearance: none;
      -webkit-appearance: none;
      background: transparent;
      cursor: ew-resize;
    }

    #better-codex-panel .better-codex-board-scroll input::-webkit-slider-runnable-track {
      height: 5px;
      border-radius: 999px;
      background: var(--bc-color-control);
      box-shadow: inset 0 0 0 1px var(--bc-color-hairline);
    }

    #better-codex-panel .better-codex-board-scroll input::-webkit-slider-thumb {
      width: 48px;
      height: 13px;
      margin-top: -4px;
      appearance: none;
      -webkit-appearance: none;
      border: 1px solid var(--bc-color-hairline);
      border-radius: 999px;
      background: var(--bc-color-surface-raised);
      box-shadow: 0 1px 3px rgb(0 0 0 / .16);
    }

    #better-codex-panel .better-codex-board-scroll input::-moz-range-track {
      height: 5px;
      border: 0;
      border-radius: 999px;
      background: var(--bc-color-control);
      box-shadow: inset 0 0 0 1px var(--bc-color-hairline);
    }

    #better-codex-panel .better-codex-board-scroll input::-moz-range-thumb {
      width: 48px;
      height: 13px;
      border: 1px solid var(--bc-color-hairline);
      border-radius: 999px;
      background: var(--bc-color-surface-raised);
      box-shadow: 0 1px 3px rgb(0 0 0 / .16);
    }

    #better-codex-dialog .better-codex-conversation-empty h3 {
      margin: 0;
      color: var(--bc-foreground);
      font-size: var(--bc-text-lg);
      font-weight: 650;
    }

    #better-codex-dialog .better-codex-conversation-empty p {
      margin: var(--bc-space-2) 0 0;
      color: var(--bc-muted);
      font-size: var(--bc-text-md);
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

    #better-codex-panel .better-codex-card.is-session-imported {
      border-color: color-mix(in oklch, var(--bc-color-focus) 68%, var(--bc-color-hairline));
      box-shadow: var(--bc-card-shadow), 0 0 0 2px color-mix(in oklch, var(--bc-color-focus) 30%, transparent);
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

    #better-codex-dialog .better-codex-label-picker,
    #better-codex-dialog .better-codex-label-menu {
      display: contents;
    }

    #better-codex-dialog .better-codex-label-trigger,
    #better-codex-dialog .better-codex-label-options {
      display: none;
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
      display: inline-flex;
      flex: 0 0 auto;
      align-items: center;
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
      display: flex;
      min-width: 0;
      align-items: center;
      gap: 3px;
      color: var(--bc-color-text-faint);
      font-size: var(--bc-text-caption);
    }

    #better-codex-panel .better-codex-agent-row-copy em > span {
      display: inline-flex;
      min-width: 0;
      align-items: center;
      gap: 3px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    #better-codex-panel .better-codex-agent-row-copy em > span:nth-child(2) {
      flex: 0 0 auto;
    }

    #better-codex-panel .better-codex-fast-mark,
    #better-codex-dialog .better-codex-fast-mark,
    #better-codex-context-menu .better-codex-fast-mark {
      display: inline-flex;
      width: 12px;
      height: 12px;
      flex: 0 0 auto;
      align-items: center;
      justify-content: center;
      color: #111;
      line-height: 1;
    }

    #better-codex-panel .better-codex-fast-mark svg,
    #better-codex-dialog .better-codex-fast-mark svg,
    #better-codex-context-menu .better-codex-fast-mark svg {
      width: 11px;
      height: 11px;
      fill: currentColor;
      stroke: currentColor;
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

    #better-codex-panel .better-codex-agent-inspector[data-agent-window="create"] {
      position: fixed;
      inset: 0;
      box-sizing: border-box;
      width: min(760px, calc(100vw - 48px));
      min-width: 0;
      max-width: none;
      height: min(84vh, 820px);
      max-height: calc(100vh - 48px);
      margin: auto;
      overflow: hidden;
      border: 0;
      border-radius: var(--bc-radius-xl);
      color: var(--bc-color-text);
      background: var(--bc-color-surface-raised);
      padding: 0;
      box-shadow: var(--bc-elevation-float);
      transform: none;
      transition: none;
    }

    #better-codex-panel .better-codex-agent-inspector[data-agent-window="create"]::backdrop {
      background: var(--bc-color-scrim);
      backdrop-filter: none;
    }

    #better-codex-panel .better-codex-agent-inspector[data-agent-window="create"][data-fullscreen="true"] {
      inset: var(--bc-agent-fullscreen-top, 0) auto auto var(--bc-agent-fullscreen-left, 0);
      width: var(--bc-agent-fullscreen-width, 100vw);
      height: var(--bc-agent-fullscreen-height, 100dvh);
      max-height: none;
      margin: 0;
      border-radius: 0;
      box-shadow: none;
    }

    @media (min-width: 721px) {
      #better-codex-panel .better-codex-agent-inspector[data-agent-window="create"][data-fullscreen="true"]::backdrop {
        background: transparent;
      }
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

    #better-codex-panel .better-codex-agent-inspector[data-agent-window="create"][data-animate="enter"] {
      animation-name: better-codex-surface-enter;
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

    #better-codex-panel .better-codex-agent-inspector-head-leading,
    #better-codex-panel .better-codex-agent-inspector-head-actions,
    #better-codex-panel .better-codex-agent-window-title {
      display: flex;
      min-width: 0;
      align-items: center;
    }

    #better-codex-panel .better-codex-agent-inspector-head-leading {
      flex: 1 1 auto;
      gap: var(--bc-space-2);
    }

    #better-codex-panel .better-codex-agent-inspector-head-actions {
      flex: 0 0 auto;
      gap: var(--bc-space-2);
    }

    #better-codex-panel .better-codex-agent-window-title {
      overflow: hidden;
      gap: var(--bc-space-2);
      white-space: nowrap;
    }

    #better-codex-panel .better-codex-agent-window-title span,
    #better-codex-panel .better-codex-agent-window-title strong {
      overflow: hidden;
      text-overflow: ellipsis;
    }

    #better-codex-panel .better-codex-agent-window-title strong {
      color: var(--bc-color-text);
      font-weight: 600;
    }

    #better-codex-panel .better-codex-agent-window-back {
      display: none;
      width: var(--bc-control-height);
      height: var(--bc-control-height);
      flex: 0 0 var(--bc-control-height);
      align-items: center;
      justify-content: center;
      border: 0;
      border-radius: var(--bc-radius-sm);
      color: var(--bc-color-text-muted);
      background: transparent;
      padding: 0;
      cursor: pointer;
    }

    #better-codex-panel .better-codex-agent-window-back:hover {
      color: var(--bc-color-text);
      background: var(--bc-color-hover);
    }

    #better-codex-panel .better-codex-agent-window-back svg {
      width: var(--bc-icon-md);
      height: var(--bc-icon-md);
    }

    #better-codex-panel .better-codex-agent-inspector[data-agent-window="create"][data-fullscreen="true"] .better-codex-agent-window-back {
      display: inline-flex;
    }

    #better-codex-panel .better-codex-agent-inspector-scroll {
      min-height: 0;
      flex: 1;
      overflow-y: auto;
      padding: 0 22px 28px;
    }

    #better-codex-panel .better-codex-agent-inspector[data-agent-window="create"] .better-codex-agent-inspector-scroll {
      box-sizing: border-box;
      width: min(720px, 100%);
      margin-inline: auto;
      padding: var(--bc-space-4) var(--bc-space-6) var(--bc-space-7);
    }

    #better-codex-panel .better-codex-agent-inspector[data-agent-window="create"] .better-codex-agent-inspector-footer {
      padding-inline: max(var(--bc-space-6), calc((100% - 720px) / 2 + var(--bc-space-6)));
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

    #better-codex-panel .better-codex-agent-fast-setting > span:first-child {
      display: flex;
      min-width: 0;
      flex-direction: column;
      gap: 2px;
    }

    #better-codex-panel .better-codex-agent-fast-setting strong {
      font-size: var(--bc-text-md);
      font-weight: 450;
    }

    #better-codex-panel .better-codex-agent-fast-setting small {
      color: var(--bc-color-text-faint);
      font-size: var(--bc-text-caption);
      line-height: 1.35;
    }

    #better-codex-panel .better-codex-agent-fast-setting.is-disabled {
      opacity: .46;
    }

    #better-codex-panel .better-codex-agent-switch {
      position: relative;
      display: inline-flex;
      width: 34px;
      height: 20px;
      flex: 0 0 auto;
    }

    #better-codex-panel .better-codex-agent-switch input {
      position: absolute;
      inset: 0;
      z-index: 1;
      margin: 0;
      opacity: 0;
      cursor: pointer;
    }

    #better-codex-panel .better-codex-agent-switch i {
      position: relative;
      display: block;
      width: 34px;
      height: 20px;
      border-radius: var(--bc-radius-pill);
      background: var(--bc-color-control);
      box-shadow: var(--bc-inset-hairline);
      transition: background-color var(--bc-motion-fast) ease-out;
    }

    #better-codex-panel .better-codex-agent-switch i::after {
      position: absolute;
      top: 3px;
      left: 3px;
      width: 14px;
      height: 14px;
      border-radius: 50%;
      background: var(--bc-color-surface-raised);
      box-shadow: var(--bc-elevation-sm);
      content: "";
      transition: transform var(--bc-motion-fast) var(--bc-ease-out);
    }

    #better-codex-panel .better-codex-agent-switch input:checked + i {
      background: #111;
    }

    #better-codex-panel .better-codex-agent-switch input:checked + i::after {
      transform: translateX(14px);
    }

    #better-codex-panel .better-codex-agent-switch input:focus-visible + i {
      box-shadow: var(--bc-focus-ring);
    }

    #better-codex-panel .better-codex-agent-switch input:disabled {
      cursor: not-allowed;
    }

    #better-codex-context-menu .better-codex-context-tag .better-codex-fast-mark,
    #better-codex-dialog .better-codex-dialog-select-tag .better-codex-fast-mark {
      margin-left: 2px;
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

    #better-codex-panel .better-codex-agent-picker-trigger .better-codex-fast-mark {
      display: none;
    }

    #better-codex-panel form:has(input[name="fast"]:checked) [data-agent-picker="model"] .better-codex-fast-mark {
      display: inline-flex;
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

    #better-codex-panel .better-codex-agent-inspector-error[data-tone="warning"] {
      color: var(--bc-warning);
    }

    #better-codex-panel .better-codex-agent-inspector-error[data-tone="info"] {
      color: var(--bc-info);
    }

    #better-codex-panel .better-codex-agent-inspector-status {
      display: block;
      min-height: 18px;
      color: var(--bc-color-text-muted);
      font-size: var(--bc-text-sm);
    }

    #better-codex-panel .better-codex-agent-inspector-status[hidden] {
      display: none;
    }

    #better-codex-panel .better-codex-agent-inspector-status[data-state="saved"] {
      color: var(--bc-success);
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

    #better-codex-dialog .better-codex-dialog-head-leading {
      display: flex;
      min-width: 0;
      flex: 1 1 auto;
      align-items: center;
      gap: var(--bc-space-2);
    }

    #better-codex-dialog .better-codex-dialog-back {
      display: none;
      width: var(--bc-control-height);
      height: var(--bc-control-height);
      flex: 0 0 var(--bc-control-height);
      align-items: center;
      justify-content: center;
      border: 0;
      border-radius: var(--bc-radius-sm);
      color: var(--bc-color-text-muted);
      background: transparent;
      padding: 0;
      cursor: pointer;
    }

    #better-codex-dialog .better-codex-dialog-back:hover {
      color: var(--bc-color-text);
      background: var(--bc-color-hover);
    }

    #better-codex-dialog .better-codex-dialog-back svg {
      width: var(--bc-icon-md);
      height: var(--bc-icon-md);
    }

    #better-codex-dialog .better-codex-dialog-route-root,
    #better-codex-dialog .better-codex-dialog-route-root-separator {
      display: none;
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
      --bc-dialog-content-gutter: calc(var(--bc-text-base) * 1.714286);
      width: min(1200px, calc(100vw - 48px));
      height: fit-content;
      max-height: calc(100vh - 48px);
    }

    #better-codex-dialog[data-detail="true"][data-expanded="false"]:has(.better-codex-conversation) {
      height: min(76vh, 780px);
    }

    #better-codex-dialog[data-detail="true"][data-expanded="true"] {
      --bc-dialog-content-gutter: calc(var(--bc-text-base) * 1.714286);
      inset: var(--bc-dialog-fullscreen-top, 0) auto auto var(--bc-dialog-fullscreen-left, 0);
      width: var(--bc-dialog-fullscreen-width, 100vw);
      max-width: none;
      height: var(--bc-dialog-fullscreen-height, 100dvh);
      max-height: none;
      margin: 0;
      border: 0;
      border-radius: 0;
      box-shadow: none;
    }

    #better-codex-dialog[data-detail="true"][data-expanded="true"]:has(.better-codex-conversation) {
      height: var(--bc-dialog-fullscreen-height, 100dvh);
    }

    #better-codex-dialog[data-detail="true"][data-expanded="true"] .better-codex-dialog-back,
    #better-codex-dialog[data-detail="true"][data-expanded="true"] .better-codex-dialog-route-root,
    #better-codex-dialog[data-detail="true"][data-expanded="true"] .better-codex-dialog-route-root-separator {
      display: inline-flex;
    }

    @media (min-width: 721px) {
      #better-codex-dialog[data-detail="true"][data-expanded="true"]::backdrop {
        background: transparent;
        backdrop-filter: none;
      }
    }

    #better-codex-dialog[data-detail="true"] .better-codex-dialog-head,
    #better-codex-dialog[data-detail="true"] .better-codex-agent-picker {
      padding-inline: var(--bc-dialog-content-gutter);
    }

    #better-codex-dialog[data-detail="true"] .better-codex-manual-title {
      width: calc(100% - (var(--bc-dialog-content-gutter) * 2));
      margin-inline: var(--bc-dialog-content-gutter);
      padding-inline: var(--bc-space-3);
    }

    #better-codex-dialog[data-detail="true"] .better-codex-description-field {
      margin: 0 var(--bc-dialog-content-gutter) var(--bc-space-2);
      background: var(--bc-color-input);
      padding: var(--bc-space-1) var(--bc-space-3) var(--bc-space-2);
      box-shadow: var(--bc-inset-hairline);
    }

    #better-codex-dialog[data-detail="true"] .better-codex-description-field .better-codex-dialog-editor {
      height: calc((var(--bc-text-md) * 1.55 * 2) + var(--bc-space-1));
      max-height: calc((var(--bc-text-md) * 1.55 * 2) + var(--bc-space-1));
    }

    #better-codex-dialog[data-detail="true"][data-description-expanded="true"] .better-codex-description-field .better-codex-dialog-editor {
      height: auto;
      max-height: min(36vh, calc((var(--bc-text-md) * 1.55 * 12) + var(--bc-space-1)));
      field-sizing: content;
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
      height: auto;
      max-height: min(36vh, calc((var(--bc-text-md) * 1.55 * 12) + var(--bc-space-1)));
      field-sizing: content;
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

    #better-codex-dialog .better-codex-conversation-shell {
      display: contents;
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

    #better-codex-dialog[data-detail="true"] .better-codex-conversation {
      margin-inline: var(--bc-dialog-content-gutter);
      border: 0;
      background: var(--bc-color-input);
      box-shadow: var(--bc-inset-hairline);
    }

    #better-codex-dialog[data-detail="true"] .better-codex-conversation-head,
    #better-codex-dialog[data-detail="true"] .better-codex-timeline {
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

    #better-codex-dialog .better-codex-bubble + .better-codex-bubble {
      border-top: 1px solid var(--bc-divider);
      padding-top: calc(var(--bc-text-base) * 1.05);
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
      position: relative;
      min-width: 0;
      flex: 1;
      padding-right: 30px;
    }

    #better-codex-dialog .better-codex-bubble-copy {
      position: absolute;
      top: -3px;
      right: 0;
      display: inline-flex;
      width: 26px;
      height: 26px;
      align-items: center;
      justify-content: center;
      border: 0;
      border-radius: var(--bc-radius-xs);
      color: var(--bc-muted);
      background: transparent;
      padding: 0;
      cursor: pointer;
      opacity: 0;
      pointer-events: none;
      transition: color .15s, background .15s, opacity .15s;
    }

    #better-codex-dialog .better-codex-bubble:hover .better-codex-bubble-copy,
    #better-codex-dialog .better-codex-bubble:focus-within .better-codex-bubble-copy,
    #better-codex-dialog .better-codex-bubble-copy.is-copied {
      opacity: 1;
      pointer-events: auto;
    }

    #better-codex-dialog .better-codex-bubble-copy:hover {
      color: var(--bc-foreground);
      background: var(--bc-hover);
    }

    #better-codex-dialog .better-codex-bubble-copy:focus-visible {
      outline: none;
      box-shadow: var(--bc-focus-ring);
    }

    #better-codex-dialog .better-codex-bubble-copy.is-copied {
      color: var(--bc-success);
    }

    #better-codex-dialog .better-codex-bubble-copy svg {
      width: 14px;
      height: 14px;
    }

    @media (hover: none) {
      #better-codex-dialog .better-codex-bubble-copy {
        opacity: 1;
        pointer-events: auto;
      }
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

    #better-codex-dialog .better-codex-message-attachments {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(min(220px, 100%), 1fr));
      gap: var(--bc-space-2);
      max-width: 620px;
      margin-top: var(--bc-space-3);
    }

    #better-codex-dialog .better-codex-message-attachment {
      display: flex;
      min-width: 0;
      min-height: 52px;
      align-items: center;
      gap: var(--bc-space-3);
      border: 0;
      border-radius: var(--bc-radius-sm);
      color: var(--bc-foreground);
      background: var(--bc-color-control);
      padding: 7px 9px;
      box-shadow: var(--bc-inset-hairline);
      font: inherit;
      text-align: left;
      cursor: pointer;
      touch-action: manipulation;
      transition: background-color var(--bc-motion-fast), transform var(--bc-motion-fast);
    }

    #better-codex-dialog .better-codex-message-attachment:active {
      transform: scale(.97);
    }

    #better-codex-dialog .better-codex-message-attachment:focus-visible {
      outline: none;
      box-shadow: var(--bc-inset-hairline), var(--bc-focus-ring);
    }

    @media (hover: hover) {
      #better-codex-dialog .better-codex-message-attachment:hover {
        background: var(--bc-color-hover);
      }
    }

    #better-codex-dialog .better-codex-message-attachment-icon {
      display: inline-flex;
      width: 36px;
      height: 36px;
      flex: 0 0 auto;
      align-items: center;
      justify-content: center;
      border-radius: var(--bc-radius-xs);
      color: var(--bc-muted);
      background: var(--bc-color-canvas);
      box-shadow: var(--bc-inset-hairline);
    }

    #better-codex-dialog .better-codex-message-attachment-icon[data-kind="image"] {
      color: var(--bc-priority-low);
    }

    #better-codex-dialog .better-codex-message-attachment-icon svg {
      width: 17px;
      height: 17px;
    }

    #better-codex-dialog .better-codex-message-attachment-copy {
      display: flex;
      min-width: 0;
      flex: 1;
      flex-direction: column;
      gap: 2px;
    }

    #better-codex-dialog .better-codex-message-attachment-copy strong,
    #better-codex-dialog .better-codex-message-attachment-copy small {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    #better-codex-dialog .better-codex-message-attachment-copy strong {
      font-size: var(--bc-text-md);
      font-weight: 580;
    }

    #better-codex-dialog .better-codex-message-attachment-copy small {
      color: var(--bc-faint);
      font-size: var(--bc-text-sm);
    }

    #better-codex-dialog .better-codex-message-attachment-open {
      display: inline-flex;
      width: 24px;
      height: 24px;
      flex: 0 0 auto;
      align-items: center;
      justify-content: center;
      color: var(--bc-faint);
    }

    #better-codex-dialog .better-codex-message-attachment-open svg {
      width: 14px;
      height: 14px;
    }

    #better-codex-attachment-dialog {
      width: min(940px, calc(100vw - 48px));
      height: min(760px, calc(100dvh - 48px));
      max-height: calc(100dvh - 48px);
      margin: auto;
      overflow: hidden;
      border: 0;
      border-radius: var(--bc-radius-lg);
      color: var(--bc-foreground);
      background: var(--bc-color-canvas);
      padding: 0;
      box-shadow: var(--bc-elevation-float);
    }

    #better-codex-attachment-dialog::backdrop {
      background: var(--bc-color-scrim);
    }

    #better-codex-attachment-dialog .better-codex-attachment-shell {
      display: flex;
      width: 100%;
      height: 100%;
      min-height: 0;
      flex-direction: column;
    }

    #better-codex-attachment-dialog header,
    #better-codex-attachment-dialog footer {
      display: flex;
      flex: 0 0 auto;
      align-items: center;
      justify-content: space-between;
      gap: var(--bc-space-4);
      background: var(--bc-color-surface);
    }

    #better-codex-attachment-dialog header {
      min-height: 64px;
      padding: 0 var(--bc-space-4) 0 var(--bc-space-5);
      box-shadow: inset 0 -1px var(--bc-color-hairline);
    }

    #better-codex-attachment-dialog header > div {
      display: flex;
      min-width: 0;
      flex-direction: column;
      gap: 2px;
    }

    #better-codex-attachment-dialog header span,
    #better-codex-attachment-dialog footer > span {
      color: var(--bc-faint);
      font-size: var(--bc-text-sm);
    }

    #better-codex-attachment-dialog header strong {
      overflow: hidden;
      font-size: var(--bc-text-lg);
      font-weight: 620;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    #better-codex-attachment-dialog header button {
      display: inline-flex;
      width: 40px;
      height: 40px;
      flex: 0 0 auto;
      align-items: center;
      justify-content: center;
      border: 0;
      border-radius: var(--bc-radius-xs);
      color: var(--bc-muted);
      background: transparent;
      padding: 0;
      cursor: pointer;
      touch-action: manipulation;
    }

    #better-codex-attachment-dialog header button:focus-visible,
    #better-codex-attachment-dialog footer a:focus-visible {
      outline: none;
      box-shadow: var(--bc-focus-ring);
    }

    @media (hover: hover) {
      #better-codex-attachment-dialog header button:hover,
      #better-codex-attachment-dialog footer a:hover {
        background: var(--bc-color-hover);
      }
    }

    #better-codex-attachment-dialog .better-codex-attachment-body {
      display: flex;
      min-height: 0;
      flex: 1;
      align-items: center;
      justify-content: center;
      overflow: auto;
      overscroll-behavior: contain;
      background: color-mix(in oklch, var(--bc-color-surface) 72%, var(--bc-color-canvas));
      padding: var(--bc-space-4);
    }

    #better-codex-attachment-dialog .better-codex-attachment-body > img {
      display: block;
      max-width: 100%;
      max-height: 100%;
      border-radius: var(--bc-radius-xs);
      object-fit: contain;
      outline: 1px solid color-mix(in oklch, var(--bc-color-text) 12%, transparent);
      outline-offset: -1px;
    }

    #better-codex-attachment-dialog .better-codex-attachment-body > iframe {
      width: 100%;
      height: 100%;
      min-height: 360px;
      border: 0;
      border-radius: var(--bc-radius-xs);
      background: #fff;
    }

    #better-codex-attachment-dialog .better-codex-attachment-body > pre {
      box-sizing: border-box;
      width: 100%;
      min-height: 100%;
      margin: 0;
      overflow: auto;
      border-radius: var(--bc-radius-xs);
      color: var(--bc-foreground);
      background: var(--bc-color-canvas);
      padding: var(--bc-space-5);
      box-shadow: var(--bc-inset-hairline);
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-size: var(--bc-text-sm);
      line-height: 1.65;
      white-space: pre-wrap;
      overflow-wrap: anywhere;
    }

    #better-codex-attachment-dialog .better-codex-attachment-loading,
    #better-codex-attachment-dialog .better-codex-attachment-file {
      display: flex;
      max-width: 420px;
      align-items: center;
      flex-direction: column;
      gap: var(--bc-space-3);
      color: var(--bc-muted);
      text-align: center;
    }

    #better-codex-attachment-dialog .better-codex-attachment-loading svg {
      animation: better-codex-dialog-open-thread-spin 1s linear infinite;
    }

    #better-codex-attachment-dialog .better-codex-attachment-file > svg {
      width: 34px;
      height: 34px;
      color: var(--bc-faint);
    }

    #better-codex-attachment-dialog .better-codex-attachment-file strong {
      color: var(--bc-foreground);
      font-size: var(--bc-text-lg);
      font-weight: 620;
      overflow-wrap: anywhere;
    }

    #better-codex-attachment-dialog .better-codex-attachment-file span {
      line-height: 1.6;
      text-wrap: pretty;
    }

    #better-codex-attachment-dialog .better-codex-attachment-file.is-error strong {
      color: var(--bc-danger);
    }

    #better-codex-attachment-dialog footer {
      min-height: 64px;
      padding: 0 var(--bc-space-4) 0 var(--bc-space-5);
      box-shadow: inset 0 1px var(--bc-color-hairline);
    }

    #better-codex-attachment-dialog footer > div {
      display: flex;
      align-items: center;
      gap: var(--bc-space-2);
    }

    #better-codex-attachment-dialog footer a {
      display: inline-flex;
      min-height: 40px;
      align-items: center;
      justify-content: center;
      gap: 7px;
      border-radius: var(--bc-radius-xs);
      color: var(--bc-foreground);
      background: transparent;
      padding: 0 13px;
      font-size: var(--bc-text-md);
      font-weight: 560;
      text-decoration: none;
      touch-action: manipulation;
      transition: background-color var(--bc-motion-fast), transform var(--bc-motion-fast);
    }

    #better-codex-attachment-dialog footer a:active {
      transform: scale(.96);
    }

    #better-codex-attachment-dialog footer a.is-primary {
      color: var(--bc-primary-foreground);
      background: var(--bc-primary);
    }

    @media (hover: hover) {
      #better-codex-attachment-dialog footer a.is-primary:hover {
        background: color-mix(in oklch, var(--bc-primary) 88%, var(--bc-color-canvas));
      }
    }

    @media (max-width: 600px) {
      #better-codex-attachment-dialog {
        width: 100vw;
        height: 100dvh;
        max-height: 100dvh;
        border-radius: 0;
      }

      #better-codex-attachment-dialog header {
        padding-top: env(safe-area-inset-top);
      }

      #better-codex-attachment-dialog footer {
        min-height: calc(64px + env(safe-area-inset-bottom));
        padding-bottom: env(safe-area-inset-bottom);
      }

      #better-codex-attachment-dialog footer > span {
        display: none;
      }

      #better-codex-attachment-dialog footer > div {
        width: 100%;
        justify-content: flex-end;
      }

      #better-codex-attachment-dialog .better-codex-attachment-body {
        padding: var(--bc-space-2);
      }
    }

    @media (prefers-reduced-motion: reduce) {
      #better-codex-dialog .better-codex-message-attachment,
      #better-codex-attachment-dialog footer a {
        transition: none;
      }

      #better-codex-attachment-dialog .better-codex-attachment-loading svg {
        animation: none;
      }
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

    #better-codex-dialog .better-codex-table-wrap {
      max-width: 100%;
      overflow-x: auto;
      margin: 0 0 .75em;
    }

    #better-codex-dialog .better-codex-table-wrap table {
      width: max-content;
      min-width: 100%;
      border-collapse: collapse;
      color: var(--bc-foreground);
      font-size: .94em;
    }

    #better-codex-dialog .better-codex-table-wrap th,
    #better-codex-dialog .better-codex-table-wrap td {
      border: 1px solid var(--bc-color-hairline);
      padding: .5em .65em;
      text-align: left;
      vertical-align: top;
    }

    #better-codex-dialog .better-codex-table-wrap th {
      background: color-mix(in oklch, var(--bc-hover) 75%, var(--bc-surface));
      color: var(--bc-foreground);
      font-weight: 650;
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
      position: relative;
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

    #better-codex-dialog .better-codex-create-semantic {
      position: relative;
      display: flex;
      min-height: 0;
      flex: 1;
      margin: 0 var(--bc-space-4);
    }

    #better-codex-dialog .better-codex-create-semantic .better-codex-dialog-editor {
      width: 100%;
      margin: var(--bc-space-1) 0 0;
    }

    #better-codex-dialog .better-codex-create-semantic .better-codex-semantic-menu {
      top: calc(var(--bc-text-md) * 1.55 + var(--bc-space-3));
      right: 0;
      bottom: auto;
      left: 0;
    }

    #better-codex-dialog .better-codex-semantic-menu {
      position: absolute;
      right: 0;
      bottom: calc(100% + 8px);
      left: 0;
      z-index: 30;
      max-height: min(320px, 42vh);
      overflow: auto;
      border: 1px solid var(--bc-color-hairline);
      border-radius: var(--bc-radius-md);
      background: var(--bc-color-surface-raised);
      padding: var(--bc-space-1);
      box-shadow: var(--bc-elevation-menu);
      overscroll-behavior: contain;
    }

    #better-codex-dialog .better-codex-semantic-menu[hidden] {
      display: none;
    }

    #better-codex-dialog .better-codex-semantic-menu button {
      display: grid;
      width: 100%;
      min-height: 42px;
      grid-template-columns: 24px minmax(0, 1fr) auto;
      align-items: center;
      gap: var(--bc-space-2);
      border: 0;
      border-radius: var(--bc-radius-xs);
      color: var(--bc-color-text);
      background: transparent;
      padding: 6px 8px;
      font: inherit;
      text-align: left;
      cursor: pointer;
    }

    #better-codex-dialog .better-codex-semantic-menu button[aria-selected="true"] {
      background: var(--bc-color-hover);
    }

    #better-codex-dialog .better-codex-semantic-menu button:disabled {
      opacity: .48;
      cursor: default;
    }

    #better-codex-dialog .better-codex-semantic-icon {
      display: inline-flex;
      width: 24px;
      height: 24px;
      align-items: center;
      justify-content: center;
      border-radius: var(--bc-radius-xs);
      color: var(--bc-color-text-muted);
      background: var(--bc-color-control);
    }

    #better-codex-dialog .better-codex-semantic-icon svg {
      width: 14px;
      height: 14px;
    }

    #better-codex-dialog .better-codex-semantic-copy {
      display: flex;
      min-width: 0;
      flex-direction: column;
      gap: 1px;
    }

    #better-codex-dialog .better-codex-semantic-copy strong,
    #better-codex-dialog .better-codex-semantic-copy small {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    #better-codex-dialog .better-codex-semantic-copy strong {
      font-size: var(--bc-text-sm);
      font-weight: 600;
    }

    #better-codex-dialog .better-codex-semantic-copy small,
    #better-codex-dialog .better-codex-semantic-menu kbd,
    #better-codex-dialog .better-codex-semantic-empty {
      color: var(--bc-color-text-muted);
      font-size: var(--bc-text-caption);
      font-weight: 400;
    }

    #better-codex-dialog .better-codex-semantic-menu kbd {
      max-width: 80px;
      overflow: hidden;
      border: 0;
      background: transparent;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    #better-codex-dialog .better-codex-semantic-empty {
      display: flex;
      min-height: 44px;
      align-items: center;
      justify-content: center;
      gap: var(--bc-space-2);
      padding: var(--bc-space-2);
    }

    #better-codex-dialog .better-codex-semantic-empty svg {
      width: 14px;
      height: 14px;
    }

    #better-codex-dialog .better-codex-semantic-empty .better-codex-spin {
      animation: better-codex-spin .85s linear infinite;
    }

    #better-codex-dialog .better-codex-semantic-empty.is-error {
      color: var(--bc-color-danger);
    }

    #better-codex-dialog .better-codex-semantic-status {
      display: grid;
      gap: 2px;
      padding: var(--bc-space-2);
    }

    #better-codex-dialog .better-codex-semantic-status-title,
    #better-codex-dialog .better-codex-semantic-status > div:not(.better-codex-semantic-status-title) {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--bc-space-3);
    }

    #better-codex-dialog .better-codex-semantic-status-title {
      justify-content: flex-start;
      padding: 2px 2px 8px;
      font-size: var(--bc-text-sm);
      font-weight: 600;
    }

    #better-codex-dialog .better-codex-semantic-status-title svg {
      width: 15px;
      height: 15px;
    }

    #better-codex-dialog .better-codex-semantic-status > div:not(.better-codex-semantic-status-title) {
      min-height: 28px;
      border-top: 1px solid var(--bc-color-hairline);
      padding: 0 2px;
      color: var(--bc-color-text-muted);
      font-size: var(--bc-text-caption);
    }

    #better-codex-dialog .better-codex-semantic-status strong {
      max-width: 65%;
      overflow: hidden;
      color: var(--bc-color-text);
      font-weight: 500;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    #better-codex-dialog[data-detail="true"] .better-codex-composer {
      margin: var(--bc-space-2) var(--bc-dialog-content-gutter) 0;
    }

    #better-codex-dialog .better-codex-composer .better-codex-dialog-attachments {
      box-sizing: border-box;
      width: 100%;
      padding: 0 0 2px;
    }

    #better-codex-dialog .better-codex-composer-queue {
      position: relative;
      display: flex;
      max-height: min(177px, 30dvh);
      flex: 0 0 auto;
      flex-direction: column;
      gap: var(--bc-space-1);
      margin: var(--bc-space-2) 20px 0;
      overflow-x: hidden;
      overflow-y: auto;
      border: 1px solid var(--bc-color-hairline);
      border-bottom: 0;
      border-radius: 23px 23px 0 0;
      background: var(--bc-color-input);
      padding: var(--bc-space-2);
      color: var(--bc-color-text-muted);
      font-size: var(--bc-text-md);
      overscroll-behavior: contain;
      scrollbar-width: none;
    }

    #better-codex-dialog .better-codex-composer-queue::before {
      position: absolute;
      top: var(--bc-space-2);
      bottom: var(--bc-space-2);
      left: calc(var(--bc-space-2) + var(--bc-space-1) + (var(--bc-control-height) / 4));
      width: 1px;
      background: var(--bc-color-hairline);
      content: "";
      pointer-events: none;
    }

    #better-codex-dialog .better-codex-composer-queue[hidden] {
      display: none;
    }

    #better-codex-dialog[data-detail="true"] .better-codex-composer-queue {
      margin-inline: var(--bc-dialog-content-gutter);
    }

    #better-codex-dialog .better-codex-composer-queue::-webkit-scrollbar {
      display: none;
    }

    #better-codex-dialog .better-codex-composer-queue-row {
      position: relative;
      display: flex;
      min-width: 0;
      min-height: 24px;
      align-items: center;
      gap: 6px;
      padding: 2px 4px;
      border-radius: var(--bc-radius-xs);
      line-height: 20px;
    }

    #better-codex-dialog .better-codex-composer-queue-icon {
      display: inline-flex;
      width: 16px;
      height: 16px;
      flex: 0 0 16px;
      align-items: center;
      justify-content: center;
      color: var(--bc-color-text-faint);
      background: var(--bc-color-input);
      z-index: 1;
    }

    #better-codex-dialog .better-codex-composer-queue-icon svg {
      width: 14px;
      height: 14px;
    }

    #better-codex-dialog .better-codex-composer-queue-message {
      min-width: 0;
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    #better-codex-dialog .better-codex-composer-queue-actions {
      display: inline-flex;
      flex: 0 0 auto;
      align-items: center;
      gap: 2px;
      margin-left: auto;
      opacity: 0;
      transition: opacity var(--bc-motion-fast) var(--bc-ease-out);
    }

    #better-codex-dialog .better-codex-composer-queue-row:hover .better-codex-composer-queue-actions,
    #better-codex-dialog .better-codex-composer-queue-row:focus-within .better-codex-composer-queue-actions,
    #better-codex-dialog .better-codex-composer-queue-row.is-editing .better-codex-composer-queue-actions {
      opacity: 1;
    }

    #better-codex-dialog .better-codex-composer-queue-actions button {
      display: inline-flex;
      width: 24px;
      height: 24px;
      align-items: center;
      justify-content: center;
      border: 0;
      border-radius: var(--bc-radius-pill);
      color: var(--bc-color-text-muted);
      background: transparent;
      padding: 0;
      cursor: pointer;
    }

    #better-codex-dialog .better-codex-composer-queue-actions button svg {
      width: 13px;
      height: 13px;
    }

    #better-codex-dialog .better-codex-composer-queue-actions button:focus-visible {
      outline: 2px solid var(--bc-color-focus);
      outline-offset: 1px;
    }

    #better-codex-dialog .better-codex-composer-queue-actions button:disabled {
      cursor: default;
      opacity: .42;
    }

    #better-codex-dialog .better-codex-composer-queue-row.is-editing {
      align-items: flex-start;
      background: var(--bc-color-hover);
      padding-block: 4px;
    }

    #better-codex-dialog .better-codex-composer-queue-row.is-editing .better-codex-composer-queue-icon,
    #better-codex-dialog .better-codex-composer-queue-row.is-editing .better-codex-composer-queue-actions {
      margin-top: 4px;
    }

    #better-codex-dialog .better-codex-composer-queue-edit {
      box-sizing: border-box;
      min-width: 0;
      min-height: 44px;
      flex: 1;
      border: 1px solid var(--bc-color-hairline);
      border-radius: var(--bc-radius-xs);
      color: var(--bc-color-text);
      background: var(--bc-color-input);
      padding: 5px 7px;
      font: inherit;
      line-height: 18px;
      outline: none;
      resize: vertical;
    }

    #better-codex-dialog .better-codex-composer-queue-edit:focus {
      border-color: var(--bc-color-focus);
    }

    #better-codex-dialog .better-codex-composer-queue-error {
      margin: 0 4px;
      border-top: 1px solid color-mix(in oklch, var(--bc-warning) 28%, var(--bc-color-hairline));
      padding: var(--bc-space-2) 22px 0;
      color: var(--bc-warning);
      font-size: var(--bc-text-caption);
      line-height: 18px;
    }

    @media (hover: hover) {
      #better-codex-dialog .better-codex-composer-queue-actions button:hover:not(:disabled) {
        color: var(--bc-color-text);
        background: var(--bc-color-hover);
      }
    }

    @media (hover: none), (max-width: 640px) {
      #better-codex-dialog .better-codex-composer-queue-actions {
        opacity: 1;
      }
    }

    #better-codex-dialog .better-codex-composer-queue:not([hidden]) + .better-codex-composer {
      z-index: 1;
      margin-top: 0;
      border: 1px solid var(--bc-color-hairline);
      border-top: 0;
      border-radius: 0 0 23px 23px;
      box-shadow: none;
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

    #better-codex-dialog .better-codex-conversation-feedback[data-tone="warning"] {
      border-color: color-mix(in oklch, var(--bc-warning) 32%, var(--bc-border));
      color: var(--bc-warning);
      background: color-mix(in oklch, var(--bc-warning) 7%, var(--bc-surface));
    }

    #better-codex-dialog .better-codex-conversation-feedback[data-tone="warning"] button {
      border-color: color-mix(in oklch, var(--bc-warning) 36%, var(--bc-border));
      color: var(--bc-warning);
    }

    #better-codex-dialog .better-codex-conversation-feedback[data-tone="info"] {
      border-color: color-mix(in oklch, var(--bc-info) 32%, var(--bc-border));
      color: var(--bc-info);
      background: color-mix(in oklch, var(--bc-info) 7%, var(--bc-surface));
    }

    #better-codex-dialog .better-codex-conversation-feedback[data-tone="info"] button {
      border-color: color-mix(in oklch, var(--bc-info) 36%, var(--bc-border));
      color: var(--bc-info);
    }

    #better-codex-dialog[data-detail="true"] .better-codex-conversation-feedback {
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

    #better-codex-dialog[data-detail="true"] .better-codex-composer textarea {
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

    #better-codex-dialog[data-detail="true"] .better-codex-dialog-properties {
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
    #better-codex-scheduled-dialog,
    #better-codex-agent-dialog,
    #better-codex-error-dialog {
      position: fixed;
      inset: 0;
      box-sizing: border-box;
      width: min(820px, calc(100vw - 48px));
      height: min(82dvh, 760px);
      max-height: calc(100dvh - 48px);
      margin: auto;
      overflow: hidden;
      border: 0;
      border-radius: var(--bc-radius-xl);
      color: var(--bc-color-text);
      background: var(--bc-color-surface-raised);
      padding: 0;
      box-shadow: var(--bc-elevation-float);
      font-family: var(--bc-font-ui);
      overscroll-behavior: contain;
      animation: better-codex-surface-enter var(--bc-motion-normal) var(--bc-ease-out);
    }

    #better-codex-error-dialog::backdrop {
      background: var(--bc-color-scrim);
    }

    #better-codex-error-dialog .better-codex-error-report-shell {
      display: flex;
      height: 100%;
      min-height: 0;
      flex-direction: column;
    }

    #better-codex-error-dialog .better-codex-error-report-head {
      display: grid;
      flex: 0 0 auto;
      grid-template-columns: 40px minmax(0, 1fr) 40px;
      gap: var(--bc-space-3);
      align-items: start;
      padding: var(--bc-space-5) var(--bc-space-5) var(--bc-space-4);
    }

    #better-codex-error-dialog .better-codex-error-report-icon,
    #better-codex-error-dialog .better-codex-error-report-close {
      display: inline-flex;
      width: 40px;
      height: 40px;
      align-items: center;
      justify-content: center;
      border: 0;
      border-radius: var(--bc-radius-md);
    }

    #better-codex-error-dialog .better-codex-error-report-icon {
      color: var(--bc-color-danger);
      background: color-mix(in oklch, var(--bc-color-danger) 12%, transparent);
    }

    #better-codex-error-dialog .better-codex-error-report-icon svg,
    #better-codex-error-dialog .better-codex-error-report-close svg {
      width: var(--bc-icon-md);
      height: var(--bc-icon-md);
    }

    #better-codex-error-dialog h2 {
      margin: 1px 0 0;
      font-size: var(--bc-text-xl);
      font-weight: 650;
      line-height: 1.35;
      text-wrap: balance;
    }

    #better-codex-error-dialog .better-codex-error-report-head p {
      max-width: 62ch;
      margin: var(--bc-space-1) 0 0;
      color: var(--bc-color-text-muted);
      font-size: var(--bc-text-sm);
      line-height: 1.65;
      text-wrap: pretty;
    }

    #better-codex-error-dialog .better-codex-error-report-close {
      color: var(--bc-color-text-muted);
      background: transparent;
      cursor: pointer;
    }

    #better-codex-error-dialog .better-codex-error-report-summary {
      display: flex;
      flex: 0 0 auto;
      align-items: baseline;
      justify-content: space-between;
      gap: var(--bc-space-3);
      padding: 0 var(--bc-space-5) var(--bc-space-3);
    }

    #better-codex-error-dialog .better-codex-error-report-summary strong {
      min-width: 0;
      overflow-wrap: anywhere;
      color: var(--bc-color-danger);
      font-size: var(--bc-text-md);
      font-weight: 600;
    }

    #better-codex-error-dialog .better-codex-error-report-summary span {
      flex: 0 0 auto;
      color: var(--bc-color-text-muted);
      font-size: var(--bc-text-caption);
      font-variant-numeric: tabular-nums;
    }

    #better-codex-error-dialog .better-codex-error-report-detail {
      min-height: 0;
      flex: 1;
      margin: 0 var(--bc-space-5);
      overflow: auto;
      border: 0;
      border-radius: var(--bc-radius-md);
      color: var(--bc-color-text);
      background: var(--bc-color-input);
      padding: var(--bc-space-4);
      box-shadow: var(--bc-inset-hairline);
      font-family: ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace;
      font-size: 12px;
      line-height: 1.6;
      overflow-wrap: anywhere;
      tab-size: 2;
      white-space: pre-wrap;
    }

    #better-codex-error-dialog .better-codex-error-report-footer {
      display: flex;
      flex: 0 0 auto;
      align-items: center;
      justify-content: space-between;
      gap: var(--bc-space-3);
      padding: var(--bc-space-4) var(--bc-space-5) var(--bc-space-5);
    }

    #better-codex-error-dialog .better-codex-error-report-navigation,
    #better-codex-error-dialog .better-codex-error-report-actions {
      display: flex;
      align-items: center;
      gap: var(--bc-space-2);
    }

    #better-codex-error-dialog .better-codex-error-report-navigation output {
      min-width: 52px;
      color: var(--bc-color-text-muted);
      font-size: var(--bc-text-sm);
      font-variant-numeric: tabular-nums;
      text-align: center;
    }

    #better-codex-error-dialog button {
      display: inline-flex;
      min-height: 40px;
      align-items: center;
      justify-content: center;
      border: 0;
      border-radius: var(--bc-radius-sm);
      color: var(--bc-color-text);
      background: var(--bc-color-control);
      padding: 0 var(--bc-space-3);
      font: inherit;
      font-size: var(--bc-text-sm);
      font-weight: 550;
      cursor: pointer;
      touch-action: manipulation;
      transition: transform var(--bc-motion-fast) var(--bc-ease-out), background-color var(--bc-motion-fast) ease-out;
    }

    #better-codex-error-dialog button.is-primary {
      color: var(--bc-color-on-primary);
      background: var(--bc-color-primary);
    }

    #better-codex-error-dialog button:disabled {
      cursor: default;
      opacity: .42;
    }

    #better-codex-error-dialog button:focus-visible,
    #better-codex-error-dialog .better-codex-error-report-detail:focus-visible {
      outline: 0;
      box-shadow: var(--bc-focus-ring);
    }

    #better-codex-error-dialog button:active:not(:disabled) {
      transform: scale(.96);
    }

    @media (hover: hover) {
      #better-codex-error-dialog button:hover:not(:disabled) {
        background: var(--bc-color-hover);
      }

      #better-codex-error-dialog button.is-primary:hover:not(:disabled) {
        color: var(--bc-color-on-primary);
        background: color-mix(in oklch, var(--bc-color-primary) 86%, black);
      }
    }

    @media (max-width: 640px) {
      #better-codex-error-dialog {
        width: calc(100vw - 20px);
        height: min(90dvh, 760px);
        max-height: calc(100dvh - 20px);
      }

      #better-codex-error-dialog .better-codex-error-report-head {
        grid-template-columns: 36px minmax(0, 1fr) 36px;
        gap: var(--bc-space-2);
        padding: var(--bc-space-4);
      }

      #better-codex-error-dialog .better-codex-error-report-icon,
      #better-codex-error-dialog .better-codex-error-report-close {
        width: 36px;
        height: 36px;
      }

      #better-codex-error-dialog .better-codex-error-report-summary {
        align-items: flex-start;
        flex-direction: column;
        gap: var(--bc-space-1);
        padding: 0 var(--bc-space-4) var(--bc-space-3);
      }

      #better-codex-error-dialog .better-codex-error-report-detail {
        margin-inline: var(--bc-space-4);
        padding: var(--bc-space-3);
        font-size: 11px;
      }

      #better-codex-error-dialog .better-codex-error-report-footer {
        align-items: stretch;
        flex-direction: column;
        padding: var(--bc-space-3) var(--bc-space-4) max(var(--bc-space-4), env(safe-area-inset-bottom));
      }

      #better-codex-error-dialog .better-codex-error-report-navigation,
      #better-codex-error-dialog .better-codex-error-report-actions {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
      }

      #better-codex-error-dialog button {
        min-width: 0;
        padding-inline: var(--bc-space-2);
      }
    }

    @media (prefers-reduced-motion: reduce) {
      #better-codex-error-dialog {
        animation: none;
      }

      #better-codex-error-dialog button {
        transition: none;
      }
    }

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
      #better-codex-panel .better-codex-agent-inspector[data-agent-window="create"] {
        position: relative;
        inset: auto;
        width: 100%;
        height: 100%;
        max-height: none;
        margin: 0;
        border-radius: 0;
        box-shadow: none;
      }
      #better-codex-panel .better-codex-agent-inspector[data-agent-window="create"] .better-codex-agent-inspector-scroll {
        padding-inline: var(--bc-space-4);
      }
      #better-codex-panel .better-codex-agent-inspector[data-agent-window="create"] .better-codex-agent-inspector-footer {
        padding-inline: var(--bc-space-4);
      }
      #better-codex-panel .better-codex-agent-inspector [data-agent-window-expand] { display: none; }
      #better-codex-panel .better-codex-agent-inspector-resize { display: none; }
      #better-codex-panel .better-codex-agent-inspector,
      #better-codex-panel .better-codex-agent-inspector[data-animate="enter"],
      #better-codex-panel .better-codex-agent-inspector[data-agent-window="create"][data-animate="enter"] {
        animation: none;
        transition: none;
      }
      #better-codex-panel .better-codex-agent-grid { grid-template-columns: 1fr; }
      #better-codex-dialog, #better-codex-agent-dialog, #better-codex-confirm, #better-codex-auto-dispatch-help-dialog, #better-codex-profile-dialog, #better-codex-avatar-picker, #better-codex-avatar-cropper { width: calc(100vw - 24px); }
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
        display: flex;
        align-items: center;
        gap: 4px;
        padding-inline: var(--bc-space-2);
        padding-block: var(--bc-space-2);
      }
      #better-codex-dialog .better-codex-dialog-footer-right {
        display: flex;
        min-width: 0;
        flex: 1 1 auto;
        align-items: center;
        justify-content: flex-end;
        gap: 4px;
      }
      #better-codex-dialog .better-codex-switch-mode {
        width: auto;
        min-width: 0;
        flex: 0 1 auto;
        height: auto;
        min-height: var(--bc-control-height);
        justify-content: flex-start;
        gap: 4px;
        padding: var(--bc-space-2) 4px;
        text-align: left;
        white-space: nowrap;
      }
      #better-codex-dialog .better-codex-keep-open {
        min-width: 0;
        flex: 0 0 auto;
        gap: 4px;
        white-space: nowrap;
      }
      #better-codex-dialog .better-codex-submit {
        min-width: 0;
        max-width: 100%;
        flex: 0 0 auto;
        height: auto;
        min-height: var(--bc-control-height);
        padding: var(--bc-space-2) 10px;
        white-space: nowrap;
      }
      #better-codex-dialog .better-codex-agent-picker .better-codex-dialog-select-trigger {
        max-width: min(260px, calc(100vw - 120px));
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

      #better-codex-panel[data-host="web"][data-surface="issues"] .better-codex-toolbar {
        position: relative;
        z-index: 10;
        display: flex;
        height: 52px;
        min-height: 52px;
        flex: 0 0 52px;
        align-items: center;
        flex-direction: row;
        gap: 2px;
        overflow: visible;
        padding: 6px 8px;
      }

      #better-codex-panel[data-host="web"][data-surface="issues"] :is(.better-codex-tabs, .better-codex-actions) {
        display: flex;
        width: 100%;
        flex: 1 1 auto;
        align-items: center;
        justify-content: flex-end;
        gap: 4px;
        overflow: visible;
        padding: 0;
      }

      #better-codex-panel[data-host="web"][data-surface="issues"] .better-codex-tabs {
        display: none;
      }

      #better-codex-panel[data-host="web"][data-surface="issues"] .better-codex-actions > * {
        min-width: auto;
      }

      #better-codex-panel[data-host="web"][data-surface="issues"] :is(.better-codex-tabs .better-codex-button, #better-codex-working, #better-codex-filter, #better-codex-auto-dispatch) {
        width: 40px;
        min-width: 40px;
        height: 40px;
        min-height: 40px;
        padding: 0;
      }

      #better-codex-panel[data-host="web"][data-surface="issues"] #better-codex-working {
        width: auto;
        min-width: 44px;
        flex: 1 1 auto;
        justify-content: flex-start;
        padding-inline: 12px;
      }

      #better-codex-panel[data-host="web"][data-surface="issues"] #better-codex-working::after {
        content: none;
      }

      #better-codex-panel[data-host="web"][data-surface="issues"] :is(.better-codex-tabs .better-codex-button, #better-codex-working, #better-codex-filter, #better-codex-auto-dispatch, .better-codex-create-primary) > span {
        display: none;
      }

      #better-codex-panel[data-host="web"][data-surface="issues"] #better-codex-working > span {
        display: inline;
        white-space: nowrap;
      }

      #better-codex-panel[data-host="web"][data-surface="issues"] .better-codex-tab-icon {
        display: block;
        width: var(--bc-icon-md);
        height: var(--bc-icon-md);
      }

      #better-codex-panel[data-host="web"][data-surface="issues"] #better-codex-working > svg {
        width: var(--bc-icon-md);
        height: var(--bc-icon-md);
      }

      #better-codex-panel[data-host="web"][data-surface="issues"] .better-codex-search-wrap {
        position: relative;
        width: 40px;
        height: 40px;
        flex: 0 0 40px;
        justify-content: center;
        padding: 0;
      }

      #better-codex-panel[data-host="web"][data-surface="issues"] .better-codex-search-wrap .better-codex-search {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        opacity: 0;
        cursor: text;
      }

      #better-codex-panel[data-host="web"][data-surface="issues"] .better-codex-search-wrap:focus-within {
        position: fixed;
        z-index: 120;
        top: 6px;
        right: 8px;
        left: 8px;
        width: auto;
        height: 42px;
        justify-content: flex-start;
        padding-inline: 12px;
        background: var(--bc-color-surface-raised);
        box-shadow: var(--bc-elevation-menu);
      }

      #better-codex-panel[data-host="web"][data-surface="issues"] .better-codex-search-wrap:focus-within .better-codex-search {
        position: static;
        width: 100%;
        height: 100%;
        opacity: 1;
      }

      #better-codex-panel[data-host="web"][data-surface="issues"] :is(.better-codex-filter-wrap, .better-codex-auto-dispatch-wrap) {
        width: auto;
        min-width: 0;
        justify-content: flex-start;
      }

      #better-codex-panel[data-host="web"][data-surface="issues"] .better-codex-filter-menu {
        top: calc(100% + 6px);
        right: auto;
        left: 0;
      }

      #better-codex-panel[data-host="web"][data-surface="issues"] .better-codex-auto-dispatch-help {
        width: 40px;
        height: 40px;
        flex-basis: 40px;
      }

      #better-codex-panel[data-host="web"][data-surface="issues"] .better-codex-create-split {
        width: auto;
        height: 40px;
        justify-self: auto;
      }

      #better-codex-panel[data-host="web"][data-surface="issues"] .better-codex-create-primary {
        width: 40px;
        min-width: 40px;
        height: 40px;
        padding: 0;
      }

      #better-codex-panel[data-host="web"][data-surface="issues"] .better-codex-create-toggle {
        display: none;
      }

      #better-codex-panel[data-host="web"][data-surface="issues"] > .better-codex-toolbar > .better-codex-error:not([hidden]) {
        position: fixed;
        z-index: 121;
        top: 54px;
        right: 10px;
        left: 10px;
        margin: 0;
        border-radius: var(--bc-radius-sm);
        background: var(--bc-color-surface-raised);
        padding: var(--bc-space-2) var(--bc-space-3);
        box-shadow: var(--bc-elevation-menu);
      }

      #better-codex-dialog[data-host="web"][data-expanded] {
        position: fixed;
        inset: var(--bc-mobile-viewport-top, 0) 0 auto;
        width: 100vw;
        max-width: none;
        height: var(--bc-mobile-viewport-height, 100dvh);
        max-height: none;
        margin: 0;
        overflow: hidden;
        border-radius: 0;
        background: var(--bc-color-canvas);
        box-shadow: none;
        transition: none;
        --bc-dialog-content-gutter: var(--bc-space-4);
      }

      #better-codex-dialog[data-host="web"][data-detail="true"][data-expanded]:has(.better-codex-conversation) {
        height: var(--bc-mobile-viewport-height, 100dvh);
        max-height: none;
      }

      #better-codex-dialog[data-host="web"]::backdrop {
        background: var(--bc-color-canvas);
        backdrop-filter: none;
      }

      #better-codex-dialog[data-host="web"] form {
        box-sizing: border-box;
        height: 100%;
        padding-top: env(safe-area-inset-top);
        padding-bottom: env(safe-area-inset-bottom);
        scroll-padding-block: calc(env(safe-area-inset-top) + var(--bc-space-4)) calc(env(safe-area-inset-bottom) + var(--bc-space-4));
      }

      #better-codex-dialog[data-host="web"] form:has(.better-codex-conversation) {
        padding-bottom: 0;
      }

      #better-codex-dialog[data-host="web"] form:not(:has(.better-codex-conversation)) {
        overflow-y: auto;
        overscroll-behavior: contain;
        -webkit-overflow-scrolling: touch;
      }

      #better-codex-dialog[data-host="web"] :is(input, textarea, [contenteditable="true"]) {
        scroll-margin-block: var(--bc-space-4);
      }

      #better-codex-dialog[data-host="web"] .better-codex-dialog-head {
        box-sizing: border-box;
        height: 52px;
        min-height: 52px;
        max-height: 52px;
        flex: 0 0 52px;
        align-items: center;
        flex-wrap: nowrap;
        gap: 4px;
        overflow: hidden;
        border-bottom: 1px solid var(--bc-color-hairline);
        background: var(--bc-color-canvas);
        padding: 6px 8px;
      }

      #better-codex-dialog[data-host="web"] .better-codex-dialog-head-leading {
        min-width: 0;
        flex: 1 1 auto;
        gap: 0;
        overflow: hidden;
      }

      #better-codex-dialog[data-host="web"] .better-codex-dialog-breadcrumb {
        min-width: 0;
        flex: 1 1 auto;
        overflow: hidden;
        padding-inline: 8px;
      }

      #better-codex-dialog[data-host="web"] .better-codex-dialog-head-actions {
        width: auto;
        flex: 0 0 auto;
        flex-wrap: nowrap;
        gap: 4px;
      }

      #better-codex-dialog[data-host="web"] .better-codex-dialog-head-actions :is(.better-codex-icon-button, .better-codex-dialog-open-thread, .better-codex-dialog-start-now) {
        box-sizing: border-box;
        width: 40px;
        min-width: 40px;
        max-width: 40px;
        height: 40px;
        min-height: 40px;
        max-height: 40px;
        flex: 0 0 40px;
        border-radius: 8px;
        padding: 0;
        line-height: 0;
        white-space: nowrap;
      }

      #better-codex-dialog[data-host="web"] .better-codex-dialog-head-actions :is(.better-codex-dialog-open-thread, .better-codex-dialog-start-now) > span {
        display: none;
      }

      #better-codex-dialog[data-host="web"] .better-codex-dialog-head-actions :is(.better-codex-icon-button, .better-codex-dialog-open-thread, .better-codex-dialog-start-now) > svg {
        display: block;
        width: var(--bc-icon-md);
        height: var(--bc-icon-md);
        flex: 0 0 var(--bc-icon-md);
      }

      #better-codex-dialog[data-host="web"] [data-dialog-expand] {
        display: none;
      }

      #better-codex-dialog[data-host="web"][data-detail="true"] .better-codex-dialog-back,
      #better-codex-dialog[data-host="web"][data-detail="true"] .better-codex-dialog-route-root,
      #better-codex-dialog[data-host="web"][data-detail="true"] .better-codex-dialog-route-root-separator {
        display: none;
      }

      #better-codex-dialog[data-host="web"] :is(.better-codex-manual-title, .better-codex-description-field, .better-codex-conversation, .better-codex-composer, .better-codex-conversation-feedback) {
        margin-inline: var(--bc-space-4);
      }

      #better-codex-dialog[data-host="web"] .better-codex-composer-queue {
        margin-inline: var(--bc-space-4);
      }

      #better-codex-dialog[data-host="web"] .better-codex-conversation-shell {
        display: flex;
        min-height: 0;
        flex: 1 1 0;
        order: 1;
        flex-direction: column;
      }

      #better-codex-dialog[data-host="web"] .better-codex-conversation {
        flex: 1 1 0;
        border: 0;
        background: var(--bc-color-surface);
        box-shadow: var(--bc-inset-hairline);
      }

      #better-codex-dialog[data-host="web"] .better-codex-timeline {
        min-height: 0;
        overflow-x: hidden;
        overflow-y: auto;
        overscroll-behavior: contain;
        touch-action: pan-y;
        -webkit-overflow-scrolling: touch;
      }

      #better-codex-dialog[data-host="web"] .better-codex-composer {
        flex: 0 0 auto;
        margin-top: var(--bc-space-2);
      }

      #better-codex-dialog[data-host="web"] .better-codex-composer textarea {
        height: calc(3em + 8px);
        min-height: calc(3em + 8px);
        max-height: calc(3em + 8px);
      }

      #better-codex-dialog[data-host="web"] .better-codex-dialog-properties {
        flex: 0 0 auto;
        overflow-x: auto;
        flex-wrap: nowrap;
        overscroll-behavior-inline: contain;
        scrollbar-width: none;
        -webkit-overflow-scrolling: touch;
      }

      #better-codex-dialog[data-host="web"][data-detail="true"] .better-codex-dialog-properties {
        position: relative;
        z-index: 20;
        gap: var(--bc-space-2);
        overflow: visible;
      }

      #better-codex-dialog[data-host="web"][data-detail="true"] .better-codex-dialog-properties > [data-dialog-select="status"],
      #better-codex-dialog[data-host="web"][data-detail="true"] .better-codex-dialog-properties > [data-dialog-select="priority"],
      #better-codex-dialog[data-host="web"][data-detail="true"] .better-codex-label-picker {
        box-sizing: border-box;
        width: 40px;
        min-width: 40px;
        max-width: 40px;
        height: 40px;
        flex: 0 0 40px;
      }

      #better-codex-dialog[data-host="web"][data-detail="true"] .better-codex-dialog-properties > [data-dialog-select] > .better-codex-dialog-select-trigger,
      #better-codex-dialog[data-host="web"][data-detail="true"] .better-codex-label-trigger {
        justify-content: center;
        padding: 0;
      }

      #better-codex-dialog[data-host="web"][data-detail="true"] .better-codex-dialog-properties > [data-dialog-select="status"] > .better-codex-dialog-select-trigger,
      #better-codex-dialog[data-host="web"][data-detail="true"] .better-codex-dialog-properties > [data-dialog-select="priority"] > .better-codex-dialog-select-trigger,
      #better-codex-dialog[data-host="web"][data-detail="true"] .better-codex-label-trigger {
        display: inline-flex;
        box-sizing: border-box;
        width: 40px;
        min-width: 40px;
        max-width: 40px;
        height: 40px;
        min-height: 40px;
        max-height: 40px;
        aspect-ratio: 1;
        border-radius: 50%;
        touch-action: manipulation;
      }

      #better-codex-dialog[data-host="web"][data-detail="true"] .better-codex-dialog-properties > [data-dialog-select="status"] .better-codex-dialog-select-label,
      #better-codex-dialog[data-host="web"][data-detail="true"] .better-codex-dialog-properties > [data-dialog-select="priority"] .better-codex-dialog-select-label,
      #better-codex-dialog[data-host="web"][data-detail="true"] .better-codex-dialog-properties > [data-dialog-select="status"] > .better-codex-dialog-select-trigger > svg:last-child,
      #better-codex-dialog[data-host="web"][data-detail="true"] .better-codex-dialog-properties > [data-dialog-select="priority"] > .better-codex-dialog-select-trigger > svg:last-child {
        display: none;
      }

      #better-codex-dialog[data-host="web"][data-detail="true"] .better-codex-label-picker {
        position: relative;
        display: inline-flex;
        min-width: 0;
      }

      #better-codex-dialog[data-host="web"][data-detail="true"] .better-codex-label-menu {
        display: none;
      }

      #better-codex-dialog[data-host="web"][data-detail="true"] .better-codex-label-picker.is-open {
        z-index: 410;
      }

      #better-codex-dialog[data-host="web"][data-detail="true"] .better-codex-dialog-select.is-open,
      #better-codex-dialog[data-host="web"][data-detail="true"] .better-codex-project-picker:has(.better-codex-project-menu:not([hidden])) {
        z-index: 410;
      }

      #better-codex-dialog[data-host="web"][data-detail="true"] .better-codex-label-picker.is-open .better-codex-label-menu {
        position: fixed;
        z-index: 420;
        right: var(--bc-space-3);
        bottom: calc(var(--bc-mobile-viewport-bottom, 0px) + env(safe-area-inset-bottom) + var(--bc-space-3));
        left: var(--bc-space-3);
        display: flex;
        box-sizing: border-box;
        max-height: min(60dvh, 480px);
        overflow: hidden;
        flex-direction: column;
        gap: var(--bc-space-2);
        border-radius: var(--bc-radius-md);
        background: var(--bc-color-surface-raised);
        padding: var(--bc-space-2);
        box-shadow: var(--bc-elevation-menu);
      }

      #better-codex-dialog[data-host="web"][data-detail="true"] .better-codex-label-menu .better-codex-label-property {
        box-sizing: border-box;
        width: 100%;
        max-width: none;
        height: 40px;
        flex: 0 0 40px;
        border-radius: var(--bc-radius-sm);
        padding-inline: var(--bc-space-3);
      }

      #better-codex-dialog[data-host="web"][data-detail="true"] .better-codex-label-menu .better-codex-label-property input {
        min-width: 0;
        width: 100%;
      }

      #better-codex-dialog[data-host="web"][data-detail="true"] .better-codex-label-options {
        display: flex;
        min-height: 0;
        overflow-y: auto;
        flex-direction: column;
        gap: 2px;
        overscroll-behavior: contain;
        -webkit-overflow-scrolling: touch;
      }

      #better-codex-dialog[data-host="web"][data-detail="true"] :is(.better-codex-dialog-select-menu, .better-codex-label-options) .better-codex-dialog-select-option {
        min-height: 40px;
      }

      #better-codex-dialog[data-host="web"][data-detail="true"] .better-codex-project-picker {
        min-width: 0;
        flex: 1 1 auto;
      }

      #better-codex-dialog[data-host="web"][data-detail="true"] [data-dialog-project] {
        box-sizing: border-box;
        width: 100%;
        max-width: none;
        height: 40px;
        justify-content: flex-start;
      }

      #better-codex-dialog[data-host="web"][data-detail="true"] [data-dialog-project] [data-project-label] {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      #better-codex-dialog[data-host="web"] .better-codex-dialog-properties :is(.better-codex-project-menu, .better-codex-dialog-select-menu) {
        position: fixed;
        z-index: 420;
        top: auto;
        right: var(--bc-space-3);
        bottom: calc(var(--bc-mobile-viewport-bottom, 0px) + env(safe-area-inset-bottom) + var(--bc-space-3));
        left: var(--bc-space-3);
        width: auto;
        min-width: 0;
        max-width: none;
        max-height: min(60dvh, 480px);
      }

      #better-codex-dialog[data-host="web"] .better-codex-dialog-properties .better-codex-project-menu.is-above {
        top: auto;
        bottom: calc(var(--bc-mobile-viewport-bottom, 0px) + env(safe-area-inset-bottom) + var(--bc-space-3));
        flex-direction: column;
      }

      #better-codex-dialog[data-host="web"] .better-codex-dialog-properties .better-codex-project-menu > [data-project-options],
      #better-codex-dialog[data-host="web"] .better-codex-dialog-properties .better-codex-project-menu.is-above > [data-project-options] {
        max-height: calc(min(60dvh, 480px) - 44px);
        flex-direction: column;
      }

      #better-codex-dialog[data-host="web"] .better-codex-dialog-properties::-webkit-scrollbar {
        display: none;
      }
    }

    #better-codex-panel .better-codex-scheduled-shell {
      width: min(1120px, 100%);
      margin: 0 auto;
    }

    #better-codex-panel .better-codex-scheduled-overview {
      display: flex;
      min-height: 90px;
      align-items: center;
      justify-content: space-between;
      gap: var(--bc-space-5);
      border-radius: var(--bc-radius-lg);
      background: var(--bc-color-surface);
      padding: var(--bc-space-4) var(--bc-space-5);
      box-shadow: var(--bc-inset-hairline);
    }

    #better-codex-panel .better-codex-scheduled-overview > div {
      min-width: 0;
    }

    #better-codex-panel .better-codex-scheduled-overview > div > span,
    #better-codex-panel .better-codex-scheduled-overview > div > small {
      display: block;
      color: var(--bc-color-text-muted);
      font-size: var(--bc-text-caption);
    }

    #better-codex-panel .better-codex-scheduled-overview > div > strong {
      display: block;
      margin-block: 4px;
      font-size: var(--bc-text-xl);
      font-weight: 650;
      line-height: 1.15;
      font-variant-numeric: tabular-nums;
    }

    #better-codex-panel .better-codex-scheduled-overview dl {
      display: flex;
      flex: 0 0 auto;
      margin: 0;
    }

    #better-codex-panel .better-codex-scheduled-overview dl > div {
      min-width: 82px;
      padding-inline: var(--bc-space-4);
      text-align: right;
    }

    #better-codex-panel .better-codex-scheduled-overview dl > div + div {
      border-left: 1px solid var(--bc-color-hairline);
    }

    #better-codex-panel .better-codex-scheduled-overview dt {
      color: var(--bc-color-text-muted);
      font-size: var(--bc-text-caption);
    }

    #better-codex-panel .better-codex-scheduled-overview dd {
      margin: 4px 0 0;
      font-size: var(--bc-text-xl);
      font-weight: 650;
      font-variant-numeric: tabular-nums;
    }

    #better-codex-panel .better-codex-scheduled-list {
      margin-top: var(--bc-space-3);
      overflow: hidden;
      border-radius: var(--bc-radius-lg);
      background: var(--bc-color-surface);
      box-shadow: var(--bc-inset-hairline);
    }

    #better-codex-panel .better-codex-scheduled-row + .better-codex-scheduled-row {
      border-top: 1px solid var(--bc-color-hairline);
    }

    #better-codex-panel .better-codex-scheduled-row[data-enabled="false"] .better-codex-scheduled-copy,
    #better-codex-panel .better-codex-scheduled-row[data-enabled="false"] .better-codex-scheduled-timing {
      opacity: .62;
    }

    #better-codex-panel .better-codex-scheduled-row-main {
      display: grid;
      min-height: 116px;
      grid-template-columns: 86px minmax(240px, 1fr) minmax(130px, 170px) auto;
      align-items: center;
      gap: var(--bc-space-4);
      padding: var(--bc-space-4) var(--bc-space-5);
    }

    #better-codex-panel .better-codex-scheduled-status,
    #better-codex-panel .better-codex-scheduled-run-state {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      color: var(--bc-color-text-muted);
      font-size: var(--bc-text-caption);
      font-weight: 600;
    }

    #better-codex-panel .better-codex-scheduled-status i,
    #better-codex-panel .better-codex-scheduled-run-state i {
      width: 7px;
      height: 7px;
      flex: 0 0 7px;
      border-radius: var(--bc-radius-pill);
      background: currentColor;
    }

    #better-codex-panel .better-codex-scheduled-status[data-state="enabled"],
    #better-codex-panel .better-codex-scheduled-run-state[data-state="completed"] {
      color: var(--bc-success);
    }

    #better-codex-panel .better-codex-scheduled-status[data-state="running"],
    #better-codex-panel .better-codex-scheduled-run-state[data-state="running"] {
      color: var(--bc-color-focus);
    }

    #better-codex-panel .better-codex-scheduled-run-state[data-state="failed"] {
      color: var(--bc-color-danger);
    }

    #better-codex-panel .better-codex-scheduled-copy {
      min-width: 0;
    }

    #better-codex-panel .better-codex-scheduled-copy h2 {
      margin: 0;
      overflow: hidden;
      font-size: var(--bc-text-lg);
      font-weight: 650;
      line-height: 1.35;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    #better-codex-panel .better-codex-scheduled-copy p {
      margin: 5px 0 0;
      overflow: hidden;
      color: var(--bc-color-text-muted);
      font-size: var(--bc-text-sm);
      line-height: 1.5;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    #better-codex-panel .better-codex-scheduled-copy > div {
      display: flex;
      min-width: 0;
      flex-wrap: wrap;
      gap: var(--bc-space-3);
      margin-top: 9px;
    }

    #better-codex-panel .better-codex-scheduled-copy > div > span {
      display: inline-flex;
      min-width: 0;
      align-items: center;
      gap: 5px;
      color: var(--bc-color-text-faint);
      font-size: var(--bc-text-caption);
    }

    #better-codex-panel .better-codex-scheduled-copy > div svg {
      width: 13px;
      height: 13px;
      flex: 0 0 13px;
    }

    #better-codex-panel .better-codex-scheduled-timing {
      min-width: 0;
      text-align: right;
    }

    #better-codex-panel .better-codex-scheduled-timing span,
    #better-codex-panel .better-codex-scheduled-timing small {
      display: block;
      color: var(--bc-color-text-muted);
      font-size: var(--bc-text-caption);
    }

    #better-codex-panel .better-codex-scheduled-timing strong {
      display: block;
      margin-block: 4px;
      overflow: hidden;
      font-size: var(--bc-text-sm);
      font-weight: 650;
      font-variant-numeric: tabular-nums;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    #better-codex-panel .better-codex-scheduled-row-actions {
      display: grid;
      grid-template-columns: repeat(2, 40px);
      gap: var(--bc-space-1);
    }

    #better-codex-panel .better-codex-scheduled-row-actions button,
    #better-codex-panel .better-codex-scheduled-runs button {
      display: inline-flex;
      width: 40px;
      height: 40px;
      align-items: center;
      justify-content: center;
      border: 0;
      border-radius: var(--bc-radius-sm);
      color: var(--bc-color-text-muted);
      background: transparent;
      padding: 0;
      cursor: pointer;
      touch-action: manipulation;
      transition: transform var(--bc-motion-fast) var(--bc-ease-out), background-color var(--bc-motion-fast) ease-out, color var(--bc-motion-fast) ease-out;
    }

    #better-codex-panel .better-codex-scheduled-row-actions button:active,
    #better-codex-panel .better-codex-scheduled-runs button:active {
      transform: scale(.96);
    }

    #better-codex-panel .better-codex-scheduled-row-actions button:focus-visible,
    #better-codex-panel .better-codex-scheduled-runs button:focus-visible {
      outline: 0;
      box-shadow: var(--bc-focus-ring);
    }

    #better-codex-panel .better-codex-scheduled-row-actions button:disabled {
      cursor: default;
      opacity: .34;
    }

    #better-codex-panel .better-codex-scheduled-row-actions button.is-danger {
      color: var(--bc-color-danger);
    }

    #better-codex-panel .better-codex-scheduled-row-actions svg {
      width: 15px;
      height: 15px;
    }

    #better-codex-panel .better-codex-scheduled-runs {
      border-top: 1px solid var(--bc-color-hairline);
      background: color-mix(in srgb, var(--bc-color-surface) 78%, var(--bc-color-canvas));
    }

    #better-codex-panel .better-codex-scheduled-runs summary {
      display: flex;
      min-height: 42px;
      align-items: center;
      gap: 7px;
      padding-inline: var(--bc-space-5);
      color: var(--bc-color-text-muted);
      font-size: var(--bc-text-caption);
      cursor: pointer;
      list-style: none;
    }

    #better-codex-panel .better-codex-scheduled-runs summary::-webkit-details-marker {
      display: none;
    }

    #better-codex-panel .better-codex-scheduled-runs summary > svg {
      width: 13px;
      height: 13px;
      margin-left: auto;
      transition: transform var(--bc-motion-fast) var(--bc-ease-out);
    }

    #better-codex-panel .better-codex-scheduled-runs[open] summary > svg {
      transform: rotate(90deg);
    }

    #better-codex-panel .better-codex-scheduled-runs ul {
      margin: 0;
      padding: 0 var(--bc-space-5) var(--bc-space-3);
      list-style: none;
    }

    #better-codex-panel .better-codex-scheduled-runs li {
      display: grid;
      min-height: 40px;
      grid-template-columns: 94px 130px minmax(0, 1fr);
      align-items: center;
      gap: var(--bc-space-3);
      border-top: 1px solid var(--bc-color-hairline);
      font-size: var(--bc-text-caption);
    }

    #better-codex-panel .better-codex-scheduled-runs li > time {
      color: var(--bc-color-text-muted);
      font-variant-numeric: tabular-nums;
    }

    #better-codex-panel .better-codex-scheduled-runs li > button {
      width: auto;
      min-width: 0;
      justify-content: flex-start;
      gap: 5px;
      overflow: hidden;
      color: var(--bc-color-text);
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    #better-codex-panel .better-codex-scheduled-runs li > button svg {
      width: 13px;
      height: 13px;
      flex: 0 0 13px;
    }

    #better-codex-panel .better-codex-scheduled-runs li > span:last-child,
    #better-codex-panel .better-codex-scheduled-never {
      color: var(--bc-color-text-faint);
      font-size: var(--bc-text-caption);
    }

    #better-codex-panel .better-codex-scheduled-never {
      min-height: 42px;
      box-sizing: border-box;
      border-top: 1px solid var(--bc-color-hairline);
      background: color-mix(in srgb, var(--bc-color-surface) 78%, var(--bc-color-canvas));
      padding: 13px var(--bc-space-5);
    }

    #better-codex-panel .better-codex-scheduled-empty,
    #better-codex-panel .better-codex-scheduled-loading {
      display: flex;
      width: min(520px, 100%);
      min-height: 55vh;
      box-sizing: border-box;
      align-items: center;
      justify-content: center;
      flex-direction: column;
      margin: 0 auto;
      text-align: center;
    }

    #better-codex-panel .better-codex-scheduled-empty > svg {
      width: 30px;
      height: 30px;
      color: var(--bc-color-text-muted);
    }

    #better-codex-panel .better-codex-scheduled-empty h1 {
      margin: var(--bc-space-3) 0 0;
      font-size: var(--bc-text-xl);
      font-weight: 650;
    }

    #better-codex-panel .better-codex-scheduled-empty p {
      max-width: 46ch;
      margin: var(--bc-space-2) 0 var(--bc-space-4);
      color: var(--bc-color-text-muted);
      font-size: var(--bc-text-sm);
      line-height: 1.7;
      text-wrap: pretty;
    }

    #better-codex-panel .better-codex-scheduled-empty .better-codex-submit {
      display: inline-flex;
      min-height: 40px;
      align-items: center;
      gap: 7px;
      border: 0;
      border-radius: var(--bc-radius-sm);
      color: var(--bc-color-on-primary);
      background: var(--bc-color-primary);
      padding-inline: var(--bc-space-4);
      font: inherit;
      cursor: pointer;
    }

    #better-codex-panel .better-codex-scheduled-loading {
      gap: var(--bc-space-3);
      color: var(--bc-color-text-muted);
      font-size: var(--bc-text-sm);
    }

    #better-codex-panel .better-codex-scheduled-loading span {
      width: 20px;
      height: 20px;
      border: 2px solid var(--bc-color-hairline);
      border-top-color: var(--bc-color-text-muted);
      border-radius: var(--bc-radius-pill);
      animation: better-codex-project-document-spin .9s linear infinite;
    }

    #better-codex-scheduled-dialog {
      position: fixed;
      inset: 0;
      width: min(680px, calc(100vw - 32px));
      height: fit-content;
      max-height: min(820px, calc(100dvh - 32px));
      box-sizing: border-box;
      margin: auto;
      overflow: hidden;
      border: 0;
      border-radius: var(--bc-radius-lg);
      color: var(--bc-color-text);
      background: var(--bc-color-canvas);
      padding: 0;
      box-shadow: var(--bc-elevation-float);
      font-family: var(--bc-font-ui);
    }

    #better-codex-scheduled-dialog::backdrop {
      background: var(--bc-color-scrim);
    }

    #better-codex-scheduled-dialog form {
      display: flex;
      max-height: inherit;
      flex-direction: column;
    }

    #better-codex-scheduled-dialog header,
    #better-codex-scheduled-dialog footer {
      display: flex;
      flex: 0 0 auto;
      align-items: center;
      justify-content: space-between;
      background: var(--bc-color-canvas);
    }

    #better-codex-scheduled-dialog header {
      min-height: 60px;
      padding: 0 var(--bc-space-4) 0 var(--bc-space-5);
    }

    #better-codex-scheduled-dialog header > div {
      display: flex;
      min-width: 0;
      align-items: center;
      gap: var(--bc-space-3);
    }

    #better-codex-scheduled-dialog header h2 {
      margin: 0;
      font-size: var(--bc-text-lg);
      font-weight: 650;
      line-height: 1.35;
    }

    #better-codex-scheduled-dialog .better-codex-scheduled-dialog-icon {
      display: inline-flex;
      width: 38px;
      height: 38px;
      flex: 0 0 38px;
      align-items: center;
      justify-content: center;
      border-radius: var(--bc-radius-sm);
      color: var(--bc-color-text);
      background: var(--bc-color-control);
    }

    #better-codex-scheduled-dialog .better-codex-scheduled-dialog-icon svg {
      width: 18px;
      height: 18px;
    }

    #better-codex-scheduled-dialog header > button,
    #better-codex-scheduled-dialog footer button {
      min-height: 40px;
      border: 0;
      border-radius: var(--bc-radius-sm);
      color: var(--bc-color-text-muted);
      background: transparent;
      padding-inline: var(--bc-space-3);
      font: inherit;
      cursor: pointer;
      touch-action: manipulation;
      transition: transform var(--bc-motion-fast) var(--bc-ease-out), background-color var(--bc-motion-fast) ease-out, color var(--bc-motion-fast) ease-out;
    }

    #better-codex-scheduled-dialog header > button {
      display: inline-flex;
      width: 40px;
      align-items: center;
      justify-content: center;
      padding: 0;
    }

    #better-codex-scheduled-dialog button:active {
      transform: scale(.96);
    }

    #better-codex-scheduled-dialog button:focus-visible,
    #better-codex-scheduled-dialog :is(input, textarea, select):focus-visible {
      outline: 0;
      box-shadow: var(--bc-focus-ring);
    }

    #better-codex-scheduled-dialog .better-codex-scheduled-dialog-body {
      display: grid;
      min-height: 0;
      overflow-y: auto;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      align-content: start;
      gap: var(--bc-space-3) var(--bc-space-4);
      padding: var(--bc-space-4) var(--bc-space-5) var(--bc-space-5);
      overscroll-behavior: contain;
    }

    #better-codex-scheduled-dialog .better-codex-scheduled-agent-create {
      display: grid;
      min-width: 0;
      grid-column: 1 / -1;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: var(--bc-space-3) var(--bc-space-4);
    }

    #better-codex-scheduled-dialog .better-codex-scheduled-agent-create > .is-wide,
    #better-codex-scheduled-dialog .better-codex-scheduled-agent-hint,
    #better-codex-scheduled-dialog .better-codex-scheduled-agent-create > output {
      grid-column: 1 / -1;
    }

    #better-codex-scheduled-dialog[data-mode="agent"] textarea {
      min-height: 176px;
    }

    #better-codex-scheduled-dialog .better-codex-scheduled-agent-hint {
      display: flex;
      min-width: 0;
      align-items: center;
      gap: var(--bc-space-2);
      color: var(--bc-color-text-muted);
      font-size: var(--bc-text-sm);
      line-height: 1.5;
    }

    #better-codex-scheduled-dialog .better-codex-scheduled-agent-hint .better-codex-agent-avatar {
      width: 28px;
      height: 28px;
      flex: 0 0 28px;
    }

    #better-codex-scheduled-dialog label,
    #better-codex-scheduled-dialog .better-codex-scheduled-field {
      display: flex;
      min-width: 0;
      flex-direction: column;
      gap: var(--bc-space-2);
      color: var(--bc-color-text-muted);
      font-size: var(--bc-text-caption);
    }

    #better-codex-scheduled-dialog label.is-wide,
    #better-codex-scheduled-dialog .better-codex-scheduled-interval,
    #better-codex-scheduled-dialog .better-codex-scheduled-project-path,
    #better-codex-scheduled-dialog output {
      grid-column: 1 / -1;
    }

    #better-codex-scheduled-dialog :is(input:not([type="checkbox"]):not([type="hidden"]), textarea) {
      width: 100%;
      min-width: 0;
      min-height: var(--bc-control-height);
      box-sizing: border-box;
      border: 0;
      border-radius: var(--bc-radius-sm);
      outline: 0;
      color: var(--bc-color-text);
      background: var(--bc-color-control);
      padding: 0 var(--bc-control-padding);
      font: inherit;
      font-size: var(--bc-text-md);
      box-shadow: none;
    }

    #better-codex-scheduled-dialog textarea {
      min-height: 112px;
      padding-block: var(--bc-space-2);
      resize: vertical;
      line-height: 1.7;
    }

    #better-codex-scheduled-dialog .better-codex-scheduled-project-path {
      overflow: hidden;
      margin-top: calc(var(--bc-space-1) * -1);
      color: var(--bc-color-text-faint);
      font-size: var(--bc-text-caption);
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    #better-codex-scheduled-dialog .better-codex-scheduled-picker {
      position: relative;
    }

    #better-codex-scheduled-dialog .better-codex-scheduled-picker-trigger {
      display: flex;
      width: 100%;
      min-width: 0;
      min-height: var(--bc-control-height);
      box-sizing: border-box;
      align-items: center;
      justify-content: space-between;
      gap: var(--bc-space-2);
      border: 0;
      border-radius: var(--bc-radius-sm);
      color: var(--bc-color-text);
      background: var(--bc-color-control);
      padding: 0 var(--bc-control-padding);
      font: inherit;
      font-size: var(--bc-text-md);
      text-align: start;
      cursor: pointer;
      transition: background-color var(--bc-motion-fast) ease-out, box-shadow var(--bc-motion-fast) ease-out;
    }

    #better-codex-scheduled-dialog .better-codex-scheduled-picker-trigger > span {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    #better-codex-scheduled-dialog .better-codex-scheduled-picker-trigger > svg {
      width: var(--bc-icon-sm);
      height: var(--bc-icon-sm);
      flex: 0 0 var(--bc-icon-sm);
      color: var(--bc-color-text-muted);
      transition: transform var(--bc-motion-fast) var(--bc-ease-out);
    }

    #better-codex-scheduled-dialog .better-codex-scheduled-picker.is-open .better-codex-scheduled-picker-trigger > svg {
      transform: rotate(180deg);
    }

    #better-codex-scheduled-dialog .better-codex-scheduled-picker-option-copy {
      display: flex;
      min-width: 0;
      align-items: center;
      gap: var(--bc-space-2);
    }

    #better-codex-scheduled-dialog .better-codex-scheduled-picker-option-copy > svg {
      width: var(--bc-icon-sm);
      height: var(--bc-icon-sm);
      flex: 0 0 var(--bc-icon-sm);
      color: var(--bc-color-text-muted);
    }

    #better-codex-scheduled-dialog .better-codex-scheduled-picker-option-copy > span {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    #better-codex-scheduled-dialog .better-codex-scheduled-picker-menu {
      position: absolute;
      top: calc(100% + var(--bc-space-1));
      right: 0;
      left: 0;
      z-index: 20;
      box-sizing: border-box;
      max-height: 224px;
      overflow-y: auto;
      border-radius: var(--bc-radius-md);
      color: var(--bc-color-text);
      background: var(--bc-color-surface-raised);
      padding: var(--bc-space-1);
      box-shadow: var(--bc-elevation-menu);
    }

    #better-codex-scheduled-dialog .better-codex-scheduled-picker-menu[hidden] {
      display: none;
    }

    #better-codex-scheduled-dialog .better-codex-scheduled-picker-option {
      display: flex;
      width: 100%;
      min-height: var(--bc-row-height);
      align-items: center;
      justify-content: space-between;
      gap: var(--bc-space-2);
      border: 0;
      border-radius: var(--bc-radius-sm);
      color: var(--bc-color-text);
      background: transparent;
      padding: 0 var(--bc-space-2);
      font: inherit;
      font-size: var(--bc-text-sm);
      text-align: start;
      cursor: pointer;
    }

    #better-codex-scheduled-dialog .better-codex-scheduled-picker-option.is-selected {
      background: var(--bc-color-hover);
    }

    #better-codex-scheduled-dialog .better-codex-scheduled-picker-check {
      display: inline-flex;
      width: var(--bc-icon-sm);
      height: var(--bc-icon-sm);
      flex: 0 0 var(--bc-icon-sm);
    }

    #better-codex-scheduled-dialog .better-codex-scheduled-picker-check svg {
      width: 100%;
      height: 100%;
    }

    #better-codex-scheduled-dialog .better-codex-scheduled-switch {
      min-height: var(--bc-control-height);
      box-sizing: border-box;
      align-items: center;
      justify-content: space-between;
      flex-direction: row;
      align-self: end;
      gap: var(--bc-space-3);
      border-radius: var(--bc-radius-sm);
      background: var(--bc-color-control);
      padding: 0 var(--bc-control-padding);
    }

    #better-codex-scheduled-dialog .better-codex-scheduled-switch strong,
    #better-codex-scheduled-dialog .better-codex-scheduled-enable strong {
      color: var(--bc-color-text);
      font-size: var(--bc-text-md);
      font-weight: 500;
    }

    #better-codex-scheduled-dialog :is(.better-codex-scheduled-switch, .better-codex-scheduled-enable) input {
      position: relative;
      width: 34px;
      min-height: 20px;
      height: 20px;
      flex: 0 0 34px;
      margin: 0;
      appearance: none;
      border-radius: var(--bc-radius-pill);
      background: var(--bc-color-surface-raised);
      box-shadow: none;
      cursor: pointer;
      transition: background-color var(--bc-motion-fast) ease-out;
    }

    #better-codex-scheduled-dialog :is(.better-codex-scheduled-switch, .better-codex-scheduled-enable) input::after {
      position: absolute;
      top: 3px;
      left: 3px;
      width: 14px;
      height: 14px;
      border-radius: var(--bc-radius-pill);
      background: var(--bc-color-surface-raised);
      box-shadow: var(--bc-elevation-card);
      content: "";
      transition: transform var(--bc-motion-fast) var(--bc-ease-out), background-color var(--bc-motion-fast) ease-out;
    }

    #better-codex-scheduled-dialog :is(.better-codex-scheduled-switch, .better-codex-scheduled-enable) input:checked {
      background: var(--bc-color-primary);
    }

    #better-codex-scheduled-dialog :is(.better-codex-scheduled-switch, .better-codex-scheduled-enable) input:checked::after {
      transform: translateX(14px);
      background: var(--bc-color-on-primary);
    }

    #better-codex-scheduled-dialog :is(.better-codex-scheduled-switch, .better-codex-scheduled-enable) input:disabled {
      cursor: not-allowed;
      opacity: .55;
    }

    #better-codex-scheduled-dialog .better-codex-scheduled-interval {
      display: grid;
      grid-template-columns: minmax(96px, .35fr) minmax(0, 1fr);
      gap: var(--bc-space-4);
    }

    #better-codex-scheduled-dialog .better-codex-scheduled-interval[hidden] {
      display: none;
    }

    #better-codex-scheduled-dialog .better-codex-scheduled-unit-switch {
      display: grid;
      min-height: var(--bc-control-height);
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 2px;
      border-radius: var(--bc-radius-sm);
      background: var(--bc-color-control);
      padding: 2px;
    }

    #better-codex-scheduled-dialog .better-codex-scheduled-unit-switch button {
      min-width: 0;
      min-height: calc(var(--bc-control-height) - var(--bc-space-1));
      border: 0;
      border-radius: var(--bc-radius-xs);
      color: var(--bc-color-text-muted);
      background: transparent;
      padding: 0 var(--bc-space-2);
      font: inherit;
      font-size: var(--bc-text-sm);
      cursor: pointer;
    }

    #better-codex-scheduled-dialog .better-codex-scheduled-unit-switch button[aria-checked="true"] {
      color: var(--bc-color-text);
      background: var(--bc-color-surface-raised);
      box-shadow: var(--bc-elevation-card);
    }

    #better-codex-scheduled-dialog output {
      color: var(--bc-color-danger);
      font-size: var(--bc-text-caption);
    }

    #better-codex-scheduled-dialog output[data-tone="warning"] {
      color: var(--bc-warning);
    }

    #better-codex-scheduled-dialog output[data-tone="info"] {
      color: var(--bc-info);
    }

    #better-codex-scheduled-dialog footer {
      min-height: 64px;
      justify-content: space-between;
      gap: var(--bc-space-2);
      padding-inline: var(--bc-space-4);
    }

    #better-codex-scheduled-dialog footer > div,
    #better-codex-scheduled-dialog .better-codex-scheduled-enable {
      display: flex;
      align-items: center;
    }

    #better-codex-scheduled-dialog footer > div {
      gap: var(--bc-space-2);
    }

    #better-codex-scheduled-dialog footer .better-codex-scheduled-mode-switch {
      display: inline-flex;
      align-items: center;
      gap: var(--bc-space-2);
    }

    #better-codex-scheduled-dialog footer .better-codex-scheduled-mode-switch svg {
      width: var(--bc-icon-sm);
      height: var(--bc-icon-sm);
    }

    #better-codex-scheduled-dialog .better-codex-scheduled-enable {
      flex-direction: row;
      gap: var(--bc-space-2);
      cursor: pointer;
    }

    #better-codex-scheduled-dialog footer .better-codex-submit {
      min-width: 84px;
      color: var(--bc-color-on-primary);
      background: var(--bc-color-primary);
    }

    #better-codex-scheduled-dialog footer button:disabled {
      cursor: wait;
      opacity: .55;
    }

    @media (hover: hover) {
      #better-codex-panel .better-codex-scheduled-row-actions button:not(:disabled):hover,
      #better-codex-panel .better-codex-scheduled-runs button:hover,
      #better-codex-scheduled-dialog header > button:hover,
      #better-codex-scheduled-dialog footer button:not(.better-codex-submit):hover,
      #better-codex-scheduled-dialog .better-codex-scheduled-picker-trigger:hover,
      #better-codex-scheduled-dialog .better-codex-scheduled-picker.is-open .better-codex-scheduled-picker-trigger,
      #better-codex-scheduled-dialog .better-codex-scheduled-picker-option:hover,
      #better-codex-scheduled-dialog .better-codex-scheduled-picker-option:focus-visible,
      #better-codex-scheduled-dialog .better-codex-scheduled-picker-option.is-selected,
      #better-codex-scheduled-dialog .better-codex-scheduled-unit-switch button:not([aria-checked="true"]):hover {
        color: var(--bc-color-text);
        background: var(--bc-color-hover);
      }

      #better-codex-panel .better-codex-scheduled-row-actions button.is-danger:hover {
        color: var(--bc-color-danger);
        background: var(--bc-color-danger-soft);
      }
    }

    @media (max-width: 860px) {
      #better-codex-panel .better-codex-scheduled-row-main {
        grid-template-columns: 82px minmax(0, 1fr) auto;
      }

      #better-codex-panel .better-codex-scheduled-timing {
        grid-column: 2;
        text-align: left;
      }

      #better-codex-panel .better-codex-scheduled-row-actions {
        grid-column: 3;
        grid-row: 1 / 3;
      }
    }

    @media (max-width: 640px) {
      #better-codex-panel .better-codex-scheduled {
        padding: var(--bc-space-3) var(--bc-space-3) calc(var(--bc-space-5) + env(safe-area-inset-bottom));
      }

      #better-codex-panel .better-codex-scheduled-overview {
        align-items: flex-start;
        flex-direction: column;
      }

      #better-codex-panel .better-codex-scheduled-overview dl {
        width: 100%;
      }

      #better-codex-panel .better-codex-scheduled-overview dl > div {
        min-width: 0;
        flex: 1;
        padding-inline: var(--bc-space-3);
        text-align: left;
      }

      #better-codex-panel .better-codex-scheduled-overview dl > div:first-child {
        padding-left: 0;
      }

      #better-codex-panel .better-codex-scheduled-row-main {
        grid-template-columns: minmax(0, 1fr) auto;
        gap: var(--bc-space-3);
        padding: var(--bc-space-4);
      }

      #better-codex-panel .better-codex-scheduled-status {
        grid-column: 1;
      }

      #better-codex-panel .better-codex-scheduled-copy {
        grid-column: 1 / -1;
        grid-row: 2;
      }

      #better-codex-panel .better-codex-scheduled-timing {
        grid-column: 1 / -1;
        grid-row: 3;
      }

      #better-codex-panel .better-codex-scheduled-row-actions {
        grid-column: 2;
        grid-row: 1;
        grid-template-columns: repeat(4, 40px);
      }

      #better-codex-panel .better-codex-scheduled-runs li {
        grid-template-columns: 90px minmax(0, 1fr);
      }

      #better-codex-panel .better-codex-scheduled-runs li > button,
      #better-codex-panel .better-codex-scheduled-runs li > span:last-child {
        grid-column: 1 / -1;
      }

      #better-codex-scheduled-dialog {
        width: min(100vw - 16px, 680px);
        max-height: calc(100dvh - 16px - env(safe-area-inset-bottom));
      }

      #better-codex-scheduled-dialog .better-codex-scheduled-dialog-body {
        grid-template-columns: minmax(0, 1fr);
        padding: var(--bc-space-4);
      }

      #better-codex-scheduled-dialog .better-codex-scheduled-agent-create {
        grid-template-columns: minmax(0, 1fr);
      }

      #better-codex-scheduled-dialog label.is-wide,
      #better-codex-scheduled-dialog .better-codex-scheduled-interval,
      #better-codex-scheduled-dialog .better-codex-scheduled-project-path,
      #better-codex-scheduled-dialog output {
        grid-column: 1;
      }
    }

    @media (max-width: 720px) {
      #better-codex-scheduled-dialog[data-host="web"] {
        inset: var(--bc-mobile-viewport-top, 0) 0 auto;
        width: 100vw;
        max-width: none;
        height: var(--bc-mobile-viewport-height, 100dvh);
        max-height: none;
        margin: 0;
        border-radius: 0;
        background: var(--bc-color-canvas);
        box-shadow: none;
      }

      #better-codex-scheduled-dialog[data-host="web"]::backdrop {
        background: var(--bc-color-canvas);
      }

      #better-codex-scheduled-dialog[data-host="web"] form {
        box-sizing: border-box;
        height: 100%;
        max-height: none;
        padding-top: env(safe-area-inset-top);
        padding-bottom: env(safe-area-inset-bottom);
      }

      #better-codex-scheduled-dialog[data-host="web"] header {
        box-sizing: border-box;
        height: 52px;
        min-height: 52px;
        padding: 6px 8px 6px 12px;
      }

      #better-codex-scheduled-dialog[data-host="web"] .better-codex-scheduled-dialog-icon {
        width: 36px;
        height: 36px;
        flex-basis: 36px;
      }

      #better-codex-scheduled-dialog[data-host="web"] .better-codex-scheduled-dialog-body {
        min-height: 0;
        flex: 1 1 auto;
        grid-template-columns: minmax(0, 1fr);
        padding: var(--bc-space-4);
        -webkit-overflow-scrolling: touch;
      }

      #better-codex-scheduled-dialog[data-host="web"] .better-codex-scheduled-agent-create {
        grid-template-columns: minmax(0, 1fr);
      }

      #better-codex-scheduled-dialog[data-host="web"] footer {
        min-height: 64px;
        padding-inline: var(--bc-space-3);
      }

      #better-codex-scheduled-dialog[data-host="web"] label.is-wide,
      #better-codex-scheduled-dialog[data-host="web"] .better-codex-scheduled-interval,
      #better-codex-scheduled-dialog[data-host="web"] .better-codex-scheduled-project-path,
      #better-codex-scheduled-dialog[data-host="web"] output {
        grid-column: 1;
      }
    }

    @media (max-width: 430px) {
      #better-codex-panel .better-codex-scheduled-row-actions {
        grid-template-columns: repeat(2, 40px);
      }
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
      #better-codex-scheduled-dialog,
      #better-codex-agent-dialog,
      #better-codex-confirm,
      #better-codex-profile-dialog,
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
      #better-codex-scheduled-dialog button,
      #better-codex-agent-dialog button,
      #better-codex-confirm button,
      #better-codex-profile-dialog button,
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
