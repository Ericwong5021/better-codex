<p align="center">
  <img src="assets/better-codex.png" width="132" alt="Better Codex" />
</p>

<h1 align="center">Better Codex</h1>

<p align="center">
  <strong>Turn Codex conversations into work that keeps moving.</strong>
</p>

<p align="center">
  A local-first task board and Agent workflow built directly into Codex Desktop.
</p>

<p align="center">
  <a href="https://github.com/Ericwong5021/better-codex/releases/latest"><img alt="Release" src="https://img.shields.io/github/v/release/Ericwong5021/better-codex" /></a>
  <a href="https://github.com/Ericwong5021/better-codex/stargazers"><img alt="Stars" src="https://img.shields.io/github/stars/Ericwong5021/better-codex" /></a>
  <a href="https://github.com/Ericwong5021/better-codex/releases"><img alt="Downloads" src="https://img.shields.io/github/downloads/Ericwong5021/better-codex/total" /></a>
  <a href="https://github.com/Ericwong5021/better-codex/actions/workflows/ci.yml"><img alt="Build" src="https://img.shields.io/github/actions/workflow/status/Ericwong5021/better-codex/ci.yml?branch=main&label=build" /></a>
  <img alt="macOS" src="https://img.shields.io/badge/macOS-Apple%20Silicon%20%7C%20Intel-black?logo=apple" />
  <img alt="Windows" src="https://img.shields.io/badge/Windows-x64-0078D4?logo=windows11" />
</p>

<p align="center">
  English · <a href="README.zh-CN.md">简体中文</a>
</p>

Better Codex adds a real work loop to Codex Desktop. Capture a conversation as a task, move it across a visible board, assign one clear owner, and return to the original thread when a decision needs you.

It is not another web dashboard to maintain. The board, Agent profiles, execution state, and review handoff all live inside Codex.

<p align="center">
  <img src="assets/better-codex-board.png" width="1200" alt="Better Codex task board inside Codex Desktop" />
</p>

## What makes Better Codex different

| | Capability | What it changes |
| --- | --- | --- |
| **01** | Conversation-linked tasks | Create a task from the current Codex conversation and reopen the exact linked thread later. Context stays attached to the work. |
| **02** | A board that shows the whole workload | Organize tasks by project, status, priority, label, and assignee. Drag cards forward and see what is waiting, running, under review, blocked, or done. |
| **03** | Reusable Agent profiles | Give code review, frontend work, debugging, or another role its own instructions, model, reasoning level, and avatar. Each task still has one explicit owner. |
| **04** | Manual or automatic execution | Start Agent work yourself, or let automatic mode claim ready tasks. Work returns to you when it needs review, a decision, or recovery from a blocker. |
| **05** | Local-first data | Projects, tasks, assignments, and run state stay in a local SQLite database. No Better Codex account or hosted task service is required. |

<p align="center">
  <img src="assets/better-codex-agents.png" width="1200" alt="Reusable Agent profiles inside Better Codex" />
</p>

## Install

### macOS

Supports Apple Silicon and Intel Macs.

```bash
curl -fsSL https://raw.githubusercontent.com/Ericwong5021/better-codex/main/scripts/install.sh | bash
```

### Windows

Supports Windows x64 with the Microsoft Store version of Codex. Run in PowerShell:

```powershell
irm https://raw.githubusercontent.com/Ericwong5021/better-codex/main/scripts/install.ps1 | iex
```

The installer downloads the matching release, verifies its SHA-256 checksum, installs the local runtime, configures the Codex integration, and verifies that it is ready.

If Codex is open, the installer asks before closing it. Save active work first.

After installation:

- `Better Codex` appears in the Codex sidebar for tasks and projects.
- `Agents` appears in the sidebar for reusable Agent profiles.
- macOS gets `/Applications/Better Codex.app`, which can be pinned to the Dock.
- Windows gets a `Better Codex` shortcut on the Desktop and in the Start Menu.

Use the Better Codex launcher after installation so Codex starts with the required local integration enabled.

## How the workflow fits together

1. Open `Better Codex` from the Codex sidebar.
2. Create a project and capture a task, either manually or from the current conversation.
3. Assign the task to yourself, the default Codex profile, or a custom Agent profile.
4. Keep manual mode for explicit control, or enable automatic mode for ready Agent-owned tasks.
5. Follow progress on the board. When the task needs review or a decision, it returns to you.
6. Open the task to continue in its linked Codex conversation.

The same loop works for coding, research, writing, document preparation, and other work already done with Codex.

## Local data and privacy

| Platform | Database |
| --- | --- |
| macOS | `~/.better-codex/better-codex.db` |
| Windows | `%USERPROFILE%\.better-codex\better-codex.db` |

The Better Codex runtime listens on `127.0.0.1`. It does not require a Better Codex cloud service and does not upload task content to one.

## Updates

Better Codex checks a signed update manifest in the background. When a new version is available, an update notice appears inside Codex. Installing it restarts Codex and verifies the updated integration.

You can also rerun the installation command at any time. It upgrades the existing runtime when possible and falls back to a full installation when required.

## Useful commands

Check the runtime, database, Codex compatibility, and injection state:

```bash
better-codex doctor
```

Show the current service and board connection:

```bash
better-codex status
```

Install or inspect the system launcher:

```bash
better-codex launcher install
better-codex launcher status
```

Remove the Codex sidebar integration without deleting task data:

```bash
better-codex eject
```

## Install from source

Requires Node.js 22.5 or later.

```bash
git clone https://github.com/Ericwong5021/better-codex.git
cd better-codex
npm ci
npm run build
npm link
better-codex inject --launch
better-codex launcher install
```

## Compatibility

Better Codex supports Codex Desktop on macOS and the Microsoft Store version of Codex on Windows. Release packages and CI cover Apple Silicon, Intel Mac, and Windows x64.

The integration uses the desktop app's local CDP interface and page structure. A Codex update can occasionally require a matching Better Codex compatibility update.

## Community

Use [GitHub Issues](https://github.com/Ericwong5021/better-codex/issues) for bugs and feature requests. Use [GitHub Discussions](https://github.com/Ericwong5021/better-codex/discussions) for questions and workflow ideas.

Please use English in public GitHub conversations so everyone can follow them.
