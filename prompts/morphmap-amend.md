---
description: "MorphMap Amend — intake from human: classify → route to branch-agent or flag human"
thinking: high
skill: morphmap-amend
restore: true
---

Intake from human. Parse addition keywords + PR references. Read .morphmap/morphmap.mindmap.md branch scope declarations. Classify using forced 3-tier: exact match → route to branch-agent, partial match → route with review flag, no match → ask human. Extract PR/issue links and pass to branch-agent for leaf linkage. Log routing to ## decisions.

$@
