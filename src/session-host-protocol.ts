export const sessionHostProtocolVersion = "session-host/v2" as const;

export type SessionHostThreadAction = "archive" | "unarchive" | "delete";
export type SessionHostSemanticMethod = "skills/list" | "app/installed" | "app/list" | "plugin/installed" | "mcpServerStatus/list" | "fuzzyFileSearch";

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
  runtime_generation: number;
  runtime_version: string;
  profile: string;
  handoff_update_id: string | null;
  capabilities: {
    durable_deliveries: boolean;
    runtime_handoff: boolean;
    semantic_requests?: boolean;
    thread_worker_handoff?: boolean;
  };
};

export type SessionHostHelloAck = {
  type: "hello_ack";
  protocol_version: typeof sessionHostProtocolVersion;
  host_pid: number;
  host_instance_id?: string;
  connection_epoch?: number;
  runtime_instance_id?: string;
  runtime_generation?: number;
  started_at?: string;
  relay_id: string;
  capabilities?: {
    thread_actions?: boolean;
    durable_deliveries?: boolean;
    runtime_handoff?: boolean;
    semantic_requests?: boolean;
    thread_worker_handoff?: boolean;
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
  runtime_generation: number | null;
  runtime_version: string | null;
  runtime_connected: boolean;
  runtime_connected_at: string | null;
  runtime_disconnected_at: string | null;
  app_server_pid: number | null;
  app_server_started_at: string | null;
  app_server_connected: boolean;
  command_in_flight: boolean;
  pending_requests: number;
  active_turns: Array<{ thread_id: string; turn_id: string }>;
  queued_deliveries: number;
  last_delivery_sequence: number;
  last_acked_sequence: number;
  terminal_rejected_deliveries: number;
  retrying_deliveries: number;
  last_delivery_error: string | null;
  thread_workers: Array<{
    thread_id: string | null;
    app_server_pid: number | null;
    app_server_started_at: string | null;
    app_server_version: string;
    command_in_flight: boolean;
    pending_requests: number;
    active_turns: Array<{ thread_id: string; turn_id: string }>;
    busy: boolean;
  }>;
  handoff: {
    update_id: string;
    source_runtime_instance_id: string;
    source_runtime_generation: number;
    target_runtime_generation: number;
    target_version: string | null;
    started_at: string;
    deadline_at: string;
  } | null;
  updated_at: string;
};

export type SessionHostBeginHandoff = {
  type: "begin_handoff";
  request_id: string;
  update_id: string;
  target_runtime_generation: number;
  target_version: string | null;
  deadline_at: string;
};

export type SessionHostCompleteHandoff = {
  type: "complete_handoff";
  request_id: string;
  update_id: string;
};

export type SessionHostCancelHandoff = {
  type: "cancel_handoff";
  request_id: string;
  update_id: string;
};

export type SessionHostHandoffStatusRequest = {
  type: "handoff_status_request";
  request_id: string;
};

export type SessionHostHandoffSnapshot = {
  host_instance_id: string;
  app_server_pid: number | null;
  app_server_started_at: string | null;
  command_in_flight: boolean;
  active_turns: Array<{ thread_id: string; turn_id: string }>;
  thread_workers: SessionHostStatus["thread_workers"];
  queued_deliveries: number;
  last_delivery_sequence: number;
  last_acked_sequence: number;
  terminal_rejected_deliveries: number;
  retrying_deliveries: number;
  last_delivery_error: string | null;
};

export type SessionHostHandoffResponse = {
  type: "handoff_response";
  request_id: string;
  ok: boolean;
  error?: string;
  handoff: SessionHostStatus["handoff"];
  snapshot: SessionHostHandoffSnapshot;
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

export type SessionHostDeliveryOutcome = "applied" | "rejected_terminal" | "retryable_error";

export type SessionHostDeliveryApplication = {
  outcome: Exclude<SessionHostDeliveryOutcome, "retryable_error">;
  error_code?: string;
};

export type SessionHostDeliveryAck = {
  type: "delivery_ack";
  delivery_id: string;
  host_instance_id: string;
  sequence: number;
  payload_hash: string;
  outcome?: SessionHostDeliveryOutcome;
  error_code?: string;
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

export type SessionHostThreadHandoffRequest = {
  type: "thread_handoff_request";
  request_id: string;
  thread_id: string;
};

export type SessionHostThreadHandoffResponse = {
  type: "thread_handoff_response";
  request_id: string;
  ok: boolean;
  error?: string;
  released?: boolean;
  thread_id: string;
  worker?: { app_server_pid: number | null; app_server_started_at: string | null } | null;
};

export type SessionHostSemanticRequest = {
  type: "semantic_request";
  request_id: string;
  method: SessionHostSemanticMethod;
  params: Record<string, unknown>;
  deadline_at: string;
};

export type SessionHostSemanticResponse = {
  type: "semantic_response";
  request_id: string;
  ok: boolean;
  error?: string;
  result?: unknown;
  identity: {
    host_instance_id: string;
    app_server_pid: number | null;
    app_server_started_at: string | null;
    app_server_version: string;
    catalog_generation: string;
  };
};

export type SessionHostMessage = SessionHostHello | SessionHostPollResponse | SessionHostDeliveryAck | SessionHostShutdown | SessionHostThreadActionRequest | SessionHostThreadHandoffRequest | SessionHostSemanticRequest | SessionHostBeginHandoff | SessionHostCompleteHandoff | SessionHostCancelHandoff | SessionHostHandoffStatusRequest;
export type SessionHostServerMessage = SessionHostHelloAck | SessionHostPollRequest | SessionHostDelivery | SessionHostThreadActionResponse | SessionHostThreadHandoffResponse | SessionHostSemanticResponse | SessionHostHandoffResponse;
