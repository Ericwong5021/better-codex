import { writeExternalReport } from "./external-reporter.js";
import type { ExternalReportState } from "./external-observations.js";

const args = process.argv.slice(2);
const option = (name: string) => { const index = args.indexOf(name); return index < 0 ? undefined : args[index + 1]; };

if (!option("--spool") || !option("--state") || !option("--title")) {
  console.log("Usage: node --import tsx src/external-report-cli.ts --spool DIRECTORY --state running|waiting_user|waiting_approval|failed|completed|idle --title TEXT [--thread-id ID] [--parent-id ID] [--message TEXT] [--creator-name dot]\nIDs and creator name are declared, not verified. Thread ID defaults to CODEX_THREAD_ID.");
  process.exitCode = 1;
} else {
  const report = await writeExternalReport(option("--spool")!, {
    provider: option("--provider") || "codex", account_id: option("--account-id") || "local-opt-in",
    host_id: option("--host-id") || "task-environment", thread_id: option("--thread-id") || process.env.CODEX_THREAD_ID || "",
    state: option("--state") as ExternalReportState, title: option("--title")!,
    description: option("--description") || "", project_id: option("--project-id") || null,
    parent_thread_id: option("--parent-id") || null, creator_name: option("--creator-name") || null,
    message: option("--message") || null,
  });
  console.log(JSON.stringify({ item_id: report.item_id, sequence: report.sequence, thread_id: report.thread_id, state: report.state, reported_at: report.reported_at, provenance: "declared" }));
}
