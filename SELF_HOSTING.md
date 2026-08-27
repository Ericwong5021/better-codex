# Better Codex Self-hosting Runbook for AI Agents

This runbook is the source of truth for an AI agent installing or upgrading Better Codex Relay on a VPS. The user prompt supplies the target version. Inspect first, preserve existing services and data, and do not report success until the public deployment and Runtime tunnel are verified.

## Execution contract

- Work only on the machine or account authorized by the user.
- Use the exact release version from the user prompt. Do not deploy a moving branch.
- Read current state before changing it. Reuse a valid partial installation.
- Never print passwords, administrator tokens, pairing codes, device tokens, cookies, or secret file contents.
- Ask before privileged commands, firewall changes, proxy changes, service reloads, or destructive recovery.
- Do not stop or replace unrelated websites, containers, proxies, or services.
- Do not delete `/opt/better-codex`, deployment volumes, or existing secrets to recover from an interrupted installation.
- Do not expose the Relay application port directly to the public Internet.
- Keep the local Runtime and remote Relay on a compatible `relay/v1` release. Matching versions are preferred during upgrades.
- Stop after a failed acceptance gate, diagnose the cause, and resume from that stage.

## Inputs

Collect only the required values:

- Exact release, such as `v0.4.5`.
- Public domain.
- Browser username.
- Browser password of at least 8 characters.
- VPS SSH target when Codex is not running on the server.

The first browser credential becomes the initial Web account. Additional Web accounts are created only through the administrator-authenticated Better Codex CLI. The Web UI has no registration endpoint.

## Verify the release

Before executing repository code:

1. Download `SELF_HOSTING.md`, `checksums.txt`, `checksums.sig`, `update-public-key.pem`, and `source-commit.txt` from the selected GitHub Release without reading or executing the runbook first.
2. Verify the public key SHA-256 is `1007607762db32004da21780e81875bef8453355a2944524a96e5341e1e3963e`.
3. Verify the Ed25519 signature of `checksums.txt` with `update-public-key.pem`.
4. Verify the checksums of `SELF_HOSTING.md` and `source-commit.txt`.
5. Read this runbook only after its checksum passes.
6. Fetch the selected Git tag and confirm its dereferenced commit equals `source-commit.txt`.
7. Check out that exact commit in detached mode.

The released `scripts/selfhost.sh` performs these checks on supported Bash systems. An agent using native PowerShell must perform the equivalent checks before continuing.

## Deployment path

Use this path for a Linux server and a domain. The agent may run directly on the server or connect to it through SSH.

## VPS installation

### 1. Inspect the server

Inspect without changing state:

```bash
uname -a
command -v git curl openssl docker
docker compose version
docker info >/dev/null
df -h /
getent ahosts "<DOMAIN>"
ss -ltnp '( sport = :80 or sport = :443 )'
docker ps --format 'table {{.Names}}\t{{.Ports}}'
systemctl --no-pager --type=service --state=running
```

Confirm that DNS points to the target server and identify the owner of ports 80 and 443.

Select one deployment mode:

- `standalone`: ports 80 and 443 are free. Use the bundled Caddy service.
- `existing-proxy`: Nginx, Apache, Caddy, a control panel, or another trusted gateway already owns 80 or 443. Preserve it and publish the Relay only on an unused loopback port.

Do not start the build until the mode is known.

### 2. Prepare or resume the checkout

Use `/opt/better-codex` unless the user selected another absolute path.

- If the path does not exist, clone the repository and verify the release.
- If it is a valid Better Codex checkout with the expected origin, preserve ignored secrets and data, verify tracked files are clean, fetch the selected tag, and check out the verified commit.
- If it exists but is not a verified Better Codex checkout, stop and ask the user.

Create missing credentials only. Preserve an existing bootstrap secret. Update the browser password only when the user explicitly supplied a replacement.

Required files:

```text
/opt/better-codex/deploy/hub/.env
/opt/better-codex/deploy/hub/secrets/bootstrap-secret.txt
/opt/better-codex/deploy/hub/secrets/web-password.txt
```

The `.env` file must contain:

