export type CommandReceipt = {
  status: string;
  queued?: boolean;
  error?: string | null;
  payload?: unknown;
};

type Listener = { resolve: (receipt: CommandReceipt) => void; reject: (error: Error) => void };
type Observation = { attempt: number; timer: ReturnType<typeof setTimeout> | null; listeners: Set<Listener> };

export function createCommandObserver(options: {
  read: (id: string) => Promise<CommandReceipt>;
  retryable: (error: unknown) => boolean;
  diagnostic: (event: string, fields: Record<string, unknown>) => void;
}) {
  const observations = new Map<string, Observation>();
  const delays = [300, 700, 1500, 3000, 5000, 10000, 30000];
  let destroyed = false;

  function remove(id: string, observation: Observation) {
    if (observation.timer !== null) clearTimeout(observation.timer);
    if (observations.get(id) === observation) observations.delete(id);
  }

  function schedule(id: string, observation: Observation) {
    observation.timer = setTimeout(async () => {
      observation.timer = null;
      if (destroyed || observations.get(id) !== observation) return;
      let receipt: CommandReceipt;
      try {
        receipt = await options.read(id);
      } catch (error) {
        if (destroyed || observations.get(id) !== observation) return;
        if (options.retryable(error)) {
          observation.attempt += 1;
          schedule(id, observation);
          return;
        }
        remove(id, observation);
        const failure = error instanceof Error ? error : new Error(String(error));
        for (const listener of observation.listeners) listener.reject(failure);
        return;
      }
      if (destroyed || observations.get(id) !== observation) return;
      if (["pending", "dispatched", "processing"].includes(receipt.status) || receipt.queued === true) {
        observation.attempt += 1;
        schedule(id, observation);
        return;
      }
      remove(id, observation);
      options.diagnostic("command_observed", { command_id: id, status: receipt.status, attempt_count: observation.attempt + 1 });
      for (const listener of observation.listeners) listener.resolve(receipt);
    }, delays[Math.min(observation.attempt, delays.length - 1)]);
  }

  function subscribe(id: string, listener: Listener) {
    if (destroyed) throw new Error("command_observer_destroyed");
    let observation = observations.get(id);
    if (!observation) {
      observation = { attempt: 0, timer: null, listeners: new Set() };
      observations.set(id, observation);
      schedule(id, observation);
    }
    observation.listeners.add(listener);
    const current = observation;
    return () => {
      current.listeners.delete(listener);
      if (!current.listeners.size) remove(id, current);
    };
  }

  return {
    watch: subscribe,
    wait(id: string, timeoutMs: number) {
      if (destroyed) return Promise.reject(new Error("command_observer_destroyed"));
      return new Promise<CommandReceipt>((resolve, reject) => {
        const timeout = setTimeout(() => {
          unsubscribe();
          reject(new Error("remote_command_timeout"));
        }, timeoutMs);
        const unsubscribe = subscribe(id, {
          resolve(receipt) { clearTimeout(timeout); unsubscribe(); resolve(receipt); },
          reject(error) { clearTimeout(timeout); unsubscribe(); reject(error); },
        });
      });
    },
    destroy() {
      destroyed = true;
      for (const [id, observation] of observations) {
        remove(id, observation);
        for (const listener of observation.listeners) listener.reject(new Error("command_observer_destroyed"));
      }
    },
  };
}
