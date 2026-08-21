---
name: better-codex-dev-delivery
description: Commit and push all local Better Codex code, then install the exact pushed main SHA as an isolated local development instance and deploy that same SHA to the existing VPS. Use only for an explicitly authorized end-to-end dev delivery, not for release publication, standalone commits, standalone installation, or diagnosis-only requests.
---

# Better Codex Dev Delivery

Deliver one rollback-ready chain from the shared checkout through `main` to the isolated local Dev Runtime and the existing VPS Relay. Use the exact pushed source SHA as the deployment identity. Do not change versions, create tags or Releases, promote update feeds, or claim signed-release provenance.

## Authorization boundary

Require the current user request to authorize every requested mutation: committing all local code, pushing `main`, installing the local development instance, and changing the VPS. Do not infer a missing stage from another stage.

Prefer `main` and do not create a branch unless the user explicitly asks. Read the applicable `AGENTS.md` before acting. Preserve unrelated work, secrets, databases, stable installations, existing services, reverse proxies, volumes, and deployment configuration. Never reset the worktree, force-push, disable SSH host verification, delete the deployment directory, or use `docker compose down -v`.

Follow current repository instructions about comments, documentation, tests, and compilation. Explicit authorization for this full dev delivery authorizes only the build required by the repository-supported local Dev installation and the VPS image build. Do not run additional tests, packaging, or release commands unless separately authorized or required by current repository instructions.

## Establish live facts

Before changing state:

- Inspect `git status --short --branch -uall`, the full diff, recent commits, local HEAD, `origin/main`, and the remote main SHA.
- Inspect `package.json`, `scripts/development-instance.mjs`, the current Dockerfile and Compose files, and the installed CLI capabilities. Do not assume old commands still apply.
- Inspect the stable and development local profiles separately, including their homes, Launcher registrations, Runtime processes, databases, Relay URLs, protocols, and connection states.
- Inspect the authorized VPS target and deployment directory, current source SHA, origin URL, tracked and untracked state, Compose file set, container and image IDs, database backup capability, public domain, and public health.
- Treat paths, hosts, ports, SSH targets, processes, Compose modes, and health endpoints as time-sensitive. Discover them rather than copying old values.

Stop if the repository contains likely secrets, local databases, generated binaries, release artifacts, or unclear non-code files that should not be pushed. Stop if the VPS target, deployment directory, origin, Compose mode, or rollback path cannot be established safely.

## Commit and push all local code

Classify every modified, deleted, and untracked path by functional ownership. “All local code” includes all intended code changes already present in the checkout; it does not authorize publishing secrets or machine-local artifacts.

Create rollback-ready functional commits. When one file contains unrelated changes, stage exact hunks. Before every commit:

- Recheck the shared worktree and upstream state.
- Inspect the staged path list and staged diff.
- Run `git diff --cached --check`.
- Confirm unstaged changes are intentionally reserved for a later batch.

After each commit, recheck the worktree because another process may have changed it. Fetch `origin/main` before pushing, stop on divergence, and confirm the local branch contains only the intended commits. Push `main`, then verify local HEAD, `origin/main`, and `git ls-remote` all resolve to one target SHA.

Do not prepare release metadata. The package version may remain equal to the latest release or beta, so always report the dev source SHA alongside the displayed version.

## Install locally first

Require a clean tracked worktree at the verified target SHA. Use the repository-supported isolated development installation path, currently `npm run dev:install`, rather than overwriting the stable installation. This command may build the checkout as part of installation.

Preserve the stable Better Codex home, database, Launcher, Runtime, update channel, and active Codex process. Do not silently switch a stable Codex window to the development injector.

After installation:

- Recheck the worktree. If the build changed tracked files, stop, classify those changes, and restore the source-to-deployment chain through commit and push before touching the VPS.
- Verify the development profile and discovered Dev home, Launcher registration, Runtime PID, Core and Runtime version, database health, Relay URL, `relay/v1`, connection state, reconnect attempts, and `last_error`.
- Use `npm run dev:status` and the development-profile CLI commands supported by the installed checkout, including doctor and Relay status checks where available.
- Keep Runtime health, Launcher installation, injection ownership, and visible UI behavior as separate evidence. Open Better Codex Dev only when the affected behavior requires it.

