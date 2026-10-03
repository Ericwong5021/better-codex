/** Diagnostics attach only to an already open Better Codex MCP App. */
import WebSocket from "ws";
import { cdpStatus } from "../src/cdp.js";
import { betterCodexProfile, cdpPort } from "../src/config.js";

export async function connectPluginUI() {
  const trusted = await cdpStatus(cdpPort);
  if (!trusted.available) throw new Error("trusted_desktop_unavailable");
  const targets = await fetch(`http://127.0.0.1:${cdpPort}/json/list`, { signal: AbortSignal.timeout(8000) }).then(response => response.json()) as any[];
  const allowed = new Set(trusted.targets.map(target => target.targetId));
  for (const target of targets.filter(target => allowed.has(target.id) && target.webSocketDebuggerUrl)) {
    const socket = new WebSocket(target.webSocketDebuggerUrl);
    const contexts: { id: number; sessionId?: string }[] = [];
    const pending = new Map<number, { resolve: (value: any) => void; reject: (error: Error) => void; timer: ReturnType<typeof setTimeout> }>();
    let sequence = 0;
    const request = (method: string, params: any = {}, sessionId?: string) => new Promise<any>((resolve, reject) => {
      const id = ++sequence;
      const timer = setTimeout(() => { pending.delete(id); reject(new Error(`plugin_ui_timeout:${method}`)); }, 8000);
      pending.set(id, { resolve, reject, timer });
      socket.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
    });
    socket.on("message", bytes => {
      const message = JSON.parse(bytes.toString());
      if (message.method === "Runtime.executionContextCreated" && message.params.context.auxData?.isDefault !== false) contexts.push({ id: message.params.context.id, sessionId: message.sessionId });
      if (message.method === "Target.attachedToTarget") void request("Runtime.enable", {}, message.params.sessionId).catch(() => {});
      const task = pending.get(message.id);
      if (!task) return;
      clearTimeout(task.timer); pending.delete(message.id);
      message.error ? task.reject(new Error("plugin_ui_protocol_error")) : task.resolve(message.result);
    });
    const close = () => { for (const task of pending.values()) { clearTimeout(task.timer); task.reject(new Error("plugin_ui_closed")); } pending.clear(); socket.terminate(); };
    try {
      await new Promise<void>((resolve, reject) => { const timer = setTimeout(() => { socket.terminate(); reject(new Error("plugin_ui_open_timeout")); }, 8000); socket.once("open", () => { clearTimeout(timer); resolve(); }); socket.once("error", error => { clearTimeout(timer); reject(error); }); });
      await request("Runtime.enable");
      await request("Target.setAutoAttach", { autoAttach: true, waitForDebuggerOnStart: false, flatten: true });
      await new Promise(resolve => setTimeout(resolve, 200));
      for (const context of contexts) {
        const result = await request("Runtime.evaluate", { contextId: context.id, expression: `Boolean(document.documentElement.dataset.betterCodexMcp && window.__betterCodexUI__?.profile === ${JSON.stringify(betterCodexProfile)})`, returnByValue: true }, context.sessionId).catch(() => null);
        if (result?.result?.value !== true) continue;
        const call = (method: string, params: any = {}) => request(method, params, context.sessionId);
        const evaluate = async (expression: string) => { const result = await call("Runtime.evaluate", { contextId: context.id, expression, returnByValue: true, awaitPromise: true }); if (result.exceptionDetails) throw new Error("plugin_ui_evaluation_failed"); return result.result.value; };
        return { call, evaluate, close };
      }
    } catch (error) { close(); throw error; }
    close();
  }
  throw new Error("open_better_codex_plugin_page_required");
}
