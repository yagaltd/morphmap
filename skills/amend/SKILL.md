---
name: morphmap-amend
description: Intake from human. Classify addition against branch scope using 3-tier forced choice, route to branch-agent or flag for human. Link PRs when present.
user-invocable: true
argument-hint: "<addition description, or issue/PR reference>"
---

# MorphMap Amend — Human Intake

Classify and route human additions to the right branch agent.

## Phase 1: PARSE ADDITION

Extract from the user's addition:
- **Keywords**: nouns, verbs, domain terms from the addition text
- **PR/Issue references**: GitHub URLs (github.com/*/pull/*, github.com/*/issues/*), `#NNN` shorthand, or `owner/repo#NNN`
- **Estimated scope**: single file, multi-file, new module, cross-cutting

If PR/issue reference found → extract PR number, repo, title. Include in routing context.

## Phase 2: CLASSIFY

Read `.morphmap/morphmap.mindmap.md`. Extract all `##` and `###` heading scope declarations
tagged `[module]` or `[feature]`. Parse scope keywords from each heading's scope line.

Compare the addition's keywords against each branch's scope keywords.

Forced 3-tier classification (no middle ground):

| Tier | Meaning | Action |
|------|---------|--------|
| **exact match** | Addition keywords overlap ≥50% with this branch's scope keywords | Route to branch-agent with `match: exact`. Branch-agent adds leaf directly. |
| **partial match** | Addition keywords overlap <50% but >0% with this branch's scope | Route to branch-agent with `match: partial`. Branch-agent reviews fit before adding. |
| **no match** | Addition keywords overlap 0% with ALL branches | Flag for human: "No matching branch. Nearest candidate: <branch> (overlap: <N> keywords). Create new branch or expand scope?" |

No confidence scores. No "maybe." Force a decision.

**PR linkage rule:** If the addition references a GitHub PR/issue:
- Include PR URL in the routing context sent to the branch-agent
- Branch-agent links the new leaf to the PR in the mindmap: `→ [PR #NNN](url)`
- Log PR linkage in `## decisions`

**Tie-breaking (multiple partial matches):**
- Prefer the branch with the most keyword overlap
- If tied, prefer the branch with fewer existing leaves (spread work)
- If still tied, pick the first match in tree order

## Phase 3: ROUTE

Route the addition via intercom to the target branch-agent:

```
intercom({
  action: "ask",
  to: "<branch-agent-session>",
  message: "morphmap-amend: new leaf. Match: <exact|partial>.
    Addition: <human's text>.
    Keywords: <extracted keywords>.
    PR: <URL or none>.
    Estimated scope: <single|multi|module|cross-cutting>.
    Context from orchestrator: phase=<X>, compat=<Y>, scope=<Z>,
    quality=<W>, budget=<V>.
    Action: <add leaf directly | review fit before adding>.
    Confirm when done."
})
```

If no branch-agent session is active for the target branch:
- Spawn a new branch-agent via `subagent()` for that branch
- Or queue the addition in `.morphmap/amend-queue.json` for next delegate

If no match:
- Report the classification result to the human with the nearest candidate
- Ask: "Create new branch? Expand scope of <nearest>? Or discard?"

## Phase 4: LOG

Log routing decision to `## decisions` in `.morphmap/morphmap.mindmap.md`:

```
- <today>: [amend] routed "<addition summary>" → <branch> · match: <exact|partial|no-match> · PR: <url or none> · outcome: <routed|flagged|queued>
```

Update the mindmap to add the new leaf if branch-agent confirms, or mark as pending.

## Phase 5: UPDATE MAP

If branch-agent confirms leaf added:
- Add the leaf to the appropriate branch in `.morphmap/morphmap.mindmap.md`
- Run `npx markmap-cli .morphmap/morphmap.mindmap.md -o .morphmap/morphmap.mindmap.html --no-open`
- Commit: `git add -A && git commit -m "amend: <addition summary> → <branch>"`

## Rules

- Log all routing decisions to `## decisions`
- Branch-agent creates the leaf — you route, classify, and update map
- If human asks to restructure tree (new branch, merge, split) → delegate to `morphmap-plan`
- Always pass current posture (phase, compat, scope, quality, budget) in routing context
- PR linkage is mandatory when a PR reference is detected — do not silently drop it
