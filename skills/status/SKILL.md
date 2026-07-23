---
name: morphmap-status
description: Text summary of project progress — branches, status, ETA, budget, blocker count. Cheap, no render.
user-invocable: true
argument-hint: "[--detail]"
---

# MorphMap Status

Cheap text summary of project progress. Reads branch headers only. No markmap render.

## Phase 1: READ MAP

Read `.morphmap/morphmap.mindmap.md` branch headers only (`##` lines, ~15 lines).

## Phase 2: SUMMARIZE

For each branch:
- Branch name + status emoji (✅ 🔄 ⬜ 🔴)
- Leaf counts: done / pending / blocked

## Phase 3: REPORT

```
## MorphMap Status — <date>

### Branches (<N>)
- ✅ <branch> — <done>/<total> leaves
- 🔄 <branch> — <in-progress>/<total> leaves
- ⬜ <branch> — <pending>/<total> leaves
- 🔴 <branch> — BLOCKED (<count> blockers)

### Summary
- Total branches: <N>
- Done: <N> · Pending: <N> · In progress: <N> · Blocked: <N>
- Blockers: <list of 🔴 leaves>

### Next
- /morphmap-delegate <branch> to resume
- /morphmap-amend <change> to add work
```

## Rules

- Read only branch headers. Don't read leaf details.
- Text only — no HTML render.
- Cheap model (thinking off).
- If `--detail` flag: include leaf-level breakdown.
