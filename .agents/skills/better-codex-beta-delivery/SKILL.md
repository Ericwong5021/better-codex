---
name: better-codex-beta-delivery
description: Commit and push all local Better Codex code, publish the next signed Preview beta, and install that exact release locally and on the existing VPS. Use only for an explicitly authorized end-to-end beta delivery, not for ordinary commits, standalone installation, stable releases, or diagnosis-only requests.
---

# Better Codex Beta Delivery

Deliver one rollback-ready chain from the shared checkout to the installed local Runtime and VPS Relay. Keep source, CI, release assets, local installation, VPS deployment, and live acceptance as separate evidence layers.

## Authorization boundary

Require the current user request to authorize every requested mutation: committing all local code, pushing, publishing a beta, installing locally, and changing the VPS. Do not infer a missing stage from another stage.

Prefer `main` and do not create a branch unless the user explicitly asks. Read the applicable `AGENTS.md` before acting. Preserve unrelated work, secrets, databases, generated binaries, existing services, reverse proxies, volumes, and deployment configuration. Never reset the worktree, force-push, replace an existing tag, disable SSH host verification, or use `docker compose down -v`.

Follow current repository instructions about comments, documentation, tests, and compilation. If local compilation is forbidden, do not run a release helper that implicitly builds or packages. Use the non-building beta source check and let Preview CI provide the compilation and packaging gate. Beta delivery does not require running or waiting for the full test suite unless the user explicitly requests it or the Preview workflow itself fails and diagnosis requires it.

## Establish live facts

Before changing state:

- Inspect `git status --short --branch -uall`, the full diff, recent commits, local tags, `origin/main`, and the remote main SHA.
- Inspect `package.json`, `src/version.ts`, `CHANGELOG.md`, the Preview workflow, `scripts/release-beta.mjs`, installers, `SELF_HOSTING.md`, and `scripts/selfhost.sh`.
- Inspect the currently installed local version, update channel, Runtime, MCP, Launcher, Relay URL, protocol, and connection state.
- Inspect the authorized VPS target, `/opt/better-codex` or the configured deployment directory, current source SHA, tracked and untracked state, Compose mode, container health, public domain, and public health.
- Treat versions, hosts, ports, paths, tags, update feeds, SSH targets, and running processes as time-sensitive. Discover them rather than copying old values.

Stop if the repository contains likely secrets, local databases, generated release artifacts, or unclear non-code files that should not be published. Stop if the VPS target or deployment directory cannot be established safely.

## Commit all local code

Classify every modified, deleted, and untracked path by functional ownership. “All local code” includes all intended code changes already present in the checkout; it does not authorize publishing secrets or machine-local artifacts.

Create rollback-ready functional commits. When one file contains unrelated changes, stage exact hunks. Before every commit:

- Recheck the shared worktree and upstream state.
- Inspect the staged diff and staged path list.
- Run `git diff --cached --check`.
- Confirm unstaged changes are intentionally reserved for a later batch.

After each commit, recheck the worktree because another process may have changed it. Before pushing, fetch `origin/main` without assuming tracking refs are current, confirm the local branch only contains the intended commits, and stop on divergence. Push `main`, then verify local HEAD, `origin/main`, and `git ls-remote` all match.

## Prepare and publish the beta

Determine the next beta from synchronized version sources, existing tags, GitHub Releases, and the signed Preview feed. Never reuse or overwrite an existing version or tag.

Prepare only the required release metadata: package versions, core version, release changelog section, and comparison links. Keep the release metadata in its own commit. Run the repository’s non-building beta source validator with the exact version and tag.

Recheck the clean worktree and remote main immediately before pushing the release commit. Push and verify the remote SHA. Create an annotated version tag that dereferences to the release commit, push only that tag, and verify the remote tag dereferences to the same SHA.

Wait for the entire Preview workflow, including all platform packaging, versioned prerelease publication, and feed promotion. This Preview workflow is the Beta automation gate. Do not wait for or require the general CI, CodeQL, Commit Quality, Web UI, or self-host acceptance workflows before installing the Beta. If their current results are readily available, report them separately without delaying publication or installation.

Do not install from a tag or partially populated Release. Require all current release assets named by the repository workflow, including platform packages, `checksums.txt`, `checksums.sig`, `update-public-key.pem`, the applicable installers, `selfhost.sh`, `SELF_HOSTING.md`, `source-commit.txt`, and `update-manifest.json`.

