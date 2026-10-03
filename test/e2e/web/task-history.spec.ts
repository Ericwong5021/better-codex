import {expect,test} from "@playwright/test";
import {startRuntimeFixture,type RuntimeFixture} from "../fixtures/runtime.js";
let runtime:RuntimeFixture;
test.beforeAll(async()=>{runtime=await startRuntimeFixture({mcpAllowReports:true});});
test.afterAll(async()=>{await runtime?.stop();});
const request=async(path:string,method="GET",body?:unknown)=>{
  const response=await fetch(runtime.baseUrl+path,{method,headers:{authorization:`Bearer ${runtime.token}`,"content-type":"application/json"},...(body?{body:JSON.stringify(body)}:{})});
  expect(response.ok).toBe(true);return response.json() as Promise<any>;
};

test("v2 shows attempts, typed anomaly, structured summary and ignored old runs; restart replays persisted cursor",async({page},info)=>{
  test.setTimeout(90_000);
  const input={schema_version:2,provider:"codex",account_id:"synthetic",host_id:"isolated-browser",source_task_id:"synthetic-source-task",source_run_id:"synthetic-run-1",run_number:1,
    sequence:1,event_id:"started",version:1,reported_at:new Date().toISOString(),state:"running",title:"合成测试 · 执行轮次与重放",description:"隔离 Runtime 的 v2 功能验证",project_id:null,thread_id:null};
  const report=(patch:Record<string,unknown>)=>request("/api/external-observations/report","POST",{...input,...patch,reported_at:new Date().toISOString()});
  const start=await report({});
  await report({sequence:2,event_id:"completed",version:2,state:"completed",summary:{text:"## 第一次结果\n\n需要人工验收。",evidence:["合成测试日志"]}});
  await report({source_run_id:"synthetic-run-2",run_number:2,sequence:3,event_id:"retry",version:3});
  const cursor=(await request("/api/external-observations/events?after=0&limit=100")).next_cursor;
  await report({source_run_id:"synthetic-run-2",run_number:2,sequence:4,event_id:"exit",version:4,event_kind:"worker_exit",state:"completed"});
  expect((await report({sequence:99,event_id:"late-run-1",version:99,state:"failed"})).status).toBe("stale_run");
  await page.goto(`${runtime.baseUrl}/web#token=${encodeURIComponent(runtime.token)}`);
  const card=page.locator(`[data-issue-id="${start.id}"]`);await expect(card).toHaveCount(1);
  await expect(page.locator('[data-status="blocked"]',{has:card})).toBeVisible();
  await card.click();const detail=page.locator("#better-codex-dialog.is-external-observation");
  await detail.locator("[data-external-task-history] > button").click();
  await expect(detail.locator("[data-task-run]")).toHaveCount(2);
  await expect(detail.locator('[data-task-run="synthetic-run-2"]')).toContainText("执行进程退出");
  await detail.locator('[data-task-run="synthetic-run-1"] button').click();
  await expect(detail.locator('[data-task-run="synthetic-run-1"] h2')).toContainText("第一次结果");
  await expect(detail).toContainText("此事件未更新当前状态");
  await expect(detail.locator('input,textarea,[type="submit"],[data-dialog-start-now]')).toHaveCount(0);
  await detail.locator('[data-task-run="synthetic-run-2"]').scrollIntoViewIfNeeded();
  await page.screenshot({path:info.outputPath("synthetic-v2-task-history.png")});
  await page.context().setOffline(true);
  await expect(card.locator("[data-external-freshness]")).toBeVisible({timeout:45_000});
  await report({source_run_id:"synthetic-run-3",run_number:3,sequence:5,event_id:"retry-after-restart",version:5,state:"waiting_user",blocker:{kind:"input",message:"来源任务需要补充输入"}});
  await page.context().setOffline(false);
  await expect(detail.locator("[data-task-run]")).toHaveCount(3);
  await expect(detail.locator('[data-task-run="synthetic-run-3"]')).toContainText("等待用户");
  await page.keyboard.press("Escape");await expect(detail).toHaveCount(0);
  await expect(page.locator(".better-codex-toolbar")).toBeVisible();await expect(page.locator('#better-codex-board [data-add-status]')).toHaveCount(6);
  await expect(page.locator('#better-codex-board [data-archive-open]')).toHaveCount(1);
  await runtime.restart();
  const replay=await request(`/api/external-observations/events?after=${cursor}&limit=100`);
  expect(replay.events.map((event:any)=>event.event_id)).toEqual(["exit","late-run-1","retry-after-restart"]);
  expect(replay.events[0].applied_state).toBe("blocked");expect(replay.events[0].detail.blocker.kind).toBe("protocol");
  // Standalone Web sessions are generation-scoped; use the supported login after restart.
  // A fragment-only navigation does not run the host bootstrap again.
  await page.goto("about:blank");
  await page.goto(`${runtime.baseUrl}/web#token=${encodeURIComponent(runtime.token)}`);
  await card.click();await detail.locator("[data-external-task-history] > button").click();
  await expect(detail.locator("[data-task-run]")).toHaveCount(3);
  await detail.locator('[data-task-run="synthetic-run-3"]').scrollIntoViewIfNeeded();
  await page.screenshot({path:info.outputPath("synthetic-v2-task-history-after-restart.png")});
  await page.keyboard.press("Escape");
});

