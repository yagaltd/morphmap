---
name: morphmap-plan
description: Push phase. Scout evidence, build decision tree, grill unresolved decisions, output morphmap.mindmap.md tree. Set project posture. Never implement.
user-invocable: true
argument-hint: "<directive, repo paths, URLs, or constraints>"
---

# MorphMap Plan — Push Phase

Productize a directive into a morphmap tree. Evidence → decisions → tree → approve. Do not implement.

## Phase 1: EXPLORE FIRST

Gather evidence before asking questions. Use pi-subagents for parallel recon:

1. Read existing morphmap.mindmap.md for current structure and decisions
2. Spawn scout subagent for codebase recon:
   ```
   subagent({ agent: "scout", task: "Recon <area>. Map files, dependencies, patterns.", context: "fresh" })
   ```
3. If external URLs/docs needed, spawn researcher subagent:
   ```
   subagent({ agent: "researcher", task: "Research <topic>. Find official docs, specs, benchmarks.", context: "fresh" })
   ```
4. If both needed, run in parallel:
   ```
   subagent({ tasks: [
     { agent: "scout", task: "Recon <area>..." },
     { agent: "researcher", task: "Research <topic>..." }
   ], concurrency: 2 })
   ```
5. Check git log for recent related changes
6. For small/simple projects (<50 files), you may do scouting directly with find/grep/read instead of spawning scout

**Rule:** If a question can be answered from evidence, answer it. Do not ask the human.
**Rule:** Scout and researcher are pi-subagents builtins. Always available. Spawn them with fresh context for parallel recon.

## Phase 2: DECISION TREE

Classify each decision:
- Resolved by evidence → include evidence, use it
- Human preference → ask only if it changes scope/behavior
- Architecture decision → ask if hard to reverse
- Implementation detail → decide from existing patterns

## Phase 3: GRILL UNRESOLVED

Ask only decisions that remain unresolved after Phase 1.
Every question must include: recommended answer, evidence, consequence if different.
Use interview() for independent decisions in one batch.
One-by-one questions when answers affect later questions.

## Phase 4: BUILD TREE

Write morphmap.mindmap.md with:
- YAML frontmatter: posture, project, tags
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
