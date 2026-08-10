# Contributing to Better Codex

Thanks for helping improve Better Codex. Contributions are welcome for bug fixes, compatibility updates, workflow improvements, documentation, and translations.

## Before you start

For a small bug fix or documentation change, open an issue first when the expected behavior is not obvious. For a new feature, a change to task execution, or a change that affects Codex compatibility, start a discussion or issue before writing the implementation.

Please do not include API keys, personal task content, private conversation data, or unredacted logs in issues or pull requests.

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

This uses `~/.better-codex-dev` and creates `Better Codex Dev` separately from the stable `Better Codex` launcher. Development uses the stable database at `~/.better-codex/better-codex.db` by default, while runtime files, logs, attachments, and update state remain isolated. Only one profile owns the Codex page injection at a time. Run `npm run dev:uninstall` to remove the development launcher without deleting shared task data.

On Windows, set `BETTER_CODEX_STABLE_EXECUTABLE` before `npm run dev:install` when the stable binary was installed outside its default location.

To build a platform package, run this on the target platform:

```bash
npm run package:binary
```

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

## Feature requests

Describe the user problem and the workflow it interrupts before proposing an implementation. Features should preserve the Codex Desktop-first experience, keep task management as the primary workflow, and avoid adding a separate hosted workspace unless the project direction changes.
