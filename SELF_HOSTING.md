# Better Codex Self-hosting Runbook for AI Agents

This runbook is the source of truth for an AI agent installing or upgrading Better Codex Hub. The user prompt selects `VPS` or `Cloudflare` and supplies the target version. Inspect first, preserve existing services and data, and do not report success until the public deployment and Runtime connection are verified.

## Execution contract

- Work only on the machine or account authorized by the user.
- Use the exact release version from the user prompt. Do not deploy a moving branch.
- Read current state before changing it. Reuse a valid partial installation.
- Never print passwords, administrator tokens, pairing codes, device tokens, cookies, or secret file contents.
- Ask before privileged commands, Cloudflare account mutations, firewall changes, proxy changes, service reloads, or destructive recovery.
- Do not stop or replace unrelated websites, containers, proxies, or services.
- Do not delete `/opt/better-codex`, deployment volumes, Cloudflare resources, or existing secrets to recover from an interrupted installation.
- Do not expose the Hub application port directly to the public Internet.
- Keep the local Runtime and remote Hub on the same Better Codex version.
- Stop after a failed acceptance gate, diagnose the cause, and resume from that stage.

## Inputs

Collect only the values required by the selected path:

| Input | VPS | Cloudflare |
| --- | --- | --- |
| Exact release, such as `v0.4.5` | Required | Required |
| Public domain | Required | Optional custom domain |
| Browser username | Required | Fixed to `admin` |
| Browser password, at least 12 characters | Required | Required |
| VPS SSH target | Required when Codex is not running on the server | Not used |
| Cloudflare account access | Not used | Required through Wrangler login |

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

## Choose one path

### VPS

Use this path for a Linux server and a domain. The agent may run directly on the server or connect to it through SSH.

### Cloudflare

Use this path to deploy Workers, a SQLite Durable Object, and R2 into the user's Cloudflare account. Run it on the user's Windows, macOS, or Linux computer. A VPS is not required.

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
- `existing-proxy`: Nginx, Apache, Caddy, a control panel, or another trusted gateway already owns 80 or 443. Preserve it and publish the Hub only on an unused loopback port.

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

### 3A. Standalone deployment

From `/opt/better-codex/deploy/hub`:

```bash
docker compose --env-file .env config --quiet
docker compose --env-file .env up -d --build --wait
docker compose --env-file .env ps
```

The bundled Caddy service terminates HTTPS on ports 80 and 443.

### 3B. Existing reverse proxy deployment

Choose an unused loopback port, defaulting to `4318`. Create `/opt/better-codex/deploy/hub/compose.proxy.yaml`:

```yaml
services:
  hub:
    ports:
      - "127.0.0.1:4318:4318"
```

Start only the Hub:

```bash
docker compose --env-file .env -f compose.yaml -f compose.proxy.yaml config --quiet
docker compose --env-file .env -f compose.yaml -f compose.proxy.yaml up -d --build --wait hub
docker compose --env-file .env -f compose.yaml -f compose.proxy.yaml ps
```

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

1. The Hub container is healthy.
2. `https://<DOMAIN>/healthz` returns `ok: true`, `name: "Better Codex Hub"`, `deployment: "vps"`, and the requested version.
3. The certificate is valid for the requested domain.
4. The browser login page loads and valid credentials open the task board.
5. The public WebSocket endpoint `/api/v1/control` upgrades through the proxy.

Do not treat a healthy internal container as deployment success when the public URL fails.

## Cloudflare installation

### 1. Inspect the local environment

Detect Windows, macOS, or Linux. Confirm Git, Node.js, npm, network access, and whether Wrangler is already authenticated.

- On Windows, use native PowerShell. Do not require Bash or WSL.
- On macOS or Linux, Bash may use the released `scripts/selfhost.sh`.
- Do not use a globally installed Wrangler. Use the dependency locked in `deploy/cloudflare/package-lock.json` through `npx --no-install`.

Use a user-owned installation directory. If a valid partial checkout exists, preserve `.admin-token`, `.worker-url`, and Cloudflare resources, then resume.

### 2. Prepare dependencies and authenticate

After verifying and checking out the release:

