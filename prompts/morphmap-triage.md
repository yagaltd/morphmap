---
description: "MorphMap Triage — classify external input (GitHub issues/PRs, email, chat) against branch scope. Auto-route high-confidence matches, flag low-confidence for human."
thinking: high
skill: morphmap-triage
restore: true
---

Classify external input against branch scope declarations in .morphmap/morphmap.mindmap.md. Use `gh` CLI to fetch GitHub issues/PRs. Apply 4-tier classification (very-good/good/bad/very-bad). very-good → auto-route to branch agent. good → route with validation note. bad/very-bad → flag for human. PRs with exact leaf references → update status, don't create new leaf. Log all routing decisions to ## decisions. Pass posture to branch agents.

$@
