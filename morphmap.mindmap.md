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

# MorphMap — AI-Native Project Management

## docs ✅ — scope: format spec, agent architecture, protocols, execution, triage · 6/6 leaves
- ✅ format specification → docs/format-spec.md
- ✅ agent architecture + system prompts + hallucination prevention → docs/agent-architecture.md
- ✅ intercom protocol specification → docs/intercom-protocol.md
- ✅ execution flow + TOC + KPI rules → docs/execution-flow.md
- ✅ triage flow + classification logic → docs/triage-flow.md
- ✅ design decisions audit trail → docs/design-decisions.md

## examples ✅ — scope: MorphEditor mindmap, OKF conformance · 2/2 leaves
- ✅ MorphEditor full mindmap → examples/morpheditor.mindmap.md
- ✅ OKF conformance: all reference docs valid, executables follow own conventions

## commands 🔄 — scope: slash commands · 9/9 prompts + 8/8 skills · e2e tested: 4/9
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

## agents ✅ — scope: agent definitions · 5/5 leaves · all spawn-verified
- ✅ branch-agent → .pi/agents/branch-agent.md · spawned + executed
- ✅ leaf-worker → .pi/agents/leaf-worker.md · spawned + implemented
- ✅ reviewer → .pi/agents/reviewer.md (two modes)
- ✅ scout → .pi/agents/scout.md · spawned + recon completed
- ✅ researcher → .pi/agents/researcher.md · spawned + research completed

### fixes from e2e
- ✅ researcher: web_search→bash+curl (tools available in subagent context)
- ✅ branch-agent: agent-spec→bash (CLI needs shell, not tool name)
- ✅ agent install: ~/.pi/agent/agents/morphmap/ for pi-subagents discovery

## extension 🔄 — scope: pi extension package · 2/3 leaves
- ✅ package.json + install from GitHub (pi install works)
- ✅ agent discovery fixed (.pi/agents/ → ~/.pi/agent/agents/morphmap/)
- ⬜ npm packaging (not needed — GitHub install works)

## staging 🔄
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

## production 🔴 [BLOCKED: review + triage not tested]
### release-v0.1
- 🔴 publish pi extension → already published (https://github.com/yagaltd/morphmap)
- 🔴 MorphEditor dogfooding: manage own development with MorphMap

## releases — version history (semver for packages, date-based for non-code)
- 0.2.0 (2026-07-20): 5 agents spawn-verified, 9 commands, taskProfiles, PDSA improve, Write Guard
- 0.1.0 (2026-07-19): initial release — format spec, agent architecture, 6 reference docs

### versioning rules
- semver (major.minor.patch) for code projects
- date-based (YYYY-MM-DD) for marketing, operations, non-code
- releases branch updated on every push/publish
- CHANGELOG.md for full details

## skills ⬜ — what each skill does (map-self-documenting)
- morphmap-plan: scout+research (parallel) → decision tree → grill unresolved → build tree → approve → contracts
- morphmap-delegate: read map → find ready branches → spawn branch-agent via subagent()
- morphmap-review: spawn reviewer subagent → walk tree → flag blockers → report
- morphmap-amend: classify addition (4-tier) → route to branch-agent or flag human
- morphmap-triage: read external (GitHub/email/chat) → classify (4-tier) → route or flag
- morphmap-improve: gather (git+decisions+vcc_recall) → study patterns → propose → approve → apply
- morphmap-init: scaffold .morphmap/ + morphmap.mindmap.md + index.md + git init
- morphmap-render: npx markmap-cli → HTML
- morphmap-status: read branch headers → text summary

## decisions ⬜
- 2026-07-19: v1 design decisions finalized → docs/design-decisions.md
- 2026-07-19: adopted OKF format for all knowledge documents
- 2026-07-19: verified actual installed stack — pi-workflows NOT installed, corrected hallucination
- 2026-07-19: pi-dynamic-workflows removed from stack (pi-subagents handles all orchestration)
- 2026-07-19: renamed project to MorphMap
- 2026-07-19: git init, first commit (15 files, 1580 lines)
- 2026-07-19: end-to-end test: scout + researcher + branch-agent + leaf-worker all spawned + executed successfully
- 2026-07-19: [discuss] taskProfiles — domain+task-type model routing (DeepSeek/GLM/Anthropic split). Deferred to v2. v1 uses leafProfiles only.
- 2026-07-19: [discuss] "grill" = plan skill Phase 3 (see skills/plan/SKILL.md). Main session with xhigh thinking. Not a separate agent.
- 2026-07-19: [discuss] for MorphEditor dogfooding — pick one small feature (1 leaf) to test full loop. Dark theme toggle or keyboard shortcut fix.
- 2026-07-19: [discuss] branch-agent needs explicit config-read step: read .morphmap/config for leafProfiles on startup
- 2026-07-19: [discuss] model assignment: subagent({ model: ..., thinking: ... }) inline overrides agent frontmatter. Verified working.\n- 2026-07-20: [violation] Root Orchestrator context at 40%+ caused drift — edited config unilaterally, skipped map update. Root cause: no pre-action refresh.\n- 2026-07-20: [fix] Pre-Action Refresh: ctx_search + ctx_execute_file before map/config edits\n- 2026-07-20: [fix] Context Budget: check ctx_stats every 10 turns, compact if >40%\n- 2026-07-20: [fix] Write Guard added \"Discussed?\" check + violation logging\n- 2026-07-20: [fix] `## skills` branch added to map — documents each skill's phases\n- 2026-07-20: [fix] skill usage logging: Root Orchestrator + branch-agent log `[skill] <name>` entries to decisions. Feeds /morphmap-improve Phase 2 automatically.
- 2026-07-20: [learn] reviewer mechanical mode: added tdd-guard layer for test trustworthiness
- 2026-07-20: [learn] plan Phase 3: use grill-for-unknowns skill (one question/turn, blast radius)
- 2026-07-20: [learn] .spec template: add Verifiable by Human + Delegated to Implementer sections
- 2026-07-20: [discuss] Cortex conflicts with context-mode (overwrites AGENTS.md). Not needed.
- 2026-07-20: [discuss] CognitiveOS v3: VCS checkpoints + agent decisions. v3 material.
- 2026-07-20: [discuss] OpenSpace patterns (quality tracking, skill IDs) — /morphmap-improve already covers this
