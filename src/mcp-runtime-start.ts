import { execFile, type ExecFileOptionsWithStringEncoding } from "node:child_process";
import { betterCodexHome, betterCodexProfile } from "./config.js";
import { installationCommand } from "./launch-integration.js";
import { readRuntimeState, type RuntimeState } from "./runtime-state.js";

type StartResult = { ready: true };
type Execute = (file: string, args: string[], options: ExecFileOptionsWithStringEncoding) => Promise<{ stdout: string; stderr: string }>;
export type McpRuntimeStartDependencies = {
  installationCommand?: () => string[];
  execute?: Execute;
  readRuntimeState?: () => RuntimeState | null;
  environment?: NodeJS.ProcessEnv;
  profile?: string;
  home?: string;
  diagnostic?: (fields: Record<string, unknown>) => void;
};

const execute: Execute = (file, args, options) => new Promise((resolve, reject) => {
  execFile(file, args, options, (error, stdout, stderr) => {
    if (!error) return resolve({ stdout, stderr });
    const detail = stderr.trim().split("\n").filter(line => line && !line.startsWith("BETTER_CODEX_DIAGNOSTIC ")).at(-1);
    reject(new Error(error.killed ? "mcp_runtime_start_timeout" : detail || `mcp_runtime_start_failed:${error.code || "unknown"}`, { cause: error }));
  });
});

/** Explicit App action only. The stable launcher retains ownership of startup and readiness checks. */
export function createMcpRuntimeStarter(dependencies: McpRuntimeStartDependencies = {}): () => Promise<StartResult> {
  let pending: Promise<StartResult> | null = null;
  const environment = dependencies.environment ?? process.env;
  const profile = dependencies.profile ?? betterCodexProfile;
  const home = dependencies.home ?? betterCodexHome;
  const report = (error: unknown, phase: string, outcome: string) => {
    let state: RuntimeState | null = null;
    if (phase !== "admission") try { state = (dependencies.readRuntimeState ?? readRuntimeState)(); } catch {}
    const fields = {
      timestamp: new Date().toISOString(), scope: "mcp_runtime", event: "start_failed", profile, home,
      runtime_instance_id: state?.instanceId ?? null, runtime_pid: state?.pid ?? null,
      runtime_generation: state?.generation ?? null, phase, outcome,
      error: error instanceof Error ? error.message : String(error),
    };
    if (dependencies.diagnostic) dependencies.diagnostic(fields);
    else console.error(`BETTER_CODEX_DIAGNOSTIC ${JSON.stringify(fields)}`);
  };
  const start = async (): Promise<StartResult> => {
    let phase = "launch";
    try {
      const [file, ...args] = (dependencies.installationCommand ?? installationCommand)();
      if (!file) throw new Error("installation_base_entrypoint_required");
      const result = await (dependencies.execute ?? execute)(file, [...args, "desktop", "start"], {
        encoding: "utf8", timeout: 75_000, maxBuffer: 256 * 1024, windowsHide: true, shell: false,
        env: { ...environment, BETTER_CODEX_PROFILE: profile, BETTER_CODEX_HOME: home },
      });
      phase = "verify_ready";
      let status: unknown;
      try { status = JSON.parse(result.stdout); } catch { throw new Error("mcp_runtime_start_invalid_response"); }
      if (!status || typeof status !== "object" || !("runtime" in status) || status.runtime !== "ready") {
        const error = status && typeof status === "object" && "error" in status && typeof status.error === "string" ? status.error : "runtime_not_ready";
        throw new Error(error);
      }
      return { ready: true };
    } catch (error) {
      report(error, phase, phase === "verify_ready" ? "not_ready" : "unknown");
      throw error;
    }
  };
  return () => {
    if (environment.BETTER_CODEX_SCHEDULER === "1") {
      const error = new Error("mcp_scheduler_access_denied");
      report(error, "admission", "rejected");
      return Promise.reject(error);
    }
    pending ??= start().finally(() => { pending = null; });
    return pending;
  };
}

export const startMcpRuntime = createMcpRuntimeStarter();
