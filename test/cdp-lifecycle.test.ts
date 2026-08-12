import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { createServer } from "node:http";
import { createServer as createTcpServer } from "node:net";
import test from "node:test";

function schedulingAdjustedDeadline(timeoutMs: number) {
  let observedAt = 0;
  const observed = new Promise<void>(resolve => {
    setTimeout(() => {
      observedAt = Date.now();
      resolve();
    }, timeoutMs);
  });
  return async () => {
    await observed;
    return Date.now() - observedAt;
  };
}

test("a CDP WebSocket child process closes cleanly on supported Node versions", async () => {
  const server = createServer();
  server.on("upgrade", (request, socket) => {
    const key = String(request.headers["sec-websocket-key"] ?? "");
    const accept = createHash("sha1").update(`${key}258EAFA5-E914-47DA-95CA-C5AB0DC85B11`).digest("base64");
    socket.write([
      "HTTP/1.1 101 Switching Protocols",
      "Upgrade: websocket",
      "Connection: Upgrade",
      `Sec-WebSocket-Accept: ${accept}`,
      "",
      "",
    ].join("\r\n"));
    socket.once("data", () => {
      socket.write(Buffer.from([0x88, 0x00]));
      socket.end();
    });
  });
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve());
  });
  try {
    const address = server.address();
    assert.ok(address && typeof address === "object");
    const script = "const { closeCdpConnectionForTest } = await import('./src/cdp.ts'); await closeCdpConnectionForTest(process.argv[1]); console.log('closed');";
    const child = spawn(process.execPath, ["--import", "tsx", "--input-type=module", "-e", script, `ws://127.0.0.1:${address.port}`], {
      cwd: new URL("..", import.meta.url),
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", chunk => { stdout += chunk; });
    child.stderr.on("data", chunk => { stderr += chunk; });
    const code = await new Promise<number | null>((resolve, reject) => {
      child.once("error", reject);
      child.once("close", resolve);
    });
    assert.equal(code, 0, stderr);
    assert.match(stdout, /closed/);
    assert.doesNotMatch(stderr, /Assertion failed|UV_HANDLE_CLOSING/);
  } finally {
    await new Promise<void>(resolve => server.close(() => resolve()));
  }
});

test("a half-open CDP HTTP endpoint is bounded", { skip: process.platform === "linux" ? "Codex Desktop target discovery is unavailable on Linux" : false }, async () => {
  const sockets = new Set<import("node:net").Socket>();
  const server = createTcpServer(socket => {
    sockets.add(socket);
    socket.on("close", () => sockets.delete(socket));
    setTimeout(() => socket.destroy(), 500).unref();
  });
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve());
  });
  try {
    const address = server.address();
    assert.ok(address && typeof address === "object");
    const { probeCdpTargetsForTest, waitForCdpTargetsForTest } = await import("../src/cdp.js");
    const probeOverrun = schedulingAdjustedDeadline(100);
    await assert.rejects(() => probeCdpTargetsForTest(address.port, 100), /cdp_unavailable_.*_timeout/);
    assert.ok(await probeOverrun() < 2_000, "stalled CDP probe exceeded its timeout budget after the event loop observed the deadline");
    const waitOverrun = schedulingAdjustedDeadline(250);
    await assert.rejects(() => waitForCdpTargetsForTest(address.port, 250), /cdp_unavailable_/);
    assert.ok(await waitOverrun() < 2_000, "target wait exceeded its overall deadline after the event loop observed it");
  } finally {
    for (const socket of sockets) socket.destroy();
    await new Promise<void>(resolve => server.close(() => resolve()));
  }
});

test("the overall target deadline includes a CDP command that never replies", { skip: process.platform === "linux" ? "Codex Desktop target discovery is unavailable on Linux" : false }, async () => {
  const sockets = new Set<import("node:net").Socket>();
  const server = createServer((_request, response) => {
    const address = server.address();
    assert.ok(address && typeof address === "object");
    response.setHeader("content-type", "application/json");
    response.end(JSON.stringify([{
      id: "stalled-renderer",
      type: "page",
      title: "Codex",
      url: "app://codex/",
      webSocketDebuggerUrl: `ws://127.0.0.1:${address.port}`,
    }]));
  });
  server.on("upgrade", (request, socket) => {
    sockets.add(socket);
    socket.on("close", () => sockets.delete(socket));
    const key = String(request.headers["sec-websocket-key"] ?? "");
    const accept = createHash("sha1").update(`${key}258EAFA5-E914-47DA-95CA-C5AB0DC85B11`).digest("base64");
    socket.write([
      "HTTP/1.1 101 Switching Protocols",
      "Upgrade: websocket",
      "Connection: Upgrade",
      `Sec-WebSocket-Accept: ${accept}`,
      "",
      "",
    ].join("\r\n"));
  });
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve());
  });
  try {
    const address = server.address();
    assert.ok(address && typeof address === "object");
    const { waitForCdpTargetsForTest } = await import("../src/cdp.js");
    const commandOverrun = schedulingAdjustedDeadline(250);
    await assert.rejects(() => waitForCdpTargetsForTest(address.port, 250), /cdp_unavailable_/);
    assert.ok(await commandOverrun() < 2_000, "CDP command exceeded the overall target deadline after the event loop observed it");
  } finally {
    for (const socket of sockets) socket.destroy();
    await new Promise<void>(resolve => server.close(() => resolve()));
  }
});

test("a half-open CDP WebSocket handshake is bounded and closed", async () => {
  const sockets = new Set<import("node:net").Socket>();
  const server = createTcpServer(socket => {
    sockets.add(socket);
    socket.on("close", () => sockets.delete(socket));
    setTimeout(() => socket.destroy(), 500).unref();
  });
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve());
  });
  try {
    const address = server.address();
    assert.ok(address && typeof address === "object");
    const { closeCdpConnectionForTest } = await import("../src/cdp.js");
    const started = Date.now();
    await assert.rejects(() => closeCdpConnectionForTest(`ws://127.0.0.1:${address.port}`, 100), /cdp_websocket_timeout/);
    assert.ok(Date.now() - started < 2_000, "stalled WebSocket handshake exceeded its timeout budget");
  } finally {
    for (const socket of sockets) socket.destroy();
    await new Promise<void>(resolve => server.close(() => resolve()));
  }
});
