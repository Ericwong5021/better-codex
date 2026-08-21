import { createHash, randomUUID } from "node:crypto";
import { defaultAgentProfile } from "./agent-profiles.js";
import { coreVersion } from "./compatibility.js";
import type { IssueThreadAction, Store } from "./db.js";
import { readModelCatalog } from "./model-catalog.js";
import { readSyncConfiguration, type SyncConfiguration } from "./sync-config.js";
import { legacySyncProtocolVersion, supportedSyncProtocolVersions, syncProtocolVersion, type AgentDirectoryProjection, type AgentModelCatalogProjection, type CodexUsageProjection, type ConversationProjection, type DirectoryBrowserResult, type RemoteCommand, type RemoteCommandAck, type RemoteFilePayload, type RuntimeProjection, type SyncChange, type SyncProtocolVersion, type SyncPushResponse } from "./sync-contract.js";
import { controlCapabilities, controlProtocolVersion, decodeControlMessage, encodeControlMessage } from "./control-protocol.js";

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
  private conversationHashes = new Map<string, string>();
  private controlSocket: WebSocket | null = null;
  private controlOpening = false;
  private controlReady = false;
  private controlHeartbeat: NodeJS.Timeout | null = null;
  private controlKey: string | null = null;
  private remoteWake = false;
  private running = false;
  private lastUsageSyncAt = 0;
  private syncProtocolCache: { key: string; value: SyncProtocolVersion; expiresAt: number } | null = null;
  private controlRequests = new Map<string, { resolve: (value: Record<string, unknown>) => void; reject: (error: Error) => void; timer: NodeJS.Timeout }>();
  private state: SyncState = { connected: false, syncing: false, last_sync_at: null, last_error: null, hub_url: null, device_name: null, lease_expires_at: null };

  constructor(
    private readonly store: Store,
    private readonly intervalMs = 5_000,
    private readonly configuration: () => SyncConfiguration | null = readSyncConfiguration,
    private readonly commandApplied: (command: RemoteCommand, ack: RemoteCommandAck) => void = () => {},
    private readonly conversation: (issueId: string) => Promise<ConversationProjection | null> = async () => null,
    private readonly reply: (issueId: string, requestId: string, message: string, files: RemoteFilePayload[]) => void | Promise<void> = () => { throw new Error("remote_reply_unavailable"); },
    private readonly stopIssue: (issueId: string) => void | Promise<void> = () => { throw new Error("remote_stop_unavailable"); },
    private readonly accountUsage: () => Promise<CodexUsageProjection | null> = async () => null,
    private readonly projectCreate: (projectId: string, name: string, workspacePath: string) => void | Promise<void> = () => { throw new Error("remote_project_create_unavailable"); },
    private readonly projectOverview: (projectId: string, agentId: string, feedback: string) => void | Promise<void> = () => { throw new Error("remote_project_overview_unavailable"); },
    private readonly files: (files: RemoteFilePayload[]) => { paths: string[]; cleanup: () => void } | Promise<{ paths: string[]; cleanup: () => void }> = () => { throw new Error("remote_files_unavailable"); },
    private readonly chooseDirectory: () => string | Promise<string> = () => { throw new Error("directory_picker_unavailable"); },
    private readonly browseDirectory: (path: string) => DirectoryBrowserResult | Promise<DirectoryBrowserResult> = () => { throw new Error("directory_browser_unavailable"); },
    private readonly threadAction: (issueId: string, action: IssueThreadAction) => void | Promise<void> = () => { throw new Error("codex_thread_action_unavailable"); },
  ) {}

  start() {
    if (this.timer || !this.configuration()) return;
    this.running = true;
    void this.ensureControlConnection();
    void this.schedule(0);
  }

  stop() {
    this.running = false;
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    if (this.controlHeartbeat) clearInterval(this.controlHeartbeat);
    this.controlHeartbeat = null;
    this.controlKey = null;
    this.controlSocket?.close();
    this.controlSocket = null;
    this.controlOpening = false;
    this.controlReady = false;
    this.syncProtocolCache = null;
    for (const request of this.controlRequests.values()) {
      clearTimeout(request.timer);
      request.reject(new Error("control_stopped"));
    }
    this.controlRequests.clear();
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

  syncNow(forceRemote = true) {
    if (forceRemote) this.remoteWake = true;
    if (this.active) return this.active;
    this.active = this.run().finally(() => { this.active = null; });
    return this.active;
  }

  private async schedule(delay: number) {
    this.timer = setTimeout(async () => {
      this.timer = null;
      await this.syncNow(false);
      if (!this.configuration()) return;
      const retry = [5_000, 10_000, 20_000, 40_000, 60_000][Math.min(this.failures - 1, 4)] ?? this.intervalMs;
      void this.schedule(this.failures ? retry : this.intervalMs);
    }, delay);
    this.timer.unref();
  }

  private controlUrl(configuration: SyncConfiguration) {
    const base = new URL(configuration.hub_url);
    base.protocol = base.protocol === "https:" ? "wss:" : "ws:";
    base.pathname = "/api/v1/control";
    base.search = "";
    return base.toString();
  }

  private async ensureControlConnection() {
    const configuration = this.configuration();
    if (!this.running || !configuration || configuration.transport === "http" || this.controlOpening || (this.controlSocket && (this.controlSocket.readyState === WebSocket.OPEN || this.controlSocket.readyState === WebSocket.CONNECTING))) return;
    const key = `${configuration.hub_url}|${configuration.device_id}|${configuration.device_token}`;
    if (this.controlKey === key && this.controlSocket) return;
    this.controlOpening = true;
    this.controlKey = key;
    try {
      const socket = new WebSocket(this.controlUrl(configuration), ["better-codex-control-v1", configuration.device_token]);
      this.controlSocket = socket;
      socket.addEventListener("open", () => {
        this.controlOpening = false;
        this.controlReady = false;
        socket.send(encodeControlMessage({ type: "hello", protocol_version: controlProtocolVersion, device_id: configuration.device_id, device_name: configuration.device_name, sync_protocol_versions: [...supportedSyncProtocolVersions], capabilities: [...controlCapabilities] }));
        this.controlHeartbeat = setInterval(() => {
          if (socket.readyState !== WebSocket.OPEN) return;
          const queue = this.store.syncQueueStatus();
          socket.send(encodeControlMessage({ type: "heartbeat", protocol_version: controlProtocolVersion, device_id: configuration.device_id, queue_depth: queue.pending }));
        }, 30_000);
        this.controlHeartbeat.unref();
      }, { once: true });
      socket.addEventListener("message", event => {
        try {
          const message = decodeControlMessage(String(event.data));
          if (message.type === "rpc_response") {
            const pending = this.controlRequests.get(message.request_id);
            if (!pending) return;
            clearTimeout(pending.timer);
            this.controlRequests.delete(message.request_id);
            if (message.ok) pending.resolve(message.result || {});
            else pending.reject(new Error(message.error || "control_rpc_failed"));
            return;
          }
          if (message.type === "hello_ack") {
            if (!supportedSyncProtocolVersions.includes(message.sync_protocol_version as SyncProtocolVersion)) throw new Error("incompatible_protocol");
            this.syncProtocolCache = { key, value: message.sync_protocol_version as SyncProtocolVersion, expiresAt: Date.now() + 60_000 };
            this.controlReady = true;
            this.state.lease_expires_at = message.lease_expires_at;
          }
          if (message.type === "heartbeat_ack") {
            this.state.lease_expires_at = message.lease_expires_at;
            if (message.commands_available > 0) void this.syncNow(true);
          }
          if (message.type === "commands_available") void this.syncNow(true);
        } catch {
          socket.close();
        }
      });
      socket.addEventListener("close", () => {
        if (this.controlSocket === socket) this.controlSocket = null;
        this.controlOpening = false;
        this.controlReady = false;
        if (this.controlHeartbeat) clearInterval(this.controlHeartbeat);
        this.controlHeartbeat = null;
        for (const request of this.controlRequests.values()) {
          clearTimeout(request.timer);
          request.reject(new Error("control_closed"));
        }
        this.controlRequests.clear();
        if (this.running && this.configuration()) void this.ensureControlConnection();
      });
      socket.addEventListener("error", () => {
        this.controlOpening = false;
      });
    } catch {
      this.controlOpening = false;
      this.controlSocket = null;
    }
  }

  private controlRpc(method: "commands.claim" | "commands.ack", params: Record<string, unknown>) {
    const socket = this.controlSocket;
    if (!socket || socket.readyState !== WebSocket.OPEN) return Promise.reject(new Error("control_unavailable"));
    const requestId = randomUUID();
    return new Promise<Record<string, unknown>>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.controlRequests.delete(requestId);
        reject(new Error("control_rpc_timeout"));
      }, 15_000);
      timer.unref();
      this.controlRequests.set(requestId, { resolve, reject, timer });
      try {
        socket.send(encodeControlMessage({ type: "rpc_request", protocol_version: controlProtocolVersion, request_id: requestId, method, params }));
      } catch (error) {
        clearTimeout(timer);
        this.controlRequests.delete(requestId);
        reject(error instanceof Error ? error : new Error("control_rpc_send_failed"));
      }
    });
  }

  private async negotiatedSyncProtocol(configuration: SyncConfiguration) {
    const key = `${configuration.hub_url}|${configuration.device_id}|${configuration.device_token}`;
    if (this.syncProtocolCache?.key === key && this.syncProtocolCache.expiresAt > Date.now()) return this.syncProtocolCache.value;
    const capabilities = await hubRequest<{ protocol_versions?: unknown }>(configuration, "/api/v1/capabilities");
    const advertised = Array.isArray(capabilities.protocol_versions) ? capabilities.protocol_versions : [];
    const selected = supportedSyncProtocolVersions.find(version => advertised.includes(version));
    if (!selected) throw new Error("incompatible_protocol");
    this.syncProtocolCache = { key, value: selected, expiresAt: Date.now() + 60_000 };
    return selected;
  }

  private runtime(configuration: SyncConfiguration, protocolVersion: SyncProtocolVersion, usage: CodexUsageProjection | null, agentModelCatalog: AgentModelCatalogProjection[]): RuntimeProjection {
    const queue = this.store.syncQueueStatus();
    const defaultAgent = defaultAgentProfile();
    return {
      device_id: configuration.device_id,
      device_name: configuration.device_name,
      protocol_version: protocolVersion,
      core_version: coreVersion,
      last_seen_at: new Date().toISOString(),
      last_sync_at: this.state.last_sync_at,
      queue_depth: queue.pending,
      health_state: "online",
      usage,
      ...(protocolVersion !== legacySyncProtocolVersion ? {
        agent_models: agentModelCatalog,
        auto_dispatch: this.store.getAutoDispatch(),
        scheduler_model: this.store.getSchedulerModel(defaultAgent.model),
        scheduler_reasoning_effort: this.store.getSchedulerReasoningEffort(),
        default_agent_model: defaultAgent.model,
        default_agent_reasoning_effort: defaultAgent.reasoning_effort,
        default_agent_service_tier: defaultAgent.service_tier,
      } : {}),
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
      const remoteWake = this.remoteWake;
      this.remoteWake = false;
      const controlReady = this.controlReady && this.controlSocket?.readyState === WebSocket.OPEN;
      if (configuration.transport === "websocket" && !controlReady) {
        void this.ensureControlConnection();
        this.failures += 1;
        this.state = { ...this.state, syncing: false, last_error: "control_unavailable" };
        return this.status();
      }
      if (controlReady && !remoteWake && this.store.syncQueueStatus().pending === 0 && Date.now() - this.lastUsageSyncAt < 60_000) {
        this.failures = 0;
        this.state = { ...this.state, syncing: false, last_error: null };
        return this.status();
      }
      if (controlReady && remoteWake && this.store.syncQueueStatus().pending === 0) {
        await this.pullCommands(configuration);
        await this.push(configuration);
      } else {
        await this.push(configuration);
        await this.pullCommands(configuration);
        await this.push(configuration);
      }
      this.failures = 0;
      this.state = { ...this.state, syncing: false, last_sync_at: new Date().toISOString(), last_error: null };
    } catch (error) {
      this.failures += 1;
      this.state = { ...this.state, syncing: false, last_error: errorCode(error) };
    }
    return this.status();
  }

  private async push(configuration: SyncConfiguration) {
    const protocolVersion = await this.negotiatedSyncProtocol(configuration);
    const [usage, agentModelCatalog] = await Promise.all([this.accountUsage(), protocolVersion !== legacySyncProtocolVersion ? readModelCatalog() : Promise.resolve([])]);
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
      if (directoryPending) changes.unshift(this.agentDirectoryChange(protocolVersion));
      const result = await hubRequest<SyncPushResponse>(configuration, "/api/v1/sync/push", {
        method: "POST",
        body: JSON.stringify({
          protocol_version: protocolVersion,
          core_version: coreVersion,
          device_id: configuration.device_id,
          runtime: this.runtime(configuration, protocolVersion, usage, agentModelCatalog),
          changes,
        }),
      });
      this.lastUsageSyncAt = Date.now();
      const accepted = new Set(result.accepted);
      for (const entry of entries) {
        if (!accepted.has(entry.event_id)) continue;
        if (entry.entity_type === "issue" && entry.operation === "upsert" && this.store.getIssue(entry.entity_id)?.run_thread_id) {
          await this.pushConversation(configuration, entry.entity_id);
        }
        this.store.clearSyncQueueEntry(entry);
      }
      this.store.setSyncCursor(result.cursor);
      this.state.lease_expires_at = result.lease_expires_at;
      directoryPending = false;
      if (entries.length < limit) {
        await this.refreshConversations(configuration);
        return;
      }
    }
    throw new Error("sync_queue_drain_limit");
  }

  private async pushConversation(configuration: SyncConfiguration, issueId: string) {
    const projection = await this.conversation(issueId);
    if (!projection) return;
    const payload = JSON.stringify(projection);
    const hash = createHash("sha256").update(payload).digest("hex");
    if (this.conversationHashes.get(issueId) === hash) return;
    await hubRequest(configuration, `/api/v1/sync/issues/${encodeURIComponent(issueId)}/conversation`, { method: "PUT", body: payload });
    this.conversationHashes.set(issueId, hash);
  }

  private async refreshConversations(configuration: SyncConfiguration) {
    const issues = [...this.store.listIssues(), ...this.store.listIssues({ archived: true })];
    const recentThreshold = Date.now() - 120_000;
    const candidates = this.conversationHashes.size
      ? issues.filter(issue => {
          const reply = this.store.getIssueReplyState(issue.id);
          const recentlyFinished = [issue.latest_run_finished_at, issue.session_updated_at, reply.finished_at]
            .some(value => value && Date.parse(value) >= recentThreshold);
          return Boolean(issue.active_run_status)
            || ["starting", "active", "stopping", "waiting_on_approval", "waiting_on_user"].includes(issue.session_status || "")
            || reply.status === "running"
            || recentlyFinished;
        })
      : issues;
    for (const issue of candidates) if (issue.run_thread_id) await this.pushConversation(configuration, issue.id);
  }

  private async pullCommands(configuration: SyncConfiguration) {
    for (let page = 0; page < 100; page += 1) {
      const claimed = this.controlReady && this.controlSocket?.readyState === WebSocket.OPEN;
      const result = claimed
        ? await this.controlRpc("commands.claim", { limit: 100 }) as { commands: RemoteCommand[] }
        : await hubRequest<{ commands: RemoteCommand[] }>(configuration, "/api/v1/sync/commands?limit=100");
      if (!Array.isArray(result.commands)) throw new Error("invalid_command_response");
      for (const command of result.commands) {
        const ack = { ...(await this.store.applyRemoteCommand(command, { files: this.files, reply: this.reply, stop: this.stopIssue, projectCreate: this.projectCreate, projectOverview: this.projectOverview, chooseDirectory: this.chooseDirectory, browseDirectory: this.browseDirectory, threadAction: this.threadAction })), delivery_id: command.delivery_id ?? null };
        if (claimed) await this.controlRpc("commands.ack", ack as unknown as Record<string, unknown>);
        else await hubRequest<RemoteCommandAck>(configuration, `/api/v1/sync/commands/${encodeURIComponent(command.command_id)}/ack`, { method: "POST", body: JSON.stringify(ack) });
        if (ack.status === "applied") this.commandApplied(command, ack);
      }
      if (result.commands.length < 100) return;
    }
    throw new Error("command_drain_limit");
  }

  private agentDirectoryChange(protocolVersion: SyncProtocolVersion): SyncChange {
    const agents = this.store.listAgentProfiles().map(profile => ({
      id: profile.id,
      role: profile.role,
      name: profile.name,
      name_en: profile.name_en,
      description: profile.description,
      ...(protocolVersion !== legacySyncProtocolVersion ? { model: profile.model, reasoning_effort: profile.reasoning_effort, service_tier: profile.service_tier } : {}),
      avatar: this.store.getAgentAvatar(profile.id),
      version: profile.version,
      created_at: profile.created_at,
      updated_at: profile.updated_at,
    }));
    const defaultAvatar = this.store.getAgentAvatar("default");
    const hash = createHash("sha256").update(JSON.stringify({ agents, defaultAvatar })).digest("hex");
    const projection: AgentDirectoryProjection = {
      id: "agents",
      agents,
      default_avatar: defaultAvatar,
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
