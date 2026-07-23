spec: task
name: "update-agent-prompts"
inherits: project
tags: [mech, phase-d, agents, prompts]
---

## Intent

Update agent system prompts to use mech transition tools instead of trust-based completion. Currently:
- branch-agent.md uses `/goal` (create_goal/update_goal) for tracking, hand-writes ✅ to map
- leaf-worker.md calls `morphmap_submit_leaf` in prompt but the tool isn't registered
- reviewer.md doesn't feed evidence into approve_leaf

After this task:
- branch-agent.md uses `morphmap_approve_leaf` + `morphmap_integration_gate` instead of /goal
- leaf-worker.md calls `morphmap_submit_leaf` (now registered) — tool call IS the proof
- reviewer.md writes findings as evidence for `morphmap_approve_leaf`
- No hand-written ✅ for mech-tracked leaves — the tool call is the proof

## Decisions

- Branch agent: replace step 0b (create_goal) and step 13 (update_goal complete) with mech tool calls
- Leaf worker: `morphmap_submit_leaf` is the ONLY way to advance status — no prose ✅
- Reviewer: findings become evidence fields (qualityReviewP0Count, qualityReviewP1Count, etc.)
- Branch agent: `morphmap_approve_leaf` after reviews pass, `morphmap_integration_gate` after all leaves done
- Keep /goal for 5-why root cause analysis (failure investigation) — not for completion tracking

## Boundaries

### Allowed Changes
- Edit `.pi/agents/branch-agent.md` — replace /goal with mech tools
- Edit `.pi/agents/leaf-worker.md` — emphasize tool call as proof
- Edit `.pi/agents/reviewer.md` — feed findings as evidence
- Do NOT modify `.morphmap/mech/` (pure module)
- Do NOT modify `.morphmap/mech-pi/` (wiring layer)
- Do NOT modify `.pi/extensions/morphmap-hooks.ts` (hooks layer)

### Forbidden
- Do NOT remove the execution loop (steps 0-13)
- Do NOT remove the decision matrices (Eisenhower, Value×Impact)
- Do NOT remove the quality pipeline (reviewer, quality-reviewer, bug-hunter)
- Do NOT change the leaf format or tag system

## Completion Criteria

Scenario: Branch agent uses approve_leaf
  Test:
    Package: branch-agent
    Filter: approve_leaf_usage
  Given the branch-agent.md system prompt
  When reviewing the Mech section
  Then it contains morphmap_approve_leaf with correct parameters (leafId, reviewFile, evidence)

Scenario: Branch agent uses integration_gate
  Test:
    Package: branch-agent
    Filter: integration_gate_usage
  Given the branch-agent.md system prompt
  When reviewing the Mech section
  Then it contains morphmap_integration_gate with correct parameters (reviewFile)

Scenario: Leaf worker tool call is proof
  Test:
    Package: leaf-worker
    Filter: tool_is_proof
  Given the leaf-worker.md system prompt
  When reviewing the Mech section
  Then it states "Never claim ✅ done in prose. The tool call IS the proof."

Scenario: Reviewer feeds evidence
  Test:
    Package: reviewer
    Filter: evidence_feed
  Given the reviewer.md system prompt
  When reviewing the Mech section
  Then it states findings become evidence for morphmap_approve_leaf

Scenario: No hand-written ✅
  Test:
    Package: branch-agent
    Filter: no_handwritten_done
  Given the branch-agent.md system prompt
  When searching for ✅ in map-write context
  Then it says "Never hand-write ✅ to the map for mech-tracked leaves"

Scenario: Goal still used for 5-why
  Test:
    Package: branch-agent
    Filter: goal_for_5why
  Given the branch-agent.md system prompt
  When searching for create_goal
  Then it only appears in the 5-why root cause section, not in completion tracking

## Out of Scope

- Wiring transition tools into hooks (separate spec)
- Bootstrapping state.json (separate spec)
- md↔json sync hook (separate spec)
- Restoring mech-pi wiring layer (separate spec)
