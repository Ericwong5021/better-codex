<p align="center">
  <img src="assets/better-codex-brand.png" width="420" alt="Better Codex" />
</p>

<p align="center">
  <strong>From start to finish, keep your work in Codex clear and visible.</strong>
</p>

<p align="center">
  A native task board and multi-Agent collaboration system that runs inside the Codex app. Local-first, one-command install.
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
  <a href="README.md">简体中文</a> · English
</p>

<p align="center">
  <img src="assets/better-codex-board-en.png" width="1200" alt="Better Codex task board inside Codex Desktop" />
</p>

## Why this exists

If you use Codex heavily, some of this probably sounds familiar:

- **Your session list is a graveyard.**<br>
  Dozens (hundreds?) of conversations, all titled roughly the same, none of them grouped by what you were actually working on. Finding "that thread where we debugged the auth flow" means scrolling and guessing.

- **One model config rules everything.**<br>
  You bump the reasoning level for a hard refactor, and now every new session pays for it. You tune the model for quick Q&A, and your next deep debugging session starts underpowered. There's one global dial, and every task fights over it.

- **Ideas have nowhere to live.**<br>
  Mid-conversation, you think of three more things worth doing. Codex gives you no place to put them, so they end up in a notes app, a TODO comment, or nowhere. The work you *meant* to do quietly evaporates.

- **Codex is conversation-shaped, but your work isn't.**<br>
  Real work is a project that spans days and many threads. Codex hands you a chat log and wishes you luck.

None of this is the model's fault. The model is great. What's missing is a **work layer** on top of it. So we built a better Codex, literally Better Codex.

## What you get

**Find any conversation again.**<br>
Turn conversations into tasks and organize them by project, status, and owner. Open a task to return to its linked conversation.

**Capture ideas before they disappear.**<br>
Add new tasks as they come up, then get back to your current work.

**See task progress at a glance.**<br>
Assign work to yourself or an Agent, then run it manually or automatically. Tasks return to your board when they need review, a decision, or unblocking.

**Configure each Agent separately.**<br>
Set the model, reasoning level, permissions, instructions, and concurrency limit for each role.

<p align="center">
  <img src="assets/better-codex-agents-en.png" width="1200" alt="Reusable Agent profiles inside Better Codex" />
</p>

## Who it's for

Better Codex works across many roles. If your work spans several Codex conversations and needs progress tracking, review, or repeated revisions, it can fit the same task workflow.

- **Developers.** Manage requirements, bugs, refactors, and release checks by project. Each task can stay linked to its original conversation, with progress, results, and pending reviews collected on the board.
- **Solo companies.** Keep product ideas, customer feedback, operations, and content plans on one board. Give research, drafting, and checking to different Agents while keeping final decisions with you.
- **Content creators.** Save ideas in the backlog, then organize research, outlines, drafts, and revisions as tasks. Each piece can stay linked to its original conversation, so you know where to continue when you come back later.
- **Product managers.** Manage requirements, user feedback, competitor research, bugs, and release checks separately. Linked conversations preserve the discussion, while the board shows the next step and current owner.
- **Sales professionals.** Organize public account research, meeting preparation, proposal drafts, and follow-up tasks. Create a project for each account or opportunity instead of scattering research and next steps across conversations.
- **Office staff.** Track meeting notes, announcement drafts, report preparation, spreadsheet work, and recurring administrative tasks. Give each Codex-assisted task to an Agent, then review the results in one place.

## A day with Better Codex

1. Open `Task board` from the Codex sidebar to manage work, or `Agents` to configure Agent profiles.
2. Create a project and capture a task, manually or straight from the conversation you're in.
3. Assign it to yourself, the default Codex profile, or one of your Agent profiles.
4. Keep manual mode for full control, or enable automatic mode and let ready Agent-owned tasks run.
5. Watch the board. When a task needs review or a decision, it comes back to you.
6. Open the task to read its linked conversation, send a reply, or continue in Codex.

The same loop works for coding, research, writing, document prep, and anything you already do in Codex.

## Installation

macOS 13+ (DMG, for releases that include it): drag **Better Codex.app** into **Applications**, then open it. The app runs quietly in the menu bar and shows Runtime readiness separately from Codex integration. The DMG includes Node.js. Use **Open Codex / Enable board** in the menu to enter the existing launcher flow. Closing Better Codex stops the board service while existing model turns keep their execution processes; results synchronize when Better Codex starts again.

macOS (command-line installer):

```bash
curl -fsSL https://raw.githubusercontent.com/Ericwong5021/better-codex/main/scripts/install.sh | bash
```

Windows (PowerShell):

```powershell
irm https://raw.githubusercontent.com/Ericwong5021/better-codex/main/scripts/install.ps1 | iex
```

Better Codex runs as a small Node.js bundle and requires Node.js 22.5 or later. The installer checks this before changing an existing installation. If Node.js is missing or too old, it asks before installing the current LTS release; declining leaves the existing Better Codex installation and database untouched.

