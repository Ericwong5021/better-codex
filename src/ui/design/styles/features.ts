export function betterCodexFeatureStructureStylesCss() {
  return String.raw`
    #better-codex-panel .better-codex-error { margin-left: auto; color: var(--bc-color-danger); font-size: var(--bc-text-sm); }
    #better-codex-panel .better-codex-error[data-tone="warning"] { color: var(--bc-color-warning); }
    #better-codex-panel .better-codex-error[data-tone="info"] { color: var(--bc-color-info); }
    #better-codex-panel .better-codex-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 10px; min-height: 50px; padding: 0 18px; background: var(--bc-color-canvas); }
    #better-codex-panel .better-codex-tabs, #better-codex-panel .better-codex-actions { display: flex; align-items: center; gap: 4px; }
    #better-codex-panel .better-codex-button, #better-codex-dialog .better-codex-button { display: inline-flex; flex: 0 0 auto; width: auto; min-height: var(--bc-control-height); align-items: center; justify-content: center; gap: 6px; border: 1px solid transparent; border-radius: var(--bc-radius-xs); color: var(--bc-color-text-muted); background: transparent; padding: 0 9px; font: inherit; font-size: var(--bc-text-md); cursor: pointer; }
    #better-codex-panel .better-codex-button:hover, #better-codex-dialog .better-codex-button:hover { background: var(--bc-color-hover); }
    #better-codex-panel .better-codex-button.is-active { color: var(--bc-color-text); background: var(--bc-color-hover); font-weight: 550; }
    #better-codex-panel .better-codex-button.is-bordered { border-color: transparent; background: var(--bc-color-surface); box-shadow: var(--bc-elevation-control); }
    #better-codex-panel .better-codex-working-chip.has-work { border-color: color-mix(in oklch,var(--bc-color-warning) 35%,transparent); color: color-mix(in oklch,var(--bc-color-warning) 72%,var(--bc-color-text)); background: color-mix(in oklch,var(--bc-color-warning) 9%,var(--bc-color-surface)); }
    #better-codex-panel .better-codex-working-dot { width: 6px; height: 6px; margin-right: 6px; border-radius: var(--bc-radius-pill); background: currentColor; box-shadow: 0 0 0 3px color-mix(in oklch,var(--bc-color-warning) 12%,transparent); }
    #better-codex-panel .better-codex-search { box-sizing: border-box; width: 142px; height: var(--bc-control-height); border: 1px solid transparent; border-radius: var(--bc-radius-xs); color: inherit; background: var(--bc-color-surface); padding: 0 9px; font: inherit; font-size: var(--bc-text-md); outline: none; }
    #better-codex-panel .better-codex-search:focus { border-color: var(--bc-color-focus); box-shadow: var(--bc-focus-ring); }
    #better-codex-panel .better-codex-filter-wrap { position: relative; display: flex; }
    #better-codex-panel .better-codex-filter-menu, #better-codex-panel .better-codex-filter-submenu { position: absolute; z-index: 80; box-sizing: border-box; min-width: 164px; border: 1px solid transparent; border-radius: var(--bc-radius-sm); color: var(--bc-color-text); background: var(--bc-color-surface-raised); padding: 5px; box-shadow: var(--bc-elevation-menu); }
    #better-codex-panel .better-codex-filter-menu { top: calc(100% + 5px); right: 0; }
    #better-codex-panel .better-codex-filter-submenu { min-width: 190px; }
    #better-codex-panel .better-codex-filter-row { display: flex; width: 100%; min-height: 32px; align-items: center; gap: 9px; border: 0; border-radius: 6px; color: inherit; background: transparent; padding: 0 8px; font: inherit; font-size: var(--bc-text-md); text-align: left; cursor: pointer; }
    #better-codex-panel .better-codex-filter-row:hover, #better-codex-panel .better-codex-filter-row.is-active { background: var(--bc-color-hover); }
    #better-codex-panel .better-codex-filter-row svg { flex: 0 0 auto; }
    #better-codex-panel .better-codex-filter-label { min-width: 0; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    #better-codex-panel .better-codex-filter-count { color: var(--bc-color-text-muted); font-size: var(--bc-text-caption); }
    #better-codex-panel .better-codex-filter-chevron { color: var(--bc-color-text-muted); font-size: var(--bc-text-icon); }
    #better-codex-panel .better-codex-filter-check { width: 14px; color: var(--bc-color-text); font-size: var(--bc-text-md); }
    #better-codex-panel .better-codex-filter-separator { height: 1px; margin: 4px 2px; background: var(--bc-color-hairline); }
    #better-codex-context-menu, #better-codex-context-menu .better-codex-context-submenu { box-sizing: border-box; width: max-content; border: 1px solid transparent; border-radius: var(--bc-radius-sm); color: var(--bc-color-text); background: var(--bc-color-surface-raised); padding: 5px; box-shadow: var(--bc-elevation-menu); font-family: var(--bc-font-ui); }
    #better-codex-context-menu { position: fixed; z-index: 110; min-width: 188px; max-width: min(280px, calc(100vw - 24px)); }
    #better-codex-context-menu .better-codex-context-item-wrap { position: relative; }
    #better-codex-context-menu .better-codex-context-item { display: flex; width: 100%; min-height: 34px; align-items: center; gap: 9px; border: 0; border-radius: 6px; color: inherit; background: transparent; padding: 0 10px; font: inherit; font-size: var(--bc-text-md); text-align: left; cursor: pointer; white-space: nowrap; }
    #better-codex-context-menu .better-codex-context-item:hover, #better-codex-context-menu .better-codex-context-item:focus-visible, #better-codex-context-menu .better-codex-context-item-wrap:hover > .better-codex-context-item { background: var(--bc-color-hover); outline: none; }
    #better-codex-context-menu .better-codex-context-item > span:last-of-type { min-width: 0; flex: 1; }
    #better-codex-context-menu .better-codex-status-icon, #better-codex-context-menu .better-codex-priority { width: 16px; height: 16px; flex: 0 0 auto; }
    #better-codex-context-menu .better-codex-context-item.is-danger { color: var(--bc-color-danger); }
    #better-codex-context-menu .better-codex-context-divider { height: 1px; margin: 5px 3px; background: var(--bc-color-hairline); }
    #better-codex-context-menu .better-codex-context-submenu { position: absolute; top: -5px; left: 100%; z-index: var(--bc-z-menu); display: none; min-width: 148px; max-width: min(240px, calc(100vw - 24px)); max-height: min(320px, calc(100vh - 24px)); overflow-y: auto; }
    #better-codex-context-menu .better-codex-context-submenu.is-assignee { min-width: 214px; }
    #better-codex-context-menu .better-codex-context-item-wrap:hover > .better-codex-context-submenu, #better-codex-context-menu .better-codex-context-item-wrap:focus-within > .better-codex-context-submenu { display: block; }
    #better-codex-context-menu .better-codex-context-check { display: inline-flex; width: 14px; flex: 0 0 14px; align-items: center; justify-content: center; color: var(--bc-color-text); }
    #better-codex-context-menu .better-codex-context-avatar { display: inline-flex; width: 16px; height: 16px; flex: 0 0 16px; align-items: center; justify-content: center; overflow: hidden; border-radius: var(--bc-radius-pill); color: var(--bc-color-on-primary); background: var(--bc-color-primary); }
    #better-codex-context-menu .better-codex-context-avatar.is-codex { color: inherit; background: transparent; border-radius: 4px; }
    #better-codex-context-menu .better-codex-context-avatar.is-fallback, #better-codex-context-menu .better-codex-context-avatar.is-icon { color: var(--bc-color-text-muted); background: var(--bc-color-hover); }
    #better-codex-context-menu .better-codex-context-avatar img, #better-codex-context-menu .better-codex-context-avatar svg { display: block; width: 100%; height: 100%; object-fit: cover; }
    #better-codex-context-menu .better-codex-context-avatar.is-fallback svg, #better-codex-context-menu .better-codex-context-avatar.is-icon svg { width: 10px; height: 10px; margin: auto; }
    #better-codex-context-menu .better-codex-context-avatar.is-user.is-initials { color: var(--bc-color-on-avatar); font-size: 9px; font-weight: 700; line-height: 1; }
    #better-codex-context-menu .better-codex-context-assignee-label { display: inline-flex; min-width: 0; flex: 1; align-items: center; gap: 5px; overflow: hidden; }
    #better-codex-context-menu .better-codex-context-assignee-name { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    #better-codex-context-menu .better-codex-context-tag { flex: 0 0 auto; border-radius: 999px; padding: 1px 5px; font-size: 10px; font-weight: 650; line-height: 1.25; }
    #better-codex-context-menu .better-codex-context-tag[data-tone="model"] { color: var(--bc-color-info); background: color-mix(in oklch,var(--bc-color-info) 10%,transparent); }
    #better-codex-context-menu .better-codex-context-tag[data-tone="reasoning"] { color: var(--bc-color-success); background: color-mix(in oklch,var(--bc-color-success) 10%,transparent); }
    #better-codex-panel .better-codex-board { display: flex; gap: 12px; min-height: 0; flex: 1; overflow-x: auto; overflow-y: hidden; padding: 0 16px 10px; }
    #better-codex-panel .better-codex-board-loading { display: flex; min-width: 100%; min-height: 100%; align-items: center; justify-content: center; flex-direction: column; gap: 12px; color: var(--bc-color-text-muted); font-size: var(--bc-text-sm); }
    #better-codex-panel .better-codex-board-loading > span { width: 24px; height: 24px; box-sizing: border-box; border: 2px solid transparent; border-top-color: var(--bc-color-text); border-radius: 50%; animation: better-codex-board-loading-spin .8s linear infinite; }
    #better-codex-panel .better-codex-board-loading strong { font-weight: 560; }
    @keyframes better-codex-board-loading-spin { to { transform: rotate(360deg); } }
    #better-codex-panel .better-codex-column { box-sizing: border-box; display: flex; width: 280px; min-width: 280px; min-height: 200px; flex-direction: column; border-radius: 12px; padding: 8px; }
    #better-codex-panel .better-codex-column[data-status="backlog"], #better-codex-panel .better-codex-column[data-status="todo"], #better-codex-panel .better-codex-column[data-status="archive"] { background: color-mix(in oklch,var(--bc-color-hover) 70%,transparent); }
    #better-codex-panel .better-codex-column[data-status="in_progress"] { background: color-mix(in oklch,var(--bc-color-warning) 8%,transparent); }
    #better-codex-panel .better-codex-column[data-status="in_review"] { background: color-mix(in oklch,var(--bc-color-success) 8%,transparent); }
    #better-codex-panel .better-codex-column[data-status="done"] { background: color-mix(in oklch,var(--bc-color-info) 8%,transparent); }
    #better-codex-panel .better-codex-column[data-status="blocked"] { background: color-mix(in oklch,var(--bc-color-danger) 8%,transparent); }
    #better-codex-panel .better-codex-column-head { display: flex; min-height: 30px; align-items: center; justify-content: space-between; padding: 0 0 6px; font-size: var(--bc-text-md); font-weight: 600; }
    #better-codex-panel .better-codex-column-title, #better-codex-panel .better-codex-column-actions { display: flex; align-items: center; gap: 6px; }
    #better-codex-panel #better-codex-filter > svg { color: var(--bc-color-info); }
    #better-codex-panel .better-codex-status-icon, #better-codex-context-menu .better-codex-status-icon, #better-codex-dialog .better-codex-status-icon { width: 14px; height: 14px; color: var(--bc-color-text-muted); }
    #better-codex-panel .better-codex-status-icon[data-status="in_progress"], #better-codex-panel [data-status="in_progress"] .better-codex-status-icon, #better-codex-context-menu .better-codex-status-icon[data-status="in_progress"], #better-codex-dialog .better-codex-status-icon[data-status="in_progress"] { color: var(--bc-color-warning); }
    #better-codex-panel .better-codex-status-icon[data-status="in_review"], #better-codex-panel [data-status="in_review"] .better-codex-status-icon, #better-codex-context-menu .better-codex-status-icon[data-status="in_review"], #better-codex-dialog .better-codex-status-icon[data-status="in_review"] { color: var(--bc-color-success); }
    #better-codex-panel .better-codex-status-icon[data-status="done"], #better-codex-panel [data-status="done"] .better-codex-status-icon, #better-codex-context-menu .better-codex-status-icon[data-status="done"], #better-codex-dialog .better-codex-status-icon[data-status="done"] { color: var(--bc-color-info); }
    #better-codex-panel .better-codex-status-icon[data-status="blocked"], #better-codex-panel [data-status="blocked"] .better-codex-status-icon, #better-codex-context-menu .better-codex-status-icon[data-status="blocked"], #better-codex-dialog .better-codex-status-icon[data-status="blocked"] { color: var(--bc-color-danger); }
    #better-codex-panel .better-codex-column-icon { width: 24px; height: 24px; border: 0; border-radius: 999px; color: var(--bc-color-text-muted); background: transparent; padding: 0; font-size: var(--bc-text-icon-lg); line-height: 20px; cursor: pointer; }
    #better-codex-panel .better-codex-column-icon:hover { background: var(--bc-color-hover); }
    #better-codex-panel .better-codex-cards { min-height: 0; flex: 1; overflow-y: auto; padding: 0; border-radius: 8px; }
    #better-codex-panel .better-codex-card { box-sizing: border-box; width: 100%; margin-bottom: 8px; border: 1px solid var(--bc-color-hairline); border-radius: var(--bc-radius-xs); background: var(--bc-color-canvas); padding: 12px 10px; box-shadow: var(--bc-elevation-card); cursor: pointer; transition: border-color .15s, box-shadow .15s, transform .15s; }
    @media (hover: none), (pointer: coarse) { #better-codex-panel .better-codex-card { -webkit-touch-callout: none; user-select: none; } }
    #better-codex-panel .better-codex-card:hover { border-color: color-mix(in srgb, var(--bc-color-text) 16%, var(--bc-color-hairline)); background: var(--bc-color-canvas); box-shadow: var(--bc-elevation-card), var(--bc-elevation-control); }
    #better-codex-panel .better-codex-card.is-enrichment-pending { cursor: wait; opacity: .76; }
    #better-codex-panel .better-codex-card.is-enrichment-pending:hover { border-color: var(--bc-color-hairline); box-shadow: var(--bc-elevation-card); }
    #better-codex-panel .better-codex-card:active { transform: scale(.995); }
    #better-codex-panel .better-codex-card-row, #better-codex-panel .better-codex-card-id, #better-codex-panel .better-codex-card-meta { display: flex; align-items: center; }
    #better-codex-panel .better-codex-card-row { justify-content: space-between; gap: 8px; }
    #better-codex-panel .better-codex-card-id { min-width: 0; gap: 6px; color: var(--bc-color-text-muted); font-size: var(--bc-text-sm); }
    #better-codex-panel .better-codex-priority { width: 14px; height: 14px; flex: 0 0 auto; }
    #better-codex-panel .better-codex-priority, #better-codex-context-menu .better-codex-priority, #better-codex-dialog .better-codex-priority { color: var(--bc-priority-none); }
    #better-codex-panel .better-codex-priority[data-priority="none"], #better-codex-context-menu .better-codex-priority[data-priority="none"], #better-codex-dialog .better-codex-priority[data-priority="none"] { color: var(--bc-priority-none); }
    #better-codex-panel .better-codex-priority[data-priority="low"], #better-codex-context-menu .better-codex-priority[data-priority="low"], #better-codex-dialog .better-codex-priority[data-priority="low"] { color: var(--bc-priority-low); }
    #better-codex-panel .better-codex-priority[data-priority="medium"], #better-codex-context-menu .better-codex-priority[data-priority="medium"], #better-codex-dialog .better-codex-priority[data-priority="medium"] { color: var(--bc-priority-medium); }
    #better-codex-panel .better-codex-priority[data-priority="high"], #better-codex-context-menu .better-codex-priority[data-priority="high"], #better-codex-dialog .better-codex-priority[data-priority="high"] { color: var(--bc-priority-high); }
    #better-codex-panel .better-codex-priority[data-priority="urgent"], #better-codex-context-menu .better-codex-priority[data-priority="urgent"], #better-codex-dialog .better-codex-priority[data-priority="urgent"] { color: var(--bc-priority-urgent); }
    #better-codex-panel .better-codex-card-title { display: -webkit-box; margin: 5px 0 0; overflow: hidden; color: var(--bc-color-text); font-size: var(--bc-text-md); font-weight: 550; line-height: 1.38; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }
    #better-codex-panel .better-codex-card-description { margin-top: 4px; overflow: hidden; color: var(--bc-color-text-muted); font-size: var(--bc-text-sm); line-height: 1.35; text-overflow: ellipsis; white-space: nowrap; }
    #better-codex-panel .better-codex-chip-row { display: flex; align-items: center; flex-wrap: wrap; gap: 6px; margin-top: 7px; }
    #better-codex-panel .better-codex-chip { display: inline-flex; max-width: 155px; align-items: center; gap: 4px; overflow: hidden; border-radius: var(--bc-radius-pill); background: var(--bc-color-hover); padding: 2px 6px; color: var(--bc-color-text-muted); font-size: var(--bc-text-caption); text-overflow: ellipsis; white-space: nowrap; }
    #better-codex-panel .better-codex-chip > svg { width: 11px; height: 11px; flex: 0 0 auto; }
    #better-codex-panel .better-codex-chip > span { min-width: 0; overflow: hidden; text-overflow: ellipsis; }
    #better-codex-panel .better-codex-card-meta { justify-content: space-between; gap: 8px; margin-top: 8px; color: var(--bc-color-text-muted); font-size: var(--bc-text-sm); }
    #better-codex-panel .better-codex-card-assignee { display: inline-flex; min-width: 0; align-items: center; gap: 5px; overflow: hidden; color: var(--bc-color-text-muted); }
    #better-codex-panel .better-codex-card-assignee > span:last-child { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    #better-codex-panel .better-codex-card-assignee > svg { width: 12px; height: 12px; flex: 0 0 auto; }
    #better-codex-panel .better-codex-card-avatar { display: inline-flex; width: 16px; height: 16px; flex: 0 0 auto; align-items: center; justify-content: center; overflow: hidden; border-radius: var(--bc-radius-pill); color: var(--bc-color-on-primary); background: var(--bc-color-primary); }
    #better-codex-panel .better-codex-card-avatar.is-codex { color: inherit; background: transparent; border-radius: 4px; }
    #better-codex-panel .better-codex-card-avatar.is-fallback, #better-codex-panel .better-codex-card-avatar.is-icon { color: var(--bc-color-text-muted); background: var(--bc-color-hover); }
    #better-codex-panel .better-codex-card-avatar img, #better-codex-panel .better-codex-card-avatar svg { width: 100%; height: 100%; display: block; object-fit: cover; }
    #better-codex-panel .better-codex-card-avatar.is-fallback svg, #better-codex-panel .better-codex-card-avatar.is-icon svg { width: 10px; height: 10px; margin: auto; }
    #better-codex-panel .better-codex-card-avatar.is-user.is-initials { color: var(--bc-color-on-avatar); font-size: 9px; font-weight: 700; line-height: 1; }
    #better-codex-panel .better-codex-link { overflow: hidden; border: 0; color: var(--bc-color-info); background: transparent; padding: 0; font: inherit; text-overflow: ellipsis; white-space: nowrap; cursor: pointer; }
    #better-codex-panel .better-codex-link:hover { text-decoration: underline; }
    #better-codex-panel .better-codex-activity { display: inline-flex; align-items: center; gap: 5px; flex: 0 0 auto; font-size: var(--bc-text-caption); font-weight: 600; }
    #better-codex-panel .better-codex-activity-dot { width: 6px; height: 6px; flex: 0 0 auto; border-radius: 999px; background: currentColor; }
    #better-codex-panel .better-codex-avatar { display: inline-flex; width: 16px; height: 16px; align-items: center; justify-content: center; border: 1.5px solid var(--bc-color-canvas); border-radius: var(--bc-radius-pill); color: var(--bc-color-on-primary); background: var(--bc-color-primary); font-size: var(--bc-text-avatar); }
    #better-codex-panel .better-codex-activity[data-run="running"], #better-codex-panel .better-codex-activity[data-run="scheduling"], #better-codex-panel .better-codex-activity[data-run="thinking"] { color: var(--bc-color-text-muted); }
    #better-codex-panel .better-codex-activity[data-run="scheduler-failed"] { color: var(--bc-color-danger); }
    #better-codex-panel .better-codex-activity[data-run="completed"] { color: var(--bc-color-success); }
    #better-codex-panel .better-codex-activity[data-run="failed"] { color: var(--bc-color-danger); }
    #better-codex-panel .better-codex-activity[data-run="interrupted"] { color: var(--bc-color-danger); }
    #better-codex-panel .better-codex-activity[data-run="not-started"] { color: var(--bc-color-text-muted); font-weight: 500; }
    #better-codex-panel .better-codex-activity[data-run="completed"], #better-codex-panel .better-codex-activity[data-run="interrupted"] { font-weight: 500; }
    #better-codex-panel .better-codex-activity[data-run="claimed"] { color: var(--bc-color-text-muted); opacity: .62; }
    @keyframes better-codex-shimmer { 0% { background-position: 200% 0 } 100% { background-position: -200% 0 } }
    #better-codex-panel .better-codex-shimmer { background-image: linear-gradient(90deg,var(--bc-color-text-muted) 0%,var(--bc-color-text-muted) 35%,var(--bc-color-text) 50%,var(--bc-color-text-muted) 65%,var(--bc-color-text-muted) 100%); background-size: 200% 100%; background-clip: text; -webkit-background-clip: text; color: transparent; -webkit-text-fill-color: transparent; animation: better-codex-shimmer 2.5s linear infinite; }
    #better-codex-panel .better-codex-empty { padding: 18px 4px; text-align: center; color: var(--bc-color-text-faint); font-size: var(--bc-text-sm); }
    #better-codex-panel .better-codex-project-heading, #better-codex-panel .better-codex-project-actions { display: none; align-items: center; gap: 8px; }
    #better-codex-panel .better-codex-project-heading { min-width: 0; }
    #better-codex-panel .better-codex-project-heading strong { overflow: hidden; font-size: var(--bc-text-md); font-weight: 650; text-overflow: ellipsis; white-space: nowrap; }
    #better-codex-panel .better-codex-project-heading span { flex: 0 0 auto; color: var(--bc-color-text-muted); font-size: var(--bc-text-sm); }
    #better-codex-panel .better-codex-project-heading .better-codex-project-back { min-height: 32px; margin-left: -8px; padding: 0 8px; }
    #better-codex-panel .better-codex-project-breadcrumb { display: flex; min-width: 0; align-items: center; gap: 7px; }
    #better-codex-panel .better-codex-project-breadcrumb button { flex: 0 0 auto; border: 0; color: var(--bc-color-text-muted); background: transparent; padding: 3px 0; font: inherit; font-size: var(--bc-text-md); cursor: pointer; }
    #better-codex-panel .better-codex-project-breadcrumb button:hover { color: var(--bc-color-text); }
    #better-codex-panel[data-surface="projects"] .better-codex-issue-only, #better-codex-panel[data-surface="projects"] .better-codex-agent-heading, #better-codex-panel[data-surface="projects"] .better-codex-agent-actions { display: none; }
    #better-codex-panel[data-surface="projects"] .better-codex-project-heading, #better-codex-panel[data-surface="projects"] .better-codex-project-actions { display: flex; }
    #better-codex-panel .better-codex-projects { display: none; min-height: 0; box-sizing: border-box; flex: 1; overflow-y: auto; padding: 18px 22px 32px; }
    #better-codex-panel[data-surface="projects"] .better-codex-projects { display: block; }
    #better-codex-panel .better-codex-scheduled-heading, #better-codex-panel .better-codex-scheduled-actions { display: none; align-items: center; gap: 8px; }
    #better-codex-panel .better-codex-scheduled-heading strong { font-size: var(--bc-text-md); font-weight: 650; }
    #better-codex-panel .better-codex-scheduled-heading span { color: var(--bc-color-text-muted); font-size: var(--bc-text-sm); }
    #better-codex-panel[data-surface="scheduled"] .better-codex-issue-only, #better-codex-panel[data-surface="scheduled"] .better-codex-agent-heading, #better-codex-panel[data-surface="scheduled"] .better-codex-agent-actions, #better-codex-panel[data-surface="scheduled"] .better-codex-project-heading, #better-codex-panel[data-surface="scheduled"] .better-codex-project-actions { display: none; }
    #better-codex-panel[data-surface="scheduled"] .better-codex-scheduled-heading, #better-codex-panel[data-surface="scheduled"] .better-codex-scheduled-actions { display: flex; }
    #better-codex-panel .better-codex-scheduled { display: none; min-height: 0; flex: 1; overflow-y: auto; padding: 18px 22px 32px; }
    #better-codex-panel[data-surface="scheduled"] .better-codex-scheduled { display: block; }
    #better-codex-panel .better-codex-project-list { display: grid; width: min(1120px,100%); margin: 0 auto; grid-template-columns: repeat(auto-fill,minmax(300px,1fr)); gap: 12px; }
    #better-codex-panel .better-codex-project-card { display: flex; min-width: 0; min-height: 152px; box-sizing: border-box; flex-direction: column; border: 0; border-radius: var(--bc-radius-lg); color: var(--bc-color-text); background: var(--bc-color-surface); padding: 16px; text-align: left; cursor: pointer; transition: transform .15s cubic-bezier(.16,1,.3,1), background-color .15s cubic-bezier(.16,1,.3,1); }
    #better-codex-panel .better-codex-project-card:active { transform: scale(.98); }
    #better-codex-panel .better-codex-project-card:focus-visible { outline: 2px solid var(--bc-color-focus); outline-offset: 2px; }
    #better-codex-panel .better-codex-project-card-head { display: flex; align-items: flex-start; gap: 11px; }
    #better-codex-panel .better-codex-project-card-icon { display: inline-flex; width: 36px; height: 36px; flex: 0 0 auto; align-items: center; justify-content: center; border-radius: var(--bc-radius-sm); color: var(--bc-color-text-muted); background: var(--bc-color-control); }
    #better-codex-panel .better-codex-project-card-icon svg { width: 18px; height: 18px; }
    #better-codex-panel .better-codex-project-card-title { min-width: 0; flex: 1; }
    #better-codex-panel .better-codex-project-card-title strong { display: block; overflow: hidden; font-size: var(--bc-text-md); font-weight: 650; text-overflow: ellipsis; white-space: nowrap; }
    #better-codex-panel .better-codex-project-card-title span { display: block; margin-top: 4px; color: var(--bc-color-text-muted); font-size: var(--bc-text-caption); }
    #better-codex-panel .better-codex-project-card-description { display: -webkit-box; margin: 13px 0 0; overflow: hidden; color: var(--bc-color-text-muted); font-size: var(--bc-text-sm); line-height: 1.65; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }
    #better-codex-panel .better-codex-project-card-path { display: flex; min-width: 0; align-items: center; gap: 6px; margin-top: auto; padding-top: 16px; color: var(--bc-color-text-faint); font-size: var(--bc-text-caption); }
    #better-codex-panel .better-codex-project-card-path svg { width: 13px; height: 13px; flex: 0 0 auto; }
    #better-codex-panel .better-codex-project-card-path span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    #better-codex-panel .better-codex-project-detail { width: min(1440px,100%); margin: 0 auto; }
    #better-codex-panel .better-codex-project-back { display: inline-flex; min-height: 36px; align-items: center; gap: 7px; border: 0; border-radius: var(--bc-radius-sm); color: var(--bc-color-text-muted); background: transparent; padding: 0 9px; font: inherit; font-size: var(--bc-text-sm); cursor: pointer; }
    #better-codex-panel .better-codex-project-back svg { width: 15px; height: 15px; transform: rotate(180deg); }
    #better-codex-panel .better-codex-project-summary { display: grid; grid-template-columns: minmax(0,1fr) minmax(260px,.7fr); gap: 24px; margin-top: 14px; border-radius: var(--bc-radius-xl); background: var(--bc-color-surface); padding: 24px; }
    #better-codex-panel .better-codex-project-summary h1 { margin: 0; font-size: var(--bc-text-xl); font-weight: 680; line-height: 1.3; text-wrap: balance; }
    #better-codex-panel .better-codex-project-eyebrow { display: block; margin-bottom: 7px; color: var(--bc-color-text-faint); font-size: var(--bc-text-caption); font-weight: 650; }
    #better-codex-panel .better-codex-project-summary p { max-width: 68ch; margin: 9px 0 0; color: var(--bc-color-text-muted); font-size: var(--bc-text-md); line-height: 1.75; text-wrap: pretty; }
    #better-codex-panel .better-codex-project-paths { display: grid; align-content: start; gap: 7px; }
    #better-codex-panel .better-codex-project-paths > strong { color: var(--bc-color-text-muted); font-size: var(--bc-text-caption); font-weight: 600; }
    #better-codex-panel .better-codex-project-path { display: flex; min-width: 0; align-items: center; gap: 7px; border-radius: var(--bc-radius-sm); color: var(--bc-color-text-muted); background: var(--bc-color-control); padding: 9px 10px; font-family: var(--bc-font-mono); font-size: var(--bc-text-caption); }
    #better-codex-panel .better-codex-project-path svg { width: 14px; height: 14px; flex: 0 0 auto; }
    #better-codex-panel .better-codex-project-path span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    #better-codex-panel .better-codex-project-columns { display: grid; height: clamp(560px,calc(100dvh - 310px),820px); grid-template-columns: minmax(280px,.62fr) minmax(560px,1.38fr); gap: 14px; margin-top: 14px; align-items: stretch; }
    #better-codex-panel .better-codex-project-panel { display: flex; min-width: 0; min-height: 0; overflow: hidden; flex-direction: column; border-radius: var(--bc-radius-lg); background: var(--bc-color-surface); }
    #better-codex-panel .better-codex-project-panel-head { display: flex; min-height: 52px; align-items: center; justify-content: space-between; gap: 12px; padding: 0 16px; }
    #better-codex-panel .better-codex-project-panel-head strong { font-size: var(--bc-text-md); font-weight: 650; }
    #better-codex-panel .better-codex-project-panel-head span { color: var(--bc-color-text-muted); font-size: var(--bc-text-caption); }
    #better-codex-panel .better-codex-project-issues { min-height: 0; flex: 1; overflow-y: auto; overscroll-behavior: contain; scrollbar-gutter: stable; padding: 0 7px 8px; }
    #better-codex-panel .better-codex-project-issues-loading { display: grid; min-height: 100%; place-content: center; justify-items: center; gap: 10px; color: var(--bc-color-text-muted); font-size: var(--bc-text-caption); }
    #better-codex-panel .better-codex-project-issues-loading > span { width: 24px; height: 24px; box-sizing: border-box; border: 2px solid var(--bc-color-hairline); border-top-color: var(--bc-color-text); border-radius: 50%; animation: better-codex-board-loading-spin .8s linear infinite; }
    #better-codex-panel .better-codex-project-issue { overflow: hidden; border-radius: var(--bc-radius-sm); }
    #better-codex-panel .better-codex-project-issue-toggle { display: grid; width: 100%; min-height: 56px; grid-template-columns: 18px minmax(0,1fr) auto; align-items: center; gap: 9px; border: 0; border-radius: inherit; color: inherit; background: transparent; padding: 8px 9px; font: inherit; text-align: left; cursor: pointer; }
    #better-codex-panel .better-codex-project-issue-toggle:focus-visible { outline: 2px solid var(--bc-color-focus); outline-offset: -2px; }
    #better-codex-panel .better-codex-project-issue-title { min-width: 0; }
    #better-codex-panel .better-codex-project-issue-title strong { display: block; overflow: hidden; font-size: var(--bc-text-sm); font-weight: 600; text-overflow: ellipsis; white-space: nowrap; }
    #better-codex-panel .better-codex-project-issue-title > span { display: flex; align-items: center; gap: 6px; margin-top: 4px; color: var(--bc-color-text-faint); font-size: var(--bc-text-caption); }
    #better-codex-panel .better-codex-project-issue-toggle > svg { width: 14px; height: 14px; color: var(--bc-color-text-faint); transition: transform .15s cubic-bezier(.16,1,.3,1); }
    #better-codex-panel .better-codex-project-issue-toggle:hover > svg { transform: translateX(2px); }
    #better-codex-panel .better-codex-project-dashboard { display: grid; align-content: start; gap: 14px; }
    #better-codex-panel .better-codex-project-dashboard-head { display: flex; min-width: 0; align-items: flex-start; justify-content: space-between; gap: 24px; padding: 4px 2px 0; }
    #better-codex-panel .better-codex-project-dashboard-actions { display: flex; flex: 0 0 auto; align-items: center; gap: 10px; }
    #better-codex-panel .better-codex-project-dashboard-delete { display: inline-flex; min-height: 32px; align-items: center; gap: 7px; border: 0; border-radius: var(--bc-radius-sm); color: var(--bc-color-text-muted); background: transparent; padding: 0 10px; font: inherit; font-size: var(--bc-text-sm); cursor: pointer; }
    #better-codex-panel .better-codex-project-dashboard-delete:hover { color: var(--bc-color-danger); background: var(--bc-color-danger-soft); }
    #better-codex-panel .better-codex-project-dashboard-delete:focus-visible { color: var(--bc-color-danger); outline: 2px solid var(--bc-color-focus); outline-offset: 2px; }
    #better-codex-panel .better-codex-project-dashboard-delete:active { transform: scale(.96); }
    #better-codex-panel .better-codex-project-dashboard-title { min-width: 0; }
    #better-codex-panel .better-codex-project-dashboard-title > div { display: flex; align-items: center; flex-wrap: wrap; gap: 9px; }
    #better-codex-panel .better-codex-project-dashboard-title h1 { margin: 0; font-size: clamp(24px,2.2vw,34px); font-weight: 680; line-height: 1.2; letter-spacing: -.025em; }
    #better-codex-panel .better-codex-project-dashboard-title p { max-width: 74ch; margin: 8px 0 0; color: var(--bc-color-text-muted); font-size: var(--bc-text-sm); line-height: 1.65; }
    #better-codex-panel .better-codex-project-dashboard-people { display: flex; flex: 0 0 auto; align-items: center; }
    #better-codex-panel .better-codex-project-dashboard-avatar { display: inline-flex; width: 32px; height: 32px; box-sizing: border-box; align-items: center; justify-content: center; overflow: hidden; margin-left: -7px; border: 2px solid var(--bc-color-canvas); border-radius: 999px; color: var(--bc-color-text-muted); background: var(--bc-color-control); font-size: 11px; font-weight: 700; }
    #better-codex-panel .better-codex-project-dashboard-avatar:first-child { margin-left: 0; }
    #better-codex-panel .better-codex-project-dashboard-avatar img, #better-codex-panel .better-codex-project-dashboard-avatar svg { display: block; width: 100%; height: 100%; object-fit: cover; }
    #better-codex-panel .better-codex-project-dashboard-avatar.is-icon svg, #better-codex-panel .better-codex-project-dashboard-avatar.is-fallback svg { width: 16px; height: 16px; }
    #better-codex-panel .better-codex-project-dashboard-avatar.is-icon[data-tone="info"] { color: var(--bc-color-info); background: color-mix(in oklch,var(--bc-color-info) 14%,var(--bc-color-surface)); }
    #better-codex-panel .better-codex-project-dashboard-avatar.is-icon[data-tone="success"] { color: var(--bc-color-success); background: color-mix(in oklch,var(--bc-color-success) 14%,var(--bc-color-surface)); }
    #better-codex-panel .better-codex-project-dashboard-avatar.is-icon[data-tone="warning"] { color: var(--bc-color-warning); background: color-mix(in oklch,var(--bc-color-warning) 16%,var(--bc-color-surface)); }
    #better-codex-panel .better-codex-project-dashboard-avatar.is-icon[data-tone="muted"] { color: var(--bc-color-text-muted); background: var(--bc-color-control); }
    #better-codex-panel .better-codex-project-dashboard-tabs { display: flex; width: fit-content; align-items: center; gap: 3px; border-radius: 13px; background: var(--bc-color-control); padding: 3px; }
    #better-codex-panel .better-codex-project-dashboard-tabs button { min-height: 34px; border: 0; border-radius: 10px; color: var(--bc-color-text-muted); background: transparent; padding: 0 16px; font: inherit; font-size: var(--bc-text-sm); font-weight: 600; cursor: pointer; }
    #better-codex-panel .better-codex-project-dashboard-tabs button[aria-current="page"] { color: var(--bc-color-text); background: var(--bc-color-surface); box-shadow: var(--bc-elevation-control); }
    #better-codex-panel .better-codex-project-dashboard-tabs button:focus-visible { outline: 2px solid var(--bc-color-focus); outline-offset: 1px; }
    #better-codex-panel .better-codex-project-dashboard-summary { display: grid; grid-template-columns: minmax(0,1.1fr) minmax(260px,.9fr) minmax(280px,.92fr); gap: 14px; }
    #better-codex-panel .better-codex-project-dashboard-card { min-width: 0; border-radius: var(--bc-radius-lg); background: var(--bc-color-surface); padding: 18px 20px; }
    #better-codex-panel .better-codex-project-dashboard-card > strong, #better-codex-panel .better-codex-project-section-head strong { font-size: var(--bc-text-md); font-weight: 650; }
    #better-codex-panel .better-codex-project-dashboard-description p { display: -webkit-box; max-width: 62ch; margin: 12px 0 0; overflow: hidden; color: var(--bc-color-text-muted); font-size: var(--bc-text-sm); line-height: 1.7; -webkit-box-orient: vertical; -webkit-line-clamp: 3; }
    #better-codex-panel .better-codex-project-dashboard-path { display: flex; min-width: 0; align-items: center; gap: 6px; margin-top: 14px; color: var(--bc-color-text-faint); font-size: var(--bc-text-caption); }
    #better-codex-panel .better-codex-project-dashboard-path svg { width: 13px; height: 13px; flex: 0 0 auto; }
    #better-codex-panel .better-codex-project-dashboard-path span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    #better-codex-panel .better-codex-project-metrics { display: grid; grid-template-columns: repeat(3,1fr); margin-top: 17px; }
    #better-codex-panel .better-codex-project-metric { display: grid; justify-items: center; gap: 4px; border-left: 1px solid var(--bc-color-hairline); }
    #better-codex-panel .better-codex-project-metric:first-child { border-left: 0; }
    #better-codex-panel .better-codex-project-metric b { color: var(--bc-color-info); font-size: 24px; font-weight: 650; }
    #better-codex-panel .better-codex-project-metric[data-tone="warning"] b { color: var(--bc-color-warning); }
    #better-codex-panel .better-codex-project-metric[data-tone="danger"] b { color: var(--bc-color-danger); }
    #better-codex-panel .better-codex-project-metric span { color: var(--bc-color-text-muted); font-size: var(--bc-text-caption); }
    #better-codex-panel .better-codex-project-cycle { display: grid; grid-template-columns: 118px minmax(0,1fr); gap: 18px; }
    #better-codex-panel .better-codex-project-cycle-steps { display: grid; align-content: start; }
    #better-codex-panel .better-codex-project-cycle-step { position: relative; display: flex; min-height: 29px; align-items: center; gap: 8px; color: var(--bc-color-text-faint); font-size: var(--bc-text-caption); }
    #better-codex-panel .better-codex-project-cycle-step::before { z-index: 1; width: 9px; height: 9px; box-sizing: border-box; border: 1.5px solid currentColor; border-radius: 50%; background: var(--bc-color-surface); content: ""; }
    #better-codex-panel .better-codex-project-cycle-step:not(:last-child)::after { position: absolute; top: 19px; bottom: -10px; left: 4px; width: 1px; background: var(--bc-color-hairline); content: ""; }
    #better-codex-panel .better-codex-project-cycle-step.is-complete { color: var(--bc-color-text-muted); }
    #better-codex-panel .better-codex-project-cycle-step.is-complete::before { border-color: var(--bc-color-text-muted); background: var(--bc-color-text-muted); box-shadow: inset 0 0 0 2px var(--bc-color-surface); }
    #better-codex-panel .better-codex-project-cycle-step.is-current { color: var(--bc-color-info); font-weight: 650; }
    #better-codex-panel .better-codex-project-cycle-step.is-current::before { border: 3px solid var(--bc-color-info); background: var(--bc-color-surface); }
    #better-codex-panel .better-codex-project-cycle-facts { display: grid; align-content: center; gap: 10px; }
    #better-codex-panel .better-codex-project-cycle-facts div { display: grid; grid-template-columns: auto minmax(0,1fr); gap: 10px; color: var(--bc-color-text-muted); font-size: var(--bc-text-caption); }
    #better-codex-panel .better-codex-project-cycle-facts b { overflow: hidden; color: var(--bc-color-text); font-weight: 650; text-overflow: ellipsis; white-space: nowrap; }
    #better-codex-panel .better-codex-project-timeline { min-width: 0; border-radius: var(--bc-radius-lg); background: var(--bc-color-surface); padding: 18px 20px 20px; }
    #better-codex-panel .better-codex-project-section-head { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
    #better-codex-panel .better-codex-project-section-head > span:not(.better-codex-project-timeline-legend) { color: var(--bc-color-text-faint); font-size: var(--bc-text-caption); }
    #better-codex-panel .better-codex-project-timeline-legend { display: flex; align-items: center; gap: 14px; color: var(--bc-color-text-muted); font-size: var(--bc-text-caption); }
    #better-codex-panel .better-codex-project-timeline-legend span { display: inline-flex; align-items: center; gap: 5px; }
    #better-codex-panel .better-codex-project-timeline-legend i { width: 7px; height: 7px; border-radius: 50%; background: var(--bc-color-success); }
    #better-codex-panel .better-codex-project-timeline-legend span:nth-child(2) i { background: var(--bc-color-warning); }
    #better-codex-panel .better-codex-project-timeline-legend span:nth-child(3) i { border: 1px dashed var(--bc-color-info); background: transparent; }
    #better-codex-panel .better-codex-project-timeline-scroll { overflow-x: auto; margin-top: 16px; padding-bottom: 3px; }
    #better-codex-panel .better-codex-project-timeline-canvas { position: relative; min-width: 920px; }
    #better-codex-panel .better-codex-project-timeline-dates { display: grid; grid-template-columns: repeat(13,1fr); color: var(--bc-color-text-faint); font-size: var(--bc-text-xs); }
    #better-codex-panel .better-codex-project-timeline-dates span { padding-bottom: 8px; text-align: left; }
    #better-codex-panel .better-codex-project-timeline-track { position: relative; display: grid; min-height: 116px; grid-template-columns: repeat(12,1fr); grid-template-rows: repeat(3,31px); gap: 7px 0; border-top: 1px solid var(--bc-color-hairline); padding: 12px 0 0; background-image: linear-gradient(to right,var(--bc-color-hairline) 1px,transparent 1px); background-size: calc(100% / 12) 100%; }
    #better-codex-panel .better-codex-project-version-band { z-index: 1; display: flex; min-width: 0; grid-column: var(--start) / span var(--span); grid-row: var(--row); align-items: center; gap: 8px; align-self: center; height: 28px; box-sizing: border-box; overflow: hidden; border-radius: 999px; color: color-mix(in oklch,var(--bc-color-success) 88%,var(--bc-color-text)); background: color-mix(in oklch,var(--bc-color-success) 12%,var(--bc-color-surface)); padding: 0 12px; font-size: var(--bc-text-caption); white-space: nowrap; }
    #better-codex-panel .better-codex-project-version-band b { overflow: hidden; font-weight: 650; text-overflow: ellipsis; }
    #better-codex-panel .better-codex-project-version-band span { color: var(--bc-color-text-muted); }
    #better-codex-panel .better-codex-project-version-band[data-tone="current"] { color: color-mix(in oklch,var(--bc-color-warning) 84%,var(--bc-color-text)); background: color-mix(in oklch,var(--bc-color-warning) 13%,var(--bc-color-surface)); }
    #better-codex-panel .better-codex-project-version-band[data-tone="planned"] { border: 1px dashed color-mix(in oklch,var(--bc-color-info) 68%,var(--bc-color-hairline)); color: var(--bc-color-info); background: color-mix(in oklch,var(--bc-color-info) 6%,var(--bc-color-surface)); }
    #better-codex-panel .better-codex-project-version-progress { margin-left: auto; border-radius: 999px; background: color-mix(in oklch,var(--bc-color-warning) 16%,var(--bc-color-surface)); padding: 2px 7px; color: inherit !important; font-weight: 650; }
    #better-codex-panel .better-codex-project-today { position: absolute; z-index: 2; top: -29px; bottom: 0; left: 33.333%; width: 1px; background: color-mix(in oklch,var(--bc-color-info) 74%,transparent); pointer-events: none; }
    #better-codex-panel .better-codex-project-today span { position: absolute; top: -1px; left: 0; border-radius: 999px; color: var(--bc-color-info); background: color-mix(in oklch,var(--bc-color-info) 9%,var(--bc-color-surface)); padding: 3px 7px; font-size: var(--bc-text-xs); font-weight: 650; transform: translate(-50%,-100%); white-space: nowrap; }
    #better-codex-panel .better-codex-project-milestones { display: grid; grid-template-columns: repeat(3,1fr); gap: 10px; margin-top: 12px; }
    #better-codex-panel .better-codex-project-milestone { display: flex; min-width: 0; align-items: flex-start; gap: 8px; color: var(--bc-color-text-muted); font-size: var(--bc-text-caption); }
    #better-codex-panel .better-codex-project-milestone svg { width: 14px; height: 14px; flex: 0 0 auto; margin-top: 1px; color: var(--bc-color-success); }
    #better-codex-panel .better-codex-project-milestone[data-tone="current"] svg { color: var(--bc-color-warning); }
    #better-codex-panel .better-codex-project-milestone[data-tone="planned"] svg { color: var(--bc-color-info); }
    #better-codex-panel .better-codex-project-milestone b, #better-codex-panel .better-codex-project-milestone span { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    #better-codex-panel .better-codex-project-milestone b { color: var(--bc-color-text); font-weight: 600; }
    #better-codex-panel .better-codex-project-dashboard-lists { display: grid; grid-template-columns: minmax(0,1.05fr) minmax(320px,.95fr); gap: 14px; }
    #better-codex-panel .better-codex-project-work-list, #better-codex-panel .better-codex-project-attention-list { display: grid; margin-top: 10px; }
    #better-codex-panel .better-codex-project-work-row, #better-codex-panel .better-codex-project-attention-row { display: grid; width: 100%; min-height: 43px; box-sizing: border-box; align-items: center; gap: 10px; border: 0; border-top: 1px solid var(--bc-color-hairline); color: inherit; background: transparent; padding: 7px 2px; font: inherit; text-align: left; cursor: pointer; }
    #better-codex-panel .better-codex-project-work-row { grid-template-columns: 18px 74px minmax(0,1fr) auto; }
    #better-codex-panel .better-codex-project-attention-row { grid-template-columns: 30px minmax(0,1fr) auto; }
    #better-codex-panel .better-codex-project-work-row:first-child, #better-codex-panel .better-codex-project-attention-row:first-child { border-top: 0; }
    #better-codex-panel .better-codex-project-work-row:hover, #better-codex-panel .better-codex-project-attention-row:hover { background: var(--bc-color-hover); }
    #better-codex-panel .better-codex-project-work-row:focus-visible, #better-codex-panel .better-codex-project-attention-row:focus-visible { outline: 2px solid var(--bc-color-focus); outline-offset: -2px; }
    #better-codex-panel .better-codex-project-work-row > svg { width: 15px; height: 15px; }
    #better-codex-panel .better-codex-project-work-row > b { color: var(--bc-color-text-faint); font-size: var(--bc-text-caption); font-weight: 550; }
    #better-codex-panel .better-codex-project-work-title, #better-codex-panel .better-codex-project-attention-copy { min-width: 0; }
    #better-codex-panel .better-codex-project-work-title strong, #better-codex-panel .better-codex-project-attention-copy strong { display: block; overflow: hidden; font-size: var(--bc-text-sm); font-weight: 600; text-overflow: ellipsis; white-space: nowrap; }
    #better-codex-panel .better-codex-project-work-title span, #better-codex-panel .better-codex-project-attention-copy span { display: block; margin-top: 3px; overflow: hidden; color: var(--bc-color-text-faint); font-size: var(--bc-text-caption); text-overflow: ellipsis; white-space: nowrap; }
    #better-codex-panel .better-codex-project-work-state, #better-codex-panel .better-codex-project-attention-state { border-radius: 999px; background: var(--bc-color-control); padding: 3px 8px; color: var(--bc-color-text-muted); font-size: var(--bc-text-xs); white-space: nowrap; }
    #better-codex-panel .better-codex-project-attention-icon { display: inline-flex; width: 28px; height: 28px; align-items: center; justify-content: center; border-radius: 9px; color: var(--bc-color-warning); background: color-mix(in oklch,var(--bc-color-warning) 10%,transparent); }
    #better-codex-panel .better-codex-project-attention-icon svg { width: 14px; height: 14px; }
    #better-codex-panel .better-codex-project-collaborators { padding-block: 15px; }
    #better-codex-panel .better-codex-project-collaborator-list { display: grid; grid-template-columns: repeat(auto-fit,minmax(210px,1fr)); margin-top: 10px; }
    #better-codex-panel .better-codex-project-collaborator { display: flex; min-width: 0; align-items: center; gap: 10px; border-left: 1px solid var(--bc-color-hairline); padding: 4px 16px; }
    #better-codex-panel .better-codex-project-collaborator:first-child { border-left: 0; padding-left: 0; }
    #better-codex-panel .better-codex-project-collaborator > div { min-width: 0; }
    #better-codex-panel .better-codex-project-collaborator strong, #better-codex-panel .better-codex-project-collaborator span { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    #better-codex-panel .better-codex-project-collaborator strong { font-size: var(--bc-text-sm); font-weight: 600; }
    #better-codex-panel .better-codex-project-collaborator span { margin-top: 3px; color: var(--bc-color-text-faint); font-size: var(--bc-text-caption); }
    #better-codex-panel .better-codex-project-dashboard-empty { padding: 20px 0; color: var(--bc-color-text-faint); font-size: var(--bc-text-sm); text-align: center; }
    #better-codex-panel .better-codex-project-document-panel { background: color-mix(in oklch,var(--bc-color-surface) 96%,var(--bc-color-control)); }
    #better-codex-panel .better-codex-project-document-panel > .better-codex-project-panel-head { border-bottom: 1px solid var(--bc-color-hairline); }
    #better-codex-panel .better-codex-project-document-progress { margin: 10px 14px 0; border-radius: var(--bc-radius-sm); background: var(--bc-color-control); padding: 10px 12px; }
    #better-codex-panel .better-codex-project-document-progress > div:first-child, #better-codex-panel .better-codex-project-document-progress > div:first-child span { display: flex; align-items: center; justify-content: space-between; gap: 7px; }
    #better-codex-panel .better-codex-project-document-progress > div:first-child span { justify-content: flex-start; min-width: 0; }
    #better-codex-panel .better-codex-project-document-progress svg { width: 14px; height: 14px; color: var(--bc-color-info); animation: better-codex-project-document-pulse 1.6s ease-in-out infinite; }
    #better-codex-panel .better-codex-project-document-progress strong, #better-codex-panel .better-codex-project-document-progress b { font-size: var(--bc-text-caption); font-weight: 650; }
    #better-codex-panel .better-codex-project-document-progress b { color: var(--bc-color-text-muted); }
    #better-codex-panel .better-codex-project-document-segments { display: grid; grid-template-columns: repeat(7,1fr); gap: 4px; margin-top: 8px; }
    #better-codex-panel .better-codex-project-document-segments i { height: 3px; overflow: hidden; border-radius: 2px; background: var(--bc-color-hairline); }
    #better-codex-panel .better-codex-project-document-segments i[data-status="ready"] { background: var(--bc-color-info); }
    #better-codex-panel .better-codex-project-document-segments i[data-status="generating"] { background: color-mix(in oklch,var(--bc-color-info) 48%,var(--bc-color-hairline)); animation: better-codex-project-document-segment 1.2s ease-in-out infinite; }
    #better-codex-panel .better-codex-project-document-segments i[data-status="failed"] { background: var(--bc-color-danger); }
    #better-codex-panel .better-codex-project-document-tabs { display: flex; flex: 0 0 auto; overflow-x: auto; padding: 10px 12px 0; scrollbar-width: none; }
    #better-codex-panel .better-codex-project-document-tabs::-webkit-scrollbar { display: none; }
    #better-codex-panel .better-codex-project-document-tab { position: relative; display: inline-flex; min-height: 38px; flex: 0 0 auto; align-items: center; gap: 6px; border: 0; border-bottom: 2px solid transparent; color: var(--bc-color-text-muted); background: transparent; padding: 0 10px 7px; font: inherit; font-size: var(--bc-text-caption); cursor: pointer; transition: color .15s,background .15s,transform .15s; }
    #better-codex-panel .better-codex-project-document-tab svg { width: 14px; height: 14px; }
    #better-codex-panel .better-codex-project-document-tab > i { width: 6px; height: 6px; border-radius: 50%; background: var(--bc-color-hairline); }
    #better-codex-panel .better-codex-project-document-tab > i[data-status="ready"] { background: var(--bc-color-success); }
    #better-codex-panel .better-codex-project-document-tab > i[data-status="generating"] { background: var(--bc-color-info); animation: better-codex-project-document-pulse 1.2s ease-in-out infinite; }
    #better-codex-panel .better-codex-project-document-tab > i[data-status="failed"] { background: var(--bc-color-danger); }
    #better-codex-panel .better-codex-project-document-tab.is-active { border-bottom-color: var(--bc-color-text); color: var(--bc-color-text); }
    #better-codex-panel .better-codex-project-document-tab:active { transform: scale(.98); }
    #better-codex-panel .better-codex-project-document-tab:focus-visible { outline: 2px solid var(--bc-color-focus); outline-offset: -3px; }
    #better-codex-panel .better-codex-project-document-scroll { min-height: 0; flex: 1; overflow-y: auto; overscroll-behavior: contain; scrollbar-gutter: stable; padding: 14px 18px 24px; }
    #better-codex-panel .better-codex-project-document-notice { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; border-radius: var(--bc-radius-sm); color: var(--bc-color-text-muted); background: var(--bc-color-control); padding: 9px 11px; font-size: var(--bc-text-caption); }
    #better-codex-panel .better-codex-project-document-notice svg { width: 14px; height: 14px; flex: 0 0 auto; animation: better-codex-project-document-spin 2.4s linear infinite; }
    #better-codex-panel .better-codex-project-document-notice.is-error { color: var(--bc-color-danger); }
    #better-codex-panel .better-codex-project-document-notice.is-error svg { animation: none; }
    #better-codex-panel .better-codex-project-document-diagram { overflow-x: auto; margin-bottom: 18px; border-radius: var(--bc-radius-md); background: var(--bc-color-control); padding: 12px; }
    #better-codex-panel .better-codex-project-document-diagram-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
    #better-codex-panel .better-codex-project-document-diagram-head strong { font-size: var(--bc-text-sm); }
    #better-codex-panel .better-codex-project-document-diagram-head span { color: var(--bc-color-text-faint); font-family: var(--bc-font-mono); font-size: var(--bc-text-xs); }
    #better-codex-panel .better-codex-project-document-graph { position: relative; min-width: max-content; }
    #better-codex-panel .better-codex-project-document-graph > svg { position: absolute; z-index: 0; inset: 0; width: 100%; height: 100%; overflow: visible; pointer-events: none; }
    #better-codex-panel .better-codex-project-document-graph > svg path:not([d^="M 0"]) { fill: none; stroke: color-mix(in oklch,var(--bc-color-text-muted) 55%,transparent); stroke-width: 1.25; }
    #better-codex-panel .better-codex-project-document-graph > svg marker path { fill: var(--bc-color-text-muted); stroke: none; }
    #better-codex-panel .better-codex-project-document-groups { position: relative; z-index: 1; display: flex; align-items: stretch; gap: 34px; }
    #better-codex-panel .better-codex-project-document-group { width: 180px; flex: 0 0 180px; }
    #better-codex-panel .better-codex-project-document-group > strong { display: block; margin-bottom: 7px; color: var(--bc-color-text-faint); font-size: var(--bc-text-xs); font-weight: 650; text-transform: uppercase; }
    #better-codex-panel .better-codex-project-document-group > div { display: grid; align-content: start; gap: 7px; }
    #better-codex-panel .better-codex-project-document-node { min-height: 54px; border: 1px solid var(--bc-color-hairline); border-radius: var(--bc-radius-sm); background: var(--bc-color-surface); padding: 9px 10px; }
    #better-codex-panel .better-codex-project-document-node b, #better-codex-panel .better-codex-project-document-node span { display: block; }
    #better-codex-panel .better-codex-project-document-node b { font-size: var(--bc-text-caption); font-weight: 650; }
    #better-codex-panel .better-codex-project-document-node span { margin-top: 3px; color: var(--bc-color-text-muted); font-size: var(--bc-text-xs); line-height: 1.45; }
    #better-codex-panel .better-codex-project-document-relations { display: flex; overflow-x: auto; gap: 6px; margin-top: 10px; padding-top: 2px; }
    #better-codex-panel .better-codex-project-document-relations span { display: inline-flex; flex: 0 0 auto; align-items: center; gap: 4px; color: var(--bc-color-text-muted); font-size: var(--bc-text-xs); }
    #better-codex-panel .better-codex-project-document-relations svg { width: 11px; height: 11px; }
    #better-codex-panel .better-codex-project-document-relations b { color: var(--bc-color-text); font-weight: 600; }
    #better-codex-panel .better-codex-project-document-relations em { font-style: normal; }
    #better-codex-panel .better-codex-project-document-content { color: color-mix(in oklch,var(--bc-color-text) 82%,var(--bc-color-text-muted)); font-size: var(--bc-text-sm); line-height: 1.75; }
    #better-codex-panel .better-codex-project-document-content h1, #better-codex-panel .better-codex-project-document-content h2, #better-codex-panel .better-codex-project-document-content h3 { color: var(--bc-color-text); line-height: 1.35; text-wrap: balance; }
    #better-codex-panel .better-codex-project-document-content h1 { margin-top: 0; font-size: var(--bc-text-xl); }
    #better-codex-panel .better-codex-project-document-content h2 { margin-top: 24px; font-size: var(--bc-text-lg); }
    #better-codex-panel .better-codex-project-document-content code { border-radius: var(--bc-radius-xs); background: var(--bc-color-control); padding: 2px 5px; }
    #better-codex-panel .better-codex-project-document-loading { display: grid; min-height: 340px; place-content: center; justify-items: center; color: var(--bc-color-text-muted); text-align: center; }
    #better-codex-panel .better-codex-project-document-orbit { display: grid; width: 46px; height: 46px; place-items: center; margin-bottom: 14px; border: 1px solid var(--bc-color-hairline); border-radius: 50%; color: var(--bc-color-info); }
    #better-codex-panel .better-codex-project-document-orbit.is-active { animation: better-codex-project-document-float 2.4s ease-in-out infinite; }
    #better-codex-panel .better-codex-project-document-orbit svg { width: 19px; height: 19px; }
    #better-codex-panel .better-codex-project-document-loading.is-error .better-codex-project-document-orbit { color: var(--bc-color-danger); }
    #better-codex-panel .better-codex-project-document-loading > strong { color: var(--bc-color-text); font-size: var(--bc-text-md); }
    #better-codex-panel .better-codex-project-document-loading > p { max-width: 44ch; margin: 7px 0 18px; font-size: var(--bc-text-caption); line-height: 1.65; }
    #better-codex-panel .better-codex-project-document-skeleton { display: grid; width: min(340px,70vw); gap: 7px; }
    #better-codex-panel .better-codex-project-document-skeleton i { height: 7px; border-radius: 4px; background: var(--bc-color-hairline); animation: better-codex-project-document-skeleton 1.5s ease-in-out infinite; }
    #better-codex-panel .better-codex-project-document-skeleton i:nth-child(2) { width: 82%; animation-delay: .12s; }
    #better-codex-panel .better-codex-project-document-skeleton i:nth-child(3) { width: 93%; animation-delay: .24s; }
    #better-codex-panel .better-codex-project-document-skeleton i:nth-child(4) { width: 64%; animation-delay: .36s; }
    #better-codex-panel .better-codex-project-document-form { display: grid; flex: 0 0 auto; gap: 10px; border-top: 1px solid var(--bc-color-hairline); background: var(--bc-color-surface); padding: 12px 14px 14px; }
    #better-codex-panel .better-codex-project-document-form label { display: grid; gap: 5px; color: var(--bc-color-text-muted); font-size: var(--bc-text-xs); }
    #better-codex-panel .better-codex-project-document-form textarea { width: 100%; box-sizing: border-box; border: 1px solid var(--bc-color-hairline); border-radius: var(--bc-radius-sm); outline: 0; color: var(--bc-color-text); background: var(--bc-color-control); font: inherit; font-size: var(--bc-text-caption); }
    #better-codex-panel .better-codex-project-document-form textarea { min-height: 52px; max-height: 120px; resize: vertical; padding: 9px 10px; line-height: 1.5; }
    #better-codex-panel .better-codex-project-document-form textarea:focus { border-color: var(--bc-color-focus); }
    #better-codex-panel .better-codex-project-document-form > div { display: grid; grid-template-columns: minmax(180px,1fr) auto; align-items: end; gap: 10px; }
    #better-codex-panel .better-codex-project-document-agent-picker { position: relative; display: grid; min-width: 0; gap: 5px; }
    #better-codex-panel .better-codex-project-document-agent-picker > span:first-child { color: var(--bc-color-text-muted); font-size: var(--bc-text-xs); }
    #better-codex-panel .better-codex-project-document-agent-picker .better-codex-agent-picker-trigger { display: flex; width: 100%; min-height: 36px; box-sizing: border-box; align-items: center; justify-content: space-between; gap: 8px; border: 1px solid var(--bc-color-hairline); border-radius: var(--bc-radius-sm); color: var(--bc-color-text); background: var(--bc-color-control); padding: 0 10px; font: inherit; font-size: var(--bc-text-caption); text-align: left; cursor: pointer; }
    #better-codex-panel .better-codex-project-document-agent-picker .better-codex-agent-picker-trigger:focus-visible { outline: 2px solid var(--bc-color-focus); outline-offset: 1px; }
    #better-codex-panel .better-codex-project-document-agent-picker .better-codex-agent-picker-trigger > span { display: flex; min-width: 0; align-items: center; gap: 8px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    #better-codex-panel .better-codex-project-document-agent-picker .better-codex-agent-picker-trigger > svg { width: 13px; height: 13px; flex: 0 0 auto; color: var(--bc-color-text-faint); transform: rotate(-90deg); transition: transform .15s cubic-bezier(.16,1,.3,1); }
    #better-codex-panel .better-codex-project-document-agent-picker.is-open .better-codex-agent-picker-trigger > svg { transform: rotate(90deg); }
    #better-codex-panel .better-codex-project-document-agent-picker .better-codex-agent-menu { top: auto; right: 0; bottom: calc(100% + 6px); display: none; width: 100%; min-width: 220px; transform-origin: bottom right; }
    #better-codex-panel .better-codex-project-document-agent-picker.is-open .better-codex-agent-menu { display: block; animation: better-codex-menu-enter var(--bc-motion-fast) var(--bc-ease-out); }
    #better-codex-panel .better-codex-project-document-agent-avatar { display: inline-flex; width: 18px; height: 18px; flex: 0 0 18px; align-items: center; justify-content: center; overflow: hidden; border-radius: 999px; }
    #better-codex-panel .better-codex-project-document-agent-avatar img, #better-codex-panel .better-codex-project-document-agent-avatar svg { display: block; width: 100%; height: 100%; object-fit: cover; }
    #better-codex-panel .better-codex-project-document-form output { color: var(--bc-color-danger); font-size: var(--bc-text-caption); line-height: 1.45; }
    #better-codex-panel .better-codex-project-document-form output[data-tone="warning"] { color: var(--bc-color-warning); }
    #better-codex-panel .better-codex-project-document-form output[data-tone="info"] { color: var(--bc-color-info); }
    #better-codex-panel .better-codex-project-document-form .better-codex-submit { display: inline-flex; min-height: 36px; align-items: center; justify-content: center; gap: 7px; padding-inline: 13px; }
    #better-codex-panel .better-codex-project-document-form .better-codex-submit svg { width: 14px; height: 14px; }
    #better-codex-panel .better-codex-project-dashboard-tabs button:active, #better-codex-panel .better-codex-project-planning-overview button:active, #better-codex-panel .better-codex-project-planning-starters button:active, #better-codex-panel .better-codex-project-planning-panel-head > button:active, #better-codex-panel .better-codex-project-planning-form .better-codex-submit:active { transform: scale(.97); }
    #better-codex-panel .better-codex-project-planning-overview { display: grid; align-content: start; }
    #better-codex-panel .better-codex-project-planning-overview .better-codex-project-section-head button { display: inline-flex; min-height: 32px; align-items: center; gap: 5px; border: 0; border-radius: var(--bc-radius-sm); color: var(--bc-color-info); background: transparent; padding: 0 7px; font: inherit; font-size: var(--bc-text-caption); font-weight: 650; cursor: pointer; }
    #better-codex-panel .better-codex-project-planning-overview .better-codex-project-section-head button svg { width: 13px; height: 13px; }
    #better-codex-panel .better-codex-project-planning-overview p { display: -webkit-box; margin: 12px 0 0; overflow: hidden; color: var(--bc-color-text-muted); font-size: var(--bc-text-sm); line-height: 1.65; -webkit-box-orient: vertical; -webkit-line-clamp: 3; }
    #better-codex-panel .better-codex-project-overview-milestones > div { display: grid; grid-template-columns: repeat(3,minmax(0,1fr)); gap: 0; margin-top: 10px; }
    #better-codex-panel .better-codex-project-overview-milestones .better-codex-project-plan-item { border-top: 0; border-left: 1px solid var(--bc-color-hairline); padding: 8px 16px; }
    #better-codex-panel .better-codex-project-overview-milestones .better-codex-project-plan-item:first-child { border-left: 0; padding-left: 0; }
    #better-codex-panel .better-codex-project-overview-milestones .better-codex-project-plan-item:last-child { padding-right: 0; }
    #better-codex-panel .better-codex-project-planning-layout { display: grid; min-height: clamp(640px,calc(100dvh - 245px),860px); grid-template-columns: minmax(0,1.42fr) minmax(340px,.78fr); gap: 14px; align-items: stretch; }
    #better-codex-panel .better-codex-project-plan, #better-codex-panel .better-codex-project-planning-chat { display: flex; min-width: 0; min-height: 0; overflow: hidden; flex-direction: column; border-radius: var(--bc-radius-lg); background: var(--bc-color-surface); }
    #better-codex-panel .better-codex-project-planning-panel-head { display: flex; min-height: 62px; flex: 0 0 auto; align-items: center; justify-content: space-between; gap: 16px; border-bottom: 1px solid var(--bc-color-hairline); padding: 0 18px; }
    #better-codex-panel .better-codex-project-planning-panel-head > div { display: grid; min-width: 0; gap: 3px; }
    #better-codex-panel .better-codex-project-planning-panel-head > div > span { color: var(--bc-color-text-faint); font-size: var(--bc-text-xs); font-weight: 650; letter-spacing: .04em; text-transform: uppercase; }
    #better-codex-panel .better-codex-project-planning-panel-head > div > strong { overflow: hidden; font-size: var(--bc-text-sm); font-weight: 650; line-height: 1.4; text-overflow: ellipsis; }
    #better-codex-panel .better-codex-project-planning-panel-head > span { flex: 0 0 auto; color: var(--bc-color-text-faint); font-size: var(--bc-text-caption); }
    #better-codex-panel .better-codex-project-planning-panel-head > button { display: inline-flex; min-height: 36px; flex: 0 0 auto; align-items: center; gap: 6px; border: 0; border-radius: var(--bc-radius-sm); color: var(--bc-color-text-muted); background: var(--bc-color-control); padding: 0 10px; font: inherit; font-size: var(--bc-text-caption); cursor: pointer; }
    #better-codex-panel .better-codex-project-planning-panel-head > button:disabled { opacity: .45; cursor: not-allowed; }
    #better-codex-panel .better-codex-project-planning-panel-head > button svg { width: 13px; height: 13px; }
    #better-codex-panel .better-codex-project-planning-alert { display: flex; align-items: center; gap: 8px; color: var(--bc-color-danger); background: color-mix(in oklch,var(--bc-color-danger) 8%,transparent); padding: 9px 18px; font-size: var(--bc-text-caption); }
    #better-codex-panel .better-codex-project-planning-alert svg { width: 14px; height: 14px; flex: 0 0 auto; }
    #better-codex-panel .better-codex-project-plan-scroll { min-height: 0; flex: 1; overflow-y: auto; overscroll-behavior: contain; scrollbar-gutter: stable; padding: 0 20px 24px; }
    #better-codex-panel .better-codex-project-plan-summary { padding: 22px 0 20px; border-bottom: 1px solid var(--bc-color-hairline); }
    #better-codex-panel .better-codex-project-plan-summary > span { color: var(--bc-color-text-faint); font-size: var(--bc-text-xs); font-weight: 650; letter-spacing: .04em; text-transform: uppercase; }
    #better-codex-panel .better-codex-project-plan-summary p { max-width: 72ch; margin: 8px 0 0; color: var(--bc-color-text); font-size: var(--bc-text-md); line-height: 1.72; text-wrap: pretty; }
    #better-codex-panel .better-codex-project-plan-timeline { padding: 22px 0 4px; border-bottom: 1px solid var(--bc-color-hairline); }
    #better-codex-panel .better-codex-project-plan-timeline > header { display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; padding-bottom: 14px; }
    #better-codex-panel .better-codex-project-plan-timeline > header > div { display: grid; gap: 3px; }
    #better-codex-panel .better-codex-project-plan-timeline > header strong { font-size: var(--bc-text-md); font-weight: 680; }
    #better-codex-panel .better-codex-project-plan-timeline > header span { color: var(--bc-color-text-faint); font-size: var(--bc-text-xs); }
    #better-codex-panel .better-codex-project-plan-timeline > header > span { flex: 0 0 auto; font-variant-numeric: tabular-nums; }
    #better-codex-panel .better-codex-project-plan-timeline ol { margin: 0; padding: 0; list-style: none; }
    #better-codex-panel .better-codex-project-plan-timeline li { display: grid; min-height: 78px; grid-template-columns: 88px 18px minmax(0,1fr); gap: 10px; }
    #better-codex-panel .better-codex-project-plan-timeline-date { padding-top: 2px; color: var(--bc-color-text-muted); font-family: var(--bc-font-mono); font-size: var(--bc-text-xs); font-variant-numeric: tabular-nums; }
    #better-codex-panel .better-codex-project-plan-timeline-date[data-pending="true"] { color: var(--bc-color-text-faint); font-family: inherit; }
    #better-codex-panel .better-codex-project-plan-timeline-rail { position: relative; display: flex; justify-content: center; }
    #better-codex-panel .better-codex-project-plan-timeline-rail::before { z-index: 1; width: 10px; height: 10px; box-sizing: border-box; border: 2px solid var(--bc-color-text-muted); border-radius: 50%; background: var(--bc-color-surface); content: ""; }
    #better-codex-panel .better-codex-project-plan-timeline li:not(:last-child) .better-codex-project-plan-timeline-rail::after { position: absolute; top: 10px; bottom: 0; width: 1px; background: var(--bc-color-hairline); content: ""; }
    #better-codex-panel .better-codex-project-plan-timeline li[data-plan-status="in_progress"] .better-codex-project-plan-timeline-rail::before { border-color: var(--bc-color-info); box-shadow: 0 0 0 3px color-mix(in oklch,var(--bc-color-info) 10%,transparent); }
    #better-codex-panel .better-codex-project-plan-timeline li[data-plan-status="blocked"] .better-codex-project-plan-timeline-rail::before { border-color: var(--bc-color-danger); }
    #better-codex-panel .better-codex-project-plan-timeline li[data-plan-status="done"] .better-codex-project-plan-timeline-rail::before, #better-codex-panel .better-codex-project-plan-timeline li[data-plan-status="confirmed"] .better-codex-project-plan-timeline-rail::before { border-color: var(--bc-color-success); background: var(--bc-color-success); box-shadow: inset 0 0 0 2px var(--bc-color-surface); }
    #better-codex-panel .better-codex-project-plan-timeline-copy { min-width: 0; padding: 0 0 18px; }
    #better-codex-panel .better-codex-project-plan-timeline-copy header { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; }
    #better-codex-panel .better-codex-project-plan-timeline-copy header strong { font-size: var(--bc-text-sm); font-weight: 650; line-height: 1.45; }
    #better-codex-panel .better-codex-project-plan-timeline-copy p { margin: 5px 0 0; color: var(--bc-color-text-muted); font-size: var(--bc-text-caption); line-height: 1.62; text-wrap: pretty; }
    #better-codex-panel .better-codex-project-plan-timeline-copy footer { display: flex; align-items: center; flex-wrap: wrap; gap: 6px 12px; margin-top: 8px; color: var(--bc-color-text-faint); font-size: var(--bc-text-xs); }
    #better-codex-panel .better-codex-project-plan-section { padding-top: 22px; }
    #better-codex-panel .better-codex-project-plan-section > header { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding-bottom: 8px; }
    #better-codex-panel .better-codex-project-plan-section > header strong { font-size: var(--bc-text-md); font-weight: 680; }
    #better-codex-panel .better-codex-project-plan-section > header span { color: var(--bc-color-text-faint); font-family: var(--bc-font-mono); font-size: var(--bc-text-xs); }
    #better-codex-panel .better-codex-project-plan-item { display: grid; grid-template-columns: 28px minmax(0,1fr); gap: 10px; border-top: 1px solid var(--bc-color-hairline); padding: 13px 0; }
    #better-codex-panel .better-codex-project-plan-index { padding-top: 2px; color: var(--bc-color-text-faint); font-family: var(--bc-font-mono); font-size: var(--bc-text-xs); }
    #better-codex-panel .better-codex-project-plan-item > div { min-width: 0; }
    #better-codex-panel .better-codex-project-plan-item header { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; }
    #better-codex-panel .better-codex-project-plan-item header strong { font-size: var(--bc-text-sm); font-weight: 650; line-height: 1.45; }
    #better-codex-panel .better-codex-project-plan-status { flex: 0 0 auto; border-radius: 999px; color: var(--bc-color-text-muted); background: var(--bc-color-control); padding: 3px 7px; font-size: var(--bc-text-xs); font-weight: 650; }
    #better-codex-panel .better-codex-project-plan-item[data-plan-status="blocked"] .better-codex-project-plan-status { color: var(--bc-color-danger); background: color-mix(in oklch,var(--bc-color-danger) 9%,transparent); }
    #better-codex-panel .better-codex-project-plan-item[data-plan-status="in_progress"] .better-codex-project-plan-status { color: var(--bc-color-info); background: color-mix(in oklch,var(--bc-color-info) 9%,transparent); }
    #better-codex-panel .better-codex-project-plan-item[data-plan-status="done"] .better-codex-project-plan-status, #better-codex-panel .better-codex-project-plan-item[data-plan-status="confirmed"] .better-codex-project-plan-status { color: var(--bc-color-success); background: color-mix(in oklch,var(--bc-color-success) 9%,transparent); }
    #better-codex-panel .better-codex-project-plan-item p { margin: 5px 0 0; color: var(--bc-color-text-muted); font-size: var(--bc-text-caption); line-height: 1.62; }
    #better-codex-panel .better-codex-project-plan-item footer { display: flex; align-items: center; flex-wrap: wrap; gap: 6px 12px; margin-top: 8px; color: var(--bc-color-text-faint); font-size: var(--bc-text-xs); }
    #better-codex-panel .better-codex-project-plan-item footer [data-plan-source="user"] { color: var(--bc-color-info); }
    #better-codex-panel .better-codex-project-plan-item footer [data-plan-source="inference"] { color: var(--bc-color-warning); }
    #better-codex-panel .better-codex-project-plan-item details { margin-top: 8px; color: var(--bc-color-text-faint); font-size: var(--bc-text-xs); }
    #better-codex-panel .better-codex-project-plan-item summary { width: fit-content; cursor: pointer; }
    #better-codex-panel .better-codex-project-plan-item ul { margin: 7px 0 0; padding-left: 18px; color: var(--bc-color-text-muted); line-height: 1.55; }
    #better-codex-panel .better-codex-project-plan-empty { display: grid; min-height: 360px; flex: 1; place-content: center; justify-items: center; padding: 32px; text-align: center; }
    #better-codex-panel .better-codex-project-plan-empty > svg { width: 25px; height: 25px; margin-bottom: 13px; color: var(--bc-color-text-faint); }
    #better-codex-panel .better-codex-project-plan-empty strong { font-size: var(--bc-text-md); }
    #better-codex-panel .better-codex-project-plan-empty p { max-width: 42ch; margin: 7px 0 0; color: var(--bc-color-text-muted); font-size: var(--bc-text-caption); line-height: 1.6; }
    #better-codex-panel .better-codex-project-plan-foot { flex: 0 0 auto; border-top: 1px solid var(--bc-color-hairline); color: var(--bc-color-text-faint); padding: 10px 18px; font-size: var(--bc-text-xs); }
    #better-codex-panel .better-codex-project-planning-messages { min-height: 0; flex: 1; overflow-y: auto; overscroll-behavior: contain; scrollbar-gutter: stable; padding: 16px 16px 20px; }
    #better-codex-panel .better-codex-project-planning-message { max-width: 92%; margin-bottom: 20px; }
    #better-codex-panel .better-codex-project-planning-message[data-role="user"] { margin-left: auto; }
    #better-codex-panel .better-codex-project-planning-message header { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 5px; color: var(--bc-color-text-faint); font-size: var(--bc-text-xs); }
    #better-codex-panel .better-codex-project-planning-message header strong { color: var(--bc-color-text-muted); font-weight: 650; }
    #better-codex-panel .better-codex-project-planning-message > div { color: var(--bc-color-text); font-size: var(--bc-text-sm); line-height: 1.65; }
    #better-codex-panel .better-codex-project-planning-message[data-role="user"] > div { border-radius: var(--bc-radius-md) var(--bc-radius-xs) var(--bc-radius-md) var(--bc-radius-md); background: var(--bc-color-control); padding: 10px 12px; }
    #better-codex-panel .better-codex-project-planning-message p { margin: 0 0 9px; }
    #better-codex-panel .better-codex-project-planning-message p:last-child { margin-bottom: 0; }
    #better-codex-panel .better-codex-project-planning-message ul, #better-codex-panel .better-codex-project-planning-message ol { margin: 8px 0; padding-left: 20px; }
    #better-codex-panel .better-codex-project-planning-message code { border-radius: var(--bc-radius-xs); background: var(--bc-color-control); padding: 2px 4px; font-family: var(--bc-font-mono); font-size: .92em; }
    #better-codex-panel .better-codex-project-planning-starters { display: grid; align-content: center; gap: 7px; min-height: 100%; }
    #better-codex-panel .better-codex-project-planning-starters > span { margin-bottom: 8px; color: var(--bc-color-text-muted); font-size: var(--bc-text-caption); line-height: 1.6; }
    #better-codex-panel .better-codex-project-planning-starters button { display: grid; min-height: 48px; grid-template-columns: minmax(0,1fr) 14px; align-items: center; gap: 8px; border: 1px solid var(--bc-color-hairline); border-radius: var(--bc-radius-sm); color: var(--bc-color-text); background: transparent; padding: 8px 10px; font: inherit; font-size: var(--bc-text-caption); line-height: 1.45; text-align: left; cursor: pointer; }
    #better-codex-panel .better-codex-project-planning-starters button svg { width: 13px; height: 13px; color: var(--bc-color-text-faint); }
    #better-codex-panel .better-codex-project-planning-running { display: flex; align-items: center; gap: 7px; color: var(--bc-color-info); font-size: var(--bc-text-caption); }
    #better-codex-panel .better-codex-project-planning-running svg, #better-codex-panel .better-codex-project-planning-form .better-codex-submit:disabled svg { animation: better-codex-project-document-spin 1.2s linear infinite; }
    #better-codex-panel .better-codex-project-planning-form { display: grid; flex: 0 0 auto; gap: 8px; border-top: 1px solid var(--bc-color-hairline); padding: 12px; }
    #better-codex-panel .better-codex-project-planning-form textarea { box-sizing: border-box; width: 100%; min-height: 70px; max-height: 180px; resize: vertical; border: 1px solid var(--bc-color-hairline); border-radius: var(--bc-radius-sm); outline: 0; color: var(--bc-color-text); background: var(--bc-color-control); padding: 10px 11px; font: inherit; font-size: var(--bc-text-sm); line-height: 1.5; }
    #better-codex-panel .better-codex-project-planning-form textarea:focus { border-color: var(--bc-color-focus); }
    #better-codex-panel .better-codex-project-planning-form > div { display: grid; grid-template-columns: minmax(0,1fr) auto; align-items: end; gap: 8px; }
    #better-codex-panel .better-codex-project-planning-form .better-codex-project-document-agent-picker > span:first-child { display: none; }
    #better-codex-panel .better-codex-project-planning-agent { display: inline-flex; min-height: 36px; align-items: center; gap: 7px; color: var(--bc-color-text-muted); font-size: var(--bc-text-caption); }
    #better-codex-panel .better-codex-project-planning-agent > svg { width: 18px; height: 18px; }
    #better-codex-panel .better-codex-project-planning-form .better-codex-submit { display: inline-flex; min-height: 36px; align-items: center; justify-content: center; gap: 7px; padding-inline: 13px; }
    #better-codex-panel .better-codex-project-planning-form .better-codex-submit svg { width: 14px; height: 14px; }
    #better-codex-panel .better-codex-project-planning-form output { grid-column: 1 / -1; color: var(--bc-color-danger); font-size: var(--bc-text-caption); }
    #better-codex-panel .better-codex-project-planning-form output[data-tone="warning"] { color: var(--bc-color-warning); }
    #better-codex-panel .better-codex-project-planning-form output[data-tone="info"] { color: var(--bc-color-info); }
    #better-codex-panel .better-codex-project-planning-form button:focus-visible, #better-codex-panel .better-codex-project-planning-starters button:focus-visible, #better-codex-panel .better-codex-project-planning-panel-head > button:focus-visible, #better-codex-panel .better-codex-project-planning-overview button:focus-visible { outline: 2px solid var(--bc-color-focus); outline-offset: 1px; }
    @keyframes better-codex-project-document-pulse { 0%,100% { opacity: .45; transform: scale(.94); } 50% { opacity: 1; transform: scale(1); } }
    @keyframes better-codex-project-document-segment { 0%,100% { opacity: .4; } 50% { opacity: 1; } }
    @keyframes better-codex-project-document-spin { to { transform: rotate(360deg); } }
    @keyframes better-codex-project-document-float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }
    @keyframes better-codex-project-document-skeleton { 0%,100% { opacity: .32; } 50% { opacity: .85; } }
    @media (hover:hover) { #better-codex-panel .better-codex-project-card:hover, #better-codex-panel .better-codex-project-issue-toggle:hover, #better-codex-panel .better-codex-project-back:hover { background: var(--bc-color-hover); } }
    @media (hover:hover) { #better-codex-panel .better-codex-project-document-tab:hover { color: var(--bc-color-text); background: var(--bc-color-hover); } }
    @media (min-width: 981px) {
      #better-codex-panel[data-surface="projects"] .better-codex-projects:has(> .better-codex-project-detail) { display: flex; overflow: hidden; flex-direction: column; }
      #better-codex-panel .better-codex-project-detail { min-height: 0; flex: 1; }
      #better-codex-panel .better-codex-project-dashboard { height: 100%; min-height: 0; }
      #better-codex-panel .better-codex-project-dashboard:not(:has(> .better-codex-project-planning-layout)) { overflow-y: auto; overscroll-behavior: contain; scrollbar-gutter: stable; }
      #better-codex-panel .better-codex-project-dashboard:has(> .better-codex-project-planning-layout) { grid-template-rows: auto auto minmax(0,1fr); overflow: hidden; }
      #better-codex-panel .better-codex-project-dashboard:has(> .better-codex-project-work-board) { grid-template-rows: auto auto minmax(0,1fr); overflow: hidden; }
      #better-codex-panel .better-codex-project-planning-layout { min-height: 0; }
      #better-codex-panel .better-codex-project-work-board { min-height: 0; padding-inline: 0; }
    }
    @media (max-width: 1120px) { #better-codex-panel .better-codex-project-dashboard-summary { grid-template-columns: repeat(2,minmax(0,1fr)); } #better-codex-panel .better-codex-project-cycle { grid-column: 1 / -1; } }
    @media (max-width: 980px) { #better-codex-panel .better-codex-project-summary, #better-codex-panel .better-codex-project-columns, #better-codex-panel .better-codex-project-dashboard-lists, #better-codex-panel .better-codex-project-planning-layout { grid-template-columns: 1fr; } #better-codex-panel .better-codex-project-columns { height: auto; } #better-codex-panel .better-codex-project-panel:first-child { height: min(50dvh,480px); min-height: 320px; } #better-codex-panel .better-codex-project-document-panel { height: min(86dvh,820px); min-height: 620px; } #better-codex-panel .better-codex-project-planning-layout { min-height: 0; } #better-codex-panel .better-codex-project-plan, #better-codex-panel .better-codex-project-planning-chat { height: min(78dvh,760px); min-height: 560px; } #better-codex-panel .better-codex-project-work-board { height: min(76dvh,760px); min-height: 520px; padding-inline: 0; } }
    @media (max-width: 640px) { #better-codex-panel .better-codex-projects { padding: 12px 12px 24px; } #better-codex-panel .better-codex-project-list, #better-codex-panel .better-codex-project-dashboard-summary, #better-codex-panel .better-codex-project-overview-milestones > div { grid-template-columns: 1fr; } #better-codex-panel .better-codex-project-summary { padding: 18px; } #better-codex-panel .better-codex-project-columns { grid-template-columns: minmax(0,1fr); } #better-codex-panel .better-codex-project-document-tab { padding-inline: 8px; } #better-codex-panel .better-codex-project-document-tab svg { display: none; } #better-codex-panel .better-codex-project-document-form > div { grid-template-columns: 1fr; } #better-codex-panel .better-codex-project-dashboard-head { gap: 12px; } #better-codex-panel .better-codex-project-dashboard-people, #better-codex-panel .better-codex-project-dashboard-delete span { display: none; } #better-codex-panel .better-codex-project-dashboard-delete { width: 32px; justify-content: center; padding: 0; } #better-codex-panel .better-codex-project-cycle { grid-column: auto; grid-template-columns: 100px minmax(0,1fr); } #better-codex-panel .better-codex-project-timeline { padding-inline: 14px; } #better-codex-panel .better-codex-project-timeline-legend { display: none; } #better-codex-panel .better-codex-project-milestones { grid-template-columns: 1fr; } #better-codex-panel .better-codex-project-work-row { grid-template-columns: 18px 62px minmax(0,1fr); } #better-codex-panel .better-codex-project-work-state { display: none; } #better-codex-panel .better-codex-project-collaborator-list { grid-template-columns: 1fr; } #better-codex-panel .better-codex-project-collaborator { border-top: 1px solid var(--bc-color-hairline); border-left: 0; padding: 10px 0; } #better-codex-panel .better-codex-project-collaborator:first-child { border-top: 0; } #better-codex-panel .better-codex-project-overview-milestones .better-codex-project-plan-item { border-top: 1px solid var(--bc-color-hairline); border-left: 0; padding: 12px 0; } #better-codex-panel .better-codex-project-planning-panel-head { padding-inline: 14px; } #better-codex-panel .better-codex-project-plan-scroll { padding-inline: 14px; } #better-codex-panel .better-codex-project-plan-item { grid-template-columns: 24px minmax(0,1fr); gap: 7px; } }
    @media (max-width: 640px) { #better-codex-panel .better-codex-project-plan-timeline > header { align-items: flex-start; } #better-codex-panel .better-codex-project-plan-timeline > header > span { max-width: 15ch; text-align: right; } #better-codex-panel .better-codex-project-plan-timeline li { grid-template-columns: 72px 16px minmax(0,1fr); gap: 7px; } }
    @media (prefers-reduced-motion:reduce) { #better-codex-panel .better-codex-project-issues-loading > span, #better-codex-panel .better-codex-project-document-progress svg, #better-codex-panel .better-codex-project-document-segments i, #better-codex-panel .better-codex-project-document-tab > i, #better-codex-panel .better-codex-project-document-notice svg, #better-codex-panel .better-codex-project-document-orbit, #better-codex-panel .better-codex-project-document-skeleton i, #better-codex-panel .better-codex-project-planning-running svg, #better-codex-panel .better-codex-project-planning-form .better-codex-submit:disabled svg { animation: none; } }
    #better-codex-panel .better-codex-agent-heading { display: none; min-width: 0; align-items: baseline; gap: 4px; }
    #better-codex-panel .better-codex-agent-heading strong { color: var(--bc-color-text); font-size: var(--bc-text-md); font-weight: 650; }
    #better-codex-panel .better-codex-agent-heading span { color: var(--bc-color-text-muted); font-size: var(--bc-text-sm); }
    #better-codex-panel .better-codex-agent-actions { display: none; align-items: center; gap: 8px; }
    #better-codex-panel[data-surface="agents"] .better-codex-issue-only { display: none; }
    #better-codex-panel[data-surface="agents"] .better-codex-agent-heading, #better-codex-panel[data-surface="agents"] .better-codex-agent-actions { display: flex; }
    #better-codex-panel .better-codex-agents { display: none; min-height: 0; flex: 1; overflow-y: auto; padding: 12px 22px 28px; }
    #better-codex-panel[data-surface="agents"] .better-codex-agents { display: block; }
    #better-codex-panel .better-codex-agent-grid { display: grid; max-width: 1080px; margin: 0 auto; grid-template-columns: repeat(auto-fill,minmax(280px,1fr)); gap: 12px; }
    #better-codex-panel .better-codex-agent-card { display: flex; min-height: 214px; flex-direction: column; border: 1px solid transparent; border-radius: var(--bc-radius-md); color: var(--bc-color-text); background: var(--bc-color-surface); padding: 16px; box-shadow: var(--bc-elevation-card); transition: border-color .15s,transform .15s; }
    #better-codex-panel .better-codex-agent-card:hover { border-color: var(--bc-color-focus); }
    #better-codex-panel .better-codex-agent-card:active { transform: scale(.99); }
    #better-codex-panel .better-codex-agent-card-head { display: flex; align-items: flex-start; gap: 11px; }
    #better-codex-panel .better-codex-agent-card-avatar { display: inline-flex; width: 36px; height: 36px; flex: 0 0 auto; align-items: center; justify-content: center; border-radius: var(--bc-radius-sm); color: var(--bc-color-on-primary); background: var(--bc-color-primary); font-size: var(--bc-text-md); font-weight: 700; letter-spacing: -.02em; }
    #better-codex-panel .better-codex-agent-card-avatar.is-codex { overflow: hidden; color: inherit; background: transparent; }
    #better-codex-panel .better-codex-agent-card-avatar.is-codex svg { width: 36px; height: 36px; }
    #better-codex-panel .better-codex-agent-card-title { min-width: 0; flex: 1; }
    #better-codex-panel .better-codex-agent-card-title-line { display: flex; min-width: 0; align-items: center; gap: 7px; }
    #better-codex-panel .better-codex-agent-card-title strong { display: block; overflow: hidden; font-size: var(--bc-text-md); font-weight: 650; text-overflow: ellipsis; white-space: nowrap; }
    #better-codex-panel .better-codex-agent-default-badge { flex: 0 0 auto; border: 1px solid var(--bc-color-hairline); border-radius: 999px; color: var(--bc-color-text-muted); background: var(--bc-color-hover); padding: 1px 6px; font-size: var(--bc-text-xs); font-weight: 600; line-height: 1.4; }
    #better-codex-panel .better-codex-agent-card-description { display: -webkit-box; margin-top: 3px; overflow: hidden; color: var(--bc-color-text-muted); font-size: var(--bc-text-sm); line-height: 1.45; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }
    #better-codex-panel .better-codex-agent-card-instructions { display: -webkit-box; min-height: 54px; margin-top: 14px; overflow: hidden; color: var(--bc-color-text-muted); font-size: var(--bc-text-caption); line-height: 1.55; -webkit-box-orient: vertical; -webkit-line-clamp: 3; }
    #better-codex-panel .better-codex-agent-card-meta { display: flex; align-items: center; flex-wrap: wrap; gap: 6px; margin-top: auto; padding-top: 14px; }
    #better-codex-panel .better-codex-agent-card-actions { display: flex; align-items: center; gap: 4px; margin-left: auto; }
    #better-codex-panel .better-codex-agent-card-action { display: inline-flex; width: 26px; height: 26px; align-items: center; justify-content: center; border: 0; border-radius: var(--bc-radius-xs); color: var(--bc-color-text-muted); background: transparent; padding: 0; cursor: pointer; }
    #better-codex-panel .better-codex-agent-card-action:hover { color: var(--bc-color-text); background: var(--bc-color-hover); }
    #better-codex-panel .better-codex-agent-card-action.is-danger:hover { color: var(--bc-color-danger); background: var(--bc-color-danger-soft); }
    #better-codex-panel .better-codex-agent-card-action:active, #better-codex-panel .better-codex-button:active { transform: scale(.96); }
    #better-codex-panel .better-codex-agents-empty { max-width: 460px; margin: 12vh auto 0; text-align: center; }
    #better-codex-panel .better-codex-agents-empty-icon { display: inline-flex; width: 48px; height: 48px; align-items: center; justify-content: center; border: 1px solid transparent; border-radius: var(--bc-radius-md); color: var(--bc-color-text-muted); background: var(--bc-color-surface); box-shadow: var(--bc-elevation-card); }
    #better-codex-panel .better-codex-agents-empty strong { display: block; margin-top: 14px; color: var(--bc-color-text); font-size: var(--bc-text-md); }
    #better-codex-panel .better-codex-agents-empty p { margin: 6px 0 14px; color: var(--bc-color-text-muted); font-size: var(--bc-text-md); line-height: 1.6; }
    #better-codex-update-notice { position: fixed; right: 16px; bottom: 16px; z-index: 2147483000; display: flex; box-sizing: border-box; width: min(420px,calc(100vw - 32px)); max-width: 100%; min-width: 0; align-items: flex-start; gap: 6px; border: 1px solid var(--bc-color-hairline); border-radius: var(--bc-radius-lg); color: var(--bc-color-text); background: var(--bc-color-surface-raised); padding: 8px; box-shadow: var(--bc-elevation-float); font-family: var(--bc-font-ui); font-size: var(--bc-text-base); line-height: 1.4; animation: better-codex-update-enter .25s cubic-bezier(.175,.885,.32,1); }
    #better-codex-update-notice .better-codex-update-close, #better-codex-update-notice .better-codex-update-menu-toggle { position: static; display: inline-flex; width: 16px; height: 16px; flex: 0 0 16px; align-items: center; justify-content: center; margin-top: 2px; border: 0; border-radius: var(--bc-radius-pill); color: var(--bc-color-text); background: transparent; padding: 0; opacity: .5; cursor: pointer; }
    #better-codex-update-notice .better-codex-update-menu-toggle { order: 3; }
    #better-codex-update-notice .better-codex-update-close { order: 4; }
    #better-codex-update-notice .better-codex-update-menu { position: absolute; top: 34px; right: 8px; z-index: 2; box-sizing: border-box; min-width: 148px; border: 1px solid var(--bc-color-hairline); border-radius: var(--bc-radius-sm); color: var(--bc-color-text); background: var(--bc-color-surface-raised); padding: 4px; box-shadow: var(--bc-elevation-menu); }
    #better-codex-update-notice .better-codex-update-menu[hidden] { display: none; }
    #better-codex-update-notice .better-codex-update-menu button { display: flex; width: 100%; min-height: 34px; align-items: center; border: 0; border-radius: var(--bc-radius-xs); color: inherit; background: transparent; padding: 0 10px; font: inherit; font-size: var(--bc-text-sm); text-align: left; cursor: pointer; }
    #better-codex-update-notice .better-codex-update-layout { display: flex; min-width: 0; flex: 1; align-items: flex-start; gap: 6px; }
    #better-codex-update-notice .better-codex-update-icon { display: inline-flex; width: 16px; height: 16px; flex: 0 0 16px; align-items: center; justify-content: center; margin-top: 2px; color: var(--bc-color-text); }
    #better-codex-update-notice .better-codex-update-icon svg { width: 16px; height: 16px; }
    #better-codex-update-notice[data-status="installing"] .better-codex-update-icon svg { animation: better-codex-update-spin 1s linear infinite; }
    #better-codex-update-notice .better-codex-update-copy { display: flex; min-width: 0; flex: 1; flex-direction: column; justify-content: center; gap: 2px; }
    #better-codex-update-notice .better-codex-update-title { margin: 0; color: var(--bc-color-text); font-size: inherit; font-weight: 500; line-height: 1.4; }
    #better-codex-update-notice .better-codex-update-description { margin: 0; color: var(--bc-color-text-muted); font-size: var(--bc-text-sm); line-height: 1.4; text-wrap: pretty; }
    #better-codex-update-notice .better-codex-update-error { margin: 4px 0 0; color: var(--bc-color-danger); font-size: var(--bc-text-sm); line-height: 1.4; }
    #better-codex-update-notice .better-codex-update-actions { display: flex; flex: 0 0 auto; align-items: center; gap: 6px; margin: 0 2px 0 6px; }
    #better-codex-update-notice .better-codex-update-button { display: inline-flex; min-height: 32px; align-items: center; justify-content: center; border: 0; border-radius: var(--bc-radius-pill); color: var(--bc-color-text); background: var(--bc-color-hover); padding: 0 10px; font: inherit; font-size: var(--bc-text-sm); font-weight: 600; cursor: pointer; transition: transform .15s,color .15s,background-color .15s; }
    #better-codex-update-notice .better-codex-update-button.is-primary { color: var(--bc-color-on-primary); background: var(--bc-color-primary); }
    #better-codex-update-notice .better-codex-update-button:active { transform: scale(.96); }
    #better-codex-update-notice .better-codex-update-button:focus-visible, #better-codex-update-notice .better-codex-update-close:focus-visible, #better-codex-update-notice .better-codex-update-menu-toggle:focus-visible { outline: 2px solid var(--bc-color-focus); outline-offset: 2px; }
    #better-codex-update-notice .better-codex-update-button:disabled, #better-codex-update-notice .better-codex-update-close:disabled { cursor: default; opacity: .48; }
    @keyframes better-codex-update-enter { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes better-codex-update-spin { to { transform: rotate(360deg); } }
    @media (hover:hover) { #better-codex-update-notice .better-codex-update-close:hover, #better-codex-update-notice .better-codex-update-menu-toggle:hover { color: var(--bc-color-text); background: color-mix(in srgb,var(--bc-color-hover) 5%,transparent); opacity: .8; } #better-codex-update-notice .better-codex-update-menu button:hover, #better-codex-update-notice .better-codex-update-button:hover { background: var(--bc-color-hover); } #better-codex-update-notice .better-codex-update-button.is-primary:hover { background: color-mix(in srgb,var(--bc-color-primary) 90%,var(--bc-color-surface)); } }
    @media (prefers-reduced-motion:reduce) { #better-codex-update-notice, #better-codex-update-notice[data-status="installing"] .better-codex-update-icon svg { animation: none; } }
    #better-codex-completion-notices { position: fixed; right: 16px; bottom: var(--bc-completion-notice-bottom); z-index: 2147483000; display: flex; max-width: calc(100vw - 32px); flex-direction: column; align-items: flex-end; gap: 8px; pointer-events: none; transition: bottom .2s cubic-bezier(.16,1,.3,1); }
    .better-codex-completion-notice { position: relative; display: flex; box-sizing: border-box; width: max-content; max-width: min(420px,calc(100vw - 32px)); min-height: 40px; align-items: center; gap: 8px; border: 1px solid var(--bc-color-hairline); border-radius: var(--bc-radius-sm); color: var(--bc-color-text); background: var(--bc-color-surface-raised); padding: 6px 6px 6px 12px; box-shadow: var(--bc-elevation-menu); font-family: var(--bc-font-ui); font-size: var(--bc-text-sm); cursor: pointer; pointer-events: auto; animation: better-codex-completion-enter .28s cubic-bezier(.16,1,.3,1); }
    .better-codex-completion-notice .better-codex-completion-layout { display: flex; min-width: 0; align-items: center; gap: 8px; }
    .better-codex-completion-notice .better-codex-completion-avatar { width: 24px; height: 24px; flex: 0 0 auto; overflow: hidden; border-radius: var(--bc-radius-xs); }
    .better-codex-completion-notice .better-codex-completion-avatar img, .better-codex-completion-notice .better-codex-completion-avatar svg { display: block; width: 100%; height: 100%; object-fit: cover; }
    .better-codex-completion-notice .better-codex-completion-avatar.is-fallback { display: inline-flex; align-items: center; justify-content: center; color: var(--bc-color-text-muted); background: var(--bc-color-hover); }
    .better-codex-completion-notice .better-codex-completion-avatar.is-fallback svg { width: 14px; height: 14px; }
    .better-codex-completion-notice .better-codex-completion-message { min-width: 0; margin: 0; overflow: hidden; line-height: 1.4; text-overflow: ellipsis; white-space: nowrap; }
    .better-codex-completion-notice .better-codex-completion-status { flex: 0 0 auto; border-radius: var(--bc-radius-pill); color: var(--bc-color-text-muted); background: var(--bc-color-hover); padding: 2px 7px; font-size: var(--bc-text-xs); font-weight: 500; line-height: 1.4; }
    .better-codex-completion-notice .better-codex-completion-menu-toggle, .better-codex-completion-notice .better-codex-completion-close { display: inline-flex; width: 28px; height: 28px; flex: 0 0 auto; align-items: center; justify-content: center; border: 0; border-radius: var(--bc-radius-xs); color: var(--bc-color-text-muted); background: transparent; cursor: pointer; }
    .better-codex-completion-notice .better-codex-completion-menu { position: absolute; right: 38px; bottom: 38px; z-index: 2; box-sizing: border-box; min-width: 148px; border: 1px solid var(--bc-color-hairline); border-radius: var(--bc-radius-sm); color: var(--bc-color-text); background: var(--bc-color-surface-raised); padding: 4px; box-shadow: var(--bc-elevation-menu); }
    .better-codex-completion-notice .better-codex-completion-menu[hidden] { display: none; }
    .better-codex-completion-notice .better-codex-completion-menu button { display: flex; width: 100%; min-height: 32px; align-items: center; border: 0; border-radius: var(--bc-radius-xs); color: inherit; background: transparent; padding: 0 9px; font: inherit; font-size: inherit; text-align: left; cursor: pointer; }
    .better-codex-completion-notice button:focus-visible { outline: 2px solid var(--bc-color-focus); outline-offset: 1px; }
    @keyframes better-codex-completion-enter { from { opacity: 0; translate: 0 18px; } to { opacity: 1; translate: 0 0; } }
    @media (hover:hover) { .better-codex-completion-notice :is(.better-codex-completion-menu-toggle,.better-codex-completion-close):hover, .better-codex-completion-notice .better-codex-completion-menu button:hover { color: var(--bc-color-text); background: var(--bc-color-hover); } }
    @media (prefers-reduced-motion:reduce) { .better-codex-completion-notice { animation: none; } }
    #better-codex-agent-dialog { position: fixed; inset: 0; box-sizing: border-box; width: min(720px,calc(100vw - 40px)); height: min(86vh,760px); margin: auto; overflow: hidden; border: 1px solid var(--bc-color-hairline); border-radius: var(--bc-radius-md); color: var(--bc-color-text); background: var(--bc-color-canvas); padding: 0; box-shadow: var(--bc-elevation-float); font-family: var(--bc-font-ui); }
    #better-codex-agent-dialog::backdrop { background: var(--bc-color-scrim); backdrop-filter: blur(4px); }
    #better-codex-agent-dialog form { display: flex; height: 100%; min-height: 0; flex-direction: column; }
    #better-codex-agent-dialog .better-codex-agent-dialog-head { display: flex; flex: 0 0 auto; align-items: center; justify-content: space-between; border-bottom: 1px solid var(--bc-color-hairline); background: var(--bc-color-surface-raised); padding: 15px 18px; }
    #better-codex-agent-dialog .better-codex-agent-dialog-head strong { display: block; font-size: var(--bc-text-md); font-weight: 650; }
    #better-codex-agent-dialog .better-codex-agent-dialog-head span { display: block; margin-top: 3px; color: var(--bc-color-text-muted); font-size: var(--bc-text-sm); }
    #better-codex-agent-dialog .better-codex-agent-dialog-body { min-height: 0; flex: 1; overflow-y: auto; padding: 20px; }
    #better-codex-agent-dialog .better-codex-agent-section { max-width: 620px; margin: 0 auto 22px; }
    #better-codex-agent-dialog .better-codex-agent-section-title { margin: 0 0 9px 2px; }
    #better-codex-agent-dialog .better-codex-agent-section-title strong { display: block; font-size: var(--bc-text-md); font-weight: 650; }
    #better-codex-agent-dialog .better-codex-agent-section-title span { display: block; margin-top: 2px; color: var(--bc-color-text-muted); font-size: var(--bc-text-caption); }
    #better-codex-agent-dialog .better-codex-agent-settings { overflow: hidden; border: 1px solid var(--bc-color-hairline); border-radius: var(--bc-radius-sm); background: var(--bc-color-surface); box-shadow: var(--bc-elevation-card); }
    #better-codex-agent-dialog .better-codex-agent-field { display: grid; grid-template-columns: 132px minmax(0,1fr); gap: 16px; align-items: center; padding: 13px 15px; }
    #better-codex-agent-dialog .better-codex-agent-field + .better-codex-agent-field { border-top: 1px solid var(--bc-color-hairline); }
    #better-codex-agent-dialog .better-codex-agent-field.is-top { align-items: start; }
    #better-codex-agent-dialog .better-codex-agent-field > label { padding-top: 7px; color: var(--bc-color-text-muted); font-size: var(--bc-text-sm); font-weight: 550; }
    #better-codex-agent-dialog input, #better-codex-agent-dialog textarea, #better-codex-agent-dialog select { box-sizing: border-box; width: 100%; border: 1px solid var(--bc-color-input); border-radius: var(--bc-radius-xs); color: var(--bc-color-text); background: var(--bc-color-surface-raised); padding: 8px 10px; font: inherit; font-size: var(--bc-text-md); outline: none; }
    #better-codex-agent-dialog input:focus, #better-codex-agent-dialog textarea:focus, #better-codex-agent-dialog select:focus { border-color: var(--bc-color-focus); box-shadow: var(--bc-focus-ring); }
    #better-codex-agent-dialog textarea { min-height: 74px; line-height: 1.55; resize: vertical; }
    #better-codex-agent-dialog textarea[name="instructions"] { min-height: 190px; font-size: var(--bc-text-sm); }
    #better-codex-agent-dialog .better-codex-agent-execution { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; padding: 15px; }
    #better-codex-agent-dialog .better-codex-agent-execution label { display: block; margin-bottom: 6px; color: var(--bc-color-text-muted); font-size: var(--bc-text-sm); font-weight: 550; }
    #better-codex-agent-dialog .better-codex-agent-dialog-error { max-width: 620px; margin: 0 auto 8px; color: var(--bc-color-danger); font-size: var(--bc-text-sm); }
    #better-codex-agent-dialog .better-codex-agent-dialog-footer { display: flex; min-height: 58px; flex: 0 0 auto; align-items: center; justify-content: flex-end; gap: 8px; border-top: 1px solid var(--bc-color-hairline); background: var(--bc-color-surface-raised); padding: 0 18px; }
    #better-codex-agent-dialog .better-codex-button, #better-codex-agent-dialog .better-codex-submit { display: inline-flex; min-height: 30px; align-items: center; justify-content: center; border-radius: var(--bc-radius-xs); padding: 0 12px; font: inherit; font-size: var(--bc-text-sm); cursor: pointer; }
    #better-codex-agent-dialog .better-codex-button { border: 1px solid var(--bc-color-hairline); color: var(--bc-color-text-muted); background: var(--bc-color-surface); }
    #better-codex-agent-dialog .better-codex-submit { min-width: 92px; border: 1px solid var(--bc-color-primary); color: var(--bc-color-on-primary); background: var(--bc-color-primary); font-weight: 600; }
    #better-codex-agent-dialog .better-codex-button:active, #better-codex-agent-dialog .better-codex-submit:active { transform: scale(.96); }
    #better-codex-agent-dialog .better-codex-submit:disabled { cursor: not-allowed; opacity: .55; }
    @media (max-width:640px) { #better-codex-agent-dialog .better-codex-agent-field { grid-template-columns: 1fr; gap: 5px; } #better-codex-agent-dialog .better-codex-agent-field > label { padding-top: 0; } #better-codex-agent-dialog .better-codex-agent-execution { grid-template-columns: 1fr; } }
    #better-codex-project-dialog { position: fixed; inset: 0; box-sizing: border-box; width: min(500px,calc(100vw - 32px)); margin: auto; border: 0; border-radius: var(--bc-radius-xl); color: var(--bc-color-text); background: var(--bc-color-surface-raised); padding: 0; box-shadow: var(--bc-elevation-float); font-family: var(--bc-font-ui); }
    #better-codex-project-dialog::backdrop { background: var(--bc-color-scrim); }
    #better-codex-project-dialog form { padding: 24px; }
    #better-codex-project-dialog h2 { margin: 0; font-size: var(--bc-text-xl); font-weight: 650; }
    #better-codex-project-dialog > form > p { margin: 7px 0 20px; color: var(--bc-color-text-muted); font-size: var(--bc-text-sm); line-height: 1.65; }
    #better-codex-project-dialog label { display: grid; gap: 7px; margin-top: 14px; color: var(--bc-color-text-muted); font-size: var(--bc-text-sm); font-weight: 600; }
    #better-codex-project-dialog input { box-sizing: border-box; width: 100%; min-height: 40px; border: 0; border-radius: var(--bc-radius-sm); color: var(--bc-color-text); background: var(--bc-color-control); padding: 0 11px; font: inherit; font-weight: 400; }
    #better-codex-project-dialog input:focus-visible, #better-codex-project-dialog button:focus-visible { outline: 2px solid var(--bc-color-focus); outline-offset: 2px; }
    #better-codex-project-dialog .better-codex-project-folder-field { display: grid; grid-template-columns: minmax(0,1fr) auto; gap: 8px; }
    #better-codex-project-dialog .better-codex-project-folder-field button, #better-codex-project-dialog .better-codex-project-dialog-actions button { min-height: 40px; border: 0; border-radius: var(--bc-radius-sm); color: var(--bc-color-text); background: var(--bc-color-control); padding: 0 12px; font: inherit; cursor: pointer; }
    #better-codex-project-dialog .better-codex-project-dialog-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 22px; }
    #better-codex-project-dialog .better-codex-project-dialog-actions button[type="submit"] { color: var(--bc-color-on-primary); background: var(--bc-color-primary); }
    #better-codex-project-dialog output { display: block; margin-top: 10px; color: var(--bc-color-danger); font-size: var(--bc-text-sm); }
    #better-codex-project-dialog output[data-tone="warning"] { color: var(--bc-color-warning); }
    #better-codex-project-dialog output[data-tone="info"] { color: var(--bc-color-info); }
    #better-codex-project-dialog output[hidden] { display: none; }
    #better-codex-project-dialog button:active { transform: scale(.96); }
    #better-codex-project-dialog[data-directory-browser="true"] { width: min(640px,calc(100vw - 32px)); max-height: calc(100dvh - 32px); overflow-y: auto; overscroll-behavior: contain; }
    #better-codex-project-dialog .better-codex-directory-browser { display: flex; min-height: 0; flex-direction: column; margin-top: 14px; overflow: hidden; border: 1px solid var(--bc-color-hairline); border-radius: var(--bc-radius-md); background: var(--bc-color-surface); }
    #better-codex-project-dialog .better-codex-directory-browser[hidden] { display: none; }
    #better-codex-project-dialog .better-codex-directory-toolbar { display: grid; grid-template-columns: 40px minmax(0,1fr); gap: 6px; align-items: center; border-bottom: 1px solid var(--bc-color-hairline); background: var(--bc-color-surface-raised); padding: 8px; }
    #better-codex-project-dialog .better-codex-directory-toolbar input { min-width: 0; min-height: 40px; background: var(--bc-color-control); }
    #better-codex-project-dialog .better-codex-directory-toolbar button, #better-codex-project-dialog .better-codex-directory-shortcuts button, #better-codex-project-dialog .better-codex-directory-create button { display: inline-flex; min-width: 40px; min-height: 40px; align-items: center; justify-content: center; gap: 6px; border: 0; border-radius: var(--bc-radius-sm); color: var(--bc-color-text); background: var(--bc-color-control); padding: 0 11px; font: inherit; cursor: pointer; }
    #better-codex-project-dialog .better-codex-directory-toolbar button:disabled, #better-codex-project-dialog .better-codex-directory-shortcuts button:disabled, #better-codex-project-dialog .better-codex-directory-create button:disabled { cursor: not-allowed; opacity: .45; }
    #better-codex-project-dialog .better-codex-directory-shortcuts { display: flex; gap: 6px; border-bottom: 1px solid var(--bc-color-hairline); padding: 7px 8px; }
    #better-codex-project-dialog .better-codex-directory-shortcuts button { min-height: 32px; color: var(--bc-color-text-muted); background: transparent; padding: 0 10px; font-size: var(--bc-text-sm); }
    #better-codex-project-dialog .better-codex-directory-shortcuts [data-directory-hidden][aria-pressed="true"] { color: var(--bc-color-text); background: var(--bc-color-hover); }
    #better-codex-project-dialog .better-codex-directory-shortcuts [data-directory-create] { margin-left: auto; color: var(--bc-color-text); }
    #better-codex-project-dialog .better-codex-directory-create { display: grid; grid-template-columns: minmax(0,1fr) auto auto; gap: 6px; border-bottom: 1px solid var(--bc-color-hairline); background: var(--bc-color-surface-raised); padding: 8px; }
    #better-codex-project-dialog .better-codex-directory-create[hidden] { display: none; }
    #better-codex-project-dialog .better-codex-directory-create input { min-width: 0; }
    #better-codex-project-dialog .better-codex-directory-create [data-directory-create-confirm] { color: var(--bc-color-on-primary); background: var(--bc-color-primary); }
    #better-codex-project-dialog .better-codex-directory-list { height: min(300px,34dvh); min-height: 160px; overflow-y: auto; overscroll-behavior: contain; padding: 6px; }
    #better-codex-project-dialog .better-codex-directory-row { display: grid; grid-template-columns: 20px minmax(0,1fr) 16px; width: 100%; min-height: 40px; align-items: center; gap: 8px; border: 0; border-radius: var(--bc-radius-sm); color: var(--bc-color-text); background: transparent; padding: 0 10px; font: inherit; text-align: left; cursor: pointer; }
    #better-codex-project-dialog .better-codex-directory-row span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    #better-codex-project-dialog .better-codex-directory-row > svg:last-child { color: var(--bc-color-text-muted); }
    #better-codex-project-dialog .better-codex-directory-state { display: flex; height: 100%; min-height: 148px; align-items: center; justify-content: center; color: var(--bc-color-text-muted); padding: 0 18px; font-size: var(--bc-text-sm); text-align: center; }
    #better-codex-project-dialog [data-directory-status] { display: block; border-top: 1px solid var(--bc-color-hairline); color: var(--bc-color-text-muted); padding: 7px 10px; overflow-wrap: anywhere; font-size: var(--bc-text-sm); font-weight: 400; }
    #better-codex-project-dialog [data-directory-status]:empty { display: none; }
    @media (hover:hover) { #better-codex-project-dialog .better-codex-directory-row:hover, #better-codex-project-dialog .better-codex-directory-toolbar button:hover, #better-codex-project-dialog .better-codex-directory-shortcuts button:hover, #better-codex-project-dialog .better-codex-directory-create button:not([data-directory-create-confirm]):hover { background: var(--bc-color-hover); } }
    @media (max-width:480px) { #better-codex-project-dialog[data-directory-browser="true"] { width: calc(100vw - 20px); max-height: calc(100dvh - 20px); } #better-codex-project-dialog[data-directory-browser="true"] form { padding: 18px; } #better-codex-project-dialog .better-codex-directory-shortcuts { gap: 4px; padding-inline: 6px; } #better-codex-project-dialog .better-codex-directory-shortcuts button span { white-space: nowrap; } #better-codex-project-dialog .better-codex-directory-shortcuts [data-directory-home] svg, #better-codex-project-dialog .better-codex-directory-shortcuts [data-directory-root] svg { display: none; } #better-codex-project-dialog .better-codex-directory-shortcuts [data-directory-hidden] { width: 32px; min-width: 32px; padding: 0; } #better-codex-project-dialog .better-codex-directory-shortcuts [data-directory-hidden] span { display: none; } }
    #better-codex-confirm { position: fixed; inset: 0; box-sizing: border-box; width: min(420px,calc(100vw - 40px)); margin: auto; overflow: hidden; border: 1px solid var(--bc-color-hairline); border-radius: var(--bc-radius-md); color: var(--bc-color-text); background: var(--bc-color-surface-raised); padding: 0; box-shadow: var(--bc-elevation-float); font-family: var(--bc-font-ui); }
    #better-codex-confirm::backdrop { background: var(--bc-color-scrim); backdrop-filter: blur(4px); }
    #better-codex-confirm .better-codex-confirm-body { padding: 20px 20px 17px; }
    #better-codex-confirm .better-codex-confirm-title { margin: 0; font-size: var(--bc-text-md); font-weight: 650; line-height: 1.45; }
    #better-codex-confirm .better-codex-confirm-message { margin: 7px 0 0; color: var(--bc-color-text-muted); font-size: var(--bc-text-md); line-height: 1.6; }
    #better-codex-confirm .better-codex-confirm-actions { display: flex; min-height: 52px; align-items: center; justify-content: flex-end; gap: 8px; border-top: 1px solid var(--bc-color-hairline); padding: 0 16px; }
    #better-codex-confirm button { display: inline-flex; min-width: 72px; height: 30px; align-items: center; justify-content: center; border: 1px solid var(--bc-color-hairline); border-radius: var(--bc-radius-xs); color: var(--bc-color-text); background: var(--bc-color-surface); padding: 0 12px; font: inherit; font-size: var(--bc-text-md); font-weight: 550; cursor: pointer; }
    #better-codex-confirm button:hover, #better-codex-confirm button:focus-visible { background: var(--bc-color-hover); outline: none; }
    #better-codex-confirm button:focus-visible { box-shadow: var(--bc-focus-ring); }
    #better-codex-confirm .better-codex-confirm-primary { border-color: var(--bc-color-danger); color: var(--bc-color-on-avatar); background: var(--bc-color-danger); }
    #better-codex-confirm .better-codex-confirm-primary:hover, #better-codex-confirm .better-codex-confirm-primary:focus-visible { background: color-mix(in oklch,var(--bc-color-danger) 88%,var(--bc-color-text)); }
    #better-codex-dialog { position: fixed; inset: 0; box-sizing: border-box; width: min(806px,calc(100vw - 48px)); height: calc(var(--bc-text-base) * 38); max-height: calc(100vh - 48px); margin: auto; overflow: visible; border: 1px solid var(--bc-color-hairline); border-radius: var(--bc-radius-md); color: var(--bc-color-text); background: var(--bc-color-canvas); padding: 0; box-shadow: var(--bc-elevation-float); font-family: var(--bc-font-ui); transition: width .3s ease,height .3s ease; }
    #better-codex-dialog[data-mode="agent"] { width: min(691px,calc(100vw - 48px)); height: min(var(--bc-dialog-agent-height),calc(100vh - 48px)); }
    #better-codex-dialog[data-expanded="true"] { width: min(1075px,calc(100vw - 48px)); height: min(84vh,912px); }
    #better-codex-dialog::backdrop { background: var(--bc-color-scrim); backdrop-filter: blur(4px); }
    #better-codex-dialog form { display: flex; width: 100%; height: 100%; min-height: 0; flex-direction: column; }
    #better-codex-dialog .better-codex-dialog-head { display: flex; flex: 0 0 auto; align-items: center; justify-content: space-between; padding: 12px 18px 8px 20px; }
    #better-codex-dialog .better-codex-dialog-breadcrumb { display: flex; min-width: 0; align-items: center; gap: 6px; color: var(--bc-color-text-muted); font-size: var(--bc-text-md); }
    #better-codex-dialog .better-codex-dialog-breadcrumb strong { overflow: hidden; color: var(--bc-color-text); font-weight: 550; text-overflow: ellipsis; white-space: nowrap; }
    #better-codex-dialog .better-codex-dialog-head-actions { display: flex; align-items: center; gap: 2px; }
    #better-codex-dialog .better-codex-icon-button { display: inline-flex; width: var(--bc-control-height); height: var(--bc-control-height); align-items: center; justify-content: center; border: 0; border-radius: var(--bc-radius-xs); color: var(--bc-color-text-muted); background: transparent; padding: 0; cursor: pointer; opacity: .72; }
    #better-codex-dialog .better-codex-icon-button:hover { background: var(--bc-color-hover); opacity: 1; }
    #better-codex-dialog .better-codex-dialog-stop { color: var(--bc-color-danger); }
    #better-codex-dialog .better-codex-dialog-stop:hover { color: var(--bc-color-danger); background: var(--bc-color-danger-soft); }
    #better-codex-dialog .better-codex-manual-title { width: auto; margin: 0 20px 4px; border: 0; color: var(--bc-color-text); background: transparent; padding: 0; font: inherit; font-size: var(--bc-text-xl); font-weight: 600; line-height: 1.45; outline: none; }
    #better-codex-dialog .better-codex-manual-title::placeholder { color: var(--bc-color-text-muted); opacity: 1; }
    #better-codex-dialog .better-codex-dialog-editor { box-sizing: border-box; width: auto; min-height: 0; flex: 1; margin: 0 20px; overflow-y: auto; border: 0; color: var(--bc-color-text); background: transparent; padding: 2px 0; font: inherit; font-size: var(--bc-text-md); line-height: 1.55; outline: none; resize: none; }
    #better-codex-dialog .better-codex-dialog-editor::placeholder { color: var(--bc-color-text-muted); opacity: 1; }
    #better-codex-dialog[data-mode="agent"] .better-codex-dialog-editor { min-height: 120px; margin-top: 2px; }
    #better-codex-dialog .better-codex-create-semantic { position: relative; display: flex; min-height: 0; flex: 1; margin: 0 20px; }
    #better-codex-dialog .better-codex-create-semantic .better-codex-dialog-editor { width: 100%; margin: 2px 0 0; }
    #better-codex-dialog .better-codex-create-semantic .better-codex-semantic-menu { top: calc(var(--bc-text-md) * 1.55 + 12px); right: 0; bottom: auto; left: 0; }
    #better-codex-dialog .better-codex-agent-picker { display: flex; flex: 0 0 auto; align-items: center; gap: 8px; color: var(--bc-color-text-muted); padding: 5px 20px 8px; font-size: var(--bc-text-md); }
    #better-codex-dialog .better-codex-agent-assignee { display: flex; min-width: 0; align-items: center; gap: 6px; color: var(--bc-color-text); font-weight: 550; }
    #better-codex-dialog .better-codex-agent-assignee select { max-width: 260px; border: 0; color: inherit; background: transparent; padding: 2px 20px 2px 0; font: inherit; font-weight: inherit; outline: none; cursor: pointer; }
    #better-codex-dialog .better-codex-agent-assignee:focus-within { border-radius: var(--bc-radius-xs); box-shadow: var(--bc-focus-ring); }
    #better-codex-dialog .better-codex-agent-avatar { display: inline-flex; width: 18px; height: 18px; align-items: center; justify-content: center; border-radius: var(--bc-radius-pill); color: var(--bc-color-on-primary); background: var(--bc-color-primary); font-size: var(--bc-text-avatar); }
    #better-codex-dialog .better-codex-agent-avatar.is-codex { overflow: hidden; color: inherit; background: transparent; }
    #better-codex-dialog .better-codex-agent-avatar svg { width: 18px; height: 18px; }
    #better-codex-dialog .better-codex-agent-avatar.has-image { overflow: hidden; }
    #better-codex-dialog .better-codex-agent-avatar img { width: 100%; height: 100%; object-fit: cover; }
    #better-codex-dialog .better-codex-run-hint { display: flex; flex: 0 0 auto; align-items: center; gap: 7px; color: var(--bc-color-text-muted); padding: 1px 20px 4px; font-size: var(--bc-text-md); }
    #better-codex-dialog .better-codex-dialog-properties { display: flex; flex: 0 0 auto; align-items: center; flex-wrap: wrap; gap: 6px; padding: 6px 16px 9px; }
    #better-codex-dialog .better-codex-property { display: inline-flex; height: var(--bc-control-height); max-width: 190px; align-items: center; gap: 6px; overflow: hidden; border: 1px solid var(--bc-color-hairline); border-radius: var(--bc-radius-pill); color: var(--bc-color-text-muted); background: var(--bc-color-surface); padding: 0 9px; font: inherit; font-size: var(--bc-text-md); text-overflow: ellipsis; white-space: nowrap; }
    #better-codex-dialog button.better-codex-property { cursor: pointer; }
    #better-codex-dialog .better-codex-property select, #better-codex-dialog .better-codex-property input { width: auto; max-width: 128px; border: 0; color: inherit; background: transparent; padding: 0; font: inherit; font-size: inherit; outline: none; }
    #better-codex-dialog .better-codex-property input { width: 72px; }
    #better-codex-dialog .better-codex-project-picker { position: relative; display: inline-flex; }
    #better-codex-dialog .better-codex-project-menu { position: absolute; top: calc(100% + 6px); right: 0; bottom: auto; z-index: 30; display: flex; box-sizing: border-box; width: 220px; max-height: min(320px,calc(100dvh - 32px)); overflow: hidden; flex-direction: column; border: 1px solid var(--bc-color-hairline); border-radius: var(--bc-radius-sm); color: var(--bc-color-text); background: var(--bc-color-surface-raised); padding: 5px; box-shadow: var(--bc-elevation-menu); }
    #better-codex-dialog .better-codex-project-menu.is-above { top: auto; bottom: calc(100% + 6px); flex-direction: column-reverse; }
    #better-codex-dialog .better-codex-project-menu[hidden] { display: none; }
    #better-codex-dialog .better-codex-project-search { box-sizing: border-box; width: 100%; height: var(--bc-control-height); border: 0; border-bottom: 1px solid var(--bc-color-hairline); color: inherit; background: transparent; padding: 0 7px 4px; font: inherit; font-size: var(--bc-text-md); outline: none; }
    #better-codex-dialog .better-codex-project-menu > [data-project-options] { display: flex; min-height: 0; max-height: min(260px,calc(100dvh - 96px)); overflow-y: auto; flex-direction: column; overscroll-behavior: contain; }
    #better-codex-dialog .better-codex-project-menu.is-above > [data-project-options] { flex-direction: column-reverse; }
    #better-codex-dialog .better-codex-project-option { display: flex; width: 100%; min-height: var(--bc-row-height); align-items: center; gap: 7px; border: 0; border-radius: var(--bc-radius-xs); color: inherit; background: transparent; padding: 0 7px; font: inherit; font-size: var(--bc-text-md); text-align: left; cursor: pointer; }
    #better-codex-dialog .better-codex-project-option:hover, #better-codex-dialog .better-codex-project-option:focus-visible { background: var(--bc-color-hover); outline: none; }
    #better-codex-dialog .better-codex-project-option > span:first-of-type { min-width: 0; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    #better-codex-dialog .better-codex-project-check { width: 14px; flex: 0 0 auto; }
    #better-codex-dialog .better-codex-project-empty { color: var(--bc-color-text-faint); padding: 8px 7px; font-size: var(--bc-text-md); }
    #better-codex-dialog .better-codex-dialog-attachments { display: flex; flex: 0 0 auto; flex-wrap: wrap; gap: 6px; padding: 0 16px 8px; }
    #better-codex-dialog .better-codex-dialog-attachments[hidden] { display: none; }
    #better-codex-dialog .better-codex-attachment-chip { display: inline-flex; max-width: 100%; min-height: 28px; align-items: center; gap: 6px; border: 1px solid var(--bc-color-hairline); border-radius: var(--bc-radius-pill); color: var(--bc-color-text-muted); background: var(--bc-color-surface); padding: 0 4px 0 9px; font-size: var(--bc-text-md); }
    #better-codex-dialog .better-codex-attachment-chip.is-image { height: 38px; border-radius: var(--bc-radius-xs); padding-left: 4px; }
    #better-codex-dialog .better-codex-attachment-preview { width: 30px; height: 30px; flex: 0 0 auto; border-radius: var(--bc-radius-xs); object-fit: cover; outline: 1px solid var(--bc-color-hairline); outline-offset: -1px; }
    #better-codex-dialog .better-codex-attachment-chip > span { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    #better-codex-dialog .better-codex-attachment-chip button { display: inline-flex; width: 22px; height: 22px; flex: 0 0 auto; align-items: center; justify-content: center; border: 0; border-radius: var(--bc-radius-pill); color: var(--bc-color-text-muted); background: transparent; padding: 0; cursor: pointer; }
    #better-codex-dialog .better-codex-attachment-chip .better-codex-attachment-preview-button { width: 30px; height: 30px; overflow: hidden; border-radius: var(--bc-radius-xs); }
    #better-codex-dialog .better-codex-attachment-preview-button:focus-visible { outline: none; box-shadow: var(--bc-focus-ring); }
    #better-codex-dialog .better-codex-attachment-chip button:hover { color: var(--bc-color-text); background: var(--bc-color-hover); }
    #better-codex-dialog .better-codex-dialog-footer { display: flex; min-height: 48px; flex: 0 0 auto; align-items: center; justify-content: space-between; gap: 10px; border-top: 1px solid var(--bc-color-hairline); padding: 0 14px 0 18px; }
    #better-codex-dialog .better-codex-dialog-footer-right { display: flex; align-items: center; justify-content: flex-end; gap: 8px; }
    #better-codex-dialog .better-codex-switch-mode { display: inline-flex; height: var(--bc-control-height); align-items: center; gap: 6px; border: 0; border-radius: var(--bc-radius-xs); color: var(--bc-color-text-muted); background: transparent; padding: 0 8px; font: inherit; font-size: var(--bc-text-md); cursor: pointer; }
    #better-codex-dialog[data-mode="manual"] .better-codex-switch-mode { color: var(--bc-color-text); background: var(--bc-color-hover); box-shadow: var(--bc-inset-hairline); }
    #better-codex-dialog .better-codex-switch-mode:hover { color: var(--bc-color-text); background: var(--bc-color-hover); }
    #better-codex-dialog .better-codex-keep-open { display: flex; align-items: center; gap: 6px; color: var(--bc-color-text-muted); font-size: var(--bc-text-md); cursor: pointer; user-select: none; }
    #better-codex-dialog .better-codex-toggle { position: relative; width: 23px; height: 13px; appearance: none; -webkit-appearance: none; border: 0; border-radius: var(--bc-radius-pill); background: var(--bc-color-control); padding: 0; box-shadow: var(--bc-inset-hairline); outline: 0; cursor: pointer; transition: background .15s; }
    #better-codex-dialog .better-codex-toggle:focus, #better-codex-dialog .better-codex-toggle:focus-visible { box-shadow: none; outline: 0; }
    #better-codex-dialog .better-codex-toggle::after { position: absolute; top: 2px; left: 2px; width: 9px; height: 9px; border-radius: var(--bc-radius-pill); background: var(--bc-color-on-primary); box-shadow: var(--bc-elevation-control); content: ""; transition: transform .15s; }
    #better-codex-dialog .better-codex-toggle:checked { background: var(--bc-color-primary); }
    #better-codex-dialog .better-codex-toggle:checked::after { transform: translateX(10px); }
    #better-codex-dialog .better-codex-submit { display: inline-flex; min-width: 112px; height: var(--bc-control-height); align-items: center; justify-content: center; gap: 6px; border: 0; border-radius: var(--bc-radius-xs); color: var(--bc-color-on-primary); background: var(--bc-color-primary); padding: 0 11px; font: inherit; font-size: var(--bc-text-md); font-weight: 550; cursor: pointer; }
    #better-codex-dialog .better-codex-submit:disabled { color: var(--bc-color-on-primary); background: var(--bc-color-text-faint); cursor: not-allowed; opacity: .72; }
    #better-codex-dialog .better-codex-dialog-error { color: var(--bc-color-danger); padding: 0 20px 6px; font-size: var(--bc-text-md); }
  `;
}

