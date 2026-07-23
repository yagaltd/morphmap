spec: task
name: "morphmap-amend"
inherits: project
tags: [commands, amend, e2e]
---

## Intent

E2e test the `/morphmap-amend` command. The skill classifies human additions against branch scope declarations in the mindmap using a forced 4-tier classification (very good / good / bad / very bad), routes to the appropriate branch agent via intercom, and logs decisions to `## decisions`. Verify the classification logic works end-to-end with sample inputs.

## Decisions

- Classification reads `##` branch scope declarations from `.morphmap/morphmap.mindmap.md`
- 4-tier forced choice: very good → auto-route, good → route+validate, bad → flag human, very bad → flag human+new branch
- Routing uses `intercom({ action: "send", to: "branch-agent", message: ... })`
- All routing decisions logged to `## decisions` with confidence tier
- Posture passed to branch agents: phase, compat, scope, quality, budget

## Boundaries

### Allowed Changes
- `skills/amend/SKILL.md` (fix if classification logic is incomplete)
- `prompts/morphmap-amend.md` (update if needed)
- `.morphmap/specs/commands/morphmap-amend.spec.md` (this file)

### Forbidden
- Do NOT modify other skill files
- Do NOT modify the mindmap
- Do NOT modify agent definitions

## Completion Criteria

Scenario: Classify addition matching a branch scope
  Test:
    Package: morphmap-amend
    Filter: classify_match
  Given an addition that clearly matches a branch's scope keywords
  When amend classifies it
  Then classification is "very good" and routed to that branch agent

Scenario: Classify addition with no clear match
  Test:
    Package: morphmap-amend
    Filter: classify_no_match
  Given an addition that doesn't match any branch scope
  When amend classifies it
  Then classification is "very bad" and flagged for human

Scenario: Classify addition with partial match
  Test:
    Package: morphmap-amend
    Filter: classify_partial
  Given an addition that partially matches a branch scope
  When amend classifies it
  Then classification is "good" and routed with validation note

Scenario: Classification is 4-tier forced choice
  Test:
    Package: morphmap-amend
    Filter: forced_choice
  Given any addition input
  When amend classifies it
  Then output is exactly one of: very good, good, bad, very bad (no confidence numbers)

Scenario: Routing decision logged to decisions
  Test:
    Package: morphmap-amend
    Filter: log_decision
  Given an addition is classified and routed
  When the decision is made
  Then it is logged to `## decisions` with timestamp and confidence tier

## Out of Scope

- Implementing new classification algorithms beyond the 4-tier forced choice
- Modifying the intercom protocol
