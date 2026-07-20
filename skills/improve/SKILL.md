---
name: morphmap-improve
description: PDSA Study loop. Analyze patterns across sessions (decisions, git, WORKER_BLOCKER history). Learn from deviations. Propose concrete improvements. Human approves.
user-invocable: true
argument-hint: "[--since <date> or --branch <name> or empty for full review]"
---

# MorphMap Improve — PDSA Study Loop

Plan → Do → Study → Act.
- Plan: tree (morphmap-plan)
- Do: execution (morphmap-delegate)
- Study: learn from patterns (morphmap-improve) ← THIS
- Act: apply learnings (edit prompts, config, logs)

Driven by data. Human approves.

## Phase 1: GATHER DATA

Read all available evidence. Parallel where possible.

**From git:**
```bash
git log --oneline -50
```
Look for: fix commits (pattern of breakage), revert commits, commits tagged with branch names.

**From decisions log:**
Read `## decisions` in morphmap.mindmap.md.
Parse dated entries. Extract: WORKER_BLOCKER mentions, spec retries, ETA drifts, classification misses, model changes, user corrections.

**From session history:**
Use vcc_recall to search across session compactions:
```
vcc_recall({ query: "WORKER_BLOCKER|blocked|escalated|cannot decide|5-why", scope: "all" })
```
Extract: repeated blocker reasons, patterns in failures.

**From context-mode:**
```
ctx_search("WORKER_BLOCKER|failure|retry|fixed|drift")
```
Cross-reference with indexed decisions.

## Phase 2: STUDY PATTERNS

Don't just list failures. Understand WHY.

For each pattern found, ask:
- Why did this work? (reinforce good)
- Why did this fail? (root cause, not symptom)
- What can we learn from deviations? (plan vs actual)
- Is this a one-off or a systemic issue? (frequency)

| Pattern | Look for | Threshold |
|---------|----------|-----------|
| **Broken specs** | Same leaf fails 3+ times, same WORKER_BLOCKER reason | Flag for spec rewrite |
| **Wrong model** | Leaf took >5min, or high thinking used for simple task | Adjust leafProfiles or bottleneck tag |
| **Misclassification** | Triage/amend routed to wrong branch 3+ times | Expand scope keywords |
| **ETA drift** | Consistently 50%+ over estimate | Adjust planning heuristic |
| **User correction** | Human corrected agent behavior | Update agent prompt to prevent repeat |
| **Orphan decisions** | Decisions with no follow-up | Surface for human |

### Product-level patterns (the thing being built)

| Pattern | Look for | Threshold |
|---------|----------|-----------|
| **Bug hotspots** | Repeated fix commits in same module | Flag for refactor leaf |
| **ETA systemic drift** | Features consistently over estimate | Adjust planning heuristic |
| **Spec divergence** | Implementation differs from .spec | Flag for spec quality review |
| **Code churn** | High churn files from git log | Flag for architecture decision |
| **Test gaps** | Files with high churn but no test changes | Flag for test coverage leaf |

## Phase 3: PROPOSE IMPROVEMENTS

For each pattern found, propose ONE of:

- **Edit agent prompt** — show diff of the change to an agent .md file
- **Re-tag leaf** — suggest different bottleneck tag
- **Expand scope** — suggest adding keywords to a branch scope declaration
- **Update profile** — change leafProfiles in .morphmap/config
- **Rewrite spec template** — improve the .spec contract format
- **Propose refactor** — create leaf for bug hotspot or churn area
- **Adjust ETA** — update planning heuristic for systematically late features

Present as compact table:

```
## Improvement Proposals

### 1. [Severity: high/medium/low] [Type: spec/agent/scope/profile]

**Evidence:**
- <N> occurrences since <date>
- <specific examples>

**Proposed change:**
<diff or description of what to change>

**Affected files:**
- <file path>

Approve? (y)es / (n)o / (m)odify: <description>
```

## Phase 4: APPLY (human-approved only)

For each approved proposal:
1. Apply the change (edit file, update config)
2. Log to `## decisions`:
   ```
   - <today>: [improve] <description of change>. Reason: <evidence summary>.
   ```
3. Git commit with message: `improve: <description>`

For rejected proposals: log as `[improve] rejected: <description>. Reason: <human feedback>.`

## Rules

- Evidence only. No speculative improvements.
- Propose what you CAN change: agent prompts, config, scope declarations, leaf profiles. Not pi internals.
- One proposal per pattern. Don't bundle unrelated changes.
- Human decides. You propose.
- Log everything. Improvement history is an asset.
