export const sessionHostProtocolVersion = "session-host/v1" as const;

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
  relay_id: string;
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
  kind: "release" | "checkpoint" | "complete" | "fail" | "event";
  payload: Record<string, unknown>;
};

export type SessionHostDeliveryAck = {
  type: "delivery_ack";
  delivery_id: string;
};

export type SessionHostShutdown = {
  type: "shutdown";
  token: string;
};

export type SessionHostMessage = SessionHostHello | SessionHostPollResponse | SessionHostDeliveryAck | SessionHostShutdown;
export type SessionHostServerMessage = SessionHostHelloAck | SessionHostPollRequest | SessionHostDelivery;
