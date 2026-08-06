---
name: better-codex
description: Operate Better Codex issues through its local CLI. Use when a Codex session is processing a Better Codex issue and needs to inspect or change that issue's board status, pending actor, or create a new issue for the user to review or act on.
---

# Better Codex

Use the `better-codex` CLI as the only interface. Do not edit the Better Codex database directly.

## Identify the current issue

Treat the session as managed only when its task prompt identifies a Better Codex issue, for example `处理 Better Codex 任务 BCX-12`. Capture that identifier and verify it before making changes:

```text
better-codex issue get BCX-12
```

If the prompt does not identify an issue, do not guess one. If the CLI or runtime is unavailable, report the problem once and continue the user's work without changing the board.

## Understand dispatch ownership

Each issue has:

- `needs_attention`: whether the issue currently waits for someone
- `pending_actor`: who should act next (`user` or `agent`)
- `agent_enabled` / `agent_id`: the assigned Agent, if any

Auto-dispatch only starts sessions when all of these are true:

1. Auto-dispatch is enabled in the board toolbar
2. `needs_attention` is true
3. `pending_actor` is `agent`
4. An Agent is assigned
5. Status is not `backlog`, `done`, or `cancelled`

If `pending_actor` is `user`, do not continue acting on the issue. Stop and wait for the user. The user must reassign the issue to an Agent before another automatic session may start.

## Change status and pending actor

Always update both the board status and the next actor before finishing:

```text
better-codex issue update BCX-12 --status in_review --pending-actor user --needs-attention true
```

Or in two steps if needed:

```text
better-codex issue status BCX-12 in_review
better-codex issue update BCX-12 --pending-actor user --needs-attention true
```

Use only these statuses: `backlog`, `todo`, `in_progress`, `in_review`, `done`, `blocked`, `cancelled`.

Rules:

- Set `blocked` when a problem prevents completing the work, and usually leave `pending_actor` as `user` or the assigned Agent only if that Agent can self-retry.
- Set `in_review` after completing and verifying work that needs user review. Set `pending_actor=user` and `needs_attention=true`.
- Set `done` only when the work is fully complete, verified, and needs no further review. Set `needs_attention=false`.
- Never claim or reprocess work when `pending_actor=user`.
- Do not move an actively running issue back to `todo` or `backlog`.
- Do not leave an Agent as `pending_actor` after you need a human decision.

Always synchronize the final status and pending actor before replying with the result. Use the identifier verified from the task prompt. Do not modify unrelated issues unless the user explicitly asks.

## Create an issue for the user

When the current session is managed, read the current issue first and reuse its `project_id`. Otherwise, list projects and select the project whose workspace matches the current working directory. If no project can be identified safely, ask the user rather than relying on the CLI's first-project default.

Create the issue with an explicit project, useful title, actionable description, priority, and workspace:

```text
better-codex issue create --project PROJECT_ID --title "Confirm authentication method" --description "Choose email verification or password login, and record the decision in this issue." --status backlog --priority high --workspace CURRENT_WORKSPACE
```

Always create new issues in `backlog` so they appear in the planning column. New CLI-created issues are manual issues for the user; they are not automatically assigned to an Agent. Write the description so it states:

1. Why the issue was created.
2. What the user needs to decide or do.
3. What counts as complete.

Create only one issue per distinct user action. Do not create child-task trees, poll the new issue, or wait for it to complete.
