---
type: mindmap
project: MorphMap
status: in-progress
timestamp: 2026-07-19
tags: [MorphMap, project-management, ai-agents, pi-extension]
posture:
  phase: prototype
  compatibility: break
  scope: broad
  quality: fast
  budget: balanced
markmap:
  colorFreezeLevel: 2
  maxWidth: 300
resource: index.md
---

## context ⬜
- Domain glossary → .morphmap/CONTEXT.md
- improv-map: quality + recursion + context improvements → .morphmap/improv-map.md
- one-map architecture (reference doc for new implementation) → docs/one-map.md
- mech-mindmap state machine spec → docs/mech-mindmap.md


# MorphMap — AI-Native Project Management

## docs ✅ [log] — scope: format spec, agent architecture, protocols, execution, triage, state machine, one-map · 8/8 leaves
- ✅ format specification → docs/format-spec.md
- ✅ agent architecture + system prompts + hallucination prevention → docs/agent-architecture.md
- ✅ intercom protocol specification → docs/intercom-protocol.md
- ✅ execution flow + full diagram → docs/execution-flow.md
- ✅ triage flow + classification logic → docs/triage-flow.md
- ✅ design decisions audit trail → docs/design-decisions.md
- ✅ mech-mindmap state machine spec → docs/mech-mindmap.md
- ✅ one-map unified architecture (reference doc) → docs/one-map.md

## examples ✅ [log] — scope: MorphEditor mindmap, OKF conformance · 2/2 leaves
- ✅ MorphEditor full mindmap → examples/morpheditor.mindmap.md
- ✅ OKF conformance: all reference docs valid, executables follow own conventions

## commands 🔄 [module] — scope: slash commands · 12/12 prompts + 10/10 skills · e2e tested: 6/12
- ✅ /morphmap-init — scaffold + brownfield scan (MorphShell)
- ✅ /morphmap-plan — budget estimate + grill + tree (MorphShell 4 scouts parallel)
- ✅ /morphmap-delegate — 3 rounds on MorphShell, crash recovery · ⚠️ one-shot, needs --loop flag
- ✅ /morphmap-improve — PDSA Study loop written
- ✅ /morphmap-recover — orphan detection + worktree merge (MorphShell)
- ✅ /morphmap-run — NEW: spawn all ready branches in parallel, loop until all done (one-map.md §9)
- ✅ /morphmap-review → .morphmap/specs/commands/morphmap-review.spec.md [qa: review] [test: e2e] [skill: morphmap-review]
- ✅ /morphmap-amend → .morphmap/specs/commands/morphmap-amend.spec.md [qa: review] [test: e2e] [skill: morphmap-amend]
- ✅ /morphmap-triage → .morphmap/specs/commands/morphmap-triage.spec.md [qa: review] [test: e2e] [skill: morphmap-triage]
- ✅ /morphmap → .morphmap/specs/commands/morphmap-render.spec.md [qa: review] [test: e2e] [skill: morphmap-render]
- ✅ /morphmap-status → .morphmap/specs/commands/morphmap-status.spec.md [qa: review] [test: e2e] [skill: morphmap-status]
- ✅ e2e: scout + researcher + branch-agent + leaf-worker all spawned + executed
- ✅ Phase D: mech state machine wired into execution loop (143 tests, 0 failures)

## agents ✅ [module] — scope: agent definitions · 5/5 leaves · all spawn-verified
- ✅ branch-agent → .pi/agents/branch-agent.md · spawned + executed
- ✅ leaf-worker → .pi/agents/leaf-worker.md · spawned + implemented
- ✅ reviewer → .pi/agents/reviewer.md (two modes)
- ✅ scout → .pi/agents/scout.md · spawned + recon completed
- ✅ researcher → .pi/agents/researcher.md · spawned + research completed

### fixes from e2e
- ✅ researcher: web_search→bash+curl (tools available in subagent context)
- ✅ branch-agent: agent-spec→bash (CLI needs shell, not tool name)
- ✅ agent install: ~/.pi/agent/agents/morphmap/ for pi-subagents discovery

