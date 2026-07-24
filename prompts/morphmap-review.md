---
description: "MorphMap Review — triage blockers, detect stale branches, report status to human"
thinking: high
skill: morphmap-review
restore: true
---

Fresh subagent reads .morphmap/morphmap.mindmap.md. Walks tree. For each 🔴 leaf: note branch path, blocked-on, dep chain. For each 🔄 leaf: check git last-modified timestamp (git log -1 --format='%aI' -- <files>). Flag any 🔄 leaf unchanged >48h as STALE. Check intercom for WORKER_BLOCKER signals from active sessions. Report compact summary: blockers, stale items, attention items, done since last review. Options not decisions — human triages. No context pollution to root agent. If --handoff: write full report to .morphmap/review-<YYYYMMDD>-<HHMMSS>.md with OKF frontmatter.

$@
