import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { issuePriorities, issueStatuses, Store, type IssuePriority, type IssueStatus } from "./db.js";
import { port, token } from "./config.js";

const accessToken = token();
const store = new Store();

function sendJson(response: ServerResponse, status: number, value: unknown) {
  const body = JSON.stringify(value);
  response.writeHead(status, {
    "cache-control": "no-store",
    "content-length": Buffer.byteLength(body),
    "content-type": "application/json; charset=utf-8",
    "access-control-allow-origin": "app://-",
    "cross-origin-resource-policy": "cross-origin",
  });
  response.end(body);
}

function readBody(request: IncomingMessage) {
  return new Promise<Record<string, unknown>>((resolve, reject) => {
    let source = "";
    request.on("data", (chunk) => {
      source += chunk;
      if (source.length > 1024 * 1024) reject(new Error("body_too_large"));
    });
    request.on("end", () => {
      try {
        const value = source ? JSON.parse(source) : {};
        if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("invalid_json");
        resolve(value);
      } catch {
        reject(new Error("invalid_json"));
      }
    });
  });
}

function loopback(request: IncomingMessage) {
  return ["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(request.socket.remoteAddress ?? "");
}

function trustedOrigin(request: IncomingMessage) {
  const origin = request.headers.origin;
  if (!origin) return true;
  return origin === "app://-";
}

function authorized(request: IncomingMessage, url: URL) {
  return request.headers.authorization === `Bearer ${accessToken}` || url.searchParams.get("token") === accessToken;
}

function asStatus(value: unknown) {
  if (!issueStatuses.includes(value as IssueStatus)) throw new Error("invalid_status");
  return value as IssueStatus;
}

function asPriority(value: unknown) {
  if (!issuePriorities.includes(value as IssuePriority)) throw new Error("invalid_priority");
  return value as IssuePriority;
}

function cleanString(value: unknown, limit = 10000) {
  if (value === undefined || value === null) return "";
  if (typeof value !== "string" || value.length > limit || value.includes("\0")) throw new Error("invalid_string");
  return value.trim();
}

function asLabels(value: unknown) {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.some(item => typeof item !== "string")) throw new Error("invalid_labels");
  return value.map(item => item.trim()).filter(Boolean).slice(0, 20);
}

function parseIssuePatch(body: Record<string, unknown>) {
  const patch: Record<string, unknown> = {};
  if ("title" in body) patch.title = cleanString(body.title, 500);
  if ("description" in body) patch.description = cleanString(body.description, 100000);
  if ("status" in body) patch.status = asStatus(body.status);
  if ("priority" in body) patch.priority = asPriority(body.priority);
  if ("pinned" in body) {
    if (typeof body.pinned !== "boolean") throw new Error("invalid_pinned");
    patch.pinned = body.pinned;
  }
  if ("sort_order" in body) {
    if (typeof body.sort_order !== "number" || !Number.isFinite(body.sort_order)) throw new Error("invalid_sort_order");
    patch.sort_order = body.sort_order;
  }
  if ("thread_id" in body) patch.thread_id = cleanString(body.thread_id, 200) || null;
  if ("workspace_path" in body) patch.workspace_path = cleanString(body.workspace_path, 4096) || null;
  if ("labels" in body) {
    patch.labels = asLabels(body.labels);
  }
  return patch;
}

function errorCode(error: unknown) {
  const message = error instanceof Error ? error.message : "request_failed";
  if (message.startsWith("SQLITE_") || message.includes("database is")) return "database_unavailable";
  return message;
}

function errorStatus(code: string) {
  if (code === "version_conflict") return 409;
  if (code.endsWith("_not_found")) return 404;
  if (code === "database_unavailable" || code === "database_integrity_check_failed") return 503;
  return 400;
}

