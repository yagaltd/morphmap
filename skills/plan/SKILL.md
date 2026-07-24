---
name: morphmap-plan
description: Push phase. Scout evidence, build decision tree, grill unresolved decisions, output .morphmap/morphmap.mindmap.md tree. Set project posture. Never implement.
user-invocable: true
argument-hint: "<directive, repo paths, URLs, or constraints>"
---

# MorphMap Plan — Push Phase

Productize a directive into a morphmap tree. Evidence → decisions → tree → approve. Do not implement.

## MODE SELECTION

Two modes. Choose based on scope.

### `--project` (top-down decomposition)

Use when: greenfield project, vague requirements, or "build me X that does Y and Z."
Generates the FULL high-level mindmap tree. Draft branches + leaves (all ⬜).
Branch agents refine each branch later during delegate.

### `--branch` (deep single-branch planning, DEFAULT)

Use when: one specific branch needs detailed planning.
Scout evidence, grill decisions, build detailed tree with .spec links.

**If the user says `/morphmap-plan @requirements.md` with a file → auto-detect `--project`.**
**If the user says `/morphmap-plan "add auth to the API"` → default to `--branch`.**

---

## --project MODE

### Phase P0: INTERVIEW (deep-project style)

Read the requirements file or directive. DO NOT spawn scouts or researchers — this is high-level decomposition, not deep analysis.

Ask the human a structured interview to understand project scope. Use `interview()` with these questions:

1. **What is the one-sentence purpose of this project?**
2. **Who uses it?** (single user, team, public, internal)
3. **What are the 3-5 major functional areas?** (e.g., auth, billing, dashboard, API, admin)
4. **Are any of these areas cross-cutting?** (shared by multiple features)
5. **What is the deployment target?** (web, CLI, mobile, library, extension)
6. **Any known constraints?** (existing codebase, compliance, performance requirements)

After interview, classify each functional area:
- **Simple (1-3 leaves)** → keep as `##` branch, leaves directly under it
- **Medium (4-7 leaves)** → `##` branch + `###` sub-branches
- **Complex (8+ leaves)** → `##` branch + multiple `###` sub-branches, may need `####` sub-sub-branches

### Phase P1: DEPENDENCY DISCOVERY

For each pair of branches, ask: "Does X depend on Y to work?" Mark with `[needs: branch/leaf]`.

Dependency rules:
- Auth is always a dependency of everything that needs users
- Data layer is a dependency of everything that reads/writes
- Frontend depends on API, not vice versa
- Shared/utility branches have no dependencies

### Phase P2: BUILD DRAFT TREE

Write `.morphmap/morphmap.mindmap.md` with:
- YAML frontmatter (posture, project, tags)
- `## context` branch with requirements reference
- `##` branches (one per functional area) — all `⬜`
- `###` sub-branches where needed
- `- ⬜` draft leaves with descriptive names and estimated bottleneck tags
- `[needs:]` cross-branch deps
- `## staging` + `## production` lifecycle branches (⬜)
- `## decisions` log branch

**Draft leaf format:**
```
- ⬜ brief leaf description [🔴|🟡|🔵|🟠|⚪] [needs: other/leaf]
```

**DO NOT write .spec file paths on draft leaves.** Branch agents add those during refinement.
**DO NOT spawn scouts or researchers.** This is high-level only.

### Phase P3: HUMAN APPROVAL

Present the full tree as a summary:

```
## Plan: <project name>
## <N> branches, <M> draft leaves, <P> cross-branch deps

### Branches:
- ⬜ auth — user registration, login, password reset · 4 leaves
- ⬜ api — REST endpoints, middleware, rate limiting · 7 leaves
- ⬜ frontend — pages, components, state management · 9 leaves
  - ⬜ dashboard (sub-branch) · 3 leaves
  - ⬜ settings (sub-branch) · 2 leaves
- ...

Approve to start delegation. Branch agents will refine each branch and write .spec files.
Next: /morphmap-delegate
```

Human can:
- "approve" — tree is locked, delegate can start
- "move X to Y" — restructure
- "split X" or "merge X and Y" — refine structure
- "add X" — missing area

Loop until approved.

### Phase P4: COMMIT + STOP

Commit the approved tree. Do NOT start delegate. The human runs `/morphmap-delegate` when ready.

```bash
git add .morphmap/morphmap.mindmap.md
git commit -m "plan: project-level tree from requirements"
```

---

## --branch MODE (DEFAULT)

## Phase 0: ESTIMATE BUDGET

Check if tokei stats exist (brownfield project). If yes, compute token budget automatically.

