---
name: morphmap-triage
description: Classify external input (GitHub issues/PRs, email, chat) against branch scope. Auto-route high-confidence matches, flag low-confidence for human.
user-invocable: true
argument-hint: "[source: github, email, chat, or auto-detect] [--repo owner/name] [--label <filter>]"
---

# MorphMap Triage — External Intake

Classify and route external work to branches. GitHub-first for v1.

## Phase 0: DETECT SOURCE

If argument is a URL (starts with `https://github.com/`):
→ Parse `owner/repo/issues/N` or `owner/repo/pull/N`
→ Source: github, single issue/PR

If argument is `github` or `--repo` is passed:
→ Fetch open issues/PRs from repo via `gh` CLI
→ Source: github, batch

If argument is free text or `--input`:
→ Classify directly as human/email/chat input
→ Source: text

## Phase 1: FETCH INPUT

### GitHub — single issue

```bash
gh issue view <issue-number> --repo <owner/repo> --json number,title,body,labels,state
```

### GitHub — single PR

```bash
gh pr view <pr-number> --repo <owner/repo> --json number,title,body,labels,state
```

### GitHub — batch (open issues)

```bash
gh issue list --repo <owner/repo> --state open --limit 50 --json number,title,body,labels
```

### GitHub — batch (open PRs)

```bash
gh pr list --repo <owner/repo> --state open --limit 50 --json number,title,body,labels
```

### Text / email / chat

Use the input directly as `title` + `body`. If no body, body is empty.

## Phase 2: PARSE SCOPE DECLARATIONS

Read `.morphmap/morphmap.mindmap.md`. Extract all `##` branch headings with `— scope:`:

```bash
grep -n '^## .* — scope:' .morphmap/morphmap.mindmap.md
```

Parse each line into:
- `branchName`: the heading text after `## ` and before the first emoji/status marker
- `scopeKeywords`: comma-separated list after `scope:`
- `branchStatus`: emoji status marker (✅, 🔄, ⬜, 🔴)

Skip branches tagged `[log]` and `[phase]` — these are human-managed, cannot receive routed work.

## Phase 3: PR EXACT MATCH CHECK FIRST

If input is a PR and its title or body mentions a leaf path or `.spec` file path that exists in the map:
→ **Exact match**. Update the leaf status to `🔄` in the map.
→ Notify branch agent via intercom:
```
intercom({ action: "send", to: "<branch-agent-session>", message: "PR #<N> linked to leaf '<leaf-name>' in branch '<branch>'. Source: GitHub PR #<N>." })
```
→ Log to decisions. Done. No new leaf created.

## Phase 4: CLASSIFY (4-Tier Forced Choice)

For each issue/PR/text input, compare `title + body` keywords against every branch's `scopeKeywords`.

| Tier | Meaning | Action |
|------|---------|--------|
| **very good** | Input clearly matches this branch's scope | Auto-route to branch agent. Log: tier=very-good |
| **good** | Input likely matches | Route to branch agent with note: "validate match". Branch agent confirms or rejects |
| **bad** | Input unlikely to match | Flag for human: "Best candidate: <branch>. Route or create new branch?" |
| **very bad** | Input outside all scopes | Flag for human: "New domain. No matching branch." |

**Keyword matching rules:**
- Direct word match: `login` in input → `login` in scope → strong signal
- Substring match: `auth` in input → `authentication` in scope → moderate signal
- Semantic adjacency: `sign in` in input → `login, authentication` in scope → weak signal (use only if no direct/substring matches found)
- File path match: `src/auth/login.ts` in input → `src/auth/` in scope → strong signal

No confidence numbers. No 0.5 middle ground. Force a decision.

## Phase 5: ROUTE OR FLAG

### very good → auto-route

Notify the matching branch's agent via intercom:
```
intercom({ action: "send", to: "<branch-agent-session>", message: "new:leaf from triage. Input: <title>. Source: GitHub #<N>. Tier: very-good. Matched scope: <scope-keywords>. Create leaf under <branch>." })
```

If branch agent is not currently running, create the leaf directly in the map under the branch:
```
- ⬜ <issue-title> [source: GitHub #<N>] [triage: very-good]
```

### good → route with validation

Same as auto-route but include validation note:
```
intercom({ action: "send", to: "<branch-agent-session>", message: "new:leaf from triage (validate match). Input: <title>. Source: GitHub #<N>. Tier: good. Please confirm this matches <branch> scope. Reject if not." })
```

### bad / very bad → flag for human

Write a decision log entry. Do not route. Do not create leaves.

If `bad`: list best candidate branch and why it's a weak match.
If `very bad`: suggest creating a new branch or expanding an existing scope.

## Phase 6: LOG

All routing decisions to `## decisions`:

```markdown
- <timestamp>: [triage] routed GitHub #<N> "<title>" → <branch> [very-good] · keywords matched: <list>
- <timestamp>: [triage] routed GitHub #<N> "<title>" → <branch> [good, validation pending] · keywords matched: <list>
- <timestamp>: [triage] GitHub #<N> "<title>" — no match, flagged for human [best: <branch>, bad] · keywords: <list>
- <timestamp>: [triage] PR #<N> exact-matched leaf "<leaf>" in <branch> · status updated
```

## Phase 7: REPORT

Summary of all triaged items:

```
## Triage Report
- Processed: <N> items
- Auto-routed (very-good): <count>
- Routed (good): <count>
- Flagged for human (bad): <count>
- Flagged for human (very-bad): <count>
- Exact PR matches: <count>
```

## Rules

- Pass current posture (`phase`, `compat`, `scope`, `quality`, `budget`) to branch agents
- Branch agent creates the leaf — you only route
- Log everything. Audit trail matters.
- Can run on CRON via pi scheduled subagent
- `gh` CLI must be authenticated: `gh auth status` before fetching
- If `gh` auth fails → flag all items for human with note: "gh auth required"
- v1 is GitHub-only. Email/chat are text classification only (no API integration)
