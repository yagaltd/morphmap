---
name: morphmap-expand
description: Restore a collapsed branch from .morphmap/brainstorm/<slug>.md back into the map.
user-invocable: true
argument-hint: "<branch-name or path to brainstorm doc>"
---

# MorphMap Expand

Restore a collapsed/deferred branch from `.morphmap/brainstorm/` back into the mindmap.
Reverses `/morphmap-collapse`.

## Phase 1: READ BRAINSTORM DOC

Read `.morphmap/brainstorm/<slug>.md`. Extract the branch heading + full subtree content.

## Phase 2: RESTORE TO MAP

Replace the one-line summary in the mindmap with the full branch content.
Change status from 💤 to ⬜ (pending — ready for re-evaluation).

```markdown
Before: ## auth-exploration 💤 [research] → .morphmap/brainstorm/auth-exploration.md
          (3 leaves collapsed — OAuth evaluation deferred)

After:  ## auth-exploration ⬜ [research]
        - ⬜ JWT vs OAuth comparison
        - ⬜ session storage options
        - ⬜ prototype OAuth flow
```

## Phase 3: LOG + COMMIT

Add to `## decisions`:
```markdown
- [expand] <branch-name> restored from .morphmap/brainstorm/<slug>.md
```

```bash
jj commit -m "expand: <branch-name> restored from brainstorm"
```

## Rules

- Restored branches start as ⬜ (pending) — re-evaluate before executing
- The brainstorm doc remains in `.morphmap/brainstorm/` (immutable record)
- If the branch was collapsed for >30 days, suggest a fresh grill session first