Download the versioned assets into a dedicated temporary directory and verify:

- The Release is published, non-draft, and marked prerelease.
- The update public key hash matches the current trusted value defined by the repository.
- The Ed25519 signature over `checksums.txt` is valid. Use Node `crypto.verify` when the local OpenSSL cannot verify the key format.
- Every file named by `checksums.txt` matches its digest.
- `source-commit.txt`, the tag commit, release commit, local HEAD, `origin/main`, and remote main agree.
- The versioned update manifest is signed for the Preview channel.
- The published Preview feed is signed, points to the new version, and matches the promoted versioned manifest.

Stop on any missing asset, failed Preview workflow, signature error, digest mismatch, source mismatch, or stale feed. Do not install the new version until this gate passes. Failures in non-Preview workflows are evidence to report and follow up, but they do not block Beta installation unless they also invalidate the published package or the requested local or VPS installation.

## Install locally

Use the downloaded, verified, version-pinned installer rather than a moving installer URL. Preserve the existing Better Codex home, database, tasks, attachments, update channel, and Codex process. Expect a short Runtime replacement window and do not misdiagnose a transient `runtime_offline` response as a VPS failure.

After installation, verify the exact Core and Runtime version, database health, Preview channel, MCP registration, Launcher registration, Runtime PID, Relay connection, `relay/v1`, reconnect attempts, and `last_error`. Run `better-codex doctor`, `status`, `mcp status`, `launcher status`, `relay status`, and `relay doctor` as supported by the installed CLI.

If Runtime and MCP are healthy but page injection is pending because Codex has no open target, report that separately. Reopen Codex from the Better Codex Launcher only when activation needs it; do not claim the installation failed solely from `ready:false` with an unopened page.

## Upgrade the VPS

Reinspect the current deployment immediately before changing it. Preserve the existing Compose mode, proxy file, secrets, untracked compatibility files, unrelated containers, and public gateway.

Transfer the verified versioned `selfhost.sh` over the authenticated SSH connection and compare its remote SHA-256 with the locally verified copy. Run the exact-version upgrade against the existing deployment directory. The upgrade must verify the release source, create a Relay database backup, rebuild the Relay, wait for the requested version, check public health, and roll back on failure.

Allow only bounded network retries already provided by the verified workflow. Do not bypass release verification when GitHub access is intermittent. If the script fails after retries, inspect whether it retained the old healthy version or completed rollback before deciding the next action.

## Acceptance gates

After both installations, verify all applicable layers:

- Repository: clean local worktree; local HEAD, `origin/main`, remote main, tag, and release source SHA match.
- Automation: Preview publication, all packaging platforms, and feed promotion must pass. CI, CodeQL, Commit Quality, Web UI, and self-host acceptance are optional non-blocking evidence and are reported only when observed.
- Local: exact version, healthy Runtime and database, MCP and Launcher installed, Preview feed current, and Relay connected without error.
- VPS: exact source and tag SHA, a recorded backup, preserved untracked deployment files, healthy container, internal health, valid public HTTPS health, exact version, and `relay/v1`.
- Tunnel: local and public health report matching Runtime and Relay versions, `connected:true`, fresh heartbeat, and no reconnect error.
- Public path: unauthenticated Runtime WebSocket upgrade is rejected, authenticated login reaches a real board/bootstrap request, and credentials are never printed.
- Changed behavior: full automated or live feature regression is not required for Beta delivery. Perform only the least invasive check needed to show the installed local Runtime, VPS Relay, tunnel, and affected path are operational. Prefer dedicated ephemeral sessions or records and remove only those artifacts. Never revoke an existing user session or mutate user Issues merely for acceptance.

Do not call the beta fully accepted from build, assets, container health, `/healthz`, or a login page alone. State any remaining real-browser, mobile-device, visual, or tester acceptance explicitly.

## Completion report

Lead with whether the end-to-end delivery completed. Report evidence, not a code summary:

- Functional commit SHAs and the release SHA/tag.
- Remote main and tag reconciliation.
- Preview/CI/signature/feed result.
- Local installed version and Runtime/Relay state.
- VPS installed version, backup, container, public health, and authenticated-flow result.
- Preserved dirty or untracked files and any pending user acceptance.

Never expose passwords, device tokens, pairing codes, cookies, private keys, access tokens, or unredacted private data in commands or output.
