# Changelog

All notable changes to MorphMap. Auto-generated from .morphmap/morphmap.mindmap.md.

## [Unreleased]

### Added
- /morphmap-review: enhanced SKILL.md with git-timestamp stale detection (48h threshold), WORKER_BLOCKER intercom check, --handoff file output. Prompt updated per spec.
- /morphmap-amend: skills/amend/SKILL.md + prompts/morphmap-amend.md written · 3-tier classification (exact/partial/no-match) · PR linkage support · force-decision, no confidence scores
- mech Phase A: pure state machine core → .morphmap/mech/{types,state,config,index}.ts + state.test.ts · 707 LOC pure + 492 LOC test · 49 tests passing · tsc clean
- P1 fix: needs-contract build unblock `submitted`→`in_review` (spec §3.6 conformance — build against a REVIEWED contract, not a claimed one)
- P2 fix: `done` made terminal (done→done rejected) — prevents silent evidence mutation of approved proof. Idempotency reordered BEFORE legality so crash-recovery replay stays a safe no-op.
- P3 fix: transitionLeaf reuses runGates (single gate runner — was divergent duplicate that dropped warnings); warnings now surface in outcome
- P3 fix: +8 tests covering gaps (done terminal, done-mutation rejection, done idempotent replay, blocked/unblock via transitionLeaf, mixed needs+needs-contract edges, ghost target, warning surfacing) → 57 tests, 131 expects, all green
- non-blocking: tsconfig.mech.json → tsconfig.json (conventional name, bare `tsc` works)
- Phase B gates → .morphmap/mech/gates/{pre-spawn,submit,review,integration}.ts + .morphmap/mech/lattice.ts · preSpawn (7) + submit (6) + review (6) + integration (4) = 22 gates · lattice maps transitions→chains
- Phase C tools → .morphmap/mech/tools.ts · submitLeaf/approveLeaf/integrationGate · pure handlers (Phase D wraps with pi.registerTool + state.json I/O)
- P2 fix: added runtimeDependenciesMet gate to reviewGates — enforces integrateBlocked===false at in_review→done. Closes the [needs-contract:] gap (leaf could reach done while runtime dep not done, false "done=proof"). approveLeaf now passes graph/allLeaves into ctx.
- P3 fix: allLeavesSubmitted → allLeavesComplete, tightened check from "submitted" to "done". Branch-done now requires leaf-done (spec §2.4 naming reconciled — a submitted-but-unreviewed leaf no longer completes a branch).
- P3 fix: removed unused LeafEvidence import in submit.ts
- P3 fix: +2 tests (pre-spawn chain via transitionLeaf; runtime-dep blocks approve) → 115 tests, 276 expects, all green
- new leaf tags: [qa: none|review|full], [test: unit|property-based|snapshot|integration|e2e], [skill: <name>], [human]
- recursive branch agent spawning: same agent at any depth (L1-L3), 5-dimension context injection
- quality architecture: skills loaded before .spec via available-skills.md cache, constraints extracted into Boundaries
- mechanical reviewer wired into execution loop (was defined but never spawned)
- per-leaf [qa:] override — branch agent assigns tag, not blind posture inheritance
- goal completion gate: 6 mechanical checks before update_goal complete
- available-skills.md cache: generated at init/delegate, read by all branch agents
- agent freezing: .morphmap/agents/ copy during init, agentPaths in pi-subagents config
- --update-agents flag: refresh frozen agents with git diff review
- improve skill: agent edit targets .morphmap/agents/ (user project) or .pi/agents/ (dogfooding), never global install
- leaf worker: [test:] tag awareness, [human] tag skip
- quality reviewer: boundaries compliance check against .spec
- delegate skill: depth-agnostic spawning for all heading levels
- init skill: available-skills.md generation at scaffold
- execution flow doc: updated quality loop with per-leaf [qa:] gating
- /morphmap-recover: detects orphaned worktrees, merges uncommitted work, prunes branches
- orphan detection: branch-agent checks parent via intercom at startup, self-merges if orphaned
- docs/one-map.md v2 patched: removed herdr, added phase structure, added implementation plan (§9), added /morphmap-run design, added compiler hook design, added Node metadata schema.
- /morphmap-triage command: skills/triage/SKILL.md + prompts/morphmap-triage.md · gh CLI integration for GitHub issues/PRs · 4-tier classification (very-good/good/bad/very-bad) against branch scope · auto-route + flag-for-human routing · PR exact-match detection · decision logging

### Changed
- OKF handoff format unified: type=handoff, +version field, +status lifecycle (raw→distilled→stale)
- All handoff agents (scout, researcher, quality-reviewer, reviewer) write versioned OKF files
- quality reviewer now spawned by branch agent in execution loop step 7d
- integration reviewer spawned by branch agent after sub-branch completes (step 8, quality=strict)
- bug-hunter added as posture-gated step: quality=strict + 🔴/🟡 leaves only (step 7f)
- quality pipeline: leaf-worker → reviewer (mechanical) → quality-reviewer (judgment) → bug-hunter (adversarial, optional) → integration-review → branch-agent

### Fixed
- wrote docs/undo-flexibility.md instead of ## decisions

## [0.2.0] — 2026-07-20

### Changed
- v1 design decisions finalized
- adopted OKF format for all knowledge documents
- verified stack: pi-workflows NOT installed, pi-dynamic-wf removed
- renamed project to MorphMap
- git init, first commit
- 4-tier forced choice replaces fake confidence numbers
- end-to-end test: all 5 agents spawned + executed

### Fixed
- Root Orchestrator context at 40%+ caused drift — edited config unilaterally
- Pre-Action Refresh: ctx_search + ctx_execute_file before map/config edits
- Context Budget: check ctx_stats every 10 turns, compact if >40%
- Write Guard added "Discussed?" check + violation logging
- ## skills branch added to map — documents each skill's phases
- skill usage logging: [skill] entries feed /morphmap-improve Phase 2
- map write protocol: commit + render HTML after every map edit — agent rule + git hook
