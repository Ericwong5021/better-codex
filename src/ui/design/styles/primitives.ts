export function betterCodexPrimitiveStylesCss() {
  return String.raw`
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

    [data-bc-component="icon"] {
      display: inline-flex;
      width: var(--bc-icon-md);
      height: var(--bc-icon-md);
      flex: 0 0 auto;
      align-items: center;
      justify-content: center;
    }

    [data-bc-component="icon"] > svg,
    [data-bc-component="button"] > svg,
    [data-bc-component="icon-button"] > svg {
      width: var(--bc-icon-md);
      height: var(--bc-icon-md);
      flex: 0 0 auto;
    }

    [data-bc-component="button"],
    [data-bc-component="icon-button"] {
      display: inline-flex;
      min-height: var(--bc-control-height);
      box-sizing: border-box;
      align-items: center;
      justify-content: center;
      gap: var(--bc-space-2);
      border: 0;
      border-radius: var(--bc-radius-sm);
      padding: 0 var(--bc-control-padding);
      color: var(--bc-color-text);
      background: var(--bc-color-control);
      box-shadow: var(--bc-inset-hairline);
      font: inherit;
      font-size: var(--bc-text-sm);
      font-weight: 600;
      line-height: var(--bc-leading-tight);
      cursor: pointer;
      transition: color var(--bc-motion-fast) var(--bc-ease-out), background var(--bc-motion-fast) var(--bc-ease-out), box-shadow var(--bc-motion-fast) var(--bc-ease-out), transform var(--bc-motion-fast) var(--bc-ease-out);
    }

    [data-bc-component="icon-button"] {
      width: var(--bc-control-height);
      padding: 0;
    }

    [data-bc-component="button"][data-bc-variant="primary"],
    [data-bc-component="icon-button"][data-bc-variant="primary"] {
      color: var(--bc-color-on-primary);
      background: var(--bc-color-primary);
      box-shadow: none;
    }

    [data-bc-component="button"][data-bc-variant="ghost"],
    [data-bc-component="icon-button"][data-bc-variant="ghost"] {
      background: transparent;
      box-shadow: none;
    }

    [data-bc-component="button"][data-bc-variant="danger"],
    [data-bc-component="icon-button"][data-bc-variant="danger"] {
      color: var(--bc-color-danger);
      background: var(--bc-color-danger-soft);
      box-shadow: none;
    }

    [data-bc-component="button"]:hover:not(:disabled),
    [data-bc-component="icon-button"]:hover:not(:disabled) {
      background: var(--bc-color-hover);
    }

    [data-bc-component="button"][data-bc-variant="primary"]:hover:not(:disabled),
    [data-bc-component="icon-button"][data-bc-variant="primary"]:hover:not(:disabled) {
      background: color-mix(in oklch, var(--bc-color-primary) 88%, var(--bc-color-canvas));
    }

    [data-bc-component="button"]:active:not(:disabled),
    [data-bc-component="icon-button"]:active:not(:disabled) {
      background: var(--bc-color-pressed);
      transform: translateY(1px);
    }

    [data-bc-component="button"]:focus-visible,
    [data-bc-component="icon-button"]:focus-visible {
      outline: 0;
      box-shadow: var(--bc-focus-ring);
    }

    [data-bc-component="button"]:disabled,
    [data-bc-component="icon-button"]:disabled {
      color: var(--bc-color-text-faint);
      cursor: not-allowed;
      opacity: .68;
    }

    [data-bc-spin="true"] {
      animation: better-codex-component-spin calc(var(--bc-motion-normal) + var(--bc-motion-normal) + var(--bc-motion-normal) + var(--bc-motion-normal)) linear infinite;
    }

    [data-bc-component="badge"],
    [data-bc-component="status-badge"],
    [data-bc-component="priority-badge"] {
      display: inline-flex;
      min-height: calc(var(--bc-control-height) - var(--bc-space-2));
      box-sizing: border-box;
      align-items: center;
      gap: var(--bc-space-2);
      border-radius: var(--bc-radius-pill);
      padding: 0 var(--bc-space-2);
      color: var(--bc-color-text-muted);
      background: var(--bc-color-control);
      font-size: var(--bc-text-caption);
      font-weight: 650;
      line-height: var(--bc-leading-tight);
      white-space: nowrap;
    }

    [data-bc-component="status-badge"]::before {
      width: calc(var(--bc-space-2) - 2px);
      height: calc(var(--bc-space-2) - 2px);
      flex: 0 0 auto;
      border-radius: var(--bc-radius-pill);
      background: currentColor;
      content: "";
    }

    [data-bc-component="badge"][data-bc-variant="info"],
    [data-bc-component="status-badge"][data-bc-variant="info"] {
      color: var(--bc-color-info);
      background: color-mix(in oklch, var(--bc-color-info) 12%, var(--bc-color-surface));
    }

    [data-bc-component="badge"][data-bc-variant="success"],
    [data-bc-component="status-badge"][data-bc-variant="success"] {
      color: var(--bc-color-success);
      background: color-mix(in oklch, var(--bc-color-success) 12%, var(--bc-color-surface));
    }

    [data-bc-component="badge"][data-bc-variant="warning"],
    [data-bc-component="status-badge"][data-bc-variant="warning"] {
      color: var(--bc-color-warning);
      background: color-mix(in oklch, var(--bc-color-warning) 12%, var(--bc-color-surface));
    }

    [data-bc-component="badge"][data-bc-variant="danger"],
    [data-bc-component="status-badge"][data-bc-variant="danger"] {
      color: var(--bc-color-danger);
      background: var(--bc-color-danger-soft);
    }

    [data-bc-component="priority-badge"] {
      color: var(--bc-priority-none);
      background: color-mix(in oklch, currentColor 12%, var(--bc-color-surface));
    }

    @keyframes better-codex-component-spin {
      to { transform: rotate(1turn); }
    }

  `;
}
