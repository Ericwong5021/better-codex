import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createBetterCodexMcpServer } from "./mcp-protocol.js";
import { betterCodexMcpHostHtml } from "./mcp-host.js";
import type { pollMcpRuntimeEvents, requestMcpRuntime } from "./mcp-runtime.js";
export { betterCodexMcpName, betterCodexMcpTool, createBetterCodexMcpServer } from "./mcp-protocol.js";

export type McpAppServices = {
  reportingOnly?: boolean;
  ensureRuntime?: () => Promise<unknown>;
  requestRuntime?: typeof requestMcpRuntime;
  pollEvents?: typeof pollMcpRuntimeEvents;
};

export async function startMcpAppServer(services: McpAppServices = {}) {
  const server = createBetterCodexMcpServer({ reportingOnly: services.reportingOnly, ensureRuntime: services.ensureRuntime,
    requestRuntime: services.requestRuntime, pollEvents: services.pollEvents, boardHtml: betterCodexMcpHostHtml() });
  await connectMcpStdio(server);
}

export async function connectMcpStdio(server: ReturnType<typeof createBetterCodexMcpServer>) {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  await new Promise<void>(resolve => {
    const previousClose = server.server.onclose;
    const finish = () => {
      process.off("SIGTERM", shutdown); process.off("SIGINT", shutdown);
      process.stdin.off("end", shutdown); process.stdin.off("close", shutdown); resolve();
    };
    server.server.onclose = () => { previousClose?.(); finish(); };
    const shutdown = () => { void server.close().catch(() => {}).finally(finish); };
    process.once("SIGTERM", shutdown);
    process.once("SIGINT", shutdown);
    process.stdin.once("end", shutdown);
    process.stdin.once("close", shutdown);
    // Transport may have closed between connect and handler installation.
    if (process.stdin.readableEnded || process.stdin.destroyed) shutdown();
  });
}

export { startMockupMcpAppServer } from "./mockup-mcp.js";
