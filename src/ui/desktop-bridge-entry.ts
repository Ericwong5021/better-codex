// Native-session proxy. This entry never renders product UI.
export function install(config: Record<string, any>) {
  const previous=window.__betterCodexDesktopBridge__;
  if (previous?.endpoint===config.baseUrl && previous?.profile===config.profile && previous?.bundleChecksum===config.bundleChecksum) { previous.pulse(); return {installed:true,reused:true}; }
  previous?.destroy();
  const VERSION=config.version, BRIDGE_TOKEN=config.bridgeToken;
  let destroyed=false, bridgeSequence=0, appServerSequence=0;
  const relayId='better-codex-native:'+crypto.randomUUID();
  const relayThreads=new Set(), bridgeRequests=new Map(), appServerRequests=new Map(), relayGuardianDenials=new Map();
  let relayTimer=null, relayBusy=false, relayHeartbeatBusy=false, relayTurnProbeAt=0, relayCapability='unknown', relayCapabilityError='',relayCapabilityCheckedAt=0, relayAppSessionId='',relayCurrentThreadId='',relayEventQueue=Promise.resolve(), relayCommandInFlight=false,relayBufferedEvents=[];
  let lastError='', desktopCatalogServices=null, runtimeAuthenticated=false;
  function appendDiagnostic(event, fields={}) { console.info('BETTER_CODEX_DESKTOP_BRIDGE', {event,profile:config.profile,version:VERSION,relay_id:relayId,...fields}); }
  function normalizeSessionId(value) {
      const id = String(value || "").replace(/^(local|cloud):/i, "");
      return /^[a-f0-9-]{36}$/i.test(id) ? id : "";
    }
  function api(path, options={}) {
    if(destroyed) return Promise.reject(new Error('desktop_bridge_destroyed'));
    if(typeof window.betterCodexRequest!=='function') return Promise.reject(new Error('runtime_bridge_unavailable'));
    const id=relayId+':runtime:'+(++bridgeSequence);
    return new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>{bridgeRequests.delete(id);reject(new Error('runtime_bridge_timeout'));},Number(options.timeoutMs)||10000);
      bridgeRequests.set(id,{resolve,reject,timer});
      try {window.betterCodexRequest(JSON.stringify({id,token:BRIDGE_TOKEN,path,method:options.method||'GET',body:options.body,timeoutMs:options.timeoutMs}));}
      catch(error){bridgeRequests.delete(id);clearTimeout(timer);reject(error);}
    });
  }
  window.__betterCodexBridgeResolve=(id,result)=>{const pending=bridgeRequests.get(id);if(!pending)return;bridgeRequests.delete(id);clearTimeout(pending.timer);if(result?.ok)pending.resolve(result.value);else pending.reject(new Error(result?.value?.error||'request_failed'));};
  function appServerError(value) {
      if (!value) return "desktop_bridge_request_failed";
      if (typeof value === "string") return value;
      if (typeof value.message === "string") return value.message;
      if (typeof value.code === "string") return value.code;
      return "desktop_bridge_request_failed";
    }

function codexError(value) {
      const error = value && typeof value === "object" ? value : {};
      const info = error.codexErrorInfo;
      if (typeof info === "string") return { code: info, httpStatusCode: null };
      const structured = info && typeof info === "object" ? info : {};
      const code = Object.keys(structured)[0] || "other";
      const detail = structured[code] && typeof structured[code] === "object" ? structured[code] : {};
      return { code, httpStatusCode: Number.isInteger(detail.httpStatusCode) ? detail.httpStatusCode : null };
    }

function retryKind(code) {
      if (code === "httpConnectionFailed") return "network";
      if (["responseStreamConnectionFailed", "responseStreamDisconnected", "responseTooManyFailedAttempts"].includes(code)) return "stream";
      if (code === "serverOverloaded") return "overloaded";
      if (code === "usageLimitExceeded") return "rate_limit";
      return "service";
    }

function relayEventTurnId(method, params) {
      if (["error", "item/started", "item/completed"].includes(method)) return normalizeSessionId(params?.turnId);
      if (method === "turn/started" || method === "turn/completed") return normalizeSessionId(params?.turn?.id);
      return "";
    }

function queueRelayEvent(method, params) {
      relayEventQueue = relayEventQueue.catch(() => {}).then(async () => {
        for (let attempt = 0; attempt < 3; attempt += 1) {
          try {
            return await api("/api/session-relay/events", {
              method: "POST",
              body: JSON.stringify({ relay_id: relayId, method, params })
            });
          } catch {
            if (attempt === 2) return;
            await new Promise(resolve => setTimeout(resolve, 250 * (attempt + 1)));
          }
        }
      }).catch(() => {});
    }

function flushRelayEvents(turnId = "", includeUnmatched = false) {
      const buffered = relayBufferedEvents;
      relayBufferedEvents = [];
      buffered.forEach(event => {
        const eventTurnId = relayEventTurnId(event.method, event.params);
        if (includeUnmatched || !eventTurnId || eventTurnId === turnId) queueRelayEvent(event.method, event.params);
      });
    }

