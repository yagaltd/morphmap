---
type: specification
topic: execution-flow
timestamp: 2026-07-19
tags: [execution, push-pull, theory-of-constraints, KPI, WORKER_BLOCKER]
---

# Execution Flow

## Push/Pull System

```
PUSH (planning — human directive down the tree)
  Directive → Root Orchestrator → scout → decompose → propose tree → human approves
  Tree is the work order. Push stops when tree complete.

PULL (execution — agents pull leaves up from the tree)
  Branch agent pulls ⬜ leaf → executes → ✅ → signals completion
  Downstream leaf unblocked → next agent pulls
```

## Theory of Constraints Applied

| Step | Action | Mindmap equivalent |
|------|--------|-------------------|
| Identify constraint | Find the bottleneck | 🔴/🟡 leaf gating most downstream work |
| Exploit | Maximize constraint throughput | Pull risky leaves FIRST, never idle |
| Subordinate | Don't overproduce non-constraint | ⚪ leaves WAIT until risky pass |
| Elevate | Add capacity to constraint | Strongest model, prototype, escalate to human |
| Repeat | After constraint broken, find next | After risky ✅, next constraint emerges |

**Drum** = risk-priority pull order.
**Buffer** = scout/research runs ahead of risky build.
**Rope** = branch agent only pulls when dependencies met.

## Pull Order (Risk Priority)

```
1. 🔴 BLOCKING (detonate early if they fail — gates everything)
2. 🟡 RISKY (prototype → decide → build or pivot)
3. 🔵 TIME_CONSUMING (start early, let them run)
4. ⚪ STANDARD (safe, pull after risky pass)
```

## Branch Agent Loop

```
1. Pull next eligible leaf (⬜, [needs:] all ✅, risk-priority sorted)
2. ctx_search("recent decisions <leaf domain>")
3. If new decisions → adjust leaf/spec
4. If no .spec → write one (Intent, Decisions, Boundaries, Completion Criteria)
5. Assign model/reasoning/tools per bottleneck tag
6. Spawn leaf worker: subagent({ agent: "worker", model, thinking, task })
7. On WORKER_BLOCKER:
   a. Resolvable? → update spec/tree → retry (go to 6)
   b. Cross-cutting? → escalate to Root Orchestrator (Tier 3)
8. On leaf ✅:
   a. Update .mindmap.md (status, cost, duration)
   b. intercom leaf:done (to branches with [needs:] on this leaf)
   c. ctx_index decision if applicable
9. If leaf result impacts other branches → Tier-2 push
10. Repeat until branch done or all remaining leaves blocked
```

## KPI Computation Rules

| Level | Status | Budget | ETA | Flags |
|-------|--------|--------|-----|-------|
| **Leaf** | ⬜🔄✅❌🔴 | Task cost | Task estimate | `[needs: path]` |
| **Sub-sub-branch** | Worst of leaves | Sum | Latest +20% | Inherited + own |
| **Sub-branch** | Worst of children | Sum | Latest +20% | Inherited + own |
| **Branch** | Worst of children | Sum | Latest +20% | All children + intercom received |
| **Root** | Worst of branches | Total | Latest branch | Aggregated |

Rollup rule: one ❌ → parent ❌. One 🔴 → parent 🔴 if no other ⬜ to work on.
Drift >20% on budget or ETA → `flag:drift` → root map updated.

## WORKER_BLOCKER Protocol

```
WORKER_BLOCKER:
{
  "status": "blocked",
  "reason": "invalid_contract | missing_dependency | unclear_requirement | too_large | cross_cutting",
  "evidence": "<file paths, error messages, conflicting code>",
  "requestedAction": "<what branch agent should do to unblock>"
}
```

**Reasons:**

| Reason | Meaning | Branch agent action |
|--------|---------|-------------------|
| `invalid_contract` | .spec wrong or contradictory | Rewrite spec, retry |
| `missing_dependency` | Tool/service/secret not available | Escalate to human |
| `unclear_requirement` | Task ambiguous, multiple interpretations | Clarify, update spec |
| `too_large` | Leaf should be sub-branch (>5 concerns) | Restructure tree, create sub-branch |
| `cross_cutting` | Decision impacts other branches | Escalate to Root Orchestrator |

## Quality Loop

```
Leaf worker: agent-spec lifecycle → guard → project checks
  ↓
Reviewer agent: mechanical verification (3-layer gate)
  ↓
Quality reviewer: judgment (P0-P3 rubric)
  ↓
Bug hunter: adversarial scan (optional, on code changes)
  ↓
Branch agent: integration test (do leaves work together?)
  ↓
Root agent: end-to-end smoke (full assembly)
```

Manufacturing analogy:
- agent-spec lifecycle = jig (guarantees correct position)
- agent-spec guard = CNC self-check (trusted output)
- Branch integration test = sub-assembly fit check
- No batch QC sampling — every leaf verified at process level

## Cross-Branch Dependencies

Declared at leaf level:
```
- ⬜ login form → specs/auth/ui-login.spec [needs: auth/jwt-middleware ✅]
```

Branch agent skips blocked leaves. When dependency completes → intercom `leaf:done` → downstream unblocks.
If ALL leaves blocked → `branch:blocked` → root map flagged.

## Tree Evolution (Living Map)

The tree is not static. Branch agents restructure as work reveals complexity:
- Leaf too large (clarity found → should be sub-branch) → restructure
- Sub-branch too deep (>4 levels) → flatten or promote
- New concern discovered during scout → add sub-branch
- Concern proven trivial → collapse to leaves

All restructures logged to `## decisions` + intercom if impacts other branches.
