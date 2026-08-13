# Better Codex Self-hosting Runbook for AI Agents

This runbook is written for an AI agent that must deploy and verify Better Codex without guessing. Execute one path only. Do not report success until every acceptance gate for that path passes.

## Operating contract

- Run commands on the machine named by each step.
- Replace every value in angle brackets before running a command.
- Never print passwords, pairing codes, device tokens, Cloudflare tokens, or backup credentials in chat, logs, or commits.
- Deploy the same Better Codex core version on the local Runtime and the Hub.
- Stop on the first failed gate. Preserve logs and the current database. Do not continue with a partial deployment.
- Do not expose port `4318` to the public Internet.
- Do not copy the local Better Codex SQLite database, its WAL file, or its SHM file to the Hub.
- Do not run `docker compose down -v` during deployment, upgrade, or recovery.

## Choose a deployment path

| Path | Use when | Compute and storage | Current status |
| --- | --- | --- | --- |
| A. Server and domain | The operator owns a Linux server and a domain whose TCP ports 80 and 443 can reach that server | Docker Hub container, persistent volume, and Caddy | Supported by this repository |
| B. Cloudflare native | The operator wants Workers, SQLite Durable Objects, Worker Static Assets, and optional R2, with no origin server | Cloudflare developer platform | Architecture specified below, but not implemented in this repository |

Run this capability check from the repository root before selecting Path B:

```bash
test -f deploy/cloudflare/wrangler.jsonc
test -f src/cloudflare-worker.ts
```

If either command fails, Path B is unavailable for this checkout. Stop. Do not deploy the Docker Hub to Workers, do not substitute D1 for the Hub database, and do not claim a Cloudflare-native deployment. Use Path A, or implement and review the Cloudflare adapter described in Path B before returning to this runbook.

Cloudflare DNS, proxying, Tunnel, or R2 backups can be added to Path A, but those services do not remove the origin server. Cloudflare Containers also do not satisfy a free-only requirement because Containers require the Workers Paid plan.

## Shared architecture and data boundary

The local Better Codex Runtime remains the authoritative database and the only direct writer. The Hub stores a filtered remote projection and a queue of remote commands. A Web UI action is complete only after the local Runtime pulls it, validates it, applies it, and acknowledges it.

The Hub can store project names and identifiers, issue titles and descriptions, status, labels, assignments, Runtime state, public Agent profile fields, and up to 80 recent conversation messages for associated issues. Browser replies, remote attachments, remote commands, and audit records also enter Hub storage.

The Hub does not copy local workspace paths, Codex thread IDs, Agent instructions, model or reasoning settings, sandbox settings, local credentials, or the local SQLite database files. Better Codex does not scan synchronized text or attachments for secrets. Treat every Hub database and backup as sensitive.

One Hub accepts one active local Runtime writer. Pairing a replacement with the official CLI revokes the previous writer. The Hub never starts a Codex session by itself. Remote start, reply, and stop actions require the paired local Runtime to be online.

## Path A: Linux server and domain

### Required inputs

Collect these values before changing the server:

| Variable | Required value |
| --- | --- |
| `HUB_DOMAIN` | A dedicated hostname, such as `codex.example.com`, without a scheme, port, or path |
| `HUB_USERNAME` | 3 to 64 characters matching `^[a-zA-Z0-9][a-zA-Z0-9._@-]{2,63}$` |
| `CORE_VERSION` | Exact output field from `better-codex version`, such as `0.4.5-beta.1` |
| `DEVICE_NAME` | Human-readable name for the local Runtime |
| `REPO_DIR` | Absolute server path for the repository checkout |

### A0. Preflight gate

Run on the Linux server:

```bash
set -eu
command -v git
command -v curl
command -v openssl
command -v docker
docker compose version
docker info >/dev/null
uname -m
```

Run on the computer that hosts Better Codex:

```bash
better-codex version
better-codex status
```

Confirm all of the following before continuing:

