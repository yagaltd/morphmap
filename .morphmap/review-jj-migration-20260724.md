---
type: handoff
agent: morphmap/reviewer
id: review-jj-migration-20260724
timestamp: 2026-07-24T12:25:00Z
version: 1
summary: Integration review of jujutsu (jj) migration — 12 files checked, 0 P0, 5 P1, residual git references in 4 files
source: sub-branch jj-migration
status: raw
tags: [review, integration, jj-migration, vcs]
---

# Integration Review: Jujutsu (jj) Migration

Leaves reviewed: 12 files across 5 logical groups.

## Verdict: CHANGES_REQUESTED

0 P0 issues. 5 P1 issues across 4 files. Core migration (types, DB schema, branch-agent, hooks, most skills) is solid. Residual `git` references remain in plan, review, archive, init skills, and `loadAllBranches` is missing `jjChangeId`.

---

## File-by-File Findings

### 1. `.pi/agents/branch-agent.md` — ✅ PASS
- Orphan recovery: `jj commit`, `jj rebase -d main && jj squash` ✅
- Map write protocol: `jj commit -m "..."` ✅
- Prose: "Jj auto-tracks changes — no worktree cleanup needed" ✅
- No `git` references. Clean.

### 2. `.pi/extensions/hooks/render-pipeline.ts` — ✅ PASS
- Line ~108: `execSync("jj commit -m 'map: auto-render + changelog + state.db after edit'")` ✅
- No `git commit` or other git references. Clean.

### 3. `.morphmap/mech/types.ts` — ✅ PASS
- `Leaf` interface: `jjChangeId?: string;` ✅
- `BranchState` interface: `jjChangeId?: string;` ✅
- Both properly typed as optional, consistent with other optional fields. Clean.

### 4. `.morphmap/mech-pi/morphmap-db.ts` — ⚠️ P1

**Schema (lines 31, 49):** ✅
- `branches.jj_change_id TEXT` — correct
- `leaves.jj_change_id TEXT` — correct

**`loadState` (lines 142, 167):** ✅
- Branch: `jjChangeId: branchRow.jj_change_id ?? undefined` — correct
- Leaf: `jjChangeId: lr.jj_change_id ?? undefined` — correct

**`saveState` (lines 195-236):** ✅
- INSERT includes `jj_change_id` with `state.jjChangeId ?? null` — correct
- UPDATE SET includes `jj_change_id=excluded.jj_change_id` — correct
- Leaf upsert includes `jj_change_id` — correct

**`loadAllBranches` (lines 344-389):** ❌ P1 — `jjChangeId` missing from both:
- Branch result object (line ~373): no `jjChangeId: branchRow.jj_change_id ?? undefined`
- Leaf objects (line ~344): no `jjChangeId: lr.jj_change_id ?? undefined`

**Fix:** Add `jjChangeId: branchRow.jj_change_id ?? undefined` to branch result and `jjChangeId: lr.jj_change_id ?? undefined` to each leaf in `loadAllBranches`.

### 5. `skills/delegate/SKILL.md` — ✅ PASS
- File-level isolation prose: "Jj's colocated changes track every leaf's work independently" ✅
- Undo/rollback: `jj abandon <leaf-change-id>`, `jj abandon <branch-change-id>` ✅
- All `jj` commands correct. No `git` references.

### 6. `skills/recover/SKILL.md` — ✅ PASS
- Title: `(jj-native)` ✅
- All commands: `jj log`, `jj diff`, `jj describe`, `jj rebase`, `jj abandon`, `jj resolve`, `jj obslog` ✅
- Prose: "Jj auto-tracks every change — no worktrees, no stash", "Jj never loses data" ✅
- No `git` references. Clean.

### 7. `skills/plan/SKILL.md` — ⚠️ P1

**Line 223:** `"7. Check git log for recent related changes"`
- Should be: `"7. Check jj log for recent related changes"`

All `jj commit` commands in this file correct. Single stray `git log` reference.

### 8. `skills/amend/SKILL.md` — ✅ PASS
- `jj commit -m "amend: ..."` ✅
- No `git` references. Clean.

### 9. `skills/archive/SKILL.md` — ⚠️ P1

**Line 93 (Rules):** `"Git IS the history — archives are committed, not deleted"`
- Should be: `"Jj IS the history — archives are committed, not deleted"`