export function betterCodexFeatureStylesCss() {
  return String.raw`
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
      color: color-mix(in oklch, var(--bc-color-warning) 72%, var(--bc-color-text));
      background: color-mix(in oklch, var(--bc-color-warning) 12%, var(--bc-color-control));
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
      color: var(--bc-color-success);
      background: color-mix(in oklch, var(--bc-color-success) 12%, var(--bc-color-control));
    }

    @media (hover: hover) {
      #better-codex-panel .better-codex-auto-dispatch:hover {
        color: var(--bc-color-text);
        background: var(--bc-color-hover);
      }

      #better-codex-panel .better-codex-auto-dispatch.is-on:hover {
        color: var(--bc-color-success);
        background: color-mix(in oklch, var(--bc-color-success) 22%, var(--bc-color-control));
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
      grid-column: 2;
      min-width: 0;
      margin: 0;
      border: 0;
      padding: 0;
    }

    #better-codex-profile-dialog legend {
      margin-bottom: var(--bc-space-3);
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
      box-sizing: border-box;
      width: 28px;
      height: 28px;
      min-width: 28px;
      min-height: 28px;
      max-width: 28px;
      max-height: 28px;
      flex: none;
      aspect-ratio: 1;
      border: 0;
      border-radius: 50%;
      place-items: center;
      color: var(--bc-color-on-avatar);
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
      color: var(--bc-color-warning);
    }

    #better-codex-profile-dialog output[data-tone="info"] {
      color: var(--bc-color-info);
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
      border: 1px solid color-mix(in oklch, var(--bc-color-warning) 38%, var(--bc-color-hairline));
      border-radius: var(--bc-radius-sm);
      color: var(--bc-color-warning);
      background: color-mix(in oklch, var(--bc-color-warning) 7%, var(--bc-color-control));
      padding: 0 9px;
      font: inherit;
      font-size: var(--bc-text-sm);
      font-weight: 600;
      cursor: pointer;
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-help-mockup > button:hover {
      background: color-mix(in oklch, var(--bc-color-warning) 13%, var(--bc-color-control));
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
      color: var(--bc-color-success);
      background: color-mix(in oklch, var(--bc-color-success) 13%, var(--bc-color-control));
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
      background: var(--bc-color-success);
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
      color: var(--bc-color-success);
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
      box-shadow: var(--bc-elevation-control);
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
      box-shadow: var(--bc-elevation-control);
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
      color: var(--bc-color-warning);
    }

    #better-codex-auto-dispatch-help-dialog .better-codex-help-error[data-tone="info"] {
      color: var(--bc-color-info);
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
      background: var(--bc-color-success);
      box-shadow: 0 0 0 3px color-mix(in oklch, var(--bc-color-success) 14%, transparent);
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
      color: var(--bc-color-star);
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
      z-index: var(--bc-z-menu);
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

    #better-codex-context-menu .better-codex-context-submenu.is-assignee[data-constrained="true"] .better-codex-context-tag {
      display: none;
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
      color: var(--bc-color-info);
      background: color-mix(in srgb, var(--bc-color-info) 13%, var(--bc-color-control));
    }

    #better-codex-context-menu .better-codex-context-tag[data-tone="reasoning"] {
      color: var(--bc-color-success);
      background: color-mix(in srgb, var(--bc-color-success) 13%, var(--bc-color-control));
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
      color: var(--bc-color-on-primary);
      background: var(--bc-color-primary);
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
      color: var(--bc-color-on-avatar);
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
      color: var(--bc-color-on-avatar);
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
      width: var(--bc-board-scroll-thumb-width);
      height: 13px;
      margin-top: -4px;
      appearance: none;
      -webkit-appearance: none;
      border: 1px solid var(--bc-color-hairline);
      border-radius: 999px;
      background: var(--bc-color-surface-raised);
      box-shadow: var(--bc-elevation-thumb);
    }

    #better-codex-panel .better-codex-board-scroll input::-moz-range-track {
      height: 5px;
      border: 0;
      border-radius: 999px;
      background: var(--bc-color-control);
      box-shadow: inset 0 0 0 1px var(--bc-color-hairline);
    }

    #better-codex-panel .better-codex-board-scroll input::-moz-range-thumb {
      width: var(--bc-board-scroll-thumb-width);
      height: 13px;
      border: 1px solid var(--bc-color-hairline);
      border-radius: 999px;
      background: var(--bc-color-surface-raised);
      box-shadow: var(--bc-elevation-thumb);
    }

    #better-codex-dialog .better-codex-conversation-empty h3 {
      margin: 0;
      color: var(--bc-color-text);
      font-size: var(--bc-text-lg);
      font-weight: 650;
    }

    #better-codex-dialog .better-codex-conversation-empty p {
      margin: var(--bc-space-2) 0 0;
      color: var(--bc-color-text-muted);
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
      color: var(--bc-color-text);
      background: var(--bc-color-surface);
      box-shadow: var(--bc-inset-hairline), none;
    }

    #better-codex-panel .better-codex-recovery-icon svg {
      width: 20px;
      height: 20px;
    }

    #better-codex-panel .better-codex-recovery h2 {
      margin: var(--bc-space-4) 0 0;
      color: var(--bc-color-text);
      font-size: var(--bc-text-xl);
      font-weight: 650;
      letter-spacing: -.02em;
    }

    #better-codex-panel .better-codex-recovery p {
      max-width: 400px;
      margin: var(--bc-space-2) 0 0;
      color: var(--bc-color-text-muted);
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
      background: var(--bc-color-surface);
      padding: var(--bc-space-2);
      box-shadow: var(--bc-inset-hairline);
    }

    #better-codex-panel .better-codex-recovery-command code {
      min-width: 0;
      flex: 1;
      overflow-x: auto;
      color: var(--bc-color-text);
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
      color: var(--bc-color-text);
      background: var(--bc-color-hover);
      padding: 0 var(--bc-space-3);
      font: inherit;
      font-size: var(--bc-text-sm);
      font-weight: 600;
      cursor: pointer;
    }

    #better-codex-panel .better-codex-recovery-command button:hover {
      background: var(--bc-color-pressed);
    }

    #better-codex-panel .better-codex-recovery-retry {
      display: inline-flex;
      height: var(--bc-control-height);
      align-items: center;
      gap: var(--bc-space-2);
      margin-top: var(--bc-space-3);
      border: 0;
      border-radius: var(--bc-radius-sm);
      color: var(--bc-color-on-primary);
      background: var(--bc-color-primary);
      padding: 0 var(--bc-space-4);
      font: inherit;
      font-weight: 600;
      cursor: pointer;
    }

    #better-codex-panel .better-codex-recovery-retry:hover {
      background: color-mix(in oklch, var(--bc-color-primary) 88%, white);
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
      color: var(--bc-color-text-faint);
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

    #better-codex-panel .better-codex-column[data-status="in_progress"] { background: color-mix(in oklch, var(--bc-color-warning) 7%, var(--bc-color-surface)); }
    #better-codex-panel .better-codex-column[data-status="in_review"] { background: color-mix(in oklch, var(--bc-color-success) 7%, var(--bc-color-surface)); }
    #better-codex-panel .better-codex-column[data-status="done"] { background: color-mix(in oklch, var(--bc-color-info) 7%, var(--bc-color-surface)); }
    #better-codex-panel .better-codex-column[data-status="blocked"] { background: color-mix(in oklch, var(--bc-color-danger) 7%, var(--bc-color-surface)); }

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
      color: var(--bc-color-info);
    }

    #better-codex-panel .better-codex-status-icon,
    #better-codex-context-menu .better-codex-status-icon,
    #better-codex-dialog .better-codex-status-icon {
      color: var(--bc-color-text-muted);
    }

    #better-codex-panel .better-codex-status-icon[data-status="in_progress"],
    #better-codex-panel [data-status="in_progress"] .better-codex-status-icon,
    #better-codex-context-menu .better-codex-status-icon[data-status="in_progress"],
    #better-codex-dialog .better-codex-status-icon[data-status="in_progress"] {
      color: var(--bc-color-warning);
    }

    #better-codex-panel .better-codex-status-icon[data-status="in_review"],
    #better-codex-panel [data-status="in_review"] .better-codex-status-icon,
    #better-codex-context-menu .better-codex-status-icon[data-status="in_review"],
    #better-codex-dialog .better-codex-status-icon[data-status="in_review"] {
      color: var(--bc-color-success);
    }

    #better-codex-panel .better-codex-status-icon[data-status="done"],
    #better-codex-panel [data-status="done"] .better-codex-status-icon,
    #better-codex-context-menu .better-codex-status-icon[data-status="done"],
    #better-codex-dialog .better-codex-status-icon[data-status="done"] {
      color: var(--bc-color-info);
    }

    #better-codex-panel .better-codex-status-icon[data-status="blocked"],
    #better-codex-panel [data-status="blocked"] .better-codex-status-icon,
    #better-codex-context-menu .better-codex-status-icon[data-status="blocked"],
    #better-codex-dialog .better-codex-status-icon[data-status="blocked"] {
      color: var(--bc-color-danger);
    }

    #better-codex-panel .better-codex-priority,
    #better-codex-context-menu .better-codex-priority,
    #better-codex-dialog .better-codex-priority {
      color: var(--bc-priority-none);
    }

    #better-codex-panel .better-codex-priority[data-priority="none"],
    #better-codex-context-menu .better-codex-priority[data-priority="none"],
    #better-codex-dialog .better-codex-priority[data-priority="none"] {
      color: var(--bc-priority-none);
    }

    #better-codex-panel .better-codex-priority[data-priority="low"],
    #better-codex-context-menu .better-codex-priority[data-priority="low"],
    #better-codex-dialog .better-codex-priority[data-priority="low"] {
      color: var(--bc-priority-low);
    }

    #better-codex-panel .better-codex-priority[data-priority="medium"],
    #better-codex-context-menu .better-codex-priority[data-priority="medium"],
    #better-codex-dialog .better-codex-priority[data-priority="medium"] {
      color: var(--bc-priority-medium);
    }

    #better-codex-panel .better-codex-priority[data-priority="high"],
    #better-codex-context-menu .better-codex-priority[data-priority="high"],
    #better-codex-dialog .better-codex-priority[data-priority="high"] {
      color: var(--bc-priority-high);
    }

    #better-codex-panel .better-codex-priority[data-priority="urgent"],
    #better-codex-context-menu .better-codex-priority[data-priority="urgent"],
    #better-codex-dialog .better-codex-priority[data-priority="urgent"] {
      color: var(--bc-priority-urgent);
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
      box-shadow: var(--bc-elevation-card);
      transition: transform var(--bc-motion-fast) var(--bc-ease-out), border-color var(--bc-motion-fast) ease-out, box-shadow var(--bc-motion-fast) ease-out;
    }

    #better-codex-panel .better-codex-card:hover {
      border-color: color-mix(in srgb, var(--bc-color-text) 16%, var(--bc-color-hairline));
      background: var(--bc-color-canvas);
      box-shadow: var(--bc-elevation-card), 0 4px 12px color-mix(in srgb, var(--bc-color-text) 6%, transparent);
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
      box-shadow: var(--bc-elevation-card), 0 0 0 2px color-mix(in oklch, var(--bc-color-focus) 30%, transparent);
    }

    .better-codex-card.is-drag-ghost {
      display: block;
      margin: 0 !important;
      border: 1px solid var(--bc-color-hairline);
      border-radius: var(--bc-radius-md);
      color: var(--bc-color-text);
      background: var(--bc-color-canvas);
      padding: var(--bc-space-3);
      opacity: 1 !important;
      box-shadow: var(--bc-elevation-card), 0 6px 16px color-mix(in srgb, var(--bc-color-text) 8%, transparent);
      cursor: grabbing;
      font-family: var(--bc-font-ui);
      font-size: var(--bc-text-base);
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
      color: var(--bc-color-text-muted);
      font-size: var(--bc-text-sm);
    }

    .better-codex-card.is-drag-ghost .better-codex-card-title {
      display: -webkit-box;
      margin: 5px 0 0;
      overflow: hidden;
      color: var(--bc-color-text);
      font-size: var(--bc-text-md);
      font-weight: 550;
      line-height: 1.38;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 2;
    }

    .better-codex-card.is-drag-ghost .better-codex-card-description {
      margin-top: 4px;
      overflow: hidden;
      color: var(--bc-color-text-muted);
      font-size: var(--bc-text-sm);
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
      color: var(--bc-color-text-muted);
      background: var(--bc-color-control);
      padding: 2px 6px;
      font-size: var(--bc-text-caption);
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
      color: var(--bc-color-text-muted);
      font-size: var(--bc-text-sm);
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
      color: var(--bc-color-on-primary);
      background: var(--bc-color-primary);
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
      color: var(--bc-color-on-avatar);
      font-size: 9px;
      font-weight: 700;
      line-height: 1;
    }

    #better-codex-panel .better-codex-activity[data-run="blocked"],
    #better-codex-dialog .better-codex-conversation-status .better-codex-activity[data-run="blocked"] {
      color: var(--bc-color-danger);
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
      color: var(--bc-color-info);
      background: color-mix(in srgb, var(--bc-color-info) 13%, var(--bc-color-control));
    }

    #better-codex-dialog .better-codex-dialog-select-tag[data-tone="reasoning"] {
      color: var(--bc-color-success);
      background: color-mix(in srgb, var(--bc-color-success) 13%, var(--bc-color-control));
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
      color: var(--bc-color-on-avatar);
      background: var(--bc-color-scrim);
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
      color: var(--bc-color-primary);
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
      color: var(--bc-color-info);
      background: color-mix(in oklch, var(--bc-color-info) 14%, var(--bc-color-surface));
    }

    #better-codex-panel .better-codex-agent-suggestion-icon[data-tone="success"] {
      color: var(--bc-color-success);
      background: color-mix(in oklch, var(--bc-color-success) 14%, var(--bc-color-surface));
    }

    #better-codex-panel .better-codex-agent-suggestion-icon[data-tone="warning"] {
      color: var(--bc-color-warning);
      background: color-mix(in oklch, var(--bc-color-warning) 16%, var(--bc-color-surface));
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
      color: var(--bc-color-info);
      background: color-mix(in oklch, var(--bc-color-info) 14%, var(--bc-color-surface));
    }

    #better-codex-panel :is(.better-codex-filter-avatar, .better-codex-card-avatar, .better-codex-agent-list-avatar).is-icon[data-tone="success"],
    #better-codex-context-menu .better-codex-context-avatar.is-icon[data-tone="success"],
    #better-codex-dialog :is(.better-codex-agent-avatar, .better-codex-bubble-avatar).is-icon[data-tone="success"] {
      color: var(--bc-color-success);
      background: color-mix(in oklch, var(--bc-color-success) 14%, var(--bc-color-surface));
    }

    #better-codex-panel :is(.better-codex-filter-avatar, .better-codex-card-avatar, .better-codex-agent-list-avatar).is-icon[data-tone="warning"],
    #better-codex-context-menu .better-codex-context-avatar.is-icon[data-tone="warning"],
    #better-codex-dialog :is(.better-codex-agent-avatar, .better-codex-bubble-avatar).is-icon[data-tone="warning"] {
      color: var(--bc-color-warning);
      background: color-mix(in oklch, var(--bc-color-warning) 16%, var(--bc-color-surface));
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
      width: var(--bc-agent-inspector-width);
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
      inset: var(--bc-agent-fullscreen-top) auto auto var(--bc-agent-fullscreen-left);
      width: var(--bc-agent-fullscreen-width);
      height: var(--bc-agent-fullscreen-height);
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
      background: var(--bc-color-focus);
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
      box-shadow: var(--bc-elevation-card);
      content: "";
      transition: transform var(--bc-motion-fast) var(--bc-ease-out);
    }

    #better-codex-panel .better-codex-agent-switch input:checked + i {
      background: var(--bc-color-primary);
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
      color: var(--bc-color-warning);
    }

    #better-codex-panel .better-codex-agent-menu-item.is-warning small {
      color: color-mix(in oklch, var(--bc-color-warning) 78%, var(--bc-color-text));
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
      color: var(--bc-color-warning);
    }

    #better-codex-panel .better-codex-agent-inspector-error[data-tone="info"] {
      color: var(--bc-color-info);
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
      color: var(--bc-color-success);
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
      inset: var(--bc-dialog-fullscreen-top) auto auto var(--bc-dialog-fullscreen-left);
      width: var(--bc-dialog-fullscreen-width);
      max-width: none;
      height: var(--bc-dialog-fullscreen-height);
      max-height: none;
      margin: 0;
      border: 0;
      border-radius: 0;
      box-shadow: none;
    }

    #better-codex-dialog[data-detail="true"][data-expanded="true"]:has(.better-codex-conversation) {
      height: var(--bc-dialog-fullscreen-height);
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
      border: 1px solid transparent;
      border-radius: var(--bc-radius-md);
      background: color-mix(in oklch, var(--bc-color-surface) 92%, var(--bc-color-hover));
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
      border-bottom: 1px solid transparent;
      padding: calc(var(--bc-text-base) * 0.55) calc(var(--bc-text-base) * 0.85);
      color: var(--bc-color-text-muted);
      font-size: var(--bc-text-md);
      font-weight: 550;
    }

    #better-codex-dialog .better-codex-conversation-status {
      display: inline-flex;
      align-items: center;
      color: var(--bc-color-text-faint);
      font-weight: 500;
    }

    #better-codex-dialog .better-codex-conversation-status .better-codex-activity {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      color: var(--bc-color-text-muted);
      font-size: var(--bc-text-caption);
      font-weight: 600;
    }

    #better-codex-dialog .better-codex-conversation-status .better-codex-activity[data-run="replying"] {
      color: var(--bc-color-text);
    }

    #better-codex-dialog .better-codex-conversation-status .better-codex-activity[data-run="completed"] {
      color: var(--bc-color-success);
    }

    #better-codex-dialog .better-codex-conversation-status .better-codex-activity[data-run="reply-failed"],
    #better-codex-dialog .better-codex-conversation-status .better-codex-activity[data-run="failed"],
    #better-codex-dialog .better-codex-conversation-status .better-codex-activity[data-run="interrupted"] {
      color: var(--bc-color-danger);
    }

    #better-codex-dialog .better-codex-conversation-status .better-codex-activity[data-run="claimed"],
    #better-codex-dialog .better-codex-conversation-status .better-codex-activity[data-run="not-started"] {
      color: var(--bc-color-text-muted);
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
      background: var(--bc-color-info);
    }

    #better-codex-panel .better-codex-scheduler-failed-dot,
    #better-codex-dialog .better-codex-scheduler-failed-dot {
      background: var(--bc-color-danger);
    }

    #better-codex-dialog .better-codex-conversation-status .better-codex-shimmer {
      background-image: linear-gradient(90deg, var(--bc-color-text-muted) 0%, var(--bc-color-text-muted) 35%, var(--bc-color-text) 50%, var(--bc-color-text-muted) 65%, var(--bc-color-text-muted) 100%);
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
      border-top: 1px solid transparent;
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
      color: var(--bc-color-on-primary);
      background: var(--bc-color-primary);
      font-size: var(--bc-text-avatar);
    }

    #better-codex-dialog .better-codex-bubble-avatar.is-user {
      color: var(--bc-color-on-avatar);
      background: var(--bc-color-success);
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
      color: var(--bc-color-text-muted);
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
      color: var(--bc-color-text);
      background: var(--bc-color-hover);
    }

    #better-codex-dialog .better-codex-bubble-copy:focus-visible {
      outline: none;
      box-shadow: var(--bc-focus-ring);
    }

    #better-codex-dialog .better-codex-bubble-copy.is-copied {
      color: var(--bc-color-success);
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
      color: var(--bc-color-text);
      font-size: var(--bc-text-md);
      font-weight: 650;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    #better-codex-dialog .better-codex-bubble-meta time {
      flex: 0 0 auto;
      color: var(--bc-color-text-faint);
      font-size: calc(var(--bc-text-md) * 0.92);
    }

    #better-codex-dialog .better-codex-bubble-content {
      color: color-mix(in oklch, var(--bc-color-text) 88%, var(--bc-color-text-muted));
      font-size: var(--bc-text-md);
      line-height: 1.6;
    }

    #better-codex-dialog .better-codex-bubble.is-user .better-codex-bubble-content {
      color: color-mix(in oklch, var(--bc-color-text) 82%, var(--bc-color-text-muted));
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
      color: var(--bc-color-text);
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
      color: var(--bc-color-text-muted);
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
      color: var(--bc-color-text-faint);
      font-size: var(--bc-text-sm);
    }

    #better-codex-dialog .better-codex-message-attachment-open {
      display: inline-flex;
      width: 24px;
      height: 24px;
      flex: 0 0 auto;
      align-items: center;
      justify-content: center;
      color: var(--bc-color-text-faint);
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
      color: var(--bc-color-text);
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
      color: var(--bc-color-text-faint);
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
      color: var(--bc-color-text-muted);
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
      background: var(--bc-color-canvas);
    }

    #better-codex-attachment-dialog .better-codex-attachment-body > pre {
      box-sizing: border-box;
      width: 100%;
      min-height: 100%;
      margin: 0;
      overflow: auto;
      border-radius: var(--bc-radius-xs);
      color: var(--bc-color-text);
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
      color: var(--bc-color-text-muted);
      text-align: center;
    }

    #better-codex-attachment-dialog .better-codex-attachment-loading svg {
      animation: better-codex-dialog-open-thread-spin 1s linear infinite;
    }

    #better-codex-attachment-dialog .better-codex-attachment-file > svg {
      width: 34px;
      height: 34px;
      color: var(--bc-color-text-faint);
    }

    #better-codex-attachment-dialog .better-codex-attachment-file strong {
      color: var(--bc-color-text);
      font-size: var(--bc-text-lg);
      font-weight: 620;
      overflow-wrap: anywhere;
    }

    #better-codex-attachment-dialog .better-codex-attachment-file span {
      line-height: 1.6;
      text-wrap: pretty;
    }

    #better-codex-attachment-dialog .better-codex-attachment-file.is-error strong {
      color: var(--bc-color-danger);
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
      color: var(--bc-color-text);
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
      color: var(--bc-color-on-primary);
      background: var(--bc-color-primary);
    }

    @media (hover: hover) {
      #better-codex-attachment-dialog footer a.is-primary:hover {
        background: color-mix(in oklch, var(--bc-color-primary) 88%, var(--bc-color-canvas));
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
      color: var(--bc-color-text);
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
      color: var(--bc-color-info);
      text-decoration: underline;
      text-underline-offset: 2px;
    }

    #better-codex-dialog .better-codex-markdown code,
    #better-codex-dialog .better-codex-bubble-content code {
      border-radius: 4px;
      background: color-mix(in oklch, var(--bc-color-hover) 80%, transparent);
      padding: .08em .35em;
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-size: .92em;
    }

    #better-codex-dialog .better-codex-markdown pre,
    #better-codex-dialog .better-codex-bubble-content pre {
      overflow: auto;
      border-radius: var(--bc-radius-sm);
      background: color-mix(in oklch, var(--bc-color-hover) 70%, transparent);
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
      border-left: 3px solid transparent;
      color: var(--bc-color-text-muted);
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
      color: var(--bc-color-text);
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
      background: color-mix(in oklch, var(--bc-color-hover) 75%, var(--bc-color-surface));
      color: var(--bc-color-text);
      font-weight: 650;
    }

    #better-codex-dialog .better-codex-markdown-empty {
      margin: auto;
      padding: 18px 8px;
      color: var(--bc-color-text-faint);
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
      color: var(--bc-color-text-faint);
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
      flex-direction: column;
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

    #better-codex-dialog .better-codex-semantic-group {
      padding: var(--bc-space-2) var(--bc-space-2) var(--bc-space-1);
      color: var(--bc-color-text-faint);
      font-size: var(--bc-text-xs);
      font-weight: 650;
      letter-spacing: .04em;
      text-transform: uppercase;
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

    #better-codex-dialog .better-codex-semantic-warning {
      display: flex;
      align-items: center;
      gap: var(--bc-space-1);
      color: color-mix(in oklch, var(--bc-color-warning) 80%, var(--bc-color-text));
      font-size: var(--bc-text-caption);
    }

    #better-codex-dialog .better-codex-semantic-warning[hidden] {
      display: none;
    }

    #better-codex-dialog .better-codex-semantic-warning svg {
      width: 13px;
      height: 13px;
      flex: 0 0 auto;
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

    #better-codex-dialog .better-codex-composer-queue-edit-field {
      display: flex;
      min-width: 0;
      flex: 1;
      flex-direction: column;
      gap: var(--bc-space-1);
    }

    #better-codex-dialog .better-codex-composer-queue-edit {
      box-sizing: border-box;
      width: 100%;
      min-width: 0;
      min-height: 44px;
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
      border-top: 1px solid color-mix(in oklch, var(--bc-color-warning) 28%, var(--bc-color-hairline));
      padding: var(--bc-space-2) 22px 0;
      color: var(--bc-color-warning);
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
      border: 1px solid color-mix(in oklch, var(--bc-color-danger) 32%, transparent);
      border-radius: var(--bc-radius-sm);
      color: var(--bc-color-danger);
      background: color-mix(in oklch, var(--bc-color-danger) 7%, var(--bc-color-surface));
      padding: 8px 10px;
      font-size: var(--bc-text-md);
      line-height: 1.45;
    }

    #better-codex-dialog .better-codex-conversation-feedback[data-tone="warning"] {
      border-color: color-mix(in oklch, var(--bc-color-warning) 32%, transparent);
      color: var(--bc-color-warning);
      background: color-mix(in oklch, var(--bc-color-warning) 7%, var(--bc-color-surface));
    }

    #better-codex-dialog .better-codex-conversation-feedback[data-tone="warning"] button {
      border-color: color-mix(in oklch, var(--bc-color-warning) 36%, transparent);
      color: var(--bc-color-warning);
    }

    #better-codex-dialog .better-codex-conversation-feedback[data-tone="info"] {
      border-color: color-mix(in oklch, var(--bc-color-info) 32%, transparent);
      color: var(--bc-color-info);
      background: color-mix(in oklch, var(--bc-color-info) 7%, var(--bc-color-surface));
    }

    #better-codex-dialog .better-codex-conversation-feedback[data-tone="info"] button {
      border-color: color-mix(in oklch, var(--bc-color-info) 36%, transparent);
      color: var(--bc-color-info);
    }

    #better-codex-dialog[data-detail="true"] .better-codex-conversation-feedback {
      margin-inline: var(--bc-dialog-content-gutter);
    }

    #better-codex-dialog .better-codex-conversation-feedback[hidden] {
      display: none;
    }

    #better-codex-dialog .better-codex-conversation-feedback button {
      flex: 0 0 auto;
      border: 1px solid color-mix(in oklch, var(--bc-color-danger) 36%, transparent);
      border-radius: var(--bc-radius-sm);
      color: var(--bc-color-danger);
      background: var(--bc-color-surface);
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
      color: var(--bc-color-text);
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
      color: var(--bc-color-text-muted);
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
      color: var(--bc-color-on-primary);
      background: var(--bc-color-primary);
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
        background: color-mix(in oklch, var(--bc-color-primary) 88%, var(--bc-color-input));
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
      color: var(--bc-color-info);
      background: color-mix(in oklch, var(--bc-color-info) 14%, var(--bc-color-surface));
    }

    #better-codex-avatar-picker .better-codex-avatar-preset-visual[data-tone="success"] {
      color: var(--bc-color-success);
      background: color-mix(in oklch, var(--bc-color-success) 14%, var(--bc-color-surface));
    }

    #better-codex-avatar-picker .better-codex-avatar-preset-visual[data-tone="warning"] {
      color: var(--bc-color-warning);
      background: color-mix(in oklch, var(--bc-color-warning) 16%, var(--bc-color-surface));
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
      border: 1px solid color-mix(in srgb, var(--bc-color-on-avatar) 70%, transparent);
      border-radius: inherit;
      box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--bc-color-text) 22%, transparent);
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

      #better-codex-panel[data-surface="issues"] .better-codex-actions {
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
        display: grid;
        width: 100%;
        flex: 1 1 auto;
        grid-template-columns: minmax(0, 1fr) 40px 40px auto 40px;
        grid-template-areas: none;
        align-items: center;
        justify-content: stretch;
        gap: var(--bc-space-1);
        overflow: visible;
        padding: 0;
      }

      #better-codex-panel[data-host="web"][data-surface="issues"] .better-codex-tabs {
        display: none;
      }

      #better-codex-panel[data-host="web"][data-surface="issues"] .better-codex-actions > * {
        min-width: 0;
        margin: 0;
      }

      #better-codex-panel[data-host="web"][data-surface="issues"] .better-codex-actions > #better-codex-working,
      #better-codex-panel[data-host="web"][data-surface="issues"] .better-codex-actions > .better-codex-search-wrap,
      #better-codex-panel[data-host="web"][data-surface="issues"] .better-codex-actions > .better-codex-filter-wrap,
      #better-codex-panel[data-host="web"][data-surface="issues"] .better-codex-actions > .better-codex-auto-dispatch-wrap,
      #better-codex-panel[data-host="web"][data-surface="issues"] .better-codex-actions > .better-codex-create-split {
        grid-area: auto;
      }

      #better-codex-panel[data-host="web"][data-surface="issues"] :is(.better-codex-tabs .better-codex-button, #better-codex-working, #better-codex-filter, #better-codex-auto-dispatch) {
        width: 40px;
        min-width: 40px;
        height: 40px;
        min-height: 40px;
        padding: 0;
      }

      #better-codex-panel[data-host="web"][data-surface="issues"] #better-codex-working {
        width: 100%;
        min-width: 44px;
        justify-content: center;
        padding-inline: 12px;
        text-align: center;
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
        align-items: center;
        justify-content: center;
        gap: var(--bc-space-1);
      }

      #better-codex-panel[data-host="web"][data-surface="issues"] .better-codex-filter-wrap {
        width: 40px;
        height: 40px;
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

      #better-codex-panel[data-host="web"][data-surface="issues"] :is(.better-codex-search-wrap, #better-codex-filter, #better-codex-auto-dispatch, .better-codex-auto-dispatch-help, .better-codex-create-primary) {
        align-items: center;
        justify-content: center;
      }

      #better-codex-panel[data-host="web"][data-surface="issues"] :is(.better-codex-search-wrap, #better-codex-filter, #better-codex-auto-dispatch, .better-codex-auto-dispatch-help, .better-codex-create-primary) > svg {
        display: block;
        margin: auto;
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
        inset: var(--bc-mobile-viewport-top) 0 auto;
        width: 100vw;
        max-width: none;
        height: var(--bc-mobile-viewport-height);
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
        height: var(--bc-mobile-viewport-height);
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
        bottom: calc(var(--bc-mobile-viewport-bottom) + env(safe-area-inset-bottom) + var(--bc-space-3));
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
        bottom: calc(var(--bc-mobile-viewport-bottom) + env(safe-area-inset-bottom) + var(--bc-space-3));
        left: var(--bc-space-3);
        width: auto;
        min-width: 0;
        max-width: none;
        max-height: min(60dvh, 480px);
      }

      #better-codex-dialog[data-host="web"] .better-codex-dialog-properties .better-codex-project-menu.is-above {
        top: auto;
        bottom: calc(var(--bc-mobile-viewport-bottom) + env(safe-area-inset-bottom) + var(--bc-space-3));
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
      color: var(--bc-color-success);
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
      color: var(--bc-color-warning);
    }

    #better-codex-scheduled-dialog output[data-tone="info"] {
      color: var(--bc-color-info);
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
        inset: var(--bc-mobile-viewport-top) 0 auto;
        width: 100vw;
        max-width: none;
        height: var(--bc-mobile-viewport-height);
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
      #better-codex-panel[data-surface="issues"] .better-codex-actions {
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
