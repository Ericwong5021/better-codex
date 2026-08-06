---
name: better-codex
description: Operate Better Codex issues through its local CLI. Use when a Codex session is processing a Better Codex issue and needs to inspect or change that issue's board status, or when Codex needs to create a new issue for the user to review or act on.
---

# Better Codex

Use the `better-codex` CLI as the only interface. Do not edit the Better Codex database directly.

## Identify the current issue

Treat the session as managed only when its task prompt identifies a Better Codex issue, for example `处理 Better Codex 任务 BCX-12`. Capture that identifier and verify it before making changes:

```text
better-codex issue get BCX-12
```

If the prompt does not identify an issue, do not guess one. If the CLI or runtime is unavailable, report the problem once and continue the user's work without changing the board.

## Change the current status

Run:

```text
better-codex issue status BCX-12 in_review
```

Use only these statuses: `backlog`, `todo`, `in_progress`, `in_review`, `done`, `blocked`, `cancelled`.

- Set `blocked` when a problem prevents completing the work.
- Set `in_review` after completing and verifying work that needs user review.
- Set `done` only when the work is fully complete, verified, and needs no further review.
- Do not move an actively running issue back to `todo` or `backlog`.

Always synchronize exactly one final status before replying with the result. Use the identifier verified from the task prompt. Do not modify unrelated issues unless the user explicitly asks.

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