function appServerEnvelope(value, event = null) {
      let message = value;
      if (typeof message === "string") {
        try { message = JSON.parse(message); } catch { return false; }
      }
      if (!message || typeof message !== "object") return false;
      if (message.type === "mcp-response") {
        const response = message.message && typeof message.message === "object" ? message.message : {};
        const id = String(response.id || "");
        const pending = appServerRequests.get(id);
        if (!pending) return false;
        event?.stopImmediatePropagation?.();
        appServerRequests.delete(id);
        clearTimeout(pending.timer);
        const elapsed = Date.now() - pending.startedAt;
        if (elapsed >= 5000) appendDiagnostic("app_server_request_slow", { request_id: id, method: pending.method, elapsed_ms: elapsed, outcome: response.error ? "error" : "success", thread_id: relayCurrentThreadId || null });
        if (response.error) pending.reject(new Error(appServerError(response.error)));
        else pending.resolve(response.result);
        return true;
      }
      if (message.type !== "mcp-notification") return false;
      const method = String(message.method || "");
      const params = message.params && typeof message.params === "object" ? message.params : {};
      if (method === "thread/started") return false;
      const threadId = normalizeSessionId(params.threadId);
      if (!threadId || (!relayThreads.has(threadId) && threadId !== relayCurrentThreadId)) return false;
      if (method === "item/autoApprovalReview/completed") {
        if (params.review?.status === "denied") {
          const denials = relayGuardianDenials.get(threadId) || [];
          const source = params.action || {};
          const commandSource = source.source === "unifiedExec" ? "unified_exec" : source.source;
          const protocol = source.protocol === "socks5Tcp" ? "socks5_tcp" : source.protocol === "socks5Udp" ? "socks5_udp" : source.protocol;
          const permissions = source.permissions || {};
          const action = source.type === "command" ? { type: "command", source: commandSource, command: source.command, cwd: source.cwd }
            : source.type === "execve" ? { type: "execve", source: commandSource, program: source.program, argv: source.argv, cwd: source.cwd }
            : source.type === "applyPatch" ? { type: "apply_patch", cwd: source.cwd, files: source.files }
            : source.type === "networkAccess" ? { type: "network_access", target: source.target, host: source.host, protocol, port: source.port }
            : source.type === "mcpToolCall" ? { type: "mcp_tool_call", server: source.server, tool_name: source.toolName, connector_id: source.connectorId ?? null, connector_name: source.connectorName ?? null, tool_title: source.toolTitle ?? null }
            : source.type === "requestPermissions" ? { type: "request_permissions", reason: source.reason ?? null, permissions: { network: permissions.network ?? null, file_system: permissions.fileSystem ?? null } }
            : { type: source.type };
          denials.push({ id: String(params.reviewId || ""), target_item_id: params.targetItemId ?? null, turn_id: String(params.turnId || ""), status: String(params.review.status || ""), risk_level: params.review.riskLevel ?? null, user_authorization: params.review.userAuthorization ?? null, rationale: params.review.rationale ?? null, decision_source: params.decisionSource ?? null, action });
          relayGuardianDenials.set(threadId, denials.slice(-20));
        }
        return true;
      }
      if (!["thread/status/changed", "turn/started", "turn/completed", "error", "item/started", "item/completed"].includes(method)) return false;
      let relayParams = params;
      if (method === "thread/status/changed") {
        const status = params.status && typeof params.status === "object" ? params.status : {};
        relayParams = { threadId, status: { type: String(status.type || ""), activeFlags: Array.isArray(status.activeFlags) ? status.activeFlags.filter(value => typeof value === "string") : [] } };
      }
      if (method === "turn/started") {
        const turn = params.turn && typeof params.turn === "object" ? params.turn : {};
        relayParams = { threadId, turn: { id: String(turn.id || ""), status: String(turn.status || "") } };
      }
      if (method === "error") {
        const turnId = normalizeSessionId(params.turnId);
        if (!turnId) return false;
        const error = params.error && typeof params.error === "object" ? params.error : {};
        const detail = codexError(error);
        relayParams = { threadId, turnId, willRetry: params.willRetry === true, error: { kind: retryKind(detail.code), code: detail.code, httpStatusCode: detail.httpStatusCode, message: String(error.message || "provider_request_failed").slice(0, 2000) } };
      }
      if (method === "item/started") {
        const turnId = normalizeSessionId(params.turnId);
        if (!turnId) return false;
        const item = params.item && typeof params.item === "object" ? params.item : {};
        relayParams = { threadId, turnId, item: { type: String(item.type || "").slice(0, 100) } };
      }
      if (method === "item/completed") {
        const item = params.item && typeof params.item === "object" ? params.item : {};
        if (item.type !== "agentMessage" || typeof item.text !== "string") return false;
        relayParams = { threadId, turnId: String(params.turnId || ""), item: { type: "agentMessage", text: item.text } };
      }
      if (method === "turn/completed") {
        const turn = params.turn && typeof params.turn === "object" ? params.turn : {};
        const error = turn.error && typeof turn.error === "object" ? turn.error : null;
        const items = Array.isArray(turn.items) ? turn.items.flatMap(item => item && typeof item === "object" && item.type === "agentMessage" && typeof item.text === "string" ? [{ type: "agentMessage", text: item.text }] : []) : [];
        relayParams = { threadId, turn: { id: String(turn.id || ""), status: String(turn.status || ""), items, error: error ? { message: String(error.message || "") } : null } };
      }
      if (relayCommandInFlight && method !== "thread/status/changed" && method !== "turn/started") relayBufferedEvents.push({ method, params: relayParams });
      else queueRelayEvent(method, relayParams);
      return true;
    }

