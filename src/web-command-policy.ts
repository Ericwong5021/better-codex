export type WebCommandKind = "issue" | "project" | "agent" | "setting" | "scheduled";

export const webCommandMaxBodyBytes = 2 * 1024 * 1024;

export function webCommandTarget(methodValue: string, pathValue: string) {
  const issueCollection = /^\/api\/issues$/;
  const issueFromThread = /^\/api\/issues\/from-thread$/;
  const issueItem = /^\/api\/issues\/([^/]+)$/;
  const issueAction = /^\/api\/issues\/([^/]+)\/(start|stop|move|archive|unarchive|reply|session-handoff)$/;
  const issueQueueItem = /^\/api\/issues\/([^/]+)\/queue\/([^/]+)$/;
  const issueQueueSend = /^\/api\/issues\/([^/]+)\/queue\/([^/]+)\/send$/;
  const projectItem = /^\/api\/projects\/([^/]+)$/;
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

  const method = methodValue.toUpperCase();
  const pathname = new URL(pathValue, "http://runtime.local").pathname;
  let match = pathname.match(issueItem);
  if (match && ["PATCH", "DELETE"].includes(method)) return { kind: "issue" as const, entity_id: decodeURIComponent(match[1]) };
  match = pathname.match(issueAction);
  if (match && method === "POST") return { kind: "issue" as const, entity_id: decodeURIComponent(match[1]) };
  match = pathname.match(issueQueueItem);
  if (match && ["PATCH", "DELETE"].includes(method)) return { kind: "issue" as const, entity_id: decodeURIComponent(match[1]) };
  match = pathname.match(issueQueueSend);
  if (match && method === "POST") return { kind: "issue" as const, entity_id: decodeURIComponent(match[1]) };
  if (issueCollection.test(pathname) && method === "POST") return { kind: "issue" as const, entity_id: null };
  if (issueFromThread.test(pathname) && method === "POST") return { kind: "issue" as const, entity_id: null };
  match = pathname.match(projectItem);
  if (match && method === "DELETE") return { kind: "project" as const, entity_id: decodeURIComponent(match[1]) };
  match = pathname.match(projectOverview);
  if (match && method === "POST") return { kind: "project" as const, entity_id: decodeURIComponent(match[1]) };
  match = pathname.match(projectPlanning);
  if (match && method === "POST") return { kind: "project" as const, entity_id: decodeURIComponent(match[1]) };
  if (projectCollection.test(pathname) && method === "POST") return { kind: "project" as const, entity_id: null };
  if (projectEnsure.test(pathname) && method === "POST") return { kind: "project" as const, entity_id: null };
  match = pathname.match(agentItem);
  if (match && ["PATCH", "DELETE"].includes(method)) return { kind: "agent" as const, entity_id: decodeURIComponent(match[1]) };
  if (agentCollection.test(pathname) && method === "POST") return { kind: "agent" as const, entity_id: null };
  match = pathname.match(settingItem);
  if (match && method === "PATCH") return { kind: "setting" as const, entity_id: match[1] };
  if (scheduledAgentCreate.test(pathname) && method === "POST") return { kind: "scheduled" as const, entity_id: null };
  match = pathname.match(scheduledItem);
  if (match && ["PATCH", "DELETE"].includes(method)) return { kind: "scheduled" as const, entity_id: decodeURIComponent(match[1]) };
  match = pathname.match(scheduledAction);
  if (match && method === "POST") return { kind: "scheduled" as const, entity_id: decodeURIComponent(match[1]) };
  if (scheduledCollection.test(pathname) && method === "POST") return { kind: "scheduled" as const, entity_id: null };
  return null;
}

export function webCommandAcknowledgesQueue(methodValue: string, pathValue: string) {
  const issueCollection = /^\/api\/issues$/;
  const issueAction = /^\/api\/issues\/([^/]+)\/(start|stop|move|archive|unarchive|reply|session-handoff)$/;
  const issueQueueItem = /^\/api\/issues\/([^/]+)\/queue\/([^/]+)$/;
  const issueQueueSend = /^\/api\/issues\/([^/]+)\/queue\/([^/]+)\/send$/;
  const method = methodValue.toUpperCase();
  const pathname = new URL(pathValue, "http://runtime.local").pathname;
  const action = pathname.match(issueAction)?.[2];
  return (method === "POST" && (issueCollection.test(pathname) || action === "reply" || issueQueueSend.test(pathname)))
    || (["PATCH", "DELETE"].includes(method) && issueQueueItem.test(pathname));
}

export function webCommandResponseDisposition(status: number, error = "") {
  if (error === "request_outcome_unknown" || [401, 408, 425, 429].includes(status) || status >= 500 || status < 200) return "retry";
  if (status === 202) return "accepted";
  return status < 300 ? "applied" : "rejected";
}
