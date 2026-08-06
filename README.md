<p align="center">
  <img src="assets/better-codex.png" width="560" alt="Better Codex" />
</p>

<p align="center">
  <strong>Give every Codex conversation a clear next step.</strong>
</p>

<p align="center">
  English · <a href="README.zh-CN.md">简体中文</a>
</p>

Better Codex is a local task board and agent manager for Codex Desktop. It keeps tasks, ideas, and progress next to your Codex conversations, so you can return to the right thread without moving your workflow into a separate project management tool.

## What you can do

- Turn the current Codex conversation into a task card and reopen the linked thread later.
- Organize work across Todo, In Progress, Review, and Done.
- Create projects, search tasks, set priorities, pin cards, and archive completed work.
- Create Codex Profile Agents with a name, description, developer instructions, model, and reasoning level.
- Keep task data on your computer in a local SQLite database with no cloud account.

## Who it is for

Better Codex is for people who use Codex for coding, design, research, or planning and need a reliable way to remember what each conversation was doing.

## Install

Better Codex supports Codex Desktop on macOS and Windows. The installer downloads the latest release, verifies its SHA-256 checksum, installs the local runtime, and restarts Codex to finish injection.

### macOS

```bash
curl -fsSL https://raw.githubusercontent.com/Ericwong5021/better-codex/main/scripts/install.sh | bash
```

### Windows

Use the Microsoft Store version of Codex, then run this command in PowerShell:

```powershell
irm https://raw.githubusercontent.com/Ericwong5021/better-codex/main/scripts/install.ps1 | iex
```

If Codex is running, the installer asks for permission to quit it. Press Enter or type `Y` to continue. After installation, Codex restarts with the Better Codex entry in its sidebar.

### Upgrade

Run the same installation command again. If Better Codex is already installed, the installer upgrades the existing runtime and falls back to a full installation when needed.

Starting with v0.3.7, Better Codex also checks for signed updates in the background. When a new version is available, an update notice appears in the lower-right corner of Codex. Choose **Update now** to install it and restart Codex automatically.

### Install from source

Install Node.js 22.5 or later, then run:

```bash
git clone https://github.com/Ericwong5021/better-codex.git
cd better-codex
npm ci
npm run build
npm link
better-codex inject --launch
```

## Use Better Codex

1. Open Better Codex from the Codex sidebar.
2. Create a project.
3. Add task cards and link them to Codex conversations when needed.
4. Move cards as work progresses.
5. Open Agents to create and manage Codex Profile Agents.

Check the local service and board connection:

```bash
better-codex status
```

Temporarily remove the sidebar entry:

```bash
better-codex eject
```

This does not delete your task data. The database is stored at `~/.better-codex/better-codex.db` on macOS and `%USERPROFILE%\.better-codex\better-codex.db` on Windows.

## Privacy

Task data stays on your computer by default. The local service listens only on `127.0.0.1` and does not send task content to third-party servers.

## Community

Use [GitHub Issues](https://github.com/Ericwong5021/better-codex/issues) for bugs and feature requests. Use [GitHub Discussions](https://github.com/Ericwong5021/better-codex/discussions) for questions, ideas, and workflow sharing. Please write public GitHub posts in English so the whole community can follow them.
