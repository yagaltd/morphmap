# Changelog

All notable changes to MorphMap.

## [Unreleased]

### Added
- New leaf tags: `[qa: none|review|full]` (per-leaf quality), `[test: unit|property-based|snapshot|integration|e2e]` (testing strategy), `[skill: <name>]` (audit trail), `[human]` (human-managed leaf)
- Recursive branch agent spawning: same agent type at any depth (##, ###, ####), 5-dimension context injection
- Available skills cache (`.morphmap/available-skills.md`): scan-once, grouped by domain, regenerated on staleness
- Skills loaded before .spec creation: constraints extracted into Boundaries section, preventing bugs instead of catching them
- Mechanical reviewer wired into execution loop (was defined but never spawned)
- Goal completion gate: 6 mechanical bash checks before `update_goal complete` (pending leaves, missing .specs, unresolved deps, missing reviews, pending sub-branches)
- Parent scope check: parent reviews child sub-branch output against own scope declaration
- Branch-level integration review after all sub-branches report ✅ (quality=strict)
- Leaf worker: `[test:]` tag awareness, `[human]` tag skip
- Quality reviewer: boundaries compliance check against .spec

### Changed
- Branch agent: execution loop rewritten (13 steps with recursion, per-leaf QA, skill loading, goal gate)
- Delegate skill: depth-agnostic spawning for all heading levels + available-skills regeneration
- Init skill: available-skills.md generation + agent freezing (.morphmap/agents/) + --update-agents flag
- Improve skill: agent edit target priority (project-local first, never global)
- Leaf worker: testing strategy section added, posture rules updated
- Quality reviewer: "What to Check" expanded with boundaries compliance, output format updated
- README: Agent Versioning section added, project structure updated
- Execution flow doc: quality loop rewritten with per-leaf `[qa:]` gating
- Format spec: Tags table expanded, leaf format updated, Per-Leaf Quality Tags section added
- Plan skill: added Phase 0 goal creation for bounded planning sessions
- Execution flow doc: updated quality loop with bug-hunter step and posture gates
- Format spec: expanded handoff file section with agent types table and status lifecycle

## [0.2.0] — 2026-07-20

### Added
- Roadmap: v1.0 (now), v2.0 (brownfield, multi-repo, evalt), v3.0 (CognitiveOS, telemetry)
- 5 MorphMap-owned subagents: branch-agent, leaf-worker, reviewer, scout, researcher
- 9 slash commands with 8 skills: plan, delegate, review, amend, triage, improve, init, render, status
- Task profiles for dynamic model assignment per domain (build-backend, build-frontend, etc.)
- PDSA Study loop (`/morphmap-improve`): reads decisions+git+vcc_recall, detects patterns, proposes improvements
- Skill usage logging: `[skill] <name>` entries in decisions log
- Write Guard: 3-question self-reflection before any file write
- Pre-Action Refresh: ctx_search + ctx_execute_file before map/config edits
- Context Budget rule: compact if >40% full
- `## skills` branch for map self-documentation
- `## releases` branch for version tracking
- Map and config now tracked in git (single source of truth)

### Changed
- Root Orchestrator = main session (AGENTS.md loaded at startup), not a subagent
- Orchestrator model: flash → pro (needs medium-high reasoning for intent understanding + synthesis)
- Agent discovery: `.pi/agents/` convention (pi-subagents standard)
- Reviewer: two modes (mechanical with tdd-guard layer, integration for cross-leaf)
- Plan Phase 3: uses grill-for-unknowns skill (one question/turn, blast radius order)
- .spec template: added Verifiable by Human + Delegated to Implementer sections
- Classification: 4-tier forced choice (very good/good/bad/very bad) replaces fake confidence numbers
- Status markers now have defined transition rules (⬜→🔄→✅)
- All 9 commands e2e tested + documented
- Tool procedures documented: when to use agent-spec, tdd-guard, evalt
- .evalt/ test suite added (3 tests for scout, researcher, branch-agent)

### Fixed
- Researcher: web_search unavailable → uses bash+curl
- Branch-agent: agent-spec unavailable → uses bash (CLI needs shell)
- Hallucination prevention: .morphmap/config `available` section + verified tool list
- Model hardcoding removed from all prompts and agents
- Stale `/mindmap-*` references cleaned
- Kanban accurately reflects file existence (not testing status)

## [0.1.0] — 2026-07-19

### Added
- Initial release
- Format specification (`.mindmap.md` markmap-compatible)
- Agent architecture (Root Orchestrator, Branch Agent, Leaf Worker)
- 6 reference specification documents
- MorphEditor example mindmap
- OKF conformance for all reference docs
- Push/Pull execution model with Theory of Constraints
- 8 intercom message types
- KPI tracking per level
- Status markers (⬜🔄✅❌🔴)
- External references (nodes link to any document type)
