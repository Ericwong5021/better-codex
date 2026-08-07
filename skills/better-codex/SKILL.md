---
name: better-codex
description: Operate Better Codex issues through its local CLI. Use when a Codex session is processing a Better Codex issue identified by an issue key, or when the user asks to create, inspect, advance, block, re-queue, or hand back a Better Codex issue.
---

# Better Codex

`better-codex-issue` is the structured-session entry skill. When a session prompt contains a title, details, taskid, and asks you to follow `/better-codex-issue` rules, use this skill for Issue operations and board synchronization.

Use the `better-codex` CLI as the only interface. Do not edit the Better Codex database directly.

## Run modes

The board has two dispatch modes:

- **Manual mode** (`auto-dispatch=false`): assigning an issue to an Agent does not start it, and conversation replies are not a dispatch path. The user must click **立即开始任务** to launch a run; do not pretend that changing board fields is equivalent to that action.
- **Automatic mode** (`auto-dispatch=true`): dispatchable Agent-owned issues are queued automatically. A user reply resumes an existing conversation for any non-archived issue outside `backlog`; replies on `backlog` issues are rejected. A reply is an explicit user action, so it may continue an issue whose `pending_actor` is `user`; do not change ownership merely to make the reply work.

The normal queue still requires all of these conditions: the issue needs attention, `pending_actor=agent`, an Agent is assigned, a workspace is available, and status is not `backlog`, `done`, or `cancelled`.

## Identify the current issue

Treat the session as managed only when its task prompt identifies a Better Codex issue with a non-empty taskid. Capture that identifier and use it for all later CLI commands. The title and details supplied in the prompt are the current task context; do not re-fetch the Issue just to rebuild that context.

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

If `pending_actor` is `user`, do not start another automatic queue run. Stop and wait for the user unless the current user message explicitly asks you to continue the issue; in automatic mode, the app can resume the issue conversation directly. Do not silently reassign the issue to an Agent.

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

- Set `blocked` when a problem prevents completing the work, and leave `pending_actor=user` with `needs_attention=true`. Only set `pending_actor=agent` when you intentionally want auto-dispatch to retry.
- Set `in_review` after completing and verifying work that needs user review. Set `pending_actor=user` and `needs_attention=true`.
- Set `done` only when the work is fully complete, verified, and needs no further review. Set `needs_attention=false`.
- When handing work back to the Agent queue, use a non-terminal status such as `todo`, `pending_actor=agent`, and `needs_attention=true`; never queue `backlog`, `done`, or `cancelled`.
- Never claim or reprocess work when `pending_actor=user`.
- Do not move an actively running issue back to `todo` or `backlog`.
- Do not leave an Agent as `pending_actor` after you need a human decision.
- Update the board before the session exits. If status is still `in_progress` when the process ends, the runtime applies a safety net (`in_review`/`blocked` + `pending_actor=user`). If you already moved the issue off `in_progress`, the runtime keeps your board update.

Always synchronize the final status and pending actor before replying with the result. Use the identifier verified from the task prompt. Do not modify unrelated issues unless the user explicitly asks.

If a user asks to continue an issue while automatic mode is enabled, treat that message as the authorization to continue the existing conversation. Finish by applying the same status/actor rules above; do not create a duplicate issue or a second run.

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
