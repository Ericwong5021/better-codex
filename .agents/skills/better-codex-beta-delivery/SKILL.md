---
name: better-codex-beta-delivery
description: Commit and push local Better Codex code, publish the next signed Preview beta, install that exact version locally, and upgrade the existing VPS. Use only for an explicitly authorized end-to-end beta delivery.
---

# Better Codex Beta Delivery

Deliver one exact Beta version from the shared checkout to GitHub, the local managed installation, and the existing VPS. Completion requires the Preview release to succeed and both installed environments to report the target version.

## Authorization and safety

Require the current request to authorize committing, pushing, publishing a Beta, installing locally, and changing the VPS. Prefer `main`; do not create a branch unless requested.

Preserve unrelated work, secrets, databases, generated release artifacts, existing services, reverse proxies, volumes, and deployment configuration. Never reset the worktree, force-push, overwrite a tag, disable SSH host verification, or use `docker compose down -v`.

Follow the repository instructions. Do not add comments or tests unless requested. Do not compile locally when the repository forbids it; let Preview CI perform build and packaging.

## Source and release

Before mutation, inspect the full worktree, recent commits, tags, `origin/main`, remote main, current version sources, Preview workflow, release helper, installers, local installed version, and VPS deployment/version. Rediscover time-sensitive paths, hosts, ports, tags, and versions.

Classify every changed and untracked path. Commit intended code in rollback-ready functional commits, excluding secrets, databases, local evidence, and machine-generated artifacts. Before each commit, inspect the staged paths and diff and run `git diff --cached --check`.

Fetch `origin/main` before pushing and stop on divergence. After pushing, require local HEAD, `origin/main`, and remote main to match.

Determine the next unused Beta version from synchronized source versions, tags, GitHub Releases, and the signed Preview feed. Update only the package versions, core version, changelog section, and comparison links in a release metadata commit. Run the non-building Beta source validator.

Push the release commit, create a new annotated version tag, push only that tag, and verify that the remote tag dereferences to the release commit. Never reuse a failed or published version; fix the cause and publish the next version.

Wait for the complete Preview workflow: validation, all platform packages, versioned prerelease publication, and Preview feed promotion. Preview failure blocks installation.

## Verify published assets

Download the complete versioned Release into a dedicated temporary directory. Require a published, non-draft prerelease and all assets named by the Preview workflow, including platform packages, installers, `checksums.txt`, `checksums.sig`, `update-public-key.pem`, `selfhost.sh`, `SELF_HOSTING.md`, `source-commit.txt`, and `update-manifest.json`.

Verify the trusted update-key hash, Ed25519 signature, every checksum, manifest signature and asset digest, and the signed Preview feed. Require `source-commit.txt`, the release tag, release commit, and captured candidate SHA to agree. Stop on any missing asset, signature error, digest mismatch, source mismatch, or stale feed.

## Install locally

Use the verified, version-pinned installer and platform package. Preserve the existing Better Codex home, database, tasks, attachments, update channel, and managed integrations. Let the installer use the supported managed update path; do not fall back automatically to destructive setup or recovery after a failure.

Do not create a temporary Issue, Codex thread, or active turn for release acceptance. Live-handoff continuity, browser behavior, Runtime health, Relay health, and feature regression are outside this simplified delivery gate unless the user explicitly requests them.

After installation, run the installed managed CLI and require its Core version to equal the target Beta exactly.

## Upgrade the VPS

Reinspect the deployment immediately before mutation. Preserve the current Compose mode, proxy files, secrets, untracked compatibility files, unrelated containers, and public gateway.

Transfer the verified versioned `selfhost.sh`, compare its remote SHA-256 with the verified local copy, and run its exact-version upgrade against the existing deployment directory. Do not bypass release verification.

After the upgrade, query the running VPS deployment and require its reported Better Codex version to equal the target Beta exactly. Additional container, public-health, tunnel, authenticated-browser, or feature acceptance is optional and must not delay completion unless requested.

## Completion

Report the functional and release commit SHAs, release tag, Preview result, asset/signature result, local installed version, VPS installed version, any failed intermediate Beta, and preserved dirty or untracked files.
