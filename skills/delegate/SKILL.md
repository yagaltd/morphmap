---
name: morphmap-delegate
description: Pull phase. Read .morphmap/morphmap.mindmap.md for ready branches, spawn branch agents via pi-subagents. Autonomous execution with risk-priority ordering.
user-invocable: true
argument-hint: "[branch name, or empty for all ready]"
---

# MorphMap Delegate — Pull Phase

Spawn branch agents via pi-subagents for autonomous leaf execution.
Uses pi's `subagent()` tool with `agent: "morphmap/branch-agent"`.
NOT the pi-subagents `delegate` builtin — that's a different, generic agent.

## Phase 0: CRASH RECOVERY

Before spawning agents, check if previous delegate was interrupted:

```bash
IN_PROGRESS=$(grep -c '🔄' .morphmap/morphmap.mindmap.md 2>/dev/null || echo 0)
PENDING=$(grep -c '⬜' .morphmap/morphmap.mindmap.md 2>/dev/null || echo 0)
```

If `IN_PROGRESS > 0`:
- Report: "Previous delegate crashed. N leaves in-progress, M pending."
- Ask: "Resume? (y) — spawn agents for 🔄 + ⬜ leaves. (r)eset — mark 🔄 back to ⬜, start fresh."
- If 'y': continue to Phase 1. Branch agents verify actual state before re-spawning.
- If 'r': mark all 🔄 back to ⬜ in map. Continue to Phase 1.

## Phase 1: CACHE CHECK

Before reading the map, ensure the available-skills cache is fresh.

**Check staleness:**
```bash
CACHE=".morphmap/available-skills.md"
if [ ! -f "$CACHE" ]; then
  echo "MISSING — regenerate"
elif [ "$(find "$CACHE" -mtime +7 2>/dev/null)" ]; then
  echo "STALE (>7 days) — regenerate"
else
  echo "FRESH — skip"
fi
```

**If missing or stale, regenerate:**

Scan all installed SKILL.md files and group by domain keyword:

```bash
# Rebuild .morphmap/available-skills.md
cat > .morphmap/available-skills.md << 'HEADER'
# Available Skills
> Auto-generated $(date -I) by morphmap-delegate
> Source: ~/.pi/agent/skills, ~/.agents/skills, skills/
> Stale after: $(date -I -d '+7 days')

HEADER

# Collect all skill entries
for skill_dir in ~/.pi/agent/skills ~/.agents/skills skills/; do
  [ -d "$skill_dir" ] || continue
  find "$skill_dir" -maxdepth 2 -name 'SKILL.md' | while read f; do
    dir=$(dirname "$f")
    name=$(basename "$dir")
    desc=$(head -10 "$f" | grep '^description:' | head -1 | sed 's/^description: *//')
    echo "ENTRY|$name|$desc|$f"
  done
done > /tmp/skill-entries.txt

# Group by domain keyword and write to cache
# The agent groups entries by matching name+desc against domain keywords:
#   rust → rust, cargo, crate, borrow, async, tokio
#   web-frontend → web, html, css, frontend, browser, js, animation, hyperframes
#   web-backend → web, http, rest, api, axum, actix, worker
#   security → security, bug, audit, threat, unsafe, auth
#   design → design, ui, taste, frontend, hallmark, image, style
#   cloud → cloudflare, worker, durable, wrangler, sandbox
#   video → video, hyperframes, remotion, animation, three
#   data → database, sql, d1, sqlite, postgres, kv
#   general → does not match any specific domain
#
# Write grouped sections with format:
#   ## <domain>
#   - **<name>**: <description> — `<path>`
```

> Note: the actual grouping step requires agent judgment for ambiguous cases.
> The agent reads `/tmp/skill-entries.txt` and writes the grouped cache sections
> into `.morphmap/available-skills.md` following the format in §10.4 of improv-map.

Skills can appear in multiple domains (e.g. `waapi` → both `web-frontend` and `video`).

## Phase 2: READ MAP

Read .morphmap/morphmap.mindmap.md. Find all headings tagged `[module]` or `[feature]` at any level.

## Phase 3: SELECT BRANCHES

For each heading at **any level** (##, ###, ####) tagged `[module]` or `[feature]`:
- Status ⬜ or 🔄? → eligible
- All cross-branch deps [needs:] met? → ready
- Subtree has ⬜ leaves or sub-branches? → start

This includes sub-branches. A `###` sub-branch under a `##` branch also gets its own branch agent.
Branch agents at deeper levels further decompose: if their subtree has `####` headings tagged `[module]` or `[feature]`, they spawn sub-branch agents for those too.

If specific branch name given, delegate only that branch (and its eligible children).

## Phase 4: SPAWN BRANCH AGENTS

For each ready branch at any depth:

```
subagent({
  agent: "morphmap/branch-agent",
  task: "Own <heading> subtree within <parent-path>.
    Subtree: .morphmap/morphmap.mindmap.md, heading '<full heading text>',
    ends before next heading at same or higher level.
    Parent scope: <what parent needs from this subtree>.
    Known consumers: <who depends on this, with [needs:] paths>.
    Siblings: <other sub-branches under same parent, what they do>.
    Context from orchestrator: phase=<X>, compat=<Y>, scope=<Z>,
    quality=<W>, budget=<V>.
    Available: pi-subagents, pi-intercom, context-mode, agent-spec CLI,
    /goal, vcc_recall.
    If subtree has sub-branches: spawn sub-branch agents for each.
    If subtree has direct leaves: pull in risk-priority order.
    Report when subtree complete with summary of what was delivered.",
  context: "fresh"
})
```

**The five context dimensions each agent receives:**

1. **Subtree Boundaries** — `"Subtree starts at '<heading text>', ends before next heading at same or higher level. Read this section from .morphmap/morphmap.mindmap.md."`

2. **Parent Scope** — `"Parent scope: <parent> needs <specific deliverables> from this subtree. Your API will be consumed by <consumers with [needs:] paths>."` This is the CONTRACT between parent and child.

3. **Known Consumers** — `"Known consumers: <sibling branches> [needs: <paths>]. If your API changes, notify these branches via intercom."`

4. **Sibling Context** — `"Siblings under <parent>: <comma-separated list of other sub-branches and what they do>. Your API must be compatible with all."`

5. **Posture** — `"Context from orchestrator: phase=<prototype|mvp|stable>, compat=<break|keep>, scope=<narrow|moderate|broad>, quality=<fast|standard|strict>, budget=<low|balanced|high>."` Inherited from parent, overridable per leaf.

**Parallel spawning:** Use `async: true` for independent branches. Do NOT use `worktree: true` — it creates isolated copies, doubles disk usage, and leaves orphaned worktrees. All branch agents share the main working directory. Parallel agents that touch different files don't conflict. Branches with [needs:] dependencies on each other must be sequential — wait for the dependency to report ✅ before spawning the dependent.

## Phase 5: REPORT

```
Delegated <N> branches/sub-branches:
  - <heading-path> 🔄 — spawned, running
  - <heading-path> 🔴 — blocked (deps not met, waiting on <other>)

Monitor with /morphmap-review
Check status with /morphmap-status
```
