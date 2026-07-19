---
name: morphmap-delegate
description: Pull phase. Read morphmap.mindmap.md for ready branches, spawn branch agents via pi-subagents. Autonomous execution with risk-priority ordering.
user-invocable: true
argument-hint: "[branch name, or empty for all ready]"
---

# MorphMap Delegate — Pull Phase

Spawn branch agents for autonomous leaf execution.

## Phase 1: READ MAP

Read morphmap.mindmap.md. Find all `##` branches.

## Phase 2: SELECT BRANCHES

For each branch:
- Status ⬜ or 🔄? → eligible
- All cross-branch deps [needs:] met? → ready
- Branch has ⬜ leaves? → start

If specific branch name given, delegate only that branch.

## Phase 3: SPAWN BRANCH AGENTS

For each ready branch:

```
subagent({
  agent: "morphmap/branch-agent",
  task: "Own <branch-name> subtree. Map at morphmap.mindmap.md.
    Context from orchestrator: phase=<X>, compat=<Y>, scope=<Z>, quality=<W>, budget=<V>.
    Available tools: pi-subagents, pi-intercom, context-mode, agent-spec CLI, /goal, vcc_recall.
    Pull leaves in risk-priority order. Write map after every leaf. Report blockers.",
  async: true,
  context: "fresh"
})
```

Parallel branches with `worktree: true` if they touch different files.

## Phase 4: REPORT

```
Delegated <N> branches:
  - <branch> 🔄 — spawned, running
  - <branch> 🔴 — blocked (deps not met, waiting on <other>)

Monitor with /morphmap-review
Check status with /morphmap-status
```
