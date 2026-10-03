# Task creator display

The shared Board shows each task's creator as an avatar, with its name in the
tooltip and accessible label. Both owned and external issue details show the
creator's avatar and name in the top-right header. Execution
assignment remains a separate row and field. A transfer to another agent or user
does not change the original creator. Source, confidence and observation-only
behavior remain in the tooltip and details instead of dot-specific card chips.
External details use the same header, title, description, conversation container,
fullscreen controls, and window sizing as owned details. Reports and sync history
stay read-only; matching the layout does not grant scheduling, reply, or acceptance
authority. Historical reports are not represented as a complete source transcript.

Owned tasks resolve their persisted `creator_user_id` through the existing user
directory (or matching `creator_user` projection). They use that user's existing
avatar or generated initials. Missing historical IDs do not become the current
user, assignee or default Codex agent.

External task names and identities are caller declarations. A private local
mapping can select a creator display profile for an exact provider/account/host/
thread tuple explicitly designated by the user. Titles, names, parent thread IDs
and `room_id` are never creator identifiers or matching heuristics. A local profile
ID is a display alias, not an official stable creator ID. Platform verification
remains `unknown`; a local mapping does not confer execution or acceptance rights.

An explicitly designated entire reporter source can use `scope: "source"` and omit
`thread_id`; this matches only that exact provider/account/host namespace, allowing
its later reports to share the avatar without per-task labels. Task mappings take
precedence. No source-wide binding is inferred automatically. The real-image
acceptance uses an exact task mapping, not this broader opt-in.

## Private configuration

The Runtime reads `task-creator-profiles.json` in its profile home. Isolated
validation can use `BETTER_CODEX_TASK_CREATOR_PROFILES` to select a different
file. The file and PNG must be regular files with private permissions (0600 on
Unix); symlinks, broad permissions and malformed/ambiguous mappings fail closed.
Example with deliberately synthetic identity values:

```json
{
  "schema_version": 1,
  "profiles": [
    {
      "id": "my-dot",
      "name": "dot",
      "avatar_file": "/absolute/private/assets/dot.png"
    }
  ],
  "mappings": [
    {
      "provider": "codex",
      "account_id": "explicit-account",
      "host_id": "explicit-host",
      "thread_id": "explicit-task",
      "profile_id": "my-dot"
    }
  ]
}
```

The authenticated bootstrap contains deduplicated `task_creator_profiles` with
local PNG data URLs; observation records carry only a local profile reference.
No filesystem locator or signed URL reaches the browser. Profiles and images use
a bounded Runtime cache that invalidates when metadata changes. Static PNGs are
limited to 300,000 bytes, 512×512 pixels and 262,144 total pixels. Browser decode
errors fall back to initials while preserving the creator's name. Missing or
invalid pictures do not remove an otherwise explicit display mapping.

Report callers cannot submit a local profile reference or avatar. Unknown sources
show “未知创建者” even when they claim the name dot. Configuration removal revokes
the corresponding display mapping on the next read/bootstrap refresh.

## History and handoff

Historical observations acquire mapped display identity on read without rewriting
their stable ID, sequence, timestamps, messages or payload. New reports persist a
separate first creator declaration; subsequent executor/name changes retain that
declaration and record the current `executor_name` separately. Legacy rows can
preserve only the declaration they already recorded; no earlier creator history
is invented. Unmapped historical records remain unknown in the card.

## Verification and installation boundary

`test/task-creator-profiles.test.ts` checks exact mapping, impersonation attempts,
history compatibility, handoff/restart, cache invalidation, private-file safety,
oversized/animated PNGs and missing assets. The browser test checks the actual
shared Board, separate Alice/Bob creator and executor profiles, unknown identity,
detail provenance and failed browser decoding.

Private real images and task snapshots are supplied only through optional
`BETTER_CODEX_TEST_DOT_AVATAR` and `BETTER_CODEX_TEST_DOT_SNAPSHOT` paths. No raw
user image is tracked in this repository. A snapshot-based browser run is an
isolated import, not automatic remote discovery or live remote synchronization.

On 2026-10-01 the explicitly authorized local Runtime was updated to immutable
`0.4.19-local.mcp.3` through offline activation and the normal desktop restart.
The real native Board displayed the privately configured dot image and name;
decoded PNG bytes matched the supplied avatar. The mapping covers one exact
task, and its platform identity remains unknown. It does not discover cloud
tasks automatically. The observed report was stale, which remained visible.

Read-only installed acceptance preserved the existing Session Host instance,
business counts and old `.2` core. The available archived Board API records were
also checked with the shared creator presentation: 233 without a creator ID
remained unknown, and 16 with IDs resolved to their matching user (3) or safely
remained unknown (13). None acquired the dot display profile. Actual active user
and unknown avatar cards were not visually exercised: the active Board had only
the dot observation, and the archive list does not render creator avatars. No
tasks were created or unarchived to fabricate that coverage. The new acceptance
script makes no task writes or inference calls; it does not retest plugin cache
registration or rollback execution.

Future installations must use a new immutable local version and the coordinated
activation path, preserving the old core, Host and data. A code rollback must
not restore an older business database or overwrite live Runtime authority.
