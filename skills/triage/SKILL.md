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
ctx_search("<input text>") against indexed map.
Confidence score from search result.

## Phase 4: ROUTE OR FLAG

Confidence >0.8 → auto-route:
```
intercom branch: { type: "new:leaf", leaf: "<summary>", source: "GitHub #<N>" }
```

Confidence <0.8 → flag for human:
```
No match for "<input>". Best: <branch> (0.XX). 
Create leaf anyway or skip?
```

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
