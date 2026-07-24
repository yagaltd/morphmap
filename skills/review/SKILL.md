---
name: morphmap-review
description: Triage blockers, review status, flag decisions for human. Fresh subagent, no context pollution.
user-invocable: true
argument-hint: "[branch name, or empty for full review] [--handoff]"
---

# MorphMap Review

Fresh subagent walks the tree, flags issues, reports to human. Blocker detection via 🔴 emoji scan + WORKER_BLOCKER intercom check. Stale detection via git timestamps (48h threshold on 🔄 leaves).

## Phase 1: READ MAP + GATHER EVIDENCE

Spawn a fresh reviewer subagent to walk the tree (avoids context pollution):

```
subagent({
  agent: "morphmap/reviewer",
  task: "Read .morphmap/morphmap.mindmap.md. Walk every ## branch.
          For each leaf with 🔴: note branch path, blocked-on, dep chain.
          For each leaf with 🔄: check git last-modified timestamp (git log -1 --format='%aI' -- <files>).
          Flag any 🔄 leaf unchanged for >48h as STALE.
          Also run: intercom({ action: 'list' }) — check for sessions reporting WORKER_BLOCKER.
          Report structured findings.",
  context: "fresh"
})
```

If branch specified, review only that subtree.

### Stale Detection Methodology

For each 🔄 leaf:
```bash
# Get files associated with the leaf (from its .spec Boundaries > Allowed Changes, or git log)
FILES=$(grep -A5 "## Boundaries" <spec-path> 2>/dev/null | grep '^- ' | sed 's/^- //' || echo "")
if [ -n "$FILES" ]; then
  for f in $FILES; do
    LAST_MOD=$(git log -1 --format="%aI" -- "$f" 2>/dev/null || echo "never")
    echo "$f: $LAST_MOD"
  done
else
  # Fallback: check last commit touching the .spec itself
  LAST_MOD=$(git log -1 --format="%aI" -- "<spec-path>" 2>/dev/null || echo "never")
  echo "<spec>: $LAST_MOD"
fi
```

Compare against `date -Iseconds -d '48 hours ago'`. If all files modified before cutoff → STALE.

## Phase 2: TRIAGE

For each branch:
- **🔴 leaves**: what's blocked? Deps unmet? Decision needed? WORKER_BLOCKER signal active?
- **🔴 escalated decisions**: what does human need to decide? Options available?
- **🔄 leaves STALE (>48h)**: which branch agent stalled? Last git activity timestamp? Recovery action?
- **🔄 leaves ACTIVE (<48h)**: ETA drifting >20%? Budget over? Note as in-progress.
- **🟡 inter-branch flags**: any cross-branch decisions pending? Dep chains blocked mid-tree?
- **✅ branches**: any integration test results to review? Quality review handoffs unread?

### WORKER_BLOCKER Detection

```bash
# Check intercom for any sessions reporting blockers
intercom({ action: "list" })
# For each active session, check if it has a pending WORKER_BLOCKER message
```

If WORKER_BLOCKER found: include session ID, blocked leaf, and blocker reason in report.

## Phase 3: REPORT

Compact summary to console:

```
## MorphMap Review — <date>

### 🔴 Blocked
- <branch>: <leaf> — blocked on <reason>. Action: <what human should do>
- <branch>: <decision> escalated — <options>. Human must choose.
- <session-id>: WORKER_BLOCKER — <reason>. Action: <recovery suggestion>

### 🟡 Stale (>48h inactive)
- <branch>: <leaf> 🔄 — last activity <timestamp>. Action: /morphmap-recover or mark ⬜
- <branch>: <leaf> 🔄 — stalled branch agent. Session <id>. Action: interrupt + restart

### 🟡 Attention
- <branch>: ETA drift +2d (<reason>)
- <branch>: [🟡 INTER-BRANCH: <decision>, impacts <branches>]

### ✅ Done Since Last Review
- <branch>: <N> leaves completed ($<cost>, <time>)
- <branch>: integration test passed
```

### Handoff File (if --handoff flag)

Write the full review report to `.morphmap/review-<YYYYMMDD>-<HHMMSS>.md` with OKF frontmatter:

```yaml
---
type: handoff
agent: morphmap/reviewer
id: review-<YYYYMMDD>-<HHMMSS>
timestamp: <ISO-8601>
version: 1
summary: MorphMap review — N blockers, M stale, P attention items
source: .morphmap/morphmap.mindmap.md
status: raw
tags: [review, triage, morphmap]
---
```

## Rules

- Spawn reviewer subagent via pi-subagents. Fresh context, no pollution.
- Read only branch headers + leaf status markers. Don't read leaf details unless triaging a specific blocker.
- Present options, not decisions. Human decides.
- Stale threshold: 48 hours from last git commit touching the leaf's files.
- WORKER_BLOCKER detection via intercom, not mindmap (agents signal it dynamically).
- If no 🔄 leaves and no 🔴 blockers: report "All clear. N branches healthy."
