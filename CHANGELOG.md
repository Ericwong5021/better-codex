# Changelog

All notable changes to Better Codex are recorded here.

## [Unreleased]

## [0.4.10-beta.13] - 2026-08-23

- Match native Codex queue behavior and styling, including editing or sending queued replies immediately.
- Expose Codex skills, apps, file mentions, and slash commands in Issue creation and detail dialogs with explicit lookup errors.
- Keep mobile scheduled-task navigation, project planning scroll position, slash menus, and Agent editor dismissal stable across live updates.

## [0.4.10-beta.12] - 2026-08-23

- Keep an Issue on its existing Codex thread when the assigned Agent configuration changes, while applying the current workspace, model, approval, sandbox, and developer instructions to resumed work.
- Align remote Web acceptance with the separate conversation stop control.
- Make full CI and regression suites non-blocking for signed Preview packaging and Beta installation.

## [0.4.10-beta.11] - 2026-08-23

- Queue follow-up replies while an Issue is running and show pending messages in the conversation.
- Autosave agent configuration and preserve Issue drafts, planning drafts, timelines, and board position across navigation or refresh.
- Keep Web updates and page injection stable while the Runtime or Codex target is being replaced.
- Parse conversation attachments before removing internal metadata.
- Make Preview VPS updates channel-aware, resumable, and explicit about failed state files.

## [0.4.10-beta.10] - 2026-08-22

- Close the agent editor after saving changes to an existing agent.
- Keep conversation attachments interactive while an Issue is running or editing-locked.
- Disable browser zoom in the Web workspace.

## [0.4.10-beta.9] - 2026-08-22

- Close retained Relay test connections before waiting for the local server to stop.

## [0.4.10-beta.8] - 2026-08-22

- Avoid a Windows Relay test shutdown race when the local server closes before its event listener is attached.

## [0.4.10-beta.7] - 2026-08-22

- Keep remote semantic lookup within Hub capabilities without invalidating valid Web sessions.

## [0.4.10-beta.6] - 2026-08-22

- Initialize scheduled-task locale resources before Web UI injection and resolve localized validation errors.

## [0.4.10-beta.5] - 2026-08-22

- Preserve semantic slash-command regex syntax through injection generation and align release acceptance with current schemas and UI contracts.

## [0.4.10-beta.4] - 2026-08-22

- Validate nullable recurring-task intervals without blocking TypeScript builds.

## [0.4.10-beta.3] - 2026-08-22

- Add recurring scheduled tasks with manual execution and delivery history.
- Add Web collaboration controls for user roles, visibility, and ownership.
- Add conversation attachment preview and download support.
- Add Codex skills, file mentions, and semantic slash commands to Issue conversations.
- Add an authenticated VPS upgrade action and refine project planning controls and draft recovery.

## [0.4.10-beta.2] - 2026-08-22

- Align compact mobile Issue creation actions without wrapping the dialog footer.
- Retry transient local Runtime forwarding failures for safe read requests.

## [0.4.10-beta.1] - 2026-08-22

- Start the 0.4.10 Preview line from the 0.4.9 release baseline.

## [0.4.9] - 2026-08-22

### Added

- Route the complete remote Web workspace through an authenticated outbound Relay tunnel while keeping local SQLite authoritative.
- Persist supported Web commands across brief Runtime outages with Relay queuing, browser recovery, idempotent receipts, and durable thread effects.
- Add Fast agent execution through supported Codex priority service tiers.
- Remember Relay browser devices and manage active sessions locally.

### Changed

- Run linked Codex actions through one persistent Session Host and recover interrupted Issue turns after host replacement.
- Simplify self-hosted remote access around the data-blind Relay architecture and signed exact-version upgrades.

### Fixed

- Preserve attachments, requests, reads, reconnects, and conversations across bounded Relay and Runtime interruptions.
- Improve remote Issue workflows, dialogs, navigation, theme controls, usage visibility, and compact mobile layouts.
- Keep folder selection, installation, injection, MCP registration, and Runtime process lifecycles reliable across supported platforms.

## [0.4.9-beta.34] - 2026-08-21

- Add project planning sessions and an interactive planning workspace for tracked milestones and work items.
- Add Fast agent execution through supported Codex priority service tiers.
- Preserve Relay reads across brief Runtime reconnects and correlate remote request failures with trace IDs.
- Validate complete Issue descriptions before saving.
- Add an isolated development delivery workflow.

## [0.4.9-beta.33] - 2026-08-21

- Expose Codex usage and light or dark theme controls in compact Web navigation.

## [0.4.9-beta.32] - 2026-08-21

