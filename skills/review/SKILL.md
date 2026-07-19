---
name: morphmap-review
description: Triage blockers, review status, flag decisions for human. Fresh subagent, no context pollution.
user-invocable: true
argument-hint: "[branch name, or empty for full review]"
---

# MorphMap Review

Fresh subagent walks the tree, flags issues, reports to human.

## Phase 1: READ MAP

Read morphmap.mindmap.md. If branch specified, read only that subtree.

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

- Fresh subagent, not the root agent. Avoid context pollution.
- Read only branch headers. Don't read leaf details unless triaging a specific blocker.
- Present options, not decisions. Human decides.
