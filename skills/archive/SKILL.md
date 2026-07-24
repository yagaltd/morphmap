---
name: morphmap-archive
description: Archive completed branches to keep the main map lean. Extracts ✅ branches to archive files, replaces with summary links.
user-invocable: true
argument-hint: "[branch name | --all | --level ##]"
---

# MorphMap Archive

Extract completed branches to archive files, preserving full detail while keeping the main map lean.

## Phase 1: SELECT BRANCHES

Read `.morphmap/morphmap.mindmap.md`. Find branches to archive:

- If branch name given: archive that specific branch (must be ✅)
- If `--all`: archive ALL `##` branches marked ✅
- If `--level ###`: archive at sub-branch level
- Default: prompt for selection

## Phase 2: EXTRACT + SUMMARIZE

For each branch to archive:

```bash
mkdir -p .morphmap/archive
```

1. Extract the branch subtree (from `## branch-name` to next `##` heading)
2. Count leaves (total + ✅ + ⬜)
3. Extract cost from `[telemetry]` entries in decisions
4. Extract key decisions (ADRs referenced)
5. Extract test status
6. Collect scope from branch declarations

Create archive file: `.morphmap/archive/<YYYY-MM-DD>-<slug>.md`

```markdown
---
type: archive
source: morphmap.mindmap.md
archived: <today>
branch: <branch-name>
leaves: <N total, M ✅>
cost: $<amount>
tests: <pass>/<total>
---

# <Project> — <Branch Name> (Archived)

<original branch subtree, preserved exactly>
```

## Phase 3: REPLACE WITH SUMMARY

Replace the branch in the main map with:

```markdown
## <branch-name> ✅ [archived: archive/<date>-<slug>.md]
   Scope: <scope declarations>
   <N> branches, <M> leaves · cost <$amount> · <pass>/<total> tests pass
   Key decisions: <ADR references>
```

If the branch had a `scope:` line (from brownfield), merge it into the summary.

## Phase 4: INDEX

```bash
# Index archive for cross-project search
ctx_index(path: ".morphmap/archive/<file>.md", source: "archive/<slug>")
```

Update `## context` to reference the archive:
```markdown
- security-audit archived → .morphmap/archive/2026-07-21-security-audit.md
```

## Phase 5: COMMIT

```bash
jj commit -m "archive: moved <branch-name> to .morphmap/archive/"
```

## Rules

- Never archive branches with ⬜ or 🔄 status — only ✅
- Never archive `## context`, `## decisions`, `## releases`, `## skills` — these are living documents
- Archive preserves the FULL original subtree — no detail lost
- Summary in main map is searchable via ctx_search
- Archive files are markmap-compatible (can be opened directly)
- One archive per branch — if re-archiving same area, supersede old archive with `supersedes:` in frontmatter
- Git IS the history — archives are committed, not deleted
