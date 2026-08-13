export const controlProtocolVersion = "control/v1" as const;

export const controlCapabilities = ["heartbeat", "commands.available", "commands.claim", "commands.ack"] as const;
export type ControlCapability = typeof controlCapabilities[number];

export type ControlHello = {
  type: "hello";
  protocol_version: typeof controlProtocolVersion;
  device_id: string;
  device_name: string;
  sync_protocol_versions: string[];
  capabilities: ControlCapability[];
};

export type ControlHelloAck = {
  type: "hello_ack";
  protocol_version: typeof controlProtocolVersion;
  sync_protocol_version: string;
  capabilities: ControlCapability[];
  revision: number;
  lease_expires_at: string;
};

export type ControlHeartbeat = {
  type: "heartbeat";
  protocol_version: typeof controlProtocolVersion;
  device_id: string;
  queue_depth: number;
};

export type ControlHeartbeatAck = {
  type: "heartbeat_ack";
  protocol_version: typeof controlProtocolVersion;
  lease_expires_at: string;
  commands_available: number;
};

export type ControlCommandsAvailable = {
  type: "commands_available";
  protocol_version: typeof controlProtocolVersion;
  count: number;
};

export type ControlRpcRequest = {
  type: "rpc_request";
  protocol_version: typeof controlProtocolVersion;
  request_id: string;
  method: "commands.claim" | "commands.ack";
  params: Record<string, unknown>;
};

export type ControlRpcResponse = {
  type: "rpc_response";
  protocol_version: typeof controlProtocolVersion;
  request_id: string;
  ok: boolean;
  result?: Record<string, unknown>;
  error?: string;
};

export type ControlMessage = ControlHello | ControlHelloAck | ControlHeartbeat | ControlHeartbeatAck | ControlCommandsAvailable | ControlRpcRequest | ControlRpcResponse;