function onAppServerMessage(event) {
      appServerEnvelope(event.data, event);
    }

function sendAppServerRequest(method, params) {
      if (typeof window.electronBridge?.sendMessageFromView !== "function") return Promise.reject(new Error("desktop_bridge_unavailable"));
      const id = relayId + ":" + (++appServerSequence);
      const startedAt = Date.now();
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          appServerRequests.delete(id);
          appendDiagnostic("app_server_request_timeout", { request_id: id, method, timeout_ms: 30000, elapsed_ms: Date.now() - startedAt, pending_requests: appServerRequests.size, command_in_flight: relayCommandInFlight, thread_id: relayCurrentThreadId || null });
          reject(new Error("desktop_bridge_timeout"));
        }, 30000);
        appServerRequests.set(id, { resolve, reject, timer, method, startedAt });
        Promise.resolve(window.electronBridge.sendMessageFromView({
          type: "mcp-request",
          hostId: "local",
          request: { id, method, params },
          source: "better-codex",
          timeoutMs: 30000
        })).catch(error => {
          const pending = appServerRequests.get(id);
          if (!pending) return;
          appServerRequests.delete(id);
          clearTimeout(timer);
          reject(error instanceof Error ? error : new Error("desktop_bridge_unavailable"));
        });
      });
    }

async function resumePersistedThread(threadId, payload = null) {
      const expected = normalizeSessionId(threadId);
      if (!expected) throw new Error("thread_id_invalid");
      const params = { threadId: expected, excludeTurns: true };
      if (payload) {
        if (payload.workspace_path) params.cwd = String(payload.workspace_path);
        if (payload.model) params.model = String(payload.model);
        if (payload.service_tier) params.serviceTier = String(payload.service_tier);
        params.approvalPolicy = String(payload.approval_policy || "on-request");
        params.approvalsReviewer = String(payload.approvals_reviewer || "auto_review");
        params.sandbox = String(payload.sandbox_mode || "workspace-write");
        params.developerInstructions = String(payload.developer_instructions || "");
      }
      const resumed = await sendAppServerRequest("thread/resume", params);
      const resumedId = normalizeSessionId(resumed?.thread?.id);
      if (resumedId !== expected) throw new Error("desktop_thread_resume_invalid");
      relayThreads.add(expected);
      return resumed;
    }

function isThreadNotFoundError(error) {
      const value = String(error instanceof Error ? error.message : error || "").toLowerCase();
      return value.includes("thread not found") || value.includes("thread_not_found");
    }

function semanticInput(payload) {
      if (!Array.isArray(payload.input)) return [{ type: "text", text: String(payload.message || "") }];
      const input = payload.input.slice(0, 33).flatMap(item => {
        if (!item || typeof item !== "object") return [];
        if (item.type === "text") return [{ type: "text", text: String(item.text || "").slice(0, 100000) }];
        if (!["skill", "mention"].includes(item.type)) return [];
        const name = String(item.name || "").trim().slice(0, 500);
        const path = String(item.path || "").trim().slice(0, 4096);
        return name && path ? [{ type: item.type, name, path }] : [];
      });
      return input.some(item => item.type === "text") ? input : [{ type: "text", text: String(payload.message || "") }, ...input];
    }

function turnStartParams(threadId, payload) {
      const params = {
        threadId,
        input: semanticInput(payload),
        approvalPolicy: String(payload.approval_policy || "on-request"),
        approvalsReviewer: String(payload.approvals_reviewer || "auto_review")
      };
      if (payload.workspace_path) params.cwd = String(payload.workspace_path);
      if (payload.model) params.model = String(payload.model);
      if (payload.effort) params.effort = String(payload.effort);
      if (payload.service_tier) params.serviceTier = String(payload.service_tier);
      return params;
    }

