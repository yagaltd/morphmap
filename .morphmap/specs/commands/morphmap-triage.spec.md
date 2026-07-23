spec: task
name: "morphmap-triage"
inherits: project
tags: [morphmap, triage, github]
---

## Intent

Implement the /morphmap-triage command. Classifies external input (GitHub issues/PRs, email, chat) against branch scope. Auto-routes high-confidence matches, flags low-confidence for human.

## Decisions

- 4-tier classification: exact → auto-route, high → auto-route, partial → flag, no match → human
- GitHub integration: use gh CLI to fetch issues/PRs
- Scope matching: issue/PR title + body keywords vs branch scope keywords

## Boundaries

### Allowed Changes
- Create: skills/triage/SKILL.md (if not exists)
- Create: prompts/morphmap-triage.md (if not exists)
- Edit: .morphmap/morphmap.mindmap.md (add triage results)

### Forbidden
- Do NOT modify agent system prompts
- Do NOT modify other skills

## Completion Criteria

Scenario: GitHub issue classified and routed
  Test:
    Package: morphmap-triage
    Filter: issue_routed
  Given a GitHub issue matching a branch scope
  When /morphmap-triage is executed
  Then it creates a leaf in the matching branch and notifies the branch-agent

Scenario: Low-confidence flagged for human
  Test:
    Package: morphmap-triage
    Filter: low_confidence
  Given a GitHub issue with partial scope match
  When /morphmap-triage is executed
  Then it flags for human review

## Out of Scope

- Automated issue resolution
- Email/chat integration (GitHub only for v1)
