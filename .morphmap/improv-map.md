---
type: design-decisions
topic: MorphMap-quality-recursive-improvements
timestamp: 2026-07-21
tags: [improvement, quality, recursion, context, tags]
status: draft
---

# improv-map — Quality, Recursion, Context Improvements

Consolidated implementation plan for changes discussed 2026-07-21.

---

## 1. Overview

Four interconnected improvements:

| # | Change | Why | Impact |
|---|--------|-----|--------|
| A | New leaf tags: `[qa:]`, `[test:]`, `[skill:]`, `[human]` | Per-leaf quality decisions instead of blind posture inheritance | Format spec, branch-agent, leaf-worker |
| B | Recursive branch agent spawning + precise context injection | Branch agents at any depth (L1-L3), not just `##` level | branch-agent, delegate skill |
| C | Quality architecture redesign | Skills loaded before .spec → boundaries prevent bugs instead of catching them later | branch-agent step 3, reviewer wiring |
| D | Mechanical reviewer wiring | Defined but never spawned in execution loop | branch-agent step 7 |

---

## 2. Change A — New Leaf Tags

### 2.1 Problem

Current posture applies `quality: fast|standard|strict` to ALL leaves under ALL branches. A CSS color change and a JWT token refresh get identical treatment. This wastes review budget on trivial changes and under-reviews critical ones.

Leaf workers guess testing strategy. pi-workflows had explicit `example-based | property-based | snapshot | integration | e2e` per task. MorphMap lost this.

Some leaves need human decisions but there's no `[human]` tag — the only human marker is `@human` on branch scope (unused) and `[phase]`/`[log]` branch tags (branch-level, not leaf-level).

### 2.2 Solution — Four New Leaf Tags

#### `[qa: none|review|full]` — Per-Leaf Quality Level

Set by: branch agent when writing .spec.

```
[qa: none]    → leaf worker self-verify only (agent-spec lifecycle). 
                No mechanical reviewer, no quality reviewer, no bug hunter.
                For: visual changes, trivial refactors, config updates.

[qa: review]  → self-verify + mechanical reviewer (independent agent-spec lifecycle re-run).
                No quality reviewer (judgment), no bug hunter.
                For: standard feature work, non-critical modules.

[qa: full]    → self-verify + mechanical reviewer + quality reviewer + bug hunter (if 🔴/🟡).
                For: BLOCKING leaves, RISKY leaves, security-sensitive code, data mutations.
```

**Default when no tag:** inherit from `posture.quality`:
- `posture.quality=fast` → default `[qa: none]`
- `posture.quality=standard` → default `[qa: review]`
- `posture.quality=strict` → default `[qa: full]`

**Override:** branch agent can upgrade/downgrade per leaf. `posture.quality=fast` but leaf is auth → `[qa: full]`. `posture.quality=strict` but leaf is CSS → `[qa: none]`.

**Decision matrix for branch agent:**

| Leaf risk | Leaf type | Default [qa:] |
|-----------|-----------|---------------|
| 🔴 BLOCKING | Any | `full` |
| 🟡 RISKY | Any | `full` |
| ⚪ STANDARD | Security/auth/data/input | `full` |
| ⚪ STANDARD | Feature logic | `review` |
| ⚪ STANDARD | CSS/visual/refactor/config | `none` |
| 🔵 TIME | Any (these are straightforward by nature) | `review` |

#### `[test: unit|property-based|snapshot|integration|e2e]` — Testing Strategy

Set by: branch agent when writing .spec. Leaf worker follows it. Reviewer verifies it.

```
[test: unit]           → Standard unit tests. Happy path + edge cases.
[test: property-based]  → Property-based testing (fast-check, proptest, quickcheck).
                          For: parsers, serializers, validators, state machines.
[test: snapshot]        → Snapshot tests. For: UI components, HTML output, rendered views.
[test: integration]     → Integration tests. Cross-module, DB, API.
[test: e2e]             → End-to-end. Full user flow.
```

