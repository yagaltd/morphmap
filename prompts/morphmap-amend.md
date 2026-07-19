---
description: "MorphMap Amend — intake from human: classify → route to branch agent"
model: deepseek/deepseek-v4-flash
thinking: medium
skill: morphmap-amend
restore: true
---

Intake from human. Classify addition against branch scope declarations in morphmap.mindmap.md. If confidence >0.8, route to branch agent via intercom new:leaf. If no match, ask human. Pass current posture. Log to ## decisions.

$@