```dotenv
BETTER_CODEX_HUB_DOMAIN=<DOMAIN>
BETTER_CODEX_HUB_WEB_USERNAME=<USERNAME>
```

Protect `.env` and secret files with mode `600` and the secrets directory with mode `700`.

## Manage Web accounts

Run account management from a trusted machine with the Relay URL and a local file containing the deployment bootstrap secret. Password files must contain only the new account password and should be mode `600`.

```bash
better-codex relay user-list --url "https://<PUBLIC_HOST>" --admin-token-file <ADMIN_TOKEN_FILE>
better-codex relay user-add <USERNAME> --nickname "<DISPLAY_NAME>" --password-file <PASSWORD_FILE> --url "https://<PUBLIC_HOST>" --admin-token-file <ADMIN_TOKEN_FILE>
better-codex relay user-disable <USERNAME> --url "https://<PUBLIC_HOST>" --admin-token-file <ADMIN_TOKEN_FILE>
better-codex relay user-enable <USERNAME> --url "https://<PUBLIC_HOST>" --admin-token-file <ADMIN_TOKEN_FILE>
better-codex relay user-password-set <USERNAME> --password-file <PASSWORD_FILE> --url "https://<PUBLIC_HOST>" --admin-token-file <ADMIN_TOKEN_FILE>
```

Disabling an account or changing its password revokes that account's active Web sessions. Existing tasks retain the account ID so historical assignments remain traceable, while disabled accounts cannot receive new assignments.

The first upgrade from single-account Relay authentication migrates the existing browser credential into the initial account and revokes legacy browser sessions once. Users must sign in again after that upgrade.

### 3A. Standalone deployment

From `/opt/better-codex/deploy/hub`:

```bash
docker compose --env-file .env --profile standalone config --quiet
docker compose --env-file .env --profile standalone up -d --build --wait
docker compose --env-file .env --profile standalone ps
```

The `standalone` profile is the only mode that starts the bundled Caddy service on ports 80 and 443.

### 3B. Existing reverse proxy deployment

Choose an unused loopback port, defaulting to `4318`. Create `/opt/better-codex/deploy/hub/compose.proxy.yaml`:

```yaml
services:
  hub:
    ports:
      - "127.0.0.1:4318:4318"
```

Start only the Relay. The Compose service remains named `hub` as a compatibility alias during the rollback window:

```bash
docker compose --env-file .env -f compose.yaml -f compose.proxy.yaml config --quiet
docker compose --env-file .env -f compose.yaml -f compose.proxy.yaml stop caddy
docker compose --env-file .env -f compose.yaml -f compose.proxy.yaml up -d --build --wait hub
docker compose --env-file .env -f compose.yaml -f compose.proxy.yaml ps --all
```

In `existing-proxy` mode, `hub` must be running and the bundled `caddy` service must be stopped. A stopped Caddy container is not a Relay failure; a running Caddy container in this mode is configuration drift.

Inspect the existing gateway configuration and add the smallest isolated virtual host for the requested domain. Preserve unrelated configuration. For Nginx, the location must include:

```nginx
location / {
    proxy_pass http://127.0.0.1:4318;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $remote_addr;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_buffering off;
    proxy_read_timeout 1h;
}
```

Validate the entire gateway configuration before reload. For Nginx, run `nginx -t`. Reload only after validation succeeds.

Record the selected Compose files because every later status, backup, and upgrade command must use the same file set.

### 4. Verify VPS deployment

Verify all of these:

1. The Relay container is healthy through internal `/livez` process liveness.
2. `https://<DOMAIN>/healthz` returns `ok: true`, `name: "Better Codex Relay"`, `protocol_version: "relay/v1"`, and the requested version.
3. `https://<DOMAIN>/readyz` returns `ok: true`, `runtime_ready: true`, a healthy Relay database, sufficient storage, and an online Runtime with a heartbeat newer than the reported deadline.
4. The certificate is valid for the requested domain.
5. The browser login page loads and valid credentials open the task board.
6. The public WebSocket endpoint `/api/v1/runtime/connect` upgrades through the proxy and rejects unauthenticated connections.
7. The Relay SQLite database contains only settings, Web sessions, devices, and audit tables, with no Project, Issue, Agent, Conversation, attachment, Projection, or Remote Command data.

