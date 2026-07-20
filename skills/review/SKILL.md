---
name: morphmap-review
description: Triage blockers, review status, flag decisions for human. Fresh subagent, no context pollution.
user-invocable: true
argument-hint: "[branch name, or empty for full review]"
---

# MorphMap Review

Fresh subagent walks the tree, flags issues, reports to human.

## Phase 1: READ MAP

Spawn a fresh reviewer subagent to walk the tree (avoids context pollution):

```
subagent({ agent: "reviewer", task: "Read .morphmap/morphmap.mindmap.md. Walk every ## branch. Flag issues.", context: "fresh" })
```

If branch specified, review only that subtree.

## Phase 2: TRIAGE

For each branch:
- 🔴 leaves: what's blocked? Deps unmet? Decision needed?
- 🔴 escalated decisions: what does human need to decide?
- 🔄 leaves: is ETA drifting >20%? Budget over?
- 🟡 inter-branch flags: any cross-branch decisions pending?
- ✅ branches: any integration test results to review?

## Phase 3: REPORT

Compact summary:

```
## MorphMap Review — <date>

### 🔴 Blocked
- <branch>: <leaf> — blocked on <reason>. Action: <what human should do>
- <branch>: <decision> escalated — <options>. Human must choose.

### 🟡 Attention
- <branch>: ETA drift +2d (<reason>)
- <branch>: [🟡 INTER-BRANCH: <decision>, impacts <branches>]

### ✅ Done Since Last Review
- <branch>: <N> leaves completed ($<cost>, <time>)
- <branch>: integration test passed

### Next
- /morphmap-delegate <branch> to resume
- /morphmap-amend <change> to add work
```

## Rules

- Spawn reviewer subagent via pi-subagents. Fresh context, no pollution.
- Read only branch headers. Don't read leaf details unless triaging a specific blocker.
- Present options, not decisions. Human decides.
