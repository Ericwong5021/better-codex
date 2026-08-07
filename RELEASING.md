# Releasing Better Codex

Better Codex releases are versioned with semantic versioning. A release starts with a version change and ends with a verified GitHub Release and installation smoke test.

## Before the release

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

## Create the release

Push the release commit and its tag:

```bash
git push origin main
git tag -a vX.Y.Z -m "vX.Y.Z"
git push origin vX.Y.Z
```

The `Release` workflow checks the tag version, builds macOS Apple Silicon, macOS Intel, and Windows x64 packages, creates the GitHub Release, uploads checksums and installer scripts, and updates the Homebrew formula.

## Verify the published release

1. Wait for the `Release`, `CI`, and `Commit Quality` workflows to finish successfully.
2. Confirm the GitHub Release contains the expected platform packages, `install.sh`, `install.ps1`, `checksums.txt`, and update manifest.
3. Install the published release on each affected platform.
4. Confirm the Codex sidebar entry, `better-codex doctor`, upgrade behavior, and `better-codex eject`.
5. Check that existing local task data remains available after upgrade.
6. Publish the user-facing summary in the Announcements discussion category.

## If a release fails

Re-run a failed workflow when the release inputs are unchanged. If code or packaging needs a correction, make the fix on `main` and publish a new patch version. Do not silently move an existing version tag.
