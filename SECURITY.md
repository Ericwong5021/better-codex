# Security Policy

## Supported versions

Security fixes are applied to the latest release. Older releases may not receive security updates, so please reproduce the issue on the latest version before reporting it.

## Reporting a vulnerability

Please do not report security vulnerabilities in a public issue or discussion.

Use GitHub's private vulnerability reporting on the repository when it is available:

<https://github.com/Ericwong5021/better-codex/security/advisories/new>

Include the affected version, operating system, installation path, reproduction steps, impact, and a minimal proof of concept. Redact credentials, private task content, conversation transcripts, and personal file paths where they are not needed.

If private vulnerability reporting is unavailable, open a public issue titled `Security contact request` without including vulnerability details. The maintainer will provide a private channel for the report.

Please allow time for triage before publicly disclosing a vulnerability. We will acknowledge valid reports, assess the affected versions, and coordinate a fix or mitigation before public disclosure where practical.

## Scope

Reports are especially valuable for:

- Code execution or command injection through task, project, workspace, or Agent fields.
- Path traversal or unintended access to files outside the configured workspace.
- Installer, updater, launcher, or signature verification bypasses.
- Exposure of task data, credentials, or local runtime endpoints to an unintended party.
- Injection behavior that can modify Codex conversations or user-visible state without the user's action.
