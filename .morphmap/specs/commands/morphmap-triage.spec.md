spec: task
name: "morphmap-triage"
inherits: project
tags: [commands, triage, e2e]
---

## Intent

E2e test the `/morphmap-triage` command. The skill classifies external input (GitHub issues/PRs, email, chat) against branch scope declarations using a forced 4-tier classification, checks PRs for existing leaf references first, auto-routes high-confidence matches, and flags low-confidence for human. Verify the classification and routing logic works end-to-end with sample inputs.

## Decisions

- PR check first: if PR description mentions a leaf path or .spec file → match exact, update leaf status, notify branch agent, no new leaf
- Classification reads `##` branch scope from `.morphmap/morphmap.mindmap.md`
- 4-tier forced choice: very good → auto-route, good → route+validate, bad → flag human, very bad → flag human+new domain
- Routing uses `intercom({ action: "send", to: "branch-agent", message: { type: "new:leaf", ... } })`
- All routing decisions logged to `## decisions` with confidence tier
- Can run on CRON via pi scheduled subagent

## Boundaries

### Allowed Changes
- `skills/triage/SKILL.md` (fix if classification logic is incomplete)
- `prompts/morphmap-triage.md` (update if needed)
- `.morphmap/specs/commands/morphmap-triage.spec.md` (this file)

### Forbidden
- Do NOT modify other skill files
- Do NOT modify the mindmap
- Do NOT modify agent definitions

## Completion Criteria

Scenario: PR with existing leaf reference updates status
  Test:
    Package: morphmap-triage
    Filter: pr_leaf_ref
  Given a PR description mentioning a leaf path or .spec file
  When triage processes it
  Then leaf status is updated, branch agent notified via intercom, no new leaf created

Scenario: GitHub issue matching branch scope
  Test:
    Package: morphmap-triage
    Filter: issue_match
  Given a GitHub issue that clearly matches a branch's scope keywords
  When triage classifies it
  Then classification is "very good" and auto-routed to that branch agent

Scenario: GitHub issue with no match
  Test:
    Package: morphmap-triage
    Filter: issue_no_match
  Given a GitHub issue that doesn't match any branch scope
  When triage classifies it
  Then classification is "very bad" and flagged for human

Scenario: Classification is 4-tier forced choice
  Test:
    Package: morphmap-triage
    Filter: forced_choice
  Given any external input
  When triage classifies it
  Then output is exactly one of: very good, good, bad, very bad (no confidence numbers)

Scenario: Routing decision logged to decisions
  Test:
    Package: morphmap-triage
    Filter: log_decision
  Given an input is classified and routed
  When the decision is made
  Then it is logged to `## decisions` with timestamp and confidence tier

## Out of Scope

- Implementing GitHub API integration (uses bash+curl per available tools)
- Modifying the intercom protocol
