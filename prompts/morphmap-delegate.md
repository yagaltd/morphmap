---
description: "MorphMap Delegate — pull phase: spawn branch agents, autonomous execution"
thinking: high
skill: morphmap-delegate
restore: true
---

Pull phase. Read .morphmap/morphmap.mindmap.md for all branches with ⬜ leaves where deps are met. Spawn branch agents via subagent({ agent: "morphmap/branch-agent" }). If specific branch given, delegate only that branch. Report completion summary.

$@
