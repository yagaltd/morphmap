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


# MorphMap — AI-Native Project Management

## docs ✅ [log] — scope: format spec, agent architecture, protocols, execution, triage · 7/7 leaves
- ✅ format specification → docs/format-spec.md
- ✅ agent architecture + system prompts + hallucination prevention → docs/agent-architecture.md
- ✅ intercom protocol specification → docs/intercom-protocol.md
- ✅ execution flow + TOC + KPI rules → docs/execution-flow.md
- ✅ triage flow + classification logic → docs/triage-flow.md
- ✅ design decisions audit trail → docs/design-decisions.md

## examples ✅ [log] — scope: MorphEditor mindmap, OKF conformance · 2/2 leaves
- ✅ MorphEditor full mindmap → examples/morpheditor.mindmap.md
- ✅ OKF conformance: all reference docs valid, executables follow own conventions

## commands 🔄 [module] — scope: slash commands · 11/11 prompts + 10/10 skills · e2e tested: 5/11
- ✅ /morphmap-init — scaffold + brownfield scan (MorphShell)
- ✅ /morphmap-plan — budget estimate + grill + tree (MorphShell 4 scouts parallel)
- ✅ /morphmap-delegate — 3 rounds on MorphShell, crash recovery
- ✅ /morphmap-improve — PDSA Study loop written
- ✅ /morphmap-recover — orphan detection + worktree merge (MorphShell)
- ⬜ /morphmap-review — warm (quality review ran on MorphShell, OKF output needs fix)
- ⬜ /morphmap-amend — warm (skill written, not spawned in e2e)
- ⬜ /morphmap-triage — warm (skill written, not spawned in e2e)
- ⬜ /morphmap — render via markmap-cli, warm
- ⬜ /morphmap-status — text summary, warm
- ✅ e2e: scout + researcher + branch-agent + leaf-worker all spawned + executed

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

## extension 🔄 [module] — scope: pi extension package · 2/3 leaves
- ✅ package.json + install from GitHub (pi install works)
- ✅ agent discovery fixed (.pi/agents/ → ~/.pi/agent/agents/morphmap/)
- ⬜ npm packaging (not needed — GitHub install works)

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
- morphmap-delegate: read map → find ready branches → spawn branch-agent via subagent()
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

## mech-mindmap 🔄 [module] — scope: state machine + deterministic gates · 0/6 phases
- Plan: docs/mech-mindmap.md · 1750 LOC TypeScript, 900 pure (Rust-portable)
- Pure/impure split: gates are pure functions (no pi imports) → direct Rust + Rhai migration
- ⬜ Phase A: types + state + config (~200 loc)
- ⬜ Phase B: gate functions — pre-spawn, submit, review, integration (~400 loc)
- ⬜ Phase C: transition tools — submit_leaf, approve_leaf, integration_gate (~300 loc)
- ⬜ Phase D: hooks integration — tool_call, pre/post subagent, map write (~200 loc)
- ⬜ Phase E: tool failure recovery — classify, retry, reroute (~150 loc)
- ⬜ Phase F: sub-map session lifecycle — heartbeat, orphan, status sync (~200 loc)

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