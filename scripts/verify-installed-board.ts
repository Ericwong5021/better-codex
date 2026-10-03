/** Inspect only Better Codex's owned UI on its already trusted desktop integration. */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { parseArgs } from "node:util";
import { connectPluginUI } from "./plugin-ui-session.js";
import { McpRuntimeClient } from "../src/mcp-runtime-client.js";
const { values } = parseArgs({ options: { "allow-installed": { type: "boolean" }, "evidence-dir": { type: "string" }, "task-id": { type: "string" }, "parent-thread-id": { type: "string" }, "require-avatar-sha256": { type: "string" } } });
if (!values["allow-installed"] || !values["evidence-dir"] || !values["task-id"]) throw new Error("Explicit installed UI verification arguments required");
const dir = resolve(values["evidence-dir"]); mkdirSync(dir, { recursive: true });
const { call: request, evaluate, close } = await connectPluginUI();
const client = new McpRuntimeClient();
const proof: any = { host: "existing Better Codex plugin page", task_identity: "caller-declared current verification task", automated_discovery: false };
try {
  await request("Page.bringToFront", {});
  const before = await evaluate(`({open:document.documentElement.hasAttribute('data-better-codex-open'),version:window.__betterCodexUI__?.version,surface:document.getElementById('better-codex-panel')?.dataset.surface})`);
  proof.compatibility_version = before.version;
  if (!before.open || before.surface !== "issues") await evaluate(`document.getElementById('better-codex-entry').click(); true`);
  proof.navigation = await evaluate(`['better-codex-entry','better-codex-agents-entry','better-codex-projects-entry','better-codex-more-entry'].map(id=>{const matches=document.querySelectorAll('#'+id);const node=matches[0];const r=node?.getBoundingClientRect();return {id,count:matches.length,width:r?.width,height:r?.height,visible:!!node&&getComputedStyle(node).display!=='none'}})`);
  assert.equal(proof.navigation[0].count, 1);
  for (const item of proof.navigation) assert.ok(item.count <= 1, "navigation entry must not duplicate");
  proof.previous_board_view = await evaluate(`document.querySelector('#better-codex-panel [data-view].is-active')?.getAttribute('data-view')`);
  await evaluate(`(()=>{document.querySelector('#better-codex-panel [data-view="all"]')?.click();const search=document.querySelector('#better-codex-panel .better-codex-search');if(search&&search.value){search.value='';search.dispatchEvent(new Event('input',{bubbles:true}));}return true})()`);
  const collection = await client.listExternalObservations();
  const existing = collection.observations.find(item => item.thread_id === values["task-id"] && item.account_id === "declared-install-verification");
  assert.ok(existing, "Actual host report must already exist");
  const selector = `[data-issue-id="${existing.id}"]`;
  const readCard = () => evaluate(`(()=>{const nodes=document.querySelectorAll('#better-codex-panel ${selector}');const card=nodes[0];return {count:nodes.length,status:card?.closest('[data-status]')?.getAttribute('data-status'),visible:!!card&&card.getBoundingClientRect().height>0}})()`);
  const waitCard = async (status: string) => { const deadline = Date.now() + 10_000; let card; while (Date.now() < deadline) { card = await readCard(); if (card.count === 1 && card.visible && card.status === status) return card; await new Promise(resolve => setTimeout(resolve, 100)); } throw new Error(`visible_report_timeout:${JSON.stringify(card)}`); };
  const report = { schema_version: 1, provider: "codex", account_id: "declared-install-verification", host_id: "local-codex-plugin", thread_id: values["task-id"], parent_thread_id: values["parent-thread-id"] || null, project_id: null, creator_name: "dot", title: "本次安装验证 · 主动上报", description: "当前委派任务验证已安装的本机插件；创建者仅为自报，不表示自动发现所有 dots 任务。" };
  const started = Date.now();
  const running = await client.reportExternalObservation({ ...report, sequence: existing.sequence + 1, item_id: `installed-native-ui-running-${existing.sequence + 1}`, reported_at: new Date().toISOString(), state: "running", message: "继续当前安装验收，正在验证真实桌面看板的状态刷新。" });
  assert.equal(running.status, "applied");
  await waitCard("in_progress"); proof.running_visible_ms = Date.now() - started;
  const finished = Date.now();
  const completed = await client.reportExternalObservation({ ...report, sequence: existing.sequence + 2, item_id: `installed-native-ui-complete-${existing.sequence + 2}`, reported_at: new Date().toISOString(), state: "completed", message: "当前安装验证的桌面刷新检查已完成；本卡仅为主动上报的完成声明，仍待人工验收。" });
  assert.equal(completed.observation.acceptance_state, "unknown");
  proof.card = await waitCard("in_review"); proof.completed_visible_ms = Date.now() - finished;
  proof.creator = { verification: completed.observation.creator.verification, avatar: completed.observation.creator.avatar };
  if (values["require-avatar-sha256"]) {
    const portrait = await evaluate(`(()=>{const card=document.querySelector('#better-codex-panel ${selector}');const creator=card?.querySelector('[data-card-creator]');const image=creator?.querySelector('img');return {key:creator?.dataset.cardCreator,name:creator?.querySelector('span:last-child')?.textContent,src:image?.src,width:image?.naturalWidth,height:image?.naturalHeight,source_chips:card?.querySelectorAll('[data-external-source]').length}})()`);
    assert.equal(portrait.key, "profile:dot-current"); assert.equal(portrait.name, "dot");
    assert.ok(portrait.src?.startsWith("data:image/png;base64,"));
    const sha256 = createHash("sha256").update(Buffer.from(portrait.src.slice("data:image/png;base64,".length), "base64")).digest("hex");
    assert.equal(sha256, values["require-avatar-sha256"]); assert.equal(portrait.width, 512); assert.equal(portrait.height, 512); assert.equal(portrait.source_chips, 0);
    proof.creator_display = { local_profile_key: portrait.key, name: portrait.name, png_sha256: sha256, width: portrait.width, height: portrait.height, source_chips: portrait.source_chips, display_source: completed.observation.creator.display_source, platform_verified: false };
  }
  const bounds = await evaluate(`(()=>{const r=document.getElementById('better-codex-panel').getBoundingClientRect();return {x:Math.max(0,r.x),y:Math.max(0,r.y),width:r.width,height:r.height,scale:1}})()`);
  const shot = await request("Page.captureScreenshot", { format: "png", clip: bounds, captureBeyondViewport: false });
  writeFileSync(join(dir, "installed-native-board.png"), Buffer.from(shot.data, "base64"));
  proof.ok = true;
  writeFileSync(join(dir, "installed-native-board-proof.json"), JSON.stringify(proof, null, 2) + "\n");
  console.log(JSON.stringify(proof, null, 2));
} finally { client.close(); close(); }
