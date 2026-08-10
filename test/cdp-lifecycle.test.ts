import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { createServer } from "node:http";
import test from "node:test";

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
