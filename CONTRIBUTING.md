# Contributing to Better Codex

Thanks for helping improve Better Codex. Contributions are welcome for bug fixes, compatibility updates, workflow improvements, documentation, and translations.

## Before you start

For a small bug fix or documentation change, open an issue first when the expected behavior is not obvious. For a new feature, a change to task execution, or a change that affects Codex compatibility, start a discussion or issue before writing the implementation.

Please do not include API keys, personal task content, private conversation data, or unredacted logs in issues or pull requests.

## Beta testing

Testing Beta releases is a way to contribute without changing the source code. Beta testers help catch installer, update, compatibility, and runtime problems before a release reaches the stable channel.

Follow the [Beta upgrade guide](BETA_UPGRADE.md) when upgrading an existing installation. Remote-access testers must upgrade and verify both the local Runtime and the VPS Relay/Web UI.

Install the current Beta on macOS:

```bash
curl -fsSL https://raw.githubusercontent.com/Ericwong5021/better-codex/main/scripts/install-beta.sh | bash
```

Install the current Beta on Windows PowerShell:

```powershell
irm https://raw.githubusercontent.com/Ericwong5021/better-codex/main/scripts/install-beta.ps1 | iex
```

The Beta installer selects the Preview update channel. Stable and Preview builds use the same local configuration and task database. To return to stable updates, run:

```bash
better-codex update channel stable
```

Switching back to the stable channel does not silently downgrade a newer Beta. When reporting Beta feedback, include your operating system and architecture, Codex version and distribution, Better Codex version, reproduction steps, and a redacted `better-codex doctor` result when relevant.

## Development setup

Better Codex requires Node.js 22.5 or later.

```bash
git clone https://github.com/Ericwong5021/better-codex.git
cd better-codex
npm ci
npm run build
npm test
```

To run the local CLI during development:

```bash
npm run better-codex -- version
npm run better-codex -- doctor
```

To keep the released binary and source checkout installed side by side, create the isolated development launcher:

```bash
npm run dev:install
npm run dev:status
```

This uses `~/.better-codex-dev` and creates `Better Codex Dev` separately from the stable `Better Codex` launcher. On first launch, development snapshots the stable database into `~/.better-codex-dev/better-codex.db` when the stable database exists. The copy then evolves independently, so development migrations and test data cannot change stable tasks. Runtime files, logs, attachments, and update state remain isolated as well. Only one profile owns the Codex page injection at a time. Run `npm run dev:uninstall` to remove the development launcher while preserving the development database copy.

On Windows, set `BETTER_CODEX_STABLE_EXECUTABLE` before `npm run dev:install` when the stable binary was installed outside its default location.

To build a platform package, run this on the target platform:

```bash
npm run package:binary
```

On macOS 13 or later this also builds the native menu bar application and a DMG for the current architecture. Xcode command-line tools are required for the Swift build. The DMG includes the checksum-verified official Node.js 22.22.0 runtime; users do not need Homebrew or a system Node installation. `npm run test:macos-dmg` checks the mounted payload, repeat installation into an isolated home, database preservation, and operation after ejecting the disk image. It does not install a system service or refresh the installed Runtime.

Local DMGs use ad-hoc signing for development. Apple-notarized distribution requires `BETTER_CODEX_MACOS_SIGN_IDENTITY` (Developer ID Application) and `BETTER_CODEX_MACOS_NOTARY_PROFILE` (a configured `notarytool` keychain profile). Set `BETTER_CODEX_REQUIRE_MACOS_SIGNING=1` to reject unsigned or unnotarized release builds. Stable Release jobs require repository secrets `BETTER_CODEX_MACOS_CERTIFICATE` (base64 P12), `BETTER_CODEX_MACOS_CERTIFICATE_PASSWORD`, `BETTER_CODEX_MACOS_NOTARY_API_KEY` (PEM), `BETTER_CODEX_MACOS_NOTARY_KEY_ID`, and `BETTER_CODEX_MACOS_NOTARY_ISSUER_ID`, except for the explicitly authorized `v0.4.18` exception below. The job imports configured credentials into a temporary keychain and removes it after packaging.

