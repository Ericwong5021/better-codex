import { createHash } from "node:crypto";
import { coreVersion } from "./compatibility.js";
import type { Store } from "./db.js";
import { readSyncConfiguration, type SyncConfiguration } from "./sync-config.js";
import { syncProtocolVersion, type AgentDirectoryProjection, type ConversationProjection, type RemoteCommand, type RemoteCommandAck, type RuntimeProjection, type SyncChange, type SyncPushResponse } from "./sync-contract.js";

type SyncState = {
  connected: boolean;
  syncing: boolean;
  last_sync_at: string | null;
  last_error: string | null;
  hub_url: string | null;
  device_name: string | null;
  lease_expires_at: string | null;
};

function errorCode(error: unknown) {
  return error instanceof Error ? error.message : "sync_failed";
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

export class SyncClient {
  private timer: NodeJS.Timeout | null = null;
  private active: Promise<SyncState> | null = null;
  private failures = 0;
  private state: SyncState = { connected: false, syncing: false, last_sync_at: null, last_error: null, hub_url: null, device_name: null, lease_expires_at: null };

  constructor(
    private readonly store: Store,
    private readonly intervalMs = 5_000,
    private readonly configuration: () => SyncConfiguration | null = readSyncConfiguration,
    private readonly commandApplied: (command: RemoteCommand, ack: RemoteCommandAck) => void = () => {},
    private readonly conversation: (issueId: string) => Promise<ConversationProjection | null> = async () => null,
    private readonly reply: (issueId: string, requestId: string, message: string) => void | Promise<void> = () => { throw new Error("remote_reply_unavailable"); },
    private readonly stopIssue: (issueId: string) => void | Promise<void> = () => { throw new Error("remote_stop_unavailable"); },
  ) {}

  start() {
    if (this.timer || !this.configuration()) return;
    void this.schedule(0);
  }

  stop() {
    if (this.timer) clearTimeout(this.timer);
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

  private async schedule(delay: number) {
    this.timer = setTimeout(async () => {
      this.timer = null;
      await this.syncNow();
      if (!this.configuration()) return;
      const retry = [5_000, 10_000, 20_000, 40_000, 60_000][Math.min(this.failures - 1, 4)] ?? this.intervalMs;
      void this.schedule(this.failures ? retry : this.intervalMs);
    }, delay);
    this.timer.unref();
  }

  private runtime(configuration: SyncConfiguration): RuntimeProjection {
    const queue = this.store.syncQueueStatus();
    return {
      device_id: configuration.device_id,
      device_name: configuration.device_name,
      protocol_version: syncProtocolVersion,
      core_version: coreVersion,
      last_seen_at: new Date().toISOString(),
      last_sync_at: this.state.last_sync_at,
      queue_depth: queue.pending,
      health_state: "online",
    };
  }

  private async run() {
    const configuration = this.configuration();
    if (!configuration) {
      this.state = { ...this.state, connected: false, syncing: false, hub_url: null, device_name: null, lease_expires_at: null };
      return this.status();
    }
    this.state = { ...this.state, connected: true, syncing: true, hub_url: configuration.hub_url, device_name: configuration.device_name };
    try {
      this.store.initializeSyncQueue();
      await this.push(configuration);
      await this.pullCommands(configuration);
      await this.push(configuration);
      this.failures = 0;
      this.state = { ...this.state, syncing: false, last_sync_at: new Date().toISOString(), last_error: null };
    } catch (error) {
      this.failures += 1;
      this.state = { ...this.state, syncing: false, last_error: errorCode(error) };
    }
    return this.status();
  }

  private async push(configuration: SyncConfiguration) {
    let directoryPending = true;
    for (let page = 0; page < 100; page += 1) {
      const limit = directoryPending ? 99 : 100;
      const entries = this.store.listSyncQueue(limit);
      const changes: SyncChange[] = entries.map(entry => {
        const projection = entry.operation === "upsert" ? this.store.syncProjection(entry.entity_type, entry.entity_id) : null;
        return {
          ...entry,
          operation: projection ? "upsert" : "delete",
          projection,
        };
      });
      if (directoryPending) changes.unshift(this.agentDirectoryChange());
      const result = await hubRequest<SyncPushResponse>(configuration, "/api/v1/sync/push", {
        method: "POST",
        body: JSON.stringify({
          protocol_version: syncProtocolVersion,
          core_version: coreVersion,
          device_id: configuration.device_id,
          runtime: this.runtime(configuration),
          changes,
        }),
      });
      const accepted = new Set(result.accepted);
      for (const entry of entries) {
        if (!accepted.has(entry.event_id)) continue;
        if (entry.entity_type === "issue" && entry.operation === "upsert" && this.store.getIssue(entry.entity_id)?.run_thread_id) {
          const projection = await this.conversation(entry.entity_id);
          if (projection) await hubRequest(configuration, `/api/v1/sync/issues/${encodeURIComponent(entry.entity_id)}/conversation`, { method: "PUT", body: JSON.stringify(projection) });
        }
        this.store.clearSyncQueueEntry(entry);
      }
      this.store.setSyncCursor(result.cursor);
      this.state.lease_expires_at = result.lease_expires_at;
      directoryPending = false;
      if (entries.length < limit) return;
    }
    throw new Error("sync_queue_drain_limit");
  }

  private async pullCommands(configuration: SyncConfiguration) {
    for (let page = 0; page < 100; page += 1) {
      const result = await hubRequest<{ commands: RemoteCommand[] }>(configuration, "/api/v1/sync/commands?limit=100");
      if (!Array.isArray(result.commands)) throw new Error("invalid_command_response");
      for (const command of result.commands) {
        const ack = await this.store.applyRemoteCommand(command, { reply: this.reply, stop: this.stopIssue });
        await hubRequest<RemoteCommandAck>(configuration, `/api/v1/sync/commands/${encodeURIComponent(command.command_id)}/ack`, { method: "POST", body: JSON.stringify(ack) });
        if (ack.status === "applied") this.commandApplied(command, ack);
      }
      if (result.commands.length < 100) return;
    }
    throw new Error("command_drain_limit");
  }

  private agentDirectoryChange(): SyncChange {
    const agents = this.store.listAgentProfiles().map(profile => ({
      id: profile.id,
      role: profile.role,
      name: profile.name,
      name_en: profile.name_en,
      description: profile.description,
      version: profile.version,
      created_at: profile.created_at,
      updated_at: profile.updated_at,
    }));
    const hash = createHash("sha256").update(JSON.stringify(agents)).digest("hex");
    const projection: AgentDirectoryProjection = {
      id: "agents",
      agents,
      local_revision: Math.max(1, Number.parseInt(hash.slice(0, 13), 16)),
    };
    return {
      event_id: `agent-directory-${hash}`,
      entity_type: "agent_directory",
      entity_id: projection.id,
      operation: "upsert",
      changed_at: agents.reduce((latest, agent) => agent.updated_at > latest ? agent.updated_at : latest, "1970-01-01T00:00:00.000Z"),
      projection,
    };
  }
}
