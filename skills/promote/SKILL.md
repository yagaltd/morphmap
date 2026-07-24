---
name: morphmap-promote
description: Promote a brainstorm/research branch to a production module. Reads .morphmap/brainstorm/<slug>.md, creates active branch in map with leaves and .spec paths.
user-invocable: true
argument-hint: "<brainstorm-branch-name>"
---

# MorphMap Promote

Promote a brainstorm or research branch from `.morphmap/brainstorm/` to an active `[module]` branch in the mindmap. The brainstorm doc becomes an immutable record of the exploration.

## When to use

- Brainstorm branch has been griller + hats-evaluated + human-approved
- The team is ready to commit resources to implementing it
- The research is conclusive enough to write `.spec` files

## Phase 1: READ BRAINSTORM DOC

Read `.morphmap/brainstorm/<slug>.md`. Extract:
- Branch name + scope
- Leaf list (the specific items being brainstormed)
- Grill questions (what was unresolved)
- Hats session outcome (if any — `.morphmap/hats-*.md`)
- Any partial `.spec` references

## Phase 2: RESOLVE AMBIGUITIES

Check if grill-questions.json has unresolved `material` severity questions.
If yes → BLOCK. Run `/morphmap-grill` first, resolve with human, then retry.

## Phase 3: BUILD ACTIVE BRANCH

Create a new `##` branch in the mindmap:

```markdown
## <branch-name> ⬜ [module] — scope: <from brainstorm doc>
- ⬜ <leaf-1> → .morphmap/specs/<branch>/<leaf-1>.spec.md
- ⬜ <leaf-2> → .morphmap/specs/<branch>/<leaf-2>.spec.md
  [needs: <dependency-branch>/<dependency-leaf>]
```

If the brainstorm had a hats session, include the hats reference:
```markdown
  → hats: .morphmap/hats-eval-<date>.md
```

## Phase 4: MARK BRAINSTORM AS PROMOTED

Update the brainstorm doc frontmatter:
```yaml
promoted: <ISO-8601>
promoted_to: <new-branch-name>
```

The summary line in the map becomes:
```markdown
## <branch-name> ✅ → .morphmap/brainstorm/<slug>.md (promoted 2026-07-24)
```

## Phase 5: WRITE .SPEC FILES

For each leaf in the new branch, create a minimal `.spec` file:
```markdown
---
type: spec
branch: <branch-name>
leaf: <leaf-name>
status: draft
created: <ISO-8601>
---

# <leaf-name>

## Intent
<from brainstorm doc — what this leaf should accomplish>

## Acceptance
- [ ] Scenario 1: <from brainstorm>
- [ ] Scenario 2: <from brainstorm>

## Boundaries
- Allowed Changes: <inferred from scope>
- Forbidden Effects: <from grill black-hat risks>
```

## Phase 6: LOG + COMMIT

Add to `## decisions`:
```markdown
- [promote] <branch-name> promoted from brainstorm · N leaves, .spec files created
```

```bash
jj commit -m "promote: <branch-name> from brainstorm → active module"
```

## Rules

- Never promote without human approval (Red Hat check)
- Never promote if material grill questions remain unresolved
- Brainstorm doc is immutable after promotion (git history preserves it)
- Promoted branches start as ⬜ (pending) — branch-agent evaluates before executing
- If the brainstorm was collapsed >30 days ago, re-run hats session first
