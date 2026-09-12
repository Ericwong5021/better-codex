import { createInterface } from "node:readline";
import { coreVersion } from "./compatibility.js";
import { betterCodexDesignTokensCss } from "./design-system.js";

export const betterCodexMcpName = "better-codex";
export const betterCodexMcpTool = "board";
export const betterCodexMcpRoute = `/mcp-app/${betterCodexMcpName}/${betterCodexMcpTool}`;

const resourceUri = "ui://better-codex/board.html";
const mimeType = "text/html;profile=mcp-app";

type JsonRpcId = string | number | null;
type JsonRpcRequest = {
  jsonrpc?: string;
  id?: JsonRpcId;
  method?: string;
  params?: Record<string, unknown>;
};

const tool = {
  name: betterCodexMcpTool,
  title: "Better Codex",
  description: "Start Better Codex sidebar integration.",
  inputSchema: { type: "object", properties: {}, additionalProperties: false },
  annotations: { title: "Better Codex", readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  _meta: {
    ui: { resourceUri, visibility: ["app"] },
    "openai/ui": { entrypoints: [{ type: "global" }] },
    "openai/outputTemplate": resourceUri,
  },
};

const html = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Better Codex</title>
<style>
${betterCodexDesignTokensCss()}
:root{font-family:var(--bc-font-ui)}body{margin:0;min-height:100vh;display:grid;place-items:center;background:transparent;color:var(--bc-color-text)}.state{display:flex;flex-direction:column;align-items:center;gap:var(--bc-space-4);padding:var(--bc-space-6);font-size:var(--bc-text-base)}button{font:inherit;padding:var(--bc-space-3) var(--bc-space-5);border:0;border-radius:var(--bc-radius-sm);background:var(--bc-color-primary);color:var(--bc-color-on-primary);cursor:pointer}button:disabled{opacity:.5;cursor:wait}#status{white-space:pre-wrap;text-align:center}
</style>
</head>
<body><div class="state"><button id="launch" disabled>启动 Better Codex</button><span id="status">正在连接启动器…</span></div>
<script>
const button=document.getElementById("launch"),status=document.getElementById("status");
let launchId=null;
const send=value=>window.parent.postMessage({jsonrpc:"2.0",...value},"*");
const timeout=setTimeout(()=>{status.textContent="启动器连接超时，请重新打开此页面。"},15000);
window.addEventListener("message",event=>{
 if(event.source!==window.parent)return;
 const message=event.data;
 if(!message||message.jsonrpc!=="2.0")return;
 if(message.id===1){
  clearTimeout(timeout);
  if(message.error){status.textContent=message.error.message;return;}
  send({method:"ui/notifications/initialized",params:{}});
  button.disabled=false;status.textContent="点击启动，将恢复侧栏的任务看板、智能体和项目管理。";
 }
 if(message.id===launchId){
  button.disabled=false;
  const failure=message.error?.message||(message.result?.isError?message.result.content?.map(item=>item.text||"").join("; "):null);
  status.textContent=failure||"注入已完成。请从侧栏打开任务看板。";
 }
});
button.addEventListener("click",()=>{
 button.disabled=true;status.textContent="正在启动 Better Codex…";launchId=2;
 send({id:launchId,method:"tools/call",params:{name:"board",arguments:{}}});
});
send({id:1,method:"ui/initialize",params:{protocolVersion:"2026-01-26",appInfo:{name:"Better Codex Launcher",version:"1.0.0"},appCapabilities:{}}});
</script></body>
</html>`;

function result(id: JsonRpcId, value: unknown) {
  process.stdout.write(`${JSON.stringify({ jsonrpc: "2.0", id, result: value })}\n`);
}

function error(id: JsonRpcId, code: number, message: string) {
  process.stdout.write(`${JSON.stringify({ jsonrpc: "2.0", id, error: { code, message } })}\n`);
}

async function handle(request: JsonRpcRequest, launch: () => Promise<unknown>) {
  if (request.id === undefined) return;
  const id = request.id;
  if (request.method === "initialize") {
    const requestedVersion = typeof request.params?.protocolVersion === "string" ? request.params.protocolVersion : "2025-06-18";
    return result(id, {
      protocolVersion: requestedVersion,
      capabilities: { resources: {}, tools: {} },
      serverInfo: { name: "Better Codex", version: coreVersion },
    });
  }
  if (request.method === "ping") return result(id, {});
  if (request.method === "tools/list") return result(id, { tools: [tool] });
  if (request.method === "tools/call") {
    if (request.params?.name !== betterCodexMcpTool) return error(id, -32602, "tool_not_found");
    try {
      await launch();
    } catch (failure) {
      const message = failure instanceof Error ? failure.message : String(failure);
      process.stderr.write(`${JSON.stringify({ event: "mcp_launcher_failed", pid: process.pid, version: coreVersion, error: message })}\n`);
      return result(id, { isError: true, content: [{ type: "text", text: message }] });
    }
    process.stderr.write(`${JSON.stringify({ event: "mcp_launcher_completed", pid: process.pid, version: coreVersion })}\n`);
    return result(id, {
      content: [{ type: "text", text: "Better Codex sidebar injection completed." }],
      structuredContent: { ready: true },
      _meta: { ui: { resourceUri }, "openai/outputTemplate": resourceUri },
    });
  }
  if (request.method === "resources/list") {
    return result(id, { resources: [{ uri: resourceUri, name: "Better Codex", title: "Better Codex", mimeType }] });
  }
  if (request.method === "resources/templates/list") return result(id, { resourceTemplates: [] });
  if (request.method === "resources/read") {
    if (request.params?.uri !== resourceUri) return error(id, -32602, "resource_not_found");
    return result(id, { contents: [{ uri: resourceUri, name: "Better Codex", title: "Better Codex", mimeType, text: html }] });
  }
  return error(id, -32601, "method_not_found");
}

export function startMcpAppServer(launch: () => Promise<unknown>) {
  let pendingLaunch: Promise<unknown> | null = null;
  const start = () => {
    if (!pendingLaunch) {
      process.stderr.write(`${JSON.stringify({ event: "mcp_launcher_started", pid: process.pid, version: coreVersion })}\n`);
      pendingLaunch = Promise.resolve().then(launch).finally(() => { pendingLaunch = null; });
    }
    return pendingLaunch;
  };
  const input = createInterface({ input: process.stdin, crlfDelay: Infinity });
  input.on("line", line => {
    if (!line.trim()) return;
    try {
      void handle(JSON.parse(line) as JsonRpcRequest, start).catch(failure => {
        process.stderr.write(`${String(failure)}\n`);
        error(null, -32603, "mcp_request_failed");
      });
    } catch {
      error(null, -32700, "parse_error");
    }
  });
  return new Promise<void>(resolve => input.once("close", resolve));
}
