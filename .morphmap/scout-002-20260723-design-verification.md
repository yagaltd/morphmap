---
type: handoff
agent: morphmap/scout
id: scout-002
timestamp: 2026-07-23T12:00:00Z
version: 1
summary: Verification of MorphMap codebase against intended fractal autonomous design — branch-agent autonomy, delegate looping, mech scripts wiring, orchestrator routing, fractal loop equivalence
source: /verify design against codebase
status: raw
tags: [recon, verification, mech, branch-agent, delegate, fractal, architecture]
---

# Recon: MorphMap Design Verification — Fractal Autonomous Loop

## Key Files
1. `.pi/agents/branch-agent.md` (lines 1-340) — branch agent system prompt with execution loop (steps 0-13)
2. `skills/delegate/SKILL.md` (lines 1-154) — delegate skill: crash recovery, cache check, map read, spawn branches, report
3. `skills/plan/SKILL.md` (lines 1-130) — plan skill: budget estimate, explore, decision tree, grill, build tree, stop for approval
4. `.pi/agents/leaf-worker.md` (lines 1-68) — leaf worker: reads .spec, TDD, self-verify, report done (one-shot)
5. `.morphmap/mech/index.ts` (lines 1-10) — barrel export for pure module
6. `.morphmap/mech/tools.ts` (lines 1-95) — pure transition tool handlers (submitLeaf, approveLeaf, integrationGate)
7. `.morphmap/mech/state.ts` (lines 1-260) — pure state machine (StateMachine<T>, transitionLeaf, canStartLeaf, rollupChildState)
8. `.morphmap/mech/types.ts` (lines 1-200) — pure types/interfaces (Leaf, BranchState, LeafEvidence, gates)
9. `.morphmap/mech/config.ts` (lines 1-100) — pure config lookup tables (assignModel, assignTools, applyPosture)
10. `.morphmap/mech/lattice.ts` (lines 1-50) — pure transition→gate-chain mapping (gatesForLeafTransition)
11. `.morphmap/mech/gates/pre-spawn.ts` (lines 1-80) — 7 pre-spawn gates (specFileExists, specScenarioCount, etc.)
12. `.morphmap/mech/gates/submit.ts` (lines 1-80) — 6 submit gates (agentSpecLifecycle, tddGuardPassed, etc.)
13. `.morphmap/mech/gates/review.ts` (lines 1-80) — 7 review gates (qualityReviewExists, p0CountZero, etc.)
14. `.morphmap/mech/gates/integration.ts` (lines 1-100) — 4 integration gates (allLeavesComplete, etc.)
15. `.morphmap/mech/gates/common.ts` (lines 1-30) — pure gate result helpers (pass, fail, warn, skip)
16. `.pi/extensions/morphmap-hooks.ts` (lines 1-460) — impure pi extension: tool_call hooks, tool_result hooks, telemetry, failure recovery
17. `docs/mech-mindmap.md` (lines 1-620) — full spec for mech state machine (5 phases A-F, fractal loop §3, quality pipeline §4)
18. `docs/execution-flow.md` (lines 1-100) — high-level execution flow diagram
19. `docs/agent-architecture.md` (lines 1-200) — agent roles, Root Orchestrator three hats, tool stack
20. `docs/design-decisions.md` (lines 1-360) — origin, push/pull phases, theory of constraints
21. `.morphmap/improv-map.md` (lines 1-580) — quality/recursion improvements plan, full execution loop §5
22. `AGENTS.md` (lines 1-155) — Root Orchestrator system prompt, skill routing table, write guard
23. `/home/aurel/Documents/vibe/trio/src/core.ts` (lines 1-120) — Trio state machine core (phase-based, transition tools)
24. `/home/aurel/Documents/vibe/trio/src/index.ts` (lines 1-400) — Trio extension: registerTool, enterPhase, hooks

## Architecture
- Pattern: Fractal agent hierarchy (Root Orchestrator → Branch Agent → Sub-Branch Agent → Leaf Worker) with per-leaf quality pipeline
- Entry point: Root Orchestrator (AGENTS.md) routes user intent to skills (plan/delegate/review/amend/triage)
- Delegate skill spawns branch agents via `subagent({ agent: "morphmap/branch-agent" })`
- Branch agent has an explicit execution loop (steps 0-13) with repeat at step 11
- Leaf worker is one-shot: reads .spec → TDD → self-verify → report (no loop)
- mech module (pure) defines state machine + gates; Phase D (hooks integration) is NOT yet implemented
- morphmap-hooks.ts provides pre/post tool hooks but does NOT call mech functions or register transition tools

