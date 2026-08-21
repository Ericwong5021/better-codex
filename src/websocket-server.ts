import type { IncomingMessage } from "node:http";
import type { Duplex } from "node:stream";
import WebSocket, { WebSocketServer, type RawData } from "ws";

export type WebSocketConnectionHandlers = {
  message: (value: string) => void;
  close: (code: number, reason: string) => void;
  error?: (error: Error) => void;
};

const maxMessageBytes = 1_048_576;

function messageText(data: RawData) {
  if (Array.isArray(data)) return Buffer.concat(data).toString("utf8");
  if (data instanceof ArrayBuffer) return Buffer.from(data).toString("utf8");
  return Buffer.from(data).toString("utf8");
}

export class WebSocketConnection {
  private socket: WebSocket | null = null;
  private closed = false;

  constructor(
    private readonly request: IncomingMessage,
    private readonly rawSocket: Duplex,
    private readonly server: WebSocketServer,
    private readonly handlers: WebSocketConnectionHandlers,
  ) {}

  send(value: string) {
    if (this.closed) return;
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) throw new Error("websocket_not_open");
    if (Buffer.byteLength(value) > maxMessageBytes) throw new Error("websocket_message_too_large");
    this.socket.send(value);
  }

  close(code = 1000) {
    if (this.closed) return;
    this.closed = true;
    if (this.socket) this.socket.close(code);
    else this.rawSocket.end();
    this.handlers.close(code, "");
  }

  acceptHead(head: Buffer) {
    if (this.closed) return;
    this.server.handleUpgrade(this.request, this.rawSocket, head, socket => {
      if (this.closed) return socket.close(1001);
      this.socket = socket;
      socket.on("message", (data, isBinary) => {
        if (isBinary) return this.close(1003);
        this.handlers.message(messageText(data));
      });
      socket.once("close", (code, reason) => this.finish(code, reason));
      socket.once("error", error => this.handlers.error?.(error));
    });
  }

  private finish(code: number, reason: Buffer) {
    if (this.closed) return;
    this.closed = true;
    this.handlers.close(code, reason.toString("utf8"));
  }
}

export function upgradeWebSocket(request: IncomingMessage, socket: Duplex, protocols: string[], handlers: WebSocketConnectionHandlers) {
  const requested = String(request.headers["sec-websocket-protocol"] ?? "").split(",").map(value => value.trim()).filter(Boolean);
  const selected = protocols.find(protocol => requested.includes(protocol));
  if (!selected) {
    socket.end("HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n");
    return null;
  }
  const server = new WebSocketServer({
    noServer: true,
    clientTracking: false,
    maxPayload: maxMessageBytes,
    perMessageDeflate: false,
    handleProtocols: offered => offered.has(selected) ? selected : false,
  });
  return new WebSocketConnection(request, socket, server, handlers);
}