- Add a project overview dashboard with work health, release milestones, active work, attention items, and collaborators.
- Keep conversation results copyable while an Issue is running or otherwise editing-locked.

## [0.4.9-beta.31] - 2026-08-21

- Recover interrupted Issue turns after Session Host replacement instead of leaving them permanently active.

## [0.4.9-beta.30] - 2026-08-21

- Keep the Preview project-management feature flag consistent across the manifest and Web navigation.

## [0.4.9-beta.29] - 2026-08-21

- Persist supported Web commands across Runtime outages with Relay queuing, browser outbox recovery, idempotent Runtime receipts, and durable Codex thread effects.

## [0.4.9-beta.28] - 2026-08-21

- Route linked Codex thread actions through the persistent Session Host and stop stale hosts during upgrades and restarts.
- Keep compact Web navigation, project Issue loading, and clipboard fallback reliable on mobile browsers.

## [0.4.9-beta.27] - 2026-08-21

- Remember Relay browser devices, list active sessions locally, and revoke access without changing the account password.
- Keep expanded conversations at the full mobile viewport height.

## [0.4.9-beta.26] - 2026-08-21

- Replace handwritten Relay WebSocket framing with the maintained transport so large Issue requests do not disconnect the Runtime.

## [0.4.9-beta.25] - 2026-08-21

- Retry idempotent Relay writes through brief Runtime disconnects and report an error only after bounded reconnect attempts fail.

## [0.4.9-beta.24] - 2026-08-20

- Keep login, reconnect, and user-stopped conversation states interactive without blocking error dialogs.

## [0.4.9-beta.23] - 2026-08-20

- Keep archived and deleted Issues synchronized with their linked Codex threads.
- Surface actionable Relay and browser diagnostics while redacting sensitive request data.
- Improve task-board loading, Issue dialogs, Agent creation, and mobile Web navigation.
- Add a compact label picker with touch-friendly menus for remote Issue editing.

## [0.4.9-beta.22] - 2026-08-20

- Keep active Hub and Relay browser sessions signed in while they remain in use.
- Open expanded Issue details inside the current workspace with clearer navigation back to the board.
- Keep compact Web dialogs, conversations, shortcuts, and attachment transfers stable on mobile browsers.
- Let remote users collapse the Web sidebar and resume the current route after the Runtime reconnects.

## [0.4.9-beta.21] - 2026-08-20

- Allow installer health commands enough time to finish on slower macOS CLI cold starts.

## [0.4.9-beta.20] - 2026-08-20

- Browse folders on the local Runtime when creating projects from the remote Web workspace.
- Keep a single Session Host active and recover stale process locks and local endpoints safely.
- Ignore late Relay frames for channels that have already closed.
- Improve Issue detail sizing, full-screen behavior, project menus, and keyboard handling on compact Web layouts.

## [0.4.9-beta.19] - 2026-08-19

- Remove password confirmation from every update path and keep local Codex distinct from remote Relay and Web hosts.

## [0.4.9-beta.18] - 2026-08-19

- Keep Codex open while installers upgrade the Core, Runtime, Skill, MCP registration, and page integration.
- Start one injector through a serialized readiness path instead of depending on Runtime polling.
- Report page injection as ready only when the injector, sidebar entry, and panel are active.

## [0.4.9-beta.17] - 2026-08-19

- Bundle the Better Codex usage Skill and keep it synchronized during Core upgrades.
- Validate the packaged MCP server and repair its registration during installation and upgrades.
- Let Beta releases publish after compilation and packaging while retaining the complete CI and acceptance gates for formal releases.

## [0.4.9-beta.16] - 2026-08-19

- Keep test child processes from starting detached session-host delegation.

## [0.4.9-beta.15] - 2026-08-19

- Prevent eval and stdin entrypoints from recursively spawning Better Codex child processes.

## [0.4.9-beta.14] - 2026-08-19

### Fixed

- Close the simulated failed Relay upgrade connection so Windows packaging can finish the reconnect regression test.

## [0.4.9-beta.13] - 2026-08-19

### Fixed

- Resume Relay reconnect backoff after an HTTP handshake failure instead of leaving the WebSocket pending.

## [0.4.9-beta.12] - 2026-08-19

### Fixed

- Treat Relay-hosted WebUI as remote so browser attachments are streamed to the Runtime.

## [0.4.9-beta.11] - 2026-08-19

### Fixed

- Keep the Runtime responsive while the system directory picker is open.

## [0.4.9-beta.10] - 2026-08-19

### Fixed

- Bound the Node test runner lifecycle after completed assertions so platform-specific handles cannot stall packaging.