```bash
TOKEI=".morphmap/tokei-stats.json"
if [ -f "$TOKEI" ]; then
  # Extract total code lines from tokei JSON
  TOTAL_CODE=$(python3 -c "
import json, sys
with open('$TOKEI') as f:
    data = json.load(f)
total = 0
for lang, stats in data.items():
    if isinstance(stats, dict) and 'code' in stats:
        total += stats['code']
exclude = data.get('Markdown', {}).get('code', 0) + data.get('JSON', {}).get('code', 0)
total -= exclude  # exclude docs/config from estimate
print(max(total, 0))
" 2>/dev/null || echo 0)
  
  # Estimate: JS/TS ~3 LOC per token, CSS/HTML ~8 LOC per token, overhead ~4000 tokens
  EST_TOKENS=$(( TOTAL_CODE / 4 + 4000 ))
  EST_TOKENS=$(( EST_TOKENS < 3000 ? 3000 : EST_TOKENS ))
  EST_TOKENS=$(( EST_TOKENS > 30000 ? 30000 : EST_TOKENS ))
  
  echo "Project: ~${TOTAL_CODE} code LOC (excluding Markdown/JSON)"
  echo "Estimated token budget needed: ${EST_TOKENS}"
  echo ""
  echo "🛑 STOP. Ask the human before proceeding:"
  echo "   'Budget estimated at ${EST_TOKENS} tokens. Accept? (y)es / (n)o / enter custom value / 'off' for no limit.'"
  echo "   DO NOT proceed to Phase 1 until human approves the budget."
else
  EST_TOKENS=0
  echo "Greenfield project (no tokei stats). Ask human for budget or use default 3000."
fi
```

**Before budget, check archive state:**

```bash
# Count ✅ vs total ## branches
DONE=$(grep -cE '^## .*✅' .morphmap/morphmap.mindmap.md 2>/dev/null || echo 0)
TOTAL=$(grep -c '^## ' .morphmap/morphmap.mindmap.md 2>/dev/null || echo 0)
CURRENT_SUBJECT=$(head -20 .morphmap/morphmap.mindmap.md | grep '^# ' | head -1)
```

If ALL `##` branches are ✅ AND new directive is clearly a different subject:
- "Previous map is fully complete. Archive before planning <new>? (y)es / (n)o — keep as branches and add <new>."
- If 'y': run `/morphmap-archive --all`. Map collapses to summary lines. Continue to Phase 0 budget.
- If 'n': continue as-is. New branches added alongside ✅ ones.

**After human approval on BOTH archive + budget**, set goal:
```
create_goal({
  objective: "Plan <directive>. Scout evidence, resolve decisions, produce approved tree with posture set.",
  token_budget: <approved value, or omit for 'off'>
})
```

**Budget rules:**
- Human MUST approve before proceeding. Never auto-set budget without asking.
- Present estimate with context: LOC count, what the budget covers (scout + research + tree + grill).
- If human says 'off': omit token_budget entirely (no limit).
- If human enters a number: use that value.
- If human says 'y': use the estimate.
- Minimum: 3000 tokens (greenfield). Maximum sensible: 50000 tokens.
- **Large brownfield warning:** >10K LOC projects with parallel scouts may need 2-3x the estimate. Suggest 'off' or double the estimate if spawning >2 parallel agents.

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

Use pi-interview to present unresolved decisions. One question per decision, ordered by blast radius. Lettered options so user reacts instead of composes.

**Interview format rules (MANDATORY — pi-interview validation):**
- `type: "single"` (radio) or `"multi"` (checkbox) or `"text"` (free input)
- Options: array of `{ label: "A — short", content: { source: "full description", lang: "md" } }`
- **`recommended` for single-select MUST be a string:** `"A"` (the label, not an object)
- **`recommended` for multi-select MUST be an array:** `["A", "C"]`
- `conviction: "strong"` pre-selects + shows Recommended badge; `"slight"` shows badge only
- `weight: "critical"` for key decisions (visually prominent)

Example (single-select):
```json
{
  "id": "posture",
  "type": "single",
  "question": "Posture for this audit?",
  "options": [
    { "label": "A — mvp / break", "content": { "source": "Fast audit, breaking OK.", "lang": "md" } },
    { "label": "B — mvp / compat", "content": { "source": "Fast audit, no breaking changes.", "lang": "md" } }
  ],
  "recommended": "A",
  "conviction": "strong"
}
```

Close each as decision after user answers — update map's `## decisions`, apply posture, continue to Phase 4.

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
- `## architecture-decisions [adr]` branch — if any decisions logged during this plan are significant (cross-cutting, security, architecture), propose ADR files for them

Rules:
- Complex concern (>5 leaves) → promote to `###` sub-branch
- Simple concern (1-5 leaves) → keep as bullets under `##`
- Every leaf points to a `.spec` file path (even if not written yet)
- Bottleneck tags: 🔴 BLOCKING, 🟡 RISKY, 🔵 TIME_CONSUMING, 🟠 VERIFICATION_HEAVY, ⚪ STANDARD
- **ADR rule:** Any decision with security, architectural, or cross-cutting impact → create `docs/adr/NNN-slug.md` with full context + rationale. Add leaf to `## architecture-decisions [adr]` branch linking to it.

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