function heartbeatSessionRelay() {
      if (relayHeartbeatBusy || destroyed) return Promise.resolve();
      relayHeartbeatBusy = true;
      return api("/api/session-relay/poll", {
        method: "POST",
        body: JSON.stringify({
          relay_id: relayId,
          app_session_id: relayAppSessionId || relayId,
          owner: "native",
          capability: relayCapability,
          capability_error: relayCapabilityError,
          busy: true
        })
      }).catch(() => {}).finally(() => {
        relayHeartbeatBusy = false;
      });
    }

function nativeArgument(command, argument) {
      if (!argument) throw new Error("native_command_argument_required:" + command);
      return argument;
    }

async function executeNativeCommand(threadId, payload) {
      const command = String(payload.native_command || "");
      const argument = String(payload.argument || "").trim();
      const resumed = await resumePersistedThread(threadId, payload);
      if (command === "approve") {
        const denials = relayGuardianDenials.get(threadId) || [];
        const event = denials.at(-1);
        if (!event) throw new Error("native_approval_not_found");
        const response = await sendAppServerRequest("thread/approveGuardianDeniedAction", { threadId, event });
        denials.pop();
        return { thread_id: threadId, command, approved: true, response };
      }
      if (command === "fast") {
        const value = argument.toLowerCase();
        if (value && !["on", "off", "fast", "default", "true", "false", "1", "0"].includes(value)) throw new Error("native_fast_value_invalid");
        const enabled = value ? ["on", "fast", "true", "1"].includes(value) : String(resumed?.serviceTier || "default") !== "fast";
        await sendAppServerRequest("thread/settings/update", { threadId, serviceTier: enabled ? "fast" : null });
        return { thread_id: threadId, command, service_tier: enabled ? "fast" : "default" };
      }
      if (command === "feedback") {
        const reason = nativeArgument(command, argument);
        const response = await sendAppServerRequest("feedback/upload", { classification: "bug", reason, threadId, includeLogs: false });
        return { thread_id: threadId, command, uploaded: true, response };
      }
      if (command === "fork") {
        const response = await sendAppServerRequest("thread/fork", { threadId, cwd: String(payload.workspace_path || "") || null, excludeTurns: true });
        const forkedThreadId = normalizeSessionId(response?.thread?.id);
        if (!forkedThreadId) throw new Error("native_fork_invalid");
        if (argument) await sendAppServerRequest("thread/name/set", { threadId: forkedThreadId, name: argument.slice(0, 200) });
        relayThreads.add(forkedThreadId);
        return { thread_id: forkedThreadId, source_thread_id: threadId, command, rebind_thread: true };
      }
      if (command === "goal") {
        const value = argument.toLowerCase();
        if (!argument) return { thread_id: threadId, command, ...(await sendAppServerRequest("thread/goal/get", { threadId })) };
        if (["clear", "off", "none"].includes(value)) {
          await sendAppServerRequest("thread/goal/clear", { threadId });
          return { thread_id: threadId, command, goal: null };
        }
        return { thread_id: threadId, command, ...(await sendAppServerRequest("thread/goal/set", { threadId, objective: argument, status: "active" })) };
      }
      if (command === "init") {
        const input = [{ type: "text", text: "Create an AGENTS.md file that serves as a concise contributor guide for this repository. Inspect the repository first. Include project structure, build and validation commands, coding conventions, and commit guidance that are actually supported by the repository. Do not overwrite an existing AGENTS.md; if one exists, report that clearly instead." }];
        const turn = await sendAppServerRequest("turn/start", turnStartParams(threadId, { ...payload, input }));
        const turnId = normalizeSessionId(turn?.turn?.id);
        if (!turnId) throw new Error("desktop_turn_start_invalid");
        return { thread_id: threadId, turn_id: turnId, command };
      }
      if (command === "mcp") {
        const response = await sendAppServerRequest("mcpServerStatus/list", { threadId, cursor: null, limit: 100, detail: "toolsAndAuthOnly" });
        const servers = (Array.isArray(response?.data) ? response.data : []).map(server => ({ name: String(server?.name || ""), auth_status: String(server?.authStatus || ""), tool_count: server?.tools && typeof server.tools === "object" ? Object.keys(server.tools).length : 0, resource_count: Array.isArray(server?.resources) ? server.resources.length : 0 }));
        return { thread_id: threadId, command, servers, next_cursor: response?.nextCursor ?? null };
      }
      if (command === "memories") {
        const value = nativeArgument(command, argument).toLowerCase();
        if (!["on", "off", "enabled", "disabled"].includes(value)) throw new Error("native_memories_value_invalid");
        const mode = ["on", "enabled"].includes(value) ? "enabled" : "disabled";
        await sendAppServerRequest("thread/memoryMode/set", { threadId, mode });
        return { thread_id: threadId, command, memory_mode: mode };
      }
      if (command === "model") {
        const model = nativeArgument(command, argument);
        await sendAppServerRequest("thread/settings/update", { threadId, model });
        return { thread_id: threadId, command, model };
      }
      if (command === "personality") {
        const personality = nativeArgument(command, argument).toLowerCase();
        if (!["none", "friendly", "pragmatic"].includes(personality)) throw new Error("native_personality_value_invalid");
        await sendAppServerRequest("thread/settings/update", { threadId, personality });
        return { thread_id: threadId, command, personality };
      }
      if (command === "plan") {
        const value = argument.toLowerCase();
        if (value && !["on", "off", "plan", "default"].includes(value)) throw new Error("native_plan_value_invalid");
        const mode = ["off", "default"].includes(value) ? "default" : "plan";
        const presets = await sendAppServerRequest("collaborationMode/list", {});
        const preset = (Array.isArray(presets?.data) ? presets.data : []).find(item => item?.mode === mode);
        if (!preset) throw new Error("native_plan_preset_unavailable");
        await sendAppServerRequest("thread/settings/update", { threadId, collaborationMode: { mode, settings: { model: preset.model || resumed?.model, reasoning_effort: preset.reasoning_effort ?? resumed?.reasoningEffort, developer_instructions: null } } });
        return { thread_id: threadId, command, collaboration_mode: mode };
      }
      if (command === "project") {
        const projectId = nativeArgument(command, argument);
        await sendAppServerRequest("thread/metadata/update", { threadId, projectId: ["none", "clear"].includes(projectId) ? "" : projectId });
        return { thread_id: threadId, command, project_id: ["none", "clear"].includes(projectId) ? null : projectId };
      }
      if (command === "reasoning") {
        const effort = nativeArgument(command, argument);
        await sendAppServerRequest("thread/settings/update", { threadId, effort });
        return { thread_id: threadId, command, reasoning_effort: effort };
      }
      throw new Error("native_command_invalid");
    }

