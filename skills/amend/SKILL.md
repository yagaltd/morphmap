---
name: morphmap-amend
description: Intake from human. Classify addition against branch scope, route to branch agent. Log to decisions.
user-invocable: true
argument-hint: "<addition description, or issue/PR reference>"
---

# MorphMap Amend — Human Intake

Classify and route human additions to the right branch agent.

## Phase 2: CLASSIFY

Read .morphmap/morphmap.mindmap.md. Extract all `##` branch scope declarations.
Compare the addition against each branch's scope keywords.

Forced 4-tier classification (no middle ground):

| Tier | Meaning | Action |
|------|---------|--------|
| **very good** | Addition clearly matches this branch's scope | Route to branch agent. Log: confidence=very-good |
| **good** | Addition likely matches | Route to branch agent with note: "validate match". Branch agent confirms or rejects |
| **bad** | Addition unlikely to match | Flag for human: "No clear match. Best candidate: <branch>. Proceed or create new branch?" |
| **very bad** | Addition clearly outside all branches | Flag for human: "New domain. Create branch?" or ask human to expand scope of nearest branch |

No confidence numbers. No 0.5 middle ground. Force a decision.

Include in every route: "Context from orchestrator: phase=X, compat=Y, scope=Z, quality=W, budget=V"

## Rules

- Log all routing decisions to ## decisions in .morphmap/morphmap.mindmap.md
- Branch agent creates the leaf — you only route
- If human asks to restructure tree (new branch, merge, split) → switch to morphmap-plan hat
