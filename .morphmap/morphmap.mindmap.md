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
  maxWidth: 900
resource: index.md
---

## context ⬜
- Domain glossary → .morphmap/CONTEXT.md
- Coding standards → .morphmap/standards.md (6 rules for all agents)
- 6 Thinking Hats → .morphmap/hats-*.md (structured reasoning outputs)
- improv-map: quality + recursion + context improvements → .morphmap/improv-map.md
- one-map architecture (reference doc for new implementation) → docs/one-map.md
- mech-mindmap state machine spec → docs/mech-mindmap.md


# MorphMap — AI-Native Project Management

## docs ✅ → .morphmap/archive/2026-07-24-docs.md
  format spec, agent architecture, protocols, execution, triage, state machine, one-map · 8/8 leaves
## examples ✅ → .morphmap/archive/2026-07-24-examples.md
  MorphEditor mindmap, OKF conformance · 2/2 leaves
## commands ✅ → .morphmap/archive/2026-07-24-commands.md
  slash commands ·  leaves
## agents ✅ → .morphmap/archive/2026-07-24-agents.md
  agent definitions · 5/5 leaves
## extension ✅ → .morphmap/archive/2026-07-24-extension.md
  pi extension package · 3/3 leaves
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

## skills ✅ → .morphmap/archive/2026-07-24-skills.md
   ·  leaves
## mech-mindmap ✅ → .morphmap/archive/2026-07-24-mech.md
  state machine + deterministic gates · 5/5 leaves
## decisions ⬜ [log]

→ .morphmap/decisions.md (115 entries: 4 ✅ recent, 111 📦 archived)
  Latest: gap undo/experiment flexibility · review in tree-walker mode · jj adopted across 12 files
→ types: 42 decision, 37 implemented, 18 learn, 6 spec, 6 fix, 3 risk, 2 violation, 1 gap