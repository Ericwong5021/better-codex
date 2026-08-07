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
    #better-codex-dialog,
    #better-codex-agent-dialog,
    #better-codex-confirm,
    #better-codex-auto-dispatch-help-dialog,
    #better-codex-context-menu,
    #better-codex-update-notice,
    #better-codex-completion-notice,
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
      min-height: 50px;
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
      border: 1.5px solid currentColor;
      border-radius: 50%;
      background: transparent;
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
      width: min(560px, calc(100vw - 32px));
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
      flex-direction: column;
      gap: var(--bc-space-4);
      padding: calc(var(--bc-space-4) + 2px);
    }

    #better-codex-auto-dispatch-help-dialog header,
    #better-codex-auto-dispatch-help-dialog footer {
      display: flex;
      align-items: center;
    }

    #better-codex-auto-dispatch-help-dialog header {
      justify-content: space-between;
      gap: var(--bc-space-2);
    }

    #better-codex-auto-dispatch-help-dialog header strong {
      font-size: calc(var(--bc-text-xl) + 1px);
      font-weight: 700;
      letter-spacing: -.01em;
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

    #better-codex-auto-dispatch-help-dialog .better-codex-auto-dispatch-help-panels {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 1px minmax(0, 1fr);
      gap: var(--bc-space-4);
      align-items: stretch;
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
      gap: var(--bc-space-3);
      text-align: left;
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-auto-dispatch-help-heading {
      display: flex;
      width: 100%;
      flex-direction: column;
      align-items: center;
      gap: 10px;
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
      font-weight: 700;
      letter-spacing: -.02em;
      line-height: 1.2;
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-auto-dispatch-help-panel p {
      margin: 0;
      align-self: stretch;
      max-width: none;
      color: var(--bc-color-text-muted);
      font-size: var(--bc-text-lg);
      line-height: 1.6;
      text-align: left;
    }

    #better-codex-auto-dispatch-help-dialog footer {
      justify-content: flex-end;
    }

    #better-codex-auto-dispatch-help-dialog footer button {
      display: inline-flex;
      min-height: var(--bc-control-height);
      min-width: 96px;
      align-items: center;
      justify-content: center;
      border: 0;
      border-radius: var(--bc-radius-sm);
      color: var(--bc-color-text);
      background: var(--bc-color-control);
      padding: 0 var(--bc-control-padding);
      font: inherit;
      font-size: var(--bc-text-md);
      font-weight: 600;
      cursor: pointer;
    }

    @media (max-width: 560px) {
      #better-codex-auto-dispatch-help-dialog .better-codex-auto-dispatch-help-panels {
        grid-template-columns: minmax(0, 1fr);
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
      box-sizing: border-box;
      width: min(32vw, 516px);
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
      height: min(62vh, 640px);
    }

    #better-codex-dialog[data-detail="true"][data-expanded="true"] {
      width: min(1200px, calc(100vw - 48px));
      height: min(90vh, 960px);
    }

    #better-codex-dialog .better-codex-conversation {
      display: flex;
      min-height: 0;
      flex: 1;
      flex-direction: column;
      margin: 0 20px;
      overflow: hidden;
      border: 1px solid var(--bc-border);
      border-radius: var(--bc-radius-md);
      background: color-mix(in oklch, var(--bc-surface) 92%, var(--bc-hover));
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
      color: var(--bc-faint);
      font-weight: 500;
    }

    #better-codex-dialog .better-codex-conversation-status[data-state="running"] {
      color: var(--bc-warning);
    }

    #better-codex-dialog .better-codex-conversation-status[data-state="failed"] {
      color: var(--bc-danger);
    }

    #better-codex-dialog .better-codex-timeline {
      display: flex;
      min-height: 0;
      flex: 1;
      flex-direction: column;
      gap: calc(var(--bc-text-base) * 1.05);
      overflow: auto;
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

    #better-codex-dialog .better-codex-composer {
      display: flex;
      flex: 0 0 auto;
      align-items: flex-end;
      gap: 8px;
      margin: 8px 20px 0;
      border: 1px solid var(--bc-border);
      border-radius: var(--bc-radius-md);
      background: var(--bc-surface);
      padding: 8px;
    }

    #better-codex-dialog .better-codex-composer textarea {
      box-sizing: border-box;
      height: calc(3.625em + 12px);
      flex: 1;
      border: 0;
      color: var(--bc-foreground);
      background: transparent;
      padding: 6px 8px;
      font: inherit;
      font-size: var(--bc-text-md);
      line-height: 1.45;
      outline: none;
      overflow-y: auto;
      resize: none;
    }

    #better-codex-dialog[data-detail="true"][data-expanded="true"] .better-codex-composer textarea {
      height: calc(6.525em + 12px);
    }

    #better-codex-dialog .better-codex-composer textarea::placeholder {
      color: var(--bc-muted);
    }

    #better-codex-dialog .better-codex-composer-send {
      display: inline-flex;
      min-width: 72px;
      height: var(--bc-control-height);
      align-items: center;
      justify-content: center;
      border: 0;
      border-radius: var(--bc-radius-sm);
      color: var(--bc-primary-foreground);
      background: var(--bc-primary);
      padding: 0 12px;
      font: inherit;
      font-size: var(--bc-text-md);
      font-weight: 550;
      cursor: pointer;
    }

    #better-codex-dialog .better-codex-composer-send:disabled {
      cursor: not-allowed;
      opacity: .55;
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

    #better-codex-completion-notice {
      border-color: var(--bc-color-hairline);
      border-radius: var(--bc-radius-sm);
      color: var(--bc-color-text);
      background: var(--bc-color-surface-raised);
      box-shadow: var(--bc-elevation-menu);
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
    #better-codex-update-notice button:focus-visible,
    #better-codex-completion-notice button:focus-visible {
      outline: 0;
      box-shadow: var(--bc-focus-ring);
    }

    #better-codex-panel button:active,
    #better-codex-dialog button:active,
    #better-codex-agent-dialog button:active,
    #better-codex-confirm button:active,
    #better-codex-context-menu button:active,
    #better-codex-avatar-cropper button:active,
    #better-codex-update-notice button:active,
    #better-codex-completion-notice button:active {
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
      #better-codex-completion-notice button:hover {
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
      #better-codex-panel .better-codex-agent-inspector[data-animate="enter"] {
        animation-name: better-codex-inspector-enter-mobile;
      }
      #better-codex-panel .better-codex-agent-grid { grid-template-columns: 1fr; }
      #better-codex-dialog, #better-codex-agent-dialog, #better-codex-confirm, #better-codex-auto-dispatch-help-dialog, #better-codex-avatar-picker, #better-codex-avatar-cropper { width: calc(100vw - 24px); }
      #better-codex-dialog[data-detail="true"][data-expanded="false"],
      #better-codex-dialog[data-detail="true"][data-expanded="true"] { width: calc(100vw - 24px); }
      #better-codex-dialog .better-codex-dialog-footer { align-items: flex-end; padding-block: var(--bc-space-2); }
      #better-codex-dialog .better-codex-dialog-footer-right { flex-wrap: wrap; }
    }

    @media (prefers-reduced-motion: reduce) {
      #better-codex-dialog,
      #better-codex-agent-dialog,
      #better-codex-confirm,
      #better-codex-avatar-picker,
      #better-codex-avatar-cropper,
      #better-codex-update-notice,
      #better-codex-completion-notice {
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
      #better-codex-completion-notice button {
        transition: none;
      }
    }
  `;
}