## [0.4.9-beta.9] - 2026-08-19

### Fixed

- Run Relay Runtime acceptance against the built CLI so Intel packaging does not inherit the TypeScript transform service.

## [0.4.9-beta.8] - 2026-08-19

### Fixed

- Terminate the complete Relay E2E Runtime process group during packaging.

## [0.4.9-beta.7] - 2026-08-19

### Fixed

- Close Relay event streams deterministically and serialize Relay test execution during packaging.

## [0.4.9-beta.6] - 2026-08-19

### Fixed

- Preserve remote Issue and reply attachments across Relay retries with deterministic local paths, bounded request bodies, and cleanup on rejected writes.
- Keep one Relay request ID across Web UI timeout retries and verify the public Relay against a real Runtime through offline recovery.

## [0.4.9-beta.5] - 2026-08-19

### Added

- Route the complete remote Web UI through an authenticated outbound Runtime WebSocket tunnel with streaming, backpressure, cancellation, file transfer, and idempotent writes while keeping local SQLite authoritative.

### Changed

- Replace the default projection-based Hub with a data-blind Relay, retain projection sync as an explicit rollback mode, and migrate self-hosted deployments without copying business data to the VPS.

## [0.4.9-beta.4] - 2026-08-18

### Fixed

- Keep Runtime Web host event tests isolated from background session relay lifecycle updates.

## [0.4.9-beta.3] - 2026-08-18

### Fixed

- Run native session relay commands from the Runtime so hidden or suspended Codex windows cannot stall Issue execution.

## [0.4.9-beta.2] - 2026-08-18

### Fixed

- Keep native session relay polling and lease heartbeats active while the Codex window is hidden.

## [0.4.9-beta.1] - 2026-08-18

### Added

- Choose a local project folder through the system directory picker when creating projects from the task board or project workspace, including the remote Web UI.
- Open Issue card actions with a touch long press on pointer-coarse devices.

### Changed

- Simplify remote access setup around the supported VPS Hub flow and remove the retired Cloudflare deployment path.

## [0.4.8] - 2026-08-17

### Added

- Add a project workspace with issue activity, generated documentation views, and project relationship maps.
- Generate concise Issue titles with the configured scheduler model while preserving the original request as the description.
- Transfer attachments when creating or editing Issues from the remote Web UI.
- Add message separators and hover-to-copy controls to Issue conversations.

### Changed

- Use full-screen create and detail dialogs on compact Web layouts and keep the mobile task toolbar usable at narrow widths.

## [0.4.7] - 2026-08-17

### Fixed

- Reconcile desktop turns against Codex thread state so completed, interrupted, and failed runs no longer leave cards stuck as working.
- Open the installer directly after a manual update check reports a new version.
- Show Codex usage, Agent model and reasoning settings, automatic-run state, and live Runtime connection details in the remote Web UI.
- Repair stale macOS Runtime service configuration automatically before launch.

## [0.4.6] - 2026-08-16

### Added

- Check signed Hub releases from the remote Web workspace and offer password-confirmed online upgrades for VPS deployments.
- Install Better Codex Web as a standalone app and import native sessions by dragging them onto the board.
- Choose whether message fields send with Enter or the platform shortcut.

### Changed

- Back up, rebuild, verify public health, and roll back VPS deployments through a restricted host-side update trigger without exposing Docker control to the Web container.
- Show signed update availability in Cloudflare Web deployments while keeping deployment changes on the Cloudflare host.

### Fixed

- Keep project pickers and board filtering inside their scroll boundaries, sort project lists by recent activity, and preserve dialog expansion by context.
- Recover uncertain replies, reconcile completed Issue conversations with their latest turn, and simplify connected remote access.

## [0.4.5] - 2026-08-13

### Added

- Add an event-driven Cloudflare Hub using Workers, Durable Objects, R2 backups, browser authentication, and remote task controls.
- Add a Remote access tab with guided VPS and Cloudflare deployment, Runtime connection, live service status, version details, browser access, and verified upgrade prompts.

### Changed

- Replace idle sync polling with a WebSocket control channel that wakes the Runtime only when local changes or remote commands need attention.
- Guide remote installation through version-pinned Codex prompts backed by an executable self-hosting runbook.

### Fixed

- Keep remote commands idempotent across retries and reconnects, and improve the remote Web workspace on narrow screens.
- Preserve existing reverse proxies, credentials, Cloudflare resources, and valid partial installations during guided deployment and recovery.
- Authenticate the self-hosting runbook and installer before Codex reads or executes release instructions.
- Align the expanded Issue workspace and keep its header controls usable in narrow windows.

