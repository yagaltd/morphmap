---
name: morphmap-triage
description: Classify external input (GitHub issues/PRs, email, chat) against branch scope. Auto-route high-confidence matches, flag low-confidence for human.
user-invocable: true
argument-hint: "[source: github, email, chat, or auto-detect]"
---

# MorphMap Triage — External Intake

Classify and route external work to branches.

## Phase 1: READ INPUT

- GitHub issue: read title + body
- GitHub PR: read title + description (check for existing leaf references)
- Email: read subject + body
- Chat: read message text

## Phase 2: PR CHECK FIRST

If PR description mentions a leaf path or .spec file:
→ Match exact. Update leaf status: "- 🔄 <leaf> → PR #<N>"
→ Notify branch agent: intercom { type: "leaf:pr", leaf, pr }
→ Done. No new leaf created.

## Phase 3: CLASSIFY

Extract scope from morphmap.mindmap.md branch headers.
Compare the input against each branch's scope keywords.

Forced 4-tier classification (no middle ground):

| Tier | Meaning | Action |
|------|---------|--------|
| **very good** | Input clearly matches scope | Auto-route to branch agent. Log: confidence=very-good |
| **good** | Input likely matches | Route to branch agent with note: "validate match" |
| **bad** | Input unlikely to match | Flag for human: "Best candidate: <branch>. Route or skip?" |
| **very bad** | Input outside all scopes | Flag for human: "New domain. No matching branch." |

No confidence numbers. No middle. Force a decision.

## Phase 4: ROUTE OR FLAG

very good → auto-route:
```
intercom branch: { type: "new:leaf", leaf: "<summary>", source: "GitHub #<N>" }
```

good → route with validation note.
bad / very bad → flag for human review.

## Phase 5: LOG

All decisions to ## decisions:
```
- <timestamp>: routed GitHub #<N> "<title>" to <branch>/<leaf> [confidence: 0.XX]
- <timestamp>: "<input>" — no match, flagged for human [best: <branch> 0.XX]
```

## Rules

- Pass posture to branch agents
- Branch agent creates the leaf — you only route
- Log everything. Audit trail matters.
- Can run on CRON via pi scheduled subagent
