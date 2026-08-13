import { controlProtocolVersion, type ControlMessage } from "./control-protocol-types.js";

export { controlCapabilities, controlProtocolVersion } from "./control-protocol-types.js";
export type { ControlMessage, ControlCapability, ControlHello, ControlHelloAck, ControlHeartbeat, ControlHeartbeatAck, ControlCommandsAvailable, ControlRpcRequest, ControlRpcResponse } from "./control-protocol-types.js";

const maxControlFrameBytes = 1_048_576;

export function encodeControlMessage(message: ControlMessage) {
  const value = JSON.stringify(message);
  if (new TextEncoder().encode(value).byteLength > maxControlFrameBytes) throw new Error("control_frame_too_large");
  return value;
}

export function decodeControlMessage(value: string | Uint8Array) {
  const bytes = typeof value === "string" ? new TextEncoder().encode(value).byteLength : value.byteLength;
  if (bytes > maxControlFrameBytes) throw new Error("control_frame_too_large");
  const parsed = JSON.parse(typeof value === "string" ? value : new TextDecoder().decode(value)) as unknown;
  if (!parsed || typeof parsed !== "object" || typeof (parsed as { type?: unknown }).type !== "string") throw new Error("invalid_control_message");
  if ((parsed as { protocol_version?: unknown }).protocol_version !== controlProtocolVersion) throw new Error("incompatible_control_protocol");
  return parsed as ControlMessage;
}