## [0.4.5-beta.2] - 2026-08-13

### Added

- Add an event-driven Cloudflare Hub using Workers, Durable Objects, R2 backups, browser authentication, and remote task controls.
- Add a Remote access tab with one-command VPS and Cloudflare setup, guided Runtime connection, live service status, version details, browser access, and upgrade commands.

### Changed

- Replace idle sync polling with a WebSocket control channel that wakes the Runtime only when local changes or remote commands need attention.

### Fixed

- Keep remote commands idempotent across retries and reconnects, and improve the remote Web workspace on narrow screens.

## [0.4.5-beta.1] - 2026-08-13

### Fixed

- Align the expanded Issue workspace and keep its header controls usable in narrow windows.

## [0.4.4] - 2026-08-13

### Fixed

- Prevent repeated create events and retried requests from creating duplicate tasks.
- Let tasks stuck before their Codex conversation starts stop cleanly so they can be archived and permanently deleted.

## [0.4.3] - 2026-08-12

### Added

- Add a local browser workspace and a self-hosted Hub with privacy-filtered board synchronization, remote Issue controls, device access management, backup and restore, and Caddy-based HTTPS deployment.
- Show the active Codex profile and remaining usage windows in the local Web workspace.

### Changed

- Replace the cancelled task status with archive actions across local and self-hosted boards, and migrate existing cancelled tasks into the archive.
- Keep the self-hosted Hub and local Runtime on the same v0.4.3 synchronization protocol when deploying or upgrading remote access.

### Fixed

- Keep remote Agent assignment, execution state, conversations, replies, attachments, avatars, and completion activity synchronized with the local Runtime.
- Preserve the Web workspace, creation preferences, and unread completion notices across sidebar changes, reloads, and Runtime reinjection.
- Let a newly paired Runtime take over an existing Hub projection without clearing synchronized data or leaving remote commands assigned to the old device.
- Rate-limit self-hosted Web logins by the original client address behind the bundled Caddy proxy instead of sharing one lockout across all remote users.

### Security

- Protect self-hosted access with separate bootstrap, device, and Web credentials, password hashing, secure sessions, request validation, rate limiting, security headers, and audit records.

## [0.4.3-beta.8] - 2026-08-12

### Added

- Show the active Codex profile and remaining usage windows in the local Web workspace.

### Changed

- Upgrade self-hosted synchronization to v5; the Hub and local Runtime must run the same Beta.
- Replace the cancelled task status with archive actions across local and self-hosted boards, and migrate existing cancelled tasks into the archive.

### Fixed

- Keep Better Codex mounted when the native sidebar collapses.
- Preserve the continue-creating preference and unread completion notifications across reloads and Runtime reinjection.

## [0.4.3-beta.7] - 2026-08-12

### Removed

- Remove the creator workflow and workflow sidebar from the main release line.

## [0.4.3-beta.6] - 2026-08-12

### Changed

- Upgrade self-hosted synchronization to v4 for synchronized Agent avatars, completion activity, and Web file replies.

### Fixed

- Keep Web Issue conversations current, show card workflow status consistently, and restore completion notifications across the local and remote surfaces.
- Preserve custom Agent avatars in WebUI, keep expanded card details compact, and restore the attachment and send controls in the reply composer.

## [0.4.3-beta.5] - 2026-08-12

### Added

- Add an activatable creator workflow with dedicated Agents, native Codex conversation handoffs, approval gates, and a rounded workflow sidebar.

## [0.4.3-beta.4] - 2026-08-12

### Changed

- Upgrade self-hosted synchronization to v3; the Hub and local Runtime must run the same Beta.

### Fixed

- Show privacy-filtered conversation history in self-hosted Issue cards, and let users reply or stop the linked Codex session without leaving the card.
- Keep claimed, running, scheduling, completed, failed, and interrupted execution states in sync with the self-hosted Web UI.

## [0.4.3-beta.3] - 2026-08-12

### Fixed

- Keep the desktop injector from replacing the self-hosted Web UI injection when both surfaces are open in Codex.
- Show completed resumable Agent sessions as completed instead of active or not started in the self-hosted Web UI.

## [0.4.3-beta.2] - 2026-08-12

### Changed

- Upgrade self-hosted synchronization to v2; the Hub and local Runtime must run the same Beta.

### Fixed

- Keep the safe Agent directory and assignment state available after remote deployment, and let the Web UI assign and start Agent tasks through the local Runtime.
- Keep the macOS Codex session relay connected when trusted ChatGPT helper processes inherit the same local debugging socket.

