export function injectionScript(port: number, accessToken: string, action: "install" | "uninstall") {
  if (action === "uninstall") {
    return `(() => {
      window.__tiloInjection__?.destroy?.();
      document.querySelectorAll('[data-tilo-owned="true"]').forEach(node => node.remove());
      document.querySelectorAll('[data-tilo-native-hidden="true"]').forEach(node => node.removeAttribute('data-tilo-native-hidden'));
      document.querySelectorAll('[data-tilo-page-host="true"]').forEach(node => node.removeAttribute('data-tilo-page-host'));
      document.documentElement.removeAttribute('data-tilo-open');
      delete window.__tiloInjection__;
      return { uninstalled: true };
    })()`;
  }
  const baseUrl = JSON.stringify(`http://127.0.0.1:${port}`);
  const token = JSON.stringify(accessToken);
  return `(() => {
    "use strict";
    const VERSION = "0.1.0";
    const previous = window.__tiloInjection__;
    if (previous?.version === VERSION) {
      previous.refresh();
      return { installed: true, reused: true };
    }
    previous?.destroy?.();

    const ENTRY_ID = "tilo-entry";
    const PANEL_ID = "tilo-panel";
    const STYLE_ID = "tilo-style";
    const OWNED = "data-tilo-owned";
    const HIDDEN = "data-tilo-native-hidden";
    const HOST = "data-tilo-page-host";
    const BASE_URL = ${baseUrl};
    const TOKEN = ${token};
    const statusLabels = { backlog: "待整理", todo: "待办", in_progress: "进行中", blocked: "阻塞", in_review: "审核中", done: "完成" };
    const priorityLabels = { none: "无", low: "低", medium: "中", high: "高", urgent: "紧急" };
    const state = { projects: [], issues: [], projectId: "", search: "", selected: null };
    let entry = null;
    let panel = null;
    let observer = null;
    let timer = null;
    let active = false;
    let destroyed = false;

    function label(value) {
      return String(value || "").replace(/\\s+/g, " ").trim().toLowerCase();
    }

    function escapeHtml(value) {
      return String(value ?? "").replace(/[&<>\"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\\\"": "&quot;", "'": "&#39;" })[character]);
    }

    function installStyle() {
      if (document.getElementById(STYLE_ID)) return;
      const style = document.createElement("style");
      style.id = STYLE_ID;
      style.setAttribute(OWNED, "true");
      style.textContent = \`
        #\${ENTRY_ID}[aria-current="page"] { background: var(--color-token-list-hover-background, color-mix(in srgb, currentColor 8%, transparent)); }
        [\${HOST}="true"] { position: relative !important; z-index: 31 !important; pointer-events: none !important; }
        [\${HIDDEN}="true"] { visibility: hidden !important; pointer-events: none !important; }
        #\${PANEL_ID} { position: absolute; inset: 0; z-index: 2; display: flex; min-width: 0; min-height: 0; flex-direction: column; overflow: hidden; color: inherit; background: var(--color-token-bg-primary, Canvas); pointer-events: auto; }
        #\${PANEL_ID}[hidden] { display: none !important; }
        #\${PANEL_ID} .tilo-toolbar { display: flex; align-items: center; gap: 8px; min-height: 52px; padding: 0 16px; border-bottom: 1px solid var(--color-token-border-default, color-mix(in srgb, currentColor 14%, transparent)); }
        #\${PANEL_ID} .tilo-title { margin-right: auto; font-size: 15px; font-weight: 600; }
        #\${PANEL_ID} .tilo-control { min-height: 30px; border: 1px solid var(--color-token-border-default, color-mix(in srgb, currentColor 15%, transparent)); border-radius: 6px; color: inherit; background: transparent; padding: 0 8px; font: inherit; }
        #\${PANEL_ID} .tilo-search { width: 180px; }
        #\${PANEL_ID} .tilo-board { display: grid; grid-auto-columns: minmax(220px, 1fr); grid-auto-flow: column; gap: 10px; min-height: 0; flex: 1; overflow: auto; padding: 12px; }
        #\${PANEL_ID} .tilo-column { display: flex; min-height: 180px; flex-direction: column; gap: 7px; border-radius: 8px; background: color-mix(in srgb, currentColor 4%, transparent); padding: 8px; }
        #\${PANEL_ID} .tilo-column-head { display: flex; align-items: center; justify-content: space-between; padding: 2px 3px 6px; font-size: 12px; font-weight: 600; }
        #\${PANEL_ID} .tilo-card { border: 1px solid var(--color-token-border-default, color-mix(in srgb, currentColor 12%, transparent)); border-radius: 7px; background: var(--color-token-bg-primary, Canvas); padding: 9px; cursor: pointer; }
        #\${PANEL_ID} .tilo-card:hover { background: var(--color-token-list-hover-background, color-mix(in srgb, currentColor 6%, transparent)); }
        #\${PANEL_ID} .tilo-card-id { display: flex; justify-content: space-between; color: color-mix(in srgb, currentColor 55%, transparent); font-size: 11px; }
        #\${PANEL_ID} .tilo-card-title { margin: 6px 0 8px; font-size: 13px; line-height: 1.35; }
        #\${PANEL_ID} .tilo-card-meta { display: flex; gap: 6px; color: color-mix(in srgb, currentColor 60%, transparent); font-size: 11px; }
        #\${PANEL_ID} .tilo-link { margin-left: auto; }
        #\${PANEL_ID} .tilo-empty { padding: 16px 4px; text-align: center; color: color-mix(in srgb, currentColor 45%, transparent); font-size: 12px; }
        #tilo-dialog { width: min(560px, calc(100vw - 64px)); border: 1px solid var(--color-token-border-default, color-mix(in srgb, currentColor 15%, transparent)); border-radius: 10px; color: inherit; background: var(--color-token-bg-primary, Canvas); padding: 18px; }
        #tilo-dialog::backdrop { background: rgba(0,0,0,.38); }
        #tilo-dialog form { display: grid; gap: 12px; }
        #tilo-dialog label { display: grid; gap: 5px; font-size: 12px; }
        #tilo-dialog input, #tilo-dialog textarea, #tilo-dialog select { box-sizing: border-box; width: 100%; border: 1px solid var(--color-token-border-default, color-mix(in srgb, currentColor 15%, transparent)); border-radius: 6px; color: inherit; background: transparent; padding: 8px; font: inherit; }
        #tilo-dialog textarea { min-height: 110px; resize: vertical; }
        #tilo-dialog .tilo-dialog-row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        #tilo-dialog .tilo-dialog-actions { display: flex; gap: 8px; justify-content: flex-end; }
        #tilo-dialog .tilo-check { display: flex; align-items: center; gap: 7px; }
        #tilo-dialog .tilo-check input { width: auto; }
      \`;
      (document.head || document.documentElement).appendChild(style);
    }

    function findReferenceButton() {
      const scroll = document.querySelector("[data-app-action-sidebar-scroll]");
      if (!scroll) return null;
      const buttons = Array.from(scroll.querySelectorAll("button"));
      const plugin = buttons.find(button => ["插件", "plugins"].includes(label(button.textContent || button.getAttribute("aria-label"))));
      if (plugin) return plugin;
      return buttons.find(button => button.closest("[data-app-action-sidebar-section]")) || buttons[0] || null;
    }

    function nativeButton(text) {
      const reference = findReferenceButton();
      const button = reference ? reference.cloneNode(true) : document.createElement("button");
      button.type = "button";
      ["id", "disabled", "aria-current", "aria-expanded", "aria-controls", "aria-describedby", "data-state"].forEach(name => button.removeAttribute(name));
      button.querySelectorAll("[id]").forEach(node => node.removeAttribute("id"));
      const content = button.querySelector(".text-fade-truncate") || Array.from(button.querySelectorAll("span")).at(-1);
      if (content) content.textContent = text;
      else button.textContent = text;
      return button;
    }

    function createEntry(reference) {
      const button = nativeButton("Tilo");
      button.id = ENTRY_ID;
      button.setAttribute(OWNED, "true");
      button.setAttribute("aria-label", "打开 Tilo");
      button.setAttribute("title", "Tilo");
      const icon = button.querySelector("svg");
      if (icon) {
        icon.setAttribute("viewBox", "0 0 24 24");
        icon.setAttribute("fill", "none");
        icon.setAttribute("stroke", "currentColor");
        icon.setAttribute("stroke-width", "1.8");
        icon.innerHTML = '<rect x="3.5" y="4" width="17" height="16" rx="2.5"></rect><path d="M9 4v16M14.5 8h2.5M14.5 12h2.5M14.5 16h2.5"></path>';
      }
      button.addEventListener("click", event => {
        event.preventDefault();
        event.stopPropagation();
        open();
      });
      return button;
    }

    function ensureEntry() {
      if (destroyed) return;
      installStyle();
      const reference = findReferenceButton();
      if (!reference?.parentElement) return;
      if (!entry) entry = createEntry(reference);
      if (entry.parentElement !== reference.parentElement || entry.previousElementSibling !== reference) reference.after(entry);
      entry.toggleAttribute("aria-current", active);
      if (active) entry.setAttribute("aria-current", "page");
    }

    function findMount() {
      const frame = document.querySelector(".app-shell-main-content-frame");
      const layout = frame?.closest("[data-app-shell-main-content-layout]") || document.querySelector("[data-app-shell-main-content-layout]");
      const surface = layout?.parentElement;
      return surface?.closest("main") ? surface : null;
    }

    function activeThreadRow() {
      const rows = Array.from(document.querySelectorAll("[data-app-action-sidebar-thread-id]"));
      return rows.find(row => row.getAttribute("data-app-action-sidebar-thread-active") === "true") || rows.find(row => ["page", "true"].includes(row.getAttribute("aria-current"))) || null;
    }

    function readContext() {
      const row = activeThreadRow();
      const projectList = row?.closest("[data-app-action-sidebar-project-list-id]");
      const projectRow = row?.closest("[data-app-action-sidebar-project-id]") || document.querySelector('[data-app-action-sidebar-project-row][aria-current="page"]');
      const projects = Array.from(document.querySelectorAll("[data-app-action-sidebar-project-row]")).flatMap(item => {
        const id = item.getAttribute("data-app-action-sidebar-project-id")?.trim();
        const name = (item.getAttribute("data-app-action-sidebar-project-label") || item.getAttribute("aria-label") || "").trim();
        return id && name ? [{ id, name }] : [];
      });
      const url = new URL(location.href);
      return {
        projectId: projectList?.getAttribute("data-app-action-sidebar-project-list-id") || projectRow?.getAttribute("data-app-action-sidebar-project-id") || "",
        threadId: row?.getAttribute("data-app-action-sidebar-thread-id") || location.pathname.match(/\\/local\\/([^/?#]+)/)?.[1] || "",
        workspacePath: url.searchParams.get("workspace") || url.searchParams.get("cwd") || "",
        projects
      };
    }

    async function api(path, options = {}) {
      const separator = path.includes("?") ? "&" : "?";
      const response = await fetch(BASE_URL + path + separator + "token=" + encodeURIComponent(TOKEN), {
        ...options,
        headers: options.body ? { "content-type": "text/plain;charset=UTF-8" } : undefined
      });
      const value = await response.json();
      if (!response.ok) throw new Error(value.error || "request_failed");
      return value;
    }

    function createPanel() {
      const nativeFrame = document.querySelector(".app-shell-main-content-frame");
      const section = document.createElement("section");
      section.id = PANEL_ID;
      section.className = nativeFrame?.className || "";
      section.hidden = true;
      section.setAttribute(OWNED, "true");
      const toolbar = document.createElement("header");
      toolbar.className = "tilo-toolbar";
      const title = document.createElement("div");
      title.className = "tilo-title";
      title.textContent = "Tilo";
      const projects = document.createElement("select");
      projects.id = "tilo-project";
      projects.className = "tilo-control";
      projects.addEventListener("change", () => { state.projectId = projects.value; void loadIssues(); });
      const search = document.querySelector('input[type="search"]')?.cloneNode(false) || document.createElement("input");
      search.id = "tilo-search";
      search.classList.add("tilo-control", "tilo-search");
      search.placeholder = "搜索任务";
      search.value = "";
      search.addEventListener("input", () => { state.search = search.value; void loadIssues(); });
      const addProject = nativeButton("新建项目");
      addProject.addEventListener("click", async () => {
        const name = window.prompt("项目名称");
        if (!name?.trim()) return;
        const project = await api("/api/projects", { method: "POST", body: JSON.stringify({ name, workspace_path: readContext().workspacePath }) });
        state.projects.push(project);
        state.projectId = project.id;
        await loadIssues();
      });
      const addIssue = nativeButton("新建任务");
      addIssue.addEventListener("click", () => openEditor());
      const refreshButton = nativeButton("刷新");
      refreshButton.addEventListener("click", () => load());
      toolbar.append(title, projects, search, addProject, addIssue, refreshButton);
      const board = document.createElement("main");
      board.id = "tilo-board";
      board.className = "tilo-board";
      board.addEventListener("click", onBoardClick);
      board.addEventListener("dragstart", event => event.dataTransfer?.setData("text/plain", event.target.closest("[data-issue-id]")?.dataset.issueId || ""));
      board.addEventListener("dragover", event => event.preventDefault());
      board.addEventListener("drop", onDrop);
      section.append(toolbar, board);
      return section;
    }

    function render() {
      if (!panel) return;
      const projectSelect = panel.querySelector("#tilo-project");
      projectSelect.innerHTML = state.projects.map(project => '<option value="' + escapeHtml(project.id) + '">' + escapeHtml(project.name) + "</option>").join("");
      projectSelect.value = state.projectId;
      panel.querySelector("#tilo-board").innerHTML = Object.entries(statusLabels).map(([status, statusLabel]) => {
        const issues = state.issues.filter(issue => issue.status === status);
        const cards = issues.map(issue => '<article class="tilo-card" draggable="true" data-issue-id="' + escapeHtml(issue.id) + '"><div class="tilo-card-id"><span>' + escapeHtml(issue.identifier) + '</span><button type="button" data-pin="' + escapeHtml(issue.id) + '" aria-label="置顶">' + (issue.pinned ? "◆" : "◇") + '</button></div><div class="tilo-card-title">' + escapeHtml(issue.title) + '</div><div class="tilo-card-meta"><span>' + priorityLabels[issue.priority] + '</span>' + (issue.thread_id ? '<button type="button" class="tilo-link" data-thread="' + escapeHtml(issue.thread_id) + '">打开对话</button>' : "") + "</div></article>").join("");
        return '<section class="tilo-column" data-status="' + status + '"><div class="tilo-column-head"><span>' + statusLabel + "</span><span>" + issues.length + "</span></div>" + (cards || '<div class="tilo-empty">暂无任务</div>') + "</section>";
      }).join("");
    }

    async function loadIssues() {
      if (!state.projectId) return render();
      const query = new URLSearchParams({ project_id: state.projectId });
      if (state.search) query.set("search", state.search);
      state.issues = await api("/api/issues?" + query);
      render();
    }

    async function load() {
      try {
        const bootstrap = await api("/api/bootstrap");
        state.projects = bootstrap.projects;
        const context = readContext();
        if (context.projectId) {
          let project = state.projects.find(item => item.external_id === context.projectId);
          if (!project) {
            const source = context.projects.find(item => item.id === context.projectId);
            project = await api("/api/projects/ensure", { method: "POST", body: JSON.stringify({ external_id: context.projectId, name: source?.name || "Codex", workspace_path: context.workspacePath }) });
            state.projects.push(project);
          }
          state.projectId = project.id;
        } else if (!state.projects.some(item => item.id === state.projectId)) {
          state.projectId = state.projects[0]?.id || "";
        }
        await loadIssues();
      } catch (error) {
        const board = panel?.querySelector("#tilo-board");
        if (board) board.innerHTML = '<div class="tilo-empty">' + escapeHtml(error.message || "无法连接 Gateway") + "</div>";
      }
    }

    function openEditor(issue = null) {
      state.selected = issue;
      document.getElementById("tilo-dialog")?.remove();
      const context = readContext();
      const dialog = document.createElement("dialog");
      dialog.id = "tilo-dialog";
      dialog.setAttribute(OWNED, "true");
      dialog.innerHTML = '<form method="dialog"><label>标题<input name="title" required maxlength="500"></label><label>描述<textarea name="description"></textarea></label><div class="tilo-dialog-row"><label>状态<select name="status">' + Object.entries(statusLabels).map(([value, text]) => '<option value="' + value + '">' + text + "</option>").join("") + '</select></label><label>优先级<select name="priority">' + Object.entries(priorityLabels).map(([value, text]) => '<option value="' + value + '">' + text + "</option>").join("") + '</select></label></div><label class="tilo-check"><input name="thread" type="checkbox">关联当前对话</label><div class="tilo-dialog-actions"></div></form>';
      dialog.querySelector('[name="title"]').value = issue?.title || "";
      dialog.querySelector('[name="description"]').value = issue?.description || "";
      dialog.querySelector('[name="status"]').value = issue?.status || "todo";
      dialog.querySelector('[name="priority"]').value = issue?.priority || "medium";
      const thread = dialog.querySelector('[name="thread"]');
      thread.checked = Boolean(issue?.thread_id || context.threadId);
      thread.disabled = !context.threadId && !issue?.thread_id;
      const actions = dialog.querySelector(".tilo-dialog-actions");
      if (issue) {
        const archive = nativeButton("归档");
        archive.addEventListener("click", async () => {
          await api("/api/issues/" + encodeURIComponent(issue.id) + "/archive", { method: "POST", body: JSON.stringify({ version: issue.version }) });
          dialog.close();
          await loadIssues();
        });
        actions.append(archive);
      }
      const cancel = nativeButton("取消");
      cancel.addEventListener("click", () => dialog.close());
      const save = nativeButton("保存");
      save.type = "submit";
      actions.append(cancel, save);
      dialog.querySelector("form").addEventListener("submit", async event => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        const body = {
          title: form.get("title"),
          description: form.get("description"),
          status: form.get("status"),
          priority: form.get("priority"),
          thread_id: thread.checked ? (context.threadId || issue?.thread_id || "") : "",
          workspace_path: context.workspacePath
        };
        if (issue) await api("/api/issues/" + encodeURIComponent(issue.id), { method: "PATCH", body: JSON.stringify({ ...body, version: issue.version }) });
        else await api("/api/issues", { method: "POST", body: JSON.stringify({ ...body, project_id: state.projectId }) });
        dialog.close();
        await loadIssues();
      });
      document.body.append(dialog);
      dialog.addEventListener("close", () => dialog.remove(), { once: true });
      dialog.showModal();
    }

    async function onBoardClick(event) {
      const thread = event.target.closest("[data-thread]");
      if (thread) return openThread(thread.dataset.thread);
      const pin = event.target.closest("[data-pin]");
      if (pin) {
        const issue = state.issues.find(item => item.id === pin.dataset.pin);
        if (!issue) return;
        await api("/api/issues/" + encodeURIComponent(issue.id), { method: "PATCH", body: JSON.stringify({ version: issue.version, pinned: !issue.pinned }) });
        return loadIssues();
      }
      const card = event.target.closest("[data-issue-id]");
      const issue = state.issues.find(item => item.id === card?.dataset.issueId);
      if (issue) openEditor(issue);
    }

    async function onDrop(event) {
      event.preventDefault();
      const id = event.dataTransfer?.getData("text/plain");
      const status = event.target.closest("[data-status]")?.dataset.status;
      const issue = state.issues.find(item => item.id === id);
      if (!issue || !status || issue.status === status) return;
      await api("/api/issues/" + encodeURIComponent(issue.id), { method: "PATCH", body: JSON.stringify({ version: issue.version, status }) });
      await loadIssues();
    }

    function mountPanel() {
      if (!active) return;
      const surface = findMount();
      if (!surface) return;
      if (!panel) panel = createPanel();
      if (panel.parentElement !== surface) surface.appendChild(panel);
      surface.setAttribute(HOST, "true");
      Array.from(surface.children).forEach(child => {
        if (child !== panel && child.getAttribute(OWNED) !== "true") child.setAttribute(HIDDEN, "true");
      });
      panel.hidden = false;
      document.documentElement.setAttribute("data-tilo-open", "true");
    }

    function restoreNative() {
      document.querySelectorAll('[' + HIDDEN + '="true"]').forEach(node => node.removeAttribute(HIDDEN));
      document.querySelectorAll('[' + HOST + '="true"]').forEach(node => node.removeAttribute(HOST));
      document.documentElement.removeAttribute("data-tilo-open");
    }

    function open() {
      if (destroyed) return;
      active = true;
      ensureEntry();
      mountPanel();
      void load();
    }

    function close() {
      active = false;
      if (panel) panel.hidden = true;
      restoreNative();
      ensureEntry();
    }

    function openThread(threadId) {
      const expected = String(threadId || "").replace(/^(local|cloud):/i, "");
      const row = Array.from(document.querySelectorAll("[data-app-action-sidebar-thread-id]")).find(item => String(item.getAttribute("data-app-action-sidebar-thread-id") || "").replace(/^(local|cloud):/i, "") === expected);
      close();
      if (row) row.click();
      else window.postMessage({ type: "navigate-to-route", path: "/local/" + encodeURIComponent(expected) }, window.location.origin);
    }

    function onClick(event) {
      if (!active) return;
      const target = event.target?.closest?.("button,a,[role='button'],[data-app-action-sidebar-thread-id]");
      if (!target || target === entry || target.closest("#" + PANEL_ID) || target.closest("#tilo-dialog")) return;
      if (target.closest('aside nav[role="navigation"]')) close();
    }

    function refresh() {
      ensureEntry();
      if (active) mountPanel();
    }

    function scheduleRefresh() {
      if (timer !== null || destroyed) return;
      timer = setTimeout(() => {
        timer = null;
        refresh();
      }, 160);
    }

    function destroy() {
      if (destroyed) return;
      destroyed = true;
      if (timer !== null) clearTimeout(timer);
      observer?.disconnect();
      document.removeEventListener("DOMContentLoaded", mount);
      document.removeEventListener("click", onClick, true);
      close();
      document.querySelectorAll('[' + OWNED + '="true"]').forEach(node => node.remove());
      delete window.__tiloInjection__;
    }

    function mount() {
      document.removeEventListener("DOMContentLoaded", mount);
      if (destroyed || observer || !document.documentElement) return;
      observer = new MutationObserver(scheduleRefresh);
      observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ["class", "data-theme", "aria-current", "data-app-action-sidebar-thread-active"] });
      ensureEntry();
    }

    window.__tiloInjection__ = { version: VERSION, refresh, open, close, destroy };
    document.addEventListener("click", onClick, true);
    if (document.documentElement) mount();
    else document.addEventListener("DOMContentLoaded", mount, { once: true });
    return { installed: true, reused: false };
  })()`;
}
