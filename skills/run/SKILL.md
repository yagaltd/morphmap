---
name: morphmap-run
description: Run phase. Spawn ALL ready branches in parallel, monitor via intercom + state.json, loop until all branches done.
user-invocable: true
argument-hint: "[--loop] [--branch <name>]"
---

# MorphMap Run — Parallel Autonomous Execution

Spawn all ready `[module]`/`[feature]` branches in parallel. Monitor via intercom + state.json polling. Loop until all branches are ✅ or 🔴.

## Phase 0: CRASH RECOVERY

Same as delegate — check for 🔄 leaves from interrupted runs.

## Phase 1: CACHE CHECK

Same as delegate — ensure `.morphmap/available-skills.md` is fresh.

## Phase 2: READ MAP

Read `.morphmap/morphmap.mindmap.md`. Find all headings tagged `[module]` or `[feature]` at any level.

## Phase 3: SELECT BRANCHES

Same as delegate — find eligible branches (⬜/🔄, deps met, has leaves or sub-branches).

## Phase 4: SPAWN ALL IN PARALLEL

Unlike delegate (which spawns sequentially), run spawns ALL ready branches simultaneously:

```javascript
subagent({
  tasks: readyBranches.map(branch => ({
    agent: "morphmap/branch-agent",
    task: "Own <heading> subtree...",
    context: "fresh",
    async: true  // non-blocking
  })),
  concurrency: readyBranches.length  // spawn all at once
})
```

**Risk-priority ordering still applies** — but all branches spawn in parallel. 🔴 BLOCKING branches get strongest models.

## Phase 5: MONITOR + LOOP

```
While branches remain active:
  1. Wait for intercom completion signals from branch agents
  2. On completion: update map, check for newly-ready branches
  3. Spawn newly-ready branches (deps now met)
  4. Repeat until no active branches and no ready branches
```

**Monitoring mechanism:**
- intercom: branch agents signal completion via `intercom({ action: "send", to: "parent", message: "branch done: <name>" })`
- state.json: parent polls child `state.json` for status (pull, not push)
- pi goal: each branch agent sets its own `/goal`; run monitors goal completion

## Phase 6: REPORT

```
Run complete:
  - ✅ <N> branches done
  - 🔴 <M> branches blocked
  - 💤 <P> branches abandoned
  - Total cost: $X.XX
  - Duration: <time>
```

## --loop flag

If `--loop` is passed, after all branches complete, re-check the map for any newly-ready branches (e.g., from `/morphmap-amend` additions during the run). Spawn and monitor those. Repeat until no ready branches remain.

## --branch flag

If `--branch <name>` is passed, run only that branch (and its eligible children). Equivalent to delegate but with the parallel spawn + monitor loop.
