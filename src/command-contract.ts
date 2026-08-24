import { createHash } from "node:crypto";

export type WebCommandKind = "issue" | "project" | "agent" | "setting" | "scheduled";

export type WebCommandEnvelope = {
  command_id: string;
  kind: WebCommandKind;
  entity_id: string | null;
  method: string;
  path: string;
  body: Buffer;
  fingerprint: string;
};

const issueCollection = /^\/api\/issues$/;
const issueFromThread = /^\/api\/issues\/from-thread$/;
const issueItem = /^\/api\/issues\/([^/]+)$/;
const issueAction = /^\/api\/issues\/([^/]+)\/(start|stop|move|archive|unarchive|reply|session-handoff)$/;
const projectCollection = /^\/api\/projects$/;
const projectEnsure = /^\/api\/projects\/ensure$/;
const projectOverview = /^\/api\/projects\/([^/]+)\/overview$/;
const projectPlanning = /^\/api\/projects\/([^/]+)\/planning\/(messages|reset)$/;
const agentCollection = /^\/api\/agents$/;
const agentItem = /^\/api\/agents\/([^/]+)$/;
const settingItem = /^\/api\/settings\/(auto-dispatch|scheduler-model|scheduler-reasoning-effort)$/;
const scheduledCollection = /^\/api\/scheduled-tasks$/;
const scheduledAgentCreate = /^\/api\/scheduled-tasks\/agent-create$/;
const scheduledItem = /^\/api\/scheduled-tasks\/([^/]+)$/;
const scheduledAction = /^\/api\/scheduled-tasks\/([^/]+)\/run$/;

function decoded(value: string) {
  try { return decodeURIComponent(value); } catch { return value; }
}

export function webCommandTarget(methodValue: string, pathValue: string) {
  const method = methodValue.toUpperCase();
  const pathname = new URL(pathValue, "http://runtime.local").pathname;
  let match = pathname.match(issueItem);
  if (match && ["PATCH", "DELETE"].includes(method)) return { kind: "issue" as const, entity_id: decoded(match[1]) };
  match = pathname.match(issueAction);
  if (match && method === "POST") return { kind: "issue" as const, entity_id: decoded(match[1]) };
  if (issueCollection.test(pathname) && method === "POST") return { kind: "issue" as const, entity_id: null };
  if (issueFromThread.test(pathname) && method === "POST") return { kind: "issue" as const, entity_id: null };
  match = pathname.match(projectOverview);
  if (match && method === "POST") return { kind: "project" as const, entity_id: decoded(match[1]) };
  match = pathname.match(projectPlanning);
  if (match && method === "POST") return { kind: "project" as const, entity_id: decoded(match[1]) };
  if (projectCollection.test(pathname) && method === "POST") return { kind: "project" as const, entity_id: null };
  if (projectEnsure.test(pathname) && method === "POST") return { kind: "project" as const, entity_id: null };
  match = pathname.match(agentItem);
  if (match && ["PATCH", "DELETE"].includes(method)) return { kind: "agent" as const, entity_id: decoded(match[1]) };
  if (agentCollection.test(pathname) && method === "POST") return { kind: "agent" as const, entity_id: null };
  match = pathname.match(settingItem);
  if (match && method === "PATCH") return { kind: "setting" as const, entity_id: match[1] };
  if (scheduledAgentCreate.test(pathname) && method === "POST") return { kind: "scheduled" as const, entity_id: null };
  match = pathname.match(scheduledItem);
  if (match && ["PATCH", "DELETE"].includes(method)) return { kind: "scheduled" as const, entity_id: decoded(match[1]) };
  match = pathname.match(scheduledAction);
  if (match && method === "POST") return { kind: "scheduled" as const, entity_id: decoded(match[1]) };
  if (scheduledCollection.test(pathname) && method === "POST") return { kind: "scheduled" as const, entity_id: null };
  return null;
}

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
