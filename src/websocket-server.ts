import { createHash } from "node:crypto";
import type { IncomingMessage } from "node:http";
import type { Duplex } from "node:stream";

export type WebSocketConnectionHandlers = {
  message: (value: string) => void;
  close: () => void;
  error?: (error: Error) => void;
};

const maxMessageBytes = 1_048_576;

function frame(opcode: number, payload: Buffer) {
  const length = payload.byteLength;
  const header = length < 126
    ? Buffer.from([0x80 | opcode, length])
    : length < 65_536
      ? Buffer.from([0x80 | opcode, 126, (length >> 8) & 0xff, length & 0xff])
      : Buffer.from([0x80 | opcode, 127, 0, 0, 0, 0, (length / 2 ** 32) >>> 0, length >>> 0]);
  return Buffer.concat([header, payload]);
}

export class WebSocketConnection {
  private buffer = Buffer.alloc(0);
  private closed = false;

  constructor(private readonly socket: Duplex, private readonly handlers: WebSocketConnectionHandlers) {
    socket.on("data", chunk => this.read(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
    socket.on("close", () => this.finish());
    socket.on("error", error => this.handlers.error?.(error instanceof Error ? error : new Error(String(error))));
  }

  send(value: string) {
    if (this.closed) return;
    const payload = Buffer.from(value, "utf8");
    if (payload.byteLength > maxMessageBytes) throw new Error("websocket_message_too_large");
    this.socket.write(frame(0x1, payload));
  }

  close(code = 1000) {
    if (this.closed) return;
    this.closed = true;
    this.socket.write(frame(0x8, Buffer.from([(code >> 8) & 0xff, code & 0xff])));
    this.socket.end();
    this.handlers.close();
  }

  acceptHead(head: Buffer) {
    if (head.byteLength) this.read(head);
  }

  private read(chunk: Buffer) {
    if (this.closed) return;
    this.buffer = Buffer.concat([this.buffer, chunk]);
    if (this.buffer.byteLength > maxMessageBytes * 2) return this.close(1009);
    while (this.buffer.byteLength >= 2) {
      const first = this.buffer[0];
      const second = this.buffer[1];
      const fin = Boolean(first & 0x80);
      const opcode = first & 0x0f;
      const masked = Boolean(second & 0x80);
      let length = second & 0x7f;
      let offset = 2;
      if (!fin || opcode === 0x0 || !masked) return this.close(1002);
      if (length === 126) {
        if (this.buffer.byteLength < 4) return;
        length = this.buffer.readUInt16BE(2);
        offset = 4;
      } else if (length === 127) {
        if (this.buffer.byteLength < 10) return;
        const high = this.buffer.readUInt32BE(2);
        const low = this.buffer.readUInt32BE(6);
        if (high > 0 || low > maxMessageBytes) return this.close(1009);
        length = low;
        offset = 10;
      }
      if (length > maxMessageBytes) return this.close(1009);
      if (this.buffer.byteLength < offset + 4 + length) return;
      const mask = this.buffer.subarray(offset, offset + 4);
      const payload = this.buffer.subarray(offset + 4, offset + 4 + length);
      const decoded = Buffer.alloc(length);
      for (let index = 0; index < length; index += 1) decoded[index] = payload[index] ^ mask[index % 4];
      this.buffer = this.buffer.subarray(offset + 4 + length);
      if (opcode === 0x1) this.handlers.message(decoded.toString("utf8"));
      else if (opcode === 0x8) {
        if (!this.closed) this.socket.write(frame(0x8, decoded.subarray(0, 125)));
        this.closed = true;
        this.socket.end();
        this.handlers.close();
        return;
      } else if (opcode === 0x9) this.socket.write(frame(0xa, decoded));
      else if (opcode !== 0xa) return this.close(1002);
    }
  }

  private finish() {
    if (this.closed) return;
    this.closed = true;
    this.handlers.close();
  }
}

export function upgradeWebSocket(request: IncomingMessage, socket: Duplex, protocols: string[], handlers: WebSocketConnectionHandlers) {
  const key = request.headers["sec-websocket-key"];
  const version = request.headers["sec-websocket-version"];
  const upgrade = request.headers.upgrade;
  if (typeof key !== "string" || version !== "13" || upgrade?.toLowerCase() !== "websocket") {
    socket.end("HTTP/1.1 400 Bad Request\r\nConnection: close\r\n\r\n");
    return null;
  }
  const requested = String(request.headers["sec-websocket-protocol"] ?? "").split(",").map(value => value.trim()).filter(Boolean);
  const selected = protocols.find(protocol => requested.includes(protocol));
  if (!selected) {
    socket.end("HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n");
    return null;
  }
  const accept = createHash("sha1").update(`${key}258EAFA5-E914-47DA-95CA-C5AB0DC85B11`).digest("base64");
  socket.write([
    "HTTP/1.1 101 Switching Protocols",
    "Upgrade: websocket",
    "Connection: Upgrade",
    `Sec-WebSocket-Accept: ${accept}`,
    `Sec-WebSocket-Protocol: ${selected}`,
    "\r\n",
  ].join("\r\n"));
  (socket as Duplex & { setNoDelay?: (noDelay?: boolean) => void }).setNoDelay?.(true);
  const connection = new WebSocketConnection(socket, handlers);
  return connection;
}