## extension ✅ [module] — scope: pi extension package · 3/3 leaves
- ✅ package.json + install from GitHub (pi install works)
- ✅ agent discovery fixed (.pi/agents/ → ~/.pi/agent/agents/morphmap/)
- ✅ npm packaging (not needed — GitHub install works)
- ✅ mech tools wired: registerMechTools in hooks, state.json bootstrapped, md↔json sync active

## staging 🔄 [phase]
### e2e-test
- ✅ init + plan + delegate flow verified on E2ETest project
- ✅ scout: recon, context.md
- ✅ researcher: research.md
- ✅ branch-agent: pull leaves, spawn leaf-worker, update map
- ✅ leaf-worker: implement server.js, package.json, curl verify
- ⬜ test /morphmap-review on E2ETest
- ⬜ test /morphmap-triage on GitHub issue

### test-on-real-project
- ⬜ init MorphEditor as MorphMap project
- ⬜ plan from real MorphEditor features

## production 🔴 [phase] [BLOCKED: MorphEditor dogfooding not done]
### release-v0.1
- 🔴 publish pi extension → already published (https://github.com/yagaltd/morphmap)
- 🔴 MorphEditor dogfooding: manage own development with MorphMap

## releases [log] — version history (semver for packages, date-based for non-code)
- 0.2.0 (2026-07-20): 5 agents spawn-verified, 9 commands, taskProfiles, PDSA improve, Write Guard
- 0.1.0 (2026-07-19): initial release — format spec, agent architecture, 6 reference docs

### versioning rules
- semver (major.minor.patch) for code projects
- date-based (YYYY-MM-DD) for marketing, operations, non-code
- releases branch updated on every push/publish
- CHANGELOG.md auto-generated from decisions log by morphmap-hooks extension

## skills ✅ [log] — what each skill does + format tags
- morphmap-plan: scout+research (parallel) → decision tree → grill unresolved → build tree → approve → contracts
- morphmap-delegate: read map → find ready branches → spawn branch-agent via subagent() · ⚠️ one-shot, needs --loop flag
- morphmap-run: spawn ALL ready branches in parallel → monitor via intercom + state.json → loop until all done (NEW, one-map.md §9)
- morphmap-review: spawn reviewer subagent → walk tree → flag blockers → report
- morphmap-amend: classify addition (4-tier) → route to branch-agent or flag human
- morphmap-triage: read external (GitHub/email/chat) → classify (4-tier) → route or flag
- morphmap-improve: gather (git+decisions+vcc_recall) → study patterns → propose → approve → apply
- morphmap-init: scaffold .morphmap/ + .morphmap/morphmap.mindmap.md + index.md + git init
- morphmap-render: npx markmap-cli → HTML
- morphmap-status: read branch headers → text summary
- morphmap-recover: detect orphaned worktrees → merge uncommitted work → prune branches
- morphmap-archive: extract ✅ branches to archive files → replace with summary link in main map

### quality pipeline (per leaf, gated by [qa:] tag)
- [qa: none]: leaf-worker self-verify → ✅
- [qa: review]: leaf-worker → reviewer (mechanical) → ✅
- [qa: full]: leaf-worker → reviewer (mech) → quality-reviewer (judgment) → bug-hunter (🔴/🟡) → ✅
- [qa:] set by branch agent per leaf; defaults from posture.quality if absent

## mech-mindmap ✅ [module] — scope: state machine + deterministic gates · 3/6 phases (A-C+D+one-map done, E-F pending)
- Plan: docs/mech-mindmap.md · ~2100-2800 LOC TypeScript (est. raised after deep review, finding J)
- Pure/impure split: gates are pure functions (no pi imports) → direct Rust + Rhai migration
- ✅ Phase A: types + state + config → .morphmap/mech/{types,state,config,index}.ts · 49 tests green (bun test) · tsc --noEmit exit 0 · tested: legality, idempotency, gate short-circuit, immutability, deps (needs vs needs-contract), rollup, config lookups, posture
- ✅ Phase B: gate functions → .morphmap/mech/gates/{pre-spawn,submit,review,integration,common}.ts + lattice.ts · 4 chains (preSpawn/submit/review/integration), 22 gates total · pure (validate populated evidence, no I/O) · 38 new tests · full suite 95/95 green · tsc exit 0 · tdd-guard 6/6 · integration tests caught a real crossLeafNoConflict bug (was reading pre-commit leaf.evidence instead of incoming evidence)
- ✅ Phase C: transition tools → .morphmap/mech/tools.ts · submitLeaf/approveLeaf/integrationGate (pure handlers) · select gates via lattice, call transitionLeaf/runIntegrationGates · return {accepted/passed, failures} · 18 new tests · full suite 113/113 green · tsc exit 0 · tdd-guard 6/6 · end-to-end lifecycle tests (submit→approve→integrate, cannot-skip-review) · request_revision deferred to Phase D
- ✅ Phase D: hooks integration — register transition tools in morphmap-hooks.ts, state.json I/O, md↔json sync · ALL WIRED (registerMechTools in hooks, seedFromMap in init/delegate, md→json sync on map write, double-commit bug fixed) · 128 tests green
- ⬜ Phase E: tool failure recovery — classifyFailure, findStuckLeaves, recoveryReport · NOT IMPLEMENTED (recovery.ts does not exist)
- ⬜ Phase F: sub-map session lifecycle — syncChildStatuses, detectSubmapOrphans · NOT IMPLEMENTED (sub-map.ts does not exist)

### phase-d-wiring ✅ [module] — scope: wire mech state machine into execution loop · 5/5 leaves
- ✅ restore mech-pi wiring layer → .morphmap/specs/mech/phase-d/restore-mech-pi-wiring.spec.md [qa: full] [test: unit]
- ✅ register transition tools in hooks → .morphmap/specs/mech/phase-d/register-transition-tools.spec.md [qa: full] [test: unit]
- ✅ bootstrap state.json from mindmap → .morphmap/specs/mech/phase-d/bootstrap-state-json.spec.md [qa: full] [test: integration]
- ✅ md↔json sync hook → .morphmap/specs/mech/phase-d/md-json-sync-hook.spec.md [qa: full] [test: integration]
- ✅ update agent prompts → .morphmap/specs/mech/phase-d/update-agent-prompts.spec.md [qa: review] [test: unit]

### one-map ✅ [module] — scope: unify entities, add compiler hook, map=session tree · 3/3 leaves
- ✅ compiler hook (JSONL evidence extraction) → .morphmap/specs/mech/one-map/compiler-hook.spec.md [qa: full] [test: integration]
- ✅ unify Leaf/Branch → Node type → .morphmap/specs/mech/one-map/unify-node-type.spec.md [qa: full] [test: unit]
- ✅ map = session tree (session IDs in metadata) → .morphmap/specs/mech/one-map/map-session-tree.spec.md [qa: review] [test: unit]

### mech-mindmap (deterministic state machine)
- Pure gates (pre-spawn, submit, review, integration) — zero pi imports
- Transition tools (submit_leaf, approve_leaf, integration_gate)
- Tool failure recovery (classify, retry, reroute)
- Sub-map session lifecycle (heartbeat, orphan, status sync)
- Design: pure/impure split → direct Rust + Rhai port
- quality-reviewer: static code review (one agent, cheap). Checks simplicity, error patterns, domain fit, surgical scope.
- bug-hunter: adversarial pipeline (4 agents, expensive). Finds runtime bugs, race conditions, auth bypasses. Can auto-fix.
- Quality reviewer runs on every leaf (standard/strict). Bug hunter runs on 🔴/🟡 leaves only (strict).

### handoff file types (all OKF frontmatter)
- scout-NNN: recon findings → .morphmap/scout-NNN-YYYYMMDD-slug.md
- researcher-NNN: research brief → .morphmap/researcher-NNN-YYYYMMDD-slug.md
- quality-review-NNN: quality verdict → .morphmap/quality-review-NNN-YYYYMMDD-slug.md
- integration-review-NNN: integration verdict → .morphmap/integration-review-NNN-YYYYMMDD-slug.md
- context-builder-NNN: domain glossary → .morphmap/CONTEXT.md (persistent, not versioned)
- agents/: frozen agent definitions → .morphmap/agents/ (copied at init, updated via --update-agents)

### leaf format tags (for markmap rendering)
- [link] → leaf points to a file (spec, doc, ADR)
- [table] → leaf produces tabular data
- [code] → leaf is a code block
- [checkbox] → leaf is a task/checklist
- [core] → always visible in rendered view
- [rich] → collapsible detail

### branch tags (for agent routing)
- [module] → code module — branch-agent manages
- [feature] → feature concern — branch-agent manages
- [phase] → lifecycle (staging, production) — human-managed
- [log] → documentation (decisions, skills, releases) — human-managed, agent-read-only. Mark ✅ when accurate and current.
- [adr] → architecture decision records — human-managed, read-only, linked to docs/adr/
- unknown tag → default to human-managed

### telemetry (for cross-project improvement)
- [telemetry] entries in ## decisions are machine-readable, anonymized
- Categories: agent-result (all agents), tool-failure, improve-trigger
- Format: `[telemetry] agent-result: agent=morphmap/<name> task=<label> model=<model> thinking=<level> tokens-in=<N> tokens-out=<N> cost=$<amount> result=✅`
- All morphmap agents tracked: leaf-worker, quality-reviewer, reviewer, branch-agent, scout, researcher
- Token/cost captured from pi runtime env vars (PI_RUN_TOKENS_IN, PI_RUN_TOKENS_OUT, PI_RUN_ESTIMATED_COST)
- Delta-calculated: pre-spawn baseline subtracted from post-completion total
- Feeds /morphmap-improve cross-project analysis

### tool + model assignment (per task type)
- Config has `taskProfiles` for general tasks and `testProfiles` for test-specific model assignment
- `testProfiles` separate from `taskProfiles` because testing often needs different models:
  - UI/E2E tests need vision-capable models (zai/glm-5.2) + browser tools (playwriter, agent-browser)
  - Unit tests work with text models (deepseek-v4-flash) + vitest/jsdom
  - Integration tests need stronger reasoning (deepseek-v4-pro)
- Available CLI tools scanned at init/delegate into `.morphmap/available-skills.md` `## tools` section
- Branch agent step 3a: for test leaves, match `[test:]` tag against available tools, assign appropriate tool + model
- Leaf worker uses assigned tool — doesn't guess

## decisions ⬜ [log]

### 2026-07-24
- [implemented] /morphmap-review: enhanced SKILL.md with git-timestamp stale detection (48h threshold), WORKER_BLOCKER intercom check, --handoff file output. Prompt updated per spec.
- [skill] morphmap/review used in tree-walker mode for review command · outcome: implemented

### 2026-07-22
#### /morphmap-amend implemented
- [implemented] /morphmap-amend: skills/amend/SKILL.md + prompts/morphmap-amend.md written · 3-tier classification (exact/partial/no-match) · PR linkage support · force-decision, no confidence scores
- [skill] morphmap-amend used for own implementation · outcome: ✅
- [implemented] mech Phase A: pure state machine core → .morphmap/mech/{types,state,config,index}.ts + state.test.ts · 707 LOC pure + 492 LOC test · 49 tests passing · tsc clean
- [decision] LeafStatus canonicalized to machine strings (pending/in_progress/submitted/in_review/blocked/done) with emoji as display-only map — §2.3 mixed emoji+strings, JSON (§6.1) authoritative so chose machine-native
- [decision] idempotency = (leaf, to, evidenceHash) exists in transitions[] AND current status === to → no-op pass (crash-recovery safe, §8.1). Avoids duplicate log entries on replay.
- [decision] [needs-contract:] build unblocks at "in_review" (contract reviewed), integrate at "done" (§3.6). canStartLeaf() returns {buildBlocked, integrateBlocked}. [corrected from "submitted" — quality-review caught spec divergence, see review block]
- [decision] reviewRounds increments ONLY on in_review → in_progress (CHANGES_REQUESTED loop), not on every transition
- [note] Phase A actual 707 LOC vs plan est. 200 — confirms finding J (estimates optimistic). state.ts alone 337 (StateMachine + idempotency + dep-resolution). Total mech est. holds at ~2100-2800.

#### mech Phase A quality review (morphmap/quality-reviewer + tdd-guard)
- [skill] morphmap/quality-reviewer used for mech Phase A · outcome: CHANGES_REQUESTED (1×P1, 1×P2, 2×P3) · tdd-guard lint: 6/6 pass · handoff: .morphmap/quality-review-001-20260722-mech-phaseA.md
- [implemented] P1 fix: needs-contract build unblock `submitted`→`in_review` (spec §3.6 conformance — build against a REVIEWED contract, not a claimed one)
- [implemented] P2 fix: `done` made terminal (done→done rejected) — prevents silent evidence mutation of approved proof. Idempotency reordered BEFORE legality so crash-recovery replay stays a safe no-op.
- [implemented] P3 fix: transitionLeaf reuses runGates (single gate runner — was divergent duplicate that dropped warnings); warnings now surface in outcome
- [implemented] P3 fix: +8 tests covering gaps (done terminal, done-mutation rejection, done idempotent replay, blocked/unblock via transitionLeaf, mixed needs+needs-contract edges, ghost target, warning surfacing) → 57 tests, 131 expects, all green
- [implemented] non-blocking: tsconfig.mech.json → tsconfig.json (conventional name, bare `tsc` works)
- [learning] logged decision #3 diverged from spec §3.6 without amending the spec — process violation caught by review. Lesson: decisions must cite & reconcile the spec, not override silently. This is the mech thesis working: review turned a self-claimed ✅ into verified ✅.

#### mech Phase B implemented
- [implemented] Phase B gates → .morphmap/mech/gates/{pre-spawn,submit,review,integration}.ts + .morphmap/mech/lattice.ts · preSpawn (7) + submit (6) + review (6) + integration (4) = 22 gates · lattice maps transitions→chains
- [decision] gates are PURE — they validate already-populated LeafEvidence; impure layer (Phase D) gathers evidence (runs CLI, reads files). Keeps gates unit-testable, no I/O.
- [decision] tool-absent pattern: null evidence field → gate skips (pass). tdd-guard/bombadil/lonkero/healthCheck may be absent (finding A). Optional-result gate factory.
- [decision] QA-tier conditional: p1CountZeroIfFull enforces P1=0 only at [qa: full|strict], skips at review/none (§4.1).
- [decision] Phase A TransitionGateCtx widened (optional graph/allLeaves/allowedChanges) so cross-leaf/dependency gates get data. Backward-compatible.
- [learning] integration test caught crossLeafNoConflict reading stale leaf.evidence instead of incoming evidence — unit test missed it (fixture put files on leaf). Lesson: integration tests through transitionLeaf are essential, not optional.

#### mech Phase C implemented
- [implemented] Phase C tools → .morphmap/mech/tools.ts · submitLeaf/approveLeaf/integrationGate · pure handlers (Phase D wraps with pi.registerTool + state.json I/O)
- [decision] Phase C = pure tool handlers; Phase D = impure wiring. Tools select gates via lattice (agents don't pick gates), call transitionLeaf/runIntegrationGates, return agent-facing {accepted/passed, failures}. Keeps C testable.
- [decision] request_revision (§4.2 escape hatch) deferred to Phase D — not in §2.5 tool list. Scope tight to plan.
- [decision] integrationGate marks branch status=done on pass (branch-level transition); returns unchanged state on fail.
- [decision] reviewFile param ⇒ evidence.qualityReviewExists=true (impure layer confirms path exists; pure tool trusts the flag).

#### mech Phase B+C quality review (morphmap/quality-reviewer)
- [skill] morphmap/quality-reviewer used for mech Phase B+C (batched) · outcome: APPROVED WITH FINDINGS (0 blocking, 1×P2, 3×P3) · handoff: .morphmap/quality-review-002-20260722-mech-phaseBC.md
- [implemented] P2 fix: added runtimeDependenciesMet gate to reviewGates — enforces integrateBlocked===false at in_review→done. Closes the [needs-contract:] gap (leaf could reach done while runtime dep not done, false "done=proof"). approveLeaf now passes graph/allLeaves into ctx.
- [implemented] P3 fix: allLeavesSubmitted → allLeavesComplete, tightened check from "submitted" to "done". Branch-done now requires leaf-done (spec §2.4 naming reconciled — a submitted-but-unreviewed leaf no longer completes a branch).
- [implemented] P3 fix: removed unused LeafEvidence import in submit.ts
- [implemented] P3 fix: +2 tests (pre-spawn chain via transitionLeaf; runtime-dep blocks approve) → 115 tests, 276 expects, all green
- [learning] P2 was a real enforcement gap invisible to self-verification (all 113 tests passed before) — the needs-contract build/integrate split has two gates (buildBlocked at spawn, integrateBlocked at approve) and only the first existed. Review caught the missing half.

### 2026-07-21
#### implemented (15)
- [implemented] new leaf tags: [qa: none|review|full], [test: unit|property-based|snapshot|integration|e2e], [skill: <name>], [human]
- [implemented] recursive branch agent spawning: same agent at any depth (L1-L3), 5-dimension context injection
- [implemented] quality architecture: skills loaded before .spec via available-skills.md cache, constraints extracted into Boundaries
- [implemented] mechanical reviewer wired into execution loop (was defined but never spawned)
- [implemented] per-leaf [qa:] override — branch agent assigns tag, not blind posture inheritance
- [implemented] goal completion gate: 6 mechanical checks before update_goal complete
- [implemented] available-skills.md cache: generated at init/delegate, read by all branch agents
- [implemented] agent freezing: .morphmap/agents/ copy during init, agentPaths in pi-subagents config
- [implemented] --update-agents flag: refresh frozen agents with git diff review
- [implemented] improve skill: agent edit targets .morphmap/agents/ (user project) or .pi/agents/ (dogfooding), never global install
- [implemented] leaf worker: [test:] tag awareness, [human] tag skip
- [implemented] quality reviewer: boundaries compliance check against .spec
- [implemented] delegate skill: depth-agnostic spawning for all heading levels
- [implemented] init skill: available-skills.md generation at scaffold
- [implemented] execution flow doc: updated quality loop with per-leaf [qa:] gating

#### specifications (6)
- [spec] OKF handoff format unified: type=handoff, +version field, +status lifecycle (raw→distilled→stale)
- [spec] All handoff agents (scout, researcher, quality-reviewer, reviewer) write versioned OKF files
- [spec] quality reviewer now spawned by branch agent in execution loop step 7d
- [spec] integration reviewer spawned by branch agent after sub-branch completes (step 8, quality=strict)
- [spec] bug-hunter added as posture-gated step: quality=strict + 🔴/🟡 leaves only (step 7f)
- [spec] quality pipeline: leaf-worker → reviewer (mechanical) → quality-reviewer (judgment) → bug-hunter (adversarial, optional) → integration-review → branch-agent

#### learnings (8)
- [learn] quality-reviewer vs bug-hunter: complementary. quality-reviewer=static code review (cheap, every leaf). bug-hunter=adversarial pipeline (expensive, 🔴/🟡 only). Not redundant.
- [learn] /goal underutilized: only used for 5-why failure analysis. Now wired into branch-agent loop start + plan phase.
- [learn] tokei already in brownfield init path — confirmed installed (v14.0.0, JSON support)
- [learn] quality-reviewer was defined but unwired — now in execution loop
- [learn] researcher agent had no OKF frontmatter at all — now has unified format
- [learn] skill discovery: Option C (available-skills.md cache) chosen over hardcoded mapping. §10 in improv-map.
- [learn] dogfooding surfaced gap: ">5 → sub-branch" rule existed but didn't apply to [log] branches. Rule now universal. Map write protocol added: commit + render HTML after every map edit.
- [learn] pi extension hooks: morphmap-hooks.ts for semi-mechanical enforcement (spec guard, goal gate warning, auto-render, telemetry)
- [learn] dogfooding: pi-interview format bug — recommended for single-select must be string, not object. Fixed in plan Phase 3 with explicit format rules.
- [learn] ADR support: new [adr] branch tag, ADR template in format spec, hook verifies referenced ADR files exist. Captures decision rationale that survives compaction.
- [learn] worktree isolation trap: agents wrote code to worktrees but never committed/merged. 13 orphaned worktrees on MorphShell. Fixed: delegate no longer uses worktree:true.
- [learn] agent hallucination: reports claim ✅ with test counts + diffs but code not on disk. Hook checks .spec existence but not code existence. Need post-subagent code verification.
- [implemented] /morphmap-recover: detects orphaned worktrees, merges uncommitted work, prunes branches
- [implemented] orphan detection: branch-agent checks parent via intercom at startup, self-merges if orphaned
- [learn] integration gap found during MorphShell testing: reviewer integration mode was CODE-ONLY — never ran the app. Phase 3 skipped on quality=fast. Now: quality=fast runs lite (health check), quality=strict runs full (bombadil + lonkero). Only quality=none skips.
- [learn] MorphShell dogfooding complete: plan (budget estimate + 4 scouts), delegate (3 rounds, 15 branches), recover (13 worktrees), testProfiles, tool scanning, model enforcement, telemetry. 5 e2e verified, 5 remaining.

### 2026-07-23
#### design verification — fractal autonomous loop
- [verify] scout-002 design verification complete → .morphmap/scout-002-20260723-design-verification.md
- [finding] branch-agent.md IS autonomous: writes .spec (step 3), spawns sub-branches recursively (step 0a), loops (step 11), uses /goal (step 0b/13). Does NOT use mech scripts — they are not wired in.
- [finding] delegate SKILL.md is one-shot: spawns branch agents, reports, exits. Does NOT loop or re-spawn. Branch agent loops internally, but delegate requires manual re-trigger.
- [finding] mech scripts (Phases A-C) fully implemented + tested (115 tests green) but NOT wired into execution. morphmap-hooks.ts does not call any mech functions, does not register transition tools, does not read/write state.json. Phase D (hooks integration) is "Soon" per docs/mech-mindmap.md §7.1.
- [finding] Root Orchestrator (AGENTS.md) routes user intent to skills via routing table. Trigger-based, not autonomous. No re-spawn loop.
- [finding] Fractal loop exists at branch-agent level (steps 0-13 with repeat) but is NOT fully autonomous like Fractal (PREPARE→PLAN→EXECUTE→REVIEW→COMMIT). Delegate is one-shot, Root is trigger-based, leaf worker is one-shot.
- [finding] Branch agent writes .spec files itself (step 3). Does NOT read plan.md from agent-spec. agent-spec CLI used for verification only.
- [finding] Missing planned files: state.json, plans/*.plan.md, codebase-graph/, specs/ directory. Missing planned agents: spec-reviewer.md, refactor-worker.md.
- [risk] CRITICAL: mech state machine is dead code — 115 tests pass but gates never run during execution. Completion is still trust-based.
- [risk] HIGH: delegate skill does not auto-loop. No autonomous re-trigger after branch completion.
- [risk] HIGH: double-commit bug in morphmap-hooks.ts (~L230-245) — git commit runs twice. Telemetry pollutes mindmap via echo >>.
- [action] Phase D (hooks integration) is the highest priority gap. Wire mech into morphmap-hooks.ts, register transition tools, create state.json.

#### one-map reference doc
- [decision] docs/one-map.md promoted to reference doc for all new implementation. Replaces mech-mindmap.md as the primary architecture doc. mech-mindmap.md remains as the state machine spec (§2-§8).
- [decision] Phase structure clarified: Phases A-F = pure state machine core (180 tests green). Phase D = impure wiring (NOT wired — highest priority gap). one-map phases = Phase D (wire mech) → Phase one-map (unify entities, add /morphmap-run, add compiler hook).
- [decision] herdr removed from one-map.md. pi-subagents retained for context isolation. herdr deferred to Phase 3 (future).
- [decision] New `/morphmap-run` command: spawn all ready branches in parallel, monitor via intercom + state.json, loop until all done. Addresses "auto-run for all branches when plans approved."
- [decision] `--loop` flag on `/morphmap-delegate`: re-check for newly-ready branches after completions, re-spawn, repeat.
- [decision] Compiler hook: parse agent JSONL on tool_result events, extract evidence (test/build exit codes, files changed), call mech state machine. Replaces agent self-summarization.
- [decision] Map = session tree: pi subagent session IDs stored in node metadata. Map shows running/paused/done sessions.
- [implemented] docs/one-map.md v2 patched: removed herdr, added phase structure, added implementation plan (§9), added /morphmap-run design, added compiler hook design, added Node metadata schema.
- [action] Phase D: restore mech-pi/ wiring layer, register 3 transition tools in hooks, bootstrap state.json from mindmap, implement md↔json sync hook, update agent prompts to use mech tools.

#### triage command implemented
- [implemented] /morphmap-triage command: skills/triage/SKILL.md + prompts/morphmap-triage.md · gh CLI integration for GitHub issues/PRs · 4-tier classification (very-good/good/bad/very-bad) against branch scope · auto-route + flag-for-human routing · PR exact-match detection · decision logging
- [decision] triage SKILL.md uses gh CLI (gh issue view, gh pr view, gh issue list, gh pr list) for v1 GitHub integration. Email/chat are text-only classification. Batch mode supports --repo flag for scanning open issues/PRs.
- [decision] 4-tier naming kept as very-good/good/bad/very-bad per docs/triage-flow.md (canonical). Spec's exact/high/partial/no-match are equivalent — very-good=exact, good=high, bad=partial, very-bad=no-match.

### 2026-07-20
#### fixes (5)
- [violation] Root Orchestrator context at 40%+ caused drift — edited config unilaterally
- [fix] Pre-Action Refresh: ctx_search + ctx_execute_file before map/config edits
- [fix] Context Budget: check ctx_stats every 10 turns, compact if >40%
- [fix] Write Guard added "Discussed?" check + violation logging
- [fix] ## skills branch added to map — documents each skill's phases
- [fix] skill usage logging: [skill] entries feed /morphmap-improve Phase 2
- [fix] map write protocol: commit + render HTML after every map edit — agent rule + git hook

#### learnings (3)
- [learn] reviewer: added tdd-guard layer for test trustworthiness
- [learn] plan Phase 3: use grill-for-unknowns skill
- [learn] .spec template: add Verifiable by Human + Delegated to Implementer

#### discussions (4)
- [discuss] Cortex conflicts with context-mode. Not needed. v3 with CognitiveOS.
- [discuss] OpenSpace: quality tracking covered by /morphmap-improve
- [discuss] taskProfiles: deferred to v2
- [discuss] roadmap: v2=brownfield+multi-repo, v3=CognitiveOS+cross-project telemetry

### 2026-07-19
#### decisions (3)
- v1 design decisions finalized
- adopted OKF format for all knowledge documents
- verified stack: pi-workflows NOT installed, pi-dynamic-wf removed

#### project (3)
- renamed project to MorphMap
- git init, first commit
- 4-tier forced choice replaces fake confidence numbers

#### learnings (1)
- end-to-end test: all 5 agents spawned + executed

#### discussions (4)
- [discuss] grill = plan Phase 3 with xhigh thinking, not separate agent
- [discuss] MorphEditor dogfooding: pick one small feature
- [discuss] branch-agent needs config-read step for leafProfiles
- [discuss] model assignment: subagent() inline overrides