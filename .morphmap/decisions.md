# MorphMap Decisions Log

_115 entries. Generated from mindmap decisions section._

| # | Topic | Type | Status | Description |
|---|-------|------|--------|-------------|
| 1 | cross | gap | ✅ 2026-07-24 | undo/experiment flexibility: no mechanical rollback at leaf or sub-branch level |
| 2 | cross | implemented | ✅ 2026-07-24 | morphmap/review used in tree-walker mode for review command · outcome: implemented |
| 3 | cross | decision | 📦 2026-07-23 | branch-agent.md IS autonomous: writes .spec (step 3), spawns sub-branches recursively (step 0a), loo... |
| 4 | cross | decision | 📦 2026-07-23 | delegate SKILL.md is one-shot: spawns branch agents, reports, exits. Does NOT loop or re-spawn. Bran... |
| 5 | cross | decision | 📦 2026-07-23 | mech scripts (Phases A-C) fully implemented + tested (115 tests green) but NOT wired into execution.... |
| 6 | cross | decision | 📦 2026-07-23 | Fractal loop exists at branch-agent level (steps 0-13 with repeat) but is NOT fully autonomous like ... |
| 7 | cross | risk | 📦 2026-07-23 | CRITICAL: mech state machine is dead code — 115 tests pass but gates never run during execution. Com... |
| 8 | cross | risk | 📦 2026-07-23 | HIGH: delegate skill does not auto-loop. No autonomous re-trigger after branch completion. |
| 9 | cross | decision | 📦 2026-07-23 | Phase D (hooks integration) is the highest priority gap. Wire mech into morphmap-hooks.ts, register ... |
| 10 | cross | decision | 📦 2026-07-23 | docs/one-map.md promoted to reference doc for all new implementation. Replaces mech-mindmap.md as th... |
| 11 | cross | decision | 📦 2026-07-23 | Phase structure clarified: Phases A-F = pure state machine core (180 tests green). Phase D = impure ... |
| 12 | cross | decision | 📦 2026-07-23 | herdr removed from one-map.md. pi-subagents retained for context isolation. herdr deferred to Phase ... |
| 13 | cross | decision | 📦 2026-07-23 | `--loop` flag on `/morphmap-delegate`: re-check for newly-ready branches after completions, re-spawn... |
| 14 | cross | decision | 📦 2026-07-23 | Compiler hook: parse agent JSONL on tool_result events, extract evidence (test/build exit codes, fil... |
| 15 | cross | implemented | 📦 2026-07-23 | docs/one-map.md v2 patched: removed herdr, added phase structure, added implementation plan (§9), ad... |
| 16 | cross | decision | 📦 2026-07-23 | Phase D: restore mech-pi/ wiring layer, register 3 transition tools in hooks, bootstrap state.json f... |
| 17 | cross | implemented | 📦 2026-07-22 | morphmap-amend used for own implementation · outcome: ✅ |
| 18 | cross | implemented | 📦 2026-07-22 | mech Phase A: pure state machine core → .morphmap/mech/{types,state,config,index}.ts + state.test.ts... |
| 19 | cross | decision | 📦 2026-07-22 | idempotency = (leaf, to, evidenceHash) exists in transitions[] AND current status === to → no-op pas... |
| 20 | cross | decision | 📦 2026-07-22 | reviewRounds increments ONLY on in_review → in_progress (CHANGES_REQUESTED loop), not on every trans... |
| 21 | cross | learn | 📦 2026-07-22 | Phase A actual 707 LOC vs plan est. 200 — confirms finding J (estimates optimistic). state.ts alone ... |
| 22 | cross | implemented | 📦 2026-07-22 | morphmap/quality-reviewer used for mech Phase A · outcome: CHANGES_REQUESTED (1×P1, 1×P2, 2×P3) · td... |
| 23 | cross | implemented | 📦 2026-07-22 | P2 fix: `done` made terminal (done→done rejected) — prevents silent evidence mutation of approved pr... |
| 24 | cross | implemented | 📦 2026-07-22 | P3 fix: transitionLeaf reuses runGates (single gate runner — was divergent duplicate that dropped wa... |
| 25 | cross | implemented | 📦 2026-07-22 | P3 fix: +8 tests covering gaps (done terminal, done-mutation rejection, done idempotent replay, bloc... |
| 26 | cross | implemented | 📦 2026-07-22 | non-blocking: tsconfig.mech.json → tsconfig.json (conventional name, bare `tsc` works) |
| 27 | cross | decision | 📦 2026-07-22 | logged decision #3 diverged from spec §3.6 without amending the spec — process violation caught by r... |
| 28 | cross | implemented | 📦 2026-07-22 | Phase B gates → .morphmap/mech/gates/{pre-spawn,submit,review,integration}.ts + .morphmap/mech/latti... |
| 29 | cross | decision | 📦 2026-07-22 | gates are PURE — they validate already-populated LeafEvidence; impure layer (Phase D) gathers eviden... |
| 30 | cross | decision | 📦 2026-07-22 | tool-absent pattern: null evidence field → gate skips (pass). tdd-guard/bombadil/lonkero/healthCheck... |
| 31 | cross | decision | 📦 2026-07-22 | Phase A TransitionGateCtx widened (optional graph/allLeaves/allowedChanges) so cross-leaf/dependency... |
| 32 | cross | decision | 📦 2026-07-22 | integration test caught crossLeafNoConflict reading stale leaf.evidence instead of incoming evidence... |
| 33 | cross | implemented | 📦 2026-07-22 | Phase C tools → .morphmap/mech/tools.ts · submitLeaf/approveLeaf/integrationGate · pure handlers (Ph... |
| 34 | cross | decision | 📦 2026-07-22 | Phase C = pure tool handlers; Phase D = impure wiring. Tools select gates via lattice (agents don't ... |
| 35 | cross | decision | 📦 2026-07-22 | request_revision (§4.2 escape hatch) deferred to Phase D — not in §2.5 tool list. Scope tight to pla... |
| 36 | cross | decision | 📦 2026-07-22 | integrationGate marks branch status=done on pass (branch-level transition); returns unchanged state ... |
| 37 | cross | decision | 📦 2026-07-22 | reviewFile param ⇒ evidence.qualityReviewExists=true (impure layer confirms path exists; pure tool t... |
| 38 | cross | implemented | 📦 2026-07-22 | morphmap/quality-reviewer used for mech Phase B+C (batched) · outcome: APPROVED WITH FINDINGS (0 blo... |
| 39 | cross | implemented | 📦 2026-07-22 | P2 fix: added runtimeDependenciesMet gate to reviewGates — enforces integrateBlocked===false at in_r... |
| 40 | cross | implemented | 📦 2026-07-22 | P3 fix: removed unused LeafEvidence import in submit.ts |
| 41 | cross | implemented | 📦 2026-07-22 | P3 fix: +2 tests (pre-spawn chain via transitionLeaf; runtime-dep blocks approve) → 115 tests, 276 e... |
| 42 | cross | decision | 📦 2026-07-22 | P2 was a real enforcement gap invisible to self-verification (all 113 tests passed before) — the nee... |
| 43 | cross | implemented | 📦 2026-07-21 | mechanical reviewer wired into execution loop (was defined but never spawned) |
| 44 | cross | implemented | 📦 2026-07-21 | goal completion gate: 6 mechanical checks before update_goal complete |
| 45 | cross | implemented | 📦 2026-07-21 | available-skills.md cache: generated at init/delegate, read by all branch agents |
| 46 | cross | implemented | 📦 2026-07-21 | delegate skill: depth-agnostic spawning for all heading levels |
| 47 | cross | spec | 📦 2026-07-21 | bug-hunter added as posture-gated step: quality=strict + 🔴/🟡 leaves only (step 7f) |
| 48 | cross | spec | 📦 2026-07-21 | quality pipeline: leaf-worker → reviewer (mechanical) → quality-reviewer (judgment) → bug-hunter (ad... |
| 49 | cross | learn | 📦 2026-07-21 | pi extension hooks: morphmap-hooks.ts for semi-mechanical enforcement (spec guard, goal gate warning... |
| 50 | cross | learn | 📦 2026-07-21 | worktree isolation trap: agents wrote code to worktrees but never committed/merged. 13 orphaned work... |
| 51 | cross | learn | 📦 2026-07-21 | MorphShell dogfooding complete: plan (budget estimate + 4 scouts), delegate (3 rounds, 15 branches),... |
| 52 | cross | learn | 📦 2026-07-20 | .spec template: add Verifiable by Human + Delegated to Implementer |
| 53 | commands | implemented | ✅ 2026-07-24 | /morphmap-review: enhanced SKILL.md with git-timestamp stale detection (48h threshold), WORKER_BLOCK... |
| 54 | commands | decision | 📦 2026-07-23 | New `/morphmap-run` command: spawn all ready branches in parallel, monitor via intercom + state.json... |
| 55 | commands | implemented | 📦 2026-07-23 | /morphmap-triage command: skills/triage/SKILL.md + prompts/morphmap-triage.md · gh CLI integration f... |
| 56 | commands | implemented | 📦 2026-07-22 | /morphmap-amend: skills/amend/SKILL.md + prompts/morphmap-amend.md written · 3-tier classification (... |
| 57 | commands | implemented | 📦 2026-07-21 | /morphmap-recover: detects orphaned worktrees, merges uncommitted work, prunes branches |
| 58 | commands | fix | 📦 2026-07-20 | skill usage logging: [skill] entries feed /morphmap-improve Phase 2 |
| 59 | commands | decision | 📦 2026-07-20 | OpenSpace: quality tracking covered by /morphmap-improve |
| 60 | agents | decision | 📦 2026-07-23 | scout-002 design verification complete → .morphmap/scout-002-20260723-design-verification.md |
| 61 | agents | decision | 📦 2026-07-23 | Branch agent writes .spec files itself (step 3). Does NOT read plan.md from agent-spec. agent-spec C... |
| 62 | agents | decision | 📦 2026-07-23 | Missing planned files: state.json, plans/*.plan.md, codebase-graph/, specs/ directory. Missing plann... |
| 63 | agents | implemented | 📦 2026-07-21 | recursive branch agent spawning: same agent at any depth (L1-L3), 5-dimension context injection |
| 64 | agents | implemented | 📦 2026-07-21 | per-leaf [qa:] override — branch agent assigns tag, not blind posture inheritance |
| 65 | agents | implemented | 📦 2026-07-21 | leaf worker: [test:] tag awareness, [human] tag skip |
| 66 | agents | implemented | 📦 2026-07-21 | quality reviewer: boundaries compliance check against .spec |
| 67 | agents | spec | 📦 2026-07-21 | All handoff agents (scout, researcher, quality-reviewer, reviewer) write versioned OKF files |
| 68 | agents | spec | 📦 2026-07-21 | quality reviewer now spawned by branch agent in execution loop step 7d |
| 69 | agents | spec | 📦 2026-07-21 | integration reviewer spawned by branch agent after sub-branch completes (step 8, quality=strict) |
| 70 | agents | learn | 📦 2026-07-21 | quality-reviewer vs bug-hunter: complementary. quality-reviewer=static code review (cheap, every lea... |
| 71 | agents | learn | 📦 2026-07-21 | /goal underutilized: only used for 5-why failure analysis. Now wired into branch-agent loop start + ... |
| 72 | agents | learn | 📦 2026-07-21 | quality-reviewer was defined but unwired — now in execution loop |
| 73 | agents | learn | 📦 2026-07-21 | researcher agent had no OKF frontmatter at all — now has unified format |
| 74 | agents | implemented | 📦 2026-07-21 | orphan detection: branch-agent checks parent via intercom at startup, self-merges if orphaned |
| 75 | agents | learn | 📦 2026-07-21 | integration gap found during MorphShell testing: reviewer integration mode was CODE-ONLY — never ran... |
| 76 | agents | learn | 📦 2026-07-20 | reviewer: added tdd-guard layer for test trustworthiness |
| 77 | agents | decision | 📦 2026-07-19 | branch-agent needs config-read step for leafProfiles |
| 78 | vcs | violation | ✅ 2026-07-24 | wrote docs/undo-flexibility.md instead of ## decisions |
| 79 | violations | violation | 📦 2026-07-20 | Root Orchestrator context at 40%+ caused drift — edited config unilaterally |
| 80 | violations | fix | 📦 2026-07-20 | Write Guard added "Discussed?" check + violation logging |
| 81 | design | implemented | 📦 2026-07-21 | quality architecture: skills loaded before .spec via available-skills.md cache, constraints extracte... |
| 82 | cross | decision | 📦 2026-07-23 | Root Orchestrator (AGENTS.md) routes user intent to skills via routing table. Trigger-based, not aut... |
| 83 | cross | risk | 📦 2026-07-23 | HIGH: double-commit bug in morphmap-hooks.ts (~L230-245) — git commit runs twice. Telemetry pollutes... |
| 84 | cross | decision | 📦 2026-07-23 | Map = session tree: pi subagent session IDs stored in node metadata. Map shows running/paused/done s... |
| 85 | cross | decision | 📦 2026-07-23 | triage SKILL.md uses gh CLI (gh issue view, gh pr view, gh issue list, gh pr list) for v1 GitHub int... |
| 86 | cross | decision | 📦 2026-07-23 | 4-tier naming kept as very-good/good/bad/very-bad per docs/triage-flow.md (canonical). Spec's exact/... |
| 87 | cross | decision | 📦 2026-07-22 | LeafStatus canonicalized to machine strings (pending/in_progress/submitted/in_review/blocked/done) w... |
| 88 | cross | decision | 📦 2026-07-22 | [needs-contract:] build unblocks at "in_review" (contract reviewed), integrate at "done" (§3.6). can... |
| 89 | cross | implemented | 📦 2026-07-22 | P1 fix: needs-contract build unblock `submitted`→`in_review` (spec §3.6 conformance — build against ... |
| 90 | cross | decision | 📦 2026-07-22 | QA-tier conditional: p1CountZeroIfFull enforces P1=0 only at [qa: full|strict], skips at review/none... |
| 91 | cross | implemented | 📦 2026-07-22 | P3 fix: allLeavesSubmitted → allLeavesComplete, tightened check from "submitted" to "done". Branch-d... |
| 92 | cross | implemented | 📦 2026-07-21 | new leaf tags: [qa: none|review|full], [test: unit|property-based|snapshot|integration|e2e], [skill:... |
| 93 | cross | implemented | 📦 2026-07-21 | agent freezing: .morphmap/agents/ copy during init, agentPaths in pi-subagents config |
| 94 | cross | implemented | 📦 2026-07-21 | --update-agents flag: refresh frozen agents with git diff review |
| 95 | cross | implemented | 📦 2026-07-21 | improve skill: agent edit targets .morphmap/agents/ (user project) or .pi/agents/ (dogfooding), neve... |
| 96 | cross | implemented | 📦 2026-07-21 | init skill: available-skills.md generation at scaffold |
| 97 | cross | implemented | 📦 2026-07-21 | execution flow doc: updated quality loop with per-leaf [qa:] gating |
| 98 | cross | spec | 📦 2026-07-21 | OKF handoff format unified: type=handoff, +version field, +status lifecycle (raw→distilled→stale) |
| 99 | cross | learn | 📦 2026-07-21 | tokei already in brownfield init path — confirmed installed (v14.0.0, JSON support) |
| 100 | cross | learn | 📦 2026-07-21 | skill discovery: Option C (available-skills.md cache) chosen over hardcoded mapping. §10 in improv-m... |
| 101 | cross | learn | 📦 2026-07-21 | dogfooding surfaced gap: ">5 → sub-branch" rule existed but didn't apply to [log] branches. Rule now... |
| 102 | cross | learn | 📦 2026-07-21 | dogfooding: pi-interview format bug — recommended for single-select must be string, not object. Fixe... |
| 103 | cross | learn | 📦 2026-07-21 | ADR support: new [adr] branch tag, ADR template in format spec, hook verifies referenced ADR files e... |
| 104 | cross | learn | 📦 2026-07-21 | agent hallucination: reports claim ✅ with test counts + diffs but code not on disk. Hook checks .spe... |
| 105 | cross | fix | 📦 2026-07-20 | Pre-Action Refresh: ctx_search + ctx_execute_file before map/config edits |
| 106 | cross | fix | 📦 2026-07-20 | Context Budget: check ctx_stats every 10 turns, compact if >40% |
| 107 | cross | fix | 📦 2026-07-20 | ## skills branch added to map — documents each skill's phases |
| 108 | cross | fix | 📦 2026-07-20 | map write protocol: commit + render HTML after every map edit — agent rule + git hook |
| 109 | cross | learn | 📦 2026-07-20 | plan Phase 3: use grill-for-unknowns skill |
| 110 | cross | decision | 📦 2026-07-20 | Cortex conflicts with context-mode. Not needed. v3 with CognitiveOS. |
| 111 | cross | decision | 📦 2026-07-20 | taskProfiles: deferred to v2 |
| 112 | cross | decision | 📦 2026-07-20 | roadmap: v2=brownfield+multi-repo, v3=CognitiveOS+cross-project telemetry |
| 113 | cross | decision | 📦 2026-07-19 | grill = plan Phase 3 with xhigh thinking, not separate agent |
| 114 | cross | decision | 📦 2026-07-19 | MorphEditor dogfooding: pick one small feature |
| 115 | cross | decision | 📦 2026-07-19 | model assignment: subagent() inline overrides |