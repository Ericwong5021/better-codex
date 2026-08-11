# Security Policy

## Supported Releases

Security fixes target the latest stable Better Codex release. Preview and Beta releases are supported on a best-effort basis and may require upgrading to a newer prerelease or the latest stable release. Older releases are not supported once a newer stable release is available.

Codex Desktop compatibility is capability-based rather than tied to a permanent version range. Better Codex stops page integration and reports an incompatibility when required local capabilities are unavailable.

## Reporting a Vulnerability

Do not open a public Issue or Discussion for a suspected vulnerability.

Use [GitHub private vulnerability reporting](https://github.com/Ericwong5021/better-codex/security/advisories/new) and include:

- the affected Better Codex, Codex Desktop, and operating-system versions;
- the installation or update channel;
- reproduction steps and the expected impact;
- any relevant logs with tokens, local paths, conversation content, and personal data removed;
- whether the issue affects installers, signed updates, the localhost Gateway, command execution, or local data access.

If private vulnerability reporting is unavailable, do not publish exploit details. Wait until the repository provides a working private contact path.

## Disclosure

Please allow time for triage, remediation, and release preparation before public disclosure. The project does not promise a fixed response-time SLA. Confirmed vulnerabilities will be coordinated through the private advisory and documented publicly after a fix or mitigation is available.

## Scope

Useful reports include vulnerabilities in Better Codex code, release assets, installers, update verification, local API boundaries, process launching, file handling, and data isolation. Vulnerabilities in Codex Desktop or other third-party software should be reported to their respective maintainers unless Better Codex introduces or amplifies the issue.
