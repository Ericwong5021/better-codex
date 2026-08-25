export const sessionHostProtocolVersion = "session-host/v2" as const;

export type SessionHostThreadAction = "archive" | "unarchive" | "delete";

export type SessionHostPoll = {
  leader: boolean;
  acquired: boolean;
  expires_at: string;
  previous_relay_id: string | null;
  command: Record<string, unknown> | null;
  thread_ids: string[];
  active_turns: Array<{ thread_id: string; turn_id: string }>;
};

export type SessionHostHello = {
  type: "hello";
  protocol_version: typeof sessionHostProtocolVersion;
  token: string;
  runtime_instance_id: string;
};

export type SessionHostHelloAck = {
  type: "hello_ack";
  protocol_version: typeof sessionHostProtocolVersion;
  host_pid: number;
  host_instance_id?: string;
  connection_epoch?: number;
  runtime_instance_id?: string;
  started_at?: string;
  relay_id: string;
  capabilities?: {
    thread_actions?: boolean;
  };
};

export type SessionHostStatus = {
  protocol_version: typeof sessionHostProtocolVersion;
  profile: string;
  home: string;
  host_pid: number;
  host_instance_id: string;
  started_at: string;
  running: boolean;
  connection_epoch: number;
  runtime_instance_id: string | null;
  runtime_connected: boolean;
  runtime_connected_at: string | null;
  runtime_disconnected_at: string | null;
  app_server_pid: number | null;
  app_server_connected: boolean;
  command_in_flight: boolean;
  pending_requests: number;
  queued_deliveries: number;
  last_delivery_sequence: number;
  last_acked_sequence: number;
  updated_at: string;
};

export type SessionHostPollRequest = {
  type: "poll_request";
  request_id: string;
  relay_id: string;
  busy: boolean;
};

export type SessionHostPollResponse = {
  type: "poll_response";
  request_id: string;
  result: SessionHostPoll;
};

export type SessionHostDelivery = {
  type: "delivery";
  delivery_id: string;
  host_instance_id: string;
  sequence: number;
  payload_hash: string;
  kind: "release" | "checkpoint" | "complete" | "fail" | "event";
  payload: Record<string, unknown>;
};

export type SessionHostDeliveryAck = {
  type: "delivery_ack";
  delivery_id: string;
  host_instance_id: string;
  sequence: number;
  payload_hash: string;
};

export type SessionHostShutdown = {
  type: "shutdown";
  token: string;
};

export type SessionHostThreadActionRequest = {
  type: "thread_action_request";
  request_id: string;
  thread_ids: string[];
  action: SessionHostThreadAction;
};

export type SessionHostThreadActionResponse = {
  type: "thread_action_response";
  request_id: string;
  ok: boolean;
  error?: string;
};

export type SessionHostMessage = SessionHostHello | SessionHostPollResponse | SessionHostDeliveryAck | SessionHostShutdown | SessionHostThreadActionRequest;
export type SessionHostServerMessage = SessionHostHelloAck | SessionHostPollRequest | SessionHostDelivery | SessionHostThreadActionResponse;
