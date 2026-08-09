# Changelog

All notable changes to Better Codex are recorded here.

## [Unreleased]

## [0.3.16] - 2026-08-10

### Changed

- Remember whether the Issue dialog was expanded and let English users edit an Agent's localized name.

### Fixed

- Reject release packages whose embedded core version does not match the version being installed.
- Keep running Agent tasks intact by postponing popup updates until current work finishes.
- Roll back stalled update restarts, clear stale update notices, and show actionable failure messages.

## [0.3.15] - 2026-08-10

### Added

- Configure a keyboard shortcut to open the Create Issue dialog.
- Resize the Agent details pane and keep its width for later sessions.

### Changed

- Sync projects from Codex and choose a project when creating or editing an Issue.
- Show localized names for the built-in suggested Agents in the English interface.
- Continue a completed Issue by sending a follow-up reply, which moves it back to in progress.

### Fixed

- Keep failed and interrupted reply states visible in the conversation while offering a retry.
- Keep Agent profile creation compatible with clients that do not send a localized name.

## [0.3.14] - 2026-08-09

### Added

- Open the task board and Agent management from separate entries in the Codex Desktop sidebar.
- Use the new Help and settings dialog to review run modes, check for updates manually, and see core, compatibility, and runtime status.
- Install the `better-codex` skill and update verification key with release packages. `better-codex doctor` now reports missing setup assets.
- List Agents and assign an Issue to an Agent from the CLI.

### Changed

- Make generated Issue titles shorter while keeping the full request in the description.
- Repair an existing installation when required skills or the update verification key are missing, even if the installed core version is already current.

### Fixed

- Preserve manually queued Issue starts across runtime restarts.
- Wait for Issue replies to exit after stopping and safely reconcile late final answers from interrupted runs.
- Prefer the bundled core over a stale older managed runtime after upgrading the installed package.
- Roll back core and compatibility updates when the updated runtime cannot restart or reconnect to Codex successfully.
- Validate downloaded runtimes in an isolated environment before activation and preserve activation failures across restarts so they remain visible.
- Avoid premature compatibility rollback immediately after an update, and report the correct available version for compatibility-only updates.
- Keep Homebrew-managed binaries under package-manager control during uninstall, and avoid reusing stale macOS launcher paths after an executable changes.
- Verify the recorded Windows runtime process before treating it as active.

### Known limitations

- Better Codex still depends on Codex Desktop's local CDP interface and page structure. A Codex Desktop update can require a matching compatibility update.
- Data remains local to one device; cloud sync, shared workspaces, and multi-user collaboration are not included.
- The updated Windows install, startup, and uninstall paths are implemented but have not yet completed real-machine acceptance for this release candidate.

## [0.3.13] - 2026-08-08

### Added

- Configure Agent sandbox permissions and per-Agent concurrency limits.
- View execution state and completion notices on the task board, stop active runs, and reply from linked conversation details.

### Changed

- Keep the issue session prompt limited to the issue description, the Better Codex Issue skill instruction, and the task identifier.
- Keep the English and Simplified Chinese interface copy aligned for task execution, Agent settings, conversation replies, and update notices.

## [0.3.12] - 2026-08-07

### Fixed

- Use the Codex system font in the Better Codex interface.

## [0.3.11] - 2026-08-07

### Fixed

- Bypass stale GitHub release caches before deciding whether an update is available.
- Avoid restarting Codex when an update check finds that the installed version is current.
- Compare updates against the active managed core so an already updated runtime is not downloaded again.

## [0.3.10] - 2026-08-07

### Added

- Let Codex turn Agent-created requests into Issues with a generated title and metadata.

### Changed

- Bind Agent workspaces to the source Codex session directory.
- Resolve the latest Windows installer from the current GitHub release instead of a pinned version.

### Fixed

- Stop active injectors before restarting Codex during macOS upgrades and force quit when the normal quit request stalls.
- Hide background Codex console windows on Windows.

## [0.3.9] - 2026-08-07

### Added

