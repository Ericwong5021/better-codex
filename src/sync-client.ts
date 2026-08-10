import { createHash } from "node:crypto";
import { issuePriorities, issueStatuses, type IssuePatch, type Store } from "./db.js";
import { readSyncConfiguration, type SyncConfiguration } from "./sync-config.js";
import { remoteIssuePatchFields, type CommandAcknowledgement, type IssueProjection, type RemoteCommand, type SyncChange, type SyncPullResponse, type SyncPushResponse } from "./sync-contract.js";

type SyncState = {
  connected: boolean;
  syncing: boolean;
  last_sync_at: string | null;
  last_error: string | null;
  hub_url: string | null;
  device_name: string | null;
};

function same(left: unknown, right: unknown) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function errorCode(error: unknown) {
  return error instanceof Error ? error.message : "sync_failed";
}

function eventId(entry: { entity_type: string; entity_id: string; changed_at: string; operation: string }) {
  return createHash("sha256").update(`${entry.entity_type}\0${entry.entity_id}\0${entry.changed_at}\0${entry.operation}`).digest("hex");
}

async function hubRequest<T>(configuration: SyncConfiguration, path: string, options: RequestInit = {}) {
  const response = await fetch(`${configuration.hub_url}${path}`, {
    ...options,
    headers: {
      authorization: `Bearer ${configuration.device_token}`,
      "content-type": "application/json",
      ...(options.headers ?? {}),
    },
    signal: AbortSignal.timeout(15_000),
  });
  const body = await response.json().catch(() => ({})) as Record<string, unknown>;
  if (!response.ok) throw new Error(typeof body.error === "string" ? body.error : `hub_http_${response.status}`);
  return body as T;
}

function cleanRemotePatch(command: RemoteCommand) {
  const patch: IssuePatch = {};
  for (const field of remoteIssuePatchFields) {
    if (!(field in command.patch)) continue;
    const value = command.patch[field];
    if (field === "title" || field === "description" || field === "project_id") {
      if (typeof value !== "string") throw new Error(`invalid_${field}`);
      patch[field] = value;
    } else if (field === "status") {
      if (!issueStatuses.includes(value as never)) throw new Error("invalid_status");
      patch.status = value as typeof issueStatuses[number];
    } else if (field === "priority") {
      if (!issuePriorities.includes(value as never)) throw new Error("invalid_priority");
      patch.priority = value as typeof issuePriorities[number];
    } else if (field === "labels") {
      if (!Array.isArray(value) || value.some(item => typeof item !== "string")) throw new Error("invalid_labels");
      patch.labels = value as string[];
    } else if (field === "sort_order") {
      if (typeof value !== "number" || !Number.isFinite(value)) throw new Error("invalid_sort_order");
      patch.sort_order = value;
    } else if (field === "pinned") {
      if (typeof value !== "boolean") throw new Error("invalid_pinned");
      patch.pinned = value;
    }
  }
  return patch;
}

export class SyncClient {
  private timer: NodeJS.Timeout | null = null;
  private active: Promise<SyncState> | null = null;
  private state: SyncState = { connected: false, syncing: false, last_sync_at: null, last_error: null, hub_url: null, device_name: null };

  constructor(
    private readonly store: Store,
    private readonly intervalMs = 5_000,
    private readonly configuration: () => SyncConfiguration | null = readSyncConfiguration,
  ) {}

