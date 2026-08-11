import { coreVersion } from "./compatibility.js";
import type { Store } from "./db.js";
import { readSyncConfiguration, type SyncConfiguration } from "./sync-config.js";
import { syncProtocolVersion, type RemoteCommand, type RemoteCommandAck, type RuntimeProjection, type SyncChange, type SyncPushResponse } from "./sync-contract.js";

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
    for (let page = 0; page < 100; page += 1) {
      const entries = this.store.listSyncQueue(100);
      const changes: SyncChange[] = entries.map(entry => {
        const projection = entry.operation === "upsert" ? this.store.syncProjection(entry.entity_type, entry.entity_id) : null;
        return {
          ...entry,
          operation: projection ? "upsert" : "delete",
          projection,
        };
      });
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
      for (const entry of entries) if (accepted.has(entry.event_id)) this.store.clearSyncQueueEntry(entry);
      this.store.setSyncCursor(result.cursor);
      this.state.lease_expires_at = result.lease_expires_at;
      if (entries.length < 100) return;
    }
    throw new Error("sync_queue_drain_limit");
  }

  private async pullCommands(configuration: SyncConfiguration) {
    for (let page = 0; page < 100; page += 1) {
      const result = await hubRequest<{ commands: RemoteCommand[] }>(configuration, "/api/v1/sync/commands?limit=100");
      if (!Array.isArray(result.commands)) throw new Error("invalid_command_response");
      for (const command of result.commands) {
        const ack = this.store.applyRemoteCommand(command);
        await hubRequest<RemoteCommandAck>(configuration, `/api/v1/sync/commands/${encodeURIComponent(command.command_id)}/ack`, { method: "POST", body: JSON.stringify(ack) });
      }
      if (result.commands.length < 100) return;
    }
    throw new Error("command_drain_limit");
  }
}
