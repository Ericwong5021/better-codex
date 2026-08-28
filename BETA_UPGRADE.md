# Better Codex Beta upgrade guide

<p align="center">
  <a href="BETA_UPGRADE.zh.md">简体中文</a> · English
</p>

Use this guide after a Beta release has finished publishing to the signed Preview feed. A Git tag or draft release alone does not mean the version is ready to install.

## Know what gets upgraded

Local and remote installations are separate upgrade targets:

| Where you start the update | What it upgrades | What it does not upgrade |
| --- | --- | --- |
| Better Codex inside the local Codex app | Local CLI, Runtime, Skill, MCP integration, launcher, and page integration | VPS Relay and remote Web UI |
| Better Codex in the public remote browser | VPS Relay and remote Web UI | Local Runtime and local installation |

The local Runtime remains the only owner of Projects, Issues, Agents, Conversations, attachments, and run data. The Relay stores authentication, Web sessions, devices, settings, and audit records, but no Better Codex business data.

If you use remote access, finish both upgrades and verify that the Runtime and Relay report the same target Beta version.

## Before upgrading

- Wait until the maintainer confirms that the signed Preview feed and release assets are complete.
- Record the complete target version, such as `vX.Y.Z-beta.N`.
- Keep Codex open during a local update and keep the browser open during an online Relay update.
- Resolve any storage warning before a routine upgrade. Critical storage pressure blocks staging.
- Do not uninstall Better Codex or delete `~/.better-codex`, `%USERPROFILE%\.better-codex`, `/opt/better-codex`, Relay volumes, or secrets as part of an upgrade.

## Join the Beta channel for the first time

### Local installation

Install the current Beta on macOS:

```bash
curl -fsSL https://raw.githubusercontent.com/Ericwong5021/better-codex/main/scripts/install-beta.sh | bash
```

Install the current Beta on Windows PowerShell:

```powershell
irm https://raw.githubusercontent.com/Ericwong5021/better-codex/main/scripts/install-beta.ps1 | iex
```

The Beta installer selects the `preview` channel and upgrades the existing installation in place. It keeps the current configuration and local task database.

### Existing stable Relay

A Relay selects its update channel from the installed server version. A stable Relay checks the Stable feed and will not offer a Beta in the Web UI.

Verify the target release and its `selfhost.sh`, `checksums.txt`, `checksums.sig`, `update-public-key.pem`, and `source-commit.txt` as described in the [self-hosting runbook](SELF_HOSTING.md). Then upgrade the existing VPS deployment to the exact Beta:

```bash
sudo env BETTER_CODEX_SELFHOST_DIR=/opt/better-codex \
  bash /opt/better-codex/scripts/selfhost.sh upgrade vps vX.Y.Z-beta.N
```

Replace `/opt/better-codex` if the deployment uses another absolute path. After the Relay is on a Beta version, its online updater follows the Preview feed for later Beta upgrades.

## Upgrade an existing Beta installation

### Upgrade the VPS Relay and remote Web UI

If remote access is enabled, upgrade the VPS service first:

1. Sign in to the public Better Codex Web UI.
2. Open `More` → `Remote access`.
3. Select `Check for update` or `Upgrade` beside the service version.
4. Keep the page open while the service verifies the release, backs up its authentication database, rebuilds, restarts, and runs its health checks.
5. Wait for `Remote service upgrade complete` and confirm that the displayed service version matches the target Beta.

The public page may disconnect briefly while the Relay restarts. Existing work continues in the local Runtime, but the public browser cannot send new requests until the Relay is ready and the Runtime reconnects.

If the page reports that online installation is unavailable, the Relay is still on the Stable channel, or the online upgrade fails, use the exact-version VPS command from the previous section. The self-hosting upgrade preserves the deployment mode and secrets, creates a database backup, checks the requested version, and restores the previous deployment if validation fails.

### Upgrade the local Runtime

Use the update notice inside the local Codex app and select `Update now`. To check manually, open `Help and settings` → `About` → `Check for updates`.

The command-line path is:

```bash
better-codex version
better-codex update channel preview
better-codex update check
better-codex update
```

Runtime activation pauses new dispatch while compatible active conversations continue in the Session Host and Codex App Server. New tasks start after replay, reconciliation, and Runtime readiness complete. Keep Codex open until the page reports that the update finished.

If page integration does not refresh after a successful installation, reopen Codex from the Better Codex launcher. The Skill and MCP installation do not require a Codex restart.

## Verify the completed upgrade

Check the local installation:

```bash
better-codex version
better-codex doctor
better-codex status
better-codex mcp status
better-codex launcher status
```

If remote access is enabled, replace `relay.example.com` with the public Relay host and also run:

```bash
better-codex relay status
better-codex relay doctor
curl -fsSL "https://relay.example.com/healthz"
curl -fsSL "https://relay.example.com/readyz"
```

Acceptance requires all of the following:

- The local Runtime and VPS Relay report the target Beta version.
- `better-codex relay status` reports `connected: true` and `last_error: null`.
- The Runtime and Relay report `relay/v1` and fresh matching connection identity details.
- Public `/healthz` reports `ok: true`, `name: "Better Codex Relay"`, and the target version.
- Public `/readyz` reports `ok: true`, `runtime_ready: true`, healthy storage and database state, and a fresh Runtime heartbeat.
- A signed-in browser can open the board and complete a real authenticated read and write flow.

If the browser still shows an older shell after the Relay upgrade, reload `/web` once with a version query, such as `/web?v=X.Y.Z-beta.N`.

## If an upgrade fails

Do not treat a published release, an accepted update request, a healthy process, or a visible login page as proof that the upgrade completed.

For a local failure, keep the current installation and collect:

```bash
better-codex version
better-codex doctor
better-codex status
better-codex service status
better-codex service logs --lines 100
better-codex relay status
```

Record the operating system, architecture, Codex version and distribution, requested Better Codex version, exact error, reproduction steps, and a redacted diagnostic result. If the UI says the previous Runtime was restored, verify the installed and serving version before retrying.

For a Relay failure, preserve the backup, current checkout, Compose mode, proxy configuration, volumes, and updater state. Follow the recovery section in [SELF_HOSTING.md](SELF_HOSTING.md). Never use `docker compose down -v` as routine recovery.

## Return to Stable updates

Set the local update channel back to Stable:

```bash
better-codex update channel stable
```

Changing the channel does not silently downgrade a newer Beta. Install an exact Stable release only after its signed assets are complete. A Beta Relay also needs an exact-version VPS upgrade before it returns to the Stable update feed.