- Docker Engine and Docker Compose v2 work on the server.
- The local Better Codex Runtime is installed and healthy.
- The server can reach GitHub, Docker Hub, npm Registry, and public ACME endpoints.
- The domain has an A record that resolves to the server. If an AAAA record exists, IPv6 must also reach the server.
- TCP ports 80 and 443 are allowed through the provider firewall and host firewall.
- No existing service owns ports 80 or 443. If one does, stop and use the existing reverse proxy procedure later in this document.

Gate command:

```bash
getent ahosts "<HUB_DOMAIN>"
ss -ltn '( sport = :80 or sport = :443 )'
```

Expected result: DNS returns the intended server address, and the second command shows no listener when the built-in Caddy deployment will be used.

### A1. Check out the exact release

Run on the Linux server:

```bash
git clone https://github.com/Ericwong5021/better-codex.git "<REPO_DIR>"
cd "<REPO_DIR>"
git fetch --tags --prune
git checkout --detach "v<CORE_VERSION>"
test "$(git describe --tags --exact-match)" = "v<CORE_VERSION>"
cd deploy/hub
```

Use a release tag. Do not deploy a moving `main` checkout as a production Hub.

Acceptance gate: `git describe --tags --exact-match` prints the exact version used by the local Runtime.

### A2. Create configuration and secrets

Run from `<REPO_DIR>/deploy/hub` on the Linux server:

```bash
umask 077
install -d -m 700 secrets
openssl rand -hex 32 > secrets/bootstrap-secret.txt
openssl rand -base64 32 > secrets/web-password.txt
chmod 600 secrets/bootstrap-secret.txt secrets/web-password.txt
```

Create `deploy/hub/.env` with these two lines:

```dotenv
BETTER_CODEX_HUB_DOMAIN=<HUB_DOMAIN>
BETTER_CODEX_HUB_WEB_USERNAME=<HUB_USERNAME>
```

Then run:

```bash
chmod 600 .env
test "$(wc -c < secrets/bootstrap-secret.txt)" -ge 64
test "$(tr -d '\n' < secrets/web-password.txt | wc -c)" -ge 12
docker compose config --quiet
```

The bootstrap secret authorizes Hub administration. It is not the browser password. Store both files outside Git and restrict access to the server operator.

Optional Compose variables:

| Variable | Default | Purpose |
| --- | --- | --- |
| `BETTER_CODEX_HUB_HTTP_PORT` | `80` | Caddy HTTP port on the host |
| `BETTER_CODEX_HUB_HTTPS_PORT` | `443` | Caddy HTTPS and HTTP/3 port on the host |
| `BETTER_CODEX_HUB_CADDYFILE` | `./Caddyfile` | Alternate Caddy configuration |
| `BETTER_CODEX_HUB_BOOTSTRAP_SECRET_FILE` | `./secrets/bootstrap-secret.txt` | Alternate bootstrap secret file |
| `BETTER_CODEX_HUB_WEB_PASSWORD_FILE` | `./secrets/web-password.txt` | Alternate Web password file |

Acceptance gate: `docker compose config --quiet` exits with status 0 and no secret appears in rendered terminal output.

### A3. Start the Hub and Caddy

Run from `<REPO_DIR>/deploy/hub`:

```bash
docker compose up -d --build
docker compose ps
docker compose logs --tail=100 hub caddy
```

Wait for the Hub health check and the public certificate, then run:

```bash
curl --fail --show-error --silent "https://<HUB_DOMAIN>/healthz"
```

Acceptance gate:

- The health response contains `"ok":true`.
- The `hub` service is `healthy`.
- The `caddy` service is running.
- The certificate presented for `<HUB_DOMAIN>` is valid.
- The health response `protocol_version` matches the protocol reported after local pairing.

If Caddy cannot obtain a certificate, inspect `docker compose logs caddy`, DNS A and AAAA records, firewall rules, and port ownership. Do not bypass HTTPS.

### A4. Verify browser authentication

