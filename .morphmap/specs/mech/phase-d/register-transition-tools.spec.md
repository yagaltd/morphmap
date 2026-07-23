spec: task
name: "register-transition-tools"
inherits: project
tags: [mech, phase-d, hooks, typescript]
---

## Intent

Wire the mech transition tools into `morphmap-hooks.ts`. Currently the hooks file only does spec guard, model enforcement, map auto-render, changelog, telemetry, and failure recovery. It does NOT import or register any mech functions.

After this task:
- `morphmap_submit_leaf` is registered as a pi tool
- `morphmap_approve_leaf` is registered as a pi tool
- `morphmap_integration_gate` is registered as a pi tool
- All three tools call the orchestration layer (load→pure-handler→save)
- The tools are available to agents via `pi.registerTool`

## Decisions

- Import path: `../../.morphmap/mech-pi/morphmap-tools-pi` (from `.pi/extensions/`)
- State path: `.morphmap/state.json` (default, overridable)
- Tools registered at extension load (in the default export function)
- TypeBox schemas mirror the input interfaces in morphmap-tools.ts
- Tool return format: `{ content: [{ type: "text", text: summary }], details: OrchestratedResult }`

## Boundaries

### Allowed Changes
- Edit `.pi/extensions/morphmap-hooks.ts` — add import + registerMechTools call
- Do NOT modify any file in `.morphmap/mech/` (pure module)
- Do NOT modify `.morphmap/mech-pi/` (separate spec: restore-mech-pi-wiring)
- Do NOT modify agent prompt files (separate spec: update-agent-prompts)

### Forbidden
- Do NOT change the existing hook logic (spec guard, model enforcement, auto-render, telemetry)
- Do NOT change the tool names (morphmap_submit_leaf, morphmap_approve_leaf, morphmap_integration_gate)
- Do NOT change the evidence schema (LeafEvidence fields)

## Completion Criteria

Scenario: Tools registered
  Test:
    Package: morphmap-hooks
    Filter: tools_registered
  Given morphmap-hooks.ts is loaded by pi
  When registerMechTools(pi) is called
  Then pi.registerTool is called 3 times with names: morphmap_submit_leaf, morphmap_approve_leaf, morphmap_integration_gate

Scenario: Submit tool works
  Test:
    Package: morphmap-hooks
    Filter: submit_tool
  Given a valid state.json exists with a leaf in "in_progress"
  When morphmap_submit_leaf is called with valid evidence
  Then the tool returns ok=true and status advances to "submitted"

Scenario: Approve tool works
  Test:
    Package: morphmap-hooks
    Filter: approve_tool
  Given a valid state.json exists with a leaf in "submitted"
  When morphmap_approve_leaf is called with valid review evidence
  Then the tool returns ok=true and status advances to "done"

Scenario: Integration tool works
  Test:
    Package: morphmap-hooks
    Filter: integration_tool
  Given a valid state.json exists with all leaves done
  When morphmap_integration_gate is called
  Then the tool returns ok=true and branch status advances to "done"

Scenario: Submit tool blocked on bad evidence
  Test:
    Package: morphmap-hooks
    Filter: submit_blocked
  Given a valid state.json exists with a leaf in "in_progress"
  When morphmap_submit_leaf is called with agentSpecPassed=false
  Then the tool returns ok=false and status stays "in_progress"

Scenario: No state.json
  Test:
    Package: morphmap-hooks
    Filter: no_state
  Given no state.json exists
  When morphmap_submit_leaf is called
  Then the tool returns ok=false with summary "no .morphmap/state.json"

## Out of Scope

- Creating the mech-pi/ wiring layer (separate spec)
- Updating agent prompts (separate spec)
- md↔json sync hook (separate spec)
- Bootstrapping state.json from mindmap (separate spec)
