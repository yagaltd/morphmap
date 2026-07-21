# Changelog

All notable changes to MorphMap. Auto-generated from .morphmap/morphmap.mindmap.md.

## [Unreleased]

### Added
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

### Changed
- OKF handoff format unified: type=handoff, +version field, +status lifecycle (raw→distilled→stale)
- All handoff agents (scout, researcher, quality-reviewer, reviewer) write versioned OKF files
- quality reviewer now spawned by branch agent in execution loop step 7d
- integration reviewer spawned by branch agent after sub-branch completes (step 8, quality=strict)
- bug-hunter added as posture-gated step: quality=strict + 🔴/🟡 leaves only (step 7f)
- quality pipeline: leaf-worker → reviewer (mechanical) → quality-reviewer (judgment) → bug-hunter (adversarial, optional) → integration-review → branch-agent

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
