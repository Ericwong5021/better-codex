import { createHash } from "node:crypto";
import { webCommandTarget, type WebCommandKind } from "./web-command-policy.js";
export { webCommandTarget, webCommandAcknowledgesQueue } from "./web-command-policy.js";
export type { WebCommandKind } from "./web-command-policy.js";

export type WebCommandEnvelope = {
  command_id: string;
  kind: WebCommandKind;
  entity_id: string | null;
  method: string;
  path: string;
  body: Buffer;
  fingerprint: string;
};

export function createWebCommand(commandId: string, methodValue: string, path: string, body: Buffer): WebCommandEnvelope | null {
  if (!/^[A-Za-z0-9_-]{8,200}$/.test(commandId)) return null;
  const method = methodValue.toUpperCase();
  const target = webCommandTarget(method, path);
  if (!target) return null;
  return {
    command_id: commandId,
    ...target,
    method,
    path,
    body,
    fingerprint: createHash("sha256").update(method).update("\0").update(path).update("\0").update(body).digest("hex"),
  };
}