```text
npm --prefix deploy/cloudflare ci --ignore-scripts
npx --no-install wrangler login
npx --no-install wrangler whoami
```

Run Wrangler commands from `deploy/cloudflare`. On Windows, execute the equivalent commands in PowerShell.

### 3. Provision idempotently

1. Create the private `better-codex-hub-backups` R2 bucket only if it does not exist.
2. Generate an administrator token of at least 32 random bytes only if `.admin-token` does not exist.
3. Store the administrator token using the `ADMIN_TOKEN` Worker secret.
4. Ask the user for a browser password of at least 12 characters and store it using the `WEB_PASSWORD` Worker secret.
5. Deploy with `npx --no-install wrangler deploy`.
6. Save the resulting Worker URL in `.worker-url` without printing credentials.

Before each Cloudflare mutation, explain the resource being created or changed and obtain confirmation.

### 4. Verify Cloudflare deployment

Verify all of these:

1. The public `/healthz` response contains `ok: true`, `name: "Better Codex Hub"`, `deployment: "cloudflare"`, and the requested version.
2. The browser login accepts username `admin` and the chosen password.
3. The remote task board loads after login.
4. The WebSocket control endpoint is reachable.
5. An authenticated backup request creates an R2 backup object.

## Connect the local Runtime

Run on the computer where Better Codex is installed:

```bash
better-codex sync connect --url "https://<PUBLIC_HOST>"
```

The command opens a browser approval page. Sign in to the remote Hub, approve the device, then wait for the command to finish.

Run:

```bash
better-codex sync now
better-codex sync status
```

Acceptance requires `connected: true`, `last_error: null`, the correct Hub URL, and an empty pending queue.

## End-to-end acceptance

Complete both directions:

1. Create or edit an Issue locally and confirm it appears remotely.
2. Edit the Issue remotely and confirm it first becomes pending, then is applied locally and acknowledged.
3. Confirm the Runtime remains online and the pending queue returns to zero.

Health, login, deployment output, or uploaded assets alone are insufficient.

## Recovery rules

- A failed clone or checkout: verify the existing directory and resume; do not delete it automatically.
- A failed Docker build: preserve configuration and secrets, diagnose network, disk, or registry failure, then rerun the same Compose mode.
- Ports 80 or 443 in use: switch to `existing-proxy`; do not stop the existing gateway unless the user explicitly chooses that action.
- Public `502`: verify the loopback listener, selected Compose files, gateway upstream, Host header, and container health.
- `untrusted_host`: align the domain in `.env`, the public request Host, and the proxy Host header, then recreate the Hub container.
- Cloudflare authentication interrupted: rerun `wrangler login` and resume without recreating secrets or the R2 bucket.
- Cloudflare deployment interrupted: inspect the Worker, Durable Object, R2 bucket, `.admin-token`, and `.worker-url`, then apply only missing stages.
- Version or protocol mismatch: align the local Runtime and Hub to the same release before reconnecting.
- Never use `docker compose down -v` or delete a Durable Object as routine recovery.

## Upgrade

Before an upgrade, create and verify a backup, record the current source commit and deployment mode, verify the target release, deploy it with the same proxy and resource configuration, then require public health to report the target version. If validation fails, restore the previous source and deployment without deleting data.

Download `selfhost.sh` from the verified GitHub Release assets and verify its checksum against the signed manifest before executing it. Run `selfhost.sh upgrade vps v<VERSION>` with `sudo` for VPS, or `selfhost.sh upgrade cloudflare v<VERSION>` as the current user for Cloudflare. Never pipe an unverified network response into a shell.

On Windows, perform the Cloudflare upgrade natively in PowerShell using the verified checkout and locked Wrangler dependency until a released PowerShell self-hosting installer is available.

## Completion response

Return only non-secret deployment facts:

- selected provider and deployment mode;
- public URL;
- installed Better Codex version and sync protocol;
- public health, browser login, WebSocket, Runtime connection, and two-way sync results;
- backup result and location or Cloudflare object key;
- status command;
- upgrade command;
- any remaining user action.

Never include passwords, administrator tokens, pairing codes, device tokens, cookies, or database contents.
