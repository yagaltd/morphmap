spec: task
name: "morphmap-amend"
inherits: project
tags: [morphmap, amend, intake]
---

## Intent

Implement the /morphmap-amend command. Classifies user additions against branch scope using 4-tier forced choice, routes to branch-agent or flags for human. Adds new leaves/branches to the mindmap.

## Decisions

- 4-tier classification: exact match → branch-agent, partial match → branch-agent (needs review), no match → human
- Scope matching: keywords in addition vs branch scope keywords
- PR linkage: if addition references a GitHub PR, link to it

## Boundaries

### Allowed Changes
- Create: skills/amend/SKILL.md (if not exists)
- Create: prompts/morphmap-amend.md (if not exists)
- Edit: .morphmap/morphmap.mindmap.md (add new leaves/branches)

### Forbidden
- Do NOT modify agent system prompts
- Do NOT modify other skills

## Completion Criteria

Scenario: Exact match routes to branch-agent
  Test:
    Package: morphmap-amend
    Filter: exact_match
  Given a user addition that exactly matches a branch scope
  When /morphmap-amend is executed
  Then it routes to the branch-agent for that branch

Scenario: No match flags for human
  Test:
    Package: morphmap-amend
    Filter: no_match
  Given a user addition that doesn't match any branch scope
  When /morphmap-amend is executed
  Then it flags for human review

## Out of Scope

- Automated PR creation
- Cross-repo additions
