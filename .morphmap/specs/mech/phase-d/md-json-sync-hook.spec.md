spec: task
name: "md-json-sync-hook"
inherits: project
tags: [mech, phase-d, sync, hooks, typescript]
---

## Intent

Implement the md↔json sync hook in `morphmap-hooks.ts`. Per docs/mech-mindmap.md §2.7 Step A: when the mindmap is written, parse markdown → validate → write state.json. When state.json changes, regenerate mindmap.md.

Currently the hooks only do auto-render (md→html) and changelog generation. They do NOT sync markdown ↔ state.json.

After this task:
- On mindmap write: parse markdown → validate tags → update state.json
- On state.json change: regenerate mindmap.md from state.json (normalize formatting)
- Invalid mindmap edits are blocked (commit rejected)
- Round-trip guarantee: state.json → state.json' is identical

## Decisions

- Hook fires on `write`/`edit` to `morphmap.mindmap.md` (same as existing auto-render hook)
- Parse: use existing `parseMapToBranches` from `mech/seed.ts` (pure, tested)
- Validate: use existing `validateBranchState` from `mech/validate.ts` (pure, tested)
- Sync: update per-branch `plans/<slug>/state.json` + root `.morphmap/state.json`
- Block: if validation fails, reject the commit with a clear error
- Normalize: regenerate mindmap.md from state.json to normalize formatting

## Boundaries

### Allowed Changes
- Edit `.pi/extensions/morphmap-hooks.ts` — add md→json sync on mindmap write
- Do NOT modify `.morphmap/mech/seed.ts` (pure parser — already tested)
- Do NOT modify `.morphmap/mech/validate.ts` (pure validator — already tested)
- Do NOT modify agent prompt files

### Forbidden
- Do NOT change the existing auto-render hook (md→html)
- Do NOT change the existing changelog generation
- Do NOT change the existing telemetry/logging
- Do NOT implement reverse sync (json→md) beyond normalization — full round-trip deferred to Phase one-map

## Completion Criteria

Scenario: Mindmap write updates state.json
  Test:
    Package: morphmap-hooks
    Filter: md_to_json
  Given a mindmap with [module] branches
  When morphmap.mindmap.md is written/edited
  Then state.json is updated with correct branch/leaf statuses

Scenario: Invalid mindmap blocks commit
  Test:
    Package: morphmap-hooks
    Filter: invalid_blocked
  Given a mindmap with invalid status markers
  When morphmap.mindmap.md is written
  Then the hook blocks the commit with a validation error

Scenario: State.json regenerates mindmap
  Test:
    Package: morphmap-hooks
    Filter: json_to_md
  Given a state.json with updated leaf statuses
  When the sync hook runs
  Then mindmap.mindmap.md is regenerated with correct status emojis

Scenario: Round-trip identity
  Test:
    Package: morphmap-hooks
    Filter: round_trip
  Given a state.json
  When state.json → mindmap.md → state.json'
  Then state.json == state.json' (no drift)

Scenario: Per-branch state sync
  Test:
    Package: morphmap-hooks
    Filter: per_branch_sync
  Given a mindmap with [module] branches
  When morphmap.mindmap.md is written
  Then plans/<slug>/state.json is updated for each branch

## Out of Scope

- Wiring transition tools into hooks (separate spec)
- Bootstrapping state.json from mindmap (separate spec)
- Updating agent prompts (separate spec)
- Full reverse sync with extras preservation (deferred to Phase one-map)