async function executeSessionCommand(command) {
      const payload = command?.payload && typeof command.payload === "object" ? command.payload : {};
      let threadId = normalizeSessionId(command?.thread_id);
      let turnId = normalizeSessionId(command?.turn_id);
      const heartbeat = setInterval(() => void heartbeatSessionRelay(), 2000);
      relayCommandInFlight = true;
      relayBufferedEvents = [];
      try {
        let completion = {};
        if (command.kind === "bind" || command.kind === "start") {
          const params = {
            approvalPolicy: String(payload.approval_policy || "on-request"),
            approvalsReviewer: String(payload.approvals_reviewer || "auto_review"),
            sandbox: String(payload.sandbox_mode || "workspace-write")
          };
          if (payload.workspace_path) params.cwd = String(payload.workspace_path);
          if (payload.model) params.model = String(payload.model);
          if (payload.service_tier) params.serviceTier = String(payload.service_tier);
          if (payload.developer_instructions) params.developerInstructions = String(payload.developer_instructions);
          const started = await sendAppServerRequest("thread/start", params);
          threadId = normalizeSessionId(started?.thread?.id);
          if (!threadId) throw new Error("desktop_thread_start_invalid");
          relayCurrentThreadId = threadId;
          await api("/api/session-relay/commands/" + encodeURIComponent(command.id) + "/checkpoint", {
            method: "POST",
            body: JSON.stringify({ relay_id: relayId, result: { thread_id: threadId } })
          });
          if (command.kind === "start") {
            const turn = payload.semantic_command === "review"
              ? await sendAppServerRequest("review/start", { threadId, target: { type: "uncommittedChanges" }, delivery: "inline" })
              : await sendAppServerRequest("turn/start", turnStartParams(threadId, payload));
            turnId = normalizeSessionId(turn?.turn?.id);
            if (!turnId) throw new Error("desktop_turn_start_invalid");
            await api("/api/session-relay/commands/" + encodeURIComponent(command.id) + "/checkpoint", {
              method: "POST",
              body: JSON.stringify({ relay_id: relayId, result: { thread_id: threadId, turn_id: turnId } })
            });
          }
        } else if (command.kind === "turn") {
          if (!threadId) throw new Error("session_thread_invalid");
          relayCurrentThreadId = threadId;
          await resumePersistedThread(threadId, payload);
          let turn;
          try {
            turn = await sendAppServerRequest("turn/start", turnStartParams(threadId, payload));
          } catch (error) {
            if (!isThreadNotFoundError(error)) throw error;
            await resumePersistedThread(threadId, payload);
            turn = await sendAppServerRequest("turn/start", turnStartParams(threadId, payload));
          }
          turnId = normalizeSessionId(turn?.turn?.id);
          if (!turnId) throw new Error("desktop_turn_start_invalid");
          await api("/api/session-relay/commands/" + encodeURIComponent(command.id) + "/checkpoint", {
            method: "POST",
            body: JSON.stringify({ relay_id: relayId, result: { thread_id: threadId, turn_id: turnId } })
          });
        } else if (command.kind === "review") {
          if (!threadId) throw new Error("session_thread_invalid");
          relayCurrentThreadId = threadId;
          await resumePersistedThread(threadId, payload);
          const review = await sendAppServerRequest("review/start", { threadId, target: { type: "uncommittedChanges" }, delivery: "inline" });
          turnId = normalizeSessionId(review?.turn?.id);
          if (!turnId) throw new Error("desktop_turn_start_invalid");
          await api("/api/session-relay/commands/" + encodeURIComponent(command.id) + "/checkpoint", {
            method: "POST",
            body: JSON.stringify({ relay_id: relayId, result: { thread_id: threadId, turn_id: turnId } })
          });
        } else if (command.kind === "compact") {
          if (!threadId) throw new Error("session_thread_invalid");
          relayCurrentThreadId = threadId;
          await resumePersistedThread(threadId, payload);
          await sendAppServerRequest("thread/compact/start", { threadId });
        } else if (command.kind === "rename") {
          if (!threadId) throw new Error("session_thread_invalid");
          const name = String(payload.title || "").trim().slice(0, 200);
          if (!name) throw new Error("thread_name_required");
          relayCurrentThreadId = threadId;
          await sendAppServerRequest("thread/name/set", { threadId, name });
          completion = { name };
          appendDiagnostic("thread_name_updated", { command_id: command.id, issue_id: command.issue_id, thread_id: threadId, title_length: name.length });
        } else if (command.kind === "native") {
          if (!threadId) throw new Error("session_thread_invalid");
          relayCurrentThreadId = threadId;
          completion = await executeNativeCommand(threadId, payload);
          threadId = normalizeSessionId(completion.thread_id) || threadId;
          turnId = normalizeSessionId(completion.turn_id) || turnId;
        } else if (command.kind === "steer") {
          if (!threadId || !turnId) throw new Error("session_turn_invalid");
          relayCurrentThreadId = threadId;
          const steered = await sendAppServerRequest("turn/steer", {
            threadId,
            expectedTurnId: turnId,
            input: semanticInput(payload)
          });
          turnId = normalizeSessionId(steered?.turnId) || turnId;
        } else if (command.kind === "interrupt") {
          if (!threadId || !turnId) throw new Error("session_turn_invalid");
          relayCurrentThreadId = threadId;
          await sendAppServerRequest("turn/interrupt", { threadId, turnId });
        } else {
          throw new Error("session_command_invalid");
        }
        await api("/api/session-relay/commands/" + encodeURIComponent(command.id) + "/complete", {
          method: "POST",
          body: JSON.stringify({ relay_id: relayId, result: { thread_id: threadId, turn_id: turnId, ...completion } })
        });
        relayCommandInFlight = false;
        flushRelayEvents(turnId, command.kind === "steer" || command.kind === "interrupt" || command.kind === "compact");
        if (threadId) relayThreads.add(threadId);
      } catch (error) {
        const commandError = error instanceof Error ? error.message : "desktop_bridge_request_failed";
        if (command.kind === "rename") appendDiagnostic("thread_name_failed", { command_id: command.id, issue_id: command.issue_id, thread_id: threadId || null, error: commandError });
        if (threadId && turnId && commandError === "session_command_not_claimed") {
          await sendAppServerRequest("turn/interrupt", { threadId, turnId }).catch(() => {});
        }
        const failed = await api("/api/session-relay/commands/" + encodeURIComponent(command.id) + "/fail", {
          method: "POST",
          body: JSON.stringify({ relay_id: relayId, error: commandError, thread_id: threadId, turn_id: turnId })
        }).catch(() => {});
        relayCommandInFlight = false;
        flushRelayEvents("", true);
        if (commandError === "desktop_bridge_unavailable" || commandError === "desktop_bridge_timeout") {
          relayCapability = "failed";
          relayCapabilityError = commandError;
          relayCapabilityCheckedAt = Date.now();
        }
        if (failed && threadId) relayThreads.add(threadId);
      } finally {
        clearInterval(heartbeat);
        if (relayCommandInFlight) {
          relayCommandInFlight = false;
          flushRelayEvents("", true);
        }
        relayCurrentThreadId = "";
      }
    }

