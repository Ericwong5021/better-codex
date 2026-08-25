export function betterCodexPatternStylesCss() {
  return String.raw`
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
      background: var(--bc-color-text-faint);
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

  `;
}