`jj commit` command on line ~89 correct. Single stray `Git` reference.

### 10. `skills/init/SKILL.md` — ⚠️ P2 (minor)

**Line 169:** `"so they're git-tracked"` — generic use of "version-controlled". Minor.
**Line 194:** `"without any git-visible diff"` — same. Minor.
**Line 197:** `"Git shows the diff"` — should be `"Jj shows the diff"`. P2.
**Line 337:** `"## Phase 5: Git init"` — section heading. Should be `"## Phase 5: Jj init"`. P2.

Lines 256 (`.git` dir exclusion), 339 (`jj git init` command), 346 (`.git/hooks/pre-commit` path) — all correct, `.git` directory still exists in jj+git colocated repos.

### 11. `skills/explore/SKILL.md` — ✅ PASS
- Phase 2 scout task: `"Check recent jj log history."` ✅
- No `git` references. Clean.

### 12. `skills/review/SKILL.md` — ⚠️ P1

Multiple `git` references in stale detection logic:

| Line | Current | Issue |
|------|---------|-------|
| 10 | `git timestamps (48h threshold)` | `git` → `jj` |
| 21 | `git last-modified timestamp (git log -1 --format='%aI' -- <files>)` | `git log` → needs jj equivalent |
| 35 | `git log` | `git` → `jj` |
| 39 | `git log -1 --format="%aI" -- "$f"` | needs jj equivalent |
| 44 | `git log -1 --format="%aI" -- "<spec-path>"` | needs jj equivalent |
| 56 | `Last git activity timestamp?` | `git` → `jj` |

Note: `jj log` doesn't have a direct `--format="%aI"` equivalent for file timestamps. The stale detection methodology needs redesign for jj — `jj` tracks changes not file modification times. This is a P1 because the detection logic is broken for jj, not just a terminology swap.

---

## Data Migration Assessment

- **state.db**: exists but is 0 bytes (empty, no tables created yet)
- **state.json**: does not exist
- **Verdict**: No data migration needed. Schema uses `CREATE TABLE IF NOT EXISTS` — empty DB will get full schema on first `openDb()` call including `jj_change_id` columns.

---

## Cross-File Consistency

- `jjChangeId` type definition (types.ts) ↔ schema column (morphmap-db.ts): consistent ✅
- `jjChangeId` in `loadState`/`saveState` (morphmap-db.ts): consistent ✅
- `jjChangeId` in `loadAllBranches` (morphmap-db.ts): MISSING ❌ P1
- `.pi/agents/branch-agent.md` uses `jj` consistently throughout ✅
- Skills: 4 of 8 skills have residual `git` references ❌
- `render-pipeline.ts` hook uses `jj commit` ✅

---

## P0 Issues: 0

None. No data loss risk, no broken commands, no schema mismatch.

## P1 Issues: 5

1. **`morphmap-db.ts` `loadAllBranches`**: Missing `jjChangeId` on branch result and leaf objects (lines ~344, ~373)
2. **`skills/plan/SKILL.md:223`**: `git log` → `jj log`
3. **`skills/archive/SKILL.md:93`**: `Git IS the history` → `Jj IS the history`
4. **`skills/review/SKILL.md:10-56`**: Multiple `git` references + stale detection methodology broken for jj
5. **`skills/init/SKILL.md:197,337`**: `Git shows the diff`, `Git init` → should use `Jj`

## P2 Issues: 3

1. **`skills/init/SKILL.md:169`**: `git-tracked` (generic "version-controlled" — minor)
2. **`skills/init/SKILL.md:194`**: `git-visible diff` (same — minor)
3. **`skills/init/SKILL.md:337`**: Phase 5 heading `Git init` → should be `Jj init`

## Functional Verification

- Build: not run (no build artifacts affected)
- Tests: not run (no test changes in this migration)
- Health check: N/A (CLI project, no server)
- jj available: ✅ `/home/aurel/.local/bin/jj`, repo functional

---

## Recommendation

Approve with fixes. The migration is structurally complete — types, DB schema, core agent, hooks, and 4 of 8 skills are fully migrated. Fix the 5 P1 issues before marking this migration done.

**Fix priority:**
1. `loadAllBranches` `jjChangeId` — immediate (breaks orchestrator multi-branch queries)
2. `skills/review/SKILL.md` stale detection — redesign for jj
3. Stray `git` references in plan, archive, init — search-and-replace
