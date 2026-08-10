# Self-hosted Better Codex Hub

Better Codex Hub keeps a remote projection of the task board on your VPS. The local Better Codex runtime remains authoritative and is the only process allowed to run Codex tasks.

## Data boundary

The Hub receives project names and issue titles, descriptions, statuses, priorities, labels, ordering, assignment summaries, and attention state. It does not receive workspace paths, Codex thread IDs or transcripts, reply drafts, Agent instructions, model or sandbox settings, process IDs, execution logs, attachments, or local access tokens.

Sync is opt-in. Running `better-codex sync disconnect` stops network activity and leaves the local database untouched.

The Hub database is plaintext on the VPS volume. Use encrypted VPS storage and restrict host access if issue titles or descriptions are sensitive. Transport must use HTTPS; plain HTTP is accepted only for loopback development.

## Deploy on a VPS

Requirements: Docker Engine with Compose and Tailscale 1.52 or newer on the VPS.

From the repository root:

```sh
mkdir -p deploy/hub/secrets
openssl rand -hex 32 > deploy/hub/secrets/admin-token
chmod 600 deploy/hub/secrets/admin-token
docker compose -f deploy/hub/compose.yaml up -d --build
curl http://127.0.0.1:4318/healthz
```

Keep the generated admin token. It is required to pair a local Better Codex installation and to sign in to the remote board. The token file is excluded from Git.

Expose the loopback listener only inside your tailnet:

```sh
sudo tailscale serve --bg http://127.0.0.1:4318
tailscale serve status
```

Use Tailscale Grants to restrict HTTPS access to your own user and devices. Do not publish port 4318 or use Tailscale Funnel.

## Connect the desktop runtime

Copy the admin token to a local file with owner-only permissions, then run:

```sh
better-codex sync connect --url https://your-vps.your-tailnet.ts.net --token-file ./admin-token --name desktop
better-codex sync status
better-codex sync now
```

Open the same HTTPS URL in a browser and enter the admin token. The browser keeps it in `sessionStorage`, so closing the tab clears it.

The first sync sends the existing board. Later syncs send only changed entities. Remote changes remain marked as pending until the local runtime validates and acknowledges them.

## Backup and restore

Stop the Hub before copying its SQLite database to guarantee a self-contained backup:

```sh
mkdir -p deploy/hub/backups
docker compose -f deploy/hub/compose.yaml stop hub
docker compose -f deploy/hub/compose.yaml cp hub:/data/. deploy/hub/backups/
docker compose -f deploy/hub/compose.yaml start hub
```

To restore, stop the Hub, copy the known-good database and any matching WAL files back with `docker compose cp`, then start it again. The local runtime can repopulate an empty Hub after reconnecting.

## Rollback

```sh
better-codex sync disconnect
docker compose -f deploy/hub/compose.yaml down
```

Disconnecting deletes only the local Hub credential and sync queue. It does not remove local projects or issues. `docker compose down` preserves the named Hub volume unless `--volumes` is explicitly supplied.
