spec: task
name: "restore-mech-pi-wiring"
inherits: project
tags: [mech, phase-d, wiring, typescript]
---

## Intent

Restore the `.morphmap/mech-pi/` directory that was removed. This directory contains the impure wiring layer that connects the pure mech state machine (in `.morphmap/mech/`) to the pi runtime. Without it, the 180-test pure state machine is dead code — no transition tools are registered, no state.json is read or written.

The mech-pi layer has three files:
- `morphmap-state.ts` — loadState/saveState with atomic write (tmp→fsync→rename)
- `morphmap-tools.ts` — orchestration: load→pure-handler→save for submitLeaf/approveLeaf/integrationGate
- `morphmap-tools-pi.ts` — TypeBox schemas + pi.registerTool wrappers

## Decisions

- Pure/impure split: `mech/` (pure, zero pi imports) stays in `.morphmap/mech/`. Impure wiring goes in `.morphmap/mech-pi/`.
- TypeBox import path is `"typebox"` (pi bundles v1.1.38).
- ExtensionAPI type import path is `"@earendil-works/pi-coding-agent"`.
- State path: `.morphmap/state.json` (single root state for now; per-branch state.json deferred to Phase one-map).
- Cross-dir TS import: `mech-pi/` → `../mech` resolves via bun (53 exports).

## Boundaries

### Allowed Changes
- Create `.morphmap/mech-pi/morphmap-state.ts`
- Create `.morphmap/mech-pi/morphmap-tools.ts`
- Create `.morphmap/mech-pi/morphmap-tools-pi.ts`
- Create `.morphmap/mech-pi/morphmap-seed.ts` (seedFromMap bootstrap)
- Create `.morphmap/mech-pi/morphmap-state.test.ts` (5 round-trip tests)
- Create `.morphmap/mech-pi/morphmap-tools.test.ts` (8 orchestration tests)
- Create `.morphmap/mech-pi/morphmap-seed.test.ts` (7 integration tests)

### Forbidden
- Do NOT modify files in `.morphmap/mech/` (pure module — already tested)
- Do NOT modify `.pi/extensions/morphmap-hooks.ts` (separate spec: register-transition-tools)
- Do NOT modify agent prompt files (separate spec: update-agent-prompts)
- Do NOT change the pure state machine logic

## Completion Criteria

Scenario: State round-trip
  Test:
    Package: morphmap-state
    Filter: round_trip
  Given a valid BranchState object
  When saveState writes it to a temp file and loadState reads it back
  Then the loaded state is identical to the original (including abandonedReason, transitions, integrationStatus)

Scenario: State atomic write
  Test:
    Package: morphmap-state
    Filter: atomic_write
  Given a state to save
  When saveState writes to state.json
  Then the file is written atomically (tmp→fsync→rename) and no partial state is visible on crash

Scenario: State missing file
  Test:
    Package: morphmap-state
    Filter: missing_file
  Given no state.json exists
  When loadState is called
  Then it returns null (not an error)

Scenario: State corrupt file
  Test:
    Package: morphmap-state
    Filter: corrupt_file
  Given state.json contains invalid JSON
  When loadState is called
  Then it throws a clear error message (not a silent failure)

Scenario: Orchestration submit
  Test:
    Package: morphmap-tools
    Filter: submit_orchestration
  Given a valid state.json with a leaf in "in_progress" status
  When applySubmitLeaf is called with valid evidence
  Then it returns ok=true, summary contains "submitted", and state.json is updated

Scenario: Orchestration approve
  Test:
    Package: morphmap-tools
    Filter: approve_orchestration
  Given a valid state.json with a leaf in "submitted" status
  When applyApproveLeaf is called with valid review evidence
  Then it returns ok=true, summary contains "done", and state.json is updated

Scenario: Orchestration integration
  Test:
    Package: morphmap-tools
    Filter: integration_orchestration
  Given a valid state.json with all leaves done
  When applyIntegrationGate is called
  Then it returns ok=true, summary contains "done", and branch status is "done"

Scenario: Orchestration no state
  Test:
    Package: morphmap-tools
    Filter: no_state
  Given no state.json exists
  When applySubmitLeaf is called
  Then it returns ok=false, summary contains "no .morphmap/state.json"

Scenario: Seed from map
  Test:
    Package: morphmap-seed
    Filter: seed_from_map
  Given the real morphmap.mindmap.md
  When seedFromMap is called
  Then it creates state.json for each [module] branch with correct leaf statuses

Scenario: Seed emoji parsing
  Test:
    Package: morphmap-seed
    Filter: emoji_parsing
  Given a mindmap with ⬜🔄⏳🔴💤✅ markers
  When parseLeafLine parses each line
  Then the correct LeafStatus is extracted for each emoji

## Out of Scope

- Wiring registerMechTools into morphmap-hooks.ts (separate spec)
- Updating agent prompts to use mech tools (separate spec)
- md↔json sync hook (separate spec)
- Per-branch state.json (deferred to Phase one-map)
- codebase-graph sync (deferred to Phase one-map)