async function resolveRelayAppSessionId() {
      if (relayAppSessionId) return relayAppSessionId;
      try {
        const value = await window.electronBridge?.getAppSessionId?.();
        relayAppSessionId = typeof value === "string" ? value : typeof value?.appSessionId === "string" ? value.appSessionId : relayId;
      } catch {
        relayAppSessionId = relayId;
      }
      return relayAppSessionId;
    }

async function reconcileRelayTurns(values) {
      await Promise.all(values.map(async value => {
        const threadId = normalizeSessionId(value?.thread_id);
        const turnId = normalizeSessionId(value?.turn_id);
        if (!threadId || !turnId) return;
        try {
          let summary = await sendAppServerRequest("thread/read", { threadId, includeTurns: false });
          let status = summary?.thread?.status && typeof summary.thread.status === "object" ? summary.thread.status : {};
          let statusType = String(status.type || "");
          if (statusType === "notLoaded") {
            await resumePersistedThread(threadId);
            summary = await sendAppServerRequest("thread/read", { threadId, includeTurns: false });
            status = summary?.thread?.status && typeof summary.thread.status === "object" ? summary.thread.status : {};
            statusType = String(status.type || "");
          }
          if (statusType === "active") {
            queueRelayEvent("thread/status/changed", {
              threadId,
              status: {
                type: statusType,
                activeFlags: Array.isArray(status.activeFlags) ? status.activeFlags.filter(item => typeof item === "string") : []
              }
            });
            return;
          }
          if (statusType !== "idle") return;
          const detail = await sendAppServerRequest("thread/read", { threadId, includeTurns: true });
          const turns = Array.isArray(detail?.thread?.turns) ? detail.thread.turns : [];
          const turn = turns.find(item => normalizeSessionId(item?.id) === turnId);
          if (!turn || !["completed", "interrupted", "failed"].includes(String(turn.status || ""))) return;
          const items = Array.isArray(turn.items) ? turn.items.flatMap(item => item && typeof item === "object" && item.type === "agentMessage" && typeof item.text === "string" ? [{ type: "agentMessage", text: item.text }] : []) : [];
          const error = turn.error && typeof turn.error === "object" ? { message: String(turn.error.message || "") } : null;
          queueRelayEvent("turn/completed", { threadId, turn: { id: turnId, status: String(turn.status), items, error } });
        } catch {}
      }));
    }