Multiple allowed: `[test: unit + integration]`, `[test: property-based + e2e]`.

**Default when no tag:** `[test: unit]`.

**Decision matrix for branch agent:**

| What leaf does | Recommended [test:] |
|---------------|-------------------|
| Parser, serializer, validator | `property-based` |
| UI component, HTML template | `snapshot` |
| API endpoint, DB query | `unit + integration` |
| Auth flow, payment flow | `unit + integration + e2e` |
| Algorithm, state machine | `property-based + unit` |
| CSS, config, docs | `unit` (or none — tag absent) |

#### `[skill: <name>]` — Skill Used During .spec Creation

Set by: branch agent after loading a skill to inform .spec boundaries.

```
[skill: modern-web-guidance]   → Boundaries section has: "DO NOT use innerHTML..."
[skill: coding-guidelines]      → Boundaries section has: "Use async/await, not raw promises..."
[skill: domain-web]             → Boundaries section has: "Use axum 0.8 patterns..."
```

Not a tag the leaf worker acts on — it's audit trail. The skill's constraints are already in the .spec Boundaries section. The tag tells future agents WHY those boundaries exist.

Example:
```markdown
- 🔴 JWT refresh → specs/auth/jwt-refresh.spec [qa: full] [test: property-based + integration] [skill: modern-web-guidance]
```

#### `[human]` — Human Action Required

Set by: branch agent when leaf cannot be done by an agent.

```markdown
- ⬜ approve GDPR compliance language → specs/legal/gdpr-review.spec [human]
- ⬜ design system color palette decision → specs/design/colors.spec [human]
```

Leaf workers SKIP `[human]` leaves. Branch agent does NOT spawn leaf worker for them. They stay ⬜ until human marks them ✅. Human can edit the .spec or replace it entirely.

Difference from `[phase]` branch: `[human]` is a leaf-level tag. A `[module]` branch can have both agent leaves and human leaves mixed.

### 2.3 Files Changed

| File | Change |
|------|--------|
| `docs/format-spec.md` | Add `[qa:]`, `[test:]`, `[skill:]`, `[human]` to Tags table. Update leaf format example. |
| `.pi/agents/branch-agent.md` | Step 3: add tag assignment logic (qa decision matrix, test strategy decision matrix, skill loading, human detection). |
| `.pi/agents/leaf-worker.md` | Add: read `[test:]` tag from leaf, apply testing strategy. Skip if `[human]`. |
| `.morphmap/morphmap.mindmap.md` | Update `## skills` section with tag documentation. |

---

## 3. Change B — Recursive Branch Agent Spawning

### 3.1 Problem

Branch agent is currently defined as owning a `##` branch. It only spawns leaf workers. It cannot spawn sub-branch agents for `###` or `####` sub-branches.

The delegate skill only spawns `##` branch agents. No mechanism to spawn `###` or deeper agents.

Result: every branch agent manages leaves directly, no matter how many sub-branches. Context bloats. Accountability blurs. `### selection` and `### keybindings` code gets reviewed by the same agent that's also managing `### clipboard` — no specialized context.

### 3.2 Solution — Same Agent Type at Any Depth

The `branch-agent.md` definition works at any level. The only difference is the subtree injected. Three modes based on what the subtree contains:

**Mode 1: Decomposer** — subtree has sub-branches (`###`, `####`) and leaves.
- Spawn sub-branch agents for each sub-branch
- Manage direct leaves (those not under a sub-branch) yourself
- After all children report ✅: run parent scope checks, then integration review across all

**Mode 2: Leaf Manager** — subtree has only leaves, no sub-branches.
- Set /goal for this subtree
- Pull leaves directly, spawn leaf workers, run reviews
- After all leaves ✅: run integration review, report to parent

**Mode 3: Hybrid** — subtree has BOTH direct leaves AND sub-branches.
- Spawn sub-branch agents for sub-branches
- Manage direct leaves yourself in parallel
- After all done: run integration review across everything

### 3.3 Context Injection — What Each Agent Receives

The parent agent constructs a precise task string for each child. Five context dimensions:

#### Dimension 1: Subtree Boundaries

```
"Subtree starts at '<heading text>', ends before next heading at same or higher level.
Read this section from .morphmap/morphmap.mindmap.md."
```

For `### selection` under `## editor-core`:
```
"Subtree starts at '### selection ⬜ — scope: cursor, range, save/restore',
ends before next '###' or '##' heading."
```

#### Dimension 2: Parent Scope (what parent needs from child)

```
"Parent scope: editor-core needs cursor tracking, selection range management,
save/restore across DOM mutations. Your API will be consumed by keybindings
(needs getCursor, getSelection, restoreSelection) and undo-redo
(needs selection persistence across undo/redo operations)."
```

This is the CONTRACT between parent and child. Child builds to satisfy this. Parent reviews against this.

#### Dimension 3: Known Consumers (who depends on this)

```
"Known consumers: ### keybindings [needs: editor-core/selection/range],
### undo-redo [needs: editor-core/selection/save-restore].
If your API changes, notify these branches via intercom."
```

#### Dimension 4: Sibling Context (what neighbors are doing)

```
"Siblings under ## editor-core: contenteditable (manages DOM editing surface),
keybindings (key registration + shortcut engine), clipboard (copy/paste/convert),
undo-redo (operation stack). Your selection API must be compatible with all."
```

#### Dimension 5: Posture (inherited, overridable)

```
"Context from orchestrator: phase=prototype, compat=break, scope=broad,
quality=fast, budget=balanced."
```

### 3.4 Spawn Template

For a sub-branch agent at any depth:

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

### 3.5 Delegate Skill Changes

Currently only spawns `##` branch agents. Must become depth-agnostic:

**Phase 2 change:** For each heading at ANY level with status ⬜ or 🔄 and tag `[module]` or `[feature]`:
- If it has sub-branches → spawn branch agent (will further decompose)
- If it has only leaves → spawn branch agent (will manage leaves directly)
- If it has `[human]` leaves → spawn branch agent (will skip those, manage rest)

**Phase 3 change:** Task template uses generic heading path, not hardcoded `##`.

### 3.6 Parent Scope Check (New Step)

After a sub-branch agent reports ✅ with its delivered summary, the parent does NOT just trust it. Parent runs a scope check:

```
Parent reads child's delivered summary.
Parent checks against its OWN scope:
  "I said editor-core needs cursor tracking, range, save/restore.
   Child delivered: Cursor class with getCursor(), SelectionRange class,
   saveSelection()/restoreSelection(). 
   Does this satisfy what keybindings will need? getCursor ✅, getSelection ✅,
   restoreSelection ✅.
   Missing: nothing. Contract satisfied."
  
If gap found:
  Create new leaf under child sub-branch: "- ⬜ add getSelectionAtPoint() → specs/..."
  OR escalate to Root if cross-cutting.

If satisfied:
  Mark child sub-branch ✅ in map.
  Signal consumers that dependency is now available.
```

This is NOT a reviewer spawn. It's the parent agent's own check against its own scope. Zero additional agents.

### 3.7 Files Changed

| File | Change |
|------|--------|
| `.pi/agents/branch-agent.md` | Add step 0a: detect sub-branches. Add parent scope check after child reports. Update system prompt for depth-agnostic language. |
| `skills/delegate/SKILL.md` | Phase 2: scan all heading levels, not just `##`. Phase 3: generic heading path in task template. |
| `docs/execution-flow.md` | Add recursive spawning section with context injection dimensions. |
| `.pi/agents/leaf-worker.md` | No change — leaf workers already receive task from any level. |

---

## 4. Change C — Quality Architecture Redesign

### 4.1 Problem

Currently: leaf worker builds → quality reviewer catches issues → leaf worker fixes → re-review. This reactive cycle is slow and expensive.

Skills like `modern-web-guidance` exist but are never consulted during .spec creation. Constraints that could prevent bugs are discovered AFTER code is written.

### 4.2 Solution — Skills Before .spec, Boundaries As Prevention

