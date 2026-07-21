---
name: morphmap-recover
description: Recover from crashed sessions — detect orphaned worktrees, merge uncommitted work, clean up branches.
user-invocable: true
argument-hint: "[--dry-run | --auto | path to specific worktree]"
---

# MorphMap Recover

Detects and recovers work from crashed delegate sessions.

## Phase 0: DETECT ORPHANS

```bash
git worktree list
git branch --list 'pi-parallel-*'
```

List all worktrees + branches with `pi-parallel-*` prefix.

## Phase 1: SCAN EACH WORKTREE

For each worktree:

```bash
cd <worktree-path>
git status --short
git diff --stat
```

Classify:
- **Has uncommitted changes** → flag for merge
- **Clean (no changes)** → flag for cleanup only
- **Already merged** → flag for cleanup only

## Phase 2: REPORT + ASK

```
Orphaned worktrees found:

┌──────────────────┬───────────────────┬───────────────────┬──────────┐
│ Worktree         │ Branch            │ Uncommitted       │ Action   │
├──────────────────┼───────────────────┼───────────────────┼──────────┤
│ s0-2             │ pi-parallel-...-2 │ index.html +4     │ MERGE    │
│ s0-4             │ pi-parallel-...-4 │ 10 files, +681/-300│ MERGE   │
│ s0-0,1,3,5,6,7   │ pi-parallel-...   │ clean             │ CLEANUP  │
└──────────────────┴───────────────────┴───────────────────┴──────────┘

Merge uncommitted work? (y)es — merge all, (n)o per worktree, (a)bort
```

If `--dry-run`: report only, don't merge.
If `--auto`: merge all without asking.

## Phase 3: MERGE

For each worktree flagged for merge:

```bash
# Commit in worktree
cd <worktree-path>
git add -A
git commit -m "recover: merged orphaned work from crashed session"

# Merge back to main branch
cd <main-repo-path>
branch=$(basename $(git -C <worktree-path> rev-parse --abbrev-ref HEAD))
git merge $branch --no-edit || echo "⚠ Conflict in $branch — resolve manually"
```

## Phase 4: CLEANUP

```bash
# Delete merged branches
for branch in $(git branch --list 'pi-parallel-*'); do
  git branch -D $branch 2>/dev/null
done

# Prune worktrees
git worktree prune
```

## Phase 5: REPORT

```
Recovery complete:
  Merged: N worktrees (X files, +Y/-Z lines)
  Cleaned: M worktrees (no changes)
  Conflicts: K (resolve manually)
```

## Rules

- Never force-push. Never rebase during recovery.
- If conflict, leave it for human — don't auto-resolve.
- Log recovery to `## decisions`: `- <today>: [recover] merged N orphaned worktrees, cleaned M`
- After recovery, suggest: `/morphmap-delegate` to continue remaining work