test("owned history reads dependency acceptance without resetting an unsaved description",async({page},info)=>{
  const projects=await request("/api/projects");
  const parent=await request("/api/issues","POST",{project_id:projects[0].id,title:"合成测试 · 先验收",agent_enabled:false});
  const child=await request("/api/issues","POST",{project_id:projects[0].id,title:"合成测试 · 等待依赖",description:"保持草稿",agent_enabled:false,parent_issue_id:parent.id,depends_on_issue_ids:[parent.id]});
  await page.goto(`${runtime.baseUrl}/web#token=${encodeURIComponent(runtime.token)}`);
  await page.locator(`[data-issue-id="${child.id}"]`).click();const dialog=page.locator("#better-codex-dialog");
  await dialog.locator('[name="description"]').fill("未保存的草稿");
  const historyTrigger = dialog.locator("[data-task-history] > button");
  await expect(historyTrigger).toHaveAttribute("aria-expanded", "false");
  await historyTrigger.focus(); await page.keyboard.press("Enter");
  await expect(historyTrigger).toHaveAttribute("aria-expanded", "true");
  await expect(dialog.locator("[data-history-blocker]")).toContainText("等待依赖任务人工验收");
  await expect(dialog.locator('[name="description"]')).toHaveValue("未保存的草稿");
  await request(`/api/issues/${parent.id}`,"PATCH",{version:parent.version,status:"done"});
  await expect(dialog.locator('[data-dependency-id]')).toContainText("已人工验收");
  await expect(dialog.locator("[data-history-blocker]")).toHaveCount(0);
  await expect(dialog.locator('[name="description"]')).toHaveValue("未保存的草稿");
  await page.screenshot({path:info.outputPath("synthetic-owned-dependencies.png")});
  await page.keyboard.press("Escape");await expect(dialog).toHaveCount(0);
});

test("owned results stay compact and preserve disclosure, focus and scroll across refresh in both themes", async ({page}, info) => {
  const projects = await request("/api/projects");
  const issue = await request("/api/issues", "POST", { project_id: projects[0].id, title: "检查当前版本", description: "检查 Better Codex 当前版本", status: "in_review", agent_enabled: false });
  const { DatabaseSync } = await import("node:sqlite");
  const db = new DatabaseSync(runtime.databasePath);
  // The Runtime remains active while this fixture seeds synthetic completed runs.
  // Match Store's bounded SQLite lock wait instead of failing on a transient writer.
  db.exec("PRAGMA busy_timeout = 5000");
  const summary = "当前运行的是 **0.4.19-local.mcp.9** 本地构建版。\n\n| 项目 | 版本 |\n| --- | --- |\n| CLI / Runtime | 0.4.19-local.mcp.9 |\n| 启动器 | 0.4.18 |\n\n" + Array.from({length: 12}, (_,i) => `验证记录 ${i+1}：保留完整结果，按需展开。`).join("\n\n");
  try {
    for (let i = 1; i <= 3; i++) db.prepare("INSERT INTO issue_runs(id,issue_id,status,started_at,finished_at,execution_result) VALUES (?,?, 'completed',?,?,?)").run(`ui-history-run-${i}`, issue.id, "2026-10-01T17:32:42.225Z", "2026-10-01T17:33:58.106Z", summary);
  } finally { db.close(); }
  await page.goto(`${runtime.baseUrl}/web#token=${encodeURIComponent(runtime.token)}`);
  await page.locator(`[data-issue-id="${issue.id}"]`).click();
  const dialog = page.locator("#better-codex-dialog");
  const trigger = dialog.locator("[data-task-history] > button");
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  await expect(dialog.locator("[data-owned-task-history-content]")).toBeHidden();
  await page.screenshot({path: info.outputPath("owned-history-collapsed.png")});
  await trigger.click();
  await expect(dialog.locator("[data-task-run]")).toHaveCount(3);
  const run = dialog.locator('[data-task-run="ui-history-run-3"]');
  const result = run.getByRole("button", {name: "查看结果"});
  await expect(result).toHaveAttribute("aria-expanded", "false");
  await result.focus(); await page.keyboard.press("Space");
  await expect(result).toHaveAttribute("aria-expanded", "true");
  await expect(run.locator("table")).toBeVisible();
  await expect(run.locator(".better-codex-history-time")).not.toContainText("T17:");
  const pane = dialog.locator("[data-owned-task-history-content]");
  await pane.evaluate(node => { node.scrollTop = 80; });
  const scroll = await pane.evaluate(node => node.scrollTop);
  expect(scroll).toBeGreaterThan(0);
  await request(`/api/issues/${issue.id}`, "PATCH", {version: issue.version, priority:"high"});
  await expect(dialog.locator('[data-dialog-select="priority"]')).toContainText("高优先级");
  await expect(result).toHaveAttribute("aria-expanded", "true");
  await expect(result).toBeFocused();
  expect(await pane.evaluate(node => node.scrollTop)).toBe(scroll);
  await pane.evaluate(node => { node.scrollTop = 0; });
  for (const theme of ["light", "dark"]) {
    await page.evaluate(theme => { document.documentElement.dataset.theme = theme; }, theme);
    for (const width of [1440, 500]) {
      await page.setViewportSize({width,height:900});
      const bounds = await dialog.evaluate(node => ({left:node.getBoundingClientRect().left,right:node.getBoundingClientRect().right,width:innerWidth}));
      expect(bounds.left).toBeGreaterThanOrEqual(0); expect(bounds.right).toBeLessThanOrEqual(bounds.width);
      expect(await pane.evaluate(node => node.scrollWidth > node.clientWidth)).toBe(false);
      await page.mouse.move(0,0); await result.blur();
      await page.waitForTimeout(200);
      await page.screenshot({path:info.outputPath(`owned-history-${theme}-${width}.png`)});
    }
  }
  await page.keyboard.press("Escape"); await expect(dialog).toHaveCount(0);
});
