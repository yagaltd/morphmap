---
name: morphmap-recover
description: Recover from crashed sessions — detect incomplete jj changes, commit or abandon orphaned work.
user-invocable: true
argument-hint: "[--dry-run | --auto]"
---

# MorphMap Recover (jj-native)

Detects and recovers work from crashed delegate sessions. Jj auto-tracks every change — no worktrees, no stash, no uncommitted work to lose. Recovery is: find incomplete changes owned by dead sessions, decide to commit or abandon.

## Phase 0: DETECT ORPHANED CHANGES

Jj changes are colocated. Find changes NOT owned by an active session:

```bash
# List all jj changes with their descriptions
jj log --limit 50

# Check state.db for sessions that are still "running" but have stale timestamps
# The stuck-leaf SQL query finds leaves idle > 30 min
```

Orphaned changes are identified by:
- Change description matches `morphmap:<leaf-id>` or `morphmap:<branch-id>` prefix
- The session that owns the leaf is marked "running" in state.db but ended_at is NULL and started_at is > 30 min ago
- Use `getActiveSessions()` from morphmap-state to find stale sessions

## Phase 1: SCAN EACH ORPHANED CHANGE

For each orphaned change:

```bash
jj diff --summary -r <change-id>
jj log -r <change-id>
```

Classify:
- **Has meaningful changes** → flag for commit (recover the work)
- **Empty or trivial** → flag for abandon (cleanup)
- **Conflicts with main** → flag for human resolution

## Phase 2: REPORT + ASK

```
Orphaned changes found:

┌──────────────────┬───────────────────┬───────────────────┬──────────┐
│ Change ID        │ Description       │ Diff              │ Action   │
├──────────────────┼───────────────────┼───────────────────┼──────────┤
│ ssnqmzkr         │ leaf:auth/jwt     │ src/auth: +120/-4 │ COMMIT   │
│ ypzwnrwp         │ branch:commands   │ skills/: +3 files │ COMMIT   │
│ pompqmkq         │ leaf:status       │ (empty)           │ ABANDON  │
└──────────────────┴───────────────────┴───────────────────┴──────────┘

Commit or abandon orphaned changes? (c)ommit all, (a)bandon all, (p)er change, (q)uit
```

If `--dry-run`: report only, don't modify.
If `--auto`: commit all meaningful changes, abandon empty ones.

## Phase 3: COMMIT OR ABANDON

For each change flagged:

```bash
# Commit: describe the recovered work
jj describe -r <change-id> -m "recover: orphaned <leaf/branch> work from crashed session"
jj rebase -r <change-id> -d main

# Abandon: discard the change (work was uncommitted/trivial)
jj abandon <change-id>
```

No merge needed — jj rebase handles integration. Conflicts are surfaced, not auto-resolved.

## Phase 4: UPDATE STATE.DB

For each recovered leaf:

```bash
# Mark the session as "recovered" in state.db
# Update leaf status from in_progress back to pending (for re-spawn)
```

The branch-agent re-spawns recovered leaves on next delegate run.

## Phase 5: REPORT

```
Recovery complete:
  Committed: N changes (X files, +Y/-Z lines)
  Abandoned: M changes (empty/trivial)
  Conflicts: K (resolve manually with jj resolve)

Next: /morphmap-delegate to continue remaining work
```

## Rules

- Never auto-resolve conflicts. Leave for human.
- Log recovery to `## decisions`: `- <today>: [recover] committed N changes, abandoned M`
- Jj never loses data — abandoned changes are in the obslog. Use `jj obslog` to undo an abandon.
- After recovery, suggest: `/morphmap-delegate` to continue remaining work
