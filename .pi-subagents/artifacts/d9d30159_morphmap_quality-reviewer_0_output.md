Review written to `.morphmap/quality-review-001-20260722-mech-phaseA.md`. Final report below.

## mech Phase A Quality Review — CHANGES_REQUESTED

49/49 tests pass. Pure-module boundary satisfied (zero pi imports in source). Code is clean and largely correct. Four findings:

**[P1] `state.ts:267` — needs-contract build-unblock diverges from contract.** Spec §3.6 (`docs:281,283`) says build resolves at `⏳review` = `in_review`; code + comment (:243) + test all use `submitted` (one transition earlier). Direct contract-vs-code contradiction on a foundational dep rule. Resolve: tighten impl to `in_review`, or amend spec. Task flagged dep-resolution correctness as paramount → P1.

**[P2] `state.ts:63` — self-transitions on terminal `done` allow evidence mutation.** `canTransition(done,done)=true` + gateless `transitionLeaf` rewrites a done leaf's proof, bypassing reviewGates. Undermines "done = proof" thesis (§1). Safety currently leans on Phase B tool discipline — recommend blocking `done→done` at the primitive.

**[P3] `state.ts:191-200` vs `:321-336` — two divergent gate runners; `transitionLeaf` silently drops warnings.** Recommend reuse `runGates` or thread warns into `TransitionOutcome.result`.

**[P3] `state.test.ts` — coverage gaps:** blocked/unblock not driven through `transitionLeaf`; `done→done` untested; mixed `needs`+`needs-contract` edges untested; ghost-target default-to-`pending` (silent forever-block) untested.

**Non-blocking callout:** No `tsconfig.json` → `tsc` emits spurious `TS2802`/`TS2307` noise that could mask real type errors. Add tsconfig (target ≥ es2015).