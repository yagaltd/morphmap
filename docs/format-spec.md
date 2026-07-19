---
type: specification
topic: mindmap-format
timestamp: 2026-07-19
tags: [format, markmap, hierarchy, KPI, OKF]
resource: examples/morpheditor.mindmap.md
---

# .mindmap.md Format Specification

## Design Principles

1. **Markmap-compatible** — valid markdown, renderable with `npx markmap-cli`
2. **Human-readable** — plain text, status visible at a glance
3. **Agent-parseable** — structured enough for branch agents to read/write deterministically
4. **Git-friendly** — headings are natural merge boundaries
5. **Living document** — agents update status inline, tree restructures as work reveals complexity

## Hierarchy

```
# root/project                    — markmap root node
  ## branch (module or phase)     — markmap branch, scope: ..., KPIs in header
    ### sub-branch (feature)      — markmap sub-branch
      #### sub-sub-branch         — markmap deeper branch (rare, >5 leaves)
        - bullet leaf             — atomic task → .spec file
```

**Rules:**
- Leaves (bullets) can exist at ANY level — a branch can have both leaves and sub-branches
- A sub-branch can have both leaves and sub-sub-branches
- Recommended max depth: 4 levels (branch → sub → sub-sub → leaf)
- Deeper than 4 = planning smell, restructure
- Rule of thumb: >5 leaves under one level → promote to sub-branch

## Node Types

### Root Node (`#`)
- Project name
- No status, no owner — this is the container

### Branch Node (`##`)
- Module (e.g., `## auth`) or phase (e.g., `## staging`)
- Carries scope declaration and KPI header
- Can contain sub-branches AND leaves

**Header format:**
```
## <name> <status> — scope: <keywords> · ETA: <date> · budget: <spent>/<total> · <n>/<m> leaves · [flags]
```

## Frontmatter (YAML block at file start)


### .morphmap/config — Project Configuration

Stored at project root `.morphmap/config`. Human-maintained, agent-read at startup.

```yaml
# .morphmap/config
available:
  extensions: [pi-subagents, pi-intercom, context-mode, pi-codex-goal]
  cli: [agent-spec, markmap-cli]
  builtin: [/goal]
  verified-at: 2026-07-19

leafProfiles:
  standard:    { model: "deepseek/deepseek-v4-flash", thinking: "low" }
  risky:       { model: "deepseek/deepseek-v4-pro",  thinking: "high" }
  blocking:    { model: "anthropic/claude-sonnet-4",  thinking: "xhigh" }
  time:        { model: "deepseek/deepseek-v4-flash", thinking: "medium" }
  verify:      { model: "deepseek/deepseek-v4-pro",  thinking: "high" }

agentDefinitions: .morphmap/agents/
specsDirectory: specs/
```

Required (OKF):
```yaml
---
type: mindmap          # OKF required
project: <name>        # project identifier
timestamp: <ISO-8601>  # OKF SHOULD
tags: [<list>]         # OKF SHOULD
---
```

Optional — Project Posture (set by Root Orchestrator, human-editable):
```yaml
posture:
  phase: mvp           # mvp | prototype | production | maintenance
  compatibility: break # break | maintain | evaluate
  scope: narrow        # narrow | broad
  quality: fast        # fast | standard | strict
  budget: balanced     # cheap | balanced | unlimited
```

Posture cascades to all agents. Root Orchestrator reads it from frontmatter, passes it in every agent task as "Context from orchestrator: phase=X, compat=Y, ...". Human can edit frontmatter at any time — next /mindmap-delegate picks up changes.

Markmap rendering (optional, for markmap-cli):
```yaml
markmap:
  colorFreezeLevel: 2
  maxWidth: 300
```

### Sub-Branch Node (`###`, `####`, `#####`)
- Feature or concern within a module
- Same KPI tracking as branch (aggregated from children)
- Can contain sub-branches AND leaves

### Leaf Node (bullet `-`)
- Atomic task — one `.spec` file, one worker session
- Terminal node — no children

**Leaf format:**
```
- <status> <description> → <path/to/file.spec> [tags] [source: ...] · cost · duration
```

## Status Markers

| Marker | Meaning | Sets parent to |
|--------|---------|---------------|
| ⬜ | Pending | (no change) |
| 🔄 | In progress | 🔄 |
| ✅ | Done | (worst of siblings) |
| ❌ | Failed | ❌ |
| 🔴 | Blocked | 🔴 |

Parent status = worst status of all children + inter-branch flags.

## Tags

| Tag | Syntax | Scope |
|-----|--------|-------|
| Bottleneck | `[🔴 BLOCKING: reason]` | Leaf, sub-branch |
| Dependency | `[needs: branch/leaf-path]` | Leaf |
| Source | `[source: GitHub #132]` | Leaf |
| Risk | `[🟡 RISKY: new domain]` | Leaf |
| Time | `[🔵 TIME_CONSUMING]` | Leaf |
| Verification | `[🟠 VERIFICATION_HEAVY]` | Leaf |
| Owner | `@worker-agent`, `@human` | Leaf, sub-branch |

## KPI Tracking Per Level

Same 4 KPIs at every level — different granularity:

| KPI | Leaf | Branch | Root |
|-----|------|--------|------|
| Status | ⬜🔄✅❌🔴 | Worst of children | Worst of branches |
| Budget | Task cost | Sum of leaves | Total project |
| ETA | Task estimate | Latest child + 20% | Latest branch |
| Flags | `[needs:]` | Intercom received | Aggregated |

Drift >20% on budget or ETA → `flag:drift` to root.

## External References

Leaves and branches can point to any document type — not just `.spec` files:

```
- ⬜ write format spec → docs/format-spec.md                    (markdown doc)
- ⬜ login endpoint → specs/auth/login.spec                     (agent-spec contract)
- ✅ research spike → sessions/research-jwt-2026-07-19.jsonl   (coding session record)
- ⬜ user story: password reset → docs/stories/password-reset.md (user story)
- 🔴 inter-branch decision → docs/adr/004-jwt-format.md         (ADR)
```

The mindmap doesn't care what the linked file IS. It cares about status, owner, dependencies, risk.

## Decision Log Branch

Special `## decisions` branch — not work, immutable audit trail:

```markdown
## decisions ⬜ — log, not work
- 2026-07-19: routed GitHub #132 to auth/jwt [confidence: 0.91]
- 2026-07-19: JWT format → RS256 [auth branch, decision #14, impacts: auth-ui, mobile-auth]
- 2026-07-19: new branch "export" created [human directive, /mindmap-amend]
```

All decisions indexed via context_mode for pull-based discovery.

## Phase Branches

Special phase branches for lifecycle tracking:

```markdown
## staging ⬜
### deploy-2026-07-20
- ⬜ deploy auth module → specs/deploy-auth.spec

## production 🔴 [BLOCKED: staging not passed]
### release-v1.2
- 🔴 merge to main
- 🔴 DB migration
```

## Full Example

See [examples/morpheditor.mindmap.md](../examples/morpheditor.mindmap.md) for a complete MorphEditor mindmap with 11 branches, 170 leaves, status tracking, budget/ETA KPIs, cross-branch dependencies, inter-branch flags, and staging/production lifecycle branches.