Open `https://<HUB_DOMAIN>` in a browser. Sign in with `<HUB_USERNAME>` and the value stored in `secrets/web-password.txt`.

Acceptance gate:

- Invalid credentials return an authentication error.
- Valid credentials load the remote Better Codex shell.
- `GET /web/session` returns 200 after login.
- `GET /api/bootstrap` returns 200 after login.

Do not record the password in screenshots or browser automation output.

### A5. Pair the local Runtime

Create a one-time pairing code on the Linux server:

```bash
cd "<REPO_DIR>/deploy/hub"
docker compose exec -T --user node hub node dist/hub-cli.js pairing-code
```

The code expires after 10 minutes and works once. Run the following on the computer that hosts Better Codex before it expires:

```bash
better-codex sync connect --url "https://<HUB_DOMAIN>" --pairing-code "<PAIRING_CODE>" --name "<DEVICE_NAME>"
better-codex sync now
better-codex sync status
```

Acceptance gate:

- `connected` is `true`.
- `last_error` is `null`.
- `queue.pending` reaches `0`.
- The Hub URL is exactly `https://<HUB_DOMAIN>`.
- Refreshing the Web UI shows the local projects and issues.
- Runtime health in the Web UI is online.

Pairing a new Runtime transfers the single writer role and revokes the old device.

### A6. End-to-end acceptance gate

Complete these actions in order:

1. Create or edit an issue on the local Runtime.
2. Wait for the Web UI to show the same change.
3. Edit that issue in the Web UI.
4. Confirm that the Web UI first marks the operation as pending.
5. Keep the local Runtime online until the operation becomes applied.
6. Run `better-codex sync status` on the local computer.

Deployment is complete only when the local change appears remotely, the remote change is applied locally, `last_error` is `null`, and `queue.pending` is `0`. A healthy `/healthz` response or a working login alone is insufficient.

### Existing Nginx or another reverse proxy

Use this procedure when ports 80 and 443 are already owned by a trusted gateway.

Create `<REPO_DIR>/deploy/hub/compose.proxy.yaml`:

```yaml
services:
  hub:
    ports:
      - "127.0.0.1:4318:4318"
```

Start only the Hub:

```bash
cd "<REPO_DIR>/deploy/hub"
docker compose --env-file .env -f compose.yaml -f compose.proxy.yaml up -d --build hub
```

Configure the existing gateway to terminate HTTPS and proxy to `127.0.0.1:4318`. It must preserve the original `Host`, set `X-Forwarded-Proto` to `https`, and replace any inbound `X-Forwarded-For` value with one trusted client address. Disable response buffering for the event stream and allow long-lived reads.

Minimum Nginx location:

```nginx
location / {
    proxy_pass http://127.0.0.1:4318;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $remote_addr;
    proxy_set_header X-Forwarded-Proto https;
    proxy_buffering off;
    proxy_read_timeout 1h;
}
```

Run the gateway configuration check before reload. For Nginx, run `nginx -t` and continue only if it succeeds. Every later Compose command for this deployment must include `--env-file .env -f compose.yaml -f compose.proxy.yaml`.

## Path B: Cloudflare-native deployment specification

Path B is a deployment contract for a future Cloudflare adapter. It is not a command path for the current repository. An agent may execute this section only after the capability check at the start of this document passes.

### B0. Required platform mapping

The adapter must preserve the current HTTP and sync contracts while replacing process-specific services:

| Current Hub dependency | Cloudflare-native replacement |
| --- | --- |
| Node `http.createServer` | Worker `fetch()` handler |
| Local `node:sqlite` file | One SQLite-backed Durable Object for the Hub |
| In-process writer coordination and transactions | Durable Object single-instance coordination and SQLite transactions |
| Generated Web shell responses | Worker Static Assets or Worker responses with the same routes and CSP |
| Environment variables and secret files | Wrangler variables and encrypted Worker secrets |
| SQLite backup file | Versioned, encrypted export stored in a private R2 bucket |
| Caddy and host ports | `workers.dev` or a Cloudflare custom domain |

