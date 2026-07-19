---
description: "MorphMap Review — triage blockers, review status, human decisions"
model: deepseek/deepseek-v4-flash
thinking: medium
skill: morphmap-review
restore: true
---

Fresh subagent reads morphmap.mindmap.md. Walks tree. Flags 🔴 blockers, 🔴 escalated decisions, ETA/budget drift >20%. Reports compact summary. Human triages. No context pollution to root agent.

$@
