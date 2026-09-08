export function sessionThreadMissing(error: unknown) {
  const value = String(error instanceof Error ? error.message : error || "").toLowerCase();
  return ["thread not found", "thread_not_found", "rollout not found", "no rollout found", "thread_not_materialized"].some(code => value.includes(code));
}

export function sessionCommandCanRetry(kind: string, attempts: number, error: string) {
  if (kind !== "rename" || attempts >= 5 || sessionThreadMissing(error)) return false;
  return !["thread_name_required", "session_thread_invalid", "issue_session_mismatch", "issue_session_already_bound"].includes(error);
}
