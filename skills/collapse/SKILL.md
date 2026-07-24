---
name: morphmap-collapse
description: Collapse a brainstorm/research branch into a linked document. Moves detail to .morphmap/brainstorm/<slug>.md, keeps one-line summary + 💤 status in map. Reversible via /morphmap-expand.
user-invocable: true
argument-hint: "<branch-name>"
---

# MorphMap Collapse

Set aside a brainstorm, research, or deferred branch without losing the work.
Moves full detail to a linked document, keeps a one-line summary in the map.

## When to use

- Branch is `[research]` or `[brainstorm]` and paused
- Branch has unresolved grill questions (waiting on human)
- Branch is deferred pending another dependency
- Branch is exploratory and the team wants to keep the thinking but hide the detail

## Phase 1: EXTRACT

Read the branch heading + its entire subtree from the mindmap (includes `###` sub-branches, `-` leaves, inline notes).

## Phase 2: WRITE DOCUMENT

```bash
mkdir -p .morphmap/brainstorm
```

Write `.morphmap/brainstorm/<slug>.md` with OKF frontmatter:

```markdown
---
type: brainstorm
branch: <branch-name>
status: sleeping
collapsed: <ISO-8601>
tags: [<branch-tags>]
---

# <branch-name> (collapsed)

<full branch content — all leaves, sub-branches, notes, grill questions>

## Recovery

To restore this branch to the map: `/morphmap-expand <branch-name>`
```

## Phase 3: REPLACE IN MAP

In the mindmap, replace the entire branch subtree with:

```markdown
## <branch-name> 💤 [research] → .morphmap/brainstorm/<slug>.md
  (<N> leaves collapsed — <one-line summary of what was deferred>)
```

## Phase 4: LOG + COMMIT

Add to `## decisions`:
```markdown
- [collapse] <branch-name> → .morphmap/brainstorm/<slug>.md · <N> leaves set aside
```

```bash
jj commit -m "collapse: <branch-name> → .morphmap/brainstorm/<slug>.md"
```

## Rules

- Never collapse branches with 🔴 blocked leaves — resolve or abandon those first
- Never collapse branches with 🔄 in_progress work — wait for completion
- 💤 = sleeping, not dead. Can be restored via `/morphmap-expand`
- Brainstorm documents are kept forever (jj history)
