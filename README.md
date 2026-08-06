<p align="center">
  <img src="assets/better-codex.png" width="560" alt="Better Codex" />
</p>

<p align="center">
  <strong>Keep work moving in Codex.</strong>
</p>

<p align="center">
  Plan tasks, return to the right conversation, and assign work to reusable Agents without leaving Codex Desktop.
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

Better Codex is a local workflow extension for Codex Desktop. It adds task and project management to the Codex sidebar and stores task data locally in SQLite.

<p align="center">
  <img src="assets/better-codex-board.png" width="1200" alt="Better Codex running inside Codex Desktop" />
</p>

## Quick Start

### macOS

Supports Apple Silicon and Intel Macs.

```bash
curl -fsSL https://raw.githubusercontent.com/Ericwong5021/better-codex/main/scripts/install.sh | bash
```

### Windows

Use the Microsoft Store version of Codex, then run this command in PowerShell:

```powershell
irm https://raw.githubusercontent.com/Ericwong5021/better-codex/main/scripts/install.ps1 | iex
```

If Codex is running, the installer asks before closing it. Press Enter or type `Y` to continue. The installer downloads the latest release, verifies its SHA-256 checksum, installs the local runtime, restarts Codex, and checks that the integration is working.

After installation, Codex has two new sidebar entries:

- `Better Codex` opens the task and project view.
- `Agents` opens the Profile Agent manager.

The installer also configures injection-aware launch entry points:

- macOS creates `~/Applications/Better Codex Launcher.app`, which can be pinned to the Dock.
- Windows rewrites Codex shortcuts in the current user's Desktop, Start Menu, and taskbar to launch through Better Codex. Original shortcut settings are backed up and restored on uninstall.

If Codex is already running without injection support, launching through these entries quits and restarts Codex. Save active work first.

## Features

| Area | Capabilities |
| --- | --- |
| Tasks and projects | Create projects and tasks, set priorities, search, filter, pin, archive, and move cards between workflow states. |
| Codex conversations | Create tasks from the current conversation and reopen the linked thread from a task card. |
| Profile Agents | Create Agents with their own description, developer instructions, model, and reasoning level, then assign tasks to them. |
| Execution status | See when a task is waiting for a session, running, under review, completed, blocked, or canceled. |
| Local data | Store projects, tasks, assignments, and run state in a local SQLite database. No Better Codex account is required. |
| Updates | Install signed updates from the notice inside Codex, or rerun the installation command to upgrade. |

## Basic Workflow

1. Open `Better Codex` from the Codex sidebar.
2. Create a project and add a task.
3. Link the task to a Codex conversation, or create it from the conversation you are using.
4. Move the task as the work progresses.
5. Open the task to return to its conversation.
6. Assign the task to a Profile Agent when it needs a specific role or configuration.

The same workflow can be used for coding, research, writing, document preparation, data collection, and other work done with Codex.

## Updates

Run the installation command again to upgrade. Better Codex upgrades the existing runtime when possible and performs a full installation when required.

Starting with v0.3.7, Better Codex also checks a signed update manifest in the background. When a new version is available, an update notice appears inside Codex. Installing the update restarts Codex automatically.

## Data and Privacy

| Platform | Database |
| --- | --- |
| macOS | `~/.better-codex/better-codex.db` |
| Windows | `%USERPROFILE%\.better-codex\better-codex.db` |

The Better Codex runtime listens on `127.0.0.1`. It does not require a Better Codex cloud service or upload task content to one.

## Commands

Check the runtime, database, Codex compatibility, and injection:

```bash
better-codex doctor
```

Show the current service and board connection:

```bash
better-codex status
```

Reconfigure or inspect system launch entry points:

```bash
better-codex launcher install
better-codex launcher status
```

Remove the sidebar entries without deleting task data:

```bash
better-codex eject
```

## Install from Source

Install Node.js 22.5 or later, then run:

```bash
git clone https://github.com/Ericwong5021/better-codex.git
cd better-codex
npm ci
npm run build
npm link
better-codex inject --launch
```

## Compatibility

Better Codex supports Codex Desktop on macOS and the Microsoft Store version of Codex on Windows. It relies on the desktop app's local CDP interface and page structure, so some Codex updates may require a Better Codex compatibility update.

Release packages and CI checks cover macOS on Apple Silicon and Intel, plus Windows x64.

## Community

Use [GitHub Issues](https://github.com/Ericwong5021/better-codex/issues) for bugs and feature requests. Use [GitHub Discussions](https://github.com/Ericwong5021/better-codex/discussions) for questions and workflow ideas.

Please use English for public GitHub conversations so everyone can follow them.