export function startServer() {
  const server = createServer((request, response) => {
    void (async () => {
      if (!request.url || !loopback(request) || !trustedOrigin(request)) return sendJson(response, 403, { error: "forbidden" });
      const url = new URL(request.url, `http://127.0.0.1:${port}`);
      const path = url.pathname.split("/").filter(Boolean);
      const method = request.method ?? "GET";

      if (url.pathname === "/health") {
        const database = store.health();
        return sendJson(response, database.ok ? 200 : 503, { ok: database.ok, version: "0.2.0", pid: process.pid, database });
      }
      if (!authorized(request, url)) return sendJson(response, 401, { error: "unauthorized" });
      if (url.pathname === "/api/bootstrap" && method === "GET") {
        return sendJson(response, 200, { projects: store.listProjects(), statuses: issueStatuses, priorities: issuePriorities });
      }
      if (url.pathname === "/api/projects" && method === "GET") return sendJson(response, 200, store.listProjects());
      if (url.pathname === "/api/projects" && method === "POST") {
        const body = await readBody(request);
        const project = store.createProject({
          name: cleanString(body.name, 120),
          workspacePath: cleanString(body.workspace_path, 4096),
        });
        return sendJson(response, 201, project);
      }
      if (url.pathname === "/api/projects/ensure" && method === "POST") {
        const body = await readBody(request);
        const project = store.ensureProject({
          externalId: cleanString(body.external_id, 200),
          name: cleanString(body.name, 120) || "Codex",
          workspacePath: cleanString(body.workspace_path, 4096),
        });
        return sendJson(response, 200, project);
      }
      if (url.pathname === "/api/issues" && method === "GET") {
        return sendJson(response, 200, store.listIssues({
          projectId: url.searchParams.get("project_id") || undefined,
          search: url.searchParams.get("search") || undefined,
          archived: url.searchParams.get("archived") === "1",
        }));
      }
      if (url.pathname === "/api/issues" && method === "POST") {
        const body = await readBody(request);
        const issue = store.createIssue({
          projectId: cleanString(body.project_id, 200),
          title: cleanString(body.title, 500),
          description: cleanString(body.description, 100000),
          status: "status" in body ? asStatus(body.status) : undefined,
          priority: "priority" in body ? asPriority(body.priority) : undefined,
          labels: asLabels(body.labels),
          threadId: cleanString(body.thread_id, 200),
          workspacePath: cleanString(body.workspace_path, 4096),
        });
        return sendJson(response, 201, issue);
      }
      if (path[0] === "api" && path[1] === "issues" && path[2]) {
        const issue = store.getIssue(decodeURIComponent(path[2]));
        if (!issue) return sendJson(response, 404, { error: "issue_not_found" });
        if (method === "GET" && path.length === 3) return sendJson(response, 200, issue);
        if (method === "PATCH" && path.length === 3) {
          const body = await readBody(request);
          const version = Number(body.version);
          if (!Number.isInteger(version) || version < 1) throw new Error("invalid_version");
          const updated = store.updateIssue(issue.id, version, parseIssuePatch(body));
          return sendJson(response, 200, updated);
        }
        if (method === "POST" && path[3] === "archive") {
          const body = await readBody(request);
          const updated = store.archiveIssue(issue.id, Number(body.version));
          return sendJson(response, 200, updated);
        }
      }
      if (url.pathname === "/api/shutdown" && method === "POST") {
        sendJson(response, 200, { ok: true });
        setImmediate(() => server.close(() => {
          store.close();
          process.exit(0);
        }));
        return;
      }
      return sendJson(response, 404, { error: "not_found" });
    })().catch((error) => {
      const code = errorCode(error);
      if (!response.headersSent) sendJson(response, errorStatus(code), { error: code });
      else response.end();
    });
  });

  server.listen(port, "127.0.0.1", () => {
    console.log(`Better Codex 0.2.0 listening on http://127.0.0.1:${port}`);
  });
  const stop = () => server.close(() => {
    store.close();
    process.exit(0);
  });
  process.once("SIGINT", stop);
  process.once("SIGTERM", stop);
  return server;
}
