---
type: mindmap
project: MorphMap
status: in-progress
timestamp: 2026-07-24
tags: [MorphMap, project-management, ai-agents, pi-extension]
posture:
  phase: prototype
  compatibility: break
  scope: broad
  quality: fast
  budget: balanced
markmap:
  colorFreezeLevel: 2
  maxWidth: 900
resource: index.md
---

## context ⬜
- Branch tags: [module] [feature] → branch-agent | [research] [brainstorm] → human-led → /morphmap-promote
- Domain glossary → .morphmap/CONTEXT.md
- Coding standards → .morphmap/standards.md (6 rules)
- 6 Thinking Hats → .morphmap/hats-*.md
- Architecture → docs/one-map.md
- State machine → docs/mech-mindmap.md
- Quality improvement → .morphmap/improv-map.md

# MorphMap — AI-Native Project Management

## e2e-test 🔄 [phase]
- ✅ init + plan + delegate flow verified on E2ETest
- ✅ scout: recon · researcher: research · agent: pull + spawn + update
- ✅ leaf-worker: implement server.js + package.json + curl verify
- ⬜ test /morphmap-review
- ⬜ test /morphmap-triage on GitHub issue

## real-project-test ⬜ [phase]
- ⬜ init MorphEditor as MorphMap project
- ⬜ plan from real MorphEditor features

## production 🔴 [phase] [BLOCKED: MorphEditor dogfooding not done]
- 🔴 publish pi extension → https://github.com/yagaltd/morphmap (published, needs dogfood verification)
- 🔴 MorphEditor dogfooding: manage own development with MorphMap

## releases [log]
- 0.2.0 (2026-07-20): 5 agents spawn-verified, 9 commands, taskProfiles, PDSA improve, Write Guard
- 0.1.0 (2026-07-19): initial release — format spec, agent architecture, 6 reference docs
- semver for code, date-based for non-code, CHANGELOG.md auto-generated

## docs ✅ → .morphmap/archive/2026-07-24-docs.md
  format spec, agent architecture, protocols, execution, triage, state machine, one-map · 8 leaves
## examples ✅ → .morphmap/archive/2026-07-24-examples.md
  MorphEditor mindmap, OKF conformance · 2 leaves
## commands ✅ → .morphmap/archive/2026-07-24-commands.md
  /morphmap: plan delegate review amend init render status improve hats recover archive promote run explore expand collapse grill · 17 commands
## agents ✅ → .morphmap/archive/2026-07-24-agents.md
  branch-agent leaf-worker reviewer scout researcher quality-reviewer context-builder · 7 agents
## extension ✅ → .morphmap/archive/2026-07-24-extension.md
  hooks CLI context-mode pi-subagents · 3 leaves
## skills ✅ → .morphmap/archive/2026-07-24-skills.md
  plan delegate review amend init render status improve hats recover archive promote explore expand collapse grill · 18 skills
## mech-mindmap ✅ → .morphmap/archive/2026-07-24-mech.md
  state machine + deterministic gates · 6 phases (all done)

## decisions ⬜ [log]
  → .morphmap/decisions.md (115 entries: 4 ✅ recent, 111 📦 archived)
  Latest: promote mechanism · undo gap · review tree-walker · jj enforced AGENTS.md
