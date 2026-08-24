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
  description: "Open the Better Codex task board.",
  inputSchema: { type: "object", properties: {}, additionalProperties: false },
  annotations: { title: "Better Codex", readOnlyHint: true, destructiveHint: false, openWorldHint: false },
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
:root{font-family:var(--bc-font-ui)}body{margin:0;min-height:100vh;display:grid;place-items:center;background:transparent;color:var(--bc-color-text)}.state{display:flex;align-items:center;gap:var(--bc-space-3);font-size:var(--bc-text-base);opacity:.68}.dot{width:var(--bc-space-2);height:var(--bc-space-2);border-radius:var(--bc-radius-pill);background:var(--bc-color-success);box-shadow:0 0 0 5px color-mix(in srgb,var(--bc-color-success) 16%,transparent)}
</style>
</head>
<body><div class="state"><span class="dot"></span><span>正在连接 Better Codex…</span></div></body>
</html>`;

function result(id: JsonRpcId, value: unknown) {
  process.stdout.write(`${JSON.stringify({ jsonrpc: "2.0", id, result: value })}\n`);
}

function error(id: JsonRpcId, code: number, message: string) {
  process.stdout.write(`${JSON.stringify({ jsonrpc: "2.0", id, error: { code, message } })}\n`);
}

function handle(request: JsonRpcRequest) {
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
    return result(id, {
      content: [{ type: "text", text: "Better Codex is ready." }],
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

export function startMcpAppServer() {
  const input = createInterface({ input: process.stdin, crlfDelay: Infinity });
  input.on("line", line => {
    if (!line.trim()) return;
    try {
      handle(JSON.parse(line) as JsonRpcRequest);
    } catch {
      error(null, -32700, "parse_error");
    }
  });
  return new Promise<void>(resolve => input.once("close", resolve));
}
