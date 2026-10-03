# Better Codex MCP plugin

This portable Agent Plugins 1.0.0 package starts the stable `better-codex mcp`
entrypoint. The existing Better Codex CLI must be available on `PATH`. The plugin ensures
the existing local Runtime is available; it never starts a second authority,
collects browser credentials, creates a tunnel, or runs external workers.

`board` opens the existing generated board as a standard MCP App. Native tasks
and external observations share the board; observation details remain read-only.
The MCP board browser uses host-mediated tools and never receives a Runtime token.
Dedicated task tools support task content creation and editing; external report
tools only record observations. They do not execute, accept, hand off, archive,
or otherwise take ownership of external work. The full plugin page replaces
legacy desktop page injection; sidebar injection and its recovery tools are retired.

The OpenAI global sidebar entrypoint is host-specific. Standard MCP Apps hosts
can open the board through its tool resource. Hosts without MCP Apps support can
use the text tools. Host-mediated resource subscriptions are capability-gated;
bounded polling provides refresh when subscriptions are unavailable.

Validate the manifests from the repository root with:

```sh
node scripts/validate-plugin.mjs
```

The validator uses unchanged official schemas stored in `scripts/schemas/`,
downloaded from `https://agent-plugins.org/schemas/1.0.0/`. This command checks schema conformance only; it does not verify host installation
or end-to-end Runtime behavior.
The portable format follows the official packaging guide:
https://developers.openai.com/plugins/build/plugins

No plugin registration or marketplace file is changed by building or validating
this package. Host registration, installation, authentication, and publication
require a separate explicit action.

The local MCP server does not automatically become available to cloud Dot.
This release does not expose a Dot setup entrypoint. External observation tools
remain available to authenticated clients that can reach the local Runtime.

Historical development evidence in [the MCP documentation](../../docs/standard-mcp.md)
records a 2026-10-01 check of `0.4.19-local.mcp.2` with Codex 0.159.3.
That check covered the then-current plugin inventory, report ingestion and
deduplication, and the MCP App resource. It is not acceptance evidence for the
0.4.19 release or for a cloud Dot connection. Existing conversations may require
a fresh conversation to load an updated tool inventory.