The installer adds the CLI, Skill, local runtime, and system launcher, then registers the `better-codex` MCP server with Codex. The MCP server runs only on your computer and provides the Better Codex app entry and route. Projects, tasks, and conversation data remain in the local database. Legacy standalone-EXE installations are removed only after the Node.js bundle passes version and health checks.

On macOS, choose Open Codex / Enable board from the Better Codex menu bar. On Windows, reopen Codex through the Better Codex launcher. `Task board` and `Agents` appear as two entries in your sidebar. Run `better-codex uninstall` to remove Better Codex completely.

To access your board remotely from a browser, deploy your own Relay and Web UI with the [Self-hosting runbook](SELF_HOSTING.md). Your local Runtime makes an outbound WSS connection; the Relay forwards live traffic and stores no projects, tasks, conversations, Agent configuration, or attachments.

## FAQ

**Is this an official OpenAI product?**<br>
No. Better Codex is an independent open-source project built on top of Codex Desktop. It is not affiliated with or endorsed by OpenAI.

**Where does my data go?**<br>
It stays on your computer. Projects, tasks, assignments, conversations, Agent configuration, attachments, and run state live in the local SQLite database (`~/.better-codex/better-codex.db` on macOS, `%USERPROFILE%\.better-codex\better-codex.db` on Windows), and the Runtime listens on `127.0.0.1` only. Optional remote access sends live HTTPS/WSS traffic through your Relay while the Runtime is online; the Relay does not persist business data. See the [Self-hosting runbook](SELF_HOSTING.md) for the exact boundary.

**Why does Better Codex register an MCP server?**<br>
The local MCP app provides the full Better Codex plugin page using the same UI as Web. It connects tasks, Agents, projects, and settings to the local Runtime over MCP. Credentials stay in the local MCP process, and Runtime remains the owner of task data. Native thread commands and catalog synchronization use a separate desktop bridge without product rendering. Installing the local MCP server does not connect a cloud Dot to it. Dot setup is not exposed in this release.

**Will it break my Codex?**<br>
The app entry and route are registered through the local MCP server. Product UI renders in the plugin page. A separate desktop bridge uses the local CDP interface for native thread commands and catalog synchronization without patching Codex binaries. A Codex update can occasionally require a matching Better Codex compatibility update; when that happens, an update notice appears inside Codex. If anything looks off, run `better-codex doctor`.

**How do I disable or uninstall it?**<br>
`better-codex stop` stops the local Runtime while retaining installed components and task data. `better-codex uninstall` removes the MCP server, background service, launcher, Skill, Agent profiles, local data, and CLI bundle.

**How do updates work?**<br>
Better Codex checks a signed update manifest in the background and shows a notice inside Codex when a new version is available. You can also rerun the install command at any time. It upgrades in place when possible.

**Which platforms are supported?**<br>
Codex Desktop on macOS (Apple Silicon and Intel) and the Microsoft Store version of Codex on Windows x64. Release packages and CI cover all three. Codex compatibility is capability-based rather than pinned to a permanent version list; if required native bridge capabilities are unavailable, Better Codex reports a desktop bridge failure and reports the incompatibility without modifying board data.

## Useful commands

```bash
better-codex doctor            # check MCP, runtime, database, Codex compatibility, desktop bridge state
better-codex status            # show the current service and board connection
better-codex mcp status        # inspect the MCP registration
better-codex mcp install       # register or repair the MCP server
better-codex launcher install  # install the system launcher
better-codex launcher status   # inspect the system launcher
better-codex stop              # stop the local Runtime, keep task data
better-codex uninstall         # uninstall completely and delete local data
```

## Install from source

Requires Node.js 22.5 or later.

If the stable build is already installed, install the source checkout as a separate development instance. Stable keeps `~/.better-codex` and the `Better Codex` launcher; development uses `~/.better-codex-dev` and `Better Codex Dev`. Development creates a consistent snapshot of the stable database on first launch when one exists; the two databases then evolve independently. Runtime files, logs, attachments, and update state remain isolated. A desktop bridge yields when another profile owns the renderer; neither launcher stops the other profile’s active tasks.

```bash
git clone https://github.com/Ericwong5021/better-codex.git
cd better-codex
npm ci
npm run dev:install
```

The development instance does not auto-update its core. Pull source changes and run `npm run dev:refresh` to explicitly refresh the local development installation. `npm run build` only builds source artifacts. Use `npm run dev:status` to inspect the development instance and `npm run dev:uninstall` to remove its launcher and stop it while preserving development data.

## Community

- Found a bug or want a feature? Open a [GitHub Issue](https://github.com/Ericwong5021/better-codex/issues).
- Questions and workflow ideas belong in [GitHub Discussions](https://github.com/Ericwong5021/better-codex/discussions).
- Want to help test Beta releases? Read the [Beta testing guide](CONTRIBUTING.md#beta-testing).
- Please use English in public GitHub conversations so everyone can follow them.

If Better Codex makes your Codex better, a star helps other heavy users find it.
