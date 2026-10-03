# Standard MCP and Runtime task evaluation

This implementation lives in an isolated feature checkout based on `182aab11f6330e36c491a2c212b2751afcff8dd3`. The original checkout remains unchanged. On 2026-10-01 the user explicitly authorized installation into their local environment. Local version `0.4.19-local.mcp.2` is now installed and verified through the installed Codex host and native Better Codex board. It is not a published or signed release.

## Implemented boundary

The official `@modelcontextprotocol/sdk` serves stdio; `@modelcontextprotocol/ext-apps` serves the board resource. OpenAI entrypoints and resource proxying use optional `@openai/mcp-extensions` metadata. Standard clients can use the task tools without any OpenAI extension. App-capable hosts can open the shared board. There is no new HTTP MCP transport, OAuth permission, public listener, tunnel or deployment.

| Tool | Allowed action |
|---|---|
| `tasks_list`, `tasks_get` | Read owned Better Codex tasks |
| `tasks_create` | Persist a non-executing task using an idempotent request ID |
| `tasks_update` | Update title, description, labels, priority and pin with the current version |
| `external_observations_list`, `external_observations_get` | Read separately stored external reports and freshness |
| `external_observations_report` | Submit declared reports to a Runtime that explicitly enables ingestion |
| `board_snapshot`, `board` | Read the combined display; `board` also opens the App resource |
| `board_api_request` | Compatibility App-only bounded display reads |
| `runtime_read`, `runtime_command`, `runtime_events` | App-only authenticated shared product transport, durable writes and cached Runtime event stream |

Model-facing task tools do not set execution ownership, assign an agent, resume/rename a thread, dispatch a task, archive external work, or grant acceptance. Task creation stores `agent_enabled=false` and `ai_enrich=false`. App-only transport preserves the complete product UI's existing authorized actions. Updates use optimistic versions; a retry with a stale version reports a conflict. External IDs cannot be passed to owned-task writes.

External reports remain in `external_observations`, never in `issues`, `issue_sessions` or `session_commands`. Creation, progress, waiting, failure and completion remain declarations by an authorized reporter. The Runtime strips identity/acceptance claims, deduplicates item IDs, persists sequence fences, and exposes `creator.verification=unknown`, `creator.avatar=null`, `acceptance_state=unknown`. Completed reports appear in review. The current dot profile supplies no stable creator identifier, so its short-lived avatar URL is not embedded.

The subsequent creator-display source change supports a user-designated private avatar/profile mapping for an exact source/thread tuple, while retaining unknown platform verification. Assets are deduplicated in authenticated bootstrap rather than repeated in every observation. Creator and executor remain separate; provenance moves to tooltip/details. See [task creator display](task-creator-display.md). This UI change has isolated acceptance and has not replaced the installed `.2` core.

## Board and model behavior

The App embeds the shared generated product UI, including owned cards, external observation cards, Agents, Projects and Settings. Its App-only transport keeps Runtime credentials server-side and supports existing product actions. Local and Relay Web consume the same generated entry. Legacy page injection, sidebar recovery and launch tools are retired; native thread commands and catalog synchronization use an independent bridge without rendering product UI. Local development Mockup uses its own source-only plugin, temporary simulation service and restricted transport.

Runtime semantic evaluation of owned `IssueRun` execution now uses `scheduler-evaluation.ts`, version `better-codex.scheduler-evaluation/v1`. It runs a fresh ephemeral `gpt-6.1-sol` evaluation with `service_tier=default`, ignores personal configuration/rules, disables MCP/apps/plugins/hooks/shell/agents, and supplies strict output schema plus untrusted evidence in JSON. Existing authentication is consumed by the Codex CLI; no credentials are copied or created.

The model chooses `completed_awaiting_review`, `in_review` or `blocked`. Code validates exact fields and quotations from the final reply, makes execution failure take precedence, and maps semantic completion to `in_review`. It cannot grant human acceptance; persisted manual `done` is preserved. Old Skill sources remain compatible, with a migration note. Settings show the fixed evaluator instead of a saved legacy model override.

External reported state is still source evidence, not a second Runtime semantic evaluation of the entire remote conversation. That conversation is not available through this integration. Only provided report messages are stored, and platform-level creator authentication and full remote discovery remain unavailable.

## Verification

| Check | Result and scope |
|---|---|
| `npm run verify` | 334 tests: 322 passed, 12 skipped, zero failed; generated bundles, types, design tokens and plugin schemas passed |
| Existing board and MCP App browser suite | 34/34 passed in isolated Chromium and temporary Runtime homes |
| Final App bridge regression | 2/2 passed after removing display-only locale from proxied API queries |
| MCP SDK/Runtime suite | 6/6 passed: initialization, auth, safe writes/replay, version conflicts, reporting, subscriptions and real stdio |
| Model evaluator suite | 7/7 passed; subprocess model outputs are simulated, exercising actual worker persistence and failure paths |
| Real model probes | Two real GPT-6.1-Sol/default CLI calls passed schema validation; completion mapped to review; injected acceptance/tool instructions were ignored; zero tool calls |
| Actual current-task report | Compiled CLI stdio → temporary Runtime → controlled MCP Apps browser host and existing Web board passed; 4 ms report roundtrip, 301 ms to visible App update, one local sample |
| Local CLI package | Official SDK handshake passed against the bundled CLI; archive contains plugin manifests and legacy Skill |

