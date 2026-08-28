export function betterCodexComponentStylesCss() {
  return String.raw`
    [data-bc-component="empty-state"] {
      display: flex;
      width: min(520px, 100%);
      box-sizing: border-box;
      flex-direction: column;
      align-items: center;
      margin: 16vh auto 0;
      padding: var(--bc-space-4);
      text-align: center;
    }

    [data-bc-component="empty-state"] > svg {
      width: calc(var(--bc-icon-md) * 2);
      height: calc(var(--bc-icon-md) * 2);
      margin-bottom: var(--bc-space-3);
      color: var(--bc-color-text-faint);
    }

    [data-bc-component="empty-state"] > strong {
      font-size: var(--bc-text-md);
    }

    [data-bc-component="empty-state"] > p {
      max-width: 44ch;
      margin: var(--bc-space-2) 0 0;
      color: var(--bc-color-text-muted);
      font-size: var(--bc-text-sm);
      line-height: var(--bc-leading-relaxed);
    }

    [data-bc-component="empty-state"] > [data-bc-component="button"] {
      margin-top: var(--bc-space-4);
    }

    [data-bc-component="empty-state"][data-bc-size="narrow"] {
      margin-top: var(--bc-space-7);
      padding-inline: var(--bc-space-3);
    }

    [data-bc-component="inline-feedback"] {
      display: block;
      box-sizing: border-box;
      border-radius: var(--bc-radius-sm);
      padding: var(--bc-space-2) var(--bc-space-3);
      color: var(--bc-color-info);
      background: color-mix(in oklch, var(--bc-color-info) 10%, var(--bc-color-surface));
      font-size: var(--bc-text-sm);
      line-height: var(--bc-leading-body);
    }

    [data-bc-component="inline-feedback"][data-bc-variant="success"] {
      color: var(--bc-color-success);
      background: color-mix(in oklch, var(--bc-color-success) 10%, var(--bc-color-surface));
    }

    [data-bc-component="inline-feedback"][data-bc-variant="warning"] {
      color: var(--bc-color-warning);
      background: color-mix(in oklch, var(--bc-color-warning) 10%, var(--bc-color-surface));
    }

    [data-bc-component="inline-feedback"][data-bc-variant="error"] {
      color: var(--bc-color-danger);
      background: var(--bc-color-danger-soft);
    }

    [data-bc-component="field-shell"] {
      display: grid;
      min-width: 0;
      gap: var(--bc-space-1);
      color: var(--bc-color-text);
    }

    [data-bc-component="field-shell"] [data-bc-field-label],
    [data-bc-component="field-shell"] > span:first-child > strong {
      font-size: var(--bc-text-sm);
      font-weight: 600;
    }

    [data-bc-component="field-shell"] [data-bc-field-label][data-required="true"]::after {
      margin-left: var(--bc-space-1);
      color: var(--bc-color-danger);
      content: "*";
    }

    [data-bc-component="field-shell"] [data-bc-field-message="description"],
    [data-bc-component="field-shell"] > span:first-child > small {
      color: var(--bc-color-text-muted);
      font-size: var(--bc-text-caption);
    }

    [data-bc-component="field-shell"] [data-bc-field-message="error"] {
      color: var(--bc-color-danger);
    }

    [data-bc-component="field-shell"][data-bc-state="disabled"] {
      color: var(--bc-color-text-faint);
    }

    [data-bc-component="dialog"] {
      color: var(--bc-color-text);
      background: var(--bc-color-surface-raised);
    }

    [data-bc-component="dialog"]::backdrop {
      background: var(--bc-color-scrim);
    }

    [data-bc-component="menu"] {
      z-index: var(--bc-z-menu);
      color: var(--bc-color-text);
      background: var(--bc-color-surface-raised);
      box-shadow: var(--bc-elevation-menu);
    }

    [data-bc-component="notice"] {
      display: flex;
      align-items: flex-start;
      gap: var(--bc-space-3);
      border-radius: var(--bc-radius-md);
      padding: var(--bc-space-3);
      color: var(--bc-color-text);
      background: var(--bc-color-surface-raised);
      box-shadow: var(--bc-elevation-float);
    }

    [data-bc-component="notice"] > p {
      flex: 1;
      margin: 0;
    }

    [data-bc-component="notice"][data-bc-variant="error"] {
      color: var(--bc-color-danger);
    }

    #better-codex-dialog[data-mode="agent"] {
      width: min(691px, calc(100vw - 48px));
      height: min(var(--bc-dialog-agent-height), calc(100vh - 48px));
    }

    #better-codex-dialog .better-codex-agent-avatar.is-fallback {
      border-radius: var(--bc-radius-xs);
      color: var(--bc-color-text-muted);
      background: var(--bc-color-control);
    }

    #better-codex-dialog .better-codex-agent-avatar.is-fallback svg {
      width: 12px;
      height: 12px;
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
      padding: var(--bc-space-6) var(--bc-space-6) 0;
    }

    #better-codex-archive-dialog header {
      display: flex;
      min-height: var(--bc-control-height);
      align-items: center;
      justify-content: space-between;
      gap: var(--bc-space-3);
      margin-bottom: var(--bc-space-3);
      padding: 0;
    }

    #better-codex-archive-dialog header h1 {
      display: inline-flex;
      align-items: center;
      margin: 0;
      font-size: var(--bc-text-lg);
      font-weight: 650;
      line-height: 1.2;
    }

    #better-codex-archive-dialog .better-codex-archive-delete-all {
      display: inline-flex;
      height: var(--bc-control-height);
      align-items: center;
      gap: 6px;
      border: 0;
      border-radius: var(--bc-radius-xs);
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
      margin-bottom: var(--bc-space-4);
    }

    #better-codex-archive-dialog .better-codex-archive-search,
    #better-codex-archive-dialog .better-codex-archive-filter {
      display: flex;
      box-sizing: border-box;
      align-items: center;
      gap: 9px;
      height: var(--bc-control-height);
      border: 1px solid transparent;
      border-radius: var(--bc-radius-xs);
      color: var(--bc-color-text);
      background: var(--bc-color-surface);
      box-shadow: none;
      padding-inline: var(--bc-control-padding);
      font: inherit;
      font-size: var(--bc-text-md);
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
      border: 1px solid transparent;
      border-radius: var(--bc-radius-sm);
      padding: var(--bc-space-1);
      background: var(--bc-color-surface-raised);
      box-shadow: var(--bc-elevation-menu);
    }

    #better-codex-archive-dialog .better-codex-archive-project-menu button {
      display: flex;
      min-height: var(--bc-control-height);
      align-items: center;
      gap: 8px;
      width: 100%;
      border: 0;
      border-radius: var(--bc-radius-xs);
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
      gap: var(--bc-space-4);
    }

    #better-codex-archive-dialog .better-codex-archive-end-spacer {
      height: var(--bc-space-6);
      flex: 0 0 var(--bc-space-6);
      margin-top: calc(-1 * var(--bc-space-6));
    }

    #better-codex-archive-dialog .better-codex-archive-group {
      display: flex;
      flex-direction: column;
      gap: var(--bc-space-1);
      border-radius: var(--bc-radius-md);
      background: color-mix(in oklch, var(--bc-color-hover) 70%, transparent);
      padding: var(--bc-space-2);
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
      min-height: var(--bc-control-height);
      gap: var(--bc-space-2);
      padding-left: var(--bc-space-1);
    }

    #better-codex-archive-dialog .better-codex-archive-project-name {
      min-width: 0;
      width: max-content;
      max-width: 100%;
      justify-self: start;
      gap: var(--bc-space-2);
      border: 0;
      border-radius: var(--bc-radius-xs);
      color: var(--bc-color-text);
      background: transparent;
      padding: 0 var(--bc-space-1);
      font: inherit;
      text-align: start;
      cursor: pointer;
    }

    #better-codex-archive-dialog .better-codex-archive-project-name svg {
      width: var(--bc-icon-sm);
      height: var(--bc-icon-sm);
      color: var(--bc-color-text);
    }

    #better-codex-archive-dialog .better-codex-archive-project-name strong {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-size: var(--bc-text-md);
      font-weight: 600;
    }

    #better-codex-archive-dialog .better-codex-archive-project-count {
      color: var(--bc-color-text-muted);
      font-size: var(--bc-text-sm);
    }

    #better-codex-archive-dialog .better-codex-archive-more {
      display: inline-flex;
      width: var(--bc-control-height);
      height: var(--bc-control-height);
      flex: 0 0 auto;
      align-items: center;
      justify-content: center;
      border: 0;
      border-radius: var(--bc-radius-xs);
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
      display: flex;
      overflow: visible;
      flex-direction: column;
      gap: var(--bc-space-2);
      border: 0;
      border-radius: var(--bc-radius-md);
      background: transparent;
      box-shadow: none;
    }

    #better-codex-archive-dialog .better-codex-archive-row {
      min-width: 0;
      display: grid;
      grid-template-columns: minmax(0, 1fr) max-content;
      gap: var(--bc-space-3);
      border: 1px solid var(--bc-color-hairline);
      border-radius: var(--bc-radius-md);
      color: var(--bc-color-text);
      background: var(--bc-color-canvas);
      padding: var(--bc-space-3) var(--bc-space-4);
      box-shadow: var(--bc-elevation-card);
      transition: transform var(--bc-motion-fast) var(--bc-ease-out), border-color var(--bc-motion-fast) ease-out, box-shadow var(--bc-motion-fast) ease-out;
    }

    #better-codex-archive-dialog .better-codex-archive-row + .better-codex-archive-row {
      border-top: 1px solid var(--bc-color-hairline);
    }

    #better-codex-archive-dialog .better-codex-archive-row-copy {
      display: flex;
      min-width: 0;
      flex: 1;
      flex-direction: column;
      gap: var(--bc-space-1);
    }

    #better-codex-archive-dialog .better-codex-archive-row-copy strong {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-size: var(--bc-text-md);
      font-weight: 550;
    }

    #better-codex-archive-dialog .better-codex-archive-row-copy span {
      color: var(--bc-color-text-muted);
      font-size: var(--bc-text-sm);
    }

    #better-codex-archive-dialog .better-codex-archive-row-actions {
      width: auto;
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
      border-radius: var(--bc-radius-xs);
      color: var(--bc-color-text-muted);
      background: transparent;
      font: inherit;
      font-size: var(--bc-text-md);
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
      #better-codex-archive-dialog .better-codex-archive-project-name:hover { background: var(--bc-color-hover); }
      #better-codex-archive-dialog .better-codex-archive-trash:hover { background: var(--bc-color-hover); }
      #better-codex-archive-dialog .better-codex-archive-more:hover { background: var(--bc-color-hover); }
      #better-codex-archive-dialog .better-codex-archive-restore:hover { background: var(--bc-color-hover); }
      #better-codex-archive-dialog .better-codex-archive-row:hover { border-color: color-mix(in srgb, var(--bc-color-text) 16%, var(--bc-color-hairline)); box-shadow: var(--bc-elevation-control); }
    }

    @media (max-width: 900px) {
      #better-codex-archive-dialog .better-codex-archive-shell { padding-inline: var(--bc-space-5); }
      #better-codex-archive-dialog .better-codex-archive-row { padding-inline: var(--bc-space-3); }
    }

    @media (max-width: 720px) {
      #better-codex-archive-dialog { width: calc(100vw - 24px); height: calc(100vh - 24px); max-height: calc(100vh - 24px); border-radius: var(--bc-radius-lg); }
      #better-codex-archive-dialog .better-codex-archive-shell { padding: var(--bc-space-4) var(--bc-space-4) 0; }
      #better-codex-archive-dialog .better-codex-archive-end-spacer { height: var(--bc-space-4); flex-basis: var(--bc-space-4); }
      #better-codex-archive-dialog header { margin-bottom: var(--bc-space-4); }
      #better-codex-archive-dialog header h1 { font-size: var(--bc-text-lg); }
      #better-codex-archive-dialog .better-codex-archive-toolbar { grid-template-columns: 1fr; align-items: stretch; margin: 0 0 var(--bc-space-4); }
      #better-codex-archive-dialog .better-codex-archive-search,
      #better-codex-archive-dialog .better-codex-archive-project-filter { width: auto; }
      #better-codex-archive-dialog .better-codex-archive-row { grid-template-columns: minmax(0, 1fr) max-content; grid-template-areas: "title title" "meta actions"; column-gap: var(--bc-space-2); row-gap: var(--bc-space-1); padding: var(--bc-space-2) var(--bc-space-3); }
      #better-codex-archive-dialog .better-codex-archive-row-copy { display: contents; }
      #better-codex-archive-dialog .better-codex-archive-row-copy strong { grid-area: title; }
      #better-codex-archive-dialog .better-codex-archive-row-copy span { min-width: 0; grid-area: meta; overflow: hidden; white-space: nowrap; }
      #better-codex-archive-dialog .better-codex-archive-row-actions { grid-area: actions; width: auto; justify-content: flex-end; }
    }

  `;
}
