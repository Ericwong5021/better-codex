---
name: better-codex-release-delivery
description: Commit and push all local Better Codex code, publish the next signed stable Release, and install that exact release locally and on the existing VPS. Use only for an explicitly authorized end-to-end stable delivery, not for ordinary commits, beta releases, standalone installation, or diagnosis-only requests.
---

# Better Codex Release Delivery

Deliver one rollback-ready chain from the shared checkout to the installed local Runtime and VPS Relay. Keep source, automation, release assets, Stable and Preview feeds, Homebrew, local installation, VPS deployment, and live acceptance as separate evidence layers.

## Authorization boundary

Require the current user request to authorize every requested mutation: committing all local code, pushing, publishing a stable Release, installing locally, and changing the VPS. Do not infer a missing stage from another stage. A stable Release reaches ordinary Stable subscribers and has a broader impact than a beta; do not publish one from wording that only authorizes a beta, preview, test build, commit, or push.

Prefer `main` and do not create a branch unless the user explicitly asks. Read the applicable `AGENTS.md` before acting. Preserve unrelated work, secrets, databases, generated binaries, existing services, reverse proxies, volumes, and deployment configuration. Never reset the worktree, force-push, replace an existing tag or Release, disable SSH host verification, or use `docker compose down -v`.

Follow current repository instructions about comments, documentation, tests, and compilation. If local compilation is forbidden, do not run a helper that implicitly builds or packages. Perform source-only release checks and let Release CI provide the compilation, testing, and packaging gates.

## Establish live facts

Before changing state:

- Inspect `git status --short --branch -uall`, the full diff, recent commits, local tags, `origin/main`, and the remote main SHA.
- Inspect `package.json`, `package-lock.json`, `src/version.ts`, `CHANGELOG.md`, `.github/workflows/release.yml`, installers, `SELF_HOSTING.md`, `scripts/create-update-manifest.mjs`, `scripts/promote-preview-feed.sh`, and `scripts/selfhost.sh`.
- Inspect existing stable and prerelease tags, GitHub Releases, the latest stable Release, the signed Stable manifest, the signed Preview feed, and the current Homebrew formula.
- Inspect the currently installed local version, update channel, Runtime, MCP, Launcher, Relay URL, protocol, and connection state.
- Inspect the authorized VPS target, `/opt/better-codex` or the configured deployment directory, current source SHA, tracked and untracked state, Compose mode, container health, public domain, and public health.
- Treat versions, hosts, ports, paths, tags, update feeds, SSH targets, and running processes as time-sensitive. Discover them rather than copying old values.

Stop if the repository contains likely secrets, local databases, generated release artifacts, or unclear non-code files that should not be published. Stop if the stable version intent, VPS target, or deployment directory cannot be established safely.

## Commit all local code

Classify every modified, deleted, and untracked path by functional ownership. “All local code” includes all intended code changes already present in the checkout; it does not authorize publishing secrets or machine-local artifacts.

Create rollback-ready functional commits. When one file contains unrelated changes, stage exact hunks. Before every commit:

- Recheck the shared worktree and upstream state.
- Inspect the staged diff and staged path list.
- Run `git diff --cached --check`.
- Confirm unstaged changes are intentionally reserved for a later batch.

After each commit, recheck the worktree because another process may have changed it. Before pushing, fetch `origin/main` without assuming tracking refs are current, confirm the local branch only contains the intended commits, and stop on divergence. Push `main`, then verify local HEAD, `origin/main`, and `git ls-remote` all match.

## Prepare the stable release

Determine the intended stable version from the synchronized version sources, the current beta line, existing stable tags, GitHub Releases, update feeds, and the user-authorized release scope. Use a plain `X.Y.Z` version. Never publish a prerelease version through the stable workflow, and never reuse or overwrite an existing version, tag, or Release.

Prepare only the required release metadata:

- Synchronize `package.json`, the root package version in `package-lock.json`, and `src/version.ts`.
- Move the intended entries from `Unreleased` into one dated stable version section in `CHANGELOG.md`.
- Add exactly one comparison link for the new version and point the `Unreleased` comparison link after the new tag.
- Keep the release metadata in its own commit.

Before committing, reproduce the non-building invariants from the current `validate-release` job: the version is stable SemVer, all version sources agree, the changelog has exactly one dated section with at least one entry, the comparison links agree, and the intended tag is `vX.Y.Z`. Do not create the tag until the release commit is pushed and reconciled with remote `main`.

## Publish and verify the Release

Recheck the clean worktree and remote main immediately before pushing the release commit. Push and verify the remote SHA. Create an annotated version tag that dereferences to the release commit, push only that tag, and verify the remote tag dereferences to the same SHA.

Wait for the entire Release workflow. Track its validation, acceptance, Web UI, Node lifecycle, three-platform packaging, Release publication, Preview feed refresh, and Homebrew update separately. Also track CI, CodeQL, and commit-quality runs separately; no individual green job proves the complete stable delivery.

Do not install from a tag or partially populated Release. Require all current assets named by the workflow, including platform packages, `checksums.txt`, `checksums.sig`, `update-public-key.pem`, the applicable installers, `selfhost.sh`, `SELF_HOSTING.md`, `source-commit.txt`, the compatibility asset, and `update-manifest.json`.

