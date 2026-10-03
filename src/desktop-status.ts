import { readRuntimeState, type RuntimeState } from "./runtime-state.js";

export type DesktopStatus = {
  schemaVersion: 1;
  runtime: "ready" | "degraded" | "stopped" | "unavailable";
  desktop: "ready" | "waiting_window" | "disabled" | "failed" | "unknown";
  version: string | null;
  instanceId: string | null;
  pid: number | null;
  error: string | null;
  checkedAt: string;
};

/** A read-only client of Runtime readiness; never opens the business database. */
export async function desktopStatus(
  state: RuntimeState | null = readRuntimeState(),
  enabled = process.env.BETTER_CODEX_DISABLE_DESKTOP_BRIDGE !== "1",
  request: typeof fetch = fetch,
): Promise<DesktopStatus> {
  const snapshot: DesktopStatus = {
    schemaVersion: 1, runtime: state ? "unavailable" : "stopped",
    desktop: enabled ? "unknown" : "disabled", version: state?.version ?? null,
    instanceId: state?.instanceId ?? null, pid: state?.pid ?? null,
    error: null, checkedAt: new Date().toISOString(),
  };
  if (!state) return snapshot;
  try {
    const response = await request(`http://127.0.0.1:${state.port}/readyz`, { signal: AbortSignal.timeout(4000), redirect: "error" });
    const body = await response.json() as Record<string, any>;
    if (body.instanceId !== state.instanceId || body.pid !== state.pid || body.generation !== state.generation || body.version !== state.version) {
      throw new Error("runtime_identity_mismatch");
    }
    const desktop = body.desktop ?? body.compatibility;
    snapshot.desktop = !enabled ? "disabled" : ["ready", "waiting_window", "disabled", "failed"].includes(desktop?.state) ? desktop.state : "unknown";
    snapshot.runtime = response.ok && body.ok === true && body.runtime_identity?.ok === true ? "ready" : "degraded";
    if (snapshot.runtime !== "ready") {
      snapshot.error = body.runtime_identity?.ok !== true ? "runtime_identity_not_ready"
        : body.storage?.ok === false ? "storage_not_ready"
        : body.database?.ok === false ? "database_not_ready"
        : body.session_host?.required && !body.session_host.connected ? "session_host_not_ready" : "runtime_not_ready";
    }
  } catch (error) {
    snapshot.error = error instanceof Error ? error.message : "runtime_unavailable";
  }
  return snapshot;
}
