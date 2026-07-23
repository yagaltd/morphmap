spec: task
name: "morphmap-status"
inherits: project
tags: [morphmap, status, summary]
---

## Intent

Implement the /morphmap-status command. Reads .morphmap/morphmap.mindmap.md branch headers and produces a text summary of project status: branches done/pending/blocked, leaf counts, ETA, budget.

## Decisions

- Parse branch headers: `## <name> <emoji> [tag] — scope: ... · <n>/<m> leaves`
- Count: ✅ done, ⬜ pending, 🔄 in-progress, 🔴 blocked
- Output: console table + summary line

## Boundaries

### Allowed Changes
- Create: skills/status/SKILL.md (if not exists)
- Create: prompts/morphmap-status.md (if not exists)

### Forbidden
- Do NOT modify the mindmap markdown
- Do NOT modify other skills

## Completion Criteria

Scenario: Status summary produced
  Test:
    Package: morphmap-status
    Filter: summary_produced
  Given a mindmap with branches in various states
  When /morphmap-status is executed
  Then it outputs a summary with branch counts and leaf counts

Scenario: Blocked branches highlighted
  Test:
    Package: morphmap-status
    Filter: blocked_highlighted
  Given the mindmap has 🔴 branches
  When /morphmap-status is executed
  Then the report highlights blocked branches

## Out of Scope

- Real-time status updates
- Integration with external dashboards
