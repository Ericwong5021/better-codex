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

  `;
}
