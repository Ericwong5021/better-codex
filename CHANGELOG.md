# Changelog

All notable changes to Better Codex are recorded here.

## [Unreleased]

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

[Unreleased]: https://github.com/Ericwong5021/better-codex/compare/v0.3.14...HEAD
[0.3.14]: https://github.com/Ericwong5021/better-codex/compare/v0.3.13...v0.3.14
[0.3.13]: https://github.com/Ericwong5021/better-codex/releases/tag/v0.3.13
[0.3.12]: https://github.com/Ericwong5021/better-codex/releases/tag/v0.3.12