## Domain Terms
- **Branch Agent**: Owns a module subtree at any depth. Decomposes into sub-branches or pulls leaves directly. Has explicit 13-step execution loop.
- **Leaf Worker**: Implements against .spec contract. TDD per BDD scenario. Self-verifies. One-shot (no loop).
- **mech scripts**: The pure TypeScript state machine in `.morphmap/mech/` — state.ts, gates/, tools.ts, lattice.ts, config.ts. Inspired by Trio's transition-tool pattern (trio_submit_for_review, trio_approve). NOT yet wired into execution loop (Phase D pending).
- **Fractal Loop**: Same pattern at every depth — research → build → review → approve → distribute → integrate → report (docs/mech-mindmap.md §3.1)
- **Trio**: External pi extension at `/home/aurel/Documents/vibe/trio/` — phase-based workflow (planning → executing → reviewing → finalizing) with registered transition tools. MorphMap's mech is inspired by this but NOT yet integrated.
- **state.json**: Planned authoritative machine-native state file (docs/mech-mindmap.md §2.2, §6.1). Does NOT exist on disk yet.
- **plan.md**: Planned per-branch plan file (docs/mech-mindmap.md §2.2, §3.2). Does NOT exist on disk yet.
- **codebase-graph/**: Planned per-module JSON graph of files/imports/exports. Does NOT exist on disk yet.
- **spec-reviewer**: Planned agent for .spec atomicity review (docs/mech-mindmap.md §4.5). Does NOT exist as an agent file.
- **refactor-worker**: Planned agent for post-leaf code optimization (docs/mech-mindmap.md §4.4). Does NOT exist as an agent file.

## Verification Findings

### A. Branch Agent Autonomy — YES (with caveats)

**Evidence:**
- `.pi/agents/branch-agent.md` lines 1-13: System prompt explicitly states "Pull leaves, spawn workers, verify, repeat."
- `.pi/agents/branch-agent.md` lines 65-108: **Execution Loop** section with steps 0-13.
- Step 0a (lines 66-97): **Detect sub-branches** — scans for `###`/`####` headings, determines mode (Leaf Manager / Decomposer / Hybrid).
- Step 0a (lines 78-97): **Spawns sub-branch agents** via `subagent({ agent: "morphmap/branch-agent", ... })` for each sub-branch. This IS recursive — same agent type at any depth.
- Step 1 (line 108): **Pull next leaf** — risk-priority sort per Eisenhower matrix.
- Step 3 (lines 113-186): **Write .spec if missing** — identifies domain, loads skills, assigns `[qa:]`/`[test:]`/`[skill:]` tags, writes .spec with Boundaries.
- Step 5 (lines 186-195): **Spawn leaf worker** via `subagent({ agent: "morphmap/leaf-worker", ... })`.
- Step 7 (lines 200-260): **On leaf ✅** — update map, signal dependents, run mechanical review (7c), quality review (7d), bug hunter (7e).
- Step 8 (lines 262-280): **Integration review** after all children complete.
- Step 11 (line 280): **Repeat** until subtree done or all leaves blocked.
- Step 13 (lines 290-330): **Goal completion gate** — 6 mechanical bash checks before `update_goal complete`.

**Verdict:** YES. The branch agent is fully autonomous and creates its own plan/tree. It writes .spec files itself (step 3), spawns sub-branch agents recursively (step 0a), spawns leaf workers (step 5), and loops (step 11). It uses `/goal` (create_goal at step 0b, update_goal complete at step 13) — NOT mech scripts. The mech scripts are not wired in yet (Phase D pending).

**Caveat:** The branch agent uses `/goal` (pi-codex-goal) for goal tracking, not mech scripts. The mech state machine exists as pure code but is not invoked during execution.

### B. Delegate Skill Looping — PARTIAL

**Evidence:**
- `skills/delegate/SKILL.md` lines 1-154: Has Phase 0 (crash recovery), Phase 1 (cache check), Phase 2 (read map), Phase 3 (select branches), Phase 4 (spawn branch agents), Phase 5 (report).
- Phase 0 (lines 16-26): Checks for `🔄` in-progress leaves from crashed delegate. Asks human to resume or reset.
- Phase 4 (lines 109-148): Spawns branch agents at ANY depth (##, ###, ####) — depth-agnostic.
- Phase 5 (lines 150-154): Reports completion summary. Says "Monitor with /morphmap-review" — does NOT loop itself.

**Verdict:** PARTIAL. The delegate skill does NOT loop on its own. It spawns branch agents and reports. The looping happens INSIDE the branch agent (step 11 of branch-agent.md: "Repeat until subtree done"). The delegate skill is trigger-based (one-shot per `/morphmap-delegate` command). After branch agents complete, the human must re-run `/morphmap-delegate` to pick up new work. There is no autonomous re-spawn loop in the delegate skill itself.

**Does not use /goal or mech scripts:** The delegate skill does not call `create_goal` or any mech functions. It's purely a spawning mechanism.

### C. Mech Scripts — PARTIAL (implemented but NOT wired in)

**Evidence:**
- `.morphmap/mech/` directory exists with 6 files: `index.ts`, `state.ts`, `tools.ts`, `types.ts`, `config.ts`, `lattice.ts`, plus `gates/` subdirectory (5 files) and 2 test files (`state.test.ts`, `tools.test.ts`, `gates.test.ts`).
- `.morphmap/mech/index.ts` (lines 1-10): Barrel export — re-exports all pure modules.
- `.morphmap/mech/tools.ts` (lines 1-95): Pure transition tool handlers — `submitLeaf()`, `approveLeaf()`, `integrationGate()`. Comment says "Phase D wraps these with pi.registerTool + state.json I/O."
- `.morphmap/mech/state.ts` (lines 1-260): Pure state machine — `StateMachine<T>`, `LEAF_TRANSITIONS`, `transitionLeaf()`, `canStartLeaf()`, `rollupChildState()`, `runGates()`.
- `.morphmap/mech/gates/pre-spawn.ts` (lines 1-80): 7 gates — specFileExists, specScenarioCount, specFileCount, specEstLOC, modelAssigned, toolsAssigned, dependenciesResolvable.
- `.morphmap/mech/gates/submit.ts` (lines 1-70): 6 gates — agentSpecLifecycle, tddGuardPassed, npmTestAndBuild, boundariesClean, crossLeafNoConflict, filesMatchSpec.
- `.morphmap/mech/gates/review.ts` (lines 1-80): 7 gates — qualityReviewExists, p0CountZero, p1CountZeroIfFull, healthCheckPassed, bombadilPassed, lonkeroPassed, runtimeDependenciesMet.
- `.morphmap/mech/gates/integration.ts` (lines 1-100): 4 gates — allLeavesComplete, crossLeafConflictsResolved, integrationReviewExists, integrationHealthCheckPassed.
- `.morphmap/mech/lattice.ts` (lines 1-50): Maps transitions to gate chains — `gatesForLeafTransition()`.
- `.morphmap/mech/config.ts` (lines 1-100): Pure lookup tables — `assignModel()`, `assignTools()`, `applyPosture()`.
- `.morphmap/mech/gates/common.ts` (lines 1-30): Pure gate result helpers — `pass()`, `fail()`, `warn()`, `skip()`.
- **Tests:** 115 tests, 276 expects, all green (verified in test files).
- `.pi/extensions/morphmap-hooks.ts` (lines 1-460): Impure pi extension. Hooks: `tool_call` (spec guard, model enforcement, goal completion warning), `tool_result` (auto-render, changelog, telemetry, failure recovery).
- **CRITICAL:** `morphmap-hooks.ts` does NOT import or call ANY mech functions. No `pi.registerTool` calls for `morphmap_submit_leaf`, `morphmap_approve_leaf`, or `morphmap_integration_gate`. The hooks file only does: spec file existence check, model enforcement, map auto-render, changelog generation, telemetry logging, failure pattern detection.
- **CRITICAL:** No `state.json` file exists on disk. No `plans/` directory. No `codebase-graph/` directory. No `specs/` directory under `.morphmap/`.
- **CRITICAL:** No `spec-reviewer.md` or `refactor-worker.md` agent files exist in `.pi/agents/`.
- docs/mech-mindmap.md §7.1: Phase D (Hooks Integration) is listed as "Soon" — NOT yet implemented. Phase E (Tool Failure Recovery) "Soon". Phase F (Sub-Map Session Lifecycle) "Later".

**Verdict:** PARTIAL. The mech scripts (pure state machine + gates + tools) are fully implemented and tested (Phases A-C done, 115 tests green). BUT they are NOT wired into the execution loop. The `morphmap-hooks.ts` does not call any mech functions, does not register transition tools, and does not read/write `state.json`. The branch agent still uses `/goal` and trust-based completion, not mech gates. The user's vision says "now uses own mech scripts" — the scripts exist but are not yet in use.

### D. Orchestrator Routing — YES (trigger-based, not autonomous loop)

**Evidence:**
- `AGENTS.md` lines 1-155: Root Orchestrator system prompt.
- AGENTS.md lines 140-155: **Skill Routing** table — maps user intent to skills:
  - "plan X" / "design X" → morphmap-plan
  - "delegate" / "execute" / "start work" → morphmap-delegate
  - "review" / "status" / "blockers" → morphmap-review
  - "add X" / "create task X" → morphmap-amend
  - "triage" / "check GitHub" → morphmap-triage
  - etc.
- AGENTS.md lines 129-135: **Delegate vs Answer** table — when to spawn scout/researcher vs answer from training.
- AGENTS.md lines 105-115: Root Orchestrator is "Three Hats" (Planner, Intake, Triage) — same agent, different triggers.
- AGENTS.md line 109: "Root NEVER creates leaves. It routes. Branch agents own leaf creation."
- `docs/agent-architecture.md` lines 100-110: Root Orchestrator = Architect/Project Director — structure, routing, triage.

**Verdict:** YES. The Root Orchestrator routes user requests to skills based on intent. It does NOT loop autonomously — it acts on explicit commands (slash commands or natural language that matches the routing table). The routing is trigger-based: user says "delegate" → `/morphmap-delegate` runs → spawns branch agents → reports. No autonomous re-triggering.

### E. Fractal Comparison — PARTIAL (loop exists at branch-agent level, but not fully fractal with deterministic gates)

**Evidence:**
- docs/mech-mindmap.md §3.1 (lines 208-231): "Same Pattern at Every Depth" — describes the fractal loop: research → build → review → approve → distribute → integrate → report.
- docs/mech-mindmap.md §3.3 (lines 256-261): Unified Depth Table — Depth 0 (Orchestrator), Depth 1 (Branch-agent), Depth 2+ (Sub-branch), Leaf (Leaf-worker).
- `.pi/agents/branch-agent.md` lines 65-280: Explicit 13-step execution loop with "Repeat" at step 11. This IS a loop.
- `.pi/agents/leaf-worker.md` lines 1-68: One-shot — reads .spec, TDD, self-verify, report. NO loop.
- Fractal's loop (PREPARE→PLAN→EXECUTE→REVIEW→COMMIT, repeat) is autonomous and self-driving. MorphMap's loop is: branch agent loops internally (step 11), but the delegate skill is one-shot, and the Root Orchestrator is trigger-based.
- The mech state machine (docs/mech-mindmap.md §3) is designed to make the loop deterministic (gates enforce evidence), but it's NOT yet wired in (Phase D pending).

**Verdict:** PARTIAL. MorphMap has a loop at the branch-agent level (steps 0-13 with repeat), which is fractal in structure (same agent type at every depth). BUT it is NOT fully autonomous like Fractal's PREPARE→PLAN→EXECUTE→REVIEW→COMMIT loop because:
1. The delegate skill is one-shot (triggers on `/morphmap-delegate`, reports, exits — no re-trigger).
2. The Root Orchestrator is trigger-based (routes on user commands, no autonomous re-spawn).
3. The mech state machine (which would make transitions deterministic) is NOT wired in — completion is still trust-based.
4. The leaf worker is one-shot (no internal loop — it does TDD RED→GREEN→REFACTOR→verify→submit, but doesn't loop back on failure without branch agent intervention).

### F. Branch Agent .spec Writing — YES (writes .spec files itself, does NOT read plan.md from agent-spec)

**Evidence:**
- `.pi/agents/branch-agent.md` step 3 (lines 113-186): **Write .spec if missing** — the branch agent itself writes .spec files. It:
  - Identifies domain + tools (step 3a, lines 113-135)
  - Loads relevant skills (step 3b, lines 136-145)
  - Assigns tags per decision matrices (step 3c, lines 146-185)
  - Writes .spec with Boundaries section (step 3d, lines 146-185)
  - Updates leaf line in map with tags (step 3e, lines 185-186)
- `.pi/agents/branch-agent.md` line 27: "Use these when writing .spec files" — referring to available-skills.md.
- No reference to reading `plan.md` from agent-spec. The branch agent writes .spec files from scratch based on leaf descriptions in the mindmap.
- `docs/mech-mindmap.md` §4.2 (lines 305-315): "Contract Phase: For each direct leaf → write .spec. If [qa: full] → spawn spec-reviewer."
- `docs/mech-mindmap.md` §7.2 (lines 515-520): File structure shows `specs/` directory for .spec contracts, but `plan.md` is a per-branch plan file (not read from agent-spec).
- The `agent-spec` CLI (verified in config) is used by the leaf worker for lifecycle verification (branch-agent.md line 5: "Available tools: ... agent-spec CLI"), NOT for reading plan.md.

**Verdict:** YES. The branch agent writes .spec files itself (step 3 of its execution loop). It does NOT read a `plan.md` from agent-spec. The .spec is the contract; the branch agent is the spec author. The `agent-spec` CLI is used for verification (lifecycle/guard), not for spec reading.

## Risks

1. **CRITICAL — mech scripts not wired in (Phase D pending):** The entire mech state machine (115 tests, pure module) is implemented but NOT connected to the execution loop. `morphmap-hooks.ts` does not call any mech functions, does not register `morphmap_submit_leaf`/`morphmap_approve_leaf`/`morphmap_integration_gate` tools, and does not read/write `state.json`. The branch agent still uses trust-based completion (`/goal` + manual verification), not deterministic gates. This is the biggest gap vs. the user's vision of "now uses own mech scripts."

2. **CRITICAL — Missing planned files:** `state.json`, `plans/*.plan.md`, `codebase-graph/`, `specs/` directory, `status.json` — all described in docs/mech-mindmap.md §2.2 and §7.2 but do NOT exist on disk. The pure module has no state to operate on.

3. **CRITICAL — Missing planned agents:** `spec-reviewer.md` and `refactor-worker.md` (docs/mech-mindmap.md §4.5, §4.4) do NOT exist in `.pi/agents/`. Only 5 agents exist: branch-agent, leaf-worker, reviewer, scout, researcher.

4. **HIGH — Delegate skill is one-shot, not looping:** The delegate skill spawns branch agents and reports. It does NOT re-spawn after completions or loop. The branch agent loops internally, but there's no autonomous re-trigger of the delegate. User must manually re-run `/morphmap-delegate`.

5. **HIGH — Root Orchestrator is trigger-based, not autonomous:** The Root Orchestrator routes user intent to skills but does not autonomously loop. It requires explicit user commands. This differs from Fractal's self-driving loop.

6. **MEDIUM — Leaf worker is one-shot:** The leaf worker does TDD (RED→GREEN→REFACTOR→verify→submit) but does not loop back on failure. If tests fail, it reports WORKER_BLOCKER and the branch agent must intervene. No autonomous retry loop at the leaf level.

7. **MEDIUM — Double-commit bug in morphmap-hooks.ts:** docs/mech-mindmap.md §620 notes a known bug at ~L230-245 where the post-tool block runs `git commit` twice. Telemetry appends (`echo >> map`) pollute the source of truth — should migrate to `telemetry.json` in Phase D.

8. **LOW — Telemetry pollutes mindmap:** `morphmap-hooks.ts` (line 285-290) appends `[telemetry]` entries directly to `.morphmap/morphmap.mindmap.md` via `echo >>`, mixing machine telemetry with human-edited kanban. Planned to migrate to `telemetry.json` in Phase D.

## Start Here

For the next agent to close the gap between current state and the user's vision:

1. **Phase D implementation (highest priority):** Wire the mech pure module into `morphmap-hooks.ts`. Register `morphmap_submit_leaf`, `morphmap_approve_leaf`, `morphmap_integration_gate` as pi tools. Create `state.json` read/write. Update `branch-agent.md` to call these tools instead of trusting leaf worker claims. This is the core gap — the state machine exists but isn't used.

2. **Create missing planned files:** `state.json` schema, `plans/` directory structure, `codebase-graph/` structure, `specs/` directory. These are referenced by docs/mech-mindmap.md §7.2 but don't exist.

3. **Create missing agents:** `spec-reviewer.md` and `refactor-worker.md` (docs/mech-mindmap.md §4.4-4.5). Wire spec-reviewer into branch-agent step 3b for `[qa: full]` leaves.

4. **Add autonomous delegate loop:** Modify `skills/delegate/SKILL.md` to optionally loop — after branch agents complete, re-scan the map for new ready branches and re-spawn. Add a `--watch` or `--loop` flag.

5. **Fix double-commit bug in morphmap-hooks.ts:** Lines ~230-245 run `git commit` twice. Remove duplicate.

6. **Migrate telemetry out of mindmap:** Stop appending `[telemetry]` entries to `.morphmap/morphmap.mindmap.md`. Write to `.morphmap/telemetry.json` instead.