## [0.4.3-beta.1] - 2026-08-12

### Added

- Add a local browser host and a self-hosted Hub that synchronizes a privacy-filtered Better Codex board projection, supports acknowledged remote Issue commands, and keeps the local Runtime as the sole authoritative writer.
- Add password-protected remote Web access, device pairing and revocation, conflict-aware pending commands, backup and restore, Caddy HTTPS deployment, and candidate-bound browser and container acceptance automation.

### Security

- Separate bootstrap, device, and Web credentials; hash Web passwords with scrypt; use Secure HttpOnly same-site sessions with CSRF, Origin and Host validation, rate limiting, security headers, and audit records.

## [0.4.2] - 2026-08-11

### Added

- Initialize the development database from a one-time snapshot of the Stable database while keeping later Dev changes isolated.

### Changed

- Default Issue creation to an Agent, keep manual creation behind explicit controls, and order the project picker by newest project creation.
- Show current, repair, update, and upgrade states accurately in the Windows installer, with clearer restart choices and progress feedback.

### Fixed

- Keep native session completion, replies, relay leadership, configuration changes, manual turns, imported activity, and interruption recovery consistent across retries, renderer loss, and Runtime restarts.
- Refresh stale Codex CLI paths after Codex Desktop updates, keep sidebar utility controls from closing Better Codex, and preserve correct project ordering.
- Authenticate the local Codex debugger before injection, verify the Windows Beta installer through the signed Preview feed, and resolve Homebrew-packaged Skills through Cellar symlinks.

## [0.4.2-beta.2] - 2026-08-11

### Added

- Add one-command Beta release preparation that synchronizes version sources and changelog links, runs local release checks, and shares its validation with the Preview workflow.
- Add a private security reporting policy and capability-based Codex compatibility guidance.

### Fixed

- Make the Windows shortcut check only for a running Codex process, then ask before restarting it so injection can start; when Codex is not running, launch it immediately.
- Use the standard Windows dialog frame, system font, colors, controls, and close button for restart confirmation.
- Keep Better Codex open when sidebar utility controls are clicked, while still leaving the surface for actual navigation items.

## [0.4.2-beta.1] - 2026-08-11

### Fixed

- Refresh a cached Codex CLI path when a Codex Desktop update removes the previous versioned executable, keeping Issue enrichment, execution, scheduling, replies, and model discovery available without restarting Better Codex.

## [0.4.1] - 2026-08-11

### Added

- Add a signed Preview update channel with one-line Beta installers for macOS and Windows.

### Changed

- Replace the embedded Node.js executable with a system-Node bundle, reducing installer and core update downloads while preserving transactional migration from legacy executables.

### Fixed

- Preserve the Preview channel across upgrades and reinstalls, validate updates in a temporary staging directory, and authenticate release checksums before extraction.
- Resolve an executable per-user Codex CLI on Windows for Runtime tasks, MCP setup, model discovery, and diagnostics.
- Bound installer, updater, CDP HTTP, and WebSocket operations with explicit timeouts and reliable process cleanup on macOS and Windows.

## [0.4.1-beta.8] - 2026-08-10

### Added

- Add a one-line macOS Beta installer that resolves the current Preview release for Apple silicon and Intel Macs.

## [0.4.1-beta.7] - 2026-08-10

### Fixed

- Automatically resolve an executable Codex CLI on Windows for Issue enrichment, task execution, scheduling, session replies, model discovery, and MCP setup instead of relying on npm command wrappers in the background Runtime.

## [0.4.1-beta.6] - 2026-08-10

### Fixed

- Keep the Windows Runtime and injector alive after successful installer commands while retaining full process-tree cleanup on timeout.
- Migrate legacy standalone executables directly to the Node.js bundle instead of passing the archive through the incompatible legacy core updater.

## [0.4.1-beta.5] - 2026-08-10

### Added

- Publish a fixed one-line Windows installer for the current Preview release and keep installations subscribed to the Preview channel.

### Fixed

- Generate valid PowerShell when waiting for Codex to quit during setup, and avoid overwriting an unchanged legacy executable during rollback.

## [0.4.1-beta.4] - 2026-08-10

### Fixed

- Automatically select and persist the Preview update channel when installing a Beta release, including upgrades and reinstalls.
- Validate downloaded core updates in a temporary staging directory so failed packages do not leave version directories behind.
- Let Issue detail dialogs size to their content when no conversation is shown, with clearer hover and focus feedback for editable fields.

## [0.4.1-beta.3] - 2026-08-10

### Changed