Do not treat a healthy internal container as deployment success when the public URL fails.

## Connect the local Runtime

Run on the computer where Better Codex is installed:

```bash
better-codex relay connect --url "https://<PUBLIC_HOST>"
```

The command opens a browser approval page. Sign in to the remote Relay, approve the Runtime device, then wait for the outbound WSS connection to finish.

Run:

```bash
better-codex relay status
better-codex relay doctor
```

Acceptance requires `connected: true`, `last_error: null`, the correct Relay URL, `protocol_version: "relay/v1"`, and matching Runtime instance, connection epoch, version, and fresh heartbeat details in public `/readyz`.

## End-to-end acceptance

Complete the live Runtime flow through the public browser:

1. Sign in and confirm Projects, Issues, Agents, Runtime status, and Conversations match the local Runtime.
2. Create, edit, move, archive, and restore an Issue and confirm each result is immediately visible locally without a pending Projection or command queue.
3. Start and stop an Agent, send a Conversation reply, and transfer an attachment through the public UI.
4. Stop the local Runtime and confirm public business requests fail immediately without stale data or queued writes.
5. Restart the Runtime and confirm the tunnel, page, and SSE updates recover without manual data synchronization.

Health, login, deployment output, or uploaded assets alone are insufficient.

## Recovery rules

- A failed clone or checkout: verify the existing directory and resume; do not delete it automatically.
- A failed Docker build: preserve configuration and secrets, diagnose network, disk, or registry failure, then rerun the same Compose mode.
- Ports 80 or 443 in use: switch to `existing-proxy`; do not stop the existing gateway unless the user explicitly chooses that action.
- Public `502`: verify the loopback listener, selected Compose files, gateway upstream, Host header, and container health.
- `untrusted_host`: align the domain in `.env`, the public request Host, and the proxy Host header, then recreate the Relay container.
- `runtime_offline`: verify the local service, `better-codex relay status`, outbound DNS/TLS, Device Token, and proxy WebSocket upgrade path. Relay does not queue requests while offline.
- `/livez` succeeds but `/readyz` fails: inspect `database`, `storage`, `runtime_ready`, heartbeat age, Runtime instance, and connection epoch. Do not restart Relay until the failing readiness dependency is identified.
- `507 insufficient_disk_space`: preserve the database and logs, identify the filesystem reported by `storage.path`, free space outside Better Codex or archive verified old artifacts, and retry only after `storage.ok` returns true. Do not delete SQLite WAL files or deployment volumes as cleanup.
- Multiple Session Host processes: run `better-codex doctor`, compare `current`, `peer`, and `untracked` process identities, and stop only the exact stale PID after confirming it owns no active turn or current profile lock.
- Version or protocol mismatch: install compatible `relay/v1` releases on the Runtime and Relay, then reconnect.
- Browser shows an older shell after upgrade: reload `/web` with a version query once so the Service Worker activates the new assets.
- Never use `docker compose down -v` as routine recovery.

## Upgrade

Before an upgrade, create and verify a Relay authentication database backup, preserve any legacy Hub database for rollback, record the current source commit and deployment mode, verify the target release, deploy it with the same proxy and resource configuration, then require public health to report the target version. If validation fails, restore the previous source and deployment without deleting data.

Download `selfhost.sh` from the verified GitHub Release assets and verify its checksum against the signed manifest before executing it. Run `selfhost.sh upgrade vps v<VERSION>` with `sudo`. Never pipe an unverified network response into a shell.

## Completion response

Return only non-secret deployment facts:

- deployment mode;
- public URL;
- installed Better Codex version and Relay protocol;
- public health, browser login, WebSocket, Runtime connection, live remote operations, offline failure, and recovery results;
- backup result and location;
- status command;
- upgrade command;
- any remaining user action.

Never include passwords, administrator tokens, pairing codes, device tokens, cookies, or database contents.