Do not use D1 as a drop-in replacement. The Hub depends on serialized writer leases, idempotent command creation, conflict checks, and transactional pending-to-ack transitions. A single SQLite-backed Durable Object matches that coordination model. R2 is for backup objects or large future attachments, not live relational state.

The adapter must expose the same public routes used by the current Runtime and Web UI, including:

- `GET /healthz`
- `POST /api/v1/devices/pair`
- `POST /api/v1/sync/push`
- `PUT /api/v1/sync/issues/:id/conversation`
- `GET /api/v1/sync/commands`
- `POST /api/v1/sync/commands/:id/ack`
- Browser session, bootstrap, issue, conversation, command, and event routes used by the current Web UI

### B1. Adapter acceptance gate

Before creating Cloudflare resources, verify all of the following in the checkout:

```bash
test -f deploy/cloudflare/wrangler.jsonc
test -f src/cloudflare-worker.ts
npx wrangler --version
npx wrangler types
```

Inspect `deploy/cloudflare/wrangler.jsonc` and confirm:

- It declares a SQLite-backed Durable Object binding.
- It declares required encrypted secrets for the bootstrap credential and Web password.
- It sets a current compatibility date.
- It defines a custom domain or enables `workers.dev` for the first deployment.
- It does not enable Cloudflare Containers.
- Static assets bypass the Worker where authentication is not required, or authenticated assets run through the Worker intentionally.

Stop if any item is missing.

### B2. Security and compatibility gate

The Cloudflare adapter must pass the same behavior contract as the Docker Hub before production deployment:

- The local Runtime remains authoritative and the only direct writer.
- The protocol version matches the local Better Codex core version.
- Pairing codes are one-time values and expire after 10 minutes.
- Pairing a replacement revokes the old writer.
- Device tokens and browser session tokens are stored only as hashes.
- Browser passwords use a reviewed password hashing strategy that fits Workers CPU limits. Do not silently weaken the current scrypt parameters.
- Browser cookies remain `Secure`, `HttpOnly`, and `SameSite=Strict`.
- Origin, Host, CSRF, rate-limit, projection allowlist, payload-size, audit, revocation, command expiry, and conflict checks match the Docker Hub.
- Server-sent event clients reconnect without losing changes.
- Backup and restore preserve schema version checks and revoke restored browser sessions.

Stop if the adapter lacks any control in this list.

### B3. Free-tier capacity gate

Cloudflare's published free limits are large enough for the request and storage profile of a small personal Better Codex Hub after the adapter exists, but free operation is conditional on measured usage. As of August 13, 2026, the relevant limits are:

| Resource | Free allowance | Better Codex use |
| --- | --- | --- |
| Workers | 100,000 dynamic requests per day, 10 ms CPU per invocation, 128 MB memory | HTTP routing, auth, Web API, sync forwarding |
| Worker Static Assets | Free and unlimited asset requests | Web shell assets |
| SQLite Durable Objects | 100,000 requests and 13,000 GB-s per day, 5 million rows read and 100,000 rows written per day, 5 GB total SQL storage | Hub state and serialized command handling |
| R2 Standard | 10 GB-month, 1 million Class A operations and 10 million Class B operations per month, free egress | Encrypted backups and optional large objects |

The local Runtime attempts a sync every 5 seconds while connected. One continuously connected Runtime therefore creates about 17,280 sync cycles per day before browser and retry traffic. The free request limits are plausible for a personal instance, but they are not a guarantee. Retries, multiple Durable Object calls per cycle, browser API calls, event reconnects, row scans, or active WebSockets can exhaust a limit. Cloudflare returns errors after a free daily storage or request limit is reached.

Before production use, the adapter must expose usage counters or the operator must configure Cloudflare usage alerts. Record a measured 24-hour baseline with one Runtime and the expected browser load. Stop and require a paid plan or a lower sync rate if projected usage exceeds 80 percent of any daily limit.