  start() {
    if (this.timer) return;
    void this.syncNow();
    this.timer = setInterval(() => void this.syncNow(), this.intervalMs);
    this.timer.unref();
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  status() {
    const configuration = this.configuration();
    return {
      ...this.state,
      connected: Boolean(configuration),
      hub_url: configuration?.hub_url ?? null,
      device_name: configuration?.device_name ?? null,
      queue: this.store.syncQueueStatus(),
    };
  }

  syncNow() {
    if (this.active) return this.active;
    this.active = this.run().finally(() => { this.active = null; });
    return this.active;
  }

  private async run() {
    const configuration = this.configuration();
    if (!configuration) {
      this.state = { ...this.state, connected: false, syncing: false, hub_url: null, device_name: null };
      return this.status();
    }
    this.state = { ...this.state, connected: true, syncing: true, hub_url: configuration.hub_url, device_name: configuration.device_name };
    try {
      this.store.initializeSyncQueue();
      await this.push(configuration);
      await this.pull(configuration);
      this.state = { ...this.state, syncing: false, last_sync_at: new Date().toISOString(), last_error: null };
    } catch (error) {
      this.state = { ...this.state, syncing: false, last_error: errorCode(error) };
    }
    return this.status();
  }

  private async push(configuration: SyncConfiguration) {
    for (let page = 0; page < 10; page += 1) {
      const entries = this.store.listSyncQueue(100);
      if (!entries.length) return;
      const byEvent = new Map<string, typeof entries[number]>();
      const changes: SyncChange[] = entries.map(entry => {
        const projection = entry.operation === "upsert" ? this.store.syncProjection(entry.entity_type, entry.entity_id) : null;
        const operation = projection ? "upsert" : "delete";
        const event_id = eventId({ ...entry, operation });
        byEvent.set(event_id, entry);
        return { ...entry, event_id, operation, projection };
      });
      const result = await hubRequest<SyncPushResponse>(configuration, "/api/v1/sync/push", { method: "POST", body: JSON.stringify({ changes }) });
      for (const id of result.accepted) {
        const entry = byEvent.get(id);
        if (entry) this.store.clearSyncQueueEntry(entry);
      }
      this.store.setSyncCursor(result.cursor);
      if (entries.length < 100) return;
    }
  }

  private async pull(configuration: SyncConfiguration) {
    const result = await hubRequest<SyncPullResponse>(configuration, `/api/v1/sync/pull?cursor=${this.store.getSyncCursor()}`);
    for (const command of result.commands) {
      let acknowledgement: CommandAcknowledgement;
      try {
        acknowledgement = { status: "applied", projection: this.applyCommand(command) };
      } catch (error) {
        acknowledgement = { status: "rejected", error: errorCode(error) };
      }
      await hubRequest(configuration, `/api/v1/sync/commands/${encodeURIComponent(command.id)}/ack`, {
        method: "POST",
        body: JSON.stringify(acknowledgement),
      });
    }
    this.store.setSyncCursor(result.cursor);
  }

  private applyCommand(command: RemoteCommand): IssueProjection {
    if (command.entity_type !== "issue") throw new Error("unsupported_command_entity");
    if (command.operation === "create") {
      if (this.store.getIssue(command.entity_id)) throw new Error("issue_already_exists");
      const patch = cleanRemotePatch(command);
      if (!patch.project_id || !patch.title) throw new Error("invalid_create_command");
      const project = this.store.getProject(patch.project_id);
      if (!project) throw new Error("project_not_found");
      const issue = this.store.createIssue({
        id: command.entity_id,
        projectId: patch.project_id,
        title: patch.title,
        description: patch.description ?? "",
        status: patch.status,
        priority: patch.priority,
        labels: patch.labels,
        workspacePath: project.workspace_path,
      });
      return this.store.syncProjection("issue", issue.id) as IssueProjection;
    }
    const issue = this.store.getIssue(command.entity_id);
    if (!issue) throw new Error("issue_not_found");
    for (const [field, expected] of Object.entries(command.expected)) {
      if (!same((issue as unknown as Record<string, unknown>)[field], expected)) throw new Error(`sync_conflict:${field}`);
    }
    if (issue.active_run_status) throw new Error("issue_execution_running");
    let updated;
    if (command.operation === "archive") updated = this.store.archiveIssue(issue.id, issue.version);
    else if (command.operation === "unarchive") updated = this.store.unarchiveIssue(issue.id, issue.version);
    else updated = this.store.updateIssue(issue.id, issue.version, cleanRemotePatch(command));
    return this.store.syncProjection("issue", updated.id) as IssueProjection;
  }
}
