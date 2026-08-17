import { supportedSyncProtocolVersions, type RemoteCommandAck, type SyncPushRequest } from "./sync-contract.js";

export type HubDevice = {
  id: string;
  name: string;
  lease_expires_at: string | null;
};

export type HubRepository = {
  health(): Record<string, unknown>;
  deviceForToken(token: string): HubDevice | null;
  push(deviceId: string, request: SyncPushRequest): Record<string, unknown>;
  putConversation(deviceId: string, issueId: string, value: unknown): unknown;
  pendingCommands(deviceId: string, limit?: number): unknown[];
  claimCommands(deviceId: string, limit?: number): unknown[];
  ackRemoteCommand(deviceId: string, ack: RemoteCommandAck): unknown;
  heartbeat(deviceId: string): { lease_expires_at: string; commands_available: number };
  revision(): number;
  pendingCommandCount(deviceId: string): number;
};

export type HubControlSession = {
  device: HubDevice;
  send(value: unknown): void;
  close(code?: number): void;
};

export type HubRealtime = {
  notifyCommandsAvailable(deviceId: string, count: number): void;
};

export type HubClock = {
  now(): string;
};

export type HubRandom = {
  id(): string;
  token(bytes: number): string;
};

export type HubDependencies = {
  repository: HubRepository;
  realtime: HubRealtime;
  clock?: HubClock;
  random?: HubRandom;
};

export function bearerToken(request: Request) {
  const value = request.headers.get("authorization") || "";
  return value.startsWith("Bearer ") ? value.slice(7) : "";
}

export function jsonResponse(value: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "cache-control": "no-store", "content-type": "application/json; charset=utf-8", ...headers },
  });
}

export class HubApplication {
  constructor(private readonly dependencies: HubDependencies) {}

  async fetch(request: Request) {
    const url = new URL(request.url);
      if (url.pathname === "/healthz" && request.method === "GET") return jsonResponse(this.dependencies.repository.health());
      const device = this.dependencies.repository.deviceForToken(bearerToken(request));
      if (!device) return jsonResponse({ error: "unauthorized" }, 401);
      try {
      if (url.pathname === "/api/v1/capabilities" && request.method === "GET") return jsonResponse({ protocol_versions: [...supportedSyncProtocolVersions], control_protocol: "control/v1", transports: ["websocket", "http"], command_delivery: "lease" });
      if (url.pathname === "/api/v1/sync/push" && request.method === "POST") return jsonResponse(this.dependencies.repository.push(device.id, await request.json() as SyncPushRequest));
      if (url.pathname === "/api/v1/sync/commands" && request.method === "GET") return jsonResponse({ commands: this.dependencies.repository.pendingCommands(device.id, Number(url.searchParams.get("limit") || 100)) });
      if (url.pathname === "/api/v1/sync/commands/claim" && request.method === "POST") return jsonResponse({ commands: this.dependencies.repository.claimCommands(device.id, Number(url.searchParams.get("limit") || 100)) });
      const ack = url.pathname.match(/^\/api\/v1\/sync\/commands\/([^/]+)\/ack$/);
      if (ack && request.method === "POST") return jsonResponse(this.dependencies.repository.ackRemoteCommand(device.id, { ...(await request.json() as Record<string, unknown>), command_id: decodeURIComponent(ack[1]) } as RemoteCommandAck));
      const conversation = url.pathname.match(/^\/api\/v1\/sync\/issues\/([^/]+)\/conversation$/);
      if (conversation && request.method === "PUT") return jsonResponse(this.dependencies.repository.putConversation(device.id, decodeURIComponent(conversation[1]), await request.json()));
      if (url.pathname === "/api/v1/control" && request.method === "GET") return jsonResponse({ error: "websocket_required" }, 426, { upgrade: "websocket" });
      return jsonResponse({ error: "not_found" }, 404);
    } catch (error) {
      const code = error instanceof Error ? error.message : "hub_error";
      const status = code === "unauthorized" ? 401 : code === "not_found" ? 404 : code === "incompatible_protocol" ? 409 : 400;
      return jsonResponse({ error: code }, status);
    }
  }
}

export function createHubApplication(dependencies: HubDependencies) {
  return new HubApplication(dependencies);
}
