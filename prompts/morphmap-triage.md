---
description: "MorphMap Triage — classify external input (GitHub, email, chat) → route"
thinking: high
skill: morphmap-triage
restore: true
---

Read external input. Classify against branch scope declarations. Confidence >0.8 → auto-route to branch agent. <0.8 → flag for human. PR with existing leaf reference → update status, don't create new leaf. Log all routing decisions.

$@
