---
type: specification
topic: intercom-protocol
timestamp: 2026-07-19
tags: [intercom, messaging, escalation, routing, agent-communication]
---

# Intercom Protocol

## Message Types

8 message types. Minimal JSON. Fire and forget. Fallback: ctx_search.

| Type | Direction | Payload | When |
|------|-----------|---------|------|
| `leaf:done` | branch→branch, branch→root | `{ from, type, leaf, status }` | Leaf completes, unblocks dependents |
| `branch:blocked` | branch→root | `{ from, type, reason, blocked_leaves }` | All leaves blocked |
| `decision:cross-branch` | branch→branch | `{ from, type, id, summary, affected_leaves }` | Decision impacts other branches |
| `escalate` | branch→root | `{ from, type, reason, options }` | Cannot decide locally |
| `new:leaf` | root→branch | `{ from, type, leaf, source }` | Triage routes incoming work |
| `leaf:pr` | root→branch | `{ from, type, leaf, pr }` | GitHub PR linked to existing leaf |
| `flag:drift` | branch→root | `{ from, type, metric, planned, actual, reason }` | ETA or budget >20% off |
| `flag:inter-branch` | branch→root | `{ from, type, decision_id, affected_branches, severity }` | Cross-branch decision recorded |

## Tier 1: Pull (default, silent)

Every agent before pulling a leaf:
```
ctx_search("recent decisions <domain>")
→ new decision? adjust leaf → proceed
→ no new? proceed
```

No broadcasts. `## decisions` log + context_mode index = shared memory.

## Tier 2: Targeted Push

Branch agent makes inter-branch decision:

1. Log to `## decisions` + ctx_index
2. Build reverse index from `[needs:]` in .mindmap.md
3. Push `decision:cross-branch` ONLY to affected branches
4. Affected branch: receives → ctx_search(id) for full context → patches leaves

Reverse index: parse .mindmap.md for all `[needs: <path>]` → build `Map<leafPath, Set<branchName>>`. On leaf:done → lookup → push to set.

## Tier 3: Escalation

```
Leaf worker blocked
  → branch agent: can decide? → decide + Tier-2 push
  → cannot? → escalate to Root Orchestrator
    → Root: can decide? → decide + push to affected
    → cannot? → flag root map: [🔴 ESCALATED: ...]
      → human /mindmap-review → decide → Root broadcasts down
```

Stops at first level that can decide.

## Routing Algorithm (Reverse Index)

```
on branch agent startup:
  for each leaf in subtree:
    if leaf has [needs: <path>]:
      reverseIndex.add(<path>, <currentBranch>)

on leaf:done or decision:cross-branch:
  affected = reverseIndex.get(<leafPath>)
  for each branch in affected:
    intercom(branch, { type: "decision:cross-branch", ... })
```

Fallback if target unreachable: ctx_search("needs <leaf-path>") — pull instead of push.
