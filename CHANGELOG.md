# Changelog

All notable changes to MorphMap.

## [Unreleased]

### Added
- Unified OKF handoff format: `type: handoff`, `version`, `timestamp`, `status` lifecycle (raw→distilled→stale)
- All agent outputs now write versioned OKF handoff files (scout, researcher, quality-reviewer, reviewer/integration)
- Quality reviewer wired into branch agent execution loop (step 7d)
- Integration reviewer wired into branch agent execution loop (step 8, quality=strict)
- Quality pipeline posture gates: fast=self-verify only, standard=+quality-review, strict=+integration-review

### Changed
- Researcher agent: added OKF frontmatter (was missing entirely)
- Reviewer agent: integration mode now writes OKF handoff file instead of inline output
- Quality reviewer agent: output format upgraded to OKF handoff file with versioning
- Scout agent: frontmatter updated to unified OKF format with type/version/timestamp
- Branch agent: execution loop expanded from 9 to 10 steps with quality + integration review
- Execution flow doc: updated quality loop diagram with posture gates and handoff file paths
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
