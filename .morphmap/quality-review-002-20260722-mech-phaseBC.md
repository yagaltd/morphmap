---
type: handoff
agent: morphmap/quality-reviewer
id: quality-review-002
timestamp: 2026-07-22T15:30:00Z
version: 1
summary: Quality review of mech Phase B (gates) + Phase C (transition tools) — APPROVED WITH FINDINGS (4 findings, 0 blocking, 1 P2)
source: leaf mech/phaseBC (gates/* + lattice.ts + tools.ts)
status: raw
tags: [review, quality, mech, state-machine, gates]
---

# Quality Review: APPROVED WITH FINDINGS

Scope: Phase B (gates/{common,pre-spawn,submit,review,integration}.ts + lattice.ts) and Phase C (tools.ts + barrel line in index.ts). Contract: docs/mech-mindmap.md §2.4 (gate chains), §2.5 (transition tools), §4.1 (QA tier table), §3.6 (dependencies). All 113 mech tests pass (`bun test ./.morphmap/mech/`). No blocking issues. Gate chains faithfully implement §2.4; tool→gate wiring matches §2.5.

### Findings

- [P2] `mech/gates/review.ts` (whole chain) — **`integrateBlocked` is never enforced at any transition.** §3.6 states: "canStartLeaf() returns {buildBlocked, integrateBlocked} — build resolves at ⏳review, integrate resolves at ✅. **Both must be false for leaf to complete.**" `state.ts:297` computes `integrateBlocked`; `state.test.ts:381-440` tests it; but a grep across `mech/` shows `integrateBlocked` appears **only** in state.ts (computation), state.test.ts, and types.ts:203 — **no gate reads it**. The pre-spawn `dependenciesResolvable` gate (`pre-spawn.ts`) checks only `buildBlocked`. `reviewGates` (the in_review→done chain) contains no dependency gate. Net effect: a leaf with a runtime `[needs: target]` dependency can reach `done` while the target is not yet `done` — a false "done = proof", directly contradicting mech's central thesis. The branch-level `allLeavesSubmitted` gate also does not check per-leaf `integrateBlocked`, so integration does not catch it either. The implementer faithfully followed the §2.4 review chain (which omits a dep gate), so this is a spec-vs-impl gap, not a typo. Recommend: add a dependency gate to `reviewGates` (e.g. `dependenciesIntegrated`) that fails when `canStartLeaf(...).integrateBlocked` is true, **before Phase D wires real flows**. (Note: `dependenciesResolvable` already builds the right `ctx.graph`/`allLeaves` plumbing, so the data is available.)

- [P3] `mech/gates/integration.ts:32` (`allLeavesSubmitted`) — gate name/check accepts leaves that have only reached `submitted` or `in_review` (`reachedAtLeast(l.status, "submitted")`), so a branch can be marked `done` (`integrationGate` sets `status: "done"` on pass) with leaves that never passed `reviewGates`. Faithful to the §2.4 gate name "allLeavesSubmitted", but semantically a branch "done" with an unreviewed leaf weakens "done = proof" at the branch level. Confirm intent: if branch-complete requires all leaves `done`, tighten the threshold to `reachedAtLeast(l.status, "done")`.

- [P3] `mech/gates/submit.ts:5` — unused import: `LeafEvidence` is imported but never referenced in the file (gates destructure `evidence` via `TransitionGateCtx`). It is `import type`, so erased at runtime — zero behavioral impact; dead import only.

- [P3] test coverage gap — the pending→in_progress gate chain is never exercised end-to-end. `gates.test.ts` unit-tests each pre-spawn gate in isolation and the lattice test checks the mapping by reference equality, but no test calls `transitionLeaf(state, { to: "in_progress", gates: preSpawnGates, ... })`. Pre-spawn enforcement through the real state machine path is unverified. Low risk (wiring is a static array reference in `lattice.ts`), but the other two chains (submit, review) are tested through `transitionLeaf`/tools — the asymmetry is worth closing.

### Boundaries Check
- ✅ Pure-module boundary honored: zero pi imports across all reviewed files (common.ts, pre-spawn.ts, submit.ts, review.ts, integration.ts, lattice.ts, tools.ts). Confirmed by reading each file — only local relative imports (`../types`, `../state`, `./common`).
- ✅ No `.spec` file exists for this work (contract = docs/mech-mindmap.md); the `filesMatchSpec` gate (`submit.ts`) correctly reads `allowedChanges` (the .spec Boundaries field) and skips only when absent — fail-open-by-design, documented.
- ✅ Gate chains match §2.4 exactly: preSpawn=7, submit=6, review=6 (incl. QA-tier conditional), integration=4. Order preserved.
- ✅ QA-tier conditional (`p1CountZeroIfFull`) correctly enforces at `full|strict` (§4.1 strict ⊇ full); skip at `review|none`. Soft gate (`specEstLOC`) correctly never blocks (severity "warn").

### Human Reviewer Callouts (Non-Blocking)
- **Phase D assumption risk (from P2):** hooks wiring leaf flows must NOT assume a leaf at `done` has its runtime dependencies satisfied. Until the `integrateBlocked` gate is added, "done" does not imply "deps met."
- **Branch-complete semantic (from P3):** confirm whether branch `done` should require all leaves `done` (currently only `submitted`).
- No new runtime dependencies introduced. No database migrations. No auth/behavior changes — this is a pure, unwired enforcement layer (Phase D does the wiring).
