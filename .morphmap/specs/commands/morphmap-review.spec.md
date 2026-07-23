spec: task
name: "morphmap-review"
inherits: project
tags: [morphmap, review, triage]
---

## Intent

Implement the /morphmap-review command. Spawns a reviewer subagent to walk the mindmap tree, flag blockers (🔴), identify stale branches, and report status. Output: structured review with blockers, stale items, and recommendations.

## Decisions

- Reviewer agent: morphmap/reviewer (mechanical mode)
- Input: .morphmap/morphmap.mindmap.md (current state)
- Output: console report + optional handoff file
- Blocker detection: 🔴 emoji on leaves, WORKER_BLOCKER in intercom
- Stale detection: 🔄 leaves older than 48h (from git timestamps)

## Boundaries

### Allowed Changes
- Create: skills/review/SKILL.md (if not exists)
- Create: prompts/morphmap-review.md (if not exists)
- Edit: .morphmap/morphmap.mindmap.md (update review status)

### Forbidden
- Do NOT modify agent system prompts
- Do NOT modify the state machine
- Do NOT modify other skills

## Completion Criteria

Scenario: Review command runs
  Test:
    Package: morphmap-review
    Filter: runs_successfully
  Given the mindmap has branches with 🔴 and 🔄 leaves
  When /morphmap-review is executed
  Then it outputs a report with blockers, stale items, and recommendations

Scenario: Blocker detection
  Test:
    Package: morphmap-review
    Filter: detects_blockers
  Given the mindmap has 🔴 leaves
  When /morphmap-review runs
  Then the report lists all 🔴 leaves with their branch paths

Scenario: Stale detection
  Test:
    Package: morphmap-review
    Filter: detects_stale
  Given the mindmap has 🔄 leaves older than 48h
  When /morphmap-review runs
  Then the report flags them as stale

## Out of Scope

- Auto-fixing blockers (human decides)
- Integration with GitHub issues
- Automated re-triggering of stale branches
