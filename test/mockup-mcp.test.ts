import assert from "node:assert/strict";
import test from "node:test";
import { mkdtempSync, readdirSync, readFileSync, existsSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { Script } from "node:vm";
import { createMockupMcpServer, mockupRequestPath, mockupResourceUri, startMockupTransport } from "../src/mockup-mcp.js";

const parse = (response: {status:number;body:string}) => { assert.ok(response.status < 400, response.body); return JSON.parse(response.body); };
test("mockup transport has a bounded whitelist including import/reset, excluding all production operations", () => {
  assert.equal(mockupRequestPath("/api/mockup/state?locale=en", "PUT"), "/api/mockup/state?locale=en");
  for (const path of ["/api/update/install", "/api/shutdown", "/api/sync/connect", "/api/issues/a/reply", "/api/system/directory", "/api/../shutdown", "/api/issues/%252f", "/api/issues?token=secret", "https://example.com"]) assert.throws(() => mockupRequestPath(path, "POST"));
});

test("isolated mockup supports bilingual CRUD, replay, import/export/reset and fences production APIs", { timeout: 35_000 }, async () => {
  const production = mkdtempSync(join(tmpdir(), "better-codex-production-sentinel-"));
  writeFileSync(join(production, "mockup.json"), "production-sentinel");
  const before = new Set(readdirSync(tmpdir()));
  const previous = process.env.BETTER_CODEX_HOME;
  process.env.BETTER_CODEX_HOME = production;
  const transport = await startMockupTransport();
  const owned = readdirSync(tmpdir()).find(name => name.startsWith("better-codex-mockup-mcp-") && !before.has(name));
  assert.ok(owned);
  const home = join(tmpdir(), owned);
  try {
    const bootstrap = parse(await transport.request({ path: "/api/bootstrap?locale=en" }));
    assert.equal(bootstrap.mockup, true); assert.equal(bootstrap.projects[0].name, "Better Codex Desktop");
    assert.equal(parse(await transport.request({ path: "/api/bootstrap?locale=zh-CN" })).projects[0].name, "better-codex");
    const state = parse(await transport.request({ path: "/api/mockup/state?locale=en" }));
    const creation = { path: "/api/issues?locale=en", method: "POST", commandId: "mockup-create-001", body: JSON.stringify({ project_id: state.project.id, title: "Isolated simulation", description: "Mockup", status: "backlog" }) };
    const created = parse(await transport.request(creation));
    assert.deepEqual(parse(await transport.request(creation)), created);
    assert.equal((await transport.request({ ...creation, body: JSON.stringify({ title: "Different" }) })).status, 409);
    assert.equal(parse(await transport.request({ path: "/api/issues?locale=en" })).filter((issue:any) => issue.title === "Isolated simulation").length, 1);
    const project = parse(await transport.request({path:"/api/projects?locale=en",method:"POST",commandId:"mockup-project-001",body:JSON.stringify({name:"Preview project"})}));
    assert.ok(parse(await transport.request({path:"/api/projects?locale=en"})).some((entry:any) => entry.id === project.id));
    parse(await transport.request({path:`/api/projects/${project.id}?locale=en`,method:"DELETE",commandId:"mockup-project-delete-001"}));
    const agent = parse(await transport.request({path:"/api/agents?locale=en",method:"POST",commandId:"mockup-agent-001",body:JSON.stringify({name:"Preview agent",instructions:"Temporary instructions",model:"gpt-5.6-sol"})}));
    const editedAgent = parse(await transport.request({path:`/api/agents/${agent.id}?locale=en`,method:"PATCH",commandId:"mockup-agent-edit-001",body:JSON.stringify({version:agent.version,name:"Updated preview agent"})}));
    assert.equal(parse(await transport.request({path:`/api/agents/${agent.id}?locale=en`})).name,"Updated preview agent");
    parse(await transport.request({path:`/api/agents/${agent.id}?locale=en`,method:"DELETE",commandId:"mockup-agent-delete-001",body:JSON.stringify({version:editedAgent.version})}));
    assert.equal(parse(await transport.request({path:"/api/issues?locale=en&search=Isolated"})).length,1);
    const imported = { ...state, issues: [{...state.issues[0], title: "Imported mockup"}] };
    parse(await transport.request({ path: "/api/mockup/state?locale=en", method: "PUT", commandId: "mockup-import-001", body: JSON.stringify(imported) }));
    assert.equal(parse(await transport.request({ path: "/api/mockup/state?locale=en" })).issues[0].title, "Imported mockup");
    assert.notEqual(parse(await transport.request({ path: "/api/mockup/state?locale=zh-CN" })).issues[0].title, "Imported mockup");
    parse(await transport.request({ path: "/api/mockup/reset?locale=en", method: "POST", commandId: "mockup-reset-001" }));
    assert.notEqual(parse(await transport.request({ path: "/api/mockup/state?locale=en" })).issues[0].title, "Imported mockup");
    const events = await transport.events({ timeoutMs: 100 });
    assert.ok(events.runtimeInstanceId); assert.ok(events.events.some(event => event.event === "ready"));
    const identity = JSON.parse(readFileSync(join(home, "run/runtime.json"), "utf8"));
    const token = readFileSync(join(home, "run/token"), "utf8").trim();
    assert.equal(existsSync(join(home, "run/session-host.pid")), false);
    for (const [method,path] of [["POST","/api/update/install"],["POST","/api/shutdown"],["GET","/api/mcp/board"],["POST","/api/external-observations/report"],["POST","/api/sync/connect"]]) {
      const response = await fetch(`http://127.0.0.1:${identity.port}${path}`, {method,headers:{authorization:`Bearer ${token}`,"content-type":"application/json"},...(method === "POST" ? {body:"{}"} : {})});
      assert.ok([400,403].includes(response.status), path); assert.ok(["mockup_action_not_supported", "external_reporting_not_enabled"].includes((await response.json()).error), path);
    }
    assert.equal(readFileSync(join(production, "mockup.json"), "utf8"), "production-sentinel");
  } finally { await transport.close(); assert.equal(existsSync(home), false); if (previous === undefined) delete process.env.BETTER_CODEX_HOME; else process.env.BETTER_CODEX_HOME = previous; rmSync(production,{recursive:true,force:true}); }
});

test("mockup MCP exposes only its development page and App transport", async () => {
  const server = createMockupMcpServer({ request: async () => ({ status: 200, statusText: "OK", body: "{}", headers: {} }), events: async () => ({ runtimeInstanceId: "mockup", cursor: null, events: [] }), close: async () => {} });
  const client = new Client({ name: "mockup-test", version: "1" });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair(); await server.connect(serverTransport); await client.connect(clientTransport);
  try {
    assert.equal(client.getServerVersion()?.name, "better-codex-mockup");
    assert.deepEqual((await client.listTools()).tools.map(tool => tool.name).sort(), ["board", "mockup_command", "mockup_events", "mockup_read"]);
    const html = (await client.readResource({ uri: mockupResourceUri })).contents[0].text as string;
    assert.match(html, /data-better-codex-mockup="true"/); assert.match(html, /Mockup/); assert.match(html, /mockup_command/);
    assert.doesNotMatch(html, /board_launch|BetterCodexInjected/);
    for (const script of html.matchAll(/<script>([\s\S]*?)<\/script>/g)) new Script(script[1]);
  } finally { await client.close(); await server.close(); }
});


test("source CLI Mockup never materializes production credentials or business storage", {timeout: 25_000}, async () => {
  const home = mkdtempSync(join(tmpdir(), "better-codex-mockup-parent-sentinel-"));
  const transport = new StdioClientTransport({command:process.execPath,args:["--import","tsx","src/cli.ts","mcp","--mockup"],cwd:process.cwd(),env:{...Object.fromEntries(Object.entries(process.env).filter((entry): entry is [string,string] => entry[1] !== undefined)),BETTER_CODEX_HOME:home,BETTER_CODEX_PEER_HOME:home,BETTER_CODEX_DB:join(home,"production.db"),BETTER_CODEX_TOKEN:"",CODEX_HOME:join(home,"codex")},stderr:"pipe"});
  const client = new Client({name:"mockup-stdio-test",version:"1"});
  try {
    await client.connect(transport);
    assert.equal(client.getServerVersion()?.name,"better-codex-mockup");
    assert.equal((await client.callTool({name:"board",arguments:{}})).isError,undefined);
    assert.ok((await client.listTools()).tools.every(tool => !tool.name.startsWith("tasks_") && !tool.name.startsWith("runtime_")));
    assert.equal(existsSync(join(home,"run/token")),false);
    assert.equal(existsSync(join(home,"production.db")),false);
    assert.equal(existsSync(join(home,"run/runtime.json")),false);
  } finally {await client.close();await transport.close();rmSync(home,{recursive:true,force:true});}
});
