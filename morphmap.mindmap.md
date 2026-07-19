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

## commands 🔄 — scope: slash command implementations · 2/8 leaves
- ✅ prompts/ + skills/ — 8 prompt files + 7 skill files → 483 lines
- ✅ /morphmap-init — scaffold logic verified (test project created + git init)
- ⬜ /morphmap-plan — Root Orchestrator Hat 1 (Planner: scout → tree → approve)
- ⬜ /morphmap-delegate — spawn branch agents for all ready branches or one specific
- ⬜ /morphmap-review — fresh subagent walks tree, flags blockers, human triages
- ⬜ /morphmap-amend — Root Orchestrator Hat 2 (Intake: classify → route to branch)
- ⬜ /morphmap-triage — Root Orchestrator Hat 3 (Triage: external input → route)
- ⬜ /morphmap — render .mindmap.md to interactive HTML via markmap-cli
- ⬜ /morphmap-status — text summary, cheap, no render

## agents ⬜ — scope: agent definition files for pi-subagents · 0/3 leaves
- ⬜ root-orchestrator agent → agents/root-orchestrator.md [🔴 BLOCKING: gates all execution]
- ⬜ branch-agent agent → agents/branch-agent.md [🔴 BLOCKING: gates all execution]
- ⬜ leaf-worker agent → agents/leaf-worker.md

## extension ⬜ — scope: pi extension package · 0/3 leaves
- ⬜ package.json + extension entrypoint (depends on pi-prompt-template-model)
- ⬜ register 7 slash commands
- ⬜ install + test in clean pi session

## staging ⬜
### test-2026-07-25
- ⬜ test /mindmap-plan on MorphEditor project [needs: commands ⬜]
- ⬜ test /mindmap-delegate with 2 branches [needs: agents ⬜, commands ⬜]
- ⬜ test intercom routing between branches [needs: agents ⬜, intercom-protocol ✅]

## production 🔴 [BLOCKED: commands not built]
### release-v0.1
- 🔴 publish pi extension → `pi install npm:morphmap`
- 🔴 MorphEditor dogfooding: manage own development with MorphMap

## decisions ⬜
- 2026-07-19: v1 design decisions finalized → docs/design-decisions.md
- 2026-07-19: adopted OKF format for all knowledge documents
- 2026-07-19: verified actual installed stack — pi-workflows NOT installed, corrected hallucination
- 2026-07-19: pi-dynamic-workflows removed from stack (pi-subagents handles all orchestration)
- 2026-07-19: renamed project to MorphMap
- 2026-07-19: git init, first commit (15 files, 1580 lines)