**New step 3 (expanded):**

```
3. If no .spec exists for leaf:
   a. Identify domain:
      - Check leaf path, parent scope, bottleneck tag
      - web frontend? → load modern-web-guidance
      - Rust? → load coding-guidelines
      - Cloud/deploy? → load cloudflare or domain-cloud-native
      - Generic → skip skill loading
   
   b. Load skill (if domain match):
      Read skill file, extract constraints into list:
        modern-web-guidance → "DO NOT use innerHTML. Use textContent or createElement."
        modern-web-guidance → "DO NOT use document.write."
        modern-web-guidance → "Prefer <dialog> over custom modals."
        coding-guidelines → "Use async/await, not raw .then() chains."
   
   c. Assign tags per decision matrices:
      [qa: none|review|full] — see §2.2
      [test: unit|property-based|snapshot|integration|e2e] — see §2.2
      [skill: <name>] — if skill was loaded
      [human] — if leaf needs human decision (not agent-executable)
   
   d. Write .spec with skill constraints in Boundaries:
      ```
      ## Boundaries
      ### From modern-web-guidance
      - DO NOT use innerHTML — use textContent or createElement instead
      - DO NOT use document.write
      - All user input must be sanitized before DOM insertion via sanitizeHTML()
      
      ### Allowed Changes
      - src/editor-core/selection/**
      
      ### Forbidden
      - Do NOT modify src/editor-core/markdown-engine/ (owned by sibling)
      ```
   
   e. Update leaf line in map with all assigned tags.
```

### 4.3 Review Pipeline Per [qa:] Level

#### `[qa: none]` — Fast Path

```
Leaf worker: self-verify (agent-spec lifecycle) → ✅
Branch agent: mark leaf ✅ in map.
```

No reviewer spawns. Used for: CSS changes, config, trivial refactors, docs.

#### `[qa: review]` — Standard Path

```
Leaf worker: self-verify (agent-spec lifecycle) → reports ✅
  ↓
Branch agent spawns: reviewer (mechanical mode)
  ⮑ agent-spec lifecycle <spec> --code . --layers lint,boundary,test,tdd-guard
  ⮑ Reports: pass/fail/skip
  ↓
If fail → spawn leaf worker to fix → re-verify → re-review
If pass → mark leaf ✅
```

#### `[qa: full]` — Strict Path

```
Leaf worker: self-verify (agent-spec lifecycle) → reports ✅
  ↓
Branch agent spawns: reviewer (mechanical mode)
  ⮑ agent-spec lifecycle <spec> --code . --layers lint,boundary,test,tdd-guard
  ⮑ Reports: pass/fail/skip
  ↓
Branch agent spawns: quality reviewer (judgment mode)
  ⮑ Checks: simplicity, security, error handling, domain fit
  ⮑ Checks against .spec Boundaries (including skill constraints)
  ⮑ Output: OKF handoff file (quality-review-NNN)
  ↓
If 🔴 or 🟡: branch agent spawns bug hunter
  ⮑ /bug-hunter --scan-only <files>
  ⮑ If bugs confirmed → spawn leaf worker to fix → re-verify from top
  ↓
All pass → mark leaf ✅
```

### 4.4 Mechanical Reviewer — Currently Defined But Unwired

The `morphmap/reviewer` agent has a mechanical mode (agent-spec lifecycle re-run) but it's NEVER spawned in the execution loop. The leaf worker self-verifies, and then step 7d jumps straight to quality reviewer for standard/strict.

**Fix:** Add mechanical reviewer spawn as step 7c (before quality review):

```
7. On leaf ✅:
   a. Update map (status, cost, duration)
   b. Signal dependents via intercom
   c. Index domain decision
   c2. **Mechanical review** (if [qa: review] or [qa: full]):
       subagent({ agent: "morphmap/reviewer",
         task: "Mechanical review: verify leaf <leaf-path> against .spec <path>.",
         context: "fresh" })
       If fail → spawn leaf worker to fix → re-verify → re-review.
       If pass → proceed.
   d. **Quality review** (if [qa: full]): ... (existing)
   e. **Bug hunter** (if [qa: full] AND 🔴/🟡): ... (existing)
   f. If [qa: none]: skip all reviews (leaf worker self-verify only).
```

### 4.5 Integration Review — Two Levels

After ALL children of a branch agent complete (direct leaves + sub-branch agents):

1. **Sub-branch level** (e.g., `### selection` after its 3 leaves done):
   - Spawn integration reviewer for those 3 leaves
   - Checks: cross-leaf conflicts, gaps, consistency

2. **Branch level** (e.g., `## editor-core` after all 5 sub-branches report ✅):
   - Spawn integration reviewer for ALL sub-branches
   - Checks: cross-sub-branch conflicts, shared API consistency, missing glue code
   - This is the "do all pieces of editor-core work together?" check

The branch-level integration review runs only when quality=strict AND branch has >1 sub-branch.

### 4.6 Files Changed

| File | Change |
|------|--------|
| `.pi/agents/branch-agent.md` | Step 3 expanded with skill loading + tag assignment. Step 7 reordered: mechanical before quality. Step 8: branch-level integration review. |
| `.pi/agents/reviewer.md` | No change — both modes already defined. Just finally wired. |
| `docs/execution-flow.md` | Updated quality loop diagram with per-leaf [qa:] gating, skill loading phase. |
| `docs/format-spec.md` | Tags table updated with `[qa:]`, `[test:]`, `[skill:]`, `[human]`. |

---

## 5. Full Execution Loop (After All Changes)

```
0. DETECT SUB-BRANCHES
   Scan subtree for sub-branches (###, #### headings).
   If sub-branches exist: spawn sub-branch agents for each (see §3.4).
   
0b. SET GOAL (only if I manage leaves directly)
   /goal: "Deliver <subtree>: <N> leaves. Report to parent."

1. PULL NEXT LEAF (⬜, [needs:] all ✅, risk-priority sort)
   Skip [human] leaves — they wait for human.

2. SEARCH INDEXED KNOWLEDGE for recent decisions affecting leaf domain.

3. WRITE .spec IF MISSING:
   a. Identify domain → load relevant skill (modern-web-guidance, etc.)
   b. Extract constraints → Boundaries section
   c. Assign tags: [qa: ...] [test: ...] [skill: ...] (or [human])
   d. Write .spec: Intent, Decisions, Boundaries (+skill constraints),
      Verifiable by Human, Delegated to Implementer, Completion Criteria
   e. Update leaf line in map with all assigned tags

4. ASSIGN MODEL per bottleneck tag + quality level:
   [qa: full] → strongest model for BLOCKING leaves
   [qa: none] → cheapest model for trivial leaves

5. SPAWN LEAF WORKER with .spec path + posture + test strategy.

6. ON WORKER_BLOCKER → resolvable? → fix → retry. Cross-cutting? → escalate.

7. ON LEAF ✅:
   a. Update map (status, cost, duration)
   b. Signal dependents via intercom
   c. Index domain decision
   c2. MECHANICAL REVIEW ([qa: review] or [qa: full]):
       Spawn reviewer (mechanical mode) → pass/fail
   d. QUALITY REVIEW ([qa: full]):
       Spawn quality-reviewer → OKF handoff file
   e. BUG HUNTER ([qa: full] AND 🔴/🟡):
       /bug-hunter --scan-only → fix if bugs found
   f. Mark leaf ✅ if all gates passed.

8. AFTER ALL DIRECT CHILDREN DONE (leaves + sub-branch agents):
   a. If quality=strict AND I have sub-branches:
      Spawn integration reviewer (cross-sub-branch) → OKF handoff file
   b. If quality=strict AND I only have direct leaves:
      Spawn integration reviewer (cross-leaf) → OKF handoff file
   c. If quality≠strict: skip integration review.

9. PARENT SCOPE CHECK (for each sub-branch agent that reported ✅):
   Read child's delivered summary.
   Check against MY scope: "Does child's output satisfy what I need?"
   If gap → create new leaf or escalate.
   If satisfied → mark child ✅ in map, signal consumers.

10. NOTIFY AFFECTED BRANCHES via intercom if leaf output changes API.

11. REPEAT until subtree done or all remaining leaves blocked.

12. REPORT TO PARENT with delivered summary:
    "Delivered <subtree>: <N> leaves, <M> sub-branches.
     API surface: <functions/types exported>.
     Known consumers: <who should be notified>.
     Open issues: <any gaps or concerns>."
```

---

## 6. Leaf Format — Before vs After

### Before
```markdown
- 🔴 JWT refresh → specs/auth/jwt-refresh.spec
- ⬜ login CSS → specs/auth/login-css.spec
```

### After
```markdown
- 🔴 JWT refresh → specs/auth/jwt-refresh.spec [qa: full] [test: property-based + integration] [skill: modern-web-guidance]
- ⬜ login CSS → specs/auth/login-css.spec [qa: none] [test: snapshot]
- ⬜ GDPR compliance → specs/legal/gdpr-review.spec [human]
- ⬜ refactor imports → specs/auth/refactor-imports.spec [qa: review] [test: unit]
```

---

## 7. Files Changed — Master List

| # | File | Changes |
|---|------|---------|
| 1 | `docs/format-spec.md` | New tags table entries. Updated leaf format. Updated OKF frontmatter fields. |
| 2 | `.pi/agents/branch-agent.md` | Full execution loop rewrite (steps 0-12). Skill loading logic. Tag assignment matrices. Recursive spawning. Parent scope check. |
| 3 | `.pi/agents/leaf-worker.md` | Add: read [test:] tag, apply testing strategy. Skip [human] leaves. |
| 4 | `.pi/agents/reviewer.md` | No body changes — already defined. Mechanical mode wired via branch-agent loop. |
| 5 | `.pi/agents/quality-reviewer.md` | Add: check against .spec Boundaries section (including skill constraints). |
| 6 | `skills/delegate/SKILL.md` | Phase 2: scan all heading levels. Phase 3: depth-agnostic task template. |
| 7 | `skills/plan/SKILL.md` | Minor: Phase 0 goal creation already added. No further changes. |
| 8 | `docs/execution-flow.md` | Full quality loop rewrite with [qa:] gating, skill loading, recursive spawning. |
| 9 | `.morphmap/morphmap.mindmap.md` | Updated `## skills` section. Decision log entries. |
| 10 | `CHANGELOG.md` | All changes documented. |

---

## 8. Implementation Order

Dependencies between changes:

```
1. docs/format-spec.md          ← no dependencies, just documentation
2. .pi/agents/branch-agent.md   ← depends on format spec (tags), 
                                   depends on quality architect (logic)
3. .pi/agents/leaf-worker.md    ← depends on format spec tags
4. skills/delegate/SKILL.md     ← depends on branch-agent recursion
5. .pi/agents/quality-reviewer.md ← depends on format spec boundaries
6. docs/execution-flow.md       ← depends on all above (documentation)
7. .morphmap/morphmap.mindmap.md ← depends on all above (documentation)
8. CHANGELOG.md                  ← last
```

Files 1-5 can be implemented in one commit. Files 6-8 in a second commit.

---

## 9. Risk Assessment

| Risk | Mitigation |
|------|-----------|
| Branch agent loop becomes too complex (12 steps) | Each step is conditional. Most leaves take 5-7 steps. Complex path only for [qa: full]. |
| Too many subagent spawns for deep trees | Spawns are fresh context, cheap. 3-level tree = ~20 agents. Acceptable. |
| Skill loading adds latency to .spec creation | Only on first .spec per domain. Cache constraints for subsequent leaves. |
| [human] leaves block branch completion | Branch agent skips them, continues other leaves. Human unblocks async. |
| Parent scope check is vague — agent may miss gaps | Scope check is against parent's OWN scope declaration, which was written during decomposition. Not vague. |