If the local build, installation, Runtime health, or required changed-behavior check fails, diagnose or roll back the local Dev instance as appropriate and do not deploy the VPS.

## Deploy the exact SHA to the VPS

This is an unreleased source deployment. Do not use `scripts/selfhost.sh`, a moving installer URL, a tag, or a GitHub Release as proof for this stage.

Reinspect the VPS immediately before changing it. Preserve the existing Compose mode, proxy override, environment, secrets, updater configuration, volumes, unrelated containers, and public gateway. Stop on tracked VPS changes, an unexpected origin, or untracked paths that would conflict with the target checkout.

Before checkout or rebuild:

- Record the previous source SHA, displayed version, Compose file set, running container ID, image ID, internal health, and public health.
- Validate the existing Compose configuration using the same files and environment file used by the running deployment.
- Create a Relay database backup through the current container, identify the correct Relay or legacy Hub backup CLI from the running service, and validate the returned backup path.
- Fetch `origin/main` and confirm the fetched target SHA exactly matches local HEAD and the remote main SHA already verified after push.

Check out the exact target SHA in detached mode without deleting ignored or untracked deployment files. Confirm tracked source is clean, then rebuild and start with the existing Compose file set. When a proxy override is present, preserve the existing service selection. Never stop or recreate unrelated services.

Allow only bounded retries for transient network pulls and health probes. If build, startup, internal health, public health, or protocol validation fails, return to the recorded previous SHA, rebuild the previous service, restore the backup when the replacement may have opened or migrated the database, start the previous Compose mode, and verify the old service is healthy. Report whether rollback completed; do not repeatedly redeploy a failing target.

## Acceptance gates

After both deployments, verify all applicable layers:

- Repository: clean tracked worktree; local HEAD, `origin/main`, and remote main match the target SHA. Report any preserved untracked or ignored files separately.
- Automation: report observed CI, CodeQL, or commit-quality status separately when available. Do not wait for packaging or describe automation as a signed-release gate.
- Local provenance: the Dev installation was built from a clean checkout at the target SHA and the worktree remained unchanged afterward.
- Local runtime: development profile, isolated Dev home, healthy Runtime and database, Launcher installed, Relay connected, `relay/v1`, and no reconnect error.
- VPS provenance: checkout remains at the target SHA, tracked source is clean, and the running container uses the image produced by the rebuild from that checkout. Report the displayed package version separately from the SHA.
- VPS runtime: recorded backup, preserved deployment files, healthy container, internal health, valid public HTTPS health, and `relay/v1`.
- Tunnel: local Dev Runtime and public Relay are connected with a fresh heartbeat and no `last_error`.
- Public path: unauthenticated Runtime WebSocket access is rejected, authenticated login reaches a real board or bootstrap request, and credentials are never printed.
- Changed behavior: perform the least invasive live check that proves the affected path. Prefer dedicated ephemeral sessions or records and remove only those artifacts. Never revoke an existing user session or mutate user Issues merely for acceptance.

Do not call the dev delivery fully accepted from a successful push, local build, container health, `/healthz`, or a login page alone. State any remaining real-browser, mobile-device, visual, or tester acceptance explicitly.

## Completion report

Lead with whether the end-to-end dev delivery completed. Report evidence, not a code summary:

- Functional commit SHAs and the exact target SHA.
- Local HEAD, `origin/main`, and remote main reconciliation.
- Local Dev build provenance, profile, Runtime, Launcher, Relay, and changed-behavior result.
- VPS previous and target SHAs, backup, rollback readiness, container image, public health, tunnel, and authenticated-flow result.
- CI status observed independently from deployment.
- Preserved dirty, ignored, or untracked files and any pending user acceptance.

Never expose passwords, device tokens, pairing codes, cookies, private keys, access tokens, database contents, or unredacted private data in commands or output.
