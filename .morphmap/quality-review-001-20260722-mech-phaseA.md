---
type: handoff
agent: morphmap/quality-reviewer
id: quality-review-001
timestamp: 2026-07-22T07:10:29Z
version: 1
summary: Quality review of mech Phase A (types/state/config/index) — CHANGES_REQUESTED (4 findings: 1×P1, 1×P2, 2×P3)
source: leaf .morphmap/mech (Phase A pure module)
status: raw
tags: [review, quality, mech, state-machine, phaseA]
---

# Quality Review: CHANGES_REQUESTED

Reviewed: `.morphmap/mech/types.ts`, `state.ts`, `config.ts`, `index.ts`, `state.test.ts`.
Verification: `bun test ./.morphmap/mech/state.test.ts` → **49 passed**.
Purity: grep confirms zero non-relative imports in source files (only `bun:test` in the test file, which is allowed). Pure/impure boundary satisfied.

The module is clean, well-structured, and largely correct. The idempotency core, evidence-hash stability, immutable updates, fail-fast (explicit reject paths, no swallowed errors), and config lookups are solid. Four findings follow; the P1 must be reconciled before Phase B/C build on top because dependency-resolution correctness was flagged as paramount.

### Findings

- **[P1]** `.morphmap/mech/state.ts:267` (+ comment :243) — **needs-contract build-unblock point diverges from the cited contract.** The spec §3.6 (`docs/mech-mindmap.md:281,283`) states `[needs-contract:]` build resolves at **⏳review = `in_review`** ("build resolves at ⏳review"). The implementation resolves it one transition earlier, at **`submitted`**: `reachedAtLeast(targetStatus, "submitted")` (state.ts:267), and the code comment at :243 ("build unblocks at 'submitted' (contract real)") plus the test `[needs-contract:] build unblocks at submitted, integrate at done` (state.test.ts) all assert `submitted`. The emoji collision in `LEAF_STATUS_EMOJI` (both `submitted` and `in_review` map to ⏳) is disambiguated by the word "review": types.ts:97 reads `⏳submit | ⏳review`, so ⏳review = `in_review`. This is a direct contract-vs-code contradiction on a foundational dependency rule. **Resolve it**: either tighten the impl to `reachedAtLeast(targetStatus, "in_review")` (spec-authoritative, per task framing) or amend §3.6 to `⏳submit`. Practical impact is a one-transition window, but as the task states, dependency bugs here propagate into every Phase B gate.

- **[P2]** `.morphmap/mech/state.ts:63` — **self-transitions on terminal state `done` allow evidence mutation without necessarily re-running reviewGates.** `StateMachine.canTransition` returns `true` for any `from === to` ("self-transition always legal"). Applied through `transitionLeaf`, this means a call `transitionLeaf(doneLeaf, { to: "done", evidence: {...}, gates: [] })` is legal: it appends a `from:done,to:done` log entry and overwrites the leaf's evidence while skipping every gate (the gate loop at :191 only runs gates the caller passes). That lets a "done" leaf's proof be rewritten post-hoc, undermining mech's core thesis "done = proof, not a claim" (§1). Gates run only if the caller passes them, so safety currently depends on Phase B/C tool discipline always supplying reviewGates. Recommend either (a) excluding self-transitions to `done` (treat as illegal / force the `done→pending` escape hatch), or (b) documenting the invariant that mutation of a `done` leaf must route through `done→pending` first. Defense-in-depth at the primitive level is warranted for a foundational module.

- **[P3]** `.morphmap/mech/state.ts:191-200` vs `:321-336` — **two divergent gate-running implementations; `transitionLeaf` silently drops warnings.** `transitionLeaf` short-circuits on `block` but discards `warn`-severity results (the outcome on success is bare `{ pass: true }`). The standalone `runGates` helper (:321) collects warns and returns `{ pass:true, reason, severity:"warn" }`. Same semantics, two behaviors: a caller of `transitionLeaf` cannot observe soft warnings (e.g. estLOC) that Phase B will likely want to surface. Recommend `transitionLeaf` reuse `runGates` (de-dupe) or at least thread warnings into `TransitionOutcome.result`.

- **[P3]** `.morphmap/mech/state.test.ts` — **coverage gaps in flagged-correctness areas.** (a) The `* → blocked` wildcard and `blocked → in_progress` unblock are exercised only via `canTransition`, never end-to-end through `transitionLeaf` (no test drives a leaf into/out of `blocked` via the transition function). (b) The `done → done` self-transition path from the P2 finding is untested. (c) `canStartLeaf` is tested only with single-edge scenarios; a leaf carrying a **mix** of `needs` + `needs-contract` edges (accumulating distinct `blockedBy` reasons) is not covered. (d) A `[needs: ghost]` / `[needs-contract: ghost]` referencing a target absent from `leaves` defaults to `pending` (state.ts:256 `target?.status ?? "pending"`) → silently blocks forever; this fail-safe behavior is untested.

### Boundaries Check
- ✅ Pure/impure boundary (§2.1: zero pi imports, zero I/O) satisfied. grep finds no `pi.` / `@pi` / non-relative imports in source files; only `bun:test` in the test file (test runner, in-scope).
- ✅ No `innerHTML` / `document.write` / DOM access (N/A for a pure TS module — none present).
- Note: there is no `.spec` file for this leaf (acknowledged in the task); the applicable boundary is the §2.1 pure-module split, which is met.

### Human Reviewer Callouts (Non-Blocking)
- **No `tsconfig.json` in repo.** Standalone `tsc --noEmit .morphmap/mech/*.ts` emits spurious `TS2802: Type 'Set<...>' can only be iterated ... with a '--target' of 'es2015' or higher` (state.ts:63,71,81; config.ts:89) and `TS2307: Cannot find module 'bun:test'`. These are target/types noise, not code bugs (bun runs all 49 tests clean). For a foundational module that propagates everywhere, recommend adding a `tsconfig.json` (target ≥ es2015, types: ["bun-test"]) so `tsc` gives trustworthy type-check signal and doesn't mask real errors.
- This change introduces no runtime dependencies, no auth behavior, no migrations. Forward-looking surface (`runGates`, `OverengineeringState`, gate signatures) is intentional scaffolding for Phase B and in-scope for a foundation module.
