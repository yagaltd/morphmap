---
description: "MorphMap Run — parallel autonomous execution: spawn all ready branches, loop until done"
thinking: high
skill: morphmap-run
restore: true
---

Run phase. Spawn ALL ready [module]/[feature] branches in parallel via subagent({ agent: "morphmap/branch-agent", async: true }). Monitor via intercom + state.json polling. Loop: re-check for newly-ready branches after completions. Repeat until all branches are ✅ or 🔴. Report final summary.

$@
