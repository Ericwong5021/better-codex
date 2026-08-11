# Releasing Better Codex

Better Codex releases are versioned with semantic versioning. A release starts with a version change and ends with a verified GitHub Release and installation smoke test.

## Beta releases

Keep completed Beta changes under `Unreleased` in `CHANGELOG.md`, then run:

```bash
npm run release:beta
```

When the current version is stable, the command selects the next patch Beta (`0.4.1` becomes `0.4.2-beta.1`). When the current version is already a Beta, it increments the Beta number (`0.4.2-beta.1` becomes `0.4.2-beta.2`). To start a different minor or major line, pass the complete version explicitly:

```bash
npm run release:beta -- 0.5.0-beta.1
```

The command refuses existing version drift, an empty `Unreleased` section, or a non-increasing version. It updates `package.json`, `package-lock.json`, `src/compatibility.ts`, the dated changelog section, and changelog comparison links together. It then runs `npm run build`, `npm test`, and `npm run package:binary`, followed by the same source synchronization check used by CI. If one of those checks fails, the four release source files are restored so the command can be fixed and retried without accidentally incrementing another Beta. The rollback uses content checks and refuses to overwrite a release source changed by another process during verification.

Review the resulting diff, then commit and push the release preparation before creating the tag:

```bash
git add package.json package-lock.json src/compatibility.ts CHANGELOG.md
git commit -m "chore(release): vX.Y.Z-beta.N"
git push origin main
git tag -a vX.Y.Z-beta.N -m "vX.Y.Z-beta.N"
git push origin vX.Y.Z-beta.N
```

Pushing the tag starts the `Preview` workflow. It verifies the tag and synchronized release sources, builds and installs the package twice on macOS Apple Silicon, macOS Intel, and Windows x64, creates a signed GitHub prerelease, uploads packages, checksums, installers, and the update manifest, then advances the signed Preview feed.

After the workflow succeeds, confirm the prerelease assets and install the published Beta on every affected platform. Verify `better-codex doctor`, upgrade behavior, the Preview update channel, and preservation of existing task data.

`npm run release:beta` deliberately does not commit, push, or tag. Those steps make a public release and remain explicit. To validate an already prepared tree without changing files, run `npm run release:beta:check`. If a workflow fails with unchanged inputs, re-run it. If code, packaging, or release metadata changes, prepare the next Beta number and never move an existing public tag.

## Stable releases

### Before the release

1. Confirm the user-visible changes and compatibility notes.
2. Move the completed entries from `Unreleased` into a new version section in `CHANGELOG.md`.
3. Update the version in `package.json` and `package-lock.json`:

   ```bash
   npm version patch --no-git-tag-version
   ```

   Use `minor` or `major` when the release requires it.

4. Run the checks required by the change:

   ```bash
   npm ci
   npm run build
   npm test
   npm run package:binary
   ```

5. For changes to injection, launchers, installers, or Codex compatibility, run `better-codex doctor` and verify every affected platform.
6. Review the diff, confirm the new version matches the intended tag, and commit the release preparation:

   ```bash
   git add package.json package-lock.json CHANGELOG.md
   git commit -m "chore(release): vX.Y.Z"
   ```

### Create the release

Push the release commit and its tag:

```bash
git push origin main
git tag -a vX.Y.Z -m "vX.Y.Z"
git push origin vX.Y.Z
```

The `Release` workflow checks the tag version, builds macOS Apple Silicon, macOS Intel, and Windows x64 packages, creates the GitHub Release, uploads checksums and installer scripts, and updates the Homebrew formula.

### Verify the published release

1. Wait for the `Release`, `CI`, and `Commit Quality` workflows to finish successfully.
2. Confirm the GitHub Release contains the expected platform packages, `install.sh`, `install.ps1`, `checksums.txt`, and update manifest.
3. Install the published release on each affected platform.
4. Confirm the Codex sidebar entry, `better-codex doctor`, upgrade behavior, and `better-codex eject`.
5. Check that existing local task data remains available after upgrade.
6. Publish the user-facing summary in the Announcements discussion category.

### If a release fails

Re-run a failed workflow when the release inputs are unchanged. If code or packaging needs a correction, make the fix on `main` and publish a new patch version. Do not silently move an existing version tag.
