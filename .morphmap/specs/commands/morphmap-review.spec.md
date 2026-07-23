spec: task
name: "morphmap-review"
inherits: project
tags: [commands, review, e2e]
---

## Intent

E2e test the `/morphmap-review` command. The skill spawns a reviewer subagent to walk the mindmap tree, flag 🔴 blocked leaves, 🟡 attention items, ✅ done items, and produce next actions. The review report must use OKF frontmatter (`type`, `timestamp`, `tags`, `status`, `version`). Fix the OKF output format so the report is machine-parseable.

## Decisions

- Review report uses OKF frontmatter: `type=handoff`, `status=raw`, `version=1.0`, `timestamp=YYYY-MM-DD`, `tags=[review, commands]`
- Report sections: 🔴 Blocked, 🟡 Attention, ✅ Done Since Last Review, Next
- Reviewer spawned via `pi-subagents` with fresh context (no context pollution)
- Report written to `.morphmap/quality-review-commands-YYYYMMDD-review.md`

## Boundaries

### Allowed Changes
- `skills/review/SKILL.md` (fix OKF frontmatter in report template)
- `prompts/morphmap-review.md` (update if needed)
- `.morphmap/quality-review-commands-20260723-review.md` (e2e test output)

### Forbidden
- Do NOT modify other skill files
- Do NOT modify the mindmap
- Do NOT modify agent definitions in `.pi/agents/`

## Completion Criteria

Scenario: Review report has OKF frontmatter
  Test:
    Package: morphmap-review
    Filter: okf_frontmatter
  Given the review skill is invoked on the current project
  When a review report is generated
  Then the report starts with OKF frontmatter containing type, timestamp, tags, status, version

Scenario: Review flags blocked leaves
  Test:
    Package: morphmap-review
    Filter: blocked_leaves
  Given the mindmap has 🔴 blocked leaves (e.g. production phase)
  When review runs
  Then blocked leaves are listed with reason and action

Scenario: Review flags attention items
  Test:
    Package: morphmap-review
    Filter: attention_items
  Given the mindmap has 🔄 in-progress leaves
  When review runs
  Then attention items are listed with ETA/budget drift

Scenario: Review summarizes done items
  Test:
    Package: morphmap-review
    Filter: done_summary
  Given the mindmap has ✅ done leaves
  When review runs
  Then done items are summarized with cost and time

Scenario: Review produces next actions
  Test:
    Package: morphmap-review
    Filter: next_actions
  Given a review is complete
  When the report is generated
  Then next actions (/morphmap-delegate, /morphmap-amend) are listed

## Out of Scope

- Modifying the reviewer agent itself
- Adding new review categories beyond the 4 sections