The current-task report used a real delegated task ID supplied by the caller, with declared identity. It verified one active reporting path, not discovery of all dots tasks. Database counts stayed at one deliberately created owned task, one external observation, zero sessions and zero commands. Real model calls validate inference separately from the simulated worker integration tests; they are not proof of a production task lifecycle.

The preceding feature tests used a controlled browser host and temporary Runtime homes. The later installed-host acceptance is separate: Codex 0.159.3 loaded `better-codex@better-codex-local`, exposed all 11 tools, ingested and deduplicated a caller-declared current-task report, and read the MCP App resource. This acceptance used an ephemeral GPT-6.1-Sol/default thread with zero inference calls.

The existing native board then displayed exactly one observation card and updated running → reported completion awaiting review. Visible refresh samples were 107 ms and 2,831 ms; its foreground polling interval is approximately three seconds and hidden windows defer refresh. Existing Board, Agents and Projects navigation entries remained single, visible 36×36 px entries. The final core fixes a real desktop bridge omission by allowing only GET collection/detail routes for external observations. Reports and other mutations remain prohibited through that bridge. The preserved Session Host retained PID 2508 and its original instance; counts remained 251 issues, 250 runs, 223 sessions and 630 commands. These results demonstrate this one active reporter, not discovery of all cloud/dot tasks. External/self-host deployment tests were not run.

## Reproduce without installation

Run in an isolated checkout with Node 22 and the repository dependencies:

```sh
npm run build
npm run verify
npx playwright test test/e2e/browser test/e2e/mcp test/e2e/web --headed
node --import tsx scripts/verify-mcp-report.ts \
  --task-id YOUR_AUTHORIZED_TASK_ID \
  --evidence-dir /tmp/better-codex-mcp-evidence
```

The last command creates and removes a temporary Runtime and uses an isolated browser. Its identity is caller-declared. For generic test IDs, label the run synthetic. It does not install or refresh anything. The compile and local package checks also do not install or activate their output.

## Installed local connection

The portable plugin is `plugins/better-codex`, validated against unchanged official Agent Plugins 1.0.0 schemas. The local Plugin Creator helper was unavailable; its helper was not used. Installation used the supported Codex marketplace/plugin CLI and a repository-local marketplace manifest. See [plugin README](../plugins/better-codex/README.md).

The stable `better-codex` command now selects the installed feature core, whose Runtime is running. The user's authorized report opt-in is saved in a private local file and propagated as `BETTER_CODEX_MCP_ALLOW_REPORTS=1` in the existing service. The plugin itself does not enable this setting or start a second Runtime.

A local MCP client uses the standard stdio entrypoint `better-codex mcp`. The installed plugin uses the stable launcher, never a version-directory executable. The actual supported installation was `codex plugin marketplace add REPOSITORY --json`, then `codex plugin add better-codex@better-codex-local --json`. The prior standalone registration named `better-codex` masked plugin ownership; after verifying the plugin cache and manifests, `codex mcp remove better-codex` removed only that duplicate registration. Fresh host verification then confirmed the plugin ID, version and tools. Existing conversations may need a fresh conversation to load their new inventory.

ChatGPT web cannot directly spawn a local stdio process. Dot configuration is currently hidden from the product UI. Direct Dot access to the installed local MCP has not been verified, and the local reporting-task workaround is suspended; see [Dot reporting research](dots-setup.md). Optional developer connections can use the official OpenAI Secure MCP Tunnel to the restricted `better-codex mcp --dot` entrypoint; see [Dot setup](dots-setup.md). This exposes four external reporting tools and no App transport or owned-task writes. Tunnel account association, runtime credentials, client readiness and actual Dot calls require separate verification; adding this source entrypoint does not establish a live cloud connection. OpenAI global sidebar metadata does not establish that every host exposes that entrypoint.

MVP rollout should start with explicitly connected task reporters and local task management. Full durable/dot discovery, verified identity/avatar, remote authorization, bounded retention and scale, broader host compatibility and lifecycle acceptance remain separate work. MCP provides a useful contract; it does not itself grant access to platform-only task APIs.

## Local installation opt-in

`better-codex mcp reporting enable` saves a private, versioned local setting; `disable` revokes it and `status` shows the configured and effective values. Restart the Runtime normally after changing it. macOS services propagate the enabled value as `BETTER_CODEX_MCP_ALLOW_REPORTS=1`; an explicit environment value overrides the file and any value other than `1` disables reports. The setting does not grant remote access, install credentials, discover cloud tasks, verify a creator, or dispatch work.

The `0.4.19-local.mcp.2` package is a local installation checkpoint, not a published or signed release. Its source is the existing feature checkpoint plus local configuration/activation changes and the GET-only desktop bridge fix. Earlier immutable cores remain available for rollback.

An explicit locally authorized archive can select its verified CJS with `better-codex update activate-local --executable PATH --version VERSION --sha256 HEX` only while both the Runtime and its service are stopped. The local coordinator uses the existing update lock, fences Runtime startup, validates package version in isolated temporary homes, retains the previous immutable core and pointer bytes, and journals the selection. `pendingRestart` does not mean readiness. The offline package installer uses `--no-service`; resume with the normal service/desktop path and verify `/readyz`. `rollback-local --operation-id ID` restores an interrupted selection only before any new Runtime authority generation. After the target has run, stop it normally and select the retained old verified artifact as a new local activation, then restore backed launcher/configuration files. Business databases are never restored by code rollback.
