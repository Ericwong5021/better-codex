# Better Codex runtime invariants

- The local Runtime is the only owner of the Better Codex business database. Its runtime lock and published identity must agree on PID, process start time, instance ID, port, version, and profile.
- A Session Host is single-instance within one profile. Runtime connections are authenticated before replacement and fenced by connection epoch. Host status must continuously identify the Host PID, process start time, Host instance, Runtime instance, App Server PID, and command state.
- Stable and development Session Hosts may use separate profile homes, but every detected Host must be represented by a fresh status record. `untracked` Hosts are operational drift and must never be killed without verifying their exact PID, start time, profile lock, and active work.
- Relay accepts one active Runtime connection. Connection-wide closure is reserved for authentication, identity, epoch, or protocol failures. Request sequence and channel state failures terminate only the affected channel and emit structured diagnostics.
- `/livez` proves only that the process can answer. `/readyz` proves that required dependencies can serve traffic. Docker uses `/livez`; external monitoring and remote-access acceptance use `/readyz`.
- Standalone VPS mode activates the Compose `standalone` profile and bundled Caddy. Existing-proxy mode starts only `hub` and requires bundled Caddy to be stopped.
- Storage below the critical reserve makes Runtime or Relay not ready and blocks updates before staging. Storage below the warning reserve is reported as degraded and requires cleanup before routine upgrades.
- Errors on Runtime, Session Host, Relay, update, database, and deployment paths must include structured identity and state fields. Do not convert a failed dependency into a successful health response.
