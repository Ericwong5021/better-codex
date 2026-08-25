const betterCodexSliderScopes = [
  "#better-codex-panel",
  "#better-codex-archive-dialog",
  "#better-codex-dialog",
  "#better-codex-scheduled-dialog",
  "#better-codex-attachment-dialog",
  "#better-codex-agent-dialog",
  "#better-codex-confirm",
  "#better-codex-auto-dispatch-help-dialog",
  "#better-codex-profile-dialog",
  "#better-codex-context-menu",
  "#better-codex-update-notice",
  ".better-codex-completion-notice",
  "#better-codex-avatar-picker",
  "#better-codex-avatar-cropper",
] as const;

function descendants(scopes: readonly string[]) {
  return scopes.flatMap(scope => [scope, `${scope} *`]);
}

function inputs(scopes: readonly string[]) {
  return scopes.map(scope => `${scope} input[type="range"]`);
}

function selectors(targets: readonly string[], suffix = "") {
  return targets.map(target => `${target}${suffix}`).join(",\n    ");
}

export function betterCodexSliderStylesCss(scopes: readonly string[] = betterCodexSliderScopes) {
  const scrollTargets = descendants(scopes);
  const rangeTargets = inputs(scopes);
  return String.raw`
    ${selectors(scopes)} {
      --bc-slider-track-size: 5px;
      --bc-slider-thumb-size: 13px;
      --bc-slider-thumb-min-length: 48px;
      --bc-slider-thumb-inline-size: var(--bc-slider-thumb-size);
    }

    @supports (-moz-appearance: none) {
      ${selectors(scrollTargets)} {
        scrollbar-color: var(--bc-color-surface-raised) var(--bc-color-control);
        scrollbar-width: thin;
      }
    }

    ${selectors(scrollTargets, "::-webkit-scrollbar")} {
      width: var(--bc-slider-thumb-size);
      height: var(--bc-slider-thumb-size);
    }

    ${selectors(scrollTargets, "::-webkit-scrollbar-track")} {
      border-radius: var(--bc-radius-pill);
      background: var(--bc-color-control);
      box-shadow: var(--bc-inset-hairline);
    }

    ${selectors(scrollTargets, "::-webkit-scrollbar-track:vertical")} {
      border-inline: calc((var(--bc-slider-thumb-size) - var(--bc-slider-track-size)) / 2) solid transparent;
      background-clip: padding-box;
    }

    ${selectors(scrollTargets, "::-webkit-scrollbar-track:horizontal")} {
      border-block: calc((var(--bc-slider-thumb-size) - var(--bc-slider-track-size)) / 2) solid transparent;
      background-clip: padding-box;
    }

    ${selectors(scrollTargets, "::-webkit-scrollbar-thumb")} {
      border: 1px solid var(--bc-color-hairline);
      border-radius: var(--bc-radius-pill);
      background: var(--bc-color-surface-raised);
      box-shadow: var(--bc-elevation-thumb);
    }

    ${selectors(scrollTargets, "::-webkit-scrollbar-thumb:vertical")} {
      min-height: var(--bc-slider-thumb-min-length);
    }

    ${selectors(scrollTargets, "::-webkit-scrollbar-thumb:horizontal")} {
      min-width: var(--bc-slider-thumb-min-length);
    }

    ${selectors(scrollTargets, "::-webkit-scrollbar-thumb:hover")} {
      background: var(--bc-color-hover);
    }

    ${selectors(scrollTargets, "::-webkit-scrollbar-button")} {
      display: none;
      width: 0;
      height: 0;
    }

    ${selectors(scrollTargets, "::-webkit-scrollbar-corner")} {
      background: transparent;
    }

    ${selectors(rangeTargets)} {
      height: calc(var(--bc-slider-thumb-size) + var(--bc-space-2));
      margin: 0;
      appearance: none;
      -webkit-appearance: none;
      background: transparent;
      cursor: ew-resize;
    }

    ${selectors(rangeTargets, "::-webkit-slider-runnable-track")} {
      height: var(--bc-slider-track-size);
      border-radius: var(--bc-radius-pill);
      background: var(--bc-color-control);
      box-shadow: var(--bc-inset-hairline);
    }

    ${selectors(rangeTargets, "::-webkit-slider-thumb")} {
      width: var(--bc-slider-thumb-inline-size);
      height: var(--bc-slider-thumb-size);
      margin-top: calc((var(--bc-slider-track-size) - var(--bc-slider-thumb-size)) / 2);
      appearance: none;
      -webkit-appearance: none;
      border: 1px solid var(--bc-color-hairline);
      border-radius: var(--bc-radius-pill);
      background: var(--bc-color-surface-raised);
      box-shadow: var(--bc-elevation-thumb);
    }

    ${selectors(rangeTargets, "::-moz-range-track")} {
      height: var(--bc-slider-track-size);
      border: 0;
      border-radius: var(--bc-radius-pill);
      background: var(--bc-color-control);
      box-shadow: var(--bc-inset-hairline);
    }

    ${selectors(rangeTargets, "::-moz-range-thumb")} {
      width: var(--bc-slider-thumb-inline-size);
      height: var(--bc-slider-thumb-size);
      border: 1px solid var(--bc-color-hairline);
      border-radius: var(--bc-radius-pill);
      background: var(--bc-color-surface-raised);
      box-shadow: var(--bc-elevation-thumb);
    }

    ${selectors(rangeTargets, ":hover::-webkit-slider-thumb")},
    ${selectors(rangeTargets, ":hover::-moz-range-thumb")} {
      background: var(--bc-color-hover);
    }

    ${selectors(rangeTargets, ":disabled")} {
      cursor: not-allowed;
      opacity: .58;
    }
  `;
}