Download the versioned assets into a dedicated temporary directory and verify:

- The Release is published, non-draft, non-prerelease, and selected as the latest stable Release.
- The update public key hash matches the current trusted repository key.
- Decode the base64 Ed25519 signature and verify it over the raw `checksums.txt` bytes. Use Node `crypto.verify` when local OpenSSL cannot verify the key format.
- Every file named by `checksums.txt` matches its digest, and GitHub asset metadata does not disagree.
- `source-commit.txt`, the tag commit, release commit, and remote main at tag time agree.
- The published stable update manifest is signed, uses the Stable channel, points to the exact stable version, and names the verified assets.
- The promoted Preview feed is signed, advances to the stable version without regression, and matches the workflow artifact.

Stop on any missing asset, failed required workflow job, signature error, digest mismatch, source mismatch, invalid stable manifest, stale Preview feed, or prerelease flag. Do not install the new version until this gate passes.

## Reconcile Homebrew and main

The Release workflow may append a Homebrew formula commit to `main` after the tag. Wait for that job, then fetch again. Verify the formula version and archive hashes match the published Release. Fast-forward the local branch only when it is safe and preserves current work; never overwrite new shared-checkout edits.

Report the immutable release/tag source SHA separately from the later Homebrew main SHA. Reconcile local HEAD, `origin/main`, and remote main after automation completes. Do not treat the expected Homebrew commit as a source mismatch, and do not claim a clean synchronized checkout when local or concurrent changes remain.

## Install locally

Use the downloaded, verified, version-pinned stable installer rather than a moving latest URL. Install the exact stable version on the Stable channel; do not accidentally retain the Preview channel from an earlier beta installation. Preserve the existing Better Codex home, database, tasks, attachments, and Codex process. Expect a short Runtime replacement window and do not misdiagnose a transient `runtime_offline` response as a VPS failure.

After installation, verify the exact Core and Runtime version, database health, Stable channel, MCP registration, Launcher registration, Runtime PID, Relay connection, protocol, reconnect attempts, and `last_error`. Run `better-codex doctor`, `status`, `mcp status`, `launcher status`, `relay status`, `relay doctor`, and `update check` as supported by the installed CLI.

If Runtime and MCP are healthy but page injection is pending because Codex has no open target, report that separately. Reopen Codex from the Better Codex Launcher only when activation needs it; do not claim the installation failed solely from `ready:false` with an unopened page.

## Upgrade the VPS

Reinspect the current deployment immediately before changing it. Preserve the existing Compose mode, proxy file, secrets, untracked compatibility files, unrelated containers, and public gateway.

Transfer the verified versioned `selfhost.sh` over the authenticated SSH connection and compare its remote SHA-256 with the locally verified copy. Run the exact-version upgrade against the existing deployment directory. The upgrade must verify the Release source, create a Relay database backup, rebuild the Relay, wait for the requested version, check public health, and roll back on failure.

Allow only bounded network retries already provided by the verified workflow. Do not bypass Release verification when GitHub access is intermittent. If the script fails after retries, inspect whether it retained the old healthy version or completed rollback before deciding the next action.

## Acceptance gates

After both installations, verify all applicable layers:

- Repository: immutable tag and release source SHA agree; local HEAD, `origin/main`, and remote main agree after any Homebrew automation; remaining worktree changes are identified.
- Automation: validation, acceptance, Web UI, Node lifecycle, all packaging platforms, Release publication, Preview feed refresh, Homebrew update, CI, CodeQL, and commit quality are reported independently.
- Distribution: non-prerelease latest Release, verified signatures and hashes, valid Stable manifest, promoted Preview feed, and matching Homebrew formula.
- Local: exact version, healthy Runtime and database, MCP and Launcher installed, Stable channel current, and Relay connected without error.
- VPS: exact source and tag SHA, a recorded backup, preserved untracked deployment files, healthy container, internal health, valid public HTTPS health, exact version, and current protocol.
- Tunnel: local and public health report matching Runtime and Relay versions, `connected:true`, fresh heartbeat, and no reconnect error.
- Public path: unauthenticated protected access is rejected, authenticated login reaches a real board or bootstrap request, and credentials are never printed.
- Changed behavior: perform the least invasive live check that proves the Release’s affected path. Prefer dedicated ephemeral sessions or records and remove only those artifacts. Never revoke an existing user session or mutate user Issues merely for acceptance.

Do not call the stable Release fully accepted from a tag, green build, Release page, asset list, container health, `/healthz`, or login page alone. State any remaining real-browser, mobile-device, visual, or tester acceptance explicitly.

## Completion report

Lead with whether the end-to-end stable delivery completed. Report evidence, not a code summary:

- Functional commit SHAs, release commit SHA, tag, and post-release Homebrew main SHA.
- Remote main and tag reconciliation, including any preserved dirty or untracked files.
- Required workflow jobs, Release state, signatures, hashes, Stable manifest, Preview feed, and Homebrew result.
- Local installed version, Stable channel, Runtime, and Relay state.
- VPS installed version, backup, container, public health, and authenticated-flow result.
- Any pending real-device, visual, or user acceptance.

Never expose passwords, device tokens, pairing codes, cookies, private keys, access tokens, SSH identity paths, or unredacted private data in commands or output.