async function resolveDesktopCatalogServices() {
      if (desktopCatalogServices) return desktopCatalogServices;
      const entry = Array.from(document.querySelectorAll('link[rel="modulepreload"][href]')).find(link => /\/app-initial-[^/]+\.js$/.test(new URL(link.href).pathname));
      if (!entry) throw new Error(document.readyState === "loading" ? "desktop_catalog_loading" : "desktop_catalog_module_unavailable");
      const exports = await import(entry.href);
      desktopCatalogServices = Object.values(exports).find(value => value && typeof value === "object" && typeof value.localThreadCatalog?.notifyThread === "function");
      if (!desktopCatalogServices) throw new Error(document.readyState === "loading" ? "desktop_catalog_loading" : "desktop_catalog_service_unavailable");
      return desktopCatalogServices;
    }

async function syncThreadCatalogAction(action) {
      let error = "";
      try {
        await resolveDesktopCatalogServices();
        await desktopCatalogServices.localThreadCatalog.notifyThread({ hostId: "local", threadId: action.thread_id }, action.action === "unarchive" ? "upsert" : "remove");
        window.dispatchEvent(new MessageEvent("message", { data: {
          type: "mcp-notification", hostId: "local",
          method: action.action === "delete" ? "thread/deleted" : action.action === "archive" ? "thread/archived" : "thread/unarchived",
          params: { threadId: action.thread_id }
        } }));
        appendDiagnostic("thread_catalog_synced", { thread_id: action.thread_id, event_id: action.event_id, action: action.action });
      } catch (failure) {
        error = typeof failure?.message === "string" ? failure.message : String(failure);
        lastError = error;
        appendDiagnostic("thread_catalog_sync_failed", { thread_id: action.thread_id, event_id: action.event_id, action: action.action, error });
      }
      await api("/api/session-relay/catalog-ack", { method: "POST", body: JSON.stringify({ relay_id: relayId, thread_id: action.thread_id, event_id: action.event_id, error }) });
    }

async function pollSessionRelay() {
      if (relayBusy || destroyed) return;
      relayBusy = true;
      try {
        if (relayCapability === "failed" && Date.now() - relayCapabilityCheckedAt > 10000) relayCapability = "unknown";
        if (relayCapability === "unknown" && Date.now() - relayCapabilityCheckedAt >= 1000) {
          relayCapabilityCheckedAt = Date.now();
          try {
            await sendAppServerRequest("thread/list", { limit: 1 });
            await resolveDesktopCatalogServices();
            relayCapability = "ready";
            relayCapabilityError = "";
          } catch (error) {
            relayCapabilityError = error instanceof Error ? error.message : "desktop_bridge_unavailable";
            relayCapability = relayCapabilityError === "desktop_catalog_loading" ? "unknown" : "failed";
          }
        }
        const result = await api("/api/session-relay/poll", {
          method: "POST",
          body: JSON.stringify({
            relay_id: relayId,
            app_session_id: await resolveRelayAppSessionId(),
            owner: "native",
            capability: relayCapability,
            capability_error: relayCapabilityError
          })
        });
        runtimeAuthenticated=true;
        lastError="";
        relayThreads.clear();
        (Array.isArray(result?.thread_ids) ? result.thread_ids : []).forEach(value => {
          const threadId = normalizeSessionId(value);
          if (threadId) relayThreads.add(threadId);
        });
        if (!result?.leader) return;
        if (relayCapability !== "ready") return;
        for (const action of result.catalog_actions || []) await syncThreadCatalogAction(action);
        if (result.command) {
          await executeSessionCommand(result.command);
          return;
        }
        const activeTurns = Array.isArray(result?.active_turns) ? result.active_turns : [];
        if (activeTurns.length && Date.now() - relayTurnProbeAt >= 5000) {
          relayTurnProbeAt = Date.now();
          await reconcileRelayTurns(activeTurns);
        }
      } catch(error) {
        runtimeAuthenticated=false;
        lastError=error instanceof Error ? error.message : "desktop_bridge_poll_failed";
        appendDiagnostic("native_proxy_poll_failed",{error:lastError,capability:relayCapability});
      } finally {
        relayBusy = false;
      }
    }

