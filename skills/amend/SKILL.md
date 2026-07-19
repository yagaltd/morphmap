---
name: morphmap-amend
description: Intake from human. Classify addition against branch scope, route to branch agent. Log to decisions.
user-invocable: true
argument-hint: "<addition description, or issue/PR reference>"
---

# MorphMap Amend — Human Intake

Classify and route human additions to the right branch agent.

## Phase 1: CLASSIFY

Read morphmap.mindmap.md. Extract all `##` branch scope declarations.
Search for match:

```
ctx_search("<addition text>")
  → against indexed morphmap.mindmap.md
  → returns top match with confidence
```

## Phase 2: ROUTE

Confidence >0.8 → route to matching branch:
```
intercom branch: { type: "new:leaf", leaf: "<summary>", source: "human /morphmap-amend" }
Log: "routed '<addition>' to <branch> [confidence: 0.XX]"
```

Confidence 0.5-0.8 → route with lower confidence, branch agent validates.

Confidence <0.5 → ask human: "No matching branch. Create new branch or expand scope of existing?"

## Phase 3: PASS POSTURE

Include in every route: "Context from orchestrator: phase=X, compat=Y, scope=Z, quality=W, budget=V"

## Rules

- Log all routing decisions to ## decisions in morphmap.mindmap.md
- Branch agent creates the leaf — you only route
- If human asks to restructure tree (new branch, merge, split) → switch to morphmap-plan hat