### B4. Provision and deploy

Execute only when B1 through B3 pass. Use the scripts and names shipped with the adapter. The minimum deployment sequence is:

```bash
cd deploy/cloudflare
npx wrangler login
npx wrangler whoami
openssl rand -hex 32 | npx wrangler secret put BETTER_CODEX_HUB_BOOTSTRAP_SECRET
openssl rand -base64 32 | npx wrangler secret put BETTER_CODEX_HUB_WEB_PASSWORD
npx wrangler deploy
```

Do not put secret values in `wrangler.jsonc`, shell history, `.env` files committed to Git, or command output. If the adapter uses a private R2 backup bucket, create the exact bucket declared by its Wrangler configuration and apply a retention policy before the first backup.

Acceptance gate:

- `npx wrangler deploy` returns a deployment version and URL.
- `GET /healthz` returns `ok: true` and the expected protocol version.
- Browser login succeeds through HTTPS.
- A one-time pairing code can be created through the adapter's documented administrative command.
- The current `better-codex sync connect`, `sync now`, and `sync status` commands work without modification.
- The end-to-end acceptance sequence from A6 passes.
- A backup can be exported, restored to an isolated deployment, and integrity-checked.
- Cloudflare analytics remain below the 80 percent free-tier threshold during the measured acceptance window.

If the adapter does not ship an administrative pairing or backup command, stop. Do not create direct database mutations with ad hoc Wrangler SQL commands.

## Operations for a supported deployment

The commands in this section apply to Path A. For Path B, use only equivalent commands shipped by the reviewed Cloudflare adapter.

### Status and logs

Run on the Path A server:

```bash
cd "<REPO_DIR>/deploy/hub"
docker compose ps
docker compose logs --tail=200 hub caddy
curl --fail --show-error --silent "https://<HUB_DOMAIN>/healthz"
```

### Devices and audit records

```bash
docker compose exec -T --user node hub node dist/hub-cli.js devices
docker compose exec -T --user node hub node dist/hub-cli.js audit 100
docker compose exec -T --user node hub node dist/hub-cli.js revoke "<DEVICE_ID>"
```

After revocation, create a new pairing code and reconnect the intended local Runtime.

### Backup

Confirm that no remote command is pending. Then run:

```bash
BACKUP_DIR="/var/backups/better-codex-hub"
install -d -m 700 "$BACKUP_DIR"
BACKUP_NAME="better-codex-hub-$(date +%Y%m%d-%H%M%S).db"
docker compose exec -T --user node hub node dist/hub-cli.js backup "/data/backups/$BACKUP_NAME"
docker compose cp "hub:/data/backups/$BACKUP_NAME" "$BACKUP_DIR/$BACKUP_NAME"
chmod 600 "$BACKUP_DIR/$BACKUP_NAME"
```

Copy the database backup, `.env`, and `secrets` to protected off-host storage. The backup contains synchronized issue and conversation data, command history, audit records, and credential hashes.

### Restore

Restore only into a Hub running the same or a newer compatible schema. Run:

```bash
docker compose cp "/var/backups/better-codex-hub/<BACKUP_FILE>.db" "hub:/data/backups/restore.db"
docker compose stop hub
docker compose run --rm --no-deps hub node dist/hub-cli.js restore /data/backups/restore.db
docker compose run --rm --no-deps hub node dist/hub-cli.js password-set
docker compose up -d hub
docker compose ps
```

The restore command preserves the prior database under a generated name. `password-set` applies the current password secret and revokes restored browser sessions. Recheck health, browser login, and local sync. If sync returns `unauthorized`, create a new pairing code and reconnect the Runtime.

If restore returns `hub_backup_schema_too_new`, upgrade the Hub code to the backup's version or newer. Do not force the restore into an older schema.

### Upgrade

Create and copy an off-host backup first. Upgrade the local Better Codex installation, record its core version, then run on the server:

```bash
cd "<REPO_DIR>"
git fetch --tags --prune
git checkout --detach "v<NEW_CORE_VERSION>"
cd deploy/hub
docker compose up -d --build
docker compose ps
curl --fail --show-error --silent "https://<HUB_DOMAIN>/healthz"
```

Run on the local computer:

```bash
better-codex sync now
better-codex sync status
```

If the upgrade fails after a database migration, do not only check out the old tag. Stop the Hub, rebuild the old version, restore the pre-upgrade backup, align the local Runtime version, and repeat the end-to-end gate.

### Rotate credentials

Rotate the Web password:

```bash
openssl rand -base64 32 > secrets/web-password.txt
chmod 600 secrets/web-password.txt
docker compose run --rm --no-deps hub node dist/hub-cli.js password-set
```

This revokes active browser sessions. Rotate the bootstrap secret:

```bash
openssl rand -hex 32 > secrets/bootstrap-secret.txt
chmod 600 secrets/bootstrap-secret.txt
docker compose up -d --force-recreate hub
```

### Disconnect or clear the remote projection

Disconnecting stops future sync but leaves remote data in the Hub:

```bash
better-codex sync disconnect
```

After confirming that no remote command is pending, clear projects, issues, conversations, and Runtime projections:

```bash
docker compose exec -T --user node hub node dist/hub-cli.js clear-projection
```

This does not delete devices, Web credentials, audit records, or local data. `docker compose down` stops Path A and preserves volumes. `docker compose down -v` deletes the Hub database and Caddy certificate data. Run it only after explicit deletion approval and a verified backup.

## Failure map

| Error or symptom | Action |
| --- | --- |
| `untrusted_host` | Make `BETTER_CODEX_HUB_DOMAIN`, the request hostname, and the reverse proxy `Host` header match, then recreate the Hub container |
| `incompatible_protocol` | Align the Hub tag and local Better Codex core version, then retry sync |
| `writer_lease_conflict` | List devices, revoke the unintended writer, create a new pairing code, and reconnect one Runtime |
| Web action remains pending | Keep the local Runtime online, run `better-codex status`, `better-codex sync now`, and `better-codex sync status`, then inspect `last_error` |
| Login returns 429 | Wait for the 15-minute rate-limit window and verify the password source; changing the file requires `password-set` |
| Compose cannot find a secret | Run from `deploy/hub`; with override files, always pass `--env-file .env` and every `-f` argument |
| Caddy certificate request fails | Verify A and AAAA records, TCP 80 and 443, port ownership, provider firewall, host firewall, and Caddy logs |
| Cloudflare capability check fails | Path B is not shipped in this checkout; use Path A or implement the adapter before deployment |
| Cloudflare free limit is reached | Stop retry loops, inspect Workers and Durable Objects analytics, reduce request frequency only through a reviewed client change, or move to a paid plan |

## Completion record

An executing agent must return these non-secret facts:

- Selected path and why it was eligible.
- Better Codex core version and sync protocol version.
- Public Hub hostname.
- Health response status.
- Browser login gate status.
- Paired Runtime name and connection status.
- Local-to-Web sync gate status.
- Web-to-local pending and acknowledgment gate status.
- Backup location and integrity gate status, without credentials.
- For Path B, measured Workers, Durable Objects, storage, and R2 usage against free limits.

Do not return secret values, pairing codes, device IDs unless needed for an approved revocation, or database contents.

## Cloudflare references

Cloudflare limits and platform behavior change. Verify them before each Path B deployment:

- [Workers limits](https://developers.cloudflare.com/workers/platform/limits/)
- [Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/)
- [Workers Static Assets billing and limits](https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/)
- [Durable Objects pricing](https://developers.cloudflare.com/durable-objects/platform/pricing/)
- [Durable Objects limits](https://developers.cloudflare.com/durable-objects/platform/limits/)
- [R2 pricing](https://developers.cloudflare.com/r2/pricing/)
- [Cloudflare Containers pricing](https://developers.cloudflare.com/containers/pricing/)
