# Dot reporting research (setup suspended)

Dot setup is currently hidden from the shared product UI, including the MCP App, Local Web, Relay Web, and development Mockup. There is no Dot setup tab or mounted setup page. Existing external observations, reporting APIs, and stored data are retained.

The approaches below are research notes, not a supported setup flow. Direct Dot access to the installed local MCP has not been verified; the local reporting-task workaround is suspended.

## Local-only reporting through a connected computer

The primary local-only route is **Dot → one reused local reporting task → installed Better Codex MCP → local Runtime → board**. Dot supplies each status event proactively. The reporter preserves the original source identities and does not infer cloud progress by scanning local tasks. It never executes the source task again.

1. In the ChatGPT desktop app, open the Dot profile and inspect Computers → Your computer. The user authorizes access if it is not already connected. Keep the computer online and the desktop app open. Codex SSH connections or Work Sync alone do not grant this access.
2. Install the local Better Codex plugin, run its Runtime, and verify the existing reporting opt-in. These are local prerequisites; no Platform API key, public service or Tunnel is required.
3. Manually send the copied setup request to Dot. It asks Dot to reuse or create one local reporting task when the cloud cannot see local MCP tools, and to forward original immutable task events through that task. The local task reads the packaged dot-reporting Skill and calls the installed MCP.
4. Verify a real Dot-originated event with the returned observation ID and its applied event-log record. Repeat with another state for the same source task. Rule saved, local task created, and actual board update are separate results.
5. While the computer is offline, Dot retains source-side pending events. After reconnection, it reuses the reporting task and retries the same event IDs in order. A saved rule alone does not configure an automatic retry schedule.

This design uses the documented ability for Dot to create and continue local tasks, but the complete reporting round trip still requires live acceptance. Local reporter turns consume task/model usage. Do not advertise direct cloud access to a local stdio server or guaranteed lifecycle hooks.

Official computer connection documentation: <https://learn.chatgpt.com/docs/dots/computers-and-apps>.

## Optional developer connection through Secure MCP Tunnel

The local Codex plugin and a cloud Dot connection are separate installations. For a personal connection, use the official OpenAI Secure MCP Tunnel with the stable installed command `better-codex mcp --dot`. This mode exposes only `external_tasks_report`, `external_observations_list`, `external_observations_get`, and `external_observations_events`. It does not expose the full MCP App, owned Issue writes, generic Runtime transport, resources, shell, or acceptance. The Runtime remains the only business database owner. The reporting process does not start or replace it.

Official reference: <https://developers.openai.com/api/docs/guides/secure-mcp-tunnels>. This is private developer-mode integration, not public plugin publication. The latter requires a stable public HTTPS endpoint and appropriate OAuth authorization.

1. Verify an installed version that supports `mcp --dot`, a ready local Runtime, and the existing reporting opt-in. Run `node scripts/connect-dot-tunnel.mjs --check` from the checkout; this makes read-only MCP calls and verifies the exact four-tool surface before any tunnel starts.
2. In Platform Tunnel settings, create a dedicated `better-codex-dot` tunnel associated only with the intended personal organization and ChatGPT workspace. Do not reuse a tunnel authorized for another app. Platform management requires Tunnels Read + Manage; runtime use requires Tunnels Read + Use. These are separate from ChatGPT developer-mode access.
3. Supply a dedicated runtime key through a private 0600 file outside the repository. The user creates/enters the credential through their account's supported controls. Never paste keys into conversation, commit them, or give the daemon an admin key.
4. Run the explicit operator helper:

   ```sh
   node scripts/connect-dot-tunnel.mjs --tunnel-id tunnel_ACTUAL_ID --runtime-key-file /absolute/private/runtime-key
   ```

   It uses `tunnel-client runtimes connect` and then prints the managed runtime status. It does not create an account, credentials, or a remote tunnel. Inspect `process_running`, `healthy`, and `ready` in the reported status; launched is not connected. Stop it using `tunnel-client runtimes stop better-codex-dot` when needed. Neither builds nor verification start a tunnel.
5. While the client is running, create a private plugin in ChatGPT developer mode, choose Connection → Tunnel, and select this tunnel. Install the plugin and invoke it in the actual Dot context. Listing the four tools and reading reporting capability is the first acceptance step; a visible plugin alone is insufficient.
6. Verify a real authorized task: persist the source event, report running → meaningful progress → completed, read the same card ID and event receipts, and confirm completion is awaiting review. Separately exercise a lost response/reconnect with the same event ID and an offline pending event. No duplicated card or execution may result.

The plugin's [Dot reporting Skill](../plugins/better-codex/skills/dot-reporting/SKILL.md) contains the producer contract and a Unix/Python durable outbox helper. A Tunnel does **not** automatically import this local Skill into Dot. The MCP initialize instructions carry the essential semantics. To install the full producer workflow, provide that Skill through the host's supported plugin/Skill route. The outbox must run in the producer's durable environment, not on an unrelated local machine. It retains exact immutable events until matching applied receipts are read back. A replayed `duplicate` may originally have been rejected, so the event log's original outcome must be checked. Current snapshot state may legitimately have advanced since the event.

Unattended retry requires a separately configured and authorized Dot wakeup/follow-up mechanism. These changes do not silently register a cloud timer or claim that every future task has an automatic producer. If the cloud has no writable durable storage, report `prepared` rather than `queued`. Keep pending queue, tunnel readiness, plugin installation, actual Dot calls, and board readback as separate evidence gates.

The UI resource explicitly sets `ui.prefersBorder=false`. This is a host rendering preference, not an API to hide the Codex sidebar app's title bar. The currently installed OpenAI extension schema supports entrypoints and display modes but does not expose a header visibility setting; that host title bar remains outside the embedded product document.

Verification: `test/e2e/mcp/board.spec.ts` and `test/e2e/web/dots-setup.spec.ts` confirm that Dot configuration is absent while ordinary settings remain usable. These fixtures do not establish a live Dot reporting connection.
