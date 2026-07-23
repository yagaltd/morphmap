spec: task
name: "bootstrap-state-json"
inherits: project
tags: [mech, phase-d, seed, typescript]
---

## Intent

Wire the `seedFromMap()` function so that `/morphmap-init` and `/morphmap-delegate` bootstrap `state.json` from the mindmap. Currently no `state.json` exists on disk — the mech state machine has nothing to read.

The seeding parser already exists in `.morphmap/mech/seed.ts` (pure) and `.morphmap/mech-pi/morphmap-seed.ts` (impure). This task wires the impure layer into the init/delegate flow.

After this task:
- `/morphmap-init` creates `state.json` from the mindmap
- `/morphmap-delegate` creates `state.json` if missing
- Each `[module]`/`[feature]` branch gets its own `plans/<slug>/state.json`
- `state-index.json` maps branchId → state.json path

## Decisions

- Seed only `[module]` and `[feature]` branches (skip `[log]`, `[adr]`, `[phase]`)
- Per-branch state.json: `plans/<slug>/state.json`
- Root state.json: `.morphmap/state.json` (depth 0)
- State index: `.morphmap/state-index.json`
- Emoji resolution: ⬜🔄⏳🔴💤✅ → pending/in_progress/submitted/in_review/blocked/abandoned/done
- Bottleneck as text tag `[bottleneck: x]` to avoid 🔴 emoji clash
- Model assignment from injected config profiles (not hardcoded)

## Boundaries

### Allowed Changes
- Edit `skills/init/SKILL.md` — add state.json bootstrap step
- Edit `skills/delegate/SKILL.md` — add state.json check + bootstrap
- Create `.morphmap/mech-pi/morphmap-seed.ts` (if not already restored)
- Do NOT modify `.morphmap/mech/seed.ts` (pure module — already tested)
- Do NOT modify agent prompt files

### Forbidden
- Do NOT change the seeding parser logic (already tested in seed.test.ts)
- Do NOT change the emoji resolution (already tested)
- Do NOT change the model assignment logic (already in config.ts)

## Completion Criteria

Scenario: Init creates state.json
  Test:
    Package: morphmap-init
    Filter: state_json_created
  Given a mindmap with [module] branches
  When /morphmap-init runs
  Then .morphmap/state.json is created with correct branch statuses

Scenario: Delegate bootstraps state
  Test:
    Package: morphmap-delegate
    Filter: state_bootstrap
  Given no state.json exists but mindmap has [module] branches
  When /morphmap-delegate runs
  Then state.json is created before spawning branch agents

Scenario: Per-branch state.json
  Test:
    Package: morphmap-seed
    Filter: per_branch_state
  Given a mindmap with [module] branches
  When seedFromMap is called
  Then plans/<slug>/state.json is created for each branch

Scenario: State index
  Test:
    Package: morphmap-seed
    Filter: state_index
  Given multiple branch state.json files
  When seedFromMap is called
  Then .morphmap/state-index.json maps branchId → path

Scenario: Emoji parsing correctness
  Test:
    Package: morphmap-seed
    Filter: emoji_correct
  Given the real morphmap.mindmap.md
  When seedFromMap parses it
  Then 4 [module] branches are seeded with correct statuses (commands 🔄, agents ✅, extension 🔄, mech-mindmap 🔄)

Scenario: Model assignment from config
  Test:
    Package: morphmap-seed
    Filter: model_assignment
  Given .morphmap/config with leafProfiles
  When seedFromMap assigns models
  Then each leaf gets the correct ModelAssignment from config (not hardcoded)

## Out of Scope

- md↔json sync hook (separate spec)
- Wiring transition tools into hooks (separate spec)
- Updating agent prompts (separate spec)
- Per-branch state.json runtime sync (deferred to Phase one-map)
