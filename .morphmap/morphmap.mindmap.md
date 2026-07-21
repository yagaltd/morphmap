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


# MorphMap — AI-Native Project Management

## docs ✅ [log] — scope: format spec, agent architecture, protocols, execution, triage · 6/6 leaves
- ✅ format specification → docs/format-spec.md
- ✅ agent architecture + system prompts + hallucination prevention → docs/agent-architecture.md
- ✅ intercom protocol specification → docs/intercom-protocol.md
- ✅ execution flow + TOC + KPI rules → docs/execution-flow.md
- ✅ triage flow + classification logic → docs/triage-flow.md
- ✅ design decisions audit trail → docs/design-decisions.md

## examples ✅ [log] — scope: MorphEditor mindmap, OKF conformance · 2/2 leaves
- ✅ MorphEditor full mindmap → examples/morpheditor.mindmap.md
- ✅ OKF conformance: all reference docs valid, executables follow own conventions

## commands 🔄 [module] — scope: slash commands · 9/9 prompts + 8/8 skills · e2e tested: 4/9
- ✅ /morphmap-init — scaffold verified
- ✅ /morphmap-plan — scout + researcher + tree + .spec verified
- ✅ /morphmap-delegate — branch-agent + leaf-worker verified
- ✅ /morphmap-improve — PDSA Study loop written
- ⬜ /morphmap-review — warm (skill written, not spawned in e2e)
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
- CHANGELOG.md for full details

## skills ⬜ [log] — what each skill does + format tags
- morphmap-plan: scout+research (parallel) → decision tree → grill unresolved → build tree → approve → contracts
- morphmap-delegate: read map → find ready branches → spawn branch-agent via subagent()
- morphmap-review: spawn reviewer subagent → walk tree → flag blockers → report
- morphmap-amend: classify addition (4-tier) → route to branch-agent or flag human
- morphmap-triage: read external (GitHub/email/chat) → classify (4-tier) → route or flag
- morphmap-improve: gather (git+decisions+vcc_recall) → study patterns → propose → approve → apply
- morphmap-init: scaffold .morphmap/ + .morphmap/morphmap.mindmap.md + index.md + git init
- morphmap-render: npx markmap-cli → HTML
- morphmap-status: read branch headers → text summary

### quality pipeline (per leaf)
- leaf-worker: implements .spec → TDD → agent-spec lifecycle (self-verify)
- reviewer (mechanical): agent-spec lifecycle + tdd-guard → pass/fail (inline output)
- quality-reviewer (judgment): simplicity, security, error handling → OKF handoff file (quality-review-NNN)
- bug-hunter (adversarial): Recon→Hunter→Skeptic→Referee → confirmed bugs (quality=strict, 🔴/🟡 only)
- reviewer (integration): cross-leaf conflicts, gaps, consistency → OKF handoff file (integration-review-NNN)
- branch-agent: aggregates all reviews, spawns fixes for P0/P1, updates map

### quality vs bug-hunter (complementary, not redundant)
- quality-reviewer: static code review (one agent, cheap). Checks simplicity, error patterns, domain fit, surgical scope.
- bug-hunter: adversarial pipeline (4 agents, expensive). Finds runtime bugs, race conditions, auth bypasses. Can auto-fix.
- Quality reviewer runs on every leaf (standard/strict). Bug hunter runs on 🔴/🟡 leaves only (strict).

### handoff file types (all OKF frontmatter)
- scout-NNN: recon findings → .morphmap/scout-NNN-YYYYMMDD-slug.md
- researcher-NNN: research brief → .morphmap/researcher-NNN-YYYYMMDD-slug.md
- quality-review-NNN: quality verdict → .morphmap/quality-review-NNN-YYYYMMDD-slug.md
- integration-review-NNN: integration verdict → .morphmap/integration-review-NNN-YYYYMMDD-slug.md
- context-builder-NNN: domain glossary → .morphmap/CONTEXT.md (persistent, not versioned)

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
- [log] → documentation (decisions, skills, releases) — read-only
- unknown tag → default to human-managed

### telemetry (for cross-project improvement)
- [telemetry] entries in ## decisions are machine-readable, anonymized
- Categories: leaf-result, spec-quality, model-fit, classification, eta-drift
- Format: [telemetry] <category>: retries=<N> model=<X> thinking=<Y> result=<Z>
- Feeds /morphmap-improve cross-project analysis

## decisions ⬜ [log]

### 2026-07-21
- [spec] OKF handoff format unified: type=handoff, +version field, +status lifecycle (raw→distilled→stale)
- [spec] All handoff agents (scout, researcher, quality-reviewer, reviewer) write versioned OKF files
- [spec] quality reviewer now spawned by branch agent in execution loop step 7d
- [spec] integration reviewer spawned by branch agent after sub-branch completes (step 8, quality=strict)
- [spec] bug-hunter added as posture-gated step: quality=strict + 🔴/🟡 leaves only (step 7f)
- [spec] quality pipeline: leaf-worker → reviewer (mechanical) → quality-reviewer (judgment) → bug-hunter (adversarial, optional) → integration-review → branch-agent
- [learn] quality-reviewer vs bug-hunter: complementary. quality-reviewer=static code review (cheap, every leaf). bug-hunter=adversarial pipeline (expensive, 🔴/🟡 only). Not redundant.
- [learn] /goal underutilized: only used for 5-why failure analysis. Now wired into branch-agent loop start + plan phase.
- [learn] tokei already in brownfield init path — confirmed installed (v14.0.0, JSON support)
- [learn] quality-reviewer was defined but unwired — now in execution loop
- [learn] researcher agent had no OKF frontmatter at all — now has unified format

### 2026-07-20
- [violation] Root Orchestrator context at 40%+ caused drift — edited config unilaterally
- [fix] Pre-Action Refresh: ctx_search + ctx_execute_file before map/config edits
- [fix] Context Budget: check ctx_stats every 10 turns, compact if >40%
- [fix] Write Guard added "Discussed?" check + violation logging
- [fix] ## skills branch added to map — documents each skill's phases
- [fix] skill usage logging: [skill] entries feed /morphmap-improve Phase 2
- [learn] reviewer: added tdd-guard layer for test trustworthiness
- [learn] plan Phase 3: use grill-for-unknowns skill
- [learn] .spec template: add Verifiable by Human + Delegated to Implementer
- [discuss] Cortex conflicts with context-mode. Not needed. v3 with CognitiveOS.
- [discuss] OpenSpace: quality tracking covered by /morphmap-improve
- [discuss] taskProfiles: deferred to v2
- [discuss] roadmap: v2=brownfield+multi-repo, v3=CognitiveOS+cross-project telemetry

### 2026-07-19
- v1 design decisions finalized
- adopted OKF format for all knowledge documents
- verified stack: pi-workflows NOT installed, pi-dynamic-wf removed
- renamed project to MorphMap
- git init, first commit
- 4-tier forced choice replaces fake confidence numbers
- end-to-end test: all 5 agents spawned + executed
- [discuss] grill = plan Phase 3 with xhigh thinking, not separate agent
- [discuss] MorphEditor dogfooding: pick one small feature
- [discuss] branch-agent needs config-read step for leafProfiles
- [discuss] model assignment: subagent() inline overrides