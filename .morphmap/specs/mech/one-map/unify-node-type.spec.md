spec: task
name: "unify-node-type"
inherits: project
tags: [mech, one-map, types, typescript]
---

## Intent

Unify the separate `Leaf` and `BranchState` types into a single `Node` type. Currently the state machine has two entity types with different fields, creating complexity in the state machine, gate functions, and tool handlers.

A `Node` with `children: []` is a leaf. A `Node` with `children: [...]` is a branch. Same state machine, same gates, same tools.

## Decisions

- Core fields always present: `id`, `status`, `children`, `metadata`
- `children: string[]` — empty = leaf, non-empty = branch
- `metadata: Record<string, unknown>` — open object for domain-specific fields
- Required metadata: `model`, `thinking`, `tools`, `qa`, `test`, `priority`
- Optional metadata: `budget`, `eta`, `session_id`, `estLoc`
- Leaf-specific fields (evidence, reviewRounds, trace) move to `metadata`
- Branch-specific fields (subBranches, childBranchStatus, integrationStatus) move to `metadata`
- `LeafStatus` and `BranchStatus` merge into `NodeStatus` (same 7 states: pending, in_progress, submitted, in_review, blocked, abandoned, done)
- Backward compatibility: `Leaf` and `BranchState` become type aliases for `Node` with specific metadata shapes

## Boundaries

### Allowed Changes
- Edit `.morphmap/mech/types.ts` — add `Node` type, `NodeStatus`, keep `Leaf`/`BranchState` as aliases
- Edit `.morphmap/mech/state.ts` — update `transitionLeaf` to work with `Node`
- Edit `.morphmap/mech/tools.ts` — update `submitLeaf`/`approveLeaf`/`integrationGate` to work with `Node`
- Edit `.morphmap/mech/config.ts` — no changes needed (already works with bottleneck/qa/test)
- Edit `.morphmap/mech/gates/*.ts` — update gate functions to read from `Node.metadata`
- Edit `.morphmap/mech/seed.ts` — update `buildBranchState` to produce `Node`
- Edit `.morphmap/mech/lattice.ts` — update if it references Leaf/BranchState
- Edit all test files — update to use `Node` type
- Create `.morphmap/mech/node.test.ts` — 10 tests for Node type behavior

### Forbidden
- Do NOT change the state machine logic (transitions, gates)
- Do NOT change the pure/impure split
- Do NOT change the test count or coverage

## Completion Criteria

Scenario: Node type unifies leaf and branch
  Test:
    Package: node
    Filter: unifies_types
  Given a Node with children: []
  When I check if it's a leaf
  Then it is treated as a leaf (has evidence, reviewRounds in metadata)

Scenario: Node with children is a branch
  Test:
    Package: node
    Filter: branch_detection
  Given a Node with children: ["child1", "child2"]
  When I check if it's a branch
  Then it is treated as a branch (has subBranches, integrationStatus in metadata)

Scenario: Same state machine for both
  Test:
    Package: node
    Filter: same_machine
  Given a Node (leaf) and a Node (branch)
  When I call transitionLeaf on both
  Then the same transition rules apply

Scenario: Backward compatibility
  Test:
    Package: node
    Filter: backward_compat
  Given existing code using Leaf and BranchState
  When I compile with tsc
  Then no type errors (aliases work)

Scenario: Seed produces Node
  Test:
    Package: node
    Filter: seed_produces_node
  Given a mindmap with [module] branches
  When seedFromMap parses it
  Then each branch is a Node with children, each leaf is a Node with empty children

Scenario: Tools work with Node
  Test:
    Package: node
    Filter: tools_work
  Given a state.json with Node entities
  When applySubmitLeaf is called
  Then the leaf transitions correctly

Scenario: All existing tests still pass
  Test:
    Package: node
    Filter: regression
  Given the unified Node type
  When I run bun test
  Then all 128 existing tests pass (plus 10 new Node tests = 138 total)

Scenario: tsc --noEmit clean
  Test:
    Package: node
    Filter: tsc_clean
  Given the unified Node type
  When I run npx tsc --noEmit
  Then exit code 0, no errors

## Out of Scope

- Changing the state machine transition logic
- Changing the gate functions' validation logic
- Per-branch state.json (deferred to Phase one-map)
- Compiler hook (separate spec)
- Map = session tree (separate spec)
