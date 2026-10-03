import { mkdirSync, writeFileSync } from "node:fs";
import { resolve, join } from "node:path";
import { connectPluginUI } from "./plugin-ui-session.js";
import assert from "node:assert/strict";

const directory = resolve(process.argv[2]); mkdirSync(directory, { recursive: true });
const { call, evaluate, close } = await connectPluginUI();
const waitFor = async (expression: string) => {
  const until = Date.now() + 5000;
  while (Date.now() < until) {
    if (await evaluate(expression)) return;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error("owned_ui_condition_timeout");
};
try {
  if (process.argv.includes("--foreground")) {
    await call("Page.bringToFront");
    await waitFor(`document.visibilityState === 'visible'`);
  }
  if (process.argv.includes("--close-detail")) await evaluate(`document.querySelector('#better-codex-dialog.is-external-observation [data-dialog-close]')?.click(); true`);
  if (process.argv.includes("--open-board")) await evaluate(`window.__betterCodexUI__?.open('issues'); true`);
  if (process.argv.includes("--cycle-retained-panel")) {
    for (let cycle = 0; cycle < (process.argv.includes("--repeat-cycles") ? 3 : 1); cycle++) {
      await evaluate(`(()=>{window.__betterCodexUI__.close();document.getElementById('better-codex-panel').remove();return true})()`);
      await new Promise(resolve => setTimeout(resolve, 150));
      await evaluate(`window.__betterCodexUI__.open('issues'); true`);
      await new Promise(resolve => setTimeout(resolve, 300));
      if (process.argv.includes("--check-columns")) assert.equal(await evaluate(`document.querySelectorAll('#better-codex-board .better-codex-column-icon').length`), 7);
    }
  }
  if (process.argv.includes("--open-detail")) {
    await evaluate(`document.querySelector('#better-codex-panel [data-issue-id^="external-"]')?.click(); true`);
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  if (process.argv.includes("--check-controls")) {
    const interactions = await evaluate(`(()=>{const p=document.getElementById('better-codex-panel');p.querySelector('[data-view="assigned"]').click();const assigned=p.querySelector('[data-view="assigned"]').classList.contains('is-active');p.querySelector('[data-view="all"]').click();const all=p.querySelector('[data-view="all"]').classList.contains('is-active');p.querySelector('#better-codex-filter').click();const menu=p.querySelector('.better-codex-filter-menu');const filter=!!menu&&menu.getBoundingClientRect().height>0;p.querySelector('#better-codex-filter').click();return {assigned,all,filter}})()`);
    assert.deepEqual(interactions, { assigned: true, all: true, filter: true });
  }
  let columnActions;
  if (process.argv.includes("--check-column-actions")) {
    assert.equal(await evaluate(`!!document.querySelector('#better-codex-dialog[open],#better-codex-archive-dialog[open]')`), false, "Do not disturb an open user dialog");
    columnActions = [];
    for (const status of ["backlog", "todo", "in_progress", "in_review", "done", "blocked"]) {
      await evaluate(`document.querySelector('#better-codex-board [data-add-status="${status}"]').scrollIntoView({block:'nearest',inline:'nearest',behavior:'instant'});true`);
      const hit = await evaluate(`(()=>{const b=document.querySelector('#better-codex-board [data-add-status="${status}"]');const r=b.getBoundingClientRect();const hit=b.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));b.click();return hit})()`);
      await waitFor(`!!document.querySelector('#better-codex-dialog[open] [name="prompt"]')`);
      const opened = await evaluate(`(()=>{const d=document.getElementById('better-codex-dialog');const opened=!!d?.open&&!!d.querySelector('[name="prompt"]');d?.querySelector('[data-dialog-close]')?.click();return opened})()`);
      await waitFor(`!document.getElementById('better-codex-dialog')`);
      assert.equal(hit, true, `column_pointer:${status}`); assert.equal(opened, true, `column_dialog:${status}`);
      assert.equal(await evaluate(`!!document.getElementById('better-codex-dialog')`), false);
      columnActions.push({ status, receives_pointer: hit, opens_creation_dialog: opened, submitted: false });
    }
    await evaluate(`document.querySelector('#better-codex-board [data-archive-open]').click();true`);
    await waitFor(`!!document.querySelector('#better-codex-archive-dialog[open]')`);
    const archive = await evaluate(`(()=>{const d=document.getElementById('better-codex-archive-dialog');const opened=!!d?.open;d?.dispatchEvent(new Event('cancel',{cancelable:true}));return opened})()`);
    assert.equal(archive, true); assert.equal(await evaluate(`!!document.getElementById('better-codex-archive-dialog')`), false);
    columnActions.push({ status: "archive", opens_archive_dialog: archive, deleted: false, restored: false });
    await evaluate(`document.querySelector('#better-codex-board').scrollLeft=0;true`);
  }
  if (process.argv.includes("--after-refresh")) await new Promise(resolve => setTimeout(resolve, 5500));
  if (process.argv.includes("--check-detail-actions")) {
    await evaluate(`document.querySelector('#better-codex-dialog.is-external-observation [data-dialog-expand]').click();true`);
    assert.equal(await evaluate(`document.querySelector('#better-codex-dialog.is-external-observation')?.dataset.expanded`), "true");
    await evaluate(`document.querySelector('#better-codex-dialog.is-external-observation [data-dialog-expand]').click();true`);
    assert.equal(await evaluate(`document.querySelector('#better-codex-dialog.is-external-observation')?.dataset.expanded`), "false");
    await new Promise(resolve => setTimeout(resolve, 300));
  }
  const proof = await evaluate(`(()=>{
    const shape=node=>{if(!node)return null;const style=getComputedStyle(node);const r=node.getBoundingClientRect();return {tag:node.tagName,id:node.id,className:node.className,hidden:node.hidden,rect:{x:r.x,y:r.y,width:r.width,height:r.height,top:r.top,bottom:r.bottom},display:style.display,position:style.position,visibility:style.visibility,overflow:style.overflow,flex:style.flex,transform:style.transform,scrollTop:node.scrollTop}};
    const panel=document.getElementById('better-codex-panel'),toolbar=panel?.querySelector('.better-codex-toolbar');
    const ancestors=[];for(let node=panel?.parentElement;node&&ancestors.length<6;node=node.parentElement)ancestors.push(shape(node));
    const detail=document.querySelector('#better-codex-dialog.is-external-observation'),body=detail?.querySelector('.better-codex-external-detail-body');
    const columns=Array.from(panel?.querySelectorAll('#better-codex-board > .better-codex-column')||[]).map(column=>({status:column.dataset.status,button:shape(column.querySelector('.better-codex-column-icon')),count:column.querySelector('.better-codex-column-title > span:last-child')?.textContent}));
    return {checked_at:new Date().toISOString(),host:window.__betterCodexUI__?.host,columns,creation:shape(document.querySelector('#better-codex-dialog:not(.is-external-observation)')),creationOpen:document.querySelector('#better-codex-dialog:not(.is-external-observation)')?.open,visibilityState:document.visibilityState,viewport:{width:innerWidth,height:innerHeight,scrollY},ready:window.__betterCodexUI__?.ready(),bootstrap_error:window.__betterCodexUI__?.bootstrapError(),surface:panel?.dataset.surface,panel:shape(panel),toolbar:shape(toolbar),board:shape(panel?.querySelector('#better-codex-board')),detail:shape(detail),detailFormatting:detail?{descriptionSection:!!detail.querySelector('section.better-codex-external-description .better-codex-markdown'),historySection:!!detail.querySelector('section.better-codex-external-history'),markdownMessages:detail.querySelectorAll('.better-codex-external-message-content.better-codex-markdown').length,metadataCollapsed:!detail.querySelector('details')?.open,bodyGap:body?getComputedStyle(body).gap:null,bodyOverflow:body?getComputedStyle(body).overflow:null,bodyBottom:body?.getBoundingClientRect().bottom,scrollable:!!body&&body.scrollHeight>body.clientHeight}:null,ancestors,controls:Array.from(toolbar?.querySelectorAll('[data-view],#better-codex-search,#better-codex-filter,#better-codex-create-toggle')||[]).map(shape),bodyOverflow:document.documentElement.style.overflow};
  })()`);
  const name = process.argv.includes("--close-detail") ? "closed" : process.argv.includes("--open-detail") ? "opened" : process.argv.includes("--cycle-retained-panel") ? "route-cycle" : "current";
  proof.columnActions = columnActions;
  if (process.argv.includes("--check-creators")) {
    proof.creator = await evaluate(`(()=>{
      const detail=document.querySelector('#better-codex-dialog.is-external-observation'),creator=detail?.querySelector('[data-detail-creator]'),image=creator?.querySelector('img'),card=document.querySelector('#better-codex-panel [data-card-creator="profile:dot-current"]');
      const head=detail?.querySelector('.better-codex-dialog-head')?.getBoundingClientRect(),bounds=creator?.getBoundingClientRect();
      return {filterKey:creator?.dataset.detailCreator,name:creator?.querySelector('[data-creator-name]')?.textContent,inHeader:!!creator?.closest('.better-codex-dialog-head-actions'),image:image?{loaded:image.complete,width:image.naturalWidth,height:image.naturalHeight}:null,cardVisibleText:card?.innerText.trim(),cardNameCount:document.querySelectorAll('#better-codex-panel [data-card-creator] [data-creator-name]').length,dialogEditableCount:detail?.querySelectorAll('input,textarea,[contenteditable="true"],[type="submit"],[data-dialog-start-now],[data-dialog-stop]').length,computedWidth:detail?getComputedStyle(detail).width:null,headerRightAligned:!!bounds&&!!head&&bounds.x>=head.x+head.width/2&&bounds.right<=head.right};
    })()`);
    assert.equal(proof.creator.filterKey, "profile:dot-current");
    assert.equal(proof.creator.name, "创建者：dot");
    assert.equal(proof.creator.inHeader && proof.creator.headerRightAligned, true);
    assert.deepEqual(proof.creator.image, {loaded:true,width:512,height:512});
    assert.equal(proof.creator.cardVisibleText, ""); assert.equal(proof.creator.cardNameCount, 0);
    assert.equal(proof.creator.dialogEditableCount, 0);
  }
  proof.retained_panel_cycles = process.argv.includes("--cycle-retained-panel") ? (process.argv.includes("--repeat-cycles") ? 3 : 1) : 0;
  proof.waited_for_refresh_ms = process.argv.includes("--after-refresh") ? 5500 : 0;
  if (process.argv.includes("--check-columns")) {
    assert.equal(proof.columns.length, 7);
    for (const column of proof.columns) {
      assert.ok(column.button, `missing_column_button:${column.status}`);
      assert.ok(column.button.rect.width > 0 && column.button.rect.height > 0 && column.button.visibility === "visible" && column.button.display !== "none", `hidden_column_button:${column.status}`);
    }
  }
  if (process.argv.includes("--check")) {
    assert.equal(proof.ready, true); assert.ok(proof.toolbar?.rect.height > 0); assert.equal(proof.controls.length, 6);
    assert.ok(proof.board.rect.top >= proof.toolbar.rect.bottom);
    for (const control of proof.controls) assert.ok(control.rect.width > 0 && control.rect.height > 0 && control.rect.top >= proof.toolbar.rect.top && control.rect.bottom <= proof.toolbar.rect.bottom);
    if (process.argv.includes("--open-detail")) { assert.ok(proof.detailFormatting.descriptionSection && proof.detailFormatting.historySection && proof.detailFormatting.markdownMessages > 0); assert.ok(proof.detailFormatting.bodyBottom <= proof.detail.rect.bottom); assert.equal(proof.detailFormatting.scrollable, true); }
  }
  writeFileSync(join(directory, `${name}-geometry.json`), JSON.stringify(proof, null, 2));
  const bounds = proof.detail?.rect || proof.panel?.rect;
  if (bounds?.width > 0 && bounds?.height > 0) {
    const clip = { x: Math.max(0, bounds.x), y: Math.max(0, bounds.y), width: Math.min(bounds.width, proof.viewport.width - Math.max(0, bounds.x)), height: Math.min(bounds.height, proof.viewport.height - Math.max(0, bounds.y)), scale: 1 };
    const screenshot = await call("Page.captureScreenshot", { format: "png", clip, captureBeyondViewport: false });
    writeFileSync(join(directory, `${name}-board.png`), Buffer.from(screenshot.data, "base64"));
  }
  console.log(JSON.stringify({ checked_at: proof.checked_at, ready: proof.ready, host: proof.host, columnActions: proof.columnActions, columns: proof.columns, toolbar: proof.toolbar?.rect, board: proof.board?.rect, control_count: proof.controls.length, detail: proof.detail?.rect, detailFormatting: proof.detailFormatting }, null, 2));
} finally { close(); }