- Configure the default Codex Agent and custom Agents with models, reasoning levels, instructions, presets, and avatars.
- Package the Better Codex skill and use it to run Issue sessions from the task board.
- View conversation transcripts, send follow-up replies, and show the local Codex profile in Issue details.
- Install dedicated Better Codex launchers on macOS and Windows.

### Changed

- Redesign the task board around explicit user and Agent ownership, live work states, and Codex appearance tokens.
- Keep automatic dispatch from reclaiming Agent work that already reached a settled state.

### Fixed

- Reconnect the integration when Codex replaces its active renderer target.
- Omit empty Agent role instructions instead of sending blank configuration.

## [0.3.8] - 2026-08-06

### Fixed

- Complete Windows setup when Codex is already stopped instead of treating the missing process as an error.

## [0.3.7] - 2026-08-06

### Added

- Create reusable Agent profiles with names, instructions, models, reasoning levels, and light or dark appearance support.
- Assign tasks to a specific Agent profile.
- Check for signed updates and install them from inside Codex.

### Changed

- Upgrade existing installations in place before falling back to a full reinstall.

## [0.3.6] - 2026-08-06

### Fixed

- Start the Better Codex runtime on Windows without showing background PowerShell windows.

## [0.3.5] - 2026-08-06

### Added

- Publish the macOS and Windows installer scripts with each release so stable latest-version URLs keep working.

## [0.3.4] - 2026-08-06

### Fixed

- Retry Windows installation diagnostics while Codex and the local integration finish starting.

## [0.3.3] - 2026-08-06

### Fixed

- Install the intended Windows release without depending on an unauthenticated GitHub API request.

## [0.3.2] - 2026-08-06

### Changed

- Install and start the Windows runtime without requiring administrator privileges.

## [0.3.1] - 2026-08-06

### Fixed

- Allow the release workflow to install platform-filtered dependencies before publishing artifacts.

## [0.3.0] - 2026-08-06

### Added

- Add a local-first task board inside Codex with projects, searchable cards, statuses, priorities, pinning, and archiving.
- Link Issues to Codex conversations and reopen the original thread from the board.
- Run Agent-owned Issues through an automated local workflow with visible review states.
- Support macOS and Windows with a managed runtime, compatibility layer, signed updates, and release installers.

[Unreleased]: https://github.com/Ericwong5021/better-codex/compare/v0.3.16...HEAD
[0.3.16]: https://github.com/Ericwong5021/better-codex/compare/v0.3.15...v0.3.16
[0.3.15]: https://github.com/Ericwong5021/better-codex/compare/v0.3.14...v0.3.15
[0.3.14]: https://github.com/Ericwong5021/better-codex/compare/v0.3.13...v0.3.14
[0.3.13]: https://github.com/Ericwong5021/better-codex/compare/v0.3.12...v0.3.13
[0.3.12]: https://github.com/Ericwong5021/better-codex/compare/v0.3.11...v0.3.12
[0.3.11]: https://github.com/Ericwong5021/better-codex/compare/v0.3.10...v0.3.11
[0.3.10]: https://github.com/Ericwong5021/better-codex/compare/v0.3.9...v0.3.10
[0.3.9]: https://github.com/Ericwong5021/better-codex/compare/v0.3.8...v0.3.9
[0.3.8]: https://github.com/Ericwong5021/better-codex/compare/v0.3.7...v0.3.8
[0.3.7]: https://github.com/Ericwong5021/better-codex/compare/v0.3.6...v0.3.7
[0.3.6]: https://github.com/Ericwong5021/better-codex/compare/v0.3.5...v0.3.6
[0.3.5]: https://github.com/Ericwong5021/better-codex/compare/v0.3.4...v0.3.5
[0.3.4]: https://github.com/Ericwong5021/better-codex/compare/v0.3.3...v0.3.4
[0.3.3]: https://github.com/Ericwong5021/better-codex/compare/v0.3.2...v0.3.3
[0.3.2]: https://github.com/Ericwong5021/better-codex/compare/v0.3.1...v0.3.2
[0.3.1]: https://github.com/Ericwong5021/better-codex/compare/v0.3.0...v0.3.1
[0.3.0]: https://github.com/Ericwong5021/better-codex/tree/v0.3.0