- Replace the embedded Node.js executable with a small system-Node bundle, reducing Windows installer downloads from about 32 MiB to under 1 MiB and core updates from about 84 MiB to about 2.3 MiB.
- Check for Node.js 22.5 or later before installation and ask before installing Node.js when the dependency is missing or outdated.
- Migrate legacy standalone executables transactionally: verify the new bundle and integrations first, preserve the database throughout, and remove the old executable only after diagnostics pass.
- Authenticate release archive checksums with the existing Ed25519 update key before extracting remotely downloaded bundles.

### Fixed

- Allow packaged Node bundles to download, validate, activate, and roll back managed core updates.
- Extend the updater download deadline so slower networks are not limited to 15 seconds.
- Prefer the executable per-user Codex CLI on Windows instead of accepting an inaccessible WindowsApps path during MCP setup and diagnostics.

## [0.4.1-beta.2] - 2026-08-10

### Fixed

- Limit test-file concurrency so lifecycle and Gateway integration tests remain deterministic on shared Windows CI runners.

## [0.4.1-beta.1] - 2026-08-10

### Added

- Add a persistent Preview update channel for Beta testers while keeping the same Better Codex configuration and data directory.
- Publish signed Beta artifacts through a dedicated GitHub prerelease workflow without changing the stable or Homebrew release lanes.

### Fixed

- Prevent Windows upgrades and rollbacks from stalling when a surviving Codex process leaves the CDP endpoint connected but unresponsive.
- Bound installer, CDP HTTP, and WebSocket operations with explicit timeouts and clean up the complete Codex process tree after helper shutdown.
- Apply the same bounded command execution to macOS installation, upgrade, setup, diagnostics, and rollback paths.

## [0.4.0] - 2026-08-10

### Added

- Run stable binaries and source checkouts side by side with isolated data directories and launchers, handing off the active Codex page injection when switching profiles.
- Verify that packaged installers can install and reinstall the current archive on Apple silicon, Intel macOS, and Windows during CI and release builds.

### Changed

- Label source checkouts as development builds in the update screen and limit them to compatibility-layer updates.

### Fixed

- Keep native progress written to stderr from becoming a Windows PowerShell 5.1 installation failure.
- Validate local package inputs and normalize update-key line endings during installer compatibility tests.
- Preserve legacy injection ownership during profile handoff and coalesce repeated launcher clicks so the latest profile request wins.

## [0.3.17] - 2026-08-10

### Changed

- Refresh the English README and add a complete Simplified Chinese README.
- Keep release version and changelog validation in the tag-triggered release workflow.

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