Preview jobs may publish ad-hoc signed, unnotarized test DMGs when all five Apple credentials are absent. Beta release notes report the actual signing and notarization status for each macOS architecture. Partial credentials, signing failures, and notarization failures stop packaging; they never fall back to ad-hoc signing. macOS may require explicit approval before opening an unnotarized Beta app. Preview and Stable still require the separate `BETTER_CODEX_UPDATE_PRIVATE_KEY` to sign update manifests and checksums; Apple notarization does not replace those checks. Never describe an ad-hoc build as a notarized release.

Stable tag `v0.4.18` has explicit authorization to publish ad-hoc signed, unnotarized macOS DMGs only when all five Apple credentials are absent. Its release notes report the actual signing and notarization status for each architecture and identify any unnotarized package as this specific exception. Partial credentials, signing failures, and notarization failures still stop packaging. All required CI checks and signed update manifests and checksums remain mandatory. Every other Stable tag requires Developer ID signing and Apple notarization; this exception does not carry forward to future releases.

The signed app bundle is immutable; Runtime updates retain it and continue to use the stable installation entrypoint. Replace the app through a newer DMG when updating the desktop shell.

Before release, manually verify the template icon in light/dark menu bars, first launch from Applications, login startup, Codex restart confirmation, and exit during an active task. A local build is not proof of Gatekeeper acceptance or task continuity. An unreleased build with the same version as an installed managed core must not be used to replace that core; publish a new signed version for in-place upgrades. Local-archive installation rejects differing core bytes under the same version before requesting an update or replacing installed files. The DMG regression check covers this conflict against a selected managed core, including preservation of the launcher, core pointer, Skill, and database.

The runtime integrates with Codex Desktop through its local CDP interface. A successful build on one operating system does not verify behavior on another. Changes that affect injection, launchers, installers, or Codex selectors should be checked on every affected platform.

## Tests and verification

Run the relevant checks before opening a pull request:

- `npm run build`
- `npm test`
- `npm run package:binary` for packaging changes
- `better-codex doctor` for runtime, database, compatibility, and injection changes

UI changes should include a screenshot or a short description of the surface that was checked. Installer changes should include the operating system, Codex distribution, and whether Codex was running during the test.

## Pull requests

Keep each pull request focused on one problem. The pull request description should explain the user impact, implementation boundaries, verification performed, and any platform-specific behavior.

Use a conventional commit subject for commits included in a pull request:

```text
<type>(optional-scope): <short imperative description>
```

Supported types include `build`, `chore`, `ci`, `docs`, `feat`, `fix`, `perf`, `refactor`, `revert`, `style`, and `test`. Keep the subject after the colon within 72 characters.

Examples:

```text
fix: preserve the linked Codex thread when reopening a task
docs: document Windows installation diagnostics
```

Do not include generated release binaries, local databases, screenshots containing private content, or secrets unless the change specifically requires a reviewed public asset.

## Reporting bugs

Use the bug report template for a confirmed defect. Use the compatibility template when the problem appears after a Codex, macOS, or Windows update, or when injection and launcher behavior differs by platform.

Include the Better Codex version, Codex version and distribution, operating system, reproduction steps, expected behavior, actual behavior, and a redacted `better-codex doctor` result when relevant.

## Reporting security vulnerabilities

Do not open a public Issue or Discussion for a suspected vulnerability. Follow the private reporting process in [SECURITY.md](SECURITY.md).

## Feature requests

Describe the user problem and the workflow it interrupts before proposing an implementation. Features should preserve the Codex Desktop-first experience, keep task management as the primary workflow, and avoid adding a separate hosted workspace unless the project direction changes.
