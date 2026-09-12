type UpdateState = Record<string, any>;
type PendingUpdate = { key: string; target: string; id?: string };

export function updateOutcome(update: UpdateState) {
  const status = String(update.operation?.status || "");
  if (status === "COMPLETED") return "completed";
  if (["ROLLED_BACK", "FAILED"].includes(status) && (update.recovery?.status === "restored" || update.recovery === "restored")) return "rolled_back";
  if (update.recovery?.status === "failed" || update.recovery === "failed") return "recovery_failed";
  if (status === "ROLLING_BACK") return "recovering";
  if (status === "FAILED") return "failed";
  if (update.status === "unknown") return "unknown";
  if (status && !["COMPLETED", "ROLLED_BACK", "FAILED"].includes(status)) return "updating";
  return update.status === "available" ? "available" : "idle";
}

export function createUpdateObserver(options: {
  storage: Storage;
  namespace: string;
  request: (suffix: string, options?: Record<string, any>) => Promise<UpdateState>;
  stopped: () => boolean;
  transient: (error: unknown) => boolean;
  diagnostic?: (event: Record<string, unknown>) => void;
}) {
  const key = `${options.namespace}-request`;
  let watching: Promise<UpdateState | null> | null = null;
  let changed: ((state: UpdateState) => void) | null = null;
  const pending = (): PendingUpdate | null => {
    const value = options.storage.getItem(key);
    return value ? JSON.parse(value) : null;
  };
  const persist = (value: PendingUpdate) => options.storage.setItem(key, JSON.stringify(value));
  const accept = async (value: PendingUpdate) => {
    const response = await options.request("/install", { method: "POST", body: JSON.stringify({ idempotency_key: value.key, ...(value.target ? { target_version: value.target } : {}) }), timeoutMs: 45_000 });
    if (response.accepted !== true || typeof response.update_id !== "string") throw new Error("update_not_accepted");
    value.id = response.update_id;
    persist(value);
  };
  return {
    pending,
    adopt(update: UpdateState) {
      if (!pending() && update.operation?.id && ["updating", "recovering"].includes(updateOutcome(update))) persist({ id: update.operation.id, key: update.operation.id, target: update.operation.target_core_version || "" });
    },
    async start(target = "") {
      let value = pending();
      if (!value) {
        value = { key: crypto.randomUUID(), target };
        persist(value);
      }
      if (!value.id) {
        try { await accept(value); }
        catch (error) { if (!options.transient(error)) throw error; }
      }
    },
    observe(onState: (state: UpdateState) => void) {
      changed = onState;
      if (watching) return watching;
      const work = (async () => {
        const deadline = Date.now() + 30 * 60 * 1000;
        let last: UpdateState = {};
        let submissions = 0;
        let observed = pending();
        let phase = "";
        while (!options.stopped() && Date.now() < deadline) {
          const stored = pending();
          if (!observed || stored?.key === observed.key) observed = stored || observed;
          const value = observed;
          if (!value) return null;
          try {
            last = await options.request(value.id ? "?update_id=" + encodeURIComponent(value.id) : "?idempotency_key=" + encodeURIComponent(value.key), { passive: true });
            if (last.operation?.id) { value.id = last.operation.id; if (pending()?.key === value.key) persist(value); }
            if (phase !== last.operation?.status) {
              phase = last.operation?.status || "";
              options.diagnostic?.({ update_id: value.id, phase, shared_request_present: Boolean(stored), recovery: last.recovery });
            }
            changed?.(last);
            if (["completed", "rolled_back", "failed", "recovery_failed"].includes(updateOutcome(last))) {
              if (pending()?.key === value.key) options.storage.removeItem(key);
              return last;
            }
          } catch (error) {
            if (!value.id && String(error).includes("update_operation_not_found") && submissions < 3) {
              submissions += 1;
              try { await accept(value); } catch (failure) { if (!options.transient(failure)) throw failure; }
            } else if (!options.transient(error)) {
              changed?.({ ...last, status: "unknown", operation: null, error: String(error), requires_action: true });
              return null;
            }
          }
          await new Promise(resolve => setTimeout(resolve, 700));
        }
        if (!options.stopped()) changed?.({ ...last, status: "unknown", operation: null });
        return null;
      })().finally(() => { watching = null; });
      watching = work;
      return work;
    },
  };
}