[Unreleased]: https://github.com/Ericwong5021/better-codex/compare/v0.4.10-beta.13...HEAD
[0.4.10-beta.13]: https://github.com/Ericwong5021/better-codex/compare/v0.4.10-beta.12...v0.4.10-beta.13
[0.4.10-beta.12]: https://github.com/Ericwong5021/better-codex/compare/v0.4.10-beta.11...v0.4.10-beta.12
[0.4.10-beta.11]: https://github.com/Ericwong5021/better-codex/compare/v0.4.10-beta.10...v0.4.10-beta.11
[0.4.10-beta.10]: https://github.com/Ericwong5021/better-codex/compare/v0.4.10-beta.9...v0.4.10-beta.10
[0.4.10-beta.9]: https://github.com/Ericwong5021/better-codex/compare/v0.4.10-beta.8...v0.4.10-beta.9
[0.4.10-beta.8]: https://github.com/Ericwong5021/better-codex/compare/v0.4.10-beta.7...v0.4.10-beta.8
[0.4.10-beta.7]: https://github.com/Ericwong5021/better-codex/compare/v0.4.10-beta.6...v0.4.10-beta.7
[0.4.10-beta.6]: https://github.com/Ericwong5021/better-codex/compare/v0.4.10-beta.5...v0.4.10-beta.6
[0.4.10-beta.5]: https://github.com/Ericwong5021/better-codex/compare/v0.4.10-beta.4...v0.4.10-beta.5
[0.4.10-beta.4]: https://github.com/Ericwong5021/better-codex/compare/v0.4.10-beta.3...v0.4.10-beta.4
[0.4.10-beta.3]: https://github.com/Ericwong5021/better-codex/compare/v0.4.10-beta.2...v0.4.10-beta.3
[0.4.10-beta.2]: https://github.com/Ericwong5021/better-codex/compare/v0.4.10-beta.1...v0.4.10-beta.2
[0.4.10-beta.1]: https://github.com/Ericwong5021/better-codex/compare/v0.4.9...v0.4.10-beta.1
[0.4.9]: https://github.com/Ericwong5021/better-codex/compare/v0.4.8...v0.4.9
[0.4.9-beta.34]: https://github.com/Ericwong5021/better-codex/compare/v0.4.9-beta.33...v0.4.9-beta.34
[0.4.9-beta.33]: https://github.com/Ericwong5021/better-codex/compare/v0.4.9-beta.32...v0.4.9-beta.33
[0.4.9-beta.32]: https://github.com/Ericwong5021/better-codex/compare/v0.4.9-beta.31...v0.4.9-beta.32
[0.4.9-beta.31]: https://github.com/Ericwong5021/better-codex/compare/v0.4.9-beta.30...v0.4.9-beta.31
[0.4.9-beta.30]: https://github.com/Ericwong5021/better-codex/compare/v0.4.9-beta.29...v0.4.9-beta.30
[0.4.9-beta.29]: https://github.com/Ericwong5021/better-codex/compare/v0.4.9-beta.28...v0.4.9-beta.29
[0.4.9-beta.28]: https://github.com/Ericwong5021/better-codex/compare/v0.4.9-beta.27...v0.4.9-beta.28
[0.4.9-beta.27]: https://github.com/Ericwong5021/better-codex/compare/v0.4.9-beta.26...v0.4.9-beta.27
[0.4.9-beta.26]: https://github.com/Ericwong5021/better-codex/compare/v0.4.9-beta.25...v0.4.9-beta.26
[0.4.9-beta.25]: https://github.com/Ericwong5021/better-codex/compare/v0.4.9-beta.24...v0.4.9-beta.25
[0.4.9-beta.24]: https://github.com/Ericwong5021/better-codex/compare/v0.4.9-beta.23...v0.4.9-beta.24
[0.4.9-beta.23]: https://github.com/Ericwong5021/better-codex/compare/v0.4.9-beta.22...v0.4.9-beta.23
[0.4.9-beta.22]: https://github.com/Ericwong5021/better-codex/compare/v0.4.9-beta.21...v0.4.9-beta.22
[0.4.9-beta.21]: https://github.com/Ericwong5021/better-codex/compare/v0.4.9-beta.20...v0.4.9-beta.21
[0.4.9-beta.20]: https://github.com/Ericwong5021/better-codex/compare/v0.4.9-beta.19...v0.4.9-beta.20
[0.4.9-beta.19]: https://github.com/Ericwong5021/better-codex/compare/v0.4.9-beta.18...v0.4.9-beta.19
[0.4.9-beta.18]: https://github.com/Ericwong5021/better-codex/compare/v0.4.9-beta.17...v0.4.9-beta.18
[0.4.9-beta.17]: https://github.com/Ericwong5021/better-codex/compare/v0.4.9-beta.16...v0.4.9-beta.17
[0.4.9-beta.16]: https://github.com/Ericwong5021/better-codex/compare/v0.4.9-beta.15...v0.4.9-beta.16
[0.4.9-beta.15]: https://github.com/Ericwong5021/better-codex/compare/v0.4.9-beta.14...v0.4.9-beta.15
[0.4.9-beta.14]: https://github.com/Ericwong5021/better-codex/compare/v0.4.9-beta.13...v0.4.9-beta.14
[0.4.9-beta.13]: https://github.com/Ericwong5021/better-codex/compare/v0.4.9-beta.12...v0.4.9-beta.13
[0.4.9-beta.12]: https://github.com/Ericwong5021/better-codex/compare/v0.4.9-beta.11...v0.4.9-beta.12
[0.4.9-beta.11]: https://github.com/Ericwong5021/better-codex/compare/v0.4.9-beta.10...v0.4.9-beta.11
[0.4.9-beta.10]: https://github.com/Ericwong5021/better-codex/compare/v0.4.9-beta.9...v0.4.9-beta.10
[0.4.9-beta.9]: https://github.com/Ericwong5021/better-codex/compare/v0.4.9-beta.8...v0.4.9-beta.9
[0.4.9-beta.8]: https://github.com/Ericwong5021/better-codex/compare/v0.4.9-beta.7...v0.4.9-beta.8
[0.4.9-beta.7]: https://github.com/Ericwong5021/better-codex/compare/v0.4.9-beta.6...v0.4.9-beta.7
[0.4.9-beta.6]: https://github.com/Ericwong5021/better-codex/compare/v0.4.9-beta.5...v0.4.9-beta.6
[0.4.9-beta.5]: https://github.com/Ericwong5021/better-codex/compare/v0.4.9-beta.4...v0.4.9-beta.5
[0.4.9-beta.4]: https://github.com/Ericwong5021/better-codex/compare/v0.4.9-beta.3...v0.4.9-beta.4
[0.4.9-beta.3]: https://github.com/Ericwong5021/better-codex/compare/v0.4.9-beta.2...v0.4.9-beta.3
[0.4.9-beta.2]: https://github.com/Ericwong5021/better-codex/compare/v0.4.9-beta.1...v0.4.9-beta.2
[0.4.9-beta.1]: https://github.com/Ericwong5021/better-codex/compare/v0.4.8...v0.4.9-beta.1
[0.4.8]: https://github.com/Ericwong5021/better-codex/compare/v0.4.7...v0.4.8
[0.4.7]: https://github.com/Ericwong5021/better-codex/compare/v0.4.6...v0.4.7
[0.4.6]: https://github.com/Ericwong5021/better-codex/compare/v0.4.5...v0.4.6
[0.4.5]: https://github.com/Ericwong5021/better-codex/compare/v0.4.4...v0.4.5
[0.4.5-beta.2]: https://github.com/Ericwong5021/better-codex/compare/v0.4.5-beta.1...v0.4.5-beta.2
[0.4.5-beta.1]: https://github.com/Ericwong5021/better-codex/compare/v0.4.4...v0.4.5-beta.1
[0.4.4]: https://github.com/Ericwong5021/better-codex/compare/v0.4.3...v0.4.4
[0.4.3]: https://github.com/Ericwong5021/better-codex/compare/v0.4.2...v0.4.3
[0.4.3-beta.8]: https://github.com/Ericwong5021/better-codex/compare/v0.4.3-beta.7...v0.4.3-beta.8
[0.4.3-beta.7]: https://github.com/Ericwong5021/better-codex/compare/v0.4.3-beta.6...v0.4.3-beta.7
[0.4.3-beta.6]: https://github.com/Ericwong5021/better-codex/compare/v0.4.3-beta.5...v0.4.3-beta.6
[0.4.3-beta.5]: https://github.com/Ericwong5021/better-codex/compare/v0.4.3-beta.4...v0.4.3-beta.5
[0.4.3-beta.4]: https://github.com/Ericwong5021/better-codex/compare/v0.4.3-beta.3...v0.4.3-beta.4
[0.4.3-beta.3]: https://github.com/Ericwong5021/better-codex/compare/v0.4.3-beta.2...v0.4.3-beta.3
[0.4.3-beta.2]: https://github.com/Ericwong5021/better-codex/compare/v0.4.3-beta.1...v0.4.3-beta.2
[0.4.3-beta.1]: https://github.com/Ericwong5021/better-codex/compare/v0.4.2...v0.4.3-beta.1
[0.4.2]: https://github.com/Ericwong5021/better-codex/compare/v0.4.1...v0.4.2
[0.4.2-beta.2]: https://github.com/Ericwong5021/better-codex/compare/v0.4.2-beta.1...v0.4.2-beta.2
[0.4.2-beta.1]: https://github.com/Ericwong5021/better-codex/compare/v0.4.1...v0.4.2-beta.1
[0.4.1]: https://github.com/Ericwong5021/better-codex/compare/v0.4.0...v0.4.1
[0.4.1-beta.8]: https://github.com/Ericwong5021/better-codex/compare/v0.4.1-beta.7...v0.4.1-beta.8
[0.4.1-beta.7]: https://github.com/Ericwong5021/better-codex/compare/v0.4.1-beta.6...v0.4.1-beta.7
[0.4.1-beta.6]: https://github.com/Ericwong5021/better-codex/compare/v0.4.1-beta.5...v0.4.1-beta.6
[0.4.1-beta.5]: https://github.com/Ericwong5021/better-codex/compare/v0.4.1-beta.4...v0.4.1-beta.5
[0.4.1-beta.4]: https://github.com/Ericwong5021/better-codex/compare/v0.4.1-beta.3...v0.4.1-beta.4
[0.4.1-beta.3]: https://github.com/Ericwong5021/better-codex/compare/v0.4.1-beta.2...v0.4.1-beta.3
[0.4.1-beta.2]: https://github.com/Ericwong5021/better-codex/compare/v0.4.1-beta.1...v0.4.1-beta.2
[0.4.1-beta.1]: https://github.com/Ericwong5021/better-codex/compare/v0.4.0...v0.4.1-beta.1
[0.4.0]: https://github.com/Ericwong5021/better-codex/compare/v0.3.17...v0.4.0
[0.3.17]: https://github.com/Ericwong5021/better-codex/compare/v0.3.16...v0.3.17
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