function pulseSessionRelay() {
      if (destroyed) return false;
      if (relayBusy) {
        if (relayCapability === "ready") void heartbeatSessionRelay();
        return true;
      }
      void pollSessionRelay();
      return true;
    }

function startSessionRelay() {
      if (relayTimer !== null) return;
      pulseSessionRelay();
      relayTimer = setInterval(pulseSessionRelay, 1000);
    }
  function onHostMessageFromView(event){appServerEnvelope(event.detail);}
  async function boundIssue(threadId) {
    try { return await api('/api/issues/from-thread?thread_id='+encodeURIComponent(threadId)); }
    catch (error) { if(error?.message === 'issue_not_found') return null; throw error; }
  }
  let nativeOpenBypass='';
  async function openThread(threadId) {
    const expected=normalizeSessionId(threadId);if(!expected)throw new Error('thread_id_invalid');
    const issue=await boundIssue(expected);
    if(issue&&!issue.session_handoff_at)await api('/api/issues/'+encodeURIComponent(issue.id)+'/session-handoff',{method:'POST',body:JSON.stringify({thread_id:expected})});
    await resumePersistedThread(expected);
    const deadline=Date.now()+10000;
    let requested=false;
    while(Date.now()<deadline){
      const route=location.pathname?.match(/\/local\/([^/?#]+)/)?.[1];
      if(route&&normalizeSessionId(decodeURIComponent(route))===expected)return {opened:true,via:'native-route'};
      const rows=Array.from(document.querySelectorAll(config.selectors.threadRow));
      const active=rows.find(row=>row.getAttribute(config.attributes.threadActive)==='true');
      if(active&&normalizeSessionId(active.getAttribute(config.attributes.threadId))===expected)return {opened:true,via:'native-sidebar'};
      if(!requested){
        requested=true;
        const row=rows.find(row=>normalizeSessionId(row.getAttribute(config.attributes.threadId))===expected);
        if(row){nativeOpenBypass=expected;row.click();}
        else window.postMessage({type:config.navigation.messageType,path:config.navigation.threadRoutePrefix+encodeURIComponent(expected)},location.origin);
      }
      await new Promise(resolve=>setTimeout(resolve,100));
    }
    throw new Error('thread_open_timeout');
  }
  function onNativeClick(event) {
    const row=event.target?.closest?.(config.selectors.threadRow);if(!row)return;
    const threadId=normalizeSessionId(row.getAttribute(config.attributes.threadId));
    if(!threadId||nativeOpenBypass===threadId){nativeOpenBypass='';return;}
    event.preventDefault();event.stopImmediatePropagation();
    void boundIssue(threadId).then(issue=>{
      if(!issue||issue.session_handoff_at){nativeOpenBypass=threadId;row.click();return;}
      return openThread(threadId);
    }).catch(error=>{lastError=error.message;appendDiagnostic('native_thread_handoff_failed',{thread_id:threadId,error:lastError});});
  }
  function destroy(){if(destroyed)return;destroyed=true;clearInterval(relayTimer);window.removeEventListener('message',onAppServerMessage,true);window.removeEventListener('codex-message-from-view',onHostMessageFromView,true);document.removeEventListener('click',onNativeClick,true);for(const pending of [...bridgeRequests.values(),...appServerRequests.values()]){clearTimeout(pending.timer);pending.reject(new Error('desktop_bridge_destroyed'));}bridgeRequests.clear();appServerRequests.clear();delete window.__betterCodexBridgeResolve;delete window.__betterCodexDesktopBridge__;}
  window.__betterCodexDesktopBridge__={version:VERSION,bundleChecksum:config.bundleChecksum,profile:config.profile,endpoint:config.baseUrl,pulse:pulseSessionRelay,refresh:pulseSessionRelay,ready:()=>runtimeAuthenticated&&relayCapability==='ready'&&!lastError,bootstrapError:()=>lastError||relayCapabilityError||null,openThread,destroy};
  window.addEventListener('message',onAppServerMessage,true);window.addEventListener('codex-message-from-view',onHostMessageFromView,true);document.addEventListener('click',onNativeClick,true);startSessionRelay();
  return {installed:true,reused:false};
}
