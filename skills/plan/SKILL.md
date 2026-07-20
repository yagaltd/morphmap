---
name: morphmap-plan
description: Push phase. Scout evidence, build decision tree, grill unresolved decisions, output .morphmap/morphmap.mindmap.md tree. Set project posture. Never implement.
user-invocable: true
argument-hint: "<directive, repo paths, URLs, or constraints>"
---

# MorphMap Plan — Push Phase

Productize a directive into a morphmap tree. Evidence → decisions → tree → approve. Do not implement.

## Phase 1: EXPLORE FIRST

Gather evidence before asking questions. Use pi-subagents for parallel recon:

1. Read existing .morphmap/morphmap.mindmap.md for current structure, decisions, and existing handoff IDs
2. **Assign IDs:** count existing handoff files in .morphmap/ per agent type to determine next ID:
   ```bash
   ls .morphmap/scout-*.md 2>/dev/null | wc -l  # → next scout ID = count + 1
   ls .morphmap/researcher-*.md 2>/dev/null | wc -l  # → next researcher ID = count + 1
   ```
   Format: `<agent>-<NNN>-<YYYYMMDD>-<slug>.md`

3. Spawn scout subagent with assigned output path:
   ```
   subagent({ agent: "morphmap/scout",
     task: "Recon <area>. Map files, dependencies, patterns. Write to .morphmap/scout-001-20260720-<slug>.md with OKF frontmatter.",
     context: "fresh" })
   ```
4. If external URLs/docs needed, spawn researcher with assigned output path:
   ```
   subagent({ agent: "morphmap/researcher",
     task: "Research <topic>. Find official docs, specs, benchmarks. Write to .morphmap/researcher-001-20260720-<slug>.md with OKF frontmatter.",
     context: "fresh" })
   ```
5. If both needed, run in parallel:
   ```
   subagent({ tasks: [
     { agent: "morphmap/scout", task: "Recon <area>... Write to .morphmap/scout-001-20260720-<slug>.md" },
     { agent: "morphmap/researcher", task: "Research <topic>... Write to .morphmap/researcher-001-20260720-<slug>.md" }
   ], concurrency: 2 })
   ```
6. After agents complete, update map's `## context` branch with their file references
7. Check git log for recent related changes
8. For small/simple projects (<50 files), you may do scouting directly with find/grep/read instead of spawning scout

**Rule:** If a question can be answered from evidence, answer it. Do not ask the human.
**Rule:** Scout and researcher are MorphMap agents (`morphmap/scout`, `morphmap/researcher`). Always available. Spawn with fresh context for parallel recon.

## Phase 2: DECISION TREE

Classify each decision:
- Resolved by evidence → include evidence, use it
- Human preference → ask only if it changes scope/behavior
- Architecture decision → ask if hard to reverse
- Implementation detail → decide from existing patterns

## Phase 3: GRILL UNRESOLVED

Use grill-for-unknowns skill. One question per turn, ordered by blast radius.
Lettered options so user reacts instead of composes.
Close each as decision — answered by user, answered by territory, or recorded OPEN on map.
Propose defaults for low-risk unknowns instead of blocking.

## Phase 4: BUILD TREE

Write .morphmap/morphmap.mindmap.md with:
- YAML frontmatter: posture, project, tags
- `## context` branch listing all handoff files and references
- `##` branches (4-7 modules) with scope declarations
- `###` sub-branches where needed (>5 leaves or cross-cutting)
- `-` bullet leaves with bottleneck tags (🔴🟡🔵🟠⚪)
- Cross-branch deps: `[needs: branch/leaf]`
- `## staging` and `## production` lifecycle branches
- `## decisions` log branch

Rules:
- Complex concern (>5 leaves) → promote to `###` sub-branch
- Simple concern (1-5 leaves) → keep as bullets under `##`
- Every leaf points to a `.spec` file path (even if not written yet)
- Bottleneck tags: 🔴 BLOCKING, 🟡 RISKY, 🔵 TIME_CONSUMING, 🟠 VERIFICATION_HEAVY, ⚪ STANDARD

## Phase 5: STOP FOR APPROVAL

Present summary:
```
## Plan: <directive>
## <N> branches, <M> leaves, <P> inter-branch deps

### Bottleneck summary:
- 🔴 BLOCKING: <count>
- 🟡 RISKY: <count>
- ⚪ STANDARD: <count>

### Branches:
- <branch name> — <scope> · <leaf count> leaves
- ...

Approve to generate contracts and start execution.
Next: /morphmap-delegate
```

## Rules

- Evidence before interview
- Ask only unresolved decisions
- Never create leaves — branches contain leaves. Leaves contain .spec links
- Set posture in frontmatter (phase, compat, scope, quality, budget)
- Do not implement
