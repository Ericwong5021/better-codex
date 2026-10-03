import type { ExternalObservation, ExternalObservationMessage } from "../../../external-observations.js";

/** Presentation only: preserve every record and its order, folding adjacent identical bodies. */
export function externalMessageGroups(messages: readonly ExternalObservationMessage[]) {
  const groups: { key: string; messages: ExternalObservationMessage[] }[] = [];
  for (const message of messages) {
    const last = groups.at(-1);
    const previous = last?.messages.at(-1);
    if (previous && previous.role === message.role && previous.text === message.text && previous.sequence + 1 === message.sequence) {
      last!.messages.push(message);
    } else {
      groups.push({ key: message.item_id, messages: [message] });
    }
  }
  return groups;
}

export function externalObservationPresentation(record: ExternalObservation, connection: { connected: boolean; receivedAt: number }, now = Date.now()) {
  const fresh = connection.connected && now - connection.receivedAt <= 30_000 && record.freshness === "fresh"
    && Number.isFinite(Date.parse(record.reported_at)) && now - Date.parse(record.reported_at) <= 30_000;
  const execution = fresh ? record.execution_state : "unknown";
  const resultReady = record.task_result === "reported_complete";
  const status = resultReady ? "in_review" : execution === "running" ? "in_progress"
    : execution === "queued" ? "todo" : ["waiting_user", "waiting_approval", "blocked", "failed", "cancelled"].includes(execution) ? "blocked" : "unknown";
  const labels = { queued: "待执行 · 自报", running: "执行中 · 自报", waiting_user: "等待用户 · 自报", waiting_approval: "等待审批 · 自报", blocked: "已阻塞 · 自报", failed: "执行失败 · 自报", cancelled: "已取消 · 自报", idle: "空闲 · 自报", unknown: "当前状态未知" };
  return {
    status, execution, fresh, resultReady,
    statusLabel: resultReady ? "自报完成 · 待验收" : labels[execution],
    cardStatusLabel: resultReady ? "待验收" : labels[execution].replace(" · 自报", ""),
    sourceLabel: record.creator.name ? `${record.creator.name} · 自报` : "外部任务 · 自报",
    freshnessLabel: fresh ? "同步正常" : "同步过期或中断 · 当前状态未知",
  };
}

export function externalObservationCard(record: ExternalObservation, connection: { connected: boolean; receivedAt: number }, now = Date.now()) {
  const presentation = externalObservationPresentation(record, connection, now);
  return {
    id: record.id, identifier: `EXT-${record.id.slice(-6).toUpperCase()}`, title: record.title,
    description: record.description, project_id: record.project_id, status: presentation.status,
    priority: "none", labels: [], updated_at: record.updated_at,
    agent_enabled: false, user_assigned: false, creator_user_id: null,
    run_thread_id: null, thread_id: null, session_owned: false,
    external_observation: record, external_presentation: presentation,
  };
}

export function externalMatchesSearch(record: ExternalObservation, search: string) {
  const query = search.trim().toLocaleLowerCase();
  return !query || [record.title, record.description, record.source_task_id || "", record.thread_id || "", record.creator.name || ""].some(value => value.toLocaleLowerCase().includes(query));
}
